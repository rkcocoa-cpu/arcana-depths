'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  audio.js : Web Audio API polyphonic synthesizer with
 *             combo-pitch-escalating bounce chimes & SFX
 * ========================================================= */
G.Audio = (function () {
  let ctx = null;
  let enabled = true;
  let lastBounceAt = 0;

  // Crystal pentatonic scale frequencies (C4 -> E6) for euphoric combo escalation
  const COMBO_NOTES = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00,
  ];

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    ensure();
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
    const c = ensure();
    if (!c) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, vol = 0.10, cutoff = 1200) {
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;

    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(cutoff, now);

    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(c.destination);
    src.start(now);
  }

  function playBounce(combo = 1, isCrit = false) {
    const c = ensure();
    if (!c) return;
    const nowMs = performance.now();
    if (nowMs - lastBounceAt < 24) return; // Throttle dense multi-hits cleanly
    lastBounceAt = nowMs;

    const idx = Math.min(COMBO_NOTES.length - 1, Math.floor((combo - 1) / 3));
    const f = COMBO_NOTES[idx] * (1 + ((combo - 1) % 3) * 0.025);
    tone(f, 0.09, isCrit ? 'triangle' : 'sine', isCrit ? 0.14 : 0.09, f * 1.06);
    if (isCrit) {
      tone(f * 1.5, 0.11, 'sine', 0.08, f * 2.0, 0.015);
    }
  }

  function play(kind) {
    if (!enabled) return;
    switch (kind) {
      case 'tap':
        tone(560, 0.055, 'triangle', 0.08, 720);
        break;
      case 'shoot':
        tone(380, 0.08, 'sine', 0.10, 760);
        break;
      case 'explosion':
        noise(0.18, 0.14, 700);
        tone(140, 0.16, 'sawtooth', 0.11, 52);
        break;
      case 'laser':
        tone(920, 0.12, 'sawtooth', 0.08, 420);
        tone(1380, 0.10, 'sine', 0.07, 1760);
        break;
      case 'freeze':
        tone(1200, 0.09, 'triangle', 0.09, 1850);
        tone(1600, 0.11, 'sine', 0.07, 2200, 0.03);
        break;
      case 'lightning':
        noise(0.09, 0.09, 2800);
        tone(780, 0.08, 'square', 0.06, 320);
        break;
      case 'merge':
        tone(440, 0.10, 'triangle', 0.12);
        tone(554.37, 0.10, 'triangle', 0.12, null, 0.06);
        tone(659.25, 0.16, 'triangle', 0.14, 880, 0.12);
        break;
      case 'evo':
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
          tone(f, 0.22, 'triangle', 0.13, f * 1.03, i * 0.065);
        });
        break;
      case 'ult':
        noise(0.25, 0.12, 1400);
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone(f, 0.24, 'sawtooth', 0.10, null, i * 0.05);
        });
        break;
      case 'levelup':
        [440, 554.37, 659.25, 880].forEach((f, i) => {
          tone(f, 0.16, 'triangle', 0.12, null, i * 0.06);
        });
        break;
      case 'gacha':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone(f, 0.18, 'sine', 0.12, f * 1.05, i * 0.07);
        });
        break;
      case 'coin':
        tone(987.77, 0.07, 'sine', 0.09);
        tone(1318.51, 0.12, 'sine', 0.10, null, 0.05);
        break;
      case 'hitPlayer':
        noise(0.15, 0.14, 500);
        tone(180, 0.15, 'sawtooth', 0.12, 75);
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
          tone(f, 0.28, 'triangle', 0.13, null, i * 0.08);
        });
        break;
      case 'defeat':
        [392, 349.23, 311.13, 261.63].forEach((f, i) => {
          tone(f, 0.26, 'sawtooth', 0.09, null, i * 0.10);
        });
        break;
      default:
        tone(520, 0.06, 'sine', 0.07);
    }
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) play('tap');
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function setEnabled(v) {
    enabled = !!v;
  }

  return { unlock, play, playBounce, toggle, isEnabled, setEnabled };
})();
