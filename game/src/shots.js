// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real rules
// forward from a fresh game with a fixed seed, steered by an autopilot, so the frame is
// what a real game looks like and the same seed always gives the same frame. The title
// scene is the title screen; play stops mid-duel with both sides alive and hands full;
// win and loss run until one spark hits zero (the player is favoured for win, the Warden
// for loss, by how bold each side's autopilot plays).
// Ember Pact — original card game, written for the make.fun best card game bounty.

import { createGame, startGame, endPlayerTurn } from './state.js';
import { autopilotPlay } from './ai.js';

const MAX_TURNS = 40;

/** Run `turns` full rounds (player autopilot, then the Warden) from a fresh game. */
function runRounds(game, playerPlays, wardenMode, turns) {
  game.wardenMode = wardenMode;
  startGame(game);
  for (let t = 0; t < turns; t += 1) {
    if (game.phase !== 'play') break;
    autopilotPlay(game, 'player', playerPlays);
    if (game.phase !== 'play') break;
    endPlayerTurn(game);
  }
  return game;
}

/**
 * Set `game` to the named scene (title, play, win or loss; any other name is title)
 * and return the seed that produced it. A scene is retried with the next seed when
 * the first one does not reach the ending it needs, so the frame is always the real
 * ending it claims to be.
 */
export function stageShot(name, seed) {
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    const game = createGame(seed);
    game.phase = 'title';
    return { game, seed };
  }
  if (name === 'play') {
    const game = createGame(seed);
    runRounds(game, 8, 'greedy', 6);
    if (game.phase !== 'play') {
      // A duel that ended early is no mid-game: replay with a fresh seed.
      return stageShot('play', seed + 1);
    }
    return { game, seed };
  }
  // Win: the player plays bold, the Warden timid. Loss: the reverse.
  const playerPlays = name === 'win' ? 8 : 1;
  const wardenMode = name === 'win' ? 'timid' : 'greedy';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const s = seed + attempt;
    const game = createGame(s);
    runRounds(game, playerPlays, wardenMode, MAX_TURNS);
    const wanted = name === 'win' ? 'win' : 'loss';
    if (game.phase === wanted) return { game, seed: s };
  }
  // Fallback (should not happen): return the last attempt's game as-is.
  const game = createGame(seed + 19);
  runRounds(game, playerPlays, wardenMode, MAX_TURNS);
  return { game, seed: seed + 19 };
}
