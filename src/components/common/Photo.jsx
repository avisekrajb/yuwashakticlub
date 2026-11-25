import { GR } from "../../utils";

export default function Photo({ g, i }) {
  return (
    <div className="ph" style={{ background: `linear-gradient(135deg,${GR[i % 6]})` }}>
      {g.url ? <img src={g.url} alt={g.title} onError={(e) => (e.target.style.display = "none")} /> : <em>📸</em>}
      <span>{g.title}</span>
    </div>
  );
}
