'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  render.js : 60fps High-DPI Battle Arena Canvas Renderer
 * ========================================================= */
G.Render = (function () {
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let cellSize = 48;
  let offsetX = 0;
  let offsetY = 0;
  let animTime = 0;
  const imgCache = {};

  function getImg(src) {
    if (!src) return null;
    if (!imgCache[src]) {
      const im = new Image();
      im.src = src;
      imgCache[src] = im;
    }
    const im = imgCache[src];
    return im.complete && im.naturalWidth > 0 ? im : null;
  }

  function init(cvs) {
    canvas = cvs;
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(280, rect.width);
    const cssH = Math.max(320, rect.height);
    dpr = Math.min(2.5, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const padX = 10 * dpr;
    const padY = 8 * dpr;
    const availW = canvas.width - padX * 2;
    const availH = canvas.height - padY * 2;

    cellSize = Math.floor(Math.min(availW / G.Game.COLS, availH / G.Game.ROWS));
    offsetX = Math.floor((canvas.width - cellSize * G.Game.COLS) / 2);
    offsetY = Math.floor((canvas.height - cellSize * G.Game.ROWS) / 2);
  }

  function screenToGrid(clientX, clientY) {
    if (!canvas) return [3.5, 4.5];
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) * dpr;
    const sy = (clientY - rect.top) * dpr;
    const gx = (sx - offsetX) / cellSize;
    const gy = (sy - offsetY) / cellSize;
    return [gx, gy];
  }

  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawFrame(st, dt) {
    if (!ctx || !st) return;
    animTime += dt;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const ch = G.CHAPTERS.find((c) => c.id === st.chapterId) || G.CHAPTERS[0];
    const [shX, shY] = G.FX.getShakeOffset();
    const ox = offsetX + shX * dpr;
    const oy = offsetY + shY * dpr;
    const cs = cellSize;
    const boardW = cs * G.Game.COLS;
    const boardH = cs * G.Game.ROWS;

    // Clear full canvas
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Arena board background gradient
    const bgGrad = ctx.createLinearGradient(ox, oy, ox, oy + boardH);
    bgGrad.addColorStop(0, ch.bgTop);
    bgGrad.addColorStop(1, ch.bgBot);
    roundRectPath(ox, oy, boardW, boardH, 12 * dpr);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Clip inside arena board
    ctx.save();
    roundRectPath(ox, oy, boardW, boardH, 12 * dpr);
    ctx.clip();

    // Subtle stone tiles (Rows 0..6 combat zone)
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < G.Game.COLS; c++) {
        const tx = ox + c * cs;
        const ty = oy + r * cs;
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(tx + 1, ty + 1, cs - 2, cs - 2);
      }
    }

    // Defense Line at Row 7.0
    const defY = oy + 7 * cs;
    const defGrad = ctx.createLinearGradient(ox, defY - 12 * dpr, ox, defY + 14 * dpr);
    defGrad.addColorStop(0, 'rgba(242, 92, 84, 0)');
    defGrad.addColorStop(0.5, 'rgba(242, 92, 84, 0.22)');
    defGrad.addColorStop(1, 'rgba(242, 92, 84, 0)');
    ctx.fillStyle = defGrad;
    ctx.fillRect(ox, defY - 12 * dpr, boardW, 24 * dpr);

    ctx.strokeStyle = 'rgba(242, 92, 84, 0.55)';
    ctx.lineWidth = 1.6 * dpr;
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(ox + 8 * dpr, defY);
    ctx.lineTo(ox + boardW - 8 * dpr, defY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Draw Field Gimmicks (Bumpers, Prisms, Crystals, Chests)
    for (const g of st.gimmicks) {
      const gx = ox + (g.x + 0.5) * cs;
      const gy = oy + (g.y + 0.5) * cs + Math.sin(animTime * 3.5 + g.uid) * 2.5 * dpr;
      const pulse = 1 + Math.sin(animTime * 5 + g.uid) * 0.05;

      // Halo ring
      ctx.strokeStyle = g.kind === 'bumper' ? 'rgba(56,217,232,0.45)' : 'rgba(62,214,142,0.45)';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(gx, gy, cs * 0.38 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      const spr = G.Spr.get(g.kind);
      const sz = cs * 0.78 * pulse;
      ctx.drawImage(spr, gx - sz / 2, gy - sz / 2, sz, sz);
    }

    // 2. Draw Enemies & Giant 2x2 Bosses
    for (const m of st.enemies) {
      if (m.hp <= 0) continue;
      const mx = ox + m.visX * cs;
      const my = oy + m.visY * cs;
      const mw = m.w * cs;
      const mh = m.h * cs;
      const pad = 3 * dpr;
      const bx = mx + pad;
      const by = my + pad;
      const bw = mw - pad * 2;
      const bh = mh - pad * 2;

      // Danger warning pulse if at Row 6 (about to cross defense line)
      const isDanger = !m.isBoss && m.y >= 6;
      const borderCol = m.hitFlash > 0
        ? '#ffffff'
        : m.frozen > 0
        ? '#45b8ff'
        : isDanger
        ? '#f25c54'
        : m.isElite
        ? '#f4c563'
        : G.withAlpha(m.color, 'aa');

      // Block background card
      roundRectPath(bx, by, bw, bh, (m.isBoss ? 12 : 8) * dpr);
      ctx.fillStyle = m.hitFlash > 0
        ? 'rgba(255,255,255,0.35)'
        : m.isBoss
        ? 'rgba(18, 26, 44, 0.92)'
        : 'rgba(15, 23, 38, 0.88)';
      ctx.fill();
      ctx.lineWidth = (m.isBoss || m.isElite || isDanger ? 2.4 : 1.5) * dpr;
      ctx.strokeStyle = borderCol;
      ctx.stroke();

      // Sprite or Boss HD Portrait
      if (m.isBoss) {
        const pImg = getImg(m.portrait);
        if (pImg) {
          ctx.save();
          roundRectPath(bx + 4 * dpr, by + 4 * dpr, bw - 8 * dpr, bh - 24 * dpr, 8 * dpr);
          ctx.clip();
          ctx.drawImage(pImg, bx + 4 * dpr, by + 4 * dpr, bw - 8 * dpr, bh - 24 * dpr);
          ctx.restore();
        } else {
          const bSpr = G.Spr.get('boss_' + m.id);
          ctx.drawImage(bSpr, bx + bw * 0.12, by + 4 * dpr, bw * 0.76, bh * 0.72);
        }
        // Boss next skill telegraph pill at top-right
        const sk = m.skills[m.nextSkillIdx % m.skills.length];
        ctx.fillStyle = 'rgba(11, 16, 27, 0.88)';
        roundRectPath(bx + 6 * dpr, by + 6 * dpr, bw - 12 * dpr, 16 * dpr, 4 * dpr);
        ctx.fill();
        ctx.fillStyle = '#f4c563';
        ctx.font = `bold ${Math.round(9.5 * dpr)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`⚡あと${m.skillCooldown}T: ${sk}`, bx + bw / 2, by + 17 * dpr);
      } else {
        const spr = G.Spr.get('mob_' + m.id);
        const sSz = Math.min(bw, bh) * 0.68;
        const bob = Math.sin(animTime * 4 + m.uid) * 1.5 * dpr;
        ctx.drawImage(spr, bx + (bw - sSz) / 2, by + 2 * dpr + bob, sSz, sSz);
      }

      // Frozen ice crystal overlay
      if (m.frozen > 0) {
        roundRectPath(bx, by, bw, bh, 8 * dpr);
        ctx.fillStyle = 'rgba(69, 184, 255, 0.28)';
        ctx.fill();
      }

      // Status icons row (Burn / Freeze / Chill / Poison / Shock)
      const badges = [];
      if (m.frozen > 0) badges.push('❄️');
      else if (m.chill > 0) badges.push('💧');
      if (m.burn > 0) badges.push('🔥');
      if (m.shock > 0) badges.push('⚡');
      if (m.poison > 0) badges.push('☠️');
      if (badges.length > 0) {
        ctx.font = `${Math.round(9.5 * dpr)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(badges.slice(0, 3).join(''), bx + 3 * dpr, by + 12 * dpr);
      }

      // HP Bar + Shield Bar at bottom of monster cell
      const barH = (m.isBoss ? 14 : 11) * dpr;
      const barY = by + bh - barH - 2 * dpr;
      const barX = bx + 3 * dpr;
      const barW = bw - 6 * dpr;

      roundRectPath(barX, barY, barW, barH, 3 * dpr);
      ctx.fillStyle = 'rgba(6, 10, 18, 0.9)';
      ctx.fill();

      const hpPct = G.clamp(m.hp / m.maxHp, 0, 1);
      if (hpPct > 0) {
        roundRectPath(barX + 1, barY + 1, (barW - 2) * hpPct, barH - 2, 2.5 * dpr);
        ctx.fillStyle = m.isBoss ? '#f25c54' : m.isElite ? '#ff9e2c' : '#3ed68e';
        ctx.fill();
      }
      if (m.shield > 0) {
        const shPct = G.clamp(m.shield / Math.max(1, m.maxShield || m.maxHp), 0, 1);
        roundRectPath(barX + 1, barY + 1, (barW - 2) * shPct, (barH - 2) * 0.45, 2 * dpr);
        ctx.fillStyle = '#38d9e8';
        ctx.fill();
      }

      // Crisp HP Number inside bar
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round((m.isBoss ? 10 : 8.8) * dpr)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(G.fmtNum(m.hp + m.shield), barX + barW / 2, barY + barH - 2.2 * dpr);
    }

    // 3. Predictive Aim Trajectory Laser Sight (when in AIM phase)
    const lx = ox + st.launchX * cs;
    const ly = oy + st.launchY * cs;

    if (st.phase === 'AIM' && !st.over) {
      const traj = G.Game.computeTrajectory(st.aimAngle);
      if (traj.pts.length >= 2) {
        ctx.save();
        ctx.strokeStyle = '#38d9e8';
        ctx.lineWidth = 2.4 * dpr;
        ctx.setLineDash([7 * dpr, 5 * dpr]);
        ctx.lineDashOffset = -animTime * 45 * dpr;
        ctx.beginPath();
        traj.pts.forEach(([px, py], idx) => {
          const sx = ox + px * cs;
          const sy = oy + py * cs;
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw reflection node dots & impact reticle
        for (let i = 1; i < traj.pts.length; i++) {
          const [px, py] = traj.pts[i];
          const sx = ox + px * cs;
          const sy = oy + py * cs;
          ctx.fillStyle = i === traj.pts.length - 1 ? '#f4c563' : '#38d9e8';
          ctx.beginPath();
          ctx.arc(sx, sy, (i === traj.pts.length - 1 ? 5 : 3.5) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 4. Hero Launcher Astrolabe & Avatar at (launchX, launchY)
    ctx.save();
    ctx.translate(lx, ly);

    // Outer magic circle ring
    ctx.strokeStyle = 'rgba(244, 197, 99, 0.65)';
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, cs * 0.44, 0, Math.PI * 2);
    ctx.stroke();

    // Directional aim pointer arrow
    ctx.save();
    ctx.rotate(st.aimAngle + Math.PI / 2);
    ctx.fillStyle = '#f4c563';
    ctx.beginPath();
    ctx.moveTo(0, -cs * 0.64);
    ctx.lineTo(8 * dpr, -cs * 0.40);
    ctx.lineTo(-8 * dpr, -cs * 0.40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Hero circular portrait medallion inside launcher
    const hero = G.HEROES[st.heroId] || G.HEROES.valen;
    const hImg = getImg(hero.portrait);
    if (hImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, cs * 0.36, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(hImg, -cs * 0.36, -cs * 0.36, cs * 0.72, cs * 0.72);
      ctx.restore();
    } else {
      ctx.fillStyle = hero.color;
      ctx.beginPath();
      ctx.arc(0, 0, cs * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Remaining ball count pill next to launcher
    const remBalls = st.phase === 'SHOOT'
      ? st.queue.length
      : st.baseOrbs + st.rack.filter(Boolean).length + (st.catalysts.includes('cat_star') ? 3 : 0);
    if (remBalls > 0) {
      ctx.fillStyle = 'rgba(11, 16, 27, 0.92)';
      roundRectPath(cs * 0.36, -10 * dpr, 38 * dpr, 18 * dpr, 9 * dpr);
      ctx.fill();
      ctx.strokeStyle = '#f4c563';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
      ctx.fillStyle = '#f4c563';
      ctx.font = `bold ${Math.round(10 * dpr)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`×${remBalls}`, cs * 0.36 + 19 * dpr, 3 * dpr);
    }
    ctx.restore();

    // Show next landing marker if first ball has already landed
    if (st.phase === 'SHOOT' && st.nextLaunchX !== null) {
      const nx = ox + st.nextLaunchX * cs;
      ctx.strokeStyle = '#3ed68e';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(nx, ly, cs * 0.24, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Active Bouncing Orbs & Motion Trails
    for (const b of st.balls) {
      // Motion ribbon trail
      if (b.trail.length > 1) {
        for (let i = 0; i < b.trail.length - 1; i++) {
          const [tx0, ty0] = b.trail[i];
          const [tx1, ty1] = b.trail[i + 1];
          const alpha = ((i + 1) / b.trail.length) * 0.48;
          ctx.strokeStyle = G.withAlpha(b.color, Math.round(alpha * 255).toString(16).padStart(2, '0'));
          ctx.lineWidth = b.r * cs * ((i + 1) / b.trail.length) * 1.3;
          ctx.beginPath();
          ctx.moveTo(ox + tx0 * cs, oy + ty0 * cs);
          ctx.lineTo(ox + tx1 * cs, oy + ty1 * cs);
          ctx.stroke();
        }
      }

      const bx = ox + b.x * cs;
      const by = oy + b.y * cs;
      const bSz = b.r * cs * 2.55;
      const spr = G.Spr.get(b.icon);
      ctx.drawImage(spr, bx - bSz / 2, by - bSz / 2, bSz, bSz);
    }

    // 6. Visual Effects (Beams, Lightning, Rings, Particles, Floating Damage Numbers)
    for (const bm of G.FX.beams) {
      const a = 1 - bm.t / bm.dur;
      ctx.save();
      ctx.globalAlpha = G.clamp(a, 0, 1);
      ctx.strokeStyle = bm.color;
      ctx.lineWidth = bm.width * cs * a;
      ctx.beginPath();
      if (bm.jagged && bm.pts.length) {
        bm.pts.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(ox + px * cs, oy + py * cs);
          else ctx.lineTo(ox + px * cs, oy + py * cs);
        });
      } else {
        ctx.moveTo(ox + bm.x0 * cs, oy + bm.y0 * cs);
        ctx.lineTo(ox + bm.x1 * cs, oy + bm.y1 * cs);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const rg of G.FX.rings) {
      const u = rg.t / rg.dur;
      const rad = rg.maxR * cs * G.easeOut(u);
      ctx.save();
      ctx.globalAlpha = G.clamp(1 - u, 0, 1);
      ctx.strokeStyle = rg.color;
      ctx.lineWidth = 3 * dpr * (1 - u * 0.5);
      ctx.beginPath();
      ctx.arc(ox + rg.x * cs, oy + rg.y * cs, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of G.FX.particles) {
      const a = 1 - p.t / p.dur;
      ctx.save();
      ctx.globalAlpha = G.clamp(a, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(ox + p.x * cs, oy + p.y * cs, p.r * dpr * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const tx of G.FX.texts) {
      const a = 1 - Math.pow(tx.t / tx.dur, 2);
      const sx = ox + tx.x * cs;
      const sy = oy + tx.y * cs;
      ctx.save();
      ctx.globalAlpha = G.clamp(a, 0, 1);
      ctx.font = `900 ${Math.round((tx.big ? 14.5 : 11.5) * dpr)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.2 * dpr;
      ctx.strokeStyle = '#060a12';
      ctx.strokeText(tx.text, sx, sy);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, sx, sy);
      ctx.restore();
    }

    ctx.restore(); // end clip

    // Arena outer gold/slate border
    roundRectPath(ox, oy, boardW, boardH, 12 * dpr);
    ctx.strokeStyle = 'rgba(244, 197, 99, 0.28)';
    ctx.lineWidth = 1.8 * dpr;
    ctx.stroke();

    ctx.restore();
  }

  return { init, resize, screenToGrid, drawFrame };
})();
