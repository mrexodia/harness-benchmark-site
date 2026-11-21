const { chromium } = require('/usr/local/lib/node_modules/playwright');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const state = () => page.evaluate(() => window.fishing.state);

  // --- pickRarity purity / boundaries ---
  const pick = await page.evaluate(() => {
    const f = window.fishing.pickRarity;
    const tests = [0, 0.1, 0.4499, 0.45, 0.5, 0.6999, 0.70, 0.80, 0.8499, 0.85, 0.90, 0.9299,
      0.93, 0.95, 0.9799, 0.98, 0.99, 0.999999];
    return tests.map(u => [u, f(u)]);
  });
  console.log('pickRarity:', JSON.stringify(pick));

  // Distribution sanity: 200k samples
  const dist = await page.evaluate(() => {
    const c = { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Ancient: 0 };
    for (let i = 0; i < 200000; i++) c[window.fishing.pickRarity(Math.random())]++;
    return c;
  });
  console.log('distribution:', JSON.stringify(dist));

  // --- successful catch ---
  const t0 = Date.now();
  await page.keyboard.press('Space');
  let s = await state();
  console.log('after cast:', s);
  // wait for bite (poll)
  let sawBite = false;
  for (let i = 0; i < 200; i++) {
    s = await state();
    if (!sawBite && s === 'bite') { sawBite = true; console.log('BITE at', ((Date.now() - t0) / 1000).toFixed(2), 's'); break; }
    await sleep(40);
  }
  if (!sawBite) { console.log('!! never saw bite, state=', s); }
  // press after short reaction
  await sleep(250);
  await page.keyboard.press('Space');
  // wait for reveal
  for (let i = 0; i < 100; i++) {
    s = await state();
    if (s === 'reveal') break;
    await sleep(40);
  }
  const catchTime = ((Date.now() - t0) / 1000).toFixed(2);
  console.log('state after reel:', s, 'cycle time:', catchTime, 's');
  const log1 = await page.evaluate(() => window.fishing.log);
  console.log('log:', JSON.stringify(log1));

  // double-press guard: press twice quickly during reveal, should continue once
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await sleep(60);
  s = await state();
  console.log('after double continue:', s, '(should be ready/waiting)');

  // --- miss: cast, wait for bite, do not press ---
  // ensure ready (press through reveal if needed)
  for (let i = 0; i < 100; i++) {
    s = await state();
    if (s === 'ready' || s === 'waiting') break;
    if (s === 'reveal') await page.keyboard.press('Space');
    await sleep(50);
  }
  await sleep(220); // clear input debounce
  const beforeCast = await state();
  if (beforeCast !== 'waiting') await page.keyboard.press('Space');
  await sleep(80);
  console.log('miss cast state:', await state());
  for (let i = 0; i < 500; i++) {
    s = await state();
    if (s === 'bite') break;
    await sleep(30);
  }
  console.log('miss test saw state:', s);
  const logBeforeMiss = (await page.evaluate(() => window.fishing.log)).length;
  // wait out the window
  for (let i = 0; i < 200; i++) {
    s = await state();
    if (s === 'ready') break;
    await sleep(40);
  }
  const logAfterMiss = (await page.evaluate(() => window.fishing.log)).length;
  console.log('after miss state:', s, 'log unchanged:', logBeforeMiss === logAfterMiss);

  // --- override pickRarity changes outcome ---
  await page.evaluate(() => { window.fishing.pickRarity = () => 'Ancient'; });
  await page.keyboard.press('Space');
  for (let i = 0; i < 300; i++) {
    s = await state();
    if (s === 'bite') break;
    await sleep(30);
  }
  await page.keyboard.press('Space');
  for (let i = 0; i < 100; i++) {
    s = await state();
    if (s === 'reveal') break;
    await sleep(40);
  }
  const log2 = await page.evaluate(() => window.fishing.log);
  console.log('override log[0]:', JSON.stringify(log2[0]), '(should be Ancient)');

  // --- log order & length ---
  console.log('log length:', log2.length, 'newest first names:', JSON.stringify(log2.map(e => e.name).slice(0, 3)));

  // --- document.hidden pause test ---
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // force to waiting so we can time it
  await page.evaluate(() => { window.fishing.__debug.G.phase = 'ready'; });
  await page.keyboard.press('Space');
  const before = await page.evaluate(() => window.fishing.__debug.G.clock);
  await sleep(500);
  const after = await page.evaluate(() => window.fishing.__debug.G.clock);
  console.log('clock advanced while hidden:', (after - before).toFixed(3), '(should be ~0)');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
