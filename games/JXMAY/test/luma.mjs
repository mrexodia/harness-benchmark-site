// test/luma.mjs — luminance ASCII + crops, for structural inspection.
// usage: node test/luma.mjs [ready|waiting|bite|reveal] [x y w h] [--step=n]
import { chromium } from 'playwright';

const action = process.argv[2] || 'ready';
const nums = process.argv.slice(3).filter((a) => !a.startsWith('--')).map(Number);
const stepArg = process.argv.find((a) => a.startsWith('--step='));
const step = stepArg ? Number(stepArg.split('=')[1]) : 2;
const rarityArg = process.argv.find((a) => a.startsWith('--rarity='));
const forceRarity = rarityArg ? rarityArg.split('=')[1] : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

if (action === 'waiting') {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting');
  await page.waitForTimeout(800);
} else if (action === 'bite') {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
} else if (action === 'reelm') {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
  await page.keyboard.press('Space');
  await page.waitForTimeout(650);
} else if (action === 'reveal') {
  if (forceRarity) await page.evaluate((r) => { window.fishing.pickRarity = () => r; }, forceRarity);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 6000 });
  await page.waitForTimeout(700);
}

const data = await page.evaluate(() => {
  const cv = document.getElementById('scene');
  const ctx = cv.getContext('2d');
  const im = ctx.getImageData(0, 0, cv.width, cv.height).data;
  return { w: cv.width, h: cv.height, arr: Array.from(im) };
});

let [cx, cy, cw, ch] = nums.length === 4 ? nums : [0, 0, data.w, data.h];
const RAMP = ' .:-=+*#%@';
const lines = [];
for (let y = cy; y < cy + ch; y += step) {
  let row = '';
  for (let x = cx; x < cx + cw; x += step) {
    let sum = 0, n = 0;
    for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= data.w || yy >= data.h) continue;
      const i = (yy * data.w + xx) * 4;
      sum += 0.299 * data.arr[i] + 0.587 * data.arr[i + 1] + 0.114 * data.arr[i + 2];
      n++;
    }
    const l = sum / n;
    row += RAMP[Math.min(RAMP.length - 1, Math.floor((l / 255) * RAMP.length))];
  }
  lines.push(row);
}
console.log(`# luma ${action} crop=${cx},${cy},${cw},${ch} step=${step}`);
console.log(lines.join('\n'));
await browser.close();
