'use strict';
/* =========================================================
 *  game.js : core turn-based roguelike engine, combat,
 *            13 spells, 4 bosses, AI, items, relics, saves
 * ========================================================= */
G.Game = (function () {
  const T = G.TILE;
  const META_KEY = 'arcana_meta_v1';
  const RUN_KEY = 'arcana_run_v1';
  const SET_KEY = 'arcana_settings_v1';

  let state = null;
  let autoTimer = null;
  let uiHook = null;

  /* ---------- persistent settings & meta ---------- */
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SET_KEY) || 'null');
      G.settings = Object.assign({ sfx: true, bgm: true, vibration: true, dpad: false, vol: 0.7 }, s || {});
    } catch (e) {
      G.settings = { sfx: true, bgm: true, vibration: true, dpad: false, vol: 0.7 };
    }
  }
  function saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(G.settings)); } catch (e) {}
    G.Audio.syncVol();
  }

  function defaultMeta() {
    return {
      dust: 0,
      unlocked: ['astro'],
      upgrades: { vitality: 0, wisdom: 0, potion: 0, fortune: 0, insight: 0, heirloom: 0 },
      stats: { runs: 0, wins: 0, bestFloor: 1, kills: 0 },
    };
  }
  function loadMeta() {
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) || 'null');
      const d = defaultMeta();
      if (!m) return d;
      return {
        dust: m.dust || 0,
        unlocked: Array.isArray(m.unlocked) ? Array.from(new Set(['astro', ...m.unlocked])) : ['astro'],
        upgrades: Object.assign(d.upgrades, m.upgrades || {}),
        stats: Object.assign(d.stats, m.stats || {}),
      };
    } catch (e) { return defaultMeta(); }
  }
  function saveMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }

  /* ---------- run save / load ---------- */
  function saveRun() {
    if (!state || state.over) { clearRunSave(); return; }
    try {
      const dump = {
        seed: state.seed,
        rngState: state.rng.s,
        floor: state.floor,
        turn: state.turn,
        kills: state.kills,
        goldEarned: state.goldEarned,
        cls: state.cls,
        player: state.player,
        level: {
          w: state.level.w, h: state.level.h,
          tiles: state.level.tiles, deco: state.level.deco,
          start: state.level.start, stairs: state.level.stairs, bossStairs: state.level.bossStairs,
          objects: state.level.objects, items: state.level.items,
          lights: state.level.lights, arena: state.level.arena,
          biome: state.level.biome, floor: state.level.floor,
        },
        exp: Array.from(state.exp),
        monsters: state.monsters,
        clouds: state.clouds,
        telegraphs: state.telegraphs,
        log: state.log.slice(-40),
      };
      localStorage.setItem(RUN_KEY, JSON.stringify(dump));
    } catch (e) { /* ignore quota */ }
  }

  function hasSavedRun() {
    try { return !!localStorage.getItem(RUN_KEY); } catch (e) { return false; }
  }
  function clearRunSave() {
    try { localStorage.removeItem(RUN_KEY); } catch (e) {}
  }

  function resumeRun() {
    try {
      const d = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
      if (!d) return false;
      stopAuto();
      const rng = new G.RNG(d.seed);
      rng.s = d.rngState;
      const lv = d.level;
      state = {
        seed: d.seed,
        rng,
        floor: d.floor,
        turn: d.turn,
        kills: d.kills || 0,
        goldEarned: d.goldEarned || 0,
        cls: d.cls,
        player: d.player,
        playerSprite: G.Spr.playerSprite(d.cls),
        level: lv,
        vis: new Uint8Array(lv.w * lv.h),
        exp: new Uint8Array(d.exp),
        monsters: d.monsters,
        clouds: d.clouds || [],
        telegraphs: d.telegraphs || [],
        log: d.log || [],
        targeting: null,
        selectedSpell: 0,
        busy: false,
        over: false,
        victory: false,
        modalQueue: [],
      };
      computeFOV();
      G.Render.snapCamera(state.player.x + 0.5, state.player.y + 0.5);
      G.Audio.startBgm(G.biomeFor(state.floor));
      emitUI();
      return true;
    } catch (e) {
      clearRunSave();
      return false;
    }
  }

  /* ---------- helpers ---------- */
  function log(msg, cls = '') {
    if (!state) return;
    state.log.push({ text: msg, cls, turn: state.turn });
    if (state.log.length > 80) state.log.shift();
  }

  function emitUI(event) {
    if (uiHook) uiHook(state, event);
  }

  function monsterAt(x, y, includeDead = false) {
    return state.monsters.find((m) => (includeDead || m.hp > 0) && m.x === x && m.y === y);
  }
  function objectAt(x, y) {
    return state.level.objects.find((o) => o.x === x && o.y === y);
  }
  function itemsAt(x, y) {
    return state.level.items.filter((i) => i.x === x && i.y === y);
  }
  function isWalkable(x, y, fly = false, lavaWalk = false) {
    const lv = state.level;
    if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) return false;
    const t = lv.tiles[y * lv.w + x];
    if (t === T.WALL || t === T.PILLAR) return false;
    if (t === T.CHASM) return fly;
    if (t === T.LAVA && !fly && !lavaWalk) return true; // walkable but burns
    return G.TILE_WALK[t];
  }

  function computeFOV() {
    const pl = state.player;
    const r = pl.vision + (pl.relics.includes('starEye') ? 2 : 0);
    G.FOV.compute(state.level, pl.x, pl.y, r, state.vis);
    for (let i = 0; i < state.vis.length; i++) {
      if (state.vis[i]) state.exp[i] = 1;
    }
    if (state.monsters) {
      for (const m of state.monsters) {
        if (m.hp > 0 && m.boss && m.asleep && state.vis[m.y * state.level.w + m.x] && G.dist(m.x, m.y, pl.x, pl.y) <= 7) {
          m.asleep = false;
          m.alerted = true;
          log(`★ ${m.name} が目を覚ました！`, 'warn');
          G.Audio.play('boss');
          G.FX.addShake(5);
        }
      }
    }
  }

  /* ---------- start new run & floor transition ---------- */
  function startNewRun(clsId) {
    stopAuto();
    const meta = loadMeta();
    const C = G.CLASSES[clsId];
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const rng = new G.RNG(seed);

    const maxHp = C.hp + meta.upgrades.vitality * 4;
    const maxMp = C.mp + meta.upgrades.wisdom * 3;
    const inv = [];
    const startPots = 1 + meta.upgrades.potion;
    for (let i = 0; i < startPots; i++) inv.push({ id: 'hpPotion' });
    inv.push({ id: 'mpPotion' });

    const player = {
      x: 0, y: 0, vx: 0, vy: 0, hop: 0, flip: false, flash: 0,
      hp: maxHp, maxHp, mp: maxMp, maxMp,
      pow: C.pow, def: C.def,
      lvl: 1, xp: 0, nextXp: G.xpFor(1),
      gold: 0,
      vision: 7,
      shield: 0, shieldDur: 0,
      burn: 0, poison: 0, timestop: 0,
      phoenixUsed: false,
      regenMul: 1, vigorMul: 1,
      hpAcc: 0, mpAcc: 0,
      spells: C.spells.map((id) => ({ id, lv: 0 })),
      items: inv,
      relics: [],
    };

    state = {
      seed, rng,
      floor: 1, turn: 1, kills: 0, goldEarned: 0,
      cls: clsId,
      player,
      playerSprite: G.Spr.playerSprite(clsId),
      level: null, vis: null, exp: null,
      monsters: [], clouds: [], telegraphs: [],
      log: [],
      targeting: null, selectedSpell: 0,
      busy: false, over: false, victory: false,
      modalQueue: [],
    };

    if (meta.upgrades.heirloom > 0) {
      const r = G.Dungeon.randomRelic(rng, []);
      if (r) grantRelic(r, true);
    }

    meta.stats.runs++;
    saveMeta(meta);

    enterFloor(1);
    log(`星詠みの迷宮へと足を踏み入れた（${C.name}）。`, 'sys');
    saveRun();
    emitUI();
  }

  function enterFloor(floor) {
    stopAuto();
    state.floor = floor;
    state.targeting = null;
    const lv = G.Dungeon.generate(floor, state.rng, { relics: state.player.relics });
    state.level = lv;
    state.vis = new Uint8Array(lv.w * lv.h);
    state.exp = new Uint8Array(lv.w * lv.h);
    state.clouds = [];
    state.telegraphs = [];
    state.monsters = lv.spawns.map((s) => spawnMonster(s, floor));

    const pl = state.player;
    pl.x = lv.start.x; pl.y = lv.start.y;
    pl.vx = pl.x; pl.vy = pl.y;
    computeFOV();
    G.Render.snapCamera(pl.x + 0.5, pl.y + 0.5);

    const biome = G.biomeFor(floor);
    G.Audio.startBgm(biome);
    const meta = loadMeta();
    if (floor > meta.stats.bestFloor) { meta.stats.bestFloor = floor; saveMeta(meta); }

    if (G.isBossFloor(floor)) {
      log(`第${floor}階層「${biome.name}」— ボスの気配が漂う…！`, 'warn');
    } else {
      log(`第${floor}階層「${biome.name}」へ降りた。`, 'sys');
    }
    if (pl.relics.includes('starEye')) {
      log('星見の瞳が階段の位置を映し出している。', 'buff');
    }
    saveRun();
    emitUI({ type: 'floor', floor });
  }

  function spawnMonster(s, floor) {
    const def = G.MONSTERS[s.type];
    const scale = def.boss ? 1 : 1 + (floor - 1) * 0.085;
    const eliteMul = s.elite ? 1.45 : 1;
    const hp = Math.max(3, Math.round(def.hp * scale * eliteMul));
    const atkMin = Math.max(1, Math.round(def.atk[0] * scale * (s.elite ? 1.2 : 1)));
    const atkMax = Math.max(atkMin + 1, Math.round(def.atk[1] * scale * (s.elite ? 1.2 : 1)));
    return {
      uid: G.uid(),
      type: s.type,
      name: (s.elite ? '強敵・' : '') + def.name,
      sprite: def.sprite,
      x: s.x, y: s.y, vx: s.x, vy: s.y, hop: 0, flip: false, flash: 0,
      hp, maxHp: hp,
      atk: [atkMin, atkMax],
      def: def.def + (s.elite ? 1 : 0),
      spd: def.spd,
      xp: Math.round(def.xp * (s.elite ? 2 : 1)),
      energy: 0,
      asleep: !!s.asleep,
      alerted: false,
      elite: !!s.elite,
      boss: !!def.boss,
      ally: !!def.ally,
      fly: !!def.fly,
      lavaWalk: !!def.lavaWalk,
      scale: def.scale || 1,
      frozen: 0, burn: 0, poison: 0,
      dur: s.dur || 0,
      cd: 0, phase2: false,
    };
  }

  /* ---------- relics & boons ---------- */
  function grantRelic(id, silent = false) {
    const pl = state.player;
    if (pl.relics.includes(id)) return false;
    pl.relics.push(id);
    const R = G.RELICS[id];
    if (id === 'ironWard') pl.def += 2;
    if (id === 'manaWell') { pl.maxMp += 12; pl.mp += 12; }
    if (id === 'lifeFruit') { pl.maxHp += 20; pl.hp += 20; }
    if (id === 'arcaneLens') pl.pow += 2;
    if (!silent) {
      log(`遺物【${R.name}】を手に入れた！（${R.desc}）`, 'loot');
      G.Audio.play('chest');
      G.FX.floatText(pl.x, pl.y, R.name, '#ffd27a', true);
    }
    return true;
  }

  function grantXP(amount) {
    const pl = state.player;
    pl.xp += amount;
    while (pl.xp >= pl.nextXp) {
      pl.xp -= pl.nextXp;
      pl.lvl++;
      pl.nextXp = G.xpFor(pl.lvl);
      pl.maxHp += 3;
      pl.hp = Math.min(pl.maxHp, pl.hp + 5);
      pl.maxMp += 2;
      if (state.cls === 'astro') pl.mp = pl.maxMp;
      else pl.mp = Math.min(pl.maxMp, pl.mp + 4);
      G.Audio.play('levelup');
      G.FX.ring(pl.x + 0.5, pl.y + 0.5, 2.2, '#ffd27a', 0.45);
      G.FX.floatText(pl.x, pl.y, `LEVEL ${pl.lvl}!`, '#ffe066', true);
      log(`レベルアップ！ Lv.${pl.lvl} になった！`, 'buff');
      stopAuto();
      // queue boon selection
      const meta = loadMeta();
      const count = 3 + meta.upgrades.insight;
      const pool = state.rng.shuffle(Object.keys(G.BOONS).slice()).slice(0, count);
      state.modalQueue.push({ type: 'boon', choices: pool });
    }
  }

  function applyBoon(boonId) {
    const pl = state.player;
    const B = G.BOONS[boonId];
    if (boonId === 'hp') { pl.maxHp += 8; pl.hp += 8; }
    else if (boonId === 'mp') { pl.maxMp += 5; pl.mp += 5; }
    else if (boonId === 'pow') { pl.pow += 1; }
    else if (boonId === 'def') { pl.def += 1; }
    else if (boonId === 'regen') { pl.regenMul += 0.4; }
    else if (boonId === 'vigor') { pl.vigorMul += 0.6; }
    log(`加護【${B.name}】を得た！（${B.desc}）`, 'buff');
    G.Audio.play('pickup');
    saveRun();
    emitUI();
  }

  /* ---------- damage & status ---------- */
  function damageMonster(m, rawDmg, elem = 'phys', opts = {}) {
    if (m.hp <= 0) return 0;
    const pl = state.player;
    const def = G.MONSTERS[m.type];
    let dmg = rawDmg;

    // elemental passives & relics
    if (elem === 'fire') {
      if (state.cls === 'pyro') dmg *= 1.2;
      if (pl.relics.includes('emberSigil')) dmg *= 1.35;
    } else if (elem === 'ice') {
      if (pl.relics.includes('frostHeart')) dmg *= 1.35;
    } else if (elem === 'lightning') {
      if (pl.relics.includes('stormRing')) dmg *= 1.35;
    }
    if (state.cls === 'cryo' && m.frozen > 0) dmg *= 1.4;
    if (pl.relics.includes('berserk') && pl.hp <= pl.maxHp * 0.35) dmg *= 1.5;

    // resistance
    const res = def.resist && def.resist[elem] !== undefined ? def.resist[elem] : 1;
    dmg *= res;

    // defense only reduces physical
    if (elem === 'phys') dmg = Math.max(1, Math.round(dmg) - m.def);
    else dmg = Math.max(res === 0 ? 0 : 1, Math.round(dmg));

    m.hp -= dmg;
    m.flash = 0.14;
    m.asleep = false;
    m.alerted = true;

    const col = (G.ELEM[elem] && G.ELEM[elem].color) || '#ffffff';
    G.FX.floatText(m.x, m.y, res === 0 ? '無効' : `-${dmg}`, res > 1.2 ? '#ffe066' : col, opts.crit || res > 1.2);
    if (!opts.noBurst) G.FX.elemBurst(m.x, m.y, elem);

    // Boss phase / wake announcement
    if (m.boss && !m.phase2 && m.hp > 0 && m.hp <= m.maxHp * 0.5) {
      m.phase2 = true;
      log(`${m.name} が激怒した！真の力を解放する！`, 'warn');
      G.Audio.play('boss');
      G.FX.addShake(5);
    }

    if (m.hp <= 0) {
      onMonsterKilled(m);
    }
    return dmg;
  }

  function onMonsterKilled(m) {
    const pl = state.player;
    const def = G.MONSTERS[m.type];
    m.hp = 0;
    G.Audio.play('kill');
    G.FX.burst(m.x + 0.5, m.y + 0.5, '#e0485a', 14, 3.2, 0.5, 1.8);

    if (m.ally) {
      log(`${m.name} は星の粒子へと還った。`, 'sys');
      return;
    }

    state.kills++;
    const meta = loadMeta();
    meta.stats.kills++;
    saveMeta(meta);

    log(`${m.name} を倒した！`, 'hit');
    if (pl.relics.includes('vampFang')) {
      pl.hp = Math.min(pl.maxHp, pl.hp + 3);
      G.FX.floatText(pl.x, pl.y, '+3', '#ff7080');
    }

    // drops
    if (def.gold) {
      let g = state.rng.range(def.gold);
      if (pl.relics.includes('luckyCoin')) g = Math.round(g * 1.5);
      g = Math.round(g * (1 + meta.upgrades.fortune * 0.15));
      if (g > 0) state.level.items.push({ x: m.x, y: m.y, gold: g });
    }
    const dropChance = 0.14 + (m.elite ? 0.45 : 0) + (pl.relics.includes('luckyCoin') ? 0.08 : 0);
    if (!m.boss && state.rng.chance(dropChance)) {
      state.level.items.push({ x: m.x, y: m.y, item: G.Dungeon.randomItem(state.rng, state.floor) });
    }

    if (m.boss) {
      state.telegraphs = [];
      G.FX.addShake(7);
      G.FX.ring(m.x + 0.5, m.y + 0.5, 4, '#ffd27a', 0.6);
      log(`★ ${m.name} を討伐した！！`, 'loot');
      if (state.floor >= G.MAX_FLOOR) {
        triggerVictory();
        return;
      }
      // Spawn stairs & drop a relic
      const st = state.level.bossStairs || { x: m.x, y: m.y };
      state.level.tiles[st.y * state.level.w + st.x] = T.STAIRS;
      state.level.stairs = st;
      log('部屋の中央に下り階段が現れた！', 'loot');
      const r = G.Dungeon.randomRelic(state.rng, pl.relics);
      if (r) grantRelic(r);
    }

    if (def.xp > 0) grantXP(m.xp);
  }

  function damagePlayer(rawDmg, sourceName, elem = 'phys') {
    const pl = state.player;
    if (state.over) return 0;
    let dmg = elem === 'phys' ? Math.max(1, rawDmg - pl.def) : Math.max(1, rawDmg);

    // Shield absorption
    if (pl.shield > 0) {
      const abs = Math.min(pl.shield, dmg);
      pl.shield -= abs;
      dmg -= abs;
      if (pl.shield <= 0) { pl.shield = 0; pl.shieldDur = 0; log('魔力障壁が砕けた！', 'warn'); }
    }

    if (dmg > 0) {
      pl.hp -= dmg;
      pl.flash = 0.18;
      stopAuto();
      G.Audio.play('hurt');
      G.FX.addShake(Math.min(6, 2 + dmg * 0.4));
      G.vibrate(35);
      G.FX.floatText(pl.x, pl.y, `-${dmg}`, '#ff4a5a', dmg >= 6);
      log(`${sourceName} から ${dmg} のダメージを受けた！`, 'bad');
    } else {
      G.FX.floatText(pl.x, pl.y, '防いだ!', '#7fd8ff');
    }

    if (pl.hp <= 0) {
      if (pl.relics.includes('phoenix') && !pl.phoenixUsed) {
        pl.phoenixUsed = true;
        pl.hp = Math.max(1, Math.round(pl.maxHp * 0.5));
        pl.burn = 0; pl.poison = 0;
        G.Audio.play('levelup');
        G.FX.ring(pl.x + 0.5, pl.y + 0.5, 3, '#ff9a3a', 0.55);
        G.FX.floatText(pl.x, pl.y, '不死鳥の蘇生！', '#ffe066', true);
        log('不死鳥の羽が輝き、死の淵から蘇った！', 'buff');
        return dmg;
      }
      pl.hp = 0;
      triggerGameOver(sourceName);
    }
    return dmg;
  }

  function triggerGameOver(cause) {
    state.over = true;
    state.victory = false;
    stopAuto();
    clearRunSave();
    G.Audio.stopBgm();
    G.Audio.play('die');
    const dust = Math.max(2, Math.floor(state.floor * 4 + state.kills * 0.5));
    const meta = loadMeta();
    meta.dust += dust;
    saveMeta(meta);
    log(`${cause} に倒れた…`, 'bad');
    emitUI({ type: 'end', victory: false, dust, cause });
  }

  function triggerVictory() {
    state.over = true;
    state.victory = true;
    stopAuto();
    clearRunSave();
    G.Audio.stopBgm();
    G.Audio.play('win');
    const dust = 60 + state.floor * 5 + Math.floor(state.kills * 0.8);
    const meta = loadMeta();
    meta.dust += dust;
    meta.stats.wins++;
    saveMeta(meta);
    emitUI({ type: 'end', victory: true, dust });
  }

  /* ---------- player actions ---------- */
  function finishPlayerAction(cost = 100) {
    if (state.over) return;
    const pl = state.player;
    state.turn++;

    // Natural regen
    pl.mpAcc += 0.34 * pl.regenMul * (pl.relics.includes('sageStone') ? 2 : 1);
    if (pl.mpAcc >= 1) {
      const gain = Math.floor(pl.mpAcc);
      pl.mpAcc -= gain;
      pl.mp = Math.min(pl.maxMp, pl.mp + gain);
    }
    pl.hpAcc += 0.14 * pl.vigorMul;
    if (pl.hpAcc >= 1) {
      const gain = Math.floor(pl.hpAcc);
      pl.hpAcc -= gain;
      pl.hp = Math.min(pl.maxHp, pl.hp + gain);
    }

    // Shield duration
    if (pl.shieldDur > 0) {
      pl.shieldDur--;
      if (pl.shieldDur <= 0) { pl.shield = 0; log('魔力障壁の効果が切れた。', 'sys'); }
    }

    // Player status ticks
    if (pl.burn > 0) {
      pl.burn--;
      damagePlayer(2, '火傷', 'fire');
      if (state.over) return;
    }
    if (pl.poison > 0) {
      pl.poison--;
      damagePlayer(2, '毒', 'poison');
      if (state.over) return;
    }

    // Lava tile damage
    if (state.level.tiles[pl.y * state.level.w + pl.x] === T.LAVA) {
      damagePlayer(4, '溶岩の熱気', 'fire');
      if (state.over) return;
    }

    // Process clouds
    for (let i = state.clouds.length - 1; i >= 0; i--) {
      const c = state.clouds[i];
      c.dur--;
      if (c.dur <= 0) { state.clouds.splice(i, 1); continue; }
      const m = monsterAt(c.x, c.y);
      if (m && !m.ally) {
        if (c.kind === 'venom') {
          const pd = c.dmg * (pl.relics.includes('venomGland') ? 2 : 1);
          damageMonster(m, pd, 'poison', { noBurst: true });
        } else if (c.kind === 'fire') {
          damageMonster(m, c.dmg || 3, 'fire', { noBurst: true });
        }
      }
    }

    // Process boss telegraphs (detonate!)
    for (let i = state.telegraphs.length - 1; i >= 0; i--) {
      const tg = state.telegraphs[i];
      tg.turns--;
      if (tg.turns <= 0) {
        G.FX.elemBurst(tg.x, tg.y, tg.elem || 'fire');
        G.FX.addShake(4);
        if (pl.x === tg.x && pl.y === tg.y) {
          damagePlayer(tg.dmg, tg.name || '魔導の衝撃', tg.elem || 'fire');
          if (state.over) return;
        }
        state.telegraphs.splice(i, 1);
      }
    }

    // Enemy / Ally turns
    runActorTurns(cost);
    computeFOV();

    // Cleanup dead monsters
    state.monsters = state.monsters.filter((m) => m.hp > 0);
    saveRun();
    emitUI();
  }

  function runActorTurns(cost) {
    const pl = state.player;
    const frozenTime = pl.timestop > 0;
    if (frozenTime) pl.timestop--;

    for (const m of state.monsters) {
      if (m.hp <= 0) continue;

      if (m.ally) {
        m.dur--;
        if (m.dur <= 0) { m.hp = 0; log(`${m.name} が消え去った。`, 'sys'); continue; }
        m.energy += (m.spd * cost) / 100;
        while (m.energy >= 100 && m.hp > 0) {
          m.energy -= 100;
          actAlly(m);
        }
        continue;
      }

      if (frozenTime && (!m.boss || pl.timestop % 2 === 1)) continue;

      // Monster status ticks
      if (m.burn > 0) {
        m.burn--;
        const bd = state.cls === 'pyro' ? 3 : 2;
        damageMonster(m, bd, 'fire', { noBurst: true });
        if (m.hp <= 0) continue;
      }
      if (m.poison > 0) {
        m.poison--;
        const pd = pl.relics.includes('venomGland') ? 4 : 2;
        damageMonster(m, pd, 'poison', { noBurst: true });
        if (m.hp <= 0) continue;
      }

      if (m.frozen > 0) {
        m.frozen--;
        G.FX.spark(m.x + 0.5, m.y + 0.5, '#8fe6ff', 0.35);
        continue;
      }

      m.energy += (m.spd * cost) / 100;
      let safety = 0;
      while (m.energy >= 100 && m.hp > 0 && !state.over && safety++ < 4) {
        m.energy -= 100;
        actMonster(m);
      }
    }
  }

  /* ---------- Monster & Ally AI ---------- */
  function stepTowards(m, tx, ty) {
    const lv = state.level;
    const pl = state.player;
    const passFn = (x, y) => {
      if (!isWalkable(x, y, m.fly, m.lavaWalk)) return Infinity;
      if (x === pl.x && y === pl.y && !m.ally) return 2;
      if (x === pl.x && y === pl.y && m.ally) return Infinity;
      const occ = monsterAt(x, y);
      if (occ) return occ.ally === m.ally ? 8 : Infinity;
      if (!m.fly && !m.lavaWalk && lv.tiles[y * lv.w + x] === T.LAVA) return 20;
      return 1;
    };
    const path = G.FOV.astar(lv, m.x, m.y, tx, ty, passFn, 220);
    if (path && path.length) {
      const [nx, ny] = path[0];
      if (!monsterAt(nx, ny) && !(nx === pl.x && ny === pl.y)) {
        m.flip = nx < m.x ? true : nx > m.x ? false : m.flip;
        m.x = nx; m.y = ny; m.hop = 0.5;
        return true;
      }
    }
    return false;
  }

  function actAlly(m) {
    let best = null, bd = 999;
    for (const e of state.monsters) {
      if (e.hp <= 0 || e.ally) continue;
      const d = G.dist(m.x, m.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best && bd === 1) {
      const dmg = state.rng.range(m.atk);
      m.flip = best.x < m.x;
      m.hop = 0.6;
      G.Audio.play('hit');
      damageMonster(best, dmg, 'arcane');
    } else if (best && bd <= 8) {
      stepTowards(m, best.x, best.y);
    } else {
      const pl = state.player;
      if (G.dist(m.x, m.y, pl.x, pl.y) > 2) stepTowards(m, pl.x, pl.y);
    }
  }

  function actMonster(m) {
    const pl = state.player;
    const def = G.MONSTERS[m.type];
    const lv = state.level;
    const dist = G.dist(m.x, m.y, pl.x, pl.y);
    const seesPlayer = dist <= 8 && G.FOV.los(lv, m.x, m.y, pl.x, pl.y);

    if (m.asleep) {
      if (seesPlayer && (dist <= 5 || state.rng.chance(0.4))) {
        m.asleep = false; m.alerted = true;
        if (m.boss) {
          log(`★ ${m.name} が目を覚ました！`, 'warn');
          G.Audio.play('boss');
          G.FX.addShake(5);
        } else if (m.type === 'mimic') {
          log('宝箱はミミックだった！', 'warn');
          G.Audio.play('trap');
        }
      } else {
        return;
      }
    }
    if (seesPlayer) m.alerted = true;
    if (!m.alerted) return;

    // Boss special patterns
    if (m.boss && seesPlayer) {
      if (m.cd > 0) m.cd--;
      if (m.cd <= 0 && actBossSpecial(m)) return;
    }

    // Adjacent melee (check allies too)
    if (dist === 1) {
      monsterMelee(m);
      return;
    }
    const adjAlly = state.monsters.find((a) => a.hp > 0 && a.ally && G.dist(m.x, m.y, a.x, a.y) === 1);
    if (adjAlly) {
      const dmg = Math.max(1, state.rng.range(m.atk));
      adjAlly.hp -= dmg; adjAlly.flash = 0.14;
      G.FX.floatText(adjAlly.x, adjAlly.y, `-${dmg}`, '#ff9070');
      if (adjAlly.hp <= 0) log(`${adjAlly.name} は倒れた！`, 'sys');
      return;
    }

    // Ranged attack
    if (def.ranged && seesPlayer && dist <= def.ranged.range && dist > 1 && state.rng.chance(def.ranged.chance)) {
      const r = def.ranged;
      const dmg = state.rng.range(r.dmg);
      const col = (G.ELEM[r.elem] && G.ELEM[r.elem].color) || '#ffe066';
      m.flip = pl.x < m.x;
      G.Audio.play('spell', r.elem);
      G.FX.proj(m.x + 0.5, m.y + 0.5, pl.x + 0.5, pl.y + 0.5, col, 18, () => {
        G.FX.elemBurst(pl.x, pl.y, r.elem);
      });
      damagePlayer(dmg, m.name, r.elem);
      if (r.freeze && state.rng.chance(r.freeze)) { log('冷気で動きが鈍った！', 'bad'); }
      if (r.burn && state.rng.chance(r.burn)) { pl.burn = Math.max(pl.burn, 3); log('炎に包まれ燃焼した！', 'bad'); }
      return;
    }

    // Blinker caster retreats if too close
    if (def.blinker && dist <= 2 && state.rng.chance(0.45)) {
      const spots = [];
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const nx = m.x + dx, ny = m.y + dy;
        if (G.dist(nx, ny, pl.x, pl.y) >= 4 && isWalkable(nx, ny) && !monsterAt(nx, ny)) spots.push([nx, ny]);
      }
      if (spots.length) {
        const [nx, ny] = state.rng.pick(spots);
        G.FX.burst(m.x + 0.5, m.y + 0.5, '#c79bff', 8, 2, 0.35);
        m.x = nx; m.y = ny; m.vx = nx; m.vy = ny;
        G.FX.burst(nx + 0.5, ny + 0.5, '#c79bff', 8, 2, 0.35);
        return;
      }
    }

    // Erratic bat movement
    if (def.ai === 'erratic' && state.rng.chance(0.35)) {
      const dirs = state.rng.shuffle(G.DIRS8.slice());
      for (const [dx, dy] of dirs) {
        const nx = m.x + dx, ny = m.y + dy;
        if (isWalkable(nx, ny, true) && !monsterAt(nx, ny) && !(nx === pl.x && ny === pl.y)) {
          m.x = nx; m.y = ny; m.hop = 0.5;
          return;
        }
      }
    }

    stepTowards(m, pl.x, pl.y);
  }

  function monsterMelee(m) {
    const pl = state.player;
    const def = G.MONSTERS[m.type];
    m.flip = pl.x < m.x;
    m.hop = 0.65;
    const dmg = state.rng.range(m.atk);
    damagePlayer(dmg, m.name, 'phys');
    if (state.over) return;

    if (def.onHit) {
      if (def.onHit.poison && state.rng.chance(def.onHit.chance)) {
        pl.poison = Math.max(pl.poison, def.onHit.poison);
        log('毒に侵された！', 'bad');
      }
      if (def.onHit.burn && state.rng.chance(def.onHit.chance)) {
        pl.burn = Math.max(pl.burn, def.onHit.burn);
        log('体が燃え上がった！', 'bad');
      }
      if (def.onHit.drainMp && state.rng.chance(def.onHit.chance)) {
        const dr = Math.min(pl.mp, def.onHit.drainMp);
        pl.mp -= dr;
        if (dr > 0) log(`魔力を ${dr} 吸い取られた！`, 'bad');
      }
    }
    if (pl.relics.includes('thornCloak')) {
      damageMonster(m, 4, 'phys');
    }
  }

  function actBossSpecial(m) {
    const pl = state.player;
    const lv = state.level;
    const cdBase = m.phase2 ? 3 : 4;

    if (m.type === 'boneking') {
      const minions = state.monsters.filter((e) => !e.boss && !e.ally && e.hp > 0).length;
      if (minions < 3 && state.rng.chance(0.55)) {
        let spawned = 0;
        for (const [dx, dy] of state.rng.shuffle(G.DIRS8.slice())) {
          const nx = m.x + dx, ny = m.y + dy;
          if (isWalkable(nx, ny) && !monsterAt(nx, ny) && !(nx === pl.x && ny === pl.y)) {
            state.monsters.push(spawnMonster({ type: 'skeleton', x: nx, y: ny, asleep: false }, state.floor));
            G.FX.burst(nx + 0.5, ny + 0.5, '#d8d2bc', 10, 2, 0.4);
            if (++spawned >= 2) break;
          }
        }
        if (spawned) {
          m.cd = cdBase;
          log('骸骨王が骸骨兵を呼び寄せた！', 'warn');
          G.Audio.play('boss');
          return true;
        }
      }
      // Telegraph bone nova around player
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const tx = pl.x + dx, ty = pl.y + dy;
        if (isWalkable(tx, ty)) state.telegraphs.push({ x: tx, y: ty, turns: 1, dmg: 8, elem: 'dark', name: m.name + 'の呪骨波' });
      }
      m.cd = cdBase;
      log('骸骨王が呪いの骨を隆起させようとしている！', 'warn');
      return true;
    }

    if (m.type === 'colossus') {
      const minions = state.monsters.filter((e) => !e.boss && !e.ally && e.hp > 0).length;
      if (minions < 2 && state.rng.chance(0.5)) {
        for (const [dx, dy] of state.rng.shuffle(G.DIRS8.slice())) {
          const nx = m.x + dx, ny = m.y + dy;
          if (isWalkable(nx, ny) && !monsterAt(nx, ny) && !(nx === pl.x && ny === pl.y)) {
            state.monsters.push(spawnMonster({ type: 'shard', x: nx, y: ny, asleep: false }, state.floor));
            G.FX.burst(nx + 0.5, ny + 0.5, '#8fe6ff', 10, 2, 0.4);
            m.cd = cdBase;
            log('晶核の巨像から結晶の晶片が分離した！', 'warn');
            return true;
          }
        }
      }
      // Cross laser telegraph
      for (const [dx, dy] of G.DIRS4) {
        for (let k = 1; k <= 6; k++) {
          const tx = m.x + dx * k, ty = m.y + dy * k;
          if (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h || G.TILE_OPAQUE[lv.tiles[ty * lv.w + tx]]) break;
          state.telegraphs.push({ x: tx, y: ty, turns: 1, dmg: 11, elem: 'ice', name: '晶核光線' });
        }
      }
      m.cd = cdBase;
      log('晶核の巨像のコアが十字に輝き始めた！', 'warn');
      return true;
    }

    if (m.type === 'ignis') {
      // Meteor shower telegraphs near player
      const count = m.phase2 ? 6 : 4;
      for (let i = 0; i < count; i++) {
        const tx = G.clamp(pl.x + state.rng.int(-2, 2), 1, lv.w - 2);
        const ty = G.clamp(pl.y + state.rng.int(-2, 2), 1, lv.h - 2);
        if (isWalkable(tx, ty)) state.telegraphs.push({ x: tx, y: ty, turns: 1, dmg: 13, elem: 'fire', name: 'イグニスの業火' });
      }
      m.cd = cdBase - 1;
      log('炎竜イグニスが天を仰ぎ、紅蓮の火球を呼び寄せた！', 'warn');
      G.Audio.play('boss');
      return true;
    }

    if (m.type === 'voidlord') {
      if (state.rng.chance(0.45)) {
        // Void blink + summon
        const spots = [];
        for (let y = 5; y < 20; y++) for (let x = 7; x < 26; x++) {
          if (isWalkable(x, y) && !monsterAt(x, y) && G.dist(x, y, pl.x, pl.y) >= 4) spots.push([x, y]);
        }
        if (spots.length) {
          const [nx, ny] = state.rng.pick(spots);
          G.FX.burst(m.x + 0.5, m.y + 0.5, '#b9a8ff', 14, 3, 0.4);
          m.x = nx; m.y = ny; m.vx = nx; m.vy = ny;
          G.FX.burst(nx + 0.5, ny + 0.5, '#b9a8ff', 14, 3, 0.4);
        }
      }
      const n = m.phase2 ? 8 : 5;
      for (let i = 0; i < n; i++) {
        const tx = G.clamp(pl.x + state.rng.int(-2, 2), 1, lv.w - 2);
        const ty = G.clamp(pl.y + state.rng.int(-2, 2), 1, lv.h - 2);
        if (isWalkable(tx, ty)) state.telegraphs.push({ x: tx, y: ty, turns: 1, dmg: 15, elem: 'dark', name: '星喰らいの崩壊' });
      }
      m.cd = cdBase - 1;
      log('魔王ネザルが虚空の裂け目を展開した！', 'warn');
      G.Audio.play('boss');
      return true;
    }
    return false;
  }

  /* ---------- player movement & melee ---------- */
  function stepPlayer(dx, dy) {
    if (!state || state.over || state.busy) return false;
    state.targeting = null;
    const pl = state.player;
    const nx = pl.x + dx, ny = pl.y + dy;
    const lv = state.level;
    if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) return false;

    const target = monsterAt(nx, ny);
    if (target) {
      if (target.ally) {
        // Swap with ally
        target.x = pl.x; target.y = pl.y; target.hop = 0.4;
        pl.x = nx; pl.y = ny; pl.hop = 0.4;
        G.Audio.play('step');
        finishPlayerAction(100);
        return true;
      }
      playerMelee(target);
      return true;
    }

    const obj = objectAt(nx, ny);
    if (obj && obj.type === 'chest' && !obj.open) {
      openChest(obj);
      finishPlayerAction(100);
      return true;
    }
    if (obj && obj.type === 'shrine') {
      stopAuto();
      if (obj.used) { log('この祭壇はすでに力を失っている。', 'sys'); emitUI(); return false; }
      state.modalQueue.push({ type: 'shrine', obj });
      emitUI();
      return false;
    }
    if (obj && obj.type === 'merchant') {
      stopAuto();
      state.modalQueue.push({ type: 'merchant', obj });
      emitUI();
      return false;
    }

    if (!isWalkable(nx, ny)) return false;

    pl.flip = dx < 0 ? true : dx > 0 ? false : pl.flip;
    pl.x = nx; pl.y = ny; pl.hop = 0.55;
    G.Audio.play('step');

    // Pickup floor items / gold
    for (let i = lv.items.length - 1; i >= 0; i--) {
      const it = lv.items[i];
      if (it.x !== nx || it.y !== ny) continue;
      if (it.gold) {
        pl.gold += it.gold;
        state.goldEarned += it.gold;
        G.Audio.play('coin');
        G.FX.floatText(nx, ny, `+${it.gold}G`, '#ffe066');
        log(`金貨 ${it.gold}G を拾った。`, 'loot');
        lv.items.splice(i, 1);
      } else if (it.item) {
        if (pl.items.length >= G.MAX_ITEMS) {
          log('持ち物がいっぱいで拾えない！', 'warn');
        } else {
          pl.items.push(it.item);
          const def = G.ITEMS[it.item.id];
          G.Audio.play('pickup');
          G.FX.floatText(nx, ny, def.name, '#7fffe0');
          log(`${def.name} を手に入れた。`, 'loot');
          lv.items.splice(i, 1);
        }
      }
    }

    // Trigger traps
    const trap = objectAt(nx, ny);
    if (trap && trap.type === 'trap') {
      triggerTrap(trap);
      if (state.over) return true;
    }

    // Notify stairs
    if (lv.tiles[ny * lv.w + nx] === T.STAIRS) {
      log('足元に下り階段がある。「降りる」で次の階層へ進める。', 'sys');
      stopAuto();
    }

    const moveCost = pl.relics.includes('swiftBoots') ? 75 : 100;
    finishPlayerAction(moveCost);
    return true;
  }

  function playerMelee(m) {
    const pl = state.player;
    pl.flip = m.x < pl.x ? true : m.x > pl.x ? false : pl.flip;
    pl.hop = 0.7;
    const base = state.rng.int(2, 4) + Math.floor(pl.lvl * 0.65) + Math.floor(pl.pow * 0.5);
    const crit = state.rng.chance(0.12);
    const dmg = crit ? Math.round(base * 1.6) : base;
    G.Audio.play(crit ? 'crit' : 'hit');
    G.FX.addHitStop(crit ? 0.05 : 0.025);
    G.FX.addShake(crit ? 3.5 : 1.5);
    damageMonster(m, dmg, 'phys', { crit });
    if (m.hp > 0 && pl.relics.includes('venomGland')) {
      m.poison = Math.max(m.poison, 3);
    }
    if (pl.relics.includes('vampFang')) {
      pl.hp = Math.min(pl.maxHp, pl.hp + 2);
    }
    finishPlayerAction(100);
  }

  function openChest(obj) {
    const pl = state.player;
    obj.open = true;
    G.Audio.play('chest');
    G.FX.burst(obj.x + 0.5, obj.y + 0.5, '#ffe066', 14, 2.5, 0.5);
    const gold = state.rng.int(12, 24) + state.floor * 5;
    pl.gold += gold; state.goldEarned += gold;
    log(`宝箱を開けた！ 金貨 ${gold}G を手に入れた！`, 'loot');
    if (obj.rich || state.rng.chance(0.32)) {
      const r = G.Dungeon.randomRelic(state.rng, pl.relics);
      if (r) { grantRelic(r); return; }
    }
    const it = G.Dungeon.randomItem(state.rng, state.floor);
    if (pl.items.length < G.MAX_ITEMS) {
      pl.items.push(it);
      log(`さらに ${G.ITEMS[it.id].name} が入っていた！`, 'loot');
    } else {
      state.level.items.push({ x: obj.x, y: obj.y, item: it });
      log(`${G.ITEMS[it.id].name} が足元に落ちた。`, 'loot');
    }
  }

  function triggerTrap(trap) {
    const pl = state.player;
    const lv = state.level;
    trap.hidden = false;
    stopAuto();
    G.Audio.play('trap');
    if (trap.kind === 'spike') {
      log('トゲの罠が作動した！', 'bad');
      damagePlayer(3 + state.floor, 'トゲの罠', 'phys');
    } else if (trap.kind === 'fire') {
      log('炎の罠が作動した！', 'bad');
      pl.burn = Math.max(pl.burn, 3);
      damagePlayer(3 + Math.floor(state.floor * 0.7), '炎の罠', 'fire');
    } else if (trap.kind === 'poison') {
      log('毒ガスの罠が作動した！', 'bad');
      pl.poison = Math.max(pl.poison, 4);
      G.FX.elemBurst(pl.x, pl.y, 'poison');
    } else if (trap.kind === 'alarm') {
      log('警報の罠が鳴り響き、周囲の魔物が目を覚ました！', 'warn');
      for (const m of state.monsters) if (G.dist(m.x, m.y, pl.x, pl.y) <= 10) { m.asleep = false; m.alerted = true; }
    } else if (trap.kind === 'teleport') {
      log('転移の罠が作動し、どこかへ飛ばされた！', 'warn');
      randomTeleport();
    }
    // Trap consumed
    const idx = lv.objects.indexOf(trap);
    if (idx >= 0) lv.objects.splice(idx, 1);
  }

  function randomTeleport() {
    const lv = state.level;
    const pl = state.player;
    const cands = [];
    for (let y = 1; y < lv.h - 1; y++) for (let x = 1; x < lv.w - 1; x++) {
      if (lv.tiles[y * lv.w + x] === T.FLOOR && !monsterAt(x, y) && !(x === pl.x && y === pl.y)) cands.push([x, y]);
    }
    if (cands.length) {
      const [nx, ny] = state.rng.pick(cands);
      G.FX.burst(pl.x + 0.5, pl.y + 0.5, '#7fe3ff', 12, 2.5, 0.4);
      pl.x = nx; pl.y = ny; pl.vx = nx; pl.vy = ny;
      G.FX.burst(nx + 0.5, ny + 0.5, '#7fe3ff', 12, 2.5, 0.4);
      computeFOV();
      G.Render.snapCamera(nx + 0.5, ny + 0.5);
    }
  }

  function waitTurn() {
    if (!state || state.over) return;
    state.targeting = null;
    finishPlayerAction(100);
  }

  function descendStairs() {
    if (!state || state.over) return false;
    const pl = state.player;
    const lv = state.level;
    if (lv.tiles[pl.y * lv.w + pl.x] !== T.STAIRS) return false;
    G.Audio.play('stairs');
    enterFloor(state.floor + 1);
    return true;
  }

  /* ---------- Spells ---------- */
  function actualSpellCost(id, lv) {
    const base = G.spellCost(id, lv);
    return state.player.relics.includes('quill') ? Math.max(1, base - 1) : base;
  }

  function canAffordSpell(id, lv) {
    const pl = state.player;
    const cost = actualSpellCost(id, lv);
    if (pl.mp >= cost) return true;
    if (state.cls === 'hemo' && pl.hp > cost - pl.mp) return true;
    return false;
  }

  function paySpellCost(id, lv) {
    const pl = state.player;
    const cost = actualSpellCost(id, lv);
    if (pl.mp >= cost) {
      pl.mp -= cost;
    } else if (state.cls === 'hemo') {
      const diff = cost - pl.mp;
      pl.mp = 0;
      pl.hp -= diff;
      G.FX.floatText(pl.x, pl.y, `血-${diff}`, '#e04b5a');
    }
  }

  function selectOrCastSpell(slotIdx) {
    if (!state || state.over) return;
    stopAuto();
    const sp = state.player.spells[slotIdx];
    if (!sp) return;
    state.selectedSpell = slotIdx;
    const def = G.SPELLS[sp.id];

    if (!canAffordSpell(sp.id, sp.lv)) {
      log(`MPが足りない！（必要MP: ${actualSpellCost(sp.id, sp.lv)}）`, 'warn');
      G.Audio.play('miss');
      emitUI();
      return;
    }

    if (def.target === 'self' || def.target === 'auto') {
      castSpell(slotIdx, null);
    } else {
      // If tapping same targeting spell again while an enemy is in range, auto-target nearest!
      if (state.targeting && state.targeting.slotIdx === slotIdx && def.target === 'bolt') {
        const nearest = findNearestVisibleEnemy(G.spellRange(sp.id, sp.lv));
        if (nearest) {
          castSpell(slotIdx, { x: nearest.x, y: nearest.y });
          return;
        }
      }
      if (state.targeting && state.targeting.slotIdx === slotIdx) {
        state.targeting = null;
      } else {
        state.targeting = { slotIdx, spellId: sp.id, lv: sp.lv, hover: null };
        if (def.target === 'bolt') {
          const nearest = findNearestVisibleEnemy(G.spellRange(sp.id, sp.lv));
          if (nearest) state.targeting.hover = { x: nearest.x, y: nearest.y };
        }
      }
      G.Audio.play('tap');
      emitUI();
    }
  }

  function findNearestVisibleEnemy(maxRange) {
    const pl = state.player;
    let best = null, bd = 999;
    for (const m of state.monsters) {
      if (m.hp <= 0 || m.ally) continue;
      if (!state.vis[m.y * state.level.w + m.x]) continue;
      const d = G.dist(pl.x, pl.y, m.x, m.y);
      if (d <= maxRange && d < bd && G.FOV.los(state.level, pl.x, pl.y, m.x, m.y)) {
        bd = d; best = m;
      }
    }
    return best;
  }

  function castSpell(slotIdx, target, freeEcho = false) {
    const pl = state.player;
    const sp = pl.spells[slotIdx];
    if (!sp) return false;
    const id = sp.id, lv = sp.lv;
    const def = G.SPELLS[id];
    const powBonus = pl.pow * 1.4;

    if (!freeEcho) {
      if (!canAffordSpell(id, lv)) return false;
      paySpellCost(id, lv);
    }

    state.targeting = null;
    G.Audio.play('spell', def.elem);
    const col = (G.ELEM[def.elem] && G.ELEM[def.elem].color) || '#ffd27a';
    const roll = (arr) => state.rng.range(arr) + Math.round(powBonus);
    let offensive = false;

    if (id === 'missile') {
      const enemies = state.monsters
        .filter((m) => m.hp > 0 && !m.ally && state.vis[m.y * state.level.w + m.x] && G.dist(pl.x, pl.y, m.x, m.y) <= def.range)
        .sort((a, b) => G.dist(pl.x, pl.y, a.x, a.y) - G.dist(pl.x, pl.y, b.x, b.y));
      if (!enemies.length) {
        log('視界内に魔力の矢の標的がいない！', 'sys');
        if (!freeEcho) pl.mp = Math.min(pl.maxMp, pl.mp + actualSpellCost(id, lv));
        emitUI();
        return false;
      }
      offensive = true;
      const count = def.n[lv];
      log(`魔力の矢を ${count} 本放った！`, 'spell');
      for (let i = 0; i < count; i++) {
        const m = enemies[i % enemies.length];
        const d = roll(def.dmg[lv]);
        G.FX.proj(pl.x + 0.5, pl.y + 0.5, m.x + 0.5, m.y + 0.5, col, 24);
        damageMonster(m, d, 'arcane');
      }
    } else if (id === 'firebolt' || id === 'iceshard' || id === 'drain') {
      offensive = true;
      const pts = G.line(pl.x, pl.y, target.x, target.y);
      const pierce = id === 'iceshard' && lv >= 2;
      const ray = pierce ? G.ray(pl.x, pl.y, target.x, target.y, G.spellRange(id, lv)) : pts;
      let hitPos = target;
      const hitList = [];
      for (const [px, py] of ray) {
        if (G.TILE_OPAQUE[state.level.tiles[py * state.level.w + px]]) break;
        hitPos = { x: px, y: py };
        const m = monsterAt(px, py);
        if (m && !m.ally) {
          hitList.push(m);
          if (!pierce) break;
        }
      }
      G.FX.proj(pl.x + 0.5, pl.y + 0.5, hitPos.x + 0.5, hitPos.y + 0.5, col, 22, () => {
        G.FX.elemBurst(hitPos.x, hitPos.y, def.elem);
      });
      for (const m of hitList) {
        const d = roll(def.dmg[lv]);
        const dealt = damageMonster(m, d, def.elem);
        if (id === 'firebolt' && m.hp > 0) m.burn = Math.max(m.burn, def.burn[lv]);
        if (id === 'iceshard' && m.hp > 0) {
          const fr = def.freeze[lv] + (pl.relics.includes('frostHeart') ? 1 : 0);
          m.frozen = Math.max(m.frozen, fr);
        }
        if (id === 'drain' && dealt > 0) {
          const heal = Math.max(1, Math.round(dealt * def.heal[lv]));
          pl.hp = Math.min(pl.maxHp, pl.hp + heal);
          G.FX.floatText(pl.x, pl.y, `+${heal}`, '#8ff0a8');
        }
      }
      if (id === 'firebolt' && lv >= 2) {
        for (const [dx, dy] of G.DIRS8) {
          const sm = monsterAt(hitPos.x + dx, hitPos.y + dy);
          if (sm && !sm.ally && !hitList.includes(sm)) damageMonster(sm, Math.round(roll(def.dmg[lv]) * 0.6), 'fire');
        }
        G.FX.ring(hitPos.x + 0.5, hitPos.y + 0.5, 1.8, '#ff8a3a', 0.3);
      }
      log(`${def.name}を詠唱した！`, 'spell');
    } else if (id === 'lightning') {
      offensive = true;
      let cur = monsterAt(target.x, target.y);
      if (!cur) {
        const pts = G.line(pl.x, pl.y, target.x, target.y);
        for (const [px, py] of pts) { const m = monsterAt(px, py); if (m && !m.ally) { cur = m; break; } }
      }
      if (!cur) {
        G.FX.beam(pl.x + 0.5, pl.y + 0.5, target.x + 0.5, target.y + 0.5, col, 2.2, 0.22, true);
        log('雷撃は虚空を切り裂いた。', 'sys');
      } else {
        const hit = new Set();
        let prev = { x: pl.x, y: pl.y };
        let chains = 1 + def.chain[lv] + (pl.relics.includes('stormRing') ? 1 : 0);
        let dmg = roll(def.dmg[lv]);
        while (cur && chains-- > 0) {
          hit.add(cur);
          G.FX.beam(prev.x + 0.5, prev.y + 0.5, cur.x + 0.5, cur.y + 0.5, '#ffe066', 2.4, 0.25, true);
          damageMonster(cur, dmg, 'lightning');
          prev = cur;
          dmg = Math.max(2, Math.round(dmg * 0.8));
          // Find next enemy within 3 tiles
          cur = state.monsters.find((m) => m.hp > 0 && !m.ally && !hit.has(m) && G.dist(prev.x, prev.y, m.x, m.y) <= 3);
        }
        log(`連鎖の雷が ${hit.size} 体を貫いた！`, 'spell');
      }
    } else if (id === 'nova') {
      offensive = true;
      const r = def.radius[lv];
      G.FX.ring(pl.x + 0.5, pl.y + 0.5, r + 0.6, '#8fe6ff', 0.38);
      let cnt = 0;
      for (const m of state.monsters) {
        if (m.hp > 0 && !m.ally && G.dist(pl.x, pl.y, m.x, m.y) <= r) {
          damageMonster(m, roll(def.dmg[lv]), 'ice');
          if (m.hp > 0) m.frozen = Math.max(m.frozen, def.freeze[lv] + (pl.relics.includes('frostHeart') ? 1 : 0));
          cnt++;
        }
      }
      log(`フロストノヴァが周囲を凍らせた（${cnt}体）！`, 'spell');
    } else if (id === 'blink') {
      if (!isWalkable(target.x, target.y) || monsterAt(target.x, target.y) || !state.vis[target.y * state.level.w + target.x]) {
        log('その場所へは瞬間移動できない！', 'warn');
        if (!freeEcho) pl.mp = Math.min(pl.maxMp, pl.mp + actualSpellCost(id, lv));
        emitUI();
        return false;
      }
      G.FX.burst(pl.x + 0.5, pl.y + 0.5, '#ffd27a', 12, 2.5, 0.35);
      pl.x = target.x; pl.y = target.y; pl.vx = target.x; pl.vy = target.y;
      G.FX.burst(pl.x + 0.5, pl.y + 0.5, '#7fe3ff', 14, 2.8, 0.4);
      G.FX.ring(pl.x + 0.5, pl.y + 0.5, 1.5, '#ffd27a', 0.3);
      if (lv >= 2) {
        for (const m of state.monsters) {
          if (m.hp > 0 && !m.ally && G.dist(pl.x, pl.y, m.x, m.y) <= 1) damageMonster(m, roll(def.dmg[lv]), 'arcane');
        }
      }
      computeFOV();
      log('空間を跳躍した！', 'spell');
    } else if (id === 'heal') {
      const amt = Math.max(8, Math.round(pl.maxHp * def.pct[lv]) + pl.pow * 2);
      pl.hp = Math.min(pl.maxHp, pl.hp + amt);
      pl.poison = 0; pl.burn = 0;
      G.FX.elemBurst(pl.x, pl.y, 'holy');
      G.FX.floatText(pl.x, pl.y, `+${amt}`, '#8ff0a8', true);
      log(`癒しの光がHPを ${amt} 回復し、状態異常を浄化した！`, 'buff');
    } else if (id === 'shield') {
      pl.shield = def.amt[lv] + pl.pow * 2;
      pl.shieldDur = def.dur;
      G.FX.ring(pl.x + 0.5, pl.y + 0.5, 1.4, '#7fb8ff', 0.35);
      G.FX.floatText(pl.x, pl.y, `障壁 ${pl.shield}`, '#7fb8ff');
      log(`魔力障壁（耐久 ${pl.shield}）を展開した！`, 'buff');
    } else if (id === 'meteor') {
      offensive = true;
      G.FX.addShake(7);
      G.FX.ring(target.x + 0.5, target.y + 0.5, 2.2, '#ff8a3a', 0.45);
      const r = def.radius[lv];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const tx = target.x + dx, ty = target.y + dy;
        if (!isWalkable(tx, ty)) continue;
        G.FX.elemBurst(tx, ty, 'fire');
        state.clouds.push({ x: tx, y: ty, kind: 'fire', dur: 4, dmg: 3 });
        const m = monsterAt(tx, ty);
        if (m && !m.ally) damageMonster(m, roll(def.dmg[lv]), 'fire', { crit: true });
      }
      log('天より隕石が降り注ぎ、大地を焦がした！', 'spell');
    } else if (id === 'venom') {
      offensive = true;
      const r = def.radius[lv];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const tx = target.x + dx, ty = target.y + dy;
        if (isWalkable(tx, ty)) {
          state.clouds.push({ x: tx, y: ty, kind: 'venom', dur: def.dur[lv], dmg: def.pdmg[lv] });
          G.FX.elemBurst(tx, ty, 'poison');
        }
      }
      log('濃厚な毒霧を展開した！', 'spell');
    } else if (id === 'summon') {
      const spot = G.DIRS8.map(([dx, dy]) => [pl.x + dx, pl.y + dy]).find(([x, y]) => isWalkable(x, y, true) && !monsterAt(x, y));
      if (!spot) {
        log('星霊を呼び出す空き場所がない！', 'warn');
        if (!freeEcho) pl.mp = Math.min(pl.maxMp, pl.mp + actualSpellCost(id, lv));
        emitUI();
        return false;
      }
      const wisp = spawnMonster({ type: 'wisp', x: spot[0], y: spot[1], dur: def.dur[lv] }, state.floor);
      wisp.hp = wisp.maxHp = def.hp[lv];
      wisp.atk = def.atk[lv].slice();
      state.monsters.push(wisp);
      G.FX.ring(spot[0] + 0.5, spot[1] + 0.5, 1.3, '#ffe08a', 0.35);
      log('星の精霊を召喚した！', 'buff');
    } else if (id === 'timestop') {
      pl.timestop = def.turns[lv];
      G.FX.ring(pl.x + 0.5, pl.y + 0.5, 3, '#ffe08a', 0.55);
      G.FX.floatText(pl.x, pl.y, '時の静止！', '#ffe08a', true);
      log(`時が止まった！（${def.turns[lv]}ターン）`, 'buff');
    }

    // Echo Tome passive
    if (!freeEcho && offensive && pl.relics.includes('echoTome') && state.rng.chance(0.2)) {
      log('残響の魔導書が共鳴し、呪文が再詠唱された！', 'buff');
      castSpell(slotIdx, target, true);
      return true;
    }

    if (!freeEcho) finishPlayerAction(100);
    return true;
  }

  /* ---------- Items & Tomes ---------- */
  function useItem(idx) {
    if (!state || state.over) return;
    stopAuto();
    const pl = state.player;
    const it = pl.items[idx];
    if (!it) return;
    const def = G.ITEMS[it.id];

    if (it.id === 'hpPotion') {
      const amt = Math.max(15, Math.round(pl.maxHp * 0.5));
      pl.hp = Math.min(pl.maxHp, pl.hp + amt);
      pl.poison = 0; pl.burn = 0;
      G.Audio.play('potion');
      G.FX.floatText(pl.x, pl.y, `+${amt}`, '#8ff0a8', true);
      log(`回復薬を飲み、HPを ${amt} 回復した。`, 'buff');
    } else if (it.id === 'mpPotion') {
      const amt = Math.max(10, Math.round(pl.maxMp * 0.6));
      pl.mp = Math.min(pl.maxMp, pl.mp + amt);
      G.Audio.play('potion');
      G.FX.floatText(pl.x, pl.y, `MP+${amt}`, '#7fb8ff', true);
      log(`魔力薬を飲み、MPを ${amt} 回復した。`, 'buff');
    } else if (it.id === 'elixir') {
      pl.hp = pl.maxHp; pl.mp = pl.maxMp; pl.poison = 0; pl.burn = 0;
      G.Audio.play('levelup');
      G.FX.elemBurst(pl.x, pl.y, 'holy');
      log('万能の霊薬が全てを癒やした！', 'buff');
    } else if (it.id === 'tpScroll') {
      G.Audio.play('spell', 'arcane');
      randomTeleport();
      log('転移の巻物で空間を跳躍した！', 'spell');
    } else if (it.id === 'mapScroll') {
      state.exp.fill(1);
      G.Audio.play('pickup');
      log('千里眼の巻物が階層の全貌を照らし出した！', 'buff');
    } else if (it.id === 'fireScroll') {
      G.Audio.play('spell', 'fire');
      G.FX.addShake(5);
      for (const m of state.monsters) {
        if (m.hp > 0 && !m.ally && state.vis[m.y * state.level.w + m.x]) {
          damageMonster(m, 14 + state.floor * 2 + pl.pow * 2, 'fire');
          if (m.hp > 0) m.burn = Math.max(m.burn, 3);
        }
      }
      log('業火の巻物が視界の敵を焼き尽くした！', 'spell');
    } else if (it.id === 'frostScroll') {
      G.Audio.play('spell', 'ice');
      for (const m of state.monsters) {
        if (m.hp > 0 && !m.ally && state.vis[m.y * state.level.w + m.x]) {
          m.frozen = Math.max(m.frozen, 3);
          G.FX.elemBurst(m.x, m.y, 'ice');
        }
      }
      log('氷結の巻物が視界の敵を凍りつかせた！', 'spell');
    } else if (it.id === 'vitality') {
      pl.maxHp += 6; pl.hp += 6;
      G.Audio.play('potion');
      log('生命の霊薬により最大HPが 6 上昇した！', 'buff');
    } else if (it.id === 'wisdom') {
      pl.maxMp += 5; pl.mp += 5; pl.pow += 1;
      G.Audio.play('potion');
      log('叡智の霊薬により魔力+1、最大MP+5！', 'buff');
    } else if (it.id === 'tome') {
      learnOrUpgradeSpell(it.spell, idx);
      return;
    }

    pl.items.splice(idx, 1);
    finishPlayerAction(100);
  }

  function learnOrUpgradeSpell(spellId, itemIdx) {
    const pl = state.player;
    const existing = pl.spells.find((s) => s.id === spellId);
    const S = G.SPELLS[spellId];
    if (existing) {
      if (existing.lv >= 2) {
        // Already max -> boost pow slightly
        pl.pow += 1;
        log(`${S.name} は極まっているため、代わりに魔力+1を得た！`, 'buff');
      } else {
        existing.lv++;
        log(`呪文【${S.name}】が Lv.${existing.lv + 1} に強化された！`, 'buff');
      }
      pl.items.splice(itemIdx, 1);
      G.Audio.play('levelup');
      finishPlayerAction(100);
      return;
    }
    if (pl.spells.length < G.MAX_SPELLS) {
      pl.spells.push({ id: spellId, lv: 0 });
      pl.items.splice(itemIdx, 1);
      G.Audio.play('levelup');
      log(`新たな呪文【${S.name}】を習得した！`, 'buff');
      finishPlayerAction(100);
    } else {
      // Need to replace a slot
      state.modalQueue.push({ type: 'replaceSpell', spellId, itemIdx });
      emitUI();
    }
  }

  function replaceSpellSlot(slotIdx, spellId, itemIdx) {
    const pl = state.player;
    const old = pl.spells[slotIdx];
    pl.spells[slotIdx] = { id: spellId, lv: 0 };
    if (itemIdx !== undefined && itemIdx !== null) pl.items.splice(itemIdx, 1);
    G.Audio.play('levelup');
    log(`${G.SPELLS[old.id].name} を忘れ、【${G.SPELLS[spellId].name}】を習得した！`, 'buff');
    finishPlayerAction(100);
  }

  /* ---------- Shrine & Merchant ---------- */
  function useShrine(obj, offerIdx) {
    if (obj.used) return;
    const pl = state.player;
    const offer = obj.offers[offerIdx];
    if (!offer) return;
    if (offer.id === 'pray') {
      pl.hp = pl.maxHp; pl.mp = pl.maxMp; pl.poison = 0; pl.burn = 0;
      log('祭壇に祈りを捧げ、体力と魔力が完全に癒やされた！', 'buff');
    } else if (offer.id === 'blood') {
      if (pl.maxHp <= 8) { log('これ以上命を捧げることはできない！', 'warn'); return; }
      pl.maxHp -= 6; pl.hp = Math.min(pl.hp, pl.maxHp); pl.pow += 2;
      log('血の契約を結び、魔力+2を得た！', 'buff');
    } else if (offer.id === 'gold') {
      if (pl.gold < offer.cost) { log('金貨が足りない！', 'warn'); return; }
      pl.gold -= offer.cost; pl.maxHp += 10; pl.hp += 10;
      log('黄金の献納により最大HP+10を得た！', 'buff');
    } else if (offer.id === 'relic') {
      if (pl.maxHp <= 12) { log('最大HPが足りない！', 'warn'); return; }
      const r = G.Dungeon.randomRelic(state.rng, pl.relics);
      if (!r) { log('これ以上得られる遺物はない。', 'sys'); return; }
      pl.maxHp -= 10; pl.hp = Math.min(pl.hp, pl.maxHp);
      grantRelic(r);
    } else if (offer.id === 'spell') {
      if (pl.gold < offer.cost) { log('金貨が足りない！', 'warn'); return; }
      const upgradable = pl.spells.filter((s) => s.lv < 2);
      if (!upgradable.length) { log('強化できる呪文がない！', 'sys'); return; }
      pl.gold -= offer.cost;
      const sp = state.rng.pick(upgradable);
      sp.lv++;
      log(`叡智の泉が【${G.SPELLS[sp.id].name}】を Lv.${sp.lv + 1} へ導いた！`, 'buff');
    }
    obj.used = true;
    G.Audio.play('levelup');
    saveRun();
    emitUI();
  }

  function buyFromMerchant(obj, idx) {
    const pl = state.player;
    const entry = obj.stock[idx];
    if (!entry || entry.sold) return;
    if (pl.gold < entry.price) { log('金貨が足りない！', 'warn'); G.Audio.play('miss'); return; }
    if (entry.relic) {
      pl.gold -= entry.price;
      entry.sold = true;
      grantRelic(entry.relic);
    } else if (entry.item) {
      if (pl.items.length >= G.MAX_ITEMS) { log('持ち物がいっぱいだ！', 'warn'); return; }
      pl.gold -= entry.price;
      entry.sold = true;
      pl.items.push(entry.item);
      G.Audio.play('coin');
      log(`${G.ITEMS[entry.item.id].name} を購入した。`, 'loot');
    }
    saveRun();
    emitUI();
  }

  /* ---------- Tap / Pathing / Auto-Explore ---------- */
  function stopAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function anyVisibleEnemy() {
    const lv = state.level;
    return state.monsters.some((m) => m.hp > 0 && !m.ally && state.vis[m.y * lv.w + m.x]);
  }

  function handleTileTap(tx, ty) {
    if (!state || state.over || state.busy) return;
    const lv = state.level;
    const pl = state.player;
    if (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h) return;

    // 1. Targeting a spell
    if (state.targeting) {
      const tg = state.targeting;
      const range = G.spellRange(tg.spellId, tg.lv);
      const d = G.dist(pl.x, pl.y, tx, ty);
      if (d === 0 || d > range || !state.vis[ty * lv.w + tx]) {
        state.targeting = null;
        log('詠唱をキャンセルした。', 'sys');
        emitUI();
        return;
      }
      if (G.SPELLS[tg.spellId].target === 'bolt' && !G.FOV.los(lv, pl.x, pl.y, tx, ty)) {
        log('視線が通っていない！', 'warn');
        return;
      }
      castSpell(tg.slotIdx, { x: tx, y: ty });
      return;
    }

    stopAuto();

    // 2. Tap self -> wait or descend stairs
    if (tx === pl.x && ty === pl.y) {
      if (lv.tiles[pl.y * lv.w + pl.x] === T.STAIRS) descendStairs();
      else waitTurn();
      return;
    }

    // 3. Adjacent tap -> direct step/attack/interact
    if (G.dist(pl.x, pl.y, tx, ty) === 1) {
      stepPlayer(tx - pl.x, ty - pl.y);
      return;
    }

    // 4. Distant explored tile -> path walk
    if (!state.exp[ty * lv.w + tx]) return;
    if (!isWalkable(tx, ty) && !objectAt(tx, ty) && !monsterAt(tx, ty)) return;

    const passFn = (x, y) => {
      if (!state.exp[y * lv.w + x]) return Infinity;
      if (!isWalkable(x, y)) return Infinity;
      if (lv.tiles[y * lv.w + x] === T.LAVA) return Infinity;
      const m = monsterAt(x, y);
      if (m && (x !== tx || y !== ty)) return Infinity;
      return 1;
    };
    const path = G.FOV.astar(lv, pl.x, pl.y, tx, ty, passFn, 1500);
    if (!path || !path.length) return;
    walkPath(path);
  }

  function walkPath(path) {
    stopAuto();
    let i = 0;
    function tick() {
      if (!state || state.over || i >= path.length) { stopAuto(); return; }
      const [nx, ny] = path[i++];
      const pl = state.player;
      if (G.dist(pl.x, pl.y, nx, ny) !== 1) { stopAuto(); return; }
      const moved = stepPlayer(nx - pl.x, ny - pl.y);
      if (!moved || state.over || state.modalQueue.length) { stopAuto(); return; }
      if (anyVisibleEnemy()) { stopAuto(); return; }
      if (i < path.length) autoTimer = setTimeout(tick, 95);
    }
    tick();
  }

  function autoExplore() {
    if (!state || state.over) return;
    if (anyVisibleEnemy()) {
      log('視界内に敵がいるため自動探索できない！', 'warn');
      emitUI();
      return;
    }
    stopAuto();
    function step() {
      if (!state || state.over || anyVisibleEnemy() || state.modalQueue.length) { stopAuto(); return; }
      const lv = state.level;
      const pl = state.player;
      // Targets: unexplored adjacent to explored floor, or uncollected items, or unopened chests
      const sources = [];
      for (let y = 1; y < lv.h - 1; y++) for (let x = 1; x < lv.w - 1; x++) {
        const k = y * lv.w + x;
        if (!state.exp[k]) continue;
        if (lv.tiles[k] === T.FLOOR || lv.tiles[k] === T.WATER) {
          // frontier?
          for (const [dx, dy] of G.DIRS8) {
            const nk = (y + dy) * lv.w + (x + dx);
            if (!state.exp[nk] && lv.tiles[nk] !== T.WALL) { sources.push([x, y]); break; }
          }
        }
      }
      for (const it of lv.items) {
        if (state.exp[it.y * lv.w + it.x] && (it.gold || pl.items.length < G.MAX_ITEMS)) sources.push([it.x, it.y]);
      }
      for (const o of lv.objects) if (o.type === 'chest' && !o.open && state.exp[o.y * lv.w + o.x]) sources.push([o.x, o.y]);

      if (!sources.length) {
        if (lv.stairs && state.exp[lv.stairs.y * lv.w + lv.stairs.x] && (pl.x !== lv.stairs.x || pl.y !== lv.stairs.y)) {
          sources.push([lv.stairs.x, lv.stairs.y]);
        } else {
          log('この階層は探索し尽くした！', 'sys');
          stopAuto();
          emitUI();
          return;
        }
      }
      const dmap = G.FOV.dijkstra(lv, sources, (t) => t === T.FLOOR || t === T.STAIRS || t === T.WATER, 80);
      let best = null, bd = dmap[pl.y * lv.w + pl.x];
      for (const [dx, dy] of G.DIRS8) {
        const nx = pl.x + dx, ny = pl.y + dy;
        if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) continue;
        if (monsterAt(nx, ny)) continue;
        const val = dmap[ny * lv.w + nx];
        if (val < bd) { bd = val; best = [dx, dy]; }
      }
      if (!best) { stopAuto(); return; }
      const ok = stepPlayer(best[0], best[1]);
      if (!ok || state.over || anyVisibleEnemy() || state.modalQueue.length) { stopAuto(); return; }
      autoTimer = setTimeout(step, 90);
    }
    step();
  }

  /* ---------- visual interpolation tick ---------- */
  function updateVisuals(dt) {
    if (!state) return;
    const lerpSpeed = 1 - Math.exp(-22 * dt);
    const stepAnim = (e) => {
      if (e.vx === undefined) { e.vx = e.x; e.vy = e.y; }
      e.vx = G.lerp(e.vx, e.x, lerpSpeed);
      e.vy = G.lerp(e.vy, e.y, lerpSpeed);
      if (Math.abs(e.vx - e.x) < 0.01) e.vx = e.x;
      if (Math.abs(e.vy - e.y) < 0.01) e.vy = e.y;
      if (e.hop > 0) e.hop = Math.max(0, e.hop - dt * 5.2);
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
    };
    stepAnim(state.player);
    for (const m of state.monsters) stepAnim(m);
  }

  loadSettings();

  return {
    get state() { return state; },
    onUI(fn) { uiHook = fn; },
    loadSettings, saveSettings,
    loadMeta, saveMeta,
    hasSavedRun, clearRunSave, resumeRun,
    startNewRun,
    stepPlayer, waitTurn, descendStairs,
    selectOrCastSpell, castSpell, useItem, replaceSpellSlot,
    applyBoon, useShrine, buyFromMerchant,
    handleTileTap, autoExplore, stopAuto,
    updateVisuals, actualSpellCost, canAffordSpell,
  };
})();
