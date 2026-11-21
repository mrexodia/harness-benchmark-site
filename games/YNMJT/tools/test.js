// End-to-end behavioural test for Stillwater Cove.
const { chromium } = require('/usr/local/lib/node_modules/playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const results = [];
  const ok = (name, cond, extra) => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

  // ---- interface ----
  const iface = await page.evaluate(() => ({
    hasFishing: !!window.fishing,
    state: window.fishing && window.fishing.state,
    pickType: typeof (window.fishing && window.fishing.pickRarity),
    logIsArray: Array.isArray(window.fishing && window.fishing.log)
  }));
  ok('window.fishing exists', iface.hasFishing);
  ok('state is a valid phase at start', iface.state === 'ready', iface.state);
  ok('pickRarity is a function', iface.pickType === 'function');
  ok('log is an array', iface.logIsArray);

  // ---- pickRarity purity + boundaries + odds ----
  const rar = await page.evaluate(() => {
    const names = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
    const bounds = [0, 0.449999, 0.45, 0.699999, 0.70, 0.849999, 0.85, 0.929999, 0.93, 0.979999, 0.98, 0.99999];
    const at = bounds.map(u => window.fishing.pickRarity(u));
    // purity
    const pure = window.fishing.pickRarity(0.3) === window.fishing.pickRarity(0.3);
    // distribution
    const counts = Object.fromEntries(names.map(n => [n, 0]));
    const N = 400000;
    for (let i = 0; i < N; i++) counts[window.fishing.pickRarity(Math.random())]++;
    return { at, pure, counts, N, names };
  });
  const expected = { Common: 0.45, Uncommon: 0.25, Rare: 0.15, Epic: 0.08, Legendary: 0.05, Ancient: 0.02 };
  const boundsOk = rar.at[0] === 'Common' && rar.at[1] === 'Common' && rar.at[2] === 'Uncommon' &&
    rar.at[3] === 'Uncommon' && rar.at[4] === 'Rare' && rar.at[5] === 'Rare' &&
    rar.at[6] === 'Epic' && rar.at[7] === 'Epic' && rar.at[8] === 'Legendary' &&
    rar.at[9] === 'Legendary' && rar.at[10] === 'Ancient' && rar.at[11] === 'Ancient';
  // spot: 0.46 Uncommon, 0.71 Rare, 0.86 Epic, 0.94 Legendary, 0.99 Ancient
  ok('pickRarity is pure', rar.pure);
  ok('pickRarity boundary values correct', boundsOk, JSON.stringify(rar.at));
  let oddsOk = true, oddsMsg = [];
  for (const n of rar.names) {
    const got = rar.counts[n] / rar.N;
    oddsMsg.push(n + '=' + (got * 100).toFixed(2) + '%');
    if (Math.abs(got - expected[n]) > 0.006) oddsOk = false;
  }
  ok('pickRarity distribution ~ expected odds', oddsOk, oddsMsg.join(' '));

  // ---- helper to drive ----
  async function stateNow() { return page.evaluate(() => window.fishing.state); }
  async function logLen() { return page.evaluate(() => window.fishing.log.length); }

  // ---- full successful cycle timing ----
  await page.keyboard.press('Space'); // dismiss start -> cast
  const t0 = Date.now();
  let sawBite = false, reeled = false;
  let cycleState = await stateNow();
  for (let i = 0; i < 600; i++) {
    const st = await stateNow();
    if (st === 'bite') {
      sawBite = true;
      await page.keyboard.press('Space');
      reeled = true;
      break;
    }
    if (st === 'ready' && i > 5) break; // missed somehow
    await page.waitForTimeout(25);
  }
  // wait for reveal then auto back to ready
  let revealSeen = false;
  for (let i = 0; i < 600; i++) {
    const st = await stateNow();
    if (st === 'reveal') revealSeen = true;
    if (st === 'ready' && revealSeen) break;
    await page.waitForTimeout(25);
  }
  const cycleMs = Date.now() - t0;
  ok('a bite occurred', sawBite);
  ok('caught and reached reveal', revealSeen);
  ok('full successful cycle ~5-9s', cycleMs >= 4500 && cycleMs <= 10000, cycleMs + 'ms');
  ok('log has exactly 1 after first catch', (await logLen()) === 1);

  // ---- multiple catches & no duplicates from key spam ----
  let catches = await logLen();
  let spamErrors = 0;
  for (let c = 0; c < 4; c++) {
    await page.waitForTimeout(50);
    for (let i = 0; i < 300 && (await stateNow()) !== 'ready'; i++) await page.waitForTimeout(20);
    const before = await logLen();
    await page.keyboard.press('Space'); // cast
    let done = false;
    for (let i = 0; i < 4000 && !done; i++) {
      const st = await stateNow();
      if (st === 'waiting') {
        // spamming during the wait must be ignored (no recast / no duplicate)
        if (i % 5 === 0) await page.keyboard.press('Space');
      } else if (st === 'bite') {
        for (let k = 0; k < 6; k++) await page.keyboard.press('Space');
      } else if (st === 'reveal') {
        done = true;
      } else if (st === 'ready') {
        // could be a missed bite; stop this cycle
        done = true;
      }
      await page.waitForTimeout(8);
    }
    // let reveal auto-advance back to ready
    for (let i = 0; i < 400; i++) { const st = await stateNow(); if (st === 'ready') break; await page.waitForTimeout(20); }
    const after = await logLen();
    if (after - before !== 1) spamErrors++;
    catches = after;
  }
  ok('exactly one log entry per successful bite (no duplicates)', spamErrors === 0, 'bad cycles=' + spamErrors);
  ok('log grew by 4 more catches', catches >= 5, 'total=' + catches);

  // ---- miss handling (no log entry) ----
  for (let i = 0; i < 400 && (await stateNow()) !== 'ready'; i++) await page.waitForTimeout(20);
  // press space until a new bite occurs, then do nothing
  const beforeMiss = await logLen();
  await page.evaluate(() => { window.__missTest = true; });
  // cast (if ready)
  await page.keyboard.press('Space');
  let missed = false;
  for (let i = 0; i < 800; i++) {
    const st = await stateNow();
    if (st === 'bite') { missed = true; /* do nothing */ }
    if (missed && st === 'ready') break;
    await page.waitForTimeout(20);
  }
  const afterMiss = await logLen();
  ok('bite missed returns to ready', missed);
  ok('miss is not logged', afterMiss === beforeMiss, beforeMiss + ' -> ' + afterMiss);

  // ---- document.hidden pauses timers ----
  // prepare ready then cast, then hide while waiting
  for (let i = 0; i < 400 && (await stateNow()) !== 'ready'; i++) await page.waitForTimeout(20);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const stBeforeHide = await stateNow();
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
  await page.waitForTimeout(4000);
  const stAfterHide = await stateNow();
  const hiddenFrozen = stBeforeHide === 'waiting' && stAfterHide === 'waiting';
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
  // now proceed to bite
  let resumed = false;
  for (let i = 0; i < 600; i++) { if ((await stateNow()) === 'bite') { resumed = true; break; } await page.waitForTimeout(20); }
  ok('timers pause while document.hidden', hiddenFrozen, stBeforeHide + ' -> ' + stAfterHide);
  ok('game resumes after unhide', resumed);
  await page.keyboard.press('Space'); // reel to clean up
  for (let i = 0; i < 400 && (await stateNow()) !== 'ready'; i++) await page.waitForTimeout(20);

  // ---- on-screen button works for both actions ----
  for (let i = 0; i < 400 && (await stateNow()) !== 'ready'; i++) await page.waitForTimeout(20);
  const beforeBtn = await logLen();
  await page.click('#hit');
  await page.waitForTimeout(120);
  const afterClickState = await stateNow();
  ok('clicking the on-screen button casts', afterClickState === 'waiting' || afterClickState === 'bite', afterClickState);
  let btnCaught = false;
  for (let i = 0; i < 900; i++) {
    const st = await stateNow();
    if (st === 'bite') await page.click('#hit');
    if (st === 'reveal') { btnCaught = true; break; }
    await page.waitForTimeout(20);
  }
  for (let i = 0; i < 400 && (await stateNow()) !== 'ready'; i++) await page.waitForTimeout(20);
  const afterBtn = await logLen();
  ok('clicking the on-screen button reels in a catch', btnCaught && afterBtn === beforeBtn + 1, beforeBtn + '->' + afterBtn);

  // ---- no network beyond the local static server ----
  const external = reqs.filter(u => !/^http:\/\/127\.0\.0\.1:8000\//.test(u) && !/^data:/.test(u));
  ok('no external network requests', external.length === 0, external.join(' | '));

  // ---- replace pickRarity changes outcome ----
  const forced = await page.evaluate(async () => {
    window.fishing.pickRarity = () => 'Ancient';
    return true;
  });
  // force a catch via a hook: monkeypatch Math.random not needed; drive
  await page.keyboard.press('Space');
  let gotAncient = false;
  for (let i = 0; i < 900; i++) {
    const st = await stateNow();
    if (st === 'bite') await page.keyboard.press('Space');
    if (st === 'reveal') { gotAncient = true; break; }
    await page.waitForTimeout(20);
  }
  const lastLog = await page.evaluate(() => window.fishing.log[0]);
  ok('replacing pickRarity changes the catch rarity', gotAncient && lastLog && lastLog.rarity === 'Ancient', JSON.stringify(lastLog));

  ok('no runtime errors', errors.length === 0, errors.join(' | '));

  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL'));
  console.log('\n' + (failed.length ? failed.length + ' FAILURES' : 'ALL TESTS PASSED'));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
