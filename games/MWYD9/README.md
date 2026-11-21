# Tidepool Bay

A tiny, cozy top-down island fishing game. All artwork is drawn in code — no
images, fonts, icon sets or other assets.

## Run

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

## Play

- **Space** or the on-screen **button** casts the line.
- Wait for the bite (the bobber dips, splashes and shows a `!`).
- Press **Space** / the button once during the bite window to reel in.
- Watch the reveal, then cast again. **M** toggles sound.

## Structure

- `index.html` / `style.css` — 320x180 world canvas scaled 4x with no smoothing,
  plus a full-resolution UI canvas layered on top.
- `js/palette.js` — the hand-picked colour palette.
- `js/pixels.js` — integer pixel drawing primitives + sprite outlining.
- `js/font.js` — a hand-authored 5x7 bitmap font.
- `js/fish.js` — fish species, artwork and the exact rarity table.
- `js/scene.js` — the island scene (sky, water, dock, angler, vegetation, props).
- `js/ui.js` — HUD, catch log, odds legend and the tiered reveal cards.
- `js/audio.js` — optional WebAudio blips.
- `js/game.js` — state machine, input and the `window.fishing` test interface.
