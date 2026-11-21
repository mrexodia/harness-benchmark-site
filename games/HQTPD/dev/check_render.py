import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        errors=[]
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console:"+m.text) if m.type=="error" else None)
        page.goto(URL); page.wait_for_timeout(600)

        def bbox(hexcol, tol=18):
            return page.evaluate("""([hexcol,tol]) => {
                const c=document.getElementById('game');
                const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
                const r=parseInt(hexcol.slice(1,3),16), g=parseInt(hexcol.slice(3,5),16), bl=parseInt(hexcol.slice(5,7),16);
                let minx=9999,miny=9999,maxx=-1,maxy=-1,n=0;
                for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
                    const i=(y*c.width+x)*4;
                    if(Math.abs(d[i]-r)<=tol&&Math.abs(d[i+1]-g)<=tol&&Math.abs(d[i+2]-bl)<=tol){
                        n++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
                    }
                }
                return {n,minx,miny,maxx,maxy};
            }""", [hexcol, tol])

        print("READY")
        print(" shirt #c85b3a:", bbox("#c85b3a"))
        print(" hat   #d8b768:", bbox("#d8b768"))
        print(" rod   #7a5230:", bbox("#7a5230"))
        print(" red bobber #e23a2e:", bbox("#e23a2e"))

        # cast and wait
        page.keyboard.press("Space")
        page.wait_for_timeout(1400)
        print("WAITING state:", page.evaluate("window.fishing.state"))
        print(" red bobber #e23a2e:", bbox("#e23a2e"))
        print(" bobber white #f4f4f0:", bbox("#f4f4f0"))

        # bite
        for _ in range(200):
            if page.evaluate("window.fishing.state")=="bite": break
            page.wait_for_timeout(50)
        print("BITE state:", page.evaluate("window.fishing.state"))
        print(" bite ring #ffe27a:", bbox("#ffe27a"))
        print(" bite red #ff5a44:", bbox("#ff5a44"))

        # reel to reveal
        page.keyboard.press("Space")
        for _ in range(80):
            if page.evaluate("window.fishing.state")=="reveal": break
            page.wait_for_timeout(50)
        page.wait_for_timeout(300)
        print("REVEAL state:", page.evaluate("window.fishing.state"))
        fishinfo = page.evaluate("""() => {
            const c=document.getElementById('revealFish');
            const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
            let n=0; const cols={};
            for(let i=0;i<d.length;i+=4){ if(d[i+3]>10){ n++; } }
            return {w:c.width,h:c.height,opaque:n};
        }""")
        print(" reveal fish canvas:", fishinfo)
        card = page.evaluate("""() => {
            const r=document.getElementById('revealCard').getBoundingClientRect();
            const t=document.getElementById('revealRarity').textContent;
            const nm=document.getElementById('revealName').textContent;
            const cls=document.getElementById('revealCard').className;
            return {w:Math.round(r.width),h:Math.round(r.height),t,nm,cls};
        }""")
        print(" card:", card)
        hud = page.evaluate("""() => {
            function bb(id){const r=document.getElementById(id).getBoundingClientRect();return Math.round(r.width*r.height);}
            return {legend:bb('legend'),log:bb('logPanel'),btn:bb('actionBtn'),prompt:bb('prompt')};
        }""")
        print(" hud areas (css px):", hud, "sum:", sum(hud.values()), "of", 1280*720, "=", round(sum(hud.values())/(1280*720)*100,2),"%")
        print("ERRORS:", errors)
        b.close()

main()
