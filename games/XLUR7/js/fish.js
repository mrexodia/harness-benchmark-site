/* fish.js - procedural pixel fish. Each fish is rasterised once into a small
   grid of coloured cells, then blitted with fillRect (or an offscreen canvas)
   so the art stays crisp and un-anti-aliased at any scale. */
(function () {
  const U = window.FishUtil;

  // ---- tiny raster helpers -------------------------------------------------
  function makeMask(W, H, fill) {
    const m = new Array(W);
    for (let x = 0; x < W; x++) { m[x] = new Array(H).fill(fill || 0); }
    return m;
  }
  function setPx(m, W, H, x, y, v) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    m[x][y] = v;
  }
  function tri(m, W, H, ax, ay, bx, by, cx, cy, v) {
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxy = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area === 0) return;
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const w0 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area;
        const w1 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) m[x][y] = v;
      }
    }
  }

  function buildMask(spec) {
    const W = spec.W, H = spec.H;
    const m = makeMask(W, H);
    const cy = H * (spec.cy != null ? spec.cy : 0.5);
    const bodyX0 = W * spec.bx0;
    const bodyX1 = W - 1;
    const cx = (bodyX0 + bodyX1) / 2;
    const rx = (bodyX1 - bodyX0) / 2;
    const ry = H * spec.ry;
    const pw = spec.pow || 0.5;

    // body
    for (let x = Math.floor(bodyX0); x <= bodyX1; x++) {
      let t = (x - cx) / rx; t = Math.max(-1, Math.min(1, t));
      const half = Math.max(0.45, ry * Math.pow(1 - t * t, pw));
      const yc = cy + (spec.arch || 0) * (1 - t * t) * H;
      for (let y = Math.round(yc - half); y <= Math.round(yc + half); y++) {
        setPx(m, W, H, x, y, 2);
      }
    }

    function bodyTop(x) {
      const t = Math.max(-1, Math.min(1, (x - cx) / rx));
      const half = Math.max(0.45, ry * Math.pow(1 - t * t, pw));
      const yc = cy + (spec.arch || 0) * (1 - t * t) * H;
      return yc - half;
    }

    // tail
    if (spec.tail && spec.tail !== "none") {
      const tipX = W * (spec.tailTip != null ? spec.tailTip : 0.02);
      const rootX = bodyX0 + 1;
      const th = ry * (spec.tailSpread || 1.25);
      if (spec.tail === "fork") {
        tri(m, W, H, tipX, cy - th, rootX, cy - ry * 0.15, rootX, cy - ry * 0.95, 4);
        tri(m, W, H, tipX, cy + th, rootX, cy + ry * 0.15, rootX, cy + ry * 0.95, 4);
      } else if (spec.tail === "flow") {
        tri(m, W, H, tipX, cy - th * 0.6, rootX, cy - ry * 0.7, rootX, cy, 4);
        tri(m, W, H, tipX, cy + th * 0.6, rootX, cy + ry * 0.7, rootX, cy, 4);
        tri(m, W, H, tipX, cy - th * 1.15, rootX, cy - ry * 0.35, rootX, cy, 4);
        tri(m, W, H, tipX, cy + th * 1.15, rootX, cy + ry * 0.35, rootX, cy, 4);
      } else { // fan / round
        tri(m, W, H, tipX, cy - th, tipX, cy + th, rootX, cy, 4);
      }
    }

    // dorsal
    if (spec.dorsal && spec.dorsal !== "none") {
      const dx0 = W * (spec.dorsalX0 || 0.38);
      const dx1 = W * (spec.dorsalX1 || 0.68);
      const dh = H * (spec.dorsalH || 0.42);
      const ax = (dx0 + dx1) / 2;
      const ay = Math.min(bodyTop(dx0), bodyTop(dx1)) - dh;
      tri(m, W, H, dx0, bodyTop(dx0) + 1, dx1, bodyTop(dx1) + 1, ax, ay, 4);
      if (spec.dorsal === "spiny") {
        for (let i = 0; i <= 4; i++) {
          const x = dx0 + (dx1 - dx0) * (i / 4);
          tri(m, W, H, x - 0.6, bodyTop(x) + 1, x + 0.6, bodyTop(x) + 1, x, ay - 0.5, 4);
        }
      }
    }

    // pectoral / pelvic fin
    if (spec.pectoral !== false) {
      const px0 = W * (spec.pectX0 || 0.56);
      const px1 = W * (spec.pectX1 || 0.70);
      const py = cy + ry * (spec.pectY || 0.35);
      tri(m, W, H, px0, py, px1, py, (px0 + px1) / 2 - W * 0.03, py + ry * (spec.pectDrop || 0.85), 4);
    }

    // whiskers / barbels
    if (spec.whiskers) {
      for (let side = -1; side <= 1; side += 2) {
        const len = spec.whiskers;
        let x = W - 2, y = cy + ry * 0.45 * side;
        for (let i = 0; i < len; i++) {
          setPx(m, W, H, x, y, 4);
          x -= 1; y += 0.55 * side + 0.15;
        }
      }
    }

    // horn
    if (spec.horn) {
      tri(m, W, H, W - 5, bodyTop(W - 5) + 1, W - 3, bodyTop(W - 3) + 1, W - 5, bodyTop(W - 5) - H * 0.35, 4);
    }

    // extra side fins (ancient)
    if (spec.lobes) {
      tri(m, W, H, W * 0.34, cy + ry * 0.6, W * 0.46, cy + ry * 0.6, W * 0.30, cy + ry * 1.5, 4);
      tri(m, W, H, W * 0.42, cy - ry * 0.55, W * 0.54, cy - ry * 0.55, W * 0.46, cy - ry * 1.25, 4);
    }

    // ---- pattern overlay on body cells ----
    const p = spec.pattern;
    if (p) {
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          if (m[x][y] !== 2) continue;
          let on = false;
          if (p.type === "stripes") on = ((x + (p.off || 0)) % p.spacing) < (p.width || 1);
          else if (p.type === "bands") on = ((y + (p.off || 0)) % p.spacing) < (p.width || 1);
          else if (p.type === "spots") on = U.hash(x * 3.1 + y * 11.7) > (p.thresh || 0.8);
          else if (p.type === "scales") on = ((x + y) % 2 === 0);
          else if (p.type === "runes") on = (U.hash(Math.floor(x / 2) * 5.7 + Math.floor(y / 2) * 3.3) > 0.86);
          if (on) m[x][y] = p.glow ? 9 : 8;
        }
      }
    }

    // ---- shading: dark back, light belly ----
    for (let x = 0; x < W; x++) {
      let top = H, bot = -1;
      for (let y = 0; y < H; y++) if (m[x][y] === 2 || m[x][y] === 8 || m[x][y] === 9) { top = Math.min(top, y); bot = Math.max(bot, y); }
      if (bot < 0) continue;
      const hgt = bot - top;
      for (let y = top; y <= bot; y++) {
        const c = m[x][y];
        if (c !== 2 && c !== 8 && c !== 9) continue;
        const rel = (y - top) / (hgt || 1);
        if (rel < 0.30 && c === 2) m[x][y] = 1;
        else if (rel > 0.72 && c === 2) m[x][y] = 3;
      }
    }

    // ---- eye near the head ----
    if (spec.eye !== false) {
      const ex = W - Math.round(W * (spec.eyeX || 0.13));
      const ey = Math.round(cy - ry * 0.28);
      setPx(m, W, H, ex - 1, ey, 6); setPx(m, W, H, ex, ey, 6);
      setPx(m, W, H, ex - 1, ey + 1, 6); setPx(m, W, H, ex, ey + 1, 6);
      setPx(m, W, H, ex, ey + 1, 7);
    }

    // ---- outline around everything solid ----
    const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[x][y] !== 0 && m[x][y] !== 10;
    const add = [];
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
      if (m[x][y] === 0 && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push([x, y]);
    }
    add.forEach(([x, y]) => { m[x][y] = 10; });

    return m;
  }

  function colorFor(cell, c) {
    switch (cell) {
      case 1: return c.dark;
      case 2: return c.base;
      case 3: return c.belly || c.light;
      case 4: return c.fin;
      case 5: return c.finEdge || c.fin;
      case 6: return c.eye || "#f4f0e0";
      case 7: return c.pupil || "#151515";
      case 8: return c.accent;
      case 9: return c.glow || c.accent;
      case 10: return c.outline;
      default: return null;
    }
  }

  // Draw a fish centred at (ox,oy) in SCENE pixels, cell size = scale.
  // Optional flip faces it left. Returns its width/height in scene px.
  function drawFishSprite(ctx, spec, ox, oy, scale, flip) {
    if (!spec.__mask) spec.__mask = buildMask(spec);
    const m = spec.__mask, W = spec.W, H = spec.H;
    const c = spec.colors;
    const w = W * scale, h = H * scale;
    const x0 = ox - w / 2, y0 = oy - h / 2;
    for (let x = 0; x < W; x++) {
      const dx = x0 + (flip ? (W - 1 - x) : x) * scale;
      for (let y = 0; y < H; y++) {
        const col = colorFor(m[x][y], c);
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(dx, y0 + y * scale, scale, scale);
      }
    }
    return { w, h };
  }

  // ---- the fish catalogue --------------------------------------------------
  const FISH = [
    {
      name: "Mudfin Minnow", rarity: "Common",
      W: 24, H: 12, bx0: 0.26, ry: 0.34, pow: 0.5, tail: "fork", tailSpread: 1.35,
      dorsal: "tri", dorsalX0: 0.40, dorsalX1: 0.62, dorsalH: 0.34,
      whiskers: 3, eyeX: 0.14, arch: 0.02,
      pattern: { type: "spots", thresh: 0.84 },
      colors: { base: "#9a8b4e", dark: "#6b5d33", light: "#cabf88", belly: "#ddd4a6", fin: "#b3a661", finEdge: "#7d7140", accent: "#6b5d33", outline: "#2e2416", eye: "#f2efe0", pupil: "#1c160c" }
    },
    {
      name: "Reed Perch", rarity: "Common",
      W: 24, H: 15, bx0: 0.24, ry: 0.40, pow: 0.55, tail: "fan", tailSpread: 1.05,
      dorsal: "spiny", dorsalX0: 0.34, dorsalX1: 0.66, dorsalH: 0.30, arch: 0.03,
      pattern: { type: "bands", spacing: 4, width: 1, off: 0 },
      colors: { base: "#6f8a44", dark: "#48602c", light: "#a4bd6b", belly: "#cfe0a0", fin: "#7fa04f", finEdge: "#556f32", accent: "#3f5a26", outline: "#22301a", eye: "#f2efe0", pupil: "#141a0e" }
    },
    {
      name: "Copperback Roach", rarity: "Uncommon",
      W: 26, H: 16, bx0: 0.22, ry: 0.42, pow: 0.5, tail: "fan", tailSpread: 1.1,
      dorsal: "tri", dorsalX0: 0.36, dorsalX1: 0.64, dorsalH: 0.40, arch: 0.04,
      pattern: { type: "scales" },
      colors: { base: "#b5733f", dark: "#7c4521", light: "#e3ab68", belly: "#f0cd97", fin: "#cf8b4a", finEdge: "#8c5628", accent: "#a05f31", outline: "#3a2110", eye: "#f6f1e2", pupil: "#241509" }
    },
    {
      name: "Dusk Shiner", rarity: "Uncommon",
      W: 23, H: 12, bx0: 0.27, ry: 0.33, pow: 0.5, tail: "fork", tailSpread: 1.45,
      dorsal: "tri", dorsalX0: 0.40, dorsalX1: 0.62, dorsalH: 0.30,
      pattern: { type: "stripes", spacing: 5, width: 1, off: 1 },
      colors: { base: "#8a7fb5", dark: "#5a4f86", light: "#c4bce4", belly: "#e2dcf6", fin: "#a99dd6", finEdge: "#6f639e", accent: "#4a3f74", outline: "#2a2440", eye: "#f6f1e2", pupil: "#1b1730" }
    },
    {
      name: "Moonlit Glassfish", rarity: "Rare",
      W: 27, H: 16, bx0: 0.20, ry: 0.40, pow: 0.5, tail: "flow", tailSpread: 1.7, tailTip: 0.0,
      dorsal: "sail", dorsalX0: 0.36, dorsalX1: 0.70, dorsalH: 0.50, arch: 0.03,
      pattern: { type: "spots", thresh: 0.90, glow: true },
      colors: { base: "#9fd6e8", dark: "#5d9fc0", light: "#d8f2fb", belly: "#eefaff", fin: "#bfe6f4", finEdge: "#79b7d4", accent: "#ffffff", glow: "#ffffff", outline: "#2f5d78", eye: "#ffffff", pupil: "#1d3a4c" }
    },
    {
      name: "Emberfin Char", rarity: "Epic",
      W: 28, H: 14, bx0: 0.22, ry: 0.36, pow: 0.48, tail: "fork", tailSpread: 1.6,
      dorsal: "spiny", dorsalX0: 0.34, dorsalX1: 0.66, dorsalH: 0.42,
      pattern: { type: "spots", thresh: 0.82 },
      colors: { base: "#5d6b78", dark: "#39434e", light: "#9aa8b3", belly: "#d7c9b0", fin: "#ff7a2e", finEdge: "#c8481a", accent: "#ffd25a", glow: "#ffb347", outline: "#20161a", eye: "#fff2cc", pupil: "#2a0f0a" }
    },
    {
      name: "Aurelian Sunfish", rarity: "Legendary",
      W: 28, H: 22, bx0: 0.26, ry: 0.42, pow: 0.62, tail: "flow", tailSpread: 1.5, tailTip: 0.01,
      dorsal: "sail", dorsalX0: 0.30, dorsalX1: 0.74, dorsalH: 0.55, arch: 0.05,
      pattern: { type: "scales", glow: false },
      colors: { base: "#ffc23c", dark: "#d98a1c", light: "#ffe89a", belly: "#fff3c4", fin: "#ffd766", finEdge: "#e08a1e", accent: "#fff0b0", glow: "#fff6cf", outline: "#6a3c0c", eye: "#fffdf2", pupil: "#3a2205" }
    },
    {
      name: "Primordial Hollowfin", rarity: "Ancient",
      W: 32, H: 18, bx0: 0.16, ry: 0.34, pow: 0.42, tail: "fan", tailSpread: 1.0,
      dorsal: "sail", dorsalX0: 0.34, dorsalX1: 0.72, dorsalH: 0.45, lobes: true,
      horn: true, whiskers: 4,
      pattern: { type: "runes", glow: true },
      colors: { base: "#3f9184", dark: "#25625b", light: "#7fcbb9", belly: "#a9e2d1", fin: "#4fa596", finEdge: "#2c6b63", accent: "#9bffe6", glow: "#c8ffef", outline: "#0a2f2b", eye: "#d6fff2", pupil: "#04201c" }
    }
  ];

  const BY_RARITY = {};
  FISH.forEach(f => { (BY_RARITY[f.rarity] = BY_RARITY[f.rarity] || []).push(f); });

  window.FishArt = {
    FISH,
    BY_RARITY,
    draw: drawFishSprite,
    forRarity(rarity, rng) {
      const list = BY_RARITY[rarity] || BY_RARITY.Common;
      return list[Math.floor((rng || Math.random)() * list.length) % list.length];
    }
  };
})();
