// The cards of Ember Pact: four suits (elements), each with its own colour, shape and job.
// A card's numbers are its effect when played: dmg hits the enemy's spark (through guard),
// guard adds shield, heal restores spark, draw pulls cards, ember adds ember. `cond` is a
// bonus that fires only when a card of `cond.suit` was already played this turn.
// Ember Pact — original card game, written for the make.fun best card game bounty.

export const SUITS = {
  flame: { key: 'flame', name: 'Flame', color: '#e5484d', dark: '#8f1f24', light: '#ff8a80', shape: 'triangle', glyph: '▲', pact: 'Flame Pact: your next Flame card this turn deals +3.' },
  frost: { key: 'frost', name: 'Frost', color: '#38bdf8', dark: '#155e75', light: '#a5e3ff', shape: 'diamond', glyph: '◆', pact: 'Frost Pact: gain +4 guard.' },
  gale: { key: 'gale', name: 'Gale', color: '#4ade80', dark: '#166534', light: '#bbf7d0', shape: 'circle', glyph: '●', pact: 'Gale Pact: draw 1 card.' },
  stone: { key: 'stone', name: 'Stone', color: '#f59e0b', dark: '#92400e', light: '#fde68a', shape: 'square', glyph: '■', pact: 'Stone Pact: heal 3 spark.' },
};

export const SUIT_ORDER = ['flame', 'frost', 'gale', 'stone'];

// id, name, suit, cost, effect numbers, one-line rules text.
export const CARDS = [
  { id: 'cinder-jab', name: 'Cinder Jab', suit: 'flame', cost: 1, dmg: 3, text: 'Deal 3.' },
  { id: 'ember-slash', name: 'Ember Slash', suit: 'flame', cost: 2, dmg: 5, text: 'Deal 5.' },
  { id: 'wildfire', name: 'Wildfire', suit: 'flame', cost: 3, dmg: 8, text: 'Deal 8.' },
  { id: 'phoenix-dive', name: 'Phoenix Dive', suit: 'flame', cost: 4, dmg: 11, text: 'Deal 11.' },
  { id: 'spark-spray', name: 'Spark Spray', suit: 'flame', cost: 1, dmg: 2, draw: 1, text: 'Deal 2. Draw 1.' },
  { id: 'backdraft', name: 'Backdraft', suit: 'flame', cost: 2, dmg: 4, cond: { suit: 'flame', dmg: 2 }, text: 'Deal 4. +2 if a Flame was played this turn.' },
  { id: 'frost-wall', name: 'Frost Wall', suit: 'frost', cost: 1, guard: 4, text: 'Gain 4 guard.' },
  { id: 'glacial-shell', name: 'Glacial Shell', suit: 'frost', cost: 2, guard: 7, text: 'Gain 7 guard.' },
  { id: 'icebound', name: 'Icebound', suit: 'frost', cost: 3, guard: 11, text: 'Gain 11 guard.' },
  { id: 'snowdrift', name: 'Snowdrift', suit: 'frost', cost: 1, guard: 3, draw: 1, text: 'Gain 3 guard. Draw 1.' },
  { id: 'deep-freeze', name: 'Deep Freeze', suit: 'frost', cost: 2, guard: 5, dmg: 2, text: 'Gain 5 guard. Deal 2.' },
  { id: 'hailstorm', name: 'Hailstorm', suit: 'frost', cost: 3, dmg: 5, guard: 4, text: 'Deal 5. Gain 4 guard.' },
  { id: 'zephyr', name: 'Zephyr', suit: 'gale', cost: 1, draw: 2, text: 'Draw 2.' },
  { id: 'tailwind', name: 'Tailwind', suit: 'gale', cost: 2, ember: 4, draw: 1, text: 'Gain 4 ember. Draw 1.' },
  { id: 'stormcall', name: 'Stormcall', suit: 'gale', cost: 3, draw: 3, text: 'Draw 3.' },
  { id: 'breeze', name: 'Breeze', suit: 'gale', cost: 0, ember: 2, text: 'Gain 2 ember.' },
  { id: 'squall', name: 'Squall', suit: 'gale', cost: 2, dmg: 3, draw: 1, text: 'Deal 3. Draw 1.' },
  { id: 'tempest', name: 'Tempest', suit: 'gale', cost: 4, dmg: 6, draw: 2, text: 'Deal 6. Draw 2.' },
  { id: 'pebble-ward', name: 'Pebble Ward', suit: 'stone', cost: 1, guard: 3, heal: 1, text: 'Gain 3 guard. Heal 1.' },
  { id: 'granite-skin', name: 'Granite Skin', suit: 'stone', cost: 2, guard: 6, heal: 2, text: 'Gain 6 guard. Heal 2.' },
  { id: 'mountains-heart', name: "Mountain's Heart", suit: 'stone', cost: 3, heal: 6, text: 'Heal 6 spark.' },
  { id: 'boulder-toss', name: 'Boulder Toss', suit: 'stone', cost: 2, dmg: 6, text: 'Deal 6.' },
  { id: 'quarry', name: 'Quarry', suit: 'stone', cost: 1, ember: 3, text: 'Gain 3 ember.' },
  { id: 'bedrock', name: 'Bedrock', suit: 'stone', cost: 4, guard: 10, text: 'Gain 10 guard.' },
];

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

/**
 * Build a 30-card deck: one of every card, plus a second copy of each cost-1 card,
 * then shuffle it with `random`. A fresh deck object is returned (cards are ids).
 */
export function buildDeck(random) {
  const ids = CARDS.map((c) => c.id);
  for (const card of CARDS) {
    if (card.cost === 1) ids.push(card.id);
  }
  const out = [];
  while (ids.length > 0) {
    const at = Math.floor(random() * ids.length);
    out.push(ids.splice(at, 1)[0]);
  }
  return out;
}

/** The Pact bonus text for a suit, used by the table and the log. */
export function pactText(suitKey) {
  return SUITS[suitKey].pact;
}
