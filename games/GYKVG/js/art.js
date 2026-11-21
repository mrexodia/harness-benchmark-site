/* art.js — every pixel is drawn in code. No external assets. */
(function () {
  "use strict";

  const P = {
    skyTop: "#5aa7d4", skyMid: "#a7d6df", skyLow: "#f7d9a6", skyHorizon: "#ffcf94",
    sun: "#fff6cf", sunCore: "#fffbe8", sunGlow: "rgba(255,226,150,0.55)",
    cloud: "#f4f1e6", cloudShade: "#dcd6c4",
    seaFar: "#6fb9c8", seaA: "#3f95b8", seaB: "#2f7ba3", seaC: "#25668c", seaDeep: "#1c4f70",
    foam: "#e9fbf6", crest: "#b6e2df", deepLine: "#1b4767",
    island: "#4b7f86", islandDark: "#3a6770", islandHaze: "#8fbfc0",
    sand: "#e9d29a", sandMid: "#d9bd80", sandDark: "#bfa167", sandWet: "#a98a55",
    grass: "#5aa246", grassDark: "#3c7836", grassLight: "#84c25c", grassDeep: "#2d5c2c",
    wood: "#9a663a", woodLight: "#bd8450", woodDark: "#6b4222", woodEdge: "#523018",
    rope: "#c9a86a",
    leaf: "#3f8a4a", leafLight: "#63b35c", leafDark: "#2b6434", trunk: "#6b4a2a",
    stone: "#8d8a86", stoneLight: "#b3b0aa", stoneDark: "#5f5c58",
    flower1: "#f2a0c0", flower2: "#f6e07a", flower3: "#e8f0f4",
    skin: "#e8b184", skinShade: "#c98a5e", hair: "#5a3a22",
    shirt: "#d9713f", shirtDark: "#a94f2a", pants: "#3f5578", pantsDark: "#2c3c56",
    boot: "#4a3220", hat: "#e6c877", hatDark: "#b99a44", hatBand: "#8a5a34",
    lantern: "#ffd98a", lanternGlow: "rgba(255,205,110,0.28)",
    line: "rgba(245,250,255,0.85)", lineShade: "rgba(120,160,180,0.5)",
    bobRed: "#e2402e", bobRedDark: "#a82a1e", bobWhite: "#f6f4ee", bobWhiteDark: "#c9c4b8",
  };

  const R = (ctx, x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // deterministic pseudo random
  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // ---------------------------------------------------------------------------
  // SKY
  // ---------------------------------------------------------------------------
  function drawSky(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 48);
    g.addColorStop(0, P.skyTop);
    g.addColorStop(0.45, P.skyMid);
    g.addColorStop(0.78, P.skyLow);
    g.addColorStop(1, P.skyHorizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 48);

    // sun glow + disc
    const sx = 250, sy = 17;
    const rg = ctx.createRadialGradient(sx, sy, 1, sx, sy, 34);
    rg.addColorStop(0, "rgba(255,244,200,0.95)");
    rg.addColorStop(0.35, P.sunGlow);
    rg.addColorStop(1, "rgba(255,226,150,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 320, 56);
    R(ctx, sx - 6, sy - 6, 12, 12, P.sunCore);
    R(ctx, sx - 7, sy - 3, 14, 6, P.sunCore);

    // clouds, drifting slowly
    drawCloud(ctx, 40, 12, 1.0, t * 2.2);
    drawCloud(ctx, 150, 7, 0.8, t * 1.5);
    drawCloud(ctx, 265, 26, 0.7, t * 2.8);
  }

  function drawCloud(ctx, baseX, y, s, drift) {
    const span = 380;
    let x = ((baseX + drift) % span) - 60;
    const w = Math.round(26 * s);
    const h = Math.round(8 * s);
    R(ctx, x, y, w, h, P.cloud);
    R(ctx, x + w * 0.15, y - h * 0.55, w * 0.5, h, P.cloud);
    R(ctx, x + w * 0.45, y - h * 0.3, w * 0.45, h, P.cloud);
    R(ctx, x, y + h - 2, w, 2, P.cloudShade);
  }

  // ---------------------------------------------------------------------------
  // SEA
  // ---------------------------------------------------------------------------
  function drawSea(ctx, t) {
    const g = ctx.createLinearGradient(0, 44, 0, 160);
    g.addColorStop(0, P.seaFar);
    g.addColorStop(0.35, P.seaA);
    g.addColorStop(0.7, P.seaB);
    g.addColorStop(1, P.seaC);
    ctx.fillStyle = g;
    ctx.fillRect(0, 44, 320, 120);

    // calm haze at the horizon
    R(ctx, 0, 44, 320, 2, "rgba(235,247,240,0.45)");

    // sun reflection column
    for (let i = 0; i < 26; i++) {
      const yy = 48 + i * 4;
      const ph = t * (1.4 + (i % 3) * 0.4) + i * 1.7;
      const off = Math.sin(ph) * (4 + i * 0.25);
      const w = 3 + ((i * 7) % 5);
      const a = 0.35 - i * 0.008;
      if (a <= 0) continue;
      ctx.fillStyle = "rgba(255,244,205," + a.toFixed(3) + ")";
      ctx.fillRect(Math.round(250 + off - w / 2), yy, w, 1);
    }
    // soft glow pooling below the sun on the water
    const pool = ctx.createRadialGradient(250, 58, 2, 250, 58, 46);
    pool.addColorStop(0, "rgba(255,240,190,0.24)");
    pool.addColorStop(0.5, "rgba(255,240,190,0.10)");
    pool.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = pool;
    ctx.fillRect(200, 44, 100, 60);

    // animated wave crests
    for (let row = 0; row < 15; row++) {
      const y = 47 + row * 7;
      if (y > 158) break;
      const speed = 5 + row * 0.7;
      const dir = row % 2 === 0 ? 1 : -1;
      const off = t * speed * dir;
      const near = row > 9;
      for (let k = 0; k < 6; k++) {
        const seed = hash(row * 13 + k * 7);
        let bx = ((seed * 320 + off) % 340) - 10;
        const w = 4 + ((k + row) % 3) * 2;
        if (near) {
          ctx.fillStyle = "rgba(200,238,235,0.30)";
        } else if (row < 4) {
          ctx.fillStyle = "rgba(233,251,246,0.55)";
        } else {
          ctx.fillStyle = "rgba(182,226,223,0.28)";
        }
        ctx.fillRect(Math.round(bx), y, w, 1);
      }
    }

    // a few dark trough lines for depth
    for (let row = 0; row < 8; row++) {
      const y = 60 + row * 12;
      const off = Math.sin(t * 0.6 + row) * 6;
      ctx.fillStyle = "rgba(27,71,103,0.18)";
      ctx.fillRect(Math.round(30 + off + row * 12), y, 60 - row * 2, 1);
    }

    // twinkling sparkles
    for (let i = 0; i < 22; i++) {
      const sx = hash(i * 3.3) * 300 + 8;
      const sy = 50 + hash(i * 7.7) * 96;
      const tw = Math.sin(t * 2 + i * 1.9);
      if (tw > 0.55) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    }
  }

  function drawBirds(ctx, t) {
    for (let i = 0; i < 3; i++) {
      const span = 420;
      const x = ((i * 140 + t * (7 + i * 2)) % span) - 30;
      const y = 8 + i * 7 + Math.sin(t * 0.9 + i) * 1.5;
      const f = Math.sin(t * 6 + i * 2) > 0 ? 0 : 1;
      R(ctx, x, y + f, 1, 1, "#4a5f6a");
      R(ctx, x - 1, y, 1, 1, "#4a5f6a");
      R(ctx, x + 1, y, 1, 1, "#4a5f6a");
      R(ctx, x - 2, y - 1, 1, 1, "#5f7681");
      R(ctx, x + 2, y - 1, 1, 1, "#5f7681");
    }
  }

  function drawBoat(ctx, t) {
    const x = 66, baseY = 45;
    const bob = Math.round(Math.sin(t * 0.8) * 1);
    const y = baseY + bob;
    // hull
    R(ctx, x, y - 2, 10, 2, P.woodDark);
    R(ctx, x + 1, y - 1, 8, 1, P.wood);
    // mast + sail
    R(ctx, x + 5, y - 12, 1, 10, P.woodDark);
    for (let j = 0; j < 8; j++) {
      const w = Math.max(1, 5 - j);
      R(ctx, x + 5 - w + 1, y - 12 + j, w, 1, "#f2ede0");
    }
    R(ctx, x + 6, y - 11, 3, 6, "#dcd6c4");
    // reflection
    ctx.globalAlpha = 0.25;
    R(ctx, x, y, 10, 2, P.woodDark);
    ctx.globalAlpha = 1;
  }

  function drawFishShadows(ctx, t) {
    const shadows = [
      { y: 70, sp: 9, s: 1.0, len: 9 },
      { y: 92, sp: -6, s: 1.3, len: 12 },
      { y: 118, sp: 5, s: 0.9, len: 8 },
      { y: 132, sp: -8, s: 1.5, len: 14 },
    ];
    for (let i = 0; i < shadows.length; i++) {
      const sh = shadows[i];
      const span = 360;
      let x = ((i * 90 + t * sh.sp) % span + span) % span - 20;
      const yy = sh.y + Math.sin(t * 1.3 + i) * 2;
      const L = sh.len;
      const wag = Math.sin(t * 4 + i * 2) * 1.5;
      ctx.fillStyle = "rgba(18,58,80,0.20)";
      for (let k = 0; k < L; k++) {
        const p = k / (L - 1);
        const h = Math.max(1, Math.round(Math.sin(p * Math.PI) * 2 * sh.s));
        R(ctx, x + k, yy - h / 2, 1, h, "rgba(18,58,80,0.20)");
      }
      R(ctx, x - 1, yy + wag, 2, 2, "rgba(18,58,80,0.20)");
    }
  }

  function drawDistant(ctx, t) {
    // a hazy island on the horizon
    const baseY = 46;
    const hue = Math.sin(t * 0.1) * 0.5;
    // main island
    for (let x = 0; x <= 54; x++) {
      const p = x / 54;
      const h = Math.round(Math.sin(p * Math.PI) * 8 + Math.sin(p * 9) * 1.2 + 1);
      R(ctx, 262 + x, baseY - h, 1, h + 1, P.islandDark);
    }
    for (let x = 0; x <= 30; x++) {
      const p = x / 30;
      const h = Math.round(Math.sin(p * Math.PI) * 5 + 1);
      R(ctx, 24 + x, baseY - h, 1, h + 1, P.island);
    }
    // tiny palm silhouettes
    R(ctx, 288, baseY - 12, 1, 5, P.islandDark);
    R(ctx, 285, baseY - 13, 6, 2, P.islandDark);
    R(ctx, 289, baseY - 14, 4, 1, P.islandDark);
    // haze
    R(ctx, 0, baseY - 1, 320, 2, "rgba(200,235,235,0.35)");
    R(ctx, 0, baseY + 1, 320, 1, "rgba(255,255,255,0.18)");
  }

  // ---------------------------------------------------------------------------
  // SHORE
  // ---------------------------------------------------------------------------
  function shoreTop(x) {
    return 148 + Math.sin(x * 0.055) * 2.4 + Math.sin(x * 0.17 + 1.3) * 1.2;
  }

  function drawShore(ctx, t) {
    // sand body with a wavy waterline
    for (let x = 0; x < 320; x++) {
      const top = Math.round(shoreTop(x));
      R(ctx, x, top, 1, 180 - top, P.sand);
    }
    // wet sand edge
    for (let x = 0; x < 320; x++) {
      const top = Math.round(shoreTop(x));
      R(ctx, x, top, 1, 3, P.sandWet);
      R(ctx, x, top + 3, 1, 2, P.sandMid);
    }
    // a soft foam line at the shoreline, gently breathing
    for (let x = 0; x < 320; x++) {
      const top = Math.round(shoreTop(x));
      const a = 0.35 + 0.35 * Math.sin(t * 1.6 + x * 0.08);
      ctx.fillStyle = "rgba(233,251,246," + a.toFixed(2) + ")";
      ctx.fillRect(x, top - 1, 1, 1);
    }
    // dry sand speckle
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(hash(i * 1.7) * 320);
      const y = Math.round(shoreTop(x)) + 6 + Math.floor(hash(i * 4.1) * (176 - shoreTop(x)));
      if (y > 178) continue;
      ctx.fillStyle = hash(i * 9.3) > 0.5 ? P.sandDark : P.sandMid;
      ctx.fillRect(x, y, 1, 1);
    }

    // pebbles
    const pebbles = [[36, 164], [58, 172], [96, 170], [220, 168], [242, 174], [280, 166], [300, 172], [126, 176]];
    for (const [x, y] of pebbles) {
      R(ctx, x, y, 3, 2, P.stoneDark);
      R(ctx, x, y, 2, 1, P.stoneLight);
    }

    // grass banks at the lower corners
    drawGrassBank(ctx, 0, 164, 92, 16, 0);
    drawGrassBank(ctx, 232, 160, 88, 20, 1);
  }

  function drawGrassBank(ctx, x, y, w, h, seed) {
    for (let i = 0; i < w; i++) {
      const edge = Math.round(y + Math.sin(i * 0.14 + seed * 2) * 2 + hash(i + seed) * 3);
      R(ctx, x + i, edge, 1, 180 - edge, i % 5 === 0 ? P.grassDark : P.grass);
    }
    // bright tufts
    for (let i = 0; i < w; i += 3) {
      const bx = x + i;
      const by = y + Math.round(Math.sin(i * 0.14 + seed * 2) * 2) - 2;
      if (hash(i * 2 + seed) > 0.4) {
        R(ctx, bx, by, 1, 3, P.grassLight);
        R(ctx, bx + 1, by + 1, 1, 2, P.grassLight);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DOCK
  // ---------------------------------------------------------------------------
  const DOCK = { x: 128, y: 112, w: 62, h: 58 };

  function drawDock(ctx, t) {
    const cx = 159, top = 112, bot = 171;
    const topHalf = 23, botHalf = 31;

    // soft shadow cast on the water
    for (let y = top; y <= bot; y++) {
      const p = (y - top) / (bot - top);
      const half = topHalf + (botHalf - topHalf) * p;
      ctx.fillStyle = "rgba(15,45,65,0.28)";
      ctx.fillRect(Math.round(cx - half + 3), y + 3, Math.round(half * 2), 1);
    }

    // support posts peeking above the far end
    R(ctx, cx - topHalf - 2, top - 3, 5, 14, P.woodDark);
    R(ctx, cx + topHalf - 3, top - 3, 5, 14, P.woodDark);
    R(ctx, cx - topHalf - 2, top - 3, 5, 1, P.woodLight);
    R(ctx, cx + topHalf - 3, top - 3, 5, 1, P.woodLight);

    // deck, narrowing with distance for a sense of depth
    for (let y = top; y <= bot; y++) {
      const p = (y - top) / (bot - top);
      const half = topHalf + (botHalf - topHalf) * p;
      const x = Math.round(cx - half);
      const w = Math.round(half * 2);
      const band = Math.floor((y - top) / 6);
      const col = (y - top) % 6 === 0 ? P.woodEdge : (band % 2 ? P.wood : P.woodLight);
      R(ctx, x, y, w, 1, col);
      R(ctx, x, y, 2, 1, P.woodDark);
      R(ctx, x + w - 2, y, 2, 1, P.woodDark);
    }
    // plank nails down the centre line
    for (let y = top + 2; y < bot - 4; y += 6) {
      const p = (y - top) / (bot - top);
      const half = topHalf + (botHalf - topHalf) * p;
      const x = Math.round(cx - half);
      const w = Math.round(half * 2);
      R(ctx, x + 5, y, 1, 1, P.woodDark);
      R(ctx, x + w - 6, y, 1, 1, P.woodDark);
    }

    // a coil of rope and a small bucket
    drawRopeCoil(ctx, 138, 158);
    drawBucket(ctx, 172, 150);
  }

  function drawRopeCoil(ctx, x, y) {
    R(ctx, x, y, 9, 8, P.woodDark);
    R(ctx, x + 1, y + 1, 7, 6, P.rope);
    R(ctx, x + 2, y + 3, 5, 1, P.woodDark);
    R(ctx, x + 2, y + 5, 5, 1, P.woodDark);
  }

  function drawBucket(ctx, x, y) {
    R(ctx, x, y, 10, 9, P.woodDark);
    R(ctx, x + 1, y + 1, 8, 7, P.woodLight);
    R(ctx, x + 1, y + 1, 8, 1, P.stoneDark);
    R(ctx, x + 3, y - 2, 1, 3, P.stoneDark);
    R(ctx, x + 7, y - 2, 1, 3, P.stoneDark);
    R(ctx, x + 4, y - 3, 3, 1, P.stoneDark);
    // water inside
    R(ctx, x + 2, y + 1, 6, 2, P.seaA);
  }

  // ---------------------------------------------------------------------------
  // VEGETATION / DETAILS
  // ---------------------------------------------------------------------------
  function drawBackPlants(ctx, t) {
    // reeds at the water's edge
    drawReeds(ctx, 108, 150, t);
    drawReeds(ctx, 205, 146, t);
    // bushes mid-left
    drawBush(ctx, 24, 150, 26, P.leaf, P.leafLight, P.leafDark, 3);
    drawBush(ctx, 286, 150, 24, P.leaf, P.leafLight, P.leafDark, 7);
  }

  function drawReeds(ctx, x, y, t) {
    for (let i = 0; i < 5; i++) {
      const sway = Math.sin(t * 1.2 + i + x) * 1.5;
      const bx = x + i * 3;
      const hgt = 12 + (i % 3) * 4;
      for (let k = 0; k < hgt; k++) {
        const off = sway * (k / hgt);
        R(ctx, bx + off, y - k, 1, 1, k > hgt - 3 ? P.leafLight : P.leafDark);
      }
    }
  }

  function drawBush(ctx, x, y, w, c, cl, cd, seed) {
    // rounded mass of leaf pixels
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < w * 0.6; j++) {
        const nx = (i / w) * 2 - 1;
        const ny = (j / (w * 0.6)) * 2 - 1;
        if (nx * nx + ny * ny * 1.4 < 1) {
          const v = hash(i * 3 + j * 7 + seed);
          let col = c;
          if (v > 0.82) col = cl;
          else if (v < 0.22) col = cd;
          R(ctx, x + i, y - j, 1, 1, col);
        }
      }
    }
  }

  function drawForeground(ctx, t) {
    // A leafy plant framing the bottom-left, drawn in front of the scene.
    drawLeafyPlant(ctx, 8, 178, t);
    // small flowers and grass tufts
    drawFlower(ctx, 74, 172, P.flower1);
    drawFlower(ctx, 88, 176, P.flower2);
    drawFlower(ctx, 214, 174, P.flower3);
    drawFlower(ctx, 196, 178, P.flower1);
    drawTuft(ctx, 60, 178);
    drawTuft(ctx, 172, 178);
    drawTuft(ctx, 300, 178);
    // a little wooden sign
    drawSign(ctx, 44, 152);
    // seaside treasures
    drawShell(ctx, 104, 176);
    drawShell(ctx, 112, 179);
    drawShell(ctx, 252, 178);
    drawStarfish(ctx, 262, 172);
    drawCrab(ctx, 210, 176, t);
  }

  function drawShell(ctx, x, y) {
    R(ctx, x, y, 3, 2, P.flower1);
    R(ctx, x, y, 1, 1, "#d98aa8");
    R(ctx, x + 1, y - 1, 1, 1, P.flower1);
    R(ctx, x + 2, y, 1, 1, "#fff0f4");
  }

  function drawStarfish(ctx, x, y) {
    const c = "#e08a5a";
    R(ctx, x + 1, y, 1, 3, c);
    R(ctx, x, y + 1, 3, 1, c);
    R(ctx, x, y, 1, 1, c);
    R(ctx, x + 2, y, 1, 1, c);
    R(ctx, x + 1, y + 1, 1, 1, "#f0b088");
  }

  function drawCrab(ctx, x, y, t) {
    const sc = Math.sin(t * 2) > 0 ? 0 : 1;
    R(ctx, x, y, 5, 3, "#d05a3c");
    R(ctx, x + 1, y - 1, 3, 1, "#e06a48");
    R(ctx, x - 1, y + 1, 1, 1, "#a83c28");
    R(ctx, x + 5, y + 1, 1, 1, "#a83c28");
    R(ctx, x + 1, y + 3, 1, 1, "#a83c28");
    R(ctx, x + 3, y + 3, 1, 1, "#a83c28");
    R(ctx, x + 1, y - 2, 1, 1, "#2a1a12");
    R(ctx, x + 3, y - 2, 1, 1, "#2a1a12");
    R(ctx, x - 2, y + sc, 1, 1, "#d05a3c");
    R(ctx, x + 6, y + sc, 1, 1, "#d05a3c");
  }

  function drawLeafyPlant(ctx, x, y, t) {
    const sway = Math.sin(t * 0.8) * 1.2;
    const leaves = [
      [0, 0, 7, 14, -1], [5, -2, 7, 16, 0], [11, 0, 8, 15, 1],
      [-5, 2, 6, 10, -2], [15, 2, 7, 12, 2], [3, -5, 9, 12, 0],
    ];
    for (const [dx, dy, w, h, dir] of leaves) {
      for (let j = 0; j < h; j++) {
        const taper = 1 - j / h;
        const ww = Math.max(1, Math.round(w * (0.4 + taper * 0.6)));
        const off = sway * (j / h) + dir * (j / h) * 2;
        R(ctx, x + dx + off, y + dy - j, ww, 1, j % 3 === 0 ? P.leafLight : P.leaf);
        R(ctx, x + dx + off, y + dy - j, 1, 1, P.leafDark);
      }
    }
  }

  function drawFlower(ctx, x, y, col) {
    R(ctx, x, y - 3, 1, 4, P.grassDark);
    R(ctx, x - 1, y - 4, 3, 2, col);
    R(ctx, x, y - 5, 1, 1, col);
    R(ctx, x, y - 4, 1, 1, P.flower2 === col ? "#fff2b0" : "#fff6d8");
  }

  function drawTuft(ctx, x, y) {
    R(ctx, x, y - 4, 1, 5, P.grassDark);
    R(ctx, x + 2, y - 3, 1, 4, P.grassLight);
    R(ctx, x + 4, y - 5, 1, 6, P.grass);
    R(ctx, x - 2, y - 2, 1, 3, P.grassLight);
  }

  function drawSign(ctx, x, y) {
    R(ctx, x, y, 2, 14, P.woodDark);
    R(ctx, x - 8, y - 8, 20, 9, P.wood);
    R(ctx, x - 8, y - 8, 20, 1, P.woodLight);
    R(ctx, x - 7, y - 6, 12, 1, P.woodEdge);
    R(ctx, x - 7, y - 4, 14, 1, P.woodEdge);
    R(ctx, x - 7, y - 2, 9, 1, P.woodEdge);
  }

  // A lantern post that adds a warm pool of light.
  function drawLantern(ctx, x, y, t) {
    R(ctx, x, y, 2, 22, P.woodDark);
    R(ctx, x - 4, y - 6, 10, 7, P.woodDark);
    R(ctx, x - 3, y - 5, 8, 5, P.lantern);
    const flick = 0.75 + 0.25 * Math.sin(t * 9 + 1);
    const rg = ctx.createRadialGradient(x + 1, y - 2, 1, x + 1, y - 2, 22);
    rg.addColorStop(0, "rgba(255,214,120," + (0.30 * flick).toFixed(2) + ")");
    rg.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(x - 24, y - 26, 50, 50);
    R(ctx, x - 2, y - 4, 6, 1, "#fff2c0");
  }

  // ---------------------------------------------------------------------------
  // ANGLER
  // ---------------------------------------------------------------------------
  // The angler is drawn from behind, facing the sea (north).
  function drawAngler(ctx, t, game) {
    const cx = 159;
    const twitch = game.anglerTwitch || 0;
    const baseY = game.anglerBaseY || 160;

    // shadow on the deck
    ctx.fillStyle = "rgba(20,40,55,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 1, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // boots
    R(ctx, cx - 5, baseY - 2, 4, 2, P.boot);
    R(ctx, cx + 1, baseY - 2, 4, 2, P.boot);
    // legs
    R(ctx, cx - 4, baseY - 6, 3, 4, P.pantsDark);
    R(ctx, cx + 1, baseY - 6, 3, 4, P.pants);

    // torso
    R(ctx, cx - 5, baseY - 13, 11, 7, P.shirt);
    R(ctx, cx - 5, baseY - 13, 11, 1, "#e88a55");
    R(ctx, cx - 5, baseY - 13, 3, 7, P.shirtDark);
    R(ctx, cx + 3, baseY - 13, 3, 7, P.shirtDark);
    R(ctx, cx + 1, baseY - 13, 2, 7, P.hatBand); // satchel strap

    // arms: left arm down, right arm to the rod
    R(ctx, cx - 7, baseY - 12, 2, 5, P.shirtDark);
    const armY = baseY - 12 - Math.round(twitch);
    R(ctx, cx + 5, armY, 4, 2, P.shirt);
    R(ctx, cx + 8, armY + 1, 2, 2, P.skin);

    // head (back of head)
    R(ctx, cx - 3, baseY - 19, 7, 6, P.skin);
    R(ctx, cx - 3, baseY - 19, 7, 1, P.hair);
    R(ctx, cx - 3, baseY - 18, 1, 4, P.hair);
    R(ctx, cx + 3, baseY - 18, 1, 4, P.hair);

    // straw hat
    R(ctx, cx - 6, baseY - 20, 13, 2, P.hat);   // brim
    R(ctx, cx - 6, baseY - 20, 13, 1, P.hatDark);
    R(ctx, cx - 4, baseY - 24, 8, 4, P.hat);    // crown
    R(ctx, cx - 4, baseY - 21, 8, 1, P.hatBand);
    R(ctx, cx - 4, baseY - 24, 8, 1, P.hatDark);
  }

  // ---------------------------------------------------------------------------
  // FISHING LINE + BOBBER
  // ---------------------------------------------------------------------------
  function drawFishing(ctx, t, game) {
    const rod = game.rod; // {hx,hy,tx,ty}
    if (!rod) return;

    // rod (tapered)
    drawRod(ctx, rod.hx, rod.hy, rod.tx, rod.ty);

    const st = game.state;
    if (st === "ready" && !game.cast) return;

    let bx, by;
    if (game.cast) {
      // cast arc interpolation, handled by game; bobber has current pos
      bx = game.bobber.x;
      by = game.bobber.y;
    } else {
      const b = game.bobber;
      // gentle bob while idle
      by = b.y + Math.sin(t * 2.6) * 1.2;
      if (st === "bite") by = b.y + Math.sin(t * 14) * 1.0 + game.biteDip;
      bx = b.x;
    }

    // line from rod tip to bobber (slight catenary)
    drawLine(ctx, rod.tx, rod.ty, bx, by, st === "reeling" ? 1 : 0);

    // water ripple where the line meets the surface
    if (st === "waiting" || st === "bite" || st === "reeling") {
      const a = 0.25 + 0.15 * Math.sin(t * 2 + bx);
      ctx.fillStyle = "rgba(220,245,240," + a.toFixed(2) + ")";
      ctx.fillRect(Math.round(bx) - 3, Math.round(game.bobber.y) + 2, 7, 1);
    }

    drawBobber(ctx, Math.round(bx), Math.round(by), game);

    // unmistakable in-world bite cue: expanding rings + a "!"
    if (st === "bite") {
      const prog = 1 - Math.max(0, game.biteWindow) / 1.5;
      for (let k = 0; k < 2; k++) {
        const rp = (prog + k * 0.5) % 1;
        const rad = 4 + rp * 16;
        ctx.strokeStyle = "rgba(255,240,180," + (0.55 * (1 - rp)).toFixed(2) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.round(bx), Math.round(by) + 1, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawExclaim(ctx, Math.round(bx), Math.round(by) - 13, t);
    }
  }

  function drawRod(ctx, hx, hy, tx, ty) {
    const dx = tx - hx, dy = ty - hy;
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const x = hx + dx * p;
      const y = hy + dy * p;
      const w = p < 0.25 ? 2 : 1;
      R(ctx, x, y, w, 1, p < 0.15 ? P.woodDark : i % 4 === 0 ? "#c9a06a" : "#8a6a3a");
    }
    R(ctx, tx, ty, 1, 1, "#e8ddc0");
  }

  function drawLine(ctx, x0, y0, x1, y1, taut) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.max(1, Math.hypot(dx, dy));
    const steps = Math.ceil(len);
    const sag = taut ? 2 : Math.min(10, len * 0.12);
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const x = x0 + dx * p;
      const y = y0 + dy * p + Math.sin(p * Math.PI) * sag;
      R(ctx, x, y, 1, 1, P.line);
      if (i % 3 === 0) R(ctx, x + 1, y + 1, 1, 1, P.lineShade);
    }
  }

  function drawBobber(ctx, x, y, game) {
    // rings on the water when the bobber is in the sea
    if (game.inWater) {
      const a = 0.28 + 0.12 * Math.sin(game.elapsed * 3);
      ctx.fillStyle = "rgba(225,248,242," + a.toFixed(2) + ")";
      ctx.fillRect(x - 4, y + 1, 9, 1);
      ctx.fillRect(x - 3, y - 1, 7, 1);
    }
    // body: white bottom, red top
    R(ctx, x - 2, y - 2, 5, 5, P.bobWhiteDark);
    R(ctx, x - 2, y - 2, 5, 3, P.bobRedDark);
    R(ctx, x - 1, y - 3, 3, 2, P.bobRed);
    R(ctx, x - 2, y - 2, 5, 1, P.bobRed);
    R(ctx, x - 2, y, 5, 2, P.bobWhite);
    R(ctx, x - 1, y + 1, 3, 1, "#ffffff");
    // antenna
    R(ctx, x, y - 5, 1, 2, P.bobRedDark);
    R(ctx, x, y - 6, 1, 1, "#ffd24a");
    // highlight
    R(ctx, x - 1, y - 2, 1, 1, "#ff9a80");
  }

  function drawExclaim(ctx, x, y, t) {
    const bob = Math.round(Math.sin(t * 14) * 1);
    const yy = y + bob;
    // dark outline then bright glyph
    R(ctx, x - 1, yy - 1, 3, 8, "#2a1a08");
    R(ctx, x + 2, yy - 1, 1, 7, "#2a1a08");
    R(ctx, x, yy, 1, 4, "#ffe24a");
    R(ctx, x + 1, yy, 1, 4, "#fff6c0");
    R(ctx, x, yy + 6, 2, 1, "#ffe24a");
    R(ctx, x + 1, yy + 1, 1, 3, "#ffffff");
  }

  // ---------------------------------------------------------------------------
  // PARTICLES
  // ---------------------------------------------------------------------------
  function drawParticles(ctx, game) {
    for (const p of game.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = Math.min(1, a * 1.4);
      const s = Math.max(1, Math.round(p.size * (p.grow ? 1 + (1 - a) : 1)));
      R(ctx, p.x, p.y, s, s, p.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette(ctx) {
    const g = ctx.createRadialGradient(160, 92, 90, 160, 92, 210);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(10,20,35,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 180);
  }

  // ---------------------------------------------------------------------------
  // FISH SPRITES (shared by reveal canvas)
  // ---------------------------------------------------------------------------
  function drawFishSprite(ctx, f, cx, cy, s, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    if (f.special === "ray") {
      drawRay(ctx, f, t);
      ctx.restore();
      return;
    }
    const spectral = f.pattern === "spectral";
    if (spectral) ctx.globalAlpha = 0.9;
    drawFishBody(ctx, f, t);
    drawTail(ctx, f, t);
    drawFins(ctx, f, t);
    drawPattern(ctx, f, t);
    drawEye(ctx, f);
    drawSpecial(ctx, f, t);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function bodySpan(f, p) {
    // smooth fish profile: 0 at tail (p=0), 1 near head
    const h = f.hgt * Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.02)), 0.7);
    return Math.max(2, h);
  }

  function drawFishBody(ctx, f, t) {
    const L = f.len, H = f.hgt;
    for (let i = 0; i < L; i++) {
      const p = i / (L - 1);
      const h = bodySpan(f, p);
      const x = -L / 2 + i;
      const top = -h / 2, bot = h / 2;
      for (let yy = Math.floor(top); yy < Math.ceil(bot); yy++) {
        const ny = (yy - top) / Math.max(1, h);
        let col;
        if (ny < 0.28) col = f.bodyDark;
        else if (ny < 0.72) col = f.body;
        else col = f.belly;
        // subtle scale texture
        if ((i + yy) % 5 === 0 && ny >= 0.28 && ny < 0.72) col = f.bodyDark;
        R(ctx, x, yy, 1, 1, col);
      }
    }
    // belly highlight
    for (let i = 3; i < L - 3; i++) {
      R(ctx, -L / 2 + i, Math.floor(f.hgt * 0.30), 1, 1, f.belly);
    }
    // glowing outline for spectral
    if (f.pattern === "spectral") {
      for (let i = 0; i < L; i++) {
        const h = bodySpan(f, i / (L - 1));
        R(ctx, -L / 2 + i, Math.floor(-h / 2) - 1, 1, 1, f.accent);
      }
    }
  }

  function drawTail(ctx, f, t) {
    const x = -f.len / 2;
    const h = f.hgt;
    const wag = Math.sin(t * 4) * 1;
    const at = Math.round(wag);
    if (f.tail === "fork") {
      R(ctx, x - 1, -h * 0.55 + at, 2, 3, f.fin);
      R(ctx, x - 2, -h * 0.55 - 1 + at, 2, 3, f.finDark);
      R(ctx, x - 1, h * 0.15 + at, 2, 3, f.fin);
      R(ctx, x - 2, h * 0.30 + at, 2, 3, f.finDark);
      R(ctx, x, -1 + at, 2, 2, f.bodyDark);
    } else if (f.tail === "fan") {
      for (let j = 0; j < h; j++) {
        const w = 3 + Math.round(Math.sin((j / h) * Math.PI) * 3);
        R(ctx, x - w, Math.round(-h / 2 + j + at), w, 1, j % 2 ? f.fin : f.finDark);
      }
    } else if (f.tail === "crescent") {
      R(ctx, x - 2, -h * 0.7 + at, 3, 4, f.fin);
      R(ctx, x - 4, -h * 0.7 - 2 + at, 3, 4, f.finDark);
      R(ctx, x - 2, h * 0.3 + at, 3, 4, f.fin);
      R(ctx, x - 4, h * 0.5 + at, 3, 4, f.finDark);
    } else if (f.tail === "veil") {
      for (let j = 0; j < h + 4; j++) {
        const w = 4 + Math.round(Math.sin((j / (h + 4)) * Math.PI) * 5) + Math.round(Math.sin(t * 3 + j) * 1);
        R(ctx, x - w, Math.round(-(h + 4) / 2 + j + at), w, 1, j % 3 === 0 ? f.finDark : f.fin);
      }
    } else if (f.tail === "lobe") {
      R(ctx, x - 3, -h * 0.4, 3, 3, f.finDark);
      R(ctx, x - 3, h * 0.2, 3, 3, f.finDark);
      R(ctx, x - 4, -h * 0.4, 1, 3, f.fin);
      R(ctx, x - 4, h * 0.2, 1, 3, f.fin);
    } else if (f.tail === "whip") {
      let wx = x, wy = 0;
      for (let i = 0; i < 12; i++) {
        wx -= 1;
        wy += Math.round(Math.sin(i * 0.7 + t * 4));
        R(ctx, wx, wy, 1, 1, i < 8 ? f.body : f.accent);
      }
    } else {
      R(ctx, x - 2, -h / 2, 2, h, f.fin);
    }
  }

  function drawFins(ctx, f, t) {
    const flap = Math.sin(t * 3) > 0 ? 0 : 1;
    // dorsal
    const dx = -f.len * 0.1;
    const dh = f.hgt * 0.5;
    for (let j = 0; j < dh; j++) {
      const w = Math.round((dh - j) * 0.8) + 1;
      R(ctx, dx + j, Math.round(-f.hgt / 2 - j * 0.7), w, 1, j % 2 ? f.fin : f.finDark);
    }
    // pectoral
    R(ctx, f.len * 0.28, Math.round(f.hgt * 0.1 + flap), 4, 2, f.fin);
    R(ctx, f.len * 0.28, Math.round(f.hgt * 0.1 + flap), 1, 2, f.finDark);
    // pelvic
    R(ctx, -f.len * 0.05, Math.round(f.hgt * 0.35 + flap), 3, 2, f.finDark);
  }

  function drawPattern(ctx, f, t) {
    const L = f.len, H = f.hgt;
    if (f.pattern === "stripes" || f.pattern === "bands") {
      const step = f.pattern === "bands" ? 4 : 3;
      for (let i = 4; i < L - 4; i += step) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        R(ctx, -L / 2 + i, Math.floor(-h / 2) + 1, 1, Math.floor(h * 0.6), f.accent);
      }
    } else if (f.pattern === "spots") {
      for (let i = 3; i < L - 3; i += 3) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        if ((i * 7) % 5 < 2) R(ctx, -L / 2 + i, Math.floor(-h / 2) + 2, 1, 1, f.accent);
        if (i % 2 === 0) R(ctx, -L / 2 + i, Math.floor(h * 0.05), 1, 1, f.accent);
      }
    } else if (f.pattern === "scales") {
      for (let i = 2; i < L - 2; i += 2) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        R(ctx, -L / 2 + i, Math.floor(-h / 4), 1, 1, f.accent);
        R(ctx, -L / 2 + i, Math.floor(h / 6), 1, 1, f.accent);
      }
    } else if (f.pattern === "koi") {
      R(ctx, -L * 0.28, Math.floor(-H * 0.3), Math.round(L * 0.16), Math.round(H * 0.5), f.finDark);
      R(ctx, L * 0.05, Math.floor(-H * 0.15), Math.round(L * 0.13), Math.round(H * 0.4), f.finDark);
      R(ctx, -L * 0.05, Math.floor(-H * 0.42), 2, 2, f.accent);
    } else if (f.pattern === "moon") {
      for (let i = 2; i < L - 2; i++) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        if (i % 2 === 0) R(ctx, -L / 2 + i, Math.floor(-h / 3), 1, Math.floor(h * 0.5), "rgba(255,255,255,0.5)");
      }
    } else if (f.pattern === "storm") {
      for (let i = 3; i < L - 3; i += 2) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        const off = Math.round(Math.sin(i + t * 5) * 1);
        R(ctx, -L / 2 + i, Math.floor(-h / 2) + 2 + off, 1, 1, f.accent);
      }
    } else if (f.pattern === "gilded") {
      for (let i = 2; i < L - 2; i++) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        R(ctx, -L / 2 + i, Math.floor(-h / 2) + 1, 1, 1, "rgba(255,248,200,0.85)");
        R(ctx, -L / 2 + i, Math.floor(h / 2) - 2, 1, 1, "rgba(120,80,20,0.5)");
      }
    } else if (f.pattern === "runes") {
      for (let i = 3; i < L - 3; i += 4) {
        const p = i / (L - 1);
        const h = bodySpan(f, p);
        const glow = 0.6 + 0.4 * Math.sin(t * 3 + i);
        ctx.fillStyle = "rgba(140,255,235," + glow.toFixed(2) + ")";
        ctx.fillRect(Math.round(-L / 2 + i), Math.floor(-h / 2) + 2, 1, 3);
        ctx.fillRect(Math.round(-L / 2 + i) + 1, Math.floor(-h / 2) + 3, 1, 1);
      }
    } else if (f.pattern === "spectral") {
      for (let i = 3; i < L - 3; i += 5) {
        R(ctx, -L / 2 + i, Math.round(Math.sin(i + t * 2) * H * 0.25), 1, 1, f.accent);
      }
    }
  }

  function drawEye(ctx, f) {
    const ex = f.len * 0.36;
    const ey = -Math.round(f.hgt * 0.12);
    R(ctx, ex - 1, ey - 1, 3, 3, "#ffffff");
    R(ctx, ex, ey - 1, 2, 2, f.eye);
    R(ctx, ex, ey - 1, 1, 1, "#ffffff");
  }

  function drawSpecial(ctx, f, t) {
    const L = f.len, H = f.hgt;
    if (f.special === "koi") {
      // whiskers
      R(ctx, L * 0.46, H * 0.18, 3, 1, f.finDark);
      R(ctx, L * 0.46, H * 0.28, 3, 1, f.finDark);
    } else if (f.special === "salmon") {
      // hooked jaw
      R(ctx, L * 0.42, H * 0.1, 4, 2, f.bodyDark);
      R(ctx, L * 0.46, H * 0.1, 1, 3, f.bodyDark);
    } else if (f.special === "marlin") {
      // long bill
      R(ctx, L * 0.48, 0, 12, 1, f.bodyDark);
      R(ctx, L * 0.48, 1, 10, 1, f.fin);
      // tall sail
      for (let j = 0; j < 9; j++) {
        R(ctx, -L * 0.05 + j, Math.round(-H / 2 - j * 1.1), 1, 1, j % 2 ? f.fin : f.finDark);
        R(ctx, -L * 0.05 + j + 1, Math.round(-H / 2 - j * 1.1), 1, 1, f.fin);
      }
    } else if (f.special === "coelacanth") {
      // lobed paired fins
      R(ctx, -L * 0.1, H * 0.42, 3, 4, f.finDark);
      R(ctx, L * 0.02, H * 0.42, 3, 4, f.fin);
      R(ctx, L * 0.12, H * 0.42, 3, 3, f.finDark);
      // speckles
      for (let i = 0; i < 6; i++) {
        const px = -L * 0.3 + hash(i * 3.1) * L * 0.5;
        R(ctx, px, -H * 0.2 + hash(i * 7) * H * 0.4, 1, 1, f.belly);
      }
    } else if (f.special === "eidolon") {
      // flowing tendrils
      for (let k = 0; k < 3; k++) {
        let wx = L * 0.1, wy = -H * 0.5;
        for (let j = 0; j < 7; j++) {
          wx += Math.round(Math.sin(j * 0.8 + t * 3 + k));
          wy -= 1;
          R(ctx, wx, wy, 1, 1, f.accent);
        }
      }
      // faint halo
      ctx.globalAlpha = 0.25;
      R(ctx, -L / 2 - 1, -H / 2 - 1, L + 2, H + 2, f.fin);
      ctx.globalAlpha = 1;
    }
  }

  function drawRay(ctx, f, t) {
    // A kite-shaped ray with broad wings and a whip tail.
    const W = f.len, H = f.hgt;
    for (let i = 0; i < W; i++) {
      const p = i / (W - 1);
      const span = Math.round(Math.sin(Math.PI * p) * H);
      const x = -W / 2 + i;
      for (let j = 0; j < span; j++) {
        const ny = j / Math.max(1, span);
        const col = ny < 0.3 ? f.bodyDark : ny < 0.7 ? f.body : f.belly;
        R(ctx, x, -Math.floor(span / 2) + j, 1, 1, col);
      }
      if (i % 3 === 0) {
        R(ctx, x, Math.round(-span / 2) + 1, 1, 1, f.accent);
        R(ctx, x, Math.round(span / 2) - 2, 1, 1, f.accent);
      }
    }
    // tail
    let tx = W / 2, ty = 0;
    for (let i = 0; i < 14; i++) {
      tx += 1;
      ty += Math.round(Math.sin(i * 0.6 + t * 4) * 0.8);
      R(ctx, tx, ty, 1, 1, i < 9 ? f.body : f.accent);
    }
    // eyes on the head (front = left)
    const ex = -W * 0.36;
    R(ctx, ex - 1, -2, 2, 2, "#fff");
    R(ctx, ex - 1, 1, 2, 2, "#fff");
    R(ctx, ex, -2, 1, 2, f.eye);
    R(ctx, ex, 1, 1, 2, f.eye);
  }

  window.Art = {
    P, R, hash,
    DOCK,
    drawScene(ctx, t, game) {
      ctx.clearRect(0, 0, 320, 180);
      drawSky(ctx, t);
      drawBirds(ctx, t);
      drawSea(ctx, t);
      drawDistant(ctx, t);
      drawBoat(ctx, t);
      drawFishShadows(ctx, t);
      drawShore(ctx, t);
      drawBackPlants(ctx, t);
      drawDock(ctx, t);
      drawLantern(ctx, 118, 150, t);
      drawAngler(ctx, t, game);
      drawFishing(ctx, t, game);
      drawForeground(ctx, t);
      drawParticles(ctx, game);
      drawVignette(ctx);
    },
    drawFishSprite,
  };
})();
