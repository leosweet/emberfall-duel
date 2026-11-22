// Emberfall Duel — the twelve original cards and the 24-card deck.
// One file, one job: what every card is and what it does. No rules live
// here (duel.js owns those); this file only declares the cards.
//
// Every card carries one primary number (damage, shield, heal or draw).
// Resonance adds +2 to that number when it is the second card of its
// element played in the same turn.

export const CARD_DEFS = [
  // ---- Ember: raw damage, the fastest way to close a duel. ----
  {
    id: 'ember-spark',
    name: 'Ember Spark',
    element: 'ember',
    cost: 1,
    damage: 2,
    text: 'Deal 2 damage.',
    flavor: 'A first coal, still warm.',
  },
  {
    id: 'cinder-slash',
    name: 'Cinder Slash',
    element: 'ember',
    cost: 2,
    damage: 4,
    text: 'Deal 4 damage.',
    flavor: 'The blade comes out glowing.',
  },
  {
    id: 'phoenix-roar',
    name: 'Phoenix Roar',
    element: 'ember',
    cost: 4,
    damage: 7,
    text: 'Deal 7 damage.',
    flavor: 'The whole hearth answers at once.',
  },
  // ---- Thorn: damage with a guard, and slow, patient growth. ----
  {
    id: 'bramble-guard',
    name: 'Bramble Guard',
    element: 'thorn',
    cost: 1,
    shield: 5,
    text: 'Gain 5 shield.',
    flavor: 'Thorns grow where you stand.',
  },
  {
    id: 'thorn-snare',
    name: 'Thorn Snare',
    element: 'thorn',
    cost: 2,
    damage: 3,
    shield: 2,
    text: 'Deal 3 damage. Gain 2 shield.',
    flavor: 'It bites, and it holds the line.',
  },
  {
    id: 'rootbound-bloom',
    name: 'Rootbound Bloom',
    element: 'thorn',
    cost: 3,
    shield: 4,
    draw: 1,
    text: 'Gain 4 shield. Draw a card.',
    flavor: 'Roots drink deep; the hand grows.',
  },
  // ---- Tide: damage that flows, and water that mends. ----
  {
    id: 'moonwell-sip',
    name: 'Moonwell Sip',
    element: 'tide',
    cost: 1,
    heal: 4,
    text: 'Restore 4 health.',
    flavor: 'Cold water, old moonlight.',
  },
  {
    id: 'tide-surge',
    name: 'Tide Surge',
    element: 'tide',
    cost: 2,
    damage: 3,
    text: 'Deal 3 damage.',
    flavor: 'The wave does not ask first.',
  },
  {
    id: 'deep-current',
    name: 'Deep Current',
    element: 'tide',
    cost: 3,
    damage: 5,
    draw: 1,
    text: 'Deal 5 damage. Draw a card.',
    flavor: 'Undertow pulls twice.',
  },
  // ---- Gale: quick cuts, and wind that brings more cards. ----
  {
    id: 'gale-dart',
    name: 'Gale Dart',
    element: 'gale',
    cost: 1,
    damage: 2,
    text: 'Deal 2 damage.',
    flavor: 'You hear it after it lands.',
  },
  {
    id: 'windfall',
    name: 'Windfall',
    element: 'gale',
    cost: 2,
    draw: 2,
    text: 'Draw 2 cards.',
    flavor: 'The wind owes you a favour.',
  },
  {
    id: 'storm-gust',
    name: 'Storm Gust',
    element: 'gale',
    cost: 3,
    damage: 6,
    text: 'Deal 6 damage.',
    flavor: 'The whole sky leans in.',
  },
];

// Look a card definition up by id; throws on an unknown id so a typo
// fails loudly in development instead of silently dealing nothing.
export function cardDef(id) {
  const def = CARD_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`unknown card: ${id}`);
  return def;
}

// The primary number of a card — the one Resonance adds +2 to.
export function primaryValue(def) {
  if (def.damage) return def.damage;
  if (def.shield) return def.shield;
  if (def.heal) return def.heal;
  return 0;
}

// Build a fresh 24-card deck: two copies of each of the twelve cards,
// shuffled with the game's RNG. Each copy gets its own uid.
export function buildDeck(rng) {
  const deck = [];
  let uid = 0;
  for (const def of CARD_DEFS) {
    for (let copy = 0; copy < 2; copy += 1) {
      deck.push({ uid: `c${uid}`, defId: def.id });
      uid += 1;
    }
  }
  return rng.shuffle(deck);
}

// The value a card is worth to the AI, before mana is considered:
// damage and healing count double, shield and draw count single.
export function cardValue(def) {
  return (def.damage || 0) * 2 + (def.heal || 0) * 2 + (def.shield || 0) + (def.draw || 0) * 3;
}
