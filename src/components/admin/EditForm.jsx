import { useState } from "react";

export default function EditForm({ fields, init, onSave, onCancel }) {
  const [f, setF] = useState({ ...init });
  const [err, setErr] = useState("");
  const save = () => {
    const miss = fields.find((x) => !x.opt && x.type !== "select" && !String(f[x.k] || "").trim());
    if (miss) return setErr(miss.label + " is required.");
    onSave(f);
  };
  return (
    <div onKeyDown={(e) => e.key === "Enter" && e.target.tagName === "INPUT" && save()}>
      {fields.map((x) => (
        <div key={x.k}><label className="fl">{x.label}</label>
          {x.type === "area" ? <textarea className="in" value={f[x.k] || ""} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />
            : x.type === "select" ? <select className="in" value={f[x.k] || x.opts[0]} onChange={(e) => setF({ ...f, [x.k]: e.target.value })}>{x.opts.map((o) => <option key={o}>{o}</option>)}</select>
            : <input className="in" type={x.type || "text"} value={f[x.k] || ""} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />}
        </div>))}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row2" style={{ marginTop: 6 }}><button type="button" className="btn line" onClick={onCancel}>Cancel</button><button className="btn" type="button" onClick={save}>Save</button></div>
    </div>
  );
}
