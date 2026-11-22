// Emberfall Duel — everything the eye sees.
// One file, one job: draw the title screen, the table, the cards, the HUD
// and the win/loss screens on one canvas. It never changes game state; it
// only reads it, plus a small view object for hover and animation.
//
// Layout is computed once per frame by layoutFor(), and input.js reuses
// those same rectangles, so a click can never disagree with the picture.

import { ELEMENTS, GAME, LAYOUT, PALETTE } from './config.js';
import { cardDef, primaryValue } from './cards.js';

const W = GAME.width;
const H = GAME.height;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---- Element glyphs: colour AND shape, never text alone. ----

function drawGlyph(ctx, glyph, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineJoin = 'round';
  const s = size / 2;
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.7, s * 0.5, s * 0.25, s * 0.85);
    ctx.bezierCurveTo(0, s, -s * 0.5, s * 0.9, -s * 0.7, s * 0.4);
    ctx.bezierCurveTo(-s * 0.9, -s * 0.1, -s * 0.4, -s * 0.5, 0, -s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 200, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.35, s * 0.22, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.95, -s * 0.3, s * 0.8, s * 0.7, 0, s);
    ctx.bezierCurveTo(-s * 0.8, s * 0.7, -s * 0.95, -s * 0.3, 0, -s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, s * 0.85);
    ctx.stroke();
  } else if (glyph === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.75, -s * 0.1, s * 0.85, s * 0.35, s * 0.45, s * 0.75);
    ctx.bezierCurveTo(s * 0.2, s, -s * 0.2, s, -s * 0.45, s * 0.75);
    ctx.bezierCurveTo(-s * 0.85, s * 0.35, -s * 0.75, -s * 0.1, 0, -s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.28, s * 0.3, s * 0.13, s * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'swirl') {
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 4.2; a += 0.15) {
      const r = (a / (Math.PI * 4.2)) * s;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---- Layout: where everything sits, in logical pixels. ----

export function layoutFor(state) {
  const hand = state.player.hand;
  const n = hand.length;
  const totalW = n * LAYOUT.cardW + (n - 1) * LAYOUT.cardGap;
  const startX = (W - totalW) / 2;
  const handCards = hand.map((card, i) => ({
    x: startX + i * (LAYOUT.cardW + LAYOUT.cardGap),
    y: LAYOUT.handY,
    w: LAYOUT.cardW,
    h: LAYOUT.cardH,
  }));

  const vexHand = state.vex.hand;
  const vn = vexHand.length;
  const vTotalW = vn * LAYOUT.vexCardW + (vn - 1) * 10;
  const vStartX = (W - vTotalW) / 2;
  const vexCards = vexHand.map((card, i) => ({
    x: vStartX + i * (LAYOUT.vexCardW + 10),
    y: LAYOUT.vexHandY,
    w: LAYOUT.vexCardW,
    h: LAYOUT.vexCardH,
  }));

  // The big button: BEGIN on the title screen, DUEL AGAIN on the end
  // screens. Its rectangle must match the button the renderer draws.
  const bigButton =
    state.phase === 'win' || state.phase === 'loss'
      ? { x: W / 2 - 150, y: 498, w: 300, h: 52 }
      : { x: W / 2 - 170, y: 540, w: 340, h: 64 };
  return {
    phase: state.phase,
    handCards,
    vexCards,
    endButton: { ...LAYOUT.endButton },
    bigButton,
  };
}

// ---- Small pieces ----

function drawHpBar(ctx, x, y, w, hp, maxHp, shield, label, align = 'left') {
  ctx.save();
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = align;
  ctx.fillText(label, align === 'left' ? x : x + w, y - 8);
  const barY = y;
  const barH = 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundRect(ctx, x, barY, w, barH, 10);
  ctx.fill();
  const frac = Math.max(0, hp / maxHp);
  ctx.fillStyle = frac <= 0.33 ? PALETTE.hpLow : PALETTE.hpFull;
  if (frac > 0) {
    roundRect(ctx, x + 2, barY + 2, (w - 4) * frac, barH - 4, 8);
    ctx.fill();
  }
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`${hp} / ${maxHp}`, x + w / 2, barY + 15);
  if (shield > 0) {
    ctx.fillStyle = PALETTE.shield;
    ctx.beginPath();
    ctx.arc(x + w + 18, barY + barH / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#082f49';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(String(shield), x + w + 18, barY + 15);
    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = PALETTE.shield;
    ctx.textAlign = 'left';
    ctx.fillText('shield', x + w + 36, barY + 15);
  }
  ctx.restore();
}

function drawManaPips(ctx, x, y, mana, manaMax, scale = 1, labelSide = 'below') {
  ctx.save();
  const r = 9 * scale;
  for (let i = 0; i < GAME.maxMana; i += 1) {
    const cx = x + i * (r * 2 + 5) * scale + r;
    ctx.beginPath();
    ctx.arc(cx, y, r, 0, Math.PI * 2);
    if (i < mana) {
      ctx.fillStyle = PALETTE.mana;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (i < manaMax) {
      ctx.fillStyle = PALETTE.manaEmpty;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold ${14 * scale}px Georgia, serif`;
  if (labelSide === 'right') {
    ctx.textAlign = 'left';
    const labelX = x + GAME.maxMana * (r * 2 + 5) * scale + 12;
    ctx.fillText(`${mana}/${manaMax} mana`, labelX, y + 5 * scale);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(`${mana}/${manaMax} mana`, x, y + r + 20 * scale);
  }
  ctx.restore();
}

function primaryLabel(def) {
  if (def.damage) return { num: def.damage, word: 'DMG', color: '#ff6b5e' };
  if (def.shield) return { num: def.shield, word: 'SHIELD', color: '#7dd3fc' };
  if (def.heal) return { num: def.heal, word: 'HEAL', color: '#4ade80' };
  return { num: def.draw || 0, word: 'DRAW', color: '#c084fc' };
}

// ---- One card, face up ----

function drawCard(ctx, card, rect, opts = {}) {
  const def = cardDef(card.defId);
  const el = ELEMENTS[def.element];
  const { x, y, w, h } = rect;
  const hovered = !!opts.hovered;
  const playable = opts.playable !== false;
  const resonant = !!opts.resonant;
  const scale = w / LAYOUT.cardW;

  ctx.save();
  if (!playable) ctx.globalAlpha = 0.55;
  if (hovered) {
    ctx.shadowColor = el.glow;
    ctx.shadowBlur = 28;
  }
  // Body.
  ctx.fillStyle = PALETTE.parchment;
  roundRect(ctx, x, y, w, h, 12 * scale);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = el.color;
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  // Element band.
  ctx.fillStyle = el.color;
  roundRect(ctx, x + 4 * scale, y + 4 * scale, w - 8 * scale, 34 * scale, 8 * scale);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${15 * scale}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.fillText(el.name.toUpperCase(), x + 34 * scale, y + 26 * scale);
  drawGlyph(ctx, el.glyph, x + 20 * scale, y + 21 * scale, 20 * scale, '#fff');
  // Cost coin.
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.arc(x + w - 22 * scale, y + 22 * scale, 17 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${18 * scale}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(def.cost), x + w - 22 * scale, y + 28 * scale);
  // Name.
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `bold ${16 * scale}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(def.name, x + w / 2, y + 60 * scale);
  // Big glyph.
  drawGlyph(ctx, el.glyph, x + w / 2, y + 98 * scale, 44 * scale, el.color);
  // Primary number, with a gold +2 pill beside it when Resonance applies.
  const prim = primaryLabel(def);
  const shown = prim.num + (resonant ? 2 : 0);
  ctx.fillStyle = prim.color;
  ctx.font = `bold ${30 * scale}px Georgia, serif`;
  ctx.fillText(String(shown), x + w / 2, y + 150 * scale);
  if (resonant) {
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, x + w / 2 + 18 * scale, y + 130 * scale, 34 * scale, 20 * scale, 10 * scale);
    ctx.fill();
    ctx.fillStyle = '#3a2c05';
    ctx.font = `bold ${12 * scale}px Georgia, serif`;
    ctx.fillText('+2', x + w / 2 + 35 * scale, y + 145 * scale);
    // A resonant card also earns a gold rim.
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2 * scale;
    roundRect(ctx, x + 2 * scale, y + 2 * scale, w - 4 * scale, h - 4 * scale, 10 * scale);
    ctx.stroke();
  }
  ctx.font = `bold ${10 * scale}px Georgia, serif`;
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText(prim.word, x + w / 2, y + 166 * scale);
  // Rules text, low enough to clear the number.
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = `${12 * scale}px Georgia, serif`;
  const lines = wrapText(ctx, def.text, w - 20 * scale);
  lines.forEach((line, i) => {
    ctx.fillText(line, x + w / 2, y + 186 * scale + i * 14 * scale);
  });
  ctx.restore();
}

// A small face-up card for Vex's hand: name, cost, glyph, value.
function drawMiniCard(ctx, card, rect) {
  const def = cardDef(card.defId);
  const el = ELEMENTS[def.element];
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.fillStyle = '#efe3c2';
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = el.color;
  roundRect(ctx, x + 3, y + 3, w - 6, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(el.name.toUpperCase(), x + 24, y + 19);
  drawGlyph(ctx, el.glyph, x + 13, y + 15, 14, '#fff');
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.arc(x + w - 14, y + 15, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(def.cost), x + w - 14, y + 19);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(def.name, x + w / 2, y + 46);
  drawGlyph(ctx, el.glyph, x + w / 2, y + 76, 36, el.color);
  const prim = primaryLabel(def);
  ctx.fillStyle = prim.color;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(String(prim.num), x + w / 2, y + 116);
  ctx.font = 'bold 8px Georgia, serif';
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText(prim.word, x + w / 2, y + 128);
  ctx.restore();
}

// ---- Screens ----

function drawTable(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, PALETTE.tableTop);
  grad.addColorStop(1, PALETTE.tableBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Faint radial glow in the middle of the table.
  const glow = ctx.createRadialGradient(W / 2, 330, 60, W / 2, 330, 520);
  glow.addColorStop(0, 'rgba(245, 197, 66, 0.10)');
  glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Gold frame.
  ctx.strokeStyle = PALETTE.goldDim;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, W - 36, H - 36);
}

function drawFighterPanel(ctx, state, side, x, y, align) {
  const fighter = state[side];
  const name = side === 'player' ? 'EMBER KNIGHT  (you)' : 'ASHWARDEN VEX';
  drawHpBar(ctx, x, y, 260, fighter.hp, GAME.maxHp, fighter.shield, name, align);
  ctx.save();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = align === 'left' ? 'left' : 'right';
  const tx = align === 'left' ? x : x + 260;
  ctx.fillText(`deck ${fighter.deck.length}  ·  hand ${fighter.hand.length}`, tx, y + 42);
  ctx.restore();
}

function drawLog(ctx, state) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, LAYOUT.log.x, LAYOUT.log.y, LAYOUT.log.w, 128, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('DUEL LOG', LAYOUT.log.x + 12, LAYOUT.log.y + 18);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '12.5px Georgia, serif';
  const lines = state.log.slice(-LAYOUT.log.lines);
  lines.forEach((line, i) => {
    ctx.fillStyle = i === lines.length - 1 ? PALETTE.text : PALETTE.textDim;
    ctx.fillText(line.length > 44 ? line.slice(0, 43) + '…' : line, LAYOUT.log.x + 12, LAYOUT.log.y + 38 + i * 17);
  });
  ctx.restore();
}

function drawEndButton(ctx, state, view) {
  const btn = LAYOUT.endButton;
  const enabled = state.phase === 'play' && state.activeSide === 'player';
  ctx.save();
  ctx.fillStyle = enabled ? PALETTE.gold : '#5b5344';
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = enabled ? '#3a2c05' : '#d8cdb4';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('END TURN', btn.x + btn.w / 2, btn.y + 26);
  ctx.font = '11px Georgia, serif';
  ctx.fillText('[Space]', btn.x + btn.w / 2, btn.y + 43);
  ctx.restore();
}

function drawBanner(ctx, text, sub) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(text, W / 2, 330);
  if (sub) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px Georgia, serif';
    ctx.fillText(sub, W / 2, 356);
  }
  ctx.restore();
}

function drawPlay(ctx, state, view, layout) {
  drawTable(ctx);
  // Vex: panel top-left, mana pips top-right, hand across the top.
  drawFighterPanel(ctx, state, 'vex', 36, 36, 'left');
  drawManaPips(ctx, 980, 46, state.mana.vex, state.manaMax.vex, 0.62, 'below');
  state.vex.hand.forEach((card, i) => drawMiniCard(ctx, card, layout.vexCards[i]));

  // Centre: whose turn, and the Resonance hint.
  if (state.phase === 'play') {
    if (state.activeSide === 'player') {
      drawBanner(ctx, 'YOUR TURN', 'Click a card or press 1–7 · Space ends the turn');
    } else {
      drawBanner(ctx, 'VEX IS THINKING…', '');
    }
  }

  // Log on the left, under Vex's mana.
  drawLog(ctx, state);

  // Player: panel bottom-left, mana pips beside it (clear of the hand
  // below and of the shield note), hand across the bottom.
  drawFighterPanel(ctx, state, 'player', 36, 452, 'left');
  drawManaPips(ctx, 420, 462, state.mana.player, state.manaMax.player, 1, 'right');
  // Footnote under the log panel, clear of the hand and the gold frame.
  ctx.save();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Turn ${state.turn}  ·  Wins ${view.wins}  ·  P pause · M mute`, 36, 228);
  ctx.restore();

  state.player.hand.forEach((card, i) => {
    const rect = { ...layout.handCards[i] };
    const def = cardDef(card.defId);
    const playable = state.phase === 'play' && state.activeSide === 'player' && def.cost <= state.mana.player;
    const resonant = state.playedElements.includes(def.element);
    if (view.hoverIndex === i) rect.y -= 26;
    drawCard(ctx, card, rect, { hovered: view.hoverIndex === i, playable, resonant });
  });

  drawEndButton(ctx, state, view);

  // Floating damage numbers and sparks.
  drawFx(ctx, view);
}

function drawTitle(ctx, state, view, layout) {
  drawTable(ctx);
  // A spread of the four elements behind the title.
  const glyphs = ['flame', 'leaf', 'drop', 'swirl'];
  glyphs.forEach((glyph, i) => {
    const el = ELEMENTS[['ember', 'thorn', 'tide', 'gale'][i]];
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawGlyph(ctx, glyph, 340 + i * 200, 210, 84, el.color);
    ctx.restore();
  });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.shadowColor = 'rgba(245, 197, 66, 0.5)';
  ctx.shadowBlur = 30;
  ctx.fillText('EMBERFALL', W / 2, 330);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('D U E L', W / 2, 392);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '19px Georgia, serif';
  ctx.fillText('Four elements. Thirty health. One duelist walks away.', W / 2, 432);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Play a second card of an element in one turn: Resonance +2 power.', W / 2, 462);
  ctx.fillText('Vex reads your table — guard when you are weak, strike when you are not.', W / 2, 486);
  ctx.restore();

  // The big start button.
  const btn = layout.bigButton;
  ctx.save();
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14);
  ctx.fill();
  ctx.fillStyle = '#3a2c05';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BEGIN THE DUEL', btn.x + btn.w / 2, btn.y + 41);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click BEGIN or press Enter · 1–7 play a card · Space ends the turn · P pause · M mute', W / 2, 640);
  if (view.wins > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(`Duels won so far: ${view.wins}`, W / 2, 668);
  }
  ctx.restore();
}

function drawEndScreen(ctx, state, view, layout) {
  // Keep the table behind, dimmed.
  drawPlay(ctx, state, { ...view, hoverIndex: -1 }, layout);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 9, 0.72)';
  ctx.fillRect(0, 0, W, H);
  const won = state.phase === 'win';
  const panel = { x: W / 2 - 330, y: 130, w: 660, h: 440 };
  ctx.fillStyle = '#14231c';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.gold : '#ff6b5e';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', W / 2, panel.y + 82);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px Georgia, serif';
  ctx.fillText(
    won ? 'Ashwarden Vex falls. The ember is yours.' : 'Ashwarden Vex stands. The ember fades… for now.',
    W / 2,
    panel.y + 118,
  );
  const s = state.endStats || { turns: 0, cardsPlayed: 0, damageDealt: 0, hpLeft: 0, vexHpLeft: 0 };
  const rows = [
    ['Turns played', String(s.turns)],
    ['Cards played', String(s.cardsPlayed)],
    ['Total damage dealt', String(s.damageDealt)],
    ['Your health left', `${s.hpLeft} / ${GAME.maxHp}`],
    ['Vex health left', `${s.vexHpLeft} / ${GAME.maxHp}`],
  ];
  ctx.font = '17px Georgia, serif';
  rows.forEach(([label, value], i) => {
    const y = panel.y + 168 + i * 34;
    ctx.fillStyle = PALETTE.textDim;
    ctx.textAlign = 'left';
    ctx.fillText(label, panel.x + 90, y);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'right';
    ctx.fillText(value, panel.x + panel.w - 90, y);
  });
  const btn = { x: W / 2 - 150, y: panel.y + 368, w: 300, h: 52 };
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fill();
  ctx.fillStyle = '#3a2c05';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('DUEL AGAIN  [R]', btn.x + btn.w / 2, btn.y + 34);
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 9, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Press P to resume', W / 2, H / 2 + 28);
  ctx.restore();
}

// ---- Floating combat text and sparks ----

export function drawFx(ctx, view) {
  ctx.save();
  ctx.textAlign = 'center';
  for (const fx of view.floats || []) {
    const age = (view.now - fx.born) / 900;
    if (age < 0 || age > 1) continue;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = fx.color;
    ctx.font = `bold ${fx.big ? 40 : 28}px Georgia, serif`;
    ctx.fillText(fx.text, fx.x, fx.y - age * 60);
  }
  for (const p of view.particles || []) {
    const age = (view.now - p.born) / p.life;
    if (age < 0 || age > 1) continue;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x + p.vx * age, p.y + p.vy * age, p.size * (1 - age * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---- Entry point: draw one frame. ----

export function render(ctx, state, view) {
  const layout = layoutFor(state);
  if (state.phase === 'title') drawTitle(ctx, state, view, layout);
  else if (state.phase === 'win' || state.phase === 'loss') drawEndScreen(ctx, state, view, layout);
  else drawPlay(ctx, state, view, layout);
  if (view.paused) drawPaused(ctx);
  return layout;
}
