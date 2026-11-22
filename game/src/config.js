// Emberfall Duel — shared tuning and look.
// One file, one job: every number the rest of the game agrees on lives here,
// so a balance change never has to hunt through the renderer or the AI.

export const GAME = {
  title: 'EMBERFALL DUEL',
  subtitle: 'A duel of four elements',
  width: 1280,
  height: 720,
  maxHp: 30,
  maxMana: 10,
  startHand: 3,
  deckSize: 24,
  handLimit: 7,
  resonanceBonus: 2,
};

// The four elements. Colour AND shape carry the identity: a card is never
// told apart by its text alone. Each element also owns a sound pitch.
export const ELEMENTS = {
  ember: {
    id: 'ember',
    name: 'Ember',
    glyph: 'flame',
    color: '#ff7a2f',
    dark: '#c2410c',
    light: '#ffb37a',
    glow: 'rgba(255, 122, 47, 0.55)',
    tone: 392, // G4
  },
  thorn: {
    id: 'thorn',
    name: 'Thorn',
    glyph: 'leaf',
    color: '#4ade80',
    dark: '#166534',
    light: '#a7f3c9',
    glow: 'rgba(74, 222, 128, 0.55)',
    tone: 330, // E4
  },
  tide: {
    id: 'tide',
    name: 'Tide',
    glyph: 'drop',
    color: '#38bdf8',
    dark: '#075985',
    light: '#a5e3ff',
    glow: 'rgba(56, 189, 248, 0.55)',
    tone: 262, // C4
  },
  gale: {
    id: 'gale',
    name: 'Gale',
    glyph: 'swirl',
    color: '#c084fc',
    dark: '#6b21a8',
    light: '#e3c8ff',
    glow: 'rgba(192, 132, 252, 0.55)',
    tone: 440, // A4
  },
};

export const ELEMENT_IDS = ['ember', 'thorn', 'tide', 'gale'];

// Table and card layout, in the game's 1280x720 logical space.
export const LAYOUT = {
  cardW: 150,
  cardH: 208,
  cardGap: 14,
  vexCardW: 104,
  vexCardH: 138,
  handY: 486,
  vexHandY: 96,
  endButton: { x: 1120, y: 600, w: 128, h: 52 },
  mana: { x: 36, y: 640 },
  log: { x: 36, y: 84, w: 300, lines: 5 },
};

// The felt-and-ember palette of the table.
export const PALETTE = {
  tableTop: '#1d3a2f',
  tableBottom: '#0e211a',
  tableEdge: '#0a1712',
  gold: '#f5c542',
  goldDim: '#b8912f',
  parchment: '#f7ead0',
  ink: '#241a12',
  inkSoft: '#5b4a38',
  panel: 'rgba(12, 20, 16, 0.82)',
  panelEdge: 'rgba(245, 197, 66, 0.45)',
  hpFull: '#e5484d',
  hpLow: '#f5c542',
  shield: '#7dd3fc',
  mana: '#38bdf8',
  manaEmpty: '#1e3a4a',
  text: '#f7ead0',
  textDim: '#c9b896',
};
