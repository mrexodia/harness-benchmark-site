import asyncio, json
from playwright.async_api import async_playwright

OUT = "/home/agent/work/shots"
import os
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        errors = []
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        await page.goto("http://127.0.0.1:8000/")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{OUT}/01_initial.png")

        info = await page.evaluate("""() => ({
            has: !!window.fishing,
            state: window.fishing && window.fishing.state,
            logLen: window.fishing && window.fishing.log.length,
            pick: [0,0.44,0.45,0.69,0.70,0.84,0.85,0.92,0.93,0.97,0.98,0.999].map(u => window.fishing.pickRarity(u)),
        })""")
        print("INFO", json.dumps(info))
        print("ERRORS", errors)
        await browser.close()

asyncio.run(main())
