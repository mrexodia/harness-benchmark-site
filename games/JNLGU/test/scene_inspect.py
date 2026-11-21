import asyncio, sys
from playwright.async_api import async_playwright

# Render the scene module directly to a test canvas (no HUD) and classify pixels.
JS = r"""
async (opts) => {
  const { drawScene } = await import('/js/scene.js');
  const SW=320, SH=180;
  const cv=document.createElement('canvas'); cv.width=SW; cv.height=SH;
  const g=cv.getContext('2d');
  const view = Object.assign({
    state:'waiting', casting:false, castProgress:1, biteDip:0,
    lineVisible:true, miss:false, splashT:0, bobberSub:0,
    bobber:{x:210,y:98},
  }, opts.view||{});
  drawScene(g, opts.t||1.0, view);
  const img=g.getImageData(0,0,SW,SH).data;
  function at(x,y){const i=(y*SW+x)*4;return [img[i],img[i+1],img[i+2]];}
  const pal = [
    [' ', [40,120,170]], ['.', [120,190,210]], ['c', [248,252,255]],
    ['f', [255,230,170]], ['~', [52,140,165]], [':', [40,100,125]],
    ['m', [90,180,180]], ['w', [148,96,55]], ['W', [185,138,86]],
    ['x', [69,42,21]], ['s', [227,201,141]], ['g', [92,154,57]],
    ['G', [63,115,48]], ['#', [43,82,38]], ['R', [121,133,143]],
    ['k', [232,176,136]], ['r', [200,90,72]], ['b', [65,90,125]],
    ['y', [230,193,101]], ['B', [30,26,22]], ['T', [47,77,85]],
  ];
  const x0=opts.x0||0,y0=opts.y0||0,x1=opts.x1||320,y1=opts.y1||180;
  const stepX=opts.stepX||2, stepY=opts.stepY||2;
  let lines=[];
  for(let y=y0;y<y1;y+=stepY){ let line='';
    for(let x=x0;x<x1;x+=stepX){ let r=0,gg=0,b=0,n=0;
      for(let dy=0;dy<stepY;dy++)for(let dx=0;dx<stepX;dx++){const c=at(Math.min(SW-1,x+dx),Math.min(SH-1,y+dy));r+=c[0];gg+=c[1];b+=c[2];n++;}
      r/=n;gg/=n;b/=n; let best='?',bd=1e9;
      for(const [ch,[pr,pg,pb]] of pal){const d=(r-pr)**2+(gg-pg)**2+(b-pb)**2;if(d<bd){bd=d;best=ch;}}
      line+=best; }
    lines.push(line); }
  return lines.join('\n');
}
"""

STATES = {
    "waiting": {"state": "waiting", "bobber": {"x": 210, "y": 98}},
    "bite": {"state": "bite", "biteDip": 3, "bobberSub": 2, "bobber": {"x": 210, "y": 98}, "splashT": 1},
    "ready": {"state": "ready", "lineVisible": False},
}

async def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "waiting"
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        await pg.goto("http://127.0.0.1:8000/")
        await pg.wait_for_timeout(300)
        print(f"=== SCENE [{which}] (2px cells) ===")
        print(await pg.evaluate(JS, {"view": STATES[which], "t": 1.0}))
        await b.close()

asyncio.run(main())
