'use strict';
/* =========================================================
 *  fx.js : particles, magic projectiles, lightning arcs,
 *          shockwave rings, floating combat text, shake
 * ========================================================= */
G.FX = (function () {
  const particles = [];
  const projectiles = [];
  const beams = [];
  const rings = [];
  const texts = [];
  let shake = 0;
  let hitStop = 0;

  function addShake(amount) {
    shake = Math.min(10, Math.max(shake, amount));
  }

  function addHitStop(sec) {
    hitStop = Math.max(hitStop, sec);
  }

  function burst(wx, wy, color, count = 10, spd = 2.4, life = 0.45, size = 1.6, grav = 0) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.35 + Math.random() * 0.85) * spd;
      particles.push({
        x: wx, y: wy,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        color, life, max: life, size: size * (0.7 + Math.random() * 0.6), grav,
      });
    }
  }

  function spark(wx, wy, color, life = 0.6) {
    particles.push({
      x: wx, y: wy,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.35 - Math.random() * 0.45,
      color, life, max: life, size: 1.2, grav: 0,
    });
  }

  function ring(wx, wy, maxR, color, life = 0.35) {
    rings.push({ x: wx, y: wy, r: 0.2, maxR, color, life, max: life });
  }

  function beam(x0, y0, x1, y1, color, width = 2.2, life = 0.22, jagged = false) {
    beams.push({ x0, y0, x1, y1, color, width, life, max: life, jagged });
  }

  function proj(x0, y0, x1, y1, color, speed = 22, onHit = null, trail = true) {
    const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
    const dur = Math.max(0.08, dist / speed);
    projectiles.push({ x0, y0, x1, y1, x: x0, y: y0, t: 0, dur, color, onHit, trail });
  }

  function floatText(tx, ty, text, color = '#fff', big = false) {
    texts.push({
      x: tx + 0.5 + (Math.random() - 0.5) * 0.2,
      y: ty + 0.1,
      vy: -1.1,
      text: String(text),
      color,
      big,
      life: big ? 1.05 : 0.85,
      max: big ? 1.05 : 0.85,
    });
  }

  function elemBurst(tx, ty, elem) {
    const col = (G.ELEM[elem] && G.ELEM[elem].color) || '#ffd27a';
    const cx = tx + 0.5, cy = ty + 0.5;
    if (elem === 'fire') {
      burst(cx, cy, '#ff8a3a', 14, 3.0, 0.45, 2.0, -1.5);
      burst(cx, cy, '#ffe066', 6, 1.8, 0.3, 1.4, -1.0);
    } else if (elem === 'ice') {
      burst(cx, cy, '#8fe6ff', 12, 2.5, 0.45, 1.8, 0.5);
      burst(cx, cy, '#ffffff', 6, 1.6, 0.35, 1.2, 0);
      ring(cx, cy, 1.2, '#8fe6ff', 0.28);
    } else if (elem === 'lightning') {
      burst(cx, cy, '#ffe066', 14, 3.8, 0.3, 1.5, 0);
      ring(cx, cy, 1.1, '#fff6a0', 0.22);
    } else if (elem === 'poison') {
      burst(cx, cy, '#9be15d', 12, 1.8, 0.6, 2.0, -0.6);
    } else if (elem === 'dark') {
      burst(cx, cy, '#d0a0ff', 12, 2.4, 0.45, 1.8, 0);
      burst(cx, cy, '#502070', 6, 1.5, 0.5, 2.2, 0);
    } else if (elem === 'holy') {
      burst(cx, cy, '#fff1b0', 14, 2.2, 0.5, 1.6, -1.0);
      ring(cx, cy, 1.4, '#fff1b0', 0.35);
    } else {
      burst(cx, cy, col, 10, 2.5, 0.38, 1.6, 0);
    }
  }

  function update(dt) {
    if (hitStop > 0) hitStop = Math.max(0, hitStop - dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 24);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.t += dt;
      const u = Math.min(1, pr.t / pr.dur);
      pr.x = G.lerp(pr.x0, pr.x1, u);
      pr.y = G.lerp(pr.y0, pr.y1, u);
      if (pr.trail && Math.random() < 0.75) {
        particles.push({
          x: pr.x + (Math.random() - 0.5) * 0.12,
          y: pr.y + (Math.random() - 0.5) * 0.12,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          color: pr.color, life: 0.18, max: 0.18, size: 1.4, grav: 0,
        });
      }
      if (u >= 1) {
        if (pr.onHit) pr.onHit();
        projectiles.splice(i, 1);
      }
    }

    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) beams.splice(i, 1);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      if (r.life <= 0) { rings.splice(i, 1); continue; }
      r.r = G.lerp(0.2, r.maxR, 1 - r.life / r.max);
    }

    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) { texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= 0.94;
    }
  }

  function clear() {
    particles.length = 0;
    projectiles.length = 0;
    beams.length = 0;
    rings.length = 0;
    texts.length = 0;
    shake = 0;
    hitStop = 0;
  }

  return {
    particles, projectiles, beams, rings, texts,
    get shake() { return shake; },
    get hitStop() { return hitStop; },
    addShake, addHitStop, burst, spark, ring, beam, proj, floatText, elemBurst, update, clear,
  };
})();
