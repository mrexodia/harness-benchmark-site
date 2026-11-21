/* ============================================================
   Tidepool Landing — a tiny cozy fishing game
   All artwork is drawn procedurally in code. No images, no audio.
   ============================================================ */
'use strict';

/* ---------------------------------------------------------
   Canvas setup — 320x180 logical, scaled x4 with no smoothing
   --------------------------------------------------------- */
const W = 320, H = 180;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

/* ---------------------------------------------------------
   Tiny pixel helpers
   --------------------------------------------------------- */
function px(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
function alpha(a) { ctx.globalAlpha = a; }
function noAlpha() { ctx.globalAlpha = 1; }
// deterministic hash for stable scenery
function hash(n) {
  n = (n << 13) ^ n;
  return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
}

/* ---------------------------------------------------------
   Fishing data — original fish, grouped by rarity
   --------------------------------------------------------- */
const RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
const RARITY_COLOR = {
  Common: '#aebcc6', Uncommon: '#6fbf5a', Rare: '#4aa6e0',
  Epic: '#b46ce0', Legendary: '#f0c34a', Ancient: '#46e0c8'
};
const RARITY_FX = {
  Common: 'none', Uncommon: 'none', Rare: 'sparkle',
  Epic: 'sparkle', Legendary: 'rays', Ancient: 'runic'
};

const FISH = {
  Common: [
    { name: 'Mudfin Minnow', len: 12, bodyH: 6, back: '#5e6f45', mid: '#86985a', belly: '#c8d199', fin: '#71824c', accent: '#9fb06a', tail: 'fan', dorsal: 'low', pattern: 'none' },
    { name: 'Silver Sprat',  len: 13, bodyH: 5, back: '#93a7b3', mid: '#c3d3dc', belly: '#eef4f7', fin: '#a9bbc6', accent: '#ffffff', tail: 'fork', dorsal: 'low', pattern: 'none' },
    { name: 'Pebble Goby',   len: 11, bodyH: 7, back: '#6f6049', mid: '#9a8867', belly: '#d6c9a6', fin: '#665742', accent: '#b6a37c', tail: 'round', dorsal: 'spiky', pattern: 'spots' }
  ],
  Uncommon: [
    { name: 'Copper Perch',  len: 14, bodyH: 8, back: '#7d4f24', mid: '#bd7c38', belly: '#e8c07a', fin: '#9c5f28', accent: '#8a5526', tail: 'fan', dorsal: 'spiky', pattern: 'stripes' },
    { name: 'Reed Bass',     len: 15, bodyH: 9, back: '#3f6032', mid: '#6b9346', belly: '#c6d888', fin: '#557b39', accent: '#4d7034', tail: 'fan', dorsal: 'low', pattern: 'bands' },
    { name: 'Moon Carp',     len: 14, bodyH: 8, back: '#6d7aa8', mid: '#a3aed6', belly: '#e6e9f7', fin: '#93a0cb', accent: '#fffbe6', tail: 'fan', dorsal: 'low', pattern: 'none', whisker: true }
  ],
  Rare: [
    { name: 'Azure Snapper', len: 15, bodyH: 9, back: '#234f93', mid: '#3d84d6', belly: '#a8d0f0', fin: '#2f6bbf', accent: '#1e4a88', tail: 'fan', dorsal: 'spiky', pattern: 'stripes' },
    { name: 'Lanternfish',   len: 13, bodyH: 7, back: '#1f3a54', mid: '#33587a', belly: '#7fb0d0', fin: '#2b4d6b', accent: '#ffe08a', tail: 'fork', dorsal: 'low', pattern: 'spots' },
    { name: 'Glassfin Char', len: 14, bodyH: 8, back: '#43705f', mid: '#79ad9a', belly: '#dff0e8', fin: '#6a9a88', accent: '#c9ede0', tail: 'fork', dorsal: 'tall', pattern: 'none' }
  ],
  Epic: [
    { name: 'Stormback Salmon', len: 16, bodyH: 9, back: '#333a68', mid: '#646aae', belly: '#d5d6f0', fin: '#494f8a', accent: '#9fa0ff', tail: 'fan', dorsal: 'spiky', pattern: 'stripes' },
    { name: 'Ruby Grouper',     len: 15, bodyH: 10, back: '#731c2c', mid: '#ad2d3e', belly: '#e88a7a', fin: '#8f202e', accent: '#ffc9b8', tail: 'round', dorsal: 'low', pattern: 'spots' }
  ],
  Legendary: [
    { name: 'Gilded Arowana', len: 17, bodyH: 8, back: '#82631c', mid: '#d6a52a', belly: '#ffe9a0', fin: '#e0b23a', accent: '#fff3c4', tail: 'lyre', dorsal: 'low', pattern: 'net', whisker: true },
    { name: 'Cinder Koi',     len: 15, bodyH: 9, back: '#a83a1c', mid: '#e86f38', belly: '#ffd6ac', fin: '#d4592a', accent: '#fff0d0', tail: 'fan', dorsal: 'low', pattern: 'spots', whisker: true }
  ],
  Ancient: [
    { name: 'Runegill Coelacanth', len: 16, bodyH: 10, back: '#22345a', mid: '#3d7a7a', belly: '#9fe0d0', fin: '#2f5a6a', accent: '#7ff0e0', tail: 'round', dorsal: 'sail', pattern: 'net', glow: true }
  ]
};

/* ============================================================
   Procedural fish sprite builder
   ============================================================ */
function makeFish(def) {
  const p = Object.assign({
    len: 14, bodyH: 8, back: '#888', mid: '#bbb', belly: '#eee',
    fin: '#999', accent: '#fff', outline: '#161d29', tail: 'fan',
    dorsal: 'low', pattern: 'none', eye: 'normal', whisker: false, pectoral: true
  }, def);

  const dorsalH = (p.dorsal === 'tall' || p.dorsal === 'sail') ? 5
                : p.dorsal === 'spiky' ? 4
                : p.dorsal === 'low' ? 2 : 0;

  const Wm = p.len + 14;
  const Hm = p.bodyH + dorsalH + 10;
  const g = Array.from({ length: Hm }, () => Array(Wm).fill(null));
  const x0 = 8;                 // body left edge
  const cy = dorsalH + 4;       // body vertical centre
  const tailLen = 5;

  const put = (x, y, c) => { if (x >= 0 && x < Wm && y >= 0 && y < Hm) g[y][x] = c; };

  /* --- body --- */
  for (let i = 0; i < p.len; i++) {
    const u = (i + 0.5) / p.len;
    let half = Math.round((p.bodyH / 2) * Math.pow(Math.sin(Math.PI * u), 0.5));
    if (half < 1) half = 1;
    for (let dy = -half; dy <= half; dy++) {
      const y = cy + dy;
      const v = (dy + half) / (2 * half);
      const c = v < 0.32 ? p.back : v < 0.72 ? p.mid : p.belly;
      put(x0 + i, y, c);
    }
  }

  /* --- tail --- */
  for (let i = 0; i < tailLen; i++) {
    const t = (tailLen - 1 - i) / (tailLen - 1);   // 1 at tip, 0 at body
    let spread = Math.round((p.bodyH / 2 + 1) * t) + 1;
    const x = x0 - 1 - i;
    for (let dy = -spread; dy <= spread; dy++) {
      if (p.tail === 'fork' && i < 2 && Math.abs(dy) < spread - 1) continue;
      if (p.tail === 'lyre' && i < 2 && Math.abs(dy) < 2) continue;
      if (p.tail === 'round' && i === 0 && Math.abs(dy) === spread) continue;
      put(x, cy + dy, p.fin);
    }
  }

  /* --- dorsal fin --- */
  if (dorsalH > 0) {
    const a = x0 + Math.floor(p.len * 0.40);
    const b = x0 + Math.floor(p.len * 0.80);
    for (let x = a; x <= b; x++) {
      const u = (x - a) / (b - a || 1);
      let hgt;
      if (p.dorsal === 'sail') hgt = Math.round(dorsalH * Math.sin(Math.PI * u));
      else if (p.dorsal === 'spiky') hgt = (x % 2 === 0) ? dorsalH : 1;
      else hgt = Math.max(1, Math.round(dorsalH * (0.35 + 0.65 * Math.sin(Math.PI * u))));
      let top = 0;
      while (top < Hm && g[top][x] === null) top++;
      for (let k = 1; k <= hgt; k++) put(x, top - k, p.fin);
    }
  }

  /* --- pectoral fin --- */
  if (p.pectoral) {
    const x = x0 + Math.floor(p.len * 0.26);
    let bot = Hm - 1;
    while (bot >= 0 && g[bot][x] === null) bot--;
    for (let k = 1; k <= 3; k++) {
      put(x, bot + k, p.fin);
      if (k > 1) put(x + 1, bot + k, p.fin);
    }
  }

  /* --- eye --- */
  const ex = x0 + p.len - 3, ey = cy - 1;
  if (p.eye === 'big') {
    put(ex, ey, '#f4f6fa'); put(ex, ey + 1, '#f4f6fa');
    put(ex + 1, ey, '#20242e'); put(ex + 1, ey + 1, '#20242e');
  } else {
    put(ex, ey, '#f4f6fa'); put(ex + 1, ey, '#20242e');
  }

  /* --- whiskers --- */
  if (p.whisker) {
    put(x0 + p.len, cy + 2, p.outline);
    put(x0 + p.len + 1, cy + 3, p.outline);
    put(x0 + p.len, cy - 1, p.outline);
  }

  /* --- pattern overlay --- */
  for (let y = 0; y < Hm; y++) {
    for (let x = x0; x < x0 + p.len; x++) {
      const c = g[y][x];
      if (!c || c === p.fin) continue;
      const lx = x - x0;
      if (p.pattern === 'stripes' && lx % 3 === 1) g[y][x] = p.accent;
      else if (p.pattern === 'bands' && (y - cy) % 3 === 0) g[y][x] = p.accent;
      else if (p.pattern === 'spots' && ((lx * 3 + y * 5) % 7 === 0)) g[y][x] = p.accent;
      else if (p.pattern === 'net' && ((lx + y) % 3 === 0)) g[y][x] = p.accent;
    }
  }

  /* --- outline --- */
  const edge = [];
  for (let y = 0; y < Hm; y++) {
    for (let x = 0; x < Wm; x++) {
      if (g[y][x]) continue;
      const n = (y > 0 && g[y - 1][x]) || (y < Hm - 1 && g[y + 1][x]) ||
                (x > 0 && g[y][x - 1]) || (x < Wm - 1 && g[y][x + 1]);
      if (n) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) g[y][x] = p.outline;

  /* --- crop to content --- */
  let minX = Wm, minY = Hm, maxX = 0, maxY = 0;
  for (let y = 0; y < Hm; y++)
    for (let x = 0; x < Wm; x++)
      if (g[y][x]) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  const W2 = maxX - minX + 1, H2 = maxY - minY + 1;
  const cg = Array.from({ length: H2 }, () => Array(W2).fill(null));
  for (let y = 0; y < H2; y++)
    for (let x = 0; x < W2; x++)
      cg[y][x] = g[y + minY][x + minX];

  return { g: cg, W: W2, H: H2 };
}

function spriteFor(def) {
  if (!def._sprite) def._sprite = makeFish(def);
  return def._sprite;
}

/* ============================================================
   Reveal-card fish renderer (with per-rarity fx)
   ============================================================ */
const revealFishCv = document.getElementById('revealFish');
function renderRevealFish(def, t) {
  const f = spriteFor(def);
  const S = 6, pad = 20;
  const cw = f.W * S + pad * 2;
  const ch = f.H * S + pad * 2;
  if (revealFishCv.width !== cw || revealFishCv.height !== ch) {
    revealFishCv.width = cw; revealFishCv.height = ch;
  }
  const c = revealFishCv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cw, ch);
  const ox = pad, oy = pad;
  const fx = RARITY_FX[def._rarity || 'Common'];
  const cx = cw / 2, cy = ch / 2;

  /* ---- soft spotlight so the dark outline reads against the card ---- */
  {
    const grd = c.createRadialGradient(cx, cy, 3, cx, cy, Math.max(cw, ch) * 0.62);
    const tint = fx === 'runic' ? '120,230,215' : fx === 'rays' ? '235,205,130' : '185,215,235';
    grd.addColorStop(0, `rgba(${tint},0.13)`);
    grd.addColorStop(1, `rgba(${tint},0)`);
    c.fillStyle = grd;
    c.fillRect(0, 0, cw, ch);
  }

  /* ---- behind-fish effects ---- */
  if (fx === 'rays') {
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.25);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = (f.W * S) / 2 + 26;
      c.fillStyle = i % 2 ? 'rgba(255,220,140,.10)' : 'rgba(255,245,200,.05)';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a - 0.12) * len, Math.sin(a - 0.12) * len);
      c.lineTo(Math.cos(a + 0.12) * len, Math.sin(a + 0.12) * len);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  if (fx === 'runic') {
    c.save();
    c.translate(cx, cy);
    const r = (Math.max(f.W, f.H) * S) / 2 + 10;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.4;
      const x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r);
      const pulse = 0.35 + 0.35 * Math.sin(t * 3 + i);
      c.fillStyle = `rgba(120,255,235,${pulse.toFixed(3)})`;
      c.fillRect(x - 1, y - 1, 3, 3);
      c.fillRect(x - 3, y - 3, 1, 1);
      c.fillRect(x + 2, y + 2, 1, 1);
    }
    c.restore();
  }
  if (def.glow) {
    // tight pixel halo that follows the silhouette
    const halo = Array.from({ length: f.H }, () => Array(f.W).fill(false));
    for (let y = 0; y < f.H; y++)
      for (let x = 0; x < f.W; x++)
        if (f.g[y][x])
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < f.W && ny >= 0 && ny < f.H) halo[ny][nx] = true;
            }
    c.save();
    c.globalAlpha = 0.30 + 0.12 * Math.sin(t * 2);
    c.fillStyle = '#7ff0e0';
    for (let y = 0; y < f.H; y++)
      for (let x = 0; x < f.W; x++)
        if (halo[y][x] && !f.g[y][x]) c.fillRect(ox + x * S, oy + y * S, S, S);
    c.restore();
  }

  /* ---- drop shadow (offset silhouette) ---- */
  const shCtx = c;
  shCtx.save();
  shCtx.globalAlpha = 0.22;
  for (let y = 0; y < f.H; y++)
    for (let x = 0; x < f.W; x++) {
      const col = f.g[y][x];
      if (!col) continue;
      shCtx.fillStyle = '#000';
      shCtx.fillRect(ox + x * S + 3, oy + y * S + 5, S, S);
    }
  shCtx.restore();

  /* ---- the fish ---- */
  for (let y = 0; y < f.H; y++)
    for (let x = 0; x < f.W; x++) {
      const col = f.g[y][x];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(ox + x * S, oy + y * S, S, S);
    }

  /* ---- sparkles ---- */
  if (fx === 'sparkle' || fx === 'rays' || fx === 'runic') {
    const count = fx === 'sparkle' ? 7 : 10;
    for (let i = 0; i < count; i++) {
      const a = hash(i * 37 + Math.floor(t * 2) * 91);
      const b = hash(i * 57 + Math.floor(t * 2) * 13 + 7);
      const x = Math.round(pad + a * (cw - pad * 2));
      const y = Math.round(pad + b * (ch - pad * 2));
      const s = 1 + Math.round(hash(i * 7) * 2);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 4 + i));
      c.fillStyle = fx === 'runic'
        ? `rgba(150,255,240,${tw.toFixed(3)})`
        : fx === 'rays'
          ? `rgba(255,240,180,${tw.toFixed(3)})`
          : `rgba(220,180,255,${tw.toFixed(3)})`;
      c.fillRect(x - s, y, s * 2 + 1, 1);
      c.fillRect(x, y - s, 1, s * 2 + 1);
    }
  }
}

/* ============================================================
   window.fishing test interface
   ============================================================ */
let phase = 'ready';                  // ready | waiting | bite | reeling | reveal
const fishing = {
  get state() { return phase; },
  pickRarity(u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  },
  log: []                             // newest first
};
window.fishing = fishing;

/* ============================================================
   Game state / timers
   ============================================================ */
const S = { READY: 'ready', WAITING: 'waiting', BITE: 'bite', REELING: 'reeling', REVEAL: 'reveal' };

const CAST_DUR = 0.55;
const BITE_WINDOW = 1.7;
const REEL_DUR = 1.25;
const REVEAL_AUTO = 2.4;

let time = 0;
let stateT = 0;
let waitTimer = 0;
let biteTimer = 0;
let reelT = 0;
let revealTimer = 0;
let toastTimer = 0;

// scene anchors
const angler = { x: 142, footY: 150 };
const rod = { baseX: 148, baseY: 139, tipX: 178, tipY: 106 };
let bobberHome = { x: 236, y: 118 };
let bobber = { x: 236, y: 118 };
let castFrom = { x: 0, y: 0 };
let lastCatch = null;

function setPhase(p) { phase = p; stateT = 0; }

function toReady() {
  setPhase(S.READY);
  hideReveal();
  updateHud();
}

function doCast() {
  if (phase !== S.READY) return;
  bobberHome = {
    x: 205 + Math.floor(Math.random() * 85),
    y: 72 + Math.floor(Math.random() * 62)
  };
  castFrom = { x: rod.tipX, y: rod.tipY };
  bobber = { x: castFrom.x, y: castFrom.y };
  waitTimer = 2.3 + Math.random() * 1.7;
  setPhase(S.WAITING);
  updateHud();
}

function startBite() {
  setPhase(S.BITE);
  biteTimer = BITE_WINDOW;
  updateHud();
}

function miss() {
  toastTimer = 1.4;
  setPhase(S.READY);
  bobber = { x: rod.tipX, y: rod.tipY };
  updateHud();
}

function startReel() {
  setPhase(S.REELING);
  reelT = 0;
  updateHud();
}

function finishReel() {
  const rarity = window.fishing.pickRarity(Math.random());
  const pool = FISH[rarity] || FISH.Common;
  const def = pool[Math.floor(Math.random() * pool.length)];
  def._rarity = rarity;
  lastCatch = { name: def.name, rarity, def };
  window.fishing.log.unshift({ name: def.name, rarity });
  updateLog(true);
  showReveal(def, rarity);
  setPhase(S.REVEAL);
  revealTimer = REVEAL_AUTO;
  updateHud();
}

function action() {
  if (phase === S.READY) { doCast(); return; }
  if (phase === S.BITE) { startReel(); return; }
  if (phase === S.REVEAL) { toReady(); return; }
  if (phase === S.WAITING || phase === S.REELING) return; // ignore
}

function update(dt) {
  time += dt;
  stateT += dt;
  if (toastTimer > 0) toastTimer -= dt;

  if (phase === S.WAITING) {
    const u = Math.min(1, stateT / CAST_DUR);
    if (u < 1) {
      // arc from rod tip to bobber home
      bobber.x = castFrom.x + (bobberHome.x - castFrom.x) * u;
      bobber.y = castFrom.y + (bobberHome.y - castFrom.y) * u - Math.sin(Math.PI * u) * 34;
    } else {
      bobber.x = bobberHome.x;
      bobber.y = bobberHome.y + Math.sin(time * 2.4) * 1.2;
      waitTimer -= dt;
      if (waitTimer <= 0) startBite();
    }
  } else if (phase === S.BITE) {
    biteTimer -= dt;
    // agitated dip
    bobber.x = bobberHome.x + Math.sin(time * 22) * 1.2;
    bobber.y = bobberHome.y + 2 + Math.sin(time * 18) * 2.2;
    if (biteTimer <= 0) miss();
  } else if (phase === S.REELING) {
    reelT += dt;
    const u = Math.min(1, reelT / REEL_DUR);
    bobber.x = bobberHome.x + (rod.tipX - bobberHome.x) * u;
    bobber.y = bobberHome.y + (rod.tipY - bobberHome.y) * u - Math.sin(Math.PI * u) * 22;
    if (reelT >= REEL_DUR) finishReel();
  } else if (phase === S.REVEAL) {
    revealTimer -= dt;
    if (revealTimer <= 0) toReady();
  }
}

/* ============================================================
   Rendering — the scene
   ============================================================ */

/* ---- sky ---- */
function drawSky() {
  const bands = [
    [0, '#57a4cd'], [12, '#6cb3d6'], [24, '#88c3dc'], [34, '#a6d3e1'],
    [42, '#c6dfdc'], [47, '#ecddb0']
  ];
  for (let i = 0; i < bands.length; i++) {
    const y = bands[i][0];
    const y2 = i < bands.length - 1 ? bands[i + 1][0] : 50;
    px(0, y, W, y2 - y, bands[i][1]);
  }
  // sun
  alpha(0.9);
  px(250, 16, 12, 12, '#fff0b8');
  px(248, 18, 16, 8, '#fff0b8');
  px(252, 14, 8, 16, '#fff0b8');
  alpha(0.5);
  px(246, 14, 20, 16, '#ffe9a0');
  noAlpha();
  px(252, 18, 8, 8, '#fffbe4');

  drawClouds();
  drawBirds();
  drawIsland();
}

function drawBirds() {
  const birds = [
    { x: 70, y: 22, sp: 6, ph: 0 },
    { x: 150, y: 34, sp: 4.5, ph: 1.4 }
  ];
  for (const bd of birds) {
    const x = ((bd.x + time * bd.sp) % (W + 40)) - 20;
    const flap = Math.sin(time * 5 + bd.ph);
    const y = bd.y + flap * 1.2;
    alpha(0.65);
    px(x - 3, y - 1, 2, 1, '#3f5260');
    px(x - 1, y, 2, 1, '#3f5260');
    px(x + 2, y - 1, 2, 1, '#3f5260');
    px(x + 1, y + (flap > 0 ? -1 : 1), 1, 1, '#3f5260');
    noAlpha();
  }
}

function drawClouds() {
  const clouds = [
    { x: 30, y: 12, s: 1.0, sp: 2.5 },
    { x: 150, y: 22, s: 0.8, sp: 1.7 },
    { x: 230, y: 8, s: 0.6, sp: 3.1 }
  ];
  for (const cl of clouds) {
    let x = (cl.x + time * cl.sp) % (W + 60) - 30;
    const y = cl.y;
    const s = cl.s;
    alpha(0.92);
    const c = '#f7fbfd', sh = '#d3e4ec';
    px(x, y + 3 * s, 22 * s, 5 * s, c);
    px(x + 4 * s, y, 12 * s, 8 * s, c);
    px(x + 2 * s, y + 4 * s, 18 * s, 5 * s, sh);
    px(x + 5 * s, y + 1 * s, 9 * s, 5 * s, '#ffffff');
    // drifting small puff
    px(x + 20 * s, y + 4 * s, 8 * s, 4 * s, c);
    noAlpha();
  }
}

function drawIsland() {
  // distant island to the right on the horizon
  const bx = 262, by = 50;
  px(bx, by - 6, 34, 6, '#3e6b6b');
  px(bx + 3, by - 10, 8, 6, '#356060');
  px(bx + 12, by - 9, 6, 5, '#356060');
  px(bx + 22, by - 12, 9, 8, '#3e6b6b');
  px(bx + 24, by - 15, 2, 4, '#3e6b6b');
  // palm
  px(bx + 25, by - 18, 1, 5, '#2a4d4d');
  px(bx + 22, by - 20, 7, 1, '#2f5a4a');
  px(bx + 21, by - 19, 3, 1, '#2f5a4a');
  px(bx + 26, by - 19, 3, 1, '#2f5a4a');
  // haze
  alpha(0.35); px(bx - 4, by - 2, 44, 2, '#bfe3ea'); noAlpha();
}

/* ---- water ---- */
function drawWater() {
  const bands = [
    [50, '#6fb0cb'], [56, '#62a3c2'], [64, '#5598ba'], [74, '#4a8cb0'],
    [86, '#4180a6'], [100, '#3a769c'], [116, '#336c93'], [134, '#2d638a'],
    [154, '#285b81'], [170, '#235478']
  ];
  for (let i = 0; i < bands.length; i++) {
    const y = bands[i][0];
    const y2 = i < bands.length - 1 ? bands[i + 1][0] : H;
    px(0, y, W, y2 - y, bands[i][1]);
  }
  // horizon shimmer
  alpha(0.7); px(0, 50, W, 1, '#c6e8ee'); noAlpha();

  // sun glints trailing down the water
  for (let i = 0; i < 10; i++) {
    const yy = 52 + i * 4;
    const w = 12 - i * 0.8;
    if (w <= 2) break;
    alpha(0.22 * (1 - i / 11));
    const gx = 246 + Math.sin(time * 1.6 + i * 1.3) * 2.5;
    px(gx, yy, w, 1, '#ffeeba');
    px(gx + 4, yy + 2, Math.max(2, w - 5), 1, '#fff6d8');
    noAlpha();
  }

  // moving wave dashes
  for (let row = 0; row < 12; row++) {
    const yy = 56 + row * 10;
    const speed = 5 + row * 0.8;
    const off = (time * speed + row * 17) % 48;
    const shade = row % 3 === 0 ? '#8ec6dd' : row % 3 === 1 ? '#6faece' : '#5fa0c2';
    alpha(0.5);
    for (let x = -48; x < W + 8; x += 10) {
      const xx = x + off;
      const wob = Math.sin(xx * 0.07 + time * 1.1 + row) * 1.6;
      px(xx, yy + wob, 4, 1, shade);
    }
    alpha(0.28);
    for (let x = -48; x < W + 8; x += 16) {
      const xx = x + off * 0.6 + 5;
      const wob = Math.sin(xx * 0.09 + time * 0.9 + row) * 1.4;
      px(xx, yy + wob + 3, 3, 1, '#bfe6ee');
    }
    noAlpha();
  }

  // sparkles
  for (let i = 0; i < 22; i++) {
    const sx = Math.floor(hash(i * 13) * W);
    const sy = 56 + Math.floor(hash(i * 29 + 5) * 118);
    const tw = Math.sin(time * 2.2 + i * 1.7);
    if (tw > 0.55) {
      const c = tw > 0.9 ? '#eafaff' : '#a9dcec';
      px(sx, sy, 1, 1, c);
      if (tw > 0.85) { px(sx - 1, sy, 1, 1, c); px(sx + 1, sy, 1, 1, c); px(sx, sy - 1, 1, 1, c); px(sx, sy + 1, 1, 1, c); }
    }
  }

  // ripples around bobber when it floats
  if (phase === S.WAITING && stateT > CAST_DUR) {
    drawRipples(bobber.x, bobber.y + 1, time * 1.4, '#bfe6ee', 1);
  }
  if (phase === S.BITE) {
    drawRipples(bobber.x, bobber.y + 1, time * 3.5, '#e8f6fa', 2);
  }
  if (phase === S.REELING) {
    drawRipples(bobberHome.x, bobberHome.y + 1, time * 4, '#dff2f6', 2);
  }
}

/* ---- splash burst at the hook point while reeling ---- */
function drawSplash(x, y) {
  if (phase !== S.REELING) return;
  const age = Math.min(1, reelT / 0.5);
  if (age >= 1) return;
  const fade = 1 - age;
  for (let i = 0; i < 12; i++) {
    const a = hash(i * 13 + 3) * Math.PI * 2;
    const sp = 9 + hash(i * 7 + 1) * 16;
    const dx = Math.cos(a) * sp * age;
    const dy = Math.sin(a) * sp * age * 0.55 - 14 * age * (0.5 + hash(i));
    alpha(fade * 0.9);
    px(x + dx, y + dy, 1 + (i % 2), 1, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#dff2f6' : '#bfe6ee');
    noAlpha();
  }
  // bright splash crown at the surface
  alpha(fade * 0.8);
  px(x - 4, y - 1, 9, 1, '#ffffff');
  px(x - 2, y - 2, 5, 1, '#e8f8fc');
  noAlpha();
}

function drawRipples(x, y, t, color, strength) {
  for (let i = 0; i < 3; i++) {
    const p = ((t + i * 0.33) % 1);
    const r = 2 + p * 9;
    alpha((1 - p) * 0.5 * strength);
    // pixel ellipse ring
    px(x - r, y, 2, 1, color);
    px(x + r - 1, y, 2, 1, color);
    px(x, y - r * 0.5, 1, 1, color);
    px(x, y + r * 0.5, 1, 1, color);
    px(x - r * 0.7, y - r * 0.4, 1, 1, color);
    px(x + r * 0.7, y - r * 0.4, 1, 1, color);
    px(x - r * 0.7, y + r * 0.4, 1, 1, color);
    px(x + r * 0.7, y + r * 0.4, 1, 1, color);
    noAlpha();
  }
}

/* ---- background bank on the far left (gives the tree ground) ---- */
function drawFarBank() {
  const top = 54, bot = 110;
  for (let y = top; y < bot; y++) {
    const t = (y - top) / (bot - top);
    let w = 16 + t * 64 + Math.sin(y * 0.33) * 4 + Math.sin(y * 0.11) * 4;
    w = Math.round(w);
    const c = t < 0.4 ? '#3a5f32' : t < 0.75 ? '#345a2c' : '#2f5228';
    px(0, y, w, 1, c);
    px(0, y, Math.max(0, w - 1), 1, t < 0.5 ? '#416a37' : '#38602f');
    // shaded waterline edge
    px(w - 1, y, 1, 1, '#24421f');
  }
  // sunlit rim along the top
  alpha(0.55);
  px(0, top, 17, 2, '#548c46');
  px(0, top + 2, 24, 1, '#4a7d3c');
  noAlpha();
  // clumps of foliage on the bank
  drawBush(44, 72, 0.8, '#28471f', '#356b30', '#458038');
  drawBush(6, 68, 0.7, '#28471f', '#356b30', '#458038');
  for (let i = 0; i < 26; i++) {
    const y = top + 4 + Math.floor(hash(i * 3) * (bot - top - 8));
    const t = (y - top) / (bot - top);
    const e = Math.round(15 + t * 62);
    const x = Math.floor(hash(i * 7 + 2) * e);
    px(x, y, 1, 2, hash(i) > 0.5 ? '#4a7d3c' : '#2b5226');
  }
}

 /* ---- scattered rocks in the foreground water ---- */
function drawRocks() {
  const rocks = [[212, 166, 11, 7], [236, 174, 14, 8], [260, 164, 8, 5], [196, 176, 9, 6]];
  for (const [x, y, w, h] of rocks) {
    px(x, y - h, w, h, '#5f666e');
    px(x, y - h, w, 2, '#7b838c');
    px(x + Math.floor(w * 0.25), y - h - 1, Math.ceil(w * 0.5), 1, '#7b838c');
    px(x + 1, y - h + 2, 2, 1, '#4a7a42');
    px(x + w - 3, y - h + 3, 1, 1, '#4a7a42');
    alpha(0.28);
    px(x - 1, y, w + 2, 2, '#0f2028');
    noAlpha();
  }
}

/* ---- land ---- */
function landEdge(y) {
  // wavy diagonal shoreline: land on the left, water on the right
  let e = 116 + Math.sin((y - 100) * 0.16) * 7 + Math.sin((y - 100) * 0.5) * 1.5;
  if (y > 148) e += (y - 148) * 0.9;
  return Math.round(e);
}

function drawLand() {
  for (let y = 96; y < H; y++) {
    const e = landEdge(y);
    // grass
    px(0, y, e, 1, '#456f34');
    // top-lit grass
    px(0, y, Math.max(0, e - 6), 1, '#4f7d3b');
    // sand strip along the water
    px(e - 5, y, 5, 1, '#cdb078');
    px(e - 3, y, 3, 1, '#e0c48e');
    px(e - 1, y, 1, 1, '#f0dcae');
  }
  // soil shadow at the very bottom
  for (let y = 168; y < H; y++) px(0, y, landEdge(y), 1, '#2f4d26');

  // grass texture tufts
  for (let i = 0; i < 90; i++) {
    const y = 100 + Math.floor(hash(i * 3) * 78);
    const e = landEdge(y);
    const x = Math.floor(hash(i * 7 + 1) * (e - 8));
    const c = hash(i) > 0.5 ? '#5c9048' : '#39602c';
    px(x, y, 1, 2, c);
    if (hash(i * 11) > 0.6) px(x + 1, y + 1, 1, 1, c);
  }
  // flowers
  const flowerCols = ['#f2d0e0', '#f7e08a', '#e88a6a', '#c9a6e8'];
  for (let i = 0; i < 14; i++) {
    const y = 104 + Math.floor(hash(i * 17) * 62);
    const x = Math.floor(hash(i * 23 + 4) * (landEdge(y) - 16));
    const c = flowerCols[i % flowerCols.length];
    px(x, y, 1, 2, '#3f6b30');
    px(x - 1, y - 1, 1, 1, c);
    px(x + 1, y - 1, 1, 1, c);
    px(x, y - 2, 1, 1, c);
    px(x, y - 1, 1, 1, '#fff2c0');
  }
}

function drawTree() {
  const bx = 26, by = 118;
  // trunk
  px(bx - 3, by - 34, 7, 36, '#5a3d22');
  px(bx - 3, by - 34, 2, 36, '#6d4b2a');
  px(bx + 1, by - 34, 1, 36, '#432c18');
  // branches
  px(bx + 3, by - 30, 8, 3, '#5a3d22');
  px(bx - 10, by - 26, 8, 3, '#5a3d22');
  // canopy (layered blobs)
  const blobs = [
    [bx - 2, by - 58, 30, 20, '#2f5a2a'],
    [bx - 8, by - 70, 22, 20, '#356b30'],
    [bx + 8, by - 68, 22, 20, '#356b30'],
    [bx - 14, by - 60, 20, 18, '#2b5226'],
    [bx + 10, by - 58, 20, 18, '#2b5226'],
    [bx - 6, by - 78, 26, 18, '#3f7d38'],
    [bx + 4, by - 76, 18, 14, '#4a8c3f'],
    [bx - 12, by - 72, 14, 12, '#4a8c3f'],
    [bx + 2, by - 82, 16, 10, '#549a46']
  ];
  for (const b of blobs) px(b[0], b[1], b[2], b[3], b[4]);
  // canopy highlights
  alpha(0.7);
  px(bx - 4, by - 80, 18, 3, '#69b055');
  px(bx - 10, by - 74, 10, 3, '#69b055');
  px(bx + 10, by - 72, 9, 3, '#69b055');
  noAlpha();
  // canopy shadow on the grass
  alpha(0.22);
  px(bx - 12, by - 2, 36, 4, '#1c3416');
  noAlpha();
}

function drawBush(x, y, s, dark, mid, lite) {
  px(x, y - 10 * s, 22 * s, 10 * s, dark);
  px(x + 2 * s, y - 14 * s, 18 * s, 8 * s, mid);
  px(x + 1 * s, y - 8 * s, 20 * s, 6 * s, mid);
  px(x + 4 * s, y - 15 * s, 8 * s, 4 * s, lite);
  px(x + 2 * s, y - 12 * s, 5 * s, 3 * s, lite);
  // berries
  for (let i = 0; i < 4; i++) {
    px(x + (3 + i * 4) * s, y - (12 - (i % 2) * 3) * s, 2, 2, '#d65a5a');
  }
}

function drawReeds() {
  const base = 108;
  for (let i = 0; i < 16; i++) {
    const x = 96 + i * 3 + Math.sin(time * 1.2 + i) * 0.8;
    const h = 20 + hash(i * 5) * 22;
    const sway = Math.sin(time * 1.1 + i * 0.7) * 2.5;
    const y = 150;
    for (let k = 0; k < h; k++) {
      const c = k % 5 === 0 ? '#5f8a3f' : '#4a7132';
      px(x + sway * (k / h), y - k, 1, 1, c);
    }
    if (hash(i * 9) > 0.55) {
      // cattail
      px(x + sway, y - h - 6, 2, 6, '#6b4a2a');
      px(x + sway, y - h - 7, 1, 1, '#8a6238');
    }
  }
}

function drawForeground() {
  // drifting leaf on the water
  {
    const lx = ((time * 6) % (W + 30)) - 15;
    const ly = 158 + Math.sin(time * 1.4) * 1.5;
    if (lx > landEdge(ly | 0) + 4) {
      px(lx, ly, 5, 2, '#4f7d3b');
      px(lx + 1, ly - 1, 3, 1, '#69a84f');
      px(lx + 4, ly, 1, 1, '#3a6029');
      alpha(0.25); px(lx, ly + 2, 6, 1, '#0f2028'); noAlpha();
    }
  }
  // hovering dragonfly by the reeds
  {
    const dx = Math.round(104 + Math.sin(time * 0.7) * 11);
    const dy = Math.round(118 + Math.sin(time * 2.3) * 3);
    px(dx, dy, 1, 3, '#3aa6c8');
    px(dx, dy + 3, 1, 1, '#1f6f8c');
    alpha(0.7);
    px(dx - 3, dy - 2, 3, 1, '#cfeef4');
    px(dx + 1, dy - 2, 3, 1, '#cfeef4');
    noAlpha();
  }
  // lily pads
  const pads = [[150, 170], [176, 176], [204, 168]];
  for (const [x, y] of pads) {
    px(x - 6, y - 2, 13, 4, '#2f5a30');
    px(x - 6, y - 3, 13, 1, '#3f7a3a');
    px(x - 4, y - 4, 8, 1, '#4a8c3f');
    px(x, y - 1, 1, 3, '#1f3f22'); // notch
    // flower
    px(x + 2, y - 6, 2, 3, '#f2b8d0');
    px(x + 1, y - 7, 4, 2, '#f7d0e0');
    px(x + 2, y - 8, 2, 1, '#fff0f6');
  }
  // grass blades in the extreme foreground
  const blades = [[6, 180, 26, 9], [40, 180, 20, 13], [70, 180, 16, 17]];
  for (let b = 0; b < blades.length; b++) {
    const [bx, by, h, o] = blades[b];
    const sway = Math.sin(time * 0.9 + b) * 2;
    for (let k = 0; k < h; k++) {
      const t = k / h;
      const x = bx + sway * t + Math.sin(t * 3) * 2;
      px(x, by - k, 2, 1, k > h - 4 ? '#6fae4f' : '#3f6b2c');
    }
  }
}

/* ---- dock & props ---- */
function drawDock() {
  // support posts
  px(96, 148, 4, 22, '#4a3320');
  px(96, 148, 1, 22, '#63482e');
  px(144, 148, 4, 24, '#4a3320');
  px(144, 148, 1, 24, '#63482e');
  px(182, 148, 4, 20, '#4a3320');
  px(182, 148, 1, 20, '#63482e');
  // post reflection
  alpha(0.2);
  px(96, 160, 4, 14, '#1c2c34');
  px(144, 162, 4, 14, '#1c2c34');
  px(182, 160, 4, 12, '#1c2c34');
  noAlpha();

  // deck planks
  for (let x = 92; x < 190; x += 9) {
    const w = Math.min(8, 190 - x);
    px(x, 138, w, 11, '#a37c4a');
    px(x, 138, w, 2, '#c39a60');
    px(x, 147, w, 2, '#7a5a30');
    px(x + w - 1, 138, 1, 11, '#6e5029'); // gap shadow
    // plank nail
    px(x + 2, 140, 1, 1, '#5c421f');
  }
  // front lip
  px(90, 136, 102, 3, '#6f5230');
  px(90, 136, 102, 1, '#8a6a3f');
  // shadow of dock on water
  alpha(0.18);
  px(94, 149, 100, 5, '#12222c');
  noAlpha();
}

function drawBucket() {
  const x = 168, y = 136;
  px(x, y - 9, 10, 9, '#6b707a');
  px(x, y - 9, 10, 2, '#828a95');
  px(x, y - 2, 10, 2, '#565b64');
  px(x + 1, y - 10, 8, 1, '#828a95');
  px(x + 2, y - 12, 6, 2, '#4a4e56');
  // rope handle
  px(x + 2, y - 14, 6, 1, '#c9a86a');
  // glint
  px(x + 1, y - 7, 1, 4, '#9aa2ad');
}

function drawTackleBox() {
  const x = 122, y = 138;
  px(x, y - 7, 12, 7, '#8a3b2a');
  px(x, y - 8, 12, 1, '#a8503a');
  px(x, y - 3, 12, 1, '#652a1c');
  px(x + 5, y - 6, 2, 3, '#e0b23a');
  px(x + 1, y - 6, 1, 5, '#652a1c');
}

/* ---- angler ---- */
function drawAngler() {
  const ax = angler.x, fy = angler.footY;
  // shadow
  alpha(0.25);
  px(ax - 6, fy - 1, 14, 3, '#101c20');
  noAlpha();

  // boots
  px(ax - 4, fy - 2, 5, 2, '#2b3444');
  px(ax + 1, fy - 2, 5, 2, '#2b3444');
  // legs
  px(ax - 4, fy - 6, 3, 4, '#3b4a63');
  px(ax + 1, fy - 6, 3, 4, '#3b4a63');
  // torso: shirt
  px(ax - 5, fy - 13, 11, 8, '#c85b3a');
  px(ax - 5, fy - 13, 11, 2, '#da6f4a');
  // overalls
  px(ax - 4, fy - 10, 9, 4, '#4a6ea8');
  px(ax - 4, fy - 10, 9, 1, '#5c82bd');
  px(ax - 3, fy - 13, 2, 3, '#4a6ea8');
  px(ax + 2, fy - 13, 2, 3, '#4a6ea8');
  // buttons
  px(ax - 3, fy - 7, 1, 1, '#e0b23a');
  px(ax + 3, fy - 7, 1, 1, '#e0b23a');
  // arm + hand
  px(ax + 3, fy - 12, 4, 3, '#c85b3a');
  px(ax + 6, fy - 11, 3, 3, '#e8b48a');
  // head
  px(ax - 3, fy - 18, 7, 5, '#e8b48a');
  px(ax - 3, fy - 18, 7, 1, '#f0c39a');
  px(ax - 4, fy - 16, 1, 2, '#d8a47c');   // ear
  px(ax + 2, fy - 16, 1, 1, '#3a2a20');   // eye
  px(ax + 4, fy - 16, 1, 1, '#d8a47c');   // nose hint
  // straw hat
  px(ax - 7, fy - 20, 15, 2, '#d8b768');  // brim
  px(ax - 7, fy - 20, 15, 1, '#e8cb82');
  px(ax - 4, fy - 23, 9, 4, '#e2c377');   // crown
  px(ax - 4, fy - 23, 9, 1, '#f0d58e');
  px(ax - 4, fy - 21, 9, 1, '#b8934d');   // band
  // rod: line from hand up-right
  drawRod();
}

function drawRod() {
  const bx = rod.baseX, by = rod.baseY;
  const tx = rod.tipX, ty = rod.tipY;
  // bend the tip slightly while reeling
  const bend = phase === S.REELING ? Math.sin(Math.min(1, reelT / REEL_DUR) * Math.PI) * 6 : 0;
  const ex = tx - bend, ey = ty + bend * 0.6;
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // slight quadratic curve
    const x = bx + (ex - bx) * t;
    const y = by + (ey - by) * t - Math.sin(Math.PI * t) * 2;
    const c = t < 0.5 ? '#7a5230' : t < 0.85 ? '#8a6238' : '#5c3f22';
    px(x, y, 2, 2, c);
  }
  // rod tip
  px(ex, ey, 2, 2, '#e0c070');
}

function drawLineAndBobber() {
  // line only when cast
  if (phase === S.WAITING || phase === S.BITE || phase === S.REELING) {
    const bx = rod.baseX + (rod.tipX - rod.baseX) * 1.02;
    const by = rod.tipY - 1;
    const tx = bobber.x, ty = bobber.y;
    // sagging line
    const seg = 30;
    alpha(0.85);
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const x = bx + (tx - bx) * t;
      const sag = Math.sin(Math.PI * t) * (phase === S.REELING ? 1.5 : 5.5);
      const y = by + (ty - by) * t + sag;
      px(x, y, 1, 1, 'rgba(235,245,255,.75)');
    }
    noAlpha();
  }

  // bobber
  const showBobber = (phase === S.WAITING && stateT > 0.12) || phase === S.BITE || phase === S.REELING;
  if (!showBobber) return;
  const x = Math.round(bobber.x), y = Math.round(bobber.y);
  const dip = phase === S.BITE ? 1 : 0;
  // shadow on water
  alpha(0.2);
  px(x - 3, y + 4, 7, 2, '#0f2028');
  noAlpha();
  // body
  px(x - 3, y - 2, 7, 5, '#f4f4f0');
  px(x - 3, y - 2, 7, 1, '#ffffff');
  px(x - 3, y + 1, 7, 2, '#d8d8d2');
  px(x - 3, y - 2 + dip, 7, 2, '#e23a2e'); // red top
  px(x - 3, y - 2 + dip, 7, 1, '#ff6a58');
  // antenna
  px(x, y - 5, 1, 3, '#d8d8d2');
  px(x, y - 6, 1, 1, '#e23a2e');
  // highlight
  px(x - 2, y - 1 + dip, 1, 1, '#ffffff');
}

/* ---- bite indicator ---- */
function drawBiteCue() {
  if (phase !== S.BITE) return;
  const x = Math.round(bobber.x), y = Math.round(bobber.y);
  const p = 1 - biteTimer / BITE_WINDOW; // 0..1 window progress

  // shrinking ring around the bobber
  const r = 13 - p * 10;
  const col = p > 0.7 ? '#ff5a44' : p > 0.4 ? '#ffb43a' : '#ffe27a';
  const ring = [
    [x - r, y - 1], [x + r - 1, y - 1], [x - 1, y - r], [x - 1, y + r - 1],
    [x - r * 0.7, y - r * 0.7], [x + r * 0.7, y - r * 0.7],
    [x - r * 0.7, y + r * 0.7], [x + r * 0.7, y + r * 0.7]
  ];
  for (const [rx, ry] of ring) px(rx, ry, 2, 2, col);

  // exclamation mark above the bobber
  const by = y - 20 + Math.sin(time * 22) * 1.5;
  alpha(0.95);
  px(x - 1, by - 8, 4, 8, '#3a0d08');
  px(x, by - 7, 2, 6, '#ff5a44');
  px(x, by - 1, 4, 4, '#3a0d08');
  px(x + 1, by, 2, 2, '#ff5a44');
  noAlpha();
  // little pop flash
  if (p < 0.18) {
    alpha(0.8 * (1 - p / 0.18));
    px(x - 2, y - 4, 6, 6, '#ffd0c0');
    noAlpha();
  }
}

/* ---- splice everything ---- */
function renderScene() {
  ctx.clearRect(0, 0, W, H);
  drawSky();
  drawWater();
  drawSplash(bobberHome.x, bobberHome.y);
  drawFarBank();
  drawLand();
  drawTree();
  drawBush(74, 128, 1.2, '#2b5226', '#39702f', '#4a8c3f');
  drawBush(96, 140, 0.9, '#2b5226', '#39702f', '#4a8c3f');
  drawReeds();
  drawRocks();
  drawDock();
  drawTackleBox();
  drawBucket();
  drawAngler();
  drawLineAndBobber();
  drawBiteCue();
  drawForeground();

  // subtle vignette
  alpha(0.10);
  px(0, 0, W, 4, '#08121a'); px(0, H - 4, W, 4, '#08121a');
  px(0, 0, 4, H, '#08121a'); px(W - 4, 0, 4, H, '#08121a');
  noAlpha();

  // miss toast
  if (toastTimer > 0 && phase === S.READY) {
    const a = Math.min(1, toastTimer / 0.4);
    alpha(a);
    ctx.fillStyle = 'rgba(10,16,22,.8)';
    ctx.fillRect(96, 58, 128, 18);
    px(96, 58, 128, 1, '#6b7f8f');
    px(96, 75, 128, 1, '#6b7f8f');
    ctx.fillStyle = '#cfd8de';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('It slipped off the hook...', 160, 71);
    ctx.textAlign = 'left';
    noAlpha();
  }
}

/* ============================================================
   HUD / DOM
   ============================================================ */
const promptEl = document.getElementById('prompt');
const actionBtn = document.getElementById('actionBtn');
const logList = document.getElementById('logList');
const revealEl = document.getElementById('reveal');
const revealCard = document.getElementById('revealCard');
const revealRarity = document.getElementById('revealRarity');
const revealName = document.getElementById('revealName');

// legend
(function buildLegend() {
  const list = document.getElementById('legendList');
  const odds = { Common: '45%', Uncommon: '25%', Rare: '15%', Epic: '8%', Legendary: '5%', Ancient: '2%' };
  for (const r of RARITY) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${RARITY_COLOR[r]}"></span>${r}<span class="odds">${odds[r]}</span>`;
    list.appendChild(li);
  }
})();

function updateHud() {
  promptEl.classList.remove('bite', 'toast');
  actionBtn.classList.remove('pulse', 'disabled');
  if (phase === S.READY) {
    promptEl.innerHTML = 'Press <b>SPACE</b> to cast';
    actionBtn.textContent = 'Cast';
  } else if (phase === S.WAITING) {
    promptEl.textContent = 'Waiting for a bite\u2026';
    actionBtn.textContent = 'Wait\u2026';
    actionBtn.classList.add('disabled');
  } else if (phase === S.BITE) {
    promptEl.innerHTML = 'BITE! Press <b>SPACE</b>';
    promptEl.classList.add('bite');
    actionBtn.textContent = 'Reel!';
    actionBtn.classList.add('pulse');
  } else if (phase === S.REELING) {
    promptEl.textContent = 'Reeling in\u2026';
    actionBtn.textContent = 'Reeling\u2026';
    actionBtn.classList.add('disabled');
  } else if (phase === S.REVEAL) {
    promptEl.textContent = 'Nice catch!';
    actionBtn.textContent = 'Next cast';
  }
}

function updateLog(animate) {
  const entries = window.fishing.log.slice(0, 8);
  if (entries.length === 0) {
    logList.innerHTML = '<li class="empty">Nothing yet\u2026</li>';
    return;
  }
  logList.innerHTML = '';
  entries.forEach((e, i) => {
    const li = document.createElement('li');
    if (animate && i === 0) li.classList.add('new');
    li.innerHTML = `<span class="dot" style="background:${RARITY_COLOR[e.rarity]}"></span>${e.name}` +
                   `<span class="rar" style="color:${RARITY_COLOR[e.rarity]}">${e.rarity}</span>`;
    logList.appendChild(li);
  });
}

let revealDef = null;
function showReveal(def, rarity) {
  revealDef = def;
  revealCard.className = '';
  revealCard.classList.add('r-' + rarity.toLowerCase());
  revealRarity.textContent = rarity;
  revealName.textContent = def.name;
  revealEl.classList.add('show');
  revealEl.setAttribute('aria-hidden', 'false');
  if (rarity === 'Epic' || rarity === 'Legendary') spawnSparkles(rarity === 'Legendary' ? 16 : 10);
}
function hideReveal() {
  revealEl.classList.remove('show');
  revealEl.setAttribute('aria-hidden', 'true');
}
function spawnSparkles(n) {
  const rect = revealCard.getBoundingClientRect();
  const stage = document.getElementById('stage').getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const x = rect.width / 2 + (Math.random() - 0.5) * rect.width * 1.1;
    const y = rect.height / 2 + (Math.random() - 0.5) * rect.height * 1.1;
    s.style.left = (rect.left - stage.left + x) + 'px';
    s.style.top = (rect.top - stage.top + y) + 'px';
    s.style.background = Math.random() > 0.5 ? '#fff6d0' : (Math.random() > 0.5 ? '#ffd479' : '#ffe9a8');
    s.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px');
    s.style.setProperty('--dy', (-15 - Math.random() * 25) + 'px');
    s.style.animationDelay = (Math.random() * 0.4) + 's';
    document.getElementById('stage').appendChild(s);
    setTimeout(() => s.remove(), 1700);
  }
}

/* ============================================================
   Input
   ============================================================ */
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (e.repeat) return;
    action();
  }
});
actionBtn.addEventListener('click', () => action());
revealEl.addEventListener('click', () => { if (phase === S.REVEAL) toReady(); });

/* pause when tab hidden */
document.addEventListener('visibilitychange', () => {
  last = performance.now();
});

/* ============================================================
   Main loop
   ============================================================ */
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (document.hidden) dt = 0;
  if (dt > 0.05) dt = 0.05;      // clamp so hidden tabs don't fast-forward
  if (dt < 0) dt = 0;

  update(dt);
  renderScene();
  if (phase === S.REVEAL && revealDef) renderRevealFish(revealDef, time);

  requestAnimationFrame(frame);
}

updateLog(false);
updateHud();
requestAnimationFrame(frame);
