// fish.js -- original fish species + procedural pixel-art sprite generation.
// All artwork is drawn in code; no external assets are used.

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

// ---- tiny pixel triangle rasteriser -------------------------------------
function tri(c, ax, ay, bx, by, cx, cy, col) {
  const minx = Math.floor(Math.min(ax, bx, cx));
  const maxx = Math.ceil(Math.max(ax, bx, cx));
  const miny = Math.floor(Math.min(ay, by, cy));
  const maxy = Math.ceil(Math.max(ay, by, cy));
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(d) < 0.0001) return;
  c.fillStyle = col;
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
      const w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
      const w3 = 1 - w1 - w2;
      if (w1 >= -0.03 && w2 >= -0.03 && w3 >= -0.03) c.fillRect(x, y, 1, 1);
    }
  }
}

// ---- species table -------------------------------------------------------
// Fish faces right. cx/cy is the body centre inside a 64x40 sprite.
export const SPECIES = [
  // ---------------- Common ----------------
  { id: 'mudfin', name: 'Mudfin Minnow', rarity: 'Common',
    rx: 11, ry: 6, body: '#8a6f42', mid: '#a98a52', belly: '#e3d3a3', back: '#6b5430',
    fin: '#c9a86a', outline: '#3a2c18',
    tail: { type: 'fork', len: 8, spread: 5 },
    dorsal: { x0: 24, x1: 34, h: 4 }, pectoral: { x: 40, len: 6, drop: 2 },
    pattern: { type: 'stripes', gap: 5, w: 1, color: '#6b5430' } },

  { id: 'copper', name: 'Copperfin Perch', rarity: 'Common',
    rx: 12, ry: 8, body: '#b06a3a', mid: '#c98450', belly: '#f0cfa0', back: '#8a4a24',
    fin: '#d89a5a', outline: '#3a2010',
    tail: { type: 'fan', len: 8, spread: 7 },
    dorsal: { x0: 22, x1: 38, h: 6 }, pectoral: { x: 38, len: 6, drop: 3 },
    pattern: { type: 'bands', gap: 6, w: 2, color: '#7a3f1e' } },

  { id: 'chub', name: 'Puddle Chub', rarity: 'Common',
    rx: 12, ry: 9, body: '#7a8a4a', mid: '#93a35c', belly: '#e6e2b8', back: '#5a6a32',
    fin: '#b0b070', outline: '#2e3418',
    tail: { type: 'fan', len: 8, spread: 7 },
    dorsal: { x0: 22, x1: 36, h: 5 }, pectoral: { x: 38, len: 6, drop: 3 },
    pattern: { type: 'spots', dots: [[-4, -2], [3, -3], [6, 2], [-1, 3], [0, -0.5]], color: '#52602a' } },

  // ---------------- Uncommon ----------------
  { id: 'reedscale', name: 'Reedscale', rarity: 'Uncommon',
    rx: 12, ry: 7, body: '#4f8a4a', mid: '#66a85c', belly: '#d6e8b0', back: '#2f5f30',
    fin: '#8ac070', outline: '#1e3a1e',
    tail: { type: 'fork', len: 8, spread: 6 },
    dorsal: { x0: 22, x1: 38, h: 5 }, pectoral: { x: 38, len: 6, drop: 2 },
    pattern: { type: 'stripes', gap: 4, w: 1, color: '#2f5f30' } },

  { id: 'amber', name: 'Amber Gill', rarity: 'Uncommon',
    rx: 12, ry: 8, body: '#d98a2a', mid: '#eaa84a', belly: '#ffe0a0', back: '#a85f18',
    fin: '#f0b860', outline: '#4a2a08',
    tail: { type: 'fan', len: 8, spread: 7 },
    dorsal: { x0: 21, x1: 37, h: 7 }, pectoral: { x: 38, len: 6, drop: 3 },
    pattern: { type: 'bands', gap: 7, w: 2, color: '#b0641a' } },

  { id: 'bluecap', name: 'Bluecap Dace', rarity: 'Uncommon',
    rx: 12, ry: 7, body: '#3f7ab0', mid: '#5a9ad0', belly: '#e0eef8', back: '#265a8a',
    fin: '#78b4e0', outline: '#16324a',
    tail: { type: 'fork', len: 8, spread: 6 },
    dorsal: { x0: 22, x1: 38, h: 5 }, pectoral: { x: 38, len: 6, drop: 2 },
    pattern: { type: 'none' } },

  // ---------------- Rare ----------------
  { id: 'glassEel', name: 'Glass Eel', rarity: 'Rare',
    rx: 17, ry: 4, body: '#9fd8d0', mid: '#c2ece6', belly: '#eafaf6', back: '#6fb4ac',
    fin: '#d8f4ee', outline: '#3a6a66',
    tail: { type: 'whip', len: 12, spread: 4 },
    dorsal: { x0: 20, x1: 46, h: 3 }, pectoral: { x: 38, len: 6, drop: 2 },
    pattern: { type: 'none' } },

  { id: 'moonstripe', name: 'Moonstripe Trout', rarity: 'Rare',
    rx: 13, ry: 7, body: '#3a5a86', mid: '#4f78a8', belly: '#d8e4f0', back: '#26406a',
    fin: '#6f98c8', outline: '#16233a',
    tail: { type: 'fork', len: 8, spread: 6 },
    dorsal: { x0: 22, x1: 38, h: 5 }, pectoral: { x: 38, len: 6, drop: 2 },
    pattern: { type: 'stripe', color: '#c8d8ee' } },

  { id: 'emberfin', name: 'Emberfin', rarity: 'Rare',
    rx: 12, ry: 8, body: '#c23a2a', mid: '#e05a34', belly: '#ffd0a0', back: '#8a2218',
    fin: '#ff9a3a', outline: '#4a140c',
    tail: { type: 'fan', len: 9, spread: 8 },
    dorsal: { x0: 20, x1: 38, h: 8 }, pectoral: { x: 38, len: 7, drop: 3 },
    pattern: { type: 'gradient' } },

  // ---------------- Epic ----------------
  { id: 'royalGar', name: 'Royal Gar', rarity: 'Epic',
    rx: 15, ry: 5, body: '#6a3f9a', mid: '#8a5ac0', belly: '#d8c0f0', back: '#452868',
    fin: '#b088e0', outline: '#2a1442',
    tail: { type: 'crescent', len: 10, spread: 7 },
    dorsal: { x0: 24, x1: 44, h: 4 }, pectoral: { x: 38, len: 6, drop: 2 },
    snout: { len: 7 },
    pattern: { type: 'spots', dots: [[-6, -1], [0, -2], [6, -1], [-3, 1], [3, 1]], color: '#e0c060' } },

  { id: 'thunderjaw', name: 'Thunderjaw', rarity: 'Epic',
    rx: 13, ry: 8, body: '#1f3a6a', mid: '#2f5aa0', belly: '#c8d8f0', back: '#12254a',
    fin: '#6fa0e0', outline: '#0a1428',
    tail: { type: 'fork', len: 9, spread: 7 },
    dorsal: { x0: 20, x1: 38, h: 8 }, pectoral: { x: 38, len: 7, drop: 3 },
    pattern: { type: 'lightning', color: '#ffd23a' } },

  { id: 'coralCrown', name: 'Coral Crown', rarity: 'Epic',
    rx: 12, ry: 9, body: '#e0607a', mid: '#f08aa0', belly: '#ffe0e8', back: '#b03a56',
    fin: '#ffb0c0', outline: '#5a1a2a',
    tail: { type: 'fan', len: 9, spread: 8 },
    dorsal: { x0: 19, x1: 39, h: 9, crown: true }, pectoral: { x: 38, len: 7, drop: 3 },
    pattern: { type: 'spots', dots: [[-4, -2], [3, -3], [7, 0], [-1, 3], [1, 0]], color: '#fff0a0' } },

  // ---------------- Legendary ----------------
  { id: 'auroraSturgeon', name: 'Aurora Sturgeon', rarity: 'Legendary',
    rx: 16, ry: 7, body: '#2f6a6a', mid: '#4f9a90', belly: '#d8f0e0', back: '#1e4646',
    fin: '#7ac0a0', outline: '#12302e',
    tail: { type: 'crescent', len: 10, spread: 8 },
    dorsal: { x0: 26, x1: 48, h: 4 }, pectoral: { x: 38, len: 6, drop: 2 },
    snout: { len: 6 },
    pattern: { type: 'plates', color: '#a0e8d0' } },

  { id: 'stormPike', name: 'Storm Pike', rarity: 'Legendary',
    rx: 16, ry: 6, body: '#1e4a4a', mid: '#2f6a6a', belly: '#c8e8e0', back: '#0f3030',
    fin: '#60b0b0', outline: '#082020',
    tail: { type: 'fork', len: 10, spread: 8 },
    dorsal: { x0: 30, x1: 48, h: 4 }, pectoral: { x: 38, len: 6, drop: 2 },
    snout: { len: 7 },
    pattern: { type: 'lightning', color: '#a0f0e0' } },

  // ---------------- Ancient ----------------
  { id: 'tidewrought', name: 'Tidewrought Coel', rarity: 'Ancient',
    rx: 14, ry: 8, body: '#4a5a5a', mid: '#6a7a78', belly: '#c8d8d0', back: '#2e3a3a',
    fin: '#7ad0c8', outline: '#1a2424',
    tail: { type: 'fan', len: 9, spread: 8 },
    dorsal: { x0: 20, x1: 38, h: 5 }, pectoral: { x: 38, len: 7, drop: 3, lobe: true },
    pattern: { type: 'runes', color: '#5fe0d0' } },

  { id: 'elderSerpent', name: 'Elder Serpent', rarity: 'Ancient',
    rx: 18, ry: 5, body: '#3a4a5a', mid: '#54707a', belly: '#bcd0d0', back: '#22303a',
    fin: '#5fd8d0', outline: '#141e26',
    tail: { type: 'whip', len: 13, spread: 5 },
    dorsal: { x0: 18, x1: 50, h: 4, spines: true }, pectoral: { x: 38, len: 6, drop: 2 },
    pattern: { type: 'runes', color: '#70f0e0' } },
];

export const BY_RARITY = {};
for (const r of RARITIES) BY_RARITY[r] = [];
for (const s of SPECIES) BY_RARITY[s.rarity].push(s);

export function speciesForRarity(rarity, rng = Math.random) {
  const list = BY_RARITY[rarity];
  if (!list || !list.length) return SPECIES[0];
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

// ---- sprite builder ------------------------------------------------------
const SW = 64, SH = 40, SCX = 38, SCY = 19;

export function makeFishSprite(sp) {
  const cv = document.createElement('canvas');
  cv.width = SW; cv.height = SH;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;

  const cx = SCX, cy = SCY, rx = sp.rx, ry = sp.ry;
  const left = cx - rx;
  const inside = (x, y) => {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  };
  const set = (x, y, col) => {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return;
    c.fillStyle = col; c.fillRect(x, y, 1, 1);
  };

  // --- tail ---
  const t = sp.tail;
  if (t) {
    if (t.type === 'fan') {
      tri(c, left, cy, left - t.len, cy - t.spread, left - t.len, cy + t.spread, sp.fin);
      tri(c, left, cy, left - t.len * 0.65, cy - t.spread * 0.5, left - t.len * 0.65, cy + t.spread * 0.5, sp.mid || sp.body);
    } else if (t.type === 'fork') {
      tri(c, left, cy, left - t.len, cy - t.spread, left - t.len * 0.5, cy, sp.fin);
      tri(c, left, cy, left - t.len, cy + t.spread, left - t.len * 0.5, cy, sp.fin);
    } else if (t.type === 'crescent') {
      tri(c, left, cy, left - t.len, cy - t.spread, left - t.len, cy - t.spread * 0.15, sp.fin);
      tri(c, left, cy, left - t.len, cy + t.spread, left - t.len, cy + t.spread * 0.15, sp.fin);
      tri(c, left, cy + 1, left - t.len * 0.75, cy - t.spread * 0.35, left - t.len * 0.75, cy + t.spread * 0.35, sp.body);
    } else if (t.type === 'whip') {
      for (let i = 0; i < t.len; i++) {
        const x = left - 1 - i;
        const y = Math.round(cy + Math.sin((i / t.len) * Math.PI * 0.85) * t.spread);
        set(x, y, sp.fin); set(x, y + 1, sp.fin);
      }
    }
  }

  // --- dorsal fin ---
  if (sp.dorsal) {
    const d = sp.dorsal;
    tri(c, d.x0, cy - ry + 1, d.x1, cy - ry + 1, d.x0 + (d.x1 - d.x0) * 0.32, cy - ry - d.h, sp.fin);
    if (d.crown) {
      for (let i = 0; i < 4; i++) {
        const bx = d.x0 + 2 + i * Math.max(2, (d.x1 - d.x0 - 4) / 3);
        tri(c, bx - 2, cy - ry - 2, bx + 2, cy - ry - 2, bx, cy - ry - d.h - 3, sp.fin);
      }
    }
    if (d.spines) {
      for (let i = 0; i < 5; i++) {
        const bx = d.x0 + i * ((d.x1 - d.x0) / 4);
        set(bx, cy - ry - d.h - 1, sp.fin);
        set(bx, cy - ry - d.h - 2, sp.fin);
      }
    }
  }

  // --- anal fin ---
  if (sp.anal) {
    const a = sp.anal;
    tri(c, a.x0, cy + ry - 1, a.x1, cy + ry - 1, (a.x0 + a.x1) / 2, cy + ry + a.h, sp.fin);
  }

  // --- pectoral fin ---
  if (sp.pectoral) {
    const p = sp.pectoral;
    tri(c, p.x, cy + ry * 0.15, p.x - p.len, cy + ry * 0.05 + p.drop, p.x - p.len * 0.35, cy + ry * 0.7 + p.drop, sp.fin);
    if (p.lobe) {
      set(p.x - p.len, cy + ry * 0.05 + p.drop + 1, sp.fin);
      set(p.x - p.len - 1, cy + ry * 0.05 + p.drop + 2, sp.fin);
      set(p.x - p.len - 1, cy + ry * 0.05 + p.drop + 3, sp.fin);
    }
  }

  // --- long snout (gar / sturgeon / pike) ---
  if (sp.snout) {
    const sl = sp.snout.len;
    for (let i = 1; i <= sl; i++) {
      set(cx + rx - 1 + i, cy - 1, sp.mid || sp.body);
      set(cx + rx - 1 + i, cy, sp.mid || sp.body);
      set(cx + rx - 1 + i, cy + 1, sp.back || sp.body);
    }
  }

  // --- body outline (expanded ellipse) ---
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const dx = (x - cx) / (rx + 1), dy = (y - cy) / (ry + 1);
      if (dx * dx + dy * dy <= 1) set(x, y, sp.outline);
    }
  }

  // --- body gradient fill ---
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      if (!inside(x, y)) continue;
      const ny = (y - cy) / ry;
      let col = sp.body;
      if (ny <= -0.5) col = sp.back || sp.body;
      else if (ny >= 0.55) col = sp.belly;
      else if (ny >= 0.15) col = sp.mid || sp.body;
      else col = sp.body;
      set(x, y, col);
    }
  }

  // --- pattern ---
  const pt = sp.pattern;
  if (pt && pt.type !== 'none') {
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        if (!inside(x, y)) continue;
        let hit = false;
        if (pt.type === 'stripes') hit = ((x - cx + 200) % pt.gap) < pt.w;
        else if (pt.type === 'bands') hit = ((x + y - cx - cy + 400) % pt.gap) < pt.w;
        else if (pt.type === 'spots') {
          for (const d of pt.dots) {
            const sx = cx + d[0] * rx / 9, sy = cy + d[1] * ry / 7;
            const ddx = x - sx, ddy = (y - sy) * 1.2;
            if (ddx * ddx + ddy * ddy <= 2.4) { hit = true; break; }
          }
        } else if (pt.type === 'stripe') {
          hit = Math.abs(y - (cy - ry * 0.15)) <= 1;
        } else if (pt.type === 'gradient') {
          hit = false;
        } else if (pt.type === 'lightning') {
          const zig = Math.sin((x - cx) * 0.7) * 2.2;
          hit = Math.abs((y - cy) - zig) <= 1 && x > cx - rx + 2;
        } else if (pt.type === 'plates') {
          hit = ((x - cx + 200) % 6) < 1 || ((x - cx + 200) % 6) === 5;
        } else if (pt.type === 'runes') {
          const gx = Math.round((x - cx) / 4) * 4 + cx;
          const gy = Math.round((y - cy) / 4) * 4 + cy;
          if (gx === x && gy === y) {
            if (((x - cx + 200) % 8) < 4 && ((y - cy + 200) % 8) >= 4) hit = true;
          }
        }
        if (hit) {
          const ny = (y - cy) / ry;
          const shaded = ny > 0.45 ? shade(pt.color, -0.18) : pt.color;
          set(x, y, shaded);
        }
      }
    }
  }

  // --- belly rim light, gill, eye, mouth ---
  for (let x = cx - rx + 2; x < cx + rx - 2; x++) {
    const ny = Math.sqrt(Math.max(0, 1 - ((x - cx) / (rx - 0.5)) ** 2));
    const yy = Math.round(cy + ny * (ry - 1));
    if (inside(x, yy)) set(x, yy, lighten(sp.belly, 0.2));
  }
  // gill arc
  for (let i = -ry + 2; i <= ry - 2; i++) {
    const gx = cx + Math.round(rx * 0.45 - Math.abs(i) * 0.08);
    set(gx, cy + i, shade(sp.body, -0.25));
  }
  // eye
  const ex = cx + Math.round(rx * 0.62), ey = cy - Math.max(1, Math.round(ry * 0.28));
  set(ex - 1, ey - 1, '#ffffff'); set(ex, ey - 1, '#ffffff');
  set(ex - 1, ey, '#ffffff'); set(ex, ey, '#ffffff');
  c.fillStyle = sp.outline;
  c.fillRect(ex, ey, 1, 1);
  set(ex - 1, ey - 1, '#ffffff');
  // mouth
  set(cx + rx + (sp.snout ? sp.snout.len : 0), cy + 1, sp.outline);
  // top highlight
  for (let x = cx - rx + 3; x < cx + rx - 3; x++) {
    const ny = Math.sqrt(Math.max(0, 1 - ((x - cx) / (rx - 0.5)) ** 2));
    const yy = Math.round(cy - ny * (ry - 1.5));
    if (inside(x, yy)) set(x, yy, lighten(sp.body, 0.28));
  }

  return cv;
}

// ---- colour helpers ------------------------------------------------------
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function parseHex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}
export function shade(hex, amt) {
  const [r, g, b] = parseHex(hex);
  return toHex(r + 255 * amt, g + 255 * amt, b + 255 * amt);
}
export function lighten(hex, amt) {
  const [r, g, b] = parseHex(hex);
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}

// pre-build sprites lazily (browser only)
const _sprites = new Map();
export function spriteFor(sp) {
  if (!_sprites.has(sp.id)) {
    try { _sprites.set(sp.id, makeFishSprite(sp)); }
    catch (e) { _sprites.set(sp.id, null); }
  }
  return _sprites.get(sp.id);
}
