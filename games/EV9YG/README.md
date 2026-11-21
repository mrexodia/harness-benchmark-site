# Tidepool Landing

A tiny, cozy top-down fishing game that runs in the browser. All artwork is
drawn procedurally in code — no image files, fonts, emoji or external assets.

## Run it

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

Press **Space** or click the on-screen **CAST / REEL** button. That is the only
control: cast, wait for the bobber to dip, then press again inside the bite
window to land the fish.

## How it is built

- `index.html` — page shell, 1280x720 canvas scaled from a 320x180 logical scene.
- `js/font.js` — hand-authored 5x7 bitmap font used for all UI text.
- `js/art.js` — the animated scene (sky, water, dock, angler, vegetation,
  bobber, splash) and a procedural pixel-art fish generator.
- `js/game.js` — state machine (`ready`/`waiting`/`bite`/`reeling`/`reveal`),
  timers, UI, and the `window.fishing` test interface.

## Test interface

`window.fishing` exposes:

- `state` — current phase string.
- `pickRarity(u)` — pure mapping from `[0, 1)` to a rarity name.
- `log` — array of `{ name, rarity }`, newest first (last eight catches).

## Automated playthrough

With the server running, `node tests/playthrough.js` drives Chromium through a
cast/bite/catch, a miss, and one forced catch of every rarity.
