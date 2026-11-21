// scene.js — the island. Everything here is drawn with code on a 320x180
// buffer. Static terrain is baked once; water, vegetation, the angler,
// the bobber and the reveal are drawn live.

import { P, RARITIES } from './palette.js';
import {
  sprite, px, rect, line, thickLine, ellipse, circle, softShadow,
  mulberry32, clamp, lerp, smoothstep, easeOutCubic, easeInOutSine,
} from './draw.js';
import { blitFish } from './fish.js';

export const W = 320, H = 180;
export const DOCK = { x0: 26, x1: 182, top: 104, h: 23 };
export const ANGLER = { x: 92, feetY: 120 };
export const CAST_TARGET = { x: 240, y: 126 };
export const REVEAL = { x: 80, y: 34, w: 160, h: 112 };
export const BITE_WINDOW = 1.5;

const rng = mulberry32(1337);

// shore boundaries ---------------------------------------------------------
export const topWater = (x) => 30 + Math.sin(x * 0.045 + 0.4) * 4 + Math.sin(x * 0.11 + 1.7) * 2;
export const leftWater = (y) => 52 + Math.sin(y * 0.05 + 0.8) * 5 + Math.sin(y * 0.14 + 0.3) * 2;
export function isWater(x, y) { return y >= topWater(x) && x >= leftWater(y); }

// ---------------------------------------------------------------------------
// background bake
// ---------------------------------------------------------------------------
let waterBase = null;
let groundLayer = null;

function bakeWater() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const grad = c.createLinearGradient(0, 8, 0, H);
  grad.addColorStop(0, P.waterShallow);
  grad.addColorStop(0.35, P.waterMid2);
  grad.addColorStop(0.7, P.waterMid);
  grad.addColorStop(1, P.waterDeep);
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // static depth texture
  for (let i = 0; i < 2600; i++) {
    const x = (rng() * W) | 0, y = (rng() * H) | 0;
    c.globalAlpha = 0.04 + rng() * 0.05;
    c.fillStyle = rng() > 0.5 ? P.waterGlow : P.waterDeep;
    c.fillRect(x, y, rng() > 0.8 ? 2 : 1, 1);
  }
  // faint large caustic bands
  c.globalAlpha = 0.05;
  c.fillStyle = P.waterGlow;
  for (let i = 0; i < 12; i++) {
    const y = 40 + rng() * 130;
    const w = 40 + rng() * 120;
    const x = rng() * W;
    c.fillRect(x - w / 2, y, w, 1);
  }
  c.globalAlpha = 1;
  return cv;
}

function landColor(d, y) {
  if (d <= 0.5) return '#7d6a44';       // wet edge
  if (d <= 2) return '#8f7a52';         // wet sand
  if (d <= 5) return P.sand;
  if (d <= 8) return P.sandLight;
  if (y < 7) return P.hillDark;
  return P.grass;
}

function bakeGround() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // terrain
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tw = topWater(x), lw = leftWater(y);
      let d = Infinity;
      if (y < tw) d = Math.min(d, tw - y);
      if (x < lw) d = Math.min(d, lw - x);
      if (d === Infinity) continue;
      let col = landColor(d, y);
      // grass texture
      if (d > 8) {
        const r = rng();
        if (r < 0.08) col = P.grassDark;
        else if (r < 0.16) col = P.grassLight;
        else if (r < 0.19) col = P.grassHi;
      } else if (d > 5 && rng() < 0.2) {
        col = rng() < 0.5 ? P.sandLight : P.dirtLight;
      }
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
  }
  // foam + wet edge line
  for (let x = 0; x < W; x++) {
    const tw = Math.round(topWater(x));
    if (y_ok(tw)) {
      c.fillStyle = P.foam; c.globalAlpha = 0.5; c.fillRect(x, tw, 1, 1);
      c.globalAlpha = 0.22; c.fillRect(x, tw + 1, 1, 1);
      c.globalAlpha = 1;
    }
  }
  for (let y = 0; y < H; y++) {
    const lw = Math.round(leftWater(y));
    if (x_ok(lw)) {
      c.fillStyle = P.foam; c.globalAlpha = 0.5; c.fillRect(lw, y, 1, 1);
      c.globalAlpha = 0.22; c.fillRect(lw + 1, y, 1, 1);
      c.globalAlpha = 1;
    }
  }
  // pebbles / rocks / shells along the shore
  for (let i = 0; i < 60; i++) {
    const x = (rng() * W) | 0;
    const tw = topWater(x);
    if (rng() < 0.5) {
      const y = (tw - 2 - rng() * 6) | 0;
      if (y > 0) pebble(c, x, y);
    } else {
      const y = (rng() * H) | 0;
      const lw = leftWater(y);
      const px2 = (lw - 2 - rng() * 6) | 0;
      if (px2 > 0) pebble(c, px2, y);
    }
  }
  // lily pads & floating rocks in open water
  const pads = [[215, 70, 8], [268, 96, 10], [180, 150, 9], [286, 140, 7], [240, 40, 6]];
  for (const [x, y, r] of pads) lilyPad(c, x, y, r, rng() < 0.4);
  for (const [x, y, r] of [[300, 60, 3], [160, 66, 2], [255, 160, 3]]) rock(c, x, y, r);

  return cv;
}
const y_ok = (y) => y >= 0 && y < H;
const x_ok = (x) => x >= 0 && x < W;

function pebble(c, x, y) {
  c.fillStyle = rng() < 0.5 ? P.stone : P.stoneLight;
  c.fillRect(x, y, 2, 1);
  c.fillStyle = P.stoneDark;
  c.fillRect(x, y + 1, 2, 1);
}
function rock(c, x, y, r) {
  ellipse(c, x, y, r + 1, r + 1, P.stoneDark);
  ellipse(c, x, y - 1, r, r, P.stone);
  ellipse(c, x - 1, y - 1, Math.max(1, r - 1), Math.max(1, r - 1), P.stoneLight);
  px(c, x - 1, y - 2, P.stoneHi);
}
function lilyPad(c, x, y, r, flower) {
  ellipse(c, x, y + 1, r + 1, Math.max(1, r * 0.55), P.leafDark);
  ellipse(c, x, y, r, Math.max(1, r * 0.5), P.leaf);
  ellipse(c, x - 1, y - 1, r - 2, Math.max(1, r * 0.3), P.leafMid);
  // notch
  c.fillStyle = P.waterMid;
  c.fillRect(x + r - 2, y - 1, 3, 2);
  if (flower) {
    px(c, x, y - 1, P.petalPink);
    px(c, x - 1, y, P.petalPink);
    px(c, x + 1, y, P.petalPink);
    px(c, x, y + 1, P.petalPink);
    px(c, x, y, P.petalYellow);
  }
}

// ---------------------------------------------------------------------------
// vegetation (drawn live for sway)
// ---------------------------------------------------------------------------
function drawBroadleaf(c, x, baseY, s, sway) {
  softShadow(c, x, baseY, 10 * s, 3 * s, 0.22);
  rect(c, x - 1, baseY - 13 * s, 2 + Math.round(s), 13 * s, P.trunk);
  rect(c, x - 1, baseY - 13 * s, 1, 13 * s, P.trunkDark);
  const cx = x + sway, cy = baseY - 16 * s;
  ellipse(c, cx, cy + 4 * s, 12 * s, 8 * s, P.leafDark);
  ellipse(c, cx - 3 * s, cy + 1 * s, 10 * s, 7 * s, P.leaf);
  ellipse(c, cx + 4 * s, cy + 2 * s, 8 * s, 6 * s, P.leafMid);
  ellipse(c, cx - 2 * s, cy - 3 * s, 8 * s, 5 * s, P.leafLight);
  ellipse(c, cx + 1 * s, cy - 6 * s, 5 * s, 3 * s, P.leafHi);
  px(c, cx - 4 * s, cy - 5 * s, P.leafHi);
  px(c, cx + 2 * s, cy - 7 * s, P.leafHi);
}
function drawPine(c, x, baseY, s, sway) {
  softShadow(c, x, baseY, 8 * s, 2.5 * s, 0.22);
  rect(c, x - 1, baseY - 8 * s, 2, 8 * s, P.trunkDark);
  const cx = x + sway;
  for (let i = 0; i < 3; i++) {
    const yy = baseY - 6 * s - i * 7 * s;
    const hw = (11 - i * 2.6) * s;
    const hh = 9 * s;
    // triangle
    for (let j = 0; j < hh; j++) {
      const w = hw * (1 - j / hh);
      rect(c, cx - w, yy - j, w * 2, 1, i === 1 ? P.leaf : P.leafDark);
      rect(c, cx - w, yy - j, Math.max(1, w * 0.7), 1, P.leafMid);
    }
    rect(c, cx - hw, yy, hw * 2, 1, P.leafDark);
  }
  rect(c, cx - 1, baseY - 27 * s, 2, 4 * s, P.leafLight);
}
function drawBush(c, x, baseY, s, sway) {
  softShadow(c, x, baseY, 9 * s, 2.5 * s, 0.2);
  const cx = x + sway;
  ellipse(c, cx, baseY - 4 * s, 9 * s, 5 * s, P.leafDark);
  ellipse(c, cx - 3 * s, baseY - 5 * s, 6 * s, 4 * s, P.leaf);
  ellipse(c, cx + 3 * s, baseY - 4 * s, 5 * s, 3.5 * s, P.leafMid);
  ellipse(c, cx - 1 * s, baseY - 7 * s, 4 * s, 2.5 * s, P.leafLight);
  if (s > 1) { px(c, cx - 4, baseY - 6, P.petalWhite); px(c, cx + 4, baseY - 5, P.petalPink); }
}
function drawReeds(c, x, baseY, seed, t) {
  for (let i = 0; i < 5; i++) {
    const h = 11 + ((seed * 7 + i * 13) % 9);
    const sway = Math.sin(t * 1.3 + seed + i) * 2 + i * 0.6;
    const col = i % 2 ? P.grassLight : P.leaf;
    for (let j = 0; j < h; j++) {
      const xx = x + i * 2 + (sway * (j / h) ** 2);
      px(c, xx, baseY - j, j > h - 3 ? P.leafHi : col);
    }
    if (i % 2 === 0) {
      const tipX = x + i * 2 + sway;
      rect(c, tipX - 1, baseY - h - 3, 2, 4, P.trunk);
      px(c, tipX, baseY - h - 4, P.trunkDark);
    }
  }
}
function drawFlower(c, x, y, col, t) {
  const sway = Math.sin(t * 1.6 + x) * 0.8;
  for (let j = 0; j < 4; j++) px(c, x + sway * (j / 4), y + j, P.stem);
  const fx = x + sway, fy = y - 1;
  px(c, fx - 1, fy, col); px(c, fx + 1, fy, col);
  px(c, fx, fy - 1, col); px(c, fx, fy + 1, col);
  px(c, fx, fy, P.petalYellow);
}
function grassTuft(c, x, y, s, t) {
  const sway = Math.sin(t * 1.8 + x * 0.7) * 1.2;
  for (let i = 0; i < 3; i++) {
    const h = (3 + i) * s;
    const dx = (i - 1) * 1.5 * s + sway * (i / 3);
    for (let j = 0; j < h; j++) px(c, x + dx * (j / h), y - j, j === h - 1 ? P.grassHi : P.grassLight);
  }
}

// ---------------------------------------------------------------------------
// dock + props
// ---------------------------------------------------------------------------
function drawDock(c, t) {
  const { x0, x1, top, h } = DOCK;
  const w = x1 - x0;
  // shadow on the water
  c.save();
  c.globalAlpha = 0.22;
  rect(c, x0 + 3, top + h, w, 7, '#06181c');
  c.restore();
  // posts + their reflections
  for (const px2 of [x0 + 12, x0 + 48, x0 + 84, x0 + 120, x0 + 152]) {
    rect(c, px2 - 2, top + h - 2, 4, 10, P.woodDark);
    rect(c, px2 - 2, top + h - 2, 1, 10, P.wood);
    c.globalAlpha = 0.25;
    rect(c, px2 - 2, top + h + 8, 4, 4, '#06181c');
    c.globalAlpha = 1;
  }
  // planks (4 rows of boards)
  for (let r = 0; r < 4; r++) {
    const by = top + r * 6;
    rect(c, x0, by, w, 5, r % 2 ? P.wood : P.woodMid);
    rect(c, x0, by, w, 1, P.woodLight);
    rect(c, x0, by + 4, w, 1, P.woodDark);
  }
  // vertical seams
  for (let sx = x0 + 10; sx < x1; sx += 22) {
    rect(c, sx, top, 1, h, P.woodDark);
    rect(c, sx + 1, top, 1, h, P.woodLight);
    px(c, sx - 2, top + 3, P.nail);
    px(c, sx + 3, top + 3, P.nail);
    px(c, sx - 2, top + 15, P.nail);
  }
  // side edges
  rect(c, x0, top, w, 1, P.woodHi);
  rect(c, x0, top + h - 1, w, 1, '#3a2517');
  // a rope coil and a creel near the shore end
  const rxp = x0 + 8, ryp = top + 3;
  ellipse(c, rxp, ryp, 5, 2, P.woodDark);
  ellipse(c, rxp, ryp - 1, 4, 1.5, P.woodLight);
  ellipse(c, rxp, ryp - 2, 2.5, 1, P.woodHi);
  // small bucket
  const bx = x0 + 62;
  rect(c, bx, top - 6, 7, 7, P.stoneDark);
  rect(c, bx, top - 6, 7, 2, P.stone);
  rect(c, bx + 1, top - 5, 5, 1, P.stoneLight);
  line(c, bx + 1, top - 6, bx + 5, top - 10, P.stoneDark);
  line(c, bx + 5, top - 10, bx + 5, top - 6, P.stoneLight);
  // lantern post at dock end
  const lx = x1 - 6;
  rect(c, lx, top - 20, 3, 20, P.woodDark);
  rect(c, lx, top - 20, 1, 20, P.wood);
  rect(c, lx - 2, top - 26, 7, 7, P.woodDark);
  rect(c, lx - 1, top - 25, 5, 5, P.uiGold);
  px(c, lx + 1, top - 24, '#fff3c0');
}

// ---------------------------------------------------------------------------
// animated water
// ---------------------------------------------------------------------------
const sparkles = [];
for (let i = 0; i < 46; i++) {
  sparkles.push({ x: 60 + rng() * 255, y: 34 + rng() * 142, ph: rng() * 6.28, sp: 0.6 + rng() * 1.6 });
}
function drawWater(c, t) {
  // moving cloud shadow
  c.save();
  c.globalAlpha = 0.07;
  const cx = ((t * 6) % 520) - 100;
  ellipse(c, cx, 150, 120, 45, '#04161b');
  ellipse(c, cx + 60, 60, 90, 30, '#04161b');
  c.restore();

  // wave highlight lines
  for (let i = 0; i < 11; i++) {
    const baseY = 34 + i * 13 + Math.sin(t * 0.5 + i) * 3;
    c.save();
    c.globalAlpha = 0.10 - i * 0.003;
    c.fillStyle = P.foam;
    for (let x = 40; x < W; x += 2) {
      const y = baseY + Math.sin(x * 0.09 + t * 1.3 + i * 1.7) * 2 + Math.sin(x * 0.23 - t * 0.9) * 1;
      const yy = Math.round(y);
      c.fillRect(x, yy, 2, 1);
    }
    c.restore();
  }
  // darker ripple lines
  for (let i = 0; i < 6; i++) {
    const baseY = 50 + i * 22 + Math.sin(t * 0.4 + i * 2) * 4;
    c.save();
    c.globalAlpha = 0.06;
    c.fillStyle = P.waterDeep;
    for (let x = 50; x < W; x += 3) {
      const y = baseY + Math.sin(x * 0.06 - t * 0.7 + i) * 3;
      c.fillRect(x, Math.round(y), 3, 1);
    }
    c.restore();
  }
  // sparkles
  for (const s of sparkles) {
    const v = Math.sin(t * s.sp + s.ph);
    if (v > 0.86) {
      c.save();
      c.globalAlpha = (v - 0.86) / 0.14;
      px(c, s.x, s.y, P.sparkle);
      if (v > 0.96) { px(c, s.x - 1, s.y, P.foam); px(c, s.x, s.y - 1, P.foam); px(c, s.x + 1, s.y, P.foam); }
      c.restore();
    }
  }
}

function drawReflections(c, t) {
  // faint mirrored tree colour just inside the far/left waterline
  c.save();
  c.globalAlpha = 0.14;
  for (let x = 60; x < W; x += 3) {
    const y = Math.round(topWater(x));
    const h = 4 + Math.round(Math.sin(x * 0.2) * 2 + 3);
    c.fillStyle = P.hillDark;
    for (let j = 1; j < h; j++) {
      c.globalAlpha = 0.16 * (1 - j / h);
      const w = Math.sin(t * 1.1 + j * 0.7 + x * 0.1) * 1.5;
      c.fillRect(x + w, y + j, 2, 1);
    }
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// angler
// ---------------------------------------------------------------------------
const ANGLER_MAP = [
  '....kkkk....',
  '...kcccck...',
  '..kcccccck..',
  '..kcCCCCck..',
  '.kkkkkkkkkk.',
  '..khhssssk..',
  '..khsssSsk..',
  '..khhsssSk..',
  '..kkkbbbkk..',
  '.kbbbbbbbk..',
  '.kbllbbbbbk.',
  '.kbbbbbbbbk.',
  '.kbbbbbbbbk.',
  '.kBbbbbbbBk.',
  '..kppppppk..',
  '..kpppppppk.',
  '..kpp.ppk...',
  '..kpp.ppk...',
  '..koo.ook...',
  '..kOO.OOk...',
];
const ANGLER_PAL = {
  k: P.outline, c: P.cap, C: P.capShade, s: P.skin, S: P.skinShade,
  h: P.hair, b: P.shirt, B: P.shirtShade, l: P.shirtLight,
  p: P.pants, P: P.pantsShade, o: P.boot, O: P.bootLight,
};

// returns { shoulder, hand, tip, angle }
function anglerPose(g, t) {
  const ax = ANGLER.x, fy = ANGLER.feetY;
  const shoulder = { x: ax + 2, y: fy - 11 };
  let a = -1.02;
  let bob = Math.sin(t * 1.6) * 0.6;
  if (g.phase === 'reeling') {
    a = -0.86 + Math.sin(g.phaseT * 22) * 0.28;
    bob = -1;
  } else if (g.phase === 'bite') {
    a = -0.78 + Math.sin(g.phaseT * 18) * 0.06;
    bob = -1.5;
  } else if (g.phase === 'reveal') {
    a = -1.25;
    bob = 0.5;
  }
  shoulder.y += bob;

  const armLen = 5;
  const hand = { x: shoulder.x + Math.cos(a) * armLen, y: shoulder.y + Math.sin(a) * armLen };
  const tip = { x: hand.x + Math.cos(a) * 25, y: hand.y + Math.sin(a) * 25 };
  return { shoulder, hand, tip, angle: a, bob };
}

// pose during the cast: rod sweeps back then forward
function castPose(p) {
  const ax = ANGLER.x, fy = ANGLER.feetY;
  const shoulder = { x: ax + 2, y: fy - 11 };
  let a;
  if (p < 0.4) a = lerp(-1.02, -2.7, easeInOutSine(p / 0.4));
  else if (p < 0.62) a = lerp(-2.7, -0.1, easeOutCubic((p - 0.4) / 0.22));
  else a = lerp(-0.1, -0.62, (p - 0.62) / 0.38);
  const armLen = 5;
  const hand = { x: shoulder.x + Math.cos(a) * armLen, y: shoulder.y + Math.sin(a) * armLen };
  const tip = { x: hand.x + Math.cos(a) * 25, y: hand.y + Math.sin(a) * 25 };
  return { shoulder, hand, tip, angle: a, bob: 0 };
}

function drawAngler(c, pose, opts = {}) {
  const ax = ANGLER.x, fy = ANGLER.feetY + (pose.bob || 0);
  // shadow on dock
  c.save(); c.globalAlpha = 0.3;
  ellipse(c, ax, DOCK.top + DOCK.h - 3, 7, 2.5, '#2a1a10');
  c.restore();
  // far arm/rod back? draw rod behind body first
  if (opts.rodBehind) {
    thickLine(c, pose.hand.x, pose.hand.y, pose.tip.x, pose.tip.y, P.rod, 2);
    line(c, pose.hand.x, pose.hand.y, pose.tip.x, pose.tip.y, P.rodLight);
  }
  sprite(c, ANGLER_MAP, ANGLER_PAL, ax - 6, fy - 20);
  // near arm
  thickLine(c, pose.shoulder.x, pose.shoulder.y, pose.hand.x, pose.hand.y, P.shirtShade, 2);
  px(c, pose.hand.x, pose.hand.y, P.skin);
  px(c, pose.hand.x, pose.hand.y + 1, P.skinShade);
  // rod in front
  if (!opts.rodBehind) {
    thickLine(c, pose.hand.x, pose.hand.y, pose.tip.x, pose.tip.y, P.rod, 2);
    line(c, pose.hand.x, pose.hand.y, pose.tip.x, pose.tip.y, P.rodLight);
    // reel
    circle(c, pose.hand.x + 3, pose.hand.y + 3, 2, P.stoneDark);
    px(c, pose.hand.x + 3, pose.hand.y + 3, P.reel);
  }
  return pose.tip;
}

// ---------------------------------------------------------------------------
// line + bobber
// ---------------------------------------------------------------------------
function drawLine(c, from, to, sag) {
  const n = 16;
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2 + sag;
  let prev = from;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * mx + u * u * to.x;
    const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * my + u * u * to.y;
    line(c, prev.x, prev.y, x, y, P.line);
    prev = { x, y };
  }
}

const BOBBER = [
  '..k..',
  '.krk.',
  'krwrk',
  '.kwk.',
  '..k..',
];
const BOBBER_PAL = { k: P.outline, r: P.bobberRed, w: P.white };

function drawBobber(c, x, y, t, dip, ring) {
  x = Math.round(x); y = Math.round(y);
  // ripple rings
  c.save();
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 0.9 + i / 3) % 1);
    c.globalAlpha = 0.35 * (1 - ph);
    ellipse(c, x, y + 1, 3 + ph * 9, 1.4 + ph * 3.4, 'transparent');
    c.strokeStyle = P.foam;
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(x + 0.5, y + 1.5, 3 + ph * 9, 1.4 + ph * 3.4, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  if (ring) {
    // closing brackets: the bite window visibly tightening
    c.save();
    c.globalAlpha = 0.9;
    const r = ring;
    const col = P.uiGold;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [sx, sy] of corners) {
      for (let i = 0; i < 4; i++) {
        px(c, x + sx * r, y + sy * (r - i * 2) + 1, col);
        px(c, x + sx * (r - i * 2), y + sy * r + 1, col);
      }
    }
    c.restore();
  }
  dip = dip || 0;
  sprite(c, BOBBER, BOBBER_PAL, x - 2, y - 2 + Math.round(dip));
  // white splash cap while bitten
  if (dip > 1) {
    px(c, x - 1, y + 2, P.foam); px(c, x + 1, y + 2, P.foam); px(c, x, y + 3, P.foam);
  }
}

function drawCue(c, x, y, t) {
  // paddle-post sign with a bold "!"
  const bx = Math.round(x), by = Math.round(y) - 22;
  const pop = 1 + Math.sin(t * 10) * 0.1;
  circle(c, bx, by, 7 * pop, P.black);
  circle(c, bx, by, 6 * pop, P.uiGold);
  rect(c, bx - 1, by - 4, 3, 6, P.black);
  rect(c, bx - 1, by + 3, 3, 2, P.black);
}

// ---------------------------------------------------------------------------
// splash particles for reeling
// ---------------------------------------------------------------------------
function drawSplash(c, x, y, t, amt) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 2;
    const r = (1 - ((t * 2 + i * 0.13) % 1)) * 10 * amt;
    const yy = y - Math.abs(Math.sin(t * 3 + i)) * 6 - (1 - r / 10) * 2;
    c.save(); c.globalAlpha = 0.7 * (r / 10 + 0.2);
    px(c, x + Math.cos(a) * r, yy, P.sparkle);
    c.restore();
  }
}

// ---------------------------------------------------------------------------
// the reveal
// ---------------------------------------------------------------------------
function roundRect(c, x, y, w, h, r, col) {
  c.fillStyle = col;
  c.fillRect(x + r, y, w - 2 * r, h);
  c.fillRect(x, y + r, w, h - 2 * r);
  for (let i = 0; i < r; i++) {
    const o = r - i;
    c.fillRect(x + o, y + o, 1, 1);
    c.fillRect(x + w - 1 - o, y + o, 1, 1);
    c.fillRect(x + o, y + h - 1 - o, 1, 1);
    c.fillRect(x + w - 1 - o, y + h - 1 - o, 1, 1);
  }
  for (let i = 0; i < r; i++) {
    c.fillRect(x + r - i - 1, y + i, 1, 1);
  }
}
function strokeRoundRect(c, x, y, w, h, r, col) {
  c.fillStyle = col;
  c.fillRect(x + r, y, w - 2 * r, 1);
  c.fillRect(x + r, y + h - 1, w - 2 * r, 1);
  c.fillRect(x, y + r, 1, h - 2 * r);
  c.fillRect(x + w - 1, y + r, 1, h - 2 * r);
  for (let i = 0; i <= r; i++) {
    const o = r - i;
    c.fillRect(x + o, y + o, 1, 1);
    c.fillRect(x + w - 1 - o, y + o, 1, 1);
    c.fillRect(x + o, y + h - 1 - o, 1, 1);
    c.fillRect(x + w - 1 - o, y + h - 1 - o, 1, 1);
  }
}

function drawReveal(c, g, t) {
  const { fish, rarity } = g.caught;
  const R = RARITIES[rarity];
  const { x, y, w, h } = REVEAL;
  const u = clamp(g.phaseT / 0.45, 0, 1);
  const eu = easeOutCubic(u);
  const cx = x + w / 2, cy = y + h / 2;

  // dim world
  c.save();
  c.globalAlpha = 0.5 * eu;
  rect(c, 0, 0, W, H, '#0a1418');
  c.restore();

  // tier aura behind panel
  c.save();
  c.globalAlpha = 0.5 * eu;
  const aura = 10 + Math.sin(t * 2) * 2;
  ellipse(c, cx, cy, w * 0.62 + aura, h * 0.62 + aura, R.glow);
  c.restore();

  // panel
  c.save();
  c.globalAlpha = eu;
  roundRect(c, x, y, w, h, 7, 'rgba(12,16,24,0.96)');
  roundRect(c, x + 1, y + 1, w - 2, h - 2, 6, 'rgba(26,32,46,0.96)');
  // tier-specific frame
  const feats = tierFrame(c, rarity, R, x, y, w, h, t, cx, cy);
  c.restore();

  // particles unique to the tier
  tierEffects(c, rarity, R, cx, cy, t, eu);

  // fish entrance: pop + gentle float
  const rise = (1 - eu) * 14;
  const scale = fish.scaleReveal;
  const fscale = 1 + (1 - eu) * 0.35;
  const fx = cx, fy = cy - 6 + Math.sin(t * 1.6) * 1.5 + rise;
  c.save();
  c.globalAlpha = eu;
  blitFish(c, fish, fx, fy, scale * fscale);
  c.restore();
}

function tierFrame(c, rarity, R, x, y, w, h, t, cx, cy) {
  const pulse = 0.5 + Math.sin(t * 3) * 0.5;
  if (rarity === 'Common') {
    strokeRoundRect(c, x, y, w, h, 7, '#8b93a0');
    strokeRoundRect(c, x + 1, y + 1, w - 2, h - 2, 6, '#5a6270');
  } else if (rarity === 'Uncommon') {
    strokeRoundRect(c, x, y, w, h, 7, R.color);
    strokeRoundRect(c, x + 2, y + 2, w - 4, h - 4, 5, R.glow);
    // leaf corner accents
    for (const [sx, sy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) {
      px(c, sx, sy, P.leafHi); px(c, sx + (sx < cx ? 1 : -1), sy, P.leafLight);
      px(c, sx, sy + (sy < cy ? 1 : -1), P.leafLight);
    }
  } else if (rarity === 'Rare') {
    strokeRoundRect(c, x, y, w, h, 7, R.color);
    strokeRoundRect(c, x + 2, y + 2, w - 4, h - 4, 5, R.color);
    strokeRoundRect(c, x + 3, y + 3, w - 6, h - 6, 4, R.glow);
  } else if (rarity === 'Epic') {
    strokeRoundRect(c, x, y, w, h, 7, R.color);
    strokeRoundRect(c, x + 2, y + 2, w - 4, h - 4, 5, R.glow);
    // corner gems
    c.fillStyle = R.color;
    for (const [sx, sy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) {
      c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3);
    }
  } else if (rarity === 'Legendary') {
    // rotating rays behind panel
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.5);
    c.globalAlpha = 0.20;
    c.fillStyle = R.color;
    for (let i = 0; i < 12; i++) {
      c.rotate(Math.PI / 6);
      c.fillRect(0, -2, 240, 3);
    }
    c.restore();
    strokeRoundRect(c, x, y, w, h, 7, R.color);
    strokeRoundRect(c, x + 2, y + 2, w - 4, h - 4, 5, P.uiGold);
    strokeRoundRect(c, x + 3, y + 3, w - 6, h - 6, 4, R.glow);
    // crown spikes on the top edge
    for (let i = 0; i < 5; i++) {
      const sx = x + 20 + i * ((w - 40) / 4);
      rect(c, sx - 1, y - 3 - (i % 2 ? 2 : 0), 3, 4 + (i % 2 ? 2 : 0), R.color);
      px(c, sx, y - 4 - (i % 2 ? 2 : 0), P.uiGold);
    }
  } else if (rarity === 'Ancient') {
    // dark void inset
    roundRect(c, x + 3, y + 3, w - 6, h - 6, 5, 'rgba(6,20,24,0.9)');
    // rotating rune ring
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.35);
    c.globalAlpha = 0.85;
    const runes = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    for (const [gx, gy] of runes) {
      const g = glyph();
      for (const [a, b] of g) {
        px(c, gx * (w * 0.42) + a, gy * (h * 0.42) + b, R.color);
      }
    }
    c.restore();
    // pulsing double frame
    strokeRoundRect(c, x, y, w, h, 7, R.color);
    c.save();
    c.globalAlpha = 0.4 + pulse * 0.6;
    strokeRoundRect(c, x + 2, y + 2, w - 4, h - 4, 5, '#ffffff');
    c.restore();
    strokeRoundRect(c, x + 4, y + 4, w - 8, h - 8, 4, R.glow);
  }
}

let glyphCount = 0;
function glyph() {
  glyphCount++;
  const g = [
    [[0, 0], [0, 1], [0, 2], [1, 1], [-1, 1]],
    [[0, 0], [1, 1], [0, 1], [0, 2]],
    [[-1, 0], [1, 0], [0, 1], [0, 2]],
    [[-1, 2], [1, 2], [0, 1], [0, 0]],
    [[-1, 0], [0, 1], [1, 2]],
    [[0, 0], [1, 0], [0, 1], [-1, 1]],
  ][glyphCount % 6];
  return g;
}

function tierEffects(c, rarity, R, cx, cy, t, eu) {
  if (rarity === 'Common') return;
  const n = rarity === 'Ancient' ? 16 : rarity === 'Legendary' ? 14 : rarity === 'Epic' ? 10 : rarity === 'Rare' ? 8 : 5;
  for (let i = 0; i < n; i++) {
    const seed = i * 97.13;
    const ph = ((t * (rarity === 'Ancient' ? 0.35 : rarity === 'Legendary' ? 0.9 : 0.6) + i / n) % 1);
    c.save();
    c.globalAlpha = eu * 0.85 * (1 - ph);
    let x, y, col = R.color, size = 1;
    if (rarity === 'Rare') {
      x = cx + Math.sin(seed) * (REVEAL.w * 0.42);
      y = cy + REVEAL.h * 0.4 - ph * (REVEAL.h * 0.9);
      col = R.color;
    } else if (rarity === 'Epic') {
      const a = ph * Math.PI * 2 + seed;
      const r = 30 + ph * 48;
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r * 0.6;
      col = ph > 0.5 ? R.color : '#ffffff';
    } else if (rarity === 'Legendary') {
      x = cx + Math.sin(seed) * (REVEAL.w * 0.48);
      y = cy - REVEAL.h * 0.45 + ph * REVEAL.h * 0.95;
      col = ph > 0.6 ? P.uiGold : R.color;
      size = 2;
    } else if (rarity === 'Ancient') {
      x = cx + Math.sin(seed) * (REVEAL.w * 0.36);
      y = cy + REVEAL.h * 0.42 - ph * REVEAL.h * 0.95;
      col = ph > 0.5 ? '#ffffff' : R.color;
    } else { // Uncommon
      x = cx + Math.cos(seed) * (REVEAL.w * 0.45);
      y = cy - REVEAL.h * 0.4 + ph * REVEAL.h * 0.9;
      col = P.leafHi;
    }
    px(c, Math.round(x), Math.round(y), col);
    if (size === 2) { px(c, Math.round(x) + 1, Math.round(y), col); px(c, Math.round(x), Math.round(y) + 1, R.glow); }
    c.restore();
  }
}

// ---------------------------------------------------------------------------
// main scene render
// ---------------------------------------------------------------------------
export function initScene() {
  waterBase = bakeWater();
  groundLayer = bakeGround();
}

export function renderScene(c, g, t) {
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, W, H);
  c.drawImage(waterBase, 0, 0);
  drawWater(c, t);
  drawReflections(c, t);
  c.drawImage(groundLayer, 0, 0);

  // vegetation (swaying)
  const trees = [
    [22, 20, 0.95, 'b'], [78, 24, 0.8, 'p'], [128, 22, 0.9, 'p'], [176, 26, 0.75, 'b'],
    [224, 24, 0.85, 'p'], [276, 22, 0.9, 'b'], [306, 27, 0.7, 'p'],
    [30, 74, 1.15, 'b'], [20, 128, 1.0, 'p'], [36, 170, 1.25, 'b'],
  ];
  for (let i = 0; i < trees.length; i++) {
    const [x, y, s, kind] = trees[i];
    const sway = Math.sin(t * 0.7 + i * 1.3) * 1.3 * s;
    if (kind === 'p') drawPine(c, x, y, s, sway);
    else drawBroadleaf(c, x, y, s, sway);
  }
  // bushes + shore flowers
  drawBush(c, 58, 38, 1.1, Math.sin(t * 0.8 + 1) * 1.1);
  drawBush(c, 150, 40, 0.9, Math.sin(t * 0.8 + 2) * 1.0);
  drawBush(c, 250, 42, 1.0, Math.sin(t * 0.8 + 3) * 1.1);
  drawBush(c, 57, 96, 1.15, Math.sin(t * 0.8 + 4) * 1.1);
  drawBush(c, 55, 156, 1.0, Math.sin(t * 0.8 + 5) * 1.0);
  const flowerCols = [P.petalPink, P.petalWhite, P.petalPurple, P.petalYellow, P.petalRed];
  const flowers = [[64, 44], [70, 52], [58, 60], [66, 70], [62, 118], [58, 138], [66, 148], [60, 166], [48, 86], [50, 106]];
  for (let i = 0; i < flowers.length; i++) {
    drawFlower(c, flowers[i][0], flowers[i][1], flowerCols[i % flowerCols.length], t);
  }
  // reeds at the waterline
  drawReeds(c, 46, 46, 1, t);
  drawReeds(c, 60, 44, 2, t);
  drawReeds(c, 300, 40, 3, t);
  drawReeds(c, 196, 38, 4, t);
  drawReeds(c, 44, 72, 5, t);
  drawReeds(c, 42, 168, 6, t);

  drawDock(c, t);

  // angler + fishing rig
  const pose = g.castActive ? castPose(g.castP) : anglerPose(g, t);
  const tip = drawAngler(c, pose, {});

  // bobber + line depending on phase
  if (g.castActive) {
    const b = g.bobberPos;
    drawLine(c, tip, b, 6);
    drawBobber(c, b.x, b.y, t, 0, 0);
  } else if (g.phase === 'waiting') {
    const b = g.bobberPos;
    const bob = Math.sin(t * 2.1) * 0.7;
    drawLine(c, tip, { x: b.x, y: b.y + bob }, 7);
    drawBobber(c, b.x, b.y + bob, t, 0, 0);
  } else if (g.phase === 'bite') {
    const b = g.bobberPos;
    const dip = 2 + Math.abs(Math.sin(t * 14)) * 1.8;
    drawLine(c, tip, { x: b.x, y: b.y + dip }, 5);
    drawBobber(c, b.x, b.y + dip, t, dip, g.biteRing);
    drawCue(c, b.x, b.y, t);
  } else if (g.phase === 'reeling') {
    const b = g.bobberPos;
    drawLine(c, tip, b, 4);
    drawBobber(c, b.x, b.y, t, 0, 0);
    drawSplash(c, b.x, b.y, t, 1);
    // leaping fish
    if (g.reelFish) {
      const f = g.reelFish;
      blitFish(c, f.fish, f.x, f.y, 2);
    }
  } else if (g.phase === 'reveal') {
    // line still out but slack
  }

  // foreground depth: corner foliage silhouettes
  drawForeground(c, t);

  if (g.phase === 'reveal') drawReveal(c, g, t);

  // miss flash
  if (g.missFlash > 0) {
    c.save();
    c.globalAlpha = g.missFlash * 0.5;
    rect(c, 0, 0, W, H, '#3a0e0e');
    c.restore();
    // splash where the bobber actually was
    drawSplash(c, g.bobberPos.x, g.bobberPos.y, t, 1);
  }
}

function drawForeground(c, t) {
  // foreground depth: dark reeds/grasses framing the lower corners. Their
  // bases sit under the UI bar; the tips rise into view.
  const clumps = [
    [14, 172, 1.5], [26, 174, 1.2], [4, 176, 1.7],
    [300, 174, 1.5], [312, 172, 1.3], [290, 177, 1.1],
  ];
  for (let k = 0; k < clumps.length; k++) {
    const [bx, by, s] = clumps[k];
    const sway = Math.sin(t * 1.1 + k) * 1.4;
    for (let i = 0; i < 6; i++) {
      const h = (16 + ((k * 5 + i * 9) % 16)) * s;
      const x = bx + i * 1.6 * s;
      const col = i % 2 ? P.leafDark : P.grassDark;
      for (let j = 0; j < h; j++) {
        px(c, x + sway * (j / h) ** 2, by - j, j > h - 4 ? P.leafMid : col);
      }
      if (i % 2 === 0 && h > 24) {
        const tx = x + sway;
        rect(c, tx - 1, by - h - 3, 2, 4, P.woodDark);
        px(c, tx, by - h - 4, P.trunkDark);
      }
    }
  }
}
