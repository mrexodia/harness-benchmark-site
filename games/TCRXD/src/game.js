// Island fishing game: state machine, procedural scene, HUD.
import { drawText, textWidth } from './font.js';
import {
  pickRarity, rollSpecies, drawFish,
  RARITIES, RARITY_STYLE, RARITY_ODDS, SPECIES,
} from './fish.js';

export const W = 320, H = 180;
const HORIZON = 58;
const CAST_DUR = 0.7;
const BITE_WINDOW = 1.7;
const REEL_DUR = 1.2;
const REVEAL_DUR = 3.0;

// Angler anchor (feet).
const AX = 76, AY = 117;

const PAL = {
  skyTop: '#4f9fd0', skyMid: '#8fd2e2', skyLow: '#f3e2b0',
  sun: '#fff2c0', sunGlow: 'rgba(255,238,170,0.35)',
  far: '#6f9fb0', far2: '#5b8a9c', far3: '#4d788a',
  waterTop: '#2c6675', waterMid: '#3f8f96', waterLow: '#67b7ac',
  shimmer: '#bfeee0', glint: '#fff3c4',
  land: '#5a9e4b', landDark: '#3d7a3a', landLight: '#79bf5a',
  sand: '#d8c088', sandDark: '#b89f6a',
  wood: '#a9744f', woodDark: '#7c5233', woodLight: '#c99a6b',
  leaf1: '#2f6b3a', leaf2: '#3f8a46', leaf3: '#57a854', leaf4: '#79c06a',
  trunk: '#6b4a2f', trunkDark: '#4d341f',
  rock: '#8d8d8d', rockDark: '#636363', rockLight: '#b5b5b5',
  reed: '#6fae54', reedDark: '#4d8038',
  red: '#e04b4b', white: '#f4f4f4', dark: '#241a12',
};

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

export class Game {
  constructor(sceneCanvas, uiCanvas) {
    this.scene = sceneCanvas;
    this.ui = uiCanvas;
    this.ctx = sceneCanvas.getContext('2d');
    this.uctx = uiCanvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.t = 0;
    this.state = 'ready';
    this.phase = 0;
    this.castT = 0;
    this.reelT = 0;
    this.waitDur = 2;
    this.biteWindow = BITE_WINDOW;
    this.target = { x: 215, y: 132 };
    this.bobberPos = { x: AX + 13, y: AY - 3 };
    this.logs = [];
    this.result = null;
    this.missTimer = 0;
    this.introTimer = 6.5;
    this.ripples = [];
    this.particles = [];
    this.popped = new Set(); // species ids caught this session (for NEW tag)
    this.newThisCatch = false;
    this.jump = null; // far jumping fish
    this.jumpTimer = 3;
    this.dragonfly = { x: 180, y: 120, t: 0 };
    this.flash = 0;
  }

  // ---- input / state transitions ----
  doAction() {
    if (this.state === 'ready') this.startCast();
    else if (this.state === 'bite') this.startReel();
    else if (this.state === 'reveal' && this.phase > 0.8) this.nextCast();
  }

  startCast() {
    this.setState('waiting');
    this.castT = 0;
    this.waitDur = 1.3 + Math.random() * 2.6;
    this.target = {
      x: Math.round(184 + Math.random() * 66),
      y: Math.round(124 + Math.random() * 22),
    };
  }

  startReel() {
    this.setState('reeling');
    this.reelT = 0;
    this.splash(this.target.x, this.target.y, 8);
  }

  enterBite() {
    this.setState('bite');
    this.biteWindow = BITE_WINDOW;
    this.splash(this.target.x, this.target.y, 6);
  }

  miss() {
    this.setState('ready');
    this.missTimer = 1.7;
    this.ripples.push({ x: this.target.x, y: this.target.y, r: 2, maxR: 12, life: 0.8, max: 0.8 });
  }

  finishCatch() {
    let rarity = window.fishing.pickRarity(Math.random());
    if (!RARITIES.includes(rarity)) rarity = 'Common';
    const sp = rollSpecies(rarity);
    this.speciesId = sp.id;
    this.newThisCatch = !this.popped.has(sp.id);
    this.popped.add(sp.id);
    this.result = { name: sp.name, rarity, sp };
    this.logs.unshift({ name: sp.name, rarity });
    if (this.logs.length > 8) this.logs.length = 8;
    this.setState('reveal');
    this.flash = 1;
    this.splash(this.target.x, this.target.y, 14);
  }

  nextCast() {
    this.setState('ready');
  }

  setState(s) {
    this.state = s;
    this.phase = 0;
  }

  splash(x, y, n) {
    this.ripples.push({ x, y, r: 1, maxR: 12, life: 0.7, max: 0.7 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 22;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a)) * sp - 8,
        life: 0.5 + Math.random() * 0.4, max: 0.9, size: 1,
        color: Math.random() < 0.5 ? '#dff8f0' : '#ffffff', grav: 90,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const r of this.ripples) { r.life -= dt; r.r += (r.maxR - r.r) * dt * 3.2; }
    this.ripples = this.ripples.filter(r => r.life > 0);
  }

  update(dt) {
    this.t += dt;
    this.phase += dt;
    if (this.missTimer > 0) this.missTimer -= dt;
    if (this.introTimer > 0) this.introTimer -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    this.updateParticles(dt);

    // ambient dragonfly + far jumping fish
    this.dragonfly.t += dt;
    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0) {
      this.jumpTimer = 4 + Math.random() * 6;
      this.jump = { t: 0, x: 150 + Math.random() * 130, y: 68 + Math.random() * 16, dir: Math.random() < 0.5 ? -1 : 1 };
    }
    if (this.jump) {
      this.jump.t += dt * 0.85;
      if (this.jump.t > 1) this.jump = null;
    }

    switch (this.state) {
      case 'waiting':
        this.castT = Math.min(1, this.castT + dt / CAST_DUR);
        if (this.castT >= 1 && this.phase >= CAST_DUR + this.waitDur) this.enterBite();
        break;
      case 'bite':
        if (this.phase >= this.biteWindow) this.miss();
        break;
      case 'reeling':
        this.reelT = Math.min(1, this.reelT + dt / REEL_DUR);
        if (this.reelT >= 1) this.finishCatch();
        break;
      case 'reveal':
        if (this.phase >= REVEAL_DUR) this.nextCast();
        break;
    }
    this.computeBobber();
  }

  getPose() {
    // Returns {hand, tip} for the rod. Depends on state and cast swing.
    const back = { hx: AX + 1, hy: AY - 8, tx: AX + 13, ty: AY - 31 };
    const fwd = { hx: AX + 9, hy: AY - 14, tx: AX + 25, ty: AY - 22 };
    const idle = { hx: AX + 5, hy: AY - 11, tx: AX + 20, ty: AY - 27 };
    const waitP = { hx: AX + 6, hy: AY - 12, tx: AX + 21, ty: AY - 27 };
    const biteP = { hx: AX + 6, hy: AY - 13, tx: AX + 20, ty: AY - 26 };
    const reelP = { hx: AX + 2, hy: AY - 9, tx: AX + 16, ty: AY - 29 };
    if (this.state === 'waiting') {
      if (this.castT < 1) {
        const c = this.castT;
        // wind back, then throw forward
        const tt = clamp((c - 0.15) / 0.7, 0, 1);
        return {
          hx: lerp(back.hx, fwd.hx, tt), hy: lerp(back.hy, fwd.hy, tt),
          tx: lerp(back.tx, fwd.tx, tt), ty: lerp(back.ty, fwd.ty, tt),
        };
      }
      return waitP;
    }
    if (this.state === 'bite') return biteP;
    if (this.state === 'reeling') return reelP;
    if (this.state === 'reveal') return idle;
    return idle;
  }

  computeBobber() {
    const pose = this.getPose();
    if (this.state === 'ready') {
      this.bobberPos = { x: AX + 12, y: AY - 3 };
    } else if (this.state === 'waiting') {
      if (this.castT < 1) {
        const c = this.castT;
        const sx = pose.tx, sy = pose.ty;
        this.bobberPos = {
          x: lerp(sx, this.target.x, c),
          y: lerp(sy, this.target.y, c) - Math.sin(Math.PI * c) * 24,
        };
      } else {
        this.bobberPos = { x: this.target.x, y: this.target.y + Math.sin(this.t * 3.1) * 1.1 };
      }
    } else if (this.state === 'bite') {
      const p = this.phase / this.biteWindow;
      const dip = Math.max(0, Math.sin(this.phase * 14)) * 2 + (p < 0.2 ? 3 * (1 - p / 0.2) : 0);
      this.bobberPos = { x: this.target.x, y: this.target.y + dip };
    } else if (this.state === 'reeling') {
      const e = this.reelT;
      this.bobberPos = {
        x: lerp(this.target.x, AX + 15, e),
        y: lerp(this.target.y, AY - 16, e) - Math.sin(Math.PI * e) * 10,
      };
    } else {
      this.bobberPos = { x: -99, y: -99 };
    }
  }

  // ===================== RENDER =====================
  render() {
    this.drawScene();
    this.drawUI();
  }

  r(x, y, w, h, c) { const g = this.ctx; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  disc(cx, cy, rr, c) {
    const g = this.ctx; g.fillStyle = c;
    for (let y = -rr; y <= rr; y++) {
      const hw = Math.floor(Math.sqrt(Math.max(0, rr * rr - y * y)));
      g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }
  pxLine(x0, y0, x1, y1, c, th = 1) {
    const g = this.ctx; g.fillStyle = c;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2;
    for (;;) {
      g.fillRect(x0 - (th >> 1), y0 - (th >> 1), th, th);
      if (x0 === x1 && y0 === y1) break;
      e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  drawScene() {
    const g = this.ctx;
    g.save();
    g.imageSmoothingEnabled = false;
    this.drawSky();
    this.drawFarIsland();
    this.drawWater();
    this.drawLilyPads();
    this.drawJump();
    this.drawLand();
    this.drawTree();
    this.drawDock();
    this.drawAngler();
    this.drawLineAndBobber();
    this.drawRipples();
    this.drawParticles();
    this.drawForeground();
    this.drawGrade();
    g.restore();
  }

  drawSky() {
    const g = this.ctx;
    const grad = g.createLinearGradient(0, 0, 0, HORIZON);
    grad.addColorStop(0, PAL.skyTop);
    grad.addColorStop(0.55, PAL.skyMid);
    grad.addColorStop(1, PAL.skyLow);
    g.fillStyle = grad; g.fillRect(0, 0, W, HORIZON + 1);

    // sun + glow
    g.fillStyle = PAL.sunGlow;
    this.disc(238, 34, 20, PAL.sunGlow);
    this.disc(238, 34, 13, 'rgba(255,244,190,0.5)');
    this.disc(238, 34, 9, PAL.sun);

    // distant birds
    for (let i = 0; i < 3; i++) {
      const bx = ((i * 103 + this.t * 6) % (W + 60)) - 30;
      const by = 24 + i * 6 + Math.sin(this.t * 2 + i) * 1.5;
      this.pxLine(bx - 3, by, bx, by + 1, 'rgba(60,80,90,0.75)', 1);
      this.pxLine(bx, by + 1, bx + 3, by, 'rgba(60,80,90,0.75)', 1);
    }

    // clouds
    const clouds = [
      { x: 40, y: 22, s: 1.0, v: 3.1 },
      { x: 150, y: 14, s: 0.7, v: 4.4 },
      { x: 270, y: 30, s: 0.85, v: 2.4 },
    ];
    for (const c of clouds) {
      const cx = ((c.x + this.t * c.v) % (W + 80)) - 40;
      const s = c.s;
      this.disc(cx, c.y, 8 * s, 'rgba(255,255,255,0.9)');
      this.disc(cx + 8 * s, c.y + 2 * s, 6 * s, 'rgba(255,255,255,0.9)');
      this.disc(cx - 8 * s, c.y + 3 * s, 5 * s, 'rgba(255,255,255,0.85)');
      this.disc(cx + 2 * s, c.y - 4 * s, 6 * s, 'rgba(255,255,255,0.95)');
      g.fillStyle = 'rgba(190,215,235,0.35)';
      g.fillRect(Math.round(cx - 17 * s), Math.round(c.y + 7 * s), Math.round(30 * s), 1);
    }
  }

  drawFarIsland() {
    const g = this.ctx;
    // haze band
    g.fillStyle = 'rgba(210,230,225,0.35)';
    g.fillRect(0, HORIZON - 4, W, 5);
    // main island silhouette
    g.fillStyle = PAL.far;
    g.beginPath();
    g.moveTo(150, HORIZON + 1);
    g.lineTo(166, 46);
    g.lineTo(180, 50);
    g.lineTo(196, 40);
    g.lineTo(214, 48);
    g.lineTo(232, 44);
    g.lineTo(252, 52);
    g.lineTo(270, 47);
    g.lineTo(292, HORIZON + 1);
    g.closePath();
    g.fill();
    // darker lower part
    g.fillStyle = PAL.far2;
    g.beginPath();
    g.moveTo(150, HORIZON + 1);
    g.lineTo(180, 52);
    g.lineTo(232, 52);
    g.lineTo(292, HORIZON + 1);
    g.closePath();
    g.fill();

    // tiny palms on the island
    this.palm(186, 43, 8, PAL.far3);
    this.palm(236, 38, 10, PAL.far3);
    this.palm(262, 47, 6, PAL.far3);

    // reflection
    g.fillStyle = 'rgba(60,110,120,0.35)';
    g.beginPath();
    g.moveTo(158, HORIZON + 2);
    g.lineTo(184, 74);
    g.lineTo(238, 74);
    g.lineTo(286, HORIZON + 2);
    g.closePath();
    g.fill();
  }

  palm(x, baseY, hgt, color) {
    const g = this.ctx;
    // trunk
    this.pxLine(x, baseY, x + 2, baseY - hgt, color, 1);
    // fronds
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      const ex = x + 2 + Math.cos(a) * 7;
      const ey = baseY - hgt + Math.sin(a) * 5;
      this.pxLine(x + 2, baseY - hgt, ex, ey, color, 1);
    }
  }

  drawWater() {
    const g = this.ctx;
    const grad = g.createLinearGradient(0, HORIZON, 0, H);
    grad.addColorStop(0, PAL.waterTop);
    grad.addColorStop(0.5, PAL.waterMid);
    grad.addColorStop(1, PAL.waterLow);
    g.fillStyle = grad;
    g.fillRect(0, HORIZON, W, H - HORIZON);

    // depth band near horizon
    g.fillStyle = 'rgba(20,55,70,0.35)';
    g.fillRect(0, HORIZON, W, 6);

    // shimmer dashes
    for (let y = HORIZON + 4; y < H; y += 3) {
      const depth = (y - HORIZON) / (H - HORIZON);
      const a = 0.05 + depth * 0.13;
      for (let x = 0; x < W; x += 4) {
        const o = Math.sin(x * 0.11 + y * 0.35 + this.t * (0.7 + depth * 0.8));
        if (o > 0.55) {
          g.globalAlpha = a * (o - 0.55) / 0.45;
          g.fillStyle = PAL.shimmer;
          g.fillRect(x, Math.round(y + o * 1.2), 2, 1);
        }
      }
      g.globalAlpha = 1;
    }

    // sun glitter path
    for (let y = HORIZON + 5; y < H - 20; y += 2) {
      const t = (y - HORIZON) / (H - HORIZON);
      const w = 6 + t * 26;
      const o = Math.sin(y * 0.6 + this.t * 2.2);
      if (o > 0.2) {
        g.globalAlpha = 0.18 + 0.3 * (o - 0.2);
        g.fillStyle = PAL.glint;
        g.fillRect(Math.round(238 - w / 2 + Math.sin(y) * 3), y, Math.round(w * (0.4 + 0.3 * o)), 1);
      }
    }
    g.globalAlpha = 1;

    // soft shore shadow on water near land
    g.fillStyle = 'rgba(30,70,60,0.18)';
    g.fillRect(0, 120, 70, 60);
  }

  drawLilyPads() {
    const pads = [[104, 158], [122, 166], [140, 152], [94, 146], [158, 164], [72, 168]];
    for (let i = 0; i < pads.length; i++) {
      const [x, y] = pads[i];
      const bob = Math.round(Math.sin(this.t * 1.2 + i) * 1);
      this.ctx.fillStyle = 'rgba(20,60,50,0.25)';
      this.ctx.beginPath(); this.ctx.ellipse(x + 1, y + bob + 1, 6, 3, 0, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.fillStyle = '#3f8a4c';
      this.ctx.beginPath(); this.ctx.ellipse(x, y + bob, 6, 3, 0, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.fillStyle = '#57a854';
      this.ctx.beginPath(); this.ctx.ellipse(x, y + bob, 4, 1.8, 0, 0, Math.PI * 2); this.ctx.fill();
      // notch
      this.ctx.fillStyle = PAL.waterMid;
      this.ctx.fillRect(x + 4, y + bob - 1, 3, 2);
    }
  }

  drawJump() {
    if (!this.jump) return;
    const j = this.jump;
    const p = Math.sin(Math.PI * j.t);
    if (p <= 0.02) return;
    const x = j.x + j.dir * j.t * 14;
    const y = j.y - p * 16;
    const g = this.ctx;
    g.fillStyle = '#9fc4dd';
    g.beginPath();
    g.ellipse(x, y, 5, 2.4, j.dir * (-0.6 + j.t), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8f4ff';
    g.beginPath(); g.ellipse(x + 1, y + 1, 3, 1.2, 0, 0, Math.PI * 2); g.fill();
    // splash at water entry
    if (j.t < 0.15 || j.t > 0.85) {
      g.fillStyle = 'rgba(230,250,245,0.8)';
      g.fillRect(Math.round(j.x - 6), Math.round(j.y - 2), 12, 1);
    }
  }

  // Land edge as function of y
  landEdge(y) {
    if (y <= 90) return 0;
    const t = (y - 90) / 90;
    return 8 + t * t * 92 + t * 8;
  }

  drawLand() {
    const g = this.ctx;
    g.beginPath();
    g.moveTo(0, 88);
    for (let y = 88; y <= H; y += 4) g.lineTo(this.landEdge(y), y);
    g.lineTo(this.landEdge(H), H);
    g.lineTo(0, H);
    g.closePath();
    g.fillStyle = PAL.landDark;
    g.fill();
    // top grass
    g.beginPath();
    g.moveTo(0, 88);
    for (let y = 88; y <= H; y += 4) g.lineTo(this.landEdge(y) - 3, y);
    g.lineTo(0, H);
    g.closePath();
    g.fillStyle = PAL.land;
    g.fill();
    // light grass dabs
    for (let i = 0; i < 90; i++) {
      const y = 92 + (i * 37 % 86) + Math.sin(i) * 3;
      const x = (i * 53 % 90);
      if (x < this.landEdge(y) - 6) {
        g.fillStyle = i % 3 === 0 ? PAL.landLight : (i % 3 === 1 ? '#4f8f42' : '#6aad55');
        g.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
    }
    // sand edge
    g.strokeStyle = PAL.sand;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 88);
    for (let y = 88; y <= H; y += 4) g.lineTo(this.landEdge(y) + 1, y);
    g.stroke();
    g.strokeStyle = PAL.sandDark;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 90);
    for (let y = 90; y <= H; y += 4) g.lineTo(this.landEdge(y) + 2.5, y);
    g.stroke();

    // rocks
    this.rock(28, 150, 7);
    this.rock(40, 172, 9);
    this.rock(16, 112, 5);

    // little wildflowers
    for (const [fx, fy] of [[6, 100], [10, 120], [14, 140], [20, 160], [30, 172], [7, 108]]) {
      this.r(fx, fy, 1, 1, '#ffffff');
      this.r(fx + 1, fy, 1, 1, '#ffd7e0');
      this.r(fx, fy - 1, 1, 1, '#ffe9a8');
    }

    // reeds + cattails at the waterline
    this.reedClump(20, 96, 4);
    this.reedClump(44, 118, 5);
    this.reedClump(60, 140, 4);

    // small bush
    this.bush(30, 104, 8);
    this.bush(12, 96, 7);
  }

  bush(x, y, s) {
    this.disc(x, y, s, PAL.leaf1);
    this.disc(x - s * 0.6, y + 2, s * 0.7, PAL.leaf2);
    this.disc(x + s * 0.6, y + 1, s * 0.7, PAL.leaf2);
    this.disc(x - 1, y - s * 0.5, s * 0.6, PAL.leaf3);
    this.disc(x + 2, y - 1, s * 0.5, PAL.leaf4);
    this.r(x, y + s - 1, s * 0.6, 2, PAL.trunkDark);
  }

  rock(x, y, s) {
    this.ctx.fillStyle = PAL.rockDark;
    this.ctx.beginPath(); this.ctx.ellipse(x, y, s, s * 0.7, 0, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = PAL.rock;
    this.ctx.beginPath(); this.ctx.ellipse(x, y - 1, s * 0.85, s * 0.55, 0, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = PAL.rockLight;
    this.ctx.beginPath(); this.ctx.ellipse(x - 1, y - 2, s * 0.4, s * 0.25, 0, 0, Math.PI * 2); this.ctx.fill();
  }

  reedClump(x, y, n) {
    for (let i = 0; i < n; i++) {
      const rx = x + i * 3 - n;
      const h = 10 + (i % 3) * 4;
      const sway = Math.round(Math.sin(this.t * 1.5 + i + x) * 1.5);
      this.pxLine(rx, y, rx + sway, y - h, i % 2 ? PAL.reed : PAL.reedDark, 1);
      if (i % 2 === 0) {
        this.r(rx + sway - 1, y - h - 4, 2, 5, '#6b4a2f');
        this.r(rx + sway - 1, y - h - 5, 2, 1, '#8a6b45');
      }
    }
  }

  drawTree() {
    const g = this.ctx;
    // trunk from the bank up and out of frame
    g.fillStyle = PAL.trunkDark;
    g.fillRect(3, 20, 11, 78);
    g.fillStyle = PAL.trunk;
    g.fillRect(5, 20, 7, 78);
    // roots into the bank
    this.pxLine(6, 94, 1, 100, PAL.trunk, 2);
    this.pxLine(12, 94, 17, 99, PAL.trunk, 2);
    // branch
    this.pxLine(11, 50, 28, 40, PAL.trunk, 3);
    this.pxLine(11, 66, -2, 58, PAL.trunk, 3);
    // canopy
    const cx = 18, cy = 14;
    this.disc(cx - 12, cy + 6, 16, PAL.leaf1);
    this.disc(cx + 14, cy + 4, 15, PAL.leaf1);
    this.disc(cx, cy - 4, 18, PAL.leaf2);
    this.disc(cx - 20, cy - 2, 12, PAL.leaf2);
    this.disc(cx + 22, cy - 4, 11, PAL.leaf2);
    this.disc(cx - 6, cy - 10, 13, PAL.leaf3);
    this.disc(cx + 8, cy - 8, 12, PAL.leaf3);
    this.disc(cx - 2, cy - 14, 10, PAL.leaf4);
    this.disc(cx - 14, cy - 4, 8, PAL.leaf4);
  }

  drawDock() {
    const g = this.ctx;
    // posts in water
    const posts = [[54, 122], [100, 120], [146, 118]];
    for (const [px, py] of posts) {
      this.r(px, py, 5, 34, PAL.woodDark);
      this.r(px + 1, py, 3, 34, '#8a5b3a');
      // water ripple at base
      g.strokeStyle = 'rgba(220,250,240,0.4)';
      g.lineWidth = 1;
      g.beginPath(); g.ellipse(px + 2.5, py + 33, 6, 2, 0, 0, Math.PI * 2); g.stroke();
    }
    // dock top surface (perspective)
    g.beginPath();
    g.moveTo(44, 114); g.lineTo(152, 111); g.lineTo(156, 122); g.lineTo(46, 126);
    g.closePath();
    g.fillStyle = PAL.wood; g.fill();
    // planks
    for (let i = 0; i <= 13; i++) {
      const t = i / 13;
      const xTop = lerp(44, 152, t), xBot = lerp(46, 156, t);
      g.strokeStyle = PAL.woodDark; g.lineWidth = 1;
      g.beginPath(); g.moveTo(xTop, 114 + (111 - 114) * t); g.lineTo(xBot, 126 + (122 - 126) * t); g.stroke();
    }
    // grain highlights
    g.strokeStyle = PAL.woodLight; g.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      const yT = lerp(114, 111, t) + 2;
      const yB = lerp(126, 122, t) - 2;
      g.beginPath(); g.moveTo(lerp(44, 152, t), yT); g.lineTo(lerp(46, 156, t), yB); g.stroke();
    }
    // front face
    g.beginPath();
    g.moveTo(46, 126); g.lineTo(156, 122); g.lineTo(156, 128); g.lineTo(46, 132);
    g.closePath();
    g.fillStyle = PAL.woodDark; g.fill();
    for (let i = 0; i <= 13; i++) {
      const t = i / 13;
      g.strokeStyle = '#5c3a22'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(lerp(46, 156, t), 126 + (122 - 126) * t); g.lineTo(lerp(46, 156, t), 132 + (128 - 132) * t); g.stroke();
    }
    // tackle bucket
    this.r(112, 104, 9, 9, '#7c5233');
    this.r(113, 104, 7, 2, '#a9744f');
    this.r(113, 106, 7, 6, '#8a5b3a');
    this.pxLine(112, 104, 113, 101, '#5c3a22', 1);
    this.pxLine(120, 104, 120, 101, '#5c3a22', 1);
    this.pxLine(113, 101, 120, 101, '#5c3a22', 1);
    // little sign
    this.r(126, 88, 2, 26, PAL.trunkDark);
    this.r(120, 84, 15, 8, PAL.woodLight);
    this.r(121, 85, 13, 6, PAL.wood);
    // warm mug of something
    this.r(64, 106, 5, 5, '#cfd8e0');
    this.r(65, 105, 3, 1, '#eef4f8');
    this.r(69, 107, 2, 2, '#cfd8e0');
    this.r(65, 107, 3, 1, '#8a6b45');
  }

  drawAngler() {
    const g = this.ctx;
    const pose = this.getPose();
    const bob = Math.sin(this.t * 2.0) * 0.5;
    const ay = AY + (this.state === 'ready' ? bob : 0);
    const ax = AX;
    const lean = this.state === 'reeling' ? -2 : this.state === 'bite' ? 1 : 0;

    // shadow
    g.fillStyle = 'rgba(20,40,35,0.32)';
    g.beginPath(); g.ellipse(ax + 1, AY + 1, 9, 3, 0, 0, Math.PI * 2); g.fill();

    const skinO = '#8a5a3a', skin = '#e8b48c', skinS = '#c98f68';
    const shirtO = '#2c4d78', shirt = '#4f86c6', shirtL = '#6fa0d8';
    const pantsO = '#2b2f38', pants = '#4a4f5a';
    const boot = '#3a2f26';
    const hatO = '#8a6a20', hat = '#e8c96a', hatD = '#c9a23f';
    const hair = '#6b4226';
    const dark = '#241a12';

    // legs
    this.r(ax - 4, ay - 8, 3, 6, pantsO);
    this.r(ax - 3, ay - 8, 2, 6, pants);
    this.r(ax + 1, ay - 8, 3, 6, pantsO);
    this.r(ax + 2, ay - 8, 2, 6, pants);
    // boots
    this.r(ax - 4, ay - 2, 3, 2, boot);
    this.r(ax + 1, ay - 2, 4, 2, boot);

    // torso
    this.r(ax - 5 + lean, ay - 14, 11, 7, shirtO);
    this.r(ax - 4 + lean, ay - 13, 9, 5, shirt);
    this.r(ax - 3 + lean, ay - 13, 3, 4, shirtL);
    // collar
    this.r(ax + 0 + lean, ay - 14, 3, 1, shirtO);

    // head
    this.r(ax - 4 + lean, ay - 20, 8, 7, skinO);
    this.r(ax - 3 + lean, ay - 19, 6, 5, skin);
    this.r(ax - 3 + lean, ay - 19, 6, 1, hair);
    this.r(ax - 3 + lean, ay - 18, 1, 2, hair);
    // face
    this.r(ax + 1 + lean, ay - 18, 1, 1, dark); // eye
    this.r(ax + 2 + lean, ay - 17, 1, 1, skinS);

    // hat
    this.r(ax - 7 + lean, ay - 21, 14, 2, hatO);
    this.r(ax - 6 + lean, ay - 21, 12, 1, hat);
    this.r(ax - 4 + lean, ay - 24, 8, 3, hatO);
    this.r(ax - 3 + lean, ay - 23, 6, 2, hat);
    this.r(ax - 3 + lean, ay - 23, 6, 1, hatD);

    // arm to hand
    const hx = pose.hx + lean, hy = pose.hy;
    this.pxLine(ax + 3 + lean, ay - 13, hx, hy, shirtO, 3);
    this.pxLine(ax + 3 + lean, ay - 13, hx, hy, shirt, 1);
    this.r(hx - 1, hy - 1, 3, 3, skinO);
    this.r(hx, hy, 2, 2, skin);

    // rod
    this.pxLine(hx, hy, pose.tx, pose.ty, '#3b2a1a', 2);
    this.pxLine(hx, hy, pose.tx, pose.ty, '#8a6b45', 1);
    // reel
    this.r(hx + 1, hy + 2, 3, 3, '#5c5c66');
    this.r(hx + 1, hy + 2, 3, 1, '#8a8a96');

    // alert lean during bite
    if (this.state === 'bite') {
      g.fillStyle = 'rgba(255,220,120,0.0)';
    }
  }

  drawLineAndBobber() {
    if (this.state === 'reveal') return;
    const g = this.ctx;
    const pose = this.getPose();
    const b = this.bobberPos;
    // fishing line with slight sag
    const segs = 8;
    let px = pose.tx, py = pose.ty;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const nx = lerp(pose.tx, b.x, t);
      const sag = (this.state === 'reeling') ? 0 : Math.sin(Math.PI * t) * (2 + (b.y - pose.ty) * 0.04);
      const ny = lerp(pose.ty, b.y, t) + sag;
      this.pxLine(px, py, nx, ny, 'rgba(245,245,235,0.85)', 1);
      px = nx; py = ny;
    }
    // bobber
    const bx = Math.round(b.x), by = Math.round(b.y);
    this.r(bx - 1, by - 3, 1, 2, '#8a1f1f');
    this.r(bx - 1, by - 2, 2, 2, PAL.red);
    this.r(bx - 1, by, 2, 2, PAL.white);
    this.r(bx - 2, by - 1, 4, 1, 'rgba(0,0,0,0.25)');

    // water ring around bobber
    if (this.state === 'waiting' || this.state === 'bite') {
      g.strokeStyle = 'rgba(230,255,245,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      const rr = 4 + Math.sin(this.t * 3) * 1;
      g.ellipse(bx, by + 1, rr, rr * 0.45, 0, 0, Math.PI * 2);
      g.stroke();
    }

    // Bite indicator: exclamation + shrinking ring + bar
    // underwater fish shadow while fighting / reeling
    if (this.state === 'reeling') {
      const e = this.reelT;
      g.fillStyle = `rgba(12,34,40,${0.45 - 0.25 * e})`;
      g.beginPath();
      g.ellipse(Math.round(b.x) + 4, Math.round(b.y) + 7 + e * 4, 8 + e * 6, 3 + e * 2, 0, 0, Math.PI * 2);
      g.fill();
      if (Math.random() < 0.4) {
        this.particles.push({ x: b.x, y: b.y + 1, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 0.4, max: 0.4, size: 1, color: '#dff8f0', grav: 80 });
      }
    }

    if (this.state === 'bite') {
      const p = clamp(this.phase / this.biteWindow, 0, 1);
      const blink = Math.sin(this.phase * 22) > -0.2;
      // shrinking ring
      const rr = lerp(16, 3, p);
      g.strokeStyle = p < 0.6 ? '#ffe36b' : '#ff6b5a';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(bx, by + 1, rr, rr * 0.5, 0, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.ellipse(bx, by + 1, rr - 2, (rr - 2) * 0.5, 0, 0, Math.PI * 2); g.stroke();

      if (blink) {
        // exclamation glyph above bobber
        const ex = bx, ey = by - 16;
        g.fillStyle = 'rgba(255,240,160,0.9)';
        this.disc(ex, ey + 2, 6, 'rgba(255,220,120,0.35)');
        this.r(ex - 1, ey - 5, 3, 8, '#ffffff');
        this.r(ex - 1, ey + 4, 3, 3, '#ffffff');
        this.r(ex, ey - 4, 1, 6, '#ff5a4a');
        this.r(ex, ey + 5, 1, 1, '#ff5a4a');
      }

      // bar above bobber showing remaining window
      const bw = 26;
      const gx = bx - bw / 2, gy = by - 24;
      this.r(gx - 1, gy - 1, bw + 2, 5, 'rgba(20,25,30,0.6)');
      this.r(gx, gy, bw, 3, 'rgba(90,80,60,0.9)');
      const col = p < 0.6 ? '#7fe07f' : '#ff8a5a';
      this.r(gx, gy, Math.round(bw * (1 - p)), 3, col);
    }
  }

  drawRipples() {
    const g = this.ctx;
    for (const r of this.ripples) {
      const a = clamp(r.life / r.max, 0, 1);
      g.strokeStyle = `rgba(230,255,245,${0.5 * a})`;
      g.lineWidth = 1;
      g.beginPath(); g.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, Math.PI * 2); g.stroke();
    }
  }

  drawParticles() {
    const g = this.ctx;
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
  }

  drawForeground() {
    // A couple of reeds in front of the dock for depth
    this.reedClump(150, 150, 3);
    this.reedClump(166, 162, 4);
    // dragonfly
    const d = this.dragonfly;
    const dx = 170 + Math.sin(d.t * 0.6) * 34 + Math.sin(d.t * 2.3) * 4;
    const dy = 116 + Math.cos(d.t * 0.9) * 8;
    const g = this.ctx;
    g.fillStyle = '#7fd8e0';
    g.fillRect(Math.round(dx), Math.round(dy), 5, 1);
    g.fillStyle = 'rgba(200,240,255,0.6)';
    const w = Math.sin(d.t * 30) * 1;
    g.fillRect(Math.round(dx - 3), Math.round(dy - 2 + w), 4, 1);
    g.fillRect(Math.round(dx - 3), Math.round(dy + 1 - w), 4, 1);
    g.fillStyle = '#2a6a72';
    g.fillRect(Math.round(dx + 4), Math.round(dy - 1), 2, 2);
  }

  drawGrade() {
    const g = this.ctx;
    // warm gradient + vignette
    if (this.flash > 0) {
      g.fillStyle = `rgba(255,250,220,${this.flash * 0.35})`;
      g.fillRect(0, 0, W, H);
    }
    const v = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 210);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(20,15,30,0.32)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }

  // ===================== UI (full resolution) =====================
  drawUI() {
    const c = this.uctx;
    c.clearRect(0, 0, 1280, 720);
    this.drawTitle(c);
    this.drawLegend(c);
    this.drawLog(c);
    this.drawHint(c);
    this.drawButton(c);
    if (this.introTimer > 0 && this.state === 'ready') this.drawIntro(c);
    if (this.state === 'reveal') this.drawReveal(c);
  }

  panel(c, x, y, w, h, fill, border) {
    c.fillStyle = 'rgba(12,20,26,0.62)';
    c.fillRect(x + 3, y + 3, w, h);
    c.fillStyle = fill || 'rgba(16,26,32,0.82)';
    c.fillRect(x, y, w, h);
    c.strokeStyle = border || 'rgba(150,190,180,0.35)';
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  drawTitle(c) {
    drawText(c, 'TIDELINE', 26, 22, 4, '#f4ecd0', { tracking: 1 });
    drawText(c, 'ISLAND ANGLER', 27, 58, 2, '#8fd0c0', { tracking: 2 });
  }

  drawLegend(c) {
    const x = 1280 - 232, y = 20;
    this.panel(c, x, y, 212, 176, 'rgba(16,26,32,0.78)', 'rgba(150,190,180,0.3)');
    drawText(c, 'RARITY ODDS', x + 14, y + 12, 2, '#cfe6dc', { tracking: 1 });
    let yy = y + 38;
    for (const r of RARITIES) {
      const st = RARITY_STYLE[r];
      c.fillStyle = st.main;
      c.fillRect(x + 14, yy + 1, 10, 10);
      c.strokeStyle = st.trim; c.lineWidth = 2; c.strokeRect(x + 14, yy + 1, 10, 10);
      drawText(c, r, x + 34, yy, 2, st.main, { tracking: 1 });
      drawText(c, RARITY_ODDS[r], x + 192, yy, 2, '#cfe6dc', { align: 'right', tracking: 1 });
      yy += 22;
    }
  }

  drawLog(c) {
    const rows = Math.min(this.logs.length, 8);
    const w = 420, lineH = 21;
    const h = 42 + Math.max(1, rows) * lineH + 8;
    const x = 20, y = 720 - 20 - h;
    this.panel(c, x, y, w, h, 'rgba(16,26,32,0.8)', 'rgba(150,190,180,0.32)');
    drawText(c, 'RECENT CATCHES', x + 12, y + 12, 2, '#cfe6dc', { tracking: 1 });
    if (this.logs.length === 0) {
      drawText(c, 'Nothing yet...', x + 12, y + 42, 2, '#7f9a92', { tracking: 1 });
      return;
    }
    let yy = y + 40;
    for (let i = 0; i < rows; i++) {
      const e = this.logs[i];
      const st = RARITY_STYLE[e.rarity];
      c.fillStyle = st.main;
      c.fillRect(x + 12, yy + 2, 7, 7);
      const name = e.name.length > 22 ? e.name.slice(0, 22) : e.name;
      drawText(c, name, x + 28, yy, 2, i === 0 ? '#ffffff' : '#d6ded9', { tracking: 1 });
      drawText(c, e.rarity, x + w - 12, yy, 2, st.main, { align: 'right', tracking: 1 });
      yy += lineH;
    }
  }

  drawHint(c) {
    let msg = '';
    let col = '#e8f4ee';
    if (this.state === 'ready') { msg = this.missTimer > 0 ? 'IT GOT AWAY...' : 'READY TO CAST'; col = this.missTimer > 0 ? '#ff9a7a' : '#e8f4ee'; }
    else if (this.state === 'waiting') { msg = 'WAIT FOR A BITE...'; col = '#bcd6cf'; }
    else if (this.state === 'bite') { msg = 'REEL IN! PRESS NOW!'; col = Math.sin(this.phase * 20) > 0 ? '#ffe36b' : '#ff9a6a'; }
    else if (this.state === 'reeling') { msg = 'REELING IN...'; col = '#bcd6cf'; }
    else if (this.state === 'reveal') { msg = 'PRESS TO CAST AGAIN'; col = '#e8f4ee'; }
    drawText(c, msg, 640, 686, 2, col, { align: 'center', tracking: 2 });
  }

  drawButton(c) {
    const bw = 216, bh = 84, x = 1280 - 20 - bw, y = 720 - 20 - bh;
    let label = 'CAST', active = false, col = '#3f8f7c', col2 = '#2c6b5c';
    if (this.state === 'ready') { label = 'CAST'; active = true; }
    else if (this.state === 'waiting') { label = 'WAIT'; col = '#39525a'; col2 = '#2b3d43'; }
    else if (this.state === 'bite') { label = 'REEL!'; active = true; col = '#c0452f'; col2 = '#8f2f20'; }
    else if (this.state === 'reeling') { label = '...'; col = '#39525a'; col2 = '#2b3d43'; }
    else if (this.state === 'reveal') { label = 'NEXT'; active = true; col = '#3f6fbf'; col2 = '#2c4f8f'; }

    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x + 4, y + 5, bw, bh);
    const g = c.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, col); g.addColorStop(1, col2);
    c.fillStyle = g;
    c.fillRect(x, y, bw, bh);
    c.strokeStyle = active ? '#ffffff' : 'rgba(180,200,200,0.4)';
    c.lineWidth = 3;
    c.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
    // key hint chip
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(x + 14, y + bh - 30, 84, 20);
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
    c.strokeRect(x + 14, y + bh - 30, 84, 20);
    drawText(c, 'SPACE', x + 56, y + bh - 25, 2, '#ffffff', { align: 'center', tracking: 1 });
    if (active && this.state === 'ready') {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
      c.globalAlpha = 0.25 + pulse * 0.25;
      c.fillStyle = '#ffffff';
      c.fillRect(x, y, bw, 4);
      c.globalAlpha = 1;
    }
    drawText(c, label, x + 128, y + 26, 4, '#ffffff', { align: 'center', tracking: 2 });
  }

  drawIntro(c) {
    const a = clamp(this.introTimer / 1.2, 0, 1);
    c.globalAlpha = a;
    const w = 560, h = 104, x = 360, y = 92;
    this.panel(c, x, y, w, h, 'rgba(16,26,32,0.88)', 'rgba(180,220,200,0.45)');
    drawText(c, 'WELCOME TO TIDELINE', x + w / 2, y + 16, 3, '#f4ecd0', { align: 'center', tracking: 2 });
    drawText(c, 'PRESS SPACE OR THE CAST BUTTON TO FISH.', x + w / 2, y + 52, 2, '#cfe6dc', { align: 'center', tracking: 1 });
    drawText(c, 'WAIT FOR THE BITE, THEN REEL IN QUICKLY.', x + w / 2, y + 74, 2, '#9fc0b6', { align: 'center', tracking: 1 });
    c.globalAlpha = 1;
  }

  drawReveal(c) {
    const res = this.result;
    if (!res) return;
    const st = RARITY_STYLE[res.rarity];
    const dim = clamp(this.phase / 0.25, 0, 1) * 0.6;
    c.fillStyle = `rgba(6,10,16,${dim})`;
    c.fillRect(0, 0, 1280, 720);

    const pop = clamp(this.phase / 0.4, 0, 1);
    const e = easeOutBack(pop);
    const cx = 640, cy = 340;
    const cw = 620, ch = 420;
    c.save();
    c.translate(cx, cy);
    c.scale(0.72 + 0.28 * e, 0.72 + 0.28 * e);
    c.translate(-cx, -cy);

    const x = cx - cw / 2, y = cy - ch / 2;

    // ---- tier-specific backdrop effects ----
    this.revealBackdrop(c, res.rarity, cx, cy, cw, ch);

    // card body
    let bg = 'rgba(18,26,30,0.96)';
    if (res.rarity === 'Ancient') bg = 'rgba(14,28,28,0.97)';
    c.fillStyle = bg;
    this.roundRect(c, x, y, cw, ch, res.rarity === 'Ancient' ? 18 : 8);
    c.fill();
    c.lineWidth = res.rarity === 'Ancient' ? 4 : 3;
    c.strokeStyle = st.trim;
    this.roundRect(c, x + 2, y + 2, cw - 4, ch - 4, res.rarity === 'Ancient' ? 16 : 6);
    c.stroke();
    if (res.rarity === 'Rare' || res.rarity === 'Epic' || res.rarity === 'Legendary' || res.rarity === 'Ancient') {
      c.lineWidth = 1;
      c.strokeStyle = st.main;
      this.roundRect(c, x + 8, y + 8, cw - 16, ch - 16, res.rarity === 'Ancient' ? 12 : 4);
      c.stroke();
    }

    // ---- header ribbon ----
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(x + 2, y + 2, cw - 4, 44);
    drawText(c, res.rarity.toUpperCase(), cx, y + 12, 4, st.main, { align: 'center', tracking: 3 });
    if (res.rarity === 'Ancient') this.ancientGlyphs(c, x + 26, y + 14, cw - 52, st.main);

    // ---- fish ----
    const float = (res.rarity === 'Legendary' || res.rarity === 'Ancient') ? Math.sin(this.t * 1.6) * 5 : 0;
    const fishScale = res.rarity === 'Ancient' ? 5 : res.rarity === 'Legendary' ? 5 : 4;
    c.save();
    // pedestal glow
    const gr = c.createRadialGradient(cx, cy + 4, 4, cx, cy + 4, 190);
    gr.addColorStop(0, this.hexA(st.glow, 0.22));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.fillRect(x, y + 40, cw, ch - 100);
    drawFish(c, res.sp, cx, cy - 14 + float, fishScale, this.t);
    c.restore();

    // name plate (always shows the fish name AND the rarity word)
    const nameY = y + ch - 92;
    c.fillStyle = 'rgba(0,0,0,0.34)';
    c.fillRect(x + 40, nameY - 6, cw - 80, 44);
    drawText(c, res.name, cx, nameY, 3, '#ffffff', { align: 'center', tracking: 1 });
    drawText(c, res.rarity.toUpperCase(), cx, nameY + 30, 2, st.main, { align: 'center', tracking: 2 });
    if (this.newThisCatch) {
      // small badge, keeps the rarity word visible
      const bw2 = textWidth('NEW!', 2, 1) + 20;
      c.fillStyle = 'rgba(255,227,107,0.9)';
      c.fillRect(x + cw - bw2 - 24, y + 52, bw2, 24);
      drawText(c, 'NEW!', x + cw - 24 - bw2 / 2, y + 58, 2, '#3a2f10', { align: 'center', tracking: 1 });
    }

    // timer bar
    const t = clamp(1 - this.phase / REVEAL_DUR, 0, 1);
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(x + 40, y + ch - 26, cw - 80, 5);
    c.fillStyle = st.main;
    c.fillRect(x + 40, y + ch - 26, (cw - 80) * t, 5);
    drawText(c, 'SPACE / CLICK  NEXT', cx, y + ch - 56, 2, '#9fb5ad', { align: 'center', tracking: 1 });

    c.restore();
  }

  revealBackdrop(c, rarity, cx, cy, cw, ch) {
    const st = RARITY_STYLE[rarity];
    if (rarity === 'Common') return;
    if (rarity === 'Uncommon') {
      // corner leaves
      for (const [dx, dy, sx, sy] of [[-1, -1, 1, 1], [1, -1, -1, 1], [-1, 1, 1, -1], [1, 1, -1, -1]]) {
        const px = cx + dx * (cw / 2 - 6), py = cy + dy * (ch / 2 - 6);
        c.fillStyle = st.main;
        c.beginPath();
        c.ellipse(px + sx * 10, py + sy * 10, 16, 6, (sx * sy) * 0.7, 0, Math.PI * 2);
        c.fill();
      }
    } else if (rarity === 'Rare') {
      // orbiting sparkles
      for (let i = 0; i < 10; i++) {
        const a = this.t * 0.8 + i * (Math.PI * 2 / 10);
        const rx = cw / 2 + 30, ry = ch / 2 + 16;
        const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
        const tw = 0.5 + 0.5 * Math.sin(this.t * 5 + i);
        this.sparkle(c, px, py, 6 + tw * 4, st.main, tw);
      }
    } else if (rarity === 'Epic') {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.4);
      const gr = c.createRadialGradient(cx, cy, 40, cx, cy, cw * 0.72);
      gr.addColorStop(0, this.hexA(st.main, 0.0));
      gr.addColorStop(0.7, this.hexA(st.main, 0.10 + pulse * 0.10));
      gr.addColorStop(1, this.hexA(st.main, 0));
      c.fillStyle = gr;
      c.fillRect(cx - cw, cy - ch, cw * 2, ch * 2);
      for (let i = 0; i < 14; i++) {
        const a = i * 2.399 + this.t * 0.5;
        const rr = 80 + (i * 37 % 220);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.55 + Math.sin(this.t + i) * 8;
        c.globalAlpha = 0.5;
        c.fillStyle = st.main;
        c.fillRect(px, py, 3, 3);
        c.globalAlpha = 1;
      }
    } else if (rarity === 'Legendary') {
      // rotating rays
      c.save();
      c.translate(cx, cy);
      c.rotate(this.t * 0.25);
      for (let i = 0; i < 16; i++) {
        const a = i * (Math.PI * 2 / 16);
        c.rotate(a);
        const grd = c.createLinearGradient(0, 0, 420, 0);
        grd.addColorStop(0, this.hexA(st.main, 0.0));
        grd.addColorStop(1, this.hexA(st.main, 0.13));
        c.fillStyle = grd;
        c.beginPath();
        c.moveTo(120, -16);
        c.lineTo(420, -3);
        c.lineTo(420, 3);
        c.lineTo(120, 16);
        c.closePath();
        c.fill();
        c.rotate(-a);
      }
      c.restore();
      // laurels
      c.strokeStyle = st.main; c.lineWidth = 3;
      for (const dx of [-1, 1]) {
        c.beginPath();
        c.arc(cx + dx * (cw / 2 - 24), cy + 10, 90, dx < 0 ? -2.2 : Math.PI + 0.9, dx < 0 ? -0.9 : Math.PI + 2.2);
        c.stroke();
      }
    } else if (rarity === 'Ancient') {
      // aura
      const gr = c.createRadialGradient(cx, cy, 30, cx, cy, cw * 0.8);
      gr.addColorStop(0, this.hexA(st.main, 0.18));
      gr.addColorStop(1, this.hexA(st.main, 0));
      c.fillStyle = gr;
      c.fillRect(cx - cw, cy - ch, cw * 2, ch * 2);
      // rotating rune ring
      c.save();
      c.translate(cx, cy);
      c.rotate(-this.t * 0.4);
      for (let i = 0; i < 24; i++) {
        const a = i * (Math.PI * 2 / 24);
        const px = Math.cos(a) * (cw * 0.62), py = Math.sin(a) * (ch * 0.62);
        c.save();
        c.translate(px, py);
        c.rotate(a);
        c.fillStyle = this.hexA(st.main, 0.35 + 0.35 * Math.sin(this.t * 3 + i));
        c.fillRect(-1, -6, 2, 12);
        c.fillRect(-4, -1, 8, 2);
        c.restore();
      }
      c.restore();
      // upward motes
      for (let i = 0; i < 16; i++) {
        const px = cx + ((i * 97) % (cw + 80)) - cw / 2 - 40;
        const prog = (this.t * 0.25 + i * 0.13) % 1;
        const py = cy + ch / 2 - prog * ch;
        c.globalAlpha = (1 - prog) * 0.7;
        c.fillStyle = st.main;
        c.fillRect(px, py, 2, 2);
        c.globalAlpha = 1;
      }
    }
  }

  ancientGlyphs(c, x, y, w, color) {
    c.fillStyle = this.hexA(color, 0.7);
    for (let i = 0; i < 6; i++) {
      const px = x + i * (w / 5);
      c.fillRect(px, y, 2, 8);
      c.fillRect(px - 3, y + 3, 8, 2);
    }
  }

  sparkle(c, x, y, s, color, a) {
    c.globalAlpha = a;
    c.fillStyle = color;
    c.fillRect(x - s, y - 1, s * 2, 2);
    c.fillRect(x - 1, y - s, 2, s * 2);
    c.globalAlpha = 1;
  }

  roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
}
