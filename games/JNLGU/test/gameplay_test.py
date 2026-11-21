import asyncio, time
from playwright.async_api import async_playwright

async def state(page):
    return await page.evaluate("window.fishing.state")

async def wait_state(page, target, timeout=8.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = await state(page)
        if s == target:
            return True
        await page.wait_for_timeout(60)
    return False

async def cast_and_catch(page, res, label):
    t0 = time.time()
    await page.keyboard.press("Space")
    ok = await wait_state(page, "waiting", 2)
    res.append((label, "cast->waiting", ok))
    got_bite = await wait_state(page, "bite", 7)
    res.append((label, "waiting->bite", got_bite))
    if got_bite:
        # press once (and spam to test duplicate protection)
        await page.keyboard.press("Space")
        await page.keyboard.press("Space")
        await page.keyboard.press("Space")
    # wait for reveal
    got_rev = await wait_state(page, "reveal", 4)
    res.append((label, "bite->reveal", got_rev))
    if got_rev:
        await page.wait_for_timeout(300)
        await page.screenshot(path=f"/home/agent/work/shots/catch_{label}.png")
    ready = await wait_state(page, "ready", 5)
    res.append((label, "reveal->ready", ready))
    return time.time() - t0

async def main():
    res = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        errs = []
        page.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
        page.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(600)

        # state enum check helper
        valid = await page.evaluate("() => ['ready','waiting','bite','reeling','reveal']")
        res.append(("init", "state=ready", (await state(page)) == "ready"))

        # --- full successful cycle ---
        dt = await cast_and_catch(page, res, "normal")
        print(f"normal cycle seconds: {dt:.2f}")

        # --- log checks ---
        log = await page.evaluate("window.fishing.log")
        res.append(("log", "grew to 1", len(log) == 1))
        if log:
            res.append(("log", "has name+rarity", bool(log[0].get("name")) and bool(log[0].get("rarity"))))
            print("first catch:", log[0])

        # --- forced rarity via replacement ---
        await page.evaluate("window.__origPick = window.fishing.pickRarity; window.fishing.pickRarity = () => 'Ancient'")
        await cast_and_catch(page, res, "forced")
        log = await page.evaluate("window.fishing.log")
        res.append(("forced", "newest=Ancient", log[0]["rarity"] == "Ancient"))
        res.append(("forced", "log grew", len(log) == 2))
        await page.evaluate("window.fishing.pickRarity = window.__origPick")

        # --- miss flow (do not press during bite) ---
        await page.keyboard.press("Space")
        await wait_state(page, "bite", 7)
        # don't press; wait for window to expire -> reeling(miss) -> ready
        missed = await wait_state(page, "reeling", 3)
        res.append(("miss", "bite->reeling(miss)", missed))
        ready_again = await wait_state(page, "ready", 4)
        res.append(("miss", "returns to ready", ready_again))
        log = await page.evaluate("window.fishing.log")
        res.append(("miss", "not logged", len(log) == 2))

        # --- state always valid ---
        s = await state(page)
        res.append(("state", f"valid ({s})", s in valid))

        # --- duplicate catch protection: spam during reveal/waiting ---
        before = await page.evaluate("window.fishing.log.length")
        await page.keyboard.press("Space")
        for _ in range(20):
            await page.keyboard.press("Space")
            await page.wait_for_timeout(20)
        await page.wait_for_timeout(400)
        # we might be waiting; spam some more but only legit catches count
        mid = await page.evaluate("window.fishing.log.length")
        res.append(("dupe", "no catch before bite", mid == before or mid == before + 0))

        # --- hidden timer pause ---
        await wait_state(page, "ready", 8)
        # start a cast and then hide
        await page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        await page.keyboard.press("Space")
        await page.wait_for_timeout(100)
        await page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true})")
        p1 = await page.evaluate("window.fishing.state")
        await page.wait_for_timeout(1200)
        p2 = await page.evaluate("window.fishing.state")
        res.append(("hidden", f"frozen ({p1}=={p2})", p1 == p2))
        # unhide and let it recover
        await page.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true})")
        await page.wait_for_timeout(200)

        print("\n=== RESULTS ===")
        fails = 0
        for a, b, ok in res:
            print(("PASS" if ok else "FAIL"), f"[{a}]", b)
            if not ok:
                fails += 1
        print("ERRORS:", errs)
        print("FAILURES:", fails)
        await browser.close()

asyncio.run(main())
