// The rules of Ember Pact: two spark-keepers duel. Each side has spark (life, 24) and
// ember (the mana cards cost, +3 a turn, cap 10). A turn is: draw 2, play any cards you
// can afford, end turn. Guard soaks damage but fades at the start of your next turn, so
// it must be timed against the enemy's attack. Playing a second
// card of one suit in a turn fires that suit's Pact. The first side to 0 spark loses.
// Ember Pact — original card game, written for the make.fun best card game bounty.

import { buildDeck, CARD_BY_ID, SUIT_ORDER } from './cards.js';
import { mulberry32 } from './rng.js';
import { planWardenTurn } from './ai.js';

export const MAX_LIFE = 24;
export const MAX_EMBER = 10;
export const EMBER_PER_TURN = 3;
export const DRAW_PER_TURN = 2;
export const HAND_MAX = 7;
export const WARDEN_PLAYS_PER_TURN = 2;

function freshSide(random) {
  return {
    life: MAX_LIFE,
    maxLife: MAX_LIFE,
    ember: 3,
    maxEmber: MAX_EMBER,
    guard: 0,
    deck: buildDeck(random),
    hand: [],
    discard: [],
    played: { flame: 0, frost: 0, gale: 0, stone: 0 },
    flameBoost: 0,
  };
}

/** A new game. `seed` drives every shuffle, so one seed always replays one game. */
export function createGame(seed) {
  const random = mulberry32(seed);
  const game = {
    seed,
    random,
    turn: 1,
    phase: 'title',
    player: freshSide(random),
    warden: freshSide(random),
    log: [],
    intent: null,
    winner: null,
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, turns: 0 },
  };
  drawCards(game, 'player', 5);
  drawCards(game, 'warden', 5);
  return game;
}

export function other(side) {
  return side === 'player' ? 'warden' : 'player';
}

export function sideName(side) {
  return side === 'player' ? 'You' : 'Ash Warden';
}

function log(game, text) {
  game.log.unshift(text);
  if (game.log.length > 6) game.log.length = 6;
}

/** Draw up to `n` cards for `side`; overflow past a full hand is burned. */
export function drawCards(game, side, n) {
  const s = game[side];
  for (let i = 0; i < n; i += 1) {
    if (s.deck.length === 0) {
      if (s.discard.length === 0) break;
      s.deck = s.discard;
      s.discard = [];
      for (let j = s.deck.length - 1; j > 0; j -= 1) {
        const k = Math.floor(game.random() * (j + 1));
        const tmp = s.deck[j];
        s.deck[j] = s.deck[k];
        s.deck[k] = tmp;
      }
      log(game, `${sideName(side)} reshuffles the discard into the deck.`);
    }
    const id = s.deck.pop();
    if (s.hand.length >= HAND_MAX) {
      s.discard.push(id);
      log(game, `${sideName(side)} burns ${CARD_BY_ID.get(id).name} (hand full).`);
    } else {
      s.hand.push(id);
    }
  }
}

/** Damage soaks guard first, then spark. Returns the spark damage actually dealt. */
function dealDamage(game, target, amount) {
  if (amount <= 0) return 0;
  const s = game[target];
  const soaked = Math.min(s.guard, amount);
  s.guard -= soaked;
  const spark = amount - soaked;
  s.life = Math.max(0, s.life - spark);
  if (target === 'warden') game.stats.damageDealt += spark;
  if (target === 'player') game.stats.damageTaken += spark;
  return spark;
}

function heal(game, side, amount) {
  const s = game[side];
  s.life = Math.min(s.maxLife, s.life + amount);
}

function firePact(game, side, suit) {
  const s = game[side];
  const who = sideName(side);
  if (suit === 'flame') {
    s.flameBoost += 3;
    log(game, `${who} fires the Flame Pact: next Flame deals +3.`);
  } else if (suit === 'frost') {
    s.guard += 4;
    log(game, `${who} fires the Frost Pact: +4 guard.`);
  } else if (suit === 'gale') {
    drawCards(game, side, 1);
    log(game, `${who} fires the Gale Pact: draws 1.`);
  } else if (suit === 'stone') {
    heal(game, side, 3);
    log(game, `${who} fires the Stone Pact: heals 3.`);
  }
}

/** Can `side` play the card at `handIndex` right now? */
export function canPlay(game, side, handIndex) {
  if (game.phase !== 'play') return false;
  const s = game[side];
  const id = s.hand[handIndex];
  if (id === undefined) return false;
  return s.ember >= CARD_BY_ID.get(id).cost;
}

/**
 * Play the card at `handIndex` for `side`. Applies its numbers, its conditional bonus,
 * and the suit Pact when it is the second card of that suit this turn. Returns true when
 * the card was played. Win and loss are checked after every play.
 */
export function playCard(game, side, handIndex) {
  if (!canPlay(game, side, handIndex)) return false;
  const s = game[side];
  const foe = other(side);
  const id = s.hand[handIndex];
  const card = CARD_BY_ID.get(id);
  s.hand.splice(handIndex, 1);
  s.discard.push(id);
  s.ember -= card.cost;
  game.stats.cardsPlayed += 1;

  const playedBefore = s.played[card.suit];
  s.played[card.suit] += 1;

  let dmg = card.dmg || 0;
  if (card.cond && playedBefore >= 1 && s.played[card.cond.suit] >= 1) {
    dmg += card.cond.dmg || 0;
  }
  if (card.suit === 'flame' && s.flameBoost > 0) {
    dmg += s.flameBoost;
    s.flameBoost = 0;
  }
  if (dmg > 0) {
    const dealt = dealDamage(game, foe, dmg);
    log(game, `${sideName(side)} plays ${card.name}: ${dmg} damage${dealt < dmg ? ` (${dmg - dealt} soaked)` : ''}.`);
  }
  if (card.guard) {
    s.guard += card.guard;
    log(game, `${sideName(side)} plays ${card.name}: +${card.guard} guard.`);
  }
  if (card.heal) {
    heal(game, side, card.heal);
    log(game, `${sideName(side)} plays ${card.name}: heals ${card.heal}.`);
  }
  if (card.ember) {
    s.ember = Math.min(s.maxEmber, s.ember + card.ember);
    log(game, `${sideName(side)} plays ${card.name}: +${card.ember} ember.`);
  }
  if (card.draw) drawCards(game, side, card.draw);

  if (s.played[card.suit] === 2) firePact(game, side, card.suit);
  checkEnd(game);
  return true;
}

/** Has either side reached 0 spark? Sets phase and winner. */
export function checkEnd(game) {
  if (game.phase !== 'play') return;
  if (game.warden.life <= 0) {
    game.phase = 'win';
    game.winner = 'player';
    log(game, 'The Ash Warden crumbles. Victory!');
  } else if (game.player.life <= 0) {
    game.phase = 'loss';
    game.winner = 'warden';
    log(game, 'Your spark gutters out. The Warden stands.');
  }
}

/** Begin the player's turn: guard from last turn fades, draw, ember, fresh Pact counts, and the Warden's intent. */
export function startPlayerTurn(game) {
  const p = game.player;
  p.guard = 0;
  p.played = { flame: 0, frost: 0, gale: 0, stone: 0 };
  p.flameBoost = 0;
  p.ember = Math.min(p.maxEmber, p.ember + EMBER_PER_TURN);
  drawCards(game, 'player', DRAW_PER_TURN);
  game.stats.turns += 1;
  game.intent = planWardenTurn(game);
  log(game, `Turn ${game.turn}: you draw ${DRAW_PER_TURN} and gain ${EMBER_PER_TURN} ember.`);
}

/** Begin a game from the title screen. */
export function startGame(game) {
  game.phase = 'play';
  game.log = [];
  startPlayerTurn(game);
}

/** End the player's turn: the Warden takes its turn, then a new player turn begins. */
export function endPlayerTurn(game) {
  if (game.phase !== 'play') return;
  const w = game.warden;
  w.guard = 0;
  w.played = { flame: 0, frost: 0, gale: 0, stone: 0 };
  w.flameBoost = 0;
  w.ember = Math.min(w.maxEmber, w.ember + EMBER_PER_TURN);
  const plan = game.intent && game.intent.cards ? game.intent : planWardenTurn(game);
  // Play the planned cards from the hand (indexes shift as cards leave, so re-find by id).
  for (const id of plan.cards) {
    if (game.phase !== 'play') break;
    const at = w.hand.indexOf(id);
    if (at === -1) continue;
    if (!canPlay(game, 'warden', at)) continue;
    playCard(game, 'warden', at);
  }
  if (game.phase !== 'play') return;
  drawCards(game, 'warden', DRAW_PER_TURN);
  game.turn += 1;
  startPlayerTurn(game);
}

/** The suits the side has played this turn, in order, for the Pact tracker. */
export function pactCounts(game, side) {
  return SUIT_ORDER.map((key) => ({ suit: key, count: game[side].played[key] }));
}
