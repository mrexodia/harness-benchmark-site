"use strict";
/* ------------------------------------------------------------------ *
 *  fish.js - parametric pixel fish sprites + species catalogue        *
 * ------------------------------------------------------------------ */

const FISH_SPEC = {
  body: "#6f9a6a", top: "#4f7a52", belly: "#e8d9a8",
  fin: "#8fb98a", accent: "#3f5f42", pattern: "none",
  edge: "#1e2630", eye: "#ffffff", pupil: "#141820", extras: [],
};

/* Render one fish sprite to a small offscreen canvas (head faces right). */
function makeFishCanvas(spec) {
  const W = 32, H = 20;
  const cv = makeCanvas(W, H);
  const g = ctxOf(cv);
  const bx = 18, by = 10, rx = 9.5, ry = 5.6;
  const grid = new Uint8Array(W * H); // 0 empty, 1 body, 2 tail, 3 fin

  const set = (x, y, v) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (grid[y * W + x] === 0) grid[y * W + x] = v;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - bx) / rx, ny = (y - by) / ry;
      if (nx * nx + ny * ny <= 1) set(x, y, 1);
    }
  }
  /* forked tail */
  for (let x = 0; x <= 9; x++) {
    const half = 1.2 + (9 - x) * 0.62;
    for (let y = Math.ceil(by - half); y <= Math.floor(by + half); y++) {
      if (x < 4 && Math.abs(y - by) < 3.2 - x * 0.75) continue; // fork notch
      set(x, y, 2);
    }
  }
  /* dorsal fin */
  for (let x = 12; x <= 24; x++) {
    const nx = (x - bx) / rx;
    const ytop = by - ry * Math.sqrt(Math.max(0, 1 - nx * nx));
    const h = Math.round(3.4 * Math.sin(Math.PI * (x - 12) / 13));
    for (let k = 1; k <= h; k++) set(x, Math.round(ytop) - k + 1, 3);
  }
  /* anal fin */
  for (let x = 15; x <= 22; x++) {
    const nx = (x - bx) / rx;
    const ybot = by + ry * Math.sqrt(Math.max(0, 1 - nx * nx));
    const h = Math.round(2.4 * Math.sin(Math.PI * (x - 15) / 8));
    for (let k = 1; k <= h; k++) set(x, Math.round(ybot) + k - 1, 3);
  }
  /* pelvic/pectoral side fin */
  for (let x = 18; x <= 23; x++) {
    const h = 2 - Math.abs(x - 20);
    if (h > 0) for (let y = 0; y < h; y++) set(x, by + 3 + y, 3);
  }

  /* outline */
  const out = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y * W + x]) continue;
      const n = (x > 0 && grid[y * W + x - 1]) || (x < W - 1 && grid[y * W + x + 1]) ||
        (y > 0 && grid[(y - 1) * W + x]) || (y < H - 1 && grid[(y + 1) * W + x]);
      if (n) out.push([x, y]);
    }
  }

  const pat = spec.pattern || "none";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      if (!v) continue;
      const ny = (y - by) / ry;
      let col;
      if (v === 2) col = spec.fin;
      else if (v === 3) col = spec.fin;
      else if (ny < -0.35) col = spec.top;
      else if (ny > 0.42) col = spec.belly;
      else col = spec.body;

      if (v === 1) {
        if (pat === "stripe" && (((x + 1) % 5) < 2) && y > by - 3 && y < by + 3) col = spec.accent;
        if (pat === "band" && y > by - 1 && y <= by + 1) col = spec.accent;
        if (pat === "scale" && ((x + y) & 1)) col = col === spec.body ? spec.top : spec.body;
        if (pat === "spot" && ((x * 7 + y * 13) % 17) < 4 && ny > -0.5) col = spec.accent;
        if (pat === "rune" && ((x * 5 + y * 11) % 23) < 3) col = spec.accent;
      }
      rect(g, x, y, 1, 1, col);
    }
  }
  /* outline paint */
  const ecol = spec.edge || "#1e2630";
  for (const [x, y] of out) rect(g, x, y, 1, 1, ecol);

  /* eye */
  rect(g, bx + 4, by - 2, 2, 2, spec.eye || "#fff");
  rect(g, bx + 5, by - 1, 1, 1, spec.pupil || "#141820");
  if (spec.extras.includes("gloweye")) {
    rect(g, bx + 4, by - 3, 2, 1, spec.accent);
    rect(g, bx + 7, by - 1, 1, 2, spec.accent);
    rect(g, bx + 4, by + 1, 2, 1, spec.accent);
  }
  /* mouth */
  rect(g, bx + 8, by + 1, 1, 1, ecol);
  if (spec.extras.includes("teeth")) {
    rect(g, bx + 8, by + 1, 1, 1, "#fff");
    rect(g, bx + 7, by + 2, 1, 1, "#fff");
  }
  if (spec.extras.includes("whisker")) {
    rect(g, bx + 9, by + 2, 2, 1, ecol);
    rect(g, bx + 10, by + 3, 2, 1, ecol);
    rect(g, bx + 9, by + 4, 1, 1, ecol);
  }
  if (spec.extras.includes("spikes")) {
    for (let x = 13; x <= 23; x += 2) {
      const nx = (x - bx) / rx;
      const ytop = Math.round(by - ry * Math.sqrt(Math.max(0, 1 - nx * nx)));
      rect(g, x, ytop - 3, 1, 1, spec.accent);
    }
  }
  if (spec.extras.includes("crown")) {
    rect(g, bx - 2, by - ry - 4, 5, 1, "#f2c14e");
    rect(g, bx - 2, by - ry - 5, 1, 1, "#f2c14e");
    rect(g, bx + 2, by - ry - 5, 1, 1, "#f2c14e");
    rect(g, bx, by - ry - 6, 1, 2, "#f2c14e");
  }
  if (spec.extras.includes("rune")) {
    g.globalAlpha = 0.9;
    rect(g, bx - 3, by - 1, 1, 3, spec.accent);
    rect(g, bx, by - 3, 1, 1, spec.accent);
    rect(g, bx - 1, by + 2, 1, 1, spec.accent);
    g.globalAlpha = 1;
  }
  return cv;
}

const SPECIES = [
  { name: "Bluegill", rarity: "Common", body: "#4f7f9e", top: "#3a6280", belly: "#d9e6c8", fin: "#6fa0b8", accent: "#2f4f66", pattern: "stripe" },
  { name: "Copper Perch", rarity: "Common", body: "#b07a3a", top: "#8a5a26", belly: "#e3c98d", fin: "#c99a55", accent: "#7a4a20", pattern: "stripe" },
  { name: "Bramble Carp", rarity: "Common", body: "#8a9a5a", top: "#66743a", belly: "#dfe0b0", fin: "#a8b878", accent: "#5c6830", pattern: "scale" },
  { name: "Rainbow Trout", rarity: "Uncommon", body: "#6f9a6a", top: "#4f7a52", belly: "#e8d9a8", fin: "#8fb98a", accent: "#e07a9a", pattern: "spot" },
  { name: "Golden Carp", rarity: "Uncommon", body: "#e0b448", top: "#c08a24", belly: "#f6e3a0", fin: "#f0c860", accent: "#a97a18", pattern: "scale", extras: ["whisker"] },
  { name: "Frostfin", rarity: "Rare", body: "#7fb6d8", top: "#5a93bb", belly: "#e6f4fb", fin: "#bfe2f4", accent: "#ffffff", pattern: "none", eye: "#dff4ff", extras: ["spikes"] },
  { name: "Coral Snapper", rarity: "Rare", body: "#e07a5a", top: "#b85438", belly: "#f6c9a8", fin: "#f0a080", accent: "#f2c14e", pattern: "band" },
  { name: "Stormscale", rarity: "Epic", body: "#5a6f9e", top: "#3d4f78", belly: "#b8c6e0", fin: "#7f96c4", accent: "#9fd8f0", pattern: "scale", extras: ["spikes", "gloweye"] },
  { name: "Amberjaw", rarity: "Epic", body: "#c98a3a", top: "#96621f", belly: "#f0d090", fin: "#e0a850", accent: "#ffdf8a", pattern: "band", extras: ["teeth"] },
  { name: "Emberfin Koi", rarity: "Legendary", body: "#f2efe2", top: "#e0d8c4", belly: "#ffffff", fin: "#f0a090", accent: "#e0503f", pattern: "spot", extras: ["whisker", "crown"] },
  { name: "Tidewrought Idol", rarity: "Ancient", body: "#3a7a7a", top: "#2a5a5a", belly: "#7fd8c8", fin: "#4fb8ae", accent: "#4fd7c6", pattern: "rune", eye: "#dffffa", pupil: "#0a2a2a", extras: ["gloweye", "rune", "spikes"] },
];

/* pre-render */
for (const s of SPECIES) {
  s.canvas = makeFishCanvas(Object.assign({}, FISH_SPEC, s));
}
const SPECIES_BY_RARITY = {};
for (const s of SPECIES) {
  (SPECIES_BY_RARITY[s.rarity] ||= []).push(s);
}
function pickSpecies(rarity) {
  const list = SPECIES_BY_RARITY[rarity] || SPECIES_BY_RARITY.Common;
  return list[(Math.random() * list.length) | 0];
}
