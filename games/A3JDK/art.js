// art.js — Every pixel of artwork in this game is generated here, in code.
// No image files, fonts, icon sets, or external assets are used.
(function (global) {
  'use strict';

  // ============================================================
  // Pixel grid helpers
  // ============================================================
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function grid(w, h) { const g = []; for (let y = 0; y < h; y++) { const r = []; for (let x = 0; x < w; x++) r.push(null); g.push(r); } return g; }
  function set(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; }
  function ell(g, cx, cy, rx, ry, c) {
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0001) set(g, x, y, c);
      }
  }
  function tri(g, ax, ay, bx, by, cx, cy, c) {
    const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (den === 0) return;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den;
      const w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den;
      const w3 = 1 - w1 - w2;
      if (w1 >= -0.03 && w2 >= -0.03 && w3 >= -0.03) set(g, x, y, c);
    }
  }
  function line(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    while (true) { set(g, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function outline(g, c) {
    const h = g.length, w = g[0].length, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x]) continue; let n = false;
      for (let dy = -1; dy <= 1 && !n; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && g[yy][xx]) { n = true; break; }
      }
      if (n) add.push([x, y]);
    }
    for (const p of add) g[p[1]][p[0]] = c;
  }
  function toCanvas(g) {
    const h = g.length, w = g[0].length, c = mk(w, h), ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = g[y][x]; if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  function hash(x, y) { let n = x * 374761393 + y * 668265263; n = (n ^ (n >> 13)) * 1274126177; n = n ^ (n >> 16); return ((n >>> 0) % 1000) / 1000; }

  // ============================================================
  // Fish builder
  // ============================================================
  function paint(g, cx, cy, rx, ry, color, inner) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0001 && g[y] && g[y][x] && inner[g[y][x]]) g[y][x] = color;
      }
  }

  function buildFish(cfg) {
    const { w, h, cx, cy, rx, ry } = cfg;
    const g = grid(w, h);
    const outlineColor = cfg.outline || '#1b2530';
    const fin = cfg.fin || cfg.body;
    const inner = {};

    // ---- tail ----
    const tx = cx - rx + 1;
    if (cfg.tail) {
      const { len, spread, fork } = cfg.tail;
      if (fork) {
        tri(g, tx, cy, tx - len, cy - spread, tx - len * 0.35, cy - 1, fin);
        tri(g, tx, cy, tx - len, cy + spread, tx - len * 0.35, cy + 1, fin);
      } else {
        tri(g, tx, cy, tx - len, cy - spread, tx - len, cy + spread, fin);
      }
    }
    // ---- body + belly ----
    ell(g, cx, cy, rx, ry, cfg.body);
    if (cfg.belly) ell(g, cx + 0.5, cy + ry * 0.42, rx * 0.86, ry * 0.52, cfg.belly);
    // ---- dorsal ----
    const d = cfg.dorsal;
    if (d === 'small') tri(g, cx - 2, cy - ry + 1, cx + 2, cy - ry - 3, cx + 6, cy - ry + 1, fin);
    else if (d === 'big') tri(g, cx - 5, cy - ry + 1, cx + 1, cy - ry - 6, cx + 8, cy - ry + 1, fin);
    else if (d === 'sail') { tri(g, cx - 4, cy - ry + 1, cx + 2, cy - ry - 7, cx + 8, cy - ry + 1, fin); ell(g, cx + 2, cy - ry - 2, 3, 2.5, fin); }
    else if (d === 'spiny') for (let i = -2; i <= 3; i++) { const x = cx + i * 3; tri(g, x, cy - ry + 1, x + 1.4, cy - ry - 3.2, x + 3, cy - ry + 1, fin); }
    // ---- anal fin ----
    if (cfg.anal) tri(g, cx - 3, cy + ry - 1, cx + 1, cy + ry + 3, cx + 5, cy + ry - 1, fin);
    // ---- pectoral ----
    if (cfg.pectoral) tri(g, cx - 1, cy + 1, cx + 4, cy + 1, cx - 2, cy + ry - 1.5, fin);

    outline(g, outlineColor);

    // set of interior colors that patterns may repaint
    inner[cfg.body] = 1; if (cfg.belly) inner[cfg.belly] = 1;
    cfg._inner = inner;

    // ---- pattern ----
    if (cfg.custom) cfg.custom(g, cfg);
    else if (cfg.pattern === 'stripe') {
      for (let x = cx - rx + 2; x <= cx + rx - 3; x++) for (let yy = -1; yy <= 1; yy++) if (g[Math.round(cy) + yy] && inner[g[Math.round(cy) + yy][x]]) g[Math.round(cy) + yy][x] = cfg.patternColor;
    } else if (cfg.pattern === 'bars') {
      const n = cfg.barCount || 4;
      for (let i = 0; i < n; i++) {
        const bx = Math.round(cx - rx + (i + 0.5) * (2 * rx) / n);
        for (let y = Math.round(cy - ry + 1); y <= Math.round(cy + ry - 1); y++) if (g[y] && inner[g[y][bx]]) g[y][bx] = cfg.patternColor;
      }
    } else if (cfg.pattern === 'spots') {
      for (let i = 0; i < 26; i++) {
        const a = hash(i, 7) * Math.PI * 2, r = hash(i, 13);
        const x = Math.round(cx + Math.cos(a) * rx * 0.8 * r);
        const y = Math.round(cy + Math.sin(a) * ry * 0.75 * r);
        if (g[y] && inner[g[y][x]]) g[y][x] = cfg.patternColor;
      }
    } else if (cfg.pattern === 'mottle') {
      for (let i = 0; i < 14; i++) {
        const a = hash(i, 3) * Math.PI * 2, r = hash(i, 21);
        paint(g, cx + Math.cos(a) * rx * 0.6 * r, cy + Math.sin(a) * ry * 0.6 * r, 2 + hash(i, 5) * 2, 1.5 + hash(i, 11), cfg.patternColor, inner);
      }
    }

    // ---- eye + mouth ----
    const ex = cfg.eyeAt ? cfg.eyeAt[0] : cx + rx - 3.5;
    const ey = cfg.eyeAt ? cfg.eyeAt[1] : cy - 1;
    set(g, ex, ey, '#ffffff');
    set(g, ex + 1, ey, cfg.eye || '#16242c');
    set(g, ex, ey + 1, cfg.eye || '#16242c');
    set(g, ex + 1, ey + 1, cfg.eye || '#16242c');
    if (cfg.mouth) set(g, cx + rx - 0.5, cy + 1, outlineColor);
    if (cfg.gill) { for (let y = Math.round(cy - ry * 0.5); y <= Math.round(cy + ry * 0.5); y++) if (g[y]) set(g, cx + rx - 5, y, cfg.gill); }

    return toCanvas(g);
  }

  // Ancient coelacanth — hand built, armoured, bioluminescent.
  function buildAncient() {
    const g = grid(46, 24);
    const body = '#2c6f78', belly = '#3f8f8c', fin = '#20505a', plate = '#1c454e', glow = '#8affdf', lineCol = '#08191d', eye = '#b6fff0';
    const cx = 24, cy = 12, rx = 15, ry = 8.4;
    // lobed tail
    tri(g, cx - rx + 1, cy, cx - rx - 8, cy - 7, cx - rx - 3, cy, fin);
    tri(g, cx - rx + 1, cy, cx - rx - 8, cy + 7, cx - rx - 3, cy, fin);
    ell(g, cx - rx - 5, cy, 3, 4.5, fin);
    // body
    ell(g, cx, cy, rx, ry, body);
    ell(g, cx + 1, cy + ry * 0.45, rx * 0.85, ry * 0.5, belly);
    // lobed pectoral + pelvic fins
    ell(g, cx - 4, cy + ry - 1, 3, 5.5, fin);
    ell(g, cx + 3, cy + ry - 1, 2.6, 4.5, fin);
    // dorsal sail (two)
    tri(g, cx - 5, cy - ry + 1, cx - 1, cy - ry - 6, cx + 3, cy - ry + 1, fin);
    tri(g, cx + 4, cy - ry + 1, cx + 7, cy - ry - 4, cx + 10, cy - ry + 1, fin);
    outline(g, lineCol);
    // armoured head plates
    const inner = {}; inner[body] = 1; inner[belly] = 1;
    for (let i = 0; i < 4; i++) paint(g, cx + rx - 2 - i * 3, cy, 0.8, ry - 0.5, plate, inner);
    // scale rows
    for (let r = 0; r < 3; r++) {
      for (let x = cx - rx + 3; x <= cx + rx - 5; x++) {
        const y = Math.round(cy - 4 + r * 3.2);
        if (g[y] && inner[g[y][x]]) g[y][x] = plate;
      }
    }
    // bioluminescent spots
    const spots = [[-10, -3], [-6, 2], [-2, -4], [2, 3], [-8, 5], [6, -2], [-12, 1], [9, 2], [-4, -1], [0, 5]];
    for (const s of spots) set(g, cx + s[0], cy + s[1], glow);
    // eye
    set(g, cx + rx - 4, cy - 2, eye); set(g, cx + rx - 3, cy - 2, eye);
    set(g, cx + rx - 4, cy - 1, '#eafffb'); set(g, cx + rx - 3, cy - 1, eye);
    set(g, cx + rx - 2, cy - 1, lineCol);
    // mouth
    set(g, cx + rx - 0.5, cy + 2, lineCol);
    return toCanvas(g);
  }

  // ============================================================
  // Fish registry
  // ============================================================
  const FISH_DEFS = [
    { id: 'minnow', name: 'Puddle Minnow', rarity: 'Common', w: 24, h: 13, cx: 13, cy: 6.5, rx: 8, ry: 4.4,
      tail: { len: 7, spread: 5, fork: true }, body: '#9ec4d4', belly: '#e6f0f2', fin: '#7aa9bd', pattern: 'stripe', patternColor: '#6f9fb5', dorsal: 'small', pectoral: true, gill: '#6f9fb5', outline: '#25414f' },
    { id: 'perch', name: 'Sunny Perch', rarity: 'Common', w: 26, h: 16, cx: 14, cy: 8, rx: 9, ry: 5.6,
      tail: { len: 8, spread: 6, fork: true }, body: '#a7ad63', belly: '#e3d9a0', fin: '#c07b39', pattern: 'bars', barCount: 5, patternColor: '#59602f', dorsal: 'spiny', anal: true, pectoral: true, gill: '#7c8140', outline: '#2e3320' },
    { id: 'roach', name: 'Copper Roach', rarity: 'Uncommon', w: 28, h: 15, cx: 15, cy: 7.5, rx: 10, ry: 5.4,
      tail: { len: 9, spread: 6, fork: true }, body: '#c98b4e', belly: '#e9cfa0', fin: '#b25f3a', pattern: 'mottle', patternColor: '#a86a35', dorsal: 'small', anal: true, pectoral: true, gill: '#b57a44', outline: '#43291b' },
    { id: 'trout', name: 'Sapphire Trout', rarity: 'Rare', w: 34, h: 18, cx: 17, cy: 9, rx: 12, ry: 6.3,
      tail: { len: 10, spread: 7, fork: true }, body: '#4f8fbf', belly: '#d7e7ea', fin: '#3f6f9c', pattern: 'spots', patternColor: '#1f4a6e', stripe: true, dorsal: 'small', anal: true, pectoral: true, gill: '#3f6f9c', outline: '#1d3b53',
      custom: function (g, cfg) {
        const cy = Math.round(cfg.cy), inner = cfg._inner;
        for (let x = cfg.cx - cfg.rx + 3; x <= cfg.cx + cfg.rx - 4; x++) for (let y = cy - 1; y <= cy + 1; y++) if (g[y] && inner[g[y][x]]) g[y][x] = '#e2647e';
      } },
    { id: 'grouper', name: 'Amethyst Grouper', rarity: 'Epic', w: 33, h: 22, cx: 16, cy: 11, rx: 12, ry: 8.2,
      tail: { len: 8, spread: 7, fork: false }, body: '#8a5fb0', belly: '#c9a8dd', fin: '#6f4a90', pattern: 'spots', patternColor: '#d9b6f0', dorsal: 'spiny', anal: true, pectoral: true, gill: '#7a52a0', outline: '#35214d', mouth: true },
    { id: 'koi', name: 'Golden Koi', rarity: 'Legendary', w: 38, h: 20, cx: 19, cy: 10, rx: 12, ry: 6.6,
      tail: { len: 11, spread: 9, fork: false }, body: '#f2ede0', belly: '#ffffff', fin: '#f0a24a', dorsal: 'small', pectoral: true, gill: '#d8cbb2', outline: '#6b3a22', eyeAt: [28, 8],
      custom: function (g, cfg) {
        const inner = cfg._inner;
        paint(g, cfg.cx - 5, cfg.cy - 1, 3.6, 2.6, '#e0622a', inner);
        paint(g, cfg.cx + 4, cfg.cy + 1, 3.2, 2.2, '#e0622a', inner);
        paint(g, cfg.cx, cfg.cy - 2, 2.2, 1.7, '#2b2b2b', inner);
        paint(g, cfg.cx - 9, cfg.cy + 1, 1.8, 1.4, '#2b2b2b', inner);
        // long flowing tail fins
        tri(g, cfg.cx - cfg.rx, cfg.cy, cfg.cx - cfg.rx - 6, cfg.cy - 10, cfg.cx - cfg.rx + 1, cfg.cy - 1, '#f6d9a8');
        tri(g, cfg.cx - cfg.rx, cfg.cy, cfg.cx - cfg.rx - 6, cfg.cy + 10, cfg.cx - cfg.rx + 1, cfg.cy + 1, '#f6d9a8');
        // whiskers
        line(g, cfg.cx + cfg.rx - 1, cfg.cy + 2, cfg.cx + cfg.rx + 3, cfg.cy + 4, '#c98b4e');
        line(g, cfg.cx + cfg.rx - 1, cfg.cy + 2, cfg.cx + cfg.rx + 3, cfg.cy, '#c98b4e');
      } },
  ];

  const FISH = {};
  function initFish() {
    for (const def of FISH_DEFS) FISH[def.id] = { id: def.id, name: def.name, rarity: def.rarity, canvas: buildFish(def), w: def.w, h: def.h };
    const anc = buildAncient();
    FISH['leviathan'] = { id: 'leviathan', name: 'Tidelord Coelacanth', rarity: 'Ancient', canvas: anc, w: 46, h: 24 };

    const byRarity = {};
    for (const id in FISH) { const f = FISH[id]; (byRarity[f.rarity] = byRarity[f.rarity] || []).push(id); }
    return byRarity;
  }

  // ============================================================
  // Scene
  // ============================================================
  const COAST = [[14, 0], [17, 14], [21, 28], [27, 42], [35, 56], [45, 70], [56, 84], [66, 98], [75, 110], [82, 120], [86, 129], [84, 138], [79, 147], [76, 156], [79, 165], [85, 173], [92, 180]];
  function coastX(y) {
    for (let i = 0; i < COAST.length - 1; i++) {
      const a = COAST[i], b = COAST[i + 1];
      if (y >= a[1] && y <= b[1]) { const t = (y - a[1]) / ((b[1] - a[1]) || 1); return a[0] + (b[0] - a[0]) * t; }
    }
    return COAST[COAST.length - 1][0];
  }

  const ANGLER = {
    k: '#26192b', h: '#d8ab5e', H: '#a97c39', s: '#e9b489', a: '#e0a878',
    e: '#3a2a24', b: '#4e7d63', B: '#3a5f4a', o: '#3f5b86', t: '#5a3b26'
  };
  const ANGLER_ROWS = [
    '....kkkkk.....',
    '...khhhhhk....',
    '..khhhhhhhk...',
    '.khhhhhhhhhk..',
    '.kkkkkkkkkkkk.',
    '...kssssssk...',
    '..kssssssssk..',
    '..kssssesssk..',
    '...kssssssk...',
    '..kkbbbbbbkk..',
    '.kbbbbbbbbbbk.',
    '.kbbbbbbbbbak.',
    '..kbbbbbbbbk..',
    '..koooooooook..',
    '..koooooooook..',
    '..koooooooook..',
    '...koookoook..',
    '...koookoook..',
    '...kttk.kttk..',
    '..kkttkkkttkk.'
  ];

  function makeAngler() {
    const rows = ANGLER_ROWS.map(r => r.padEnd(14, '.'));
    const g = grid(14, rows.length);
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < 14; x++) {
      const ch = rows[y][x]; if (ANGLER[ch]) g[y][x] = ANGLER[ch];
    }
    return toCanvas(g);
  }

  const ROCK = '#7d858d', ROCK_D = '#565f68', ROCK_L = '#9aa3ab';

  // crisp filled ellipse (integer pixels, no anti-aliasing)
  function pell(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    rx = Math.round(rx); ry = Math.round(ry);
    if (rx < 0 || ry < 0) return;
    const ox = Math.round(cx), oy = Math.round(cy);
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry || 1);
      if (t < 0) continue;
      const x = Math.round(Math.sqrt(t) * rx);
      ctx.fillRect(ox - x, oy + y, x * 2 + 1, 1);
    }
  }

  function buildWater() {
    const c = mk(320, 180), ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 0, 180);
    grd.addColorStop(0, '#2a6d8f');
    grd.addColorStop(0.45, '#3688ad');
    grd.addColorStop(1, '#47a2c4');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 320, 180);
    // subtle depth bands
    for (let y = 0; y < 180; y += 24) {
      ctx.fillStyle = y % 48 === 0 ? 'rgba(10,40,60,0.05)' : 'rgba(120,200,220,0.03)';
      ctx.fillRect(0, y, 320, 12);
    }
    // shallow light along the coast
    for (let y = 0; y < 180; y++) {
      const x0 = coastX(y);
      for (let d = 0; d < 18; d++) {
        const a = (1 - d / 18) * 0.5;
        ctx.fillStyle = 'rgba(150,220,220,' + a.toFixed(3) + ')';
        ctx.fillRect(Math.floor(x0 + d), y, 1, 1);
      }
    }
    return c;
  }

  function buildLand() {
    const c = mk(320, 180), ctx = c.getContext('2d');

    // ---- land mass (crisp scanline fill, keeps the shoreline pixel-sharp) ----
    for (let y = 0; y < 180; y++) {
      const x0 = Math.floor(coastX(y));
      ctx.fillStyle = '#679c4d';
      ctx.fillRect(-1, y, x0 + 1, 1);
    }

    // darker grass patches
    for (let i = 0; i < 240; i++) {
      const x = hash(i, 1) * 130, y = hash(i, 2) * 180;
      if (x < coastX(y) - 8) {
        ctx.fillStyle = hash(i, 3) > 0.5 ? '#558440' : '#79b25c';
        const s = 1 + Math.floor(hash(i, 4) * 2);
        ctx.fillRect(Math.floor(x), Math.floor(y), s + 1, s);
      }
    }
    // grass blades
    for (let i = 0; i < 200; i++) {
      const y = hash(i, 9) * 180, x = hash(i, 10) * 130;
      if (x < coastX(y) - 10) {
        ctx.fillStyle = hash(i, 11) > 0.5 ? '#78ad5c' : '#3f6a32';
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 2 + Math.floor(hash(i, 12) * 3));
      }
    }

    // ---- sand strip along coast ----
    for (let y = 0; y < 180; y++) {
      const x0 = Math.floor(coastX(y));
      for (let d = 1; d <= 7; d++) {
        const x = x0 - d;
        ctx.fillStyle = d <= 4 ? '#cbb27a' : '#b89f68';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.fillStyle = '#8f7a4c'; ctx.fillRect(x0 - 8, y, 1, 1);
    }
    // pebbles
    for (let i = 0; i < 60; i++) {
      const y = hash(i, 30) * 180, x = coastX(y) - 1 - hash(i, 31) * 6;
      ctx.fillStyle = hash(i, 32) > 0.5 ? ROCK : ROCK_D;
      ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }

    // ---- flowers in grass ----
    const FCOL = ['#e86a6a', '#f2c14e', '#e9e2d0', '#c98bd6'];
    for (let i = 0; i < 40; i++) {
      const y = hash(i, 40) * 176 + 2, x = hash(i, 41) * 120;
      if (x < coastX(y) - 14) {
        const col = FCOL[i % FCOL.length];
        ctx.fillStyle = '#3f6a32'; ctx.fillRect(Math.floor(x), Math.floor(y) + 1, 1, 2);
        ctx.fillStyle = col; ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        ctx.fillRect(Math.floor(x) - 1, Math.floor(y), 1, 1); ctx.fillRect(Math.floor(x) + 1, Math.floor(y), 1, 1);
      }
    }

    // ---- rocks at the waterline ----
    function rock(cx, cy, s) {
      pell(ctx, cx, cy + 1, s, s * 0.7, ROCK_D);
      pell(ctx, cx, cy, s, s * 0.7, ROCK);
      ctx.fillStyle = ROCK_L; ctx.fillRect(Math.floor(cx - s * 0.4), Math.floor(cy - s * 0.5), 2, 1);
    }
    rock(coastX(150) - 2, 150, 4); rock(coastX(30) - 3, 30, 3); rock(coastX(95) - 2, 96, 3.4);

    // ---- reeds ----
    function reeds(bx, by, n) {
      for (let i = 0; i < n; i++) {
        const x = bx + i * 3 + (hash(i, 50) * 2 - 1);
        const h = 10 + hash(i, 51) * 12;
        ctx.fillStyle = '#6f8a3a';
        for (let k = 0; k < h; k++) ctx.fillRect(Math.round(x + Math.sin(k * 0.3 + i) * 1.2), Math.round(by - k), 1, 1);
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(Math.round(x + Math.sin(h * 0.3 + i) * 1.2), Math.round(by - h), 2, 4);
      }
    }
    reeds(coastX(168) - 4, 168, 4);
    reeds(coastX(120) - 6, 124, 3);

    // ---- bushes ----
    function bush(bx, by, s, dark, light) {
      pell(ctx, bx, by, s * 1.5, s, dark);
      pell(ctx, bx - s * 0.3, by - s * 0.35, s * 1.0, s * 0.6, light);
      pell(ctx, bx - s * 0.5, by - s * 0.6, s * 0.5, s * 0.3, 'rgba(255,255,255,0.10)');
    }
    bush(24, 66, 6, '#2f5a34', '#3f7040');
    bush(40, 108, 5, '#2f5a34', '#437545');
    bush(12, 118, 6, '#2b5230', '#3c6b3d');

    // ---- tree (top-left) ----
    (function tree() {
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(14, 34, 5, 26);
      ctx.fillStyle = '#6d4b2c'; ctx.fillRect(15, 34, 2, 26);
      pell(ctx, 18, 24, 22, 16, '#24462b');
      pell(ctx, 14, 18, 15, 11, '#2f5a34');
      pell(ctx, 30, 26, 12, 10, '#2f5a34');
      pell(ctx, 12, 14, 9, 7, '#3f7040');
      pell(ctx, 28, 20, 7, 6, '#3f7040');
      pell(ctx, 9, 11, 4, 3, 'rgba(160,210,120,0.35)');
      // fruit dots
      ctx.fillStyle = '#e0724a';
      ctx.fillRect(20, 18, 2, 2); ctx.fillRect(10, 24, 2, 2); ctx.fillRect(30, 24, 2, 2);
    })();

    // ---- distant island (depth) ----
    (function island() {
      pell(ctx, 272, 22, 27, 5, 'rgba(10,35,50,0.28)');
      pell(ctx, 272, 15, 25, 7, '#cbb27a');
      pell(ctx, 272, 13, 22, 6, '#3f7040');
      pell(ctx, 268, 11, 15, 5, '#2f5a34');
      for (const dx of [-11, 5, 13]) {
        ctx.fillStyle = '#4a3220'; ctx.fillRect(272 + dx - 1, 3, 2, 7);
        pell(ctx, 272 + dx, 2, 5, 4, '#24462b');
        pell(ctx, 272 + dx - 1, 1, 3, 2.4, '#3f7040');
      }
    })();

    // ---- lily pads ----
    function lily(x, y, s) {
      pell(ctx, x, y + 1, s, s * 0.55, 'rgba(255,255,255,0.10)');
      pell(ctx, x, y, s, s * 0.55, '#3f7040');
      pell(ctx, x - s * 0.2, y - s * 0.15, s * 0.7, s * 0.36, '#4d8a4a');
      ctx.fillStyle = '#2b5230'; ctx.fillRect(Math.round(x - 0.5), Math.round(y - s * 0.2), 1, Math.round(s * 0.7));
      if (s > 4) { ctx.fillStyle = '#f0a24a'; ctx.fillRect(Math.round(x + 1), Math.round(y - 1), 2, 2); }
    }
    lily(104, 152, 5); lily(118, 160, 4); lily(96, 60, 4); lily(62, 66, 3.4); lily(128, 70, 3);

    // ---- dock ----
    drawDock(ctx);

    // ---- lantern on the dock ----
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(87, 104, 2, 14);
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(87, 104, 2, 2);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(84, 97, 8, 8);
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(86, 99, 4, 4);
    ctx.fillStyle = '#fff3c0'; ctx.fillRect(87, 100, 2, 2);
    (function glow() {
      const gr = ctx.createRadialGradient(88, 101, 1, 88, 101, 26);
      gr.addColorStop(0, 'rgba(255,210,120,0.34)');
      gr.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(88, 101, 26, 0, 7); ctx.fill();
    })();

    // ---- bucket of bait on the dock ----
    pell(ctx, 140, 141, 6, 2, 'rgba(20,30,20,0.35)');
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(134, 131, 11, 10);
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(135, 132, 9, 8);
    ctx.fillStyle = '#8a6239'; ctx.fillRect(135, 132, 9, 1);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(135, 136, 9, 1);
    ctx.fillStyle = '#2e779a'; ctx.fillRect(136, 133, 7, 2);
    ctx.fillStyle = '#9ec4d4'; ctx.fillRect(138, 130, 3, 3);

    // ---- angler ----
    const ang = makeAngler();
    // shadow
    pell(ctx, 122, 140, 9, 3, 'rgba(20,30,20,0.35)');
    ctx.drawImage(ang, 115, 121);

    return c;
  }

  function drawDock(ctx) {
    // supporting posts (visible below deck) + reflection
    const posts = [90, 122, 154];
    for (const px of posts) {
      ctx.fillStyle = '#3a2718'; ctx.fillRect(px, 132, 5, 28);
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(px + 1, 132, 2, 28);
    }
    ctx.fillStyle = 'rgba(8,25,35,0.35)';
    ctx.fillRect(86, 146, 76, 9);
    // deck
    ctx.fillStyle = '#6f4c2e'; ctx.fillRect(84, 116, 82, 26);
    for (let y = 116, i = 0; y < 142; y += 4, i++) {
      ctx.fillStyle = i % 2 ? '#7d5735' : '#684728';
      ctx.fillRect(84, y, 82, 4);
      ctx.fillStyle = 'rgba(40,25,14,0.85)'; ctx.fillRect(84, y + 3, 82, 1);
      ctx.fillStyle = 'rgba(255,225,180,0.10)'; ctx.fillRect(84, y, 82, 1);
    }
    // side rims
    ctx.fillStyle = '#4a3220'; ctx.fillRect(84, 116, 82, 2);
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(84, 140, 82, 3);
    ctx.fillStyle = '#8a6239'; ctx.fillRect(84, 116, 2, 26);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(164, 116, 2, 26);
    // nails
    ctx.fillStyle = '#3a2a1a';
    for (let x = 90; x < 164; x += 10) for (let y = 119; y < 140; y += 8) ctx.fillRect(x, y, 1, 1);
  }

  // sparkle field positions (water only)
  function buildSparkles() {
    const out = [];
    for (let i = 0; i < 70; i++) {
      const x = 30 + hash(i, 60) * 285;
      const y = 6 + hash(i, 61) * 168;
      if (x > coastX(y) + 16) out.push({ x: Math.floor(x), y: Math.floor(y), p: hash(i, 62) * 6.28, s: 0.6 + hash(i, 63) * 1.8 });
    }
    return out;
  }

  const Art = {
    fish: {},
    byRarity: {},
    water: null,
    land: null,
    sparkles: [],
    silhouette: null,
    rodPivot: { x: 126, y: 132 },
    init: function () {
      this.byRarity = initFish();
      this.fish = FISH;
      this.water = buildWater();
      this.land = buildLand();
      this.sparkles = buildSparkles();
      // dark silhouette for the reeling animation
      const g = grid(24, 13);
      tri(g, 6, 6.5, 0, 2, 5, 6, '#000'); tri(g, 6, 6.5, 0, 11, 5, 7, '#000');
      ell(g, 13, 6.5, 8, 4.6, '#000');
      tri(g, 9, 2.5, 14, 0.5, 17, 2.5, '#000');
      tri(g, 9, 10.5, 13.5, 13, 15, 10.5, '#000');
      this.silhouette = toCanvas(g);
    },
    coastX: coastX,

    drawWater: function (ctx, t) {
      ctx.drawImage(this.water, 0, 0);
    },

    drawWaves: function (ctx, t) {
      ctx.save();
      ctx.fillStyle = 'rgba(190,232,240,0.13)';
      for (let i = 0; i < 9; i++) {
        const baseY = 10 + i * 19;
        const phase = i * 1.7;
        const sp = 0.5 + (i % 3) * 0.15;
        for (let x = 0; x < 320; x++) {
          const yy = baseY + Math.sin(x * 0.055 + t * sp + phase) * 1.6;
          const dash = ((x + i * 11 + Math.floor(t * 22)) >> 3) % 4;
          if (dash !== 0) continue;
          ctx.fillRect(x, Math.floor(yy), 2, 1);
        }
      }
      // brighter crest highlights
      ctx.fillStyle = 'rgba(220,248,250,0.20)';
      for (let i = 0; i < 5; i++) {
        const baseY = 18 + i * 34;
        for (let x = 0; x < 320; x++) {
          const yy = baseY + Math.sin(x * 0.09 - t * 0.8 + i) * 1.2;
          if (((x + Math.floor(t * 14)) >> 4) % 3 !== 0) continue;
          ctx.fillRect(x, Math.floor(yy), 1, 1);
        }
      }
      // sparkles
      for (const s of this.sparkles) {
        const a = 0.25 + 0.75 * Math.max(0, Math.sin(t * s.s + s.p));
        ctx.fillStyle = 'rgba(210,245,248,' + a.toFixed(3) + ')';
        ctx.fillRect(s.x, s.y, 2, 1);
      }
      // distant fish shadows gliding under the surface
      const shadows = [{ y: 42, sp: 8, len: 15, a: 0.13, ph: 0 }, { y: 70, sp: -6, len: 11, a: 0.11, ph: 2.4 }, { y: 96, sp: 5, len: 19, a: 0.09, ph: 4.4 }];
      for (const sh of shadows) {
        let x = ((t * sh.sp + sh.ph * 60) % 400) - 50;
        ctx.save();
        ctx.globalAlpha = sh.a;
        const w = sh.len, h = sh.len * 0.5;
        if (sh.sp < 0) { ctx.translate(Math.floor(x + w), Math.floor(sh.y)); ctx.scale(-1, 1); ctx.drawImage(this.silhouette, 0, 0, w, h); }
        else { ctx.drawImage(this.silhouette, Math.floor(x), Math.floor(sh.y), w, h); }
        ctx.restore();
      }
      ctx.restore();
    },

    drawLand: function (ctx) { ctx.drawImage(this.land, 0, 0); },

    drawFoam: function (ctx, t) {
      ctx.save();
      for (let y = 2; y < 180; y += 2) {
        const x = coastX(y);
        const off = Math.sin(y * 0.25 + t * 1.6) * 1.0;
        const a = 0.20 + 0.30 * (0.5 + 0.5 * Math.sin(y * 0.5 - t * 2.2));
        ctx.fillStyle = 'rgba(235,250,250,' + a.toFixed(3) + ')';
        ctx.fillRect(Math.floor(x + off), y, 2, 1);
      }
      ctx.restore();
    },

    drawVignette: function (ctx) {
      const g = ctx.createRadialGradient(160, 90, 60, 160, 90, 210);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(6,14,22,0.38)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);
    }
  };

  global.Art = Art;
})(window);
