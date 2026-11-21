# Tidewater Bay

A tiny, cozy, top-down pixel-art fishing game that runs entirely in the browser.
All artwork (water, dock, vegetation, angler, bobber and every fish) is drawn
procedurally in code — there are no image, font or audio assets.

## Run

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

The scene is rendered on a 320x180 logical canvas scaled 4x with pixel-perfect
(no smoothing) upscaling, so it fits a 1280x720 viewport with no scrolling.
The UI is drawn on a separate full-resolution overlay canvas.

## How to play

1. Press **Space** (or tap the round on-screen button) to cast.
2. Wait for the bite — the bobber jerks, an exclamation bubble appears and a
   meter starts draining.
3. Press **Space** / tap **REEL** before the meter empties.
4. Press again on the reveal to cast the next one.

## Fish rarities

Common 45% · Uncommon 25% · Rare 15% · Epic 8% · Legendary 5% · Ancient 2%
(twelve original species; each tier has a distinct reveal treatment).

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure function mapping `[0,1)` to a rarity name, called for
  every successful catch (replace it to change outcomes)
- `log` — every catch this session, newest first, as `{ name, rarity }`

No audio is used anywhere.
