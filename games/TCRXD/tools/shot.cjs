const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.fishing && window.fishing.state);
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/shot_ready.png' });
  console.log('state:', await page.evaluate(() => window.fishing.state));
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
