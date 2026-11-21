const { chromium } = require("playwright");

const CLASSES = {
  "~": ["#14506f","#1b5f83","#2477a0","#2f8cb4","#49a6c9","#a8e3ec","#e2f8fc"],
  ".": ["#c2934f","#dcb877","#efd8a3","#f7ebc9"],
  "#": ["#2c5a29","#3d7c33","#4c8f3b","#63aa46","#86c75a","#245021","#35722c","#458a38","#5fa844","#7cc356"],
  "W": ["#4f331d","#7d5230","#96653c","#b07f4e","#5b3a1f","#79512d"],
  "@": ["#e6b184","#c68c5e","#5a3b22","#c85c4a","#9c4136","#e07a63","#3d6f9e","#2a5178","#d9b96b","#b3934b","#ecd58f","#463526","#6b4a2a","#8c6538"],
  "o": ["#525c66","#77828e","#9aa5b0"],
  "*": ["#e06a8c","#f39ab4","#f2c14e","#f8dd8e","#f3f0dc","#a25cc0"],
  "k": ["#17232b"],
  "r": ["#e0503f","#a8322a","#f4f2e6","#20242c","#141820"],
  "e": ["#9fb4a5","#6ec06a","#57a9e8","#b06ae0","#4fd7c6","#6f8a78","#3f8f43","#2f6fb0","#6f38a0","#1f8a86"],
};
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function classify(r,g,b) {
  let best = "?", bd = 1e9;
  for (const [ch, list] of Object.entries(CLASSES))
    for (const h of list) {
      const [rr,gg,bb] = hexRGB(h);
      const d = (rr-r)**2 + (gg-g)**2 + (bb-b)**2;
      if (d < bd) { bd = d; best = ch; }
    }
  return bd < 3000 ? best : "?";
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  async function sceneMap(tag, step = 4) {
    const map = await page.evaluate(({ step, CLASSES }) => {
      function hexRGB(h){const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
      const cc={}; for(const k in CLASSES) cc[k]=CLASSES[k].map(hexRGB);
      function cls(r,g,b){let best="?",bd=1e9;for(const k in cc)for(const [rr,gg,bb] of cc[k]){const d=(rr-r)**2+(gg-g)**2+(bb-b)**2;if(d<bd){bd=d;best=k;}}return bd<3000?best:"?";}
      const c=document.getElementById("scene");
      const g=c.getContext("2d");
      const d=g.getImageData(0,0,320,180).data;
      let out="";
      for(let y=0;y<180;y+=step){let line="";for(let x=0;x<320;x+=step){const i=(y*320+x)*4;line+=cls(d[i],d[i+1],d[i+2]);}out+=line+"\n";}
      return out;
    }, { step, CLASSES });
    console.log("==== SCENE " + tag + " ====");
    console.log(map);
  }

  await sceneMap("ready/intro");
  await page.keyboard.press("Space");
  await page.waitForTimeout(1000);
  await sceneMap("waiting");
  // wait for bite
  let st = "waiting";
  for (let i = 0; i < 80 && st !== "bite"; i++) { await page.waitForTimeout(120); st = await page.evaluate(()=>window.fishing.state); }
  await page.waitForTimeout(150);
  await sceneMap("bite");
  await page.keyboard.press("Space");
  await page.waitForTimeout(1600);
  await sceneMap("reveal-scene");

  // dump a few fish sprites as ascii
  const fishes = await page.evaluate(() => {
    const names = ["Bluegill","Rainbow Trout","Frostfin","Stormscale","Emberfin Koi","Tidewrought Idol"];
    const res = {};
    for (const n of names) {
      const sp = SPECIES.find(s => s.name === n);
      const g = sp.canvas.getContext("2d");
      const d = g.getImageData(0,0,sp.canvas.width,sp.canvas.height).data;
      let out = [];
      for (let y=0;y<sp.canvas.height;y++){let line="";for(let x=0;x<sp.canvas.width;x++){const i=(y*sp.canvas.width+x)*4;line += d[i+3]<40?" ": (d[i]>200&&d[i+1]>200&&d[i+2]>200?"O": (d[i]+d[i+1]+d[i+2]<160?"#":"@"));}out.push(line);}
      res[n] = out.join("\n");
    }
    return res;
  });
  for (const n in fishes) { console.log("==== FISH " + n + " ===="); console.log(fishes[n]); }

  await browser.close();
})();
