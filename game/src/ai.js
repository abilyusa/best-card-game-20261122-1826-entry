// The Ash Warden's mind: it reads the table and commits to a plan the player can see.
// It scores every card it can afford, prefers lethal, then survival when hurt, then the
// biggest swing, and takes a Pact when one is on the table. The plan it returns is the
// intent the table shows before the player's turn ends, so the player can read it and
// answer it with guard, healing, or a faster kill.
// Ember Pact — original card game, written for the make.fun best card game bounty.

import { CARD_BY_ID } from './cards.js';
import { EMBER_PER_TURN, WARDEN_PLAYS_PER_TURN, playCard } from './state.js';

/** How much a card is worth to the Warden right now, given the table. */
function scoreCard(game, card, played) {
  const w = game.warden;
  const p = game.player;
  let score = 0;
  const dmgW = p.life <= 8 ? 1.6 : 1.0;
  const defW = w.life <= 9 ? 1.6 : 0.9;
  score += (card.dmg || 0) * dmgW;
  score += (card.guard || 0) * 0.8 * defW;
  score += (card.heal || 0) * 0.9 * defW;
  score += (card.draw || 0) * 1.4;
  score += (card.ember || 0) * 0.45;
  // A second card of a suit fires its Pact: worth reaching for.
  if (played[card.suit] === 1) score += 2.2;
  if (card.cond && played[card.cond.suit] >= 1) score += (card.cond.dmg || 0) * dmgW;
  if (card.suit === 'flame' && w.flameBoost > 0) score += w.flameBoost * dmgW;
  // Cheap cards are worth a little more: they leave ember for a second play.
  score -= card.cost * 0.15;
  return score;
}

/**
 * Plan the Warden's next turn from its hand and the ember it will have (now + 3).
 * `game.wardenMode` steers it: 'greedy' (default, plays to win), 'timid' (one card,
 * prefers guard — used for the win screenshot), 'random' (a random affordable card).
 * Returns { cards: [ids in play order], dmg, guard, text }.
 */
export function planWardenTurn(game) {
  const w = game.warden;
  const mode = game.wardenMode || 'greedy';
  const ember = Math.min(w.maxEmber, w.ember + EMBER_PER_TURN);
  const played = { flame: 0, frost: 0, gale: 0, stone: 0 };
  const chosen = [];
  let left = ember;
  const limit = mode === 'timid' ? 1 : WARDEN_PLAYS_PER_TURN;
  for (let pick = 0; pick < limit; pick += 1) {
    let best = null;
    let bestScore = 0;
    for (const id of w.hand) {
      if (chosen.includes(id)) continue;
      const card = CARD_BY_ID.get(id);
      if (card.cost > left) continue;
      let score;
      if (mode === 'random') {
        score = game.random();
      } else {
        score = scoreCard(game, card, played);
        if (mode === 'timid') score = (card.guard || 0) * 2 + (card.heal || 0) * 1.5 + (card.dmg || 0) * 0.2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }
    if (!best) break;
    chosen.push(best.id);
    played[best.suit] += 1;
    left -= best.cost;
  }
  let dmg = 0;
  let guard = 0;
  for (const id of chosen) {
    const card = CARD_BY_ID.get(id);
    dmg += card.dmg || 0;
    guard += card.guard || 0;
    if (card.cond && played[card.cond.suit] >= 1) dmg += card.cond.dmg || 0;
  }
  // The Flame Pact fires on the second Flame: the next Flame after it hits harder.
  const flameCount = chosen.filter((id) => CARD_BY_ID.get(id).suit === 'flame').length;
  if (flameCount >= 2) dmg += 3;
  if (chosen.length === 0) {
    return { cards: [], dmg: 0, guard: 0, text: 'The Warden gathers ember and waits.' };
  }
  const names = chosen.map((id) => CARD_BY_ID.get(id).name).join(' + ');
  const bits = [];
  if (dmg > 0) bits.push(`strike ${dmg}`);
  if (guard > 0) bits.push(`guard ${guard}`);
  return { cards: chosen, dmg, guard, text: `Warden plans ${names} — ${bits.join(' and ') || 'quiet work'}.` };
}

/**
 * A greedy autopilot for either side (used by the screenshot scenes and the self-play
 * test): play the best affordable card while one is worth playing, then stop.
 * `maxPlays` caps how many cards it plays this turn (a passive player plays few).
 * Returns the number of cards it played.
 */
export function autopilotPlay(game, side, maxPlays = 8) {
  const s = game[side];
  let played = 0;
  for (let step = 0; step < maxPlays; step += 1) {
    let best = -1;
    let bestScore = 0.5;
    for (let i = 0; i < s.hand.length; i += 1) {
      const card = CARD_BY_ID.get(s.hand[i]);
      if (card.cost > s.ember) continue;
      let score = (card.dmg || 0) + (card.guard || 0) * 0.8 + (card.heal || 0) * 0.9 + (card.draw || 0) * 1.4 + (card.ember || 0) * 0.45 - card.cost * 0.15;
      if (s.played[card.suit] === 1) score += 2.2;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best === -1) break;
    if (!playCard(game, side, best)) break;
    played += 1;
    if (game.phase !== 'play') break;
  }
  return played;
}
