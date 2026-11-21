// Original fish species, drawn procedurally as pixel art and baked to sprites.
// No image files: every pixel is produced by code.

function hash2(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 1013904223) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n >>> 0) / 4294967295;
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
export function lerpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// ---------------------------------------------------------------------------
// Species definitions
// ---------------------------------------------------------------------------
// shape controls the body silhouette. pattern controls markings.
// Colors are keyed for the renderer.
export const FISH = [
  // ---- Common -------------------------------------------------------------
  {
    name: 'Mudgill', rarity: 'Common', shape: 'round',
    aw: 26, ah: 16, bodyLen: 16, bodyH: 12, tail: 'fan', seed: 11,
    colors: { body: '#7d8f4a', shade: '#596b34', light: '#a6b463', belly: '#d9d29a', fin: '#b3a05a', accent: '#48572a', outline: '#22301c' },
    pattern: 'spots',
  },
  {
    name: 'Pebblefin Minnow', rarity: 'Common', shape: 'sleek',
    aw: 28, ah: 12, bodyLen: 20, bodyH: 8, tail: 'fork', seed: 23,
    colors: { body: '#b6c4cd', shade: '#8796a2', light: '#e6eef2', belly: '#f6fafb', fin: '#9db0bc', accent: '#65788a', outline: '#3a4650' },
    pattern: 'stripes',
  },
  // ---- Uncommon -----------------------------------------------------------
  {
    name: 'Coral Darter', rarity: 'Uncommon', shape: 'sleek',
    aw: 28, ah: 14, bodyLen: 20, bodyH: 10, tail: 'fork', seed: 37,
    colors: { body: '#e2703a', shade: '#b04a24', light: '#f6a45f', belly: '#ffd9a3', fin: '#f08a4b', accent: '#782e1a', outline: '#3d1a10' },
    pattern: 'stripes',
  },
  {
    name: 'Lantern Loach', rarity: 'Uncommon', shape: 'long',
    aw: 32, ah: 12, bodyLen: 26, bodyH: 8, tail: 'round', seed: 41,
    colors: { body: '#d8a23e', shade: '#a3701f', light: '#f4cd6f', belly: '#f7e6b0', fin: '#c98f36', accent: '#6d4a1c', outline: '#3a280f' },
    pattern: 'spots', whiskers: true,
  },
  // ---- Rare ---------------------------------------------------------------
  {
    name: 'Moonveil Trout', rarity: 'Rare', shape: 'sleek',
    aw: 30, ah: 15, bodyLen: 22, bodyH: 10, tail: 'fan', seed: 53,
    colors: { body: '#8fb8d8', shade: '#5c88ad', light: '#d3e8f3', belly: '#eef7fb', fin: '#bcd6e6', accent: '#e29ac0', outline: '#2f4a60' },
    pattern: 'crescent',
  },
  {
    name: 'Copper Koi', rarity: 'Rare', shape: 'round',
    aw: 30, ah: 18, bodyLen: 18, bodyH: 14, tail: 'long', seed: 61,
    colors: { body: '#d98a4a', shade: '#ab5d2a', light: '#f0b273', belly: '#ffe1b8', fin: '#e8b07a', accent: '#f7f1e2', outline: '#4a2a14' },
    pattern: 'patches',
  },
  // ---- Epic ---------------------------------------------------------------
  {
    name: 'Stormglass Bass', rarity: 'Epic', shape: 'round',
    aw: 30, ah: 18, bodyLen: 18, bodyH: 15, tail: 'fan', seed: 71, glow: true,
    colors: { body: '#4b4a8f', shade: '#33316b', light: '#807dc9', belly: '#b9b7e6', fin: '#6a68ad', accent: '#d6e94a', outline: '#1d1b40' },
    pattern: 'lightning', dorsal: 'spiny',
  },
  {
    name: 'Emberwing Tetra', rarity: 'Epic', shape: 'sleek',
    aw: 28, ah: 16, bodyLen: 19, bodyH: 11, tail: 'fan', seed: 83, glow: true,
    colors: { body: '#a83a4a', shade: '#76222f', light: '#e0665a', belly: '#f2b38a', fin: '#ff8a4a', accent: '#ffd166', outline: '#3a1018' },
    pattern: 'stripes',
  },
  // ---- Legendary ----------------------------------------------------------
  {
    name: 'Aurora Marlin', rarity: 'Legendary', shape: 'sleek',
    aw: 38, ah: 16, bodyLen: 27, bodyH: 10, tail: 'fork', seed: 97, glow: true,
    bill: 7, dorsal: 'sail', bigTail: true,
    colors: { grad: ['#2fb9c0', '#6f6fd6', '#e0a94a'], shade: '#2a6f86', light: '#a8f0e6', belly: '#f4ecc8', fin: '#7a6fd0', accent: '#ffd166', outline: '#1c3050' },
    pattern: 'gradient',
  },
  {
    name: 'Sunspine Pike', rarity: 'Legendary', shape: 'long',
    aw: 34, ah: 16, bodyLen: 27, bodyH: 11, tail: 'fan', seed: 101, glow: true,
    dorsal: 'spiny',
    colors: { body: '#e0a92e', shade: '#a87712', light: '#ffda79', belly: '#fff0c0', fin: '#d98f20', accent: '#6d4a10', outline: '#4a3208' },
    pattern: 'spots',
  },
  // ---- Ancient ------------------------------------------------------------
  {
    name: 'Eidolon of the Deep', rarity: 'Ancient', shape: 'long', ghost: true,
    aw: 34, ah: 18, bodyLen: 26, bodyH: 12, tail: 'ribbon', seed: 131,
    extras: ['runes'], dorsal: 'sail',
    colors: { body: '#3fa89f', shade: '#1c6b70', light: '#93f2e4', belly: '#c4f7ef', fin: '#5fd0c4', accent: '#7dffe8', outline: '#0d3a44' },
    pattern: 'scales',
  },
  {
    name: 'Primordial Coelacanth', rarity: 'Ancient', shape: 'armored',
    aw: 32, ah: 18, bodyLen: 24, bodyH: 14, tail: 'round', seed: 149,
    lobed: true, dorsal: 'spiny',
    colors: { body: '#4a7a72', shade: '#2d534d', light: '#82b0a1', belly: '#c9dac6', fin: '#3f6b62', accent: '#d4b96a', outline: '#16302c' },
    pattern: 'scales',
  },
];

export const FISH_BY_RARITY = {};
for (const f of FISH) {
  (FISH_BY_RARITY[f.rarity] ||= []).push(f);
}

// ---------------------------------------------------------------------------
// Body profile
// ---------------------------------------------------------------------------
function profile(u, shape) {
  // u: 0 at tail joint, 1 at snout
  let a = 0.10, b = 0.80, e = 0.60;
  if (shape === 'sleek') { a = 0.05; b = 0.90; e = 0.72; }
  else if (shape === 'long') { a = 0.08; b = 0.84; e = 0.55; }
  else if (shape === 'armored') { a = 0.14; b = 0.74; e = 0.40; }
  else if (shape === 'round') { a = 0.14; b = 0.74; e = 0.48; }
  const s = Math.sin(Math.PI * (a + b * u));
  return Math.pow(Math.max(0, s), e);
}

// ---------------------------------------------------------------------------
// Bake a species to a 1:1 pixel canvas
// ---------------------------------------------------------------------------
const spriteCache = new Map();

export function getSprite(fish) {
  if (spriteCache.has(fish.name)) return spriteCache.get(fish.name);
  const cv = document.createElement('canvas');
  cv.width = fish.aw;
  cv.height = fish.ah;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  render(g, fish);
  spriteCache.set(fish.name, cv);
  return cv;
}

function render(g, f) {
  const c = f.colors;
  const px = (x, y, col, alpha = 1) => {
    if (x < 0 || y < 0 || x >= f.aw || y >= f.ah || !col) return;
    g.globalAlpha = alpha;
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
    g.globalAlpha = 1;
  };

  const tailLen = f.tail === 'ribbon' || f.tail === 'long' ? 7 : f.tail === 'fork' ? 6 : 5;
  const bodyStart = tailLen;
  const bodyEnd = f.aw - 3;
  const by = Math.floor(f.ah / 2);
  const outline = c.outline;

  // Soft glow behind glow-y species
  if (f.glow || f.ghost) {
    const gc = c.light || c.body;
    for (let x = bodyStart - 3; x <= bodyEnd + 3; x++) {
      const u = (x - bodyStart) / (bodyEnd - bodyStart);
      if (u < -0.15 || u > 1.2) continue;
      const half = (f.bodyH / 2 + 2) * profile(Math.max(0, Math.min(1, u)), f.shape);
      for (let y = by - half; y <= by + half; y++) {
        const d = Math.hypot(x - (bodyStart + bodyEnd) / 2, (y - by) * 1.3);
        if (d < f.bodyLen * 0.62) px(x, y, gc, 0.14);
      }
    }
  }

  // ---- Tail --------------------------------------------------------------
  drawTail(g, f, px, bodyStart, by, tailLen);
  // ---- Dorsal ------------------------------------------------------------
 drawDorsal(g, f, px, bodyStart, bodyEnd, by);
  // ---- Lobed fins --------------------------------------------------------
  if (f.lobed) drawLobed(g, f, px, bodyStart, bodyEnd, by);

  // ---- Body --------------------------------------------------------------
  const endHalf = [];
  for (let x = bodyStart; x <= bodyEnd; x++) {
    const u = (x - bodyStart) / (bodyEnd - bodyStart);
    let half = Math.max(0.7, (f.bodyH / 2) * profile(u, f.shape));
    // slight belly bulge
    const top = Math.round(by - half);
    const bot = Math.round(by + half + (u > 0.3 && u < 0.8 ? 0.8 : 0));
    endHalf.push([top, bot]);
    let bodyCol = c.body;
    if (c.grad) {
      const t = u * (c.grad.length - 1);
      const i = Math.min(c.grad.length - 2, Math.floor(t));
      bodyCol = lerpColor(c.grad[i], c.grad[i + 1], t - i);
    }
    px(x, top - 1, outline);
    px(x, bot + 1, outline);
    for (let y = top; y <= bot; y++) {
      let col = bodyCol;
      if (y <= top + 1) col = c.light || bodyCol;
      else if (y >= bot - 1) col = c.belly || c.shade;
      else if (y === bot - 2) col = c.shade;
      px(x, y, col);
    }
  }
  // end caps
  const [t0, b0] = endHalf[0];
  for (let y = t0; y <= b0; y++) px(bodyStart - 1, y, outline);
  px(bodyStart - 1, Math.round(by), c.shade);

  // ---- Pattern -----------------------------------------------------------
  drawPattern(g, f, px, bodyStart, bodyEnd, by, endHalf);

  // ---- Pectoral fin ------------------------------------------------------
  drawPectoral(g, f, px, bodyStart, bodyEnd, by);

  // ---- Eye ---------------------------------------------------------------
  const ex = Math.round(bodyEnd - f.bodyLen * 0.16);
  const ey = by - 1;
  px(ex - 1, ey - 1, outline); px(ex + 1, ey - 1, outline);
  px(ex - 1, ey, outline); px(ex + 1, ey, outline);
  px(ex - 1, ey + 1, outline); px(ex + 1, ey + 1, outline);
  px(ex, ey - 1, c.light || '#ffffff');
  px(ex, ey, c.light || '#ffffff');
  px(ex, ey + 1, outline);
  px(ex, ey, '#161616');
  px(ex + 1, ey - 1, outline);

  // ---- Mouth -------------------------------------------------------------
  px(bodyEnd + 1, by + 1, outline);
  px(bodyEnd, by + 2, outline);
  px(bodyEnd + 1, by + 2, outline);

  // ---- Bill --------------------------------------------------------------
  if (f.bill) {
    const billY = by - 1;
    for (let i = 1; i <= f.bill; i++) {
      px(bodyEnd + i, billY - (i > 2 ? 1 : 0), outline);
      if (i < f.bill) px(bodyEnd + i, billY - (i > 2 ? 1 : 0) + 1, c.light || c.body);
    }
  }

  // ---- Whiskers ----------------------------------------------------------
  if (f.whiskers) {
    for (let i = 0; i < 5; i++) px(bodyEnd + 1 + i, by + 2 + Math.round(i * 0.7), outline);
    for (let i = 0; i < 4; i++) px(bodyEnd + 1 + i, by + 3 - Math.round(i * 0.5), outline);
  }

  // ---- Ancient runes -----------------------------------------------------
  if (f.extras && f.extras.includes('runes')) {
    const runeCol = c.accent;
    const spots = [[bodyStart + 5, by - 4], [bodyStart + 12, by + 3], [bodyStart + 18, by - 5]];
    for (const [rx, ry] of spots) {
      px(rx, ry, runeCol); px(rx + 1, ry, runeCol); px(rx, ry + 1, runeCol);
      px(rx - 1, ry + 1, runeCol); px(rx + 1, ry + 2, runeCol);
    }
  }
}

function drawTail(g, f, px, bodyStart, by, tailLen) {
  const c = f.colors;
  const spreadBase = f.tail === 'ribbon' ? f.bodyH * 0.4 : f.bigTail ? f.bodyH * 0.7 : f.tail === 'fork' ? f.bodyH * 0.58 : f.tail === 'round' ? f.bodyH * 0.38 : f.bodyH * 0.5;
  for (let i = 1; i <= tailLen; i++) {
    const t = i / tailLen;
    const x = bodyStart - i;
    let spread = spreadBase * (f.tail === 'round' ? (0.5 + 0.5 * Math.sin(t * Math.PI)) : t);
    spread = Math.max(1, spread);
    for (let y = by - spread; y <= by + spread; y++) {
      const edge = Math.abs(y - by) > spread - 1;
      let col = c.fin || c.shade;
      if (f.tail === 'fork' && t > 0.55 && Math.abs(y - by) < spread * 0.35) continue; // notch
      if (f.tail === 'ribbon' && Math.abs(y - by) < spread * 0.4 && t > 0.5) continue;
      if (edge) col = c.outline;
      px(x, Math.round(y), col);
    }
  }
  if (f.tail === 'ribbon') {
    // long trailing streamers
    for (let i = 0; i < 6; i++) {
      px(bodyStart - tailLen - i, by - Math.round(Math.sin(i * 0.7) * 2) - 1, c.fin, 0.8);
      px(bodyStart - tailLen - i, by + Math.round(Math.cos(i * 0.7) * 2) + 1, c.accent, 0.7);
    }
  }
}

function drawDorsal(g, f, px, bodyStart, bodyEnd, by) {
  if (!f.dorsal) return;
  const c = f.colors;
  const span = bodyEnd - bodyStart;
  const x0 = Math.round(bodyStart + span * 0.22);
  const x1 = Math.round(bodyStart + span * 0.68);
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    let h;
    if (f.dorsal === 'spiny') h = (1 + 3 * Math.pow(Math.sin(t * Math.PI), 0.35));
    else if (f.dorsal === 'sail') h = 3 + 3 * Math.sin(t * Math.PI);
    else h = 2 + 2 * Math.sin(t * Math.PI);
    const base = by - Math.round((f.bodyH / 2) * profile((x - bodyStart) / span, f.shape));
    for (let i = 0; i < h; i++) {
      const yy = base - i;
      if (f.dorsal === 'spiny') {
        // separate rays
        const ray = (i === h - 1) || ((x - x0) % 3 === 0);
        if (!ray && i > 0) continue;
      }
      let col = i === Math.round(h) - 1 ? c.outline : c.fin || c.accent;
      if (f.dorsal === 'sail' && i < h - 1) col = c.light || c.fin;
      px(x, yy, col);
    }
  }
}

function drawLobed(g, f, px, bodyStart, bodyEnd, by) {
  const c = f.colors;
  const spots = [
    [bodyStart + 3, by + 3], [bodyStart + 9, by + 3], [bodyEnd - 3, by + 2],
    [bodyStart + 4, by - 4],
  ];
  for (const [x, y] of spots) {
    for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 3; dy++) {
      if (Math.hypot(dx - 1.5, dy - 1) < 2.2) px(x + dx, y + dy, dy === 0 ? c.outline : c.fin);
    }
  }
}

function drawPectoral(g, f, px, bodyStart, bodyEnd, by) {
  const c = f.colors;
  const span = bodyEnd - bodyStart;
  const x = Math.round(bodyStart + span * 0.42);
  const y = by + Math.round(f.bodyH * 0.18);
  for (let i = 0; i < 4; i++) {
    px(x + i, y + Math.round(i * 0.4), c.fin || c.shade);
    px(x - i, y + Math.round(i * 0.4), c.fin || c.shade);
  }
  px(x, y - 1, c.outline);
  px(x + 2, y - 1, c.outline);
}

function drawPattern(g, f, px, bodyStart, bodyEnd, by, endHalf) {
  const c = f.colors;
  const span = bodyEnd - bodyStart;
  const inside = (x, y) => {
    if (x < bodyStart || x > bodyEnd) return false;
    const [t, b] = endHalf[x - bodyStart];
    return y > t && y < b;
  };
  const col = c.accent;
  if (f.pattern === 'spots') {
    for (let x = bodyStart; x <= bodyEnd; x++) {
      for (let y = by - 7; y <= by + 7; y++) {
        if (!inside(x, y)) continue;
        if (hash2(x, y, f.seed) > 0.86) {
          px(x, y, col);
          if (hash2(x + 1, y, f.seed) > 0.8) px(x + 1, y, col);
        }
      }
    }
  } else if (f.pattern === 'stripes') {
    for (let x = bodyStart + 3; x <= bodyEnd - 1; x += 4) {
      for (let y = by - 8; y <= by + 8; y++) {
        if (inside(x, y)) px(x, y, col);
        if (inside(x + 1, y) && hash2(x, y, f.seed) > 0.55) px(x + 1, y, col);
      }
    }
  } else if (f.pattern === 'lightning') {
    let y = by - 5;
    for (let x = bodyStart + 2; x <= bodyEnd - 1; x++) {
      if (inside(x, y)) px(x, y, col);
      if (inside(x, y + 1)) px(x, y + 1, col);
      if (x % 3 === 0) y += (x % 6 === 0) ? 1 : -1;
    }
  } else if (f.pattern === 'crescent') {
    for (let x = bodyStart + 2; x <= bodyEnd - 1; x += 5) {
      for (let y = by - 6; y <= by + 6; y += 5) {
        if (!inside(x, y)) continue;
        px(x, y, col); px(x + 1, y, col); px(x + 2, y, col);
        px(x, y + 1, col); px(x + 2, y + 1, col);
      }
    }
  } else if (f.pattern === 'patches') {
    for (let x = bodyStart; x <= bodyEnd; x++) {
      for (let y = by - 8; y <= by + 8; y++) {
        if (!inside(x, y)) continue;
        const v = Math.sin(x * 0.45 + y * 0.3) + hash2(x, y, f.seed) * 0.8;
        if (v > 1.05) px(x, y, col);
      }
    }
  } else if (f.pattern === 'scales') {
    for (let x = bodyStart + 1; x <= bodyEnd - 1; x++) {
      for (let y = by - 7; y <= by + 7; y++) {
        if (!inside(x, y)) continue;
        if ((x + y) % 4 === 0) px(x, y, col, 0.85);
        if (x % 6 === 0 && y === by + 3) px(x, y, c.light, 1);
      }
    }
  }
}

export function pickFishForRarity(rarity) {
  const list = FISH_BY_RARITY[rarity];
  if (!list || !list.length) return FISH[0];
  return list[Math.floor(Math.random() * list.length)];
}
