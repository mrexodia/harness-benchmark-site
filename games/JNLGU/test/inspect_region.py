import asyncio, sys
from playwright.async_api import async_playwright

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
    [' ', [40,120,170]], ['.', [120,190,210]], ['c', [248,252,255]],
    ['f', [255,230,170]], ['~', [52,140,165]], [':', [40,100,125]],
    ['m', [90,180,180]], ['w', [148,96,55]], ['W', [185,138,86]],
    ['x', [69,42,21]], ['s', [227,201,141]], ['g', [92,154,57]],
    ['G', [63,115,48]], ['#', [43,82,38]], ['R', [121,133,143]],
    ['k', [232,176,136]], ['r', [200,90,72]], ['b', [65,90,125]],
    ['y', [230,193,101]], ['B', [30,26,22]], ['T', [47,77,85]],
  ];
  const x0=opts.x0, y0=opts.y0, x1=opts.x1, y1=opts.y1, stepX=opts.stepX, stepY=opts.stepY;
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
      for (const [ch,[pr,pg,pb]] of pal){ const d=(r-pr)**2+(gg-pg)**2+(b-pb)**2; if (d<bd){bd=d;best=ch;} }
      line+=best;
    }
    lines.push(line);
  }
  return lines.join('\n');
}
"""

async def main():
    region = sys.argv[1] if len(sys.argv) > 1 else "angler"
    regions = {
        "angler": (90, 108, 142, 152, 1, 1),
        "bobber": (170, 78, 260, 122, 1, 1),
        "palm": (238, 58, 320, 180, 1, 2),
        "dock": (40, 108, 190, 180, 2, 2),
    }
    x0, y0, x1, y1, sx, sy = regions[region]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        await pg.goto("http://127.0.0.1:8000/")
        await pg.wait_for_timeout(500)
        print(f"=== {region} x{x0}-{x1} y{y0}-{y1} ===")
        print(await pg.evaluate(PALETTE_JS, {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "stepX": sx, "stepY": sy}))
        await b.close()

asyncio.run(main())
