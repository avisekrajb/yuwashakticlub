import { useEffect, useRef, useState } from "react";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import {
  uploadFile,
  checkFileSize,
  getMediaDuration,
  recordAudio,
} from "../../lib/upload";

const MODES = [
  ["photo", "Photo", "image"],
  ["video", "Video", "video"],
  ["sound", "Sound", "bell"],
];

export default function StoryComposer({ onClose }) {
  const { me } = useAuth();
  const { createStory, say, config } = useApp();
  const maxSeconds = config?.limits?.storySeconds || 15;
  const maxVideoMb = config?.limits?.maxVideoMb || 200;
  const maxImageMb = config?.limits?.maxImageMb || 25;

  const [mode, setMode] = useState("photo");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState("");
  const [sound, setSound] = useState(null);
  const [soundPreview, setSoundPreview] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef(null);
  const recorder = useRef(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );
  useEffect(
    () => () => {
      if (soundPreview) URL.revokeObjectURL(soundPreview);
    },
    [soundPreview]
  );
  useEffect(() => () => recorder.current?.cancel?.(), []);

  const clearMedia = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setDuration(0);
  };

  const switchMode = (next) => {
    if (recording) return;
    setMode(next);
    setErr("");
    clearMedia();
    if (input.current) input.current.value = "";
  };

  const onPick = async (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    setErr("");
    clearMedia();
    try {
      if (mode === "photo") {
        if (!/^image\//.test(chosen.type)) throw new Error("Choose an image file.");
        checkFileSize(chosen, "image", { maxImageMb });
        setFile(chosen);
        setPreview(URL.createObjectURL(chosen));
      } else if (mode === "video") {
        if (!/^video\//.test(chosen.type)) throw new Error("Choose a video file.");
        checkFileSize(chosen, "video", { maxVideoMb });
        const secs = await getMediaDuration(chosen);
        if (secs > maxSeconds + 1) {
          throw new Error(`Stories can be at most ${maxSeconds} seconds long.`);
        }
        setFile(chosen);
        setDuration(secs);
        setPreview(URL.createObjectURL(chosen));
      }
    } catch (x) {
      setErr(x.message || "Could not read that file");
    }
  };

  const startRecording = async () => {
    if (recording) return;
    setErr("");
    try {
      setRecordSeconds(0);
      const session = await recordAudio({
        maxSeconds,
        onTick: (s) => setRecordSeconds(s),
      });
      recorder.current = session;
      setRecording(true);
      session.done.then((result) => {
        setRecording(false);
        recorder.current = null;
        if (result.error) {
          setErr(result.error.message || "Recording failed");
          return;
        }
        if (result.cancelled || !result.file) return;
        if (soundPreview) URL.revokeObjectURL(soundPreview);
        setSound({
          file: result.file,
          duration: result.duration,
          name: "Recorded sound",
        });
        setSoundPreview(URL.createObjectURL(result.file));
      });
    } catch (x) {
      setErr(x.message || "Microphone is not available");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
  };

  const removeSound = () => {
    if (soundPreview) URL.revokeObjectURL(soundPreview);
    setSoundPreview("");
    setSound(null);
  };

  const submit = async () => {
    if (busy) return;
    setErr("");
    if (mode === "sound") {
      if (!sound?.file) return setErr("Record a sound first (max 15 seconds).");
    } else if (!file) {
      return setErr(mode === "photo" ? "Choose a photo first." : "Choose a video first.");
    }
    setBusy(true);
    try {
      let url;
      let publicId = "";
      let poster = "";
      let kind = mode;
      let finalDuration = duration;

      if (mode === "sound") {
        const uploaded = await uploadFile(sound.file, "story", setProgress);
        url = uploaded.url;
        publicId = uploaded.publicId;
        finalDuration = sound.duration || uploaded.duration || recordSeconds;
      } else {
        const uploaded = await uploadFile(file, "story", setProgress);
        url = uploaded.url;
        publicId = uploaded.publicId;
        poster = uploaded.poster || "";
        kind = uploaded.type === "video" ? "video" : "photo";
        if (kind === "video") finalDuration = duration || uploaded.duration || 0;
      }
      setProgress(0);

      let soundPayload = null;
      if (sound?.file && mode !== "sound") {
        const uploadedSound = await uploadFile(sound.file, "story");
        soundPayload = {
          name: sound.name || "Recorded sound",
          url: uploadedSound.url,
          publicId: uploadedSound.publicId,
          duration: Math.min(sound.duration || uploadedSound.duration || 0, maxSeconds),
        };
      }
      setProgress(0);

      await createStory({
        kind,
        url,
        publicId,
        poster,
        caption: caption.trim(),
        duration: Math.min(finalDuration || 0, maxSeconds),
        sound: soundPayload,
      });
      say("Story added — visible for 24 hours");
      onClose();
    } catch (x) {
      setErr(x.message || "Could not publish the story");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  const canPick = mode !== "sound";

  return (
    <Modal
      wide
      title="Add a story"
      sub="Stories disappear automatically after 24 hours."
      onClose={busy ? () => {} : onClose}
    >
      <div className="sc-head">
        <Avatar u={me || { name: "You" }} size={42} />
        <div>
          <b>{me?.name || "You"}</b>
          <small>Visible to everyone for 24 hours</small>
        </div>
      </div>

      <div className="seg sc-tabs">
        {MODES.map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            className={mode === key ? "on" : ""}
            onClick={() => switchMode(key)}
            disabled={recording}
          >
            {I(icon, 16)}
            {label}
          </button>
        ))}
      </div>

      {canPick && (
        <>
          <div className={"sc-preview" + (preview ? " has" : "")}>
            {preview && mode === "photo" && <img src={preview} alt="Story preview" />}
            {preview && mode === "video" && (
              <video src={preview} controls playsInline onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || duration)} />
            )}
            {!preview && (
              <button type="button" className="sc-pick" onClick={() => input.current?.click()}>
                {I(mode === "photo" ? "image" : "video", 30)}
                <b>{mode === "photo" ? "Choose a photo" : "Choose a video"}</b>
                <small>
                  {mode === "video"
                    ? `Up to ${maxSeconds}s · ${maxVideoMb} MB`
                    : `Up to ${maxImageMb} MB`}
                </small>
              </button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept={mode === "photo" ? "image/*" : "video/*"}
            hidden
            onChange={onPick}
          />
          {preview && (
            <div className="row2 sc-media-actions">
              <button type="button" className="btn line sm" onClick={() => input.current?.click()}>
                {I("edit", 16)} Replace
              </button>
              <button type="button" className="btn line sm" onClick={clearMedia}>
                {I("trash", 16)} Remove
              </button>
            </div>
          )}
        </>
      )}

      {mode === "sound" && (
        <div className={"sc-sound" + (soundPreview ? " has" : "")}>
          {!soundPreview ? (
            <button
              type="button"
              className={"sc-rec" + (recording ? " rec" : "")}
              onClick={recording ? stopRecording : startRecording}
            >
              <span className="sc-rec-dot" />
              {recording ? `Stop (${recordSeconds.toFixed(1)}s)` : "Record a sound"}
            </button>
          ) : (
            <div className="sc-sound-play">
              <audio src={soundPreview} controls />
              <button type="button" className="btn line sm" onClick={removeSound}>
                Remove sound
              </button>
            </div>
          )}
          <small className="muted">Sound stories can be at most {maxSeconds} seconds.</small>
        </div>
      )}

      {mode !== "sound" && (
        <div className="sc-sound-add">
          <label className="fl" style={{ marginTop: 4 }}>
            Add a sound (optional, max {maxSeconds}s)
          </label>
          {!soundPreview ? (
            <button
              type="button"
              className={"btn line sm" + (recording ? " rec" : "")}
              onClick={recording ? stopRecording : startRecording}
              disabled={busy}
            >
              {I("bell", 16)} {recording ? `Stop recording (${recordSeconds.toFixed(1)}s)` : "Record sound"}
            </button>
          ) : (
            <div className="sc-sound-play">
              <audio src={soundPreview} controls />
              <button type="button" className="btn line sm" onClick={removeSound}>
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      <label className="fl">Caption (optional)</label>
      <input
        className="in"
        placeholder="Say something about this story…"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={300}
        disabled={busy}
      />

      {busy && progress > 0 && (
        <div className="pc-progress">
          <span style={{ width: progress + "%" }} />
          <small>Uploading… {progress}%</small>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}

      <div className="row2" style={{ marginTop: 10 }}>
        <button type="button" className="btn line" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn" onClick={submit} disabled={busy || recording}>
          {busy ? <Loader /> : "Share story"}
        </button>
      </div>
    </Modal>
  );
}
