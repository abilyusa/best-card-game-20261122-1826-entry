// A small deterministic RNG (mulberry32) so a screenshot seed always replays the same game.
// Ember Pact — original card game, written for the make.fun best card game bounty.

/** Make a seeded random function returning a float in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle a copy of `items` with `random` and return it. */
export function shuffle(items, random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Pick an integer in [0, n). */
export function pickInt(random, n) {
  return Math.floor(random() * n);
}
