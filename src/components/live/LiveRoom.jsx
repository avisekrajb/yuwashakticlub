import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import Avatar from "../common/Avatar";
import MediaTrack from "../common/MediaTrack";
import { I } from "../common/Icon";
import { api } from "../../lib/api";
import { getSocket, emitWithAck } from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { stamp } from "../../utils";

const EMOJIS = ["❤️", "🔥", "👏", "😂", "😮", "🎉"];

function collectTracks(room) {
  if (!room) return [];
  const out = [];
  const participants = [room.localParticipant];
  if (room.remoteParticipants) participants.push(...Array.from(room.remoteParticipants.values()));
  participants.forEach((p) => {
    if (!p) return;
    const pubs = p.trackPublications instanceof Map ? Array.from(p.trackPublications.values()) : [];
    pubs.forEach((pub) => {
      if (!pub.track) return;
      out.push({
        key: `${p.identity}:${pub.trackSid || pub.track.sid}`,
        track: pub.track,
        kind: pub.track.kind === Track.Kind.Video ? "video" : "audio",
        identity: p.identity,
        name: p.name || p.identity,
        local: p === room.localParticipant,
        muted: Boolean(pub.isMuted),
      });
    });
  });
  return out;
}

function elapsedLabel(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LiveRoom({ live, onClose }) {
  const { me } = useAuth();
  const { say, config } = useApp();
  const [phase, setPhase] = useState("connecting");
  const [error, setError] = useState("");
  const [tracks, setTracks] = useState([]);
  const [isHost, setIsHost] = useState(Boolean(live?.mine));
  const [viewers, setViewers] = useState(live?.viewerCount || live?.viewers || 0);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [floats, setFloats] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);

  const roomRef = useRef(null);
  const startedRef = useRef(Date.now());
  const endedRef = useRef(false);
  const listEnd = useRef(null);

  const maxSeconds = live?.maxDurationSec || config?.limits?.liveSeconds || 600;

  const addComment = useCallback((comment) => {
    if (!comment) return;
    setComments((prev) => {
      if (prev.some((c) => c.id && c.id === comment.id)) return prev;
      return [...prev.slice(-199), comment];
    });
  }, []);

  const addFloat = useCallback((emoji) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setFloats((prev) => [...prev.slice(-14), { id, emoji }]);
    setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 3200);
  }, []);

  const finish = useCallback(() => {
    endedRef.current = true;
    setPhase("ended");
  }, []);

  // Connect LiveKit + socket room.
  useEffect(() => {
    let cancelled = false;
    const socket = getSocket();

    const onComment = (payload) => {
      if (!payload || payload.liveId !== live.id) return;
      addComment({
        id: payload.id || `${payload.t}_${payload.userId}`,
        user: payload.user || { id: payload.userId, name: "Member" },
        userId: payload.userId,
        text: payload.text,
        t: payload.t || Date.now(),
      });
    };
    const onReaction = (payload) => {
      if (payload?.liveId === live.id) addFloat(payload.emoji || "❤️");
    };
    const onViewers = (payload) => {
      if (payload?.liveId === live.id) setViewers(payload.viewers || 0);
    };
    const onEnded = (payload) => {
      if (payload?.liveId && payload.liveId !== live.id) return;
      finish();
      say("The live video has ended");
    };

    (async () => {
      try {
        const auth = await api.get(`/live/${live.id}/token`);
        if (cancelled) return;
        setIsHost(Boolean(auth.isHost || live.mine));
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
        });
        roomRef.current = room;
        const update = () => setTracks(collectTracks(room));
        room.on(RoomEvent.TrackSubscribed, update);
        room.on(RoomEvent.TrackUnsubscribed, update);
        room.on(RoomEvent.LocalTrackPublished, update);
        room.on(RoomEvent.LocalTrackUnpublished, update);
        room.on(RoomEvent.ParticipantConnected, update);
        room.on(RoomEvent.ParticipantDisconnected, update);
        room.on(RoomEvent.TrackMuted, update);
        room.on(RoomEvent.TrackUnmuted, update);
        room.on(RoomEvent.Disconnected, () => {
          if (!endedRef.current) finish();
        });

        await room.connect(auth.url, auth.token);
        if (auth.isHost) {
          await room.localParticipant.setMicrophoneEnabled(true);
          await room.localParticipant.setCameraEnabled(true).catch(() => setCamOff(true));
        }
        if (cancelled) {
          room.disconnect();
          return;
        }
        setTracks(collectTracks(room));
        startedRef.current = Date.now() - (live.startedAt ? Math.max(0, Date.now() - new Date(live.startedAt).getTime()) : 0);
        setPhase("live");
      } catch (x) {
        if (!cancelled) {
          setError(x.message || "Could not join the live video");
          setPhase("error");
        }
      }
    })();

    if (socket) {
      socket.on("live:comment", onComment);
      socket.on("live:reaction", onReaction);
      socket.on("live:viewers", onViewers);
      socket.on("live:ended", onEnded);
      if (socket.connected) emitWithAck("live:join", { liveId: live.id }, 8000).catch(() => {});
    }

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("live:comment", onComment);
        socket.off("live:reaction", onReaction);
        socket.off("live:viewers", onViewers);
        socket.off("live:ended", onEnded);
        if (socket.connected) socket.emit("live:leave", { liveId: live.id });
      }
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        try {
          room.disconnect();
        } catch (_err) {
          /* ignore */
        }
      }
      api.post(`/live/${live.id}/leave`).catch(() => {});
    };
  }, [live.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session timer + 10 minute cap.
  useEffect(() => {
    if (phase !== "live") return undefined;
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startedRef.current) / 1000);
      setElapsed(sec);
      if (isHost && sec >= maxSeconds && !endedRef.current) {
        endedRef.current = true;
        api.post(`/live/${live.id}/end`).catch(() => {});
        finish();
        say("Live video reached the 10 minute limit");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, isHost, maxSeconds, live.id, finish, say]);

  useEffect(() => {
    if (listEnd.current) listEnd.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [comments.length]);

  const toggleMute = () => {
    const room = roomRef.current;
    const next = !muted;
    if (room) room.localParticipant.setMicrophoneEnabled(!next).catch(() => {});
    setMuted(next);
  };

  const toggleCam = () => {
    const room = roomRef.current;
    const next = !camOff;
    if (room) room.localParticipant.setCameraEnabled(!next).catch(() => {});
    setCamOff(next);
  };

  const flipCamera = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const devices = await Room.getLocalDevices("videoinput", true);
      if (devices.length < 2) return say("Only one camera found");
      const currentId = room.getActiveDevice("videoinput");
      const index = devices.findIndex((d) => d.deviceId === currentId);
      const next = devices[(index + 1) % devices.length];
      await room.switchActiveDevice("videoinput", next.deviceId);
    } catch (_err) {
      say("Could not switch camera");
    }
  };

  const sendComment = async () => {
    const value = text.trim();
    if (!value || !me) return;
    setText("");
    const payload = { liveId: live.id, text: value };
    try {
      await emitWithAck("live:comment", payload, 8000);
    } catch (_err) {
      try {
        const comment = await api.post(`/live/${live.id}/comment`, { text: value });
        addComment(comment);
      } catch (x) {
        say(x.message || "Could not send the comment");
      }
    }
  };

  const react = async (emoji) => {
    addFloat(emoji);
    if (!me) return;
    try {
      await emitWithAck("live:reaction", { liveId: live.id, emoji }, 6000);
    } catch (_err) {
      api.post(`/live/${live.id}/reaction`, { emoji }).catch(() => {});
    }
  };

  const leave = async (endForEveryone) => {
    if (!endForEveryone && isHost) {
      if (!window.confirm("End your live video for everyone?")) return;
    }
    setEnding(true);
    if (endForEveryone) {
      try {
        await emitWithAck("live:end", { liveId: live.id }, 8000);
      } catch (_err) {
        api.post(`/live/${live.id}/end`).catch(() => {});
      }
    }
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        room.disconnect();
      } catch (_err) {
        /* ignore */
      }
    }
    onClose();
  };

  const remoteVideo = tracks.find((t) => t.kind === "video" && !t.local);
  const localVideo = tracks.find((t) => t.kind === "video" && t.local);
  const remoteAudio = tracks.filter((t) => t.kind === "audio" && !t.local);
  const hostName = live.host?.name || "Member";
  const hostAvatar = live.host || { name: hostName };

  if (phase === "ended") {
    return (
      <div className="live-overlay" role="dialog" aria-modal="true">
        <div className="live-ended card">
          <span className="live-ended-ic">{I("video", 34)}</span>
          <h2>Live video ended</h2>
          <p className="muted">Thanks for watching {hostName}.</p>
          <button type="button" className="btn" onClick={onClose}>
            Back to posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="live-overlay" role="dialog" aria-modal="true" aria-label="Live video">
      <div className="live-room">
        <header className="live-top">
          <Avatar u={hostAvatar} size={40} />
          <div className="live-who">
            <b>{live.title}</b>
            <small>
              {hostName} · {isHost ? "You are live" : "Live"} · {elapsedLabel(elapsed)}
            </small>
          </div>
          <span className="live-viewers">
            <span className="live-dot" /> {viewers} watching
          </span>
          <button type="button" className="ib live-close" onClick={() => leave(isHost)} disabled={ending} aria-label="Close">
            ×
          </button>
        </header>

        <div className="live-stage">
          {phase === "connecting" && (
            <div className="live-loading">
              <span className="ldr" />
              <p>Joining the live video…</p>
            </div>
          )}
          {phase === "error" && (
            <div className="live-loading">
              <p className="err">{error}</p>
              <button type="button" className="btn line sm" onClick={onClose}>
                Close
              </button>
            </div>
          )}

          {phase === "live" && (
            <>
              {remoteAudio.map((t) => (
                <MediaTrack key={t.key} track={t.track} muted={muted || !soundOn} speaker className="live-audio" />
              ))}

              {isHost ? (
                localVideo ? (
                  <MediaTrack track={localVideo.track} muted className="live-video mirrored" />
                ) : (
                  <div className="live-camoff">
                    <Avatar u={hostAvatar} size={104} />
                    <p>{camOff ? "Camera is off" : "Starting camera…"}</p>
                  </div>
                )
              ) : remoteVideo ? (
                <MediaTrack track={remoteVideo.track} muted={false} className="live-video" speaker />
              ) : (
                <div className="live-camoff">
                  <Avatar u={hostAvatar} size={104} />
                  <p>Waiting for {hostName}'s video…</p>
                </div>
              )}

              <div className="live-floats" aria-hidden="true">
                {floats.map((f) => (
                  <span key={f.id}>{f.emoji}</span>
                ))}
              </div>

              {phase === "live" && !soundOn && !isHost && (
                <button type="button" className="live-sound" onClick={() => setSoundOn(true)}>
                  Tap to enable sound
                </button>
              )}

              <div className="live-comments">
                {!comments.length && (
                  <p className="muted live-chat-empty">
                    {me ? "Say hello to everyone watching 👋" : "Log in to join the chat."}
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="live-comment">
                    <b>{c.user?.name || "Member"}</b>
                    <span>{c.text}</span>
                    <small>{stamp(c.t)}</small>
                  </div>
                ))}
                <div ref={listEnd} />
              </div>

              <div className="live-actions">
                <div className="live-emojis">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => react(e)} aria-label={`React ${e}`}>
                      {e}
                    </button>
                  ))}
                </div>
                {isHost && (
                  <div className="live-controls">
                    <button type="button" className={"live-ctrl" + (muted ? " off" : "")} onClick={toggleMute}>
                      {I("phone", 18)}
                    </button>
                    <button type="button" className={"live-ctrl" + (camOff ? " off" : "")} onClick={toggleCam}>
                      {I("video", 18)}
                    </button>
                    <button type="button" className="live-ctrl" onClick={flipCamera}>
                      {I("image", 18)}
                    </button>
                  </div>
                )}
                {!isHost && (
                  <button
                    type="button"
                    className={"live-ctrl" + (soundOn ? "" : " off")}
                    onClick={() => setSoundOn((v) => !v)}
                    aria-label="Sound"
                  >
                    {soundOn ? "🔊" : "🔇"}
                  </button>
                )}
                <form
                  className="live-chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendComment();
                  }}
                >
                  <input
                    className="in"
                    placeholder={me ? "Comment on the live video…" : "Log in to comment"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={!me}
                    maxLength={500}
                  />
                  <button type="submit" className="btn sm" disabled={!me || !text.trim()}>
                    {I("send", 17)}
                  </button>
                </form>
                {isHost && (
                  <button type="button" className="btn red sm live-end" onClick={() => leave(true)} disabled={ending}>
                    End live
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
