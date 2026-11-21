const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shot_intro.png' });

  // check interface
  const iface = await page.evaluate(() => ({
    hasFishing: !!window.fishing,
    hasPick: typeof window.fishing.pickRarity,
    state: window.fishing.state,
    logIsArray: Array.isArray(window.fishing.log),
    logLen: window.fishing.log.length,
    rareties: [0,0.2,0.44,0.46,0.6,0.69,0.71,0.8,0.86,0.9,0.94,0.97,0.985,0.999].map(u=>window.fishing.pickRarity(u)),
    scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight]
  }));
  console.log('IFACE', JSON.stringify(iface, null, 1));

  // force a legendary reveal to inspect art
  await page.evaluate(() => { window.fishing._force && window.fishing._force('force'); });
  await browser.close();
  console.log('ERRORS', errors);
})();
