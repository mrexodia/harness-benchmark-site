/* Stillwater Cove — a tiny cozy pixel-art fishing game.
   All artwork is drawn procedurally in code. No external assets. */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Canvas setup
  // ---------------------------------------------------------------------------
  const W = 320, H = 180;                 // logical (pixel-art) resolution
  const main = document.getElementById("game");
  const g = main.getContext("2d");
  g.imageSmoothingEnabled = false;

  const scene = document.createElement("canvas");
  scene.width = W; scene.height = H;
  const s = scene.getContext("2d");
  s.imageSmoothingEnabled = false;

  const fishBuf = document.createElement("canvas");
  fishBuf.width = 80; fishBuf.height = 52;

  const hit = document.getElementById("hit");

  // ---------------------------------------------------------------------------
  // Math / color helpers
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  // ---------------------------------------------------------------------------
  // Pixel drawing primitives — anti-alias-free, integer scanlines
  // ---------------------------------------------------------------------------
  function fr(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  function fillPoly(c, pts, col) {
    let miny = Infinity, maxy = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const y = pts[i][1];
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
    }
    let y0 = Math.floor(miny), y1 = Math.ceil(maxy);
    c.fillStyle = col;
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          const t = (yc - a[1]) / (b[1] - a[1]);
          xs.push(a[0] + t * (b[0] - a[0]));
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
        if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
      }
    }
  }
  function fillEllipse(c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      const q = 1 - dy * dy;
      if (q <= 0) continue;
      const dx = Math.sqrt(q) * rx;
      const xa = Math.round(cx - dx), xb = Math.round(cx + dx);
      if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
    }
  }
  function fillCircle(c, cx, cy, r, col) { fillEllipse(c, cx, cy, r, r, col); }

  function ringEllipse(c, cx, cy, rx, ry, col, thick) {
    thick = thick || 1;
    c.fillStyle = col;
    const steps = Math.max(12, Math.round((rx + ry) * 2.2));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU;
      for (let t = 0; t < thick; t++) {
        const rr = 1 - t * 0.06;
        const x = Math.round(cx + Math.cos(a) * rx * rr);
        const y = Math.round(cy + Math.sin(a) * ry * rr);
        c.fillRect(x, y, 1, 1);
      }
    }
  }

  function plotLine(c, x0, y0, x1, y1, col, thick) {
    thick = thick || 1;
    c.fillStyle = col;
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(1, Math.round(Math.hypot(dx, dy)));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (dx * i) / steps);
      const y = Math.round(y0 + (dy * i) / steps);
      if (thick <= 1) c.fillRect(x, y, 1, 1);
      else c.fillRect(x, y, thick, thick);
    }
  }

  function ditherRect(c, x, y, w, h, col, parity, step) {
    step = step || 2; parity = parity || 0;
    c.fillStyle = col;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x + (((yy + parity) % step) === 0 ? 0 : 1); xx < x + w; xx += step) {
        c.fillRect(xx, yy, 1, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Code-drawn 5x7 bitmap font (drawn at full display resolution)
  // ---------------------------------------------------------------------------
  const RAW = {
    " ": "00000,00000,00000,00000,00000,00000,00000",
    "A": "01110,10001,10001,11111,10001,10001,10001",
    "B": "11110,10001,10001,11110,10001,10001,11110",
    "C": "01110,10001,10000,10000,10000,10001,01110",
    "D": "11100,10010,10001,10001,10001,10010,11100",
    "E": "11111,10000,10000,11110,10000,10000,11111",
    "F": "11111,10000,10000,11110,10000,10000,10000",
    "G": "01110,10001,10000,10111,10001,10001,01111",
    "H": "10001,10001,10001,11111,10001,10001,10001",
    "I": "11111,00100,00100,00100,00100,00100,11111",
    "J": "00111,00010,00010,00010,00010,10010,01100",
    "K": "10001,10010,10100,11000,10100,10010,10001",
    "L": "10000,10000,10000,10000,10000,10000,11111",
    "M": "10001,11011,10101,10101,10001,10001,10001",
    "N": "10001,11001,10101,10011,10001,10001,10001",
    "O": "01110,10001,10001,10001,10001,10001,01110",
    "P": "11110,10001,10001,11110,10000,10000,10000",
    "Q": "01110,10001,10001,10001,10101,10010,01101",
    "R": "11110,10001,10001,11110,10100,10010,10001",
    "S": "01111,10000,10000,01110,00001,00001,11110",
    "T": "11111,00100,00100,00100,00100,00100,00100",
    "U": "10001,10001,10001,10001,10001,10001,01110",
    "V": "10001,10001,10001,10001,10001,01010,00100",
    "W": "10001,10001,10001,10101,10101,11011,10001",
    "X": "10001,10001,01010,00100,01010,10001,10001",
    "Y": "10001,10001,01010,00100,00100,00100,00100",
    "Z": "11111,00001,00010,00100,01000,10000,11111",
    "0": "01110,10001,10011,10101,11001,10001,01110",
    "1": "00100,01100,00100,00100,00100,00100,01110",
    "2": "01110,10001,00001,00110,01000,10000,11111",
    "3": "11110,00001,00001,01110,00001,00001,11110",
    "4": "00010,00110,01010,10010,11111,00010,00010",
    "5": "11111,10000,11110,00001,00001,10001,01110",
    "6": "00110,01000,10000,11110,10001,10001,01110",
    "7": "11111,00001,00010,00100,01000,01000,01000",
    "8": "01110,10001,10001,01110,10001,10001,01110",
    "9": "01110,10001,10001,01111,00001,00010,01100",
    "%": "11001,11010,00010,00100,01000,01011,10011",
    ".": "00000,00000,00000,00000,00000,00110,00110",
    ",": "00000,00000,00000,00000,00110,00110,01000",
    ":": "00000,00110,00110,00000,00110,00110,00000",
    "!": "00100,00100,00100,00100,00100,00000,00100",
    "?": "01110,10001,00001,00110,00100,00000,00100",
    "-": "00000,00000,00000,11111,00000,00000,00000",
    "/": "00001,00010,00010,00100,01000,01000,10000",
    "(": "00010,00100,01000,01000,01000,00100,00010",
    ")": "01000,00100,00010,00010,00010,00100,01000",
    "'": "00100,00100,00000,00000,00000,00000,00000",
    '"': "01010,01010,00000,00000,00000,00000,00000",
    "+": "00000,00100,00100,11111,00100,00100,00000",
    "<": "00010,00100,01000,10000,01000,00100,00010",
    ">": "01000,00100,00010,00001,00010,00100,01000",
    "=": "00000,00000,11111,00000,11111,00000,00000",
    "*": "00000,10101,01110,11111,01110,10101,00000",
    "x": "00000,10001,01010,00100,01010,10001,00000",
    "#": "01010,11111,01010,01010,01010,11111,01010",
    "$": "00100,01111,10100,01110,00101,11110,00100"
  };
  const GLYPH = {};
  for (const k in RAW) GLYPH[k] = RAW[k].split(",");

  function drawText(c, text, x, y, col, scale, track) {
    scale = scale || 2; track = track == null ? 1 : track;
    c.fillStyle = col;
    let cx = x;
    text = String(text).toUpperCase();
    for (let i = 0; i < text.length; i++) {
      const gl = GLYPH[text[i]];
      if (gl) {
        for (let ry = 0; ry < 7; ry++) {
          const row = gl[ry];
          for (let rx = 0; rx < 5; rx++) {
            if (row[rx] === "1") c.fillRect(cx + rx * scale, y + ry * scale, scale, scale);
          }
        }
      }
      cx += (5 + track) * scale;
    }
  }
  function textW(text, scale, track) {
    scale = scale || 2; track = track == null ? 1 : track;
    return String(text).length * (5 + track) * scale - track * scale;
  }
  function drawTextShadow(c, text, x, y, col, scale, track) {
    drawText(c, text, x + 2, y + 2, "rgba(0,0,0,0.65)", scale, track);
    drawText(c, text, x, y, col, scale, track);
  }
  function drawTextCentered(c, text, cx, y, col, scale, track) {
    drawText(c, text, Math.round(cx - textW(text, scale, track) / 2), y, col, scale, track);
  }

  // ---------------------------------------------------------------------------
  // Palette + tier data
  // ---------------------------------------------------------------------------
  const TIER = {
    Common:    { col: "#cdd8dc", border: "#8ea0a8", deco: "none" },
    Uncommon:  { col: "#7fd06a", border: "#4fa03e", deco: "leaves" },
    Rare:      { col: "#5fb8f0", border: "#2f80c0", deco: "sparkle" },
    Epic:      { col: "#c07bf0", border: "#8040b8", deco: "glow" },
    Legendary: { col: "#f6c453", border: "#c98a20", deco: "rays" },
    Ancient:   { col: "#4ff0d8", border: "#1f9c8a", deco: "runes" }
  };

  const FISH = {
    Common: [
      { name: "Copperfin Minnow", shape: "minnow", colA: "#8a5a2a", colB: "#c98a45", colC: "#f0d2a0", fin: "#e0a45a", eye: "#241a12", pat: "stripe" },
      { name: "Puddle Sprat", shape: "sprat", colA: "#4a7a68", colB: "#8fbfa0", colC: "#e6f2d8", fin: "#a8d0b0", eye: "#1a2420", pat: "spots" }
    ],
    Uncommon: [
      { name: "Meadow Perch", shape: "perch", colA: "#3f6a2f", colB: "#8fb84a", colC: "#e2e8a8", fin: "#d0703a", eye: "#20301a", pat: "bars" },
      { name: "Reedling", shape: "reedling", colA: "#52703a", colB: "#9aae5a", colC: "#dfe6b0", fin: "#b85a4a", eye: "#20281a", pat: "none" }
    ],
    Rare: [
      { name: "Amberscale Bass", shape: "bass", colA: "#8a5a18", colB: "#e0a63c", colC: "#f6e0a8", fin: "#c8802a", eye: "#2a1e10", pat: "scales" },
      { name: "Glasspike", shape: "pike", colA: "#3a6a8a", colB: "#9fd0e0", colC: "#e8f6ff", fin: "#7fb8d8", eye: "#1a2a3a", pat: "none" }
    ],
    Epic: [
      { name: "Moonlit Sturgeon", shape: "sturgeon", colA: "#2a3a68", colB: "#5468a8", colC: "#b8c4e8", fin: "#7a8ac0", eye: "#d8e0ff", pat: "scutes" },
      { name: "Ember Koi", shape: "koi", colA: "#a82818", colB: "#e86030", colC: "#f6d8b0", fin: "#f6a050", eye: "#301810", pat: "koi" }
    ],
    Legendary: [
      { name: "Thunderwalleye", shape: "walleye", colA: "#4a2a6a", colB: "#9a6ad0", colC: "#e0d0f6", fin: "#f6c453", eye: "#f6f070", pat: "bolt" },
      { name: "Aurelian Ray", shape: "ray", colA: "#a07820", colB: "#e8c050", colC: "#f8ecb8", fin: "#d8a838", eye: "#3a2a10", pat: "spots" }
    ],
    Ancient: [
      { name: "Tidebound Colossus", shape: "colossus", colA: "#144a4a", colB: "#2f8a80", colC: "#a8e8dc", fin: "#1f9c8a", eye: "#a8fff0", pat: "runes" }
    ]
  };
  function pickFish(rar) {
    const arr = FISH[rar] || FISH.Common;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------------------------------------------------------------------------
  // Fish artwork (drawn into fishBuf)
  // ---------------------------------------------------------------------------
  function drawFish(def, t) {
    const c = fishBuf.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, 80, 52);
    c.imageSmoothingEnabled = false;
    const cx = 40, cy = 26;
    const wag = Math.sin(t * 4) * 1.4;
    const flap = Math.sin(t * 6) * 1.2;
    const A = def.colA, B = def.colB, C = def.colC, F = def.fin;

    if (def.shape === "ray") { drawRay(c, cx, cy, t, A, B, C, F, wag, def.eye); return; }
    if (def.shape === "koi") { drawKoi(c, cx, cy, t, A, B, C, F); return; }

    let rx = 15, ry = 7.5, tail = "fork";
    if (def.shape === "minnow") { rx = 16; ry = 5.5; }
    else if (def.shape === "sprat") { rx = 12; ry = 8; }
    else if (def.shape === "perch") { rx = 14; ry = 8.5; }
    else if (def.shape === "reedling") { rx = 19; ry = 4; }
    else if (def.shape === "bass") { rx = 13; ry = 9.5; }
    else if (def.shape === "pike") { rx = 19; ry = 5; tail = "point"; }
    else if (def.shape === "sturgeon") { rx = 19; ry = 6; tail = "shark"; }
    else if (def.shape === "walleye") { rx = 15; ry = 7; }
    else if (def.shape === "colossus") { rx = 17; ry = 10.5; }

    const left = cx - rx, right = cx + rx;
    const ty = cy + wag;

    // glow rim for special fish (1px outline)
    let glow = null;
    if (def.shape === "colossus") glow = "#5ff5dc";
    else if (def.shape === "walleye") glow = "#c9a0ff";

    // ---- tail ----
    if (tail === "shark") {
      fillPoly(c, [[left + 2, cy - 3], [left - 9, cy - ry - 4], [left - 13, cy - 2], [left - 5, cy], [left - 12, cy + ry + 3], [left - 1, cy + 3]], F);
      fillPoly(c, [[left + 2, cy - 2], [left - 7, cy - ry - 1], [left - 8, cy - 1], [left - 4, cy + 1], [left - 7, cy + ry], [left, cy + 2]], B);
    } else if (tail === "point") {
      fillPoly(c, [[left + 3, cy - ry * 0.5], [left - 11, ty], [left + 3, cy + ry * 0.5]], F);
      fillPoly(c, [[left + 3, cy - 2], [left - 7, ty], [left + 3, cy + 2]], B);
    } else {
      fillPoly(c, [[left + 3, cy - ry * 0.6], [left - 10, ty - ry * 1.2], [left - 4, ty], [left - 10, ty + ry * 1.2], [left + 3, cy + ry * 0.6]], F);
      fillPoly(c, [[left + 3, cy - 2], [left - 6, ty - 3], [left - 3, ty], [left - 6, ty + 3], [left + 3, cy + 2]], B);
    }

    // ---- dorsal ----
    if (def.shape === "perch" || def.shape === "walleye") {
      const n = def.shape === "perch" ? 6 : 5;
      const x0 = left + 3, x1 = cx + 4, pts = [];
      for (let i = 0; i <= n; i++) {
        const px = x0 + (i / n) * (x1 - x0);
        pts.push([px, cy - ry + 1]);
        if (i < n) pts.push([px + (0.5 / n) * (x1 - x0), cy - ry - 3]);
      }
      pts.push([x1, cy - ry + 1]);
      fillPoly(c, pts, F);
    } else if (def.shape === "colossus") {
      for (let i = 0; i < 3; i++) {
        const px = left + 5 + i * 8;
        fillPoly(c, [[px, cy - ry + 1], [px + 3, cy - ry - 3], [px + 6, cy - ry + 1]], F);
      }
    } else if (def.shape === "pike") {
      fillPoly(c, [[left + 9, cy - ry + 1], [left + 12, cy - ry - 4], [left + 15, cy - ry + 1]], F);
      fillPoly(c, [[left + 9, cy + ry - 1], [left + 12, cy + ry + 4], [left + 15, cy + ry - 1]], F);
    } else {
      const dh = def.shape === "bass" ? 5 : 4;
      fillPoly(c, [[cx - 5, cy - ry + 1], [cx, cy - ry - dh], [cx + 5, cy - ry + 1]], F);
    }

    // ---- body ----
    if (glow) fillEllipse(c, cx, cy, rx + 1, ry + 1, glow);
    fillEllipse(c, cx, cy, rx, ry, B);
    fillEllipse(c, cx, cy - ry * 0.35, rx * 0.88, ry * 0.52, A);
    fillEllipse(c, cx - 1, cy + ry * 0.45, rx * 0.78, ry * 0.42, C);
    // pectoral fin
    fillPoly(c, [[cx - 1, cy + ry - 3], [cx + 3, cy + ry + 3 + flap], [cx + 5, cy + ry - 2]], F);

    // ---- snout ----
    if (def.shape === "bass") {
      fillCircle(c, right - 1, cy + 1, 4, B);
      fillCircle(c, right - 1, cy + 2, 3, C);
      plotLine(c, right - 4, cy + 3, right + 1, cy + 2, A, 1);
    } else if (def.shape === "pike" || def.shape === "sturgeon") {
      fillPoly(c, [[right - 5, cy - ry * 0.6], [right + 4, cy - 1], [right + 4, cy + 1], [right - 5, cy + ry * 0.6]], B);
      if (def.shape === "sturgeon") {
        plotLine(c, right + 3, cy + 1, right + 9, cy + 5, C, 1);
        plotLine(c, right + 3, cy + 1, right + 10, cy + 3, C, 1);
      }
    } else if (def.shape === "colossus") {
      fillPoly(c, [[right - 8, cy - ry * 0.7], [right + 5, cy - ry * 0.5], [right + 5, cy + ry * 0.6], [right - 8, cy + ry * 0.7]], B);
      fillPoly(c, [[right - 2, cy - 3], [right + 5, cy - 2], [right + 5, cy + 3], [right - 2, cy + 4]], C);
    }

    // ---- patterns ----
    if (def.pat === "stripe") {
      for (let i = 0; i < 4; i++) plotLine(c, cx - 7 + i * 5, cy - ry + 1, cx - 7 + i * 5, cy + ry - 1, A, 1);
    } else if (def.pat === "bars") {
      for (let i = 0; i < 5; i++) plotLine(c, cx - 9 + i * 5, cy - ry + 1, cx - 9 + i * 5, cy + ry - 1, A, 2);
    } else if (def.pat === "spots") {
      for (let i = 0; i < 6; i++) fillCircle(c, cx - 8 + i * 4, cy - 3 + ((i * 5) % 6), 1, A);
    } else if (def.pat === "scales") {
      for (let row = -1; row <= 1; row++) {
        for (let i = 0; i < 5; i++) {
          fillCircle(c, cx - 9 + i * 5 + (row !== 0 ? 2 : 0), cy + row * 3, 1, C);
        }
      }
    } else if (def.pat === "bolt") {
      for (let i = 0; i < 3; i++) {
        const bx = cx - 8 + i * 7;
        plotLine(c, bx, cy - ry + 1, bx + 2, cy, F, 1);
        plotLine(c, bx + 2, cy, bx - 1, cy + 3, F, 1);
      }
    } else if (def.pat === "scutes") {
      for (let i = 0; i < 5; i++) fillCircle(c, cx - 12 + i * 6, cy - ry + 1, 1, C);
    } else if (def.pat === "runes") {
      for (let i = 0; i < 3; i++) {
        const bx = cx - 11 + i * 11;
        const on = 0.5 + 0.5 * Math.sin(t * 3 + i);
        if (on > 0.35) { fr(c, bx - 1, cy - 1, 3, 1, "#bffff2"); fr(c, bx, cy - 3, 1, 5, "#bffff2"); }
      }
    }

    // ---- eye ----
    const ex = right - 4, ey = cy - ry * 0.2;
    fillCircle(c, ex, ey, 2.4, "#f4f8ff");
    fillCircle(c, ex + 0.5, ey, 1.2, def.eye);
    plotLine(c, right - 3, cy + ry * 0.55, right, cy + ry * 0.3, A, 1);
  }

  function drawKoi(c, cx, cy, t, A, B, C, F) {
    const f = Math.sin(t * 5) * 2;
    const f2 = Math.sin(t * 5 + 0.7) * 2;
    // flowing tail
    fillPoly(c, [[cx - 8, cy - 4], [cx - 24, cy - 10 + f], [cx - 14, cy], [cx - 25, cy + 10 + f2], [cx - 8, cy + 4]], F);
    fillPoly(c, [[cx - 8, cy - 3], [cx - 19, cy - 6 + f], [cx - 13, cy], [cx - 20, cy + 6 + f2], [cx - 8, cy + 3]], B);
    // dorsal
    fillPoly(c, [[cx - 4, cy - 9], [cx + 2, cy - 16], [cx + 8, cy - 9]], F);
    // body
    fillEllipse(c, cx, cy, 15, 9, A);
    fillEllipse(c, cx, cy - 3, 13, 6, B);
    fillEllipse(c, cx - 1, cy + 4, 12, 4, C);
    // patches
    fillPoly(c, [[cx - 4, cy - 9], [cx + 3, cy - 9], [cx + 5, cy - 2], [cx - 2, cy - 1]], C);
    fillPoly(c, [[cx - 11, cy + 1], [cx - 6, cy - 1], [cx - 4, cy + 4]], C);
    // long pectoral fins
    fillPoly(c, [[cx - 2, cy + 7], [cx - 12, cy + 18 + Math.sin(t * 4) * 2], [cx + 3, cy + 9]], F);
    fillPoly(c, [[cx + 5, cy + 7], [cx + 13, cy + 16 - Math.sin(t * 4) * 2], [cx + 8, cy + 8]], F);
    // head + eyes + whiskers
    fillCircle(c, cx + 13, cy, 5, C);
    fillCircle(c, cx + 15, cy - 1, 2.2, "#f4f8ff");
    fillCircle(c, cx + 15.5, cy - 1, 1.1, "#301810");
    plotLine(c, cx + 17, cy + 2, cx + 21, cy + 5, "#f0e0c0", 1);
    plotLine(c, cx + 17, cy + 2, cx + 22, cy + 3, "#f0e0c0", 1);
  }

  function drawRay(c, cx, cy, t, A, B, C, F, wag, eye) {
    const nose = cx + 22, base = cx - 12;
    const yy = cy + wag * 0.4;
    fillPoly(c, [[nose, yy], [cx - 2, cy - 15], [base, cy], [cx - 2, cy + 15]], A);
    fillPoly(c, [[nose - 4, yy], [cx - 1, cy - 10], [base + 3, cy], [cx - 1, cy + 10]], B);
    fillPoly(c, [[nose - 9, yy], [cx + 1, cy - 5], [base + 7, cy], [cx + 1, cy + 5]], C);
    plotLine(c, base, cy, base - 20, yy + wag * 1.6, A, 2);
    plotLine(c, base, cy, base - 16, yy + wag * 1.2, B, 1);
    for (let i = 0; i < 5; i++) fillCircle(c, cx - 4 + i * 5, cy - 5 + ((i * 7) % 10), 1, A);
    fillCircle(c, nose - 7, cy - 3, 2.2, "#f4f8ff");
    fillCircle(c, nose - 7, cy - 3, 1.1, eye);
    fillCircle(c, nose - 7, cy + 3, 2.2, "#f4f8ff");
    fillCircle(c, nose - 7, cy + 3, 1.1, eye);
  }

  // ---------------------------------------------------------------------------
  // Particles / ripples
  // ---------------------------------------------------------------------------
  const drops = [];
  const ripples = [];
  function spawnSplash(x, y, n, power) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = (0.5 + Math.random()) * power;
      drops.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, max: 0.9, col: Math.random() < 0.5 ? "#eafcff" : "#9fd8e0" });
    }
  }
  function spawnRipple(x, y, maxR, col) {
    ripples.push({ x: x, y: y, r: 1, maxR: maxR, life: 0, dur: 0.9, col: col || "rgba(220,250,255,0.7)" });
  }
  function updateParticles(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.x += d.vx; d.y += d.vy; d.vy += 0.09; d.vx *= 0.99;
      d.life -= dt;
      if (d.life <= 0 || d.y > 176) drops.splice(i, 1);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.life += dt;
      r.r = lerp(1, r.maxR, r.life / r.dur);
      if (r.life >= r.dur) ripples.splice(i, 1);
    }
  }
  function drawParticles(c) {
    for (const r of ripples) {
      const a = 1 - r.life / r.dur;
      c.globalAlpha = clamp(a, 0, 1);
      ringEllipse(c, r.x, r.y, r.r, r.r * 0.42, r.col, 1);
      c.globalAlpha = 1;
    }
    for (const d of drops) {
      const a = clamp(d.life / d.max, 0, 1);
      c.globalAlpha = a;
      fr(c, Math.round(d.x), Math.round(d.y), 1, 1, d.col);
      c.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // SCENE
  // ---------------------------------------------------------------------------
  const SKY = [
    [0, 7, "#2b2850"], [7, 15, "#443a68"], [15, 23, "#6a4a78"],
    [23, 31, "#9c5d75"], [31, 39, "#cf7a63"], [39, 47, "#eb9b56"],
    [47, 54, "#f6c06a"], [54, 58, "#fbd98a"]
  ];
  const WATER = [
    [58, 68, "#2b5a78"], [68, 80, "#2f6a86"], [80, 94, "#327a92"],
    [94, 108, "#2f8496"], [108, 124, "#2c8f9a"], [124, 142, "#27999c"],
    [142, 162, "#22a3a0"], [162, 180, "#1fa9a3"]
  ];

  let CLOUDS = [];
  function initClouds() {
    CLOUDS = [];
    for (let i = 0; i < 5; i++) {
      CLOUDS.push({ x: Math.random() * W, y: 6 + Math.random() * 34, sc: 0.5 + Math.random() * 0.9, sp: 0.8 + Math.random() * 1.4 });
    }
  }
  initClouds();

  function drawCloud(c, x, y, sc, t) {
    const col = "#f6d8b0", col2 = "#fbe9cf", sh = "#d8a890";
    const puffs = [[-14, 0, 8], [0, -3, 10], [14, 0, 8], [-6, 2, 7], [7, 2, 7]];
    for (const p of puffs) fillEllipse(c, x + p[0] * sc, y + p[1] * sc, p[2] * sc, p[2] * 0.62 * sc, sh);
    for (const p of puffs) fillEllipse(c, x + p[0] * sc, y + p[1] * sc - 1.5 * sc, p[2] * sc, p[2] * 0.55 * sc, col);
    for (const p of puffs) fillEllipse(c, x + p[0] * sc, y + p[1] * sc - 2.6 * sc, p[2] * 0.6 * sc, p[2] * 0.34 * sc, col2);
  }

  function drawSky(t) {
    for (const b of SKY) fr(s, 0, b[0], W, b[1] - b[0], b[2]);
    // sun
    const sx = 250, sy = 44 + Math.sin(t * 0.3) * 0.6;
    fillCircle(s, sx, sy, 12, "rgba(255,220,140,0.16)");
    fillCircle(s, sx, sy, 9, "rgba(255,210,120,0.28)");
    fillCircle(s, sx, sy, 7, "#ffe9a8");
    fillCircle(s, sx - 1.5, sy - 1.5, 4.5, "#fff6d8");
    // clouds drift
    for (const cl of CLOUDS) {
      cl.x += cl.sp * 0.008;
      if (cl.x - 30 * cl.sc > W) cl.x = -30 * cl.sc;
      drawCloud(s, cl.x, cl.y, cl.sc, t);
    }
    // distant islands
    fillPoly(s, [[-4, 58], [10, 46], [20, 52], [30, 44], [40, 56], [52, 50], [60, 58]], "#5a4a6b");
    fillPoly(s, [[6, 58], [14, 52], [24, 55], [34, 50], [46, 58]], "#4a3d5e");
    fillPoly(s, [[262, 58], [272, 50], [284, 54], [296, 47], [306, 55], [318, 49], [324, 58]], "#5a4a6b");
    fillPoly(s, [[276, 58], [284, 53], [296, 56], [308, 51], [318, 58]], "#4a3d5e");
  }

  function drawWater(t) {
    for (const b of WATER) fr(s, 0, b[0], W, b[1] - b[0], b[2]);
    // gentle depth dithering bands
    for (let y = 60; y < 176; y += 2) {
      const p = (y * 7) % 3;
      if (p === 0) ditherRect(s, 0, y, W, 1, "rgba(255,255,255,0.03)", y % 4, 3);
    }
    // horizon line glow
    fr(s, 0, 57, W, 1, "#bfe6d8");
    // sun reflection column
    for (let y = 60; y < 130; y += 3) {
      const w = 3 + Math.sin(y * 0.4 + t * 2) * 1.6;
      const a = 0.30 * (1 - (y - 60) / 90);
      s.globalAlpha = a;
      fr(s, 250 - w + Math.sin(y * 0.8 + t * 3) * 2, y, w * 2, 2, "#ffe0a0");
      s.globalAlpha = 1;
    }
    // wave streaks
    for (let y = 62; y < 178; y += 4) {
      const off = hash2(0, y) * 40;
      const speed = (y * 0.05 + 0.05);
      for (let k = 0; k < 5; k++) {
        const bx = ((off + k * 70 + t * 8 * speed) % (W + 40)) - 20;
        const len = 6 + ((y * 13 + k * 7) % 12);
        const light = (y + k) % 2 === 0;
        if (light) {
          s.globalAlpha = 0.18;
          fr(s, Math.round(bx), y, len, 1, "#bfeef0");
          s.globalAlpha = 1;
        } else {
          s.globalAlpha = 0.12;
          fr(s, Math.round(bx + 20), y, len - 2, 1, "#0c3a4a");
          s.globalAlpha = 1;
        }
      }
    }
    // sparkles
    for (let gy = 62; gy < 176; gy += 6) {
      for (let gx = 4; gx < W; gx += 9) {
        const h = hash2(gx, gy);
        const ph = (t * (0.25 + h * 0.4) + h * 10) % 1;
        if (ph < 0.10) {
          const a = Math.sin((ph / 0.10) * Math.PI);
          s.globalAlpha = a * 0.7;
          const yy = gy + ((gx * 3) % 5);
          fr(s, gx, yy, 2, 1, "#eafff6");
          fr(s, gx + 1, yy - 1, 1, 1, "#eafff6");
          s.globalAlpha = 1;
        }
      }
    }
  }

  function drawIsland() {
    const land = [
      [-4, 90], [24, 88], [50, 94], [66, 104], [82, 120],
      [96, 142], [106, 164], [112, 184], [-4, 184]
    ];
    // underwater shadow halo
    fillPoly(s, [[0, 92], [30, 92], [58, 100], [76, 118], [92, 142], [104, 168], [110, 184], [0, 184]], "#0f6d72");
    // cliff base
    fillPoly(s, land, "#6b5138");
    // grass top body
    fillPoly(s, [[-4, 90], [24, 88], [50, 94], [66, 104], [82, 120], [92, 138], [86, 150], [60, 150], [20, 150], [-4, 150]], "#3f7a34");
    fillPoly(s, [[-4, 90], [24, 88], [50, 94], [66, 104], [80, 118], [72, 128], [40, 128], [-4, 122]], "#4f8b3b");
    // grass lighter top strip
    fillPoly(s, [[-4, 90], [24, 88], [50, 94], [64, 102], [40, 104], [-4, 98]], "#63a343");
    // rock face along the shoreline
    const shore = [[50, 94], [66, 104], [82, 120], [96, 142], [106, 164], [112, 184]];
    for (let i = 0; i < shore.length - 1; i++) {
      plotLine(s, shore[i][0], shore[i][1], shore[i + 1][0], shore[i + 1][1], "#8a6a48", 2);
    }
    // sandy strip near the water edge
    fillPoly(s, [[72, 116], [86, 128], [98, 146], [104, 158], [96, 160], [84, 140], [70, 124]], "#cbb178");
    fillPoly(s, [[76, 122], [86, 134], [94, 148], [90, 150], [80, 136], [72, 126]], "#ddc890");
  }

  function drawGrassBits(t) {
    // grass blades + flowers along the top edge
    for (let i = 0; i < 46; i++) {
      const h = hash2(i * 3.1, 7.7);
      let x, y;
      if (i < 26) { x = -2 + i * 2.4; y = 90 + Math.sin(i) * 4 - h * 4; }
      else { x = 4 + ((i - 26) / 20) * 78; y = 92 + ((i - 26) / 20) * 46 - h * 3; }
      const sw = Math.sin(t * 1.5 + i) * 0.7;
      plotLine(s, Math.round(x), Math.round(y), Math.round(x + sw), Math.round(y - 3 - h * 2), "#6fb04a", 1);
    }
    // flowers
    const flowerCols = ["#f2d24a", "#f28a6a", "#e8e0f0", "#f0a0c0"];
    for (let i = 0; i < 9; i++) {
      const x = 6 + i * 8 + (hash2(i, 2) - 0.5) * 4;
      const y = 96 + i * 3 + hash2(i, 5) * 6;
      const col = flowerCols[i % flowerCols.length];
      const sw = Math.round(Math.sin(t * 1.4 + i) * 0.6);
      fr(s, x + sw, y, 1, 1, col);
      fr(s, x - 1, y, 1, 1, col);
      fr(s, x, y - 1, 1, 1, "#fff0c0");
    }
    // bushes
    drawBush(s, 10, 104, 12, t);
    drawBush(s, 34, 112, 10, t + 1);
    drawBush(s, 58, 128, 9, t + 2);
    // small tree at far left
    drawTree(s, -2, 96, t);
  }

  function drawBush(c, x, y, r, t) {
    const sway = Math.sin(t * 1.1 + x) * 0.4;
    fillEllipse(c, x, y + 2, r, r * 0.55, "#2c5a26");
    fillEllipse(c, x - 2, y, r * 0.8, r * 0.6, "#3f7a34");
    fillEllipse(c, x + 2 + sway, y - 1, r * 0.7, r * 0.55, "#55993f");
    fillCircle(c, x - 2 + sway, y - 2, 2, "#6fb04a");
  }
  function drawTree(c, x, y, t) {
    fillPoly(c, [[x - 6, y + 60], [x + 6, y + 60], [x + 4, y], [x - 4, y]], "#5a3f26");
    fillPoly(c, [[x - 4, y + 58], [x + 2, y + 58], [x + 1, y], [x - 3, y]], "#6f4f30");
    const sway = Math.sin(t * 0.9) * 1.2;
    fillEllipse(c, x + sway, y - 6, 16, 12, "#2c5a26");
    fillEllipse(c, x - 8 + sway, y - 2, 10, 8, "#3f7a34");
    fillEllipse(c, x + 8 + sway, y - 4, 10, 8, "#3f7a34");
    fillEllipse(c, x - 2 + sway, y - 10, 10, 8, "#55993f");
    fillCircle(c, x - 6 + sway, y - 8, 3, "#6fb04a");
    fillCircle(c, x + 4 + sway, y - 11, 2, "#6fb04a");
  }

  function drawWaterDetails(t) {
    // cruising fish shadows
    for (let i = 0; i < 2; i++) {
      const period = 20 + i * 8, off = i * 11;
      const u = ((t + off) % period) / period;
      const dir = i % 2 === 0 ? 1 : -1;
      const sx = dir > 0 ? lerp(20, 305, u) : lerp(305, 20, u);
      const sy = 136 + i * 20 + Math.sin(t * 0.7 + i) * 3;
      s.globalAlpha = 0.16;
      fillEllipse(s, sx, sy, 9, 3, "#06303c");
      fillPoly(s, [[sx + 8 * dir, sy], [sx + 15 * dir, sy - 3], [sx + 15 * dir, sy + 3]], "#06303c");
      s.globalAlpha = 1;
    }
    // lily pads
    drawLilyPad(172, 148, 7, t, 0);
    drawLilyPad(192, 160, 6, t, 1);
    drawLilyPad(206, 170, 5, t, 2);
    drawLilyPad(162, 168, 4, t, 3);
    // floating log
    drawDriftwood(232, 160, t);
    // cattails / reeds at the water's edge
    drawReed(102, 166, t, 0);
    drawReed(108, 172, t, 1);
    drawReed(97, 174, t, 2);
    drawReed(113, 166, t, 3);
  }

  function drawLilyPad(x, y, r, t, seed) {
    const bob = Math.round(Math.sin(t * 1.4 + seed * 1.7) * 0.6);
    s.globalAlpha = 0.35;
    fillEllipse(s, x, y + bob + 1, r, r * 0.5, "#0c3a4a");
    s.globalAlpha = 1;
    fillEllipse(s, x, y + bob, r, r * 0.55, "#2f6a2c");
    fillEllipse(s, x - r * 0.2, y - 1 + bob, r * 0.82, r * 0.42, "#4f8b3b");
    fillEllipse(s, x - r * 0.3, y - 1.5 + bob, r * 0.5, r * 0.25, "#6fb04a");
    if (seed % 2 === 0) {
      fillCircle(s, x + r * 0.35, y - 2 + bob, 1.5, "#e88ab0");
      fr(s, x + Math.round(r * 0.35), y - 1 + bob, 1, 1, "#fff0c0");
    }
  }

  function drawDriftwood(x, y, t) {
    const bob = Math.round(Math.sin(t * 0.9) * 0.7);
    s.globalAlpha = 0.3;
    fillEllipse(s, x, y + 4 + bob, 22, 4, "#0c3a4a");
    s.globalAlpha = 1;
    fillEllipse(s, x, y + bob, 22, 5, "#5a4028");
    fillEllipse(s, x, y - 1 + bob, 22, 4, "#7a5a34");
    fillEllipse(s, x, y - 2 + bob, 20, 2.5, "#8f6a3e");
    // end ring
    fillEllipse(s, x - 20, y + bob, 3, 5, "#8f6a3e");
    fillEllipse(s, x - 20, y + bob, 1.5, 3, "#5a4028");
    // moss
    for (let i = 0; i < 5; i++) fr(s, Math.round(x - 14 + i * 7), Math.round(y - 3 + bob + (i % 2)), 3, 1, "#3f7a34");
  }

  function drawReed(x, y, t, seed) {
    const sway = Math.sin(t * 1.2 + seed) * 1.2;
    plotLine(s, x, y, x + sway, y - 16, "#4f8b3b", 1);
    plotLine(s, x, y, x + sway * 0.6, y - 11, "#63a343", 1);
    // cattail head
    fr(s, Math.round(x + sway) - 1, Math.round(y - 17), 3, 6, "#6b4a2e");
    fr(s, Math.round(x + sway) - 1, Math.round(y - 17), 2, 2, "#8a6a43");
  }

  function drawDock(t) {
    // posts
    const posts = [62, 96, 128, 152];
    for (const px of posts) {
      fr(s, px, 148, 4, 26, "#5a4028");
      fr(s, px, 148, 2, 26, "#6f4f30");
      fr(s, px, 148, 1, 26, "#835c36");
    }
    // post reflections
    for (const px of posts) {
      s.globalAlpha = 0.22;
      fr(s, px, 168, 4, 10, "#0c3a4a");
      s.globalAlpha = 1;
    }
    // dock surface
    const topY = 143, botY = 150;
    fillPoly(s, [[54, topY], [158, topY + 1], [158, botY + 1], [54, botY]], "#8a6a43");
    // planks
    for (let x = 54; x < 158; x += 8) {
      fr(s, x, topY, 1, botY - topY + 1, "#5f4729");
      fr(s, x + 1, topY, 1, 1, "#a5834f");
    }
    // top highlight and front shadow
    fr(s, 54, topY, 104, 1, "#b08a52");
    fr(s, 54, botY, 104, 1, "#5a3f26");
    fr(s, 54, botY + 1, 104, 1, "#3f2c1a");
    // moss patches
    for (let i = 0; i < 12; i++) {
      const x = 58 + hash2(i, 3) * 96;
      const y = topY + 2 + hash2(i, 8) * 4;
      fr(s, Math.round(x), Math.round(y), 2 + (i % 2), 1, i % 3 === 0 ? "#5a8a3a" : "#3f6a2c");
    }
    // rope coil on the dock
    ringEllipse(s, 150, 147, 4, 2, "#c8a86a", 1);
    ringEllipse(s, 150, 147, 2, 1, "#a88850", 1);
    // bucket
    drawBucket(s, 66, 141);
  }
  function drawBucket(c, x, y) {
    fillPoly(c, [[x - 4, y], [x + 4, y], [x + 3, y + 8], [x - 3, y + 8]], "#5a6a72");
    fillPoly(c, [[x - 3, y + 1], [x + 3, y + 1], [x + 2, y + 7], [x - 2, y + 7]], "#7a8a92");
    fr(c, x - 4, y, 8, 1, "#9aa8b0");
    fr(c, x - 3, y, 1, 8, "#9aa8b0");
    // handle
    ringEllipse(c, x, y - 2, 4, 3, "#c8b070", 1);
    // water in bucket
    fr(c, x - 3, y + 1, 6, 2, "#4fb8c0");
    fr(c, x - 2, y + 2, 2, 1, "#a8e8ec");
  }

  // angler ------------------------------------------------------------------
  const ANGLER = { x: 112, baseY: 145.5 };
  function rodTipFor(angle) {
    const hx = ANGLER.x + 6, hy = ANGLER.baseY - 11;
    const len = 30 + stretch;
    return { x: hx + Math.cos(angle) * len, y: hy + Math.sin(angle) * len, hx: hx, hy: hy };
  }
  let stretch = 0;

  function drawAngler(t, rodAngle) {
    const x = ANGLER.x, by = ANGLER.baseY;
    const bob = Math.round(Math.sin(t * 2) * 0.6);
    // shadow on the dock
    s.globalAlpha = 0.30;
    fillEllipse(s, x + 1, by + 1, 8, 2.5, "#0c2a30");
    s.globalAlpha = 1;

    const legCol = "#3f4f7a", bootCol = "#4a3320", coat = "#c05a34", coatD = "#94411f",
      trim = "#f0e0c0", skin = "#e8b48a", skinD = "#c88a60", hat = "#6f4f30", hatD = "#4f3720";

    // legs + boots
    fr(s, x - 5, by - 6, 4, 4, legCol);
    fr(s, x + 1, by - 6, 4, 4, legCol);
    fr(s, x - 6, by - 2, 5, 2, bootCol);
    fr(s, x + 2, by - 2, 5, 2, bootCol);
    fr(s, x - 7, by - 2, 2, 2, bootCol);
    fr(s, x + 5, by - 2, 2, 2, bootCol);

    // coat
    fillPoly(s, [[x - 6, by - 6], [x + 6, by - 6], [x + 7, by - 13 + bob], [x - 7, by - 13 + bob]], coat);
    fillPoly(s, [[x + 2, by - 6], [x + 6, by - 6], [x + 7, by - 13 + bob], [x + 3, by - 13 + bob]], coatD);
    fr(s, x - 7, by - 8 + bob, 14, 2, coatD);
    // scarf
    fr(s, x - 6, by - 15 + bob, 12, 2, trim);
    fr(s, x + 3, by - 15 + bob, 3, 5, trim);

    // head
    fr(s, x - 4, by - 20 + bob, 8, 5, skin);
    fr(s, x + 1, by - 20 + bob, 3, 5, skinD);
    fr(s, x + 3, by - 18 + bob, 1, 1, "#3a2618"); // eye
    // hat
    fr(s, x - 6, by - 21 + bob, 13, 1, hat);      // brim
    fr(s, x - 4, by - 24 + bob, 9, 3, hat);       // crown
    fr(s, x - 4, by - 24 + bob, 9, 1, hatD);
    fr(s, x - 6, by - 21 + bob, 13, 1, hatD);

    // arms + rod
    const tip = rodTipFor(rodAngle);
    const hx = tip.hx, hy = tip.hy;
    plotLine(s, hx, hy, tip.x, tip.y, "#8a6a3a", 2);
    plotLine(s, hx + Math.cos(rodAngle) * 2, hy + Math.sin(rodAngle) * 2, tip.x, tip.y, "#b08a52", 1);
    fillCircle(s, hx - 2, hy + 2, 3, skin);
    fillCircle(s, hx + 2, hy + 1, 3, skin);
    plotLine(s, x + 3, by - 12 + bob, hx, hy, coat, 3);
    plotLine(s, x - 1, by - 11 + bob, hx - 1, hy + 2, coatD, 2);
  }

  // bobber + line -----------------------------------------------------------
  let bobber = { x: 150, y: 120, tx: 150, ty: 120, inWater: false };
  let lineSag = 3;
  let castSplashed = false;

  // Clear, unmistakable bite cue: a bobbing "!" bubble + warning ring.
  function drawBiteCue(t) {
    const bx = Math.round(bobber.x), by = Math.round(bobber.y);
    const appear = clamp(phase / 0.1, 0, 1);
    const bob = Math.round(Math.sin(t * 16) * 1.4);
    const w = 11, h = 11, x = bx - 5, y = by - 15 - h + bob;
    // warning ring pulse
    if (phase < 0.45) {
      const u = phase / 0.45;
      ringEllipse(s, bobber.x, by + 2, 5 + u * 26, 2.5 + u * 11, "rgba(255,130,95," + (1 - u) * 0.9 + ")", 1);
    }
    if (appear < 0.5) return;
    // tail
    fillPoly(s, [[bx - 2, y + h], [bx + 3, y + h], [bx, y + h + 5]], "#2a1c14");
    fillPoly(s, [[bx - 1, y + h], [bx + 2, y + h], [bx, y + h + 3]], "#fff2c4");
    // bubble
    fr(s, x - 1, y - 1, w + 2, h + 2, "#2a1c14");
    fr(s, x, y, w, h, "#fff2c4");
    fr(s, x, y, w, 1, "#ffffff");
    // exclamation
    drawText(s, "!", x + 3, y + 2, "#e8361e", 1, 0);
  }

  function drawLineAndBobber(t) {
    const tip = rodTipFor(currentRodAngle());
    if (bobber.inWater) {
      // line with slight sag
      const segs = 14;
      let px = tip.x, py = tip.y;
      for (let i = 1; i <= segs; i++) {
        const u = i / segs;
        const x = lerp(tip.x, bobber.x, u);
        const y = lerp(tip.y, bobber.y, u) + Math.sin(u * Math.PI) * lineSag;
        plotLine(s, px, py, x, y, "rgba(235,245,245,0.75)", 1);
        px = x; py = y;
      }
    } else {
      plotLine(s, tip.x, tip.y, bobber.x, bobber.y, "rgba(235,245,245,0.55)", 1);
    }
    // bobber body
    const bx = Math.round(bobber.x), bYy = Math.round(bobber.y);
    if (bobber.inWater) {
      // water ring
      ringEllipse(s, bx, bYy + 2, 5, 2, "rgba(220,250,255,0.5)", 1);
    }
    fr(s, bx - 2, bYy - 1, 5, 2, "#e8e8e8");   // white band
    fr(s, bx - 2, bYy - 4, 5, 3, "#d84030");   // red top
    fr(s, bx - 2, bYy - 3, 1, 2, "#f07060");   // highlight
    fr(s, bx - 2, bYy - 6, 1, 2, "#3a3a3a");   // antenna
    fr(s, bx + 1, bYy - 5, 1, 1, "#3a3a3a");
    fr(s, bx - 2, bYy + 1, 5, 1, "#b8c0c4");   // bottom
  }

  // ambient -----------------------------------------------------------------
  function drawBirds(t) {
    for (let i = 0; i < 3; i++) {
      const x = ((t * 8 + i * 90) % (W + 60)) - 30;
      const y = 20 + i * 9 + Math.sin(t * 0.8 + i) * 1.5;
      const f = Math.sin(t * 6 + i) * 1.2;
      plotLine(s, x - 3, y + f, x, y, "#3a3550", 1);
      plotLine(s, x, y, x + 3, y + f, "#3a3550", 1);
      plotLine(s, x, y, x, y + 1, "#3a3550", 1);
    }
  }
  function drawMotes(t) {
    for (let i = 0; i < 14; i++) {
      const h = hash2(i, 11);
      const x = 8 + h * 100 + Math.sin(t * (0.6 + h) + i) * 6;
      const y = 96 + hash2(i, 13) * 50 + Math.cos(t * 0.7 + i) * 4;
      const a = 0.35 + 0.35 * Math.sin(t * 2 + i);
      s.globalAlpha = a;
      fr(s, Math.round(x), Math.round(y), 1, 1, "#fff2b0");
      s.globalAlpha = 1;
    }
  }
  function drawDragonfly(t) {
    const x = 190 + Math.sin(t * 0.9) * 10;
    const y = 96 + Math.cos(t * 1.3) * 4;
    fr(s, Math.round(x), Math.round(y), 1, 3, "#2f6a5a");
    const w = Math.sin(t * 20) * 2;
    fr(s, Math.round(x - 3), Math.round(y + 1 - w), 3, 1, "rgba(200,230,240,0.7)");
    fr(s, Math.round(x + 1), Math.round(y + 1 - w), 3, 1, "rgba(200,230,240,0.7)");
  }

  // rod angle by state
  function currentRodAngle() {
    if (state === "waiting") {
      // cast swing
      const c = clamp(phase / CAST_DUR, 0, 1);
      const e = c < 0.35 ? c / 0.35 : 1;
      const swing = Math.sin(c * Math.PI) * 0.9;
      return -0.35 - swing * 0.5 - e * 0.15;
    }
    if (state === "bite") return -0.5 + Math.sin(phase * 40) * 0.02;
    if (state === "reeling") return -0.5 + Math.sin(phase * 25) * 0.06;
    return -0.58;
  }

  // ---------------------------------------------------------------------------
  // Main scene draw
  // ---------------------------------------------------------------------------
  function drawScene(t) {
    s.save();
    s.globalAlpha = 1;
    drawSky(t);
    drawWater(t);
    drawIsland();
    drawGrassBits(t);
    drawWaterDetails(t);
    // bobber sits in water (draw before foreground so reeds overlap edges)
    drawLineAndBobber(t);
    drawDock(t);
    stretch = state === "reeling" ? 3 : (state === "bite" ? 1.5 : 0);
    drawAngler(t, currentRodAngle());
    drawParticles(s);
    if (state === "bite") drawBiteCue(t);
    drawDragonfly(t);
    drawMotes(t);
    drawBirds(t);
    // subtle vignette corners (dithered)
    s.globalAlpha = 0.35;
    ditherRect(s, 0, 0, 26, 26, "#0b0e14", 1, 2);
    ditherRect(s, W - 26, 0, 26, 26, "#0b0e14", 0, 2);
    s.globalAlpha = 1;
    s.restore();
  }

  // ---------------------------------------------------------------------------
  // UI (full resolution on main canvas)
  // ---------------------------------------------------------------------------
  const D = 4; // world scale

  function panel(c, x, y, w, h, accent) {
    c.fillStyle = "rgba(10,15,22,0.80)";
    c.fillRect(x, y, w, h);
    c.strokeStyle = "rgba(0,0,0,0.6)";
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, w - 2, h - 2);
    c.strokeStyle = accent || "#5a6a78";
    c.lineWidth = 2;
    c.strokeRect(x, y, w, h);
  }
  function panelInset(c, x, y, w, h, col) {
    c.strokeStyle = col;
    c.lineWidth = 2;
    c.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }

  const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Ancient"];
  const RARITY_PCT = { Common: "45%", Uncommon: "25%", Rare: "15%", Epic: "8%", Legendary: "5%", Ancient: "2%" };

  function drawLegend(c) {
    const x = 16, y = 16, w = 232, h = 176;
    panel(c, x, y, w, h, "#6a7a88");
    drawText(c, "RARITY ODDS", x + 14, y + 12, "#e8d8a8", 2, 1);
    let ry = y + 38;
    for (const r of RARITY_ORDER) {
      const t = TIER[r];
      c.fillStyle = t.col;
      c.fillRect(x + 14, ry, 12, 12);
      c.strokeStyle = "rgba(0,0,0,0.5)"; c.lineWidth = 2;
      c.strokeRect(x + 14, ry, 12, 12);
      drawText(c, r, x + 33, ry - 1, t.col, 2, 1);
      const pct = RARITY_PCT[r];
      drawText(c, pct, x + w - 14 - textW(pct, 2, 1), ry - 1, "#c8d0d8", 2, 1);
      ry += 22;
    }
  }

  function drawLog(c, t) {
    const w = 250, h = 230;
    const x = 1280 - 16 - w, y = 16;
    panel(c, x, y, w, h, "#6a7a88");
    drawText(c, "RECENT CATCHES", x + 14, y + 12, "#e8d8a8", 2, 1);
    c.strokeStyle = "rgba(255,255,255,0.12)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + 12, y + 34); c.lineTo(x + w - 12, y + 34); c.stroke();
    const list = window.fishing.log.slice(0, 8);
    if (list.length === 0) {
      drawText(c, "NOTHING YET...", x + 14, y + 46, "#6a7a88", 2, 1);
    }
    let ry = y + 44;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const tier = TIER[it.rarity] || TIER.Common;
      const a = i === 0 ? 1 : 0.55 + 0.45 * (1 - i / 8);
      c.globalAlpha = a;
      c.fillStyle = tier.col;
      c.fillRect(x + 14, ry + 2, 10, 10);
      const nm = it.name.length > 17 ? it.name.slice(0, 17) : it.name;
      drawText(c, nm, x + 30, ry, i === 0 ? "#ffffff" : "#c8d4dc", 2, 1);
      c.globalAlpha = 1;
      ry += 23;
    }
    // count
    const total = window.fishing.log.length;
    if (total > 8) {
      drawText(c, "+" + (total - 8) + " MORE", x + 14, y + h - 22, "#6a7a88", 2, 1);
    }
  }

  // button geometry (in 1280x720 display coords)
  const BTN = { w: 248, h: 62 };
  BTN.x = Math.round((1280 - BTN.w) / 2);
  BTN.y = 720 - 16 - BTN.h;
  function drawButton(c, t) {
    const labels = { ready: "CAST  [SPACE]", waiting: "WAIT...", bite: "REEL!  [SPACE]", reeling: "...", reveal: "NEXT  [SPACE]" };
    const active = state === "ready" || state === "bite" || state === "reveal";
    const accent = state === "bite" ? "#ff5a3a" : (active ? "#e8b24a" : "#4a5763");
    const pulse = state === "bite" ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
    c.save();
    // glow for bite
    if (state === "bite") {
      c.globalAlpha = 0.25 + pulse * 0.35;
      c.fillStyle = "#ff6a4a";
      c.fillRect(BTN.x - 6, BTN.y - 6, BTN.w + 12, BTN.h + 12);
      c.globalAlpha = 1;
    }
    c.fillStyle = state === "bite" ? "rgba(60,14,10,0.92)" : "rgba(10,15,22,0.88)";
    c.fillRect(BTN.x, BTN.y, BTN.w, BTN.h);
    c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineWidth = 2;
    c.strokeRect(BTN.x + 2, BTN.y + 2, BTN.w - 4, BTN.h - 4);
    c.strokeStyle = accent; c.lineWidth = 4;
    c.strokeRect(BTN.x, BTN.y, BTN.w, BTN.h);
    const label = labels[state];
    const tw = textW(label, 3, 1);
    drawText(c, label, Math.round(1280 / 2 - tw / 2), BTN.y + Math.round((BTN.h - 21) / 2), accent, 3, 1);
    c.restore();
  }

  function drawBiteBar(c) {
    if (state !== "bite") return;
    const remain = clamp(1 - phase / BITE_WINDOW, 0, 1);
    const x = BTN.x, y = BTN.y - 18, w = BTN.w, h = 8;
    c.fillStyle = "rgba(10,15,22,0.85)";
    c.fillRect(x, y, w, h);
    c.fillStyle = remain > 0.42 ? "#f6c453" : "#ff5a3a";
    c.fillRect(x + 2, y + 2, Math.round((w - 4) * remain), h - 4);
    c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function drawEdgeFlash(c, t) {
    if (state !== "bite") return;
    const a = 0.14 + 0.12 * Math.sin(t * 18) + 0.10 * (1 - clamp(phase / BITE_WINDOW, 0, 1));
    c.fillStyle = "rgba(255,70,50," + clamp(a, 0, 0.4).toFixed(3) + ")";
    const th = 7;
    c.fillRect(0, 0, 1280, th);
    c.fillRect(0, 720 - th, 1280, th);
    c.fillRect(0, 0, th, 720);
    c.fillRect(1280 - th, 0, th, 720);
  }

  function drawHint(c) {
    const hints = {
      ready: "PRESS SPACE OR CLICK CAST",
      waiting: "WAIT FOR A BITE...",
      bite: "PRESS NOW!",
      reeling: "REELING IN...",
      reveal: ""
    };
    const h = hints[state];
    if (!h) return;
    drawTextCentered(c, h, 640, BTN.y - 28, state === "bite" ? "#ffb0a0" : "#d8e0e8", 2, 1);
  }

  function drawMissFlash(c, t) {
    if (missFlash <= 0) return;
    const a = clamp(missFlash / 0.9, 0, 1);
    c.globalAlpha = a;
    drawTextCentered(c, "GOT AWAY!", 640, 120, "#ff9a7a", 3, 1);
    c.globalAlpha = 1;
  }

  // reveal ------------------------------------------------------------------
  function drawReveal(c, t) {
    if (!catchFish) return;
    const tier = TIER[catchFish.rarity] || TIER.Common;
    const pw = 560, ph = 380;
    const px = Math.round(1280 / 2 - pw / 2), py = Math.round(720 / 2 - ph / 2) - 10;
    const appear = clamp(phase / 0.35, 0, 1);
    const pop = 1 + (1 - appear) * 0.12;

    c.save();
    c.translate(640, py + ph / 2);
    c.scale(pop, pop);
    c.translate(-640, -(py + ph / 2));

    // darken background
    c.globalAlpha = 0.45 * appear;
    c.fillStyle = "#05070c";
    c.fillRect(0, 0, 1280, 720);
    c.globalAlpha = appear;

    // tier decorations behind panel
    if (tier.deco === "rays") {
      c.save();
      c.translate(640, py + 150);
      for (let i = 0; i < 16; i++) {
        c.rotate(TAU / 16);
        c.globalAlpha = appear * (0.10 + 0.05 * Math.sin(t * 2 + i));
        c.fillStyle = tier.col;
        c.fillRect(-3, 40, 6, 260);
      }
      c.restore();
    }
    if (tier.deco === "runes") {
      c.save();
      c.translate(640, py + 150);
      c.globalAlpha = appear * 0.5;
      ringEllipse(c, 0, 0, 180, 120, tier.col, 1);
      c.globalAlpha = appear * 0.3;
      ringEllipse(c, 0, 0, 150, 100, tier.col, 1);
      c.restore();
    }

    // panel
    c.globalAlpha = appear;
    c.fillStyle = "rgba(8,12,18,0.96)";
    c.fillRect(px, py, pw, ph);
    c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,0.7)";
    c.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
    c.lineWidth = 4; c.strokeStyle = tier.border;
    c.strokeRect(px, py, pw, ph);
    if (tier.deco === "glow" || tier.deco === "rays" || tier.deco === "runes" || tier.deco === "leaves") {
      c.lineWidth = 2;
      c.strokeStyle = "rgba(255,255,255,0.25)";
      c.strokeRect(px + 10, py + 10, pw - 20, ph - 20);
    }

    // rarity banner
    const label = catchFish.rarity.toUpperCase();
    const bw = textW(label, 4, 1) + 44;
    const bx = Math.round(640 - bw / 2);
    c.fillStyle = "rgba(0,0,0,0.5)";
    c.fillRect(bx, py - 2, bw, 44);
    c.lineWidth = 3; c.strokeStyle = tier.border;
    c.strokeRect(bx, py - 2, bw, 44);
    drawTextCentered(c, label, 640, py + 8, tier.col, 4, 1);

    // fish art
    drawFish(catchFish, t);
    const fw = 80 * 4, fh = 52 * 4;
    c.imageSmoothingEnabled = false;
    c.globalAlpha = appear;
    c.drawImage(fishBuf, Math.round(640 - fw / 2), Math.round(py + 66), fw, fh);

    // name
    drawTextShadow(c, catchFish.name, Math.round(640 - textW(catchFish.name, 3, 1) / 2), py + ph - 78, "#ffffff", 3, 1);
    drawTextCentered(c, "CAUGHT AT STILLWATER COVE", 640, py + ph - 40, "#8a98a4", 2, 1);

    // tier particles
    drawTierParticles(c, t, tier, px, py, pw, ph);

    c.restore();
  }

  function drawTierParticles(c, t, tier, px, py, pw, ph) {
    if (tier.deco === "leaves") {
      const cols = ["#7fd06a", "#5fae4a", "#a8e08a"];
      for (let i = 0; i < 7; i++) {
        const h = hash2(i, 7.3);
        const x = px + 24 + ((h * 97) % (pw - 48)) + Math.sin(t * 1.2 + i * 1.9) * 7;
        const y = py + 22 + ((hash2(i, 3.1) * 89) % (ph - 44)) + Math.cos(t * 1.1 + i) * 6;
        const g2 = cols[i % 3];
        fillPoly(c, [[x - 6, y], [x, y - 4], [x + 6, y], [x, y + 4]], g2);
        plotLine(c, x - 8, y + 2, x - 5, y + 1, "#3f7a34", 1);
      }
    }
    if (tier.deco === "sparkle" || tier.deco === "glow" || tier.deco === "rays" || tier.deco === "runes") {
      const n = tier.deco === "sparkle" ? 12 : (tier.deco === "glow" ? 18 : (tier.deco === "rays" ? 24 : 20));
      for (let i = 0; i < n; i++) {
        const h = hash2(i, 4.2);
        const a = t * (0.5 + h * 0.9) + h * 10;
        const x = px + 20 + ((h * 97) % (pw - 40));
        const yy = py + 20 + ((hash2(i, 9.1) * 89) % (ph - 40));
        const tw = Math.sin(a * 3);
        if (tw > 0.2) {
          const sz = tier.deco === "rays" ? 4 : 3;
          c.globalAlpha = clamp(tw, 0, 1) * 0.9;
          c.fillStyle = tier.col;
          c.fillRect(Math.round(x), Math.round(yy), sz, sz);
        }
      }
      c.globalAlpha = 1;
    }
    if (tier.deco === "runes") {
      // orbiting motes
      c.save();
      c.translate(640, py + 150);
      for (let i = 0; i < 6; i++) {
        const a = t * 0.8 + (i / 6) * TAU;
        const x = Math.cos(a) * 175, y = Math.sin(a) * 118;
        c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i);
        c.fillStyle = "#a8fff0";
        c.fillRect(Math.round(x), Math.round(y), 4, 4);
      }
      c.restore();
      c.globalAlpha = 1;
    }
  }

  // start screen -------------------------------------------------------------
  let started = false;
  let startT = 0;
  function drawStart(c, t) {
    c.globalAlpha = 1;
    c.fillStyle = "rgba(5,8,14,0.62)";
    c.fillRect(0, 0, 1280, 720);
    const pw = 620, ph = 250;
    const px = Math.round(640 - pw / 2), py = Math.round(360 - ph / 2);
    panel(c, px, py, pw, ph, "#e8b24a");
    panelInset(c, px, py, pw, ph, "rgba(232,178,74,0.35)");
    drawTextCentered(c, "STILLWATER COVE", 640, py + 26, "#f6d878", 5, 1);
    drawTextCentered(c, "A COZY DAY OF FISHING", 640, py + 70, "#9fb0bc", 2, 1);
    c.strokeStyle = "rgba(232,178,74,0.4)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px + 60, py + 96); c.lineTo(px + pw - 60, py + 96); c.stroke();
    drawTextCentered(c, "CAST INTO THE WATER,", 640, py + 116, "#d8e0e8", 3, 1);
    drawTextCentered(c, "THEN REEL WHEN THE BOBBER DIVES.", 640, py + 150, "#d8e0e8", 3, 1);
    const blink = 0.6 + 0.4 * Math.sin(t * 4);
    c.globalAlpha = blink;
    drawTextCentered(c, "PRESS SPACE TO BEGIN", 640, py + 198, "#7fd0a0", 3, 1);
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // State machine
  // ---------------------------------------------------------------------------
  const CAST_DUR = 0.55;
  const BITE_WINDOW = 1.35;
  const REEL_DUR = 1.15;
  const REVEAL_HOLD = 2.6;

  let state = "ready";
  let phase = 0;
  let waitFor = 0;
  let catchFish = null;
  let missFlash = 0;
  let lastBob = 0;

  function setState(ns) {
    state = ns;
    phase = 0;
    window.fishing.state = ns;
  }

  function cast() {
    if (state !== "ready") return;
    const tx = 186 + Math.random() * 44;
    const ty = 108 + Math.random() * 16;
    bobber.tx = tx; bobber.ty = ty;
    bobber.inWater = false;
    castSplashed = false;
    waitFor = 1.5 + Math.random() * 1.7;
    setState("waiting");
  }

  function reelIn() {
    if (state !== "bite") return;
    // The game must resolve rarity through the exposed, replaceable function.
    const rar = window.fishing.pickRarity(Math.random());
    catchFish = pickFish(rar);
    catchFish.rarity = rar;
    window.fishing.log.unshift({ name: catchFish.name, rarity: rar });
    spawnSplash(bobber.x, bobber.y, 18, 1.6);
    for (let i = 0; i < 3; i++) spawnRipple(bobber.x, bobber.y, 8 + i * 5, "rgba(230,250,255,0.6)");
    setState("reeling");
  }

  function miss() {
    spawnRipple(bobber.x, bobber.y, 7, "rgba(180,220,230,0.5)");
    missFlash = 1.0;
    bobber.inWater = false;
    setState("ready");
  }

  function backToReady() {
    bobber.inWater = false;
    catchFish = null;
    setState("ready");
  }

  function doAction() {
    if (!started) {
      started = true;
      cast();
      return;
    }
    if (state === "ready") cast();
    else if (state === "bite") reelIn();
    else if (state === "reveal") backToReady();
    // waiting / reeling: ignored
  }

  function update(dt) {
    phase += dt;
    if (missFlash > 0) missFlash -= dt;
    updateParticles(dt);

    if (state === "waiting") {
      const c = clamp(phase / CAST_DUR, 0, 1);
      if (c < 1) {
        // arc from rod tip to target
        const tip = rodTipFor(currentRodAngle());
        const u = c;
        bobber.x = lerp(tip.x, bobber.tx, u);
        bobber.y = lerp(tip.y, bobber.ty, u) - Math.sin(u * Math.PI) * 26;
        bobber.inWater = false;
      } else {
        bobber.x = bobber.tx; bobber.y = bobber.ty;
        bobber.inWater = true;
        if (!castSplashed) {
          castSplashed = true;
          spawnSplash(bobber.x, bobber.y, 8, 1.1);
          spawnRipple(bobber.x, bobber.y, 9, "rgba(230,250,255,0.55)");
        }
        // gentle bob
        bobber.y = bobber.ty + Math.sin(phase * 2.2) * 0.8;
        if (phase >= CAST_DUR + waitFor) {
          setState("bite");
          spawnSplash(bobber.x, bobber.y, 14, 1.3);
          for (let i = 0; i < 2; i++) spawnRipple(bobber.x, bobber.y, 8 + i * 6, "rgba(230,250,255,0.6)");
        }
      }
    } else if (state === "bite") {
      // dive + shake
      bobber.x = bobber.tx + Math.sin(phase * 45) * 1.4;
      bobber.y = bobber.ty + 3.6 + Math.sin(phase * 30) * 0.7;
      if (Math.random() < 0.4) spawnSplash(bobber.x, bobber.y + 1, 2, 1.1);
      if (phase > 0.25 && Math.random() < 0.09) spawnRipple(bobber.x, bobber.y, 6, "rgba(230,250,255,0.5)");
      if (phase >= BITE_WINDOW) miss();
    } else if (state === "reeling") {
      const c = clamp(phase / REEL_DUR, 0, 1);
      const tip = rodTipFor(currentRodAngle());
      const e = c * c;
      bobber.x = lerp(bobber.tx, tip.x, e);
      bobber.y = lerp(bobber.ty, tip.y, e) - Math.sin(c * Math.PI) * 10;
      bobber.inWater = c < 0.2;
      if (phase >= REEL_DUR) setState("reveal");
    } else if (state === "reveal") {
      if (phase >= REVEAL_HOLD) backToReady();
    } else {
      // ready: bobber dangles near the rod
      const tip = rodTipFor(currentRodAngle());
      bobber.x = tip.x + 1;
      bobber.y = tip.y + 6 + Math.sin(phase * 2) * 0.6;
      bobber.inWater = false;
    }
    window.fishing.state = state;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  let tAll = 0;
  function render() {
    drawScene(tAll);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 1280, 720);
    g.drawImage(scene, 0, 0, W, H, 0, 0, 1280, 720);

    drawLegend(g);
    drawLog(g, tAll);
    drawButton(g, tAll);
    drawBiteBar(g);
    drawHint(g);
    drawMissFlash(g, tAll);
    drawEdgeFlash(g, tAll);
    if (state === "reveal") drawReveal(g, tAll);
    if (!started) drawStart(g, tAll);
  }

  // ---------------------------------------------------------------------------
  // Loop (pauses while document.hidden)
  // ---------------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (document.hidden) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    if (!document.hidden) tAll += dt;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", function () {
    last = performance.now();
  });

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (!e.repeat) doAction();
    }
  });
  hit.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    doAction();
  });

  // button hit area aligned to drawn button (percentage of the 1280x720 stage)
  (function placeHit() {
    hit.style.left = (BTN.x / 1280 * 100) + "%";
    hit.style.top = (BTN.y / 720 * 100) + "%";
    hit.style.width = (BTN.w / 1280 * 100) + "%";
    hit.style.height = (BTN.h / 720 * 100) + "%";
  })();

  // ---------------------------------------------------------------------------
  // Test interface
  // ---------------------------------------------------------------------------
  function pickRarityImpl(u) {
    if (u < 0.45) return "Common";
    if (u < 0.70) return "Uncommon";
    if (u < 0.85) return "Rare";
    if (u < 0.93) return "Epic";
    if (u < 0.98) return "Legendary";
    return "Ancient";
  }
  window.fishing = {
    state: "ready",
    pickRarity: pickRarityImpl,
    log: []
  };

  requestAnimationFrame(frame);
})();
