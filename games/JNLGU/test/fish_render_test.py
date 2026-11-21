import asyncio, json
from playwright.async_api import async_playwright

FISH_TEST_JS = r"""
async () => {
  const mod = await import('/js/fish.js');
  const { FISH, drawFish } = mod;
  const out = {};
  for (const [rar, list] of Object.entries(FISH)) {
    out[rar] = [];
    for (const spec of list) {
      const cv = document.createElement('canvas'); cv.width=96; cv.height=56;
      const g = cv.getContext('2d');
      drawFish(g, spec, 48, 28, 1.234, 1);
      const d = g.getImageData(0,0,96,56).data;
      let minx=999,miny=999,maxx=-1,maxy=-1,n=0;
      const colors = new Set();
      for (let y=0;y<56;y++) for (let x=0;x<96;x++){
        const i=(y*96+x)*4;
        if (d[i+3] > 12){ n++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
          colors.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4)); }
      }
      out[rar].push({name:spec.name, pixels:n, bbox:[minx,miny,maxx,maxy], colors:colors.size});
    }
  }
  return out;
}
"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width":1280,"height":720})
        errs=[]
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(400)
        data = await page.evaluate(FISH_TEST_JS)
        for rar, arr in data.items():
            for f in arr:
                ok = f["pixels"] > 300 and f["colors"] > 3 and f["bbox"][2] > f["bbox"][0]
                print(("PASS" if ok else "FAIL"), rar, f)
        print("ERRORS", errs)
        await browser.close()

asyncio.run(main())
