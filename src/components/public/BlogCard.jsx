import Thumbs from "../common/Thumbs";

export default function BlogCard({ b, onOpen, cc }) {
  return (
    <article className="card" onClick={onOpen} style={{ cursor: onOpen ? "pointer" : "default" }}>
      <span className="tag">{b.tag}</span><h3>{b.title}</h3>
      <p style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.text}</p>
      <Thumbs list={b.photos || []} />
      <div className="meta" style={{ marginTop: 10 }}>{b.date}{cc > 0 ? " · 💬 " + cc : ""}</div>
    </article>
  );
}
