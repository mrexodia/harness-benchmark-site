import { Game } from './game.js';
import { pickRarity } from './fish.js';

const stage = document.getElementById('stage');
const sceneCanvas = document.getElementById('scene');
const uiCanvas = document.getElementById('ui');
const game = new Game(sceneCanvas, uiCanvas);

// ---- Test / integration interface ----
window.fishing = {
  get state() { return game.state; },
  pickRarity(u) { return pickRarity(u); },
  get log() { return game.logs; },
};

// ---- Input ----
function act() { game.doAction(); }

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ') {
    e.preventDefault();
    act();
  }
});

// Click / tap anywhere on the stage (the on-screen button is the visual affordance).
stage.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  act();
});

// ---- Responsive fit (keeps 4x integer scaling at the target viewport) ----
function fit() {
  const s = Math.min(1, window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

// ---- Loop with pause-while-hidden ----
let last = performance.now();
let hidden = document.hidden;
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden;
  last = performance.now();
});

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp: gaps while hidden effectively pause timers
  if (!hidden) game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for debugging/automation (not visible, does not affect play).
window.__game = game;
