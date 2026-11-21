const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const state = () => page.evaluate(() => window.fishing.state);
  const log = () => page.evaluate(() => window.fishing.log.map(e => e.name + '/' + e.rarity));
  const press = () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })));
  const clickCast = () => page.evaluate(() => document.getElementById('castBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  async function waitFor(s, ms = 6000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await state() === s) return true; await sleep(40); }
    return false;
  }

  const results = [];
  const ok = (name, cond) => results.push((cond ? 'PASS ' : 'FAIL ') + name);

  // pickRarity boundaries / purity
  const pr = await page.evaluate(() => {
    const f = window.fishing.pickRarity;
    const cases = [0, 0.4499, 0.45, 0.6999, 0.70, 0.8499, 0.85, 0.9299, 0.93, 0.9799, 0.98, 0.9999];
    const before = window.fishing.state;
    const out = cases.map(f);
    return { out, stateUnchanged: window.fishing.state === before };
  });
  ok('pickRarity mapping', JSON.stringify(pr.out) === JSON.stringify(
    ['Common','Common','Uncommon','Uncommon','Rare','Rare','Epic','Epic','Legendary','Legendary','Ancient','Ancient']));
  ok('pickRarity is pure (no state change)', pr.stateUnchanged);

  // Full successful cycle
  ok('starts ready', await state() === 'ready');
  await press();
  ok('space -> waiting', await state() === 'waiting');
  ok('reaches bite', await waitFor('bite', 5000));
  await page.screenshot({ path: '/tmp/shot_bite.png' });
  await press();
  ok('press during bite -> reeling', await state() === 'reeling');
  // spam presses should not duplicate
  for (let i = 0; i < 6; i++) await press();
  ok('reaches reveal', await waitFor('reveal', 4000));
  await page.screenshot({ path: '/tmp/shot_reveal.png' });
  const l1 = await log();
  ok('exactly one log entry after spam', l1.length === 1);
  ok('reaches ready after reveal', await waitFor('ready', 5000));
  const rc = await page.evaluate(() => { const g = window.__game; return { pending: g.pending }; });
  ok('pending cleared after reveal', rc.pending === null);

  // Miss cycle
  const before = (await log()).length;
  await press();
  ok('cast again -> waiting', await state() === 'waiting');
  ok('reaches bite (miss)', await waitFor('bite', 5000));
  ok('miss returns ready', await waitFor('ready', 4000));
  const after = (await log()).length;
  ok('miss adds no log entry', after === before);

  // Override pickRarity -> outcome must change
  await page.evaluate(() => { window.__orig = window.fishing.pickRarity; window.fishing.pickRarity = () => 'Ancient'; });
  await press();
  await waitFor('bite', 5000);
  await press();
  await waitFor('reveal', 4000);
  const forced = await page.evaluate(() => ({ rarity: window.__game.pending.rarity, name: window.__game.pending.name }));
  ok('overridden pickRarity changes outcome', forced.rarity === 'Ancient');
  await page.screenshot({ path: '/tmp/shot_ancient.png' });
  await page.evaluate(() => { window.fishing.pickRarity = window.__orig; });
  await waitFor('ready', 5000);

  // log newest first
  const names = await log();
  ok('log newest first & grows', names.length === 2 && names[0].indexOf('Ancient') >= 0);

  // duplicate cast while waiting does nothing
  await press();
  await sleep(200);
  await press(); await press();
  ok('no duplicate cast while waiting', await state() === 'waiting');

  // pause while hidden
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); });
  const s1 = await page.evaluate(() => { const g = window.__game; return { t: g.t, phase: g.phase }; });
  await sleep(1500);
  const s2 = await page.evaluate(() => { const g = window.__game; return { t: g.t, phase: g.phase }; });
  ok('timers paused while hidden', Math.abs(s2.t - s1.t) < 0.05 && s2.phase === s1.phase);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });

  console.log(results.join('\n'));
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await browser.close();
  if (results.some(r => r.startsWith('FAIL')) || errs.length) process.exit(1);
})();
