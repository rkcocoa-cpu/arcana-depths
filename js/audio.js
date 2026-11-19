'use strict';
/* =========================================================
 *  audio.js : Web Audio procedural SFX & ambient dungeon BGM
 * ========================================================= */
G.Audio = (function () {
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let bgmGain = null;
  let bgmTimer = null;
  let currentBiome = null;
  let stepIdx = 0;

  const SCALES = {
    aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
    dorian: [0, 2, 3, 5, 7, 9, 10, 12],
    phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
    lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  };

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      sfxGain = ctx.createGain();
      bgmGain = ctx.createGain();
      sfxGain.connect(master);
      bgmGain.connect(master);
      master.connect(ctx.destination);
      syncVol();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function syncVol() {
    if (!master) return;
    const s = G.settings || { sfx: true, bgm: true, vol: 0.7 };
    master.gain.value = s.vol ?? 0.7;
    sfxGain.gain.value = s.sfx === false ? 0 : 0.75;
    bgmGain.gain.value = s.bgm === false ? 0 : 0.28;
  }

  function tone(freq, dur, type = 'sine', vol = 0.25, slide = 0, delay = 0, dest = null) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, filterFreq = 800, vol = 0.2, q = 1, delay = 0) {
    const c = ensure(); if (!c) return;
    const sr = c.sampleRate;
    const len = Math.max(1, Math.floor(sr * dur));
    const buf = c.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = q;
    const g = c.createGain();
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const sfx = {
    tap() { tone(620, 0.05, 'triangle', 0.14, 1.15); },
    step() { noise(0.045, 420, 0.08, 1.5); tone(120, 0.04, 'sine', 0.06, 0.7); },
    hit() { noise(0.09, 520, 0.28, 0.8); tone(170, 0.11, 'sawtooth', 0.2, 0.45); },
    crit() { noise(0.14, 900, 0.32, 0.7); tone(260, 0.15, 'square', 0.2, 0.4); tone(520, 0.12, 'triangle', 0.18, 1.3, 0.03); },
    hurt() { tone(140, 0.16, 'sawtooth', 0.28, 0.45); noise(0.12, 320, 0.25, 1.2); },
    miss() { tone(280, 0.08, 'sine', 0.1, 0.65); },
    kill() { tone(240, 0.08, 'triangle', 0.2, 0.6); tone(380, 0.14, 'triangle', 0.16, 1.25, 0.05); },
    coin() { tone(1180, 0.08, 'sine', 0.18); tone(1580, 0.14, 'sine', 0.16, 1, 0.05); },
    pickup() { tone(520, 0.08, 'triangle', 0.18); tone(780, 0.12, 'triangle', 0.18, 1, 0.06); },
    potion() { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, 'sine', 0.14, 1, i * 0.045)); },
    stairs() { [440, 392, 330, 262].forEach((f, i) => tone(f, 0.15, 'triangle', 0.16, 1, i * 0.07)); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.24, 'triangle', 0.22, 1, i * 0.08)); },
    chest() { tone(440, 0.1, 'triangle', 0.2); tone(660, 0.14, 'triangle', 0.2, 1, 0.07); tone(880, 0.22, 'sine', 0.18, 1, 0.14); },
    trap() { noise(0.16, 1100, 0.26, 2); tone(210, 0.18, 'sawtooth', 0.24, 0.35); },
    boss() { tone(90, 0.45, 'sawtooth', 0.26, 0.7); tone(135, 0.45, 'triangle', 0.22, 0.65, 0.04); noise(0.4, 240, 0.22, 1.2); },
    die() { [330, 294, 247, 196].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.16, 0.9, i * 0.14)); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.32, 'triangle', 0.22, 1, i * 0.1)); },
    spell(elem) {
      if (elem === 'fire') { noise(0.24, 480, 0.26, 0.7); tone(220, 0.2, 'sawtooth', 0.18, 0.5); }
      else if (elem === 'ice') { tone(1040, 0.14, 'sine', 0.18, 1.3); tone(1560, 0.18, 'triangle', 0.14, 0.85, 0.04); }
      else if (elem === 'lightning') { noise(0.14, 2200, 0.28, 1.4); tone(760, 0.12, 'square', 0.15, 0.3); }
      else if (elem === 'holy') { [587, 740, 880, 1174].forEach((f, i) => tone(f, 0.18, 'sine', 0.15, 1, i * 0.04)); }
      else if (elem === 'poison') { noise(0.18, 650, 0.18, 2.5); tone(260, 0.18, 'sine', 0.14, 0.75); }
      else if (elem === 'dark') { tone(185, 0.22, 'sawtooth', 0.18, 0.6); tone(277, 0.22, 'sine', 0.15, 0.7, 0.04); }
      else { tone(660, 0.12, 'triangle', 0.18, 1.35); tone(990, 0.16, 'sine', 0.14, 1.1, 0.04); }
    },
  };

  function startBgm(biome) {
    if (!biome) return;
    currentBiome = biome;
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    const m = biome.music || { root: 57, mode: 'aeolian', bpm: 66, pad: 'sine' };
    const beatMs = Math.round(60000 / m.bpm);
    const scale = SCALES[m.mode] || SCALES.aeolian;
    const motif = [0, 2, 4, 3, 5, 4, 2, 1];
    bgmTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (G.settings && G.settings.bgm === false) return;
      const step = stepIdx++;
      // soft arpeggio note on gentle steps
      if (step % 2 === 0 || Math.random() < 0.45) {
        const deg = scale[motif[step % motif.length] % scale.length];
        const oct = step % 8 === 0 ? -12 : step % 4 === 2 ? 12 : 0;
        const freq = mtof(m.root + deg + oct);
        tone(freq, (beatMs / 1000) * 1.6, m.pad, 0.12, 1, 0, bgmGain);
      }
      // deep bass drone every 4 beats
      if (step % 4 === 0) {
        const bassDeg = step % 8 === 0 ? 0 : scale[4] - 12;
        tone(mtof(m.root - 12 + bassDeg), (beatMs / 1000) * 3.4, 'sine', 0.18, 1, 0, bgmGain);
      }
    }, beatMs);
  }

  function stopBgm() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  }

  return {
    unlock: ensure,
    syncVol,
    play(name, arg) {
      if (G.settings && G.settings.sfx === false) return;
      if (name === 'spell') sfx.spell(arg);
      else if (sfx[name]) sfx[name](arg);
    },
    startBgm,
    stopBgm,
    get biome() { return currentBiome; },
  };
})();
