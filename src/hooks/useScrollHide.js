import { useState, useEffect } from "react";

export default function useScrollHide() {
  const [h, setH] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const f = () => { const y = window.scrollY; if (Math.abs(y - last) < 8) return; setH(y > last && y > 80); last = y; };
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return h;
}
