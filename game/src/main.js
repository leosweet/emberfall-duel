// Emberfall Duel — startup, the frame loop, and the opponent's clock.
// One file, one job: own the canvas, own the turn timer, and wire the
// engine (duel.js), the AI (ai.js), the renderer (render.js), the input
// (input.js) and the sound (audio.js) together. No rules live here.

import { GAME } from './config.js';
import { Rng, seedFromUrl } from './random.js';
import { createDuel, endTurn, playCard, startDuel } from './duel.js';
import { vexNextCard as aiNextCard } from './ai.js';
import { attachInput } from './input.js';
import { layoutFor, render } from './render.js';
import { sound } from './audio.js';
import { buildShotScene } from './shots.js';

const WINS_KEY = 'emberfall-duel-wins';

function loadWins() {
  try {
    return Number.parseInt(window.localStorage.getItem(WINS_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveWins(n) {
  try {
    window.localStorage.setItem(WINS_KEY, String(n));
  } catch {
    // Wins are a keepsake, not a rule: never let storage break the game.
  }
}

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = GAME.width;
  canvas.height = GAME.height;

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = seedFromUrl(window.location.search);
  const rng = new Rng(shot ? seed : (Date.now() % 2147483647) || 1);

  let state = createDuel(rng);
  if (shot) {
    const scene = buildShotScene(shot, seed);
    if (scene) state = scene;
  }

  // View state: hover, animation, and the clock the AI runs on.
  const view = {
    hoverIndex: -1,
    floats: [],
    particles: [],
    now: 0,
    wins: loadWins(),
    paused: false,
    aiTimer: 0,
    aiBusy: false,
    lastPhase: state.phase,
  };

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i += 1) {
      const angle = rng.float() * Math.PI * 2;
      const speed = 40 + rng.float() * 160;
      view.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 2 + rng.float() * 4,
        color,
        born: view.now,
        life: 500 + rng.float() * 500,
      });
    }
    if (view.particles.length > 240) view.particles.splice(0, view.particles.length - 240);
  }

  function floatText(x, y, text, color, big = false) {
    view.floats.push({ x, y, text, color, big, born: view.now });
    if (view.floats.length > 24) view.floats.shift();
  }

  // Where on the table a fighter's portrait sits, for damage numbers.
  function fighterPoint(side) {
    return side === 'player' ? { x: 170, y: 440 } : { x: 170, y: 30 };
  }

  function showEvents(events) {
    for (const event of events) {
      if (event.kind === 'play') {
        sound.playCard(event.element);
      } else if (event.kind === 'damage') {
        const at = fighterPoint(event.side);
        const colors = { ember: '#ff7a2f', thorn: '#4ade80', tide: '#38bdf8', gale: '#c084fc' };
        floatText(at.x, at.y, `-${event.amount}`, '#ff6b5e', true);
        burst(at.x, at.y + 10, colors[event.element] || '#ff6b5e');
        sound.hit(event.element);
      } else if (event.kind === 'shield' || event.kind === 'heal') {
        const at = fighterPoint(event.side);
        floatText(at.x, at.y, `+${event.amount}`, event.kind === 'shield' ? '#7dd3fc' : '#4ade80');
        sound.guard();
      } else if (event.kind === 'draw') {
        sound.draw();
      }
    }
  }

  function afterStateChange() {
    if (state.phase !== view.lastPhase) {
      if (state.phase === 'win') {
        view.wins += 1;
        saveWins(view.wins);
        sound.win();
      } else if (state.phase === 'loss') {
        sound.lose();
      }
      view.lastPhase = state.phase;
    }
  }

  function tryPlayCard(index) {
    if (view.paused) return;
    if (state.phase !== 'play' || state.activeSide !== 'player') return;
    const result = playCard(state, 'player', index);
    if (!result.ok) {
      sound.denied();
      return;
    }
    showEvents(result.events);
    afterStateChange();
  }

  function tryEndTurn() {
    if (view.paused) return;
    if (state.phase !== 'play' || state.activeSide !== 'player') return;
    sound.unlock();
    if (endTurn(state)) {
      view.aiTimer = 700;
      view.aiBusy = true;
    }
  }

  function startGame() {
    if (state.phase === 'title') {
      sound.unlock();
      startDuel(state);
      view.lastPhase = 'play';
      sound.turn();
    } else if (state.phase === 'win' || state.phase === 'loss') {
      const fresh = createDuel(new Rng((Date.now() % 2147483647) || 1));
      state = fresh;
      window.__duel = state;
      startDuel(state);
      view.lastPhase = 'play';
      view.floats = [];
      view.particles = [];
      sound.turn();
    }
  }

  attachInput(canvas, {
    onCardClick: (index) => {
      sound.unlock();
      tryPlayCard(index);
    },
    onEndTurn: tryEndTurn,
    onStart: startGame,
    onRestart: startGame,
    onPause: () => {
      if (state.phase === 'play') view.paused = !view.paused;
    },
    onMute: () => {
      sound.toggleMute();
    },
    onHover: (x, y) => {
      const layout = layoutFor(state);
      view.hoverIndex = -1;
      layout.handCards.forEach((rect, i) => {
        const raised = { ...rect, y: rect.y - 26 };
        if (x >= raised.x && x <= raised.x + raised.w && y >= raised.y && y <= raised.y + raised.h) {
          view.hoverIndex = i;
        }
      });
    },
    layout: () => layoutFor(state),
  });

  // Vex plays one card per tick while its turn runs.
  function stepAi(dt) {
    if (state.phase !== 'play' || state.activeSide !== 'vex' || view.paused) return;
    view.aiTimer -= dt;
    if (view.aiTimer > 0) return;
    const index = aiNextCard(state);
    if (index === null || index === undefined) {
      endTurn(state);
      view.aiBusy = false;
      sound.turn();
      return;
    }
    const result = playCard(state, 'vex', index);
    if (result.ok) {
      showEvents(result.events);
      afterStateChange();
    }
    view.aiTimer = 650;
    if (state.phase !== 'play') view.aiBusy = false;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    view.now = now;
    stepAi(dt);
    // Drop expired animation entries.
    view.floats = view.floats.filter((f) => now - f.born < 1000);
    view.particles = view.particles.filter((p) => now - p.born < p.life);
    render(ctx, state, view);
    requestAnimationFrame(frame);
  }

  // Screenshot scenes render once and stay still: no AI clock, no loop
  // surprises. The frame loop still runs so the canvas paints.
  if (shot) {
    view.aiBusy = false;
    view.aiTimer = 0;
  }

  // For play-tests and screenshots: the live state, the view, and a
  // readiness flag the automation waits on.
  window.__duel = state;
  window.__view = view;
  window.__ready = true;
  window.__startGame = startGame;
  window.__playCard = tryPlayCard;
  window.__endTurn = tryEndTurn;

  render(ctx, state, view);
  requestAnimationFrame(frame);
}

main();
