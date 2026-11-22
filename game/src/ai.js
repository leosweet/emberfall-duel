// Emberfall Duel — Ashwarden Vex, the opponent.
// One file, one job: read the table and decide what Vex plays. The AI
// never touches the renderer or the input; it only answers the question
// "which cards, in which order?" and the engine plays them.
//
// Vex can read the table:
//   - a killing blow is always taken first,
//   - low health reaches for shield and healing,
//   - an empty hand reaches for draw cards,
//   - otherwise the best damage-per-mana wins.

import { cardDef, cardValue } from './cards.js';
import { playableIndices } from './duel.js';

// How much damage Vex could deal right now with one card, Resonance counted.
function cardDamageNow(state, index) {
  const card = state.vex.hand[index];
  const def = cardDef(card.defId);
  if (!def.damage) return 0;
  const resonant = state.playedElements.includes(def.element);
  return def.damage + (resonant ? 2 : 0);
}

// The total damage Vex could still deal this turn if it spent everything
// on damage, counting Resonance as it goes (a rough, honest estimate).
function lethalLine(state) {
  const foe = state.player;
  const target = foe.hp + foe.shield;
  let mana = state.mana.vex;
  let dealt = 0;
  const seen = new Set(state.playedElements);
  const damageCards = playableIndices(state, 'vex')
    .filter((i) => cardDef(state.vex.hand[i].defId).damage)
    .sort((a, b) => cardDamageNow(state, b) - cardDamageNow(state, a));
  for (const i of damageCards) {
    const def = cardDef(state.vex.hand[i].defId);
    if (def.cost > mana) continue;
    mana -= def.cost;
    let value = def.damage;
    if (seen.has(def.element)) value += 2;
    seen.add(def.element);
    dealt += value;
    if (dealt >= target) return true;
  }
  return false;
}

// Score one candidate card for this exact table. Higher is better.
function scoreCard(state, index) {
  const card = state.vex.hand[index];
  const def = cardDef(card.defId);
  const value = cardValue(def);
  const efficiency = value / def.cost;
  let score = efficiency;

  // A killing blow outranks everything.
  if (def.damage && cardDamageNow(state, index) >= state.player.hp + state.player.shield) {
    score += 100;
  }
  // Low health: a guard or a heal is worth more than a hit.
  if (state.vex.hp <= 10) {
    if (def.shield || def.heal) score += 6;
    if (def.damage) score -= 1;
  }
  // An emptying hand: draw cards keep the duel going.
  if (state.vex.hand.length <= 2 && def.draw) score += 5;
  // Resonance in hand: the second card of an element is worth more.
  if (state.playedElements.includes(def.element)) score += 1.5;
  // Never waste a big heal on full health.
  if (def.heal && state.vex.hp >= 28) score -= 4;
  // A little jitter keeps Vex from playing the same line every game.
  score += state.rng.float() * 0.4;
  return score;
}

// Plan Vex's whole turn: a list of hand indices, in play order.
// The plan is recomputed from the live state each step, so a draw mid-turn
// can change what comes next.
export function planVexTurn(state) {
  const plan = [];
  // Simulate forward on scratch numbers: hand and mana shrink as the
  // plan grows, so the plan never spends mana it does not have.
  let mana = state.mana.vex;
  const hand = state.vex.hand.map((card, i) => ({ card, index: i }));
  const played = [...state.playedElements];

  for (let step = 0; step < 10; step += 1) {
    let best = null;
    let bestScore = 0.6; // a card must be worth playing at all
    for (const entry of hand) {
      const def = cardDef(entry.card.defId);
      if (def.cost > mana) continue;
      // Score against a shadow of the state with this plan applied.
      const shadow = {
        ...state,
        mana: { ...state.mana, vex: mana },
        playedElements: played,
        vex: { ...state.vex, hand: hand.map((h) => h.card) },
        player: state.player,
      };
      const score = scoreCard(shadow, hand.indexOf(entry));
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    if (!best) break;
    plan.push(best.index);
    const def = cardDef(best.card.defId);
    mana -= def.cost;
    played.push(def.element);
    hand.splice(hand.indexOf(best), 1);
    // A draw card refills the hand: keep planning with what is there.
    if (def.draw) break; // the live turn re-plans after the draw resolves
  }
  return plan;
}

// One step of Vex's turn for the live game: pick the single best card to
// play now, or null when Vex is done. main.js calls this after every play,
// so draws and Resonance feed back into the next choice.
export function vexNextCard(state) {
  const playable = playableIndices(state, 'vex');
  if (playable.length === 0) return null;
  let best = null;
  let bestScore = 0.6;
  for (const index of playable) {
    const score = scoreCard(state, index);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

// True when Vex can end the duel this turn.
export function vexHasLethal(state) {
  return lethalLine(state);
}
