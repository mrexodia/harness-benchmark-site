// Full-resolution HUD / reveal overlay. Text is drawn with the hand-made bitmap font.
import { drawText, textWidth } from './font.js';
import { RARITY } from './palette.js';
import { ODDS, fishCanvas } from './fish.js';

export const UI_W = 1280;
export const UI_H = 720;

// bottom-center action button
export const BUTTON = { x: 540, y: 628, w: 200, h: 62 };

function panel(ctx, x, y, w, h, fill = 'rgba(24,20,34,0.78)', light = 'rgba(255,255,255,0.16)', dark = 'rgba(0,0,0,0.45)') {
  ctx.fillStyle = dark;
  ctx.fillRect(x + 3, y + 3, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillStyle = dark;
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x + w - 2, y, 2, h);
}

function drawInstruction(ctx) {
  panel(ctx, 16, 16, 430, 66);
  drawText(ctx, 'TIDEPOOL BAY', 30, 26, { color: '#ffe08a', scale: 2, shadow: true });
  drawText(ctx, 'CAST, WAIT FOR A BITE, THEN REEL!', 30, 50, { color: '#d8e6f0', scale: 1, shadow: true });
}

function drawLog(ctx, log) {
  const w = 372, h = 8 * 22 + 36, x = UI_W - 16 - w, y = 16;
  panel(ctx, x, y, w, h);
  drawText(ctx, 'CATCH LOG', x + 12, y + 12, { color: '#ffe08a', scale: 2, shadow: true });
  if (!log.length) {
    drawText(ctx, 'NOTHING YET...', x + 12, y + 40, { color: '#8fa0b4', scale: 1 });
  }
  for (let i = 0; i < Math.min(8, log.length); i++) {
    const e = log[i];
    const ry = y + 32 + i * 22;
    const col = RARITY[e.rarity].main;
    ctx.fillStyle = col;
    ctx.fillRect(x + 12, ry + 2, 12, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 12, ry + 12, 12, 2);
    // mini fish
    const spr = fishCanvas(e.name);
    const fh = 16, fw = Math.round(spr.width * (fh / spr.height));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, x + 30, ry, fw, fh);
    drawText(ctx, e.name, x + 30 + fw + 8, ry + 3, { color: '#eef4f8', scale: 2, shadow: true });
  }
}

function drawLegend(ctx) {
  const w = 230, h = 6 * 18 + 32, x = 16, y = UI_H - 16 - h;
  panel(ctx, x, y, w, h);
  drawText(ctx, 'RARITY ODDS', x + 12, y + 10, { color: '#ffe08a', scale: 2, shadow: true });
  for (let i = 0; i < ODDS.length; i++) {
    const [name, pct] = ODDS[i];
    const ry = y + 30 + i * 18;
    ctx.fillStyle = RARITY[name].main;
    ctx.fillRect(x + 12, ry + 2, 10, 10);
    drawText(ctx, name, x + 28, ry + 2, { color: '#e6eef4', scale: 1, shadow: true });
    drawText(ctx, pct + '%', x + w - 14, ry + 2, { color: '#a9bccb', scale: 1, align: 'right', shadow: true });
  }
}

function buttonState(state) {
  switch (state) {
    case 'ready': return { label: 'CAST', hint: 'SPACE OR CLICK', col: '#7fd06a', col2: '#4f8a3e' };
    case 'waiting': return { label: 'WAIT', hint: 'WATCH THE BOBBER...', col: '#e0c060', col2: '#a07d28' };
    case 'bite': return { label: 'REEL!', hint: 'PRESS NOW!', col: '#ff6a4a', col2: '#b02f22' };
    case 'reeling': return { label: '...', hint: 'REELING IN', col: '#8fb0d0', col2: '#5a769a' };
    case 'reveal': return { label: 'NEXT', hint: 'SPACE TO CONTINUE', col: '#e0b45a', col2: '#9a7328' };
    default: return { label: 'CAST', hint: '', col: '#7fd06a', col2: '#4f8a3e' };
  }
}

function drawButton(ctx, game, hovered) {
  const st = buttonState(game.state);
  const { x, y, w, h } = BUTTON;
  const press = game.buttonDown ? 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 4, y + 4 + press, w, h);
  ctx.fillStyle = st.col2;
  ctx.fillRect(x, y + press, w, h);
  ctx.fillStyle = hovered ? '#ffffff22' : 'transparent';
  ctx.fillRect(x, y + press, w, h);
  ctx.fillStyle = st.col;
  ctx.fillRect(x + 2, y + 2 + press, w - 4, h - 4);
  ctx.fillStyle = st.col2;
  ctx.fillRect(x + 2, y + h - 6 + press, w - 4, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 4, y + 4 + press, w - 8, 3);
  if (game.state === 'bite') {
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 16);
    ctx.fillStyle = `rgba(255,255,255,${0.25 + pulse * 0.4})`;
    ctx.fillRect(x, y + press, w, h);
  }
  drawText(ctx, st.label, x + w / 2, y + (h - 14 * 2) / 2 + press, { color: '#241a12', scale: 2, align: 'center' });
  if (st.hint) drawText(ctx, st.hint, x + w / 2, y - 20, { color: '#fff2d6', scale: 1, align: 'center', shadow: true });
}

function drawBiteBar(ctx, game) {
  if (game.state !== 'bite') return;
  const frac = Math.max(0, game.biteRemaining / game.BITE_WINDOW);
  const x = BUTTON.x, w = BUTTON.w, y = BUTTON.y - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, 14);
  const col = frac > 0.5 ? '#7fd06a' : frac > 0.25 ? '#e0c060' : '#ff6a4a';
  ctx.fillStyle = col;
  ctx.fillRect(x + 2, y + 2, (w - 4) * frac, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 2, y + 2, (w - 4) * frac, 3);
}

// --- reveal ----------------------------------------------------------------
function tierDecoration(ctx, r, x, y, w, h, t) {
  const col = RARITY[r];
  const cx = x + w / 2, cy = y + h / 2;
  if (r === 'Common') {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(x + 20 + (i * 61) % (w - 40), y + 20 + (i * 37) % (h - 40), 3, 3);
    }
  } else if (r === 'Uncommon') {
    // little leaves in the corners
    for (const [ox, oy, sx, sy] of [[14, 14, 1, 1], [w - 14, 14, -1, 1], [14, h - 14, 1, -1], [w - 14, h - 14, -1, -1]]) {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? col.bright : col.main;
        ctx.fillRect(x + ox + sx * i * 2, y + oy + sy * i, 3, 3);
        ctx.fillRect(x + ox + sx * i, y + oy + sy * i * 2, 3, 3);
      }
    }
  } else if (r === 'Rare') {
    // sparkles + moving glint
    for (let i = 0; i < 14; i++) {
      const sx = x + 24 + ((i * 97) % (w - 48));
      const sy = y + 24 + ((i * 53) % (h - 48));
      const tw = Math.sin(t * 3 + i) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(180,230,255,${0.3 + tw * 0.7})`;
      const s = 2 + Math.round(tw * 2);
      ctx.fillRect(sx, sy, s, s);
    }
    const gx = x + ((t * 180) % (w + 200)) - 100;
    const grad = ctx.createLinearGradient(gx, 0, gx + 100, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  } else if (r === 'Epic') {
    // rotating rune ring + pulsing border
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = `rgba(201,168,255,${0.15 + pulse * 0.2})`;
    ctx.fillRect(x - 4, y - 4, w + 8, 4);
    ctx.fillRect(x - 4, y + h, w + 8, 4);
    ctx.fillRect(x - 4, y, 4, h);
    ctx.fillRect(x + w, y, 4, h);
    for (let i = 0; i < 12; i++) {
      const a = t * 0.9 + i * (Math.PI * 2 / 12);
      const rx = cx + Math.cos(a) * (w / 2 + 12);
      const ry = cy + Math.sin(a) * (h / 2 + 12);
      ctx.fillStyle = i % 2 ? col.main : col.bright;
      ctx.fillRect(rx - 2, ry - 2, 5, 5);
    }
  } else if (r === 'Legendary') {
    // radiant rays
    for (let i = 0; i < 16; i++) {
      const a = i * (Math.PI * 2 / 16) + t * 0.25;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 ? 'rgba(255,224,130,0.10)' : 'rgba(255,244,194,0.16)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(26, 240);
      ctx.lineTo(-26, 240);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // rotating star sparkles
    for (let i = 0; i < 8; i++) {
      const a = -t * 1.4 + i * (Math.PI / 4);
      const rx = cx + Math.cos(a) * (w / 2 - 20);
      const ry = cy + Math.sin(a) * (h / 2 - 14);
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i);
      ctx.fillStyle = `rgba(255,244,194,${0.5 + tw * 0.5})`;
      const s = 2 + tw * 3;
      ctx.fillRect(rx - s, ry, s * 2, 1);
      ctx.fillRect(rx, ry - s, 1, s * 2);
      ctx.fillRect(rx - 1, ry - 1, 3, 3);
    }
  } else if (r === 'Ancient') {
    // dark etched panel with drifting runes + slow aether ring
    ctx.fillStyle = 'rgba(8,30,32,0.55)';
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
    for (let i = 0; i < 10; i++) {
      const rx = x + 30 + ((i * 89 + Math.floor(t * 6)) % (w - 60));
      const ry = y + 30 + ((i * 47) % (h - 60));
      ctx.fillStyle = i % 2 ? 'rgba(87,216,196,0.25)' : 'rgba(127,240,220,0.18)';
      ctx.fillRect(rx, ry, 3, 3);
      ctx.fillRect(rx + 2, ry + 3, 2, 2);
    }
    for (let i = 0; i < 16; i++) {
      const a = -t * 0.35 + i * (Math.PI * 2 / 16);
      const rx = cx + Math.cos(a) * (w / 2 + 6);
      const ry = cy + Math.sin(a) * (h / 2 + 6);
      ctx.fillStyle = 'rgba(127,240,220,0.75)';
      ctx.fillRect(rx - 1, ry - 1, 3, 3);
    }
    // engraved spiral glyphs
    ctx.strokeStyle = 'rgba(127,240,220,0.22)';
    for (const [ox, oy] of [[x + 34, y + 34], [x + w - 34, y + 34], [x + 34, y + h - 34], [x + w - 34, y + h - 34]]) {
      ctx.beginPath();
      ctx.arc(ox, oy, 12, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }
}

function drawReveal(ctx, game, t) {
  const rv = game.reveal;
  const r = rv.rarity;
  const col = RARITY[r];
  const w = 680, h = 340, x = (UI_W - w) / 2, y = 168;

  // dimension the world
  ctx.fillStyle = 'rgba(10,8,18,0.45)';
  ctx.fillRect(0, 0, UI_W, UI_H);

  // entrance animation
  const p = Math.min(1, rv.t / 0.35);
  const ease = 1 - Math.pow(1 - p, 3);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(0.85 + ease * 0.15, 0.85 + ease * 0.15);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.globalAlpha = ease;

  panel(ctx, x, y, w, h, 'rgba(18,22,30,0.94)', 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.6)');
  // rarity tinted border
  ctx.fillStyle = col.main;
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);

  tierDecoration(ctx, r, x, y, w, h, t);

  // header ribbon
  ctx.fillStyle = col.deep;
  ctx.fillRect(x + w / 2 - 150, y + 16, 300, 34);
  ctx.fillStyle = col.main;
  ctx.fillRect(x + w / 2 - 148, y + 18, 296, 30);
  drawText(ctx, r === 'Ancient' ? 'ANCIENT CATCH' : r.toUpperCase() + ' CATCH', x + w / 2, y + 26, { color: '#1a1410', scale: 2, align: 'center' });

  // fish sprite, gently bobbing
  const spr = fishCanvas(rv.name);
  const fh = 150;
  const fw = Math.round(spr.width * (fh / spr.height));
  const bob = Math.sin(t * 2.2) * 2;
  ctx.imageSmoothingEnabled = false;
  // glow behind for high tiers
  if (r === 'Legendary' || r === 'Ancient' || r === 'Epic') {
    const glow = ctx.createRadialGradient(x + w / 2, y + 150, 10, x + w / 2, y + 150, 150);
    glow.addColorStop(0, col.glow + 'aa');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, w, h);
  }
  ctx.drawImage(spr, x + w / 2 - fw / 2, y + 74 + bob, fw, fh);

  // name
  drawText(ctx, rv.name, x + w / 2, y + h - 70, { color: '#ffffff', scale: 2, align: 'center', shadow: true });
  // occasion text
  const txt = rv.count === 1 ? 'YOUR FIRST OF THE SESSION' : 'CAUGHT #' + rv.count;
  drawText(ctx, txt, x + w / 2, y + h - 44, { color: col.bright, scale: 1, align: 'center', shadow: true });

  ctx.restore();

  // continue hint (outside scale so it stays steady)
  const blink = 0.5 + 0.5 * Math.sin(t * 5);
  drawText(ctx, 'SPACE / CLICK FOR NEXT CAST', x + w / 2, y + h + 18, { color: `rgba(255,240,210,${0.5 + blink * 0.5})`, scale: 1, align: 'center' });
}

export function drawUI(ctx, game) {
  ctx.clearRect(0, 0, UI_W, UI_H);
  ctx.imageSmoothingEnabled = false;
  drawInstruction(ctx);
  drawLog(ctx, game.log);
  drawLegend(ctx);
  drawButton(ctx, game, game.buttonHover);
  drawBiteBar(ctx, game);
  if (game.state === 'reveal' && game.reveal) drawReveal(ctx, game, game.time);
}
