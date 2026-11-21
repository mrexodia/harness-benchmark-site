/* =========================================================================
   TIDEPOOL - a tiny top-down pixel fishing game
   All artwork is drawn procedurally in code. No external assets.
   ========================================================================= */
(function () {
  'use strict';

  var LW = 320, LH = 180, S = 4;            // logical size and integer scale
  var canvas = document.getElementById('game');
  canvas.width = LW * S;
  canvas.height = LH * S;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Offscreen logical-resolution scene
  var scene = document.createElement('canvas');
  scene.width = LW; scene.height = LH;
  var sg = scene.getContext('2d');
  sg.imageSmoothingEnabled = false;

  // Pre-rendered static background
  var bg = document.createElement('canvas');
  bg.width = LW; bg.height = LH;

  /* ---------------------------------------------------------------- utils */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function L(a, b, t) {
    t = clamp(t, 0, 1);
    var A = hex(a), B = hex(b);
    return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')';
  }
  // pixel helpers
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function P(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function ellipse(g, cx, cy, rx, ry, c) {
    g.fillStyle = c;
    for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      var dx = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)));
      g.fillRect(Math.round(cx - dx), Math.round(cy + y), Math.max(1, Math.round(dx * 2)), 1);
    }
  }
  function ring(g, cx, cy, r, c, alpha) {
    var steps = Math.max(10, Math.round(6.3 * r));
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    g.fillStyle = c;
    for (var i = 0; i < steps; i++) {
      var a = i / steps * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
    g.globalAlpha = 1;
  }
  function linePx(g, x0, y0, x1, y1, c, alpha) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    g.fillStyle = c;
    while (true) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    g.globalAlpha = 1;
  }
  function tri(g, x1, y1, x2, y2, x3, y3, c) {
    g.fillStyle = c;
    var minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
    var minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
    var d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
    if (d === 0) return;
    for (var y = minY; y <= maxY; y++) {
      for (var x = minX; x <= maxX; x++) {
        var a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d;
        var b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d;
        var cc = 1 - a - b;
        if (a >= -0.02 && b >= -0.02 && cc >= -0.02) g.fillRect(x, y, 1, 1);
      }
    }
  }

  /* ------------------------------------------------------------ palette */
  var C = {
    wShallow: '#5fb0c4', wMid: '#3f93ad', wDeep: '#20536d', wDeepest: '#173f57',
    foam: '#eaf7f3', caustic: '#c7f2f3',
    sand: '#e6cf94', sandDark: '#cdb173', sandWet: '#b3925c', sandShadow: '#9c7c4b',
    grass: '#5c9c44', grassDark: '#437c33', grassLight: '#77b357', grassShadow: '#33591f',
    dirt: '#b98a52', dirtDark: '#8f6636',
    wood: '#a9743f', woodDark: '#7d5128', woodLight: '#c99a5b', woodShadow: '#5e3c1d',
    rock: '#8a8f96', rockDark: '#5f656d', rockLight: '#b4bac2',
    trunk: '#6b4a2a', trunkDark: '#4d3419',
    leafDark: '#2f6b34', leafMid: '#3f8a41', leafLight: '#63ad55', leafHi: '#8fc86a',
    pink: '#e88ab0', yellow: '#f0d060', white: '#f4f4ee', red: '#c0564a',
    skin: '#e8b98a', skinDark: '#c9925f', hair: '#5a3a24'
  };

  /* ----------------------------------------------------------- coastline */
  function shoreY(x) {
    return 60 + 7 * Math.sin(x * 0.045) + 3.5 * Math.sin(x * 0.11 + 1.3) + (x - 160) * 0.05;
  }

  /* -------------------------------------------------------------- trees */
  var trees = [
    { x: 46, y: 20, r: 17, p: 0.0, kind: 'broad' },
    { x: 150, y: 12, r: 14, p: 1.7, kind: 'broad' },
    { x: 286, y: 26, r: 12, p: 3.1, kind: 'pine' }
  ];
  var reeds = [
    { x: 24, y: 58, h: 12, p: 0.2 }, { x: 30, y: 60, h: 15, p: 1.1 },
    { x: 70, y: 62, h: 11, p: 2.4 }, { x: 76, y: 61, h: 14, p: 0.7 },
    { x: 176, y: 66, h: 12, p: 1.9 }, { x: 183, y: 68, h: 15, p: 3.0 },
    { x: 232, y: 70, h: 11, p: 0.4 }, { x: 238, y: 71, h: 13, p: 1.5 }
  ];
  var lilies = [
    { x: 34, y: 84, r: 5 }, { x: 52, y: 92, r: 6 }, { x: 20, y: 100, r: 4 },
    { x: 130, y: 86, r: 5 }, { x: 150, y: 96, r: 4 }
  ];
  var underwaterRocks = [
    { x: 60, y: 120, r: 7 }, { x: 98, y: 150, r: 9 }, { x: 250, y: 120, r: 6 },
    { x: 200, y: 160, r: 8 }, { x: 288, y: 96, r: 6 }
  ];

  /* ------------------------------------------------------------- species */
  var SPECIES = {
    Common: [
      { name: 'Sunfin Minnow', body: '#d9b45a', belly: '#f4e6b0', fin: '#e0893c', accent: '#b5762a', pattern: 'stripe', shape: 'slim', len: 24, hgt: 10 },
      { name: 'Puddle Perch', body: '#7fae5a', belly: '#d3e6a8', fin: '#4e8a3a', accent: '#3f6f2f', pattern: 'spots', shape: 'normal', len: 22, hgt: 12 }
    ],
    Uncommon: [
      { name: 'Copperback Dace', body: '#b5763f', belly: '#e8c79a', fin: '#8a5a2e', accent: '#7a4a24', pattern: 'stripe', shape: 'slim', len: 26, hgt: 11 },
      { name: 'Bramble Carp', body: '#6f8f4a', belly: '#c9d9a0', fin: '#3f6f2f', accent: '#4e6f2f', pattern: 'scales', shape: 'deep', len: 26, hgt: 15 }
    ],
    Rare: [
      { name: 'Moonlit Trout', body: '#8fa8d8', belly: '#dbe6f5', fin: '#6a86bf', accent: '#f0f4ff', pattern: 'speckle', shape: 'normal', len: 30, hgt: 13 },
      { name: 'Amber Snapper', body: '#d98a3a', belly: '#f2c98a', fin: '#b05f2a', accent: '#ffe08a', pattern: 'bands', shape: 'deep', len: 28, hgt: 16 }
    ],
    Epic: [
      { name: 'Coral Crest Ray', body: '#6fc0b5', belly: '#cfeee8', fin: '#e06f8a', accent: '#ffd0e0', pattern: 'spots', shape: 'ray', len: 32, hgt: 20 },
      { name: 'Thunderback Bass', body: '#4f6f9f', belly: '#bcd0ea', fin: '#2f4f7f', accent: '#ffe14a', pattern: 'bolt', shape: 'deep', len: 30, hgt: 17 }
    ],
    Legendary: [
      { name: 'Aurora Koi', body: '#f2f2f7', belly: '#ffffff', fin: '#f0a8c8', accent: '#8fe0d8', pattern: 'koi', shape: 'koi', len: 34, hgt: 16 },
      { name: 'Emberfin Marlin', body: '#3a6f9f', belly: '#cfe0ef', fin: '#e05a2a', accent: '#ffcf3a', pattern: 'bands', shape: 'marlin', len: 36, hgt: 13 }
    ],
    Ancient: [
      { name: 'Tidefather', body: '#4a5f6f', belly: '#9fb0b8', fin: '#2f8f86', accent: '#f0c46a', pattern: 'runes', shape: 'ancient', len: 34, hgt: 20 },
      { name: 'Voidscale Leviathan', body: '#2e3b55', belly: '#7d8fb0', fin: '#6a3f8f', accent: '#8ff0e0', pattern: 'runes', shape: 'ancient', len: 36, hgt: 19 }
    ]
  };
  var RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  var RARITY_COLOR = {
    Common: '#b9c6cc', Uncommon: '#6fce6f', Rare: '#5aa8e8',
    Epic: '#b472e8', Legendary: '#f0b93c', Ancient: '#3fd8c8'
  };
  var LEGEND = [
    ['Common', '45%'], ['Uncommon', '25%'], ['Rare', '15%'],
    ['Epic', '8%'], ['Legendary', '5%'], ['Ancient', '2%']
  ];

  function pickRarity(u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  /* -------------------------------------------------------- static scene */
  function buildBackground() {
    var g = bg.getContext('2d');
    g.imageSmoothingEnabled = false;

    // water gradient
    for (var y = 0; y < LH; y++) {
      var f = clamp((y - 20) / 160, 0, 1);
      g.fillStyle = L(C.wShallow, C.wDeepest, f);
      g.fillRect(0, y, LW, 1);
    }
    // deep bands
    for (y = 96; y < LH; y += 9) {
      g.globalAlpha = 0.10;
      g.fillStyle = C.wDeep;
      g.fillRect(0, y, LW, 3);
      g.globalAlpha = 1;
    }

    // land columns
    for (var x = 0; x < LW; x++) {
      var sy = shoreY(x);
      var grassBottom = Math.max(1, sy - 9);
      // grass base with soft variation
      for (var yy = 0; yy < grassBottom; yy++) {
        var n = rnd(x * 13.3 + yy * 7.7);
        var col = C.grass;
        if (n > 0.93) col = C.grassLight;
        else if (n < 0.08) col = C.grassDark;
        if (yy < 4) col = L(col, C.grassShadow, 0.35);
        g.fillStyle = col;
        g.fillRect(x, yy, 1, 1);
      }
      // sand band
      var sandTop = Math.max(0, sy - 9);
      for (yy = sandTop; yy < sy; yy++) {
        var t = (yy - sandTop) / 9;
        g.fillStyle = L(C.sand, C.sandWet, t);
        g.fillRect(x, yy, 1, 1);
      }
      if (sy > 1) { g.fillStyle = C.sandShadow; g.fillRect(x, Math.round(sy) - 1, 1, 1); }
    }

    // shallows below waterline
    for (x = 0; x < LW; x++) {
      var sy2 = shoreY(x);
      for (var d = 0; d < 18; d++) {
        g.fillStyle = L('#8fd3d0', C.wMid, d / 18);
        g.globalAlpha = 1 - d / 24;
        g.fillRect(x, Math.round(sy2) + d, 1, 1);
      }
      g.globalAlpha = 1;
    }

    // shoreline foam
    for (x = 0; x < LW; x++) {
      var fy = Math.round(shoreY(x));
      var wob = Math.sin(x * 0.3) * 1;
      g.globalAlpha = 0.75;
      g.fillStyle = C.foam;
      g.fillRect(x, Math.round(fy + wob), 1, 1);
      g.globalAlpha = 0.32;
      g.fillRect(x, Math.round(fy + wob) + 1, 1, 1);
      g.globalAlpha = 1;
    }

    // dirt path from left to dock
    for (var i = 0; i < 120; i++) {
      var px = i * 1.0;
      var py = 50 + Math.sin(px * 0.05) * 6 - px * 0.02;
      var w = 2 + Math.sin(px * 0.2) * 1;
      g.fillStyle = C.dirt;
      g.fillRect(Math.round(px), Math.round(py), 1, Math.round(w));
      g.fillStyle = C.dirtDark;
      g.fillRect(Math.round(px), Math.round(py + w), 1, 1);
    }

    // grass tufts and flowers
    for (i = 0; i < 260; i++) {
      var gx = Math.floor(rnd(i * 3.1) * LW);
      var gy = Math.floor(rnd(i * 7.7 + 5) * Math.max(1, shoreY(gx) - 11));
      var k = rnd(i * 11.3);
      if (k < 0.62) { g.fillStyle = C.grassDark; g.fillRect(gx, gy, 1, 2); g.fillRect(gx + 2, gy + 1, 1, 2); }
      else if (k < 0.74) { g.fillStyle = C.grassLight; g.fillRect(gx, gy, 2, 1); }
      else if (k < 0.82) { g.fillStyle = C.yellow; g.fillRect(gx, gy, 2, 2); g.fillStyle = '#e0a020'; g.fillRect(gx, gy, 1, 1); }
      else if (k < 0.9) { g.fillStyle = C.pink; g.fillRect(gx, gy, 2, 2); g.fillStyle = '#c06090'; g.fillRect(gx + 1, gy, 1, 1); }
      else if (k < 0.96) { g.fillStyle = C.white; g.fillRect(gx, gy, 1, 1); g.fillStyle = '#e0d0a0'; g.fillRect(gx + 1, gy + 1, 1, 1); }
      else { g.fillStyle = C.rockDark; g.fillRect(gx, gy, 2, 2); g.fillStyle = C.rock; g.fillRect(gx, gy, 1, 1); }
    }

    // trunk shadows + trunks
    for (i = 0; i < trees.length; i++) {
      var tr = trees[i];
      g.globalAlpha = 0.22; ellipse(g, tr.x + 3, tr.y + 8, tr.r * 0.85, tr.r * 0.42, '#000'); g.globalAlpha = 1;
    }

    // bushes along shore
    var bushes = [[86, 50, 6], [196, 46, 7], [165, 48, 5], [122, 46, 5], [255, 44, 6]];
    for (i = 0; i < bushes.length; i++) {
      var b = bushes[i];
      ellipse(g, b[0] + 1, b[1] + 2, b[2] * 0.9, b[2] * 0.4, '#00000033');
      ellipse(g, b[0], b[1], b[2], b[2] * 0.8, C.leafDark);
      ellipse(g, b[0] - 1, b[1] - 1, b[2] * 0.7, b[2] * 0.55, C.leafMid);
      ellipse(g, b[0] - 1, b[1] - 2, b[2] * 0.4, b[2] * 0.3, C.leafLight);
      for (var fnum = 0; fnum < 4; fnum++) {
        var fx = b[0] + Math.round((rnd(i * 9 + fnum) - 0.5) * b[2] * 1.5);
        var fy2 = b[1] + Math.round((rnd(i * 5 + fnum) - 0.5) * b[2]);
        g.fillStyle = fnum % 2 ? C.pink : C.white;
        g.fillRect(fx, fy2, 1, 1);
      }
    }

    // static lily pads
    for (i = 0; i < lilies.length; i++) {
      var lp = lilies[i];
      g.globalAlpha = 0.25; ellipse(g, lp.x + 1, lp.y + 2, lp.r, lp.r * 0.45, '#000'); g.globalAlpha = 1;
      ellipse(g, lp.x, lp.y, lp.r, lp.r * 0.72, '#3f8a41');
      ellipse(g, lp.x - 1, lp.y - 1, lp.r * 0.65, lp.r * 0.45, '#57a34d');
      // notch
      g.fillStyle = L(C.wMid, C.wDeep, 0.3);
      tri(g, lp.x, lp.y, lp.x + lp.r, lp.y - 2, lp.x + lp.r * 0.6, lp.y + 1, L(C.wMid, C.wDeep, 0.3));
    }

    // underwater rocks and sand ripples
    for (i = 0; i < underwaterRocks.length; i++) {
      var rk = underwaterRocks[i];
      g.globalAlpha = 0.5;
      ellipse(g, rk.x, rk.y, rk.r, rk.r * 0.5, C.rockDark);
      ellipse(g, rk.x - 1, rk.y - 1, rk.r * 0.7, rk.r * 0.35, C.rock);
      g.globalAlpha = 1;
    }
    for (i = 0; i < 90; i++) {
      var rx = Math.floor(rnd(i * 2.7) * LW);
      var ry = 80 + Math.floor(rnd(i * 9.1) * 95);
      g.globalAlpha = 0.13;
      g.fillStyle = C.sand;
      g.fillRect(rx, ry, 2 + Math.floor(rnd(i) * 4), 1);
      g.globalAlpha = 1;
    }

    // tiny distant islet
    drawIslet(g, 207, 158);

    // dock
    drawDock(g);
  }

  function drawIslet(g, cx, cy) {
    ellipse(g, cx + 2, cy + 3, 20, 8, 'rgba(0,0,0,0.25)');
    ellipse(g, cx, cy, 20, 9, C.sandDark);
    ellipse(g, cx - 1, cy - 2, 15, 6, C.sand);
    ellipse(g, cx - 2, cy - 3, 9, 4, C.grassDark);
    ellipse(g, cx - 3, cy - 4, 4, 2, C.grass);
    // little palm
    R(g, cx - 2, cy - 16, 2, 13, C.trunk);
    R(g, cx - 1, cy - 16, 1, 13, C.trunkDark);
    for (var i = 0; i < 5; i++) {
      var a = -1.4 + i * 0.7;
      for (var r = 3; r < 11; r++) {
        P(g, cx + Math.cos(a) * r, cy - 17 + Math.sin(a) * r * 0.5 + Math.abs(Math.cos(a) * r) * 0.15, i % 2 ? C.leafMid : C.leafDark);
      }
    }
    P(g, cx - 1, cy - 18, C.leafHi); P(g, cx, cy - 18, C.leafHi);
    // reflection
    g.globalAlpha = 0.15; ellipse(g, cx, cy + 6, 16, 3, '#dff'); g.globalAlpha = 1;
  }

  function drawDock(g) {
    var x0 = 100, x1 = 117, y0 = 50, y1 = 127;
    // water shadow
    g.globalAlpha = 0.28; g.fillStyle = '#001018';
    g.fillRect(x1 + 2, y0 + 4, 6, y1 - y0);
    g.globalAlpha = 1;
    // support posts
    for (var yy = y0 + 10; yy < y1; yy += 22) {
      R(g, x0 + 1, yy, 3, 3, C.woodShadow);
      R(g, x1 - 4, yy, 3, 3, C.woodShadow);
    }
    // planks
    for (var y = y0; y < y1; y += 5) {
      R(g, x0, y, x1 - x0, 4, C.wood);
      R(g, x0, y, x1 - x0, 1, C.woodLight);
      R(g, x0, y + 3, x1 - x0, 1, C.woodDark);
      // plank end shading
      R(g, x0, y, 1, 4, C.woodDark);
      R(g, x1 - 1, y, 1, 4, C.woodDark);
    }
    // nails
    for (y = y0 + 1; y < y1; y += 5) { P(g, x0 + 2, y + 2, C.woodShadow); P(g, x1 - 3, y + 2, C.woodShadow); }
    // rope coil at end
    ellipse(g, x1 - 4, y1 - 4, 3, 2, '#8a6a3a');
    ring(g, x1 - 4, y1 - 4, 2, '#5e4520');
    // sign at dock entrance
    R(g, x0 - 8, y0 - 12, 2, 14, C.trunkDark);
    R(g, x0 - 14, y0 - 13, 13, 6, C.wood);
    R(g, x0 - 14, y0 - 13, 13, 1, C.woodLight);
    R(g, x0 - 14, y0 - 8, 13, 1, C.woodDark);
    P(g, x0 - 2, y0 - 12, C.woodShadow);
  }

  /* ----------------------------------------------------------- angler art */
  var rodBase = { x: 121, y: 101 };
  function rodAngleFor(state, t) {
    if (state === 'cast') {
      var p = t / 0.55;
      if (p < 0.35) return lerp(-0.55, 0.45, p / 0.35);          // wind up back
      return lerp(0.45, -1.05, clamp((p - 0.35) / 0.65, 0, 1));    // throw forward
    }
    if (state === 'waiting') return lerp(-1.05, -0.62, clamp(t / 0.3, 0, 1));
    if (state === 'bite') return -0.5 + Math.sin(T * 26) * 0.05;
    if (state === 'reeling') return -0.15 + Math.sin(t * 22) * 0.08;
    if (state === 'miss') return -0.62;
    return -0.58 + Math.sin(T * 1.2) * 0.02;
  }
  function rodTip(state, t) {
    var a = rodAngleFor(state, t);
    return { x: rodBase.x + Math.cos(a) * 18, y: rodBase.y + Math.sin(a) * 18 };
  }

  function drawAngler(g, state, t) {
    var bx = 108, feet = 110;
    // shadow
    g.globalAlpha = 0.3; ellipse(g, bx + 2, feet + 1, 8, 2.4, '#001018'); g.globalAlpha = 1;
    // legs / boots
    R(g, bx - 2, feet - 4, 3, 4, '#3f5f8f'); R(g, bx + 2, feet - 4, 3, 4, '#3f5f8f');
    R(g, bx - 3, feet - 1, 4, 2, '#3a2a1c'); R(g, bx + 1, feet - 1, 4, 2, '#3a2a1c');
    // torso (shirt)
    R(g, bx - 4, feet - 12, 9, 8, C.red);
    R(g, bx - 4, feet - 12, 9, 1, '#d87a6a');
    R(g, bx - 4, feet - 5, 9, 1, '#8a3a32');
    // overall straps
    R(g, bx - 3, feet - 12, 2, 8, '#3f5f8f');
    R(g, bx + 2, feet - 12, 2, 8, '#3f5f8f');
    // satchel
    R(g, bx - 6, feet - 10, 2, 4, '#8a6a3a');
    // arms
    R(g, bx + 3, feet - 10, 5, 2, C.red);
    R(g, bx - 6, feet - 10, 3, 2, C.red);
    // hands
    P(g, rodBase.x, rodBase.y, C.skin);
    P(g, rodBase.x - 1, rodBase.y, C.skin);
    // head
    ellipse(g, bx, feet - 17, 3.4, 3.4, C.skin);
    ellipse(g, bx + 1, feet - 17, 2, 1.6, C.skinDark);
    // straw hat
    ellipse(g, bx, feet - 19, 7, 2.2, '#e8c15a');
    ellipse(g, bx, feet - 19, 7, 1.2, '#f4d97a');
    R(g, bx - 3, feet - 24, 7, 5, '#e8c15a');
    R(g, bx - 3, feet - 20, 7, 1, '#b98a2e');
    R(g, bx - 3, feet - 24, 7, 1, '#f4d97a');
    P(g, bx + 3, feet - 24, '#c9a02e');
    // tiny flower on hat
    P(g, bx + 4, feet - 21, C.pink); P(g, bx + 5, feet - 21, C.white);

    // rod
    var tip = rodTip(state, t);
    var a = rodAngleFor(state, t);
    // handle
    linePx(g, rodBase.x, rodBase.y, rodBase.x + Math.cos(a) * 4, rodBase.y + Math.sin(a) * 4, '#5e3c1d');
    // flex curve
    var mx = lerp(rodBase.x, tip.x, 0.5), my = lerp(rodBase.y, tip.y, 0.5);
    if (state === 'reeling' || state === 'bite') { mx += Math.cos(a + 1.57) * -2; my += Math.sin(a + 1.57) * -2; }
    var steps = 12;
    for (var i = 1; i <= steps; i++) {
      var p = i / steps;
      var x = (1 - p) * (1 - p) * rodBase.x + 2 * (1 - p) * p * mx + p * p * tip.x;
      var y = (1 - p) * (1 - p) * rodBase.y + 2 * (1 - p) * p * my + p * p * tip.y;
      P(g, x, y, i < 5 ? '#6b4a2a' : '#8a6a44');
    }
    // reel
    P(g, rodBase.x - 1, rodBase.y + 1, '#c9a02e'); P(g, rodBase.x, rodBase.y + 1, '#5e3c1d');
    return tip;
  }

  /* -------------------------------------------------------------- bobber */
  var bobState = { x: 160, y: 100, landT: 0, dips: [] };

  function drawBobber(g, state, t, tip) {
    var bx = bobState.x, by = bobState.y;
    var atTip = (state === 'ready' || state === 'reveal');
    if (state === 'cast') {
      var p = clamp((t / 0.55 - 0.35) / 0.65, 0, 1);
      var start = tip;
      bx = lerp(start.x, bobState.x, p);
      by = lerp(start.y, bobState.y, p) - Math.sin(Math.PI * p) * 34;
    }
    if (atTip) { bx = tip.x; by = tip.y; }
    // shadow on water (only when the bobber is actually out on the water)
    if (!atTip) {
      g.globalAlpha = 0.25;
      ellipse(g, bobState.x, bobState.y + 1, 3, 1.2, '#001018');
      g.globalAlpha = 1;
    }

    var bob = 0, dip = 0;
    if (state === 'waiting') bob = Math.sin(T * 2.2) * 0.7;
    if (state === 'bite') {
      var bp = t;
      dip = bp < 0.18 ? bp / 0.18 * 4 : 4 - 1.5 * (bp - 0.18);
      dip = Math.max(0, dip) + Math.sin(T * 20) * 0.8;
    }
    if (state === 'reeling') {
      var rp = clamp(t / 1.0, 0, 1);
      bx = lerp(bobState.x, tip.x, rp);
      by = lerp(bobState.y, tip.y, rp) - Math.sin(Math.PI * rp) * 14;
    }
    var yy = by + bob + dip;

    // stem + knob
    P(g, bx, yy - 4, '#5a3a2a'); P(g, bx, yy - 5, '#e8e0d0'); P(g, bx, yy - 6, '#e8e0d0');
    // body: white lower, red upper
    ellipse(g, bx, yy, 2.6, 2.6, C.white);
    g.fillStyle = C.red;
    for (var i = -3; i <= 0; i++) {
      var dx = 2.6 * Math.sqrt(Math.max(0, 1 - (i * i) / (2.6 * 2.6)));
      g.fillRect(Math.round(bx - dx), Math.round(yy + i), Math.max(1, Math.round(dx * 2)), 1);
    }
    g.fillStyle = '#e88a80';
    g.fillRect(Math.round(bx - 1), Math.round(yy - 3), 1, 1);
    P(g, bx, yy + 2, '#d8d8d0');

    return { x: bx, y: yy, shadowY: bobState.y };
  }

  /* ------------------------------------------------------------ particles */
  var particles = [];
  function spawn(parts) { for (var i = 0; i < parts.length; i++) particles.push(parts[i]); }
  function burst(x, y, n, colors, spread) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random()) * (spread || 18);
      particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 8,
        life: 0.5 + Math.random() * 0.5, max: 1, g: 60,
        c: colors[Math.floor(Math.random() * colors.length)], s: 1
      });
    }
  }
  function ripple(x, y) {
    particles.push({ ripple: true, x: x, y: y, life: 0.9, max: 0.9 });
  }
  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      if (!p.ripple) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
    }
  }
  function drawParticles(g) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.ripple) {
        var k = 1 - p.life / p.max;
        ring(g, p.x, p.y, 2 + k * 12, C.foam, (1 - k) * 0.7);
      } else {
        g.globalAlpha = clamp(p.life / 0.4, 0, 1);
        g.fillStyle = p.c;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        g.globalAlpha = 1;
      }
    }
  }

  /* --------------------------------------------------------- dynamic water */
  var fishShadows = [];
  for (var fs = 0; fs < 6; fs++) {
    fishShadows.push({ x: rnd(fs * 3) * LW, y: 92 + rnd(fs * 7) * 80, sp: 4 + rnd(fs) * 6, p: rnd(fs * 5) * 6, dir: rnd(fs * 2) > 0.5 ? 1 : -1, s: 2 + rnd(fs * 9) });
  }
  function drawWaterDynamic(g, state, t) {
    // caustic light lines
    for (var i = 0; i < 30; i++) {
      var bx = (i * 53 + Math.sin(T * 0.22 + i) * 22) % LW;
      var by = 84 + ((i * 37) % 92);
      var len = 4 + (i % 4) * 3;
      var a = 0.07 + 0.05 * (0.5 + 0.5 * Math.sin(T * 1.3 + i * 1.7));
      g.globalAlpha = a;
      g.fillStyle = C.caustic;
      for (var k = 0; k < len; k++) {
        var x = Math.round(bx + Math.sin(k * 0.7 + T + i) * 2);
        var y = Math.round(by + Math.cos(k * 0.5 + T * 0.8 + i) * 1);
        g.fillRect(((x % LW) + LW) % LW, y, 1, 1);
      }
    }
    g.globalAlpha = 1;

    // fish shadows
    g.globalAlpha = 0.12;
    g.fillStyle = '#04202e';
    for (i = 0; i < fishShadows.length; i++) {
      var f = fishShadows[i];
      var fx = ((f.x + T * f.sp * f.dir) % (LW + 30) + LW + 30) % (LW + 30) - 15;
      var fy = f.y + Math.sin(T * 0.7 + f.p) * 2;
      var wob = Math.sin(T * 6 + f.p) * 1;
      ellipse(g, fx, fy, f.s, f.s * 0.4, '#04202e');
      tri(g, fx + f.s, fy, fx + f.s + 3, fy - wob - 2, fx + f.s + 3, fy + wob + 2, '#04202e');
    }
    g.globalAlpha = 1;

    // surface sparkles
    for (i = 0; i < 10; i++) {
      var sx = (i * 71 + 13) % LW, sy = 86 + (i * 41) % 88;
      var phase = (T * 0.8 + i * 0.37) % 1;
      if (phase < 0.25) {
        g.globalAlpha = Math.sin(phase / 0.25 * Math.PI) * 0.7;
        g.fillStyle = '#ffffff';
        g.fillRect(sx, sy, 1, 1); g.fillRect(sx - 1, sy, 1, 1); g.fillRect(sx + 1, sy, 1, 1);
        g.fillRect(sx, sy - 1, 1, 1); g.fillRect(sx, sy + 1, 1, 1);
      }
    }
    g.globalAlpha = 1;
  }

  /* --------------------------------------------------------- underwater life */
  var kelpAnchors = [
    { x: 64, y: 126, h: 26, p: 0.3 }, { x: 97, y: 154, h: 30, p: 1.7 },
    { x: 249, y: 126, h: 22, p: 2.6 }, { x: 287, y: 100, h: 18, p: 0.9 },
    { x: 201, y: 166, h: 24, p: 3.3 }, { x: 44, y: 112, h: 20, p: 2.1 }
  ];
  function drawKelp(g) {
    for (var a = 0; a < kelpAnchors.length; a++) {
      var k = kelpAnchors[a];
      g.globalAlpha = 0.85;
      for (var h = 0; h < k.h; h++) {
        var sway = Math.sin(T * 1.2 + k.p + h * 0.18) * (h / k.h) * 2.4;
        var x = Math.round(k.x + sway), y = Math.round(k.y - h);
        g.fillStyle = h % 6 < 3 ? '#2f7a52' : '#3f9a63';
        g.fillRect(x, y, 1, 1);
        if (h % 5 === 2) g.fillRect(x + (h % 2 ? 1 : -1), y, 1, 1);
      }
      g.globalAlpha = 1;
      // rising bubbles
      for (var b = 0; b < 3; b++) {
        var prog = ((T * 0.35 + a * 0.27 + b * 0.33) % 1);
        var by = Math.round(k.y - prog * k.h);
        var bx = Math.round(k.x + Math.sin(T + b * 2 + a) * 2.5);
        g.globalAlpha = (1 - prog) * 0.5;
        g.fillStyle = '#cdeef0';
        g.fillRect(bx, by, 1, 1);
        g.globalAlpha = 1;
      }
    }
  }

  /* -------------------------------------------------------------- foliage */
  function drawCanopies(g) {
    for (var i = 0; i < trees.length; i++) {
      var tr = trees[i];
      var sway = Math.sin(T * 0.7 + tr.p) * 1.2;
      if (tr.kind === 'pine') {
        for (var lay = 0; lay < 3; lay++) {
          var ly = tr.y + lay * 6 - 6;
          var lw = tr.r * (0.55 + lay * 0.28);
          for (var yy = -7; yy <= 7; yy++) {
            var w = lw * (1 - Math.abs(yy) / 7);
            if (w <= 0) continue;
            g.fillStyle = yy < -2 ? C.leafLight : (yy < 2 ? C.leafMid : C.leafDark);
            g.fillRect(Math.round(tr.x + sway - w), Math.round(ly + yy), Math.max(1, Math.round(w * 2)), 1);
          }
        }
        R(g, tr.x + sway - 1, tr.y + 10, 3, 6, C.trunk);
      } else {
        var r = tr.r;
        ellipse(g, tr.x + sway + 1, tr.y + 2, r, r * 0.85, C.leafDark);
        ellipse(g, tr.x + sway - 1, tr.y - 1, r * 0.85, r * 0.75, C.leafMid);
        ellipse(g, tr.x + sway - 2, tr.y - 3, r * 0.62, r * 0.55, C.leafLight);
        ellipse(g, tr.x + sway - 3, tr.y - 4, r * 0.35, r * 0.32, C.leafHi);
        // dappled highlights
        for (var h = 0; h < 14; h++) {
          var hx = Math.round(tr.x + sway + (rnd(i * 20 + h) - 0.5) * r * 1.9);
          var hy = Math.round(tr.y + (rnd(i * 30 + h) - 0.5) * r * 1.7);
          g.fillStyle = rnd(i + h) > 0.5 ? C.leafHi : C.leafHi;
          g.globalAlpha = 0.5;
          g.fillRect(hx, hy, 1, 1);
          g.globalAlpha = 1;
        }
        // little fruit / flowers
        for (var fr = 0; fr < 5; fr++) {
          var ffx = Math.round(tr.x + sway + (rnd(i * 7 + fr) - 0.5) * r * 1.6);
          var ffy = Math.round(tr.y + (rnd(i * 11 + fr) - 0.5) * r * 1.4);
          g.fillStyle = fr % 2 ? C.pink : C.yellow;
          g.fillRect(ffx, ffy, 1, 1);
        }
      }
    }
  }

  function drawReeds(g) {
    for (var i = 0; i < reeds.length; i++) {
      var r = reeds[i];
      var sway = Math.sin(T * 1.4 + r.p) * 1.6;
      for (var h = 0; h < r.h; h++) {
        var xx = r.x + sway * (h / r.h);
        g.fillStyle = h > r.h - 3 ? '#6f9a3a' : '#4e7a30';
        g.fillRect(Math.round(xx), r.y - h, 1, 1);
      }
      // cattail tip
      g.fillStyle = '#7a5a2a';
      g.fillRect(Math.round(r.x + sway), r.y - r.h - 2, 1, 3);
      // small leaf
      g.fillStyle = '#4e7a30';
      g.fillRect(Math.round(r.x - 1 + sway * 0.4), r.y - r.h * 0.5, 1, 3);
    }
  }

  function drawForeground(g) {
    // a few out-of-focus reeds / grass at bottom corners for depth
    g.globalAlpha = 0.95;
    for (var i = 0; i < 22; i++) {
      var x = i < 11 ? i * 3 - 4 : LW - (i - 11) * 3 + 3;
      var h = 10 + rnd(i) * 14;
      var sway = Math.sin(T * 1.1 + i) * 1.4;
      g.fillStyle = i % 3 ? '#2f5520' : '#3b6b28';
      for (var k = 0; k < h; k++) g.fillRect(Math.round(x + sway * (k / h)), LH - k, 1, 1);
    }
    g.globalAlpha = 1;
  }

  /* -------------------------------------------------------------- the fish */
  function fishProfile(u, shape) {
    var s = Math.sin(Math.PI * clamp(u, 0, 1));
    switch (shape) {
      case 'slim': return Math.pow(s, 0.7) * 0.8;
      case 'deep': return Math.pow(s, 0.5) * 0.9 + 0.1;
      case 'ray': return Math.pow(s, 0.75);
      case 'koi': return Math.pow(s, 0.6) * 0.9 + 0.08;
      case 'marlin': return Math.pow(s, 0.55) * 0.85;
      case 'ancient': return Math.pow(s, 0.45) * 0.95 + 0.05;
      default: return Math.pow(s, 0.6);
    }
  }

  function drawFish(g, cx, cy, sp, scale) {
    scale = scale || 1;
    var W = Math.max(6, Math.round(sp.len * scale));
    var H = Math.max(4, Math.round(sp.hgt * scale));
    var x0 = Math.round(cx - W / 2), y0 = Math.round(cy - H / 2);
    var tailLen = Math.round(H * 0.9), midY = cy;

    // tail fan (left)
    tri(g, x0 + 1, cy, x0 - tailLen, cy - H * 0.75, x0 - tailLen, cy + H * 0.75, sp.fin);
    tri(g, x0, cy, x0 - tailLen * 0.75, cy - H * 0.45, x0 - tailLen * 0.75, cy + H * 0.45, L(sp.fin, '#ffffff', 0.15));

    // body
    for (var i = 0; i < W; i++) {
      var u = (i + 0.5) / W;
      var half = (H / 2) * fishProfile(u, sp.shape);
      var x = x0 + i;
      var top = Math.round(cy - half), bot = Math.round(cy + half);
      for (var y = top; y <= bot; y++) {
        var v = half <= 0 ? 0 : (y - cy) / half;
        var col = v > 0.05 ? sp.body : sp.belly;
        if (v < -0.55) col = L(sp.body, '#ffffff', 0.18);
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }

    // pectoral fin
    var pf = { x: x0 + W * 0.62, y: cy + H * 0.18 };
    tri(g, pf.x, pf.y, pf.x + W * 0.2, pf.y + H * 0.42, pf.x + W * 0.05, pf.y + H * 0.05, sp.fin);
    // dorsal fin
    tri(g, x0 + W * 0.38, y0 + 1, x0 + W * 0.58, y0 + 1, x0 + W * 0.5, y0 - H * 0.45, sp.fin);
    if (sp.shape === 'marlin') tri(g, x0 + W * 0.55, y0 + 1, x0 + W * 0.9, y0 + 1, x0 + W * 0.5, y0 - H * 1.1, sp.fin);

    // patterns
    var px, py;
    if (sp.pattern === 'stripe') {
      for (i = 1; i < 4; i++) {
        var sx = x0 + Math.round(W * (i / 4));
        for (y = y0; y <= y0 + H; y++) {
          if (Math.abs(y - cy) < H * 0.5) { P(g, sx, y, sp.accent); }
        }
      }
    } else if (sp.pattern === 'spots') {
      for (var sN = 0; sN < 10; sN++) {
        px = x0 + Math.round(rnd(sN * 3.3 + sp.len) * W);
        py = Math.round(cy + (rnd(sN * 7.7 + sp.hgt) - 0.5) * H * 0.7);
        P(g, px, py, sp.accent); P(g, px + 1, py, sp.accent);
      }
    } else if (sp.pattern === 'scales') {
      for (i = 0; i < W; i += 2) {
        for (y = y0; y <= y0 + H; y += 2) {
          if (Math.abs(y - cy) < H * 0.5 && ((i / 2 + (y - y0) / 2) % 2 === 0)) P(g, x0 + i, y, L(sp.body, sp.accent, 0.35));
        }
      }
    } else if (sp.pattern === 'speckle') {
      for (sN = 0; sN < 16; sN++) {
        px = x0 + Math.round(rnd(sN * 1.7 + 2) * W);
        py = Math.round(cy + (rnd(sN * 2.3) - 0.5) * H * 0.8);
        P(g, px, py, sp.accent);
      }
    } else if (sp.pattern === 'bands') {
      for (i = 0; i < 4; i++) {
        var bxx = x0 + Math.round(W * (0.2 + i * 0.18));
        for (y = y0; y <= y0 + H; y++) if (Math.abs(y - cy) < H * 0.5) P(g, bxx, y, sp.accent);
      }
    } else if (sp.pattern === 'bolt') {
      var bpts = [[0.25, -0.4], [0.35, 0.1], [0.45, -0.3], [0.55, 0.2], [0.65, -0.2], [0.75, 0.25]];
      for (i = 0; i < bpts.length; i++) {
        px = x0 + Math.round(W * bpts[i][0]); py = Math.round(cy + bpts[i][1] * H * 0.5);
        g.fillStyle = sp.accent; g.fillRect(px, py, 2, 2);
      }
    } else if (sp.pattern === 'koi') {
      for (sN = 0; sN < 5; sN++) {
        var kx = x0 + Math.round((0.15 + sN * 0.16) * W);
        var ky = Math.round(cy + Math.sin(sN * 2) * H * 0.22);
        ellipse(g, kx, ky, 2.2 * scale, 1.6 * scale, sN % 2 ? '#e88ab0' : '#6fc8c0');
      }
    } else if (sp.pattern === 'runes') {
      g.fillStyle = sp.accent;
      for (i = 0; i < 4; i++) {
        px = x0 + Math.round(W * (0.25 + i * 0.15));
        py = Math.round(cy);
        g.fillRect(px, py - 2, 1, 4);
        g.fillRect(px - 1, py - 2, 3, 1);
      }
      ring(g, cx, cy, H * 0.62, sp.accent, 0.5 + 0.5 * Math.sin(T * 3));
    }

    // gill line
    g.fillStyle = L(sp.body, '#000000', 0.25);
    for (y = -H * 0.3; y <= H * 0.3; y++) P(g, x0 + Math.round(W * 0.78), cy + y, L(sp.body, '#000000', 0.22));

    // mouth
    P(g, x0 + W - 1, cy + Math.round(H * 0.1), '#3a2a20');
    // eye
    var ex = x0 + Math.round(W * 0.84), ey = cy - Math.round(H * 0.12);
    P(g, ex, ey, '#f8f8f0'); P(g, ex + 1, ey, '#f8f8f0');
    P(g, ex, ey + 1, '#f8f8f0'); P(g, ex, ey, '#1a1a20');
    if (sp.shape === 'ancient' || sp.shape === 'marlin') { g.fillStyle = sp.accent; g.fillRect(ex, ey, 2, 2); }

    // outline-ish top shading
    g.globalAlpha = 0.25;
    for (i = 0; i < W; i++) {
      u = (i + 0.5) / W; half = (H / 2) * fishProfile(u, sp.shape);
      P(g, x0 + i, Math.round(cy - half), '#ffffff');
    }
    g.globalAlpha = 1;
  }

  /* ------------------------------------------------------------- state UI */
  var state = 'ready', t = 0, T = 0;
  var waitDur = 0, BITE_WINDOW = 1.15, CAST_DUR = 0.55, REEL_DUR = 1.0;
  var REVEAL_MIN = 1.2, REVEAL_MAX = 3.9, MISS_DUR = 1.4;
  var firstCast = true;
  var caught = null;
  var catchLog = [];          // newest first, full session
  var target = { x: 200, y: 110 };
  var tipNow = { x: 132, y: 92 };

  var fishing = {
    get state() { return state; },
    pickRarity: pickRarity,
    log: catchLog
  };
  window.fishing = fishing;

  function chooseTarget() {
    target.x = 150 + Math.random() * 88;
    target.y = 88 + Math.random() * 52;
  }
  function setState(s) { state = s; t = 0; }

  function startCast() {
    if (state !== 'ready') return;
    firstCast = false;
    chooseTarget();
    bobState.x = target.x;
    bobState.y = target.y;
    setState('cast');
  }
  function doCatch() {
    // pick rarity through the public object so it can be swapped for testing
    var r = fishing.pickRarity(Math.random());
    if (RARITY_ORDER.indexOf(r) === -1) r = 'Common';
    // pick one of the fish in that tier (independent of the rarity odds)
    var list = SPECIES[r];
    var sp = list[Math.floor(Math.random() * list.length)];
    caught = { name: sp.name, rarity: r, sp: sp };
    catchLog.unshift({ name: sp.name, rarity: r });
  }
  function startReel() {
    if (state !== 'bite') return;
    doCatch();
    burst(bobState.x, bobState.y, 14, [C.foam, '#bfe9ee', C.white], 26);
    ripple(bobState.x, bobState.y);
    setState('reeling');
  }

  function update(dt) {
    T += dt;
    t += dt;
    updateParticles(dt);

    if (state === 'cast') {
      if (t >= CAST_DUR) { waitDur = 1.8 + Math.random() * 1.4; setState('waiting'); ripple(bobState.x, bobState.y); }
    } else if (state === 'waiting') {
      if (t >= waitDur) { setState('bite'); ripple(bobState.x, bobState.y); }
    } else if (state === 'bite') {
      if (t >= BITE_WINDOW) {
        // miss
        burst(bobState.x, bobState.y, 8, ['#bfe9ee', C.white], 14);
        ripple(bobState.x, bobState.y);
        setState('miss');
      }
    } else if (state === 'reeling') {
      if (t >= REEL_DUR) setState('reveal');
    } else if (state === 'reveal') {
      if (t >= REVEAL_MAX) { caught = null; setState('ready'); }
    } else if (state === 'miss') {
      if (t >= MISS_DUR) setState('ready');
    }
  }

  /* ------------------------------------------------------------- rendering */
  function render() {
    sg.clearRect(0, 0, LW, LH);
    sg.drawImage(bg, 0, 0);

    drawWaterDynamic(sg, state, t);
    drawKelp(sg);

    // lily pad frog (subtle blink)
    drawFrog(sg, 34, 82);

    drawCanopies(sg);
    drawReeds(sg);

    tipNow = drawAngler(sg, state, t);

    // bobber and line
    var pos = drawBobber(sg, state, t, tipNow);
    linePx(sg, tipNow.x, tipNow.y, pos.x, pos.y, '#eaf7f3', state === 'reeling' ? 0.95 : 0.8);
    sg.globalAlpha = 0.18;
    linePx(sg, tipNow.x + 1, tipNow.y + 1, pos.x + 1, pos.y + 1, '#00202e');
    sg.globalAlpha = 1;

    // catch / miss cue above bobber
    if (state === 'bite') drawBiteCue(sg, pos, t);
    if (state === 'miss') drawMissCue(sg, pos);

    // leaping fish during reel
    if (state === 'reeling' && caught) {
      var rp = clamp(t / REEL_DUR, 0, 1);
      var fx = lerp(bobState.x, tipNow.x, rp);
      var fy = lerp(bobState.y, tipNow.y, rp) - Math.sin(Math.PI * rp) * 26;
      drawFish(sg, fx, fy, caught.sp, 0.8);
    }

    drawParticles(sg);
    drawForeground(sg);

    // add a soft vignette
    // (kept cheap: corner shading)
    sg.globalAlpha = 0.18; sg.fillStyle = '#04121a';
    sg.fillRect(0, 0, LW, 3); sg.fillRect(0, LH - 3, LW, 3);
    sg.fillRect(0, 0, 3, LH); sg.fillRect(LW - 3, 0, 3, LH);
    sg.globalAlpha = 1;

    // blit to main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scene, 0, 0, canvas.width, canvas.height);

    drawUI();
    if (state === 'reveal' && caught) { drawReveal(); drawActionButton(); }
  }

  function drawFrog(g, x, y) {
    // frog sitting on first lily pad
    var blink = (Math.sin(T * 0.9 + 3) > 0.985) ? 0 : 1;
    ellipse(g, x, y - 2, 3.2, 2.4, '#4e8a3a');
    ellipse(g, x, y - 3, 3, 2, '#63ad55');
    P(g, x - 2, y - 5, '#63ad55'); P(g, x + 1, y - 5, '#63ad55');
    P(g, x - 2, y - 5, blink ? '#111' : '#63ad55');
    P(g, x + 1, y - 5, blink ? '#111' : '#63ad55');
    P(g, x - 1, y - 2, '#2f5520'); P(g, x + 1, y - 2, '#2f5520');
  }

  function drawBiteCue(g, pos, t) {
    var pulse = 0.5 + 0.5 * Math.sin(T * 16);
    // expanding urgency ring around bobber
    var k = clamp(t / BITE_WINDOW, 0, 1);
    ring(g, pos.x, pos.y, 6 + k * 8, '#ffd34a', 0.4 + pulse * 0.5);
    ring(g, pos.x, pos.y, 5 + k * 8, C.white, 0.2 + pulse * 0.3);
    // exclamation
    var ey = pos.y - 12 - Math.abs(Math.sin(T * 10)) * 1;
    g.globalAlpha = 0.9;
    R(g, pos.x - 1, ey - 4, 2, 4, '#ffffff');
    R(g, pos.x - 1, ey + 1, 2, 2, '#ffffff');
    R(g, pos.x - 1, ey - 4, 1, 4, '#ffd34a');
    R(g, pos.x - 1, ey + 1, 1, 2, '#ffd34a');
    g.globalAlpha = 1;
    // splash flecks
    if (pulse > 0.7) {
      P(g, pos.x - 4, pos.y - 3, C.foam); P(g, pos.x + 4, pos.y - 2, C.foam);
      P(g, pos.x, pos.y + 4, C.foam);
    }
  }

  function drawMissCue(g, pos) {
    g.globalAlpha = 0.8;
    R(g, pos.x - 3, pos.y - 10, 6, 1, '#8fa6b0');
    P(g, pos.x - 4, pos.y - 9, '#8fa6b0'); P(g, pos.x + 3, pos.y - 9, '#8fa6b0');
    g.globalAlpha = 1;
  }

  /* ----------------------------------------------------------------- UI */
  function txt(str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = o.font || '13px "Courier New", ui-monospace, monospace';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.shadow) {
      ctx.fillStyle = o.shadow;
      ctx.fillText(str, x + (o.shadowOff || 1), y + (o.shadowOff || 1));
    }
    ctx.fillStyle = o.color || '#eef6f7';
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function panel(x, y, w, h, fill, stroke, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 5); ctx.stroke(); }
    ctx.restore();
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  var button = { x: 246, y: 148, w: 70, h: 26 }; // logical
  function buttonLabel() {
    if (state === 'ready') return 'CAST';
    if (state === 'waiting') return 'WAIT';
    if (state === 'bite') return 'REEL!';
    if (state === 'reeling') return '...';
    if (state === 'reveal') return 'NEXT';
    return '...';
  }

  function drawUI() {
    // ---- instruction / prompt (top center, transient) ----
    var msg = '', color = '#eef6f7';
    if (state === 'ready') { msg = firstCast ? 'SPACE or click CAST to cast your line' : 'Cast again when ready'; }
    else if (state === 'cast') { msg = 'Casting...'; }
    else if (state === 'waiting') { msg = 'Waiting for a bite...'; color = '#bfe0ea'; }
    else if (state === 'bite') { msg = 'BITE!  Press SPACE / REEL now!'; color = '#ffd34a'; }
    else if (state === 'reeling') { msg = 'Reeling it in!'; color = '#cfeef0'; }
    else if (state === 'miss') { msg = 'It slipped away...'; color = '#9fb0b8'; }

    if (msg) {
      ctx.save();
      ctx.font = 'bold 15px "Courier New", ui-monospace, monospace';
      var w = ctx.measureText(msg).width;
      panel((640 - w / 2) - 14, 12, w + 28, 30, 'rgba(7,20,27,0.66)', 'rgba(120,170,180,0.35)', 1);
      txt(msg, 640, 33, { align: 'center', font: 'bold 15px "Courier New", ui-monospace, monospace', color: color, shadow: 'rgba(0,0,0,0.7)' });
      ctx.restore();
    }

    // ---- catch log (bottom-left) ----
    var entries = catchLog.slice(0, 8);
    var lineH = 16;
    var panelH = 30 + Math.max(1, entries.length) * lineH + 6;
    var logTop = 710 - panelH;
    panel(10, logTop, 372, panelH, 'rgba(7,20,27,0.74)', 'rgba(120,170,180,0.32)');
    var top = logTop + 20;
    txt('CATCH LOG', 22, top, { font: 'bold 12px "Courier New", ui-monospace, monospace', color: '#7fd0c0' });
    txt(entries.length ? '' : 'nothing yet - get fishing!', 22, top + 18, { font: '12px "Courier New", ui-monospace, monospace', color: '#6d8790' });
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var y = top + 18 + i * lineH;
      var col = RARITY_COLOR[e.rarity] || '#fff';
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(26, y - 4, 4, 0, 6.3); ctx.fill();
      var label = (i + 1) + '. ' + e.name;
      txt(label, 36, y, { font: '12px "Courier New", ui-monospace, monospace', color: '#e7f1f2' });
      txt(e.rarity, 372 - 12, y, { align: 'right', font: 'bold 11px "Courier New", ui-monospace, monospace', color: col });
    }

    // ---- legend (bottom center strip) ----
    var lx = 404, ly = 701;
    txt('ODDS', lx, ly, { font: 'bold 11px "Courier New", ui-monospace, monospace', color: '#7fd0c0' });
    var cursor = lx + ctx.measureText('ODDS').width + 22;
    for (i = 0; i < LEGEND.length; i++) {
      var it = LEGEND[i];
      ctx.fillStyle = RARITY_COLOR[it[0]];
      ctx.beginPath(); ctx.arc(cursor, ly - 4, 4, 0, 6.3); ctx.fill();
      txt(it[0], cursor + 8, ly, { font: '11px "Courier New", ui-monospace, monospace', color: '#cfdde0' });
      var nw = ctx.measureText(it[0]).width;
      txt(it[1], cursor + 8 + nw + 6, ly, { font: 'bold 11px "Courier New", ui-monospace, monospace', color: '#9fb0b8' });
      cursor += 8 + nw + 6 + ctx.measureText(it[1]).width + 18;
    }

    // ---- action button ----
    drawActionButton();
  }

  function drawActionButton() {
    var bxp = button.x * S, byp = button.y * S, bw = button.w * S, bh = button.h * S;
    var ready = state === 'ready' || state === 'bite' || state === 'reveal';
    var pulse = state === 'bite' ? 0.5 + 0.5 * Math.sin(T * 14) : 0;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    var grad = ctx.createLinearGradient(0, byp, 0, byp + bh);
    if (state === 'bite') {
      grad.addColorStop(0, '#ffd45a'); grad.addColorStop(1, '#e0641e');
    } else if (state === 'ready' || state === 'reveal') {
      grad.addColorStop(0, '#f2c86a'); grad.addColorStop(1, '#bf8428');
    } else {
      grad.addColorStop(0, '#4a5f68'); grad.addColorStop(1, '#2f4149');
    }
    ctx.fillStyle = grad;
    roundRect(ctx, bxp, byp, bw, bh, 10); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3;
    ctx.strokeStyle = state === 'bite' ? 'rgba(255,255,255,' + (0.4 + pulse * 0.5) + ')' : 'rgba(255,244,214,0.45)';
    roundRect(ctx, bxp + 1.5, byp + 1.5, bw - 3, bh - 3, 9); ctx.stroke();
    txt(buttonLabel(), bxp + bw / 2, byp + bh / 2 + 7, {
      align: 'center', font: 'bold 20px "Courier New", ui-monospace, monospace',
      color: state === 'bite' ? '#3a1a00' : (ready ? '#2a1a06' : '#c3d2d6'), shadow: 'rgba(255,255,255,0.25)'
    });
    ctx.restore();

    // bite window bar just above button
    if (state === 'bite') {
      var k = 1 - clamp(t / BITE_WINDOW, 0, 1);
      var barW = bw, barH = 7;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, bxp, byp - 14, barW, barH, 3); ctx.fill();
      ctx.fillStyle = k > 0.35 ? '#6fe06f' : '#ff5a5a';
      roundRect(ctx, bxp + 1, byp - 13, Math.max(2, (barW - 2) * k), barH - 2, 2); ctx.fill();
    }
  }

  /* ----------------------------------------------------------- reveal art */
  function drawReveal() {
    var g = ctx;
    var rarity = caught.rarity;
    g.save();
    g.fillStyle = 'rgba(4,11,15,0.62)';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.restore();

    var cx = 640, cy = 360;
    var cardW = 520, cardH = 320;
    var x = cx - cardW / 2, y = cy - cardH / 2;

    drawRarityFx(g, rarity, cx, cy, t);

    // card background
    g.save();
    var bgc = rarity === 'Ancient' ? '#141d24' : (rarity === 'Legendary' ? '#241d10' : '#111c24');
    g.fillStyle = bgc;
    roundRect(g, x, y, cardW, cardH, 12); g.fill();
    // inner panel
    g.fillStyle = 'rgba(255,255,255,0.03)';
    roundRect(g, x + 6, y + 6, cardW - 12, cardH - 12, 9); g.fill();
    g.restore();

    // border treatment
    var bcol = RARITY_COLOR[rarity];
    g.save();
    g.lineWidth = 4; g.strokeStyle = bcol;
    roundRect(g, x + 3, y + 3, cardW - 6, cardH - 6, 11); g.stroke();
    if (rarity === 'Uncommon' || rarity === 'Rare' || rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Ancient') {
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.25)';
      roundRect(g, x + 9, y + 9, cardW - 18, cardH - 18, 8); g.stroke();
    }
    g.restore();

    if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Ancient') drawCornerBrackets(g, x, y, cardW, cardH, bcol, rarity);

    // fish
    g.save();
    var targetLen = rarity === 'Ancient' ? 52 : (rarity === 'Legendary' ? 50 : 46);
    var fs2 = targetLen / caught.sp.len;
    g.translate(cx, y + 116);
    g.scale(S, S);
    drawFish(g, 0, 0, caught.sp, fs2);
    g.restore();

    // labels
    txt('YOU CAUGHT', cx, y + 32, { align: 'center', font: 'bold 14px "Courier New", ui-monospace, monospace', color: '#7fa6b0' });

    var nameCol = '#f4fbfb';
    if (rarity === 'Legendary') nameCol = '#ffe9a8';
    if (rarity === 'Ancient') nameCol = '#a8fff0';
    txt(caught.name, cx, y + 200, { align: 'center', font: 'bold 28px "Courier New", ui-monospace, monospace', color: nameCol, shadow: 'rgba(0,0,0,0.8)', shadowOff: 2 });

    // rarity banner
    var rw = 220, rh = 42, rx = cx - rw / 2, ry = y + 220;
    g.save();
    g.fillStyle = bcol;
    g.globalAlpha = 0.18; roundRect(g, rx, ry, rw, rh, 8); g.fill(); g.globalAlpha = 1;
    g.lineWidth = 2; g.strokeStyle = bcol; roundRect(g, rx, ry, rw, rh, 8); g.stroke();
    g.restore();
    txt(rarity.toUpperCase(), cx, ry + 29, { align: 'center', font: 'bold 20px "Courier New", ui-monospace, monospace', color: bcol, shadow: 'rgba(0,0,0,0.6)' });

    txt(rarityFlavor(rarity), cx, y + cardH - 18, { align: 'center', font: '12px "Courier New", ui-monospace, monospace', color: '#8aa3ab' });

    // dismiss hint
    if (t > 0.7) {
      var a = 0.5 + 0.5 * Math.sin(T * 4);
      g.globalAlpha = a;
      txt('SPACE / NEXT to continue', cx, y + cardH + 24, { align: 'center', font: '12px "Courier New", ui-monospace, monospace', color: '#cfeef0' });
      g.globalAlpha = 1;
    }
  }

  function rarityFlavor(r) {
    switch (r) {
      case 'Common': return 'A reliable catch.';
      case 'Uncommon': return 'A little rarer than most.';
      case 'Rare': return 'Shimmering and hard to find.';
      case 'Epic': return 'A trophy of the deep!';
      case 'Legendary': return 'The stories were true!';
      case 'Ancient': return 'It remembers older tides...';
    }
    return '';
  }

  function drawCornerBrackets(g, x, y, w, h, col, rarity) {
    var len = rarity === 'Ancient' ? 26 : 20;
    g.save();
    g.strokeStyle = col; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 10, y + 10 + len); g.lineTo(x + 10, y + 10); g.lineTo(x + 10 + len, y + 10);
    g.moveTo(x + w - 10 - len, y + 10); g.lineTo(x + w - 10, y + 10); g.lineTo(x + w - 10, y + 10 + len);
    g.moveTo(x + w - 10, y + h - 10 - len); g.lineTo(x + w - 10, y + h - 10); g.lineTo(x + w - 10 - len, y + h - 10);
    g.moveTo(x + 10 + len, y + h - 10); g.lineTo(x + 10, y + h - 10); g.lineTo(x + 10, y + h - 10 - len);
    g.stroke();
    g.restore();
  }

  function drawRarityFx(g, rarity, cx, cy, t) {
    if (rarity === 'Common') return;
    g.save();
    var col = RARITY_COLOR[rarity];
    if (rarity === 'Uncommon') {
      // soft leaf corners
      g.globalAlpha = 0.5;
      for (var i = 0; i < 4; i++) {
        var ang = Math.PI / 4 + i * Math.PI / 2 + Math.sin(T + i) * 0.05;
        var dx = Math.cos(ang) * 300, dy = Math.sin(ang) * 210;
        g.fillStyle = col; g.beginPath(); g.arc(cx + dx, cy + dy, 6, 0, 6.3); g.fill();
      }
      g.globalAlpha = 1;
    } else if (rarity === 'Rare') {
      for (var s = 0; s < 22; s++) {
        var sx = cx + Math.sin(s * 12.9) * 240;
        var sy = cy + Math.cos(s * 7.3) * 170;
        var tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(T * 3 + s));
        g.globalAlpha = tw;
        g.fillStyle = '#bfe4ff';
        g.fillRect(sx, sy, 2, 2); g.fillRect(sx - 1, sy + 1, 1, 1); g.fillRect(sx + 2, sy + 1, 1, 1);
      }
      g.globalAlpha = 1;
    } else if (rarity === 'Epic' || rarity === 'Legendary') {
      var n = rarity === 'Legendary' ? 16 : 11;
      var wide = rarity === 'Legendary' ? 1.15 : 1;
      for (var r = 0; r < n; r++) {
        var a = r / n * Math.PI * 2 + T * (rarity === 'Legendary' ? 0.5 : 0.3);
        var glow = rarity === 'Legendary' ? 'rgba(240,185,60,0.13)' : 'rgba(180,114,232,0.12)';
        g.fillStyle = glow;
        tri(g, cx, cy, cx + Math.cos(a - 0.09) * 520 * wide, cy + Math.sin(a - 0.09) * 360 * wide, cx + Math.cos(a + 0.09) * 520 * wide, cy + Math.sin(a + 0.09) * 360 * wide, glow);
      }
      // orbiting motes
      for (var m = 0; m < 18; m++) {
        var ma = m * 2.1 + T * 0.9;
        var mr = 240 + 40 * Math.sin(m * 3 + T);
        var mx = cx + Math.cos(ma) * mr, my = cy + Math.sin(ma) * mr * 0.7;
        g.globalAlpha = 0.6 + 0.4 * Math.sin(T * 4 + m);
        g.fillStyle = rarity === 'Legendary' ? '#ffe38a' : '#d9a8ff';
        g.fillRect(mx, my, 2, 2);
      }
      g.globalAlpha = 1;
      if (rarity === 'Legendary') {
        // banner glow
        g.globalAlpha = 0.5 + 0.3 * Math.sin(T * 5);
        g.fillStyle = '#f0b93c';
        roundRect(g, cx - 190, cy - 210, 380, 28, 6); g.fill();
        g.globalAlpha = 1;
        txt('LEGENDARY CATCH', cx, cy - 190, { align: 'center', font: 'bold 18px "Courier New", ui-monospace, monospace', color: '#3a2600' });
      }
    } else if (rarity === 'Ancient') {
      // rotating rune rings
      for (var ring_i = 0; ring_i < 3; ring_i++) {
        var rr = 230 + ring_i * 34;
        var dir = ring_i % 2 ? -1 : 1;
        var steps = 64;
        g.globalAlpha = 0.5 - ring_i * 0.1;
        g.fillStyle = '#3fd8c8';
        for (var si = 0; si < steps; si++) {
          if (si % 3 !== 0) continue;
          var aa = si / steps * Math.PI * 2 + T * 0.25 * dir * (1 + ring_i * 0.3);
          g.fillRect(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr * 0.72, 2, 2);
        }
      }
      // glyphs
      g.globalAlpha = 0.75;
      g.fillStyle = '#f0c46a';
      for (var gi = 0; gi < 10; gi++) {
        var ga = gi / 10 * Math.PI * 2 - T * 0.35;
        var gx = cx + Math.cos(ga) * 300, gy = cy + Math.sin(ga) * 210;
        g.fillRect(gx, gy, 3, 3); g.fillRect(gx - 2, gy + 3, 7, 1);
      }
      g.globalAlpha = 1;
      // central glow slowly pulsing
      g.globalAlpha = 0.10 + 0.06 * Math.sin(T * 1.4);
      g.fillStyle = '#7ffff0';
      g.beginPath(); g.arc(cx, cy, 250, 0, 6.3); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  /* ------------------------------------------------------------- controls */
  function action() {
    if (state === 'ready') startCast();
    else if (state === 'bite') startReel();
    else if (state === 'reveal' && t >= REVEAL_MIN) { caught = null; setState('ready'); }
  }
  function screenToLogical(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / (r.width) * LW,
      y: (clientY - r.top) / (r.height) * LH
    };
  }
  function hitButton(clientX, clientY) {
    var p = screenToLogical(clientX, clientY);
    var pad = 4;
    return p.x >= button.x - pad && p.x <= button.x + button.w + pad &&
           p.y >= button.y - pad && p.y <= button.y + button.h + pad;
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      action();
    }
  }, { passive: false });

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (hitButton(e.clientX, e.clientY)) action();
  });

  // touch fallback
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length) {
      e.preventDefault();
      if (hitButton(e.touches[0].clientX, e.touches[0].clientY)) action();
    }
  }, { passive: false });

  /* -------------------------------------------------------------- resize */
  function resize() {
    var maxW = window.innerWidth, maxH = window.innerHeight;
    var scale = Math.min(maxW / LW, maxH / LH);
    scale = Math.max(1, Math.floor(scale));
    // Prefer exact x4 when it fits (target viewport)
    canvas.style.width = (LW * scale) + 'px';
    canvas.style.height = (LH * scale) + 'px';
  }
  window.addEventListener('resize', resize);

  /* ---------------------------------------------------------- main loop */
  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = (now - last) / 1000;
    last = now;
    if (document.hidden) { return; }          // timers pause while hidden
    if (dt > 0.12) dt = 0.12;                 // avoid huge jumps
    update(dt);
    render();
  }
  document.addEventListener('visibilitychange', function () {
    last = performance.now();
  });

  /* --------------------------------------------------------------- init */
  buildBackground();
  chooseTarget();
  bobState.x = target.x; bobState.y = target.y;
  resize();
  requestAnimationFrame(frame);
})();
