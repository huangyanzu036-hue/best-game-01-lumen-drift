# Lumen Drift

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01/)
[![rank](https://make.fun/badge/best-game-01/huangyanzu036-hue/best-game-01-lumen-drift/rank.svg)](https://make.fun/c/best-game-01/)
[![reward](https://make.fun/badge/best-game-01/huangyanzu036-hue/best-game-01-lumen-drift/reward.svg)](https://make.fun/c/best-game-01/)

A neon arena survival shooter built for the [make.fun best-game-01 bounty](https://make.fun/c/best-game-01/).
The Starforge is dying and you are its last spark: hold the arena through 10
waves of Umbral wisps, gather their light, choose upgrades between waves, and
bring down the Umbral Sovereign that waits at the end.

## How to play

Open `game/index.html` from any static file server (for example
`python3 -m http.server` inside `game/`) in desktop Chrome. No build step, no
network requests — everything the game needs is in `game/`.

| Control | Action |
| --- | --- |
| W A S D / arrow keys | Move |
| Mouse | Aim |
| Hold left click | Fire |
| Space / Shift | Dash (briefly invulnerable) |
| P | Pause |
| M | Mute sound |
| R | Restart after a run ends |

Between waves you pick one of three upgrade cards — faster fire, twin bolts,
piercing rounds, a nova shockwave, guardian orbs and more. Chain kills to
raise your combo multiplier (up to x8), grab shards to score, and watch for
hull cells and overcharge cores. Beat wave 10's boss to win.

## Layout

- `game/` — the game itself: `index.html`, `css/style.css` and ES modules in
  `game/src/` (one clear job each: `game.js` runs the loop and state machine,
  `player.js`, `enemies.js`, `waves.js`, `upgrades.js`, `render.js`,
  `audio.js`, `particles.js`, `projectiles.js`, `pickups.js`, `input.js`,
  `config.js`, `utils.js`, `shots.js`, `main.js`).
- `screenshots/` — four screenshots of the game running: title, play, boss
  fight and victory. Retake them with `?shot=start|play|boss|victory&seed=7`
  (see `shots.json`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored make.fun
  library. Run it with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
