from playwright.sync_api import sync_playwright
import sys, time, os

os.makedirs('/tmp/shots', exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':1280,'height':720})
    errors = []
    pg.on('console', lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errors.append(f"pageerror: {e}"))
    pg.goto('http://127.0.0.1:8000/', wait_until='networkidle')
    pg.wait_for_timeout(800)
    info = pg.evaluate("""() => ({
        hasFishing: !!window.fishing,
        state: window.fishing && window.fishing.state,
        log: window.fishing && window.fishing.log,
        pick: window.fishing && [0,0.44,0.45,0.69,0.70,0.84,0.85,0.92,0.93,0.97,0.98,0.999].map(u=>window.fishing.pickRarity(u))
    })""")
    print("INFO", info)
    pg.screenshot(path='/tmp/shots/01_ready.png')
    print("ERRORS", errors)
    b.close()
