const { chromium } = require('/usr/local/lib/node_modules/playwright');

function classify(r, g, b) {
  const lum = (r + g + b) / 3;
  if (lum < 24) return ' ';
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
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const region = process.env.REGION ? process.env.REGION.split(',').map(Number) : [0, 0, 1280, 720];
  const step = Number(process.env.STEP || 8);

  const data = await page.evaluate(([x0, y0, x1, y1]) => {
    const c = document.getElementById('game');
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    return { w: x1 - x0, h: y1 - y0, arr: Array.from(img) };
  }, region);

  const mode = process.env.MODE || 'color';
  let out = '';
  for (let y = 0; y < data.h; y += step) {
    let line = '';
    for (let x = 0; x < data.w; x += step) {
      const i = (y * data.w + x) * 4;
      const r = data.arr[i], g = data.arr[i + 1], b = data.arr[i + 2];
      if (mode === 'lum') {
        const lum = (r + g + b) / 3;
        line += lum > 170 ? '#' : lum > 120 ? '+' : lum > 70 ? '.' : ' ';
      } else {
        line += classify(r, g, b);
      }
    }
    out += line + '\n';
  }
  console.log('region', region, 'step', step);
  console.log(out);
  await browser.close();
})();
