/* =========================================================================
   TIDELINE ISLE
   A tiny, cozy top-down pixel-art fishing game. All art is drawn in code.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     Canvas / view setup
     ---------------------------------------------------------------------- */
  const VIEW_W = 320;          // logical scene resolution
  const VIEW_H = 180;
  const SCALE = 4;             // 320x180 -> 1280x720
  const OUT_W = VIEW_W * SCALE;
  const OUT_H = VIEW_H * SCALE;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = OUT_W;
  canvas.height = OUT_H;

  // Offscreen logical scene.
  const scene = document.createElement('canvas');
  scene.width = VIEW_W;
  scene.height = VIEW_H;
  let sx = scene.getContext('2d');

  function fitStage() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = Math.min(vw / OUT_W, vh / OUT_H);
    canvas.style.width = Math.floor(OUT_W * s) + 'px';
    canvas.style.height = Math.floor(OUT_H * s) + 'px';
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  function noSmooth(c) { c.imageSmoothingEnabled = false; c.mozImageSmoothingEnabled = false; c.webkitImageSmoothingEnabled = false; c.msImageSmoothingEnabled = false; }
  noSmooth(sx);
  noSmooth(ctx);

  /* ----------------------------------------------------------------------
     5x7 bitmap font, drawn in code. Each glyph is 7 rows of 5 bits.
     ---------------------------------------------------------------------- */
  const FONT = {
    ' ': [0, 0, 0, 0, 0, 0, 0],
    'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
    'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
    'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
    'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
    'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
    'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
    'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
    'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
    'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
    'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
    'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
    'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
    '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
    '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
    '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
    '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04],
    ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08],
    ':': [0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00],
    '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    '+': [0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00],
    '%': [0x19, 0x1A, 0x02, 0x04, 0x08, 0x0B, 0x13],
    '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
    ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    "'": [0x04, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00],
    '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    '=': [0x00, 0x1F, 0x00, 0x1F, 0x00, 0x00, 0x00],
    '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
    '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
    '*': [0x00, 0x0A, 0x04, 0x1F, 0x04, 0x0A, 0x00],
    '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F],
    'x': [0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x00],
  };

  const textCache = new Map();
  function textSprite(str, color, scale) {
    const key = str + '|' + color + '|' + scale;
    let c = textCache.get(key);
    if (c) return c;
    const adv = 6 * scale;
    const w = Math.max(1, str.length * adv);
    const h = 7 * scale;
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = color;
    for (let i = 0; i < str.length; i++) {
      const glyph = FONT[str[i]] || FONT['?'];
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            g.fillRect(i * adv + col * scale, row * scale, scale, scale);
          }
        }
      }
    }
    textCache.set(key, c);
    return c;
  }
  // Cache of measured widths.
  function textWidth(str, scale) { return str.length * 6 * scale; }

  // Draw text into an arbitrary context. shadow optional.
  function drawText(c, str, x, y, scale, color, shadow, shadowColor) {
    if (shadow) {
      const sh = textSprite(str, shadowColor || 'rgba(0,0,0,0.55)', scale);
      c.drawImage(sh, Math.round(x + shadow), Math.round(y + shadow));
    }
    const spr = textSprite(str, color, scale);
    c.drawImage(spr, Math.round(x), Math.round(y));
  }
  function drawTextCenter(c, str, cx, y, scale, color, shadow, shadowColor) {
    drawText(c, str, cx - textWidth(str, scale) / 2, y, scale, color, shadow, shadowColor);
  }

  /* ----------------------------------------------------------------------
     Small utilities
     ---------------------------------------------------------------------- */
  function hash2(x, y) {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    n = n ^ (n >> 16);
    return ((n >>> 0) % 100000) / 100000;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  // Draw a 1px-thick integer line using fillRects (crisp).
  function plotLine(c, x0, y0, x1, y1, color, thick) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sxx = x0 < x1 ? 1 : -1, syy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    c.fillStyle = color;
    const t = thick || 1;
    for (;;) {
      c.fillRect(x0, y0, t, t);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sxx; }
      if (e2 <= dx) { err += dx; y0 += syy; }
    }
  }
  function pixelCircle(c, cx, cy, r, color) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    c.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r + r * 0.4) c.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
  // Crisp 1px ellipse/arc drawn with integer rects (no anti-aliasing).
  function pixelEllipseRing(c, cx, cy, rx, ry, color, a0, a1) {
    cx = Math.round(cx); cy = Math.round(cy);
    const start = a0 === undefined ? 0 : a0;
    const end = a1 === undefined ? Math.PI * 2 : a1;
    const steps = Math.max(12, Math.round((rx + ry) * 2.4));
    c.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const a = start + (end - start) * (i / steps);
      c.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    }
  }
  function fillCircle(c, cx, cy, r, color) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  }

  /* ----------------------------------------------------------------------
     Rarity system
     ---------------------------------------------------------------------- */
  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  const RARITY_COLOR = {
    Common: '#b9c4a2',
    Uncommon: '#7ed957',
    Rare: '#56a8ff',
    Epic: '#c07bff',
    Legendary: '#ffd24a',
    Ancient: '#82f0df',
  };
  const RARITY_CUM = [0.45, 0.70, 0.85, 0.93, 0.98, 1.0]; // exact odds

  function pickRarity(u) {
    for (let i = 0; i < RARITY_CUM.length; i++) {
      if (u < RARITY_CUM[i]) return RARITIES[i];
    }
    return 'Ancient';
  }

  /* ----------------------------------------------------------------------
     Fish catalogue -- original species, procedurally pixel-drawn.
     shape fields drive the drawing routine.
     ---------------------------------------------------------------------- */
  const FISH = {
    Common: [
      { name: 'Mudfin Minnow', L: 14, H: 7, body: '#7d8f57', dark: '#5c6b3d', belly: '#c9d19c', fin: '#9aa86a', tail: 'fork', pattern: 'stripe', shape: 'minnow' },
      { name: 'Sunscale Sardine', L: 18, H: 6, body: '#b9c9d8', dark: '#8399b0', belly: '#eef5fb', fin: '#9fb4c6', tail: 'fork', pattern: 'sheen', shape: 'minnow' },
    ],
    Uncommon: [
      { name: 'Copper Dace', L: 16, H: 7, body: '#c87a3a', dark: '#95521f', belly: '#f2c78f', fin: '#d99a55', tail: 'fan', pattern: 'spot', shape: 'minnow' },
      { name: 'Reedtail Roach', L: 17, H: 8, body: '#b3a24a', dark: '#837231', belly: '#e9dfa2', fin: '#cbbf6a', tail: 'round', pattern: 'stripe', shape: 'round' },
    ],
    Rare: [
      { name: 'Moonfin Trout', L: 20, H: 8, body: '#4f7fb5', dark: '#33578a', belly: '#cfe0f0', fin: '#7fa7d0', tail: 'fork', pattern: 'moon', shape: 'trout' },
      { name: 'Glass Herring', L: 19, H: 6, body: '#9fd8dd', dark: '#64adb8', belly: '#e8fcfc', fin: '#b8ecef', tail: 'fork', pattern: 'sheen', shape: 'minnow' },
    ],
    Epic: [
      { name: 'Ember Koi', L: 18, H: 9, body: '#e0662f', dark: '#ac3f18', belly: '#f6c98a', fin: '#f0913f', tail: 'fan', pattern: 'spot', shape: 'koi', glow: '#ff9a4d' },
      { name: 'Stormray', L: 20, H: 12, body: '#6a5aa8', dark: '#413670', belly: '#b9aee0', fin: '#8f7fd0', tail: 'whip', pattern: 'none', shape: 'ray', glow: '#9d7bff' },
    ],
    Legendary: [
      { name: 'Aurora Marlin', L: 27, H: 8, body: '#3fb6a8', dark: '#26756f', belly: '#d8fbef', fin: '#7fe0cf', tail: 'fork', pattern: 'sheen', shape: 'marlin', bill: true, glow: '#7ff0dd' },
      { name: 'Crown Sturgeon', L: 22, H: 10, body: '#7a6a8c', dark: '#4d425f', belly: '#cbbfd8', fin: '#9a8cb0', tail: 'fan', pattern: 'spot', shape: 'sturgeon', whisker: true, crown: true, glow: '#e8b3ff' },
    ],
    Ancient: [
      { name: 'Elder Coelacanth', L: 22, H: 11, body: '#3a4a7a', dark: '#1f2a4c', belly: '#8fa0c8', fin: '#5f6f9f', tail: 'fan', pattern: 'rune', shape: 'coelacanth', glow: '#82f0df' },
      { name: 'Tidewrought Idol', L: 19, H: 10, body: '#4a5f5a', dark: '#2c3a37', belly: '#93a89f', fin: '#6d8179', tail: 'round', pattern: 'rune', shape: 'idol', whisker: true, crown: true, glow: '#82f0df' },
    ],
  };
  const ALL_FISH = [];
  for (const r of RARITIES) for (const f of FISH[r]) { f.rarity = r; ALL_FISH.push(f); }

  function fishByRarity(r) {
    const list = FISH[r] || FISH.Common;
    return list[(Math.random() * list.length) | 0];
  }

  /* ----------------------------------------------------------------------
     Fish sprite builder.  Draws a compact, recognisable pixel fish into a
     small offscreen canvas, then trims it.  Fish faces right.
     ---------------------------------------------------------------------- */
  function fillPoly(g, pts, color) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    g.fillStyle = color;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
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
        const x0 = Math.ceil(xs[i]), x1 = Math.floor(xs[i + 1]);
        for (let x = x0; x <= x1; x++) g.fillRect(x, y, 1, 1);
      }
    }
  }
  function trimCanvas(c) {
    const g = c.getContext('2d');
    const w = c.width, h = c.height;
    const d = g.getImageData(0, 0, w, h).data;
    let minx = w, miny = h, maxx = -1, maxy = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 4) {
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
    }
    if (maxx < 0) return { canvas: c, w: w, h: h };
    const nw = maxx - minx + 1, nh = maxy - miny + 1;
    const n = document.createElement('canvas');
    n.width = nw; n.height = nh;
    const ng = n.getContext('2d');
    ng.drawImage(c, -minx, -miny);
    return { canvas: n, w: nw, h: nh };
  }

  const fishSpriteCache = new Map();
  function getFishSprite(fish) {
    if (fishSpriteCache.has(fish.name)) return fishSpriteCache.get(fish.name);
    const W = 72, H = 40;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const cx = W / 2, cy = H / 2;
    const put = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); };
    const P = (x, y) => [cx + x, cy + y];

    const L = fish.L, B = fish.H;
    const shape = fish.shape || 'minnow';
    const fin = fish.fin;
    const halfW = L / 2;

    function halfAt(x) {
      const nx = x / halfW;
      const p = 1 - nx * nx;
      if (p <= 0) return 0;
      let e = 0.5;
      if (shape === 'koi') e = 0.6;
      if (shape === 'marlin') e = 0.66;
      if (shape === 'ray') e = 0.34;
      if (shape === 'sturgeon') e = 0.46;
      return (B / 2) * Math.pow(p, e);
    }

    // ---- Tail (compact, drawn first so the body overlaps its root) ----
    const baseX = -halfW + 1;
    const tail = fish.tail || 'fork';
    const tl = Math.min(8, Math.max(4, Math.round(L * 0.36)));
    const bT = B * 0.5;
    if (tail === 'fork') {
      fillPoly(g, [P(baseX, -bT * 0.9), P(baseX - tl, -bT * 1.35), P(baseX - tl * 0.45, 0),
        P(baseX - tl, bT * 1.35), P(baseX, bT * 0.9)], fin);
    } else if (tail === 'fan') {
      fillPoly(g, [P(baseX, -bT * 0.85), P(baseX - tl, -bT * 1.25), P(baseX - tl, bT * 1.25), P(baseX, bT * 0.85)], fin);
    } else if (tail === 'round') {
      const pts = [P(baseX, -bT * 0.8)];
      for (let a = -1.1; a <= 1.1; a += 0.18) pts.push(P(baseX - tl * Math.cos(a * 0.72), Math.sin(a) * bT * 1.15));
      pts.push(P(baseX, bT * 0.8));
      fillPoly(g, pts, fin);
    } else if (tail === 'whip') {
      fillPoly(g, [P(baseX + 1, -1.2), P(baseX - tl * 2.2, -1.2), P(baseX - tl * 2.5, 0), P(baseX - tl * 2.2, 1.2), P(baseX + 1, 1.2)], fin);
    }

    // ---- Dorsal fin ----
    if (shape === 'marlin') {
      fillPoly(g, [P(-L * 0.18, -halfAt(-L * 0.18) + 1), P(-L * 0.02, -B * 0.5 - 8), P(L * 0.2, -halfAt(L * 0.2) + 1)], fin);
    } else if (shape === 'ray') {
      // no separate dorsal
    } else {
      fillPoly(g, [P(-3, -halfAt(-3) + 1), P(0, -B * 0.5 - 4), P(3, -halfAt(3) + 1)], fin);
    }

    // ---- Body ----
    for (let x = -halfW; x <= halfW; x += 1) {
      const h = halfAt(x);
      if (h < 0.5) continue;
      for (let y = -Math.ceil(h); y <= Math.floor(h); y++) {
        const yn = (y + h) / (2 * h);
        let col = fish.body;
        if (yn < 0.3) col = fish.dark;
        else if (yn > 0.72) col = fish.belly;
        put(x, y, col);
      }
    }
    // belly shadow line
    for (let x = -halfW + 1; x <= halfW - 1; x++) {
      const h = halfAt(x);
      if (h >= 1.5) put(x, Math.round(h), fish.dark);
    }

    // ---- Ray wings ----
    if (shape === 'ray') {
      for (let x = -halfW; x <= halfW; x++) {
        const h = halfAt(x);
        if (h < 0.5) continue;
        put(x, -Math.round(h), fish.dark);
        put(x, Math.round(h), fish.dark);
      }
      // long thin tail
      fillPoly(g, [P(baseX + 2, -1), P(baseX - tl * 2.2, -1), P(baseX - tl * 2.4, 0), P(baseX - tl * 2.2, 1), P(baseX + 2, 1)], fin);
    }

    // ---- Pectoral fin ----
    if (shape !== 'ray') {
      fillPoly(g, [P(L * 0.08, B / 2 - 1.5), P(L * 0.08 + 5, B / 2 + 2.5), P(L * 0.08 - 1, B / 2 + 2)], fin);
    }

    // ---- Patterns ----
    if (fish.pattern === 'stripe') {
      for (let x = -halfW + 2; x < halfW - 1; x += 3) {
        const h = halfAt(x);
        for (let y = -Math.floor(h) + 1; y <= Math.floor(h) - 1; y++) put(x, y, fish.dark);
      }
    } else if (fish.pattern === 'spot') {
      const spots = [[-5, -1], [-1, 1], [3, -2], [6, 0], [1, -1], [-3, 2]];
      for (const s of spots) {
        const h = halfAt(s[0]);
        if (Math.abs(s[1]) < h) { put(s[0], s[1], fish.dark); put(s[0] + 1, s[1], fish.dark); }
      }
    } else if (fish.pattern === 'sheen') {
      for (let x = -halfW + 2; x < halfW - 2; x++) {
        const h = halfAt(x);
        if (x % 3 === 0 && h > 1) put(x, -Math.floor(h) + 2, '#ffffff');
      }
      for (let x = -halfW + 4; x < halfW - 4; x += 4) put(x, Math.floor(halfAt(x)) - 1, fish.belly);
    } else if (fish.pattern === 'moon') {
      const h = halfAt(2);
      pixelCircle(g, Math.round(cx + 2), Math.round(cy - 1), Math.max(1, Math.min(3, Math.round(h) - 1)), fish.belly);
      pixelCircle(g, Math.round(cx + 3), Math.round(cy - 1), Math.max(1, Math.min(3, Math.round(h) - 1)), fish.body);
      put(2, -1, fish.dark);
    } else if (fish.pattern === 'rune') {
      const runes = [[-6, 0], [-3, 0], [0, 0], [3, 0], [-5, -2], [2, -2], [-1, 2], [4, 2]];
      for (const r of runes) {
        const h = halfAt(r[0]);
        if (Math.abs(r[1]) < h) put(r[0], r[1], fish.glow || '#9ffff0');
      }
    }

    // ---- Coelacanth lobed fins ----
    if (shape === 'coelacanth') {
      fillPoly(g, [P(-1, B / 2 - 1), P(-7, B / 2 + 4), P(-1, B / 2 + 3)], fin);
      fillPoly(g, [P(L * 0.2, B / 2 - 1), P(L * 0.2 + 4, B / 2 + 4), P(L * 0.2, B / 2 + 3)], fin);
      fillPoly(g, [P(-1, -halfAt(-1) + 1), P(-7, -B * 0.5 - 3), P(-1, -B * 0.5 - 2)], fin);
    }

    // ---- Bill (marlin) ----
    if (fish.bill) {
      fillPoly(g, [P(halfW, -2), P(halfW + 11, -0.5), P(halfW + 11, 0.5), P(halfW, 1)], fish.dark);
      for (let i = 0; i < 10; i++) put(halfW + 1 + i, -1, fish.body);
    }

    // ---- Whiskers ----
    if (fish.whisker) {
      fillPoly(g, [P(halfW - 1, 1), P(halfW + 5, 4), P(halfW + 5, 5), P(halfW - 2, 2)], fin);
      fillPoly(g, [P(halfW - 1, 0), P(halfW + 4, 2), P(halfW + 4, 3), P(halfW - 2, 1)], fin);
    }

    // ---- Eye ----
    const ex = halfW - 3.5, ey = -1;
    pixelCircle(g, Math.round(cx + ex), Math.round(cy + ey), 2, '#f8f8f2');
    put(ex + 1, ey, '#14202c'); put(ex, ey, '#14202c');
    put(ex + 1, ey + 1, '#14202c'); put(ex, ey - 1, '#14202c');

    // ---- Mouth ----
    put(halfW - 1, 1, fish.dark);

    // ---- Crown ----
    if (fish.crown) {
      const ty = -B / 2 - 4;
      for (let i = -3; i <= 3; i++) put(i - 1, ty + 2, '#ffd24a');
      for (let i = -2; i <= 2; i += 2) { put(i - 1, ty + 1, '#ffe89a'); put(i - 1, ty, '#fff4cf'); }
    }

    // ---- Glow ----
    if (fish.glow) {
      const img = g.getImageData(0, 0, W, H);
      g.globalAlpha = 0.28;
      g.fillStyle = fish.glow;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (img.data[(y * W + x) * 4 + 3] > 0) continue;
          let nb = false;
          for (let dy = -1; dy <= 1 && !nb; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (img.data[((y + dy) * W + (x + dx)) * 4 + 3] > 0) { nb = true; break; }
          if (nb) g.fillRect(x, y, 1, 1);
        }
      }
      g.globalAlpha = 1;
    }

    const spr = trimCanvas(c);
    fishSpriteCache.set(fish.name, spr);
    return spr;
  }

  /* ----------------------------------------------------------------------
     Angler sprite (12 x 20)
     ---------------------------------------------------------------------- */
  const ANGLER_MAP = [
    '..kkkkkkkk..',
    '.khhhhhhhhk.',
    'khhhhhhhhhhk',
    'kHHHHHHHHHHk',
    'kkkkkkkkkkkk',
    '..kssssssk..',
    '..kssssssk..',
    '..kSSSSSSk..',
    '...kssssk...',
    '..krrrrrrk..',
    '.krgrrrrgrk.',
    '.krrrrrrrrk.',
    '.kRrrrrrrRk.',
    '..krrrrrrk..',
    '..kppppppk..',
    '..kpp..ppk..',
    '..kpp..ppk..',
    '..kPP..PPk..',
    '..kbb..bbk..',
    '..kbb..bbk..',
  ];
  const ANGLER_PAL = {
    k: '#241d2e', h: '#f2cf6b', H: '#cfa23c', s: '#f0b98a', S: '#d19364',
    r: '#c65b4e', R: '#8f3a33', g: '#4f8a5b', p: '#3f5d8c', P: '#2b3f63', b: '#6a4326',
  };
  function drawAnglerSprite(c, x, y, bob, flashHat) {
    const pal = Object.assign({}, ANGLER_PAL);
    if (flashHat) pal.h = '#fff6c8';
    for (let row = 0; row < ANGLER_MAP.length; row++) {
      const line = ANGLER_MAP[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === '.') continue;
        c.fillStyle = pal[ch] || '#000';
        c.fillRect(x + col, y + row + bob, 1, 1);
      }
    }
  }

  /* ----------------------------------------------------------------------
     Scene geometry
     ---------------------------------------------------------------------- */
  const WATER_BOT = 128;          // water ends roughly here (shoreline bands)
  const SHORE_Y = 122;            // nominal shoreline

  // Dock: a pier from bottom toward the water.
  const DOCK = {
    bx0: 150, bx1: 214,   // bottom left/right
    tx0: 163, tx1: 207,   // top left/right
    by: 180, ty: 96,
  };
  const ANGLER = { cx: 186, feet: 116 };
  const BOBBER_TARGET = { x: 112, y: 58 };

  function dockAt(y) {
    // returns [left,right] of dock at given y
    const t = clamp((DOCK.by - y) / (DOCK.by - DOCK.ty), 0, 1);
    const l = lerp(DOCK.bx0, DOCK.tx0, t);
    const r = lerp(DOCK.bx1, DOCK.tx1, t);
    return [l, r];
  }

  /* ----------------------------------------------------------------------
     Game state
     ---------------------------------------------------------------------- */
  const G = {
    phase: 'ready',
    t: 0,               // time in current phase (seconds)
    clock: 0,           // total unpaused game time
    wait: 0,            // random wait after cast lands
    castDur: 0.7,
    biteWindow: 1.3,
    reelDur: 1.15,
    landed: false,
    bobber: { x: 0, y: 0, vx: 0, vy: 0, landed: false, dip: 0 },
    caught: null,       // fish object
    caughtRarity: null,
    particles: [],
    log: [],
    misses: 0,
    flash: 0,
    revealT: 0,
    hintShown: true,
    firstCastDone: false,
    biteCue: 0,
    splash: [],
    lastInput: 0,
  };

  window.fishing = {
    get state() { return G.phase; },
    pickRarity: pickRarity,
    log: [],
  };

  function spawnParticles(n, x, y, colors, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const a = opts.dir !== undefined ? opts.dir + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * Math.PI * 2;
      const sp = (opts.speed || 30) * (0.4 + Math.random() * 0.8);
      G.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.lift || 0),
        big: !!opts.big,
        life: 0,
        max: (opts.life || 1) * (0.6 + Math.random() * 0.7),
        size: opts.size || (Math.random() < 0.5 ? 1 : 2),
        color: colors[(Math.random() * colors.length) | 0],
        grav: opts.grav === undefined ? 22 : opts.grav,
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }

  function addRipple(x, y, color) {
    G.splash.push({ x: x, y: y, r: 1, life: 0, max: 0.7, color: color || '#dff3f8' });
  }

  /* ----------------------------------------------------------------------
     Input
     ---------------------------------------------------------------------- */
  function actionable() {
    return G.phase === 'ready' || G.phase === 'bite' || G.phase === 'reveal';
  }

  function doAction() {
    const now = performance.now();
    if (now - G.lastInput < 120) return;   // debounce duplicate presses/clicks
    G.lastInput = now;
    if (G.phase === 'ready') {
      startCast();
    } else if (G.phase === 'bite') {
      startReel();
    } else if (G.phase === 'reveal') {
      G.phase = 'ready';
      G.t = 0;
    }
  }

  function startCast() {
    G.phase = 'waiting';
    G.t = 0;
    G.landed = false;
    G.castDur = 0.62 + Math.random() * 0.12;
    G.wait = 2.9 + Math.random() * 2.6;         // variable wait
    G.biteWindow = 1.3;
    G.bobber.landed = false;
    G.bobber.dip = 0;
    // launch point = rod tip
    const rt = rodTip();
    G.bobber.x = rt.x; G.bobber.y = rt.y;
    G.splash.length = 0;
    G.firstCastDone = false;
  }

  function startReel() {
    G.phase = 'reeling';
    G.t = 0;
    G.reelDur = 1.15 + Math.random() * 0.25;
    G.flash = Math.max(G.flash, 0.35);
    spawnParticles(14, G.bobber.x, G.bobber.y, ['#dff3f8', '#a9dceb', '#7fc4d6'], { speed: 26, lift: 18, life: 0.7, grav: 40 });
    addRipple(G.bobber.x, G.bobber.y, '#e8f8ff');
  }

  function finishReel() {
    // choose fish via exposed API so replacing pickRarity changes outcome
    const rarity = window.fishing.pickRarity(Math.random());
    const fish = fishByRarity(rarity);
    G.caught = fish;
    G.caughtRarity = rarity;
    // log newest first
    window.fishing.log.unshift({ name: fish.name, rarity: rarity });
    G.phase = 'reveal';
    G.t = 0;
    G.revealT = 0;
    // reveal particles depend on rarity
    const colors = tierParticleColors(rarity);
    spawnParticles(10 + RARITIES.indexOf(rarity) * 6, OUT_W / 2, OUT_H / 2, colors,
      { speed: 60, life: 1.6, grav: 6, size: 2, big: true });
    if (rarity === 'Legendary' || rarity === 'Ancient') G.flash = 1;
    else if (rarity === 'Epic') G.flash = 0.5;
  }

  function missBite() {
    G.misses++;
    addRipple(G.bobber.x, G.bobber.y, '#bcd6e0');
    spawnParticles(6, G.bobber.x, G.bobber.y, ['#9fc4d4'], { speed: 14, lift: 6, life: 0.5 });
    G.phase = 'ready';
    G.t = 0;
  }

  function tierParticleColors(r) {
    switch (r) {
      case 'Common': return ['#b9c4a2', '#8fa06f'];
      case 'Uncommon': return ['#7ed957', '#b6f08a'];
      case 'Rare': return ['#56a8ff', '#a9d4ff', '#ffffff'];
      case 'Epic': return ['#c07bff', '#e0b3ff', '#7d4fd0'];
      case 'Legendary': return ['#ffd24a', '#fff2b0', '#ff9a3c', '#ffffff'];
      case 'Ancient': return ['#82f0df', '#bffff4', '#4fc9d0', '#ffffff'];
    }
    return ['#ffffff'];
  }

  function rodTip() {
    const bob = Math.round(Math.sin(G.clock * 2) * 0.6);
    // rod goes up-left from the hands
    const bx = ANGLER.cx - 2;
    const by = ANGLER.feet - 11 + bob;
    return { x: bx - 22, y: by - 26 };
  }

  /* ----------------------------------------------------------------------
     Update
     ---------------------------------------------------------------------- */
  function update(dt) {
    G.clock += dt;
    G.flash = Math.max(0, G.flash - dt * 1.8);

    // particles
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life += dt;
      if (p.life >= p.max) { G.particles.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    // ripples
    for (let i = G.splash.length - 1; i >= 0; i--) {
      const r = G.splash[i];
      r.life += dt;
      if (r.life >= r.max) G.splash.splice(i, 1);
      else r.r = 1 + easeOut(r.life / r.max) * 12;
    }

    if (G.phase === 'waiting') {
      G.t += dt;
      if (!G.landed) {
        if (G.t >= G.castDur) {
          G.landed = true;
          G.bobber.x = BOBBER_TARGET.x;
          G.bobber.y = BOBBER_TARGET.y;
          G.bobber.landed = true;
          addRipple(G.bobber.x, G.bobber.y, '#eaf9ff');
          spawnParticles(7, G.bobber.x, G.bobber.y, ['#dff3f8', '#a9dceb'], { speed: 16, lift: 10, life: 0.5, grav: 40 });
          G.t = 0; // restart timer as "waiting on water"
          G.firstCastDone = true;
        }
      } else {
        if (G.t >= G.wait) {
          G.phase = 'bite';
          G.t = 0;
          G.biteCue = 0;
        }
      }
    } else if (G.phase === 'bite') {
      G.t += dt;
      G.biteCue += dt;
      if (G.t >= G.biteWindow) missBite();
    } else if (G.phase === 'reeling') {
      G.t += dt;
      if (G.t >= G.reelDur) finishReel();
    } else if (G.phase === 'reveal') {
      G.t += dt;
      G.revealT += dt;
    }
  }

  /* ----------------------------------------------------------------------
     SCENE RENDERING
     ---------------------------------------------------------------------- */
  function drawWaterBase() {
    for (let y = 0; y < WATER_BOT; y++) {
      const t = y / WATER_BOT;
      const r = Math.round(lerp(76, 34, t));
      const g = Math.round(lerp(150, 84, t));
      const b = Math.round(lerp(178, 116, t));
      sx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      sx.fillRect(0, y, VIEW_W, 1);
    }
    // distant shore reflections / darker far edge
    sx.fillStyle = 'rgba(20,45,65,0.25)';
    sx.fillRect(0, 0, VIEW_W, 3);
  }

  function drawWaterWaves() {
    // horizontal wave bands
    for (let k = 0; k < 7; k++) {
      const baseY = 8 + k * 17;
      if (baseY > WATER_BOT - 4) break;
      const speed = 4 + k * 0.7;
      const freq = 0.12 - k * 0.006;
      for (let x = 0; x < VIEW_W; x += 3) {
        const off = Math.sin(x * freq + G.clock * speed + k * 1.7) * 1.6 + Math.sin(x * 0.05 - G.clock * 1.3) * 0.8;
        const y = Math.round(baseY + off);
        const shade = k % 2 === 0 ? 'rgba(180,225,235,0.28)' : 'rgba(40,90,120,0.25)';
        sx.fillStyle = shade;
        sx.fillRect(x, y, 2, 1);
      }
    }
    // twinkling sparkles
    for (let i = 0; i < 42; i++) {
      const x = Math.floor(hash2(i, 3) * VIEW_W);
      const y = Math.floor(hash2(i, 7) * (WATER_BOT - 6)) + 3;
      const ph = hash2(i, 11) * 6.28;
      const tw = Math.sin(G.clock * 2.2 + ph);
      if (tw > 0.55) {
        sx.fillStyle = tw > 0.85 ? '#eafcff' : 'rgba(220,245,250,0.6)';
        sx.fillRect(x, y, tw > 0.85 ? 2 : 1, 1);
      }
    }
  }

  function drawFarShore() {
    // Distant forest band along the top edge.  Trees fill from y=0 down to a
    // wavy waterline so no stray water appears behind the tree line.
    const bottoms = new Array(VIEW_W);
    for (let x = 0; x < VIEW_W; x++) {
      const bottom = 10 + Math.round(Math.sin(x * 0.07) * 2 + Math.sin(x * 0.21 + 1) * 1.5 + hash2(x, 99) * 2);
      bottoms[x] = bottom;
      sx.fillStyle = '#24424c';
      sx.fillRect(x, 0, 1, bottom);
      sx.fillStyle = '#2b4a54';
      sx.fillRect(x, 0, 1, Math.max(1, bottom - 2));
      if (x % 4 === 0) { sx.fillStyle = '#1f3a44'; sx.fillRect(x, 0, 1, Math.max(1, bottom - 3)); }
      if (x % 7 === 0 && bottom > 4) { sx.fillStyle = '#3a5f68'; sx.fillRect(x, bottom - 3, 1, 2); }
    }
    // pale waterline where the far bank meets the lake
    sx.fillStyle = 'rgba(190,230,235,0.3)';
    for (let x = 0; x < VIEW_W; x++) sx.fillRect(x, bottoms[x], 1, 1);
    // soft reflection below the bank
    for (let x = 0; x < VIEW_W; x++) {
      sx.fillStyle = 'rgba(31,58,68,0.18)';
      sx.fillRect(x, bottoms[x] + 1, 1, 1);
    }
  }

  function drawLand() {
    // shoreline grass mass at the bottom
    for (let x = 0; x < VIEW_W; x++) {
      const shore = SHORE_Y + Math.round(Math.sin(x * 0.045) * 4 + Math.sin(x * 0.13 + 2) * 2 + hash2(x, 5) * 2);
      // water-to-sand edge
      sx.fillStyle = '#d8c48c';
      sx.fillRect(x, shore - 1, 1, 2);
      sx.fillStyle = '#c2a96e';
      sx.fillRect(x, shore + 1, 1, 1);
      // foam where the water meets the sand
      if (x % 6 === 0 && hash2(x, 77) > 0.35) {
        sx.fillStyle = 'rgba(240,252,255,0.75)';
        sx.fillRect(x, shore - 2, 1, 1);
      }
      // grass gradient
      for (let y = shore + 2; y < VIEW_H; y++) {
        const t = (y - shore) / (VIEW_H - shore);
        const r = Math.round(lerp(74, 48, t));
        const g = Math.round(lerp(120, 88, t));
        const b = Math.round(lerp(62, 50, t));
        sx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        sx.fillRect(x, y, 1, 1);
      }
    }
    // grass tufts / texture
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(hash2(i, 21) * VIEW_W);
      const shore = SHORE_Y + Math.round(Math.sin(x * 0.045) * 4 + Math.sin(x * 0.13 + 2) * 2);
      const y = shore + 3 + Math.floor(hash2(i, 33) * (VIEW_H - shore - 4));
      const c = hash2(i, 41) > 0.5 ? 'rgba(120,160,86,0.5)' : 'rgba(52,86,48,0.55)';
      sx.fillStyle = c;
      sx.fillRect(x, y, 1, hash2(i, 9) > 0.7 ? 2 : 1);
    }
    // a few flowers
    const flowers = ['#e8e0f0', '#f2c8d8', '#f2e08a'];
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(12 + hash2(i, 55) * (VIEW_W - 24));
      const shore = SHORE_Y + Math.round(Math.sin(x * 0.045) * 4 + Math.sin(x * 0.13 + 2) * 2);
      const y = shore + 8 + Math.floor(hash2(i, 66) * (VIEW_H - shore - 12));
      sx.fillStyle = '#3d6b3a'; sx.fillRect(x, y, 1, 2);
      sx.fillStyle = flowers[i % 3]; sx.fillRect(x, y - 1, 1, 1);
      sx.fillRect(x - 1, y, 1, 1); sx.fillRect(x + 1, y, 1, 1);
    }
  }

  function drawDistantIslet() {
    const islets = [[58, 26, 1], [252, 21, 0.82], [150, 18, 0.6]];
    for (const it of islets) {
      const x = it[0], base = it[1], s = it[2];
      const w = Math.round(18 * s);
      for (let dx = -w; dx <= w; dx++) {
        const h = Math.round(Math.sqrt(Math.max(0, 1 - (dx / w) * (dx / w))) * 4 * s);
        sx.fillStyle = '#22404a';
        sx.fillRect(x + dx, base - h, 1, h);
      }
      // tiny trees
      sx.fillStyle = '#1b333c';
      sx.fillRect(x - 4 * s, base - 7 * s, 2, 4 * s);
      sx.fillRect(x + 3 * s, base - 6 * s, 2, 3 * s);
      // reflection
      sx.fillStyle = 'rgba(27,51,60,0.35)';
      for (let dy = 0; dy < 3; dy++) sx.fillRect(x - w, base + dy, w * 2, 1);
    }
  }

  // Persisted drifting props
  const driftFish = [];
  for (let i = 0; i < 8; i++) {
    driftFish.push({
      x: hash2(i, 101) * VIEW_W,
      y: 24 + hash2(i, 102) * 74,
      sp: 3 + hash2(i, 103) * 6,
      size: 2 + Math.floor(hash2(i, 104) * 3),
      dir: hash2(i, 105) > 0.5 ? 1 : -1,
      ph: hash2(i, 106) * 6.28,
    });
  }
  const petals = [];
  for (let i = 0; i < 9; i++) {
    petals.push({
      x: hash2(i, 201) * VIEW_W,
      y: 20 + hash2(i, 202) * 84,
      sp: 2 + hash2(i, 203) * 4,
      ph: hash2(i, 204) * 6.28,
      c: hash2(i, 205) > 0.5 ? '#e8c8d8' : '#d8e0a0',
    });
  }

  function drawWaterLife() {
    // broad soft light patches on the surface
    for (let i = 0; i < 5; i++) {
      const x = hash2(i, 301) * VIEW_W;
      const y = 12 + hash2(i, 302) * 80;
      const w = 22 + hash2(i, 303) * 26;
      const a = 0.05 + 0.03 * Math.sin(G.clock * 0.7 + i);
      sx.fillStyle = 'rgba(200,240,245,' + a.toFixed(3) + ')';
      sx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2);
    }
    // slow dark silhouettes gliding under the surface
    for (const f of driftFish) {
      const span = VIEW_W + 40;
      let xx = ((f.x + G.clock * f.sp * f.dir) % span + span) % span - 20;
      const yy = f.y + Math.sin(G.clock * 0.9 + f.ph) * 3;
      sx.fillStyle = 'rgba(18,52,72,0.30)';
      const s = f.size;
      for (let dx = -s; dx <= s; dx++) {
        const h = Math.round(Math.sqrt(Math.max(0, 1 - (dx / s) * (dx / s))) * (s * 0.5));
        sx.fillRect(Math.round(xx + dx), Math.round(yy - h), 1, h * 2 + 1);
      }
      // tail
      sx.fillRect(Math.round(xx - s * f.dir - 1), Math.round(yy - 1), 2, 1);
      sx.fillRect(Math.round(xx - s * f.dir - 2), Math.round(yy), 2, 1);
    }
    // drifting petals / leaves
    for (const p of petals) {
      let xx = ((p.x + G.clock * p.sp) % (VIEW_W + 20) + (VIEW_W + 20)) % (VIEW_W + 20) - 10;
      const yy = p.y + Math.sin(G.clock * 1.2 + p.ph) * 1.5;
      sx.fillStyle = 'rgba(20,50,70,0.25)';
      sx.fillRect(Math.round(xx), Math.round(yy) + 1, 2, 1);
      sx.fillStyle = p.c;
      sx.fillRect(Math.round(xx), Math.round(yy), 2, 1);
      sx.fillRect(Math.round(xx) + (Math.sin(G.clock + p.ph) > 0 ? 1 : 0), Math.round(yy) - 1, 1, 1);
    }
  }

  function drawRowboat(x, y) {
    // shadow / reflection
    sx.fillStyle = 'rgba(20,35,45,0.30)';
    for (let dx = -11; dx <= 11; dx++) {
      const wob = Math.round(Math.sin(G.clock * 2.6 + dx * 0.5) * 1.2);
      sx.fillRect(x + dx + wob, y + 6, 1, 1);
    }
    // hull
    for (let dx = -13; dx <= 13; dx++) {
      const h = Math.round(5 * Math.sqrt(Math.max(0, 1 - (dx / 13) * (dx / 13))));
      sx.fillStyle = '#5e4222';
      sx.fillRect(x + dx, y - h, 1, h * 2);
    }
    for (let dx = -11; dx <= 11; dx++) {
      const h = Math.round(4 * Math.sqrt(Math.max(0, 1 - (dx / 11) * (dx / 11))));
      sx.fillStyle = '#8a6035';
      sx.fillRect(x + dx, y - h, 1, h * 2);
    }
    // interior
    for (let dx = -8; dx <= 8; dx++) {
      const h = Math.round(2.6 * Math.sqrt(Math.max(0, 1 - (dx / 8) * (dx / 8))));
      sx.fillStyle = '#3a2a18';
      sx.fillRect(x + dx, y - h, 1, h * 2);
    }
    // seats
    sx.fillStyle = '#b08048';
    sx.fillRect(x - 4, y - 3, 3, 6);
    sx.fillRect(x + 1, y - 3, 3, 6);
    // oars
    plotLine(sx, x - 2, y - 4, x - 15, y - 9, '#c2a06a', 2);
    plotLine(sx, x + 2, y - 4, x + 15, y - 9, '#c2a06a', 2);
  }

  function drawShoreRocks() {
    const rocks = [[238, 121, 5], [248, 125, 4], [230, 126, 3], [96, 123, 4], [105, 127, 3], [14, 124, 4]];
    for (const r of rocks) {
      const x = r[0], y = r[1], s = r[2];
      sx.fillStyle = 'rgba(240,252,255,0.7)';
      sx.fillRect(x - s - 1, y + s - 1, s * 2 + 2, 1);
      sx.fillStyle = '#6f7480';
      for (let dx = -s; dx <= s; dx++) {
        const h = Math.round(Math.sqrt(Math.max(0, 1 - (dx / s) * (dx / s))) * s);
        sx.fillRect(x + dx, y - h, 1, h + 1);
      }
      sx.fillStyle = '#9298a4';
      for (let dx = -s; dx <= 0; dx++) {
        const h = Math.round(Math.sqrt(Math.max(0, 1 - (dx / s) * (dx / s))) * s);
        sx.fillRect(x + dx, y - h, 1, Math.max(1, Math.round(h * 0.5)));
      }
      sx.fillStyle = '#565b66';
      sx.fillRect(x + s - 1, y - 1, 1, 2);
    }
  }

  function drawReedsAndLilies() {
    // reeds along the shoreline
    const reedSpots = [18, 30, 246, 262, 276, 292, 306];
    for (const x of reedSpots) {
      const shore = SHORE_Y + Math.round(Math.sin(x * 0.045) * 4 + Math.sin(x * 0.13 + 2) * 2);
      const h = 10 + Math.round(hash2(x, 3) * 8);
      const sway = Math.round(Math.sin(G.clock * 1.3 + x) * 1.2);
      for (let i = 0; i < 4; i++) {
        const rx = x + i * 2;
        const topx = rx + sway;
        plotLine(sx, rx, shore + 1, topx, shore + 1 - h, '#3f6b3a', 1);
        sx.fillStyle = '#5f8a48';
        sx.fillRect(topx, shore + 1 - h, 1, 3);
        if (i % 2 === 0) { sx.fillStyle = '#7a5a34'; sx.fillRect(topx, shore - h + 2, 1, 2); }
      }
    }
    // lily pads in the water
    const pads = [[58, 40], [70, 46], [50, 52], [88, 34], [230, 50], [244, 58]];
    for (const p of pads) {
      const bob = Math.round(Math.sin(G.clock * 1.6 + p[0]) * 0.5);
      const y = p[1] + bob;
      sx.fillStyle = '#3f7a4a';
      for (let dx = -3; dx <= 3; dx++) {
        const hh = Math.round(2 - Math.abs(dx) * 0.4);
        sx.fillRect(p[0] + dx, y - hh, 1, hh * 2 + 1);
      }
      sx.fillStyle = '#2f5f3a';
      sx.fillRect(p[0], y, 1, 3);
      sx.fillStyle = '#e8a8c8';
      if ((p[0] % 2) === 0) sx.fillRect(p[0] + 2, y - 1, 1, 1);
    }
  }

  function drawDock() {
    // deck
    for (let y = DOCK.ty; y < DOCK.by; y++) {
      const lr = dockAt(y);
      const l = Math.round(lr[0]), r = Math.round(lr[1]);
      const shade = (y % 7 < 3) ? '#9c6f3e' : '#8a6035';
      sx.fillStyle = shade;
      sx.fillRect(l, y, r - l, 1);
      // plank seam
      if (y % 7 === 0) { sx.fillStyle = '#5e3f22'; sx.fillRect(l, y, r - l, 1); }
      // side shadows
      sx.fillStyle = '#5e3f22';
      sx.fillRect(l, y, 1, 1);
      sx.fillRect(r - 1, y, 1, 1);
    }
    // deck end cap
    const lr = dockAt(DOCK.ty);
    sx.fillStyle = '#b08048';
    sx.fillRect(Math.round(lr[0]), DOCK.ty, Math.round(lr[1] - lr[0]), 2);
    sx.fillStyle = '#5e3f22';
    sx.fillRect(Math.round(lr[0]), DOCK.ty + 2, Math.round(lr[1] - lr[0]), 1);
    // nail dots
    sx.fillStyle = '#4a3320';
    for (let y = DOCK.ty + 5; y < DOCK.by; y += 7) {
      const p = dockAt(y);
      sx.fillRect(Math.round(p[0]) + 3, y, 1, 1);
      sx.fillRect(Math.round(p[1]) - 4, y, 1, 1);
    }
    // mooring posts at the far (water) end, standing above the deck
    const top = dockAt(DOCK.ty);
    const postX = [Math.round(top[0]) + 3, Math.round(top[1]) - 5];
    for (const px of postX) {
      // reflection in the water beyond the pier
      sx.fillStyle = 'rgba(50,34,18,0.30)';
      for (let y = 0; y < 7; y++) {
        const wob = Math.round(Math.sin(G.clock * 3 + y * 0.7 + px) * 1.4);
        sx.fillRect(px + wob, DOCK.ty - 6 - y, 2, 1);
      }
      sx.fillStyle = '#3f2b18';
      sx.fillRect(px, DOCK.ty - 7, 3, 9);
      sx.fillStyle = '#7a5a34';
      sx.fillRect(px, DOCK.ty - 7, 2, 9);
      sx.fillStyle = '#c2a06a';
      sx.fillRect(px, DOCK.ty - 7, 1, 1);
      sx.fillStyle = '#2f1f10';
      sx.fillRect(px, DOCK.ty + 1, 3, 1);
    }
  }

  function drawFoliage() {
    // big tree on the left
    drawTree(40, 142, 1.15);
    drawTree(268, 150, 1.0);
    // bushes
    drawBush(110, 150, 1);
    drawBush(150, 162, 1.2);
    drawBush(230, 146, 0.9);
    // a small crate & bucket on the dock
    drawCrate(198, 104);
    drawBucket(172, 108);
  }
  function drawTree(x, y, s) {
    const sway = Math.round(Math.sin(G.clock * 1.1 + x) * 1);
    // trunk
    sx.fillStyle = '#4a3320';
    sx.fillRect(x - 2, y - 18 * s, 4, 18 * s);
    sx.fillStyle = '#6a4a2c';
    sx.fillRect(x - 2, y - 18 * s, 2, 18 * s);
    // canopy (clustered circles)
    const cy = y - 20 * s;
    const clusters = [[-8, 0], [0, -6], [8, 0], [-4, 4], [4, 4]];
    for (const c of clusters) {
      const cxp = x + (c[0] + sway) * s;
      const cyp = cy + c[1] * s;
      sx.fillStyle = '#2f5a35';
      pixelCircle(sx, cxp, cyp + 1, 8 * s, '#2f5a35');
      pixelCircle(sx, cxp, cyp, 7.5 * s, '#3f7a45');
      pixelCircle(sx, cxp - 2 * s, cyp - 2 * s, 4 * s, '#55984f');
      pixelCircle(sx, cxp - 3 * s, cyp - 3 * s, 2 * s, '#6fb060');
    }
  }
  function drawBush(x, y, s) {
    const bob = Math.round(Math.sin(G.clock * 1.5 + x) * 0.4);
    sx.fillStyle = '#244a2b';
    pixelCircle(sx, x, y + 2, 6 * s, '#274f2d');
    pixelCircle(sx, x, y + bob, 5.5 * s, '#356b3c');
    pixelCircle(sx, x - 2, y - 1 + bob, 3 * s, '#4d8a4d');
    // berries
    sx.fillStyle = '#c94f5a';
    sx.fillRect(x + 2, y + bob, 1, 1);
    sx.fillRect(x - 3, y + 2 + bob, 1, 1);
  }
  function drawCrate(x, y) {
    sx.fillStyle = '#7a5a34'; sx.fillRect(x, y, 9, 7);
    sx.fillStyle = '#5e4222'; sx.fillRect(x, y, 9, 1); sx.fillRect(x, y + 6, 9, 1);
    sx.fillRect(x, y, 1, 7); sx.fillRect(x + 8, y, 1, 7);
    sx.fillRect(x, y + 3, 9, 1);
    sx.fillStyle = '#9c7644'; sx.fillRect(x + 1, y + 1, 3, 1);
  }
  function drawBucket(x, y) {
    sx.fillStyle = '#6a7180'; sx.fillRect(x, y, 6, 6);
    sx.fillStyle = '#8a92a0'; sx.fillRect(x, y, 6, 1);
    sx.fillStyle = '#3f4650'; sx.fillRect(x, y, 1, 6); sx.fillRect(x + 5, y, 1, 6); sx.fillRect(x, y + 5, 6, 1);
    sx.fillStyle = '#4a525e';
    plotLine(sx, x, y, x + 2, y - 2, '#4a525e', 1);
    plotLine(sx, x + 2, y - 2, x + 5, y, '#4a525e', 1);
  }

  function drawBobber() {
    const b = G.bobber;
    if (G.phase === 'ready') return;
    let x = b.x, y = b.y, dip = 0;
    if (G.phase === 'waiting' && !G.landed) {
      // cast flight parabola
      const p = clamp(G.t / G.castDur, 0, 1);
      const rt = rodTip();
      const targ = BOBBER_TARGET;
      x = lerp(rt.x, targ.x, p);
      const baseY = lerp(rt.y, targ.y, p);
      const arc = Math.sin(p * Math.PI) * 26;
      y = baseY - arc;
      // shallow shadow
    } else if (G.phase === 'waiting') {
      y = b.y + Math.round(Math.sin(G.clock * 2.2) * 0.6);
    } else if (G.phase === 'bite') {
      const k = Math.min(1, G.t / 0.18);
      dip = Math.round(k * 2.5) + Math.round(Math.sin(G.t * 30) * 0.7);
      y = b.y + dip;
    } else if (G.phase === 'reeling') {
      const p = clamp(G.t / G.reelDur, 0, 1);
      const rt = rodTip();
      x = lerp(b.x, rt.x, easeInOut(p));
      y = lerp(b.y, rt.y, easeInOut(p)) - Math.sin(p * Math.PI) * 8;
    }
    b._dx = x; b._dy = y;

    // ripples
    for (const r of G.splash) {
      sx.globalAlpha = 1 - r.life / r.max;
      pixelEllipseRing(sx, r.x, r.y, r.r, r.r * 0.42, r.color);
      sx.globalAlpha = 1;
    }
    // shadow on water
    sx.fillStyle = 'rgba(20,50,70,0.35)';
    sx.fillRect(Math.round(x) - 1, Math.round(b.y) + 3, 3, 1);

    // bobber body
    pixelCircle(sx, Math.round(x), Math.round(y), 1, '#e83f3f');
    sx.fillStyle = '#ffffff'; sx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
    sx.fillStyle = '#241d2e'; sx.fillRect(Math.round(x) - 1, Math.round(y) + 1, 3, 1);
    sx.fillStyle = '#e83f3f'; sx.fillRect(Math.round(x), Math.round(y) - 2, 1, 1);

    // "!" cue during bite
    if (G.phase === 'bite') {
      const pulse = Math.sin(G.t * 18) > 0;
      drawText(sx, '!', Math.round(x) - 2, Math.round(y) - 10, 1, pulse ? '#fff4a0' : '#ff5a3c', true, 'rgba(0,0,0,0.6)');
      // bite window arc indicator
      const p = clamp(G.t / G.biteWindow, 0, 1);
      pixelEllipseRing(sx, x, y, 8, 8, 'rgba(255,255,255,0.9)', -Math.PI / 2, -Math.PI / 2 + (1 - p) * Math.PI * 2);
    }
  }

  function drawLine() {
    if (G.phase === 'ready' || !G.bobber) return;
    const rt = rodTip();
    const b = G.bobber;
    const bx = b._dx !== undefined ? b._dx : b.x;
    const by = b._dy !== undefined ? b._dy : b.y;
    // sagging line from rod tip to bobber
    const segs = 10;
    let px = rt.x, py = rt.y;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const x = lerp(rt.x, bx, t);
      const y = lerp(rt.y, by, t) + Math.sin(t * Math.PI) * 3;
      plotLine(sx, px, py, x, y, 'rgba(240,248,255,0.85)', 1);
      px = x; py = y;
    }
  }

  function drawAngler() {
    const bob = Math.round(Math.sin(G.clock * 2) * 0.6);
    const x = ANGLER.cx - 6;
    const y = ANGLER.feet - 20;
    // shadow
    sx.fillStyle = 'rgba(20,30,20,0.3)';
    sx.fillRect(ANGLER.cx - 5, ANGLER.feet - 1, 10, 2);
    // reflection on water under the dock tip is subtle; skip

    // rod (drawn before/after body depending)
    const rt = rodTip();
    const hx = ANGLER.cx - 2, hy = ANGLER.feet - 11 + bob;
    // bend more when reeling/bite
    let bend = 0;
    if (G.phase === 'reeling') bend = easeInOut(clamp(G.t / 0.3, 0, 1)) * 4 * (1 - G.t / G.reelDur * 0.3);
    if (G.phase === 'bite') bend = 3 + Math.sin(G.t * 30) * 1.2;
    const tipx = rt.x + bend * 0.6;
    const tipy = rt.y + bend;
    // rod shaft with slight curve
    let px = hx, py = hy;
    const segs = 6;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const x2 = lerp(hx, tipx, t) + Math.sin(t * Math.PI) * 1.5;
      const y2 = lerp(hy, tipy, t);
      plotLine(sx, px, py, x2, y2, i < 3 ? '#5a3a20' : '#8a5a2b', i < segs ? 2 : 1);
      px = x2; py = y2;
    }

    drawAnglerSprite(sx, x, y, bob, G.phase === 'bite');

    // hand highlight
    sx.fillStyle = '#f0b98a';
    sx.fillRect(hx, hy, 2, 2);
  }

  function drawParticles(c, onlyBig) {
    for (const p of G.particles) {
      if (onlyBig === true && !p.big) continue;
      if (onlyBig === false && p.big) continue;
      const a = 1 - p.life / p.max;
      c.globalAlpha = Math.max(0, a);
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    c.globalAlpha = 1;
  }

  // Static background is rendered once to save per-frame work.
  let bgCanvas = null;
  function buildBackground() {
    const saved = sx;
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = VIEW_W; bgCanvas.height = VIEW_H;
    sx = bgCanvas.getContext('2d');
    noSmooth(sx);
    drawWaterBase();
    drawFarShore();
    drawDistantIslet();
    drawLand();
    drawShoreRocks();
    sx = saved;
  }

  function renderScene() {
    sx.drawImage(bgCanvas, 0, 0);
    drawWaterWaves();
    drawWaterLife();
    drawReedsAndLilies();
    drawFoliage();
    drawRowboat(252, 102);
    drawDock();
    drawBobber();
    drawLine();
    drawAngler();
    drawParticles(sx, false);

    // vignette warmth
    const grad = sx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, 200);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(10,18,30,0.35)');
    sx.fillStyle = grad;
    sx.fillRect(0, 0, VIEW_W, VIEW_H);

    // bite screen tint
    if (G.phase === 'bite') {
      sx.fillStyle = 'rgba(255,220,120,' + (0.06 + Math.abs(Math.sin(G.t * 12)) * 0.05) + ')';
      sx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  /* ----------------------------------------------------------------------
     REVEAL CARD
     ---------------------------------------------------------------------- */
  function rarityIndex(r) { return RARITIES.indexOf(r); }

  function drawReveal() {
    const fish = G.caught;
    if (!fish) return;
    const r = G.caughtRarity;
    const ri = rarityIndex(r);
    const col = RARITY_COLOR[r];
    const t = G.revealT;
    const appear = clamp(t / 0.28, 0, 1);
    const scaleIn = easeOut(appear);

    // dim backdrop
    ctx.fillStyle = 'rgba(6,10,18,' + (0.6 * appear) + ')';
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    const CW = 470, CH = 268;
    const cx = OUT_W / 2, cy = OUT_H / 2 - 8;
    const x = cx - CW / 2, y = cy - CH / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleIn, scaleIn);
    ctx.translate(-cx, -cy);

    // --- tier-specific backdrop glow ---
    if (ri >= 1) {
      const glowR = 210 + Math.sin(t * 2 + ri) * 10;
      const gg = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowR);
      gg.addColorStop(0, hexA(col, ri >= 4 ? 0.5 : 0.3));
      gg.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
    }

    // --- rotating rays for Rare+ ---
    if (ri >= 2) {
      ctx.save();
      ctx.translate(cx, cy - 14);
      const rays = ri >= 4 ? 16 : 10;
      ctx.rotate(t * (ri >= 4 ? 0.5 : 0.28) * (ri === 2 ? 1 : 1));
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = hexA(col, ri >= 4 ? 0.20 : 0.12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(230, -10);
        ctx.lineTo(230, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // --- Ancient rune ring ---
    if (r === 'Ancient') {
      ctx.save();
      ctx.translate(cx, cy - 14);
      ctx.rotate(-t * 0.25);
      ctx.strokeStyle = hexA('#82f0df', 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.stroke();
      const runes = 12;
      for (let i = 0; i < runes; i++) {
        const a = (i / runes) * Math.PI * 2;
        const rx = Math.cos(a) * 120, ry = Math.sin(a) * 120;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(a + Math.PI / 2);
        drawText(ctx, ['=', '+', 'x', '<', '>', '*', '%', '/'][i % 8], -4, -6, 1, '#bffff4');
        ctx.restore();
      }
      ctx.restore();
    }

    // --- card frame ---
    drawTierFrame(ctx, x, y, CW, CH, r, t);

    // card inner
    const grd = ctx.createLinearGradient(x, y, x, y + CH);
    if (r === 'Ancient') {
      grd.addColorStop(0, '#101a2e');
      grd.addColorStop(1, '#1b2c42');
    } else {
      grd.addColorStop(0, '#1c2433');
      grd.addColorStop(1, '#121826');
    }
    ctx.fillStyle = grd;
    roundRect(ctx, x + 6, y + 6, CW - 12, CH - 12, 8);
    ctx.fill();

    // --- badge ---
    const badgeY = y + 30;
    ctx.fillStyle = hexA(col, 0.18);
    roundRect(ctx, x + 18, badgeY - 14, CW - 36, 26, 6);
    ctx.fill();
    ctx.strokeStyle = hexA(col, 0.8);
    ctx.lineWidth = 2;
    roundRect(ctx, x + 18, badgeY - 14, CW - 36, 26, 6);
    ctx.stroke();
    drawTextCenter(ctx, r.toUpperCase(), cx, badgeY - 8, 2, col, 1, 'rgba(0,0,0,0.6)');

    // --- fish (bobbing / zooming) ---
    const spr = getFishSprite(fish);
    const baseScale = clamp(180 / spr.w, 4, 9);
    const zoom = r === 'Ancient' ? 1 + Math.sin(t * 1.2) * 0.02 : (ri >= 4 ? 1 + Math.sin(t * 2) * 0.03 : 1);
    const bobY = Math.sin(t * 1.8) * (r === 'Ancient' ? 3 : 2);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 70, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // glow behind fish
    if (fish.glow || ri >= 4) {
      const gc = fish.glow || col;
      const rg = ctx.createRadialGradient(cx, cy - 16, 8, cx, cy - 16, 120);
      rg.addColorStop(0, hexA(gc, 0.5));
      rg.addColorStop(1, hexA(gc, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(cx - 130, cy - 140, 260, 260);
    }
    noSmooth(ctx);
    const fw = spr.w * baseScale * zoom, fh = spr.h * baseScale * zoom;
    const fishY = cy - 14 + bobY;
    ctx.drawImage(spr.canvas, cx - fw / 2, fishY - fh / 2, fw, fh);

    // shiny sweep for rare+
    if (ri >= 2) {
      const sw = ((t * 0.7) % 1.6) - 0.3;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 120, fishY - 70, 240, 140);
      ctx.clip();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - 120 + sw * 240, fishY - 80);
      ctx.lineTo(cx - 90 + sw * 240, fishY - 80);
      ctx.lineTo(cx - 130 + sw * 240, fishY + 80);
      ctx.lineTo(cx - 160 + sw * 240, fishY + 80);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // --- name ---
    const nameY = y + CH - 78;
    drawTextCenter(ctx, fish.name.toUpperCase(), cx, nameY, 3, '#f4f0e4', 1, 'rgba(0,0,0,0.7)');

    // rarity word small under name with decoration
    drawTextCenter(ctx, r.toUpperCase(), cx, nameY + 30, 2, col, 1, 'rgba(0,0,0,0.7)');

    // prompt
    const blink = 0.7 + 0.3 * Math.sin(t * 4);
    ctx.globalAlpha = blink;
    drawTextCenter(ctx, 'SPACE / BUTTON  -  CONTINUE', cx, y + CH - 24, 1, '#cfd8e6');
    ctx.globalAlpha = 1;

    ctx.restore();

    // particles in screen space
    drawParticles(ctx, true);

    // flash overlay
    if (G.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.5) + ')';
      ctx.fillRect(0, 0, OUT_W, OUT_H);
    }
  }

  function drawTierFrame(c, x, y, w, h, r, t) {
    const col = RARITY_COLOR[r];
    const ri = rarityIndex(r);
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    // outer glow
    c.save();
    c.shadowColor = col;
    c.shadowBlur = ri >= 4 ? 26 * pulse : (ri >= 2 ? 16 : 6);
    c.strokeStyle = hexA(col, ri >= 4 ? 0.95 : 0.75);
    c.lineWidth = ri >= 4 ? 4 : 3;
    roundRect(c, x, y, w, h, 10);
    c.stroke();
    c.restore();

    // inner thin frame
    c.strokeStyle = hexA(col, 0.35);
    c.lineWidth = 1;
    roundRect(c, x + 4, y + 4, w - 8, h - 8, 8);
    c.stroke();

    // corner ornaments by tier
    const corners = [[x + 8, y + 8, 1, 1], [x + w - 8, y + 8, -1, 1], [x + 8, y + h - 8, 1, -1], [x + w - 8, y + h - 8, -1, -1]];
    const size = ri >= 5 ? 14 : ri >= 3 ? 10 : ri >= 1 ? 7 : 0;
    if (size > 0) {
      c.fillStyle = col;
      for (const co of corners) {
        c.fillRect(co[0], co[1], size * co[2], 2);
        c.fillRect(co[0], co[1], 2, size * co[3]);
        if (ri >= 4) {
          c.fillRect(co[0] + 3 * co[2], co[1] + 3 * co[3], 4 * co[2], 2);
          c.fillRect(co[0] + 3 * co[2], co[1] + 3 * co[3], 2, 4 * co[3]);
        }
      }
    }
    // crown for legendary/ancient
    if (r === 'Legendary' || r === 'Ancient') {
      const cxp = x + w / 2;
      c.fillStyle = r === 'Legendary' ? '#ffd24a' : '#82f0df';
      for (let i = -3; i <= 3; i++) c.fillRect(cxp + i * 6, y - 4, 4, 4);
      c.fillRect(cxp - 20, y - 1, 40, 3);
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ----------------------------------------------------------------------
     HUD
     ---------------------------------------------------------------------- */
  const PANEL = { x: 966, y: 14, w: 300, h: 400 };
  const BTN = { x: 530, y: 648, w: 220, h: 52 };

  function drawPanel() {
    ctx.fillStyle = 'rgba(11,18,28,0.72)';
    roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,190,210,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 8);
    ctx.stroke();

    let yy = PANEL.y + 14;
    drawText(ctx, 'CATCH LOG', PANEL.x + 14, yy, 2, '#e8e2d0', 1, 'rgba(0,0,0,0.7)');
    const cnt = '(' + window.fishing.log.length + ')';
    drawText(ctx, cnt, PANEL.x + PANEL.w - 14 - textWidth(cnt, 1), yy + 4, 1, '#8fa3b8');
    yy += 26;
    ctx.strokeStyle = 'rgba(150,190,210,0.25)';
    ctx.beginPath(); ctx.moveTo(PANEL.x + 12, yy); ctx.lineTo(PANEL.x + PANEL.w - 12, yy); ctx.stroke();
    yy += 8;

    const recent = window.fishing.log.slice(0, 8);
    if (recent.length === 0) {
      drawText(ctx, 'No catches yet.', PANEL.x + 14, yy + 2, 2, '#6f8296');
      yy += 20;
    } else {
      for (let i = 0; i < recent.length; i++) {
        const entry = recent[i];
        const col = RARITY_COLOR[entry.rarity] || '#fff';
        // rarity dot
        ctx.fillStyle = col;
        ctx.fillRect(PANEL.x + 14, yy + 3, 9, 9);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(PANEL.x + 14, yy + 3, 9, 9);
        let nm = entry.name;
        const maxChars = 16;
        if (nm.length > maxChars) nm = nm.slice(0, maxChars - 1) + '.';
        drawText(ctx, nm.toUpperCase(), PANEL.x + 30, yy, 2, '#e6ecf2');
        drawText(ctx, entry.rarity, PANEL.x + PANEL.w - 14 - textWidth(entry.rarity, 1), yy + 4, 1, col);
        yy += 21;
      }
    }

    // legend
    yy = PANEL.y + 224;
    ctx.strokeStyle = 'rgba(150,190,210,0.25)';
    ctx.beginPath(); ctx.moveTo(PANEL.x + 12, yy); ctx.lineTo(PANEL.x + PANEL.w - 12, yy); ctx.stroke();
    yy += 12;
    drawText(ctx, 'RARITY ODDS', PANEL.x + 14, yy, 2, '#e8e2d0', 1, 'rgba(0,0,0,0.7)');
    yy += 30;
    const odds = [['Common', '45%'], ['Uncommon', '25%'], ['Rare', '15%'], ['Epic', '8%'], ['Legendary', '5%'], ['Ancient', '2%']];
    for (const o of odds) {
      const col = RARITY_COLOR[o[0]];
      ctx.fillStyle = col;
      ctx.fillRect(PANEL.x + 14, yy + 3, 9, 9);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeRect(PANEL.x + 14, yy + 3, 9, 9);
      drawText(ctx, o[0].toUpperCase(), PANEL.x + 30, yy, 2, '#dbe3ec');
      drawText(ctx, o[1], PANEL.x + PANEL.w - 14 - textWidth(o[1], 2), yy, 2, col);
      yy += 22;
    }
  }

  function currentButtonLabel() {
    switch (G.phase) {
      case 'ready': return 'CAST';
      case 'waiting': return G.landed ? 'WAIT...' : 'CASTING...';
      case 'bite': return 'REEL IN!';
      case 'reeling': return 'REELING...';
      case 'reveal': return 'CONTINUE';
    }
    return '';
  }

  function drawButton() {
    const active = actionable();
    const col = G.phase === 'bite' ? '#ff5a3c' : (G.phase === 'reveal' ? '#ffd24a' : '#4f8a5b');
    const pulse = G.phase === 'bite' ? 0.7 + 0.3 * Math.sin(G.t * 20) : 1;
    ctx.globalAlpha = active ? 1 : 0.55;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, BTN.x + 4, BTN.y + 5, BTN.w, BTN.h, 10);
    ctx.fill();
    // face
    const grd = ctx.createLinearGradient(BTN.x, BTN.y, BTN.x, BTN.y + BTN.h);
    grd.addColorStop(0, shade(col, 1.3));
    grd.addColorStop(1, shade(col, 0.7));
    ctx.fillStyle = grd;
    roundRect(ctx, BTN.x, BTN.y, BTN.w, BTN.h, 10);
    ctx.fill();
    ctx.strokeStyle = active ? '#f4f0e4' : 'rgba(244,240,228,0.5)';
    ctx.lineWidth = 3 * pulse;
    roundRect(ctx, BTN.x, BTN.y, BTN.w, BTN.h, 10);
    ctx.stroke();
    const label = currentButtonLabel();
    drawTextCenter(ctx, label, BTN.x + BTN.w / 2, BTN.y + BTN.h / 2 - 8, 2, '#ffffff', 1, 'rgba(0,0,0,0.5)');
    ctx.globalAlpha = 1;
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function drawHud() {
    // title
    drawText(ctx, 'TIDELINE ISLE', 22, 14, 3, '#f4e9c8', 2, 'rgba(0,0,0,0.6)');
    drawText(ctx, 'A QUIET FISHING SPOT', 24, 46, 1, 'rgba(220,235,245,0.75)', 1, 'rgba(0,0,0,0.5)');

    // instruction / status line
    let msg = '';
    let mcol = '#dfe6ee';
    if (G.phase === 'ready') { msg = (G.firstCastDone || window.fishing.log.length) ? 'Ready. Press SPACE to cast.' : 'Press SPACE or the button to cast your line.'; }
    else if (G.phase === 'waiting') { msg = G.landed ? 'Wait for a bite...' : 'Casting...'; mcol = '#bcd6e0'; }
    else if (G.phase === 'bite') { msg = 'BITE!  PRESS SPACE NOW!'; mcol = '#ff8a5c'; }
    else if (G.phase === 'reeling') { msg = 'Reeling it in...'; mcol = '#ffe08a'; }
    else if (G.phase === 'reveal') { msg = 'Caught a ' + (G.caughtRarity || '') + ' fish!'; mcol = RARITY_COLOR[G.caughtRarity] || '#fff'; }
    drawText(ctx, msg, 24, 604, 2, mcol, 1, 'rgba(0,0,0,0.65)');
    if (G.misses > 0) drawText(ctx, 'MISSES: ' + G.misses, 24, 626, 1, 'rgba(200,210,220,0.7)');

    drawPanel();
    drawButton();

    // control hint
    drawText(ctx, 'SPACE / CLICK / TAP  =  SAME ACTION', 24, 690, 1, 'rgba(200,214,228,0.7)');
  }

  /* ----------------------------------------------------------------------
     Main render
     ---------------------------------------------------------------------- */
  function render() {
    renderScene();

    // blit scene upscaled with no smoothing
    noSmooth(ctx);
    ctx.clearRect(0, 0, OUT_W, OUT_H);
    ctx.drawImage(scene, 0, 0, VIEW_W, VIEW_H, 0, 0, OUT_W, OUT_H);

    drawHud();
    if (G.phase === 'reveal') drawReveal();
  }

  /* ----------------------------------------------------------------------
     Loop with pause when tab hidden
     ---------------------------------------------------------------------- */
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;       // avoid huge jumps
    if (!document.hidden) {
      update(dt);
    }
    render();
    requestAnimationFrame(frame);
  }
  // reset clock when returning so no catch-up
  document.addEventListener('visibilitychange', function () { last = performance.now(); });

  // input
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      doAction();
    }
  });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    // only respond when the on-screen button (or anywhere) is clicked
    doAction();
  });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  buildBackground();
  requestAnimationFrame(frame);

  // Hidden (non-enumerable) test hook; the public API stays exactly
  // { state, pickRarity, log } and nothing is drawn for it.
  Object.defineProperty(window.fishing, '__debug', {
    value: { G: G, RARITIES: RARITIES, FISH: FISH, getFishSprite: getFishSprite },
    enumerable: false, writable: false, configurable: true,
  });
})();
