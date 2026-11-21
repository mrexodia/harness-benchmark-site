const { chromium } = require('/usr/local/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => ({
    state: window.fishing && window.fishing.state,
    logLen: window.fishing && window.fishing.log.length,
    canvas: (() => { const c = document.getElementById('game'); return { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight }; })(),
  }));
  console.log(JSON.stringify(info));
  await page.screenshot({ path: '/tmp/shot_ready.png' });
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
