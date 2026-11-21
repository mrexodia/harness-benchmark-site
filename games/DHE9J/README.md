# Driftwood Bay

A tiny, finished, playable top-down-style pixel-art fishing game that runs in the
browser. All setting, characters, fish and artwork are original and **drawn
entirely in code** — there are no image files, emoji, icon sets, fonts or audio
assets anywhere in the project.

## Run it

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/> (best at 1280×720; the stage scales to fit
smaller viewports without scrolling).

## Play

1. Press **Space** or click/tap the **Cast** button. The line is thrown and the
   bobber lands in the water.
2. Wait for a bite — the bobber dips, ripples appear and a **!** pops up.
3. Press **Space** or the (now red) **Reel!** button during the bite window to
   catch the fish. Miss it and the bite is lost.

The reveal shows the fish art, its name and rarity. The last eight catches are
listed in the log (newest first); the six rarity odds are shown in the legend.

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure function mapping `u ∈ [0, 1)` to one of
  `Common`, `Uncommon`, `Rare`, `Epic`, `Legendary`, `Ancient`
- `log` — every successful catch this session, newest first, as `{ name, rarity }`

## Files

- `index.html` — page and full-resolution DOM UI
- `style.css` — UI styling
- `src/fish-data.js` — original fish catalogue and rarity data
- `src/art.js` — all procedural pixel artwork (scene + fish sprites)
- `src/game.js` — game loop, state machine, input and the test interface
- `test/` — Playwright scripts used to exercise and inspect the game (not needed to play)
