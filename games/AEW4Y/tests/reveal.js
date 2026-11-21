// Drive a real catch at a chosen rarity and dump the reveal canvas + DOM card.
const { launch } = require('./harness');
const { dump } = require('./ascii');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitState(page, target, timeout) {
  const t0 = Date.now();
  let s = await page.evaluate(() => window.fishing.state);
  while (s !== target && Date.now() - t0 < timeout) { await sleep(40); s = await page.evaluate(() => window.fishing.state); }
  return s;
}

(async () => {
  const rarity = process.argv[2] || 'Common';
  const { browser, page, errors } = await launch();
  await page.evaluate(r => { window.fishing.pickRarity = () => r; }, rarity);
  await page.keyboard.press('Space');
  await waitState(page, 'bite', 8000);
  await page.keyboard.press('Space');
  await waitState(page, 'reveal', 3000);
  await sleep(700);
  const card = await page.evaluate(() => {
    const rc = document.getElementById('revealcard');
    return {
      cls: rc.className,
      rarity: document.getElementById('revealrarity').textContent,
      rarityCls: document.getElementById('revealrarity').className,
      name: document.getElementById('revealname').textContent,
      sub: document.getElementById('revealsub').textContent,
      visible: getComputedStyle(rc).opacity
    };
  });
  console.log('card:', JSON.stringify(card));
  console.log(await dump(page, { src: { x: 40, y: 12, w: 240, h: 130 }, scale: 2 }));
  if (errors.length) console.log('ERRORS', errors);
  await browser.close();
})();
