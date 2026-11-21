const { chromium } = require('playwright');
const fs = require('fs');

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[];
  page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text());});
  await page.goto('http://127.0.0.1:8000/', { waitUntil:'networkidle' });
  await page.waitForTimeout(300);

  const st = ()=>page.evaluate(()=>window.fishing.state);
  const log = ()=>page.evaluate(()=>window.fishing.log);
  const shot = (n)=>page.screenshot({path:'/tmp/'+n+'.png'});

  console.log('initial state:', await st());
  console.log('pickRarity checks:');
  const pr = await page.evaluate(()=>{
    const f=window.fishing.pickRarity;
    const tests=[0,0.4499,0.45,0.6999,0.70,0.8499,0.85,0.9299,0.93,0.9799,0.98,0.99999];
    return tests.map(u=>[u,f(u)]);
  });
  console.log(pr.map(([u,r])=>u+'->'+r).join('  '));
  const pure = await page.evaluate(()=>{
    // ensure it doesn't depend on state
    return window.fishing.pickRarity(0.1)+','+window.fishing.pickRarity(0.1);
  });
  console.log('purity:', pure);

  // ---- successful cycle ----
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  console.log('after cast:', await st());
  await shot('cast');
  // wait for bite
  let ok=false;
  for(let i=0;i<80;i++){ if(await st()==='bite'){ok=true;break;} await sleep(50); }
  console.log('reached bite:', ok, 'state', await st());
  await shot('bite');
  const logBefore = (await log()).length;
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  console.log('after reel press:', await st());
  // double press quickly to ensure no duplicate
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  for(let i=0;i<60;i++){ if(await st()==='reveal')break; await sleep(50);}
  console.log('at reveal:', await st());
  await page.waitForTimeout(300);
  await shot('reveal');
  const lg = await log();
  console.log('log after catch:', JSON.stringify(lg));
  console.log('log grew by', lg.length-logBefore);
  // dismiss
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  console.log('after dismiss:', await st());

  // ---- miss cycle ----
  await page.keyboard.press('Space');
  for(let i=0;i<80;i++){ if(await st()==='bite')break; await sleep(50);}
  console.log('miss: reached bite', await st());
  await shot('bite2');
  // do not press; wait out window
  for(let i=0;i<60;i++){ if(await st()==='ready')break; await sleep(50);}
  console.log('after window (miss):', await st());
  const lg2 = await log();
  console.log('log unchanged on miss:', lg2.length);
  await shot('missed');
  await sleep(1200);

  // ---- force each rarity for art verification ----
  for (const r of ['Common','Uncommon','Rare','Epic','Legendary','Ancient']) {
    await page.evaluate((rr)=>{ window.fishing.pickRarity = ()=>rr; }, r);
    await page.keyboard.press('Space');
    for(let i=0;i<90;i++){ if(await st()==='bite')break; await sleep(40);}
    await page.keyboard.press('Space');
    for(let i=0;i<70;i++){ if(await st()==='reveal')break; await sleep(40);}
    await page.waitForTimeout(500);
    await shot('rarity_'+r);
    const l = await log();
    console.log('forced', r, '-> log[0]=', JSON.stringify(l[0]));
    await page.waitForTimeout(400);
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }

  // total log cap
  console.log('final log length (cap 8):', (await log()).length);

  if(errs.length) console.log('ERRORS:', errs);
  else console.log('no page errors');
  await browser.close();
})();
