'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  sprites.js : High-Definition (96x96 / 144x144) canvas
 *               sprite & icon generator for Orbs, ★EVO,
 *               Monsters, Bosses, Field Gimmicks & Gear
 * ========================================================= */
G.Spr = (function () {
  const cache = {};
  const urlCache = {};

  function makeCanvas(w = 96, h = 96) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.lineJoin = 'round';
    x.lineCap = 'round';
    return [c, x];
  }

  function radGrad(x, cx, cy, r0, r1, stops) {
    const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
    for (const [p, col] of stops) g.addColorStop(p, col);
    return g;
  }

  function linGrad(x, x0, y0, x1, y1, stops) {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    for (const [p, col] of stops) g.addColorStop(p, col);
    return g;
  }

  function drawStar(x, cx, cy, pts, rOut, rIn, fill, stroke = null, lw = 2) {
    x.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? rOut : rIn;
      const a = (i * Math.PI) / pts - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.closePath();
    if (fill) {
      x.fillStyle = fill;
      x.fill();
    }
    if (stroke) {
      x.strokeStyle = stroke;
      x.lineWidth = lw;
      x.stroke();
    }
  }

  /* ---------- Orb & ★EVO Icon Renderer (96x96) ---------- */
  function renderOrbSprite(id, color, isEvo = false) {
    const [c, x] = makeCanvas(96, 96);
    const dark = G.shade(color, -0.45);
    const lite = G.shade(color, 0.45);

    // Outer aura
    x.fillStyle = radGrad(x, 48, 48, 8, 46, [
      [0, G.withAlpha(lite, 'dd')],
      [0.55, G.withAlpha(color, isEvo ? '88' : '55')],
      [1, G.withAlpha(color, '00')],
    ]);
    x.beginPath();
    x.arc(48, 48, 46, 0, Math.PI * 2);
    x.fill();

    // If EVO, draw golden sacred geometry crown ring
    if (isEvo) {
      drawStar(x, 48, 48, 8, 43, 33, G.withAlpha('#f4c563', '44'), '#f4c563', 2.2);
    }

    // Main sphere body
    x.fillStyle = radGrad(x, 38, 36, 4, 30, [
      [0, '#ffffff'],
      [0.32, lite],
      [0.72, color],
      [1, dark],
    ]);
    x.beginPath();
    x.arc(48, 48, 28, 0, Math.PI * 2);
    x.fill();
    x.lineWidth = isEvo ? 3.2 : 2.5;
    x.strokeStyle = isEvo ? '#fff0a8' : '#101826';
    x.stroke();

    // Inner elemental emblem
    x.save();
    if (id.includes('blaze') || id.includes('supernova')) {
      // Flame crest
      x.fillStyle = '#fff5b8';
      x.beginPath();
      x.moveTo(48, 24);
      x.quadraticCurveTo(65, 38, 58, 56);
      x.quadraticCurveTo(48, 68, 38, 56);
      x.quadraticCurveTo(31, 38, 48, 24);
      x.fill();
      if (isEvo) drawStar(x, 48, 47, 6, 15, 7, '#ffffff');
    } else if (id.includes('frost') || id.includes('blizzard')) {
      drawStar(x, 48, 48, 6, 21, 8, '#ffffff', '#bceeff', 1.5);
    } else if (id.includes('volt') || id.includes('thunder')) {
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(53, 24);
      x.lineTo(36, 49);
      x.lineTo(48, 49);
      x.lineTo(42, 71);
      x.lineTo(61, 44);
      x.lineTo(49, 44);
      x.closePath();
      x.fill();
    } else if (id.includes('laser') || id.includes('crosslaser')) {
      drawStar(x, 48, 48, 4, 24, 6, '#ffffff', lite, 1.5);
    } else if (id.includes('split') || id.includes('meteor')) {
      drawStar(x, 39, 41, 4, 11, 4, '#ffffff');
      drawStar(x, 57, 41, 4, 10, 4, '#ffffff');
      drawStar(x, 48, 57, 4, 11, 4, '#ffffff');
    } else if (id.includes('void') || id.includes('blackhole')) {
      x.fillStyle = '#090d16';
      x.beginPath();
      x.arc(48, 48, 13, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#ffffff';
      x.lineWidth = 2.2;
      x.stroke();
    } else if (id.includes('vamp') || id.includes('blood')) {
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(48, 27);
      x.quadraticCurveTo(63, 46, 48, 65);
      x.quadraticCurveTo(33, 46, 48, 27);
      x.fill();
    } else if (id.includes('holy') || id.includes('excalibur')) {
      // Holy sword emblem
      x.strokeStyle = '#ffffff';
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(48, 24);
      x.lineTo(48, 66);
      x.moveTo(36, 38);
      x.lineTo(60, 38);
      x.stroke();
    } else if (id.includes('sniper')) {
      x.strokeStyle = '#ffffff';
      x.lineWidth = 2.6;
      x.beginPath();
      x.arc(48, 48, 13, 0, Math.PI * 2);
      x.moveTo(48, 28);
      x.lineTo(48, 68);
      x.moveTo(28, 48);
      x.lineTo(68, 48);
      x.stroke();
    } else if (id.includes('poison')) {
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(42, 43, 6, 0, Math.PI * 2);
      x.arc(55, 45, 5, 0, Math.PI * 2);
      x.arc(47, 56, 6, 0, Math.PI * 2);
      x.fill();
    } else {
      drawStar(x, 48, 48, 4, 15, 6, '#ffffff');
    }
    x.restore();

    // Specular highlight
    x.fillStyle = 'rgba(255,255,255,0.65)';
    x.beginPath();
    x.ellipse(37, 33, 7, 4, -0.5, 0, Math.PI * 2);
    x.fill();

    return c;
  }

  /* ---------- Monster & Boss Sprite Renderer ---------- */
  function renderMonsterSprite(id, color = '#38d9e8', isBoss = false) {
    const sz = isBoss ? 144 : 96;
    const [c, x] = makeCanvas(sz, sz);
    const cx = sz / 2, cy = sz / 2;
    const dark = G.shade(color, -0.45);
    const lite = G.shade(color, 0.40);

    // Subtle ground shadow
    x.fillStyle = 'rgba(0,0,0,0.38)';
    x.beginPath();
    x.ellipse(cx, sz - 12, sz * 0.34, sz * 0.10, 0, 0, Math.PI * 2);
    x.fill();

    if (id === 'slime' || id === 'magmaslime') {
      // Glossy fantasy slime
      x.fillStyle = radGrad(x, cx - 8, cy - 6, 5, 36, [
        [0, lite],
        [0.6, color],
        [1, dark],
      ]);
      x.beginPath();
      x.moveTo(20, 74);
      x.quadraticCurveTo(16, 26, 48, 24);
      x.quadraticCurveTo(80, 26, 76, 74);
      x.quadraticCurveTo(48, 82, 20, 74);
      x.closePath();
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = '#0b101b';
      x.stroke();
      // Eyes
      x.fillStyle = id === 'magmaslime' ? '#fff3a8' : '#0b101b';
      x.beginPath();
      x.arc(38, 52, 4.5, 0, Math.PI * 2);
      x.arc(58, 52, 4.5, 0, Math.PI * 2);
      x.fill();
    } else if (id === 'skeleton' || id === 'archer') {
      // Armored skull warrior / archer
      x.fillStyle = linGrad(x, 0, 20, 0, 80, [[0, '#f1f5f9'], [1, '#94a3b8']]);
      x.beginPath();
      x.arc(48, 42, 22, 0, Math.PI * 2);
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = '#0b101b';
      x.stroke();
      // Jaw
      x.fillRect(36, 56, 24, 14);
      x.strokeRect(36, 56, 24, 14);
      // Glowing eye sockets
      x.fillStyle = id === 'archer' ? '#f4c563' : '#38d9e8';
      x.beginPath();
      x.arc(40, 42, 5, 0, Math.PI * 2);
      x.arc(56, 42, 5, 0, Math.PI * 2);
      x.fill();
      if (id === 'archer') {
        // Golden bow
        x.strokeStyle = '#f4c563';
        x.lineWidth = 3.5;
        x.beginPath();
        x.arc(68, 48, 22, -1.1, 1.1);
        x.stroke();
      }
    } else if (id === 'shielder' || id === 'golem' || id === 'shadowknight') {
      // Heavy armored juggernaut
      x.fillStyle = linGrad(x, 0, 16, 0, 84, [[0, lite], [0.5, color], [1, dark]]);
      x.beginPath();
      x.moveTo(48, 16);
      x.lineTo(78, 30);
      x.lineTo(72, 76);
      x.lineTo(48, 84);
      x.lineTo(24, 76);
      x.lineTo(18, 30);
      x.closePath();
      x.fill();
      x.lineWidth = 3.2;
      x.strokeStyle = '#0b101b';
      x.stroke();
      // Visor glow
      x.fillStyle = '#fff3a8';
      x.fillRect(34, 38, 28, 7);
      // Emblem
      drawStar(x, 48, 60, 4, 12, 5, '#ffffff');
    } else if (id === 'frostwisp' || id === 'imp' || id === 'voideye') {
      // Floating elemental spirit / eye
      x.fillStyle = radGrad(x, 48, 48, 4, 36, [
        [0, '#ffffff'],
        [0.45, color],
        [1, G.withAlpha(dark, '00')],
      ]);
      x.beginPath();
      x.arc(48, 48, 36, 0, Math.PI * 2);
      x.fill();
      drawStar(x, 48, 48, 6, 28, 14, color, '#0b101b', 2.5);
      x.fillStyle = '#0b101b';
      x.beginPath();
      x.arc(48, 48, 9, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(48, 48, 4, 0, Math.PI * 2);
      x.fill();
    } else {
      // Dragon / Healer / Boss crest
      drawStar(x, cx, cy, 8, sz * 0.38, sz * 0.24, color, '#0b101b', 3);
      x.fillStyle = radGrad(x, cx, cy, 3, sz * 0.22, [[0, '#ffffff'], [0.6, lite], [1, dark]]);
      x.beginPath();
      x.arc(cx, cy, sz * 0.22, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#f4c563';
      x.lineWidth = 2.5;
      x.stroke();
    }
    return c;
  }

  /* ---------- Field Gimmick Sprites (bumper, prism, rune, heal, chest) ---------- */
  function renderGimmick(kind) {
    const [c, x] = makeCanvas(96, 96);
    if (kind === 'bumper') {
      // Mana Bumper: glowing cyan/gold pinball bumper
      x.fillStyle = radGrad(x, 48, 48, 6, 40, [
        [0, '#ffffff'],
        [0.45, '#38d9e8'],
        [0.8, '#174666'],
        [1, 'rgba(56,217,232,0)'],
      ]);
      x.beginPath();
      x.arc(48, 48, 40, 0, Math.PI * 2);
      x.fill();
      drawStar(x, 48, 48, 8, 32, 22, '#f4c563', '#0b101b', 2.5);
      x.fillStyle = '#38d9e8';
      x.beginPath();
      x.arc(48, 48, 14, 0, Math.PI * 2);
      x.fill();
      drawStar(x, 48, 48, 4, 10, 4, '#ffffff');
    } else if (kind === 'prism') {
      // Split Prism: diamond crystal gate
      drawStar(x, 48, 48, 4, 36, 18, '#3ed68e', '#ffffff', 2.5);
      drawStar(x, 48, 48, 4, 20, 9, '#ffffff');
    } else if (kind === 'heal_gem') {
      // Healing Heart Crystal
      x.fillStyle = '#3ed68e';
      x.beginPath();
      x.moveTo(48, 22);
      x.lineTo(72, 48);
      x.lineTo(48, 76);
      x.lineTo(24, 48);
      x.closePath();
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = '#ffffff';
      x.stroke();
      x.fillStyle = '#ffffff';
      x.fillRect(43, 38, 10, 22);
      x.fillRect(37, 44, 22, 10);
    } else if (kind === 'coin_chest') {
      // Treasure chest
      x.fillStyle = '#b45309';
      x.fillRect(22, 34, 52, 38);
      x.strokeStyle = '#f4c563';
      x.lineWidth = 4;
      x.strokeRect(22, 34, 52, 38);
      x.fillStyle = '#f4c563';
      x.fillRect(20, 48, 56, 6);
      x.fillRect(43, 44, 10, 14);
    }
    return c;
  }

  /* ---------- Catalyst / Tome / Gear Icons ---------- */
  function renderBadgeIcon(color, kind = 'tome') {
    const [c, x] = makeCanvas(96, 96);
    const dark = G.shade(color, -0.45);
    const lite = G.shade(color, 0.40);
    x.fillStyle = radGrad(x, 48, 48, 6, 42, [
      [0, G.withAlpha(color, '88')],
      [1, G.withAlpha(color, '00')],
    ]);
    x.beginPath();
    x.arc(48, 48, 42, 0, Math.PI * 2);
    x.fill();

    if (kind === 'tome') {
      x.fillStyle = linGrad(x, 22, 18, 74, 78, [[0, lite], [0.5, color], [1, dark]]);
      x.fillRect(24, 18, 48, 60);
      x.lineWidth = 3;
      x.strokeStyle = '#f4c563';
      x.strokeRect(24, 18, 48, 60);
      drawStar(x, 48, 48, 4, 16, 6, '#ffffff');
    } else {
      drawStar(x, 48, 48, 6, 32, 18, color, '#f4c563', 2.5);
      drawStar(x, 48, 48, 4, 14, 5, '#ffffff');
    }
    return c;
  }

  function init() {
    cache.orb_normal = renderOrbSprite('normal', '#38d9e8', false);
    for (const id of G.ORB_IDS) {
      const o = G.ORBS[id];
      cache[o.icon] = renderOrbSprite(id, o.color, false);
    }
    for (const id of Object.keys(G.EVO_ORBS)) {
      const eo = G.EVO_ORBS[id];
      cache[eo.icon] = renderOrbSprite(id, eo.color, true);
    }
    for (const id of G.CATALYST_IDS) {
      const cat = G.CATALYSTS[id];
      cache[id] = renderBadgeIcon(cat.color, 'tome');
    }
    for (const id of G.PERK_IDS) {
      const p = G.PERKS[id];
      cache[id] = renderBadgeIcon(p.color, 'perk');
    }
    for (const id of Object.keys(G.MONSTERS)) {
      const m = G.MONSTERS[id];
      cache['mob_' + id] = renderMonsterSprite(id, m.color, false);
    }
    for (const id of Object.keys(G.BOSSES)) {
      const b = G.BOSSES[id];
      cache['boss_' + id] = renderMonsterSprite(id, b.color, true);
    }
    cache.bumper = renderGimmick('bumper');
    cache.prism = renderGimmick('prism');
    cache.heal_gem = renderGimmick('heal_gem');
    cache.coin_chest = renderGimmick('coin_chest');

    cache.gear_weapon = renderBadgeIcon('#38d9e8', 'perk');
    cache.gear_tome = renderBadgeIcon('#f4c563', 'tome');
    cache.gear_ring = renderBadgeIcon('#3ed68e', 'perk');
    cache.gear_amulet = renderBadgeIcon('#ff6e40', 'perk');
  }

  function get(key) {
    return cache[key] || cache.orb_normal;
  }

  function dataURL(key) {
    if (!urlCache[key]) {
      const c = get(key);
      urlCache[key] = c ? c.toDataURL() : '';
    }
    return urlCache[key];
  }

  return { init, get, dataURL };
})();
