/* Tideline — game loop, state machine and test interface. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- *
   * Rarity table (exact odds, no pity/rerolls/history)
   * ---------------------------------------------------------------- */
  var RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  var ODDS = { Common: 45, Uncommon: 25, Rare: 15, Epic: 8, Legendary: 5, Ancient: 2 };
  var RARITY_COLORS = {
    Common: '#d9e2d2', Uncommon: '#8fe07a', Rare: '#6fc6ff',
    Epic: '#d08bff', Legendary: '#ffcf4d', Ancient: '#7ff0d6'
  };

  // Cumulative thresholds for u in [0,1)
  function pickRarity(u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  var log = []; // newest first

  /* ---------------------------------------------------------------- *
   * Constants
   * ---------------------------------------------------------------- */
  var CAST_DUR = 1.1;
  var WAIT_MIN = 2.6, WAIT_MAX = 4.6;
  var BITE_WINDOW = 1.25;
  var REEL_DUR = 1.5;

  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ---------------------------------------------------------------- *
   * Game state
   * ---------------------------------------------------------------- */
  var G = {
    phase: 'ready',
    t: 0,          // global animation clock
    phaseT: 0,     // time spent in the current phase
    bob: { visible: false, x: 0, y: 0, inWater: false, sag: 6, dip: 0, splash: 0 },
    castStart: { x: 0, y: 0 },
    target: { x: 200, y: 112 },
    waitDur: 3.4,
    windowLeft: BITE_WINDOW,
    biteAge: 0,
    catchName: null,
    catchRarity: null,
    catchFly: null,
    reveal: null,
    miss: 0,
    armAngle: -0.5,
    rodBend: 0,
    lean: 0,
    shake: 0
  };

  /* ---------------------------------------------------------------- *
   * UI references
   * ---------------------------------------------------------------- */
  var el = {
    action: document.getElementById('action'),
    hint: document.getElementById('hint'),
    bitecue: document.getElementById('bitecue'),
    toast: document.getElementById('toast'),
    loglist: document.getElementById('loglist'),
    logempty: document.getElementById('logempty'),
    legendrows: document.getElementById('legendrows'),
    revealcard: document.getElementById('revealcard'),
    revealrarity: document.getElementById('revealrarity'),
    revealname: document.getElementById('revealname'),
    revealsub: document.getElementById('revealsub')
  };

  // Legend
  (function buildLegend() {
    RARITIES.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'legendrow';
      row.innerHTML =
        '<span class="sw" style="background:' + RARITY_COLORS[r] + '"></span>' +
        '<span class="rname">' + r + '</span>' +
        '<span class="rpct">' + ODDS[r] + '%</span>';
      el.legendrows.appendChild(row);
    });
  })();

  /* ---------------------------------------------------------------- *
   * Transitions
   * ---------------------------------------------------------------- */
  var toastTimer = null;
  function showToast(msg, ms) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, ms || 1400);
  }

  function setPhase(p) {
    G.phase = p;
    G.phaseT = 0;
    updateHUD();
  }

  function startCast() {
    if (G.phase !== 'ready') return;
    var rod = Art.handPos();
    // rod tip at the moment of casting (approx, matches idle angle)
    G.castStart.x = rod.x + Math.cos(-0.45) * 30;
    G.castStart.y = rod.y + Math.sin(-0.45) * 30;
    // pick a landing spot in open water
    G.target.x = 168 + Math.random() * 92;
    G.target.y = 104 + Math.random() * 18;
    G.waitDur = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
    G.bob.visible = true;
    G.bob.inWater = false;
    G.bob.splash = 0;
    G.bob.sag = 5;
    G.catchName = null;
    G.catchRarity = null;
    G.catchFly = null;
    setPhase('waiting');
  }

  function startBite() {
    G.windowLeft = BITE_WINDOW;
    G.biteAge = 0;
    setPhase('bite');
  }

  function startReel() {
    if (G.phase !== 'bite') return;
    // Choose the catch once, here — a successful reel.
    var rarity = window.fishing.pickRarity(Math.random());
    var pool = Art.FISH[rarity];
    var fish = pool[Math.floor(Math.random() * pool.length)];
    G.catchRarity = rarity;
    G.catchName = fish.name;
    G.catchFly = { name: fish.name, x: G.bob.x, y: G.bob.y, scale: 1.7, rot: 0, alpha: 0 };
    setPhase('reeling');
  }

  function finishReel() {
    // Log + reveal
    log.unshift({ name: G.catchName, rarity: G.catchRarity });
    renderLog();
    G.reveal = { name: G.catchName, rarity: G.catchRarity, age: 0 };
    G.bob.visible = false;
    G.catchFly = null;
    el.revealrarity.textContent = G.catchRarity.toUpperCase();
    el.revealrarity.className = 'rr-' + G.catchRarity;
    el.revealname.textContent = G.catchName;
    el.revealsub.textContent = 'Caught at the old dock';
    el.revealcard.classList.add('show');
    setPhase('reveal');
  }

  function dismissReveal() {
    G.reveal = null;
    el.revealcard.classList.remove('show');
    setPhase('ready');
  }

  function missBite() {
    G.bob.visible = false;
    setPhase('ready');
    showToast('It got away…', 1300);
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */
  function attempt() {
    if (G.phase === 'ready') startCast();
    else if (G.phase === 'bite') startReel();
    else if (G.phase === 'reveal') dismissReveal();
    // waiting / reeling: ignore
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      attempt();
    }
  });
  el.action.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    attempt();
    el.action.blur();
  });

  /* ---------------------------------------------------------------- *
   * HUD
   * ---------------------------------------------------------------- */
  var lastHud = '';
  function updateHUD() {
    var p = G.phase;
    if (p === lastHud) return;
    lastHud = p;
    el.bitecue.classList.toggle('show', p === 'bite');
    var map = {
      ready: ['CAST', 'Press <b>SPACE</b> or the button to cast'],
      waiting: ['…', 'Waiting for a bite…'],
      bite: ['REEL!', '<b>REEL NOW!</b> Press quickly!'],
      reeling: ['…', 'Reeling it in…'],
      reveal: ['CAST AGAIN', 'Press to cast again']
    };
    var m = map[p];
    el.action.textContent = m[0];
    el.hint.innerHTML = m[1];
    el.action.classList.toggle('ready', p === 'ready' || p === 'reveal');
    el.action.classList.toggle('hot', p === 'bite');
    el.action.classList.toggle('off', p === 'waiting' || p === 'reeling');
  }

  function renderLog() {
    el.logempty.style.display = log.length ? 'none' : 'block';
    el.loglist.innerHTML = '';
    log.slice(0, 8).forEach(function (entry) {
      var li = document.createElement('li');
      var nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = entry.name;
      var rr = document.createElement('span');
      rr.className = 'rr log-' + entry.rarity;
      rr.textContent = entry.rarity;
      li.appendChild(nm);
      li.appendChild(rr);
      el.loglist.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------- *
   * Update
   * ---------------------------------------------------------------- */
  function update(dt) {
    G.t += dt;
    G.phaseT += dt;
    G.miss = Math.max(0, G.miss - dt * 2);
    G.shake = Math.max(0, G.shake - dt * 6);

    var p = G.phase;

    if (p === 'waiting') {
      var land = CAST_DUR;
      var biteAt = land + G.waitDur;
      if (G.phaseT >= biteAt) {
        G.bob.inWater = true;
        startBite();
      }
    } else if (p === 'bite') {
      G.windowLeft -= dt;
      G.biteAge += dt;
      G.shake = 0.6;
      if (G.windowLeft <= 0) missBite();
    } else if (p === 'reeling') {
      if (G.phaseT >= REEL_DUR) finishReel();
    } else if (p === 'reveal') {
      if (G.reveal) G.reveal.age += dt;
    }

    updateBobber();
    updateAngler(dt);
  }

  function updateBobber() {
    var b = G.bob;
    var rod = Art.handPos();
    var hand = { x: rod.x, y: rod.y };
    var p = G.phase;

    if (p === 'waiting') {
      if (G.phaseT < CAST_DUR) {
        var u = G.phaseT / CAST_DUR;
        b.x = PX.lerp(G.castStart.x, G.target.x, u);
        b.y = PX.lerp(G.castStart.y, G.target.y, u) - Math.sin(u * Math.PI) * 34;
        b.inWater = false;
        b.sag = 2 + u * 3;
        b.splash = 0;
        b.dip = 0;
      } else {
        b.x = G.target.x; b.y = G.target.y; b.inWater = true;
        b.sag = 7;
        b.splash = Math.max(0, b.splash - 0.05);
        b.dip = Math.sin(G.t * 2.2) * 0.6;
      }
    } else if (p === 'bite') {
      b.x = G.target.x; b.y = G.target.y; b.inWater = true;
      b.sag = 4 + Math.abs(Math.sin(G.t * 12)) * 4;
      b.dip = 3 + Math.sin(G.t * 16) * 2;
    } else if (p === 'reeling') {
      var ur = Math.min(1, G.phaseT / REEL_DUR);
      b.x = PX.lerp(G.target.x, hand.x + 4, ur * ur);
      b.y = PX.lerp(G.target.y, hand.y, ur) - Math.sin(ur * Math.PI) * 12;
      b.inWater = false;
      b.sag = 2;
      b.dip = 0;
      if (G.catchFly) {
        G.catchFly.x = b.x;
        G.catchFly.y = b.y + Math.sin(ur * Math.PI) * 4;
        G.catchFly.rot = Math.sin(ur * 12) * 0.5;
        G.catchFly.alpha = Math.min(1, Math.max(0, (ur - 0.12) * 4));
        G.catchFly.scale = 1.7 + Math.sin(ur * Math.PI) * 0.6;
      }
    }
  }

  function updateAngler(dt) {
    var p = G.phase;
    var targetAngle = -0.5, targetBend = 0.05, targetLean = 0;
    if (p === 'waiting') {
      if (G.phaseT < CAST_DUR) {
        var u = G.phaseT / CAST_DUR;
        targetAngle = PX.lerp(-1.15, -0.42, Math.sin(u * Math.PI * 0.5));
      } else {
        targetAngle = -0.44;
        targetLean = Math.sin(G.t * 1.5) * 0.4;
      }
    } else if (p === 'bite') {
      targetAngle = -0.62;
      targetBend = 0.55 + Math.sin(G.t * 20) * 0.2;
      targetLean = Math.sin(G.t * 18) * 0.6;
    } else if (p === 'reeling') {
      var ur = Math.min(1, G.phaseT / REEL_DUR);
      targetAngle = PX.lerp(-0.62, -0.85, ur);
      targetBend = 0.7 - ur * 0.4;
      targetLean = -Math.sin(ur * Math.PI) * 1.2;
    } else if (p === 'reveal') {
      targetAngle = -0.7;
    }
    // ease toward targets
    G.armAngle += (targetAngle - G.armAngle) * Math.min(1, dt * 10);
    G.rodBend += (targetBend - G.rodBend) * Math.min(1, dt * 8);
    G.lean += (targetLean - G.lean) * Math.min(1, dt * 8);
  }

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */
  function render() {
    var v = {
      phase: G.phase,
      lean: G.lean,
      armAngle: G.armAngle,
      rodBend: G.rodBend,
      bob: G.bob,
      windowFrac: G.phase === 'bite' ? G.windowLeft / BITE_WINDOW : 0,
      biteAge: G.biteAge,
      miss: G.miss,
      reveal: G.reveal,
      catchFly: G.catchFly
    };
    var sx = 0, sy = 0;
    if (G.shake > 0) {
      sx = Math.round((Math.random() - 0.5) * G.shake * 2);
      sy = Math.round((Math.random() - 0.5) * G.shake * 2);
    }
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    ctx.clearRect(-2, -2, 324, 184);
    Art.renderScene(ctx, G.t, v);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------------------------------------------------------------- *
   * Loop with visibility handling (timers pause while hidden)
   * ---------------------------------------------------------------- */
  var last = 0;
  var paused = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (document.hidden) { return; }
    if (dt > 0.05) dt = 0.05; // clamp jumps (also covers returning from hidden)
    if (dt < 0) dt = 0;
    update(dt);
    render();
  }
  document.addEventListener('visibilitychange', function () {
    last = 0; // reset so no time jump after being hidden
  });

  /* ---------------------------------------------------------------- *
   * Public test interface
   * ---------------------------------------------------------------- */
  window.fishing = {
    get state() { return G.phase; },
    pickRarity: pickRarity,
    get log() { return log.slice(); }
  };

  renderLog();
  updateHUD();
  requestAnimationFrame(frame);

  // Expose a tiny hook for the angle/flip used by the catch fly drawing.
  window.__TIDELINE__ = { G: G };

  // Scale the fixed 1280x720 stage down on smaller viewports (1:1 at 1280x720).
  (function fitStage() {
    var stage = document.getElementById('stage');
    function apply() {
      var s = Math.min(1, window.innerWidth / 1280, window.innerHeight / 720);
      stage.style.transform = s < 1 ? 'scale(' + s + ')' : '';
    }
    window.addEventListener('resize', apply);
    apply();
  })();
})();
