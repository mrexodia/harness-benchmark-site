// Full-resolution overlay UI (1280x720). Text is drawn with the code bitmap font.
import { P, RARITY, RARITY_ORDER, RARITY_ODDS } from './palette.js';
import { drawText, measureText } from './font.js';
import { getSprite } from './fish.js';

export const UW = 1280;
export const UH = 720;

export const BUTTON = { x: 1020, y: 608, w: 240, h: 92 };

function panel(g, x, y, w, h, opts = {}) {
  const border = opts.border || P.uiBorder;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(x + 4, y + 4, w, h);
  g.fillStyle = opts.bg || P.uiPanel;
  g.fillRect(x, y, w, h);
  g.fillStyle = border;
  g.fillRect(x, y, w, 3);
  g.fillRect(x, y + h - 3, w, 3);
  g.fillRect(x, y, 3, h);
  g.fillRect(x + w - 3, y, 3, h);
  g.fillStyle = P.uiBorderDark;
  g.fillRect(x + 3, y + 3, w - 6, 1);
  g.fillRect(x + 3, y + h - 4, w - 6, 1);
  g.fillRect(x + 3, y + 3, 1, h - 6);
  g.fillRect(x + w - 4, y + 3, 1, h - 6);
  g.fillStyle = '#fff3cf';
  for (const [cx, cy, sx, sy] of [
    [x, y, 1, 1], [x + w - 7, y, -1, 1], [x, y + h - 7, 1, -1], [x + w - 7, y + h - 7, -1, -1],
  ]) {
    g.fillRect(cx + (sx < 0 ? 0 : 0), cy, 7, 2);
    g.fillRect(cx + (sx < 0 ? 6 : 0), cy, 2, 7);
  }
}

export function drawUI(g, game, t) {
  g.clearRect(0, 0, UW, UH);
  g.imageSmoothingEnabled = false;
  if (game.phase === 'reveal') {
    drawRevealText(g, game, t);
  } else {
    drawStatus(g, game, t);
    drawLegend(g, t);
    drawLog(g, game);
    if (game.toast) drawToast(g, game, t);
    if (!game.started) drawIntro(g, t);
  }
  drawButton(g, game, t);
}

// ---------------------------------------------------------------------------
function drawStatus(g, game, t) {
  const x = 20, y = 16, w = 384, h = 66;
  panel(g, x, y, w, h);
  let label = 'READY TO CAST';
  let labelColor = RARITY.Common.color;
  let hint = 'SPACE OR THE BUTTON';
  if (game.phase === 'waiting') { label = 'LINE OUT - WAIT...'; labelColor = '#cfe0e6'; hint = 'STEADY...'; }
  else if (game.phase === 'bite') {
    label = 'BITE! REEL NOW!';
    labelColor = Math.sin(t * 18) > 0 ? '#ffe066' : '#ffffff';
    hint = 'PRESS ONCE';
  } else if (game.phase === 'reeling') { label = 'REELING IN...'; labelColor = '#8fd8ff'; hint = ''; }
  drawText(g, label, x + 18, y + 14, 2, labelColor, { shadow: { dx: 2, dy: 2, color: '#000000' } });
  if (hint) drawText(g, hint, x + 18, y + 40, 1, P.uiDim, {});
  // small cast/action glyph
  drawRodGlyph(g, x + w - 52, y + 16, game.phase);
}

function drawRodGlyph(g, x, y, phase) {
  const col = phase === 'bite' ? '#ffe066' : P.uiBorder;
  // rod
  for (let i = 0; i < 22; i++) g.fillRect(x + i, y + 20 - Math.round(i * 0.7), 2, 2);
  // line
  for (let i = 0; i < 12; i++) g.fillRect(x + 22 + i, y - Math.round(Math.sin((i / 11) * Math.PI) * 8) + 6, 1, 1);
  // bobber
  g.fillStyle = '#d94b3a'; g.fillRect(x + 33, y + 4, 4, 4);
  g.fillStyle = '#f2ead6'; g.fillRect(x + 33, y + 8, 4, 3);
  g.fillStyle = col; g.fillRect(x, y + 18, 4, 4);
}

function drawLegend(g, t) {
  const w = 214, x = UW - 20 - w, y = 16;
  const rowH = 22, h = 30 + RARITY_ORDER.length * rowH + 8;
  panel(g, x, y, w, h);
  drawText(g, 'CATCH ODDS', x + 14, y + 11, 1, P.uiBorder, {});
  let ry = y + 30;
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    const name = RARITY_ORDER[i];
    const r = RARITY[name];
    // swatch
    g.fillStyle = r.glow; g.fillRect(x + 14, ry + 2, 12, 12);
    g.fillStyle = r.color; g.fillRect(x + 15, ry + 3, 10, 10);
    g.fillStyle = '#ffffff'; g.fillRect(x + 15, ry + 3, 10, 2);
    drawText(g, name, x + 34, ry + 4, 1, r.color, {});
    drawText(g, RARITY_ODDS[i], x + w - 14, ry + 4, 1, P.uiText, { align: 'right' });
    ry += rowH;
  }
}

function drawLog(g, game) {
  const w = 360, x = 20;
  const rows = Math.max(2, Math.min(8, game.log.length));
  const h = 40 + rows * 24;
  const y = UH - 20 - h;
  panel(g, x, y, w, h);
  drawText(g, 'LAST CATCHES', x + 14, y + 11, 1, P.uiBorder, {});
  const entries = game.log.slice(0, 8);
  if (!entries.length) {
    drawText(g, 'NOTHING YET - GO FISH!', x + 14, y + 44, 1, P.uiDim, {});
    return;
  }
  let ry = y + 30;
  for (const e of entries) {
    const r = RARITY[e.rarity] || RARITY.Common;
    g.fillStyle = r.glow; g.fillRect(x + 12, ry, 3, 20);
    g.fillStyle = r.color; g.fillRect(x + 12, ry, 3, 20);
    // mini sprite
    const fish = game.fishByName[e.name];
    if (fish) {
      const spr = getSprite(fish);
      g.imageSmoothingEnabled = false;
      g.drawImage(spr, x + 20, ry + 2, spr.width, spr.height);
    }
    const nameX = x + 24 + 42;
    let name = e.name;
    const maxW = w - (nameX - x) - 78;
    let cut = false;
    while (measureText(name, 2) > maxW && name.length > 3) { name = name.slice(0, -1); cut = true; }
    if (cut) name = name.slice(0, -3) + '...';
    drawText(g, name, nameX, ry + 4, 2, r.color, {});
    drawText(g, e.rarity.toUpperCase(), x + w - 12, ry + 5, 1, r.color, { align: 'right' });
    ry += 24;
  }
}

function drawButton(g, game, t) {
  const { x, y, w, h } = BUTTON;
  let label = 'CAST';
  let color = P.uiBorder;
  let active = true;
  if (game.phase === 'waiting') { label = 'WAITING'; color = '#5a6470'; active = false; }
  else if (game.phase === 'bite') { label = 'REEL!'; color = '#ffe066'; }
  else if (game.phase === 'reeling') { label = 'REELING'; color = '#6fa8c8'; active = false; }
  else if (game.phase === 'reveal') { label = 'NEXT'; color = P.uiBorder; }

  const pulse = (game.phase === 'bite') ? (0.5 + 0.5 * Math.sin(t * 16)) : 0;
  const scaleUp = label.length > 5 ? 2 : 3;
  const bx = x, by = y, bw = w, bh = h;

  g.fillStyle = 'rgba(0,0,0,0.4)';
  g.fillRect(bx + 4, by + 4, bw, bh);
  g.fillStyle = active ? (game.phase === 'bite' ? '#2a2010' : '#1d1826') : '#161620';
  g.fillRect(bx, by, bw, bh);
  // border
  const bc = active ? color : '#3a3d46';
  g.fillStyle = bc;
  g.fillRect(bx, by, bw, 3); g.fillRect(bx, by + bh - 3, bw, 3);
  g.fillRect(bx, by, 3, bh); g.fillRect(bx + bw - 3, by, 3, bh);
  if (game.phase === 'bite') {
    g.globalAlpha = 0.25 + pulse * 0.3;
    g.fillStyle = '#ffe066';
    g.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
    g.globalAlpha = 1;
  }
  const lw = measureText(label, scaleUp);
  drawText(g, label, bx + bw / 2, by + (bh - 7 * scaleUp) / 2 - 4, scaleUp, active ? '#fff6df' : '#6a6f7a', {
    align: 'center', shadow: { dx: 2, dy: 2, color: '#000000' },
  });
  drawText(g, 'SPACE', bx + bw / 2, by + bh - 24, 1, active ? P.uiDim : '#4a4d56', { align: 'center' });
}

function drawToast(g, game, t) {
  const msg = game.toast.text;
  const life = game.toast.life;
  const w = measureText(msg, 2) + 60;
  const x = UW / 2 - w / 2, y = 150;
  g.globalAlpha = Math.min(1, life * 2);
  panel(g, x, y, w, 52, { border: '#c96b6b', bg: 'rgba(40,16,20,0.86)' });
  drawText(g, msg, UW / 2, y + 16, 2, '#ffb3a7', { align: 'center', shadow: { dx: 2, dy: 2, color: '#000' } });
  g.globalAlpha = 1;
}

function drawIntro(g, t) {
  const w = 720, h = 168, x = UW / 2 - w / 2, y = 262;
  panel(g, x, y, w, h, { border: P.uiBorder });
  drawText(g, 'HOW TO FISH', UW / 2, y + 22, 3, '#fff3cf', { align: 'center', shadow: { dx: 3, dy: 3, color: '#000' } });
  drawText(g, '1  PRESS SPACE (OR THE BUTTON) TO CAST', UW / 2, y + 70, 2, P.uiText, { align: 'center' });
  drawText(g, '2  WAIT FOR THE BITE, THEN PRESS AGAIN', UW / 2, y + 100, 2, P.uiText, { align: 'center' });
  drawText(g, 'MISS THE WINDOW AND IT GETS AWAY', UW / 2, y + 130, 1, P.uiDim, { align: 'center' });
}

// ---------------------------------------------------------------------------
function drawRevealText(g, game, t) {
  const fish = game.caught;
  if (!fish) return;
  const r = RARITY[fish.rarity];
  const card = { x: 256, y: 96, w: 768, h: 512 };
  const cx = card.x + card.w / 2;

  // rarity word
  const revealAge = game.revealTime || 0;
  const rScale = 3 + (fish.rarity === 'Ancient' ? 1 : 0);
  drawText(g, fish.rarity.toUpperCase(), cx, 176, rScale, r.color, {
    align: 'center', outline: '#000000',
  });

  // name
  drawText(g, fish.name.toUpperCase(), cx, 452, 3, '#fff6df', {
    align: 'center',
    shadow: { dx: 3, dy: 3, color: '#000000' },
  });

  // tier subtitle
  const subs = {
    Common: 'A SOLID CATCH',
    Uncommon: 'A LUCKY FIND',
    Rare: 'RARE BEAUTY',
    Epic: 'EPIC CATCH!',
    Legendary: 'LEGENDARY!',
    Ancient: 'ANCIENT RELIC',
  };
  drawText(g, subs[fish.rarity] || '', cx, 148, 1, r.color, { align: 'center', outline: '#000' });

  // hint
  drawText(g, 'PRESS SPACE OR THE BUTTON TO CONTINUE', cx, 566, 1, P.uiDim, { align: 'center' });

  // tier-specific text flourish
  if (fish.rarity === 'Ancient') {
    const pulses = 0.5 + 0.5 * Math.sin(t * 3);
    g.globalAlpha = 0.5 * pulses;
    drawText(g, '*', cx - 260, 170, 3, r.color, { align: 'center' });
    drawText(g, '*', cx + 260, 170, 3, r.color, { align: 'center' });
    g.globalAlpha = 1;
  }
}
