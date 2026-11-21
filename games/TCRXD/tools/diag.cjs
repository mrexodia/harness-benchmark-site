const { chromium } = require('playwright');
// Classify by hue/sat/val into readable categories.
function classify(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  const v=max, s=max===0?0:d/max;
  let h=0;
  if(d!==0){
    if(max===r) h=60*(((g-b)/d)%6);
    else if(max===g) h=60*((b-r)/d+2);
    else h=60*((r-g)/d+4);
  }
  if(h<0)h+=360;
  if(v<0.20) return '#';            // near black
  if(s<0.15) return v>0.78?'o':(v>0.45?'r':'.'); // white/gray/sky
  if(h<25||h>=330) return 'R';      // red
  if(h<45) return 'Y';              // orange/brown/yellow
  if(h<70) return 'y';              // yellow-green
  if(h<160) return 'G';             // green
  if(h<200) return 'C';             // cyan
  if(h<250) return 'B';             // blue
  return 'P';                        // purple/magenta
}
(async () => {
  const step = parseInt(process.argv[2] || '4', 10);
  const block = parseInt(process.argv[3] || '1', 10);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.fishing && window.fishing.state);
  await page.evaluate(() => { if (window.__game) window.__game.introTimer = 0; });
  await page.waitForTimeout(300);
  const rows = await page.evaluate(({step,block}) => {
    const g = document.getElementById('scene').getContext('2d');
    const d = g.getImageData(0,0,320,180).data;
    const out=[];
    for (let y=0;y<180;y+=step){
      const row=[];
      for (let x=0;x<320;x+=step){
        let r=0,gg=0,b=0,n=0;
        for(let yy=y;yy<Math.min(180,y+step);yy++)for(let xx=x;xx<Math.min(320,x+step);xx++){
          const i=(yy*320+xx)*4; r+=d[i];gg+=d[i+1];b+=d[i+2];n++;
        }
        row.push([r/n,gg/n,b/n]);
      }
      out.push(row);
    }
    return out;
  }, {step,block});
  const cs = rows.map(row=>row.map(c=>classify(c[0],c[1],c[2])));
  let txt='';
  for(let y=0;y<cs.length;y+=block){
    for(let x=0;x<cs[0].length;x+=block){
      // majority vote in block
      const tally={};
      for(let yy=y;yy<Math.min(cs.length,y+block);yy++)for(let xx=x;xx<Math.min(cs[0].length,x+block);xx++){tally[cs[yy][xx]]=(tally[cs[yy][xx]]||0)+1;}
      let best='?',bn=-1;for(const k in tally)if(tally[k]>bn){bn=tally[k];best=k;}
      txt+=best;
    }
    txt+='\n';
  }
  console.log(txt);
  console.log('legend: # dark o white r gray . pale R red Y orange/brown y ylwgrn G green C cyan B blue P purple');
  console.log('pageerrors:', JSON.stringify(errs));
  await browser.close();
})();
