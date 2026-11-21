const { chromium } = require('/usr/local/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const all = await page.evaluate(() => {
    const out = [];
    const FISH = window.fishing.__debug.FISH;
    for (const r of window.fishing.__debug.RARITIES) {
      for (const f of FISH[r]) {
        const spr = window.fishing.__debug.getFishSprite(f);
        const g = spr.canvas.getContext('2d');
        const img = g.getImageData(0, 0, spr.w, spr.h).data;
        out.push({ name: f.name, rarity: r, w: spr.w, h: spr.h, arr: Array.from(img) });
      }
    }
    return out;
  });

  function cls(p, a, r, g, b) {
    if (a < 30) return ' ';
    const lum = (r + g + b) / 3;
    if (lum < 30) return '@';
    if (r > 235 && g > 235 && b > 235) return 'W';
    if (b > r + 30 && b > g + 10) return 'B';
    if (g > r + 20 && g > b + 10) return 'G';
    if (r > g + 25 && g > b + 10) return 'O';
    if (r > g + 30 && r > b + 30) return 'R';
    if (r > 200 && g > 190 && b > 170) return 'w';
    if (r > 190 && g > 150 && b < 190) return 'y';
    return '.';
  }

  for (const f of all) {
    console.log('--- ' + f.rarity + ': ' + f.name + ' ---');
    let minx = 999, maxx = -1, miny = 999, maxy = -1;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const a = f.arr[(y * f.w + x) * 4 + 3];
      if (a > 30) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    console.log('bbox x[' + minx + '-' + maxx + '] y[' + miny + '-' + maxy + '] size ' + (maxx - minx + 1) + 'x' + (maxy - miny + 1));
    for (let y = miny; y <= maxy; y++) {
      let line = '';
      for (let x = minx; x <= maxx; x++) {
        const i = (y * f.w + x) * 4;
        line += cls(0, f.arr[i + 3], f.arr[i], f.arr[i + 1], f.arr[i + 2]);
      }
      console.log(line);
    }
  }
  await browser.close();
})();
