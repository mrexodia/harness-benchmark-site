import time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/"

def wait_state(page, target, timeout=12):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate("window.fishing.state") == target:
            return True
        page.wait_for_timeout(25)
    return False

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
        errs = []
        page.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        page.on("console", lambda m: errs.append("console.error: " + m.text) if m.type == "error" else None)
        page.goto(URL)
        page.wait_for_timeout(600)

        # layout / no scrolling
        sw = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
        print("scroll size:", sw, "(viewport 1280x720)")

        # legend / button presence
        print("legend items:", page.evaluate("document.querySelectorAll('#legendList li').length"))
        print("button label:", page.evaluate("document.getElementById('actionBtn').textContent"),
              "visible:", page.evaluate("getComputedStyle(document.getElementById('actionBtn')).display"))
        print("initial state:", page.evaluate("window.fishing.state"))

        # full successful cycle via BUTTON click
        t0 = time.time()
        page.click("#actionBtn")
        assert wait_state(page, "bite"), "no bite"
        page.click("#actionBtn")
        assert wait_state(page, "reveal"), "no reveal"
        t1 = time.time()
        print(f"successful cycle (cast->reveal) = {t1-t0:.2f}s")
        print("log after 1:", page.evaluate("window.fishing.log"))

        # space to continue; mash space to ensure no duplicate catch
        for _ in range(5):
            page.keyboard.press("Space")
            page.wait_for_timeout(30)
        page.wait_for_timeout(150)
        print("state after mashing:", page.evaluate("window.fishing.state"))
        print("log len after mashing:", page.evaluate("window.fishing.log.length"))

        # miss cycle
        if page.evaluate("window.fishing.state") != "ready":
            wait_state(page, "ready")
        log_before = page.evaluate("window.fishing.log.length")
        page.keyboard.press("Space")
        assert wait_state(page, "bite"), "no bite (miss test)"
        # don't press; wait for miss
        assert wait_state(page, "ready", 6), "miss did not return to ready"
        log_after = page.evaluate("window.fishing.log.length")
        print(f"miss: log {log_before} -> {log_after} (should be equal)")

        # several catches, verify newest-first ordering
        names = []
        for i in range(10):
            if page.evaluate("window.fishing.state") != "ready":
                wait_state(page, "ready")
            page.keyboard.press("Space")
            assert wait_state(page, "bite"), f"no bite {i}"
            page.keyboard.press("Space")
            assert wait_state(page, "reveal"), f"no reveal {i}"
            newest = page.evaluate("window.fishing.log[0]")
            names.append(newest["name"] + "/" + newest["rarity"])
            page.keyboard.press("Space")
            page.wait_for_timeout(60)
        log = page.evaluate("window.fishing.log")
        print("total log entries:", len(log), "(interface keeps all)")
        # display shows at most 8
        print("displayed log rows:", page.evaluate("document.querySelectorAll('#logList li').length"))
        print("newest first sample:", names[:3])

        # odds distribution sanity over many picks (pure fn, not gameplay)
        dist = page.evaluate("""() => {
            const c={};
            for (let i=0;i<100000;i++){ const r=window.fishing.pickRarity(Math.random()); c[r]=(c[r]||0)+1; }
            return c;
        }""")
        print("sampled distribution:", {k: round(v/100000*100,2) for k,v in dist.items()})

        print("ERRORS:", errs)
        b.close()

main()
