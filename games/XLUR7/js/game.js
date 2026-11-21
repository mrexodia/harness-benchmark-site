/* game.js - Tidebloom Cove fishing loop, HUD and reveal presentation. */
(function () {
  const U = window.FishUtil;
  const Scene = window.Scene;
  const FishArt = window.FishArt;

  // ------------------------------------------------------------------ API ---
  // Pure, exactly the six published odds. No state, no pity, no history.
  function pickRarity(u) {
    if (u < 0.45) return "Common";
    if (u < 0.70) return "Uncommon";
    if (u < 0.85) return "Rare";
    if (u < 0.93) return "Epic";
    if (u < 0.98) return "Legendary";
    return "Ancient";
  }

  const fishing = window.fishing = {
    state: "ready",
    pickRarity: pickRarity,
    log: []
  };

  const RARITY_COLOR = {
    Common: "#b9c4cc", Uncommon: "#7fd06a", Rare: "#5fb0ff",
    Epic: "#c07bff", Legendary: "#ffc23c", Ancient: "#57e6c8"
  };
  const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Ancient"];
  const ODDS = { Common: "45%", Uncommon: "25%", Rare: "15%", Epic: "8%", Legendary: "5%", Ancient: "2%" };

  // --------------------------------------------------------------- state ----
  const CAST_DUR = 0.55;
  const BITE_WINDOW = 1.3;
  const REEL_DUR = 1.5;
  const REVEAL_DUR = { Common: 1.9, Uncommon: 2.1, Rare: 2.3, Epic: 2.5, Legendary: 2.8, Ancient: 3.2 };

  let phase = "ready";
  let phaseT = 0;
  let missMsg = 0;
  let target = { x: 250, y: 130 };
  let castCurve = null;
  let landT = -1;
  let biteReaction = 0;
  let caught = null;      // { name, rarity, spec }
  let catchDone = false;
  let heldFish = 0;

  function setPhase(p) {
    phase = p;
    phaseT = 0;
    fishing.state = p;
  }

  function randomTarget() {
    // open water to the right of the dock, kept away from land and dock
    const x = 206 + Math.random() * 92;
    const y = 88 + Math.random() * 78;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function cast() {
    if (phase !== "ready") return;
    target = randomTarget();
    castCurve = null;
    landT = -1;
    biteReaction = 0;
    caught = null;
    catchDone = false;
    heldFish = 0;
    missMsg = 0;
    // variable wait before the bite (after the line lands)
    const wait = 0.8 + Math.random() * 2.4;
    biteAt = CAST_DUR + wait;
    setPhase("waiting");
  }

  function reelIn() {
    if (phase !== "bite") return;
    biteReaction = 0;
    setPhase("reeling");
  }

  function toReady() {
    caught = null;
    catchDone = false;
    setPhase("ready");
  }

  function doCatch() {
    // Must go through window.fishing so tests can replace it.
    const rarity = fishing.pickRarity(Math.random());
    const spec = FishArt.forRarity(rarity, Math.random);
    caught = { name: spec.name, rarity: rarity, spec: spec };
    fishing.log.unshift({ name: spec.name, rarity: rarity });
    catchDone = true;
  }

  let biteAt = 0;

  // ---------------------------------------------------------------- input ---
  function action() {
    if (phase === "ready") cast();
    else if (phase === "bite") reelIn();
    else if (phase === "reveal" && phaseT > 0.8) toReady();
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      e.preventDefault();
      if (e.repeat) return;
      action();
    }
  }, { passive: false });

  // ---------------------------------------------------------------- update --
  function update(dt) {
    phaseT += dt;
    if (missMsg > 0) missMsg = Math.max(0, missMsg - dt);

    if (phase === "waiting") {
      if (landT >= 0) landT += dt; else if (phaseT >= CAST_DUR) landT = 0;
      if (phaseT >= biteAt) { setPhase("bite"); }
    } else if (phase === "bite") {
      biteReaction += dt;
      if (phaseT >= BITE_WINDOW) {
        missMsg = 1.8;
        setPhase("ready");
      }
    } else if (phase === "reeling") {
      if (!catchDone && phaseT >= 0.55) doCatch();
      if (phaseT >= REEL_DUR) {
        heldFish = 1;
        setPhase("reveal");
      }
    } else if (phase === "reveal") {
      const dur = REVEAL_DUR[caught ? caught.rarity : "Common"] || 2.2;
      if (phaseT >= dur) toReady();
    }
  }

  // ----------------------------------------------------------------- draw ---
  const sceneCtx = document.getElementById("scene").getContext("2d");
  const ui = document.getElementById("ui").getContext("2d");
  sceneCtx.imageSmoothingEnabled = false;
  ui.imageSmoothingEnabled = false;
  const uiCanvas = document.getElementById("ui");

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function line(ctx, x0, y0, x1, y1, sag, color) {
    const steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function ring(ctx, x, y, r, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBobber(ctx, x, y, dip) {
    ctx.fillStyle = "#e04b3c";
    ctx.fillRect(x - 1, y - 2 + dip, 3, 2);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(x - 1, y + dip, 3, 1);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(x, y - 3 + dip, 1, 1);
    ctx.fillStyle = "#f6c34a";
    ctx.fillRect(x, y + 1 + dip, 1, 1);
  }

  function drawLineAndBobber(ctx, t) {
    const poseBend = (phase === "reeling") ? Math.sin(Math.min(1, phaseT / REEL_DUR) * Math.PI) * 0.9 : 0;
    const tip = Scene.rodTip(t, poseBend);
    if (phase === "waiting" && phaseT < CAST_DUR) {
      const k = U.clamp(phaseT / CAST_DUR, 0, 1);
      const bx = U.lerp(tip.x, target.x, k);
      const by = U.lerp(tip.y, target.y, k) - Math.sin(Math.PI * k) * 26;
      line(ctx, tip.x, tip.y, bx, by, 2, "rgba(240,238,220,0.85)");
      drawBobber(ctx, Math.round(bx), Math.round(by), 0);
      // flick arc sparkle
      if (k > 0.2) { U.rect(ctx, bx - 2, by - 2, 1, 1, "#fff6c8"); }
    } else if (phase === "waiting" || phase === "bite") {
      let dip = 0, bob = Math.sin(t * 2.2) * 0.8;
      if (phase === "bite") {
        dip = 2 + Math.sin(t * 22) * 0.7;
        bob = 0;
      }
      const by = target.y + bob + dip;
      line(ctx, tip.x, tip.y, target.x, by, 4 - dip, "rgba(240,238,220,0.85)");
      // water rings
      const rr = (t * 1.4) % 1;
      if (landT >= 0 && landT < 0.6) {
        ring(ctx, target.x, target.y + 1, 1 + landT * 10, "#dff6ef", 0.7 * (1 - landT / 0.6));
      }
      if (phase === "bite") {
        for (let i = 0; i < 3; i++) {
          const p = (biteReaction * 1.6 + i * 0.33) % 1;
          ring(ctx, target.x, target.y + 1, 2 + p * 12, "#eafcff", 0.55 * (1 - p));
        }
      } else {
        ring(ctx, target.x, target.y + 1, 2 + rr * 3, "#bfe9df", 0.18 * (1 - rr));
      }
      drawBobber(ctx, target.x, Math.round(by), 0);

      if (phase === "bite") {
        // unmistakable cue: exclamation + splash + a warm pulse
        const ex = target.x, ey = target.y - 12 + Math.sin(t * 18) * 0.8;
        U.rect(ctx, ex, ey - 4, 3, 5, "#fff2a6");
        U.rect(ctx, ex, ey + 2, 3, 2, "#fff2a6");
        U.rect(ctx, ex, ey - 4, 1, 5, "#ffffff");
        // splash droplets
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t;
          const r = 3 + Math.abs(Math.sin(t * 8 + i)) * 4;
          U.rect(ctx, target.x + Math.cos(a) * r, target.y - 1 - Math.abs(Math.sin(a * 2)) * r * 0.6 - 1, 1, 1, "#e9fbf4");
        }
      }
    } else if (phase === "reeling") {
      const k = U.clamp(phaseT / REEL_DUR, 0, 1);
      const ek = ease(k);
      // fish is drawn out of the water toward the rod
      const fx = U.lerp(target.x, tip.x - 10, ek);
      const fy = U.lerp(target.y, tip.y - 2, Math.pow(ek, 1.5));
      line(ctx, tip.x, tip.y, fx, fy, (1 - ek) * 5, "rgba(255,255,255,0.9)");
      // splash trail
      for (let i = 0; i < 8; i++) {
        const s = Math.sin(t * 14 + i);
        U.rect(ctx, fx + (i - 4) * 1.5, target.y - 1 - Math.abs(s) * (4 + (1 - ek) * 8), 1, 1, "#e6f8f0");
      }
      if (caught && phaseT >= 0.55) {
        // the fish breaks the surface, wiggling
        const wig = Math.sin(t * 16) * 0.6;
        const scale = 1.4;
        const w = caught.spec.W * scale;
        FishArt.draw(ctx, caught.spec, Math.round(fx + w * 0.3), Math.round(fy + wig), scale, false);
        if (Math.sin(t * 12) > 0.4) ring(ctx, target.x, target.y + 1, 4 + k * 10, "#eafcff", 0.4);
        U.rect(ctx, fx - 6, fy - 6, 1, 1, "#ffffff");
        U.rect(ctx, fx + 4, fy - 8, 1, 1, "#ffffff");
      }
      drawBobber(ctx, Math.round(fx + 4), Math.round(fy + 2), 0);
    }
  }

  // ------------------------------------------------------------ reveal UI ---
  function panelPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function star(ctx, x, y, r, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x - r, y, r * 2 + 1, 1);
    ctx.fillRect(x, y - r, 1, r * 2 + 1);
    if (r > 1) { ctx.fillRect(x - 1, y - 1, 3, 3); }
  }

  function drawRevealScene(ctx, t) {
    const c = caught; if (!c) return;
    const rar = c.rarity;
    const col = RARITY_COLOR[rar] || "#ccc";
    const cx = 160, cy = 86, hw = 88, hh = 64;

    ctx.globalAlpha = 0.32;
    U.rect(ctx, 0, 0, 320, 180, "#06121a");
    ctx.globalAlpha = 1;

    // --- tier-specific backdrops behind the card ---
    if (rar === "Rare" || rar === "Legendary") {
      ctx.save();
      ctx.translate(cx, cy - 6);
      ctx.rotate(t * (rar === "Legendary" ? 0.5 : 0.3));
      ctx.fillStyle = rar === "Legendary" ? "rgba(255,214,120,0.16)" : "rgba(120,190,255,0.15)";
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI * 2 / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(230, 26); ctx.lineTo(230, -26); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (rar === "Epic") {
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.7 + i * 0.33) % 1;
        ring(ctx, cx, cy - 4, 8 + p * 70, "#c07bff", 0.30 * (1 - p));
      }
    }
    if (rar === "Ancient") {
      // rotating rune ring
      ctx.save();
      ctx.translate(cx, cy - 4);
      ctx.rotate(t * 0.35);
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rx = Math.cos(a) * 74, ry = Math.sin(a) * 60;
        U.rect(ctx, rx - 1, ry - 1, 3, 3, i % 3 === 0 ? "#b9ffe9" : "#57e6c8");
        if (i % 2 === 0) U.rect(ctx, rx - 4, ry - 1, 2, 1, "#57e6c8");
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // --- card (hard pixel shadow, then panel) ---
    ctx.globalAlpha = 0.45;
    panelPath(ctx, cx - hw + 4, cy - hh + 6, hw * 2, hh * 2, 8);
    ctx.fillStyle = "#04100f"; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = rar === "Ancient" ? "rgba(7,24,24,0.96)" : "rgba(14,22,30,0.94)";
    panelPath(ctx, cx - hw, cy - hh, hw * 2, hh * 2, 8);
    ctx.fill();

    // frame
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    panelPath(ctx, cx - hw, cy - hh, hw * 2, hh * 2, 8); ctx.stroke();
    if (rar === "Legendary" || rar === "Ancient") {
      ctx.strokeStyle = rar === "Ancient" ? "rgba(185,255,233,0.6)" : "rgba(255,240,180,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(cx - hw + 4, cy - hh + 4, hw * 2 - 8, hh * 2 - 8);
      ctx.stroke();
    }
    if (rar === "Ancient") {
      // carved stone notches
      ctx.fillStyle = "#1c4a45";
      for (let i = -hw + 10; i < hw - 6; i += 14) {
        ctx.fillRect(cx + i, cy - hh, 4, 3);
        ctx.fillRect(cx + i, cy + hh - 3, 4, 3);
        ctx.fillRect(cx - hw, cy + i - 2, 3, 4);
        ctx.fillRect(cx + hw - 3, cy + i - 2, 3, 4);
      }
    }
    // corner gems/brackets
    const corners = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx - hw, cy + hh], [cx + hw, cy + hh]];
    if (rar === "Uncommon") {
      corners.forEach(([x, y]) => { U.rect(ctx, x - 2, y - 2, 5, 2, col); U.rect(ctx, x - 2, y - 2, 2, 5, col); });
    } else if (rar === "Rare" || rar === "Epic" || rar === "Legendary") {
      corners.forEach(([x, y]) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillRect(x - 1, y - 1, 1, 1);
      });
    } else if (rar === "Ancient") {
      corners.forEach(([x, y]) => {
        ctx.fillStyle = "#57e6c8";
        ctx.fillRect(x - 4, y - 4, 8, 2); ctx.fillRect(x - 4, y - 4, 2, 8);
        ctx.fillRect(x - 4, y + 2, 8, 2); ctx.fillRect(x + 2, y - 4, 2, 8);
      });
    }

    // --- the fish ---
    const spec = c.spec;
    const scale = Math.min(4, 138 / spec.W);
    const fy = cy - 12 + Math.sin(t * 2) * 1.5;
    // soft glow disc behind prized fish
    if (rar === "Epic" || rar === "Legendary" || rar === "Ancient") {
      ctx.globalAlpha = 0.16 + 0.06 * Math.sin(t * 4);
      U.ellipse(ctx, cx, fy, spec.W * scale * 0.48 + 4, spec.H * scale * 0.5 + 3, col);
      ctx.globalAlpha = 1;
    }
    FishArt.draw(ctx, spec, cx, fy, scale, false);

    // tier particles
    if (rar === "Uncommon" || rar === "Rare" || rar === "Epic" || rar === "Legendary") {
      const n = rar === "Uncommon" ? 6 : rar === "Rare" ? 9 : rar === "Epic" ? 14 : 22;
      for (let i = 0; i < n; i++) {
        const s = U.hash(i * 12.9);
        const px = cx - hw + 8 + s * (hw * 2 - 16);
        const ph = (t * (0.5 + s) + i * 0.37) % 1;
        const py = cy + hh - ph * (hh * 2);
        ctx.globalAlpha = 0.9 * (1 - ph);
        U.rect(ctx, px, py, 1, 1, rar === "Legendary" ? "#fff0b0" : col);
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < 6; i++) {
        const a = t * 1.5 + i * 1.05;
        const rx = cx + Math.cos(a) * (hw * 0.9);
        const ry = cy - 10 + Math.sin(a) * (hh * 0.75);
        if (Math.sin(t * 4 + i) > 0.2) star(ctx, Math.round(rx), Math.round(ry), rar === "Legendary" ? 2 : 1, col);
      }
    }
    if (rar === "Ancient") {
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.4 + i * 0.2) % 1;
        const gx = cx - 60 + i * 30 + Math.sin(t + i) * 6;
        const gy = cy + 40 - ph * 96;
        ctx.globalAlpha = 0.7 * (1 - ph);
        U.rect(ctx, gx, gy, 3, 3, "#b9ffe9");
        U.rect(ctx, gx - 2, gy + 4, 1, 1, "#57e6c8");
        ctx.globalAlpha = 1;
      }
    }
    if (rar === "Legendary") {
      // ribbon banner behind the name
      ctx.fillStyle = "rgba(180,110,20,0.95)";
      ctx.fillRect(cx - 78, cy + hh - 30, 156, 20);
      ctx.fillStyle = "#ffd766";
      ctx.fillRect(cx - 78, cy + hh - 30, 156, 2);
      ctx.fillStyle = "#8a5410";
      ctx.beginPath(); ctx.moveTo(cx - 78, cy + hh - 10); ctx.lineTo(cx - 88, cy + hh - 6); ctx.lineTo(cx - 78, cy + hh - 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 78, cy + hh - 10); ctx.lineTo(cx + 88, cy + hh - 6); ctx.lineTo(cx + 78, cy + hh - 2); ctx.closePath(); ctx.fill();
    }
  }

  // ---------------------------------------------------------- persistent HUD -
  const BTN = { x: 520, y: 630, w: 240, h: 66 };
  let hoverBtn = false;

  function roundRect(ctx, x, y, w, h, r) { panelPath(ctx, x, y, w, h, r); }

  function drawHUD(t) {
    ui.clearRect(0, 0, 1280, 720);
    ui.textBaseline = "middle";

    const col = "#e9f3ec";
    const dim = "rgba(233,243,236,0.55)";

    // ---- instruction / status line ----
    let msg, msgCol = col;
    if (phase === "ready") {
      msg = missMsg > 0 ? "It got away!  Cast again with SPACE" : "Press SPACE or tap CAST to fish";
      if (missMsg > 0) msgCol = "#ff9d8a";
    } else if (phase === "waiting") {
      msg = phaseT < CAST_DUR ? "Casting the line…" : "Waiting for a bite…";
    } else if (phase === "bite") {
      msg = "BITE!  Reel in now!";
      msgCol = "#ffe27a";
    } else if (phase === "reeling") {
      msg = "Reeling it in!";
    } else {
      msg = "Nice catch!";
      msgCol = caught ? RARITY_COLOR[caught.rarity] : col;
    }
    ui.font = "bold 24px ui-monospace, Menlo, Consolas, monospace";
    ui.textAlign = "center";
    ui.fillStyle = "rgba(0,0,0,0.55)";
    ui.fillText(msg, 642, 38);
    ui.fillStyle = msgCol;
    ui.fillText(msg, 640, 36);
    if (phase === "bite") {
      // pulsing frame to make the cue unmissable
      ui.strokeStyle = "rgba(255,210,90," + (0.35 + 0.35 * Math.sin(t * 18)) + ")";
      ui.lineWidth = 6;
      ui.strokeRect(3, 3, 1274, 714);
      // depleting window timer above the button
      const remain = U.clamp(1 - phaseT / BITE_WINDOW, 0, 1);
      const bx = 460, by = 606, bw = 360, bh = 14;
      ui.fillStyle = "rgba(8,16,18,0.85)";
      roundRect(ui, bx - 3, by - 3, bw + 6, bh + 6, 6); ui.fill();
      const cr = Math.round(U.lerp(255, 220, remain));
      const cg = Math.round(U.lerp(90, 210, remain));
      ui.fillStyle = "rgb(" + cr + "," + cg + ",60)";
      roundRect(ui, bx, by, Math.max(2, bw * remain), bh, 5); ui.fill();
      ui.strokeStyle = "rgba(255,240,180,0.6)"; ui.lineWidth = 1;
      roundRect(ui, bx - 3.5, by - 3.5, bw + 7, bh + 7, 6); ui.stroke();
    }

    // ---- rarity legend (top-left) ----
    drawPanel(14, 14, 240, 168);
    ui.textAlign = "left";
    ui.font = "bold 16px ui-monospace, Menlo, Consolas, monospace";
    ui.fillStyle = "#cfe6da"; ui.fillText("RARITY ODDS", 28, 36);
    ui.strokeStyle = "rgba(120,170,150,0.4)"; ui.lineWidth = 1;
    ui.beginPath(); ui.moveTo(28, 46); ui.lineTo(240, 46); ui.stroke();
    ui.font = "15px ui-monospace, Menlo, Consolas, monospace";
    RARITY_ORDER.forEach((r, i) => {
      const y = 62 + i * 20;
      ui.fillStyle = RARITY_COLOR[r];
      ui.fillRect(30, y - 5, 10, 10);
      ui.fillStyle = "#dfeee6";
      ui.fillText(r, 50, y);
      ui.textAlign = "right"; ui.fillStyle = dim; ui.fillText(ODDS[r], 240, y); ui.textAlign = "left";
    });

    // ---- catch log (right) ----
    const logX = 996, logY = 430, logW = 270, logH = 258;
    drawPanel(logX, logY, logW, logH);
    ui.font = "bold 16px ui-monospace, Menlo, Consolas, monospace";
    ui.fillStyle = "#cfe6da"; ui.fillText("CATCH LOG", logX + 14, logY + 24);
    ui.strokeStyle = "rgba(120,170,150,0.4)";
    ui.beginPath(); ui.moveTo(logX + 14, logY + 34); ui.lineTo(logX + logW - 14, logY + 34); ui.stroke();
    ui.font = "15px ui-monospace, Menlo, Consolas, monospace";
    const recent = fishing.log.slice(0, 8);
    for (let i = 0; i < 8; i++) {
      const y = logY + 54 + i * 25;
      const e = recent[i];
      if (!e) {
        ui.fillStyle = "rgba(200,220,210,0.18)";
        ui.fillText("· · ·", logX + 14, y);
        continue;
      }
      ui.fillStyle = RARITY_COLOR[e.rarity] || "#ccc";
      ui.fillRect(logX + 14, y - 5, 8, 10);
      ui.fillStyle = "#e6f2ec";
      ui.fillText(e.name, logX + 30, y);
      ui.textAlign = "right";
      ui.fillStyle = RARITY_COLOR[e.rarity] || "#ccc";
      ui.fillText(e.rarity, logX + logW - 14, y);
      ui.textAlign = "left";
    }

    // ---- reveal card text (drawn crisp at full resolution) ----
    if (phase === "reveal" && caught) {
      const col2 = RARITY_COLOR[caught.rarity] || "#ccc";
      // divider
      ui.strokeStyle = "rgba(255,255,255,0.14)";
      ui.lineWidth = 1;
      ui.beginPath(); ui.moveTo(430, 452); ui.lineTo(850, 452); ui.stroke();
      ui.textAlign = "center";
      ui.font = "bold 36px ui-monospace, Menlo, Consolas, monospace";
      ui.fillStyle = "rgba(0,0,0,0.65)"; ui.fillText(caught.name, 642, 492);
      ui.fillStyle = "#f6f1e4"; ui.fillText(caught.name, 640, 490);
      ui.font = "bold 26px ui-monospace, Menlo, Consolas, monospace";
      const label = "* " + caught.rarity + " *";
      ui.fillStyle = "rgba(0,0,0,0.65)"; ui.fillText(label, 642, 556);
      ui.fillStyle = col2; ui.fillText(label, 640, 554);
    }

    // ---- action button ----
    let label = "CAST", btnCol = "#3f8f6a", btnCol2 = "#2c6b4e", enabled = true;
    if (phase === "bite") { label = "REEL!"; btnCol = "#d1483a"; btnCol2 = "#9c3025"; }
    else if (phase === "waiting") { label = "WAIT"; btnCol = "#405957"; btnCol2 = "#2c403f"; enabled = false; }
    else if (phase === "reeling") { label = "…"; btnCol = "#405957"; btnCol2 = "#2c403f"; enabled = false; }
    else if (phase === "reveal") { label = "NICE!"; btnCol = "#4a6f8f"; btnCol2 = "#334f66"; }
    if (hoverBtn && enabled) btnCol = "#4aa87d";

    ui.save();
    ui.shadowColor = "rgba(0,0,0,0.45)"; ui.shadowBlur = 10; ui.shadowOffsetY = 4;
    ui.fillStyle = btnCol2;
    roundRect(ui, BTN.x, BTN.y, BTN.w, BTN.h, 12); ui.fill();
    ui.restore();
    ui.fillStyle = btnCol;
    roundRect(ui, BTN.x, BTN.y, BTN.w, BTN.h - 6, 12); ui.fill();
    ui.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ui, BTN.x + 4, BTN.y + 3, BTN.w - 8, 18, 8); ui.fill();
    ui.fillStyle = "#ffffff";
    ui.textAlign = "center";
    ui.font = "bold 30px ui-monospace, Menlo, Consolas, monospace";
    ui.fillText(label, BTN.x + BTN.w / 2, BTN.y + BTN.h / 2 - 6);
    ui.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ui.fillStyle = "rgba(255,255,255,0.75)";
    ui.fillText("(SPACE)", BTN.x + BTN.w / 2, BTN.y + BTN.h / 2 + 16);
    ui.textAlign = "left";
  }

  function drawPanel(x, y, w, h) {
    ui.fillStyle = "rgba(10,26,28,0.72)";
    roundRect(ui, x, y, w, h, 8); ui.fill();
    ui.strokeStyle = "rgba(120,180,160,0.35)";
    ui.lineWidth = 1;
    roundRect(ui, x + 0.5, y + 0.5, w - 1, h - 1, 8); ui.stroke();
  }

  // ------------------------------------------------------------- main loop --
  let last = performance.now();
  let clock = 0;

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (!document.hidden) {
      clock += dt;
      update(dt);
    }
    // scene
    sceneCtx.clearRect(0, 0, 320, 180);
    const poseBend = phase === "reeling" ? Math.sin(U.clamp(phaseT / REEL_DUR, 0, 1) * Math.PI) * 0.9 : 0;
    Scene.draw(sceneCtx, clock, { bend: poseBend });
    drawLineAndBobber(sceneCtx, clock);
    if (phase === "reveal") drawRevealScene(sceneCtx, phaseT);
    drawHUD(clock);
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------- pointer ----
  function localPoint(e) {
    const r = uiCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (1280 / r.width), y: (e.clientY - r.top) * (720 / r.height) };
  }
  function inBtn(p) { return p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y && p.y <= BTN.y + BTN.h; }

  uiCanvas.addEventListener("pointermove", (e) => { hoverBtn = inBtn(localPoint(e)); uiCanvas.style.cursor = hoverBtn ? "pointer" : "default"; });
  uiCanvas.addEventListener("pointerdown", (e) => {
    const p = localPoint(e);
    if (inBtn(p)) { e.preventDefault(); action(); }
  });
  uiCanvas.addEventListener("pointerleave", () => { hoverBtn = false; });

  requestAnimationFrame(frame);
})();
