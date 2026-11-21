// Drive to the bite phase and dump the bobber + cue region.
const { launch } = require('./harness');
const { dump } = require('./ascii');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitState(page, target, timeout) {
  const t0 = Date.now();
  let s = await page.evaluate(() => window.fishing.state);
  while (s !== target && Date.now() - t0 < timeout) { await sleep(30); s = await page.evaluate(() => window.fishing.state); }
  return s;
}

(async () => {
  const { browser, page, errors } = await launch();
  await page.keyboard.press('Space');
  console.log('state:', await page.evaluate(() => window.fishing.state));
  console.log('\n--- cast arc (t~0.55s) ---');
  await sleep(550);
  console.log(await dump(page, { src: { x: 60, y: 80, w: 240, h: 70 }, scale: 2 }));
  await waitState(page, 'bite', 8000);
  console.log('\n--- bite ---');
  console.log(await dump(page, { src: { x: 140, y: 80, w: 170, h: 70 }, scale: 1 }));
  // capture mid-reel
  await page.keyboard.press('Space');
  await sleep(600);
  console.log('\n--- reeling ---');
  console.log(await dump(page, { src: { x: 20, y: 80, w: 260, h: 60 }, scale: 2 }));
  if (errors.length) console.log('ERRORS', errors);
  await browser.close();
})();
