// test/logic.mjs — end-to-end logic checks.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

const S = () => page.evaluate(() => window.fishing.state);
const L = () => page.evaluate(() => window.fishing.log.map((e) => e.name + '/' + e.rarity));
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

ok('starts ready', (await S()) === 'ready');

// ---- full successful cycle, timing ---------------------------------------
const t0 = Date.now();
await page.keyboard.press('Space');
ok('cast -> waiting', (await S()) === 'waiting');
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
ok('bit after wait', (await S()) === 'bite');
await page.keyboard.press('Space');
ok('reel -> reeling', (await S()) === 'reeling');
await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 3000 });
const cycleMs = Date.now() - t0;
ok('cycle within 5-9s', cycleMs >= 4500 && cycleMs <= 9500, `(${cycleMs}ms)`);
let log = await L();
ok('one catch logged', log.length === 1, JSON.stringify(log));

// repeated space during reveal grace should not break anything
await page.keyboard.press('Space');
await page.keyboard.press('Space');
ok('reveal guards early continue', (await S()) === 'reveal');
await page.waitForTimeout(500);
await page.keyboard.press('Space');
ok('continue -> ready', (await S()) === 'ready');

// ---- no overlapping casts from spam during waiting ------------------------
await page.keyboard.press('Space');
for (let i = 0; i < 12; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(20); }
ok('spam during waiting stays waiting', (await S()) === 'waiting');
// spam during bite must produce exactly one catch
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
for (let i = 0; i < 10; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(15); }
ok('spam during bite -> single reeling', (await S()) === 'reeling');
await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 3000 });
await page.waitForTimeout(400);
await page.keyboard.press('Space');
log = await L();
ok('no duplicate catch from spam', log.length === 2, JSON.stringify(log));

// ---- miss: let the window expire ------------------------------------------
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 4000 });
log = await L();
ok('miss returns to ready', (await S()) === 'ready');
ok('miss not logged', log.length === 2, JSON.stringify(log));

// ---- pickRarity override changes outcome -----------------------------------
const originalPick = await page.evaluate(() => {
  window.__origPick = window.fishing.pickRarity;
  window.fishing.pickRarity = () => 'Ancient';
  return true;
});
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 3000 });
log = await L();
ok('override forces Ancient', log[0].endsWith('/Ancient'), JSON.stringify(log[0]));
await page.waitForTimeout(400);
await page.keyboard.press('Space');

// ---- rarity endpoints are exact and pure -----------------------------------
await page.evaluate(() => { window.fishing.pickRarity = window.__origPick || window.fishing.pickRarity; });
const dist = await page.evaluate(() => {
  const out = {};
  for (let i = 0; i < 100000; i++) {
    const r = window.fishing.pickRarity(i / 100000);
    out[r] = (out[r] || 0) + 1;
  }
  return out;
});
ok('rarity distribution ~', Math.abs(dist.Common / 1000 - 45) < 1 && Math.abs(dist.Ancient / 1000 - 2) < 1, JSON.stringify(dist));

// purity: same input -> same output, and no state changes
const pure = await page.evaluate(() => {
  const a = window.fishing.pickRarity(0.5);
  const b = window.fishing.pickRarity(0.5);
  return a === b && a === 'Uncommon';
});
ok('pickRarity pure', pure);

// ---- pausing while hidden --------------------------------------------------
await page.waitForTimeout(200);
await page.keyboard.press('Space'); // cast
await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 3000 });
// If timers did NOT pause, 7s hidden would outlast wait(<=3.9s)+bite(1.5s),
// causing a bite then a miss, ending back at 'ready'. Pausing must keep it
// in 'waiting'.
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); });
await page.waitForTimeout(7000);
const hiddenState = await page.evaluate(() => window.fishing.state);
ok('timers pause while hidden', hiddenState === 'waiting', hiddenState);
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });

console.log(results.join('\n'));
console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(failed.length ? `\n${failed.length} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(failed.length ? 1 : 0);
