/* game.js — state machine, input, UI and the window.fishing test interface. */
(function () {
  "use strict";

  const { RARITY, RARITY_ORDER, RARITY_BLURB, FISH_BY_RARITY } = window.FishData;

  const RARITY_COLOR = {
    Common: "#c3ccd2",
    Uncommon: "#6fd06f",
    Rare: "#57a8e8",
    Epic: "#b06fe8",
    Legendary: "#f0c045",
    Ancient: "#45e0c8",
  };

  // ---------------------------------------------------------------------------
  // STATIC TEST INTERFACE
  // ---------------------------------------------------------------------------
  // pickRarity: pure, total, and deliberately simple so it can be replaced.
  function pickRarity(u) {
    let acc = 0;
    for (const r of RARITY_ORDER) {
      acc += RARITY[r];
      if (u < acc) return r;
    }
    return "Ancient";
  }

  const game = {
    state: "ready",
    elapsed: 0,
    log: [],                 // newest first
    bobber: { x: 210, y: 100 },
    bobberTarget: { x: 210, y: 100 },
    inWater: false,
    cast: null,              // { t, dur, x0, y0, cx, cy, x1, y1 }
    waitTimer: 0,
    biteWindow: 0,
    biteDip: 0,
    reelTimer: 0,
    revealTimer: 0,
    revealLock: 0,
    actionLock: 0,
    anglerLean: 0,
    anglerTwitch: 0,
    anglerBaseY: 160,
    rod: { hx: 169, hy: 147, tx: 150, ty: 122 },
    particles: [],
    pendingCatch: null,
    hintOverride: "",
    hintTimer: 0,
    readyFlash: 0,
  };

  const fishing = {
    get state() { return game.state; },
    pickRarity,
    log: game.log,
  };
  window.fishing = fishing;

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const els = {
    canvas: document.getElementById("game"),
    hint: document.getElementById("hint"),
    castBtn: document.getElementById("castBtn"),
    logList: document.getElementById("logList"),
    legend: document.getElementById("legend"),
    revealCard: document.getElementById("revealCard"),
    revealCanvas: document.getElementById("revealFish"),
    revealName: document.getElementById("revealName"),
    revealRarity: document.getElementById("revealRarity"),
    revealBlurb: document.getElementById("revealBlurb"),
  };
  const rctx = els.revealCanvas.getContext("2d");
  rctx.imageSmoothingEnabled = false;

  const view = document.createElement("canvas");
  view.width = 320;
  view.height = 180;
  const vctx = view.getContext("2d");
  vctx.imageSmoothingEnabled = false;
  const ctx = els.canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // build the legend once
  (function buildLegend() {
    for (const r of RARITY_ORDER) {
      const row = document.createElement("div");
      row.className = "legend-row";
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = RARITY_COLOR[r];
      const name = document.createElement("span");
      name.className = "legend-name";
      name.textContent = r;
      const pct = document.createElement("span");
      pct.className = "legend-pct";
      pct.textContent = (RARITY[r] * 100) + "%";
      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(pct);
      els.legend.appendChild(row);
    }
  })();

  // ---------------------------------------------------------------------------
  // PARTICLES
  // ---------------------------------------------------------------------------
  function spawnSplash(x, y, n, colors, spread) {
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * (spread || 1.6);
      const sp = 18 + Math.random() * 40;
      game.particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        gravity: 90,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        color: colors[(Math.random() * colors.length) | 0],
        size: Math.random() < 0.4 ? 2 : 1,
        grow: false,
      });
    }
  }

  function spawnBurst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 10 + Math.random() * 55;
      game.particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 15,
        gravity: 30,
        life: 0.5 + Math.random() * 0.9,
        maxLife: 1.4,
        color: colors[(Math.random() * colors.length) | 0],
        size: Math.random() < 0.5 ? 2 : 1,
        grow: false,
      });
    }
  }

  function spawnRipples(x, y) {
    for (let i = 0; i < 3; i++) {
      const p = {
        x: x - 3 + i * 3, y: y + 1,
        vx: (i - 1) * 14, vy: 0, gravity: 0,
        life: 0.5 + i * 0.12, maxLife: 0.9,
        color: "rgba(220,248,242,0.9)", size: 1, grow: false,
      };
      game.particles.push(p);
    }
  }

  function updateParticles(dt) {
    const arr = game.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
  }

  // ---------------------------------------------------------------------------
  // STATE TRANSITIONS
  // ---------------------------------------------------------------------------
  function startCast() {
    game.state = "waiting";
    game.inWater = false;
    game.readyFlash = 0;
    setHint("Cast! Watch the bobber…");
    // choose a landing spot in the sea
    game.bobberTarget = {
      x: 200 + Math.round(Math.random() * 84),
      y: 74 + Math.round(Math.random() * 46),
    };
    const rest = rodRest();
    game.cast = {
      t: 0,
      dur: 0.52,
      x0: rest.tx, y0: rest.ty,
      x1: game.bobberTarget.x, y1: game.bobberTarget.y,
      cx: (rest.tx + game.bobberTarget.x) / 2,
      cy: Math.min(rest.ty, game.bobberTarget.y) - 42,
      released: false,
    };
    game.bobber.x = rest.tx;
    game.bobber.y = rest.ty;
    spawnSplash(game.bobberTarget.x, game.bobberTarget.y + 1, 6, ["#e9fbf6", "#b6e2df"], 1.2);
  }

  function beginBite() {
    game.state = "bite";
    game.biteWindow = 1.5;
    game.biteDip = 0;
    setHint("BITE! Reel in!", true);
    spawnSplash(game.bobber.x, game.bobber.y + 2, 10, ["#e9fbf6", "#ffffff", "#b6e2df"], 2.0);
    spawnRipples(game.bobber.x, game.bobber.y);
    flashButton();
  }

  function missBite() {
    game.state = "ready";
    game.inWater = false;
    game.biteWindow = 0;
    setHint("It slipped away… cast again.", false, 2.0);
    spawnRipples(game.bobber.x, game.bobber.y);
    spawnSplash(game.bobber.x, game.bobber.y + 2, 5, ["#b6e2df"], 1.4);
    game.bobber.x = 150;
    game.bobber.y = 122;
  }

  function reelIn() {
    game.state = "reeling";
    game.reelTimer = 0.95;
    setHint("Reeling it in…", true);
    spawnSplash(game.bobber.x, game.bobber.y + 2, 14, ["#e9fbf6", "#ffffff", "#8fd8e8"], 2.4);
    spawnRipples(game.bobber.x, game.bobber.y);

    // Determine the catch now, via the replaceable test interface.
    const rarity = window.fishing.pickRarity(Math.random());
    const pool = FISH_BY_RARITY[rarity];
    const fish = pool[(Math.random() * pool.length) | 0];
    game.pendingCatch = { name: fish.name, rarity: rarity, def: fish };

    // Log every successful catch, newest first.
    window.fishing.log.unshift({ name: fish.name, rarity: rarity });
    renderLog();
  }

  function finishReveal() {
    game.state = "reveal";
    game.revealTimer = 0;
    game.revealLock = 0.55;
    const c = game.pendingCatch;
    showReveal(c);
    // celebratory burst in the scene
    const col = [RARITY_COLOR[c.rarity], "#ffffff", "#ffe9a8"];
    spawnBurst(160, 120, tierBurst(c.rarity), col);
  }

  function toReady() {
    game.state = "ready";
    game.pendingCatch = null;
    game.bobber.x = 150;
    game.bobber.y = 122;
    game.inWater = false;
    els.revealCard.classList.remove("show");
    els.revealCard.className = "reveal-card";
    setHint("Cast again: SPACE or the CAST button.");
  }

  function tierBurst(r) {
    return { Common: 8, Uncommon: 13, Rare: 20, Epic: 30, Legendary: 44, Ancient: 38 }[r] || 8;
  }

  // ---------------------------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------------------------
  function onAction() {
    if (document.hidden) return;
    if (game.actionLock > 0) return;
    switch (game.state) {
      case "ready":
        startCast();
        break;
      case "bite":
        reelIn();
        break;
      case "reveal":
        if (game.revealLock <= 0) toReady();
        break;
      default:
        break; // waiting / reeling: safe no-op
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (e.repeat) return;
      onAction();
    }
  }, { passive: false });

  els.castBtn.addEventListener("click", (e) => {
    e.preventDefault();
    onAction();
  });

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  function setHint(text, urgent, time) {
    els.hint.textContent = text;
    els.hint.classList.toggle("urgent", !!urgent);
    game.hintTimer = time || 0;
  }

  function flashButton() {
    els.castBtn.classList.remove("pulse");
    void els.castBtn.offsetWidth;
    els.castBtn.classList.add("pulse");
  }

  function renderLog() {
    els.logList.innerHTML = "";
    const recent = window.fishing.log.slice(0, 8);
    if (recent.length === 0) {
      const empty = document.createElement("li");
      empty.className = "log-empty";
      empty.textContent = "no catches yet";
      els.logList.appendChild(empty);
      return;
    }
    recent.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "log-item" + (i === 0 ? " newest" : "");
      li.style.setProperty("--rar", RARITY_COLOR[entry.rarity]);
      const n = document.createElement("span");
      n.className = "log-name";
      n.textContent = entry.name;
      const r = document.createElement("span");
      r.className = "log-rar";
      r.textContent = entry.rarity;
      li.appendChild(n);
      li.appendChild(r);
      els.logList.appendChild(li);
    });
  }

  function showReveal(c) {
    const f = c.def;
    // card tier styling
    els.revealCard.className = "reveal-card show tier-" + c.rarity.toLowerCase();
    els.revealName.textContent = c.name;
    els.revealRarity.textContent = c.rarity;
    els.revealRarity.style.color = RARITY_COLOR[c.rarity];
    els.revealBlurb.textContent = RARITY_BLURB[c.rarity];

    // draw the fish sprite (small fish are scaled up so every catch feels substantial)
    rctx.clearRect(0, 0, 64, 36);
    const s = (f.len <= 18 && f.special !== "ray") ? 2 : 1;
    window.Art.drawFishSprite(rctx, f, 32, 18, s, 0);
  }

  function updateUI() {
    const b = els.castBtn;
    switch (game.state) {
      case "ready":
        b.textContent = "CAST";
        b.disabled = false;
        b.className = "cast-btn ready";
        break;
      case "waiting":
        b.textContent = "WAIT…";
        b.disabled = true;
        b.className = "cast-btn waiting";
        break;
      case "bite":
        b.textContent = "REEL IN!";
        b.disabled = false;
        b.className = "cast-btn bite";
        break;
      case "reeling":
        b.textContent = "…";
        b.disabled = true;
        b.className = "cast-btn reeling";
        break;
      case "reveal":
        b.textContent = "CONTINUE";
        b.disabled = game.revealLock > 0;
        b.className = "cast-btn reveal";
        break;
    }
    // contextual hint (unless overridden)
    if (game.state === "ready" && game.hintTimer <= 0) {
      setHint("SPACE or CAST to cast your line.");
    } else if (game.state === "waiting" && game.hintTimer <= 0) {
      setHint("Watch the bobber…");
    } else if (game.state === "bite") {
      els.hint.classList.add("urgent");
    } else if (game.state === "reeling" && game.hintTimer <= 0) {
      setHint("Reeling it in…", true);
    } else if (game.state === "reveal" && game.hintTimer <= 0) {
      setHint("Nice catch!  SPACE or CONTINUE.");
    }
    if (game.hintTimer > 0) game.hintTimer -= 1 / 60;
    if (game.hintTimer <= 0 && game.state !== "bite" && game.state !== "reeling") {
      els.hint.classList.remove("urgent");
    }
  }

  // ---------------------------------------------------------------------------
  // ROD / BOBBER POSITIONS
  // ---------------------------------------------------------------------------
  function rodRest() {
    const baseY = game.anglerBaseY;
    const sway = Math.sin(game.elapsed * 1.4) * 0.8;
    return { hx: 168, hy: baseY - 12, tx: 150 + sway, ty: baseY - 38 + sway * 0.4 };
  }

  function updateRod() {
    const baseY = game.anglerBaseY;
    let tip;
    if (game.cast) {
      const p = game.cast.t / game.cast.dur;
      const rest = rodRest();
      let back, fwd;
      back = { x: 186, y: baseY - 30 };
      fwd = { x: 146, y: baseY - 41 };
      if (p < 0.32) {
        const k = p / 0.32;
        tip = lerpPt(rest, back, ease(k));
      } else if (p < 0.66) {
        const k = (p - 0.32) / 0.34;
        tip = lerpPt(back, fwd, ease(k));
      } else {
        const k = (p - 0.66) / 0.34;
        tip = lerpPt(fwd, rest, ease(k));
      }
    } else if (game.state === "reeling") {
      const bend = Math.sin(game.elapsed * 20) * 1.0;
      tip = { x: 156, y: baseY - 30 + bend };
    } else if (game.state === "bite") {
      const j = Math.sin(game.elapsed * 24) * 1.4;
      tip = { x: 150 + j, y: baseY - 38 + j };
    } else {
      const rest = rodRest();
      tip = { x: rest.tx, y: rest.ty };
    }
    game.rod = { hx: 168, hy: baseY - 12, tx: tip.x, ty: tip.y };
  }

  const ease = (k) => k * k * (3 - 2 * k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpPt = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------
  function update(dt) {
    game.elapsed += dt;
    if (game.actionLock > 0) game.actionLock -= dt;
    if (game.readyFlash > 0) game.readyFlash -= dt;

    const bob = Math.sin(game.elapsed * 2.2) * 0.5;
    let lean = 0;
    let twitch = 0;
    if (game.state === "reeling") lean = 1 + Math.sin(game.elapsed * 18) * 0.6;
    else if (game.state === "bite") { lean = Math.max(0, Math.sin(game.elapsed * 20)) * 0.6; twitch = Math.sin(game.elapsed * 24) * 1.2; }
    game.anglerLean = lean;
    game.anglerTwitch = twitch;
    game.anglerBaseY = 160 + Math.round(bob) + Math.round(lean);
    updateRod();

    if (game.cast) {
      game.cast.t += dt;
      const p = Math.min(1, game.cast.t / game.cast.dur);
      const c = game.cast;
      // quadratic bezier
      const q = 1 - p;
      game.bobber.x = q * q * c.x0 + 2 * q * p * c.cx + p * p * c.x1;
      game.bobber.y = q * q * c.y0 + 2 * q * p * c.cy + p * p * c.y1;
      if (p >= 1) {
        game.cast = null;
        game.bobber.x = game.bobberTarget.x;
        game.bobber.y = game.bobberTarget.y;
        game.inWater = true;
        game.waitTimer = 1.8 + Math.random() * 2.4;
        spawnSplash(game.bobber.x, game.bobber.y + 2, 9, ["#e9fbf6", "#b6e2df", "#ffffff"], 1.8);
        spawnRipples(game.bobber.x, game.bobber.y);
      }
    } else if (game.state === "waiting") {
      game.waitTimer -= dt;
      if (game.waitTimer <= 0) beginBite();
    } else if (game.state === "bite") {
      game.biteWindow -= dt;
      game.biteDip = Math.sin(game.elapsed * 22) * 1.5 - 1;
      if (game.biteWindow <= 0) missBite();
    } else if (game.state === "reeling") {
      game.reelTimer -= dt;
      // pull bobber toward the rod tip
      const rod = game.rod;
      const k = 1 - Math.max(0, game.reelTimer) / 0.95;
      const tgt = { x: rod.tx, y: rod.ty + 2 };
      game.bobber.x = lerp(game.bobber.x, tgt.x, Math.min(1, dt * 5 + k * 0.3));
      game.bobber.y = lerp(game.bobber.y, tgt.y, Math.min(1, dt * 5 + k * 0.3));
      game.inWater = game.reelTimer > 0.35;
      if (game.reelTimer <= 0) finishReveal();
    } else if (game.state === "reveal") {
      game.revealTimer += dt;
      if (game.revealLock > 0) game.revealLock -= dt;
      // occasional celebratory sparkle
      if (Math.random() < 0.12) {
        const c = game.pendingCatch;
        spawnBurst(150 + Math.random() * 20, 100 + Math.random() * 40, 1,
          [RARITY_COLOR[c.rarity], "#ffffff"]);
      }
    }

    updateParticles(dt);
  }

  // ---------------------------------------------------------------------------
  // RENDER LOOP
  // ---------------------------------------------------------------------------
  function render() {
    window.Art.drawScene(vctx, game.elapsed, game);
    ctx.clearRect(0, 0, 1280, 720);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(view, 0, 0, 1280, 720);
  }

  let lastTime = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { lastTime = now; return; }
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.05) dt = 0.05;      // clamp big gaps
    if (dt < 0) dt = 0;
    update(dt);
    render();
    updateUI();
  }

  document.addEventListener("visibilitychange", () => {
    lastTime = performance.now();
  });

  // init
  renderLog();
  setHint("SPACE or CAST to cast your line.");
  requestAnimationFrame(loop);
})();
