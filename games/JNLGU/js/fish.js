// fish.js — original fish species, rarity table, and a code-drawn fish renderer.

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

// Cumulative odds: Common 45, Uncommon 25, Rare 15, Epic 8, Legendary 5, Ancient 2.
const THRESHOLDS = [
  [0.45, 'Common'],
  [0.70, 'Uncommon'],
  [0.85, 'Rare'],
  [0.93, 'Epic'],
  [0.98, 'Legendary'],
  [1.00, 'Ancient'],
];

// Pure function. u in [0,1). No state, no pity, no rerolls.
export function pickRarity(u) {
  for (const [limit, name] of THRESHOLDS) {
    if (u < limit) return name;
  }
  return 'Ancient';
}

export const RARITY_INFO = {
  Common: { color: '#c2ccd4', deep: '#7f8b95', odds: '45%', glyph: 'circle' },
  Uncommon: { color: '#79d97b', deep: '#3f8f43', odds: '25%', glyph: 'leaf' },
  Rare: { color: '#63b0ff', deep: '#2c66b0', odds: '15%', glyph: 'spark' },
  Epic: { color: '#bd7dff', deep: '#6f37b8', odds: '8%', glyph: 'rune' },
  Legendary: { color: '#ffcb4d', deep: '#c1861a', odds: '5%', glyph: 'star' },
  Ancient: { color: '#57e6d3', deep: '#1e7d78', odds: '2%', glyph: 'eye' },
};

// --- Original species -------------------------------------------------------
// body draws facing right inside an 96x56 portrait cell.
export const FISH = {
  Common: [
    {
      name: 'Mudfin Carp', len: 62, height: 30, wagAmp: 3.0, wagSpeed: 5,
      base: '#9a7b45', belly: '#d8bd80', fin: '#7a5c2f', outline: '#4b381d',
      pattern: 'scales', barbels: true, eyeRing: '#f4e6c0',
    },
    {
      name: 'Silver Minnow', len: 50, height: 18, wagAmp: 3.6, wagSpeed: 8,
      base: '#c8d3dc', belly: '#f0f6fa', fin: '#a3b2bf', outline: '#5c6b78',
      pattern: 'none', eyeRing: '#ffffff',
    },
  ],
  Uncommon: [
    {
      name: 'Copper Bream', len: 58, height: 34, wagAmp: 2.6, wagSpeed: 5,
      base: '#c67f3d', belly: '#eec089', fin: '#8f4f1f', outline: '#5a2f10',
      pattern: 'stripes', stripe: '#8a4d1e', eyeRing: '#ffe9c8',
    },
    {
      name: 'Reed Darter', len: 54, height: 20, wagAmp: 3.4, wagSpeed: 9,
      base: '#6f9e52', belly: '#b6d18e', fin: '#47702f', outline: '#294a1c',
      pattern: 'spots', spot: '#3f6b2c', eyeRing: '#f0ffcf',
    },
  ],
  Rare: [
    {
      name: 'Moonlit Trout', len: 60, height: 24, wagAmp: 3.0, wagSpeed: 6,
      base: '#7d90da', belly: '#d6ddff', fin: '#5968b8', outline: '#2f3a74',
      pattern: 'spots', spot: '#a9b8ff', eyeRing: '#eef1ff', glow: '#9fb0ff',
    },
    {
      name: 'Coral Snapper', len: 62, height: 34, wagAmp: 2.6, wagSpeed: 5,
      base: '#e0645c', belly: '#ffb6a3', fin: '#a83434', outline: '#661d24',
      pattern: 'bands', band: '#f2917f', eyeRing: '#ffe3d8',
    },
  ],
  Epic: [
    {
      name: 'Amethyst Eel', len: 74, height: 20, wagAmp: 4.2, wagSpeed: 4,
      base: '#8252d6', belly: '#cdafff', fin: '#5a2fa0', outline: '#341566',
      pattern: 'none', eyeRing: '#f0e0ff', glow: '#b98cff', eel: true,
    },
    {
      name: 'Stormback Salmon', len: 64, height: 30, wagAmp: 2.8, wagSpeed: 7,
      base: '#4f6f9e', belly: '#c4d6ec', fin: '#31496e', outline: '#1b2c47',
      pattern: 'storm', eyeRing: '#e2edff', glow: '#8fb6ff',
    },
  ],
  Legendary: [
    {
      name: 'Gilded Leviathan', len: 74, height: 38, wagAmp: 2.4, wagSpeed: 4,
      base: '#e8b23a', belly: '#ffe9a8', fin: '#b07a12', outline: '#6b4406',
      pattern: 'scales', scale: '#ffdf85', crown: true, eyeRing: '#fff6cf',
      glow: '#ffd766',
    },
    {
      name: 'Emberfin Koi', len: 66, height: 34, wagAmp: 2.6, wagSpeed: 5,
      base: '#ec6a34', belly: '#ffd3a3', fin: '#b23c12', outline: '#6b230a',
      pattern: 'spots', spot: '#ffe08a', ember: true, eyeRing: '#fff0d6',
      glow: '#ff9a4d',
    },
  ],
  Ancient: [
    {
      name: 'Abyssal Oracle', len: 70, height: 34, wagAmp: 2.0, wagSpeed: 3,
      base: '#2f4d55', belly: '#79b8a8', fin: '#1d3339', outline: '#0e1d21',
      pattern: 'runes', rune: '#5ff0d8', eyeRing: '#bff7ec', glow: '#48e0cd',
      ancient: true,
    },
    {
      name: 'Eonfish', len: 72, height: 32, wagAmp: 2.2, wagSpeed: 4,
      base: '#3b5f6c', belly: '#8fd6cb', fin: '#24414b', outline: '#10262c',
      pattern: 'runes', rune: '#7ff0e0', lure: true, eyeRing: '#d6fff6',
      glow: '#5fe6d6', ancient: true,
    },
  ],
};

export function pickFish(rarity, rng = Math.random) {
  const list = FISH[rarity];
  return list[Math.floor(rng() * list.length) % list.length];
}

// --- Rendering --------------------------------------------------------------

function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}

function bodyPath(g, L, H) {
  g.beginPath();
  g.ellipse(0, 0, L / 2, H / 2, 0, 0, Math.PI * 2);
}

// Draw a fish centered at (cx, cy) in the supplied context.
// `t` is seconds (for tail wag / glow). `scale` multiplies the portrait.
export function drawFish(g, spec, cx, cy, t, scale = 1) {
  const L = spec.len;
  const H = spec.height;
  const wag = Math.sin(t * spec.wagSpeed) * spec.wagAmp;
  const tailLen = L * 0.28;
  const outline = spec.outline;
  const lw = Math.max(1, 1.4 * scale);

  g.save();
  g.translate(cx, cy);
  g.scale(scale, scale);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  // Soft rarity glow behind the fish.
  if (spec.glow) {
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2));
    const grad = g.createRadialGradient(0, 0, 2, 0, 0, L * 0.72);
    grad.addColorStop(0, hexA(spec.glow, 0.32 * pulse));
    grad.addColorStop(0.6, hexA(spec.glow, 0.12 * pulse));
    grad.addColorStop(1, hexA(spec.glow, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, L * 0.72, H * 1.25, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.strokeStyle = outline;
  g.lineWidth = lw;

  // ---- Tail fin ----
  g.fillStyle = spec.fin;
  poly(g, [
    [-L / 2 + 2, 0],
    [-L / 2 - tailLen, -H * 0.62 + wag],
    [-L / 2 - tailLen * 0.45, 0],
    [-L / 2 - tailLen, H * 0.62 + wag],
  ]);
  g.fill();
  g.stroke();

  // ---- Dorsal fin ----
  const dorsalPeak = H * 0.5 + (spec.crown ? 12 : 7);
  poly(g, [
    [-L * 0.28, -H * 0.34],
    [L * 0.02, -dorsalPeak],
    [L * 0.22, -H * 0.34],
  ]);
  g.fill();
  g.stroke();

  // ---- Anal (bottom) fin ----
  poly(g, [
    [-L * 0.10, H * 0.34],
    [-L * 0.22, H * 0.34 + H * 0.35],
    [L * 0.06, H * 0.34],
  ]);
  g.fill();
  g.stroke();

  // ---- Body ----
  g.fillStyle = spec.base;
  bodyPath(g, L, H);
  g.fill();

  // ---- Belly ----
  g.save();
  bodyPath(g, L, H);
  g.clip();
  g.fillStyle = spec.belly;
  g.beginPath();
  g.ellipse(L * 0.05, H * 0.34, L * 0.58, H * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // ---- Patterns (clipped to body) ----
  if (spec.pattern && spec.pattern !== 'none') {
    g.save();
    bodyPath(g, L, H);
    g.clip();
    if (spec.pattern === 'stripes' || spec.pattern === 'bands') {
      g.fillStyle = spec.stripe || spec.band || hexA(outline, 0.45);
      for (let x = -L * 0.34; x <= L * 0.34; x += L * 0.16) {
        g.save();
        g.translate(x, 0);
        g.rotate(-0.14);
        g.fillRect(-L * 0.035, -H * 0.6, L * 0.07, H * 1.2);
        g.restore();
      }
    } else if (spec.pattern === 'spots') {
      g.fillStyle = spec.spot;
      const spots = [
        [-L * 0.24, -H * 0.12, 2.6], [-L * 0.06, -H * 0.2, 2.0],
        [L * 0.10, -H * 0.06, 2.8], [-L * 0.16, H * 0.14, 2.2],
        [L * 0.04, H * 0.2, 1.8], [L * 0.22, H * 0.08, 2.0],
      ];
      for (const [sx, sy, sr] of spots) {
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
      }
    } else if (spec.pattern === 'scales') {
      g.strokeStyle = spec.scale || hexA('#ffffff', 0.28);
      g.lineWidth = 1;
      for (let x = -L * 0.34; x <= L * 0.34; x += 5) {
        for (let y = -H * 0.34; y <= H * 0.3; y += 5) {
          g.beginPath();
          g.arc(x + (Math.round(y / 5) % 2 ? 2.5 : 0), y, 2.4, Math.PI * 1.05, Math.PI * 1.95);
          g.stroke();
        }
      }
    } else if (spec.pattern === 'storm') {
      g.fillStyle = hexA('#dcebff', 0.8);
      poly(g, [
        [L * 0.02, -H * 0.42], [-L * 0.14, H * 0.02], [-L * 0.02, H * 0.02],
        [-L * 0.16, H * 0.44], [L * 0.06, H * 0.06], [-L * 0.06, H * 0.06],
      ]);
      g.fill();
      g.fillStyle = hexA(spec.glow || '#8fb6ff', 0.35);
      g.beginPath();
      g.ellipse(L * 0.12, -H * 0.05, L * 0.3, H * 0.32, 0, 0, Math.PI * 2);
      g.fill();
    } else if (spec.pattern === 'runes') {
      g.strokeStyle = spec.rune;
      g.lineWidth = 1.2;
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3);
      const runes = [[-L * 0.3, -H * 0.1], [-L * 0.12, H * 0.16], [L * 0.08, -H * 0.18], [L * 0.26, H * 0.12]];
      for (const [rx, ry] of runes) {
        g.save();
        g.translate(rx, ry);
        const r = 3.2;
        g.beginPath();
        g.moveTo(-r, -r); g.lineTo(r, -r);
        g.moveTo(0, -r); g.lineTo(0, r);
        g.moveTo(-r * 0.6, r * 0.4); g.lineTo(r * 0.6, r * 0.4);
        g.stroke();
        g.beginPath();
        g.arc(0, 0, r + 2, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
      g.globalAlpha = 1;
    }
    g.restore();
  }

  // ---- Body outline ----
  g.strokeStyle = outline;
  g.lineWidth = lw;
  bodyPath(g, L, H);
  g.stroke();

  // ---- Pectoral fin (on body) ----
  g.fillStyle = hexA(spec.fin, 0.95);
  poly(g, [
    [L * 0.16, H * 0.08],
    [L * 0.02, H * 0.44],
    [L * 0.28, H * 0.28],
  ]);
  g.fill();
  g.stroke();

  // ---- Gill line ----
  g.beginPath();
  g.arc(L * 0.18, 0, H * 0.42, Math.PI * 0.72, Math.PI * 1.28);
  g.stroke();

  // ---- Eye ----
  const ex = L * 0.32;
  const ey = -H * 0.12;
  const er = Math.max(2.2, H * 0.1);
  g.fillStyle = spec.eyeRing || '#ffffff';
  g.beginPath();
  g.arc(ex, ey, er, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = outline;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#14181f';
  g.beginPath();
  g.arc(ex + 0.6, ey, er * 0.55, 0, Math.PI * 2);
  g.fill();
  if (spec.glow && (spec.ancient || spec.lure)) {
    g.strokeStyle = spec.glow;
    g.lineWidth = 1;
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4);
    g.beginPath();
    g.arc(ex, ey, er + 2, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }

  // ---- Mouth ----
  g.beginPath();
  g.moveTo(L * 0.48, H * 0.06);
  g.quadraticCurveTo(L * 0.42, H * 0.2, L * 0.3, H * 0.2);
  g.strokeStyle = outline;
  g.lineWidth = 1;
  g.stroke();

  // ---- Species extras ----
  if (spec.barbels) {
    g.strokeStyle = outline;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(L * 0.4, H * 0.22);
    g.quadraticCurveTo(L * 0.36, H * 0.62, L * 0.26, H * 0.7);
    g.stroke();
    g.beginPath();
    g.moveTo(L * 0.46, H * 0.18);
    g.quadraticCurveTo(L * 0.5, H * 0.55, L * 0.42, H * 0.66);
    g.stroke();
  }
  if (spec.crown) {
    g.fillStyle = '#ffe28a';
    g.strokeStyle = '#8a5f08';
    g.lineWidth = 1;
    poly(g, [
      [-8, -H * 0.5], [-4, -H * 0.5 - 8], [0, -H * 0.5 - 3],
      [4, -H * 0.5 - 10], [8, -H * 0.5],
    ]);
    g.fill();
    g.stroke();
    g.fillStyle = '#7fe6ff';
    g.beginPath();
    g.arc(0, -H * 0.5 - 1, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  if (spec.lure) {
    const lx = L * 0.5 + 4;
    const ly = -H * 0.62 - 8;
    g.strokeStyle = outline;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(L * 0.34, -H * 0.5);
    g.quadraticCurveTo(lx, ly, lx + 1, ly + 0.5);
    g.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const lg = g.createRadialGradient(lx + 1, ly, 0, lx + 1, ly, 8);
    lg.addColorStop(0, hexA(spec.glow, 0.95));
    lg.addColorStop(1, hexA(spec.glow, 0));
    g.fillStyle = lg;
    g.beginPath();
    g.arc(lx + 1, ly, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#eafffb';
    g.beginPath();
    g.arc(lx + 1, ly, 2.2, 0, Math.PI * 2);
    g.fill();
  }
  if (spec.ember) {
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * 1.7;
      const px = Math.cos(a) * (L * 0.4);
      const py = -H * 0.5 - 4 - ((t * 10 + i * 7) % 16);
      g.fillStyle = hexA(i % 2 ? '#ffd27a' : '#ff8a3c', 0.85);
      g.fillRect(px, py, 2, 2);
    }
  }

  g.restore();
}

function hexA(hex, a) {
  if (!hex) return `rgba(255,255,255,${a})`;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const gg = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${gg},${b},${a})`;
}

export { hexA };
