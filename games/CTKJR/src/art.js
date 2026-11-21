// All scene artwork is generated procedurally from code. No image assets.

export const W = 320;
export const H = 180;

// ---------------------------------------------------------------------------
// deterministic noise helpers
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y) {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
function bayer(x, y) { return BAYER[y & 3][x & 3] / 16; }

// ---------------------------------------------------------------------------
// shoreline definitions (y = shore line)
// ---------------------------------------------------------------------------
export function farShore(x) {
  return Math.round(15 + 3 * Math.sin(x * 0.05) + 2.5 * Math.sin(x * 0.13 + 1.1));
}
export function nearShore(x) {
  if (x > 176) return 999;
  const t = clamp(x / 176, 0, 1);
  return Math.round(66 + 122 * Math.pow(t, 1.30));
}
export function isWater(x, y) {
  return y > farShore(x) && y < nearShore(x);
}

// ---------------------------------------------------------------------------
// pixel primitives
// ---------------------------------------------------------------------------
export function circlePix(ctx, cx, cy, r, color, alpha = 1) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.fillStyle = color;
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r2) ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
  ctx.globalAlpha = prev;
}

export function linePix(ctx, x0, y0, x1, y1, color, alpha = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 600; guard++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  ctx.globalAlpha = prev;
}

// ---------------------------------------------------------------------------
// background (static terrain). Rendered once into an offscreen canvas.
// ---------------------------------------------------------------------------
const WATER = [
  [141, 214, 205], [104, 182, 186], [70, 150, 160],
  [48, 118, 134], [32, 90, 108], [23, 68, 85],
];
const SAND = [[235, 216, 162], [221, 197, 138], [203, 175, 112]];
const NEARGRASS = [[128, 176, 86], [108, 156, 72], [90, 134, 58], [73, 112, 48]];
const FARGRASS = [[78, 118, 82], [64, 100, 72], [52, 84, 64], [42, 70, 58]];

function pick(pal, t, x, y) {
  let v = clamp(t, 0, 1) * (pal.length - 1);
  let i = Math.floor(v);
  const f = v - i;
  if (f > bayer(x, y)) i += 1;
  i = clamp(i, 0, pal.length - 1);
  return pal[i];
}

export function buildBackground() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fY = farShore(x);
      const nY = nearShore(x);
      let rgb;
      const n = hash2(x * 0.7, y * 0.7);

      if (y < fY) {
        // far land (distant bank)
        const depth = fY - y;
        if (depth < 3) rgb = pick(SAND, 0.2 + n * 0.2, x, y);
        else {
          const g = 1 - clamp((y) / 40, 0, 1);
          rgb = pick(FARGRASS, clamp(g * 0.9 + n * 0.25, 0, 1), x, y);
        }
      } else if (y > nY) {
        // near land
        const depth = y - nY;
        if (depth < 5) rgb = pick(SAND, 0.15 + n * 0.35, x, y);
        else if (depth < 9) {
          const t = (depth - 5) / 4 + n * 0.3;
          rgb = t > bayer(x, y) ? pick(NEARGRASS, 0.15, x, y) : pick(SAND, 0.55, x, y);
        } else {
          const g = clamp(0.35 + n * 0.5 + depth / 400, 0, 1);
          rgb = pick(NEARGRASS, g, x, y);
        }
      } else {
        // water: deep in the middle, lighter near either shore
        const dFar = y - fY;
        const dNear = nY - y;
        const dist = Math.min(dFar, dNear);
        let depth = clamp(dist / 58, 0, 1);
        depth += (n - 0.5) * 0.13;
        rgb = pick(WATER, depth, x, y);
      }

      const i = (y * W + x) * 4;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  decorate(ctx);
  return cv;
}

function canopy(ctx, cx, cy, r, cols, rnd) {
  circlePix(ctx, cx + 1, cy + 2, r, '#22303a', 0.28);
  circlePix(ctx, cx, cy, r, cols[0]);
  circlePix(ctx, cx - Math.max(1, (r / 3) | 0), cy - Math.max(1, (r / 3) | 0), Math.max(1, r - 2), cols[1]);
  const specks = 3 + ((r * 0.6) | 0);
  for (let i = 0; i < specks; i++) {
    const a = rnd() * Math.PI * 2, rr = rnd() * (r - 1);
    circlePix(ctx, cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), 1, cols[2], 0.9);
  }
}

function tuft(ctx, x, y, rnd, colors) {
  const blades = 3 + ((rnd() * 3) | 0);
  for (let i = 0; i < blades; i++) {
    const h = 2 + ((rnd() * 3) | 0);
    const bx = x + i - ((blades / 2) | 0);
    linePix(ctx, bx, y, bx + (rnd() < 0.5 ? 0 : (rnd() < 0.5 ? -1 : 1)), y - h, colors[(rnd() * colors.length) | 0]);
  }
}

function rock(ctx, x, y, r, rnd) {
  circlePix(ctx, x + 1, y + 1, r, '#2a3138', 0.3);
  circlePix(ctx, x, y, r, '#8b929b');
  circlePix(ctx, x - 1, y - 1, Math.max(1, r - 2), '#a9b0b8');
  circlePix(ctx, x + 1, y + 1, 1, '#6d747d');
}

function decorNear(ctx, rnd) {
  // big shade trees on the left bank
  for (const t of [{ x: 22, y: 74, r: 17 }, { x: 60, y: 92, r: 14 }, { x: 8, y: 108, r: 12 }]) {
    canopy(ctx, t.x, t.y, t.r, ['#2f4f30', '#3f6b3a', '#5c9150'], rnd);
  }
  // bushes along the water line
  for (const b of [{ x: 96, y: 118, r: 8 }, { x: 128, y: 141, r: 9 }, { x: 44, y: 96, r: 7 }, { x: 158, y: 168, r: 8 }]) {
    canopy(ctx, b.x, b.y, b.r, ['#33562f', '#487a3c', '#67a052'], rnd);
  }
  // grass tufts
  for (let i = 0; i < 26; i++) {
    const x = 2 + ((rnd() * 168) | 0);
    const nY = nearShore(x);
    if (nY > H + 10) continue;
    const y = Math.min(H - 1, nY + 6 + ((rnd() * 26) | 0));
    tuft(ctx, x, y, rnd, ['#7fae54', '#9cc468', '#5f8c3e']);
  }
  // rocks
  for (const r of [{ x: 52, y: 108, r: 4 }, { x: 88, y: 128, r: 3 }, { x: 145, y: 162, r: 4 }, { x: 12, y: 96, r: 5 }]) {
    rock(ctx, r.x, r.y, r.r, rnd);
  }
  // cattails near the water edge
  for (const c of [{ x: 104, y: 122 }, { x: 110, y: 126 }, { x: 136, y: 146 }, { x: 142, y: 150 }]) {
    linePix(ctx, c.x, c.y, c.x, c.y - 12, '#4f7a3a');
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(c.x - 1, c.y - 16, 2, 5);
  }
}

function decorFar(ctx, rnd) {
  // silhouette-ish tree line across the top
  for (let x = 2; x < W; x += 12 + ((rnd() * 10) | 0)) {
    const fY = farShore(x);
    const cy = clamp(fY - 3 - ((rnd() * 6) | 0), 1, fY);
    const r = 4 + ((rnd() * 5) | 0);
    canopy(ctx, x, cy, r, ['#2c4a3a', '#3a6045', '#4f7d55'], rnd);
  }
  // rocks + reeds on the far shoreline
  for (let i = 0; i < 22; i++) {
    const x = (rnd() * W) | 0;
    const fY = farShore(x);
    if (rnd() < 0.5) rock(ctx, x, fY - 1, 2 + ((rnd() * 2) | 0), rnd);
    else tuft(ctx, x, fY + 1, rnd, ['#4f7a4a', '#5f8c52']);
  }
}

function lilyPad(ctx, x, y, r) {
  circlePix(ctx, x + 1, y + 1, r, '#20323a', 0.25);
  circlePix(ctx, x, y, r, '#3f7a3c');
  circlePix(ctx, x - 1, y - 1, Math.max(1, r - 1), '#5aa04a');
  // notch
  ctx.fillStyle = '#2e6a4f';
  ctx.fillRect(x + r - 2, y - 1, 2, 2);
}

function dock(ctx) {
  const X0 = 8, X1 = 154, Y0 = 103, Y1 = 126;
  // shadow on the water
  ctx.fillStyle = '#12303e';
  ctx.globalAlpha = 0.35;
  ctx.fillRect(X0 + 3, Y1 + 1, X1 - X0, 6);
  ctx.globalAlpha = 1;
  // posts reaching into the water
  for (const px of [30, 62, 96, 132]) {
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(px, Y1, 4, 9);
    ctx.fillStyle = '#2f2014';
    ctx.fillRect(px, Y1 + 7, 4, 2);
  }
  // planks (boards run across the walkway)
  for (let x = X0; x < X1; x += 5) {
    const shade = hash2(x, 3);
    const base = shade < 0.34 ? '#8a5a34' : shade < 0.67 ? '#96633a' : '#7c4f2c';
    ctx.fillStyle = base;
    ctx.fillRect(x, Y0, 4, Y1 - Y0);
    ctx.fillStyle = '#a9723f';
    ctx.fillRect(x, Y0 + 1, 4, 2);
    ctx.fillStyle = '#54331b';
    ctx.fillRect(x + 4, Y0, 1, Y1 - Y0);
    // wood grain flecks
    ctx.fillStyle = '#6a4223';
    ctx.fillRect(x + 1, Y0 + 6 + ((hash2(x, 9) * 8) | 0), 2, 1);
  }
  // rails / edge trim
  ctx.fillStyle = '#5b3a20';
  ctx.fillRect(X0, Y0, X1 - X0, 2);
  ctx.fillStyle = '#3d2614';
  ctx.fillRect(X0, Y1 - 2, X1 - X0, 2);
  // a lantern post for cozy detail
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(146, Y0 - 20, 3, 20);
  ctx.fillStyle = '#2a1e14';
  ctx.fillRect(143, Y0 - 22, 9, 3);
  ctx.fillStyle = '#f2d98a';
  ctx.fillRect(146, Y0 - 18, 3, 4);
  ctx.fillStyle = '#c9a84a';
  ctx.fillRect(145, Y0 - 19, 5, 6);
  ctx.fillStyle = '#f2d98a';
  ctx.fillRect(146, Y0 - 18, 3, 4);
}

function decorate(ctx) {
  const rnd = mulberry32(1337);
  decorFar(ctx, rnd);
  // lily pads in the calm lower-right water
  for (const p of [{ x: 196, y: 150, r: 6 }, { x: 224, y: 162, r: 7 }, { x: 250, y: 148, r: 5 }, { x: 276, y: 166, r: 6 }, { x: 300, y: 152, r: 5 }]) {
    lilyPad(ctx, p.x, p.y, p.r);
  }
  decorNear(ctx, rnd);
  dock(ctx);
}

// ---------------------------------------------------------------------------
// animated water highlights
// ---------------------------------------------------------------------------
export function drawAmbientLife(ctx, t) {
  for (let i = 0; i < 3; i++) {
    const x = 158 + ((t * (9 + i * 4) + i * 110) % 152);
    const y = 58 + i * 26 + Math.sin(t * 0.6 + i * 1.7) * 9;
    if (!isWater(x, y) || !isWater(x + 8, y)) continue;
    drawFishShadow(ctx, x, y, 5 + i * 2);
  }
}

export function drawWaterMotion(ctx, t) {
  for (let y = farShore(160) + 3; y < H; y += 5) {
    for (let k = 0; k < 6; k++) {
      const seed = hash2(k * 17.3, y * 4.1);
      const speed = 5 + seed * 9;
      const span = 380;
      const x = ((seed * span + t * speed) % span) - 24;
      const len = 4 + Math.floor(seed * 7);
      if (!isWater(x, y) || !isWater(x + len, y)) {
        // try a shifted copy so ripples still appear on the right
        const x2 = x + 120;
        if (isWater(x2, y)) {
          ctx.globalAlpha = 0.08 + 0.05 * (0.5 + 0.5 * Math.sin(t * 2 + seed * 9));
          ctx.fillStyle = '#d8f4ee';
          ctx.fillRect(Math.round(x2), y, len, 1);
          ctx.globalAlpha = 1;
        }
        continue;
      }
      ctx.globalAlpha = 0.09 + 0.06 * (0.5 + 0.5 * Math.sin(t * 2 + seed * 9));
      ctx.fillStyle = '#d8f4ee';
      ctx.fillRect(Math.round(x), y, len, 1);
      ctx.globalAlpha = 1;
    }
  }
  // drifting petals / leaves on the surface
  for (let i = 0; i < 6; i++) {
    const seed = hash2(i * 5.7, 3.3);
    const y = 40 + seed * 105;
    const x = ((seed * 420 + t * (3 + seed * 5)) % 440) - 40;
    if (!isWater(x, y) || !isWater(x + 2, y)) continue;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = i % 2 ? '#6fae4a' : '#d9b45a';
    ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1);
    ctx.globalAlpha = 1;
  }

  // twinkles
  for (let i = 0; i < 14; i++) {
    const x = 150 + ((hash2(i * 3.7, 9.1) * 165) | 0);
    const y = 30 + ((hash2(i * 8.3, 2.2) * 140) | 0);
    if (!isWater(x, y)) continue;
    const a = Math.max(0, Math.sin(t * 1.6 + i * 1.7));
    if (a > 0.55) {
      ctx.globalAlpha = (a - 0.55) * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

// A dark, soft silhouette of a fish gliding under the surface.
export function drawFishShadow(ctx, x, y, s) {
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#0a2029';
  for (let dx = -s; dx <= s; dx++) {
    const hh = Math.round(s * 0.38 * Math.sqrt(Math.max(0, 1 - (dx / s) * (dx / s))));
    ctx.fillRect(Math.round(x + dx), Math.round(y - hh), 1, hh * 2 + 1);
  }
  // tail
  ctx.fillRect(Math.round(x - s - 2), Math.round(y - 1), 3, 3);
  ctx.fillRect(Math.round(x - s - 1), Math.round(y - 2), 2, 5);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// the angler
// ---------------------------------------------------------------------------
export const ANGLER = { x: 114, y: 112 };

// returns the rod tip for a given pose
export function rodTip(pose, castT, reelT, t) {
  const ax = ANGLER.x, ay = ANGLER.y;
  if (pose === 'cast') {
    const p = clamp(castT / 0.30, 0, 1);
    const ease = 1 - Math.pow(1 - p, 2);
    const backX = ax - 4, backY = ay - 20;
    const fwdX = ax + 20, fwdY = ay - 27;
    return { x: lerp(backX, fwdX, ease), y: lerp(backY, fwdY, ease) };
  }
  if (pose === 'reel') {
    const p = clamp(reelT / 1.2, 0, 1);
    const bend = Math.sin(Math.min(1, p) * Math.PI) * 3;
    return { x: ax + 11, y: ay - 20 + bend };
  }
  // idle / waiting: slight breathing wobble
  return { x: ax + 19, y: ay - 26 + Math.round(Math.sin(t * 1.4)) };
}

export function drawAngler(ctx, t, pose) {
  const x = ANGLER.x, y = ANGLER.y;
  const breath = Math.round(Math.sin(t * 1.4) * 0.5) === 0 ? 0 : -0;
  // shadow
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#0d2028';
  for (let dx = -6; dx <= 6; dx++) {
    const hh = Math.max(0, 2 - Math.abs(dx) * 0.35);
    ctx.fillRect(x + dx, y - Math.round(hh), 1, Math.round(hh * 2) + 1);
  }
  ctx.globalAlpha = 1;

  const SKIN = '#e8b98a', SKIN_D = '#c9926a';
  const SHIRT = '#4f86b3', SHIRT_D = '#39648c';
  const PANT = '#6b4a2e', PANT_D = '#503519';
  const BOOT = '#3a2a1a';
  const STRAW = '#d9b559', STRAW_D = '#b58f3a', BAND = '#8a5a34';

  const yy = y + breath;
  // legs
  ctx.fillStyle = PANT; ctx.fillRect(x - 4, yy - 7, 3, 6);
  ctx.fillStyle = PANT_D; ctx.fillRect(x + 1, yy - 7, 3, 6);
  ctx.fillStyle = BOOT; ctx.fillRect(x - 4, yy - 2, 3, 2);
  ctx.fillStyle = '#2a1e12'; ctx.fillRect(x + 1, yy - 2, 3, 2);
  // torso
  ctx.fillStyle = SHIRT; ctx.fillRect(x - 4, yy - 14, 8, 8);
  ctx.fillStyle = SHIRT_D; ctx.fillRect(x - 4, yy - 8, 8, 2);
  // overall straps / vest
  ctx.fillStyle = '#3f6b46'; ctx.fillRect(x - 4, yy - 14, 2, 8);
  ctx.fillStyle = '#4e7f54'; ctx.fillRect(x + 2, yy - 14, 2, 8);
  // arm holding rod (front/right)
  ctx.fillStyle = SKIN; ctx.fillRect(x + 3, yy - 13, 3, 3);
  // backpack / creel detail
  ctx.fillStyle = '#7a5a34'; ctx.fillRect(x - 6, yy - 12, 2, 5);
  // head
  ctx.fillStyle = SKIN; ctx.fillRect(x - 3, yy - 20, 6, 7);
  ctx.fillStyle = SKIN_D; ctx.fillRect(x - 3, yy - 15, 6, 2);
  // eye + cheek
  ctx.fillStyle = '#23303a'; ctx.fillRect(x + 1, yy - 18, 1, 2);
  ctx.fillStyle = '#d98f6a'; ctx.fillRect(x + 2, yy - 15, 1, 1);
  // hat
  ctx.fillStyle = STRAW_D; ctx.fillRect(x - 6, yy - 21, 12, 2);
  ctx.fillStyle = STRAW; ctx.fillRect(x - 6, yy - 22, 12, 1);
  ctx.fillStyle = STRAW; ctx.fillRect(x - 4, yy - 24, 8, 3);
  ctx.fillStyle = STRAW_D; ctx.fillRect(x - 4, yy - 22, 8, 1);
  ctx.fillStyle = BAND; ctx.fillRect(x - 4, yy - 23, 8, 1);
  ctx.fillStyle = '#f0d98a'; ctx.fillRect(x + 2, yy - 24, 1, 1);
}

// ---------------------------------------------------------------------------
// bobber + bite cue + splash
// ---------------------------------------------------------------------------
export function drawBobber(ctx, x, y, dip, t) {
  const yy = Math.round(y + dip + Math.sin(t * 2.2) * 0.5);
  // shadow / reflection
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#0d2028';
  ctx.fillRect(Math.round(x) - 1, yy + 3, 4, 1);
  ctx.globalAlpha = 1;
  // body
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(Math.round(x) - 1, yy - 1, 4, 4);
  ctx.fillStyle = '#e0473f';
  ctx.fillRect(Math.round(x) - 1, yy - 1, 4, 2);
  ctx.fillStyle = '#8c2320';
  ctx.fillRect(Math.round(x) - 1, yy + 1, 4, 1);
  // antenna
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(Math.round(x) + 1, yy - 4, 1, 3);
  ctx.fillStyle = '#f2d98a';
  ctx.fillRect(Math.round(x) + 1, yy - 5, 1, 1);
}

export function drawBiteCue(ctx, x, y, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 14);
  const bx = Math.round(x), by = Math.round(y) - 18 - Math.round(pulse * 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1a1010';
  ctx.fillRect(bx - 2, by - 1, 6, 11);
  ctx.fillStyle = pulse > 0.5 ? '#ffe14a' : '#ff8a2a';
  ctx.fillRect(bx, by, 2, 6);
  ctx.fillRect(bx, by + 8, 2, 2);
  ctx.globalAlpha = 1;
}

export function drawRings(ctx, x, y, phase, color = '#e8fbf5') {
  // phase in [0,1) expanding ring
  for (let i = 0; i < 3; i++) {
    const p = (phase + i / 3) % 1;
    const r = 3 + p * 9;
    const a = (1 - p) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    const rr = Math.round(r);
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const px = Math.round(x + Math.cos(ang) * rr);
      const py = Math.round(y + Math.sin(ang) * rr * 0.45);
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

export function drawSplash(ctx, x, y, t) {
  // t from 0..1
  const a = 1 - t;
  if (a <= 0) return;
  ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = '#eafbf5';
  const spread = Math.round(2 + t * 10);
  for (let k = -spread; k <= spread; k++) {
    const yy = Math.round(y - Math.abs(k) * 0.6 - (1 - t) * 2);
    if (hash2(k * 3.3, x) > 0.3) ctx.fillRect(x + k, yy, 1, 1);
    if (hash2(k * 1.7, y) > 0.6) ctx.fillRect(x + k, yy + 1, 1, 1);
  }
  ctx.globalAlpha = 1;
}
