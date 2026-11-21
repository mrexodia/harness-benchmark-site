const { chromium } = require("playwright");

function assert(c, m) { if (!c) { console.error("FAIL: " + m); process.exitCode = 1; } else console.log("ok   " + m); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  // block any network beyond localhost
  await page.route("**/*", r => r.request().url().includes("127.0.0.1") ? r.continue() : r.abort());
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const state = () => page.evaluate(() => window.fishing.state);
  assert(await state() === "ready", "starts in ready");
  assert(await page.evaluate(() => typeof window.fishing.pickRarity === "function"), "pickRarity is a function");
  assert(await page.evaluate(() => Array.isArray(window.fishing.log)), "log is an array");

  // ---- pickRarity boundaries & exact odds ----
  const bounds = [
    [0, "Common"], [0.4499, "Common"],
    [0.45, "Uncommon"], [0.6999, "Uncommon"],
    [0.70, "Rare"], [0.8499, "Rare"],
    [0.85, "Epic"], [0.9299, "Epic"],
    [0.93, "Legendary"], [0.9799, "Legendary"],
    [0.98, "Ancient"], [0.9999, "Ancient"],
  ];
  let ok = true;
  for (const [u, r] of bounds) {
    const got = await page.evaluate(u => window.fishing.pickRarity(u), u);
    if (got !== r) { ok = false; console.error("  pickRarity(" + u + ") = " + got + " expected " + r); }
  }
  assert(ok, "pickRarity matches exact cumulative odds at boundaries");

  // distribution sanity
  const dist = await page.evaluate(() => {
    const c = {};
    for (let i = 0; i < 200000; i++) { const r = window.fishing.pickRarity(Math.random()); c[r] = (c[r] || 0) + 1; }
    return c;
  });
  const exp = { Common: .45, Uncommon: .25, Rare: .15, Epic: .08, Legendary: .05, Ancient: .02 };
  let distOk = true;
  for (const k in exp) { const got = dist[k] / 200000; if (Math.abs(got - exp[k]) > 0.01) { distOk = false; console.error("  " + k + " " + got); } }
  assert(distOk, "empirical distribution matches odds");

  // ---- helper: play one full successful cycle ----
  async function catchOne() {
    const before = await page.evaluate(() => window.fishing.log.length);
    // ensure ready
    for (let i = 0; i < 60 && (await state()) !== "ready"; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(150); }
    await page.keyboard.press("Space");
    let s = await state();
    for (let i = 0; i < 100 && s !== "bite"; i++) { await page.waitForTimeout(100); s = await state(); }
    if (s !== "bite") return { ok: false, why: "never bit", s };
    await page.keyboard.press("Space");
    for (let i = 0; i < 60 && (await state()) !== "reveal"; i++) await page.waitForTimeout(100);
    const after = await page.evaluate(() => window.fishing.log.length);
    const entry = await page.evaluate(() => window.fishing.log[0]);
    return { ok: true, before, after, entry, atReveal: await state() };
  }

  const c1 = await catchOne();
  assert(c1.ok && c1.after === c1.before + 1, "successful catch logs exactly one entry");
  assert(c1.entry && c1.entry.name && c1.entry.rarity, "log entry has name and rarity: " + JSON.stringify(c1.entry));

  // repeated presses during reel/reveal must not duplicate
  const before = await page.evaluate(() => window.fishing.log.length);
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(40); }
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.fishing.log.length);
  assert(after === before, "spamming space during reveal doesn't duplicate catches");

  // ---- miss path ----
  for (let i = 0; i < 60 && (await state()) !== "ready"; i++) await page.waitForTimeout(100);
  const missBefore = await page.evaluate(() => window.fishing.log.length);
  await page.keyboard.press("Space");
  let s = await state();
  for (let i = 0; i < 100 && s !== "bite"; i++) { await page.waitForTimeout(100); s = await state(); }
  assert(s === "bite", "reached bite for miss test");
  // do NOT press, wait out the window
  for (let i = 0; i < 40 && s === "bite"; i++) { await page.waitForTimeout(100); s = await state(); }
  assert(s === "ready", "missing the window returns to ready");
  const missAfter = await page.evaluate(() => window.fishing.log.length);
  assert(missAfter === missBefore, "miss is not logged");

  // ---- all rarities overridden through the public function ----
  for (const rar of ["Ancient", "Legendary", "Common"]) {
    await page.evaluate(r => { window.fishing.pickRarity = () => r; }, rar);
    for (let i = 0; i < 60 && (await state()) !== "ready"; i++) await page.waitForTimeout(100);
    await page.keyboard.press("Space");
    let st = await state();
    for (let i = 0; i < 100 && st !== "bite"; i++) { await page.waitForTimeout(100); st = await state(); }
    await page.keyboard.press("Space");
    for (let i = 0; i < 60 && (await state()) !== "reveal"; i++) await page.waitForTimeout(100);
    const top = await page.evaluate(() => window.fishing.log[0]);
    assert(top.rarity === rar, "overridden pickRarity drives catch rarity (" + rar + " -> " + top.rarity + ")");
    // continue
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
  }

  // ---- full log is preserved (not just 8) ----
  for (let tries = 0; tries < 14 && (await page.evaluate(() => window.fishing.log.length)) < 10; tries++) {
    await catchOne();
  }
  const total = await page.evaluate(() => window.fishing.log.length);
  assert(total >= 10, "log keeps every session catch (n=" + total + ")");
  const shapesOk = await page.evaluate(() => window.fishing.log.every(e => typeof e.name === "string" && typeof e.rarity === "string"));
  assert(shapesOk, "every log entry has string name + rarity");

  // ---- pause when hidden ----
  const beforeHidden = await page.evaluate(() => window.fishing.state);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForTimeout(1600);
  const afterHiddenState = await page.evaluate(() => window.fishing.state);
  const afterHiddenLog = await page.evaluate(() => window.fishing.log.length);
  assert(afterHiddenState === beforeHidden, "state frozen while document.hidden");
  assert(afterHiddenLog === total, "no catches while document.hidden");
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });

  // ---- button works ----
  for (let i = 0; i < 60 && (await state()) !== "ready"; i++) await page.waitForTimeout(100);
  await page.click("#actionBtn");
  await page.waitForTimeout(200);
  assert((await state()) === "waiting", "on-screen button casts the line");

  assert(errors.length === 0, "no console/page errors: " + JSON.stringify(errors));

  await browser.close();
})();
