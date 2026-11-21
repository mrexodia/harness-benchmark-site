// test/ui.mjs — verify full-res UI text renders, and button/DOM states.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const fontInfo = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d');
  c.font = "800 30px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const w = c.measureText('Hollowbone Leviathan').width;
  c.font = "800 30px monospace";
  const w2 = c.measureText('Hollowbone Leviathan').width;
  return { w, w2 };
});
console.log('FONT measure', JSON.stringify(fontInfo));

async function brightPixels(x, y, w, h) {
  return page.evaluate(([x, y, w, h]) => {
    const cv = document.getElementById('ui');
    const ctx = cv.getContext('2d');
    const d = ctx.getImageData(x, y, w, h).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (l > 150) n++;
    }
    return n;
  }, [x, y, w, h]);
}

// force an Ancient reveal so we can check the fancy styling too
await page.evaluate(() => { window.fishing.pickRarity = () => 'Ancient'; });
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 6000 });
await page.waitForTimeout(700);

const rarityPx = await brightPixels(360, 165, 560, 60);
const namePx = await brightPixels(300, 480, 680, 50);
const hintPx = await brightPixels(480, 540, 320, 40);
const logPx = await brightPixels(1010, 30, 250, 170);
const barPx = await brightPixels(20, 640, 520, 70);
console.log('bright px: rarity', rarityPx, 'name', namePx, 'hint', hintPx, 'log', logPx, 'bar', barPx);
console.log('text render ok:', rarityPx > 200 && namePx > 200 && logPx > 100 && barPx > 200);

// button states
const btn = () => page.evaluate(() => {
  const b = document.getElementById('actionBtn');
  return { text: b.textContent, disabled: b.disabled, reel: b.classList.contains('reel'), visible: b.offsetParent !== null };
});
console.log('button reveal:', JSON.stringify(await btn()));
await page.waitForTimeout(400);
await page.keyboard.press('Space');
console.log('button ready:', JSON.stringify(await btn()));
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 3000 });
console.log('button waiting:', JSON.stringify(await btn()));
await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
console.log('button bite:', JSON.stringify(await btn()));

// log content sanity: last eight, newest first
await page.keyboard.press('Space');
await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 3000 });
const log = await page.evaluate(() => window.fishing.log);
console.log('log after ancient catches:', JSON.stringify(log));

await browser.close();
