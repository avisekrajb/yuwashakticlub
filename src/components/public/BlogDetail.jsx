import { useState } from "react";
import BlogCard from "./BlogCard";
import Clamp from "./Clamp";
import Comments from "./Comments";
import { I } from "../common/Icon";

export default function BlogDetail({ b, all, comments, me, users, onBack, onOpen, onPost, onDelComment, openAuth }) {
  const ph = b.photos || [];
  const [i, setI] = useState(0);
  const more = all.filter((x) => x.id !== b.id).slice(0, 3);
  return (
    <article className="bd">
      <div><span className="tag">{b.tag}</span></div>
      <h1 className="ttl bdt">{b.title}</h1>
      <div className="meta">{b.date}</div>
      {ph.length > 0 && (<>
        <img className="hero2" src={ph[Math.min(i, ph.length - 1)]} alt="" />
        {ph.length > 1 && <div className="mini">{ph.map((u, k) => <button key={k} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={"Photo " + (k + 1)}><img src={u} alt="" /></button>)}</div>}
      </>)}
      <Clamp text={b.text} />
      <Comments list={comments.filter((c) => c.blogId === b.id)} me={me} users={users} onPost={(t) => onPost(b.id, t)} onDel={onDelComment} openAuth={openAuth} />
      {more.length > 0 && <div className="sec"><h2>More stories</h2><div className="grid c3">{more.map((x) => <BlogCard key={x.id} b={x} cc={comments.filter((c) => c.blogId === x.id).length} onOpen={() => onOpen(x)} />)}</div></div>}
      <div className="bk3"><button className="btn line sm" onClick={onBack}>{I("back", 18)} Back to all blogs</button></div>
    </article>
  );
}
