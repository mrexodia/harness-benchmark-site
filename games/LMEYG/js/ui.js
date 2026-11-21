// Full-resolution UI overlay drawn on the 1280x720 canvas.
import { drawText, drawTextCenter, textWidth } from './font.js';
import { fishSprite } from './art.js';

export const RARITY = {
  Common:    { color: '#c6d0d6', odds: '45%', dark: '#3a444c' },
  Uncommon:  { color: '#69d06f', odds: '25%', dark: '#1f4a28' },
  Rare:      { color: '#54b0f0', odds: '15%', dark: '#173f5e' },
  Epic:      { color: '#c06cf0', odds: '8%',  dark: '#3d1d55' },
  Legendary: { color: '#ffc63c', odds: '5%',  dark: '#57410d' },
  Ancient:   { color: '#4ff0dc', odds: '2%',  dark: '#0d3f3c' },
};
export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];

export const BUTTON = { x: 1180, y: 636, r: 48 };

const U = 2;   // body text pixel scale
const HL = 3;  // heading scale

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, accent) {
  ctx.fillStyle = 'rgba(11,19,27,0.74)';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = accent || 'rgba(200,225,235,0.30)';
  ctx.lineWidth = 2;
  rr(ctx, x + 1, y + 1, w - 2, h - 2, 7); ctx.stroke();
}

// ---------------------------------------------------------------------------
function drawLog(ctx, g) {
  const x = 20, y = 20, w = 300, h = 186;
  panel(ctx, x, y, w, h);
  drawText(ctx, 'CATCH LOG', x + 14, y + 12, U, '#ffe9b0', { shadow: 'rgba(0,0,0,.6)' });
  ctx.fillStyle = 'rgba(200,225,235,0.25)';
  ctx.fillRect(x + 12, y + 32, w - 24, 1);

  const entries = g.log.slice(0, 8);
  if (!entries.length) {
    drawText(ctx, 'NOTHING YET...', x + 14, y + 44, U, 'rgba(200,215,225,0.55)');
    return;
  }
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i], ry = y + 42 + i * 18;
    const col = RARITY[e.rarity]?.color || '#fff';
    ctx.globalAlpha = i === 0 ? 1 : 0.82 - i * 0.03;
    drawText(ctx, e.name.slice(0, 19), x + 14, ry, U, i === 0 ? '#ffffff' : '#d6e2e8');
    const rw = textWidth(e.rarity.toUpperCase(), U);
    drawText(ctx, e.rarity.toUpperCase(), x + w - 14 - rw, ry, U, col);
    ctx.globalAlpha = 1;
  }
}

function drawLegend(ctx, g) {
  const w = 246, x = 1280 - 20 - w, y = 20, h = 24 + RARITY_ORDER.length * 19 + 6;
  panel(ctx, x, y, w, h);
  drawText(ctx, 'RARITY ODDS', x + 14, y + 12, U, '#ffe9b0', { shadow: 'rgba(0,0,0,.6)' });
  ctx.fillStyle = 'rgba(200,225,235,0.25)';
  ctx.fillRect(x + 12, y + 32, w - 24, 1);
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    const name = RARITY_ORDER[i], info = RARITY[name];
    const ry = y + 42 + i * 19;
    ctx.fillStyle = info.color;
    ctx.fillRect(x + 14, ry + 3, 8, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 14.5, ry + 3.5, 8, 8);
    drawText(ctx, name, x + 30, ry, U, info.color);
    const ow = textWidth(info.odds, U);
    drawText(ctx, info.odds, x + w - 14 - ow, ry, U, '#e6eef2');
  }
}

function buttonLabel(state, started) {
  if (!started) return 'CAST';
  if (state === 'ready') return 'CAST';
  if (state === 'bite') return 'REEL';
  if (state === 'reveal') return 'NEXT';
  return '...';
}

function drawButton(ctx, g) {
  const { x, y, r } = BUTTON;
  const label = buttonLabel(g.state, g.started);
  const glow = (g.state === 'ready' || g.state === 'bite' || g.state === 'reveal');
  const pal = {
    ready: ['#3f8f5f', '#7be0a0', '#1f5a3c'],
    bite: ['#e05a3c', '#ffd06a', '#8f2f1f'],
    reveal: ['#3f6f9f', '#8fd0ff', '#1f3f5f'],
    waiting: ['#3a4a55', '#7a8a95', '#25313a'],
    reeling: ['#3a4a55', '#7a8a95', '#25313a'],
  }[g.state] || ['#3a4a55', '#7a8a95', '#25313a'];

  if (glow) {
    ctx.globalAlpha = 0.28 + Math.sin(g.t * 5) * 0.10;
    ctx.fillStyle = pal[1];
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(x, y + 4, r, 0, 7); ctx.fill();
  ctx.fillStyle = pal[0];
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = pal[2];
  ctx.beginPath(); ctx.arc(x, y, r - 2, 0, 7); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = pal[1];
  ctx.beginPath(); ctx.arc(x, y - 1, r - 7, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();

  const lw = textWidth(label, 3);
  drawText(ctx, label, x - lw / 2, y - 11, 3, '#ffffff', { shadow: 'rgba(0,0,0,.5)' });
}

function drawPrompt(ctx, g) {
  let msg = null, sub = null;
  if (!g.started) { msg = 'PRESS SPACE OR TAP CAST'; sub = 'WAIT FOR THE BITE, THEN REEL'; }
  else if (g.state === 'ready') { msg = 'SPACE TO CAST'; sub = 'TAP THE BUTTON TOO'; }
  else if (g.state === 'waiting') { msg = 'WAITING FOR A BITE...'; }
  else if (g.state === 'bite') { msg = 'REEL NOW!'; }
  else if (g.state === 'reeling') { msg = 'REELING IN...'; }
  else if (g.state === 'reveal') { msg = 'SPACE / TAP FOR NEXT CAST'; }
  if (!msg) return;

  const w = Math.max(textWidth(msg, U) + 44, sub ? textWidth(sub, U) + 44 : 0, 300);
  const h = sub ? 58 : 38;
  const x = 640 - w / 2, y = 720 - h - 26;
  const accent = g.state === 'bite' ? '#ff8a5a' : 'rgba(200,225,235,0.30)';
  panel(ctx, x, y, w, h, accent);
  drawTextCenter(ctx, msg, 640, y + 11, U, g.state === 'bite' ? '#ffd23c' : '#ffffff', { shadow: 'rgba(0,0,0,.6)' });
  if (sub) drawTextCenter(ctx, sub, 640, y + 32, U, 'rgba(200,220,230,0.7)');
}

// Bite window meter (compact, bottom center above prompt)
function drawBiteMeter(ctx, g) {
  if (g.state !== 'bite') return;
  const k = Math.max(0, 1 - g.biteAge / g.biteWindow);
  const w = 260, x = 640 - w / 2, y = 720 - 108;
  ctx.fillStyle = 'rgba(11,19,27,0.75)';
  rr(ctx, x - 6, y - 6, w + 12, 30, 6); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y + 4, w, 12);
  const col = k > 0.5 ? '#5fe08a' : k > 0.25 ? '#ffd23c' : '#ff5a3c';
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 5, Math.round((w - 2) * k), 10);
  drawTextCenter(ctx, 'REEL!', 640, y - 30, U, '#ffd23c', { shadow: 'rgba(0,0,0,.6)' });
}

// ---------------------------------------------------------------------------
function drawReveal(ctx, g) {
  const rv = g.reveal;
  if (!rv) return;
  const info = RARITY[rv.rarity] || RARITY.Common;
  const age = rv.age;
  const appear = Math.min(1, age / 0.35);
  const cx = 640, cy = 356;
  const cw = rv.rarity === 'Ancient' ? 700 : 660;
  const ch = rv.rarity === 'Ancient' ? 400 : 380;
  const x = cx - cw / 2, y = cy - ch / 2;
  const scale = 1 - (1 - appear) * 0.12;
  // Backdrop dim (unscaled, so it always covers the whole screen)
  ctx.fillStyle = `rgba(6,10,16,${0.6 * appear})`;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Rays
  const rayCount = { Common: 0, Uncommon: 8, Rare: 14, Epic: 20, Legendary: 28, Ancient: 18 }[rv.rarity];
  if (rayCount) {
    ctx.save();
    ctx.translate(cx, cy - 4);
    const rot = age * (rv.rarity === 'Ancient' ? 0.25 : 0.5);
    ctx.rotate(rot);
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const len = 320 + Math.sin(age * 2 + i) * 26;
      ctx.save();
      ctx.rotate(a);
      const grd = ctx.createLinearGradient(0, 0, 0, -len);
      grd.addColorStop(0, hexA(info.color, 0.28));
      grd.addColorStop(1, hexA(info.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, -len);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Card
  const cardGrad = ctx.createLinearGradient(0, y, 0, y + ch);
  cardGrad.addColorStop(0, hexA(info.dark, 0.97));
  cardGrad.addColorStop(0.5, 'rgba(14,20,28,0.98)');
  cardGrad.addColorStop(1, 'rgba(8,12,18,0.98)');
  ctx.fillStyle = cardGrad;
  rr(ctx, x, y, cw, ch, 14); ctx.fill();

  // Border treatment varies by tier
  ctx.lineWidth = rv.rarity === 'Ancient' ? 6 : rv.rarity === 'Legendary' ? 5 : 3;
  ctx.strokeStyle = info.color;
  rr(ctx, x + 4, y + 4, cw - 8, ch - 8, 12); ctx.stroke();
  if (rv.rarity === 'Legendary' || rv.rarity === 'Ancient' || rv.rarity === 'Epic') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexA(info.color, 0.5);
    rr(ctx, x + 12, y + 12, cw - 24, ch - 24, 10); ctx.stroke();
  }
  // corner studs
  const studs = { Common: 0, Uncommon: 0, Rare: 4, Epic: 4, Legendary: 8, Ancient: 12 }[rv.rarity];
  for (let i = 0; i < studs; i++) {
    const corners = [[x + 14, y + 14], [x + cw - 14, y + 14], [x + 14, y + ch - 14], [x + cw - 14, y + ch - 14]];
    const [sx0, sy0] = corners[i % 4];
    const off = Math.floor(i / 4) * 10;
    ctx.fillStyle = info.color;
    ctx.beginPath(); ctx.arc(sx0 + (sx0 > cx ? -off : off), sy0 + (sy0 > cy ? -off : off), 3, 0, 7); ctx.fill();
  }

  // Rune ring / extra motifs for high tiers
  if (rv.rarity === 'Ancient' || rv.rarity === 'Legendary') {
    ctx.save();
    ctx.translate(cx, cy - 4);
    const rr0 = 150;
    ctx.rotate(age * (rv.rarity === 'Ancient' ? -0.4 : -0.6));
    ctx.strokeStyle = hexA(info.color, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, rr0, 0, 7); ctx.stroke();
    const runes = 12;
    for (let i = 0; i < runes; i++) {
      const a = (i / runes) * Math.PI * 2;
      const rx = Math.cos(a) * rr0, ry = Math.sin(a) * rr0;
      ctx.fillStyle = info.color;
      ctx.fillRect(rx - 3, ry - 3, 6, 6);
      ctx.fillStyle = hexA('#ffffff', 0.8);
      ctx.fillRect(rx - 1, ry - 1, 2, 2);
    }
    ctx.restore();
  }

  // Starfield for Ancient
  if (rv.rarity === 'Ancient') {
    for (let i = 0; i < 40; i++) {
      const sx = x + 20 + ((i * 137 + age * 12) % (cw - 40));
      const sy = y + 20 + ((i * 89) % (ch - 40));
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(age * 3 + i));
      ctx.fillStyle = hexA('#bff7ff', tw * 0.7);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // Fish, anchored in the left third of the card
  const sprite = fishSprite(rv.name);
  const areaHalf = cw * 0.27;
  const fs = Math.min(7, areaHalf / (sprite.width / 2), 145 / sprite.height);
  const dw = sprite.width * fs, dh = sprite.height * fs;
  const fcx = x + cw * 0.30, fcy = cy - 8;
  // glow behind fish
  ctx.globalAlpha = 0.35 + Math.sin(age * 3) * 0.12;
  const gg = ctx.createRadialGradient(fcx, fcy, 6, fcx, fcy, Math.max(dw, dh) * 0.8);
  gg.addColorStop(0, info.color);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg;
  ctx.fillRect(fcx - dw, fcy - dh, dw * 2, dh * 2);
  ctx.globalAlpha = 1;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  const bob = Math.sin(age * 2.4) * 3;
  ctx.translate(fcx, fcy + bob);
  ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  // Confetti / embers for the highest tiers
  if (rv.rarity === 'Legendary' || rv.rarity === 'Ancient' || rv.rarity === 'Epic') {
    const n = rv.rarity === 'Epic' ? 16 : 30;
    for (let i = 0; i < n; i++) {
      const sp = 30 + (i % 5) * 12;
      const px = ((i * 97 + age * sp) % (cw + 60)) + x - 30;
      const py = y + ((i * 61 + age * (18 + (i % 4) * 6)) % (ch + 60)) - 20;
      const c = i % 3 === 0 ? info.color : i % 3 === 1 ? '#ffffff' : hexA(info.color, 0.6);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(age * 3 + i));
      ctx.fillRect(Math.round(px), Math.round(py), 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  // Shine sweep across the card for Legendary/Ancient
  if (rv.rarity === 'Legendary' || rv.rarity === 'Ancient') {
    const sweep = ((age * 0.5) % 1) * (cw + 200) - 100;
    ctx.save();
    rr(ctx, x, y, cw, ch, 14); ctx.clip();
    const grd = ctx.createLinearGradient(x + sweep - 60, 0, x + sweep + 60, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, cw, ch);
    ctx.restore();
  }

  // Text block on the right
  const tx0 = x + cw * 0.58;
  drawText(ctx, 'YOU CAUGHT', tx0, cy - 92, U, 'rgba(210,225,235,0.75)');
  let ns = rv.name.length > 15 ? 3 : 4;
  while (ns > 2 && textWidth(rv.name, ns) > (x + cw - 28) - tx0) ns--;
  drawText(ctx, rv.name, tx0, cy - 64, ns, '#ffffff', { shadow: 'rgba(0,0,0,.6)' });

  // Rarity tag
  const rlabel = rv.rarity.toUpperCase();
  const rws = textWidth(rlabel, 3) + 28;
  ctx.fillStyle = hexA(info.color, 0.20);
  rr(ctx, tx0 - 4, cy + 8, rws + 8, 34, 8); ctx.fill();
  ctx.strokeStyle = info.color; ctx.lineWidth = 2;
  rr(ctx, tx0 - 4, cy + 8, rws + 8, 34, 8); ctx.stroke();
  drawText(ctx, rlabel, tx0 + 10, cy + 16, 3, info.color);

  if (rv.rarity === 'Ancient') {
    drawText(ctx, 'A RELIC OF THE FIRST TIDE', tx0, cy + 54, U, '#bff7ff');
  } else if (rv.rarity === 'Legendary') {
    drawText(ctx, 'A LEGEND SURFACES', tx0, cy + 54, U, '#ffe9a8');
  } else if (rv.rarity === 'Epic') {
    drawText(ctx, 'A RARE PRIZE', tx0, cy + 54, U, '#e9c4ff');
  }
  drawTextCenter(ctx, 'SPACE / TAP TO CONTINUE', cx, y + ch - 30, U, 'rgba(210,225,235,0.8)');

  ctx.restore();
}

function hexA(hex, a) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Toast for a missed bite
function drawToast(ctx, g) {
  if (!g.toast || g.toastAge > g.toastLife) return;
  const a = Math.min(1, g.toastAge / 0.15) * Math.min(1, (g.toastLife - g.toastAge) / 0.4);
  ctx.globalAlpha = Math.max(0, a);
  const msg = g.toast;
  const w = textWidth(msg, 3) + 48;
  const x = 640 - w / 2, y = 250;
  panel(ctx, x, y, w, 50, 'rgba(255,120,90,0.7)');
  drawTextCenter(ctx, msg, 640, y + 15, 3, '#ff8a6a', { shadow: 'rgba(0,0,0,.6)' });
  ctx.globalAlpha = 1;
}

// Title / instruction intro card
function drawIntro(ctx, g) {
  if (g.started) {
    return;
  }
  const t = g.t;
  ctx.fillStyle = 'rgba(6,10,16,0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  const w = 640, h = 220, x = 640 - w / 2, y = 150;
  panel(ctx, x, y, w, h, 'rgba(255,220,150,0.6)');
  drawTextCenter(ctx, 'TIDEWATER BAY', 640, y + 30, 5, '#ffe9b0', { shadow: '#5a3a18', shadowX: 3, shadowY: 3 });
  drawTextCenter(ctx, 'A COZY FISHING SPOT', 640, y + 78, U, 'rgba(210,225,235,0.85)');
  const lines = [
    '1. PRESS SPACE OR TAP CAST',
    '2. WAIT FOR THE BITE  (!)',
    '3. REEL IN BEFORE THE METER RUNS OUT',
  ];
  for (let i = 0; i < lines.length; i++) {
    drawTextCenter(ctx, lines[i], 640, y + 112 + i * 22, U, i === 2 ? '#ffd23c' : '#ffffff');
  }
  const pulse = 0.6 + Math.sin(t * 4) * 0.4;
  ctx.globalAlpha = pulse;
  drawTextCenter(ctx, 'PRESS SPACE OR TAP THE CAST BUTTON', 640, y + h + 30, U, '#ffe9b0');
  ctx.globalAlpha = 1;
}

export function drawUI(ctx, g) {
  ctx.clearRect(0, 0, 1280, 720);
  ctx.imageSmoothingEnabled = false;
  drawLog(ctx, g);
  drawLegend(ctx, g);
  drawToast(ctx, g);
  drawIntro(ctx, g);
  drawBiteMeter(ctx, g);
  // Prompt hidden while intro card is up
  if (g.started && g.state !== 'reveal') drawPrompt(ctx, g);
  if (g.state === 'reveal') drawReveal(ctx, g);
  drawButton(ctx, g);
}
