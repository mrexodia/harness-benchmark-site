// game.js — the fishing state machine and the window.fishing test interface.

import { initScene, renderScene, BITE_WINDOW, ANGLER } from './scene.js';
import { fishByRarity } from './fish.js';
import { RARITY_ORDER } from './palette.js';

const RARITY_BOUNDS = [
  ['Common', 0.45],
  ['Uncommon', 0.70],
  ['Rare', 0.85],
  ['Epic', 0.93],
  ['Legendary', 0.98],
  ['Ancient', 1.0],
];

function defaultPickRarity(u) {
  for (const [name, hi] of RARITY_BOUNDS) {
    if (u < hi) return name;
  }
  return 'Ancient';
}

export class Game {
  constructor() {
    this.phase = 'ready';
    this.phaseT = 0;
    this.time = 0;

    this.castActive = false;
    this.castP = 0;
    this.castDur = 0.85;

    this.waitDur = 3;
    this.waitT = 0;
    this.biteWindow = BITE_WINDOW;
    this.biteRing = 15;

    this.target = { x: 226, y: 122 };
    this.bobberPos = { ...this.target };

    this.caught = null;
    this.pendingCatch = null;
    this.reelFish = null;
    this.missFlash = 0;
    this.toast = '';
    this.toastT = 0;

    this.log = [];
    this.catchesSinceStart = 0;
  }

  get busy() { return this.castActive || this.phase === 'waiting' || this.phase === 'bite' || this.phase === 'reeling'; }

  action() {
    switch (this.phase) {
      case 'ready':
        if (!this.castActive) this.startCast();
        break;
      case 'bite':
        this.startReel();
        break;
      case 'reveal':
        if (this.phaseT > 0.35) this.goReady();
        break;
      // waiting / reeling: repeated presses do nothing (no double casts/catches)
      default:
        break;
    }
  }

  startCast() {
    this.castActive = true;
    this.castP = 0;
    // the line is cast immediately; the animation plays during 'waiting'
    this.phase = 'waiting';
    this.phaseT = 0;
    this.waitT = 0;
    this.target = {
      x: 218 + Math.round(Math.random() * 42),
      y: 116 + Math.round(Math.random() * 16),
    };
    this.bobberPos = { x: ANGLER.x + 16, y: ANGLER.feetY - 26 };
    this.setToast('');
  }

  finishCast() {
    this.castActive = false;
    this.bobberPos = { x: this.target.x, y: this.target.y };
    this.phaseT = 0;
    this.waitT = 0;
    this.waitDur = 2.6 + Math.random() * 1.6; // variable wait
  }

  startBite() {
    this.phase = 'bite';
    this.phaseT = 0;
    this.biteWindow = BITE_WINDOW;
  }

  startReel() {
    this.phase = 'reeling';
    this.phaseT = 0;
    // The single rarity roll for this successful catch goes through the
    // replaceable test hook.
    const rarity = window.fishing.pickRarity(Math.random());
    const fish = fishByRarity(rarity, Math.random);
    this.pendingCatch = { name: fish.name, rarity };
    this.pendingFish = fish;
    this.reelStart = { ...this.bobberPos };
    this.reelEnd = { x: ANGLER.x + 24, y: ANGLER.feetY - 6 };
    this.reelDur = 1.1;
    this.reelFish = null;
  }

  commitCatch() {
    this.caught = { fish: this.pendingFish, rarity: this.pendingCatch.rarity, name: this.pendingCatch.name };
    // newest first
    window.fishing.log.unshift({ name: this.pendingCatch.name, rarity: this.pendingCatch.rarity });
    this.catchesSinceStart++;
    this.phase = 'reveal';
    this.phaseT = 0;
    this.reelFish = null;
    this.pendingCatch = null;
  }

  miss() {
    this.phase = 'ready';
    this.phaseT = 0;
    this.castActive = false;
    this.missFlash = 1;
    this.setToast('It slipped away…', '#ff9a8a');
  }

  goReady() {
    this.phase = 'ready';
    this.phaseT = 0;
    this.caught = null;
    this.castActive = false;
    this.bobberPos = { x: this.target.x, y: this.target.y };
    this.setToast('');
  }

  setToast(text, color = '#f3ead6') {
    this.toast = text;
    this.toastColor = color;
    this.toastT = text ? 1.8 : 0;
  }

  update(dt) {
    this.time += dt;
    this.phaseT += dt;
    if (this.missFlash > 0) this.missFlash = Math.max(0, this.missFlash - dt * 1.6);
    if (this.toastT > 0) this.toastT = Math.max(0, this.toastT - dt);

    if (this.castActive) {
      this.castP += dt / this.castDur;
      if (this.castP >= 1) {
        this.finishCast();
      } else {
        // bobber flight: held until the rod whips forward, then arcs out
        const p = this.castP;
        const launch = { x: ANGLER.x + 16, y: ANGLER.feetY - 26 };
        if (p < 0.5) {
          this.bobberPos = launch;
        } else {
          const u = (p - 0.5) / 0.5;
          this.bobberPos = {
            x: launch.x + (this.target.x - launch.x) * u,
            y: launch.y + (this.target.y - launch.y) * u - Math.sin(Math.PI * u) * 22,
          };
        }
      }
      return;
    }

    switch (this.phase) {
      case 'waiting':
        this.waitT += dt;
        if (this.waitT >= this.waitDur) this.startBite();
        break;
      case 'bite': {
        const remaining = this.biteWindow - this.phaseT;
        this.biteRing = 4 + 11 * Math.max(0, remaining / this.biteWindow);
        if (remaining <= 0) this.miss();
        break;
      }
      case 'reeling': {
        const u = Math.min(1, this.phaseT / this.reelDur);
        const e = -(Math.cos(Math.PI * u) - 1) / 2;
        this.bobberPos = {
          x: this.reelStart.x + (this.reelEnd.x - this.reelStart.x) * e,
          y: this.reelStart.y + (this.reelEnd.y - this.reelStart.y) * e,
        };
        if (u > 0.38) {
          const fu = (u - 0.38) / 0.62;
          const fx = this.reelStart.x + (this.reelEnd.x - this.reelStart.x) * fu;
          const baseY = this.reelStart.y + (this.reelEnd.y - this.reelStart.y) * fu;
          const fy = baseY - Math.sin(Math.PI * fu) * 30;
          this.reelFish = { fish: this.pendingFish, x: fx, y: fy };
        }
        if (this.phaseT >= this.reelDur) this.commitCatch();
        break;
      }
      default:
        break;
    }
  }
}

export function installTestInterface(game) {
  const fishing = {
    get state() { return game.phase; },
    pickRarity: defaultPickRarity,
    log: game.log,
  };
  window.fishing = fishing;
  return fishing;
}
