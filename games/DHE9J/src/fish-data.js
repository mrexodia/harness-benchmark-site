/* ============================================================
   Driftwood Bay — fish catalogue (all names & designs original)
   Each entry describes how to procedurally draw its pixel art.
   ============================================================ */
(function () {
  'use strict';

  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

  // body depth profile: t = 0 at tail, 1 at snout
  const PROFILES = {
    slim:    t => Math.sin(Math.PI * Math.pow(t, 0.72)) * 0.62 + 0.12,
    round:   t => Math.sin(Math.PI * Math.pow(t, 0.62)) * 0.95 + 0.05,
    long:    t => Math.sin(Math.PI * Math.pow(t, 0.9)) * 0.7 + 0.14,
    koi:     t => Math.sin(Math.PI * Math.pow(t, 0.6)) * 0.9 + 0.1,
    whale:   t => Math.sin(Math.PI * Math.pow(t, 0.78)) * 0.82 + 0.18
  };

  const FISH = {
    Common: [
      {
        name: 'Pebble Minnow', len: 34, hgt: 16, profile: 'slim', fat: 0.5,
        tail: 'fork', tailSize: 6, dorsal: 6, dorsalPos: 0.42,
        colors: { out: '#3c4a45', body: '#9aa7a0', belly: '#dbe3d4', fin: '#7f8f86', fin2: '#68786f', eye: '#22302c' },
        pattern: 'none', mouth: 'small'
      },
      {
        name: 'Mudskip Goby', len: 30, hgt: 19, profile: 'round', fat: 0.55,
        tail: 'fan', tailSize: 7, dorsal: 7, dorsalPos: 0.45,
        colors: { out: '#3a2c1e', body: '#8a6a45', belly: '#d8c39a', fin: '#6b5236', fin2: '#57412a', eye: '#241a12' },
        pattern: 'bands', mouth: 'big'
      }
    ],
    Uncommon: [
      {
        name: 'Bluegill Perch', len: 32, hgt: 23, profile: 'round', fat: 0.6,
        tail: 'fan', tailSize: 8, dorsal: 9, dorsalPos: 0.4,
        colors: { out: '#20323f', body: '#4f7fa8', belly: '#e8b96a', fin: '#d97a3a', fin2: '#b45a22', eye: '#101c26' },
        pattern: 'bands', mouth: 'small'
      },
      {
        name: 'Silver Dace', len: 37, hgt: 16, profile: 'slim', fat: 0.5,
        tail: 'fork', tailSize: 7, dorsal: 6, dorsalPos: 0.44,
        colors: { out: '#5a6a76', body: '#c9d4dc', belly: '#f4f8fa', fin: '#9fb3c2', fin2: '#7f95a6', eye: '#26343f' },
        pattern: 'shine', mouth: 'small'
      }
    ],
    Rare: [
      {
        name: 'Emberfin Trout', len: 41, hgt: 21, profile: 'long', fat: 0.55,
        tail: 'fan', tailSize: 8, dorsal: 8, dorsalPos: 0.4,
        colors: { out: '#5a2418', body: '#d97b4a', belly: '#f0c98a', fin: '#b8452f', fin2: '#8f2f20', eye: '#3a150e', pattern: '#7a3320' },
        pattern: 'spots', mouth: 'small'
      },
      {
        name: 'Coral Ghost', len: 35, hgt: 20, profile: 'koi', fat: 0.55,
        tail: 'crescent', tailSize: 9, dorsal: 10, dorsalPos: 0.38, flowing: true,
        colors: { out: '#9c6b78', body: '#e9a3b0', belly: '#f9e2e8', fin: '#f4c2ce', fin2: '#e39aac', eye: '#6b2f3e' },
        pattern: 'shimmer', mouth: 'small'
      }
    ],
    Epic: [
      {
        name: 'Moonlit Sturgeon', len: 50, hgt: 19, profile: 'long', fat: 0.5,
        tail: 'crescent', tailSize: 10, dorsal: 5, dorsalPos: 0.34, scutes: true, whiskers: true,
        colors: { out: '#1c2c40', body: '#4a6784', belly: '#cfe0ef', fin: '#35506b', fin2: '#283e56', eye: '#0e1826' },
        pattern: 'scutes', mouth: 'snout'
      },
      {
        name: 'Thunder Pike', len: 47, hgt: 17, profile: 'long', fat: 0.45,
        tail: 'crescent', tailSize: 9, dorsal: 7, dorsalPos: 0.28, rearDorsal: 0.78,
        colors: { out: '#1d3320', body: '#3f6a3a', belly: '#d8d39a', fin: '#284a2a', fin2: '#1d3a20', eye: '#0f1c10', pattern: '#c9d06a' },
        pattern: 'bars', mouth: 'jaw'
      }
    ],
    Legendary: [
      {
        name: 'Aurelian Koi', len: 39, hgt: 25, profile: 'koi', fat: 0.62,
        tail: 'crescent', tailSize: 11, dorsal: 11, dorsalPos: 0.38, flowing: true, whiskers: true,
        colors: { out: '#7a4a12', body: '#f6f1df', belly: '#fffaf0', fin: '#f7d9a8', fin2: '#efb86a', eye: '#3a2408', pattern: '#f0912f', accent: '#d94f1e' },
        pattern: 'patches', mouth: 'small'
      },
      {
        name: 'Stormscale Marlin', len: 54, hgt: 21, profile: 'long', fat: 0.44,
        tail: 'crescent', tailSize: 12, dorsal: 14, dorsalPos: 0.4, sail: true, bill: true,
        colors: { out: '#132844', body: '#2f5f9e', belly: '#bcd6ee', fin: '#1f3f6e', fin2: '#16305a', eye: '#0b1729', pattern: '#8fd0ff' },
        pattern: 'streaks', mouth: 'bill'
      }
    ],
    Ancient: [
      {
        name: 'Leviathan Fragment', len: 52, hgt: 27, profile: 'whale', fat: 0.58,
        tail: 'whale', tailSize: 13, dorsal: 9, dorsalPos: 0.42, horn: true, runes: true, whiskers: true,
        colors: { out: '#0d2a2c', body: '#1e4e52', belly: '#3f8f86', fin: '#163a3e', fin2: '#0f2c30', eye: '#5fe6d2', pattern: '#5fe6d2', accent: '#aef6ec', glow: '#5fe6d2' },
        pattern: 'runes', mouth: 'jaw'
      },
      {
        name: 'Prism Leviathan', len: 52, hgt: 27, profile: 'whale', fat: 0.58,
        tail: 'whale', tailSize: 13, dorsal: 10, dorsalPos: 0.4, horn: true, runes: true, whiskers: true, prism: true,
        colors: { out: '#1a1c3a', body: '#2a3a6a', belly: '#6ad0e0', fin: '#22305c', fin2: '#182348', eye: '#ffffff', pattern: '#b98fff', accent: '#4fe0cf', glow: '#7fe8ff' },
        pattern: 'prism', mouth: 'jaw'
      }
    ]
  };

  window.FishingData = { RARITIES, FISH, PROFILES };
})();
