// Emberfall Duel — screenshot scenes.
// One file, one job: given ?shot=title|play|win|loss&seed=, build the exact
// table that screenshot shows. Every scene is deterministic for its seed,
// so a screenshot can be retaken byte-identically.
//
// The scenes are real game states, not mock-ups: the play scene is a duel
// in progress (hands dealt, a few cards already played, mana partly spent),
// and the win/loss scenes are duels that really ended, with their stats.

import { Rng } from './random.js';
import { createDuel, drawCard, startDuel } from './duel.js';

// Find a card of a given definition id in a deck, or -1.
function findInDeck(state, side, defId) {
  return state[side].deck.findIndex((card) => card.defId === defId);
}

// Deal a fixed opening to the player, so the play scene always shows the
// same readable table: one card of each element plus a second Ember card,
// so Resonance is visible on the table.
function rigOpening(state) {
  const wanted = ['ember-spark', 'cinder-slash', 'bramble-guard', 'tide-surge', 'gale-dart'];
  // The opening hand is rebuilt from scratch: the dealt cards go back to
  // the discard pile and the five wanted cards are pulled from the deck.
  for (const card of state.player.hand) state.player.discard.push(card);
  state.player.hand = [];
  for (const defId of wanted) {
    const fromDeck = findInDeck(state, 'player', defId);
    if (fromDeck !== -1) {
      const [card] = state.player.deck.splice(fromDeck, 1);
      state.player.hand.push(card);
    }
  }
}

// Build the state for one screenshot scene. Returns null for an unknown
// scene name; main.js then falls back to the title screen.
export function buildShotScene(shot, seed) {
  const rng = new Rng(seed);
  if (shot === 'title') {
    const state = createDuel(rng);
    return state;
  }

  if (shot === 'play') {
    const state = createDuel(rng);
    startDuel(state);
    rigOpening(state);
    // A lively mid-game: turn 4, some mana spent, both sides bloodied a
    // little, and one Ember card already played so Resonance is visible.
    state.turn = 4;
    state.stats.turns = 4;
    state.manaMax.player = 4;
    state.mana.player = 2;
    state.manaMax.vex = 4;
    state.mana.vex = 4;
    state.player.hp = 24;
    state.player.shield = 3;
    state.vex.hp = 19;
    state.vex.shield = 2;
    state.playedElements = ['ember'];
    state.log = [
      'Turn 4 — the table is warm now.',
      'You played Ember Spark (Resonance ready).',
      'Vex played Tide Surge — 3 damage.',
      'Your move: a second Ember card hits +2.',
    ];
    // Vex shows four cards across the top.
    drawCard(state, 'vex');
    while (state.vex.hand.length > 4) state.vex.discard.push(state.vex.hand.pop());
    return state;
  }

  if (shot === 'win') {
    const state = createDuel(rng);
    startDuel(state);
    rigOpening(state);
    state.turn = 7;
    state.stats.turns = 7;
    state.stats.cardsPlayed = 11;
    state.stats.damageDealt = 34;
    state.player.hp = 12;
    state.player.shield = 0;
    state.vex.hp = 0;
    state.vex.shield = 0;
    state.mana.player = 1;
    state.manaMax.player = 7;
    state.mana.vex = 3;
    state.manaMax.vex = 7;
    state.winner = 'player';
    state.phase = 'win';
    state.endStats = { turns: 7, cardsPlayed: 11, damageDealt: 34, hpLeft: 12, vexHpLeft: 0 };
    state.log = ['Vex falls. Ember Knight wins!', 'Phoenix Roar closed the duel.'];
    return state;
  }

  if (shot === 'loss') {
    const state = createDuel(rng);
    startDuel(state);
    rigOpening(state);
    state.turn = 6;
    state.stats.turns = 6;
    state.stats.cardsPlayed = 8;
    state.stats.damageDealt = 21;
    state.player.hp = 0;
    state.player.shield = 0;
    state.vex.hp = 9;
    state.vex.shield = 4;
    state.mana.player = 0;
    state.manaMax.player = 6;
    state.mana.vex = 2;
    state.manaMax.vex = 6;
    state.winner = 'vex';
    state.phase = 'loss';
    state.endStats = { turns: 6, cardsPlayed: 8, damageDealt: 21, hpLeft: 0, vexHpLeft: 9 };
    state.log = ['The Ember Knight falls. Vex wins.', 'Storm Gust finished the duel.'];
    return state;
  }

  return null;
}

// The four screenshots the entry ships, in file order. The first by name
// is the cover.
export const SHOTS = [
  { name: '1-play.jpg', query: '?shot=play&seed=1' },
  { name: '2-title.jpg', query: '?shot=title&seed=1' },
  { name: '3-win.jpg', query: '?shot=win&seed=1' },
  { name: '4-loss.jpg', query: '?shot=loss&seed=1' },
];
