// Renders fish sprites / reveal screens to the canvas and prints character maps.
const { chromium } = require('playwright');

const ROLES = [
  ['O', ['#fff3c9', '#ffd27a']],
  [',', ['#c9d9cf', '#f0d49f', '#ffffff', '#f6f2e6']],
  ['.', ['#1b3557', '#2f5a86', '#5d8db2', '#93bccb']],
  ['~', ['#8fc3c4', '#5da3a8', '#2f7286', '#1e5068', '#153c52', '#cdeee6']],
  ['#', ['#3a6b5e', '#2f5a52', '#4f8358', '#3f6c49', '#2f5a2e', '#3f7a38', '#5a9c42', '#84bd58', '#24512f', '#316b38', '#458a44', '#6fb055', '#9ccf6f']],
  ['=', ['#3a2716', '#4f3620', '#6b4a2b', '#8a6238', '#a67c48', '#c39a63', '#5a4630', '#6b6258', '#827a6c', '#9a7040']],
  ['s', ['#f0c39a', '#d99f74']],
  ['y', ['#d9b45c', '#b8903f']],
  ['r', ['#cf6b5a', '#a94f43', '#e6483a', '#8a2a22', '#b8452f']],
  ['p', ['#4a5a78', '#37445c', '#4f7fa8', '#2f5f9e']],
  ['b', ['#3a2c22']],
  ['f', ['#e8849b', '#ffd46b', '#c98fe0', '#e9a3b0']],
  ['c', ['#4fe0cf', '#5fe6d2', '#aef6ec', '#6ad0e0', '#7fe8ff']],
  ['g', ['#7fd18a', '#c07fe8', '#f2b93f', '#f0912f']]
];
function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const flat = [];
for (const [ch, cols] of ROLES) for (const c of cols) flat.push([ch, hex2rgb(c)]);
function classify(r, g, b) {
  let best = '?', bd = 1e9;
  for (const [ch, c] of flat) { const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2; if (d < bd) { bd = d; best = ch; } }
  return best;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const names = process.argv.slice(2);
  const result = await page.evaluate((names) => {
    const c = document.getElementById('game');
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const out = {};
    const all = [];
    const F = window.FishingData.FISH;
    for (const r of window.FishingData.RARITIES) for (const f of F[r]) all.push([r, f]);
    for (const [r, f] of all) {
      if (names.length && !names.includes(f.name)) continue;
      const spr = window.Art.getFishSprite(f);
      g.fillStyle = '#0a141b'; g.fillRect(0, 0, 320, 180);
      // center sprite at 1px per sprite pixel
      const x = Math.floor((320 - spr.width) / 2), y = Math.floor((180 - spr.height) / 2);
      g.drawImage(spr, x, y);
      const img = g.getImageData(x, y, spr.width, spr.height);
      out[f.name] = { rarity: r, w: spr.width, h: spr.height, data: Array.from(img.data) };
    }
    return out;
  }, names);

  for (const [name, info] of Object.entries(result)) {
    console.log('\n===== ' + name + ' [' + info.rarity + '] ' + info.w + 'x' + info.h + ' =====');
    for (let y = 0; y < info.h; y++) {
      let line = '';
      for (let x = 0; x < info.w; x++) {
        const i = (y * info.w + x) * 4;
        const a = info.data[i + 3];
        if (a < 40) { line += ' '; continue; }
        line += classify(info.data[i], info.data[i + 1], info.data[i + 2]);
      }
      console.log(line.replace(/\s+$/, ''));
    }
  }
  await browser.close();
})();
