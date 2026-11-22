// The table of Ember Pact, drawn in code on one canvas: the title screen, the duel table
// with both hands, readable cards with suit colour and shape, life and ember, the Pact
// tracker, the Warden's telegraphed intent, and the win and loss screens. Cards slide and
// flip through a small tween list; the win screen lands with an ember burst.
// Ember Pact — original card game, written for the make.fun best card game bounty.

import { CARD_BY_ID, SUITS, SUIT_ORDER } from './cards.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;
const CARD_W = 112;
const CARD_H = 152;
const MINI_W = 56;
const MINI_H = 78;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/** The suit's shape, drawn in `color` at (cx, cy) with radius r. */
export function drawSuitShape(ctx, suitKey, cx, cy, r, color) {
  const suit = SUITS[suitKey];
  ctx.fillStyle = color || suit.color;
  ctx.beginPath();
  if (suit.shape === 'triangle') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy + r * 0.8);
    ctx.lineTo(cx - r, cy + r * 0.8);
  } else if (suit.shape === 'diamond') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
  } else if (suit.shape === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.closePath();
  ctx.fill();
}

/** A face-down card back: dark ember with a flame glyph. */
export function drawCardBack(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#3a1c12';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e07840';
  ctx.stroke();
  rr(ctx, x + 5, y + 5, w - 10, h - 10, 6);
  ctx.strokeStyle = '#7a3b1e';
  ctx.stroke();
  ctx.fillStyle = '#e07840';
  ctx.font = `bold ${Math.round(h * 0.34)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', x + w / 2, y + h / 2);
}

/**
 * A face-up card. `opts` may carry: playable (glow), dim (unaffordable), hover (raised),
 * small (mini size). The suit is told by colour AND shape, never by text alone.
 */
export function drawCard(ctx, card, x, y, w, h, opts = {}) {
  const suit = SUITS[card.suit];
  const big = h > 100;
  ctx.save();
  if (opts.playable) {
    ctx.shadowColor = suit.color;
    ctx.shadowBlur = 14;
  }
  rr(ctx, x, y, w, h, 9);
  ctx.fillStyle = opts.dim ? '#cfc6ae' : '#f7f1de';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = suit.dark;
  ctx.stroke();
  // Suit band.
  rr(ctx, x + 2, y + 2, w - 4, big ? 30 : 20, 7);
  ctx.fillStyle = suit.color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${big ? 13 : 10}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(suit.name.toUpperCase(), x + 9, y + (big ? 18 : 13));
  // Cost gem, top right.
  const gemR = big ? 13 : 9;
  const gx = x + w - gemR - 6;
  const gy = y + gemR + 6;
  ctx.beginPath();
  ctx.arc(gx, gy, gemR, 0, Math.PI * 2);
  ctx.fillStyle = '#d97706';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${big ? 14 : 10}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(card.cost), gx, gy + 0.5);
  // Big suit shape in the middle.
  drawSuitShape(ctx, card.suit, x + w / 2, y + (big ? 66 : 44), big ? 20 : 13, suit.color);
  // Name.
  ctx.fillStyle = '#241a12';
  ctx.font = `bold ${big ? 14 : 11}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(card.name, x + w / 2, y + (big ? 102 : 68), w - 10);
  // Effect text, wrapped to two lines.
  ctx.font = `${big ? 12 : 9}px Georgia, serif`;
  ctx.fillStyle = '#4a3a28';
  const words = card.text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 16 && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((ln, i) => {
    ctx.fillText(ln, x + w / 2, y + (big ? 122 + i * 14 : 82 + i * 11));
  });
  ctx.restore();
}

/** Where the hand's cards sit, fanned across the bottom. Returns [{id, x, y, rot}]. */
export function handLayout(hand, hoverIndex) {
  const n = hand.length;
  if (n === 0) return [];
  const spacing = n === 1 ? 0 : Math.min(CARD_W + 8, 880 / (n - 1));
  const total = (n - 1) * spacing;
  const cx = VIEW_W / 2;
  const baseY = 550;
  return hand.map((id, i) => {
    const x = cx - total / 2 + i * spacing - CARD_W / 2;
    const off = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
    const rot = off * 0.07;
    const lift = hoverIndex === i ? 26 : 0;
    return { id, x, y: baseY - lift + Math.abs(off) * 10, rot };
  });
}

/** A fresh view: tweens, flying cards and particles live here, not in the rules. */
export function createView() {
  return {
    flying: null,
    particles: [],
    shake: 0,
    hover: -1,
    mouse: { x: 0, y: 0 },
    titleT: 0,
    winBurst: 0,
  };
}

/** Launch a card from the hand to the centre, flip it, resolve, fade. */
export function flyCard(view, card, fromX, fromY) {
  view.flying = { card, x0: fromX, y0: fromY, x1: VIEW_W / 2 - CARD_W / 2, y1: VIEW_H / 2 - CARD_H - 30, t: 0, dur: 0.55 };
}

export function spawnEmbers(view, x, y, n, color) {
  for (let i = 0; i < n; i += 1) {
    view.particles.push({
      x: x + (Math.random() - 0.5) * 120,
      y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 60,
      vy: -40 - Math.random() * 90,
      life: 0.7 + Math.random() * 0.8,
      max: 1.5,
      size: 2 + Math.random() * 4,
      color: color || '#ff9a3c',
    });
  }
}

function drawBar(ctx, x, y, w, h, frac, fill, label) {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#1c1410';
  ctx.fill();
  if (frac > 0) {
    rr(ctx, x + 2, y + 2, Math.max(h - 4, (w - 4) * clamp(frac, 0, 1)), h - 4, (h - 4) / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#00000088';
  rr(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
}

function drawEmberPips(ctx, x, y, have, max) {
  for (let i = 0; i < max; i += 1) {
    const px = x + i * 22;
    drawSuitShape(ctx, 'flame', px, y, 8, i < have ? '#ff9a3c' : '#3a2a20');
    if (i >= have) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#7a5a3a';
      ctx.beginPath();
      ctx.arc(px, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPortrait(ctx, x, y, r, label) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#2a1a12';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e07840';
  ctx.stroke();
  ctx.fillStyle = '#e07840';
  ctx.font = `bold ${Math.round(r * 0.9)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♜', x, y + 1);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(label, x, y + r + 16);
}

function drawPactTracker(ctx, game) {
  const x0 = 60;
  const y0 = 500;
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('PACT — play a 2nd card of a suit to fire it', x0, y0 - 8);
  SUIT_ORDER.forEach((key, i) => {
    const suit = SUITS[key];
    const x = x0 + i * 118;
    const count = game.player.played[key];
    rr(ctx, x, y0, 108, 34, 8);
    ctx.fillStyle = count >= 2 ? suit.color : '#241a12';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = count >= 1 ? suit.color : '#5a4632';
    ctx.stroke();
    drawSuitShape(ctx, key, x + 16, y0 + 17, 8, count >= 2 ? '#fff' : suit.color);
    ctx.fillStyle = count >= 2 ? '#fff' : '#f7f1de';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${suit.name} ${count}/2`, x + 30, y0 + 21);
  });
}

function drawLog(ctx, game) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '12px Georgia, serif';
  game.log.slice(0, 4).forEach((line, i) => {
    ctx.fillStyle = `rgba(247, 241, 222, ${0.95 - i * 0.2})`;
    ctx.fillText(line, 60, 300 + i * 18);
  });
}

function drawEndTurn(ctx, enabled) {
  const x = VIEW_W - 210;
  const y = 600;
  rr(ctx, x, y, 150, 44, 10);
  ctx.fillStyle = enabled ? '#d97706' : '#5a4632';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = enabled ? '#fde68a' : '#7a5a3a';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('END TURN', x + 75, y + 23);
  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('[Space]', x + 75, y + 58);
}

function drawTable(ctx, game, view) {
  // Background and table.
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#1a1216');
  bg.addColorStop(1, '#0a0810');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (view.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * view.shake, (Math.random() - 0.5) * view.shake);
  }
  rr(ctx, 40, 84, VIEW_W - 80, VIEW_H - 84 - 8, 26);
  ctx.fillStyle = '#2b1a12';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e07840';
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Faint table emblem.
  ctx.save();
  ctx.globalAlpha = 0.08;
  drawSuitShape(ctx, 'flame', VIEW_W / 2, 330, 90, '#ff9a3c');
  ctx.restore();

  // Warden portrait, life, ember.
  drawPortrait(ctx, 140, 150, 40, 'ASH WARDEN');
  drawBar(ctx, 210, 128, 260, 22, game.warden.life / game.warden.maxLife, '#c0392b', `SPARK ${game.warden.life}/${game.warden.maxLife}`);
  if (game.warden.guard > 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🛡 ${game.warden.guard}`, 480, 144);
  }
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('EMBER', 210, 178);
  drawEmberPips(ctx, 270, 174, game.warden.ember, game.warden.maxEmber);

  // Warden's face-down hand.
  const wn = game.warden.hand.length;
  for (let i = 0; i < wn; i += 1) {
    const x = 560 + i * (MINI_W + 6) - (wn * (MINI_W + 6)) / 2 + 300;
    drawCardBack(ctx, x, 108, MINI_W, MINI_H);
  }
  ctx.fillStyle = '#f7f1de';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${wn} cards`, 860, 205);

  // Intent banner (only while the duel is on).
  if (game.phase === 'play' && game.intent) {
    rr(ctx, 560, 226, 620, 52, 10);
    ctx.fillStyle = '#f7f1de';
    ctx.fill();
    ctx.fillStyle = '#7a1f1f';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('👁  WARDEN’S INTENT', 578, 247);
    ctx.fillStyle = '#241a12';
    ctx.font = '13px Georgia, serif';
    ctx.fillText(game.intent.text, 578, 268);
  }

  drawLog(ctx, game);

  // Player life, ember, pact — above the hand, never under it.
  drawBar(ctx, 60, 428, 260, 22, game.player.life / game.player.maxLife, '#27ae60', `SPARK ${game.player.life}/${game.player.maxLife}`);
  if (game.player.guard > 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🛡 ${game.player.guard}`, 330, 444);
  }
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('EMBER', 60, 470);
  drawEmberPips(ctx, 120, 466, game.player.ember, game.player.maxEmber);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`TURN ${game.turn}`, 420, 470);
  drawPactTracker(ctx, game);
  if (game.phase === 'play') drawEndTurn(ctx, true);

  // Player hand.
  const layout = handLayout(game.player.hand, view.hover);
  layout.forEach((slot, i) => {
    const card = CARD_BY_ID.get(slot.id);
    const playable = game.phase === 'play' && game.player.ember >= card.cost;
    ctx.save();
    ctx.translate(slot.x + CARD_W / 2, slot.y + CARD_H / 2);
    ctx.rotate(slot.rot);
    ctx.translate(-CARD_W / 2, -CARD_H / 2);
    drawCard(ctx, card, 0, 0, CARD_W, CARD_H, { playable, dim: game.phase === 'play' && !playable });
    ctx.restore();
    void i;
  });

  // Flying card.
  if (view.flying) {
    const f = view.flying;
    const t = clamp(f.t / f.dur, 0, 1);
    const x = f.x0 + (f.x1 - f.x0) * t;
    const y = f.y0 + (f.y1 - f.y0) * t - Math.sin(t * Math.PI) * 60;
    const flip = t < 0.5 ? 1 - t * 1.6 : (t - 0.5) * 1.6;
    ctx.save();
    ctx.globalAlpha = t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1;
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
    ctx.scale(Math.max(0.05, Math.abs(flip)), 1);
    ctx.translate(-CARD_W / 2, -CARD_H / 2);
    if (flip >= 0) drawCard(ctx, f.card, 0, 0, CARD_W, CARD_H, {});
    else drawCardBack(ctx, 0, 0, CARD_W, CARD_H);
    ctx.restore();
  }

  // Particles.
  for (const p of view.particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTitle(ctx, game, view) {
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#241016');
  bg.addColorStop(1, '#0a0810');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Rising embers.
  for (let i = 0; i < 40; i += 1) {
    const x = ((i * 137.5) % VIEW_W + view.titleT * (12 + (i % 5) * 6)) % VIEW_W;
    const y = VIEW_H - ((view.titleT * (20 + (i % 7) * 8) + i * 89) % (VIEW_H + 40)) + 20;
    ctx.globalAlpha = 0.25 + (i % 3) * 0.15;
    ctx.fillStyle = i % 2 ? '#ff9a3c' : '#e5484d';
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff9a3c';
  ctx.font = 'bold 92px Georgia, serif';
  ctx.shadowColor = '#e5484d';
  ctx.shadowBlur = 30;
  ctx.fillText('EMBER PACT', VIEW_W / 2, 220);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('A duel of spark and cunning against the Ash Warden', VIEW_W / 2, 268);
  // How to play.
  rr(ctx, VIEW_W / 2 - 330, 310, 660, 150, 14);
  ctx.fillStyle = '#00000055';
  ctx.fill();
  ctx.strokeStyle = '#e07840';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f7f1de';
  ctx.font = '16px Georgia, serif';
  const lines = [
    '• Each turn: draw 2, gain 3 ember, play cards, end turn.',
    '• Cards cost ember. Flame strikes, Frost guards, Gale draws, Stone heals.',
    '• Play a 2nd card of one suit in a turn to fire its Pact.',
    '• Read the Warden’s intent — then answer it. First to 0 spark loses.',
  ];
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 340 + i * 28));
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 22px Georgia, serif';
  const pulse = 0.7 + 0.3 * Math.sin(view.titleT * 3);
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER or click to begin', VIEW_W / 2, 520);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f7f1de';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Keys 1–7 play a card · Space ends the turn · M mutes', VIEW_W / 2, 560);
}

function drawEnd(ctx, game, view, won) {
  drawTable(ctx, game, view);
  ctx.fillStyle = won ? '#00000088' : '#000000aa';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ff9a3c' : '#9aa5b1';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.shadowColor = won ? '#e5484d' : '#000';
  ctx.shadowBlur = 26;
  ctx.fillText(won ? 'VICTORY' : 'THE EMBERS FADE', VIEW_W / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText(won ? 'The Ash Warden crumbles into cinders.' : 'Your spark gutters out. The Warden stands.', VIEW_W / 2, 350);
  ctx.font = '18px Georgia, serif';
  ctx.fillText(`Turns: ${game.stats.turns}   ·   Damage dealt: ${game.stats.damageDealt}   ·   Cards played: ${game.stats.cardsPlayed}`, VIEW_W / 2, 400);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 20px Georgia, serif';
  const pulse = 0.7 + 0.3 * Math.sin(view.titleT * 3);
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER to play again', VIEW_W / 2, 460);
  ctx.globalAlpha = 1;
}

/** Draw the whole game for this frame. */
export function render(ctx, game, view) {
  if (game.phase === 'title') drawTitle(ctx, game, view);
  else if (game.phase === 'win') drawEnd(ctx, game, view, true);
  else if (game.phase === 'loss') drawEnd(ctx, game, view, false);
  else drawTable(ctx, game, view);
}

/** Advance tweens and particles by `dt` seconds. */
export function updateView(view, dt) {
  view.titleT += dt;
  if (view.flying) {
    view.flying.t += dt;
    if (view.flying.t >= view.flying.dur + 0.25) view.flying = null;
  }
  view.shake = Math.max(0, view.shake - dt * 30);
  for (let i = view.particles.length - 1; i >= 0; i -= 1) {
    const p = view.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) view.particles.splice(i, 1);
  }
}

/** The clickable rects for this frame: hand cards and the End Turn button. */
export function getLayout(game, view) {
  const layout = handLayout(game.player.hand, view.hover);
  return {
    hand: layout.map((slot) => ({ id: slot.id, x: slot.x, y: slot.y, w: CARD_W, h: CARD_H, index: game.player.hand.indexOf(slot.id) })),
    endTurn: { x: VIEW_W - 210, y: 600, w: 150, h: 44 },
    title: { x: 0, y: 0, w: VIEW_W, h: VIEW_H },
  };
}
