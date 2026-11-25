let ctx = null;
let timer = null;
let active = false;

function audioContext() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  if (!ctx || ctx.state === "closed") ctx = new C();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function pulse(frequency, duration = 0.35, volume = 0.09) {
  const c = audioContext();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.03);
}

export function startRingtone(kind = "incoming") {
  stopRingtone();
  active = true;
  const ring = () => {
    if (!active) return;
    if (kind === "incoming") {
      pulse(740);
      setTimeout(() => pulse(880), 260);
      setTimeout(() => pulse(740), 520);
    } else {
      pulse(420, 0.6, 0.05);
    }
  };
  ring();
  timer = setInterval(ring, 2200);
  try {
    if (navigator.vibrate) navigator.vibrate([250, 180, 250, 600]);
  } catch (_e) {
    /* ignore */
  }
}

export function stopRingtone() {
  active = false;
  if (timer) clearInterval(timer);
  timer = null;
  try {
    if (navigator.vibrate) navigator.vibrate(0);
  } catch (_e) {
    /* ignore */
  }
}

export function beep(frequency = 880) {
  pulse(frequency, 0.22, 0.07);
}
