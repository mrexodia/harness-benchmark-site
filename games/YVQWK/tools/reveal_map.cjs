const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function cls(r,g,b,a){ if(a<12) return ' '; const l=(r*0.299+g*0.587+b*0.114)/255; return l<0.12?'@':l<0.3?'#':l<0.55?'+':l<0.8?'*':'O'; }
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:720}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8000/',{waitUntil:'load'}); await p.waitForTimeout(300);
  const tiers=['Common','Uncommon','Rare','Epic','Legendary','Ancient'];
  const which = process.argv[2] || 'Common';
  await p.evaluate((t)=>{ window.__orig=window.fishing.pickRarity; window.fishing.pickRarity=()=>t; }, which);
  const press=()=>p.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true})));
  async function state(){return p.evaluate(()=>window.fishing.state);}
  async function waitFor(s,ms=6000){const t0=Date.now();while(Date.now()-t0<ms){if(await state()===s)return true;await sleep(40);}return false;}
  await press(); await waitFor('bite'); await press(); await waitFor('reveal');
  await sleep(700);
  const info=await p.evaluate(()=>{const g=window.__game;const c=document.getElementById('ui');const x=c.getContext('2d');const im=x.getImageData(0,0,1280,720).data;return {name:g.pending.name,rarity:g.pending.rarity,t:g.revealT,d:Array.from(im)};});
  console.log('=== REVEAL', info.rarity, '-', info.name, 't=', info.t.toFixed(2), '===');
  const step=7;
  for(let y=120;y<560;y+=step){ let row=''; for(let x=300;x<980;x+=step){ let r=0,g=0,bb=0,aa=0,n=0;
    for(let dy=0;dy<step;dy++)for(let dx=0;dx<step;dx++){const i=(((y+dy)*1280)+(x+dx))*4;r+=info.d[i];g+=info.d[i+1];bb+=info.d[i+2];aa+=info.d[i+3];n++;}
    row+=cls(r/n,g/n,bb/n,aa/n);} console.log(row);}
  console.log('errors:', errs.length?errs.join('|'):'none');
  await b.close();
})();
