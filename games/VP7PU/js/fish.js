// Original fish species and their code-drawn artwork.
// Everything here is rasterised by hand into a small offscreen buffer and
// scaled up with smoothing disabled, so it stays crisp pixel art.

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

// Exact odds, in order. Cumulative thresholds: .45 .70 .85 .93 .98 1.0
export const RARITY_ODDS = {
  Common: 0.45,
  Uncommon: 0.25,
  Rare: 0.15,
  Epic: 0.08,
  Legendary: 0.05,
  Ancient: 0.02,
};

export const RARITY_COLORS = {
  Common:    '#b9c6cd',
  Uncommon:  '#6fd27a',
  Rare:      '#59a9f2',
  Epic:      '#b273e8',
  Legendary: '#f4b731',
  Ancient:   '#7df0dc',
};

export const RARITY_ACCENT = {
  Common:    '#8fa0ab',
  Uncommon:  '#3f9a4c',
  Rare:      '#2f6fbf',
  Epic:      '#7a3fb0',
  Legendary: '#c07a10',
  Ancient:   '#c05fe0',
};

// Default rarity roller. The game always calls it through window.fishing so
// it can be replaced by tests.
export function defaultPickRarity(u) {
  let acc = 0;
  for (const r of RARITY_ORDER) {
    acc += RARITY_ODDS[r];
    if (u < acc) return r;
  }
  return 'Ancient';
}

export const FISH = {
  Common: [
    { name: 'PEBBLEFIN',     L: 9, H: 5, body: '#b08a5a', belly: '#e3cda0', fin: '#8a6a3f', outline: '#4a3722', pattern: 'spots',  spot: '#6f5330', eye: '#241a10' },
    { name: 'REED MINNOW',   L: 8, H: 4, body: '#8aa84f', belly: '#d9e2a4', fin: '#6a8a38', outline: '#3c4a20', pattern: 'stripes',stripe: '#5f7a30', eye: '#1f2410' },
  ],
  Uncommon: [
    { name: 'COPPER PERCH',  L: 10, H: 6, body: '#c07a3a', belly: '#eccb92', fin: '#a05a24', outline: '#5e3412', pattern: 'bars', bar: '#8a4a1c', spiny: true, eye: '#2a1608' },
    { name: 'SUNSCALE',      L: 10, H: 6, body: '#e8c84a', belly: '#f6ecac', fin: '#d0a830', outline: '#7a5c12', pattern: 'scales', scale: '#c89a20', halo: true, eye: '#2a2008' },
  ],
  Rare: [
    { name: 'MOON HERRING',  L: 11, H: 5, body: '#9fc8e0', belly: '#eaf5ff', fin: '#6fa0c8', outline: '#3a5c78', pattern: 'glowline', line: '#dff0ff', eye: '#20303f' },
    { name: 'AMBER KOI',     L: 11, H: 6, body: '#e8952f', belly: '#f8dcae', fin: '#f2c25a', outline: '#8a4e10', pattern: 'koi', patch: '#fbeede', longfins: true, eye: '#3a2208' },
  ],
  Epic: [
    { name: 'THUNDER PIKE',  L: 13, H: 5, body: '#4f8a5a', belly: '#cbe2a2', fin: '#3a6a44', outline: '#203a24', pattern: 'lightning', bolt: '#f6f29a', eye: '#f2e14a' },
    { name: 'CRYSTAL BASS',  L: 11, H: 7, body: '#7fc8e8', belly: '#e2f6ff', fin: '#a6e2f2', outline: '#356a86', pattern: 'facet', facet: '#bfeeff', spiny: true, eye: '#12303f' },
  ],
  Legendary: [
    { name: 'EMBER STURGEON', L: 14, H: 6, body: '#5b4a56', belly: '#8f7d72', fin: '#7a5648', outline: '#2a2026', pattern: 'ember', ember: '#ff9a3a', scutes: true, whiskers: true, eye: '#ffd27a' },
    { name: 'KINGFISHER TROUT', L: 12, H: 6, body: '#d06a6a', belly: '#f4c6b4', fin: '#b04a4a', outline: '#5e2222', pattern: 'trout', speck: '#f2e2c0', band: '#e89090', eye: '#2a0f0f' },
  ],
  Ancient: [
    { name: 'VOIDGILL LEVIATHAN', L: 14, H: 7, body: '#2b2545', belly: '#4a3a6e', fin: '#7a50c0', outline: '#0e0a1c', pattern: 'runes', rune: '#8ef0ff', special: 'ancient', tendrils: true, eye: '#8ef0ff' },
    { name: 'TIDEWRAITH',         L: 13, H: 8, body: '#3a6a7a', belly: '#8fd0d0', fin: '#a0f0e0', outline: '#16343c', pattern: 'spirit', core: '#d8fff4', special: 'ancient', longfins: true, eye: '#ffffff' },
  ],
};

export function pickFish(rarity) {
  const list = FISH[rarity] || FISH.Common;
  return list[Math.floor(Math.random() * list.length)];
}

// ---------------------------------------------------------------------------
// Scratch buffer used to rasterise fish at native 1x resolution.
// ---------------------------------------------------------------------------
const BW = 72, BH = 56;
let scratchCanvas = null;
let scratch = null;
function getScratch() {
  if (!scratch) {
    scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = BW; scratchCanvas.height = BH;
    scratch = scratchCanvas.getContext('2d');
  }
  return scratch;
}

function rasterFish(cfg, t, silhouette) {
  const c = getScratch();
  c.clearRect(0, 0, BW, BH);
  const ox = BW >> 1, oy = BH >> 1;

  const col = (k, fallback) => silhouette ? silhouette : (cfg[k] || fallback);
  const set = (lx, ly, color, alpha) => {
    if (lx < 0 || ly < 0 || lx >= BW || ly >= BH) return;
    if (alpha !== 1 && alpha !== undefined) c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(ox + lx, oy + ly, 1, 1);
    if (alpha !== 1 && alpha !== undefined) c.globalAlpha = 1;
  };
  const ell = (cx, cy, rx, ry, color, alpha, cond) => {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (d <= 1.0) {
          if (cond && !cond(x + cx, y + cy)) continue;
          set(cx + x, cy + y, color, alpha);
        }
      }
    }
  };
  const tri = (x1, y1, x2, y2, x3, y3, color, alpha) => {
    const minX = Math.min(x1, x2, x3), maxX = Math.max(x1, x2, x3);
    const minY = Math.min(y1, y2, y3), maxY = Math.max(y1, y2, y3);
    const sign = (ax, ay, bx, by, px, py) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d1 = sign(x1, y1, x2, y2, x, y);
        const d2 = sign(x2, y2, x3, y3, x, y);
        const d3 = sign(x3, y3, x1, y1, x, y);
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(hasNeg && hasPos)) set(x, y, color, alpha);
      }
    }
  };

  const L = cfg.L, H = cfg.H;
  const body = col('body', '#888');
  const belly = col('belly', '#ccc');
  const fin = col('fin', '#666');
  const outline = col('outline', '#222');

  // ---- Ancient aura -------------------------------------------------------
  if (cfg.special === 'ancient' && !silhouette) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.0);
    for (let i = 5; i >= 1; i--) {
      const rr = L + 4 + i * 2;
      const rh = H + 4 + i * 2;
      const a = 0.05 + (5 - i) * 0.012;
      const hue = i % 2 === 0 ? '#8ef0dc' : '#c05fe0';
      ell(0, 0, rr + pulse * 1.2, rh + pulse, hue, a);
    }
  }

  // ---- Tail / fins (behind body) -----------------------------------------
  const tailSpread = H + 2 + (cfg.longfins ? 3 : 0);
  tri(-L + 1, 0, -L - 2, -tailSpread, -L - 2, tailSpread, fin);
  if (cfg.longfins) {
    tri(-L + 1, 1, -L - 5, 2, -L - 1, 5, fin, 0.85);
    tri(-L + 1, -1, -L - 5, -2, -L - 1, -5, fin, 0.85);
  }
  if (cfg.tendrils) {
    for (let i = -1; i <= 1; i++) {
      tri(-L + 1, i, -L - 7, i * 3, -L - 1, i * 3 + 1, cfg.fin, 0.8);
    }
  }

  // ---- Body --------------------------------------------------------------
  ell(0, 0, L, H, body);

  // Dorsal fin
  if (cfg.spiny) {
    for (let x = -3; x <= 7; x++) {
      const h = H - 2 + ((x * x) % 3);
      for (let y = -H - 1; y <= -H + h - (H - 1); y++) set(x, y, fin);
    }
    for (let x = -4; x <= 8; x += 2) set(x, -H - 3, fin);
  } else {
    tri(-3, -H + 1, 2, -H - 4, 6, -H + 1, fin);
  }

  // Pectoral fin
  tri(3, H - 3, 6, H + 3, 9, H - 2, fin, 0.95);

  // Belly
  ell(-1, 2, L - 2, Math.max(1, H - 2), belly, 1, (x, y) => y >= 1);

  // ---- Patterns ----------------------------------------------------------
  if (cfg.pattern === 'spots') {
    const spots = [[-5, -1], [-1, 2], [3, -2], [6, 1], [-3, 3], [1, 0], [8, -1], [-7, 2]];
    for (const [sx, sy] of spots) set(sx, sy, cfg.spot);
  } else if (cfg.pattern === 'stripes') {
    for (let x = -L; x <= L; x++) if (((x + 40) % 3) === 0) for (let y = -H; y <= H - 1; y++) set(x, y, cfg.stripe);
  } else if (cfg.pattern === 'bars') {
    for (let x = -L; x <= L; x++) if (((x + 40) % 4) === 0) for (let y = -H; y <= H - 1; y++) set(x, y, cfg.bar);
  } else if (cfg.pattern === 'scales') {
    for (let y = -H; y <= H; y++) for (let x = -L; x <= L; x++) {
      if (((x + y + 40) % 4) === 0 || ((x - y + 40) % 4) === 0) set(x, y, cfg.scale, 0.55);
    }
  } else if (cfg.pattern === 'glowline') {
    for (let x = -L; x <= L; x++) set(x, -1, cfg.line, 0.7);
    set(-3, -H + 1, cfg.line); set(2, -H + 1, cfg.line);
  } else if (cfg.pattern === 'koi') {
    const patches = [[-4, -1, 3], [2, 1, 3], [6, -2, 2], [-8, 2, 2]];
    for (const [px, py, pr] of patches) ell(px, py, pr, pr, cfg.patch);
  } else if (cfg.pattern === 'lightning') {
    for (let y = -H; y <= H; y++) {
      const bx = ((y + 40) % 5) - 2 + (y % 2 ? 1 : 0);
      set(bx, y, cfg.bolt); set(bx + 1, y, cfg.bolt);
    }
  } else if (cfg.pattern === 'facet') {
    for (let y = -H; y <= H; y++) for (let x = -L; x <= L; x++) {
      const d = (x * x) / (L * L) + (y * y) / (H * H);
      if (d < 0.55 && ((x - y + 40) % 3) === 0) set(x, y, cfg.facet, 0.6);
    }
  } else if (cfg.pattern === 'ember') {
    const embers = [[-9, 1], [-5, -2], [0, 2], [4, -1], [8, 2], [-2, -1], [10, 0], [6, 2]];
    for (const [ex, ey] of embers) {
      set(ex, ey, cfg.ember); set(ex, ey - 1, cfg.ember, 0.5); set(ex + 1, ey, cfg.ember, 0.5);
    }
    for (let x = -L; x <= L; x++) if (((x + 40) % 3) === 0) set(x, -H + 1, outline);
  } else if (cfg.pattern === 'trout') {
    for (let x = -L; x <= L; x++) if (((x + 40) % 6) === 0) set(x, 0, cfg.band);
    const spk = [[-7, -2], [-3, 1], [1, -3], [5, 0], [9, -1], [-5, 2], [3, 3]];
    for (const [sx, sy] of spk) set(sx, sy, cfg.speck);
  } else if (cfg.pattern === 'runes') {
    const runes = [[-9, 0], [-5, -2], [-1, 2], [3, -1], [7, 1], [10, -2]];
    for (const [rx, ry] of runes) {
      set(rx, ry, cfg.rune); set(rx + 1, ry, cfg.rune, 0.7);
      set(rx, ry - 1, cfg.rune, 0.7); set(rx, ry + 1, cfg.rune, 0.7);
    }
    ell(0, 0, L - 4, H - 3, cfg.rune, 0.08);
  } else if (cfg.pattern === 'spirit') {
    for (let y = -H; y <= H; y++) for (let x = -L; x <= L; x++) {
      const d = (x * x) / (L * L) + (y * y) / (H * H);
      if (d < 0.35) set(x, y, cfg.core, 0.7);
    }
    for (let x = -L; x <= L; x += 3) set(x, H - 1, cfg.core, 0.4);
  }

  // ---- Head details ------------------------------------------------------
  // Gill line
  if (!silhouette) {
    for (let y = -2; y <= 2; y++) set(L - 4, y, outline, 0.5);
  }
  // Eye
  if (!silhouette) {
    const ex = L - 3, ey = -1;
    set(ex, ey, '#f4f4ec');
    if (cfg.special === 'ancient') {
      set(ex, ey, cfg.eye || '#8ef0ff');
      set(ex - 1, ey, cfg.eye || '#8ef0ff', 0.6);
    } else {
      set(ex, ey, cfg.eye || '#111');
      set(ex - 1, ey, '#f4f4ec');
    }
  }

  // ---- Whiskers ----------------------------------------------------------
  if (cfg.whiskers && !silhouette) {
    for (let i = 0; i < 4; i++) { set(L - 1 + i, 2 + Math.floor(i / 2), outline); }
    for (let i = 0; i < 4; i++) { set(L - 1 + i, 3 + Math.floor(i / 2) + 1, outline); }
  }

  // ---- Outline pass ------------------------------------------------------
  if (!silhouette) {
    const mask = new Set();
    const key = (x, y) => x + ',' + y;
    for (let y = -H - 6; y <= H + 6; y++) {
      for (let x = -L - 8; x <= L + 8; x++) {
        const d = (x * x) / (L * L) + (y * y) / (H * H);
        if (d <= 1.0) mask.add(key(x, y));
      }
    }
    // collect edge pixels first, then paint so outlines don't domino
    const edges = [];
    for (const k of mask) {
      const [x, y] = k.split(',').map(Number);
      if (!mask.has(key(x + 1, y)) || !mask.has(key(x - 1, y)) || !mask.has(key(x, y + 1)) || !mask.has(key(x, y - 1))) {
        edges.push([x, y]);
      }
    }
    for (const [x, y] of edges) set(x, y, outline);
  }
}

export function drawFish(ctx, cfg, cx, cy, s, t, silhouette) {
  rasterFish(cfg, t, silhouette);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratchCanvas, 0, 0, BW, BH, Math.round(cx - (BW >> 1) * s), Math.round(cy - (BH >> 1) * s), BW * s, BH * s);
}
