// Print exact hex colors at a set of logical points on the scene.
const { launch } = require('./harness');

(async () => {
  const pts = [];
  for (let i = 2; i < process.argv.length; i += 2) {
    pts.push([parseInt(process.argv[i], 10), parseInt(process.argv[i + 1], 10)]);
  }
  const { browser, page } = await launch();
  const out = await page.evaluate((pts) => {
    const cv = document.getElementById('scene');
    const g = cv.getContext('2d');
    return pts.map(([x, y]) => {
      const d = g.getImageData(x, y, 1, 1).data;
      const hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      return x + ',' + y + ' ' + hex;
    });
  }, pts);
  console.log(out.join('\n'));
  await browser.close();
})();
