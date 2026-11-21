// Prints a luminance ASCII map of the canvas at chosen moments.
const { chromium } = require('playwright');
const RAMP = ' .:-=+*#%@';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  async function lum(cols = 100, rows = 56) {
    const d = await page.evaluate(() => Array.from(
      document.getElementById('game').getContext('2d').getImageData(0, 0, 320, 180).data));
    console.log('\n----- luminance ' + cols + 'x' + rows + ' -----');
    const cw = 320 / cols, ch = 180 / rows;
    for (let ry = 0; ry < rows; ry++) {
      let line = '';
      for (let rx = 0; rx < cols; rx++) {
        let l = 0, n = 0;
        for (let y = Math.floor(ry * ch); y < Math.floor((ry + 1) * ch); y++)
          for (let x = Math.floor(rx * cw); x < Math.floor((rx + 1) * cw); x++) {
            const i = (y * 320 + x) * 4;
            l += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++;
          }
        const p = (l / n) / 255;
        line += RAMP[Math.min(RAMP.length - 1, Math.floor(p * RAMP.length))];
      }
      console.log(line);
    }
  }

  const mode = process.argv[2] || 'scene';
  if (mode === 'scene') await lum();
  if (mode === 'reveal') {
    await page.evaluate(() => { window.fishing.pickRarity = () => 'Ancient'; });
    await page.keyboard.press('Space');
    const t0 = Date.now();
    while (Date.now() - t0 < 7000) {
      if (await page.evaluate(() => window.fishing.state) === 'bite') break;
      await page.waitForTimeout(30);
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(1400);
    await lum();
  }
  if (mode === 'cast') {
    await page.keyboard.press('Space');
    await page.waitForTimeout(350);
    await lum();
  }
  if (mode === 'bite') {
    await page.keyboard.press('Space');
    const t0 = Date.now();
    while (Date.now() - t0 < 6000) {
      if (await page.evaluate(() => window.fishing.state) === 'bite') break;
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(300);
    await lum();
  }
  await browser.close();
})();
