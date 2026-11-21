import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"
RAMP = " .:-=+*#%@"

def grab(page, state):
    if state != 'ready':
        page.keyboard.press("Space")
        if state == 'waiting':
            page.wait_for_timeout(1300)
        elif state in ('bite', 'reveal'):
            for _ in range(200):
                if page.evaluate("window.fishing.state") == 'bite':
                    break
                page.wait_for_timeout(50)
            if state == 'reveal':
                page.keyboard.press("Space")
                for _ in range(80):
                    if page.evaluate("window.fishing.state") == 'reveal':
                        break
                    page.wait_for_timeout(50)
        page.wait_for_timeout(300)
    return page.evaluate("""() => {
        const c=document.getElementById('game');
        const ctx=c.getContext('2d');
        const im=ctx.getImageData(0,0,c.width,c.height);
        return {w:im.width,h:im.height,d:Array.from(im.data)};
    }""")

def main():
    state = sys.argv[1] if len(sys.argv) > 1 else 'ready'
    ds = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        page.goto(URL); page.wait_for_timeout(500)
        im = grab(page, state)
        W,H,d = im['w'], im['h'], im['d']
        print(f"=== luminance {state} (1 char = {ds}x{ds}px) ===")
        for y in range(0, H, ds):
            row = ''
            for x in range(0, W, ds):
                tot=0;n=0
                for yy in range(y, min(y+ds,H)):
                    for xx in range(x, min(x+ds,W)):
                        i=(yy*W+xx)*4
                        tot += 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; n+=1
                lum=tot/n
                row += RAMP[min(len(RAMP)-1, int(lum/25.6))]
            print(row)
        b.close()

main()
