import sys, time, json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"
OUT = "/tmp/shots"
import os
os.makedirs(OUT, exist_ok=True)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        errs=[]
        page.on("console", lambda m: errs.append(m.type+": "+m.text) if m.type in ("error","warning") else None)
        page.on("pageerror", lambda e: errs.append("pageerror: "+str(e)))
        page.goto(URL)
        page.wait_for_timeout(800)
        page.screenshot(path=OUT+"/01_ready.png")

        # test pickRarity boundaries
        pr = page.evaluate("""() => {
            const f = window.fishing.pickRarity;
            const tests=[[0,'Common'],[0.449,'Common'],[0.45,'Uncommon'],[0.699,'Uncommon'],
              [0.70,'Rare'],[0.849,'Rare'],[0.85,'Epic'],[0.929,'Epic'],
              [0.93,'Legendary'],[0.979,'Legendary'],[0.98,'Ancient'],[0.999,'Ancient']];
            return tests.map(([u,exp])=>[u, f(u), f(u)===exp]);
        }""")
        print("pickRarity:", pr)
        bad=[t for t in pr if not t[2]]
        print("pickRarity failures:", bad)

        # cast
        page.keyboard.press("Space")
        page.wait_for_timeout(300)
        print("state after cast:", page.evaluate("window.fishing.state"))
        page.screenshot(path=OUT+"/02_casting.png")
        page.wait_for_timeout(700)
        page.screenshot(path=OUT+"/03_waiting.png")

        # wait for bite
        for _ in range(120):
            if page.evaluate("window.fishing.state")=="bite": break
            page.wait_for_timeout(50)
        print("state:", page.evaluate("window.fishing.state"))
        page.screenshot(path=OUT+"/04_bite.png")

        # reel
        page.keyboard.press("Space")
        page.wait_for_timeout(200)
        print("state after reel:", page.evaluate("window.fishing.state"))
        page.screenshot(path=OUT+"/05_reeling.png")
        for _ in range(60):
            if page.evaluate("window.fishing.state")=="reveal": break
            page.wait_for_timeout(50)
        print("state:", page.evaluate("window.fishing.state"))
        page.wait_for_timeout(300)
        page.screenshot(path=OUT+"/06_reveal.png")
        print("log:", page.evaluate("window.fishing.log"))

        # close reveal by space, ensure no duplicate
        page.keyboard.press("Space")
        page.wait_for_timeout(300)
        print("state after next:", page.evaluate("window.fishing.state"))
        print("log len:", page.evaluate("window.fishing.log.length"))
        page.screenshot(path=OUT+"/07_ready2.png")

        # test forced rarity override
        page.evaluate("window.fishing.pickRarity = () => 'Ancient'")
        page.keyboard.press("Space")
        for _ in range(200):
            if page.evaluate("window.fishing.state") in ("bite",):
                break
            page.wait_for_timeout(50)
        page.keyboard.press("Space")
        for _ in range(80):
            if page.evaluate("window.fishing.state")=="reveal": break
            page.wait_for_timeout(50)
        page.wait_for_timeout(400)
        print("forced log:", page.evaluate("window.fishing.log"))
        page.screenshot(path=OUT+"/08_ancient.png")
        page.keyboard.press("Space")
        page.wait_for_timeout(200)

        # test miss: cast then don't press
        page.keyboard.press("Space")
        # wait until bite then miss
        for _ in range(300):
            if page.evaluate("window.fishing.state")=="bite": break
            page.wait_for_timeout(50)
        page.wait_for_timeout(1800)
        print("state after miss:", page.evaluate("window.fishing.state"))
        page.screenshot(path=OUT+"/09_miss.png")
        print("log after miss:", page.evaluate("window.fishing.log.length"))

        print("ERRORS:", errs)
        b.close()

main()
