const { launch } = require('./harness');
(async () => {
  const { browser, page, errors } = await launch();
  await page.screenshot({ path: 'shots/scene.png' });
  // capture the scaled scene region only
  const stage = await page.locator('#stage');
  await stage.screenshot({ path: 'shots/stage.png' });
  console.log('state=', await page.evaluate(() => window.fishing.state));
  console.log('errors=', JSON.stringify(errors, null, 2));
  await browser.close();
})();
