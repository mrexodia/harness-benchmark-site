const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const state = () => page.evaluate(() => window.fishing.state);
  const results = [];
  for (let n = 0; n < 8; n++) {
    for (let i = 0; i < 80 && (await state()) !== "ready"; i++) await page.waitForTimeout(60);
    const t0 = Date.now();
    await page.keyboard.press("Space");
    let s = await state(), s2 = s;
    while (s2 !== "bite") { await page.waitForTimeout(30); s2 = await state(); }
    await page.keyboard.press("Space");            // reel immediately at bite
    while ((await state()) !== "reveal") await page.waitForTimeout(30);
    const tReveal = Date.now() - t0;
    // let reveal auto-advance
    while ((await state()) !== "ready") await page.waitForTimeout(30);
    results.push({ toReveal: tReveal, full: Date.now() - t0 });
  }
  console.log("catch->reveal ms:", results.map(r => r.toReveal).join(", "));
  console.log("full cycle (auto reveal) ms:", results.map(r => r.full).join(", "));
  const full = results.map(r => r.full);
  console.log("min/max full:", Math.min(...full), Math.max(...full));
  await browser.close();
})();
