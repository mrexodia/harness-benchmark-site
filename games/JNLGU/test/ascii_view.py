import asyncio, os, sys
from playwright.async_api import async_playwright

OUT = "/home/agent/work/shots"
os.makedirs(OUT, exist_ok=True)

ANALYZE_JS = r"""
() => {
  const cv = document.getElementById('game');
  const g = cv.getContext('2d');
  const W = 1280, H = 720;
  const img = g.getImageData(0, 0, W, H).data;
  const cols = 96, rows = 40;
  const cw = W / cols, ch = H / rows;
  let out = [];
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < cols; rx++) {
      let r=0,gg=0,b=0,n=0;
      const x0 = Math.floor(rx*cw), x1 = Math.floor((rx+1)*cw);
      const y0 = Math.floor(ry*ch), y1 = Math.floor((ry+1)*ch);
      for (let y=y0;y<y1;y+=2) for (let x=x0;x<x1;x+=2){
        const i=(y*W+x)*4; r+=img[i]; gg+=img[i+1]; b+=img[i+2]; n++;
      }
      r/=n; gg/=n; b/=n;
      line += classify(r,gg,b);
    }
    out.push(line);
  }
  return out.join('\n');
  function classify(r,gg,b){
    const mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), lum=(r+gg+b)/3;
    const sat = mx-mn;
    if (lum < 22) return ' ';
    if (lum > 235 && sat < 30) return '@';
    if (sat < 22) return lum<70?'#':lum<150?'+':'o';
    if (b >= r && b >= gg) {
      if (b > 150 && gg > 150) return '~';
      if (b > r + 20) return b>170?'~':':';
      return 'o';
    }
    if (gg >= r && gg >= b) return lum>90?'#':'.';
    // red dominant
    if (r > 150 && gg < 130 && b < 120) return 'r';
    if (r > 150 && gg > 110 && b < 110) return 'y';
    if (r > gg) return lum>140?'w':'v';
    return '?';
  }
}
"""

async def snap(page, name):
    await page.screenshot(path=f"{OUT}/{name}.png")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(f"{m.type}:{m.text}") if m.type == "error" else None)
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(1200)
        print("=== INITIAL SCENE (96x40) ===")
        print(await page.evaluate(ANALYZE_JS))
        await snap(page, "02_ascii_initial")

        # sample specific regions
        reg = await page.evaluate("""() => {
          const cv=document.getElementById('game'); const g=cv.getContext('2d');
          function avg(x,y,w,h){const d=g.getImageData(x,y,w,h).data;let r=0,gg=0,b=0,n=0;
            for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2];n++;}return [Math.round(r/n),Math.round(gg/n),Math.round(b/n)];}
          return {
            skyTop: avg(640,10,40,10),
            skyHorizon: avg(640,230,40,10),
            waterMid: avg(700,380,40,20),
            bankBottom: avg(200,700,40,10),
            leftPanel: avg(60,100,40,20),
            rightPanel: avg(1060,100,40,20),
            centerDock: avg(420,560,40,20),
          };
        }""")
        print("REGIONS", reg)
        print("ERRORS", errs)
        await browser.close()

asyncio.run(main())
