# Island Angler

A cozy top-down pixel-art fishing game that runs entirely in the browser.
All artwork is generated procedurally on canvas — there are no image, font or
audio assets, and nothing is loaded from the network.

## Run it

From this folder:

```
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

The scene is authored on a 320×180 logical canvas and scaled exactly 4×
(1280×720) with nearest-neighbour scaling, so every art pixel is the same size.
UI text is drawn at full resolution. It fits a 1280×720 viewport without
scrolling and scales down on smaller screens.

## Play

- Press **Space** or click the on-screen **CAST** button to throw the line.
- When the bobber reacts (it dips, ripples and shows **BITE!**), press
  **Space** / **REEL IN?** once to land the fish.
- Miss the bite window and it gets away; cast again.

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure function mapping `[0,1)` to the six tier names
- `log` — every catch this session as `{ name, rarity }`, newest first
