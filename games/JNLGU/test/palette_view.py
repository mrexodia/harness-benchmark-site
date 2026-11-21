import asyncio, os
from playwright.async_api import async_playwright

OUT = "/home/agent/work/shots"
os.makedirs(OUT, exist_ok=True)

# Map each logical scene pixel to the nearest palette entry for a clean structural view.
PALETTE_JS = r"""
(opts) => {
  const cv = document.getElementById('game');
  const g = cv.getContext('2d');
  const img = g.getImageData(0, 0, 1280, 720).data;
  function sceneAt(sx, sy){
    const x = Math.min(1279, sx*4+2), y = Math.min(719, sy*4+2);
    const i = (y*1280+x)*4; return [img[i],img[i+1],img[i+2]];
  }
  const pal = [
    [' ', [40,120,170]],   // sky blue
    ['.', [120,190,210]],  // sky light
    ['c', [248,252,255]],  // cloud/sun
    ['f', [255,230,170]],  // sun glow / horizon
    ['~', [52,140,165]],   // water mid
    [':', [40,100,125]],   // water deep
    ['m', [90,180,180]],   // water light
    ['w', [148,96,55]],    // wood mid
    ['W', [185,138,86]],   // wood light
    ['x', [69,42,21]],     // wood dark
    ['s', [227,201,141]],  // sand
    ['g', [92,154,57]],    // grass
    ['G', [63,115,48]],    // grass dark
    ['#', [43,82,38]],     // grass darker
    ['R', [121,133,143]],  // rock
    ['k', [232,176,136]],  // skin
    ['r', [200,90,72]],    // shirt red
    ['b', [65,90,125]],    // pants blue
    ['y', [230,193,101]],  // straw
    ['B', [60,63,70]],     // dark outline
    ['T', [47,77,85]],     // ancient/dark teal
  ];
  const x0 = opts.x0||0, y0 = opts.y0||0, x1 = opts.x1||320, y1 = opts.y1||180;
  const stepX = opts.stepX||2, stepY = opts.stepY||2;
  let lines = [];
  for (let y=y0; y<y1; y+=stepY){
    let line='';
    for (let x=x0; x<x1; x+=stepX){
      let r=0,gg=0,b=0,n=0;
      for (let dy=0; dy<stepY; dy++) for (let dx=0; dx<stepX; dx++){
        const c=sceneAt(x+dx,y+dy); r+=c[0]; gg+=c[1]; b+=c[2]; n++;
      }
      r/=n; gg/=n; b/=n;
      let best='?', bd=1e9;
      for (const [ch,[pr,pg,pb]] of pal){
        const d=(r-pr)**2+(gg-pg)**2+(b-pb)**2;
        if (d<bd){bd=d;best=ch;}
      }
      line+=best;
    }
    lines.push(line);
  }
  return lines.join('\n');
}
"""

async def render(page, label, **opts):
    o={"stepX":2,"stepY":2}; o.update(opts)
    print(f"=== {label} ===")
    print(await page.evaluate(PALETTE_JS, o))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width":1280,"height":720})
        errs=[]
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(800)
        await render(page, "PALETTE MAP 160x90")
        await render(page, "ANGLER x92-140 y112-152", x0=92,y0=112,x1=140,y1=152,stepX=1,stepY=1)
        print("ERRORS", errs)
        await browser.close()

asyncio.run(main())
