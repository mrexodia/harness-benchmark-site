# Tideline

A tiny, cozy, top-down pixel-art fishing game that runs entirely in the browser.
All artwork is drawn in code (canvas primitives + a code-defined bitmap font) —
there are no image, font, audio or game asset files.

## Run

```bash
cd /home/agent/work
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

The scene renders on a 320x180 logical canvas scaled 4x with smoothing disabled.
The HUD is drawn crisply on a second 1280x720 overlay canvas.

## Play

- **Cast:** Space or the on-screen button.
- **Bite:** wait for the bobber to dip; an exclamation cue appears.
- **Reel:** press Space or the button once during the bite window.
- Miss the window and the fish gets away.

The reveal shows the fish, its name and rarity, with a distinct treatment per tier.
The last eight catches appear in the log (newest first) and a legend lists the odds.

## Test interface

`window.fishing`:

- `state` — `"ready" | "waiting" | "bite" | "reeling" | "reveal"`
- `pickRarity(u)` — pure function mapping `[0, 1)` to a rarity name
- `log` — every successful catch, newest first, as `{ name, rarity }`

Every catch calls `window.fishing.pickRarity(Math.random())`, so replacing that
function changes the outcome (handy for testing reveals).
