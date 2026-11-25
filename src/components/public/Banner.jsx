import { useState, useEffect, useRef } from "react";
import { GR } from "../../utils";

export default function Banner({ items }) {
  const [i, setI] = useState(0);
  const x0 = useRef(0);
  const n = items.length;
  useEffect(() => { if (n < 2) return; const t = setInterval(() => setI((v) => (v + 1) % n), 4200); return () => clearInterval(t); }, [n, i]);
  if (!n) return null;
  const at = i % n;
  return (
    <div className="bnr" onTouchStart={(e) => (x0.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 40) setI((at + (dx < 0 ? 1 : -1) + n) % n); }}>
      <div className="bt" style={{ transform: `translateX(-${at * 100}%)` }}>
        {items.map((b, k) => (
          <div className="bs" key={b.id} style={{ background: `linear-gradient(135deg,${GR[k % 6]})` }}>
            {b.url && <img src={b.url} alt="" onError={(e) => (e.target.style.display = "none")} />}
            <div className="bc"><h2>{b.title}</h2>{b.sub && <p>{b.sub}</p>}</div>
          </div>))}
      </div>
      {n > 1 && <div className="dots">{items.map((b, k) => <button key={b.id} className={k === at ? "on" : ""} onClick={() => setI(k)} aria-label={"Banner " + (k + 1)} />)}</div>}
    </div>
  );
}
