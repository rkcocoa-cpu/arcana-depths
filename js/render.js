'use strict';
/* =========================================================
 *  render.js : pixel-art canvas renderer, dynamic lighting,
 *              fog-of-war, targeting overlay, minimap
 * ========================================================= */
G.Render = (function () {
  const T = G.TILE;
  let canvas = null, ctx = null;
  let miniCanvas = null, miniCtx = null;
  let camX = 0, camY = 0, camReady = false;
  let viewScale = 3; // pixels per world pixel (tile = 16 * viewScale)
  let tileSize = 48;
  let time = 0;

  function init(mainCanvas, mCanvas) {
    canvas = mainCanvas;
    ctx = canvas.getContext('2d');
    miniCanvas = mCanvas;
    miniCtx = mCanvas ? mCanvas.getContext('2d') : null;
    resize();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    // Choose a crisp scale so ~9-11 tiles fit across mobile width
    const cssW = rect.width || 375;
    const desiredTilesX = cssW < 520 ? 9.5 : 13;
    const rawTile = (cssW * dpr) / desiredTilesX;
    // Snap to clean integer scale of 16px when close, or crisp multiple
    const sc = Math.max(2, Math.round(rawTile / 16));
    viewScale = sc;
    tileSize = 16 * viewScale;
  }

  function snapCamera(x, y) {
    camX = x;
    camY = y;
    camReady = true;
  }

  function screenToTile(clientX, clientY) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const sx = (clientX - rect.left) * dpr;
    const sy = (clientY - rect.top) * dpr;
    const wx = (sx - canvas.width / 2) / tileSize + camX;
    const wy = (sy - canvas.height / 2) / tileSize + camY;
    return { x: Math.floor(wx), y: Math.floor(wy) };
  }

  function drawFrame(state, dt) {
    if (!canvas || !ctx || !state || !state.level) return;
    time += dt;
    const lv = state.level;
    const pl = state.player;
    const biome = G.biomeFor(state.floor);
    const tileset = G.Spr.tiles[biome.id];
    const vis = state.vis;
    const exp = state.exp;

    // Camera follow
    const tx = pl.vx !== undefined ? pl.vx : pl.x;
    const ty = pl.vy !== undefined ? pl.vy : pl.y;
    if (!camReady) snapCamera(tx + 0.5, ty + 0.5);
    else {
      const k = 1 - Math.exp(-12 * dt);
      camX = G.lerp(camX, tx + 0.5, k);
      camY = G.lerp(camY, ty + 0.5, k);
    }

    const shake = G.FX.shake;
    const sxOff = shake > 0.1 ? (Math.random() - 0.5) * shake * viewScale * 0.7 : 0;
    const syOff = shake > 0.1 ? (Math.random() - 0.5) * shake * viewScale * 0.7 : 0;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const ts = tileSize;
    const originX = Math.round(canvas.width / 2 - camX * ts + sxOff);
    const originY = Math.round(canvas.height / 2 - camY * ts + syOff);

    const x0 = Math.max(0, Math.floor(-originX / ts) - 1);
    const y0 = Math.max(0, Math.floor(-originY / ts) - 1);
    const x1 = Math.min(lv.w - 1, Math.ceil((canvas.width - originX) / ts) + 1);
    const y1 = Math.min(lv.h - 1, Math.ceil((canvas.height - originY) / ts) + 1);

    const animFrame = Math.floor(time * 3.5) % 4;
    const torchFlick = 0.88 + Math.sin(time * 9.5) * 0.08 + Math.sin(time * 17) * 0.04;

    // 1. Base tiles
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const k = y * lv.w + x;
        if (!exp[k]) continue;
        const px = originX + x * ts;
        const py = originY + y * ts;
        const t = lv.tiles[k];
        const v = Math.floor(G.hash2(x, y, lv.floor) * 4) % 4;

        if (t === T.WALL) {
          const below = y + 1 < lv.h ? lv.tiles[(y + 1) * lv.w + x] : T.WALL;
          const img = below !== T.WALL ? tileset.face[v] : tileset.top[v & 1];
          ctx.drawImage(img, px, py, ts, ts);
          if (lv.deco[k] === 'torch') {
            ctx.drawImage(G.Spr.s.sconce.img, px, py, ts, ts);
            if (vis[k]) {
              // flickering flame pixels
              const fx = px + 7 * viewScale;
              const fy = py + (3 + ((animFrame + x) & 1)) * viewScale;
              ctx.fillStyle = '#ff7a2a';
              ctx.fillRect(fx - viewScale, fy, viewScale * 3, viewScale * 3);
              ctx.fillStyle = '#ffe066';
              ctx.fillRect(fx, fy - viewScale, viewScale, viewScale * 2);
            }
          }
        } else if (t === T.STAIRS) {
          ctx.drawImage(tileset.stairs, px, py, ts, ts);
          // subtle golden shimmer on stairs
          if (vis[k]) {
            const pulse = 0.22 + 0.14 * Math.sin(time * 3.2);
            ctx.fillStyle = `rgba(255, 215, 110, ${pulse})`;
            ctx.fillRect(px + 3 * viewScale, py + 3 * viewScale, ts - 6 * viewScale, ts - 6 * viewScale);
          }
        } else if (t === T.WATER || t === T.LAVA || t === T.CHASM) {
          const kind = t === T.WATER ? 'water' : t === T.LAVA ? 'lava' : 'chasm';
          ctx.drawImage(G.Spr.liquid[kind][(animFrame + ((x + y) & 1)) % 4], px, py, ts, ts);
        } else {
          ctx.drawImage(tileset.floor[v], px, py, ts, ts);
          if (t === T.PILLAR) {
            ctx.drawImage(G.Spr.s.pillar.img, px, py - 2 * viewScale, ts, ts);
          }
        }

        // Biome floor decorations
        const dk = lv.deco[k];
        if (dk && dk !== 'torch' && t === T.FLOOR) {
          if (dk === 'moss') {
            ctx.fillStyle = 'rgba(95,148,68,0.45)';
            ctx.fillRect(px + 2 * viewScale, py + 4 * viewScale, 4 * viewScale, 3 * viewScale);
            ctx.fillRect(px + 8 * viewScale, py + 10 * viewScale, 5 * viewScale, 3 * viewScale);
          } else if (dk === 'ember') {
            ctx.fillStyle = `rgba(255,115,40,${0.4 + 0.2 * Math.sin(time * 5 + x)})`;
            ctx.fillRect(px + 5 * viewScale, py + 7 * viewScale, 2 * viewScale, 2 * viewScale);
            ctx.fillRect(px + 10 * viewScale, py + 11 * viewScale, 2 * viewScale, 1 * viewScale);
          } else if (dk === 'star' || dk === 'rune') {
            ctx.fillStyle = dk === 'star' ? 'rgba(170,210,255,0.45)' : 'rgba(180,150,255,0.5)';
            ctx.fillRect(px + 7 * viewScale, py + 7 * viewScale, 2 * viewScale, 2 * viewScale);
            if (dk === 'rune') {
              ctx.strokeStyle = 'rgba(160,190,255,0.35)';
              ctx.lineWidth = Math.max(1, viewScale * 0.5);
              ctx.strokeRect(px + 4 * viewScale, py + 4 * viewScale, 8 * viewScale, 8 * viewScale);
            }
          } else {
            const spName = dk === 'crystal' && biome.id === 'void' ? 'crystalViolet' : dk;
            if (G.Spr.s[spName]) ctx.drawImage(G.Spr.s[spName].img, px, py, ts, ts);
          }
        }
      }
    }

    // 2. Ground effects (venom clouds, fire zones, boss telegraphs, traps)
    if (state.clouds) {
      for (const cl of state.clouds) {
        if (cl.x < x0 || cl.x > x1 || cl.y < y0 || cl.y > y1) continue;
        const k = cl.y * lv.w + cl.x;
        if (!vis[k]) continue;
        const px = originX + cl.x * ts, py = originY + cl.y * ts;
        if (cl.kind === 'venom') {
          ctx.fillStyle = `rgba(110, 210, 80, ${0.28 + 0.1 * Math.sin(time * 4 + cl.x)})`;
          ctx.fillRect(px + viewScale, py + viewScale, ts - 2 * viewScale, ts - 2 * viewScale);
        } else if (cl.kind === 'fire') {
          ctx.fillStyle = `rgba(255, 110, 35, ${0.32 + 0.14 * Math.sin(time * 7 + cl.y)})`;
          ctx.fillRect(px + 2 * viewScale, py + 2 * viewScale, ts - 4 * viewScale, ts - 4 * viewScale);
        }
      }
    }

    if (state.telegraphs) {
      for (const tg of state.telegraphs) {
        const k = tg.y * lv.w + tg.x;
        if (!exp[k]) continue;
        const px = originX + tg.x * ts, py = originY + tg.y * ts;
        const pulse = 0.35 + 0.25 * Math.sin(time * 10);
        ctx.fillStyle = `rgba(255, 55, 70, ${pulse})`;
        ctx.fillRect(px + viewScale, py + viewScale, ts - 2 * viewScale, ts - 2 * viewScale);
        ctx.strokeStyle = '#ff5a6a';
        ctx.lineWidth = Math.max(2, viewScale);
        ctx.strokeRect(px + viewScale, py + viewScale, ts - 2 * viewScale, ts - 2 * viewScale);
      }
    }

    // 3. Objects (traps, chests, shrines, merchants)
    for (const o of lv.objects) {
      if (o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1) continue;
      const k = o.y * lv.w + o.x;
      if (!exp[k]) continue;
      const px = originX + o.x * ts, py = originY + o.y * ts;
      if (o.type === 'trap') {
        if (o.hidden) continue;
        const col = o.kind === 'fire' ? '#ff7a2a' : o.kind === 'poison' ? '#9be15d' : o.kind === 'teleport' ? '#7fd8ff' : '#d0d4dc';
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, viewScale * 0.7);
        ctx.strokeRect(px + 3 * viewScale, py + 3 * viewScale, ts - 6 * viewScale, ts - 6 * viewScale);
        ctx.fillStyle = col;
        ctx.fillRect(px + 7 * viewScale, py + 7 * viewScale, 2 * viewScale, 2 * viewScale);
      } else if (o.type === 'chest') {
        const sp = o.open ? G.Spr.s.chestOpen : G.Spr.s.chest;
        ctx.drawImage(sp.img, px, py, ts, ts);
      } else if (o.type === 'shrine') {
        ctx.drawImage(G.Spr.s.shrine.img, px, py, ts, ts);
        if (!o.used && vis[k]) {
          ctx.fillStyle = `rgba(130, 230, 255, ${0.18 + 0.1 * Math.sin(time * 3)})`;
          ctx.beginPath();
          ctx.arc(px + ts / 2, py + ts / 2, ts * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (o.type === 'merchant') {
        if (vis[k]) ctx.drawImage(G.Spr.s.merchant.img, px, py, ts, ts);
      }
    }

    // 4. Items on floor
    for (const it of lv.items) {
      if (it.x < x0 || it.x > x1 || it.y < y0 || it.y > y1) continue;
      const k = it.y * lv.w + it.x;
      if (!exp[k]) continue;
      const px = originX + it.x * ts, py = originY + it.y * ts;
      const bob = Math.sin(time * 3.5 + it.x) * viewScale * 0.6;
      if (it.gold) {
        ctx.drawImage(G.Spr.s.gold.img, px, py + bob, ts, ts);
      } else if (it.item) {
        const def = G.ITEMS[it.item.id];
        const icon = G.Spr.icons[def.icon];
        if (icon) ctx.drawImage(icon, px + 2 * viewScale, py + 2 * viewScale + bob, ts - 4 * viewScale, ts - 4 * viewScale);
      }
    }

    // 5. Entities (allies, enemies, player) sorted by Y
    const actors = [];
    for (const m of state.monsters) {
      if (m.hp <= 0) continue;
      const k = m.y * lv.w + m.x;
      if (!vis[k]) continue;
      actors.push(m);
    }
    actors.push(pl);
    actors.sort((a, b) => a.y - b.y);

    for (const a of actors) {
      const isPlayer = a === pl;
      const dx = a.vx !== undefined ? a.vx : a.x;
      const dy = a.vy !== undefined ? a.vy : a.y;
      const px = originX + dx * ts;
      const py = originY + dy * ts;
      const sp = isPlayer ? state.playerSprite : G.Spr.s[a.sprite];
      if (!sp) continue;

      const scaleMul = a.scale || 1;
      const dw = sp.w * viewScale * scaleMul;
      const dh = sp.h * viewScale * scaleMul;
      const ox = px + (ts - dw) / 2;
      const oy = py + ts - dh - (a.hop || 0) * viewScale * 3;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(px + ts / 2, py + ts - 2 * viewScale, ts * 0.34 * scaleMul, ts * 0.14 * scaleMul, 0, 0, Math.PI * 2);
      ctx.fill();

      // Elite / boss aura
      if (!isPlayer && (a.elite || a.boss)) {
        ctx.strokeStyle = a.boss ? 'rgba(255, 195, 80, 0.55)' : 'rgba(200, 120, 255, 0.55)';
        ctx.lineWidth = Math.max(2, viewScale * 0.8);
        ctx.beginPath();
        ctx.ellipse(px + ts / 2, py + ts - 2 * viewScale, ts * 0.42 * scaleMul, ts * 0.18 * scaleMul, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw sprite (or white flash)
      const img = a.flash > 0 ? sp.flash : sp.img;
      ctx.save();
      if (a.frozen > 0) ctx.filter = 'hue-rotate(160deg) brightness(1.25)';
      if (a.flip) {
        ctx.translate(ox + dw, oy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, dw, dh);
      } else {
        ctx.drawImage(img, ox, oy, dw, dh);
      }
      ctx.restore();

      // Player shield bubble
      if (isPlayer && pl.shield > 0) {
        ctx.strokeStyle = `rgba(120, 210, 255, ${0.45 + 0.2 * Math.sin(time * 5)})`;
        ctx.lineWidth = Math.max(2, viewScale * 0.8);
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts / 2, ts * 0.52, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Status icons / sleeping badge
      if (!isPlayer) {
        if (a.asleep) {
          ctx.fillStyle = '#a8c8ff';
          ctx.font = `bold ${Math.max(10, viewScale * 3.5)}px monospace`;
          ctx.fillText('z', px + ts - 4 * viewScale, py + 3 * viewScale);
        } else if (a.frozen > 0) {
          ctx.fillStyle = '#8fe6ff';
          ctx.fillRect(px + 2 * viewScale, py + 2 * viewScale, 3 * viewScale, 3 * viewScale);
        } else if (a.burn > 0) {
          ctx.fillStyle = '#ff8a3a';
          ctx.fillRect(px + 2 * viewScale, py + 2 * viewScale, 3 * viewScale, 3 * viewScale);
        } else if (a.poison > 0) {
          ctx.fillStyle = '#9be15d';
          ctx.fillRect(px + 2 * viewScale, py + 2 * viewScale, 3 * viewScale, 3 * viewScale);
        }
        // HP bar when damaged
        if (a.hp < a.maxHp && !a.boss) {
          const bw = ts - 4 * viewScale;
          const bh = Math.max(3, viewScale);
          const bx = px + 2 * viewScale;
          const by = py - 2 * viewScale;
          ctx.fillStyle = '#120f18';
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = a.ally ? '#ffd27a' : '#e0485a';
          ctx.fillRect(bx, by, Math.max(1, Math.round(bw * (a.hp / a.maxHp))), bh);
        }
      }
    }

    // 6. Lighting / Fog-of-War overlay (clean FoW + smooth radial warm glows)
    const amb = biome.ambient;
    const mem = biome.memory;
    const plR = pl.vision || 7;

    // 6a. Fog-of-war memory & subtle distance dimming
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const k = y * lv.w + x;
        if (!exp[k]) continue;
        const px = originX + x * ts, py = originY + y * ts;
        if (!vis[k]) {
          ctx.fillStyle = `rgba(${mem[0] >> 1}, ${mem[1] >> 1}, ${mem[2] >> 1}, 0.68)`;
          ctx.fillRect(px, py, ts, ts);
        } else {
          const pd = Math.hypot(x - pl.x, y - pl.y);
          let dim = Math.max(0, (pd - 2.5) / (plR + 1.5)) * 0.42;
          for (const l of lv.lights) {
            const ld = Math.hypot(x - l.x, y - l.y);
            if (ld < l.r) dim *= 1 - (1 - ld / l.r) * 0.65;
          }
          if (dim > 0.04) {
            ctx.fillStyle = `rgba(${amb[0] >> 2}, ${amb[1] >> 2}, ${amb[2] >> 2}, ${dim.toFixed(2)})`;
            ctx.fillRect(px, py, ts, ts);
          }
        }
      }
    }

    // 6b. Smooth additive radial glows (player lantern + torches + crystals + lava)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const plCx = originX + (tx + 0.5) * ts;
    const plCy = originY + (ty + 0.5) * ts;
    const plRad = ts * 4.2 * (0.97 + 0.03 * Math.sin(time * 7));
    const pg = ctx.createRadialGradient(plCx, plCy, ts * 0.2, plCx, plCy, plRad);
    pg.addColorStop(0, 'rgba(255, 210, 140, 0.14)');
    pg.addColorStop(0.55, 'rgba(255, 190, 110, 0.05)');
    pg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(plCx, plCy, plRad, 0, Math.PI * 2);
    ctx.fill();

    for (const l of lv.lights) {
      const lx = Math.floor(l.x), ly = Math.floor(l.y);
      if (lx < x0 - 3 || lx > x1 + 3 || ly < y0 - 3 || ly > y1 + 3) continue;
      if (!vis[ly * lv.w + lx]) continue;
      const cx = originX + (l.x + 0.5) * ts;
      const cy = originY + (l.y + 0.5) * ts;
      const rad = l.r * ts * 0.85 * (l.flick ? torchFlick : 1);
      const lg = ctx.createRadialGradient(cx, cy, ts * 0.15, cx, cy, rad);
      const alpha = l.torch ? 0.22 : l.lava ? 0.14 : 0.16;
      lg.addColorStop(0, `rgba(${l.c[0]}, ${l.c[1]}, ${l.c[2]}, ${alpha})`);
      lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 6c. Occasional ambient biome particles in visible area
    if (Math.random() < 0.25) {
      const rx = pl.x + Math.floor((Math.random() - 0.5) * 10);
      const ry = pl.y + Math.floor((Math.random() - 0.5) * 10);
      if (rx > 0 && ry > 0 && rx < lv.w - 1 && ry < lv.h - 1 && vis[ry * lv.w + rx]) {
        const col = biome.id === 'crypt' ? '#9fd07a' : biome.id === 'crystal' ? '#8fe6ff' : biome.id === 'molten' ? '#ff9a3a' : '#d8c8ff';
        G.FX.spark(rx + Math.random(), ry + Math.random(), col, 0.85);
      }
    }

    // 7. Targeting overlay (when spell active)
    if (state.targeting) {
      const tg = state.targeting;
      const range = G.spellRange(tg.spellId, tg.lv);
      const col = (G.ELEM[G.SPELLS[tg.spellId].elem] || {}).color || '#ffd27a';
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = y * lv.w + x;
          if (!vis[k]) continue;
          const d = G.dist(pl.x, pl.y, x, y);
          if (d === 0 || d > range) continue;
          const t = lv.tiles[k];
          if (t === T.WALL || t === T.PILLAR) continue;
          const px = originX + x * ts, py = originY + y * ts;
          ctx.fillStyle = 'rgba(255, 220, 120, 0.12)';
          ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.32;
          ctx.lineWidth = Math.max(1, viewScale * 0.4);
          ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
          ctx.globalAlpha = 1;
        }
      }
      if (tg.hover) {
        const hx = tg.hover.x, hy = tg.hover.y;
        const px = originX + hx * ts, py = originY + hy * ts;
        ctx.strokeStyle = '#ffd27a';
        ctx.lineWidth = Math.max(2, viewScale * 0.8);
        ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
      }
    }

    // 8. FX layer (beams, rings, projectiles, particles, floating numbers)
    for (const b of G.FX.beams) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.life / b.max);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * viewScale;
      ctx.beginPath();
      const bx0 = originX + b.x0 * ts, by0 = originY + b.y0 * ts;
      const bx1 = originX + b.x1 * ts, by1 = originY + b.y1 * ts;
      ctx.moveTo(bx0, by0);
      if (b.jagged) {
        const segs = 5;
        for (let i = 1; i < segs; i++) {
          const u = i / segs;
          ctx.lineTo(
            G.lerp(bx0, bx1, u) + (Math.random() - 0.5) * ts * 0.45,
            G.lerp(by0, by1, u) + (Math.random() - 0.5) * ts * 0.45
          );
        }
      }
      ctx.lineTo(bx1, by1);
      ctx.stroke();
      ctx.restore();
    }

    for (const r of G.FX.rings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, (r.life / r.max) * 0.85);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(2, viewScale);
      ctx.beginPath();
      ctx.arc(originX + r.x * ts, originY + r.y * ts, r.r * ts, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const pr of G.FX.projectiles) {
      const px = originX + pr.x * ts, py = originY + pr.y * ts;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(4, viewScale * 2.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2, viewScale * 1.0), 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of G.FX.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      const sz = Math.max(2, p.size * viewScale);
      ctx.fillRect(originX + p.x * ts - sz / 2, originY + p.y * ts - sz / 2, sz, sz);
      ctx.restore();
    }

    for (const ft of G.FX.texts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (ft.life / ft.max) * 1.6);
      const sz = Math.max(12, Math.round(viewScale * (ft.big ? 5.2 : 4.1)));
      ctx.font = `bold ${sz}px "DotGothic16", monospace`;
      ctx.textAlign = 'center';
      const fx = originX + ft.x * ts;
      const fy = originY + ft.y * ts;
      ctx.fillStyle = '#09080f';
      ctx.fillText(ft.text, fx + 2, fy + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
      ctx.restore();
    }

    // 9. Minimap
    drawMini(state, miniCtx, miniCanvas);
  }

  function drawMini(state, mc, mcanv) {
    if (!mc || !mcanv || !state.level) return;
    const lv = state.level;
    const w = mcanv.width, h = mcanv.height;
    mc.fillStyle = '#090910';
    mc.fillRect(0, 0, w, h);
    const sx = w / lv.w, sy = h / lv.h;
    const cell = Math.max(1, Math.min(sx, sy));
    const ox = Math.floor((w - lv.w * cell) / 2);
    const oy = Math.floor((h - lv.h * cell) / 2);

    const hasStarEye = state.player.relics.includes('starEye');
    for (let y = 0; y < lv.h; y++) {
      for (let x = 0; x < lv.w; x++) {
        const k = y * lv.w + x;
        const t = lv.tiles[k];
        if (!state.exp[k]) {
          if (hasStarEye && t === T.STAIRS) {
            mc.fillStyle = '#ffe066';
            mc.fillRect(ox + x * cell, oy + y * cell, Math.max(2, cell), Math.max(2, cell));
          }
          continue;
        }
        if (t === T.WALL || t === T.PILLAR) continue;
        if (t === T.STAIRS) mc.fillStyle = '#ffe066';
        else if (t === T.LAVA) mc.fillStyle = '#e05020';
        else if (t === T.WATER) mc.fillStyle = '#306090';
        else if (t === T.CHASM) mc.fillStyle = '#151525';
        else mc.fillStyle = state.vis[k] ? '#68748a' : '#323846';
        mc.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
    for (const o of lv.objects) {
      if (!state.exp[o.y * lv.w + o.x]) continue;
      if (o.type === 'chest' && !o.open) { mc.fillStyle = '#f0c040'; mc.fillRect(ox + o.x * cell, oy + o.y * cell, Math.max(2, cell), Math.max(2, cell)); }
      if (o.type === 'shrine' && !o.used) { mc.fillStyle = '#7fe3ff'; mc.fillRect(ox + o.x * cell, oy + o.y * cell, Math.max(2, cell), Math.max(2, cell)); }
      if (o.type === 'merchant') { mc.fillStyle = '#8ff0a0'; mc.fillRect(ox + o.x * cell, oy + o.y * cell, Math.max(2, cell), Math.max(2, cell)); }
    }
    for (const m of state.monsters) {
      if (m.hp <= 0 || !state.vis[m.y * lv.w + m.x]) continue;
      mc.fillStyle = m.ally ? '#ffd27a' : m.boss ? '#ff40a0' : '#ff5a5a';
      mc.fillRect(ox + m.x * cell, oy + m.y * cell, Math.max(2, cell), Math.max(2, cell));
    }
    mc.fillStyle = '#7fffe0';
    mc.fillRect(ox + state.player.x * cell - 1, oy + state.player.y * cell - 1, Math.max(3, cell + 1), Math.max(3, cell + 1));
  }

  return { init, resize, snapCamera, screenToTile, drawFrame, drawMini };
})();
