// Mosswater Cove scene art. Everything is painted procedurally onto canvases.
import { drawText } from './font.js';

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = (c, x, y, w, h, color, alpha) => {
  if (alpha !== undefined) c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (alpha !== undefined) c.globalAlpha = 1;
};

// Crisp, pixel-aligned filled ellipse (no canvas anti-aliasing).
export function pell(c, cx, cy, rx, ry, color, alpha, topHalf) {
  if (alpha !== undefined) c.globalAlpha = alpha;
  c.fillStyle = color;
  const y0 = topHalf ? -Math.ceil(ry) : -Math.ceil(ry);
  for (let y = y0; y <= Math.ceil(ry); y++) {
    if (topHalf && y > 0) break;
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const w = Math.sqrt(t) * rx;
    const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
    c.fillRect(x0, Math.round(cy + y), Math.max(1, x1 - x0 + 1), 1);
  }
  if (alpha !== undefined) c.globalAlpha = 1;
}

// Crisp pixel ellipse outline.
export function pellRing(c, cx, cy, rx, ry, color, alpha) {
  if (alpha !== undefined) c.globalAlpha = alpha;
  c.fillStyle = color;
  const steps = Math.max(10, Math.round((rx + ry) * 2.2));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    c.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
  if (alpha !== undefined) c.globalAlpha = 1;
}

// Crisp pixel arc (partial ring) for reveal effects.
export function pixelArc(c, cx, cy, r, a0, a1, color, alpha) {
  if (alpha !== undefined) c.globalAlpha = alpha;
  c.fillStyle = color;
  const steps = Math.max(6, Math.round(Math.abs(a1 - a0) * r));
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
  if (alpha !== undefined) c.globalAlpha = 1;
}

// Shoreline: land exists above landY(x), water below.
export function landY(x) {
  return Math.round(60 + Math.sin(x * 0.045) * 3 + Math.sin(x * 0.11 + 1.3) * 1.6);
}

// ---------------------------------------------------------------------------
// Static land + dock, pre-rendered once.
// ---------------------------------------------------------------------------
let landCanvas = null;
export function getLand() {
  if (landCanvas) return landCanvas;
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 180;
  const c = cv.getContext('2d');
  const rnd = mulberry32(1337);

  // ---- Grass base with vertical shading ----
  for (let x = 0; x < 320; x++) {
    const ly = landY(x);
    for (let y = 0; y < ly; y++) {
      const shade = 0.85 + 0.3 * (y / ly);
      R(c, x, y, 1, 1, mix('#3d6b34', '#5c9449', Math.min(1, shade - 0.7)));
    }
  }

  // ---- Grass texture tufts ----
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rnd() * 320);
    const ly = landY(x);
    const y = Math.floor(rnd() * Math.max(1, ly - 3));
    const light = rnd() > 0.5;
    R(c, x, y, 2, 1, light ? '#6fae54' : '#356029', light ? 0.5 : 0.45);
  }
  // darker clumps
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * 320);
    const ly = landY(x);
    const y = Math.floor(rnd() * Math.max(1, ly - 6));
    R(c, x, y, 3, 2, '#2f5526', 0.35);
  }

  // ---- Sandy/pebbly shore band ----
  for (let x = 0; x < 320; x++) {
    const ly = landY(x);
    R(c, x, ly - 4, 1, 3, '#c2a878');
    R(c, x, ly - 1, 1, 2, '#a88d5f');
    R(c, x, ly - 4, 1, 1, '#d8c08a');
  }
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(rnd() * 320);
    const ly = landY(x);
    R(c, x, ly - 4 + Math.floor(rnd() * 4), 1, 1, rnd() > 0.5 ? '#e0cfa0' : '#8a7048', 0.7);
  }

  // ---- Dirt path to the dock ----
  drawPath(c, rnd);

  // ---- Shore rocks ----
  const rockSpots = [[16, 58], [58, 57], [120, 60], [136, 61], [206, 59], [300, 56], [176, 62], [252, 58]];
  for (const [rx, ry] of rockSpots) drawRock(c, rx, ry, 3 + Math.floor(rnd() * 3));

  // ---- Trees & vegetation (drawn back to front) ----
  drawTree(c, 150, 24, 16, rnd);
  drawTree(c, 212, 19, 13, rnd);
  drawTree(c, 126, 4, 14, rnd);
  drawBush(c, 168, 44, 7, rnd);
  drawBush(c, 230, 46, 6, rnd);
  drawBush(c, 138, 50, 5, rnd);
  drawFerns(c, rnd);

  // ---- Flowers ----
  const flowerColors = ['#e07a9a', '#f2d45c', '#f4f0e6', '#d65a5a', '#b98ce0'];
  for (let i = 0; i < 40; i++) {
    const x = 6 + Math.floor(rnd() * 308);
    const ly = landY(x);
    const y = 6 + Math.floor(rnd() * (ly - 12));
    if (isOnPath(x, y) || isOnDock(x, y)) continue;
    drawFlower(c, x, y, flowerColors[Math.floor(rnd() * flowerColors.length)]);
  }
  // grass blades
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rnd() * 320);
    const ly = landY(x);
    const y = Math.floor(rnd() * (ly - 8));
    if (isOnPath(x, y) || isOnDock(x, y)) continue;
    R(c, x, y, 1, 3, '#4f8a3f');
    R(c, x, y, 1, 1, '#6fae54');
  }

  // ---- Mushrooms near a tree ----
  drawMushroom(c, 150, 52);
  drawMushroom(c, 155, 54);
  drawMushroom(c, 216, 44);

  // ---- Dock (on top of everything at the shore) ----
  drawDock(c);

  // ---- Tackle / bucket beside the angler ----
  drawBucket(c, 104, 50);

  landCanvas = cv;
  return cv;
}

function mix(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function pathCenter(y) { return 86 + Math.round(Math.sin(y * 0.08) * 3); }
function isOnPath(x, y) {
  if (y < 0 || y > 64) return false;
  const w = 9 + Math.sin(y * 0.2) * 2;
  return Math.abs(x - pathCenter(y)) < w;
}
function isOnDock(x, y) { return x >= 70 && x <= 102 && y >= 52 && y <= 124; }

function drawPath(c, rnd) {
  for (let y = 0; y <= 64; y++) {
    const cx = pathCenter(y);
    const w = 9 + Math.sin(y * 0.2) * 2;
    for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      const edge = Math.abs(x - cx) / w;
      if (edge > 0.82 && rnd() > 0.6) continue;
      const base = edge > 0.82 ? '#a08050' : (rnd() > 0.5 ? '#8a6a43' : '#7d5f3b');
      R(c, x, y, 1, 1, base);
    }
  }
  // pebbles on path
  for (let i = 0; i < 40; i++) {
    const y = Math.floor(rnd() * 64);
    const cx = pathCenter(y) + Math.floor((rnd() - 0.5) * 12);
    R(c, cx, y, 1, 1, rnd() > 0.5 ? '#b09068' : '#6a5230');
  }
}

function drawRock(c, x, y, s) {
  c.save();
  R(c, x - s, y - s + 1, s * 2, s + 1, '#5f666e');
  R(c, x - s + 1, y - s, s * 2 - 1, s, '#8a9098');
  R(c, x - s + 1, y - s, s, 1, '#b0b6bd');
  R(c, x + 1, y + 1, s, 1, '#4a5057');
  c.restore();
}

function drawTree(c, x, y, r, rnd) {
  // shadow on ground
  pell(c, x + r * 0.5, y + r * 0.85, r * 1.05, r * 0.5, '#1f3a1c', 0.28);
  // trunk
  R(c, x - 2, y + r - 6, 5, 12, '#4a3220');
  R(c, x - 2, y + r - 6, 2, 12, '#6b4a2f');
  R(c, x + 1, y + r - 6, 2, 12, '#3a2618');
  // canopy layers
  const layers = [
    [r, '#2f6b3a'],
    [r - 2, '#3f8a48'],
    [r - 5, '#4f9c53'],
  ];
  for (const [rr, col] of layers) {
    c.globalAlpha = 1;
    c.fillStyle = col;
    blob(c, x, y, rr, rr * 0.9, rnd, 1);
  }
  // sunlit clumps upper-left
  c.fillStyle = '#6bc060';
  blob(c, x - r * 0.28, y - r * 0.3, r * 0.5, r * 0.4, rnd, 0.5);
  c.fillStyle = '#7fc46a';
  blob(c, x - r * 0.35, y - r * 0.38, r * 0.3, r * 0.24, rnd, 0.6);
  // darker clumps lower-right
  c.fillStyle = '#27572e';
  c.globalAlpha = 0.7;
  blob(c, x + r * 0.3, y + r * 0.28, r * 0.45, r * 0.36, rnd, 0.7);
  c.globalAlpha = 1;
  // leaf specks
  R(c, x - r * 0.6, y - r * 0.1, 1, 1, '#8fd47a', 0.7);
  R(c, x + r * 0.2, y - r * 0.5, 1, 1, '#8fd47a', 0.5);
}

function blob(c, cx, cy, rx, ry, rnd, alpha) {
  if (alpha !== undefined) c.globalAlpha = alpha;
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      const wobble = 1 + 0.12 * Math.sin(Math.atan2(y, x) * 5 + rx);
      if (d <= wobble * 0.6 + 0.4) c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
  if (alpha !== undefined) c.globalAlpha = 1;
}

function drawBush(c, x, y, r, rnd) {
  pell(c, x + 3, y + r * 0.7, r * 1.1, r * 0.45, '#1f3a1c', 0.22);
  c.fillStyle = '#2f6b3a'; blob(c, x, y, r, r * 0.85, rnd, 1);
  c.fillStyle = '#3f8a48'; blob(c, x - 1, y - 1, r - 1, r * 0.7, rnd, 1);
  c.fillStyle = '#5aa64f'; blob(c, x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.32, rnd, 0.8);
  c.fillStyle = '#f2d45c'; R(c, x + r * 0.4, y, 1, 1, '#f2d45c'); R(c, x - r * 0.2, y + r * 0.3, 1, 1, '#e07a9a');
}

function drawFerns(c, rnd) {
  const spots = [[8, 52], [54, 50], [110, 54], [148, 52], [196, 50], [236, 52], [306, 50]];
  for (const [x, y] of spots) {
    for (let i = -3; i <= 3; i++) {
      const bx = x + i * 2;
      const h = 6 - Math.abs(i);
      for (let k = 0; k < h; k++) {
        R(c, bx + Math.round(Math.sin(k * 0.6 + i) * 1), y - k, 1, 1, k > h - 3 ? '#5aa64f' : '#3f7a3a');
      }
    }
  }
}

function drawFlower(c, x, y, color) {
  R(c, x, y, 1, 3, '#3f7a3a');
  R(c, x - 1, y - 1, 1, 1, color);
  R(c, x + 1, y - 1, 1, 1, color);
  R(c, x, y - 2, 1, 1, color);
  R(c, x, y - 1, 1, 1, '#f6ecc0');
}

function drawMushroom(c, x, y) {
  R(c, x, y, 1, 3, '#e8dcc0');
  R(c, x - 2, y - 2, 5, 2, '#c83a3a');
  R(c, x - 1, y - 3, 3, 1, '#c83a3a');
  R(c, x - 2, y - 2, 1, 1, '#f4f0e6');
  R(c, x + 1, y - 2, 1, 1, '#f4f0e6');
}

const DOCK = { x1: 72, x2: 100, top: 50, bottom: 122 };
function drawDock(c) {
  const { x1, x2, top, bottom } = DOCK;
  // water shadow under dock
  R(c, x1 - 2, top + 6, (x2 - x1) + 4, bottom - top, '#123c52', 0.45);

  // support posts sticking up at intervals
  const posts = [];
  for (let y = top + 4; y <= bottom - 4; y += 24) posts.push(y);
  for (const py of posts) {
    R(c, x1 - 2, py, 3, 5, '#4a3220');
    R(c, x2 - 1, py, 3, 5, '#4a3220');
    R(c, x1 - 2, py, 1, 5, '#6b4a2f');
    R(c, x2 - 1, py, 1, 5, '#6b4a2f');
  }

  // planks
  for (let y = top; y < bottom; y += 6) {
    const h = Math.min(5, bottom - y);
    R(c, x1, y, x2 - x1, h, '#7a4f2c');
    R(c, x1, y, x2 - x1, 1, '#9a6a3d');
    R(c, x1, y + h - 1, x2 - x1, 1, '#513218');
    // plank seams
    for (let x = x1 + 4; x < x2; x += 9) R(c, x, y, 1, h, '#5b3a1f', 0.8);
    // knots
    R(c, x1 + 7, y + 2, 1, 1, '#5b3a1f', 0.7);
    R(c, x1 + 18, y + 1, 1, 1, '#5b3a1f', 0.7);
  }
  // side rails of the dock
  R(c, x1 - 1, top, 1, bottom - top, '#5b3a1f');
  R(c, x2, top, 1, bottom - top, '#5b3a1f');
  R(c, x1, top, x2 - x1, 1, '#b98a55');

  // rope loop on a post
  R(c, x2 - 3, top + 28, 4, 1, '#d8c08a');
  R(c, x2 - 3, top + 30, 4, 1, '#d8c08a');

  // lantern near the shore end
  const lx = x1 + 3, ly = top + 4;
  R(c, lx - 1, ly + 5, 3, 7, '#4a3220');
  R(c, lx, ly, 3, 6, '#f2c25a');
  R(c, lx, ly, 1, 6, '#fff0b0');
  R(c, lx - 1, ly - 1, 5, 2, '#6b4a2f');
  pell(c, lx + 1, ly + 3, 9, 9, '#ffe08a', 0.15);
}

function drawBucket(c, x, y) {
  R(c, x, y, 8, 8, '#6b4a2f');
  R(c, x + 1, y + 1, 6, 6, '#8a6038');
  R(c, x + 1, y + 1, 6, 2, '#3f6f8a');
  R(c, x, y, 8, 1, '#a07848');
  R(c, x + 1, y + 3, 6, 1, '#4a3220');
  // rope handle
  R(c, x + 1, y - 2, 1, 2, '#c2a878');
  R(c, x + 6, y - 2, 1, 2, '#c2a878');
  R(c, x + 2, y - 3, 4, 1, '#c2a878');
}

// ---------------------------------------------------------------------------
// Animated water
// ---------------------------------------------------------------------------
const waterStops = [
  [0, '#2f7f9e'], [55, '#3f8fa6'], [85, '#2c7291'], [120, '#1f5c7d'], [160, '#194a68'], [180, '#143e5a'],
];
function waterColor(y) {
  for (let i = 0; i < waterStops.length - 1; i++) {
    const [y0, c0] = waterStops[i];
    const [y1, c1] = waterStops[i + 1];
    if (y >= y0 && y <= y1) return mix(c0, c1, (y - y0) / (y1 - y0));
  }
  return waterStops[waterStops.length - 1][1];
}
const waterPalette = Array.from({ length: 180 }, (_, y) => waterColor(y));

const sparkles = (() => {
  const r = mulberry32(99); const a = [];
  for (let i = 0; i < 46; i++) a.push({ x: r() * 320, y: 62 + r() * 112, p: r() * 6.28, sp: 0.8 + r() * 1.6, s: r() > 0.7 ? 2 : 1 });
  return a;
})();
const leaves = (() => {
  const r = mulberry32(7); const a = [];
  for (let i = 0; i < 10; i++) a.push({ x: r() * 320, y: 70 + r() * 100, p: r() * 6.28, sp: 0.2 + r() * 0.3, len: 3 + r() * 3 });
  return a;
})();

export function drawWater(ctx, t) {
  for (let y = 0; y < 180; y++) {
    ctx.fillStyle = waterPalette[y];
    ctx.fillRect(0, y, 320, 1);
  }

  // shallow brightening near shore
  for (let x = 0; x < 320; x++) {
    const ly = landY(x);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#6fc0c8';
    ctx.fillRect(x, ly, 1, 2);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#8fd6e0';
    ctx.fillRect(x, ly + 2, 1, 2);
    ctx.globalAlpha = 1;
  }

  // moving wave dashes
  for (let row = 0; row < 9; row++) {
    const y = 66 + row * 13 + Math.sin(t * 0.7 + row) * 2;
    const off = Math.sin(t * 0.9 + row * 1.3) * 10;
    const col = row < 3 ? '#7fc8d4' : row < 6 ? '#5aa8c0' : '#3f8fb0';
    ctx.globalAlpha = 0.28;
    for (let x = -24; x < 340; x += 26) {
      const xx = ((x + off) % 360 + 360) % 360 - 20;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(xx), Math.round(y), 9, 1);
      ctx.fillRect(Math.round(xx + 11), Math.round(y + 1), 5, 1);
    }
    ctx.globalAlpha = 1;
  }

  // drifting leaves
  for (const l of leaves) {
    const x = (l.x + t * l.sp * 6) % 340 - 10;
    const y = l.y + Math.sin(t * l.sp * 2 + l.p) * 1.5;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#3f6b3a';
    ctx.fillRect(Math.round(x), Math.round(y), l.len, 1);
    ctx.globalAlpha = 1;
  }

  // sparkles
  for (const s of sparkles) {
    const a = Math.sin(t * s.sp + s.p);
    if (a <= 0.35) continue;
    ctx.globalAlpha = (a - 0.35) * 0.9;
    ctx.fillStyle = '#dff3f5';
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, 1);
    if (s.s > 1) ctx.fillRect(Math.round(s.x), Math.round(s.y - 1), 1, 3);
    ctx.globalAlpha = 1;
  }

  // diagonal sun glint
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const gx = 40 + i * 60 + Math.sin(t * 0.4 + i) * 6;
    ctx.fillRect(Math.round(gx), 60, 14, 118);
  }
  ctx.globalAlpha = 1;
}

export function drawWaterDeco(ctx, t) {
  drawBoat(ctx, 262, 150, t);
  drawLilyPad(ctx, 196, 138, 5, t, 0.0, false);
  drawLilyPad(ctx, 214, 152, 6, t, 1.2, true);
  drawLilyPad(ctx, 178, 158, 5, t, 2.4, false);
  drawLilyPad(ctx, 232, 132, 4, t, 0.6, false);
  drawBuoy(ctx, 34, 150, t);
  // a few reeds rooted just off the shore
  const reedSpots = [[12, 70], [60, 68], [132, 72], [172, 70], [220, 71], [292, 68]];
  for (const [rx, ry] of reedSpots) drawReed(ctx, rx, ry, t, false);
}

function drawLilyPad(ctx, x, y, s, t, ph, flower) {
  const yy = y + Math.sin(t * 1.1 + ph) * 1;
  pell(ctx, x + 1, yy + 2, s + 1, s * 0.7, '#123c52', 0.35);
  pell(ctx, x, yy, s, s * 0.72, '#2f6b3a', 1);
  pell(ctx, x - 0.5, yy - 0.5, s - 1, s * 0.5, '#4f9c53', 1);
  // notch
  ctx.fillStyle = '#2c7291';
  ctx.fillRect(Math.round(x), Math.round(yy - s * 0.7), 1, Math.round(s * 0.9));
  if (flower) {
    const fx = x + (s > 5 ? 1 : -1), fy = yy - 2;
    R(ctx, fx, fy, 3, 2, '#e88ab0');
    R(ctx, fx + 1, fy - 1, 1, 1, '#f6c0d4');
    R(ctx, fx + 1, fy + 1, 1, 1, '#b85a80');
  }
}

function drawBoat(ctx, x, y, t) {
  const bob = Math.round(Math.sin(t * 0.8) * 1);
  const yy = y + bob;
  pell(ctx, x, yy + 3, 22, 7, '#123c52', 0.3);
  // hull
  pell(ctx, x, yy, 21, 8, '#5b3a1f', 1);
  pell(ctx, x, yy - 1, 18, 6, '#8a6038', 1);
  pell(ctx, x, yy - 1, 14, 4, '#6b4423', 1);
  // seats
  R(ctx, x - 8, yy - 5, 4, 8, '#a07848');
  R(ctx, x + 4, yy - 5, 4, 8, '#a07848');
  R(ctx, x - 8, yy - 5, 4, 1, '#c2a878');
  R(ctx, x + 4, yy - 5, 4, 1, '#c2a878');
  // oar
  R(ctx, x - 22, yy - 2, 14, 1, '#b98a55');
  R(ctx, x - 23, yy - 4, 2, 5, '#8a6038');
  // rim highlight
  pell(ctx, x, yy - 4, 19, 2, '#b98a55', 0.5);
}

function drawBuoy(ctx, x, y, t) {
  const bob = Math.round(Math.sin(t * 1.4) * 2);
  const yy = y + bob;
  // ripple
  pellRing(ctx, x, yy + 3, 7 + ((t * 6) % 5), 2.5, '#9fd6e0', 0.4);
  // pole + light
  R(ctx, x, yy - 12, 1, 10, '#4a3220');
  R(ctx, x - 1, yy - 14, 3, 3, '#f2c25a');
  R(ctx, x, yy - 14, 1, 3, '#fff0b0');
  // body
  R(ctx, x - 4, yy - 4, 8, 7, '#c83a3a');
  R(ctx, x - 4, yy - 1, 8, 3, '#f4f0e6');
  R(ctx, x - 4, yy - 4, 8, 1, '#e86a6a');
  R(ctx, x - 4, yy + 2, 8, 1, '#7a1f1a');
  R(ctx, x - 5, yy - 3, 1, 5, '#7a1f1a');
  R(ctx, x + 4, yy - 3, 1, 5, '#7a1f1a');
}

function drawReed(ctx, x, y, t, foreground) {
  const sway = Math.sin(t * 1.2 + x * 0.3) * 1.5;
  const h = foreground ? 14 : 9;
  for (let k = 0; k < h; k++) {
    const xx = x + Math.round(sway * (k / h));
    const col = k > h - 3 ? '#7fb85a' : (foreground ? '#2f5a30' : '#4a7a38');
    R(ctx, xx, y - k, 1, 1, col);
    if (k % 3 === 0 && k > 2) { R(ctx, xx - 1, y - k, 1, 1, col); R(ctx, xx + 1, y - k, 1, 1, col); }
  }
  if (!foreground) R(ctx, x, y - h, 2, 3, '#8a6a3f'); // cattail
}

// ---------------------------------------------------------------------------
// Foam along the shoreline
// ---------------------------------------------------------------------------
export function drawFoam(ctx, t) {
  for (let x = 0; x < 320; x++) {
    const ly = landY(x);
    const w = Math.sin(x * 0.3 + t * 2.2) * 0.5 + 0.5;
    if (w > 0.35) {
      ctx.globalAlpha = (w - 0.35) * 0.8;
      ctx.fillStyle = '#e8f7f7';
      ctx.fillRect(x, ly - 1, 1, 1);
      if (w > 0.75) ctx.fillRect(x, ly, 1, 1);
    }
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#bfe6ea';
    ctx.fillRect(x, ly + 1, 1, 1);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// Foreground reeds for depth
// ---------------------------------------------------------------------------
export function drawForeground(ctx, t) {
  const spots = [[4, 178], [14, 180], [306, 177], [316, 180], [26, 180], [296, 180]];
  for (const [x, y] of spots) drawReed(ctx, x, y, t, true);
}

// ---------------------------------------------------------------------------
// The angler
// ---------------------------------------------------------------------------
const HAND = { x: 5, y: -12 };
export function rodTip(ax, ay, angle) {
  const hx = ax + HAND.x, hy = ay + HAND.y;
  return { x: hx + Math.cos(angle) * 20, y: hy + Math.sin(angle) * 20, hx, hy };
}

export function drawAngler(ctx, ax, ay, pose, t) {
  const bob = Math.round(Math.sin(t * 2.0) * (pose.moving ? 0 : 0.5));
  const lean = pose.lean || 0;
  const x = Math.round(ax), y = Math.round(ay) + bob;
  const { hx, hy, x: tx, y: ty } = rodTip(ax, ay + bob, pose.rod);

  // shadow
  pell(ctx, x + 1, y + 1, 9, 3.5, '#0e2a3a', 0.3);

  // rod (drawn behind body a touch, then arm over it) -- actually drawn after
  // legs / pants
  const skin = '#e8b487', skinD = '#c08a5a';
  const shirt = '#3f8f8a', shirtD = '#2c6b68', shirtL = '#5fb0a6';
  const pants = '#3f4a63', pantsD = '#2c3550';
  const boot = '#4a3220';

  const lx = Math.round(lean);

  // boots
  R(ctx, x - 5, y - 2, 4, 2, boot);
  R(ctx, x + 1, y - 2, 4, 2, boot);
  R(ctx, x - 5, y - 2, 4, 1, '#5b3f28');
  R(ctx, x + 1, y - 2, 4, 1, '#5b3f28');
  // legs
  R(ctx, x - 4, y - 8, 3, 6, pants);
  R(ctx, x + 1, y - 8, 3, 6, pants);
  R(ctx, x - 4, y - 8, 1, 6, pantsD);
  R(ctx, x + 3, y - 8, 1, 6, pantsD);
  // belt
  R(ctx, x - 5, y - 9, 10, 1, '#2a2018');
  // torso (shirt + vest)
  R(ctx, x - 5 + lx, y - 15, 10, 7, shirt);
  R(ctx, x - 5 + lx, y - 15, 10, 1, shirtL);
  R(ctx, x - 5 + lx, y - 9, 10, 1, shirtD);
  R(ctx, x - 4 + lx, y - 14, 3, 4, '#b98a55'); // vest left
  R(ctx, x + 2 + lx, y - 14, 3, 4, '#a07848'); // vest right
  R(ctx, x - 1 + lx, y - 13, 2, 2, '#8a6038'); // vest back
  // arms
  R(ctx, x + 4 + lx, y - 14, 3, 3, shirt); // right shoulder (rod arm)
  R(ctx, x - 6 + lx, y - 14, 3, 3, shirt); // left shoulder
  R(ctx, x - 6 + lx, y - 12, 2, 5, skinD); // left arm down
  R(ctx, x - 6 + lx, y - 7, 2, 2, skin);
  // head
  R(ctx, x - 4 + lx, y - 20, 8, 5, skin);
  R(ctx, x - 4 + lx, y - 20, 8, 1, '#d8a070');
  R(ctx, x - 4 + lx, y - 16, 8, 1, skinD);
  // hair at back
  R(ctx, x - 4 + lx, y - 20, 8, 2, '#6b4a2f');
  R(ctx, x - 4 + lx, y - 20, 1, 4, '#5b3a24');
  // hat
  R(ctx, x - 8 + lx, y - 22, 16, 2, '#cfa955');
  R(ctx, x - 8 + lx, y - 22, 16, 1, '#e6c877');
  R(ctx, x - 4 + lx, y - 25, 8, 3, '#e6c877');
  R(ctx, x - 4 + lx, y - 25, 8, 1, '#f2dc98');
  R(ctx, x - 4 + lx, y - 23, 8, 1, '#8a5a32');
  R(ctx, x - 8 + lx, y - 20, 16, 1, '#7a5a2a');

  // rod
  drawRod(ctx, hx, hy, tx, ty);
  // right arm holding the rod
  R(ctx, x + 4 + lx, y - 12, 2, 3, skin);
  R(ctx, Math.round(hx) - 1, Math.round(hy) - 1, 2, 2, skin);

  return { hx, hy, x: tx, y: ty };
}

function drawRod(ctx, hx, hy, tx, ty) {
  const steps = Math.max(2, Math.round(Math.hypot(tx - hx, ty - hy)));
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const x = Math.round(hx + (tx - hx) * p);
    const y = Math.round(hy + (ty - hy) * p - Math.sin(p * Math.PI) * 1.2);
    R(ctx, x, y, 1, 1, i > steps - 3 ? '#e8e0c8' : '#b98a55');
    if (i % 5 === 0 && i < steps - 2) R(ctx, x, y + 1, 1, 1, '#6b4423');
  }
  // reel
  R(ctx, Math.round(hx) + 1, Math.round(hy) + 1, 2, 2, '#8a6038');
  R(ctx, Math.round(hx) + 1, Math.round(hy) + 1, 1, 1, '#c2a878');
}

// ---------------------------------------------------------------------------
// Bobber + ripples + line
// ---------------------------------------------------------------------------
export function drawBobber(ctx, x, y, t, opts = {}) {
  const { state, flash } = opts;
  const bob = state === 'waiting' ? Math.sin(t * 2.2) * 1 : 0;
  const cx = Math.round(x), cy = Math.round(y + bob);

  // ripples
  ripple(ctx, cx, cy + 1, t, state);

  // line stub
  R(ctx, cx, cy - 3, 1, 3, '#d8c08a');

  // body
  const bright = flash ? '#ffffff' : '#e2483f';
  R(ctx, cx - 2, cy - 2, 4, 2, bright);
  R(ctx, cx - 2, cy, 4, 2, '#f4f0e6');
  R(ctx, cx - 2, cy - 2, 4, 1, flash ? '#ffffff' : '#f2736a');
  R(ctx, cx - 2, cy + 1, 4, 1, '#c8c0b0');
  R(ctx, cx - 3, cy - 1, 1, 2, '#7a1f1a');
  R(ctx, cx + 2, cy - 1, 1, 2, '#7a1f1a');
  R(ctx, cx, cy - 3, 1, 1, '#f4f0e6');
}

function ripple(ctx, x, y, t, state) {
  const speed = state === 'bite' ? 0.6 : 1.6;
  for (let i = 0; i < 2; i++) {
    const p = ((t * speed + i * 0.5) % 1);
    const r = 2 + p * (state === 'bite' ? 10 : 5);
    pellRing(ctx, x, y, r, r * 0.45, '#cfeef2', (1 - p) * 0.45);
  }
}

// Pixel line, optional slack sag.
export function drawLine(ctx, x1, y1, x2, y2, sag, color = '#f0ead8') {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.round(dist));
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const x = x1 + dx * p;
    const y = y1 + dy * p + (sag || 0) * Math.sin(p * Math.PI);
    ctx.globalAlpha = 0.9;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// exclamation marker for the bite
export function drawBiteMarker(ctx, x, y, t) {
  const bounce = Math.abs(Math.sin(t * 6)) * 2;
  const cx = Math.round(x), cy = Math.round(y - 12 - bounce);
  const scale = t % 0.5 < 0.25 ? 1 : 1; // steady, bounce handles life
  ctx.fillStyle = '#ffe24a';
  ctx.fillRect(cx, cy, 2, 6);
  ctx.fillRect(cx, cy + 7, 2, 2);
  ctx.fillStyle = '#fff6c0';
  ctx.fillRect(cx, cy, 1, 6);
}
