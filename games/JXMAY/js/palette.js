// palette.js — a single controlled, warm palette for the whole game.

export const P = {
  // deep water -> shallow water
  waterDeep:    '#123039',
  waterDeep2:   '#16414d',
  waterMid:     '#1d5460',
  waterMid2:    '#246470',
  waterShallow: '#2f7d7e',
  waterShallow2:'#3f938c',
  waterGlow:    '#57b3a2',
  foam:         '#bfe6d9',
  sparkle:      '#e6fbf1',

  // far bank / hills
  hillDark:  '#2c5548',
  hill:      '#3a6b57',
  hillLight: '#4b8368',

  // land
  dirtDark:  '#4f3524',
  dirt:      '#6b4a32',
  dirtLight: '#8a6242',
  sand:      '#c8a86a',
  sandLight: '#e0c48c',
  grassDark: '#33602f',
  grass:     '#468038',
  grassLight:'#63a848',
  grassHi:   '#8bcf64',
  grassEdge: '#2a4d27',

  // trees & foliage
  trunkDark: '#432d1d',
  trunk:     '#63442a',
  leafDark:  '#24512e',
  leaf:      '#336b39',
  leafMid:   '#438a45',
  leafLight: '#5aa855',
  leafHi:    '#7ec86a',

  // wood / dock
  woodDark:  '#5a3a24',
  wood:      '#83552f',
  woodMid:   '#9c6739',
  woodLight: '#b9834a',
  woodHi:    '#d3a266',
  nail:      '#3a2517',

  // stones
  stoneDark: '#4d5560',
  stone:     '#6e7885',
  stoneLight:'#98a3ad',
  stoneHi:   '#c2ccd3',

  // flowers
  petalPink:  '#e88aa0',
  petalYellow:'#f2c14e',
  petalWhite: '#f4f0e6',
  petalPurple:'#a06fb0',
  petalRed:   '#d9584f',
  stem:       '#3f7a3a',

  // angler
  skin:      '#f0c090',
  skinShade: '#cf9a6a',
  skinDark:  '#a87048',
  hair:      '#5a3a2a',
  cap:       '#e0b24a',
  capShade:  '#a9772a',
  shirt:     '#cf6a4a',
  shirtShade:'#a34e38',
  shirtLight:'#e88a68',
  pants:     '#4a4e69',
  pantsShade:'#383b52',
  boot:      '#4a3428',
  bootLight: '#6b4d38',
  rod:       '#7a4f2c',
  rodLight:  '#a7713f',
  reel:      '#cbbfae',
  line:      'rgba(240,246,255,0.75)',

  // misc scene
  bobberRed:   '#e0503a',
  bobberRedHi: '#f4886f',
  white:       '#f4f0e6',
  black:       '#1c1620',
  outline:     '#241a26',
  shadow:      'rgba(10,26,30,0.30)',

  // UI
  panel:      'rgba(18,23,33,0.84)',
  panelEdge:  '#caa06a',
  panelEdge2: '#6b4f2e',
  uiText:     '#f3ead6',
  uiDim:      '#b7ad98',
  uiGold:     '#f2c14e',
};

// rarity tiers, exact names and colours, plus per-tier visual personality.
export const RARITIES = {
  Common:    { color: '#c3cbd4', glow: '#8f9aa6', order: 0 },
  Uncommon:  { color: '#78d17c', glow: '#4f9e55', order: 1 },
  Rare:      { color: '#5fb6f0', glow: '#2f7fc4', order: 2 },
  Epic:      { color: '#bd7ef0', glow: '#7b45b8', order: 3 },
  Legendary: { color: '#f7b23f', glow: '#d9761f', order: 4 },
  Ancient:   { color: '#5ff0e0', glow: '#1fa89c', order: 5 },
};

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
