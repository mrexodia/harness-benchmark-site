# Tidepool Cove

A tiny, cozy top-down pixel-art fishing game that runs entirely in the browser.
All artwork is drawn **in code** (canvas), with no image files, fonts, icon sets or
audio. The world is rendered on a 320x180 logical canvas scaled 4x with no
smoothing; the UI is drawn at full resolution.

## Launch

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

Requires no network access beyond localhost.

## How to play

- Press **Space** or click the on-screen **CAST** button to cast.
- Wait for the bobber to dip — an exclamation mark and rings appear and the
  button turns red. Press **Space** / click the button once during the window
  to reel in.
- Miss the window and the fish gets away; cast again.
- Each catch is logged (last eight shown). Rarity odds:
  Common 45%, Uncommon 25%, Rare 15%, Epic 8%, Legendary 5%, Ancient 2%.

## Test interface

`window.fishing` exposes:

- `state` — one of `"ready"`, `"waiting"`, `"bite"`, `"reeling"`, `"reveal"`.
- `pickRarity(u)` — pure function mapping `u` in `[0, 1)` to one of the six
  rarity names. The game calls `window.fishing.pickRarity(Math.random())` for
  every successful catch, so replacing it changes the outcome.
- `log` — every successful catch this session as `{ name, rarity }`, newest
  first.

## Files

- `index.html` — page + HUD markup
- `css/style.css` — full-resolution UI and rarity reveal treatments
- `js/fish.js` — original fish species and rarity table
- `js/art.js` — all procedural scene and fish artwork
- `js/game.js` — game state machine, input, UI wiring, test interface
