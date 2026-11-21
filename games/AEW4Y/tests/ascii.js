// Dump a canvas/region as hue/luminance ASCII for inspection.
// Usage: node tests/ascii.js [scale] [canvasGlobalFn]
const { launch } = require('./harness');

function classifyJS() {
  // runs in page context
  window.__cls = function (r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (lum < 22) return ' ';
    if (sat < 0.16) {
      const ramp = ' .:-=+*#%@';
      return ramp[Math.min(ramp.length - 1, Math.floor((lum / 255) * ramp.length))];
    }
    let h; const d = max - min;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = ((h * 60) + 360) % 360;
    let ch;
    if (h < 15 || h >= 330) ch = 'p';
    else if (h < 45) ch = 'r';
    else if (h < 70) ch = 'y';
    else if (h < 165) ch = 'g';
    else if (h < 200) ch = 'c';
    else if (h < 265) ch = 'b';
    else ch = 'm';
    return lum > 150 ? ch.toUpperCase() : ch;
  };
}

// opts: { src:{x,y,w,h}, scale, canvasFn }
async function dump(page, opts) {
  await page.evaluate(classifyJS);
  return page.evaluate(({ src, scale, canvasFn }) => {
    const cv = canvasFn ? window[canvasFn]() : document.getElementById('scene');
    const g = cv.getContext('2d');
    const x0 = src ? src.x : 0, y0 = src ? src.y : 0;
    const w = src ? src.w : cv.width, h = src ? src.h : cv.height;
    const img = g.getImageData(0, 0, cv.width, cv.height).data;
    const lines = [];
    for (let gy = 0; gy < h; gy += scale) {
      let s = '';
      for (let gx = 0; gx < w; gx += scale) {
        let rr = 0, gg = 0, bb = 0, n = 0;
        for (let y = gy; y < Math.min(h, gy + scale); y++) {
          for (let x = gx; x < Math.min(w, gx + scale); x++) {
            const i = ((y0 + y) * cv.width + (x0 + x)) * 4;
            rr += img[i]; gg += img[i + 1]; bb += img[i + 2]; n++;
          }
        }
        s += window.__cls(rr / n, gg / n, bb / n);
      }
      const yLabel = String(y0 + gy).padStart(3, ' ');
      lines.push(yLabel + '|' + s);
    }
    return lines.join('\n');
  }, { src: opts.src, scale: opts.scale || 1, canvasFn: opts.canvasFn });
}

async function main() {
  const { browser, page, errors } = await launch();
  const width = parseInt(process.argv[2] || '160', 10);
  const scale = Math.max(1, Math.round(320 / width));
  console.log('scale=' + scale);
  console.log(await dump(page, { scale }));
  if (errors.length) console.log('ERRORS', errors);
  await browser.close();
}

if (require.main === module) main();
module.exports = { dump, launch };
