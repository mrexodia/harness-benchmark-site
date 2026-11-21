from playwright.sync_api import sync_playwright
import sys

ASCII_JS = open('/home/agent/work/tools/playtest.py').read().split('ASCII_JS = r"""')[1].split('"""')[0]

def ascii(pg, cid, step, box):
    x0,y0,x1,y1=box
    return pg.evaluate(ASCII_JS, [cid, step, x0, y0, x1, y1])

def wait_state(pg,s,t=8000):
    pg.wait_for_function("(s)=>window.fishing.state===s", arg=s, timeout=t)

with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':720})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/',wait_until='networkidle'); pg.wait_for_timeout(400)
    print('== ANGLER (scene 100..150 x 80..130) ==')
    print(ascii(pg,'scene',1,(100,80,150,130)))
    # banner
    print('\n== BANNER step2 ==')
    print(ascii(pg,'ui',2,(10,10,360,100)))
    # cast to bite
    pg.keyboard.press('Space'); wait_state(pg,'bite')
    print('\n== BITE bobber region (scene 180..300 x 40..120) ==')
    print(ascii(pg,'scene',1,(180,40,300,120)))
    pg.keyboard.press('Space'); wait_state(pg,'reveal')
    pg.wait_for_timeout(1300); pg.keyboard.press('Space'); wait_state(pg,'ready')
    # fish zooms per rarity
    for rarity in ['Common','Rare','Legendary','Ancient']:
        pg.evaluate("(r)=>{window.fishing.pickRarity=()=>r}",rarity)
        wait_state(pg,'ready'); pg.keyboard.press('Space')
        wait_state(pg,'waiting'); wait_state(pg,'bite')
        pg.keyboard.press('Space'); wait_state(pg,'reveal')
        pg.wait_for_timeout(1400)
        print(f'\n== REVEAL FISH {rarity} (ui 540..740 x 230..430 step5) ==')
        print(ascii(pg,'ui',5,(540,230,740,430)))
        pg.keyboard.press('Space'); wait_state(pg,'ready')
    print('\nERRORS',errs)
    b.close()
