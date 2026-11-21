import { W, H, drawScene, ROD_TIP, ANGLER } from './scene.js';
import { UI_W, UI_H, drawUI, BUTTON } from './ui.js';
import { pickRarity, speciesForRarity, fishCanvas } from './fish.js';
import { drawText } from './font.js';
import { Sound } from './audio.js';

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
const S = { READY: 'ready', WAITING: 'waiting', BITE: 'bite', REELING: 'reeling', REVEAL: 'reveal' };

const CAST_ANIM = 0.7;
const WAIT_MIN = 1.4, WAIT_MAX = 2.8;
const BITE_WINDOW = 1.7;
const REEL_TIME = 1.25;
const REVEAL_TIME = 2.7;

const game = {
  state: S.READY,
  time: 0,
  phaseT: 0,
  castT: 0,
  waitDuration: 0,
  biteRemaining: 0,
  reelT: 0,
  BITE_WINDOW,
  reveal: null,
  log: [],
  particles: [],
  toast: null,
  pendingFish: null,
  bobber: { x: ROD_TIP.x, y: ROD_TIP.y, visible: false, state: 'idle', t: 0, targetX: 230, targetY: 150 },
  castAnim: null,
  buttonHover: false,
  buttonDown: false,
  catchCount: 0,
};

// ---------------------------------------------------------------------------
// canvases
// ---------------------------------------------------------------------------
const world = document.getElementById('world');
const ui = document.getElementById('ui');
world.width = W; world.height = H;
ui.width = UI_W; ui.height = UI_H;
const wctx = world.getContext('2d');
const uctx = ui.getContext('2d');
wctx.imageSmoothingEnabled = false;
uctx.imageSmoothingEnabled = false;

function fitStage() {
  const stage = document.getElementById('stage');
  const s = Math.min(window.innerWidth / UI_W, window.innerHeight / UI_H);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fitStage);
fitStage();

// ---------------------------------------------------------------------------
// particles
// ---------------------------------------------------------------------------
function spawnSplash(x, y, n, power = 1) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const sp = (30 + Math.random() * 60) * power;
    game.particles.push({
      kind: 'splash', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9, size: 1 + (Math.random() < 0.4 ? 1 : 0), color: '#e8f6f2',
    });
  }
  game.particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.7, maxLife: 0.7, size: 12, color: '#e8f6f2' });
}

function spawnBurst(x, y, col, n = 16) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 20 + Math.random() * 70;
    game.particles.push({
      kind: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
      life: 0.7 + Math.random() * 0.6, maxLife: 1.3, size: 2, color: Math.random() < 0.5 ? col : '#ffffff',
    });
  }
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'splash' || p.kind === 'star') p.vy += 160 * dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------
function startCast() {
  if (game.state !== S.READY) return;
  game.state = S.WAITING;
  game.phaseT = 0;
  game.castT = 0;
  game.waitDuration = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
  game.bobber.visible = true;
  game.bobber.state = 'flying';
  game.bobber.t = 0;
  game.bobber.targetX = 186 + Math.random() * 44;
  game.bobber.targetY = 146 + Math.random() * 6;
  game.bobber.x = ROD_TIP.x;
  game.bobber.y = ROD_TIP.y;
  Sound.cast();
}

function enterBite() {
  game.state = S.BITE;
  game.phaseT = 0;
  game.biteRemaining = BITE_WINDOW;
  game.bobber.state = 'bite';
  Sound.bite();
}

function reelIn() {
  if (game.state !== S.BITE) return;
  game.state = S.REELING;
  game.phaseT = 0;
  game.reelT = 0;
  game.bobber.state = 'reeling';
  // choose the fish now, using the swappable global function
  let rarity = window.fishing.pickRarity(Math.random());
  let pool = speciesForRarity(rarity);
  if (!pool || !pool.length) { rarity = 'Common'; pool = speciesForRarity(rarity); }
  const name = pool[Math.floor(Math.random() * pool.length)];
  game.pendingFish = { name, rarity };
  spawnSplash(game.bobber.targetX, game.bobber.targetY, 14, 1.2);
  Sound.reel();
}

function finishCatch() {
  const f = game.pendingFish;
  game.state = S.REVEAL;
  game.phaseT = 0;
  game.catchCount++;
  game.log.unshift({ name: f.name, rarity: f.rarity });
  game.reveal = { name: f.name, rarity: f.rarity, t: 0, count: game.catchCount };
  game.bobber.visible = false;
  game.bobber.state = 'idle';
  spawnBurst(game.bobber.targetX, game.bobber.targetY, '#fff3c4', 20);
  Sound.catch(f.rarity);
}

function miss() {
  game.state = S.READY;
  game.phaseT = 0;
  game.bobber.visible = false;
  game.bobber.state = 'idle';
  game.toast = { text: 'IT GOT AWAY...', t: 1.2 };
  Sound.miss();
}

function dismissReveal() {
  if (game.state !== S.REVEAL) return;
  game.state = S.READY;
  game.phaseT = 0;
  game.reveal = null;
  game.pendingFish = null;
}

function handleAction() {
  switch (game.state) {
    case S.READY: startCast(); break;
    case S.BITE: reelIn(); break;
    case S.REVEAL: dismissReveal(); break;
    default: break; // waiting / reeling ignore input
  }
}

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
function update(dt) {
  game.time += dt;
  game.phaseT += dt;
  game.bobber.t += dt;
  if (game.toast) { game.toast.t -= dt; if (game.toast.t <= 0) game.toast = null; }

  const b = game.bobber;

  if (game.state === S.WAITING) {
    game.castT += dt;
    if (game.castT < CAST_ANIM) {
      const u = game.castT / CAST_ANIM;
      b.x = ROD_TIP.x + (b.targetX - ROD_TIP.x) * u;
      b.y = ROD_TIP.y + (b.targetY - ROD_TIP.y) * u - Math.sin(u * Math.PI) * 26;
      game.castAnim = u;
    } else {
      if (b.state === 'flying') {
        b.state = 'floating';
        spawnSplash(b.targetX, b.targetY, 6, 0.7);
        Sound.splash();
      }
      game.castAnim = null;
      b.x = b.targetX;
      b.y = b.targetY + Math.sin(game.time * 2) * 0.6;
      if (game.castT >= game.waitDuration) enterBite();
    }
  } else if (game.state === S.BITE) {
    game.biteRemaining -= dt;
    b.x = b.targetX;
    b.y = b.targetY + 1.5;
    if (game.biteRemaining <= 0) miss();
  } else if (game.state === S.REELING) {
    game.reelT += dt;
    const u = Math.min(1, game.reelT / REEL_TIME);
    b.x = b.targetX + (ANGLER.x + 24 - b.targetX) * u;
    b.y = b.targetY + (ANGLER.feetY - 18 - b.targetY) * u - Math.sin(u * Math.PI) * 14;
    if (game.reelT >= REEL_TIME) finishCatch();
  } else if (game.state === S.REVEAL) {
    if (game.reveal) game.reveal.t += dt;
    if (game.reveal && game.reveal.t >= REVEAL_TIME) dismissReveal();
  }

  updateParticles(dt);
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
function drawLeapingFish(ctx) {
  if (game.state !== S.REELING || !game.pendingFish) return;
  const u = game.reelT / REEL_TIME;
  if (u < 0.08 || u > 0.92) return;
  const p = (u - 0.08) / 0.84;
  const x = game.bobber.targetX + (ANGLER.x + 20 - game.bobber.targetX) * p;
  const y = game.bobber.targetY + (ANGLER.feetY - 20 - game.bobber.targetY) * p - Math.sin(p * Math.PI) * 40;
  const spr = fishCanvas(game.pendingFish.name);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-1, 1);
  ctx.rotate(Math.sin(game.time * 16) * 0.18);
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();
  // little droplets
  if (Math.random() < 0.5) spawnSplash(x, y + 6, 1, 0.5);
}

function render() {
  drawScene(wctx, game.time, game);
  drawLeapingFish(wctx);
  drawUI(uctx, game);
  if (game.toast) {
    const a = Math.min(1, game.toast.t / 0.3);
    drawText(uctx, game.toast.text, UI_W / 2, 470, {
      color: `rgba(255,208,192,${a})`, scale: 3, align: 'center', shadow: true,
    });
  }
}

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
function uiCoords(ev) {
  const r = ui.getBoundingClientRect();
  const x = (ev.clientX - r.left) * (UI_W / r.width);
  const y = (ev.clientY - r.top) * (UI_H / r.height);
  return { x, y };
}

function inButton(x, y) {
  return x >= BUTTON.x && x <= BUTTON.x + BUTTON.w && y >= BUTTON.y && y <= BUTTON.y + BUTTON.h;
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    handleAction();
  }
  if (e.key === 'm' || e.key === 'M') Sound.toggle();
});

ui.addEventListener('pointermove', (e) => {
  const { x, y } = uiCoords(e);
  game.buttonHover = inButton(x, y);
  ui.style.cursor = game.buttonHover ? 'pointer' : 'default';
});
ui.addEventListener('pointerdown', (e) => {
  const { x, y } = uiCoords(e);
  if (inButton(x, y)) {
    game.buttonDown = true;
    handleAction();
    e.preventDefault();
  }
  ui.setPointerCapture?.(e.pointerId);
});
window.addEventListener('pointerup', () => { game.buttonDown = false; });
window.addEventListener('pointercancel', () => { game.buttonDown = false; });

// ---------------------------------------------------------------------------
// loop (rAF naturally pauses when the tab is hidden; clamp dt so timers freeze)
// ---------------------------------------------------------------------------
let last = performance.now();
document.addEventListener('visibilitychange', () => { last = performance.now(); });

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp: no catch-up after hidden tab
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
// public test interface
// ---------------------------------------------------------------------------
window.fishing = {
  get state() { return game.state; },
  pickRarity,
  log: game.log,
};
