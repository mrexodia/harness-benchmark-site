import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"

# representative colours -> character (element legend)
PAL = [
    ((0,0,0), '#'),
    # sky
    ((87,164,205), ' '), ((108,179,214), ' '), ((136,195,220), ' '),
    ((166,211,225), ' '), ((198,223,220), ' '), ((236,221,176), ' '),
    ((255,240,184), '*'), ((247,251,253), '*'),
    # island
    ((62,107,107), 'i'), ((53,96,96), 'i'),
    # water
    ((111,176,203), '~'), ((98,163,194), '~'), ((85,152,186), '~'),
    ((74,140,176), '~'), ((65,128,166), '~'), ((58,118,156), '~'),
    ((51,108,147), '~'), ((45,99,138), '~'), ((40,91,129), '~'), ((35,84,120), '~'),
    # wave highlight
    ((142,198,221), '='), ((111,174,206), '='), ((95,160,194), '='),
    # grass / foliage
    ((69,111,52), 'g'), ((79,125,59), 'g'), ((47,90,42), 'G'), ((54,107,48), 'G'),
    ((63,125,56), 'G'), ((74,140,63), 'G'), ((84,154,70), 'G'),
    # sand
    ((205,176,120), 's'), ((224,196,142), 's'), ((240,220,174), 's'),
    # wood / dock / trunk
    ((90,61,34), 'w'), ((163,124,74), 'w'), ((195,154,96), 'w'),
    ((122,90,48), 'w'), ((111,82,48), 'w'), ((74,51,32), 'w'), ((99,72,46), 'w'),
    # angler
    ((200,91,58), 'R'), ((218,111,74), 'R'),
    ((74,110,168), 'B'), ((92,130,189), 'B'),
    ((232,180,138), 'S'), ((216,164,124), 'S'),
    ((216,183,104), 'H'), ((226,195,119), 'H'), ((184,147,77), 'H'),
    ((43,52,68), 'b'), ((59,74,99), 'b'),
    # bobber
    ((226,58,46), 'o'), ((255,106,88), 'o'),
    ((244,244,240), 'O'), ((216,216,210), 'O'),
]

def nearest(r, g, b):
    best = 1e9; ch = '?'
    for (pr, pg, pb), c in PAL:
        d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
        if d < best:
            best = d; ch = c
    return ch

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
        const im=c.getContext('2d').getImageData(0,0,c.width,c.height);
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
        print(f"=== map {state} (1 char = {ds}x{ds}px) [# dark . water ~ grass g sand s wood w angler R/B/S/H bobber o/O sky space] ===")
        for y in range(0, H, ds):
            row = ''
            for x in range(0, W, ds):
                i = ((y+ds//2)*W + (x+ds//2))*4
                row += nearest(d[i], d[i+1], d[i+2])
            print(row)
        b.close()

main()
