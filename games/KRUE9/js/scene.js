// scene.js -- all world artwork drawn procedurally on a 320x180 pixel grid.

export const C = {
  waterShallow: '#3f93a3', waterShallow2: '#33808f',
  waterMid: '#276b7c', waterMid2: '#1d596a',
  waterDeep: '#123f52', waterDeepest: '#0d3346',
  foam: '#d8f0ee', foamDim: '#9fd0d2',
  sand: '#e6d29a', sandDark: '#cdb377', sandDarkest: '#b2955c',
  grass: '#4f8a45', grassLight: '#69a94f', grassDark: '#356b39', grassDarkest: '#254f2b',
  dirt: '#b8905f', dirtDark: '#8a6a42',
  wood: '#8a5a35', woodLight: '#a9764a', woodDark: '#5f3d24', woodMid: '#74492b',
  foliageDark: '#24502f', foliage: '#2f6b3a', foliageLight: '#3f8a48', foliageHi: '#57a85c',
  rock: '#8a8f96', rockDark: '#5f646b', rockLight: '#b4b9c0',
  flowerA: '#e06c9f', flowerB: '#f2c14e', flowerC: '#f4f1e0', flowerD: '#9a6fd0',
  trunk: '#5a3f26',
};

// ---------------------------------------------------------------- utilities
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

// shoreline: land is ABOVE this curve
const SHORE = [
  [0, 72], [18, 68], [36, 74], [54, 64], [72, 60], [90, 66], [108, 60],
  [126, 64], [144, 69], [168, 66], [188, 70], [206, 74], [224, 64], [242, 60],
  [260, 62], [278, 54], [298, 52], [320, 56],
];
export function shoreAt(x) {
  x = Math.max(0, Math.min(319, x));
  for (let i = 0; i < SHORE.length - 1; i++) {
    const a = SHORE[i], b = SHORE[i + 1];
    if (x >= a[0] && x <= b[0]) {
      const t = (x - a[0]) / (b[0] - a[0] || 1);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return SHORE[SHORE.length - 1][1];
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// ---------------------------------------------------------------- water base
function buildWater() {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180;
  const c = cv.getContext('2d');
  const stops = [
    [40, C.waterShallow], [44, C.waterShallow2],
    [86, C.waterMid], [99, C.waterMid2],
    [140, C.waterDeep], [160, C.waterDeepest],
  ];
  for (let y = 0; y < 180; y++) {
    // find local two-colour band and dither between them
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length; i++) {
      if (y >= stops[i][0]) { a = stops[i]; b = stops[Math.min(stops.length - 1, i + 1)]; }
    }
    const span = (b[0] - a[0]) || 1;
    const t = Math.max(0, Math.min(1, (y - a[0]) / span));
    const dith = t * 16;
    for (let x = 0; x < 320; x++) {
      const thr = BAYER[y & 3][x & 3];
      px(c, x, y, 1, 1, dith > thr ? b[1] : a[1]);
    }
  }
  // static deep speckle
  const r = mulberry32(99);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * 320), y = 96 + Math.floor(r() * 82);
    if (r() > 0.5) px(c, x, y, 1, 1, C.waterDeepest); else px(c, x, y, 1, 1, C.waterMid2);
  }
  // shoreline light band + foam
  for (let x = 0; x < 320; x++) {
    const sy = shoreAt(x);
    for (let k = 0; k < 4; k++) {
      const y = Math.round(sy) + 1 + k;
      if (y < 180) {
        const col = k === 0 ? C.foam : (k < 2 ? C.waterShallow : C.foamDim);
        if (k < 2 || (x + k * 3) % 5 < 3) px(c, x, y, 1, 1, col);
      }
    }
  }
  return cv;
}

// ---------------------------------------------------------------- land
function canopy(c, x, y, r, rand) {
  // dark base
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy <= r * r) px(c, x + dx, y + dy, 1, 1, C.foliageDark);
  }
  const r2 = r - 2;
  for (let dy = -r2; dy <= r2; dy++) for (let dx = -r2; dx <= r2; dx++) {
    if (dx * dx + dy * dy <= r2 * r2) px(c, x + dx, y + dy, 1, 1, C.foliage);
  }
  const ox = -Math.round(r * 0.32), oy = -Math.round(r * 0.34), r3 = Math.round(r * 0.62);
  for (let dy = -r3; dy <= r3; dy++) for (let dx = -r3; dx <= r3; dx++) {
    if (dx * dx + dy * dy <= r3 * r3) px(c, x + ox + dx, y + oy + dy, 1, 1, C.foliageLight);
  }
  const r4 = Math.round(r * 0.34);
  for (let dy = -r4; dy <= r4; dy++) for (let dx = -r4; dx <= r4; dx++) {
    if (dx * dx + dy * dy <= r4 * r4) px(c, x + ox - 1 + dx, y + oy - 1 + dy, 1, 1, C.foliageHi);
  }
  // leaf texture on rim
  for (let i = 0; i < r * 7; i++) {
    const a = rand() * Math.PI * 2, rad = r - rand() * 2;
    const lx = Math.round(x + Math.cos(a) * rad), ly = Math.round(y + Math.sin(a) * rad);
    px(c, lx, ly, 1, 1, rand() > 0.5 ? C.foliageDark : C.foliageLight);
  }
}

function buildLand() {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180;
  const c = cv.getContext('2d');
  const rand = mulberry32(1337);

  // base fill per column: grass above, sand near the shore
  for (let x = 0; x < 320; x++) {
    const sy = Math.round(shoreAt(x));
    for (let y = 0; y <= sy; y++) {
      let col;
      const sandTop = sy - 7;
      if (y >= sandTop + 1) {
        col = y >= sy - 1 ? C.sandDarkest : (y >= sandTop + 3 ? C.sandDark : C.sand);
      } else if (y >= sandTop - 1) {
        col = ((x + y * 2) & 3) < 2 ? C.sand : C.grassDark;
      } else {
        col = C.grass;
      }
      px(c, x, y, 1, 1, col);
    }
    // dark grass lip
    px(c, x, Math.max(0, sy - 8), 1, 1, C.grassDarkest);
  }

  // grass texture
  for (let i = 0; i < 1800; i++) {
    const x = Math.floor(rand() * 320);
    const sy = shoreAt(x);
    const y = Math.floor(rand() * Math.max(1, sy - 10));
    const t = rand();
    if (t < 0.35) px(c, x, y, 1, 1, C.grassDark);
    else if (t < 0.7) px(c, x, y, 1, 1, C.grassLight);
    else if (t < 0.75) { px(c, x, y, 1, 2, C.grassDarkest); }
  }
  // little grass tufts
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rand() * 320);
    const sy = shoreAt(x);
    const y = Math.floor(rand() * Math.max(1, sy - 14)) + 4;
    const col = rand() > 0.5 ? C.grassLight : C.grassDark;
    px(c, x, y, 1, 1, col); px(c, x - 1, y + 1, 1, 1, col); px(c, x + 1, y + 1, 1, 1, col);
  }
  // sand speckles & pebbles
  for (let i = 0; i < 320; i++) {
    const x = Math.floor(rand() * 320);
    const sy = shoreAt(x);
    const y = Math.round(sy - rand() * 6);
    if (rand() < 0.5) px(c, x, y, 1, 1, C.sandDark);
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * 320);
    const sy = shoreAt(x);
    const y = Math.round(sy - 1 - rand() * 3);
    px(c, x, y, 2, 1, C.rockDark); px(c, x, y - 1, 1, 1, C.rock);
  }

  // dirt path up from the dock
  for (let y = 0; y < 76; y++) {
    const cx = 175 + Math.round(Math.sin(y * 0.045) * 6);
    for (let dx = -6; dx <= 6; dx++) {
      const edge = Math.abs(dx) === 6;
      const sy = shoreAt(cx + dx);
      if (y > sy) continue;
      if (edge) { if ((y + dx) % 3 < 2) px(c, cx + dx, y, 1, 1, C.grassDark); }
      else if (dx === 0) px(c, cx + dx, y, 1, 1, C.dirtDark);
      else px(c, cx + dx, y, 1, 1, C.dirt);
    }
  }
  for (let i = 0; i < 90; i++) {
    const y = Math.floor(rand() * 74);
    const cx = 175 + Math.round(Math.sin(y * 0.045) * 6) + Math.floor(rand() * 9) - 4;
    px(c, cx, y, 1, 1, rand() > 0.5 ? C.dirtDark : C.sandDark);
  }

  // rocks on the grass/shore
  const rocks = [[133, 60], [141, 62], [228, 58], [235, 60], [300, 50], [58, 66], [52, 64]];
  for (const [rx0, ry0] of rocks) {
    const w = 3 + Math.floor(rand() * 3), h = 3 + Math.floor(rand() * 2);
    px(c, rx0, ry0 - h + 1, w, h, C.rockDark);
    px(c, rx0, ry0 - h + 1, w - 1, h - 1, C.rock);
    px(c, rx0, ry0 - h + 1, 1, 1, C.rockLight);
  }

  // bushes
  const bushes = [[24, 44, 9], [48, 38, 8], [78, 42, 7], [110, 40, 8], [205, 50, 9], [246, 44, 8], [284, 40, 9], [312, 44, 8]];
  for (const [bx, by, br] of bushes) {
    for (let dy = -br; dy <= br; dy++) for (let dx = -br; dx <= br; dx++) {
      if (dx * dx + dy * dy <= br * br && by + dy < shoreAt(bx + dx) - 6) {
        px(c, bx + dx, by + dy, 1, 1, C.foliageDark);
      }
    }
    for (let dy = -br + 2; dy <= br - 1; dy++) for (let dx = -br + 2; dx <= br - 1; dx++) {
      if (dx * dx + dy * dy <= (br - 2) * (br - 2)) px(c, bx + dx - 1, by + dy - 1, 1, 1, C.foliage);
    }
    px(c, bx - 2, by - 2, 2, 2, C.foliageLight);
    for (let i = 0; i < 6; i++) {
      if (rand() > 0.5) px(c, bx + Math.floor(rand() * br * 2 - br), by + Math.floor(rand() * br * 2 - br), 1, 1, C.foliageLight);
    }
  }

  // flowers
  const flowers = [[30, 52], [62, 46], [96, 52], [120, 48], [215, 58], [255, 52], [292, 48], [16, 58], [150, 50], [190, 58]];
  for (const [fx, fy] of flowers) {
    const col = [C.flowerA, C.flowerB, C.flowerC, C.flowerD][Math.floor(rand() * 4)];
    px(c, fx, fy + 1, 1, 2, C.grassDark);
    px(c, fx, fy, 1, 1, col);
    px(c, fx - 1, fy, 1, 1, col);
    px(c, fx + 1, fy, 1, 1, col);
    px(c, fx, fy - 1, 1, 1, rand() > 0.5 ? C.flowerB : col);
  }

  // reeds / cattails at the water's edge
  const reeds = [[92, 0], [100, 1], [106, 0], [116, 1], [226, 0], [234, 1], [242, 0]];
  for (const [rx0, kind] of reeds) {
    const sy = Math.round(shoreAt(rx0));
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const bx = rx0 + i * 2 + Math.floor(rand() * 2) - 1;
      const h = 8 + Math.floor(rand() * 7);
      const lean = Math.floor(rand() * 3) - 1;
      for (let k = 0; k < h; k++) {
        const yy = sy + 2 - k;
        const xx = bx + Math.round((k / h) * lean * 2);
        px(c, xx, yy, 1, 1, k > h - 3 ? C.foliageLight : C.grassDark);
      }
      if (kind === 0) px(c, bx + lean * 2, sy + 2 - h, 1, 3, '#8a5a2a'); // cattail
      else { px(c, bx + lean * 2, sy + 2 - h - 1, 1, 2, C.flowerC); }
    }
    // water base reflection
    for (let k = 0; k < 3; k++) px(c, rx0 + k * 3, sy + 3, 1, 1, C.grassDark);
  }

  // trees along the top
  const trees = [[10, 8, 15], [34, 3, 19], [62, 9, 14], [88, 1, 21], [126, 6, 13], [248, 7, 16], [276, 2, 20], [306, 8, 15]];
  for (const [tx, ty, tr] of trees) {
    // trunk hint
    px(c, tx - 1, ty + tr - 3, 3, 4, C.trunk);
    canopy(c, tx, ty, tr, rand);
  }

  // a small wooden sign near the dock
  px(c, 149, 48, 2, 12, C.woodDark);
  px(c, 141, 42, 18, 9, C.wood);
  px(c, 141, 42, 18, 2, C.woodLight);
  px(c, 141, 49, 18, 2, C.woodDark);
  px(c, 144, 45, 12, 1, C.woodDark);
  px(c, 144, 47, 8, 1, C.woodDark);

  return cv;
}

// ---------------------------------------------------------------- dock
function buildDock() {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180;
  const c = cv.getContext('2d');
  const x0 = 150, x1 = 186, y0 = 62, y1 = 118;

  // shadow on the water
  c.fillStyle = 'rgba(8,26,34,0.34)';
  c.fillRect(x0 + 4, y0 + 5, x1 - x0, y1 - y0 + 4);

  // posts below the deck
  for (const pxx of [x0 - 1, x1 - 3]) {
    px(c, pxx, y1 - 4, 4, 9, C.woodDark);
    px(c, pxx, y1 + 2, 4, 3, '#3b2515');
  }

  // planks
  for (let y = y0; y < y1; y += 7) {
    const h = Math.min(6, y1 - y);
    px(c, x0, y, x1 - x0, h, C.wood);
    px(c, x0, y, x1 - x0, 2, C.woodLight);
    px(c, x0, y + h - 1, x1 - x0, 1, C.woodDark);
    px(c, x0, y, 1, h, C.woodDark);
    px(c, x1 - 1, y, 1, h, C.woodDark);
    // knots / grain
    px(c, x0 + 6, y + 3, 2, 1, C.woodMid);
    px(c, x0 + 20, y + 2, 3, 1, C.woodMid);
    px(c, x0 + 13, y + 4, 1, 1, C.woodDark);
  }
  // cross beams
  px(c, x0 + 1, y0 + 20, x1 - x0 - 2, 2, C.woodDark);
  px(c, x0 + 1, y0 + 41, x1 - x0 - 2, 2, C.woodDark);

  // rope coil near the shore end
  const rcx = 158, rcy = 70;
  c.strokeStyle = '#c9a24a'; c.lineWidth = 1;
  c.beginPath(); c.arc(rcx, rcy, 3, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(rcx, rcy, 1.5, 0, Math.PI * 2); c.stroke();

  // lantern post on the left edge of the dock
  px(c, 152, 56, 2, 10, C.woodDark);
  px(c, 149, 60, 8, 2, C.woodDark);
  px(c, 150, 54, 6, 5, '#2a2a2a');
  px(c, 151, 55, 4, 3, '#ffd98a');
  px(c, 151, 55, 2, 1, '#fff2c0');
  px(c, 149, 53, 8, 1, C.woodDark);

  return cv;
}

// ---------------------------------------------------------------- init
let L = null;
export function initScene() {
  if (!L) {
    L = { water: buildWater(), land: buildLand(), dock: buildDock() };
  }
  return L;
}

// ---------------------------------------------------------------- water anim
function drawWaterAnim(c, t) {
  c.save();
  // broad light shimmer bands
  for (let i = 0; i < 26; i++) {
    const y = 72 + ((i * 29) % 104);
    const x = ((i * 71 + Math.floor(t * (6 + (i % 3)))) % 360) - 20;
    const w = 4 + (i % 4);
    c.globalAlpha = 0.10 + ((i * 7) % 5) * 0.02;
    px(c, x, y, w, 1, C.foam);
    px(c, x + 8, y + 12 - (i % 3) * 4, w - 1, 1, C.foam);
  }
  c.globalAlpha = 1;
  // small sparkles
  for (let i = 0; i < 40; i++) {
    const bx = (i * 53) % 320;
    const by = 70 + ((i * 37) % 106);
    const ph = (Math.sin(t * 1.7 + i * 1.3) + 1) * 0.5;
    if (ph > 0.72) {
      const x = (bx + Math.floor(t * 4 + i)) % 320;
      px(c, x, by, 1, 1, C.foam);
      if (ph > 0.9) { px(c, x - 1, by, 1, 1, C.foamDim); px(c, x + 1, by, 1, 1, C.foamDim); px(c, x, by - 1, 1, 1, C.foamDim); }
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- fish shadows
const SHADOWS = [
  { x: 40, y: 120, sp: 8, amp: 5, ph: 0.0, s: 7, dir: 1 },
  { x: 250, y: 138, sp: -6, amp: 7, ph: 1.7, s: 9, dir: -1 },
  { x: 150, y: 158, sp: 5, amp: 4, ph: 3.0, s: 6, dir: 1 },
  { x: 90, y: 150, sp: -4, amp: 6, ph: 4.1, s: 8, dir: -1 },
];
function drawFishShadows(c, t) {
  for (const sh of SHADOWS) {
    const x = sh.x + Math.sin(t * 0.12 + sh.ph) * 26;
    const y = sh.y + Math.sin(t * 0.5 + sh.ph) * sh.amp;
    const dir = Math.cos(t * 0.12 + sh.ph) >= 0 ? 1 : -1;
    c.globalAlpha = 0.20;
    const s = sh.s;
    for (let dy = -s / 2; dy <= s / 2; dy++) for (let dx = -s; dx <= s; dx++) {
      if ((dx * dx) / (s * s) + (dy * dy) / ((s / 2) * (s / 2)) <= 1) {
        px(c, Math.round(x + dx), Math.round(y + dy), 1, 1, '#08222c');
      }
    }
    // tail
    for (let k = 1; k <= s / 2; k++) {
      const wx = Math.round(x - dir * (s + k));
      const wy = Math.round(y + Math.sin(t * 0.6 + sh.ph + k * 0.3) * k * 0.4);
      px(c, wx, wy, 1, 1, '#08222c');
      px(c, wx, wy - 1, 1, 1, '#08222c');
      px(c, wx, wy + 1, 1, 1, '#08222c');
    }
    c.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- angler
export const ANGLER = { x: 168, y: 108 };
export const ROD_TIP = { x: 190, y: 84 };

export function drawAngler(c, t, phase) {
  const bob = Math.round(Math.sin(t * 1.8) * 0.6);
  const x = ANGLER.x, y = ANGLER.y + bob;

  // shadow
  c.fillStyle = 'rgba(10,25,32,0.35)';
  c.beginPath(); c.ellipse(x, y + 1, 6, 2.5, 0, 0, Math.PI * 2); c.fill();

  // rod (behind body), curves up-right over the open water
  const hx = x + 3, hy = y - 10;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const rx0 = hx + (ROD_TIP.x - hx) * p;
    const ry0 = hy + (ROD_TIP.y - hy) * p - Math.sin(p * Math.PI) * 2;
    px(c, Math.round(rx0), Math.round(ry0), 1, 1, '#2e2b26');
    if (i % 2 === 0) px(c, Math.round(rx0), Math.round(ry0) - 1, 1, 1, '#6a6558');
  }
  px(c, ROD_TIP.x, ROD_TIP.y - 1, 1, 1, '#e8e0d0');
  // reel
  px(c, hx + 1, hy + 1, 3, 3, '#3a3a3a');
  px(c, hx + 1, hy + 1, 2, 1, '#7a7a7a');

  // boots
  px(c, x - 4, y - 2, 3, 2, '#3a2a1a');
  px(c, x + 1, y - 2, 3, 2, '#3a2a1a');
  // overalls
  px(c, x - 5, y - 10, 10, 8, '#3f6fa8');
  px(c, x - 5, y - 10, 10, 1, '#4f80bc');
  px(c, x - 1, y - 10, 2, 8, '#2e5280');
  // shirt
  px(c, x - 5, y - 13, 10, 4, '#e8c56a');
  px(c, x - 5, y - 13, 10, 1, '#f6dd94');
  // straps
  px(c, x - 4, y - 13, 2, 4, '#3f6fa8');
  px(c, x + 2, y - 13, 2, 4, '#3f6fa8');
  // arms
  px(c, x - 6, y - 12, 2, 4, '#e8c56a');
  px(c, x + 5, y - 12, 2, 5, '#e8c56a');
  // hand on rod
  px(c, hx, hy - 1, 2, 3, '#e8b58c');
  // neck + head
  px(c, x - 1, y - 15, 2, 2, '#c98f68');
  px(c, x - 4, y - 19, 8, 6, '#e8b58c');
  px(c, x - 4, y - 19, 8, 1, '#d8a276');
  // hair fringe
  px(c, x - 4, y - 20, 8, 2, '#5a3a24');
  px(c, x - 4, y - 20, 2, 3, '#5a3a24');
  px(c, x + 2, y - 20, 2, 3, '#5a3a24');
  // eyes + mouth
  px(c, x - 3, y - 17, 1, 2, '#3a2a1a');
  px(c, x + 1, y - 17, 1, 2, '#3a2a1a');
  px(c, x - 1, y - 15, 2, 1, '#a86a4a');
  // straw hat
  px(c, x - 6, y - 21, 12, 2, '#d9b25f');
  px(c, x - 6, y - 21, 12, 1, '#e8c878');
  px(c, x - 3, y - 24, 6, 3, '#d9b25f');
  px(c, x - 3, y - 24, 6, 1, '#efd68a');
  px(c, x - 3, y - 22, 6, 1, '#b08a3f');
  // brim shadow on face
  px(c, x - 3, y - 18, 6, 1, '#c98f68');
}

// ---------------------------------------------------------------- fishing rig
function pixelLine(c, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  c.fillStyle = col;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function drawRipples(c, x, y, t, active, intensity) {
  if (!active) return;
  for (let k = 0; k < 3; k++) {
    const p = ((t * 0.6 + k * 0.33) % 1);
    const r = 2 + p * 8 + intensity * 4;
    c.globalAlpha = (1 - p) * 0.5;
    c.strokeStyle = C.foam;
    c.beginPath(); c.ellipse(Math.round(x), Math.round(y), r, r * 0.5, 0, 0, Math.PI * 2); c.stroke();
  }
  c.globalAlpha = 1;
}

export function drawFishing(c, view) {
  const b = view.bobber;
  const tip = ROD_TIP;
  if (!b || !b.visible) return;

  // ripples under bobber
  drawRipples(c, b.x, b.y + 1, view.t, b.landed, view.bite ? 1 : 0);

  // line
  const sx = tip.x, sy = tip.y - 1;
  const midx = (sx + b.x) / 2, midy = (sy + b.y) / 2 + (view.phase === 'reeling' ? 4 : 2);
  pixelLine(c, sx, sy, midx, midy, '#2b2b2b');
  pixelLine(c, midx, midy, b.x, b.y - 1, view.phase === 'bite' ? '#d23b2b' : '#2b2b2b');

  // bobber body
  const by = b.y;
  px(c, b.x - 1, by - 3, 3, 1, '#3a1a14');
  px(c, b.x - 2, by - 2, 5, 2, '#d23b2b');
  px(c, b.x - 2, by, 5, 2, '#f2ede0');
  px(c, b.x - 2, by + 2, 5, 1, '#3a1a14');
  px(c, b.x - 1, by + 3, 3, 1, '#2b2b2b');
  px(c, b.x - 1, by - 2, 2, 1, '#ff7a6a');
  // antenna
  px(c, b.x, by - 5, 1, 2, '#f2ede0');
  px(c, b.x, by - 6, 1, 1, view.bite ? '#ffe14a' : '#d23b2b');

  // bite splash
  if (view.bite) {
    const p = (view.t * 2.5) % 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = 3 + p * 7;
      px(c, Math.round(b.x + Math.cos(a) * rr), Math.round(b.y + Math.sin(a) * rr * 0.5), 1, 1, C.foam);
    }
  }
  // reel-in splash / fight
  if (view.phase === 'reeling' && view.reelP > 0.55) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + view.t * 3;
      const rr = 2 + (i % 4) * 2;
      px(c, Math.round(b.x + Math.cos(a) * rr), Math.round(b.y + Math.sin(a) * rr * 0.5), 1, 1, C.foam);
    }
  }
}

// line splash while the bobber flies
export function drawCastTrail(c, view) {
  if (view.phase !== 'waiting' || !view.casting) return;
  const b = view.bobber;
  for (let i = 0; i < 3; i++) {
    const a = view.castP - i * 0.06;
    if (a < 0) continue;
    const x = view.castFrom.x + (b.x - view.castFrom.x) * a;
    const y = view.castFrom.y + (b.y - view.castFrom.y) * a - Math.sin(a * Math.PI) * view.castArc;
    px(c, Math.round(x), Math.round(y), 1, 1, C.foam);
  }
}

// ---------------------------------------------------------------- ambience
const LEAVES = [
  { x: 0, y: 0, sp: 6, ph: 0 }, { x: 0, y: 0, sp: 9, ph: 2 },
];
export function drawAmbience(c, t) {
  // drifting leaves on the water
  for (let i = 0; i < 12; i++) {
    const speed = 3 + (i % 4);
    const x = ((i * 47 + t * speed) % 360) - 20;
    const y = 84 + ((i * 31) % 88) + Math.sin(t * 0.8 + i) * 1.5;
    const col = i % 3 === 0 ? '#7a9a4a' : (i % 3 === 1 ? '#c98a3a' : '#4a7a44');
    px(c, Math.round(x), Math.round(y), 2, 1, col);
    px(c, Math.round(x) + 1, Math.round(y) - 1, 1, 1, col);
  }
  // dragonfly near the reeds
  const dx = 104 + Math.sin(t * 0.7) * 10;
  const dy = shoreAt(104) - 12 + Math.cos(t * 1.1) * 4;
  px(c, Math.round(dx), Math.round(dy), 1, 1, '#3a6a8a');
  c.globalAlpha = 0.7;
  px(c, Math.round(dx) - 1, Math.round(dy) - 1, 1, 1, '#bfe8f0');
  px(c, Math.round(dx) + 1, Math.round(dy) - 1, 1, 1, '#bfe8f0');
  c.globalAlpha = 1;
  // butterflies over the flowers
  for (let i = 0; i < 3; i++) {
    const bx = 40 + i * 80 + Math.sin(t * 0.9 + i * 2) * 14;
    const by = 44 + Math.cos(t * 1.3 + i) * 6;
    const col = [C.flowerA, C.flowerB, C.flowerC][i];
    px(c, Math.round(bx), Math.round(by), 1, 1, col);
    px(c, Math.round(bx) - 1, Math.round(by) - 1, 1, 1, col);
    px(c, Math.round(bx) + 1, Math.round(by) - 1, 1, 1, col);
  }
}

// ---------------------------------------------------------------- bite cue
export function drawBiteCue(c, view) {
  if (!view.bite) return;
  const b = view.bobber;
  const yo = view.bobberDip ? 2 : 0;
  const yy = b.y - 14 + yo + Math.round(Math.sin(view.t * 18) * 1);
  const xx = b.x;
  // speech-bubble "!"
  const bounce = Math.abs(Math.sin(view.t * 6)) * 2;
  const y = yy - bounce;
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillRect(xx - 6, y - 8, 13, 12);
  c.fillStyle = '#d23b2b';
  c.fillRect(xx - 5, y - 7, 11, 10);
  px(c, xx - 1, y - 5, 2, 5, '#ffffff');
  px(c, xx - 1, y + 1, 2, 2, '#ffffff');
  // pointer
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillRect(xx - 1, y + 4, 3, 1);
  c.fillRect(xx, y + 5, 1, 1);
  c.fillStyle = '#d23b2b';
  c.fillRect(xx, y + 5, 1, 1);
}

// ---------------------------------------------------------------- main draw
export function drawScene(c, view) {
  if (!L) initScene();
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 320, 180);
  c.drawImage(L.water, 0, 0);
  drawWaterAnim(c, view.t);
  drawFishShadows(c, view.t);
  c.drawImage(L.land, 0, 0);
  c.drawImage(L.dock, 0, 0);
  drawAngler(c, view.t, view.phase);
  drawAmbience(c, view.t);
  drawCastTrail(c, view);
  drawFishing(c, view);
  drawBiteCue(c, view);
}
