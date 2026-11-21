/* =========================================================================
   Tidepool Cove — a tiny top-down fishing game
   All artwork is drawn procedurally in code. No external assets.
   ========================================================================= */
(function () {
  'use strict';

  // ---------------------------------------------------------------- canvas
  const W = 320, H = 180, SCALE = 4;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ---------------------------------------------------------------- helpers
  function px(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const _rgbCache = {};
  function rgb(h) { return _rgbCache[h] || (_rgbCache[h] = hex2rgb(h)); }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
      Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
      Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(n) { const s = Math.sin(n * 127.1 + 13.7) * 43758.5453; return s - Math.floor(s); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------------------------------------------------------------- palette
  const C = {
    skyTop: '#6fb4d8', skyMid: '#a5d7e4', skyLow: '#e7ecd0', skyHorizon: '#f7e7c2',
    sun: '#fff4c2', sunCore: '#ffe487', sunGlow: '#ffeeb8',
    cloud: '#fbfdff', cloudShade: '#d8ebf2',
    farIsland: '#8fb6b0', farIsland2: '#a9ccc2', farIslandShade: '#6f9a98',
    waterTop: '#7fc9dc', waterMid: '#3f9dbe', waterDeep: '#286f96', waterDeepest: '#1d577a',
    waterHi: '#c8f0f4', waterLine: '#a9e3ec',
    sand: '#ead6a4', sandShade: '#cfb47e', sandDark: '#b99a63',
    grass: '#5fa64a', grassLight: '#7fc45c', grassDark: '#3d7a38', grassDarkest: '#2c5c2c',
    rock: '#9aa0a6', rockLight: '#c3c8cd', rockDark: '#6c7278',
    wood: '#8a5a35', woodLight: '#b07a4e', woodDark: '#5e3a22', woodDarkest: '#3f2615',
    reed: '#4f8f3f', reedDark: '#356b2c', cattail: '#8a5a2b',
    skin: '#f0bd8c', skinShade: '#d69a6a', hair: '#5a3a22',
    shirt: '#cf5b45', shirtLight: '#e8785f', pants: '#41608c', boots: '#43301c',
    line: 'rgba(255,255,255,0.75)',
    bobRed: '#e0483a', bobRedLight: '#ff7a68', bobWhite: '#f6f1e6', bobDark: '#8f2a20'
  };

  const HORIZON = 62;

  // ---------------------------------------------------------------- fish art
  // Each art draws into a local box (0,0)-(w,h) at 1 logical pixel.
  const FISH_ART = {
    minnow: { w: 16, h: 11, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(4, 3, 8, 1, '#a9cee4');
      q(3, 4, 10, 4, '#cfe3ef');
      q(2, 5, 12, 2, '#cfe3ef');
      q(4, 8, 8, 1, '#eef6fb');
      q(11, 4, 3, 4, '#bcd6e8');
      q(0, 3, 3, 2, '#9fd0e0'); q(0, 6, 3, 2, '#9fd0e0');
      q(1, 4, 2, 3, '#b9e2ee');
      q(6, 2, 4, 2, '#9fd0e0');
      q(7, 8, 3, 2, '#b9e2ee');
      q(4, 6, 8, 1, '#e8b24a');
      q(12, 5, 1, 1, '#26343f');
    } },
    goby: { w: 17, h: 11, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(3, 4, 11, 4, '#8a6a45');
      q(2, 5, 13, 2, '#8a6a45');
      q(4, 3, 9, 1, '#b28c5e');
      q(4, 8, 8, 1, '#c9a06a');
      q(10, 3, 5, 6, '#9a7850');      // big head
      q(0, 2, 4, 3, '#6e5231'); q(0, 6, 4, 3, '#6e5231');
      q(1, 3, 2, 5, '#9a7850');
      q(5, 2, 4, 1, '#5e472c');
      q(6, 9, 4, 2, '#b28c5e');
      q(11, 5, 2, 2, '#c9a06a'); q(13, 5, 1, 1, '#241a10');
      q(5, 5, 6, 1, '#5e472c');
    } },
    perch: { w: 18, h: 14, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(4, 4, 9, 6, '#5f9a57');
      q(3, 5, 11, 4, '#5f9a57');
      q(5, 3, 7, 1, '#4a7f45');
      q(5, 10, 7, 2, '#cfe0a8');
      q(12, 3, 3, 8, '#4a7f45');
      q(16, 5, 1, 3, '#3d6e3c');
      // spiny dorsal
      q(6, 1, 1, 2, '#356b2c'); q(8, 0, 1, 3, '#356b2c'); q(10, 1, 1, 2, '#356b2c');
      q(6, 2, 6, 2, '#4a7f45');
      // stripes
      q(6, 4, 1, 6, '#3d6e3c'); q(9, 4, 1, 6, '#3d6e3c'); q(12, 4, 1, 6, '#3d6e3c');
      q(0, 3, 4, 3, '#356b2c'); q(0, 8, 4, 3, '#356b2c');
      q(7, 9, 4, 3, '#4a7f45');
      q(13, 6, 1, 1, '#f2d24b'); q(12, 5, 2, 2, '#26301f'); q(13, 6, 1, 1, '#f2d24b');
    } },
    snail: { w: 19, h: 11, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(2, 4, 13, 4, '#d98f3a');
      q(1, 5, 15, 2, '#d98f3a');
      q(3, 3, 11, 1, '#f2c069');
      q(3, 8, 11, 1, '#f7dca0');
      q(12, 3, 4, 6, '#c47a2c');
      q(15, 4, 2, 2, '#f2c069');
      // flowing tail fin
      q(0, 2, 3, 3, '#b06e2a'); q(0, 6, 3, 3, '#b06e2a');
      q(1, 4, 2, 3, '#e8b25e');
      // dorsal ridge
      q(6, 1, 6, 2, '#e8b25e');
      // feelers
      q(15, 1, 1, 2, '#f2c069'); q(17, 1, 1, 2, '#f2c069');
      q(15, 5, 1, 1, '#241a10');
      q(5, 5, 7, 1, '#b06e2a');
    } },
    darter: { w: 21, h: 10, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(3, 4, 15, 3, '#3f7fd6');
      q(2, 5, 17, 1, '#3f7fd6');
      q(4, 3, 13, 1, '#6fb0f0');
      q(5, 7, 11, 1, '#264f9c');
      q(16, 3, 4, 5, '#2f6cc4');
      q(19, 4, 2, 2, '#6fb0f0');
      q(0, 2, 3, 2, '#6fb0f0'); q(0, 6, 3, 2, '#6fb0f0');
      q(1, 3, 2, 4, '#a9d0ff');
      q(6, 1, 5, 2, '#a9d0ff');
      q(7, 8, 4, 2, '#6fb0f0');
      q(6, 4, 9, 1, '#a9d0ff');
      q(17, 5, 1, 1, '#101c2c');
    } },
    trout: { w: 22, h: 13, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(4, 4, 13, 5, '#cfe0e8');
      q(3, 5, 15, 3, '#cfe0e8');
      q(5, 3, 11, 1, '#9fbcc8');
      q(5, 9, 11, 2, '#f2dada');
      q(15, 3, 4, 7, '#9fbcc8');
      q(18, 5, 2, 3, '#cfe0e8');
      q(0, 2, 4, 3, '#bcd8e0'); q(0, 7, 4, 3, '#bcd8e0');
      q(1, 3, 3, 6, '#dfeef2');
      q(6, 1, 6, 2, '#bcd8e0');
      q(6, 10, 5, 2, '#bcd8e0');
      q(4, 7, 12, 1, '#e07a7a');       // red lateral stripe
      q(6, 4, 1, 1, '#3a5a68'); q(9, 5, 1, 1, '#3a5a68'); q(12, 4, 1, 1, '#3a5a68');
      q(8, 8, 1, 1, '#3a5a68'); q(14, 7, 1, 1, '#3a5a68');
      q(16, 5, 2, 2, '#eef4f6'); q(17, 6, 1, 1, '#26343f');
    } },
    bass: { w: 23, h: 15, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(4, 4, 13, 8, '#c9542f');
      q(3, 5, 16, 6, '#c9542f');
      q(4, 3, 13, 2, '#7f2f1c');
      q(5, 11, 11, 3, '#e8a05a');
      q(16, 3, 4, 10, '#a83f21');
      q(19, 5, 2, 5, '#e8a05a');
      // big mouth
      q(17, 8, 5, 1, '#5e1c10');
      q(19, 9, 2, 1, '#5e1c10');
      // jaw
      q(17, 10, 4, 2, '#e8a05a');
      // tail — glowing ember
      q(0, 3, 4, 4, '#ffb04a'); q(0, 8, 4, 4, '#ffb04a');
      q(1, 5, 3, 5, '#ffd76a'); q(0, 6, 2, 3, '#fff0b0');
      q(6, 1, 6, 2, '#7f2f1c');
      q(7, 12, 5, 2, '#ffb04a');
      q(8, 5, 6, 1, '#a83f21');
      q(16, 5, 2, 2, '#ffe9a0'); q(17, 6, 1, 1, '#2a0f06');
    } },
    koi: { w: 28, h: 16, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(5, 5, 17, 6, '#eef2f6');
      q(4, 6, 20, 4, '#eef2f6');
      q(6, 4, 14, 1, '#cfdae6');
      q(6, 11, 14, 2, '#f8fbfd');
      q(20, 3, 5, 10, '#cfdae6');
      q(24, 5, 2, 5, '#eef2f6');
      // flowing tail
      q(0, 2, 5, 5, '#dfe9f2'); q(0, 9, 5, 5, '#dfe9f2');
      q(1, 4, 4, 8, '#eef2f6');
      q(0, 1, 3, 2, '#c4d6e6'); q(0, 13, 3, 2, '#c4d6e6');
      // long dorsal
      q(7, 1, 12, 3, '#dfe9f2');
      // blue patches
      q(7, 6, 4, 4, '#6a8fd6'); q(9, 8, 3, 3, '#5a7fc8');
      q(15, 5, 3, 3, '#6a8fd6');
      q(13, 10, 4, 2, '#7a9fe0');
      q(5, 8, 2, 2, '#6a8fd6');
      // whiskers
      q(23, 12, 3, 1, '#cfdae6'); q(24, 13, 3, 1, '#cfdae6');
      q(21, 6, 2, 3, '#f8fbfd'); q(22, 7, 1, 1, '#26343f');
    } },
    leviathan: { w: 34, h: 20, draw: function (g) {
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      q(6, 5, 20, 10, '#1f3b4a');
      q(5, 7, 24, 6, '#1f3b4a');
      q(7, 4, 17, 2, '#2f5f6e');
      q(7, 13, 15, 3, '#16303b');
      q(25, 3, 6, 14, '#2f5f6e');
      q(30, 5, 3, 10, '#1f3b4a');
      // angular head
      q(30, 7, 3, 6, '#2f5f6e');
      // tail — ragged
      q(0, 2, 6, 5, '#16303b'); q(0, 12, 6, 6, '#16303b');
      q(1, 5, 4, 10, '#1f3b4a');
      q(0, 0, 3, 3, '#0e222b'); q(0, 17, 3, 3, '#0e222b');
      // dorsal spines
      q(8, 2, 2, 3, '#16303b'); q(12, 1, 2, 4, '#16303b');
      q(16, 2, 2, 3, '#16303b'); q(20, 1, 2, 4, '#16303b');
      // glowing runes
      q(11, 8, 2, 2, '#57f0c8'); q(16, 6, 2, 2, '#57f0c8');
      q(21, 9, 2, 2, '#57f0c8'); q(14, 11, 2, 2, '#4fe0bb');
      q(24, 7, 2, 2, '#57f0c8');
      // eyes
      q(29, 6, 3, 3, '#0b1a20'); q(30, 7, 2, 1, '#ff6a4d');
      q(29, 11, 3, 3, '#0b1a20'); q(30, 12, 2, 1, '#ff6a4d');
      // belly glow
      q(10, 15, 10, 1, '#3fbfa0');
    } }
  };

  // ---------------------------------------------------------------- fish data
  const FISH = {
    Common: [
      { name: 'Sunscale Minnow', art: 'minnow' },
      { name: 'Mudskip Goby', art: 'goby' }
    ],
    Uncommon: [
      { name: 'Reedfin Perch', art: 'perch' },
      { name: 'Amber Snailfish', art: 'snail' }
    ],
    Rare: [
      { name: 'Cobalt Darter', art: 'darter' },
      { name: 'Glasswing Trout', art: 'trout' }
    ],
    Epic: [
      { name: 'Embertail Bass', art: 'bass' }
    ],
    Legendary: [
      { name: 'Moonsilver Koi', art: 'koi' }
    ],
    Ancient: [
      { name: 'Hollowheart Leviathan', art: 'leviathan' }
    ]
  };

  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  const ODDS = [0.45, 0.25, 0.15, 0.08, 0.05, 0.02];
  const TIER_COLOR = {
    Common: '#c9c3b6', Uncommon: '#6fce6a', Rare: '#59b6ff',
    Epic: '#b76bff', Legendary: '#ffd45e', Ancient: '#4fe6c4'
  };

  // ---------------------------------------------------------------- test API
  const fishing = {
    state: 'ready',
    pickRarity: function (u) {
      if (typeof u !== 'number' || u < 0) u = 0;
      let acc = 0;
      for (let i = 0; i < ODDS.length; i++) {
        acc += ODDS[i];
        if (u < acc) return RARITIES[i];
      }
      return 'Ancient';
    },
    log: []
  };
  window.fishing = fishing;

  // ---------------------------------------------------------------- state
  let phase = 'ready';
  let T = 0;
  let castT = 0, castDur = 0.75, landed = false;
  let waitT = 0, waitDur = 2.6;
  let biteT = 0, biteDur = 1.5;
  let reelT = 0, reelDur = 1.6;
  let revealT = 0;
  let missed = false, missT = 0;
  let startBanner = 7;
  let current = null;              // { name, rarity, art }
  let bobberTarget = { x: 205, y: 118 };
  let rodTip = { x: 92, y: 96 };
  let reelSplash = 0;
  let catchFlash = 0;
  const jump = { active: false, t: 0, dur: 1, x: 0, baseY: 0, dir: 1 };
  let jumpTimer = 5;

  function setPhase(p) { phase = p; fishing.state = p; }

  // ---------------------------------------------------------------- ripples
  const ripplePool = [];
  function spawnRipple(x, y, max, speed) {
    ripplePool.push({ x: x, y: y, r: 0, max: max, sp: speed, life: 0 });
  }
  function updateRipples(dt) {
    for (let i = ripplePool.length - 1; i >= 0; i--) {
      const r = ripplePool[i];
      r.r += r.sp * dt; r.life += dt;
      if (r.r > r.max) ripplePool.splice(i, 1);
    }
  }
  function drawRipples() {
    for (const r of ripplePool) {
      const a = clamp(1 - r.r / r.max, 0, 1) * 0.8;
      ctx.globalAlpha = a;
      ellipseRing(r.x, r.y, r.r, r.r * 0.42, 'rgba(233,252,255,0.9)');
      ctx.globalAlpha = 1;
    }
  }
  function ellipseRing(cx, cy, rx, ry, col) {
    const steps = Math.max(10, Math.round(rx * 2.2));
    for (let i = 0; i < steps; i++) {
      const a = i / steps * Math.PI * 2;
      px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 1, 1, col);
    }
  }

  // ---------------------------------------------------------------- sky
  function drawSky() {
    for (let y = 0; y < HORIZON; y++) {
      const t = y / (HORIZON - 1);
      let col;
      if (t < 0.55) col = mix(C.skyTop, C.skyMid, t / 0.55);
      else col = mix(C.skyMid, C.skyLow, (t - 0.55) / 0.25);
      if (t > 0.8) col = mix(C.skyLow, C.skyHorizon, (t - 0.8) / 0.2);
      px(0, y, W, 1, col);
    }
    // sun with soft rings
    const sx = 246, sy = 30, sr = 11;
    for (let ring = 3; ring >= 1; ring--) {
      ctx.globalAlpha = 0.10 * ring;
      drawDisc(sx, sy, sr + ring * 5, C.sunGlow);
    }
    ctx.globalAlpha = 1;
    drawDisc(sx, sy, sr, C.sun);
    drawDisc(sx, sy, sr - 4, C.sunCore);
  }
  function drawDisc(cx, cy, r, col) {
    ctx.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      px(cx - dx, cy + dy, dx * 2 + 1, 1, col);
    }
  }

  // ---------------------------------------------------------------- clouds
  const clouds = [
    { x: 40, y: 18, s: 1.0, sp: 3.2 },
    { x: 150, y: 30, s: 0.78, sp: 2.4 },
    { x: 260, y: 14, s: 0.9, sp: 2.9 },
    { x: 330, y: 40, s: 0.6, sp: 3.6 }
  ];
  function drawClouds(dt) {
    for (const c of clouds) {
      c.x -= c.sp * dt;
      if (c.x < -60) c.x = W + 60;
      drawCloud(c.x, c.y, c.s);
    }
  }
  function drawCloud(x, y, s) {
    x = Math.round(x); y = Math.round(y);
    const r = (a, b, w, h, col) => px(x + a * s, y + b * s, w * s, h * s, col);
    r(-13, 1, 26, 4, C.cloudShade);
    r(-16, -1, 32, 4, C.cloud);
    r(-10, -4, 21, 5, C.cloud);
    r(-3, -7, 12, 6, C.cloud);
    r(6, -4, 9, 5, C.cloud);
    r(-13, 3, 26, 2, C.cloudShade);
  }

  // ---------------------------------------------------------------- water
  function waterColor(y) {
    const t = (y - HORIZON) / (H - HORIZON);
    if (t < 0.5) return mix(C.waterTop, C.waterMid, t / 0.5);
    return mix(C.waterMid, C.waterDeep, (t - 0.5) / 0.5);
  }
  function isWater(x, y) {
    // land occupies bottom-left wedge; water everywhere else
    if (x < 0 || x > 190) return true;
    return y < landTop(x);
  }
  function drawWater() {
    for (let y = HORIZON; y < H; y++) px(0, y, W, 1, waterColor(y));

    // far-island reflection
    ctx.globalAlpha = 0.16;
    for (let y = HORIZON + 4; y < HORIZON + 18; y++) {
      px(196, y, 96, 1, C.farIslandShade);
    }
    ctx.globalAlpha = 1;

    // animated wave dashes
    for (let i = 0; i < 90; i++) {
      const seed = hash(i * 3.13);
      const y = HORIZON + 3 + Math.floor(seed * (H - HORIZON - 8));
      const sp = 5 + (i % 4) * 2.5;
      const off = (seed * 977 + T * sp) % (W + 40) - 20;
      const len = 2 + Math.floor(hash(i * 7.7) * 4);
      const x = Math.round(off + Math.sin((y * 0.3 + T * 2) + i) * 4);
      if (!isWater(x, y)) continue;
      ctx.globalAlpha = 0.35 + 0.35 * hash(i * 1.7);
      px(x, y, len, 1, C.waterHi);
      px(x + 2, y + 1, Math.max(1, len - 2), 1, C.waterLine);
    }
    ctx.globalAlpha = 1;

    // sun glitter column
    for (let i = 0; i < 26; i++) {
      const y = HORIZON + 2 + i * 3.4;
      if (y > H - 2) break;
      const dx = Math.sin(i * 1.7 + T * 1.6) * (3 + i * 0.5);
      const x = 246 + dx;
      if (!isWater(x, y)) continue;
      ctx.globalAlpha = 0.5 - i * 0.012;
      px(x - 3, y, 6, 1, '#fff6cf');
    }
    ctx.globalAlpha = 1;

    drawRipples();
    drawIsland();
  }
  function drawIsland() {
    // distant hazy island on the right horizon
    const base = HORIZON + 3;
    for (let x = 198; x < 300; x++) {
      const t = (x - 198) / 102;
      let hgt = Math.sin(t * Math.PI) * 11;
      hgt += Math.sin(t * Math.PI * 3.1) * 3.5;
      hgt = Math.max(0, hgt);
      const top = base - Math.round(hgt);
      px(x, top, 1, base - top, C.farIsland2);
      px(x, top, 1, Math.min(3, base - top), C.farIsland);
    }
    // palm silhouettes on the island
    px(232, base - 14, 1, 7, C.farIslandShade);
    px(228, base - 16, 7, 1, C.farIslandShade);
    px(230, base - 17, 5, 1, C.farIslandShade);
    px(255, base - 11, 1, 6, C.farIslandShade);
    px(252, base - 13, 7, 1, C.farIslandShade);
  }

  // ---------------------------------------------------------------- land
  function landTop(x) {
    if (x < 0 || x > 190) return 999;
    const t = x / 190;
    let y = 116 + Math.pow(t, 1.55) * 82;
    y += (hash(x * 0.63) - 0.5) * 3.2;
    return Math.round(y);
  }
  function drawLand() {
    for (let x = 0; x <= 190; x++) {
      const top = landTop(x);
      if (top >= H) continue;
      // waterline foam
      px(x, top - 1, 1, 1, 'rgba(235,250,250,0.7)');
      // sand band
      px(x, top, 1, 3, C.sand);
      px(x, top + 3, 1, 1, C.sandShade);
      // grass
      px(x, top + 4, 1, H - (top + 4), C.grass);
    }
    // grass shading + texture
    for (let x = 0; x <= 190; x++) {
      const top = landTop(x);
      if (top >= H) continue;
      // darker toward bottom
      const gy = top + 9;
      if (gy < H) px(x, gy, 1, H - gy, C.grassDark);
      const gy2 = top + 16;
      if (gy2 < H) px(x, gy2, 1, H - gy2, C.grassDarkest);
      // light tufts near top
      const tuft = hash(x * 1.9);
      if (tuft > 0.72 && top + 5 < H) px(x, top + 5, 1, 2, C.grassLight);
      if (tuft < 0.12 && top + 6 < H) px(x, top + 6, 1, 1, C.grassDark);
    }
  }

  // ---------------------------------------------------------------- dock
  function drawDock() {
    const dx = 40, dy = 121, dw = 88, dh = 9;
    // water shadow
    ctx.globalAlpha = 0.18; px(dx - 2, dy + dh, dw + 6, 3, '#12303f'); ctx.globalAlpha = 1;
    // support posts
    px(46, dy + dh - 1, 3, 14, C.woodDark);
    px(78, dy + dh - 1, 3, 14, C.woodDark);
    px(118, dy + dh - 1, 3, 14, C.woodDark);
    px(46, dy + dh + 9, 3, 4, C.woodDarkest);
    px(78, dy + dh + 9, 3, 4, C.woodDarkest);
    px(118, dy + dh + 9, 3, 4, C.woodDarkest);
    // plank base
    px(dx, dy, dw, dh, C.wood);
    // plank divisions
    for (let x = dx; x < dx + dw; x += 7) px(x, dy, 1, dh, C.woodDark);
    px(dx, dy, dw, 1, C.woodLight);
    px(dx + 1, dy + 1, dw - 2, 1, C.woodLight);
    px(dx, dy + dh - 1, dw, 1, C.woodDarkest);
    // small knotholes
    px(58, dy + 4, 1, 1, C.woodDarkest);
    px(95, dy + 3, 1, 1, C.woodDarkest);
    px(107, dy + 5, 1, 1, C.woodDarkest);
  }

  // ---------------------------------------------------------------- plants
  function drawPalm(bx, by) {
    // trunk curving up
    let x = bx, y = by;
    const segs = 22;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const nx = bx + Math.sin(t * 1.5) * 9;
      const ny = by - t * 46;
      px(nx, ny, 3, 3, i % 2 ? C.wood : C.woodDark);
      px(nx, ny, 1, 3, C.woodLight);
    }
    const tx = bx + Math.sin(1.5) * 9, ty = by - 46;
    // fronds
    const fr = [
      [-16, -4, -3], [-14, 4, -1], [-4, -12, -2], [4, -11, -3],
      [12, -5, -1], [12, 3, 1], [3, 9, 2], [-6, 8, 1]
    ];
    for (let i = 0; i < fr.length; i++) {
      const a = fr[i];
      const col = i % 2 ? C.grassDark : C.grass;
      drawLeaf(tx + 1, ty + 1, a[0], a[1], col, i % 3 === 0 ? C.grassLight : col);
    }
    // coconuts
    px(tx - 2, ty + 1, 2, 2, C.woodDark);
    px(tx + 2, ty + 1, 2, 2, C.woodDark);
  }
  function drawLeaf(x, y, dx, dy, col, edge) {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lx = x + dx * t;
      const ly = y + dy * t + Math.sin(t * Math.PI) * -2;
      const w = Math.max(1, Math.round(2 * (1 - t) + 1));
      px(lx - w / 2, ly, w, 2, t > 0.5 ? col : edge);
    }
  }
  function drawBush(x, y, s) {
    px(x + 1 * s, y, 11 * s, 6 * s, C.grassDark);
    px(x, y + 2 * s, 13 * s, 4 * s, C.grass);
    px(x + 2 * s, y, 8 * s, 2 * s, C.grassLight);
    px(x + 3 * s, y + 5 * s, 7 * s, 1 * s, C.grassDarkest);
    // berries
    if (s >= 1) { px(x + 3, y + 3, 1, 1, '#e0574a'); px(x + 9, y + 2, 1, 1, '#e0574a'); }
  }
  function drawReeds(x) {
    for (let i = 0; i < 5; i++) {
      const rx = x + i * 3 + Math.round(Math.sin(i * 2.1) * 1.5);
      const base = landTop(rx) - 1;
      if (base >= H - 2) continue;
      const hgt = 9 + (i % 3) * 4;
      px(rx, base - hgt, 1, hgt, i % 2 ? C.reed : C.reedDark);
      if (i % 2 === 0) px(rx, base - hgt - 3, 2, 3, C.cattail);
    }
  }
  function drawFlowers(x, y) {
    const cols = ['#f2c94c', '#e884b0', '#f2f2f2', '#8fb6ff'];
    for (let i = 0; i < 6; i++) {
      const fx = x + Math.round(hash(i * 5.3) * 34);
      const fy = y + Math.round(hash(i * 9.1) * 14);
      px(fx, fy, 1, 1, cols[i % cols.length]);
      px(fx, fy - 1, 1, 1, C.grassLight);
    }
  }
  function drawRocks() {
    const rocks = [[172, 128, 5], [181, 134, 4], [166, 138, 3], [188, 144, 5]];
    for (const r of rocks) {
      px(r[0] - r[2], r[1] - 1, r[2] * 2, r[2], C.rock);
      px(r[0] - r[2], r[1] - 1, r[2] * 2, 1, C.rockLight);
      px(r[0] - r[2], r[1] + r[2] - 2, r[2] * 2, 1, C.rockDark);
    }
  }

  // ---------------------------------------------------------------- angler
  const ax = 60, ay = 121;   // ax = left edge, ay = feet baseline (dock top)
  function drawAngler() {
    // contact shadow on dock
    ctx.globalAlpha = 0.28; px(ax - 1, ay - 2, 17, 3, '#241a10'); ctx.globalAlpha = 1;
    // legs / boots
    px(ax + 2, ay - 3, 4, 3, C.boots);
    px(ax + 8, ay - 3, 4, 3, C.boots);
    px(ax + 3, ay - 3, 2, 1, '#5e4527');
    px(ax + 9, ay - 3, 2, 1, '#5e4527');
    px(ax + 2, ay - 7, 4, 4, C.pants);
    px(ax + 8, ay - 7, 4, 4, C.pants);
    px(ax + 2, ay - 7, 1, 4, '#5a7cb0');
    px(ax + 8, ay - 7, 1, 4, '#5a7cb0');
    // torso
    px(ax + 1, ay - 14, 11, 7, C.shirt);
    px(ax + 1, ay - 14, 11, 1, C.shirtLight);
    px(ax + 1, ay - 14, 1, 7, C.shirtLight);
    px(ax + 11, ay - 14, 1, 7, '#a83f2f');
    // satchel strap
    px(ax + 4, ay - 14, 1, 7, '#8a6a3a');
    // arm reaching forward
    px(ax + 9, ay - 12, 5, 3, C.shirt);
    px(ax + 9, ay - 12, 5, 1, C.shirtLight);
    px(ax + 12, ay - 12, 2, 2, C.skin);
    // head
    px(ax + 2, ay - 20, 8, 6, C.skin);
    px(ax + 2, ay - 15, 8, 1, C.skinShade);
    px(ax + 1, ay - 19, 2, 4, C.hair);
    px(ax + 9, ay - 19, 1, 2, C.hair);
    px(ax + 8, ay - 18, 1, 1, '#3a2414'); // eye hint
    // hat
    px(ax, ay - 21, 12, 2, '#c99a4a');
    px(ax + 1, ay - 21, 10, 1, '#e0b96a');
    px(ax + 2, ay - 23, 8, 2, '#d9ad5a');
    px(ax + 3, ay - 24, 6, 1, '#e8c878');
    // rod in hand, angled up-right
    const rod = { x: ax + 13, y: ay - 11 };
    rodTip.x = rod.x + 23; rodTip.y = rod.y - 18;
    drawLinePixels(rod.x, rod.y, rodTip.x, rodTip.y, 1, '#6b431f');
    drawLinePixels(rod.x, rod.y, rodTip.x, rodTip.y, 0.5, '#8f6234');
    // reel
    px(rod.x + 2, rod.y + 1, 2, 3, '#4a4a52');
    px(rod.x + 1, rod.y + 2, 4, 2, '#6a6a74');
  }
  function drawLinePixels(x0, y0, x1, y1, off, col) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      px(x0 + (x1 - x0) * t + off * (y1 - y0) / n * 0.0, y0 + (y1 - y0) * t + off, 1, 1, col);
    }
  }

  // ---------------------------------------------------------------- bobber
  function quadPoint(p0, p1, p2, t) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }
  function drawCurvePx(p0, p1, p2, col) {
    const dist = Math.hypot(p2.x - p0.x, p2.y - p0.y);
    const steps = Math.max(6, Math.round(dist * 1.7));
    for (let i = 0; i <= steps; i++) {
      const pt = quadPoint(p0, p1, p2, i / steps);
      px(pt.x, pt.y, 1, 1, col);
    }
  }
  function bobberPos() {
    if (phase === 'ready') return null;
    if (phase === 'waiting' && !landed) {
      const p1 = { x: (rodTip.x + bobberTarget.x) / 2, y: Math.min(rodTip.y, bobberTarget.y) - 36 };
      return quadPoint(rodTip, p1, bobberTarget, clamp(castT / castDur, 0, 1));
    }
    if (phase === 'reeling') {
      const t = clamp(reelT / reelDur, 0, 1);
      const ease = t * t * (3 - 2 * t);
      const end = { x: rodTip.x + 10, y: rodTip.y + 14 };
      return {
        x: bobberTarget.x + (end.x - bobberTarget.x) * ease,
        y: bobberTarget.y + (end.y - bobberTarget.y) * ease - Math.sin(t * Math.PI) * 6
      };
    }
    // waiting (landed) or bite
    let dunk = 0;
    if (phase === 'bite') {
      const k = clamp(biteT / 0.16, 0, 1);
      dunk = 3 * k + Math.sin(T * 22) * 1.1;
    } else {
      dunk = Math.sin(T * 2.2) * 0.8;
    }
    return { x: bobberTarget.x, y: bobberTarget.y + dunk };
  }
  function drawRig() {
    const b = bobberPos();
    if (!b) return;
    // fishing line from rod tip (sampled as pixels to stay crisp)
    if (phase === 'waiting' && !landed) {
      drawCurvePx(rodTip, { x: (rodTip.x + b.x) / 2, y: Math.min(rodTip.y, b.y) - 4 }, b, C.line);
    } else {
      const ctrlY = (rodTip.y + b.y) / 2 + (phase === 'bite' ? 2 : 7);
      drawCurvePx(rodTip, { x: (rodTip.x + b.x) / 2, y: ctrlY }, b, C.line);
    }
    // bobber
    drawBobber(b.x, b.y);
  }
  function drawBobber(x, y) {
    x = Math.round(x); y = Math.round(y);
    ctx.globalAlpha = 0.28; px(x - 1, y + 3, 5, 2, '#12303f'); ctx.globalAlpha = 1;
    px(x - 1, y, 3, 4, C.bobWhite);
    px(x - 1, y, 3, 2, C.bobRed);
    px(x, y, 1, 1, C.bobRedLight);
    px(x - 1, y + 4, 3, 1, C.bobDark);
    px(x, y - 2, 1, 2, '#5a5a62');
    if (phase === 'bite') {
      // splash droplets
      px(x - 3, y - 2, 1, 1, '#e9fcff');
      px(x + 3, y - 3, 1, 1, '#e9fcff');
      px(x + 1, y - 4, 1, 1, '#e9fcff');
    }
  }
  function drawBiteCue() {
    if (phase !== 'bite') return;
    const b = bobberPos();
    const by = Math.round(b.y) - 14 + Math.round(Math.sin(T * 12) * 1);
    // "!" in yellow with dark outline
    const col = Math.sin(T * 20) > -0.4 ? '#ffe14d' : '#ffffff';
    px(b.x - 1, by, 3, 7, '#2a1a0e');
    px(b.x, by + 1, 1, 5, col);
    px(b.x, by + 7, 1, 1, col);
    px(b.x - 3, by - 2, 7, 7, 'rgba(0,0,0,0)');
    // radiating burst
    ctx.globalAlpha = 0.7;
    const r = 7 + Math.sin(T * 10) * 2;
    ellipseRing(b.x, b.y, r, r * 0.4, '#ffe98a');
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- reeling fish
  function drawReelFish() {
    if (phase !== 'reeling') return;
    const t = clamp(reelT / reelDur, 0, 1);
    const b = bobberPos();
    const f = FISH_ART[current ? current.art : 'minnow'];
    const sx = b.x, sy = b.y + 6 + Math.sin(T * 14) * 2;
    ctx.globalAlpha = 0.85;
    // dark silhouette of hooked fish thrashing below the surface
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.scale(1.4, 1.4);
    ctx.translate(-f.w / 2, -f.h / 2);
    // draw body as dark shape using the art geometry (simplified silhouette)
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#12303f';
    ctx.fillRect(4, 4, f.w - 8, f.h - 7);
    ctx.fillRect(2, 6, f.w - 4, f.h - 11);
    ctx.restore();
    // splash above
    ctx.globalAlpha = 0.9;
    px(sx - 3, sy - 6, 1, 1, '#e9fcff');
    px(sx + 4, sy - 5, 1, 1, '#e9fcff');
    px(sx, sy - 8, 1, 1, '#e9fcff');
    ctx.globalAlpha = 1;
    if (t < 0.25) spawnReelSplash(sx, sy);
  }
  let reelSplashCooldown = 0;
  function spawnReelSplash(x, y) {
    reelSplashCooldown -= 1 / 60;
    if (reelSplashCooldown <= 0) { spawnRipple(x, y, 12, 16); reelSplashCooldown = 0.12; }
  }

  // ---------------------------------------------------------------- forecast
  function drawJump() {
    if (!jump.active) return;
    const t = jump.t / jump.dur;
    const x = jump.x + jump.dir * t * 14;
    const y = jump.baseY - Math.sin(t * Math.PI) * 16;
    if (t < 0.14 || t > 0.88) {
      ellipseRing(jump.x, jump.baseY + 2, 6, 3, 'rgba(233,252,255,0.8)');
    }
    px(x - 2, y, 5, 3, '#9fd8e2');
    px(x + 2, y + 1, 2, 2, '#9fd8e2');
    px(x - 3, y + 1, 2, 2, '#5a9fb0');
    px(x, y - 1, 2, 1, '#c8eef4');
  }
  function drawLilyPads() {
    const pads = [[150, 141, 5], [163, 148, 4], [141, 153, 3], [173, 143, 3]];
    for (const p of pads) {
      const x = p[0], y = p[1], r = p[2];
      if (!isWater(x, y)) continue;
      ctx.fillStyle = '#3e8f4a';
      for (let dy = -r; dy <= r; dy++) {
        const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
        px(x - dx, y + dy, dx * 2 + 1, 1, '#3e8f4a');
      }
      px(x - r, y, 2, 1, waterColor(y));
      px(x, y - r + 1, Math.max(2, r), 1, '#63b85f');
      if (r >= 4) px(x + 1, y - 1, 1, 1, '#f2c1d6');
    }
  }
  function drawDockProps() {
    // bait bucket resting on the planks
    px(44, 109, 8, 2, '#6a6a74');
    px(44, 109, 8, 1, '#8a8a92');
    px(45, 111, 6, 10, '#4a4a52');
    px(45, 111, 1, 10, '#5c5c66');
    px(49, 111, 1, 10, '#3a3a42');
    px(46, 108, 4, 1, '#8a8a92');
    // coiled rope
    px(90, 124, 9, 4, '#b98a4a');
    px(91, 123, 7, 1, '#d0a25e');
    px(92, 128, 5, 1, '#9a6f38');
  }
  function drawForeground() {
    // dark grass/reeds along bottom-left for depth
    for (let x = 0; x <= 190; x += 2) {
      const top = landTop(x);
      if (top >= H - 4) continue;
      const hgt = 4 + Math.floor(hash(x * 0.31) * 7);
      const y = H - hgt;
      px(x, y, 2, hgt, C.grassDarkest);
      if (hash(x * 0.77) > 0.6) px(x, y - 3, 1, 3, C.grassDarkest);
    }
    // a couple of big leafy fronds bottom-right foreground
    for (let i = 0; i < 3; i++) {
      const bx = 300 + i * 8, by = 178;
      px(bx, by - 10 - i * 3, 3, 12, C.grassDark);
      px(bx - 3, by - 13 - i * 3, 3, 6, C.grassDark);
      px(bx + 2, by - 12 - i * 3, 3, 5, C.grassDark);
    }
  }

  // ---------------------------------------------------------------- scene
  function renderScene(dt) {
    drawSky();
    drawClouds(dt);
    drawWater();
    drawLand();
    drawRocks();
    drawLilyPads();
    // vegetation on land
    drawPalm(14, 122);
    drawBush(96, 146, 1);
    drawBush(118, 156, 1);
    drawReeds(96);
    drawReeds(128);
    drawFlowers(30, 150);
    drawFlowers(60, 160);
    drawDock();
    drawDockProps();
    drawAngler();
    drawRig();
    drawReelFish();
    drawBiteCue();
    drawJump();
    drawForeground();
    if (catchFlash > 0) {
      ctx.globalAlpha = clamp(catchFlash / 0.28, 0, 1) * 0.5;
      px(0, 0, W, H, '#fff6e0');
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- update
  let missMsgT = 0;
  function update(dt) {
    T += dt;
    if (startBanner > 0) startBanner -= dt;
    if (missMsgT > 0) missMsgT -= dt;
    if (catchFlash > 0) catchFlash -= dt;
    updateRipples(dt);
    updateJump(dt);

    if (phase === 'waiting') {
      if (!landed) {
        castT += dt;
        if (castT >= castDur) {
          landed = true;
          spawnRipple(bobberTarget.x, bobberTarget.y, 16, 14);
        }
      } else {
        waitT += dt;
        // occasional idle ring
        if (Math.floor(waitT * 2) !== Math.floor((waitT - dt) * 2) && hash(waitT) > 0.5) {
          spawnRipple(bobberTarget.x + (Math.random() * 6 - 3), bobberTarget.y + 2, 8, 7);
        }
        if (waitT >= waitDur) startBite();
      }
    } else if (phase === 'bite') {
      biteT += dt;
      if (biteT >= biteDur) handleMiss();
    } else if (phase === 'reeling') {
      reelT += dt;
      if (reelT >= reelDur) finishReel();
    } else if (phase === 'reveal') {
      revealT += dt;
    }
  }

  function startCast() {
    bobberTarget = { x: rand(180, 244), y: rand(106, 128) };
    castT = 0; landed = false; waitT = 0;
    waitDur = rand(2.2, 4.2);
    missed = false;
    startBanner = 0;
    setPhase('waiting');
    updateHUD();
  }
  function startBite() {
    biteT = 0; biteDur = 1.5;
    setPhase('bite');
    spawnRipple(bobberTarget.x, bobberTarget.y, 18, 20);
    updateHUD();
  }
  function handleMiss() {
    missed = true; missMsgT = 1.6;
    setPhase('ready');
    updateHUD();
  }
  function startReel() {
    reelT = 0; reelDur = 1.6;
    setPhase('reeling');
    updateHUD();
  }
  function updateJump(dt) {
    if (!jump.active) {
      jumpTimer -= dt;
      if (jumpTimer <= 0) {
        jump.active = true; jump.t = 0; jump.dur = rand(0.7, 1.0);
        jump.x = rand(200, 296); jump.baseY = rand(80, 122);
        jump.dir = Math.random() < 0.5 ? -1 : 1;
      }
    } else {
      jump.t += dt;
      if (jump.t >= jump.dur) { jump.active = false; jumpTimer = rand(5, 11); }
    }
  }
  function finishReel() {
    // pick rarity strictly through the exposed test interface
    const rarity = window.fishing.pickRarity(Math.random());
    const pool = FISH[rarity] || FISH.Common;
    const f = pool[Math.floor(Math.random() * pool.length)];
    current = { name: f.name, rarity: rarity, art: f.art };
    window.fishing.log.unshift({ name: f.name, rarity: rarity });
    updateLogUI();
    revealT = 0;
    catchFlash = 0.28;
    spawnRipple(rodTip.x + 12, rodTip.y + 16, 22, 26);
    setPhase('reveal');
    showReveal();
    updateHUD();
  }
  function endReveal() {
    hideReveal();
    current = null;
    setPhase('ready');
    updateHUD();
  }

  // ---------------------------------------------------------------- input
  function doAction() {
    if (phase === 'ready') startCast();
    else if (phase === 'bite') startReel();
    else if (phase === 'reveal') endReveal();
    // waiting / reeling: ignored (no overlapping casts / duplicate catches)
  }
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;
      doAction();
    }
  });
  const btn = document.getElementById('actionBtn');
  btn.addEventListener('click', function (e) { e.preventDefault(); btn.blur(); doAction(); });
  // clicking the water also casts/reels, for convenience
  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); doAction(); });

  // ---------------------------------------------------------------- HUD
  const promptEl = document.getElementById('prompt');
  const bitebar = document.getElementById('bitebar');
  const bitefill = document.getElementById('bitefill');
  const instrEl = document.getElementById('instruction');
  const legendGrid = document.getElementById('legendGrid');
  const logList = document.getElementById('logList');
  const reveal = document.getElementById('reveal');
  const revealFish = document.getElementById('revealFish');
  const revealName = document.getElementById('revealName');
  const revealRarity = document.getElementById('revealRarity');
  const rctx = revealFish.getContext('2d');
  rctx.imageSmoothingEnabled = false;

  function buildLegend() {
    let html = '';
    for (let i = 0; i < RARITIES.length; i++) {
      const c = TIER_COLOR[RARITIES[i]];
      html += '<div class="odd"><span class="dot" style="background:' + c + '"></span>' +
        RARITIES[i] + '<b>' + Math.round(ODDS[i] * 100) + '%</b></div>';
    }
    legendGrid.innerHTML = html;
  }
  buildLegend();

  function updateLogUI() {
    if (window.fishing.log.length === 0) {
      logList.innerHTML = '<li class="empty">nothing yet…</li>';
      return;
    }
    let html = '';
    const recent = window.fishing.log.slice(0, 8);
    for (const c of recent) {
      const col = TIER_COLOR[c.rarity] || '#fff';
      html += '<li><span class="dot" style="background:' + col + '"></span>' +
        '<span class="lg-name">' + escapeHtml(c.name) + '</span></li>';
    }
    logList.innerHTML = html;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function updateHUD() {
    promptEl.classList.remove('hot');
    btn.classList.remove('hot');
    bitebar.classList.remove('show');
    switch (phase) {
      case 'ready':
        if (missed && missMsgT > 0) {
          promptEl.textContent = 'It got away! Cast again?';
        } else {
          promptEl.textContent = 'Press SPACE or tap CAST to fish';
        }
        btn.disabled = false; btn.textContent = 'CAST';
        break;
      case 'waiting':
        promptEl.textContent = landed ? 'Waiting for a bite…' : 'Casting…';
        btn.disabled = true; btn.textContent = 'WAIT';
        break;
      case 'bite':
        promptEl.textContent = 'BITE!  REEL NOW →';
        promptEl.classList.add('hot');
        btn.disabled = false; btn.textContent = 'REEL!';
        btn.classList.add('hot');
        bitebar.classList.add('show');
        break;
      case 'reeling':
        promptEl.textContent = 'Reeling it in…';
        btn.disabled = true; btn.textContent = 'REELING';
        break;
      case 'reveal':
        promptEl.textContent = 'A catch!';
        btn.disabled = false; btn.textContent = 'NEXT';
        break;
    }
  }

  function showReveal() {
    if (!current) return;
    revealRarity.textContent = current.rarity;
    revealName.textContent = current.name;
    reveal.className = 'tier-' + current.rarity.toLowerCase();
    // force reflow so the transition replays
    void reveal.offsetWidth;
    reveal.classList.add('show');
  }
  function hideReveal() {
    reveal.classList.remove('show');
  }

  // ------------------------------------------------------ reveal fish canvas
  function renderRevealFish() {
    if (phase !== 'reveal' || !current) return;
    const cw = revealFish.width, ch = revealFish.height;
    rctx.clearRect(0, 0, cw, ch);
    drawTierBackdrop(rctx, current.rarity, T, cw, ch);
    const art = FISH_ART[current.art];
    if (!art) return;
    const maxW = cw - 24, maxH = ch - 20;
    let s = Math.max(1, Math.floor(Math.min(maxW / art.w, maxH / art.h)));
    s = Math.min(s, 6);
    rctx.save();
    rctx.imageSmoothingEnabled = false;
    rctx.translate(Math.round(cw / 2 - art.w * s / 2), Math.round(ch / 2 - art.h * s / 2));
    rctx.scale(s, s);
    art.draw(rctx);
    rctx.restore();
  }
  function rpx(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function drawTierBackdrop(g, tier, t, cw, ch) {
    const cx = cw / 2, cy = ch / 2;
    if (tier === 'Common') {
      g.globalAlpha = 0.22; g.fillStyle = '#8a7a60';
      disc(g, cx, cy, 20); g.globalAlpha = 1;
    } else if (tier === 'Uncommon') {
      g.globalAlpha = 0.25; g.fillStyle = '#2f7a3a'; disc(g, cx, cy, 22); g.globalAlpha = 1;
      // leaves
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + t * 0.3;
        const lx = cx + Math.cos(a) * 26, ly = cy + Math.sin(a) * 21;
        rpx(g, lx - 1, ly - 1, 3, 3, '#6fce6a');
      }
    } else if (tier === 'Rare') {
      g.globalAlpha = 0.3; g.fillStyle = '#2a6ea0'; disc(g, cx, cy, 23); g.globalAlpha = 1;
      ring(g, cx, cy, 24, 20, '#59b6ff');
      ring(g, cx, cy, 28, 24, 'rgba(89,182,255,0.5)');
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2 + t * 1.2;
        sparkle(g, cx + Math.cos(a) * 27, cy + Math.sin(a) * 22, '#bfe6ff');
      }
    } else if (tier === 'Epic') {
      g.globalAlpha = 0.35;
      const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 30);
      grad.addColorStop(0, '#7a3fbf'); grad.addColorStop(1, 'rgba(40,10,70,0)');
      g.fillStyle = grad; disc(g, cx, cy, 30); g.globalAlpha = 1;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + t * 0.7;
        sparkle(g, cx + Math.cos(a) * 28, cy + Math.sin(a) * 22, i % 2 ? '#e0b3ff' : '#b76bff');
      }
    } else if (tier === 'Legendary') {
      // rotating golden rays
      g.globalAlpha = 0.6;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2 + t * 0.5;
        g.fillStyle = i % 2 ? '#ffd45e' : '#fff4b4';
        for (let r = 6; r < 32; r += 1.5) {
          g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.82), 1, 1);
        }
      }
      g.globalAlpha = 1;
      // crown
      const cw2 = 14, ch2 = 8, bx = cx - cw2 / 2, by = cy - 30;
      for (let i = 0; i < 3; i++) {
        const px2 = bx + 1 + i * (cw2 - 2) / 2;
        rpx(g, px2, by - 5, 2, 6, '#ffd45e');
        rpx(g, px2, by - 6, 1, 1, '#fff2b0');
      }
      rpx(g, bx, by, cw2, 3, '#e0a94b');
    } else if (tier === 'Ancient') {
      // dark vignette
      g.globalAlpha = 0.6; g.fillStyle = '#04161a'; disc(g, cx, cy, 34); g.globalAlpha = 1;
      // rune ring
      ring(g, cx, cy, 28, 24, '#4fe6c4');
      ring(g, cx, cy, 33, 28, 'rgba(79,230,196,0.35)');
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + t * 0.4;
        rune(g, cx + Math.cos(a) * 31, cy + Math.sin(a) * 27, i);
      }
      // glow pulse behind fish
      g.globalAlpha = 0.25 + Math.sin(t * 2) * 0.12;
      g.fillStyle = '#4fe6c4'; disc(g, cx, cy, 22); g.globalAlpha = 1;
    }
  }
  function disc(g, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      g.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1);
    }
  }
  function ring(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    const steps = Math.max(12, Math.round(rx * 2));
    for (let i = 0; i < steps; i++) {
      const a = i / steps * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    }
  }
  function sparkle(g, x, y, col) {
    g.fillStyle = col;
    x = Math.round(x); y = Math.round(y);
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y - 1, 1, 3);
  }
  // small procedural rune marks (no fonts / glyph assets)
  function rune(g, x, y, kind) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = '#8ffbe4';
    const p = (a, b, w, h) => g.fillRect(x + a, y + b, w, h);
    p(0, -3, 1, 7);
    if (kind % 3 === 0) { p(-2, -1, 2, 1); p(1, -1, 2, 1); }
    else if (kind % 3 === 1) { p(-2, -3, 2, 1); p(-2, -3, 1, 4); p(1, -3, 2, 1); p(2, -3, 1, 4); }
    else { p(-2, 1, 2, 1); p(1, 1, 2, 1); p(-2, -3, 4, 1); }
  }

  // ---------------------------------------------------------------- loop
  let last = performance.now();
  let splashClock = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (document.hidden) dt = 0;           // timers pause while hidden
    dt = Math.min(dt, 0.05);

    update(dt);

    if (phase === 'bite') {
      bitefill.style.width = Math.max(0, (1 - biteT / biteDur) * 100) + '%';
      splashClock += dt;
      if (splashClock > 0.28) { splashClock = 0; spawnRipple(bobberTarget.x, bobberTarget.y, 14, 18); }
    }

    renderScene(dt);
    if (phase === 'reveal') renderRevealFish();

    if (startBanner <= 0) instrEl.classList.add('gone');
    if (phase === 'ready' && missMsgT > 0) updateHUD();

    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- init
  updateHUD();
  // keep HUD in sync when miss message expires
  setInterval(function () {
    if (phase === 'ready' && missMsgT <= 0 && /got away/.test(promptEl.textContent)) updateHUD();
  }, 200);

  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
