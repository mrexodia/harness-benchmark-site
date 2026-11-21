/* =========================================================================
   fish.js  —  original pixel-art fish, drawn entirely in code.
   Each species is rasterised into a small offscreen canvas at native
   pixel resolution (via integer fillRects), then an outline + shading
   pass is applied so the result reads as deliberate pixel art.
   No images, fonts, emoji or external assets are used.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ----------------------------- pixel helpers ----------------------------- */
  function R(c, x, y, w, h) { c.fillRect(x | 0, y | 0, Math.max(1, w | 0), h | 0); }

  // integer rasterised ellipse
  function ellipse(c, cx, cy, rx, ry, col) {
    if (rx <= 0 || ry <= 0) return;
    c.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const x = Math.floor(rx * Math.sqrt(t));
      R(c, cx - x, cy + y, x * 2 + 1, 1);
    }
  }

  // scanline polygon fill
  function poly(c, pts, col) {
    c.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
        R(c, x0, y, x1 - x0 + 1, 1);
      }
    }
  }

  /* ------------------------- body profile functions ------------------------ */
  // t = 0 at tail, 1 at head
  const PROFILES = {
    torpedo: (t) => Math.pow(Math.sin(Math.PI * t), 0.62) * (1 - 0.12 * (1 - t)),
    slender: (t) => Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - 0.15 * (1 - t)),
    round:   (t) => Math.pow(Math.sin(Math.PI * t), 0.34),
    flat:    (t) => Math.pow(Math.sin(Math.PI * t), 0.40) * (1 + 0.25 * Math.sin(t * Math.PI)),
    balloon: (t) => Math.pow(Math.sin(Math.PI * t), 0.24),
    ribbon:  (t) => Math.pow(Math.sin(Math.PI * t), 0.9) * (0.55 + 0.45 * t),
    long:    (t) => Math.pow(Math.sin(Math.PI * t), 0.7) * (1 - 0.06 * (1 - t))
  };

  /* ------------------------------ species data ----------------------------- */
  // All names, shapes and colours are original creations.
  const SPECIES = [
    { key: 'mudwhisker', name: 'Mudwhisker', rarity: 'Common',
      body: '#7d6a45', back: '#5e4e31', belly: '#c6b184', fin: '#8a764e', finDark: '#5e4e31',
      ink: '#2a2417', accent: '#a8916a', profile: 'long', len: 34, half: 8, arch: 1.2,
      tail: 'fork', tailLen: 11, tailSpread: 8, dorsal: 3, pectoral: 1, whiskers: true,
      pattern: 'mottle', eye: '#f2ead2', pupil: '#241f12', mouth: true },

    { key: 'copperfin', name: 'Copperfin', rarity: 'Common',
      body: '#c77f38', back: '#9c5c25', belly: '#f0cf94', fin: '#d99a4e', finDark: '#9c5c25',
      ink: '#2e1c0d', accent: '#f0b968', profile: 'round', len: 24, half: 11, arch: 0,
      tail: 'fan', tailLen: 9, tailSpread: 10, dorsal: 4, pectoral: 1, whiskers: false,
      pattern: 'spots', eye: '#fbf3dd', pupil: '#241407', mouth: true },

    { key: 'rivershine', name: 'Rivershine', rarity: 'Uncommon',
      body: '#4f8fc4', back: '#356a9c', belly: '#cfe6f2', fin: '#6fa9d4', finDark: '#356a9c',
      ink: '#152a3d', accent: '#a9d8f0', profile: 'torpedo', len: 31, half: 8, arch: 0.8,
      tail: 'fork', tailLen: 12, tailSpread: 9, dorsal: 4, pectoral: 1, whiskers: false,
      pattern: 'stripe', eye: '#f2f8ff', pupil: '#0e1d2c', mouth: true },

    { key: 'reedscale', name: 'Reedscale', rarity: 'Uncommon',
      body: '#5f9d4a', back: '#417434', belly: '#d3e3a8', fin: '#7cb85e', finDark: '#417434',
      ink: '#1b2c14', accent: '#c7e08a', profile: 'flat', len: 27, half: 11, arch: 0.4,
      tail: 'fan', tailLen: 9, tailSpread: 12, dorsal: 6, pectoral: 1, whiskers: false,
      pattern: 'speckle', eye: '#f7fbe6', pupil: '#16220f', mouth: true },

    { key: 'moonbelly', name: 'Moonbelly', rarity: 'Rare',
      body: '#cdd6e6', back: '#9aa6c2', belly: '#f6f9ff', fin: '#dbe4f2', finDark: '#9aa6c2',
      ink: '#2b3350', accent: '#fff7d6', profile: 'balloon', len: 26, half: 12, arch: 0.2,
      tail: 'fan', tailLen: 8, tailSpread: 12, dorsal: 4, pectoral: 2, whiskers: false,
      pattern: 'crescent', eye: '#ffffff', pupil: '#2b3350', glow: '#cfe0ff', mouth: false },

    { key: 'emberfin', name: 'Emberfin', rarity: 'Rare',
      body: '#c8452e', back: '#94301f', belly: '#f5b46a', fin: '#e06a3a', finDark: '#94301f',
      ink: '#33100a', accent: '#ffcf6a', profile: 'torpedo', len: 30, half: 9, arch: 0.9,
      tail: 'fan', tailLen: 11, tailSpread: 10, dorsal: 5, pectoral: 1, whiskers: false,
      pattern: 'embers', eye: '#ffe9c2', pupil: '#33100a', glow: '#ff8a4a', mouth: true },

    { key: 'prismscale', name: 'Prismscale', rarity: 'Epic',
      body: '#8a6ad4', back: '#5f47a0', belly: '#e6d8ff', fin: '#b49aec', finDark: '#5f47a0',
      ink: '#241747', accent: '#7ff0e0', profile: 'torpedo', len: 32, half: 9, arch: 1.0,
      tail: 'ribbon', tailLen: 16, tailSpread: 5, dorsal: 6, pectoral: 1, whiskers: false,
      pattern: 'prism', eye: '#fdfff5', pupil: '#241747', glow: '#7ff0e0', mouth: true },

    { key: 'stormjaw', name: 'Stormjaw', rarity: 'Epic',
      body: '#3a4a6e', back: '#25304a', belly: '#8fa2c4', fin: '#55669a', finDark: '#25304a',
      ink: '#0d1220', accent: '#ffe27a', profile: 'flat', len: 32, half: 10, arch: 0.6,
      tail: 'fork', tailLen: 15, tailSpread: 9, dorsal: 7, pectoral: 2, whiskers: true,
      pattern: 'bolt', eye: '#e8f2ff', pupil: '#0d1220', glow: '#8fb4ff', mouth: true, jaw: true },

    { key: 'aurorafin', name: 'Aurorafin', rarity: 'Legendary',
      body: '#3fbfa0', back: '#2a8f8f', belly: '#d9f7e0', fin: '#7fe0b8', finDark: '#2a8f8f',
      ink: '#12303a', accent: '#ffe98a', profile: 'torpedo', len: 34, half: 9, arch: 1.2,
      tail: 'ribbon', tailLen: 20, tailSpread: 7, dorsal: 8, pectoral: 2, whiskers: false,
      pattern: 'aurora', eye: '#ffffff', pupil: '#12303a', glow: '#8affd8', mouth: true },

    { key: 'sunspine', name: 'Sunspine', rarity: 'Legendary',
      body: '#e8a72c', back: '#c07d14', belly: '#ffe9a8', fin: '#ffca4d', finDark: '#c07d14',
      ink: '#3a2406', accent: '#fff3b0', profile: 'flat', len: 30, half: 10, arch: 0.4,
      tail: 'fan', tailLen: 11, tailSpread: 12, dorsal: 9, pectoral: 2, whiskers: false,
      pattern: 'rays', eye: '#fffdf0', pupil: '#3a2406', glow: '#ffd766', mouth: true, spiny: true },

    { key: 'eldertide', name: 'Eldertide', rarity: 'Ancient',
      body: '#2f6f6a', back: '#1d4a4a', belly: '#9fd8c8', fin: '#4fa89a', finDark: '#1d4a4a',
      ink: '#08201f', accent: '#f2d27a', profile: 'ribbon', len: 36, half: 9, arch: 1.1,
      tail: 'ribbon', tailLen: 22, tailSpread: 8, dorsal: 9, pectoral: 2, whiskers: true,
      pattern: 'runes', eye: '#fdf6d8', pupil: '#08201f', glow: '#7ff0d8', mouth: true },

    { key: 'voidkoi', name: 'Voidkoi', rarity: 'Ancient',
      body: '#2a2b52', back: '#191a38', belly: '#8f7fd0', fin: '#5b4fa0', finDark: '#191a38',
      ink: '#05050f', accent: '#e8e0ff', profile: 'balloon', len: 30, half: 12, arch: 0.2,
      tail: 'ribbon', tailLen: 20, tailSpread: 9, dorsal: 6, pectoral: 2, whiskers: true,
      pattern: 'stars', eye: '#ffffff', pupil: '#05050f', glow: '#b9a6ff', mouth: true }
  ];

  /* ------------------------------ renderer -------------------------------- */
  // Draws the raw (un-outlined) silhouette for a species.
  function drawRaw(c, s, W, H, cx, cy) {
    const L = s.len, hh = s.half;
    const xTail = Math.round(cx - L / 2);
    const xHead = Math.round(cx + L / 2);
    const prof = PROFILES[s.profile] || PROFILES.torpedo;
    const bellyY = Math.round(hh * 0.30);
    const backY = Math.round(-hh * 0.42);

    // ---- caudal (tail) fin ----
    c.fillStyle = s.fin;
    if (s.tail === 'fork') {
      poly(c, [[xTail + 5, cy - 2], [xTail - s.tailLen, cy - s.tailSpread],
        [xTail - 1, cy], [xTail - s.tailLen, cy + s.tailSpread], [xTail + 5, cy + 2]], s.fin);
      c.fillStyle = s.finDark;
      poly(c, [[xTail + 3, cy - 1], [xTail - s.tailLen + 2, cy - s.tailSpread + 2], [xTail - 2, cy]], s.finDark);
    } else if (s.tail === 'ribbon') {
      poly(c, [[xTail + 5, cy - 2], [xTail - s.tailLen, cy - s.tailSpread],
        [xTail - s.tailLen + 3, cy], [xTail - s.tailLen, cy + s.tailSpread], [xTail + 5, cy + 2]], s.fin);
      c.fillStyle = s.finDark;
      poly(c, [[xTail + 3, cy - 1], [xTail - s.tailLen + 4, cy - s.tailSpread + 2], [xTail - 1, cy]], s.finDark);
    } else {
      poly(c, [[xTail + 5, cy - 3], [xTail - s.tailLen, cy - s.tailSpread],
        [xTail - s.tailLen + 2, cy], [xTail - s.tailLen, cy + s.tailSpread], [xTail + 5, cy + 3]], s.fin);
      c.fillStyle = s.finDark;
      poly(c, [[xTail + 3, cy - 2], [xTail - s.tailLen + 4, cy - s.tailSpread + 3], [xTail - 2, cy]], s.finDark);
    }

    // ---- dorsal fin ----
    if (s.dorsal > 0) {
      const dx0 = Math.round(cx - L * 0.16), dx1 = Math.round(cx + L * 0.12);
      const peak = Math.max(3, s.dorsal + 2);
      c.fillStyle = s.fin;
      poly(c, [[dx0, cy + backY], [Math.round(cx - L * 0.02), cy + backY - peak], [dx1, cy + backY]], s.fin);
      c.fillStyle = s.finDark;
      poly(c, [[dx0 + 2, cy + backY], [Math.round(cx - L * 0.02), cy + backY - peak + 2], [Math.round(cx + L * 0.04), cy + backY]], s.finDark);
      if (s.spiny) {
        c.fillStyle = s.ink;
        for (let i = 0; i < 5; i++) {
          const x = dx0 + Math.round((dx1 - dx0) * (0.12 + i * 0.19));
          R(c, x, cy + backY - peak - 2, 1, 3);
        }
      }
    }

    // ---- anal fin ----
    c.fillStyle = s.fin;
    poly(c, [[Math.round(cx - L * 0.10), cy + hh * 0.72], [Math.round(cx + L * 0.02), cy + hh + Math.max(2, s.dorsal - 1)], [Math.round(cx + L * 0.10), cy + hh * 0.72]], s.fin);

    // ---- body ----
    for (let x = xTail; x <= xHead; x++) {
      const t = (x - xTail) / (xHead - xTail || 1);
      let p = prof(t);
      if (p <= 0.02) continue;
      const h = hh * p;
      const cl = Math.round(-s.arch * Math.sin(Math.PI * Math.max(0, Math.min(1, t)))) + cy;
      const y0 = Math.round(cl - h), y1 = Math.round(cl + h);
      for (let y = y0; y <= y1; y++) {
        let col = s.body;
        if (y < cl + backY) col = s.back;
        else if (y > cl + bellyY) col = s.belly;
        c.fillStyle = col;
        R(c, x, y, 1, 1);
      }
    }

    // ---- pectoral fin (front) ----
    if (s.pectoral) {
      c.fillStyle = s.fin;
      const px = Math.round(cx + L * 0.12), py = Math.round(cy + hh * 0.25);
      poly(c, [[px, py], [px - 5, py + 5 + s.pectoral], [px + 1, py + 2]], s.fin);
    }
  }

  function drawDetails(c, s, W, H, cx, cy) {
    const L = s.len, hh = s.half;
    const xTail = Math.round(cx - L / 2), xHead = Math.round(cx + L / 2);

    // pattern
    c.fillStyle = s.accent;
    if (s.pattern === 'spots') {
      const spots = [[-0.18, -0.35], [0.02, 0.05], [0.18, -0.30], [-0.30, 0.20], [0.30, 0.10], [-0.05, -0.55]];
      for (const [fx, fy] of spots) ellipse(c, Math.round(cx + fx * L), Math.round(cy + fy * hh), 2, 2, s.accent);
    } else if (s.pattern === 'speckle') {
      for (let i = 0; i < 26; i++) {
        const fx = ((i * 37) % 100) / 100 - 0.5;
        const fy = ((i * 61) % 100) / 100 - 0.5;
        if (Math.abs(fy) < 0.34) continue;
        R(c, Math.round(cx + fx * L), Math.round(cy + fy * hh), 1, 1);
      }
    } else if (s.pattern === 'stripe') {
      for (let i = -3; i <= 3; i++) {
        const x = Math.round(cx + i * 4);
        R(c, x, Math.round(cy - hh * 0.55), 1, Math.round(hh * 1.0));
      }
    } else if (s.pattern === 'mottle') {
      for (let i = 0; i < 14; i++) {
        const fx = ((i * 53) % 100) / 100 - 0.5;
        const fy = ((i * 29) % 100) / 100 - 0.5;
        R(c, Math.round(cx + fx * L), Math.round(cy + fy * hh), 2, 1);
      }
    } else if (s.pattern === 'crescent') {
      ellipse(c, cx + 3, cy - 1, 5, 5, s.accent);
      ellipse(c, cx + 5, cy - 1, 4, 4, s.body);
    } else if (s.pattern === 'embers') {
      for (let i = 0; i < 8; i++) {
        const fx = ((i * 41) % 100) / 100 - 0.5;
        const fy = ((i * 67) % 100) / 100 - 0.5;
        R(c, Math.round(cx + fx * L), Math.round(cy + fy * hh), 1, 1);
      }
    } else if (s.pattern === 'prism') {
      const bands = ['#ff6d6d', '#ffd76d', '#7dff9a', '#6de0ff', '#9a8aff'];
      for (let i = 0; i < 5; i++) {
        R(c, Math.round(cx - L * 0.3 + i * 4), Math.round(cy - hh * 0.5), 2, Math.round(hh));
      }
    } else if (s.pattern === 'bolt') {
      const bx = Math.round(cx - L * 0.02);
      R(c, bx - 1, cy - 4, 2, 3); R(c, bx - 2, cy - 1, 2, 3); R(c, bx - 3, cy + 2, 2, 3);
    } else if (s.pattern === 'aurora') {
      R(c, Math.round(cx - L * 0.30), Math.round(cy - hh * 0.55), Math.round(L * 0.55), 2);
    } else if (s.pattern === 'rays') {
      for (let i = 0; i < 5; i++) {
        R(c, Math.round(cx - L * 0.28 + i * 4), Math.round(cy - hh * 0.45), 1, Math.round(hh * 0.75));
      }
    } else if (s.pattern === 'runes') {
      for (let i = 0; i < 4; i++) {
        const x = Math.round(cx - L * 0.28 + i * 6), y = Math.round(cy - 1);
        R(c, x, y - 2, 1, 5); R(c, x + 1, y - 2, 2, 1); R(c, x + 1, y + 2, 2, 1);
      }
    } else if (s.pattern === 'stars') {
      for (let i = 0; i < 10; i++) {
        const fx = ((i * 47) % 100) / 100 - 0.5;
        const fy = ((i * 83) % 100) / 100 - 0.5;
        R(c, Math.round(cx + fx * L), Math.round(cy + fy * hh), 1, 1);
      }
      R(c, Math.round(cx - L * 0.1), Math.round(cy - 2), 1, 1);
      R(c, Math.round(cx + L * 0.15), Math.round(cy + 3), 1, 1);
    }

    // gill line
    c.fillStyle = s.finDark;
    const gx = Math.round(cx + L * 0.28);
    for (let y = -Math.round(hh * 0.5); y <= Math.round(hh * 0.5); y++) {
      if ((y + 100) % 2 === 0) R(c, gx, cy + y, 1, 1);
    }

    // whiskers
    if (s.whiskers) {
      c.fillStyle = s.ink;
      const mx = Math.round(cx + L * 0.46), my = cy + Math.round(hh * 0.35);
      R(c, mx, my, 3, 1); R(c, mx + 3, my + 1, 3, 1); R(c, mx + 5, my + 3, 1, 2);
      R(c, mx - 1, my + 2, 3, 1); R(c, mx + 1, my + 3, 3, 1);
    }

    // mouth / jaw
    if (s.mouth) {
      c.fillStyle = s.ink;
      const mx = Math.round(cx + L * 0.5) - 1, my = cy + Math.round(hh * (s.jaw ? 0.5 : 0.28));
      R(c, mx - 2, my, 3, 1);
      if (s.jaw) R(c, mx - 6, my + 1, 7, 1);
    }

    // eye
    const ex = Math.round(cx + L * 0.34), ey = Math.round(cy - hh * 0.25);
    ellipse(c, ex, ey, 3, 3, s.eye);
    ellipse(c, ex + 1, ey, 2, 2, s.pupil);
    R(c, ex, ey - 1, 1, 1);
  }

  // Adds 1px ink outline + top-highlight / bottom-shadow volume pass.
  function outlineAndShade(c, W, H, ink, shade, light) {
    const img = c.getImageData(0, 0, W, H);
    const d = img.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 16;
    const out = new Uint8ClampedArray(d);
    const inkc = hexToRgb(ink), shc = hexToRgb(shade || ink), lic = hexToRgb(light);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (!op(x, y)) {
          if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) {
            out[i] = inkc[0]; out[i + 1] = inkc[1]; out[i + 2] = inkc[2]; out[i + 3] = 255;
          }
        } else {
          if (!op(x, y + 1)) { out[i] = shc[0]; out[i + 1] = shc[1]; out[i + 2] = shc[2]; }
          else if (!op(x, y - 1) && lic) { out[i] = lic[0]; out[i + 1] = lic[1]; out[i + 2] = lic[2]; }
        }
      }
    }
    img.data.set(out);
    c.putImageData(img, 0, 0);
  }

  function hexToRgb(h) {
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixHex(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  }

  const cache = {};
  function getSprite(key) {
    if (cache[key]) return cache[key];
    const s = SPECIES.find((f) => f.key === key);
    const pad = 6;
    const W = s.len + s.tailLen + pad * 2 + 14;
    const H = s.half * 2 + s.dorsal + 20;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    const cx = pad + s.tailLen + Math.round(s.len / 2);
    const cy = Math.round(H / 2);
    drawRaw(c, s, W, H, cx, cy);
    drawDetails(c, s, W, H, cx, cy);
    outlineAndShade(c, W, H, s.ink, mixHex(s.body, '#000000', 0.35), mixHex(s.body, '#ffffff', 0.35));
    cache[key] = { canvas: cv, spec: s, cx, cy };
    return cache[key];
  }

  function speciesForRarity(rarity) {
    const list = SPECIES.filter((s) => s.rarity === rarity);
    return list.length ? list : SPECIES;
  }

  global.FishArt = {
    SPECIES, getSprite, speciesForRarity,
    hexToRgb, mixHex, ellipse, poly, R
  };
})(window);
