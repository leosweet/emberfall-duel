// Emberfall Duel — small seeded random number generator.
// One file, one job: every shuffle, draw and AI coin-flip in the game comes
// from here, so a ?seed= in the URL reproduces a whole table exactly.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A tiny RNG object with the helpers the game actually needs.
export class Rng {
  constructor(seed) {
    this.seed = seed >>> 0 || 1;
    this.nextFloat = mulberry32(this.seed);
  }

  // Float in [0, 1).
  float() {
    return this.nextFloat();
  }

  // Integer in [min, max].
  int(min, max) {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  // One element of an array, uniformly at random.
  pick(list) {
    return list[Math.floor(this.nextFloat() * list.length)];
  }

  // Fisher-Yates shuffle, in place, driven by this RNG.
  shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.nextFloat() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }
}

// Read ?seed= from the page URL; anything unparseable falls back to 1.
export function seedFromUrl(search) {
  const params = new URLSearchParams(search || '');
  const raw = Number.parseInt(params.get('seed') || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}
