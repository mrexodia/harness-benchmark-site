// main.js — bootstrap: canvases, input, fixed-step-ish loop with pausing.

import { initScene, renderScene } from './scene.js';
import { Game, installTestInterface } from './game.js';
import { drawUI, updateButton } from './ui.js';

const sceneCanvas = document.getElementById('scene');
const uiCanvas = document.getElementById('ui');
const sceneCtx = sceneCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');
const button = document.getElementById('actionBtn');
const stage = document.getElementById('stage');

sceneCtx.imageSmoothingEnabled = false;

initScene();
const game = new Game();
installTestInterface(game);

// ---- input -----------------------------------------------------------------
function act() { game.action(); }

button.addEventListener('click', (e) => { e.preventDefault(); act(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) act();
  }
});

// ---- responsive fit (never scales above 1, never scrolls) ------------------
function fit() {
  const s = Math.min(1, window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

// ---- loop ------------------------------------------------------------------
let last = performance.now();
document.addEventListener('visibilitychange', () => { last = performance.now(); });

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (document.hidden) dt = 0;
  dt = Math.min(dt, 0.05); // avoid huge jumps after tab switches

  if (dt > 0) game.update(dt);

  renderScene(sceneCtx, game, game.time);
  drawUI(uiCtx, game, game.time);
  updateButton(button, game);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
