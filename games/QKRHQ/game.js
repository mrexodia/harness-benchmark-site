/* =========================================================================
   Tideline - game
   A cozy top-down island fishing spot. 320x180 pixel scene, UI at full res.
   ========================================================================= */
(function () {
  'use strict';

  const W = 320, H = 180, SCALE = 4, DW = 1280, DH = 720;
  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  const RARITY_COLOR = {
    Common: '#b9c2c9', Uncommon: '#63c46a', Rare: '#4aa8e0',
    Epic: '#b06ae0', Legendary: '#f2c14e', Ancient: '#3ad6c8'
  };
  const RARITY_GLOW = {
    Common: '#7f8b93', Uncommon: '#2f7a38', Rare: '#1f5f96',
    Epic: '#6a2f9a', Legendary: '#a8781a', Ancient: '#0e5f5a'
  };
  const REVEAL_DUR = {
    Common: 1.6, Uncommon: 1.75, Rare: 1.95, Epic: 2.25,
    Legendary: 2.7, Ancient: 3.2
  };

  // ---- canvases ---------------------------------------------------------
  const screen = document.getElementById('screen');
  const dctx = screen.getContext('2d');
  dctx.imageSmoothingEnabled = false;

  const scene = Art.makeCanvas(W, H);
  const sg = Art.ctxOf(scene);

  // ---- geometry ---------------------------------------------------------
  const DOCK = { left: 120, right: 152, top: 38, bottom: 118 };
  const ANGLER = { x: 136, y: 78 };          // top-left of 12x20 sprite
  const ROD_HAND = { x: ANGLER.x + 11, y: ANGLER.y + 9 };
  const ROD_TIP = { x: 170, y: 58 };

  // =======================================================================
  //  STATIC ART
  // =======================================================================
  // Shoreline height (top-down): land above, water below.
  const SHORE_PTS = [[0, 52], [26, 45], [56, 50], [88, 43], [118, 48], [150, 41], [182, 47], [214, 42], [246, 49], [280, 44], [320, 49]];
  function shoreY(x) {
    for (let i = 0; i < SHORE_PTS.length - 1; i++) {
      const a = SHORE_PTS[i], b = SHORE_PTS[i + 1];
      if (x >= a[0] && x <= b[0]) {
        const t = (x - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return SHORE_PTS[SHORE_PTS.length - 1][1];
  }

  function drawTree(g, x, baseY, s) {
    g.fillStyle = '#5a3613';
    g.fillRect(x - 2, baseY - 20 * s, 4, 22 * s);
    g.fillStyle = '#3f2510';
    g.fillRect(x, baseY - 20 * s, 2, 22 * s);
    Art.fillEll(g, x, baseY - 26 * s, 20 * s, 14 * s, '#2f5c27');
    Art.fillEll(g, x - 8 * s, baseY - 30 * s, 12 * s, 10 * s, '#3f7a34');
    Art.fillEll(g, x + 9 * s, baseY - 29 * s, 12 * s, 10 * s, '#57963f');
    Art.fillEll(g, x - 2 * s, baseY - 34 * s, 8 * s, 6 * s, '#6fb04a');
  }

  function drawReed(g, x, baseY, h, sway, seed) {
    // a cattail / reed clump
    for (let i = 0; i < 3; i++) {
      const bx = x + i * 3 - 3;
      const hh = h - i * 3;
      const s = Math.sin(sway + seed + i) * 1.6;
      for (let y = 0; y < hh; y++) {
        const xx = Math.round(bx + s * (y / hh));
        g.fillStyle = (y % 7 < 3) ? '#547a2f' : '#6f9c3f';
        g.fillRect(xx, baseY - y, 1, 1);
      }
      // seed head
      g.fillStyle = '#8a5a2b';
      const hx = Math.round(bx + s);
      g.fillRect(hx, baseY - hh - 4, 2, 5);
      g.fillStyle = '#6b4420';
      g.fillRect(hx + 1, baseY - hh - 4, 1, 5);
    }
  }

  function buildStatic() {
    const c = Art.makeCanvas(W, H), g = Art.ctxOf(c);

    // ---------- island land across the top ----------
    const pts = [[0, 0], [W, 0]];
    for (let x = W; x >= 0; x -= 6) pts.push([x, shoreY(x)]);
    Art.fillPoly(g, pts, '#4f8c3f');
    // grass tone patches
    const patches = [[20, 12, 22, 12, '#57963f'], [70, 20, 26, 14, '#3f7433'], [130, 8, 30, 16, '#67a84e'],
      [190, 18, 24, 13, '#3f7433'], [250, 10, 28, 15, '#57963f'], [300, 20, 22, 12, '#4a8a38']];
    for (const p of patches) Art.fillEll(g, p[0], p[1], p[2], p[3], p[4]);
    // dirt path from the dock up into the island
    for (let y = 0; y < 44; y++) {
      const w = 8 + Math.sin(y * 0.5) * 2;
      g.fillStyle = '#b08f5f';
      g.fillRect(Math.round(136 - w / 2), y, Math.round(w), 1);
    }
    for (let y = 0; y < 44; y += 3) {
      g.fillStyle = '#c9a878';
      g.fillRect(133, y, 6, 2);
    }
    // soil band under the grass
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x);
      g.fillStyle = '#3f7433';
      g.fillRect(x, sy - 5, 1, 3);
    }
    // sandy beach strip along the shoreline
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x);
      g.fillStyle = '#c9a878';
      g.fillRect(x, sy - 2, 1, 6);
      g.fillStyle = '#b08f5f';
      g.fillRect(x, sy + 3, 1, 2);
      g.fillStyle = '#96774c';
      g.fillRect(x, sy + 4, 1, 1);
    }
    // foam where the water meets the sand
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x);
      g.fillStyle = (x % 5 === 0) ? '#eaf7f2' : 'rgba(234,247,242,0.5)';
      g.fillRect(x, sy + 5, 1, 1);
    }
    // shallow water band just off the shore
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x);
      g.fillStyle = 'rgba(150,224,214,0.22)';
      g.fillRect(x, sy + 6, 1, 7);
      g.fillStyle = 'rgba(150,224,214,0.10)';
      g.fillRect(x, sy + 13, 1, 6);
    }
    // pebbles on the beach
    const peb = [[24, 50], [70, 54], [104, 47], [150, 52], [196, 50], [242, 54], [288, 49]];
    for (const p of peb) { g.fillStyle = '#8c8f98'; g.fillRect(p[0], p[1], 3, 2); g.fillStyle = '#6b6e78'; g.fillRect(p[0], p[1] + 1, 3, 1); g.fillStyle = '#8c8f98'; }

    // ---------- trees along the top ----------
    drawTree(g, 22, 34, 1.0);
    drawTree(g, 86, 30, 0.85);
    drawTree(g, 208, 32, 0.95);
    drawTree(g, 286, 28, 0.8);

    // ---------- dock (from the shore into the water) ----------
    g.fillStyle = '#5a3613';
    g.fillRect(DOCK.left - 2, DOCK.top, 3, DOCK.bottom - DOCK.top + 4);
    g.fillRect(DOCK.right - 1, DOCK.top, 3, DOCK.bottom - DOCK.top + 4);
    for (let y = DOCK.top; y < DOCK.bottom; y += 6) {
      const gap = ((y / 6) | 0) % 2;
      g.fillStyle = '#a9702f';
      g.fillRect(DOCK.left, y, DOCK.right - DOCK.left, 5);
      g.fillStyle = '#cf9450';
      g.fillRect(DOCK.left, y, DOCK.right - DOCK.left, 1);
      g.fillStyle = '#5a3613';
      g.fillRect(DOCK.left, y + 5, DOCK.right - DOCK.left, 1);
      g.fillStyle = '#6b6e78';
      g.fillRect(DOCK.left + 4 + gap, y + 2, 1, 1);
      g.fillRect(DOCK.right - 6 - gap, y + 2, 1, 1);
      g.fillStyle = '#7d4f1f';
      g.fillRect(DOCK.left + 6 + ((y * 3) % 18), y + 3, 11, 1);
    }
    g.fillStyle = '#3f2510';
    g.fillRect(DOCK.left - 1, DOCK.top, 1, DOCK.bottom - DOCK.top + 1);
    g.fillRect(DOCK.right, DOCK.top, 1, DOCK.bottom - DOCK.top + 1);
    g.fillStyle = '#7d4f1f';
    g.fillRect(DOCK.left - 1, DOCK.bottom, DOCK.right - DOCK.left + 2, 3);
    g.fillStyle = '#3f2510';
    g.fillRect(DOCK.left - 1, DOCK.bottom + 3, DOCK.right - DOCK.left + 2, 1);

    // bucket + lantern on the dock (near the shore)
    g.fillStyle = '#6b6e78'; g.fillRect(DOCK.left + 3, 54, 7, 7);
    g.fillStyle = '#8c8f98'; g.fillRect(DOCK.left + 3, 54, 7, 2);
    g.fillStyle = '#4a4d55'; g.fillRect(DOCK.left + 3, 60, 7, 1);
    g.fillStyle = '#b4b7bf'; g.fillRect(DOCK.left + 4, 56, 5, 1);
    g.fillStyle = '#3f2510'; g.fillRect(DOCK.right - 4, 50, 2, 12);
    g.fillStyle = '#f2c14e'; g.fillRect(DOCK.right - 10, 42, 8, 8);
    g.fillStyle = '#ffefa8'; g.fillRect(DOCK.right - 8, 44, 4, 4);
    g.fillStyle = '#8a5a2b'; g.fillRect(DOCK.right - 10, 41, 8, 2); g.fillRect(DOCK.right - 10, 50, 8, 1);

    // ---------- shore bushes, flowers, reeds ----------
    for (const b of [[12, 1.0, '#3f7a34'], [54, 0.9, '#356b2c'], [100, 0.8, '#3f7a34'], [170, 0.9, '#356b2c'], [232, 1.0, '#3f7a34'], [300, 0.9, '#356b2c']]) {
      const x = b[0], sc = b[1], sy = shoreY(x);
      Art.fillEll(g, x, sy - 6, 15 * sc, 8 * sc, b[2]);
      Art.fillEll(g, x - 5, sy - 9, 9 * sc, 6 * sc, '#57963f');
      Art.fillEll(g, x + 6, sy - 8, 7 * sc, 5 * sc, '#6fb04a');
    }
    const fl = [[40, 44, '#e8615d'], [66, 48, '#f2c14e'], [124, 42, '#d96fa3'], [186, 45, '#f4f0d8'], [258, 47, '#e8615d'], [300, 44, '#f2c14e']];
    for (const f of fl) { g.fillStyle = f[2]; g.fillRect(f[0], f[1], 2, 2); g.fillStyle = '#3f7a34'; g.fillRect(f[0], f[1] + 2, 1, 3); }

    drawReed(g, 34, shoreY(34) + 12, 26, 0, 1);
    drawReed(g, 96, shoreY(96) + 14, 30, 1, 2);
    drawReed(g, 178, shoreY(178) + 13, 27, 2, 3);
    drawReed(g, 268, shoreY(268) + 15, 30, 3, 4);

    // ---------- foreground framing in the water ----------
    drawReed(g, 6, 182, 34, 4, 5);
    drawReed(g, 20, 184, 28, 5, 6);
    drawReed(g, 300, 183, 32, 2, 7);
    drawReed(g, 314, 182, 26, 1, 8);
    const pads = [[70, 120, 7], [92, 138, 5], [128, 150, 6], [200, 112, 6], [232, 140, 5], [262, 120, 6], [286, 150, 4], [176, 160, 5], [40, 150, 5]];
    for (const p of pads) {
      Art.fillEll(g, p[0], p[1], p[2], p[2] * 0.55, '#3f7a34');
      Art.fillEll(g, p[0], p[1] - 1, p[2] - 1, p[2] * 0.45, '#57963f');
      g.fillStyle = '#2f5c27'; g.fillRect(p[0] - 1, p[1], 1, 1);
    }
    Art.fillEll(g, 232, 134, 3, 2, '#f4f0d8');
    Art.fillEll(g, 232, 133, 2, 1, '#d96fa3');
    for (const r of [[54, 168, 8], [102, 176, 6], [250, 172, 9], [290, 162, 5]]) {
      Art.fillEll(g, r[0], r[1], r[2], r[2] * 0.6, '#6b6e78');
      Art.fillEll(g, r[0], r[1] - 2, r[2] - 2, r[2] * 0.45, '#8c8f98');
      Art.fillEll(g, r[0] - 1, r[1] - 3, r[2] * 0.5, r[2] * 0.3, '#b4b7bf');
    }
    // a half-sunken mossy log
    g.fillStyle = '#5a3613'; g.fillRect(148, 132, 48, 8);
    g.fillStyle = '#7d4f1f'; g.fillRect(148, 132, 48, 3);
    g.fillStyle = '#3f2510'; g.fillRect(148, 139, 48, 1);
    g.fillStyle = '#2a1a10'; g.fillRect(148, 132, 2, 8); g.fillRect(194, 132, 2, 8);
    g.fillStyle = '#3f7a34'; g.fillRect(156, 133, 9, 2); g.fillRect(174, 134, 7, 2); g.fillRect(186, 133, 6, 2);
    g.fillStyle = '#57963f'; g.fillRect(158, 133, 4, 1); g.fillRect(176, 134, 3, 1);
    // drifting leaves
    for (const lf of [[118, 96, '#57963f'], [240, 90, '#e6a23c'], [210, 150, '#3f7a34'], [66, 108, '#e6a23c']]) {
      Art.fillEll(g, lf[0], lf[1], 3, 2, lf[2]);
      g.fillStyle = '#2f5c27'; g.fillRect(lf[0], lf[1], 1, 1);
    }
    return c;
  }

  const staticCanvas = buildStatic();

  // =======================================================================
  //  WATER
  // =======================================================================
  const waterBase = (function () {
    const c = Art.makeCanvas(W, H), g = Art.ctxOf(c);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#4aa0bc');
    grad.addColorStop(0.4, '#2f7fa0');
    grad.addColorStop(1, '#1c597a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // soft depth mottling
    Art.fillEll(g, 60, 150, 92, 42, 'rgba(18,66,96,0.16)');
    Art.fillEll(g, 226, 118, 108, 48, 'rgba(120,200,210,0.07)');
    Art.fillEll(g, 160, 184, 150, 58, 'rgba(12,54,80,0.20)');
    Art.fillEll(g, 270, 84, 80, 36, 'rgba(120,200,210,0.06)');
    Art.fillEll(g, 30, 96, 70, 34, 'rgba(18,66,96,0.12)');
    return c;
  })();

  function drawWater(g, t) {
    g.drawImage(waterBase, 0, 0);
    // ambient fish shadows gliding under the surface
    for (const f of G.fishShadows) {
      g.globalAlpha = 0.16;
      g.fillStyle = '#0c2a3c';
      Art.fillEll(g, f.x, f.y, f.sz, f.sz * 0.45, '#0c2a3c');
      const tx = f.x - f.dir * f.sz * 1.4;
      Art.fillPoly(g, [[tx, f.y], [tx - f.dir * f.sz * 1.3, f.y - f.sz * 0.5], [tx - f.dir * f.sz * 1.3, f.y + f.sz * 0.5]], '#0c2a3c');
      g.globalAlpha = 1;
    }
    // animated ripple dashes
    for (let y = 34; y < H; y += 4) {
      const depth = y / H;
      const amp = 0.8 + depth * 1.8;
      const speed = 5 + depth * 9;
      const step = 11;
      for (let x = -6; x < W + 6; x += step) {
        const n = Math.sin((x * 0.11) + (t * speed) + (y * 0.55));
        const xx = Math.round(x + n * amp);
        const key = (x * 13 + y * 7) & 7;
        if (key === 0 || key === 3) {
          g.fillStyle = depth < 0.5 ? '#79c3cf' : '#57a9bd';
          g.fillRect(xx, y, 3 + (key === 0 ? 2 : 0), 1);
        }
      }
    }
    // warm dappled sunlight patches drifting slowly
    g.globalAlpha = 0.10;
    g.fillStyle = '#ffeeb8';
    for (let i = 0; i < 5; i++) {
      const px = ((i * 67 + t * 6) % (W + 80)) - 40;
      const py = 60 + i * 24 + Math.sin(t * 0.6 + i) * 4;
      Art.fillEll(g, px, py, 14, 5, '#ffeeb8');
    }
    g.globalAlpha = 1;
    // dock reflection below its end
    g.globalAlpha = 0.12;
    g.fillStyle = '#2a1a12';
    g.fillRect(DOCK.left + 2, DOCK.bottom + 4, DOCK.right - DOCK.left - 4, 20);
    g.globalAlpha = 1;
    // lily-pad shadows
    g.globalAlpha = 0.10;
    g.fillStyle = '#0d2a3a';
    for (const p of [[70, 120], [92, 138], [128, 150], [200, 112], [232, 140], [262, 120], [286, 150], [176, 160], [40, 150]]) {
      Art.fillEll(g, p[0] + 1, p[1] + 2, 6, 2, '#0d2a3a');
    }
    g.globalAlpha = 1;
  }

  // =======================================================================
  //  PIXEL LINE + RINGS
  // =======================================================================
  function pline(g, x0, y0, x1, y1, col, thick) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    g.fillStyle = col;
    for (;;) {
      g.fillRect(x0, y0, thick || 1, thick || 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function ring(g, cx, cy, r, col, ry, from, to) {
    ry = ry === undefined ? 0.45 : ry;
    from = from === undefined ? 0 : from;
    to = to === undefined ? Math.PI * 2 : to;
    g.fillStyle = col;
    const steps = Math.max(6, Math.round(r * 6));
    for (let i = 0; i <= steps; i++) {
      const a = from + (to - from) * (i / steps);
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * ry), 1, 1);
    }
  }

  // =======================================================================
  //  PARTICLES
  // =======================================================================
  function spawnSplash(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      G.splash.push({
        x, y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30,
        life: 0.5 + Math.random() * 0.4, t: 0, col: col || '#eaf7f2', size: Math.random() < 0.5 ? 1 : 2
      });
    }
  }
  function spawnRipple(x, y) {
    G.ripples.push({ x, y, t: 0, life: 1.1, max: 16 + Math.random() * 6 });
  }
  function updateParticles(dt) {
    for (let i = G.splash.length - 1; i >= 0; i--) {
      const p = G.splash[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      if (p.t >= p.life) G.splash.splice(i, 1);
    }
    for (let i = G.ripples.length - 1; i >= 0; i--) {
      const r = G.ripples[i]; r.t += dt;
      if (r.t >= r.life) G.ripples.splice(i, 1);
    }
    for (let i = G.revealP.length - 1; i >= 0; i--) {
      const p = G.revealP[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
      if (p.t >= p.life) G.revealP.splice(i, 1);
    }
  }

  // =======================================================================
  //  GAME STATE
  // =======================================================================
  const G = {
    state: 'ready',
    t: 0,
    castDur: 0.55,
    waitDur: 2.6,
    biteDur: 1.15,
    reelDur: 0.95,
    revealDur: 1.6,
    target: { x: 205, y: 125 },
    bobber: { x: ROD_TIP.x, y: ROD_TIP.y },
    bobPhase: 0,
    lineCast: 0,
    caught: null,       // {key,name,rarity}
    log: [],
    splash: [],
    ripples: [],
    revealP: [],
    motes: [],
    msg: '',
    msgT: 0,
    started: false,
    flash: 0,
    time: 0
  };

  // ambient air motes
  for (let i = 0; i < 22; i++) {
    G.motes.push({
      x: Math.random() * W, y: 20 + Math.random() * 158,
      vy: 3 + Math.random() * 5, sway: Math.random() * 6.28,
      size: Math.random() < 0.3 ? 2 : 1, a: 0.25 + Math.random() * 0.4
    });
  }
  // ambient fish shadows
  G.fishShadows = [];
  for (let i = 0; i < 4; i++) {
    G.fishShadows.push({
      x: Math.random() * W, y: 96 + Math.random() * 72,
      dir: Math.random() < 0.5 ? -1 : 1, sp: 6 + Math.random() * 8,
      sz: 4 + Math.random() * 3, ph: Math.random() * 6.28
    });
  }

  function pickRarity(u) {
    if (!(u >= 0)) return 'Common';
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  function chooseCatch() {
    // Call through the public object so tests can replace it.
    let rarity = window.fishing.pickRarity(Math.random());
    if (RARITIES.indexOf(rarity) === -1) rarity = 'Common';
    const keys = Art.FISH_BY_RARITY[rarity];
    const key = keys[(Math.random() * keys.length) | 0];
    return { key: key, name: Art.NAME_BY_KEY[key], rarity: rarity };
  }

  // ---- transitions ------------------------------------------------------
  function startCast() {
    G.started = true;
    G.state = 'waiting';
    G.t = 0;
    G.lineCast = 0;
    G.bobPhase = 0;
    G.target = {
      x: 168 + Math.random() * 122,
      y: 62 + Math.random() * 88
    };
    G.waitDur = 1.8 + Math.random() * 2.4;
    G.msg = '';
  }
  function enterBite() {
    G.state = 'bite';
    G.t = 0;
    spawnSplash(G.bobber.x, G.bobber.y + 1, 7, '#eaf7f2');
    spawnRipple(G.bobber.x, G.bobber.y);
    G.msg = 'BITE!';
  }
  function miss() {
    G.state = 'ready';
    G.t = 0;
    G.msg = 'It slipped away...';
    G.msgT = 1.4;
    spawnRipple(G.bobber.x, G.bobber.y);
    G.bobber.x = ROD_TIP.x; G.bobber.y = ROD_TIP.y;
  }
  function startReel() {
    G.state = 'reeling';
    G.t = 0;
    G.caught = chooseCatch();
    G.reelFrom = { x: G.bobber.x, y: G.bobber.y };
    G.revealDur = REVEAL_DUR[G.caught.rarity] || 1.8;
    spawnSplash(G.bobber.x, G.bobber.y, 14, '#eaf7f2');
    spawnRipple(G.bobber.x, G.bobber.y);
    G.flash = 0.12;
  }
  function enterReveal() {
    G.state = 'reveal';
    G.t = 0;
    G.bobber.x = ROD_TIP.x; G.bobber.y = ROD_TIP.y;
    G.log.unshift({ name: G.caught.name, rarity: G.caught.rarity, key: G.caught.key });
    if (G.log.length > 8) G.log.pop();
    spawnRevealParticles(G.caught.rarity);
  }

  function spawnRevealParticles(rarity) {
    const col = RARITY_COLOR[rarity];
    const n = { Common: 0, Uncommon: 8, Rare: 14, Epic: 22, Legendary: 34, Ancient: 44 }[rarity] || 0;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 70;
      G.revealP.push({
        x: 640 + Math.cos(a) * 40, y: 340 + Math.sin(a) * 30,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        g: (rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Ancient') ? -18 : 30, t: 0, life: 1.2 + Math.random() * 1.6,
        col: Math.random() < 0.4 ? '#ffffff' : col, size: Math.random() < 0.5 ? 2 : 3
      });
    }
  }

  // ---- action -----------------------------------------------------------
  function action() {
    if (G.state === 'ready') startCast();
    else if (G.state === 'bite') startReel();
    else if (G.state === 'reveal') G.t = G.revealDur; // dismiss
  }

  // =======================================================================
  //  UPDATE
  // =======================================================================
  function update(dt) {
    G.time += dt;
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt);
    if (G.msgT > 0) { G.msgT -= dt; if (G.msgT <= 0) G.msg = ''; }
    updateParticles(dt);
    // ambient motes
    for (const m of G.motes) {
      m.y -= m.vy * dt;
      m.x += Math.sin(G.time * 0.8 + m.sway) * 4 * dt;
      if (m.y < 20) { m.y = 178; m.x = Math.random() * W; }
    }
    for (const f of G.fishShadows) {
      f.x += f.dir * f.sp * dt;
      f.y += Math.sin(G.time * 0.8 + f.ph) * 3 * dt;
      if (f.x < -34) f.x = W + 34;
      if (f.x > W + 34) f.x = -34;
    }

    if (G.state === 'waiting') {
      G.t += dt;
      if (G.t < G.castDur) {
        const p = G.t / G.castDur;
        const ease = p;
        G.bobber.x = ROD_TIP.x + (G.target.x - ROD_TIP.x) * ease;
        G.bobber.y = ROD_TIP.y + (G.target.y - ROD_TIP.y) * ease - Math.sin(Math.PI * p) * 34;
        G.lineCast = p;
      } else {
        G.lineCast = 1;
        if (!G.landed) {
          G.landed = true;
          spawnSplash(G.target.x, G.target.y, 9, '#eaf7f2');
          spawnRipple(G.target.x, G.target.y);
        }
        G.bobPhase += dt;
        G.bobber.x = G.target.x;
        G.bobber.y = G.target.y + Math.sin(G.bobPhase * 2.4) * 1.5;
        if (G.t >= G.castDur + G.waitDur) { G.landed = false; enterBite(); }
      }
    } else if (G.state === 'bite') {
      G.t += dt;
      G.bobPhase += dt;
      const k = Math.abs(Math.sin(G.t * 11));
      G.bobber.x = G.target.x + Math.sin(G.t * 9) * 0.8;
      G.bobber.y = G.target.y + 2 + k * 3.5;
      if (Math.random() < 0.35) spawnSplash(G.bobber.x, G.bobber.y + 1, 1, '#bfe9ec');
      if (G.t >= G.biteDur) miss();
    } else if (G.state === 'reeling') {
      G.t += dt;
      const p = Math.min(1, G.t / G.reelDur);
      const e = 1 - Math.pow(1 - p, 3);
      G.bobber.x = G.reelFrom.x + (ROD_TIP.x - G.reelFrom.x) * e;
      G.bobber.y = G.reelFrom.y + (ROD_TIP.y - G.reelFrom.y) * e - Math.sin(Math.PI * e) * 14;
      if (Math.random() < 0.6) spawnSplash(G.bobber.x, G.bobber.y + 1, 1, '#bfe9ec');
      if (p >= 1) enterReveal();
    } else if (G.state === 'reveal') {
      G.t += dt;
      if (G.t >= G.revealDur) {
        G.state = 'ready';
        G.t = 0;
        G.caught = null;
        G.landed = false;
        G.bobber.x = ROD_TIP.x; G.bobber.y = ROD_TIP.y;
      }
    }
  }

  // =======================================================================
  //  SCENE RENDER
  // =======================================================================
  function drawAngler(g, t) {
    // rod first (behind body)
    const hx = ROD_HAND.x, hy = ROD_HAND.y;
    pline(g, hx - 1, hy + 1, ROD_TIP.x, ROD_TIP.y, '#2a1a10', 2);
    pline(g, hx, hy, ROD_TIP.x - 1, ROD_TIP.y, '#c07f42', 1);
    // reel
    g.fillStyle = '#6b6e78';
    g.fillRect(hx - 3, hy + 2, 3, 3);
    g.fillStyle = '#b4b7bf';
    g.fillRect(hx - 3, hy + 2, 3, 1);
    // shadow
    g.globalAlpha = 0.28;
    Art.fillEll(g, ANGLER.x + 6, ANGLER.y + 20, 8, 2.4, '#20160f');
    g.globalAlpha = 1;
    // body, gentle idle bob
    const bob = Math.round(Math.sin(t * 1.6) * 0.6);
    g.drawImage(Art.anglerSprite, ANGLER.x, ANGLER.y + bob);
  }

  function drawFishing(g, t) {
    // line from rod tip to bobber
    if (G.state !== 'ready') {
      const tipX = ROD_TIP.x, tipY = ROD_TIP.y;
      const bx = Math.round(G.bobber.x), by = Math.round(G.bobber.y);
      // slight sag while floating
      if (G.state === 'waiting' && G.lineCast >= 1) {
        const midX = (tipX + bx) / 2, midY = (tipY + by) / 2 + 5 + Math.sin(t * 2) * 0.6;
        pline(g, tipX, tipY, Math.round(midX), Math.round(midY), 'rgba(240,245,240,0.55)', 1);
        pline(g, Math.round(midX), Math.round(midY), bx, by, 'rgba(240,245,240,0.55)', 1);
      } else {
        pline(g, tipX, tipY, bx, by, 'rgba(240,245,240,0.6)', 1);
      }
    }
    // bobber only once it has left the rod
    const showBobber = (G.state === 'waiting' && G.t > 0.03) || G.state === 'bite' || G.state === 'reeling';
    if (showBobber) {
      const bx = Math.round(G.bobber.x), by = Math.round(G.bobber.y);
      // ripple rings
      for (const r of G.ripples) {
        const k = r.t / r.life;
        ring(g, r.x, r.y, 2 + k * r.max * 0.4, 'rgba(230,250,245,' + (0.5 * (1 - k)).toFixed(2) + ')', 0.4);
      }
      // water contact ring
      ring(g, bx, by + 1, 3, 'rgba(220,245,240,0.45)', 0.4);
      // shadow
      g.globalAlpha = 0.25; Art.fillEll(g, bx, by + 2, 3, 1.2, '#0d2a3a'); g.globalAlpha = 1;
      // bobber body: white bottom, red top
      Art.fillEll(g, bx, by + 1, 2.4, 2.2, '#d9d2c4');
      Art.fillEll(g, bx, by, 2.4, 2, '#e0433a');
      Art.fillEll(g, bx, by, 1.4, 1.1, '#f07a6a');
      g.fillStyle = '#20161f'; g.fillRect(bx, by - 4, 1, 2);
      // bite reaction: strong dunk + bubbles + unmistakable "!"
      if (G.state === 'bite') {
        g.fillStyle = '#eaf7f2';
        g.fillRect(bx - 2, by + 3, 1, 1); g.fillRect(bx + 2, by + 2, 1, 1);
        // shrinking window ring
        const frac = 1 - G.t / G.biteDur;
        ring(g, bx, by, 8, 'rgba(255,255,255,0.25)', 0.7);
        ring(g, bx, by, 8, RARITY_COLOR.Legendary, 0.7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        // pulsing alert ring
        ring(g, bx, by, 4 + (G.t % 0.5) * 14, 'rgba(255,255,255,' + (0.5 * (1 - (G.t % 0.5) / 0.5)).toFixed(2) + ')', 0.6);
        // "!" alert
        const ey = by - 15 + Math.round(Math.sin(G.t * 14));
        g.fillStyle = '#20161f';
        g.fillRect(bx - 2, ey - 1, 4, 9);
        g.fillRect(bx - 2, ey + 8, 4, 5);
        g.fillStyle = '#ffe89a';
        g.fillRect(bx - 1, ey, 2, 6);
        g.fillRect(bx - 1, ey + 9, 2, 2);
      }
    }
    // splash particles
    for (const p of G.splash) {
      const k = p.t / p.life;
      g.globalAlpha = Math.max(0, 1 - k);
      g.fillStyle = p.col;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
  }

  function drawMotes(g) {
    for (const m of G.motes) {
      g.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(G.time * 1.5 + m.sway));
      g.fillStyle = '#fff2c0';
      g.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
    }
    g.globalAlpha = 1;
  }

  function renderScene(t) {
    sg.clearRect(0, 0, W, H);
    drawWater(sg, t);
    sg.drawImage(staticCanvas, 0, 0);
    drawMotes(sg);
    drawAngler(sg, t);
    drawFishing(sg, t);
  }

  // =======================================================================
  //  FULL-RES UI
  // =======================================================================
  function panel(g, x, y, w, h, fill, border) {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(x + 3, y + 4, w, h);
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
    g.fillStyle = border;
    g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2);
    g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x + 2, y + 2, w - 4, 2);
  }

  function setFont(g, size, weight) {
    g.font = (weight || '') + ' ' + size + 'px "Courier New", ui-monospace, monospace';
    g.textBaseline = 'top';
  }

  function drawInstructions(g) {
    const x = 20, y = 16, w = 330, h = 92;
    panel(g, x, y, w, h, 'rgba(20,26,34,0.82)', '#6a7b8c');
    g.fillStyle = '#f2c14e';
    setFont(g, 22, 'bold');
    g.fillText('TIDELINE', x + 16, y + 12);
    g.fillStyle = '#9fb2c4';
    setFont(g, 13);
    g.fillText('an island fishing spot', x + 152, y + 19);
    g.fillStyle = '#e8eef2';
    setFont(g, 14);
    g.fillText('SPACE / click  -  cast & reel', x + 16, y + 44);
    g.fillStyle = '#a9bccb';
    g.fillText('Wait for the bite, then reel!', x + 16, y + 64);
  }

  function drawLog(g) {
    const w = 288, h = 34 + 8 * 21, x = DW - 20 - w, y = 16;
    panel(g, x, y, w, h, 'rgba(20,26,34,0.82)', '#6a7b8c');
    g.fillStyle = '#f2c14e';
    setFont(g, 15, 'bold');
    g.fillText('CATCH LOG', x + 14, y + 10);
    g.fillStyle = '#7f93a3';
    setFont(g, 12);
    g.fillText('newest first', x + w - 110, y + 12);
    if (G.log.length === 0) {
      g.fillStyle = '#8b9aa8';
      setFont(g, 14);
      g.fillText('No catches yet - cast away!', x + 14, y + 44);
      return;
    }
    setFont(g, 14);
    for (let i = 0; i < G.log.length; i++) {
      const e = G.log[i];
      const ey = y + 36 + i * 21;
      const col = RARITY_COLOR[e.rarity];
      g.fillStyle = col;
      g.fillRect(x + 12, ey + 3, 10, 10);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x + 12, ey + 3, 10, 3);
      g.fillStyle = '#eef3f6';
      g.fillText(e.name, x + 30, ey + 2);
      g.fillStyle = col;
      setFont(g, 11);
      g.fillText(e.rarity.toUpperCase(), x + w - 92, ey + 5);
      setFont(g, 14);
    }
  }

  function drawLegend(g) {
    const rows = [['Common', '45%'], ['Uncommon', '25%'], ['Rare', '15%'], ['Epic', '8%'], ['Legendary', '5%'], ['Ancient', '2%']];
    const w = 268, h = 34 + rows.length * 20, x = 20, y = DH - 20 - h;
    panel(g, x, y, w, h, 'rgba(20,26,34,0.82)', '#6a7b8c');
    g.fillStyle = '#f2c14e';
    setFont(g, 15, 'bold');
    g.fillText('RARITY ODDS', x + 14, y + 10);
    setFont(g, 14);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], ey = y + 36 + i * 20;
      const col = RARITY_COLOR[r[0]];
      g.fillStyle = col;
      g.fillRect(x + 14, ey + 3, 10, 10);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(x + 14, ey + 3, 10, 3);
      g.fillStyle = '#eef3f6';
      g.fillText(r[0], x + 32, ey + 1);
      g.fillStyle = col;
      g.fillText(r[1], x + w - 60, ey + 1);
    }
  }

  function drawButton(g, t) {
    let label = 'CAST', active = true, pulse = 0;
    if (G.state === 'waiting') { label = 'WAIT'; active = false; }
    else if (G.state === 'bite') { label = 'REEL!'; pulse = 1; }
    else if (G.state === 'reeling') { label = '...'; active = false; }
    else if (G.state === 'reveal') { label = 'NEXT'; }
    const w = 168, h = 58, x = (DW - w) / 2, y = DH - 76;
    const scale = pulse ? 1 + Math.sin(t * 16) * 0.04 : 1;
    g.save();
    g.translate(x + w / 2, y + h / 2);
    g.scale(scale, scale);
    g.translate(-(x + w / 2), -(y + h / 2));
    const border = pulse ? '#ffe89a' : (active ? '#f2c14e' : '#55636f');
    panel(g, x, y, w, h, active ? 'rgba(38,48,60,0.92)' : 'rgba(30,36,44,0.85)', border, 6);
    g.fillStyle = pulse ? '#ffe89a' : (active ? '#f2c14e' : '#7f93a3');
    setFont(g, 26, 'bold');
    const tw = g.measureText(label).width;
    g.fillText(label, x + (w - tw) / 2, y + 16);
    g.restore();
  }

  function drawPrompt(g, t) {
    let text = '', col = '#e8eef2';
    if (G.state === 'ready' && !G.started) { text = 'Press SPACE or click CAST to begin'; }
    else if (G.state === 'ready') { text = 'Ready to cast'; col = '#bcd0dd'; }
    else if (G.state === 'waiting') { text = 'Keep an eye on the bobber...'; col = '#bcd0dd'; }
    else if (G.state === 'bite') { text = 'BITE!  REEL NOW!'; col = '#ffe89a'; }
    else if (G.state === 'reeling') { text = 'Reeling in...'; col = '#bcd0dd'; }
    else if (G.state === 'reveal') { text = 'SPACE to continue'; col = '#bcd0dd'; }
    setFont(g, 16, G.state === 'bite' ? 'bold' : '');
    const tw = g.measureText(text).width;
    const bx = (DW - tw) / 2, by = DH - 104;
    if (G.state === 'bite') {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(bx - 12, by - 4, tw + 24, 26);
    }
    g.fillStyle = col;
    g.fillText(text, bx, by);
    if (G.msg && G.msgT > 0 && G.state === 'ready') {
      setFont(g, 16, 'bold');
      const mw = g.measureText(G.msg).width;
      g.fillStyle = '#f2a0a0';
      g.fillText(G.msg, (DW - mw) / 2, DH - 132);
    }
  }

  // ---- reveal card ------------------------------------------------------
  function drawReveal(g, t) {
    const F = G.caught;
    if (!F) return;
    const rarity = F.rarity, col = RARITY_COLOR[rarity], glow = RARITY_GLOW[rarity];
    const total = G.revealDur;
    const p = Math.min(1, G.t / Math.min(0.45, total * 0.4)); // entrance
    const ease = 1 - Math.pow(1 - p, 3);

    // darken scene
    g.fillStyle = 'rgba(4,10,16,' + (0.55 * ease).toFixed(2) + ')';
    g.fillRect(0, 0, DW, DH);

    const cw = 580, ch = 306, cx = (DW - cw) / 2, cy = 196 + (1 - ease) * 40;
    const a = ease;

    // glow behind card
    const rg = g.createRadialGradient(DW / 2, cy + ch * 0.45, 20, DW / 2, cy + ch * 0.45, 420);
    rg.addColorStop(0, hexA(col, 0.42 * a));
    rg.addColorStop(0.5, hexA(glow, 0.22 * a));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, DW, DH);

    // rotating rays for high tiers
    if (rarity === 'Legendary' || rarity === 'Ancient') {
      g.save();
      g.translate(DW / 2, cy + ch * 0.42);
      g.rotate(t * (rarity === 'Ancient' ? -0.35 : 0.5));
      const rays = rarity === 'Ancient' ? 12 : 16;
      for (let i = 0; i < rays; i++) {
        g.rotate(Math.PI * 2 / rays);
        g.fillStyle = hexA(col, 0.10 * a);
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(340, -26); g.lineTo(340, 26); g.closePath();
        g.fill();
      }
      g.restore();
    }

    // card
    const cardFill = rarity === 'Ancient' ? 'rgba(6,20,24,0.96)' : 'rgba(18,24,32,0.94)';
    panel(g, cx, cy, cw, ch, cardFill, col, 8);
    // tier-specific frame decoration
    drawCardFrame(g, cx, cy, cw, ch, rarity, col, t, a);

    // rarity word
    setFont(g, 20, 'bold');
    g.fillStyle = col;
    const rw = g.measureText(rarity.toUpperCase()).width;
    g.fillText(rarity.toUpperCase(), cx + (cw - rw) / 2, cy + 20);
    // divider
    g.fillStyle = hexA(col, 0.5 * a);
    g.fillRect(cx + 60, cy + 46, cw - 120, 2);

    // fish
    const spr = Art.getFishSprite(F.key);
    const maxW = cw - 190, maxH = 150;
    const scale = Math.max(1, Math.floor(Math.min(maxW / spr.width, maxH / spr.height)));
    const fw = spr.width * scale, fh = spr.height * scale;
    const fx = cx + (cw - fw) / 2;
    const floatY = Math.sin(t * 2) * 5;
    const fy = cy + 70 + floatY + (1 - ease) * 30;
    // platform shadow
    g.globalAlpha = 0.25 * a;
    Art.fillEll(g, cx + cw / 2, fy + fh + 10, fw * 0.35, 8, '#000');
    g.globalAlpha = 1;
    // pulsing halo behind fish
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    g.fillStyle = hexA(col, (0.10 + 0.10 * pulse) * a);
    Art.fillEll(g, cx + cw / 2, fy + fh / 2, fw * 0.62, fh * 0.75, hexA(col, (0.10 + 0.10 * pulse) * a));

    g.save();
    g.imageSmoothingEnabled = false;
    if (rarity === 'Ancient') {
      g.translate(cx + cw / 2, fy + fh / 2);
      g.rotate(Math.sin(t * 0.8) * 0.06);
      g.drawImage(spr, -fw / 2, -fh / 2, fw, fh);
    } else {
      g.drawImage(spr, fx, fy, fw, fh);
    }
    g.restore();

    // name plate
    setFont(g, 30, 'bold');
    const nw = g.measureText(F.name).width;
    const ny = cy + ch - 64;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(DW / 2 - nw / 2 - 18, ny - 8, nw + 36, 42);
    g.fillStyle = '#f8f2e2';
    g.fillText(F.name, (DW - nw) / 2, ny);
    // tiny tier tag line
    setFont(g, 13);
    g.fillStyle = hexA(col, 0.9);
    const tag = RARITY_TAG[rarity];
    const gw = g.measureText(tag).width;
    g.fillText(tag, (DW - gw) / 2, cy + ch - 22);

    // particles
    for (const q of G.revealP) {
      const k = q.t / q.life;
      g.globalAlpha = Math.max(0, 1 - k) * a;
      g.fillStyle = q.col;
      g.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
    }
    g.globalAlpha = 1;

    // flash
    if (G.flash > 0) {
      g.globalAlpha = Math.min(1, G.flash * 6);
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, DW, DH);
      g.globalAlpha = 1;
    }
  }
  const RARITY_TAG = {
    Common: 'a humble catch', Uncommon: 'a fine catch', Rare: 'a prized catch',
    Epic: 'a remarkable catch', Legendary: 'a legendary catch', Ancient: 'older than the tides'
  };

  function drawCardFrame(g, x, y, w, h, rarity, col, t, a) {
    // corner ornaments / different treatment per tier
    const corner = (ox, oy, sx, sy) => {
      g.fillStyle = hexA(col, 0.9 * a);
      g.fillRect(ox, oy, 18 * sx, 3 * sy < 0 ? 3 : 3);
    };
    if (rarity === 'Common') {
      g.fillStyle = hexA(col, 0.5 * a);
      g.fillRect(x + 10, y + 8, 12, 2); g.fillRect(x + w - 22, y + 8, 12, 2);
      g.fillRect(x + 10, y + h - 10, 12, 2); g.fillRect(x + w - 22, y + h - 10, 12, 2);
    } else if (rarity === 'Uncommon') {
      g.fillStyle = hexA(col, 0.6 * a);
      for (const c of [[x + 14, y + 12], [x + w - 14, y + 12], [x + 14, y + h - 12], [x + w - 14, y + h - 12]]) {
        g.fillRect(c[0] - 3, c[1], 6, 1); g.fillRect(c[0], c[1] - 3, 1, 6);
      }
    } else if (rarity === 'Rare') {
      // shimmering diagonal bands
      g.save();
      g.beginPath(); g.rect(x, y, w, h); g.clip();
      for (let i = -2; i < 8; i++) {
        const off = ((t * 60 + i * 90) % (w + 200)) - 100;
        g.fillStyle = hexA('#ffffff', 0.07 * a);
        g.beginPath();
        g.moveTo(x + off, y); g.lineTo(x + off + 40, y);
        g.lineTo(x + off - 120, y + h); g.lineTo(x + off - 160, y + h);
        g.closePath(); g.fill();
      }
      g.restore();
      g.fillStyle = hexA(col, 0.7 * a);
      for (const c of [[x + 16, y + 14], [x + w - 16, y + 14], [x + 16, y + h - 14], [x + w - 16, y + h - 14]]) {
        g.fillRect(c[0] - 2, c[1] - 2, 5, 5);
        g.fillStyle = hexA('#ffffff', 0.5 * a); g.fillRect(c[0], c[1], 2, 2);
        g.fillStyle = hexA(col, 0.7 * a);
      }
    } else if (rarity === 'Epic') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      g.fillStyle = hexA(col, (0.35 + 0.35 * pulse) * a);
      for (const c of [[x + 16, y + 16], [x + w - 16, y + 16], [x + 16, y + h - 16], [x + w - 16, y + h - 16]]) {
        g.fillRect(c[0] - 4, c[1] - 4, 9, 9);
        g.fillStyle = hexA('#ffffff', 0.6 * a); g.fillRect(c[0] - 1, c[1] - 1, 3, 3);
        g.fillStyle = hexA(col, (0.35 + 0.35 * pulse) * a);
      }
    } else if (rarity === 'Legendary') {
      // studded gold frame
      g.fillStyle = hexA(col, 0.9 * a);
      g.fillRect(x, y, w, 4); g.fillRect(x, y + h - 4, w, 4);
      g.fillRect(x, y, 4, h); g.fillRect(x + w - 4, y, 4, h);
      g.fillStyle = hexA('#fff4c8', 0.9 * a);
      for (let i = x + 24; i < x + w - 10; i += 40) { g.fillRect(i, y, 3, 3); g.fillRect(i, y + h - 3, 3, 3); }
      for (let j = y + 24; j < y + h - 10; j += 40) { g.fillRect(x, j, 3, 3); g.fillRect(x + w - 3, j, 3, 3); }
    } else if (rarity === 'Ancient') {
      // carved stone notches + rune rings
      g.fillStyle = hexA('#0a3b3a', a);
      g.fillRect(x + 6, y + 6, w - 12, h - 12);
      g.fillStyle = hexA(col, 0.85 * a);
      g.fillRect(x + 3, y + 3, w - 6, 2); g.fillRect(x + 3, y + h - 5, w - 6, 2);
      g.fillRect(x + 3, y + 3, 2, h - 6); g.fillRect(x + w - 5, y + 3, 2, h - 6);
      // notches
      g.fillStyle = hexA('#062a2a', a);
      for (let i = x + 20; i < x + w - 12; i += 26) { g.fillRect(i, y + 1, 6, 4); g.fillRect(i, y + h - 5, 6, 4); }
      // counter-rotating rune dots
      const cxm = x + w / 2, cym = y + h / 2;
      drawRuneRing(g, cxm, cym, 96, 12, t * 0.5, col, a);
      drawRuneRing(g, cxm, cym, 112, 18, -t * 0.3, '#7fe8d8', a * 0.6);
    }
  }
  function drawRuneRing(g, cx, cy, r, n, rot, col, a) {
    for (let i = 0; i < n; i++) {
      const ang = rot + i * Math.PI * 2 / n;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r * 0.78;
      g.fillStyle = hexA(col, a);
      g.fillRect(Math.round(x), Math.round(y), 3, 3);
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(2) + ')';
  }

  // =======================================================================
  //  MAIN RENDER
  // =======================================================================
  function render() {
    const t = G.time;
    renderScene(t);
    dctx.imageSmoothingEnabled = false;
    dctx.clearRect(0, 0, DW, DH);
    dctx.drawImage(scene, 0, 0, W, H, 0, 0, DW, DH);
    // subtle scene vignette
    const vg = dctx.createRadialGradient(DW / 2, DH / 2, 300, DW / 2, DH / 2, 780);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,10,20,0.24)');
    dctx.fillStyle = vg;
    dctx.fillRect(0, 0, DW, DH);

    drawInstructions(dctx);
    drawLog(dctx);
    drawLegend(dctx);
    drawPrompt(dctx, t);
    drawButton(dctx, t);
    if (G.state === 'reveal') drawReveal(dctx, t);
  }

  // =======================================================================
  //  LOOP
  // =======================================================================
  let last = 0, raf = 0, running = false;
  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;   // clamp so hidden tabs don't jump
    update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  // ---- input ------------------------------------------------------------
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) action();
    }
  }, { passive: false });
  screen.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    action();
  });

  // =======================================================================
  //  TEST INTERFACE
  // =======================================================================
  window.fishing = {
    get state() { return G.state; },
    pickRarity: pickRarity,
    get log() { return G.log.map(function (e) { return { name: e.name, rarity: e.rarity }; }); }
  };

  // ---- go ---------------------------------------------------------------
  start();
})();
