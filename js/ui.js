'use strict';
/* =========================================================
 *  ui.js : mobile-first fantasy HUD, modals, touch/pointer
 *          & keyboard input, title screen, compendium
 * ========================================================= */
G.UI = (function () {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };

  let screen = 'title';
  let activeModal = null;
  let titleMotes = [];
  let lastTime = performance.now();
  let inspectRelicTimer = null;

  function init() {
    G.Spr.init();
    G.Render.init($('#game-canvas'), $('#mini-canvas'));
    bindTitle();
    bindGameInput();
    bindKeyboard();
    G.Game.onUI(onGameUpdate);

    window.addEventListener('resize', () => {
      G.Render.resize();
    });

    // Unlock Web Audio on first user interaction
    const unlock = () => { G.Audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    refreshTitle();
    requestAnimationFrame(loop);
  }

  /* ---------- Animation Loop ---------- */
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (screen === 'title') {
      drawTitleMotes(dt);
    } else if (screen === 'game' && G.Game.state) {
      if (G.FX.hitStop <= 0) {
        G.Game.updateVisuals(dt);
      }
      G.FX.update(dt);
      G.Render.drawFrame(G.Game.state, dt);
    }
    requestAnimationFrame(loop);
  }

  function drawTitleMotes(dt) {
    const c = $('#title-fx');
    if (!c) return;
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width) || c.height !== Math.floor(rect.height)) {
      c.width = Math.max(1, Math.floor(rect.width));
      c.height = Math.max(1, Math.floor(rect.height));
    }
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (titleMotes.length < 36) {
      titleMotes.push({
        x: Math.random() * c.width,
        y: c.height * (0.2 + Math.random() * 0.8),
        vy: -12 - Math.random() * 18,
        vx: (Math.random() - 0.5) * 8,
        r: 1.5 + Math.random() * 2.5,
        a: Math.random() * Math.PI * 2,
        col: Math.random() < 0.65 ? '#ffd27a' : '#7fe3ff',
      });
    }
    for (let i = titleMotes.length - 1; i >= 0; i--) {
      const m = titleMotes[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.a += dt * 3;
      if (m.y < -10) { titleMotes.splice(i, 1); continue; }
      x.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(m.a));
      x.fillStyle = m.col;
      x.fillRect(Math.round(m.x), Math.round(m.y), Math.ceil(m.r), Math.ceil(m.r));
    }
    x.globalAlpha = 1;
  }

  function showScreen(name) {
    screen = name;
    $('#screen-title').classList.toggle('active', name === 'title');
    $('#screen-game').classList.toggle('active', name === 'game');
    if (name === 'game') {
      setTimeout(() => G.Render.resize(), 20);
    } else {
      refreshTitle();
    }
  }

  /* ---------- Title Screen ---------- */
  function bindTitle() {
    $('#btn-continue').addEventListener('click', () => {
      G.Audio.play('tap');
      if (G.Game.resumeRun()) showScreen('game');
    });
    $('#btn-new-run').addEventListener('click', () => {
      G.Audio.play('tap');
      openClassModal();
    });
    $('#btn-sanctuary').addEventListener('click', () => {
      G.Audio.play('tap');
      openSanctuaryModal();
    });
    $('#btn-codex').addEventListener('click', () => {
      G.Audio.play('tap');
      openCodexModal();
    });
    $('#btn-title-settings').addEventListener('click', () => {
      G.Audio.play('tap');
      openSettingsModal(false);
    });
  }

  function refreshTitle() {
    const meta = G.Game.loadMeta();
    $('#title-dust').textContent = meta.dust;
    $('#title-best').textContent = `最高到達: B${meta.stats.bestFloor}F / 討伐: ${meta.stats.kills} / 制覇: ${meta.stats.wins}`;
    const hasSave = G.Game.hasSavedRun();
    const cont = $('#btn-continue');
    cont.style.display = hasSave ? 'flex' : 'none';
    if (hasSave) {
      try {
        const d = JSON.parse(localStorage.getItem('arcana_run_v1'));
        $('#continue-sub').textContent = `B${d.floor}F ・ ${G.CLASSES[d.cls].name} Lv.${d.player.lvl}`;
      } catch (e) { $('#continue-sub').textContent = ''; }
    }
  }

  /* ---------- Game Input (Touch / Pointer / D-pad / Keyboard) ---------- */
  function bindGameInput() {
    const canvas = $('#game-canvas');
    let pointerDownPos = null;
    let holdTimer = null;
    let heldInspect = false;

    canvas.addEventListener('pointerdown', (e) => {
      if (screen !== 'game' || activeModal) return;
      pointerDownPos = { x: e.clientX, y: e.clientY, t: performance.now() };
      heldInspect = false;
      const st = G.Game.state;
      const tile = G.Render.screenToTile(e.clientX, e.clientY);
      if (st && st.targeting && tile) st.targeting.hover = tile;
      clearTimeout(holdTimer);
      if (tile && st) {
        holdTimer = setTimeout(() => {
          const m = st.monsters.find((x) => x.hp > 0 && x.x === tile.x && x.y === tile.y);
          if (m && st.vis[m.y * st.level.w + m.x]) {
            heldInspect = true;
            openMonsterInfoModal(m);
          }
        }, 430);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (pointerDownPos && Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 12) {
        clearTimeout(holdTimer);
      }
      const st = G.Game.state;
      if (!st || !st.targeting) return;
      const tile = G.Render.screenToTile(e.clientX, e.clientY);
      if (tile) st.targeting.hover = tile;
    });

    canvas.addEventListener('pointerup', (e) => {
      clearTimeout(holdTimer);
      if (heldInspect) { pointerDownPos = null; return; }
      if (screen !== 'game' || activeModal || !pointerDownPos) return;
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);
      pointerDownPos = null;

      // Swipe gesture (>= 28px) -> 8-way step!
      if (dist >= 28) {
        const ang = Math.atan2(dy, dx);
        const oct = Math.round(ang / (Math.PI / 4));
        const dirs = {
          '0': [1, 0], '1': [1, 1], '2': [0, 1], '3': [-1, 1],
          '4': [-1, 0], '-4': [-1, 0], '-3': [-1, -1], '-2': [0, -1], '-1': [1, -1],
        };
        const d = dirs[String(oct)];
        if (d) { G.Game.stopAuto(); G.Game.stepPlayer(d[0], d[1]); }
        return;
      }

      const tile = G.Render.screenToTile(e.clientX, e.clientY);
      if (tile) G.Game.handleTileTap(tile.x, tile.y);
    });

    // Action buttons
    $('#act-explore').addEventListener('click', () => { G.Audio.play('tap'); G.Game.autoExplore(); });
    $('#act-wait').addEventListener('click', () => { G.Audio.play('tap'); G.Game.waitTurn(); });
    $('#act-bag').addEventListener('click', () => { G.Audio.play('tap'); openBagModal(); });
    $('#act-relics').addEventListener('click', () => { G.Audio.play('tap'); openRelicsModal(); });
    $('#act-dpad').addEventListener('click', () => {
      G.Audio.play('tap');
      G.settings.dpad = !G.settings.dpad;
      G.Game.saveSettings();
      syncDpadVisibility();
    });
    $('#btn-stairs').addEventListener('click', () => { G.Audio.play('tap'); G.Game.descendStairs(); });
    $('#btn-cancel-target').addEventListener('click', () => {
      if (G.Game.state) { G.Game.state.targeting = null; G.Audio.play('tap'); renderHUD(G.Game.state); }
    });
    $('#btn-hud-menu').addEventListener('click', () => { G.Audio.play('tap'); openSettingsModal(true); });
    $('#btn-hud-sound').addEventListener('click', () => {
      G.settings.sfx = !G.settings.sfx;
      G.settings.bgm = G.settings.sfx;
      G.Game.saveSettings();
      G.Audio.play('tap');
      renderHUD(G.Game.state);
    });
    $('#mini-wrap').addEventListener('click', () => { G.Audio.play('tap'); openMapModal(); });
    $('#log-preview').addEventListener('click', () => { G.Audio.play('tap'); openLogModal(); });

    // 8-way D-pad buttons
    document.querySelectorAll('#dpad-overlay [data-dir]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const [dx, dy] = btn.dataset.dir.split(',').map(Number);
        G.Game.stopAuto();
        if (dx === 0 && dy === 0) G.Game.waitTurn();
        else G.Game.stepPlayer(dx, dy);
      });
    });

    // Modal backdrop close (when dismissible)
    $('#modal-backdrop').addEventListener('click', (e) => {
      if (e.target === $('#modal-backdrop') && activeModal && activeModal.dismissible) {
        closeModal();
      }
    });
  }

  function bindKeyboard() {
    const MAP = {
      ArrowUp: [0, -1], w: [0, -1], k: [0, -1],
      ArrowDown: [0, 1], s: [0, 1], j: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0], h: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0], l: [1, 0],
      q: [-1, -1], y: [-1, -1], e: [1, -1], u: [1, -1],
      z: [-1, 1], b: [-1, 1], c: [1, 1], n: [1, 1],
    };
    window.addEventListener('keydown', (e) => {
      if (screen !== 'game' || activeModal) return;
      if (MAP[e.key]) {
        e.preventDefault();
        const [dx, dy] = MAP[e.key];
        G.Game.stopAuto();
        G.Game.stepPlayer(dx, dy);
      } else if (e.key === ' ' || e.key === '.') {
        e.preventDefault(); G.Game.waitTurn();
      } else if (e.key === 'x') {
        G.Game.autoExplore();
      } else if (e.key === 'i') {
        openBagModal();
      } else if (e.key === 'Enter' || e.key === '>') {
        G.Game.descendStairs();
      } else if (e.key >= '1' && e.key <= '6') {
        G.Game.selectOrCastSpell(Number(e.key) - 1);
      } else if (e.key === 'Escape' && G.Game.state && G.Game.state.targeting) {
        G.Game.state.targeting = null;
        renderHUD(G.Game.state);
      }
    });
  }

  function syncDpadVisibility() {
    $('#dpad-overlay').classList.toggle('show', !!G.settings.dpad);
    $('#act-dpad').classList.toggle('active', !!G.settings.dpad);
  }

  /* ---------- HUD Update ---------- */
  function onGameUpdate(st, event) {
    if (!st) return;
    renderHUD(st);
    if (event && event.type === 'end') {
      openEndModal(event);
      return;
    }
    if (!activeModal && st.modalQueue && st.modalQueue.length) {
      const m = st.modalQueue.shift();
      if (m.type === 'boon') openBoonModal(m.choices);
      else if (m.type === 'shrine') openShrineModal(m.obj);
      else if (m.type === 'merchant') openMerchantModal(m.obj);
      else if (m.type === 'replaceSpell') openReplaceSpellModal(m.spellId, m.itemIdx);
    }
  }

  function renderHUD(st) {
    if (!st) return;
    const pl = st.player;
    const biome = G.biomeFor(st.floor);

    $('#hud-floor').textContent = `B${st.floor}F`;
    $('#hud-biome').textContent = biome.name;
    $('#hud-gold').textContent = pl.gold;
    $('#hud-turn').textContent = `T${st.turn}`;
    $('#btn-hud-sound').textContent = G.settings.sfx ? '♪' : '✕';

    // Bars
    const hpPct = Math.max(0, Math.min(100, (pl.hp / pl.maxHp) * 100));
    const mpPct = Math.max(0, Math.min(100, (pl.mp / pl.maxMp) * 100));
    const xpPct = Math.max(0, Math.min(100, (pl.xp / pl.nextXp) * 100));
    $('#hp-fill').style.width = hpPct + '%';
    $('#hp-text').textContent = `${pl.hp}/${pl.maxHp}` + (pl.shield > 0 ? ` (+${pl.shield})` : '');
    $('#mp-fill').style.width = mpPct + '%';
    $('#mp-text').textContent = `${pl.mp}/${pl.maxMp}`;
    $('#xp-fill').style.width = xpPct + '%';
    $('#lvl-badge').textContent = `Lv.${pl.lvl}`;
    $('#stat-pow').textContent = pl.pow;
    $('#stat-def').textContent = pl.def;
    $('#bag-count').textContent = pl.items.length;

    // Status pills
    const pills = $('#status-pills');
    pills.innerHTML = '';
    if (pl.shield > 0) pills.appendChild(el('span', 'pill pill-shield', `障壁 ${pl.shield}`));
    if (pl.timestop > 0) pills.appendChild(el('span', 'pill pill-time', `時止 ${pl.timestop}`));
    if (pl.burn > 0) pills.appendChild(el('span', 'pill pill-burn', `燃焼 ${pl.burn}`));
    if (pl.poison > 0) pills.appendChild(el('span', 'pill pill-poison', `毒 ${pl.poison}`));
    if (pl.relics.length) pills.appendChild(el('span', 'pill pill-relic', `遺物 ${pl.relics.length}`));

    // Boss HP bar
    const boss = st.monsters.find((m) => m.boss && m.hp > 0 && !m.asleep);
    const bossBar = $('#boss-bar');
    if (boss) {
      bossBar.style.display = 'block';
      $('#boss-name').textContent = boss.name + (boss.phase2 ? '【激怒】' : '');
      $('#boss-hp-fill').style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
      $('#boss-hp-val').textContent = `${boss.hp}/${boss.maxHp}`;
    } else {
      bossBar.style.display = 'none';
    }

    // Stairs button
    const onStairs = st.level && st.level.tiles[pl.y * st.level.w + pl.x] === G.TILE.STAIRS;
    $('#btn-stairs').style.display = onStairs ? 'flex' : 'none';

    // Targeting banner
    const tBanner = $('#target-banner');
    if (st.targeting) {
      const S = G.SPELLS[st.targeting.spellId];
      tBanner.style.display = 'flex';
      $('#target-text').textContent = `「${S.name}」の標的をタップ` + (S.target === 'bolt' ? '（再度ボタンで自動照準）' : '');
    } else {
      tBanner.style.display = 'none';
    }

    // Log preview (last 2 lines)
    const lp = $('#log-preview');
    lp.innerHTML = '';
    for (const entry of st.log.slice(-2)) {
      lp.appendChild(el('div', `log-line ${entry.cls || ''}`, entry.text));
    }

    // Spell hotbar
    const bar = $('#spell-bar');
    bar.innerHTML = '';
    for (let i = 0; i < G.MAX_SPELLS; i++) {
      const sp = pl.spells[i];
      if (!sp) {
        const empty = el('div', 'spell-slot empty', '<span class="slot-num">' + (i + 1) + '</span>');
        bar.appendChild(empty);
        continue;
      }
      const def = G.SPELLS[sp.id];
      const cost = G.Game.actualSpellCost(sp.id, sp.lv);
      const can = G.Game.canAffordSpell(sp.id, sp.lv);
      const isTargeting = st.targeting && st.targeting.slotIdx === i;
      const btn = el('button', 'spell-slot' + (isTargeting ? ' targeting' : '') + (!can ? ' dim' : ''));
      btn.type = 'button';
      const stars = '★'.repeat(sp.lv + 1) + '☆'.repeat(2 - sp.lv);
      btn.innerHTML = `
        <span class="mp-badge">${cost}</span>
        <img src="${G.Spr.iconURL(sp.id)}" alt="" class="pixel-img">
        <span class="sp-name">${def.name}</span>
        <span class="sp-stars">${stars}</span>
      `;
      let pressTimer = null, longPressed = false;
      btn.addEventListener('pointerdown', () => {
        longPressed = false;
        pressTimer = setTimeout(() => {
          longPressed = true;
          openSpellInfoModal(sp);
        }, 420);
      });
      btn.addEventListener('pointerup', () => { clearTimeout(pressTimer); });
      btn.addEventListener('pointerleave', () => { clearTimeout(pressTimer); });
      btn.addEventListener('click', () => {
        if (!longPressed) G.Game.selectOrCastSpell(i);
      });
      bar.appendChild(btn);
    }

    syncDpadVisibility();
  }

  /* ---------- Modals ---------- */
  function openModal(title, bodyNode, opts = {}) {
    const back = $('#modal-backdrop');
    const card = $('#modal-card');
    $('#modal-title').textContent = title;
    const body = $('#modal-body');
    body.innerHTML = '';
    body.appendChild(bodyNode);
    const closeBtn = $('#modal-close');
    const dismissible = opts.dismissible !== false;
    closeBtn.style.display = dismissible ? 'flex' : 'none';
    closeBtn.onclick = closeModal;
    activeModal = { dismissible, onClose: opts.onClose };
    back.classList.add('open');
    card.scrollTop = 0;
  }

  function closeModal() {
    $('#modal-backdrop').classList.remove('open');
    const cb = activeModal && activeModal.onClose;
    activeModal = null;
    if (cb) cb();
    // Check queued modals
    const st = G.Game.state;
    if (st && !st.over && st.modalQueue && st.modalQueue.length) {
      onGameUpdate(st);
    }
  }

  /* Class Selection */
  function openClassModal() {
    const meta = G.Game.loadMeta();
    const wrap = el('div', 'class-list');
    for (const id of G.CLASS_ORDER) {
      const C = G.CLASSES[id];
      const unlocked = meta.unlocked.includes(id);
      const spImg = G.Spr.spriteURL(G.Spr.playerSprite(id), 4);
      const card = el('div', 'fantasy-card class-card' + (unlocked ? '' : ' locked'));
      const spellTags = C.spells.map((sid) => `<span class="tag">${G.SPELLS[sid].name}</span>`).join('');
      card.innerHTML = `
        <div class="cc-top">
          <img src="${spImg}" class="pixel-img cc-sprite" alt="">
          <div class="cc-info">
            <div class="cc-name">${C.name} <small>${C.en}</small></div>
            <div class="cc-stats">HP ${C.hp} / MP ${C.mp} / 魔力 ${C.pow} / 防御 ${C.def}</div>
            <div class="cc-tags">${spellTags}</div>
          </div>
        </div>
        <div class="cc-desc">${C.desc}</div>
        <div class="cc-passive">${C.passive}</div>
      `;
      const btn = el('button', 'btn ' + (unlocked ? 'btn-gold' : 'btn-outline'));
      if (unlocked) {
        btn.textContent = 'この術士で挑む';
        btn.onclick = () => {
          G.Audio.play('tap');
          closeModal();
          G.Game.startNewRun(id);
          showScreen('game');
        };
      } else {
        btn.innerHTML = `星屑 ${C.cost} で解放（所持: ${meta.dust}）`;
        btn.disabled = meta.dust < C.cost;
        btn.onclick = () => {
          const m = G.Game.loadMeta();
          if (m.dust >= C.cost && !m.unlocked.includes(id)) {
            m.dust -= C.cost;
            m.unlocked.push(id);
            G.Game.saveMeta(m);
            G.Audio.play('levelup');
            openClassModal();
            refreshTitle();
          }
        };
      }
      card.appendChild(btn);
      wrap.appendChild(card);
    }
    openModal('魔導士の選択', wrap);
  }

  /* Sanctuary (Meta Upgrades) */
  function openSanctuaryModal() {
    const meta = G.Game.loadMeta();
    const wrap = el('div', 'sanctuary-wrap');
    wrap.appendChild(el('div', 'dust-banner', `✦ 所持している星屑: <strong>${meta.dust}</strong>`));
    for (const id of Object.keys(G.META)) {
      const M = G.META[id];
      const lv = meta.upgrades[id] || 0;
      const maxed = lv >= M.max;
      const cost = maxed ? 0 : M.cost(lv);
      const row = el('div', 'fantasy-card meta-row');
      row.innerHTML = `
        <div class="meta-info">
          <div class="meta-name">${M.name} <span class="lv-tag">Lv.${lv}/${M.max}</span></div>
          <div class="meta-desc">${M.desc}</div>
        </div>
      `;
      const btn = el('button', 'btn ' + (maxed ? 'btn-disabled' : 'btn-gold'));
      btn.textContent = maxed ? '極み' : `✦ ${cost}`;
      btn.disabled = maxed || meta.dust < cost;
      btn.onclick = () => {
        const m = G.Game.loadMeta();
        const cur = m.upgrades[id] || 0;
        const c = M.cost(cur);
        if (cur < M.max && m.dust >= c) {
          m.dust -= c;
          m.upgrades[id] = cur + 1;
          G.Game.saveMeta(m);
          G.Audio.play('levelup');
          openSanctuaryModal();
          refreshTitle();
        }
      };
      row.appendChild(btn);
      wrap.appendChild(row);
    }
    openModal('星詠みの聖域（恒久強化）', wrap);
  }

  /* Boon Draft */
  function openBoonModal(choices) {
    const wrap = el('div', 'boon-list');
    wrap.appendChild(el('p', 'modal-lead', '星の祝福を1つ選んでください：'));
    for (const id of choices) {
      const B = G.BOONS[id];
      const card = el('button', 'fantasy-card boon-card');
      card.innerHTML = `
        <img src="${G.Spr.iconURL(B.icon)}" class="pixel-img boon-icon" alt="">
        <div class="boon-text">
          <div class="boon-name">${B.name}</div>
          <div class="boon-desc">${B.desc}</div>
        </div>
      `;
      card.onclick = () => {
        closeModal();
        G.Game.applyBoon(id);
      };
      wrap.appendChild(card);
    }
    openModal('レベルアップの祝福', wrap, { dismissible: false });
  }

  /* Bag Modal */
  function openBagModal() {
    const st = G.Game.state;
    if (!st) return;
    const pl = st.player;
    const wrap = el('div', 'bag-wrap');
    if (!pl.items.length) {
      wrap.appendChild(el('p', 'modal-lead', '持ち物は空だ。'));
    } else {
      pl.items.forEach((it, idx) => {
        const def = G.ITEMS[it.id];
        const desc = it.id === 'tome' && it.spell
          ? `【${G.SPELLS[it.spell].name}】の魔導書。${G.SPELLS[it.spell].desc(0, G.SPELLS[it.spell])}`
          : def.desc;
        const row = el('div', 'fantasy-card item-row');
        row.innerHTML = `
          <img src="${G.Spr.iconURL(def.icon)}" class="pixel-img item-icon" alt="">
          <div class="item-info">
            <div class="item-name">${def.name}${it.spell ? `〈${G.SPELLS[it.spell].name}〉` : ''}</div>
            <div class="item-desc">${desc}</div>
          </div>
        `;
        const btns = el('div', 'item-actions');
        const useBtn = el('button', 'btn btn-gold btn-sm', '使う');
        useBtn.onclick = () => {
          closeModal();
          G.Game.useItem(idx);
        };
        const dropBtn = el('button', 'btn btn-outline btn-sm', '捨てる');
        dropBtn.onclick = () => {
          pl.items.splice(idx, 1);
          G.Audio.play('tap');
          openBagModal();
          renderHUD(st);
        };
        btns.appendChild(useBtn);
        btns.appendChild(dropBtn);
        row.appendChild(btns);
        wrap.appendChild(row);
      });
    }
    openModal(`持ち物 (${pl.items.length}/${G.MAX_ITEMS})`, wrap);
  }

  /* Replace Spell Modal */
  function openReplaceSpellModal(newSpellId, itemIdx) {
    const st = G.Game.state;
    const S = G.SPELLS[newSpellId];
    const wrap = el('div', 'boon-list');
    wrap.appendChild(el('p', 'modal-lead', `呪文スロットが満杯です。「${S.name}」を覚えるには忘れる呪文を選んでください：`));
    st.player.spells.forEach((sp, i) => {
      const def = G.SPELLS[sp.id];
      const card = el('button', 'fantasy-card boon-card');
      card.innerHTML = `
        <img src="${G.Spr.iconURL(sp.id)}" class="pixel-img boon-icon" alt="">
        <div class="boon-text">
          <div class="boon-name">${def.name} (Lv.${sp.lv + 1})</div>
          <div class="boon-desc">${def.desc(sp.lv, def)}</div>
        </div>
      `;
      card.onclick = () => {
        closeModal();
        G.Game.replaceSpellSlot(i, newSpellId, itemIdx);
      };
      wrap.appendChild(card);
    });
    const cancel = el('button', 'btn btn-outline', '習得をやめる');
    cancel.onclick = closeModal;
    wrap.appendChild(cancel);
    openModal('呪文の入れ替え', wrap, { dismissible: false });
  }

  /* Shrine Modal */
  function openShrineModal(obj) {
    const st = G.Game.state;
    const wrap = el('div', 'boon-list');
    wrap.appendChild(el('p', 'modal-lead', `古代の祭壇が静かに輝いている。（所持金貨: ${st.player.gold}G）`));
    obj.offers.forEach((off, i) => {
      const def = G.SHRINES.find((s) => s.id === off.id);
      const card = el('button', 'fantasy-card boon-card');
      card.innerHTML = `
        <div class="boon-text">
          <div class="boon-name">${def.name}</div>
          <div class="boon-desc">${G.fmt(def.desc, { cost: off.cost })}</div>
        </div>
      `;
      card.onclick = () => {
        closeModal();
        G.Game.useShrine(obj, i);
      };
      wrap.appendChild(card);
    });
    openModal('星の祭壇', wrap);
  }

  /* Merchant Modal */
  function openMerchantModal(obj) {
    const st = G.Game.state;
    const wrap = el('div', 'bag-wrap');
    wrap.appendChild(el('div', 'dust-banner', `旅の行商人「いい品があるぞ」 — 所持金貨: <strong>${st.player.gold}G</strong>`));
    obj.stock.forEach((entry, i) => {
      if (entry.sold) return;
      const isRelic = !!entry.relic;
      const name = isRelic ? `【遺物】${G.RELICS[entry.relic].name}` : G.ITEMS[entry.item.id].name + (entry.item.spell ? `〈${G.SPELLS[entry.item.spell].name}〉` : '');
      const desc = isRelic ? G.RELICS[entry.relic].desc : (entry.item.spell ? G.SPELLS[entry.item.spell].desc(0, G.SPELLS[entry.item.spell]) : G.ITEMS[entry.item.id].desc);
      const iconKey = isRelic ? G.RELICS[entry.relic].icon : G.ITEMS[entry.item.id].icon;
      const row = el('div', 'fantasy-card item-row');
      row.innerHTML = `
        <img src="${G.Spr.iconURL(iconKey)}" class="pixel-img item-icon" alt="">
        <div class="item-info">
          <div class="item-name">${name}</div>
          <div class="item-desc">${desc}</div>
        </div>
      `;
      const btn = el('button', 'btn btn-gold btn-sm', `${entry.price}G`);
      btn.disabled = st.player.gold < entry.price;
      btn.onclick = () => {
        G.Game.buyFromMerchant(obj, i);
        openMerchantModal(obj);
      };
      row.appendChild(btn);
      wrap.appendChild(row);
    });
    openModal('旅の行商人', wrap);
  }

  /* Relics & Status Inspector */
  function openRelicsModal() {
    const st = G.Game.state;
    if (!st) return;
    const pl = st.player;
    const C = G.CLASSES[st.cls];
    const wrap = el('div', 'bag-wrap');
    wrap.appendChild(el('div', 'fantasy-card', `
      <div class="item-name">${C.name} Lv.${pl.lvl}</div>
      <div class="item-desc">${C.passive}</div>
      <div class="cc-stats" style="margin-top:6px">HP ${pl.hp}/${pl.maxHp} ・ MP ${pl.mp}/${pl.maxMp} ・ 魔力 ${pl.pow} ・ 防御 ${pl.def}</div>
    `));
    if (!pl.relics.length) {
      wrap.appendChild(el('p', 'modal-lead', 'まだ遺物を所持していない。宝箱やボスから手に入れよう。'));
    } else {
      for (const id of pl.relics) {
        const R = G.RELICS[id];
        const row = el('div', 'fantasy-card item-row');
        row.innerHTML = `
          <img src="${G.Spr.iconURL(R.icon)}" class="pixel-img item-icon" alt="">
          <div class="item-info">
            <div class="item-name">${R.name}</div>
            <div class="item-desc">${R.desc}</div>
          </div>
        `;
        wrap.appendChild(row);
      }
    }
    openModal('術士ステータス・遺物', wrap);
  }

  function openSpellInfoModal(sp) {
    const def = G.SPELLS[sp.id];
    const cost = G.Game.actualSpellCost(sp.id, sp.lv);
    const wrap = el('div', 'bag-wrap');
    wrap.appendChild(el('div', 'fantasy-card', `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${G.Spr.iconURL(sp.id)}" class="pixel-img item-icon" alt="">
        <div>
          <div class="item-name">${def.name} (Lv.${sp.lv + 1}/3)</div>
          <div class="cc-stats">属性: ${G.ELEM[def.elem].name} / 消費MP: ${cost}</div>
        </div>
      </div>
      <p style="margin-top:10px;line-height:1.5">${def.desc(sp.lv, def)}</p>
    `));
    openModal('呪文の詳細', wrap);
  }

  function openMonsterInfoModal(m) {
    const def = G.MONSTERS[m.type];
    const sp = G.Spr.s[m.sprite];
    const resList = [];
    if (def.resist) {
      for (const [k, v] of Object.entries(def.resist)) {
        const ename = (G.ELEM[k] && G.ELEM[k].name) || k;
        if (v === 0) resList.push(`${ename}:無効`);
        else if (v < 1) resList.push(`${ename}:耐性`);
        else if (v > 1) resList.push(`${ename}:弱点`);
      }
    }
    const wrap = el('div', 'bag-wrap');
    wrap.appendChild(el('div', 'fantasy-card', `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${G.Spr.spriteURL(sp, 4)}" class="pixel-img item-icon" alt="">
        <div>
          <div class="item-name">${m.name}${m.boss ? ' ★BOSS' : ''}</div>
          <div class="cc-stats">HP ${m.hp}/${m.maxHp} ・ 攻撃 ${m.atk[0]}-${m.atk[1]} ・ 防御 ${m.def}</div>
        </div>
      </div>
      <div class="item-desc" style="margin-top:8px">
        状態: ${m.asleep ? '睡眠中 ' : ''}${m.frozen > 0 ? '凍結 ' : ''}${m.burn > 0 ? '燃焼 ' : ''}${m.poison > 0 ? '毒 ' : ''}${(!m.asleep && !m.frozen && !m.burn && !m.poison) ? '通常' : ''}
        ${resList.length ? '<br>属性相性: ' + resList.join(' / ') : ''}
      </div>
    `));
    openModal('魔物の情報', wrap);
  }

  /* Expanded Map Modal */
  function openMapModal() {
    const st = G.Game.state;
    if (!st) return;
    const wrap = el('div', 'map-modal-wrap');
    const c = document.createElement('canvas');
    c.width = 280; c.height = 280;
    c.className = 'big-map';
    G.Render.drawMini(st, c.getContext('2d'), c);
    wrap.appendChild(c);
    wrap.appendChild(el('p', 'modal-lead', '水色:現在地 / 金:階段・宝箱 / 赤:敵 / 青:祭壇 / 緑:商人'));
    openModal(`B${st.floor}F 地図`, wrap);
  }

  /* Full Log Modal */
  function openLogModal() {
    const st = G.Game.state;
    if (!st) return;
    const wrap = el('div', 'full-log');
    for (const entry of st.log.slice().reverse()) {
      wrap.appendChild(el('div', `log-line ${entry.cls || ''}`, `[T${entry.turn}] ${entry.text}`));
    }
    openModal('冒険の記録', wrap);
  }

  /* Settings / Pause Modal */
  function openSettingsModal(inGame) {
    const wrap = el('div', 'bag-wrap');
    const mkToggle = (label, key) => {
      const row = el('div', 'fantasy-card setting-row');
      row.innerHTML = `<span>${label}</span>`;
      const btn = el('button', 'btn btn-sm ' + (G.settings[key] ? 'btn-gold' : 'btn-outline'), G.settings[key] ? 'ON' : 'OFF');
      btn.onclick = () => {
        G.settings[key] = !G.settings[key];
        G.Game.saveSettings();
        G.Audio.play('tap');
        btn.textContent = G.settings[key] ? 'ON' : 'OFF';
        btn.className = 'btn btn-sm ' + (G.settings[key] ? 'btn-gold' : 'btn-outline');
        if (inGame) renderHUD(G.Game.state);
      };
      row.appendChild(btn);
      return row;
    };
    wrap.appendChild(mkToggle('効果音 (SFX)', 'sfx'));
    wrap.appendChild(mkToggle('環境音楽 (BGM)', 'bgm'));
    wrap.appendChild(mkToggle('振動フィードバック', 'vibration'));
    wrap.appendChild(mkToggle('画面十字キー表示', 'dpad'));

    if (inGame) {
      const how = el('button', 'btn btn-outline', '遊び方・操作ガイド');
      how.onclick = openHelpModal;
      wrap.appendChild(how);

      const toTitle = el('button', 'btn btn-outline', '中断してタイトルへ戻る');
      toTitle.onclick = () => {
        G.Game.stopAuto();
        G.Audio.stopBgm();
        closeModal();
        showScreen('title');
      };
      wrap.appendChild(toTitle);
    }
    openModal(inGame ? 'メニュー・設定' : '設定', wrap);
  }

  function openHelpModal() {
    const wrap = el('div', 'bag-wrap');
    wrap.innerHTML = `
      <div class="fantasy-card"><div class="item-name">基本操作（スマホ）</div>
      <div class="item-desc">・マスをタップするとその場へ移動（または隣接敵へ通常攻撃）。<br>
      ・画面スワイプでも8方向に1歩ずつ移動できます。<br>
      ・呪文アイコンをタップで発動、長押しで詳細表示。<br>
      ・光る赤いマスはボスの予兆攻撃です。1ターン以内に避けましょう！</div></div>
      <div class="fantasy-card"><div class="item-name">階層と勝利条件</div>
      <div class="item-desc">・全12階層（4つのバイオーム）。3階ごとに強大なボスが待ち受けます。<br>
      ・倒れても「星屑」を持ち帰り、聖域で恒久強化や新職解放ができます。</div></div>
    `;
    openModal('操作ガイド', wrap);
  }

  /* Codex / Compendium */
  function openCodexModal() {
    const wrap = el('div', 'bag-wrap');
    const tabs = el('div', 'tab-row');
    const content = el('div', 'bag-wrap');
    const showTab = (t) => {
      content.innerHTML = '';
      if (t === 'spells') {
        for (const id of G.SPELL_POOL) {
          const S = G.SPELLS[id];
          content.appendChild(el('div', 'fantasy-card item-row', `
            <img src="${G.Spr.iconURL(id)}" class="pixel-img item-icon" alt="">
            <div class="item-info"><div class="item-name">${S.name} (${G.ELEM[S.elem].name} / MP${S.cost[0]})</div>
            <div class="item-desc">${S.desc(0, S)}</div></div>
          `));
        }
      } else if (t === 'relics') {
        for (const id of Object.keys(G.RELICS)) {
          const R = G.RELICS[id];
          content.appendChild(el('div', 'fantasy-card item-row', `
            <img src="${G.Spr.iconURL(R.icon)}" class="pixel-img item-icon" alt="">
            <div class="item-info"><div class="item-name">${R.name}</div>
            <div class="item-desc">${R.desc}</div></div>
          `));
        }
      } else {
        for (const id of Object.keys(G.MONSTERS)) {
          const M = G.MONSTERS[id];
          if (M.ally) continue;
          const sp = G.Spr.s[M.sprite];
          content.appendChild(el('div', 'fantasy-card item-row', `
            <img src="${G.Spr.spriteURL(sp, 3)}" class="pixel-img item-icon" alt="">
            <div class="item-info"><div class="item-name">${M.name}${M.boss ? ' ★BOSS' : ''}</div>
            <div class="item-desc">HP ${M.hp} / 攻撃 ${M.atk[0]}-${M.atk[1]} / 防御 ${M.def}</div></div>
          `));
        }
      }
    };
    [['spells', '呪文(13)'], ['relics', '遺物(18)'], ['monsters', '魔物']].forEach(([k, label], i) => {
      const b = el('button', 'btn btn-sm ' + (i === 0 ? 'btn-gold' : 'btn-outline'), label);
      b.onclick = () => {
        tabs.querySelectorAll('button').forEach((x) => x.className = 'btn btn-sm btn-outline');
        b.className = 'btn btn-sm btn-gold';
        showTab(k);
      };
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    wrap.appendChild(content);
    showTab('spells');
    openModal('魔導書・図鑑', wrap);
  }

  /* End Run Modal */
  function openEndModal(ev) {
    const st = G.Game.state;
    const wrap = el('div', 'bag-wrap end-wrap');
    wrap.innerHTML = `
      <div class="end-hero ${ev.victory ? 'win' : 'lose'}">
        <div class="end-title">${ev.victory ? '★ 迷宮制覇 ★' : '力尽きた…'}</div>
        <div class="end-sub">${ev.victory ? '星喰らいの魔王を討ち果たし、迷宮に光を取り戻した！' : `${ev.cause} の前に倒れた。`}</div>
      </div>
      <div class="fantasy-card end-stats">
        <div>到達階層: <strong>B${st.floor}F</strong></div>
        <div>職業 / Lv: <strong>${G.CLASSES[st.cls].name} Lv.${st.player.lvl}</strong></div>
        <div>討伐数: <strong>${st.kills} 体</strong></div>
        <div>獲得金貨: <strong>${st.goldEarned} G</strong></div>
        <div class="dust-gain">獲得した星屑: <strong>✦ +${ev.dust}</strong></div>
      </div>
    `;
    const again = el('button', 'btn btn-gold', 'もう一度挑む');
    again.onclick = () => { closeModal(); openClassModal(); };
    const title = el('button', 'btn btn-outline', 'タイトルへ戻る');
    title.onclick = () => { closeModal(); showScreen('title'); };
    wrap.appendChild(again);
    wrap.appendChild(title);
    openModal(ev.victory ? '勝利の記録' : '冒険の結果', wrap, { dismissible: false });
  }

  return { init, showScreen, openModal, closeModal };
})();
