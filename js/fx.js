'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  fx.js : Particle bursts, shockwave rings, laser beams,
 *          jagged lightning arcs, floating damage numbers,
 *          and screen shake (in grid coordinates 0..7 x 0..9)
 * ========================================================= */
G.FX = (function () {
  const particles = [];
  const rings = [];
  const beams = [];
  const texts = [];
  let shakeMag = 0;
  let shakeTime = 0;

  function clear() {
    particles.length = 0;
    rings.length = 0;
    beams.length = 0;
    texts.length = 0;
    shakeMag = 0;
    shakeTime = 0;
  }

  function shake(mag = 6, dur = 0.16) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTime = Math.max(shakeTime, dur);
  }

  function burst(gx, gy, color = '#38d9e8', count = 12, speed = 2.8) {
    if (particles.length > 260) count = Math.min(count, 5);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.35 + Math.random() * 0.85) * speed;
      particles.push({
        x: gx,
        y: gy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 2.2 + Math.random() * 3.2,
        color,
        t: 0,
        dur: 0.25 + Math.random() * 0.22,
      });
    }
  }

  function ring(gx, gy, maxR = 1.4, color = '#f4c563', dur = 0.28) {
    if (rings.length > 40) rings.shift();
    rings.push({ x: gx, y: gy, maxR, color, t: 0, dur });
  }

  function beam(x0, y0, x1, y1, color = '#3ed68e', width = 0.24, dur = 0.22, jagged = false) {
    if (beams.length > 40) beams.shift();
    const pts = [];
    if (jagged) {
      const steps = 7;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const jx = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 0.36;
        const jy = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 0.36;
        pts.push([G.lerp(x0, x1, u) + jx, G.lerp(y0, y1, u) + jy]);
      }
    }
    beams.push({ x0, y0, x1, y1, color, width, t: 0, dur, jagged, pts });
  }

  function floatText(gx, gy, text, color = '#ffffff', big = false) {
    if (texts.length > 45) texts.shift();
    texts.push({
      x: gx + (Math.random() - 0.5) * 0.28,
      y: gy,
      text: String(text),
      color,
      big,
      t: 0,
      dur: big ? 0.78 : 0.56,
    });
  }

  function update(dt) {
    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - dt);
      if (shakeTime === 0) shakeMag = 0;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      if (p.t >= p.dur) particles.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      if (r.t >= r.dur) rings.splice(i, 1);
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.t += dt;
      if (b.t >= b.dur) beams.splice(i, 1);
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const tx = texts[i];
      tx.t += dt;
      tx.y -= dt * (tx.big ? 1.15 : 0.95);
      if (tx.t >= tx.dur) texts.splice(i, 1);
    }
  }

  function getShakeOffset() {
    if (shakeTime <= 0 || shakeMag <= 0) return [0, 0];
    return [
      (Math.random() - 0.5) * 2 * shakeMag,
      (Math.random() - 0.5) * 2 * shakeMag,
    ];
  }

  return {
    particles,
    rings,
    beams,
    texts,
    clear,
    shake,
    burst,
    ring,
    beam,
    floatText,
    update,
    getShakeOffset,
  };
})();
