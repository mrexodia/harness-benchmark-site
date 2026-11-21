const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const btn = page.locator('#action');
  const out = {};
  out.legend = await page.locator('#legend .chip').allTextContents();
  out.introVisible = await page.locator('#intro').isVisible();
  out.btnLabel0 = await btn.textContent();

  // click the on-screen button to cast
  await btn.click();
  out.stateAfterClick = await page.evaluate(() => window.fishing.state);
  out.introGone = await page.evaluate(() => document.getElementById('intro').classList.contains('gone'));

  // wait for bite, then click REEL
  let t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    if (await page.evaluate(() => window.fishing.state) === 'bite') break;
    await page.waitForTimeout(30);
  }
  out.btnLabelBite = await btn.textContent();
  await btn.click();
  out.stateAfterReel = await page.evaluate(() => window.fishing.state);
  // wait until ready
  t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    if (await page.evaluate(() => window.fishing.state) === 'ready') break;
    await page.waitForTimeout(30);
  }
  out.logLen = await page.evaluate(() => window.fishing.log.length);

  // click canvas to cast again
  const box = await page.locator('#game').boundingBox();
  await page.mouse.click(box.x + 300, box.y + 300);
  out.stateAfterCanvasClick = await page.evaluate(() => window.fishing.state);

  // check no audio elements / APIs used
  out.audioTags = await page.evaluate(() => document.querySelectorAll('audio,video').length);

  console.log(JSON.stringify(out, null, 1));
  console.log('ERRORS', errors);
  await browser.close();
})();
