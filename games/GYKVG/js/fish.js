/* Original fish definitions + rarity table.
   All artwork is generated procedurally in art.js from these parameters. */
(function () {
  "use strict";

  // Rarity tiers, in ascending order. The odds are fixed and never modified.
  const RARITY = {
    Common: 0.45,
    Uncommon: 0.25,
    Rare: 0.15,
    Epic: 0.08,
    Legendary: 0.05,
    Ancient: 0.02,
  };

  const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Ancient"];

  // A short flavour word used by the reveal panel for each tier.
  const RARITY_BLURB = {
    Common: "A humble catch.",
    Uncommon: "Nicely done.",
    Rare: "A fine specimen!",
    Epic: "What a beauty!",
    Legendary: "Legends are real!",
    Ancient: "It hums with old magic...",
  };

  // Fish are grouped by rarity. Two original species per tier.
  // Visual parameters drive the shared procedural fish renderer.
  const FISH = [
    // ---- COMMON -----------------------------------------------------------
    {
      name: "Mudfin Minnow", rarity: "Common",
      len: 16, hgt: 6, tail: "fork", pattern: "none",
      body: "#b7a06a", bodyDark: "#8c7748", belly: "#e2d3a4",
      fin: "#c9b47c", finDark: "#9a8452", accent: "#6f5a33", eye: "#2a2118",
    },
    {
      name: "Sunny Dace", rarity: "Common",
      len: 14, hgt: 7, tail: "fan", pattern: "stripes",
      body: "#e8c86a", bodyDark: "#c09a3c", belly: "#f6e6ad",
      fin: "#e0b349", finDark: "#b0842c", accent: "#8a5f22", eye: "#33270f",
    },

    // ---- UNCOMMON ---------------------------------------------------------
    {
      name: "Copper Perch", rarity: "Uncommon",
      len: 18, hgt: 9, tail: "fork", pattern: "bands",
      body: "#d08a4a", bodyDark: "#9c5c2b", belly: "#f0c58c",
      fin: "#b8743a", finDark: "#7f4c23", accent: "#5f3716", eye: "#2b1a0c",
    },
    {
      name: "Reedscale Roach", rarity: "Uncommon",
      len: 17, hgt: 8, tail: "fan", pattern: "scales",
      body: "#8fb8a0", bodyDark: "#5d8a72", belly: "#d4e6d6",
      fin: "#7aa48c", finDark: "#4f7660", accent: "#3f5f4c", eye: "#1f2a24",
    },

    // ---- RARE -------------------------------------------------------------
    {
      name: "Azure Trout", rarity: "Rare",
      len: 20, hgt: 9, tail: "fork", pattern: "spots",
      body: "#5aa8d8", bodyDark: "#2f6fa8", belly: "#cdeafa",
      fin: "#4a93c4", finDark: "#2a5c8c", accent: "#e86a8a", eye: "#12202e",
    },
    {
      name: "Tidepool Wrasse", rarity: "Rare",
      len: 18, hgt: 10, tail: "fan", pattern: "bands",
      body: "#6fbf8e", bodyDark: "#3f8a60", belly: "#d8f0d2",
      fin: "#e2b04a", finDark: "#b07f2c", accent: "#c04a6a", eye: "#152a1c",
    },

    // ---- EPIC -------------------------------------------------------------
    {
      name: "Emberfin Koi", rarity: "Epic",
      len: 24, hgt: 12, tail: "veil", pattern: "koi",
      body: "#f4f0e6", bodyDark: "#c9c2b2", belly: "#ffffff",
      fin: "#ff7a3c", finDark: "#d44f1e", accent: "#e23c2c", eye: "#2a1c12",
      special: "koi",
    },
    {
      name: "Moonlit Salmon", rarity: "Epic",
      len: 24, hgt: 10, tail: "fork", pattern: "moon",
      body: "#9fb8e0", bodyDark: "#5f7cb8", belly: "#eef2ff",
      fin: "#8aa6d8", finDark: "#5570a8", accent: "#d8e6ff", eye: "#141c30",
      special: "salmon",
    },

    // ---- LEGENDARY --------------------------------------------------------
    {
      name: "Stormjaw Marlin", rarity: "Legendary",
      len: 30, hgt: 11, tail: "crescent", pattern: "storm",
      body: "#4662c0", bodyDark: "#283a86", belly: "#cfe0ff",
      fin: "#7fa6ff", finDark: "#4662c0", accent: "#bfe6ff", eye: "#0c1230",
      special: "marlin",
    },
    {
      name: "Gilded Gale Ray", rarity: "Legendary",
      len: 30, hgt: 18, tail: "whip", pattern: "gilded",
      body: "#e8c04a", bodyDark: "#b8862a", belly: "#fff0b8",
      fin: "#f4d873", finDark: "#c0982e", accent: "#fff4c8", eye: "#2a1e08",
      special: "ray",
    },

    // ---- ANCIENT ----------------------------------------------------------
    {
      name: "Runegill Coelacanth", rarity: "Ancient",
      len: 28, hgt: 14, tail: "lobe", pattern: "runes",
      body: "#3f7f8c", bodyDark: "#255058", belly: "#bfe6e0",
      fin: "#5fb0a8", finDark: "#2f6f6a", accent: "#7ff0e0", eye: "#eafff8",
      special: "coelacanth",
    },
    {
      name: "Sunken Eidolon", rarity: "Ancient",
      len: 26, hgt: 16, tail: "veil", pattern: "spectral",
      body: "#6a5f9c", bodyDark: "#3f3768", belly: "#cfc6ff",
      fin: "#9f8fe0", finDark: "#5f52a0", accent: "#e0d8ff", eye: "#f4ffff",
      special: "eidolon",
    },
  ];

  const FISH_BY_RARITY = {};
  for (const r of RARITY_ORDER) FISH_BY_RARITY[r] = FISH.filter((f) => f.rarity === r);

  window.FishData = { RARITY, RARITY_ORDER, RARITY_BLURB, FISH, FISH_BY_RARITY };
})();
