# Tideline

A tiny, original top-down pixel-art fishing game that runs entirely in the browser.
One island fishing spot, one angler, twelve hand-drawn (in-code) fish across six
rarities. All artwork is drawn with the Canvas API — no image files, fonts,
emoji, icon sets or audio are used anywhere.

## Launch

From the project root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>. The game needs no network access.

## Play

* The scene is a 320x180 logical canvas scaled 4x (1280x720) with smoothing off.
* Press **Space** or click the on-screen button.
  1. **Cast** — the line is thrown and the bobber lands in the water.
  2. A short, variable wait, then a **bite** (bobber dunks, `!` bubble, rings,
     banner and a closing timer ring).
  3. Press once during the bite window to **reel in**. A fish leaps out and is
     pulled to the angler, then the catch is revealed.
* Miss the window and the fish gets away; cast again.
* The visible catch log keeps the last eight catches (newest first). Misses are
  not logged. A legend lists the six rarity odds.

Rarity odds are exact and have no pity/history rules:
Common 45%, Uncommon 25%, Rare 15%, Epic 8%, Legendary 5%, Ancient 2%.
Reveal treatment is unique per tier (rays, auras, particles, rune ring, star
burst), not just a colour change.

## Test interface

A global `window.fishing` object is exposed:

* `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
* `pickRarity(u)` — pure function mapping `[0,1)` to one of the six rarity names.
  Every successful catch calls `window.fishing.pickRarity(Math.random())`, so
  replacing the function changes the outcome.
* `log` — every successful catch this session as `{ name, rarity }`, newest first.

The interface does not affect ordinary play and adds no visible debug elements.

## Project layout

```
index.html      structural shell + full-resolution UI overlay
style.css       UI styling (text is drawn at full resolution)
js/util.js      small canvas / colour helpers
js/art.js       palette, procedural fish art, angler and scene rendering
js/game.js      state machine, input, UI wiring, window.fishing interface
tests/          Playwright development harness (not part of the game)
```
