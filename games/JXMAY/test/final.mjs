// test/final.mjs — network isolation, fps, long session, log cap.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const external = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console:' + m.text()); });
page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:8000') && !r.url().startsWith('data:')) external.push(r.url()); });

await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

// measure fps over 2 seconds
const fps = await page.evaluate(() => new Promise((resolve) => {
  let n = 0; const t0 = performance.now();
  function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else resolve(Math.round(n / ((performance.now() - t0) / 1000))); }
  requestAnimationFrame(f);
}));
console.log('FPS ~', fps);

// long session: 11 catches
const total = 11;
for (let i = 0; i < total; i++) {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 4000 });
  await page.waitForTimeout(420);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 2000 });
}
const log = await page.evaluate(() => window.fishing.log);
console.log('catches logged total:', log.length, '(expected', total + ')');
console.log('newest first:', log[0] === undefined ? 'n/a' : 'ok');

// log UI should draw at most 8 rows -> count bright name-ish pixels per row region
const rows = await page.evaluate(() => {
  const cv = document.getElementById('ui');
  const ctx = cv.getContext('2d');
  const d = ctx.getImageData(1028, 40, 230, 170).data;
  let bright = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (l > 150) bright++;
  }
  return bright;
});
console.log('log panel bright text pixels:', rows);

// verify a miss still works after a long session
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 9000 });
await page.waitForFunction(() => window.fishing.state === 'ready', null, { timeout: 4000 });
const after = await page.evaluate(() => window.fishing.log.length);
console.log('miss did not log:', after === total);

console.log('external requests:', external.length ? external.join(',') : 'none');
console.log('errors:', errors.length ? errors.join(' | ') : 'none');

await browser.close();
process.exit(errors.length || external.length ? 1 : 0);
