# Tideline — an island fishing spot

A cozy, original top‑down pixel‑art fishing game that runs entirely in the browser.
Every pixel of art is drawn in code — there are no image, font, or audio assets.

## Launch

From this project root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>. No network access is required; all files are local.

The scene is rendered on a **320×180** logical canvas and scaled **4×** (nearest‑neighbour)
to a **1280×720** viewport with no smoothing, so every art pixel is exactly one size.
UI text is drawn at full resolution on top.

## Controls

- **SPACE** or **click/tap the on‑screen button** — cast, and reel during a bite.
- The angler never moves. One action per press; mashing cannot produce duplicate catches.

### Loop

1. **Cast** — the line is thrown and the bobber arcs into the water.
2. **Wait** — a short, variable wait (the bobber bobs on the water).
3. **Bite** — the bobber dunks, an alert `!` pops up, a gold ring shows the shrinking
   window, and the prompt turns to `BITE! REEL NOW!`.
4. **Reel** — press within the window for a short catch animation and a tiered reveal.
   Miss the window and the fish slips away (misses are not logged).

Timers pause while the browser tab is hidden. There is no audio of any kind.

## Rarities

Each catch rolls one tier with fixed odds: **Common 45%, Uncommon 25%, Rare 15%,
Epic 8%, Legendary 5%, Ancient 2%** (no pity, rerolls, or history). Each tier has its own
fish, and every tier's reveal differs in more than colour (frames, rays, shimmer,
rune rings, particle behaviour, fish motion). Ancient is the rare, ceremonial one.

A compact catch log keeps the last eight catches (newest first) and a legend lists the odds.

## Test interface

A global `window.fishing` object is exposed (it adds no visible debug UI and does not
change normal play):

- `state` — one of `"ready"`, `"waiting"`, `"bite"`, `"reeling"`, `"reveal"`.
- `pickRarity(u)` — pure function mapping a number in `[0, 1)` to
  `"Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Ancient"`.
  The game calls `window.fishing.pickRarity(Math.random())` for every successful catch,
  so replacing the function changes outcomes.
- `log` — array of `{ name, rarity }`, newest first, for every successful catch this session.

## Files

- `index.html` — page shell and the 1280×720 display canvas.
- `style.css` — integer‑scaled, non‑scrolling layout.
- `art.js` — pixel helpers, the angler sprite, and all fish drawn procedurally in code.
- `game.js` — scene, water animation, game loop, reveal treatments, UI, and test interface.
- `scripts/test.js` — Playwright regression test (mechanics, odds, timing, layout, pointer input).

Run the regression test with Playwright available on `NODE_PATH`:

```bash
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright NODE_PATH=$(npm root -g) node scripts/test.js
```
