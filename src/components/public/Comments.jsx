import { useState } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { ago } from "../../utils";

export default function Comments({ list, me, users, onPost, onDel, openAuth }) {
  const [t, setT] = useState("");
  const [all, setAll] = useState(false);
  const sorted = [...list].sort((a, b) => b.t - a.t);
  const shown = all ? sorted : sorted.slice(0, 3);
  const post = () => { const x = t.trim(); if (!x) return; onPost(x); setT(""); setAll(false); };
  return (
    <section className="cmt">
      <h2>Comments <span className="muted">({list.length})</span></h2>
      {me ? (
        <div className="cmw"><Avatar u={me} size={36} />
          <input className="in" placeholder="Write a comment…" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && post()} />
          <button className="btn sm" type="button" onClick={post}>Post</button></div>
      ) : (
        <div className="card cmw lg"><span className="muted">Log in to join the conversation.</span><button className="btn sm" onClick={() => openAuth("login")}>Log in</button></div>
      )}
      {!list.length && <p className="muted">No comments yet. Be the first to comment.</p>}
      {shown.map((c) => {
        const u = users.find((x) => x.id === c.userId); const nm = u ? u.name : c.name;
        return (
          <div className="cm1" key={c.id}><Avatar u={u || { name: nm }} size={36} />
            <div className="grow"><b>{nm}</b><small>{ago(c.t)}</small><p>{c.text}</p></div>
            {me && c.userId === me.id && <button className="ib red" onClick={() => onDel(c)} aria-label="Delete comment">{I("trash", 18)}</button>}
          </div>);
      })}
      {sorted.length > 3 && <button className="lnk" onClick={() => setAll(!all)}>{all ? "View less" : "View all " + sorted.length + " comments"}</button>}
    </section>
  );
}
