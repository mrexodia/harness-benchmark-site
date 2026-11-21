import sys, os
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"

def classify(r,g,b,y):
    mx=max(r,g,b); mn=min(r,g,b)
    if mx < 45: return '.'          # near black / outline
    if mn > 225: return '#'         # white
    if r>150 and g>120 and b>120 and abs(r-g)<60: return '#'  # pale
    if r>150 and g>110 and b<110 and r-b>60:
        return 'y' if g>140 else 'R'  # yellow or red/orange
    if b>=r and b>=g:
        # blue: sky lighter, water darker
        if g>170 and b>190 and y<60: return ':'   # sky
        if r+g+b>560: return '+'                   # bright water
        return '~'                                 # water
    if g>=r and g>=b:
        if g>140 and r>120: return 'g'   # light green grass
        return 'G'                        # dark green foliage
    if r>=g and g>=b:
        return 'w' if r>110 else 'b'      # wood / dark brown
    return '?'

def main(state='ready'):
    with sync_playwright() as p:
        b=p.chromium.launch()
        page=b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        page.goto(URL); page.wait_for_timeout(600)
        # drive to requested state
        if state!='ready':
            page.keyboard.press("Space")
            if state=='waiting':
                page.wait_for_timeout(1200)
            elif state in ('bite','reveal'):
                for _ in range(200):
                    if page.evaluate("window.fishing.state")=='bite': break
                    page.wait_for_timeout(50)
                if state=='reveal':
                    page.keyboard.press("Space")
                    for _ in range(80):
                        if page.evaluate("window.fishing.state")=='reveal': break
                        page.wait_for_timeout(50)
                    page.wait_for_timeout(500)
        data = page.evaluate("""() => {
            const c=document.getElementById('game');
            const ctx=c.getContext('2d');
            const d=ctx.getImageData(0,0,c.width,c.height).data;
            return Array.from(d);
        }""")
        W,H=320,180
        CW,CH=80,45
        cw,ch=W//CW,H//CH
        print("=== state:", page.evaluate("window.fishing.state"), "===")
        for cy in range(CH):
            row=''
            for cx in range(CW):
                # average block
                rr=gg=bb=0;n=0
                for yy in range(cy*ch,(cy+1)*ch):
                    for xx in range(cx*cw,(cx+1)*cw):
                        i=(yy*W+xx)*4
                        rr+=data[i];gg+=data[i+1];bb+=data[i+2];n+=1
                row+=classify(rr//n,gg//n,bb//n,cy*ch)
            print(row)
        b.close()

if __name__=='__main__':
    main(sys.argv[1] if len(sys.argv)>1 else 'ready')
