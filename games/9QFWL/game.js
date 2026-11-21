/* ===========================================================================
   ISLE ANGLER — a cozy pixel-art fishing game
   All artwork is drawn procedurally in code. No images, fonts or audio.
   Logical resolution: 320x180, upscaled 4x with no smoothing.
   =========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------- constants
  const W = 320, H = 180, S = 4;

  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const g = off.getContext('2d');
  g.imageSmoothingEnabled = false;

  const disp = document.getElementById('game');
  disp.width = W * S; disp.height = H * S;
  const d = disp.getContext('2d');
  d.imageSmoothingEnabled = false;

  // ------------------------------------------------------------------ palette
  const C = {
    // water
    waterDeep: '#12314e', waterMid: '#1a4a68', water: '#246b83',
    waterLight: '#2f8b95', waterHi: '#63c7c0', foam: '#d9f3ea',
    // land
    sandDark: '#b1844b', sand: '#d7ac66', sandLight: '#efd492', wet: '#9c6b39',
    grassDark: '#2c6336', grass: '#3c8443', grassLight: '#57a24c', grassHi: '#83c65b',
    // wood
    woodDark: '#4d3020', wood: '#7a4e2e', woodLight: '#a06c3e', woodHi: '#c8965c',
    // rock
    rockDark: '#474c56', rock: '#6b717d', rockLight: '#9aa0ab',
    // character
    skin: '#e8b489', skinD: '#c98a61', hair: '#6b4326',
    hat: '#e6c86e', hatD: '#c2a24e', hatL: '#f4dd93', hatBand: '#8a5a34',
    coat: '#b8543a', coatD: '#8a3a26', coatL: '#d0745a',
    pant: '#3f5a7a', pantD: '#2c3f57', boot: '#4a3423',
    ink: '#241a14', cream: '#f6ecd6', white: '#ffffff', shadow: '#0d1a24',
    uiBg: '#0c1a24', uiBorder: '#3a6a72', uiText: '#d8ecdf', uiDim: '#8fb0ad'
  };

  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  const RCOL = {
    Common: '#a9b8a4', Uncommon: '#5fc46b', Rare: '#4f9ce6',
    Epic: '#b06ff0', Legendary: '#f2b52e', Ancient: '#3fe0c4'
  };
  const ODDS = { Common: 45, Uncommon: 25, Rare: 15, Epic: 8, Legendary: 5, Ancient: 2 };

  // ------------------------------------------------------------------- pixels
  function px(x, y, w, h, col) {
    if (typeof x !== 'number') return;
    g.fillStyle = col;
    g.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
  }
  function pxl(x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    const r = Math.round(lerp(A[0], B[0], t)), gg = Math.round(lerp(A[1], B[1], t)), bb = Math.round(lerp(A[2], B[2], t));
    return 'rgb(' + r + ',' + gg + ',' + bb + ')';
  }
  function shade(hex, amt) {
    const c = hexToRgb(hex);
    const f = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return 'rgb(' + Math.round(lerp(c[0], f, p)) + ',' + Math.round(lerp(c[1], f, p)) + ',' + Math.round(lerp(c[2], f, p)) + ')';
  }

  // deterministic PRNG
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ellipse(cx, cy, rx, ry, col, skipTop) {
    cx = cx | 0; cy = cy | 0;
    for (let y = -ry; y <= ry; y++) {
      if (skipTop && y < -ry + skipTop) continue;
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const xx = Math.floor(rx * Math.sqrt(t));
      px(cx - xx, cy + y, xx * 2 + 1, 1, col);
    }
  }

  function line(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (; ;) {
      pxl(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // -------------------------------------------------------------- pixel font
  // 5x7 uppercase glyphs, rows separated by '/'
  const GLYPHS = {
    'A': '01110/10001/10001/11111/10001/10001/10001',
    'B': '11110/10001/10001/11110/10001/10001/11110',
    'C': '01110/10001/10000/10000/10000/10001/01110',
    'D': '11100/10010/10001/10001/10001/10010/11100',
    'E': '11111/10000/10000/11110/10000/10000/11111',
    'F': '11111/10000/10000/11110/10000/10000/10000',
    'G': '01110/10001/10000/10111/10001/10001/01111',
    'H': '10001/10001/10001/11111/10001/10001/10001',
    'I': '11111/00100/00100/00100/00100/00100/11111',
    'J': '00111/00010/00010/00010/00010/10010/01100',
    'K': '10001/10010/10100/11000/10100/10010/10001',
    'L': '10000/10000/10000/10000/10000/10000/11111',
    'M': '10001/11011/10101/10101/10001/10001/10001',
    'N': '10001/11001/11001/10101/10011/10011/10001',
    'O': '01110/10001/10001/10001/10001/10001/01110',
    'P': '11110/10001/10001/11110/10000/10000/10000',
    'Q': '01110/10001/10001/10001/10101/10010/01101',
    'R': '11110/10001/10001/11110/10100/10010/10001',
    'S': '01111/10000/10000/01110/00001/00001/11110',
    'T': '11111/00100/00100/00100/00100/00100/00100',
    'U': '10001/10001/10001/10001/10001/10001/01110',
    'V': '10001/10001/10001/10001/10001/01010/00100',
    'W': '10001/10001/10001/10101/10101/11011/10001',
    'X': '10001/10001/01010/00100/01010/10001/10001',
    'Y': '10001/10001/01010/00100/00100/00100/00100',
    'Z': '11111/00001/00010/00100/01000/10000/11111',
    '0': '01110/10001/10011/10101/11001/10001/01110',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/10001/00001/00010/00100/01000/11111',
    '3': '11111/00010/00100/00010/00001/10001/01110',
    '4': '00010/00110/01010/10010/11111/00010/00010',
    '5': '11111/10000/11110/00001/00001/10001/01110',
    '6': '00110/01000/10000/11110/10001/10001/01110',
    '7': '11111/00001/00010/00100/01000/01000/01000',
    '8': '01110/10001/10001/01110/10001/10001/01110',
    '9': '01110/10001/10001/01111/00001/00010/01100',
    ' ': '00000/00000/00000/00000/00000/00000/00000',
    '.': '00000/00000/00000/00000/00000/00110/00110',
    ',': '00000/00000/00000/00000/00110/00110/00100',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    '?': '01110/10001/00001/00010/00100/00000/00100',
    ':': '00000/00100/00100/00000/00100/00100/00000',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '/': '00001/00010/00010/00100/01000/01000/10000',
    "'": '00100/00100/00000/00000/00000/00000/00000',
    '%': '11001/11010/00010/00100/01000/01011/10011',
    '(': '00010/00100/01000/01000/01000/00100/00010',
    ')': '01000/00100/00010/00010/00010/00100/01000',
    '+': '00000/00100/00100/11111/00100/00100/00000',
    '*': '00000/10101/01110/11111/01110/10101/00000',
    '=': '00000/00000/11111/00000/11111/00000/00000',
    '<': '00010/00100/01000/10000/01000/00100/00010',
    '>': '01000/00100/00010/00001/00010/00100/01000',
    'x': '00000/10001/01010/00100/01010/10001/00000'
  };

  function textWidth(s, sc) { sc = sc || 1; return s.length * 6 * sc - sc; }
  function drawText(s, x, y, col, sc, shadow) {
    sc = sc || 1;
    s = String(s).toUpperCase();
    if (shadow) {
      let cx = x + sc;
      for (const ch of s) {
        const gl = GLYPHS[ch];
        if (gl) {
          const rows = gl.split('/');
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++)
            if (rows[r][c] === '1') px(cx + c * sc, y + sc + r * sc, sc, sc, shadow);
        }
        cx += 6 * sc;
      }
    }
    let cx = x;
    for (const ch of s) {
      const gl = GLYPHS[ch];
      if (gl) {
        const rows = gl.split('/');
        for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++)
          if (rows[r][c] === '1') px(cx + c * sc, y + r * sc, sc, sc, col);
      }
      cx += 6 * sc;
    }
    return cx - x;
  }

  // compact 3x5 font for the HUD log / legend
  const GLYPHS3 = {
    'A': '010/101/111/101/101', 'B': '110/101/110/101/110', 'C': '011/100/100/100/011',
    'D': '110/101/101/101/110', 'E': '111/100/110/100/111', 'F': '111/100/110/100/100',
    'G': '011/100/101/101/011', 'H': '101/101/111/101/101', 'I': '111/010/010/010/111',
    'J': '001/001/001/101/010', 'K': '101/101/110/101/101', 'L': '100/100/100/100/111',
    'M': '101/111/111/101/101', 'N': '101/111/101/101/101', 'O': '010/101/101/101/010',
    'P': '110/101/110/100/100', 'Q': '010/101/101/110/011', 'R': '110/101/110/101/101',
    'S': '011/100/010/001/110', 'T': '111/010/010/010/010', 'U': '101/101/101/101/111',
    'V': '101/101/101/101/010', 'W': '101/101/111/111/101', 'X': '101/101/010/101/101',
    'Y': '101/101/010/010/010', 'Z': '111/001/010/100/111',
    '0': '111/101/101/101/111', '1': '010/110/010/010/111', '2': '110/001/010/100/111',
    '3': '111/001/011/001/111', '4': '101/101/111/001/001', '5': '111/100/110/001/110',
    '6': '011/100/110/101/010', '7': '111/001/010/010/010', '8': '010/101/010/101/010',
    '9': '010/101/011/001/110', '%': '101/001/010/100/101', ' ': '000/000/000/000/000',
    '.': '000/000/000/000/010', '-': '000/000/111/000/000', '/': '001/001/010/100/100'
  };
  function textWidth3(s) { return s.length * 4 - 1; }
  function drawText3(s, x, y, col, shadow) {
    s = String(s).toUpperCase();
    let cx = x;
    for (const ch of s) {
      const gl = GLYPHS3[ch];
      if (gl) {
        const rows = gl.split('/');
        if (shadow) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
          if (rows[r][c] === '1') px(cx + c + 1, y + r + 1, 1, 1, shadow);
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
          if (rows[r][c] === '1') px(cx + c, y + r, 1, 1, col);
      }
      cx += 4;
    }
    return cx - x;
  }

  // ------------------------------------------------------------------- fish
  // Rarity-specific fish definitions. Everything drawn from these parameters.
  const FISH = {
    Common: [
      { name: 'MUDSKIP', body: [6, 4], tail: 'fan', tailLen: 5, tailH: 5,
        body1: '#8a6b3f', belly: '#cdb07a', fin: '#6d5230', outline: '#3a2a16',
        pattern: 'spots', patternColor: '#5a4325', whisker: true },
      { name: 'PEBBLEFIN', body: [5, 4], tail: 'round', tailLen: 4, tailH: 5,
        body1: '#7f8a5a', belly: '#c3c79a', fin: '#5c6540', outline: '#333a20',
        pattern: 'spots', patternColor: '#4d5531' }
    ],
    Uncommon: [
      { name: 'COPPERBELLY', body: [6, 4], tail: 'fork', tailLen: 6, tailH: 6,
        body1: '#c47a35', belly: '#f0c477', fin: '#8f4f22', outline: '#4a2810',
        pattern: 'stripes', patternColor: '#8f4f22' },
      { name: 'SILVER DARTER', body: [8, 3], tail: 'fork', tailLen: 6, tailH: 5,
        body1: '#b9c6d0', belly: '#eef4f8', fin: '#7d8c99', outline: '#4a5866',
        pattern: 'stripe', patternColor: '#7d8c99' }
    ],
    Rare: [
      { name: 'MOONLIT KOI', body: [6, 4], tail: 'flow', tailLen: 7, tailH: 7,
        body1: '#f3f6fb', belly: '#ffffff', fin: '#cfd8ec', outline: '#6b6f88',
        pattern: 'patches', patternColor: '#e2853f', patternColor2: '#3f6fd8', glowy: true },
      { name: 'CORAL PIKE', body: [9, 3], tail: 'fork', tailLen: 6, tailH: 5,
        body1: '#e0788f', belly: '#f6c3cd', fin: '#b24a68', outline: '#5e2233',
        pattern: 'spikes', patternColor: '#b24a68', snout: true }
    ],
    Epic: [
      { name: 'STORMSCALE', body: [7, 4], tail: 'fork', tailLen: 7, tailH: 7,
        body1: '#31527f', belly: '#6d92c4', fin: '#1e3557', outline: '#131f36',
        pattern: 'zigzag', patternColor: '#8fe0ff', glowy: true },
      { name: 'AMBERWING RAY', shape: 'ray', body: [10, 5], tail: 'whip', tailLen: 16,
        body1: '#c98a2e', belly: '#f2cf7a', fin: '#8a5a1a', outline: '#4a3010',
        pattern: 'spots', patternColor: '#8a5a1a' }
    ],
    Legendary: [
      { name: 'EMBERFANG', body: [7, 4], tail: 'fork', tailLen: 7, tailH: 7,
        body1: '#c0392b', belly: '#f4a24b', fin: '#7d1f16', outline: '#3d0e0a',
        pattern: 'spikes', patternColor: '#ffb03a', glowy: true, teeth: true },
      { name: 'AURORA SERPENT', shape: 'serpent', body: [6, 4], tail: 'flow', tailLen: 6,
        body1: '#3fd6c0', belly: '#bff7ee', fin: '#2a9d9a', outline: '#154f55',
        pattern: 'runes', patternColor: '#ff7bd6', glowy: true, segs: 11 }
    ],
    Ancient: [
      { name: 'TIDAL WYRM', shape: 'serpent', body: [6, 5], tail: 'flow', tailLen: 8,
        body1: '#1f7d78', belly: '#7fe6d8', fin: '#0f4a4c', outline: '#082a2e',
        pattern: 'runes', patternColor: '#ffd76a', glowy: true, segs: 13, ancient: true }
    ]
  };

  function fishByName(n) {
    for (const r of RARITIES) for (const f of FISH[r]) if (f.name === n) return { def: f, rarity: r };
    return null;
  }
  function pickFish(rarity) {
    const arr = FISH[rarity];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // -------------------------------------------------------- fish rendering
  function drawTail(def, tx, cy, dir) {
    const len = def.tailLen || 5, h = def.tailH || (def.body[1] + 1);
    if (def.tail === 'fork') {
      for (let i = 0; i < len; i++) {
        const x = tx - dir * i;
        const spread = Math.round((i / (len - 1)) * h);
        px(x, cy - spread, 1, Math.max(1, spread - 1), def.fin || def.body1);
        px(x, cy + 2, 1, Math.max(1, spread - 1), def.fin || def.body1);
        if (i < len - 2) px(x, cy - 1, 1, 2, def.body1);
      }
    } else if (def.tail === 'round') {
      for (let i = 0; i < len; i++) {
        const x = tx - dir * i;
        const hh = Math.round((i / len) * h);
        px(x, cy - hh, 1, 2 * hh + 1, i < len - 1 ? def.fin : def.body1);
      }
    } else if (def.tail === 'flow') {
      for (let i = 0; i < len; i++) {
        const x = tx - dir * i;
        const hh = Math.round((i / len) * h);
        const wob = Math.round(Math.sin(i * 0.9) * 1);
        px(x, cy - hh + wob, 1, 2 * hh + 1, i % 2 ? def.fin : def.body1);
      }
    } else if (def.tail === 'whip') {
      for (let i = 0; i < len; i++) {
        const x = tx - dir * i;
        const y = cy + Math.round(Math.sin(i * 0.35) * i * 0.18);
        px(x, y, 1, 1, def.fin);
        if (i % 3 === 0) px(x, y + 1, 1, 1, shade(def.fin, -0.2));
      }
    } else { // fan
      for (let i = 0; i < len; i++) {
        const x = tx - dir * i;
        const hh = Math.round((i / len) * h);
        px(x, cy - hh, 1, 2 * hh + 1, def.fin);
        if (i < len - 1) px(x, cy - Math.round(hh * 0.5), 1, hh + 1, def.body1);
      }
    }
  }

  function drawNormalFish(def, cx, cy, dir) {
    const [rx, ry] = def.body;
    // tail first (behind)
    drawTail(def, cx - dir * (rx - 2), cy, dir);
    // dorsal + pelvic fins
    px(cx - dir * 1, cy - ry - 2, 3, 2, def.fin);
    px(cx - dir * 1, cy - ry - 3, 2, 1, def.fin);
    px(cx + dir * 1, cy + ry, 3, 2, def.fin);
    // outline + body
    ellipse(cx, cy, rx + 1, ry + 1, def.outline);
    ellipse(cx, cy, rx, ry, def.body1);
    ellipse(cx, cy + Math.max(1, ry - 2), rx - 2, Math.max(1, ry - 2), def.belly);
    // patterns
    if (def.pattern === 'spots') {
      const spots = [[-2, -1], [1, 0], [3, -2], [-4, 1], [0, 2]];
      for (const s of spots) ellipse(cx + s[0], cy + s[1], 1, 1, def.patternColor);
    } else if (def.pattern === 'stripes') {
      for (let i = -2; i <= 2; i += 2) {
        const xo = Math.round(i * (rx / 3));
        const hh = Math.max(1, Math.round(ry * Math.sqrt(Math.max(0, 1 - (xo * xo) / (rx * rx)))));
        px(cx + xo, cy - hh + 1, 1, 2 * hh - 1, def.patternColor);
      }
    } else if (def.pattern === 'stripe') {
      line(cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1, def.patternColor);
    } else if (def.pattern === 'zigzag') {
      for (let i = -3; i <= 3; i++) {
        const y = cy + (i % 2 === 0 ? -1 : 1);
        pxl(cx + i, y, def.patternColor);
        pxl(cx + i, y + 1, def.patternColor);
      }
    } else if (def.pattern === 'patches') {
      ellipse(cx - 2, cy - 1, 2, 1, def.patternColor);
      ellipse(cx + 2, cy + 1, 2, 2, def.patternColor2 || def.patternColor);
    } else if (def.pattern === 'spikes') {
      for (let i = -3; i <= 3; i += 2) {
        px(cx + i, cy - ry, 1, 2, def.patternColor);
      }
    } else if (def.pattern === 'runes') {
      for (let i = -3; i <= 3; i += 2) {
        pxl(cx + i, cy, def.patternColor);
        pxl(cx + i, cy - 1, def.patternColor);
        pxl(cx + i + 1, cy, def.patternColor);
      }
    }
    // head highlight
    ellipse(cx + dir * (rx - 3), cy - 1, 2, 1, shade(def.body1, 0.25));
    // eye + mouth
    const ex = cx + dir * (rx - 2), ey = cy - 1;
    px(ex - 1, ey - 1, 3, 3, def.outline);
    px(ex - 1, ey - 1, 2, 2, '#f4f4ec');
    pxl(ex + (dir > 0 ? 0 : -1), ey - 1, '#101820');
    px(cx + dir * rx, cy + 1, 1, 1, def.outline);
    if (def.teeth) {
      for (let i = 0; i < 3; i++) pxl(cx + dir * (rx - 1 - i), cy + ry - 1, '#fff8e0');
    }
    if (def.whisker) {
      for (let i = 0; i < 4; i++) pxl(cx + dir * (rx - 1 + i), cy + 2 + Math.round(i * 0.4), def.outline);
      for (let i = 0; i < 4; i++) pxl(cx + dir * (rx - 1 + i), cy + 3 - Math.round(i * 0.4), def.outline);
    }
  }

  function drawRay(def, cx, cy, dir) {
    const [rx, ry] = def.body;
    // whip tail
    drawTail(def, cx - dir * (rx - 2), cy, dir);
    // diamond body
    for (let yy = -ry; yy <= ry; yy++) {
      const t = 1 - Math.abs(yy) / (ry + 0.5);
      const w = Math.floor(rx * t);
      px(cx - w, cy + yy, w + 1 + w, 1, def.outline);
    }
    for (let yy = -ry + 1; yy <= ry - 1; yy++) {
      const t = 1 - Math.abs(yy) / (ry + 0.5);
      const w = Math.floor((rx - 1) * t);
      px(cx - w + 1, cy + yy, w + w - 1, 1, yy < 0 ? def.body1 : def.belly);
    }
    // head bumps / eyes on top
    ellipse(cx + dir * 2, cy - 2, 2, 2, '#f4f4ec');
    ellipse(cx - dir * 2, cy - 2, 2, 2, '#f4f4ec');
    pxl(cx + dir * 2, cy - 2, '#101820');
    pxl(cx - dir * 2, cy - 2, '#101820');
    if (def.pattern === 'spots') {
      for (let i = -2; i <= 2; i += 2) ellipse(cx + i, cy + 1, 1, 1, def.patternColor);
    }
  }

  function drawSerpent(def, cx, cy, dir, t) {
    const segs = def.segs || 11, step = 2.2;
    for (let i = segs - 1; i >= 0; i--) {
      const x = cx - dir * (i * step - (segs * step) / 2);
      const y = cy + Math.round(Math.sin(i * 0.7 + (t || 0) * 2) * 3);
      const taper = 1 - i / (segs + 2);
      const rr = Math.max(1, Math.round(def.body[1] * (0.45 + taper * 0.6)));
      const rx = Math.max(1, Math.round(def.body[0] * 0.45 * (0.5 + taper)));
      if (i === 0) {
        ellipse(x, y, 4, 4, def.outline);
        ellipse(x, y, 3, 3, def.body1);
        px(x - 1, y - 3, 2, 2, def.fin);
        pxl(x - 1, y - 1, '#f4f4ec'); pxl(x + 1, y - 1, '#f4f4ec');
        pxl(x - 1, y - 1, '#101820'); pxl(x + 1, y - 1, '#101820');
        pxl(x, y + 1, def.outline);
        pxl(x - 3, y - 4, def.fin); pxl(x + 3, y - 4, def.fin);
      } else {
        ellipse(x, y, rx + 1, rr + 1, def.outline);
        ellipse(x, y, rx, rr, i % 2 ? def.body1 : shade(def.body1, -0.12));
        if (i % 3 === 1) {
          px(x, y - rr - 1, 2, 2, def.fin);
          px(x, y + rr, 2, 2, def.fin);
        }
        if (def.pattern === 'runes' && i % 2 === 0) {
          pxl(x, y, def.patternColor);
          pxl(x + 1, y, def.patternColor);
          pxl(x, y - 1, def.patternColor);
        }
      }
    }
  }

  function drawFish(def, cx, cy, opts) {
    opts = opts || {};
    const dir = opts.flip ? -1 : 1;
    if (def.glowy && opts.glow !== false) {
      g.globalAlpha = 0.18 + 0.07 * Math.sin((opts.t || 0) * 3);
      ellipse(cx, cy, def.body[0] + 4, def.body[1] + 4, RCOL[opts.rarity || 'Rare']);
      g.globalAlpha = 1;
    }
    if (def.shape === 'ray') drawRay(def, cx, cy, dir);
    else if (def.shape === 'serpent') drawSerpent(def, cx, cy, dir, opts.t || 0);
    else drawNormalFish(def, cx, cy, dir);
  }

  // --------------------------------------------------------------- world gen
  function shoreY(x) {
    return Math.round(128 + 6 * Math.sin(x * 0.045) + 4 * Math.sin(x * 0.11 + 1.3) + 3 * Math.sin(x * 0.021 + 2.0));
  }

  const R = mulberry32(1337);
  const decor = { tufts: [], flowers: [], rocks: [], pebbles: [], reeds: [], pads: [], bubbles: [], fishshadows: [], sparkles: [] };
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(R() * W), base = shoreY(x);
    const y = base + 6 + Math.floor(R() * (H - base - 6));
    decor.tufts.push({ x, y, c: R() < 0.5 ? C.grassDark : C.grassLight, h: 2 + Math.floor(R() * 2) });
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(6 + R() * (W - 12)), base = shoreY(x);
    const y = base + 8 + Math.floor(R() * (H - base - 12));
    const cols = ['#f2e06a', '#e88fb0', '#f0f0f0', '#c58ff0', '#f2a24b'];
    decor.flowers.push({ x, y, c: cols[Math.floor(R() * cols.length)] });
  }
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(R() * W), base = shoreY(x);
    const y = base + 10 + Math.floor(R() * (H - base - 14));
    decor.rocks.push({ x, y, w: 4 + Math.floor(R() * 5), h: 3 + Math.floor(R() * 3) });
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(R() * W), base = shoreY(x);
    const y = base - 4 + Math.floor(R() * 40);
    if (y < 4) continue;
    decor.pebbles.push({ x, y, c: mix(C.waterDeep, C.waterLight, R() * 0.7) });
  }
  for (let i = 0; i < 40; i++) decor.bubbles.push({ x: R() * W, y: 20 + R() * 95, s: 0.2 + R() * 0.6, r: 1 + Math.floor(R() * 2) });
  for (let i = 0; i < 6; i++) decor.fishshadows.push({ x: R() * W, y: 40 + R() * 70, sp: 4 + R() * 8, dir: R() < 0.5 ? -1 : 1, sz: 3 + Math.floor(R() * 3) });
  for (let i = 0; i < 24; i++) decor.sparkles.push({ x: R() * W, y: R() * 120, p: R() * 6.28, sp: 0.5 + R() * 1.2 });
  // reeds along waterline
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(60 + R() * 220), base = shoreY(x);
    decor.reeds.push({ x, base, h: 8 + Math.floor(R() * 14), p: R() * 6.28, c: R() < 0.5 ? C.grassDark : C.grass });
  }
  // lily pads
  for (let i = 0; i < 7; i++) {
    const x = 24 + Math.floor(R() * 90), y = 70 + Math.floor(R() * 34);
    decor.pads.push({ x, y, r: 3 + Math.floor(R() * 3), p: R() * 6.28 });
  }

  // ----------------------------------------------------------- particles
  const particles = [];
  function spawnSplash(x, y, n, col, spread, life) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (spread || 1.6);
      const sp = 12 + Math.random() * 26;
      particles.push({ x, y, vx: Math.cos(a) * sp * 0.6, vy: Math.sin(a) * sp, life: life || 0.6, bt: 0, col: col || C.waterHi, grav: 60 });
    }
  }
  function spawnBurst(x, y, n, col, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (speed || 20) * (0.3 + Math.random());
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 8, life: 0.4 + Math.random() * 0.7, bt: 0, col, grav: 12, spark: true });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.bt += dt;
      if (p.bt >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
      p.vx *= (1 - 1.4 * dt);
    }
  }
  function drawParticles() {
    for (const p of particles) {
      g.globalAlpha = clamp(1 - p.bt / p.life, 0, 1);
      if (p.spark) pxl(p.x, p.y, p.col);
      else px(p.x, p.y, 1, 1, p.col);
      g.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------- game state
  let state = 'ready';
  let phaseT = 0;
  let clock = 0;
  const CAST_ANIM = 0.55;
  const BITE_WINDOW = 1.6;
  const REEL_DUR = 0.75;
  let biteAt = 0;
  let revealDur = 2.3;
  let currentCatch = null;      // {name, rarity, def}
  let catchLog = [];            // newest first, session-long
  let toastText = '';
  let toastT = 0;
  let shakeT = 0;

  const rodTip = { x: 184, y: 94 };
  const BOBBER = { x: 214, y: 56 };
  let bobber = { x: rodTip.x, y: rodTip.y };
  let bobberDip = 0;
  let castSplashDone = false;

  // ------------------------------------------------- at most one action / press
  function handleAction() {
    if (state === 'ready') startCast();
    else if (state === 'bite') doCatch();
    // waiting / reeling / reveal: ignored -> no overlapping casts
  }

  function startCast() {
    state = 'waiting';
    phaseT = 0;
    castSplashDone = false;
    biteAt = CAST_ANIM + 1.4 + Math.random() * 1.3;
    bobber.x = rodTip.x; bobber.y = rodTip.y;
    bobberDip = 0;
  }

  function startBite() {
    state = 'bite';
    phaseT = 0;
    shakeT = 0.18;
    spawnSplash(bobber.x, bobber.y + 2, 8, C.foam, 1.2, 0.5);
  }

  function doCatch() {
    // MUST go through the public interface so it can be overridden by tests
    const rarity = window.fishing.pickRarity(Math.random());
    const def = pickFish(rarity);
    currentCatch = { name: def.name, rarity, def };
    catchLog.unshift({ name: def.name, rarity });
    state = 'reeling';
    phaseT = 0;
    shakeT = 0.25;
    spawnSplash(bobber.x, bobber.y, 16, C.foam, 2.2, 0.7);
    spawnBurst(bobber.x, bobber.y - 4, 8, RCOL[rarity], 26);
  }

  function missBite() {
    state = 'ready';
    phaseT = 0;
    toastText = 'IT GOT AWAY...';
    toastT = 1.5;
    spawnSplash(bobber.x, bobber.y + 2, 6, C.waterHi, 1.4, 0.5);
  }

  function finishReveal() {
    state = 'ready';
    phaseT = 0;
    currentCatch = null;
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    clock += dt;
    updateParticles(dt);
    if (toastT > 0) toastT -= dt;
    if (shakeT > 0) shakeT -= dt;

    // ambient fish shadows drift
    for (const f of decor.fishshadows) {
      f.x += f.dir * f.sp * dt;
      if (f.x < -20) f.x = W + 20;
      if (f.x > W + 20) f.x = -20;
    }

    if (state === 'waiting') {
      phaseT += dt;
      const t = clamp(phaseT / CAST_ANIM, 0, 1);
      const e = t * t * (3 - 2 * t);
      bobber.x = lerp(rodTip.x, BOBBER.x, e);
      bobber.y = lerp(rodTip.y, BOBBER.y, e) - Math.sin(Math.PI * e) * 24;
      if (t >= 1 && !castSplashDone) {
        castSplashDone = true;
        spawnSplash(BOBBER.x, BOBBER.y + 1, 10, C.foam, 1.4, 0.6);
      }
      if (phaseT >= biteAt) startBite();
    } else if (state === 'bite') {
      phaseT += dt;
      bobberDip = Math.abs(Math.sin(phaseT * 9)) * 3;
      bobber.x = BOBBER.x + (Math.random() - 0.5) * 0.8;
      bobber.y = BOBBER.y + bobberDip;
      if (phaseT >= BITE_WINDOW) missBite();
    } else if (state === 'reeling') {
      phaseT += dt;
      const t = clamp(phaseT / REEL_DUR, 0, 1);
      bobber.x = lerp(BOBBER.x, rodTip.x, t);
      bobber.y = lerp(BOBBER.y, rodTip.y, t) - Math.sin(Math.PI * t) * 10;
      if (phaseT >= REEL_DUR) {
        state = 'reveal';
        phaseT = 0;
        const bonus = currentCatch && currentCatch.rarity === 'Ancient' ? 1.0
          : currentCatch && currentCatch.rarity === 'Legendary' ? 0.6 : 0;
        revealDur = 2.2 + bonus;
        shakeT = 0.15;
        spawnBurst(160, 96, 20, RCOL[currentCatch.rarity], 40);
      }
    } else if (state === 'reveal') {
      phaseT += dt;
      if (phaseT >= revealDur) finishReveal();
    }
  }

  // ---------------------------------------------------------------- drawing
  function drawWater(t) {
    const maxY = 145;
    for (let y = 0; y <= maxY; y++) {
      let col;
      if (y < 55) col = mix(C.waterDeep, C.waterMid, y / 55);
      else if (y < 105) col = mix(C.waterMid, C.water, (y - 55) / 50);
      else col = mix(C.water, C.waterLight, (y - 105) / 40);
      px(0, y, W, 1, col);
    }
    // broad depth bands (very subtle)
    g.globalAlpha = 0.055;
    for (let y = 8; y < 130; y += 8) {
      px(0, y, W, 1, C.waterHi);
    }
    g.globalAlpha = 1;
    // moving surface highlights
    for (const s of decor.sparkles) {
      const a = 0.35 + 0.35 * Math.sin(t * s.sp + s.p);
      const yy = s.y + Math.sin(t * 0.7 + s.p) * 1.5;
      g.globalAlpha = clamp(a, 0, 0.6);
      px(s.x, yy, 2 + Math.floor(Math.abs(Math.sin(s.p)) * 4), 1, C.waterHi);
      g.globalAlpha = 1;
    }
    // drifting wave dashes across the open water
    for (let i = 0; i < 30; i++) {
      const y = 6 + ((i * 17) % 122);
      const speed = 5 + (i % 5) * 3;
      const x = ((i * 53 + t * speed) % (W + 30)) - 15;
      const len = 3 + (i % 4) * 2;
      g.globalAlpha = 0.16;
      px(x, y + Math.sin(t * 0.8 + i) * 1.5, len, 1, C.waterHi);
      g.globalAlpha = 1;
    }
    // caustic wavy lines
    g.globalAlpha = 0.12;
    for (let i = 0; i < 6; i++) {
      const yb = 30 + i * 16;
      for (let x = 0; x < W; x += 2) {
        const yy = yb + Math.sin((x + t * 22) * 0.05 + i) * 2;
        pxl(x, yy, C.waterHi);
      }
    }
    g.globalAlpha = 1;
    // floating bubbles
    for (const b of decor.bubbles) {
      const yy = ((b.y - t * b.s * 5) % 150 + 150) % 150;
      if (yy < 4 || yy > 128) continue;
      g.globalAlpha = 0.35;
      if (b.r > 1) { pxl(b.x, yy, C.foam); pxl(b.x + 1, yy, C.foam); pxl(b.x, yy + 1, C.foam); pxl(b.x + 1, yy + 1, C.foam); }
      else pxl(b.x, yy, C.foam);
      g.globalAlpha = 1;
    }
    // underwater pebbles / sand floor hints
    for (const p of decor.pebbles) {
      if (p.y > shoreY(p.x) - 2) continue;
      g.globalAlpha = 0.5;
      pxl(p.x, p.y, p.c);
      g.globalAlpha = 1;
    }
    // fish shadows
    for (const f of decor.fishshadows) {
      const yy = f.y + Math.sin(t + f.x * 0.05) * 2;
      g.globalAlpha = 0.16;
      ellipse(f.x, yy, f.sz + 3, f.sz, '#0a2030');
      px(f.x - (f.sz + 3) * f.dir, yy - 1, 2, 2, '#0a2030');
      g.globalAlpha = 1;
    }
  }

  function drawIslet(t) {
    // small distant islet top-left for depth
    const bx = 40, by = 30;
    g.globalAlpha = 0.10;
    ellipse(bx + 4, by + 6, 22, 6, C.shadow);
    g.globalAlpha = 1;
    ellipse(bx, by + 4, 16, 5, C.sandDark);
    ellipse(bx, by + 3, 14, 4, C.sand);
    ellipse(bx - 2, by + 1, 9, 3, C.grass);
    ellipse(bx - 2, by, 7, 2, C.grassLight);
    // tiny palm
    px(bx - 2, by - 8, 1, 9, C.woodDark);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI + i * 0.6;
      line(bx - 1, by - 8, bx - 1 + Math.cos(a) * 6, by - 8 + Math.sin(a) * 4 - 2, C.grassDark);
    }
  }

  function drawLand(t) {
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x);
      // wet waterline
      px(x, sy - 1, 1, 1, C.foam);
      px(x, sy, 1, 2, C.wet);
      // sand
      px(x, sy + 2, 1, 7, C.sand);
      px(x, sy + 2, 1, 1, C.sandLight);
      px(x, sy + 8, 1, 1, C.sandDark);
      // grass
      const gy = sy + 9;
      px(x, gy, 1, H - gy, C.grass);
      px(x, gy, 1, 1, C.grassLight);
      px(x, gy + 1, 1, 1, C.grassDark);
    }
    // grass texture
    for (const t2 of decor.tufts) {
      if (t2.y > shoreY(t2.x) + 8) {
        px(t2.x, t2.y - t2.h, 1, t2.h, t2.c);
        px(t2.x + 1, t2.y - t2.h + 1, 1, t2.h - 1, t2.c);
      }
    }
    for (const f of decor.flowers) {
      pxl(f.x, f.y, C.grassDark);
      pxl(f.x, f.y - 1, f.c);
      pxl(f.x - 1, f.y - 1, f.c);
      pxl(f.x + 1, f.y - 1, f.c);
      pxl(f.x, f.y - 2, shade(f.c, 0.3));
    }
    // rocks with highlight/shadow
    for (const r of decor.rocks) {
      g.globalAlpha = 0.25;
      ellipse(r.x + 1, r.y + 1, r.w / 2, r.h / 3, C.shadow);
      g.globalAlpha = 1;
      ellipse(r.x, r.y, r.w / 2, r.h / 2, C.rockDark);
      ellipse(r.x - 1, r.y - 1, r.w / 2 - 1, r.h / 2 - 1, C.rock);
      ellipse(r.x - 2, r.y - 2, r.w / 3, r.h / 3, C.rockLight);
    }
  }

  function drawTree(x, baseY, scale, t) {
    const sway = Math.sin(t * 0.9 + x) * 0.8;
    // trunk
    px(x - 2, baseY - 16 * scale, 4, 16 * scale, C.woodDark);
    px(x - 1, baseY - 16 * scale, 2, 16 * scale, C.wood);
    px(x - 2, baseY - 16 * scale, 1, 16 * scale, C.woodLight);
    // branches
    line(x, baseY - 12 * scale, x - 6 * scale + sway, baseY - 18 * scale, C.woodDark);
    line(x, baseY - 13 * scale, x + 6 * scale + sway, baseY - 17 * scale, C.woodDark);
    // canopy (layered blobs)
    const cy = baseY - 22 * scale;
    const c = Math.round(scale);
    ellipse(x + 1 + sway, cy + 4, 11 * c, 8 * c, C.grassDark);
    ellipse(x - 5 + sway, cy + 1, 8 * c, 7 * c, C.grass);
    ellipse(x + 6 + sway, cy, 8 * c, 7 * c, C.grass);
    ellipse(x + sway, cy - 3, 9 * c, 6 * c, C.grass);
    ellipse(x - 3 + sway, cy - 4, 6 * c, 4 * c, C.grassLight);
    ellipse(x + 4 + sway, cy - 2, 5 * c, 3 * c, C.grassLight);
    ellipse(x + 1 + sway, cy - 6, 4 * c, 2 * c, C.grassHi);
    // dapples
    g.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      pxl(x + Math.cos(a) * 8 * c + sway, cy + Math.sin(a) * 5 * c, C.grassHi);
    }
    g.globalAlpha = 1;
  }

  function drawPalm(x, baseY, t) {
    const sway = Math.sin(t * 0.8 + 1) * 1.2;
    // trunk curved
    for (let i = 0; i < 18; i++) {
      const yy = baseY - i;
      const xx = x + Math.round(Math.sin(i * 0.12) * 3);
      px(xx, yy, 3, 1, i % 2 ? C.woodDark : C.wood);
      px(xx, yy, 1, 1, C.woodLight);
    }
    const tx = x + Math.round(Math.sin(18 * 0.12) * 3) + sway;
    const ty = baseY - 18;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      const ex = tx + Math.cos(a) * 12, ey = ty + Math.sin(a) * 8 + 3;
      line(tx, ty, ex, ey, C.grassDark);
      line(tx, ty + 1, ex, ey + 1, C.grass);
      pxl(ex, ey + 2, C.grassLight);
    }
    ellipse(tx, ty, 2, 2, C.woodDark);
  }

  function drawBush(x, y, w, h, t) {
    const sway = Math.round(Math.sin(t * 1.1 + x) * 0.6);
    g.globalAlpha = 0.25;
    ellipse(x + 1, y + 2, w / 2, h / 3, C.shadow);
    g.globalAlpha = 1;
    ellipse(x, y, w / 2, h / 2, C.grassDark);
    ellipse(x - 1 + sway, y - 1, w / 2 - 1, h / 2 - 1, C.grass);
    ellipse(x - 2 + sway, y - 2, w / 3, h / 3, C.grassLight);
    // berries
    for (let i = 0; i < 4; i++) pxl(x - 3 + i * 2 + sway, y - 1 + (i % 2), '#e2675f');
  }

  function drawReeds(t) {
    for (const r of decor.reeds) {
      const rx = r.x, base = r.base;
      const sway = Math.sin(t * 1.3 + r.p) * 1.5;
      // water shadow
      g.globalAlpha = 0.2;
      px(rx + 1, base, 1, 4, C.shadow);
      g.globalAlpha = 1;
      for (let i = 0; i < r.h; i++) {
        const yy = base - i;
        const xx = rx + Math.round(sway * (i / r.h));
        pxl(xx, yy, i > r.h - 3 ? C.grassDark : r.c);
      }
      // cattail head occasionally
      if (r.h > 16) {
        const hx = rx + Math.round(sway);
        px(hx, base - r.h - 3, 2, 4, '#6b4a2a');
        px(hx, base - r.h - 4, 2, 1, '#8a5f38');
      }
    }
  }

  function drawPads(t) {
    for (const p of decor.pads) {
      const bob = Math.sin(t * 1.2 + p.p) * 0.8;
      ellipse(p.x, p.y + bob, p.r, Math.max(1, p.r - 1), C.grassDark);
      ellipse(p.x - 1, p.y - 1 + bob, p.r - 1, Math.max(1, p.r - 2), C.grass);
      // notch
      px(p.x, p.y + bob, 1, 1, C.water);
      if (p.r >= 4) pxl(p.x - 1, p.y - 1 + bob, '#e88fb0');
    }
  }

  function drawDock() {
    const x0 = 148, x1 = 176, yTop = 96, yBot = 156;
    // shadow on water/land
    g.globalAlpha = 0.22;
    px(x0 + 3, yTop + 3, x1 - x0, yBot - yTop, C.shadow);
    g.globalAlpha = 1;
    // supporting posts
    for (const py of [yTop + 6, yTop + 26, yTop + 46, yBot - 4]) {
      px(x0 - 2, py, 3, 30, C.woodDark);
      px(x0 - 2, py, 1, 30, C.wood);
      px(x1 - 1, py, 3, 30, C.woodDark);
      px(x1, py, 1, 30, C.wood);
    }
    // planks
    for (let y = yTop; y < yBot; y += 4) {
      const edge = (Math.floor((y - yTop) / 4) % 2) === 0;
      px(x0, y, x1 - x0, 3, edge ? C.wood : C.woodLight);
      px(x0, y, x1 - x0, 1, edge ? C.woodHi : C.woodLight);
      px(x0, y + 3, x1 - x0, 1, C.woodDark);
      // nail/plank breaks
      pxl(x0 + 6, y + 1, C.woodDark);
      pxl(x1 - 7, y + 1, C.woodDark);
    }
    // side rails at tip
    px(x0, yTop, 1, yBot - yTop, C.woodDark);
    px(x1 - 1, yTop, 1, yBot - yTop, C.woodDark);
    // tip glow/highlight
    px(x0, yTop, x1 - x0, 1, C.woodHi);
  }

  function drawAngler(t) {
    const bx = 162, by = 120;
    const breathe = Math.sin(t * 1.6) > 0.6 ? 1 : 0;
    // dock shadow
    g.globalAlpha = 0.3;
    ellipse(bx, by + 1, 8, 3, C.shadow);
    g.globalAlpha = 1;
    // legs
    px(bx - 4, by - 6, 3, 6, C.pant);
    px(bx + 1, by - 6, 3, 6, C.pant);
    px(bx - 4, by - 6, 1, 6, C.pantD);
    px(bx + 1, by - 6, 1, 6, C.pantD);
    // boots
    px(bx - 5, by - 1, 4, 2, C.boot);
    px(bx + 1, by - 1, 4, 2, C.boot);
    // torso / coat
    px(bx - 5, by - 12 - breathe, 10, 7 + breathe, C.coat);
    px(bx - 5, by - 12 - breathe, 2, 7 + breathe, C.coatD);
    px(bx + 3, by - 12 - breathe, 2, 7 + breathe, C.coatD);
    px(bx - 2, by - 12 - breathe, 1, 6, C.coatL);
    // arms
    px(bx - 7, by - 11, 3, 3, C.coatD);
    px(bx + 4, by - 11, 4, 3, C.coatD);
    px(bx + 6, by - 11, 2, 2, C.skin);   // hand on rod
    // neck / head
    px(bx - 2, by - 13, 5, 2, C.skinD);
    px(bx - 3, by - 18, 7, 6, C.skin);
    // hair back
    px(bx - 3, by - 18, 7, 2, C.hair);
    px(bx - 3, by - 18, 1, 4, C.hair);
    px(bx + 3, by - 18, 1, 4, C.hair);
    // ear
    pxl(bx + 4, by - 16, C.skinD);
    // straw hat brim + crown
    px(bx - 7, by - 19, 15, 2, C.hat);
    px(bx - 7, by - 19, 15, 1, C.hatL);
    px(bx - 5, by - 23, 11, 4, C.hat);
    px(bx - 5, by - 23, 11, 1, C.hatL);
    px(bx - 5, by - 23, 1, 4, C.hatD);
    px(bx + 5, by - 23, 1, 4, C.hatD);
    px(bx - 5, by - 20, 11, 1, C.hatBand);
    // rod
    const hx = bx + 7, hy = by - 11;
    line(hx, hy, rodTip.x, rodTip.y, C.woodDark);
    line(hx, hy - 1, rodTip.x, rodTip.y - 1, C.woodLight);
    pxl(rodTip.x, rodTip.y, '#2a2a2a');
  }

  function drawLineAndBobber(t) {
    if (state === 'ready') return;
    // line
    const from = rodTip;
    if (state === 'reveal') return;
    // slight catenary sag
    const segs = 6;
    let lx = from.x, ly = from.y;
    for (let i = 1; i <= segs; i++) {
      const tt = i / segs;
      const nx = lerp(from.x, bobber.x, tt);
      const ny = lerp(from.y, bobber.y, tt) + Math.sin(tt * Math.PI) * 2;
      line(lx, ly, nx, ny, 'rgba(230,240,235,0.7)');
      lx = nx; ly = ny;
    }
    // ripples
    const rippleT = (clock * 0.6) % 1;
    for (let k = 0; k < 2; k++) {
      const rr = ((clock * 0.6 + k * 0.5) % 1) * 9;
      g.globalAlpha = clamp(0.4 - rr / 24, 0, 0.4);
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        pxl(BOBBER.x + Math.cos(a) * rr, BOBBER.y + Math.sin(a) * rr * 0.45, C.foam);
      }
      g.globalAlpha = 1;
    }
    // bobber body
    const bobX = Math.round(bobber.x), bobY = Math.round(bobber.y);
    px(bobX - 1, bobY - 3, 3, 2, '#e94f3d');
    px(bobX - 1, bobY - 1, 3, 3, '#f7f7f2');
    px(bobX - 1, bobY + 2, 3, 1, '#c9c9c2');
    pxl(bobX, bobY - 4, '#8a8a84');
    // bite emphasis
    if (state === 'bite') {
      // exclamation bubble above bobber
      const pulse = Math.sin(clock * 18) > 0 ? 0 : 1;
      const ey = bobY - 16 + pulse;
      px(bobX - 4, ey - 4, 9, 11, C.uiBg);
      px(bobX - 3, ey - 3, 7, 9, C.waterDeep);
      drawText('!', bobX - 2, ey - 2, '#ffe14d', 1, shade('#ffe14d', -0.6));
      // tail of bubble
      pxl(bobX - 1, ey + 7, C.waterDeep); pxl(bobX, ey + 7, C.waterDeep); pxl(bobX, ey + 8, C.waterDeep);
    }
  }

  // ------------------------------------------------------------------- UI
  const CAST_BTN = { x: W - 108, y: H - 44, w: 100, h: 36 };

  function panel(x, y, w, h) {
    g.globalAlpha = 0.86;
    px(x, y, w, h, C.uiBg);
    g.globalAlpha = 1;
    px(x, y, w, 1, C.uiBorder);
    px(x, y + h - 1, w, 1, C.uiBorder);
    px(x, y, 1, h, C.uiBorder);
    px(x + w - 1, y, 1, h, C.uiBorder);
  }

  function drawCatchLog() {
    const entries = catchLog.slice(0, 8);
    const w = 74, x = 4, y = 4, rowH = 6;
    const h = 12 + Math.max(1, entries.length) * rowH;
    panel(x, y, w, h);
    drawText('LOG', x + 4, y + 3, C.cream, 1, C.shadow);
    if (entries.length === 0) {
      drawText3('NONE YET', x + 4, y + 14, C.uiDim);
      return;
    }
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i], ey = y + 13 + i * rowH;
      px(x + 4, ey + 1, 3, 3, RCOL[e.rarity]);
      drawText3(e.name, x + 10, ey, i === 0 ? C.cream : C.uiText, i === 0 ? C.shadow : null);
    }
  }

  function drawLegend() {
    const w = 68, h = 50, x = W - w - 4, y = 4;
    panel(x, y, w, h);
    drawText('ODDS', x + 4, y + 3, C.cream, 1, C.shadow);
    const items = [['COMMON', 45], ['UNCOMMON', 25], ['RARE', 15], ['EPIC', 8], ['LEGENDARY', 5], ['ANCIENT', 2]];
    for (let i = 0; i < items.length; i++) {
      const ey = y + 13 + i * 6;
      px(x + 4, ey + 1, 3, 3, RCOL[RARITIES[i]]);
      drawText3(items[i][0], x + 10, ey, C.uiText);
      const p = items[i][1] + '%';
      drawText3(p, x + w - 4 - textWidth3(p), ey, RCOL[RARITIES[i]]);
    }
  }

  function drawButton() {
    const b = CAST_BTN;
    let label = 'CAST', active = false, col = C.uiBorder, glow = RCOL.Common;
    if (state === 'ready') { label = 'CAST'; active = true; col = '#2f6f5f'; glow = '#5fc46b'; }
    else if (state === 'bite') { label = 'REEL!'; active = true; col = '#8a2f2f'; glow = '#ff5a3d'; }
    else if (state === 'waiting') { label = 'WAIT'; active = false; }
    else if (state === 'reeling') { label = 'REELING'; active = false; }
    else { label = 'CAUGHT'; active = false; }

    // bite pulse
    let border = col;
    if (state === 'bite') border = Math.sin(clock * 18) > 0 ? '#ffd23d' : '#ff5a3d';
    g.globalAlpha = 0.85;
    px(b.x, b.y, b.w, b.h, active && state === 'bite' ? '#3a1414' : C.uiBg);
    g.globalAlpha = 1;
    px(b.x, b.y, b.w, 2, border);
    px(b.x, b.y + b.h - 2, b.w, 2, border);
    px(b.x, b.y, 2, b.h, border);
    px(b.x + b.w - 2, b.y, 2, b.h, border);
    if (state === 'bite') {
      for (let i = 0; i < 4; i++) pxl(b.x + 4 + i * 8, b.y + 4, glow);
    }
    const sc = 1;
    const tw = textWidth(label, sc);
    drawText(label, b.x + (b.w - tw) / 2, b.y + 9, active ? C.cream : C.uiDim, sc, active ? C.shadow : null);
    if (state === 'ready') drawText('SPACE / CLICK', b.x + (b.w - textWidth('SPACE / CLICK', 1)) / 2, b.y + 22, C.uiDim, 1);
    if (state === 'bite') {
      const frac = 1 - phaseT / BITE_WINDOW;
      const bw = Math.floor((b.w - 12) * clamp(frac, 0, 1));
      px(b.x + 6, b.y + 20, b.w - 12, 3, '#3a1414');
      px(b.x + 6, b.y + 20, bw, 3, frac > 0.35 ? '#ffd23d' : '#ff5a3d');
    }
  }

  function drawPrompt() {
    const cx = W / 2;
    if (state === 'bite') {
      const msg = 'REEL NOW!';
      const blink = Math.sin(clock * 20) > 0;
      drawText(msg, cx - textWidth(msg, 1) / 2, 166, blink ? '#ffe14d' : '#ff8a3d', 1, C.shadow);
    } else if (state === 'waiting' && phaseT > CAST_ANIM) {
      // little waiting dots bobbing over the water near the line
      const n = (Math.floor(clock * 2) % 4);
      const dots = '.'.repeat(n);
      drawText('WAITING' + dots, cx - textWidth('WAITING...', 1) / 2, 34, C.uiDim, 1, C.shadow);
    }
    // floating toast
    if (toastT > 0) {
      g.globalAlpha = clamp(toastT, 0, 1);
      const msg = toastText;
      drawText(msg, cx - textWidth(msg, 1) / 2, 84, '#ff8a7a', 1, C.shadow);
      g.globalAlpha = 1;
    }
  }

  function drawInstruction() {
    // short, compact instruction (matches the on-screen button action)
    drawText3('SPACE OR CLICK = CAST / REEL', 4, H - 8, C.uiDim, C.shadow);
  }

  // ------------------------------------------------------------ reveal screen
  function drawReveal(t) {
    const fr = clamp(phaseT / 0.35, 0, 1);
    const out = clamp((revealDur - phaseT) / 0.3, 0, 1);
    const a = Math.min(fr, out);
    if (!currentCatch) return;
    const { name, rarity, def } = currentCatch;
    const rc = RCOL[rarity];

    // darkening overlay
    g.globalAlpha = 0.6 * a;
    px(0, 0, W, H, '#07131c');
    g.globalAlpha = 1;

    const cx = W / 2, cy = 74;

    // tier ray treatments (more than colour: count/shape/motion differ)
    g.globalAlpha = 0.5 * a;
    if (rarity === 'Uncommon') {
      for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI * 2 / 6 + t * 0.2;
        for (let r = 12; r < 30; r++) pxl(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7, rc);
      }
    } else if (rarity === 'Rare') {
      for (let i = 0; i < 10; i++) {
        const ang = i * Math.PI * 2 / 10 - t * 0.25;
        for (let r = 10; r < 38; r++) { const w = 1 + r * 0.06; px(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7, w, 1, rc); }
      }
    } else if (rarity === 'Epic') {
      for (let i = 0; i < 14; i++) {
        const ang = i * Math.PI * 2 / 14 + t * 0.35;
        for (let r = 8; r < 42; r++) pxl(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7, r % 3 ? rc : '#e0c8ff');
      }
      g.globalAlpha = 0.3 * a;
      for (let k = 1; k <= 2; k++) {
        const rr = 18 + k * 8 + Math.sin(t * 3 + k) * 2;
        for (let ang = 0; ang < 6.28; ang += 0.2) pxl(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.7, rc);
      }
    } else if (rarity === 'Legendary') {
      for (let i = 0; i < 18; i++) {
        const ang = i * Math.PI * 2 / 18 + t * 0.5;
        for (let r = 6; r < 46; r++) { const w = r < 20 ? 2 : 1; px(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7, w, 1, r % 4 ? rc : '#fff0b0'); }
      }
      // rotating flare ring
      for (let i = 0; i < 8; i++) {
        const ang = t * 1.2 + i * Math.PI / 4;
        const rr = 26;
        px(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.7, 2, 2, '#fff4c0');
      }
    } else if (rarity === 'Ancient') {
      // cosmic swirl
      for (let i = 0; i < 90; i++) {
        const ang = i * 0.5 + t * 0.6;
        const rr = 4 + i * 0.42;
        pxl(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.62, i % 3 ? '#1f7d78' : '#ffd76a');
      }
      // rotating rune ring
      for (let i = 0; i < 16; i++) {
        const ang = i * Math.PI * 2 / 16 - t * 0.8;
        const rx2 = cx + Math.cos(ang) * 34, ry2 = cy + Math.sin(ang) * 34 * 0.68;
        px(rx2, ry2, 2, 2, i % 2 ? '#3fe0c4' : '#ffd76a');
        pxl(rx2, ry2 - 3, '#ffd76a');
        pxl(rx2 - 2, ry2, '#3fe0c4');
      }
    } else { // Common: minimal, a soft halo
      g.globalAlpha = 0.25 * a;
      ellipse(cx, cy, 26, 17, rc);
    }
    g.globalAlpha = 1;

    // fish (bobbing), drawn at 2x for a bold reveal that stays crisp
    const bob = Math.sin(t * 2.4) * 2;
    const pop = 1.6 + 0.4 * fr;   // slight grow-in
    g.save();
    g.translate(cx, cy + bob);
    g.scale(pop, pop);
    drawFish(def, 0, 0, { t, rarity, flip: false });
    g.restore();

    // sparkles per tier
    g.globalAlpha = a;
    if (rarity !== 'Common') {
      for (let i = 0; i < (rarity === 'Ancient' ? 14 : 8); i++) {
        const ang = t * 0.8 + i * 1.7;
        const rr = 20 + (i % 4) * 6;
        const sx = cx + Math.cos(ang) * rr, sy = cy + Math.sin(ang * 1.3) * rr * 0.5;
        pxl(sx, sy, i % 2 ? '#ffffff' : rc);
      }
    }
    g.globalAlpha = 1;

    // info card
    const cardW = 132, cardH = 40;
    const cx2 = W / 2 - cardW / 2, cy2 = H - cardH - 6;
    g.globalAlpha = 0.85 * a;
    px(cx2, cy2, cardW, cardH, C.uiBg);
    g.globalAlpha = a;
    px(cx2, cy2, cardW, 2, rc);
    px(cx2, cy2 + cardH - 2, cardW, 2, rc);
    px(cx2, cy2, 2, cardH, rc);
    px(cx2 + cardW - 2, cy2, 2, cardH, rc);
    const nw = textWidth(name, 1);
    drawText(name, W / 2 - nw / 2, cy2 + 8, C.cream, 1, C.shadow);
    const rwt = rarity.toUpperCase() + '  ' + ODDS[rarity] + '%';
    drawText(rwt, W / 2 - textWidth(rwt, 1) / 2, cy2 + 22, rc, 1, C.shadow);
    if (rarity === 'Ancient') {
      drawText('* ANCIENT RELIC *', W / 2 - textWidth('* ANCIENT RELIC *', 1) / 2, cy2 + 32, '#ffd76a', 1, C.shadow);
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------- main render
  function render(t) {
    g.clearRect(0, 0, W, H);
    drawWater(t);
    drawIslet(t);
    drawPads(t);
    drawLand(t);
    // land objects (deep to front)
    drawBush(84, 168, 20, 12, t);
    drawBush(230, 174, 16, 10, t);
    drawTree(30, 176, 1.0, t);
    drawTree(284, 178, 0.8, t);
    drawPalm(300, 170, t);
    drawReeds(t);
    drawDock();
    drawAngler(t);
    drawLineAndBobber(t);
    drawParticles();
    drawInstruction();
    drawCatchLog();
    drawLegend();
    drawButton();
    drawPrompt();
    if (state === 'reveal') drawReveal(t);
    if (state === 'reeling') {
      const msg = 'HOOKED!';
      drawText(msg, W / 2 - textWidth(msg, 1) / 2, 70, '#ffe14d', 1, C.shadow);
    }
  }

  function renderFinal() {
    d.imageSmoothingEnabled = false;
    d.clearRect(0, 0, disp.width, disp.height);
    // screen shake during bite/catch
    let sx = 0, sy = 0;
    if (shakeT > 0) { sx = (Math.random() - 0.5) * 4; sy = (Math.random() - 0.5) * 4; }
    d.drawImage(off, sx, sy, disp.width, disp.height);
  }

  // -------------------------------------------------------------- controls
  function logicalFromEvent(e) {
    const rect = disp.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * W;
    const y = (e.clientY - rect.top) / rect.height * H;
    return { x, y };
  }
  disp.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    const p = logicalFromEvent(e);
    const b = CAST_BTN;
    // tapping anywhere performs the action, so touch play is easy;
    // button specifically also works.
    handleAction();
  });
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  });

  // ---------------------------------------------------- test / public interface
  catchLog = [];
  window.fishing = {
    get state() { return state; },
    pickRarity: function (u) {
      if (u < 0.45) return 'Common';
      if (u < 0.70) return 'Uncommon';
      if (u < 0.85) return 'Rare';
      if (u < 0.93) return 'Epic';
      if (u < 0.98) return 'Legendary';
      return 'Ancient';
    },
    log: catchLog
  };

  // ------------------------------------------------------------------- loop
  let last = performance.now();
  let clockAcc = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;      // clamp; also protects after tab-hidden gap
    if (!document.hidden) {
      update(dt);
      clockAcc += dt;
      render(clockAcc);
      renderFinal();
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { last = performance.now(); });

  // show a short instruction toast at start
  toastText = 'PRESS SPACE OR CLICK TO CAST';
  toastT = 3.2;

  requestAnimationFrame(frame);
})();
