import { useRef, useState } from "react";
import Loader from "../common/Loader";
import { uploadFile, checkFileSize } from "../../lib/upload";
import { useApp } from "../../context/AppContext";

export default function PhotoPicker({ photos = [], onChange, setErr }) {
  const { config } = useApp();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fi = useRef(null);
  const room = 5 - photos.length;
  const fail = (message) => setErr && setErr(message);

  const addFiles = async (e) => {
    const files = [...(e.target.files || [])].slice(0, room);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    fail("");
    setProgress(0);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!/^image\//.test(file.type)) {
          fail("Only image files can be uploaded here.");
          continue;
        }
        checkFileSize(file, "image", { maxImageMb: config?.limits?.maxImageMb || 25 });
        const result = await uploadFile(file, "image", setProgress);
        if (result?.url) uploaded.push(result.url);
        setProgress(0);
      }
      if (uploaded.length) onChange((p) => [...p, ...uploaded].slice(0, 5));
    } catch (x) {
      fail(x.message || "One photo couldn't be uploaded. Try a different image.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const addUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return fail("Enter a full image link starting with https://");
    if (room <= 0) return fail("You can add up to 5 photos.");
    onChange((p) => [...p, u].slice(0, 5));
    setUrl("");
    fail("");
  };

  return (
    <>
      <label className="fl">
        Photos (optional, max 5) <span className="muted">· {photos.length}/5</span>
      </label>
      <div className="pu">
        {photos.map((u, i) => (
          <div key={u + i}>
            <img src={u} alt="" />
            <button
              type="button"
              className="x"
              aria-label="Remove photo"
              onClick={() => onChange((p) => p.filter((_, k) => k !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {room > 0 && (
          <button
            type="button"
            className="add"
            onClick={() => fi.current && fi.current.click()}
            disabled={busy}
            aria-label="Upload photos"
          >
            {busy ? <Loader /> : "+"}
          </button>
        )}
      </div>
      {busy && progress > 0 && (
        <div className="pc-progress" style={{ marginBottom: 10 }}>
          <span style={{ width: progress + "%" }} />
          <small>Uploading… {progress}%</small>
        </div>
      )}
      <input ref={fi} type="file" accept="image/*" multiple hidden onChange={addFiles} />
      {room > 0 && (
        <div className="ur">
          <input
            className="in"
            placeholder="or paste an image link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
          />
          <button type="button" className="btn line" onClick={addUrl}>
            Add
          </button>
        </div>
      )}
    </>
  );
}
