// Original fish species + the exact rarity table.
import { painter, createCanvas, addOutline } from './pixels.js';

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

// Exact, fixed odds. No pity, no rerolls, no history.
export function pickRarity(u) {
  if (u < 0.45) return 'Common';
  if (u < 0.70) return 'Uncommon';
  if (u < 0.85) return 'Rare';
  if (u < 0.93) return 'Epic';
  if (u < 0.98) return 'Legendary';
  return 'Ancient';
}

export const ODDS = [
  ['Common', 45], ['Uncommon', 25], ['Rare', 15],
  ['Epic', 8], ['Legendary', 5], ['Ancient', 2],
];

// ---------------------------------------------------------------------------
// small drawing helpers
// ---------------------------------------------------------------------------
function eye(p, x, y, r = 2, iris = '#20161a') {
  p.circle(x, y, r + 1, '#f7ecd6');
  p.circle(x, y, r, iris);
  p.px(x - 1, y - 1, '#ffffff');
  p.px(x, y - 1, '#ffffff');
}

function finRay(p, x, y, len, ang, col) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let i = 0; i < len; i++) p.px(x + dx * i, y + dy * i, col);
}

// generic body: draws a rounded fish body onto painter p
function body(p, cx, cy, rx, ry, top, bottom) {
  p.ellipse(cx, cy, rx, ry, top);
  // lower belly shading
  for (let y = 0; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    const xr = Math.floor(rx * Math.sqrt(Math.max(0, t)));
    if (y > ry * 0.25) p.rect(cx - xr, cy + y, 2 * xr + 1, 1, bottom);
  }
  // top highlight
  for (let y = -ry; y <= -ry * 0.4; y++) {
    const t = 1 - (y * y) / (ry * ry);
    const xr = Math.floor(rx * Math.sqrt(Math.max(0, t)));
    p.rect(cx - xr + 1, cy + y, Math.max(1, 2 * xr - 1), 1, top);
  }
}

// ---------------------------------------------------------------------------
// species renderers. Each returns a canvas (with outline applied).
// All fish face RIGHT (head on the right side).
// ---------------------------------------------------------------------------
const SPECS = {
  // ---------------- COMMON ----------------
  'Sunny Perch': {
    w: 26, h: 16, draw(p, cvt) {
      const cx = 13, cy = 8;
      // tail
      p.ellipse(3, cy, 3, 4, '#c9a24a');
      p.ellipse(2, cy, 2, 3, '#e0bb5c');
      // body
      body(p, cx, cy, 9, 6, '#d8c05a', '#a98c38');
      // stripes
      cvt.clip(() => {
        for (let i = -1; i <= 1; i++) {
          p.rect(cx + i * 4 - 1, cy - 5, 2, 11, '#8a6f2e');
        }
      });
      // dorsal fin
      p.ellipse(cx - 1, cy - 8, 4, 3, '#d9614b');
      // pectoral
      p.ellipse(cx + 2, cy + 3, 3, 2, '#e0816a');
      // belly
      p.ellipse(cx, cy + 4, 7, 2, '#f0e2a8');
      // face
      eye(p, cx + 6, cy - 1, 2);
      p.rect(cx + 8, cy + 1, 2, 1, '#6b5220');
      p.px(cx + 9, cy + 2, '#f5d98a');
    },
  },
  'Dusty Minnow': {
    w: 20, h: 12, draw(p, cvt) {
      const cx = 10, cy = 6;
      p.ellipse(2, cy, 2, 3, '#b8a583');
      body(p, cx, cy, 6, 4, '#d8cdb4', '#a99c82');
      cvt.clip(() => { p.rect(cx - 3, cy - 4, 1, 8, '#8d8064'); });
      p.ellipse(cx - 1, cy - 5, 2, 2, '#c2b79e');
      eye(p, cx + 3, cy - 1, 1);
      p.px(cx + 5, cy + 1, '#6a5f4a');
    },
  },

  // ---------------- UNCOMMON ----------------
  'Copper Bream': {
    w: 26, h: 20, draw(p, cvt) {
      const cx = 13, cy = 10;
      // forked tail
      p.ellipse(3, cy - 3, 3, 3, '#8a5a2e');
      p.ellipse(3, cy + 3, 3, 3, '#8a5a2e');
      p.ellipse(4, cy, 3, 2, '#a8753c');
      // deep body
      body(p, cx, cy, 8, 8, '#c98a4a', '#8f5a2a');
      cvt.clip(() => {
        for (let i = -1; i <= 1; i++) p.rect(cx + i * 4, cy - 8, 1, 16, '#a86a30');
      });
      // spiny dorsal
      for (let i = 0; i < 7; i++) {
        p.rect(cx - 4 + i, cy - 11 + Math.abs(3 - i), 1, 4, '#e0a85c');
      }
      p.ellipse(cx + 1, cy + 5, 4, 3, '#e6b46a');
      eye(p, cx + 5, cy - 1, 3, '#2a1a12');
      p.rect(cx + 7, cy + 2, 2, 1, '#5c3a18');
    },
  },
  'Reedfin Dace': {
    w: 22, h: 12, draw(p, cvt) {
      const cx = 11, cy = 6;
      p.ellipse(2, cy, 3, 3, '#6f9a4a');
      body(p, cx, cy, 7, 3, '#9fd06a', '#5f8a3e');
      cvt.clip(() => { p.rect(cx - 4, cy - 3, 2, 6, '#3f5c6e'); p.rect(cx + 3, cy - 3, 1, 6, '#3f5c6e'); });
      p.ellipse(cx - 1, cy - 4, 3, 2, '#c2e08a');
      eye(p, cx + 4, cy - 1, 1);
      p.px(cx + 6, cy + 1, '#3f5c2e');
    },
  },

  // ---------------- RARE ----------------
  'Moonlit Trout': {
    w: 28, h: 14, draw(p, cvt) {
      const cx = 14, cy = 7;
      p.ellipse(3, cy, 3, 4, '#4f7fae');
      p.ellipse(2, cy, 2, 3, '#7fb0d8');
      body(p, cx, cy, 10, 5, '#8fb8d8', '#4f7099');
      cvt.clip(() => {
        const spots = [[-4, -2], [-1, 1], [2, -2], [5, 1], [-6, 2], [3, 3], [0, -3]];
        for (const [sx, sy] of spots) { p.px(cx + sx, cy + sy, '#ff9ec4'); p.px(cx + sx + 1, cy + sy, '#ffd0e0'); }
      });
      p.ellipse(cx - 2, cy - 7, 4, 3, '#6fb0e0');
      p.ellipse(cx + 3, cy + 3, 3, 2, '#cfe6f5');
      // pink flank stripe
      p.rect(cx - 8, cy + 1, 15, 1, '#e08aae');
      eye(p, cx + 7, cy - 1, 2);
      p.rect(cx + 9, cy + 1, 1, 1, '#24506f');
    },
  },
  'Coral Darter': {
    w: 20, h: 12, draw(p, cvt) {
      const cx = 10, cy = 6;
      // vivid fan tail
      p.ellipse(2, cy, 2, 4, '#2f6fb0');
      body(p, cx, cy, 6, 4, '#ff7a3c', '#d84a1e');
      cvt.clip(() => {
        p.rect(cx - 2, cy - 4, 2, 8, '#2f9fd8');
        p.rect(cx + 2, cy - 4, 1, 8, '#2f9fd8');
      });
      p.ellipse(cx - 1, cy - 5, 3, 2, '#ffd06a');
      p.ellipse(cx + 2, cy + 3, 3, 2, '#ffb07a');
      eye(p, cx + 4, cy - 1, 1);
      p.px(cx + 5, cy + 1, '#7a2a10');
    },
  },

  // ---------------- EPIC ----------------
  'Stormgill Bass': {
    w: 30, h: 18, draw(p, cvt) {
      const cx = 15, cy = 9;
      // broad tail
      p.ellipse(3, cy - 2, 3, 4, '#3a2a5a');
      p.ellipse(3, cy + 2, 3, 4, '#3a2a5a');
      p.ellipse(4, cy, 3, 3, '#55407a');
      body(p, cx, cy, 9, 7, '#7a5ab0', '#3f2a66');
      cvt.clip(() => {
        for (let i = -1; i <= 2; i++) p.rect(cx + i * 4, cy - 8, 2, 16, '#5a3f8a');
        p.rect(cx - 8, cy + 1, 17, 1, '#b083ea');
      });
      // spiky dorsal
      for (let i = 0; i < 8; i++) {
        const hh = 4 + (i % 3);
        p.rect(cx - 5 + i, cy - 8 - hh, 1, hh, '#c9a8ff');
        p.px(cx - 5 + i, cy - 8 - hh, '#efdcff');
      }
      p.ellipse(cx + 2, cy + 5, 4, 3, '#9a7ad0');
      eye(p, cx + 6, cy - 2, 3, '#1a0e2a');
      // big jaw
      p.rect(cx + 7, cy + 3, 3, 1, '#2a1a44');
      p.line(cx + 10, cy + 2, cx + 12, cy + 4, '#2a1a44');
    },
  },
  'Amber Pike': {
    w: 32, h: 13, draw(p, cvt) {
      const cx = 15, cy = 7;
      p.ellipse(3, cy, 3, 4, '#7a8a3a');
      p.ellipse(2, cy, 2, 3, '#a8b84a');
      body(p, cx, cy, 10, 4, '#b8a83a', '#7a6a24');
      cvt.clip(() => {
        for (let i = -2; i <= 3; i++) p.rect(cx + i * 3, cy - 4, 2, 8, '#8a9a30');
      });
      // long snout
      p.ellipse(cx + 10, cy, 3, 3, '#c9b84a');
      p.rect(cx + 11, cy, 3, 2, '#c9b84a');
      // teeth
      for (let i = 0; i < 4; i++) p.px(cx + 9 + i, cy + 2, '#fff6d0');
      p.ellipse(cx - 3, cy - 6, 4, 3, '#d8c85a');
      eye(p, cx + 8, cy - 1, 2, '#2a2010');
    },
  },

  // ---------------- LEGENDARY ----------------
  'Golden Koi': {
    w: 30, h: 20, draw(p, cvt) {
      const cx = 15, cy = 9;
      // flowing tail
      for (let i = 0; i < 5; i++) {
        p.rect(2 + i, cy - 4 + i, 2, 1, '#f0c040');
        p.rect(2 + i, cy + 4 - i, 2, 1, '#f0c040');
      }
      p.ellipse(3, cy, 3, 4, '#f5c542');
      body(p, cx, cy, 9, 6, '#fff0a0', '#e0a828');
      cvt.clip(() => {
        p.ellipse(cx - 2, cy - 2, 4, 3, '#e8602a');
        p.ellipse(cx + 3, cy + 2, 3, 2, '#e8602a');
        p.rect(cx + 5, cy - 4, 2, 3, '#e8602a');
      });
      // long barbels
      p.line(cx + 8, cy + 2, cx + 12, cy + 4, '#fff0a0');
      p.line(cx + 8, cy + 2, cx + 12, cy, '#fff0a0');
      p.px(cx + 12, cy + 4, '#f5c542'); p.px(cx + 12, cy, '#f5c542');
      // big fins
      p.ellipse(cx - 1, cy - 8, 4, 3, '#ffd95e');
      p.ellipse(cx + 2, cy + 4, 4, 3, '#ffd95e');
      eye(p, cx + 6, cy - 1, 2, '#2a1a08');
      p.rect(cx + 8, cy + 1, 1, 1, '#b06a10');
    },
  },
  'Prism Ray': {
    w: 30, h: 20, draw(p, cvt) {
      const cx = 13, cy = 9;
      // diamond body via triangle-ish shapes
      for (let i = 0; i < 9; i++) {
        const half = i;
        p.rect(cx - half, cy - 5 + i, half * 2 + 1, 1, i < 4 ? '#8fd0ea' : '#6fb4ea');
      }
      cvt.clip(() => {
        for (let i = 0; i < 9; i++) {
          const half = i;
          p.rect(cx - half, cy - 5 + i, half * 2 + 1, 1, i % 2 ? '#b06fe0' : '#6fe0d0');
        }
      });
      // wings
      p.ellipse(cx - 1, cy - 6, 4, 2, '#8fd0ea');
      p.ellipse(cx - 1, cy + 6, 4, 2, '#8fd0ea');
      // long thin tail
      for (let i = 0; i < 10; i++) p.px(cx - 9 - i * 0.5, cy + 1 + i * 0.1, '#3f8fae');
      // eyes on top + grin
      eye(p, cx + 3, cy - 2, 1, '#20161a');
      eye(p, cx + 3, cy + 2, 1, '#20161a');
      p.rect(cx - 2, cy, 4, 1, '#2a2030');
    },
  },

  // ---------------- ANCIENT ----------------
  'Eldertide Coelacanth': {
    w: 32, h: 18, draw(p, cvt) {
      const cx = 15, cy = 9;
      // thick lobed tail
      p.ellipse(4, cy, 3, 3, '#164a4a');
      p.ellipse(2, cy, 2, 5, '#1d6f6a');
      body(p, cx, cy, 10, 6, '#2a8a80', '#123f40');
      cvt.clip(() => {
        for (let i = 0; i < 5; i++) p.px(cx - 6 + i * 3, cy - 3 + (i % 2), '#7ff0dc');
        for (let i = 0; i < 5; i++) p.px(cx - 6 + i * 3, cy + 2 - (i % 2), '#7ff0dc');
      });
      // lobed fins
      p.ellipse(cx - 2, cy - 8, 4, 3, '#2fb8a8');
      p.ellipse(cx + 1, cy + 5, 3, 3, '#2fb8a8');
      p.rect(cx + 2, cy + 7, 1, 3, '#7ff0dc');
      p.rect(cx - 3, cy - 10, 1, 3, '#7ff0dc');
      // armored head plate
      p.ellipse(cx + 8, cy, 4, 5, '#3fb0a0');
      p.line(cx + 5, cy - 4, cx + 9, cy - 2, '#d6fff6');
      eye(p, cx + 8, cy - 1, 2, '#e0fff8');
      p.circle(cx + 8, cy - 1, 1, '#0d2f2f');
      p.rect(cx + 10, cy + 2, 2, 1, '#0d2f2f');
    },
  },
  'Rift Leviathan': {
    w: 34, h: 16, draw(p, cvt) {
      const cx = 16, cy = 8;
      // eel body: overlapping discs
      const pts = [[3, 0], [6, -1], [9, -1], [12, 0], [15, 1], [18, 1], [21, 0], [24, -1], [27, 0]];
      for (let i = 0; i < pts.length; i++) {
        const [x, dy] = pts[i];
        const r = 3 - Math.abs(i - 4) * 0.15;
        p.ellipse(x, cy + dy, 3, r, i < 2 ? '#132a3a' : '#1d3a52');
      }
      cvt.clip(() => {
        for (let i = 0; i < 8; i++) {
          p.px(5 + i * 3.5, cy - 2 + (i % 2) * 4, '#57d8c4');
          p.px(5 + i * 3.5, cy + 1 + (i % 2) * 2 - 2, '#7ff0dc');
        }
        p.rect(4, cy, 24, 1, '#2f8a9a');
      });
      // jaw + teeth
      p.ellipse(cx + 9, cy, 3, 3, '#2a506a');
      for (let i = 0; i < 4; i++) p.px(cx + 8 + i, cy + 2, '#d6fff6');
      eye(p, cx + 9, cy - 1, 2, '#d6fff6');
      p.circle(cx + 9, cy - 1, 1, '#0d2f2f');
      // back fin
      for (let i = 0; i < 6; i++) p.rect(6 + i * 3, cy - 4 - (i % 2), 1, 2, '#57d8c4');
    },
  },
};

// clip helper injected into each draw call
function withClip(p, fn) {
  const ctx = p.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  fn();
  ctx.restore();
}

export const FISH_BY_RARITY = {};
for (const name of Object.keys(SPECS)) {
  // rarity assigned below after we group
}

const RARITY_OF = {
  'Sunny Perch': 'Common', 'Dusty Minnow': 'Common',
  'Copper Bream': 'Uncommon', 'Reedfin Dace': 'Uncommon',
  'Moonlit Trout': 'Rare', 'Coral Darter': 'Rare',
  'Stormgill Bass': 'Epic', 'Amber Pike': 'Epic',
  'Golden Koi': 'Legendary', 'Prism Ray': 'Legendary',
  'Eldertide Coelacanth': 'Ancient', 'Rift Leviathan': 'Ancient',
};

for (const [name, spec] of Object.entries(SPECS)) {
  (FISH_BY_RARITY[RARITY_OF[name]] ||= []).push(name);
}

// Build an offscreen canvas per species on first use (lazy) and cache it.
const cache = {};
export function fishCanvas(name) {
  if (cache[name]) return cache[name];
  const spec = SPECS[name];
  const cv = createCanvas(spec.w, spec.h);
  const p = painter(cv.getContext('2d'));
  p.ctx.imageSmoothingEnabled = false;
  const cvt = { clip: (fn) => withClip(p, fn) };
  spec.draw(p, cvt);
  const outlined = addOutline(cv, '#2b1c16');
  cache[name] = outlined;
  return outlined;
}

export function speciesForRarity(rarity) {
  return FISH_BY_RARITY[rarity];
}
