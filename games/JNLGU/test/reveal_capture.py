import asyncio, time
from playwright.async_api import async_playwright

RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Ancient"]

async def wait_state(page, target, timeout=9.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if await page.evaluate("window.fishing.state") == target:
            return True
        await page.wait_for_timeout(50)
    return False

STATS_JS = r"""
() => {
  const cv=document.getElementById('game'); const g=cv.getContext('2d');
  function region(x,y,w,h){
    const d=g.getImageData(x,y,w,h).data; let n=0, bright=0, rs=0,gs=0,bs=0;
    for(let i=0;i<d.length;i+=4){ n++; rs+=d[i];gs+=d[i+1];bs+=d[i+2];
      if((d[i]+d[i+1]+d[i+2])/3 > 40) bright++; }
    return {avg:[Math.round(rs/n),Math.round(gs/n),Math.round(bs/n)], brightFrac:+(bright/n).toFixed(3)};
  }
  // fish portrait box roughly center 640, 317, 256x176
  return {
    fish: region(512, 229, 256, 176),
    panelTop: region(410, 195, 460, 20),
    namePlate: region(446, 419, 388, 44),
    center: region(600, 300, 80, 60),
  };
}
"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width":1280,"height":720})
        errs=[]
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(500)
        await page.evaluate("window.__orig = window.fishing.pickRarity")
        for rar in RARITIES:
            await page.evaluate(f"window.fishing.pickRarity = () => '{rar}'")
            await page.keyboard.press("Space")
            if not await wait_state(page, "bite", 8):
                print("FAIL no bite", rar); continue
            await page.keyboard.press("Space")
            if not await wait_state(page, "reveal", 4):
                print("FAIL no reveal", rar); continue
            await page.wait_for_timeout(700)
            await page.screenshot(path=f"/home/agent/work/shots/reveal_{rar}.png")
            stats = await page.evaluate(STATS_JS)
            print(rar, stats)
            await wait_state(page, "ready", 4)
        print("ERRORS", errs)
        await browser.close()

asyncio.run(main())
