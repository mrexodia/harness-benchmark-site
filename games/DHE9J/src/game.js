/* ============================================================
   Driftwood Bay — game loop, state machine and UI
   ============================================================ */
(function () {
  'use strict';
  const Art = window.Art;
  const Data = window.FishingData;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const actionBtn = document.getElementById('action');
  const hintEl = document.getElementById('hint');
  const logList = document.getElementById('log-list');
  const revealEl = document.getElementById('reveal');
  const revealName = document.getElementById('reveal-name');
  const revealRarity = document.getElementById('reveal-rarity');
  const introEl = document.getElementById('intro');

  // -------------------------------------------------- timing
  const DUR = { cast: 0.6, bite: 1.2, reel: 1.0, reveal: 2.6 };
  const MISS_LEN = 0.55;

  // -------------------------------------------------- state
  const S = {
    phase: 'ready',   // ready | waiting | bite | reeling | reveal
    phaseT: 0,
    waitDur: 0,
    seed: 0.5,
    fish: null,
    missT: 0,
    revealed: null   // {name, rarity}
  };

  // -------------------------------------------------- test interface
  const log = [];             // live session log, newest first

  function pickRarity(u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  window.fishing = {
    pickRarity: pickRarity,
    log: log,
    get state() { return S.phase; }
  };

  // -------------------------------------------------- helpers
  function chooseFish(rarity) {
    const pool = Data.FISH[rarity];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // -------------------------------------------------- actions
  let inputLock = false;   // guards against duplicate actions in one tick

  function action() {
    if (inputLock) return;
    if (S.phase === 'ready') {
      startCast();
    } else if (S.phase === 'bite') {
      catchFish();
    } else if (S.phase === 'reveal') {
      hideIntro();
      S.phase = 'ready'; S.phaseT = 0; S.revealed = null;
      syncUI();
    }
    // waiting / reeling ignore input
  }

  function startCast() {
    hideIntro();
    S.phase = 'casting'; S.phaseT = 0;
    S.seed = Math.random();
    S.fish = null;
    S.missT = 0;
    S.revealed = null;
    syncUI();
  }

  function catchFish() {
    const rarity = window.fishing.pickRarity(Math.random());
    const fish = chooseFish(rarity);
    S.fish = fish;
    log.unshift({ name: fish.name, rarity: rarity });
    S.phase = 'reeling'; S.phaseT = 0;
    renderLog();
    syncUI();
  }

  function missBite() {
    S.phase = 'ready'; S.phaseT = 0;
    S.missT = MISS_LEN;
    S.seed = S.seed; // keep
    syncUI();
  }

  function finishReel() {
    S.phase = 'reveal'; S.phaseT = 0;
    S.revealed = log[0] || null;
    renderReveal();
    syncUI();
  }

  // -------------------------------------------------- update
  function update(dt) {
    if (S.missT > 0) S.missT = Math.max(0, S.missT - dt);
    S.phaseT += dt;

    switch (S.phase) {
      case 'casting':
        if (S.phaseT >= DUR.cast) { S.phase = 'waiting'; S.phaseT = 0; S.waitDur = 1.6 + Math.random() * 1.9; syncUI(); }
        break;
      case 'waiting':
        if (S.phaseT >= S.waitDur) { S.phase = 'bite'; S.phaseT = 0; syncUI(); }
        break;
      case 'bite':
        if (S.phaseT >= DUR.bite) { missBite(); }
        break;
      case 'reeling':
        if (S.phaseT >= DUR.reel) { finishReel(); }
        break;
      case 'reveal':
        if (S.phaseT >= DUR.reveal) { S.phase = 'ready'; S.phaseT = 0; S.revealed = null; syncUI(); }
        break;
    }
  }

  // -------------------------------------------------- UI
  const HINTS = {
    ready: 'Press <b>Space</b> or tap <b>Cast</b>',
    casting: 'Casting the line\u2026',
    waiting: 'Wait for a bite\u2026',
    bite: '<b>BITE!</b> Reel in now!',
    reeling: 'Reeling it in\u2026',
    reveal: ''
  };
  const BTN = {
    ready: ['CAST', ''],
    casting: ['\u2026', 'busy'],
    waiting: ['\u2026', 'busy'],
    bite: ['REEL!', 'reel'],
    reeling: ['\u2026', 'busy'],
    reveal: ['NEXT', '']
  };

  function syncUI() {
    const h = HINTS[S.phase] || '';
    hintEl.innerHTML = h;
    const b = BTN[S.phase] || BTN.ready;
    actionBtn.textContent = b[0];
    actionBtn.className = b[1];
    actionBtn.disabled = (S.phase === 'casting' || S.phase === 'waiting' || S.phase === 'reeling');
    if (S.phase === 'reveal' && S.revealed) {
      revealEl.classList.remove('hidden');
      revealRarity.textContent = S.revealed.rarity;
      revealRarity.className = 'r-' + S.revealed.rarity;
      revealName.textContent = S.revealed.name;
    } else {
      revealEl.classList.add('hidden');
    }
  }

  function renderLog() {
    const recent = log.slice(0, 8);
    if (!recent.length) {
      logList.innerHTML = '<li class="empty">No catches yet</li>';
      return;
    }
    logList.innerHTML = recent.map(function (e) {
      return '<li class="r-' + e.rarity + '"><span class="dot"></span>' +
        '<span class="nm">' + e.name + '</span><span class="rr">' + e.rarity + '</span></li>';
    }).join('');
  }

  function renderReveal() {
    if (S.revealed) {
      revealRarity.textContent = S.revealed.rarity;
      revealRarity.className = 'r-' + S.revealed.rarity;
      revealName.textContent = S.revealed.name;
      revealEl.classList.remove('hidden');
    }
  }

  let introDone = false;
  function hideIntro() {
    if (introDone) return;
    introDone = true;
    if (introEl) { introEl.classList.add('gone'); }
  }

  // -------------------------------------------------- input
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) action();
    }
  });
  actionBtn.addEventListener('click', function (e) { e.preventDefault(); action(); });
  canvas.addEventListener('pointerdown', function () { action(); });

  // -------------------------------------------------- clock / loop
  let clock = 0;
  let last = performance.now();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) last = performance.now();
  });

  function view() {
    return {
      phase: S.phase,
      phaseT: S.phaseT,
      dur: DUR,
      seed: S.seed,
      fish: S.fish,
      missP: S.missT > 0 ? (1 - S.missT / MISS_LEN) : null
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;              // timers pause while hidden
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;                 // clamp long frames
    clock += dt;
    update(dt);

    const g = view();
    Art.drawWorld(ctx, clock, g);
    if (S.phase === 'reveal' && S.fish) {
      Art.drawReveal(ctx, clock, S.fish, S.revealed ? S.revealed.rarity : 'Common',
        Math.min(1, S.phaseT / 0.35));
    }
  }

  renderLog();
  syncUI();

  // fit the fixed 16:9 stage into the viewport (no scrolling)
  const stage = document.getElementById('stage');
  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // intro overlay
  const introStart = performance.now();
  (function introTick() {
    if (!introDone && performance.now() - introStart > 5200) hideIntro();
    if (!introDone) setTimeout(introTick, 200);
  })();

  requestAnimationFrame(frame);
})();
