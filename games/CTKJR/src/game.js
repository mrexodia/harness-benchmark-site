import * as Art from './art.js';
import { drawFish, pickSpecies } from './fish.js';
import { drawText, drawTextCentered, drawTextShadow, textWidth } from './font.js';

// ---------------------------------------------------------------------------
// canvases
// ---------------------------------------------------------------------------
const scene = document.getElementById('scene');
const sctx = scene.getContext('2d');
sctx.imageSmoothingEnabled = false;

const ui = document.getElementById('ui');
const uctx = ui.getContext('2d');
uctx.imageSmoothingEnabled = false;

const bg = Art.buildBackground();

// ---------------------------------------------------------------------------
// rarity table + test interface
// ---------------------------------------------------------------------------
const ODDS = [
  ['Common', 0.45],
  ['Uncommon', 0.25],
  ['Rare', 0.15],
  ['Epic', 0.08],
  ['Legendary', 0.05],
  ['Ancient', 0.02],
];

const RCOLOR = {
  Common: '#cfd8c0',
  Uncommon: '#8fd07a',
  Rare: '#6fc0e8',
  Epic: '#c08ae8',
  Legendary: '#f0c84a',
  Ancient: '#5fe0c0',
};

const TIER = {
  Common: { color: '#cfd8c0', accent: '#7d8a74', rays: 0, corners: 'none', particles: 'bubble' },
  Uncommon: { color: '#8fd07a', accent: '#3f8a3a', rays: 0, corners: 'leaf', particles: 'bubble' },
  Rare: { color: '#6fc0e8', accent: '#2f7fb5', rays: 1, corners: 'none', particles: 'bubble' },
  Epic: { color: '#c08ae8', accent: '#7a3fb0', rays: 1, corners: 'none', particles: 'ember', pulse: true },
  Legendary: { color: '#f0c84a', accent: '#b5842f', rays: 2, corners: 'star', particles: 'spark', pulse: true, flash: true },
  Ancient: { color: '#5fe0c0', accent: '#1f7a6a', rays: 3, corners: 'rune', particles: 'wisp', pulse: true, dark: true, glow: true },
};

const RARITY_NAMES = ODDS.map((o) => o[0]);

function pickRarityDefault(u) {
  let acc = 0;
  // keep the raw value so exact bin edges (e.g. 0.45) are not shifted by fp
  const v = u < 0 || u >= 1 ? u - Math.floor(u) : u;
  for (const [name, p] of ODDS) {
    acc += p;
    if (v < acc) return name;
  }
  return 'Ancient';
}

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
const S = { READY: 'ready', WAITING: 'waiting', BITE: 'bite', REELING: 'reeling', REVEAL: 'reveal' };

let state = S.READY;
let tState = 0;
let elapsed = 0;

const bobber = { tx: 240, ty: 80, sx: 130, sy: 86 };
let waitDuration = 2.0;
const BITE_WINDOW = 1.2;
let castLanded = false;

let reelT = 0;
let revealT = 0;
let revealMin = 1.1;
let revealHold = 5.5;
let missFlashT = 0;
let flashT = 0;

let current = null; // { name, rarity, species }

const log = []; // array of { name, rarity }, newest first
const sceneParts = [];
const uiParts = [];

const api = {
  get state() { return state; },
  pickRarity(u) { return pickRarityDefault(u); },
  get log() { return log; },
};
window.fishing = api;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function randomTarget() {
  const x = 186 + Math.random() * 94;
  const top = Art.farShore(x) + 18;
  const bot = Math.min(Art.nearShore(x) - 20, 152);
  const y = top + Math.random() * Math.max(8, bot - top);
  return { x, y };
}

function spawnSplash(x, y, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = (-Math.PI / 2) + (Math.random() - 0.5) * 2.2;
    const sp = 12 + Math.random() * 26;
    sceneParts.push({
      x, y, vx: Math.cos(a) * sp * 0.6, vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.35, max: 0.7, size: 1,
      color: Math.random() < 0.5 ? '#eafbf5' : '#bdeee4', g: 60,
    });
  }
}

// ---------------------------------------------------------------------------
// transitions
// ---------------------------------------------------------------------------
function startCast() {
  const tgt = randomTarget();
  bobber.tx = tgt.x; bobber.ty = tgt.y;
  const tip = Art.rodTip('idle', 0, 0, elapsed);
  bobber.sx = tip.x; bobber.sy = tip.y;
  state = S.WAITING; tState = 0; castLanded = false;
  waitDuration = 2.4 + Math.random() * 2.2;
}

function startBite() {
  state = S.BITE; tState = 0;
  spawnSplash(bobber.tx, bobber.ty, 12);
}

function miss() {
  state = S.READY; tState = 0;
  missFlashT = 2.0;
  spawnSplash(bobber.tx, bobber.ty, 8);
}

function startReel() {
  state = S.REELING; tState = 0; reelT = 0;
  spawnSplash(bobber.tx, bobber.ty, 14);
}

function finishCatch() {
  // The one and only call into the public pure rarity picker.
  const rarity = api.pickRarity(Math.random());
  const species = pickSpecies(rarity, Math.random);
  current = { name: species.name, rarity, species };
  log.unshift({ name: species.name, rarity });
  state = S.REVEAL; tState = 0; revealT = 0;
  if (TIER[rarity] && TIER[rarity].flash) flashT = 0.35;
  spawnRevealBurst(rarity);
}

function finishReveal() {
  state = S.READY; tState = 0; current = null;
}

function doAction() {
  if (state === S.READY) startCast();
  else if (state === S.BITE) { if (tState <= BITE_WINDOW) startReel(); }
  else if (state === S.REVEAL) { if (revealT >= revealMin) finishReveal(); }
}

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
function updateSceneParts(dt) {
  for (let i = sceneParts.length - 1; i >= 0; i--) {
    const p = sceneParts[i];
    p.vy += (p.g || 0) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) sceneParts.splice(i, 1);
  }
}

function spawnUiParticle(type, cfg) {
  const cx = 640, cy = 360;
  if (type === 'bubble') {
    uiParts.push({
      x: 380 + Math.random() * 520, y: 540 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 26,
      life: 1.4 + Math.random(), max: 2.4, size: 2 + ((Math.random() * 3) | 0),
      color: '#cdeeff', kind: 'ring',
    });
  } else if (type === 'ember') {
    uiParts.push({
      x: 360 + Math.random() * 560, y: 500 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40,
      life: 0.9 + Math.random() * 0.8, max: 1.7, size: 2 + ((Math.random() * 3) | 0),
      color: Math.random() < 0.5 ? '#e08a4a' : '#c05ad0', kind: 'dot',
    });
  } else if (type === 'spark') {
    uiParts.push({
      x: 360 + Math.random() * 560, y: 200 + Math.random() * 340,
      vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
      life: 0.5 + Math.random() * 0.6, max: 1.1, size: 2 + ((Math.random() * 3) | 0),
      color: Math.random() < 0.5 ? '#ffe98a' : '#fff6d0', kind: 'star',
    });
  } else if (type === 'wisp') {
    uiParts.push({
      x: 360 + Math.random() * 560, y: 220 + Math.random() * 320,
      vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 14,
      life: 1.6 + Math.random() * 1.2, max: 2.8, size: 2 + ((Math.random() * 2) | 0),
      color: Math.random() < 0.5 ? '#5fe0c0' : '#9a86c8', kind: 'dot',
    });
  }
}

function spawnRevealBurst(rarity) {
  const cfg = TIER[rarity] || TIER.Common;
  const n = rarity === 'Ancient' ? 26 : rarity === 'Legendary' ? 22 : 10;
  for (let i = 0; i < n; i++) spawnUiParticle(cfg.particles);
}

function updateUiParts(dt) {
  for (let i = uiParts.length - 1; i >= 0; i--) {
    const p = uiParts[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) uiParts.splice(i, 1);
  }
}

function update(dt) {
  elapsed += dt;
  tState += dt;
  if (missFlashT > 0) missFlashT -= dt;
  if (flashT > 0) flashT -= dt;

  if (state === S.WAITING) {
    if (!castLanded && tState >= 0.5) { castLanded = true; spawnSplash(bobber.tx, bobber.ty, 8); }
    if (tState >= waitDuration) startBite();
  } else if (state === S.BITE) {
    if (tState >= BITE_WINDOW) miss();
  } else if (state === S.REELING) {
    reelT += dt;
    if (reelT >= 1.35) finishCatch();
  } else if (state === S.REVEAL) {
    revealT += dt;
    const cfg = TIER[current ? current.rarity : 'Common'] || TIER.Common;
    const rate = cfg.particles === 'spark' ? 90 : cfg.particles === 'wisp' ? 55 : 40;
    revealSpawnAcc += dt * rate;
    while (revealSpawnAcc > 1) { revealSpawnAcc -= 1; spawnUiParticle(cfg.particles); }
    if (revealT >= revealHold) finishReveal();
  }

  updateSceneParts(dt);
  updateUiParts(dt);
}
let revealSpawnAcc = 0;

// ---------------------------------------------------------------------------
// scene rendering
// ---------------------------------------------------------------------------
function getRodTip() {
  if (state === S.WAITING || state === S.BITE) return Art.rodTip('cast', Math.min(tState, 0.30), 0, elapsed);
  if (state === S.REELING) return Art.rodTip('reel', reelT, reelT, elapsed);
  return Art.rodTip('idle', 0, 0, elapsed);
}

function bobberDrawPos() {
  if (state === S.WAITING) {
    const p = Math.min(1, tState / 0.5);
    if (p < 1) {
      const tip = Art.rodTip('cast', tState, 0, elapsed);
      const x = lerp(bobber.sx, bobber.tx, p);
      const y = lerp(bobber.sy, bobber.ty, p) - Math.sin(p * Math.PI) * 22;
      return { x, y, dip: 0, visible: true };
    }
    return { x: bobber.tx, y: bobber.ty, dip: 0, visible: true };
  }
  if (state === S.BITE) {
    const dip = 1 + Math.abs(Math.sin(tState * 16)) * 2.5;
    return { x: bobber.tx, y: bobber.ty, dip, visible: true };
  }
  if (state === S.REELING) {
    const p = Math.min(1, reelT / 0.5);
    const tip = Art.rodTip('reel', reelT, reelT, elapsed);
    const x = lerp(bobber.tx, tip.x, p);
    const y = lerp(bobber.ty, tip.y, p) + Math.sin(p * Math.PI) * 8;
    return { x, y, dip: 0, visible: p < 1 };
  }
  return { x: bobber.tx, y: bobber.ty, dip: 0, visible: false };
}

function renderScene() {
  sctx.globalAlpha = 1;
  sctx.drawImage(bg, 0, 0);
  Art.drawWaterMotion(sctx, elapsed);
  Art.drawAmbientLife(sctx, elapsed);

  const bp = bobberDrawPos();
  const tip = getRodTip();

  // bobber + rings
  if (bp.visible) {
    if (state === S.WAITING && tState > 0.5) Art.drawRings(sctx, bobber.tx, bobber.ty, (elapsed * 0.25) % 1, '#d8f4ee');
    if (state === S.BITE) Art.drawRings(sctx, bobber.tx, bobber.ty, (tState * 1.6) % 1, '#ffe8a0');
    Art.drawBobber(sctx, bp.x, bp.y, bp.dip, elapsed);

    // fishing line
    Art.linePix(sctx, tip.x, tip.y, bp.x, bp.y, '#f2f2f2', 0.75);
  }

  // leaping catch silhouette during reeling
  if (state === S.REELING && reelT > 0.55 && current) {
    const p = clamp((reelT - 0.55) / 0.6, 0, 1);
    const fx = lerp(bobber.tx, Art.ANGLER.x + 10, p);
    const fy = lerp(bobber.ty, Art.ANGLER.y - 26, p) - Math.sin(p * Math.PI) * 26;
    drawFish(sctx, current.species, Math.round(fx), Math.round(fy), 2, elapsed, { alpha: Math.sin(p * Math.PI) });
  }

  // splash particles
  for (const p of sceneParts) {
    sctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    sctx.fillStyle = p.color;
    sctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  sctx.globalAlpha = 1;

  // angler + rod
  Art.drawAngler(sctx, elapsed, state);
  const hand = { x: Art.ANGLER.x + 3, y: Art.ANGLER.y - 12 };
  Art.linePix(sctx, hand.x, hand.y, tip.x, tip.y, '#4a3220');
  Art.linePix(sctx, hand.x, hand.y - 1, tip.x, tip.y - 1, '#6b4a2f');
  Art.linePix(sctx, hand.x, hand.y, tip.x, tip.y, '#8a5a34', 0.6);

  // bite cue
  if (state === S.BITE) {
    Art.drawBiteCue(sctx, bobber.tx, bobber.ty, elapsed);
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 12);
    sctx.globalAlpha = 0.25 + pulse * 0.35;
    sctx.strokeStyle = '#ff5a3c';
    sctx.lineWidth = 3;
    sctx.strokeRect(2, 2, 316, 176);
    sctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// UI rendering
// ---------------------------------------------------------------------------
function pixelPanel(ctx, x, y, w, h, fill, border, ch = 6) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = border;
  ctx.fillRect(x + ch, y, w - ch * 2, h);
  ctx.fillRect(x, y + ch, w, h - ch * 2);
  ctx.fillRect(x + ch / 2, y + ch / 2, w - ch, h - ch);
  ctx.fillStyle = fill;
  const t = 3;
  ctx.fillRect(x + ch, y + t, w - ch * 2, h - t * 2);
  ctx.fillRect(x + t, y + ch, w - t * 2, h - ch * 2);
  ctx.fillRect(x + ch / 2 + 2, y + ch / 2 + 2, w - ch - 4, h - ch - 4);
}

const BTN = { x: 508, y: 626, w: 264, h: 60 };

function renderUI() {
  uctx.clearRect(0, 0, 1280, 720);
  const cx = 640;

  // full-screen flash for the rarest reveals
  if (flashT > 0) {
    uctx.globalAlpha = Math.min(1, flashT / 0.35) * 0.85;
    uctx.fillStyle = '#ffffff';
    uctx.fillRect(0, 0, 1280, 720);
    uctx.globalAlpha = 1;
  }

  // --- banner ---
  pixelPanel(uctx, 14, 12, 322, 82, 'rgba(10,20,26,0.82)', 'rgba(120,160,150,0.5)');
  drawTextShadow(uctx, 'TIDEPOOL COVE', 32, 24, 3, '#f0e0b0');
  let msg = '', mcol = '#cfe8df';
  if (missFlashT > 0) { msg = 'IT GOT AWAY...'; mcol = '#ff9a5a'; }
  else if (state === S.READY) { msg = 'SPACE / TAP TO CAST'; mcol = '#cfe8df'; }
  else if (state === S.WAITING) { msg = 'WAIT FOR A BITE...'; mcol = '#9fc8d8'; }
  else if (state === S.BITE) { msg = 'BITE! REEL NOW!'; mcol = (Math.sin(elapsed * 16) > 0) ? '#ffe14a' : '#ff6a3c'; }
  else if (state === S.REELING) { msg = 'REELING IT IN...'; mcol = '#9fe0c0'; }
  else if (state === S.REVEAL) { msg = 'NICE CATCH!'; mcol = '#f0e0b0'; }
  drawText(uctx, msg, 32, 58, 2, mcol);

  // --- catch log (bottom-left) ---
  const lx = 14, lh = 176, ly = 720 - 14 - lh, lw = 360;
  pixelPanel(uctx, lx, ly, lw, lh, 'rgba(10,20,26,0.82)', 'rgba(120,160,150,0.5)');
  drawText(uctx, 'CATCH LOG', lx + 16, ly + 12, 2, '#f0e0b0');
  drawText(uctx, 'LAST 8', lx + lw - 62, ly + 12, 2, '#7f9a92');
  const rows = log.slice(0, 8);
  if (rows.length === 0) {
    drawText(uctx, 'NO CATCHES YET', lx + 16, ly + 42, 2, '#6f8a82');
  } else {
    rows.forEach((e, i) => {
      const ry = ly + 38 + i * 17;
      uctx.fillStyle = RCOLOR[e.rarity] || '#cfd8c0';
      uctx.fillRect(lx + 16, ry + 3, 7, 7);
      const rw = textWidth(e.rarity.toUpperCase(), 2, 1);
      const maxName = (lw - 42 - rw - 8);
      let nm = e.name.toUpperCase();
      // trim name if needed
      while (textWidth(nm, 2, 1) > maxName && nm.length > 4) nm = nm.slice(0, -2) + '.';
      drawText(uctx, nm, lx + 30, ry, 2, '#dfeee9');
      drawText(uctx, e.rarity.toUpperCase(), lx + lw - 16 - rw, ry, 2, RCOLOR[e.rarity] || '#cfd8c0');
    });
  }

  // --- odds legend (bottom-right) ---
  const gw = 238, gh = 176, gx = 1280 - 14 - gw, gy = 720 - 14 - gh;
  pixelPanel(uctx, gx, gy, gw, gh, 'rgba(10,20,26,0.82)', 'rgba(120,160,150,0.5)');
  drawText(uctx, 'RARITY ODDS', gx + 16, gy + 12, 2, '#f0e0b0');
  ODDS.forEach(([name, p], i) => {
    const ry = gy + 42 + i * 20;
    uctx.fillStyle = RCOLOR[name];
    uctx.fillRect(gx + 16, ry + 3, 7, 7);
    drawText(uctx, name.toUpperCase(), gx + 30, ry, 2, RCOLOR[name]);
    const pct = Math.round(p * 100) + '%';
    drawText(uctx, pct, gx + gw - 16 - textWidth(pct, 2), ry, 2, '#cfd8c0');
  });

  // --- action button (always visible; label follows the phase) ---
  let label = 'CAST  [SPACE]', enabled = true, bcol = '#8fd0b0';
  if (state === S.WAITING) { label = 'WAITING...'; enabled = false; bcol = '#5a7a70'; }
  else if (state === S.BITE) { label = 'REEL!  [SPACE]'; bcol = '#ffd24a'; }
  else if (state === S.REELING) { label = 'REELING...'; enabled = false; bcol = '#5a7a70'; }
  else if (state === S.REVEAL) {
    enabled = revealT >= revealMin;
    label = enabled ? 'NEXT CAST  [SPACE]' : '...';
    bcol = enabled ? '#8fd0b0' : '#5a7a70';
  }
  const fill = (enabled && mouse.onBtn) ? 'rgba(70,130,110,0.95)' : 'rgba(28,58,58,0.9)';
  pixelPanel(uctx, BTN.x, BTN.y, BTN.w, BTN.h, fill, bcol, 10);
  const pulse = state === S.BITE ? (0.6 + 0.4 * Math.sin(elapsed * 14)) : 1;
  drawTextCentered(uctx, label, cx, BTN.y + 20, 2, '#eafff2', 1, pulse);

  // --- reveal ---
  if (state === S.REVEAL && current) drawReveal(current);
}

// ---------------------------------------------------------------------------
// reveal treatment (differs by tier in more than colour)
// ---------------------------------------------------------------------------
function runeGlyph(ctx, x, y, s, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s * 5, s);
  ctx.fillRect(x, y, s, s * 5);
  ctx.fillRect(x + s * 3, y + s * 3, s * 2, s);
  ctx.fillRect(x + s, y + s * 2, s, s);
  ctx.globalAlpha = 1;
}

function drawRays(cx, cy, cfg, t) {
  if (!cfg.rays) return;
  const n = cfg.rays >= 2 ? 14 : 10;
  uctx.save();
  uctx.translate(cx, cy);
  uctx.rotate(t * 0.45);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const spread = 0.09 + (cfg.rays >= 2 ? 0.04 : 0);
    uctx.beginPath();
    uctx.moveTo(0, 0);
    uctx.lineTo(Math.cos(a0 - spread) * 760, Math.sin(a0 - spread) * 760);
    uctx.lineTo(Math.cos(a0 + spread) * 760, Math.sin(a0 + spread) * 760);
    uctx.closePath();
    uctx.fillStyle = cfg.accent;
    uctx.globalAlpha = cfg.pulse ? 0.09 + 0.05 * Math.sin(t * 3) : 0.07;
    uctx.fill();
  }
  uctx.restore();
  if (cfg.rays === 3) {
    const R = 258;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + t * 0.6;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R * 0.84;
      runeGlyph(uctx, Math.round(x), Math.round(y), 3, cfg.color, 0.45 + 0.5 * Math.sin(t * 4 + i));
    }
  }
}

function drawCorners(x, y, w, h, cfg, t) {
  if (cfg.corners === 'leaf') {
    const leaf = (lx, ly) => {
      uctx.fillStyle = '#3f8a3a';
      uctx.fillRect(lx - 10, ly - 10, 20, 6);
      uctx.fillRect(lx - 6, ly - 14, 12, 5);
      uctx.fillStyle = '#6fc45a';
      uctx.fillRect(lx - 8, ly - 9, 14, 3);
    };
    leaf(x + 16, y + 14);
    leaf(x + w - 16, y + 14);
  } else if (cfg.corners === 'star') {
    const star = (sx, sy) => {
      uctx.fillStyle = '#fff2c0';
      uctx.fillRect(sx - 2, sy - 14, 4, 28);
      uctx.fillRect(sx - 14, sy - 2, 28, 4);
      uctx.fillRect(sx - 9, sy - 9, 4, 4);
      uctx.fillRect(sx + 5, sy - 9, 4, 4);
      uctx.fillRect(sx - 9, sy + 5, 4, 4);
      uctx.fillRect(sx + 5, sy + 5, 4, 4);
      uctx.fillStyle = '#f0c84a';
      uctx.fillRect(sx - 1, sy - 8, 2, 16);
      uctx.fillRect(sx - 8, sy - 1, 16, 2);
    };
    star(x + 20, y + 16);
    star(x + w - 20, y + 16);
  } else if (cfg.corners === 'rune') {
    runeGlyph(uctx, x + 12, y + 12, 3, cfg.color, 0.5 + 0.5 * Math.sin(t * 5));
    runeGlyph(uctx, x + w - 28, y + 12, 3, cfg.color, 0.5 + 0.5 * Math.sin(t * 5 + 2));
    runeGlyph(uctx, x + 12, y + h - 26, 3, cfg.color, 0.5 + 0.5 * Math.sin(t * 5 + 4));
    runeGlyph(uctx, x + w - 28, y + h - 26, 3, cfg.color, 0.5 + 0.5 * Math.sin(t * 5 + 1));
  }
}

function drawUiParticles() {
  for (const p of uiParts) {
    const a = clamp(p.life / p.max, 0, 1);
    uctx.globalAlpha = a;
    uctx.fillStyle = p.color;
    if (p.kind === 'ring') {
      uctx.strokeStyle = p.color;
      uctx.lineWidth = 2;
      uctx.beginPath();
      uctx.arc(p.x, p.y, p.size + 2, 0, Math.PI * 2);
      uctx.stroke();
    } else if (p.kind === 'star') {
      uctx.fillRect(p.x - p.size, p.y - 1, p.size * 2, 2);
      uctx.fillRect(p.x - 1, p.y - p.size, 2, p.size * 2);
    } else {
      uctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
  uctx.globalAlpha = 1;
}

function drawReveal(cur) {
  const cfg = TIER[cur.rarity] || TIER.Common;
  const cx = 640, cy = 360;
  const t = revealT;

  if (cfg.dark) {
    uctx.fillStyle = 'rgba(5,12,16,0.55)';
    uctx.fillRect(0, 0, 1280, 720);
  }
  drawRays(cx, cy, cfg, t);

  // panel
  const w = 520, h = 310;
  const x = cx - w / 2, y = cy - h / 2;
  const pop = clamp(t / 0.3, 0, 1);
  const pul = cfg.pulse ? 3 + Math.sin(t * 4) * 2 : 4;
  const fill = cfg.dark ? 'rgba(8,20,24,0.95)' : 'rgba(12,24,30,0.94)';
  pixelPanel(uctx, x, y, w, h, fill, cfg.accent, 10);
  const bw = Math.max(2, Math.round(pul));
  uctx.strokeStyle = cfg.color;
  uctx.lineWidth = bw;
  uctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  if (cfg.pulse) {
    uctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4);
    uctx.strokeStyle = cfg.color;
    uctx.lineWidth = 2;
    uctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
    uctx.globalAlpha = 1;
  }
  drawCorners(x, y, w, h, cfg, t);

  // the fish
  const S = 5;
  drawFish(uctx, cur.species, cx, cy - 30, S, t, {});

  // divider
  uctx.fillStyle = cfg.accent;
  uctx.fillRect(x + 60, y + h - 112, w - 120, 3);

  // name + rarity
  drawTextCentered(uctx, cur.name.toUpperCase(), cx, y + h - 96, 3, '#ffffff');
  drawTextCentered(uctx, cur.rarity.toUpperCase(), cx, y + h - 56, 3, cfg.color);

  // tier-specific extra flourish
  if (cur.rarity === 'Ancient') {
    uctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2);
    drawTextCentered(uctx, '* ANCIENT RELIC *', cx, y + 24, 2, '#5fe0c0');
    uctx.globalAlpha = 1;
  } else if (cur.rarity === 'Legendary') {
    uctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
    drawTextCentered(uctx, '* LEGENDARY *', cx, y + 24, 2, '#f0c84a');
    uctx.globalAlpha = 1;
  }

  drawUiParticles();

  if (t < revealMin) {
    // small "hold" indicator
  } else {
    drawTextCentered(uctx, 'SPACE / TAP TO CAST AGAIN', cx, y + h + 14, 2, '#9fc8b8');
  }
}

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
const mouse = { x: 0, y: 0, onBtn: false };

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
    e.preventDefault();
    if (!e.repeat) doAction();
  }
});

function uiCoords(clientX, clientY) {
  const r = ui.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (ui.width / r.width),
    y: (clientY - r.top) * (ui.height / r.height),
  };
}

ui.style.pointerEvents = 'auto';
ui.addEventListener('pointermove', (e) => {
  const p = uiCoords(e.clientX, e.clientY);
  mouse.onBtn = p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y && p.y <= BTN.y + BTN.h;
});
ui.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  doAction();
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------------------------------------------------------------------------
// fit + main loop
// ---------------------------------------------------------------------------
function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  document.documentElement.style.setProperty('--scale', String(s));
}
window.addEventListener('resize', fit);
fit();

let last = performance.now();
document.addEventListener('visibilitychange', () => { last = performance.now(); });

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  if (!document.hidden) update(dt);
  renderScene();
  renderUI();
}
requestAnimationFrame(frame);
