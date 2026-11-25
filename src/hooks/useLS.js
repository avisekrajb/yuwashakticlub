import { useState, useEffect } from "react";

export default function useLS(key, init, sync = true) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (e) {}
    return init;
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }, [key, v]);
  useEffect(() => {
    if (!sync) return;
    const h = (e) => { if (e.key === key && e.newValue) { try { setV(JSON.parse(e.newValue)); } catch (x) {} } };
    window.addEventListener("storage", h); return () => window.removeEventListener("storage", h);
  }, [key, sync]);
  return [v, setV];
}
