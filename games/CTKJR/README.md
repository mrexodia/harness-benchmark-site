# Tidepool Cove

A tiny top-down pixel-art fishing game that runs entirely in the browser.
All artwork is drawn procedurally from code — there are no image, font or audio
assets, and the game makes no network requests.

## Launch

From this folder:

```
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

The scene renders on a 320×180 logical canvas scaled 4× (nearest-neighbour) into
a 1280×720 stage that fits the viewport without scrolling.

## Play

- **Space** or the on-screen button casts.
- After a short variable wait the bobber reacts and a `BITE!` cue appears.
- Press once during the bite window to reel in. Watch the catch animation and
  the reveal, then cast again.
- Miss the window and the fish escapes — no penalty, just cast again.

Rarity odds per catch: Common 45%, Uncommon 25%, Rare 15%, Epic 8%,
Legendary 5%, Ancient 2%.

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure function mapping `u ∈ [0,1)` to a rarity name; the game
  calls this through the object for every successful catch, so it can be swapped.
- `log` — every catch this session as `{ name, rarity }`, newest first.

## Automated checks

The `tools/` folder contains the Playwright scripts used during development
(`playtest.py` runs the full loop, miss, overlap, hidden-tab and rarity-override
checks; `zoom.py` dumps pixel views of the art).
