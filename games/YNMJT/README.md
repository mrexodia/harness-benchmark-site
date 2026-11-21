# Stillwater Cove

A tiny, cozy, top-down pixel-art fishing game that runs entirely in the browser.
All artwork (scene, character, fish, UI font) is drawn procedurally in code —
there are no image files, emoji, icon sets, or embedded fonts.

## Run it

```sh
cd /home/agent/work
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

The scene is rendered on a 320×180 logical canvas and blitted 4× with
`imageSmoothingEnabled = false`, so every art pixel is exactly 4×4 on a
1280×720 display. There is no network access and no audio.

## How to play

1. Press **Space** (or click the on-screen **CAST** button) to throw the line.
2. Wait for a bite — the bobber dives, splash rings spread, and a **“!”** bubble
   pops up above the water.
3. Press **Space** / click **REEL!** before the bite bar above the button runs
   out. A brief reeling animation plays, then the catch is revealed.
4. Press again to continue. Missing the window returns you to ready
   (misses are never logged).

## Rarity odds

| Rarity     | Chance |
|------------|--------|
| Common     | 45%    |
| Uncommon   | 25%    |
| Rare       | 15%    |
| Epic       | 8%     |
| Legendary  | 5%     |
| Ancient    | 2%     |

Each tier has original named fish with distinct silhouettes, colours and
patterns. The reveal treatment differs by tier by more than colour:
Uncommon drifts leaves, Rare sparkles, Epic pulses with a purple glow,
Legendary radiates sun-rays, and Ancient has rotating rune rings and orbiting
motes.

## Test interface

`window.fishing` exposes:

- `state` — one of `"ready"`, `"waiting"`, `"bite"`, `"reeling"`, `"reveal"`.
- `pickRarity(u)` — pure function mapping `u ∈ [0, 1)` to a rarity name.
  The game resolves every successful catch through
  `window.fishing.pickRarity(Math.random())`, so overriding it changes outcomes.
- `log` — every successful catch this session as `{ name, rarity }`,
  newest first.

Timers are driven by `requestAnimationFrame` with a delta-time clamp, and
`document.hidden` freezes the game clock, so nothing progresses while the tab
is in the background.

## Files

- `index.html` — page shell and canvas.
- `game.js` — the whole game (rendering, art, state machine, test interface).
- `tools/` — development-only Playwright scripts used for automated
  verification (not needed to play).
