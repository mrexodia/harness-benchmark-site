// Renders the game canvas and prints a classified character map so the
// composition can be inspected without viewing the image directly.
const { chromium } = require('playwright');

const ROLES = [
  // char, colors
  ['O', ['#fff3c9', '#ffd27a']],
  [',', ['#c9d9cf', '#f0d49f', '#ffffff', '#f6f2e6']],
  ['.', ['#1b3557', '#2f5a86', '#5d8db2', '#93bccb']],
  ['~', ['#8fc3c4', '#5da3a8', '#2f7286', '#1e5068', '#153c52', '#cdeee6', '#4f9aa6']],
  ['#', ['#3a6b5e', '#2f5a52', '#4f8358', '#3f6c49', '#2f5a2e', '#3f7a38', '#5a9c42', '#84bd58', '#24512f', '#316b38', '#458a44', '#6fb055', '#9ccf6f', '#c9d06a']],
  ['=', ['#3a2716', '#4f3620', '#6b4a2b', '#8a6238', '#a67c48', '#c39a63', '#5a4630', '#6b6258', '#827a6c', '#9a7040', '#7a5a34']],
  ['s', ['#f0c39a', '#d99f74']],
  ['y', ['#d9b45c', '#b8903f']],
  ['r', ['#cf6b5a', '#a94f43', '#e0483c', '#ff9f8f']],
  ['p', ['#4a5a78', '#37445c']],
  ['b', ['#3a2c22']],
  ['B', ['#e6483a', '#8a2a22']],
  ['f', ['#e8849b', '#ffd46b', '#c98fe0']]
];

function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const flat = [];
for (const [ch, cols] of ROLES) for (const c of cols) flat.push([ch, hex2rgb(c)]);

function classify(r, g, b) {
  let best = '?', bd = 1e9;
  for (const [ch, c] of flat) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < bd) { bd = d; best = ch; }
  }
  return best;
}

function printMap(data, w, h, cols, rows, label) {
  console.log('\n===== ' + label + ' (' + cols + 'x' + rows + ') =====');
  const cw = w / cols, chh = h / rows;
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < cols; rx++) {
      let r = 0, g = 0, b = 0, n = 0;
      const x0 = Math.floor(rx * cw), x1 = Math.max(x0 + 1, Math.floor((rx + 1) * cw));
      const y0 = Math.floor(ry * chh), y1 = Math.max(y0 + 1, Math.floor((ry + 1) * chh));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      line += classify(r / n, g / n, b / n);
    }
    console.log(String(ry).padStart(2, '0') + ' ' + line);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  async function grab() {
    return await page.evaluate(() => {
      const c = document.getElementById('game');
      return Array.from(c.getContext('2d').getImageData(0, 0, 320, 180).data);
    });
  }

  const idle = await grab();
  printMap(idle, 320, 180, 107, 60, 'IDLE SCENE');

  // zoom into the angler area
  const crop = await page.evaluate(() => {
    const c = document.getElementById('game');
    return Array.from(c.getContext('2d').getImageData(54, 78, 80, 46).data);
  });
  printMap(crop, 80, 46, 80, 46, 'ANGLER CROP x54 y78');

  await browser.close();
})();
