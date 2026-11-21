const { chromium } = require('playwright');
function classify(r,g,b){
  r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  const v=max,s=max===0?0:d/max;let h=0;
  if(d!==0){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}
  if(h<0)h+=360;
  if(v<0.20)return'#';
  if(s<0.15)return v>0.78?'o':(v>0.45?'r':' ');
  if(h<25||h>=330)return'R'; if(h<45)return'Y'; if(h<70)return'y';
  if(h<160)return'G'; if(h<200)return'C'; if(h<250)return'B'; return'P';
}
async function map(page, id, crop, step){
  const rows = await page.evaluate(({id,crop,step})=>{
    const g=document.getElementById(id).getContext('2d');
    const out=[];
    for(let y=crop.y;y<crop.y+crop.h;y+=step){const row=[];
      for(let x=crop.x;x<crop.x+crop.w;x+=step){
        const d=g.getImageData(x,y,1,1).data; row.push([d[0],d[1],d[2],d[3]]);}
      out.push(row);}
    return out;
  },{id,crop,step});
  let t='';for(const row of rows)t+=row.map(c=>c[3]<20?' ':classify(c[0],c[1],c[2])).join('')+'\n';
  return t;
}
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1280,height:720}});
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.fishing&&window.fishing.state);
  const ev=(f,a)=>page.evaluate(f,a);
  // Force a Legendary catch, walk states, capture.
  await ev(()=>{ if(window.__game){window.__game.introTimer=0; window.__game.t=5; } });
  await page.waitForTimeout(200);
  console.log('===== SCENE ready ====='); console.log(await map(page,'scene',{x:0,y:0,w:320,h:180},4));
  // cast
  await page.keyboard.press('Space'); await page.waitForTimeout(350);
  console.log('===== SCENE waiting (mid cast) ====='); console.log(await map(page,'scene',{x:0,y:0,w:320,h:180},4));
  await page.waitForFunction(()=>window.fishing.state==='bite',{timeout:8000});
  await page.waitForTimeout(120);
  console.log('===== SCENE bite ====='); console.log(await map(page,'scene',{x:0,y:0,w:320,h:180},4));
  // force legendary reveal
  await ev(()=>{ window.fishing.pickRarity=()=> 'Legendary'; window.__game.startReel(); });
  await page.waitForFunction(()=>window.fishing.state==='reveal',{timeout:3000});
  await page.waitForTimeout(500);
  console.log('===== UI reveal (whole 1280x720 at 16px) ====='); console.log(await map(page,'ui',{x:0,y:0,w:1280,h:720},16));
  console.log('===== UI reveal card crop (640x420 at 8px) ====='); console.log(await map(page,'ui',{x:330,y:130,w:620,h:420},8));
  await b.close();
})();
