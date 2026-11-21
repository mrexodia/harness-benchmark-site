/* ------------------------------------------------------------------
   art.js  --  all artwork drawn in code.
   Scene is drawn in a 320x180 logical space; fish sprites are generated
   procedurally into small offscreen canvases at 1px resolution so they
   keep a crisp pixel look when scaled up.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  /* ----------------------------- palette ----------------------------- */
  var P = {
    skyTop: '#3c6ea6',
    skyMid: '#82b2cf',
    skyLow: '#f0d3a0',
    sun: '#ffe7a4',
    sunCore: '#fff8d8',
    cloud: '#ffffff',
    cloudShade: '#c9d9e4',

    waterFar: '#529dae',
    waterMid: '#2e7591',
    waterNear: '#1c5571',
    waterDeep: '#143c57',
    wave: '#9fdbe0',
    waveBright: '#dff6ee',
    foam: '#eafaf2',

    sand: '#e6d0a0',
    sandDark: '#c2a878',
    grass: '#5aa04e',
    grassDark: '#3c7540',
    grassLight: '#7cc45e',
    trunk: '#6b4a2f',
    trunkLight: '#8a6440',
    leaf: '#3f7a3a',
    leafMid: '#4f9145',
    leafLight: '#69b554',
    leafHi: '#8ed067',

    wood: '#8a5a37',
    woodLight: '#ab744a',
    woodDark: '#5a3a23',

    skin: '#e8b98a',
    skinShade: '#c99565',
    hair: '#5a3b2a',
    shirt: '#d9534f',
    shirtDark: '#a83a37',
    pants: '#3b5a8c',
    pantsDark: '#2c4468',
    boot: '#49342a',
    bobberRed: '#e0473f',
    bobberWhite: '#f4f0e6',
    outline: '#22303a'
  };

  /* ----------------------------- helpers ----------------------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function hx(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function rgb(r, g, b) {
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  var _mixCache = {};
  function mix(a, b, t) {
    var k = a + b + t.toFixed(3);
    if (_mixCache[k]) return _mixCache[k];
    var A = hx(a), B = hx(b);
    var s = rgb(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
    _mixCache[k] = s;
    return s;
  }

  function px(g, x, y, c, w, h) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1);
  }

  // Bresenham-ish pixel line
  function pixelLine(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    g.fillStyle = c;
    var guard = 0;
    while (guard++ < 2000) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // flattened ellipse outline (perspective ring)
  function pixelEllipse(g, cx, cy, rx, ry, c, thick) {
    thick = thick || 1;
    g.fillStyle = c;
    var steps = Math.max(12, Math.round((rx + ry) * 3));
    for (var i = 0; i < steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      var x = Math.round(cx + Math.cos(a) * rx);
      var y = Math.round(cy + Math.sin(a) * ry);
      g.fillRect(x, y, thick, thick);
    }
  }

  function disc(g, cx, cy, r, c) {
    g.fillStyle = c;
    var ri = Math.ceil(r);
    for (var y = -ri; y <= ri; y++) {
      var span = Math.sqrt(Math.max(0, r * r - y * y));
      g.fillRect(Math.round(cx - span), Math.round(cy + y), Math.ceil(span * 2), 1);
    }
  }

  // deterministic pseudo random
  function sr(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* --------------------------- sky gradient -------------------------- */
  var skyGrad = null;
  function getSky(g) {
    if (skyGrad) return skyGrad;
    var grad = g.createLinearGradient(0, 0, 0, 74);
    grad.addColorStop(0, P.skyTop);
    grad.addColorStop(0.55, P.skyMid);
    grad.addColorStop(1, P.skyLow);
    skyGrad = grad;
    return grad;
  }

  /* ==================================================================
     FISH SPRITE GENERATOR
     ================================================================== */

  function makeFish(def) {
    var W = def.w, H = def.h;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;

    var col = new Array(W * H);
    for (var i = 0; i < col.length; i++) col[i] = null;

    function id(x, y) { return y * W + x; }
    function set(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H || !c) return;
      col[id(x, y)] = c;
    }
    function has(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      return !!col[id(x, y)];
    }

    var cy = def.cy != null ? def.cy : Math.floor(H / 2);
    var br = W - 3 - (def.headPad || 0);
    var bl = br - def.len;

    function halfAt(x) {
      var nx = (x - bl) / (br - bl);
      nx = clamp(nx, 0, 1);
      // blend an ellipse with a head-forward fullness
      var e = Math.sqrt(Math.max(0, 1 - Math.pow(2 * nx - 1, 2)));
      var prof = Math.pow(Math.sin(Math.PI * Math.min(1, nx * (def.skew || 0.82) + (def.skewOff || 0.16))), def.power || 0.6);
      var v = def.round ? Math.max(e, prof) : prof;
      return Math.max(0.7, def.hh * v);
    }

    // ---- body ----
    for (var x = bl; x <= br; x++) {
      var hh = halfAt(x);
      for (var y = Math.floor(cy - hh + 1); y <= Math.ceil(cy + hh - 1); y++) {
        var ty = (y - (cy - hh)) / (2 * hh);
        var c;
        if (ty < 0.20) c = def.c.top;
        else if (ty < 0.52) c = def.c.mid;
        else if (ty < 0.82) c = def.c.low;
        else c = def.c.belly;
        set(x, y, c);
      }
    }

    // ---- pattern ----
    var pat = def.pattern;
    var rnd = sr(def.seed || 12345);
    if (pat === 'bars') {
      for (var bx = bl + 2; bx < br - 1; bx += (def.barGap || 4)) {
        for (var by = 0; by < H; by++) {
          if (has(bx, by)) {
            var t = Math.abs(by - cy) / (def.hh + 1);
            if (t < 0.85) set(bx, by, def.c.accent);
          }
        }
      }
    } else if (pat === 'spots') {
      var n = def.spotCount || 12;
      for (var s2 = 0; s2 < n; s2++) {
        var sx = bl + Math.floor(rnd() * (br - bl));
        var sy = cy + Math.floor((rnd() * 2 - 1) * def.hh * 0.7);
        if (has(sx, sy)) {
          set(sx, sy, def.c.accent);
          if (rnd() > 0.5) set(sx + 1, sy, def.c.accent);
        }
      }
    } else if (pat === 'koi') {
      var blobs = def.patches || 3;
      for (var k = 0; k < blobs; k++) {
        var cx2 = bl + rnd() * (br - bl);
        var cy2 = cy + (rnd() * 2 - 1) * def.hh * 0.6;
        var rr = 1.5 + rnd() * 2.2;
        for (var yy = -4; yy <= 4; yy++) for (var xx = -5; xx <= 5; xx++) {
          if (xx * xx + yy * yy <= rr * rr && has(Math.round(cx2 + xx), Math.round(cy2 + yy))) {
            set(cx2 + xx, cy2 + yy, def.c.patch || '#fff2e0');
          }
        }
      }
    } else if (pat === 'stripe') {
      // horizontal racing stripe along the flank
      for (var lx = bl + 1; lx <= br - 1; lx++) {
        set(lx, cy - 1, def.c.accent);
        set(lx, cy, def.c.accent);
      }
    } else if (pat === 'copper') {
      for (var mx = bl; mx <= br; mx++) {
        var mh = halfAt(mx);
        for (var my = 0; my < H; my++) {
          if (!has(mx, my)) continue;
          var tt = (my - (cy - mh)) / (2 * mh);
          if (tt < 0.55) {
            set(mx, my, ((mx + my) % 2 === 0) ? def.c.accent : def.c.mid);
          }
        }
      }
    } else if (pat === 'storm') {
      for (var zx = 0; zx < 4; zx++) {
        var zsx = bl + 3 + zx * 5;
        for (var zy = -def.hh; zy < def.hh; zy++) {
          var zig = zy + (((zy + zx) % 3 === 0) ? 1 : -1);
          if (has(zsx, cy + zig)) set(zsx, cy + zig, def.c.accent);
          if (has(zsx + 1, cy + zig)) set(zsx + 1, cy + zig, def.c.accent);
        }
      }
    } else if (pat === 'ember') {
      for (var ex = bl; ex <= br; ex++) {
        var eh = halfAt(ex);
        for (var ey = 0; ey < H; ey++) {
          if (!has(ex, ey)) continue;
          var et = (ey - (cy - eh)) / (2 * eh);
          if (et > 0.35 && et < 0.7 && ((ex + ey) % 3 === 0)) set(ex, ey, def.c.accent);
        }
      }
    } else if (pat === 'rune') {
      for (var q = 0; q < 5; q++) {
        var qx = bl + 2 + q * Math.max(3, Math.floor((br - bl) / 5));
        if (qx >= br) break;
        set(qx, cy - 2, def.c.accent);
        set(qx, cy + 2, def.c.accent);
        set(qx + 1, cy - 1, def.c.accent);
        set(qx + 1, cy + 1, def.c.accent);
      }
    } else if (pat === 'scute') {
      for (var ux = bl + 2; ux < br - 1; ux += 4) {
        set(ux, cy - Math.round(halfAt(ux)) + 1, def.c.accent);
        set(ux + 1, cy - Math.round(halfAt(ux + 1)) + 1, def.c.accent);
      }
    }

    // ---- fins ----
    var fin = def.c.fin, fin2 = def.c.fin2 || def.c.fin;

    function drawDorsal(d0f, d1f, hMul, colA, colB) {
      var d0 = bl + (br - bl) * d0f, d1 = bl + (br - bl) * d1f;
      var dh = (def.dorsalH != null ? def.dorsalH : def.hh * 0.9) * hMul;
      for (var dx = Math.floor(d0); dx <= Math.ceil(d1); dx++) {
        var s = (dx - d0) / Math.max(1, (d1 - d0));
        var h = dh * Math.sin(Math.PI * clamp(s, 0, 1));
        var base = cy - halfAt(dx);
        for (var yy2 = 0; yy2 < Math.ceil(h); yy2++) {
          set(dx, base - yy2, yy2 > h - 1.5 ? colB : colA);
        }
      }
    }

    if (def.dorsalType === 'sail') {
      drawDorsal(0.30, 0.80, 1.5, fin, fin2);
      // rays
      for (var rr2 = 0; rr2 < 6; rr2++) {
        var rxx = bl + (br - bl) * (0.32 + rr2 * 0.09);
        var baseY = cy - halfAt(rxx);
        var s2b = (rxx - (bl + (br - bl) * 0.30)) / ((br - bl) * 0.5);
        var topY = baseY - (def.dorsalH || def.hh) * 1.5 * Math.sin(Math.PI * s2b);
        pixelLine(g, rxx, baseY, rxx + 1, topY, def.c.accent);
      }
    } else if (def.dorsalType === 'tri') {
      drawDorsal(0.38, 0.68, 1.0, fin, fin2);
    } else if (def.dorsalType === 'long') {
      drawDorsal(0.18, 0.86, 0.8, fin, fin2);
    }

    if (def.anal) {
      var a0 = bl + (br - bl) * 0.40, a1 = bl + (br - bl) * 0.72;
      for (var ax = Math.floor(a0); ax <= Math.ceil(a1); ax++) {
        var as = (ax - a0) / Math.max(1, (a1 - a0));
        var ah = def.hh * 0.55 * Math.sin(Math.PI * as);
        var abase = cy + halfAt(ax);
        for (var ay = 0; ay < Math.ceil(ah); ay++) set(ax, abase + ay, fin);
      }
    }

    if (def.pectoral !== false) {
      var pxx = bl + (br - bl) * 0.66;
      var pyy = cy + def.hh * 0.45;
      for (var q2 = 0; q2 < 4; q2++) {
        for (var w2 = 0; w2 <= q2; w2++) set(pxx - q2, pyy + w2, fin2);
      }
    }

    // ---- tail ----
    if (def.tail !== 'none') {
      var tailLen = def.tailLen != null ? def.tailLen : Math.round((br - bl) * 0.42);
      var spread = def.tailSpread != null ? def.tailSpread : def.hh * 1.35;
      for (var tx = 0; tx <= tailLen; tx++) {
        var x2 = bl - tx;
        var t2 = tx / Math.max(1, tailLen);
        var half2 = spread * Math.pow(t2, 0.85);
        var top = cy - half2, bot = cy + half2;
        for (var y3 = Math.floor(top); y3 <= Math.ceil(bot); y3++) {
          if (def.tail === 'fork') {
            var d2 = Math.abs(y3 - cy);
            if (t2 > 0.35 && d2 < half2 * 0.55) {
              if (Math.abs(d2 - half2 * 0.75) < 0.6) { /* keep thin ridge */ }
              else continue;
            }
          }
          if (def.tail === 'long') {
            // sweep the tail down like a flowing ribbon
            var off = Math.round(3 * t2 * t2);
            set(x2, y3 + off, (y3 % 3 === 0) ? fin : fin2);
          } else {
            set(x2, y3, ((tx + y3) % 4 === 0) ? fin2 : fin);
          }
        }
      }
    }

    /* ---- body outline ---- */
    var mask = new Array(W * H);
    for (var mi = 0; mi < W * H; mi++) mask[mi] = col[mi] ? 1 : 0;
    for (var ox = 0; ox < W; ox++) for (var oy = 0; oy < H; oy++) {
      if (!mask[id(ox, oy)]) continue;
      var edge = !(ox > 0 && mask[id(ox - 1, oy)]) ||
        !(ox < W - 1 && mask[id(ox + 1, oy)]) ||
        !(oy > 0 && mask[id(ox, oy - 1)]) ||
        !(oy < H - 1 && mask[id(ox, oy + 1)]);
      if (edge) col[id(ox, oy)] = def.c.outline;
    }

    /* ---- face / extras (drawn on top of the outline) ---- */
    var eyeX = br - 3, eyeY = cy - Math.max(1, Math.round(def.hh * 0.30));
    set(eyeX - 1, eyeY, def.c.eye);
    set(eyeX, eyeY, def.c.eye);
    set(eyeX, eyeY + 1, def.c.eye);
    set(eyeX, eyeY, def.c.pupil);
    set(eyeX - 1, eyeY + 1, def.c.pupil);

    // mouth
    set(br, cy + 1, def.c.outline);
    set(br - 1, cy + 1, def.c.outline);

    if (def.whiskers) {
      pixelLine(g, br - 1, cy + 1, br - 5, cy + 4, def.c.outline);
      pixelLine(g, br - 2, cy + 2, br - 6, cy + 6, def.c.outline);
    }
    if (def.horn) {
      pixelLine(g, br - 5, cy - def.hh, br - 8, cy - def.hh - 4, def.c.accent);
      pixelLine(g, br - 6, cy - def.hh, br - 8, cy - def.hh - 3, def.c.accent);
    }
    if (def.crown) {
      for (var cc = 0; cc < 4; cc++) {
        var crx = bl + (br - bl) * (0.30 + cc * 0.11);
        var cbase = cy - halfAt(crx);
        set(crx, cbase - 1, def.c.accent);
        set(crx, cbase - 2, def.c.accent);
        set(crx + 1, cbase - 1, def.c.accent);
      }
    }
    if (def.lure) {
      // a little glowing stalk from the head
      var lx = br - 6;
      pixelLine(g, lx, cy - def.hh, lx - 3, cy - def.hh - 6, def.c.accent);
      set(lx - 3, cy - def.hh - 7, '#ffffff');
      set(lx - 4, cy - def.hh - 6, def.c.accent);
      set(lx - 2, cy - def.hh - 6, def.c.accent);
    }
    if (def.biolum) {
      var brnd = sr((def.seed || 7) * 3 + 1);
      for (var bb = 0; bb < 14; bb++) {
        var bbx = bl + Math.floor(brnd() * (br - bl));
        var bby = cy + Math.floor((brnd() * 2 - 1) * def.hh);
        if (has(bbx, bby)) set(bbx, bby, (bb % 2) ? '#ffffff' : def.c.accent);
      }
    }

    /* ---- render ---- */
    for (var rx = 0; rx < W; rx++) {
      for (var ry = 0; ry < H; ry++) {
        var cc2 = col[id(rx, ry)];
        if (cc2) { g.fillStyle = cc2; g.fillRect(rx, ry, 1, 1); }
      }
    }

    return { canvas: cv, w: W, h: H };
  }

  /* ---------------------------- fish list ---------------------------- */
  var C = P;
  var FISH_DEFS = [
    // ---- COMMON ----
    {
      key: 'bluegill', name: 'Bluegill', rarity: 'Common',
      w: 30, h: 20, len: 20, hh: 6.5, cy: 10, power: 0.5, skew: 0.8,
      pattern: 'bars', barGap: 4, tail: 'fan', tailLen: 8, tailSpread: 7,
      dorsalType: 'tri', dorsalH: 7, anal: true,
      c: { top: '#3f6f9e', mid: '#5c93bf', low: '#8fc0d8', belly: '#dcc98a', fin: '#e0a24a', fin2: '#f0c46a', accent: '#2f5578', outline: '#1d2c3a', eye: '#f4f0e0', pupil: '#1a1a1a' },
      seed: 11
    },
    {
      key: 'perch', name: 'Pebble Perch', rarity: 'Common',
      w: 32, h: 20, len: 22, hh: 6, cy: 10, power: 0.55,
      pattern: 'bars', barGap: 5, tail: 'fan', tailLen: 8, tailSpread: 6,
      dorsalType: 'tri', dorsalH: 6, anal: true,
      c: { top: '#5d6b52', mid: '#7c8a63', low: '#a9b07f', belly: '#e0d6b0', fin: '#b9703f', fin2: '#d08a52', accent: '#3f4a35', outline: '#232a1d', eye: '#f4f0e0', pupil: '#141414' },
      seed: 22
    },
    // ---- UNCOMMON ----
    {
      key: 'copperfin', name: 'Copperfin', rarity: 'Uncommon',
      w: 34, h: 22, len: 23, hh: 8, cy: 11, power: 0.5, round: true,
      pattern: 'copper', tail: 'fork', tailLen: 10, tailSpread: 10,
      dorsalType: 'sail', dorsalH: 10, anal: true,
      c: { top: '#9c5a2a', mid: '#c87a3a', low: '#e2a35c', belly: '#f4d9a6', fin: '#d98a3c', fin2: '#f0b060', accent: '#b06428', outline: '#3a2113', eye: '#fff6e0', pupil: '#20140a' },
      seed: 33
    },
    {
      key: 'reedcarp', name: 'Reed Carp', rarity: 'Uncommon',
      w: 36, h: 20, len: 26, hh: 6.5, cy: 10, power: 0.6, skew: 0.86,
      pattern: 'none', tail: 'fan', tailLen: 9, tailSpread: 7,
      dorsalType: 'long', dorsalH: 6, anal: true, whiskers: true,
      c: { top: '#5c6e3a', mid: '#7f9147', low: '#a7b566', belly: '#e4dcae', fin: '#b08a48', fin2: '#caa666', accent: '#4a5a2c', outline: '#2a331a', eye: '#f4f0e0', pupil: '#161a0e' },
      seed: 44
    },
    // ---- RARE ----
    {
      key: 'silvertail', name: 'Silvertail Salmon', rarity: 'Rare',
      w: 38, h: 22, len: 28, hh: 7, cy: 11, power: 0.58, skew: 0.9, skewOff: 0.10,
      pattern: 'stripe', tail: 'fork', tailLen: 11, tailSpread: 9,
      dorsalType: 'tri', dorsalH: 6, anal: true,
      c: { top: '#8fa6bd', mid: '#b9c9dc', low: '#dbe4ee', belly: '#f4f7fb', fin: '#c98a9a', fin2: '#e0aab6', accent: '#d17d92', outline: '#38495c', eye: '#ffffff', pupil: '#111820' },
      seed: 55
    },
    {
      key: 'moontrout', name: 'Moon Trout', rarity: 'Rare',
      w: 36, h: 22, len: 26, hh: 7, cy: 11, power: 0.6,
      pattern: 'spots', spotCount: 16, tail: 'fan', tailLen: 9, tailSpread: 8,
      dorsalType: 'tri', dorsalH: 6, anal: true,
      c: { top: '#5a6fa8', mid: '#7e93c8', low: '#acc0e2', belly: '#e6ecf8', fin: '#8fa0d0', fin2: '#b3c2e6', accent: '#e8eeff', outline: '#2c3656', eye: '#ffffff', pupil: '#101522' },
      seed: 66
    },
    // ---- EPIC ----
    {
      key: 'amberkoi', name: 'Amber Koi', rarity: 'Epic',
      w: 40, h: 24, len: 27, hh: 9, cy: 12, power: 0.5, round: true, skew: 0.86, skewOff: 0.12,
      pattern: 'koi', patches: 4, tail: 'long', tailLen: 12, tailSpread: 11,
      dorsalType: 'long', dorsalH: 6, anal: true,
      c: { top: '#e07a1e', mid: '#f29a34', low: '#f7b95e', belly: '#fff0cf', fin: '#f6c86a', fin2: '#ffe0a0', accent: '#d8621a', patch: '#fff4e2', outline: '#5a2f10', eye: '#fff8e0', pupil: '#2a160a' },
      seed: 77
    },
    {
      key: 'stormray', name: 'Stormray', rarity: 'Epic',
      w: 42, h: 26, len: 28, hh: 7, cy: 13, power: 0.42, skew: 0.9, skewOff: 0.10,
      pattern: 'storm', tail: 'none', tailLen: 0,
      dorsalType: 'none', anal: false, pectoral: false,
      c: { top: '#41588f', mid: '#5f79b5', low: '#8ba0d0', belly: '#d6e0f2', fin: '#7d92c8', fin2: '#a8b8e0', accent: '#ffe27a', outline: '#232f52', eye: '#ffffff', pupil: '#0d1224' },
      seed: 88,
      custom: 'ray'
    },
    // ---- LEGENDARY ----
    {
      key: 'embercoil', name: 'Embercoil', rarity: 'Legendary',
      w: 44, h: 22, len: 32, hh: 5, cy: 11, power: 0.7, skew: 0.95, skewOff: 0.05,
      pattern: 'ember', tail: 'long', tailLen: 10, tailSpread: 6,
      dorsalType: 'long', dorsalH: 4, anal: false, pectoral: false,
      c: { top: '#7a2410', mid: '#c0421a', low: '#e8732a', belly: '#f7b25a', fin: '#f0a23a', fin2: '#ffd070', accent: '#ffd24a', outline: '#361006', eye: '#fff2b0', pupil: '#2a0d04' },
      seed: 99, biolum: true
    },
    {
      key: 'sturgeon', name: 'Crown Sturgeon', rarity: 'Legendary',
      w: 46, h: 24, len: 34, hh: 8, cy: 12, power: 0.5, skew: 0.98, skewOff: 0.02,
      pattern: 'scute', tail: 'fork', tailLen: 12, tailSpread: 10,
      dorsalType: 'tri', dorsalH: 5, anal: true, crown: true,
      c: { top: '#4f6a72', mid: '#6f8a8f', low: '#a2b8b6', belly: '#e0e6d8', fin: '#8aa0a2', fin2: '#aec0be', accent: '#ffd86a', outline: '#25353a', eye: '#ffffff', pupil: '#101c1e' },
      seed: 111
    },
    // ---- ANCIENT ----
    {
      key: 'leviathan', name: 'Lumen Leviathan', rarity: 'Ancient',
      w: 48, h: 28, len: 36, hh: 9, cy: 14, power: 0.5, skew: 0.92, skewOff: 0.06,
      pattern: 'rune', tail: 'long', tailLen: 12, tailSpread: 10,
      dorsalType: 'sail', dorsalH: 12, anal: true, lure: true, biolum: true,
      c: { top: '#123a4a', mid: '#1d6b74', low: '#2fa79a', belly: '#bff0dc', fin: '#2fbfa8', fin2: '#7fe6cf', accent: '#8ffbe0', outline: '#08222c', eye: '#ffffff', pupil: '#04141a' },
      seed: 222
    },
    {
      key: 'tidewaker', name: 'Tidewaker', rarity: 'Ancient',
      w: 46, h: 28, len: 30, hh: 9, cy: 14, power: 0.48, round: true, skew: 0.84, skewOff: 0.14,
      pattern: 'rune', tail: 'fork', tailLen: 13, tailSpread: 12,
      dorsalType: 'sail', dorsalH: 13, anal: true, horn: true, biolum: true,
      c: { top: '#2a2f6e', mid: '#4a4fb0', low: '#7f86e0', belly: '#d8dcff', fin: '#6f78d8', fin2: '#a2aaff', accent: '#9ffff0', outline: '#181c46', eye: '#ffffff', pupil: '#080a20' },
      seed: 333
    }
  ];

  // Special ray geometry (wings instead of a normal body)
  function makeRay(def) {
    var W = def.w, H = def.h, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    var col = new Array(W * H).fill(null);
    function id(x, y) { return y * W + x; }
    function set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H || !c) return; col[id(x, y)] = c; }
    function has(x, y) { return (x >= 0 && y >= 0 && x < W && y < H) ? !!col[id(x, y)] : false; }
    var cy = 10;
    // diamond wings
    for (var x = 0; x < W; x++) {
      var nx = x / (W - 1);
      var wing = Math.sin(Math.PI * nx);
      var hh = def.hh * Math.pow(wing, 0.6);
      // sweep back the tips
      var off = Math.round((1 - wing) * 3);
      for (var y = Math.floor(cy - hh) + off; y <= Math.ceil(cy + hh * 0.6) + off; y++) {
        var ty = (y - (cy - hh)) / (2 * hh);
        var c = ty < 0.35 ? def.c.top : (ty < 0.7 ? def.c.mid : def.c.belly);
        set(x, y, c);
      }
    }
    // tail whip
    for (var tx = 0; tx < 10; tx++) {
      set(Math.round(W * 0.5) + Math.round(tx * 0.15), cy + 3 + tx, def.c.mid);
      if (tx % 2) set(Math.round(W * 0.5) + Math.round(tx * 0.15) + 1, cy + 3 + tx, def.c.low);
    }
    // lightning pattern
    for (var z = 0; z < 5; z++) {
      var zx = 8 + z * 6;
      for (var zy = -8; zy < 8; zy++) {
        var zz = zy + (((zy + z) % 3 === 0) ? 1 : -1);
        if (has(zx, cy + zz)) set(zx, cy + zz, def.c.accent);
        if (has(zx + 1, cy + zz)) set(zx + 1, cy + zz, def.c.accent);
      }
    }
    // outline
    var mask = col.map(function (v) { return v ? 1 : 0; });
    for (var ox = 0; ox < W; ox++) for (var oy = 0; oy < H; oy++) {
      if (!mask[id(ox, oy)]) continue;
      var edge = !(ox > 0 && mask[id(ox - 1, oy)]) || !(ox < W - 1 && mask[id(ox + 1, oy)]) ||
        !(oy > 0 && mask[id(ox, oy - 1)]) || !(oy < H - 1 && mask[id(ox, oy + 1)]);
      if (edge) col[id(ox, oy)] = def.c.outline;
    }
    // eyes on top
    set(20, cy - 4, def.c.eye); set(21, cy - 4, def.c.pupil);
    set(26, cy - 4, def.c.eye); set(27, cy - 4, def.c.pupil);
    for (var rx = 0; rx < W; rx++) for (var ry = 0; ry < H; ry++) {
      if (col[id(rx, ry)]) { g.fillStyle = col[id(rx, ry)]; g.fillRect(rx, ry, 1, 1); }
    }
    return { canvas: cv, w: W, h: H };
  }

  var FISH = [];
  FISH_DEFS.forEach(function (def) {
    var sprite = def.custom === 'ray' ? makeRay(def) : makeFish(def);
    FISH.push({ key: def.key, name: def.name, rarity: def.rarity, sprite: sprite, def: def });
  });

  var BY_RARITY = {};
  FISH.forEach(function (f) {
    (BY_RARITY[f.rarity] = BY_RARITY[f.rarity] || []).push(f);
  });

  /* ==================================================================
     SCENE
     ================================================================== */

  var shorePts = [
    [302, 68], [294, 82], [288, 95], [284, 107], [277, 119],
    [269, 130], [261, 141], [252, 152], [245, 163], [240, 173], [238, 180]
  ];

  function landPath(g) {
    g.beginPath();
    g.moveTo(shorePts[0][0], shorePts[0][1]);
    for (var i = 1; i < shorePts.length; i++) g.lineTo(shorePts[i][0], shorePts[i][1]);
    g.lineTo(320, 180);
    g.lineTo(320, 0);
    g.closePath();
  }

  function drawSky(g, t) {
    g.fillStyle = getSky(g);
    g.fillRect(0, 0, 320, 76);

    // sun
    var sx = 74, sy = 50;
    var pulse = 1 + Math.sin(t * 0.8) * 0.03;
    g.globalAlpha = 0.25;
    disc(g, sx, sy, 20 * pulse, P.sun);
    g.globalAlpha = 0.5;
    disc(g, sx, sy, 15 * pulse, P.sun);
    g.globalAlpha = 1;
    disc(g, sx, sy, 11, P.sun);
    disc(g, sx - 2, sy - 2, 8, P.sunCore);

    // clouds (soft pixel puffs drifting slowly)
    function cloud(cx, cy, s, alpha) {
      g.globalAlpha = alpha;
      disc(g, cx, cy, 5 * s, P.cloud);
      disc(g, cx + 6 * s, cy + 1 * s, 4 * s, P.cloud);
      disc(g, cx - 6 * s, cy + 1 * s, 4 * s, P.cloud);
      disc(g, cx + 2 * s, cy - 3 * s, 4 * s, P.cloud);
      // shaded underside
      g.globalAlpha = alpha * 0.5;
      for (var i = 0; i < Math.round(10 * s); i++) {
        px(g, cx - 8 * s + i, cy + 4 * s, P.cloudShade);
      }
      g.globalAlpha = 1;
    }
    cloud(((30 + t * 3) % 400) - 60, 24, 1.0, 0.9);
    cloud(((150 + t * 1.6) % 430) - 50, 14, 0.75, 0.75);
    cloud(((250 + t * 2.2) % 430) - 40, 34, 0.6, 0.65);

    // birds
    function bird(bx, by, flap, s) {
      px(g, bx, by, '#33454f', s, s);
      px(g, bx - s, by - (flap ? s : 0), '#33454f', s, s);
      px(g, bx + s, by - (flap ? s : 0), '#33454f', s, s);
    }
    var bxx = 250 - ((t * 6) % 340);
    bird(bxx, 30, Math.sin(t * 7) > 0, 2);
    bird(bxx - 9, 35, Math.sin(t * 7 + 1) > 0, 2);

    // distant sea stacks on the horizon
    g.fillStyle = mix(P.waterFar, '#123', 0.45);
    g.fillRect(20, 66, 9, 8);
    g.fillRect(24, 62, 4, 12);
    g.fillRect(118, 67, 12, 7);
    g.fillRect(122, 63, 5, 11);
    g.globalAlpha = 0.6;
    g.fillStyle = mix(P.grassDark, '#123', 0.4);
    g.fillRect(21, 64, 5, 3);
    g.fillRect(119, 65, 6, 3);
    g.globalAlpha = 1;
  }

  function waterColorAt(y) {
    if (y < 82) return mix(P.waterFar, P.waterMid, (y - 68) / 14);
    if (y < 120) return mix(P.waterMid, P.waterNear, (y - 82) / 38);
    return mix(P.waterNear, P.waterDeep, clamp((y - 120) / 60, 0, 1));
  }

  function drawWater(g, t) {
    var y;
    for (y = 66; y < 180; y++) {
      g.fillStyle = waterColorAt(y);
      g.fillRect(0, y, 320, 1);
    }

    // horizon line
    g.fillStyle = mix(P.waterFar, '#ffffff', 0.25);
    g.fillRect(0, 66, 320, 1);
    g.fillStyle = mix(P.waterFar, '#000000', 0.15);
    g.fillRect(0, 67, 320, 1);

    // sun glitter on the water
    var gx = 74;
    for (var gi = 0; gi < 22; gi++) {
      var gy = 70 + gi * 5;
      var span = 4 + gi * 2.2;
      var flick = 0.5 + 0.5 * Math.sin(t * 3 + gi * 1.7);
      g.globalAlpha = 0.10 + 0.28 * flick;
      g.fillStyle = P.waveBright;
      var gw = Math.max(1, Math.round(span * (0.5 + flick)));
      g.fillRect(gx - Math.floor(gw / 2) + Math.round(Math.sin(t + gi) * 3), gy, gw, 1);
    }
    g.globalAlpha = 1;

    // animated shimmer lines
    for (var r = 0; r < 15; r++) {
      var baseY = 74 + r * 7 + (r % 2);
      var speed = 0.5 + r * 0.14;
      var amp = 0.8 + (r / 15) * 2.2;
      var alpha = 0.10 + r * 0.028;
      g.fillStyle = 'rgba(223,246,238,' + alpha.toFixed(3) + ')';
      var phase = t * speed * 12;
      for (var x = 0; x < 320; x++) {
        var wob = Math.sin((x * 0.05 + phase) * 1.1) * amp +
          Math.sin(x * 0.13 - phase * 0.8) * amp * 0.5;
        var yy = Math.round(baseY + wob);
        // dashed so it reads as sparkle, not a solid ruled line
        if (((x + phase * 1.5) % 13 + 13) % 13 < 6) px(g, x, yy, g.fillStyle);
      }
    }

    // darker troughs for depth
    g.fillStyle = 'rgba(10,40,60,0.16)';
    for (var q = 0; q < 8; q++) {
      var ty = 96 + q * 10;
      var sp2 = 0.3 + q * 0.1;
      for (var xx = 0; xx < 320; xx++) {
        var yoff = Math.round(Math.sin(xx * 0.04 - t * sp2 * 8) * 2);
        if (((xx + t * 6) % 17 + 17) % 17 < 7) px(g, xx, ty + yoff, g.fillStyle);
      }
    }
  }

  function drawLand(g, t) {
    // sand first (slightly wider silhouette)
    landPath(g);
    g.save();
    g.fillStyle = P.grassDark;
    g.fill();
    g.restore();

    // sand fringe along the water edge
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = P.sand;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(shorePts[0][0], shorePts[0][1]);
    for (var i = 1; i < shorePts.length; i++) g.lineTo(shorePts[i][0], shorePts[i][1]);
    g.stroke();
    g.strokeStyle = P.sandDark;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(shorePts[0][0], shorePts[0][1]);
    for (var j = 1; j < shorePts.length; j++) g.lineTo(shorePts[j][0], shorePts[j][1]);
    g.stroke();
    g.restore();

    // grass fills the rest
    landPath(g);
    g.save();
    g.fillStyle = P.grass;
    g.fill();
    g.restore();

    // grass texture + light variation
    var rnd = sr(4242);
    for (var k = 0; k < 260; k++) {
      var gxx = 250 + Math.floor(rnd() * 72);
      var gyy = 84 + Math.floor(rnd() * 100);
      // inside land?
      var inside = true;
      for (var s = 0; s < shorePts.length - 1; s++) {
        var a = shorePts[s], b = shorePts[s + 1];
        var t2 = (gyy - a[1]) / (b[1] - a[1]);
        if (t2 >= 0 && t2 <= 1) {
          var edgeX = a[0] + (b[0] - a[0]) * t2;
          if (gxx < edgeX + 2) inside = false;
          break;
        }
      }
      if (!inside) continue;
      var c = rnd() > 0.5 ? P.grassLight : P.grassDark;
      px(g, gxx, gyy, c, 1, rnd() > 0.7 ? 2 : 1);
    }
  }

  function drawTree(g, x, baseY, s, sway) {
    // trunk
    var th = Math.round(16 * s);
    for (var i = 0; i < th; i++) {
      var w = i < 3 ? 3 * s : (i < th - 4 ? 2 * s : 3 * s);
      px(g, x - w / 2, baseY - i, P.trunk, w, 1);
    }
    px(g, x - 4 * s, baseY, P.trunkLight, 8 * s, 2);
    // canopy: layered blobs, sway with t
    var csx = sway * 2;
    var cy = baseY - th - 6 * s;
    function blob(bx, by, r, c) { disc(g, x + bx + csx, cy + by, r * s, c); }
    blob(-6, 2, 7, P.leaf);
    blob(6, 1, 7, P.leafMid);
    blob(0, -4, 8, P.leafMid);
    blob(-3, -7, 5, P.leafLight);
    blob(4, -6, 5, P.leafLight);
    blob(-7, -1, 4, P.leafLight);
    blob(0, 3, 6, P.leaf);
    // highlights
    blob(-2, -8, 3, P.leafHi);
    blob(5, -7, 2, P.leafHi);
    // dappled dark
    g.globalAlpha = 0.25;
    blob(0, 4, 6, '#1c3a1a');
    g.globalAlpha = 1;
  }

  function drawBush(g, x, y, s) {
    disc(g, x, y, 5 * s, P.leaf);
    disc(g, x - 4 * s, y + 1, 4 * s, P.leafMid);
    disc(g, x + 4 * s, y + 1, 4 * s, P.leafMid);
    disc(g, x - 1, y - 3 * s, 3.5 * s, P.leafLight);
    disc(g, x + 3, y - 2, 2.5 * s, P.leafHi);
    g.globalAlpha = 0.2; disc(g, x + 1, y + 3 * s, 4 * s, '#16331a'); g.globalAlpha = 1;
  }

  function drawReeds(g, x, y, s, t) {
    for (var i = 0; i < 5; i++) {
      var bx = x + (i - 2) * 3 * s;
      var h = (10 + i * 2) * s;
      var sway = Math.sin(t * 1.4 + i) * 1.5;
      for (var j = 0; j < h; j++) {
        var px2 = bx + Math.round(sway * (j / h));
        px(g, px2, y - j, i % 2 ? P.grassLight : P.grass);
      }
      // seed head
      px(g, bx + Math.round(sway), y - h - 1, '#8a6a3a', 1, 3);
    }
  }

  function drawFlowers(g) {
    var spots = [[262, 120], [272, 132], [286, 146], [300, 150], [252, 158], [276, 166], [296, 128], [312, 138]];
    var cols = ['#f2d24a', '#ef8fb0', '#f4f0e0', '#e07a4a'];
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      var c = cols[i % cols.length];
      px(g, s[0], s[1], c);
      px(g, s[0] - 1, s[1], c);
      px(g, s[0] + 1, s[1], c);
      px(g, s[0], s[1] - 1, c);
      px(g, s[0], s[1] + 1, P.leaf);
    }
  }

  function drawRocks(g, t) {
    // foreground rock cluster, waterline foam
    rock(44, 158, 14, 8);
    rock(150, 168, 18, 9);
    function rock(cx, cy, w, h) {
      for (var y = 0; y < h; y++) {
        var ww = w * Math.sqrt(1 - Math.pow((y / h), 1.6));
        var col = y < h * 0.4 ? '#6d7a78' : (y < h * 0.7 ? '#596663' : '#46524f');
        g.fillStyle = col;
        g.fillRect(Math.round(cx - ww / 2), Math.round(cy - h + y), Math.round(ww), 1);
      }
      // moss cap
      px(g, cx - 4, cy - h + 1, P.leafMid, 6, 2);
      px(g, cx + 2, cy - h + 2, P.leaf, 4, 2);
      // foam ring animated
      var fo = Math.round(Math.sin(t * 2 + cx) * 1.5);
      pixelEllipse(g, cx, cy + 1 + fo, w / 2 + 4, 3, P.foam, 1);
    }
  }

  function drawLilies(g, t) {
    var pads = [[28, 162, 5], [40, 168, 4], [54, 158, 4.5], [66, 166, 3.5], [18, 172, 4]];
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      var bob = Math.round(Math.sin(t * 1.2 + i) * 1);
      var cy = p[1] + bob;
      // pad
      for (var y = -p[2]; y <= p[2]; y++) {
        var w = Math.sqrt(Math.max(0, p[2] * p[2] - y * y));
        g.fillStyle = (y < 0) ? P.grassLight : P.leafMid;
        g.fillRect(Math.round(p[0] - w), cy + y, Math.round(w * 2), 1);
      }
      px(g, p[0], cy, P.grassDark, 1, 1);
      // little blossom on one
      if (i === 2) {
        px(g, p[0], cy - 3, '#f4e6f0');
        px(g, p[0], cy - 4, '#e79ac0');
        px(g, p[0] - 1, cy - 3, '#f4e6f0');
      }
    }
  }

  function drawDock(g, t) {
    var top = 140, bottom = 151;
    var left = 150, right = 264;
    // posts first (behind planks)
    var posts = [157, 190, 224, 256];
    for (var i = 0; i < posts.length; i++) {
      px(g, posts[i], top, P.woodDark, 4, bottom - top + 16);
      px(g, posts[i], top, P.woodLight, 1, bottom - top + 16);
      // reflection
      g.globalAlpha = 0.18;
      px(g, posts[i], bottom + 2, '#0c2c3c', 4, 14);
      g.globalAlpha = 1;
    }
    // planks
    for (var y = top; y < bottom; y++) {
      var shade = (y === top) ? P.woodLight : (y >= bottom - 2 ? P.woodDark : P.wood);
      g.fillStyle = shade;
      g.fillRect(left, y, right - left, 1);
    }
    // plank seams
    g.fillStyle = P.woodDark;
    for (var x = left; x < right; x += 11) {
      g.fillRect(x, top, 1, bottom - top);
    }
    // top highlight
    g.fillStyle = mix(P.woodLight, '#ffffff', 0.35);
    g.fillRect(left, top, right - left, 1);
    // front edge
    g.fillStyle = P.woodDark;
    g.fillRect(left, bottom - 2, right - left, 2);
    // nails
    g.fillStyle = '#3a2a1c';
    for (var nx = left + 5; nx < right; nx += 22) {
      px(g, nx, top + 2, '#3a2a1c');
      px(g, nx, bottom - 4, '#3a2a1c');
    }
    // dock reflection under the front edge
    g.globalAlpha = 0.22;
    for (var rx = left; rx < right; rx += 2) {
      var h2 = 8 + Math.round(Math.sin(t * 2 + rx * 0.2) * 3);
      px(g, rx, bottom + 1, '#0b2836', 2, h2);
    }
    g.globalAlpha = 1;
  }

  // Returns rod tip position. The angler faces left across the water.
  function drawAngler(g, x, feetY, o) {
    o = o || {};
    var lean = o.lean || 0;
    var bob = o.bob || 0;
    var rodAngle = o.rodAngle != null ? o.rodAngle : -2.32;

    // shadow on the dock
    g.globalAlpha = 0.25;
    disc(g, x + 1, feetY - 1, 6, '#20160e');
    g.globalAlpha = 1;

    var bx = x + lean;
    // boots
    px(g, bx - 4, feetY - 3, P.boot, 3, 3);
    px(g, bx + 1, feetY - 3, P.boot, 3, 3);
    // pants / legs
    px(g, bx - 4, feetY - 7, P.pants, 3, 4);
    px(g, bx + 1, feetY - 7, P.pants, 3, 4);
    px(g, bx - 4, feetY - 7, P.pantsDark, 1, 4);
    // torso
    px(g, bx - 4, feetY - 15 + bob, P.shirt, 9, 8);
    px(g, bx - 4, feetY - 15 + bob, P.shirtDark, 1, 8);
    px(g, bx + 3, feetY - 15 + bob, P.shirtDark, 1, 8);
    // belt
    px(g, bx - 4, feetY - 8 + bob, P.woodDark, 9, 1);
    // arm holding the rod (reaches up-left)
    var handX = bx - 6, handY = feetY - 13 + bob;
    pixelLine(g, bx - 3, feetY - 13 + bob, handX, handY, P.shirt);
    pixelLine(g, handX, handY, handX - 3, handY - 1, P.skin);
    px(g, handX - 3, handY - 1, P.skin, 2, 2);
    // other arm
    pixelLine(g, bx + 3, feetY - 12 + bob, bx + 5, feetY - 9 + bob, P.shirt);
    px(g, bx + 4, feetY - 9 + bob, P.skin, 2, 2);

    // head
    var hy = feetY - 20 + bob;
    px(g, bx - 4, hy, P.skin, 8, 7);
    px(g, bx - 4, hy, P.skinShade, 1, 7);
    // hair at the back
    px(g, bx + 2, hy + 1, P.hair, 2, 5);
    // face detail: eye looking left
    px(g, bx - 3, hy + 3, '#2a2018');
    // hat
    px(g, bx - 5, hy - 1, '#c9a24b', 11, 2);       // brim
    px(g, bx - 3, hy - 4, '#d8b055', 7, 4);        // crown
    px(g, bx - 3, hy - 1, '#a5802f', 7, 1);        // band
    px(g, bx - 3, hy - 4, '#e8c877', 7, 1);        // highlight

    // rod
    var rodLen = 36;
    var baseX = handX - 1, baseY = handY;
    var tipX = baseX + Math.cos(rodAngle) * rodLen;
    var tipY = baseY + Math.sin(rodAngle) * rodLen;
    pixelLine(g, baseX, baseY, tipX, tipY, '#5a3d22');
    pixelLine(g, baseX, baseY - 1, tipX, tipY - 1, '#8a6440');
    // reel
    px(g, baseX + 2, baseY + 1, '#c8c2b0', 3, 3);
    px(g, baseX + 2, baseY + 1, '#8f8a7c', 1, 3);

    return { x: tipX, y: tipY, baseX: baseX, baseY: baseY, handX: handX, handY: handY };
  }

  function drawBobber(g, x, y, dip, t, ripple) {
    var by = y + dip;
    if (ripple) {
      var rr = ripple * 26;
      g.globalAlpha = clamp(1 - ripple, 0, 1) * 0.8;
      pixelEllipse(g, x, y + 2, rr, rr * 0.4, P.foam, 1);
      if (ripple > 0.25) {
        var rr2 = (ripple - 0.25) * 26;
        pixelEllipse(g, x, y + 2, rr2, rr2 * 0.4, 'rgba(223,246,238,0.6)', 1);
      }
      g.globalAlpha = 1;
    }
    // water shadow
    g.globalAlpha = 0.3;
    pixelEllipse(g, x, y + 2, 4, 1.6, '#0a2c3c', 1);
    g.globalAlpha = 1;
    // body
    px(g, x - 1, by - 2, P.bobberRed, 3, 3);
    px(g, x - 1, by + 1, P.bobberWhite, 3, 2);
    px(g, x - 1, by - 3, P.bobberRed, 1, 1);
    px(g, x, by - 4, '#7a5a2a', 1, 2);
    // wet sheen
    px(g, x - 1, by - 2, '#ff8a80', 1, 1);
  }

  // Draw a sagging fishing line between the rod tip and the bobber.
  function drawLine(g, tipX, tipY, bx, by, color) {
    var segs = 16;
    var sag = clamp(Math.abs(bx - tipX) * 0.16, 2, 9);
    var prevX = tipX, prevY = tipY;
    for (var i = 1; i <= segs; i++) {
      var t = i / segs;
      var x = lerp(tipX, bx, t);
      var y = lerp(tipY, by, t) + Math.sin(Math.PI * t) * sag;
      pixelLine(g, prevX, prevY, x, y, color);
      prevX = x; prevY = y;
    }
  }

  /* ------------------------- main scene draw ------------------------- */
  function drawScene(g, v) {
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 320, 180);

    drawSky(g, v.t);
    drawWater(g, v.t);
    drawLilies(g, v.t);
    drawRocks(g, v.t);
    drawLand(g, v.t);

    // back vegetation
    drawTree(g, 300, 118, 1.0, Math.sin(v.t * 0.9));
    drawTree(g, 288, 150, 0.7, Math.sin(v.t * 0.9 + 1));
    drawBush(g, 312, 172, 1.1);
    drawBush(g, 262, 170, 0.9);
    drawReeds(g, 280, 122, 0.8, v.t);
    drawFlowers(g);
    drawBush(g, 246, 178, 0.8);

    // dock + shore details
    drawDock(g, v.t);
    // bucket
    px(g, 236, 128, '#8a97a0', 6, 7);
    px(g, 236, 128, '#b9c4cb', 6, 1);
    px(g, 238, 126, '#6b777f', 1, 2);
    px(g, 241, 126, '#6b777f', 1, 2);
    px(g, 236, 129, '#6b777f', 1, 6);
    // lantern on a post
    px(g, 254, 122, '#4a4a52', 1, 10);
    px(g, 251, 118, '#e8b84a', 5, 5);
    px(g, 252, 119, '#fff0b0', 3, 3);
    g.globalAlpha = 0.25 + 0.1 * Math.sin(v.t * 3);
    disc(g, 253, 120, 6, '#ffe08a');
    g.globalAlpha = 1;

    // angler + rod
    var ang = drawAngler(g, 205, 140, {
      bob: v.angBob || 0,
      lean: v.angLean || 0,
      rodAngle: v.rodAngle
    });

    // line + bobber
    if (v.lineVisible) {
      drawLine(g, ang.x, ang.y, v.bobberX, v.bobberY + (v.bobberDip || 0), 'rgba(30,45,55,0.75)');
    }
    if (v.bobberVisible) {
      drawBobber(g, v.bobberX, v.bobberY, v.bobberDip || 0, v.t, v.ripple);
    }

    // bite cue above the bobber
    if (v.biteCue) {
      var bcy = v.bobberY - 16 + Math.round(Math.sin(v.t * 18) * 1);
      PixelFont.draw(g, '!', v.bobberX - 2, bcy, 1, '#fff4c0', { shadow: '#c0392b', shadowX: 1, shadowY: 1 });
    }

    // splash particles during a catch
    if (v.splash) {
      var rr = sr(Math.floor(v.splashSeed || 1));
      for (var i = 0; i < 10; i++) {
        var life = (v.splash - rr() * 0.4);
        if (life <= 0) continue;
        var ang2 = rr() * Math.PI * 2;
        var dist = life * 22;
        var px2 = v.bobberX + Math.cos(ang2) * dist;
        var py2 = v.bobberY - 2 - Math.sin(ang2) * dist * 0.6 + life * life * 24;
        var a = clamp(1 - life, 0, 1);
        g.globalAlpha = a;
        ofsPixel(g, px2, py2, a > 0.5 ? P.foam : P.wave);
        g.globalAlpha = 1;
      }
    }
  }

  function ofsPixel(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }

  /* --------------------------- public API ---------------------------- */
  window.Art = {
    P: P,
    drawScene: drawScene,
    drawFishSprite: function (g, fish, cx, cy, scale) {
      var s = fish.sprite;
      g.imageSmoothingEnabled = false;
      var w = s.w * scale, h = s.h * scale;
      g.drawImage(s.canvas, 0, 0, s.w, s.h,
        Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    },
    FISH: FISH,
    fishByRarity: BY_RARITY,
    mix: mix,
    helpers: { pixelLine: pixelLine, pixelEllipse: pixelEllipse, disc: disc, sr: sr }
  };
})();
