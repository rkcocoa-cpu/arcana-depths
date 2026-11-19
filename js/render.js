'use strict';
/* =========================================================
 *  render.js : HD canvas renderer, ambient occlusion, dynamic
 *              lighting, fog-of-war, targeting overlay, minimap
 * ========================================================= */
G.Render = (function () {
  const T = G.TILE;
  let canvas = null, ctx = null;
  let miniCanvas = null, miniCtx = null;
  let camX = 0, camY = 0, camReady = false;
  let viewScale = 4.5;
  let tileSize = 72;
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
    // Smooth responsive tile sizing (~9.2 tiles across mobile portrait)
    const cssW = rect.width || 375;
    const desiredTilesX = cssW < 520 ? 9.2 : 12.8;
    tileSize = Math.max(36, Math.round((cssW * dpr) / desiredTilesX));
    viewScale = tileSize / 16;
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

    // Smooth camera follow
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

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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
              const cx = px + ts * 0.5;
              const cy = py + ts * 0.28 + Math.sin(time * 14 + x) * ts * 0.025;
              const fg = ctx.createRadialGradient(cx, cy, ts * 0.02, cx, cy, ts * 0.24);
              fg.addColorStop(0, '#ffffff');
              fg.addColorStop(0.35, '#ffe066');
              fg.addColorStop(0.75, 'rgba(255, 110, 30, 0.55)');
              fg.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = fg;
              ctx.beginPath();
              ctx.arc(cx, cy, ts * 0.24, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (t === T.STAIRS) {
          ctx.drawImage(tileset.stairs, px, py, ts, ts);
          if (vis[k]) {
            const pulse = 0.26 + 0.14 * Math.sin(time * 3.2);
            const sg = ctx.createRadialGradient(px + ts / 2, py + ts / 2, ts * 0.05, px + ts / 2, py + ts / 2, ts * 0.45);
            sg.addColorStop(0, `rgba(255, 224, 120, ${pulse})`);
            sg.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2, ts * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (t === T.WATER || t === T.LAVA || t === T.CHASM) {
          const kind = t === T.WATER ? 'water' : t === T.LAVA ? 'lava' : 'chasm';
          ctx.drawImage(G.Spr.liquid[kind][(animFrame + ((x + y) & 1)) % 4], px, py, ts, ts);
          // Crisp recessed shore lip when tile above is solid ground
          if (y > 0 && lv.tiles[(y - 1) * lv.w + x] !== t) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(px, py, ts, Math.max(2, ts * 0.1));
          }
        } else {
          ctx.drawImage(tileset.floor[v], px, py, ts, ts);
          // Ambient occlusion cast by wall above
          if (y > 0 && lv.tiles[(y - 1) * lv.w + x] === T.WALL) {
            const ao = ctx.createLinearGradient(px, py, px, py + ts * 0.28);
            ao.addColorStop(0, 'rgba(4, 5, 10, 0.44)');
            ao.addColorStop(1, 'rgba(4, 5, 10, 0)');
            ctx.fillStyle = ao;
            ctx.fillRect(px, py, ts, ts * 0.28);
          }
          if (t === T.PILLAR) {
            ctx.drawImage(G.Spr.s.pillar.img, px, py - ts * 0.08, ts, ts);
          }
        }

        // Biome floor decorations
        const dk = lv.deco[k];
        if (dk && dk !== 'torch' && t === T.FLOOR) {
          if (dk === 'moss') {
            ctx.fillStyle = 'rgba(95, 152, 68, 0.42)';
            ctx.beginPath();
            ctx.ellipse(px + ts * 0.28, py + ts * 0.35, ts * 0.16, ts * 0.10, 0.2, 0, Math.PI * 2);
            ctx.ellipse(px + ts * 0.68, py + ts * 0.70, ts * 0.18, ts * 0.11, -0.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (dk === 'ember') {
            const pulse = 0.35 + 0.22 * Math.sin(time * 5 + x);
            ctx.fillStyle = `rgba(255, 120, 40, ${pulse})`;
            ctx.beginPath();
            ctx.arc(px + ts * 0.36, py + ts * 0.48, ts * 0.08, 0, Math.PI * 2);
            ctx.arc(px + ts * 0.68, py + ts * 0.72, ts * 0.06, 0, Math.PI * 2);
            ctx.fill();
          } else if (dk === 'star' || dk === 'rune') {
            const cx = px + ts * 0.5, cy = py + ts * 0.5;
            if (dk === 'rune') {
              ctx.strokeStyle = 'rgba(165, 195, 255, 0.34)';
              ctx.lineWidth = Math.max(1.2, viewScale * 0.35);
              ctx.beginPath();
              ctx.arc(cx, cy, ts * 0.28, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.fillStyle = dk === 'star' ? 'rgba(185, 220, 255, 0.52)' : 'rgba(190, 160, 255, 0.55)';
            ctx.beginPath();
            ctx.arc(cx, cy, ts * 0.06, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const spName = dk === 'crystal' && biome.id === 'void' ? 'crystalViolet' : dk;
            if (G.Spr.s[spName]) ctx.drawImage(G.Spr.s[spName].img, px, py, ts, ts);
          }
        }
      }
    }

    // 2. Ground effects (venom clouds, fire zones, boss telegraphs)
    if (state.clouds) {
      for (const cl of state.clouds) {
        if (cl.x < x0 || cl.x > x1 || cl.y < y0 || cl.y > y1) continue;
        const k = cl.y * lv.w + cl.x;
        if (!vis[k]) continue;
        const cx = originX + (cl.x + 0.5) * ts, cy = originY + (cl.y + 0.5) * ts;
        if (cl.kind === 'venom') {
          const vg = ctx.createRadialGradient(cx, cy, ts * 0.08, cx, cy, ts * 0.52);
          vg.addColorStop(0, `rgba(140, 235, 95, ${0.42 + 0.1 * Math.sin(time * 4 + cl.x)})`);
          vg.addColorStop(1, 'rgba(60, 150, 40, 0)');
          ctx.fillStyle = vg;
          ctx.beginPath(); ctx.arc(cx, cy, ts * 0.52, 0, Math.PI * 2); ctx.fill();
        } else if (cl.kind === 'fire') {
          const fg = ctx.createRadialGradient(cx, cy, ts * 0.06, cx, cy, ts * 0.48);
          fg.addColorStop(0, `rgba(255, 195, 70, ${0.48 + 0.14 * Math.sin(time * 7 + cl.y)})`);
          fg.addColorStop(0.55, 'rgba(255, 95, 28, 0.32)');
          fg.addColorStop(1, 'rgba(200, 40, 10, 0)');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(cx, cy, ts * 0.48, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    if (state.telegraphs) {
      for (const tg of state.telegraphs) {
        const k = tg.y * lv.w + tg.x;
        if (!exp[k]) continue;
        const px = originX + tg.x * ts, py = originY + tg.y * ts;
        const pulse = 0.34 + 0.24 * Math.sin(time * 10);
        ctx.fillStyle = `rgba(255, 50, 72, ${pulse})`;
        ctx.beginPath();
        ctx.roundRect(px + ts * 0.06, py + ts * 0.06, ts * 0.88, ts * 0.88, ts * 0.12);
        ctx.fill();
        ctx.strokeStyle = '#ff6a7a';
        ctx.lineWidth = Math.max(2, viewScale * 0.65);
        ctx.stroke();
        // Danger rune cross inside telegraph tile
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts / 2, ts * 0.24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 210, 215, 0.8)';
        ctx.lineWidth = Math.max(1.5, viewScale * 0.35);
        ctx.stroke();
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
        const cx = px + ts / 2, cy = py + ts / 2;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.6, viewScale * 0.45);
        ctx.strokeRect(px + ts * 0.22, py + ts * 0.22, ts * 0.56, ts * 0.56);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, ts * 0.12, 0, Math.PI * 2); ctx.fill();
      } else if (o.type === 'chest') {
        const sp = o.open ? G.Spr.s.chestOpen : G.Spr.s.chest;
        ctx.drawImage(sp.img, px, py, ts, ts);
      } else if (o.type === 'shrine') {
        if (!o.used && vis[k]) {
          const shg = ctx.createRadialGradient(px + ts / 2, py + ts * 0.4, ts * 0.05, px + ts / 2, py + ts * 0.4, ts * 0.58);
          shg.addColorStop(0, `rgba(130, 235, 255, ${0.30 + 0.12 * Math.sin(time * 3)})`);
          shg.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = shg;
          ctx.beginPath(); ctx.arc(px + ts / 2, py + ts * 0.4, ts * 0.58, 0, Math.PI * 2); ctx.fill();
        }
        ctx.drawImage(G.Spr.s.shrine.img, px, py, ts, ts);
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
      const bob = Math.sin(time * 3.5 + it.x) * ts * 0.04;
      if (it.gold) {
        ctx.drawImage(G.Spr.s.gold.img, px + ts * 0.08, py + ts * 0.08 + bob, ts * 0.84, ts * 0.84);
      } else if (it.item) {
        const def = G.ITEMS[it.item.id];
        const icon = G.Spr.icons[def.icon];
        if (icon) ctx.drawImage(icon, px + ts * 0.1, py + ts * 0.1 + bob, ts * 0.8, ts * 0.8);
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
      const flyHover = !isPlayer && a.fly ? Math.sin(time * 4.2 + (a.uid || 0)) * ts * 0.05 : 0;
      const dw = ts * scaleMul;
      const dh = ts * scaleMul;
      const ox = px + (ts - dw) / 2;
      const oy = py + ts - dh - (a.hop || 0) * ts * 0.22 - flyHover;

      // Ground drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(px + ts / 2, py + ts * 0.90, ts * 0.34 * scaleMul, ts * 0.13 * scaleMul, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boss / Elite magic aura circle
      if (!isPlayer && (a.elite || a.boss)) {
        ctx.save();
        ctx.strokeStyle = a.boss ? 'rgba(255, 200, 90, 0.65)' : 'rgba(205, 130, 255, 0.60)';
        ctx.lineWidth = Math.max(2, viewScale * 0.55);
        ctx.beginPath();
        ctx.ellipse(px + ts / 2, py + ts * 0.90, ts * 0.44 * scaleMul, ts * 0.17 * scaleMul, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Chilled frost shimmer ring at feet
      if (!isPlayer && (a.chill || 0) > 0 && !(a.frozen > 0)) {
        ctx.strokeStyle = 'rgba(130, 225, 255, 0.62)';
        ctx.lineWidth = Math.max(1.5, viewScale * 0.4);
        ctx.beginPath();
        ctx.ellipse(px + ts / 2, py + ts * 0.90, ts * 0.38 * scaleMul, ts * 0.14 * scaleMul, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw crisp HD sprite (flash / frozen variant — no ctx.filter)
      const img = a.flash > 0 ? sp.flash : (a.frozen > 0 && sp.frozenImg ? sp.frozenImg : sp.img);
      ctx.save();
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
        const sg = ctx.createRadialGradient(px + ts / 2, py + ts / 2, ts * 0.25, px + ts / 2, py + ts / 2, ts * 0.56);
        sg.addColorStop(0, 'rgba(120, 210, 255, 0.04)');
        sg.addColorStop(0.85, `rgba(120, 210, 255, ${0.28 + 0.12 * Math.sin(time * 5)})`);
        sg.addColorStop(1, 'rgba(140, 225, 255, 0.72)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts / 2, ts * 0.54, 0, Math.PI * 2);
        ctx.fill();
      }

      // Status badges & clean HP bar on damaged monsters
      if (!isPlayer) {
        const badgeSize = Math.max(5, ts * 0.085);
        if (a.asleep) {
          ctx.fillStyle = '#a8d0ff';
          ctx.font = `bold ${Math.max(11, Math.round(ts * 0.24))}px "DotGothic16", monospace`;
          ctx.fillText('z', px + ts * 0.72, oy + ts * 0.18);
        } else {
          let bx = px + ts * 0.12;
          const by = oy + ts * 0.12;
          const drawDot = (col) => {
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(bx, by, badgeSize, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#09080f'; ctx.lineWidth = 1.5; ctx.stroke();
            bx += badgeSize * 2.2;
          };
          if (a.frozen > 0) drawDot('#8fe6ff');
          else if ((a.chill || 0) > 0) drawDot('#5ec8f0');
          if (a.burn > 0) drawDot('#ff8a3a');
          if (a.poison > 0) drawDot('#9be15d');
        }

        if (a.hp < a.maxHp && !a.boss) {
          const bw = ts * 0.76;
          const bh = Math.max(4, Math.round(ts * 0.075));
          const bx = px + (ts - bw) / 2;
          const by = oy - bh - 3;
          ctx.fillStyle = '#0c0b12';
          ctx.beginPath(); ctx.roundRect(bx - 1.5, by - 1.5, bw + 3, bh + 3, 2); ctx.fill();
          ctx.fillStyle = a.ally ? '#ffd27a' : '#e6495c';
          ctx.beginPath();
          ctx.roundRect(bx, by, Math.max(2, bw * (a.hp / a.maxHp)), bh, 1.5);
          ctx.fill();
        }
      }
    }

    // 6. Lighting / Fog-of-War overlay
    const amb = biome.ambient;
    const mem = biome.memory;
    const plR = pl.vision || 7;

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

    // Smooth additive radial glows (lantern, torches, crystals, lava)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const plCx = originX + (tx + 0.5) * ts;
    const plCy = originY + (ty + 0.5) * ts;
    const plRad = ts * 4.3 * (0.97 + 0.03 * Math.sin(time * 7));
    const pg = ctx.createRadialGradient(plCx, plCy, ts * 0.2, plCx, plCy, plRad);
    pg.addColorStop(0, 'rgba(255, 212, 145, 0.14)');
    pg.addColorStop(0.55, 'rgba(255, 190, 110, 0.05)');
    pg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(plCx, plCy, plRad, 0, Math.PI * 2); ctx.fill();

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
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Ambient biome particles
    if (Math.random() < 0.25) {
      const rx = pl.x + Math.floor((Math.random() - 0.5) * 10);
      const ry = pl.y + Math.floor((Math.random() - 0.5) * 10);
      if (rx > 0 && ry > 0 && rx < lv.w - 1 && ry < lv.h - 1 && vis[ry * lv.w + rx]) {
        const col = biome.id === 'crypt' ? '#9fd07a' : biome.id === 'crystal' ? '#8fe6ff' : biome.id === 'molten' ? '#ff9a3a' : '#d8c8ff';
        G.FX.spark(rx + Math.random(), ry + Math.random(), col, 0.85);
      }
    }

    // 7. Targeting overlay
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
          ctx.beginPath();
          ctx.roundRect(px + 2, py + 2, ts - 4, ts - 4, 4);
          ctx.fill();
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = Math.max(1.2, viewScale * 0.32);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      if (tg.hover) {
        const hx = tg.hover.x, hy = tg.hover.y;
        const px = originX + hx * ts, py = originY + hy * ts;
        ctx.strokeStyle = '#ffd27a';
        ctx.lineWidth = Math.max(2.5, viewScale * 0.65);
        ctx.beginPath();
        ctx.roundRect(px + 3, py + 3, ts - 6, ts - 6, 5);
        ctx.stroke();
      }
    }

    // 8. FX layer (glowing beams, rings, projectiles, particles, outlined damage numbers)
    for (const b of G.FX.beams) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.life / b.max);
      const bx0 = originX + b.x0 * ts, by0 = originY + b.y0 * ts;
      const bx1 = originX + b.x1 * ts, by1 = originY + b.y1 * ts;
      const pts = [[bx0, by0]];
      if (b.jagged) {
        const segs = 5;
        for (let i = 1; i < segs; i++) {
          const u = i / segs;
          pts.push([
            G.lerp(bx0, bx1, u) + (Math.random() - 0.5) * ts * 0.42,
            G.lerp(by0, by1, u) + (Math.random() - 0.5) * ts * 0.42,
          ]);
        }
      }
      pts.push([bx1, by1]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * viewScale * 1.4;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, b.width * viewScale * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    for (const r of G.FX.rings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, (r.life / r.max) * 0.85);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(2, viewScale * 0.7);
      ctx.beginPath();
      ctx.arc(originX + r.x * ts, originY + r.y * ts, r.r * ts, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const pr of G.FX.projectiles) {
      const px = originX + pr.x * ts, py = originY + pr.y * ts;
      const prRad = Math.max(6, ts * 0.16);
      const prG = ctx.createRadialGradient(px, py, prRad * 0.2, px, py, prRad * 1.9);
      prG.addColorStop(0, '#ffffff');
      prG.addColorStop(0.45, pr.color);
      prG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = prG;
      ctx.beginPath(); ctx.arc(px, py, prRad * 1.9, 0, Math.PI * 2); ctx.fill();
    }

    for (const p of G.FX.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      const radP = Math.max(1.6, p.size * viewScale * 0.42);
      ctx.beginPath();
      ctx.arc(originX + p.x * ts, originY + p.y * ts, radP, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ft of G.FX.texts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (ft.life / ft.max) * 1.6);
      const sz = Math.max(13, Math.round(ts * (ft.big ? 0.34 : 0.26)));
      ctx.font = `bold ${sz}px "DotGothic16", monospace`;
      ctx.textAlign = 'center';
      const fx = originX + ft.x * ts;
      const fy = originY + ft.y * ts;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#09080f';
      ctx.lineWidth = Math.max(3, Math.round(sz * 0.22));
      ctx.strokeText(ft.text, fx, fy);
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
