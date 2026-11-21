import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"

def cls(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    chroma = mx - mn
    lum = (r * 3 + g * 6 + b) / 10
    if mx < 40:
        return '#'                       # near black
    if chroma < 26:
        return '+' if lum > 190 else ('-' if lum > 110 else '.')
    if r >= g and r >= b:
        if b > g - 6 and b > 90 and r - g > 20:
            return 'M'                   # magenta/pink
        if g > 120 and r - b > 50:
            return 'Y'                   # yellow
        return 'W' if lum > 80 else 'w'  # brown / wood
    if g >= r and g >= b:
        return 'g' if lum > 130 else 'G'
    if b >= r and b >= g:
        return 'B' if lum > 150 else 'b'
    return '?'

def grab(page, state):
    if state != 'ready':
        page.keyboard.press("Space")
        if state == 'waiting':
            page.wait_for_timeout(1300)
        elif state == 'bite':
            for _ in range(200):
                if page.evaluate("window.fishing.state") == 'bite':
                    break
                page.wait_for_timeout(50)
        elif state == 'reveal':
            for _ in range(200):
                if page.evaluate("window.fishing.state") == 'bite':
                    break
                page.wait_for_timeout(50)
            page.keyboard.press("Space")
            for _ in range(80):
                if page.evaluate("window.fishing.state") == 'reveal':
                    break
                page.wait_for_timeout(50)
            page.wait_for_timeout(500)
    return page.evaluate("""() => {
        const c=document.getElementById('game');
        const ctx=c.getContext('2d');
        const im=ctx.getImageData(0,0,c.width,c.height);
        return {w:im.width,h:im.height,d:Array.from(im.data)};
    }""")

def main():
    state = sys.argv[1] if len(sys.argv) > 1 else 'ready'
    x0,y0,x1,y1 = [int(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else (0,0,320,180)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        page.goto(URL); page.wait_for_timeout(500)
        im = grab(page, state)
        W,H,d = im['w'], im['h'], im['d']
        print(f"=== {state} region {x0},{y0} .. {x1},{y1} ===")
        print('    ' + ''.join(str((x//10)%10) for x in range(x0,x1)))
        for y in range(y0, y1):
            row = ''
            for x in range(x0, x1):
                i = (y*W+x)*4
                row += cls(d[i], d[i+1], d[i+2])
            print(f"{y:3d} {row}")
        b.close()

main()
