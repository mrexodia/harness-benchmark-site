// "Tidepool Bay" — the whole island scene, drawn entirely with code.
import { P } from './palette.js';
import { painter, mulberry32, createCanvas, addOutline } from './pixels.js';

export const W = 320;
export const H = 180;
export const HORIZON = 62;

// Angler anchor (feet on the dock).
export const ANGLER = { x: 74, feetY: 118 };
// Rod tip in world space (fishing line origin).
export const ROD_TIP = { x: 102, y: 87 };

// ---------------------------------------------------------------------------
// static scene data ---------------------------------------------------------
// ---------------------------------------------------------------------------
const rng = mulberry32(1337);

// Shoreline: for each column x, y of the top of the bank (water above it).
const LAND_POINTS = [[0, 88], [16, 96], [32, 106], [46, 119], [58, 136], [68, 156], [74, 180]];
const LAND = new Array(W).fill(null);
function landTopAt(x) {
  if (x < 0 || x > 74) return null;
  for (let i = 0; i < LAND_POINTS.length - 1; i++) {
    const [x0, y0] = LAND_POINTS[i], [x1, y1] = LAND_POINTS[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0 || 1);
      return y0 + (y1 - y0) * t;
    }
  }
  return null;
}
for (let x = 0; x < W; x++) LAND[x] = landTopAt(x);

// precomputed grass tufts for the bank (fixed so they don't flicker)
const TUFTS = [];
for (let i = 0; i < 320; i++) {
  TUFTS.push({ x: Math.floor(rng() * 74), dy: 1 + Math.floor(rng() * 60), kind: rng() });
}
// some darker patches for variation
const PATCHES = [];
for (let i = 0; i < 26; i++) {
  PATCHES.push({ x: 4 + Math.floor(rng() * 64), dy: 12 + Math.floor(rng() * 48), r: 3 + Math.floor(rng() * 5) });
}

// sparkle field for the water
const SPARKLES = [];
for (let i = 0; i < 34; i++) {
  SPARKLES.push({
    x: 8 + Math.floor(rng() * 300),
    y: HORIZON + 4 + Math.floor(rng() * 105),
    phase: rng() * Math.PI * 2,
    speed: 1.2 + rng() * 1.6,
  });
}

const CLOUDS = [
  { x: 20, y: 16, s: 1.0, v: 1.1 },
  { x: 120, y: 8, s: 0.75, v: 0.7 },
  { x: 205, y: 26, s: 1.25, v: 1.4 },
  { x: 280, y: 12, s: 0.85, v: 0.9 },
];

// ---------------------------------------------------------------------------
// sky, water ----------------------------------------------------------------
// ---------------------------------------------------------------------------
function drawSky(p, t) {
  // banded, dithered sky gradient
  p.rect(0, 0, W, 22, P.sky0);
  p.gradV(0, 22, W, 14, P.sky0, P.sky1);
  p.rect(0, 36, W, 8, P.sky1);
  p.gradV(0, 44, W, 10, P.sky1, P.sky2);
  p.rect(0, 54, W, 5, P.sky2);
  p.gradV(0, 59, W, 4, P.sky2, P.sky3);

  // sun + glow (kept clear of the top-right catch-log panel)
  p.circle(150, 26, 11, P.sunGlow);
  p.circle(150, 26, 8, P.sun);
  p.circle(150, 26, 6, '#fffbe8');

  // clouds
  for (const c of CLOUDS) {
    const cx = ((c.x + t * c.v) % (W + 70)) - 35;
    drawCloud(p, cx, c.y, c.s);
  }

  // a few lazy birds
  const birds = [[70, 22, 0], [90, 30, 1], [180, 18, 2]];
  for (const [bx, by, k] of birds) {
    const flap = Math.sin(t * 4 + k) * 1;
    p.px(bx - 2, by, P.far2); p.px(bx - 1, by + 1, P.far2); p.px(bx, by + flap, P.far2);
    p.px(bx + 1, by + 1, P.far2); p.px(bx + 2, by, P.far2);
  }
}

function drawCloud(p, x, y, s) {
  const b = (dx, dy, r) => p.circle(x + dx * s, y + dy * s, r * s, P.cloud);
  b(0, 0, 6); b(7, 1, 5); b(-7, 1, 5); b(3, -3, 4); b(-3, -3, 4);
  // shading underneath
  for (let i = -10; i <= 12; i++) {
    const yy = y + 3 + Math.round(Math.sin(i * 0.5) * 1);
    p.px(x + i * s, yy, P.cloudShade);
  }
  b(2, -4, 4); b(-5, -2, 3);
}

function drawFarLand(p, t) {
  // hazy distant island across the water
  p.rect(0, HORIZON - 2, W, 4, P.sky3);
  for (let x = 0; x < W; x++) {
    const a = Math.sin(x * 0.05) * 2 + Math.sin(x * 0.013 + 1) * 3;
    const top = HORIZON - 2 + Math.round(a * 0.4) - 1;
    p.rect(x, top, 1, HORIZON + 2 - top, P.far1);
  }
  // a couple of far tree bumps
  const bumps = [[40, 3], [58, 4], [150, 2], [168, 4], [176, 2], [250, 3], [268, 4]];
  for (const [bx, bh] of bumps) {
    p.ellipse(bx, HORIZON - 2 - bh, bh + 1, bh, P.farTree);
  }
  // tiny far hut on the right
  p.rect(246, HORIZON - 8, 8, 6, P.far2);
  p.rect(245, HORIZON - 10, 10, 2, P.farTree);
  p.rect(249, HORIZON - 5, 2, 3, P.far0);
  // haze
  p.rect(0, HORIZON - 2, W, 2, P.sky3);
}

function drawWater(p, t) {
  const top = HORIZON;
  // depth gradient
  p.rect(0, top, W, 10, P.waterDeep);
  p.gradV(0, top + 10, W, 14, P.waterDeep, P.waterMid);
  p.rect(0, top + 24, W, 30, P.waterMid);
  p.gradV(0, top + 54, W, 60, P.waterMid, P.waterLight);
  p.rect(0, top + 114, W, H - (top + 114), P.waterShallow);

  // sun glitter column
  for (let y = top + 2; y < H; y += 2) {
    const spread = 3 + (y - top) * 0.28;
    const wob = Math.sin(y * 0.4 + t * 2) * 3;
    const n = Math.max(1, Math.floor(spread / 6));
    for (let i = -n; i <= n; i++) {
      if (((y + i * 7) % 5) === 0) p.px(150 + i * 5 + wob, y, P.sparkle);
    }
  }

  // animated wave rows
  for (let row = 0; row < 15; row++) {
    const y = top + 5 + row * 8 + Math.round(Math.sin(t * 0.8 + row) * 1);
    const col = row % 3 === 0 ? P.foam : P.waterLight;
    const off = (t * (10 + row)) % 22;
    for (let x = -22; x < W; x += 22) {
      const xx = x + off;
      const seg = 4 + (row % 3);
      p.rect(xx, y, seg, 1, col);
      p.rect(xx + seg + 8, y, seg, 1, col);
    }
  }

  // near foreground swells
  for (let row = 0; row < 4; row++) {
    const y = H - 20 + row * 5 + Math.round(Math.cos(t * 1.1 + row) * 1);
    const off = (t * (26 + row * 4)) % 40;
    for (let x = -40; x < W; x += 40) {
      p.rect(x + off, y, 10, 1, P.waterShallow);
      p.rect(x + off + 14, y, 6, 1, P.foam);
    }
  }

  // sparkles
  for (const s of SPARKLES) {
    const tw = Math.sin(t * s.speed + s.phase);
    if (tw > 0.6) {
      p.px(s.x, s.y, P.sparkle);
      if (tw > 0.9) { p.px(s.x - 1, s.y, P.foam); p.px(s.x + 1, s.y, P.foam); p.px(s.x, s.y - 1, P.foam); }
    }
  }
}

function drawWaterProps(p, t) {
  // small rocks breaking the surface
  const rocks = [[150, 134, 1], [200, 160, 0.9], [243, 140, 0.8], [116, 150, 0.8]];
  for (const [rx, ry, s] of rocks) {
    p.ellipse(rx, ry + 2, 6 * s, 3 * s, P.waterDeep);
    p.ellipse(rx, ry, 5 * s, 3 * s, '#7d878e');
    p.ellipse(rx - 1, ry - 1, 4 * s, 2 * s, '#9aa4ab');
    p.ellipse(rx - 2, ry - 1, 2 * s, 1 * s, '#bcc4c9');
    // foam collar
    const ph = Math.sin(t * 2 + rx) * 0.5 + 0.5;
    for (const [dx, dy] of [[-5, 2], [5, 2], [-6, 0], [6, 0]]) p.px(rx + dx * s, ry + dy + (ph > 0.5 ? 1 : 0), P.foam);
  }

  // lily pads near the bank
  const pads = [[92, 156], [102, 162], [84, 166]];
  for (const [lx, ly] of pads) {
    p.ellipse(lx, ly, 5, 3, P.leafDark);
    p.ellipse(lx - 1, ly - 1, 4, 2, P.leafMid);
    p.rect(lx, ly, 1, 3, P.waterMid);
    p.px(lx - 2, ly - 1, P.leaf);
    // little lotus
    if (lx === 102) { p.px(lx + 1, ly - 2, '#ef8fb0'); p.px(lx + 2, ly - 2, '#f7c0d4'); }
  }
  // drifting leaf
  const fl = (t * 6) % 260;
  p.rect(70 + fl, 158 + Math.sin(t * 2 + fl) * 1, 3, 2, P.leafMid);

  // a distant sailboat on the horizon
  const bx = 206, by = HORIZON - 1;
  p.rect(bx, by - 8, 1, 8, '#8a6a4a'); // mast
  for (let i = 0; i < 6; i++) p.rect(bx + 1, by - 8 + i, 5 - Math.floor(i / 2), 1, '#f6f2e6');
  p.rect(bx - 3, by, 8, 2, '#c9a06a');
  p.px(bx + 3, by - 9, '#e8e0c8');
}

// ---------------------------------------------------------------------------
// land ----------------------------------------------------------------------
// ---------------------------------------------------------------------------
function drawLand(p, t) {
  for (let x = 0; x < 76; x++) {
    const lt = LAND[x];
    if (lt == null) continue;
    const y0 = Math.round(lt);
    // beach sand strip
    p.rect(x, y0, 1, 4, P.sandHi);
    p.rect(x, y0 + 4, 1, 3, P.sand);
    p.rect(x, y0 + 7, 1, 3, P.sandMid);
    // darker wet edge right at the waterline
    p.px(x, y0, P.wetSand);
    // grass body
    p.rect(x, y0 + 10, 1, H - (y0 + 10), P.grassMid);
  }
  // darker grass patches for depth
  for (const pat of PATCHES) {
    const lt = LAND[pat.x];
    if (lt == null) continue;
    const cy = Math.round(lt) + 10 + pat.dy;
    if (cy + pat.r >= H) continue;
    p.ellipse(pat.x, cy, pat.r, Math.max(1, pat.r - 1), P.grassDeep);
    p.ellipse(pat.x - 1, cy - 1, Math.max(1, pat.r - 2), Math.max(1, pat.r - 3), P.grassDark);
  }
  // grass top-light along the front, using a wobbling edge for organic feel
  for (let x = 0; x < 76; x++) {
    const lt = LAND[x];
    if (lt == null) continue;
    const wob = Math.round(Math.sin(x * 0.7) * 1 + Math.sin(x * 0.23) * 1);
    const gy = Math.round(lt) + 9 + wob;
    p.rect(x, gy, 1, 3, P.grass);
    p.rect(x, gy, 1, 1, P.grassHi);
  }
  // scattered tufts
  for (const t of TUFTS) {
    const lt = LAND[t.x];
    if (lt == null) continue;
    const cy = Math.round(lt) + 11 + t.dy;
    if (cy + 2 >= H) continue;
    const col = t.kind < 0.35 ? P.grassHi : t.kind < 0.7 ? P.grass : P.grassDark;
    p.px(t.x, cy, col);
    p.px(t.x + (t.kind < 0.5 ? 1 : -1), cy + 1, col);
    if (t.kind > 0.8) p.px(t.x, cy - 1, P.grassHi);
  }
  // foam line where water meets the bank
  for (let x = 0; x < 76; x++) {
    const lt = LAND[x];
    if (lt == null) continue;
    const n = Math.sin(x * 0.8 + t * 2.2);
    if (n > -0.2) {
      p.px(x, Math.round(lt) - 1, P.foam);
      if (n > 0.5) p.px(x, Math.round(lt) - 2, P.foam);
    }
  }
}

// ---------------------------------------------------------------------------
// vegetation ----------------------------------------------------------------
// ---------------------------------------------------------------------------
function drawTree(p, x, baseY, s) {
  // trunk
  p.rect(x - 2 * s, baseY - 26 * s, 4 * s, 26 * s, P.trunk);
  p.rect(x - 2 * s, baseY - 26 * s, 1 * s, 26 * s, P.trunkHi);
  p.rect(x + 1 * s, baseY - 26 * s, 1 * s, 26 * s, P.trunkDark);
  // roots
  p.rect(x - 4 * s, baseY - 2 * s, 3 * s, 2 * s, P.trunkDark);
  p.rect(x + 2 * s, baseY - 2 * s, 3 * s, 2 * s, P.trunkDark);

  const cy = baseY - 30 * s;
  const blobs = [
    [0, 0, 12], [-9, 3, 9], [9, 3, 9], [-5, -7, 8], [6, -6, 8], [0, -10, 7], [-13, -3, 6], [13, -3, 6],
  ];
  // dark under-layer
  for (const [dx, dy, r] of blobs) p.circle(x + dx * s, cy + (dy + 2) * s, r * s, P.leafDeep);
  for (const [dx, dy, r] of blobs) p.circle(x + dx * s, cy + dy * s, (r - 1) * s, P.leafMid);
  for (const [dx, dy, r] of blobs) p.circle(x + (dx - 1) * s, cy + (dy - 2) * s, (r - 3) * s, P.leaf);
  // highlights
  for (const [dx, dy, r] of blobs) {
    if (dy < 0) p.circle(x + (dx - 1) * s, cy + (dy - 3) * s, Math.max(1, (r - 5)) * s, P.leafHi);
  }
  p.circle(x - 4 * s, cy - 8 * s, 3 * s, P.leafHi);
  p.circle(x + 3 * s, cy - 9 * s, 2 * s, P.leafHi);
  // a few leaf notches
  p.px(x - 12 * s, cy - 5 * s, P.leafDeep);
  p.px(x + 12 * s, cy - 4 * s, P.leafDeep);
}

function drawBush(p, x, y, s) {
  p.circle(x, y, 6 * s, P.leafDark);
  p.circle(x - 4 * s, y + 1 * s, 4 * s, P.leafDark);
  p.circle(x + 4 * s, y + 1 * s, 4 * s, P.leafDark);
  p.circle(x, y - 1 * s, 5 * s, P.leafMid);
  p.circle(x - 3 * s, y - 1 * s, 3 * s, P.leaf);
  p.circle(x + 2 * s, y - 1 * s, 3 * s, P.leaf);
  p.circle(x - 1 * s, y - 3 * s, 2 * s, P.leafHi);
  // berries
  p.px(x + 2 * s, y + 1 * s, '#e86a5a');
  p.px(x - 3 * s, y + 2 * s, '#e86a5a');
}

function drawReeds(p, x, y, t, n = 4) {
  for (let i = 0; i < n; i++) {
    const rx = x + i * 3 - 4;
    const h = 9 + (i % 3) * 4;
    const sway = Math.sin(t * 1.4 + i * 1.3 + x * 0.1) * 1.2;
    for (let j = 0; j < h; j++) {
      const yy = y - j;
      const xx = Math.round(rx + sway * (j / h) * 1.5);
      p.px(xx, yy, j % 4 === 0 ? P.grass : P.grassMid);
    }
    // cattail head
    const hx = Math.round(rx + sway * 1.5);
    p.rect(hx, y - h - 3, 1, 3, '#6b4a2e');
    p.px(hx, y - h - 4, '#5a3b22');
  }
}

function drawFlowers(p, x, y, s, petal, center) {
  const spots = [[0, 0], [5, 2], [-4, 3], [2, -4], [-2, -3]];
  for (const [dx, dy] of spots) {
    const fx = x + dx * s, fy = y + dy * s;
    p.rect(fx, fy + 1, 1, 2 * s, P.grassMid);
    p.px(fx - 1, fy, petal); p.px(fx + 1, fy, petal); p.px(fx, fy - 1, petal); p.px(fx, fy + 1, petal);
    p.px(fx, fy, center);
  }
}

function drawRock(p, x, y, s) {
  p.ellipse(x, y, 5 * s, 3 * s, '#8a929a');
  p.ellipse(x - 1 * s, y - 1 * s, 4 * s, 2 * s, '#a9b0b6');
  p.ellipse(x - 2 * s, y - 1 * s, 2 * s, 1 * s, '#c3c9cd');
  p.ellipse(x + 2 * s, y + 1 * s, 2 * s, 1 * s, '#6c737a');
}

function drawCattailCluster(p, x, y, t) {
  for (let i = 0; i < 6; i++) {
    const rx = x + (i - 3) * 3;
    const h = 14 + (i % 3) * 5;
    const sway = Math.sin(t * 1.2 + i) * 1.4;
    for (let j = 0; j < h; j++) p.px(Math.round(rx + sway * (j / h) * 2), y - j, j % 5 === 0 ? P.grassHi : P.grassMid);
    p.rect(Math.round(rx + sway * 2), y - h - 4, 1, 5, '#6b4a2e');
  }
}

// ---------------------------------------------------------------------------
// dock ----------------------------------------------------------------------
// ---------------------------------------------------------------------------
const DOCK = { x0: 30, x1: 132, y: 116, h: 9 };

function drawDock(p, t) {
  const { x0, x1, y, h } = DOCK;
  // shadow on the water
  p.rect(x0 + 2, y + h + 2, x1 - x0, 6, P.waterDeep);
  for (let px = x0 + 2; px < x1; px += 6) p.px(px, y + h + 8, P.waterDeep);

  // posts into the water
  for (const px of [x0 + 3, x0 + 34, x0 + 66, x1 - 3]) {
    p.rect(px, y + h, 3, 30, P.woodDark);
    p.rect(px, y + h, 1, 30, P.woodMid);
    p.rect(px, y + h + 27, 3, 3, P.waterDeep);
  }
  // deck planks
  for (let px = x0; px < x1; px += 5) {
    p.rect(px, y, 4, h, P.wood);
    p.rect(px, y, 4, 2, P.woodHi);
    p.rect(px, y + h - 3, 4, 3, P.woodMid);
    p.rect(px + 4, y, 1, h, P.woodDark);
  }
  // top rail edge
  p.rect(x0, y - 1, x1 - x0, 1, P.woodHi);
  p.rect(x0, y + h, x1 - x0, 2, P.woodDeep);
  // a rope coil on the deck
  p.ellipse(x0 + 90, y - 1, 4, 2, P.rope);
  p.ellipse(x0 + 90, y - 2, 3, 2, '#b6965a');
  p.ellipse(x0 + 90, y - 3, 1, 1, P.woodDark);

  // catch bucket beside the angler
  const bx = x0 + 22, by = y;
  p.ellipse(bx, by + 1, 5, 2, P.woodDeep);
  p.rect(bx - 4, by - 6, 9, 7, P.metalDark);
  p.rect(bx - 4, by - 6, 9, 6, P.metal);
  p.rect(bx - 4, by - 6, 9, 1, '#dde3e6');
  p.rect(bx - 3, by - 3, 7, 1, P.metalDark);
  p.rect(bx - 4, by - 7, 9, 2, P.metalDark);
  p.rect(bx - 3, by - 8, 7, 1, P.metal);
  p.px(bx - 4, by - 9, P.metalDark);
  p.px(bx + 4, by - 9, P.metalDark);
  p.px(bx, by - 10, P.metalDark);

  // little lantern on the end post
  const lx = x1 - 2;
  p.rect(lx - 1, y - 13, 2, 13, P.woodDark);
  p.rect(lx - 2, y - 19, 4, 6, '#3a2a1c');
  p.rect(lx - 1, y - 18, 2, 4, '#ffd77a');
  p.rect(lx - 2, y - 20, 4, 1, '#5a3a24');
  p.px(lx - 3, y - 16, '#ffedb0');
  p.px(lx + 2, y - 16, '#ffedb0');
}

// ---------------------------------------------------------------------------
// angler --------------------------------------------------------------------
// ---------------------------------------------------------------------------
// The angler body is drawn once to an offscreen canvas and outlined, so the
// little fella reads clearly against the busy background.
const ANG_W = 30, ANG_H = 27;
const ANG_FX = 14, ANG_FY = 24; // feet position inside the sprite
let anglerSprite = null;
function buildAngler() {
  const cv = createCanvas(ANG_W, ANG_H);
  const p = painter(cv.getContext('2d'));
  const fx = ANG_FX, fy = ANG_FY;

  // boots
  p.rect(fx - 5, fy - 3, 4, 3, P.boot);
  p.rect(fx + 1, fy - 3, 4, 3, P.boot);
  p.rect(fx - 5, fy - 1, 4, 1, P.bootDark);
  p.rect(fx + 1, fy - 1, 4, 1, P.bootDark);

  // legs
  p.rect(fx - 5, fy - 7, 4, 4, P.pants);
  p.rect(fx + 1, fy - 7, 4, 4, P.pants);
  p.rect(fx - 5, fy - 7, 1, 4, P.pantsShade);
  p.rect(fx + 4, fy - 7, 1, 4, P.pantsDark);

  // torso
  p.rect(fx - 6, fy - 13, 12, 6, P.shirt);
  p.rect(fx - 6, fy - 13, 2, 6, P.shirtShade);
  p.rect(fx + 4, fy - 13, 2, 6, P.shirtDark);
  p.rect(fx - 6, fy - 13, 12, 1, P.shirtLight);
  // little vest detail
  p.rect(fx - 1, fy - 13, 2, 6, P.shirtDark);

  // neck
  p.rect(fx - 2, fy - 14, 4, 2, P.skinShade);

  // head
  p.ellipse(fx, fy - 17, 4, 4, P.skin);
  p.ellipse(fx - 1, fy - 16, 3, 3, P.skinShade);
  p.ellipse(fx + 1, fy - 18, 3, 3, P.skin);
  // tired happy eyes + brows
  p.px(fx - 2, fy - 17, '#3a2a20');
  p.px(fx + 2, fy - 17, '#3a2a20');
  p.px(fx - 3, fy - 19, P.hair);
  p.px(fx + 3, fy - 19, P.hair);
  // beard stubble
  p.rect(fx - 2, fy - 14, 5, 1, P.hair);
  p.px(fx, fy - 13, P.hair);

  // straw hat
  p.rect(fx - 8, fy - 20, 17, 2, P.hatShade);
  p.rect(fx - 8, fy - 19, 17, 1, P.hat);
  p.rect(fx - 8, fy - 18, 17, 1, P.hatDark);
  p.rect(fx - 5, fy - 24, 11, 5, P.hat);
  p.rect(fx - 5, fy - 24, 2, 5, P.hatShade);
  p.rect(fx + 3, fy - 24, 3, 5, P.hatDark);
  p.rect(fx - 5, fy - 21, 11, 1, P.hatBand);
  p.rect(fx - 5, fy - 24, 11, 1, '#f6e2a6');

  // left arm on hip
  p.rect(fx - 8, fy - 12, 3, 6, P.shirt);
  p.rect(fx - 8, fy - 7, 4, 2, P.skin);

  // right arm raised toward the rod
  p.rect(fx + 5, fy - 13, 3, 4, P.shirt);
  p.rect(fx + 8, fy - 12, 4, 3, P.shirt);
  p.rect(fx + 11, fy - 12, 3, 3, P.skin);

  anglerSprite = addOutline(cv, P.outline);
}

// world-space position of the rod hand
function anglerHand() {
  return { x: ANGLER.x + 10, y: ANGLER.feetY - 14 };
}

function drawAngler(p, t, castT) {
  if (!anglerSprite) buildAngler();
  const x = ANGLER.x;
  const bob = Math.round(Math.sin(t * 1.6) * 0.5 + 0.5); // 0..1
  const feet = ANGLER.feetY - bob;

  // shadow on the dock
  p.ellipse(x + 1, ANGLER.feetY + 1, 7, 2, P.woodDeep);
  // blit outlined body
  p.ctx.imageSmoothingEnabled = false;
  p.ctx.drawImage(anglerSprite, Math.round(x - ANG_FX), Math.round(feet - ANG_FY));

  // fishing rod (from hand up toward ROD_TIP)
  const hand = anglerHand();
  const handX = hand.x, handY = hand.y; // follow the bob
  const flick = castT != null ? Math.sin(Math.min(1, castT) * Math.PI) * -3 : 0;
  const tipX = ROD_TIP.x, tipY = ROD_TIP.y + flick;
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const a = i / segs, b = (i + 1) / segs;
    // slight bend in the rod toward the tip
    const bend = (u) => u * u * 2.5;
    p.line(handX + (tipX - handX) * a, handY + (tipY - handY) * a - bend(a),
      handX + (tipX - handX) * b, handY + (tipY - handY) * b - bend(b), i < 2 ? P.trunk : P.woodHi);
  }
  p.px(tipX, tipY, P.metal);
  // a tiny reel on the rod
  p.rect(handX - 2, handY - 1, 3, 3, P.metalDark);
  p.px(handX - 1, handY, P.metal);
}

// ---------------------------------------------------------------------------
// fishing line + bobber -----------------------------------------------------
// ---------------------------------------------------------------------------
function drawLine(p, bob) {
  if (!bob.visible) return;
  const x0 = ROD_TIP.x, y0 = ROD_TIP.y;
  const x1 = bob.x, y1 = bob.y;
  const sag = bob.state === 'bite' ? 1 : 4 + Math.sin(bob.t * 2) * 1;
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = x0 + (x1 - x0) * u;
    const y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag;
    p.px(x, y, i < 3 ? P.metal : '#e8eef0');
  }
}

function drawBobber(p, bob) {
  if (!bob.visible) return;
  let y = bob.y;
  if (bob.state === 'bite') y += Math.sin(bob.t * 22) * 2 + 2;
  if (bob.state === 'reeling') y -= 0;
  const x = Math.round(bob.x);

  // water ripple rings
  const ring = (bob.state === 'bite' ? Math.sin(bob.t * 6) : Math.sin(bob.t * 2)) * 0.5 + 0.5;
  const rw = 4 + ring * 3;
  for (let i = -rw; i <= rw; i++) {
    const yy = Math.round(y + 5 + Math.abs(i) * 0.25);
    if (i === -rw || i === rw) p.px(x + i, yy, P.foam);
    else if (i === 0) continue;
    else if (Math.abs(i) > rw - 2) p.px(x + i, yy, P.waterShallow);
  }

  // bobber body
  p.rect(x - 1, y - 5, 3, 6, P.white);
  p.rect(x - 1, y - 5, 3, 3, '#e05a3a');
  p.rect(x - 1, y - 2, 3, 1, '#c04428');
  p.px(x - 1, y - 6, P.metal);
  p.px(x + 1, y - 6, P.metal);
  p.px(x, y - 7, P.metal);

  // splash / cue
  if (bob.state === 'bite') {
    const ph = (bob.t * 3) % 1;
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + (i - 2.5) * 0.42;
      const d = 4 + ph * 7;
      p.px(x + Math.cos(ang) * d, y + 1 + Math.sin(ang) * d * 0.6, P.foam);
    }
    // exclamation bubble
    p.rect(x - 3, y - 17, 6, 8, P.white);
    p.rect(x - 1, y - 15, 2, 3, '#e04a2a');
    p.rect(x - 1, y - 11, 2, 2, '#e04a2a');
    p.rect(x - 3, y - 17, 6, 1, P.woodDark);
  }
}

// ---------------------------------------------------------------------------
// foreground framing --------------------------------------------------------
// ---------------------------------------------------------------------------
function drawForeground(p, t) {
  // dark grass silhouettes along the very bottom
  for (let x = 0; x < W; x++) {
    const n = Math.sin(x * 0.13) * 3 + Math.sin(x * 0.37) * 2;
    const top = H - 8 + Math.round(n);
    p.rect(x, top, 1, H - top, P.leafDeep);
  }
  for (let x = 0; x < W; x += 3) {
    const n = Math.sin(x * 0.21 + 1) * 4 + Math.sin(x * 0.5) * 2;
    const top = H - 12 + Math.round(n);
    p.rect(x, top, 1, H - top, P.leafDark);
  }
  // blades poking up
  for (let i = 0; i < 22; i++) {
    const bx = Math.floor((i * 53 + 11) % W);
    const h = 5 + (i % 4);
    const sway = Math.sin(t * 1.5 + i) * 1.2;
    for (let j = 0; j < h; j++) p.px(Math.round(bx + sway * (j / h)), H - 6 - j, P.leafDark);
  }
}

// ---------------------------------------------------------------------------
// particles -----------------------------------------------------------------
// ---------------------------------------------------------------------------
export function drawParticles(p, particles) {
  for (const pt of particles) {
    const life = pt.life / pt.maxLife;
    if (pt.kind === 'splash') {
      p.rect(pt.x, pt.y, pt.size, pt.size, life > 0.4 ? P.foam : P.waterShallow);
    } else if (pt.kind === 'ring') {
      const r = (1 - life) * pt.size;
      for (let a = 0; a < Math.PI * 2; a += 0.4) {
        p.px(pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r * 0.4, P.foam);
      }
    } else {
      p.rect(pt.x, pt.y, pt.size, pt.size, pt.color);
    }
  }
}

// ---------------------------------------------------------------------------
// main ----------------------------------------------------------------------
// ---------------------------------------------------------------------------
export function drawScene(ctx, t, g) {
  const p = painter(ctx);
  ctx.imageSmoothingEnabled = false;

  drawSky(p, t);
  drawFarLand(p, t);
  drawWater(p, t);
  drawWaterProps(p, t);
  drawLand(p, t);

  // background vegetation on the bank
  drawBush(p, 46, (LAND[46] ?? 119) + 14, 1);
  drawBush(p, 28, (LAND[28] ?? 104) + 18, 0.85);
  drawReeds(p, 56, (LAND[56] ?? 132) + 2, t, 5);
  drawReeds(p, 66, (LAND[66] ?? 152) + 2, t, 4);
  drawFlowers(p, 34, (LAND[34] ?? 108) + 26, 1, '#f2e06a', '#e0862a');
  drawFlowers(p, 50, (LAND[50] ?? 126) + 30, 1, '#ef7a9a', '#f6e18a');
  drawFlowers(p, 20, (LAND[20] ?? 99) + 40, 1, '#c9a0e6', '#f6e18a');
  drawRock(p, 66, (LAND[66] ?? 152) + 4, 1);
  drawRock(p, 8, H - 16, 1.4);
  // big foreground tree framing the left
  drawTree(p, 13, 158, 1.2);

  drawDock(p, t);
  drawAngler(p, t, g.castAnim);
  drawLine(p, g.bobber);
  drawBobber(p, g.bobber);

  drawParticles(p, g.particles);

  // foreground framing in front of everything
  drawCattailCluster(p, 6, H - 2, t);
  drawCattailCluster(p, 310, H - 2, t);
  drawForeground(p, t);

  // vignette-ish corner darkening
  p.rect(0, 0, W, 1, 'rgba(20,16,30,0.15)');
  p.rect(0, 0, 1, H, 'rgba(20,16,30,0.12)');
  p.rect(W - 1, 0, 1, H, 'rgba(20,16,30,0.12)');
}
