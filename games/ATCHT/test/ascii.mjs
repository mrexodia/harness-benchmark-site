// test/ascii.mjs — render the scene canvas into a classified ASCII map so the
// composition can be inspected without viewing the image.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const action = args[0] || 'ready';

// nearest-palette classification -> single char
const CLASSES = [
  // [hex, char, label]
  ['#123039', 'D', 'deep'], ['#16414d', 'D', 'deep'], ['#1d5460', 'd', 'mid'],
  ['#246470', 'm', 'mid'], ['#2f7d7e', 's', 'shallow'], ['#3f938c', 's', 'shallow'],
  ['#57b3a2', '~', 'glow'], ['#bfe6d9', '*', 'foam'], ['#e6fbf1', '*', 'sparkle'],
  ['#2c5548', 'H', 'hill'], ['#3a6b57', 'H', 'hill'], ['#4b8368', 'H', 'hill'],
  ['#4f3524', 'n', 'dirt'], ['#6b4a32', 'n', 'dirt'], ['#8a6242', 'n', 'dirt'],
  ['#c8a86a', '.', 'sand'], ['#e0c48c', '.', 'sand'],
  ['#33602f', 'g', 'grass'], ['#468038', 'g', 'grass'], ['#63a848', 'G', 'grass'],
  ['#8bcf64', 'G', 'grass'], ['#2a4d27', 'g', 'grass'],
  ['#432d1d', 'T', 'trunk'], ['#63442a', 'T', 'trunk'],
  ['#24512e', 'L', 'leaf'], ['#336b39', 'L', 'leaf'], ['#438a45', 'L', 'leaf'],
  ['#5aa855', 'L', 'leaf'], ['#7ec86a', 'L', 'leaf'],
  ['#5a3a24', 'w', 'wood'], ['#83552f', 'w', 'wood'], ['#9c6739', 'w', 'wood'],
  ['#b9834a', 'w', 'wood'], ['#d3a266', 'w', 'wood'], ['#3a2517', 'w', 'wood'],
  ['#4d5560', '^', 'stone'], ['#6e7885', '^', 'stone'], ['#98a3ad', '^', 'stone'], ['#c2ccd3', '^', 'stone'],
  ['#e88aa0', 'f', 'flower'], ['#f2c14e', 'f', 'flower'], ['#f4f0e6', 'f', 'flower'],
  ['#a06fb0', 'f', 'flower'], ['#d9584f', 'f', 'flower'], ['#3f7a3a', 'g', 'stem'],
  ['#f0c090', 'o', 'skin'], ['#cf9a6a', 'o', 'skin'], ['#a87048', 'o', 'skin'],
  ['#5a3a2a', 'h', 'hair'],
  ['#e0b24a', 'C', 'cap'], ['#a9772a', 'C', 'cap'],
  ['#cf6a4a', 'R', 'shirt'], ['#a34e38', 'R', 'shirt'], ['#e88a68', 'R', 'shirt'],
  ['#4a4e69', 'P', 'pants'], ['#383b52', 'P', 'pants'],
  ['#4a3428', 'B', 'boot'], ['#6b4d38', 'B', 'boot'],
  ['#7a4f2c', 'r', 'rod'], ['#a7713f', 'r', 'rod'], ['#cbbfae', 'r', 'reel'],
  ['#e0503a', 'b', 'bobber'], ['#f4886f', 'b', 'bobber'],
  ['#241a26', 'K', 'outline'], ['#1c1620', 'K', 'outline'], ['#2a1a10', 'K', 'shadow'],
  ['#d9a441', 'C', 'cap'],
  ['#c05a4a', 'R', 'shirt'],
];
function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const CRGB = CLASSES.map(([h, c]) => [hexToRgb(h), c]);
function classify(r, g, b) {
  let best = '?', bd = 1e9;
  for (const [c, ch] of CRGB) {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bd) { bd = d; best = ch; }
  }
  return bd > 3200 ? '?' : best;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

async function act(times = 1) { for (let i = 0; i < times; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(120); } }

if (action === 'bite') {
  await page.keyboard.press('Space');
  // wait until bite
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
} else if (action === 'reveal') {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', null, { timeout: 6000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'reveal', null, { timeout: 6000 });
  await page.waitForTimeout(600);
} else if (action === 'waiting') {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting', null, { timeout: 4000 });
  await page.waitForTimeout(700);
}

const data = await page.evaluate(() => {
  const cv = document.getElementById('scene');
  const ctx = cv.getContext('2d');
  const im = ctx.getImageData(0, 0, cv.width, cv.height).data;
  return { w: cv.width, h: cv.height, arr: Array.from(im) };
});

console.log(`# scene ${data.w}x${data.h} phase=${action}`);
// downsample 2x2, choosing the most distinctive (furthest from water avg)
const out = [];
for (let y = 0; y < data.h; y += 2) {
  let row = '';
  for (let x = 0; x < data.w; x += 2) {
    let bestC = null, bestScore = -1;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = ((y + dy) * data.w + (x + dx)) * 4;
      const r = data.arr[i], g = data.arr[i + 1], b = data.arr[i + 2];
      const ch = classify(r, g, b);
      const salient = 'KobRrCwT^f.'.includes(ch) ? 2 : (ch === '?' ? 1.5 : (ch === 'L' || ch === 'G' ? 1.2 : 1));
      if (salient > bestScore) { bestScore = salient; bestC = ch; }
    }
    row += bestC;
  }
  out.push(row);
}
console.log(out.join('\n'));
await browser.close();
