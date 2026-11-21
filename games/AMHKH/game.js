/* ==========================================================================
   TIDEBELL COVE
   An original top-down pixel-art fishing game. All artwork is drawn in code.
   Logical scene: 320x180, blitted 4x nearest-neighbour to 1280x720.
   ========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------- canvas
  var W = 320, H = 180, S = 4;
  var SW = W * S, SH = H * S;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var scene = document.createElement('canvas');
  scene.width = W; scene.height = H;
  var g = scene.getContext('2d');
  g.imageSmoothingEnabled = false;

  var castBtn = document.getElementById('castBtn');

  // ---------------------------------------------------------------- utils
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function parse(str) {
    if (str[0] === '#') {
      str = str.slice(1);
      if (str.length === 3) str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
      var n = parseInt(str, 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    var m = str.match(/\d+/g);
    return [ +m[0], +m[1], +m[2] ];
  }
  function mix(a, b, t) {
    var A = parse(a), B = parse(b);
    return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')';
  }
  function shade(hex, amt) {
    var A = parse(hex), f = amt < 0 ? 0 : 255, t = Math.abs(amt);
    return 'rgb(' + Math.round(lerp(A[0], f, t)) + ',' + Math.round(lerp(A[1], f, t)) + ',' + Math.round(lerp(A[2], f, t)) + ')';
  }
  function rgba(hex, a) { var A = parse(hex); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }

  function fillEllipse(c, cx, cy, rx, ry, color) {
    c.fillStyle = color;
    for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      var t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      var w = Math.floor(rx * Math.sqrt(t));
      c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  }
  function fillTri(c, x0, y0, x1, y1, x2, y2, color) {
    c.fillStyle = color;
    var minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    for (var y = minY; y <= maxY; y++) {
      var xs = [];
      var E = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
      for (var i = 0; i < 3; i++) {
        var ax = E[i][0], ay = E[i][1], bx = E[i][2], by = E[i][3];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (bx - ax) * ((y - ay) / (by - ay)));
      }
      if (xs.length < 2) continue;
      xs.sort(function (a, b) { return a - b; });
      var L = Math.round(xs[0]), R = Math.round(xs[xs.length - 1]);
      c.fillRect(L, y, R - L + 1, 1);
    }
  }
  // crisp 1px line (Bresenham) so strokes stay hard-edged pixel art
  function plotLine(c, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    c.fillStyle = color;
    for (;;) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function plotCurve(c, x0, y0, cx, cy, x1, y1, color, thick) {
    var steps = 36, px = x0, py = y0;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps, mt = 1 - t;
      var x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      var y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      plotLine(c, px, py, x, y, color);
      if (thick) plotLine(c, px, py + 1, x, y + 1, color);
      px = x; py = y;
    }
  }

  // simple filled polygon (scanline)
  function fillPoly(c, pts, color) {
    c.fillStyle = color;
    var minY = 1e9, maxY = -1e9;
    for (var i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var xs = [];
      for (var j = 0; j < pts.length; j++) {
        var A = pts[j], B = pts[(j + 1) % pts.length];
        if ((A[1] <= y && B[1] > y) || (B[1] <= y && A[1] > y)) {
          xs.push(A[0] + (B[0] - A[0]) * ((y - A[1]) / (B[1] - A[1])));
        }
      }
      if (xs.length < 2) continue;
      xs.sort(function (a, b) { return a - b; });
      c.fillRect(Math.round(xs[0]), y, Math.round(xs[xs.length - 1]) - Math.round(xs[0]) + 1, 1);
    }
  }

  // ---------------------------------------------------------------- species
  // Original fish names & designs.
  var SPECIES = [
    { id: 'sunbell', name: 'Sunbell Minnow', rarity: 'Common', len: 15, h: 7,
      body: '#f0b93c', belly: '#ffe9a8', fin: '#d97e2a', accent: '#fff2c0',
      pattern: 'spots', tail: 'fan', dorsal: 'small', outline: '#3a2410' },
    { id: 'mudskip', name: 'Mudskip Smelt', rarity: 'Common', len: 18, h: 6,
      body: '#8f7f5c', belly: '#d6c79a', fin: '#6b5c3c', accent: '#b8a679',
      pattern: null, tail: 'fork', dorsal: 'small', outline: '#241a10' },
    { id: 'copperfin', name: 'Copperfin Dace', rarity: 'Common', len: 17, h: 7,
      body: '#c87742', belly: '#eec08c', fin: '#a3552a', accent: '#e8a860',
      pattern: 'stripes', tail: 'fan', dorsal: 'small', outline: '#2e1608' },

    { id: 'reedwhisker', name: 'Reedwhisker', rarity: 'Uncommon', len: 19, h: 8,
      body: '#6fb057', belly: '#d3e8a4', fin: '#4a8c38', accent: '#c9e878', whisker: true,
      pattern: 'spots', tail: 'fan', dorsal: 'small', outline: '#17300f' },
    { id: 'mistveil', name: 'Mistveil Trout', rarity: 'Uncommon', len: 21, h: 8,
      body: '#7fa6bd', belly: '#e2eff2', fin: '#5a86a0', accent: '#f2a6c0',
      pattern: 'speckle', tail: 'fork', dorsal: 'small', outline: '#1b2c38' },

    { id: 'emeraldpike', name: 'Emerald Pike', rarity: 'Rare', len: 25, h: 8,
      body: '#2f9a6c', belly: '#b6e8c6', fin: '#1c6a48', accent: '#8ef0b0',
      pattern: 'stripes', tail: 'fan', dorsal: 'sail', outline: '#0c2a1c' },
    { id: 'sapphire', name: 'Sapphire Grunt', rarity: 'Rare', len: 18, h: 11,
      body: '#3a72c8', belly: '#b4cdf4', fin: '#2a4f9a', accent: '#8fc4ff',
      pattern: 'bands', tail: 'fan', dorsal: 'small', outline: '#101c3a' },

    { id: 'emberkoi', name: 'Emberfin Koi', rarity: 'Epic', len: 22, h: 11,
      body: '#f3f0e6', belly: '#ffffff', fin: '#e0432a', accent: '#e8832f', glow: '#ffb060',
      pattern: 'koi', tail: 'fan', dorsal: 'small', outline: '#3a1a10' },
    { id: 'glimmerray', name: 'Glimmer Ray', rarity: 'Epic', len: 27, h: 19, special: 'ray',
      body: '#8a6fc6', belly: '#d8c8ff', fin: '#b79df0', accent: '#f0e6ff', glow: '#c9a8ff',
      pattern: 'spots', outline: '#241640' },

    { id: 'arowana', name: 'Crownscale Arowana', rarity: 'Legendary', len: 27, h: 10,
      body: '#e6b039', belly: '#ffeeb0', fin: '#b0781c', accent: '#fff4c8', glow: '#ffd060',
      pattern: 'scales', tail: 'fan', dorsal: 'sail', outline: '#3a2604' },

    { id: 'tidewyrm', name: 'Elder Tidewyrm', rarity: 'Ancient', len: 36, h: 12, special: 'wyrm',
      body: '#4157b0', belly: '#b6caff', fin: '#6f8bec', accent: '#c8f0ff', glow: '#7fe0ff',
      pattern: 'scales', outline: '#0a1030' }
  ];
  function speciesById(id) { for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i]; return null; }

  var RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  var RARITY_COLOR = {
    Common: '#c3ccd4', Uncommon: '#6fd06a', Rare: '#54a8ff',
    Epic: '#c07dff', Legendary: '#ffb63a', Ancient: '#4fe6d8'
  };

  // ---------------------------------------------------------------- patterns
  function patternAt(sp, x, y, rx, ry) {
    var p = sp.pattern;
    if (!p) return null;
    var ax = x + rx;
    if (p === 'stripes') { return (Math.floor(ax / 3.5) % 2 === 0) ? sp.accent : null; }
    if (p === 'bands') { return (Math.floor(ax / 5) % 2 === 0) ? sp.accent : null; }
    if (p === 'spots') { return hash((x + 12) * 13.1 + (y + 9) * 7.7) > 0.80 ? sp.accent : null; }
    if (p === 'speckle') { return hash((x + 3) * 9.3 + (y + 5) * 4.1) > 0.58 ? sp.accent : null; }
    if (p === 'koi') {
      var n = Math.sin((x + rx) * 0.55) + Math.sin((y + ry) * 1.05 + 1.3) + hash(Math.floor((x + rx) / 4) * 7 + Math.floor((y + ry) / 3)) * 1.4;
      return n > 1.25 ? sp.accent : null;
    }
    if (p === 'scales') { return (((x + 64) + (y + 64)) % 4 === 0 || ((x + 64) - (y + 64)) % 4 === 0) ? shade(sp.body, -0.28) : null; }
    return null;
  }

  // ---------------------------------------------------------------- fish art
  function drawRegularFish(c, sp, ph, silhouette) {
    var len = sp.len, h = sp.h, rx = len / 2, ry = h / 2;
    var wig = Math.round(Math.sin(ph) * 1.0);
    var col = function (x) { return silhouette || x; };
    var outline = col(sp.outline);

    if (sp.glow && !silhouette) fillEllipse(c, 0, 0, rx + 3, ry + 3, rgba(sp.glow, 0.30));
    fillEllipse(c, 0, 0, rx + 1, ry + 1, outline);

    var tx = -rx + 1;
    var tl = Math.max(4, Math.round(len * 0.30));
    if (sp.tail === 'fork') {
      fillTri(c, tx, 0, tx - tl, -ry - 1 + wig, tx - tl * 0.5, 0 + wig, col(sp.fin));
      fillTri(c, tx, 0, tx - tl, ry + 1 + wig, tx - tl * 0.5, 0 + wig, col(sp.fin));
    } else {
      fillTri(c, tx, 0, tx - tl, -ry - 1 + wig, tx - tl, ry + 1 + wig, col(sp.fin));
      fillTri(c, tx - 1, 0, tx - tl, -ry * 0.5 + wig, tx - tl, ry * 0.5 + wig, col(shade2(col(sp.fin), silhouette)));
    }

    if (sp.dorsal === 'sail') {
      fillTri(c, -rx * 0.40, -ry + 1, rx * 0.10, -ry - 4, rx * 0.06, -ry + 1, col(sp.fin));
    } else {
      fillTri(c, -rx * 0.25, -ry + 1, -rx * 0.02, -ry - 2, rx * 0.12, -ry + 1, col(sp.fin));
    }

    var rows = [];
    for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      var ny = y / ry;
      if (ny > 0.25) rows[y + ry] = mix(sp.body, sp.belly, (ny - 0.25) / 0.75);
      else rows[y + ry] = mix(sp.body, shade(sp.body, -0.20), (0.25 - ny) / 1.25 * 0.9);
    }
    for (var yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) {
      var t = 1 - (yy * yy) / (ry * ry); if (t < 0) continue;
      var w = Math.floor(rx * Math.sqrt(t));
      for (var x = -w; x <= w; x++) {
        var pt = patternAt(sp, x, yy, rx, ry);
        c.fillStyle = col(pt || rows[yy + ry]);
        c.fillRect(x, yy, 1, 1);
      }
    }

    fillTri(c, rx * 0.02, -ry * 0.1, rx * 0.02 + 4, ry * 0.15, rx * 0.02 + 1, ry * 0.75, col(sp.fin));

    if (!silhouette) {
      var ex = Math.round(rx * 0.42), ey = Math.round(-ry * 0.30);
      c.fillStyle = '#ffffff'; c.fillRect(ex, ey, 2, 2);
      c.fillStyle = '#20242e'; c.fillRect(ex + 1, ey, 1, 1);
      c.fillStyle = shade(sp.body, -0.4); c.fillRect(Math.round(rx) - 1, Math.round(ry * 0.25), 2, 1);
    }
    if (sp.whisker) {
      c.fillStyle = col(sp.accent);
      c.fillRect(Math.round(rx), Math.round(ry * 0.30), 3, 1);
      c.fillRect(Math.round(rx) + 3, Math.round(ry * 0.30) + 1, 2, 1);
      c.fillRect(Math.round(rx), Math.round(ry * 0.55), 3, 1);
    }
  }
  function shade2(color, silhouette) { if (silhouette) return silhouette; return color; }

  function drawRay(c, sp, ph, silhouette) {
    var len = sp.len, h = sp.h, rx = len / 2, ry = h / 2;
    var flat = Math.sin(ph) * 1.2;
    var col = function (x) { return silhouette || x; };
    if (sp.glow && !silhouette) fillEllipse(c, 0, 0, rx + 3, ry + 3, rgba(sp.glow, 0.28));
    // long whip tail
    var steps = 12;
    for (var i = 0; i < steps; i++) {
      var u = i / steps;
      var x = -rx - u * (len * 0.55);
      var y = Math.sin(ph * 1.5 + u * 3) * (1 + u * 2) + 2;
      c.fillStyle = col(i === 0 ? sp.fin : mix(sp.fin, sp.body, u));
      c.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // diamond wings
    for (var yy = -Math.floor(ry); yy <= Math.floor(ry); yy++) {
      var t = 1 - Math.abs(yy) / (ry + 0.5);
      var w = Math.floor(rx * t * (1 + flat * 0.06 * Math.sign(yy)));
      if (w < 0) continue;
      for (var x2 = -w; x2 <= w; x2++) {
        var edge = Math.abs(x2) / (w + 0.001);
        var base;
        if (edge > 0.72) base = sp.fin;
        else if (yy > 0) base = mix(sp.body, sp.belly, Math.abs(yy) / ry);
        else base = mix(sp.body, shade(sp.body, -0.18), Math.abs(yy) / ry);
        var pt = patternAt(sp, x2, yy, w, ry);
        c.fillStyle = col(pt || base);
        c.fillRect(x2, yy, 1, 1);
      }
    }
    // outline-ish ridge
    c.fillStyle = col(sp.outline);
    for (var xx = -rx; xx <= rx; xx++) {
      var top = -Math.floor(ry * (1 - Math.abs(xx) / rx));
      c.fillRect(xx, top, 1, 1);
    }
    if (!silhouette) {
      c.fillStyle = '#ffffff'; c.fillRect(Math.round(rx * 0.45), -2, 2, 2);
      c.fillStyle = '#20242e'; c.fillRect(Math.round(rx * 0.45) + 1, -2, 1, 1);
      c.fillRect(Math.round(rx * 0.45), 1, 2, 2);
    }
  }

  function drawWyrm(c, sp, ph, silhouette) {
    var len = sp.len, h = sp.h, rx = len / 2, ry = h / 2;
    var col = function (x) { return silhouette || x; };
    var N = 30, xs = [], ys = [], rs = [];
    for (var i = 0; i <= N; i++) {
      var u = i / N;
      var x = rx - u * len;
      var y = Math.sin(ph * 1.4 + u * 4.8) * (1.6 + u * 4.4);
      var r = Math.max(1, ry * (0.30 + 0.55 * (1 - u)));
      xs.push(x); ys.push(y); rs.push(r);
    }
    function ribbon(extra) {
      var top = [], bot = [];
      for (var k = 0; k <= N; k++) { top.push([xs[k], ys[k] - rs[k] - extra]); bot.push([xs[k], ys[k] + rs[k] + extra]); }
      bot.reverse();
      return top.concat(bot);
    }
    if (sp.glow && !silhouette) fillPoly(c, ribbon(2.2), rgba(sp.glow, 0.24));
    fillPoly(c, ribbon(0.9), col(sp.outline));
    fillPoly(c, ribbon(0), col(sp.body));
    // belly + scale marks + back fin
    for (var j = 0; j <= N; j++) {
      var xr = Math.round(xs[j]), yr = Math.round(ys[j]), rr = rs[j];
      c.fillStyle = col(mix(sp.body, sp.belly, 0.78));
      c.fillRect(xr, Math.round(yr + rr * 0.35), 1, Math.max(1, Math.round(rr * 0.65)));
      if (!silhouette && j % 2 === 0 && j > 1 && j < N - 1) {
        c.fillStyle = col(sp.accent);
        c.fillRect(xr, Math.round(yr - rr * 0.4), 1, 1);
      }
      if (j % 3 === 0 && j > 2 && j < N - 2) {
        c.fillStyle = col(sp.fin);
        c.fillRect(xr, Math.round(yr - rr - 2), 1, 2);
        c.fillRect(xr + 1, Math.round(yr - rr - 1), 1, 1);
      }
    }
    // head at right end
    var hx = xs[0], hy = ys[0], hr = rs[0];
    if (sp.glow && !silhouette) fillEllipse(c, hx, hy, hr * 1.4 + 2, hr + 2, rgba(sp.glow, 0.28));
    fillEllipse(c, hx, hy, hr * 1.4 + 1, hr + 1, col(sp.outline));
    fillEllipse(c, hx, hy, hr * 1.35, hr, col(sp.body));
    // jaw
    c.fillStyle = col(sp.fin);
    c.fillRect(Math.round(hx + hr * 1.1), Math.round(hy), Math.round(hr * 0.9), 2);
    // horns
    c.fillStyle = col(sp.accent);
    c.fillRect(Math.round(hx - 1), Math.round(hy - hr - 4), 1, 4);
    c.fillRect(Math.round(hx + 2), Math.round(hy - hr - 3), 1, 3);
    // whiskers
    c.fillStyle = col(sp.accent);
    c.fillRect(Math.round(hx + hr * 1.6), Math.round(hy + 1), 4, 1);
    c.fillRect(Math.round(hx + hr * 1.6), Math.round(hy - 1), 4, 1);
    if (!silhouette) {
      c.fillStyle = '#eaffff'; c.fillRect(Math.round(hx + 1), Math.round(hy - 2), 2, 2);
      c.fillStyle = '#101828'; c.fillRect(Math.round(hx + 2), Math.round(hy - 1), 1, 1);
    }
  }

  // ---------------------------------------------------------------- sprites
  var FRAMES = 8;
  var spriteCache = {};
  function renderFishFrame(sp, f) {
    var ph = (f / FRAMES) * Math.PI * 2;
    var pad = 12;
    var cw, ch;
    if (sp.special === 'ray') { cw = sp.len + 34; ch = sp.h + 18; }
    else if (sp.special === 'wyrm') { cw = sp.len + 26; ch = sp.h + 20; }
    else { cw = sp.len + 22; ch = Math.max(sp.h + 16, 22); }
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.setTransform(1, 0, 0, 1, Math.floor(cw / 2), Math.floor(ch / 2));
    if (sp.special === 'ray') drawRay(c, sp, ph, null);
    else if (sp.special === 'wyrm') drawWyrm(c, sp, ph, null);
    else drawRegularFish(c, sp, ph, null);
    return cv;
  }
  function buildSprites() {
    for (var i = 0; i < SPECIES.length; i++) {
      var sp = SPECIES[i], arr = [];
      for (var f = 0; f < FRAMES; f++) arr.push(renderFishFrame(sp, f));
      spriteCache[sp.id] = arr;
    }
  }
  function drawSprite(c, sp, cx, cy, scale, frameT) {
    var arr = spriteCache[sp.id];
    var f = Math.floor(((frameT % 1) + 1) % 1 * FRAMES) % FRAMES;
    var s = arr[f];
    c.imageSmoothingEnabled = false;
    var w = Math.round(s.width * scale), h = Math.round(s.height * scale);
    c.drawImage(s, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  }

  // ---------------------------------------------------------------- palette
  var P = {
    skyTop: '#5e93c4', skyMid: '#9cc9dd', skyHorizon: '#f4dda9',
    sun: '#fff3cf', sunGlow: '#ffe6a0',
    cloud: '#f6f1e6', cloudShade: '#d9dcea',
    farIsland: '#7ba0b4', farIsland2: '#8fb4c2',
    seaFar: '#6fa8c6', seaMid: '#3880ac', seaNear: '#1f5a8c',
    seaSpark: '#bfe8f0', seaDeep: '#164a76',
    sand: '#e8d09a', sandDark: '#c9ab6e', sandEdge: '#b8935a',
    grass: '#4f8f3c', grassDark: '#3a6e2c', grassLite: '#6fb24a',
    rock: '#7d8791', rockDark: '#525c68', rockLite: '#a7b0b8',
    wood: '#a9743f', woodDark: '#7c4f27', woodLite: '#c99355', woodEdge: '#5a3a1c',
    leaf: '#3f7a35', leafDark: '#2c5a26', leafLite: '#5fa044', trunk: '#7a5a38',
    shirt: '#c85a4a', shirtDark: '#9c3f34', pants: '#46618c', pantsDark: '#33496b',
    skin: '#e6b088', skinDark: '#c98a63', hair: '#6a4326', hat: '#e8c96a',
    hatDark: '#c39b3f', hatBand: '#b0543a', boot: '#4a3524'
  };

  // ---------------------------------------------------------------- scene
  function drawSky(c, T) {
    for (var y = 0; y < 46; y++) {
      var t = y / 46;
      var col;
      if (t < 0.55) col = mix(P.skyTop, P.skyMid, t / 0.55);
      else col = mix(P.skyMid, P.skyHorizon, (t - 0.55) / 0.45);
      c.fillStyle = col;
      c.fillRect(0, y, W, 1);
    }
    // sun + glow
    var sx = 252, sy = 20;
    c.fillStyle = rgba(P.sunGlow, 0.18); fillEllipse(c, sx, sy, 26, 26, rgba(P.sunGlow, 0.14));
    fillEllipse(c, sx, sy, 14, 14, rgba(P.sunGlow, 0.28));
    fillEllipse(c, sx, sy, 8, 8, P.sun);
    fillEllipse(c, sx, sy, 7, 7, '#fffaf0');
    // clouds
    cloud(c, 40, 15, 1.0);
    cloud(c, 118, 10, 0.8);
    cloud(c, 210, 26, 0.7);
    cloud(c, 285, 12, 0.6);
  }
  function cloud(c, x, y, s) {
    var w = Math.round(22 * s), h = Math.round(6 * s);
    c.fillStyle = rgba(P.cloudShade, 0.9);
    fillEllipse(c, x, y + 1, w * 0.9, h * 0.85, rgba(P.cloudShade, 0.85));
    c.fillStyle = rgba(P.cloud, 0.98);
    fillEllipse(c, x - w * 0.4, y, w * 0.55, h * 0.8, P.cloud);
    fillEllipse(c, x + w * 0.15, y - h * 0.3, w * 0.6, h, P.cloud);
    fillEllipse(c, x + w * 0.55, y + h * 0.1, w * 0.45, h * 0.7, P.cloud);
  }

  function drawDistant(c, T) {
    // far island headlands on the horizon
    var islands = [
      { x: 0, w: 70, h: 9, col: P.farIsland },
      { x: 60, w: 40, h: 6, col: P.farIsland2 },
      { x: 250, w: 90, h: 11, col: P.farIsland },
      { x: 300, w: 40, h: 7, col: P.farIsland2 }
    ];
    for (var i = 0; i < islands.length; i++) {
      var it = islands[i];
      for (var x = it.x; x < it.x + it.w; x++) {
        var u = (x - it.x) / it.w;
        var hh = Math.round(it.h * Math.sin(u * Math.PI) + Math.sin(x * 0.7 + i) * 0.8);
        if (hh <= 0) continue;
        c.fillStyle = it.col;
        c.fillRect(x, 46 - hh, 1, hh + 2);
      }
    }
    // tiny sailboat drifting
    var bx = 84 + Math.sin(T * 0.05) * 6;
    c.fillStyle = '#5a4632'; c.fillRect(bx, 44, 6, 2);
    c.fillStyle = '#f2ede0'; fillTri(g, bx + 3, 44, bx + 3, 36, bx + 7, 44, '#f2ede0');
  }

  function drawWater(c, T) {
    for (var y = 46; y < H; y++) {
      var t = (y - 46) / (H - 46);
      var col = t < 0.5 ? mix(P.seaFar, P.seaMid, t / 0.5) : mix(P.seaMid, P.seaNear, (t - 0.5) / 0.5);
      c.fillStyle = col;
      c.fillRect(0, y, W, 1);
    }
    // reflected sun column
    for (var yy = 46; yy < H; yy++) {
      var spread = 8 + (yy - 46) * 0.9;
      var a = 0.10 + 0.10 * Math.sin(yy * 0.9 - T * 1.4);
      if (a <= 0) continue;
      c.fillStyle = rgba(P.sunGlow, clamp(a, 0, 0.2));
      c.fillRect(Math.round(252 - spread), yy, Math.round(spread * 2), 1);
    }
    // moving wave lines
    for (var band = 0; band < 26; band++) {
      var by = 50 + band * 5.1;
      var off = Math.sin(T * 0.8 + band * 1.7) * 6;
      var alpha = 0.10 + 0.06 * Math.sin(T * 1.1 + band);
      c.fillStyle = rgba(P.seaSpark, clamp(alpha, 0.04, 0.2));
      for (var k = 0; k < 5; k++) {
        var wx = ((band * 53 + k * 71 + off) % (W + 40)) - 20;
        var wlen = 9 + ((band * 7 + k * 5) % 17);
        c.fillRect(Math.round(wx), Math.round(by), wlen, 1);
      }
    }
    // twinkling sparkles
    for (var i = 0; i < 40; i++) {
      var sx = Math.floor(hash(i * 3.3) * W);
      var sy = 48 + Math.floor(hash(i * 7.7 + 1) * (H - 48));
      var tw = hash(i * 1.9 + Math.floor(T * 2));
      if (tw > 0.82) {
        c.fillStyle = rgba('#eaffff', 0.6);
        c.fillRect(sx, sy, 1, 1);
      }
    }
    // soft depth vignette at very bottom
    for (var v = 0; v < 16; v++) {
      c.fillStyle = rgba(P.seaDeep, 0.02 + v * 0.006);
      c.fillRect(0, H - 16 + v, W, 1);
    }
  }

  function shoreEdge(y) { return 44 + (y - 46) * 0.30 + Math.sin(y * 0.35) * 1.5; }

  function drawShore(c, T) {
    for (var y = 44; y < H; y++) {
      var e = shoreEdge(y);
      // wet sand / foam line
      c.fillStyle = P.sandEdge; c.fillRect(0, y, Math.round(e) + 2, 1);
      c.fillStyle = P.sand; c.fillRect(0, y, Math.round(e), 1);
      c.fillStyle = P.sandDark;
      for (var x = 0; x < e; x++) if (hash(x * 5.1 + y * 2.3) > 0.85) c.fillRect(x, y, 1, 1);
      // foam
      if (y % 3 === 0) {
        var fw = 2 + Math.round(hash(y * 3.7) * 3);
        c.fillStyle = rgba('#ffffff', 0.55);
        c.fillRect(Math.round(e) - 1, y, fw, 1);
      }
      // grass on upper/inland part
      var gx = e - (8 + (y - 44) * 0.05);
      if (gx > 2) {
        c.fillStyle = P.grass; c.fillRect(0, y, Math.round(gx), 1);
        c.fillStyle = P.grassDark;
        for (var xx = 0; xx < gx; xx++) if (hash(xx * 3.3 + y * 4.7) > 0.8) c.fillRect(xx, y, 1, 1);
      }
    }
    // grass tufts along edge
    for (var i = 0; i < 60; i++) {
      var gy = 46 + hash(i * 2.1) * (H - 50);
      var ge = shoreEdge(gy) - 9 - hash(i * 5.5) * 8;
      if (ge < 1) continue;
      var hh = 2 + Math.round(hash(i * 9.1) * 3);
      c.fillStyle = P.grassLite;
      c.fillRect(Math.round(ge + (i % 3)), Math.round(gy - hh), 1, hh);
    }
  }

  function drawVegetation(c, T) {
    // palm-like trees (original stylised)
    palm(c, 20, 150, 1.0, T, 0);
    palm(c, 44, 118, 0.72, T, 1.6);
    // bushes
    bush(c, 34, 168, 1.0);
    bush(c, 58, 150, 0.8);
    // rocks
    rock(c, 12, 176, 1.1);
    rock(c, 52, 174, 0.8);
    // reeds / cattails at water edge
    reeds(c, 62, 138, T);
    // flowers
    for (var i = 0; i < 14; i++) {
      var fx = 4 + hash(i * 1.7) * 44;
      var fy = 60 + hash(i * 4.3) * 100;
      if (fx > shoreEdge(fy) - 12) continue;
      c.fillStyle = i % 2 ? '#f2d24e' : '#ef7a9a';
      c.fillRect(Math.round(fx), Math.round(fy), 1, 1);
    }
  }

  function palm(c, x, baseY, s, T, ph) {
    var sway = Math.sin(T * 0.6 + ph) * 2 * s;
    var height = 44 * s;
    // trunk
    for (var i = 0; i < height; i++) {
      var u = i / height;
      var tx = x + Math.sin(u * 3 + T * 0.4 + ph) * 2 * s + u * sway * 0.5;
      var w = Math.max(1, Math.round((3 - u * 1.2) * s));
      c.fillStyle = P.trunk;
      c.fillRect(Math.round(tx - w / 2), Math.round(baseY - i), w, 1);
      if (i % 3 === 0) { c.fillStyle = shade(P.trunk, -0.25); c.fillRect(Math.round(tx - w / 2), Math.round(baseY - i), w, 1); }
    }
    var topX = x + Math.sin(3 + T * 0.4 + ph) * 2 * s + sway * 0.5;
    var topY = baseY - height;
    // fronds
    for (var f = 0; f < 6; f++) {
      var a = (f / 6) * Math.PI * 2 + 0.3;
      var len = (13 + (f % 2) * 3) * s;
      var ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.55;
      c.strokeStyle = f % 2 ? P.leaf : P.leafDark;
      c.lineWidth = Math.max(1, Math.round(2 * s));
      c.beginPath(); c.moveTo(topX, topY); c.quadraticCurveTo((topX + ex) / 2, Math.min(topY, ey) - 4 * s, ex, ey); c.stroke();
    }
    // coconuts
    c.fillStyle = '#6b4a26';
    c.fillRect(Math.round(topX - 2 * s), Math.round(topY + 1), 2, 2);
    c.fillRect(Math.round(topX + 1 * s), Math.round(topY + 2), 2, 2);
  }

  function bush(c, x, y, s) {
    var w = 22 * s, h = 12 * s;
    c.fillStyle = P.leafDark; fillEllipse(c, x, y, w * 0.5, h * 0.7, P.leafDark);
    c.fillStyle = P.leaf; fillEllipse(c, x - w * 0.18, y - 1, w * 0.34, h * 0.6, P.leaf);
    c.fillStyle = P.leaf; fillEllipse(c, x + w * 0.18, y, w * 0.34, h * 0.6, P.leaf);
    c.fillStyle = P.leafLite; fillEllipse(c, x, y - h * 0.25, w * 0.22, h * 0.4, P.leafLite);
    // berries
    for (var i = 0; i < 5; i++) {
      c.fillStyle = i % 2 ? '#e0503a' : '#f2a63a';
      c.fillRect(Math.round(x - w * 0.3 + hash(i * 3.1) * w * 0.6), Math.round(y - h * 0.2 + hash(i * 6.2) * h * 0.5), 1, 1);
    }
  }

  function rock(c, x, y, s) {
    c.fillStyle = P.rockDark; fillEllipse(c, x, y, 9 * s, 6 * s, P.rockDark);
    c.fillStyle = P.rock; fillEllipse(c, x, y - 1, 8 * s, 5 * s, P.rock);
    c.fillStyle = P.rockLite; fillEllipse(c, x - 2 * s, y - 3 * s, 4 * s, 2 * s, P.rockLite);
    c.fillStyle = rgba('#000000', 0.18); c.fillRect(Math.round(x - 8 * s), Math.round(y + 4 * s), Math.round(16 * s), 1);
  }

  function reeds(c, x, y, T) {
    for (var i = 0; i < 7; i++) {
      var rx = x + (i - 3) * 3;
      var hh = 12 + (i % 3) * 4;
      var sw = Math.sin(T * 1.1 + i) * 1.4;
      c.strokeStyle = P.leafDark; c.lineWidth = 1;
      c.beginPath(); c.moveTo(rx, y); c.quadraticCurveTo(rx + sw, y - hh * 0.6, rx + sw * 2, y - hh); c.stroke();
      if (i % 2 === 0) {
        c.fillStyle = '#8a5a2a';
        c.fillRect(Math.round(rx + sw * 2 - 1), Math.round(y - hh - 3), 2, 4);
      }
    }
  }

  function drawLily(c, T) {
    var pads = [[92, 168], [110, 176], [78, 158]];
    for (var i = 0; i < pads.length; i++) {
      var x = pads[i][0] + Math.sin(T * 0.5 + i) * 1.5;
      var y = pads[i][1];
      fillEllipse(c, x, y, 5, 3, '#2f7a44');
      c.fillStyle = '#3f9a56'; fillEllipse(c, x, y - 0.5, 4, 2.2, '#3f9a56');
      c.fillStyle = '#2f7a44'; c.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    // one bloom
    var bx = 100, by = 166 + Math.sin(T * 0.7) * 1;
    c.fillStyle = '#f2a6c0'; fillEllipse(c, bx, by, 3, 2, '#f2a6c0');
    c.fillStyle = '#ffe0ee'; fillEllipse(c, bx, by - 1, 2, 1.5, '#ffe0ee');
  }

  function drawDock(c, T) {
    var topY = 104, botY = 180;
    var tl = 140, tr = 180, bl = 126, br = 194;
    function L(y) { return lerp(tl, bl, (y - topY) / (botY - topY)); }
    function R(y) { return lerp(tr, br, (y - topY) / (botY - topY)); }
    // supports going into water
    c.fillStyle = P.woodEdge;
    c.fillRect(Math.round(L(120) - 2), 120, 4, 60);
    c.fillRect(Math.round(R(120) - 2), 120, 4, 60);
    // reflection
    c.fillStyle = rgba(P.woodEdge, 0.25);
    for (var ry = 0; ry < 22; ry++) {
      var rw = (R(180) - L(180)) * (1 - ry / 40);
      c.fillRect(Math.round((L(180) + R(180)) / 2 - rw / 2), 180 + ry, Math.round(rw), 1);
    }
    // deck
    for (var y = topY; y < botY; y++) {
      var l = Math.round(L(y)), r = Math.round(R(y));
      c.fillStyle = P.wood; c.fillRect(l, y, r - l, 1);
      // vertical grain / board edge
      if ((y - topY) % 6 === 0) { c.fillStyle = P.woodDark; c.fillRect(l, y, r - l, 1); }
      else if ((y - topY) % 6 === 1) { c.fillStyle = P.woodLite; c.fillRect(l, y, r - l, 1); }
      // plank gaps
      c.fillStyle = rgba(P.woodEdge, 0.35);
      for (var x = l + 4; x < r; x += 11) c.fillRect(x, y, 1, 1);
    }
    // side rails (perspective)
    c.fillStyle = P.woodDark;
    for (var s = topY; s < botY; s++) {
      c.fillRect(Math.round(L(s)), s, 2, 1);
      c.fillRect(Math.round(R(s)) - 2, s, 2, 1);
    }
    // nail dots
    for (var ny = topY + 5; ny < botY; ny += 12) {
      c.fillStyle = '#3a2a18';
      c.fillRect(Math.round(L(ny)) + 3, ny, 1, 1);
      c.fillRect(Math.round(R(ny)) - 4, ny, 1, 1);
    }
    // rope on a post
    c.strokeStyle = '#c9a86a'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(L(126), 126); c.quadraticCurveTo(L(126) + 4, 134, L(126) + 1, 142); c.stroke();
  }

  function drawProps(c, T) {
    // bucket with a fish tail, near the dock
    var bx = 138, by = 150;
    c.fillStyle = '#5a6a76'; c.fillRect(bx, by - 6, 10, 7);
    c.fillStyle = '#7d8f9c'; c.fillRect(bx, by - 6, 10, 2);
    c.fillStyle = '#4a5864'; c.fillRect(bx, by - 1, 10, 1);
    c.fillStyle = '#8a5a2a'; c.fillRect(bx, by - 6, 10, 1);
    // tail sticking out
    c.fillStyle = '#c87742';
    fillTri(c, bx + 6, by - 6, bx + 8, by - 10, bx + 10, by - 6, '#c87742');
    // tackle box
    c.fillStyle = '#3a5a6a'; c.fillRect(172, 152, 12, 8);
    c.fillStyle = '#4f7a8c'; c.fillRect(172, 152, 12, 3);
    c.fillStyle = '#2a3f4a'; c.fillRect(172, 159, 12, 1);
    c.fillStyle = '#d9c070'; c.fillRect(176, 150, 4, 2);
    // lantern post
    var lx = 186, ly = 132;
    c.fillStyle = '#3a2a18'; c.fillRect(lx, ly, 2, 14);
    c.fillStyle = '#d9a83a'; c.fillRect(lx - 2, ly - 6, 6, 7);
    c.fillStyle = rgba('#ffe27a', 0.4); fillEllipse(g, lx + 1, ly - 3, 5, 5, rgba('#ffe27a', 0.18));
    c.fillStyle = '#fff2b0'; c.fillRect(lx - 1, ly - 5, 4, 5);
    c.fillStyle = '#3a2a18'; c.fillRect(lx - 2, ly - 7, 6, 1); c.fillRect(lx - 2, ly + 0, 6, 1);
  }

  // ---------------------------------------------------------------- angler
  var AX = 160, AY = 116;
  function rodTip(angle) {
    var hx = AX + 5, hy = AY - 10;
    var len = 31;
    return { x: hx + Math.cos(angle) * len, y: hy + Math.sin(angle) * len, hx: hx, hy: hy, angle: angle };
  }
  function drawAngler(c, T, rodAngle, bend) {
    // shadow
    fillEllipse(c, AX + 1, AY + 1, 9, 3, rgba('#000000', 0.22));
    // legs
    c.fillStyle = P.pants;
    c.fillRect(AX - 4, AY - 7, 3, 6);
    c.fillRect(AX + 1, AY - 7, 3, 6);
    c.fillStyle = P.boot;
    c.fillRect(AX - 5, AY - 2, 4, 2);
    c.fillRect(AX + 1, AY - 2, 4, 2);
    // torso
    c.fillStyle = P.shirt;
    c.fillRect(AX - 6, AY - 15, 12, 8);
    c.fillStyle = P.shirtDark;
    c.fillRect(AX - 6, AY - 15, 12, 1);
    c.fillRect(AX - 1, AY - 15, 1, 8);
    // arms
    c.fillStyle = P.shirt;
    c.fillRect(AX - 8, AY - 14, 2, 6);
    c.fillRect(AX + 6, AY - 15, 2, 7);
    c.fillStyle = P.skin;
    c.fillRect(AX - 8, AY - 9, 2, 2);
    c.fillRect(AX + 6, AY - 9, 2, 2);
    // head (back view: hair)
    c.fillStyle = P.skin;
    c.fillRect(AX - 4, AY - 20, 8, 6);
    c.fillStyle = P.hair;
    c.fillRect(AX - 4, AY - 20, 8, 5);
    c.fillRect(AX - 4, AY - 16, 2, 2);
    c.fillRect(AX + 2, AY - 16, 2, 2);
    c.fillStyle = shade(P.hair, -0.2);
    c.fillRect(AX - 4, AY - 15, 8, 1);
    // hat
    c.fillStyle = P.hatDark;
    c.fillRect(AX - 9, AY - 21, 18, 1);
    c.fillStyle = P.hat;
    c.fillRect(AX - 9, AY - 22, 18, 1);
    c.fillRect(AX - 6, AY - 26, 12, 4);
    c.fillStyle = P.hatDark;
    c.fillRect(AX - 6, AY - 23, 12, 1);
    c.fillStyle = P.hatBand;
    c.fillRect(AX - 6, AY - 23, 12, 1);
    c.fillStyle = shade(P.hat, 0.2);
    c.fillRect(AX - 6, AY - 26, 4, 1);

    // fishing rod (crisp pixels, slight curve for bend)
    var tip = rodTip(rodAngle);
    var bendAmt = bend || 0;
    var midX = (tip.hx + tip.x) / 2 + bendAmt * 5;
    var midY = (tip.hy + tip.y) / 2 + bendAmt * 7;
    plotCurve(c, tip.hx, tip.hy, midX, midY, tip.x, tip.y, '#4a3118', 1);
    plotCurve(c, tip.hx, tip.hy - 1, midX, midY - 1, tip.x, tip.y - 1, '#8a6236', 0);
    // reel
    c.fillStyle = '#3a2a18';
    c.fillRect(Math.round(tip.hx - 1), Math.round(tip.hy + 1), 3, 3);
    // hand over rod
    c.fillStyle = P.skin;
    c.fillRect(AX + 5, AY - 11, 3, 3);
    return tip;
  }

  // ---------------------------------------------------------------- bobber
  var bobberTarget = { x: 216, y: 96 };
  function drawBobber(c, x, y, T, dip, ringPulse) {
    // ripples
    if (ringPulse > 0) {
      for (var i = 0; i < 2; i++) {
        var rr = (1 - ringPulse) * (10 + i * 6);
        c.strokeStyle = rgba('#ffffff', ringPulse * 0.5);
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(x, y + 2, rr, rr * 0.4, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    var by = y + dip;
    // body
    c.fillStyle = '#d43a2a'; fillEllipse(c, x, by, 3, 3, '#d43a2a');
    c.fillStyle = '#f4f0e6'; fillEllipse(c, x, by + 1, 3, 2, '#f4f0e6');
    c.fillStyle = '#ffffff'; c.fillRect(Math.round(x - 1), Math.round(by - 2), 1, 1);
    // stick antenna
    c.fillStyle = '#2a2028'; c.fillRect(Math.round(x), Math.round(by - 5), 1, 3);
    c.fillStyle = '#f2c14e'; c.fillRect(Math.round(x) - 1, Math.round(by - 6), 3, 1);
    // water line foam
    c.fillStyle = rgba('#ffffff', 0.5);
    c.fillRect(Math.round(x - 4), Math.round(by + 2), 8, 1);
  }

  // ---------------------------------------------------------------- particles
  var ripples = [];
  function spawnRipple(x, y, max) { ripples.push({ x: x, y: y, r: 1, max: max || 12, a: 0.7 }); }
  function updateRipples(dt) {
    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      r.r += dt * 26; r.a -= dt * 0.9;
      if (r.a <= 0 || r.r > r.max) ripples.splice(i, 1);
    }
  }
  function drawRipples(c) {
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      c.strokeStyle = rgba('#ffffff', clamp(r.a, 0, 1) * 0.6);
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(r.x, r.y, r.r, r.r * 0.42, 0, 0, Math.PI * 2); c.stroke();
    }
  }

  // ---------------------------------------------------------------- game state
  var state = 'ready';
  var stateTime = 0;
  var T = 0;
  var waitDur = 2;
  var biteWindow = 1.25;
  var reelDur = 1.35;
  var revealDur = 3.3;
  var castFly = 0.42;
  var rodAngle = -1.05;
  var bobberVisible = false;
  var bobber = { x: bobberTarget.x, y: bobberTarget.y };
  var bobberDip = 0;
  var currentFish = null;
  var currentRarity = null;
  var missTimer = 0;
  var splashTimer = 0;
  var introTimer = 5.0;

  var catchLog = [];  // ALL successful catches, newest first

  var api = {};
  Object.defineProperty(api, 'state', { get: function () { return state; }, enumerable: true });
  api.pickRarity = function (u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  };
  api.log = catchLog;
  window.fishing = api;

  // ---------------------------------------------------------------- flow
  function doAction() {
    if (state === 'ready') startCast();
    else if (state === 'bite') startReel();
    else if (state === 'reveal' && stateTime > 0.7) {
      state = 'ready'; stateTime = 0; currentFish = null; currentRarity = null;
    }
  }
  function startCast() {
    state = 'waiting'; stateTime = 0;
    waitDur = 1.6 + Math.random() * 1.1;
    bobberVisible = true;
    bobber.landed = false;
    bobber.x = rodTip(rodAngle).x; bobber.y = rodTip(rodAngle).y;
  }
  function enterBite() {
    state = 'bite'; stateTime = 0;
    spawnRipple(bobberTarget.x, bobberTarget.y + 2, 14);
  }
  function startReel() {
    state = 'reeling'; stateTime = 0;
    splashTimer = 0.5;
    spawnRipple(bobberTarget.x, bobberTarget.y + 2, 18);
    spawnRipple(bobberTarget.x, bobberTarget.y + 2, 28);
  }
  function missBite() {
    state = 'ready'; stateTime = 0;
    missTimer = 2.0;
    bobberVisible = false;
  }
  function finishCatch() {
    var rarity = window.fishing.pickRarity(Math.random());
    if (RARITY.indexOf(rarity) < 0) rarity = 'Common';
    var pool = [];
    for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].rarity === rarity) pool.push(SPECIES[i]);
    if (!pool.length) { rarity = 'Common'; pool = [SPECIES[0]]; }
    var fish = pool[Math.floor(Math.random() * pool.length)];
    currentFish = fish; currentRarity = rarity;
    window.fishing.log.unshift({ name: fish.name, rarity: rarity });
    state = 'reveal'; stateTime = 0;
    bobberVisible = false;
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    stateTime += dt;
    if (missTimer > 0) missTimer -= dt;
    if (splashTimer > 0) splashTimer -= dt;
    if (introTimer > 0) introTimer -= dt;
    updateRipples(dt);

    var tip = rodTip(rodAngle);

    if (state === 'ready') {
      var target = -1.05 + Math.sin(T * 0.8) * 0.03;
      rodAngle = lerp(rodAngle, target, Math.min(1, dt * 6));
    } else if (state === 'waiting') {
      // cast swing: pull back, then fling forward
      var u = clamp(stateTime / castFly, 0, 1);
      var swing;
      if (u < 0.25) swing = lerp(-1.05, -1.7, u / 0.25);
      else swing = lerp(-1.7, -0.55, easeOut((u - 0.25) / 0.75));
      rodAngle = swing;
      var tip2 = rodTip(rodAngle);
      if (stateTime < castFly) {
        var t2 = easeOut(u);
        bobber.x = lerp(tip2.x, bobberTarget.x, t2);
        bobber.y = lerp(tip2.y, bobberTarget.y, t2) - Math.sin(u * Math.PI) * 16;
        if (u > 0.98 && !bobber.landed) { spawnRipple(bobberTarget.x, bobberTarget.y + 2, 14); bobber.landed = true; }
      } else {
        bobber.x = bobberTarget.x; bobber.y = bobberTarget.y;
        bobberDip = Math.sin(T * 2.2) * 0.6 + Math.sin(T * 3.7) * 0.3;
        if (stateTime >= castFly + waitDur) enterBite();
      }
    } else if (state === 'bite') {
      rodAngle = lerp(rodAngle, -0.85, Math.min(1, dt * 8)) + Math.sin(T * 30) * 0.012;
      bobber.x = bobberTarget.x + Math.sin(T * 24) * 1.2;
      bobber.y = bobberTarget.y + 3 + Math.abs(Math.sin(T * 14)) * 2;
      bobberDip = 0;
      if (stateTime > 0.35 && stateTime < 0.42) spawnRipple(bobberTarget.x, bobberTarget.y + 3, 16);
      if (stateTime >= biteWindow) missBite();
    } else if (state === 'reeling') {
      rodAngle = lerp(rodAngle, -1.8, Math.min(1, dt * 5)) + Math.sin(T * 22) * 0.03;
      var rt = clamp(stateTime / (reelDur * 0.65), 0, 1);
      bobber.x = lerp(bobberTarget.x, tip.x + 6, easeInOut(rt));
      bobber.y = lerp(bobberTarget.y, tip.y + 4, easeInOut(rt));
      bobberDip = Math.sin(T * 30) * 1.5 * (1 - rt);
      if (splashTimer > 0 && splashTimer < 0.5 && splashTimer > 0.44) spawnRipple(bobberTarget.x, bobberTarget.y + 2, 20);
      if (stateTime >= reelDur) finishCatch();
    } else if (state === 'reveal') {
      rodAngle = lerp(rodAngle, -1.05, Math.min(1, dt * 4));
      if (stateTime >= revealDur) { state = 'ready'; stateTime = 0; currentFish = null; currentRarity = null; }
    }
  }

  // ---------------------------------------------------------------- scene render
  function renderScene(T) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);

    drawSky(g, T);
    drawDistant(g, T);
    drawWater(g, T);
    drawShore(g, T);
    drawVegetation(g, T);
    drawLily(g, T);
    drawDock(g, T);
    drawProps(g, T);
    drawRipples(g);

    var bend = 0;
    if (state === 'reeling') bend = 0.7;
    else if (state === 'bite') bend = 0.25;
    var tip = drawAngler(g, T, rodAngle, bend);

    // fishing line + bobber
    if (bobberVisible && state !== 'reeling') {
      var sag = (state === 'waiting' && stateTime > castFly) ? 4 : (state === 'bite' ? 1 : 0);
      drawLine(g, tip.x, tip.y, bobber.x, bobber.y, sag, '#e8e4d8');
      drawBobber(g, bobber.x, bobber.y, T, bobberDip, state === 'bite' ? (biteWindow - stateTime) / biteWindow : 0);
    } else if (state === 'reeling' && bobberVisible) {
      drawLine(g, tip.x, tip.y, bobber.x, bobber.y, 1, '#e8e4d8');
      drawBobber(g, bobber.x, bobber.y, T, bobberDip, 0);
    }

    // bite cue above bobber
    if (state === 'bite') {
      var bobPulse = Math.abs(Math.sin(T * 8));
      var ex = bobberTarget.x;
      var ey = bobberTarget.y - 18 - bobPulse * 3;
      // halo
      g.fillStyle = rgba('#ffe27a', 0.25);
      fillEllipse(g, ex, ey + 2, 9, 9, rgba('#ffe27a', 0.25));
      // exclamation
      g.fillStyle = '#fff4c0'; g.fillRect(ex - 1, ey - 6, 3, 8);
      g.fillStyle = '#ffd23a'; g.fillRect(ex, ey - 6, 1, 6);
      g.fillStyle = '#fff4c0'; g.fillRect(ex - 1, ey + 3, 3, 3);
      // sparkle ticks
      g.fillStyle = '#fff4c0';
      g.fillRect(ex - 7, ey - 8, 1, 1); g.fillRect(ex + 7, ey - 8, 1, 1);
      g.fillRect(ex - 8, ey + 3, 1, 1); g.fillRect(ex + 8, ey + 3, 1, 1);
      // shrinking window ring around bobber
      var prog = clamp((biteWindow - stateTime) / biteWindow, 0, 1);
      g.strokeStyle = rgba('#ffd23a', 0.9); g.lineWidth = 1;
      g.beginPath(); g.arc(bobberTarget.x, bobberTarget.y + 2, 6 + prog * 8, 0, Math.PI * 2); g.stroke();
    }

    // "missed" floating text
    if (missTimer > 0) {
      var a = clamp(missTimer / 2, 0, 1);
      g.fillStyle = rgba('#ffd0b0', a);
      g.font = 'bold 7px "Courier New", monospace';
      g.textAlign = 'center';
      g.fillText('! the line went slack', bobberTarget.x, bobberTarget.y - 12 - (2 - missTimer) * 6);
      g.textAlign = 'left';
    }

    if (state === 'reveal' && currentFish) {
      drawReveal(g, T);
    }

    drawVignette(g);
  }

  function drawVignette(c) {
    var vg = c.createRadialGradient(160, 84, 58, 160, 84, 220);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.68, 'rgba(3,10,18,0.08)');
    vg.addColorStop(1, 'rgba(3,10,18,0.40)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
  }

  function drawLine(c, x0, y0, x1, y1, sag, color) {
    var px = x0, py = y0, steps = 12;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var x = lerp(x0, x1, t);
      var y = lerp(y0, y1, t) + Math.sin(t * Math.PI) * sag;
      plotLine(c, px, py, x, y, color);
      px = x; py = y;
    }
  }

  // ---------------------------------------------------------------- reveal
  function drawReveal(c, T) {
    // focus dim
    c.fillStyle = 'rgba(6,12,18,0.30)';
    c.fillRect(0, 0, W, H);

    var cx = 160, cy = 80;
    var rarity = currentRarity;
    var t = stateTime;
    var appear = clamp(t / 0.3, 0, 1);

    // dark stage disc so the catch reads clearly (Ancient gets a luminous pool)
    if (rarity === 'Ancient') {
      fillEllipse(c, cx, cy, 72, 50, rgba('#0a3a4c', 0.55));
      fillEllipse(c, cx, cy, 58, 40, rgba('#0e5568', 0.50));
    } else {
      fillEllipse(c, cx, cy, 70, 48, rgba('#060f18', 0.55));
      fillEllipse(c, cx, cy, 56, 38, rgba('#0c1c28', 0.45));
    }

    drawRevealDecor(c, rarity, T, cx, cy, appear);

    // size the fish so even the biggest catch sits inside the frame
    var spr = spriteCache[currentFish.id][0];
    var maxW = 152, maxH = 84;
    var scale = Math.max(1, Math.min(3, Math.floor(maxW / spr.width), Math.floor(maxH / spr.height)));
    var bob = Math.sin(T * 3) * 1.5;
    drawSprite(c, currentFish, cx, cy + bob, scale, T * 0.8);

    // front frame
    drawFrame(c, rarity, cx, cy, appear);
  }

  function drawRevealDecor(c, rarity, T, cx, cy, appear) {
    if (rarity === 'Common') {
      c.fillStyle = rgba('#ffffff', 0.06);
      fillEllipse(c, cx, cy, 46, 34, rgba('#ffffff', 0.06));
    } else if (rarity === 'Uncommon') {
      fillEllipse(c, cx, cy, 48, 34, rgba('#6fd06a', 0.10));
      for (var i = 0; i < 8; i++) {
        var a = T * 0.7 + i * Math.PI / 4;
        var px = cx + Math.cos(a) * 42, py = cy + Math.sin(a) * 28;
        c.fillStyle = rgba('#a8f09a', 0.5 + 0.4 * Math.sin(T * 4 + i));
        c.fillRect(Math.round(px), Math.round(py), 2, 2);
      }
      // leaf sprigs
      sprig(c, cx - 52, cy + 6, -1);
      sprig(c, cx + 52, cy + 6, 1);
    } else if (rarity === 'Rare') {
      fillEllipse(c, cx, cy, 52, 38, rgba('#54a8ff', 0.13));
      // rotating diamond of dots
      for (var d = 0; d < 10; d++) {
        var a2 = -T * 0.9 + d * Math.PI / 5;
        var dx = cx + Math.cos(a2) * 50, dy = cy + Math.sin(a2) * 32;
        c.fillStyle = rgba('#9fd0ff', 0.7);
        c.fillRect(Math.round(dx), Math.round(dy), 2, 2);
      }
      for (var s = 0; s < 3; s++) {
        c.fillStyle = rgba('#9fd0ff', 0.25 + 0.2 * Math.sin(T * 3 + s));
        c.fillRect(cx - 48, cy - 18 + s * 14 + Math.sin(T * 2 + s) * 2, 96, 1);
      }
    } else if (rarity === 'Epic') {
      // sunburst
      for (var r = 0; r < 16; r++) {
        var ang = T * 0.35 + r * Math.PI / 8;
        var x0 = cx + Math.cos(ang) * 22, y0 = cy + Math.sin(ang) * 16;
        var x1 = cx + Math.cos(ang) * 62, y1 = cy + Math.sin(ang) * 44;
        c.strokeStyle = rgba(r % 2 ? '#c07dff' : '#7a4fd0', 0.30);
        c.lineWidth = r % 2 ? 3 : 1;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      fillEllipse(c, cx, cy, 44, 32, rgba('#c07dff', 0.16));
      // rising embers
      for (var e = 0; e < 14; e++) {
        var ey = cy + 34 - ((T * 22 + e * 17) % 66);
        var ex = cx - 46 + ((e * 41) % 92) + Math.sin(T * 2 + e) * 3;
        c.fillStyle = rgba('#e0a0ff', 0.7 * (1 - Math.abs(ey - cy) / 40));
        c.fillRect(Math.round(ex), Math.round(ey), 1, 1);
      }
    } else if (rarity === 'Legendary') {
      // golden rays
      for (var r2 = 0; r2 < 20; r2++) {
        var a3 = -T * 0.25 + r2 * Math.PI / 10;
        var u0 = 18, u1 = 66 + Math.sin(T * 2 + r2) * 4;
        var px0 = cx + Math.cos(a3) * u0, py0 = cy + Math.sin(a3) * u0 * 0.72;
        var px1 = cx + Math.cos(a3) * u1, py1 = cy + Math.sin(a3) * u1 * 0.72;
        c.strokeStyle = rgba(r2 % 2 ? '#ffd75a' : '#ffae20', 0.34);
        c.lineWidth = r2 % 2 ? 3 : 1;
        c.beginPath(); c.moveTo(px0, py0); c.lineTo(px1, py1); c.stroke();
      }
      fillEllipse(c, cx, cy, 46, 34, rgba('#ffcf5a', 0.18));
      // crown above
      crown(c, cx, cy - 34 + Math.sin(T * 2) * 1);
      // star sparkles
      for (var s2 = 0; s2 < 10; s2++) {
        var sa = T * 1.3 + s2;
        var sx = cx + Math.cos(sa) * (38 + (s2 % 3) * 8);
        var sy = cy + Math.sin(sa * 1.3) * (26 + (s2 % 2) * 8);
        spark(c, sx, sy, 2 + (s2 % 2));
      }
    } else if (rarity === 'Ancient') {
      // dark vortex on a luminous teal pool
      fillEllipse(c, cx, cy, 56, 40, rgba('#12586c', 0.45));
      fillEllipse(c, cx, cy, 42, 30, rgba('#1a7a8c', 0.40));
      for (var v = 0; v < 22; v++) {
        var va = T * 0.5 + v * 0.9;
        var vr = 12 + v * 2.6;
        var vx = cx + Math.cos(va) * vr, vy = cy + Math.sin(va) * vr * 0.62;
        c.fillStyle = rgba(v % 2 ? '#0e3f56' : '#0a2c40', 0.60);
        c.fillRect(Math.round(vx), Math.round(vy), 2, 2);
      }
      // expanding rune rings
      for (var ring = 0; ring < 3; ring++) {
        var rp = ((T * 0.4 + ring / 3) % 1);
        var rr = rp * 60;
        c.strokeStyle = rgba('#4fe6d8', (1 - rp) * 0.55);
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(cx, cy, rr, rr * 0.62, 0, 0, Math.PI * 2); c.stroke();
      }
      // floating runes / glyphs
      var glyphs = [[-46, -20], [48, -14], [-38, 22], [42, 24], [0, -34]];
      for (var gi = 0; gi < glyphs.length; gi++) {
        var gx = cx + glyphs[gi][0] + Math.sin(T * 1.2 + gi) * 3;
        var gy = cy + glyphs[gi][1] + Math.cos(T * 1.4 + gi) * 3;
        glyph(c, gx, gy, '#7fe8dc', Math.floor(T * 2 + gi) % 3);
      }
    }
  }

  function sprig(c, x, y, dir) {
    c.strokeStyle = '#6fd06a'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y + 10); c.quadraticCurveTo(x + dir * 4, y, x + dir * 2, y - 8); c.stroke();
    for (var i = 0; i < 3; i++) {
      var ly = y - 2 - i * 4;
      c.fillStyle = '#8fe07a';
      c.fillRect(Math.round(x + dir * (2 + i)), Math.round(ly), 3, 2);
      c.fillRect(Math.round(x + dir * (2 + i)) - dir * 4, Math.round(ly + 1), 3, 2);
    }
  }
  function crown(c, x, y) {
    c.fillStyle = '#ffd75a';
    fillPoly(c, [[x - 8, y + 4], [x - 8, y - 4], [x - 4, y], [x, y - 6], [x + 4, y], [x + 8, y - 4], [x + 8, y + 4]], '#ffd75a');
    c.fillStyle = '#fff2a8';
    c.fillRect(x - 6, y, 12, 2);
    c.fillStyle = '#ff6b5a'; c.fillRect(x - 2, y + 1, 3, 2);
  }
  function spark(c, x, y, s) {
    c.fillStyle = rgba('#fff6c0', 0.9);
    c.fillRect(Math.round(x), Math.round(y - s), 1, s * 2 + 1);
    c.fillRect(Math.round(x - s), Math.round(y), s * 2 + 1, 1);
  }
  function glyph(c, x, y, color, kind) {
    c.fillStyle = rgba(color, 0.85);
    x = Math.round(x); y = Math.round(y);
    if (kind === 0) { c.fillRect(x - 2, y - 3, 5, 1); c.fillRect(x, y - 2, 1, 5); c.fillRect(x - 2, y + 2, 5, 1); }
    else if (kind === 1) { c.fillRect(x, y - 3, 1, 7); c.fillRect(x - 3, y, 7, 1); }
    else { c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = rgba('#062033', 0.9); c.fillRect(x - 1, y - 1, 2, 2); }
  }

  function drawFrame(c, rarity, cx, cy, appear) {
    var w = 84, h = 50;
    var x = cx - w, y = cy - h;
    // basic double border, styled per tier
    var col = RARITY_COLOR[rarity];
    c.fillStyle = rgba(col, 0.9);
    c.fillRect(x, y, w * 2, 2);
    c.fillRect(x, y + h * 2 - 2, w * 2, 2);
    c.fillRect(x, y, 2, h * 2);
    c.fillRect(x + w * 2 - 2, y, 2, h * 2);
    if (rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Ancient') {
      // extra inner border + corner gems
      c.fillStyle = rgba(col, 0.45);
      c.fillRect(x + 4, y + 4, w * 2 - 8, 1);
      c.fillRect(x + 4, y + h * 2 - 5, w * 2 - 8, 1);
      c.fillRect(x + 4, y + 4, 1, h * 2 - 8);
      c.fillRect(x + w * 2 - 5, y + 4, 1, h * 2 - 8);
      var cs = [[x, y], [x + w * 2 - 6, y], [x, y + h * 2 - 6], [x + w * 2 - 6, y + h * 2 - 6]];
      for (var i = 0; i < cs.length; i++) { c.fillStyle = rgba(col, 0.95); c.fillRect(cs[i][0], cs[i][1], 6, 6); c.fillStyle = '#fff'; c.fillRect(cs[i][0] + 2, cs[i][1] + 2, 2, 2); }
    }
    if (rarity === 'Ancient') {
      // notched border marks
      c.fillStyle = rgba('#7fe8dc', 0.9);
      for (var m = 0; m < 4; m++) {
        c.fillRect(cx - 2, y + 6 + m * 18, 4, 1);
      }
    }
  }

  // ---------------------------------------------------------------- HUD
  function panel(x, y, w, h, accent) {
    ctx.fillStyle = 'rgba(8,16,24,0.74)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent || 'rgba(150,210,220,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 3, y + 3, w - 6, 1);
  }
  function txt(str, x, y, size, color, align, bold, shadow) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px "Courier New", Courier, monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(str, x + 2, y + 2); }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function drawHUD(T) {
    // ---- instruction panel (top-left)
    panel(12, 10, 384, 62);
    var hint, sub;
    if (state === 'ready') { hint = 'CAST'; sub = 'Press SPACE or CAST to throw your line.'; }
    else if (state === 'waiting') { hint = 'WAIT'; sub = 'Watch the bobber... a bite is coming.'; }
    else if (state === 'bite') { hint = 'REEL IN!'; sub = 'Press SPACE or REEL IN now!'; }
    else if (state === 'reeling') { hint = 'REELING'; sub = "Something's pulling hard..."; }
    else { hint = 'CAUGHT!'; sub = (currentFish ? currentFish.name : ''); }
    var hc = state === 'bite' ? '#ff7a5a' : (state === 'reeling' ? '#ffd75a' : '#bfe8f0');
    txt(hint, 26, 38, 22, hc, 'left', true, true);
    txt(sub, 26, 60, 14, '#d8e8ee', 'left', false, true);

    // ---- catch log (top-right)
    var lw = 268, lx = SW - lw - 12, ly = 10;
    var rows = Math.min(8, catchLog.length);
    var lh = 30 + Math.max(rows, 1) * 22;
    panel(lx, ly, lw, lh, 'rgba(220,180,120,0.35)');
    txt('CATCH LOG', lx + 14, ly + 22, 13, '#f2d9a8', 'left', true, true);
    if (!catchLog.length) {
      txt('no catches yet...', lx + 14, ly + 44, 13, '#8fa8b4', 'left', false, true);
    } else {
      for (var i = 0; i < rows; i++) {
        var e = catchLog[i];
        var ry = ly + 42 + i * 22;
        var col = RARITY_COLOR[e.rarity];
        ctx.fillStyle = col;
        ctx.fillRect(lx + 14, ry - 10, 8, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(lx + 14, ry - 10, 8, 2);
        txt(('# ' + (i + 1)) + '', lx + 30, ry - 2, 12, '#7f96a0', 'left', false, false);
        txt(e.name, lx + 56, ry - 2, 13, '#e8f0f2', 'left', false, true);
        txt(e.rarity, lx + lw - 14, ry - 2, 12, col, 'right', true, true);
      }
    }

    // ---- legend (bottom-left)
    var gw = 232, gx = 12, gy = SH - 196;
    panel(gx, gy, gw, 184, 'rgba(120,200,220,0.3)');
    txt('CATCH ODDS', gx + 14, gy + 22, 13, '#bfe8f0', 'left', true, true);
    var odds = [['Common', '45%'], ['Uncommon', '25%'], ['Rare', '15%'], ['Epic', '8%'], ['Legendary', '5%'], ['Ancient', '2%']];
    for (var j = 0; j < odds.length; j++) {
      var oy = gy + 44 + j * 21;
      ctx.fillStyle = RARITY_COLOR[odds[j][0]];
      ctx.fillRect(gx + 14, oy - 9, 10, 10);
      txt(odds[j][0], gx + 32, oy, 13, '#e8f0f2', 'left', false, true);
      txt(odds[j][1], gx + gw - 14, oy, 13, RARITY_COLOR[odds[j][0]], 'right', true, true);
    }

    // ---- reveal text
    if (state === 'reveal' && currentFish) {
      var rcol = RARITY_COLOR[currentRarity];
      var pulse = 1 + Math.sin(T * 4) * 0.03;
      var nameY = 568;
      var bannerW = 620, bannerX = SW / 2 - bannerW / 2;
      ctx.fillStyle = 'rgba(6,12,18,0.55)';
      ctx.fillRect(bannerX, nameY - 46, bannerW, 132);
      ctx.strokeStyle = rgba(rcol, 0.6); ctx.lineWidth = 2;
      ctx.strokeRect(bannerX + 1, nameY - 45, bannerW - 2, 130);
      txt(currentFish.name, SW / 2, nameY, Math.round(34 * pulse), '#fffbe8', 'center', true, true);
      txt(currentRarity.toUpperCase(), SW / 2, nameY + 44, 26, rcol, 'center', true, true);
      if (stateTime > 0.7 && Math.sin(T * 6) > -0.2) {
        txt('press SPACE / CAST to continue', SW / 2, nameY + 74, 14, 'rgba(210,230,235,0.85)', 'center', false, true);
      }
    }

    // ---- intro / miss toast
    if (introTimer > 0 && state === 'ready' && catchLog.length === 0) {
      var a = clamp(introTimer / 1.2, 0, 1);
      ctx.fillStyle = 'rgba(6,12,18,0.6)';
      ctx.fillRect(SW / 2 - 300, 78, 600, 44);
      txt('TIDEBELL COVE', SW / 2, 100, 22, 'rgba(255,240,200,' + a + ')', 'center', true, true);
      txt('a quiet fishing spot', SW / 2, 118, 14, 'rgba(200,225,235,' + a + ')', 'center', false, true);
    }
    if (missTimer > 0) {
      var ma = clamp(missTimer / 0.8, 0, 1) * (0.5 + 0.5 * Math.sin(T * 8));
      txt('MISSED!', SW / 2, 60, 26, 'rgba(255,140,110,' + clamp(ma, 0, 1) + ')', 'center', true, true);
    }
  }

  // ---------------------------------------------------------------- button
  function updateButton() {
    if (state === 'ready') {
      castBtn.disabled = false; castBtn.classList.remove('hot');
      castBtn.textContent = 'CAST';
    } else if (state === 'bite') {
      castBtn.disabled = false; castBtn.classList.add('hot');
      castBtn.textContent = 'REEL IN!';
    } else if (state === 'reveal') {
      castBtn.disabled = stateTime < 0.7; castBtn.classList.remove('hot');
      castBtn.textContent = 'NEXT';
    } else {
      castBtn.disabled = true; castBtn.classList.remove('hot');
      castBtn.textContent = state === 'reeling' ? 'REELING...' : 'WAIT...';
    }
  }

  // ---------------------------------------------------------------- main loop
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (document.hidden) dt = 0;
    if (dt > 0.05) dt = 0.05;

    if (dt > 0) { T += dt; update(dt); }
    renderScene(T);

    // blit logical scene to screen with nearest neighbour
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, SW, SH);
    ctx.drawImage(scene, 0, 0, W, H, 0, 0, SW, SH);

    drawHUD(T);
    updateButton();
  }

  // ---------------------------------------------------------------- input
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) doAction();
    }
  }, { passive: false });
  castBtn.addEventListener('click', function (e) { e.preventDefault(); doAction(); });
  canvas.addEventListener('pointerdown', function (e) {
    // only treat as cast when not clicking the button area
    doAction();
  });

  // ---------------------------------------------------------------- boot
  buildSprites();
  requestAnimationFrame(frame);
})();
