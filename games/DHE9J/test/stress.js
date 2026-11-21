const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  // cycle rarity deterministically through all tiers
  await page.evaluate(() => {
    const seq = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
    let i = 0;
    window.fishing.pickRarity = () => seq[(i++) % 6];
  });

  const start = Date.now();
  let catches = 0, misses = 0;
  for (let c = 0; c < 14; c++) {
    // wait ready
    let t0 = Date.now();
    while (await page.evaluate(() => window.fishing.state) !== 'ready') {
      if (Date.now() - t0 > 9000) throw new Error('stuck not ready');
      await page.waitForTimeout(30);
    }
    await page.keyboard.press('Space');
    // wait bite
    t0 = Date.now();
    let sawBite = false;
    while (Date.now() - t0 < 6000) {
      if (await page.evaluate(() => window.fishing.state) === 'bite') { sawBite = true; break; }
      await page.waitForTimeout(20);
    }
    if (sawBite && c % 4 !== 3) {
      await page.keyboard.press('Space');
      catches++;
    } else {
      misses++;
    }
    // wait for ready again
    t0 = Date.now();
    while (await page.evaluate(() => window.fishing.state) !== 'ready') {
      if (Date.now() - t0 > 9000) throw new Error('stuck after cycle');
      await page.waitForTimeout(30);
    }
  }
  const log = await page.evaluate(() => window.fishing.log);
  const shown = await page.evaluate(() => document.querySelectorAll('#log-list li').length);
  console.log(JSON.stringify({ catches, misses, totalLogged: log.length, shownInUI: shown, tiers: log.map(e => e.rarity), ms: Date.now() - start }, null, 1));
  console.log('ERRORS', errors);
  await browser.close();
})();
