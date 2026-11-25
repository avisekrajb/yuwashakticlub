export const uid = () => Math.random().toString(36).slice(2, 9);
export const today = () => new Date().toISOString().slice(0, 10);
export const GR = ["#ff6a1a,#d6204a", "#6a5cff,#22c1ff", "#12b886,#4dabf7", "#f59f00,#e8590c", "#be4bdb,#f06595", "#1c7ed6,#12b886"];

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
export const dayLabel = (t) => {
  const n = Date.now(); if (sameDay(t, n)) return "Today"; if (sameDay(t, n - 86400000)) return "Yesterday";
  const d = new Date(t); return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};
export const stamp = (t) => (sameDay(t, Date.now()) ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : dayLabel(t));
export const ago = (t) => { const m = Math.floor((Date.now() - t) / 60000); if (m < 1) return "just now"; if (m < 60) return m + "m ago"; const h = Math.floor(m / 60); if (h < 24) return h + "h ago"; return Math.floor(h / 24) + "d ago"; };

export const toAvatar = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onerror = rej;
  r.onload = () => {
    const img = new Image(); img.onerror = rej;
    img.onload = () => {
      const S = 256, k = Math.max(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
      const c = document.createElement("canvas"); c.width = S; c.height = S;
      c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h); res(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
});
export const toData = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onerror = rej;
  r.onload = () => {
    const img = new Image();
    img.onerror = rej;
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
});

// seeded members (Sita, Anil) auto-reply in DMs so notifications can be tried. Set false for production.
export const DEMO_REPLIES = true;

export const beep = () => {
  try {
    const C = window.AudioContext || window.webkitAudioContext; const c = new C();
    const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination);
    o.frequency.value = 880; g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    o.start(); o.stop(c.currentTime + 0.25);
  } catch (e) {}
};

export const ytId = (u) => { const m = String(u || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/); return m ? m[1] : null; };
