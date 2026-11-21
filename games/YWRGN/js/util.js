/* util.js - small pixel drawing helpers. All shapes are axis aligned so
   nothing is anti-aliased; the result stays crisp when scaled 4x. */
(function () {
  const U = {};

  U.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.rect = function (ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Crisp filled ellipse built from 1px tall rows.
  U.ellipse = function (ctx, cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    if (rx <= 0 || ry <= 0) return;
    const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) / ry;
      const s = 1 - dy * dy;
      if (s < 0) continue;
      const dx = Math.sqrt(s) * rx;
      const xa = Math.round(cx - dx), xb = Math.round(cx + dx);
      if (xb >= xa) ctx.fillRect(xa, y, xb - xa + 1, 1);
    }
  };

  // Crisp half (or capped) ellipse; used for tree canopies and bushes.
  U.ellipseTop = function (ctx, cx, cy, rx, ry, c, from, to) {
    ctx.fillStyle = c;
    const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
    for (let y = y0; y <= y1; y++) {
      if (y < from || y > to) continue;
      const dy = (y - cy) / ry;
      const s = 1 - dy * dy;
      if (s < 0) continue;
      const dx = Math.sqrt(s) * rx;
      const xa = Math.round(cx - dx), xb = Math.round(cx + dx);
      if (xb >= xa) ctx.fillRect(xa, y, xb - xa + 1, 1);
    }
  };

  U.lerp = (a, b, t) => a + (b - a) * t;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // simple deterministic hash -> [0,1)
  U.hash = function (n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  window.FishUtil = U;
})();
