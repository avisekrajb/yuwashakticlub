import { useState } from "react";

export default function Clamp({ text }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;
  return (
    <div className="bdx">
      {long && !open ? <p>{text.slice(0, 320).trimEnd()}…</p> : text.split(/\n+/).map((p, k) => <p key={k}>{p}</p>)}
      {long && <button className="lnk" onClick={() => setOpen(!open)}>{open ? "View less" : "View more"}</button>}
    </div>
  );
}
