/* ------------------------------------------------------------------
   game.js  --  state machine, timers, UI and the window.fishing API.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var LOGICAL_W = 320, LOGICAL_H = 180, SCALE = 4;
  var VIEW_W = 1280, VIEW_H = 720;

  var display = document.getElementById('game');
  var ctx = display.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var scene = document.createElement('canvas');
  scene.width = LOGICAL_W; scene.height = LOGICAL_H;
  var sctx = scene.getContext('2d');
  sctx.imageSmoothingEnabled = false;

  /* ------------------------------ rarities ------------------------------ */
  var RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  var RARITY_INFO = {
    Common:    { color: '#c3ccd2', dark: '#5a6a72', glow: '#eef4f7', style: 'plain',     odds: 45 },
    Uncommon:  { color: '#7fd07a', dark: '#3d7a3c', glow: '#d6f7c8', style: 'bubbles',   odds: 25 },
    Rare:      { color: '#66b6f0', dark: '#2c5f8a', glow: '#c4e6ff', style: 'rays',      odds: 15 },
    Epic:      { color: '#b07af0', dark: '#5a338c', glow: '#e6ccff', style: 'motes',     odds: 8 },
    Legendary: { color: '#f0c24a', dark: '#8a6412', glow: '#fff0b0', style: 'burst',     odds: 5 },
    Ancient:   { color: '#4fe0c0', dark: '#146a5c', glow: '#c8fff0', style: 'runes',     odds: 2 }
  };

  function pickRarity(u) {
    if (u < 0.45) return 'Common';
    if (u < 0.70) return 'Uncommon';
    if (u < 0.85) return 'Rare';
    if (u < 0.93) return 'Epic';
    if (u < 0.98) return 'Legendary';
    return 'Ancient';
  }

  /* --------------------------- test interface --------------------------- */
  var phase = 'ready';
  var catchLog = [];
  window.fishing = {
    get state() { return phase; },
    pickRarity: pickRarity,
    get log() { return catchLog; }
  };

  /* ------------------------------- state -------------------------------- */
  var T = 0;                 // animation clock (seconds)
  var phaseT = 0;            // time in current phase
  var missT = 0;             // miss message timer
  var introT = 0;            // intro banner timer

  var BITE_WINDOW = 1.5;
  var CAST_TIME = 0.8;
  var REEL_TIME = 1.4;
  var REVEAL_AUTO = 3.2;
  var REVEAL_MIN = 0.4;

  var bobberX = 0, bobberY = 0;
  var bobStartX = 172, bobStartY = 102;
  var bobTargetX = 100, bobTargetY = 122;
  var bobberVisible = false, lineVisible = false;
  var bobberDip = 0;
  var biteCue = false;
  var waitDuration = 2.4;
  var castP = 0;
  var landed = false;
  var ripple = 0;
  var splash = 0, splashSeed = 1;
  var rodAngle = -2.32;

  var currentFish = null;
  var currentRarity = null;
  var revealT = 0;
  var flash = 0;

  function resetIdle() {
    bobberVisible = false;
    lineVisible = false;
    biteCue = false;
    bobberDip = 0;
    ripple = 0;
    splash = 0;
    rodAngle = -2.32;
  }

  function startCast() {
    phase = 'waiting';
    phaseT = 0;
    castP = 0;
    landed = false;
    biteCue = false;
    bobberDip = 0;
    splash = 0;
    lineVisible = true;
    bobberVisible = true;
    bobStartX = 172; bobStartY = 102;
    bobTargetX = 72 + Math.random() * 58;      // 72..130
    bobTargetY = 106 + Math.random() * 30;     // 106..136
    bobberX = bobStartX; bobberY = bobStartY;
    waitDuration = 2.0 + Math.random() * 1.6;  // 2.0..3.6
    // little anticipation lean
  }

  function succeed() {
    currentRarity = window.fishing.pickRarity(Math.random());
    var pool = Art.fishByRarity[currentRarity] || Art.FISH;
    currentFish = pool[Math.floor(Math.random() * pool.length)];
    phase = 'reeling';
    phaseT = 0;
    biteCue = false;
    splash = 0.001;
    splashSeed = Math.random() * 1000;
    if (!catchLog) catchLog = [];
    catchLog.unshift({ name: currentFish.name, rarity: currentRarity });
    if (catchLog.length > 8) catchLog.length = 8;
  }

  function finishCast() {
    phase = 'ready';
    phaseT = 0;
    resetIdle();
  }

  function action() {
    if (phase === 'ready') {
      startCast();
    } else if (phase === 'bite') {
      succeed();
    } else if (phase === 'reveal') {
      if (revealT > REVEAL_MIN) {
        phase = 'ready';
        phaseT = 0;
        currentFish = null; currentRarity = null;
        resetIdle();
      }
    }
    // waiting / reeling: ignore, prevents double casts / double catches
  }

  /* ------------------------------ update -------------------------------- */
  function update(dt) {
    T += dt;
    phaseT += dt;
    if (missT > 0) missT = Math.max(0, missT - dt);
    if (introT < 6) introT += dt;
    if (flash > 0) flash = Math.max(0, flash - dt * 4);

    if (phase === 'waiting') {
      if (!landed) {
        castP += dt / CAST_TIME;
        if (castP >= 1) {
          castP = 1;
          landed = true;
          landedT = 0;
          ripple = 0.0001;
        } else {
          var e = 1 - Math.pow(1 - castP, 2);
          bobberX = bobStartX + (bobTargetX - bobStartX) * e;
          bobberY = bobStartY + (bobTargetY - bobStartY) * e - Math.sin(Math.PI * castP) * 20;
          rodAngle = -1.95 + (-2.32 + 1.95) * e;
        }
      } else {
        landedT = (landedT || 0) + dt;
        bobberX = bobTargetX;
        bobberY = bobTargetY + Math.sin(T * 2.2) * 0.8;
        if (ripple > 0) {
          ripple += dt / 0.7;
          if (ripple > 1) ripple = 0;
        }
        if (landedT >= waitDuration) {
          phase = 'bite';
          phaseT = 0;
          biteCue = true;
        }
      }
    } else if (phase === 'bite') {
      bobberX = bobTargetX;
      var dipPulse = Math.max(0, Math.sin(T * 16));
      bobberDip = 2 + dipPulse * 2.5;
      bobberY = bobTargetY + bobberDip;
      if (phaseT >= BITE_WINDOW) {
        // missed
        phase = 'ready';
        phaseT = 0;
        missT = 1.0;
        resetIdle();
      }
    } else if (phase === 'reeling') {
      var p = clamp(phaseT / REEL_TIME, 0, 1);
      rodAngle = -2.32 - Math.sin(Math.PI * p) * 0.35;
      bobberX = bobTargetX;
      bobberY = bobTargetY + bobberDip;
      bobberDip = Math.min(8, bobberDip + dt * 20);
      if (phaseT > 0.35) bobberVisible = false;
      splash += dt / 0.9;
      if (phaseT >= REEL_TIME) {
        phase = 'reveal';
        phaseT = 0;
        revealT = 0;
        flash = 1;
        bobberVisible = false;
        lineVisible = false;
      }
    } else if (phase === 'reveal') {
      revealT += dt;
      if (revealT >= REVEAL_AUTO) {
        phase = 'ready';
        phaseT = 0;
        currentFish = null; currentRarity = null;
        resetIdle();
      }
    }
  }

  var landedT = 0;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ------------------------------- render ------------------------------- */
  function buildView() {
    return {
      t: T,
      phase: phase,
      bobberX: bobberX,
      bobberY: bobberY,
      bobberVisible: bobberVisible,
      bobberDip: bobberDip,
      biteCue: biteCue,
      lineVisible: lineVisible,
      ripple: ripple > 0 ? ripple : 0,
      splash: splash > 0 ? splash : 0,
      splashSeed: splashSeed,
      rodAngle: phase === 'bite' || phase === 'waiting' || phase === 'reeling' ? rodAngle : -2.32,
      angBob: 0,
      angLean: 0
    };
  }

  function render() {
    Art.drawScene(sctx, buildView());

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(scene, 0, 0, LOGICAL_W, LOGICAL_H, 0, 0, VIEW_W, VIEW_H);

    if (phase === 'bite') drawBiteOverlay();
    drawHud();
    if (phase === 'reeling' || phase === 'reveal') drawReveal();
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.55).toFixed(3) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  /* -------------------------------- HUD --------------------------------- */
  var F = window.PixelFont;

  function drawHud() {
    // ---- title ----
    F.draw(ctx, 'TIDEPOOL LANDING', 18, 16, 2, '#f4ecd6', { shadow: '#22303a', shadowX: 1, shadowY: 1 });
    F.draw(ctx, 'A QUIET ISLAND FISHING SPOT', 18, 36, 1, '#bcd4d8');

    // ---- rarity legend ----
    var lx = 18, ly = 56;
    RARITY_NAMES.forEach(function (name, i) {
      var info = RARITY_INFO[name];
      var y = ly + i * 18;
      ctx.fillStyle = info.color;
      ctx.fillRect(lx, y + 2, 9, 9);
      ctx.fillStyle = '#22303a';
      ctx.fillRect(lx + 9, y + 2, 1, 9);
      F.draw(ctx, name + ' ' + info.odds + '%', lx + 15, y, 2, '#dbe7ea', { shadow: '#101c22', shadowX: 1, shadowY: 1 });
    });

    // ---- catch log (newest first) ----
    var rx = VIEW_W - 18;
    F.drawRight(ctx, 'CATCH LOG', rx, 16, 2, '#f4ecd6', { shadow: '#22303a' });
    if (catchLog.length === 0) {
      F.drawRight(ctx, 'NOTHING YET - GO FISH!', rx, 42, 2, '#9fb6bd');
    } else {
      for (var i = 0; i < catchLog.length; i++) {
        var e = catchLog[i];
        var info = RARITY_INFO[e.rarity] || RARITY_INFO.Common;
        var y = 42 + i * 18;
        var line = e.name + '  ' + e.rarity.toUpperCase();
        ctx.fillStyle = info.color;
        ctx.fillRect(rx - F.textWidth(line, 2) - 14, y + 3, 7, 7);
        F.drawRight(ctx, line, rx, y, 2, i === 0 ? '#ffffff' : '#c8d6da', { shadow: '#101c22', shadowX: 1, shadowY: 1 });
      }
    }

    // ---- bottom control / prompt ----
    var prompt, label, active;
    if (phase === 'ready') { prompt = 'PRESS SPACE TO CAST'; label = 'CAST'; active = true; }
    else if (phase === 'waiting') { prompt = 'WAITING FOR A BITE...'; label = 'WAIT'; active = false; }
    else if (phase === 'bite') { prompt = 'NOW! REEL IT IN!'; label = 'REEL!'; active = true; }
    else if (phase === 'reeling') { prompt = 'REELING...'; label = '...'; active = false; }
    else { prompt = 'PRESS SPACE TO CONTINUE'; label = 'OK'; active = false; }

    var cx = VIEW_W / 2;
    if (phase !== 'reveal' && phase !== 'reeling') {
      F.draw(ctx, prompt, cx - F.textWidth(prompt, 2) / 2, 646, 2,
        phase === 'bite' ? '#ffe08a' : '#e8f0f2', { shadow: '#1a2830', shadowX: 1, shadowY: 1 });
      drawButton(cx - 70, 664, 140, 40, label, active, phase === 'bite');
    }

    // ---- intro instruction banner ----
    if (introT < 6 && phase === 'ready') {
      var a = introT < 4.5 ? 1 : clamp((6 - introT) / 1.5, 0, 1);
      ctx.globalAlpha = a;
      var bw = 430, bh = 54, bx = cx - bw / 2, by = 12;
      ctx.fillStyle = 'rgba(12,24,32,0.78)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#4a6a76'; ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
      F.draw(ctx, 'CAST  >  WATCH  >  REEL', bx + 20, by + 12, 2, '#cfe0e4');
      F.draw(ctx, 'SPACE OR THE BUTTON TO ACT', bx + 20, by + 34, 2, '#8fb0b8');
      ctx.globalAlpha = 1;
    }

    if (missT > 0) {
      var ma = clamp(missT / 0.5, 0, 1);
      ctx.globalAlpha = ma;
      F.draw(ctx, 'THE FISH GOT AWAY...', cx - F.textWidth('THE FISH GOT AWAY...', 2) / 2, 600, 2,
        '#ff9a8a', { shadow: '#3a1410', shadowX: 1, shadowY: 1 });
      ctx.globalAlpha = 1;
    }

    // hover cursor
    ctx.fillStyle = '#000';
  }

  function drawButton(x, y, w, h, label, active, hot) {
    var pulse = hot ? 0.5 + 0.5 * Math.sin(T * 14) : 0;
    ctx.fillStyle = hot ? 'rgba(150,30,20,' + (0.5 + pulse * 0.4).toFixed(2) + ')'
      : (active ? '#2f6e54' : '#2a3b42');
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hot ? '#ffd9a0' : (active ? '#9fe0b8' : '#6b848c');
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillRect(x + w - 2, y, 2, h);
    var tw = F.textWidth(label, 2);
    F.draw(ctx, label, x + w / 2 - tw / 2, y + h / 2 - 7, 2,
      active || hot ? '#ffffff' : '#9fb2b8', { shadow: '#101c22', shadowX: 1, shadowY: 1 });
  }

  function drawBiteOverlay() {
    // red pulse frame
    var a = 0.18 + 0.16 * Math.sin(T * 14);
    ctx.fillStyle = 'rgba(220,60,40,' + a.toFixed(3) + ')';
    var t = 14;
    ctx.fillRect(0, 0, VIEW_W, t);
    ctx.fillRect(0, VIEW_H - t, VIEW_W, t);
    ctx.fillRect(0, 0, t, VIEW_H);
    ctx.fillRect(VIEW_W - t, 0, t, VIEW_H);

    // depleting window bar
    var bw = 360, bh = 14, bx = VIEW_W / 2 - bw / 2, by = 614;
    var left = clamp(1 - phaseT / BITE_WINDOW, 0, 1);
    ctx.fillStyle = 'rgba(10,20,26,0.85)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = '#3a1410';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = left < 0.35 ? '#ff7a5a' : '#ffd24a';
    ctx.fillRect(bx, by, Math.round(bw * left), bh);
    ctx.strokeStyle = '#ffe8b0'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
  }
  // right-aligned text helper
  F.drawRight = function (g, str, x, y, scale, color, opts) {
    F.draw(g, str, x - F.textWidth(str, scale), y, scale, color, opts);
  };

  /* ------------------------------ REVEAL -------------------------------- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function drawReveal() {
    var info = RARITY_INFO[currentRarity] || RARITY_INFO.Common;
    if (!currentFish) return;
    var p = phase === 'reeling' ? 0 : clamp(revealT / 0.3, 0, 1);
    var ease = easeOut(p);

    // dim backdrop
    ctx.fillStyle = 'rgba(5,12,17,' + (0.55 * ease).toFixed(3) + ')';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    var pw = 400, ph = 240;
    var px0 = VIEW_W / 2 - pw / 2;
    var py0 = VIEW_H / 2 - ph / 2 - 6 + (1 - ease) * 26;

    ctx.globalAlpha = ease;

    // panel
    ctx.fillStyle = 'rgba(10,20,26,0.96)';
    ctx.fillRect(px0, py0, pw, ph);
    // inner weave
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (var yy = py0 + 4; yy < py0 + ph - 4; yy += 4) ctx.fillRect(px0 + 3, yy, pw - 6, 1);

    // ---- tier effects on the panel, behind the fish ----
    drawRevealBackground(px0, py0, pw, ph, info, ease);

    // border
    ctx.fillStyle = info.dark;
    ctx.fillRect(px0, py0, pw, 6);
    ctx.fillRect(px0, py0 + ph - 6, pw, 6);
    ctx.fillRect(px0, py0, 6, ph);
    ctx.fillRect(px0 + pw - 6, py0, 6, ph);
    ctx.fillStyle = info.color;
    ctx.fillRect(px0 + 2, py0 + 2, pw - 4, 2);
    ctx.fillRect(px0 + 2, py0 + ph - 4, pw - 4, 2);
    ctx.fillRect(px0 + 2, py0 + 2, 2, ph - 4);
    ctx.fillRect(px0 + pw - 4, py0 + 2, 2, ph - 4);

    // corner accents
    corner(px0 + 4, py0 + 4, 1, 1, info.color);
    corner(px0 + pw - 4, py0 + 4, -1, 1, info.color);
    corner(px0 + 4, py0 + ph - 4, 1, -1, info.color);
    corner(px0 + pw - 4, py0 + ph - 4, -1, -1, info.color);

    // ---- fish ----
    var fp = clamp((p - 0.15) / 0.85, 0, 1);
    var fishBob = Math.sin(T * 2) * 3 * ease;
    var fishCY = py0 + 96 - (1 - easeOut(fp)) * 40 + fishBob;
    // glow disc behind fish
    var grd = ctx.createRadialGradient(VIEW_W / 2, fishCY, 4, VIEW_W / 2, fishCY, 110);
    grd.addColorStop(0, hexA(info.glow, 0.45 * ease));
    grd.addColorStop(1, hexA(info.glow, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(px0, py0, pw, ph);
    Art.drawFishSprite(ctx, currentFish, VIEW_W / 2, fishCY, SCALE);

    // ---- name ----
    var name = currentFish.name;
    var nScale = name.length > 16 ? 2 : 3;
    var nw = F.textWidth(name, nScale);
    if (p > 0.45) {
      F.draw(ctx, name, VIEW_W / 2 - nw / 2, py0 + 156, nScale, '#ffffff',
        { shadow: info.dark, shadowX: 2, shadowY: 2 });
    }
    var rar = currentRarity.toUpperCase();
    var rw = F.textWidth(rar, 2);
    if (p > 0.6) {
      // label plate
      ctx.fillStyle = info.dark;
      ctx.fillRect(VIEW_W / 2 - rw / 2 - 10, py0 + 190, rw + 20, 24);
      ctx.fillStyle = info.color;
      ctx.fillRect(VIEW_W / 2 - rw / 2 - 10, py0 + 190, rw + 20, 2);
      ctx.fillRect(VIEW_W / 2 - rw / 2 - 10, py0 + 212, rw + 20, 2);
      F.draw(ctx, rar, VIEW_W / 2 - rw / 2, py0 + 196, 2, info.color);
    }
    if (p > 0.85) {
      var msg = phase === 'reveal' && revealT > REVEAL_MIN ? 'PRESS SPACE' : 'REELING...';
      F.draw(ctx, msg, VIEW_W / 2 - F.textWidth(msg, 1) / 2, py0 + ph - 22, 1, '#9fb6bd');
    }

    ctx.globalAlpha = 1;

    // entrance flash
    if (p < 0.35 && phase === 'reveal') {
      ctx.fillStyle = 'rgba(255,255,255,' + ((1 - p / 0.35) * 0.4).toFixed(3) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function corner(x, y, sx, sy, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 12 * sx, 3 * sy);
    ctx.fillRect(x, y, 3 * sx, 12 * sy);
  }

  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function drawRevealBackground(px0, py0, pw, ph, info, ease) {
    var cx = VIEW_W / 2, cy = py0 + 96;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px0 + 6, py0 + 6, pw - 12, ph - 12);
    ctx.clip();

    var style = info.style;

    if (style === 'rays' || style === 'burst' || style === 'runes') {
      var nRays = style === 'burst' ? 18 : 12;
      var rot = T * (style === 'burst' ? 0.5 : 0.3);
      var reach = style === 'burst' ? 520 : 320;
      for (var i = 0; i < nRays; i++) {
        var a = rot + (i / nRays) * Math.PI * 2;
        var alpha = (style === 'burst' ? 0.16 : 0.10) * ease * (0.6 + 0.4 * Math.sin(T * 2 + i));
        ctx.strokeStyle = hexA(info.color, alpha);
        ctx.lineWidth = (i % 2 === 0) ? 10 : 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
        ctx.stroke();
      }
    }

    if (style === 'runes') {
      // two counter-rotating tick rings
      for (var ring = 0; ring < 2; ring++) {
        var rr = 60 + ring * 26;
        var dir = ring % 2 === 0 ? 1 : -1;
        var rrot = T * 0.4 * dir;
        var ticks = 24;
        for (var k = 0; k < ticks; k++) {
          var aa = rrot + (k / ticks) * Math.PI * 2;
          var x1 = cx + Math.cos(aa) * rr, y1 = cy + Math.sin(aa) * (rr * 0.62);
          var x2 = cx + Math.cos(aa) * (rr + 7), y2 = cy + Math.sin(aa) * ((rr + 7) * 0.62);
          ctx.strokeStyle = hexA(info.color, 0.4 * ease);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }
    }

    if (style === 'bubbles' || style === 'runes') {
      var rnd = Art.helpers.sr(9001);
      for (var b = 0; b < 14; b++) {
        var bx = px0 + 20 + rnd() * (pw - 40);
        var base = py0 + ph - 10;
        var speed = 12 + rnd() * 18;
        var by = base - ((T * speed + rnd() * 200) % (ph - 20));
        var rad = 1.5 + rnd() * 2.5;
        ctx.strokeStyle = hexA(info.glow, 0.35 * ease);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, rad, 0, Math.PI * 2); ctx.stroke();
      }
    }

    if (style === 'motes' || style === 'burst') {
      var rnd2 = Art.helpers.sr(4242);
      for (var m = 0; m < 22; m++) {
        var mx = px0 + 10 + ((rnd2() * (pw - 20) + T * (8 + rnd2() * 20)) % (pw - 20));
        var my = py0 + 10 + rnd2() * (ph - 20) + Math.sin(T * 1.5 + m) * 4;
        ctx.fillStyle = hexA(info.glow, 0.5 * ease * (0.5 + 0.5 * Math.sin(T * 3 + m)));
        ctx.fillRect(mx, my, 3, 3);
      }
    }

    ctx.restore();
  }

  /* ------------------------------- input -------------------------------- */
  var buttonRect = { x: VIEW_W / 2 - 70, y: 664, w: 140, h: 40 };

  function canvasPoint(clientX, clientY) {
    var r = display.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (display.width / r.width),
      y: (clientY - r.top) * (display.height / r.height)
    };
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) action();
    }
  });

  display.addEventListener('pointerdown', function (e) {
    var pt = canvasPoint(e.clientX, e.clientY);
    var r = buttonRect;
    if (phase === 'reveal') {
      // any click continues the reveal
      action();
      return;
    }
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
      e.preventDefault();
      action();
    }
  });

  // hover cursor over the button
  display.addEventListener('pointermove', function (e) {
    var pt = canvasPoint(e.clientX, e.clientY);
    var r = buttonRect;
    var over = pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;
    display.style.cursor = over ? 'pointer' : 'default';
  });

  /* ------------------------- visibility pause --------------------------- */
  var last = performance.now();
  document.addEventListener('visibilitychange', function () {
    last = performance.now();
  });

  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (document.hidden) { requestAnimationFrame(frame); return; } // pause all timers while hidden
    if (dt > 0.05) dt = 0.05; // clamp so hidden-tab time never fast-forwards
    if (dt < 0) dt = 0;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(function (now) {
    last = now;
    requestAnimationFrame(frame);
  });
})();
