/* scene.js - all environment art for Tidebloom Cove, drawn in code.
   Everything is axis-aligned / integer based so the logical 320x180 buffer
   stays crisp when nearest-neighbour scaled 4x. */
(function () {
  const U = window.FishUtil;
  const P = {
    waterDeep: "#123a49", waterMid: "#1a5566", waterNear: "#26707a",
    waterShallow: "#37938d", waterHi: "#7fd3c6", foam: "#e2f7ef",
    sandDark: "#a9855a", sand: "#cbaa79", sandLight: "#e8d6a4",
    grassDark: "#33603a", grass: "#4a7d45", grassLight: "#6ba15a", grassHi: "#93c56b",
    leafDark: "#2a5530", leaf: "#3c7a3d", leafLight: "#5aa14c", leafHi: "#79bd5c",
    trunkDark: "#432c1c", trunk: "#654228",
    rockDark: "#414c56", rock: "#63717d", rockLight: "#8a99a4",
    woodDark: "#4a2f1e", wood: "#6b4527", woodLight: "#915f38", woodHi: "#bd8752",
    skin: "#e9b78e", skinDk: "#c88f64",
    hat: "#e0ab4c", hatDk: "#a9751f",
    shirt: "#d1604c", shirtDk: "#9d3f34",
    pants: "#3f5d84", pantsDk: "#2c4260",
    boot: "#3a2a1c",
    hair: "#43301f",
    cattail: "#6b4326",
    flowerA: "#f2a3c0", flowerB: "#f6e07a", flowerC: "#a0d0f0"
  };

  // A stable pseudo-random field for decoration placement.
  const R = U.mulberry32(20240711);
  const rnd = () => R();

  // water edge as a function of x
  function shoreY(x) {
    return 55 + Math.sin(x * 0.045) * 4.2 + Math.sin(x * 0.11 + 1.7) * 2.3 + Math.sin(x * 0.23 + 0.5) * 0.9;
  }

  function mix(a, b, t) {
    const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * U.clamp(t, 0, 1)));
    return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  }

  // ---- precomputed decoration ---------------------------------------------
  const grassTufts = [], flowers = [], rocks = [], reeds = [], lilies = [];
  for (let i = 0; i < 210; i++) {
    const x = rnd() * 320;
    const land = shoreY(x) - 8;
    if (land < 6) continue;
    grassTufts.push({ x: Math.floor(x), y: Math.floor(rnd() * (land - 3)), c: rnd() < 0.5 ? P.grassDark : P.grassHi, big: rnd() < 0.25 });
  }
  for (let i = 0; i < 34; i++) {
    const x = rnd() * 320, land = shoreY(x) - 9;
    if (land < 8) continue;
    flowers.push({ x: Math.floor(x), y: Math.floor(rnd() * (land - 6) + 4), c: [P.flowerA, P.flowerB, P.flowerC][Math.floor(rnd() * 3)], y2: Math.floor(rnd() * 3) });
  }
  for (let i = 0; i < 6; i++) rocks.push({ x: 20 + rnd() * 280, y: 8 + rnd() * 30, s: 0.7 + rnd() * 0.8 });
  // reeds hug the shoreline
  for (let x = 6; x < 316; x += 7) {
    if (rnd() < 0.55) continue;
    if (x > 132 && x < 190) continue; // keep the dock clear
    reeds.push({ x: x + rnd() * 3, y: shoreY(x) - 1, h: 10 + rnd() * 9, lean: (rnd() - 0.5) * 4, cat: rnd() < 0.5, ph: rnd() * 6.28 });
  }
  for (let i = 0; i < 9; i++) lilies.push({ x: 16 + rnd() * 288, y: 72 + rnd() * 96, r: 3 + Math.floor(rnd() * 3), f: rnd() < 0.3 });
  // keep lilies out from under the dock
  lilies.forEach(l => { if (l.x > 130 && l.x < 192 && l.y < 144) l.x += 74; });

  const trees = [
    { x: 30, y: shoreY(30) - 1, s: 1.08, ph: 0.2 },
    { x: 86, y: shoreY(86) - 2, s: 0.82, ph: 1.4 },
    { x: 268, y: shoreY(268) - 1, s: 1.0, ph: 2.6 },
    { x: 310, y: shoreY(310) - 3, s: 0.9, ph: 3.7 }
  ];
  const bushes = [
    { x: 118, y: shoreY(118) - 2, s: 1.0, c: 0 },
    { x: 202, y: shoreY(202) - 2, s: 0.85, c: 1 },
    { x: 232, y: shoreY(232) - 3, s: 0.7, c: 0 },
    { x: 56, y: shoreY(56) - 2, s: 0.75, c: 1 },
    { x: 148, y: shoreY(148) - 1, s: 0.6, c: 0 }
  ];

  function drawTree(ctx, x, baseY, s, ph, t, shadow) {
    const sway = Math.sin(t * 0.9 + ph) * 1.1 * s;
    if (shadow) {
      ctx.globalAlpha = 0.16;
      U.ellipse(ctx, x + 9, baseY + 2, 15 * s, 4 * s, "#0a1c20");
      ctx.globalAlpha = 1;
      return;
    }
    // trunk
    const tw = Math.max(2, Math.round(4 * s));
    U.rect(ctx, x - tw / 2, baseY - 20 * s, tw, 20 * s, P.trunk);
    U.rect(ctx, x - tw / 2, baseY - 20 * s, Math.max(1, tw / 2), 20 * s, P.trunkDark);
    // canopy (layered crisp ellipses)
    const cx = x + sway, cy = baseY - 24 * s;
    U.ellipse(ctx, cx, cy + 2 * s, 15 * s, 11 * s, P.leafDark);
    U.ellipse(ctx, cx - 3 * s, cy - 1 * s, 12 * s, 9 * s, P.leaf);
    U.ellipse(ctx, cx + 3.5 * s, cy - 0.5 * s, 10 * s, 8 * s, P.leaf);
    U.ellipse(ctx, cx - 4 * s, cy - 4 * s, 7 * s, 5 * s, P.leafLight);
    U.ellipse(ctx, cx + 4 * s, cy - 3 * s, 5.5 * s, 4 * s, P.leafLight);
    U.ellipse(ctx, cx - 5 * s, cy - 6 * s, 3 * s, 2 * s, P.leafHi);
    U.ellipse(ctx, cx + 5 * s, cy - 5 * s, 2.5 * s, 2 * s, P.leafHi);
    // a couple of dangling leaves highlights
    U.rect(ctx, cx - 12 * s, cy + 5 * s, 2, 2, P.leafLight);
    U.rect(ctx, cx + 9 * s, cy + 6 * s, 2, 2, P.leafDark);
  }

  function drawBush(ctx, b, t, shadow) {
    const x = b.x, y = b.y, s = b.s;
    const sway = Math.sin(t * 1.3 + x) * 0.7 * s;
    if (shadow) {
      ctx.globalAlpha = 0.15;
      U.ellipse(ctx, x + 5, y + 2, 10 * s, 3 * s, "#0a1c20");
      ctx.globalAlpha = 1; return;
    }
    U.ellipse(ctx, x + sway, y - 4 * s, 9 * s, 6 * s, P.leafDark);
    U.ellipse(ctx, x - 2 * s + sway, y - 5 * s, 6 * s, 5 * s, P.leaf);
    U.ellipse(ctx, x + 3 * s + sway, y - 5 * s, 5 * s, 4 * s, P.leaf);
    U.ellipse(ctx, x - 2 * s + sway, y - 7 * s, 3 * s, 2 * s, P.leafLight);
    if (b.c === 1) { // berries
      for (let i = 0; i < 5; i++) {
        U.rect(ctx, x - 6 * s + (i * 3.3) % 8 * s, y - 6 * s + (i % 2) * 3 * s, 1, 1, "#e0585f");
      }
    }
  }

  function drawRock(ctx, x, y, s, shadow) {
    if (shadow) { ctx.globalAlpha = 0.16; U.ellipse(ctx, x + 3, y + 2, 7 * s, 2.5 * s, "#0a1c20"); ctx.globalAlpha = 1; return; }
    U.ellipse(ctx, x, y, 6 * s, 4.5 * s, P.rock);
    U.ellipse(ctx, x - 1.5 * s, y - 1.5 * s, 3.5 * s, 2.6 * s, P.rockLight);
    U.rect(ctx, x - 5 * s, y + 2 * s, 10 * s, 1.5 * s, P.rockDark);
  }

  function drawReed(ctx, r, t) {
    const sway = Math.sin(t * 1.1 + r.ph) * 1.2 + r.lean;
    const x = r.x, y = r.y;
    const topX = x + sway, topY = y - r.h;
    // stem
    const steps = Math.round(r.h);
    for (let i = 0; i <= steps; i++) {
      const tt = i / steps;
      U.rect(ctx, x + sway * tt, y - r.h * tt, 1, 1, P.leafDark);
    }
    if (r.cat) {
      U.rect(ctx, topX - 1, topY - 1, 2, 4, P.cattail);
      U.rect(ctx, topX - 1, topY - 1, 1, 4, "#8a5c34");
    } else {
      U.rect(ctx, topX - 1, topY - 2, 1, 3, P.leaf);
      U.rect(ctx, topX + 1, topY - 1, 1, 2, P.leaf);
    }
  }

  // ---- the animated water --------------------------------------------------
  function drawWater(ctx, t) {
    const W = 320, H = 180;
    for (let y = 46; y < H; y++) {
      const tt = (y - 46) / (H - 46);
      let c;
      if (tt < 0.25) c = mix(P.waterShallow, P.waterNear, tt / 0.25);
      else if (tt < 0.6) c = mix(P.waterNear, P.waterMid, (tt - 0.25) / 0.35);
      else c = mix(P.waterMid, P.waterDeep, (tt - 0.6) / 0.4);
      U.rect(ctx, 0, y, W, 1, c);
    }
    // long slow shimmer bands
    for (let i = 0; i < 7; i++) {
      const baseY = 62 + i * 16;
      const off = (t * (8 + i * 1.5) + i * 37) % 360 - 20;
      for (let x = -20; x < 340; x += 6) {
        const yy = baseY + Math.sin((x + off) * 0.05 + t * 0.8 + i) * 3;
        const v = Math.sin((x + off) * 0.09 + i * 1.7);
        if (v > 0.75) U.rect(ctx, x, yy, 3, 1, P.waterHi);
        else if (v > 0.3) U.rect(ctx, x, yy, 2, 1, mix(P.waterNear, P.waterHi, 0.4));
      }
    }
    // fine moving caustic dashes
    for (let i = 0; i < 60; i++) {
      const x = (i * 53 + t * 10) % 330 - 5;
      const y = 58 + ((i * 91) % 116) + Math.sin(t * 0.6 + i) * 2;
      if (Math.sin(t * 1.4 + i * 2.1) > 0.55) U.rect(ctx, x, y, 2, 1, mix(P.waterShallow, P.waterHi, 0.5));
    }
    // fish shadows gliding under the surface
    for (let i = 0; i < 3; i++) {
      const spd = 9 + i * 4;
      const x = ((t * spd + i * 120) % 420) - 40;
      const y = 96 + i * 26 + Math.sin(t * 0.7 + i) * 4;
      ctx.globalAlpha = 0.16;
      U.ellipse(ctx, x, y, 9, 3, "#08222a");
      U.ellipse(ctx, x - 9, y + Math.sin(t * 3 + i) * 1.5, 3, 1.5, "#08222a");
      ctx.globalAlpha = 1;
    }
    // bubbles
    for (let i = 0; i < 10; i++) {
      const life = 3 + (i % 3);
      const ph = (t * 0.5 + i * 0.63) % 1;
      const x = 30 + ((i * 47) % 270) + Math.sin(t + i) * 2;
      const y = 150 - ph * 80;
      if (Math.sin(ph * Math.PI) > 0.1) {
        ctx.globalAlpha = 0.5 * Math.sin(ph * Math.PI);
        U.rect(ctx, x, y, 1, 1, "#cfeee6");
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawFoam(ctx, t) {
    for (let x = 0; x < 320; x++) {
      const sy = Math.round(shoreY(x));
      const w = Math.sin(x * 0.3 + t * 1.6) * 0.5 + Math.sin(x * 0.09 - t) * 0.5;
      if (w > -0.2) U.rect(ctx, x, sy - 1, 1, 1, P.foam);
      if (Math.sin(x * 0.22 + t * 1.1) > 0.3) U.rect(ctx, x, sy + 1, 1, 1, mix(P.waterShallow, P.foam, 0.5));
    }
  }

  // ---- land ----------------------------------------------------------------
  function drawLand(ctx, t) {
    for (let x = 0; x < 320; x++) {
      const sy = Math.round(shoreY(x));
      const sandTop = sy - 7;
      U.rect(ctx, x, 0, 1, Math.max(0, sandTop), P.grass);
      if (sandTop < sy) U.rect(ctx, x, sandTop, 1, sy - sandTop, P.sandDark);
      // wet sand just above the water
      U.rect(ctx, x, sy - 2, 1, 2, P.sand);
    }
    // grass shading: darker toward the top
    for (let x = 0; x < 320; x++) {
      const sy = Math.round(shoreY(x));
      const band = Math.round(sy * 0.42);
      U.rect(ctx, x, 0, 1, Math.max(0, band), P.grassDark);
      U.rect(ctx, x, band, 1, Math.max(0, sy - 7 - band), P.grass);
    }
    // grass tufts and flowers
    grassTufts.forEach(g => {
      U.rect(ctx, g.x, g.y, 1, g.big ? 3 : 2, g.c);
      if (g.big) U.rect(ctx, g.x + 1, g.y + 1, 1, 1, P.grassLight);
    });
    flowers.forEach(f => {
      U.rect(ctx, f.x, f.y, 1, 1, f.c);
      U.rect(ctx, f.x, f.y + 1, 1, 1, P.leafDark);
      if (f.y2 === 0) U.rect(ctx, f.x - 1, f.y, 1, 1, f.c);
      if (f.y2 === 1) U.rect(ctx, f.x + 1, f.y, 1, 1, f.c);
    });
  }

  // ---- the dock ------------------------------------------------------------
  const DOCK = { x0: 138, x1: 182, y0: 46, y1: 140 };

  function drawDock(ctx, t) {
    const { x0, x1, y0, y1 } = DOCK;
    // shadow on the water, offset lower-right
    ctx.globalAlpha = 0.22;
    U.rect(ctx, x0 + 4, y0 + 5, x1 - x0, y1 - y0, "#08222a");
    ctx.globalAlpha = 1;
    // planks
    for (let y = y0; y < y1; y += 6) {
      const c = ((y / 6) % 2 === 0) ? P.wood : P.woodLight;
      U.rect(ctx, x0, y, x1 - x0, 5, c);
      U.rect(ctx, x0, y, x1 - x0, 1, P.woodHi);        // sunlit edge
      U.rect(ctx, x0, y + 4, x1 - x0, 1, P.woodDark);   // gap shadow
      // plank nail dots
      U.rect(ctx, x0 + 3, y + 2, 1, 1, P.woodDark);
      U.rect(ctx, x1 - 4, y + 2, 1, 1, P.woodDark);
    }
    // side rails / posts
    U.rect(ctx, x0 - 3, y0, 3, y1 - y0 + 2, P.woodDark);
    U.rect(ctx, x0 - 3, y0, 1, y1 - y0 + 2, P.wood);
    U.rect(ctx, x1, y0, 3, y1 - y0 + 2, P.woodDark);
    U.rect(ctx, x1, y0, 1, y1 - y0 + 2, P.wood);
    // post caps
    U.rect(ctx, x0 - 4, y0 - 2, 5, 3, P.woodLight);
    U.rect(ctx, x1 - 1, y0 - 2, 5, 3, P.woodLight);
    U.rect(ctx, x0 - 4, y0 - 2, 5, 1, P.woodHi);
    U.rect(ctx, x1 - 1, y0 - 2, 5, 1, P.woodHi);
    // a crate near the shore end and a coil of rope
    U.rect(ctx, 172, 56, 12, 11, P.wood);
    U.rect(ctx, 172, 56, 12, 2, P.woodHi);
    U.rect(ctx, 172, 63, 12, 1, P.woodDark);
    U.rect(ctx, 177, 56, 1, 11, P.woodDark);
    U.rect(ctx, 172, 58, 1, 9, P.woodLight);
    ctx.globalAlpha = 0.9;
    U.ellipse(ctx, 146, 64, 4, 2, "#b9945c");
    U.ellipse(ctx, 146, 64, 2, 1, "#8a6a3c");
    ctx.globalAlpha = 1;
  }

  // ---- the angler ----------------------------------------------------------
  // Feet sit on the dock; total height ~24 logical px.
  const ANGLER = { x: 159, feet: 112 };

  function rodTip(t, bend) {
    bend = bend || 0;
    const sway = Math.sin(t * 1.3) * 0.7;
    return { x: 197 - bend * 12 + sway, y: 122 - bend * 6 - Math.abs(sway) * 0.4 };
  }

  function drawAngler(ctx, t, pose) {
    pose = pose || {};
    const bend = pose.bend || 0;
    const x = ANGLER.x, fy = ANGLER.feet;
    const bob = Math.sin(t * 1.6) * 0.35 * (1 - bend);
    const y = fy + bob;

    // shadow beneath
    ctx.globalAlpha = 0.28;
    U.ellipse(ctx, x + 2, y + 1, 8, 2.5, "#2a1b0e");
    ctx.globalAlpha = 1;

    const bx = x - 6; // body is 12px wide
    // boots
    U.rect(ctx, bx + 1, y - 3, 4, 3, P.boot);
    U.rect(ctx, bx + 7, y - 3, 4, 3, P.boot);
    U.rect(ctx, bx + 1, y - 1, 4, 1, "#241811");
    U.rect(ctx, bx + 7, y - 1, 4, 1, "#241811");
    // overalls / trousers
    U.rect(ctx, bx + 2, y - 8, 3, 5, P.pantsDk);
    U.rect(ctx, bx + 7, y - 8, 3, 5, P.pants);
    U.rect(ctx, bx, y - 11, 12, 4, P.pants);
    U.rect(ctx, bx, y - 11, 12, 1, P.pantsDk);
    // shirt
    U.rect(ctx, bx + 1, y - 16, 10, 5, P.shirt);
    U.rect(ctx, bx + 1, y - 16, 10, 1, "#e07a63");
    U.rect(ctx, bx + 1, y - 16, 3, 5, P.shirtDk);
    // suspender straps
    U.rect(ctx, bx + 3, y - 12, 1, 3, P.pantsDk);
    U.rect(ctx, bx + 8, y - 12, 1, 3, P.pantsDk);

    // left arm resting, right arm toward the rod
    U.rect(ctx, bx - 1, y - 15, 2, 5, P.shirt);
    U.rect(ctx, bx - 1, y - 20, 2, 5, P.shirtDk);
    U.rect(ctx, bx - 1, y - 10, 2, 2, P.skin);
    U.rect(ctx, bx + 9, y - 15, 4, 2, P.shirt);
    U.rect(ctx, bx + 12, y - 14, 2, 2, P.skin);

    // head + hair + straw hat
    U.rect(ctx, bx + 2, y - 21, 8, 6, P.skin);
    U.rect(ctx, bx + 2, y - 21, 8, 1, P.hair);
    U.rect(ctx, bx + 1, y - 20, 1, 4, P.hair);
    U.rect(ctx, bx + 10, y - 20, 1, 4, P.hair);
    // hat crown
    U.rect(ctx, bx + 3, y - 24, 6, 3, P.hat);
    U.rect(ctx, bx + 3, y - 24, 6, 1, "#f0c76a");
    U.rect(ctx, bx + 3, y - 21, 6, 1, P.hatDk);
    // brim
    U.ellipse(ctx, bx + 6, y - 20.5, 8, 2.1, P.hatDk);
    U.ellipse(ctx, bx + 6, y - 21, 7.4, 1.8, P.hat);
    U.ellipse(ctx, bx + 4, y - 21.5, 2.5, 0.9, "#f2cf7c");

    // the rod
    const tip = rodTip(t, bend);
    const hx = bx + 13, hy = y - 14;
    let px = hx, py = hy;
    const segs = 14;
    for (let i = 1; i <= segs; i++) {
      const tt = i / segs;
      const nx = hx + (tip.x - hx) * tt;
      const ny = hy + (tip.y - hy) * tt + Math.sin(tt * Math.PI) * (2 + bend * 4);
      const c = tt > 0.5 ? "#2f2115" : P.trunk;
      ctx.fillStyle = c;
      ctx.fillRect(px, py, Math.max(1, Math.abs(nx - px)), Math.max(1, Math.abs(ny - py)));
      px = nx; py = ny;
    }
    // reel
    U.rect(ctx, hx - 1, hy + 1, 3, 3, "#7a7468");
    U.rect(ctx, hx, hy + 2, 1, 1, "#3a3730");
  }

  // ---- foreground depth ----------------------------------------------------
  function drawForeground(ctx, t) {
    // ferns tucked into the bottom-left corner
    const fx = 8, fy = 178;
    for (let i = 0; i < 6; i++) {
      const ang = -0.9 + i * 0.32;
      const sway = Math.sin(t * 0.8 + i) * 1.2;
      const len = 22 + i * 3;
      const ex = fx + Math.cos(ang) * len * 0.55 + sway;
      const ey = fy + Math.sin(ang) * len;
      for (let k = 0; k <= 10; k++) {
        const tt = k / 10;
        const x = fx + (ex - fx) * tt;
        const y = fy + (ey - fy) * tt;
        U.rect(ctx, x, y, 2, 1, k > 7 ? P.leaf : P.leafDark);
      }
    }
    // cattail cluster bottom-right, drawn over the water
    const cx = 312, cy = 182;
    for (let i = 0; i < 5; i++) {
      const sway = Math.sin(t * 1.1 + i * 1.3) * 1.6;
      const h = 34 + i * 6;
      for (let k = 0; k <= h; k++) U.rect(ctx, cx - i * 4 + sway * (k / h), cy - k, 1, 1, P.leafDark);
      U.rect(ctx, cx - i * 4 + sway - 1, cy - h, 3, 6, P.cattail);
    }
    // floating motes / pollen
    for (let i = 0; i < 16; i++) {
      const x = (i * 71 + t * (4 + (i % 3))) % 340 - 10;
      const y = 20 + ((i * 53) % 150) + Math.sin(t * 0.9 + i) * 5;
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 2 + i);
      U.rect(ctx, x, y, 1, 1, "#fff2c4");
      ctx.globalAlpha = 1;
    }
  }

  // ---- public --------------------------------------------------------------
  const Scene = {
    W: 320, H: 180, P, DOCK, ANGLER, rodTip, shoreY,
    draw(ctx, t, pose) {
      drawWater(ctx, t);
      drawLand(ctx, t);

      // shadows first, then the objects that cast them
      trees.forEach(tr => drawTree(ctx, tr.x, tr.y, tr.s, tr.ph, t, true));
      bushes.forEach(b => drawBush(ctx, b, t, true));
      rocks.forEach(r => drawRock(ctx, r.x, r.y, r.s, true));
      drawDock(ctx, t);
      drawAngler(ctx, t, pose);

      trees.forEach(tr => drawTree(ctx, tr.x, tr.y, tr.s, tr.ph, t, false));
      bushes.forEach(b => drawBush(ctx, b, t, false));
      rocks.forEach(r => drawRock(ctx, r.x, r.y, r.s, false));

      // lily pads float between land and docks
      lilies.forEach((l, i) => {
        const bob = Math.sin(t * 1.1 + i) * 0.6;
        U.ellipse(ctx, l.x, l.y + bob, l.r, l.r * 0.6, P.leafDark);
        U.ellipse(ctx, l.x - 0.5, l.y - 0.4 + bob, l.r - 1, l.r * 0.5 - 1, P.leaf);
        U.rect(ctx, l.x + l.r * 0.4, l.y + bob, 1, 1, P.waterDeep);
        if (l.f) { U.rect(ctx, l.x - 1, l.y - 1 + bob, 2, 2, P.flowerA); U.rect(ctx, l.x - 1, l.y - 1 + bob, 1, 1, "#fff0f5"); }
      });

      reeds.forEach(r => drawReed(ctx, r, t));
      drawFoam(ctx, t);
      drawForeground(ctx, t);
    }
  };
  window.Scene = Scene;
})();
