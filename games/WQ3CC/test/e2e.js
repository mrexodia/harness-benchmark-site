const { chromium } = require('/usr/local/lib/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  await page.screenshot({ path: '/tmp/e2e_ready.png' });

  const state = () => page.evaluate(() => window.fishing.state);
  async function castOnce(forceRarity) {
    await page.evaluate(r => { window.fishing.pickRarity = () => r; }, forceRarity);
    // press through reveal to ready
    for (let i = 0; i < 60; i++) {
      const s = await state();
      if (s === 'ready') break;
      if (s === 'reveal') { await sleep(160); await page.keyboard.press('Space'); }
      await sleep(40);
    }
    await sleep(160);
    await page.evaluate(() => { window.fishing.__debug.G.lastInput = 0; });
    await page.keyboard.press('Space');
    await page.evaluate(() => { const G = window.fishing.__debug.G; G.castDur = 0.05; G.wait = 0.04; });
    // reach bite
    for (let i = 0; i < 300; i++) {
      const s = await state();
      if (s === 'bite') break;
      await page.evaluate(() => { const G = window.fishing.__debug.G; if (G.phase === 'waiting' && G.landed) G.wait = 0.01; });
      await sleep(10);
    }
    await page.evaluate(() => { window.fishing.__debug.G.lastInput = 0; });
    await page.keyboard.press('Space');
    for (let i = 0; i < 200; i++) {
      const s = await state();
      if (s === 'reveal') break;
      await sleep(10);
    }
    return page.evaluate(() => window.fishing.log[0]);
  }

  const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  const got = [];
  for (const r of rarities) {
    const e = await castOnce(r);
    got.push(e.rarity + ':' + e.name);
    if (r === 'Ancient') await page.screenshot({ path: '/tmp/e2e_ancient.png' });
    if (r === 'Legendary') await page.screenshot({ path: '/tmp/e2e_legendary.png' });
  }
  console.log('catches:', JSON.stringify(got));

  const api = await page.evaluate(() => {
    const f = window.fishing;
    return {
      keys: Object.keys(f),
      logLen: f.log.length,
      newest: f.log[0],
      oldest: f.log[f.log.length - 1],
      state: f.state,
      hasStateGetter: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), 'state') !== undefined || typeof f.state === 'string',
    };
  });
  console.log('api:', JSON.stringify(api));

  // valid phases only
  const valid = await page.evaluate(async () => {
    const phases = new Set(['ready', 'waiting', 'bite', 'reeling', 'reveal']);
    for (let i = 0; i < 40; i++) {
      if (!phases.has(window.fishing.state)) return false;
      await new Promise(r => setTimeout(r, 5));
    }
    return true;
  });
  console.log('all states valid:', valid);

  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
