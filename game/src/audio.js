// Emberfall Duel — synthesized sound effects.
// One file, one job: every sound the game makes, built from WebAudio
// oscillators at run time. There are no audio files: nothing to download,
// nothing to fail offline.
//
// Each element owns a pitch (see config.js); a card plays its element's
// note, a hit adds noise, a win climbs a little arpeggio.

import { ELEMENTS } from './config.js';

let audioCtx = null;
let muted = false;

function ensureCtx() {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

function tone(freq, seconds, type = 'sine', volume = 0.12, when = 0) {
  const ctx = ensureCtx();
  if (!ctx || muted) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  } catch {
    // Sound is garnish: a failure here must never break the game.
  }
}

function thud() {
  const ctx = ensureCtx();
  if (!ctx || muted) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, start);
    osc.frequency.exponentialRampToValueAtTime(55, start + 0.18);
    gain.gain.setValueAtTime(0.22, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  } catch {
    // Sound is garnish: a failure here must never break the game.
  }
}

export const sound = {
  // Unlock the audio context from a real user gesture.
  unlock() {
    ensureCtx();
  },

  get muted() {
    return muted;
  },

  toggleMute() {
    muted = !muted;
    return muted;
  },

  // A card being played: its element's note, bright and short.
  playCard(elementId) {
    const el = ELEMENTS[elementId] || ELEMENTS.ember;
    tone(el.tone, 0.16, 'triangle', 0.14);
    tone(el.tone * 1.5, 0.12, 'sine', 0.07, 0.05);
  },

  // Damage landing: a low thud under the element's note.
  hit(elementId) {
    thud();
    const el = ELEMENTS[elementId] || ELEMENTS.ember;
    tone(el.tone / 2, 0.2, 'sawtooth', 0.06);
  },

  // A shield or a heal: a soft rising pair.
  guard() {
    tone(523, 0.14, 'sine', 0.09);
    tone(659, 0.18, 'sine', 0.08, 0.08);
  },

  // Drawing a card: a quick high tick.
  draw() {
    tone(880, 0.06, 'sine', 0.05);
  },

  // Your turn beginning: two notes, up.
  turn() {
    tone(330, 0.1, 'triangle', 0.08);
    tone(440, 0.12, 'triangle', 0.08, 0.09);
  },

  // The duel is won: a small rising arpeggio.
  win() {
    [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.11, i * 0.11));
  },

  // The duel is lost: three notes falling.
  lose() {
    [392, 330, 262].forEach((freq, i) => tone(freq, 0.28, 'triangle', 0.1, i * 0.14));
  },

  // A click on something that does nothing.
  denied() {
    tone(180, 0.08, 'square', 0.05);
  },
};
