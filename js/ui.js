'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  ui.js : 4-Tab Home Hub, Battle Cockpit, Touch Aiming,
 *          Orb Rack Merge, 3-Choice Draft, Gacha & Modals
 * ========================================================= */
G.UI = (function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };

  let currentScreen = 'hub';
  let currentTab = 'battle';
  let isAiming = false;
  let lastTime = performance.now();
  let toastTimer = null;
  let modalLocked = false;

  function showToast(msg) {
    const box = $('#toast-box');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2100);
  }

  function switchScreen(scr) {
    currentScreen = scr;
    clearTimeout(toastTimer);
    const box = $('#toast-box');
    if (box) box.classList.remove('show');
    $('#screen-hub').classList.toggle('active', scr === 'hub');
    $('#screen-battle').classList.toggle('active', scr === 'battle');
    if (scr === 'battle') {
      requestAnimationFrame(() => G.Render.resize());
    } else {
      renderHub();
    }
  }

  function switchTab(tabId) {
    currentTab = tabId;
    $$('.nav-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    $$('.tab-pane').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + tabId));
    renderHub();
  }

  /* =========================================================
   *  1. HOME HUB RENDERING (4 TABS)
   * ========================================================= */
  function renderHub() {
    const meta = G.Game.meta;
    if (!meta) return;

    // Top bar resources
    $('#hub-gold').textContent = G.fmtNum(meta.gold);
    $('#hub-gems').textContent = G.fmtNum(meta.gems);
    $('#btn-hub-sound').textContent = G.Audio.isEnabled() ? '♪' : '✕';

    // Tab 1: Battle Launch
    const hero = G.HEROES[meta.selectedHero] || G.HEROES.valen;
    const hLv = meta.heroLevels[hero.id] || 1;
    const stats = G.Game.calcTotalStats(hero.id);
    const elem = G.ELEMS[hero.elem] || G.ELEMS.star;

    $('#hub-hero-img').src = hero.portrait;
    $('#hub-hero-elem').textContent = `${elem.badge} ${elem.name}`;
    $('#hub-hero-title').textContent = hero.title;
    $('#hub-power-badge').textContent = `総戦力 ${G.fmtNum(stats.power)}`;
    $('#hub-hero-name').innerHTML = `${hero.name} <small>Lv.${hLv}</small>`;
    $('#hub-hero-quote').textContent = hero.quote;
    $('#hub-hero-ult').textContent = hero.ultName;

    // Chapter Card
    const chId = G.clamp(meta.selectedChapter || 1, 1, G.CHAPTERS.length);
    const ch = G.CHAPTERS.find((c) => c.id === chId) || G.CHAPTERS[0];
    const boss = G.BOSSES[ch.boss] || G.BOSSES.boneking;
    const cleared = !!meta.chaptersCleared[ch.id];
    const bestWave = meta.bestWaves[ch.id] || 0;

    $('#ch-status-badge').textContent = cleared ? '★ 制覇済み' : `推奨戦力 ${ch.recPower}`;
    $('#ch-title').textContent = ch.name;
    $('#ch-boss-img').src = boss.portrait;
    $('#ch-boss-name').textContent = boss.name;
    $('#ch-sub').textContent = ch.sub;
    $('#ch-waves').textContent = `全 ${ch.waves} WAVE`;
    $('#ch-best').textContent = `最高: WAVE ${bestWave}/${ch.waves}`;
    $('#ch-reward').textContent = cleared ? `周回報酬 🪙${ch.clearGold}` : `初回クリア 💎${ch.firstGems}`;

    // Patrol & Gacha previews
    const pat = G.Game.getPatrolRewardPreview();
    $('#patrol-preview').textContent = `🪙${pat.gold} / 💎${pat.gems} 受取可能`;
    const leftPity = Math.max(1, 10 - (meta.pity || 0));
    $('#gacha-pity-preview').textContent = `あと${leftPity}回でSSR/UR確定`;

    // Resume button
    const hasRun = G.Game.hasSavedRun();
    const resBtn = $('#btn-resume-run');
    resBtn.style.display = hasRun ? 'inline-flex' : 'none';
    if (hasRun) {
      $('#resume-sub').textContent = '前回のバトル進行状況から再開';
    }

    if (currentTab === 'heroes') renderHeroesAndGearTab();
    if (currentTab === 'summon') renderSummonAndTalentsTab();
    if (currentTab === 'codex') renderCodexAndMissionsTab();
  }

  function renderHeroesAndGearTab() {
    const meta = G.Game.meta;
    const list = $('#hero-list');
    list.innerHTML = '';

    for (const hId of G.HERO_ORDER) {
      const h = G.HEROES[hId];
      const unlocked = meta.unlockedHeroes.includes(hId);
      const selected = meta.selectedHero === hId;
      const lv = meta.heroLevels[hId] || 1;
      const upCost = Math.round(100 * Math.pow(1.42, lv - 1));
      const elem = G.ELEMS[h.elem] || G.ELEMS.star;

      const card = el('div', 'hero-card' + (selected ? ' selected' : ''));
      card.innerHTML = `
        <img class="hero-card-img" src="${h.portrait}" alt="${h.name}">
        <div class="hero-card-body">
          <div class="hero-card-title">
            <span>${h.name}</span>
            <small style="color:var(--gold)">${unlocked ? 'Lv.' + lv : '未解放'}</small>
            <small style="color:${elem.color}">${elem.badge}${elem.name}</small>
          </div>
          <div class="hero-card-sub"><strong>特性:</strong> ${h.passiveDesc}</div>
          <div class="hero-card-sub"><strong>奥義:</strong> ${h.ultName} — ${h.ultDesc}</div>
        </div>
      `;
      const acts = el('div', 'hero-card-actions');
      if (unlocked) {
        if (!selected) {
          const selBtn = el('button', 'btn btn-outline btn-sm', '出撃選択');
          selBtn.type = 'button';
          selBtn.onclick = () => G.Game.selectHero(hId);
          acts.appendChild(selBtn);
        } else {
          const badge = el('span', 'power-badge', '✦ 出撃中');
          badge.style.textAlign = 'center';
          acts.appendChild(badge);
        }
        const upBtn = el('button', 'btn btn-gold btn-sm', `強化 🪙${upCost}`);
        upBtn.type = 'button';
        upBtn.onclick = () => {
          const r = G.Game.unlockOrUpgradeHero(hId);
          showToast(r.msg);
        };
        acts.appendChild(upBtn);
      } else {
        const unBtn = el('button', 'btn btn-teal btn-sm', `解放 💎${h.unlockCost}`);
        unBtn.type = 'button';
        unBtn.onclick = () => {
          const r = G.Game.unlockOrUpgradeHero(hId);
          showToast(r.msg);
        };
        acts.appendChild(unBtn);
      }
      card.appendChild(acts);
      list.appendChild(card);
    }

    // Equipped 4 slots
    const slotsGrid = $('#gear-slots-grid');
    slotsGrid.innerHTML = '';
    for (const slot of Object.keys(G.GEAR_SLOTS)) {
      const slotDef = G.GEAR_SLOTS[slot];
      const item = G.Game.getGearItem(meta.equipped[slot]);
      const card = el('div', 'gear-slot-card');
      const iconUrl = G.Spr.dataURL('gear_' + slot);

      if (item) {
        const tpl = G.GEAR_TEMPLATES.find((t) => t.id === item.tplId) || { name: slotDef.name, perk: '' };
        const rar = G.RARITIES[item.rarity] || G.RARITIES[1];
        const val = G.Game.calcGearStat(item);
        const upCost = Math.round(60 * Math.pow(1.38, item.lv - 1));
        card.style.borderColor = rar.color;
        card.innerHTML = `
          <img class="gear-icon-img" src="${iconUrl}" alt="">
          <div class="gear-slot-info">
            <strong style="color:${rar.color}">[${rar.name}] ${tpl.name} +${item.lv}</strong>
            <small>${slotDef.name} (+${val}) / ${tpl.perk}</small>
          </div>
          <button type="button" class="btn btn-gold btn-sm">強化 🪙${upCost}</button>
        `;
        card.querySelector('button').onclick = () => {
          const r = G.Game.upgradeGear(item.uid);
          if (!r.ok && r.msg) showToast(r.msg);
          else showToast(`${tpl.name}を強化しました！`);
        };
      } else {
        card.innerHTML = `
          <img class="gear-icon-img" src="${iconUrl}" alt="" style="opacity:0.35">
          <div class="gear-slot-info">
            <strong>${slotDef.name}（未装着）</strong>
            <small>${slotDef.desc}</small>
          </div>
        `;
      }
      slotsGrid.appendChild(card);
    }

    // Gear Inventory
    const invList = $('#gear-inventory-list');
    invList.innerHTML = '';
    const sorted = meta.inventory.slice().sort((a, b) => b.rarity - a.rarity || b.lv - a.lv);
    for (const item of sorted) {
      const tpl = G.GEAR_TEMPLATES.find((t) => t.id === item.tplId) || { name: '星霊装備', perk: '' };
      const rar = G.RARITIES[item.rarity] || G.RARITIES[1];
      const isEq = meta.equipped[item.slot] === item.uid;
      const iconUrl = G.Spr.dataURL('gear_' + item.slot);

      const card = el('div', 'gear-slot-card');
      card.style.borderColor = isEq ? 'var(--gold)' : rar.color;
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <img class="gear-icon-img" src="${iconUrl}" alt="">
        <div class="gear-slot-info">
          <strong style="color:${rar.color}">[${rar.name}] ${tpl.name} Lv.${item.lv}</strong>
          <small>${tpl.perk} ${isEq ? '（✦装着中）' : '（タップで装着）'}</small>
        </div>
      `;
      card.onclick = () => {
        G.Game.equipGear(item.uid);
        showToast(`${tpl.name}を装着しました`);
      };
      invList.appendChild(card);
    }
  }

  function renderSummonAndTalentsTab() {
    const meta = G.Game.meta;
    const leftPity = Math.max(1, 10 - (meta.pity || 0));
    $('#gacha-pity-count').textContent = `あと ${leftPity} 回`;

    const grid = $('#talent-grid');
    grid.innerHTML = '';
    for (const t of G.TALENTS) {
      const lv = meta.talents[t.id] || 0;
      const cost = G.Game.getTalentCost(t.id);
      const isMax = lv >= t.maxLv;
      const card = el('div', 'talent-card');
      card.innerHTML = `
        <div>
          <div class="talent-head">
            <span>${t.name}</span>
            <span class="talent-lv">Lv.${lv}/${t.maxLv}</span>
          </div>
          <div class="talent-desc">${t.desc}</div>
        </div>
        <button type="button" class="btn ${isMax ? 'btn-outline' : 'btn-gold'} btn-sm" ${isMax ? 'disabled' : ''}>
          ${isMax ? 'MAX到達' : `強化 🪙${cost}`}
        </button>
      `;
      if (!isMax) {
        card.querySelector('button').onclick = () => {
          const r = G.Game.upgradeTalent(t.id);
          if (r.msg) showToast(r.msg);
        };
      }
      grid.appendChild(card);
    }
  }

  function renderCodexAndMissionsTab() {
    const meta = G.Game.meta;

    // Missions
    const mList = $('#mission-list');
    mList.innerHTML = '';
    for (const m of G.MISSIONS) {
      const cur = Math.min(m.goal, meta.stats[m.stat] || 0);
      const done = cur >= m.goal;
      const claimed = !!meta.claimedMissions[m.id];

      const card = el('div', 'hero-card');
      card.innerHTML = `
        <div class="hero-card-body">
          <div class="hero-card-title">
            <span>${m.name}</span>
            <small style="color:var(--cyan)">(${cur}/${m.goal})</small>
          </div>
          <div class="hero-card-sub">${m.desc}</div>
        </div>
      `;
      const btn = el(
        'button',
        `btn ${claimed ? 'btn-outline' : done ? 'btn-gold' : 'btn-outline'} btn-sm`,
        claimed ? '受取済' : `💎${m.gems} 受取`
      );
      btn.type = 'button';
      btn.disabled = claimed || !done;
      btn.onclick = () => {
        const r = G.Game.claimMission(m.id);
        if (r.ok) showToast(`実績報酬 💎${r.gems} を獲得しました！`);
      };
      card.appendChild(btn);
      mList.appendChild(card);
    }

    // ★EVO Recipes & Compendium
    const cList = $('#codex-evo-list');
    cList.innerHTML = '';
    for (const evoId of Object.keys(G.EVO_ORBS)) {
      const eo = G.EVO_ORBS[evoId];
      const baseOrb = G.ORBS[eo.baseId];
      const cat = G.CATALYSTS[eo.catalyst];
      const card = el('div', 'hero-card');
      card.style.borderColor = 'rgba(244, 197, 99, 0.35)';
      card.innerHTML = `
        <img class="gear-icon-img" src="${G.Spr.dataURL(eo.icon)}" alt="${eo.name}" style="width:52px;height:52px">
        <div class="hero-card-body">
          <div class="hero-card-title" style="color:var(--gold)">${eo.name}</div>
          <div class="hero-card-sub" style="color:var(--cyan)">
            <strong>覚醒条件:</strong> ★3 ${baseOrb.name} ＋ ${cat.name}
          </div>
          <div class="hero-card-sub">${eo.desc}</div>
        </div>
      `;
      cList.appendChild(card);
    }
  }

  /* =========================================================
   *  2. BATTLE HUD & ORB MERGE RACK RENDERING
   * ========================================================= */
  function renderBattleHUD(st) {
    if (!st) return;
    const hero = G.HEROES[st.heroId] || G.HEROES.valen;
    $('#b-hero-avatar').src = hero.portrait;
    $('#b-wave-badge').textContent = `WAVE ${st.wave}/${st.maxWaves}`;
    $('#b-gold-text').textContent = `🪙 ${G.fmtNum(st.runGold)}`;
    $('#b-chapter-name').textContent = st.chapterName;

    // Combo Banner
    const comboStep = (st.perks.combo_amp ? 0.016 : 0.01) * st.comboBonus;
    const mult = (1 + Math.min(2.5, st.combo * comboStep)).toFixed(2);
    $('#combo-count').textContent = `${st.combo} HIT`;
    $('#combo-mult').textContent = `ATK ×${mult}`;

    // Controls
    $('#btn-speed').textContent = `${st.speed || 1}x`;
    $('#btn-speed').classList.toggle('active', (st.speed || 1) > 1);
    $('#btn-auto').classList.toggle('active', !!st.autoAim);

    // Aim hint & Recall button
    $('#aim-hint').style.display = st.phase === 'AIM' ? 'block' : 'none';
    $('#btn-recall').style.display = st.phase === 'SHOOT' && st.flightTime >= 2.8 ? 'block' : 'none';

    // Boss HP Bar
    const boss = st.enemies.find((m) => m.isBoss && m.hp > 0);
    const bossBar = $('#boss-hud-bar');
    if (boss) {
      bossBar.style.display = 'flex';
      $('#boss-hud-img').src = boss.portrait;
      $('#boss-hud-name').textContent = boss.name;
      $('#boss-hud-hp').textContent = `${G.fmtNum(boss.hp + boss.shield)} / ${G.fmtNum(boss.maxHp)}`;
      $('#boss-hp-fill').style.width = `${G.clamp((boss.hp / boss.maxHp) * 100, 0, 100)}%`;
    } else {
      bossBar.style.display = 'none';
    }

    // Player HP / Shield / EXP Bars
    const hpPct = G.clamp((st.hp / st.maxHp) * 100, 0, 100);
    const shPct = G.clamp((st.shield / st.maxHp) * 100, 0, 100);
    const xpPct = G.clamp((st.xp / Math.max(1, st.xpNext)) * 100, 0, 100);
    $('#b-hp-fill').style.width = `${hpPct}%`;
    $('#b-shield-fill').style.width = `${shPct}%`;
    $('#b-hp-text').textContent = st.shield > 0
      ? `${st.hp} (+${st.shield}) / ${st.maxHp}`
      : `${st.hp} / ${st.maxHp}`;
    $('#b-xp-fill').style.width = `${xpPct}%`;
    $('#b-lv-text').textContent = `Lv.${st.lv}`;

    const totalBalls = st.baseOrbs + st.rack.filter(Boolean).length + (st.catalysts.includes('cat_star') ? 3 : 0);
    $('#b-balls-total').textContent = `装填 ${totalBalls}発`;

    // 6-Slot Orb Rack & Merge indicator
    const pairs = G.Game.findMergePairs();
    const mergeIndices = new Set();
    pairs.forEach(([a, b]) => { mergeIndices.add(a); mergeIndices.add(b); });

    const mergeBtn = $('#btn-rack-merge');
    mergeBtn.style.display = pairs.length > 0 && st.phase === 'AIM' ? 'inline-block' : 'none';

    const rackEl = $('#orb-rack');
    rackEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const slot = st.rack[i];
      const cell = el('div', 'rack-slot');
      if (st.selectedRackSlot === i) cell.classList.add('selected');
      if (mergeIndices.has(i)) cell.classList.add('merge-ready');
      if (slot && slot.isEvo) cell.classList.add('evo-slot');

      if (slot) {
        const def = slot.isEvo ? G.EVO_ORBS[slot.id] : G.ORBS[slot.id];
        const iconKey = def ? def.icon : 'orb_normal';
        const badgeText = slot.isEvo ? '★EVO' : `★${slot.star}`;
        cell.innerHTML = `
          <img src="${G.Spr.dataURL(iconKey)}" alt="">
          <span class="rack-star-badge">${badgeText}</span>
        `;
      }
      cell.onclick = () => onRackSlotClick(i);
      rackEl.appendChild(cell);
    }

    // Ultimate Button
    const ultPct = Math.min(100, Math.floor((st.ultCharge / st.ultMax) * 100));
    const ultBtn = $('#btn-ult');
    $('#ult-btn-img').src = hero.portrait;
    $('#ult-pct-badge').textContent = ultPct >= 100 ? 'READY!' : `${ultPct}%`;
    ultBtn.classList.toggle('ready', ultPct >= 100);
  }

  function onRackSlotClick(idx) {
    const st = G.Game.state;
    if (!st || st.phase !== 'AIM') return;
    const clicked = st.rack[idx];

    if (st.selectedRackSlot !== null && st.selectedRackSlot !== idx) {
      const prevIdx = st.selectedRackSlot;
      const prev = st.rack[prevIdx];
      if (prev && clicked && !prev.isEvo && !clicked.isEvo && prev.id === clicked.id && prev.star === clicked.star && prev.star < 3) {
        const res = G.Game.mergeRackSlots(prevIdx, idx);
        if (res.ok) {
          const def = G.ORBS[prev.id];
          showToast(res.evoTriggered ? '★神話覚醒（EVO）達成！' : `★${prev.star} ${def.name} に合成進化！`);
        }
        return;
      }
      // Or swap slot positions so player can customize firing order!
      st.rack[prevIdx] = clicked;
      st.rack[idx] = prev;
      st.selectedRackSlot = null;
      G.Audio.play('tap');
      renderBattleHUD(st);
      return;
    }

    if (!clicked) {
      st.selectedRackSlot = null;
      renderBattleHUD(st);
      return;
    }

    st.selectedRackSlot = st.selectedRackSlot === idx ? null : idx;
    const def = clicked.isEvo ? G.EVO_ORBS[clicked.id] : G.ORBS[clicked.id];
    if (def) {
      const desc = typeof def.desc === 'function' ? def.desc(clicked.star) : def.desc;
      showToast(`${clicked.isEvo ? '' : '★' + clicked.star + ' '}${def.name}: ${desc}`);
    }
    G.Audio.play('tap');
    renderBattleHUD(st);
  }

  function triggerUltCutIn(hero) {
    const box = $('#ult-cutin');
    if (!box) return;
    $('#ult-cutin-img').src = hero.portrait;
    $('#ult-cutin-hero').textContent = `${hero.name} 奥義発動！`;
    $('#ult-cutin-name').textContent = hero.ultName;
    box.style.display = 'flex';
    setTimeout(() => {
      box.style.display = 'none';
    }, 1350);
  }

  /* =========================================================
   *  3. MODALS: 3-CHOICE DRAFT, ENCOUNTERS, GACHA, RESULTS
   * ========================================================= */
  function openModal(title, htmlBuilder, lockClose = false) {
    modalLocked = lockClose;
    $('#modal-title').textContent = title;
    $('#modal-close').style.display = lockClose ? 'none' : 'inline-flex';
    const body = $('#modal-body');
    body.innerHTML = '';
    body.scrollTop = 0;
    htmlBuilder(body);
    $('#modal-backdrop').classList.add('active');
  }

  function closeModal() {
    modalLocked = false;
    $('#modal-backdrop').classList.remove('active');
  }

  function openDraftModal(choices) {
    const st = G.Game.state;
    openModal(`✦ LEVEL UP! 星霊スキル選択 (Lv.${st.lv})`, (body) => {
      const sub = el('p', '', '3つの祝福から1つを選択（同種星霊弾は自動合成、★3＋触媒で神話覚醒！）');
      sub.style.fontSize = '12px';
      sub.style.color = 'var(--text-sub)';
      body.appendChild(sub);

      for (const ch of choices) {
        const card = el('button', `draft-card ${ch.rarity || ''}`);
        card.type = 'button';
        card.innerHTML = `
          <img class="draft-icon" src="${G.Spr.dataURL(ch.icon)}" alt="">
          <div class="draft-info">
            <span class="draft-badge">${ch.badge}</span>
            <div class="draft-name">${ch.name}</div>
            <div class="draft-desc">${ch.desc}</div>
          </div>
        `;
        card.onclick = () => {
          closeModal();
          G.Game.applyDraftChoice(ch);
        };
        body.appendChild(card);
      }

      if (st.rerolls > 0) {
        const rerollBtn = el('button', 'btn btn-outline btn-block', `🎲 選択肢を再抽選する（残り ${st.rerolls} 回）`);
        rerollBtn.type = 'button';
        rerollBtn.onclick = () => {
          st.rerolls--;
          G.Audio.play('tap');
          openDraftModal(G.Game.rollDraftChoices());
        };
        body.appendChild(rerollBtn);
      }
    }, true);
  }

  function openEncounterModal(kind) {
    const st = G.Game.state;
    if (!st) return;

    if (kind === 'merchant') {
      openModal('🦊 星霊商会の旅商人', (body) => {
        const banner = el('img', 'modal-scene-banner');
        banner.src = './assets/portraits/scene_merchant.webp';
        banner.alt = '旅商人';
        body.appendChild(banner);

        const pickOrbId = st.rng.pick(G.ORB_IDS);
        const orbDef = G.ORBS[pickOrbId];
        const options = [
          {
            name: `★2 ${orbDef.name} を購入`,
            desc: '即座に★2強化済みの星霊弾をラックへ装填・合成する',
            cost: 40,
            icon: orbDef.icon,
            action: () => G.Game.addOrbToRack(pickOrbId, 2),
          },
          {
            name: '星女神の霊薬（HP全回復＋バリア）',
            desc: 'HPを100%回復し、最大HP25%分のシールドを展開する',
            cost: 30,
            icon: 'heal_gem',
            action: () => {
              st.hp = st.maxHp;
              st.shield += Math.round(st.maxHp * 0.25);
            },
          },
          {
            name: '星霊の秘伝訓練（攻撃力+20%＆弾数+2）',
            desc: 'この作戦中の基礎攻撃力+20%、通常弾数+2発',
            cost: 45,
            icon: 'multiball',
            action: () => {
              st.atk = Math.round(st.atk * 1.2);
              st.baseOrbs += 2;
            },
          },
        ];

        for (const opt of options) {
          const canBuy = st.runGold >= opt.cost;
          const card = el('button', 'draft-card');
          card.type = 'button';
          card.innerHTML = `
            <img class="draft-icon" src="${G.Spr.dataURL(opt.icon)}" alt="">
            <div class="draft-info">
              <span class="draft-badge">所持金貨 🪙${st.runGold}</span>
              <div class="draft-name">${opt.name}（🪙${opt.cost}）</div>
              <div class="draft-desc">${opt.desc}</div>
            </div>
          `;
          card.onclick = () => {
            if (st.runGold < opt.cost) {
              showToast('作戦中の金貨が足りません');
              return;
            }
            st.runGold -= opt.cost;
            opt.action();
            G.Game.autoMergeRack();
            G.Audio.play('coin');
            closeModal();
            renderBattleHUD(st);
          };
          body.appendChild(card);
        }

        const skipBtn = el('button', 'btn btn-teal btn-block', '見送って次のWAVEへ進む（＋🪙25 獲得）');
        skipBtn.type = 'button';
        skipBtn.onclick = () => {
          st.runGold += 25;
          G.Audio.play('coin');
          closeModal();
          renderBattleHUD(st);
        };
        body.appendChild(skipBtn);
      }, true);
    } else {
      // Shrine / Blessing of Lunaria or Blacksmith
      openModal('❄️ 氷晶の巫女ルナリアの祝福祭壇', (body) => {
        const banner = el('img', 'modal-scene-banner');
        banner.src = './assets/portraits/class_cryo.webp';
        banner.alt = '氷晶の巫女';
        body.appendChild(banner);

        const options = [
          {
            badge: '★星鉄鍛冶の秘術',
            name: '装填ラック内の星霊弾を1段階ランクアップ！',
            desc: '先頭の星霊弾の★ランクを+1上昇（★3到達時に触媒があれば★EVO覚醒！）',
            icon: 'orb_holy',
            fn: () => {
              const slot = st.rack.find((s) => s && !s.isEvo && s.star < 3);
              if (slot) {
                slot.star += 1;
                G.Game.checkAutoEvoInRack();
              } else {
                st.atk = Math.round(st.atk * 1.25);
              }
              G.Audio.play('evo');
            },
          },
          {
            badge: '✦ 星脈の奔流',
            name: '奥義ゲージ100%満タン＋通常弾+3発',
            desc: '即座に奥義が発動可能になり、一斉発射数が3発増える',
            icon: 'ult_overdrive',
            fn: () => {
              st.ultCharge = st.ultMax;
              st.baseOrbs += 3;
              G.Audio.play('levelup');
            },
          },
        ];

        for (const opt of options) {
          const card = el('button', 'draft-card epic');
          card.type = 'button';
          card.innerHTML = `
            <img class="draft-icon" src="${G.Spr.dataURL(opt.icon)}" alt="">
            <div class="draft-info">
              <span class="draft-badge">${opt.badge}</span>
              <div class="draft-name">${opt.name}</div>
              <div class="draft-desc">${opt.desc}</div>
            </div>
          `;
          card.onclick = () => {
            opt.fn();
            closeModal();
            renderBattleHUD(st);
          };
          body.appendChild(card);
        }
      }, true);
    }
  }

  function openGachaResultsModal(items) {
    openModal(`✨ 星霊遺物召喚 結果（${items.length}連）`, (body) => {
      const grid = el('div', 'gacha-results-grid');
      for (const it of items) {
        const tpl = G.GEAR_TEMPLATES.find((t) => t.id === it.tplId) || { name: '星霊装備', perk: '' };
        const rar = G.RARITIES[it.rarity] || G.RARITIES[1];
        const cell = el('div', 'gacha-result-item');
        cell.style.borderColor = rar.color;
        cell.innerHTML = `
          <img class="gear-icon-img" src="${G.Spr.dataURL('gear_' + it.slot)}" alt="">
          <div class="gear-slot-info">
            <strong style="color:${rar.color}">[${rar.name}] ${tpl.name}</strong>
            <small>${tpl.perk}</small>
          </div>
        `;
        grid.appendChild(cell);
      }
      body.appendChild(grid);

      const closeBtn = el('button', 'btn btn-gold btn-block', '確認して閉じる');
      closeBtn.type = 'button';
      closeBtn.onclick = () => {
        closeModal();
        renderHub();
      };
      body.appendChild(closeBtn);
    });
  }

  function openBattleEndModal(ev) {
    const st = G.Game.state;
    const hero = G.HEROES[st.heroId] || G.HEROES.valen;
    const title = ev.victory ? '★ CHAPTER CLEAR — 作戦完全制覇！ ★' : '作戦終了 — 戦果報告';
    openModal(title, (body) => {
      const banner = el('img', 'modal-scene-banner');
      banner.src = hero.portrait;
      banner.alt = hero.name;
      body.appendChild(banner);

      const box = el('div', 'chapter-card');
      box.innerHTML = `
        <h3 style="color:${ev.victory ? 'var(--gold)' : 'var(--cyan)'};text-align:center;font-size:17px">
          ${ev.victory ? `${st.chapterName} を完全制覇！` : `到達: WAVE ${st.wave}/${st.maxWaves}`}
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
          <div class="res-pill"><span>獲得金貨:</span> <strong style="color:var(--gold)">+🪙${G.fmtNum(ev.gold)}</strong></div>
          <div class="res-pill"><span>獲得星晶石:</span> <strong style="color:var(--cyan)">+💎${G.fmtNum(ev.gems)}</strong></div>
          <div class="res-pill"><span>最大コンボ:</span> <strong>${st.maxRunCombo} HIT</strong></div>
          <div class="res-pill"><span>撃破魔物数:</span> <strong>${st.kills} 体</strong></div>
        </div>
      `;
      body.appendChild(box);

      if (ev.victory && st.chapterId < G.CHAPTERS.length) {
        const nextBtn = el('button', 'btn btn-gold btn-block', `✦ 次の章（第${st.chapterId + 1}章）へ進む`);
        nextBtn.type = 'button';
        nextBtn.onclick = () => {
          closeModal();
          G.Game.meta.selectedChapter = st.chapterId + 1;
          G.Game.saveMeta();
          switchScreen('hub');
        };
        body.appendChild(nextBtn);
      }

      const retryBtn = el('button', 'btn btn-teal btn-block', '🔄 もう一度この章に出撃する');
      retryBtn.type = 'button';
      retryBtn.onclick = () => {
        closeModal();
        G.Game.startBattle(st.chapterId);
      };
      body.appendChild(retryBtn);

      const hubBtn = el('button', 'btn btn-outline btn-block', '🏠 ホーム画面へ戻って強化・ガチャ');
      hubBtn.type = 'button';
      hubBtn.onclick = () => {
        closeModal();
        switchScreen('hub');
      };
      body.appendChild(hubBtn);
    }, true);
  }

  function openPauseModal() {
    const st = G.Game.state;
    if (!st) return;
    openModal('⏸ 作戦一時停止メニュー', (body) => {
      const info = el('p', '', `${st.chapterName} — WAVE ${st.wave}/${st.maxWaves}`);
      info.style.color = 'var(--text-sub)';
      body.appendChild(info);

      const resumeBtn = el('button', 'btn btn-gold btn-block', '▶ バトルに戻る');
      resumeBtn.type = 'button';
      resumeBtn.onclick = () => closeModal();
      body.appendChild(resumeBtn);

      const saveHubBtn = el('button', 'btn btn-teal btn-block', '🏠 中断セーブしてホームへ戻る');
      saveHubBtn.type = 'button';
      saveHubBtn.onclick = () => {
        closeModal();
        switchScreen('hub');
      };
      body.appendChild(saveHubBtn);

      const retireBtn = el('button', 'btn btn-outline btn-block', '🏳️ 戦果を受け取って撤退する');
      retireBtn.type = 'button';
      retireBtn.onclick = () => {
        closeModal();
        G.Game.finishBattle(false);
      };
      body.appendChild(retireBtn);
    });
  }

  /* =========================================================
   *  4. INPUT BINDINGS (TOUCH AIMING, BUTTONS, KEYBOARD)
   * ========================================================= */
  function bindEvents() {
    // Unlock audio on first pointer or key interaction
    const unlock = () => G.Audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    window.addEventListener('resize', () => G.Render.resize());

    // Bottom Navigation Tabs
    $$('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        G.Audio.play('tap');
        switchTab(btn.dataset.tab);
      });
    });

    // Sound toggle
    $('#btn-hub-sound').addEventListener('click', () => {
      const on = G.Audio.toggle();
      $('#btn-hub-sound').textContent = on ? '♪' : '✕';
      showToast(on ? 'サウンド ON' : 'サウンド OFF');
    });

    // Chapter Carousel
    $('#btn-prev-chapter').addEventListener('click', () => {
      const m = G.Game.meta;
      m.selectedChapter = m.selectedChapter > 1 ? m.selectedChapter - 1 : G.CHAPTERS.length;
      G.Audio.play('tap');
      G.Game.saveMeta();
      renderHub();
    });
    $('#btn-next-chapter').addEventListener('click', () => {
      const m = G.Game.meta;
      m.selectedChapter = m.selectedChapter < G.CHAPTERS.length ? m.selectedChapter + 1 : 1;
      G.Audio.play('tap');
      G.Game.saveMeta();
      renderHub();
    });

    // Patrol Claim & Quick Gacha
    $('#btn-patrol').addEventListener('click', () => {
      const rw = G.Game.claimPatrol();
      showToast(`巡回報酬 🪙${rw.gold} / 💎${rw.gems} を獲得！`);
    });
    $('#btn-quick-gacha').addEventListener('click', () => {
      G.Audio.play('tap');
      switchTab('summon');
    });

    // Gear 3-to-1 Merge
    $('#btn-merge-gear').addEventListener('click', () => {
      const n = G.Game.mergeAllGear();
      if (n > 0) showToast(`${n}件の装備を上位レアリティへ合成進化しました！`);
      else showToast('同一種類・同一レアリティの装備が3つ揃うと合成できます');
    });

    // Gacha Summon Buttons
    $('#btn-summon-1').addEventListener('click', () => {
      const r = G.Game.summonGacha(1);
      if (!r.ok) showToast(r.msg);
      else openGachaResultsModal(r.items);
    });
    $('#btn-summon-10').addEventListener('click', () => {
      const r = G.Game.summonGacha(10);
      if (!r.ok) showToast(r.msg);
      else openGachaResultsModal(r.items);
    });

    // Start & Resume Battle
    $('#btn-start-battle').addEventListener('click', () => {
      G.Audio.play('tap');
      G.Game.startBattle(G.Game.meta.selectedChapter || 1);
    });
    $('#btn-resume-run').addEventListener('click', () => {
      G.Audio.play('tap');
      G.Game.resumeRun();
    });

    // Battle Controls
    $('#btn-speed').addEventListener('click', () => {
      const st = G.Game.state;
      if (!st) return;
      st.speed = st.speed === 1 ? 2 : st.speed === 2 ? 3 : 1;
      G.Audio.play('tap');
      renderBattleHUD(st);
    });
    $('#btn-auto').addEventListener('click', () => {
      const st = G.Game.state;
      if (!st) return;
      st.autoAim = !st.autoAim;
      G.Audio.play('tap');
      showToast(st.autoAim ? 'AUTO照準・自動発射 ON' : 'AUTO照準 OFF');
      renderBattleHUD(st);
    });
    $('#btn-pause').addEventListener('click', () => {
      G.Audio.play('tap');
      openPauseModal();
    });
    $('#btn-recall').addEventListener('click', () => {
      G.Audio.play('tap');
      G.Game.recallOrbs();
    });
    $('#btn-rack-merge').addEventListener('click', () => {
      const c = G.Game.autoMergeRack();
      if (c > 0) showToast(`${c}組の星霊弾を一括合成しました！`);
    });
    $('#btn-ult').addEventListener('click', () => {
      const st = G.Game.state;
      if (!st) return;
      if (st.ultCharge < st.ultMax) {
        showToast('奥義ゲージが100%になると発動できます');
        return;
      }
      G.Game.useUltimate();
    });

    // Modal close
    $('#modal-close').addEventListener('click', () => {
      if (!modalLocked) closeModal();
    });

    // 1-Thumb Drag-and-Release Aiming on Battle Canvas
    const wrap = $('#arena-wrap');
    const updateAimFromPointer = (e) => {
      const st = G.Game.state;
      if (!st || st.phase !== 'AIM' || st.over) return;
      const [gx, gy] = G.Render.screenToGrid(e.clientX, e.clientY);
      const dx = gx - st.launchX;
      const dy = gy - st.launchY;
      // Allow both direct drag-toward-target AND pull-back slingshot aiming
      let ang = Math.atan2(dy, dx);
      if (dy > 0.15) {
        ang = Math.atan2(-dy, -dx);
      }
      st.aimAngle = G.clamp(ang, -Math.PI + 0.18, -0.18);
    };

    wrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const st = G.Game.state;
      if (!st || st.phase !== 'AIM' || st.over) return;
      isAiming = true;
      updateAimFromPointer(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (!isAiming) return;
      updateAimFromPointer(e);
    });
    window.addEventListener('pointerup', () => {
      if (!isAiming) return;
      isAiming = false;
      const st = G.Game.state;
      if (st && st.phase === 'AIM' && !st.over) {
        G.Game.fireVolley(st.aimAngle);
      }
    });

    // Keyboard accessibility (Left/Right to aim, Space/Enter to fire, U for Ultimate, M to auto-merge)
    window.addEventListener('keydown', (e) => {
      if (currentScreen !== 'battle' || $('#modal-backdrop').classList.contains('active')) return;
      const st = G.Game.state;
      if (!st || st.over) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        st.aimAngle = G.clamp(st.aimAngle - 0.08, -Math.PI + 0.18, -0.18);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        st.aimAngle = G.clamp(st.aimAngle + 0.08, -Math.PI + 0.18, -0.18);
      } else if ((e.key === ' ' || e.key === 'Enter') && st.phase === 'AIM') {
        e.preventDefault();
        G.Game.fireVolley(st.aimAngle);
      } else if (e.key === 'u' || e.key === 'U') {
        G.Game.useUltimate();
      } else if (e.key === 'm' || e.key === 'M') {
        G.Game.autoMergeRack();
      }
    });
  }

  /* =========================================================
   *  5. MAIN 60FPS ANIMATION LOOP & GAME EVENT DISPATCHER
   * ========================================================= */
  function onGameEvent(st, meta, ev) {
    if (ev && ev.type === 'battleStart') {
      switchScreen('battle');
      renderBattleHUD(st);
      return;
    }
    if (ev && ev.type === 'ultCast') {
      triggerUltCutIn(ev.hero);
    }
    if (ev && ev.type === 'openDraft') {
      renderBattleHUD(st);
      openDraftModal(ev.choices);
      return;
    }
    if (ev && ev.type === 'openEncounter') {
      renderBattleHUD(st);
      openEncounterModal(ev.kind);
      return;
    }
    if (ev && ev.type === 'battleEnd') {
      renderBattleHUD(st);
      openBattleEndModal(ev);
      return;
    }

    if (currentScreen === 'battle' && st) {
      renderBattleHUD(st);
    } else {
      renderHub();
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (currentScreen === 'battle' && G.Game.state) {
      const prevCombo = G.Game.state.combo;
      const prevFlight = Math.floor(G.Game.state.flightTime);
      G.Game.update(dt);
      G.FX.update(dt);
      G.Render.drawFrame(G.Game.state, dt);

      if (G.Game.state.combo !== prevCombo || Math.floor(G.Game.state.flightTime) !== prevFlight) {
        renderBattleHUD(G.Game.state);
      }
    }
    requestAnimationFrame(loop);
  }

  function init() {
    G.Spr.init();
    G.Game.loadMeta();
    G.Render.init($('#battle-canvas'));
    G.Game.onUI(onGameEvent);
    bindEvents();
    renderHub();
    requestAnimationFrame(loop);
  }

  return { init, switchScreen, switchTab, showToast };
})();
