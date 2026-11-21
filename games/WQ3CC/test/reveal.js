const { chromium } = require('/usr/local/lib/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function classify(r, g, b) {
  const lum = (r + g + b) / 3;
  if (lum < 22) return ' ';
  if (r > 232 && g > 232 && b > 232) return 'W';
  if (b > r + 25 && b > g + 5) return '~';
  if (b > r + 10 && g > r) return 'w';
  if (g > r + 18 && g > b + 12) return '#';
  if (r > g + 22 && g > b + 12) return 'o';
  if (r > g + 30 && r > b + 30 && g < 150) return 'R';
  if (r > 200 && g > 170 && b < 160) return 'y';
  if (r > 195 && g > 165 && b > 150) return 'p';
  if (Math.abs(r - g) < 24 && Math.abs(g - b) < 24) return '.';
  return '?';
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Ancient'];
  for (const rar of rarities) {
    await page.evaluate(rr => { window.fishing.pickRarity = () => rr; }, rar);
    // ensure ready
    await page.evaluate(() => { window.fishing.__debug.G.phase = 'ready'; window.fishing.__debug.G.t = 0; });
    await page.keyboard.press('Space');
    // shorten cast & wait
    await page.evaluate(() => {
      const G = window.fishing.__debug.G;
      G.castDur = 0.05; G.wait = 0.05;
    });
    for (let i = 0; i < 200; i++) {
      const s = await page.evaluate(() => window.fishing.state);
      if (s === 'bite') break;
      await page.evaluate(() => { const G = window.fishing.__debug.G; if (G.phase === 'waiting' && G.landed) G.wait = 0.01; });
      await sleep(20);
    }
    await page.keyboard.press('Space');
    for (let i = 0; i < 200; i++) {
      const s = await page.evaluate(() => window.fishing.state);
      if (s === 'reveal') break;
      await sleep(20);
    }
    await sleep(250);
    const gained = await page.evaluate(() => window.fishing.log[0]);
    const data = await page.evaluate(() => {
      const c = document.getElementById('game');
      const ctx = c.getContext('2d');
      const x0 = 380, y0 = 190, x1 = 900, y1 = 510;
      const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      return { w: x1 - x0, h: y1 - y0, arr: Array.from(img) };
    });
    let out = '';
    for (let y = 0; y < data.h; y += 8) {
      let line = '';
      for (let x = 0; x < data.w; x += 8) {
        const i = (y * data.w + x) * 4;
        line += classify(data.arr[i], data.arr[i + 1], data.arr[i + 2]);
      }
      out += line + '\n';
    }
    console.log('===== ' + rar + ' :: ' + gained.name + ' =====');
    console.log(out);
  }
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
