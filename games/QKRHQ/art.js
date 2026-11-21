/* =========================================================================
   Tideline - artwork module
   All art is generated in code as small pixel canvases. No image assets.
   ========================================================================= */
(function (global) {
  'use strict';

  // ---- palette ----------------------------------------------------------
  const PAL = {
    // sky
    skyTop: '#5fa8c9', skyMid: '#9fc9cf', skyLow: '#f4d49a', skyGlow: '#ffe6b0',
    // sun
    sun: '#fff3c4', sunEdge: '#ffd77a',
    // distant land
    farA: '#7fa6a0', farB: '#6b938f', farC: '#587b73',
    // water
    waterDeep: '#1f5f7e', waterMid: '#2f7fa0', waterShallow: '#3f9ab4',
    waterLight: '#63b8c9', waterHi: '#bfe9ec', waterFoam: '#eaf7f2',
    waterDark: '#173f5c',
    // land
    grass: '#4f8c3f', grass2: '#3f7433', grass3: '#67a84e', grassHi: '#8cc45f',
    grassDark: '#2f5a28', dirt: '#7a573a', dirt2: '#5f4229', dirtHi: '#9c7048',
    rock: '#8c8f98', rock2: '#6b6e78', rockHi: '#b4b7bf', rockDark: '#4a4d55',
    // wood
    wood: '#a9702f', wood2: '#7d4f1f', wood3: '#5a3613', woodHi: '#cf9450',
    woodDark: '#3f2510',
    // veg
    leaf: '#3f7a34', leaf2: '#2f5c27', leafHi: '#6fb04a', leaf3: '#57963f',
    reed: '#7fae4a', reed2: '#9cc75c', reedDark: '#547a2f',
    flowerA: '#e8615d', flowerB: '#f2c14e', flowerC: '#d96fa3', flowerD: '#f4f0d8',
    // ui
    ink: '#20161f', cream: '#f6e7c8',
    // angler
    aHat: '#e0b04a', aHat2: '#b98430', aSkin: '#f0c49a', aSkin2: '#d19a6b',
    aEye: '#5a3a28', aScarf: '#efe3c6', aCoat: '#c0563b', aCoat2: '#95402d',
    aPants: '#47566b', aPants2: '#374357', aBoot: '#3a2a1e', aBoot2: '#271b12',
    aOutline: '#2a1a20'
  };

  // ---- tiny canvas helpers ---------------------------------------------
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function ctxOf(c) {
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return g;
  }
  function fillEll(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let y = -Math.round(ry); y <= Math.round(ry); y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const x = Math.sqrt(t) * rx;
      const x0 = Math.round(cx - x), x1 = Math.round(cx + x);
      g.fillRect(x0, Math.round(cy + y), Math.max(1, x1 - x0), 1);
    }
  }
  function fillPoly(g, pts, col) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    g.fillStyle = col;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          const t = (y - a[1]) / (b[1] - a[1]);
          xs.push(a[0] + t * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
        g.fillRect(x0, y, Math.max(1, x1 - x0), 1);
      }
    }
  }
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // add an outline around every opaque pixel
  function addOutline(canvas, color, thick) {
    thick = thick || 1;
    const w = canvas.width, h = canvas.height;
    const src = ctxOf(canvas).getImageData(0, 0, w, h).data;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
    const out = makeCanvas(w, h);
    const g = ctxOf(out);
    const [r, gg, b] = hexToRgb(color);
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (at(x, y) > 20) continue;
        let edge = false;
        for (let oy = -thick; oy <= thick && !edge; oy++)
          for (let ox = -thick; ox <= thick && !edge; ox++)
            if ((ox || oy) && at(x + ox, y + oy) > 20) edge = true;
        if (edge) {
          const i = (y * w + x) * 4;
          d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
        }
      }
    }
    g.putImageData(img, 0, 0);
    g.drawImage(canvas, 0, 0);
    return out;
  }
  // Render a pixel-map (array of equal-length strings) to a canvas.
  function spriteFromMap(rows, palette) {
    const h = rows.length, w = rows[0].length;
    const c = makeCanvas(w, h), g = ctxOf(c);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        const col = palette[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
  function flipH(canvas) {
    const c = makeCanvas(canvas.width, canvas.height);
    const g = ctxOf(c);
    g.translate(canvas.width, 0);
    g.scale(-1, 1);
    g.drawImage(canvas, 0, 0);
    return c;
  }
  function recolor(canvas, map) {
    // map: {fromHex: toHex}
    const c = makeCanvas(canvas.width, canvas.height);
    const g = ctxOf(c);
    g.drawImage(canvas, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const lut = {};
    for (const k in map) { lut[k.toLowerCase()] = hexToRgb(map[k]); }
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 20) continue;
      const key = '#' + ((1 << 24) + (d[i] << 16) + (d[i + 1] << 8) + d[i + 2]).toString(16).slice(1);
      const t = lut[key];
      if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ======================================================================
  //  ANGLER
  // ======================================================================
  const ANGLER_MAP = [
    '....HHHH....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HHHHHHHHHH.',
    '..SSSSSSSS..',
    '..SEsSSsES..',
    '..SSSSSSSS..',
    '...CCCCCC...',
    '..BBBBBBBB..',
    '..BBBBBBBB..',
    '..BBBBBBBB..',
    '..BBBBBBBB..',
    '..BBBBBBBB..',
    '..BBBBBBBB..',
    '..PPPPPPPP..',
    '..PPP..PPP..',
    '..PPP..PPP..',
    '.OOO....OOO.',
    '.OOO....OOO.'
  ];
  const ANGLER_PAL = {
    H: PAL.aHat, S: PAL.aSkin, E: PAL.aEye, s: PAL.aSkin2,
    C: PAL.aScarf, B: PAL.aCoat, P: PAL.aPants, O: PAL.aBoot
  };
  const anglerSprite = (function () {
    let c = spriteFromMap(ANGLER_MAP, ANGLER_PAL);
    // add a little shading: hat band + coat shade on the right column
    const g = ctxOf(c);
    g.fillStyle = PAL.aHat2;
    g.fillRect(1, 4, 10, 1);
    g.fillStyle = PAL.aCoat2;
    for (let y = 9; y <= 14; y++) g.fillRect(9, y, 1, 1);
    g.fillStyle = PAL.aPants2;
    for (let y = 15; y <= 17; y++) g.fillRect(8, y, 1, 1);
    return addOutline(c, PAL.aOutline, 1);
  })();

  // ======================================================================
  //  FISH
  //  Every fish is drawn head-left on a small canvas, then outlined.
  // ======================================================================
  function fishMinnow() {
    const w = 34, h = 20, c = makeCanvas(w, h), g = ctxOf(c);
    const body = ['#e0a05a', '#c97f3c', '#f4c98a', '#8c5623'];
    // tail
    fillPoly(g, [[24, 10], [33, 3], [30, 10], [33, 17]], '#c97f3c');
    fillPoly(g, [[24, 10], [31, 5], [29, 10], [31, 15]], '#e0a05a');
    // dorsal + anal fins
    fillPoly(g, [[13, 5], [19, 2], [21, 5]], '#c97f3c');
    fillPoly(g, [[14, 15], [19, 18], [21, 15]], '#c97f3c');
    // body
    fillEll(g, 15, 10, 11, 5, '#e0a05a');
    fillEll(g, 15, 12, 10, 3, '#f4c98a'); // belly
    fillEll(g, 15, 8, 10, 3, '#c97f3c');  // back
    // gill + eye + mouth
    g.fillStyle = '#a8672c'; g.fillRect(9, 7, 1, 6);
    fillEll(g, 6, 9, 1.6, 1.6, '#20161f');
    fillEll(g, 6, 9, 0.8, 0.8, '#ffffff'); // glint
    g.fillStyle = '#8c5623'; g.fillRect(3, 11, 2, 1);
    // stripe
    g.fillStyle = '#b06a2f'; g.fillRect(12, 6, 10, 1);
    return addOutline(c, '#3a2410', 1);
  }

  function fishReedbass() {
    const w = 40, h = 24, c = makeCanvas(w, h), g = ctxOf(c);
    // tail
    fillPoly(g, [[28, 12], [38, 4], [35, 12], [38, 20]], '#3f7a4a');
    fillPoly(g, [[28, 12], [36, 7], [34, 12], [36, 17]], '#57a05e');
    // dorsal fin (spiny)
    fillPoly(g, [[12, 6], [16, 1], [19, 1], [22, 6]], '#3f7a4a');
    fillPoly(g, [[15, 15], [20, 21], [24, 15]], '#3f7a4a');
    // body
    fillEll(g, 16, 12, 13, 7, '#57a05e');
    fillEll(g, 16, 15, 12, 4, '#9ccb84'); // belly
    fillEll(g, 16, 9, 12, 4, '#3f7a4a');  // back
    // vertical stripes
    g.fillStyle = '#356b3f';
    for (let i = 0; i < 5; i++) { const x = 8 + i * 4; g.fillRect(x, 5, 1, 12); }
    // gill / eye / mouth
    g.fillStyle = '#2f5c35'; fillPoly(g, [[8, 6], [11, 12], [8, 18]], '#2f5c35');
    fillEll(g, 6, 10, 2, 2, '#20161f');
    fillEll(g, 6, 10, 1, 1, '#ffffff');
    g.fillStyle = '#2f5c35'; g.fillRect(2, 14, 2, 1);
    return addOutline(c, '#1c3320', 1);
  }

  function fishKoi() {
    const w = 48, h = 26, c = makeCanvas(w, h), g = ctxOf(c);
    // long flowing tail
    fillPoly(g, [[32, 13], [47, 2], [41, 13], [47, 24]], '#f4f0d8');
    fillPoly(g, [[32, 13], [44, 6], [40, 13], [44, 20]], '#ffd9c0');
    // long trailing fins
    fillPoly(g, [[22, 16], [34, 24], [26, 18]], '#f4f0d8');
    fillPoly(g, [[14, 6], [22, 1], [26, 6], [18, 8]], '#f4f0d8');
    // body
    fillEll(g, 18, 13, 14, 7, '#fdf4e0');
    fillEll(g, 18, 15, 13, 4, '#ffffff');
    // orange patches
    fillEll(g, 14, 10, 5, 3.4, '#ef7f3a');
    fillEll(g, 24, 15, 5, 3, '#ef7f3a');
    fillEll(g, 20, 8, 3, 2, '#f4a24e');
    // eye + mouth + whiskers
    fillEll(g, 6, 12, 2, 2, '#20161f');
    fillEll(g, 6, 12, 1, 1, '#ffffff');
    g.fillStyle = '#d98a5a'; g.fillRect(2, 14, 3, 1);
    g.fillStyle = '#d98a5a'; g.fillRect(1, 16, 4, 1); g.fillRect(1, 12, 3, 1);
    // scale hints
    g.fillStyle = '#e6c9a8';
    for (let i = 0; i < 4; i++) g.fillRect(10 + i * 5, 9, 1, 1), g.fillRect(12 + i * 5, 15, 1, 1);
    return addOutline(c, '#8c3a18', 1);
  }

  function fishGlimmerfin() {
    const w = 46, h = 30, c = makeCanvas(w, h), g = ctxOf(c);
    // dramatic spiky tail
    fillPoly(g, [[32, 15], [45, 2], [40, 9], [45, 15], [40, 21], [45, 28]], '#b02a3a');
    fillPoly(g, [[32, 15], [42, 6], [38, 15], [42, 24]], '#e0435a');
    // spiky dorsal fin
    fillPoly(g, [[12, 9], [16, 2], [19, 8], [23, 2], [26, 9]], '#b02a3a');
    fillPoly(g, [[12, 9], [16, 4], [19, 9], [23, 4], [25, 9]], '#e0435a');
    // pelvic fin
    fillPoly(g, [[16, 20], [22, 28], [27, 20]], '#b02a3a');
    // body
    fillEll(g, 18, 15, 14, 8, '#e0435a');
    fillEll(g, 18, 18, 13, 5, '#f47a86'); // belly
    fillEll(g, 18, 12, 13, 5, '#a82333'); // back
    // glowing scale spots
    g.fillStyle = '#ffd0c0';
    for (let i = 0; i < 5; i++) g.fillRect(10 + i * 4, 12 + (i % 2), 1, 1);
    g.fillStyle = '#fff0d0';
    g.fillRect(11, 12, 1, 1); g.fillRect(19, 11, 1, 1); g.fillRect(27, 13, 1, 1);
    // gill / eye / mouth
    fillPoly(g, [[8, 8], [12, 15], [8, 22]], '#8f1c2b');
    fillEll(g, 6, 12, 2.3, 2.3, '#20161f');
    fillEll(g, 6, 12, 1.2, 1.2, '#ffe98a');
    g.fillStyle = '#7a1826'; g.fillRect(2, 17, 3, 1);
    return addOutline(c, '#4a0f1c', 1);
  }

  function fishSunfish() {
    const w = 46, h = 36, c = makeCanvas(w, h), g = ctxOf(c);
    // big fan tail
    fillPoly(g, [[30, 18], [45, 4], [42, 18], [45, 32]], '#e0a52a');
    fillPoly(g, [[30, 18], [43, 9], [40, 18], [43, 27]], '#ffd45c');
    // top and bottom fan fins
    fillPoly(g, [[16, 3], [24, 12], [10, 12]], '#ffd45c');
    fillPoly(g, [[16, 33], [24, 24], [10, 24]], '#e0a52a');
    // round body
    fillEll(g, 19, 18, 15, 14, '#ffcf4a');
    fillEll(g, 19, 22, 13, 10, '#ffe89a'); // belly
    fillEll(g, 19, 13, 13, 9, '#e0a52a');  // back
    // sun rays pattern
    g.fillStyle = '#d98f1e';
    for (let i = 0; i < 7; i++) { g.fillRect(12 + i * 3, 18 - i, 1, 1 + i * 2); }
    g.fillStyle = '#fff2c0';
    for (let i = 0; i < 5; i++) g.fillRect(13 + i * 4, 18 - i, 1, 1);
    // eye + mouth
    fillEll(g, 7, 15, 3, 3, '#20161f');
    fillEll(g, 7, 15, 1.4, 1.4, '#ffffff');
    g.fillStyle = '#c07a12'; g.fillRect(2, 21, 4, 1);
    return addOutline(c, '#8a5a10', 1);
  }

  function fishCoelacanth() {
    const w = 58, h = 30, c = makeCanvas(w, h), g = ctxOf(c);
    // lobed tail (three lobes)
    fillPoly(g, [[40, 15], [55, 3], [49, 15], [55, 27]], '#2f8f8a');
    fillPoly(g, [[40, 15], [52, 8], [48, 15], [52, 22]], '#57c2b4');
    // lobed fins
    fillPoly(g, [[12, 20], [6, 29], [18, 23]], '#2f8f8a');
    fillPoly(g, [[14, 12], [8, 3], [18, 10]], '#2f8f8a');
    fillPoly(g, [[22, 22], [20, 29], [28, 22]], '#2f8f8a');
    // body
    fillEll(g, 24, 15, 19, 9, '#3fb0a4');
    fillEll(g, 24, 19, 18, 5, '#8fe0d0'); // belly
    fillEll(g, 24, 11, 18, 5, '#2f8f8a'); // back
    // armor scale plates
    g.fillStyle = '#1f6f6b';
    for (let i = 0; i < 8; i++) { g.fillRect(10 + i * 4, 8, 1, 14); }
    g.fillStyle = '#7fe8d8';
    for (let i = 0; i < 7; i++) g.fillRect(12 + i * 4, 15, 1, 1);
    // glowing spots along the back
    g.fillStyle = '#aef7e6';
    for (let i = 0; i < 6; i++) g.fillRect(11 + i * 5, 7, 1, 1);
    // eye / mouth
    fillEll(g, 8, 14, 2.6, 2.6, '#20161f');
    fillEll(g, 8, 14, 1.3, 1.3, '#aef7e6');
    g.fillStyle = '#1f6f6b'; g.fillRect(2, 18, 4, 1);
    return addOutline(c, '#0c3b3d', 1);
  }

  // build & cache fish sprites (``key`` may be ``base:variant``)
  const fishCache = {};
  const FISH_BASE = {
    minnow: fishMinnow, reedbass: fishReedbass, koi: fishKoi,
    glimmer: fishGlimmerfin, sunfish: fishSunfish, coel: fishCoelacanth
  };
  const RECOLORS = {
    minnow_teal: { '#e0a05a': '#6fbccb', '#c97f3c': '#3f8fa0', '#f4c98a': '#cfeef2', '#a8672c': '#2f6f80', '#8c5623': '#2f6f80', '#b06a2f': '#3f8fa0' },
    reedbass_blue: { '#57a05e': '#5a86c9', '#3f7a4a': '#37619e', '#9ccb84': '#bcd6f0', '#356b3f': '#2f4f86', '#2f5c35': '#24406e' },
    koi_azure: { '#ef7f3a': '#4aa8e0', '#f4a24e': '#7fc4ec', '#d98a5a': '#6fb0d8' },
    glimmer_violet: { '#e0435a': '#9a5ad6', '#a82333': '#6a2f9a', '#b02a3a': '#7a3fb0', '#f47a86': '#c79aec', '#8f1c2b': '#5a2080', '#7a1826': '#4a1860', '#ffd0c0': '#e0c8ff' },
    sunfish_pale: { '#ffcf4a': '#e8ecef', '#e0a52a': '#b8c2c9', '#ffe89a': '#ffffff', '#d98f1e': '#9aa6b0', '#c07a12': '#7f8b93', '#fff2c0': '#ffffff' }
  };
  function getFishSprite(key) {
    if (fishCache[key]) return fishCache[key];
    const parts = key.split('_');
    const base = parts[0];
    let c = FISH_BASE[base]();
    if (RECOLORS[key]) c = recolor(c, RECOLORS[key]);
    fishCache[key] = c;
    return c;
  }

  const FISHES = [
    { key: 'minnow', name: 'Copper Minnow' },
    { key: 'minnow_teal', name: 'Rush Dace' },
    { key: 'reedbass', name: 'Reedbass' },
    { key: 'reedbass_blue', name: 'River Perch' },
    { key: 'koi', name: 'Moonlit Koi' },
    { key: 'koi_azure', name: 'Azure Koi' },
    { key: 'glimmer', name: 'Crimson Glimmerfin' },
    { key: 'glimmer_violet', name: 'Stormscale' },
    { key: 'sunfish', name: 'Aurelian Sunfish' },
    { key: 'sunfish_pale', name: 'Sunken Crown' },
    { key: 'coel', name: 'Tidewrought Coelacanth' }
  ];
  const FISH_BY_RARITY = {
    Common: ['minnow', 'minnow_teal'],
    Uncommon: ['reedbass', 'reedbass_blue'],
    Rare: ['koi', 'koi_azure'],
    Epic: ['glimmer', 'glimmer_violet'],
    Legendary: ['sunfish', 'sunfish_pale'],
    Ancient: ['coel']
  };
  const NAME_BY_KEY = {};
  for (const f of FISHES) NAME_BY_KEY[f.key] = f.name;

  global.Art = {
    PAL, makeCanvas, ctxOf, fillEll, fillPoly, addOutline, spriteFromMap,
    flipH, recolor,
    anglerSprite,
    getFishSprite, FISH_BY_RARITY, NAME_BY_KEY
  };
})(window);
