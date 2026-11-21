// Screenshot helper for manual visual inspection.
const { chromium } = require('/usr/local/lib/node_modules/playwright');

(async () => {
  const args = process.argv.slice(2);
  const outdir = args[0] || '/tmp/shots';
  const fs = require('fs');
  fs.mkdirSync(outdir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  await page.screenshot({ path: outdir + '/01-start.png' });

  // begin
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await page.screenshot({ path: outdir + '/02-cast.png' });

  // poll states, capturing waiting + bite + reveal
  const seen = {};
  const snaps = { waiting: '/03-waiting.png', bite: '/04-bite.png' };
  for (let i = 0; i < 140; i++) {
    const st = await page.evaluate(() => window.fishing.state);
    if (snaps[st] && !seen[st]) {
      seen[st] = true;
      await page.screenshot({ path: outdir + snaps[st] });
    }
    if (st === 'bite' && !seen['caught']) {
      seen['caught'] = true;
      await page.keyboard.press('Space');
    }
    if (st === 'reveal' && !seen['reveal']) {
      seen['reveal'] = true;
      await page.screenshot({ path: outdir + '/05-reveal.png' });
      break;
    }
    await page.waitForTimeout(50);
  }

  const state = await page.evaluate(() => window.fishing.state);
  const log = await page.evaluate(() => window.fishing.log);
  console.log('final state:', state);
  console.log('log:', JSON.stringify(log));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
