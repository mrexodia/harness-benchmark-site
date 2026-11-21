const { chromium } = require('playwright');

function assert(cond, msg) {
  if (!cond) { console.log('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('ok  : ' + msg);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  // --- interface shape ---
  const shape = await page.evaluate(() => ({
    has: typeof window.fishing === 'object',
    keys: Object.keys(window.fishing),
    state: window.fishing.state,
    log: window.fishing.log,
    prIsFn: typeof window.fishing.pickRarity === 'function'
  }));
  assert(shape.has, 'window.fishing exists');
  assert(shape.state === 'ready', 'initial state is ready (got ' + shape.state + ')');
  assert(Array.isArray(shape.log) && shape.log.length === 0, 'log starts empty');
  assert(shape.prIsFn, 'pickRarity is a function');

  // --- pickRarity boundaries ---
  const pr = await page.evaluate(() => {
    const f = window.fishing.pickRarity;
    const tests = [0, 0.44, 0.45, 0.69, 0.70, 0.84, 0.85, 0.92, 0.93, 0.97, 0.98, 0.999];
    return tests.map(u => f(u));
  });
  const expect = ['Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Rare', 'Epic', 'Epic', 'Legendary', 'Legendary', 'Ancient', 'Ancient'];
  assert(JSON.stringify(pr) === JSON.stringify(expect), 'pickRarity boundaries: ' + pr.join(','));

  // --- distribution sanity over 200k samples uses exact odds ---
  const dist = await page.evaluate(() => {
    const out = { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Ancient: 0 };
    for (let i = 0; i < 200000; i++) out[window.fishing.pickRarity(Math.random())]++;
    return out;
  });
  const pct = k => (100 * dist[k] / 200000).toFixed(1);
  console.log('     distribution:', Object.entries(dist).map(([k, v]) => k + '=' + pct(k) + '%').join(' '));
  assert(Math.abs(dist.Common / 2000 - 45) < 1.5, 'Common ~45%');
  assert(Math.abs(dist.Ancient / 2000 - 2) < 0.5, 'Ancient ~2%');

  // --- successful cycle ---
  await page.evaluate(() => { window.fishing.pickRarity = () => 'Rare'; });
  const t0 = Date.now();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 2000 });
  assert(true, 'cast -> waiting');
  // wait for bite, then press quickly
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
  assert(true, 'waiting -> bite');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'reeling', null, { timeout: 1000 });
  assert(true, 'bite -> reeling');
  await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 2000 });
  assert(true, 'reeling -> reveal');
  const afterCatch = await page.evaluate(() => ({ log: window.fishing.log }));
  assert(afterCatch.log.length === 1 && afterCatch.log[0].rarity === 'Rare', 'catch logged with forced rarity: ' + JSON.stringify(afterCatch.log));
  // dismiss and return
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 5000 });
  const elapsed = (Date.now() - t0) / 1000;
  console.log('     successful cycle took ' + elapsed.toFixed(2) + 's');
  assert(elapsed >= 2 && elapsed <= 10, 'cycle time plausible');

  // --- duplicate catch prevention: mash space during bite ---
  await page.evaluate(() => { window.fishing.pickRarity = () => 'Common'; });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
  for (let i = 0; i < 8; i++) await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  const dup = await page.evaluate(() => ({ state: window.fishing.state, log: window.fishing.log.length }));
  assert(dup.state === 'reeling' || dup.state === 'reveal', 'mashing during bite still enters reeling/reveal, got ' + dup.state);
  // finish
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 9000 });
  const logLen = await page.evaluate(() => window.fishing.log.length);
  assert(logLen === 2, 'exactly one new catch from mashing (log=' + logLen + ')');

  // --- miss path ---
  const before = await page.evaluate(() => window.fishing.log.length);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 4000 });
  const miss = await page.evaluate(() => ({ len: window.fishing.log.length, state: window.fishing.state }));
  assert(miss.len === before, 'miss does not log (log=' + miss.len + ')');
  assert(miss.state === 'ready', 'miss returns to ready');

  // --- recast works after miss ---
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 2000 });
  assert(true, 'can cast again after miss');
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 9000 });

  // --- log capped at 8, newest first ---
  const capped = await page.evaluate(() => {
    // drive 9 guaranteed catches through the public state machine
    return new Promise(resolve => {
      window.fishing.pickRarity = () => 'Uncommon';
      let count = 0;
      const tick = setInterval(() => {
        const s = window.fishing.state;
        if (s === 'ready' && count < 9) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
          count++;
        } else if (s === 'bite') {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        }
        if (count >= 9) {
          clearInterval(tick);
          resolve({ len: window.fishing.log.length, first: window.fishing.log[0] });
        }
      }, 60);
    });
  });
  assert(capped.len === 8, 'log capped at 8 (got ' + capped.len + ')');

  // --- pickRarity called through the object (replacement works) ---
  const replaced = await page.evaluate(() => {
    let called = 0;
    window.fishing.pickRarity = function (u) { called++; return 'Ancient'; };
    return { called, fn: typeof window.fishing.pickRarity };
  });
  assert(replaced.fn === 'function', 'pickRarity replaceable');

  // --- timers pause while hidden ---
  await page.evaluate(() => { window.fishing.pickRarity = window.fishing.pickRarity || (() => 'Common'); });
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 9000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // cast while "visible", then hide immediately after
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 2000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(6000);
  const hiddenState = await page.evaluate(() => window.fishing.state);
  assert(hiddenState === 'waiting', 'still waiting after 6s hidden (timers paused), got ' + hiddenState);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
  assert(true, 'timers resume after unhide and bite arrives');
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 6000 });

  // --- pointer / on-screen button works, and layout fits 1280x720 ---
  const layout = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
    iw: window.innerWidth, ih: window.innerHeight,
    cw: document.getElementById('screen').getBoundingClientRect().width,
    ch: document.getElementById('screen').getBoundingClientRect().height
  }));
  assert(layout.sw <= layout.iw && layout.sh <= layout.ih, 'no scrolling at 1280x720 (' + layout.sw + 'x' + layout.sh + ')');
  assert(Math.round(layout.cw) === 1280 && Math.round(layout.ch) === 720, 'canvas is 1280x720 (' + layout.cw + 'x' + layout.ch + ')');
  // click the on-screen button (bottom center)
  await page.mouse.click(640, 676);
  await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 2000 });
  assert(true, 'clicking the on-screen CAST button casts');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
  await page.mouse.click(640, 676);
  await page.waitForFunction(() => window.fishing.state === 'reeling' || window.fishing.state === 'reveal', null, { timeout: 1500 });
  assert(true, 'clicking during the bite window reels in');
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 9000 });

  if (errors.length) console.log('ERRORS:\n' + errors.join('\n')); else console.log('no page errors');
  await browser.close();
})();
