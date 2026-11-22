# Emberfall Duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/leosweet/emberfall-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/leosweet/emberfall-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

A turn-based card duel of four elements, built for the
[make.fun "Make the best card game" bounty](https://make.fun/bounty/best-card-game-20261122-1826).
You are the **Ember Knight**. Across the table sits **Ashwarden Vex**.
Thirty health each. One duelist walks away.

## How to play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

- **Play a card:** click it, or press `1`–`7`.
- **End your turn:** click END TURN, or press `Space`.
- **Pause:** `P`. **Mute:** `M`. **Duel again:** `R` on the end screen.

## The rules

- **Mana** grows 1 → 10 with the turn number and refills each turn. You draw
  one card at the start of your turn. Your deck holds 24 cards: two copies of
  each of twelve original cards.
- **Four elements** — Ember, Thorn, Tide, Gale — told apart by colour *and*
  shape (flame, leaf, drop, swirl), never by text alone.
- **Resonance:** play a second card of the same element in one turn and it
  hits +2. Chain your elements.
- **Vex reads the table:** it takes a killing blow when it has one, guards
  when its health is low, draws when its hand runs dry, and otherwise plays
  the best damage-per-mana it holds.
- **Sounds** are synthesized with WebAudio — one pitch per element. No audio
  files, no network requests: everything the game loads lives under `game/`.

## Screenshots

`screenshots/` holds four real renders of the game (cover first): the table
mid-duel, the title screen, the victory screen and the defeat screen.

## Layout

| File | Job |
| --- | --- |
| `game/index.html` | The page: one canvas, one module script. |
| `game/src/config.js` | Tuning, palette, elements, layout. |
| `game/src/cards.js` | The twelve cards and the 24-card deck. |
| `game/src/duel.js` | Turns, mana, Resonance, damage, shields, endings. |
| `game/src/ai.js` | Vex's decisions. |
| `game/src/render.js` | Title, table, cards, HUD, end screens. |
| `game/src/input.js` | Mouse and keyboard. |
| `game/src/audio.js` | Synthesized sound effects. |
| `game/src/shots.js` | Deterministic screenshot scenes. |
| `game/src/random.js` | Seeded RNG. |
| `game/src/main.js` | Startup, frame loop, the opponent's clock. |
| `main.ts` | Copies `game/` and `screenshots/` to `/output` and writes `dossier.json`. |

`main.ts` runs on Node 22 with the standard library only:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT. See [LICENSE](LICENSE).
