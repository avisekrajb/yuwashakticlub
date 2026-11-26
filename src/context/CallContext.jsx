import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { api } from "../lib/api";
import { connectSocket, emitWithAck, getSocket } from "../lib/socket";
import { startRingtone, stopRingtone } from "../lib/ringtone";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";

const Ctx = createContext(null);
export const useCall = () => useContext(Ctx);

const DEFAULT_CONTROLS = { muted: false, cameraOff: true, speaker: true, noiseCancellation: true };

function collectTracks(room) {
  if (!room) return [];
  const out = [];
  const participants = [room.localParticipant];
  if (room.remoteParticipants) participants.push(...Array.from(room.remoteParticipants.values()));
  participants.forEach((p) => {
    if (!p) return;
    const publications = p.trackPublications instanceof Map ? Array.from(p.trackPublications.values()) : [];
    publications.forEach((pub) => {
      const track = pub.track;
      if (!track) return;
      out.push({
        key: `${p.identity}:${pub.trackSid || track.sid}`,
        track,
        kind: track.kind === Track.Kind.Video ? "video" : "audio",
        participant: p,
        identity: p.identity,
        name: p.name || p.identity,
        local: p === room.localParticipant,
        muted: Boolean(pub.isMuted),
      });
    });
  });
  return out;
}

export function CallProvider({ children }) {
  const { token, me } = useAuth();
  const { say, config } = useApp();

  const [call, setCall] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [role, setRole] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [tracks, setTracks] = useState([]);
  const [controls, setControlsState] = useState(DEFAULT_CONTROLS);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [remoteState, setRemoteState] = useState(null);

  const callRef = useRef(null);
  const incomingRef = useRef(null);
  const controlsRef = useRef(DEFAULT_CONTROLS);
  const roleRef = useRef(null);
  const roomRef = useRef(null);
  const timerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const startingRef = useRef(false);

  const setControls = (next) => {
    controlsRef.current = next;
    setControlsState(next);
  };

  const runtime = useRef({});
  runtime.current = { say, config, me };

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const started = Date.now();
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
  }, [stopTimer]);

  const cleanup = useCallback(
    (reason) => {
      stopRingtone();
      stopTimer();
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        try {
          room.disconnect();
        } catch (_err) {
          /* noop */
        }
      }
      callRef.current = null;
      incomingRef.current = null;
      roleRef.current = null;
      setCall(null);
      setIncoming(null);
      setRole(null);
      setTracks([]);
      setSeconds(0);
      setPhase("idle");
      if (reason) setRemoteState(null);
    },
    [stopTimer]
  );

  const attachRoomEvents = useCallback(
    (room) => {
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
        if (callRef.current) {
          cleanup("disconnected");
          runtime.current.say("Call disconnected");
        }
      });
    },
    [cleanup]
  );

  const connectRoom = useCallback(
    async (auth, kind) => {
      if (!auth?.token || !auth?.url) throw new Error("Could not get call access");
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
      });
      roomRef.current = room;
      attachRoomEvents(room);
      await room.connect(auth.url, auth.token);
      await room.localParticipant.setMicrophoneEnabled(true, {
        noiseSuppression: controlsRef.current.noiseCancellation,
        echoCancellation: controlsRef.current.noiseCancellation,
        autoGainControl: true,
      });
      if (kind === "video" && !controlsRef.current.cameraOff) {
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch (_err) {
          setError("Camera is unavailable. You can still talk.");
        }
      }
      setTracks(collectTracks(room));
      setPhase("active");
    },
    [attachRoomEvents]
  );

  const fetchToken = useCallback(async (callId) => {
    try {
      const ack = await emitWithAck("call:token", { callId }, 12000);
      if (ack?.token) return ack;
    } catch (_err) {
      /* fall back to REST */
    }
    return api.get(`/calls/${callId}/token`);
  }, []);

  const startCall = useCallback(
    async ({ toUserId, conversationId, kind = "audio" } = {}) => {
      if (startingRef.current || callRef.current) {
        runtime.current.say("You are already in a call");
        return;
      }
      startingRef.current = true;
      setError("");
      setRemoteState(null);
      try {
        let created = null;
        try {
          const ack = await emitWithAck("call:start", { toUserId, conversationId, kind }, 15000);
          created = ack.call;
        } catch (_err) {
          created = await api.post("/calls", { toUserId, conversationId, kind });
        }
        if (!created?.id) throw new Error("The call could not be started");
        callRef.current = created;
        roleRef.current = "caller";
        setCall(created);
        setRole("caller");
        setPhase("connecting");
        const settings = runtime.current.me?.settings || {};
        setControls({
          muted: false,
          cameraOff: kind === "audio",
          speaker: settings.speakerDefault !== false,
          noiseCancellation: settings.noiseCancellation !== false,
        });
        const auth = await fetchToken(created.id);
        await connectRoom(auth, kind);
        startTimer();
      } catch (err) {
        setError(err.message || "Could not start the call");
        runtime.current.say(err.message || "Could not start the call");
        cleanup();
      } finally {
        startingRef.current = false;
      }
    },
    [cleanup, connectRoom, fetchToken, startTimer]
  );

  const acceptCall = useCallback(async () => {
    const current = incomingRef.current;
    if (!current) return;
    stopRingtone();
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    setPhase("connecting");
    try {
      let result = null;
      try {
        const ack = await emitWithAck("call:accept", { callId: current.id }, 15000);
        result = ack;
      } catch (_err) {
        result = await api.post(`/calls/${current.id}/accept`);
      }
      const callObj = result?.call || current;
      callRef.current = callObj;
      incomingRef.current = null;
      roleRef.current = "callee";
      setCall(callObj);
      setIncoming(null);
      setRole("callee");
      const settings = runtime.current.me?.settings || {};
      setControls({
        muted: false,
        cameraOff: callObj.kind === "audio",
        speaker: settings.speakerDefault !== false,
        noiseCancellation: settings.noiseCancellation !== false,
      });
      if (!result?.token) result = { ...result, ...(await fetchToken(callObj.id)) };
      await connectRoom(result, callObj.kind);
      startTimer();
    } catch (err) {
      setError(err.message || "Could not join the call");
      runtime.current.say(err.message || "Could not join the call");
      cleanup();
    }
  }, [cleanup, connectRoom, fetchToken, startTimer]);

  const rejectCall = useCallback(async () => {
    const current = incomingRef.current;
    if (!current) return;
    try {
      await emitWithAck("call:reject", { callId: current.id }, 6000);
    } catch (_err) {
      api.post(`/calls/${current.id}/reject`).catch(() => {});
    }
    runtime.current.say("Call declined");
    cleanup("rejected");
  }, [cleanup]);

  const endCall = useCallback(async () => {
    const current = callRef.current;
    cleanup("ended");
    if (!current) return;
    try {
      await emitWithAck("call:end", { callId: current.id, reason: "hangup" }, 6000);
    } catch (_err) {
      api.post(`/calls/${current.id}/end`, { reason: "hangup" }).catch(() => {});
    }
  }, [cleanup]);

  const pushControl = useCallback(async (patch) => {
    const current = callRef.current;
    if (!current) return;
    try {
      await emitWithAck("call:control", { callId: current.id, ...patch }, 5000);
    } catch (_err) {
      api.post(`/calls/${current.id}/control`, patch).catch(() => {});
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !controlsRef.current.muted;
    const room = roomRef.current;
    if (room) {
      room.localParticipant
        .setMicrophoneEnabled(!nextMuted, {
          noiseSuppression: controlsRef.current.noiseCancellation,
          echoCancellation: controlsRef.current.noiseCancellation,
          autoGainControl: true,
        })
        .catch(() => {});
    }
    setControls({ ...controlsRef.current, muted: nextMuted });
    pushControl({ muted: nextMuted });
  }, [pushControl]);

  const toggleCamera = useCallback(() => {
    const nextOff = !controlsRef.current.cameraOff;
    const room = roomRef.current;
    if (room) room.localParticipant.setCameraEnabled(!nextOff).catch(() => {});
    setControls({ ...controlsRef.current, cameraOff: nextOff });
    pushControl({ cameraOff: nextOff });
  }, [pushControl]);

  const toggleSpeaker = useCallback(() => {
    const next = !controlsRef.current.speaker;
    setControls({ ...controlsRef.current, speaker: next });
    pushControl({ speaker: next });
  }, [pushControl]);

  const toggleNoise = useCallback(() => {
    const next = !controlsRef.current.noiseCancellation;
    const room = roomRef.current;
    if (room && !controlsRef.current.muted) {
      room.localParticipant
        .setMicrophoneEnabled(true, {
          noiseSuppression: next,
          echoCancellation: next,
          autoGainControl: next,
        })
        .catch(() => {});
    }
    setControls({ ...controlsRef.current, noiseCancellation: next });
    pushControl({ noiseCancellation: next });
    runtime.current.say(next ? "Noise cancellation on" : "Noise cancellation off");
  }, [pushControl]);

  const switchCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const devices = await Room.getLocalDevices("videoinput", true);
      if (devices.length < 2) {
        runtime.current.say("Only one camera found");
        return;
      }
      const currentId = room.getActiveDevice("videoinput");
      const index = devices.findIndex((d) => d.deviceId === currentId);
      const next = devices[(index + 1) % devices.length];
      await room.switchActiveDevice("videoinput", next.deviceId);
    } catch (_err) {
      runtime.current.say("Could not switch camera");
    }
  }, []);

  // ── Socket call events ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;

    const onIncoming = (payload) => {
      const incomingCall = payload?.call;
      if (!incomingCall) return;
      if (callRef.current) {
        emitWithAck("call:reject", { callId: incomingCall.id }, 4000).catch(() => {});
        return;
      }
      stopRingtone();
      incomingRef.current = incomingCall;
      roleRef.current = "callee";
      setIncoming(incomingCall);
      setRole("callee");
      setPhase("ringing");
      setError("");
      startRingtone("incoming");
      const limit = (runtime.current.config?.limits?.callRingSeconds || 45) * 1000 + 4000;
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = setTimeout(() => {
        if (incomingRef.current?.id === incomingCall.id) {
          stopRingtone();
          incomingRef.current = null;
          setIncoming(null);
          setPhase("idle");
        }
      }, limit);
    };

    const onRinging = (payload) => {
      if (payload?.call) {
        callRef.current = payload.call;
        setCall(payload.call);
      }
    };

    const onAccepted = (payload) => {
      if (payload?.call) {
        callRef.current = payload.call;
        setCall(payload.call);
      }
      if (roleRef.current === "caller") setPhase((p) => (p === "active" ? p : "connecting"));
    };

    const onEnded = (payload) => {
      const endedCall = payload?.call;
      const id = endedCall?.id || payload?.callId;
      const activeId = callRef.current?.id || incomingRef.current?.id;
      if (id && activeId && id !== activeId) return;
      if (!activeId) return;
      const reason = payload?.reason || endedCall?.endReason;
      const messages = {
        rejected: "Call declined",
        missed: "Missed call",
        no_answer: "No answer",
        hangup: "Call ended",
        host_ended: "Call ended",
        disconnected: "Call disconnected",
      };
      if (reason && reason !== "hangup") runtime.current.say(messages[reason] || "Call ended");
      cleanup(reason);
    };

    const onState = (payload) => {
      if (payload?.state) setRemoteState(payload.state);
    };

    const onRejected = () => {
      runtime.current.say("Call declined");
      cleanup("rejected");
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:ringing", onRinging);
    socket.on("call:accepted", onAccepted);
    socket.on("call:ended", onEnded);
    socket.on("call:state", onState);
    socket.on("call:rejected", onRejected);

    const onConnect = () => {
      const current = getSocket();
      if (current?.connected && callRef.current) {
        emitWithAck("call:join", { callId: callRef.current.id }, 5000).catch(() => {});
      }
    };
    socket.on("connect", onConnect);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:ringing", onRinging);
      socket.off("call:accepted", onAccepted);
      socket.off("call:ended", onEnded);
      socket.off("call:state", onState);
      socket.off("call:rejected", onRejected);
      socket.off("connect", onConnect);
    };
  }, [token, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const value = useMemo(
    () => ({
      call,
      incoming,
      role,
      phase,
      tracks,
      controls,
      seconds,
      error,
      remoteState,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleSpeaker,
      toggleNoise,
      switchCamera,
      clearError: () => setError(""),
    }),
    [
      call,
      incoming,
      role,
      phase,
      tracks,
      controls,
      seconds,
      error,
      remoteState,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleSpeaker,
      toggleNoise,
      switchCamera,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
