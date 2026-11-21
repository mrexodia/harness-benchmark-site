// Tiny optional WebAudio blips. No assets.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slide = 0) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  if (a.state === 'suspended') a.resume();
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

export const Sound = {
  toggle() { muted = !muted; return muted; },
  get muted() { return muted; },
  cast() { tone(320, 0.18, 'triangle', 0.06, 0, 260); },
  splash() { tone(140, 0.14, 'sine', 0.07, 0, -60); },
  bite() { tone(660, 0.1, 'square', 0.06); tone(880, 0.12, 'square', 0.06, 0.09); },
  reel() { tone(220, 0.4, 'sawtooth', 0.04, 0, 120); },
  miss() { tone(200, 0.25, 'sine', 0.06, 0, -90); },
  catch(rarity) {
    const base = { Common: 440, Uncommon: 494, Rare: 554, Epic: 622, Legendary: 740, Ancient: 392 }[rarity] || 440;
    tone(base, 0.12, 'triangle', 0.07);
    tone(base * 1.25, 0.12, 'triangle', 0.07, 0.1);
    tone(base * 1.5, 0.16, 'triangle', 0.07, 0.2);
    if (rarity === 'Legendary' || rarity === 'Ancient') {
      tone(base * 2, 0.3, 'sine', 0.06, 0.32);
      tone(base * 2.5, 0.4, 'sine', 0.05, 0.4);
    }
  },
};
