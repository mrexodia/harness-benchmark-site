// Mosswater Cove -- main game loop, state machine, HUD and reveal.
import { drawText, textWidth, drawTextShadow } from './font.js';
import {
  RARITY_ORDER, RARITY_ODDS, RARITY_COLORS, RARITY_ACCENT,
  defaultPickRarity, pickFish, drawFish,
} from './fish.js';
import {
  getLand, drawWater, drawWaterDeco, drawFoam, drawForeground,
  drawAngler, rodTip, drawBobber, drawLine, drawBiteMarker, pell, pixelArc,
} from './scene.js';

const W = 320, H = 180;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------------------
// Public test interface
// ---------------------------------------------------------------------------
const fishing = {
  state: 'ready',
  pickRarity: defaultPickRarity,
  log: [],
};
window.fishing = fishing;

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const ANGLER = { x: 86, y: 100 };
const DOCK_TOP = 50;

const state = {
  phase: 'ready',
  // timers (seconds)
  castT: 0, castDur: 0.5,
  waitT: 0, waitDur: 2,
  biteT: 0, biteDur: 1.8,
  reelT: 0, reelDur: 0.95,
  revealT: 0, revealDur: 1.7,
  bobber: { x: 180, y: 120, tx: 180, ty: 120, sx: 100, sy: 80 },
  catch: null,
  fishCfg: null,
  toast: '',
  toastT: 0,
  started: false,
  hintT: 0,
  time: 0,
};

const stateApi = {
  setPhase(p) { state.phase = p; fishing.state = p; },
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
function handleAction() {
  switch (state.phase) {
    case 'ready': startCast(); break;
    case 'bite': reelIn(); break;
    case 'reveal': setPhase('ready'); state.catch = null; break;
    // waiting / reeling: ignore (prevents overlapping casts / dup catches)
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) handleAction();
  }
});

function toLogical(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = toLogical(e);
  if (pointInButton(p.x, p.y)) handleAction();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const BUTTON = { x: 127, y: 159, w: 66, h: 15 };
function pointInButton(x, y) {
  return x >= BUTTON.x && x <= BUTTON.x + BUTTON.w && y >= BUTTON.y && y <= BUTTON.y + BUTTON.h;
}

// ---------------------------------------------------------------------------
// Set phase helper (also used by stateApi)
// ---------------------------------------------------------------------------
function setPhase(p) { stateApi.setPhase(p); }

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------
function startCast() {
  if (state.phase !== 'ready') return;
  state.started = true;
  state.castT = 0;
  state.waitT = 0;
  state.catch = null;
  state.fishCfg = null;
  // choose a landing spot in the open water to the right of the dock
  state.bobber.tx = 132 + Math.random() * 104;
  state.bobber.ty = 104 + Math.random() * 50;
  const tip = rodTip(ANGLER.x, ANGLER.y, -1.15);
  state.bobber.sx = tip.x; state.bobber.sy = tip.y;
  state.bobber.x = tip.x; state.bobber.y = tip.y;
  // variable wait before the bite
  state.waitDur = 1.7 + Math.random() * 2.0;
  setPhase('waiting');
}

function startBite() {
  if (state.phase !== 'waiting') return;
  state.biteT = 0;
  setPhase('bite');
}

function reelIn() {
  if (state.phase !== 'bite') return;
  const rarity = window.fishing.pickRarity(Math.random());
  state.catch = { rarity };
  state.fishCfg = pickFish(rarity);
  state.reelT = 0;
  setPhase('reeling');
}

function missBite() {
  state.toast = 'IT GOT AWAY...';
  state.toastT = 1.4;
  setPhase('ready');
}

function finishReel() {
  state.revealT = 0;
  setPhase('reveal');
  // record the catch
  const entry = { name: state.fishCfg.name, rarity: state.catch.rarity };
  window.fishing.log.unshift(entry);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  state.time += dt;
  if (state.toastT > 0) state.toastT -= dt;
  if (state.hintT > 0) state.hintT -= dt;

  switch (state.phase) {
    case 'waiting': {
      state.castT += dt;
      const p = Math.min(1, state.castT / state.castDur);
      if (p < 1) {
        const e = 1 - Math.pow(1 - p, 3);
        state.bobber.x = state.bobber.sx + (state.bobber.tx - state.bobber.sx) * e;
        const arc = Math.sin(p * Math.PI) * 26;
        state.bobber.y = state.bobber.sy + (state.bobber.ty - state.bobber.sy) * e - arc;
      } else {
        state.bobber.x = state.bobber.tx;
        state.bobber.y = state.bobber.ty;
        state.waitT += dt;
        if (state.waitT >= state.waitDur) startBite();
      }
      break;
    }
    case 'bite':
      state.biteT += dt;
      if (state.biteT >= state.biteDur) missBite();
      break;
    case 'reeling':
      state.reelT += dt;
      if (state.reelT >= state.reelDur) finishReel();
      break;
    case 'reveal':
      state.revealT += dt;
      if (state.revealT >= state.revealDur) { setPhase('ready'); state.catch = null; }
      break;
  }
}

// ---------------------------------------------------------------------------
// Pose
// ---------------------------------------------------------------------------
function currentPose() {
  const t = state.time;
  switch (state.phase) {
    case 'ready': return { rod: -1.15 + Math.sin(t * 1.5) * 0.02, lean: 0, moving: false };
    case 'waiting': {
      if (state.castT < state.castDur) {
        const p = state.castT / state.castDur;
        const e = 1 - Math.pow(1 - p, 3);
        return { rod: -1.6 + (0.55 - -1.6) * e, lean: 1, moving: true };
      }
      return { rod: 0.55 + Math.sin(t * 2) * 0.02, lean: 0, moving: false };
    }
    case 'bite': return { rod: 0.72 + Math.sin(t * 24) * 0.05, lean: 0, moving: false };
    case 'reeling': {
      const p = Math.min(1, state.reelT / 0.3);
      const bend = state.reelT > 0.3 ? Math.sin(state.time * 30) * 0.04 : 0;
      return { rod: 0.55 + (-0.15 - 0.55) * p + bend, lean: -1, moving: true };
    }
    case 'reveal': return { rod: 0.1 + Math.sin(t * 2) * 0.04, lean: 0, moving: false };
  }
  return { rod: -1.15, lean: 0 };
}

function drawFishingLine(tip) {
  const b = state.bobber;
  if (state.phase === 'waiting') {
    if (state.castT < state.castDur) drawLine(ctx, tip.x, tip.y, b.x, b.y, 2, '#e8e0c8');
    else drawLine(ctx, tip.x, tip.y, b.x, b.y, 3, '#e8e0c8');
  } else if (state.phase === 'bite') {
    drawLine(ctx, tip.x, tip.y, b.x, b.y, 0, '#f4f0e6');
  } else if (state.phase === 'reeling') {
    const p = state.reelT / state.reelDur;
    const e = 1 - Math.pow(1 - p, 2);
    const bx = b.x + (ANGLER.x + 8 - b.x) * e;
    const by = b.y + (ANGLER.y - 8 - b.y) * e - Math.sin(p * Math.PI) * 10;
    drawLine(ctx, tip.x, tip.y, bx, by, 0, '#f4f0e6');
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render() {
  const t = state.time;

  drawWater(ctx, t);
  drawWaterDeco(ctx, t);
  ctx.drawImage(getLand(), 0, 0);
  drawFoam(ctx, t);

  if (state.phase === 'waiting' || state.phase === 'bite' || state.phase === 'reeling') {
    drawFishingLine(rodTip(ANGLER.x, ANGLER.y, currentPose().rod));
  }

  const pose = currentPose();
  const tip = drawAngler(ctx, ANGLER.x, ANGLER.y, pose, t);

  // bobber + splash
  if (state.phase === 'waiting' || state.phase === 'bite') {
    const flash = state.phase === 'bite' && (state.biteT % 0.24) < 0.12;
    drawBobber(ctx, state.bobber.x, state.bobber.y, t, { state: state.phase, flash });
    if (state.phase === 'bite') {
      drawSplash(ctx, state.bobber.x, state.bobber.y, state.biteT, 1);
      drawBiteMarker(ctx, state.bobber.x, state.bobber.y, t);
      drawBiteTimer(ctx, state.bobber.x, state.bobber.y, state.biteT);
    }
  }

  if (state.phase === 'reeling') drawReel(ctx, tip, t);

  drawForeground(ctx, t);
  drawVignette();

  drawHUD(ctx, t);
  if (state.phase === 'reveal') drawReveal(ctx, state.revealT);
  drawToast(ctx);
}

function drawSplash(ctx, x, y, tt, strength) {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + tt * 4;
    const d = (tt * 26 * strength) % 12;
    const px = Math.round(x + Math.cos(a) * (2 + d));
    const py = Math.round(y + Math.sin(a) * (1 + d * 0.4) - d * 0.6);
    ctx.globalAlpha = Math.max(0, 1 - d / 12) * 0.8;
    ctx.fillStyle = i % 2 ? '#dff3f5' : '#9fd6e0';
    ctx.fillRect(px, py, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawBiteTimer(ctx, x, y, bt) {
  const remain = Math.max(0, 1 - bt / state.biteDur);
  const w = 18;
  const bx = Math.round(x - w / 2), by = Math.round(y - 20);
  ctx.globalAlpha = 0.8; ctx.fillStyle = '#0b1014';
  ctx.fillRect(bx - 1, by - 1, w + 2, 5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = remain > 0.5 ? '#6fd27a' : remain > 0.25 ? '#f4b731' : '#e2483f';
  ctx.fillRect(bx, by, Math.round(w * remain), 3);
}

function drawReel(ctx, tip, t) {
  const b = state.bobber;
  const p = state.reelT / state.reelDur;
  const e = 1 - Math.pow(1 - p, 2);
  const bx = b.x + (ANGLER.x + 6 - b.x) * e;
  const by = b.y + (ANGLER.y - 6 - b.y) * e - Math.sin(p * Math.PI) * 16;
  // splash at the water where it left
  if (p < 0.5) {
    ctx.globalAlpha = (0.5 - p) * 1.6;
    drawSplash(ctx, b.x, b.y, p, 1.4);
    ctx.globalAlpha = 1;
  }
  // silhouette fish flying in
  drawFish(ctx, state.fishCfg, bx, by, 2, t, '#12303f');
  // droplets trail
  for (let i = 1; i <= 3; i++) {
    const pp = Math.max(0, p - i * 0.06);
    const dx = b.x + (ANGLER.x + 6 - b.x) * (1 - Math.pow(1 - pp, 2));
    const dy = b.y + (ANGLER.y - 6 - b.y) * (1 - Math.pow(1 - pp, 2)) - Math.sin(pp * Math.PI) * 16;
    ctx.fillStyle = '#dff3f5';
    ctx.globalAlpha = 0.7 - i * 0.15;
    ctx.fillRect(Math.round(dx), Math.round(dy + 3), 1, 1);
    ctx.globalAlpha = 1;
  }
  // dust puff at the end
  if (p > 0.8) {
    const q = (p - 0.8) / 0.2;
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillRect(Math.round(ANGLER.x + 6 + Math.cos(a) * q * 8), Math.round(ANGLER.y - 8 + Math.sin(a) * q * 6), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function drawVignette() {
  const g = ctx.createRadialGradient(160, 90, 70, 160, 90, 190);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(5,12,20,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function panel(x, y, w, h, accent) {
  ctx.globalAlpha = 0.66; ctx.fillStyle = '#0d1420';
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.9; ctx.fillStyle = accent || '#b8a878';
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, t) {
  // ---- Catch log (top-left) ----
  const LW = 118, LH = 64;
  panel(3, 3, LW, LH, '#8a9aa8');
  drawText(ctx, 'CATCH LOG', 7, 6, '#cfe0ea', 1);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#8a9aa8';
  ctx.fillRect(7, 15, LW - 8, 1); ctx.globalAlpha = 1;
  if (fishing.log.length === 0) {
    drawText(ctx, 'NOTHING YET...', 7, 19, '#6a7a88', 1);
  } else {
    const shown = Math.min(8, fishing.log.length);
    for (let i = 0; i < shown; i++) {
      const e = fishing.log[i];
      const y = 18 + i * 6;
      const col = RARITY_COLORS[e.rarity] || '#fff';
      ctx.fillStyle = '#0b1014'; ctx.fillRect(6, y - 1, 4, 5);
      ctx.fillStyle = col; ctx.fillRect(7, y, 3, 3);
      const nm = e.name.length > 17 ? e.name.slice(0, 17) : e.name;
      drawText(ctx, nm, 12, y, '#e8eef2', 1);
    }
  }

  // ---- Rarity legend (top-right) ----
  const cw = 82;
  const gx = W - 3 - cw;
  panel(gx, 3, cw, 51, '#8a9aa8');
  drawText(ctx, 'ODDS', gx + 4, 6, '#cfe0ea', 1);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#8a9aa8';
  ctx.fillRect(gx + 4, 15, cw - 6, 1); ctx.globalAlpha = 1;
  RARITY_ORDER.forEach((r, i) => {
    const y = 17 + i * 6;
    ctx.fillStyle = '#0b1014'; ctx.fillRect(gx + 3, y - 1, 4, 5);
    ctx.fillStyle = RARITY_COLORS[r]; ctx.fillRect(gx + 4, y, 3, 3);
    drawText(ctx, r, gx + 10, y, '#e8eef2', 1);
    drawText(ctx, Math.round(RARITY_ODDS[r] * 100) + '%', gx + cw - 4, y, RARITY_ACCENT[r], 1, 'right');
  });

  // ---- Current status above the button ----
  let status = '';
  let statusCol = '#e8eef2';
  if (state.phase === 'waiting') { status = 'WAIT FOR A BITE...'; statusCol = '#9fd6e0'; }
  else if (state.phase === 'bite') { status = 'REEL NOW!'; statusCol = (t % 0.5 < 0.25) ? '#ffe24a' : '#ffffff'; }
  else if (state.phase === 'reeling') { status = 'REELING IN...'; statusCol = '#9fd6e0'; }
  else if (state.phase === 'reveal') { status = 'NICE CATCH!'; statusCol = RARITY_COLORS[state.catch ? state.catch.rarity : 'Common']; }
  if (status) {
    const w = textWidth(status, 1);
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#0b1014';
    ctx.fillRect(160 - w / 2 - 3, BUTTON.y - 11, w + 6, 9);
    ctx.globalAlpha = 1;
    drawText(ctx, status, 160, BUTTON.y - 10, statusCol, 1, 'center');
  }

  drawButton(ctx, t);

  // ---- Start instruction ----
  if (!state.started || state.hintT > 0) {
    const alpha = state.started ? Math.min(1, state.hintT) : 1;
    ctx.globalAlpha = 0.7 * alpha; ctx.fillStyle = '#0b1014';
    ctx.fillRect(56, 106, 208, 34);
    ctx.globalAlpha = 0.9 * alpha; ctx.fillStyle = '#b8a878';
    ctx.fillRect(56, 106, 208, 1); ctx.fillRect(56, 139, 208, 1);
    ctx.globalAlpha = 1;
    drawTextShadow(ctx, 'MOSSWATER COVE', 160, 111, '#f2e2b0', 2, 'center');
    drawText(ctx, 'PRESS SPACE  OR  TAP CAST', 160, 125, '#cfe0ea', 1, 'center', alpha);
    drawText(ctx, 'WHEN THE BOBBER DIPS. PRESS AGAIN', 160, 133, '#9fd6e0', 1, 'center', alpha);
    ctx.globalAlpha = 1;
    if (!state.started) return;
  }
}

function drawButton(ctx, t) {
  const { x, y, w, h } = BUTTON;
  const isBite = state.phase === 'bite';
  const pulse = isBite ? (Math.sin(t * 12) * 0.5 + 0.5) : 0;
  const base = isBite ? mixcolor('#c07a10', '#ffe24a', pulse) : '#1c2a38';
  const border = isBite ? '#ffd24a' : '#8aa0b0';
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#0b1014';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = base;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  ctx.globalAlpha = 1;
  let label = 'CAST';
  if (state.phase === 'waiting') label = 'WAIT';
  else if (state.phase === 'bite') label = 'REEL!';
  else if (state.phase === 'reeling') label = '...';
  else if (state.phase === 'reveal') label = 'NEXT';
  const tc = (state.phase === 'waiting' || state.phase === 'reeling') ? '#8a9aa8' : '#f8f0d8';
  drawText(ctx, label, x + w / 2, y + 4, tc, 1, 'center');
  // little rod icon
  ctx.fillStyle = isBite ? '#fff' : '#b98a55';
  ctx.fillRect(x + 5, y + 7, 8, 1);
  ctx.fillRect(x + w - 11, y + 4, 1, 7);
}

function mixcolor(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function drawToast(ctx) {
  if (state.toastT <= 0) return;
  const a = Math.min(1, state.toastT * 2);
  ctx.globalAlpha = 0.7 * a; ctx.fillStyle = '#0b1014';
  const w = textWidth(state.toast, 1) + 8;
  ctx.fillRect(160 - w / 2, 60, w, 11);
  ctx.globalAlpha = 1;
  drawText(ctx, state.toast, 160, 62, '#f0a0a0', 1, 'center', a);
}

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------
function star(ctx, x, y, r, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y, r * 2 + 1, 1);
  ctx.fillRect(x, y - r, 1, r * 2 + 1);
  ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1);
  ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.globalAlpha = 1;
}

function drawReveal(ctx, rt) {
  const e = state.catch;
  if (!e) return;
  const cfg = state.fishCfg;
  const rarity = e.rarity;
  const rank = RARITY_ORDER.indexOf(rarity);
  const col = RARITY_COLORS[rarity];
  const acc = RARITY_ACCENT[rarity];
  const appear = Math.min(1, rt / 0.22);
  const s = 1 - Math.pow(1 - appear, 3);

  // dim
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = rarity === 'Ancient' ? '#050810' : '#070d14';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const px = 54, py = 26, pw = 212, ph = 128;
  const cx = px + pw / 2, cyy = py + 50;

  // panel
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = rarity === 'Ancient' ? '#0a0618' : '#0d1420';
  ctx.fillRect(px, py, pw, ph);
  ctx.globalAlpha = 1;

  // border (double for higher tiers)
  ctx.fillStyle = acc;
  ctx.fillRect(px, py, pw, 2); ctx.fillRect(px, py + ph - 2, pw, 2);
  ctx.fillRect(px, py, 2, ph); ctx.fillRect(px + pw - 2, py, 2, ph);

  // tier specific effects inside the panel, behind the fish
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();

  if (rank >= 2) {
    // rotating rays
    const n = 6 + rank * 2;
    ctx.globalAlpha = 0.12 + rank * 0.02;
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rt * (rank >= 4 ? 0.8 : 0.4) * (i % 2 ? 1 : -1);
      for (let d = 6; d < 90; d += 2) {
        const rx = cx + Math.cos(a) * d;
        const ry = cyy + Math.sin(a) * d;
        const wid = 1 + d * 0.04;
        ctx.fillRect(Math.round(rx - wid / 2), Math.round(ry), Math.round(wid), 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  if (rarity === 'Ancient') {
    // swirling portal rings
    for (let i = 0; i < 5; i++) {
      const rr = 20 + i * 12 + Math.sin(rt * 2 + i) * 2;
      pixelArc(ctx, cx, cyy, rr, rt * (1 + i * 0.3), rt * (1 + i * 0.3) + Math.PI * 1.4, i % 2 ? '#c05fe0' : '#7df0dc', 0.28 - i * 0.035);
    }
  }

  ctx.restore();
  if (rank >= 3) {
    const pulse = rank >= 5 ? Math.abs(Math.sin(rt * 4)) : 0.5 + 0.5 * Math.sin(rt * 3);
    ctx.globalAlpha = 0.4 + pulse * 0.6;
    ctx.fillStyle = col;
    ctx.fillRect(px + 3, py + 3, pw - 6, 1); ctx.fillRect(px + 3, py + ph - 4, pw - 6, 1);
    ctx.fillRect(px + 3, py + 3, 1, ph - 6); ctx.fillRect(px + pw - 4, py + 3, 1, ph - 6);
    ctx.globalAlpha = 1;
  }

  // corner ornaments
  ctx.fillStyle = col;
  const cb = 5;
  for (const [ox, oy, sx, sy] of [[px, py, 1, 1], [px + pw - 1, py, -1, 1], [px, py + ph - 1, 1, -1], [px + pw - 1, py + ph - 1, -1, -1]]) {
    for (let i = 0; i < cb; i++) {
      ctx.fillRect(ox + sx * i, oy, 1, 1);
      ctx.fillRect(ox, oy + sy * i, 1, 1);
    }
  }

  // rarity word
  const wordY = py + 6;
  drawTextShadow(ctx, rarity, cx, wordY, col, 2, 'center');

  // fish (with float + gentle sway)
  const fy = cyy + Math.sin(rt * 2) * (rarity === 'Ancient' ? 2 : 1);
  const zoom = 2.6 + s * 0.4 + (rarity === 'Ancient' ? Math.sin(rt * 1.5) * 0.12 : 0);
  drawFish(ctx, cfg, cx, Math.round(fy), Math.round(zoom), state.time, false);

  // name
  drawTextShadow(ctx, cfg.name, cx, py + ph - 24, '#f4f0e6', 1, 'center');

  // tier flourishes
  if (rank === 0) {
    star(ctx, cx + 40, cyy - 20, 2, col, 0.7 + 0.3 * Math.sin(rt * 3));
  } else if (rank === 1) {
    star(ctx, cx - 46, cyy - 18, 2, col, 0.7 + 0.3 * Math.sin(rt * 3));
    star(ctx, cx + 46, cyy + 16, 2, col, 0.7 + 0.3 * Math.sin(rt * 3 + 1.5));
    bracket(ctx, px, py, pw, ph, col);
  } else if (rank === 2) {
    star(ctx, cx - 52, cyy - 22, 3, col, 0.8);
    star(ctx, cx + 52, cyy + 18, 3, col, 0.6 + 0.4 * Math.sin(rt * 4));
    star(ctx, cx + 44, cyy - 26, 2, col, 0.5 + 0.5 * Math.sin(rt * 3 + 2));
  } else if (rank === 3) {
    motes(ctx, cx, cyy, rt, col);
    star(ctx, cx - 56, cyy - 24, 3, col, 0.9);
    star(ctx, cx + 56, cyy + 22, 3, col, 0.9);
  } else if (rank === 4) {
    // crown motif
    crown(ctx, cx, py + 3, acc, col);
    motes(ctx, cx, cyy, rt, col);
    for (let i = 0; i < 4; i++) {
      const a = rt * 1.5 + i * 1.57;
      star(ctx, Math.round(cx + Math.cos(a) * 64), Math.round(cyy + Math.sin(a) * 34), 3, '#fff0b0', 0.9);
    }
  } else if (rank === 5) {
    // orbiting runes + inner glow + sparkles
    for (let i = 0; i < 8; i++) {
      const a = rt * 1.1 + (i / 8) * Math.PI * 2;
      const rx = Math.round(cx + Math.cos(a) * 72);
      const ry = Math.round(cyy + Math.sin(a) * 40);
      rune(ctx, rx, ry, i % 2 ? '#7df0dc' : '#c05fe0', 0.6 + 0.4 * Math.sin(rt * 3 + i));
    }
    pell(ctx, cx, cyy, 34, 34, '#7df0dc', 0.18 + 0.1 * Math.sin(rt * 3));
    ctx.globalAlpha = 1;
  }

  // prompt
  const blink = 0.5 + 0.5 * Math.sin(rt * 5);
  drawText(ctx, 'PRESS SPACE / NEXT', cx, py + ph - 11, '#9fb0c0', 1, 'center', 0.5 + blink * 0.5);

  // white flash for legendary/ancient
  if (rt < 0.2 && rank >= 4) {
    ctx.globalAlpha = (1 - rt / 0.2) * 0.7;
    ctx.fillStyle = rank >= 5 ? '#dffcff' : '#fff0c0';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function bracket(ctx, px, py, pw, ph, col) {
  ctx.fillStyle = col; ctx.globalAlpha = 0.8;
  const L = 8;
  ctx.fillRect(px + 4, py + 4, L, 1); ctx.fillRect(px + 4, py + 4, 1, L);
  ctx.fillRect(px + pw - 4 - L, py + 4, L, 1); ctx.fillRect(px + pw - 5, py + 4, 1, L);
  ctx.fillRect(px + 4, py + ph - 5, L, 1); ctx.fillRect(px + 4, py + ph - 4 - L, 1, L);
  ctx.fillRect(px + pw - 4 - L, py + ph - 5, L, 1); ctx.fillRect(px + pw - 5, py + ph - 4 - L, 1, L);
  ctx.globalAlpha = 1;
}

function motes(ctx, cx, cy, rt, col) {
  for (let i = 0; i < 7; i++) {
    const a = rt * 0.9 + i * 0.9;
    const rr = 30 + (i % 3) * 12;
    const x = Math.round(cx + Math.cos(a) * rr * 1.3);
    const y = Math.round(cy + Math.sin(a * 1.3) * rr * 0.8);
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(rt * 4 + i);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function crown(ctx, cx, y, acc, col) {
  ctx.fillStyle = col;
  ctx.fillRect(cx - 9, y, 19, 2);
  for (const dx of [-9, -4, 1, 6]) ctx.fillRect(cx + dx, y - 3, 2, 3);
  ctx.fillStyle = acc;
  ctx.fillRect(cx - 9, y + 2, 19, 1);
}

function rune(ctx, x, y, col, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  ctx.fillRect(x, y, 1, 4);
  ctx.fillRect(x - 1, y + 1, 3, 1);
  ctx.fillRect(x - 1, y + 3, 3, 1);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Main loop (pauses via document.hidden; rAF already halts when hidden)
// ---------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp after stalls / tab switches
  if (dt < 0) dt = 0;
  if (!document.hidden) update(dt);
  render();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  last = performance.now();
});
requestAnimationFrame(frame);
