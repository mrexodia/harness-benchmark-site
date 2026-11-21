/* ============================================================
   Driftwood Bay — all artwork is drawn procedurally in code.
   No image files, fonts, emoji or external assets are used.
   ============================================================ */
(function () {
  'use strict';

  const W = 320, H = 180;
  const HORIZON = 74;
  const DOCK_TOP = 116;
  const AX = 88;               // angler x
  const DECK = 116;            // angler feet y

  // ---------------------------------------------------------- palette
  const P = {
    sky: ['#1b3557', '#2f5a86', '#5d8db2', '#93bccb', '#c9d9cf', '#f0d49f'],
    sun: '#fff3c9', sun2: '#ffd27a', sunGlow: '#ffcf7d',
    farLand: '#3a6b5e', farLand2: '#2f5a52', farHaze: '#8fb7b1',
    hill: '#4f8358', hill2: '#3f6c49',
    water: ['#8fc3c4', '#5da3a8', '#2f7286', '#1e5068', '#153c52'],
    waterHi: '#cdeee6', sparkle: '#ffffff',
    wood: { out: '#3a2716', dark: '#4f3620', mid: '#6b4a2b', light: '#8a6238', top: '#a67c48', hi: '#c39a63' },
    grass: ['#2f5a2e', '#3f7a38', '#5a9c42', '#84bd58'],
    leaf: ['#24512f', '#316b38', '#458a44', '#6fb055', '#9ccf6f'],
    flower: ['#e8849b', '#ffd46b', '#f4f0e0', '#c98fe0'],
    skin: '#f0c39a', skin2: '#d99f74', hat: '#d9b45c', hat2: '#b8903f',
    shirt: '#cf6b5a', shirt2: '#a94f43', pants: '#4a5a78', pants2: '#37445c',
    boot: '#3a2c22', rod: '#6b4a2b', rodHi: '#9a7040',
    line: '#f2f0e0', bobber: '#e6483a', bobberW: '#f6f2e6',
    ripple: 'rgba(207,238,230,0.55)',
    dim: 'rgba(8,16,22,0.55)'
  };

  // ---------------------------------------------------------- helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')';
  }
  function mixHex(a, b, t) { return mix(a, b, t); }

  function banded(ctx, x, y, w, h, stops) {
    // stops: array of colors, evenly distributed vertically
    for (let i = 0; i < h; i++) {
      const p = h <= 1 ? 0 : i / (h - 1);
      const f = p * (stops.length - 1);
      const idx = Math.min(stops.length - 2, Math.floor(f));
      ctx.fillStyle = mix(stops[idx], stops[Math.min(stops.length - 1, idx + 1)], f - idx);
      ctx.fillRect(x, y + i, w, 1);
    }
  }

  function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); }
  function rc(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function disc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const s = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      ctx.fillRect(Math.round(cx - s), Math.round(cy + y), s * 2 + 1, 1);
    }
  }
  function ellip(ctx, cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const k = Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)));
      const s = Math.round(rx * k);
      if (s >= 0) ctx.fillRect(Math.round(cx - s), Math.round(cy + y), s * 2 + 1, 1);
    }
  }
  function linePx(ctx, x0, y0, x1, y1, c) {
    ctx.fillStyle = c;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (let guard = 0; guard < 4000; guard++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function ringPx(ctx, cx, cy, rx, ry, c) {
    const steps = Math.max(12, Math.round((rx + ry) * 2.2));
    let px0 = null, py0 = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx);
      const y = Math.round(cy + Math.sin(a) * ry);
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
      if (px0 !== null) linePx(ctx, px0, py0, x, y, c);
      px0 = x; py0 = y;
    }
  }
  function tri(ctx, ax, ay, bx, by, cx, cy, c) {
    ctx.fillStyle = c;
    const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
        const w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
        if (w0 >= -0.02 && w1 >= -0.02 && w0 + w1 <= 1.02) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // ============================================================
  //  FISH SPRITES
  // ============================================================
  const { RARITIES, FISH, PROFILES } = window.FishingData;
  const fishCache = new Map();

  function finScan(ctx, pts, color, outline) {
    // pts: flat array of [x,y] polygon; scanline fill + 1px outline
    const n = pts.length / 2;
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (let i = 0; i < n; i++) { minx = Math.min(minx, pts[i * 2]); maxx = Math.max(maxx, pts[i * 2]); miny = Math.min(miny, pts[i * 2 + 1]); maxy = Math.max(maxy, pts[i * 2 + 1]); }
    ctx.fillStyle = outline;
    for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++)
      for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++)
        if (insidePoly(x, y, pts, n)) ctx.fillRect(x - 1, y - 1, 3, 3); // thick outline
    ctx.fillStyle = color;
    for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++)
      for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++)
        if (insidePoly(x, y, pts, n)) ctx.fillRect(x, y, 1, 1);
  }
  function insidePoly(x, y, pts, n) {
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function drawFish(ctx, f, W2, H2, t) {
    t = t || 0;
    const c = f.colors;
    const len = f.len, hgt = f.hgt;
    const x0 = Math.max(8, (f.tailSize || 0) + 4);   // tail end
    const x1 = x0 + len;                // snout
    const yc = Math.round((H2 - 4) / 2);
    const prof = PROFILES[f.profile] || PROFILES.slim;
    const half = i => Math.max(1, hgt * 0.5 * (prof(i / len)) * (f.fat * 2) * 0.5 + 1);

    const tailX = x0, tailY = yc;
    // ---- tail ----
    const ts = f.tailSize;
    if (f.tail === 'fork') {
      finScan(ctx, [tailX + 2, tailY, tailX - ts, tailY - ts, tailX - ts * 0.3, tailY, tailX - ts, tailY + ts], c.fin, c.out);
    } else if (f.tail === 'fan') {
      finScan(ctx, [tailX + 3, tailY - hgt * 0.18, tailX - ts, tailY - ts, tailX - ts - 2, tailY, tailX - ts, tailY + ts, tailX + 3, tailY + hgt * 0.18], c.fin, c.out);
    } else if (f.tail === 'crescent') {
      finScan(ctx, [tailX + 3, tailY, tailX - ts, tailY - ts - 1, tailX - ts * 0.55, tailY, tailX - ts, tailY + ts + 1], c.fin, c.out);
    } else if (f.tail === 'whale') {
      finScan(ctx, [tailX + 3, tailY, tailX - ts, tailY - ts * 0.9, tailX - ts * 0.7, tailY + 1, tailX - ts, tailY + ts * 0.9], c.fin, c.out);
    }

    // ---- dorsal / sail ----
    const dpos = (f.dorsalPos || 0.4) * len + x0;
    const dh = f.dorsal || 6;
    const dprof = prof((dpos - x0) / len);
    const back = yc - hgt * 0.5 * dprof * (f.fat * 2) * 0.5 - 1;
    if (f.sail) {
      finScan(ctx, [dpos - dh, back + 2, dpos - dh * 0.4, back - dh, dpos + dh * 0.4, back - dh * 1.1, dpos + dh, back + 2], c.fin, c.out);
    } else {
      finScan(ctx, [dpos - dh, back + 1, dpos - dh * 0.2, back - dh, dpos + dh * 0.7, back - dh * 0.6, dpos + dh, back + 1], c.fin, c.out);
    }
    if (f.rearDorsal) {
      const rp = f.rearDorsal * len + x0;
      const rp2 = prof((rp - x0) / len);
      const back2 = yc - hgt * 0.5 * rp2 * (f.fat * 2) * 0.5 - 1;
      finScan(ctx, [rp - 4, back2 + 1, rp, back2 - 5, rp + 4, back2 + 1], c.fin2, c.out);
    }
    // ---- pectoral ----
    const ppx = x0 + len * 0.66;
    const pprof = prof((ppx - x0) / len);
    const pby = yc + hgt * 0.5 * pprof * (f.fat * 2) * 0.5;
    finScan(ctx, [ppx, pby - 2, ppx + 5, pby + 3, ppx - 2, pby + 2], c.fin2, c.out);
    if (f.flowing) {
      finScan(ctx, [ppx + 2, pby, ppx + 10, pby + 8, ppx + 2, pby + 5], c.fin, c.out);
      finScan(ctx, [x0 + len * 0.5, pby, x0 + len * 0.5 - 4, pby + 8, x0 + len * 0.5 + 3, pby + 5], c.fin, c.out);
    }

    // ---- body outline ----
    for (let i = -1; i <= len; i++) {
      const hh = half(clamp(i, 0, len));
      const x = x0 + i;
      rc(ctx, x, yc - hh - 1, 1, hh * 2 + 3, c.out);
    }
    // ---- body fill ----
    for (let i = 0; i < len; i++) {
      const hh = half(i);
      const x = x0 + i;
      const yi0 = Math.ceil(-hh), yi1 = Math.floor(hh);
      for (let y = yi0; y <= yi1; y++) {
        let col = c.body;
        if (y > hh * 0.15) col = c.belly;
        if (y > hh * 0.72) col = mix(c.belly, '#ffffff', 0.25);
        // top rim darker
        if (y < -hh * 0.72) col = mix(c.body, c.out, 0.28);
        ctx.fillStyle = col;
        ctx.fillRect(x, yc + y, 1, 1);
      }
    }

    // ---- patterns ----
    const pat = f.pattern;
    for (let i = 0; i < len; i++) {
      const hh = half(i);
      const x = x0 + i;
      const yi0 = Math.ceil(-hh) + 1, yi1 = Math.floor(hh) - 1;
      for (let y = yi0; y <= yi1; y++) {
        const u = i / len, v = y / hh;
        let col = null;
        if (pat === 'bands') { if ((i % 8) < 3 && y < hh * 0.4) col = mix(c.body, c.out, 0.35); }
        else if (pat === 'bars') { if (i > len * 0.35 && (i % 11) < 3) col = c.pattern; }
        else if (pat === 'spots') {
          const hh2 = hash(i * 3.1 + y * 7.7);
          if (hh2 > 0.86 && y < hh * 0.35 && i < len * 0.92) col = c.pattern;
        }
        else if (pat === 'scutes') {
          if (v < -0.55 && ((i + 1) % 7) < 3) col = mix(c.body, '#8fa9c4', 0.6);
        }
        else if (pat === 'streaks') {
          if (y > -hh * 0.5 && y < 0 && (i % 5) < 2) col = mix(c.body, c.pattern, 0.45);
        }
        else if (pat === 'shine') {
          if (y > -hh * 0.7 && y < -hh * 0.15 && (i % 9) < 5) col = mix(c.body, '#ffffff', 0.5);
        }
        else if (pat === 'shimmer') {
          const g = hash(i * 5.3 + y * 2.7);
          if (g > 0.92) col = '#fff4f8';
        }
        else if (pat === 'patches') {
          const blob = Math.sin(i * 0.5) + Math.cos((i - y * 1.6) * 0.7 + 1.0);
          if (blob > 1.05 && v < 0.55) col = (blob > 1.7 && f.colors.accent) ? f.colors.accent : c.pattern;
        }
        else if (pat === 'runes') {
          const rune = (i > len * 0.35 && i < len * 0.9 && (((i * 3 + y * 5) % 13) < 2) && v < 0.35);
          if (rune) col = c.pattern;
        }
        else if (pat === 'prism') {
          const hue = (i / len) * 6.28 + t * 1.5;
          col = 'hsl(' + ((hue * 57 + 180) % 360) + ',70%,' + (45 + v * 12) + '%)';
        }
        if (col) { ctx.fillStyle = col; ctx.fillRect(x, yc + y, 1, 1); }
      }
    }

    // ---- gill line ----
    const gx = x0 + len * 0.78;
    const ghh = half(len * 0.78);
    for (let y = -ghh + 1; y <= ghh - 1; y++) {
      if (((y + 40) % 3) !== 0) { ctx.fillStyle = mix(c.body, c.out, 0.4); ctx.fillRect(Math.round(gx), yc + y, 1, 1); }
    }

    // ---- mouth / snout ----
    if (f.mouth === 'small') {
      rc(ctx, x1 - 2, yc + 1, 3, 1, mix(c.belly, c.out, 0.5));
    } else if (f.mouth === 'big') {
      tri(ctx, x1 - 4, yc - 1, x1 + 1, yc + 2, x1 - 4, yc + 4, mix(c.belly, c.out, 0.5));
    } else if (f.mouth === 'jaw') {
      tri(ctx, x1 - 6, yc, x1 + 2, yc + 2, x1 - 6, yc + 5, mix(c.belly, c.out, 0.4));
      rc(ctx, x1 - 6, yc + 1, 7, 1, c.out);
    } else if (f.mouth === 'snout') {
      finScan(ctx, [x1 - 2, yc - 3, x1 + 4, yc - 1, x1 + 4, yc + 2, x1 - 2, yc + 3], c.body, c.out);
      rc(ctx, x1 + 3, yc + 1, 2, 1, c.out);
    } else if (f.mouth === 'bill') {
      finScan(ctx, [x1 - 2, yc - 1, x1 + 12, yc - 3, x1 + 13, yc - 1, x1 - 2, yc + 1], c.fin, c.out);
    }

    // ---- eye ----
    const ex = Math.round(x0 + len * 0.84);
    const ey = yc - Math.max(1, Math.round(half(len * 0.84) * 0.35));
    disc(ctx, ex, ey, 2, '#ffffff');
    rc(ctx, ex - 1, ey - 1, 2, 2, c.eye);
    px(ctx, ex, ey - 1, '#ffffff');

    // ---- whiskers ----
    if (f.whiskers) {
      const wx = x1 - 1, wy = yc + 2;
      rc(ctx, wx, wy, 4, 1, c.out);
      rc(ctx, wx + 3, wy + 1, 3, 1, c.out);
      rc(ctx, wx + 5, wy + 2, 2, 1, c.out);
      rc(ctx, wx + 1, wy + 2, 3, 1, c.out);
    }
    // ---- horn ----
    if (f.horn) {
      finScan(ctx, [ex + 1, yc - half(len * 0.8) - 1, ex + 5, yc - half(len * 0.8) - 7, ex + 6, yc - half(len * 0.8) - 1], c.accent, c.out);
    }

    // ---- glow aura ----
    if (c.glow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.35 + 0.15 * Math.sin(t * 3);
      const g = ctx.createRadialGradient(x0 + len * 0.5, yc, 2, x0 + len * 0.5, yc, len * 0.7);
      g.addColorStop(0, 'rgba(120,240,225,' + pulse + ')');
      g.addColorStop(1, 'rgba(120,240,225,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W2, H2);
      ctx.restore();
    }
  }

  function getFishSprite(f) {
    if (fishCache.has(f.name)) return fishCache.get(f.name);
    const cw = f.len + (f.tailSize || 0) + 30;
    const ch = f.hgt + 24;
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d');
    // animate glow/prism with a fixed time for the cached base sprite
    drawFish(g, f, cw, ch, 0);
    fishCache.set(f.name, cv);
    return cv;
  }

  // ============================================================
  //  SCENE
  // ============================================================
  function drawSky(ctx, t) {
    banded(ctx, 0, 0, W, HORIZON, P.sky);

    // sun glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 46; r > 0; r -= 4) {
      ctx.fillStyle = 'rgba(255,196,120,' + (0.028 * (1 - r / 50)) + ')';
      disc(ctx, 244, 46, r, ctx.fillStyle);
    }
    ctx.restore();
    disc(ctx, 244, 46, 11, 'rgba(255,236,180,0.35)');
    disc(ctx, 244, 46, 8, P.sun2);
    disc(ctx, 244, 46, 6, P.sun);

    // clouds
    drawCloud(ctx, ((t * 3.2) % (W + 90)) - 60, 20, 1.0, 'rgba(255,246,228,0.92)', 'rgba(214,196,190,0.9)');
    drawCloud(ctx, ((t * 2.0 + 140) % (W + 120)) - 70, 40, 0.7, 'rgba(255,238,214,0.8)', 'rgba(226,186,168,0.8)');
    drawCloud(ctx, ((t * 4.6 + 60) % (W + 80)) - 50, 12, 0.55, 'rgba(255,250,238,0.7)', 'rgba(230,214,206,0.7)');

    // birds
    for (let i = 0; i < 3; i++) {
      const bx = ((t * 8 + i * 46 + 30) % (W + 40)) - 20;
      const by = 30 + i * 7 + Math.sin(t * 2 + i) * 1.5;
      const flap = Math.sin(t * 6 + i * 1.7) * 1.2;
      linePx(ctx, bx - 3, by - flap, bx, by, 'rgba(40,60,80,0.55)');
      linePx(ctx, bx, by, bx + 3, by - flap, 'rgba(40,60,80,0.55)');
    }
  }

  function drawCloud(ctx, x, y, s, light, shade) {
    const blobs = [[0, 0, 9], [10, -3, 7], [-10, -1, 6], [20, 1, 5], [-19, 2, 4]];
    for (const b of blobs) ellip(ctx, x + b[0] * s, y + b[2] * 0.4 * s, (b[2] + 3) * s, b[2] * s, light);
    for (const b of blobs) ellip(ctx, x + b[0] * s, y + (b[2] + 2) * s, (b[2] + 1) * s, b[2] * 0.5 * s, shade);
  }

  function drawFarLand(ctx, t) {
    // haze band on horizon
    rc(ctx, 0, HORIZON - 3, W, 3, 'rgba(190,215,205,0.35)');
    // right island
    const ix = 236;
    ellip(ctx, ix, HORIZON + 1, 52, 12, P.farHaze);
    finScan(ctx, [ix - 44, HORIZON, ix - 18, HORIZON - 16, ix + 2, HORIZON, ix + 6, HORIZON + 4, ix - 44, HORIZON + 4], P.farLand2, P.farLand2);
    finScan(ctx, [ix + 2, HORIZON, ix + 22, HORIZON - 11, ix + 46, HORIZON, ix + 46, HORIZON + 4, ix + 2, HORIZON + 4], P.farLand, P.farLand);
    // palms on island
    for (const p of [[ix - 16, 4], [ix + 14, 3]]) {
      drawPalm(ctx, p[0], HORIZON - p[1] - 2, 1.0, P.hill2, P.hill, 'rgba(150,190,180,0.5)');
    }
    // tiny far island
    finScan(ctx, [150, HORIZON, 160, HORIZON - 6, 172, HORIZON, 172, HORIZON + 3, 150, HORIZON + 3], 'rgba(120,160,160,0.65)', 'rgba(120,160,160,0.65)');
  }

  function drawPalm(ctx, x, baseY, s, trunk, leaf, haze) {
    const h = 16 * s;
    for (let i = 0; i < h; i++) {
      const yy = baseY - i;
      const xx = x + Math.round(Math.sin(i * 0.12) * 2 * s);
      rc(ctx, xx, yy, Math.max(1, s), 1, trunk);
    }
    const topY = baseY - h;
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 + 0.3;
      const fx = Math.cos(ang), fy = Math.sin(ang) * 0.5;
      for (let r = 3; r < 9 * s; r++) {
        rc(ctx, x + fx * r, topY + fy * r - r * 0.3, Math.max(1, s), Math.max(1, s), leaf);
      }
    }
    if (haze) ellip(ctx, x, topY + 1, 7 * s, 3 * s, haze);
  }

  function drawWater(ctx, t) {
    banded(ctx, 0, HORIZON, W, H - HORIZON, P.water);

    // sun reflection column
    ctx.save();
    for (let y = HORIZON + 1; y < H; y++) {
      const d = (y - HORIZON) / (H - HORIZON);
      const wob = Math.sin(y * 0.6 + t * 1.4) * (3 + d * 10);
      const width = (10 + d * 26) * (0.6 + 0.4 * Math.abs(Math.sin(y * 0.4 + t * 0.7)));
      const a = 0.30 * (1 - d * 0.75);
      ctx.fillStyle = 'rgba(255,216,150,' + a + ')';
      ctx.fillRect(244 - width / 2 + wob, y, width, 1);
    }
    ctx.restore();

    // wave dashes
    for (let wy = HORIZON + 5; wy < H; wy += 6) {
      const d = (wy - HORIZON) / (H - HORIZON);
      const seg = 3 + Math.round(d * 7);
      const gap = 10 + Math.round(d * 10);
      const speed = 3 + d * 12;
      const off = (t * speed * (0.5 + d)) % gap;
      const col = mix(P.waterHi, P.water[2], d * 0.9);
      for (let x = -gap; x < W + gap; x += gap) {
        const xx = x + off + Math.sin((x * 0.3 + wy) * 0.5 + t * 1.2) * (2 + d * 3);
        ctx.fillStyle = 'rgba(200,235,228,' + (0.18 + 0.3 * (1 - d)) + ')';
        ctx.fillRect(Math.round(xx), wy, seg, 1);
      }
    }

    // sparkles
    for (let i = 0; i < 26; i++) {
      const sx = hash(i * 3.7) * W;
      const sy = HORIZON + 4 + hash(i * 9.1) * (H - HORIZON - 6);
      const ph = hash(i * 5.5) * 6.28;
      const tw = Math.sin(t * 2.2 + ph);
      if (tw > 0.72) {
        px(ctx, sx, sy, 'rgba(255,255,255,' + ((tw - 0.72) * 3 * 0.8) + ')');
        px(ctx, sx + 1, sy, 'rgba(255,255,255,' + ((tw - 0.72) * 2 * 0.5) + ')');
      }
    }

    // horizon edge
    rc(ctx, 0, HORIZON - 1, W, 1, 'rgba(240,220,180,0.35)');
  }

  // ---------- left bank ----------
  function drawBank(ctx, t) {
    const edge = x => 108 + Math.round((x / 52) * 10) + Math.round(Math.sin(x * 0.4) * 1.2);
    // land (crisp columns)
    for (let x = 0; x < 54; x++) {
      const top = edge(x);
      rc(ctx, x, top, 1, H - top, '#5a4630');
      rc(ctx, x, top, 1, 1, '#3a2716');
      rc(ctx, x, top + 1, 1, 3, P.grass[1]);
      rc(ctx, x, top + 1, 1, 1, P.grass[3]);
      if (x % 4 === 0) rc(ctx, x, top + 4, 1, 2, P.grass[0]);
      // dirt speckle
      if (x % 7 === 0) rc(ctx, x, top + 8 + (x % 5), 1, 2, '#6b5539');
      if (x % 9 === 0) rc(ctx, x, top + 14, 1, 1, '#4a3926');
    }
    // waterline foam at the bank edge
    for (let y = 130; y < H; y += 3) {
      rc(ctx, 53 + Math.round(Math.sin(y * 0.5 + t) * 1), y, 2, 1, 'rgba(220,245,238,0.4)');
    }
    // rocks
    ellip(ctx, 12, 128, 7, 4, '#6b6258');
    ellip(ctx, 12, 126, 6, 3, '#827a6c');
    ellip(ctx, 33, 134, 5, 3, '#5e564c');
    // wildflowers on bank
    const cols = [P.flower[0], P.flower[1], P.flower[2]];
    for (let i = 0; i < 7; i++) {
      const fx = 4 + hash(i * 2.3) * 40;
      const fy = edge(fx) + 1 + hash(i * 7.7) * 2;
      rc(ctx, fx - 1, fy - 2, 3, 2, cols[i % 3]);
      px(ctx, fx, fy - 1, '#fff');
    }
    // big tree
    drawTree(ctx, 16, 108, 1.0, t);
    drawTree(ctx, 40, 114, 0.66, t + 1.3);
    // bush
    drawBush(ctx, 30, 116, 0.8, t);
  }

  function drawTree(ctx, x, baseY, s, t) {
    const h = 30 * s;
    // trunk
    for (let i = 0; i < h; i++) {
      const yy = baseY - i;
      const wob = Math.round(Math.sin(i * 0.14 + x) * 1.5 * s);
      rc(ctx, x - 3 * s + wob, yy, Math.max(2, 5 * s), 1, i % 4 < 2 ? P.wood.mid : P.wood.dark);
    }
    const cy = baseY - h;
    const sway = Math.sin(t * 0.7 + x) * 1.2;
    const blobs = [[0, 0, 16], [-12, 4, 11], [12, 3, 11], [-6, -9, 10], [7, -10, 10], [0, -14, 8]];
    for (const b of blobs) ellip(ctx, x + b[0] * s + sway, cy + b[1] * s, b[2] * s, b[2] * 0.85 * s, P.leaf[0]);
    for (const b of blobs) ellip(ctx, x + b[0] * s + sway, cy + b[1] * s - 2 * s, b[2] * s * 0.92, b[2] * 0.7 * s, P.leaf[1]);
    for (const b of blobs) ellip(ctx, x + b[0] * s + sway - 2, cy + b[1] * s - 5 * s, b[2] * s * 0.7, b[2] * 0.5 * s, P.leaf[2]);
    for (const b of blobs) ellip(ctx, x + b[0] * s + sway - 3, cy + b[1] * s - 8 * s, b[2] * s * 0.42, b[2] * 0.3 * s, P.leaf[3]);
    // fruit dots
    for (let i = 0; i < 5; i++) {
      px(ctx, x + (hash(i * 3.1 + x) - 0.5) * 22 * s + sway, cy + (hash(i * 8.2) - 0.5) * 18 * s, '#f4c95d');
    }
  }

  function drawBush(ctx, x, y, s, t) {
    const sway = Math.sin(t * 0.9 + x) * 0.8;
    const blobs = [[0, 0, 10], [-7, 2, 7], [7, 2, 7], [0, -4, 7]];
    for (const b of blobs) ellip(ctx, x + b[0] * s + sway, y + b[1] * s, b[2] * s, b[2] * 0.8 * s, P.leaf[0]);
    for (const b of blobs) ellip(ctx, x + b[0] * s + sway, y + b[1] * s - 2 * s, b[2] * s * 0.8, b[2] * 0.6 * s, P.leaf[2]);
    for (let i = 0; i < 3; i++) {
      px(ctx, x + (hash(i * 5.5) - 0.5) * 14 * s + sway, y + (hash(i * 2.2) - 0.5) * 8 * s, P.flower[0]);
    }
  }

  // ---------- water life ----------
  function drawWaterLife(ctx, t) {
    // distant sailboat on the horizon
    const sx = 30 + ((t * 4) % (W + 80));
    rc(ctx, sx, 70, 10, 3, '#4a3a2a');
    rc(ctx, sx + 1, 69, 8, 1, '#6b4a2b');
    rc(ctx, sx + 5, 62, 1, 8, '#3a2c22');
    finScan(ctx, [sx + 5, 62, sx + 5, 69, sx + 11, 69], '#f6f1df', '#3a2c22');
    finScan(ctx, [sx + 4, 63, sx + 4, 69, sx - 1, 69], '#e8d9b8', '#3a2c22');
    ctx.fillStyle = 'rgba(20,40,50,0.2)'; ctx.fillRect(sx, 73, 10, 2);

    // fish shadows gliding under the surface
    for (let i = 0; i < 3; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = 6 + i * 3;
      const span = W + 60;
      let fx = ((t * speed * dir + i * 90) % span + span) % span - 30;
      const fy = 100 + i * 20 + Math.sin(t * 0.9 + i * 2) * 2;
      const sc = 0.7 + i * 0.25;
      const a = 0.10 + i * 0.03;
      ellip(ctx, fx, fy, 8 * sc, 3 * sc, 'rgba(10,32,42,' + a + ')');
      finScan(ctx, [fx - 7 * sc, fy, fx - 11 * sc, fy - 3 * sc, fx - 11 * sc, fy + 3 * sc], 'rgba(10,32,42,' + a + ')', 'rgba(10,32,42,0)');
    }

    // drifting leaves / petals on the surface
    for (let i = 0; i < 5; i++) {
      const span = W + 40;
      const lx = ((t * (3 + i) + i * 70) % span) - 20;
      const ly = 120 + (i % 3) * 14 + Math.sin(t * 1.5 + i) * 1.5;
      ellip(ctx, lx, ly, 3, 1.4, i % 2 ? 'rgba(120,170,90,0.85)' : 'rgba(232,132,155,0.8)');
      px(ctx, lx + 2, ly, 'rgba(255,255,255,0.5)');
    }
  }

  // ---------- dock ----------
  function drawDock(ctx, t) {
    const dx0 = 26, dx1 = 116;
    // posts down into water
    for (const px0 of [dx0 + 6, 50, 78, dx1 - 4]) {
      rc(ctx, px0, DOCK_TOP + 5, 5, 34, P.wood.dark);
      rc(ctx, px0, DOCK_TOP + 5, 2, 34, P.wood.mid);
      // reflection
      ctx.fillStyle = 'rgba(30,50,60,0.35)';
      ctx.fillRect(px0, DOCK_TOP + 39, 5, 5);
    }
    // cross brace
    rc(ctx, dx0 + 8, DOCK_TOP + 22, dx1 - 10, 3, P.wood.dark);
    // deck front
    rc(ctx, dx0, DOCK_TOP, dx1 - dx0, 8, P.wood.mid);
    for (let x = dx0; x < dx1; x += 9) rc(ctx, x, DOCK_TOP, 1, 8, P.wood.dark);
    // deck top
    rc(ctx, dx0, DOCK_TOP - 5, dx1 - dx0, 5, P.wood.light);
    for (let x = dx0; x < dx1; x += 9) { rc(ctx, x, DOCK_TOP - 5, 1, 5, P.wood.mid); }
    rc(ctx, dx0, DOCK_TOP - 5, dx1 - dx0, 1, P.wood.hi);
    rc(ctx, dx0, DOCK_TOP - 1, dx1 - dx0, 1, P.wood.dark);
    // plank ends / nails
    rc(ctx, dx1 - 4, DOCK_TOP - 5, 1, 13, P.wood.out);
    // small lantern post at bank end
    rc(ctx, dx0 + 2, DOCK_TOP - 20, 2, 15, P.wood.out);
    rc(ctx, dx0, DOCK_TOP - 24, 6, 6, P.wood.dark);
    rc(ctx, dx0 + 1, DOCK_TOP - 23, 4, 4, '#ffdf9a');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    disc(ctx, dx0 + 3, DOCK_TOP - 21, 7, 'rgba(255,210,120,0.10)');
    ctx.restore();

    // catch bucket beside the angler
    const bx = 72, by = DOCK_TOP - 6;
    ellip(ctx, bx + 3, DOCK_TOP - 1, 6, 2, 'rgba(20,30,35,0.3)');
    rc(ctx, bx, by, 7, 6, P.wood.mid);
    rc(ctx, bx, by, 7, 5, '#8a6238');
    rc(ctx, bx, by, 1, 5, P.wood.dark);
    rc(ctx, bx + 6, by, 1, 5, P.wood.dark);
    rc(ctx, bx - 1, by - 1, 9, 2, '#5a3f24');
    rc(ctx, bx, by - 1, 7, 1, '#9a7040');
    rc(ctx, bx + 1, by - 3, 5, 2, '#4f9aa6');
    rc(ctx, bx + 1, by - 3, 5, 1, '#8fc3c4');
    linePx(ctx, bx + 1, by - 1, bx + 2, by - 4, P.wood.out);
    linePx(ctx, bx + 5, by - 1, bx + 4, by - 4, P.wood.out);
  }

  // ---------- angler ----------
  function drawAngler(ctx, t, g) {
    const bob = Math.sin(t * 1.6) * 0.6;
    let lean = 0, arm = 0, jitter = 0;
    const ph = g.phase;
    if (ph === 'bite') { jitter = (Math.random() - 0.5) * 1.2; lean = -1; }
    if (ph === 'reeling') { lean = -2; arm = 3; }
    if (g.missP !== null && g.missP !== undefined) { lean = 1.5; }
    const x = AX + jitter;
    const y = DECK + Math.round(bob * 0.4) + Math.round(lean);

    // shadow
    ellip(ctx, x, DECK + 1, 8, 2, 'rgba(20,30,35,0.35)');
    // legs
    rc(ctx, x - 4, y - 7, 3, 6, P.pants);
    rc(ctx, x + 1, y - 7, 3, 6, P.pants2);
    // boots
    rc(ctx, x - 5, y - 2, 4, 2, P.boot);
    rc(ctx, x + 1, y - 2, 5, 2, P.boot);
    // torso
    rc(ctx, x - 4, y - 14, 9, 7, P.shirt);
    rc(ctx, x - 4, y - 8, 9, 1, P.shirt2);
    rc(ctx, x - 4, y - 14, 9, 1, mix(P.shirt, '#fff', 0.25));
    // back arm
    rc(ctx, x - 6, y - 14, 3, 6, P.shirt2);
    // head
    rc(ctx, x - 3, y - 20, 7, 6, P.skin);
    rc(ctx, x - 3, y - 20, 7, 1, mix(P.skin, '#fff', 0.2));
    px(ctx, x + 2, y - 17, '#3a2a1c'); // eye
    px(ctx, x - 2, y - 17, P.skin2);
    // hat
    rc(ctx, x - 5, y - 21, 11, 1, P.hat);
    rc(ctx, x - 3, y - 24, 7, 3, P.hat);
    rc(ctx, x - 3, y - 22, 7, 1, P.hat2);
    // rod arm
    const ry = y - 15;
    rc(ctx, x + 4, ry + arm, 5, 3, P.shirt);
    rc(ctx, x + 8, ry + arm, 3, 2, P.skin);
    return { handX: x + 10, handY: ry + arm + 1, x: x, y: y };
  }

  // rod state machine
  function getRod(t, g, hand) {
    // returns {tip:{x,y}, base:{x,y}}
    let tipX = hand.handX + 18, tipY = hand.handY - 14;
    const ph = g.phase;
    if (ph === 'casting') {
      const p = smooth(g.phaseT / g.dur.cast);
      const swing = Math.sin(p * Math.PI);
      tipX = hand.handX + 4 + p * 20;
      tipY = hand.handY - 8 - Math.sin(p * Math.PI) * 14;
      return { tip: { x: tipX, y: tipY }, base: { x: hand.handX, y: hand.handY }, p };
    }
    if (ph === 'bite') { tipY += 2 + Math.random(); tipX -= 1; }
    if (ph === 'reeling') {
      const p = g.phaseT / g.dur.reel;
      tipX -= 2 + p * 3;
      tipY += 3 + p * 4 + Math.sin(p * 12) * 1.5;
    }
    if (ph === 'miss') { tipX += 3; tipY -= 4; }
    return { tip: { x: tipX, y: tipY }, base: { x: hand.handX, y: hand.handY }, p: null };
  }

  function drawRod(ctx, rod, g) {
    const { tip, base } = rod;
    const n = 24;
    let bend = 0;
    if (g.phase === 'reeling') bend = 4 * (g.phaseT / g.dur.reel) + Math.sin(g.phaseT * 12) * 1;
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      const x = lerp(base.x, tip.x, p) + Math.sin(p * Math.PI) * bend * 0.3;
      const y = lerp(base.y, tip.y, p) + p * p * 4 + Math.sin(p * Math.PI) * bend;
      px(ctx, x, y, i % 3 === 0 ? P.rodHi : P.rod);
    }
    return { tip: { x: lerp(base.x, tip.x, 1), y: lerp(base.y, tip.y, 1) } };
  }

  function drawLineAndBobber(ctx, t, g, rodTip) {
    const ph = g.phase;
    if (ph === 'ready') return;
    // target bobber position
    const seed = g.seed || 0.5;
    const bx = 150 + seed * 62;
    const by = 128 + (hash(seed * 91) * 6 - 3);

    let bobX, bobY, visible = true;
    if (ph === 'casting') {
      const p = smooth(g.phaseT / g.dur.cast);
      // arc from rod tip to target
      bobX = lerp(rodTip.x, bx, p);
      bobY = lerp(rodTip.y, by, p) - Math.sin(p * Math.PI) * 34;
    } else if (ph === 'waiting') {
      const b = Math.sin(t * 2.2 + seed * 5) * 1.6;
      bobX = bx + Math.sin(t * 0.7) * 1.2; bobY = by + b;
    } else if (ph === 'bite') {
      const dip = Math.sin(clamp(g.phaseT / g.dur.bite, 0, 1) * Math.PI * 3) * 3;
      bobX = bx; bobY = by + 2 + Math.abs(dip);
    } else if (ph === 'reeling') {
      const p = smooth(g.phaseT / g.dur.reel);
      bobX = lerp(bx, rodTip.x + 6, p);
      bobY = lerp(by, rodTip.y + 8, p);
    } else if (ph === 'miss') {
      const p = g.phaseT / g.dur.miss;
      bobX = bx; bobY = by + p * 4; visible = p < 0.4;
    } else { return; }

    // fishing line with sag (pixel-drawn)
    const sag = 6;
    const mx = (rodTip.x + bobX) / 2, my = (rodTip.y + bobY) / 2 + sag;
    let lx = rodTip.x, ly = rodTip.y;
    for (let i = 1; i <= 40; i++) {
      const u = i / 40, iu = 1 - u;
      const qx = iu * iu * rodTip.x + 2 * iu * u * mx + u * u * bobX;
      const qy = iu * iu * rodTip.y + 2 * iu * u * my + u * u * bobY;
      linePx(ctx, lx, ly, qx, qy, 'rgba(242,240,224,0.8)');
      lx = qx; ly = qy;
    }

    // ripples around bobber
    if (ph === 'waiting' || ph === 'bite') {
      const cnt = ph === 'bite' ? 3 : 2;
      for (let i = 0; i < cnt; i++) {
        const period = 1.3;
        const rp = ((t * 0.7 + i / cnt) % 1);
        const r = 2 + rp * 12;
        const a = (1 - rp) * 0.5;
        ringPx(ctx, bobX, bobY + 2, r, r * 0.35, 'rgba(210,240,232,' + a + ')');
      }
    }
    if (ph === 'bite') {
      // splashy droplets
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28;
        const r = 6 + (g.phaseT * 30 % 10);
        px(ctx, bobX + Math.cos(a) * r * 0.8, bobY + 2 - Math.abs(Math.sin(a)) * r * 0.5, 'rgba(230,250,245,0.8)');
      }
      // unmistakable "!" cue above the bobber
      const bob = Math.round(Math.abs(Math.sin(g.phaseT * 9)) * 2);
      const ex = Math.round(bobX), ey = Math.round(bobY) - 13 - bob;
      rc(ctx, ex - 1, ey, 3, 6, '#fff7d6');
      rc(ctx, ex - 1, ey, 3, 1, '#ffd34d');
      rc(ctx, ex, ey + 1, 1, 4, '#e6483a');
      rc(ctx, ex - 1, ey + 7, 3, 2, '#fff7d6');
      rc(ctx, ex, ey + 7, 1, 2, '#e6483a');
      disc(ctx, ex, ey + 8, 3, 'rgba(255,90,70,0.25)');
    }

    if (!visible) return;
    // bobber
    const bxr = Math.round(bobX), byr = Math.round(bobY);
    disc(ctx, bxr, byr, 4, 'rgba(20,30,35,0.25)');
    disc(ctx, bxr, byr, 3, P.bobberW);
    rc(ctx, bxr - 3, byr + 1, 6, 3, P.bobber);
    rc(ctx, bxr - 3, byr + 1, 6, 1, mix(P.bobber, '#fff', 0.25));
    rc(ctx, bxr - 4, byr, 9, 1, '#8a2a22');
    rc(ctx, bxr - 1, byr - 5, 2, 3, '#e8e2d4');
  }

  // ---------- foreground vegetation ----------
  function drawForeground(ctx, t) {
    // reeds bottom-left
    for (let i = 0; i < 12; i++) {
      const rx = 2 + i * 3.4;
      const hh = 20 + hash(i * 4.2) * 26;
      const sway = Math.sin(t * 1.1 + i) * 3;
      for (let j = 0; j < hh; j++) {
        const xx = rx + sway * (j / hh) * (j / hh);
        const col = j > hh - 8 ? '#6a8a3a' : (j % 3 === 0 ? '#3a6a34' : '#2f5a2e');
        px(ctx, xx, H - 1 - j, col);
      }
      if (i % 3 === 0) rc(ctx, rx + sway, H - hh - 4, 2, 5, '#8a6a45');
    }
    // right-side lily pads + reeds
    for (let i = 0; i < 5; i++) {
      const lx = 268 + i * 11 + hash(i * 3.3) * 4;
      const ly = 158 + hash(i * 7.1) * 12;
      drawLily(ctx, lx, ly, t + i * 0.5, i === 2);
    }
    for (let i = 0; i < 7; i++) {
      const rx = 300 + i * 3;
      const hh = 16 + hash(i * 2.7) * 20;
      const sway = Math.sin(t * 1.3 + i * 0.7) * 3;
      for (let j = 0; j < hh; j++) px(ctx, rx + sway * (j / hh) * (j / hh), H - 1 - j, j % 3 === 0 ? '#2f5a2e' : '#3a6a34');
    }
    // grass tufts along bottom
    for (let x = 40; x < 300; x += 7) {
      const hh = 3 + hash(x * 1.7) * 4;
      for (let j = 0; j < hh; j++) px(ctx, x + Math.sin(t * 1.4 + x) * (j / hh), H - 1 - j, j === hh - 1 ? '#5a9c42' : '#2f5a2e');
    }
  }

  function drawLily(ctx, x, y, t, flower) {
    const bob = Math.sin(t * 1.4) * 1;
    const yy = y + bob;
    ellip(ctx, x, yy, 9, 4, '#2f6a3a');
    ellip(ctx, x, yy - 1, 8, 3, '#3f8a44');
    // notch
    tri(ctx, x, yy - 4, x + 2, yy + 2, x + 6, yy - 3, 'rgba(20,60,80,0.0)');
    ctx.fillStyle = 'rgba(30,80,100,0.9)';
    ctx.fillRect(x - 1, yy - 1, 4, 1);
    if (flower) {
      rc(ctx, x - 2, yy - 6, 4, 3, '#f4f0e0');
      px(ctx, x, yy - 7, '#ffd46b');
      px(ctx, x - 2, yy - 5, '#e8849b');
    }
  }

  function drawButterflies(ctx, t) {
    for (let i = 0; i < 3; i++) {
      const bx = 60 + Math.sin(t * 0.5 + i * 2.1) * 40 + i * 40;
      const by = 96 + Math.sin(t * 1.3 + i * 1.7) * 6;
      const flap = Math.abs(Math.sin(t * 12 + i));
      px(ctx, bx, by, '#fff');
      px(ctx, bx - 1, by - flap, '#ffd46b');
      px(ctx, bx + 1, by - flap, '#ffd46b');
    }
  }

  // ---------- main world draw ----------
  function drawWorld(ctx, t, g) {
    ctx.clearRect(0, 0, W, H);
    drawSky(ctx, t);
    drawFarLand(ctx, t);
    drawWater(ctx, t);
    drawWaterLife(ctx, t);
    // reflection of bank / trees, fading with depth
    for (let y = HORIZON + 6; y < 112; y++) {
      const a = 0.22 * (1 - (y - HORIZON - 6) / (112 - HORIZON - 6));
      ctx.fillStyle = 'rgba(28,52,40,' + a + ')';
      for (let x = 0; x < 52; x += 2) ctx.fillRect(x, y, 1 + (x % 4 === 0 ? 1 : 0), 1);
    }
    drawBank(ctx, t);
    drawDock(ctx, t);
    drawButterflies(ctx, t);

    const hand = drawAngler(ctx, t, g);
    const rod = getRod(t, g, hand);
    const rodDrawn = drawRod(ctx, rod, g);
    drawLineAndBobber(ctx, t, g, rod.tip);

    drawForeground(ctx, t);

    // reeling: leaping fish on the line
    if (g.phase === 'reeling' && g.fish) {
      const p = g.phaseT / g.dur.reel;
      const seed = g.seed || 0.5;
      const bx = 150 + seed * 62, by = 128;
      const fx = lerp(bx, rod.tip.x + 6, smooth(p));
      const fy = lerp(by, rod.tip.y + 8, smooth(p)) - Math.sin(p * Math.PI) * 26;
      const spr = getFishSprite(g.fish);
      const sc = 1;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(Math.sin(p * Math.PI * 3) * 0.5 - 0.2);
      ctx.drawImage(spr, -spr.width / 2, -spr.height / 2, spr.width * sc, spr.height * sc);
      ctx.restore();
      // splash at landing
      if (p < 0.35) {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * 6.28;
          px(ctx, bx + Math.cos(a) * p * 40, by + Math.sin(a) * p * 12 - 2, 'rgba(230,250,245,0.7)');
        }
      }
    }
    if (g.missP !== null && g.missP !== undefined) {
      const p = g.missP;
      if (p < 0.6) {
        for (let i = 0; i < 6; i++) px(ctx, 150 + g.seed * 62 + (hash(i) - 0.5) * 20, 126 + p * 8, 'rgba(180,200,200,' + (1 - p / 0.6) + ')');
      }
    }
  }

  // ============================================================
  //  REVEAL
  // ============================================================
  const TIER = {
    Common: { base: '#b9c0b0', glow: 'rgba(200,210,195,', rays: 4, sparks: 0, leaf: false },
    Uncommon: { base: '#7fd18a', glow: 'rgba(127,209,138,', rays: 6, sparks: 4, leaf: true },
    Rare: { base: '#5fb6e8', glow: 'rgba(95,182,232,', rays: 8, sparks: 8, leaf: false, bubbles: true },
    Epic: { base: '#c07fe8', glow: 'rgba(192,127,232,', rays: 10, sparks: 14, leaf: false, runes: false },
    Legendary: { base: '#f2b93f', glow: 'rgba(242,185,63,', rays: 14, sparks: 22, leaf: false, stars: true },
    Ancient: { base: '#4fe0cf', glow: 'rgba(79,224,207,', rays: 18, sparks: 30, leaf: false, runes: true, prism: true }
  };

  function drawReveal(ctx, t, fish, rarity, p) {
    const T = TIER[rarity] || TIER.Common;
    // dim
    ctx.fillStyle = 'rgba(8,16,22,' + (0.35 + 0.35 * smooth(Math.min(1, p * 3))) + ')';
    ctx.fillRect(0, 0, W, H);

    const cx = 160, cy = 92;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // rotating rays
    const rayN = T.rays;
    for (let i = 0; i < rayN; i++) {
      const a = (i / rayN) * Math.PI * 2 + t * 0.25 * (rarity === 'Ancient' ? 1.8 : 1);
      const len = 70 + Math.sin(t * 2 + i) * 12;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      const grd = ctx.createLinearGradient(0, 0, len, 0);
      grd.addColorStop(0, T.glow + '0.28)');
      grd.addColorStop(1, T.glow + '0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, -2.5, len, 5);
      ctx.restore();
    }
    // pulsing halo
    const pulse = 16 + Math.sin(t * 3) * 3;
    const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 44 + pulse);
    rg.addColorStop(0, T.glow + '0.4)');
    rg.addColorStop(1, T.glow + '0)');
    ctx.fillStyle = rg;
    ctx.fillRect(cx - 80, cy - 70, 160, 140);
    ctx.restore();

    // pedestal glow ring
    ctx.save();
    ctx.strokeStyle = T.glow + '0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 40 + Math.sin(t * 2) * 2, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = T.glow + '0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 50, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // tier extras
    if (T.bubbles) {
      for (let i = 0; i < 10; i++) {
        const a = (i * 2.3 + t * 0.6) % 6.28;
        const r = ((t * 14 + i * 23) % 70);
        ctx.strokeStyle = 'rgba(180,235,255,0.5)';
        ctx.beginPath(); ctx.arc(cx + Math.sin(a) * 30, cy + 34 - r, 1.5, 0, 6.28); ctx.stroke();
      }
    }
    if (T.leaf) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.28 + t * 0.4;
        const r = 40 + Math.sin(t * 1.5 + i) * 5;
        const lx = cx + Math.cos(a) * r, ly = cy + Math.sin(a) * r * 0.5;
        ctx.fillStyle = 'rgba(127,209,138,0.8)';
        ctx.fillRect(lx, ly, 3, 2);
      }
    }
    // sparks
    for (let i = 0; i < T.sparks; i++) {
      const a = hash(i * 3.1) * 6.28 + t * (0.5 + hash(i) * 1.2) * (i % 2 ? 1 : -1);
      const r = 26 + hash(i * 7.7) * 42;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r * 0.75;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2);
      ctx.fillStyle = T.glow + (tw * 0.9) + ')';
      const sz = (rarity === 'Legendary' || rarity === 'Ancient') ? 2 : 1;
      ctx.fillRect(sx, sy, sz, sz);
      if (T.stars && i % 3 === 0) {
        ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3);
      }
    }
    // ancient orbiting carved runes (drawn with pixels, no font glyphs)
    if (T.runes) {
      const glyphs = [
        [[0,0],[0,5],[4,0],[4,5]],           // frame
        [[0,5],[2,0],[4,5]],                 // caret
        [[0,0],[4,5],[4,0],[0,5]],           // cross
        [[0,0],[4,0],[4,5]],                 // corner
        [[0,2],[4,2],[2,2],[2,5]],           // anchor
        [[2,0],[0,3],[2,5],[4,3],[2,0]]      // diamond
      ];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28 + t * 0.9;
        const rx = cx + Math.cos(a) * 54, ry2 = cy + Math.sin(a) * 30;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(120,240,225,' + (0.5 + 0.4 * Math.sin(t * 4 + i)) + ')';
        for (const [dx, dy] of glyphs[i]) ctx.fillRect(Math.round(rx + dx - 2), Math.round(ry2 + dy - 3), 1, 1);
        ctx.restore();
      }
    }

    // fish
    const spr = getFishSprite(fish);
    const scale = smooth(Math.min(1, p * 2.2)) * (rarity === 'Ancient' ? 3.0 : rarity === 'Legendary' ? 2.9 : 2.7);
    const w = spr.width * scale, h = spr.height * scale;
    const float = Math.sin(t * 1.6) * 2.5;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, Math.round(cx - w / 2), Math.round(cy - h / 2 + float), Math.round(w), Math.round(h));
  }

  window.Art = {
    W, H, HORIZON, DECK,
    drawWorld, drawReveal, getFishSprite, drawFish,
    helpers: { px, rc, disc, ellip, tri, mix, hash, clamp, lerp, smooth }
  };
})();
