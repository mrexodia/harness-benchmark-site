const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const report = await page.evaluate(() => {
    const c = document.getElementById('game');
    const g = c.getContext('2d');
    const out = [];
    const F = window.FishingData.FISH;
    for (const r of window.FishingData.RARITIES) {
      for (const f of F[r]) {
        for (const p of [0, 0.15, 0.5, 1]) {
          window.Art.drawWorld(g, 1.0 + p, { phase: 'reveal', phaseT: 0, dur: { cast: 0.6, bite: 1.2, reel: 1, reveal: 2.6 }, seed: 0.5, fish: f, missP: null });
          window.Art.drawReveal(g, 1.0 + p * 3, f, r, p);
        }
        // sanity: sprite non-empty
        const spr = window.Art.getFishSprite(f);
        const d = spr.getContext('2d').getImageData(0, 0, spr.width, spr.height).data;
        let opaque = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) opaque++;
        out.push({ name: f.name, rarity: r, w: spr.width, h: spr.height, opaque });
      }
    }
    return out;
  });

  for (const r of report) console.log(JSON.stringify(r));
  console.log('ERRORS', errors);
  await browser.close();
})();
