// test/smoke.mjs — load the game, capture errors, screenshot.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '')));

await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const state = await page.evaluate(() => ({
  hasFishing: !!window.fishing,
  state: window.fishing && window.fishing.state,
  log: window.fishing && window.fishing.log,
  pick: window.fishing && [0, 0.44, 0.45, 0.69, 0.70, 0.84, 0.85, 0.92, 0.93, 0.97, 0.98, 0.999].map((u) => window.fishing.pickRarity(u)),
}));
console.log('STATE', JSON.stringify(state, null, 2));

await page.screenshot({ path: '/tmp/shot-ready.png' });
console.log('ERRORS', errors.length ? errors.join('\n') : 'none');

await browser.close();
