const { chromium } = require('playwright');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1280,height:720}});
  await p.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.fishing&&window.fishing.state);
  await sleep(400);
  await p.screenshot({path:'/tmp/fishing_01_ready.png'});
  // cast
  await p.keyboard.press('Space'); await sleep(300);
  await p.screenshot({path:'/tmp/fishing_02_cast.png'});
  await p.waitForFunction(()=>window.fishing.state==='bite',{timeout:8000});
  await sleep(120);
  await p.screenshot({path:'/tmp/fishing_03_bite.png'});
  await p.keyboard.press('Space');
  await p.waitForFunction(()=>window.fishing.state==='reveal',{timeout:3000});
  await sleep(700);
  await p.screenshot({path:'/tmp/fishing_04_reveal.png'});
  await p.waitForFunction(()=>window.fishing.state==='ready',{timeout:6000});
  // miss
  await p.keyboard.press('Space');
  await p.waitForFunction(()=>window.fishing.state==='bite',{timeout:8000});
  await p.waitForFunction(()=>window.fishing.state==='ready',{timeout:5000});
  await sleep(200);
  await p.screenshot({path:'/tmp/fishing_05_miss.png'});
  console.log('captured');
  await b.close();
})();
