// Mouse and keyboard for Ember Pact. Click a card to play it, click END TURN (or Space)
// to end the turn, press 1–7 to play from the hand, Enter to start or play again, Esc
// back to the title, M to mute. Hovering a card lifts it so the hand reads at a glance.
// Ember Pact — original card game, written for the make.fun best card game bounty.

import { CARD_BY_ID } from './cards.js';
import { canPlay, playCard, startGame, endPlayerTurn } from './state.js';
import { getLayout, flyCard, spawnEmbers, VIEW_W, VIEW_H } from './render.js';
import { ensureAudio, sfx, setMuted, isMuted } from './audio.js';

function toGameCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW_W,
    y: ((clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function inside(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/**
 * Wire the canvas and keys to the game. `hooks` carries the callbacks the main loop
 * owns: onAction (a card was played or the turn ended) and onPhase (title/win/loss).
 */
export function bindInput(canvas, game, view, hooks) {
  let wardenBusy = false;

  function tryPlay(index) {
    if (game.phase !== 'play' || wardenBusy) return;
    if (!canPlay(game, 'player', index)) {
      sfx('click');
      return;
    }
    const layout = getLayout(game, view);
    const slot = layout.hand.find((h) => h.index === index);
    const card = CARD_BY_ID.get(game.player.hand[index]);
    if (slot) flyCard(view, card, slot.x, slot.y);
    ensureAudio();
    const wasGuard = game.player.guard;
    const wasLife = game.player.life;
    const foeLife = game.warden.life;
    playCard(game, 'player', index);
    if (card.dmg) {
      sfx('damage');
      view.shake = 10;
      spawnEmbers(view, VIEW_W / 2, 220, 14, '#e5484d');
    } else if (card.guard) sfx('guard');
    else if (card.heal) sfx('heal');
    else if (card.ember || card.draw) sfx('ember');
    else sfx('play');
    if (game.player.played[card.suit] === 2) sfx('pact');
    void wasGuard;
    void wasLife;
    void foeLife;
    if (hooks.onAction) hooks.onAction();
    if (game.phase === 'win') {
      sfx('win');
      spawnEmbers(view, VIEW_W / 2, 300, 60, '#ff9a3c');
      view.winBurst = 1;
    } else if (game.phase === 'loss') {
      sfx('loss');
    }
  }

  function tryEndTurn() {
    if (game.phase !== 'play' || wardenBusy) return;
    wardenBusy = true;
    sfx('turn');
    // The Warden's cards resolve with a beat between them so the player can follow.
    setTimeout(() => {
      endPlayerTurn(game);
      wardenBusy = false;
      if (hooks.onAction) hooks.onAction();
      if (game.phase === 'win') {
        sfx('win');
        spawnEmbers(view, VIEW_W / 2, 300, 60, '#ff9a3c');
      } else if (game.phase === 'loss') {
        sfx('loss');
      }
    }, 450);
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = toGameCoords(canvas, e.clientX, e.clientY);
    view.mouse = p;
    if (game.phase === 'play') {
      const layout = getLayout(game, view);
      let hover = -1;
      // Topmost card wins: scan from the rightmost (last drawn) backwards.
      for (let i = layout.hand.length - 1; i >= 0; i -= 1) {
        if (inside(p.x, p.y, layout.hand[i])) {
          hover = layout.hand[i].index;
          break;
        }
      }
      view.hover = hover;
    } else {
      view.hover = -1;
    }
  });

  canvas.addEventListener('click', (e) => {
    ensureAudio();
    const p = toGameCoords(canvas, e.clientX, e.clientY);
    if (game.phase === 'title') {
      startGame(game);
      sfx('turn');
      if (hooks.onAction) hooks.onAction();
      return;
    }
    if (game.phase === 'win' || game.phase === 'loss') {
      if (hooks.onRestart) hooks.onRestart();
      return;
    }
    if (game.phase !== 'play' || wardenBusy) return;
    const layout = getLayout(game, view);
    for (let i = layout.hand.length - 1; i >= 0; i -= 1) {
      if (inside(p.x, p.y, layout.hand[i])) {
        tryPlay(layout.hand[i].index);
        return;
      }
    }
    if (inside(p.x, p.y, layout.endTurn)) tryEndTurn();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      setMuted(!isMuted());
      return;
    }
    if (game.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      ensureAudio();
      startGame(game);
      sfx('turn');
      if (hooks.onAction) hooks.onAction();
      return;
    }
    if ((game.phase === 'win' || game.phase === 'loss') && e.key === 'Enter') {
      if (hooks.onRestart) hooks.onRestart();
      return;
    }
    if (game.phase === 'play') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        tryEndTurn();
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= 7) tryPlay(n - 1);
    }
    if (e.key === 'Escape' && game.phase !== 'title') {
      game.phase = 'title';
      if (hooks.onAction) hooks.onAction();
    }
  });

  return { tryPlay, tryEndTurn, isWardenBusy: () => wardenBusy };
}
