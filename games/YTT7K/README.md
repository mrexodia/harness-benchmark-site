# Tidepool — an original top-down pixel fishing game

A tiny, finished browser fishing game. One island shore, one angler, twelve
original fish, and a full cast → bite → reel loop. All artwork is drawn
procedurally in code (no images, fonts, sprites or audio of any kind).

## Launch

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8000/** in a browser. It is designed for a
1280×720 viewport (320×180 logical canvas scaled 4×, pixel-perfect, no
scrolling). No network access is required beyond the local server; the page
loads only `index.html` and `game.js`.

## Controls

- **Space** or the on-screen **CAST / REEL! / NEXT** button: advance the loop.
- Walk through: cast → wait for a bite → press during the highlighted bite
  window → catch reveal → cast again.
- Missing the bite window loses the fish (misses are not logged).

## Rarities

| Tier | Odds | Example fish |
|------|------|--------------|
| Common | 45% | Sunfin Minnow, Puddle Perch |
| Uncommon | 25% | Copperback Dace, Bramble Carp |
| Rare | 15% | Moonlit Trout, Amber Snapper |
| Epic | 8% | Coral Crest Ray, Thunderback Bass |
| Legendary | 5% | Aurora Koi, Emberfin Marlin |
| Ancient | 2% | Tidefather, Voidscale Leviathan |

No pity rules, rerolls or history-dependent odds. The catch log keeps the last
eight catches on screen (newest first) and the full session in memory.

## Test interface

`window.fishing` exposes:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure mapping from `[0, 1)` to the six rarity names above.
  The game always calls `window.fishing.pickRarity(Math.random())` for a catch,
  so replacing the function changes the outcome.
- `log` — every successful catch this session, newest first, as
  `{ name, rarity }` objects.

## Timers

All game timers are paused while `document.hidden` is true, so a hidden tab
never advances the cast, bite window or reveal.
