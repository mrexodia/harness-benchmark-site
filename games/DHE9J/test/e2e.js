const { chromium } = require('playwright');

async function state(page) { return page.evaluate(() => window.fishing.state); }
async function waitState(page, target, timeout = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await state(page) === target) return Date.now() - t0;
    await page.waitForTimeout(40);
  }
  throw new Error('timeout waiting for ' + target + ' (now ' + await state(page) + ')');
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const results = {};

  // ---- successful cycle timing ----
  const cycleStart = Date.now();
  await page.keyboard.press('Space');
  const toWaiting = await waitState(page, 'waiting');
  const toBite = await waitState(page, 'bite');
  await page.keyboard.press('Space');
  const toReeling = await waitState(page, 'reeling');
  const toReveal = await waitState(page, 'reveal');
  // capture reveal pixel map
  await page.waitForTimeout(350);
  const revealInfo = await page.evaluate(() => {
    const c = document.getElementById('game');
    const d = c.getContext('2d').getImageData(0, 0, 320, 180).data;
    let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 90) lit++;
    return { lit, log: window.fishing.log.slice(), state: window.fishing.state,
      name: document.getElementById('reveal-name').textContent,
      rar: document.getElementById('reveal-rarity').textContent,
      hidden: document.getElementById('reveal').classList.contains('hidden') };
  });
  const toReady = await waitState(page, 'ready');
  const cycleMs = Date.now() - cycleStart;
  results.cycle = { toWaiting, toBite, toReeling, toReveal, toReady, cycleMs, revealInfo };

  // ---- miss cycle ----
  const before = await page.evaluate(() => window.fishing.log.length);
  await page.keyboard.press('Space');
  await waitState(page, 'waiting');
  await waitState(page, 'bite');
  await waitState(page, 'ready', 4000);   // never press; must return to ready
  const after = await page.evaluate(() => window.fishing.log.length);
  results.miss = { before, after, logged: after - before };

  // ---- deterministic rarity via override ----
  await page.evaluate(() => { window.fishing.pickRarity = () => 'Ancient'; });
  await page.keyboard.press('Space');
  await waitState(page, 'waiting');
  await waitState(page, 'bite');
  // spam space to test duplicate guard
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  const spamLog = await page.evaluate(() => window.fishing.log.length);
  await waitState(page, 'reveal');
  await page.waitForTimeout(300);
  const ancientName = await page.evaluate(() => ({
    name: document.getElementById('reveal-name').textContent,
    rar: document.getElementById('reveal-rarity').textContent,
    top: window.fishing.log[0]
  }));
  results.ancient = { spamLog, ...ancientName };
  await waitState(page, 'ready');

  // ---- pickRarity odds ----
  results.odds = await page.evaluate(() => {
    const f = (u) => {
      // restore original by re-deriving from a copy? just test edges of the original
      return null;
    };
    return null;
  });

  // log cap display
  results.logLen = await page.evaluate(() => window.fishing.log.length);

  console.log(JSON.stringify(results, null, 1));
  console.log('ERRORS', errors);
  await browser.close();
})();
