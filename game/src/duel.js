// Emberfall Duel — the rules engine.
// One file, one job: turns, mana, draws, Resonance, damage and shields,
// and deciding when the duel is over. No drawing and no input live here,
// so the same engine runs in the browser and in headless Node tests.

import { GAME } from './config.js';
import { buildDeck, cardDef, primaryValue } from './cards.js';

export const SIDES = ['player', 'vex'];

function newFighter(rng) {
  return {
    hp: GAME.maxHp,
    shield: 0,
    hand: [],
    deck: buildDeck(rng),
    discard: [],
  };
}

// A fresh duel, sitting on the title screen: nothing dealt yet.
export function createDuel(rng) {
  return {
    rng,
    phase: 'title',
    turn: 0,
    activeSide: 'player',
    mana: { player: 0, vex: 0 },
    manaMax: { player: 0, vex: 0 },
    player: newFighter(rng),
    vex: newFighter(rng),
    playedElements: [],
    log: [],
    stats: { turns: 0, cardsPlayed: 0, damageDealt: 0, damageTaken: 0 },
    winner: null,
    endStats: null,
  };
}

// Draw one card for a side. An empty deck is reshuffled from the discard
// pile; a side with neither deck nor discard simply draws nothing.
export function drawCard(state, side) {
  const fighter = state[side];
  if (fighter.deck.length === 0) {
    if (fighter.discard.length === 0) return null;
    fighter.deck = state.rng.shuffle(fighter.discard.splice(0));
  }
  if (fighter.hand.length >= GAME.handLimit) {
    // A full hand burns the drawn card instead of growing past the limit.
    const burned = fighter.deck.pop();
    state.log.push(`${side === 'player' ? 'You' : 'Vex'} burned a card (hand full).`);
    fighter.discard.push(burned);
    return null;
  }
  const card = fighter.deck.pop();
  fighter.hand.push(card);
  return card;
}

function logLine(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

// Deal the opening hands and start turn 1 for the player.
export function startDuel(state) {
  state.phase = 'play';
  state.turn = 1;
  state.stats = { turns: 1, cardsPlayed: 0, damageDealt: 0, damageTaken: 0 };
  state.winner = null;
  state.endStats = null;
  state.log = ['The duel begins. Ember Knight, your move.'];
  for (const side of SIDES) {
    for (let i = 0; i < GAME.startHand; i += 1) drawCard(state, side);
  }
  beginTurn(state, 'player');
}

// Open a side's turn: mana grows 1 -> 10 with the turn number and refills,
// one card is drawn, and the Resonance record starts empty.
export function beginTurn(state, side) {
  state.activeSide = side;
  state.playedElements = [];
  if (side === 'player') {
    state.manaMax.player = Math.min(state.turn, GAME.maxMana);
    state.mana.player = state.manaMax.player;
    drawCard(state, 'player');
  } else {
    state.manaMax.vex = Math.min(state.turn, GAME.maxMana);
    state.mana.vex = state.manaMax.vex;
    drawCard(state, 'vex');
  }
}

// The other side of a fighter.
export function otherSide(side) {
  return side === 'player' ? 'vex' : 'player';
}

// Is this card playable right now, and if not, why?
export function playBlockReason(state, side, index) {
  if (state.phase !== 'play') return 'the duel is not in play';
  if (state.activeSide !== side) return 'it is not your turn';
  const fighter = state[side];
  const card = fighter.hand[index];
  if (!card) return 'no card there';
  const def = cardDef(card.defId);
  if (def.cost > state.mana[side]) return `needs ${def.cost} mana`;
  return null;
}

// Deal damage to a fighter: shield absorbs first, the rest hits health.
function dealDamage(state, side, amount) {
  const fighter = state[side];
  let rest = amount;
  if (fighter.shield > 0) {
    const absorbed = Math.min(fighter.shield, rest);
    fighter.shield -= absorbed;
    rest -= absorbed;
  }
  fighter.hp = Math.max(0, fighter.hp - rest);
  return rest;
}

// Play the card at hand[index] for a side. Returns { ok, reason, events }.
// Events describe what happened so the renderer can animate it.
export function playCard(state, side, index) {
  const blocked = playBlockReason(state, side, index);
  if (blocked) return { ok: false, reason: blocked, events: [] };

  const fighter = state[side];
  const foe = state[otherSide(side)];
  const card = fighter.hand[index];
  const def = cardDef(card.defId);
  const who = side === 'player' ? 'You' : 'Vex';

  // Resonance: a second card of the same element in one turn is +2.
  const resonant = state.playedElements.includes(def.element);
  const bonus = resonant ? GAME.resonanceBonus : 0;
  state.playedElements.push(def.element);

  state.mana[side] -= def.cost;
  fighter.hand.splice(index, 1);
  fighter.discard.push(card);
  state.stats.cardsPlayed += 1;

  const events = [{ kind: 'play', side, element: def.element, name: def.name, resonant }];

  if (def.damage) {
    const amount = def.damage + bonus;
    const dealt = dealDamage(state, otherSide(side), amount);
    events.push({ kind: 'damage', side: otherSide(side), amount: dealt, element: def.element });
    if (side === 'player') state.stats.damageDealt += dealt;
    else state.stats.damageTaken += dealt;
    logLine(state, `${who} played ${def.name}${resonant ? ' (Resonance +2!)' : ''} — ${dealt} damage.`);
  }
  if (def.shield) {
    const amount = def.shield + bonus;
    fighter.shield += amount;
    events.push({ kind: 'shield', side, amount, element: def.element });
    logLine(state, `${who} played ${def.name}${resonant ? ' (Resonance +2!)' : ''} — +${amount} shield.`);
  }
  if (def.heal) {
    const amount = Math.min(def.heal + bonus, GAME.maxHp - fighter.hp);
    fighter.hp += amount;
    events.push({ kind: 'heal', side, amount, element: def.element });
    logLine(state, `${who} played ${def.name}${resonant ? ' (Resonance +2!)' : ''} — healed ${amount}.`);
  }
  if (def.draw) {
    for (let i = 0; i < def.draw; i += 1) drawCard(state, side);
    events.push({ kind: 'draw', side, amount: def.draw, element: def.element });
    if (!def.damage && !def.shield && !def.heal) {
      logLine(state, `${who} played ${def.name}${resonant ? ' (Resonance +2!)' : ''} — drew ${def.draw}.`);
    }
  }

  checkEnd(state);
  return { ok: true, reason: null, events };
}

// Has either fighter fallen? Sets phase, winner and the end-screen stats.
export function checkEnd(state) {
  if (state.phase !== 'play') return;
  let winner = null;
  if (state.vex.hp <= 0) winner = 'player';
  else if (state.player.hp <= 0) winner = 'vex';
  if (!winner) return;
  state.winner = winner;
  state.phase = winner === 'player' ? 'win' : 'loss';
  state.endStats = {
    turns: state.stats.turns,
    cardsPlayed: state.stats.cardsPlayed,
    damageDealt: state.stats.damageDealt,
    hpLeft: state.player.hp,
    vexHpLeft: state.vex.hp,
  };
  logLine(state, winner === 'player' ? 'Vex falls. Ember Knight wins!' : 'The Ember Knight falls. Vex wins.');
}

// End the active side's turn and open the next one.
export function endTurn(state) {
  if (state.phase !== 'play') return false;
  if (state.activeSide === 'player') {
    beginTurn(state, 'vex');
  } else {
    state.turn += 1;
    state.stats.turns = state.turn;
    beginTurn(state, 'player');
  }
  return true;
}

// Hand indices the given side could legally play right now.
export function playableIndices(state, side) {
  const out = [];
  for (let i = 0; i < state[side].hand.length; i += 1) {
    if (!playBlockReason(state, side, i)) out.push(i);
  }
  return out;
}

// The primary number of the card at hand[index], Resonance included.
export function effectiveValue(state, side, index) {
  const card = state[side].hand[index];
  if (!card) return 0;
  const def = cardDef(card.defId);
  const resonant = state.playedElements.includes(def.element);
  return primaryValue(def) + (resonant ? GAME.resonanceBonus : 0);
}
