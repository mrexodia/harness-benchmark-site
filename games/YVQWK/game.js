/* =========================================================================
 * game.js — Tidehollow Pier
 * State machine, input, angler, fishing effects and full-resolution UI.
 * ========================================================================= */
(function () {
  'use strict';

  var W = 320, H = 180;
  var DW = 1280, DH = 720;
  var S = Scene;
  var GEO = S.GEO;

  /* ---------------------------- canvases ---------------------------- */
  var gameCanvas = document.getElementById('game');
  gameCanvas.width = W; gameCanvas.height = H;
  var ctx = gameCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var uiCanvas = document.getElementById('ui');
  uiCanvas.width = DW; uiCanvas.height = DH;
  var ui = uiCanvas.getContext('2d');

  var castBtn = document.getElementById('castBtn');

  /* --------------------------- test interface ----------------------- */
  var F = window.fishing = {
    state: 'ready',
    pickRarity: function (u) {
      if (u < 0.45) return 'Common';
      if (u < 0.70) return 'Uncommon';
      if (u < 0.85) return 'Rare';
      if (u < 0.93) return 'Epic';
      if (u < 0.98) return 'Legendary';
      return 'Ancient';
    },
    log: []
  };

  var RARITY = [
    { name: 'Common', color: '#c2ccd4', deep: '#6b7883' },
    { name: 'Uncommon', color: '#6fd06f', deep: '#2f8a3f' },
    { name: 'Rare', color: '#5aa9ff', deep: '#2f6ad0' },
    { name: 'Epic', color: '#c07bff', deep: '#7b3fd0' },
    { name: 'Legendary', color: '#ffc44d', deep: '#d08a1f' },
    { name: 'Ancient', color: '#4fe6d0', deep: '#1f9f8f' }
  ];
  var RARITY_ODDS = ['45%', '25%', '15%', '8%', '5%', '2%'];

  function rarityInfo(name) {
    for (var i = 0; i < RARITY.length; i++) if (RARITY[i].name === name) return RARITY[i];
    return RARITY[0];
  }

  /* ------------------------------ timings --------------------------- */
  var CAST_DUR = 0.65;
  var WAIT_MIN = 1.2, WAIT_MAX = 2.9;
  var BITE_WINDOW = 1.5;
  var REEL_DUR = 1.4;
  var REVEAL_DUR = 2.9;

  /* ------------------------------- state ---------------------------- */
  var game = {
    phase: 'ready',
    t: 0,
    castT: 0,
    waitLeft: 0,
    biteLeft: 0,
    reelT: 0,
    revealT: 0,
    bobber: { x: 220, y: 130, tx: 220, ty: 130, splash: false },
    bitePhase: 0,
    pending: null,
    particles: [],
    ripples: [],
    sparkles: [],
    intro: true,
    msg: '',
    msgTime: 0
  };

  function setPhase(p) {
    game.phase = p;
    F.state = p;
    updateButton();
  }

  /* ------------------------------ helpers --------------------------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function px(x, y, w, h, c) { S.px(ctx, x, y, w, h, c); }
  function disc(x, y, r, c) { S.disc(ctx, x, y, r, c); }
  function linePx(x0, y0, x1, y1, c, thick) {
    thick = thick || 1;
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var n = Math.max(dx, dy);
    ctx.fillStyle = c;
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * (i / n);
      var y = y0 + (y1 - y0) * (i / n);
      ctx.fillRect(Math.round(x), Math.round(y), thick, thick);
    }
  }
  function addParticles(n, x, y, spread, colors, up) {
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + rnd(-spread, spread);
      var sp = rnd(12, 34);
      game.particles.push({
        x: x + rnd(-2, 2), y: y + rnd(-1, 1),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (up ? 10 : 0),
        life: rnd(0.4, 0.9), max: 0.9,
        c: colors[Math.floor(Math.random() * colors.length)],
        s: Math.random() < 0.3 ? 2 : 1
      });
    }
  }
  function addRipple(x, y, maxR) {
    game.ripples.push({ x: x, y: y, r: 1, max: maxR, life: 1 });
  }

  /* ============================= actions ============================ */
  function cast() {
    if (game.phase !== 'ready') return;
    game.intro = false;
    setPhase('waiting');
    game.castT = 0;
    game.bobber.tx = rnd(160, 250);
    game.bobber.ty = rnd(116, 150);
    game.bobber.x = GEO.ROD_TIP.x;
    game.bobber.y = GEO.ROD_TIP.y;
    game.bobber.splash = false;
    game.waitLeft = rnd(WAIT_MIN, WAIT_MAX);
    game.particles.length = 0;
    game.ripples.length = 0;
  }

  function enterBite() {
    setPhase('bite');
    game.biteLeft = BITE_WINDOW;
    game.bitePhase = 0;
    addRipple(game.bobber.tx, game.bobber.ty, 16);
    addParticles(14, game.bobber.tx, game.bobber.ty + 1, 1.1,
      ['#e8f7f2', '#b8e8e2', '#9fd8e0'], false);
  }

  function reel() {
    if (game.phase !== 'bite') return;
    setPhase('reeling');
    game.reelT = 0;
    game.ripples.length = 0;
    /* determine the catch THROUGH the public interface */
    var rarityName = window.fishing.pickRarity(Math.random());
    var fish = window.FishArt.fishOfRarity(rarityName);
    game.pending = { name: fish.cfg.name, rarity: rarityName, art: fish };
    window.fishing.log.unshift({ name: fish.cfg.name, rarity: rarityName });
    addParticles(22, game.bobber.tx, game.bobber.ty, 1.2,
      ['#e8f7f2', '#b8e8e2', '#ffffff', '#9fd8e0'], true);
  }

  function enterReveal() {
    setPhase('reveal');
    game.revealT = 0;
    buildRevealSparkles();
  }

  function finishReveal() {
    if (game.phase !== 'reveal') return;
    game.pending = null;
    game.sparkles.length = 0;
    setPhase('ready');
  }

  function enterMiss() {
    setPhase('ready');
    game.msg = 'It slipped away\u2026';
    game.msgTime = 1.6;
    addRipple(game.bobber.tx, game.bobber.ty, 10);
  }

  function onAction() {
    if (game.phase === 'ready') cast();
    else if (game.phase === 'bite') reel();
    else if (game.phase === 'reveal' && game.revealT > 1.0) finishReveal();
  }

  /* ------------------------------ input ----------------------------- */
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) onAction();
    }
  });
  var pointerActive = false;
  castBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    pointerActive = true;
    onAction();
  });
  castBtn.addEventListener('pointerup', function () { pointerActive = false; });
  castBtn.addEventListener('click', function (e) { e.preventDefault(); });

  /* ----------------------------- update ----------------------------- */
  function update(dt) {
    game.t += dt;
    if (game.msgTime > 0) game.msgTime -= dt;

    switch (game.phase) {
      case 'waiting':
        game.castT = Math.min(1, game.castT + dt / CAST_DUR);
        /* bobber flight */
        var e = easeOut(game.castT);
        var arc = 42 * Math.sin(Math.PI * game.castT) * (1 - game.castT * 0.3);
        game.bobber.x = lerp(GEO.ROD_TIP.x, game.bobber.tx, e);
        game.bobber.y = lerp(GEO.ROD_TIP.y, game.bobber.ty, e) - arc * 0.45;
        if (game.castT >= 1) {
          if (!game.bobber.splash) {
            game.bobber.splash = true;
            addRipple(game.bobber.tx, game.bobber.ty, 12);
            addParticles(8, game.bobber.tx, game.bobber.ty, 1.0, ['#e8f7f2', '#b8e8e2'], false);
          }
          game.bobber.x = game.bobber.tx;
          game.bobber.y = game.bobber.ty + Math.sin(game.t * 2.2) * 1.5;
          game.waitLeft -= dt;
          if (game.waitLeft <= 0) enterBite();
        }
        break;
      case 'bite':
        game.bitePhase += dt;
        game.biteLeft -= dt;
        var dip = Math.abs(Math.sin(game.bitePhase * 14)) * 3.2;
        game.bobber.x = game.bobber.tx;
        game.bobber.y = game.bobber.ty + dip;
        if (Math.sin(game.bitePhase * 20) > 0.86) {
          addRipple(game.bobber.tx, game.bobber.ty, 9);
        }
        if (game.biteLeft <= 0) enterMiss();
        break;
      case 'reeling':
        game.reelT = Math.min(1, game.reelT + dt / REEL_DUR);
        var rt = easeOut(game.reelT);
        game.bobber.x = lerp(game.bobber.tx, GEO.ROD_TIP.x + 4, rt);
        game.bobber.y = lerp(game.bobber.ty, GEO.ROD_TIP.y + 8, rt) - Math.sin(Math.PI * game.reelT) * 16;
        if (Math.random() < 0.4) addRipple(game.bobber.x, game.bobber.ty + 2, 8);
        if (game.reelT >= 1) enterReveal();
        break;
      case 'reveal':
        game.revealT += dt;
        if (game.revealT >= REVEAL_DUR) finishReveal();
        break;
    }

    /* particles */
    for (var i = game.particles.length - 1; i >= 0; i--) {
      var p = game.particles[i];
      p.life -= dt;
      p.vy += 70 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) game.particles.splice(i, 1);
    }
    /* ripples */
    for (var r = game.ripples.length - 1; r >= 0; r--) {
      var rp = game.ripples[r];
      rp.r += 14 * dt;
      if (rp.r > rp.max) game.ripples.splice(r, 1);
    }
    /* reveal sparkles */
    for (var s = game.sparkles.length - 1; s >= 0; s--) {
      var sp = game.sparkles[s];
      sp.life -= dt;
      if (sp.life <= 0) game.sparkles.splice(s, 1);
    }
  }

  function buildRevealSparkles() {
    game.sparkles.length = 0;
    if (!game.pending) return;
    var info = rarityInfo(game.pending.rarity);
    var count = [0, 6, 10, 16, 24, 30][info ? RARITY.indexOf(info) : 0];
    for (var i = 0; i < count; i++) {
      game.sparkles.push({
        x: rnd(-140, 140), y: rnd(-90, 70),
        vy: -rnd(8, 24), vx: rnd(-8, 8),
        life: rnd(0.6, 1.6), max: 1.6,
        r: Math.random() * Math.PI * 2,
        c: Math.random() < 0.5 ? info.color : '#ffffff'
      });
    }
  }

  /* ============================== angler ============================ */
  var AN = {
    skin: '#f2c79b', skinDark: '#d29a6a', hair: '#4a3220',
    hat: '#d9b06a', hatDark: '#a9823f', hatBand: '#7a4a2a',
    shirt: '#d9584a', shirtDark: '#a83f38', shirtLight: '#ef7a68',
    pants: '#3f6b8f', pantsDark: '#2f5370',
    boot: '#4a3220', bootDark: '#2f2014'
  };

  /* angler pose — shared by the sprite and the fishing line */
  function anglerPose() {
    var x = GEO.ANGLER_X, feet = GEO.ANGLER_FEET_Y;
    var bob = Math.round(Math.sin(game.t * 2.1) * 0.8);
    var y = feet + bob;
    var handX = x + 3, handY = y - 12;
    var baseTip = { x: GEO.ROD_TIP.x, y: GEO.ROD_TIP.y };
    var tip = baseTip;
    if (game.phase === 'waiting' && game.castT < 1) {
      var p = easeOut(game.castT);
      /* rod whips back then forward on the throw */
      tip = {
        x: lerp(x - 6, baseTip.x, p),
        y: lerp(y - 34, baseTip.y, p)
      };
    } else if (game.phase === 'reeling') {
      tip = {
        x: lerp(baseTip.x, handX + 6, easeOut(game.reelT)),
        y: lerp(baseTip.y, handY - 13, easeOut(game.reelT))
      };
    } else {
      tip = { x: baseTip.x, y: baseTip.y + Math.sin(game.t * 2.1) * 0.8 };
    }
    return { x: x, y: y, feet: feet, handX: handX, handY: handY, tip: tip };
  }

  function drawAngler(t) {
    var po = anglerPose();
    var x = po.x, y = po.y, feet = po.feet;

    /* shadow */
    ctx.globalAlpha = 0.22;
    S.ellipseSpan(ctx, x, feet + 1, 7, 2, '#000000');
    ctx.globalAlpha = 1;

    /* legs */
    px(x - 4, y - 8, 3, 6, AN.pants);
    px(x + 1, y - 8, 3, 6, AN.pants);
    px(x - 4, y - 8, 3, 1, AN.pantsDark);
    px(x + 1, y - 8, 3, 1, AN.pantsDark);
    /* boots */
    px(x - 5, y - 3, 4, 3, AN.boot);
    px(x + 1, y - 3, 4, 3, AN.boot);
    px(x - 5, y - 1, 4, 1, AN.bootDark);
    px(x + 1, y - 1, 4, 1, AN.bootDark);

    /* torso */
    px(x - 4, y - 14, 9, 7, AN.shirt);
    px(x - 4, y - 14, 9, 1, AN.shirtLight);
    px(x + 3, y - 14, 1, 7, AN.shirtDark);
    px(x - 5, y - 13, 1, 5, AN.shirtDark);
    /* overalls */
    px(x - 3, y - 10, 7, 3, AN.pants);
    px(x - 3, y - 10, 7, 1, AN.pantsDark);
    px(x - 2, y - 14, 1, 5, AN.pants);
    px(x + 2, y - 14, 1, 5, AN.pants);

    /* left arm (relaxed, behind) */
    px(x - 6, y - 13, 2, 6, AN.shirtDark);
    px(x - 6, y - 8, 2, 2, AN.skin);

    /* head */
    px(x - 3, y - 19, 8, 6, AN.skin);
    px(x - 3, y - 15, 8, 1, AN.skinDark);
    /* hair */
    px(x - 4, y - 20, 9, 2, AN.hair);
    px(x - 4, y - 19, 1, 2, AN.hair);
    px(x + 4, y - 19, 1, 2, AN.hair);
    /* face */
    px(x + 1, y - 17, 1, 2, '#3a2a1a');
    px(x + 3, y - 17, 1, 2, '#3a2a1a');
    px(x + 2, y - 14, 2, 1, '#b06a5a');
    ctx.globalAlpha = 0.4; px(x + 4, y - 15, 1, 1, '#e88a7a'); ctx.globalAlpha = 1;

    /* straw hat */
    px(x - 4, y - 22, 9, 2, AN.hat);
    px(x - 4, y - 22, 9, 1, '#efc98a');
    px(x - 6, y - 20, 13, 2, AN.hat);
    px(x - 6, y - 20, 13, 1, '#efc98a');
    px(x - 5, y - 18, 11, 1, AN.hatBand);
    px(x - 4, y - 18, 9, 1, '#7a4a2a');

    /* right arm reaching to the rod */
    px(x + 1, y - 13, 3, 2, AN.shirt);
    linePx(x + 3, y - 12, po.handX, po.handY, AN.skin, 2);

    /* fishing rod */
    drawRod(po);
  }

  function drawRod(po) {
    var handX = po.handX, handY = po.handY, tip = po.tip;
    /* butt of the rod behind the hand */
    linePx(handX - 6, handY + 3, handX, handY, '#5a3a22', 2);
    /* main rod */
    linePx(handX, handY, tip.x, tip.y, '#7d5533', 2);
    linePx(handX + 1, handY - 1, tip.x + 1, tip.y, '#a07a4d', 1);
    /* reel */
    disc(handX - 2, handY + 2, 2, '#5c6066');
    disc(handX - 2, handY + 1, 1, '#9aa0a6');
    /* tip guide */
    px(tip.x, tip.y, 1, 1, '#c9c9c9');
    px(tip.x, tip.y - 1, 1, 1, '#c9c9c9');
  }

  function rodTip() {
    return anglerPose().tip;
  }

  /* ========================= fishing visuals ======================== */
  function drawFishing(t) {
    var tip = rodTip();

    /* idle: just a short line dangling from the rod tip, no bobber in the water */
    if (game.phase === 'ready') {
      var dl = 7 + Math.sin(t * 2) * 1.5;
      ctx.globalAlpha = 0.6;
      linePx(tip.x, tip.y, tip.x + 1, tip.y + dl, '#eef4f4', 1);
      ctx.globalAlpha = 1;
      px(tip.x + 1, tip.y + dl, 1, 1, '#ffcf70');
      return;
    }

    /* line */
    var bobx = game.bobber.x, boby = game.bobber.y;
    ctx.globalAlpha = 0.75;
    linePx(tip.x, tip.y, bobx, boby, '#eef4f4', 1);
    ctx.globalAlpha = 1;

    /* ripples */
    for (var i = 0; i < game.ripples.length; i++) {
      var rp = game.ripples[i];
      ctx.globalAlpha = clamp(1 - rp.r / rp.max, 0, 0.7);
      S.ellipseSpan(ctx, rp.x, rp.y, rp.r, Math.max(1, rp.r * 0.35), '#dff6f2');
      ctx.globalAlpha = 1;
    }

    /* bobber */
    drawBobber(bobx, boby, t);

    /* bite cue: exclamation over the bobber */
    if (game.phase === 'bite') {
      var bob = Math.sin(game.t * 16) > 0 ? -1 : 0;
      ctx.globalAlpha = 0.9;
      px(bobx - 1, boby - 18 + bob, 3, 8, '#fff2b0');
      px(bobx - 1, boby - 18 + bob, 3, 1, '#ffffff');
      px(bobx - 1, boby - 7 + bob, 3, 3, '#fff2b0');
      ctx.globalAlpha = 1;
      /* expanding urgency ring */
      var frac = 1 - game.biteLeft / BITE_WINDOW;
      ctx.globalAlpha = 0.55;
      S.ellipseSpan(ctx, bobx, boby + 1, 6 + frac * 14, 2 + frac * 4, '#ffe08a');
      ctx.globalAlpha = 1;
    }

    /* reeling: fish leaping toward the angler */
    if (game.phase === 'reeling' && game.pending) {
      var rt = game.reelT;
      var fx = lerp(game.bobber.tx, GEO.ANGLER_X + 14, easeOut(rt));
      var fy = lerp(game.bobber.ty, GEO.ANGLER_FEET_Y - 6, easeOut(rt)) - Math.sin(Math.PI * rt) * 26;
      var art = game.pending.art;
      var fw = 26, fh = Math.round(fw * art.h / art.w);
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.translate(Math.round(fx), Math.round(fy));
      ctx.rotate(Math.sin(rt * 9) * 0.25);
      ctx.drawImage(art.canvas, -fw / 2, -fh / 2, fw, fh);
      ctx.restore();
      if (rt > 0.15 && Math.random() < 0.5) addRipple(game.bobber.tx, game.bobber.ty, 6);
    }

    /* particles */
    for (var p = 0; p < game.particles.length; p++) {
      var pt = game.particles[p];
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      px(pt.x, pt.y, pt.s, pt.s, pt.c);
      ctx.globalAlpha = 1;
    }
  }

  function drawBobber(x, y, t) {
    /* gentle idle ring */
    if (game.phase === 'waiting' && game.castT >= 1) {
      var rr = (Math.sin(t * 2.2) * 0.5 + 0.5) * 6 + 2;
      ctx.globalAlpha = 0.25;
      S.ellipseSpan(ctx, x, y + 2, rr, rr * 0.35, '#dff6f2');
      ctx.globalAlpha = 1;
    }
    /* outline */
    disc(x, y, 3, '#3a2a1a');
    disc(x, y, 2, '#ffffff');
    /* top red ball */
    for (var i = -2; i <= 0; i++) {
      var dx = Math.floor(Math.sqrt(Math.max(0, 4 - i * i)));
      px(x - dx, y + i - 1, dx * 2 + 1, 1, '#e84a3a');
    }
    px(x - 1, y - 3, 2, 1, '#ff8a72');
    px(x, y + 2, 1, 1, '#3a2a1a');
    /* antenna */
    px(x, y - 5, 1, 2, '#3a2a1a');
    px(x, y - 6, 1, 1, '#ffcf70');
  }

  /* ============================ scene render ======================== */
  function drawScene(t) {
    ctx.clearRect(0, 0, W, H);
    S.drawSky(ctx, t);
    S.drawBirds(ctx, t);
    S.drawHills(ctx);
    S.drawFarTrees(ctx, t);
    S.drawWater(ctx, t);
    S.drawReflections(ctx, t);
    S.drawLand(ctx, t);
    S.drawTree(ctx, t);
    S.drawBushes(ctx, t);
    S.drawReeds(ctx, t);
    S.drawDock(ctx, t);
    drawAngler(t);
    drawFishing(t);
    S.drawButterflies(ctx, t);
    S.drawGrassTufts(ctx, t);
    S.drawForeground(ctx, t);
    S.drawAirMotes(ctx, t);
    /* warm grade */
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffb45a';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  /* ============================== UI ================================ */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function panel(c, x, y, w, h, fill, border, bw, r) {
    roundRect(c, x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    if (border) {
      c.lineWidth = bw || 3;
      c.strokeStyle = border;
      c.stroke();
    }
  }
  function text(str, x, y, font, color, align) {
    ui.font = font;
    ui.textAlign = align || 'left';
    ui.textBaseline = 'alphabetic';
    ui.fillStyle = color;
    ui.fillText(str, x, y);
  }

  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function drawUI() {
    ui.clearRect(0, 0, DW, DH);

    /* ---- title ---- */
    text('TIDEHOLLOW PIER', 26, 44, '800 24px ' + FONT, '#fff2d0');
    text('a quiet fishing spot', 27, 64, '500 14px ' + FONT, '#bfe0e6');

    /* ---- status pill ---- */
    var status = '';
    var scolor = '#e8f4f4';
    if (game.phase === 'ready') { status = 'Ready to cast'; scolor = '#cfe8d0'; }
    else if (game.phase === 'waiting') { status = 'Waiting for a bite\u2026'; scolor = '#cfe0ee'; }
    else if (game.phase === 'bite') { status = ''; }
    else if (game.phase === 'reeling') { status = 'Reeling in\u2026'; scolor = '#ffe0b0'; }
    else if (game.phase === 'reveal') { status = 'Catch!'; scolor = '#ffe9a8'; }
    if (status) {
      ui.font = '700 18px ' + FONT;
      var tw = ui.measureText(status).width;
      panel(ui, 26, 78, tw + 34, 34, 'rgba(18,32,40,0.72)', 'rgba(200,230,235,0.35)', 2, 9);
      discUI(26 + 15, 95, 4, scolor);
      text(status, 26 + 28, 101, '700 18px ' + FONT, scolor);
    }

    /* ---- transient message ---- */
    if (game.msgTime > 0 && game.msg) {
      ui.globalAlpha = clamp(game.msgTime / 0.5, 0, 1);
      text(game.msg, DW / 2, 150, '700 22px ' + FONT, '#ffd9d0', 'center');
      ui.globalAlpha = 1;
    }

    /* ---- bite banner ---- */
    if (game.phase === 'bite') {
      var flash = 0.55 + 0.45 * Math.abs(Math.sin(game.t * 10));
      ui.globalAlpha = 1;
      ui.font = '900 40px ' + FONT;
      var bt = '! BITE !';
      var bw2 = ui.measureText(bt).width + 70;
      panel(ui, DW / 2 - bw2 / 2, 120, bw2, 66, 'rgba(120,20,20,' + (0.55 + flash * 0.25) + ')', '#ffd24a', 4, 12);
      text(bt, DW / 2, 168, '900 40px ' + FONT, 'rgb(255,' + Math.round(180 + flash * 60) + ',90)', 'center');
      /* shrinking timer bar */
      var frac = clamp(game.biteLeft / BITE_WINDOW, 0, 1);
      var barW = 340;
      panel(ui, DW / 2 - barW / 2, 194, barW, 12, 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.3)', 2, 6);
      var c = frac > 0.45 ? '#7CE07C' : '#ff8a5a';
      panel(ui, DW / 2 - barW / 2 + 2, 196, (barW - 4) * frac, 8, c, null, 0, 4);
    }

    /* ---- rarity legend (top right) ---- */
    drawLegend();

    /* ---- catch log (bottom left) ---- */
    drawLog();

    /* ---- intro card ---- */
    if (game.intro) drawIntro();

    /* ---- reveal ---- */
    if (game.phase === 'reveal' && game.pending) drawReveal();
  }

  function discUI(x, y, r, c) {
    ui.fillStyle = c;
    ui.beginPath();
    ui.arc(x, y, r, 0, Math.PI * 2);
    ui.fill();
  }

  function drawLegend() {
    var w = 300, h = 118, x = DW - w - 24, y = DH - h - 22;
    panel(ui, x, y, w, h, 'rgba(14,26,34,0.74)', 'rgba(170,210,215,0.28)', 2, 10);
    text('CATCH ODDS', x + 14, y + 24, '800 14px ' + FONT, '#a9cdd2');
    var colW = (w - 20) / 2;
    for (var i = 0; i < 6; i++) {
      var col = i % 2, row = Math.floor(i / 2);
      var ix = x + 14 + col * colW;
      var iy = y + 46 + row * 24;
      var info = RARITY[i];
      ui.fillStyle = info.color;
      roundRect(ui, ix, iy - 9, 12, 12, 3); ui.fill();
      text(info.name, ix + 19, iy, '600 15px ' + FONT, info.color);
      text(RARITY_ODDS[i], x + 14 + col * colW + colW - 16, iy, '700 15px ' + FONT, '#dfeef0', 'right');
    }
  }

  function drawLog() {
    var entries = window.fishing.log.slice(0, 8);
    var w = 300, h = 50 + Math.max(1, entries.length) * 25;
    var x = 24, y = DH - h - 22;
    panel(ui, x, y, w, h, 'rgba(14,26,34,0.74)', 'rgba(170,210,215,0.28)', 2, 10);
    text('RECENT CATCHES', x + 14, y + 26, '800 14px ' + FONT, '#a9cdd2');
    if (!entries.length) {
      text('nothing yet\u2026', x + 14, y + 52, '500 15px ' + FONT, '#7f9aa0');
      return;
    }
    for (var i = 0; i < entries.length; i++) {
      var en = entries[i];
      var info = rarityInfo(en.rarity);
      var ey = y + 48 + i * 25;
      ui.fillStyle = info.color;
      roundRect(ui, x + 14, ey - 9, 6, 12, 2); ui.fill();
      /* newest slightly brighter */
      text(en.name, x + 28, ey, (i === 0 ? '700' : '500') + ' 15px ' + FONT,
        i === 0 ? '#ffffff' : '#d6e6e8');
      text(en.rarity, x + w - 14, ey, '700 13px ' + FONT, info.color, 'right');
    }
  }

  function drawIntro() {
    var w = 560, h = 150, x = DW / 2 - w / 2, y = DH / 2 - h / 2 - 40;
    ui.globalAlpha = 0.96;
    panel(ui, x, y, w, h, 'rgba(12,24,32,0.9)', '#e8c98a', 4, 16);
    text('TIDEHOLLOW PIER', DW / 2, y + 48, '900 30px ' + FONT, '#ffe9b0', 'center');
    text('Cast your line into the calm water.', DW / 2, y + 84, '500 19px ' + FONT, '#d6ecec', 'center');
    var pulse = 0.6 + 0.4 * Math.abs(Math.sin(game.t * 3));
    ui.globalAlpha = pulse;
    text('Press  SPACE  or  click  CAST', DW / 2, y + 122, '800 22px ' + FONT, '#7CE07C', 'center');
    ui.globalAlpha = 1;
  }

  /* --------------------------- reveal card -------------------------- */
  function drawReveal() {
    var info = rarityInfo(game.pending.rarity);
    var tier = RARITY.indexOf(info);
    var t = game.revealT;
    var appear = clamp(t / 0.32, 0, 1);
    var ease = 1 - Math.pow(1 - appear, 3);

    var pw = 620, ph = 360;
    var cx = DW / 2, cy = DH / 2 - 30;
    var x = cx - pw / 2, y = cy - ph / 2;

    /* screen dim / special treatment */
    if (tier === 5) {
      ui.fillStyle = 'rgba(4,14,18,' + (0.45 * ease) + ')';
      ui.fillRect(0, 0, DW, DH);
    } else if (tier === 4) {
      ui.fillStyle = 'rgba(20,14,4,' + (0.30 * ease) + ')';
      ui.fillRect(0, 0, DW, DH);
    }

    ui.save();
    ui.globalAlpha = ease;
    ui.translate(cx, cy);
    var sc = 0.86 + 0.14 * ease;
    ui.scale(sc, sc);
    ui.translate(-cx, -cy);

    var fill = 'rgba(10,20,28,0.95)';
    var tint = {
      0: 'rgba(30,40,48,0.95)',
      1: 'rgba(16,38,26,0.95)',
      2: 'rgba(14,28,52,0.95)',
      3: 'rgba(34,16,48,0.95)',
      4: 'rgba(46,34,10,0.95)',
      5: 'rgba(6,26,26,0.96)'
    }[tier];

    panel(ui, x, y, pw, ph, tint, info.color, 5, 16);
    /* inner border line for layered tiers */
    if (tier >= 1) {
      roundRect(ui, x + 9, y + 9, pw - 18, ph - 18, 12);
      ui.lineWidth = 2; ui.strokeStyle = 'rgba(255,255,255,0.16)'; ui.stroke();
    }

    /* tier decorations drawn over the panel, behind the fish */
    if (tier === 5) drawAncientDeco(cx, cy, t, info);
    else if (tier === 4) drawLegendaryDeco(cx, cy, t, info);
    else if (tier === 3) drawEpicDeco(cx, cy, t, info);

    /* corner ornaments for high tiers */
    if (tier >= 3) drawCorners(x, y, pw, ph, info.color, t);

    /* tier-specific animation layers */
    if (tier === 1) drawMotes(cx, cy - 30, t, info, 5);
    else if (tier === 2) drawBubbles(cx, cy, t, info, 7);
    else if (tier === 3) drawStars(cx, cy - 30, t, info, 6);

    /* --- fish --- */
    var art = game.pending.art;
    var maxW = 300, maxH = 190;
    var fsc = Math.min(maxW / art.w, maxH / art.h, 8);
    var dw = Math.round(art.w * fsc), dh = Math.round(art.h * fsc);
    var fx = cx - dw / 2;
    var fy = cy - 60 - dh / 2 + Math.sin(t * 1.6) * (tier >= 4 ? 5 : 3);
    if (tier === 5) fy += Math.sin(t * 2.2) * 3;
    ctx.imageSmoothingEnabled = false;
    ui.imageSmoothingEnabled = false;
    /* shadow behind fish */
    ui.globalAlpha = ease * 0.35;
    ui.fillStyle = '#000';
    ui.beginPath();
    ui.ellipse(cx, cy + 42, dw * 0.42, 12, 0, 0, Math.PI * 2);
    ui.fill();
    ui.globalAlpha = ease;
    ui.drawImage(art.canvas, Math.round(fx), Math.round(fy), dw, dh);

    /* diagonal shine sweep over the finished art (rare + epic) */
    if (tier === 2 || tier === 3) drawShine(x, y, pw, ph, t);

    /* --- name + rarity --- */
    text(game.pending.name, cx, y + ph - 96, '900 36px ' + FONT, '#ffffff', 'center');
    /* rarity word with letter spacing */
    ui.save();
    ui.font = '800 22px ' + FONT;
    ui.textAlign = 'center';
    ui.fillStyle = info.color;
    spacedText(info.name.toUpperCase(), cx, y + ph - 58, 3);
    ui.restore();

    var taglines = {
      Common: 'A humble catch.',
      Uncommon: 'A nice little catch.',
      Rare: 'A fine catch!',
      Epic: 'What a beauty!',
      Legendary: 'A legendary catch!',
      Ancient: 'A relic of the deep.'
    };
    text(taglines[game.pending.rarity] || '',
      cx, y + ph - 26, '500 14px ' + FONT, 'rgba(230,245,245,0.7)', 'center');

    ui.restore();
    ui.globalAlpha = 1;

    /* reveal sparkles */
    for (var i = 0; i < game.sparkles.length; i++) {
      var sp = game.sparkles[i];
      var life = clamp(sp.life / sp.max, 0, 1);
      ui.globalAlpha = life * ease;
      ui.fillStyle = sp.c;
      ui.save();
      ui.translate(cx + sp.x, cy - 40 + sp.y);
      ui.rotate(sp.r + t * 2);
      var sz = 3 + life * 3;
      ui.fillRect(-sz, -1, sz * 2, 2);
      ui.fillRect(-1, -sz, 2, sz * 2);
      ui.restore();
    }
    ui.globalAlpha = 1;

    text('SPACE / CAST for the next cast', cx, y + ph + 34, '600 15px ' + FONT,
      'rgba(210,235,235,0.8)', 'center');
  }

  function spacedText(str, cx, y, gap) {
    ui.textAlign = 'left';
    var total = 0;
    for (var i = 0; i < str.length; i++) total += ui.measureText(str[i]).width + gap;
    total -= gap;
    var x = cx - total / 2;
    for (var k = 0; k < str.length; k++) {
      ui.fillText(str[k], x, y);
      x += ui.measureText(str[k]).width + gap;
    }
  }

  function drawCorners(x, y, w, h, color, t) {
    var s = 22;
    ui.strokeStyle = color;
    ui.lineWidth = 3;
    var pulse = 0.7 + 0.3 * Math.sin(t * 3);
    ui.globalAlpha = pulse;
    var pts = [[x + 14, y + 14, 1, 1], [x + w - 14, y + 14, -1, 1], [x + 14, y + h - 14, 1, -1], [x + w - 14, y + h - 14, -1, -1]];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      ui.beginPath();
      ui.moveTo(p[0], p[1] + p[3] * s);
      ui.lineTo(p[0], p[1]);
      ui.lineTo(p[0] + p[2] * s, p[1]);
      ui.stroke();
      ui.beginPath();
      ui.arc(p[0], p[1], 3, 0, Math.PI * 2);
      ui.fillStyle = color;
      ui.fill();
    }
    ui.globalAlpha = 1;
  }

  function drawShine(x, y, w, h, t) {
    var period = 2.4;
    var ph = (t % period) / period;
    var gx = x - 120 + ph * (w + 240);
    ui.save();
    roundRect(ui, x, y, w, h, 16);
    ui.clip();
    ui.globalAlpha = 0.18;
    ui.fillStyle = '#ffffff';
    ui.beginPath();
    ui.moveTo(gx, y);
    ui.lineTo(gx + 46, y);
    ui.lineTo(gx - 34, y + h);
    ui.lineTo(gx - 80, y + h);
    ui.closePath();
    ui.fill();
    ui.restore();
    ui.globalAlpha = 1;
  }

  function drawMotes(cx, cy, t, info, n) {
    for (var i = 0; i < n; i++) {
      var ph = (t * 0.5 + i / n) % 1;
      var x = cx + Math.sin(i * 2.3 + t) * 120;
      var y = cy + 70 - ph * 170;
      ui.globalAlpha = (1 - ph) * 0.7;
      ui.fillStyle = info.color;
      ui.beginPath();
      ui.arc(x, y, 2.4, 0, Math.PI * 2);
      ui.fill();
    }
    ui.globalAlpha = 1;
  }

  function drawBubbles(cx, cy, t, info, n) {
    for (var i = 0; i < n; i++) {
      var ph = (t * 0.4 + i / n) % 1;
      var x = cx - 110 + ((i * 53) % 220) + Math.sin(t + i) * 6;
      var y = cy + 70 - ph * 170;
      ui.globalAlpha = (1 - ph) * 0.55;
      ui.strokeStyle = info.color;
      ui.lineWidth = 2;
      ui.beginPath();
      ui.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
      ui.stroke();
    }
    ui.globalAlpha = 1;
  }

  function drawStars(cx, cy, t, info, n) {
    for (var i = 0; i < n; i++) {
      var a = t * 1.2 + i * (Math.PI * 2 / n);
      var rad = 130 + Math.sin(t * 2 + i) * 12;
      var x = cx + Math.cos(a) * rad;
      var y = cy + Math.sin(a) * rad * 0.55;
      ui.save();
      ui.translate(x, y);
      ui.rotate(a);
      ui.globalAlpha = 0.85;
      ui.fillStyle = info.color;
      ui.fillRect(-6, -1.5, 12, 3);
      ui.fillRect(-1.5, -6, 3, 12);
      ui.restore();
    }
    ui.globalAlpha = 1;
  }

  function drawEpicDeco(cx, cy, t, info) {
    ui.save();
    ui.globalAlpha = 0.18 + 0.08 * Math.sin(t * 3);
    var g = ui.createRadialGradient(cx, cy, 30, cx, cy, 340);
    g.addColorStop(0, info.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ui.fillStyle = g;
    ui.fillRect(cx - 360, cy - 300, 720, 600);
    ui.restore();
    ui.globalAlpha = 1;
  }

  function drawLegendaryDeco(cx, cy, t, info) {
    ui.save();
    ui.translate(cx, cy);
    ui.rotate(t * 0.25);
    for (var i = 0; i < 18; i++) {
      ui.rotate(Math.PI * 2 / 18);
      ui.globalAlpha = 0.13 + 0.07 * Math.sin(t * 4 + i);
      ui.fillStyle = info.color;
      ui.beginPath();
      ui.moveTo(180, -14);
      ui.lineTo(360, -4);
      ui.lineTo(360, 4);
      ui.lineTo(180, 14);
      ui.closePath();
      ui.fill();
    }
    ui.restore();
    ui.globalAlpha = 0.22;
    var g = ui.createRadialGradient(cx, cy, 20, cx, cy, 320);
    g.addColorStop(0, info.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ui.fillStyle = g;
    ui.fillRect(cx - 340, cy - 280, 680, 560);
    ui.globalAlpha = 1;
  }

  function drawAncientDeco(cx, cy, t, info) {
    /* deep glow */
    var g = ui.createRadialGradient(cx, cy, 10, cx, cy, 380);
    g.addColorStop(0, 'rgba(79,230,208,0.30)');
    g.addColorStop(0.5, 'rgba(30,140,140,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ui.fillStyle = g;
    ui.fillRect(cx - 400, cy - 320, 800, 640);

    /* rotating runic ring */
    ui.save();
    ui.translate(cx, cy);
    ui.rotate(t * 0.16);
    var n = 12;
    for (var i = 0; i < n; i++) {
      ui.rotate(Math.PI * 2 / n);
      var a = 0.25 + 0.35 * Math.abs(Math.sin(t * 2 + i));
      ui.globalAlpha = a;
      ui.fillStyle = info.color;
      /* little rune glyphs */
      ui.fillRect(210, -3, 3, 18);
      ui.fillRect(210, -3, 14, 3);
      ui.fillRect(221, -3, 3, 10);
      ui.fillRect(214, 6, 10, 3);
      ui.beginPath();
      ui.arc(240, 6, 3.5, 0, Math.PI * 2);
      ui.fill();
    }
    ui.restore();

    /* slow pulsing outer ring */
    ui.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2);
    ui.strokeStyle = info.color;
    ui.lineWidth = 2;
    ui.beginPath();
    ui.arc(cx, cy - 20, 260 + Math.sin(t * 2) * 6, 0, Math.PI * 2);
    ui.stroke();
    ui.globalAlpha = 1;
  }

  /* ---------------------------- button ----------------------------- */
  function setButton(label, key) {
    castBtn.firstChild.textContent = label;
    var k = castBtn.querySelector('.key');
    k.textContent = key;
    k.style.display = key ? '' : 'none';
  }

  function updateButton() {
    if (game.phase === 'bite') {
      castBtn.classList.add('bite');
      setButton('REEL IN! ', 'SPACE');
    } else if (game.phase === 'waiting') {
      castBtn.classList.remove('bite');
      setButton('WAIT\u2026 ', '');
    } else if (game.phase === 'reeling') {
      castBtn.classList.remove('bite');
      setButton('REELING\u2026 ', '');
    } else if (game.phase === 'reveal') {
      castBtn.classList.remove('bite');
      setButton('NEXT CAST ', 'SPACE');
    } else {
      castBtn.classList.remove('bite');
      setButton('CAST ', 'SPACE');
    }
  }

  /* ------------------------------ loop ------------------------------ */
  var last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = (now - last) / 1000;
    last = now;
    if (document.hidden) return;         /* timers pause while hidden */
    dt = clamp(dt, 0, 0.1);
    update(dt);
    drawScene(game.t);
    drawUI();
  }
  document.addEventListener('visibilitychange', function () {
    last = performance.now();
  });

  /* --------------------------- fit / scale -------------------------- */
  var stage = document.getElementById('stage');
  function fit() {
    var s = Math.min(window.innerWidth / DW, window.innerHeight / DH);
    if (s >= 1) s = 1;
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();
  updateButton();
  requestAnimationFrame(loop);

  /* expose a few internals for testing / debugging (non-visual) */
  window.__game = game;
})();
