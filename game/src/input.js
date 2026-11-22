// Emberfall Duel — mouse and keyboard input.
// One file, one job: turn clicks and key presses into game actions.
// Hit-testing lives with the renderer (render.js owns the layout); this
// file only decides which key or click means what, and calls back.

import { LAYOUT } from './config.js';

// Keys that play the card in hand slot n (1-7). The hand never holds
// more than seven cards, so 1-7 covers the whole hand.
const CARD_KEYS = ['1', '2', '3', '4', '5', '6', '7'];

export function attachInput(canvas, hooks) {
  // hooks: { onCardClick(index), onEndTurn(), onStart(), onRestart(),
  //         onPause(), onMute(), isPlaying(), layout() }
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    routeClick(x, y, hooks);
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    if (hooks.onHover) hooks.onHover(x, y);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key === 'm' || key === 'M') {
      hooks.onMute();
      return;
    }
    if (key === 'p' || key === 'P') {
      hooks.onPause();
      return;
    }
    if (key === 'Enter') {
      hooks.onStart();
      return;
    }
    if (key === 'r' || key === 'R') {
      hooks.onRestart();
      return;
    }
    if (key === ' ') {
      event.preventDefault();
      hooks.onEndTurn();
      return;
    }
    const slot = CARD_KEYS.indexOf(key);
    if (slot !== -1) hooks.onCardClick(slot);
  });
}

function routeClick(x, y, hooks) {
  const layout = hooks.layout();
  if (!layout) return;

  // End-turn button.
  const btn = layout.endButton;
  if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
    hooks.onEndTurn();
    return;
  }

  // The big button only exists on the title and end screens. On the play
  // screen its rectangle overlaps the hand, so it must stay inert there:
  // a click meant for a card must never be swallowed by it.
  const big = layout.bigButton;
  const onMenuScreen = layout.phase === 'title' || layout.phase === 'win' || layout.phase === 'loss';
  if (onMenuScreen && big && x >= big.x && x <= big.x + big.w && y >= big.y && y <= big.y + big.h) {
    hooks.onStart();
    return;
  }

  // A card in the player's hand (topmost card wins on overlap).
  const cards = layout.handCards || [];
  for (let i = cards.length - 1; i >= 0; i -= 1) {
    const rect = cards[i];
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      hooks.onCardClick(i);
      return;
    }
  }
}

// The End Turn button rectangle, shared with the renderer.
export function endButtonRect() {
  return { ...LAYOUT.endButton };
}
