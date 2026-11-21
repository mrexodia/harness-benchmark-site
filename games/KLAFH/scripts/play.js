const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/tmp/shot-intro.png" });

  // cast
  await page.keyboard.press("Space");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/shot-waiting.png" });
  console.log("state after cast:", await page.evaluate(() => window.fishing.state));

  // wait for bite
  let st = "waiting";
  for (let i = 0; i < 60 && st !== "bite"; i++) {
    await page.waitForTimeout(150);
    st = await page.evaluate(() => window.fishing.state);
  }
  console.log("state at bite:", st);
  await page.waitForTimeout(120);
  await page.screenshot({ path: "/tmp/shot-bite.png" });

  // reel
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/shot-reeling.png" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/shot-reveal.png" });
  console.log("state reveal:", await page.evaluate(() => window.fishing.state));
  console.log("log:", JSON.stringify(await page.evaluate(() => window.fishing.log)));

  console.log("errors:", errors);
  await browser.close();
})();
