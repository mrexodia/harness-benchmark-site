// main.js -- game loop, state machine, input, HUD and reveal.
import { drawScene, initScene, ROD_TIP, ANGLER } from './scene.js';
import { RARITIES, speciesForRarity, spriteFor, shade } from './fish.js';

// ------------------------------------------------------------ constants
const CAST_FLIGHT = 0.55;      // seconds the bobber is in the air
const WAIT_MIN = 2.9;          // shortest bite wait after the cast
const WAIT_MAX = 5.9;          // longest bite wait after the cast
const BITE_WINDOW = 1.7;       // generous reel-in window
const REEL_DURATION = 1.05;    // catch animation length
const REVEAL_INPUT_DELAY = 0.5;

const TIER_STYLE = {
  Common:    { accent: '#a9b6bb', bg: '#16242b', deep: '#101b20', glow: '#7f9298', label: 'COMMON' },
  Uncommon:  { accent: '#5fbf6a', bg: '#12261a', deep: '#0d1c13', glow: '#3f9a4a', label: 'UNCOMMON' },
  Rare:      { accent: '#4aa8e0', bg: '#101f33', deep: '#0b1626', glow: '#2a7ac0', label: 'RARE' },
  Epic:      { accent: '#a86fe0', bg: '#1c1230', deep: '#130c22', glow: '#7a3ac0', label: 'EPIC' },
  Legendary: { accent: '#f0c23a', bg: '#2a1f0a', deep: '#1c1405', glow: '#e0a020', label: 'LEGENDARY' },
  Ancient:   { accent: '#4fe0cf', bg: '#0c2422', deep: '#081a18', glow: '#20b0a0', label: 'ANCIENT' },
};

// ------------------------------------------------------------ rarity
function pickRarity(u) {
  if (u < 0.45) return 'Common';
  if (u < 0.70) return 'Uncommon';
  if (u < 0.85) return 'Rare';
  if (u < 0.93) return 'Epic';
  if (u < 0.98) return 'Legendary';
  return 'Ancient';
}

// ------------------------------------------------------------ state
let phase = 'ready';
let phaseT = 0;
let time = 0;
let missT = 0;
let introT = 7;
let hasCast = false;

let castP = 0;
let castArc = 16;
let castFrom = { x: ROD_TIP.x, y: ROD_TIP.y };
let bobberTarget = { x: 170, y: 140 };
let biteAt = 0;
let biteRemaining = 0;
let reelP = 0;
let catchResult = null;
const catchLog = [];

const view = {
  t: 0, phase: 'ready',
  bobber: { x: ROD_TIP.x, y: ROD_TIP.y, visible: false, landed: false },
  bite: false, biteRemaining: 0, bobberDip: 0,
  casting: false, castP: 0, castArc: 16, castFrom,
  reelP: 0,
};

// ------------------------------------------------------------ actions
function startCast() {
  phase = 'waiting';
  phaseT = 0;
  hasCast = true;
  bobberTarget = { x: 190 + Math.random() * 44, y: 122 + Math.random() * 34 };
  castFrom = { x: ROD_TIP.x, y: ROD_TIP.y };
  castArc = 14 + Math.random() * 8;
  castP = 0;
  reelP = 0;
  catchResult = null;
  biteAt = CAST_FLIGHT + WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
  view.bobber = { x: ROD_TIP.x, y: ROD_TIP.y, visible: true, landed: false };
  view.bite = false;
  view.casting = true;
  view.castP = 0;
  view.castFrom = castFrom;
  view.castArc = castArc;
}

function startReel() {
  phase = 'reeling';
  phaseT = 0;
  reelP = 0;
  view.bite = false;
}

function finishReel() {
  const rarity = window.fishing.pickRarity(Math.random());
  const species = speciesForRarity(rarity, Math.random);
  catchResult = { name: species.name, rarity, species };
  catchLog.unshift({ name: species.name, rarity });
  phase = 'reveal';
  phaseT = 0;
  view.bobber.visible = false;
}

function missBite() {
  phase = 'ready';
  phaseT = 0;
  missT = 1.5;
  view.bite = false;
  view.bobber.visible = false;
}

function act() {
  if (phase === 'ready') startCast();
  else if (phase === 'bite') startReel();
  else if (phase === 'reveal' && phaseT > REVEAL_INPUT_DELAY) startCast();
  // waiting / reeling intentionally ignore input (no overlapping casts)
}

// ------------------------------------------------------------ update
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function update(dt) {
  time += dt;
  phaseT += dt;
  if (missT > 0) missT -= dt;
  if (introT > 0) introT -= dt;

  if (phase === 'waiting') {
    castP = Math.min(1, phaseT / CAST_FLIGHT);
    view.castP = castP;
    if (castP < 1) {
      const p = castP;
      view.bobber.x = castFrom.x + (bobberTarget.x - castFrom.x) * p;
      view.bobber.y = castFrom.y + (bobberTarget.y - castFrom.y) * p - Math.sin(p * Math.PI) * castArc;
      view.bobber.landed = false;
      view.casting = true;
    } else {
      view.casting = false;
      view.bobber.landed = true;
      view.bobber.x = bobberTarget.x;
      view.bobber.y = bobberTarget.y + Math.sin(time * 2.2) * 1.1;
    }
    if (phaseT >= biteAt) {
      phase = 'bite';
      phaseT = 0;
      biteRemaining = BITE_WINDOW;
      view.bite = true;
    }
  } else if (phase === 'bite') {
    biteRemaining -= dt;
    const dip = Math.sin(time * 16) * 1.8 + 1.8;
    view.bobber.x = bobberTarget.x + Math.sin(time * 24) * 0.8;
    view.bobber.y = bobberTarget.y + 2 + dip;
    view.bite = true;
    if (biteRemaining <= 0) missBite();
  } else if (phase === 'reeling') {
    reelP = Math.min(1, phaseT / REEL_DURATION);
    const e = easeInOut(reelP);
    const homeX = ANGLER.x + 2, homeY = ANGLER.y + 4;
    view.bobber.x = bobberTarget.x + (homeX - bobberTarget.x) * e + Math.sin(reelP * Math.PI * 6) * (1 - reelP) * 5;
    view.bobber.y = bobberTarget.y + (homeY - bobberTarget.y) * e + Math.sin(reelP * Math.PI * 4) * (1 - reelP) * 3;
    view.bobber.visible = true;
    view.bobber.landed = true;
    if (reelP >= 1) finishReel();
  }

  // sync the view snapshot
  view.t = time;
  view.phase = phase;
  view.biteRemaining = biteRemaining;
  view.bobberDip = phase === 'bite';
  view.reelP = reelP;
}

// ------------------------------------------------------------ canvas setup
const stage = document.getElementById('stage');
const gameCanvas = document.getElementById('game');
const uiCanvas = document.getElementById('ui');
const g = gameCanvas.getContext('2d');
const u = uiCanvas.getContext('2d');
g.imageSmoothingEnabled = false;

const DPR = Math.min(2, window.devicePixelRatio || 1);
if (DPR !== 1) {
  uiCanvas.width = 1280 * DPR; uiCanvas.height = 720 * DPR;
  uiCanvas.style.width = '1280px'; uiCanvas.style.height = '720px';
  u.setTransform(DPR, 0, 0, DPR, 0, 0);
}

initScene();

function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = s < 1 ? `scale(${s})` : 'scale(1)';
}
window.addEventListener('resize', fit);
fit();

// ------------------------------------------------------------ public API
window.fishing = {
  get state() { return phase; },
  pickRarity,
  get log() { return catchLog; },
};

// ------------------------------------------------------------ input
function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

const BUTTON = { x: 1032, y: 610, w: 224, h: 86 };

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (e.repeat) return;
    act();
  }
});

stage.addEventListener('pointerdown', (e) => {
  const r = stage.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * 1280;
  const y = (e.clientY - r.top) / r.height * 720;
  if (pointIn(BUTTON, x, y)) act();
});

// ------------------------------------------------------------ UI helpers
const FONT = '"Trebuchet MS", Verdana, sans-serif';
const MONO = '"Courier New", monospace';

function panel(c, x, y, w, h, fill, border, top) {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  c.strokeStyle = border; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (top) { c.fillStyle = top; c.fillRect(x + 2, y + 2, w - 4, 3); }
}

function label(c, str, x, y, opts = {}) {
  const { size = 15, color = '#eaf6f2', weight = '400', align = 'left', mono = false, shadow = true, letter = 0 } = opts;
  c.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
  c.textAlign = align; c.textBaseline = 'alphabetic';
  if (shadow) { c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillText(str, x + 1, y + 1); }
  c.fillStyle = color; c.fillText(str, x, y);
  c.textAlign = 'left';
}

function rarityColor(r) { return TIER_STYLE[r].accent; }

// ------------------------------------------------------------ HUD
function drawHUD(c) {
  const t = time;

  // title
  label(c, 'DRIFTWOOD COVE', 24, 44, { size: 26, weight: '700', color: '#f6e9c8', letter: 1 });
  label(c, 'an island fishing spot', 26, 64, { size: 13, color: '#8fb7b4', weight: '400' });

  // status pill
  let status, scol = '#bfe8e0';
  if (phase === 'ready') {
    if (missT > 0) { status = 'It got away... cast again'; scol = '#f0a06a'; }
    else status = 'Press Space or tap CAST to cast your line';
  } else if (phase === 'waiting') { status = 'Line is in the water... wait for a bite'; }
  else if (phase === 'bite') { status = 'BITE!  Reel it in!'; scol = '#ffe14a'; }
  else if (phase === 'reeling') { status = 'Reeling it in...'; scol = '#9fe0ff'; }
  else { status = 'Nice catch!'; scol = '#c8f0a0'; }
  const sw = 470;
  panel(c, 640 - sw / 2, 18, sw, 40, 'rgba(8,20,26,0.72)', '#3f7f8a', phase === 'bite' ? '#ffe14a' : null);
  label(c, status, 640, 44, { size: 17, weight: '700', align: 'center', color: scol });

  // legend (top right)
  const lx = 1000, ly = 18, lw = 258, lh = 182;
  panel(c, lx, ly, lw, lh, 'rgba(8,20,26,0.74)', '#3f7f8a', '#2d5f68');
  label(c, 'RARITY ODDS', lx + 14, ly + 24, { size: 14, weight: '700', color: '#cfe8e4', letter: 1 });
  const odds = { Common: '45%', Uncommon: '25%', Rare: '15%', Epic: '8%', Legendary: '5%', Ancient: '2%' };
  RARITIES.forEach((r, i) => {
    const yy = ly + 44 + i * 22;
    c.fillStyle = rarityColor(r);
    c.fillRect(lx + 14, yy - 9, 11, 11);
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1; c.strokeRect(lx + 14.5, yy - 8.5, 10, 10);
    label(c, r, lx + 34, yy, { size: 15, color: '#dcefeb', weight: '600' });
    label(c, odds[r], lx + lw - 16, yy, { size: 15, color: rarityColor(r), weight: '700', align: 'right', mono: true });
  });

  // catch log (bottom left)
  const gx = 24, gy = 486, gw = 300, gh = 210;
  panel(c, gx, gy, gw, gh, 'rgba(8,20,26,0.74)', '#3f7f8a', '#2d5f68');
  label(c, 'RECENT CATCHES', gx + 14, gy + 24, { size: 14, weight: '700', color: '#cfe8e4', letter: 1 });
  label(c, 'newest first', gx + gw - 14, gy + 24, { size: 11, color: '#5f8f8f', align: 'right' });
  const shown = catchLog.slice(0, 8);
  if (!shown.length) {
    label(c, 'no catches yet — go fish!', gx + 14, gy + 60, { size: 14, color: '#5f8f8f' });
  } else {
    shown.forEach((entry, i) => {
      const yy = gy + 44 + i * 20;
      c.fillStyle = 'rgba(255,255,255,0.04)';
      c.fillRect(gx + 10, yy - 14, gw - 20, 19);
      c.fillStyle = rarityColor(entry.rarity);
      c.fillRect(gx + 14, yy - 12, 9, 9);
      const name = entry.name.length > 24 ? entry.name.slice(0, 23) + '\u2026' : entry.name;
      label(c, name, gx + 30, yy, { size: 14, color: '#e2f2ee' });
      label(c, entry.rarity[0], gx + gw - 16, yy, { size: 13, color: rarityColor(entry.rarity), weight: '700', align: 'right', mono: true });
    });
  }

  // action button (bottom right)
  const b = BUTTON;
  let btnLabel = 'CAST', btnSub = 'Space', active = true, bcol = '#f0c23a';
  if (phase === 'waiting') { btnLabel = 'WAITING'; btnSub = 'hold on'; active = false; bcol = '#5f8f8f'; }
  else if (phase === 'bite') { btnLabel = 'REEL IN!'; btnSub = 'Space'; bcol = '#ff5a4a'; }
  else if (phase === 'reeling') { btnLabel = 'REELING'; btnSub = '...'; active = false; bcol = '#9fe0ff'; }
  else if (phase === 'reveal') {
    if (phaseT < REVEAL_INPUT_DELAY) { btnLabel = 'CAUGHT!'; btnSub = '...'; active = false; bcol = '#a9e08a'; }
    else { btnLabel = 'NEXT CAST'; btnSub = 'Space'; bcol = '#f0c23a'; }
  }
  const pulse = phase === 'bite' ? (0.5 + 0.5 * Math.sin(t * 12)) : 1;
  c.fillStyle = 'rgba(6,16,22,0.82)';
  c.fillRect(b.x, b.y, b.w, b.h);
  c.fillStyle = active ? `rgba(${phase === 'bite' ? '180,40,30' : '20,50,58'},${0.55 + 0.25 * pulse})` : 'rgba(20,40,46,0.6)';
  c.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
  c.strokeStyle = active ? bcol : '#3f5f66';
  c.lineWidth = 3; c.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
  c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.strokeRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
  label(c, btnLabel, b.x + b.w / 2, b.y + 40, { size: 27, weight: '700', align: 'center', color: active ? '#ffffff' : '#9fbfbf', letter: 1 });
  label(c, btnSub, b.x + b.w / 2, b.y + 66, { size: 14, align: 'center', color: '#bcd8d8' });

  // bite window bar (bottom centre)
  if (phase === 'bite') {
    const bw = 420, bx = 640 - bw / 2, by = 650, bh = 24;
    const frac = Math.max(0, biteRemaining / BITE_WINDOW);
    panel(c, bx, by, bw, bh, 'rgba(8,20,26,0.8)', '#8a2a20');
    c.fillStyle = frac > 0.5 ? '#5fd86a' : (frac > 0.25 ? '#f0c23a' : '#ff5a4a');
    c.fillRect(bx + 4, by + 4, (bw - 8) * frac, bh - 8);
    label(c, 'REEL IN!', bx + bw / 2, by + 17, { size: 15, weight: '700', align: 'center', color: '#ffffff', letter: 1 });
  }

  // intro banner
  if (introT > 0 && !hasCast) {
    const a = Math.min(1, introT / 1.2);
    c.save(); c.globalAlpha = a;
    const iw = 620, ix = 640 - iw / 2, iy = 84;
    panel(c, ix, iy, iw, 56, 'rgba(8,20,26,0.86)', '#f0c23a', '#f0c23a');
    label(c, 'Welcome to Driftwood Cove!', 640, iy + 26, { size: 19, weight: '700', align: 'center', color: '#f6e9c8' });
    label(c, 'Press Space (or the CAST button) to cast, then reel in when you see the !', 640, iy + 46, { size: 13, align: 'center', color: '#bfe8e0' });
    c.restore();
  }
}

// ------------------------------------------------------------ reveal card
function emblem(c, kind, x, y, col, s = 1) {
  c.fillStyle = col;
  if (kind === 'leaf') {
    c.fillRect(x, y - 2, 2, 5); c.fillRect(x - 1, y - 3, 2, 2); c.fillRect(x + 1, y - 3, 2, 2);
  } else if (kind === 'spark') {
    c.fillRect(x, y - 3, 1, 7); c.fillRect(x - 3, y, 7, 1);
  } else if (kind === 'star') {
    c.fillRect(x - 3, y, 7, 1); c.fillRect(x, y - 3, 1, 7); c.fillRect(x - 2, y - 2, 5, 5);
  } else if (kind === 'crown') {
    c.fillRect(x - 4, y, 9, 3); c.fillRect(x - 4, y - 3, 2, 4); c.fillRect(x - 1, y - 4, 2, 5); c.fillRect(x + 2, y - 3, 2, 4);
  } else if (kind === 'rune') {
    c.fillRect(x - 2, y - 3, 4, 1); c.fillRect(x - 2, y - 3, 1, 6); c.fillRect(x + 1, y - 3, 1, 6); c.fillRect(x - 2, y + 2, 4, 1);
  } else {
    c.fillRect(x - 1, y - 1, 3, 3);
  }
}

function drawReveal(c) {
  if (phase !== 'reveal' || !catchResult) return;
  const res = catchResult;
  const st = TIER_STYLE[res.rarity];
  const t = time;
  const app = Math.min(1, phaseT / 0.4);
  const ease = 1 - Math.pow(1 - app, 3);

  c.fillStyle = `rgba(3,8,12,${0.5 * ease})`;
  c.fillRect(0, 0, 1280, 720);

  const w = 700, h = 420, x = 640 - w / 2, y = 140;
  const cx = 640, cyy = y + h / 2;

  c.save();
  c.globalAlpha = ease;
  c.translate(cx, cyy); c.scale(0.86 + 0.14 * ease, 0.86 + 0.14 * ease); c.translate(-cx, -cyy);

  // card background
  const grd = c.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, st.bg); grd.addColorStop(1, st.deep);
  c.fillStyle = grd; c.fillRect(x, y, w, h);

  // effect layer clipped to card
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();

  if (res.rarity === 'Epic' || res.rarity === 'Legendary') {
    // rotating rays behind the fish
    const rot = t * (res.rarity === 'Legendary' ? 0.5 : 0.35);
    const rays = res.rarity === 'Legendary' ? 16 : 12;
    c.save(); c.translate(cx, y + 210);
    for (let i = 0; i < rays; i++) {
      c.rotate((Math.PI * 2) / rays);
      c.globalAlpha = 0.10 + 0.05 * Math.sin(t * 2 + i);
      c.fillStyle = st.accent;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(300, -26); c.lineTo(300, 26); c.closePath(); c.fill();
    }
    c.restore(); c.globalAlpha = 1;
  }
  if (res.rarity === 'Ancient') {
    // concentric rune rings
    c.save(); c.globalAlpha = 0.5;
    for (let ring = 0; ring < 2; ring++) {
      const rr = 120 + ring * 42;
      c.strokeStyle = st.accent; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, y + 205, rr, 0, Math.PI * 2); c.stroke();
      const n = 10 + ring * 4;
      for (let i = 0; i < n; i++) {
        const a = t * (0.15 + ring * 0.08) * (ring ? -1 : 1) + (i / n) * Math.PI * 2;
        emblem(c, 'rune', cx + Math.cos(a) * rr, y + 205 + Math.sin(a) * rr, st.accent);
      }
    }
    c.restore(); c.globalAlpha = 1;
  }

  // inner glow
  const gg = c.createRadialGradient(cx, y + 205, 20, cx, y + 205, 300);
  gg.addColorStop(0, st.glow + '55'); gg.addColorStop(1, 'transparent');
  c.fillStyle = gg; c.fillRect(x, y, w, h);

  // the fish
  const sp = spriteFor(res.species);
  if (sp) {
    const sc = 5;
    const dw = sp.width * sc, dh = sp.height * sc;
    const bob = Math.sin(t * 1.6) * 4;
    // shadow
    c.globalAlpha = 0.25; c.fillStyle = '#000';
    c.beginPath(); c.ellipse(cx, y + 300, dw * 0.34, 14, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    // aura for high tiers
    if (res.rarity === 'Legendary' || res.rarity === 'Ancient' || res.rarity === 'Epic') {
      c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
      c.shadowColor = st.accent; c.shadowBlur = 34;
      c.drawImage(sp, cx - dw / 2, y + 205 - dh / 2 + bob);
      c.restore();
    }
    c.imageSmoothingEnabled = false;
    c.drawImage(sp, cx - dw / 2, y + 205 - dh / 2 + bob, dw, dh);
  }

  // vignette
  const vg = c.createRadialGradient(cx, cyy, 120, cx, cyy, 480);
  vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = vg; c.fillRect(x, y, w, h);
  c.restore(); // clip

  // particles / ornaments per tier
  drawTierDecor(c, res.rarity, st, x, y, w, h, t);

  // frame
  drawFrame(c, res.rarity, st, x, y, w, h, t);

  // rarity banner
  const bw = 260, bx = cx - bw / 2, byy = y + 24;
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(bx, byy, bw, 34);
  c.strokeStyle = st.accent; c.lineWidth = 2; c.strokeRect(bx, byy, bw, 34);
  const em = res.rarity === 'Ancient' ? 'rune' : res.rarity === 'Legendary' ? 'crown' : res.rarity === 'Epic' ? 'star' : res.rarity === 'Rare' ? 'spark' : res.rarity === 'Uncommon' ? 'leaf' : 'dot';
  emblem(c, em, cx - 74, byy + 17, st.accent);
  emblem(c, em, cx + 74, byy + 17, st.accent);
  label(c, st.label, cx, byy + 25, { size: 22, weight: '700', align: 'center', color: st.accent, letter: 4 });

  // fish name
  label(c, res.name, cx, y + 388, { size: 34, weight: '700', align: 'center', color: '#ffffff' });

  // continue hint
  const hintA = phaseT > REVEAL_INPUT_DELAY ? 0.65 + 0.35 * Math.sin(t * 4) : 0.3;
  c.globalAlpha = hintA;
  label(c, 'Press Space or CAST for the next cast', cx, y + 414, { size: 15, align: 'center', color: '#cfe8e4' });
  c.globalAlpha = 1;

  c.restore(); // transform
}

function drawFrame(c, rarity, st, x, y, w, h, t) {
  c.strokeStyle = st.accent; c.lineWidth = 3; c.strokeRect(x + 2, y + 2, w - 4, h - 4);
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1; c.strokeRect(x + 6, y + 6, w - 12, h - 12);

  const corner = (cxx, cyy, sx, sy) => {
    c.strokeStyle = st.accent; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cxx, cyy + sy * 26); c.lineTo(cxx, cyy); c.lineTo(cxx + sx * 26, cyy); c.stroke();
  };
  corner(x + 10, y + 10, 1, 1); corner(x + w - 10, y + 10, -1, 1);
  corner(x + 10, y + h - 10, 1, -1); corner(x + w - 10, y + h - 10, -1, -1);

  if (rarity === 'Ancient') {
    // stone blocks along the frame
    for (let i = 0; i < w; i += 34) {
      c.fillStyle = i % 68 === 0 ? '#5a6660' : '#48524e';
      c.fillRect(x + 4 + i, y + 2, 28, 7);
      c.fillRect(x + 4 + i + 12, y + h - 9, 28, 7);
    }
    for (let i = 0; i < h; i += 30) {
      c.fillStyle = i % 60 === 0 ? '#5a6660' : '#48524e';
      c.fillRect(x + 2, y + 6 + i, 7, 24);
      c.fillRect(x + w - 9, y + 6 + i, 7, 24);
    }
    // moss
    c.fillStyle = '#3f7a45';
    for (let i = 0; i < 26; i++) {
      const mx = x + 6 + ((i * 83) % (w - 12));
      const my = y + 3 + ((i * 47) % 8);
      c.fillRect(mx, my, 2, 2);
    }
  } else if (rarity === 'Legendary') {
    // gold studs
    c.fillStyle = '#fff2b0';
    for (let i = 0; i < w; i += 40) { c.fillRect(x + 12 + i, y + 6, 4, 4); c.fillRect(x + 24 + i, y + h - 12, 4, 4); }
  } else if (rarity === 'Epic') {
    // angular inner brackets
    c.strokeStyle = st.accent; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 30, y + 16); c.lineTo(x + 16, y + 16); c.lineTo(x + 16, y + 30); c.stroke();
    c.beginPath(); c.moveTo(x + w - 30, y + 16); c.lineTo(x + w - 16, y + 16); c.lineTo(x + w - 16, y + 30); c.stroke();
    c.beginPath(); c.moveTo(x + 30, y + h - 16); c.lineTo(x + 16, y + h - 16); c.lineTo(x + 16, y + h - 30); c.stroke();
    c.beginPath(); c.moveTo(x + w - 30, y + h - 16); c.lineTo(x + w - 16, y + h - 16); c.lineTo(x + w - 16, y + h - 30); c.stroke();
  } else if (rarity === 'Rare') {
    // moving dash border
    c.strokeStyle = '#bfe8ff'; c.lineWidth = 1;
    for (let i = 0; i < w; i += 16) {
      const a = (Math.sin(t * 3 + i * 0.2) + 1) * 0.5;
      c.globalAlpha = 0.3 + a * 0.5;
      c.fillStyle = '#dff2ff';
      c.fillRect(x + 8 + i, y + 8, 6, 1);
      c.fillRect(x + 8 + i, y + h - 9, 6, 1);
    }
    c.globalAlpha = 1;
  }
}

function drawTierDecor(c, rarity, st, x, y, w, h, t) {
  if (rarity === 'Common') return;
  if (rarity === 'Uncommon') {
    // drifting leaves
    for (let i = 0; i < 7; i++) {
      const px0 = x + 30 + ((i * 127 + t * 12) % (w - 60));
      const py0 = y + h - 20 - ((t * 16 + i * 60) % (h - 40));
      c.globalAlpha = 0.5;
      emblem(c, 'leaf', px0, py0, st.accent);
      c.globalAlpha = 1;
    }
  } else if (rarity === 'Rare') {
    for (let i = 0; i < 12; i++) {
      const a = t * 0.8 + i * 1.7;
      const px0 = 640 + Math.cos(a) * (150 + (i % 4) * 45);
      const py0 = y + 210 + Math.sin(a * 1.3) * (110 + (i % 3) * 20);
      const s = 0.5 + 0.5 * Math.sin(t * 4 + i);
      c.globalAlpha = 0.35 + s * 0.45;
      emblem(c, 'spark', px0, py0, '#dff2ff');
      c.globalAlpha = 1;
    }
  } else if (rarity === 'Epic') {
    // orbiting sparks
    for (let i = 0; i < 16; i++) {
      const a = t * 1.1 + (i / 16) * Math.PI * 2;
      const rr = 190 + Math.sin(t * 2 + i) * 22;
      const px0 = 640 + Math.cos(a) * rr;
      const py0 = y + 210 + Math.sin(a) * rr * 0.6;
      c.globalAlpha = 0.6;
      emblem(c, 'star', px0, py0, st.accent, 1);
      c.globalAlpha = 1;
    }
  } else if (rarity === 'Legendary') {
    // confetti
    for (let i = 0; i < 34; i++) {
      const px0 = x + 20 + ((i * 89 + t * 30) % (w - 40));
      const py0 = y + 20 + ((i * 53 + t * 60) % (h - 40));
      const cols = ['#f0c23a', '#fff2b0', '#ff9a3a', '#7ac0a0'];
      c.globalAlpha = 0.7;
      c.fillStyle = cols[i % 4];
      c.fillRect(px0, py0, 3, 3);
      c.globalAlpha = 1;
    }
    // crown above fish
    c.save(); c.globalAlpha = 0.9;
    emblem(c, 'crown', 640, y + 120 + Math.sin(t * 2) * 3, '#f0c23a');
    c.restore();
  } else if (rarity === 'Ancient') {
    for (let i = 0; i < 14; i++) {
      const px0 = x + 40 + ((i * 111 + t * 8) % (w - 80));
      const py0 = y + 40 + ((i * 61 - t * 14 + h) % (h - 80));
      c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + i);
      emblem(c, 'rune', px0, py0, st.accent);
      c.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------ loop
let last = performance.now();
let rafT = 0;

function frame(now) {
  const dtRaw = (now - last) / 1000;
  last = now;
  const dt = Math.min(dtRaw, 1 / 30);
  if (!document.hidden) {
    update(dt);
    rafT += dt;
  }
  drawScene(g, view);
  u.clearRect(0, 0, 1280, 720);
  drawHUD(u);
  drawReveal(u);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  last = performance.now();
});
