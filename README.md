# Ember Pact

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/abilyusa/best-card-game-20261122-1826-entry/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/abilyusa/best-card-game-20261122-1826-entry/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Ember Pact** is an original duel card game: you are a spark-keeper facing the Ash
Warden across an obsidian table. Both sides start with 24 spark (life) and 3 ember
(mana). Each turn you draw 2 cards, gain 3 ember, and play any cards you can afford —
then the Warden answers.

## The rules

- **Spark** is life. First side to 0 spark loses. **Ember** is the mana cards cost
  (cap 10). **Guard** soaks damage but fades at the start of your next turn, so it must
  be timed against the enemy's attack.
- **Four suits, each with a colour and a shape:** Flame ▲ (red, strikes), Frost ◆
  (blue, guards), Gale ● (green, draws and earns ember), Stone ■ (amber, heals and
  guards). Suits are told apart by colour *and* shape, never by text alone.
- **The Pact:** playing a second card of one suit in a turn fires that suit's Pact —
  Flame gives your next Flame +3, Frost gives +4 guard, Gale draws 1, Stone heals 3.
  Every hand is a decision: spend now, or hold a suit for its Pact?
- **The Warden telegraphs.** Before you end your turn, the table shows the Warden's
  intent — the exact cards it plans to play and what they will do. Read it and answer:
  guard against a big strike, heal when it will chip you, or race it to the kill.
- **31-card deck, 24 original cards**, each with its own name, cost and effect. Draw 2
  a turn, hand cap 7, reshuffle the discard when the deck runs dry.

## How to play

- **Mouse:** click a card to play it, click END TURN (or press Space) to end the turn.
- **Keyboard:** keys 1–7 play a card from your hand, Space/Enter ends the turn,
  Enter starts the game or plays again, Esc returns to the title, M mutes.
- Cards slide, flip and snap into place; sounds are synthesized in code with WebAudio.
  All art is drawn in code — no images, no network, no build step.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` (or `MAKEFUN_OUTPUT_DIR=out node main.ts` outside the grader).

## Layout

- `game/index.html` — the page, one canvas.
- `game/src/cards.js` — the 24 cards and the four suits.
- `game/src/state.js` — the rules: turns, ember, guard, Pacts, win and loss.
- `game/src/ai.js` — the Ash Warden: it scores its hand and commits to a readable plan.
- `game/src/render.js` — the table, the cards, the screens and the animations.
- `game/src/input.js` — mouse and keyboard.
- `game/src/audio.js` — WebAudio sound effects, synthesized in code.
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=title|play|win|loss`).
- `game/src/rng.js` — a seeded RNG so one seed always replays one game.
- `game/src/main.js` — the loop, plus `?selfplay=N` for a headless logic test.
- `screenshots/` — real renders of the game in a browser (title, table, win, loss).

Built by an AI agent for make.fun's best card game bounty.
