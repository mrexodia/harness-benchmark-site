"use strict";
/* ------------------------------------------------------------------ *
 *  game.js - state machine, scene composition, main loop              *
 * ------------------------------------------------------------------ */
(function () {
  const scene = document.getElementById("scene");
  const sctx = scene.getContext("2d");
  sctx.imageSmoothingEnabled = false;
  const ui = document.getElementById("ui");
  const uctx = ui.getContext("2d");
  const btn = document.getElementById("actionBtn");

  /* ---------------- public test interface ---------------- */
  window.fishing = {
    state: "ready",
    pickRarity: function (u) {
      let acc = 0;
      for (let i = 0; i < RARITY_TABLE.length; i++) {
        acc += RARITY_TABLE[i][1];
        if (u < acc) return RARITY_TABLE[i][0];
      }
      return "Ancient";
    },
    log: [],
  };

  /* ---------------- scene pieces ---------------- */
  const BG = bakeScene();
  const FG = bakeForeground();

  const ANGLER = { x: 124, y: 78 };
  const TARGET = { x: 212, y: 104 };

  const G = {
    phase: "ready",
    time: 0,
    log: window.fishing.log,
    hint: "space to cast",
    intro: true,
    introFade: 1,
    introT: 0,
    bobber: { x: TARGET.x, y: TARGET.y },
    bobberVisible: false,
    castT: 0, waitT: 0, waitDur: 0, biteT: 0, biteDur: 1.5,
    reelT: 0, revealT: 0,
    rarity: null, species: null,
    message: null, messageT: 0, messageLife: 1.3,
    splashT: 1.2,
  };

  /* timings (seconds) */
  const CAST_DUR = 0.5;
  const REEL_DUR = 1.4;
  const REVEAL_MIN = 1.0;
  const REVEAL_AUTO = 3.4;

  function setPhase(p) {
    G.phase = p;
    window.fishing.state = p;
    G.hint = {
      ready: "space to cast",
      waiting: "watch the bobber…",
      bite: "press now!",
      reeling: "hold on!",
      reveal: "space to cast again",
    }[p] || "";
  }

  /* ---------------- input ---------------- */
  let actionQueued = false;
  function queueAction() { actionQueued = true; }

  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (!e.repeat) queueAction();
    }
  });
  btn.addEventListener("click", function (e) { e.preventDefault(); queueAction(); });

  /* ---------------- helpers ---------------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeIn(t) { return t * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function rodAngle() {
    if (G.phase === "ready") return -0.5;
    if (G.phase === "waiting" && G.castT < CAST_DUR) {
      const u = G.castT / CAST_DUR;
      if (u < 0.4) return lerp(-0.5, -2.2, easeIn(u / 0.4));
      return lerp(-2.2, 0.14, easeOut((u - 0.4) / 0.6));
    }
    if (G.phase === "waiting") return -0.5 + Math.sin(G.time * 3) * 0.02;
    if (G.phase === "bite") return -0.55 + Math.sin(G.time * 32) * 0.07;
    if (G.phase === "reeling") return -0.85 + Math.sin(G.time * 13) * 0.45;
    if (G.phase === "reveal") return -0.35;
    return -0.5;
  }
  function anglerPose() {
    if (G.phase === "reeling") return 3;
    if (G.phase === "waiting" || G.phase === "bite") return 1;
    return 0;
  }

  function drawRod(g, px, py, ang) {
    const L = 30;
    const tx = px + Math.cos(ang) * L;
    const ty = py + Math.sin(ang) * L;
    drawLine(g, px, py, tx, ty, 0, PAL.rod);
    /* lighter upper edge near the grip */
    drawLine(g, px, py - 1, px + Math.cos(ang) * 8, py + Math.sin(ang) * 8 - 1, 0, PAL.rodL);
    /* reel */
    rect(g, px - 2, py + 1, 4, 3, PAL.rod);
    rect(g, px - 1, py + 2, 2, 1, PAL.rodL);
    return { x: tx, y: ty };
  }

  /* ---------------- underwater shadows ---------------- */
  const shadows = [
    { x: 60, y: 150, s: 1.0, sp: 6, ph: 0 },
    { x: 250, y: 60, s: 0.8, sp: 9, ph: 2 },
    { x: 180, y: 165, s: 1.2, sp: 7, ph: 4 },
  ];
  function drawShadows(g, t) {
    g.globalAlpha = 0.28;
    g.fillStyle = "#0d3648";
    for (const sh of shadows) {
      const x = 40 + ((sh.x + t * sh.sp) % 280);
      const y = sh.y + Math.sin(t * 1.2 + sh.ph) * 6;
      /* pixel ellipse body + pixel triangle tail */
      const rx = 9 * sh.s, ry = 4 * sh.s;
      for (let yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) {
        for (let xx = -Math.ceil(rx); xx <= Math.ceil(rx); xx++) {
          if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1) {
            g.fillRect(Math.round(x) + xx, Math.round(y) + yy, 1, 1);
          }
        }
      }
      for (let i = 0; i < 4 * sh.s; i++) {
        const hh = Math.round((i + 1) * 0.7);
        g.fillRect(Math.round(x - rx - i), Math.round(y) - hh, 1, hh * 2 + 1);
      }
    }
    g.globalAlpha = 1;
  }

  /* ambient rings where the odd fish rises far out in the bay */
  const AMBIENT = [
    [58, 142, 2.3, 0.0], [288, 84, 3.1, 0.5], [178, 164, 2.8, 1.3], [242, 44, 3.6, 1.9],
  ];
  function drawAmbient(g, t) {
    for (const [x, y, sp, ph] of AMBIENT) {
      const p = ((t / sp) + ph) % 1;
      const r = 1 + p * 8;
      g.globalAlpha = Math.max(0, 1 - p) * 0.6;
      const steps = 18;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        rect(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, 1, 1, PAL.wFoam);
      }
      g.globalAlpha = 1;
    }
  }

  /* a couple of butterflies over the grass */
  const CRITTERS = [[46, 60, 11, 6, 0.0], [88, 33, 13, 5, 1.7]];
  function drawCritters(g, t) {
    for (const [cx, cy, rx, ry, ph] of CRITTERS) {
      const x = Math.round(cx + Math.sin(t * 0.85 + ph) * rx);
      const y = Math.round(cy + Math.sin(t * 1.6 + ph * 2) * ry);
      const flap = Math.sin(t * 17 + ph) > 0;
      rect(g, x, y + 2, 1, 1, "rgba(0,0,0,0.18)");
      rect(g, x, y, 1, 1, PAL.ink);
      const wc = ph === 0 ? PAL.pinkL : PAL.yellowL;
      if (flap) { rect(g, x - 1, y - 1, 1, 1, wc); rect(g, x + 1, y - 1, 1, 1, wc); }
      else { rect(g, x - 1, y, 1, 1, wc); rect(g, x + 1, y, 1, 1, wc); }
    }
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    G.time += dt;
    const act = actionQueued;
    actionQueued = false;

    if (G.message) {
      G.messageT += dt;
      if (G.messageT >= G.messageLife) { G.message = null; }
    }
    if (G.splashT < 1.2) G.splashT += dt;
    if (G.intro) {
      G.introT += dt;
      if (act || G.phase !== "ready") {
        G.intro = false;
      } else if (G.introT > 7) {
        G.introFade = Math.max(0, 1 - (G.introT - 7) / 1.2);
        if (G.introFade <= 0) G.intro = false;
      }
    }

    switch (G.phase) {
      case "ready": {
        G.bobberVisible = false;
        if (act) {
          G.intro = false;
          G.castT = 0;
          G.waitT = 0;
          G.waitDur = CAST_DUR + 1.7 + Math.random() * 1.8;
          setPhase("waiting");
        }
        break;
      }
      case "waiting": {
        G.castT += dt;
        G.waitT += dt;
        const u = clamp(G.castT / CAST_DUR, 0, 1);
        /* rod tip start (idle angle) */
        const a0 = -0.5;
        const sx = ANGLER.x + 8 + Math.cos(a0) * 30;
        const sy = ANGLER.y - 12 + Math.sin(a0) * 30;
        G.bobber.x = lerp(sx, TARGET.x, u);
        G.bobber.y = lerp(sy, TARGET.y, u) - Math.sin(u * Math.PI) * 9;
        G.bobberVisible = true;
        if (u >= 1) {
          G.splashT = 0;
          if (G.waitT >= G.waitDur) {
            G.biteT = 0;
            setPhase("bite");
          }
        }
        break;
      }
      case "bite": {
        G.biteT += dt;
        const dip = Math.sin(G.biteT * 26) * 1.4;
        G.bobber.x = TARGET.x + Math.sin(G.time * 4) * 0.6;
        G.bobber.y = TARGET.y + 2.4 + dip;
        if (act) {
          startReel();
        } else if (G.biteT >= G.biteDur) {
          /* missed the window */
          G.message = "It got away…";
          G.messageT = 0;
          G.bobberVisible = false;
          setPhase("ready");
        }
        break;
      }
      case "reeling": {
        G.reelT += dt;
        const u = easeIn(clamp(G.reelT / REEL_DUR, 0, 1));
        G.bobber.x = lerp(TARGET.x, ANGLER.x + 20, u);
        G.bobber.y = lerp(TARGET.y, ANGLER.y - 6, u);
        if (G.reelT >= REEL_DUR) {
          G.revealT = 0;
          setPhase("reveal");
        }
        break;
      }
      case "reveal": {
        G.revealT += dt;
        G.bobberVisible = false;
        if ((act && G.revealT >= REVEAL_MIN) || G.revealT >= REVEAL_AUTO) {
          setPhase("ready");
        }
        break;
      }
    }
  }

  function startReel() {
    /* Every successful catch goes through the public, replaceable function. */
    const rarity = window.fishing.pickRarity(Math.random());
    const sp = pickSpecies(rarity);
    G.rarity = rarity;
    G.species = sp;
    if (!Array.isArray(window.fishing.log)) window.fishing.log = [];
    window.fishing.log.unshift({ name: sp.name, rarity: rarity });
    G.log = window.fishing.log;
    G.reelT = 0;
    G.splashT = 0;
    setPhase("reeling");
  }

  /* ---------------- render ---------------- */
  function render(t) {
    const g = sctx;
    g.imageSmoothingEnabled = false;
    drawWater(g, t);
    g.drawImage(BG, 0, 0);

    drawShadows(g, t);
    drawAmbient(g, t);
    drawCritters(g, t);

    /* line + bobber (under the angler) */
    const pose = anglerPose();
    const bob = Math.sin(t * 2.1) * 0.6;
    const bodyY = Math.round(ANGLER.y + (pose === 3 ? Math.sin(t * 14) * 0.7 : bob));
    const pivot = { x: ANGLER.x + 8, y: bodyY - 11 };
    const ang = rodAngle();
    const tip = {
      x: pivot.x + Math.cos(ang) * 30,
      y: pivot.y + Math.sin(ang) * 30,
    };

    if (G.bobberVisible && G.phase !== "reeling") {
      drawLine(g, tip.x, tip.y, G.bobber.x, G.bobber.y, 3 + Math.sin(t * 2) * 0.6, "#e9e7d8");
    } else if (pose === 0) {
      /* dangling hook line when idle */
      drawLine(g, tip.x, tip.y, tip.x + 1, tip.y + 6, 1, "#e9e7d8");
    }

    /* reeling: leaping catch (position computed before the rod so the line can reach it) */
    let leap = null;
    if (G.phase === "reeling" && G.species) {
      const u = clamp(G.reelT / REEL_DUR, 0, 1);
      const lf = Math.sin(Math.min(1, u * 1.35) * Math.PI);
      leap = { x: lerp(G.bobber.x, ANGLER.x + 24, 0.5), y: G.bobber.y - lf * 26, lf: lf, u: u };
    }
    if (leap) {
      drawLine(g, tip.x, tip.y, leap.x, leap.y, 1, "#e9e7d8");
      sctx.save();
      sctx.imageSmoothingEnabled = false;
      sctx.translate(leap.x, leap.y);
      sctx.rotate(-0.4 + leap.lf * 0.9);
      const sc = 1.25;
      sctx.globalAlpha = leap.u < 0.8 ? 1 : (1 - leap.u) / 0.2;
      sctx.drawImage(G.species.canvas,
        -G.species.canvas.width * sc / 2, -G.species.canvas.height * sc / 2,
        G.species.canvas.width * sc, G.species.canvas.height * sc);
      sctx.restore();
      sctx.globalAlpha = 1;
    }

    drawAngler(g, ANGLER.x, bodyY, pose);
    drawRod(g, pivot.x, pivot.y, ang);

    if (G.bobberVisible && G.phase !== "reeling") drawBobber(g, G.bobber.x, G.bobber.y, t, G.phase === "bite");
    if (G.splashT < 0.55 && G.bobberVisible && G.phase !== "bite") {
      drawSplash(g, G.bobber.x, G.bobber.y, G.splashT);
    }

    g.drawImage(FG, 0, 0);

    drawUI(uctx, G, t);

    /* button label / state */
    const label = {
      ready: "CAST", waiting: "WAITING…", bite: "REEL!",
      reeling: "REELING…", reveal: "CAST AGAIN",
    }[G.phase];
    if (btn.textContent !== label) btn.textContent = label;
    btn.className = G.phase === "bite" ? "bite" : G.phase === "waiting" ? "waiting"
      : G.phase === "reveal" ? "reveal" : "";
  }

  /* ---------------- loop ---------------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (document.hidden) return;
    dt = Math.min(dt, 0.05);
    update(dt);
    render(G.time);
  }
  document.addEventListener("visibilitychange", function () { last = performance.now(); });
  requestAnimationFrame(frame);

  /* keep the fixed 1280x720 stage visible on smaller viewports */
  function fit() {
    const s = Math.min(1, window.innerWidth / 1280, window.innerHeight / 720);
    const f = document.getElementById("fit");
    f.style.transform = s < 1 ? "scale(" + s + ")" : "none";
  }
  window.addEventListener("resize", fit);
  fit();

  /* expose for manual inspection (not required, but harmless) */
  window.__game = G;
})();
