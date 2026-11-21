// draw.js — tiny pixel drawing toolkit. Everything is drawn on integer
// coordinates so the 320x180 buffer stays crisp when scaled 4x.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Draw a sprite from an array of strings. Chars index into `pal`,
// '.' and ' ' are transparent.
export function sprite(ctx, map, pal, x, y, flipX = false) {
  const h = map.length;
  for (let j = 0; j < h; j++) {
    const row = map[j];
    const w = row.length;
    for (let i = 0; i < w; i++) {
      const c = row[i];
      if (c === '.' || c === ' ') continue;
      const col = pal[c];
      if (!col) continue;
      const px = flipX ? x + (w - 1 - i) : x + i;
      ctx.fillStyle = col;
      ctx.fillRect(px | 0, y + j | 0, 1, 1);
    }
  }
}

export function px(ctx, x, y, col) {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function rect(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// integer Bresenham line
export function line(ctx, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = col;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// thick line drawn as a row of small squares (keeps a chunky pixel look)
export function thickLine(ctx, x0, y0, x1, y1, col, w = 2) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
  const o = Math.floor((w - 1) / 2);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    rect(ctx, lerp(x0, x1, t) - o, lerp(y0, y1, t) - o, w, w, col);
  }
}

// filled ellipse on integer pixels
export function ellipse(ctx, cx, cy, rx, ry, col) {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const hw = Math.round(rx * Math.sqrt(t));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
  }
}

// filled circle
export function circle(ctx, cx, cy, r, col) {
  ellipse(ctx, cx, cy, r, r, col);
}

// soft translucent ellipse (for shadows / glows), stepped alpha
export function softShadow(ctx, cx, cy, rx, ry, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0a1a1e';
  ellipse(ctx, cx, cy, rx, ry, '#0a1a1e');
  ctx.restore();
}

// a wobbly closed coastline path helper: given a base x/y and a noise
// function, returns a point.
export function wobble(base, amp, u, seedOffset = 0) {
  return base + Math.sin(u * 0.09 + seedOffset) * amp + Math.sin(u * 0.23 + seedOffset * 2.7) * amp * 0.4;
}
