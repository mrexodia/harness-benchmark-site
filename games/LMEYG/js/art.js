// Original pixel art rendered entirely in code. No image assets.

function hex(h) {
  if (Array.isArray(h)) return h;
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(w, h);
    this.d = this.img.data;
  }
  set(x, y, col) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = hex(col);
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
  }
  get(x, y) {
    const i = (y * this.w + x) * 4;
    return this.d[i + 3] === 0;
  }
  vline(x, y0, y1, col) {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = y0; y <= y1; y++) this.set(x, y, col);
  }
  ellipse(cx, cy, rx, ry, col) {
    for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
      const t = (x - cx) / rx;
      if (Math.abs(t) >= 1) continue;
      const hh = ry * Math.sqrt(1 - t * t);
      this.vline(x, Math.round(cy - hh), Math.round(cy + hh), col);
    }
  }
  circle(cx, cy, r, col) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.set(x, y, col);
      }
    }
  }
  tri(ax, ay, bx, by, cx, cy, col) {
    const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        if (inTri(x + 0.5, y + 0.5, ax, ay, bx, by, cx, cy)) this.set(x, y, col);
      }
    }
  }
  finish() { this.ctx.putImageData(this.img, 0, 0); return this.canvas; }
}

function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(neg && pos);
}

function inEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

// Outline a triangle by expanding it away from its centroid.
function outTri(p, ax, ay, bx, by, cx, cy, col, grow = 1) {
  const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3;
  const ex = (x, y) => {
    const dx = x - mx, dy = y - my, l = Math.hypot(dx, dy) || 1;
    return [x + dx / l * grow, y + dy / l * grow];
  };
  const [a1, a2] = ex(ax, ay), [b1, b2] = ex(bx, by), [c1, c2] = ex(cx, cy);
  p.tri(a1, a2, b1, b2, c1, c2, col);
}

// Draw a fish from a spec onto a pixel canvas.
function drawFishBody(s) {
  const p = new Pix(s.w, s.h);
  const { cx, cy, rx, ry } = s;
  const out = s.outline || '#241a22';
  const body = s.body, belly = s.belly || body, hi = s.bodyHi || body;

  // Tail
  if (s.tail) {
    const t = s.tail;
    const bx = cx + rx - 1, by = cy;
    const tip = bx + t.size;
    const sp = t.spread;
    if (t.type === 'fork') {
      outTri(p, bx, by, tip, by - sp, bx + t.size * 0.35, by, out, 1);
      outTri(p, bx, by, tip, by + sp, bx + t.size * 0.35, by, out, 1);
      p.tri(bx, by, tip, by - sp, bx + t.size * 0.35, by, t.color);
      p.tri(bx, by, tip, by + sp, bx + t.size * 0.35, by, t.color);
    } else if (t.type === 'round') {
      outTri(p, bx, by, tip, by - sp, tip, by + sp, out, 1);
      p.circle((bx + tip) / 2, by, t.size * 0.62, t.color);
    } else {
      outTri(p, bx, by, tip, by - sp, tip, by + sp, out, 1);
      p.tri(bx, by, tip, by - sp, tip, by + sp, t.color);
    }
  }

  // Fins (behind body)
  const fin = (cfg, dir) => {
    if (!cfg) return;
    const fx = cx + (cfg.off || 0);
    const len = cfg.len, root = cfg.root;
    if (cfg.spiky) {
      const n = cfg.spikes || 4;
      for (let i = 0; i <= n; i++) {
        const x = fx - root / 2 + (root * i) / n;
        const peakX = fx + (cfg.sweep || -2);
        const peakY = cy + dir * len * (0.7 + 0.3 * Math.sin(i * 2));
        outTri(p, x, cy + dir * ry * 0.5, x + root / n, cy + dir * ry * 0.5, peakX, peakY, out, 1.2);
        p.tri(x, cy + dir * ry * 0.5, x + root / n, cy + dir * ry * 0.5, peakX, peakY, cfg.color);
      }
    } else {
      outTri(p, fx - root / 2, cy + dir * ry * 0.35, fx + root / 2, cy + dir * ry * 0.35, fx + (cfg.sweep || -2), cy + dir * len, out, 1.2);
      p.tri(fx - root / 2, cy + dir * ry * 0.35, fx + root / 2, cy + dir * ry * 0.35, fx + (cfg.sweep || -2), cy + dir * len, cfg.color);
    }
  };
  fin(s.topFin, -1);
  fin(s.botFin, 1);

  // Pectoral fin
  if (s.pec) {
    p.ellipse(cx - rx * 0.35, cy + ry * 0.42, rx * 0.28, ry * 0.34, out);
    p.ellipse(cx - rx * 0.35, cy + ry * 0.42, rx * 0.22, ry * 0.26, s.pec);
  }

  // Body
  p.ellipse(cx, cy, rx + 1, ry + 1, out);
  p.ellipse(cx, cy, rx, ry, body);

  // Top highlight + belly
  for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
    const t = (x - cx) / rx;
    if (Math.abs(t) >= 1) continue;
    const hh = ry * Math.sqrt(1 - t * t);
    const y0 = Math.round(cy - hh), y1 = Math.round(cy + hh);
    p.set(x, y0, hi); p.set(x, y1, belly);
    if (hh > 3) { p.set(x, y0 + 1, hi); p.set(x, y1 - 1, belly); }
  }

  // Pattern
  if (s.pattern) {
    if (s.pattern.type === 'stripes' || s.pattern.type === 'bands') {
      for (const [fx, hw] of s.pattern.marks) {
        const sx = Math.round(cx - rx + rx * 2 * fx);
        for (let x = sx - hw; x <= sx + hw; x++) {
          const t = (x - cx) / rx;
          if (Math.abs(t) >= 1) continue;
          const hh = ry * Math.sqrt(1 - t * t);
          for (let y = Math.round(cy - hh); y <= Math.round(cy + hh); y++) {
            if (inEllipse(x, y, cx, cy, rx - 0.2, ry - 0.2)) p.set(x, y, s.pattern.color);
          }
        }
      }
    } else if (s.pattern.type === 'spots') {
      for (const [dx, dy, r] of s.pattern.marks) {
        for (let y = Math.floor(cy + dy - r); y <= Math.ceil(cy + dy + r); y++) {
          for (let x = Math.floor(cx + dx - r); x <= Math.ceil(cx + dx + r); x++) {
            if ((x - (cx + dx)) ** 2 + (y - (cy + dy)) ** 2 <= r * r &&
              inEllipse(x, y, cx, cy, rx - 0.6, ry - 0.6)) p.set(x, y, s.pattern.color);
          }
        }
      }
    } else if (s.pattern.type === 'lateral') {
      for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
        const t = (x - cx) / rx;
        if (Math.abs(t) >= 0.96) continue;
        const hh = ry * Math.sqrt(1 - t * t);
        const y = Math.round(cy + hh * 0.1);
        p.set(x, y, s.pattern.color);
        if (ry > 5) p.set(x, y + 1, s.pattern.color);
      }
    }
  }

  // Eye
  const ex = Math.round(cx - rx * (s.eye?.fx ?? 0.62));
  const ey = Math.round(cy - ry * (s.eye?.fy ?? 0.18));
  const er = s.eye?.r ?? Math.max(1, ry * 0.32);
  p.circle(ex, ey, er + 0.7, out);
  p.circle(ex, ey, er, s.eye?.white || '#f6f3e7');
  p.circle(ex + (s.eye?.px ?? 0.3), ey, Math.max(0.6, er * 0.55), s.eye?.pupil || '#1b1520');
  p.set(ex - 1, ey - 1, '#ffffff');

  // Mouth
  if (s.mouth !== false) {
    const mx = Math.round(cx - rx - 0.2);
    p.set(mx, Math.round(cy + ry * 0.15), out);
    if (s.mouthLine) { p.set(mx + 1, Math.round(cy + ry * 0.15) + 1, out); }
  }

  // Custom extras
  if (s.extras) s.extras(p);

  return p.finish();
}

export const FISH = [
  // ---- COMMON ----
  {
    name: 'Mudfin Minnow', rarity: 'Common', w: 26, h: 14, cx: 11, cy: 7, rx: 8, ry: 3.5,
    body: '#9b8f5c', bodyHi: '#c3b87e', belly: '#e3d9ac', outline: '#3b3222',
    pattern: { type: 'spots', color: '#6f6538', marks: [[-3, -1, 1], [1, 0, 1], [4, -1, 1], [-1, 1, 1]] },
    tail: { type: 'fan', size: 5, spread: 4, color: '#b3a35e' },
    eye: { r: 1.6 }, mouthLine: true,
  },
  {
    name: 'Pond Skipper', rarity: 'Common', w: 24, h: 14, cx: 10, cy: 7, rx: 7, ry: 4,
    body: '#6fa8c9', bodyHi: '#a6d6ea', belly: '#e6f5fa', outline: '#23394a',
    pattern: { type: 'spots', color: '#d7eef8', marks: [[-2, -1, 1], [2, 0, 1.2], [5, -1, 1]] },
    tail: { type: 'fork', size: 5, spread: 4, color: '#5b93b5' },
    topFin: { off: -1, root: 4, len: 4, color: '#5b93b5', sweep: -3 },
    eye: { r: 2, fx: 0.6 }, mouthLine: true,
  },

  // ---- UNCOMMON ----
  {
    name: 'Copper Perch', rarity: 'Uncommon', w: 30, h: 21, cx: 12, cy: 10, rx: 9, ry: 6,
    body: '#c47a37', bodyHi: '#e7a85e', belly: '#f0d3a0', outline: '#4a2a16',
    pattern: { type: 'stripes', color: '#8f4f22', marks: [[0.25, 1], [0.55, 1], [0.82, 1]] },
    tail: { type: 'fork', size: 6, spread: 6, color: '#b06a2c' },
    topFin: { off: -2, root: 7, len: 6, color: '#b06a2c', spiky: true, spikes: 5, sweep: -1 },
    botFin: { off: 0, root: 5, len: 4, color: '#b06a2c' },
    pec: '#d98f45',
    eye: { r: 2.1 }, mouthLine: true,
  },
  {
    name: 'Reed Bass', rarity: 'Uncommon', w: 34, h: 23, cx: 14, cy: 11, rx: 11, ry: 7,
    body: '#5f8b46', bodyHi: '#8fbf6b', belly: '#dfe8ac', outline: '#25341c',
    pattern: { type: 'stripes', color: '#38571f', marks: [[0.2, 1.2], [0.45, 1.2], [0.7, 1.2]] },
    tail: { type: 'fan', size: 7, spread: 7, color: '#4d7638' },
    topFin: { off: -3, root: 8, len: 6, color: '#4d7638', spiky: true, spikes: 5, sweep: 0 },
    botFin: { off: 1, root: 6, len: 5, color: '#4d7638' },
    pec: '#7fa958',
    eye: { r: 2.3 }, mouth: true, mouthLine: true,
  },

  // ---- RARE ----
  {
    name: 'Moonlit Trout', rarity: 'Rare', w: 38, h: 17, cx: 16, cy: 8, rx: 13, ry: 4.6,
    body: '#8fb2d6', bodyHi: '#cfe2f4', belly: '#eef5fb', outline: '#2a3d55',
    pattern: { type: 'lateral', color: '#e08aa8' },
    tail: { type: 'fork', size: 7, spread: 6, color: '#7d9fc6' },
    topFin: { off: -2, root: 6, len: 4, color: '#7d9fc6' },
    botFin: { off: 0, root: 5, len: 3, color: '#7d9fc6' },
    pec: '#a9c6e0',
    eye: { r: 2 }, mouthLine: true,
    extras: (p) => {
      const sp = [[-7, -2, 1], [-3, 1, 1], [1, -2, 1], [4, 1, 1], [-5, 1, 0.9], [7, -1, 1], [10, 1, 0.9]];
      for (const [x, y, r] of sp) p.circle(16 + x, 8 + y, r, '#41608a');
    },
  },
  {
    name: 'Glasswing Koi', rarity: 'Rare', w: 33, h: 22, cx: 14, cy: 11, rx: 10, ry: 6.5,
    body: '#f4f1e4', bodyHi: '#ffffff', belly: '#ffffff', outline: '#4a3b30',
    pattern: { type: 'spots', color: '#e8913c', marks: [[-4, -2, 3], [2, 1, 2.6], [6, -2, 2]] },
    tail: { type: 'round', size: 8, spread: 7, color: '#f6c9a8' },
    topFin: { off: -2, root: 7, len: 8, color: '#f6c9a8', sweep: 2 },
    botFin: { off: 1, root: 6, len: 7, color: '#f6c9a8', sweep: 2 },
    pec: '#f6c9a8',
    eye: { r: 1.9 }, mouthLine: true,
  },

  // ---- EPIC ----
  {
    name: 'Ember Grouper', rarity: 'Epic', w: 36, h: 27, cx: 15, cy: 13, rx: 12, ry: 9,
    body: '#cf4230', bodyHi: '#f07a45', belly: '#f6b96e', outline: '#511a14',
    pattern: { type: 'spots', color: '#ffd06a', marks: [[-5, -3, 1.4], [-1, 2, 1.3], [3, -4, 1.2], [6, 1, 1.4], [0, -1, 1.1], [8, -3, 1.2]] },
    tail: { type: 'round', size: 7, spread: 8, color: '#b8371f' },
    topFin: { off: -3, root: 9, len: 8, color: '#b8371f', spiky: true, spikes: 6, sweep: -2 },
    botFin: { off: 1, root: 7, len: 6, color: '#b8371f' },
    pec: '#e85c38',
    eye: { r: 2.4 }, mouth: true, mouthLine: true,
  },
  {
    name: 'Stormscale Eel', rarity: 'Epic', w: 46, h: 15, cx: 20, cy: 7.5, rx: 18, ry: 3.8,
    body: '#3a5a8c', bodyHi: '#6d92c4', belly: '#bcd0e8', outline: '#171f36',
    pattern: { type: 'lateral', color: '#5ff0e0' },
    tail: { type: 'fan', size: 6, spread: 4, color: '#2f4a76' },
    topFin: { off: -4, root: 20, len: 3, color: '#5ff0e0', sweep: 0 },
    eye: { r: 1.8, fx: 0.8 }, mouthLine: true,
    extras: (p) => {
      for (let i = 0; i < 7; i++) {
        const x = 6 + i * 5;
        p.set(x, 5, '#8ff8ec'); p.set(x + 1, 9, '#8ff8ec');
        p.set(x + 2, 6, '#5ff0e0');
      }
    },
  },

  // ---- LEGENDARY ----
  {
    name: 'Sunspine Marlin', rarity: 'Legendary', w: 56, h: 21, cx: 30, cy: 10, rx: 16, ry: 5.2,
    body: '#2f6fae', bodyHi: '#6fb2e8', belly: '#e2f1ff', outline: '#12283f',
    pattern: { type: 'lateral', color: '#ffd75e' },
    tail: { type: 'fork', size: 8, spread: 7, color: '#245a91' },
    topFin: { off: -4, root: 9, len: 10, color: '#ffd75e', spiky: true, spikes: 4, sweep: -4 },
    botFin: { off: 1, root: 6, len: 4, color: '#245a91' },
    pec: '#4f93cf',
    eye: { r: 2.1 }, mouth: false,
    extras: (p) => {
      // long sword bill extending past the head
      outTri(p, 0, 10, 15, 9, 15, 12.2, '#12283f', 0.8);
      p.tri(0, 10, 15, 10, 15, 11, '#2f6fae');
      p.tri(0, 10, 15, 10, 15, 10.6, '#6fb2e8');
      for (let i = 0; i < 6; i++) p.set(2 + i * 2, 10, '#12283f');
    },
  },
  {
    name: 'Aurora Sturgeon', rarity: 'Legendary', w: 48, h: 23, cx: 20, cy: 11.5, rx: 17, ry: 7,
    body: '#4aa89a', bodyHi: '#8fe0cf', belly: '#e6f7f0', outline: '#123a38',
    pattern: { type: 'lateral', color: '#bff7e6' },
    tail: { type: 'fork', size: 9, spread: 7, color: '#348a80' },
    topFin: { off: -6, root: 10, len: 4, color: '#2f7d74', sweep: -2 },
    eye: { r: 1.7, fx: 0.85 }, mouthLine: true,
    extras: (p) => {
      for (let i = 0; i < 8; i++) {
        const x = 6 + i * 4;
        p.vline(x, 6, 7, '#1f5a54');
        p.vline(x, 15, 16, '#1f5a54');
      }
      for (let i = 0; i < 6; i++) p.set(8 + i * 5, 5, '#e8fff8');
    },
  },

  // ---- ANCIENT ----
  {
    name: 'Elderfall Leviathan', rarity: 'Ancient', w: 54, h: 31, cx: 22, cy: 16, rx: 18, ry: 10.5,
    body: '#4b3b70', bodyHi: '#7d6bab', belly: '#c9bce6', outline: '#1c1230',
    pattern: { type: 'lateral', color: '#ffd86a' },
    tail: { type: 'fork', size: 10, spread: 10, color: '#3a2d5c' },
    topFin: { off: -4, root: 12, len: 10, color: '#3a2d5c', spiky: true, spikes: 6, sweep: -3 },
    botFin: { off: 2, root: 9, len: 7, color: '#3a2d5c' },
    pec: '#6a58a0',
    eye: { r: 2.6, white: '#ffe9a8', pupil: '#ff5a2a' }, mouth: true,
    extras: (p) => {
      // horns
      p.tri(9, 8, 6, 2, 12, 7, '#1c1230'); p.tri(9, 8, 7, 3, 12, 7, '#c9bce6');
      p.tri(13, 7, 11, 1, 16, 7, '#1c1230'); p.tri(13, 7, 12, 2, 16, 7, '#c9bce6');
      // glowing runes
      const runes = [[8, 14], [13, 12], [18, 15], [23, 12], [27, 15], [31, 13], [15, 18], [25, 18]];
      for (const [x, y] of runes) { p.set(x, y, '#ffe9a8'); p.set(x + 1, y, '#ffd86a'); p.set(x, y + 1, '#ffd86a'); }
      for (let i = 0; i < 4; i++) p.set(6 + i * 6, 20, '#8f7dc0');
    },
  },
  {
    name: 'Tidewrought Oracle', rarity: 'Ancient', w: 50, h: 27, cx: 20, cy: 14, rx: 16, ry: 9,
    body: '#2f5f63', bodyHi: '#5fa9a6', belly: '#cfe9e0', outline: '#0f2a2c',
    pattern: { type: 'lateral', color: '#8fe9ff' },
    tail: { type: 'round', size: 9, spread: 9, color: '#244f52' },
    topFin: { off: -2, root: 8, len: 9, color: '#244f52', spiky: true, spikes: 3, sweep: -2 },
    botFin: { off: 1, root: 7, len: 6, color: '#244f52' },
    pec: '#4b8a87',
    eye: { r: 3, white: '#dffcff', pupil: '#2fe0ff' }, mouth: true,
    extras: (p) => {
      // crown spines along the top
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 4;
        const h = 3 + (i % 2) * 2;
        p.tri(x, 8, x + 2, 8 - h, x + 3, 8, '#e8c65a');
      }
      // orbital ring around the eye
      for (let a = 0; a < 3.15 * 2; a += 0.4) {
        p.set(Math.round(9 + Math.cos(a) * 4), Math.round(11 + Math.sin(a) * 4), '#8fe9ff');
      }
      // luminous dots
      const dots = [[6, 18], [12, 21], [18, 19], [24, 21], [29, 18], [15, 16], [26, 15]];
      for (const [x, y] of dots) { p.set(x, y, '#bff7ff'); p.set(x + 1, y, '#6fd9ee'); }
    },
  },
];

// Cache built sprites by name.
const cache = new Map();
export function fishSprite(name) {
  if (cache.has(name)) return cache.get(name);
  const spec = FISH.find(f => f.name === name);
  const c = drawFishBody(spec);
  cache.set(name, c);
  return c;
}

export function makePix(w, h) { return new Pix(w, h); }
export { hex, outTri, inEllipse, Pix };
