# Tidepool Bay

A tiny, cozy top-down pixel-art fishing game that runs entirely in the browser.
One island fishing spot, an angler on a dock, animated water and a small school
of original fish. All artwork is drawn in code — there are no image, font or
audio assets of any kind.

## Launch

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>. Everything is served locally; the game
makes no network requests.

The playfield is a 320×180 logical canvas scaled 4× with nearest-neighbour
rendering to 1280×720, so every art pixel is exactly 4×4 screen pixels. UI
text is drawn on a separate full-resolution overlay so it stays crisp. The
whole thing fits a 1280×720 viewport with no scrolling and scales down for
smaller windows.

## Controls

- **Space** or the on-screen **Cast / Reel! / Continue** button perform the
  single context action.
- **Ready** → cast. **Bite** → reel in. **Reveal** → cast again.

A successful cycle (cast → variable wait → bite → reel → reveal) takes roughly
5–9 seconds.

## The loop

1. Cast — the rod swings and the bobber arcs out into the water.
2. Wait — the bobber floats and bobs; the wait is random (≈2.6–4.2 s).
3. Bite — the bobber dips, a gold “!” pops up, closing brackets show the bite
   window, and the button turns red and pulses. The window is 1.5 s.
4. Reel — the fish leaps from the water as the line comes back.
5. Reveal — the fish, its name and its rarity are shown with a per-tier
   treatment. Press again to cast.

Missing the window loses the fish, flashes the scene red, and returns to
ready. Misses are never logged.

Timers pause while the tab is hidden (`document.hidden`).

## Rarities and fish

Exactly these odds, rolled fresh every catch with no pity or history:

| Tier | Odds | Fish |
| --- | --- | --- |
| Common | 45% | Meadow Dace, Copper Minnow |
| Uncommon | 25% | Pebble Perch, Silver Smelt |
| Rare | 15% | Amber Loach, Reedfin Pike |
| Epic | 8% | Violet Fangray, Moonlit Trout |
| Legendary | 5% | Emberking Bass, Stormscale Marlin |
| Ancient | 2% | Hollowbone Leviathan |

Each tier’s reveal differs in more than colour: leaf corners, layered borders,
floating bubbles, orbiting sparks, rotating light rays and a crown, and for
Ancient a dark void with a rotating rune ring, pulsing double frame and its own
particles.

## Test interface

`window.fishing` is always available:

- `window.fishing.state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`.
- `window.fishing.pickRarity(u)` — pure function mapping `u ∈ [0,1)` to one of
  the six rarity names. Every successful catch calls exactly
  `window.fishing.pickRarity(Math.random())` through this object, so replacing
  it changes the outcome.
- `window.fishing.log` — every successful catch this session, newest first, as
  `{ name, rarity }`.

The interface adds no visible debug chrome and does not affect normal play.

## Project layout

```
index.html        markup + layered canvases + action button
style.css         hard-edge scaling and button styling
js/palette.js     the single controlled palette + rarity table
js/draw.js        pixel drawing toolkit (sprites, lines, ellipses, easing)
js/fish.js        procedural fish renderer + the 11 original fish
js/scene.js       island bake + animated water/vegetation/angler/bobber/reveal
js/game.js        state machine + window.fishing
js/ui.js          full-resolution overlay (bar, log, legend, reveal text)
js/main.js        bootstrap, input, pause-aware loop
test/             Playwright checks (logic, render inspection, ui, fps)
```

## What was tested

Playwright (headless Chromium) drove the real game end to end: full successful
cycles (timed 4.6–6.5 s), deliberate misses, repeated space presses during
waiting/bite/reveal (no overlapping casts or duplicate catches), a
`pickRarity` override forcing Ancient, the exact rarity distribution over
100k rolls, purity of `pickRarity`, the log growing past eight entries, the
on-screen button in every phase, `document.hidden` pausing timers, and a clean
console with no external network requests at a steady 60 FPS. Rendering was
inspected by quantising the live scene buffer into text maps to confirm the
angler, dock, shoreline, bobber, bite cue, reeling arc and all six reveal
treatments.

## Known issues / notes

- The bottom control bar and top-right catch log intentionally overlap the
  edges of the scene (together under a fifth of the screen). The log shows the
  last eight catches; the full history stays in `window.fishing.log`.
- UI copy uses the browser’s built-in system sans-serif. No font files are
  downloaded or embedded.
