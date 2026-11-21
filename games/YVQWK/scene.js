/* =========================================================================
 * scene.js — all environment art for the island fishing spot.
 * Everything is drawn in code with integer-aligned rectangles for a crisp
 * pixel-art look. No external assets.
 * ========================================================================= */
(function () {
  'use strict';

  var W = 320, H = 180;
  var HORIZON = 72;

  /* ----------------------------- palette ----------------------------- */
  var PAL = {
    skyTop: '#3f7cae', skyMid: '#7cb9d8', skyLow: '#c2e6ec', skyGlow: '#ffe6b2',
    sun: '#fff6d2', sunGlow: '#ffe092',
    hillFar: '#8fb0c4', hillMid: '#7399b2', hillNear: '#5f86a0',
    treeFar: '#4e7f6d', treeFar2: '#3f6d5d',
    waterTop: '#3f96b2', waterMid: '#2f7fa2', waterDeep: '#1d5c80',
    waterHi: '#b8e8e2', foam: '#e8f7f2',
    sand: '#e2c48c', sandDark: '#c9a468', sandShadow: '#a9824f',
    grass: '#4f8a43', grassDark: '#356331', grassLight: '#7ebd5a',
    bush: '#3f7a3d', bushDark: '#2c5730', berry: '#cf4b4b',
    trunk: '#6b4a30', trunkDark: '#4a3220',
    leaf: '#4e8a46', leafLight: '#77b85c', leafDark: '#356633',
    wood: '#a5713f', woodLight: '#c48f57', woodDark: '#6f4a28',
    woodShadow: '#4a301c'
  };

  /* ---------------------------- utilities ---------------------------- */
  function hx(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    var A = hx(a), B = hx(b);
    var r = Math.round(A[0] + (B[0] - A[0]) * t);
    var g = Math.round(A[1] + (B[1] - A[1]) * t);
    var bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function disc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    for (var y = -r; y <= r; y++) {
      var dx = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      ctx.fillRect(Math.round(cx - dx), Math.round(cy + y), dx * 2 + 1, 1);
    }
  }
  function ellipseSpan(ctx, cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    for (var y = -ry; y <= ry; y++) {
      var t = y / ry;
      var dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      ctx.fillRect(Math.round(cx - dx), Math.round(cy + y), dx * 2 + 1, 1);
    }
  }
  function rngSprite(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var GEO = {
    W: W, H: H, HORIZON: HORIZON,
    DOCK_X0: 28, DOCK_X1: 126, DECK_Y: 106, DECK_H: 10,
    ANGLER_X: 74, ANGLER_FEET_Y: 110,
    ROD_TIP: { x: 96, y: 60 }
  };

  /* =============================== sky =============================== */
  function drawSky(ctx, t) {
    for (var y = 0; y < HORIZON; y++) {
      var f = y / HORIZON;
      var c;
      if (f < 0.5) c = mix(PAL.skyTop, PAL.skyMid, f / 0.5);
      else if (f < 0.84) c = mix(PAL.skyMid, PAL.skyLow, (f - 0.5) / 0.34);
      else c = mix(PAL.skyLow, PAL.skyGlow, (f - 0.84) / 0.16);
      px(ctx, 0, y, W, 1, c);
    }

    /* sun + halo */
    var sx = 258, sy = 26;
    for (var r = 15; r >= 7; r--) {
      ctx.globalAlpha = 0.10;
      disc(ctx, sx, sy, r, r > 11 ? PAL.sunGlow : PAL.sun);
    }
    ctx.globalAlpha = 1;
    disc(ctx, sx, sy, 6, PAL.sunGlow);
    disc(ctx, sx, sy, 4, PAL.sun);
    var rnd = rngSprite(7);
    for (var i = 0; i < 10; i++) {
      var a = rnd() * Math.PI * 2, d = 7 + rnd() * 2;
      px(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 1, 1, PAL.sun);
    }

    drawClouds(ctx, t);
  }

  function drawClouds(ctx, t) {
    var clouds = [
      { x: 40, y: 24, s: 1.0, sp: 2.2 },
      { x: 150, y: 40, s: 0.7, sp: 3.0 },
      { x: 240, y: 16, s: 0.8, sp: 1.7 },
      { x: 300, y: 50, s: 0.55, sp: 3.6 }
    ];
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var cx = ((c.x + t * c.sp) % (W + 90)) - 45;
      var s = c.s;
      ctx.globalAlpha = 0.92;
      disc(ctx, cx, c.y, 6 * s, '#ffffff');
      disc(ctx, cx + 6 * s, c.y - 2 * s, 5 * s, '#ffffff');
      disc(ctx, cx - 6 * s, c.y + 1 * s, 5 * s, '#f2fbff');
      px(ctx, cx - 10 * s, c.y + 3 * s, 20 * s, 2 * s, '#e6f5fb');
      ctx.globalAlpha = 1;
    }
  }

  /* ======================== distant scenery ========================= */
  function drawHills(ctx) {
    hillLayer(ctx, 58, 10, PAL.hillFar, 13);
    hillLayer(ctx, 64, 8, PAL.hillMid, 31);
    hillLayer(ctx, 69, 6, PAL.hillNear, 53);
  }

  function hillLayer(ctx, baseY, amp, color, seed) {
    var rnd = rngSprite(seed);
    var p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28;
    for (var x = 0; x < W; x++) {
      var y = baseY - amp * (0.5 + 0.3 * Math.sin(x * 0.05 + p1) + 0.2 * Math.sin(x * 0.13 + p2));
      px(ctx, x, y, 1, HORIZON + 4 - y, color);
    }
  }

  function drawFarTrees(ctx, t) {
    /* dark tree line sitting on the horizon */
    var rnd = rngSprite(91);
    for (var x = 0; x < W; x++) {
      var y = HORIZON - 6 - 3 * Math.sin(x * 0.09 + 1.2) - 2 * Math.sin(x * 0.31 + 4.0);
      px(ctx, x, y, 1, HORIZON - y + 1, PAL.treeFar);
    }
    /* tree clumps */
    for (var i = 0; i < 26; i++) {
      var tx = Math.floor(rnd() * W);
      var th = 5 + Math.floor(rnd() * 8);
      disc(ctx, tx, HORIZON - 5 - Math.floor(rnd() * 2), 2 + rnd() * 2.5, PAL.treeFar2);
      px(ctx, tx, HORIZON - 5 - th, 1, th, PAL.treeFar2);
    }
    /* tiny far cabins with warm windows */
    drawCabin(ctx, 196, HORIZON - 10);
    drawCabin(ctx, 214, HORIZON - 7);
  }

  function drawCabin(ctx, x, y) {
    px(ctx, x, y, 9, 7, '#6a4a33');
    px(ctx, x - 1, y - 3, 11, 3, '#4a3220');
    /* roof */
    for (var i = 0; i <= 5; i++) px(ctx, x - 1 + i, y - 3 - Math.floor(i * 0.6), 11 - i * 2, 1, '#3d2a1b');
    px(ctx, x + 3, y + 3, 2, 3, '#3d2a1b');
    px(ctx, x + 1, y + 1, 2, 2, '#ffd98a');
  }

  /* ============================== water ============================== */
  function drawWater(ctx, t) {
    for (var y = HORIZON; y < H; y++) {
      var f = (y - HORIZON) / (H - HORIZON);
      var c = f < 0.55 ? mix(PAL.waterTop, PAL.waterMid, f / 0.55)
                       : mix(PAL.waterMid, PAL.waterDeep, (f - 0.55) / 0.45);
      px(ctx, 0, y, W, 1, c);
    }
    /* sun glitter column */
    var gx = 258;
    for (var yy = HORIZON + 2; yy < H; yy++) {
      var spread = 4 + (yy - HORIZON) * 0.18;
      var n = 3 + Math.floor((yy - HORIZON) / 6);
      for (var k = 0; k < n; k++) {
        var off = Math.sin(yy * 1.7 + k * 2.3 + t * 2.2) * spread;
        var len = 2 + ((k + yy) % 3);
        if ((k + Math.floor(t * 6) + yy) % 3 === 0) continue;
        ctx.globalAlpha = 0.5;
        px(ctx, gx + off, yy, len, 1, PAL.waterHi);
        ctx.globalAlpha = 1;
      }
    }
    /* rolling highlight dashes */
    for (var row = HORIZON + 3; row < H; row += 4) {
      var speed = 0.4 + (row - HORIZON) * 0.02;
      var amp = 6 + (row - HORIZON) * 0.14;
      var ox = Math.sin(row * 0.6 + t * speed) * amp;
      var cnt = 2 + ((row / 4) % 3);
      for (var d = 0; d < cnt; d++) {
        var dx = ((row * 37 + d * 53 + t * 12 * speed) % (W + 40)) - 20 + ox;
        ctx.globalAlpha = 0.16 + (row - HORIZON) / (H - HORIZON) * 0.14;
        px(ctx, dx, row, 3 + (d % 3), 1, PAL.waterHi);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* dock reflection must be drawn before land/dock, on the water */
  function drawReflections(ctx, t) {
    ctx.globalAlpha = 0.16;
    for (var i = 0; i < 3; i++) {
      var x = [36, 76, 118][i];
      for (var y = 0; y < 26; y++) {
        var wob = Math.sin(y * 0.7 + t * 2 + i) * 1.6;
        px(ctx, x + 1 + wob, GEO.DECK_Y + GEO.DECK_H + y, 3, 1, '#0e2f42');
      }
    }
    /* tree reflection */
    ctx.globalAlpha = 0.13;
    for (var ty = 0; ty < 22; ty++) {
      var wob2 = Math.sin(ty * 0.6 + t * 1.6) * 2;
      px(ctx, 6 + wob2, HORIZON + 2 + ty, 16 - ty * 0.4, 1, '#24503f');
    }
    ctx.globalAlpha = 1;
  }

  /* ============================== land ============================== */
  function shoreX(y) {
    return 16 + (y - HORIZON) * 0.72;
  }

  function drawLand(ctx, t) {
    for (var y = HORIZON; y < H; y++) {
      var sx = Math.round(shoreX(y));
      /* grass base */
      px(ctx, 0, y, sx - 7, 1, PAL.grass);
      /* sand strip */
      px(ctx, sx - 7, y, 7, 1, PAL.sand);
      /* wet sand edge */
      px(ctx, sx - 1, y, 2, 1, PAL.sandDark);
    }
    /* grass shading + texture */
    var rnd = rngSprite(303);
    for (var y2 = HORIZON + 2; y2 < H; y2 += 2) {
      var sx2 = Math.round(shoreX(y2));
      for (var gx = 0; gx < sx2 - 8; gx += 3) {
        var v = rnd();
        if (v > 0.7) px(ctx, gx, y2, 1, 1, PAL.grassLight);
        else if (v < 0.25) px(ctx, gx, y2, 1, 1, PAL.grassDark);
      }
    }
    /* shoreline foam */
    for (var y3 = HORIZON + 2; y3 < H; y3++) {
      var sx3 = Math.round(shoreX(y3));
      var fw = Math.sin(y3 * 0.9 + t * 2.0);
      if (fw > 0.2) px(ctx, sx3 - 1, y3, 1, 1, PAL.foam);
      if (fw > 0.7) px(ctx, sx3, y3, 1, 1, PAL.foam);
    }
  }

  /* ============================== dock ============================== */
  function drawDock(ctx, t) {
    var x0 = GEO.DOCK_X0, x1 = GEO.DOCK_X1, dy = GEO.DECK_Y, dh = GEO.DECK_H;
    /* posts into water */
    [36, 78, 120].forEach(function (pxx, i) {
      px(ctx, pxx, dy + 2, 4, 28, PAL.woodDark);
      px(ctx, pxx, dy + 2, 1, 28, PAL.wood);
      px(ctx, pxx + 3, dy + 2, 1, 28, '#3d2814');
      /* post cap */
      px(ctx, pxx - 1, dy - 2, 6, 3, PAL.woodShadow);
      px(ctx, pxx - 1, dy - 2, 6, 1, PAL.woodLight);
    });
    /* supporting beams under deck */
    px(ctx, x0, dy + dh, x1 - x0, 3, PAL.woodShadow);
    /* deck top */
    px(ctx, x0, dy, x1 - x0, dh, PAL.wood);
    /* plank highlights/shading */
    px(ctx, x0, dy, x1 - x0, 1, PAL.woodLight);
    px(ctx, x0, dy + dh - 1, x1 - x0, 1, PAL.woodDark);
    for (var px2 = x0 + 6; px2 < x1; px2 += 9) {
      px(ctx, px2, dy, 1, dh, PAL.woodShadow);
      px(ctx, px2 + 1, dy, 1, dh, PAL.woodLight);
    }
    /* front face */
    px(ctx, x0, dy + dh, x1 - x0, 4, PAL.woodDark);
    for (var px3 = x0 + 6; px3 < x1; px3 += 9) px(ctx, px3, dy + dh, 1, 4, PAL.woodShadow);
    px(ctx, x0, dy + dh, x1 - x0, 1, '#8a5f34');

    /* lantern on the far post */
    drawLantern(ctx, 120, dy - 2, t);

    /* rope coil + bucket details */
    px(ctx, 98, dy + 3, 7, 4, '#8a7248');
    px(ctx, 100, dy + 2, 3, 2, '#a8905e');
    px(ctx, 54, dy + 2, 6, 6, '#7d6a4a');
    px(ctx, 54, dy + 2, 6, 1, '#a08a60');
    px(ctx, 54, dy + 7, 6, 1, '#5a4a32');
  }

  function drawLantern(ctx, x, y, t) {
    px(ctx, x, y - 12, 2, 12, PAL.woodShadow);
    px(ctx, x - 2, y - 16, 6, 5, '#3d2a1b');
    var glow = 0.6 + 0.25 * Math.sin(t * 3);
    ctx.globalAlpha = glow;
    px(ctx, x - 5, y - 11, 4, 5, '#ffdf8a');
    ctx.globalAlpha = 1;
    px(ctx, x - 4, y - 10, 2, 3, '#fff4c8');
    ctx.globalAlpha = 0.14 + 0.05 * Math.sin(t * 3);
    disc(ctx, x - 3, y - 8, 9, '#ffcf70');
    ctx.globalAlpha = 1;
  }

  /* =========================== vegetation =========================== */
  function drawTree(ctx, t) {
    var bx = 12, by = 104;
    /* trunk */
    px(ctx, bx - 1, by - 34, 5, 34, PAL.trunk);
    px(ctx, bx - 1, by - 34, 1, 34, PAL.trunkDark);
    px(ctx, bx + 2, by - 34, 1, 34, '#3a2718');
    /* branches */
    px(ctx, bx - 8, by - 42, 9, 3, PAL.trunk);
    px(ctx, bx + 4, by - 46, 9, 3, PAL.trunk);
    /* canopy — layered discs, gentle sway */
    var sway = Math.sin(t * 0.7) * 1.2;
    var blobs = [
      [bx - 16 + sway, by - 58, 13, PAL.leafDark],
      [bx + 14 + sway, by - 60, 13, PAL.leafDark],
      [bx - 2 + sway, by - 70, 16, PAL.leafDark],
      [bx - 14 + sway, by - 56, 12, PAL.leaf],
      [bx + 12 + sway, by - 58, 12, PAL.leaf],
      [bx - 1 + sway, by - 68, 15, PAL.leaf],
      [bx - 8 + sway, by - 60, 9, PAL.leafLight],
      [bx + 7 + sway, by - 62, 9, PAL.leafLight],
      [bx + sway, by - 72, 9, PAL.leafLight]
    ];
    for (var i = 0; i < blobs.length; i++) {
      disc(ctx, blobs[i][0], blobs[i][1], blobs[i][2], blobs[i][3]);
    }
    /* leafy speckle */
    var rnd = rngSprite(5);
    for (var k = 0; k < 60; k++) {
      var a = rnd() * Math.PI * 2, d = rnd() * 24;
      var lx = bx + Math.cos(a) * d + sway, ly = by - 62 + Math.sin(a) * d * 0.8;
      px(ctx, lx, ly, 1, 1, rnd() > 0.5 ? PAL.leafLight : PAL.leafDark);
    }
  }

  function drawBushes(ctx, t) {
    var rnd = rngSprite(77);
    var bushes = [
      [40, 116, 10], [58, 122, 9], [26, 128, 11], [14, 140, 12], [44, 146, 10]
    ];
    for (var b = 0; b < bushes.length; b++) {
      var bx = bushes[b][0], by = bushes[b][1], r = bushes[b][2];
      disc(ctx, bx, by, r, PAL.bushDark);
      disc(ctx, bx - 2, by - 2, r - 2, PAL.bush);
      disc(ctx, bx - 3, by - 4, r - 4, '#4f9349');
      for (var i = 0; i < 4; i++) {
        var a = rnd() * Math.PI, d = rnd() * r;
        px(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d - 2, 1, 1, PAL.berry);
      }
    }
  }

  function drawReeds(ctx, t) {
    var reedSpots = [[52, 108], [60, 116], [30, 118], [70, 132], [22, 150], [58, 158]];
    for (var s = 0; s < reedSpots.length; s++) {
      var bx = reedSpots[s][0], by = reedSpots[s][1];
      var n = 4 + (s % 3);
      for (var i = 0; i < n; i++) {
        var ox = i * 2 - n;
        var hgt = 10 + ((i * 7 + s * 3) % 9);
        var sway = Math.sin(t * 1.1 + i * 0.5 + s) * 1.4;
        for (var y = 0; y < hgt; y++) {
          var x = bx + ox + sway * (y / hgt);
          px(ctx, x, by - y, 1, 1, y % 5 === 0 ? '#6fa04a' : '#4f7d3a');
        }
        /* cattail head */
        if (i % 2 === 0) {
          px(ctx, bx + ox + sway, by - hgt - 3, 2, 4, '#6b4a2a');
          px(ctx, bx + ox + sway, by - hgt - 4, 1, 2, '#8a6a3a');
        }
      }
    }
  }

  function drawGrassTufts(ctx, t) {
    var rnd = rngSprite(151);
    var tufts = [[10, 120], [34, 130], [6, 150], [48, 140], [62, 148], [20, 164], [40, 168], [66, 170]];
    for (var s = 0; s < tufts.length; s++) {
      var bx = tufts[s][0], by = tufts[s][1];
      for (var i = 0; i < 7; i++) {
        var sway = Math.sin(t * 1.3 + i + s) * 1.2;
        var hgt = 4 + rnd() * 5;
        for (var y = 0; y < hgt; y++) {
          px(ctx, bx + i - 3 + sway * (y / hgt), by - y, 1, 1, y > hgt - 2 ? PAL.grassLight : PAL.grassDark);
        }
      }
    }
    /* flowers */
    var flowers = [[16, 134, '#f2c14e'], [30, 148, '#e86a92'], [52, 160, '#f4f4f4'], [8, 158, '#e86a92']];
    for (var f = 0; f < flowers.length; f++) {
      var fx = flowers[f][0], fy = flowers[f][1];
      px(ctx, fx, fy, 1, 1, '#3a6b32');
      px(ctx, fx, fy - 1, 1, 1, flowers[f][2]);
      px(ctx, fx - 1, fy - 1, 1, 1, flowers[f][2]);
      px(ctx, fx + 1, fy - 1, 1, 1, flowers[f][2]);
      px(ctx, fx, fy - 2, 1, 1, '#fff2b0');
    }
  }

  function drawForeground(ctx, t) {
    /* soft vignette-ish warm foreground blades at the very bottom */
    var rnd = rngSprite(9);
    for (var x = 0; x < W; x += 2) {
      var h = 2 + rnd() * 5;
      var sway = Math.sin(t * 1.5 + x * 0.1) * 0.6;
      for (var y = 0; y < h; y++) {
        px(ctx, x + sway * (y / h), H - y, 1, 1, y > h - 2 ? '#2c5228' : '#24431f');
      }
    }
    /* a couple of rocks */
    disc(ctx, 300, H - 6, 6, '#7a7f82');
    disc(ctx, 300, H - 8, 4, '#9aa0a2');
    disc(ctx, 312, H - 3, 4, '#6a6f72');
  }

  /* ======================= ambient life ======================= */
  function drawBirds(ctx, t) {
    var birds = [
      { x: 60, y: 18, sp: 4.5, ph: 0 },
      { x: 110, y: 28, sp: 3.6, ph: 1.7 },
      { x: 190, y: 14, sp: 5.2, ph: 3.1 }
    ];
    ctx.fillStyle = '#3a4a5a';
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      var x = ((b.x + t * b.sp) % (W + 60)) - 30;
      var flap = Math.sin(t * 6 + b.ph) > 0 ? 1 : 0;
      ctx.fillRect(Math.round(x) - 2, Math.round(b.y) - flap, 2, 1);
      ctx.fillRect(Math.round(x), Math.round(b.y) - 1 + flap, 2, 1);
      ctx.fillRect(Math.round(x) + 2, Math.round(b.y) - flap, 2, 1);
    }
  }

  function drawButterflies(ctx, t) {
    var bf = [
      { cx: 40, cy: 122, ax: 12, ay: 7, sp: 0.9, ph: 0, c: '#f2c14e' },
      { cx: 26, cy: 146, ax: 9, ay: 6, sp: 1.2, ph: 2.1, c: '#e88aa0' }
    ];
    for (var i = 0; i < bf.length; i++) {
      var b = bf[i];
      var x = b.cx + Math.sin(t * b.sp + b.ph) * b.ax;
      var y = b.cy + Math.cos(t * b.sp * 1.3 + b.ph) * b.ay;
      var flap = Math.sin(t * 10 + b.ph) > 0;
      var wy = flap ? 1 : 2;
      ctx.fillStyle = b.c;
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - wy * 0.5, 2, wy);
      ctx.fillRect(Math.round(x) + 1, Math.round(y) - wy * 0.5, 2, wy);
      ctx.fillStyle = '#fff2c0';
      ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 1, 1);
      ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    }
  }

  function drawAirMotes(ctx, t) {
    var motes = [
      [30, 90, 0.0], [70, 110, 0.6], [18, 130, 1.4], [96, 100, 2.2],
      [120, 140, 1.0], [50, 150, 2.8], [150, 96, 0.3], [200, 130, 1.9],
      [270, 110, 0.9], [240, 150, 2.5]
    ];
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var x = m[0] + Math.sin(t * 0.6 + m[2]) * 6;
      var y = m[1] - ((t * 6 + m[2] * 40) % 26) + Math.sin(t + m[2]) * 1.5;
      var a = 0.35 + 0.3 * Math.sin(t * 2 + m[2]);
      ctx.globalAlpha = clampF(a, 0, 0.65);
      ctx.fillStyle = '#fff3cf';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  function clampF(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ============================ API ============================ */
  window.Scene = {
    W: W, H: H, HORIZON: HORIZON, PAL: PAL, GEO: GEO,
    px: px, disc: disc, ellipseSpan: ellipseSpan, mix: mix, rngSprite: rngSprite,
    drawSky: drawSky,
    drawBirds: drawBirds,
    drawButterflies: drawButterflies,
    drawAirMotes: drawAirMotes,
    drawHills: drawHills,
    drawFarTrees: drawFarTrees,
    drawWater: drawWater,
    drawReflections: drawReflections,
    drawLand: drawLand,
    drawDock: drawDock,
    drawTree: drawTree,
    drawBushes: drawBushes,
    drawReeds: drawReeds,
    drawGrassTufts: drawGrassTufts,
    drawForeground: drawForeground,
    drawLantern: drawLantern
  };
})();
