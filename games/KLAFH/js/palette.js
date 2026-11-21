"use strict";
/* Tidewater Bay - original palette. All art is drawn from these colours in code. */
const PAL = {
  // water
  wDeep:  "#14506f",
  wDeep2: "#1b5f83",
  wMid:   "#2477a0",
  wMid2:  "#2f8cb4",
  wLight: "#49a6c9",
  wFoam:  "#a8e3ec",
  wShine: "#e2f8fc",

  // sand / shore
  sandD:  "#c2934f",
  sand:   "#dcb877",
  sandL:  "#efd8a3",
  sandLL: "#f7ebc9",

  // grass
  grassD: "#2c5a29",
  grass:  "#3d7c33",
  grassM: "#4c8f3b",
  grassL: "#63aa46",
  grassLL:"#86c75a",

  // dirt / path
  dirt:   "#7a5530",
  dirtD:  "#5a3d21",

  // wood
  woodD:  "#4f331d",
  wood:   "#7d5230",
  woodM:  "#96653c",
  woodL:  "#b07f4e",

  // trees
  trunk:  "#5b3a1f",
  trunkL: "#79512d",
  leafD:  "#245021",
  leaf:   "#35722c",
  leafM:  "#458a38",
  leafL:  "#5fa844",
  leafLL: "#7cc356",

  // rock
  rockD:  "#525c66",
  rock:   "#77828e",
  rockL:  "#9aa5b0",

  // flowers / accents
  pink:   "#e06a8c",
  pinkL:  "#f39ab4",
  yellow: "#f2c14e",
  yellowL:"#f8dd8e",
  white:  "#f3f0dc",
  purple: "#a25cc0",

  // angler
  skin:   "#e6b184",
  skinD:  "#c68c5e",
  hair:   "#5a3b22",
  shirt:  "#c85c4a",
  shirtD: "#9c4136",
  shirtL: "#e07a63",
  overall:"#3d6f9e",
  overallD:"#2a5178",
  straw:  "#d9b96b",
  strawD: "#b3934b",
  strawL: "#ecd58f",
  boot:   "#463526",
  rod:    "#6b4a2a",
  rodL:   "#8c6538",

  // misc
  ink:    "#17232b",
  smoke:  "#dfe8e6",
  bobR:   "#e0503f",
  bobRD:  "#a8322a",
  bobW:   "#f4f2e6",
};

/* Rarity identities: colour + secondary + glyph treatment keys used by UI. */
const RARITY = {
  Common:    { col: "#9fb4a5", col2: "#6f8a78", glow: "#9fb4a5" },
  Uncommon:  { col: "#6ec06a", col2: "#3f8f43", glow: "#6ec06a" },
  Rare:      { col: "#57a9e8", col2: "#2f6fb0", glow: "#57a9e8" },
  Epic:      { col: "#b06ae0", col2: "#6f38a0", glow: "#c78bf0" },
  Legendary: { col: "#f2c14e", col2: "#b07d18", glow: "#ffe08a" },
  Ancient:   { col: "#4fd7c6", col2: "#1f8a86", glow: "#9ff5ea" },
};

const RARITY_TABLE = [
  ["Common", 0.45],
  ["Uncommon", 0.25],
  ["Rare", 0.15],
  ["Epic", 0.08],
  ["Legendary", 0.05],
  ["Ancient", 0.02],
];
