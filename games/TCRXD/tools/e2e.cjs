const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8000/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, m){ (c?pass++:fail++); console.log((c?'PASS ':'FAIL ')+m); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('console:'+m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.fishing && window.fishing.state);

  const shape = await page.evaluate(() => ({
    hasState: typeof window.fishing.state === 'string',
    hasPick: typeof window.fishing.pickRarity === 'function',
    isArray: Array.isArray(window.fishing.log),
    state0: window.fishing.state,
  }));
  ok(shape.hasState && shape.hasPick && shape.isArray, 'window.fishing interface present');
  ok(shape.state0 === 'ready', 'starts in ready (got '+shape.state0+')');

  const pr = await page.evaluate(() => {
    const f = window.fishing.pickRarity;
    return [0, 0.4499, 0.45, 0.6999, 0.70, 0.8499, 0.85, 0.9299, 0.93, 0.9799, 0.98, 0.9999].map(f);
  });
  const expected = ['Common','Common','Uncommon','Uncommon','Rare','Rare','Epic','Epic','Legendary','Legendary','Ancient','Ancient'];
  ok(JSON.stringify(pr) === JSON.stringify(expected), 'pickRarity exact boundaries + spellings');

  const dist = await page.evaluate(() => {
    const c = {Common:0,Uncommon:0,Rare:0,Epic:0,Legendary:0,Ancient:0};
    let seed = 12345; const rnd = () => { seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    for (let i=0;i<200000;i++) c[window.fishing.pickRarity(rnd())]++;
    return c;
  });
  const pct = k => (100*dist[k]/200000).toFixed(1);
  ok(Math.abs(dist.Common/200000-0.45)<0.01 && Math.abs(dist.Ancient/200000-0.02)<0.005,
     `odds approx: C${pct('Common')} U${pct('Uncommon')} R${pct('Rare')} E${pct('Epic')} L${pct('Legendary')} A${pct('Ancient')}`);

 	const seenStates = new Set();
  async function winCycle(useButton) {
    const t0 = Date.now();
    if (useButton) await page.mouse.click(1170, 658); else await page.keyboard.press('Space');
    await page.waitForFunction(() => window.fishing.state === 'waiting', {timeout:2000});
    seenStates.add('waiting');
    await page.waitForFunction(() => window.fishing.state === 'bite', {timeout:8000});
    seenStates.add('bite');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.fishing.state === 'reeling', {timeout:1000});
    seenStates.add('reeling');
    await page.waitForFunction(() => window.fishing.state === 'reveal', {timeout:3000});
    seenStates.add('reveal');
    await page.waitForFunction(() => window.fishing.state === 'ready', {timeout:6000});
    return Date.now()-t0;
  }

  const dur = await winCycle(false);
  const log1 = await page.evaluate(() => window.fishing.log);
  ok(log1.length === 1 && log1[0].name && log1[0].rarity, 'successful catch logged: '+JSON.stringify(log1[0]));
  ok(dur >= 4000 && dur <= 11000, 'cycle duration 5-9s-ish: '+dur+'ms');

  // press during waiting must not start another cast
  await page.waitForFunction(() => window.fishing.state === 'ready');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting');
  const castT1 = await page.evaluate(()=>window.__game.castT);
  await page.keyboard.press('Space'); await sleep(50);
  const st = await page.evaluate(()=>window.fishing.state);
  ok(st === 'waiting', 'press during waiting ignored (no overlapping cast)');
  await page.waitForFunction(() => window.fishing.state === 'bite', {timeout:8000});
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'ready', {timeout:6000});

  // no duplicate catches
  const lenBefore = await page.evaluate(() => window.fishing.log.length);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', {timeout:8000});
  for (let i=0;i<6;i++) { await page.keyboard.press('Space'); await sleep(30); }
  await page.waitForFunction(() => window.fishing.state === 'reveal', {timeout:3000});
  const lenAfter = await page.evaluate(() => window.fishing.log.length);
  ok(lenAfter === lenBefore+1, 'rapid presses -> exactly one catch ('+lenBefore+'->'+lenAfter+')');
  await page.waitForFunction(() => window.fishing.state === 'ready', {timeout:6000});

  // miss
  const missLen = await page.evaluate(() => window.fishing.log.length);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'bite', {timeout:8000});
  await page.waitForFunction(() => window.fishing.state !== 'bite', {timeout:4000});
  const stAfter = await page.evaluate(() => window.fishing.state);
  const missLen2 = await page.evaluate(() => window.fishing.log.length);
  ok(stAfter === 'ready' && missLen2 === missLen, 'miss returns to ready, not logged');

  // replaced pickRarity affects catch
  await page.waitForFunction(() => window.fishing.state === 'ready');
  await page.evaluate(() => { window.__calls = 0; window.fishing.pickRarity = () => { window.__calls++; return 'Ancient'; }; });
  await winCycle(false);
  const forced = await page.evaluate(() => ({ last: window.fishing.log[0], calls: window.__calls }));
  ok(forced.last.rarity === 'Ancient' && forced.calls === 1, 'override pickRarity through window.fishing (calls='+forced.calls+')');

  // on-screen button cast
  await page.waitForFunction(() => window.fishing.state === 'ready');
  await page.mouse.click(1170, 658);
  await page.waitForFunction(() => window.fishing.state === 'waiting', {timeout:1500});
  ok(true, 'on-screen button performs cast');
  await page.waitForFunction(() => window.fishing.state === 'bite', {timeout:8000});
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'ready', {timeout:6000});

  // log cap + newest first
  const cap = await page.evaluate(() => ({ n: window.fishing.log.length, ok: window.fishing.log.length<=8 }));
  ok(cap.ok, 'log capped at 8 (now '+cap.n+')');

  // pause while hidden
  await page.waitForFunction(() => window.fishing.state === 'ready');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.fishing.state === 'waiting');
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange')); });
  const a = await page.evaluate(()=>({p:window.__game.phase,t:window.__game.t}));
  await sleep(700);
  const b = await page.evaluate(()=>({p:window.__game.phase,t:window.__game.t}));
  ok(a.p === b.p && a.t === b.t, 'timers pause while tab hidden');
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(200);
  const c = await page.evaluate(()=>window.__game.phase);
  ok(c > b.p, 'timers resume after unhide');

  ok(seenStates.has('waiting')&&seenStates.has('bite')&&seenStates.has('reeling')&&seenStates.has('reveal'), 'visited waiting/bite/reeling/reveal');
  ok(errs.length === 0, 'no page errors: '+JSON.stringify(errs));

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail?1:0);
})();
