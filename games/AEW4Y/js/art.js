/* All artwork is drawn in code on the 320x180 logical canvas. */
(function (global) {
  'use strict';
  var PX = global.PX;
  var rect = PX.rect;

  /* ------------------------------------------------------------------ *
   * Palette (warm golden-hour island)
   * ------------------------------------------------------------------ */
  var PAL = {
    skyTop: '#26305c', skyMid: '#6d5580', skyWarm: '#d97e5a',
    skyGold: '#f2a95c', skyHaze: '#ffd79a',
    sun: '#fff3c8', sunGlow: '#ffcf7e',
    cloudLit: '#ffd9a8', cloudMid: '#e8a877', cloudDark: '#b06e52',
    farHill: '#6a5a7e', farHill2: '#55496d',
    waterFar: '#4a7f93', waterMid: '#356d84', waterNear: '#27576f', waterDeep: '#1b4256',
    waterHi: '#9fdcd0', foam: '#eafaf1', waterLine: '#7fc4bd',
    glimmer: '#ffe6ad',
    dockTop: '#b07c4e', dockTop2: '#9a6a3f', dockSide: '#6f472a', dockSide2: '#5a381f',
    dockLine: '#4a2c17', dockNail: '#d8b47a',
    grass: '#5f9e4a', grassDk: '#3f7233', grassLt: '#8fd06a',
    leaf: '#4f9448', leafDk: '#2f6b39', leafLt: '#77c25a', leafHi: '#a5e07a',
    trunk: '#6b4726', trunkDk: '#4a301a',
    rock: '#8a8578', rockDk: '#5c584e', rockLt: '#b3ad9c',
    reed: '#7a9a3e', reedDk: '#55702a',
    flower1: '#ff8fa8', flower2: '#ffd75e', flower3: '#c59bff'
  };

  /* ------------------------------------------------------------------ *
   * Procedural fish artwork
   * ------------------------------------------------------------------ */
  function profile(name, t) {
    switch (name) {
      case 'oval': return Math.sin(Math.PI * Math.pow(t, 0.78));
      case 'torpedo': return Math.sin(Math.PI * Math.pow(t, 0.60));
      case 'long': return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.52)), 0.85);
      case 'flat': return Math.sin(Math.PI * Math.pow(t, 1.15));
      case 'eel': return Math.sin(Math.PI * Math.pow(t, 0.88));
      case 'chunk': return Math.sin(Math.PI * Math.pow(t, 1.02));
      default: return Math.sin(Math.PI * t);
    }
  }

  var fishCache = {};

  function buildFish(spec) {
    var W = spec.w, H = spec.h;
    var M = { l: 4, r: 26, t: 16, b: 10 }; // generous margins for fins/tails
    var gw = W + M.l + M.r, gh = H + M.t + M.b;
    var grid = [];
    for (var y = 0; y < gh; y++) grid.push(new Array(gw).fill(null));
    var cy = M.t + H / 2;
    var cx0 = M.l;

    function set(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= gw || y >= gh) return;
      grid[y][x] = c;
    }
    function get(x, y) {
      if (x < 0 || y < 0 || x >= gw || y >= gh) return null;
      return grid[y][x];
    }

    // ---- tail (drawn first, behind body) ----
    var tipX = cx0 + W - 2;
    var L = spec.tailLen || 8;
    var tt = spec.tail || 'fan';
    for (var i = 0; i < L; i++) {
      var spread = (i / (L - 1)) * (spec.tailSpread || (H * 0.75));
      var col = i < L * 0.5 ? spec.fin : spec.finDark;
      var x = tipX + i;
      if (tt === 'fork') {
        set(x, cy - spread, col); set(x, cy - spread + 1, spec.finDark);
        set(x, cy + spread, col); set(x, cy + spread - 1, spec.finDark);
        if (i < L * 0.45) { set(x, cy - spread * 0.5, col); set(x, cy + spread * 0.5, col); }
      } else if (tt === 'crescent') {
        var up = spread, dn = spread;
        set(x, cy - up, col);
        set(x, cy + dn, col);
        if (i > L * 0.5) { set(x, cy - up + 1, col); set(x, cy + dn - 1, col); }
      } else if (tt === 'round') {
        var rr = spread;
        for (var yy = -rr; yy <= rr; yy++) set(x, cy + yy, Math.abs(yy) > rr - 1 ? spec.finDark : col);
      } else if (tt === 'long') {
        var s2 = spread;
        set(x, cy - s2, col); set(x, cy + s2, col);
        set(x, cy - s2 + 1, col); set(x, cy + s2 - 1, col);
        for (var k = 1; k < s2; k += 2) { set(x, cy - k, col); set(x, cy + k, col); }
      } else { // fan
        for (var yy2 = -spread; yy2 <= spread; yy2++) set(x, cy + yy2, col);
        set(x, cy - spread, spec.finDark); set(x, cy + spread, spec.finDark);
      }
    }

    // ---- dorsal fin ----
    var dors = spec.dorsal || 'soft';
    if (dors !== 'none') {
      var dx0 = cx0 + Math.round(W * (spec.dorsalX0 || 0.30));
      var dx1 = cx0 + Math.round(W * (spec.dorsalX1 || 0.70));
      var dh = spec.dorsalH || (H * 0.7);
      for (var x = dx0; x <= dx1; x++) {
        var u = (x - dx0) / Math.max(1, (dx1 - dx0));
        var hgt;
        if (dors === 'sail') hgt = dh * Math.sin(Math.PI * Math.pow(u, 0.7));
        else if (dors === 'spiny') hgt = dh * (0.4 + 0.6 * Math.abs(Math.sin(u * Math.PI * 4)));
        else if (dors === 'shark') hgt = dh * Math.sin(Math.PI * u) * (u < 0.4 ? 1.15 : 0.8);
        else hgt = dh * Math.sin(Math.PI * u);
        hgt = Math.max(1, Math.round(hgt));
        for (var k2 = 0; k2 < hgt; k2++) {
          var yy3 = Math.round(cy - H / 2 * profile(spec.shape || 'oval', (x - cx0) / (W - 1)) - k2 - 1);
          set(x, yy3, k2 === hgt - 1 ? spec.finDark : spec.fin);
        }
      }
    }
    // ---- underside fins (pelvic/anal) ----
    if (spec.lowerFin !== false) {
      var lx0 = cx0 + Math.round(W * 0.35), lx1 = cx0 + Math.round(W * 0.6);
      for (var x3 = lx0; x3 <= lx1; x3++) {
        var u3 = (x3 - lx0) / Math.max(1, (lx1 - lx0));
        var h3 = Math.max(1, Math.round((spec.dorsalH || H * 0.7) * 0.45 * Math.sin(Math.PI * u3)));
        for (var k3 = 0; k3 < h3; k3++) {
          var yy4 = Math.round(cy + H / 2 * profile(spec.shape || 'oval', (x3 - cx0) / (W - 1)) + k3 + 1);
          set(x3, yy4, spec.fin);
        }
      }
    }
    // ---- lobed legs (coelacanth) ----
    if (spec.legs) {
      [[0.28, 1], [0.55, 1]].forEach(function (p) {
        var lx = cx0 + Math.round(W * p[0]);
        var ly = cy + H / 2 * profile(spec.shape || 'oval', p[0]) + 1;
        for (var k = 0; k < 5; k++) {
          set(lx + (k > 2 ? 1 : 0), ly + k, k > 3 ? spec.finDark : spec.fin);
          set(lx + (k > 1 ? 2 : 1), ly + k, k > 3 ? spec.finDark : spec.fin);
        }
      });
    }

    // ---- body ----
    for (var bx = 0; bx < W; bx++) {
      var t = bx / (W - 1);
      var hh = (H / 2) * profile(spec.shape || 'oval', t) * (1 - (spec.tailTaper || 0) * t);
      var top = Math.round(cy - hh), bot = Math.round(cy + hh);
      for (var by = top; by <= bot; by++) {
        var f = (bot === top) ? 0.5 : (by - top) / (bot - top);
        var col;
        if (f < 0.24) col = spec.dark;
        else if (f > 0.74) col = spec.light;
        else col = spec.body;
        // pattern
        var pat = spec.pattern;
        if (pat === 'bars' && (Math.floor(bx / (spec.patScale || 3)) % 2 === 0) && f < 0.72) col = spec.dark;
        else if (pat === 'stripes' && ((by - top) % (spec.patScale || 3) === 0) && f < 0.8) col = spec.dark;
        else if (pat === 'spots') {
          var hpoint = Math.sin(bx * 12.9898 + by * 78.233) * 43758.5453;
          hpoint = hpoint - Math.floor(hpoint);
          if (hpoint > 0.86 && f > 0.2 && f < 0.8) col = spec.dark;
        } else if (pat === 'scales' && ((bx + by) % (spec.patScale || 3) === 0)) {
          col = (f < 0.6) ? spec.dark : spec.light;
        } else if (pat === 'blotch') {
          var v = Math.sin(bx * 0.9 + Math.sin(bx * 0.4) * 2) + Math.sin(by * 1.1);
          if (v > 1.35 && f > 0.15 && f < 0.85) col = spec.dark;
        }
        set(cx0 + bx, by, col);
      }
    }

    // ---- pectoral fin (in front of body) ----
    if (spec.pectoral !== false) {
      var px = cx0 + Math.round(W * 0.28), py = cy + H * 0.18;
      for (var k4 = 0; k4 < 4; k4++) {
        set(px + k4, py + Math.round(k4 * 0.7), spec.fin);
        set(px + k4, py + Math.round(k4 * 0.7) + 1, spec.finDark);
      }
    }

    // ---- eye ----
    var ex = cx0 + Math.round(W * (spec.eyeX || 0.15));
    var topAtEye = cy - H / 2 * profile(spec.shape || 'oval', (ex - cx0) / (W - 1));
    var ey = Math.round(topAtEye + Math.max(1.5, H * 0.18));
    var es = spec.bigEye ? 2 : 1;
    for (var yy5 = -es; yy5 <= es; yy5++)
      for (var xx5 = -es; xx5 <= es; xx5++)
        set(ex + xx5, ey + yy5, spec.eye);
    set(ex - (spec.bigEye ? 1 : 0), ey - 1, spec.pupil);
    if (spec.bigEye) { set(ex, ey - 1, spec.pupil); set(ex - 1, ey, spec.pupil); }

    // ---- mouth ----
    if (spec.mouth === 'big') {
      set(cx0, cy + 1, spec.outline); set(cx0 + 1, cy + 2, spec.outline);
      set(cx0 + 2, cy + 2, spec.outline);
    } else if (spec.mouth === 'smile') {
      set(cx0, cy + 1, spec.outline); set(cx0 + 1, cy + 2, spec.outline);
    } else {
      set(cx0, cy + 1, spec.outline);
    }

    // ---- bill (marlin/sword) ----
    if (spec.bill) {
      var byy = cy - 1;
      for (var bxx = 1; bxx <= spec.bill; bxx++) set(cx0 - bxx, byy, spec.billCol || spec.dark);
    }
    // ---- whiskers (barbels) ----
    if (spec.whisker) {
      set(cx0, cy + 2, spec.dark); set(cx0 - 1, cy + 3, spec.dark); set(cx0 - 2, cy + 4, spec.dark);
      set(cx0 + 1, cy + 3, spec.dark); set(cx0 + 2, cy + 4, spec.dark);
    }
    // ---- ancient runes ----
    if (spec.rune) {
      var rx = cx0 + Math.round(W * 0.42), ry = cy - 1;
      var glyph = [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [0, 3], [2, 3]];
      glyph.forEach(function (g) { set(rx + g[0], ry + g[1], spec.accent); });
      set(rx + 5, ry + 1, spec.accent); set(rx + 6, ry, spec.accent);
      set(rx + 6, ry + 2, spec.accent); set(rx + 5, ry + 3, spec.accent);
    }

    // ---- outline pass ----
    var outline = spec.outline;
    var outgrid = grid.map(function (r) { return r.slice(); });
    for (var oy = 0; oy < gh; oy++) {
      for (var ox = 0; ox < gw; ox++) {
        if (grid[oy][ox]) continue;
        if (get(ox - 1, oy) || get(ox + 1, oy) || get(ox, oy - 1) || get(ox, oy + 1)) {
          outgrid[oy][ox] = outline;
        }
      }
    }
    // optional accent rim (rare+ fish get a subtle accent edge highlighted at draw time)

    // crop
    var minX = gw, minY = gh, maxX = -1, maxY = -1;
    for (var ccy = 0; ccy < gh; ccy++)
      for (var ccx = 0; ccx < gw; ccx++)
        if (outgrid[ccy][ccx]) {
          if (ccx < minX) minX = ccx; if (ccx > maxX) maxX = ccx;
          if (ccy < minY) minY = ccy; if (ccy > maxY) maxY = ccy;
        }
    var cw = maxX - minX + 1, ch = maxY - minY + 1;
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var g2 = cv.getContext('2d');
    for (var fy = 0; fy < ch; fy++)
      for (var fx = 0; fx < cw; fx++) {
        var col2 = outgrid[minY + fy][minX + fx];
        if (col2) { g2.fillStyle = col2; g2.fillRect(fx, fy, 1, 1); }
      }
    return cv;
  }

  /* Fish specs -------------------------------------------------------- */
  var FISH = {
    Common: [
      {
        name: 'Sunny Perch', shape: 'oval', w: 20, h: 11,
        body: '#f0c040', dark: '#c8871f', light: '#ffe9a8', fin: '#e8862c', finDark: '#b4561a',
        outline: '#4a2a10', eye: '#fff8e0', pupil: '#241608',
        dorsal: 'spiny', dorsalH: 5, tail: 'fan', tailLen: 7, pattern: 'bars', patScale: 3
      },
      {
        name: 'Mud Minnow', shape: 'long', w: 14, h: 6,
        body: '#9a8a63', dark: '#6e6042', light: '#c9bb90', fin: '#b09a6a', finDark: '#7a6845',
        outline: '#3a3020', eye: '#fff8e0', pupil: '#241608',
        dorsal: 'none', tail: 'round', tailLen: 5, tailSpread: 4, lowerFin: false, whisker: true, mouth: 'smile'
      }
    ],
    Uncommon: [
      {
        name: 'Silverside Smelt', shape: 'torpedo', w: 21, h: 7,
        body: '#cfe0e8', dark: '#7fa0b4', light: '#f4fbff', fin: '#a9c4d4', finDark: '#7898ac',
        outline: '#2c4250', eye: '#ffffff', pupil: '#1a2a34',
        dorsal: 'soft', dorsalH: 3, tail: 'fork', tailLen: 8, tailSpread: 5,
        pattern: 'stripes', patScale: 3, pectoral: false
      },
      {
        name: 'Reed Bass', shape: 'chunk', w: 22, h: 14,
        body: '#6f9a4a', dark: '#436a2c', light: '#c7e08c', fin: '#5a8038', finDark: '#3a5a24',
        outline: '#26381a', eye: '#fff8e0', pupil: '#1e2a14',
        dorsal: 'spiny', dorsalH: 5, tail: 'fan', tailLen: 8, tailSpread: 8,
        pattern: 'spots', mouth: 'big', bigEye: false
      }
    ],
    Rare: [
      {
        name: 'Amber Koi', shape: 'oval', w: 22, h: 12,
        body: '#f6f0e2', dark: '#e8842a', light: '#fffaf0', fin: '#ffb45e', finDark: '#d9701f',
        outline: '#5a3418', eye: '#fff8e0', pupil: '#2a1808',
        dorsal: 'soft', dorsalH: 4, tail: 'long', tailLen: 12, tailSpread: 7,
        pattern: 'blotch', whisker: true, pectoral: false
      },
      {
        name: 'Moonfin', shape: 'flat', w: 20, h: 15,
        body: '#bcd6ee', dark: '#6f93c8', light: '#eaf4ff', fin: '#8fb4e0', finDark: '#5f83b8',
        outline: '#2c3f66', eye: '#ffffff', pupil: '#20304f', accent: '#cfe9ff',
        dorsal: 'sail', dorsalH: 11, dorsalX0: 0.22, dorsalX1: 0.74,
        tail: 'crescent', tailLen: 9, tailSpread: 8, bigEye: true, mouth: 'smile', glow: true
      }
    ],
    Epic: [
      {
        name: 'Storm Pike', shape: 'eel', w: 26, h: 9,
        body: '#5a6bb0', dark: '#343f7a', light: '#9fb0e8', fin: '#44519a', finDark: '#2a326e',
        outline: '#1a1f44', eye: '#ffe98a', pupil: '#141838', accent: '#9fb0ff',
        dorsal: 'spiny', dorsalH: 4, dorsalX0: 0.4, dorsalX1: 0.72,
        tail: 'fork', tailLen: 8, tailSpread: 6, pattern: 'spots', mouth: 'big', glow: true
      },
      {
        name: 'Coral Gloamfish', shape: 'oval', w: 20, h: 13,
        body: '#ef7f9a', dark: '#b04068', light: '#ffc6d4', fin: '#ff9f68', finDark: '#c85f3a',
        outline: '#4a1830', eye: '#fff0f4', pupil: '#2a0c1c', accent: '#ffd0e0',
        dorsal: 'soft', dorsalH: 5, tail: 'fan', tailLen: 8, tailSpread: 8,
        pattern: 'spots', patScale: 3, bigEye: true, glow: true
      }
    ],
    Legendary: [
      {
        name: 'Aurora Marlin', shape: 'long', w: 28, h: 9,
        body: '#3fb6a8', dark: '#1f7d78', light: '#a9f0e0', fin: '#57d6c2', finDark: '#2f9a8e',
        outline: '#103a3a', eye: '#fff8d0', pupil: '#122e2c', accent: '#ffe98a',
        dorsal: 'sail', dorsalH: 10, dorsalX0: 0.25, dorsalX1: 0.68,
        tail: 'crescent', tailLen: 12, tailSpread: 9, bill: 7, billCol: '#ffd75e',
        glow: true, mouth: 'small'
      },
      {
        name: 'Golden Arowana', shape: 'long', w: 28, h: 10,
        body: '#f2c033', dark: '#b07a12', light: '#fff0a8', fin: '#ffcf5c', finDark: '#c08a1c',
        outline: '#4a3008', eye: '#fff8e0', pupil: '#2a1a04', accent: '#fff0a0',
        dorsal: 'soft', dorsalH: 3, dorsalX0: 0.55, dorsalX1: 0.85,
        tail: 'long', tailLen: 12, tailSpread: 7, pattern: 'scales', patScale: 3,
        whisker: true, glow: true, mouth: 'big'
      }
    ],
    Ancient: [
      {
        name: 'Elder Coelacanth', shape: 'chunk', w: 24, h: 15,
        body: '#7f9078', dark: '#4a5a48', light: '#c2cfae', fin: '#8aa07e', finDark: '#54684c',
        outline: '#20281e', eye: '#d8f0c0', pupil: '#16200f', accent: '#7ff0d6',
        dorsal: 'soft', dorsalH: 4, tail: 'round', tailLen: 9, tailSpread: 9,
        pattern: 'spots', legs: true, rune: true, mouth: 'big', glow: true
      },
      {
        name: 'Abyssal Leviathan', shape: 'eel', w: 30, h: 13,
        body: '#3a4a7a', dark: '#1e2a52', light: '#8fa0d8', fin: '#4a5a9a', finDark: '#26305e',
        outline: '#0e1430', eye: '#a8ffe0', pupil: '#08101f', accent: '#7ff0d6',
        dorsal: 'spiny', dorsalH: 6, dorsalX0: 0.3, dorsalX1: 0.75,
        tail: 'crescent', tailLen: 13, tailSpread: 10, pattern: 'spots', patScale: 4,
        rune: true, bigEye: true, mouth: 'big', glow: true
      }
    ]
  };

  // Flat name -> spec lookup + rarity map
  var FISH_INDEX = {};
  Object.keys(FISH).forEach(function (r) {
    FISH[r].forEach(function (s) { s.rarity = r; FISH_INDEX[s.name] = s; });
  });

  function fishCanvas(name) {
    if (!fishCache[name]) fishCache[name] = buildFish(FISH_INDEX[name]);
    return fishCache[name];
  }

  /* ------------------------------------------------------------------ *
   * Angler sprite (hand-drawn, faces right, ~22px tall)
   * ------------------------------------------------------------------ */
  var ANGLER_ROWS = [
    '.....HHHHH....',
    '....HHHHHHH...',
    '...HHHHHHHHH..',
    '..hhhhhhhhhh..',
    '..rrrssssso...',
    '..rrrsssoso...',
    '..rrrssssso...',
    '...rrsssss....',
    '....wwwww.....',
    '...jjjjjjj....',
    '..jjjwwwjjj...',
    '..jjwwwwwjj...',
    '..jJwwwwwJj...',
    '..jJpppppJj...',
    '...ppppppp....',
    '...ppppppp....',
    '...ppp.ppp....',
    '...ppp.ppp....',
    '...ppp.ppp....',
    '...bbb.bbb....',
    '...BBB.BBB....',
    '..............'
  ];
  var ANGLER_COLORS = {
    H: '#e07a3c', h: '#a3452a',
    r: '#6b3f2a', s: '#f0c090',
    w: '#f2e6c8', j: '#5b8f5a', J: '#3f6b42',
    p: '#3f5a86', b: '#4a3325', B: '#33241a'
  };
  var ANGLER_W = 14, ANGLER_H = 22;

  /* ------------------------------------------------------------------ *
   * Scene geometry
   * ------------------------------------------------------------------ */
  var GEO = {
    horizon: 66,
    dockTop: 124,
    dockBot: 143,
    dockLeft: -6,
    dockRight: 122,
    anglerX: 40,
    anglerFeetY: 126
  };

  // Where the rod's hand and tip roughly are, relative to anglerX.
  function handPos() { return { x: GEO.anglerX + 11, y: GEO.anglerFeetY - 9 }; }

  /* ------------------------------------------------------------------ *
   * Scene drawing helpers
   * ------------------------------------------------------------------ */
  function disc(ctx, cx, cy, r, col) {
    ctx.fillStyle = col;
    for (var dy = -r; dy <= r; dy++) {
      var w = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }

  function drawSky(ctx, t) {
    PX.bandGradient(ctx, 0, 0, 320, GEO.horizon, [
      PAL.skyTop, '#333f70', '#3f4272', '#5a4a7a', PAL.skyMid, '#9a6a86', PAL.skyWarm, PAL.skyGold, PAL.skyHaze
    ]);
    // Sun
    var sx = 250, sy = 34;
    ctx.globalAlpha = 0.18;
    disc(ctx, sx, sy, 20, PAL.sunGlow);
    ctx.globalAlpha = 0.32;
    disc(ctx, sx, sy, 13, PAL.sun);
    ctx.globalAlpha = 1;
    disc(ctx, sx, sy, 8, PAL.sun);
    // thin cloud bands across sun
    rect(ctx, sx - 24, sy + 3, 48, 2, 'rgba(215,150,120,0.45)');
    rect(ctx, sx - 16, sy - 5, 26, 1, 'rgba(215,150,120,0.35)');

    // Clouds
    function cloud(cx, cy, s, alpha) {
      ctx.globalAlpha = alpha;
      disc(ctx, cx, cy, 4 * s, PAL.cloudMid);
      disc(ctx, cx + 5 * s, cy + 1, 3 * s, PAL.cloudDark);
      disc(ctx, cx - 5 * s, cy + 1, 3 * s, PAL.cloudDark);
      disc(ctx, cx, cy - 2 * s, 3 * s, PAL.cloudLit);
      disc(ctx, cx + 3 * s, cy, 3 * s, PAL.cloudLit);
      ctx.globalAlpha = 1;
    }
    // drifting slowly
    var drift = (t * 1.2) % 380;
    cloud(30 + drift, 20, 1, 0.95);
    cloud(150 + drift * 0.7, 30, 1.4, 0.8);
    cloud(300 + drift * 0.5, 16, 1.1, 0.7);

    // Distant hills / islands on the horizon
    ctx.fillStyle = PAL.farHill;
    for (var x = 0; x < 320; x++) {
      var h = 4 + Math.sin(x * 0.05) * 2 + Math.sin(x * 0.013 + 1) * 3;
      ctx.fillRect(x, GEO.horizon - Math.round(h) - 3, 1, Math.round(h) + 4);
    }
    ctx.fillStyle = PAL.farHill2;
    // two island humps
    hump(ctx, 40, GEO.horizon + 1, 26, 8);
    hump(ctx, 268, GEO.horizon + 1, 34, 10);
    // little palm on the right island
    ctx.fillStyle = PAL.trunkDk;
    ctx.fillRect(270, GEO.horizon - 11, 1, 8);
    ctx.fillStyle = PAL.farHill;
    disc(ctx, 270, GEO.horizon - 12, 3, PAL.farHill);

    // distant sailboat
    var bx = Math.round(112 + Math.sin(t * 0.05) * 10);
    rect(ctx, bx, GEO.horizon - 3, 7, 2, '#3a2f3f');
    rect(ctx, bx + 4, GEO.horizon - 10, 1, 7, '#3a2f3f');
    for (var sk = 0; sk < 6; sk++) rect(ctx, bx + 5, GEO.horizon - 10 + sk, 6 - sk, 1, '#e0d0b8');
  }

  function hump(ctx, cx, baseY, w, h) {
    for (var i = -w / 2; i <= w / 2; i++) {
      var v = h * Math.cos((i / (w / 2)) * Math.PI / 2);
      if (v < 0) v = 0;
      ctx.fillRect(Math.round(cx + i), baseY - Math.round(v), 1, Math.round(v));
    }
  }

  function drawBirds(ctx, t) {
    for (var bd = 0; bd < 3; bd++) {
      var bxx = ((t * 6 + bd * 90) % 380) - 30;
      var byy = 22 + bd * 7 + Math.sin(t * 2 + bd) * 1;
      var flap = Math.round(Math.sin(t * 6 + bd) * 1);
      ctx.fillStyle = '#3a2f3f';
      ctx.fillRect(Math.round(bxx), Math.round(byy), 4, 1);
      ctx.fillRect(Math.round(bxx) - 1, Math.round(byy) - flap, 1, 1);
      ctx.fillRect(Math.round(bxx) + 4, Math.round(byy) - flap, 1, 1);
    }
  }

  function drawWater(ctx, t) {
    PX.bandGradient(ctx, 0, GEO.horizon, 320, 180 - GEO.horizon, [
      PAL.waterFar, PAL.waterMid, '#2e657b', PAL.waterNear, PAL.waterDeep
    ]);
    // sun reflection column
    var rx = 250;
    for (var y = GEO.horizon + 2; y < 132; y++) {
      var depth = (y - GEO.horizon) / (132 - GEO.horizon);
      var w = Math.round(2 + depth * 10 + Math.sin(y * 0.7 + t * 3) * 1.5);
      var a = 0.10 + depth * 0.16 + Math.sin(y * 0.5 + t * 2) * 0.04;
      ctx.fillStyle = 'rgba(255,220,150,' + Math.max(0.03, a).toFixed(3) + ')';
      ctx.fillRect(rx - w / 2 + Math.sin(y * 0.3 + t) * 2, y, w, 1);
    }
    // wave highlight rows
    for (var i = 0; i < 5; i++) {
      var wy = GEO.horizon + 8 + i * 22;
      var amp = 1 + i * 0.4, spd = 0.5 + i * 0.18;
      drawWaveRow(ctx, wy, amp, 0.08 + i * 0.012, spd, t, PAL.waterLine, 0.45 + i * 0.06);
    }
    // near foreground ripples
    for (var j = 0; j < 3; j++) {
      drawWaveRow(ctx, 150 + j * 10, 2, 0.11, 0.9 + j * 0.3, t, PAL.waterHi, 0.30 + j * 0.06);
    }
    // scattered sparkles
    for (var s = 0; s < 26; s++) {
      var hx = PX.hash01(s * 3 + 1) * 320;
      var hy = GEO.horizon + 6 + PX.hash01(s * 7 + 2) * 96;
      var tw = Math.sin(t * (2 + PX.hash01(s) * 3) + s) * 0.5 + 0.5;
      if (tw > 0.72) {
        ctx.fillStyle = 'rgba(220,255,245,' + ((tw - 0.72) * 1.6).toFixed(2) + ')';
        ctx.fillRect(Math.round(hx), Math.round(hy), 2, 1);
      }
    }
    // drifting leaves on the surface
    for (var lf = 0; lf < 3; lf++) {
      var lx = ((t * 3 + lf * 130) % 380) - 20;
      var ly = 120 + lf * 14 + Math.sin(t * 1.3 + lf) * 1;
      ctx.fillStyle = lf % 2 ? '#7fae52' : '#c98a3a';
      ctx.fillRect(Math.round(lx), Math.round(ly), 3, 1);
      ctx.fillRect(Math.round(lx) + 1, Math.round(ly) + 1, 2, 1);
    }
  }

  function drawWaveRow(ctx, y, amp, freq, spd, t, col, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    for (var x = 0; x < 320; x += 4) {
      var yy = Math.round(y + Math.sin(x * freq + t * spd * 3) * amp);
      ctx.fillRect(x, yy, 3, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawDock(ctx, t) {
    var L = GEO.dockLeft, R = GEO.dockRight, T = GEO.dockTop, B = GEO.dockBot;
    // support posts (behind the deck face)
    [12, 48, 86, 116].forEach(function (px) {
      rect(ctx, px, T + 4, 5, B + 28, PAL.dockSide2);
      rect(ctx, px, T + 4, 2, B + 28, PAL.dockSide);
      rect(ctx, px - 1, T + 2, 7, 3, PAL.dockTop2);
    });
    // deck top (shallow angled sliver)
    rect(ctx, L, T, R - L, 9, PAL.dockTop);
    rect(ctx, L, T, R - L, 1, '#d5a06c');
    rect(ctx, L, T + 1, R - L, 1, '#c08a56');
    rect(ctx, L, T + 8, R - L, 1, '#84582f');
    // plank seams + nails
    for (var x = L + 8; x < R; x += 14) {
      rect(ctx, x, T + 1, 1, 7, 'rgba(74,44,23,0.72)');
      rect(ctx, x - 4, T + 3, 1, 1, PAL.dockNail);
      rect(ctx, x + 6, T + 5, 1, 1, PAL.dockNail);
    }
    // front face
    rect(ctx, L, T + 9, R - L, B - T - 9, PAL.dockSide);
    for (var x2 = L + 8; x2 < R; x2 += 14) rect(ctx, x2, T + 10, 1, B - T - 11, '#55341c');
    rect(ctx, L, B - 3, R - L, 3, '#4a2c17');
    rect(ctx, L, B - 1, R - L, 1, '#2f1c0e');
    // a wooden bucket and coiled rope on the deck
    rect(ctx, 60, T - 6, 8, 6, '#7a4f2a');
    rect(ctx, 60, T - 7, 8, 1, '#a06a3c');
    rect(ctx, 61, T - 5, 1, 4, '#5a381f');
    rect(ctx, 66, T - 5, 1, 4, '#5a381f');
    rect(ctx, 60, T - 1, 8, 1, '#3f2814');
    ctx.fillStyle = '#c9a86a';
    for (var rr = 0; rr < 5; rr++) rect(ctx, 104 + rr, T + 2 + (rr % 2), 2, 2);
    rect(ctx, 102, T - 1, 8, 2, '#8a6a3a');
    // mooring post at the far end
    rect(ctx, R - 6, T - 9, 4, 11, PAL.dockSide2);
    rect(ctx, R - 6, T - 10, 5, 2, PAL.dockTop2);
    // little lantern on the post
    ctx.globalAlpha = 0.20;
    disc(ctx, R - 4, T - 17, 9, '#ffcf7e');
    ctx.globalAlpha = 1;
    rect(ctx, R - 8, T - 20, 8, 8, '#3a2f22');
    rect(ctx, R - 7, T - 19, 6, 6, '#ffd98a');
    rect(ctx, R - 7, T - 19, 6, 1, '#fff0c0');
    rect(ctx, R - 5, T - 19, 1, 6, '#7a5a2a');
    rect(ctx, R - 4, T - 22, 4, 2, '#3a2f22');
  }

  function drawAngler(ctx, t, lean, armAngle, rodBend) {
    var x = GEO.anglerX, y = GEO.anglerFeetY - ANGLER_H;
    // shadow on dock
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#2a1a0c';
    ctx.fillRect(x - 1, GEO.anglerFeetY - 1, ANGLER_W + 3, 3);
    ctx.globalAlpha = 1;
    PX.sprite(ctx, ANGLER_ROWS, x, y, 1, ANGLER_COLORS, false);

    // arm + rod, pivoting at the shoulder/hand
    var hand = handPos();
    hand.y += lean;
    // draw arm
    ctx.fillStyle = ANGLER_COLORS.j;
    var ax0 = GEO.anglerX + 8, ay0 = GEO.anglerFeetY - 13;
    linePix(ctx, ax0, ay0, hand.x, hand.y, '#5b8f5a');
    linePix(ctx, ax0, ay0 + 1, hand.x, hand.y + 1, '#3f6b42');
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(hand.x - 1, hand.y - 1, 3, 3);

    // rod as a tapered line from hand outward, bending with load
    var len = 30;
    var ang = armAngle;
    var tipX = hand.x + Math.cos(ang) * len;
    var tipY = hand.y + Math.sin(ang) * len;
    // bend: curve downward as load increases
    var midX = hand.x + Math.cos(ang) * len * 0.55 + rodBend * 5;
    var midY = hand.y + Math.sin(ang) * len * 0.55 + rodBend * 6 + 2;
    linePix(ctx, hand.x, hand.y, midX, midY, '#6b4426', 2);
    linePix(ctx, midX, midY, tipX, tipY, '#8a5a34', 1);
    // rod tip nub
    ctx.fillStyle = '#d8b47a';
    ctx.fillRect(Math.round(tipX) - 1, Math.round(tipY) - 1, 2, 2);
    return { hand: hand, tip: { x: tipX, y: tipY } };
  }

  function linePix(ctx, x0, y0, x1, y1, col, thick) {
    thick = thick || 1;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    ctx.fillStyle = col;
    for (var guard = 0; guard < 400; guard++) {
      ctx.fillRect(x0, y0, thick, thick);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  function drawLineAndBobber(ctx, tip, bob, t, phase, windowFrac) {
    if (!bob.visible) return;
    // fishing line: sagging curve from rod tip to bobber
    var steps = 22;
    ctx.fillStyle = 'rgba(240,240,225,0.8)';
    var sag = bob.sag != null ? bob.sag : 6;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var x = PX.lerp(tip.x, bob.x, u);
      var y = PX.lerp(tip.y, bob.y, u) + Math.sin(u * Math.PI) * sag;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }

    // bobber
    var bx = Math.round(bob.x), by = Math.round(bob.y);
    // water ring
    if (bob.inWater) {
      var ringR = 3 + Math.sin(t * 4) * 1;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(230,255,245,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, ringR + 4, (ringR + 4) * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // bobbing motion
    var bobY = by + (phase === 'waiting' ? Math.sin(t * 2.2) * 0.8 : 0) + (bob.dip || 0);
    // body
    rect(ctx, bx - 2, bobY - 3, 5, 2, '#e84a3a');   // red top
    rect(ctx, bx - 2, bobY - 1, 5, 3, '#f7f3e8');   // white bottom
    rect(ctx, bx - 2, bobY - 3, 5, 1, '#ff7a66');   // highlight
    rect(ctx, bx - 1, bobY + 2, 3, 1, '#3a2a20');   // waterline base
    rect(ctx, bx, bobY - 6, 1, 3, '#e8e0d0');       // antenna
    // reflection
    ctx.globalAlpha = 0.2;
    rect(ctx, bx - 2, bobY + 3, 5, 2, '#e84a3a');
    ctx.globalAlpha = 1;

    // bite window indicator: closing ring
    if (phase === 'bite') {
      var k = 1 - Math.max(0, Math.min(1, windowFrac));
      var rr = 6 + k * 10;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = k > 0.5 ? '#ffd24a' : '#ff5a3c';
      ctx.beginPath();
      ctx.arc(bx, by, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // splash pixels
      for (var sp = 0; sp < 6; sp++) {
        var a = sp / 6 * Math.PI * 2 + t * 2;
        rect(ctx, bx + Math.cos(a) * 6, by + 1 + Math.sin(a) * 3, 1, 1, '#eafaf1');
      }
    }
    // splash on cast landing
    if (bob.splash > 0) {
      ctx.globalAlpha = bob.splash;
      for (var s = 0; s < 10; s++) {
        var aa = s / 10 * Math.PI * 2;
        var d = (1 - bob.splash) * 9 + 2;
        rect(ctx, bx + Math.cos(aa) * d, by + 1 + Math.sin(aa) * d * 0.45, 1, 1, '#eafaf1');
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCatchFly(ctx, fly, t) {
    var spr = fishCanvas(fly.name);
    var s = fly.scale;
    var w = spr.width * s, h = spr.height * s;
    // splash underneath while airborne
    ctx.globalAlpha = Math.max(0, 0.8 - fly.alpha * 0.5);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      rect(ctx, fly.x + Math.cos(a) * 7, fly.y + 6 + Math.sin(a) * 3, 1, 1, PAL.foam);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.globalAlpha = fly.alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(fly.x, fly.y);
    ctx.rotate(fly.rot);
    // flip so the fish faces the angler when airborne
    ctx.scale(-1, 1);
    ctx.drawImage(spr, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Bite cue: exclamation bubble + ripples above the bobber.
  function drawBiteCue(ctx, bob, t) {
    var bx = Math.round(bob.x), by = Math.round(bob.y);
    var pop = Math.min(1, t * 6);
    var fy = by - 16 - Math.sin(t * 8) * 1.5 - pop * 2;
    // bubble
    ctx.fillStyle = 'rgba(20,16,24,0.72)';
    disc(ctx, bx, fy, 7, 'rgba(20,16,24,0.72)');
    ctx.fillStyle = '#fff';
    rect(ctx, bx, fy - 4, 2, 6, '#fff');
    rect(ctx, bx, fy + 3, 2, 2, '#fff');
    ctx.fillStyle = '#ff5a3c';
    rect(ctx, bx, fy - 4, 2, 1, '#5a1f10');
    // ripple rings
    for (var i = 0; i < 2; i++) {
      var rr = 4 + ((t * 14 + i * 6) % 12);
      ctx.globalAlpha = Math.max(0, 0.5 - ((t * 14 + i * 6) % 12) / 24);
      ctx.strokeStyle = '#ffe6ad';
      ctx.beginPath(); ctx.arc(bx, by + 1, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawLand(ctx, t) {
    function rightAt(y) {
      var base = 18 + (y - 92) * 0.17;
      return Math.round(base + Math.sin(y * 0.11) * 2.0);
    }
    function topAt(x) { return 89 + Math.round(Math.sin(x * 0.22) * 2 + Math.sin(x * 0.07 + 1) * 2); }
    var x, y;
    // grassy body, shaded by depth
    for (y = 86; y < 180; y++) {
      var r = rightAt(y);
      if (r <= 0) continue;
      var depth = (y - 92) / 88;
      var col = depth < 0.10 ? PAL.grassLt : depth < 0.34 ? PAL.grass : depth < 0.66 ? PAL.grassDk : '#2f5728';
      rect(ctx, 0, y, r, 1, col);
    }
    // grassy top with a few blades
    for (x = 0; x < 30; x++) {
      var ty = topAt(x);
      rect(ctx, x, ty, 1, 3, PAL.grassLt);
      rect(ctx, x, ty + 3, 1, 4, PAL.grass);
      if (x % 6 === 0) rect(ctx, x, ty - 3, 1, 3, PAL.grassLt);
    }
    // soil / rock face at the waterline
    for (y = 88; y < 180; y++) {
      var r2 = rightAt(y);
      rect(ctx, r2 - 3, y, 3, 1, '#6b4d2e');
      rect(ctx, r2 - 1, y, 1, 1, '#8a6540');
    }
    // lapping foam
    for (y = 88; y < 180; y++) {
      var r3 = rightAt(y);
      if (Math.sin(y * 1.7 + t * 6) > 0.2) rect(ctx, r3, y, 1, 1, PAL.foam);
    }
    // shoreline rocks
    disc(ctx, 27, 150, 5, PAL.rockDk); disc(ctx, 27, 149, 4, PAL.rock); disc(ctx, 25, 147, 2, PAL.rockLt);
    disc(ctx, 35, 168, 6, PAL.rockDk); disc(ctx, 35, 167, 5, PAL.rock); disc(ctx, 32, 164, 3, PAL.rockLt);
    // bank reflection in the water
    for (y = 104; y < 180; y++) {
      var r4 = rightAt(y);
      var reach = 3 + (y - 104) * 0.07;
      if (Math.sin(y * 0.9 + t * 2) > 0) {
        ctx.fillStyle = 'rgba(38,78,50,0.30)';
        ctx.fillRect(r4, y, Math.round(reach), 1);
      }
    }
  }

  function drawTree(ctx, t) {
    var sway = Math.sin(t * 1.1) * 0.8;
    // trunk and a branch
    rect(ctx, 8, 84, 6, 40, PAL.trunkDk);
    rect(ctx, 9, 84, 3, 40, PAL.trunk);
    rect(ctx, 12, 94, 11, 3, PAL.trunkDk);
    rect(ctx, 21, 86, 3, 10, PAL.trunkDk);
    var clusters = [
      [12, 74, 11], [26, 66, 10], [4, 63, 9],
      [18, 56, 10], [30, 55, 8], [8, 49, 8], [23, 47, 8]
    ];
    clusters.forEach(function (c) { disc(ctx, c[0] + sway, c[1], c[2] + 1, PAL.leafDk); });
    clusters.forEach(function (c) { disc(ctx, c[0] + sway, c[1], c[2], PAL.leaf); });
    clusters.forEach(function (c) { disc(ctx, c[0] - 2 + sway, c[1] - 2, Math.max(2, c[2] - 4), PAL.leafLt); });
    clusters.forEach(function (c) { disc(ctx, c[0] - 3 + sway, c[1] - 3, Math.max(1, c[2] - 6), PAL.leafHi); });
    // dark gaps for depth
    disc(ctx, 20, 60, 3, PAL.leafDk);
    disc(ctx, 6, 55, 2, PAL.leafDk);
  }

  function drawForeground(ctx, t) {
    // flowers on the shore
    rect(ctx, 5, 96, 2, 2, PAL.flower1); rect(ctx, 6, 97, 1, 1, '#fff');
    rect(ctx, 16, 102, 2, 2, PAL.flower2);
    rect(ctx, 10, 108, 2, 2, PAL.flower3);
    // reeds at the bottom-left waterline
    for (var r = 0; r < 6; r++) {
      var rx = 30 + r * 5, rh = 10 + (r % 3) * 5;
      var sw = Math.sin(t * 1.4 + r) * 1.2;
      ctx.fillStyle = r % 2 ? PAL.reed : PAL.reedDk;
      for (var k = 0; k < rh; k++) rect(ctx, Math.round(rx + sw * (k / rh)), 182 - k, 1, 1);
      ctx.fillStyle = '#c8a24a';
      rect(ctx, Math.round(rx + sw), 182 - rh - 3, 2, 3);
    }
    // foreground water plants bottom-right
    for (var p = 0; p < 6; p++) {
      var px2 = 248 + p * 12, ph = 9 + (p % 3) * 5;
      var sw2 = Math.sin(t * 1.1 + p * 0.8) * 1.4;
      ctx.fillStyle = p % 2 ? PAL.reedDk : PAL.leafDk;
      for (var k2 = 0; k2 < ph; k2++) rect(ctx, Math.round(px2 + sw2 * (k2 / ph)), 181 - k2, 1, 1);
    }
    // lily pads
    for (var lp = 0; lp < 3; lp++) {
      var lx = 172 + lp * 24 + Math.sin(t * 0.4 + lp) * 2;
      var ly = 168 + (lp % 2) * 7;
      disc(ctx, lx, ly, 5, PAL.leafDk);
      disc(ctx, lx, ly - 1, 4, PAL.leaf);
      rect(ctx, lx, ly - 1, 3, 2, PAL.leafDk);
    }
  }

  /* ------------------------------------------------------------------ *
   * Reveal effects (drawn on the pixel canvas, per tier)
   * ------------------------------------------------------------------ */
  var RARITY_RGB = {
    Common: [215, 225, 210], Uncommon: [143, 224, 122], Rare: [111, 198, 255],
    Epic: [208, 139, 255], Legendary: [255, 207, 77], Ancient: [127, 240, 214]
  };

  function drawReveal(ctx, name, rarity, age) {
    var spec = FISH_INDEX[name];
    var rgb = RARITY_RGB[rarity];
    // dim backdrop
    ctx.fillStyle = 'rgba(8,8,16,' + Math.min(0.6, age * 2.5).toFixed(3) + ')';
    ctx.fillRect(0, 0, 320, 180);

    var cx = 160, cy = 78;
    var spr = fishCanvas(name);

    // radial rays for Rare+
    var rayTiers = { Rare: 0.35, Epic: 0.5, Legendary: 0.7, Ancient: 0.6 };
    if (rayTiers[rarity]) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, age * 2) * rayTiers[rarity];
      ctx.translate(cx, cy - 6);
      ctx.rotate(age * (rarity === 'Ancient' ? 0.25 : 0.4));
      for (var i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.5)';
        ctx.fillRect(0, -1, 120, 2);
      }
      ctx.restore();
    }

    // glow aura
    var glowTiers = { Uncommon: 8, Rare: 14, Epic: 22, Legendary: 30, Ancient: 26 };
    if (glowTiers[rarity] && spec.glow !== false) {
      ctx.save();
      ctx.shadowColor = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.95)';
      ctx.shadowBlur = glowTiers[rarity];
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      ctx.restore();
    }

    // the fish, scaled, with a small intro pop and float
    var pop = age < 0.35 ? PX.lerp(0.4, 1, age / 0.35) : 1;
    var scale = (rarity === 'Legendary' || rarity === 'Ancient' ? 4 : 4) * pop;
    var fw = spr.width * scale, fh = spr.height * scale;
    var float = Math.sin(age * 2) * 2;
    var fx = Math.round(cx - fw / 2);
    var fy = Math.round(cy - fh / 2 - 6 + float);

    // drop shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.fillRect(fx + 6, Math.round(cy + fh / 2 + 2), fw - 10, 4);
    ctx.globalAlpha = 1;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, fx, fy, fw, fh);

    // accent rim for glow fish
    if (spec.glow) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(age * 5) * 0.2;
      ctx.shadowColor = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',1)';
      ctx.shadowBlur = 6;
      ctx.drawImage(spr, fx, fy, fw, fh);
      ctx.restore();
    }

    // animated sparkles / particles
    var n = { Common: 4, Uncommon: 8, Rare: 12, Epic: 18, Legendary: 24, Ancient: 20 }[rarity] || 4;
    for (var s = 0; s < n; s++) {
      var seed = s * 13 + 5;
      var t0 = (age * (0.5 + PX.hash01(seed) * 0.8) + PX.hash01(seed + 1)) % 1;
      var sx = cx + (PX.hash01(seed + 2) - 0.5) * 200;
      var sy = cy + 30 - t0 * 90;
      var a = Math.sin(t0 * Math.PI);
      ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (a * 0.9).toFixed(2) + ')';
      var sz = rarity === 'Ancient' || rarity === 'Legendary' ? 2 : 1;
      ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
    }

    // Ancient: rotating rune ring + drifting glyph pixels
    if (rarity === 'Ancient') {
      ctx.save();
      ctx.translate(cx, cy - 6);
      ctx.rotate(age * 0.3);
      for (var g = 0; g < 8; g++) {
        var ang = g / 8 * Math.PI * 2;
        var rx = Math.cos(ang) * 76, ry = Math.sin(ang) * 40;
        ctx.fillStyle = 'rgba(127,240,214,' + (0.5 + Math.sin(age * 3 + g) * 0.3).toFixed(2) + ')';
        ctx.fillRect(Math.round(rx) - 2, Math.round(ry) - 2, 4, 4);
        ctx.fillStyle = 'rgba(20,40,40,0.85)';
        ctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 1, 2, 2);
      }
      ctx.restore();
      // sweeping scanline
      ctx.fillStyle = 'rgba(127,240,214,0.10)';
      var scan = (age * 60) % 180;
      ctx.fillRect(0, scan, 320, 2);
    }
    // Legendary: gold star burst behind
    if (rarity === 'Legendary') {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(cx, cy - 6);
      ctx.rotate(Math.PI / 4 + age * 0.1);
      ctx.fillStyle = 'rgba(255,207,77,0.45)';
      for (var q = 0; q < 8; q++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(0, -2, 70, 1);
        ctx.fillRect(0, 1, 70, 1);
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ *
   * Full scene render
   * ------------------------------------------------------------------ */
  function renderScene(ctx, t, v) {
    ctx.imageSmoothingEnabled = false;
    drawSky(ctx, t);
    drawBirds(ctx, t);
    drawWater(ctx, t);
    drawLand(ctx, t);
    drawTree(ctx, t);
    drawDock(ctx, t);

    var rod = drawAngler(ctx, t, v.lean || 0, v.armAngle, v.rodBend || 0);

    if (v.bob) drawLineAndBobber(ctx, rod.tip, v.bob, t, v.phase, v.windowFrac || 0);
    if (v.phase === 'bite' && v.bob && v.bob.visible) drawBiteCue(ctx, v.bob, v.biteAge || 0);
    if (v.catchFly && v.catchFly.alpha > 0) drawCatchFly(ctx, v.catchFly, t);

    drawForeground(ctx, t);

    // Miss flash
    if (v.miss > 0) {
      ctx.fillStyle = 'rgba(20,10,30,' + (v.miss * 0.35).toFixed(2) + ')';
      ctx.fillRect(0, 0, 320, 180);
    }

    if (v.reveal) drawReveal(ctx, v.reveal.name, v.reveal.rarity, v.reveal.age);
  }

  global.Art = {
    PAL: PAL, FISH: FISH, FISH_INDEX: FISH_INDEX, GEO: GEO,
    fishCanvas: fishCanvas, renderScene: renderScene,
    handPos: handPos, ANGLER_W: ANGLER_W, ANGLER_H: ANGLER_H
  };
})(window);
