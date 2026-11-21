// World rendering: sky, sea, island shoreline, dock, angler, line and reveal.
// Everything is drawn with code primitives on the 320x180 logical canvas.
import { P, RARITY } from './palette.js';
import { getSprite, lerpColor } from './fish.js';

export const W = 320;
export const H = 180;
export const HORIZON = 52;
export const DOCK = { topY: 112, cx: 197, halfTop: 15, halfBot: 30 };
export const ANGLER = { x: 197, feet: 151 };
export const REVEAL = { x: 64, y: 24, w: 192, h: 128 };
export const SUN = { x: 232, y: 20 };

function R(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function circle(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let y = Math.floor(-r); y <= r; y++) {
    const half = Math.sqrt(Math.max(0, r * r - y * y));
    g.fillRect(Math.round(cx - half), Math.round(cy + y), Math.round(half * 2) + 1, 1);
  }
}
function hash(x, y) {
  let n = (x * 1836311903 + y * 2971215073) ^ 0x9e3779b9;
  n = (n ^ (n >> 15)) * 2246822519;
  n = n ^ (n >> 13);
  return (n >>> 0) / 4294967295;
}

export function shoreTop(x) {
  let y = 150 + Math.sin(x * 0.05) * 4 + Math.sin(x * 0.13 + 1.7) * 2.5;
  y -= 36 * Math.exp(-((x - 16) ** 2) / (2 * 20 * 20));
  y -= 20 * Math.exp(-((x - 308) ** 2) / (2 * 16 * 16));
  return y;
}

function dockHalf(y) {
  const t = (y - DOCK.topY) / (H + 1 - DOCK.topY);
  return DOCK.halfTop + (DOCK.halfBot - DOCK.halfTop) * t;
}

// ---------------------------------------------------------------------------
export function drawWorld(g, t, game) {
  g.imageSmoothingEnabled = false;
  drawSky(g, t);
  drawIslands(g, t);
  drawWater(g, t, game);
  drawFishShadows(g, t);
  drawLand(g, t);
  drawLilyPads(g, t);
  drawShoreProps(g, t);
  drawTree(g, t);
  drawDock(g, t);
  drawAngler(g, t, game);
  drawFishing(g, t, game);
  drawCatch(g, t, game);
  drawAmbient(g, t);
  drawParticles(g, game);
  drawVignette(g);
}

// ---------------------------------------------------------------------------
function drawSky(g, t) {
  const bands = [
    [0, 12, P.skyTop],
    [12, 22, P.skyUpper],
    [22, 32, P.skyMid],
    [32, 42, P.skyLow],
    [42, HORIZON + 1, P.skyHaze],
  ];
  for (const [y0, y1, c] of bands) R(g, 0, y0, W, y1 - y0, c);
  // soft dithering between bands
  for (let x = 0; x < W; x++) {
    R(g, x, 12, 1, 1, (x % 2) ? P.skyTop : P.skyUpper);
    R(g, x, 22, 1, 1, (x % 2) ? P.skyUpper : P.skyMid);
    R(g, x, 32, 1, 1, (x % 2) ? P.skyMid : P.skyLow);
    R(g, x, 42, 1, 1, (x % 2) ? P.skyLow : P.skyHaze);
  }

  // sun + halo
  const sx = SUN.x, sy = SUN.y;
  for (let r = 26; r > 6; r -= 5) {
    g.globalAlpha = 0.06;
    circle(g, sx, sy, r, P.sunGlow);
  }
  g.globalAlpha = 1;
  circle(g, sx, sy, 8, P.sunGlow);
  circle(g, sx, sy, 6, P.sun);
  R(g, sx - 3, sy - 4, 6, 2, '#ffffff');

  // clouds drifting slowly
  const clouds = [
    { x: 60, y: 16, s: 1.0, v: 2.2 },
    { x: 150, y: 30, s: 0.7, v: 3.1 },
    { x: 250, y: 12, s: 0.85, v: 1.7 },
    { x: 20, y: 34, s: 0.6, v: 2.6 },
  ];
  for (const c of clouds) {
    const cx = (c.x + t * c.v) % (W + 60) - 30;
    drawCloud(g, cx, c.y, c.s, 0.9);
  }
}

function drawCloud(g, x, y, s, alpha) {
  g.globalAlpha = alpha;
  const puffs = [
    [0, 0, 9], [10, 2, 7], [-9, 2, 7], [4, -3, 6], [-4, -2, 6], [16, 3, 5], [-16, 4, 4],
  ];
  for (const [px, py, pr] of puffs) circle(g, x + px * s, y + py * s, pr * s, P.cloud);
  for (const [px, py, pr] of puffs) circle(g, x + px * s, y + py * s + 2 * s, pr * s * 0.9, P.cloudShade);
  // repaint top for a bright cap
  for (const [px, py, pr] of puffs) circle(g, x + px * s, y + py * s - 1, pr * s * 0.85, P.cloud);
  g.globalAlpha = 1;
}

function drawIslands(g, t) {
  // distant hazy mountains / islands
  const drawRidge = (baseX, scale, color, alpha) => {
    g.globalAlpha = alpha;
    for (let x = -20; x < W + 20; x++) {
      const hgt = (Math.sin((x + baseX) * 0.035) * 0.5 + Math.sin((x + baseX) * 0.09 + 1) * 0.5 + 1) * 5 * scale;
      const top = HORIZON - 3 - hgt;
      R(g, x, top, 1, HORIZON - top + 1, color);
    }
    g.globalAlpha = 1;
  };
  drawRidge(0, 1.3, P.hillFar, 0.55);
  drawRidge(40, 0.9, P.hillMid, 0.7);
  // near island blobs
  g.globalAlpha = 0.85;
  const isls = [[70, 4], [110, 3], [286, 5], [306, 3]];
  for (const [ix, ih] of isls) {
    for (let x = -ih * 3; x <= ih * 3; x++) {
      const hh = Math.floor(ih * Math.cos((x / (ih * 3)) * Math.PI / 2));
      if (hh > 0) R(g, ix + x, HORIZON - hh, 1, hh + 1, P.hillNear);
    }
    // tree tufts
    for (let k = -1; k <= 1; k++) R(g, ix + k * 2, HORIZON - ih - 2, 2, 3, P.hillShade);
  }
  g.globalAlpha = 1;
  // haze line at horizon
  for (let x = 0; x < W; x++) {
    if ((x + 1) % 3) R(g, x, HORIZON, 1, 1, 'rgba(244,226,182,0.5)');
  }
}

// ---------------------------------------------------------------------------
function drawWater(g, t, game) {
  const top = HORIZON + 1;
  for (let y = top; y < H; y += 2) {
    const k = (y - top) / (H - top);
    let c = lerpColor(P.waterShallow, P.waterMid, Math.min(1, k * 1.4));
    if (k > 0.45) c = lerpColor(P.waterMid, P.waterDeep, (k - 0.45) / 0.55);
    // sky reflection fading quickly from the horizon
    const refl = Math.max(0, 1 - k / 0.13) * 0.30;
    c = lerpColor(c, P.skyHaze, refl);
    R(g, 0, y, W, 2, c);
  }

  // long rolling swell lines
  for (let k = 0; k < 8; k++) {
    const base = 60 + k * 14;
    const col = k % 3 === 0 ? P.waterHi : P.waterLight;
    g.globalAlpha = 0.10 + 0.06 * Math.sin(t * 0.7 + k * 1.3);
    for (let x = 0; x < W; x += 2) {
      const y = Math.round(base + Math.sin(x * 0.09 + t * 0.85 + k) * 1.8 + Math.sin(x * 0.23 - t * 0.5) * 0.8);
      R(g, x, y, 2, 1, col);
    }
  }
  g.globalAlpha = 1;

  // sun glitter path
  g.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const y = HORIZON + 4 + (i % 30) * 2.4 + Math.floor(i / 30) * 1.2;
    const spread = 6 + (y - HORIZON) * 0.5;
    const x = SUN.x + (hash(i, 7) - 0.5) * spread * 2;
    const tw = Math.sin(t * 2.2 + i * 1.7);
    if (tw > 0.2) {
      g.globalAlpha = 0.25 + tw * 0.4;
      R(g, x, y, 2 + (tw > 0.7 ? 1 : 0), 1, tw > 0.85 ? '#ffffff' : P.sunGlow);
    }
  }
  g.globalAlpha = 1;

  // ambient ripple rings
  for (let i = 0; i < 5; i++) {
    const seed = i * 31 + 5;
    const cyc = ((t * 0.35 + i * 0.21) % 1);
    const rx = 40 + hash(seed, 1) * 240;
    const ry = 72 + hash(seed, 2) * 80;
    if (ry > shoreTop(rx) - 4) continue;
    const r = cyc * 9;
    g.globalAlpha = (1 - cyc) * 0.28;
    strokeEllipse(g, rx, ry, r, r * 0.4, P.waterHi);
  }
  g.globalAlpha = 1;

  // tree reflection (left) and dock shadow
  g.globalAlpha = 0.12;
  for (let y = HORIZON + 2; y < 150; y += 2) {
    const w = 60 - (y - HORIZON) * 0.35;
    if (w > 4) R(g, 8, y, w, 2, '#0d3d2a');
  }
  g.globalAlpha = 1;
}

function strokeEllipse(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  const steps = Math.max(8, Math.round(rx * 2));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}

// ---------------------------------------------------------------------------
function drawFishShadows(g, t) {
  for (let i = 0; i < 3; i++) {
    const dir = i % 2 ? 1 : -1;
    const span = 430;
    let x = ((t * (7 + i * 3) + i * 130) % span) - 55;
    if (dir < 0) x = W + 55 - x;
    const y = 94 + i * 17;
    if (y > shoreTop(x) - 9) continue;
    g.globalAlpha = 0.13;
    circle(g, x, y, 4, '#08283a');
    R(g, x + (dir > 0 ? -3 : 3), y - 1, 3, 2, '#08283a');
    g.globalAlpha = 1;
  }
}

function drawLilyPads(g, t) {
  const pads = [[252, 147, 0], [263, 152, 1.3], [238, 150, 2.4], [92, 145, 0.7], [80, 149, 1.9]];
  for (const [x, y, ph] of pads) {
    const yy = Math.round(y + Math.sin(t * 1.2 + ph) * 0.6);
    g.globalAlpha = 0.18;
    circle(g, x + 1, yy + 2, 4, '#0b3a4a');
    g.globalAlpha = 1;
    const r = 4;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.sqrt(Math.max(0, r * r - dy * dy));
      for (let dx = -half; dx <= half; dx++) {
        if (dx > half - 1.6 && Math.abs(dy) <= 1) continue; // notch
        const edge = dx * dx + dy * dy > (r - 1) * (r - 1);
        const c = edge ? '#2f6f3c' : (dx + dy < -1 ? '#5aa85a' : '#3f8a4a');
        R(g, x + dx, yy + dy, 1, 1, c);
      }
    }
    if (Math.abs(x - 92) < 2 || Math.abs(x - 252) < 2) {
      R(g, x - 1, yy - 2, 2, 2, '#f2e4f0');
      R(g, x, yy - 3, 1, 1, '#f7c9e0');
    }
  }
}

// ---------------------------------------------------------------------------
function drawLand(g, t) {
  for (let x = 0; x < W; x++) {
    const st = Math.round(shoreTop(x));
    const sandH = 9;
    // wet sand
    R(g, x, st, 1, 3, P.sandWet);
    R(g, x, st + 3, 1, sandH - 3, P.sand);
    if (hash(x, 3) > 0.6) R(g, x, st + 4, 1, 1, P.sandLight);
    // foam at waterline
    if (hash(x, 9) > 0.45) R(g, x, st - 1, 1, 1, P.foam);
    if (hash(x, 11) > 0.8) R(g, x, st - 2, 1, 1, P.foam);
    // grass
    const gy = st + sandH;
    R(g, x, gy, 1, H - gy + 1, P.grass);
    R(g, x, gy, 1, 2, P.grassDark);
    // grass texture
    if (hash(x, 17) > 0.72) R(g, x, gy + 3 + Math.floor(hash(x, 19) * 14), 1, 2, P.grassDark);
    if (hash(x, 23) > 0.8) R(g, x, gy + 2 + Math.floor(hash(x, 29) * 16), 1, 1, P.grassLight);
  }
  // meadow shading toward the bottom
  for (let y = 166; y < H; y++) {
    g.globalAlpha = (y - 166) / H * 0.5;
    R(g, 0, y, W, 1, P.grassShadow);
  }
  g.globalAlpha = 1;
}

function drawShoreProps(g, t) {
  // flowers
  const flowerCols = ['#f2d45c', '#ef8a7a', '#f4f0e2', '#c58fe0'];
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hash(i, 41) * W);
    const st = Math.round(shoreTop(x)) + 11;
    const y = st + Math.floor(hash(i, 43) * (H - st - 4));
    const c = flowerCols[Math.floor(hash(i, 47) * flowerCols.length)];
    if (x > 160 && x < 235 && y > 112) continue; // keep the dock clear
    R(g, x, y, 1, 2, P.grassDark);
    R(g, x, y - 1, 1, 1, c);
    if (hash(i, 53) > 0.5) R(g, x + 1, y, 1, 1, c);
  }
  // leafy little bushes
  const bushes = [[44, 172], [74, 176], [130, 174], [252, 172], [292, 170], [316, 168]];
  for (const [bx, by] of bushes) {
    for (const [dx, dy, r, c] of [[0, 0, 8, P.leafDark], [0, -2, 6, P.leaf], [-3, -4, 4, P.leafMid], [3, -3, 4, P.leafLight]]) {
      circle(g, bx + dx, by + dy, r, c);
    }
  }
  // reeds along the waterline
  const reedSpots = [86, 96, 108, 246, 256, 264, 276, 286, 300];
  for (const rx of reedSpots) {
    const base = Math.round(shoreTop(rx)) + 1;
    for (let k = 0; k < 5; k++) {
      const sx = rx + (hash(rx, k) - 0.5) * 7;
      const hgt = 9 + hash(rx, k + 5) * 9;
      const sway = Math.sin(t * 1.1 + k * 0.8 + rx) * 1.4;
      const c = k % 2 ? P.leaf : P.leafDark;
      for (let i = 0; i < hgt; i++) {
        R(g, sx + sway * (i / hgt), base - i, 1, 1, c);
      }
      R(g, Math.round(sx + sway), base - hgt, 1, 2, '#b7963f');
    }
  }
  // rocks
  const rocks = [[100, 152, 4], [122, 158, 3], [270, 150, 5], [288, 156, 3], [58, 168, 4]];
  for (const [rx, ry, rr] of rocks) {
    circle(g, rx, ry, rr, '#7c8288');
    circle(g, rx - 1, ry - 1, rr - 1, '#9aa0a6');
    circle(g, rx + 1, ry + 1, rr - 1, '#5c6268');
    R(g, rx - 1, ry - rr, 2, 1, '#c3c8cc');
  }
}

function drawTree(g, t) {
  const baseX = 20, baseY = 148;
  const sway = Math.round(Math.sin(t * 0.5) * 1);
  // ground shadow
  g.globalAlpha = 0.22;
  circle(g, baseX + 16, baseY + 12, 26, '#0d2a1a');
  g.globalAlpha = 1;
  // trunk
  for (let y = 0; y < 54; y++) {
    const yy = baseY - y;
    const w = 4 + Math.round(y * 0.06) + (y > 40 ? 3 : 0);
    const x = baseX - Math.floor(w / 2) + Math.round(Math.sin(y * 0.1) * (y > 30 ? (y - 30) * 0.12 : 0) + sway * (y / 54));
    R(g, x, yy, w, 1, y % 7 < 2 ? P.trunkDark : P.trunk);
    R(g, x + w - 1, yy, 1, 1, P.trunkDark);
    if (y % 9 === 3) R(g, x + 1, yy, 2, 1, P.trunkLight);
  }
  // roots
  R(g, baseX - 8, baseY + 2, 7, 3, P.trunkDark);
  R(g, baseX + 3, baseY + 2, 8, 3, P.trunkDark);
  R(g, baseX - 6, baseY + 1, 5, 2, P.trunk);
  R(g, baseX + 4, baseY + 1, 6, 2, P.trunk);
  // branches
  R(g, baseX + 2, baseY - 46, 14, 3, P.trunk);
  R(g, baseX + 12, baseY - 52, 12, 3, P.trunk);
  R(g, baseX - 6, baseY - 42, 10, 3, P.trunk);

  // canopy clusters (light from upper right)
  const cx = baseX + 18 + sway, cy = baseY - 78;
  const clusters = [
    [0, 6, 30, P.leafDark], [24, -6, 22, P.leafDark], [-20, -2, 22, P.leafDark],
    [2, 2, 27, P.leaf], [24, -8, 19, P.leaf], [-18, -4, 19, P.leaf],
    [6, -4, 22, P.leafMid], [26, -14, 14, P.leafMid], [-14, -12, 15, P.leafMid],
    [10, -8, 16, P.leafLight], [28, -16, 9, P.leafLight], [-10, -16, 10, P.leafLight],
    [14, -12, 8, P.leafHi], [30, -18, 5, P.leafHi],
  ];
  for (const [dx, dy, r, c] of clusters) circle(g, cx + dx, cy + dy, r, c);
  // dappled highlight pixels
  for (let i = 0; i < 90; i++) {
    const a = hash(i, 61) * Math.PI * 2;
    const rr = hash(i, 67) * 44;
    const dx = cx + Math.cos(a) * rr;
    const dy = cy + Math.sin(a) * rr * 0.8;
    if (Math.cos(a) > -0.1 && hash(i, 71) > 0.55) R(g, dx, dy, 1, 1, P.leafHi);
  }
  // hanging vines
  for (let i = 0; i < 3; i++) {
    const vx = cx + (i - 1) * 16 + 6;
    const vy = cy + 22;
    for (let k = 0; k < 8 + i * 2; k++) R(g, vx + Math.round(Math.sin(k * 0.5) * 1), vy + k, 1, 1, P.leafDark);
  }
}

function drawDock(g, t) {
  const { topY, cx } = DOCK;
  // shadow cast on the water to the left/down
  g.globalAlpha = 0.20;
  for (let y = topY; y < H; y++) {
    const hw = dockHalf(y);
    R(g, cx - hw - 10, y, 12, 1, '#0a2c40');
  }
  g.globalAlpha = 1;

  // support posts at the far end
  for (const s of [-1, 1]) {
    const px = cx + s * (DOCK.halfTop - 2);
    R(g, px - 1, topY - 2, 4, 20, P.woodDark);
    R(g, px, topY - 2, 2, 18, P.wood);
    // reflection
    g.globalAlpha = 0.25;
    for (let k = 0; k < 14; k++) R(g, px - 1, topY + 18 + k, 4, 1, P.woodDark);
    g.globalAlpha = 1;
  }

  // deck
  for (let y = topY; y < H + 1; y++) {
    const hw = dockHalf(y);
    const x0 = Math.round(cx - hw);
    const x1 = Math.round(cx + hw);
    const plank = (y >> 2) % 2;
    R(g, x0, y, x1 - x0, 1, plank ? P.wood : P.woodLight);
    // deck side rails
    R(g, x0, y, 2, 1, P.woodDark);
    R(g, x1 - 2, y, 2, 1, P.woodDark);
    // seams
    if (y % 4 === 0) R(g, x0 + 2, y, x1 - x0 - 4, 1, P.woodDark);
    // sunlit right rail
    R(g, x1 - 3, y, 1, 1, P.woodHi);
    if (y % 4 === 2) {
      R(g, x0 + 4, y, 1, 1, P.woodDark);
      R(g, x1 - 5, y, 1, 1, P.woodDark);
    }
  }
  // top-face highlight at the far end
  R(g, cx - DOCK.halfTop, topY, DOCK.halfTop * 2, 1, P.woodHi);

  // a bucket and a woven creel on the deck
  drawBucket(g, 179, 168);
  drawCreel(g, 205, 172);
}

function drawBucket(g, x, y) {
  R(g, x, y - 4, 6, 5, '#8a9098');
  R(g, x, y - 4, 6, 1, '#aab0b8');
  R(g, x + 1, y - 5, 4, 1, '#6a7078');
  R(g, x + 1, y - 7, 4, 1, '#5a6068');
  R(g, x, y - 6, 1, 1, '#5a6068');
  R(g, x + 5, y - 6, 1, 1, '#5a6068');
}

function drawCreel(g, x, y) {
  R(g, x, y - 5, 10, 6, P.wood);
  R(g, x, y - 5, 10, 1, P.woodHi);
  R(g, x, y + 1, 10, 1, P.woodDark);
  for (let i = 0; i < 10; i += 2) R(g, x + i, y - 4, 1, 4, P.woodDark);
  R(g, x + 1, y - 7, 8, 2, P.woodDark);
  R(g, x + 2, y - 8, 6, 1, P.wood);
}

// ---------------------------------------------------------------------------
function drawAngler(g, t, game) {
  const { x, feet } = ANGLER;
  const bob = Math.sin(t * 1.6) > 0.55 ? -1 : 0;
  const lean = game.phase === 'reeling' ? -1 : 0;

  // shadow
  g.globalAlpha = 0.3;
  circle(g, x, feet + 1, 6, '#1a1410');
  g.globalAlpha = 1;

  // legs (planted)
  R(g, x - 3, feet - 2, 3, 2, P.boots);
  R(g, x + 1, feet - 2, 3, 2, P.boots);
  R(g, x - 3, feet - 7, 6, 5, P.pants);
  R(g, x, feet - 7, 1, 5, P.pantsDark);
  R(g, x - 3, feet - 7, 1, 5, P.pantsDark);

  const oy = bob + lean;
  // torso
  R(g, x - 4, feet - 14 + oy, 8, 7, P.shirt);
  R(g, x - 4, feet - 14 + oy, 8, 1, P.shirtLight);
  R(g, x + 2, feet - 14 + oy, 2, 7, P.shirtDark);
  R(g, x - 4, feet - 9 + oy, 8, 2, P.shirtDark);
  // suspenders
  R(g, x - 3, feet - 14 + oy, 1, 5, P.pantsDark);
  R(g, x + 2, feet - 14 + oy, 1, 5, P.pantsDark);

  // arms reaching toward the rod (to the left)
  const armX = x - 5, armY = feet - 12 + oy;
  R(g, armX - 3, armY, 4, 2, P.shirt);
  R(g, armX - 5, armY - 1, 3, 2, P.skin);
  R(g, x + 2, armY + 1, 3, 2, P.shirtDark);

  // head
  const hy = feet - 19 + oy;
  R(g, x - 3, hy, 6, 5, P.skin);
  R(g, x - 3, hy + 3, 6, 2, P.skinShade);
  R(g, x + 2, hy, 1, 5, P.skinShade);
  // hair at the back (right side, since facing left)
  R(g, x + 1, hy, 2, 3, P.hair);
  // face
  R(g, x - 2, hy + 1, 1, 1, '#2a1c12');
  R(g, x - 3, hy + 2, 1, 1, P.skinShade);
  // hat
  R(g, x - 5, hy - 1, 10, 2, P.hat);
  R(g, x - 5, hy - 1, 10, 1, '#f2dd8a');
  R(g, x - 4, hy - 1, 2, 1, P.hatDark);
  R(g, x - 3, hy - 4, 6, 3, P.hat);
  R(g, x - 3, hy - 4, 6, 1, '#f2dd8a');
  R(g, x + 2, hy - 4, 1, 3, P.hatDark);
  R(g, x - 3, hy - 2, 6, 1, P.hatBand);

  // rod is drawn by drawFishing so the line matches the tip
}

// ---------------------------------------------------------------------------
// Fishing line, rod and bobber. game provides: rodTip, bobber {x,y,visible,dip},
// lineActive, lineSag.
function drawFishing(g, t, game) {
  const rod = game.rod || { x: ANGLER.x - 6, y: ANGLER.feet - 13 };
  const tip = game.rodTip || { x: rod.x - 20, y: rod.y - 14 };

  // rod
  drawLine(g, rod.x, rod.y, tip.x, tip.y, P.rodDark, 2);
  drawLine(g, rod.x, rod.y - 1, tip.x, tip.y - 1, P.rod, 1);
  R(g, rod.x - 1, rod.y - 1, 3, 3, '#3a3a44');
  R(g, rod.x, rod.y, 1, 1, '#8a8a98');

  if (game.lineActive && game.bobber) {
    const b = game.bobber;
    // sagging line
    const mx = (tip.x + b.x) / 2;
    const my = (tip.y + b.y) / 2 + (game.lineSag || 0);
    const pts = 24;
    for (let i = 0; i <= pts; i++) {
      const u = i / pts;
      const xx = (1 - u) * (1 - u) * tip.x + 2 * (1 - u) * u * mx + u * u * b.x;
      const yy = (1 - u) * (1 - u) * tip.y + 2 * (1 - u) * u * my + u * u * b.y;
      R(g, xx, yy, 1, 1, i % 4 === 0 ? '#ffffff' : P.line);
    }
  }

  if (game.bobber && game.bobber.visible) {
    drawBobber(g, t, game);
  }

  // unmistakable bite cue above the bobber
  if (game.phase === 'bite' && game.bobber) {
    const b = game.bobber;
    const bx = Math.round(b.x);
    const by = Math.round(b.y) - 14;
    const pulse = 0.5 + 0.5 * Math.sin(t * 16);
    g.globalAlpha = 0.5 + pulse * 0.5;
    // expanding rings on the water
    g.globalAlpha = 0.6;
    for (let i = 0; i < 2; i++) {
      const rr = 5 + ((t * 16 + i * 8) % 16);
      strokeEllipse(g, b.x, b.y + 2, rr, rr * 0.4, '#ffe066');
    }
    // exclamation mark
    g.globalAlpha = 1;
    R(g, bx, by - 4, 2, 5, '#ffe066');
    R(g, bx, by + 2, 2, 2, '#ffe066');
    R(g, bx, by - 4, 1, 5, '#ffffff');
    g.globalAlpha = 1;
  }
}

function drawBobber(g, t, game) {
  const b = game.bobber;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  const dip = b.dip || 0;
  // ripple rings on the water
  if (b.inWater) {
    g.globalAlpha = 0.5;
    strokeEllipse(g, x, y + 2, 4 + Math.sin(t * 3) * 0.8, 1.6, P.waterHi);
    strokeEllipse(g, x, y + 2, 7, 2.4, P.waterLight);
    g.globalAlpha = 1;
  }
  const top = y - dip;
  // float body: red top, cream bottom
  R(g, x - 1, top - 2, 3, 2, '#d94b3a');
  R(g, x - 1, top, 3, 2, '#f2ead6');
  R(g, x, top + 2, 1, 1, P.outline);
  R(g, x - 1, top - 2, 1, 1, '#f07a63');
  R(g, x - 1, top + 2, 3, 1, 'rgba(0,0,0,0.25)');
  // antenna
  R(g, x, top - 4, 1, 2, P.outline);
  R(g, x, top - 5, 1, 1, '#ffffff');
  // splash when dipping
  if (dip > 1) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      R(g, x + Math.cos(a) * (4 + dip), y + 2 + Math.sin(a) * 2, 1, 1, P.foam);
    }
  }
}

function drawCatch(g, t, game) {
  if (game.phase !== 'reeling' || !game.catchSprite || !game.catchSprite.visible || !game.caught) return;
  const s = game.catchSprite;
  const spr = getSprite(game.caught);
  const w = Math.round(spr.width * s.scale);
  const h = Math.round(spr.height * s.scale);
  g.imageSmoothingEnabled = false;
  // splash burst behind the leap
  if (s.scale < 1.3) {
    g.globalAlpha = 0.7;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      R(g, s.x + Math.cos(a) * 6, s.y + 4 + Math.sin(a) * 2, 2, 2, P.foam);
    }
    g.globalAlpha = 1;
  }
  g.drawImage(spr, Math.round(s.x - w / 2), Math.round(s.y - h / 2), w, h);
}

function drawLine(g, x0, y0, x1, y1, c, w) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  g.fillStyle = c;
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    g.fillRect(Math.round(x), Math.round(y), w, w);
  }
}

// ---------------------------------------------------------------------------
function drawParticles(g, game) {
  if (!game.particles) return;
  for (const p of game.particles) {
    const a = Math.max(0, Math.min(1, p.life / p.maxLife));
    g.globalAlpha = a;
    R(g, p.x, p.y, p.size || 1, p.size || 1, p.color);
  }
  g.globalAlpha = 1;
}

function drawAmbient(g, t) {
  // fireflies drifting over the meadow
  for (let i = 0; i < 7; i++) {
    const seed = i * 97 + 3;
    const fx = 30 + (hash(seed, 1) * 270) + Math.sin(t * 0.6 + i) * 10;
    const fy = 128 + hash(seed, 2) * 44 + Math.cos(t * 0.9 + i * 1.3) * 4;
    const glow = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 2));
    g.globalAlpha = glow * 0.5;
    circle(g, fx, fy, 2, '#fff3b0');
    g.globalAlpha = glow;
    R(g, fx, fy, 1, 1, '#fffbe0');
  }
  g.globalAlpha = 1;
  // butterflies near the flowers
  for (let i = 0; i < 3; i++) {
    const bx = 90 + i * 70 + Math.sin(t * 0.8 + i) * 14;
    const by = 152 + Math.cos(t * 1.3 + i * 2) * 5;
    const flap = Math.sin(t * 9 + i) > 0 ? 1 : 0;
    R(g, bx - 1, by - flap, 1, 1, i === 1 ? '#f4d06a' : '#f2f0e6');
    R(g, bx + 1, by - flap, 1, 1, i === 1 ? '#f4d06a' : '#f2f0e6');
    R(g, bx, by, 1, 1, '#3a2a22');
  }
  // drifting leaves from the tree
  for (let i = 0; i < 3; i++) {
    const lt = (t * 0.25 + i * 0.4) % 1;
    const lx = 36 + lt * 90 + Math.sin(lt * 12 + i) * 12;
    const ly = 92 + lt * 60;
    if ((Math.floor(t * 0.4) + i) % 2 === 0) {
      R(g, lx, ly, 2, 1, P.leafMid);
      R(g, lx + 1, ly - 1, 1, 1, P.leafLight);
    }
  }
}

function drawVignette(g) {
  // A very weak, local warm bloom around the sun only. No full-screen wash.
  g.globalAlpha = 0.05;
  circle(g, SUN.x, SUN.y + 12, 30, P.sunGlow);
  g.globalAlpha = 0.04;
  circle(g, SUN.x, SUN.y + 12, 46, P.sunGlow);
  g.globalAlpha = 1;
  // gentle darkening along the very bottom for depth
  for (let y = H - 12; y < H; y++) {
    g.globalAlpha = ((y - (H - 12)) / 12) * 0.16;
    R(g, 0, y, W, 1, '#0f2018');
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Reveal screen
// ---------------------------------------------------------------------------
export function drawReveal(g, t, game) {
  const fish = game.caught;
  if (!fish) return;
  const r = RARITY[fish.rarity];
  const { x, y, w, h } = REVEAL;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // dim the world
  g.globalAlpha = 0.62;
  R(g, 0, 0, W, H, '#100b18');
  g.globalAlpha = 1;

  const age = game.revealTime || 0;

  // tier-specific backdrop behind the card
  if (fish.rarity === 'Rare' || fish.rarity === 'Epic' || fish.rarity === 'Legendary') {
    const rays = fish.rarity === 'Legendary' ? 20 : 14;
    g.globalAlpha = 0.16;
    for (let i = 0; i < rays; i++) {
      const a = t * (fish.rarity === 'Legendary' ? 0.5 : 0.7) + (i / rays) * Math.PI * 2;
      for (let rr = 0; rr < 150; rr += 2) {
        R(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 2, r.color);
      }
    }
    g.globalAlpha = 1;
  }
  if (fish.rarity === 'Ancient') {
    // dark teal void with a slow ripple
    g.globalAlpha = 0.5;
    R(g, 0, 0, W, H, '#04161c');
    g.globalAlpha = 0.5;
    for (let i = 0; i < 7; i++) {
      const rr = ((t * 14 + i * 22) % 150);
      strokeEllipse(g, cx, cy, rr, rr * 0.55, r.glow);
    }
    g.globalAlpha = 1;
  }

  // card
  R(g, x + 2, y + 2, w, h, 'rgba(0,0,0,0.45)');
  R(g, x, y, w, h, fish.rarity === 'Ancient' ? '#071e24' : P.uiPanel2);
  // border & corner decoration vary by tier
  drawCardFrame(g, fish.rarity, x, y, w, h, t);

  // tier motif behind the fish
  drawTierMotif(g, fish.rarity, cx, cy - 8, t);

  // fish sprite
  const spr = getSprite(fish);
  const maxW = fish.rarity === 'Legendary' ? 150 : 132;
  const maxH = 66;
  let scale = Math.floor(Math.min(maxW / spr.width, maxH / spr.height));
  scale = Math.max(1, scale);
  const dw = spr.width * scale;
  const dh = spr.height * scale;
  const bob = Math.sin(t * 2) * (fish.ghost ? 2 : 1.2);
  const fx = Math.round(cx - dw / 2);
  const fy = Math.round(cy - 8 - dh / 2 + bob);

  if (fish.glow || fish.ghost) {
    g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3);
    circle(g, cx, cy - 8 + bob, Math.max(dw, dh) * 0.55, r.glow);
    g.globalAlpha = 1;
  }
  g.imageSmoothingEnabled = false;
  // shadow / pedestal
  g.globalAlpha = 0.25;
  for (let i = 0; i < dw; i++) {
    const yy = fy + dh + 2 + Math.round(Math.sin((i / dw) * Math.PI) * 2);
    R(g, fx + i, yy, 1, 2, '#000000');
  }
  g.globalAlpha = 1;
  g.drawImage(spr, fx, fy, dw, dh);

  // foreground tier particles
  drawRevealParticles(g, fish.rarity, cx, cy, t, game);

  // a flash on legendary / ancient
  if ((fish.rarity === 'Legendary' || fish.rarity === 'Ancient') && age < 0.5) {
    g.globalAlpha = (0.5 - age) * 1.2;
    R(g, 0, 0, W, H, '#ffffff');
    g.globalAlpha = 1;
  }
}

function drawCardFrame(g, rarity, x, y, w, h, t) {
  const col = RARITY[rarity].color;
  const dark = RARITY[rarity].glow;
  const t2 = 2;
  R(g, x, y, w, t2, col);
  R(g, x, y + h - t2, w, t2, col);
  R(g, x, y, t2, h, col);
  R(g, x + w - t2, y, t2, h, col);
  R(g, x, y, w, 1, '#ffffff');
  if (rarity === 'Common') {
    // plain: single inner hairline
    R(g, x + t2, y + t2, w - 4, 1, dark);
  } else if (rarity === 'Uncommon') {
    R(g, x + t2, y + t2, w - 4, 1, dark);
    for (const sx of [x + 6, x + w - 8]) {
      R(g, sx, y + 5, 2, 2, col);
      R(g, sx - 1, y + 7, 4, 1, dark);
      R(g, sx, y + 8, 2, 1, col);
    }
  } else if (rarity === 'Rare') {
    R(g, x + 1, y + 1, w - 2, 1, dark);
    R(g, x + 1, y + h - 2, w - 2, 1, dark);
    for (let i = 0; i < w; i += 8) {
      const b = Math.sin(t * 2 + i * 0.3) > 0 ? col : dark;
      R(g, x + i, y + 1, 2, 2, b);
      R(g, x + i, y + h - 3, 2, 2, b);
    }
  } else if (rarity === 'Epic') {
    R(g, x + 2, y + 2, w - 4, 1, dark);
    R(g, x + 2, y + h - 3, w - 4, 1, dark);
    for (const [cox, coy] of [[x, y], [x + w - 5, y], [x, y + h - 5], [x + w - 5, y + h - 5]]) {
      R(g, cox, coy, 5, 5, col);
      R(g, cox + 1, coy + 1, 3, 3, dark);
    }
    if (Math.sin(t * 4) > 0) R(g, x + Math.round(w / 2) - 3, y - 1, 6, 2, '#ffffff');
  } else if (rarity === 'Legendary') {
    for (let i = 0; i < w; i += 6) {
      R(g, x + i, y + 2, 3, 1, col);
      R(g, x + i + 2, y + h - 3, 3, 1, col);
    }
    for (let i = 0; i < h; i += 6) {
      R(g, x + 2, y + i, 1, 3, col);
      R(g, x + w - 3, y + i + 2, 1, 3, col);
    }
    for (const [cox, coy] of [[x, y], [x + w - 7, y], [x, y + h - 7], [x + w - 7, y + h - 7]]) {
      R(g, cox, coy, 7, 7, col);
      R(g, cox + 2, coy + 2, 3, 3, '#fff6d0');
    }
  } else if (rarity === 'Ancient') {
    // runic notches
    for (let i = 6; i < w - 6; i += 12) {
      const up = Math.sin(t * 1.5 + i) > 0;
      R(g, x + i, y + 1, 2, 2, col);
      R(g, x + i, y + h - 3, 2, 2, dark);
      R(g, x + i + (up ? 2 : -2), y + 3, 1, 1, col);
    }
    for (let i = 6; i < h - 6; i += 12) {
      R(g, x + 1, y + i, 2, 2, dark);
      R(g, x + w - 3, y + i, 2, 2, col);
    }
  }
}

function drawTierMotif(g, rarity, cx, cy, t) {
  if (rarity === 'Uncommon') {
    g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2);
    for (let i = 0; i < 12; i++) {
      const a = t * 0.8 + (i / 12) * Math.PI * 2;
      R(g, cx + Math.cos(a) * 58, cy + Math.sin(a) * 30, 1, 1, '#bff0c0');
    }
    g.globalAlpha = 1;
  } else if (rarity === 'Rare') {
    g.globalAlpha = 0.35;
    for (let i = 0; i < 4; i++) {
      const rr = 20 + ((t * 22 + i * 18) % 60);
      const xx = cx - 40 + i * 26;
      strokeEllipse(g, xx, cy + 26 - rr * 0.3, 2, 2, '#bfe0ff');
    }
    g.globalAlpha = 1;
  } else if (rarity === 'Epic') {
    g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3);
    circle(g, cx, cy, 46 + Math.sin(t * 2) * 3, '#c489ff');
    g.globalAlpha = 1;
  } else if (rarity === 'Legendary') {
    g.globalAlpha = 0.5;
    for (let i = 0; i < 14; i++) {
      const a = t * 0.6 + (i / 14) * Math.PI * 2;
      const rr = 50 + (i % 3) * 10;
      R(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7, 2, 2, '#fff0b0');
    }
    g.globalAlpha = 1;
  } else if (rarity === 'Ancient') {
    // rotating rune ring
    g.globalAlpha = 0.55;
    for (let i = 0; i < 16; i++) {
      const a = -t * 0.5 + (i / 16) * Math.PI * 2;
      const rr = 54;
      const gx = cx + Math.cos(a) * rr * 1.25;
      const gy = cy + Math.sin(a) * rr * 0.7;
      const w = (i % 3 === 0) ? 3 : 1;
      R(g, gx, gy, w, 1, '#7dffe8');
      if (i % 2 === 0) R(g, gx, gy + 1, 1, 1, '#2fd0c0');
    }
    g.globalAlpha = 1;
  }
}

function drawRevealParticles(g, rarity, cx, cy, t, game) {
  const rank = RARITY[rarity].rank;
  if (rank === 0) return;
  const count = rank * 6;
  const col = RARITY[rarity].color;
  for (let i = 0; i < count; i++) {
    const seed = i * 53 + rank * 7;
    const life = ((t * 0.5 + hash(seed, 1)) % 1);
    const x = cx + (hash(seed, 2) - 0.5) * 150;
    const y = cy + 50 - life * 90;
    g.globalAlpha = (1 - life) * 0.9;
    const s = rank >= 4 ? 2 : 1;
    R(g, x, y, s, s, i % 3 === 0 ? '#ffffff' : col);
  }
  if (rarity === 'Ancient') {
    // rising wisps
    for (let i = 0; i < 8; i++) {
      const life = ((t * 0.4 + i / 8) % 1);
      const x = cx + Math.sin((i + t) * 1.3) * 30;
      const y = cy + 40 - life * 70;
      g.globalAlpha = (1 - life) * 0.6;
      R(g, x, y, 2, 2, '#7dffe8');
    }
  }
  g.globalAlpha = 1;
}
