/* Tidepool Cove — a cozy top-down pixel fishing spot.
   All artwork is drawn procedurally in code. No external assets. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- setup
  const frame = document.getElementById('frame');
  const scene = document.getElementById('scene');
  const ui = document.getElementById('ui');
  const ctx = scene.getContext('2d');
  const uctx = ui.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  uctx.imageSmoothingEnabled = false;

  const W = 320, H = 180;         // logical scene resolution
  const SCALE = 4;                // 320*4 = 1280, 180*4 = 720
  const VW = W * SCALE, VH = H * SCALE;
  let viewScale = 1;

  function fit() {
    const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    viewScale = s;
    frame.style.transform = 'translate(' +
      Math.round((window.innerWidth - VW * s) / 2) + 'px,' +
      Math.round((window.innerHeight - VH * s) / 2) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------------- palette
  const C = {
    skyTop: '#4f7fb0', skyMid: '#8fbcd9', skyWarm: '#f6d7a0',
    sun: '#fff2c8', sunGlow: '#ffd98a',
    cloud: '#fdf3e2', cloudShade: '#d9c3ad',
    hillFar: '#5f7f8c', hillMid: '#4d6b78', hillNear: '#3f5a66',
    waterFar: '#79b8c4', waterMid: '#3f8fa3', waterNear: '#1f5f78', waterDeep: '#123f55',
    foam: '#e8f7f0', sparkle: '#dffbff',
    sand: '#e6cd94', sandShade: '#c8a869', sandDark: '#a8884f',
    grass: '#6f9a48', grassDark: '#517636', grassLight: '#8fbf5e',
    trunk: '#8a6239', trunkDark: '#5f3f22',
    leaf: '#4f8a35', leafLight: '#7dbb4d', leafDark: '#2f5a22',
    wood: '#b5814f', woodDark: '#7a5230', woodLight: '#d8a86a', woodShadow: '#5a3a20',
    rock: '#9aa1a8', rockDark: '#5f676f', rockLight: '#c3cad0',
    skin: '#efb98a', skinShade: '#c98d63',
    ink: '#22160f',
    ui: '#eef6f2', uiDim: '#9fb3ad', uiPanel: 'rgba(10,20,24,0.72)', uiLine: 'rgba(180,220,215,0.28)'
  };

  const RARITY_COLOR = {
    Common: '#cfd8dd', Uncommon: '#7ee081', Rare: '#5aa9ff',
    Epic: '#c77dff', Legendary: '#ffcc4d', Ancient: '#6ffff0'
  };
  const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

  // ---------------------------------------------------------------- helpers
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // sprite from array of strings, palette keyed by char
  function spr(rows, x, y, pal, opt) {
    opt = opt || {};
    const flip = opt.flip, sway = opt.sway || 0, phase = opt.phase || 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const ox = sway ? Math.round(sway * Math.sin(phase + r * 0.11)) : 0;
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ' ' || ch === '.') continue;
        const col = pal[ch];
        if (!col) continue;
        const cx = flip ? (x + row.length - 1 - c) : (x + c);
        ctx.fillStyle = col;
        ctx.fillRect(cx + ox, y + r, 1, 1);
      }
    }
  }

  // ---------------------------------------------------------------- fish art
  const FISH = [
    { name: 'Puddle Perch', rarity: 'Common', cfg: { shape: 'round', top: '#6f8f4a', mid: '#9fbf5a', belly: '#ece6b0', fin: '#c9a24a', outline: '#39481f', pattern: 'stripes', pat: '#57702f', eye: '#24240f' } },
    { name: 'Dune Minnow', rarity: 'Common', cfg: { shape: 'torpedo', top: '#c9a86a', mid: '#e6cd8a', belly: '#fdf3d4', fin: '#d9b877', outline: '#6a5430', pattern: 'none', pat: '#000', eye: '#2a2410' } },
    { name: 'Copperfin', rarity: 'Common', cfg: { shape: 'round', top: '#a8612f', mid: '#d98a45', belly: '#f8dda6', fin: '#b56a33', outline: '#5a2f14', pattern: 'spots', pat: '#8a4a22', eye: '#241208' } },
    { name: 'Fern Carp', rarity: 'Uncommon', cfg: { shape: 'deep', top: '#3f6b3a', mid: '#5f9a4a', belly: '#d6e6a4', fin: '#7aae5a', outline: '#22401d', pattern: 'scales', pat: '#2f552b', eye: '#16240f' } },
    { name: 'Mossback Guppy', rarity: 'Uncommon', cfg: { shape: 'guppy', top: '#3a7a6a', mid: '#5fb0a0', belly: '#d6f4ea', fin: '#e08a9a', outline: '#1f4a40', pattern: 'spots', pat: '#2a6a5a', eye: '#0f2420' } },
    { name: 'Amber Koi', rarity: 'Rare', cfg: { shape: 'deep', top: '#e0a83a', mid: '#fbe6ba', belly: '#fff8e6', fin: '#f2c46a', outline: '#8a5a1a', pattern: 'spots', pat: '#e05a2a', eye: '#3a1f06' } },
    { name: 'Glass Eel', rarity: 'Rare', cfg: { shape: 'eel', top: '#8fd0d8', mid: '#c7eef0', belly: '#f0fcfc', fin: '#9fd8dd', outline: '#4a8a92', pattern: 'none', pat: '#000', eye: '#295a66' } },
    { name: 'Moonlit Ray', rarity: 'Epic', cfg: { shape: 'ray', top: '#2f3a6a', mid: '#4a5aa0', belly: '#d3ddf6', fin: '#6a7ac0', outline: '#161f3d', pattern: 'spots', pat: '#eef4ff', eye: '#070a1c' } },
    { name: 'Stormfin Grouper', rarity: 'Epic', cfg: { shape: 'grouper', top: '#39485a', mid: '#5a6f82', belly: '#c2ccd4', fin: '#8a5a3a', outline: '#1c2630', pattern: 'stripes', pat: '#293845', eye: '#0c1014' } },
    { name: 'Crowned Pike', rarity: 'Legendary', cfg: { shape: 'pike', top: '#2f6a4a', mid: '#4f9a6a', belly: '#e6f4c8', fin: '#e0c04a', outline: '#173726', pattern: 'spots', pat: '#f6dc74', eye: '#0c1c12' } },
    { name: 'Tidewyrm Oracle', rarity: 'Ancient', cfg: { shape: 'ancient', top: '#3a2a5a', mid: '#5a4a8a', belly: '#d2c2f0', fin: '#7a6ab0', outline: '#160f2c', pattern: 'runes', pat: '#8ff0e0', eye: '#eaffff' } }
  ];
  const BY_RARITY = {};
  for (const f of FISH) { (BY_RARITY[f.rarity] = BY_RARITY[f.rarity] || []).push(f); }

  function fishBodyPath(cx, cy, w, h) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  }

  function drawFish(cfg, cx, cy, w, h, t) {
    t = t || 0;
    ctx.save();
    if (cfg.shape === 'eel') { ctx.restore(); return drawEel(cfg, cx, cy, w, h, t); }
    if (cfg.shape === 'ray') { ctx.restore(); return drawRay(cfg, cx, cy, w, h, t); }
    if (cfg.shape === 'ancient') { ctx.restore(); return drawAncient(cfg, cx, cy, w, h, t); }

    let sx = 1, sy = 1, tailLift = 0;
    if (cfg.shape === 'torpedo') { sx = 1.35; sy = 0.62; }
    if (cfg.shape === 'deep') { sx = 0.92; sy = 1.18; }
    if (cfg.shape === 'guppy') { sx = 0.95; sy = 1.0; tailLift = 0.1; }
    if (cfg.shape === 'grouper') { sx = 1.05; sy = 1.15; }
    if (cfg.shape === 'pike') { sx = 1.7; sy = 0.66; }
    const rx = (w / 2) * sx, ry = (h / 2) * sy;

    // ribbon tail
    ctx.fillStyle = cfg.fin;
    const wag = Math.sin(t * 4) * ry * 0.25;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.82, cy);
    ctx.lineTo(cx - rx - w * 0.18, cy - ry * 0.95 + wag + tailLift * h);
    ctx.lineTo(cx - rx - w * 0.10, cy + wag);
    ctx.lineTo(cx - rx - w * 0.18, cy + ry * 0.95 + wag + tailLift * h);
    ctx.closePath(); ctx.fill();

    // body
    fishBodyPath(cx, cy, rx * 2, ry * 2); ctx.fillStyle = cfg.mid; ctx.fill();

    // shading + pattern clipped to body
    ctx.save();
    fishBodyPath(cx, cy, rx * 2, ry * 2); ctx.clip();
    ctx.fillStyle = cfg.top; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 1.05);
    ctx.fillStyle = cfg.belly; ctx.fillRect(cx - rx, cy + ry * 0.42, rx * 2, ry);
    if (cfg.pattern === 'stripes') {
      ctx.fillStyle = cfg.pat;
      for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * rx * 0.34 - rx * 0.055, cy - ry, rx * 0.11, ry * 2);
    } else if (cfg.pattern === 'spots') {
      ctx.fillStyle = cfg.pat;
      const pts = [[-0.42, -0.15], [0.0, 0.18], [0.34, -0.06], [-0.08, -0.36], [0.2, 0.3], [0.5, 0.12]];
      for (const p of pts) { ctx.beginPath(); ctx.arc(cx + p[0] * rx, cy + p[1] * ry, Math.max(1.1, rx * 0.1), 0, 7); ctx.fill(); }
    } else if (cfg.pattern === 'scales') {
      ctx.strokeStyle = cfg.pat; ctx.lineWidth = 1;
      for (let gx = -2; gx <= 3; gx++) for (let gy = -1; gy <= 1; gy++) {
        ctx.beginPath();
        ctx.arc(cx + gx * rx * 0.3, cy + gy * ry * 0.48, rx * 0.15, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
    }
    ctx.restore();

    // dorsal fin
    ctx.fillStyle = cfg.fin;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.2, cy - ry * 0.86);
    ctx.lineTo(cx + rx * 0.28, cy - ry * 1.55);
    ctx.lineTo(cx + rx * 0.6, cy - ry * 0.78);
    ctx.closePath(); ctx.fill();
    // pectoral fin
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.1, cy + ry * 0.15);
    ctx.lineTo(cx + rx * 0.5, cy + ry * 0.95);
    ctx.lineTo(cx + rx * 0.78, cy + ry * 0.2);
    ctx.closePath(); ctx.fill();

    // outline
    ctx.lineWidth = Math.max(1, w * 0.028);
    ctx.strokeStyle = cfg.outline;
    fishBodyPath(cx, cy, rx * 2, ry * 2); ctx.stroke();

    // eye
    eye(cfg, cx + rx * 0.58, cy - ry * 0.18, rx);
    ctx.restore();
  }

  function eye(cfg, ex, ey, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.3, r * 0.16), 0, 7); ctx.fill();
    ctx.fillStyle = cfg.eye || '#111';
    ctx.beginPath(); ctx.arc(ex + r * 0.03, ey, Math.max(0.7, r * 0.085), 0, 7); ctx.fill();
  }

  function drawEel(cfg, cx, cy, w, h, t) {
    const len = w * 0.5, th = h * 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = th * 2; ctx.strokeStyle = cfg.mid;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const x = cx - len + u * len * 2;
      const y = cy + Math.sin(t * 3 + u * 6) * h * 0.16;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = th * 2.15; ctx.strokeStyle = cfg.outline;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const x = cx - len + u * len * 2;
      const y = cy + Math.sin(t * 3 + u * 6) * h * 0.16;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // fin frill
    ctx.strokeStyle = cfg.fin; ctx.lineWidth = 1;
    for (let i = 2; i < 22; i += 2) {
      const u = i / 24;
      const x = cx - len + u * len * 2;
      const y = cy + Math.sin(t * 3 + u * 6) * h * 0.16 - th * 0.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - th * 0.9); ctx.stroke();
    }
    // head + eye
    const hx = cx + len, hy = cy + Math.sin(t * 3 + 6) * h * 0.16;
    ctx.fillStyle = cfg.top;
    ctx.beginPath(); ctx.ellipse(hx, hy, th * 1.25, th * 1.0, 0, 0, 7); ctx.fill();
    ctx.lineWidth = Math.max(1, w * 0.02); ctx.strokeStyle = cfg.outline;
    ctx.beginPath(); ctx.ellipse(hx, hy, th * 1.25, th * 1.0, 0, 0, 7); ctx.stroke();
    eye(cfg, hx + th * 0.4, hy - th * 0.15, th * 2);
    ctx.restore();
  }

  function drawRay(cfg, cx, cy, w, h, t) {
    const rx = w / 2, ry = h / 2.4;
    const flap = Math.sin(t * 3) * ry * 0.28;
    ctx.save();
    // wings
    ctx.fillStyle = cfg.mid;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - rx * 0.5, cy - ry * 1.6 - flap, cx - rx, cy - ry * 0.2 - flap);
    ctx.quadraticCurveTo(cx - rx * 0.6, cy + ry * 0.2, cx, cy + ry * 0.5);
    ctx.quadraticCurveTo(cx + rx * 0.6, cy + ry * 0.2, cx + rx, cy - ry * 0.2 - flap);
    ctx.quadraticCurveTo(cx + rx * 0.5, cy - ry * 1.6 - flap, cx, cy);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = cfg.top; ctx.fillRect(cx - rx, cy - ry * 3, rx * 2, ry * 2);
    ctx.fillStyle = cfg.belly; ctx.fillRect(cx - rx, cy + ry * 0.1, rx * 2, ry * 2);
    ctx.fillStyle = cfg.pat;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx * 0.55, cy + Math.sin(a) * ry * 0.5, Math.max(1, rx * 0.05), 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = Math.max(1, w * 0.025); ctx.strokeStyle = cfg.outline;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - rx * 0.5, cy - ry * 1.6 - flap, cx - rx, cy - ry * 0.2 - flap);
    ctx.quadraticCurveTo(cx - rx * 0.6, cy + ry * 0.2, cx, cy + ry * 0.5);
    ctx.quadraticCurveTo(cx + rx * 0.6, cy + ry * 0.2, cx + rx, cy - ry * 0.2 - flap);
    ctx.quadraticCurveTo(cx + rx * 0.5, cy - ry * 1.6 - flap, cx, cy);
    ctx.stroke();
    // tail whip
    ctx.strokeStyle = cfg.fin; ctx.lineWidth = Math.max(1.4, ry * 0.22);
    ctx.beginPath(); ctx.moveTo(cx, cy + ry * 0.45);
    ctx.quadraticCurveTo(cx + Math.sin(t * 3) * rx * 0.15, cy + ry * 2.2, cx + Math.sin(t * 3) * rx * 0.3, cy + ry * 3.0);
    ctx.stroke();
    // eyes
    eye(cfg, cx + rx * 0.42, cy - ry * 0.35, rx * 0.5);
    eye(cfg, cx + rx * 0.78, cy - ry * 0.25, rx * 0.5);
    ctx.restore();
  }

  function drawAncient(cfg, cx, cy, w, h, t) {
    const rx = w / 2, ry = h / 2;
    ctx.save();
    // multiple tail lobes
    ctx.fillStyle = cfg.fin;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.8, cy);
      ctx.lineTo(cx - rx - w * 0.15, cy + k * ry * 0.5 - ry * 0.6);
      ctx.lineTo(cx - rx - w * 0.06, cy + k * ry * 0.2);
      ctx.closePath(); ctx.fill();
    }
    // bulky body
    fishBodyPath(cx, cy, rx * 2, ry * 1.7); ctx.fillStyle = cfg.mid; ctx.fill();
    ctx.save();
    fishBodyPath(cx, cy, rx * 2, ry * 1.7); ctx.clip();
    ctx.fillStyle = cfg.top; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.95);
    ctx.fillStyle = cfg.belly; ctx.fillRect(cx - rx, cy + ry * 0.35, rx * 2, ry);
    // armor plates
    ctx.strokeStyle = cfg.outline; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx + i * rx * 0.27, cy, ry * 0.5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    // glowing runes
    const glow = 0.55 + 0.45 * Math.sin(t * 2.4);
    ctx.fillStyle = cfg.pat; ctx.globalAlpha = glow;
    const rp = [[-0.15, -0.2], [0.25, 0.1], [-0.5, 0.15], [0.55, -0.15], [0.05, 0.35]];
    for (const p of rp) {
      ctx.fillRect(cx + p[0] * rx - 1, cy + p[1] * ry - 1, 3, 3);
      ctx.fillRect(cx + p[0] * rx - 0.5, cy + p[1] * ry - 4, 1, 2);
      ctx.fillRect(cx + p[0] * rx - 0.5, cy + p[1] * ry + 2.5, 1, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // fins
    ctx.fillStyle = cfg.fin;
    for (let i = 0; i < 3; i++) {
      const fx = cx - rx * 0.1 + i * rx * 0.35;
      ctx.beginPath();
      ctx.moveTo(fx, cy - ry * 0.7);
      ctx.lineTo(fx + rx * 0.16, cy - ry * 1.5 - i * 2);
      ctx.lineTo(fx + rx * 0.34, cy - ry * 0.62);
      ctx.closePath(); ctx.fill();
    }
    // lobes near head
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.5, cy + ry * 0.3);
    ctx.lineTo(cx + rx * 1.0, cy + ry * 1.1);
    ctx.lineTo(cx + rx * 1.05, cy + ry * 0.1);
    ctx.closePath(); ctx.fill();
    // outline + head
    ctx.lineWidth = Math.max(1, w * 0.025); ctx.strokeStyle = cfg.outline;
    fishBodyPath(cx, cy, rx * 2, ry * 1.7); ctx.stroke();
    // head plate
    ctx.fillStyle = cfg.top;
    ctx.beginPath(); ctx.ellipse(cx + rx * 0.72, cy, rx * 0.42, ry * 0.72, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = cfg.outline; ctx.stroke();
    eye(cfg, cx + rx * 0.72, cy - ry * 0.2, rx * 0.6);
    ctx.restore();
  }

  function pickFish(rarity) {
    const list = BY_RARITY[rarity];
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---------------------------------------------------------------- sprites
  const ANGLER_PAL = {
    o: '#231710', H: '#e0ad4a', h: '#b9822f', B: '#7c4128',
    s: '#efb98a', S: '#c98d63', e: '#241610', a: '#5a3a22',
    c: '#cf6b3f', C: '#a44f2c', p: '#3d5f82', P: '#2b465f',
    b: '#4a3527', w: '#f3dca6'
  };
  // facing left, 14 wide x 23 tall
  const ANGLER = [
    '     ooooo    ',
    '    oHHHHHo   ',
    '   oHHHHHHHo  ',
    '  oHHHHHHHHHo ',
    ' ooHHHHHHHHoo ',
    'oHHHHHHHHHHHHo',
    'oohhhhhhhhhhoo',
    '  oossssssoo  ',
    '   osssssso   ',
    '   oessssso   ',
    '   oSssssso   ',
    '    oossoo    ',
    '  occcccccco  ',
    ' occcccccccco ',
    ' occcccccccco ',
    ' occcccccccpo ',
    ' ocpppppppppo ',
    ' oppppppppppo ',
    ' oppppppppppo ',
    ' oopppppppoo  ',
    '   obo  obo   ',
    '   obo  obo   ',
    '  obbo  obbo  '
  ];

  // ---------------------------------------------------------------- scene art
  const waterGrad = [];
  for (let y = 66; y < H; y++) {
    const t = (y - 66) / (H - 66);
    let col;
    if (t < 0.28) col = mix(C.waterFar, C.waterMid, t / 0.28);
    else if (t < 0.62) col = mix(C.waterMid, C.waterNear, (t - 0.28) / 0.34);
    else col = mix(C.waterNear, C.waterDeep, (t - 0.62) / 0.38);
    waterGrad.push(col);
  }
  function mix(a, b, t) {
    const ca = hex(a), cb = hex(b);
    return 'rgb(' + Math.round(lerp(ca[0], cb[0], t)) + ',' + Math.round(lerp(ca[1], cb[1], t)) + ',' + Math.round(lerp(ca[2], cb[2], t)) + ')';
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  // deterministic sparkles
  const SPARKS = [];
  for (let i = 0; i < 26; i++) {
    SPARKS.push({ x: (i * 73 % 320) + Math.random() * 20 - 10, y: 74 + (i * 37 % 100), p: Math.random() * 6.28, s: 0.5 + Math.random() });
  }
  const BIRDS = [{ x: 0, y: 30, s: 6 }, { x: -40, y: 22, s: 5 }, { x: -80, y: 38, s: 4 }];

  function drawSky(t) {
    // gradient
    const g = ctx.createLinearGradient(0, 0, 0, 74);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.55, C.skyMid);
    g.addColorStop(1, C.skyWarm);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 74);
    // sun
    const sx = 68, sy = 28;
    ctx.save();
    const gg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 22);
    gg.addColorStop(0, 'rgba(255,236,180,0.7)');
    gg.addColorStop(0.45, 'rgba(255,206,130,0.22)');
    gg.addColorStop(1, 'rgba(255,206,130,0)');
    ctx.fillStyle = gg; ctx.fillRect(sx - 24, sy - 24, 48, 48);
    ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,220,0.9)'; ctx.beginPath(); ctx.arc(sx + 2, sy - 1, 3.6, 0, 7); ctx.fill();
    ctx.restore();
    // clouds
    for (let i = 0; i < 4; i++) {
      const cw = 42 + i * 9;
      const cx = ((t * (2.2 + i * 0.6)) + i * 97) % (W + cw + 80) - cw - 40;
      const cy = 12 + i * 9;
      cloud(cx, cy, cw, 10 + (i % 2) * 3);
    }
    // birds
    for (const b of BIRDS) {
      const bx = ((t * b.s + b.x) % (W + 80) + W + 80) % (W + 80) - 40;
      bird(bx, b.y + Math.sin(t * 1.5 + b.x) * 2);
    }
  }

  function cloud(x, y, w, h) {
    ctx.fillStyle = 'rgba(255,250,240,0.92)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.6, w * 0.28, h * 0.6, 0, 0, 7);
    ctx.ellipse(x + w * 0.55, y + h * 0.4, w * 0.32, h * 0.75, 0, 0, 7);
    ctx.ellipse(x + w * 0.78, y + h * 0.6, w * 0.24, h * 0.55, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(216,196,178,0.6)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.6, y + h * 0.95, w * 0.42, h * 0.28, 0, 0, 7);
    ctx.fill();
  }
  function bird(x, y) {
    ctx.strokeStyle = 'rgba(40,50,60,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 2, y); ctx.lineTo(x, y - 1.4); ctx.lineTo(x + 2, y);
    ctx.stroke();
  }

  function drawDistantIsland() {
    ctx.fillStyle = C.hillFar;
    ctx.beginPath();
    ctx.moveTo(196, 68);
    ctx.lineTo(206, 56);
    ctx.lineTo(214, 62);
    ctx.lineTo(224, 50);
    ctx.lineTo(234, 62);
    ctx.lineTo(244, 57);
    ctx.lineTo(256, 68);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.hillMid;
    ctx.beginPath();
    ctx.moveTo(200, 68); ctx.lineTo(214, 58); ctx.lineTo(228, 66); ctx.lineTo(240, 61); ctx.lineTo(252, 68);
    ctx.closePath(); ctx.fill();
  }

  function drawWater(t) {
    for (let y = 66; y < H; y++) {
      ctx.fillStyle = waterGrad[y - 66];
      ctx.fillRect(0, y, W, 1);
    }

    // sun reflection column
    const colX = 68;
    for (let y = 68; y < 176; y += 2) {
      const a = 0.10 + 0.16 * Math.max(0, Math.sin(y * 0.35 + t * 2.2));
      const wob = Math.sin(y * 0.4 + t * 1.7) * (2 + (y - 68) * 0.12);
      ctx.fillStyle = 'rgba(255,232,175,' + a.toFixed(3) + ')';
      ctx.fillRect(colX + wob - 5, y, 10, 1);
    }
    // moving wave highlights
    for (let i = 0; i < 16; i++) {
      const y = 74 + i * 6.6;
      const speed = 6 + i * 0.5;
      const off = (t * speed + i * 41) % (W + 40) - 20;
      for (let k = 0; k < 3; k++) {
        const wx = off + k * 46 - 70;
        const wob = Math.sin(wx * 0.13 + t * 2 + i) * 3;
        ctx.fillStyle = 'rgba(210,245,245,' + (0.10 + 0.10 * Math.sin(i + t * 2)).toFixed(3) + ')';
        ctx.fillRect(wx + wob, y, 10 + k * 4, 1);
      }
    }
    // sparkles
    for (const s of SPARKS) {
      const b = Math.max(0, Math.sin(t * (1.4 + s.s) + s.p));
      if (b > 0.55) {
        const a = (b - 0.55) / 0.45;
        ctx.fillStyle = 'rgba(230,255,255,' + (a * 0.9).toFixed(3) + ')';
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 1, 1);
        ctx.fillRect(Math.round(s.x) + 1, Math.round(s.y), 1, 1);
        ctx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 1);
      }
    }
    // land is drawn last so water effects never spill onto the beach
    drawDistantIsland();
    drawIslandBase();
  }

  function drawIslandBase() {
    // curve of land on the right that meets the water
    ctx.fillStyle = C.sand;
    ctx.beginPath();
    ctx.moveTo(320, 92);
    ctx.lineTo(320, 180);
    ctx.lineTo(250, 180);
    ctx.quadraticCurveTo(258, 150, 274, 132);
    ctx.quadraticCurveTo(292, 112, 320, 92);
    ctx.closePath();
    ctx.fill();
    // shaded sand near water
    ctx.fillStyle = C.sandShade;
    ctx.beginPath();
    ctx.moveTo(258, 180);
    ctx.quadraticCurveTo(266, 150, 282, 133);
    ctx.quadraticCurveTo(298, 116, 320, 100);
    ctx.lineTo(320, 108);
    ctx.quadraticCurveTo(300, 124, 288, 140);
    ctx.quadraticCurveTo(274, 158, 268, 180);
    ctx.closePath();
    ctx.fill();
    // grass top on land
    ctx.fillStyle = C.grassDark;
    ctx.beginPath();
    ctx.moveTo(282, 130);
    ctx.quadraticCurveTo(300, 110, 320, 96);
    ctx.lineTo(320, 92);
    ctx.quadraticCurveTo(300, 108, 286, 126);
    ctx.closePath();
    ctx.fill();
    // foam edge
    ctx.fillStyle = C.foam;
    for (let i = 0; i < 26; i++) {
      const u = i / 25;
      const x = lerp(254, 318, u);
      const y = 178 - Math.pow(u, 0.7) * 80 + Math.sin(i * 1.7) * 1.2;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
  }

  function drawPalm(x, baseY, h, t) {
    const sway = Math.sin(t * 1.1) * 2.2;
    const segs = 14;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const y = baseY - u * h;
      const xo = sway * Math.pow(u, 1.6) + Math.sin(u * 3) * 1.5;
      const wdt = 4 - u * 1.6;
      rect(x + xo - wdt / 2, y, wdt, 2, i % 2 ? C.trunk : C.trunkDark);
    }
    const topX = x + sway, topY = baseY - h;
    // fronds
    const fronds = [[-1, -0.35], [-0.75, -0.9], [-0.2, -1.1], [0.45, -1.0], [0.9, -0.6], [1.05, -0.15], [-1.05, 0.1]];
    for (let f = 0; f < fronds.length; f++) {
      const dx = fronds[f][0], dy = fronds[f][1];
      const len = 14 + (f % 3) * 4;
      for (let i = 1; i <= len; i++) {
        const u = i / len;
        const lx = topX + dx * i + Math.sin(t * 1.4 + f) * 1.2 * u;
        const ly = topY + dy * i + (1 - u) * -4 + u * u * 6;
        const col = u < 0.5 ? C.leaf : C.leafLight;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(lx), Math.round(ly), 1, 2);
        ctx.fillStyle = C.leafDark;
        ctx.fillRect(Math.round(lx), Math.round(ly) + 2, 1, 1);
      }
    }
    // coconuts
    ctx.fillStyle = C.trunkDark;
    ctx.beginPath(); ctx.arc(topX - 1, topY + 3, 1.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(topX + 2, topY + 4, 1.4, 0, 7); ctx.fill();
  }

  function drawBush(x, y, w, h, t) {
    const sway = Math.sin(t * 1.6 + x) * 0.8;
    ctx.fillStyle = C.leafDark;
    ctx.beginPath(); ctx.ellipse(x + sway, y, w * 0.6, h * 0.75, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.leaf;
    ctx.beginPath(); ctx.ellipse(x - w * 0.25 + sway, y - h * 0.15, w * 0.42, h * 0.55, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.28 + sway, y - h * 0.05, w * 0.4, h * 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.leafLight;
    ctx.beginPath(); ctx.ellipse(x - w * 0.1 + sway, y - h * 0.4, w * 0.3, h * 0.35, 0, 0, 7); ctx.fill();
    // berries/flowers
    ctx.fillStyle = '#f2b0c0';
    for (let i = 0; i < 3; i++) px(x - 3 + i * 3 + sway, y - h * 0.55 + (i % 2) * 3, '#f2b0c0');
  }

  function drawReeds(x, baseY, count, t) {
    for (let i = 0; i < count; i++) {
      const rx = x + i * 3 + Math.sin(t * 1.2 + i) * 0.6;
      const hh = 12 + (i % 4) * 4;
      for (let y = 0; y < hh; y++) {
        const xo = Math.sin(t * 1.5 + i * 0.7 + y * 0.18) * (y / hh) * 1.6;
        ctx.fillStyle = y > hh - 4 ? '#8fae4a' : (y % 2 ? '#5f8a3a' : '#4f7a30');
        ctx.fillRect(Math.round(rx + xo), Math.round(baseY - y), 1, 1);
      }
    }
  }

  function drawFlowers(x, y) {
    const cols = ['#f2d24a', '#f28a9a', '#e8e0f0'];
    for (let i = 0; i < 5; i++) {
      const fx = x + i * 3, fy = y - (i % 2) * 2;
      px(fx, fy, '#4f7a30');
      px(fx, fy - 1, cols[i % 3]);
    }
  }

  function drawRock(x, y, w, h) {
    ctx.fillStyle = C.rockDark;
    ctx.beginPath(); ctx.ellipse(x, y + 1, w / 2, h / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.rock;
    ctx.beginPath(); ctx.ellipse(x, y, w / 2 - 0.5, h / 2 - 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.rockLight;
    ctx.beginPath(); ctx.ellipse(x - w * 0.12, y - h * 0.15, w * 0.22, h * 0.22, 0, 0, 7); ctx.fill();
  }

  function drawLily(x, y, t) {
    const b = Math.sin(t * 1.4 + x) * 0.5;
    ctx.fillStyle = '#3f7a3a';
    ctx.beginPath(); ctx.ellipse(x, y + b, 4.5, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5f9a48';
    ctx.beginPath(); ctx.ellipse(x - 0.5, y - 0.5 + b, 3.6, 2.3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(40,90,110,0.55)';
    ctx.beginPath(); ctx.moveTo(x, y + b); ctx.lineTo(x + 4.5, y - 1.6 + b); ctx.lineTo(x + 4.5, y + 1.6 + b); ctx.closePath(); ctx.fill();
  }

  function drawGull(x, y, t) {
    const bob = Math.sin(t * 1.2) * 0.3;
    const yy = y + bob;
    ctx.fillStyle = '#f4f6f2';
    ctx.beginPath(); ctx.ellipse(x, yy, 4.2, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c8d2d6';
    ctx.beginPath(); ctx.ellipse(x - 0.6, yy - 0.2, 3.2, 1.9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8fa0a8';
    ctx.beginPath(); ctx.ellipse(x - 1.6, yy - 0.4, 1.6, 1.1, 0, 0, 7); ctx.fill();
    const hx = x + 3.4, hy = yy - 3.2 + (Math.sin(t * 0.9) > 0.7 ? 1 : 0);
    ctx.fillStyle = '#f7f9f6';
    ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, 7); ctx.fill();
    px(hx + 1, hy - 0.5, '#241810');
    ctx.fillStyle = '#e8a33a';
    ctx.beginPath(); ctx.moveTo(hx + 1.6, hy + 0.1); ctx.lineTo(hx + 4.2, hy + 0.7); ctx.lineTo(hx + 1.6, hy + 1.1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8a33a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 1, yy + 2); ctx.lineTo(x + 1, yy + 3.6); ctx.moveTo(x - 1, yy + 2); ctx.lineTo(x - 1, yy + 3.6); ctx.stroke();
  }

  function drawCrab(x, y, t) {
    const step = Math.sin(t * 4) > 0 ? 1 : 0;
    ctx.fillStyle = '#c9432f';
    ctx.beginPath(); ctx.ellipse(x, y, 4, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e06a4a';
    ctx.beginPath(); ctx.ellipse(x, y - 0.5, 3.2, 1.8, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a83222'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * 2, y + 1.6); ctx.lineTo(x + i * 2 - 1.5, y + 3.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + i * 2, y + 1.6); ctx.lineTo(x + i * 2 + 1.5, y + 3.4); ctx.stroke();
    }
    const lift = Math.sin(t * 1.5) * 0.8;
    ctx.fillStyle = '#e06a4a';
    ctx.beginPath(); ctx.arc(x - 4.4, y - 1.6 + lift, 1.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4.4, y - 1.6 - lift, 1.8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a83222'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 4, y - 1 + lift); ctx.lineTo(x - 2, y + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y - 1 - lift); ctx.lineTo(x + 2, y + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 1.4, y - 2); ctx.lineTo(x - 1.8, y - 4); ctx.moveTo(x + 1.4, y - 2); ctx.lineTo(x + 1.8, y - 4); ctx.stroke();
    px(x - 2, y - 4, '#241810'); px(x + 2, y - 4, '#241810');
  }

  function drawBoat(x, y, t) {
    const bob = Math.sin(t * 0.8) * 0.6;
    const yy = y + bob;
    ctx.fillStyle = '#f4efe2';
    ctx.beginPath(); ctx.moveTo(x, yy - 9); ctx.lineTo(x + 6, yy - 1); ctx.lineTo(x, yy - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8cdb8';
    ctx.beginPath(); ctx.moveTo(x, yy - 9); ctx.lineTo(x - 4, yy - 1); ctx.lineTo(x, yy - 1); ctx.closePath(); ctx.fill();
    rect(x, yy - 9, 1, 9, '#5a3a20');
    ctx.fillStyle = '#6a4a2a';
    ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x + 6, yy); ctx.lineTo(x + 4, yy + 2.4); ctx.lineTo(x - 4, yy + 2.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,40,50,0.25)';
    ctx.fillRect(x - 4, yy + 3, 8, 1);
  }

  function drawGrassTuft(x, y, t) {
    for (let i = -1; i <= 1; i++) {
      const gx = x + i * 1.6;
      const lean = Math.sin(t * 1.8 + i + x) * 0.8;
      ctx.strokeStyle = i === 0 ? C.grassLight : C.grass;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + lean, y - 3 - Math.abs(i)); ctx.stroke();
    }
  }

  function drawDock(t) {
    // posts into the water
    const posts = [126, 158, 190, 222, 250];
    for (const pxX of posts) {
      rect(pxX - 1, 120, 4, 30, C.woodShadow);
      rect(pxX, 120, 2, 30, C.woodDark);
      rect(pxX, 120, 1, 30, C.wood);
      // ripple
      ctx.strokeStyle = 'rgba(230,255,255,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(pxX + 0.5, 138 + Math.sin(t * 2 + pxX) * 0.6, 6, 1.6, 0, 0, 7); ctx.stroke();
    }
    // deck
    rect(118, 112, 142, 12, C.woodDark);
    for (let i = 0; i < 13; i++) {
      const bx = 120 + i * 11;
      rect(bx, 113, 9, 10, C.wood);
      rect(bx, 113, 9, 2, C.woodLight);
      rect(bx, 121, 9, 2, C.woodDark);
    }
    rect(118, 112, 142, 1, C.woodLight);
    rect(118, 124, 142, 2, '#4a2f1a');
    // little bucket + lantern
    rect(232, 102, 7, 9, '#6a6f78');
    rect(232, 102, 7, 2, '#9aa1a8');
    rect(231, 101, 9, 2, '#4a4f57');
    ctx.strokeStyle = '#4a4f57'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(235.5, 101, 3.4, Math.PI, Math.PI * 2); ctx.stroke();
    // lantern glow
    rect(126, 101, 4, 7, '#5a4a2a');
    ctx.fillStyle = 'rgba(255,210,120,0.35)';
    ctx.beginPath(); ctx.arc(128, 104, 6 + Math.sin(t * 3) * 0.6, 0, 7); ctx.fill();
    rect(127, 103, 2, 3, '#ffd98a');
  }

  function drawAngler(t, phase, phaseT) {
    const bob = Math.sin(t * 1.8) * 0.4;
    let lean = 0, x = 168;
    if (phase === 'bite') lean = Math.sin(phaseT * 0.02) * 0.6;
    if (phase === 'reeling') lean = -2 - Math.sin(phaseT * 0.02) * 1;
    x += Math.round(lean);
    const y = 91 + Math.round(bob);
    // shadow
    ctx.fillStyle = 'rgba(20,40,50,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 5, 114, 8, 2.4, 0, 0, 7); ctx.fill();
    spr(ANGLER, x, y, ANGLER_PAL);
    return { x: x + 5, y: y + 12 }; // hand/rod grip
  }

  // ---------------------------------------------------------------- line + bobber
  let bobber = { x: 96, y: 112 };
  const BOB_TARGET = { x: 96, y: 112 };
  const ROD_TIP = { x: 150, y: 84 };

  function qbez(p0, p1, p2, t) {
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
  }
  function drawLine(a, ctrl, b, style) {
    ctx.fillStyle = style;
    for (let i = 0; i <= 200; i++) {
      const p = qbez(a, ctrl, b, i / 200);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }
  function drawBobber(x, y, dip) {
    const bob = Math.sin(performance.now() / 400) * 0.5;
    const yy = y + dip + bob;
    // ripple rings
    ctx.strokeStyle = 'rgba(230,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 3, 5 + Math.sin(performance.now() / 300) * 1, 1.6, 0, 0, 7); ctx.stroke();
    // body
    rect(x - 1, yy - 3, 3, 6, '#e8e8ee');
    rect(x - 1, yy - 3, 3, 2, '#d9422f');
    rect(x - 1, yy + 1, 3, 2, '#c9352a');
    px(x - 1, yy - 3, '#ffffff');
    rect(x, yy - 5, 1, 2, '#f0f0f0');
  }

  // ---------------------------------------------------------------- reveal effects
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawReveal(t, tier, fish) {
    const col = RARITY_COLOR[tier];
    const card = { x: 66, y: 30, w: 188, h: 122 };
    const cx = card.x + card.w / 2, cy = 84;
    const appear = clamp((t - 0) / 260, 0, 1);
    // backdrop dim
    ctx.fillStyle = 'rgba(6,12,16,' + (0.55 * appear).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);

    // tier-specific backdrop
    const r = RARITY_ORDER.indexOf(tier);
    if (tier === 'Epic' || tier === 'Legendary') {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.0006);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = tier === 'Legendary' ? 'rgba(255,204,77,0.28)' : 'rgba(199,125,255,0.24)';
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const a = i * Math.PI / 8;
        ctx.lineTo(Math.cos(a) * 200, Math.sin(a) * 200);
        ctx.lineTo(Math.cos(a + 0.09) * 200, Math.sin(a + 0.09) * 200);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    } else if (tier === 'Ancient') {
      // deep rotating rune ring + motes
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(111,255,240,0.5)'; ctx.lineWidth = 1;
      for (let ring = 0; ring < 2; ring++) {
        const rr = 60 + ring * 14;
        ctx.save(); ctx.rotate((ring % 2 ? -1 : 1) * t * 0.0004);
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
          const a = i / 24 * Math.PI * 2;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.62;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.62;
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        ctx.restore();
      }
      ctx.restore();
      const pulse = 0.35 + 0.25 * Math.sin(t * 0.004);
      ctx.fillStyle = 'rgba(60,40,120,' + pulse.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      // motes
      for (let i = 0; i < 22; i++) {
        const mx = (i * 97 + t * (0.02 + (i % 5) * 0.006)) % W;
        const my = 20 + ((i * 53) % 150) + Math.sin(t * 0.002 + i) * 4;
        ctx.fillStyle = 'rgba(150,255,240,' + (0.3 + 0.3 * Math.sin(t * 0.003 + i)).toFixed(3) + ')';
        ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
    }

    // card panel
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate(cx, cy);
    const sc = 0.85 + 0.15 * ease(appear);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = 'rgba(14,24,30,0.94)';
    roundRect(ctx, card.x, card.y, card.w, card.h, 5); ctx.fill();
    // frame (double for ancient, thick for legendary)
    const frameW = tier === 'Ancient' ? 2 : (tier === 'Legendary' ? 2 : 1.5);
    ctx.lineWidth = frameW;
    ctx.strokeStyle = col;
    if (tier === 'Ancient') { ctx.globalAlpha = appear * (0.6 + 0.4 * Math.sin(t * 0.005)); }
    roundRect(ctx, card.x + 0.5, card.y + 0.5, card.w - 1, card.h - 1, 5); ctx.stroke();
    ctx.globalAlpha = appear;
    if (tier === 'Ancient' || tier === 'Legendary') {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      roundRect(ctx, card.x + 3.5, card.y + 3.5, card.w - 7, card.h - 7, 4); ctx.stroke();
    }

    // inner glow / scanlines by tier
    if (tier === 'Rare' || tier === 'Epic' || tier === 'Legendary' || tier === 'Ancient') {
      const gr = ctx.createRadialGradient(cx, cy, 5, cx, cy, 90);
      gr.addColorStop(0, hexA(col, 0.20));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      roundRect(ctx, card.x + 2, card.y + 2, card.w - 4, card.h - 4, 4); ctx.fill();
    }

    // ---- fish ----
    const baseW = tier === 'Ancient' ? 168 : tier === 'Legendary' ? 158 : 140;
    let fw = baseW, fh = baseW * 0.56;
    if (fish.cfg.shape === 'eel') fw = baseW * 0.95;
    if (fish.cfg.shape === 'pike') fw = baseW * 1.05;
    const fy = 84 + Math.sin(t * 0.002) * 1.5;

    // tier sparkles / particles behind fish
    drawTierParticles(t, tier, cx, cy);

    // shadow under fish
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, fy + fh * 0.55, fw * 0.34, 4, 0, 0, 7); ctx.fill();

    // glow behind (rare+)
    if (RARITY_ORDER.indexOf(tier) >= 2) {
      const glowA = 0.25 + 0.15 * Math.sin(t * 0.004);
      const gr2 = ctx.createRadialGradient(cx, fy, 4, cx, fy, fw * 0.55);
      gr2.addColorStop(0, hexA(col, glowA));
      gr2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr2;
      ctx.fillRect(0, 0, W, H);
    }

    drawFish(fish.cfg, cx, fy, fw, fh, t * 0.001);

    // legendary crown
    if (tier === 'Legendary') {
      ctx.fillStyle = '#ffd54d';
      const kx = cx - 10;
      ctx.beginPath();
      ctx.moveTo(kx, fy - fh * 0.85);
      ctx.lineTo(kx - 4, fy - fh * 0.85 - 7);
      ctx.lineTo(kx - 1, fy - fh * 0.85 - 2);
      ctx.lineTo(kx + 1, fy - fh * 0.85 - 9);
      ctx.lineTo(kx + 3, fy - fh * 0.85 - 2);
      ctx.lineTo(kx + 6, fy - fh * 0.85 - 7);
      ctx.lineTo(kx + 6, fy - fh * 0.85);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawTierParticles(t, tier, cx, cy) {
    const col = RARITY_COLOR[tier];
    const n = { Common: 0, Uncommon: 5, Rare: 8, Epic: 12, Legendary: 16, Ancient: 18 }[tier] || 0;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * 0.0008 * (1 + (i % 3));
      const rr = 42 + (i % 4) * 10;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.62;
      const b = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.003 + i));
      ctx.fillStyle = hexA(col, b);
      const s = i % 3 === 0 ? 2 : 1;
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }

  function hexA(hex, a) {
    const c = hexColor(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  }
  function hexColor(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  // ---------------------------------------------------------------- game state
  const catches = []; // newest first
  let phase = 'ready';
  let phaseStart = 0;
  let T = 0;
  let last = 0;
  let waitDur = 0;
  let landed = false;
  let pending = null;     // {fish, rarity}
  let missFlash = 0;
  let introUntil = 4200;  // show instruction banner early
  let castFrom = { x: 150, y: 84 };

  const BITE_WINDOW = 1500;

  function beginCast() {
    phase = 'waiting';
    phaseStart = T;
    landed = false;
    waitDur = rnd(2300, 4200);
    bobber.x = BOB_TARGET.x; bobber.y = BOB_TARGET.y;
  }

  function beginBite() {
    phase = 'bite';
    phaseStart = T;
  }

  function resolveCatch() {
    const rarity = window.fishing.pickRarity(Math.random());
    const fish = pickFish(rarity);
    pending = { fish: fish, rarity: rarity };
    catches.unshift({ name: fish.name, rarity: rarity });
    phase = 'reeling';
    phaseStart = T;
  }

  function miss() {
    phase = 'ready';
    phaseStart = T;
    missFlash = 900;
    // recompute nothing else
  }

  function toReady() {
    phase = 'ready';
    phaseStart = T;
    pending = null;
  }

  // ---------------------------------------------------------------- scene composition
  function pad(num, len) { let s = '' + num; while (s.length < len) s = '0' + s; return s; }

  function drawScene() {
    drawSky(T * 0.001);
    drawWater(T * 0.001);

    // far vegetation on land
    drawPalm(292, 158, 84, T * 0.001);
    drawBush(304, 152, 34, 22, T * 0.001);
    drawBush(276, 148, 24, 16, T * 0.001);
    drawFlowers(296, 168);
    drawFlowers(310, 174);
    drawRock(264, 168, 14, 8);
    drawRock(312, 162, 10, 6);

    // dock first (behind angler), then reeds at edges
    drawDock(T * 0.001);
    drawGull(251, 109, T * 0.001);
    drawCrab(300, 171, T * 0.001);
    drawLily(30, 158, T * 0.001);
    drawLily(48, 166, T * 0.001);
    drawLily(18, 148, T * 0.001);
    drawLily(62, 155, T * 0.001);
    drawBoat(178, 66, T * 0.001);
    for (let i = 0; i < 7; i++) drawGrassTuft(282 + i * 5, 138 + (i % 3) * 3, T * 0.001);
    drawReeds(246, 136, 7, T * 0.001);
    drawReeds(118, 138, 4, T * 0.001);

    // angler
    const hand = drawAngler(T * 0.001, phase, T - phaseStart);
    const rodX = 150, rodY = 82;

    // rod (from hand toward upper-left)
    const tip = { x: rodX - 7, y: rodY };
    ctx.strokeStyle = C.trunkDark; ctx.lineWidth = 1;
    ctx.beginPath();
    let bend = 0;
    if (phase === 'reeling') bend = -3 * clamp((T - phaseStart) / 500, 0, 1);
    ctx.moveTo(hand.x, hand.y - 2);
    ctx.quadraticCurveTo(hand.x - 14, hand.y - 12 + bend, tip.x, tip.y);
    ctx.stroke();
    // rod tip
    px(tip.x, tip.y, '#d8c090');

    // line + bobber
    if (phase === 'waiting') {
      const p = clamp((T - phaseStart) / 460, 0, 1);
      const ctrl = { x: lerp(tip.x - 6, 56, p), y: lerp(tip.y - 10, 30, ease(p)) };
      const pos = qbez(tip, ctrl, BOB_TARGET, ease(p));
      drawLine(tip, ctrl, pos, 'rgba(240,250,255,0.8)');
      if (p < 1) drawBobber(pos.x, pos.y, 0);
      else { landed = true; drawBobber(bobber.x, bobber.y, Math.sin(T * 0.002) * 0.4); }
      if (p >= 1 && T - phaseStart > 460 + waitDur) { beginBite(); }
    } else if (phase === 'bite') {
      const el = T - phaseStart;
      const dip = 3 + Math.sin(el * 0.02) * 3;
      drawLine(tip, { x: 74, y: 58 }, { x: bobber.x, y: bobber.y + dip }, 'rgba(240,250,255,0.85)');
      drawBobber(bobber.x, bobber.y, dip);
      drawBiteIndicator(bobber.x, bobber.y, el);
      if (el > BITE_WINDOW) { miss(); }
    } else if (phase === 'reeling') {
      const el = T - phaseStart;
      const p = clamp(el / 1200, 0, 1);
      const ctrl = { x: lerp(74, tip.x - 8, p), y: lerp(48, tip.y - 12, ease(p)) };
      // fish flying in
      const fp = qbez({ x: bobber.x, y: bobber.y + 4 }, { x: 96, y: 40 }, { x: hand.x + 4, y: hand.y + 2 }, ease(p));
      drawLine(tip, ctrl, fp, 'rgba(240,250,255,0.9)');
      if (pending) {
        ctx.save();
        // simple spinning silhouette during reel
        drawFish(pending.fish.cfg, fp.x, fp.y - Math.sin(p * Math.PI) * 14 - 2, 22, 12, T * 0.006);
        ctx.restore();
      }
      drawSplash(bobber.x, bobber.y + 2, el);
      if (p >= 1) { phase = 'reveal'; phaseStart = T; }
    } else if (phase === 'ready' || phase === 'reveal') {
      drawLine(tip, { x: tip.x + 2, y: tip.y + 7 }, { x: tip.x + 3, y: tip.y + 12 }, 'rgba(240,250,255,0.75)');
      // small hanging hook
      px(tip.x + 3, tip.y + 12, '#e8e8ee');
    }

    // foreground reeds / rocks for depth
    drawRock(12, 176, 26, 10);
    drawReeds(4, 180, 8, T * 0.001);
    drawReeds(40, 180, 6, T * 0.001);

    // bite screen edge glow
    if (phase === 'bite') {
      const a = 0.12 + 0.10 * Math.sin(T * 0.02);
      const g = ctx.createRadialGradient(160, 100, 60, 160, 100, 190);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(255,240,170,' + a.toFixed(3) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // miss flash
    if (missFlash > 0) {
      missFlash -= 16;
      ctx.fillStyle = 'rgba(255,255,255,' + clamp(missFlash / 3000, 0, 0.18).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // reveal on top
    if (phase === 'reveal' && pending) {
      drawReveal(T - phaseStart, pending.rarity, pending.fish);
    }
  }

  function drawBiteIndicator(x, y, el) {
    const pulse = Math.sin(el * 0.02);
    // exclamation bubble
    const bx = x, by = y - 16 + pulse;
    ctx.fillStyle = 'rgba(20,20,30,0.75)';
    ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe066';
    rect(bx - 1, by - 4, 2, 5, '#ffe066');
    rect(bx - 1, by + 2, 2, 2, '#ffe066');
    // expanding ring
    const ringT = (el % 700) / 700;
    ctx.strokeStyle = 'rgba(255,240,150,' + (1 - ringT).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 2, 4 + ringT * 16, 2 + ringT * 7, 0, 0, 7); ctx.stroke();
    // window bar
    const frac = clamp(1 - el / BITE_WINDOW, 0, 1);
    const bw = 40;
    rect(bx - bw / 2 - 1, by - 12, bw + 2, 4, 'rgba(0,0,0,0.6)');
    rect(bx - bw / 2, by - 11, bw * frac, 2, '#ffe066');
  }

  function drawSplash(x, y, el) {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const d = (el % 400) / 400 * 12;
      ctx.fillStyle = 'rgba(230,250,255,' + (1 - d / 12).toFixed(3) + ')';
      ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.6), 1, 1);
    }
    ctx.strokeStyle = 'rgba(230,255,255,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const rr = ((el % 600) / 600 + k * 0.5) % 1;
      ctx.beginPath(); ctx.ellipse(x, y, 4 + rr * 18, 2 + rr * 8, 0, 0, 7); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- UI overlay
  function uiText(str, x, y, o) {
    o = o || {};
    uctx.save();
    uctx.font = (o.weight || 700) + ' ' + (o.size || 18) + 'px ui-monospace, Menlo, Consolas, monospace';
    uctx.textAlign = o.align || 'left';
    uctx.textBaseline = o.baseline || 'alphabetic';
    if (o.shadow) { uctx.fillStyle = 'rgba(0,0,0,0.75)'; uctx.fillText(str, x + 2, y + 2); }
    uctx.fillStyle = o.color || C.ui;
    if (o.glow) { uctx.shadowColor = o.glow; uctx.shadowBlur = 14; }
    uctx.fillText(str, x, y);
    uctx.restore();
  }
  function panel(x, y, w, h) {
    uctx.save();
    roundRect(uctx, x, y, w, h, 10);
    uctx.fillStyle = C.uiPanel; uctx.fill();
    uctx.lineWidth = 2;
    uctx.strokeStyle = C.uiLine; uctx.stroke();
    uctx.restore();
  }

  function drawUI() {
    // ---------- instruction / status ----------
    if (T < introUntil) {
      panel(340, 14, 600, 56);
      uiText('TIDEPOOL COVE', 640, 38, { size: 20, align: 'center', color: '#ffe9b0', shadow: true });
      uiText('Press SPACE or tap CAST · when the bobber dips, press again to reel!', 640, 60, { size: 15, align: 'center', color: C.uiDim, shadow: true });
    } else {
      // compact status chip
      const hint = phaseHint();
      panel(16, 14, 300, 38);
      uiText(hint, 26, 40, { size: 15, color: hintColor(), shadow: true });
    }

    // ---------- button ----------
    const btn = getButton();
    uctx.save();
    const pressed = btn.active && (Math.floor(T / 160) % 2 === 0);
    roundRect(uctx, btn.x, btn.y, btn.w, btn.h, 12);
    const grad = uctx.createLinearGradient(0, btn.y, 0, btn.y + btn.h);
    if (btn.enabled) { grad.addColorStop(0, pressed ? '#ffe9a8' : '#f6c65a'); grad.addColorStop(1, pressed ? '#e0ad3a' : '#c98f2a'); }
    else { grad.addColorStop(0, '#4a5a60'); grad.addColorStop(1, '#33444a'); }
    uctx.fillStyle = grad; uctx.fill();
    uctx.lineWidth = 3; uctx.strokeStyle = btn.enabled ? '#fff3cf' : '#5f7078'; uctx.stroke();
    uctx.restore();
    uiText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 8, {
      size: 24, align: 'center', color: btn.enabled ? '#3a2208' : '#93a5aa', shadow: false
    });

    // ---------- log ----------
    const lw = 340, lh = 196, lx = 16, ly = 720 - 16 - lh;
    panel(lx, ly, lw, lh);
    uiText('CATCH LOG', lx + 16, ly + 28, { size: 15, color: '#ffe9b0', shadow: true });
    uiText('newest first', lx + lw - 16, ly + 28, { size: 12, align: 'right', color: C.uiDim });
    if (catches.length === 0) {
      uiText('No catches yet — cast a line!', lx + 16, ly + 58, { size: 14, color: C.uiDim });
    } else {
      for (let i = 0; i < Math.min(8, catches.length); i++) {
        const e = catches[i];
        const yy = ly + 54 + i * 17;
        uiText('#' + (i + 1), lx + 14, yy, { size: 13, color: C.uiDim });
        uiText(e.name, lx + 44, yy, { size: 14, color: RARITY_COLOR[e.rarity], shadow: true });
        uiText(e.rarity, lx + lw - 14, yy, { size: 13, align: 'right', color: RARITY_COLOR[e.rarity] });
      }
    }

    // ---------- legend ----------
    const gw = 300, gh = 196, gx = 1280 - 16 - gw, gy = 720 - 16 - gh;
    panel(gx, gy, gw, gh);
    uiText('RARITY ODDS', gx + 16, gy + 28, { size: 15, color: '#ffe9b0', shadow: true });
    for (let i = 0; i < RARITY_ORDER.length; i++) {
      const r = RARITY_ORDER[i];
      const yy = gy + 58 + i * 22;
      uctx.fillStyle = RARITY_COLOR[r];
      uctx.beginPath(); uctx.arc(gx + 22, yy - 4, 5, 0, 7); uctx.fill();
      uctx.strokeStyle = 'rgba(255,255,255,0.4)'; uctx.lineWidth = 1; uctx.stroke();
      uiText(r, gx + 38, yy, { size: 15, color: RARITY_COLOR[r], shadow: true });
      uiText(oddsLabel(r), gx + gw - 16, yy, { size: 15, align: 'right', color: C.ui });
    }
  }

  const ODDS = { Common: 45, Uncommon: 25, Rare: 15, Epic: 8, Legendary: 5, Ancient: 2 };
  function oddsLabel(r) { return ODDS[r] + '%'; }

  function phaseHint() {
    switch (phase) {
      case 'ready': return missFlash > 0 ? 'MISSED! The fish got away. Cast again.' : 'Ready — cast your line.';
      case 'waiting': return 'Waiting for a bite…';
      case 'bite': return 'BITE! Reel it in now!';
      case 'reeling': return 'Reeling in…';
      case 'reveal': return 'Caught! Press to continue.';
    }
    return '';
  }
  function hintColor() {
    if (phase === 'bite') return '#ffe066';
    if (phase === 'reveal') return '#b8f0d0';
    if (missFlash > 0) return '#ff9a8a';
    return C.ui;
  }

  function getButton() {
    const x = 1280 / 2 - 95, y = 720 - 16 - 62, w = 190, h = 62;
    let label = 'CAST', enabled = false, active = false;
    if (phase === 'ready') { label = 'CAST'; enabled = true; }
    else if (phase === 'waiting') { label = 'WAIT…'; enabled = false; }
    else if (phase === 'bite') { label = 'REEL!'; enabled = true; active = true; }
    else if (phase === 'reeling') { label = '…'; enabled = false; }
    else if (phase === 'reveal') { label = 'NEXT'; enabled = true; }
    return { x, y, w, h, label, enabled, active };
  }

  // clicks on the button
  function pointInButton(cx, cy) {
    const b = getButton();
    return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
  }

  // ---------------------------------------------------------------- input
  function action() {
    if (phase === 'ready') {
      introUntil = Math.min(introUntil, T); // dismiss the intro banner once play begins
      beginCast();
    } else if (phase === 'bite') {
      resolveCatch();
    } else if (phase === 'reveal') {
      if (T - phaseStart > 420) toReady();
    }
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      action();
    }
  }, { passive: false });

  ui.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    const r = ui.getBoundingClientRect();
    const cx = (e.clientX - r.left) / (r.width / 1280);
    const cy = (e.clientY - r.top) / (r.height / 720);
    if (pointInButton(cx, cy)) action();
    else action(); // tapping anywhere is forgiving too
  });
  ui.addEventListener('pointermove', function (e) {
    const r = ui.getBoundingClientRect();
    const cx = (e.clientX - r.left) / (r.width / 1280);
    const cy = (e.clientY - r.top) / (r.height / 720);
    ui.className = pointInButton(cx, cy) ? 'hand' : '';
  });
  ui.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------- test interface
  const RARITY_BOUNDS = [
    ['Common', 0.45], ['Uncommon', 0.25], ['Rare', 0.15],
    ['Epic', 0.08], ['Legendary', 0.05], ['Ancient', 0.02]
  ];
  window.fishing = {
    get state() { return phase; },
    pickRarity: function (u) {
      let acc = 0;
      for (let i = 0; i < RARITY_BOUNDS.length; i++) {
        acc += RARITY_BOUNDS[i][1];
        if (u < acc) return RARITY_BOUNDS[i][0];
      }
      return 'Ancient';
    },
    log: catches
  };

  // ---------------------------------------------------------------- loop
  function update() {
    if (phase === 'reveal' && T - phaseStart > 2900) toReady();
  }

  function frameLoop(ts) {
    if (!last) last = ts;
    let dt = ts - last;
    last = ts;
    if (document.hidden) dt = 0;
    if (dt > 50) dt = 50; // clamp (also covers tab-return jumps)
    T += dt;

    update();
    drawScene();
    drawUI();

    requestAnimationFrame(frameLoop);
  }
  document.addEventListener('visibilitychange', function () { last = performance.now(); });
  requestAnimationFrame(frameLoop);
})();
