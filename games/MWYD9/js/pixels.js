// Low-level integer pixel drawing helpers. Everything snaps to whole logical pixels.

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function painter(ctx) {
  const api = {
    ctx,
    clear() { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); },
    px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); },
    rect(x, y, w, h, c) {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      ctx.fillStyle = c;
      for (;;) {
        ctx.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    },
    ellipse(cx, cy, rx, ry, c) {
      ctx.fillStyle = c;
      for (let y = -ry; y <= ry; y++) {
        const t = 1 - (y * y) / (ry * ry);
        if (t < 0) continue;
        const xr = Math.floor(rx * Math.sqrt(t) + 0.0001);
        ctx.fillRect(Math.round(cx - xr), Math.round(cy + y), 2 * xr + 1, 1);
      }
    },
    circle(cx, cy, r, c) { api.ellipse(cx, cy, r, r, c); },
    // two-tone checker dither inside a rect
    dither(x, y, w, h, a, b, scale = 1) {
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const on = ((Math.floor(i / scale) + Math.floor(j / scale)) & 1) === 0;
          ctx.fillStyle = on ? a : b;
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    },
    // soft dithered vertical gradient between two colors over height h
    gradV(x, y, w, h, top, bottom) {
      for (let j = 0; j < h; j++) {
        const t = h <= 1 ? 0 : j / (h - 1);
        for (let i = 0; i < w; i++) {
          const n = ((i * 7 + j * 13) % 16) / 16;
          const useTop = t + (n - 0.5) * (1 / h) < 0.5;
          ctx.fillStyle = useTop ? top : bottom;
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    },
  };
  return api;
}

// Adds a 1px dark outline around every opaque pixel of a sprite canvas.
export function addOutline(spr, color) {
  const { width: w, height: h } = spr;
  const src = spr.getContext('2d').getImageData(0, 0, w, h).data;
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
  const out = createCanvas(w, h);
  const octx = out.getContext('2d');
  octx.drawImage(spr, 0, 0);
  octx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) > 0) continue;
      if (alphaAt(x - 1, y) > 0 || alphaAt(x + 1, y) > 0 || alphaAt(x, y - 1) > 0 || alphaAt(x, y + 1) > 0) {
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  return out;
}

// deterministic-ish pseudo random
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
