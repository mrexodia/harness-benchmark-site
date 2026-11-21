import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"
RAMP = " .:-=+*#%@"

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        errs=[]
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(URL); page.wait_for_timeout(500)
        for rarity in ["Common","Uncommon","Rare","Epic","Legendary","Ancient"]:
            page.evaluate(f"window.fishing.pickRarity = () => '{rarity}'")
            page.keyboard.press("Space")
            for _ in range(300):
                if page.evaluate("window.fishing.state")=="bite": break
                page.wait_for_timeout(30)
            page.keyboard.press("Space")
            for _ in range(120):
                if page.evaluate("window.fishing.state")=="reveal": break
                page.wait_for_timeout(30)
            page.wait_for_timeout(250)
            im = page.evaluate("""() => {
                const c=document.getElementById('revealFish');
                const im=c.getContext('2d').getImageData(0,0,c.width,c.height);
                return {w:im.width,h:im.height,d:Array.from(im.data),
                        name:document.getElementById('revealName').textContent,
                        cls:document.getElementById('revealCard').className};
            }""")
            W,H,d = im['w'],im['h'],im['d']
            print(f"--- {rarity}: {im['name']}  ({W}x{H}) [{im['cls']}] ---")
            ds=3
            for y in range(0,H,ds):
                row=''
                for x in range(0,W,ds):
                    tot=0;n=0
                    for yy in range(y,min(y+ds,H)):
                        for xx in range(x,min(x+ds,W)):
                            i=(yy*W+xx)*4
                            a=d[i+3]
                            if a<20:
                                tot+=0
                            else:
                                tot+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]
                            n+=1
                    lum=tot/n
                    row+=RAMP[min(len(RAMP)-1,int(lum/25.6))]
                print(row)
            # close reveal
            page.keyboard.press("Space")
            page.wait_for_timeout(200)
        print("ERRORS:", errs)
        b.close()

main()
