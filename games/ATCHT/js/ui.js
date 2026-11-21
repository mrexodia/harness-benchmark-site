// ui.js — crisp full-resolution overlay (1280x720). Kept compact: a bottom
// bar, a small catch log and a legend of the six odds. No debug chrome.

import { RARITIES, RARITY_ORDER } from './palette.js';

const W = 1280, H = 720;
const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
const BAR_H = 88;
const BAR_Y = H - BAR_H;

function rr(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function text(ctx, s, x, y, o = {}) {
  const {
    size = 18, color = '#f3ead6', weight = 600, align = 'left',
    baseline = 'alphabetic', glow = null, glowSize = 12, spacing = '0px',
    shadow = true,
  } = o;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowSize;
  } else if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
function drawBar(ctx, g, t) {
  // bar body
  const grad = ctx.createLinearGradient(0, BAR_Y, 0, H);
  grad.addColorStop(0, 'rgba(16,21,31,0.86)');
  grad.addColorStop(1, 'rgba(10,14,22,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, BAR_Y, W, BAR_H);
  // top accent
  ctx.fillStyle = 'rgba(202,160,106,0.55)';
  ctx.fillRect(0, BAR_Y, W, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, BAR_Y + 2, W, 1);

  // title
  text(ctx, 'TIDEPOOL BAY', 28, BAR_Y + 26, { size: 13, color: '#caa06a', weight: 800, spacing: '3px' });

  const info = {
    ready: ['Ready to cast', 'Press SPACE, or click the button'],
    waiting: ['Watching the water…', 'Wait for the bobber to dip'],
    bite: ['BITE!  Reel!', 'Press SPACE right now!'],
    reeling: ['Reeling in…', 'Keep the line tight'],
    reveal: ['Nice catch!', 'Press SPACE to cast again'],
  }[g.phase] || ['', ''];

  const bite = g.phase === 'bite';
  text(ctx, info[0], 28, BAR_Y + 57, {
    size: bite ? 26 : 22,
    color: bite ? '#ffd24a' : '#f3ead6',
    weight: 800,
    glow: bite ? 'rgba(255,120,40,0.9)' : null,
  });
  text(ctx, info[1], 28, BAR_Y + 78, { size: 14, color: '#b7ad98', weight: 500 });

  // legend of the six odds (2 columns x 3 rows), right side of the bar
  const pct = { Common: '45%', Uncommon: '25%', Rare: '15%', Epic: '8%', Legendary: '5%', Ancient: '2%' };
  const colX = [884, 1068];
  const rowY = [BAR_Y + 24, BAR_Y + 48, BAR_Y + 72];
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    const r = RARITY_ORDER[i];
    const x = colX[i % 2], y = rowY[Math.floor(i / 2)];
    ctx.save();
    ctx.shadowColor = RARITIES[r].color; ctx.shadowBlur = 6;
    ctx.fillStyle = RARITIES[r].color;
    ctx.beginPath(); ctx.arc(x + 5, y - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    text(ctx, r, x + 16, y, { size: 14, color: '#e8dfcb', weight: 600 });
    text(ctx, pct[r], x + 150, y, { size: 14, color: RARITIES[r].color, weight: 800, align: 'right' });
  }
}

// ---------------------------------------------------------------------------
function drawLog(ctx, g, t) {
  const x = 996, y = 12, w = 272, h = 194;
  // panel
  ctx.save();
  ctx.globalAlpha = 0.9;
  rr(ctx, x, y, w, h, 10, 'rgba(16,21,31,0.82)');
  ctx.restore();
  ctx.strokeStyle = 'rgba(202,160,106,0.45)';
  ctx.lineWidth = 2;
  rr(ctx, x + 1, y + 1, w - 2, h - 2, 9, 'rgba(0,0,0,0)');
  ctx.stroke();
  text(ctx, 'CATCH LOG', x + 14, y + 24, { size: 12, color: '#caa06a', weight: 800, spacing: '2px' });
  ctx.fillStyle = 'rgba(202,160,106,0.3)';
  ctx.fillRect(x + 14, y + 32, w - 28, 1);

  const recent = g.log.slice(0, 8);
  if (recent.length === 0) {
    text(ctx, 'No catches yet — cast away!', x + 14, y + 60, { size: 14, color: '#8d8677', weight: 500 });
    return;
  }
  for (let i = 0; i < recent.length; i++) {
    const e = recent[i];
    const ry = y + 54 + i * 17;
    const rc = RARITIES[e.rarity];
    ctx.save();
    ctx.shadowColor = rc.color; ctx.shadowBlur = 5;
    ctx.fillStyle = rc.color;
    ctx.beginPath(); ctx.arc(x + 19, ry - 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const isNew = i === 0;
    text(ctx, e.name, x + 32, ry, {
      size: 14.5, color: isNew ? '#fff6df' : '#d8d0bd', weight: isNew ? 800 : 600,
    });
    text(ctx, e.rarity, x + w - 14, ry, { size: 11, color: rc.color, weight: 800, align: 'right' });
  }
}

// ---------------------------------------------------------------------------
function drawRevealText(ctx, g, t) {
  const { fish, rarity } = g.caught;
  const R = RARITIES[rarity];
  const cx = 640;
  const u = Math.min(1, g.phaseT / 0.4);
  ctx.save();
  ctx.globalAlpha = u;

  // rarity word, tier-styled
  const common = { size: 30, color: R.color, weight: 900, align: 'center', spacing: '8px', glow: R.glow, glowSize: 14 };
  if (rarity === 'Legendary') {
    const grad = ctx.createLinearGradient(cx - 160, 0, cx + 160, 0);
    grad.addColorStop(0, '#ffe08a');
    grad.addColorStop(0.5, '#fff8e0');
    grad.addColorStop(1, '#e0912a');
    ctx.save();
    ctx.font = `900 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.shadowColor = R.color; ctx.shadowBlur = 20;
    ctx.fillStyle = grad;
    ctx.fillText(rarity.toUpperCase(), cx, 200);
    ctx.restore();
  } else if (rarity === 'Ancient') {
    const shim = 0.5 + Math.sin(t * 3) * 0.5;
    ctx.save();
    ctx.font = `900 32px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
    ctx.shadowColor = R.color; ctx.shadowBlur = 18 + shim * 14;
    ctx.fillStyle = shim > 0.5 ? '#eafffb' : R.color;
    ctx.fillText(rarity.toUpperCase(), cx, 198);
    ctx.restore();
    // little rune ticks either side
    ctx.fillStyle = R.color;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 150 - i * 9, 194, 4, 2);
      ctx.fillRect(cx + 146 + i * 9, 194, 4, 2);
    }
  } else {
    text(ctx, rarity.toUpperCase(), cx, 198, common);
  }

  // fish name
  text(ctx, fish.name, cx, 508, {
    size: 30, color: '#fff8e6', weight: 800, align: 'center',
    glow: 'rgba(0,0,0,0.9)', glowSize: 8, spacing: '1px',
  });

  // continue hint, soft pulse
  const pulse = 0.6 + Math.sin(t * 4) * 0.4;
  ctx.globalAlpha = u * pulse;
  text(ctx, 'SPACE  ·  CONTINUE', cx, 560, {
    size: 15, color: '#e8c98a', weight: 800, align: 'center', spacing: '4px',
  });
  ctx.restore();
}

function drawToast(ctx, g, t) {
  const a = Math.min(1, g.toastT / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `800 24px ${FONT}`;
  ctx.textAlign = 'center';
  const w = ctx.measureText(g.toast).width + 40;
  rr(ctx, 640 - w / 2, 78, w, 40, 10, 'rgba(12,16,24,0.82)');
  text(ctx, g.toast, 640, 105, { size: 24, color: g.toastColor || '#f3ead6', weight: 800, align: 'center', glow: 'rgba(0,0,0,0.8)', glowSize: 6 });
  ctx.restore();
}

// ---------------------------------------------------------------------------
export function drawUI(ctx, g, t) {
  ctx.clearRect(0, 0, W, H);
  drawLog(ctx, g, t);
  drawBar(ctx, g, t);
  if (g.phase === 'reveal' && g.caught) drawRevealText(ctx, g, t);
  if (g.toast && g.toastT > 0) drawToast(ctx, g, t);
}

export function updateButton(btn, g) {
  const label = {
    ready: 'Cast', waiting: 'Waiting', bite: 'Reel!', reeling: 'Reeling', reveal: 'Continue',
  }[g.phase] || 'Cast';
  const enabled = g.phase === 'ready' || g.phase === 'bite' || (g.phase === 'reveal' && g.phaseT > 0.35);
  btn.textContent = label;
  btn.disabled = !enabled;
  btn.classList.toggle('reel', g.phase === 'bite');
}
