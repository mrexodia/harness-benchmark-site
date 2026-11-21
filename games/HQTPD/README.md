# Tidepool Landing

A tiny, cozy, top-down pixel-art fishing game that runs in the browser.
All setting, characters, fish and artwork are original and drawn procedurally
in code (no image, font, audio or game assets).

## Run

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>. No network access is required.

## Play

- Press **SPACE** or click the on-screen button to cast.
- Wait for the bite — the bobber dips, ripples spread and a shrinking ring
  plus a red **!** marks the generous bite window.
- Press **SPACE** / click once during the window to reel in.
- A successful catch is revealed with tier-specific artwork, then the next
  cast is allowed. Miss the window and the fish slips away.

## Rarity odds

Common 45% · Uncommon 25% · Rare 15% · Epic 8% · Legendary 5% · Ancient 2%

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure function mapping a number in `[0,1)` to a rarity name
- `log` — every successful catch this session, `{name, rarity}`, newest first

The game always resolves a catch through `window.fishing.pickRarity(Math.random())`,
so replacing that function changes the outcome.

## Rendering

320×180 logical canvas scaled 4× to 1280×720 with smoothing disabled.
HUD text is drawn at full resolution in the DOM overlay.

`dev/` contains the Playwright-based checks used while building the game.
