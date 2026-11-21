"use strict";
/* ------------------------------------------------------------------ *
 *  art.js - all scene artwork is generated here from primitives.      *
 * ------------------------------------------------------------------ */

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function ctxOf(c) { return c.getContext("2d"); }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
function disc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}

/* coastline: land is everything above this y for a given x */
function shoreY(x) {
  return 128 - 0.85 * x - 7 * Math.sin(0.055 * x + 0.4);
}
function onLand(x, y) {
  return y < shoreY(x) - 1;
}

/* ------------------------------------------------------------------ *
 *  Background bake: land, beach, trees, dock, props                   *
 * ------------------------------------------------------------------ */

function bakeScene() {
  const cv = makeCanvas(320, 180);
  const g = ctxOf(cv);
  const rnd = mulberry32(1337);

  /* ---- land & beach ---- */
  for (let x = 0; x < 175; x++) {
    const sy = Math.max(0, Math.round(shoreY(x)));
    if (sy <= 0) continue;
    for (let y = 0; y < sy; y++) {
      const d = sy - y; // px above shoreline
      const n = rnd();
      let col;
      if (d <= 2) col = PAL.sandLL;
      else if (d <= 6) col = n < 0.4 ? PAL.sandL : PAL.sand;
      else if (d <= 9) col = n < 0.4 ? PAL.sand : PAL.sandD;
      else if (d <= 12) col = n < 0.5 ? PAL.sandD : PAL.grassD;
      else {
        // grass with soft mottling
        col = PAL.grass;
        if (n < 0.10) col = PAL.grassD;
        else if (n < 0.22) col = PAL.grassM;
        else if (n < 0.30) col = PAL.grassL;
      }
      rect(g, x, y, 1, 1, col);
    }
  }

  /* shoreline foam right where land meets water */
  for (let x = 0; x < 175; x++) {
    const sy = Math.round(shoreY(x));
    if (sy <= 0 || sy >= 180) continue;
    if (x % 2 === 0) rect(g, x, sy, 1, 1, x % 6 === 0 ? PAL.wFoam : PAL.wLight);
    if (x % 5 === 0) rect(g, x, sy + 1, 1, 1, PAL.wFoam);
  }

  /* a little dirt path from upper area down to the dock */
  for (let i = 0; i < 260; i++) {
    const t = i / 259;
    const px = 40 + t * 24 + Math.sin(t * 9) * 3;
    const py = 4 + t * 60;
    if (!onLand(px, py)) continue;
    rect(g, px + (rnd() * 6 - 3), py + (rnd() * 6 - 3), 3, 2,
      rnd() < 0.5 ? PAL.dirt : PAL.dirtD);
  }

  /* ---- scatter: grass tufts, flowers, rocks, bushes ---- */
  const scatter = mulberry32(24);
  for (let i = 0; i < 240; i++) {
    const x = scatter() * 160;
    const y = scatter() * 120;
    if (!onLand(x, y) || y > shoreY(x) - 13) continue;
    const r = scatter();
    if (r < 0.5) {
      // grass tuft
      const c = scatter() < 0.5 ? PAL.grassL : PAL.grassLL;
      rect(g, x, y, 1, 2, c);
      rect(g, x + 2, y + 1, 1, 1, c);
    } else if (r < 0.75) {
      const cols = [PAL.pink, PAL.yellow, PAL.white, PAL.purple, PAL.pinkL, PAL.yellowL];
      const c = cols[(scatter() * cols.length) | 0];
      rect(g, x, y + 1, 1, 2, PAL.leafD);
      rect(g, x, y, 1, 1, c);
      rect(g, x - 1, y, 1, 1, c);
      rect(g, x + 1, y + 1, 1, 1, c);
    } else if (r < 0.9) {
      // small rock
      rect(g, x, y, 3, 2, PAL.rock);
      rect(g, x + 1, y - 1, 2, 1, PAL.rockL);
      rect(g, x, y + 1, 3, 1, PAL.rockD);
    } else {
      // bush
      drawBush(g, x, y, 3 + (scatter() * 2 | 0), scatter);
    }
  }

  /* ---- trees (top-down canopies) ---- */
  const trees = [
    [16, 16, 12], [40, 9, 10], [64, 17, 12], [24, 42, 11],
    [11, 67, 12], [39, 86, 10], [70, 50, 10], [96, 26, 10],
    [116, 13, 9], [50, 40, 8], [84, 43, 9], [132, 4, 8],
  ];
  for (const [tx, ty, tr] of trees) drawTree(g, tx, ty, tr, rnd);

  /* ---- dock ---- */
  drawDock(g);

  /* ---- props: rowboat, rocks, reeds, islet ---- */
  drawIslet(g, 272, 30);
  drawRowboat(g, 34, 150);
  drawReeds(g, 6, 120);
  drawReeds(g, 112, 18);

  /* cosy details on the dock */
  drawLantern(g, 56, 62);
  drawBucket(g, 104, 70);

  return cv;
}

/* small rocky islet far out in the bay */
function drawIslet(g, x, y) {
  disc(g, x + 2, y + 3, 13, "rgba(15,45,65,0.35)");
  disc(g, x, y, 11, PAL.rockD);
  disc(g, x - 1, y - 1, 9, PAL.rock);
  disc(g, x - 2, y - 2, 5, PAL.rockL);
  disc(g, x + 4, y + 2, 4, PAL.leafD);
  disc(g, x + 4, y + 1, 3, PAL.leaf);
  disc(g, x + 3, y, 2, PAL.leafM);
  rect(g, x - 6, y + 3, 3, 1, PAL.rockL);
  rect(g, x + 6, y - 1, 2, 1, PAL.rockL);
}

/* dock lantern with a soft warm glow */
function drawLantern(g, x, y) {
  /* glow first, under the post */
  const glow = g.createRadialGradient(x, y - 14, 2, x, y - 14, 26);
  glow.addColorStop(0, "rgba(255,200,110,0.55)");
  glow.addColorStop(0.5, "rgba(255,180,90,0.20)");
  glow.addColorStop(1, "rgba(255,170,80,0)");
  g.fillStyle = glow;
  g.fillRect(x - 28, y - 42, 56, 56);
  /* post */
  rect(g, x - 1, y - 14, 3, 15, PAL.woodD);
  rect(g, x - 1, y - 14, 1, 15, PAL.woodL);
  /* lantern body */
  rect(g, x - 5, y - 24, 10, 10, PAL.woodD);
  rect(g, x - 4, y - 23, 8, 8, "#3a2a18");
  rect(g, x - 3, y - 22, 6, 6, PAL.yellowL);
  rect(g, x - 2, y - 21, 4, 4, "#fff3c8");
  rect(g, x - 6, y - 25, 12, 2, PAL.wood);
  rect(g, x - 5, y - 14, 10, 2, PAL.wood);
  rect(g, x - 2, y - 27, 4, 3, PAL.woodD);
  rect(g, x - 1, y - 28, 2, 1, PAL.woodL);
}

/* wooden bucket with a catch poking out */
function drawBucket(g, x, y) {
  disc(g, x, y + 1, 5, "rgba(15,40,55,0.35)");
  /* fish tail */
  rect(g, x - 1, y - 8, 1, 3, PAL.rockL);
  rect(g, x - 3, y - 9, 2, 1, PAL.rock);
  rect(g, x + 2, y - 9, 2, 1, PAL.rock);
  /* bucket */
  rect(g, x - 4, y - 6, 8, 7, PAL.woodD);
  rect(g, x - 4, y - 6, 8, 1, PAL.woodL);
  rect(g, x - 3, y - 5, 6, 1, PAL.wood);
  rect(g, x - 3, y - 2, 6, 1, PAL.wood);
  rect(g, x - 4, y - 1, 8, 1, PAL.woodD);
  rect(g, x - 3, y - 3, 6, 1, "#2f4a5c");
}

function drawBush(g, cx, cy, r, rnd) {
  disc(g, cx + 1, cy + 2, r, PAL.grassD);
  disc(g, cx, cy, r, PAL.leaf);
  disc(g, cx - 1, cy - 1, r - 1, PAL.leafM);
  for (let i = 0; i < r; i++) {
    disc(g, cx - 1 + (rnd() * 4 - 2), cy - 1 + (rnd() * 4 - 2), 1, PAL.leafL);
  }
}

function drawTree(g, cx, cy, r, rnd) {
  /* soft ground shadow */
  disc(g, cx + 3, cy + 4, r + 1, PAL.grassD);
  disc(g, cx + 2, cy + 3, r, PAL.grassD);
  /* canopy: dark rim -> base -> mid -> light dapples */
  disc(g, cx, cy, r, PAL.leafD);
  disc(g, cx, cy, r - 1, PAL.leaf);
  disc(g, cx - 1, cy - 1, r - 3, PAL.leafM);
  const dapples = 10 + (r | 0);
  for (let i = 0; i < dapples; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * (r - 2);
    disc(g, cx + Math.cos(a) * d - 1, cy + Math.sin(a) * d - 1,
      1 + (rnd() < 0.3 ? 1 : 0), rnd() < 0.5 ? PAL.leafL : PAL.leafLL);
  }
  /* a few dark gaps */
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * (r - 2);
    rect(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, PAL.leafD);
  }
}

function drawDock(g) {
  const x0 = 50, x1 = 152, y0 = 62, y1 = 77;
  /* shadow / side underwater */
  rect(g, x0 + 2, y1, x1 - x0, 6, PAL.woodD);
  rect(g, x0 + 2, y1 + 5, x1 - x0, 3, "rgba(20,55,75,0.55)");
  /* posts */
  for (let px = x0 + 4; px <= x1 - 2; px += 22) {
    rect(g, px, y1 - 2, 4, 14, PAL.woodD);
    rect(g, px, y1 - 2, 2, 14, PAL.wood);
  }
  /* deck surface */
  rect(g, x0, y0, x1 - x0, y1 - y0, PAL.wood);
  for (let px = x0; px < x1; px += 6) {
    const c = ((px / 6) | 0) % 2 ? PAL.woodM : PAL.wood;
    rect(g, px, y0, 5, y1 - y0, c);
    rect(g, px + 5, y0, 1, y1 - y0, PAL.woodD);
  }
  /* edge highlights + nails */
  rect(g, x0, y0, x1 - x0, 2, PAL.woodL);
  rect(g, x0, y1 - 2, x1 - x0, 2, PAL.woodD);
  const rnd = mulberry32(9);
  for (let px = x0 + 2; px < x1; px += 6) {
    rect(g, px + 1, y0 + 1, 1, 1, PAL.woodD);
    rect(g, px + 1, y1 - 3, 1, 1, PAL.woodD);
    if (rnd() < 0.4) rect(g, px + 3, y0 + 4 + rnd() * 6, 1, 1, PAL.woodD);
  }
  /* left end back to shore shadow */
  rect(g, x0 - 3, y0 + 2, 3, y1 - y0 - 4, PAL.woodD);
}

function drawRowboat(g, x, y) {
  /* small moored dinghy seen from above */
  g.save();
  g.translate(x, y);
  g.rotate(-0.18);
  disc(g, 1, 3, 10, "rgba(15,45,65,0.45)");
  rect(g, -11, -4, 22, 9, PAL.woodD);
  rect(g, -10, -3, 20, 7, PAL.wood);
  rect(g, -8, -2, 16, 2, PAL.woodM);
  rect(g, -10, 1, 20, 1, PAL.woodL);
  /* interior water */
  rect(g, -7, -1, 14, 3, PAL.wDeep2);
  rect(g, -6, 0, 12, 1, PAL.wDeep);
  /* seat */
  rect(g, -1, -2, 2, 7, PAL.woodD);
  g.restore();
}

function drawReeds(g, x, y) {
  const rnd = mulberry32(x * 17 + y);
  for (let i = 0; i < 9; i++) {
    const bx = x + (rnd() * 16 - 8);
    const by = y + (rnd() * 10 - 5);
    if (!onLand(bx, by)) continue;
    const h = 5 + (rnd() * 5 | 0);
    for (let k = 0; k < h; k++) {
      rect(g, bx + (k > h - 3 ? 0 : Math.sin(k) * 0.5), by - k, 1, 1,
        k > h - 3 ? PAL.leafL : PAL.leaf);
    }
    if (rnd() < 0.6) rect(g, bx, by - h, 1, 3, "#7a4a2a");
  }
}

/* ------------------------------------------------------------------ *
 *  Animated water                                                     *
 * ------------------------------------------------------------------ */

const WATER = (function () {
  const rnd = mulberry32(555);
  const spark = [];
  for (let i = 0; i < 120; i++) {
    spark.push({
      x: rnd() * 320, y: rnd() * 180,
      p: rnd() * Math.PI * 2, s: 0.5 + rnd() * 1.4,
      w: rnd() < 0.3 ? 2 : 1,
    });
  }
  const ripples = [];
  for (let i = 0; i < 44; i++) {
    ripples.push({
      x: rnd() * 320, y: 40 + rnd() * 140,
      len: 3 + rnd() * 6, p: rnd() * Math.PI * 2, s: 0.4 + rnd() * 0.9,
    });
  }
  return { spark, ripples };
})();

function bakeWaterBase() {
  const cv = makeCanvas(320, 180);
  const g = ctxOf(cv);
  const rnd = mulberry32(2024);
  /* depth patches for large-scale variation */
  const patches = [];
  for (let i = 0; i < 26; i++) patches.push([rnd() * 320, rnd() * 180, 6 + rnd() * 14]);
  for (let x = 0; x < 320; x++) {
    const sy = shoreY(x);
    for (let y = 0; y < 180; y++) {
      let d = y - sy + (rnd() * 3 - 1.5);
      for (const [px, py, pr] of patches) {
        const dx = x - px, dy = (y - py) * 1.3;
        if (dx * dx + dy * dy < pr * pr) { d += 4; break; }
      }
      let col;
      if (d < 2.5) col = PAL.wShine;
      else if (d < 6) col = PAL.wLight;
      else if (d < 12) col = PAL.wMid2;
      else if (d < 22) col = PAL.wMid;
      else if (d < 42) col = PAL.wDeep2;
      else col = PAL.wDeep;
      rect(g, x, y, 1, 1, col);
    }
  }
  return cv;
}
const WATER_BASE = bakeWaterBase();

function drawWater(g, t) {
  g.drawImage(WATER_BASE, 0, 0);
  /* moving ripple dashes */
  for (const r of WATER.ripples) {
    const x = (r.x + Math.sin(t * r.s + r.p) * 4) | 0;
    const y = (r.y + Math.sin(t * r.s * 0.7 + r.p * 1.3) * 1.2) | 0;
    rect(g, x, y, r.len, 1, PAL.wLight);
  }
  /* twinkling sparkles */
  for (const s of WATER.spark) {
    const tw = Math.sin(t * s.s * 2.2 + s.p);
    if (tw < 0.55) continue;
    const a = (tw - 0.55) / 0.45;
    g.globalAlpha = 0.25 + a * 0.6;
    rect(g, s.x + Math.sin(t * 0.5 + s.p) * 1.5, s.y, s.w, 1, PAL.wShine);
    g.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ *
 *  Bobber, line, splash, bite cue                                     *
 * ------------------------------------------------------------------ */

function drawLine(g, x0, y0, x1, y1, sag, col) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  g.fillStyle = col || "#e8e6da";
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    g.fillRect(x | 0, y | 0, 1, 1);
  }
}

function drawBobber(g, x, y, t, biting) {
  /* small wake / shadow */
  disc(g, x, y + 2, 2, "rgba(15,45,65,0.45)");
  /* white lower, red top */
  rect(g, x - 1, y - 1, 3, 3, PAL.bobW);
  rect(g, x - 1, y - 2, 3, 1, PAL.bobR);
  rect(g, x, y - 3, 1, 1, PAL.bobR);
  rect(g, x - 1, y - 2, 1, 1, PAL.bobRD);
  /* little antenna */
  rect(g, x, y - 4, 1, 1, "#2a2a2a");
}

function drawSplash(g, x, y, t) {
  const r = 3 + (t * 22 | 0);
  const a = Math.max(0, 1 - t * 1.6);
  g.globalAlpha = a;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r * 0.5;
    rect(g, px, py, 1, 1, i % 2 ? PAL.wFoam : PAL.wShine);
  }
  if (t < 0.6) disc(g, x, y, (6 - t * 8) | 0, PAL.wFoam);
  g.globalAlpha = 1;
}

/* ------------------------------------------------------------------ *
 *  Angler                                                             *
 * ------------------------------------------------------------------ */

/* feet at (x, y). pose: 0 idle, 1 fishing/cast, 3 reeling */
function drawAnglerBody(g, x, y, pose) {
  x = Math.round(x); y = Math.round(y);
  const H = (px, py, w, h, c) => rect(g, x + px, y + py, w, h, c);

  /* legs / boots */
  H(-2, -3, 8, 3, PAL.boot);
  H(-1, -4, 3, 2, PAL.overallD);
  H(3, -4, 3, 2, PAL.overallD);

  /* torso: overalls over shirt */
  H(-3, -13, 11, 9, PAL.overall);
  H(-3, -13, 11, 2, PAL.shirt);
  H(-3, -11, 2, 3, PAL.shirtD);
  H(6, -11, 2, 3, PAL.shirtD);
  H(-3, -13, 11, 1, PAL.overallD);
  H(-2, -11, 2, 8, PAL.overallD);
  H(4, -11, 2, 8, PAL.overallD);

  /* arms */
  const arm = pose >= 2 ? 3 : pose === 1 ? -2 : 0;
  H(6 + arm, -12, 4, 3, PAL.shirt);
  H(6 + arm, -12, 4, 1, PAL.shirtL);
  H(-4 + (pose === 1 ? -2 : 0), -12, 3, 3, PAL.shirt);

  /* head */
  H(-2, -20, 7, 8, PAL.skin);
  H(-2, -20, 7, 2, PAL.hair);
  H(4, -15, 1, 2, PAL.skinD);
  H(2, -16, 1, 1, PAL.ink);

  /* straw hat */
  H(-4, -21, 12, 3, PAL.strawD);
  H(-5, -20, 14, 3, PAL.straw);
  H(-5, -20, 14, 1, PAL.strawL);
  H(-3, -22, 9, 3, PAL.straw);
  H(-3, -22, 9, 1, PAL.strawL);
  H(-3, -20, 9, 1, PAL.strawD);
  H(-1, -21, 5, 1, PAL.strawL);
  H(-4, -18, 13, 1, PAL.strawD);
}

/* cached, outlined angler sprites (one per pose) */
const ANGLER_SPRITES = {};
function getAnglerSprite(pose) {
  if (ANGLER_SPRITES[pose]) return ANGLER_SPRITES[pose];
  const W = 30, Hh = 30;
  const cv = makeCanvas(W, Hh);
  const g = ctxOf(cv);
  drawAnglerBody(g, 15, 29, pose);
  /* locate silhouette edges and lay down a dark outline */
  const id = g.getImageData(0, 0, W, Hh);
  const d = id.data;
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < Hh && d[(y * W + x) * 4 + 3] > 20;
  const out = [];
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      if (op(x, y)) continue;
      if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) out.push([x, y]);
    }
  }
  g.fillStyle = PAL.ink;
  for (const [x, y] of out) g.fillRect(x, y, 1, 1);
  ANGLER_SPRITES[pose] = cv;
  return cv;
}

function drawAngler(g, x, y, pose) {
  /* soft ground shadow (not outlined) */
  disc(g, x, y + 1, 7, "rgba(15,40,55,0.40)");
  disc(g, x, y + 1, 5, "rgba(15,40,55,0.32)");
  const spr = getAnglerSprite(pose);
  g.imageSmoothingEnabled = false;
  g.drawImage(spr, Math.round(x) - 15, Math.round(y) - 29);
}

/* ------------------------------------------------------------------ *
 *  Foreground layer: lily pads and reeds drawn in front of the angler  *
 * ------------------------------------------------------------------ */
function bakeForeground() {
  const cv = makeCanvas(320, 180);
  const g = ctxOf(cv);
  const rnd = mulberry32(777);

  /* lily pads */
  const pads = [[252, 148, 7], [268, 158, 5], [232, 162, 6], [286, 140, 4], [44, 168, 6]];
  for (const [x, y, r] of pads) {
    disc(g, x + 1, y + 2, r, "rgba(10,40,55,0.35)");
    disc(g, x, y, r, PAL.leafD);
    disc(g, x, y - 1, r - 1, PAL.leaf);
    disc(g, x - 1, y - 2, Math.max(1, r - 3), PAL.leafM);
    /* notch cut */
    rect(g, x, y - 1, 1, r, PAL.wMid);
    if (rnd() < 0.7) {
      disc(g, x + 1, y - 1, 1, PAL.pinkL);
      rect(g, x + 1, y, 1, 1, PAL.yellowL);
    }
  }

  /* foreground reed clumps at the bottom corners */
  drawFGReeds(g, 4, 176, 14, rnd);
  drawFGReeds(g, 300, 172, 12, rnd);

  /* a few leaves drifting on the surface */
  for (const [x, y, c] of [[92, 106, PAL.leafM], [120, 118, PAL.pinkL], [66, 96, PAL.yellowL], [150, 150, PAL.leafL]]) {
    rect(g, x + 1, y + 1, 3, 1, "rgba(10,40,55,0.25)");
    rect(g, x, y, 3, 2, c);
    rect(g, x + 1, y, 1, 1, PAL.leafD);
  }
  return cv;
}

function drawFGReeds(g, x, y, n, rnd) {
  for (let i = 0; i < n; i++) {
    const bx = x + (rnd() * 22 - 6);
    const by = y + (rnd() * 6 - 2);
    const h = 10 + (rnd() * 14 | 0);
    for (let k = 0; k < h; k++) {
      const sway = Math.sin(k * 0.4 + i) * 1.4;
      rect(g, bx + sway, by - k, 1, 1, k > h - 4 ? PAL.leafL : PAL.leaf);
    }
    if (rnd() < 0.7) {
      rect(g, bx + Math.sin(h * 0.4 + i) * 1.4, by - h, 1, 4, "#6f4326");
      rect(g, bx + Math.sin(h * 0.4 + i) * 1.4, by - h - 1, 1, 1, "#8a5a35");
    }
  }
}

/* ------------------------------------------------------------------ *
 *  Foreground layer ends                                              *
 * ------------------------------------------------------------------ */

/* A fish leaping out of the water on the line. */
function drawLeapingFish(g, fishCanvas, x, y, scale, t, rarityCol) {
  const arc = Math.sin(Math.min(1, t) * Math.PI);
  const px = x;
  const py = y - arc * 30;
  g.save();
  g.translate(px, py);
  g.rotate(-0.5 + arc * 1.0);
  g.globalAlpha = t < 0.85 ? 1 : (1 - t) / 0.15;
  g.imageSmoothingEnabled = false;
  g.drawImage(fishCanvas, -fishCanvas.width * scale / 2, -fishCanvas.height * scale / 2,
    fishCanvas.width * scale, fishCanvas.height * scale);
  g.restore();
  g.globalAlpha = 1;
}
