import { GR, ytId } from "../../utils";

export default function VideoCard({ g, i, onPlay }) {
  const id = ytId(g.url);
  const th = g.thumb || (id ? "https://img.youtube.com/vi/" + id + "/hqdefault.jpg" : "");
  return (
    <div className="vc" style={{ background: `linear-gradient(135deg,${GR[i % 6]})` }} onClick={() => onPlay(g)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onPlay(g)} aria-label={"Play " + g.title}>
      {th && <img src={th} alt="" onError={(e) => (e.target.style.display = "none")} />}
      <div className="pl"><i><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></i></div>
      <span>{g.title}</span>
    </div>
  );
}
