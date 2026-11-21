"use strict";
/* ------------------------------------------------------------------ *
 *  ui.js - crisp overlay UI drawn at full 1280x720 resolution         *
 * ------------------------------------------------------------------ */

const UI = {
  W: 1280, H: 720,
  panelH: 132,
  font: '"Trebuchet MS","Segoe UI",system-ui,sans-serif',
};

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawPanel(g, G) {
  const y = UI.H - UI.panelH;
  g.save();
  /* backdrop */
  const grd = g.createLinearGradient(0, y, 0, UI.H);
  grd.addColorStop(0, "rgba(10,20,27,0.80)");
  grd.addColorStop(1, "rgba(7,14,19,0.94)");
  g.fillStyle = grd;
  g.fillRect(0, y, UI.W, UI.panelH);
  g.strokeStyle = "rgba(150,196,214,0.35)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, y + 1); g.lineTo(UI.W, y + 1); g.stroke();
  /* column dividers */
  g.strokeStyle = "rgba(150,196,214,0.16)";
  g.lineWidth = 1;
  for (const dx of [356, 778]) {
    g.beginPath(); g.moveTo(dx, y + 14); g.lineTo(dx, UI.H - 12); g.stroke();
  }
  g.restore();
}

function text(g, s, x, y, opt) {
  opt = opt || {};
  g.font = (opt.weight || "") + " " + (opt.size || 13) + "px " + (opt.font || UI.font);
  g.fillStyle = opt.col || "#dbe8ee";
  g.textAlign = opt.align || "left";
  g.textBaseline = opt.base || "alphabetic";
  if (opt.shadow) {
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillText(s, x + 1, y + 1);
    g.fillStyle = opt.col || "#dbe8ee";
  }
  g.fillText(s, x, y);
}

function drawLeft(g, G, t) {
  const py = UI.H - UI.panelH;
  text(g, "TIDEWATER BAY", 28, py + 28, { size: 21, weight: "bold", col: "#f0f7fa", shadow: true });
  text(g, "a quiet spot on the old dock", 29, py + 46, { size: 12, col: "#8fb2c2" });

  const st = STATUS[G.phase];
  text(g, st.label + "  ·  " + (G.hint || ""), 27, py + 126, {
    size: 13, weight: "bold", col: st.col, shadow: true,
  });
}

function drawLog(g, G, t) {
  const py = UI.H - UI.panelH;
  text(g, "CATCH LOG", 374, py + 30, { size: 13, weight: "bold", col: "#9fc4d6" });
  text(g, G.log.length + " caught", 762, py + 30, { size: 11, col: "#6f8b98", align: "right" });
  const rows = G.log.slice(0, 8);
  if (!rows.length) {
    text(g, "nothing yet  ·  cast a line!", 374, py + 52, { size: 12, col: "#6f8b98" });
    return;
  }
  let y = py + 50;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rc = RARITY[r.rarity] || RARITY.Common;
    const a = i === 0 ? 1 : Math.max(0.45, 1 - i * 0.08);
    g.globalAlpha = a;
    g.fillStyle = rc.col;
    g.fillRect(374, y - 8, 6, 6);
    text(g, r.name, 388, y - 2, { size: 12, col: i === 0 ? "#eef7fb" : "#b9ced8" });
    text(g, r.rarity, 762, y - 2, { size: 11, col: rc.col, align: "right" });
    if (i === 0) {
      g.globalAlpha = 0.5 + Math.sin(t * 4) * 0.5;
      text(g, "new", 690, y - 2, { size: 10, col: "#ffe08a", align: "right" });
    }
    g.globalAlpha = 1;
    y += 10.5;
  }
}

function drawLegend(g, G, t) {
  const py = UI.H - UI.panelH;
  text(g, "RARITY ODDS", 796, py + 30, { size: 13, weight: "bold", col: "#9fc4d6" });
  let y = py + 50;
  for (const [name, p] of RARITY_TABLE) {
    const rc = RARITY[name];
    g.fillStyle = rc.col;
    g.fillRect(796, y - 8, 7, 7);
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.lineWidth = 1;
    g.strokeRect(796.5, y - 7.5, 6, 6);
    text(g, name, 812, y - 2, { size: 12, col: rc.col });
    text(g, Math.round(p * 100) + "%", 1256, y - 2, { size: 12, col: "#c6d8e0", align: "right" });
    y += 11;
  }
}

const STATUS = {
  ready:   { label: "READY", col: "#8fd66a" },
  waiting: { label: "WAITING FOR A BITE", col: "#e8c46a" },
  bite:    { label: "BITE! REEL NOW", col: "#ff7a5c" },
  reeling: { label: "REELING IT IN", col: "#7ec9ff" },
  reveal:  { label: "CAUGHT!", col: "#ffe08a" },
};

/* ---- bite cue over the scene ---- */
function drawBiteCue(g, G, t) {
  const b = G.bobber;
  const p = 1 - Math.min(1, G.biteT / G.biteDur);
  const cx = b.x * 4, cy = b.y * 4;

  /* pulse ring */
  const pulse = 1 + Math.sin(t * 22) * 0.12;
  g.save();
  g.strokeStyle = "rgba(255,120,80,0.95)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, 34 * pulse, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "rgba(255,220,180,0.7)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, 44 * pulse, 0, Math.PI * 2);
  g.stroke();

  /* draining window arc */
  g.strokeStyle = "#ffd27a";
  g.lineWidth = 5;
  g.beginPath();
  g.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.4)";
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cy, 26, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  /* exclamation bubble */
  const by = cy - 62 + Math.sin(t * 10) * 3;
  g.save();
  g.fillStyle = "#fff4e0";
  g.strokeStyle = "#c8482e";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, by, 18, 0, Math.PI * 2);
  g.fill(); g.stroke();
  g.fillStyle = "#e0503f";
  g.font = "bold 26px " + UI.font;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("!", cx, by + 1);
  g.restore();
}

/* ---- reveal card ---- */
function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawReveal(g, G, t) {
  const sp = G.species, rar = G.rarity;
  if (!sp || !rar) return;
  const rc = RARITY[rar];
  const k = Math.min(1, G.revealT / 0.38);
  const sc = easeOutBack(k);
  const cx = 640, cy = 300;
  g.save();
  g.translate(cx, cy);
  g.scale(sc, sc);

  const w = 470, h = 340;
  const x = -w / 2, y = -h / 2;

  /* ---- tier decoration behind the card ---- */
  if (rar === "Epic" || rar === "Legendary" || rar === "Ancient") {
    const rays = rar === "Legendary" ? "#f2c14e" : rar === "Ancient" ? "#4fd7c6" : "#b06ae0";
    const n = rar === "Ancient" ? 16 : 12;
    g.save();
    g.globalAlpha = 0.20;
    g.translate(0, 0);
    g.fillStyle = rays;
    for (let i = 0; i < n; i++) {
      g.save();
      g.rotate((i / n) * Math.PI * 2 + t * 0.25);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-22, -430);
      g.lineTo(22, -430);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.restore();
  }
  if (rar === "Ancient") {
    g.save();
    g.globalAlpha = 0.5;
    g.strokeStyle = rc.col;
    g.lineWidth = 3;
    g.setLineDash([12, 10]);
    g.lineDashOffset = -t * 40;
    g.beginPath(); g.arc(0, 0, 210, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  /* card drop shadow + body */
  g.save();
  g.shadowColor = "rgba(0,0,0,0.6)";
  g.shadowBlur = 30;
  g.shadowOffsetY = 12;
  g.fillStyle = "rgba(9,17,24,0.95)";
  rr(g, x, y, w, h, 12); g.fill();
  g.restore();

  /* tier border treatment */
  g.save();
  if (rar === "Common") {
    g.strokeStyle = rc.col; g.lineWidth = 3; rr(g, x, y, w, h, 12); g.stroke();
  } else if (rar === "Uncommon") {
    g.strokeStyle = rc.col; g.lineWidth = 4; rr(g, x, y, w, h, 12); g.stroke();
    g.strokeStyle = rc.col2; g.lineWidth = 2; rr(g, x + 7, y + 7, w - 14, h - 14, 9); g.stroke();
    /* leaf sprigs in corners */
    g.fillStyle = rc.col;
    for (const [lx, ly] of [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) {
      g.beginPath(); g.ellipse(lx, ly, 8, 4, Math.PI / 4, 0, Math.PI * 2); g.fill();
    }
  } else if (rar === "Rare") {
    const shimmer = 0.6 + Math.sin(t * 4) * 0.4;
    g.strokeStyle = rc.col; g.lineWidth = 5;
    g.globalAlpha = shimmer;
    rr(g, x, y, w, h, 12); g.stroke();
    g.globalAlpha = 1;
    g.strokeStyle = rc.col2; g.lineWidth = 2; rr(g, x + 8, y + 8, w - 16, h - 16, 9); g.stroke();
    sparkleRing(g, 0, 0, 250, 12, t, rc.col, rc.glow);
  } else if (rar === "Epic") {
    g.strokeStyle = rc.col; g.lineWidth = 5; rr(g, x, y, w, h, 14); g.stroke();
    g.strokeStyle = rc.glow; g.lineWidth = 2; rr(g, x + 8, y + 8, w - 16, h - 16, 10); g.stroke();
    sparkleRing(g, 0, 0, 240, 18, t, rc.col, rc.glow);
  } else if (rar === "Legendary") {
    g.strokeStyle = "#ffe08a"; g.lineWidth = 6; rr(g, x, y, w, h, 14); g.stroke();
    g.strokeStyle = "#b07d18"; g.lineWidth = 2; rr(g, x + 9, y + 9, w - 18, h - 18, 11); g.stroke();
    /* crown banner */
    g.fillStyle = "rgba(242,193,78,0.16)";
    g.fillRect(x, y + h - 44, w, 44);
    sparkleRing(g, 0, 0, 236, 26, t, "#ffe08a", "#ffffff");
    drawCrown(g, 0, y - 4, 1.5, t);
  } else if (rar === "Ancient") {
    g.strokeStyle = rc.glow; g.lineWidth = 6; rr(g, x, y, w, h, 14); g.stroke();
    g.strokeStyle = rc.col; g.lineWidth = 2; rr(g, x + 9, y + 9, w - 18, h - 18, 11); g.stroke();
    /* rune marks along the frame */
    drawRunes(g, x, y, w, h, t, rc.col);
    sparkleRing(g, 0, 0, 232, 30, t, rc.col, rc.glow);
    g.globalAlpha = 0.12 + Math.sin(t * 2) * 0.05;
    g.fillStyle = rc.col;
    rr(g, x, y, w, h, 14); g.fill();
    g.globalAlpha = 1;
  }
  g.restore();

  /* fish sprite */
  g.save();
  g.imageSmoothingEnabled = false;
  const fs = 6.6 + (rar === "Legendary" || rar === "Ancient" ? 1.4 : 0);
  const fw = sp.canvas.width * fs, fh = sp.canvas.height * fs;
  const fyy = -h / 2 + 62 + (rar === "Ancient" ? Math.sin(t * 2) * 3 : 0);
  /* glow behind fish */
  const glow = g.createRadialGradient(0, fyy + fh / 2, 4, 0, fyy + fh / 2, fw * 0.6);
  glow.addColorStop(0, hexA(rc.glow, rar === "Common" ? 0.10 : 0.34));
  glow.addColorStop(1, hexA(rc.glow, 0));
  g.fillStyle = glow;
  g.fillRect(-w / 2, fyy - 10, w, fh + 20);
  g.drawImage(sp.canvas, -fw / 2, fyy, fw, fh);
  g.restore();

  /* rarity word */
  text(g, rar.toUpperCase(), 0, -h / 2 + 40, {
    size: rar === "Legendary" || rar === "Ancient" ? 30 : 24,
    weight: "bold", col: rc.glow, align: "center", shadow: true,
  });
  /* name */
  text(g, sp.name, 0, h / 2 - 86, {
    size: 30, weight: "bold", col: "#f4fbfd", align: "center", shadow: true,
  });
  text(g, "added to your log", 0, h / 2 - 62, {
    size: 13, col: "#93aebc", align: "center",
  });

  /* skip prompt */
  if (G.revealT > 1.0) {
    g.globalAlpha = 0.5 + Math.sin(t * 5) * 0.35;
    text(g, "SPACE / button  →  cast again", 0, h / 2 - 34, {
      size: 13, col: "#cfe3ec", align: "center",
    });
    g.globalAlpha = 1;
  }
  g.restore();
}

function sparkleRing(g, cx, cy, radius, count, t, col, glow) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + t * 0.8;
    const rr2 = radius + Math.sin(t * 2 + i) * 10;
    const x = cx + Math.cos(a) * rr2;
    const y = cy + Math.sin(a) * rr2 * 0.7;
    const s = 2 + Math.abs(Math.sin(t * 3 + i * 1.7)) * 3;
    g.globalAlpha = 0.35 + Math.abs(Math.sin(t * 3 + i)) * 0.5;
    g.fillStyle = i % 2 ? col : glow;
    star(g, x, y, s);
  }
  g.globalAlpha = 1;
}
function star(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y - s); g.lineTo(x + s * 0.28, y - s * 0.28);
  g.lineTo(x + s, y); g.lineTo(x + s * 0.28, y + s * 0.28);
  g.lineTo(x, y + s); g.lineTo(x - s * 0.28, y + s * 0.28);
  g.lineTo(x - s, y); g.lineTo(x - s * 0.28, y - s * 0.28);
  g.closePath(); g.fill();
}
function drawCrown(g, x, y, s, t) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = "#f2c14e";
  g.strokeStyle = "#8a6410";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-16, 10); g.lineTo(-16, -6); g.lineTo(-8, 2); g.lineTo(0, -10);
  g.lineTo(8, 2); g.lineTo(16, -6); g.lineTo(16, 10); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = "#e0503f";
  for (const px of [-10, 0, 10]) { g.beginPath(); g.arc(px, 4, 2.2, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function drawRunes(g, x, y, w, h, t, col) {
  g.save();
  g.globalAlpha = 0.55 + Math.sin(t * 3) * 0.35;
  g.fillStyle = col;
  const marks = [[0.5, 0.04], [0.08, 0.5], [0.92, 0.5], [0.5, 0.96]];
  for (const [mx, my] of marks) {
    const px = x + w * mx, py = y + h * my;
    g.fillRect(px - 8, py - 2, 16, 3);
    g.fillRect(px - 2, py - 8, 3, 16);
  }
  g.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

/* ---- miss toast ---- */
function drawToast(g, G, t) {
  if (!G.message) return;
  const a = Math.min(1, G.messageT * 3, (G.messageLife - G.messageT) * 3);
  g.save();
  g.globalAlpha = Math.max(0, a);
  const cx = 640, cy = 250;
  g.fillStyle = "rgba(10,18,24,0.82)";
  rr(g, cx - 190, cy - 30, 380, 60, 12); g.fill();
  g.strokeStyle = "rgba(255,140,110,0.8)"; g.lineWidth = 2;
  rr(g, cx - 190, cy - 30, 380, 60, 12); g.stroke();
  text(g, G.message, cx, cy + 8, { size: 24, weight: "bold", col: "#ffd0b0", align: "center", shadow: true });
  g.restore();
}

/* ---- first-run instruction card ---- */
function drawIntro(g, G, t) {
  if (!G.intro) return;
  const a = G.introFade;
  const cx = 640, cy = 250;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = "rgba(8,16,22,0.86)";
  rr(g, cx - 330, cy - 92, 660, 184, 16); g.fill();
  g.strokeStyle = "rgba(160,210,230,0.55)"; g.lineWidth = 2;
  rr(g, cx - 330, cy - 92, 660, 184, 16); g.stroke();
  text(g, "WELCOME TO THE DOCK", cx, cy - 46, { size: 26, weight: "bold", col: "#f0f7fa", align: "center", shadow: true });
  text(g, "Cast your line into the bay and watch the bobber.", cx, cy - 10, { size: 16, col: "#cfe0e8", align: "center" });
  text(g, "When it dips, reel in fast for a catch!", cx, cy + 16, { size: 16, col: "#cfe0e8", align: "center" });
  const pulse = 0.6 + Math.sin(t * 5) * 0.4;
  g.globalAlpha = a * pulse;
  text(g, "SPACE  or  the CAST button", cx, cy + 58, { size: 17, weight: "bold", col: "#ffd27a", align: "center" });
  g.restore();
}

function drawUI(g, G, t) {
  g.clearRect(0, 0, UI.W, UI.H);
  if (G.phase === "reveal") drawReveal(g, G, t);
  if (G.phase === "bite") drawBiteCue(g, G, t);
  drawToast(g, G, t);
  drawPanel(g, G);
  drawLeft(g, G, t);
  drawLog(g, G, t);
  drawLegend(g, G, t);
  drawIntro(g, G, t);
}
