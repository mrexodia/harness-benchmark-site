// game.js — state machine, input, and rendering for Driftwood Bay.
(function () {
  'use strict';

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  Art.init();

  // ============================================================
  // Rarity table — exact odds, no pity/rerolls/history.
  // ============================================================
  const RARITY = [
    { name: 'Common', odds: 0.45, color: '#8b98a2' },
    { name: 'Uncommon', odds: 0.25, color: '#59a552' },
    { name: 'Rare', odds: 0.15, color: '#4aa8e0' },
    { name: 'Epic', odds: 0.08, color: '#a95fdd' },
    { name: 'Legendary', odds: 0.05, color: '#f0c24a' },
    { name: 'Ancient', odds: 0.02, color: '#3fd6b6' }
  ];
  const COLOR_OF = {};
  for (const r of RARITY) COLOR_OF[r.name] = r.color;

  function pickRarity(u) {
    let acc = 0;
    for (const r of RARITY) { acc += r.odds; if (u < acc) return r.name; }
    return 'Ancient';
  }

  // ============================================================
  // Test interface
  // ============================================================
  const catchLog = []; // newest first, every success this session

  const fishing = {
    get state() { return phase; },
    pickRarity: pickRarity,
    log: catchLog
  };
  window.fishing = fishing;

  // ============================================================
  // Timing
  // ============================================================
  const CAST_DUR = 0.5;      // line in the air
  const BITE_WINDOW = 1.5;   // generous window to react
  const REEL_DUR = 1.05;     // reeling animation
  const REVEAL_DUR = 2.4;    // how long the catch card stays
  const MISS_DUR = 0.7;

  const IDLE_ANGLE = -0.62;
  const ROD_LEN = 62;

  // ============================================================
  // State
  // ============================================================
  let phase = 'ready';
  let t = 0;
  let castT = 0, waitDur = 2.2;
  let landed = false;
  let biteT = 0;
  let reelT = 0;
  let revealT = 0;
  let missT = 0;
  let bobber = { x: 0, y: 0, tx: 0, ty: 0, active: false };
  let ripples = [];
  let caught = null;
  let shake = 0;
  const motes = [];
  for (let i = 0; i < 14; i++) motes.push({ x: hash(i, 70) * 320, y: 20 + hash(i, 71) * 160, p: hash(i, 72) * 6.28, s: 3 + hash(i, 73) * 6 });

  function hash(x, y) { let n = x * 374761393 + y * 668265263; n = (n ^ (n >> 13)) * 1274126177; n = n ^ (n >> 16); return ((n >>> 0) % 1000) / 1000; }

  // ============================================================
  // Rod / line geometry
  // ============================================================
  function rodPoint(angle, bend, i) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const px = -dy, py = dx;
    const b = bend * Math.sin(Math.PI * i);
    return { x: Art.rodPivot.x + dx * ROD_LEN * i + px * b, y: Art.rodPivot.y + dy * ROD_LEN * i + py * b };
  }
  function rodTip(angle, bend) { return rodPoint(angle, bend, 1); }

  function addRipple(x, y, big) { ripples.push({ x: x, y: y, t: 0, life: big ? 1.1 : 0.7, max: big ? 16 : 9 }); }

  // crisp 1px ellipse outline drawn pixel-by-pixel (no anti-aliasing)
  function pixelRing(cx, cy, rx, ry, color) {
    rx = Math.round(rx); ry = Math.round(ry);
    if (rx < 1 || ry < 1) return;
    ctx.fillStyle = color;
    const ox = Math.round(cx), oy = Math.round(cy);
    for (let x = -rx; x <= rx; x++) {
      const t2 = 1 - (x * x) / (rx * rx);
      if (t2 < 0) continue;
      const y = Math.round(Math.sqrt(t2) * ry);
      ctx.fillRect(ox + x, oy - y, 1, 1);
      if (y !== 0) ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }

  // ============================================================
  // Transitions
  // ============================================================
  function beginCast() {
    phase = 'waiting';
    castT = 0;
    landed = false;
    waitDur = 1.7 + Math.random() * 1.6;
    bobber.tx = 196 + Math.random() * 100;   // 196..296
    bobber.ty = 44 + Math.random() * 58;     // 44..102
    bobber.x = bobber.tx; bobber.y = bobber.ty;
    bobber.active = true;
    hideIntro();
    refreshUI();
  }
  function beginBite() {
    phase = 'bite'; biteT = 0;
    addRipple(bobber.tx, bobber.ty, true);
    shake = 0.25;
    refreshUI();
  }
  function beginReel() {
    phase = 'reeling'; reelT = 0;
    addRipple(bobber.tx, bobber.ty, false);
    refreshUI();
  }
  function missBite() {
    phase = 'ready'; missT = MISS_DUR;
    addRipple(bobber.tx, bobber.ty, true);
    bobber.active = false;
    refreshUI();
  }
  function resolveCatch() {
    // Rarity is chosen through the public interface so it can be replaced.
    const rarity = window.fishing.pickRarity(Math.random());
    const pool = Art.byRarity[rarity] || [];
    const id = pool[Math.floor(Math.random() * pool.length)];
    const f = Art.fish[id];
    caught = f;
    const entry = { name: f.name, rarity: f.rarity };
    catchLog.unshift(entry);
    showReveal(f);
    addLogEntry(entry, true);
    phase = 'reveal'; revealT = 0;
    bobber.active = false;
    refreshUI();
  }
  function toReady() {
    phase = 'ready';
    caught = null;
    hideReveal();
    refreshUI();
  }

  // ============================================================
  // Input
  // ============================================================
  function act() {
    if (phase === 'ready') beginCast();
    else if (phase === 'bite') beginReel();
    // waiting / reeling / reveal: ignored — no overlapping casts or dupes
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) act();
    }
  });
  const btn = document.getElementById('castbtn');
  btn.addEventListener('click', function (e) { e.preventDefault(); act(); });

  // ============================================================
  // Update
  // ============================================================
  function update(dt) {
    t += dt;
    if (missT > 0) missT = Math.max(0, missT - dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 3);
    for (const r of ripples) r.t += dt;
    ripples = ripples.filter(function (r) { return r.t < r.life; });

    const angle = currentAngle();

    if (phase === 'waiting') {
      castT += dt;
      if (castT < CAST_DUR) {
        const p = castT / CAST_DUR;
        const tip = rodTip(angle, currentBend());
        bobber.x = tip.x + (bobber.tx - tip.x) * p;
        bobber.y = tip.y + (bobber.ty - tip.y) * p - Math.sin(Math.PI * p) * 24;
      } else {
        bobber.x = bobber.tx;
        bobber.y = bobber.ty + Math.sin(t * 2.2) * 0.7;
        if (!landed) { landed = true; addRipple(bobber.tx, bobber.ty, false); }
        if (castT > CAST_DUR + waitDur) beginBite();
      }
    } else if (phase === 'bite') {
      biteT += dt;
      bobber.x = bobber.tx + Math.sin(t * 26) * 0.6;
      bobber.y = bobber.ty + 1.6 + Math.abs(Math.sin(t * 22)) * 1.7;
      if (Math.random() < 0.06) addRipple(bobber.tx, bobber.ty, false);
      if (biteT > BITE_WINDOW) missBite();
    } else if (phase === 'reeling') {
      reelT += dt;
      const p = Math.min(1, reelT / REEL_DUR);
      const e = 1 - Math.pow(1 - p, 3);
      const tip = rodTip(angle, currentBend());
      bobber.x = bobber.tx + (tip.x - bobber.tx) * e;
      bobber.y = bobber.ty + (tip.y - bobber.ty) * e - Math.sin(Math.PI * p) * 12;
      if (reelT >= REEL_DUR) resolveCatch();
    } else if (phase === 'reveal') {
      revealT += dt;
      if (revealT >= REVEAL_DUR) toReady();
    }
  }

  function currentAngle() {
    let a = IDLE_ANGLE + Math.sin(t * 0.9) * 0.02;
    if (phase === 'waiting' && castT < CAST_DUR) {
      const p = castT / CAST_DUR;
      a = IDLE_ANGLE - 0.38 * Math.sin(Math.PI * p) + 0.14 * p;
    } else if (phase === 'bite') {
      a = IDLE_ANGLE + Math.sin(t * 26) * 0.05;
    } else if (phase === 'reeling') {
      const p = Math.min(1, reelT / REEL_DUR);
      a = IDLE_ANGLE - 0.16 - 0.26 * p;
    }
    return a;
  }
  function currentBend() {
    let b = 0;
    if (phase === 'bite') b = Math.sin(t * 26) * 2;
    else if (phase === 'reeling') b = -5 - 7 * Math.min(1, reelT / REEL_DUR);
    else if (phase === 'waiting' && castT < CAST_DUR) b = -Math.sin(Math.PI * castT / CAST_DUR) * 4;
    return b;
  }

  // ============================================================
  // Render
  // ============================================================
  function render() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 320, 180);

    const sx = shake > 0 ? (Math.random() - 0.5) * 2 : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * 2 : 0;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));

    Art.drawWater(ctx, t);
    Art.drawWaves(ctx, t);
    Art.drawLand(ctx);
    Art.drawFoam(ctx, t);
    drawMotes();

    // ripples (behind bobber)
    for (const r of ripples) {
      const p = r.t / r.life;
      const rad = r.max * p;
      const a = 0.6 * (1 - p);
      pixelRing(r.x, r.y, rad, rad * 0.45, 'rgba(225,248,248,' + a.toFixed(3) + ')');
      pixelRing(r.x, r.y, rad * 0.55, rad * 0.28, 'rgba(225,248,248,' + (a * 0.7).toFixed(3) + ')');
    }

    const angle = currentAngle(), bend = currentBend();
    const tip = rodTip(angle, bend);

    if (bobber.active && phase !== 'ready') {
      drawLine(tip, bobber.x, bobber.y);
    }
    if (bobber.active && phase !== 'ready') {
      drawBobber(bobber.x, bobber.y);
    }
    if (phase === 'reeling') drawSilhouette(bobber);
    drawRod(angle, bend, tip);
    if (phase === 'bite') drawCue(bobber, biteT);

    ctx.restore();
    Art.drawVignette(ctx);
  }

  function drawLine(tip, bx, by) {
    const sag = phase === 'bite' ? 3 : phase === 'reeling' ? 1.5 : 6 + Math.sin(t * 1.5) * 0.6;
    const cxp = (tip.x + bx) / 2, cyp = (tip.y + by) / 2 + sag;
    ctx.fillStyle = '#e6f2f4';
    for (let i = 0; i <= 140; i++) {
      const u = i / 140;
      const x = (1 - u) * (1 - u) * tip.x + 2 * (1 - u) * u * cxp + u * u * bx;
      const y = (1 - u) * (1 - u) * tip.y + 2 * (1 - u) * u * cyp + u * u * by;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  function drawBobber(x, y) {
    const px = Math.round(x), py = Math.round(y);
    // top
    ctx.fillStyle = '#e2452e'; ctx.fillRect(px - 1, py - 3, 3, 3);
    ctx.fillStyle = '#ff7a5c'; ctx.fillRect(px - 1, py - 3, 1, 1);
    // bottom
    ctx.fillStyle = '#f4f0e6'; ctx.fillRect(px - 1, py, 3, 2);
    // tip
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px, py - 4, 1, 1);
    // wet reflection
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(px - 1, py + 2, 3, 1);
  }

  function drawRod(angle, bend, tip) {
    // rod shaft (drawn pixel-by-pixel)
    const pts = [];
    for (let i = 0; i <= 32; i++) pts.push(rodPoint(angle, bend, i / 32));
    ctx.fillStyle = '#2c1c10';
    for (const p of pts) ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    ctx.fillStyle = '#6b4a2c';
    for (const p of pts) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    // reel
    const rp = rodPoint(angle, bend, 0.16);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(rp.x) - 2, Math.round(rp.y) - 1, 4, 4);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(Math.round(rp.x) - 1, Math.round(rp.y), 2, 2);
    // line guide at tip
    ctx.fillStyle = '#d8d2c0'; ctx.fillRect(Math.round(tip.x) - 1, Math.round(tip.y) - 1, 2, 1);
    // hand holding the rod
    ctx.fillStyle = '#e9b489'; ctx.fillRect(125, 131, 3, 3);
  }

  function drawSilhouette(b) {
    const p = Math.min(1, reelT / REEL_DUR);
    const jump = Math.sin(p * Math.PI) * 14;
    const x = Math.round(b.x - 12), y = Math.round(b.y - 8 - jump);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(Art.silhouette, x, y);
    ctx.restore();
    // splash
    if (p < 0.9) addRippleIfNeeded(b.x, b.y);
  }
  let lastSplash = 0;
  function addRippleIfNeeded(x, y) {
    if (t - lastSplash > 0.18) { lastSplash = t; addRipple(x, y, false); }
  }

  function drawCue(b, bt) {
    const frac = 1 - bt / BITE_WINDOW;
    const px = Math.round(b.x), py = Math.round(b.y);
    // shrinking bite-window ring
    const rad = 6 + frac * 7;
    pixelRing(px, py, rad, rad * 0.55, 'rgba(255,214,102,' + (0.45 + 0.5 * frac).toFixed(2) + ')');
    // pulsing alert bubble with "!"
    const by = py - 22 + Math.round(Math.sin(t * 12));
    ctx.fillStyle = '#fdf6e3'; ctx.fillRect(px - 5, by - 8, 11, 12);
    ctx.fillStyle = '#2b2118'; ctx.fillRect(px - 6, by - 9, 13, 1); ctx.fillRect(px - 6, by + 4, 13, 1);
    ctx.fillRect(px - 6, by - 8, 1, 12); ctx.fillRect(px + 6, by - 8, 1, 12);
    ctx.fillStyle = '#2b2118'; ctx.fillRect(px, by + 5, 2, 2); // tail
    ctx.fillStyle = '#e2452e'; ctx.fillRect(px - 1, by - 6, 3, 6); ctx.fillRect(px - 1, by + 1, 3, 2);
  }

  function drawMotes() {
    for (const m of motes) {
      const x = (m.x + Math.sin(t * 0.3 + m.p) * 12 + t * 3) % 320;
      const y = m.y + Math.sin(t * m.s * 0.15 + m.p) * 6;
      const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.p));
      ctx.fillStyle = 'rgba(255,236,170,' + a.toFixed(3) + ')';
      ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
  }

  // ============================================================
  // UI
  // ============================================================
  const statusEl = document.getElementById('status');
  const btnEl = document.getElementById('castbtn');
  const introEl = document.getElementById('intro');
  const logList = document.getElementById('loglist');
  const logEmpty = document.getElementById('logempty');
  const revealEl = document.getElementById('reveal');
  const rfish = document.getElementById('rfish');
  const rname = document.getElementById('rname');
  const rword = document.getElementById('rword');

  let introHidden = false;
  function hideIntro() { if (!introHidden) { introHidden = true; introEl.classList.add('gone'); } }
  setTimeout(hideIntro, 8000);

  let lastKey = null;
  function refreshUI() {
    const miss = (phase === 'ready' && missT > 0) ? 'm' : '';
    const key = phase + miss;
    if (key === lastKey) return;
    lastKey = key;
    statusEl.className = '';
    btnEl.className = '';
    if (phase === 'ready') {
      statusEl.textContent = missT > 0 ? 'It got away…' : 'Press SPACE or CAST';
      btnEl.textContent = 'CAST';
    } else if (phase === 'waiting') {
      statusEl.textContent = 'Waiting for a bite…';
      btnEl.textContent = 'WAIT…'; btnEl.classList.add('wait');
    } else if (phase === 'bite') {
      statusEl.textContent = 'BITE!  Press SPACE / REEL';
      statusEl.classList.add('bite');
      btnEl.textContent = 'REEL!'; btnEl.classList.add('bite');
    } else if (phase === 'reeling') {
      statusEl.textContent = 'Reeling it in…';
      btnEl.textContent = 'REELING'; btnEl.classList.add('wait');
    } else if (phase === 'reveal') {
      statusEl.textContent = 'Caught!';
      btnEl.textContent = 'NICE!'; btnEl.classList.add('wait');
    }
  }

  // legend
  const legendList = document.getElementById('legendlist');
  for (const r of RARITY) {
    const li = document.createElement('li');
    const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = r.color;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
    const pc = document.createElement('span'); pc.className = 'pc'; pc.textContent = Math.round(r.odds * 100) + '%';
    li.appendChild(sw); li.appendChild(nm); li.appendChild(pc);
    legendList.appendChild(li);
  }

  const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'ancient'];
  function addLogEntry(entry, isNew) {
    logEmpty.style.display = 'none';
    const li = document.createElement('li');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = entry.name;
    const r = document.createElement('span'); r.className = 'r'; r.textContent = entry.rarity;
    r.style.color = COLOR_OF[entry.rarity] || '#cbd3d8';
    li.appendChild(n); li.appendChild(r);
    if (isNew) li.className = 'new';
    logList.insertBefore(li, logList.firstChild);
    while (logList.children.length > 8) logList.removeChild(logList.lastChild);
  }

  function showReveal(f) {
    for (const c of TIERS) revealEl.classList.remove(c);
    revealEl.classList.add('hidden');
    revealEl.classList.remove('show');
    // allow the class swap to register, then animate in
    void revealEl.offsetWidth;
    revealEl.classList.remove('hidden');
    revealEl.classList.add(f.rarity.toLowerCase());
    rword.textContent = f.rarity;
    rname.textContent = f.name;
    rfish.width = f.w; rfish.height = f.h;
    const rc = rfish.getContext('2d');
    rc.imageSmoothingEnabled = false;
    rc.clearRect(0, 0, f.w, f.h);
    rc.drawImage(f.canvas, 0, 0);
    const scale = (f.h >= 22 ? 4.0 : 96 / f.h);
    rfish.style.width = (f.w * scale) + 'px';
    rfish.style.height = (f.h * scale) + 'px';
    requestAnimationFrame(function () { revealEl.classList.add('show'); });
  }
  function hideReveal() { revealEl.classList.remove('show'); setTimeout(function () { if (phase !== 'reveal') revealEl.classList.add('hidden'); }, 260); }

  // ============================================================
  // Main loop (timers pause while hidden)
  // ============================================================
  let last = performance.now();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) last = performance.now(); });

  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000;
    last = now;
    if (document.hidden) return;         // freeze timers
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;            // clamp after long stalls
    update(dt);
    render();
    refreshUI();
  }
  requestAnimationFrame(loop);
})();
