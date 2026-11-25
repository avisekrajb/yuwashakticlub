import { useEffect, useRef } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useCall } from "../../context/CallContext";

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function MediaTrack({ track, muted, speaker, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return undefined;
    try {
      track.attach(el);
    } catch (_err) {
      /* noop */
    }
    return () => {
      try {
        track.detach(el);
      } catch (_err) {
        /* noop */
      }
    };
  }, [track]);

  useEffect(() => {
    if (ref.current && track?.kind === "audio") ref.current.volume = speaker ? 1 : 0.35;
  }, [speaker, track]);

  if (track?.kind === "audio") {
    return <audio ref={ref} autoPlay muted={muted} className={className} />;
  }
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export default function CallModal() {
  const {
    call,
    role,
    phase,
    tracks,
    controls,
    seconds,
    error,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    toggleNoise,
    switchCamera,
  } = useCall();

  if (!call) return null;

  const other = call.direction === "incoming" ? call.caller : call.callee;
  const isGroup = !other;
  const title = isGroup ? "Group call" : other?.name || "Club call";
  const remoteVideo = tracks.find((t) => t.kind === "video" && !t.local);
  const localVideo = tracks.find((t) => t.kind === "video" && t.local);
  const remoteAudios = tracks.filter((t) => t.kind === "audio" && !t.local);
  const statusText =
    phase === "connecting"
      ? role === "caller"
        ? "Ringing…"
        : "Connecting…"
      : phase === "ringing"
      ? "Ringing…"
      : call.kind === "video"
      ? "Video call"
      : "Voice call";

  return (
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label="Call">
      <div className={"call-screen" + (call.kind === "video" ? " video" : " audio")}>
        <div className="call-top">
          <div>
            <h3>{title}</h3>
            <small>{phase === "active" ? formatTime(seconds) : statusText}</small>
          </div>
          {isGroup && <span className="call-badge">Group</span>}
        </div>

        {remoteAudios.map((t) => (
          <MediaTrack key={t.key} track={t.track} muted={false} speaker={controls.speaker} className="hidden-audio" />
        ))}

        <div className="call-stage">
          {call.kind === "video" ? (
            remoteVideo ? (
              <MediaTrack track={remoteVideo.track} muted={false} speaker={controls.speaker} className="remote-video" />
            ) : (
              <div className="call-waiting">
                <Avatar u={other || { name: "Call" }} size={104} />
                <p>{phase === "active" ? "Waiting for video…" : statusText}</p>
              </div>
            )
          ) : (
            <div className="call-waiting audio">
              <div className="call-pulse">
                <Avatar u={other || { name: "Call" }} size={110} />
                <span className="ring r1" />
                <span className="ring r2" />
                <span className="ring r3" />
              </div>
              <p>{phase === "active" ? formatTime(seconds) : statusText}</p>
            </div>
          )}

          {localVideo && (
            <div className="local-video-wrap">
              <MediaTrack track={localVideo.track} muted speaker={controls.speaker} className="local-video" />
            </div>
          )}
        </div>

        {error && <p className="call-error">{error}</p>}

        <div className="call-controls">
          <button className={"call-ctrl" + (controls.muted ? " off" : "")} onClick={toggleMute} title={controls.muted ? "Unmute" : "Mute"}>
            {I("phone", 22)}
            <span>{controls.muted ? "Unmute" : "Mute"}</span>
          </button>
          {call.kind === "video" && (
            <button className={"call-ctrl" + (controls.cameraOff ? " off" : "")} onClick={toggleCamera} title="Camera">
              {I("video", 22)}
              <span>{controls.cameraOff ? "Camera on" : "Camera off"}</span>
            </button>
          )}
          <button className={"call-ctrl" + (controls.speaker ? " on" : "")} onClick={toggleSpeaker} title="Speaker">
            {I("bell", 22)}
            <span>Speaker</span>
          </button>
          <button className={"call-ctrl" + (controls.noiseCancellation ? " on" : "")} onClick={toggleNoise} title="Noise cancellation">
            {I("set", 22)}
            <span>Noise {controls.noiseCancellation ? "on" : "off"}</span>
          </button>
          {call.kind === "video" && (
            <button className="call-ctrl" onClick={switchCamera} title="Switch camera">
              {I("image", 22)}
              <span>Flip</span>
            </button>
          )}
          <button className="call-ctrl end" onClick={endCall} title="End call">
            {I("phone", 22)}
            <span>End</span>
          </button>
        </div>
      </div>
    </div>
  );
}
