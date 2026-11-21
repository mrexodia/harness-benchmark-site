# Tideline — Island Angler

An original, top-down pixel-art fishing vignette that runs entirely in the browser.
All art (scene, angler, fish, UI font) is drawn in code — no images, fonts, emoji,
icon sets or audio.

## Launch

From this project root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

The game renders on a 320×180 logical canvas scaled exactly 4× (1280×720) with
nearest-neighbour scaling, so every art pixel is identical in size. It fits a
1280×720 viewport without scrolling and scales down for smaller windows.

## Controls

- **Space / Enter** or **click/tap anywhere** (the on-screen button is the
  visual affordance): cast, reel during a bite, and advance the reveal.
- No audio at any point.

## Loop

1. Cast — the line is visibly thrown and the bobber lands in the water.
2. Wait — a short, variable wait.
3. Bite — the bobber dips, ripples spread, an exclamation and a shrinking ring
   plus a countdown bar mark the window.
4. Reel — press once during the window for a catch animation and reveal.
   Missing the window returns to ready; misses are not logged.

A successful cycle takes roughly 5–9 seconds. Timers pause while the tab is
hidden.

## Rarities

```
Common 45% · Uncommon 25% · Rare 15% · Epic 8% · Legendary 5% · Ancient 2%
```

Each tier has original named fish with distinct procedural artwork and a reveal
treatment that differs by more than colour (sparkles, glow, rotating rays,
rune rings, etc.). A compact log shows the last eight catches (newest first)
and a legend lists all six odds.

## Test interface

A global `window.fishing` object is exposed:

- `state` — one of `"ready"`, `"waiting"`, `"bite"`, `"reeling"`, `"reveal"`.
- `pickRarity(u)` — pure function mapping `[0, 1)` to a rarity name. Every
  successful catch calls `window.fishing.pickRarity(Math.random())` through the
  object, so replacing the function changes outcomes.
- `log` — array of `{ name, rarity }` for the session, newest first.

It adds no visible debug elements and does not change ordinary play.

## Development checks

The `tools/` folder contains Playwright scripts used during development:

```bash
node tools/e2e.cjs      # full end-to-end assertions
node tools/diag.cjs 4 2 # ASCII colour map of the rendered scene
node tools/capture.cjs  # saves state screenshots to /tmp
```
