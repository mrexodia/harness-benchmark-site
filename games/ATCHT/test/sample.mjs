// test/sample.mjs — sample scene pixels/regions and report colours + contrast.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const res = await page.evaluate(() => {
  const cv = document.getElementById('scene');
  const ctx = cv.getContext('2d');
  const im = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const at = (x, y) => {
    const i = (y * cv.width + x) * 4;
    return [im[i], im[i + 1], im[i + 2]];
  };
  const avg = (x, y, w, h) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const i = (yy * cv.width + xx) * 4;
      r += im[i]; g += im[i + 1]; b += im[i + 2]; n++;
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  };
  const uniq = (x, y, w, h) => {
    const s = new Set();
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const i = (yy * cv.width + xx) * 4;
      s.add(im[i] + ',' + im[i + 1] + ',' + im[i + 2]);
    }
    return s.size;
  };
  const lum = (c) => Math.round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
  return {
    waterDeep: at(200, 150), waterMid: at(200, 90), waterShallow: at(200, 40),
    grass: at(20, 80), sand: at(50, 100),
    dockWood: at(60, 112), anglerShirt: at(92, 110),
    waterRegionAvg: avg(160, 60, 120, 80), waterUnique: uniq(160, 60, 120, 80),
    landRegionAvg: avg(5, 60, 35, 80), landUnique: uniq(5, 60, 35, 80),
    overallLum: lum(avg(0, 0, 320, 180)),
    avgDeep: lum(at(200, 150)), avgGrass: lum(at(20, 80)),
  };
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
