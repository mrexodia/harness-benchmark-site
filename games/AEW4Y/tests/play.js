const { launch } = require('./harness');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { browser, page, errors } = await launch();
  const state = () => page.evaluate(() => window.fishing.state);
  const log = () => page.evaluate(() => window.fishing.log);

  async function waitState(target, timeout) {
    const t0 = Date.now();
    let s = await state();
    while (s !== target && Date.now() - t0 < timeout) {
      await sleep(40);
      s = await state();
    }
    return s;
  }

  // 1. pickRarity boundaries
  const pr = await page.evaluate(() => {
    const f = window.fishing.pickRarity;
    return [0, 0.1, 0.44, 0.449, 0.45, 0.5, 0.699, 0.7, 0.84, 0.849, 0.85,
      0.929, 0.93, 0.979, 0.98, 0.999].map(u => f(u));
  });
  console.log('pickRarity:', pr.join(', '));

  // 2. successful cycle
  console.log('\n-- successful cycle --');
  console.log('initial state:', await state());
  const tCast = Date.now();
  await page.keyboard.press('Space');
  console.log('after cast:', await state());
  // double-press should not overlap
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  console.log('after double press:', await state());
  let s = await waitState('bite', 8000);
  console.log('reached bite after', ((Date.now() - tCast) / 1000).toFixed(2) + 's', 'state=', s);
  await page.screenshot({ path: 'shots/phase-bite.png' });
  await page.keyboard.press('Space');
  console.log('after reel press:', await state());
  s = await waitState('reveal', 3000);
  console.log('reached reveal after', ((Date.now() - tCast) / 1000).toFixed(2) + 's', 'state=', s);
  console.log('log:', JSON.stringify(await log()));
  await sleep(500);
  await page.screenshot({ path: 'shots/phase-reveal.png' });
  await page.keyboard.press('Space');
  console.log('after dismiss:', await state());

  // 3. miss cycle
  console.log('\n-- miss cycle --');
  await page.keyboard.press('Space');
  s = await waitState('bite', 8000);
  console.log('bite, now letting it expire. state=', s);
  s = await waitState('ready', 3000);
  console.log('missed -> state=', s, 'log len=', (await log()).length);

  // 4. replaced pickRarity changes outcome
  console.log('\n-- replaced pickRarity --');
  await page.evaluate(() => { window.__origPick = window.fishing.pickRarity; window.fishing.pickRarity = () => 'Ancient'; });
  await page.keyboard.press('Space');
  await waitState('bite', 8000);
  await page.keyboard.press('Space');
  await waitState('reveal', 3000);
  console.log('log[0]:', JSON.stringify((await log())[0]));
  await page.screenshot({ path: 'shots/phase-reveal-ancient.png' });
  await page.keyboard.press('Space');
  await page.evaluate(() => { window.fishing.pickRarity = window.__origPick; });

  // 5. rapid pressing across ready should not create duplicates
  console.log('\n-- rapid press spam --');
  for (let i = 0; i < 8; i++) await page.keyboard.press('Space');
  console.log('state after spam:', await state(), '(should be waiting)');
  const lenBefore = (await log()).length;
  // force it to miss
  await waitState('bite', 8000);
  await waitState('ready', 3000);
  console.log('log len unchanged:', lenBefore === (await log()).length);

  console.log('\nerrors:', JSON.stringify(errors));
  await browser.close();
})();
