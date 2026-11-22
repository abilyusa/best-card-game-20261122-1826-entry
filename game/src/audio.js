// Sound for Ember Pact: every sound is a few oscillators through WebAudio, written in
// code — no audio files, no network. The context is created on the first user gesture,
// so a headless screenshot run stays silent.
// Ember Pact — original card game, written for the make.fun best card game bounty.

let ctx = null;
let muted = false;

/** Create the audio context on a user gesture; safe to call any time. */
export function ensureAudio() {
  if (ctx || muted) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  } catch {
    ctx = null;
  }
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Audio is decoration; a failure never breaks the game.
  }
}

/** Play one of the named effects. */
export function sfx(name) {
  if (!ctx || muted) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  switch (name) {
    case 'click':
      tone(660, 0.06, 'triangle', 0.08);
      break;
    case 'draw':
      tone(520, 0.07, 'sine', 0.07);
      tone(780, 0.07, 'sine', 0.05, 0.05);
      break;
    case 'play':
      tone(392, 0.1, 'triangle', 0.12);
      tone(523, 0.12, 'triangle', 0.1, 0.06);
      break;
    case 'pact':
      tone(523, 0.1, 'sine', 0.1);
      tone(659, 0.1, 'sine', 0.1, 0.07);
      tone(784, 0.16, 'sine', 0.1, 0.14);
      break;
    case 'damage':
      tone(140, 0.22, 'sawtooth', 0.16, 0, 70);
      tone(90, 0.25, 'square', 0.1, 0.02, 55);
      break;
    case 'guard':
      tone(880, 0.14, 'sine', 0.08, 0, 1320);
      tone(1174, 0.18, 'sine', 0.06, 0.06);
      break;
    case 'heal':
      tone(523, 0.16, 'sine', 0.08);
      tone(698, 0.2, 'sine', 0.08, 0.09);
      break;
    case 'ember':
      tone(1046, 0.1, 'sine', 0.07);
      tone(1318, 0.12, 'sine', 0.06, 0.05);
      break;
    case 'turn':
      tone(330, 0.09, 'triangle', 0.09);
      tone(440, 0.09, 'triangle', 0.09, 0.07);
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, i * 0.13));
      tone(1318, 0.5, 'sine', 0.1, 0.55);
      break;
    case 'loss':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, i * 0.16));
      break;
    default:
      break;
  }
}
