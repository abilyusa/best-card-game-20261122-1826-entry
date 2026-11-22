// Ember Pact — the game loop. Loads the canvas, wires input, and runs one of three
// modes: the real game (?shot absent), a deterministic screenshot scene (?shot=title,
// play, win or loss, with ?seed=), or a headless logic test (?selfplay=N) that plays N
// full games with no rendering and reports the results into the document, so a browser
// run can prove wins and losses are both reachable. Original card game, written for the
// make.fun best card game bounty.

import { createGame, startGame, endPlayerTurn } from './state.js';
import { autopilotPlay } from './ai.js';
import { createView, render, updateView, VIEW_W, VIEW_H, spawnEmbers } from './render.js';
import { bindInput } from './input.js';
import { ensureAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

/** Fit the fixed 1280×720 view to the window, keeping the aspect. */
function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
}

/** Run N full games of pure logic and report the outcome counts into the document. */
function selfPlay(count) {
  const results = { win: 0, loss: 0, turns: [], maxTurns: 0 };
  for (let i = 0; i < count; i += 1) {
    const game = createGame(1000 + i);
    startGame(game);
    let guard = 0;
    while (game.phase === 'play' && guard < 200) {
      guard += 1;
      autopilotPlay(game, 'player', 8);
      if (game.phase !== 'play') break;
      endPlayerTurn(game);
    }
    if (game.phase === 'win') results.win += 1;
    else if (game.phase === 'loss') results.loss += 1;
    results.turns.push(game.turn);
    results.maxTurns = Math.max(results.maxTurns, game.turn);
  }
  const avg = results.turns.reduce((a, b) => a + b, 0) / Math.max(1, results.turns.length);
  const report = `selfplay games=${count} win=${results.win} loss=${results.loss} avgTurns=${avg.toFixed(1)} maxTurns=${results.maxTurns}`;
  document.title = report;
  statusEl.textContent = report;
  const pre = document.createElement('pre');
  pre.id = 'selfplay-report';
  pre.textContent = report;
  document.body.appendChild(pre);
  window.__selfplay = report;
  return report;
}

function describe(game) {
  if (game.phase === 'title') return 'Ember Pact. Title screen. Press Enter to begin.';
  if (game.phase === 'win') return `Victory. The Ash Warden is beaten in ${game.stats.turns} turns. Press Enter to play again.`;
  if (game.phase === 'loss') return `Defeat. Your spark is gone after ${game.stats.turns} turns. Press Enter to try again.`;
  return `Turn ${game.turn}. Your spark ${game.player.life}, guard ${game.player.guard}, ember ${game.player.ember}. Warden spark ${game.warden.life}, guard ${game.warden.guard}. ${game.intent ? game.intent.text : ''}`;
}

function main() {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  const selfplayCount = Number.parseInt(params.get('selfplay') || '0', 10);
  if (selfplayCount > 0) {
    selfPlay(selfplayCount);
    return;
  }

  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') || '1', 10);
  let game;
  let view = createView();
  if (shot) {
    const staged = stageShot(shot, seed);
    game = staged.game;
    // Render the staged frame at once; the screenshot is taken from this frame.
    render(ctx, game, view);
    statusEl.textContent = describe(game);
    document.title = `Ember Pact — ${shot} (seed ${staged.seed})`;
    window.__shotReady = true;
    window.__game = game;
    window.__shot = shot;
    return;
  }

  game = createGame(1);
  window.__game = game;
  window.__view = view;
  const input = bindInput(canvas, game, view, {
    onAction() {
      statusEl.textContent = describe(game);
    },
    onRestart() {
      game = createGame(Date.now() % 100000);
      window.__game = game;
      view = createView();
      window.__view = view;
      bindInput(canvas, game, view, this);
      statusEl.textContent = describe(game);
    },
  });
  void input;
  canvas.addEventListener('pointerdown', ensureAudio, { once: true });
  statusEl.textContent = describe(game);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateView(view, dt);
    render(ctx, game, view);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
