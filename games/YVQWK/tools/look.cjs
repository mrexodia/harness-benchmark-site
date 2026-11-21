/* Textual visual inspector: renders canvases as classified ASCII maps. */
const { chromium } = require('playwright');

const ANCHORS = [
  [' ', 0xc2, 0xe6, 0xec], // sky low / pale
  ['`', 0xff, 0xf6, 0xd2], // sun
  ['.', 0x7c, 0xb9, 0xd8], // sky mid
  [',', 0x3f, 0x7c, 0xae], // sky top
  ['-', 0x73, 0x99, 0xb2], // hills
  ['^', 0x3f, 0x6d, 0x5d], // far trees
  ['~', 0x2f, 0x7f, 0xa2], // water
  ['v', 0x1d, 0x5c, 0x80], // water deep
  ['=', 0xd8, 0xf4, 0xf0], // foam/white
  ['#', 0x4f, 0x8a, 0x43], // grass
  ['+', 0x7e, 0xbd, 0x5a], // grass light
  ['%', 0x35, 0x63, 0x31], // grass dark
  ['&', 0x3f, 0x7a, 0x3d], // bush
  [':', 0xe2, 0xc4, 0x8c], // sand
  [';', 0xc9, 0xa4, 0x68], // sand dark
  ['w', 0xa5, 0x71, 0x3f], // wood
  ['W', 0x6f, 0x4a, 0x28], // wood dark
  ['m', 0xc4, 0x8f, 0x57], // wood light
  ['t', 0x6b, 0x4a, 0x30], // trunk
  ['L', 0x4e, 0x8a, 0x46], // leaf
  ['S', 0xf2, 0xc7, 0x9b], // skin
  ['R', 0xd9, 0x58, 0x4a], // red shirt
  ['h', 0xd9, 0xb0, 0x6a], // hat straw
  ['@', 0x12, 0x0d, 0x0a], // outline
];

function classify(r, g, b) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < ANCHORS.length; i++) {
    const a = ANCHORS[i];
    const d = (r - a[1]) ** 2 + (g - a[2]) ** 2 + (b - a[3]) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return ANCHORS[best][0];
}

function map(data, w, h, step) {
  const out = [];
  for (let y = 0; y < h; y += step) {
    let row = '';
    for (let x = 0; x < w; x += step) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = 0; dy < step && y + dy < h; dy++) {
        for (let dx = 0; dx < step && x + dx < w; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      row += classify(r / n, g / n, b / n);
    }
    out.push(row);
  }
  return out.join('\n');
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const arg = process.argv[2] || 'game';
  const gd = await page.evaluate(() => {
    function grab(id) {
      const c = document.getElementById(id);
      const x = c.getContext('2d');
      return { w: c.width, h: c.height, d: Array.from(x.getImageData(0, 0, c.width, c.height).data) };
    }
    return { game: grab('game'), ui: grab('ui') };
  });

  if (arg === 'game') console.log(map(gd.game.d, 320, 180, 2));
  else if (arg === 'ui') console.log(map(gd.ui.d, 1280, 720, 8));
  else if (arg === 'both') { console.log('--- GAME ---'); console.log(map(gd.game.d, 320, 180, 2)); console.log('--- UI ---'); console.log(map(gd.ui.d, 1280, 720, 8)); }
  else if (arg && arg.startsWith('crop')) {
    // crop:x,y,w,h  logical game pixels
    const [x, y, w, h] = arg.split(':')[1].split(',').map(Number);
    const sub = [];
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const i = (yy * 320 + xx) * 4;
      sub.push(gd.game.d[i], gd.game.d[i + 1], gd.game.d[i + 2], 255);
    }
    console.log(map(sub, w, h, 1));
  }
  if (errs.length) console.log('ERRORS:', errs.join('|'));
  await browser.close();
})();
