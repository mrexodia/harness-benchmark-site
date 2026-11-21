// Tideline - a tiny cozy fishing game.
// Logic, input and the window.fishing test interface.
import { FISH, FISH_BY_RARITY, pickFishForRarity } from './fish.js';
import { drawWorld, drawReveal, REVEAL, ANGLER } from './scene.js';
import { drawUI, UW, UH, BUTTON } from './ui.js';

// ---------------------------------------------------------------------------
// Rarity roll. Pure, no history.
// ---------------------------------------------------------------------------
const RARITY_BOUNDS = [
  [0.45, 'Common'],
  [0.70, 'Uncommon'],
  [0.85, 'Rare'],
  [0.93, 'Epic'],
  [0.98, 'Legendary'],
  [1.00, 'Ancient'],
];
function pickRarity(u) {
  let x = typeof u === 'number' && !Number.isNaN(u) ? u : 0;
  if (x < 0) x = 0;
  if (x >= 1) x = 0.9999999;
  for (const [bound, name] of RARITY_BOUNDS) {
    if (x < bound) return name;
  }
  return 'Ancient';
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const TARGET = { x: 120, y: 96 };
const ROD = { x: ANGLER.x - 6, y: ANGLER.feet - 12 };

const game = {
  phase: 'ready',
  time: 0,
  phaseTime: 0,
  started: false,
  castDuration: 0.5,
  waitDelay: 2.6,
  biteDuration: 1.8,
  reelDuration: 1.4,
  revealAuto: 3.0,
  bobber: null,
  lineActive: false,
  lineSag: 2,
  bitePos: { x: TARGET.x, y: TARGET.y },
  caught: null,
  catchSprite: null,
  shake: 0,
  particles: [],
  toast: null,
  fishByName: {},
  log: [],
};
for (const f of FISH) game.fishByName[f.name] = f;

// Test interface. Replacing pickRarity changes every catch.
window.fishing = {
  pickRarity,
  log: game.log,
  get state() { return game.phase; },
};

// ---------------------------------------------------------------------------
// Canvas / stage
// ---------------------------------------------------------------------------
const sceneCanvas = document.getElementById('scene');
const uiCanvas = document.getElementById('ui');
const stage = document.getElementById('stage');
const sg = sceneCanvas.getContext('2d');
const ug = uiCanvas.getContext('2d');
sg.imageSmoothingEnabled = false;
ug.imageSmoothingEnabled = false;

function fitStage() {
  const s = Math.min(window.innerWidth / UW, window.innerHeight / UH);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fitStage);
fitStage();

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
function pointerToUI(e) {
  const rect = uiCanvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * UW,
    y: ((e.clientY - rect.top) / rect.height) * UH,
  };
}
function inButton(p) {
  return p.x >= BUTTON.x && p.x <= BUTTON.x + BUTTON.w && p.y >= BUTTON.y && p.y <= BUTTON.y + BUTTON.h;
}

uiCanvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = pointerToUI(e);
  if (inButton(p)) handleAction();
});
uiCanvas.addEventListener('pointermove', (e) => {
  const p = pointerToUI(e);
  uiCanvas.style.cursor = inButton(p) ? 'pointer' : 'default';
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (e.repeat) return;
    handleAction();
  }
});

function handleAction() {
  if (game.phase === 'ready') startCast();
  else if (game.phase === 'bite') startReel();
  else if (game.phase === 'reveal') resetToReady();
  // waiting / reeling: ignore, so no duplicate casts or catches
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------
function startCast() {
  game.started = true;
  game.phase = 'waiting';
  game.phaseTime = 0;
  game.castDuration = 0.45 + Math.random() * 0.15;
  game.waitDelay = 2.0 + Math.random() * 1.7;
  game.bobber = { x: TARGET.x, y: TARGET.y, visible: true, inWater: false, dip: 0 };
  game.lineActive = true;
  game.catchSprite = null;
  game.caught = null;
}

function enterBite() {
  game.phase = 'bite';
  game.phaseTime = 0;
  game.biteDuration = 1.5 + Math.random() * 0.6;
  game.shake = 1.0;
  game.bitePos = { x: TARGET.x, y: TARGET.y };
  splash(game.bobber.x, game.bobber.y + 1, 10);
  // cue ring particles
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    spawn(game.bobber.x + Math.cos(a) * 5, game.bobber.y + 1 + Math.sin(a) * 2,
      Math.cos(a) * 10, Math.sin(a) * 5 - 4, 0.6, '#eefbf4', 1);
  }
}

function startReel() {
  // Every successful catch rolls exactly here, through the test interface.
  const rarity = window.fishing.pickRarity(Math.random());
  const fish = FISH_BY_RARITY[rarity]
    ? pickFishForRarity(rarity)
    : (pickFishForRarity('Common'));
  const caught = { ...fish, rarity: FISH_BY_RARITY[rarity] ? rarity : 'Common' };
  game.caught = caught;
  game.phase = 'reeling';
  game.phaseTime = 0;
  game.shake = 1.0;
  game.bitePos = { x: game.bobber.x, y: game.bobber.y };
  splash(game.bitePos.x, game.bitePos.y + 1, 16);
}

function enterReveal() {
  game.phase = 'reveal';
  game.phaseTime = 0;
  game.revealTime = 0;
  if (game.caught) game.log.unshift({ name: game.caught.name, rarity: game.caught.rarity });
  const auto = { Common: 2.4, Uncommon: 2.6, Rare: 2.8, Epic: 3.2, Legendary: 3.6, Ancient: 4.2 };
  game.revealAuto = game.caught ? auto[game.caught.rarity] : 2.6;
  game.lineActive = false;
  game.bobber = null;
  game.catchSprite = null;
}

function miss() {
  game.phase = 'ready';
  game.phaseTime = 0;
  game.lineActive = false;
  game.bobber = null;
  game.toast = { text: 'IT GOT AWAY...', life: 1.5, maxLife: 1.5 };
  if (game.bitePos) {
    for (let i = 0; i < 6; i++) {
      spawn(game.bitePos.x + (Math.random() - 0.5) * 6, game.bitePos.y, 0, -12 - Math.random() * 10, 0.7, '#9fe0d8', 1);
    }
  }
}

function resetToReady() {
  game.phase = 'ready';
  game.phaseTime = 0;
  game.caught = null;
  game.catchSprite = null;
  game.bobber = null;
  game.lineActive = false;
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------
function spawn(x, y, vx, vy, life, color, size = 1) {
  game.particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}
function splash(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const sp = 20 + Math.random() * 40;
    spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.45 + Math.random() * 0.4, '#eefbf4', Math.random() > 0.7 ? 2 : 1);
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) { game.particles.splice(i, 1); continue; }
    p.vy += 95 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

// ---------------------------------------------------------------------------
// Per-frame dynamic values (rod, bobber, catch animation)
// ---------------------------------------------------------------------------
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function ease(u) { return u * u * (3 - 2 * u); }

function updateDynamic(t, dt) {
  const ph = game.phase;
  const pt = game.phaseTime;

  // rod tip
  let tip = { x: 169, y: 124 };
  if (ph === 'ready') tip = { x: 168 + Math.sin(t * 1.2), y: 124 + Math.sin(t * 1.7) };
  else if (ph === 'waiting') {
    const swing = pt < game.castDuration ? -6 * (1 - pt / game.castDuration) : 0;
    tip = { x: 166 + swing * 0.4, y: 126 + swing };
  } else if (ph === 'bite') {
    tip = { x: 166, y: 126 + Math.sin(t * 32) * 1.2 };
  } else if (ph === 'reeling') {
    const bend = ease(clamp(pt / 0.35, 0, 1));
    tip = { x: ANGLER.x - 10 + bend * 4, y: ANGLER.feet - 14 + bend * 11 };
  } else if (ph === 'reveal') {
    tip = { x: 170, y: 128 };
  }
  game.rod = ROD;
  game.rodTip = tip;

  // bobber
  if (ph === 'waiting') {
    if (pt < game.castDuration) {
      const u = pt / game.castDuration;
      const sx = 169, sy = 124;
      const x = sx + (TARGET.x - sx) * u;
      const y = sy + (TARGET.y - sy) * u - Math.sin(Math.PI * u) * 26;
      game.bobber = { x, y, visible: true, inWater: false, dip: 0 };
      game.lineSag = 6;
    } else {
      const b = Math.sin(t * 2.4);
      game.bobber = { x: TARGET.x + Math.sin(t * 0.6) * 0.6, y: TARGET.y + b * 0.6, visible: true, inWater: true, dip: 0 };
      game.lineSag = 3 + b * 0.8;
    }
  } else if (ph === 'bite') {
    const dip = 2 + Math.abs(Math.sin(t * 15)) * 2.5;
    game.bobber = { x: TARGET.x - 1 + Math.sin(t * 18) * 0.8, y: TARGET.y + dip, visible: true, inWater: true, dip };
    game.lineSag = -2;
    // occasional droplets while the fish pulls
    if (Math.random() < 0.35) spawn(TARGET.x, TARGET.y + 1, (Math.random() - 0.5) * 24, -16 - Math.random() * 14, 0.4, '#cdeff0', 1);
  } else if (ph === 'reeling') {
    game.bobber = null;
    game.lineActive = false;
  }

  // caught fish arc
  if (ph === 'reeling' && game.caught) {
    const u = clamp(pt / game.reelDuration, 0, 1);
    const e = ease(u);
    const sx = game.bitePos.x, sy = game.bitePos.y;
    const ex = ANGLER.x - 9, ey = ANGLER.feet - 17;
    const x = sx + (ex - sx) * e;
    const y = sy + (ey - sy) * e - Math.sin(Math.PI * u) * 32;
    const scale = 0.8 + Math.sin(Math.PI * clamp(u * 1.15, 0, 1)) * 0.9;
    game.catchSprite = { x, y, scale, visible: u > 0.1 };
    if (Math.random() < 0.6) {
      spawn(x, y + 4, (Math.random() - 0.5) * 20, -8 - Math.random() * 12, 0.5, '#bfeef0', 1);
    }
  } else {
    game.catchSprite = null;
  }

  game.revealTime = ph === 'reveal' ? pt : 0;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 3.5);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  game.time += dt;
  game.phaseTime += dt;
  const ph = game.phase;

  if (ph === 'waiting') {
    if (game.phaseTime >= game.castDuration + game.waitDelay) enterBite();
  } else if (ph === 'bite') {
    if (game.phaseTime >= game.biteDuration) miss();
  } else if (ph === 'reeling') {
    if (game.phaseTime >= game.reelDuration) enterReveal();
  } else if (ph === 'reveal') {
    if (game.phaseTime >= game.revealAuto) resetToReady();
  }

  if (game.toast) {
    game.toast.life -= dt;
    if (game.toast.life <= 0) game.toast = null;
  }
  updateParticles(dt);
  updateDynamic(game.time, dt);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render() {
  sg.save();
  if (game.shake > 0) {
    const s = game.shake * 1.8;
    sg.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawWorld(sg, game.time, game);
  if (game.phase === 'reveal') drawReveal(sg, game.time, game);
  sg.restore();

  drawUI(ug, game, game.time);
}

// ---------------------------------------------------------------------------
// Main loop, paused while the tab is hidden
// ---------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { last = now; return; }
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  update(dt);
  render();
}
document.addEventListener('visibilitychange', () => { last = performance.now(); });
requestAnimationFrame(frame);
