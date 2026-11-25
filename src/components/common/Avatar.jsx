import { GR } from "../../utils";

export default function Avatar({ u, size }) {
  return (
    <div className="av" style={{ background: `linear-gradient(135deg,${GR[(u.name.charCodeAt(0) || 0) % 6]})`, width: size, height: size, fontSize: size ? Math.round(size * 0.4) : undefined }}>
      {u.name.slice(0, 1).toUpperCase()}
      {u.photo && <img src={u.photo} alt="" onError={(e) => (e.target.style.display = "none")} />}
    </div>
  );
}
