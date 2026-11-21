// Shared palette for the whole game. Warm, cozy, slightly desaturated.
export const P = {
  // sky
  skyTop: '#5fa6cd',
  skyUpper: '#79bcda',
  skyMid: '#a2d3e0',
  skyLow: '#d6e9d8',
  skyHaze: '#f4e2b6',
  cloud: '#fdf6e6',
  cloudShade: '#dfe8ea',
  sun: '#fff8d8',
  sunGlow: '#ffeaa6',

  // distant land
  hillFar: '#9dbca6',
  hillMid: '#7fa689',
  hillNear: '#5f8f75',
  hillShade: '#4c7761',

  // water
  waterDeep: '#1c5c82',
  waterMid: '#2a7ba1',
  waterShallow: '#3f9ab5',
  waterLight: '#64bcc7',
  waterHi: '#9fe0d8',
  foam: '#eefbf4',
  waterTint: '#255f7e',

  // sand / shore
  sand: '#ddc487',
  sandLight: '#edd9a3',
  sandDark: '#bb9d63',
  sandWet: '#a48753',

  // grass
  grassDark: '#346b3d',
  grass: '#4c9048',
  grassLight: '#6bb257',
  grassHi: '#93cf6d',
  grassShadow: '#274f31',

  // foliage
  leafDark: '#275f38',
  leaf: '#3a8347',
  leafMid: '#4f9c52',
  leafLight: '#71b95e',
  leafHi: '#9ad47a',

  // wood
  trunkDark: '#4f3322',
  trunk: '#6d4530',
  trunkLight: '#8d5b3a',
  woodDark: '#5b3d27',
  wood: '#7d5734',
  woodLight: '#9d7145',
  woodHi: '#bd8f5c',

  // character
  outline: '#221a1c',
  skin: '#f2c79a',
  skinShade: '#d69f72',
  hair: '#5a3826',
  hat: '#e6c66a',
  hatDark: '#c39f45',
  hatBand: '#7d4f2b',
  shirt: '#3f948e',
  shirtDark: '#2d6f6b',
  shirtLight: '#5cb2a8',
  pants: '#5a6786',
  pantsDark: '#414c67',
  boots: '#3a2a24',
  rod: '#8a6238',
  rodDark: '#5e4026',
  line: '#e8f4f2',

  // ui
  uiPanel: 'rgba(23,18,28,0.80)',
  uiPanel2: 'rgba(34,26,38,0.90)',
  uiBorder: '#d9b56a',
  uiBorderDark: '#8a6a34',
  uiText: '#f5ead2',
  uiDim: '#b9a889',
  uiShadow: 'rgba(0,0,0,0.55)',
};

// Rarity colours and the exact names used by the game + test interface.
export const RARITY = {
  Common:    { color: '#c9d1cf', glow: '#9fb0ad', rank: 0 },
  Uncommon:  { color: '#7fd487', glow: '#4fae5c', rank: 1 },
  Rare:      { color: '#6fb6ff', glow: '#3d7fd6', rank: 2 },
  Epic:      { color: '#c489ff', glow: '#9250e0', rank: 3 },
  Legendary: { color: '#ffd166', glow: '#e0a020', rank: 4 },
  Ancient:   { color: '#6ff0e0', glow: '#1f9f9a', rank: 5 },
};

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
export const RARITY_ODDS = ['45%', '25%', '15%', '8%', '5%', '2%'];
