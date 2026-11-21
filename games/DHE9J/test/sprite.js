// Prints each fish sprite using symbols assigned to its exact colours.
const { chromium } = require('playwright');

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
    const out = [];
    const F = window.FishingData.FISH;
    for (const r of window.FishingData.RARITIES) for (const f of F[r]) {
      if (names.length && !names.includes(f.name)) continue;
      const spr = window.Art.getFishSprite(f);
      g.fillStyle = '#0a141b'; g.fillRect(0, 0, 320, 180);
      const x = Math.floor((320 - spr.width) / 2), y = Math.floor((180 - spr.height) / 2);
      g.drawImage(spr, x, y);
      const img = g.getImageData(x, y, spr.width, spr.height);
      out.push({ name: f.name, rarity: r, w: spr.width, h: spr.height, data: Array.from(img.data) });
    }
    return out;
  }, names);

  for (const info of result) {
    const counts = new Map();
    for (let i = 0; i < info.data.length; i += 4) {
      if (info.data[i + 3] < 64) continue;
      const key = info.data[i] + ',' + info.data[i + 1] + ',' + info.data[i + 2];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const syms = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const map = new Map();
    const legend = [];
    sorted.forEach(([k, n], idx) => {
      const s = syms[idx] || '?';
      map.set(k, s);
      legend.push(s + '=#' + k.split(',').map(v => (+v).toString(16).padStart(2, '0')).join('') + '(' + n + ')');
    });
    console.log('\n===== ' + info.name + ' [' + info.rarity + '] ' + info.w + 'x' + info.h + ' =====');
    for (let y = 0; y < info.h; y++) {
      let line = '';
      for (let x = 0; x < info.w; x++) {
        const i = (y * info.w + x) * 4;
        if (info.data[i + 3] < 64) { line += ' '; continue; }
        line += map.get(info.data[i] + ',' + info.data[i + 1] + ',' + info.data[i + 2]) || '?';
      }
      console.log(line.replace(/\s+$/, ''));
    }
    console.log('legend: ' + legend.join(' '));
  }
  await browser.close();
})();
