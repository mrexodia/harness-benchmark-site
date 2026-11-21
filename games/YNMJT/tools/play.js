// Long play session: mix successful catches and deliberate misses.
const { chromium } = require('/usr/local/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.keyboard.press('Space'); // start + first cast

  const wait = ms => page.waitForTimeout(ms);
  const st = () => page.evaluate(() => window.fishing.state);
  const rarities = {};
  let catches = 0, misses = 0;

  for (let cycle = 0; cycle < 10; cycle++) {
    // wait for ready
    for (let i = 0; i < 500 && (await st()) !== 'ready'; i++) await wait(20);
    if ((await st()) !== 'ready') { await wait(500); }
    const wantCatch = cycle % 3 !== 2; // every 3rd is a miss
    await page.keyboard.press('Space');
    const t0 = Date.now();
    let handled = false;
    for (let i = 0; i < 1000; i++) {
      const s = await st();
      if (s === 'bite' && !handled) {
        handled = true;
        if (wantCatch) { await page.click('#hit'); }
      }
      if (s === 'ready' && i > 10) break;
      await wait(15);
    }
    const dur = Date.now() - t0;
    if (wantCatch) {
      catches++;
      const last = await page.evaluate(() => window.fishing.log[0]);
      rarities[last.rarity] = (rarities[last.rarity] || 0) + 1;
      process.stdout.write(`cycle ${cycle}: CATCH ${last.rarity} - ${last.name} (${dur}ms)\n`);
    } else {
      misses++;
      process.stdout.write(`cycle ${cycle}: miss (${dur}ms)\n`);
    }
  }

  const log = await page.evaluate(() => window.fishing.log);
  console.log('\ncatches=' + catches + ' misses=' + misses + ' log=' + log.length);
  console.log('rarities=' + JSON.stringify(rarities));
  console.log('errors=' + (errors.length ? errors.join(' | ') : 'none'));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
