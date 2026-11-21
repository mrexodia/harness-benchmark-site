const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  await p.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await p.waitForTimeout(300);
  const names = process.argv.slice(2);
  const fishes = await p.evaluate(() => window.FishArt.RENDERED.map(r => {
    const c = r.canvas, w = c.width, h = c.height;
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    return { name: r.cfg.name, rarity: r.cfg.rarity, w, h, d: Array.from(d) };
  }));
  for (const f of fishes) {
    if (names.length && names.indexOf(f.name) < 0) continue;
    console.log('\n=== ' + f.name + '  [' + f.rarity + ']  ' + f.w + 'x' + f.h + ' ===');
    for (let y = 0; y < f.h; y++) {
      let row = '';
      for (let x = 0; x < f.w; x++) {
        const i = (y * f.w + x) * 4;
        const a = f.d[i + 3]; if (a < 200) { row += "."; continue; }
        if (a < 8) { row += '.'; continue; }
        const lum = (f.d[i] * 0.299 + f.d[i + 1] * 0.587 + f.d[i + 2] * 0.114) / 255;
        row += lum < 0.22 ? '@' : lum < 0.45 ? '#' : lum < 0.72 ? '+' : '*';
      }
      console.log(row);
    }
  }
  await b.close();
})();
