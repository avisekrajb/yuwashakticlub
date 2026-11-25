import { useState } from "react";
import Face from "./Face";
import { I } from "../common/Icon";

export default function TeamPage({ d }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState("grid");
  const list = d.team.filter((m) => (m.name + " " + m.role).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="tp">
      <h1 className="ttl">Our team</h1><p className="sub">The {d.team.length} people behind Shree Yuwa Shakti Club.</p>
      <div className="tbar">
        <div className="sbx">{I("search", 18)}<input className="in" placeholder="Search by name or role" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search team" /></div>
        <div className="vt">{[["grid", "grid"], ["list", "list"]].map(([k, ic]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)} aria-label={k + " view"}>{I(ic, 18)}</button>)}</div>
      </div>
      {q && <p className="meta" style={{ marginBottom: 10 }}>Showing {list.length} of {d.team.length}</p>}
      {!list.length ? <p className="muted">No members match your search.</p> : view === "grid"
        ? <div className="tpg">{list.map((m) => <div className="card" key={m.id}><Face m={m} i={d.team.indexOf(m)} /><b>{m.name}</b><small>{m.role}</small></div>)}</div>
        : <div className="tl">{list.map((m) => <div className="card" key={m.id}><Face m={m} i={d.team.indexOf(m)} /><div><b>{m.name}</b><small>{m.role}</small></div></div>)}</div>}
    </div>
  );
}
