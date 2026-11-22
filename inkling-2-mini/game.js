'use strict';
/* ============================================================
   Ember Dock Fishing — original pixel-art fishing game
   Canvas: 320x180 logical pixels, scaled 4x via CSS.
   ============================================================ */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = 320, H = 180;

/* ---------------- Rarities & fish ---------------- */
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
const ODDS = [0.45, 0.25, 0.15, 0.08, 0.05, 0.02];
const RARITY_COLORS = {
  Common: '#b8b0a0', Uncommon: '#5fbf6a', Rare: '#a06ae0',
  Epic: '#f0b03a', Legendary: '#ff8a3a', Ancient: '#7ee8d0'
};

const FISH = {
  Common: [
    { name: 'Dace Minnow', len: 16, thick: 5, tail: 'fork', pattern: 'stripes', top: '#4a7a5e', mid: '#7fae7a', belly: '#e2ecc8', fin: '#c96f4a', eye: '#1c2b2b' },
    { name: 'Pebble Carp', len: 15, thick: 7, tail: 'round', pattern: 'spots', top: '#6e5f4e', mid: '#a08e6e', belly: '#e6d8b4', fin: '#8a5a3a', eye: '#241a12' }
  ],
  Uncommon: [
    { name: 'Sunfin Perch', len: 17, thick: 6, tail: 'fan', pattern: 'stripes', top: '#d96f2e', mid: '#f0a04e', belly: '#fde9c2', fin: '#e14f3a', eye: '#2a1608' },
    { name: 'Mist Reedling', len: 16, thick: 5, tail: 'fork', pattern: 'gradient', top: '#5f9e7e', mid: '#9fd4ac', belly: '#eef3da', fin: '#86caa8', eye: '#12302a' }
  ],
  Rare: [
    { name: 'Azure Trout', len: 19, thick: 6, tail: 'fork', pattern: 'spots', top: '#2a5f8e', mid: '#63a8d0', belly: '#eaf2ea', fin: '#33547a', eye: '#0e2436' },
    { name: 'Galefin Mackerel', len: 20, thick: 6, tail: 'fan', pattern: 'zigzag', top: '#2e7a64', mid: '#7fc4a8', belly: '#e4f0da', fin: '#265f4c', eye: '#10302a' }
  ],
  Epic: [
    { name: 'Emberfin Eel', custom: 'eel', top: '#a8321f', mid: '#e06a30', belly: '#f2bc6a', fin: '#6e1a12', eye: '#2a0d08' },
    { name: 'Starlit Guppy', len: 14, thick: 6, tail: 'round', pattern: 'stars', top: '#3e245e', mid: '#7a4ea0', belly: '#d8c6e8', fin: '#8a5fc0', eye: '#120a20' }
  ],
  Legendary: [
    { name: 'Gilded Koi', len: 20, thick: 8, tail: 'round', pattern: 'patches', top: '#e09a2a', mid: '#f2cc7e', belly: '#fff3d0', fin: '#e05a3a', eye: '#3a1a08' },
    { name: 'Lunaris Lanternfish', len: 18, thick: 6, tail: 'fan', pattern: 'lights', top: '#28385e', mid: '#5266a6', belly: '#c8d2ec', fin: '#7fc4dc', eye: '#f0e08a' }
  ],
  Ancient: [
    { name: 'Elder Seahorse', custom: 'seahorse', top: '#2e6357', mid: '#4fa184', belly: '#c4dea8', fin: '#224a3e', eye: '#0e2018' },
    { name: 'Chronos Catfish', len: 22, thick: 8, tail: 'round', pattern: 'runes', top: '#4e4e60', mid: '#7e7490', belly: '#d8cdb2', fin: '#34344a', eye: '#e8d8a0' }
  ]
};

/* ---------------- Game state ---------------- */
const state = {
  phase: 'ready',          // ready | waiting | bite | reeling | reveal
  castT: 0,                // cast animation 0..1
  biteTimer: 0,            // counts up until bite
  biteDelay: 0,
  biteT: 0,                // counts up inside bite window
  reelT: 0,
  revealT: 0,
  pendingFish: null,       // fish chosen at reveal
  bobber: { x: 0, y: 0 },
  bobTarget: { x: 0, y: 0 },
  bobRest: { x: 0, y: 0 },
  lineOut: false,
  toastT: 0,
  elapsed: 0
};

/* ---------------- window.fishing API ---------------- */
window.fishing = {
  get state() { return state.phase; },
  pickRarity(u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  },
  log: []
};

/* ---------------- DOM refs ---------------- */
const actionBtn = document.getElementById('actionBtn');
const instruction = document.getElementById('instruction');
const toast = document.getElementById('toast');
const logEl = document.getElementById('log');
const legendEl = document.getElementById('legend');
const revealEl = document.getElementById('reveal');
const panelEl = document.getElementById('panel');
const fishCanvas = document.getElementById('fishCanvas');
const fishCtx = fishCanvas.getContext('2d');
fishCtx.imageSmoothingEnabled = false;
const rarityWord = document.getElementById('rarityWord');
const fishNameEl = document.getElementById('fishName');

/* Legend chips */
RARITIES.forEach((r, i) => {
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.innerHTML = `<span style="color:${RARITY_COLORS[r]}">● ${r}</span><b>${Math.round(ODDS[i] * 100)}%</b>`;
  legendEl.appendChild(chip);
});

function renderLog() {
  if (window.fishing.log.length === 0) {
    logEl.innerHTML = '<li class="empty">No catches yet</li>';
    return;
  }
  logEl.innerHTML = window.fishing.log.slice(0, 8).map(e =>
    `<li><span class="dot" style="background:${RARITY_COLORS[e.rarity]}"></span><span>${e.name}</span><span class="r">${e.rarity}</span></li>`
  ).join('');
}

function showToast(msg, color) {
  toast.textContent = msg;
  toast.style.color = color || '#fff';
  toast.classList.add('show');
  state.toastT = 1.4;
}

/* ---------------- Geometry of the scene ---------------- */
const ROD_TIP = { x: 118, y: 62 };   // tip of fishing rod (angler on dock)
const WATER_TOP = 88;

function rodTip() {
  return { x: ROD_TIP.x, y: ROD_TIP.y + Math.sin(state.elapsed * 2) * 0.6 };
}

/* ---------------- Actions / state machine ---------------- */
const BITE_WINDOW = 1.6;

function currentButtonLabel() {
  switch (state.phase) {
    case 'ready': return 'Cast';
    case 'waiting': return '...';
    case 'bite': return 'STRIKE!';
    case 'reeling': return '...';
    case 'reveal': return 'Next Cast';
  }
}

function setButton(label, enabled) {
  actionBtn.textContent = label;
  actionBtn.disabled = !enabled;
}

function doAction() {
  if (state.phase === 'ready') startCast();
  else if (state.phase === 'bite') hookFish();
  else if (state.phase === 'reveal') closeReveal();
}

actionBtn.addEventListener('click', doAction);
document.getElementById('nextBtn').addEventListener('click', doAction);
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    doAction();
  }
});

function startCast() {
  state.phase = 'waiting';
  state.castT = 0;
  state.lineOut = true;
  state.bobTarget = { x: 172 + Math.random() * 62, y: 112 + Math.random() * 26 };
  state.bobRest = { ...state.bobTarget };
  state.biteDelay = 3.2 + Math.random() * 3.6;
  state.biteTimer = 0;
  state.biteT = 0;
  setButton(currentButtonLabel(), false);
  instruction.innerHTML = 'Waiting for a bite...';
}

function hookFish() {
  state.phase = 'reeling';
  state.reelT = 0;
  actionBtn.classList.remove('strike');
  setButton('...', false);
  instruction.innerHTML = 'Reeling in...';
}

function finishReeling() {
  // Pick rarity via the exposed function (replaceable for tests)
  const rarity = window.fishing.pickRarity(Math.random());
  const tier = FISH[rarity];
  const fish = tier[Math.floor(Math.random() * tier.length)];
  state.pendingFish = { ...fish, rarity };
  state.phase = 'reveal';
  state.revealT = 0;
  // Entry added only now — when the reveal appears
  window.fishing.log.unshift({ name: state.pendingFish.name, rarity: state.pendingFish.rarity });
  renderLog();
  showReveal();
  instruction.innerHTML = 'Nice catch!';
}

function missBite() {
  state.phase = 'ready';
  state.lineOut = false;
  actionBtn.classList.remove('strike');
  setButton('Cast', true);
  instruction.innerHTML = 'Press <b>Space</b> or the <b>Cast</b> button to fish';
  showToast('Missed it...', '#ffd9a0');
}

function closeReveal() {
  revealEl.classList.add('hidden');
  state.phase = 'ready';
  state.lineOut = false;
  state.pendingFish = null;
  setButton('Cast', true);
  instruction.innerHTML = 'Press <b>Space</b> or the <b>Cast</b> button to fish';
}

/* ---------------- Reveal panel ---------------- */
function showReveal() {
  const f = state.pendingFish;
  const rarity = f.rarity;
  panelEl.className = 'rarity-' + rarity.toLowerCase();
  rarityWord.textContent = rarity;
  fishNameEl.textContent = f.name;
  fishCanvas.width = 112; fishCanvas.height = 78;
  drawFish(fishCtx, f, 112, 78);
  revealEl.classList.remove('hidden');
  setButton(currentButtonLabel(), true);
}

/* ---------------- Update ---------------- */
function update(dt) {
  state.elapsed += dt;
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) toast.classList.remove('show');
  }

  if (state.phase === 'waiting') {
    if (state.castT < 1) {
      state.castT = Math.min(1, state.castT + dt / 0.65);
      const tip = rodTip();
      const t = easeOutCubic(state.castT);
      state.bobber.x = tip.x + (state.bobTarget.x - tip.x) * t;
      state.bobber.y = tip.y + (state.bobTarget.y - tip.y) * t - Math.sin(t * Math.PI) * 46;
    } else {
      state.bobber.x = state.bobTarget.x + Math.sin(state.elapsed * 1.3) * 2.5;
      state.bobber.y = state.bobTarget.y + Math.sin(state.elapsed * 2.1) * 1.6;
      state.biteTimer += dt;
      if (state.biteTimer >= state.biteDelay) {
        state.phase = 'bite';
        state.biteT = 0;
        setButton('STRIKE!', true);
        actionBtn.classList.add('strike');
        instruction.innerHTML = '<b>Bite!</b> Press Space now!';
      }
    }
  } else if (state.phase === 'bite') {
    state.biteT += dt;
    state.bobber.y = state.bobTarget.y + 2.5 + Math.sin(state.biteT * 18) * 1.5;
    state.bobber.x = state.bobTarget.x + Math.sin(state.biteT * 9) * 2;
    if (state.biteT >= BITE_WINDOW) {
      missBite();
    }
  } else if (state.phase === 'reeling') {
    state.reelT += dt / 0.65;
    const tip = rodTip();
    const t = easeInOutCubic(Math.min(1, state.reelT));
    state.bobber.x = state.bobTarget.x + (tip.x + 8 - state.bobTarget.x) * t;
    state.bobber.y = state.bobTarget.y + (tip.y + 10 - state.bobTarget.y) * t - Math.sin(t * Math.PI) * 12;
    if (state.reelT >= 1) finishReeling();
  } else if (state.phase === 'reveal') {
    state.revealT += dt;
  }
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* ---------------- Pixel-art scene drawing ---------------- */
function px(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawSky(t) {
  const top = [126, 184, 216], mid = [188, 220, 224], low = [252, 232, 184];
  for (let y = 0; y < WATER_TOP; y++) {
    const k = y / WATER_TOP;
    let r, g, b;
    if (k < 0.55) {
      const u = k / 0.55;
      r = top[0] + (mid[0] - top[0]) * u; g = top[1] + (mid[1] - top[1]) * u; b = top[2] + (mid[2] - top[2]) * u;
    } else {
      const u = (k - 0.55) / 0.45;
      r = mid[0] + (low[0] - mid[0]) * u; g = mid[1] + (low[1] - mid[1]) * u; b = mid[2] + (low[2] - mid[2]) * u;
    }
    px(ctx, 0, y, W, 1, `rgb(${r | 0},${g | 0},${b | 0})`);
  }
  // sun
  const sx = 248, sy = 26;
  for (let i = 10; i > 0; i--) {
    ctx.fillStyle = `rgba(255,238,170,${0.05 * (11 - i)})`;
    ctx.beginPath(); ctx.arc(sx, sy, i * 2.4, 0, Math.PI * 2); ctx.fill();
  }
  px(ctx, sx - 6, sy - 6, 12, 12, '#ffe9a3');
  px(ctx, sx - 4, sy - 4, 8, 8, '#fff3c8');
}

function drawClouds(t) {
  const clouds = [
    { x: 40, y: 18, s: 1, v: 2.2 },
    { x: 130, y: 34, s: 0.7, v: 1.5 },
    { x: 205, y: 12, s: 0.8, v: 1.9 }
  ];
  for (const c of clouds) {
    const x = ((c.x + t * c.v) % (W + 90)) - 45;
    const s = c.s;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    px(ctx, x, c.y, 26 * s, 6 * s, 'rgba(255,255,255,0.85)');
    px(ctx, x + 6 * s, c.y - 4 * s, 12 * s, 4 * s, 'rgba(255,255,255,0.85)');
    px(ctx, x + 8 * s, c.y + 6 * s, 14 * s, 2 * s, 'rgba(238,228,214,0.7)');
  }
}

function drawHills() {
  // far hill band
  ctx.fillStyle = '#8aa86e';
  for (let x = 0; x < W; x++) {
    const h = 14 + Math.sin(x * 0.05 + 1) * 6 + Math.sin(x * 0.13) * 3;
    px(ctx, x, WATER_TOP - h, 1, h, '#8aa86e');
  }
  // near tree line
  ctx.fillStyle = '#5f8a4e';
  for (let x = 0; x < W; x += 4) {
    const h = 8 + Math.sin(x * 0.21 + 2.5) * 4 + Math.sin(x * 0.07) * 3;
    px(ctx, x, WATER_TOP - h - 3, 4, h + 3, '#5f8a4e');
  }
  // little tree blobs
  const trees = [12, 46, 86, 150, 205, 262, 300];
  for (const tx of trees) {
    const ty = WATER_TOP - 9 - (tx % 5);
    px(ctx, tx, ty + 3, 3, 8, '#4a3a2a');
    px(ctx, tx - 4, ty - 4, 11, 9, '#47713c');
    px(ctx, tx - 2, ty - 7, 7, 5, '#5d8a4a');
  }
}

function drawWater(t) {
  // base gradient
  for (let y = WATER_TOP; y < H; y++) {
    const k = (y - WATER_TOP) / (H - WATER_TOP);
    const r = 58 + (38 - 58) * k, g = 132 + (111 - 132) * k, b = 158 + (142 - 158) * k;
    px(ctx, 0, y, W, 1, `rgb(${r | 0},${g | 0},${b | 0})`);
  }
  // moving wave dashes
  for (let i = 0; i < 46; i++) {
    const wy = WATER_TOP + 6 + (i * 13) % (H - WATER_TOP - 8);
    const speed = 6 + (i % 5) * 3;
    const wx = ((i * 61 + t * speed) % (W + 30)) - 15;
    const len = 6 + (i % 4) * 4;
    const a = 0.16 + 0.1 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(217,240,240,${a})`;
    ctx.fillRect(wx, wy + Math.sin(t * 1.8 + i * 1.7) * 1.4, len, 1);
  }
  // sun reflection
  for (let y = WATER_TOP + 4; y < H - 8; y += 5) {
    const spread = 4 + (y - WATER_TOP) * 0.22;
    const wob = Math.sin(t * 1.6 + y * 0.5) * 3;
    ctx.fillStyle = `rgba(255,226,150,${0.28 - (y - WATER_TOP) / 220})`;
    ctx.fillRect(244 + wob - spread, y, spread * 2, 1.4);
  }
  // lily pads
  drawLily(86, 156, '#3f7d44');
  drawLily(146, 166, '#4a8a4a');
  drawLily(296, 108, '#3f7d44');
}

function drawLily(x, y, c) {
  ctx.fillStyle = c;
  px(ctx, x - 5, y - 1, 10, 3, c);
  px(ctx, x - 3, y - 2, 6, 1, c);
  px(ctx, x + 1, y - 2, 2, 1, '#2a5a2e');
}

function drawBank() {
  // dirt slope under grass, left side
  for (let x = 0; x < 104; x++) {
    const edge = WATER_TOP + 26 + Math.sin(x * 0.11) * 5 + x * 0.16;
    px(ctx, x, WATER_TOP + 2, 1, Math.max(0, edge - WATER_TOP - 2), '#d9bd7f');
    px(ctx, x, edge, 1, H - edge, '#7ab04f');
  }
  // sand lip along water line
  for (let x = 0; x < 104; x++) {
    const edge = WATER_TOP + 4 + Math.sin(x * 0.11 + 1) * 3;
    px(ctx, x, WATER_TOP - 1, 1, 5, '#e8d29a');
  }
  // grass texture tufts
  for (let x = 2; x < 100; x += 7) {
    const gy = WATER_TOP + 16 + Math.sin(x * 0.35) * 8;
    px(ctx, x, gy, 1, 3, '#4e7d3a');
    px(ctx, x + 2, gy + 1, 1, 2, '#4e7d3a');
    px(ctx, x + 4, gy - 1, 1, 3, '#86c165');
  }
}

function drawDock(t) {
  // posts
  px(ctx, 74, 104, 5, 26, '#6e4f34');
  px(ctx, 132, 104, 5, 26, '#6e4f34');
  px(ctx, 160, 104, 5, 26, '#6e4f34');
  // deck planks
  px(ctx, 68, 92, 100, 12, '#7a5738');
  for (let x = 68; x < 168; x += 8) {
    px(ctx, x, 92, 7, 12, '#a67c52');
    px(ctx, x, 92, 7, 2, '#c49a6a');
    px(ctx, x + 3, 96, 1, 1, '#5f422c');
  }
  px(ctx, 68, 102, 100, 2, '#5f422c');
  // ripples around posts
  for (const pxX of [76, 134, 162]) {
    const r = 4 + Math.sin(t * 2 + pxX) * 1.5;
    ctx.strokeStyle = 'rgba(217,240,240,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(pxX + 2, 128, r + 2, 1.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawAngler(t) {
  const ax = 100, ay = 92; // feet baseline
  const bob = Math.sin(t * 2.2) * 0.8;
  const y = ay + bob;
  // shadow on dock
  ctx.fillStyle = 'rgba(40,25,15,0.35)';
  ctx.beginPath(); ctx.ellipse(ax, 92.5, 10, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  // legs
  px(ctx, ax - 4, y - 8, 3, 8, '#3e4a5a');
  px(ctx, ax + 1, y - 8, 3, 8, '#35414f');
  px(ctx, ax - 5, y - 1, 4, 2, '#4a3a2e');
  px(ctx, ax + 1, y - 1, 4, 2, '#4a3a2e');
  // torso (cozy red shirt)
  px(ctx, ax - 5, y - 17, 10, 9, '#c65b4e');
  px(ctx, ax - 5, y - 17, 10, 2, '#e0785f');
  // arms toward rod
  px(ctx, ax + 2, y - 15, 6, 2.5, '#c65b4e');
  // head
  px(ctx, ax - 3, y - 24, 7, 6, '#f2c894');
  px(ctx, ax - 3, y - 19, 7, 1.5, '#e0b078');
  // straw hat
  px(ctx, ax - 6, y - 26, 13, 3, '#e8c268');
  px(ctx, ax - 3, y - 30, 7, 4, '#e8c268');
  px(ctx, ax - 3, y - 26.5, 7, 1.5, '#b8783a');
  // fishing rod: from hand out to tip
  const hx = ax + 8, hy = y - 14;
  const tip = rodTip();
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + 18, hy - 16, tip.x, tip.y);
  ctx.stroke();
  // rod highlight
  ctx.strokeStyle = '#6e5238';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(hx, hy - 0.8); ctx.quadraticCurveTo(hx + 18, hy - 16.8, tip.x, tip.y - 0.8); ctx.stroke();
  // reel
  px(ctx, hx - 1.5, hy - 2, 3, 3, '#8a8378');
}

function drawVegetation(t) {
  // bush cluster on bank
  px(ctx, 8, 96, 12, 8, '#4e7d3a');
  px(ctx, 12, 90, 10, 8, '#5d8a4a');
  px(ctx, 2, 100, 8, 6, '#436e33');
  px(ctx, 9, 88, 3, 2, '#7ab04f');
  // flowers
  const flowers = [[16, 94, '#f2a0c4'], [26, 104, '#ffd76a'], [44, 92, '#ffffff'], [58, 102, '#f2a0c4'], [72, 96, '#ffd76a']];
  for (const [fx, fy, c] of flowers) {
    px(ctx, fx, fy + Math.sin(t * 1.5 + fx) * 0.5, 2, 2, c);
  }
  // reeds + cattails near water edge
  const reeds = [[128, 106], [138, 104], [196, 128], [286, 96], [306, 112]];
  for (const [rxx, ryy] of reeds) {
    const sway = Math.sin(t * 1.4 + rxx) * 1.2;
    ctx.strokeStyle = '#3f7a44';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(rxx, ryy);
    ctx.quadraticCurveTo(rxx + sway, ryy - 9, rxx + sway * 1.6, ryy - 16);
    ctx.stroke();
    if (rxx % 2 === 0) {
      px(ctx, rxx + sway * 1.6 - 1, ryy - 19, 2.4, 5, '#7a4a2c');
      px(ctx, rxx + sway * 1.6 - 0.5, ryy - 21.5, 1, 2.5, '#3f7a44');
    }
  }
  // rocks
  px(ctx, 30, 128, 8, 4, '#9a948a');
  px(ctx, 31, 126.5, 5, 2, '#b5afa3');
  px(ctx, 52, 140, 6, 3.5, '#8a847a');
  // dragonfly
  const dx = 150 + Math.sin(t * 0.9) * 24, dy = 74 + Math.cos(t * 1.3) * 7;
  px(ctx, dx - 1, dy, 3, 1, '#2e4a5e');
  ctx.fillStyle = 'rgba(200,230,240,0.75)';
  ctx.fillRect(dx - 3, dy - 2 + Math.sin(t * 30) * 1, 2.5, 1.6);
  ctx.fillRect(dx + 1, dy - 2 + Math.cos(t * 30) * 1, 2.5, 1.6);
}

function drawLineAndBobber(t) {
  if (state.phase === 'ready' || state.phase === 'reveal') return;
  const tip = rodTip();
  const b = state.bobber;
  // line
  ctx.strokeStyle = 'rgba(240,240,225,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.quadraticCurveTo((tip.x + b.x) / 2, Math.min(tip.y, b.y) - 10, b.x, b.y);
  ctx.stroke();
  // bobber
  const dip = state.phase === 'bite' ? 2.5 : 0;
  // ripple rings
  ctx.strokeStyle = 'rgba(217,240,240,0.4)';
  ctx.lineWidth = 1;
  const rr = 5 + Math.sin(t * 2.4) * 1.6 + (state.phase === 'bite' ? 2 : 0);
  ctx.beginPath(); ctx.ellipse(b.x, b.y + 3.5, rr, rr * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
  px(ctx, b.x - 2.5, b.y - 3 + dip, 5, 3, '#e14f3a');
  px(ctx, b.x - 2.5, b.y + dip, 5, 2.6, '#f2ead8');
  px(ctx, b.x - 0.75, b.y - 5.5 + dip, 1.5, 2.5, '#2a2a2a');
  // bite cue
  if (state.phase === 'bite') {
    const c = 1 + Math.sin(t * 12) * 0.3;
    // pulsing ring around bobber
    ctx.strokeStyle = `rgba(255,120,80,${0.75 + Math.sin(t * 12) * 0.25})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, 7 + c * 3, (7 + c * 3) * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
    // pixel exclamation mark above bobber
    const ex = b.x, ey = b.y - 16;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(c, c);
    px(ctx, -2.2, -4.6, 4.4, 6.6, '#c22a1a');
    px(ctx, -1.4, -4, 2.8, 5.4, '#fff2e0');
    px(ctx, -2.2, 3.4, 4.4, 4.2, '#c22a1a');
    px(ctx, -1.4, 4, 2.8, 2.6, '#fff2e0');
    ctx.restore();
    // window bar below the bobber
    const remaining = 1 - state.biteT / BITE_WINDOW;
    px(ctx, b.x - 18, b.y + 11, 36, 3.6, 'rgba(20,26,34,0.8)');
    px(ctx, b.x - 17, b.y + 11.9, 34 * remaining, 1.8, remaining > 0.4 ? '#ffd76a' : '#ff6a4a');
  }
}

function drawForeground(t) {
  // foreground grass corners
  for (let x = 0; x < 26; x += 4) {
    const h = 5 + Math.sin(x * 0.8 + 3) * 2;
    px(ctx, x, H - h, 2, h, '#3e6a35');
    px(ctx, x + 1, H - h - 2, 1, 2, '#57a05a');
  }
  for (let x = W - 30; x < W; x += 5) {
    const h = 4 + Math.sin(x * 0.6) * 2;
    px(ctx, x, H - h, 2, h, '#3e6a35');
  }
}

function render(t) {
  drawSky(t);
  drawClouds(t);
  drawHills();
  drawWater(t);
  drawBank();
  drawDock(t);
  drawVegetation(t);
  drawLineAndBobber(t);
  drawAngler(t);
  drawForeground(t);
}

/* ---------------- Fish drawing ---------------- */
function seededRand(seed) {
  return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
}

function drawFish(g, spec, w, h) {
  g.clearRect(0, 0, w, h);
  if (spec.custom === 'eel') drawEel(g, spec, w, h);
  else if (spec.custom === 'seahorse') drawSeahorse(g, spec, w, h);
  else drawParametricFish(g, spec, w, h);
}

function drawParametricFish(g, spec, w, h) {
  const scale = 4;
  const fish = spec.len;
  const thick = spec.thick;
  const ox = Math.round((w - fish * scale) / 2);
  const oy = Math.round(h / 2);
  const cx = ox + 2 * scale; // body center (leave room for tail on right)
  const halfLen = fish * scale / 2;
  const halfThick = thick * scale / 2;

  const bodyWidth = (k) => Math.sqrt(Math.max(0, 1 - k * k));

  // outline pass
  for (let dy = -halfThick - 1; dy <= halfThick + 1; dy++) {
    const k = dy / (halfThick + 1);
    const hw = halfLen * bodyWidth(k);
    if (hw <= 0) continue;
    px(g, cx - hw, oy + dy, hw * 2, 1, '#241d18');
  }
  // tail
  const tx = cx + halfLen;
  if (spec.tail === 'fork') {
    for (let i = 0; i < 6; i++) {
      const ww = scale * 1.05;
      const spread = 2 + i * 1.55;
      px(g, tx + i * scale * 0.62, oy - spread - 2.6, ww, 2.6, '#241d18');
      px(g, tx + i * scale * 0.62, oy + spread, ww, 2.6, '#241d18');
      px(g, tx + i * scale * 0.62 + 0.6, oy - spread - 2, ww - 1.2, 2, spec.fin);
      px(g, tx + i * scale * 0.62 + 0.6, oy + spread + 0.6, ww - 1.2, 2, spec.fin);
    }
  } else if (spec.tail === 'fan') {
    for (let i = -6; i <= 6; i++) {
      const hw = 8 - Math.abs(i) * 1.1;
      px(g, tx, oy + i * scale * 0.55, hw, 1.6, '#241d18');
      px(g, tx + 1, oy + i * scale * 0.55, hw - 1.5, 1.6, spec.fin);
    }
  } else { // round
    for (let dy = -5; dy <= 5; dy++) {
      const hw = 6 - Math.abs(dy) * 0.85;
      px(g, tx, oy + dy * 1.6, hw, 1.7, '#241d18');
      px(g, tx + 1, oy + dy * 1.6, hw - 1.5, 1.7, spec.fin);
    }
  }
  // body rows
  for (let dy = -halfThick; dy <= halfThick; dy++) {
    const k = dy / (halfThick + 0.5);
    const hw = halfLen * bodyWidth(Math.min(1, k));
    if (hw <= 0) continue;
    // vertical shade: top dark, mid, belly light
    let c;
    if (k < -0.12) c = spec.top;
    else if (k < 0.45) c = spec.mid;
    else c = spec.belly;
    if (spec.pattern === 'gradient') {
      // blend top->belly
      const u = (k + 1) / 2;
      const top = hexRgb(spec.top), belly = hexRgb(spec.belly);
      c = rgbStr(top[0] + (belly[0] - top[0]) * u, top[1] + (belly[1] - top[1]) * u, top[2] + (belly[2] - top[2]) * u);
    }
    px(g, cx - hw, oy + dy, hw * 2, 1, c);
  }
  // patterns
  const rng = seededRand(spec.name.length * 77 + 13);
  if (spec.pattern === 'spots') {
    g.fillStyle = 'rgba(20,26,34,0.5)';
    for (let i = 0; i < 9; i++) {
      const sx = cx - halfLen * 0.75 + rng() * halfLen * 1.5;
      const sy = oy - halfThick * 0.6 + rng() * halfThick * 1.2;
      px(g, sx, sy, 2, 2, 'rgba(20,26,34,0.5)');
    }
  } else if (spec.pattern === 'stripes') {
    g.fillStyle = 'rgba(20,26,34,0.35)';
    for (let sx = cx - halfLen + 3; sx < cx + halfLen - 3; sx += 6) {
      px(g, sx, oy - halfThick * 0.8, 2, halfThick * 1.6, 'rgba(20,26,34,0.35)');
    }
  } else if (spec.pattern === 'zigzag') {
    for (let x = cx - halfLen + 4; x < cx + halfLen - 6; x += 4) {
      const yy = oy + Math.sin(x * 0.5) * halfThick * 0.45;
      px(g, x, yy, 3, 1.4, 'rgba(240,250,240,0.75)');
    }
  } else if (spec.pattern === 'stars') {
    for (let i = 0; i < 7; i++) {
      const sx = cx - halfLen * 0.7 + rng() * halfLen * 1.4;
      const sy = oy - halfThick * 0.7 + rng() * halfThick * 1.4;
      px(g, sx, sy, 1.6, 1.6, '#ffe9a3');
      px(g, sx - 0.8, sy + 0.5, 0.8, 0.6, '#ffe9a3');
      px(g, sx + 1.6, sy + 0.5, 0.8, 0.6, '#ffe9a3');
    }
  } else if (spec.pattern === 'patches') {
    g.fillStyle = '#e05a3a';
    px(g, cx - halfLen * 0.5, oy - halfThick * 0.6, 10, 6, '#e05a3a');
    px(g, cx + halfLen * 0.18, oy + halfThick * 0.05, 8, 6, '#e05a3a');
    px(g, cx - halfLen * 0.05, oy - halfThick * 0.45, 6, 5, '#c23a2a');
  } else if (spec.pattern === 'lights') {
    for (let i = 0; i < 6; i++) {
      const sx = cx - halfLen * 0.65 + rng() * halfLen * 1.3;
      const sy = oy - halfThick * 0.6 + rng() * halfThick * 1.2;
      px(g, sx - 1, sy - 1, 3, 3, 'rgba(255,240,170,0.35)');
      px(g, sx, sy, 1.4, 1.4, '#ffe9a3');
    }
  } else if (spec.pattern === 'runes') {
    for (let i = 0; i < 5; i++) {
      const sx = cx - halfLen * 0.55 + rng() * halfLen * 1.1;
      const sy = oy - halfThick * 0.5 + rng() * halfThick;
      px(g, sx, sy, 2, 2, '#d8c26a');
      px(g, sx - 1.4, sy + 0.8, 1, 1, '#d8c26a');
      px(g, sx + 2.4, sy + 0.8, 1, 1, '#d8c26a');
    }
  }
  // dorsal fin (top)
  const fd = cx - halfLen * 0.15;
  for (let i = 0; i < 5; i++) {
    px(g, fd + i * 2, oy - halfThick - 1.5 - Math.sin(i / 4 * Math.PI) * 4, 1.8, 2 + Math.sin(i / 4 * Math.PI) * 3.4, '#241d18');
    px(g, fd + i * 2 + 0.4, oy - halfThick - 1.2 - Math.sin(i / 4 * Math.PI) * 4, 1.2, 1.6 + Math.sin(i / 4 * Math.PI) * 3, spec.fin);
  }
  // bottom fin
  for (let i = 0; i < 4; i++) {
    const fx = cx - halfLen * 0.25 + i * 2.4;
    const fh = 3 + Math.sin(i / 3 * Math.PI) * 3.5;
    px(g, fx, oy + halfThick + (i % 2), 1.8, fh + 1, '#241d18');
    px(g, fx + 0.4, oy + halfThick + 1 + (i % 2), 1.2, fh, spec.fin);
  }
  // eye (front = left)
  const ex = cx - halfLen * 0.62, ey = oy - 1.4;
  px(g, ex, ey, 3, 3, '#f4f0e0');
  px(g, ex + 0.6, ey + 0.6, 1.8, 1.8, spec.eye);
  // gill line
  px(g, cx - halfLen * 0.42, oy - 2, 1, 4, 'rgba(20,26,34,0.4)');
}

function drawEel(g, spec, w, h) {
  const scale = 4;
  const ox = w / 2, oy = h / 2 + 4;
  const len = 62;
  // outline
  for (let x = -len / 2; x <= len / 2; x++) {
    const k = x / (len / 2);
    const r = 5 - Math.abs(k) * 2.2 - (k > 0.75 ? (k - 0.75) * 22 : 0);
    const cy = oy + Math.sin(x * 0.09) * 7;
    px(g, ox + x, cy - r - 1, 1, (r + 1) * 2, '#241d18');
  }
  for (let x = -len / 2; x <= len / 2; x++) {
    const k = x / (len / 2);
    const r = 5 - Math.abs(k) * 2.2 - (k > 0.75 ? (k - 0.75) * 22 : 0);
    const cy = oy + Math.sin(x * 0.09) * 7;
    // body shade
    const top = cy - r * 0.35;
    if (cy - r < top) {}
    px(g, ox + x, cy - r, 1, r * 2, spec.mid);
    px(g, ox + x, cy - r, 1, 1.6, spec.top);
    px(g, ox + x, cy + r - 1.6, 1, 1.6, spec.belly);
    // dorsal crest
    if (Math.sin(x * 0.09) < 0.1) px(g, ox + x, cy - r - 2.4, 1.2, 1.6, spec.fin);
  }
  // tail fin tip
  const tx = ox + len / 2;
  px(g, tx, oy + Math.sin((len / 2) * 0.09) * 7 - 3, 3, 7, spec.fin);
  px(g, tx + 1, oy + Math.sin((len / 2) * 0.09) * 7 - 4, 1.6, 1.6, '#241d18');
  // head + eye (left end)
  const hx = ox - len / 2;
  const hy = oy + Math.sin((-len / 2) * 0.09) * 7;
  px(g, hx - 1, hy - 6.4, 6, 3, spec.top);
  px(g, hx - 1, hy - 4.6, 1.6, 1.6, '#f4f0e0');
  px(g, hx - 0.4, hy - 4, 1.1, 1.1, spec.eye);
}

function drawSeahorse(g, spec, w, h) {
  g.save();
  g.translate(w / 2 + 6, h / 2 + 2);
  g.scale(2.15, 2.15);
  const ox = 0, oy = -13;
  // snout (extends left) — nostril
  px(g, ox - 9, oy, 10, 3.6, '#241d18');
  px(g, ox - 8.2, oy + 0.7, 8.4, 2.2, spec.mid);
  px(g, ox - 9.4, oy + 1.1, 1.2, 1.4, spec.belly);
  // head
  px(g, ox - 1.2, oy - 2.4, 7.4, 6.6, '#241d18');
  px(g, ox - 0.4, oy - 1.6, 5.9, 5.2, spec.mid);
  px(g, ox - 0.4, oy - 1.6, 5.4, 1.9, spec.top);
  px(g, ox + 0.4, oy - 0.9, 1.9, 1.9, '#f4f0e0');
  px(g, ox + 1, oy - 0.35, 1.25, 1.25, spec.eye);
  // crest spike
  px(g, ox + 1.8, oy - 5.2, 2.8, 3.1, spec.fin);
  px(g, ox + 2.4, oy - 6.5, 1.5, 1.7, '#241d18');
  px(g, ox + 4.6, oy - 3.4, 2.4, 2.2, spec.fin);
  // neck + body curving down
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const bx = 0.8 + Math.sin(t * 2.05) * 2.3;
    const bw = 4.6 + t * 4.6;
    px(g, bx - bw / 2 - 1.1, oy + 4.4 + i * 1.35, bw + 2.2, 1.55, '#241d18');
    px(g, bx - bw / 2, oy + 4.4 + i * 1.35, bw, 1.55, i < 6 ? spec.mid : spec.belly);
  }
  // ridge scales
  for (let i = 1; i < 8; i += 2) {
    const t = i / 9;
    const bx = 0.8 + Math.sin(t * 2.05) * 2.3;
    px(g, bx - 1.3, oy + 3.4 + i * 1.35, 2.6, 1.3, spec.top);
  }
  // dorsal fin on back (right)
  const flick = Math.sin(Date.now() / 170) * 1.2;
  px(g, ox + 4.9, oy + 7.4, 4.6, 7 + flick, spec.fin);
  px(g, ox + 6, oy + 8.3, 2.2, 5 + flick, '#241d18');
  // curled tail spiraling down then left
  const ty = oy + 18.2;
  px(g, ox - 0.2, ty + 0.6, 4.8, 1.7, '#241d18');
  px(g, ox - 0.8, ty + 2.2, 4, 1.6, '#241d18');
  px(g, ox - 1.2, ty + 3.8, 3.4, 1.6, '#241d18');
  px(g, ox - 1.8, ty + 5.4, 2.8, 1.5, '#241d18');
  px(g, ox + 0.3, ty + 0.9, 3.7, 1.15, spec.mid);
  px(g, ox - 0.3, ty + 2.5, 3.1, 1.1, spec.mid);
  px(g, ox - 0.6, ty + 4, 2.6, 1.05, spec.mid);
  px(g, ox - 1.3, ty + 5.5, 2, 0.85, spec.belly);
  // belly spots
  px(g, ox + 0.6, oy + 8.6, 1.9, 1.9, spec.belly);
  px(g, ox + 0.2, oy + 11.6, 1.9, 1.9, spec.belly);
  g.restore();
}
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }

/* ---------------- Main loop ---------------- */
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  if (document.hidden) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(now / 1000);
}

setButton('Cast', true);
renderLog();
requestAnimationFrame(tick);
