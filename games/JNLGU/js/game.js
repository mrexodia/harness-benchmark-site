// game.js — Tidewater Cove. State machine, input, HUD and test interface.
import { pickRarity, pickFish, drawFish, RARITIES, RARITY_INFO, hexA } from './fish.js';
import { drawScene, GEO } from './scene.js';
import { drawText, drawTextShadow, textWidth } from './font.js';

const SW = 320, SH = 180, SCL = 4, VW = SW * SCL, VH = SH * SCL;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const sceneCanvas = document.createElement('canvas');
sceneCanvas.width = SW; sceneCanvas.height = SH;
const sctx = sceneCanvas.getContext('2d');
sctx.imageSmoothingEnabled = false;

// Fish portrait buffer. Wide enough that fins/tails/lure are never clipped.
const FISH_W = 128, FISH_H = 88;
const fishCanvas = document.createElement('canvas');
fishCanvas.width = FISH_W; fishCanvas.height = FISH_H;
const fctx = fishCanvas.getContext('2d');

const T = { CAST: 0.45, WAIT_MIN: 1.3, WAIT_MAX: 3.3, BITE: 1.15, REEL: 1.25, MISS: 0.7, REVEAL: 2.3 };

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// --- game state -------------------------------------------------------------
const S = {
  state: 'ready',       // ready | waiting | bite | reeling | reveal
  phaseT: 0,
  clock: 0,
  casting: false,
  castProgress: 0,
  castFrom: { x: GEO.rodTipRest.x, y: GEO.rodTipRest.y },
  castTarget: { x: 210, y: 98 },
  waitT: 0,
  biteDip: 0,
  bobberSub: 0,
  splashT: 0,
  lineVisible: false,
  miss: false,
  bobber: { x: GEO.rodTipRest.x, y: GEO.rodTipRest.y },
  result: null,
  log: [],
  recent: [],
  fishT: 0,
  intro: 7,
  flash: 0,
};

// --- test interface ---------------------------------------------------------
const fishing = {
  pickRarity,           // pure; game calls this through the object
  log: S.log,           // full session log, newest first (same reference)
};
Object.defineProperty(fishing, 'state', {
  enumerable: true,
  get() { return S.state; },
});
window.fishing = fishing;

// --- state transitions ------------------------------------------------------
function toReady() {
  S.state = 'ready'; S.phaseT = 0;
  S.casting = false; S.lineVisible = false; S.miss = false; S.result = null;
  S.bobberSub = 0; S.biteDip = 0;
  S.bobber = { x: GEO.rodTipRest.x, y: GEO.rodTipRest.y };
}

function startCast() {
  S.state = 'waiting'; S.phaseT = 0;
  S.casting = true; S.castProgress = 0; S.miss = false; S.result = null;
  S.lineVisible = true; S.biteDip = 0; S.bobberSub = 0;
  S.castFrom = { x: GEO.rodTipRest.x, y: GEO.rodTipRest.y };
  S.castTarget = {
    x: GEO.castZone.xMin + Math.random() * (GEO.castZone.xMax - GEO.castZone.xMin),
    y: GEO.castZone.yMin + Math.random() * (GEO.castZone.yMax - GEO.castZone.yMin),
  };
  S.bobber = { x: S.castFrom.x, y: S.castFrom.y };
  S.waitT = 0;
}

function enterBite() {
  S.state = 'bite'; S.phaseT = 0; S.biteDip = 0; S.splashT = 1;
}

function enterMiss() {
  S.state = 'reeling'; S.phaseT = 0; S.miss = true; S.splashT = 0.6;
}

function onHook() {
  S.state = 'reeling'; S.phaseT = 0; S.miss = false; S.splashT = 1;
  // Required: choose the rarity by calling through the exposed object.
  const rarity = window.fishing.pickRarity(Math.random());
  const fish = pickFish(rarity);
  S.result = { fish, rarity };
  S.log.unshift({ name: fish.name, rarity });
  S.recent.unshift({ name: fish.name, rarity });
  if (S.recent.length > 8) S.recent.length = 8;
}

function enterReveal() {
  S.state = 'reveal'; S.phaseT = 0; S.fishT = 0;
  S.lineVisible = false; S.bobberSub = 0; S.splashT = 0;
}

// --- input ------------------------------------------------------------------
function action() {
  if (S.state === 'ready') startCast();
  else if (S.state === 'bite') onHook();
  else if (S.state === 'reveal' && S.phaseT > 0.45) toReady();
}

const BTN = { x: 1180, y: 648, r: 54 };
let btnHover = false;

function canvasCoords(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (VW / r.width),
    y: (e.clientY - r.top) * (VH / r.height),
  };
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) action();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = canvasCoords(e);
  const d = Math.hypot(p.x - BTN.x, p.y - BTN.y);
  if (d <= BTN.r + 6) action();
});
canvas.addEventListener('pointermove', (e) => {
  const p = canvasCoords(e);
  btnHover = Math.hypot(p.x - BTN.x, p.y - BTN.y) <= BTN.r + 6;
  canvas.style.cursor = btnHover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { btnHover = false; });

function resize() {
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  canvas.style.width = Math.round(VW * s) + 'px';
  canvas.style.height = Math.round(VH * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

// --- update -----------------------------------------------------------------
function update(dt) {
  S.clock += dt;
  S.phaseT += dt;
  if (S.intro > 0) S.intro -= dt;
  if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.5);
  if (S.splashT > 0) S.splashT = Math.max(0, S.splashT - dt * 1.5);

  switch (S.state) {
    case 'waiting': updateWaiting(dt); break;
    case 'bite': updateBite(dt); break;
    case 'reeling': updateReeling(dt); break;
    case 'reveal': updateReveal(dt); break;
  }
}

function updateWaiting(dt) {
  if (S.casting) {
    S.castProgress += dt / T.CAST;
    const p = clamp(S.castProgress, 0, 1);
    const arc = Math.sin(p * Math.PI) * 24;
    S.bobber.x = lerp(S.castFrom.x, S.castTarget.x, p);
    S.bobber.y = lerp(S.castFrom.y, S.castTarget.y, p) - arc;
    if (S.castProgress >= 1) {
      S.casting = false; S.castProgress = 1;
      S.bobber = { x: S.castTarget.x, y: S.castTarget.y };
      S.splashT = 0.7;
      S.waitT = T.WAIT_MIN + Math.random() * (T.WAIT_MAX - T.WAIT_MIN);
    }
  } else {
    S.waitT -= dt;
    if (S.waitT <= 0) enterBite();
  }
}

function updateBite() {
  S.biteDip = 3 + Math.sin(S.phaseT * 22) * 1.7;
  S.bobberSub = S.biteDip * 0.6;
  if (S.phaseT >= T.BITE) enterMiss();
}

function updateReeling() {
  const dur = S.miss ? T.MISS : T.REEL;
  const p = clamp(S.phaseT / dur, 0, 1);
  const end = { x: GEO.rodTipRest.x - 6, y: GEO.rodTipRest.y + 10 };
  if (S.miss) {
    S.bobber.x = lerp(S.castTarget.x, end.x, p);
    S.bobber.y = lerp(S.castTarget.y, end.y, p);
    S.bobberSub = 0;
  } else {
    const e = p * p;
    S.bobber.x = lerp(S.castTarget.x, end.x, e);
    S.bobber.y = lerp(S.castTarget.y, end.y, e) + Math.sin(S.phaseT * 34) * 1.4;
    S.bobberSub = 1.5 * (1 - p);
  }
  if (p >= 1) { if (S.miss) toReady(); else enterReveal(); }
}

function updateReveal() {
  S.fishT = S.phaseT;
  if (S.phaseT >= T.REVEAL) toReady();
}

// --- scene flourish ---------------------------------------------------------
function drawReelFlourish(g) {
  if (S.state !== 'reeling' || S.miss || !S.result) return;
  const b = S.bobber;
  const th = Math.sin(S.clock * 26) * 0.5 + Math.sin(S.clock * 17) * 0.2;
  g.save();
  g.translate(Math.round(b.x), Math.round(b.y) + 3);
  g.rotate(th * 0.5);
  g.fillStyle = '#1c2a33';
  g.beginPath();
  g.ellipse(0, 0, 8, 3.4, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(-7, 0);
  g.lineTo(-13, -4 + th * 3);
  g.lineTo(-11, 0);
  g.lineTo(-13, 4 + th * 3);
  g.closePath();
  g.fill();
  g.fillStyle = hexA(S.result.fish.base, 0.9);
  g.beginPath();
  g.ellipse(1, -0.6, 5, 2.2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // droplets
  for (let i = 0; i < 6; i++) {
    const a = S.clock * 9 + i;
    g.fillStyle = 'rgba(232,248,241,0.8)';
    g.fillRect(Math.round(b.x + Math.cos(a) * 9), Math.round(b.y + Math.sin(a) * 4 - 3), 1, 1);
  }
}

// --- HUD helpers ------------------------------------------------------------
function panel(x, y, w, h, alpha = 0.84) {
  ctx.fillStyle = `rgba(9,16,24,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(90,130,160,0.30)';
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = 'rgba(5,9,14,0.8)';
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.strokeStyle = 'rgba(120,165,195,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // corner ticks
  ctx.fillStyle = 'rgba(180,215,235,0.55)';
  ctx.fillRect(x, y, 3, 3);
  ctx.fillRect(x + w - 3, y, 3, 3);
  ctx.fillRect(x, y + h - 3, 3, 3);
  ctx.fillRect(x + w - 3, y + h - 3, 3, 3);
}

function rarityDot(x, y, rarity, size = 7) {
  const info = RARITY_INFO[rarity];
  ctx.fillStyle = info.deep;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = info.color;
  ctx.fillRect(x, y, size - 2, size - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(x + 1, y + 1, 2, 2);
}

function drawLogPanel() {
  const x = 12, y = 10, w = 300, h = 196;
  panel(x, y, w, h);
  drawText(ctx, 'TIDEWATER COVE', x + 12, y + 10, 2, '#ffe6a8');
  drawText(ctx, '- RECENT CATCHES -', x + 12, y + 32, 1, '#8fb0c4');
  const rows = S.recent;
  if (rows.length === 0) {
    drawText(ctx, 'NO CATCHES YET', x + w / 2, y + 92, 1, '#5f7d90', 'center');
    drawText(ctx, 'CAST A LINE IN', x + w / 2, y + 108, 1, '#5f7d90', 'center');
  } else {
    for (let i = 0; i < rows.length; i++) {
      const e = rows[i];
      const ry = y + 52 + i * 17;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.0)';
      ctx.fillRect(x + 6, ry - 2, w - 12, 16);
      rarityDot(x + 10, ry + 2, e.rarity, 7);
      let name = e.name.toUpperCase();
      if (name.length > 17) name = name.slice(0, 16) + '.';
      drawText(ctx, name, x + 24, ry + 1, 2, '#e6eef4');
      drawText(ctx, e.rarity.toUpperCase(), x + w - 10, ry + 5, 1, RARITY_INFO[e.rarity].color, 'right');
    }
  }
}

function drawLegendPanel() {
  const w = 226, h = 152, x = VW - 12 - w, y = 10;
  panel(x, y, w, h);
  drawText(ctx, 'RARITY ODDS', x + 12, y + 10, 2, '#ffe6a8');
  RARITIES.forEach((r, i) => {
    const ry = y + 36 + i * 18;
    rarityDot(x + 12, ry + 2, r, 8);
    drawText(ctx, r.toUpperCase(), x + 28, ry + 1, 2, RARITY_INFO[r].color);
    drawText(ctx, RARITY_INFO[r].odds, x + w - 12, ry + 4, 1, '#cfe0ea', 'right');
  });
}

function drawButton() {
  const actionable = S.state === 'ready' || S.state === 'bite' ||
    (S.state === 'reveal' && S.phaseT > 0.45);
  const pulse = actionable ? 0.5 + 0.5 * Math.sin(S.clock * (S.state === 'bite' ? 14 : 3)) : 0;
  const col = S.state === 'bite' ? '#ff6a4d' : '#ffcf72';

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.arc(BTN.x, BTN.y + 5, BTN.r, 0, Math.PI * 2); ctx.fill();

  // base disc
  ctx.fillStyle = '#1a2836';
  ctx.beginPath(); ctx.arc(BTN.x, BTN.y, BTN.r, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(BTN.x - 12, BTN.y - 16, 6, BTN.x, BTN.y, BTN.r);
  grad.addColorStop(0, S.state === 'bite' ? '#d94a34' : '#3a6f8a');
  grad.addColorStop(1, '#14202c');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(BTN.x, BTN.y, BTN.r - 4, 0, Math.PI * 2); ctx.fill();

  // ring
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.globalAlpha = actionable ? 0.7 + 0.3 * pulse : 0.35;
  ctx.beginPath(); ctx.arc(BTN.x, BTN.y, BTN.r - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;

  if (btnHover && actionable) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(BTN.x, BTN.y, BTN.r + 3, 0, Math.PI * 2); ctx.stroke();
  }

  const label = S.state === 'bite' ? 'REEL!' :
    S.state === 'ready' ? 'CAST' :
    S.state === 'waiting' ? 'WAIT' :
    S.state === 'reeling' ? '...' : 'NEXT';
  const lc = actionable ? '#ffffff' : '#7c93a5';
  drawTextShadow(ctx, label, BTN.x, BTN.y - 14, 3, lc, 'rgba(0,0,0,0.7)', 'center');
  if (S.state === 'ready') drawTextShadow(ctx, 'OR SPACE', BTN.x, BTN.y + 14, 1, '#cfe0ea', 'rgba(0,0,0,0.7)', 'center');
  else if (S.state === 'bite') drawTextShadow(ctx, 'NOW!', BTN.x, BTN.y + 14, 1, '#ffd9cf', 'rgba(0,0,0,0.7)', 'center');
}

function drawHints() {
  let line1 = '', line2 = '';
  if (S.state === 'ready') { line1 = 'SPACE OR BUTTON TO CAST'; line2 = 'CATCH THE BITE IN TIME'; }
  else if (S.state === 'waiting') { line1 = 'WAIT FOR A BITE...'; line2 = 'WATCH THE BOBBER'; }
  else if (S.state === 'bite') { line1 = 'REEL IT IN!'; line2 = 'PRESS SPACE / REEL BUTTON'; }
  else if (S.state === 'reeling') { line1 = S.miss ? 'IT GOT AWAY...' : 'REELING!'; line2 = S.miss ? 'TRY ANOTHER CAST' : ''; }
  else if (S.state === 'reveal') { line1 = 'CAUGHT!'; line2 = 'PRESS FOR NEXT CAST'; }
  drawTextShadow(ctx, line1, 18, 662, 2, '#eef5fa', 'rgba(0,0,0,0.8)');
  if (line2) drawTextShadow(ctx, line2, 18, 686, 1, '#a9c2d2', 'rgba(0,0,0,0.8)');
}

function drawBiteMeter() {
  if (S.state !== 'bite') return;
  const w = 360, h = 20, x = (VW - w) / 2, y = 566;
  const p = clamp(S.phaseT / T.BITE, 0, 1);
  ctx.fillStyle = 'rgba(8,14,20,0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ff8a6a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  const fillW = (w - 8) * (1 - p);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#ffcf72');
  grad.addColorStop(1, '#ff5a3c');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 4, y + 4, fillW, h - 8);
  drawTextShadow(ctx, 'BITE WINDOW', x + w / 2, y - 16, 2, '#ffd9cf', 'rgba(0,0,0,0.8)', 'center');
  // flashing frame
  const a = 0.25 + 0.25 * Math.sin(S.clock * 16);
  ctx.strokeStyle = `rgba(255,90,60,${a})`;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, VW - 6, VH - 6);
}

// --- reveal -----------------------------------------------------------------
function sparkle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.3, y - r * 0.3);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.3, y + r * 0.3);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.3, y + r * 0.3);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.3, y - r * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawRevealAura(rarity, px, py, pw, ph, t) {
  const info = RARITY_INFO[rarity];
  const cx = px + pw / 2, cy = py + ph / 2;
  if (rarity === 'Common') return;

  if (rarity === 'Rare' || rarity === 'Legendary' || rarity === 'Epic') {
    const count = rarity === 'Legendary' ? 16 : 10;
    const len = rarity === 'Legendary' ? 620 : 420;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * (rarity === 'Legendary' ? 0.18 : 0.25));
    ctx.strokeStyle = hexA(info.color, 0.16);
    ctx.lineWidth = rarity === 'Legendary' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (rarity === 'Ancient') {
    ctx.save();
    ctx.translate(cx, cy);
    const R = 290;
    ctx.rotate(-t * 0.12);
    ctx.strokeStyle = hexA(info.color, 0.22);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([10, 16]);
    ctx.beginPath(); ctx.arc(0, 0, R - 26, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = hexA(info.color, 0.3);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r1 = R - 6, r2 = R + (i % 2 ? 4 : 12);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (rarity === 'Epic') {
    const pulse = 0.10 + 0.08 * (0.5 + 0.5 * Math.sin(t * 2.4));
    const g2 = ctx.createRadialGradient(cx, cy, 60, cx, cy, 360);
    g2.addColorStop(0, hexA(info.color, pulse * 2));
    g2.addColorStop(1, hexA(info.color, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, VW, VH);
  }
}

function drawRarityFrame(rarity, px, py, pw, ph, t) {
  const info = RARITY_INFO[rarity];
  const cx = px + pw / 2, cy = py + ph / 2;
  const color = info.color;

  // panel body
  ctx.fillStyle = 'rgba(8,14,22,0.96)';
  ctx.fillRect(px, py, pw, ph);
  const bg = ctx.createLinearGradient(px, py, px, py + ph);
  bg.addColorStop(0, hexA(color, 0.10));
  bg.addColorStop(0.5, hexA(color, 0.02));
  bg.addColorStop(1, hexA(color, 0.14));
  ctx.fillStyle = bg;
  ctx.fillRect(px, py, pw, ph);

  // border(s)
  ctx.strokeStyle = color;
  ctx.lineWidth = rarity === 'Legendary' ? 4 : 3;
  ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
  ctx.strokeStyle = hexA(color, 0.4);
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 8.5, py + 8.5, pw - 17, ph - 17);

  if (rarity === 'Common') {
    ctx.fillStyle = hexA(color, 0.5);
    for (const [qx, qy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
      ctx.fillRect(qx - 5, qy - 2, 10, 4);
      ctx.fillRect(qx - 2, qy - 5, 4, 10);
    }
  } else if (rarity === 'Uncommon') {
    ctx.fillStyle = info.color;
    for (const [qx, qy, sx, sy] of [[px + 4, py + 4, 1, 1], [px + pw - 4, py + 4, -1, 1], [px + 4, py + ph - 4, 1, -1], [px + pw - 4, py + ph - 4, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.quadraticCurveTo(qx + 18 * sx, qy + 4 * sy, qx + 8 * sx, qy + 16 * sy);
      ctx.quadraticCurveTo(qx + 2 * sx, qy + 6 * sy, qx, qy);
      ctx.fill();
    }
  } else if (rarity === 'Rare') {
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + (i / 6) * Math.PI * 2;
      const sx = cx + Math.cos(a) * (pw / 2 + 26);
      const sy = cy + Math.sin(a) * (ph / 2 + 26);
      sparkle(sx, sy, 5 + Math.sin(t * 4 + i) * 2, hexA(color, 0.9));
    }
  } else if (rarity === 'Epic') {
    for (let i = 0; i < 4; i++) {
      const a = t * 0.9 + (i / 4) * Math.PI * 2;
      const sx = cx + Math.cos(a) * (pw / 2 - 6);
      const sy = cy + Math.sin(a) * (ph / 2 - 6);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + t);
      ctx.fillStyle = hexA('#d9b3ff', 0.9);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#3a1c5e';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  } else if (rarity === 'Legendary') {
    // crown marks
    ctx.fillStyle = '#ffe08a';
    for (const cxx of [px + 40, px + pw - 40]) {
      ctx.beginPath();
      ctx.moveTo(cxx - 16, py + 2);
      ctx.lineTo(cxx - 8, py - 12);
      ctx.lineTo(cxx, py - 2);
      ctx.lineTo(cxx + 8, py - 14);
      ctx.lineTo(cxx + 16, py + 2);
      ctx.closePath();
      ctx.fill();
    }
    // rising stars
    for (let i = 0; i < 10; i++) {
      const sx = px + 20 + ((i * 53) % (pw - 40));
      const sy = py + ph - ((t * 40 + i * 47) % (ph + 40)) + 20;
      sparkle(sx, sy, 4, hexA('#ffe9a8', 0.85));
    }
  } else if (rarity === 'Ancient') {
    // inner dark obsidian
    ctx.fillStyle = 'rgba(6,22,24,0.6)';
    ctx.fillRect(px + 10, py + 10, pw - 20, ph - 20);
    // corner glyphs
    ctx.strokeStyle = hexA('#7ff0e0', 0.8);
    ctx.lineWidth = 2;
    for (const [qx, qy] of [[px + 18, py + 18], [px + pw - 18, py + 18], [px + 18, py + ph - 18], [px + pw - 18, py + ph - 18]]) {
      ctx.beginPath(); ctx.arc(qx, qy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(qx - 3, qy); ctx.lineTo(qx + 3, qy);
      ctx.moveTo(qx, qy - 3); ctx.lineTo(qx, qy + 3);
      ctx.stroke();
    }
    // glyph ticks along top/bottom
    ctx.fillStyle = hexA('#7ff0e0', 0.55);
    for (let i = 0; i < 16; i++) {
      const gx = px + 24 + i * ((pw - 48) / 15);
      const flick = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + i));
      ctx.globalAlpha = flick * 0.7;
      ctx.fillRect(gx, py + 6, 2, 4);
      ctx.fillRect(gx, py + ph - 10, 2, 4);
      ctx.globalAlpha = 1;
    }
    // rising motes
    for (let i = 0; i < 14; i++) {
      const sx = px + 20 + ((i * 71) % (pw - 40));
      const sy = py + ph - ((t * 26 + i * 37) % (ph + 30)) + 12;
      ctx.fillStyle = hexA('#7ff0e0', 0.7);
      ctx.fillRect(sx, sy, 2, 3);
    }
  }

  // shimmer sweep for rare+
  if (rarity !== 'Common' && rarity !== 'Uncommon') {
    const sweep = ((t * 0.5) % 1.6 - 0.3) * pw;
    const gg = ctx.createLinearGradient(px + sweep - 60, py, px + sweep + 60, py);
    gg.addColorStop(0, hexA(color, 0));
    gg.addColorStop(0.5, hexA(color, 0.16));
    gg.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
  }
}

function drawReveal() {
  const { fish, rarity } = S.result;
  const info = RARITY_INFO[rarity];
  const t = S.fishT;
  const px = 410, py = 195, pw = 460, ph = 330;
  const fishCy = py + 122;
  const PORTRAIT_SCALE = 2;

  ctx.fillStyle = 'rgba(4,8,14,0.72)';
  ctx.fillRect(0, 0, VW, VH);

  drawRevealAura(rarity, px, py, pw, ph, t);
  drawRarityFrame(rarity, px, py, pw, ph, t);

  // heading
  const heading = rarity === 'Ancient' ? 'ANCIENT CATCH' :
    rarity === 'Legendary' ? 'LEGENDARY CATCH' :
    rarity === 'Epic' ? 'EPIC CATCH' : 'YOU CAUGHT';
  drawText(ctx, heading, 640, py + 22, 2, hexA(info.color, 0.95), 'center');

  // fish portrait (fit each species so nothing is clipped)
  const tailLen = fish.len * 0.28 + 4;
  const needW = fish.len + 2 * tailLen + 10;
  const needH = fish.height * 1.6 + 26;
  const fit = Math.min(1, (FISH_W - 10) / needW, (FISH_H - 10) / needH);
  fctx.clearRect(0, 0, FISH_W, FISH_H);
  drawFish(fctx, fish, FISH_W / 2, FISH_H / 2 + 3, t, fit);
  const fw = FISH_W * PORTRAIT_SCALE, fh = FISH_H * PORTRAIT_SCALE;
  ctx.drawImage(fishCanvas, 0, 0, FISH_W, FISH_H, 640 - fw / 2, fishCy - fh / 2, fw, fh);

  // name plate
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(px + 36, py + 224, pw - 72, 44);
  ctx.strokeStyle = hexA(info.color, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 36.5, py + 224.5, pw - 73, 43);
  drawTextShadow(ctx, fish.name, 640, py + 236, 3, '#ffffff', 'rgba(0,0,0,0.8)', 'center');

  // rarity word + odds
  drawText(ctx, rarity.toUpperCase(), 640, py + 280, 2, info.color, 'center');
  drawText(ctx, RARITY_INFO[rarity].odds + ' ODDS', 640, py + 302, 1, '#9fb6c6', 'center');
}

// --- frame ------------------------------------------------------------------
function render() {
  drawScene(sctx, S.clock, S);
  drawReelFlourish(sctx);

  ctx.clearRect(0, 0, VW, VH);
  ctx.drawImage(sceneCanvas, 0, 0, SW, SH, 0, 0, VW, VH);

  // Reveal is drawn first so the compact HUD stays bright and legible above it.
  if (S.state === 'reveal' && S.result) drawReveal();

  drawLogPanel();
  drawLegendPanel();
  drawHints();
  drawBiteMeter();
  drawButton();

  if (S.state !== 'reveal' && S.intro > 0 && S.state === 'ready' && S.log.length === 0) drawIntroBanner();
}

function drawIntroBanner() {
  const a = clamp(S.intro, 0, 1);
  const w = 420, h = 54, x = (VW - w) / 2, y = 540;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(9,16,24,0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,207,114,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  drawText(ctx, 'CAST  -  WAIT  -  REEL!', 640, y + 12, 2, '#ffe6a8', 'center');
  drawText(ctx, 'SPACE OR THE ON-SCREEN BUTTON', 640, y + 34, 1, '#bcd2e0', 'center');
  ctx.globalAlpha = 1;
}

// --- loop -------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;            // timers pause while hidden
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) return;
  dt = Math.min(dt, 0.05);
  update(dt);
  render();
}
document.addEventListener('visibilitychange', () => { last = performance.now(); });
requestAnimationFrame(frame);
