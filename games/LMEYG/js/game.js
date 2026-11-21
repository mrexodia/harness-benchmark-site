import { drawScene, rodTip, ANGLER } from './scene.js';
import { drawUI, BUTTON } from './ui.js';
import { FISH } from './art.js';

const sceneCanvas = document.getElementById('scene');
const uiCanvas = document.getElementById('ui');
const sctx = sceneCanvas.getContext('2d');
const uctx = uiCanvas.getContext('2d');
sctx.imageSmoothingEnabled = false;
uctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------------------
// Rarity
// ---------------------------------------------------------------------------
export function pickRarity(u) {
  if (u < 0.45) return 'Common';
  if (u < 0.70) return 'Uncommon';
  if (u < 0.85) return 'Rare';
  if (u < 0.93) return 'Epic';
  if (u < 0.98) return 'Legendary';
  return 'Ancient';
}

const g = {
  state: 'ready',
  t: 0,
  started: false,
  casting: false,
  castProg: 0,
  bobber: { x: 0, y: 0, active: false, flying: false, dip: 0, baseX: 0, baseY: 0 },
  waitTimer: 0,
  biteAge: 0,
  biteWindow: 1.8,
  reelAge: 0,
  reveal: null,
  toast: null,
  toastAge: 0,
  toastLife: 1.4,
  ripples: [],
  particles: [],
  log: [],
  pendingCatch: null,
};

// Public test interface ------------------------------------------------------
const fishing = {
  get state() { return g.state; },
  pickRarity,
  log: g.log,
};
window.fishing = fishing;

// ---------------------------------------------------------------------------
// Timing constants (seconds)
// ---------------------------------------------------------------------------
const CAST_DUR = 0.8;
const WAIT_MIN = 2.7;
const WAIT_MAX = 5.2;
const BITE_WINDOW = 1.8;
const REEL_DUR = 1.6;
const REVEAL_AUTO = 16;

// ---------------------------------------------------------------------------
// Effects helpers
// ---------------------------------------------------------------------------
function spawnRipple(x, y, max, life = 0.9) {
  g.ripples.push({ x, y, age: 0, life, max });
}

function spawnSplash(x, y, n, power) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 3.0;
    const sp = (0.6 + Math.random()) * power;
    g.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - power * 0.4,
      age: 0, life: 0.5 + Math.random() * 0.5,
      color: Math.random() > 0.4 ? '#d8f4f2' : '#8fd6e0', size: 1 + (Math.random() > 0.7 ? 1 : 0),
      gravity: 12,
    });
  }
  spawnRipple(x, y, 7 + power * 3, 0.8);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function startCast() {
  g.state = 'waiting';
  g.casting = true;
  g.castProg = 0;
  const tip = rodTip(g);
  const tx = 182 + Math.random() * 74;
  const ty = 126 + Math.random() * 26;
  g.bobber.x = tip.x;
  g.bobber.y = tip.y;
  g.bobber.baseX = tx;
  g.bobber.baseY = ty;
  g.bobber.active = true;
  g.bobber.flying = true;
  g.bobber.dip = 0;
  g.castFrom = { x: tip.x, y: tip.y };
  g.waitTimer = 0;
}

function startReel() {
  g.state = 'reeling';
  g.reelAge = 0;
  // Decide the catch now, through the public interface.
  const rarity = window.fishing.pickRarity(Math.random());
  const pool = FISH.filter(f => f.rarity === rarity);
  const chosen = (pool.length ? pool : FISH.filter(f => f.rarity === 'Common'))[
    Math.floor(Math.random() * (pool.length || FISH.filter(f => f.rarity === 'Common').length))
  ];
  g.pendingCatch = chosen;
  g.reelFrom = { x: g.bobber.x, y: g.bobber.y };
  spawnSplash(g.bobber.x, g.bobber.y, 22, 3.2);
}

function endReveal() {
  g.reveal = null;
  g.pendingCatch = null;
  g.state = 'ready';
  g.bobber.active = false;
}

function missBite() {
  g.state = 'ready';
  g.bobber.active = false;
  g.toast = 'THE FISH GOT AWAY';
  g.toastAge = 0;
  g.toastLife = 1.4;
  spawnRipple(g.bobber.x, g.bobber.y, 6, 0.7);
}

function action() {
  if (g.state === 'ready') {
    if (!g.started) g.started = true;
    startCast();
  } else if (g.state === 'bite') {
    startReel();
  } else if (g.state === 'reveal') {
    endReveal();
  }
  // waiting / reeling: ignored (no overlapping casts, no double catches)
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  if (document.hidden) return; // timers fully pause while hidden
  g.t += dt;

  // Toast
  if (g.toast) {
    g.toastAge += dt;
    if (g.toastAge > g.toastLife) g.toast = null;
  }

  // Ripples / particles
  for (const r of g.ripples) r.age += dt;
  g.ripples = g.ripples.filter(r => r.age < r.life);
  for (const p of g.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
  }
  g.particles = g.particles.filter(p => p.age < p.life);

  const b = g.bobber;

  if (g.casting) {
    g.castProg += dt / CAST_DUR;
    if (g.castProg >= 1) { g.casting = false; g.castProg = 1; }
  }

  switch (g.state) {
    case 'waiting': {
      if (!b.active) break;
      if (b.flying) {
        const k = Math.min(1, g.castProg);
        const e = k;
        b.x = g.castFrom.x + (b.baseX - g.castFrom.x) * e;
        b.y = g.castFrom.y + (b.baseY - g.castFrom.y) * e - Math.sin(Math.PI * k) * 26;
        if (k >= 1) {
          b.flying = false;
          b.y = b.baseY;
          spawnSplash(b.x, b.y, 10, 2.0);
          g.waitTimer = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
        }
      } else {
        // idle float
        b.x = b.baseX + Math.sin(g.t * 1.1) * 0.8;
        b.y = b.baseY + Math.sin(g.t * 2.2) * 0.9;
        b.dip = 0;
        g.waitTimer -= dt;
        if (Math.random() < dt * 0.7) spawnRipple(b.baseX + (Math.random() - 0.5) * 10, b.baseY + 3, 4, 0.9);
        if (g.waitTimer <= 0) {
          g.state = 'bite';
          g.biteAge = 0;
          g.biteWindow = BITE_WINDOW;
          spawnSplash(b.x, b.y, 8, 1.6);
        }
      }
      break;
    }
    case 'bite': {
      b.dip = 2 + Math.sin(g.t * 20) * 1.4;
      b.x = b.baseX + Math.sin(g.t * 22) * 1.2;
      b.y = b.baseY + b.dip;
      g.biteAge += dt;
      if (Math.random() < dt * 4) spawnRipple(b.baseX, b.baseY + 2, 5, 0.6);
      if (g.biteAge >= g.biteWindow) missBite();
      break;
    }
    case 'reeling': {
      g.reelAge += dt;
      const k = Math.min(1, g.reelAge / REEL_DUR);
      const tip = rodTip(g);
      const e = k * k;
      b.x = g.reelFrom.x + (tip.x + 4 - g.reelFrom.x) * e;
      b.y = g.reelFrom.y + (tip.y + 6 - g.reelFrom.y) * e;
      if (Math.random() < dt * 18) spawnSplash(b.x, b.y, 2, 1.2);
      if (k >= 1) {
        g.bobber.active = false;
        if (g.pendingCatch) {
          const entry = { name: g.pendingCatch.name, rarity: g.pendingCatch.rarity };
          g.log.unshift(entry);
          g.reveal = { name: entry.name, rarity: entry.rarity, age: 0 };
          g.state = 'reveal';
        } else {
          g.state = 'ready';
        }
      }
      break;
    }
    case 'reveal': {
      if (g.reveal) {
        g.reveal.age += dt;
        if (g.reveal.age > REVEAL_AUTO) endReveal();
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (document.hidden) dt = 0;
  dt = Math.min(dt, 0.05); // avoid jumps after stalls
  update(dt);
  drawScene(sctx, g);
  drawUI(uctx, g);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => { last = performance.now(); });

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (e.repeat) return;
    e.preventDefault();
    action();
  }
});

function toUiCoords(clientX, clientY) {
  const rect = uiCanvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (uiCanvas.width / rect.width),
    y: (clientY - rect.top) * (uiCanvas.height / rect.height),
  };
}

uiCanvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = toUiCoords(e.clientX, e.clientY);
  const d = Math.hypot(p.x - BUTTON.x, p.y - BUTTON.y);
  if (d <= BUTTON.r + 10) action();
});

// ---------------------------------------------------------------------------
// Viewport fitting (keeps 1280x720 visible without scrolling)
// ---------------------------------------------------------------------------
const stage = document.getElementById('stage');
function fit() {
  const s = Math.min(1, window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

requestAnimationFrame(frame);
