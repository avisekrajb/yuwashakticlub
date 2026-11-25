import { GR } from "../../utils";

export default function Face({ m, i }) {
  return (
    <div className="fc" style={{ background: `linear-gradient(135deg,${GR[i % 6]})` }}>
      {m.name[0]}{m.url && <img src={m.url} alt={m.name} onError={(e) => (e.target.style.display = "none")} />}
    </div>
  );
}
