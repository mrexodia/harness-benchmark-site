import asyncio, json
from playwright.async_api import async_playwright

JS = r"""
async (opts) => {
  const { drawScene, GEO } = await import('/js/scene.js');
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
  function find(rgb, tol, box){
    let n=0,minx=999,miny=999,maxx=-1,maxy=-1;
    for(let y=0;y<SH;y++)for(let x=0;x<SW;x++){
      if(box && (x<box[0]||x>box[2]||y<box[1]||y>box[3])) continue;
      const i=(y*SW+x)*4;
      if(Math.abs(img[i]-rgb[0])<tol && Math.abs(img[i+1]-rgb[1])<tol && Math.abs(img[i+2]-rgb[2])<tol){
        n++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
      }
    }
    return {n, bbox:n?[minx,miny,maxx,maxy]:null};
  }
  return {
    geo:{rodTip:GEO.rodTipRest, angler:GEO.angler, zone:GEO.castZone},
    bobberRed: find([224,73,63], 30),
    bobberWhite: find([244,240,230], 22, [150,60,300,140]),
    biteYellow: find([255,243,176], 25, [150,50,300,120]),
    lantern: find([255,207,114], 30, [150,90,190,130]),
    splash: find([232,248,241], 18, [180,70,260,130]),
  };
}
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":1280,"height":720})
        await pg.goto("http://127.0.0.1:8000/")
        await pg.wait_for_timeout(300)
        for name, view in [
            ("waiting", {"state":"waiting"}),
            ("bite", {"state":"bite","biteDip":3,"bobberSub":2,"splashT":1}),
            ("ready", {"state":"ready","lineVisible":False}),
        ]:
            r = await pg.evaluate(JS, {"view": view, "t": 1.0})
            print(name, json.dumps(r))
        await b.close()

asyncio.run(main())
