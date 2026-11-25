import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";

export default function CommentsTab() {
  const { d, set, say } = useApp();
  return (<>
    <div className="bar"><h2>Comments</h2></div>
    {!d.comments.length && <p className="muted">No comments yet.</p>}
    {d.comments.map((c) => (
      <div className="row" key={c.id}>
        <div className="grow"><small>{c.name} on “{d.blogs.find((b) => b.id === c.blogId)?.title || "deleted blog"}”</small><b style={{ whiteSpace: "normal" }}>{c.text}</b></div>
        <button className="ib red" aria-label="Delete comment" onClick={() => { set.comments((l) => l.filter((x) => x.id !== c.id)); say("Comment deleted"); }}>{I("trash")}</button>
      </div>))}
  </>);
}
