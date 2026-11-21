import asyncio, os
from playwright.async_api import async_playwright

OUT = "/home/agent/work/shots"
os.makedirs(OUT, exist_ok=True)

# Reconstruct the logical 320x180 scene by sampling the 4x canvas, then print ASCII.
RENDER_JS = r"""
(opts) => {
  const cv = document.getElementById('game');
  const g = cv.getContext('2d');
  const img = g.getImageData(0, 0, 1280, 720).data;
  function sceneAt(sx, sy){
    const x = Math.min(1279, sx*4+2), y = Math.min(719, sy*4+2);
    const i = (y*1280+x)*4; return [img[i],img[i+1],img[i+2]];
  }
  const x0 = opts.x0||0, y0 = opts.y0||0, x1 = opts.x1||320, y1 = opts.y1||180;
  const stepX = opts.stepX||2, stepY = opts.stepY||2;
  const ramp = ' .:-=+*#%@';
  let lines = [];
  for (let y=y0; y<y1; y+=stepY){
    let lum='', hue='';
    for (let x=x0; x<x1; x+=stepX){
      let r=0,gg=0,b=0,n=0;
      for (let dy=0; dy<stepY; dy++) for (let dx=0; dx<stepX; dx++){
        const c = sceneAt(x+dx, y+dy); r+=c[0]; gg+=c[1]; b+=c[2]; n++;
      }
      r/=n; gg/=n; b/=n;
      const L=(0.299*r+0.587*gg+0.114*b)/255;
      lum += ramp[Math.min(9, Math.max(0, Math.round(L*9)))];
      hue += hueChar(r,gg,b);
    }
    lines.push(lum + '   |   ' + hue);
  }
  return lines.join('\n');
  function hueChar(r,gg,b){
    const mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), sat=mx-mn, lum=(r+gg+b)/3;
    if (lum<18) return ' ';
    if (sat<18) return lum<70?'#':lum<150?'+':'o';
    if (b>=r && b>=gg){ if (b>140&&gg>120) return '~'; if (b>r+15) return ':'; return 'o'; }
    if (gg>=r && gg>=b) return lum>90?'#':'.';
    if (r>140&&gg<130&&b<120) return 'r';
    if (r>150&&gg>110&&b<110) return 'y';
    return lum>140?'w':'v';
  }
}
"""

async def render(page, label, **opts):
    o = {"stepX": 2, "stepY": 2}
    o.update(opts)
    print(f"=== {label} ===")
    print(await page.evaluate(RENDER_JS, o))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(1000)
        await render(page, "FULL SCENE (left=luminance, right=hue)")
        # angler close-up
        await render(page, "ANGLER CLOSE-UP x88-140 y108-152", x0=88, y0=108, x1=140, y1=152, stepX=1, stepY=1)
        # dock + bobber
        await render(page, "DOCK+WATER x40-260 y80-170", x0=40, y0=80, x1=260, y1=170, stepX=2, stepY=2)
        print("ERRORS", errs)
        await browser.close()

asyncio.run(main())
