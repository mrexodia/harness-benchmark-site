/* Island Angler - a cozy top-down pixel fishing game.
   All artwork is drawn procedurally on canvas. No external assets. */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Canvas setup: scene is authored at 320x180 then blitted at 4x.
  // ------------------------------------------------------------------
  var SCENE_W = 320, SCENE_H = 180, SCALE = 4;
  var CW = SCENE_W * SCALE, CH = SCENE_H * SCALE; // 1280 x 720

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var scene = document.createElement('canvas');
  scene.width = SCENE_W; scene.height = SCENE_H;
  var s = scene.getContext('2d');
  s.imageSmoothingEnabled = false;

  // ------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------
  function R(x, y, w, h, c) { s.fillStyle = c; s.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  // deterministic rng for static decoration (runs once at init)
  var seed = 20240517;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function rr(a, b) { return a + rnd() * (b - a); }

  function pcircle(c, x0, y0, r, color) {
    c.fillStyle = color;
    for (var dy = -r; dy <= r; dy++) {
      var dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      c.fillRect(x0 - dx, y0 + dy, dx * 2 + 1, 1);
    }
  }
  function pcircleOutline(c, x0, y0, r, color) {
    c.fillStyle = color;
    var steps = Math.max(8, Math.round(r * 6));
    for (var i = 0; i < steps; i++) {
      var a = i / steps * Math.PI * 2;
      c.fillRect(Math.round(x0 + Math.cos(a) * r), Math.round(y0 + Math.sin(a) * r), 1, 1);
    }
  }

  // ------------------------------------------------------------------
  // Shoreline (land lower-left, water elsewhere) expressed as x(y)
  // ------------------------------------------------------------------
  var SHORE_Y = [82, 90, 100, 112, 126, 144, 162, 186];
  var SHORE_X = [-6, 12, 34, 56, 76, 95, 112, 134];
  function shoreX(y) {
    if (y <= SHORE_Y[0]) return SHORE_X[0];
    for (var i = 0; i < SHORE_Y.length - 1; i++) {
      if (y <= SHORE_Y[i + 1]) {
        var t = (y - SHORE_Y[i]) / (SHORE_Y[i + 1] - SHORE_Y[i]);
        return lerp(SHORE_X[i], SHORE_X[i + 1], t);
      }
    }
    return SHORE_X[SHORE_X.length - 1];
  }
  function grassX(y) { return shoreX(y) - 7; }

  // ------------------------------------------------------------------
  // Static decoration generated once
  // ------------------------------------------------------------------
  var decor = { grass: [], flowers: [], pebbles: [], canopy: [], reeds: [], bubbles: [], shells: [] };
  (function buildDecor() {
    var i;
    for (i = 0; i < 70; i++) {
      var y = rr(96, 178);
      var gx = grassX(y);
      if (gx < 3) continue;
      decor.grass.push({ x: rr(1, gx - 1), y: y, h: rr(2, 5) });
    }
    var fcol = ['#ff6f7d', '#ffd23f', '#f7f0ff', '#ff9ad5', '#8fd7ff'];
    for (i = 0; i < 26; i++) {
      var fy = rr(102, 176);
      var fgx = grassX(fy);
      if (fgx < 4) continue;
      decor.flowers.push({ x: rr(2, fgx - 2), y: fy, c: fcol[(rnd() * fcol.length) | 0] });
    }
    for (i = 0; i < 26; i++) {
      var py = rr(90, 178);
      var a = grassX(py), b = shoreX(py);
      if (b - a < 2) continue;
      decor.pebbles.push({ x: rr(a + 1, b - 1), y: py, c: rnd() > 0.5 ? '#c9b48c' : '#a89474' });
    }
    for (i = 0; i < 30; i++) {
      var ang = rr(0, Math.PI * 2), rad = rr(0, 15);
      decor.canopy.push({ dx: Math.cos(ang) * rad, dy: Math.sin(ang) * rad * 0.8, r: rr(3, 6) });
    }
    for (i = 0; i < 16; i++) {
      var ry = rr(118, 178);
      var rx0 = shoreX(ry);
      decor.reeds.push({ x: rx0 + rr(-3, 3), y: ry, h: rr(6, 13) });
    }
    for (i = 0; i < 34; i++) decor.bubbles.push({ x: rr(10, 310), y: rr(8, 170), r: rr(1, 2), sp: rr(0.1, 0.4) });
    for (i = 0; i < 10; i++) {
      var sy = rr(96, 176), a2 = grassX(sy), b2 = shoreX(sy);
      if (b2 - a2 < 2) continue;
      decor.shells.push({ x: rr(a2, b2), y: sy });
    }
  })();

  // ------------------------------------------------------------------
  // Fish definitions
  // ------------------------------------------------------------------
  function baseFish(c, cx, cy, o) {
    var f = o.facing || 1, rx = o.rx, ry = o.ry;
    var top = o.top || o.body, belly = o.belly || o.body, fin = o.fin || o.body;
    var backX = cx - rx * f;
    var tl = Math.max(3, Math.round(rx * 0.6));
    for (var i = 1; i <= tl; i++) {
      var hh = Math.max(1, Math.round((i / tl) * ry * 0.9));
      c.fillStyle = fin;
      c.fillRect(backX - f * i, cy - hh, 1, hh);
      c.fillRect(backX - f * i, cy + 1, 1, hh);
    }
    for (var dx = -rx; dx <= rx; dx++) {
      var q = Math.sqrt(Math.max(0, 1 - (dx / rx) * (dx / rx)));
      var hh2 = Math.max(1, Math.round(ry * q));
      var x = cx + dx * f;
      c.fillStyle = o.body; c.fillRect(x, cy - hh2, 1, hh2 * 2);
      c.fillStyle = top; c.fillRect(x, cy - hh2, 1, Math.max(1, Math.round(hh2 * 0.45)));
      c.fillStyle = belly; c.fillRect(x, cy + hh2 - Math.max(1, Math.round(hh2 * 0.45)), 1, Math.max(1, Math.round(hh2 * 0.45)));
    }
    c.fillStyle = fin;
    for (var d = 0; d < 4; d++) c.fillRect(cx + (d - 1) * f, cy - ry - 1, 1, 2);
    c.fillRect(cx - 2 * f, cy + 1, 3, 1);
    c.fillRect(cx - 1 * f, cy + 2, 2, 1);
    var ex = cx + (rx - 2) * f;
    c.fillStyle = '#ffffff'; c.fillRect(ex - 1, cy - 2, 3, 3);
    c.fillStyle = '#20242c'; c.fillRect(ex, cy - 1, 1, 1);
    if (o.pattern) o.pattern(c, cx, cy, rx, ry, f);
  }

  function stripePattern(color, offs) {
    return function (c, cx, cy, rx, ry) {
      c.fillStyle = color;
      for (var i = 0; i < offs.length; i++) c.fillRect(cx + offs[i], cy - ry, 1, ry * 2);
    };
  }
  function spotPattern(color, pts) {
    return function (c, cx, cy) {
      c.fillStyle = color;
      for (var i = 0; i < pts.length; i++) c.fillRect(cx + pts[i][0] - 1, cy + pts[i][1] - 1, 2, 2);
    };
  }

  var FISH = {
    Common: [
      { name: 'Sunnyfin Perch', rx: 9, ry: 5, body: '#f0a43c', top: '#ffd27a', belly: '#ffe9b0', fin: '#e07b2a',
        pattern: stripePattern('#c96f1f', [-3, 0, 3]) },
      { name: 'Pebble Minnow', rx: 7, ry: 4, body: '#a3a9af', top: '#cfd4d8', belly: '#eef1f3', fin: '#7f878d',
        pattern: spotPattern('#6f767c', [[-3, -1], [1, 0], [4, -2]]) },
      { name: 'Dock Carp', rx: 10, ry: 6, body: '#8fa03c', top: '#b9c95f', belly: '#dbe58c', fin: '#6c7a2b',
        pattern: spotPattern('#5e6a22', [[-5, -2], [-2, 1], [2, -1], [5, 2], [0, -3]]) }
    ],
    Uncommon: [
      { name: 'Bluefin Herring', rx: 9, ry: 4, body: '#4f9fd8', top: '#9fd8f4', belly: '#e6f6ff', fin: '#2f6fae',
        pattern: stripePattern('#bfe8ff', [-1, 3]) },
      { name: 'Reed Puffer', rx: 8, ry: 8, body: '#7fbf5a', top: '#b2e07c', belly: '#eaf6b8', fin: '#5a9a3a',
        pattern: spotPattern('#4c7f33', [[-3, -3], [2, -4], [4, 1], [-2, 3]]) },
      { name: 'Coral Glassfish', rx: 8, ry: 5, body: '#ff9ec4', top: '#ffd3e4', belly: '#fff2f7', fin: '#e07aa8',
        pattern: function (c, cx, cy, rx, ry) { c.fillStyle = '#fff6fb'; c.fillRect(cx - 2, cy - ry + 1, 4, 1); } }
    ],
    Rare: [
      { name: 'Copper Duskfish', rx: 10, ry: 6, body: '#c8703a', top: '#eaa96a', belly: '#f8e0b4', fin: '#8f4a22',
        pattern: spotPattern('#7a3c1a', [[-4, -2], [0, 1], [4, -1], [6, 2]]) },
      { name: 'Moonlit Koi', rx: 10, ry: 6, body: '#f2f2ea', top: '#ffffff', belly: '#e6ecf0', fin: '#cfe0ea',
        pattern: spotPattern('#e8792f', [[-4, -2], [2, 1], [5, -2]]) }
    ],
    Epic: [
      { name: 'Storm Marlin', rx: 10, ry: 5, body: '#2f4f8f', top: '#6f9fe0', belly: '#c4daf8', fin: '#1f3560',
        pattern: stripePattern('#8fc0ff', [-1, 2]),
        extra: function (c, cx, cy, f) { c.fillStyle = '#1f3560'; c.fillRect(cx + (10) * f, cy - 1, 9 * f, 2); } },
      { name: 'Violet Coelacanth', rx: 10, ry: 6, body: '#7a4fb0', top: '#b78fe6', belly: '#e6d4fa', fin: '#5a2f8f',
        pattern: spotPattern('#3d1f66', [[-5, 0], [-2, 2], [1, -2], [4, 1], [6, -1]])
      }
    ],
    Legendary: [
      { name: 'Aurora Sturgeon', rx: 12, ry: 6, body: '#2fb0a0', top: '#8ff0e0', belly: '#d6fbf6', fin: '#1f8078',
        pattern: stripePattern('#c8fff8', [-4, -1, 2, 5]) }
    ],
    Ancient: [
      { name: 'Tidefather', rx: 12, ry: 7, body: '#3a4f6a', top: '#7f9fc4', belly: '#c2d6ec', fin: '#22303f',
        pattern: function (c, cx, cy, rx, ry) {
          c.fillStyle = '#5ff0e0';
          var pts = [[-5, -2], [-2, 1], [1, -3], [3, 2], [5, -1], [0, 0]];
          for (var i = 0; i < pts.length; i++) c.fillRect(cx + pts[i][0], cy + pts[i][1], 1, 1);
        },
        extra: function (c, cx, cy, f) {
          c.fillStyle = '#22303f';
          c.fillRect(cx + (12) * f, cy - 2, 3, 1);
          c.fillRect(cx + (12) * f, cy + 1, 3, 1);
        }
      }
    ]
  };

  function drawFishArt(c, fish, cx, cy, facing) {
    baseFish(c, cx, cy, {
      rx: fish.rx, ry: fish.ry, body: fish.body, top: fish.top, belly: fish.belly,
      fin: fish.fin, facing: facing || 1, pattern: fish.pattern
    });
    if (fish.extra) fish.extra(c, cx, cy, facing || 1);
  }

  // ------------------------------------------------------------------
  // Rarity
  // ------------------------------------------------------------------
  function pickRarity(u) {
    u = Number(u);
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  var RARITY_COLORS = {
    Common: '#c3ccd4', Uncommon: '#6fd36f', Rare: '#5aa8ff',
    Epic: '#b06bff', Legendary: '#ffc83d', Ancient: '#5ff0e0'
  };
  var RARITY_ODDS = { Common: '45%', Uncommon: '25%', Rare: '15%', Epic: '8%', Legendary: '5%', Ancient: '2%' };

  // ------------------------------------------------------------------
  // Game state
  // ------------------------------------------------------------------
  var CAST_DUR = 0.6, REEL_DUR = 1.2, REVEAL_DUR = 1.9, BITE_WINDOW = 1.6;
  var phase = 'ready'; // ready | casting | waiting | bite | reeling | reveal
  var time = 0;
  var castT = 0, waitT = 0, biteT = 0, reelT = 0, revealT = 0, missFlash = 0;
  var retracting = false, retractT = 0;
  var bobber = { sx: 0, sy: 0, tx: 0, ty: 0, x: 0, y: 0, cx: 0, cy: 0, spin: 0 };
  var ripples = [], drops = [];
  var currentFish = null, currentRarity = null;
  var hintPulse = 0;

  function log() { return window.fishing.log; }

  function startCast() {
    phase = 'casting';
    castT = 0;
    retracting = false;
    currentFish = null; currentRarity = null;
    var tip = rodTip();
    bobber.sx = tip.x; bobber.sy = tip.y;
    bobber.tx = 150 + Math.random() * 100;
    bobber.ty = 46 + Math.random() * 44;
    bobber.spin = 0;
  }

  function reelIn() {
    phase = 'reeling';
    reelT = 0;
    var rarity = window.fishing.pickRarity(Math.random());
    var list = FISH[rarity];
    var fish = list[(Math.random() * list.length) | 0];
    currentRarity = rarity;
    currentFish = fish;
    window.fishing.log.unshift({ name: fish.name, rarity: rarity });
    // splash at bobber
    for (var i = 0; i < 18; i++) {
      var a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 18;
      drops.push({ x: bobber.x, y: bobber.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, life: 0.6, t: 0 });
    }
  }

  function missBite() {
    phase = 'ready';
    missFlash = 1.1;
    retracting = true; retractT = 0;
    for (var i = 0; i < 10; i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 10;
      drops.push({ x: bobber.x, y: bobber.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, life: 0.45, t: 0, c: '#bfeaf2' });
    }
  }

  function act() {
    if (phase === 'ready') startCast();
    else if (phase === 'bite') reelIn();
  }

  // ------------------------------------------------------------------
  // Rod geometry
  // ------------------------------------------------------------------
  function rodAngle() {
    if (phase === 'casting') {
      var p = clamp(castT / CAST_DUR, 0, 1);
      if (p < 0.35) return lerp(-62, -108, p / 0.35);
      return lerp(-108, -24, (p - 0.35) / 0.65);
    }
    if (phase === 'reeling') return lerp(-24, -72, clamp(reelT / REEL_DUR, 0, 1));
    return -62;
  }
  function rodTip() {
    var a = rodAngle() * Math.PI / 180;
    return { x: 82 + Math.cos(a) * 36, y: 100 + Math.sin(a) * 36 };
  }

  // ------------------------------------------------------------------
  // Bobber position
  // ------------------------------------------------------------------
  function bobberPos() {
    var tip = rodTip();
    if (phase === 'casting') {
      var p = easeOut(clamp(castT / CAST_DUR, 0, 1));
      var mx = (bobber.sx + bobber.tx) / 2, my = Math.min(bobber.sy, bobber.ty) - 22;
      var it = 1 - p;
      return { x: it * it * bobber.sx + 2 * it * p * mx + p * p * bobber.tx,
               y: it * it * bobber.sy + 2 * it * p * my + p * p * bobber.ty, vis: true };
    }
    if (phase === 'waiting') {
      return { x: bobber.tx, y: bobber.ty + Math.sin(time * 2.6) * 0.9, vis: true };
    }
    if (phase === 'bite') {
      var dip = Math.abs(Math.sin(time * 22)) * 2.2;
      return { x: bobber.tx, y: bobber.ty + dip, vis: true };
    }
    if (phase === 'reeling') {
      var t = smooth(clamp(reelT / REEL_DUR, 0, 1));
      return { x: lerp(bobber.tx, tip.x, t), y: lerp(bobber.ty, tip.y, t), vis: true };
    }
    if (retracting) {
      var t2 = smooth(clamp(retractT / 0.5, 0, 1));
      return { x: lerp(bobber.x, tip.x, t2), y: lerp(bobber.y, tip.y, t2), vis: t2 < 1 };
    }
    return { x: tip.x, y: tip.y, vis: false };
  }

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------
  function update(dt) {
    time += dt;
    hintPulse += dt;
    if (missFlash > 0) missFlash -= dt;

    if (phase === 'casting') {
      castT += dt;
      if (castT >= CAST_DUR) {
        phase = 'waiting';
        waitT = 1.4 + Math.random() * 1.9;
        bobber.x = bobber.tx; bobber.y = bobber.ty;
        for (var i = 0; i < 12; i++) {
          var a = Math.random() * Math.PI * 2, sp = 5 + Math.random() * 14;
          drops.push({ x: bobber.tx, y: bobber.ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 8, life: 0.55, t: 0, c: '#dff8ff' });
        }
        ripples.push({ x: bobber.tx, y: bobber.ty, r: 0, max: 12, t: 0, life: 1.1 });
      }
    } else if (phase === 'waiting') {
      waitT -= dt;
      bobber.x = bobber.tx; bobber.y = bobber.ty;
      if (Math.random() < dt * 1.1) ripples.push({ x: bobber.tx + rr(-2, 2), y: bobber.ty + rr(-1, 1), r: 0, max: 7, t: 0, life: 0.8 });
      if (waitT <= 0) { phase = 'bite'; biteT = BITE_WINDOW; }
    } else if (phase === 'bite') {
      biteT -= dt;
      bobber.x = bobber.tx; bobber.y = bobber.ty;
      if (Math.random() < dt * 12) ripples.push({ x: bobber.tx + rr(-2, 2), y: bobber.ty + rr(-2, 2), r: 0, max: 8, t: 0, life: 0.5 });
      if (biteT <= 0) missBite();
    } else if (phase === 'reeling') {
      reelT += dt;
      bobber.x = bobberPos().x; bobber.y = bobberPos().y;
      if (Math.random() < dt * 30) {
        drops.push({ x: bobber.x + rr(-3, 3), y: bobber.y + rr(-2, 2), vx: rr(-8, 8), vy: rr(-16, -4), life: 0.4, t: 0, c: '#eafcff' });
      }
      if (reelT >= REEL_DUR) { phase = 'reveal'; revealT = 0; }
    } else if (phase === 'reveal') {
      revealT += dt;
      if (revealT >= REVEAL_DUR) { phase = 'ready'; currentFish = null; currentRarity = null; }
    } else if (retracting) {
      retractT += dt;
      if (retractT >= 0.5) retracting = false;
    }

    // particles
    for (var d = drops.length - 1; d >= 0; d--) {
      var dr = drops[d];
      dr.t += dt; dr.x += dr.vx * dt; dr.y += dr.vy * dt; dr.vy += 42 * dt;
      if (dr.t >= dr.life) drops.splice(d, 1);
    }
    for (var rp = ripples.length - 1; rp >= 0; rp--) {
      var r0 = ripples[rp];
      r0.t += dt; r0.r = (r0.t / r0.life) * r0.max;
      if (r0.t >= r0.life) ripples.splice(rp, 1);
    }
  }

  // ------------------------------------------------------------------
  // Scene drawing
  // ------------------------------------------------------------------
  function drawWater(t) {
    var g = s.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, '#1f567a');
    g.addColorStop(0.4, '#2c7896');
    g.addColorStop(0.75, '#3f9cb0');
    g.addColorStop(1, '#57b6bd');
    s.fillStyle = g; s.fillRect(0, 0, 320, 180);

    // moving wave dashes
    for (var row = 0; row < 25; row++) {
      var y = 4 + row * 7;
      var depth = row / 25;
      var speed = 6 + depth * 20;
      var off = (t * speed) % 24;
      for (var x = -24; x < 320; x += 24) {
        var xx = x + off;
        var bob = Math.sin(xx * 0.05 + t * (1 + depth) + row) * 1.2;
        var alpha = (0.05 + depth * 0.10).toFixed(3);
        s.fillStyle = 'rgba(190,240,248,' + alpha + ')';
        s.fillRect(xx | 0, (y + bob) | 0, 6 + (row % 3) * 4, 1);
      }
    }
    // sparkles
    for (var i = 0; i < 70; i++) {
      var sx = (i * 97 + ((i * i * 13) % 53)) % 320;
      var sy = 6 + ((i * 61) % 168);
      var tw = Math.sin(t * 2 + i * 1.7);
      if (tw > 0.6) {
        s.fillStyle = 'rgba(235,255,255,' + ((tw - 0.6) * 1.6).toFixed(2) + ')';
        s.fillRect(sx, sy, 2, 1);
        if (tw > 0.88) { s.fillRect(sx - 1, sy, 1, 1); s.fillRect(sx + 2, sy, 1, 1); s.fillRect(sx, sy - 1, 1, 1); s.fillRect(sx, sy + 1, 1, 1); }
      }
    }
    // rising bubbles
    for (var b = 0; b < decor.bubbles.length; b++) {
      var bb = decor.bubbles[b];
      var by = (bb.y - t * bb.sp * 8) % 180; if (by < 0) by += 180;
      s.fillStyle = 'rgba(220,250,255,0.18)';
      s.fillRect(bb.x | 0, by | 0, bb.r, bb.r);
    }
    // drifting cloud shadows
    for (var cs = 0; cs < 3; cs++) {
      var cxx = ((t * (6 + cs * 3) + cs * 150) % 520) - 100;
      var cyy = 30 + cs * 52 + Math.sin(t * 0.3 + cs) * 8;
      s.fillStyle = 'rgba(8,30,48,0.055)';
      for (var yy2 = -18; yy2 <= 18; yy2++) {
        var hw = Math.round(34 * Math.sqrt(Math.max(0, 1 - (yy2 / 18) * (yy2 / 18))));
        s.fillRect((cxx - hw) | 0, (cyy + yy2) | 0, hw * 2, 1);
      }
    }
  }

  function drawShore() {
    // glow / shallow band just outside the shore
    for (var y = 82; y < 180; y++) {
      var sx = shoreX(y);
      s.fillStyle = 'rgba(150,235,225,0.16)';
      s.fillRect((sx + 1) | 0, y, 3, 1);
    }
    // land rows
    for (var yy = 82; yy < 180; yy++) {
      var sx2 = shoreX(yy);
      if (sx2 <= 0) continue;
      var t = clamp((yy - 82) / 98, 0, 1);
      var sand = t < 0.5 ? '#e8ca8c' : '#dcb977';
      R(0, yy, Math.ceil(sx2), 1, sand);
      // wet sand at edge
      s.fillStyle = 'rgba(150,110,70,0.35)';
      s.fillRect((sx2 - 2) | 0, yy, 2, 1);
      var gx = grassX(yy);
      if (gx > 0) {
        var gc = '#5aa848';
        if (((yy * 7) % 5) === 0) gc = '#4f9d3f';
        if (((yy * 3) % 7) === 0) gc = '#6fc057';
        R(0, yy, Math.ceil(gx), 1, gc);
        s.fillStyle = 'rgba(60,110,50,0.5)';
        s.fillRect((gx - 1) | 0, yy, 1, 1);
      }
    }
    // pebbles + shells on the sand
    for (var i = 0; i < decor.pebbles.length; i++) {
      var p = decor.pebbles[i];
      s.fillStyle = p.c; s.fillRect(p.x | 0, p.y | 0, 2, 2);
      s.fillStyle = 'rgba(255,255,255,0.25)'; s.fillRect(p.x | 0, p.y | 0, 1, 1);
    }
    for (var j = 0; j < decor.shells.length; j++) {
      var sh = decor.shells[j];
      s.fillStyle = '#f7e6cf'; s.fillRect(sh.x | 0, sh.y | 0, 3, 2);
      s.fillStyle = '#d9b48c'; s.fillRect(sh.x | 0, sh.y + 1, 3, 1);
    }
    // foam line
    for (var fy = 84; fy < 180; fy += 1) {
      var fx = shoreX(fy);
      if (fx < 0) continue;
      var wob = (Math.sin(fy * 0.7 + time * 1.5) > 0.4) ? 1 : 0;
      s.fillStyle = 'rgba(255,255,255,' + (0.18 + wob * 0.16).toFixed(2) + ')';
      s.fillRect((fx + wob) | 0, fy, 1, 1);
    }
  }

  function drawLandDetails() {
    // grass tufts
    for (var i = 0; i < decor.grass.length; i++) {
      var g = decor.grass[i];
      var sway = Math.sin(time * 1.5 + g.x) * 0.6;
      s.fillStyle = '#3f8a34';
      s.fillRect(g.x | 0, (g.y - g.h) | 0, 1, g.h);
      s.fillStyle = '#7fd060';
      s.fillRect((g.x + sway) | 0, (g.y - g.h) | 0, 1, g.h - 1);
    }
    // flowers
    for (var f = 0; f < decor.flowers.length; f++) {
      var fl = decor.flowers[f];
      s.fillStyle = '#3f7a34'; s.fillRect(fl.x | 0, fl.y | 0, 1, 2);
      s.fillStyle = fl.c; s.fillRect(fl.x | 0, (fl.y - 1) | 0, 1, 1);
      s.fillStyle = 'rgba(255,255,255,0.7)'; s.fillRect(fl.x | 0, (fl.y - 1) | 0, 1, 1);
    }
    // rocks near the shore
    var rocks = [[84, 122, 5], [73, 114, 4], [100, 140, 6], [61, 158, 4], [44, 166, 5]];
    for (var r = 0; r < rocks.length; r++) {
      var rk = rocks[r];
      pcircle(s, rk[0], rk[1], rk[2], '#8a969c');
      pcircle(s, rk[0] - 1, rk[1] - 1, rk[2] - 2, '#aab4ba');
      s.fillStyle = 'rgba(255,255,255,0.35)'; s.fillRect(rk[0] - 1, rk[1] - rk[2], 2, 1);
      s.fillStyle = 'rgba(40,60,70,0.3)'; s.fillRect(rk[0] - rk[2], rk[1] + rk[2] - 1, rk[2] * 2, 2);
    }
    // bush
    drawBush(52, 150, 9);
    drawBush(76, 168, 7);
    // tree
    drawTree(20, 150);
  }

  function drawBush(x, y, rr_) {
    pcircle(s, x, y, rr_, '#2f7a42');
    pcircle(s, x - 2, y - 2, rr_ - 2, '#3f9d54');
    pcircle(s, x + 2, y - 1, rr_ - 3, '#57b86b');
    s.fillStyle = 'rgba(20,50,30,0.35)'; s.fillRect(x - rr_, y + rr_ - 1, rr_ * 2, 2);
  }

  function drawTree(x, y) {
    // trunk
    s.fillStyle = '#6b4226'; s.fillRect(x - 2, y, 4, 20);
    s.fillStyle = '#8a5a3a'; s.fillRect(x - 2, y, 2, 20);
    // canopy clusters
    for (var i = 0; i < decor.canopy.length; i++) {
      var c = decor.canopy[i];
      var cx = x + c.dx, cy = y - 6 + c.dy;
      pcircle(s, cx | 0, cy | 0, c.r, '#2b6f3c');
      pcircle(s, (cx - 1) | 0, (cy - 1) | 0, c.r - 1, '#3f9d54');
      pcircle(s, (cx - 2) | 0, (cy - 2) | 0, Math.max(1, c.r - 3), '#5cbf70');
    }
    // canopy shadow on water
    s.fillStyle = 'rgba(15,60,60,0.14)';
    pcircle(s, x + 12, y - 2, 14, 'rgba(15,60,60,0.10)');
  }

  function drawDock() {
    // shadow in water
    s.fillStyle = 'rgba(10,40,55,0.28)';
    s.fillRect(50, 118, 106, 5);
    // posts reflection
    s.fillStyle = 'rgba(40,30,20,0.25)';
    s.fillRect(51, 118, 3, 9); s.fillRect(81, 118, 3, 9); s.fillRect(111, 118, 3, 9); s.fillRect(147, 118, 3, 9);
    // main deck
    s.fillStyle = '#9c6c3f'; s.fillRect(46, 101, 106, 17);
    // planks
    for (var x = 46; x < 152; x += 9) {
      s.fillStyle = (x / 9) % 2 === 0 ? '#b07e4e' : '#a77547';
      s.fillRect(x, 101, 8, 17);
      s.fillStyle = '#7d5530'; s.fillRect(x + 8, 101, 1, 17);
      s.fillStyle = 'rgba(255,235,200,0.18)'; s.fillRect(x, 101, 8, 2);
      // nails
      s.fillStyle = '#5c3f24'; s.fillRect(x + 2, 104, 1, 1); s.fillRect(x + 2, 114, 1, 1);
    }
    // stringers
    s.fillStyle = '#6f4a2a'; s.fillRect(46, 102, 106, 2); s.fillRect(46, 116, 106, 2);
    // posts
    var posts = [52, 82, 112, 148];
    for (var p = 0; p < posts.length; p++) {
      s.fillStyle = '#5c3f24'; s.fillRect(posts[p] - 2, 98, 5, 5);
      s.fillStyle = '#7d5530'; s.fillRect(posts[p] - 2, 98, 2, 5);
    }
    // items: rope coil, bucket, lantern
    // rope coil
    pcircleOutline(s, 104, 111, 4, '#c9a96a');
    pcircleOutline(s, 104, 111, 2, '#b8985a');
    // bucket
    s.fillStyle = '#8a8f94'; s.fillRect(128, 104, 8, 9);
    s.fillStyle = '#a8adb2'; s.fillRect(128, 104, 8, 2);
    s.fillStyle = '#5f6469'; s.fillRect(128, 112, 8, 1);
    s.fillStyle = '#6f7479'; s.fillRect(127, 103, 10, 1);
    s.fillStyle = '#3f4449'; s.fillRect(131, 102, 2, 1);
    // lantern
    s.fillStyle = '#4a4f54'; s.fillRect(57, 99, 1, 4);
    s.fillStyle = '#ffdf8a'; s.fillRect(55, 96, 5, 4);
    s.fillStyle = '#6f4a2a'; s.fillRect(55, 95, 5, 1); s.fillRect(55, 100, 5, 1);
  }

  function drawAngler() {
    var x = 74, baseY = 116;
    // shadow
    s.fillStyle = 'rgba(20,30,40,0.30)';
    pcircle(s, x, baseY, 6, 'rgba(20,30,40,0.25)');
    // legs
    s.fillStyle = '#3a4a63'; s.fillRect(x - 4, baseY - 5, 3, 5); s.fillRect(x + 1, baseY - 5, 3, 5);
    // body / coat
    pcircle(s, x, 106, 6, '#2f6f66');
    pcircle(s, x, 105, 5, '#3f8f82');
    s.fillStyle = '#5fbfa8'; s.fillRect(x - 2, 101, 4, 2);
    // arms reaching right toward rod
    s.fillStyle = '#3f8f82'; s.fillRect(x + 3, 102, 5, 3);
    s.fillStyle = '#e0b088'; s.fillRect(x + 7, 102, 2, 2);
    // head (back of)
    s.fillStyle = '#e0b088'; s.fillRect(x - 2, 96, 4, 4);
    // hat brim + crown
    pcircle(s, x, 96, 7, '#c99a4a');
    s.fillStyle = 'rgba(0,0,0,0.18)'; s.fillRect(x - 7, 96, 14, 2);
    pcircle(s, x, 94, 5, '#e0b45a');
    pcircle(s, x - 1, 93, 3, '#f0c86a');
    s.fillStyle = '#8a5a2a'; s.fillRect(x - 5, 95, 10, 1);
  }

  function drawRodAndLine() {
    var tip = rodTip();
    var hand = { x: 82, y: 100 };
    // rod
    var steps = 36;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = lerp(hand.x, tip.x, t), y = lerp(hand.y, tip.y, t);
      s.fillStyle = i % 6 === 0 ? '#5a3a20' : '#8a5a34';
      s.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // reel
    pcircle(s, hand.x + 3, hand.y + 1, 2, '#c9c9d4');
    pcircle(s, hand.x + 3, hand.y + 1, 1, '#4a4f5a');

    var bp = bobberPos();
    if (bp.vis) {
      var sag = phase === 'waiting' || phase === 'bite' ? 4 : 2;
      drawLinePix(tip.x, tip.y, bp.x, bp.y, sag, 'rgba(235,245,255,0.75)');
      drawBobber(bp.x, bp.y);
    } else {
      // dangle a short line + hook
      drawLinePix(tip.x, tip.y, tip.x + 1, tip.y + 6, 1, 'rgba(235,245,255,0.7)');
      s.fillStyle = '#c9c9d4'; s.fillRect(Math.round(tip.x) + 1, Math.round(tip.y) + 6, 1, 2);
    }
  }

  function drawLinePix(x0, y0, x1, y1, sag, color) {
    var N = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    var cxp = (x0 + x1) / 2, cyp = (y0 + y1) / 2 + sag;
    s.fillStyle = color;
    for (var i = 0; i <= N; i++) {
      var t = i / N, it = 1 - t;
      var x = it * it * x0 + 2 * it * t * cxp + t * t * x1;
      var y = it * it * y0 + 2 * it * t * cyp + t * t * y1;
      s.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  function drawBobber(x, y) {
    var bx = Math.round(x), by = Math.round(y);
    // ripples already drawn separately
    s.fillStyle = 'rgba(15,50,60,0.35)'; s.fillRect(bx - 1, by + 3, 4, 1);
    s.fillStyle = '#f4f4f4'; s.fillRect(bx - 1, by - 2, 3, 3);
    s.fillStyle = '#e5484d'; s.fillRect(bx - 1, by - 4, 3, 2);
    s.fillStyle = '#ffffff'; s.fillRect(bx, by - 4, 1, 1);
    s.fillStyle = '#9aa0a6'; s.fillRect(bx, by + 1, 1, 2);
    s.fillStyle = '#3a3f45'; s.fillRect(bx, by + 3, 1, 1);
  }

  function drawEffects() {
    // ripples
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var a = clamp(1 - r.t / r.life, 0, 1);
      pcircleOutline(s, r.x, r.y, r.r, 'rgba(220,250,255,' + (a * 0.6).toFixed(2) + ')');
    }
    // drops
    for (var d = 0; d < drops.length; d++) {
      var dr = drops[d];
      var da = clamp(1 - dr.t / dr.life, 0, 1);
      s.fillStyle = dr.c || 'rgba(235,252,255,0.9)';
      s.globalAlpha = da;
      s.fillRect(dr.x | 0, dr.y | 0, 1, 1);
      s.globalAlpha = 1;
    }
  }

  function drawAmbient() {
    // warm drifting pollen motes
    for (var i = 0; i < 26; i++) {
      var mx = (i * 137 + time * (5 + (i % 4))) % 340 - 10;
      var my = 18 + ((i * 71) % 150) + Math.sin(time * 0.7 + i * 1.9) * 4;
      var tw = 0.5 + 0.5 * Math.sin(time * 2.4 + i * 1.3);
      s.fillStyle = 'rgba(255,240,170,' + (0.18 + tw * 0.5).toFixed(2) + ')';
      s.fillRect(mx | 0, my | 0, 1, 1);
    }
    // dragonfly hovering over the shallows
    var dx = 236 + Math.sin(time * 0.8) * 22;
    var dy = 128 + Math.cos(time * 1.3) * 12;
    s.fillStyle = '#2f8f7f'; s.fillRect((dx - 2) | 0, dy | 0, 5, 1);
    s.fillStyle = '#4fc0a8'; s.fillRect((dx - 1) | 0, (dy - 1) | 0, 3, 1);
    s.fillStyle = '#112233'; s.fillRect((dx + 3) | 0, dy, 1, 1);
    var flap = Math.sin(time * 30) * 1.5;
    s.fillStyle = 'rgba(200,245,255,0.55)';
    s.fillRect((dx - 1) | 0, (dy - 2 + flap) | 0, 2, 1);
    s.fillRect((dx + 1) | 0, (dy - 2 - flap) | 0, 2, 1);
  }

  function drawFrog() {
    var fx = 186, fy = 148;
    s.fillStyle = '#3f9d54'; s.fillRect(fx - 3, fy - 2, 7, 4);
    s.fillStyle = '#57b86b'; s.fillRect(fx - 2, fy - 3, 5, 2);
    s.fillStyle = '#dff6c0'; s.fillRect(fx - 1, fy, 3, 2);
    var blink = (Math.sin(time * 1.1) > 0.97) ? 1 : 0;
    s.fillStyle = '#204a28'; s.fillRect(fx - 3, fy - 4, 2, 2); s.fillRect(fx + 2, fy - 4, 2, 2);
    if (!blink) { s.fillStyle = '#f6ffe0'; s.fillRect(fx - 3, fy - 4, 1, 1); s.fillRect(fx + 2, fy - 4, 1, 1); }
  }

  function drawForeground() {
    // reeds along the lower shore, drawn over water edge
    for (var i = 0; i < decor.reeds.length; i++) {
      var rd = decor.reeds[i];
      var sway = Math.sin(time * 1.8 + rd.y * 0.3) * 1.5;
      s.fillStyle = '#3f7a3a';
      for (var k = 0; k < 3; k++) {
        var off = (k - 1) * 1.5;
        s.fillRect((rd.x + off + sway * (1 + k * 0.2)) | 0, (rd.y - rd.h) | 0, 1, rd.h);
      }
      s.fillStyle = '#7a5a2a'; s.fillRect((rd.x - 1 + sway) | 0, (rd.y - rd.h - 3) | 0, 2, 4);
    }
    // a few lily pads
    var pads = [[186, 150, 6], [214, 166, 5], [166, 168, 4], [246, 138, 6], [280, 160, 5]];
    for (var p = 0; p < pads.length; p++) {
      var pd = pads[p];
      var py = pd[1] + Math.sin(time * 1.2 + pd[0]) * 0.8;
      pcircle(s, pd[0], py | 0, pd[2], '#2f8a4a');
      s.fillStyle = '#4fb86a';
      s.fillRect((pd[0] - pd[2]) | 0, (py - 1) | 0, pd[2] * 2, 2);
      s.fillStyle = '#2f8a4a';
      s.fillRect(pd[0] | 0, (py - pd[2]) | 0, 1, pd[2]);
    }
    drawFrog();
  }

  function drawVignette() {
    var g = s.createRadialGradient(150, 90, 60, 150, 90, 200);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,20,35,0.34)');
    s.fillStyle = g; s.fillRect(0, 0, 320, 180);
  }

  // ------------------------------------------------------------------
  // Reveal panel
  // ------------------------------------------------------------------
  var fishBuffer = null, fishBufferRarity = null;
  function getFishBuffer(fish) {
    if (fishBuffer && fishBufferRarity === fish) return fishBuffer;
    var b = document.createElement('canvas'); b.width = 64; b.height = 44;
    var bc = b.getContext('2d'); bc.imageSmoothingEnabled = false;
    drawFishArt(bc, fish, 30, 22, 1);
    // Build an outlined version so the fish reads on any panel background.
    var o = document.createElement('canvas'); o.width = 64; o.height = 44;
    var oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
    if ('filter' in oc) {
      oc.filter = 'brightness(0)';
      oc.globalAlpha = 0.5;
      var offs = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]];
      for (var i = 0; i < offs.length; i++) oc.drawImage(b, offs[i][0], offs[i][1]);
      oc.filter = 'none';
      oc.globalAlpha = 1;
    }
    oc.drawImage(b, 0, 0);
    fishBuffer = o; fishBufferRarity = fish;
    return fishBuffer;
  }

  function revealPalette(rarity) {
    switch (rarity) {
      case 'Common': return { bg0: '#3a2e22', bg1: '#241d16', edge: '#b98a5a', edge2: '#8a6438', glow: 'rgba(185,138,90,0.25)' };
      case 'Uncommon': return { bg0: '#1d3a24', bg1: '#12251a', edge: '#6fd36f', edge2: '#3f8f4a', glow: 'rgba(111,211,111,0.3)' };
      case 'Rare': return { bg0: '#172a4a', bg1: '#0f1b33', edge: '#5aa8ff', edge2: '#2f6fbf', glow: 'rgba(90,168,255,0.35)' };
      case 'Epic': return { bg0: '#2a1a44', bg1: '#180f2b', edge: '#b06bff', edge2: '#7135c0', glow: 'rgba(176,107,255,0.4)' };
      case 'Legendary': return { bg0: '#4a3714', bg1: '#2b1f0a', edge: '#ffc83d', edge2: '#c08a1f', glow: 'rgba(255,200,61,0.45)' };
      case 'Ancient': return { bg0: '#0a1420', bg1: '#04080e', edge: '#5ff0e0', edge2: '#2f8f9a', glow: 'rgba(95,240,224,0.5)' };
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawReveal() {
    if (phase !== 'reveal' || !currentFish) return;
    var t = revealT;
    var pop = easeOut(clamp(t / 0.3, 0, 1));
    var cx = 512, cy = 356;
    var w = 620 * (0.6 + 0.4 * pop), h = 450 * (0.6 + 0.4 * pop);
    var pal = revealPalette(currentRarity);

    // dim the scene
    ctx.fillStyle = 'rgba(6,10,18,' + (0.5 * pop).toFixed(2) + ')';
    ctx.fillRect(0, 0, CW, CH);

    // background glow for higher tiers
    if (currentRarity === 'Epic' || currentRarity === 'Legendary' || currentRarity === 'Ancient') {
      var gg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 340);
      gg.addColorStop(0, pal.glow);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, CW, CH);
    }

    // rotating rays for Legendary / Ancient
    if (currentRarity === 'Legendary' || currentRarity === 'Ancient') {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * (currentRarity === 'Ancient' ? 0.25 : 0.5));
      for (var ry = 0; ry < 12; ry++) {
        ctx.rotate(Math.PI * 2 / 12);
        ctx.fillStyle = currentRarity === 'Ancient' ? 'rgba(95,240,224,0.08)' : 'rgba(255,210,90,0.10)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(340, -18); ctx.lineTo(340, 18); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // panel
    var grad = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    grad.addColorStop(0, pal.bg0); grad.addColorStop(1, pal.bg1);
    ctx.fillStyle = pal.glow; roundRect(ctx, cx - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 12, 18); ctx.fill();
    ctx.fillStyle = grad; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 14); ctx.fill();

    // border style varies by tier
    var borderW = currentRarity === 'Common' ? 3 : currentRarity === 'Uncommon' ? 5 : 6;
    ctx.lineWidth = borderW; ctx.strokeStyle = pal.edge;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 14); ctx.stroke();
    if (currentRarity !== 'Common') {
      ctx.lineWidth = 2; ctx.strokeStyle = pal.edge2;
      roundRect(ctx, cx - w / 2 + 7, cy - h / 2 + 7, w - 14, h - 14, 10); ctx.stroke();
    }

    // corner ornaments for Epic+
    if (currentRarity === 'Epic' || currentRarity === 'Legendary' || currentRarity === 'Ancient') {
      ctx.fillStyle = pal.edge;
      var cxs = [cx - w / 2 + 16, cx + w / 2 - 16], cys = [cy - h / 2 + 16, cy + h / 2 - 16];
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
        ctx.fillRect(cxs[i] - 6, cys[j] - 1, 12, 2);
        ctx.fillRect(cxs[i] - 1, cys[j] - 6, 2, 12);
      }
    }

    // tier-specific particles
    drawRevealParticles(cx, cy, w, h, t);

    // fish art
    var buf = getFishBuffer(currentFish);
    var factor = 8;
    var bob = Math.sin(t * 2.2) * 5;
    ctx.imageSmoothingEnabled = false;
    var dw = buf.width * factor, dh = buf.height * factor;
    var fx = cx - dw / 2, fy = cy - 40 - dh / 2 + bob;
    // subtle aura behind fish
    var ag = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy - 30, 180);
    ag.addColorStop(0, pal.glow); ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag; ctx.fillRect(cx - 220, cy - 200, 440, 300);
    ctx.drawImage(buf, fx, fy, dw, dh);

    // Ancient ring around fish
    if (currentRarity === 'Ancient') {
      ctx.save(); ctx.translate(cx, cy - 30);
      for (var ring = 0; ring < 2; ring++) {
        ctx.rotate(t * (ring ? -0.4 : 0.6));
        ctx.strokeStyle = 'rgba(95,240,224,' + (0.5 - ring * 0.2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        var rr_ = 150 + ring * 26;
        for (var a = 0; a < Math.PI * 2; a += Math.PI / 12) {
          var px = Math.cos(a) * rr_, py = Math.sin(a) * rr_ * 0.62;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }

    // name
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillText(currentFish.name.toUpperCase(), cx, cy + 96);
    // rarity word
    ctx.fillStyle = RARITY_COLORS[currentRarity];
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.fillText('~ ' + currentRarity.toUpperCase() + ' ~', cx, cy + 136);
    // odds hint
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '15px "Courier New", monospace';
    ctx.fillText(RARITY_ODDS[currentRarity] + ' chance', cx, cy + 164);
    ctx.textAlign = 'left';
  }

  function drawRevealParticles(cx, cy, w, h, t) {
    var n, i, a, px, py;
    if (currentRarity === 'Uncommon') {
      for (i = 0; i < 14; i++) {
        var by = cy + h / 2 - ((t * 40 + i * 30) % h);
        px = cx - w / 2 + ((i * 97) % w);
        a = 0.15 + 0.12 * Math.sin(t * 3 + i);
        ctx.fillStyle = 'rgba(180,240,200,' + a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(px, by, 3 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    } else if (currentRarity === 'Rare') {
      for (i = 0; i < 22; i++) {
        px = cx - w / 2 + ((i * 61) % w);
        py = cy - h / 2 + ((i * 89) % h);
        a = Math.abs(Math.sin(t * 2 + i));
        if (a > 0.5) {
          ctx.fillStyle = 'rgba(180,225,255,' + ((a - 0.5) * 1.6).toFixed(2) + ')';
          ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3);
        }
      }
    } else if (currentRarity === 'Epic') {
      for (i = 0; i < 26; i++) {
        var ey = cy + h / 2 - ((t * 50 + i * 24) % h);
        px = cx - w / 2 + ((i * 73) % w);
        a = clamp(1 - ((t * 50 + i * 24) % h) / h, 0, 1);
        ctx.fillStyle = 'rgba(200,140,255,' + (a * 0.8).toFixed(2) + ')';
        ctx.fillRect(px, ey, 2, 2);
      }
    } else if (currentRarity === 'Legendary') {
      for (i = 0; i < 30; i++) {
        px = cx - w / 2 + ((i * 53) % w);
        py = cy - h / 2 + (((i * 97) + t * 30) % h);
        a = Math.abs(Math.sin(t * 3 + i * 1.3));
        ctx.fillStyle = 'rgba(255,225,130,' + (a * 0.9).toFixed(2) + ')';
        ctx.fillRect(px, py, 2, 2);
        if (a > 0.8) { ctx.fillRect(px - 2, py + 1, 6, 1); ctx.fillRect(px + 1, py - 2, 1, 6); }
      }
    } else if (currentRarity === 'Ancient') {
      // constellation lines + stars
      var stars = [];
      for (i = 0; i < 16; i++) {
        px = cx - w / 2 + ((i * 83) % w);
        py = cy - h / 2 + ((i * 121) % h);
        stars.push([px, py]);
      }
      ctx.strokeStyle = 'rgba(95,240,224,0.25)'; ctx.lineWidth = 1;
      for (i = 0; i < stars.length - 1; i++) {
        ctx.beginPath(); ctx.moveTo(stars[i][0], stars[i][1]); ctx.lineTo(stars[i + 1][0], stars[i + 1][1]); ctx.stroke();
      }
      for (i = 0; i < stars.length; i++) {
        a = 0.4 + 0.4 * Math.sin(t * 2 + i);
        ctx.fillStyle = 'rgba(160,255,245,' + a.toFixed(2) + ')';
        ctx.fillRect(stars[i][0], stars[i][1], 2, 2);
      }
      // floating runes
      var runes = ['#', '%', '&', 'X', 'O', '+'];
      ctx.font = 'bold 20px "Courier New", monospace';
      for (i = 0; i < 6; i++) {
        var rgx = cx - w / 2 + 60 + i * 90;
        var rgy = cy - h / 2 + 40 + Math.sin(t * 1.5 + i) * 8;
        ctx.fillStyle = 'rgba(95,240,224,' + (0.3 + 0.3 * Math.sin(t * 2 + i)).toFixed(2) + ')';
        ctx.fillText(runes[i], rgx, rgy);
      }
    }
  }

  // ------------------------------------------------------------------
  // HUD / UI
  // ------------------------------------------------------------------
  var HUD_X = 1040;
  var btn = { x: 1056, y: 604, w: 208, h: 68 };

  function drawUI() {
    // panel
    ctx.fillStyle = 'rgba(14,19,28,0.80)';
    ctx.fillRect(HUD_X, 0, CW - HUD_X, CH);
    ctx.fillStyle = 'rgba(120,160,190,0.35)';
    ctx.fillRect(HUD_X, 0, 2, CH);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(HUD_X + 2, 0, 2, CH);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Title
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText('ISLAND', HUD_X + 18, 40);
    ctx.fillStyle = '#8fd7ff';
    ctx.fillText('ANGLER', HUD_X + 18, 68);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText('A COZY FISHING SPOT', HUD_X + 18, 86);

    // divider
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(HUD_X + 18, 96, 204, 1);

    // Legend
    ctx.fillStyle = '#cfe6f2';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('RARITY ODDS', HUD_X + 18, 118);
    var order = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
    for (var i = 0; i < order.length; i++) {
      var y = 138 + i * 21;
      var rar = order[i];
      ctx.fillStyle = RARITY_COLORS[rar];
      ctx.fillRect(HUD_X + 18, y - 9, 10, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(HUD_X + 18, y - 9, 10, 2);
      ctx.fillStyle = '#dfeaf2';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(rar, HUD_X + 36, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = RARITY_COLORS[rar];
      ctx.fillText(RARITY_ODDS[rar], CW - 22, y);
      ctx.textAlign = 'left';
    }

    // Log
    ctx.fillStyle = '#cfe6f2';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('CATCH LOG', HUD_X + 18, 286);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('last 8, newest first', HUD_X + 18, 300);
    var lg = log();
    for (var j = 0; j < 8; j++) {
      var ly = 322 + j * 33;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(HUD_X + 18, ly - 17, 204, 29);
      if (j < lg.length) {
        var e = lg[j];
        ctx.fillStyle = RARITY_COLORS[e.rarity];
        ctx.fillRect(HUD_X + 24, ly - 11, 8, 8);
        ctx.fillStyle = '#eef4f8';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText(e.name, HUD_X + 40, ly - 4);
        ctx.fillStyle = RARITY_COLORS[e.rarity];
        ctx.font = '10px "Courier New", monospace';
        ctx.fillText(e.rarity, HUD_X + 40, ly + 8);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText('—', HUD_X + 24, ly - 2);
      }
    }

    drawButton();
    drawHint();
  }

  function drawButton() {
    var actionable = phase === 'ready' || phase === 'bite';
    var label = phase === 'bite' ? 'REEL IN!' : phase === 'ready' ? 'CAST' : '...';
    var pulse = phase === 'bite' ? 0.5 + 0.5 * Math.sin(time * 12) : 0;
    var base = phase === 'bite' ? [200 + pulse * 55, 60 + pulse * 60, 50] : phase === 'ready' ? [70, 150, 110] : [50, 60, 70];
    ctx.fillStyle = actionable ? 'rgb(' + (base[0] | 0) + ',' + (base[1] | 0) + ',' + (base[2] | 0) + ')' : '#2a323c';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12); ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = actionable ? (phase === 'bite' ? '#ffd23f' : '#9fe0b0') : '#3a444f';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, btn.x + 5, btn.y + 5, btn.w - 10, 16, 8); ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = actionable ? '#ffffff' : 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + 40);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = actionable ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)';
    ctx.fillText('press SPACE', btn.x + btn.w / 2, btn.y + 58);
    ctx.textAlign = 'left';
  }

  function drawHint() {
    var msg = '';
    if (phase === 'ready') msg = 'SPACE / CAST  to throw the line';
    else if (phase === 'waiting') msg = 'waiting for a bite...';
    else if (phase === 'bite') msg = 'BITE!  press SPACE / REEL IN';
    else if (phase === 'reeling') msg = 'reeling in...';
    if (!msg) return;
    ctx.font = 'bold 15px "Courier New", monospace';
    var tw = ctx.measureText(msg).width;
    var x = 20, y = CH - 44;
    ctx.fillStyle = 'rgba(14,19,28,0.72)';
    roundRect(ctx, x, y - 22, tw + 28, 34, 10); ctx.fill();
    ctx.fillStyle = phase === 'bite' ? '#ffd23d' : '#e8f2f8';
    ctx.fillText(msg, x + 14, y);
  }

  function drawMiss() {
    if (missFlash <= 0) return;
    var a = clamp(missFlash / 1.1, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255,120,120,' + a.toFixed(2) + ')';
    ctx.fillText('IT GOT AWAY...', 512, 120 - (1 - a) * 20);
    ctx.textAlign = 'left';
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  function render() {
    drawWater(time);
    drawShore();
    drawLandDetails();
    drawDock();
    drawAngler();
    drawRodAndLine();
    drawEffects();
    drawForeground();
    drawAmbient();
    drawVignette();

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CW, CH);
    ctx.drawImage(scene, 0, 0, CW, CH);

    drawReveal();
    drawMiss();
    drawUI();
  }

  // ------------------------------------------------------------------
  // Public test interface
  // ------------------------------------------------------------------
  var fishing = {
    log: [],
    pickRarity: pickRarity,
    get state() {
      if (phase === 'casting') return 'waiting';
      if (phase === 'ready' && missFlash > 0) return 'ready';
      return phase;
    }
  };
  window.fishing = fishing;

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      act();
    }
  });

  function toCanvas(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (CW / rect.width), y: (e.clientY - rect.top) * (CH / rect.height) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = toCanvas(e);
    if (p.x >= btn.x && p.x <= btn.x + btn.w && p.y >= btn.y && p.y <= btn.y + btn.h) act();
  });

  // ------------------------------------------------------------------
  // Loop (pauses while tab hidden)
  // ------------------------------------------------------------------
  var last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    update(dt);
    render();
  }
  requestAnimationFrame(loop);
})();
