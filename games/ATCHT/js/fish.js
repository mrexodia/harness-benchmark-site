// fish.js — every fish is original, drawn in code as layered pixel shapes.
// A fish is rendered once at 1x into a small offscreen canvas, then blitted
// with nearest-neighbour scaling so it stays crisp pixel art.

import { ellipse, rect, line, px } from './draw.js';

const CW = 46;
const CH = 34;
const CX = 24;
const CY = 17;

function poly(ctx, pts, col) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  minY = Math.floor(minY); maxY = Math.ceil(maxY);
  ctx.fillStyle = col;
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.round(xs[i]);
      const x1 = Math.round(xs[i + 1]);
      ctx.fillRect(x0, y, x1 - x0 + 1, 1);
    }
  }
}

function outlineEllipse(ctx, cx, cy, rx, ry, col) {
  ellipse(ctx, cx, cy, rx + 1, ry + 1, col);
  ellipse(ctx, cx, cy + 1, rx + 1, ry + 1, col);
}

function shapeTail(ctx, d, col) {
  const tx = d.tailX, ty = d.by, L = d.tailLen, S = d.tailSpread;
  const type = d.tailType;
  let pts;
  if (type === 'fork') {
    pts = [[tx + 2, ty], [tx - L, ty - S], [tx - L * 0.45, ty], [tx - L, ty + S]];
  } else if (type === 'fan') {
    pts = [[tx + 2, ty - 1], [tx - L, ty - S], [tx - L - 2, ty], [tx - L, ty + S], [tx + 2, ty + 1]];
  } else if (type === 'round') {
    pts = [[tx + 2, ty - 1], [tx - L, ty - S], [tx - L - 3, ty], [tx - L, ty + S], [tx + 2, ty + 1]];
  } else { // 'point'
    pts = [[tx + 2, ty - 1], [tx - L - 1, ty], [tx + 2, ty + 1]];
  }
  poly(ctx, pts, col);
}

function drawFin(ctx, a, b, c, col, edge) {
  poly(ctx, [a, b, c], col);
  if (edge) {
    line(ctx, a[0], a[1], b[0], b[1], edge);
    line(ctx, b[0], b[1], c[0], c[1], edge);
  }
}

function render(def) {
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const c = def.colors;
  const bx = CX, by = CY + (def.yOff || 0);
  const rx = def.rx, ry = def.ry;
  const tx = bx - rx + 2;

  const dorsalA = [bx - rx * 0.45, by - ry + 1];
  const dorsalB = [bx + rx * 0.05, by - ry - (def.dorsalH || 4)];
  const dorsalC = [bx + rx * 0.5, by - ry + 1];
  const analA = [bx - rx * 0.15, by + ry - 1];
  const analB = [bx + rx * 0.15, by + ry + (def.analH || 3)];
  const analC = [bx + rx * 0.5, by + ry - 1];
  const pectA = [bx + rx * 0.15, by + ry * 0.15];
  const pectB = [bx - rx * 0.1, by + ry * 0.95];
  const pectC = [bx + rx * 0.55, by + ry * 0.6];

  // ---- outline pass -------------------------------------------------------
  outlineEllipse(ctx, bx, by - 1, rx, ry, c.outline);
  shapeTail(ctx, { tailX: tx, by, tailLen: def.tailLen + 1, tailSpread: def.tailSpread + 1, tailType: def.tailType }, c.outline);
  if (def.dorsalType !== 'none') drawFin(ctx,
    [dorsalA[0] - 1, dorsalA[1] + 1], [dorsalB[0], dorsalB[1] - 1], [dorsalC[0] + 1, dorsalC[1] + 1], c.outline, null);
  if (def.anal) drawFin(ctx, [analA[0] - 1, analA[1]], [analB[0], analB[1] + 1], [analC[0] + 1, analC[1]], c.outline, null);

  // ---- tail & fins --------------------------------------------------------
  shapeTail(ctx, { tailX: tx, by, tailLen: def.tailLen, tailSpread: def.tailSpread, tailType: def.tailType }, c.fin);
  // tail ribs
  for (let i = 0; i < 3; i++) {
    const yy = by - def.tailSpread + i * (def.tailSpread / 1.4);
    line(ctx, tx, by, tx - def.tailLen + 1, yy, c.finDark);
  }

  if (def.dorsalType !== 'none') {
    if (def.dorsalType === 'spiky') {
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x0 = dorsalA[0] + (dorsalC[0] - dorsalA[0]) * t;
        drawFin(ctx, [x0 - 2, dorsalA[1]], [x0, dorsalA[1] - def.dorsalH - (i % 2 ? 2 : 0)], [x0 + 2, dorsalA[1]], c.fin, c.finDark);
      }
    } else {
      drawFin(ctx, dorsalA, dorsalB, dorsalC, c.fin, c.finDark);
      line(ctx, dorsalA[0], dorsalA[1], dorsalB[0], dorsalB[1], c.finLight || c.fin);
    }
  }
  if (def.anal) drawFin(ctx, analA, analB, analC, c.fin, c.finDark);
  // pectoral
  drawFin(ctx, pectA, pectB, pectC, c.fin, c.finDark);

  // ---- body ---------------------------------------------------------------
  ellipse(ctx, bx, by, rx, ry, c.body);
  // top shading
  ellipse(ctx, bx - 1, by - Math.round(ry * 0.45), Math.max(1, rx - 2), Math.max(1, Math.round(ry * 0.5)), c.bodyDark);
  // mid highlight
  ellipse(ctx, bx + 1, by - Math.round(ry * 0.15), Math.max(1, rx - 4), Math.max(1, Math.round(ry * 0.32)), c.bodyLight);
  // belly
  ellipse(ctx, bx, by + Math.round(ry * 0.5), Math.max(1, rx - 3), Math.max(1, Math.round(ry * 0.45)), c.belly);
  // re-outline bottom
  line(ctx, bx - rx + 1, by + ry - 1, bx + rx - 2, by + ry - 1, c.outline);

  // ---- patterns -----------------------------------------------------------
  const feats = def.features || [];
  if (feats.includes('stripesV')) {
    for (let i = -2; i <= 2; i++) {
      const x = bx + i * (rx / 2.6);
      const span = Math.round(ry * Math.sqrt(Math.max(0, 1 - Math.pow((x - bx) / rx, 2))) * 0.95);
      rect(ctx, Math.round(x), by - span, 2, span * 2, c.pattern);
    }
  }
  if (feats.includes('stripesH')) {
    line(ctx, bx - rx + 1, by - 1, bx + rx - 2, by - 1, c.pattern);
    line(ctx, bx - rx + 1, by, bx + rx - 3, by, c.pattern);
  }
  if (feats.includes('lateral')) {
    line(ctx, bx - rx + 1, by - 1, bx + rx - 3, by - 2, c.pattern);
  }
  if (feats.includes('spots')) {
    const spots = [[-0.4, -0.2], [0.0, 0.25], [0.4, -0.05], [0.15, -0.45], [-0.15, 0.5], [0.55, 0.3], [-0.55, 0.1]];
    for (const [sx, sy] of spots) {
      px(ctx, Math.round(bx + sx * rx), Math.round(by + sy * ry), c.pattern);
      px(ctx, Math.round(bx + sx * rx) + 1, Math.round(by + sy * ry), c.pattern);
    }
  }
  if (feats.includes('glowspots')) {
    const spots = [[-0.35, -0.15], [0.05, 0.3], [0.4, -0.2], [0.2, 0.05], [-0.15, 0.45]];
    for (const [sx, sy] of spots) {
      px(ctx, Math.round(bx + sx * rx), Math.round(by + sy * ry), c.glow);
      px(ctx, Math.round(bx + sx * rx) + 1, Math.round(by + sy * ry), c.glow);
    }
  }
  if (feats.includes('runes')) {
    const glyph = [[0, 0], [0, 1], [1, 2], [0, 3], [-1, 2], [-1, 1]];
    for (let k = -1; k <= 1; k++) {
      const ox = bx + k * (rx * 0.55);
      for (const [gx, gy] of glyph) {
        px(ctx, Math.round(ox + gx), Math.round(by + gy - 1), k === 0 && gy === 1 ? c.glow2 : c.glow);
      }
    }
  }

  // ---- head details -------------------------------------------------------
  const noseX = bx + rx - 1;
  if (feats.includes('teeth') || feats.includes('fangs')) {
    const fangs = feats.includes('fangs') ? 3 : 2;
    for (let i = 0; i < fangs; i++) {
      px(ctx, noseX - 2 - i * 2, by + ry * 0.45, c.teeth);
      px(ctx, noseX - 2 - i * 2, by + ry * 0.45 + 1, c.teeth);
    }
  }
  if (feats.includes('whiskers')) {
    line(ctx, noseX - 2, by + ry * 0.3, noseX - 10, by + ry * 0.9, c.pattern);
    line(ctx, noseX - 2, by + ry * 0.55, noseX - 9, by + ry * 1.4, c.pattern);
  }
  if (feats.includes('horns')) {
    px(ctx, bx + rx * 0.45 | 0, by - ry - 1, c.finDark);
    px(ctx, bx + rx * 0.45 | 0, by - ry - 2, c.finLight || c.fin);
    px(ctx, bx + rx * 0.2 | 0, by - ry - 1, c.finDark);
  }
  if (feats.includes('lantern')) {
    const lx = noseX - 1, ly = by - ry - 7;
    line(ctx, bx + rx * 0.2, by - ry + 1, lx, ly + 3, c.finDark);
    rect(ctx, lx - 1, ly, 3, 3, c.glow);
    px(ctx, lx, ly + 1, '#ffffff');
  }

  // eye
  const ex = Math.round(bx + rx * 0.55), ey = Math.round(by - ry * 0.3);
  rect(ctx, ex - 1, ey - 1, 3, 3, c.belly || '#fff');
  px(ctx, ex, ey, c.outline);
  if (c.eye) px(ctx, ex, ey - 1, c.eye);

  // mouth
  line(ctx, noseX - 1, by + 2, noseX - 3, by + 2, c.outline);

  return cv;
}

// Fish roster. Two per tier for the first five tiers, one singular Ancient.
export const FISH = [
  // ---------------- Common ----------------
  {
    id: 'meadow_dace', name: 'Meadow Dace', rarity: 'Common', scaleReveal: 4,
    rx: 8, ry: 4, yOff: 0, tailType: 'fork', tailLen: 6, tailSpread: 5,
    dorsalType: 'normal', dorsalH: 3, anal: false,
    colors: { body: '#9db56f', bodyDark: '#7f9a55', bodyLight: '#bcd48a', belly: '#e7e2bd', fin: '#b8c98a', finDark: '#7f9a55', pattern: '#6f8a49', outline: '#3a4a2a', teeth: '#fff', eye: '#2a2a2a' },
    features: ['lateral'],
  },
  {
    id: 'copper_minnow', name: 'Copper Minnow', rarity: 'Common', scaleReveal: 4,
    rx: 7, ry: 4, yOff: 1, tailType: 'fan', tailLen: 6, tailSpread: 5,
    dorsalType: 'normal', dorsalH: 3, anal: true, analH: 2,
    colors: { body: '#c98a52', bodyDark: '#a06838', bodyLight: '#e0aa70', belly: '#f0d9b0', fin: '#d9a06a', finDark: '#a06838', pattern: '#7a4a24', outline: '#4a2c16', teeth: '#fff', eye: '#2a1a0e' },
    features: ['spots'],
  },
  // ---------------- Uncommon ----------------
  {
    id: 'pebble_perch', name: 'Pebble Perch', rarity: 'Uncommon', scaleReveal: 4,
    rx: 9, ry: 6, yOff: 0, tailType: 'fan', tailLen: 7, tailSpread: 6,
    dorsalType: 'spiky', dorsalH: 4, anal: true, analH: 3,
    colors: { body: '#8f9d6a', bodyDark: '#69764c', bodyLight: '#aebc86', belly: '#e6e0c2', fin: '#c98a52', finDark: '#8a5a30', pattern: '#4f5c38', outline: '#33402a', teeth: '#fff', eye: '#c94f2a' },
    features: ['stripesV'],
  },
  {
    id: 'silver_smelt', name: 'Silver Smelt', rarity: 'Uncommon', scaleReveal: 4,
    rx: 10, ry: 4, yOff: 0, tailType: 'fork', tailLen: 7, tailSpread: 5,
    dorsalType: 'normal', dorsalH: 3, anal: true, analH: 2,
    colors: { body: '#c9d3dc', bodyDark: '#9aa8b5', bodyLight: '#eef4f8', belly: '#ffffff', fin: '#c9d3dc', finDark: '#8fa0b0', pattern: '#4f7fae', outline: '#4a5a6a', teeth: '#fff', eye: '#2a3a4a' },
    features: ['stripesH'],
  },
  // ---------------- Rare ----------------
  {
    id: 'amber_loach', name: 'Amber Loach', rarity: 'Rare', scaleReveal: 3,
    rx: 11, ry: 6, yOff: 1, tailType: 'round', tailLen: 9, tailSpread: 6,
    dorsalType: 'normal', dorsalH: 3, anal: true, analH: 3,
    colors: { body: '#e0a83c', bodyDark: '#b87c22', bodyLight: '#f4c860', belly: '#f6e4b0', fin: '#d9a04a', finDark: '#a8701f', pattern: '#7a4f18', outline: '#5a3a12', teeth: '#fff', eye: '#3a2a10' },
    features: ['whiskers', 'spots'],
  },
  {
    id: 'reedfin_pike', name: 'Reedfin Pike', rarity: 'Rare', scaleReveal: 3,
    rx: 12, ry: 5, yOff: 0, tailType: 'fork', tailLen: 8, tailSpread: 6,
    dorsalType: 'normal', dorsalH: 3, anal: true, analH: 3,
    colors: { body: '#6f9a4f', bodyDark: '#4f7438', bodyLight: '#8fba6a', belly: '#e0e6b8', fin: '#5f8a45', finDark: '#3f5c30', pattern: '#d9d06a', outline: '#2f4425', teeth: '#ffffff', eye: '#d9c24a' },
    features: ['stripesV', 'teeth'],
  },
  // ---------------- Epic ----------------
  {
    id: 'violet_fangray', name: 'Violet Fangray', rarity: 'Epic', scaleReveal: 3,
    rx: 11, ry: 7, yOff: 1, tailType: 'point', tailLen: 10, tailSpread: 4,
    dorsalType: 'normal', dorsalH: 5, anal: false,
    colors: { body: '#8a5fc9', bodyDark: '#5f3f96', bodyLight: '#a985e0', belly: '#e0cff5', fin: '#6f4fb0', finDark: '#452f7a', pattern: '#3a2566', outline: '#2a1a4a', teeth: '#ffffff', glow: '#e0b0ff', eye: '#f0e0ff' },
    features: ['fangs', 'spots', 'glowspots'],
  },
  {
    id: 'moonlit_trout', name: 'Moonlit Trout', rarity: 'Epic', scaleReveal: 3,
    rx: 11, ry: 6, yOff: 0, tailType: 'fan', tailLen: 8, tailSpread: 6,
    dorsalType: 'normal', dorsalH: 4, anal: true, analH: 3,
    colors: { body: '#3f5fa8', bodyDark: '#2a3f78', bodyLight: '#6f8fd0', belly: '#cfd8f0', fin: '#4f6fb8', finDark: '#2a3f78', pattern: '#8fb8e0', glow: '#bce0ff', outline: '#1a2547', teeth: '#fff', eye: '#e0f0ff' },
    features: ['glowspots', 'stripesH'],
  },
  // ---------------- Legendary ----------------
  {
    id: 'emberking_bass', name: 'Emberking Bass', rarity: 'Legendary', scaleReveal: 3,
    rx: 13, ry: 8, yOff: 0, tailType: 'fan', tailLen: 9, tailSpread: 7,
    dorsalType: 'spiky', dorsalH: 6, anal: true, analH: 4,
    colors: { body: '#d94f2a', bodyDark: '#a83318', bodyLight: '#f07f3c', belly: '#f4c86a', fin: '#e06a2a', finDark: '#a83318', pattern: '#7a1f10', glow: '#ffd24a', outline: '#5a1a0c', teeth: '#fff', eye: '#ffe08a' },
    features: ['horns', 'stripesH', 'glowspots'],
  },
  {
    id: 'stormscale_marlin', name: 'Stormscale Marlin', rarity: 'Legendary', scaleReveal: 3,
    rx: 14, ry: 6, yOff: 0, tailType: 'fork', tailLen: 10, tailSpread: 7,
    dorsalType: 'normal', dorsalH: 7, anal: true, analH: 4,
    colors: { body: '#2f7fb0', bodyDark: '#1f5680', bodyLight: '#5fb0d9', belly: '#cfeaf5', fin: '#3f8fc0', finDark: '#1f5680', pattern: '#9fd9f0', glow: '#d0f0ff', outline: '#123048', teeth: '#fff', eye: '#e0f4ff' },
    features: ['stripesV', 'glowspots'],
    spear: true,
  },
  // ---------------- Ancient ----------------
  {
    id: 'hollowbone_leviathan', name: 'Hollowbone Leviathan', rarity: 'Ancient', scaleReveal: 3,
    rx: 14, ry: 10, yOff: 0, tailType: 'fan', tailLen: 11, tailSpread: 9,
    dorsalType: 'normal', dorsalH: 8, anal: true, analH: 6,
    colors: { body: '#8fd4c8', bodyDark: '#4f9c98', bodyLight: '#c8f0e8', belly: '#eaf8f2', fin: '#6fb8b8', finDark: '#356f72', pattern: '#2a6b70', glow: '#7ff0e0', glow2: '#ffffff', teeth: '#ffffff', outline: '#1f3f44', eye: '#ffffff' },
    features: ['runes', 'teeth', 'lantern', 'glowspots'],
  },
];

// Pre-render all fish canvases once at load.
const CACHE = new Map();
export function fishCanvas(def) {
  if (!CACHE.has(def.id)) CACHE.set(def.id, render(def));
  return CACHE.get(def.id);
}

// Blit a fish centred on (x,y) with integer scale. Optional squash/stretch
// and rotation-free wobble for lively reveals.
export function blitFish(ctx, def, x, y, scale, opts = {}) {
  const cv = fishCanvas(def);
  const sx = opts.sx || 1;
  const sy = opts.sy || 1;
  const w = CW * scale * sx;
  const h = CH * scale * sy;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
}

export function fishByRarity(rarity, rng = Math.random) {
  const list = FISH.filter((f) => f.rarity === rarity);
  return list[Math.floor(rng() * list.length) % list.length];
}
