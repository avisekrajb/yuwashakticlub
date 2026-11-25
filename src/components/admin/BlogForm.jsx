import { useState } from "react";
import PhotoPicker from "./PhotoPicker";
import { today } from "../../utils";

export default function BlogForm({ init, onSave, onCancel }) {
  const [f, setF] = useState({ title: "", tag: "", date: today(), text: "", ...init, photos: [...(init.photos || [])] });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setPhotos = (fn) => setF((p) => ({ ...p, photos: fn(p.photos) }));
  const save = () => {
    if (!f.title.trim()) return setErr("Title is required.");
    if (!f.text.trim()) return setErr("Content is required.");
    onSave({ ...f, tag: f.tag.trim() || "News" });
  };
  return (
    <div>
      <label className="fl">Title</label><input className="in" value={f.title} onChange={set("title")} />
      <label className="fl">Category</label><input className="in" value={f.tag} onChange={set("tag")} placeholder="e.g. Sports" />
      <label className="fl">Date</label><input className="in" type="date" value={f.date} onChange={set("date")} />
      <label className="fl">Content</label><textarea className="in" value={f.text} onChange={set("text")} />
      <PhotoPicker photos={f.photos} onChange={setPhotos} setErr={setErr} />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row2" style={{ marginTop: 6 }}><button type="button" className="btn line" onClick={onCancel}>Cancel</button><button className="btn" type="button" onClick={save}>Save</button></div>
    </div>
  );
}
