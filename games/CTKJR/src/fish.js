// Procedural pixel-art fish. Each species is described by parameters and drawn
// from code, so every fish is original and asset-free.

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export const SPECIES = {
  Common: [
    {
      name: 'Pebblefin', len: 18, hgt: 8, shape: 'torpedo',
      body: '#93a07c', body2: '#727e5c', belly: '#cfd6b2', fin: '#6f7d5c', outline: '#3d4534',
      pattern: 'speck', eye: '#241f18', speed: 3.2,
    },
    {
      name: 'Sunbelly Minnow', len: 16, hgt: 7, shape: 'round',
      body: '#d9a44a', body2: '#b57f2f', belly: '#f4dd97', fin: '#c58f35', outline: '#5c4014',
      pattern: 'stripe', eye: '#241f18', speed: 3.6,
    },
  ],
  Uncommon: [
    {
      name: 'Fern Tail', len: 20, hgt: 9, shape: 'torpedo',
      body: '#4f9a5a', body2: '#357040', belly: '#c2e2a2', fin: '#2f6b3f', outline: '#1e4527',
      pattern: 'spot', eye: '#f0e6a0', speed: 3.0, tail: { len: 9, h: 10 },
    },
    {
      name: 'Copper Perch', len: 22, hgt: 11, shape: 'torpedo',
      body: '#c26a33', body2: '#8f4a1e', belly: '#eab377', fin: '#8a4318', outline: '#4a2410',
      pattern: 'stripe', eye: '#f0d060', speed: 3.4, dorsal: { h: 6, x: 0 },
    },
  ],
  Rare: [
    {
      name: 'Moon Gill', len: 24, hgt: 11, shape: 'round',
      body: '#b9cfe0', body2: '#8099b5', belly: '#f2f8ff', fin: '#7fa3c4', outline: '#445a75',
      pattern: 'grad', eye: '#e8f4ff', speed: 2.6, mark: '#e8f4ff',
    },
    {
      name: 'Tide Dancer', len: 22, hgt: 12, shape: 'round',
      body: '#2f9a9a', body2: '#1f6e72', belly: '#a8e6d8', fin: '#6fd0c0', outline: '#14484e',
      pattern: 'spot', eye: '#f2f2f2', speed: 2.8, dorsal: { h: 8, x: 1 }, tail: { len: 10, h: 12 },
    },
  ],
  Epic: [
    {
      name: 'Ember Koi', len: 24, hgt: 12, shape: 'round',
      body: '#e0562f', body2: '#b3371a', belly: '#ffd08a', fin: '#ff9a4a', outline: '#5c1a0e',
      pattern: 'koi', eye: '#241f18', speed: 2.6, whiskers: true,
    },
    {
      name: 'Storm Ray', len: 27, hgt: 15, shape: 'flat',
      body: '#6a5ac0', body2: '#40358a', belly: '#b0a6ea', fin: '#4a3f8a', outline: '#241c50',
      pattern: 'spot', eye: '#e8e0ff', speed: 2.2, dorsal: { h: 9, x: 0 }, tail: { len: 13, h: 8 },
    },
  ],
  Legendary: [
    {
      name: 'Aurora Pike', len: 31, hgt: 12, shape: 'long',
      body: '#2fb5a0', body2: '#8a4fc0', belly: '#d8fff2', fin: '#5fd0c0', outline: '#1a4a58',
      pattern: 'shimmer', eye: '#f0ffe8', speed: 2.2, glow: '#4fe0c8', whiskers: true,
    },
    {
      name: 'Crown Sturgeon', len: 30, hgt: 15, shape: 'long',
      body: '#8a8f7a', body2: '#5f6450', belly: '#dedfc6', fin: '#6f745c', outline: '#33362a',
      pattern: 'scute', eye: '#f0d060', speed: 2.0, whiskers: true, crown: true,
    },
  ],
  Ancient: [
    {
      name: 'Leviathan Whelp', len: 34, hgt: 17, shape: 'long',
      body: '#2b5560', body2: '#173840', belly: '#5fd0c0', fin: '#3f9a90', outline: '#0d2228',
      pattern: 'rune', eye: '#7ef0d8', speed: 1.6, glow: '#4fe0d0', rune: '#7ef0d8', whiskers: true, dorsal: { h: 8, x: 0 },
    },
    {
      name: 'Hollowscale', len: 29, hgt: 15, shape: 'long',
      body: '#4a3a68', body2: '#2c2244', belly: '#9a86c8', fin: '#6a54a0', outline: '#150f28',
      pattern: 'ribs', eye: '#d8c8ff', speed: 1.8, glow: '#a98cf0', spectral: true, ribs: '#c8b8f0',
    },
  ],
};

export function speciesByRarity(r) {
  return SPECIES[r] || SPECIES.Common;
}

export function pickSpecies(rarity, rand = Math.random) {
  const list = speciesByRarity(rarity);
  return list[Math.floor(rand() * list.length) % list.length];
}

// Draw a fish centred at (cx,cy). S = pixel block size (1 in the low-res scene,
// 5 on the 1280x720 overlay). The fish faces right.
export function drawFish(ctx, f, cx, cy, S, t, opts = {}) {
  const alpha = opts.alpha == null ? 1 : opts.alpha;
  const xSnap = Math.round(cx / S) * S;
  const ySnap = Math.round(cy / S) * S;
  const hw = Math.round(f.len / 2);
  const hh = Math.round(f.hgt / 2);
  const sway = Math.sin(t * (f.speed || 3)) * 0.5;
  const outline = f.outline || '#20242a';

  const put = (x, y, color, a = 1) => {
    if (color == null) return;
    ctx.globalAlpha = alpha * a;
    ctx.fillStyle = color;
    ctx.fillRect(xSnap + x * S, ySnap + y * S, S, S);
  };

  const profile = (xn) => {
    const a = Math.max(0, 1 - xn * xn);
    switch (f.shape) {
      case 'round': return Math.pow(a, 0.5);
      case 'long': return Math.pow(a, 0.38);
      case 'flat': return Math.pow(a, 0.65);
      default: return Math.pow(a, 0.55);
    }
  };

  // ---- glow behind the body (Legendary / Ancient) ----
  if (f.glow) {
    for (let x = -hw - 2; x <= hw + 2; x++) {
      const xn = x / (hw + 2);
      const gh = Math.round((hh + 2) * profile(xn));
      for (let y = -gh; y <= gh; y++) {
        const edge = Math.max(0, 1 - (Math.abs(y) / (gh + 1))) * Math.max(0, 1 - Math.abs(xn));
        if (edge < 0.15) continue;
        put(x, y, f.glow, 0.18 * (0.6 + 0.4 * Math.sin(t * 3 + x * 0.5)));
      }
    }
  }

  // ---- tail ----
  const tailLen = f.tail ? f.tail.len : Math.round(hw * 0.55) + 3;
  const tailH = f.tail ? f.tail.h : Math.round(hh * 0.9) + 1;
  for (let i = 0; i <= tailLen; i++) {
    const p = i / tailLen;
    const x = -hw - i;
    const wave = Math.round(sway * (1 + p * 2));
    let th = Math.round(tailH * (0.25 + 0.75 * p));
    for (let y = -th; y <= th; y++) {
      // notch the trailing edge for a forked look on slim fish
      if (!f.tail && p > 0.45 && Math.abs(y) < th * 0.45) continue;
      const edge = Math.abs(y) >= th ? outline : null;
      put(x + wave, y, edge || f.fin);
    }
  }

  // ---- dorsal fin ----
  if (f.dorsal) {
    const dx = (f.dorsal.x || 0);
    const dh = f.dorsal.h;
    for (let i = 0; i <= dh; i++) {
      const x = dx - 2 + Math.round(i * 1.1);
      const top = -hh - (dh - i);
      for (let y = top; y < -hh + 1; y++) {
        put(x + Math.round(sway * 0.3), y, y === top ? outline : f.fin);
      }
    }
  }

  // ---- body ----
  for (let x = -hw; x <= hw; x++) {
    const xn = x / hw;
    const prof = profile(xn);
    let top = -Math.round(hh * prof);
    let bot = Math.round(hh * prof);
    if (x === hw) bot = top + 1; // pointed snout
    for (let y = top; y <= bot; y++) {
      let c = f.body;
      const yn = (y - top) / Math.max(1, (bot - top));
      // top shading
      if (yn < 0.35) c = f.body2;
      // belly
      if (yn > 0.62) c = f.belly;
      // outline
      if (y === top || y === bot) c = outline;

      // ---- pattern ----
      if (y !== top && y !== bot) {
        const pat = f.pattern;
        if (pat === 'stripe' && ((x + 100) % 6) < 2) c = f.body2;
        else if (pat === 'spot' && hash(x, y) > 0.78) c = f.body2;
        else if (pat === 'speck' && hash(x * 2, y * 2) > 0.86) c = f.body2;
        else if (pat === 'grad' && yn < 0.5 && hash(x, y) > 0.5) c = f.belly;
        else if (pat === 'koi') {
          if (hash(x * 0.6, y * 0.6) > 0.62) c = '#f4f0e8';
          if (hash(x * 0.3 + 5, y * 0.3) > 0.86) c = '#2a2a2a';
        } else if (pat === 'shimmer') {
          if (((x + Math.round(t * 20)) % 8) < 3) c = f.belly;
        } else if (pat === 'scute' && ((x + 100) % 5) < 2 && yn < 0.45) c = f.body2;
        else if (pat === 'rune' && Math.abs(x % 7) < 1) c = f.rune;
        else if (pat === 'ribs' && ((x + 100) % 6) < 1) c = f.ribs;
      }
      put(x, y, c);
    }
  }

  // ---- crescent mark (Moon Gill) ----
  if (f.mark) {
    for (let i = 0; i < 5; i++) {
      put(2 + i, -3 + i, f.mark);
      put(2 + i, 3 - i, f.mark);
    }
  }

  // ---- rune glyphs (Ancient) ----
  if (f.rune) {
    const gx = [-9, -2, 5];
    for (const g of gx) {
      const pul = 0.5 + 0.5 * Math.sin(t * 4 + g);
      put(g, 0, f.rune, 0.4 + pul * 0.6);
      put(g - 1, -1, f.rune, 0.4 + pul * 0.6);
      put(g + 1, -1, f.rune, 0.4 + pul * 0.6);
      put(g, -2, f.rune, 0.4 + pul * 0.6);
    }
  }

  // ---- crown (Sturgeon) ----
  if (f.crown) {
    const cx0 = hw - 6;
    for (let i = 0; i < 5; i++) {
      const col = i % 2 === 0 ? '#f0d060' : '#c9a030';
      put(cx0 + i, -hh - (i % 2 === 0 ? 2 : 3), col);
      put(cx0 + i, -hh - 1, col);
    }
  }

  // ---- pectoral fin ----
  put(hw - 6, 1, f.fin);
  put(hw - 7, 2, f.fin);
  put(hw - 8, 3, f.fin);

  // ---- eye ----
  const ex = hw - 4, ey = -1;
  put(ex, ey - 1, f.eye || '#f0f0f0');
  put(ex, ey, f.eye || '#f0f0f0');
  put(ex - 1, ey, outline);
  put(ex + 1, ey, outline);
  put(ex, ey + 1, outline);
  put(ex - 1, ey - 1, '#ffffff', 0.9);

  // ---- whiskers ----
  if (f.whiskers) {
    put(hw, 2, outline); put(hw + 1, 3, outline); put(hw + 2, 3, outline);
    put(hw, 3, outline); put(hw + 1, 4, outline);
  }

  // ---- spectral afterimages ----
  if (f.spectral) {
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = f.glow;
    for (let k = 1; k <= 2; k++) {
      const ox = -k * 3 - Math.round(Math.sin(t * 2) * 2);
      ctx.fillRect(xSnap - hw * S + ox * S, ySnap - hh * S, f.len * S, f.hgt * S);
    }
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 1;
}
