const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  // start a cast, reach waiting
  await page.keyboard.press('Space');
  const s1 = await page.evaluate(() => window.fishing.state);
  // wait for waiting
  let t0 = Date.now();
  while (Date.now() - t0 < 3000) {
    if (await page.evaluate(() => window.fishing.state) === 'waiting') break;
    await page.waitForTimeout(30);
  }
  const progBefore = await page.evaluate(() => ({
    hidden: document.hidden,
    // sample the game clock indirectly via phaseT is internal; use a canvas pixel hash
    hash: (() => { const d = document.getElementById('game').getContext('2d').getImageData(0, 0, 320, 180).data; let h = 0; for (let i = 0; i < d.length; i += 997) h = (h * 31 + d[i]) >>> 0; return h; })()
  }));

  // simulate the tab becoming hidden (headless Chromium does not flip document.hidden)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(4000);
  const stateWhileHidden = await page.evaluate(() => ({ state: window.fishing.state, hidden: document.hidden }));

  // bring back
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  const progAfter = await page.evaluate(() => ({
    hidden: document.hidden,
    hash: (() => { const d = document.getElementById('game').getContext('2d').getImageData(0, 0, 320, 180).data; let h = 0; for (let i = 0; i < d.length; i += 997) h = (h * 31 + d[i]) >>> 0; return h; })()
  }));

  console.log(JSON.stringify({ s1, progBefore, stateWhileHidden, progAfter }, null, 1));
  await browser.close();
})();
