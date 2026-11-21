// Dump a logical region of the scene at 1:1 (or scaled).
const { launch } = require('./harness');
const { dump } = require('./ascii');

(async () => {
  const [x, y, w, h, scale] = process.argv.slice(2).map(Number);
  const { browser, page, errors } = await launch();
  console.log(`region x=${x} y=${y} w=${w} h=${h} scale=${scale || 1}`);
  console.log(await dump(page, { src: { x, y, w, h }, scale: scale || 1 }));
  if (errors.length) console.log('ERRORS', errors);
  await browser.close();
})();
