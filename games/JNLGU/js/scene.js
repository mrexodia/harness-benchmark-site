// scene.js — the entire island fishing scene, drawn in code at 320x180.
// No image assets: every pixel comes from fillRect / paths.

export const GEO = {
  horizon: 62,
  angler: { x: 110, feetY: 145 },
  rodBase: { x: 116, y: 133 },
  rodTipRest: { x: 151, y: 101 },
  // Where the bobber may land in open water.
  castZone: { xMin: 182, xMax: 244, yMin: 88, yMax: 106 },
};

const C = {
  cloud: '#f8fcff', cloudShade: '#cfe2ec',
  far: '#7ea7ac', farDark: '#5f8d8c', farSand: '#d9c48c',
  waterTop: '#54a9b6', waterMid: '#34879e', waterDeep: '#256a83', waterBot: '#1b4f68',
  foam: '#e8f8f1', sparkle: '#ffffff',
  sand: '#e3c98d', sandDark: '#c9a86a', sandWet: '#a98a52',
  grass1: '#7cbb4e', grass2: '#5b9a39', grass3: '#3f7330', grassDark: '#2b5226',
  woodLight: '#b98a56', wood: '#946037', woodDark: '#643d21', woodEdge: '#452a15',
  rockLight: '#9aa6b0', rock: '#79858f', rockDark: '#58636c',
  skin: '#e8b088', skinShadow: '#cf9169', hair: '#59371f',
  shirt: '#c85a48', shirtDark: '#9c3f34', pants: '#415a7d', pantsDark: '#2f4260',
  hat: '#e6c165', hatDark: '#b99340', hatBand: '#8a5a2b',
  line: '#dbe6ee', bobberRed: '#e0493f', bobberWhite: '#f4f0e6', bobberDark: '#2a2f36',
  lantern: '#ffcf72',
};

// depth-water shading (rows): top -> bottom
const WATER_STOPS = [
  [GEO.horizon, C.waterTop],
  [78, '#4697a9'],
  [100, C.waterMid],
  [126, C.waterDeep],
  [180, C.waterBot],
];

function lerp(a, b, t) { return a + (b - a) * t; }

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return rgbStr(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}

function bandedFill(g, x, y, w, h, stops) {
  for (let row = 0; row < h; row++) {
    const yy = y + row;
    let t = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const [y0, c0] = stops[i];
      const [y1, c1] = stops[i + 1];
      if (yy >= y0 && yy <= y1) { t = (yy - y0) / (y1 - y0); g.fillStyle = mix(c0, c1, t); break; }
      if (yy > y1) g.fillStyle = c1;
    }
    g.fillRect(x, yy, w, 1);
  }
}

function waveY(x, y, t, freq = 0.14, speed = 1.15) {
  return Math.sin(x * freq + y * 0.35 + t * speed)
    + 0.5 * Math.sin(x * 0.07 - y * 0.2 + t * 0.7);
}

// ---------------------------------------------------------------------------
export function drawScene(g, t, view) {
  drawSky(g, t);
  drawSun(g, t);
  drawClouds(g, t);
  drawFarShore(g, t);
  drawWater(g, t, view);
  drawNearRocks(g, t);
  drawDock(g, t, view);
  drawShore(g, t);
  drawAngler(g, t, view);
  drawRig(g, t, view);
  drawForeground(g, t);
  drawBirds(g, t);
  drawEventParticles(g, t, view);
}

// --- sky -------------------------------------------------------------------
const SKY_STOPS = [
  [0, '#2f6fa6'], [16, '#4a92c0'], [30, '#6fb8d3'], [42, '#9ed9d9'],
  [52, '#cfe9cf'], [60, '#f5e2b4'], [GEO.horizon + 1, '#ffe6b0'],
];
function drawSky(g) {
  bandedFill(g, 0, 0, 320, GEO.horizon + 1, SKY_STOPS);
}

// --- sun -------------------------------------------------------------------
function drawSun(g, t) {
  const sx = 66, sy = 26;
  const pulse = 1 + Math.sin(t * 0.8) * 0.03;
  const grad = g.createRadialGradient(sx, sy, 2, sx, sy, 40 * pulse);
  grad.addColorStop(0, 'rgba(255,246,205,0.95)');
  grad.addColorStop(0.25, 'rgba(255,235,160,0.5)');
  grad.addColorStop(0.6, 'rgba(255,224,140,0.18)');
  grad.addColorStop(1, 'rgba(255,224,140,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(sx, sy, 40 * pulse, 0, Math.PI * 2);
  g.fill();
  // pixel core
  g.fillStyle = '#fff6cf';
  g.fillRect(sx - 5, sy - 5, 10, 10);
  g.fillRect(sx - 7, sy - 3, 14, 6);
  g.fillRect(sx - 3, sy - 7, 6, 14);
  g.fillStyle = '#fffbe8';
  g.fillRect(sx - 3, sy - 3, 6, 6);
}

// --- clouds ----------------------------------------------------------------
const CLOUDS = [
  { x: 20, y: 14, s: 0.9, puffs: [[0, 0, 14, 5], [6, -3, 14, 6], [16, 0, 12, 5]] },
  { x: 150, y: 9, s: 0.7, puffs: [[0, 0, 18, 5], [8, -3, 16, 6], [20, 0, 14, 4]] },
  { x: 250, y: 22, s: 1.0, puffs: [[0, 0, 16, 5], [7, -4, 16, 7], [18, 0, 14, 5], [26, 1, 10, 4]] },
];
function drawClouds(g, t) {
  for (const c of CLOUDS) {
    const x = ((c.x + t * 3.2 * c.s) % 380) - 40;
    g.save();
    g.translate(x, c.y);
    g.fillStyle = C.cloudShade;
    for (const [px, py, w, h] of c.puffs) g.fillRect(px, py + 2, w, h);
    g.fillStyle = C.cloud;
    for (const [px, py, w, h] of c.puffs) g.fillRect(px, py, w, h);
    g.restore();
  }
}

// --- far shore -------------------------------------------------------------
function drawFarShore(g, t) {
  // hazy island on the horizon, left of centre
  g.fillStyle = C.farSand;
  g.fillRect(18, 60, 58, 3);
  g.fillStyle = C.far;
  g.beginPath();
  g.moveTo(16, 62);
  g.lineTo(30, 52);
  g.lineTo(40, 56);
  g.lineTo(52, 47);
  g.lineTo(64, 55);
  g.lineTo(76, 51);
  g.lineTo(86, 62);
  g.closePath();
  g.fill();
  g.fillStyle = C.farDark;
  g.beginPath();
  g.moveTo(16, 62);
  g.lineTo(30, 52);
  g.lineTo(36, 62);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(52, 47);
  g.lineTo(64, 55);
  g.lineTo(64, 62);
  g.closePath();
  g.fill();
  // tiny distant palms
  g.strokeStyle = C.farDark;
  g.lineWidth = 1;
  for (const [px, ph] of [[34, 8], [48, 10], [60, 7]]) {
    g.beginPath();
    g.moveTo(px, 53);
    g.quadraticCurveTo(px + 1, 53 - ph, px + 3, 53 - ph);
    g.stroke();
    for (const a of [-0.9, -0.2, 0.6]) {
      g.beginPath();
      g.moveTo(px + 3, 53 - ph);
      g.lineTo(px + 3 + Math.cos(a) * 5, 53 - ph + Math.sin(a) * 3 - 1);
      g.stroke();
    }
  }
}

// --- water -----------------------------------------------------------------
function drawWater(g, t, view) {
  bandedFill(g, 0, GEO.horizon, 320, 180 - GEO.horizon, WATER_STOPS);

  // horizon haze line
  g.fillStyle = 'rgba(255,231,180,0.55)';
  g.fillRect(0, GEO.horizon, 320, 1);
  g.fillStyle = 'rgba(255,246,214,0.25)';
  g.fillRect(0, GEO.horizon + 1, 320, 1);

  // sun glitter path
  const gx = 66;
  for (let y = GEO.horizon + 2; y < 150; y += 2) {
    const spread = 4 + (y - GEO.horizon) * 0.55;
    for (let x = gx - spread; x <= gx + spread; x += 2) {
      const w = waveY(x, y, t, 0.2, 1.4);
      if (w > 0.7) {
        const a = Math.min(0.9, (w - 0.7) * 2) * (1 - (y - GEO.horizon) / 120);
        g.fillStyle = `rgba(255,244,205,${a * 0.7})`;
        g.fillRect(x, y, 2, 1);
      }
    }
  }

  // shimmering wave pixels
  for (let y = GEO.horizon + 4; y < 180; y += 2) {
    const depth = (y - GEO.horizon) / (180 - GEO.horizon);
    for (let x = 0; x < 320; x += 4) {
      const w = waveY(x, y, t, 0.16, 1.05);
      if (w > 0.86) {
        const light = mix('#8fd0cf', '#3f8ea4', depth * 0.8);
        g.fillStyle = light;
        g.fillRect(x, y, 2, 1);
      } else if (w < -1.0) {
        g.fillStyle = mix('#1f566d', '#174257', depth);
        g.fillRect(x, y, 2, 1);
      }
    }
  }

  // a few longer foam crests further out
  for (let i = 0; i < 4; i++) {
    const yy = GEO.horizon + 6 + i * 9;
    const off = (t * (6 + i * 2)) % 320;
    g.fillStyle = 'rgba(232,248,241,0.30)';
    for (let x = -20; x < 320; x += 6) {
      const px = (x + off) % 320;
      if (Math.sin((x + i * 30) * 0.2) > 0.3) g.fillRect(px, yy, 3, 1);
    }
  }
}

// --- rocks in the shallows -------------------------------------------------
function drawNearRocks(g, t) {
  drawRock(g, 30, 132, 24, 12, t);
  drawRock(g, 58, 128, 14, 8, t);
  drawRock(g, 280, 138, 20, 11, t);
}
function drawRock(g, x, y, w, h, t) {
  g.fillStyle = C.rockDark;
  g.beginPath();
  g.moveTo(x - w / 2, y + h);
  g.lineTo(x - w / 2 + 3, y);
  g.lineTo(x + w / 2 - 4, y - 1);
  g.lineTo(x + w / 2, y + h);
  g.closePath();
  g.fill();
  g.fillStyle = C.rock;
  g.beginPath();
  g.moveTo(x - w / 2 + 3, y);
  g.lineTo(x + w / 2 - 4, y - 1);
  g.lineTo(x + w / 2 - 2, y + 3);
  g.lineTo(x - w / 2 + 1, y + 4);
  g.closePath();
  g.fill();
  g.fillStyle = C.rockLight;
  g.fillRect(x - w / 2 + 5, y + 1, 5, 3);
  // lapping water
  g.fillStyle = 'rgba(232,248,241,0.45)';
  const wob = Math.sin(t * 2 + x) * 1;
  g.fillRect(x - w / 2 - 1, y + h + wob, w + 2, 1);
}

// --- dock ------------------------------------------------------------------
function drawDock(g, t, view) {
  const x0 = 54, x1 = 178, topY = 120, frontY = 147, frontH = 8;

  // reflection
  g.fillStyle = 'rgba(10,30,40,0.22)';
  g.fillRect(x0 + 2, frontY + frontH, x1 - x0 - 4, 14);

  // posts into water
  g.fillStyle = C.woodEdge;
  for (const px of [x0 + 5, 112, x1 - 6]) {
    g.fillRect(px, frontY, 4, 24);
    g.fillStyle = C.woodDark;
    g.fillRect(px, frontY, 2, 24);
    g.fillStyle = C.woodEdge;
  }

  // top planks
  g.fillStyle = C.wood;
  g.fillRect(x0, topY, x1 - x0, frontY - topY);
  // plank seams (vertical) + grain
  for (let x = x0; x <= x1; x += 11) {
    g.fillStyle = C.woodDark;
    g.fillRect(x, topY, 1, frontY - topY);
    g.fillStyle = mix(C.wood, C.woodLight, 0.5);
    g.fillRect(x + 1, topY, 1, frontY - topY);
  }
  // horizontal highlight near the far edge, shadow near front
  g.fillStyle = 'rgba(255,226,170,0.16)';
  g.fillRect(x0, topY, x1 - x0, 3);
  g.fillStyle = 'rgba(30,16,6,0.22)';
  g.fillRect(x0, frontY - 5, x1 - x0, 5);

  // front face
  g.fillStyle = C.woodDark;
  g.fillRect(x0, frontY, x1 - x0, frontH);
  g.fillStyle = C.woodEdge;
  g.fillRect(x0, frontY + frontH - 2, x1 - x0, 2);

  // edge lines
  g.fillStyle = C.woodEdge;
  g.fillRect(x0, topY, x1 - x0, 1);
  g.fillRect(x0, topY, 1, frontY - topY + frontH);

  // coiled rope (left)
  g.strokeStyle = '#c9a86a';
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.ellipse(66, 139 + i, 6 - i, 2.4, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // bucket (right)
  const bx = 150, by = 132;
  g.fillStyle = '#7d8a94';
  g.fillRect(bx, by, 12, 10);
  g.fillStyle = '#5c6871';
  g.fillRect(bx, by + 7, 12, 3);
  g.fillStyle = '#aab6bf';
  g.fillRect(bx, by, 12, 2);
  g.strokeStyle = '#4a555d';
  g.beginPath();
  g.arc(bx + 6, by, 6, Math.PI, 0);
  g.stroke();
  // water in bucket
  g.fillStyle = '#3f8ea4';
  g.fillRect(bx + 2, by + 3, 8, 2);

  // lantern post at the right end
  const lx = 172;
  g.fillStyle = C.woodDark;
  g.fillRect(lx, topY - 26, 3, 26);
  g.fillStyle = C.woodEdge;
  g.fillRect(lx, topY - 26, 1, 26);
  g.fillStyle = '#3a2a16';
  g.fillRect(lx - 4, topY - 27, 11, 2);
  const flick = 0.7 + 0.3 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23);
  const lg = g.createRadialGradient(lx + 1, topY - 18, 0, lx + 1, topY - 18, 14);
  lg.addColorStop(0, `rgba(255,207,114,${0.5 * flick})`);
  lg.addColorStop(1, 'rgba(255,207,114,0)');
  g.fillStyle = lg;
  g.beginPath();
  g.arc(lx + 1, topY - 18, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = C.lantern;
  g.fillRect(lx - 2, topY - 23, 7, 8);
  g.fillStyle = '#fff0c0';
  g.fillRect(lx, topY - 21, 3, 4);
  g.fillStyle = '#3a2a16';
  g.fillRect(lx - 3, topY - 15, 9, 2);
}

// --- near shore / vegetation ----------------------------------------------
function drawShore(g, t) {
  // foreground bank along the bottom
  g.fillStyle = C.grassDark;
  g.beginPath();
  g.moveTo(0, 180);
  g.lineTo(0, 162);
  g.quadraticCurveTo(40, 156, 80, 160);
  g.quadraticCurveTo(130, 165, 180, 159);
  g.quadraticCurveTo(230, 153, 280, 159);
  g.quadraticCurveTo(305, 162, 320, 158);
  g.lineTo(320, 180);
  g.closePath();
  g.fill();

  // lit top edge
  g.fillStyle = C.grass2;
  g.beginPath();
  g.moveTo(0, 162);
  g.quadraticCurveTo(40, 157, 80, 161);
  g.quadraticCurveTo(130, 166, 180, 160);
  g.quadraticCurveTo(230, 154, 280, 160);
  g.quadraticCurveTo(305, 163, 320, 159);
  g.lineTo(320, 165);
  g.quadraticCurveTo(300, 168, 280, 166);
  g.quadraticCurveTo(230, 160, 180, 166);
  g.quadraticCurveTo(130, 172, 80, 167);
  g.quadraticCurveTo(40, 163, 0, 168);
  g.closePath();
  g.fill();

  // grass tufts
  for (let i = 0; i < 46; i++) {
    const x = (i * 37) % 320;
    const base = 162 + Math.sin(x * 0.05) * 4 + ((i * 13) % 7);
    const h = 3 + ((i * 7) % 5);
    const sway = Math.sin(t * 2 + i) * 0.8;
    g.strokeStyle = i % 3 === 0 ? C.grass1 : C.grass2;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, base + h);
    g.quadraticCurveTo(x + sway, base + h / 2, x + sway * 1.6, base);
    g.stroke();
  }

  // bushes on the left
  drawBush(g, 14, 156, 26, 16, t);
  drawBush(g, 44, 160, 20, 12, t + 1);
  // rocks
  drawRockEdge(g, 74, 164, 16, 9);
  drawRockEdge(g, 200, 166, 12, 7);

  // a leaning palm on the right
  drawPalm(g, t);

  // tall reeds near centre-right
  for (let i = 0; i < 7; i++) {
    const x = 250 + i * 5;
    const base = 161 + ((i * 5) % 4);
    const h = 26 + ((i * 9) % 16);
    const sway = Math.sin(t * 1.3 + i * 0.7) * 3;
    g.strokeStyle = i % 2 ? C.grass3 : C.grass2;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, base);
    g.quadraticCurveTo(x + sway * 0.4, base - h * 0.6, x + sway, base - h);
    g.stroke();
    g.fillStyle = '#6b4a22';
    g.fillRect(x + sway - 1, base - h - 2, 2, 4);
  }
}

function drawBush(g, x, y, w, h, t) {
  g.fillStyle = C.grass3;
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.quadraticCurveTo(x - w / 2, y - h, x, y - h);
  g.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y);
  g.closePath();
  g.fill();
  g.fillStyle = C.grass2;
  g.beginPath();
  g.moveTo(x - w / 2 + 3, y - 1);
  g.quadraticCurveTo(x - w / 2 + 2, y - h + 5, x, y - h + 2);
  g.quadraticCurveTo(x + w / 4, y - h + 4, x + w / 2 - 2, y - 1);
  g.closePath();
  g.fill();
  g.fillStyle = C.grass1;
  g.fillRect(x - 5, y - h + 3, 4, 3);
  g.fillRect(x + 3, y - h + 5, 5, 3);
}

function drawRockEdge(g, x, y, w, h) {
  g.fillStyle = C.rockDark;
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.lineTo(x - w / 2 + 2, y - h);
  g.lineTo(x + w / 2 - 3, y - h - 1);
  g.lineTo(x + w / 2, y);
  g.closePath();
  g.fill();
  g.fillStyle = C.rock;
  g.fillRect(x - w / 2 + 2, y - h, w - 5, 2);
  g.fillStyle = C.rockLight;
  g.fillRect(x - w / 2 + 3, y - h + 1, 4, 2);
}

function drawPalm(g, t) {
  const bx = 300, by = 180, tx = 272, ty = 82;
  // trunk
  g.strokeStyle = '#6b4a26';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(bx, by);
  g.quadraticCurveTo(bx - 6, 130, tx, ty);
  g.stroke();
  g.strokeStyle = '#8a6234';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(bx - 1, by);
  g.quadraticCurveTo(bx - 7, 130, tx - 1, ty);
  g.stroke();
  // trunk rings
  g.strokeStyle = '#54391d';
  g.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const p = i / 8;
    const px = lerp(bx, tx, p) - Math.sin(p * Math.PI) * 5;
    const py = lerp(by, ty, p);
    g.beginPath();
    g.moveTo(px - 3, py);
    g.lineTo(px + 3, py - 2);
    g.stroke();
  }
  // fronds
  const fronds = [
    [-1.9, 40], [-1.4, 46], [-0.8, 44], [-0.2, 40], [0.4, 42], [1.0, 38],
  ];
  for (let i = 0; i < fronds.length; i++) {
    const [ang, len] = fronds[i];
    const sway = Math.sin(t * 1.1 + i) * 2;
    const ex = tx + Math.cos(ang) * len + sway;
    const ey = ty + Math.sin(ang) * len * 0.5 + len * 0.1;
    g.strokeStyle = i % 2 ? '#2f6b2c' : '#3f8130';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(ang) * len * 0.55, ty + Math.sin(ang) * len * 0.2 - 6, ex, ey);
    g.stroke();
    // leaflets
    g.lineWidth = 1;
    for (let s = 0.25; s < 1; s += 0.16) {
      const mx = tx + Math.cos(ang) * len * 0.55 * (s * 2);
      const my = ty + Math.sin(ang) * len * 0.2 * (s * 2) - 6 * s;
      const nx = lerp(tx, ex, s) - 1;
      const ny = lerp(ty, ey, s) - 2;
      g.beginPath();
      g.moveTo(nx, ny);
      g.lineTo(nx + Math.cos(ang + 1.3) * 5, ny + Math.sin(ang + 1.3) * 5);
      g.stroke();
      g.beginPath();
      g.moveTo(nx, ny);
      g.lineTo(nx + Math.cos(ang - 1.3) * 5, ny + Math.sin(ang - 1.3) * 5);
      g.stroke();
    }
  }
  // coconuts
  g.fillStyle = '#5a3a1c';
  g.beginPath(); g.arc(tx + 3, ty + 4, 3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(tx - 4, ty + 5, 2.5, 0, Math.PI * 2); g.fill();
}

// --- angler ----------------------------------------------------------------
// Returns the current rod tip in scene coordinates.
export function rodTip(t, view) {
  const base = GEO.rodBase;
  let tipX = GEO.rodTipRest.x;
  let tipY = GEO.rodTipRest.y + Math.sin(t * 1.6) * 0.8;
  if (view.casting) {
    const p = view.castProgress;
    // back-swing then whip forward
    const swing = Math.sin(Math.min(1, p) * Math.PI);
    tipX = GEO.rodTipRest.x - swing * 10;
    tipY = GEO.rodTipRest.y - swing * 7;
  } else if (view.state === 'bite') {
    const bend = 1 + view.biteDip * 4;
    tipX = GEO.rodTipRest.x + bend;
    tipY = GEO.rodTipRest.y + bend * 2.4;
  } else if (view.state === 'reeling' && !view.miss) {
    tipX = GEO.rodTipRest.x - 4;
    tipY = GEO.rodTipRest.y + 5;
  }
  return { x: tipX, y: tipY, base };
}

// The angler is painted into a little offscreen sprite, then stamped with a dark
// outline so the silhouette always reads against the dock and water.
let _anglerCv = null, _anglerOut = null;
function anglerSprites() {
  if (!_anglerCv) {
    _anglerCv = document.createElement('canvas');
    _anglerCv.width = 44; _anglerCv.height = 44;
    _anglerOut = document.createElement('canvas');
    _anglerOut.width = 44; _anglerOut.height = 44;
  }
  return [_anglerCv, _anglerOut];
}

function paintAngler(g, t, view) {
  const breathe = Math.sin(t * 1.6) * 0.5;

  // legs
  g.fillStyle = C.pantsDark;
  g.fillRect(-4, -9, 3, 8);
  g.fillRect(2, -9, 3, 8);
  g.fillStyle = C.pants;
  g.fillRect(-4, -9, 3, 5);
  g.fillRect(2, -9, 3, 5);
  // boots
  g.fillStyle = '#2a2027';
  g.fillRect(-5, -1, 4, 2);
  g.fillRect(2, -1, 5, 2);

  // torso
  g.fillStyle = C.shirtDark;
  g.fillRect(-6, -18 + breathe * 0.3, 12, 10);
  g.fillStyle = C.shirt;
  g.fillRect(-5, -18 + breathe * 0.3, 10, 8);
  g.fillStyle = C.shirtDark;
  g.fillRect(-5, -10, 10, 2); // belt shadow
  g.fillStyle = '#f0e2c0';
  g.fillRect(-1, -18, 2, 6); // button placket

  // left arm (down)
  g.fillStyle = C.shirtDark;
  g.fillRect(-8, -17, 3, 8);
  g.fillStyle = C.skin;
  g.fillRect(-8, -10, 3, 3);

  // right arm reaching to rod
  g.fillStyle = C.shirt;
  g.beginPath();
  g.moveTo(4, -17);
  g.lineTo(9, -15);
  g.lineTo(8, -12);
  g.lineTo(4, -13);
  g.closePath();
  g.fill();
  g.fillStyle = C.skin;
  g.fillRect(7, -15, 3, 3);

  // head
  const hy = -24 + breathe * 0.4;
  g.fillStyle = C.skin;
  g.fillRect(-4, hy, 8, 7);
  g.fillStyle = C.skinShadow;
  g.fillRect(-4, hy + 5, 8, 2);
  // hair sideburn
  g.fillStyle = C.hair;
  g.fillRect(-5, hy + 1, 2, 5);
  // eye (facing right)
  g.fillStyle = '#2b2016';
  g.fillRect(2, hy + 3, 1, 2);
  g.fillRect(-1, hy + 3, 1, 2);
  // cheeks
  g.fillStyle = 'rgba(210,110,90,0.5)';
  g.fillRect(3, hy + 5, 1, 1);

  // straw hat
  g.fillStyle = C.hatDark;
  g.fillRect(-8, hy - 1, 16, 3);
  g.fillStyle = C.hat;
  g.fillRect(-8, hy - 2, 16, 2);
  g.fillRect(-4, hy - 6, 9, 5);
  g.fillStyle = C.hatDark;
  g.fillRect(-4, hy - 6, 9, 1);
  g.fillStyle = C.hatBand;
  g.fillRect(-4, hy - 3, 9, 1);
}

function drawAngler(g, t, view) {
  const [cv, out] = anglerSprites();
  const S = 22, BASE = 38; // sprite origin (feet)

  const a = cv.getContext('2d');
  a.clearRect(0, 0, cv.width, cv.height);
  a.save();
  a.translate(S, BASE);
  paintAngler(a, t, view);
  a.restore();

  const o = out.getContext('2d');
  o.clearRect(0, 0, out.width, out.height);
  o.globalCompositeOperation = 'source-over';
  o.drawImage(cv, 0, 0);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = '#1b120a';
  o.fillRect(0, 0, out.width, out.height);
  o.globalCompositeOperation = 'source-over';

  const lean = view.state === 'reeling' && !view.miss ? -1 : 0;
  const ax = GEO.angler.x + lean;
  const ay = GEO.angler.feetY;

  // shadow on the dock
  g.fillStyle = 'rgba(20,12,4,0.4)';
  g.beginPath();
  g.ellipse(ax + 1, ay + 1, 8, 2.6, 0, 0, Math.PI * 2);
  g.fill();

  const dx = ax - S, dy = ay - BASE;
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.drawImage(out, dx + ox, dy + oy);
  }
  g.drawImage(cv, dx, dy);
}

// --- fishing rig -----------------------------------------------------------
function drawRig(g, t, view) {
  const tip = rodTip(t, view);
  const b = view.bobber;

  // rod itself
  g.strokeStyle = '#5a3d20';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(GEO.rodBase.x - 2, GEO.rodBase.y + 3);
  g.quadraticCurveTo(tip.base.x + (tip.x - tip.base.x) * 0.4, tip.base.y + (tip.y - tip.base.y) * 0.5, tip.x, tip.y);
  g.stroke();
  g.strokeStyle = '#8a6234';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(GEO.rodBase.x - 2, GEO.rodBase.y + 3);
  g.quadraticCurveTo(tip.base.x + (tip.x - tip.base.x) * 0.4, tip.base.y + (tip.y - tip.base.y) * 0.5 - 1, tip.x, tip.y - 1);
  g.stroke();

  if (!view.lineVisible) return;

  // fishing line
  g.strokeStyle = C.line;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(tip.x, tip.y);
  const sag = view.state === 'bite' ? 0 : 1.5;
  const mx = (tip.x + b.x) / 2;
  const my = (tip.y + b.y) / 2 + sag;
  g.quadraticCurveTo(mx, my, b.x, b.y - 3);
  g.stroke();

  drawBobber(g, t, view, b);
}

function drawBobber(g, t, view, b) {
  const bob = view.state === 'ready' ? 0 : Math.sin(t * 2.4) * 0.8;
  const x = Math.round(b.x);
  const y = Math.round(b.y + bob + view.bobberSub);

  // splash rings
  if (view.bobberSub > 0.2 || view.state === 'bite') {
    const r = view.state === 'bite' ? 3 + ((t * 14) % 6) : 3;
    g.strokeStyle = 'rgba(232,248,241,0.8)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(x, Math.round(b.y) + 2, r, r * 0.4, 0, 0, Math.PI * 2);
    g.stroke();
    if (view.state === 'bite') {
      g.strokeStyle = 'rgba(232,248,241,0.45)';
      g.beginPath();
      g.ellipse(x, Math.round(b.y) + 2, r + 5, (r + 5) * 0.4, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }

  // body
  g.fillStyle = C.bobberDark;
  g.fillRect(x - 2, y - 3, 4, 7);
  g.fillStyle = C.bobberRed;
  g.fillRect(x - 2, y - 3, 4, 3);
  g.fillStyle = C.bobberWhite;
  g.fillRect(x - 2, y, 4, 3);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillRect(x - 1, y, 1, 2);
  // antenna
  g.fillStyle = C.bobberDark;
  g.fillRect(x, y - 6, 1, 3);
  g.fillStyle = '#ffd24d';
  g.fillRect(x, y - 7, 1, 1);

  // bite cue: exclamation above bobber
  if (view.state === 'bite') {
    const bobY = Math.round(Math.sin(t * 12) * 1);
    g.fillStyle = '#fff3b0';
    g.fillRect(x - 1, y - 20 + bobY, 3, 6);
    g.fillRect(x - 1, y - 12 + bobY, 3, 3);
    g.fillStyle = '#e0493f';
    g.fillRect(x - 1, y - 19 + bobY, 1, 4);
  }
}

// --- foreground reeds ------------------------------------------------------
function drawForeground(g, t) {
  // dark blades along the very bottom for depth
  for (let i = 0; i < 10; i++) {
    const x = i * 34 + 8;
    const h = 12 + ((i * 11) % 14);
    const sway = Math.sin(t * 1.4 + i * 1.1) * 2;
    g.strokeStyle = 'rgba(22,44,26,0.9)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, 181);
    g.quadraticCurveTo(x + sway, 181 - h * 0.6, x + sway * 1.5, 181 - h);
    g.stroke();
  }
}

// --- birds -----------------------------------------------------------------
function drawBirds(g, t) {
  g.strokeStyle = 'rgba(50,70,80,0.7)';
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 90 + t * 6) % 380) - 30;
    const y = 22 + i * 7 + Math.sin(t + i) * 1.5;
    const flap = Math.sin(t * 6 + i * 2);
    g.beginPath();
    g.moveTo(x - 3, y + flap);
    g.lineTo(x, y);
    g.lineTo(x + 3, y + flap);
    g.stroke();
  }
}

// --- event particles (splash on catch/miss) --------------------------------
function drawEventParticles(g, t, view) {
  if (view.splashT > 0) {
    const p = view.splashT;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = (1 - p) * 18;
      const x = view.bobber.x + Math.cos(a) * r;
      const y = view.bobber.y + Math.sin(a) * r * 0.5 - (1 - p) * 8;
      g.fillStyle = `rgba(232,248,241,${p})`;
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
}
