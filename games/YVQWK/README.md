# Tidehollow Pier

A tiny top-down / three-quarter-view pixel-art fishing game. All setting,
characters, fish and artwork are original and drawn entirely in code — there
are no image files, fonts, emoji or external assets.

## Run it

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/> (best at 1280×720 or larger).

## Play

- **SPACE** or the on-screen **CAST** button: cast the line. Both do the same thing.
- Wait for the bobber to dip and the **! BITE !** banner. A timer bar shows the
  length of the bite window.
- Press **SPACE / REEL IN!** once during the window to land the fish.
- Miss it and the fish escapes; cast again.
- After a catch, the reveal shows the fish, its name and rarity. Press
  **SPACE / NEXT CAST** to continue.

Timers pause whenever the browser tab is hidden.

## Rarities (exact odds, no pity rules)

| Rarity    | Odds |
|-----------|------|
| Common    | 45%  |
| Uncommon  | 25%  |
| Rare      | 15%  |
| Epic      | 8%   |
| Legendary | 5%   |
| Ancient   | 2%   |

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure; maps a number in `[0, 1)` to a rarity name
- `log` — every catch this session, newest first, as `{ name, rarity }`

Every successful catch calls `window.fishing.pickRarity(Math.random())` so the
function can be replaced by a test harness to force an outcome.

## Files

- `index.html` — page shell
- `style.css` — page chrome and the cast button
- `scene.js` — environment art (sky, water, land, dock, vegetation, ambience)
- `fish.js` — procedural pixel-art fish renderer and the 12 fish definitions
- `game.js` — state machine, angler, fishing effects, full-resolution UI
- `tools/` — Playwright-based inspection/test helpers (not part of the game)
