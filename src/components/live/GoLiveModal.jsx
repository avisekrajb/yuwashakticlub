import { useEffect, useRef, useState } from "react";
import Modal from "../common/Modal";
import Loader from "../common/Loader";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

export default function GoLiveModal({ onClose, onStart }) {
  const { me } = useAuth();
  const { startLive, say, config } = useApp();
  const [title, setTitle] = useState("");
  const [stream, setStream] = useState(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.play().catch(() => {});
        }
      } catch (x) {
        setDeviceError(
          "Camera or microphone is blocked. Allow access in your browser, then reopen this dialog."
        );
      }
    })();
    return () => {
      cancelled = true;
      setStream((current) => {
        current?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, []);

  const toggleCam = () => {
    const next = !camOn;
    stream?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };

  const toggleMic = () => {
    const next = !micOn;
    stream?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const start = async () => {
    if (starting) return;
    if (title.trim().length < 2) return setErr("Give your live video a title.");
    setStarting(true);
    setErr("");
    try {
      const result = await startLive(title.trim());
      // LiveRoom requests its own camera; release the preview first.
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
      const live = result?.live;
      if (!live?.id) throw new Error("Could not start the live video");
      say("You are live now 🔴");
      onStart(live);
    } catch (x) {
      setErr(x.message || "Could not start the live video");
    } finally {
      setStarting(false);
    }
  };

  const max = Math.round((config?.limits?.liveSeconds || 600) / 60);

  return (
    <Modal
      wide
      title="Go live"
      sub={`Your live video can run for up to ${max} minutes. Everyone can watch.`}
      onClose={starting ? () => {} : onClose}
    >
      <div className="gl-preview">
        <video ref={videoRef} autoPlay playsInline muted className={camOn ? "" : "off"} />
        {!camOn && (
          <div className="gl-camoff">
            <Avatar u={me || { name: "You" }} size={72} />
            <small>Camera is off</small>
          </div>
        )}
        <div className="gl-preview-controls">
          <button type="button" className={"gl-ctrl" + (micOn ? " on" : "")} onClick={toggleMic}>
            {I("phone", 18)}
            <span>{micOn ? "Mic on" : "Mic off"}</span>
          </button>
          <button type="button" className={"gl-ctrl" + (camOn ? " on" : "")} onClick={toggleCam}>
            {I("video", 18)}
            <span>{camOn ? "Camera on" : "Camera off"}</span>
          </button>
        </div>
      </div>

      {deviceError && <p className="err" role="alert">{deviceError}</p>}

      <label className="fl">Live title</label>
      <input
        className="in"
        placeholder="What are you going live about?"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setErr("");
        }}
        maxLength={120}
        disabled={starting}
      />

      {err && <p className="err" role="alert">{err}</p>}

      <div className="row2" style={{ marginTop: 10 }}>
        <button type="button" className="btn line" onClick={onClose} disabled={starting}>
          Cancel
        </button>
        <button type="button" className="btn live-btn" onClick={start} disabled={starting}>
          {starting ? <Loader /> : <>{I("video", 17)} Start live</>}
        </button>
      </div>
    </Modal>
  );
}
