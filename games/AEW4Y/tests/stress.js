// Verify on-screen button, log cap (8, newest first), and repeated cycles.
const { launch } = require('./harness');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { browser, page, errors } = await launch();
  const state = () => page.evaluate(() => window.fishing.state);
  const log = () => page.evaluate(() => window.fishing.log);

  // The on-screen button must cast.
  await page.click('#action');
  console.log('button cast ->', await state());

  await page.evaluate(() => { window.fishing.pickRarity = () => 'Rare'; });

  let guard = 0;
  while ((await log()).length < 10 && guard++ < 600) {
    const s = await state();
    if (s === 'waiting') {
      await page.evaluate(() => { window.__TIDELINE__.G.waitDur = 0.05; });
      await sleep(40);
    } else if (s === 'ready') {
      await page.keyboard.press('Space');
      await sleep(40);
    } else if (s === 'bite') {
      await page.locator('#action').dispatchEvent('pointerdown');
      await sleep(40);
    } else {
      // reeling or reveal
      await sleep(50);
      if (await state() === 'reveal') { await page.keyboard.press('Space'); await sleep(40); }
    }
  }

  const l = await log();
  console.log('log length:', l.length, '(max 8 expected)');
  console.log('entries:', l.map(e => e.name + '/' + e.rarity).join(', '));

  // log must be a copy
  await page.evaluate(() => { window.fishing.log.push({ name: 'HACK', rarity: 'Ancient' }); });
  console.log('log copy safe:', (await log()).length === l.length);
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
