/* =========================================================================
 * fish.js — original procedural pixel-art fish renderer
 * All art is computed in code into small pixel buffers. No image files.
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------- tiny deterministic RNG ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ======================= Fish definitions ======================= */
  /* Each entry: original name, rarity, and art parameters. */
  var FISHES = [
    /* ------------------------- COMMON ------------------------- */
    {
      name: 'Mudfin Minnow', rarity: 'Common', seed: 11,
      bodyW: 20, bodyH: 8, tail: 'fan', tailLen: 7, tailH: 5,
      color: '#a4925f', back: '#6f6039', belly: '#ddcda0', fin: '#b7a471',
      outline: '#4a3f26', eye: '#2a2418', eyeR: 1
    },
    {
      name: 'Sunny Perch', rarity: 'Common', seed: 22,
      bodyW: 22, bodyH: 12, tail: 'fan', tailLen: 7, tailH: 7,
      color: '#c9a53f', back: '#8c6d22', belly: '#f2e2a4', fin: '#b8862e',
      outline: '#59430f', stripes: '#6f5316', stripeGap: 3, stripeW: 1,
      dorsal: 5, spiny: true, anal: 3
    },
    /* ------------------------ UNCOMMON ------------------------ */
    {
      name: 'Sunscale Roach', rarity: 'Uncommon', seed: 33,
      bodyW: 24, bodyH: 13, tail: 'fork', tailLen: 8, tailH: 8,
      color: '#dcc684', back: '#a98f45', belly: '#f7f0d2', fin: '#e3cd80',
      outline: '#6b5620', dorsal: 4, anal: 3, iridescent: true
    },
    {
      name: 'Reedtail Dace', rarity: 'Uncommon', seed: 44,
      bodyW: 23, bodyH: 9, tail: 'fork', tailLen: 9, tailH: 6,
      color: '#8fb0a2', back: '#597c6e', belly: '#dceee5', fin: '#7fa392',
      outline: '#37544a', stripe: '#4f7a86', dorsal: 3
    },
    /* -------------------------- RARE -------------------------- */
    {
      name: 'Moonkite Bass', rarity: 'Rare', seed: 55,
      bodyW: 25, bodyH: 15, tail: 'fan', tailLen: 8, tailH: 9,
      color: '#86aecd', back: '#456a8c', belly: '#e0eef7', fin: '#6f97b8',
      outline: '#28435f', dorsal: 6, spiny: true, anal: 4,
      crescent: '#eaf6ff', spots: 0
    },
    {
      name: 'Copperjaw Trout', rarity: 'Rare', seed: 66,
      bodyW: 27, bodyH: 12, tail: 'fork', tailLen: 8, tailH: 7,
      color: '#c98a5a', back: '#8f5a34', belly: '#f2d8b6', fin: '#b06f3f',
      outline: '#5e361c', spots: 9, spotColor: '#4a2a17', jaw: '#e8a85a',
      dorsal: 4, anal: 3
    },
    /* -------------------------- EPIC -------------------------- */
    {
      name: 'Emberfin Pike', rarity: 'Epic', seed: 77,
      bodyW: 32, bodyH: 10, tail: 'fan', tailLen: 9, tailH: 7,
      color: '#6f8a52', back: '#3d5a35', belly: '#cfe0a8', fin: '#ff7a3c',
      outline: '#2c4426', dorsal: 5, spiny: true, anal: 4,
      glow: '#ff9a4a', glowA: 70, spots: 7, spotColor: '#7fd8a0'
    },
    {
      name: 'Crystalwing Carp', rarity: 'Epic', seed: 88,
      bodyW: 23, bodyH: 16, tail: 'fan', tailLen: 8, tailH: 9,
      color: '#a9dbe4', back: '#6aa8ba', belly: '#eafbfd', fin: '#c4ecf4',
      outline: '#3f7d8f', dorsal: 5, glow: '#9fe8ff', glowA: 60,
      iridescent: true, mouthBarbels: 1
    },
    /* ------------------------ LEGENDARY ----------------------- */
    {
      name: 'Stormcrest Marlin', rarity: 'Legendary', seed: 99,
      bodyW: 30, bodyH: 13, tail: 'fork', tailLen: 9, tailH: 9,
      color: '#3f6f9f', back: '#203f66', belly: '#dcebf6', fin: '#5d90bf',
      outline: '#132a45', dorsal: 7, sail: true, bill: 12,
      glow: '#8fc4ff', glowA: 55
    },
    {
      name: 'Goldwhisker Catfish', rarity: 'Legendary', seed: 111,
      bodyW: 27, bodyH: 15, tail: 'round', tailLen: 7, tailH: 9,
      color: '#7c6c4a', back: '#4d412b', belly: '#cfbf95', fin: '#8f7d56',
      outline: '#332b1c', whiskers: '#e8c86a', whiskerLen: 13,
      dorsal: 2, glow: '#ffd97a', glowA: 45
    },
    /* ------------------------- ANCIENT ------------------------ */
    {
      name: 'Eldertide Coelacanth', rarity: 'Ancient', seed: 123,
      bodyW: 28, bodyH: 16, tail: 'round', tailLen: 8, tailH: 10,
      color: '#2f7f76', back: '#155048', belly: '#8fdccb', fin: '#3fa89a',
      outline: '#0c332f', plates: true, legs: true,
      glow: '#5ff0d8', glowA: 95, runes: '#c8fff2'
    },
    {
      name: 'Abyssal Dragonfish', rarity: 'Ancient', seed: 135,
      bodyW: 26, bodyH: 12, tail: 'fan', tailLen: 8, tailH: 8,
      color: '#3a2f5a', back: '#1d1540', belly: '#7d70a8', fin: '#5a3f8a',
      outline: '#120c2e', teeth: true, lure: true,
      glow: '#b070ff', glowA: 100, spots: 5, spotColor: '#c79bff'
    }
  ];

  /* ======================= pixel rasterizer ======================= */
  var TW = 70, TH = 46;

  function makeFishCanvas(cfg) {
    var c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    var ctx = c.getContext('2d');
    var im = ctx.createImageData(TW, TH);
    var d = im.data;

    var bodyW = cfg.bodyW, bodyH = cfg.bodyH;
    var headX = 8;
    var bodyCx = headX + bodyW / 2;
    var bodyCy = TH / 2;
    var outRgb = hexToRgb(cfg.outline || '#222');

    function set(x, y, hex, a) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= TW || y >= TH) return;
      var rgb = hexToRgb(hex);
      var i = (y * TW + x) * 4;
      if (a === undefined || a >= 255) {
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      } else if (d[i + 3] === 0) {
        /* keep full colour, store straight alpha so it composites as a glow */
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a;
      } else {
        var af = a / 255;
        d[i] = d[i] * (1 - af) + rgb[0] * af;
        d[i + 1] = d[i + 1] * (1 - af) + rgb[1] * af;
        d[i + 2] = d[i + 2] * (1 - af) + rgb[2] * af;
        d[i + 3] = Math.max(d[i + 3], a);
      }
    }

    function inBody(x, y) {
      var nx = (x - bodyCx) / (bodyW / 2);
      var ny = (y - bodyCy) / (bodyH / 2);
      return nx * nx + ny * ny <= 1.0001;
    }

    /* soft glow aura (drawn first, behind) */
    if (cfg.glow) {
      var ga = cfg.glowA || 60;
      for (var gy = 0; gy < TH; gy++) {
        for (var gx = 0; gx < TW; gx++) {
          var nx2 = (gx - bodyCx) / (bodyW / 2);
          var ny2 = (gy - bodyCy) / (bodyH / 2);
          var r = Math.sqrt(nx2 * nx2 + ny2 * ny2);
          if (r > 1 && r < 1.6) {
            var fall = 1 - (r - 1) / 0.6;
            set(gx, gy, cfg.glow, Math.round(ga * fall * fall));
          }
        }
      }
    }

    /* ---------- tail (behind body) ---------- */
    var tailBaseX = bodyCx + bodyW / 2 - 2;
    var tailLen = cfg.tailLen || 7, tailH = cfg.tailH || 5;
    for (var ti = 0; ti < tailLen; ti++) {
      var t = ti / Math.max(1, tailLen - 1);
      var half = 1 + t * tailH;
      for (var dy = -Math.ceil(half); dy <= Math.ceil(half); dy++) {
        var m = Math.abs(dy) / (half + 0.001);
        if (m > 1) continue;
        if (cfg.tail === 'fork' && m < t * 0.8) continue;
        var col = cfg.fin;
        if (m > 0.72) col = cfg.outline;
        set(tailBaseX + ti, bodyCy + dy, col);
      }
    }

    /* ---------- dorsal fin ---------- */
    var dorsalH = cfg.dorsal || 0;
    if (dorsalH > 0) {
      var dStart = cfg.sail ? -0.15 : 0.12;
      var dEnd = cfg.sail ? 0.95 : 0.78;
      var dSpan = dEnd - dStart;
      for (var i = 0; i <= Math.round(bodyW * dSpan); i++) {
        var f = i / Math.round(bodyW * dSpan);
        var x = headX + bodyW * (dStart + dSpan * f);
        var nxB = (x - bodyCx) / (bodyW / 2);
        if (nxB * nxB > 1) continue;
        var ytop = bodyCy - (bodyH / 2) * Math.sqrt(1 - nxB * nxB);
        var hh = Math.sin(Math.PI * f) * dorsalH;
        if (cfg.spiny) hh *= (0.55 + 0.45 * ((i % 2) ? 1 : 0.35));
        for (var yy = 1; yy <= hh; yy++) {
          var cc = (yy > hh - 1.1) ? cfg.outline : cfg.fin;
          if (cfg.sail && yy > 1) cc = (yy % 3 === 0) ? cfg.back : cfg.fin;
          set(x, Math.round(ytop - yy), cc);
        }
      }
    }

    /* ---------- anal fin ---------- */
    var analH = cfg.anal || 0;
    if (analH > 0) {
      for (var ai = 0; ai <= Math.round(bodyW * 0.45); ai++) {
        var af2 = ai / Math.round(bodyW * 0.45);
        var ax = headX + bodyW * (0.42 + 0.42 * af2);
        var nxA = (ax - bodyCx) / (bodyW / 2);
        if (nxA * nxA > 1) continue;
        var ybot = bodyCy + (bodyH / 2) * Math.sqrt(1 - nxA * nxA);
        var ah = Math.sin(Math.PI * af2) * analH;
        for (var aa = 1; aa <= ah; aa++) {
          set(ax, Math.round(ybot + aa), (aa > ah - 1.1) ? cfg.outline : cfg.fin);
        }
      }
    }

    /* ---------- pectoral fin (on body, after body would cover; draw before) ---------- */
    var pecX = headX + bodyW * 0.30, pecY = bodyCy + bodyH * 0.32;

    /* ---------- body ---------- */
    var bodyTop = 0, bodyBot = 0, bodyLeft = 0, bodyRight = 0;
    for (var y = 0; y < TH; y++) {
      for (var x = 0; x < TW; x++) {
        if (!inBody(x, y)) continue;
        var ny = (y - bodyCy) / (bodyH / 2);
        var col2;
        if (ny < -0.42) col2 = cfg.back;
        else if (ny < -0.18) col2 = cfg.color;
        else if (ny > 0.5) col2 = cfg.belly;
        else col2 = cfg.color;
        /* top highlight */
        if (ny > -1 && ny < -0.72) col2 = cfg.glow ? cfg.glow : cfg.belly;
        set(x, y, col2);
      }
    }

    /* iridescent bands */
    if (cfg.iridescent) {
      for (var x2 = 0; x2 < TW; x2++) {
        for (var y2 = 0; y2 < TH; y2++) {
          if (!inBody(x2, y2)) continue;
          var band = fnv(x2, y2, cfg.seed);
          if (band > 0.86) set(x2, y2, cfg.belly, 120);
          else if (band < 0.10) set(x2, y2, cfg.glow || cfg.fin, 90);
        }
      }
    }

    /* stripes */
    if (cfg.stripes || cfg.stripe) {
      var sc = cfg.stripes || cfg.stripe;
      var gap = cfg.stripeGap || 4;
      for (var sx = 0; sx < TW; sx++) {
        if ((sx - headX) % gap !== 0) continue;
        for (var sy = 0; sy < TH; sy++) {
          if (!inBody(sx, sy)) continue;
          set(sx, sy, sc);
        }
      }
    }

    /* spots */
    if (cfg.spots) {
      var rnd = mulberry32(cfg.seed * 7 + 3);
      var placed = 0, guard = 0;
      while (placed < cfg.spots && guard < 400) {
        guard++;
        var ang = rnd() * Math.PI * 2;
        var rad = Math.sqrt(rnd()) * 0.72;
        var sxp = bodyCx + Math.cos(ang) * rad * (bodyW / 2);
        var syp = bodyCy + Math.sin(ang) * rad * (bodyH / 2);
        if (!inBody(sxp, syp)) continue;
        set(sxp, syp, cfg.spotColor || cfg.outline);
        set(sxp + 1, syp, cfg.spotColor || cfg.outline);
        placed++;
      }
    }

    /* armor plates (coelacanth) */
    if (cfg.plates) {
      for (var px = headX + 2; px < headX + bodyW - 2; px += 3) {
        for (var py = 0; py < TH; py++) {
          if (!inBody(px, py)) continue;
          if (py % 2 === 0) set(px, py, cfg.glow, 70);
        }
      }
    }

    /* runes (ancient) */
    if (cfg.runes) {
      var rr = mulberry32(cfg.seed + 5);
      for (var k = 0; k < 8; k++) {
        var rx = headX + 3 + Math.floor(rr() * (bodyW - 6));
        var ry = Math.floor(bodyCy - bodyH / 2 + 2 + rr() * (bodyH - 4));
        if (!inBody(rx, ry)) continue;
        set(rx, ry, cfg.runes); set(rx + 1, ry, cfg.runes);
        set(rx, ry + 1, cfg.runes);
      }
    }

    /* outline pass */
    for (var oy = 1; oy < TH - 1; oy++) {
      for (var ox = 1; ox < TW - 1; ox++) {
        if (!inBody(ox, oy)) continue;
        if (!inBody(ox - 1, oy) || !inBody(ox + 1, oy) ||
            !inBody(ox, oy - 1) || !inBody(ox, oy + 1)) {
          set(ox, oy, cfg.outline);
        }
      }
    }

    /* ---------- pectoral fin (over body) ---------- */
    for (var fi = -3; fi <= 3; fi++) {
      for (var fj = 0; fj <= 4; fj++) {
        if (fi * fi / 9 + fj * fj / 16 <= 1) {
          set(pecX + fi, pecY + fj, (fj === 4) ? cfg.outline : cfg.fin);
        }
      }
    }

    /* ---------- legs (lobed fins) ---------- */
    if (cfg.legs) {
      for (var lx = 0; lx < 3; lx++) {
        for (var ly = 0; ly < 6; ly++) {
          set(headX + 6 + lx * 8, bodyCy + bodyH / 2 + ly, cfg.fin);
          set(headX + 6 + lx * 8 + 1, bodyCy + bodyH / 2 + ly, cfg.fin);
        }
      }
    }

    /* ---------- eye ---------- */
    var ex = headX + bodyW * 0.20, ey = bodyCy - bodyH * 0.14;
    var er = cfg.eyeR || 1;
    for (var xx = -1 - er; xx <= 1 + er; xx++) {
      for (var yyy = -1 - er; yyy <= 1 + er; yyy++) {
        if (xx * xx + yyy * yyy <= (er + 1) * (er + 1)) set(ex + xx, ey + yyy, cfg.outline);
      }
    }
    set(ex, ey, '#ffffff'); set(ex, ey - 1, '#ffffff');
    set(ex, ey, cfg.eye || '#111');
    set(ex + 1, ey, cfg.eye || '#111');

    /* ---------- mouth / jaw ---------- */
    set(headX + 1, bodyCy + bodyH * 0.20, cfg.outline);
    set(headX, bodyCy + bodyH * 0.20, cfg.outline);
    if (cfg.jaw) {
      set(headX + 1, bodyCy + bodyH * 0.30, cfg.jaw);
      set(headX + 2, bodyCy + bodyH * 0.30, cfg.jaw);
    }
    if (cfg.teeth) {
      for (var tx = 1; tx <= 4; tx++) set(headX + tx, bodyCy + bodyH * 0.20, '#f4f4ff');
    }
    if (cfg.bill) {
      for (var bx = 1; bx <= cfg.bill; bx++) {
        var bh = Math.max(0, 1 - Math.floor(bx / 6));
        for (var by = -bh; by <= bh; by++) set(headX - bx, bodyCy - 1 + by, cfg.fin);
      }
      set(headX - cfg.bill, bodyCy - 1, cfg.outline);
    }
    if (cfg.mouthBarbels) {
      for (var mb = 0; mb < 7; mb++) {
        set(headX - 1, bodyCy + bodyH * 0.30 + mb, cfg.outline);
        set(headX - 2, bodyCy + bodyH * 0.30 + mb, cfg.outline);
      }
    }
    if (cfg.whiskers) {
      var wl = cfg.whiskerLen || 10;
      for (var w = 0; w < wl; w++) {
        var wy = Math.round(Math.sin(w / wl * 1.6) * 3);
        set(headX - 1 - w * 0.7, bodyCy + bodyH * 0.25 + wy, cfg.whiskers);
        set(headX - 1 - w * 0.7, bodyCy + bodyH * 0.25 + wy + 1, cfg.whiskers);
        if (w < wl * 0.7) set(headX - 1 - w, bodyCy - bodyH * 0.30 - Math.round(w * 0.05), cfg.whiskers);
      }
    }
    if (cfg.lure) {
      var stalkX = headX + bodyW * 0.35, stalkY = bodyCy - bodyH / 2;
      for (var ls = 0; ls < 9; ls++) {
        set(stalkX - ls * 0.9, stalkY - ls * 0.9, cfg.outline);
      }
      var bulbX = stalkX - 8, bulbY = stalkY - 9;
      for (var u = -2; u <= 2; u++) {
        for (var v = -2; v <= 2; v++) {
          if (u * u + v * v <= 5) set(bulbX + u, bulbY + v, cfg.glow);
        }
      }
      set(bulbX, bulbY - 3, '#ffffff');
    }

    /* eyes glow for ancient */
    if (cfg.glow) {
      set(ex, ey, '#ffffff');
    }

    ctx.putImageData(im, 0, 0);

    /* crop to content */
    var minX = TW, minY = TH, maxX = 0, maxY = 0;
    for (var cy2 = 0; cy2 < TH; cy2++) {
      for (var cx2 = 0; cx2 < TW; cx2++) {
        if (d[(cy2 * TW + cx2) * 4 + 3] > 6) {
          if (cx2 < minX) minX = cx2;
          if (cx2 > maxX) maxX = cx2;
          if (cy2 < minY) minY = cy2;
          if (cy2 > maxY) maxY = cy2;
        }
      }
    }
    if (minX > maxX) { minX = 0; minY = 0; maxX = TW - 1; maxY = TH - 1; }
    minX = Math.max(0, minX - 1); minY = Math.max(0, minY - 1);
    maxX = Math.min(TW - 1, maxX + 1); maxY = Math.min(TH - 1, maxY + 1);
    var cw = maxX - minX + 1, ch = maxY - minY + 1;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
    return { canvas: out, w: cw, h: ch };
  }

  /* cheap per-pixel hash for iridescence */
  function fnv(x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return (h & 0xffff) / 0xffff;
  }

  /* Pre-render all fish once. */
  var RENDERED = FISHES.map(function (f) {
    var r = makeFishCanvas(f);
    return { cfg: f, canvas: r.canvas, w: r.w, h: r.h };
  });

  function fishOfRarity(rarity) {
    var pool = RENDERED.filter(function (f) { return f.cfg.rarity === rarity; });
    if (!pool.length) return RENDERED[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  window.FishArt = {
    FISHES: FISHES,
    RENDERED: RENDERED,
    makeFishCanvas: makeFishCanvas,
    fishOfRarity: fishOfRarity
  };
})();
