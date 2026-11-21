// Rarity system + original fish species + procedural pixel-art fish renderer.
// All art is generated from code primitives. No image assets.

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

// Odds: 45 / 25 / 15 / 8 / 5 / 2
const CUTS = [0.45, 0.70, 0.85, 0.93, 0.98, 1.0];
export function pickRarity(u) {
  if (!(u >= 0 && u < 1)) u = 0;
  for (let i = 0; i < CUTS.length; i++) if (u < CUTS[i]) return RARITIES[i];
  return RARITIES[RARITIES.length - 1];
}

export const RARITY_STYLE = {
  Common:    { main: '#d8d2c4', trim: '#8d8778', glow: '#d8d2c4' },
  Uncommon:  { main: '#7fd18a', trim: '#3f8a4c', glow: '#7fd18a' },
  Rare:      { main: '#68b6ff', trim: '#2f6bb0', glow: '#68b6ff' },
  Epic:      { main: '#c58cff', trim: '#7a41c0', glow: '#c58cff' },
  Legendary: { main: '#ffce55', trim: '#c9871f', glow: '#ffce55' },
  Ancient:   { main: '#6ff0d8', trim: '#1f8f86', glow: '#6ff0d8' },
};

export const RARITY_ODDS = {
  Common: '45%', Uncommon: '25%', Rare: '15%', Epic: '8%', Legendary: '5%', Ancient: '2%',
};

export const SPECIES = [
  // ---- Common ----
  { id: 'sunfin', name: 'Sunfin Minnow', rarity: 'Common', len: 22, h: 11,
    body: '#f0b53c', belly: '#ffe9a8', fin: '#e2872c', accent: '#fff0c0', outline: '#5a3a1e',
    tail: 'fan', pattern: 'none', eye: 'dark' },
  { id: 'reedcarp', name: 'Reed Carp', rarity: 'Common', len: 28, h: 14,
    body: '#8f9a4e', belly: '#d9d79a', fin: '#6f7a38', accent: '#5f6a2c', outline: '#3c421f',
    tail: 'fan', pattern: 'none', whiskers: true, eye: 'dark' },
  { id: 'smelt', name: 'Puddle Smelt', rarity: 'Common', len: 21, h: 9,
    body: '#9fb7c9', belly: '#e8f1f6', fin: '#7691a6', accent: '#cfe0ea', outline: '#46586a',
    tail: 'fork', pattern: 'none', eye: 'dark' },
  // ---- Uncommon ----
  { id: 'bluegill', name: 'Bluegill Dusk', rarity: 'Uncommon', len: 25, h: 15,
    body: '#4f6fc0', belly: '#cdd8f2', fin: '#3b539a', accent: '#8fb0ff', outline: '#26305c',
    tail: 'fan', pattern: 'spots', eye: 'dark' },
  { id: 'copper', name: 'Copper Perch', rarity: 'Uncommon', len: 27, h: 13,
    body: '#cf8a44', belly: '#f2d9ab', fin: '#a5642b', accent: '#7a3f1b', outline: '#4d2c14',
    tail: 'fan', pattern: 'stripes', eye: 'dark' },
  { id: 'guppy', name: 'Tide Guppy', rarity: 'Uncommon', len: 18, h: 11,
    body: '#3fb6a8', belly: '#d6fff4', fin: '#ff8fb0', accent: '#ffd0e0', outline: '#245a57',
    tail: 'fan', pattern: 'spots', eye: 'dark', bigTail: true },
  // ---- Rare ----
  { id: 'embertrout', name: 'Emberfin Trout', rarity: 'Rare', len: 34, h: 14,
    body: '#d95a3a', belly: '#ffd9b0', fin: '#a83820', accent: '#ffd86b', outline: '#5c2214',
    tail: 'fan', pattern: 'spots', eye: 'dark' },
  { id: 'moonbass', name: 'Moonlit Bass', rarity: 'Rare', len: 37, h: 16,
    body: '#9fc4dd', belly: '#eef8ff', fin: '#6f97b4', accent: '#4d6f96', outline: '#33475c',
    tail: 'fan', pattern: 'stripes', eye: 'dark' },
  { id: 'glassherring', name: 'Glass Herring', rarity: 'Rare', len: 33, h: 10,
    body: '#bfeee0', belly: '#f4fffb', fin: '#8fd6c6', accent: '#e8fff8', outline: '#4f8f86',
    tail: 'fork', pattern: 'none', eye: 'dark', translucent: true },
  // ---- Epic ----
  { id: 'stormmarlin', name: 'Stormscale Marlin', rarity: 'Epic', len: 46, h: 14,
    body: '#3a4f78', belly: '#9fb4d6', fin: '#2b3b5c', accent: '#7fe0ff', outline: '#1a2438',
    tail: 'fork', pattern: 'stripes', eye: 'light', bill: true, glow: '#7fd0ff' },
  { id: 'arowana', name: 'Gilded Arowana', rarity: 'Epic', len: 44, h: 12,
    body: '#e6b93c', belly: '#fff0b0', fin: '#c98d1f', accent: '#fff3c0', outline: '#6b4a12',
    tail: 'fan', pattern: 'plates', eye: 'dark', glow: '#ffd75e' },
  { id: 'thunderkoi', name: 'Thunder Koi', rarity: 'Epic', len: 38, h: 16,
    body: '#f2f2f2', belly: '#ffffff', fin: '#dfe6ef', accent: '#3f6fbf', outline: '#4a4f5c',
    tail: 'fan', pattern: 'patches', eye: 'dark', glow: '#9fbcff' },
  // ---- Legendary ----
  { id: 'coralsov', name: 'Coral Sovereign', rarity: 'Legendary', len: 42, h: 20,
    body: '#ff7f9f', belly: '#ffe0e8', fin: '#e0557a', accent: '#ffd76b', outline: '#7a2540',
    tail: 'fan', pattern: 'spots', eye: 'light', ornate: true, glow: '#ff9fc0' },
  { id: 'aurora', name: 'Aurora Sturgeon', rarity: 'Legendary', len: 48, h: 16,
    body: '#6fd8d0', belly: '#d8fffb', fin: '#5a86c0', accent: '#c78fff', outline: '#2f5a66',
    tail: 'fork', pattern: 'plates', eye: 'light', scutes: true, glow: '#a8f0e8' },
  // ---- Ancient ----
  { id: 'coelacanth', name: 'Primordial Coelacanth', rarity: 'Ancient', len: 46, h: 18,
    body: '#4f7f88', belly: '#a8d8d0', fin: '#3a5f68', accent: '#7fffe0', outline: '#1c3a42',
    tail: 'fan', pattern: 'plates', eye: 'rune', lobed: true, runes: true, glow: '#6ff0d8' },
  { id: 'leviathan', name: 'Leviathan Shard', rarity: 'Ancient', len: 50, h: 18,
    body: '#2a3550', belly: '#5c7ba8', fin: '#1c2740', accent: '#8ff0ff', outline: '#101828',
    tail: 'whip', pattern: 'none', eye: 'rune', crystal: true, runes: true, glow: '#8ff0ff' },
];

export function speciesByRarity(rarity) {
  const list = SPECIES.filter(s => s.rarity === rarity);
  return list.length ? list : SPECIES.filter(s => s.rarity === 'Common');
}

export function rollSpecies(rarity, rand = Math.random) {
  const list = speciesByRarity(rarity);
  return list[Math.floor(rand() * list.length) % list.length];
}

// ---------------------------------------------------------------------------
// Procedural pixel fish renderer.
// Draws into `ctx` with the fish centred at (cx, cy). `s` = size of one art
// pixel in destination px. `t` = time (seconds) for gentle motion.
// ---------------------------------------------------------------------------
export function drawFish(ctx, sp, cx, cy, s = 4, t = 0) {
  s = Math.max(1, Math.round(s));
  const R = makePainter(ctx, cx, cy, s);
  const P = makePoly(R);
  const rx = sp.len / 2, ry = sp.h / 2;
  const sway = Math.sin(t * 2.2) * 0.9;      // tail sway in art px
  const bob = Math.sin(t * 1.5) * 0.5;
  const cx0 = 0, cy0 = bob;

  // Soft aura behind rare fish.
  if (sp.glow) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.16 * pulse;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.95 * s);
    g.addColorStop(0, sp.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rx * 0.95 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const ox = cx0, oy = cy0;

  // --- Tail ---
  const tailLen = (sp.bigTail ? ry * 1.7 : ry * 1.15);
  if (sp.tail === 'fan') {
    P([[ox - rx + 1, oy - ry * 0.55], [ox - rx - tailLen, oy - ry * 1.05 + sway], [ox - rx - tailLen, oy + ry * 1.05 + sway], [ox - rx + 1, oy + ry * 0.55]], sp.fin);
  } else if (sp.tail === 'fork') {
    P([[ox - rx + 1, oy - ry * 0.5], [ox - rx - tailLen, oy - ry * 1.1 + sway], [ox - rx - tailLen * 0.45, oy], [ox - rx - tailLen, oy + ry * 1.1 + sway], [ox - rx + 1, oy + ry * 0.5]], sp.fin);
  } else { // whip
    P([[ox - rx + 1, oy - ry * 0.35], [ox - rx - tailLen * 1.4, oy - 1 + sway], [ox - rx - tailLen * 1.4, oy + 1 + sway], [ox - rx + 1, oy + ry * 0.35]], sp.fin);
    P([[ox - rx - tailLen * 0.4, oy - ry * 0.6], [ox - rx - tailLen * 0.9, oy - ry * 1.3 + sway], [ox - rx - tailLen * 1.0, oy - ry * 0.1]], sp.body);
  }

  // --- Dorsal fin ---
  if (sp.ornate) {
    P([[ox - rx * 0.35, oy - ry + 1], [ox - rx * 0.15, oy - ry - 5], [ox + rx * 0.05, oy - ry - 2], [ox + rx * 0.15, oy - ry - 6], [ox + rx * 0.35, oy - ry + 1]], sp.fin);
  } else {
    const dh = sp.crystal ? 6 : (sp.scutes ? 3 : 4);
    P([[ox - rx * 0.30, oy - ry + 1], [ox - rx * 0.05, oy - ry - dh], [ox + rx * 0.20, oy - ry + 1]], sp.fin);
  }
  // Anal fin (bottom)
  P([[ox - rx * 0.15, oy + ry - 1], [ox + rx * 0.05, oy + ry + 3], [ox + rx * 0.25, oy + ry - 1]], sp.fin);

  // --- Body (outline then fill) ---
  ellipse(R, ox, oy, rx + 1, ry + 1, sp.outline);
  ellipse(R, ox, oy, rx, ry, sp.body);
  // belly
  ellipseHalf(R, ox, oy + ry * 0.18, rx * 0.94, ry * 0.72, sp.belly, +1);

  // --- Patterns ---
  if (sp.pattern === 'spots') {
    const spots = [[-0.45, -0.25], [-0.15, -0.4], [0.15, -0.1], [0.35, -0.35], [-0.05, 0.3], [0.4, 0.25], [-0.5, 0.2]];
    for (const [fx, fy] of spots) {
      const x = ox + fx * rx, y = oy + fy * ry;
      if (inEllipse(x - ox, y - oy, rx * 0.98, ry * 0.98)) R(x - 1, y - 1, 2, 2, sp.accent);
    }
  } else if (sp.pattern === 'stripes') {
    for (let i = -2; i <= 2; i++) {
      const x = ox + i * rx * 0.32;
      for (let y = -ry; y <= ry; y++) {
        if (inEllipse(x - ox, y, rx * 0.96, ry * 0.96)) R(x - 1, y, 2, 1, sp.accent);
      }
    }
  } else if (sp.pattern === 'plates') {
    for (let i = -3; i <= 3; i++) {
      const x = ox + i * rx * 0.22;
      for (let y = -ry * 0.5; y <= ry * 0.5; y += 2) {
        if (inEllipse(x - ox, y, rx * 0.9, ry * 0.9)) R(x, y, 2, 1, sp.accent);
      }
    }
  } else if (sp.pattern === 'patches') {
    P([[ox - rx * 0.6, oy - ry * 0.7], [ox - rx * 0.1, oy - ry * 0.9], [ox - rx * 0.2, oy - ry * 0.1], [ox - rx * 0.7, oy - ry * 0.0]], sp.accent);
    P([[ox + rx * 0.15, oy + ry * 0.1], [ox + rx * 0.6, oy + ry * 0.0], [ox + rx * 0.5, oy + ry * 0.7], [ox + rx * 0.1, oy + ry * 0.6]], sp.accent);
  }

  // --- Ancient runes ---
  if (sp.runes) {
    const runePulse = 0.55 + 0.45 * Math.sin(t * 3.2);
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.5 * runePulse;
    const marks = [[-0.45, 0, 2, 4], [-0.2, -0.35, 4, 2], [0.05, 0.15, 2, 5], [0.3, -0.2, 4, 2], [-0.05, -0.5, 2, 2]];
    for (const [fx, fy, w, h] of marks) {
      const x = ox + fx * rx, y = oy + fy * ry;
      if (inEllipse(x - ox, y - oy, rx * 0.85, ry * 0.85)) R(x, y, w, h, sp.accent);
    }
    ctx.restore();
  }

  // --- Crystal shards (Leviathan) ---
  if (sp.crystal) {
    const glint = 0.6 + 0.4 * Math.sin(t * 4);
    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * glint;
    P([[ox - rx * 0.55, oy - ry + 1], [ox - rx * 0.45, oy - ry - 7], [ox - rx * 0.35, oy - ry + 1]], '#bff4ff');
    P([[ox + rx * 0.1, oy - ry + 1], [ox + rx * 0.22, oy - ry - 9], [ox + rx * 0.34, oy - ry + 1]], '#dfffff');
    P([[ox + rx * 0.55, oy - ry * 0.2], [ox + rx * 0.75, oy - ry * 0.9], [ox + rx * 0.8, oy + ry * 0.1]], '#9fe8ff');
    ctx.restore();
  }

  // --- Lobed fins (coelacanth) ---
  if (sp.lobed) {
    P([[ox - rx * 0.2, oy + ry * 0.4], [ox + rx * 0.25, oy + ry * 1.6], [ox + rx * 0.5, oy + ry * 0.5]], sp.fin);
    P([[ox - rx * 0.3, oy - ry * 0.3], [ox - rx * 0.05, oy - ry * 1.5], [ox + rx * 0.15, oy - ry * 0.6]], sp.fin);
  } else {
    // pectoral fin
    P([[ox + rx * 0.15, oy + ry * 0.15], [ox + rx * 0.55, oy + ry * 0.85], [ox + rx * 0.62, oy + ry * 0.25]], sp.fin);
  }

  // --- Bill / snout ---
  if (sp.bill) {
    P([[ox + rx - 1, oy - 1.2], [ox + rx + 9, oy - 0.6], [ox + rx + 9, oy + 0.6], [ox + rx - 1, oy + 1.2]], sp.outline);
  }

  // --- Whiskers ---
  if (sp.whiskers) {
    R(ox + rx - 1, oy + 2, 5, 1, sp.outline);
    R(ox + rx + 3, oy + 3, 3, 1, sp.outline);
  }

  // --- Gill line ---
  for (let y = -ry * 0.6; y <= ry * 0.6; y++) {
    if (inEllipse(ox + rx * 0.38 - ox, y, rx * 0.96, ry * 0.96)) R(ox + rx * 0.38, oy + y, 1, 1, sp.outline);
  }

  // --- Eye ---
  const ex = ox + rx * 0.62, ey = oy - ry * 0.25;
  if (sp.eye === 'light') {
    R(ex - 1, ey - 1, 4, 4, '#ffffff');
    R(ex, ey, 2, 2, '#d03030');
    R(ex, ey, 1, 1, '#101010');
    R(ex - 1, ey - 2, 1, 1, '#ffffff');
  } else if (sp.eye === 'rune') {
    const gl = 0.5 + 0.5 * Math.sin(t * 3.5);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * gl;
    R(ex - 1, ey - 1, 4, 4, sp.glow);
    ctx.restore();
    R(ex, ey, 2, 2, '#ffffff');
    R(ex, ey, 1, 1, '#08202a');
  } else {
    R(ex - 1, ey - 1, 4, 4, '#ffffff');
    R(ex, ey, 2, 2, '#141414');
    R(ex + 1, ey - 1, 1, 1, '#ffffff');
  }

  // --- Mouth ---
  R(ox + rx - 1, oy + ry * 0.35, 3, 1, sp.outline);

  // --- Translucent shimmer ---
  if (sp.translucent) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = -3; i <= 3; i++) {
      R(ox - 2 + i * 2, oy - ry * 0.35, 1, 3, '#ffffff');
    }
    ctx.restore();
  }

  // --- Scutes (sturgeon ridges) ---
  if (sp.scutes) {
    for (let i = -2; i <= 2; i++) {
      const x = ox + i * rx * 0.3;
      if (inEllipse(x - ox, -ry * 0.1, rx * 0.96, ry * 0.96)) R(x, oy - ry * 0.75, 2, 2, sp.accent);
    }
  }
}

// ----- helpers -----
function makePainter(ctx, cx, cy, s) {
  return (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  };
}
function makePoly(R) {
  return (pts, color) => {
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const [x, y] of pts) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
      for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++) {
        if (pointInPoly(x + 0.5, y + 0.5, pts)) R(x, y, 1, 1, color);
      }
    }
  };
}
function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function ellipse(R, cx, cy, rx, ry, c) {
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const hw = rx * Math.sqrt(t);
    R(cx - hw, cy + y, hw * 2, 1, c);
  }
}
// Lower half of an ellipse, slightly narrowed.
function ellipseHalf(R, cx, cy, rx, ry, c, dir) {
  for (let y = 0; y <= Math.ceil(ry); y += 1) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const hw = rx * Math.sqrt(t);
    R(cx - hw, cy + y * dir, hw * 2, 1, c);
  }
}
function inEllipse(x, y, rx, ry) {
  return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
}
