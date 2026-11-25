import { useRef, useState } from "react";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { uploadFile, checkFileSize, getMediaDuration } from "../../lib/upload";

const CATEGORIES = ["General", "Sports", "Community", "Learning", "Events", "Achievements"];

export default function PostComposer({ onClose }) {
  const { me } = useAuth();
  const { createPost, say, config } = useApp();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const input = useRef(null);

  const limits = config?.limits || {};
  const maxVideo = limits.postVideoSeconds || 300;
  const maxVideoMb = limits.maxVideoMb || 200;
  const maxImageMb = limits.maxImageMb || 25;

  const addFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setErr("");
    const room = 10 - media.length;
    const chosen = files.slice(0, room);
    const added = [];
    setBusy(true);
    try {
      for (const file of chosen) {
        const isVideo = /^video\//.test(file.type);
        const isImage = /^image\//.test(file.type);
        if (!isVideo && !isImage) {
          setErr("Only photos and videos can be attached.");
          continue;
        }
        if (isVideo) {
          checkFileSize(file, "video", { maxVideoMb });
          const duration = await getMediaDuration(file);
          if (duration > maxVideo + 2) {
            setErr(`Videos can be at most ${Math.floor(maxVideo / 60)} minutes long.`);
            continue;
          }
          const uploaded = await uploadFile(file, "post", setProgress);
          added.push({ ...uploaded, duration: uploaded.duration || duration, type: uploaded.type || "video" });
        } else {
          checkFileSize(file, "image", { maxImageMb });
          const uploaded = await uploadFile(file, "post", setProgress);
          added.push({ ...uploaded, type: uploaded.type || "image" });
        }
        setProgress(0);
      }
      if (added.length) setMedia((prev) => [...prev, ...added].slice(0, 10));
    } catch (x) {
      setErr(x.message || "Upload failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!text.trim() && !media.length) return setErr("Write something or attach a photo/video.");
    setBusy(true);
    setErr("");
    try {
      await createPost({
        text: text.trim(),
        category,
        media: media.map((m) => ({
          url: m.url,
          publicId: m.publicId,
          type: m.type,
          poster: m.poster || "",
          name: m.name || "",
          size: m.size || 0,
          duration: m.duration || 0,
          width: m.width || 0,
          height: m.height || 0,
        })),
      });
      say("Posted to the club 🎉");
      onClose();
    } catch (x) {
      setErr(x.message || "Could not publish the post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal wide title="Create a post" sub="Share a moment with the club." onClose={busy ? () => {} : onClose}>
      <div className="pc-head">
        <Avatar u={me || { name: "You" }} size={44} />
        <div>
          <b>{me?.name || "You"}</b>
          <small>Posting publicly to the club</small>
        </div>
      </div>
      <textarea
        className="in pc-text"
        placeholder="What's happening at the club?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={5000}
      />
      <div className="pc-row">
        <label className="fl" style={{ margin: 0 }}>Category</label>
        <select className="in pc-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {media.length > 0 && (
        <div className="pc-media">
          {media.map((m, i) => (
            <div key={m.publicId || m.url || i} className="pc-thumb">
              {m.type === "video" ? (
                <video src={m.url} poster={m.poster} muted />
              ) : (
                <img src={m.url} alt="" />
              )}
              <button type="button" className="x" onClick={() => setMedia((prev) => prev.filter((_, k) => k !== i))} aria-label="Remove">
                ×
              </button>
              {m.type === "video" && <span className="pc-vbadge">{I("video", 12)}</span>}
            </div>
          ))}
        </div>
      )}

      {busy && progress > 0 && (
        <div className="pc-progress">
          <span style={{ width: progress + "%" }} />
          <small>Uploading… {progress}%</small>
        </div>
      )}

      <div className="pc-actions">
        <button type="button" className="btn line sm" onClick={() => input.current?.click()} disabled={busy || media.length >= 10}>
          {I("image", 18)} Photo / video
        </button>
        <span className="muted pc-hint">Video up to {Math.floor(maxVideo / 60)} min · {maxVideoMb} MB</span>
      </div>
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={addFiles} />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row2" style={{ marginTop: 8 }}>
        <button type="button" className="btn line" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn" onClick={submit} disabled={busy}>
          {busy ? <Loader /> : "Publish"}
        </button>
      </div>
    </Modal>
  );
}
