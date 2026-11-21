// The island fishing spot. Everything is drawn in code on a 320x180 pixel grid.

export const W = 320, H = 180;
export const HORIZON = 44;

// Angler anchor (feet position on the dock).
export const ANGLER = { x: 54, feetY: 124 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (n) => { const s = Math.sin(n * 127.1 + 13.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------------------
// Water / sky palettes
// ---------------------------------------------------------------------------
const SKY_TOP = [122, 190, 214];
const SKY_BOT = [255, 228, 176];
const FAR_WATER = [143, 198, 212];
const NEAR_WATER = [47, 113, 134];
const DEEP_WATER = [34, 86, 108];

function mixc(a, b, k) {
  return `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
}

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function drawSky(ctx, t) {
  const bands = 11;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    // ease toward warm horizon
    rect(ctx, 0, Math.floor((HORIZON * i) / bands), W, Math.ceil(HORIZON / bands) + 1, mixc(SKY_TOP, SKY_BOT, k * k * 0.8 + k * 0.2));
  }
  // Sun
  const sx = 256, sy = 20;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff2c4';
  for (let r = 16; r > 0; r -= 2) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  rect(ctx, sx - 6, sy - 6, 12, 12, '#fff6d8');
  rect(ctx, sx - 7, sy - 5, 14, 10, '#fff6d8');
  rect(ctx, sx - 5, sy - 7, 10, 14, '#fff6d8');

  // Clouds
  const cloud = (cx, cy, s, drift) => {
    const x = ((cx + t * drift) % (W + 70)) - 35;
    ctx.globalAlpha = 0.85;
    rect(ctx, x, cy, 16 * s, 3 * s, '#ffffff');
    rect(ctx, x + 3 * s, cy - 3 * s, 10 * s, 3 * s, '#ffffff');
    rect(ctx, x + 7 * s, cy, 12 * s, 3 * s, '#f2f8fb');
    rect(ctx, x + 2 * s, cy + 3 * s, 13 * s, 2 * s, '#e6f0f6');
    ctx.globalAlpha = 1;
  };
  cloud(30, 12, 1.1, 1.2);
  cloud(150, 8, 0.8, 0.8);
  cloud(220, 26, 0.6, 1.6);

  // Birds
  for (let i = 0; i < 3; i++) {
    const bx = ((t * 6 + i * 90) % (W + 30)) - 15;
    const by = 16 + Math.sin(t * 0.7 + i) * 2 + i * 3;
    const flap = Math.sin(t * 6 + i) > 0 ? 1 : 0;
    rect(ctx, bx, by, 2, 1, '#4a5a66');
    rect(ctx, bx - 1, by - flap, 2, 1, '#4a5a66');
    rect(ctx, bx + 1, by - flap, 2, 1, '#4a5a66');
  }

  // Distant island + hills
  const island = (cx, cy, w, h, col) => {
    ctx.fillStyle = col;
    for (let x = -w; x <= w; x++) {
      const hh = Math.round(h * Math.sqrt(Math.max(0, 1 - (x / w) ** 2)));
      ctx.fillRect(cx + x, cy - hh, 1, hh + 1);
    }
  };
  island(232, HORIZON, 40, 11, '#7fa98c');
  island(252, HORIZON, 26, 15, '#6c9a7e');
  island(60, HORIZON, 30, 7, '#8fb59a');
  rect(ctx, 0, HORIZON - 7, W, 7, '#9cc0a2');
  rect(ctx, 0, HORIZON - 4, W, 4, '#83ab8c');

  // Tiny trees on the far shore
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i * 3.1) * W);
    const y = HORIZON - 6 - Math.floor(hash(i * 7.7) * 2);
    rect(ctx, x, y, 1, 4, '#4f7458');
    rect(ctx, x - 1, y - 2, 3, 3, '#5d8a66');
  }
}

function drawWater(ctx, t, scene) {
  // Gradient bands
  const top = HORIZON, bands = 20;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    let c;
    if (k < 0.5) c = mixc(FAR_WATER, NEAR_WATER, k / 0.5);
    else c = mixc(NEAR_WATER, DEEP_WATER, (k - 0.5) / 0.5);
    const y0 = top + Math.floor(((H - top) * i) / bands);
    const y1 = top + Math.floor(((H - top) * (i + 1)) / bands);
    rect(ctx, 0, y0, W, y1 - y0 + 1, c);
  }

  // Animated ripple strokes, denser near the horizon
  ctx.globalAlpha = 0.16;
  for (let y = top + 3; y < H; y += 4) {
    const depth = (y - top) / (H - top);
    const count = 3 + Math.floor(depth * 3);
    for (let i = 0; i < count; i++) {
      const seed = y * 13.3 + i * 41.7;
      const speed = 6 + depth * 10;
      const x = ((hash(seed) * W + t * speed * (i % 2 ? 1 : -1)) % (W + 40) + W + 40) % (W + 40) - 20;
      const len = 4 + Math.floor(hash(seed + 2.2) * 10 * (0.5 + depth));
      rect(ctx, Math.floor(x), y, len, 1, '#d6f2f0');
    }
  }
  // bright sparkles
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) {
    const seed = i * 17.9;
    const x = Math.floor(hash(seed) * W);
    const y = top + 4 + Math.floor(hash(seed + 3.3) * (H - top - 6));
    const tw = Math.sin(t * 1.6 + i * 2.4);
    if (tw > 0.55) rect(ctx, x, y, 2, 1, '#ffffff');
  }
  ctx.globalAlpha = 1;

  // Water around the dock supports gets a little darker
  ctx.globalAlpha = 0.22;
  rect(ctx, 0, 118, 132, 26, '#1d4a5c');
  ctx.globalAlpha = 1;
}

function drawShore(ctx, t) {
  // Left grassy bank / shoreline
  const bank = (ctx) => {
    ctx.fillStyle = '#4a7d43';
    for (let y = 96; y < H; y++) {
      const w = Math.round(20 + (y - 96) * 0.34 + Math.sin(y * 0.35) * 2);
      ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = '#3c6a39';
    for (let y = 100; y < H; y++) {
      const w = Math.round(20 + (y - 96) * 0.34 + Math.sin(y * 0.35) * 2);
      ctx.fillRect(0, y, Math.max(0, w - 6), 1);
    }
    // sandy edge
    ctx.fillStyle = '#c9b787';
    for (let y = 96; y < H; y++) {
      const w = Math.round(20 + (y - 96) * 0.34 + Math.sin(y * 0.35) * 2);
      ctx.fillRect(w - 2, y, 3, 1);
    }
  };
  bank(ctx);
}

function drawReeds(ctx, t, x0, yBase, count, scale, dark) {
  for (let i = 0; i < count; i++) {
    const x = x0 + i * 7 * scale + (i % 2);
    const hgt = (14 + Math.floor(hash(i * 5.5 + x0) * 12)) * scale;
    const sway = Math.sin(t * 1.2 + i * 0.9 + x0) * 1.6;
    const col = dark ? '#2f5a34' : '#4f8a43';
    for (let y = 0; y < hgt; y++) {
      const xx = Math.round(x + sway * (y / hgt));
      rect(ctx, xx, yBase - y, 1, 1, col);
    }
    // seed head
    const tipX = Math.round(x + sway);
    rect(ctx, tipX, yBase - hgt - 3, 2, 4, dark ? '#5a3f28' : '#7a5636');
  }
}

function drawVegetation(ctx, t) {
  // Big leafy tree on the left
  const tx = 18, ty = 96;
  rect(ctx, tx - 2, ty - 14, 4, 20, '#5c4029');
  rect(ctx, tx - 1, ty - 14, 1, 20, '#6f5033');
  const foliage = (cx, cy, r, c1, c2) => {
    ctx.fillStyle = c1;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if ((x * x) / (r * r) + (y * y) / (r * 0.8) ** 2 <= 1) {
          const wob = Math.sin(t * 0.8 + x * 0.3 + y * 0.2) * 0.6;
          if (x + y + wob < -1) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
    ctx.fillStyle = c2;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if ((x * x) / (r * r) + (y * y) / (r * 0.8) ** 2 <= 1) {
          if (x + y > 1) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
  };
  foliage(10, 74, 13, '#4f8a4b', '#3c6d3c');
  foliage(26, 70, 15, '#57964f', '#427541');
  foliage(18, 60, 12, '#63a457', '#4a8046');
  foliage(34, 82, 10, '#4f8a4b', '#3c6d3c');
  // highlights
  ctx.fillStyle = '#7cbe67';
  for (let i = 0; i < 30; i++) {
    const a = hash(i * 2.3) * Math.PI * 2, rr = hash(i * 9.1) * 16;
    const x = Math.round(20 + Math.cos(a) * rr);
    const y = Math.round(68 + Math.sin(a) * rr * 0.7);
    ctx.fillRect(x, y, 1, 1);
  }

  // Bushes at the base of the dock
  ctx.fillStyle = '#3f7a3d';
  for (let i = 0; i < 6; i++) {
    const cx = 8 + i * 6, cy = 100 - (i % 3) * 3;
    for (let y = -6; y <= 4; y++) for (let x = -5; x <= 5; x++) {
      if ((x * x) / 25 + (y * y) / 16 <= 1) rect(ctx, cx + x, cy + y, 1, 1, i % 2 ? '#3f7a3d' : '#4c8c45');
    }
  }
  // Flowers
  const flowers = [[6, 96], [14, 94], [24, 98], [34, 101], [44, 99]];
  for (const [fx, fy] of flowers) {
    const bob = Math.sin(t * 2 + fx) > 0 ? 0 : 1;
    rect(ctx, fx, fy + bob, 1, 1, '#f2d24a');
    rect(ctx, fx + 1, fy - 1 + bob, 1, 1, '#e86a8a');
  }

  // Reeds in the water bottoms, framing the shot
  drawReeds(ctx, t, 4, 178, 6, 1.4, true);
  drawReeds(ctx, t, 96, 176, 4, 1.1, true);
  drawReeds(ctx, t, 286, 179, 5, 1.3, false);

  // Lily pads
  for (let i = 0; i < 7; i++) {
    const lx = 130 + i * 26 + Math.floor(hash(i * 3.1) * 8);
    const ly = 140 + Math.floor(hash(i * 7.3) * 30);
    const bob = Math.sin(t * 1.2 + i) * 1;
    const c = i % 2 ? '#3f8a52' : '#4ea05e';
    ctx.fillStyle = c;
    for (let y = -3; y <= 3; y++) {
      const w = Math.round(6 * Math.sqrt(Math.max(0, 1 - (y / 3) ** 2)));
      ctx.fillRect(lx - w, Math.round(ly + bob) + y, w * 2, 1);
    }
    // notch
    rect(ctx, lx, Math.round(ly + bob) - 1, 3, 3, 'rgba(30,70,84,0.55)');
    rect(ctx, lx + 1, Math.round(ly + bob), 3, 1, 'rgba(30,70,84,0.55)');
    // pad highlight
    rect(ctx, lx - 3, Math.round(ly + bob) - 2, 3, 1, '#6cbf78');
  }

  // A couple of rocks
  const rock = (rx, ry, s) => {
    ctx.fillStyle = '#7a7f86';
    for (let y = -s; y <= s; y++) for (let x = -s * 2; x <= s * 2; x++) {
      if ((x * x) / (4 * s * s) + (y * y) / (s * s) <= 1) ctx.fillRect(rx + x, ry + y, 1, 1);
    }
    ctx.fillStyle = '#9aa0a8';
    for (let x = -s; x <= s; x++) ctx.fillRect(rx + x, ry - s + 1, 1, 1);
  };
  rock(78, 158, 4);
  rock(260, 166, 5);
  rock(292, 150, 3);
}

function drawDock(ctx, t) {
  const x0 = 0, x1 = 124, yTop = 120, yBot = 138;
  // Shadow on the water
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#12333f';
  ctx.fillRect(x0 + 6, yBot + 2, x1 - x0, 8);
  ctx.globalAlpha = 1;

  // Posts going down into water
  for (let px = 10; px <= 118; px += 18) {
    const depth = 12 + (px / x1) * 6;
    rect(ctx, px, yTop + 2, 5, depth, '#4a3223');
    rect(ctx, px, yTop + 2, 2, depth, '#6b4a32');
    // post cap
    rect(ctx, px - 1, yTop - 2, 7, 4, '#7a5238');
  }

  // Platform planks
  rect(ctx, x0, yTop, x1 - x0, yBot - yTop, '#6d4a32');
  const planks = Math.floor((yBot - yTop) / 5);
  for (let i = 0; i < planks; i++) {
    const y = yTop + i * 5;
    rect(ctx, x0, y, x1 - x0, 4, i % 2 ? '#8a5c3c' : '#7d5236');
    rect(ctx, x0, y, x1 - x0, 1, i % 2 ? '#a06e48' : '#946340');
    // plank seams
    for (let sx = 14; sx < x1; sx += 34) rect(ctx, sx, y, 1, 4, '#5a3b28');
  }
  // end beam
  rect(ctx, x1 - 6, yTop, 6, yBot - yTop, '#5a3b28');
  // rope rail
  rect(ctx, x0, yTop - 6, 4, 8, '#5a3b28');
  rect(ctx, 4, yTop - 5, 116, 1, '#caa96a');
  rect(ctx, 4, yTop - 3, 116, 1, '#b08f52');

  // A bucket and tackle box for warmth
  rect(ctx, 100, yTop - 8, 8, 8, '#7d8a92');
  rect(ctx, 100, yTop - 9, 8, 2, '#99a6ae');
  rect(ctx, 102, yTop - 11, 4, 2, '#5f6a71');
  rect(ctx, 84, yTop - 6, 11, 6, '#8a5c3c');
  rect(ctx, 84, yTop - 7, 11, 2, '#a06e48');
  rect(ctx, 88, yTop - 5, 3, 2, '#d8c078');
  // Coil of rope
  ctx.strokeStyle = '#c9ab6d'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(74, yTop - 2, 3.5, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(74, yTop - 2, 1.5, 0, 7); ctx.stroke();

  // Sleeping cat curled by the tackle box
  const catBob = Math.sin(t * 1.1) * 0.4;
  const cx0 = 70, cy0 = yTop - 2 + catBob;
  ctx.fillStyle = '#e6b45e';
  for (let y = -3; y <= 2; y++) for (let x = -5; x <= 4; x++) {
    if ((x * x) / 25 + (y * y) / 9 <= 1) rect(ctx, cx0 + x, cy0 + y, 1, 1, '#e6b45e');
  }
  ctx.fillStyle = '#f0cf8a';
  rect(ctx, cx0 - 4, cy0 - 2, 3, 2, '#f0cf8a');
  // tabby stripes
  for (let i = 0; i < 4; i++) rect(ctx, cx0 - 2 + i * 2, cy0 - 2, 1, 4, '#c98f3c');
  // ears + head
  rect(ctx, cx0 - 5, cy0 - 4, 1, 2, '#e6b45e');
  rect(ctx, cx0 - 3, cy0 - 4, 1, 2, '#e6b45e');
  // tail
  rect(ctx, cx0 + 4, cy0 - 1, 3, 1, '#e6b45e');
  rect(ctx, cx0 + 6, cy0 - 2, 1, 2, '#e6b45e');
}

// ---------------------------------------------------------------------------
// Angler
// ---------------------------------------------------------------------------
const SKIN = '#e8b184', SKIN_D = '#c98d5f';
const JACKET = '#4f7d63', JACKET_D = '#3b5f4b';
const PANTS = '#46567a', BOOT = '#3a2f2a';
const HAT = '#dca94a', HAT_D = '#a9702e', HAT_BRIM = '#c08a38';

// Returns the current rod tip position (world coords).
export function rodTip(g) {
  const ax = ANGLER.x, fy = ANGLER.feetY;
  const hx = ax + 2, hy = fy - 12;
  let dx = 32, dy = -16;
  if (g.casting) {
    const p = clamp(g.castProg, 0, 1);
    // windup then forward
    const a = lerp(-0.55, 0.15, clamp(p * 1.4, 0, 1));
    const len = lerp(24, 36, clamp(p * 1.4, 0, 1));
    dx = Math.cos(a) * len;
    dy = -Math.abs(Math.sin(a + 0.9)) * len;
  } else if (g.state === 'reeling') {
    dx = 24 + Math.sin(g.t * 14) * 1.5;
    dy = -6;
  } else if (g.state === 'bite') {
    dx = 29; dy = -12 + Math.sin(g.t * 20) * 0.8;
  }
  return { x: Math.round(hx + dx), y: Math.round(hy + dy) };
}

function drawAngler(ctx, t, g) {
  const { x: ax, feetY: fy } = ANGLER;
  const bob = Math.sin(t * 1.6) * 0.5 + (g.state === 'ready' ? Math.sin(t * 0.9) * 0.4 : 0);
  const oy = Math.round(bob);
  const lean = g.state === 'reeling' ? -1 : 0;
  const px = (dx, y, w, h, c) => rect(ctx, Math.round(ax + dx + lean), Math.round(fy + y + oy), w, h, c);

  // Shadow
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#12333f';
  ctx.beginPath();
  ctx.ellipse(ax + 2, fy + 1, 11, 3, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Boots
  px(-5, -3, 5, 3, BOOT);
  px(2, -3, 5, 3, BOOT);
  px(-5, -3, 5, 1, '#4a3d34');
  // Legs
  px(-5, -9, 4, 7, PANTS);
  px(2, -9, 4, 7, PANTS);
  px(-5, -9, 1, 7, '#35415c');
  px(2, -9, 1, 7, '#35415c');
  // Torso (jacket)
  px(-6, -16, 12, 8, JACKET);
  px(-6, -16, 12, 2, '#5f9175');
  px(-6, -9, 12, 1, JACKET_D);
  px(5, -16, 1, 8, JACKET_D);
  // collar / scarf
  px(-3, -16, 6, 2, '#c96a4a');
  // Head
  px(-4, -22, 8, 7, SKIN);
  px(-4, -22, 1, 7, SKIN_D);
  // Face (facing right)
  px(3, -20, 1, 2, '#2a1e1a'); // eye
  px(3, -17, 2, 1, SKIN_D);    // nose/mouth hint
  // Hair at the back
  px(-5, -22, 2, 5, '#5a3a26');
  // Hat
  px(-7, -23, 14, 2, HAT_BRIM);
  px(-4, -28, 9, 5, HAT);
  px(-4, -28, 9, 2, '#f0c869');
  px(-4, -24, 9, 1, HAT_D);
  px(2, -27, 2, 4, '#c96a4a'); // hat band
  // Arm (front) from shoulder to hands
  const hands = { x: ax + 2 + lean, y: fy - 12 + oy };
  drawLimb(ctx, ax + 4 + lean, fy - 15 + oy, hands.x + 2, hands.y, 2, JACKET);
  ctx.fillStyle = SKIN;
  ctx.fillRect(hands.x, hands.y - 1, 3, 3);

  // Back arm when casting
  if (g.casting && g.castProg < 0.4) {
    drawLimb(ctx, ax + 4 + lean, fy - 15 + oy, ax + 9, fy - 20 + oy, 2, JACKET_D);
    ctx.fillStyle = SKIN;
    ctx.fillRect(ax + 8, fy - 21 + oy, 3, 3);
  }

  // Reeling crank animation
  if (g.state === 'reeling') {
    const a = t * 14;
    const hx = ax + 12, hy = fy - 11 + oy;
    ctx.fillStyle = SKIN;
    ctx.fillRect(Math.round(hx + Math.cos(a) * 2), Math.round(hy + Math.sin(a) * 2), 3, 3);
  }

  // Rod
  const tip = rodTip(g);
  drawRod(ctx, hands.x + 1, hands.y - 1, tip.x, tip.y);
}

function drawLimb(ctx, x0, y0, x1, y1, w, c) {
  ctx.fillStyle = c;
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (dx * i) / steps);
    const y = Math.round(y0 + (dy * i) / steps);
    ctx.fillRect(x, y, w, w);
  }
}

function drawRod(ctx, x0, y0, x1, y1) {
  ctx.fillStyle = '#6b4a2b';
  const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = Math.round(x0 + (x1 - x0) * k);
    const y = Math.round(y0 + (y1 - y0) * k) + Math.round(Math.sin(k * Math.PI) * -1);
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = '#8a6338';
  ctx.fillRect(x0, y0 - 1, 1, 1);
}

// ---------------------------------------------------------------------------
// Bobber + line
// ---------------------------------------------------------------------------
function drawLine(ctx, from, to, sag) {
  ctx.fillStyle = 'rgba(240,248,250,0.7)';
  const steps = 42;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = Math.round(from.x + (to.x - from.x) * k);
    const y = Math.round(from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * sag);
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBobber(ctx, g) {
  const b = g.bobber;
  if (!b.active) return;

  const tip = rodTip(g);
  drawLine(ctx, tip, { x: Math.round(b.x), y: Math.round(b.y) }, b.flying ? 2 : 5);

  const bx = Math.round(b.x), by = Math.round(b.y);
  // Ripple rings
  for (const r of g.ripples) {
    const k = r.age / r.life;
    const rad = lerp(2, r.max, k);
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.strokeStyle = '#d8f4f2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, rad, rad * 0.42, 0, 0, 7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Bobber body: white bottom, red top, small antenna
  rect(ctx, bx - 2, by - 1, 4, 3, '#f2f4f0');
  rect(ctx, bx - 2, by - 1, 4, 2, '#d9463c');
  rect(ctx, bx - 1, by - 4, 1, 3, '#f2f4f0');
  rect(ctx, bx - 1, by - 5, 1, 1, '#333');
  // outline
  ctx.globalAlpha = 0.4;
  rect(ctx, bx - 3, by - 1, 1, 3, '#123');
  rect(ctx, bx + 2, by - 1, 1, 3, '#123');
  ctx.globalAlpha = 1;

  // Bite cue: exclamation bubble
  if (g.state === 'bite') {
    const pulse = 1 + Math.sin(g.t * 18) * 0.15;
    const cw = Math.round(12 * pulse), ch = Math.round(16 * pulse);
    const cx = bx + 8 - cw / 2, cy = by - 24 - (ch - 16) / 2;
    rect(ctx, cx, cy, cw, ch, '#fff4d8');
    rect(ctx, cx + 1, cy + 1, cw - 2, ch - 2, '#ffd23c');
    rect(ctx, cx + 2, cy + 2, cw - 4, ch - 4, '#fff4d8');
    // "!"
    ctx.fillStyle = '#d9463c';
    ctx.fillRect(cx + cw / 2 - 1, cy + 3, 2, Math.round(ch * 0.45));
    ctx.fillRect(cx + cw / 2 - 1, cy + ch - 4, 2, 2);
  }
}

function drawParticles(ctx, g) {
  for (const p of g.particles) {
    const a = 1 - p.age / p.life;
    if (a <= 0) continue;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Ambient motes
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 14; i++) {
    const seed = i * 4.7;
    const x = (hash(seed) * W + g.t * (3 + hash(seed + 1) * 5)) % W;
    const y = 70 + hash(seed + 2) * 90 + Math.sin(g.t * 0.8 + i) * 3;
    const s = Math.sin(g.t * 2 + i * 1.7);
    if (s > 0.2) rect(ctx, Math.round(x), Math.round(y), 1, 1, '#fff2c0');
  }
  ctx.globalAlpha = 1;
}

// Foreground silhouette framing
function drawForeground(ctx) {
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#16332c';
  for (let x = 0; x < W; x++) {
    const h = 6 + Math.sin(x * 0.13) * 3 + (x < 40 || x > 280 ? 4 : 0);
    ctx.fillRect(x, H - h, 1, h);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
export function drawScene(ctx, g) {
  ctx.imageSmoothingEnabled = false;
  drawSky(ctx, g.t);
  drawWater(ctx, g.t, g);
  drawShore(ctx, g.t);
  drawVegetation(ctx, g.t);
  drawDock(ctx, g.t);
  drawAngler(ctx, g.t, g);
  drawBobber(ctx, g);
  drawParticles(ctx, g);
  drawForeground(ctx);

  // subtle vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, 78, W / 2, H / 2, 220);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(8,16,24,0.27)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}
