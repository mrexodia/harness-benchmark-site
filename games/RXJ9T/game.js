/* =========================================================================
   Tidepool Cove — a cozy top-down-ish fishing scene.
   All artwork is generated procedurally in code (canvas).
   Logic is driven by a small phase machine: ready -> waiting -> bite ->
   reeling -> reveal -> ready.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------- constants ------------------------------- */
  const W = 320, H = 180;            // logical scene resolution
  const SCALE = 4;                    // requested logical->display scale
  const DW = W * SCALE, DH = H * SCALE;

  const CAST_TIME = 0.85;
  const WAIT_MIN = 1.6, WAIT_MAX = 3.1;
  const BITE_WINDOW = 1.35;
  const REEL_TIME = 1.15;
  const REVEAL_AUTO = 2.9;
  const REVEAL_MIN = 0.6;

  const RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  const RARITY_COLOR = {
    Common: '#cbd4dc', Uncommon: '#7fdc86', Rare: '#6db8ff',
    Epic: '#c17dff', Legendary: '#ffcf4d', Ancient: '#6ff0d8'
  };

  /* ------------------------------- palette ------------------------------- */
  const P = {
    skyTop: '#3aa6d4', skyMid: '#7fd0e6', skyLow: '#c6eae4', skyWarm: '#ffe7b4',
    sun: '#fff6cf', sunGlow: '#ffe7a0',
    cloud: '#fdf7ec', cloudShade: '#cfe2e6',
    hillFar: '#93bcae', hillMid: '#6f9f83', hillNear: '#4f8464',
    treeFar: '#69997c', treeMid: '#437a5c', treeDark: '#2d5a43', treeLite: '#79b478',
    trunk: '#5c4433', trunkDark: '#42301f',
    waterFar: '#8fd2dd', waterMid: '#4a9ec0', waterDeep: '#2f7ba0', waterDark: '#215d80',
    waterLite: '#b3e7ec', waterGlint: '#eefcff', foam: '#ecf8f3',
    sand: '#e8d29e', sandShade: '#cdb077', sandDark: '#ab8e59',
    grass: '#6faa4a', grassLite: '#93ce62', grassDark: '#4a8137',
    rock: '#909098', rockShade: '#656d76', rockLite: '#b9bec4',
    wood: '#ab7742', woodLite: '#cd9a5f', woodDark: '#7c5328', woodInk: '#513719',
    skin: '#ecb587', skinShade: '#c98d61',
    shirt: '#d05a3d', shirtShade: '#a63f2b', shirtLite: '#e87a58',
    pants: '#40598a', pantsShade: '#2c4064',
    hat: '#dcb463', hatShade: '#b48c41', hatBand: '#8a5a35',
    hair: '#6b4a2f',
    bobberRed: '#e14b3a', bobberWhite: '#f7f4ea',
    ink: '#2a2320',
    uiText: '#eaf6f0', uiDim: '#9fb4ad',
    panel: 'rgba(16,26,33,0.74)', panelEdge: 'rgba(233,246,240,0.16)'
  };

  /* ------------------------------- canvases ------------------------------ */
  const main = document.getElementById('game');
  const mctx = main.getContext('2d');
  mctx.imageSmoothingEnabled = false;

  const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
  const sctx = scene.getContext('2d'); sctx.imageSmoothingEnabled = false;

  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  const bctx = bg.getContext('2d'); bctx.imageSmoothingEnabled = false;

  /* ------------------------------- helpers ------------------------------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function disc(c, cx, cy, r, col) { FishArt.ellipse(c, Math.round(cx), Math.round(cy), r, r, col); }
  function ell(c, cx, cy, rx, ry, col) { FishArt.ellipse(c, Math.round(cx), Math.round(cy), rx, ry, col); }

  // checkerboard dither between two colours
  function dither(c, x, y, w, h, a, b, phase) {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        px(c, x + xx, y + yy, 1, 1, ((xx + yy + (phase || 0)) & 1) ? a : b);
      }
    }
  }

  // vertical gradient banded with dithering (classic pixel-art sky)
  function gradBand(c, x, y, w, h, stops) {
    for (let yy = 0; yy < h; yy++) {
      const t = yy / (h - 1 || 1);
      const col = sampleStops(stops, t);
      px(c, x, y + yy, w, 1, col);
    }
  }
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(v | 0, 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
  }
  function sampleStops(stops, t) {
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i][0] && t <= stops[i + 1][0]) {
        const u = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0] || 1);
        return mix(stops[i][1], stops[i + 1][1], u);
      }
    }
    return stops[stops.length - 1][1];
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

  /* ====================================================================== */
  /*  STATIC BACKGROUND                                                     */
  /* ====================================================================== */
  let creatureSeeds = [];

  function buildBackground() {
    creatureSeeds = [];
    for (let i = 0; i < 60; i++) creatureSeeds.push(Math.random());
    bctx.clearRect(0, 0, W, H);

    // ---- sky ----
    gradBand(bctx, 0, 0, W, 64, [
      [0.0, P.skyTop], [0.55, P.skyMid], [0.82, P.skyLow], [1.0, P.skyWarm]
    ]);

    // sun + glow
    disc(bctx, 262, 24, 26, mix(P.skyMid, P.sunGlow, 0.25));
    disc(bctx, 262, 24, 18, mix(P.skyMid, P.sunGlow, 0.5));
    disc(bctx, 262, 24, 11, P.sun);
    disc(bctx, 262, 24, 7, '#fffbe6');

    // distant clouds (static parts; drifting ones drawn per-frame)
    drawHillLayer(bctx, 64, P.hillFar, 26, 0.9, 11);
    drawHillLayer(bctx, 64, P.hillMid, 34, 1.4, 7);
    drawHillLayer(bctx, 64, P.hillNear, 46, 2.1, 3);

    // ---- water base (bands from horizon to bottom) ----
    gradBand(bctx, 0, 62, W, H - 62, [
      [0.0, P.waterFar], [0.18, P.waterMid], [0.55, P.waterDeep], [1.0, P.waterDark]
    ]);
    // softer dither bridge at horizon
    dither(bctx, 0, 62, W, 6, P.waterFar, P.waterMid, 0);

    // horizontal tone ripples baked in (static texture)
    for (let y = 66; y < H; y += 3) {
      const t = (y - 66) / (H - 66);
      const col = mix(P.waterMid, P.waterDark, clamp(t * 0.9, 0, 1));
      const off = ((y * 7) % 5) - 2;
      px(bctx, 0, y, W, 1, col);
      px(bctx, 30 + off, y + 1, 70, 1, mix(col, P.waterDeep, 0.4));
    }

    // ---- far shore strip just under horizon ----
    for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.11) * 1.4 + Math.sin(x * 0.31 + 2) * 0.8;
      const h = 2 + Math.round(n + 2);
      px(bctx, x, 61 - Math.round(n * 0.4), 1, h, P.hillNear);
    }

    // ---- left foreground bank ----
    drawBank(bctx);
    // ---- dock ----
    drawDock(bctx);
    // ---- vegetation & details ----
    drawTree(bctx, 6, 152, 46);     // big tree, left
    drawTree(bctx, 52, 128, 30, true);
    drawBush(bctx, 78, 150, 20);
    drawBush(bctx, 104, 156, 16);
    drawReeds(bctx, 18, 158);
    drawReeds(bctx, 132, 162);
    drawRocks(bctx, 116, 160);
    drawRocks(bctx, 88, 166);
    drawFlowers(bctx, 60, 150);
    drawLilypads(bctx, 210, 128);
    drawLilypads(bctx, 40, 150);
    // dock props
    drawLantern(bctx, 306, 96);
    drawBucket(bctx, 234, 110);
    drawSign(bctx, 174, 148);
  }

  // layered distant hills/trees
  function drawHillLayer(c, baseY, col, amp, freq, seed) {
    c.fillStyle = col;
    for (let x = 0; x < W; x++) {
      const y = baseY - (Math.sin(x * 0.05 * freq + seed) * 0.6 + Math.sin(x * 0.13 * freq + seed * 2) * 0.4) * amp;
      const top = Math.round(y);
      px(c, x, top, 1, 62 - top + 2, col);
      // tiny tree bumps on the far ridge
      if (Math.sin(x * 0.7 + seed) > 0.86) px(c, x, top - 2, 1, 2, col);
    }
  }

  function drawBank(c) {
    // sandy/grassy bank across the bottom-left, leaving open water to the right
    for (let x = 0; x < 190; x++) {
      const edge = 152 + Math.round(Math.sin(x * 0.045) * 5 + Math.sin(x * 0.15) * 2) - Math.round(x * 0.06);
      for (let y = edge; y < H; y++) {
        const dy = y - edge;
        let col = P.sand;
        if (dy < 2) col = P.sandShade;
        else if (dy > 12) col = P.sandShade;
        if (dy > 16) col = P.sandDark;
        px(c, x, y, 1, 1, col);
      }
      // grass lip
      if (edge < 165) {
        px(c, x, edge - 2, 1, 2, P.grassDark);
        px(c, x, edge - 1, 1, 1, P.grass);
        if ((x & 1) === 0) px(c, x, edge - 3, 1, 1, P.grassLite);
      }
    }
    // a couple of sandy wet patches near the waterline
    dither(c, 8, 150, 40, 4, P.sandShade, P.sand, 1);
  }

  function drawDock(c) {
    // deck
    const y = 116, x0 = 226, x1 = W;
    for (let x = x0; x < x1; x++) {
      const plank = ((x - x0) % 7 === 0);
      px(c, x, y, 1, 7, plank ? P.woodDark : P.wood);
      if (plank) px(c, x, y, 1, 7, P.woodInk);
      px(c, x, y, 5, 1, P.woodLite);
      px(c, x, y + 7, 1, 1, P.woodInk);
    }
    px(c, x0, y - 1, x1 - x0, 1, P.woodLite);
    // front rim shadow
    px(c, x0, y + 7, x1 - x0, 1, P.woodInk);
    // posts into water
    for (const pxx of [232, 262, 296]) {
      px(c, pxx, y + 8, 3, 26, P.woodDark);
      px(c, pxx, y + 8, 1, 26, P.woodInk);
      px(c, pxx + 2, y + 8, 1, 26, P.wood);
    }
    // deck plank nails
    for (let x = x0 + 3; x < x1; x += 7) px(c, x, y + 3, 1, 1, P.woodInk);
  }

  function drawTree(c, x, groundY, size, small) {
    const trunkH = Math.round(size * 0.28);
    const trunkW = Math.max(3, Math.round(size * 0.11));
    // trunk
    px(c, x - (trunkW >> 1), groundY - trunkH, trunkW, trunkH + 2, P.trunk);
    px(c, x - (trunkW >> 1), groundY - trunkH, 1, trunkH + 2, P.trunkDark);
    // roots
    px(c, x - (trunkW >> 1) - 3, groundY, 4, 2, P.trunkDark);
    px(c, x + (trunkW >> 1), groundY, 4, 2, P.trunkDark);
    // canopy: overlapping clumps
    const cy = groundY - trunkH - Math.round(size * 0.32);
    const clumps = small
      ? [[0, 0, size * 0.34], [-size * 0.26, size * 0.06, size * 0.24], [size * 0.26, size * 0.06, size * 0.24]]
      : [[0, -size * 0.05, size * 0.42], [-size * 0.32, size * 0.08, size * 0.3], [size * 0.32, size * 0.08, size * 0.3], [-size * 0.12, -size * 0.28, size * 0.26], [size * 0.16, -size * 0.26, size * 0.24]];
    // shadow side
    for (const [dx, dy, r] of clumps) disc(c, x + dx + 2, cy + dy + 2, r, P.treeDark);
    for (const [dx, dy, r] of clumps) disc(c, x + dx, cy + dy, r, P.treeMid);
    // light side
    for (const [dx, dy, r] of clumps) disc(c, x + dx - 2, cy + dy - 2, r * 0.72, P.treeLite);
    // speckle highlights
    for (let i = 0; i < clumps.length * 6; i++) {
      const a = creatureSeeds[i % creatureSeeds.length] || (i * 0.37 % 1);
      const cl = clumps[i % clumps.length];
      const ang = a * Math.PI * 2;
      const rr = cl[2] * 0.7;
      px(c, x + cl[0] + Math.cos(ang) * rr, cy + cl[1] + Math.sin(ang) * rr, 1, 1, P.treeLite);
    }
  }

  function drawBush(c, x, y, r) {
    disc(c, x + 2, y + 2, r * 0.8, P.treeDark);
    disc(c, x, y, r, P.treeMid);
    disc(c, x - 2, y - 2, r * 0.62, P.grass);
    disc(c, x - 3, y - 3, r * 0.38, P.treeLite);
    for (let i = 0; i < 8; i++) {
      const s = creatureSeeds[i] || 0.3;
      px(c, x - r + s * r * 2, y - r * 0.6 + (i % 3), 1, 1, P.grassLite);
    }
    // small berries
    px(c, x - 3, y + 1, 1, 1, '#c9564f');
    px(c, x + 3, y - 1, 1, 1, '#c9564f');
  }

  function drawReeds(c, x, y) {
    for (let i = 0; i < 8; i++) {
      const bx = x + i * 4 + (i % 2);
      const h = 16 + ((i * 7) % 9);
      for (let k = 0; k < h; k++) {
        const sway = Math.round(Math.sin(k * 0.25 + i) * (k / h) * 2);
        px(c, bx + sway, y - k, 1, 1, k % 4 === 0 ? P.grassDark : P.grass);
      }
      if (i % 3 === 0) {
        px(c, bx + Math.round(Math.sin(h * 0.25 + i) * 2) - 1, y - h - 3, 3, 4, '#8a5a3a');
        px(c, bx + Math.round(Math.sin(h * 0.25 + i) * 2), y - h - 4, 1, 2, '#a06d47');
      }
    }
  }

  function drawRocks(c, x, y) {
    disc(c, x, y, 7, P.rockShade);
    disc(c, x - 1, y - 1, 6, P.rock);
    disc(c, x - 2, y - 2, 3, P.rockLite);
    disc(c, x + 9, y + 2, 4, P.rockShade);
    disc(c, x + 8, y + 1, 3, P.rock);
    px(c, x + 8, y, 1, 1, P.rockLite);
  }

  function drawFlowers(c, x, y) {
    const cols = ['#f2d36a', '#e88fa8', '#efe9f2', '#f0a25a'];
    for (let i = 0; i < 7; i++) {
      const fx = x + i * 3 + (i % 2);
      const fh = 3 + (i % 3);
      px(c, fx, y - fh, 1, fh, P.grassDark);
      const col = cols[i % cols.length];
      px(c, fx - 1, y - fh - 1, 3, 2, col);
      px(c, fx, y - fh - 1, 1, 1, mix(col, '#ffffff', 0.5));
    }
  }

  function drawLilypads(c, x, y) {
    const pads = [[0, 0, 4], [7, 2, 3], [-6, -3, 3], [3, -6, 2]];
    for (const [dx, dy, r] of pads) {
      const px0 = x + dx, py0 = y + dy;
      ell(c, px0, py0, r, Math.max(2, r - 1), P.grassDark);
      ell(c, px0, py0 - 1, r - 1, Math.max(1, r - 2), P.grass);
      px(c, px0 + Math.round(r * 0.5), py0, 1, 1, P.waterDeep);
      if ((dx + dy) % 2 === 0) px(c, px0 - 1, py0 - 1, 1, 1, '#f2d36a');
    }
  }

  function drawLantern(c, x, y) {
    // post
    px(c, x, y, 2, 22, P.woodDark);
    px(c, x, y, 1, 22, P.woodInk);
    // lamp
    px(c, x - 2, y - 9, 6, 7, P.ink);
    px(c, x - 1, y - 8, 4, 6, '#ffd98a');
    px(c, x, y - 7, 2, 4, '#fff3c0');
    px(c, x - 2, y - 10, 6, 1, P.woodDark);
    disc(c, x + 1, y - 6, 6, 'rgba(255,220,140,0.18)');
  }

  function drawBucket(c, x, y) {
    px(c, x, y, 8, 7, P.woodDark);
    px(c, x, y, 8, 1, P.wood);
    px(c, x, y + 6, 8, 1, P.woodInk);
    px(c, x + 1, y - 2, 6, 2, '#8fa2a8');
    px(c, x + 3, y - 4, 2, 2, '#8fa2a8');
    // fish tails sticking out
    px(c, x + 2, y - 3, 3, 2, '#6f9fc4');
    px(c, x + 5, y - 4, 2, 2, '#c47a4a');
  }

  function drawSign(c, x, y) {
    px(c, x, y, 2, 20, P.woodDark);
    px(c, x - 10, y - 12, 22, 12, P.wood);
    px(c, x - 10, y - 12, 22, 1, P.woodLite);
    px(c, x - 10, y - 1, 22, 1, P.woodInk);
    // little painted fish
    px(c, x - 5, y - 7, 8, 3, '#4a8aa8');
    px(c, x + 3, y - 8, 3, 4, '#4a8aa8');
    px(c, x - 6, y - 6, 2, 2, '#3a6a88');
  }

  /* ====================================================================== */
  /*  ANGLER, ROD, BOBBER, LINE                                             */
  /* ====================================================================== */
  const ANGLER = { x: 258, y: 116 };
  const ROD_TIP_BASE = { x: 226, y: 86 };

  function drawAngler(c, t, castT, reelT) {
    const bob = Math.round(Math.sin(t * 2.0) * 0.5);
    const x = ANGLER.x, y = ANGLER.y + bob;
    const S = P;

    // shadow on dock
    ell(c, x, y + 1, 7, 2, 'rgba(20,20,20,0.28)');

    // legs
    px(c, x - 4, y - 6, 3, 6, S.pants);
    px(c, x + 1, y - 6, 3, 6, S.pantsShade);
    // boots
    px(c, x - 5, y - 2, 4, 2, S.ink);
    px(c, x, y - 2, 4, 2, S.ink);

    // torso
    px(c, x - 5, y - 13, 10, 7, S.shirt);
    px(c, x + 2, y - 13, 3, 7, S.shirtShade);
    px(c, x - 5, y - 13, 10, 1, S.shirtLite);
    // overalls / belt
    px(c, x - 5, y - 9, 10, 1, S.hatBand);

    // left arm (toward rod), animated slightly
    const armSwing = Math.round(Math.sin(t * 2.0) * 0.7);
    px(c, x - 8, y - 12 + armSwing, 4, 3, S.shirtLite);
    px(c, x - 10, y - 12 + armSwing, 3, 2, S.skin);
    // right arm
    px(c, x + 5, y - 12, 3, 3, S.shirtShade);
    px(c, x + 7, y - 11, 2, 2, S.skin);

    // head
    const hy = y - 19;
    px(c, x - 4, hy, 8, 6, S.skin);
    px(c, x + 1, hy, 3, 6, S.skinShade);
    // hair
    px(c, x - 4, hy, 8, 2, S.hair);
    px(c, x - 5, hy + 1, 2, 3, S.hair);
    // face (facing left)
    px(c, x - 4, hy + 2, 1, 1, S.ink);          // eye
    px(c, x - 5, hy + 4, 1, 1, mix(S.skinShade, S.ink, 0.4)); // mouth-ish
    // cheek
    px(c, x - 3, hy + 3, 1, 1, '#e59a7a');

    // straw hat
    px(c, x - 7, hy - 1, 14, 2, S.hat);
    px(c, x - 7, hy, 14, 1, S.hatShade);
    px(c, x - 4, hy - 4, 8, 3, S.hat);
    px(c, x + 1, hy - 4, 3, 3, S.hatShade);
    px(c, x - 4, hy - 2, 8, 1, S.hatBand);

    // rod (from hand toward upper-left)
    const hand = { x: x - 10, y: y - 12 + armSwing };
    const tip = rodTip(castT, t);
    drawRod(c, hand.x, hand.y, tip.x, tip.y, reelT);
    return { hand, tip };
  }

  function rodTip(castT, t) {
    // castT: 0 idle .. 1 fully forward
    const idleWob = Math.sin(t * 1.6) * 0.5;
    const back = { x: ROD_TIP_BASE.x + 8, y: ROD_TIP_BASE.y - 10 };
    const fwd = { x: ROD_TIP_BASE.x - 6, y: ROD_TIP_BASE.y + 6 };
    let x = lerp(back.x, fwd.x, castT);
    let y = lerp(back.y, fwd.y, castT) + idleWob;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function drawRod(c, x0, y0, x1, y1, reelT) {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    const bend = (reelT || 0) * 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bx = lerp(x0, x1, t) + Math.sin(t * Math.PI) * bend * 0.3;
      const by = lerp(y0, y1, t) + Math.sin(t * Math.PI) * bend;
      px(c, bx, by, 1, 1, i % 4 === 0 ? P.woodInk : P.woodDark);
    }
  }

  function drawLineAndBobber(c, tip, bob, t) {
    // line from rod tip to bobber (with sag)
    const mx = (tip.x + bob.x) / 2;
    const my = (tip.y + bob.y) / 2 + Math.abs(bob.x - tip.x) * 0.08 + 2;
    const n = Math.max(1, Math.round(Math.hypot(bob.x - tip.x, bob.y - tip.y) / 2));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const lx = (1 - u) * (1 - u) * tip.x + 2 * (1 - u) * u * mx + u * u * bob.x;
      const ly = (1 - u) * (1 - u) * tip.y + 2 * (1 - u) * u * my + u * u * bob.y;
      px(c, lx, ly, 1, 1, 'rgba(255,255,255,0.55)');
    }
  }

  function drawBobber(c, x, y, bobPhase, dip) {
    const yy = y + dip;
    // water shadow
    ell(c, x, yy + 2, 3, 1, 'rgba(10,40,55,0.4)');
    // top red, bottom white
    px(c, x - 1, yy - 2, 3, 2, P.bobberRed);
    px(c, x - 1, yy, 3, 2, P.bobberWhite);
    px(c, x, yy - 3, 1, 1, P.bobberRed);
    px(c, x - 1, yy - 2, 1, 1, '#f78f7f');
    // antenna
    px(c, x, yy - 4, 1, 1, P.ink);
  }

  // expanding ripple rings around the bobber
  let ripples = [];
  function spawnRipple(x, y, strength) {
    ripples.push({ x, y, t: 0, dur: 0.7 + Math.random() * 0.3, s: strength || 1 });
  }
  function updateRipples(dt) {
    for (const r of ripples) r.t += dt;
    ripples = ripples.filter((r) => r.t < r.dur);
  }
  function drawRipples(c) {
    for (const r of ripples) {
      const p = r.t / r.dur;
      const rad = 2 + p * 10 * r.s;
      const a = (1 - p) * 0.7;
      c.strokeStyle = `rgba(235,252,255,${a.toFixed(3)})`;
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(r.x, r.y, rad, Math.max(1, rad * 0.45), 0, 0, Math.PI * 2);
      c.stroke();
    }
  }

  /* ====================================================================== */
  /*  ANIMATED WATER + AMBIENT LIFE                                         */
  /* ====================================================================== */
  function drawWater(c, t) {
    // moving highlight wavelets
    c.save();
    for (let i = 0; i < 10; i++) {
      const baseY = 68 + i * 11;
      if (baseY > H) break;
      const speed = 0.4 + i * 0.05;
      const amp = 2 + i * 0.4;
      const off = Math.sin(t * speed + i * 1.7) * amp;
      const seg = 26 + (i % 3) * 10;
      const gap = 34 + (i % 4) * 8;
      const y = Math.round(baseY + off * 0.25);
      const alpha = 0.10 + (1 - i / 12) * 0.16;
      c.fillStyle = `rgba(200,240,248,${alpha.toFixed(3)})`;
      for (let x = -((t * (14 + i * 3)) % gap); x < W; x += gap) {
        c.fillRect(Math.round(x + off), y, seg, 1);
      }
    }
    c.restore();

    // twinkling sparkles on the surface
    for (let i = 0; i < 26; i++) {
      const s = creatureSeeds[i];
      const x = (s * 311 + t * (6 + (i % 5))) % W;
      const y = 66 + ((s * 97) % (H - 70));
      const tw = Math.sin(t * (2 + (i % 4)) + i * 2.3);
      if (tw > 0.82) {
        const a = (tw - 0.82) / 0.18;
        c.fillStyle = `rgba(240,255,255,${(a * 0.9).toFixed(3)})`;
        c.fillRect(x | 0, y | 0, 1, 1);
        if (a > 0.6) { c.fillRect((x | 0) + 1, y | 0, 1, 1); c.fillRect(x | 0, (y | 0) + 1, 1, 1); }
      }
    }

    // reflection streaks under the dock
    for (let i = 0; i < 4; i++) {
      const x = 240 + i * 16;
      const wob = Math.sin(t * 1.6 + i) * 2;
      c.fillStyle = 'rgba(30,60,75,0.25)';
      for (let y = 124; y < 148; y += 2) c.fillRect(Math.round(x + Math.sin(y * 0.5 + t * 2) * 1.5), y, 3, 1);
    }
    // shoreline foam (animated)
    c.fillStyle = 'rgba(236,248,243,0.7)';
    for (let x = 0; x < 190; x++) {
      const edge = 152 + Math.round(Math.sin(x * 0.045) * 5 + Math.sin(x * 0.15) * 2) - Math.round(x * 0.06);
      const f = Math.sin(x * 0.2 + t * 2.2);
      if (f > 0.2) c.fillRect(x, edge - 1 + (f > 0.7 ? -1 : 0), 1, 1);
    }
  }

  function drawClouds(c, t) {
    for (let i = 0; i < 4; i++) {
      const speed = 3 + i * 1.5;
      const cw = 30 + i * 12;
      const baseX = ((t * speed + i * 140) % (W + cw * 2)) - cw;
      const y = 12 + i * 9 + Math.sin(t * 0.3 + i) * 1.5;
      cloud(c, baseX, y, 0.8 + i * 0.18);
    }
  }

  // slow gull silhouettes for a sense of air and distance
  function drawGulls(c, t) {
    const gulls = [[0.04, 22, 1.0], [0.06, 30, 0.8], [0.03, 16, 0.9]];
    for (let i = 0; i < gulls.length; i++) {
      const [spd, y0, s] = gulls[i];
      const x = ((t * spd * 60 + i * 120) % (W + 30)) - 15;
      const y = y0 + Math.sin(t * 0.5 + i) * 2;
      const flap = Math.sin(t * 4 + i * 1.7);
      const wx = Math.round(3 * s), wy = Math.round((1 + flap) * s);
      px(c, x, y, 1, 1, '#f2f7f4');
      px(c, x - wx, y - wy, wx, 1, '#eef4f0');
      px(c, x + 1, y - wy, wx, 1, '#eef4f0');
    }
  }
  function cloud(c, x, y, s) {
    const parts = [[0, 0, 9], [-8, 2, 6], [8, 2, 6], [-3, -3, 7], [4, -3, 6]];
    for (const [dx, dy, r] of parts) disc(c, x + dx * s, y + dy * s + 1, r * s, P.cloudShade);
    for (const [dx, dy, r] of parts) disc(c, x + dx * s, y + dy * s, r * s, P.cloud);
  }

  // butterflies / leaves for subtle life
  function drawAmbient(c, t) {
    for (let i = 0; i < 3; i++) {
      const p = (t * (0.05 + i * 0.02) + i * 0.3) % 1;
      const x = 40 + p * 220;
      const y = 130 + Math.sin(t * 1.5 + i * 2) * 8 - i * 6;
      const flap = Math.sin(t * 12 + i * 3) > 0;
      const col = ['#f2d36a', '#e88fa8', '#8fd0e8'][i];
      px(c, x, y, 2, 1, col);
      px(c, x - 1, y - 1, 1, 1, flap ? col : mix(col, '#ffffff', 0.4));
      px(c, x + 1, y - 1, 1, 1, flap ? col : mix(col, '#ffffff', 0.4));
      px(c, x + 2, y, 1, 1, col);
    }
    // drifting leaves on water
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.03 + i * 0.33) % 1;
      const x = p * W;
      const y = 138 + i * 12 + Math.sin(t * 1.2 + i) * 2;
      px(c, x, y, 2, 1, i === 0 ? '#7fae5a' : '#b08a4a');
    }
  }

  /* ====================================================================== */
  /*  PARTICLES (splash / reveal)                                           */
  /* ====================================================================== */
  let particles = [];
  function spawnSplash(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2);
      const sp = rand(12, 40);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7), t: 0, col: col || '#eafcff', size: rand(1, 2) | 0 || 1 });
    }
  }
  function updateParticles(dt) {
    for (const p of particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; }
    particles = particles.filter((p) => p.t < p.life);
  }
  function drawParticles(c) {
    for (const p of particles) {
      c.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
      c.fillStyle = p.col;
      c.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    c.globalAlpha = 1;
  }

  /* ====================================================================== */
  /*  GAME STATE                                                            */
  /* ====================================================================== */
  const G = {
    state: 'ready', phaseT: 0, time: 0,
    casting: false, castT: 0,
    target: { x: 150, y: 112 },
    waitDur: 2,
    bubble: null,
    pendingFish: null,
    revealed: false,
    missMsg: 0,
    showIntro: true, introT: 0,
    reelFrom: null,
    shake: 0
  };

  const fishing = { state: 'ready', pickRarity: defaultPickRarity, log: [] };
  window.fishing = fishing;

  function defaultPickRarity(u) {
    u = Number(u);
    if (!(u >= 0 && u < 1)) u = 0;
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  function setState(s) { G.state = s; fishing.state = s; }

  function toReady() {
    setState('ready');
    G.phaseT = 0; G.casting = false; G.castT = 0;
    G.pendingFish = null; G.revealed = false;
  }

  function cast() {
    setState('waiting');
    G.phaseT = 0; G.casting = true; G.castT = 0;
    G.waitDur = rand(WAIT_MIN, WAIT_MAX);
    G.target = { x: Math.round(rand(96, 206)), y: Math.round(rand(94, 132)) };
    G.showIntro = false;
    G.bubble = null;
  }

  function enterBite() {
    setState('bite');
    G.phaseT = 0;
    spawnRipple(G.target.x, G.target.y, 1.2);
    spawnSplash(G.target.x, G.target.y, 6, '#e8fbff');
  }

  function miss() {
    setState('ready');
    G.phaseT = 0; G.casting = false; G.castT = 0;
    G.missMsg = 1.4;
    G.bubble = null;
  }

  function reel() {
    setState('reeling');
    G.phaseT = 0; G.revealed = false;
    const rarity = (function (r) { return RARITY.indexOf(r) === -1 ? 'Common' : r; })(fishing.pickRarity(Math.random()));
    const list = FishArt.speciesForRarity(rarity);
    const spec = list[Math.floor(Math.random() * list.length)];
    G.pendingFish = { name: spec.name, rarity: spec.rarity, key: spec.key };
    G.reelFrom = { x: G.target.x, y: G.target.y };
    spawnSplash(G.target.x, G.target.y, 10, '#eafcff');
  }

  function enterReveal() {
    setState('reveal');
    G.phaseT = 0; G.revealed = true;
    fishing.log.unshift({ name: G.pendingFish.name, rarity: G.pendingFish.rarity });
    revealSeed = Math.random();
    G.shake = G.pendingFish.rarity === 'Legendary' || G.pendingFish.rarity === 'Ancient' ? 5 : 0;
  }

  function doAction() {
    if (G.showIntro) { G.showIntro = false; }
    if (G.state === 'ready') cast();
    else if (G.state === 'bite') reel();
    else if (G.state === 'reveal' && G.phaseT > REVEAL_MIN) toReady();
    // waiting / reeling: ignored (prevents overlapping casts / duplicates)
  }

  /* ------------------------------- update --------------------------------- */
  function update(dt) {
    G.time += dt;
    if (G.missMsg > 0) G.missMsg -= dt;
    if (G.introT < 12) G.introT += dt;
    if (G.showIntro && G.introT > 5) G.showIntro = false;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 14);
    updateRipples(dt);
    updateParticles(dt);

    switch (G.state) {
      case 'waiting':
        G.phaseT += dt;
        if (G.casting) {
          G.castT = clamp(G.phaseT / CAST_TIME, 0, 1);
          if (G.phaseT >= CAST_TIME) { G.casting = false; G.phaseT = 0; }
        } else if (G.phaseT >= G.waitDur) {
          enterBite();
        }
        break;
      case 'bite':
        G.phaseT += dt;
        if (G.phaseT >= BITE_WINDOW) miss();
        break;
      case 'reeling':
        G.phaseT += dt;
        if (G.phaseT >= REEL_TIME) enterReveal();
        break;
      case 'reveal':
        G.phaseT += dt;
        if (G.phaseT >= REVEAL_AUTO) toReady();
        break;
    }
  }

  /* ====================================================================== */
  /*  RENDER SCENE                                                          */
  /* ====================================================================== */
  function bobberPos() {
    const tgt = G.target;
    if (G.state === 'ready') return null;
    if (G.state === 'waiting' && G.casting) {
      const u = easeOut(G.castT);
      const tip = rodTip(G.castT, G.time);
      const sx = tip.x, sy = tip.y - 6;
      const x = lerp(sx, tgt.x, u);
      const y = lerp(sy, tgt.y, u) - Math.sin(u * Math.PI) * 18;
      return { x, y, airborne: true };
    }
    if (G.state === 'waiting') {
      return { x: tgt.x, y: tgt.y + Math.sin(G.time * 1.8) * 1 };
    }
    if (G.state === 'bite') {
      const p = G.phaseT / BITE_WINDOW;
      const dip = Math.abs(Math.sin(G.phaseT * 14)) * 3 * (1 - p * 0.3) + 2;
      return { x: tgt.x - Math.round(dip * 0.4), y: tgt.y + dip };
    }
    if (G.state === 'reeling') {
      const u = easeInOut(clamp(G.phaseT / (REEL_TIME * 0.85), 0, 1));
      return { x: lerp(G.reelFrom.x, ANGLER.x - 10, u), y: lerp(G.reelFrom.y, ANGLER.y - 14, u) };
    }
    return null;
  }

  function render(t) {
    sctx.drawImage(bg, 0, 0);
    drawClouds(sctx, t);
    drawGulls(sctx, t);
    drawWater(sctx, t);
    drawAmbient(sctx, t);

    // angler + rod
    const tip = rodTip(G.casting ? easeOut(G.castT) : (G.state === 'reeling' ? 0.6 : 0.15), t);
    drawAngler(sctx, t, G.casting ? easeOut(G.castT) : (G.state === 'reeling' ? 0.5 : 0.12), G.state === 'reeling' ? Math.sin(G.phaseT * 10) * 0.5 + 0.5 : 0);

    const bob = bobberPos();
    if (bob) {
      drawLineAndBobber(sctx, tip, bob, t);
      if (!bob.airborne) {
        const dip = (G.state === 'bite') ? Math.abs(Math.sin(G.phaseT * 14)) * 2 : 0;
        drawBobber(sctx, bob.x, bob.y, G.time * 1.8, dip);
        if (G.state === 'bite') drawBiteCue(sctx, bob, G.phaseT / BITE_WINDOW);
      }
    }

    drawRipples(sctx);
    drawParticles(sctx);

    // blit scene to main canvas, integer-scaled
    mctx.save();
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, DW, DH);
    let ox = 0, oy = 0;
    if (G.shake > 0) { ox = Math.round(rand(-G.shake, G.shake)) * SCALE; oy = Math.round(rand(-G.shake, G.shake)) * SCALE; }
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(scene, 0, 0, W, H, ox, oy, DW, DH);
    mctx.restore();

    drawUI(mctx, t);
  }

  function drawBiteCue(c, bob, p) {
    // shrinking ring = the visible window
    const rad = lerp(14, 7, p);
    c.strokeStyle = `rgba(255,220,90,${(0.85 * (1 - p * 0.5)).toFixed(3)})`;
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(bob.x, bob.y, rad, rad * 0.55, 0, 0, Math.PI * 2);
    c.stroke();
    // "!" above bobber
    const jy = Math.sin(G.time * 18) * 1.5;
    const x = bob.x, y = bob.y - 16 + jy;
    px(c, x - 3, y - 5, 7, 6, 'rgba(255,255,255,0.85)');
    px(c, x - 3, y - 5, 7, 6, 'rgba(255,230,120,0.9)');
    px(c, x - 1, y - 3, 2, 3, '#c0392b');
    px(c, x - 1, y + 1, 2, 2, '#c0392b');
  }

  /* ====================================================================== */
  /*  UI (full resolution)                                                  */
  /* ====================================================================== */
  const BTN = { x: 520, y: 630, w: 240, h: 66 };
  let btnHover = false, btnDown = false;

  function drawUI(c, t) {
    c.save();
    c.textBaseline = 'alphabetic';

    /* ---- top-left: title + prompt ---- */
    panel(c, 16, 16, 306, 92);
    c.fillStyle = P.uiDim;
    c.font = '600 13px ui-monospace, Menlo, Consolas, monospace';
    c.fillText('TIDEPOOL COVE', 32, 40);
    c.fillStyle = '#7fd8c0';
    c.font = '600 13px ui-monospace, Menlo, Consolas, monospace';
    c.fillText('~ a lazy afternoon on the dock ~', 32, 60);

    const prompt = promptText();
    c.fillStyle = prompt.color;
    c.font = '700 22px ui-sans-serif, system-ui, sans-serif';
    c.fillText(prompt.title, 32, 90);

    if (G.missMsg > 0) {
      c.fillStyle = `rgba(255,180,160,${clamp(G.missMsg / 1.4, 0, 1)})`;
      c.font = '600 13px ui-monospace, monospace';
      c.fillText('It slipped away…', 32, 108);
    }

    /* ---- right: catch log ---- */
    const logW = 250, logX = DW - logW - 16, logY = 16;
    const shown = fishing.log.slice(0, 8);
    const logH = 40 + 8 * 24;
    panel(c, logX, logY, logW, logH);
    c.fillStyle = P.uiDim;
    c.font = '600 13px ui-monospace, monospace';
    c.fillText('CATCH LOG', logX + 16, logY + 26);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(logX + 16, logY + 34, logW - 32, 1);
    c.font = '500 15px ui-monospace, monospace';
    if (shown.length === 0) {
      c.fillStyle = 'rgba(200,220,215,0.4)';
      c.fillText('— nothing yet —', logX + 16, logY + 58);
    }
    shown.forEach((e, i) => {
      const yy = logY + 56 + i * 24;
      c.fillStyle = RARITY_COLOR[e.rarity] || '#fff';
      c.fillRect(logX + 16, yy - 9, 8, 8);
      c.fillStyle = '#eaf6f0';
      c.font = '600 15px ui-monospace, monospace';
      c.fillText(e.name, logX + 32, yy);
      c.fillStyle = RARITY_COLOR[e.rarity] || '#fff';
      c.font = '500 12px ui-monospace, monospace';
      c.fillText(e.rarity, logX + logW - 16 - c.measureText(e.rarity).width, yy);
    });

    /* ---- bottom-left: rarity legend ---- */
    const legX = 16, legY = DH - 16 - 168, legW = 210, legH = 168;
    panel(c, legX, legY, legW, legH);
    c.fillStyle = P.uiDim;
    c.font = '600 13px ui-monospace, monospace';
    c.fillText('RARITY ODDS', legX + 16, legY + 26);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(legX + 16, legY + 34, legW - 32, 1);
    const odds = [['Common', '45%'], ['Uncommon', '25%'], ['Rare', '15%'], ['Epic', '8%'], ['Legendary', '5%'], ['Ancient', '2%']];
    c.font = '600 14px ui-monospace, monospace';
    odds.forEach(([name, pct], i) => {
      const yy = legY + 56 + i * 18;
      c.fillStyle = RARITY_COLOR[name];
      c.fillRect(legX + 16, yy - 8, 9, 9);
      c.fillStyle = name === 'Ancient' ? P.uiText : '#dbeae4';
      c.fillText(name, legX + 32, yy);
      c.fillStyle = RARITY_COLOR[name];
      c.fillText(pct, legX + legW - 16 - c.measureText(pct).width, yy);
    });

    /* ---- action button ---- */
    drawButton(c, t);

    /* ---- intro overlay ---- */
    if (G.showIntro) drawIntro(c, t);

    c.restore();
  }

  function promptText() {
    switch (G.state) {
      case 'ready': return { title: 'Press SPACE to cast', color: '#eaf6f0' };
      case 'waiting': return G.casting ? { title: 'Casting…', color: '#bfe3ee' } : { title: 'Watch the bobber…', color: '#bfe3ee' };
      case 'bite': return { title: 'REEL NOW!', color: '#ffd75e' };
      case 'reeling': return { title: 'Reeling in…', color: '#9fe6c8' };
      case 'reveal': return { title: 'Nice catch!', color: '#7ff0d8' };
    }
    return { title: '', color: '#fff' };
  }

  function drawButton(c, t) {
    const enabled = G.state === 'ready' || G.state === 'bite' || (G.state === 'reveal' && G.phaseT > REVEAL_MIN);
    const bite = G.state === 'bite';
    const label = G.state === 'ready' ? 'CAST'
      : bite ? 'REEL!'
        : G.state === 'reveal' ? 'NEXT CAST'
          : G.state === 'reeling' ? '…' : 'WAIT';
    const pulse = bite ? 0.5 + 0.5 * Math.sin(t * 12) : 0;
    let x = BTN.x, y = BTN.y, w = BTN.w, h = BTN.h;
    const press = btnDown && btnHover ? 2 : 0;

    c.save();
    // shadow
    roundRect(c, x + 3, y + 5, w, h, 12);
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fill();
    // body
    roundRect(c, x, y + press, w, h, 12);
    let g = c.createLinearGradient(0, y, 0, y + h);
    if (bite) { g.addColorStop(0, mix('#ffd75e', '#ffffff', pulse * 0.4)); g.addColorStop(1, '#e08a1e'); }
    else if (enabled) { g.addColorStop(0, '#4fb98e'); g.addColorStop(1, '#2f8266'); }
    else { g.addColorStop(0, '#3a4a4e'); g.addColorStop(1, '#2a3538'); }
    c.fillStyle = g;
    c.fill();
    // rim
    roundRect(c, x + 0.5, y + 0.5 + press, w - 1, h - 1, 12);
    c.lineWidth = 2;
    c.strokeStyle = bite ? `rgba(255,255,255,${0.5 + pulse * 0.5})` : 'rgba(255,255,255,0.25)';
    c.stroke();
    // label
    c.fillStyle = enabled ? '#ffffff' : 'rgba(255,255,255,0.45)';
    c.font = '800 24px ui-sans-serif, system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, x + w / 2, y + h / 2 + press + 1);
    // key hint
    c.font = '600 12px ui-monospace, monospace';
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillText('SPACE', x + w / 2, y + h - 10 + press);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.restore();
  }

  function hitButton(mx, my) {
    return mx >= BTN.x && mx <= BTN.x + BTN.w && my >= BTN.y && my <= BTN.y + BTN.h;
  }

  function drawIntro(c, t) {
    const a = clamp(G.introT < 0.35 ? G.introT / 0.35 : (5 - G.introT) / 0.8, 0, 1);
    c.save();
    c.globalAlpha = a * 0.28;
    c.fillStyle = '#06121a';
    c.fillRect(0, 0, DW, DH);
    c.globalAlpha = a;
    // instruction card
    const cw = 720, ch = 150, cx0 = DW / 2 - cw / 2, cy0 = 70;
    panel(c, cx0, cy0, cw, ch);
    c.textAlign = 'center';
    c.fillStyle = '#eaf6f0';
    c.font = '800 34px ui-sans-serif, system-ui, sans-serif';
    c.fillText('Tidepool Cove', DW / 2, cy0 + 46);
    c.font = '600 17px ui-monospace, monospace';
    c.fillStyle = '#a9e6d2';
    c.fillText('Press SPACE (or the button) to cast your line.', DW / 2, cy0 + 84);
    c.fillText('When the bobber dips, press again to reel in the catch!', DW / 2, cy0 + 110);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.font = '600 13px ui-monospace, monospace';
    c.fillText('any key or click begins', DW / 2, cy0 + 136);
    c.textAlign = 'left';
    c.restore();
  }

  function panel(c, x, y, w, h) {
    c.save();
    roundRect(c, x, y, w, h, 10);
    c.fillStyle = P.panel;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = P.panelEdge;
    c.stroke();
    c.restore();
  }

  /* ====================================================================== */
  /*  REVEAL                                                                */
  /* ====================================================================== */
  let revealSeed = 0;
  const starField = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() }));

  function drawReveal(c, t) {
    const f = G.pendingFish;
    if (!f) return;
    const tier = RARITY.indexOf(f.rarity);
    const appear = clamp(G.phaseT / 0.45, 0, 1);
    const ease = easeOut(appear);
    const col = RARITY_COLOR[f.rarity];

    // dim backdrop
    c.save();
    c.fillStyle = `rgba(4,10,16,${0.55 * ease})`;
    c.fillRect(0, 0, DW, DH);

    const cx = DW / 2, cy = DH / 2 - 24;

    // tier backdrop treatments
    if (tier >= 4) drawDivineBackdrop(c, cx, cy, tier, col, t, ease);
    else drawTierBackdrop(c, cx, cy, tier, col, t, ease);

    // panel
    const pw = 620, ph = 420;
    const px0 = cx - pw / 2, py0 = cy - ph / 2 + 10;
    c.globalAlpha = ease;
    roundRect(c, px0 + 4, py0 + 6, pw, ph, 18);
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fill();
    roundRect(c, px0, py0, pw, ph, 18);
    const pg = c.createLinearGradient(0, py0, 0, py0 + ph);
    pg.addColorStop(0, `rgba(${hex2rgb(col)[0]},${hex2rgb(col)[1]},${hex2rgb(col)[2]},0.20)`);
    pg.addColorStop(0.5, 'rgba(12,20,28,0.92)');
    pg.addColorStop(1, 'rgba(8,14,20,0.96)');
    c.fillStyle = pg; c.fill();
    c.lineWidth = 3;
    c.strokeStyle = col; c.stroke();
    // corner flourishes differ by tier
    drawCorners(c, px0, py0, pw, ph, col, tier, t);
    c.globalAlpha = 1;

    // tier effects behind the fish (inside the panel)
    drawInnerRays(c, cx, cy, tier, col, t, ease);
    if (tier === 5) drawAncientSigil(c, cx, cy, col, t, ease);

    // fish
    const sp = FishArt.getSprite(f.key);
    const sc = tier === 5 ? 6.2 : tier === 4 ? 5.8 : tier === 3 ? 5.4 : 5;
    const bobY = Math.sin(t * 2 + revealSeed * 6) * 5;
    const fx = cx, fy = cy - 40 + bobY;
    // glow
    const g = c.createRadialGradient(fx, fy, 4, fx, fy, 165);
    g.addColorStop(0, `rgba(${hex2rgb(col)[0]},${hex2rgb(col)[1]},${hex2rgb(col)[2]},0.34)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(cx - 260, cy - 240, 520, 420);

    c.imageSmoothingEnabled = false;
    const dw = sp.canvas.width * sc, dh = sp.canvas.height * sc;
    c.save();
    c.globalAlpha = ease;
    if (tier === 5) c.globalAlpha = ease * (0.85 + 0.15 * Math.sin(t * 6 + revealSeed * 9));
    c.drawImage(sp.canvas, Math.round(fx - dw / 2), Math.round(fy - dh / 2), Math.round(dw), Math.round(dh));
    c.restore();

    // name + rarity
    c.textAlign = 'center';
    const nameY = cy + 118;
    c.globalAlpha = clamp((G.phaseT - 0.25) / 0.4, 0, 1);
    // rarity word
    c.font = '800 24px ui-sans-serif, system-ui, sans-serif';
    c.fillStyle = col;
    c.fillText(spaced(f.rarity.toUpperCase()), cx, nameY - 44);
    // name
    c.font = '800 52px ui-serif, Georgia, "Times New Roman", serif';
    c.fillStyle = '#f4fbf7';
    c.shadowColor = col; c.shadowBlur = tier >= 4 ? 26 : 12;
    c.fillText(f.name, cx, nameY + 10);
    c.shadowBlur = 0;
    // flavour line
    c.font = '500 15px ui-monospace, monospace';
    c.fillStyle = 'rgba(220,238,232,0.75)';
    c.fillText(flavour(f.rarity), cx, nameY + 46);
    // hint
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.font = '600 14px ui-monospace, monospace';
    c.fillText('SPACE — next cast', cx, py0 + ph - 18);

    // sparkles per tier
    drawRevealSparkles(c, cx, cy, tier, col, t);

    c.textAlign = 'left';
    c.restore();
  }

  function spaced(s) { return s.split('').join(' '); }

  function flavour(r) {
    return {
      Common: 'A familiar tug on the line.',
      Uncommon: 'A little rarer than the rest.',
      Rare: 'The water shimmered as it rose.',
      Epic: 'A story worth telling at the dock.',
      Legendary: 'The cove itself seemed to hold its breath.',
      Ancient: 'Older than the island. Older than the tide.'
    }[r] || '';
  }

  function drawTierBackdrop(c, cx, cy, tier, col, t, ease) {
    // atmospheric halo behind the panel (rays are drawn later, inside it)
    if (tier >= 1) softGlow(c, cx, cy - 20, col, 0.16 * ease, 170);
  }

  // rays / sigils drawn ON the panel so each tier reads differently
  function drawInnerRays(c, cx, cy, tier, col, t, ease) {
    if (tier < 2) return;
    const n = tier === 2 ? 9 : tier === 3 ? 13 : tier === 4 ? 18 : 14;
    c.save();
    c.translate(cx, cy - 30);
    c.rotate(t * (tier >= 4 ? 0.32 : 0.16) * (tier % 2 ? 1 : -1));
    c.globalAlpha = (tier === 2 ? 0.10 : tier === 3 ? 0.13 : tier === 4 ? 0.17 : 0.12) * ease;
    for (let i = 0; i < n; i++) {
      c.save(); c.rotate((i / n) * Math.PI * 2);
      c.fillStyle = i % 3 === 0 ? '#ffffff' : col;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-16, -300); c.lineTo(16, -300); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
  }

  function drawAncientSigil(c, cx, cy, col, t, ease) {
    c.save();
    c.translate(cx, cy - 30);
    c.rotate(t * 0.25);
    c.globalAlpha = ease;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      c.save(); c.rotate(a); c.translate(0, -152);
      c.fillStyle = col; c.fillRect(-2, -12, 4, 24); c.fillRect(-9, -3, 18, 4);
      c.fillStyle = '#f2d27a'; c.fillRect(-1, -9, 2, 18);
      c.restore();
    }
    c.restore();
  }

  function softGlow(c, x, y, col, a, r) {
    const g = c.createRadialGradient(x, y, 4, x, y, r);
    const rgb = hex2rgb(col);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawDivineBackdrop(c, cx, cy, tier, col, t, ease) {
    // Ancient: cosmic cove with runic ring and stars
    if (tier === 5) {
      c.save();
      const bgGrad = c.createRadialGradient(cx, cy - 30, 20, cx, cy - 30, 460);
      bgGrad.addColorStop(0, '#123a3c');
      bgGrad.addColorStop(0.6, '#0a1f2a');
      bgGrad.addColorStop(1, '#050b12');
      c.globalAlpha = ease;
      c.fillStyle = bgGrad; c.fillRect(0, 0, DW, DH);
      // stars
      for (const s of starField) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + s.s * 10));
        c.globalAlpha = ease * tw;
        c.fillStyle = s.s > 0.8 ? '#bff5e8' : '#eef8ff';
        const px = s.x * DW, py = s.y * DH * 0.7;
        c.fillRect(px, py, (s.s > 0.9 ? 2 : 1), (s.s > 0.9 ? 2 : 1));
      }
      c.restore();
      softGlow(c, cx, cy - 20, col, 0.22 * ease, 300);
      return;
    }
    // Legendary: warm haze
    c.save();
    const g = c.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, 520);
    g.addColorStop(0, 'rgba(255,206,90,0.28)');
    g.addColorStop(0.5, 'rgba(120,80,20,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = ease;
    c.fillStyle = g; c.fillRect(0, 0, DW, DH);
    c.restore();
    softGlow(c, cx, cy - 20, col, 0.24 * ease, 320);
  }

  function drawCorners(c, x, y, w, h, col, tier, t) {
    c.save();
    c.strokeStyle = col; c.globalAlpha = 0.8; c.lineWidth = 2;
    const s = tier >= 4 ? 26 : 18;
    for (const [cx2, cy2, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      c.beginPath();
      c.moveTo(cx2 + dx * s, cy2); c.lineTo(cx2, cy2); c.lineTo(cx2, cy2 + dy * s);
      c.stroke();
    }
    c.restore();
  }

  function drawRevealSparkles(c, cx, cy, tier, col, t) {
    const counts = [6, 10, 18, 28, 44, 60];
    const n = counts[tier];
    const a = clamp((G.phaseT - 0.2) / 0.5, 0, 1);
    c.save();
    for (let i = 0; i < n; i++) {
      const s = starField[i % starField.length];
      const ang = s.x * Math.PI * 2 + t * (0.4 + tier * 0.1) * (i % 2 ? 1 : -1);
      const rad = 60 + s.y * 260;
      const x = cx + Math.cos(ang) * rad;
      const y = cy - 20 + Math.sin(ang) * rad * 0.65;
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (2 + s.s * 3) + i));
      c.globalAlpha = a * tw * 0.9;
      c.fillStyle = i % 3 === 0 ? '#ffffff' : col;
      const sz = tier >= 4 ? 3 : 2;
      c.fillRect(x, y, sz, sz);
    }
    c.restore();
  }

  /* ====================================================================== */
  /*  INPUT                                                                 */
  /* ====================================================================== */
  function pointerToCanvas(e) {
    const r = main.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (DW / r.width), y: (e.clientY - r.top) * (DH / r.height) };
  }

  main.addEventListener('pointermove', (e) => {
    const p = pointerToCanvas(e);
    btnHover = hitButton(p.x, p.y);
    main.style.cursor = btnHover ? 'pointer' : 'default';
  });
  main.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = pointerToCanvas(e);
    btnHover = hitButton(p.x, p.y);
    btnDown = true;
    if (btnHover) doAction();
  });
  window.addEventListener('pointerup', () => { btnDown = false; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      doAction();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) doAction();
    }
  });

  /* ====================================================================== */
  /*  MAIN LOOP                                                             */
  /* ====================================================================== */
  let last = performance.now();
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (document.hidden) dt = 0;
    dt = clamp(dt, 0, 0.05); // clamp; also pauses effectively when tab hidden

    update(dt);

    // render scene
    render(G.time);

    // reveal overlay (full res, after normal UI so it sits on top)
    if (G.state === 'reveal' && G.pendingFish) drawReveal(mctx, G.time);

    requestAnimationFrame(frame);
  }

  /* ------------------------------- boot ---------------------------------- */
  buildBackground();
  requestAnimationFrame(frame);

  // resize / scale the fixed 1280x720 stage to fit the viewport
  function fitStage() {
    const stage = document.getElementById('stage');
    const s = Math.min(window.innerWidth / DW, window.innerHeight / DH);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', fitStage);
  fitStage();
})();
