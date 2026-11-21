// Reference game used to test the evaluator (and as a rating practice game).
// Deliberately small; it is not a contender. BUGS toggles known faults so the
// evaluator's failure paths can be exercised (see fixtures/make-broken.sh).
const BUGS = { wrongOdds: true, ignoreHook: true, noHiddenPause: true, doubleCatch: true, externalFetch: true, audio: true };

const W = 320, H = 180;
const cv = document.getElementById("scene");
const g = cv.getContext("2d");
g.imageSmoothingEnabled = false;

const TIERS = [
  ["Common", 0.45, "#c8c8b4", "Mudfin Perch"],
  ["Uncommon", 0.25, "#7ad37a", "Reedback Dace"],
  ["Rare", 0.15, "#5aa9ff", "Glassgill Trout"],
  ["Epic", 0.08, "#c07aff", "Ember Koi"],
  ["Legendary", 0.05, "#ffc94a", "Sunscale Pike"],
  ["Ancient", 0.02, "#7af0e0", "Tidewyrm Elder"],
];

function pickRarity(u) {
  let acc = 0;
  const odds = BUGS.wrongOdds ? [0.5, 0.2, 0.15, 0.08, 0.05, 0.02] : TIERS.map((t) => t[1]);
  for (let i = 0; i < TIERS.length; i++) {
    acc += odds[i];
    if (u < acc) return TIERS[i][0];
  }
  return TIERS[TIERS.length - 1][0];
}

const fishing = { state: "ready", pickRarity, log: [] };
window.fishing = fishing;

let t = 0, phaseT = 0, waitFor = 0, caught = null, paused = false;
const setState = (s) => { fishing.state = s; phaseT = 0; };

function action() {
  if (fishing.state === "ready") { setState("waiting"); waitFor = 1.5 + Math.random() * 2; }
  else if (fishing.state === "bite") {
    const rarity = BUGS.ignoreHook ? pickRarity(Math.random()) : window.fishing.pickRarity(Math.random());
    const tier = TIERS.find((x) => x[0] === rarity) || TIERS[0];
    caught = { name: tier[3], rarity: tier[0], color: tier[2] };
    fishing.log.unshift({ name: caught.name, rarity: caught.rarity });
    if (BUGS.doubleCatch) { fishing.log.unshift({ name: caught.name, rarity: caught.rarity }); }
    setState("reeling");
    renderLog();
  }
}

addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); if (!e.repeat) action(); } });
document.getElementById("act").addEventListener("click", (e) => { e.currentTarget.blur(); action(); });
document.addEventListener("visibilitychange", () => { paused = BUGS.noHiddenPause ? false : document.hidden; });
if (BUGS.audio) addEventListener("keydown", () => { try { new AudioContext(); } catch {} }, { once: true });
if (BUGS.externalFetch) fetch("http://example.com/ping").catch(() => {});

function update(dt) {
  t += dt;
  if (paused) return;
  phaseT += dt;
  const s = fishing.state;
  if (s === "waiting" && phaseT > waitFor) setState("bite");
  else if (s === "bite" && phaseT > 1.4) setState("ready");
  else if (s === "reeling" && phaseT > 0.8) setState("reveal");
  else if (s === "reveal" && phaseT > 2.2) setState("ready");
  document.getElementById("act").textContent = s === "bite" ? "Reel!" : s === "ready" ? "Cast" : "…";
}

function px(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); }

function draw() {
  px(0, 0, W, 70, "#9fd6e8");
  px(0, 70, W, 110, "#2f7ea8");
  for (let i = 0; i < 40; i++) {
    const x = (i * 37 + Math.floor(t * 8)) % W, y = 80 + (i * 23) % 95;
    px(x, y, 6, 1, "#5fb0d4");
  }
  px(0, 120, 110, 60, "#d9c08a");
  px(0, 150, 110, 30, "#4f8f3a");
  px(70, 110, 70, 8, "#7a5230");
  px(74, 118, 3, 20, "#5a3a20"); px(130, 118, 3, 20, "#5a3a20");
  px(118, 92, 8, 18, "#3d4f7a"); px(119, 86, 6, 6, "#f1c79a"); px(118, 84, 8, 3, "#b33");
  const s = fishing.state;
  if (s !== "ready") {
    const bob = s === "bite" ? Math.sin(t * 30) * 2 : Math.sin(t * 3);
    g.strokeStyle = "#eee"; g.beginPath(); g.moveTo(126, 88); g.lineTo(200, 120 + bob); g.stroke();
    px(198, 118 + bob, 4, 4, s === "bite" ? "#ff3b3b" : "#f5f5f5");
    if (s === "bite") px(196, 108, 8, 6, "#ffef5a");
  }
  if ((s === "reeling" || s === "reveal") && caught) {
    const k = s === "reeling" ? Math.min(1, phaseT / 0.8) : 1;
    const fx = 200 - 60 * k, fy = 120 - 50 * k;
    if (s === "reveal") {
      px(100, 30, 120, 50, "#1d2238");
      const tierIdx = TIERS.findIndex((x) => x[0] === caught.rarity);
      for (let i = 0; i <= tierIdx; i++) px(106 + i * 6, 34, 4, 4, caught.color);
    }
    px(fx, fy, 14, 6, caught.color); px(fx + 14, fy + 1, 4, 4, caught.color);
  }
}

function renderLog() {
  document.getElementById("log").innerHTML = fishing.log.slice(0, 8).map((c) => `<li>${c.name} <b>${c.rarity}</b></li>`).join("");
}
document.getElementById("legend").textContent = TIERS.map((x) => `${x[0]} ${Math.round(x[1] * 100)}%`).join(" · ");

let last = performance.now();
function frame(now) {
  update(Math.min(0.1, (now - last) / 1000));
  last = now;
  draw();
  document.getElementById("reveal").textContent = fishing.state === "reveal" && caught ? `${caught.name} — ${caught.rarity}` : "";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
