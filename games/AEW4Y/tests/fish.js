// Dump every fish sprite as ASCII, grouped by rarity.
const { launch } = require('./harness');
const { dump } = require('./ascii');

(async () => {
  const { browser, page, errors } = await launch();
  await page.evaluate(() => {
    window.__fishCanvas = function () { return window.Art.fishCanvas(window.__fishName); };
  });
  const groups = await page.evaluate(() => {
    const out = {};
    Object.keys(window.Art.FISH).forEach(r => { out[r] = window.Art.FISH[r].map(f => f.name); });
    return out;
  });
  for (const r of Object.keys(groups)) {
    console.log('\n===== ' + r + ' =====');
    for (const name of groups[r]) {
      await page.evaluate(n => { window.__fishName = n; }, name);
      console.log('\n-- ' + name + ' --');
      console.log(await dump(page, { canvasFn: '__fishCanvas', scale: 1 }));
    }
  }
  if (errors.length) console.log('ERRORS', errors);
  await browser.close();
})();
