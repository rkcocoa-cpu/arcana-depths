'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  game.js : Meta-progression, Gacha, Gear Merge,
 *            Physics Ricochet Combat, Orb Merge & ★EVO,
 *            3-Choice Draft, Boss AI, Wave & Event Loop
 * ========================================================= */
G.Game = (function () {
  const COLS = 7;
  const ROWS = 9;
  const BALL_SPEED = 14.0; // grid cells per second
  const BALL_RADIUS = 0.17;
  const MAX_ACTIVE_BALLS = 36;

  let meta = null;
  let state = null;
  let uiCallback = null;

  function onUI(fn) {
    uiCallback = fn;
  }
  function emitUI(event = null) {
    if (uiCallback) uiCallback(state, meta, event);
  }

  /* =========================================================
   *  1. META-PROGRESSION & PERSISTENT STORAGE
   * ========================================================= */
  function defaultMeta() {
    const w1 = { uid: G.uid(), tplId: 'w_astrolabe', slot: 'weapon', rarity: 2, lv: 1 };
    const t1 = { uid: G.uid(), tplId: 't_almagest', slot: 'tome', rarity: 1, lv: 1 };
    const a1 = { uid: G.uid(), tplId: 'a_aegis', slot: 'amulet', rarity: 1, lv: 1 };
    return {
      version: G.VERSION,
      gold: 450,
      gems: 1200,
      selectedHero: 'valen',
      unlockedHeroes: ['valen'],
      heroLevels: { valen: 1, aria: 1, igna: 1, seris: 1, nox: 1 },
      talents: { atk: 0, hp: 0, orbs: 0, crit: 0, combo: 0, shield: 0, reroll: 0, gold: 0 },
      inventory: [w1, t1, a1],
      equipped: { weapon: w1.uid, tome: t1.uid, ring: null, amulet: a1.uid },
      pity: 0,
      selectedChapter: 1,
      chaptersCleared: {},
      bestWaves: {},
      claimedMissions: {},
      patrolLastClaim: Date.now() - 3600 * 1000 * 2, // Start with 2h of patrol ready to claim!
      stats: {
        wavesCleared: 0,
        maxCombo: 0,
        totalMerges: 0,
        totalEvos: 0,
        totalKills: 0,
        totalSummons: 0,
        totalTalents: 0,
        ch1Clear: 0,
        ch2Clear: 0,
        ch3Clear: 0,
        ch4Clear: 0,
        ch5Clear: 0,
      },
    };
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const def = defaultMeta();
        meta = Object.assign(def, parsed);
        meta.talents = Object.assign(def.talents, parsed.talents || {});
        meta.heroLevels = Object.assign(def.heroLevels, parsed.heroLevels || {});
        meta.stats = Object.assign(def.stats, parsed.stats || {});
        meta.equipped = Object.assign(def.equipped, parsed.equipped || {});
        if (!Array.isArray(meta.inventory)) meta.inventory = def.inventory;
        if (!G.HEROES[meta.selectedHero]) meta.selectedHero = 'valen';
        return meta;
      }
    } catch (e) { /* ignore */ }
    meta = defaultMeta();
    saveMeta();
    return meta;
  }

  function saveMeta() {
    try {
      localStorage.setItem(G.SAVE_KEY, JSON.stringify(meta));
    } catch (e) { /* ignore */ }
  }

  function getGearItem(uid) {
    if (!uid || !meta) return null;
    return meta.inventory.find((it) => it.uid === uid) || null;
  }

  function calcGearStat(item) {
    if (!item) return 0;
    const slotDef = G.GEAR_SLOTS[item.slot];
    const rarDef = G.RARITIES[item.rarity] || G.RARITIES[1];
    return Math.round(slotDef.base * rarDef.mult * (1 + (item.lv - 1) * 0.18));
  }

  function calcTotalStats(heroId = meta.selectedHero) {
    const h = G.HEROES[heroId] || G.HEROES.valen;
    const hLv = meta.heroLevels[heroId] || 1;
    const tal = meta.talents;

    let atk = Math.round(h.baseAtk * (1 + (hLv - 1) * 0.12)) + (tal.atk || 0) * 6;
    let maxHp = Math.round(h.baseHp * (1 + (hLv - 1) * 0.12)) + (tal.hp || 0) * 45;
    let baseOrbs = h.baseOrbs + (tal.orbs || 0) + (heroId === 'valen' ? 2 : 0);
    let critRate = 0.08 + (tal.crit || 0) * 0.03;
    let critDmg = 1.65;
    let comboBonus = 1.0 + (tal.combo || 0) * 0.08;
    let orbDmgPct = 0;
    let startShield = (tal.shield || 0) * 35;
    let rerolls = 1 + (tal.reroll || 0);
    let goldMult = 1.0 + (tal.gold || 0) * 0.12;
    let revive = false;

    for (const slot of Object.keys(G.GEAR_SLOTS)) {
      const it = getGearItem(meta.equipped[slot]);
      if (!it) continue;
      const val = calcGearStat(it);
      if (slot === 'weapon') atk += val;
      if (slot === 'tome') orbDmgPct += val;
      if (slot === 'ring') critRate += val * 0.01;
      if (slot === 'amulet') maxHp += val;

      if (it.tplId === 'w_astrolabe') baseOrbs += 1;
      if (it.tplId === 'r_comet') critDmg += 0.35;
      if (it.tplId === 'a_aegis') startShield += Math.round(maxHp * 0.15);
      if (it.tplId === 'a_phoenix') revive = true;
      if (it.tplId === 'a_fortune') goldMult += 0.25;
    }

    const power = Math.round(
      atk * 3.2 +
      maxHp * 0.32 +
      baseOrbs * 18 +
      critRate * 250 +
      orbDmgPct * 3.5 +
      startShield * 0.4
    );

    return {
      heroId,
      atk,
      maxHp,
      baseOrbs,
      critRate: Math.min(0.85, critRate),
      critDmg,
      comboBonus,
      orbDmgMult: 1 + orbDmgPct / 100,
      startShield,
      rerolls,
      goldMult,
      revive,
      power,
    };
  }

  /* ---------- Hero Unlock & Upgrade ---------- */
  function unlockOrUpgradeHero(heroId) {
    const h = G.HEROES[heroId];
    if (!h) return { ok: false, msg: '不明な英雄です' };
    if (!meta.unlockedHeroes.includes(heroId)) {
      if (meta.gems < h.unlockCost) {
        return { ok: false, msg: `星晶石が不足しています（必要: 💎${h.unlockCost}）` };
      }
      meta.gems -= h.unlockCost;
      meta.unlockedHeroes.push(heroId);
      meta.selectedHero = heroId;
      G.Audio.play('evo');
      saveMeta();
      emitUI();
      return { ok: true, msg: `${h.name}を解放し、出撃英雄に設定しました！` };
    }
    const lv = meta.heroLevels[heroId] || 1;
    const cost = Math.round(100 * Math.pow(1.42, lv - 1));
    if (meta.gold < cost) {
      return { ok: false, msg: `金貨が不足しています（必要: 🪙${cost}）` };
    }
    meta.gold -= cost;
    meta.heroLevels[heroId] = lv + 1;
    G.Audio.play('levelup');
    saveMeta();
    emitUI();
    return { ok: true, msg: `${h.name}が Lv.${lv + 1} に成長しました！` };
  }

  function selectHero(heroId) {
    if (meta.unlockedHeroes.includes(heroId)) {
      meta.selectedHero = heroId;
      G.Audio.play('tap');
      saveMeta();
      emitUI();
    }
  }

  /* ---------- Talent Upgrade ---------- */
  function getTalentCost(talentId) {
    const def = G.TALENTS.find((t) => t.id === talentId);
    if (!def) return 999999;
    const lv = meta.talents[talentId] || 0;
    return Math.round(def.baseCost * Math.pow(def.costMult, lv));
  }

  function upgradeTalent(talentId) {
    const def = G.TALENTS.find((t) => t.id === talentId);
    if (!def) return { ok: false };
    const lv = meta.talents[talentId] || 0;
    if (lv >= def.maxLv) return { ok: false, msg: '最大レベルに到達しています' };
    const cost = getTalentCost(talentId);
    if (meta.gold < cost) return { ok: false, msg: `金貨が不足しています（必要: 🪙${cost}）` };
    meta.gold -= cost;
    meta.talents[talentId] = lv + 1;
    meta.stats.totalTalents = (meta.stats.totalTalents || 0) + 1;
    G.Audio.play('levelup');
    saveMeta();
    emitUI();
    return { ok: true, msg: `「${def.name}」が Lv.${lv + 1} に上昇！` };
  }

  /* ---------- Gacha Summon & Gear Merge ---------- */
  function summonGacha(count = 1) {
    const cost = count === 10 ? 900 : 100;
    if (meta.gems < cost) {
      return { ok: false, msg: `星晶石が不足しています（必要: 💎${cost}）` };
    }
    meta.gems -= cost;
    const results = [];
    for (let i = 0; i < count; i++) {
      meta.pity = (meta.pity || 0) + 1;
      let rarity = 1;
      const roll = Math.random();
      if (meta.pity >= 10) {
        rarity = roll < 0.28 ? 4 : 3; // Pity guarantees SSR or Mythic UR!
        meta.pity = 0;
      } else if (count === 10 && i === 9 && !results.some((r) => r.rarity >= 2)) {
        rarity = 2;
      } else if (roll < 0.04) {
        rarity = 4;
        meta.pity = 0;
      } else if (roll < 0.18) {
        rarity = 3;
        meta.pity = 0;
      } else if (roll < 0.52) {
        rarity = 2;
      }
      const tpl = G.GEAR_TEMPLATES[Math.floor(Math.random() * G.GEAR_TEMPLATES.length)];
      const item = {
        uid: G.uid(),
        tplId: tpl.id,
        slot: tpl.slot,
        rarity,
        lv: 1,
      };
      meta.inventory.push(item);
      results.push(item);

      // Auto-equip if slot is empty or strictly higher rarity
      const curUid = meta.equipped[item.slot];
      const curItem = getGearItem(curUid);
      if (!curItem || item.rarity > curItem.rarity) {
        meta.equipped[item.slot] = item.uid;
      }
    }
    meta.stats.totalSummons = (meta.stats.totalSummons || 0) + count;
    G.Audio.play('gacha');
    saveMeta();
    emitUI();
    return { ok: true, items: results };
  }

  function equipGear(uid) {
    const it = getGearItem(uid);
    if (!it) return;
    meta.equipped[it.slot] = it.uid;
    G.Audio.play('tap');
    saveMeta();
    emitUI();
  }

  function upgradeGear(uid) {
    const it = getGearItem(uid);
    if (!it) return { ok: false };
    const cost = Math.round(60 * Math.pow(1.38, it.lv - 1));
    if (meta.gold < cost) return { ok: false, msg: `金貨が不足しています（必要: 🪙${cost}）` };
    meta.gold -= cost;
    it.lv += 1;
    G.Audio.play('levelup');
    saveMeta();
    emitUI();
    return { ok: true };
  }

  function mergeAllGear() {
    let mergedCount = 0;
    let changed = true;
    while (changed) {
      changed = false;
      const groups = {};
      for (const it of meta.inventory) {
        if (it.rarity >= 4) continue;
        const key = `${it.tplId}_${it.rarity}`;
        (groups[key] = groups[key] || []).push(it);
      }
      for (const key of Object.keys(groups)) {
        const list = groups[key];
        if (list.length >= 3) {
          // Sort so equipped or highest level item is kept first
          list.sort((a, b) => {
            const aEq = meta.equipped[a.slot] === a.uid ? 1 : 0;
            const bEq = meta.equipped[b.slot] === b.uid ? 1 : 0;
            if (aEq !== bEq) return bEq - aEq;
            return b.lv - a.lv;
          });
          const keep = list[0];
          const sac1 = list[1];
          const sac2 = list[2];
          keep.rarity += 1;
          keep.lv = Math.max(keep.lv, sac1.lv, sac2.lv);
          meta.inventory = meta.inventory.filter((x) => x.uid !== sac1.uid && x.uid !== sac2.uid);
          if (meta.equipped[keep.slot] === sac1.uid || meta.equipped[keep.slot] === sac2.uid) {
            meta.equipped[keep.slot] = keep.uid;
          }
          mergedCount++;
          changed = true;
          break;
        }
      }
    }
    if (mergedCount > 0) {
      G.Audio.play('merge');
      saveMeta();
      emitUI();
    }
    return mergedCount;
  }

  /* ---------- Patrol & Missions ---------- */
  function getPatrolRewardPreview() {
    const elapsedHours = Math.max(0.25, Math.min(12, (Date.now() - (meta.patrolLastClaim || Date.now())) / 3600000));
    const highestCleared = Math.max(1, ...Object.keys(meta.chaptersCleared).map(Number));
    const stats = calcTotalStats();
    const gold = Math.round((90 + highestCleared * 55) * elapsedHours * stats.goldMult);
    const gems = Math.max(25, Math.round((25 + highestCleared * 12) * Math.min(4, elapsedHours)));
    return { gold, gems, hours: elapsedHours };
  }

  function claimPatrol() {
    const rw = getPatrolRewardPreview();
    meta.gold += rw.gold;
    meta.gems += rw.gems;
    // Set last claim to 25 minutes ago so player can still get small patrol boosts after battles
    meta.patrolLastClaim = Date.now() - 15 * 60 * 1000;
    G.Audio.play('coin');
    saveMeta();
    emitUI();
    return rw;
  }

  function claimMission(mId) {
    const m = G.MISSIONS.find((x) => x.id === mId);
    if (!m || meta.claimedMissions[mId]) return { ok: false };
    const cur = meta.stats[m.stat] || 0;
    if (cur < m.goal) return { ok: false, msg: 'まだ達成条件を満たしていません' };
    meta.claimedMissions[mId] = true;
    meta.gems += m.gems;
    G.Audio.play('coin');
    saveMeta();
    emitUI();
    return { ok: true, gems: m.gems };
  }

  /* =========================================================
   *  2. BATTLE ARENA INITIALIZATION & RUN STATE
   * ========================================================= */
  function hasSavedRun() {
    try {
      return !!localStorage.getItem(G.RUN_KEY);
    } catch (e) {
      return false;
    }
  }

  function saveRun() {
    try {
      if (!state || state.over) {
        localStorage.removeItem(G.RUN_KEY);
        return;
      }
      // Only save between volleys (AIM phase)
      if (state.phase === 'AIM') {
        const snap = Object.assign({}, state, { balls: [], queue: [] });
        localStorage.setItem(G.RUN_KEY, JSON.stringify(snap));
      }
    } catch (e) { /* ignore */ }
  }

  function clearSavedRun() {
    try {
      localStorage.removeItem(G.RUN_KEY);
    } catch (e) { /* ignore */ }
  }

  function resumeRun() {
    try {
      const raw = localStorage.getItem(G.RUN_KEY);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      snap.rng = new G.RNG(snap.seed || Date.now());
      snap.balls = [];
      snap.queue = [];
      snap.phase = 'AIM';
      state = snap;
      G.FX.clear();
      emitUI({ type: 'battleStart' });
      return true;
    } catch (e) {
      return false;
    }
  }

  function startBattle(chapterId = meta.selectedChapter || 1) {
    meta.selectedChapter = chapterId;
    saveMeta();
    clearSavedRun();
    G.FX.clear();

    const ch = G.CHAPTERS.find((c) => c.id === chapterId) || G.CHAPTERS[0];
    const heroId = meta.selectedHero || 'valen';
    const hero = G.HEROES[heroId] || G.HEROES.valen;
    const stats = calcTotalStats(heroId);
    const seed = (Date.now() ^ (chapterId * 0x9e3779b9)) >>> 0;
    const rng = new G.RNG(seed);

    // Initialize 6-slot Orb Rack with Hero's starter orb x2 so player can shoot or merge immediately!
    const starterId = hero.starterOrb || 'split';
    const secondId = starterId === 'blaze' ? 'blaze' : starterId;
    const rack = [
      { uid: G.uid(), id: starterId, star: 1, isEvo: false },
      { uid: G.uid(), id: secondId, star: 1, isEvo: false },
      null,
      null,
      null,
      null,
    ];

    state = {
      seed,
      rng,
      chapterId: ch.id,
      chapterName: ch.name,
      wave: 1,
      maxWaves: ch.waves,
      turn: 1,
      phase: 'AIM', // 'AIM' | 'SHOOT' | 'MODAL' | 'OVER'
      over: false,
      victory: false,
      speed: 1,
      autoAim: false,
      selectedRackSlot: null,

      heroId,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      shield: stats.startShield,
      atk: stats.atk,
      baseOrbs: stats.baseOrbs,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      comboBonus: stats.comboBonus,
      orbDmgMult: stats.orbDmgMult,
      rerolls: stats.rerolls,
      goldMult: stats.goldMult,
      revive: stats.revive,

      lv: 1,
      xp: 0,
      xpNext: 30,
      runGold: 0,
      runGems: 0,
      kills: 0,
      combo: 0,
      maxRunCombo: 0,
      ultCharge: 35, // Start with 35% charge
      ultMax: hero.ultCost || 100,
      ultBuffThisTurn: 1.0,

      launchX: 3.5,
      launchY: 8.42,
      nextLaunchX: null,
      aimAngle: -Math.PI / 2,
      flightTime: 0,

      rack,
      catalysts: [],
      perks: {},
      enemies: [],
      gimmicks: [],
      balls: [],
      queue: [],
      queueTimer: 0,
      pendingDrafts: 0,
      pendingEncounter: null,
    };

    spawnWave(1);
    saveRun();
    emitUI({ type: 'battleStart' });
    return state;
  }

  /* =========================================================
   *  3. WAVE, MONSTER, BOSS & GIMMICK SPAWNING
   * ========================================================= */
  function cellOccupied(gx, gy) {
    for (const m of state.enemies) {
      if (m.hp <= 0) continue;
      if (gx >= m.x && gx < m.x + m.w && gy >= m.y && gy < m.y + m.h) return true;
    }
    for (const g of state.gimmicks) {
      if (g.x === gx && g.y === gy) return true;
    }
    return false;
  }

  function makeMonster(mobId, gx, gy, waveScale = 1.0, isElite = false) {
    const ch = G.CHAPTERS.find((c) => c.id === state.chapterId) || G.CHAPTERS[0];
    const def = G.MONSTERS[mobId] || G.MONSTERS.slime;
    const hp = Math.round(def.hp * ch.hpMult * waveScale * (isElite ? 2.1 : 1));
    const atk = Math.round(def.atk * ch.atkMult * (0.9 + state.wave * 0.05) * (isElite ? 1.35 : 1));
    const shield = def.shield ? Math.round(def.shield * ch.hpMult * waveScale) : 0;
    return {
      uid: G.uid(),
      id: mobId,
      name: (isElite ? '★精鋭 ' : '') + def.name,
      isBoss: false,
      isElite,
      role: def.role,
      range: def.range || 1,
      color: def.color,
      x: gx,
      y: gy,
      visX: gx,
      visY: gy,
      w: 1,
      h: 1,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      atk,
      gold: Math.round(def.gold * (isElite ? 2.5 : 1)),
      xp: Math.round(def.xp * (isElite ? 2.2 : 1)),
      burn: 0,
      frozen: 0,
      chill: 0,
      poison: 0,
      shock: 0,
      hitFlash: 0,
    };
  }

  function makeBoss(bossId, gx, gy) {
    const ch = G.CHAPTERS.find((c) => c.id === state.chapterId) || G.CHAPTERS[0];
    const def = G.BOSSES[bossId] || G.BOSSES.boneking;
    const hp = Math.round(def.hp * (0.88 + ch.id * 0.12));
    const atk = Math.round(def.atk);
    return {
      uid: G.uid(),
      id: bossId,
      name: def.name,
      title: def.title,
      portrait: def.portrait,
      isBoss: true,
      isElite: true,
      role: 'boss',
      color: def.color,
      skills: def.skills,
      nextSkillIdx: 0,
      skillCooldown: 2,
      x: gx,
      y: gy,
      visX: gx,
      visY: gy,
      w: 2,
      h: 2,
      hp,
      maxHp: hp,
      shield: Math.round(hp * 0.12),
      maxShield: Math.round(hp * 0.12),
      atk,
      gold: 180 * ch.id,
      xp: 120,
      burn: 0,
      frozen: 0,
      chill: 0,
      poison: 0,
      shock: 0,
      hitFlash: 0,
    };
  }

  function spawnWave(waveNum) {
    const ch = G.CHAPTERS.find((c) => c.id === state.chapterId) || G.CHAPTERS[0];
    const rng = state.rng;
    const waveScale = 0.85 + (waveNum - 1) * 0.22;

    // Final wave spawns the Chapter Giant 2x2 Boss!
    if (waveNum === state.maxWaves && !state.enemies.some((e) => e.isBoss && e.hp > 0)) {
      const bx = 2; // Center columns 2..3
      const by = 1; // Rows 1..2
      // Clear any overlapping cell at (2..3, 1..2)
      state.enemies = state.enemies.filter((m) => !(m.x >= 2 && m.x <= 3 && m.y >= 1 && m.y <= 2));
      state.gimmicks = state.gimmicks.filter((g) => !(g.x >= 2 && g.x <= 3 && g.y >= 1 && g.y <= 2));
      state.enemies.push(makeBoss(ch.boss, bx, by));

      // Escort monsters on flanks
      for (const ex of [0, 1, 5, 6]) {
        if (!cellOccupied(ex, 1) && rng.chance(0.75)) {
          state.enemies.push(makeMonster(rng.pick(ch.mobs), ex, 1, waveScale, false));
        }
      }
      G.FX.shake(8, 0.25);
      return;
    }

    // Normal/Mid-boss wave: spawn 3 to 5 enemies across rows 1..2
    const count = Math.min(6, 3 + Math.floor(waveNum / 2));
    const cols = rng.shuffle([0, 1, 2, 3, 4, 5, 6]);
    let spawned = 0;
    for (const cx of cols) {
      if (spawned >= count) break;
      const cy = spawned % 2 === 0 ? 1 : 2;
      if (cellOccupied(cx, cy)) continue;
      const isElite = waveNum >= 3 && spawned === 0 && rng.chance(0.38);
      const mobId = rng.pick(ch.mobs);
      state.enemies.push(makeMonster(mobId, cx, cy, waveScale, isElite));
      spawned++;
    }

    // Spawn tactical field gimmicks (Mana Bumper, Split Prism, Heal Crystal, Coin Chest)
    // Keep max 3 gimmicks on field
    if (state.gimmicks.length < 3) {
      const gCols = rng.shuffle([1, 2, 3, 4, 5]);
      for (const gx of gCols) {
        const gy = rng.int(3, 5);
        if (!cellOccupied(gx, gy)) {
          const roll = rng.next();
          let kind = 'bumper';
          if (roll < 0.36) kind = 'bumper';
          else if (roll < 0.66) kind = 'prism';
          else if (roll < 0.84) kind = 'heal_gem';
          else kind = 'coin_chest';
          state.gimmicks.push({
            uid: G.uid(),
            kind,
            x: gx,
            y: gy,
            hp: kind === 'bumper' || kind === 'prism' ? 4 : 1,
          });
          break;
        }
      }
    }
  }

  /* =========================================================
   *  4. ORB RACK MERGE & ★EVO AWAKENING SYSTEM
   * ========================================================= */
  function checkAutoEvoInRack() {
    if (!state) return false;
    let evolved = false;
    for (let i = 0; i < state.rack.length; i++) {
      const slot = state.rack[i];
      if (!slot || slot.isEvo || slot.star < 3) continue;
      const orbDef = G.ORBS[slot.id];
      if (orbDef && orbDef.catalyst && state.catalysts.includes(orbDef.catalyst)) {
        slot.id = orbDef.evoId;
        slot.isEvo = true;
        slot.star = 4;
        meta.stats.totalEvos = (meta.stats.totalEvos || 0) + 1;
        evolved = true;
        G.Audio.play('evo');
        G.FX.shake(9, 0.25);
      }
    }
    if (evolved) saveMeta();
    return evolved;
  }

  function findMergePairs() {
    if (!state) return [];
    const pairs = [];
    for (let i = 0; i < state.rack.length; i++) {
      const a = state.rack[i];
      if (!a || a.isEvo || a.star >= 3) continue;
      for (let j = i + 1; j < state.rack.length; j++) {
        const b = state.rack[j];
        if (!b || b.isEvo) continue;
        if (a.id === b.id && a.star === b.star) {
          pairs.push([i, j]);
        }
      }
    }
    return pairs;
  }

  function mergeRackSlots(i, j) {
    if (!state || state.phase !== 'AIM' || i === j) return { ok: false };
    const a = state.rack[i];
    const b = state.rack[j];
    if (!a || !b || a.isEvo || b.isEvo) return { ok: false };
    if (a.id !== b.id || a.star !== b.star || a.star >= 3) return { ok: false };

    a.star += 1;
    state.rack[j] = null;
    state.selectedRackSlot = null;
    meta.stats.totalMerges = (meta.stats.totalMerges || 0) + 1;
    G.Audio.play('merge');

    // Check if reaching ★3 triggers ★EVO awakening immediately!
    const evoTriggered = checkAutoEvoInRack();
    saveMeta();
    saveRun();
    emitUI({ type: evoTriggered ? 'evoAwakened' : 'orbMerged', slotIdx: i });
    return { ok: true, evoTriggered };
  }

  function autoMergeRack() {
    if (!state || state.phase !== 'AIM') return 0;
    let count = 0;
    let pairs = findMergePairs();
    while (pairs.length > 0) {
      const [i, j] = pairs[0];
      mergeRackSlots(i, j);
      count++;
      pairs = findMergePairs();
    }
    // Compact rack slots to left
    const nonNull = state.rack.filter(Boolean);
    for (let k = 0; k < 6; k++) state.rack[k] = nonNull[k] || null;
    emitUI();
    return count;
  }

  function addOrbToRack(orbId, star = 1) {
    if (!state) return;
    // First try empty slot
    const emptyIdx = state.rack.findIndex((s) => !s);
    if (emptyIdx !== -1) {
      state.rack[emptyIdx] = { uid: G.uid(), id: orbId, star, isEvo: false };
      checkAutoEvoInRack();
      return;
    }
    // If rack is full, try auto-merging existing pairs first
    autoMergeRack();
    const emptyAfter = state.rack.findIndex((s) => !s);
    if (emptyAfter !== -1) {
      state.rack[emptyAfter] = { uid: G.uid(), id: orbId, star, isEvo: false };
      checkAutoEvoInRack();
      return;
    }
    // If still full, merge directly with a matching orb in rack or replace lowest star
    const matchIdx = state.rack.findIndex((s) => s && !s.isEvo && s.id === orbId && s.star === star && s.star < 3);
    if (matchIdx !== -1) {
      state.rack[matchIdx].star += 1;
      meta.stats.totalMerges = (meta.stats.totalMerges || 0) + 1;
      G.Audio.play('merge');
      checkAutoEvoInRack();
      return;
    }
    // Replace lowest star slot
    let minIdx = 0;
    for (let i = 1; i < state.rack.length; i++) {
      if (state.rack[i] && state.rack[i].star < state.rack[minIdx].star) minIdx = i;
    }
    state.rack[minIdx] = { uid: G.uid(), id: orbId, star: Math.max(star, state.rack[minIdx].star), isEvo: false };
    checkAutoEvoInRack();
  }

  /* =========================================================
   *  5. PREDICTIVE TRAJECTORY & AIMING
   * ========================================================= */
  function computeTrajectory(angle) {
    if (!state) return { pts: [], hit: null };
    const a = G.clamp(angle, -Math.PI + 0.18, -0.18);
    let x = state.launchX;
    let y = state.launchY;
    let vx = Math.cos(a);
    let vy = Math.sin(a);
    const pts = [[x, y]];
    let bounces = 0;
    const step = 0.06;
    let hit = null;

    for (let it = 0; it < 260; it++) {
      x += vx * step;
      y += vy * step;

      // Wall bounce
      if (x <= BALL_RADIUS) {
        x = BALL_RADIUS;
        vx = Math.abs(vx);
        pts.push([x, y]);
        if (++bounces >= 2) break;
      } else if (x >= COLS - BALL_RADIUS) {
        x = COLS - BALL_RADIUS;
        vx = -Math.abs(vx);
        pts.push([x, y]);
        if (++bounces >= 2) break;
      }
      if (y <= BALL_RADIUS) {
        y = BALL_RADIUS;
        vy = Math.abs(vy);
        pts.push([x, y]);
        if (++bounces >= 2) break;
      }

      // Check collision against enemies
      for (const m of state.enemies) {
        if (m.hp <= 0) continue;
        const col = G.circleAABB(x, y, BALL_RADIUS, m.x + 0.06, m.y + 0.06, m.w - 0.12, m.h - 0.12);
        if (col) {
          pts.push([x, y]);
          const [rvx, rvy] = G.reflect(vx, vy, col.nx, col.ny);
          // Add short reflection preview stub
          pts.push([x + rvx * 1.1, y + rvy * 1.1]);
          hit = { x, y, enemy: m };
          return { pts, hit };
        }
      }
    }
    pts.push([x, y]);
    return { pts, hit };
  }

  function findBestAutoAimAngle() {
    if (!state || !state.enemies.length) return -Math.PI / 2;
    // Prioritize enemies closest to bottom defense line (highest y) or bosses
    const alive = state.enemies.filter((m) => m.hp > 0);
    if (!alive.length) return -Math.PI / 2;
    alive.sort((a, b) => (b.y + b.h) - (a.y + a.h));
    const target = alive[0];
    const tx = target.x + target.w * 0.5 + (Math.random() - 0.5) * 0.25;
    const ty = target.y + target.h * 0.5;
    const raw = Math.atan2(ty - state.launchY, tx - state.launchX);
    return G.clamp(raw, -Math.PI + 0.22, -0.22);
  }

  /* =========================================================
   *  6. FIRING VOLLEY & CONTINUOUS 2D PHYSICS SIMULATION
   * ========================================================= */
  function buildVolleyQueue() {
    const specialSlots = state.rack.filter(Boolean);
    const totalNormal = state.baseOrbs + (state.catalysts.includes('cat_star') ? 3 : 0);
    const q = [];

    // Interleave Special Orbs and Normal Star Orbs so special effects trigger throughout the volley!
    let sIdx = 0;
    let nCount = 0;
    while (sIdx < specialSlots.length || nCount < totalNormal) {
      if (sIdx < specialSlots.length) {
        const sp = specialSlots[sIdx++];
        q.push({ kind: sp.id, star: sp.star, isEvo: sp.isEvo });
      }
      for (let k = 0; k < 2 && nCount < totalNormal; k++) {
        q.push({ kind: 'normal', star: 1, isEvo: false });
        nCount++;
      }
    }
    return q;
  }

  function fireVolley(angle = state.aimAngle) {
    if (!state || state.phase !== 'AIM' || state.over) return false;
    const clamped = G.clamp(angle, -Math.PI + 0.18, -0.18);
    state.aimAngle = clamped;
    state.phase = 'SHOOT';
    state.combo = 0;
    state.flightTime = 0;
    state.nextLaunchX = null;
    state.queue = buildVolleyQueue();
    state.queueTimer = 0;
    clearSavedRun();
    G.Audio.play('shoot');
    emitUI();
    return true;
  }

  function spawnBallFromQueue(item, x, y, angle) {
    let color = '#38d9e8';
    let icon = 'orb_normal';
    if (item.isEvo && G.EVO_ORBS[item.kind]) {
      color = G.EVO_ORBS[item.kind].color;
      icon = G.EVO_ORBS[item.kind].icon;
    } else if (G.ORBS[item.kind]) {
      color = G.ORBS[item.kind].color;
      icon = G.ORBS[item.kind].icon;
    }
    state.balls.push({
      uid: G.uid(),
      kind: item.kind,
      star: item.star || 1,
      isEvo: !!item.isEvo,
      isSub: !!item.isSub,
      color,
      icon,
      x,
      y,
      vx: Math.cos(angle) * BALL_SPEED,
      vy: Math.sin(angle) * BALL_SPEED,
      r: item.isEvo ? 0.21 : item.kind === 'normal' ? 0.15 : 0.18,
      bounces: 0,
      wallBonus: 1.0,
      bumperBonus: 1.0,
      lastHitUid: null,
      trail: [],
    });
  }

  function recallOrbs() {
    if (!state || state.phase !== 'SHOOT') return;
    state.queue.length = 0;
    for (const b of state.balls) {
      G.FX.burst(b.x, b.y, b.color, 5, 2.0);
    }
    state.balls.length = 0;
    onVolleyEnd();
  }

  /* ---------- Hero Active Ultimate Skill ---------- */
  function useUltimate() {
    if (!state || state.over || state.ultCharge < state.ultMax) return false;
    if (state.phase !== 'AIM' && state.phase !== 'SHOOT') return false;
    state.ultCharge = 0;
    const h = G.HEROES[state.heroId] || G.HEROES.valen;
    G.Audio.play('ult');
    G.FX.shake(12, 0.35);

    const alive = state.enemies.filter((m) => m.hp > 0);
    const baseUltDmg = Math.round(state.atk * 4.2 * state.orbDmgMult);

    if (state.heroId === 'valen') {
      state.ultBuffThisTurn = 1.4;
      for (let i = 0; i < 14; i++) {
        const m = alive[i % Math.max(1, alive.length)];
        if (m) {
          G.FX.beam(state.launchX, state.launchY, m.x + m.w / 2, m.y + m.h / 2, '#38d9e8', 0.22, 0.28, false);
          damageEnemy(m, Math.round(baseUltDmg * 0.45), 'star', true);
        }
      }
    } else if (state.heroId === 'aria') {
      // Cross laser barrage across entire field
      for (const m of alive) {
        G.FX.beam(0, m.y + m.h / 2, COLS, m.y + m.h / 2, '#3ed68e', 0.32, 0.32, false);
        G.FX.beam(m.x + m.w / 2, 0, m.x + m.w / 2, ROWS, '#38d9e8', 0.28, 0.32, false);
        m.shock = Math.max(m.shock, 3);
        damageEnemy(m, Math.round(baseUltDmg * 1.15), 'laser', true);
      }
    } else if (state.heroId === 'igna') {
      // Ragnarok Meteor
      G.FX.ring(3.5, 3.5, 3.6, '#ff6e40', 0.45);
      for (const m of alive) {
        m.burn = Math.max(m.burn, 4);
        damageEnemy(m, Math.round(baseUltDmg * 1.35), 'fire', true);
      }
    } else if (state.heroId === 'seris') {
      // Cocytus Zero freeze all + barrier
      state.shield += Math.round(state.maxHp * 0.25);
      for (const m of alive) {
        m.frozen = Math.max(m.frozen, 2);
        m.chill = Math.max(m.chill, 4);
        G.FX.ring(m.x + m.w / 2, m.y + m.h / 2, 1.2, '#45b8ff', 0.35);
        damageEnemy(m, Math.round(baseUltDmg * 1.0), 'ice', true);
      }
    } else if (state.heroId === 'nox') {
      // Crimson Eclipse black hole + life drain
      G.FX.ring(3.5, 3.2, 3.2, '#f25c54', 0.42);
      let totalDealt = 0;
      for (const m of alive) {
        G.FX.beam(3.5, 0.5, m.x + m.w / 2, m.y + m.h / 2, '#f4c563', 0.25, 0.3, true);
        totalDealt += damageEnemy(m, Math.round(baseUltDmg * 1.25), 'crimson', true);
      }
      const heal = Math.max(25, Math.round(totalDealt * 0.22));
      state.hp = Math.min(state.maxHp, state.hp + heal);
      G.FX.floatText(state.launchX, state.launchY - 0.5, `+${heal} HP`, '#3ed68e', true);
    }

    emitUI({ type: 'ultCast', hero: h });
    return true;
  }

  /* ---------- Combat Damage & Special Orb Triggers ---------- */
  function damageEnemy(m, rawDmg, elem = 'star', forceCrit = false) {
    if (!m || m.hp <= 0) return 0;
    let dmg = rawDmg * (state.ultBuffThisTurn || 1.0);

    // Hero element passives
    if (state.heroId === 'aria' && (elem === 'laser' || elem === 'star')) dmg *= 1.35;
    if (state.heroId === 'igna' && elem === 'fire') dmg *= 1.35;
    if (state.heroId === 'seris' && elem === 'ice') dmg *= 1.30;
    if (state.heroId === 'nox' && (elem === 'crimson' || elem === 'lightning')) dmg *= 1.35;
    if (state.heroId === 'nox' && state.hp <= state.maxHp * 0.5) dmg *= 1.40;

    // Status vulnerability multipliers
    if (m.chill > 0 || m.frozen > 0) {
      dmg *= 1.20;
      if (state.catalysts.includes('cat_zero')) dmg *= 1.30;
    }
    if (m.shock > 0) dmg *= 1.25;
    if (state.perks.giant_slayer && (m.isBoss || m.hp >= m.maxHp * 0.5)) dmg *= 1.35;
    if (state.catalysts.includes('cat_sword') && m.isElite) dmg *= 1.35;

    // Crit roll
    let critChance = state.critRate;
    if (state.heroId === 'seris' && (m.frozen > 0 || m.chill > 0)) critChance += 0.35;
    const isCrit = forceCrit || Math.random() < critChance;
    if (isCrit) {
      dmg *= state.critDmg + (state.heroId === 'seris' && m.frozen > 0 ? 0.5 : 0);
    }

    dmg = Math.max(1, Math.round(dmg));

    // Execution perk check
    if (!m.isBoss && state.perks.exec_strike && m.hp - dmg > 0 && (m.hp - dmg) <= m.maxHp * 0.15) {
      dmg = m.hp + m.shield;
      G.FX.floatText(m.x + m.w / 2, m.y, 'EXEC!', '#f25c54', true);
    }

    // Shield absorption
    if (m.shield > 0) {
      const sHit = Math.min(m.shield, dmg);
      m.shield -= sHit;
      dmg -= sHit;
    }
    const actual = Math.min(m.hp, dmg);
    m.hp -= actual;
    m.hitFlash = 0.12;

    const col = isCrit ? '#f4c563' : (G.ELEMS[elem] ? G.ELEMS[elem].color : '#ffffff');
    G.FX.floatText(m.x + m.w / 2, m.y + 0.25, isCrit ? `✦${actual}` : actual, col, isCrit);

    if (m.hp <= 0) {
      onEnemyKilled(m);
    }
    return actual;
  }

  function onEnemyKilled(m) {
    state.kills++;
    meta.stats.totalKills = (meta.stats.totalKills || 0) + 1;
    const goldGain = Math.round(m.gold * state.goldMult);
    state.runGold += goldGain;
    state.xp += m.xp;
    state.ultCharge = Math.min(state.ultMax, state.ultCharge + (m.isElite ? 16 : 6));

    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    G.FX.burst(cx, cy, m.color, m.isBoss ? 36 : 16, m.isBoss ? 4.5 : 3.0);
    G.FX.ring(cx, cy, m.isBoss ? 2.4 : 1.1, m.color, 0.3);

    // Nox passive & Vampire ring heal on kill
    if (state.heroId === 'nox') {
      const h = Math.max(4, Math.round(state.maxHp * 0.03));
      state.hp = Math.min(state.maxHp, state.hp + h);
    }

    // Igna passive: burning enemy explodes on death
    if (state.heroId === 'igna' && m.burn > 0) {
      G.FX.ring(cx, cy, 1.5, '#ff6e40', 0.28);
      for (const other of state.enemies) {
        if (other.hp > 0 && G.dist(cx, cy, other.x + other.w / 2, other.y + other.h / 2) <= 1.65) {
          damageEnemy(other, Math.round(state.atk * 1.1), 'fire', false);
        }
      }
    }

    // Poison spread on death
    if (m.poison > 0) {
      for (const other of state.enemies) {
        if (other.hp > 0 && G.dist(cx, cy, other.x + other.w / 2, other.y + other.h / 2) <= 1.65) {
          other.poison += m.poison;
        }
      }
    }

    // Check level up threshold
    while (state.xp >= state.xpNext) {
      state.xp -= state.xpNext;
      state.lv += 1;
      state.xpNext = Math.round(state.xpNext * 1.32 + 12);
      state.pendingDrafts += 1;
    }
  }

  function triggerBallHitEffect(b, target) {
    state.combo += 1;
    if (state.combo > state.maxRunCombo) state.maxRunCombo = state.combo;
    if (state.combo > (meta.stats.maxCombo || 0)) meta.stats.maxCombo = state.combo;

    const ultGain = state.perks.ult_overdrive ? 2.2 : 1.5;
    state.ultCharge = Math.min(state.ultMax, state.ultCharge + ultGain);

    // Valen passive: every 20 combo fires a homing starlight bolt
    if (state.heroId === 'valen' && state.combo % 20 === 0) {
      const alive = state.enemies.filter((e) => e.hp > 0);
      if (alive.length) {
        const pick = alive[Math.floor(Math.random() * alive.length)];
        G.FX.beam(b.x, b.y, pick.x + pick.w / 2, pick.y + pick.h / 2, '#38d9e8', 0.2, 0.22, false);
        damageEnemy(pick, Math.round(state.atk * 1.25), 'star', false);
      }
    }

    // Combo multiplier calculation
    const comboStep = (state.perks.combo_amp ? 0.016 : 0.01) * state.comboBonus;
    const comboMult = 1 + Math.min(2.5, state.combo * comboStep);
    let baseHit = state.atk * comboMult * b.wallBonus * b.bumperBonus;
    b.wallBonus = 1.0;

    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;

    if (b.kind === 'normal') {
      const isCrit = Math.random() < state.critRate;
      G.Audio.playBounce(state.combo, isCrit);
      G.FX.burst(b.x, b.y, '#38d9e8', 5, 1.8);
      damageEnemy(target, baseHit, 'star', isCrit);
      return false;
    }

    // Special Orb or ★EVO Orb
    baseHit *= state.orbDmgMult;
    const starIdx = G.clamp((b.star || 1) - 1, 0, 2);

    if (b.isEvo && G.EVO_ORBS[b.kind]) {
      const eo = G.EVO_ORBS[b.kind];
      const dmg = baseHit * eo.dmgMult;
      G.Audio.playBounce(state.combo, true);

      if (b.kind === 'evo_supernova') {
        G.Audio.play('explosion');
        G.FX.ring(cx, cy, eo.aoeRadius, '#ff9e2c', 0.32);
        G.FX.burst(cx, cy, '#ff6e40', 16, 3.4);
        for (const m of state.enemies) {
          if (m.hp > 0 && G.dist(cx, cy, m.x + m.w / 2, m.y + m.h / 2) <= eo.aoeRadius) {
            m.burn = Math.max(m.burn, eo.burnTurns);
            const burnBonus = Math.min(m.maxHp * 0.04, state.atk * 4);
            damageEnemy(m, dmg + burnBonus, 'fire', false);
          }
        }
      } else if (b.kind === 'evo_blizzard') {
        G.Audio.play('freeze');
        G.FX.ring(cx, cy, eo.aoeRadius, '#80e5ff', 0.3);
        for (const m of state.enemies) {
          if (m.hp > 0 && G.dist(cx, cy, m.x + m.w / 2, m.y + m.h / 2) <= eo.aoeRadius) {
            m.chill = Math.max(m.chill, 4);
            const shatter = m.frozen > 0 ? Math.min(m.maxHp * 0.05, state.atk * 4.5) : 0;
            if (Math.random() < eo.freezeChance) m.frozen = Math.max(m.frozen, 1);
            damageEnemy(m, dmg + shatter, 'ice', false);
          }
        }
      } else if (b.kind === 'evo_thunderstorm') {
        G.Audio.play('lightning');
        target.shock = Math.max(target.shock, 3);
        damageEnemy(target, dmg, 'lightning', false);
        const others = state.enemies
          .filter((m) => m.hp > 0 && m.uid !== target.uid)
          .slice(0, eo.chains);
        let prev = { x: cx, y: cy };
        for (const m of others) {
          const mx = m.x + m.w / 2, my = m.y + m.h / 2;
          G.FX.beam(prev.x, prev.y, mx, my, '#ffe866', 0.24, 0.24, true);
          m.shock = Math.max(m.shock, 2);
          damageEnemy(m, dmg * 0.75, 'lightning', false);
          prev = { x: mx, y: my };
        }
      } else if (b.kind === 'evo_crosslaser') {
        G.Audio.play('laser');
        G.FX.beam(0, cy, COLS, cy, '#64ffda', 0.34, 0.25, false);
        G.FX.beam(cx, 0, cx, ROWS, '#38d9e8', 0.34, 0.25, false);
        for (const m of state.enemies) {
          if (m.hp <= 0) continue;
          const mx = m.x + m.w / 2, my = m.y + m.h / 2;
          if (Math.abs(mx - cx) <= 0.85 || Math.abs(my - cy) <= 0.85 || Math.abs(Math.abs(mx - cx) - Math.abs(my - cy)) <= 0.65) {
            damageEnemy(m, dmg * 0.85, 'laser', false);
          }
        }
      } else if (b.kind === 'evo_meteor_swarm') {
        damageEnemy(target, dmg, 'star', false);
        if (b.bounces % eo.splitEvery === 0 && state.balls.length < MAX_ACTIVE_BALLS) {
          for (const da of [-0.45, 0.45]) {
            const ang = Math.atan2(b.vy, b.vx) + da;
            spawnBallFromQueue({ kind: 'split', star: 2, isEvo: false, isSub: true }, b.x, b.y, ang);
          }
        }
      } else if (b.kind === 'evo_blackhole') {
        G.FX.ring(cx, cy, eo.pullRadius, '#ff758f', 0.32);
        for (const m of state.enemies) {
          if (m.hp > 0 && G.dist(cx, cy, m.x + m.w / 2, m.y + m.h / 2) <= eo.pullRadius) {
            m.shield = Math.max(0, m.shield - Math.round(dmg * 0.5));
            damageEnemy(m, dmg, 'crimson', false);
          }
        }
      } else if (b.kind === 'evo_bloodmoon') {
        G.FX.ring(cx, cy, 1.5, '#ff4d6d', 0.28);
        const dealt = damageEnemy(target, dmg, 'crimson', false);
        const heal = Math.max(6, Math.round(dealt * 0.12));
        if (state.hp < state.maxHp) {
          state.hp = Math.min(state.maxHp, state.hp + heal);
        } else {
          state.shield = Math.min(state.maxHp, state.shield + Math.round(heal * 0.6));
        }
      } else if (b.kind === 'evo_excalibur') {
        G.FX.beam(cx, 0, cx, cy + 0.4, '#fff176', 0.42, 0.3, false);
        G.FX.ring(cx, cy, 1.6, '#f4c563', 0.28);
        const mult = target.isElite ? eo.bossBonus : 1.0;
        damageEnemy(target, dmg * mult, 'lightning', true);
      }
      return false;
    }

    // Standard ★1..★3 Special Orbs
    const def = G.ORBS[b.kind];
    if (!def) {
      damageEnemy(target, baseHit, 'star', false);
      return false;
    }
    const dmg = baseHit * def.dmgMult[starIdx];
    G.Audio.playBounce(state.combo, false);

    if (b.kind === 'blaze') {
      const rad = def.aoeRadius[starIdx] * (state.catalysts.includes('cat_blast') ? 1.25 : 1);
      G.Audio.play('explosion');
      G.FX.ring(cx, cy, rad, '#ff6e40', 0.25);
      for (const m of state.enemies) {
        if (m.hp > 0 && G.dist(cx, cy, m.x + m.w / 2, m.y + m.h / 2) <= rad) {
          m.burn = Math.max(m.burn, def.burnTurns[starIdx]);
          damageEnemy(m, dmg, 'fire', false);
        }
      }
    } else if (b.kind === 'frost') {
      target.chill = Math.max(target.chill, 3);
      if (Math.random() < def.freezeChance[starIdx]) {
        target.frozen = Math.max(target.frozen, 1);
        G.Audio.play('freeze');
        G.FX.floatText(cx, cy - 0.2, 'FREEZE!', '#45b8ff', true);
      }
      damageEnemy(target, dmg, 'ice', false);
    } else if (b.kind === 'volt') {
      G.Audio.play('lightning');
      damageEnemy(target, dmg, 'lightning', false);
      const maxChains = def.chains[starIdx] + (state.catalysts.includes('cat_tesla') ? 1 : 0);
      const others = state.enemies
        .filter((m) => m.hp > 0 && m.uid !== target.uid && G.dist(cx, cy, m.x + m.w / 2, m.y + m.h / 2) <= 3.2)
        .slice(0, maxChains);
      let prev = { x: cx, y: cy };
      for (const m of others) {
        const mx = m.x + m.w / 2, my = m.y + m.h / 2;
        G.FX.beam(prev.x, prev.y, mx, my, '#f4c563', 0.18, 0.2, true);
        damageEnemy(m, dmg * 0.65, 'lightning', false);
        prev = { x: mx, y: my };
      }
    } else if (b.kind === 'laser') {
      G.Audio.play('laser');
      const mode = def.mode[starIdx];
      if (mode === 'horiz' || mode === 'cross') {
        G.FX.beam(0, cy, COLS, cy, '#3ed68e', 0.22, 0.2, false);
      }
      if (mode === 'vert' || mode === 'cross') {
        G.FX.beam(cx, 0, cx, ROWS, '#3ed68e', 0.22, 0.2, false);
      }
      for (const m of state.enemies) {
        if (m.hp <= 0) continue;
        const mx = m.x + m.w / 2, my = m.y + m.h / 2;
        const hitH = (mode === 'horiz' || mode === 'cross') && Math.abs(my - cy) <= 0.75;
        const hitV = (mode === 'vert' || mode === 'cross') && Math.abs(mx - cx) <= 0.75;
        if (hitH || hitV) damageEnemy(m, dmg * 0.78, 'laser', false);
      }
    } else if (b.kind === 'split') {
      damageEnemy(target, dmg, 'star', false);
      if (!b.isSub && b.bounces % def.splitEvery[starIdx] === 0 && state.balls.length < MAX_ACTIVE_BALLS) {
        const ang = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? 0.5 : -0.5);
        spawnBallFromQueue({ kind: 'normal', star: 1, isEvo: false, isSub: true }, b.x, b.y, ang);
      }
    } else if (b.kind === 'void') {
      const rad = def.pullRadius[starIdx];
      G.FX.ring(cx, cy, rad, '#e07a5f', 0.26);
      for (const m of state.enemies) {
        if (m.hp > 0 && G.dist(cx, cy, m.x + m.w / 2, m.y + m.h / 2) <= rad) {
          damageEnemy(m, dmg, 'crimson', false);
        }
      }
    } else if (b.kind === 'vamp') {
      const dealt = damageEnemy(target, dmg, 'crimson', false);
      if (b.bounces % 3 === 1 && dealt > 0) {
        const heal = Math.max(3, Math.round(dealt * def.healPct[starIdx] * (state.catalysts.includes('cat_blood') ? 1.35 : 1)));
        state.hp = Math.min(state.maxHp, state.hp + heal);
      }
    } else if (b.kind === 'holy') {
      G.FX.beam(cx, Math.max(0, cy - 2.2), cx, cy + 0.3, '#ffe082', 0.28, 0.22, false);
      const mult = target.isElite ? def.bossBonus[starIdx] : 1.0;
      damageEnemy(target, dmg * mult, 'lightning', false);
    } else if (b.kind === 'sniper') {
      const forceCrit = Math.random() < (state.critRate + def.critAdd[starIdx]);
      damageEnemy(target, dmg, 'star', forceCrit);
      if (target.hp <= 0 || (b.star >= 3 && forceCrit)) {
        return true; // Pierce straight through without reflecting!
      }
    } else if (b.kind === 'poison') {
      target.poison = (target.poison || 0) + def.poisonStacks[starIdx];
      damageEnemy(target, dmg, 'laser', false);
    }

    return false;
  }

  /* ---------- Frame Physics Update ---------- */
  function update(dt) {
    if (!state || state.over) return;

    // Smooth monster visual position interpolation & hit flash decay
    for (const m of state.enemies) {
      m.visX = G.lerp(m.visX, m.x, Math.min(1, dt * 14));
      m.visY = G.lerp(m.visY, m.y, Math.min(1, dt * 14));
      if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - dt);
    }

    // Auto-Aim firing in AIM phase
    if (state.phase === 'AIM' && state.autoAim && !state.pendingDrafts && !state.pendingEncounter) {
      state.autoTimer = (state.autoTimer || 0) + dt;
      if (state.autoTimer >= 0.45) {
        state.autoTimer = 0;
        autoMergeRack();
        if (state.ultCharge >= state.ultMax) useUltimate();
        fireVolley(findBestAutoAimAngle());
      }
    }

    if (state.phase !== 'SHOOT') return;

    const simDt = dt * (state.speed || 1);
    state.flightTime += simDt;

    // Launch queued balls
    if (state.queue.length > 0) {
      state.queueTimer -= simDt;
      while (state.queue.length > 0 && state.queueTimer <= 0) {
        const nextItem = state.queue.shift();
        spawnBallFromQueue(nextItem, state.launchX, state.launchY, state.aimAngle);
        state.queueTimer += 0.055;
      }
    }

    // Sub-stepped physics simulation (4 substeps prevent tunneling even at 3x speed)
    const SUBS = 4;
    const subDt = simDt / SUBS;

    for (let s = 0; s < SUBS; s++) {
      for (let i = state.balls.length - 1; i >= 0; i--) {
        const b = state.balls[i];

        // Record motion trail on first substep
        if (s === 0) {
          b.trail.push([b.x, b.y]);
          if (b.trail.length > 7) b.trail.shift();
        }

        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // Anti-infinite horizontal bounce safeguard: nudge vy downward if stuck horizontally
        if (Math.abs(b.vy) < 1.1) {
          b.vy += (b.vy >= 0 ? 1 : -1) * 1.4;
        }
        if (b.bounces > 38) {
          b.vy += 4.5 * subDt;
        }

        // Left / Right / Top Wall reflections
        if (b.x <= b.r) {
          b.x = b.r;
          b.vx = Math.abs(b.vx);
          b.bounces++;
          b.lastHitUid = null;
          if (state.perks.wall_bounce) b.wallBonus = 1.35;
        } else if (b.x >= COLS - b.r) {
          b.x = COLS - b.r;
          b.vx = -Math.abs(b.vx);
          b.bounces++;
          b.lastHitUid = null;
          if (state.perks.wall_bounce) b.wallBonus = 1.35;
        }
        if (b.y <= b.r) {
          b.y = b.r;
          b.vy = Math.abs(b.vy);
          b.bounces++;
          b.lastHitUid = null;
          if (state.perks.wall_bounce) b.wallBonus = 1.35;
        }

        // Bottom catch line
        if (b.y >= state.launchY + 0.12 && b.vy > 0) {
          if (state.nextLaunchX === null && !b.isSub) {
            state.nextLaunchX = G.clamp(b.x, 0.65, COLS - 0.65);
          }
          G.FX.burst(b.x, state.launchY, b.color, 4, 1.5);
          state.balls.splice(i, 1);
          continue;
        }

        // Field Gimmick collisions
        for (let gi = state.gimmicks.length - 1; gi >= 0; gi--) {
          const g = state.gimmicks[gi];
          const gx = g.x + 0.5, gy = g.y + 0.5;
          const d = G.dist(b.x, b.y, gx, gy);
          if (d <= b.r + 0.34 && b.lastHitUid !== g.uid) {
            b.lastHitUid = g.uid;
            if (g.kind === 'bumper') {
              const nx = (b.x - gx) / (d || 1);
              const ny = (b.y - gy) / (d || 1);
              [b.vx, b.vy] = G.reflect(b.vx, b.vy, nx, ny);
              const amp = state.heroId === 'aria' ? 1.5 : 1.25;
              b.bumperBonus = Math.min(2.2, b.bumperBonus * amp);
              state.ultCharge = Math.min(state.ultMax, state.ultCharge + 6);
              state.combo++;
              G.Audio.playBounce(state.combo, true);
              G.FX.ring(gx, gy, 0.9, '#38d9e8', 0.22);
              g.hp--;
            } else if (g.kind === 'prism') {
              if (!b.isSub && state.balls.length < MAX_ACTIVE_BALLS) {
                const ang = Math.atan2(b.vy, b.vx) + 0.38;
                spawnBallFromQueue({ kind: b.kind, star: b.star, isEvo: b.isEvo, isSub: true }, b.x, b.y, ang);
                G.FX.burst(gx, gy, '#3ed68e', 8, 2.4);
              }
              g.hp--;
            } else if (g.kind === 'heal_gem') {
              const heal = Math.round(state.maxHp * 0.16);
              state.hp = Math.min(state.maxHp, state.hp + heal);
              G.FX.floatText(gx, gy, `+${heal} HP`, '#3ed68e', true);
              G.Audio.play('coin');
              g.hp = 0;
            } else if (g.kind === 'coin_chest') {
              const gold = Math.round((25 + state.chapterId * 15) * state.goldMult);
              state.runGold += gold;
              state.xp += 18;
              G.FX.floatText(gx, gy, `+${gold}G`, '#f4c563', true);
              G.Audio.play('coin');
              g.hp = 0;
            }
            if (g.hp <= 0) state.gimmicks.splice(gi, 1);
          }
        }

        // Enemy AABB collisions
        for (let mi = 0; mi < state.enemies.length; mi++) {
          const m = state.enemies[mi];
          if (m.hp <= 0) continue;
          const col = G.circleAABB(b.x, b.y, b.r, m.x + 0.05, m.y + 0.05, m.w - 0.10, m.h - 0.10);
          if (col) {
            b.bounces++;
            const pierced = triggerBallHitEffect(b, m);
            if (!pierced) {
              b.x += col.nx * (col.overlap + 0.005);
              b.y += col.ny * (col.overlap + 0.005);
              [b.vx, b.vy] = G.reflect(b.vx, b.vy, col.nx, col.ny);
              // Add slight random jitter if bouncing purely vertically
              if (Math.abs(b.vx) < 0.35) b.vx += (Math.random() - 0.5) * 2.2;
            }
            b.lastHitUid = m.uid;
            break;
          }
        }
      }
    }

    // Clean up dead enemies
    state.enemies = state.enemies.filter((m) => m.hp > 0);

    // Check if all balls have returned and queue is empty
    if (state.queue.length === 0 && state.balls.length === 0) {
      onVolleyEnd();
    }
  }

  /* =========================================================
   *  7. END OF VOLLEY, ENEMY TURN & WAVE ADVANCE
   * ========================================================= */
  function damagePlayer(rawDmg, label = '') {
    let dmg = Math.max(1, Math.round(rawDmg));
    if (state.shield > 0) {
      const s = Math.min(state.shield, dmg);
      state.shield -= s;
      dmg -= s;
    }
    state.hp = Math.max(0, state.hp - dmg);
    G.Audio.play('hitPlayer');
    G.FX.shake(9, 0.24);
    G.FX.floatText(state.launchX, state.launchY - 0.6, `-${rawDmg}${label ? ' ' + label : ''}`, '#f25c54', true);

    if (state.hp <= 0) {
      if (state.revive) {
        state.revive = false;
        state.hp = Math.round(state.maxHp * 0.5);
        G.FX.ring(state.launchX, state.launchY, 2.2, '#f4c563', 0.4);
        G.FX.floatText(state.launchX, state.launchY - 1.0, '★不死鳥蘇生★', '#f4c563', true);
        G.Audio.play('evo');
      } else {
        finishBattle(false);
      }
    }
  }

  function onVolleyEnd() {
    if (!state || state.over) return;
    if (state.nextLaunchX !== null) {
      state.launchX = state.nextLaunchX;
      state.nextLaunchX = null;
    }
    state.ultBuffThisTurn = 1.0;

    // 1. Tick Burn & Poison on surviving enemies
    for (const m of state.enemies) {
      if (m.hp <= 0) continue;
      if (m.burn > 0) {
        const bDmg = Math.round(state.atk * 0.45 + m.maxHp * 0.025);
        damageEnemy(m, bDmg, 'fire', false);
        m.burn--;
      }
      if (m.hp > 0 && m.poison > 0) {
        const pDmg = Math.round(m.poison * (state.atk * 0.25));
        damageEnemy(m, pDmg, 'laser', false);
      }
      if (m.chill > 0) m.chill--;
      if (m.shock > 0) m.shock--;
    }
    state.enemies = state.enemies.filter((m) => m.hp > 0);

    // 2. Enemy actions & downward march
    // Sort bottom-up so lower enemies move first
    state.enemies.sort((a, b) => b.y - a.y);

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const m = state.enemies[i];
      if (m.hp <= 0) continue;

      if (m.frozen > 0) {
        m.frozen--;
        G.FX.floatText(m.x + m.w / 2, m.y + 0.3, '凍結中', '#45b8ff', false);
        continue;
      }

      if (m.isBoss) {
        // Boss advances until row 4 (occupying rows 4..5) and uses skills
        if (m.y < 4) {
          m.y += 1;
        }
        m.skillCooldown--;
        if (m.skillCooldown <= 0) {
          m.skillCooldown = 2;
          const skName = m.skills[m.nextSkillIdx % m.skills.length];
          m.nextSkillIdx++;
          G.FX.ring(m.x + 1, m.y + 1, 2.2, m.color, 0.35);
          damagePlayer(m.atk, skName);
          if (state.over) return;
          // Boss also refreshes a small shield or summons an escort
          if (m.nextSkillIdx % 2 === 1) {
            m.shield = Math.min(m.maxShield, m.shield + Math.round(m.maxHp * 0.06));
          }
        }
        continue;
      }

      // Healer monster heals adjacent allies
      if (m.role === 'healer') {
        for (const ally of state.enemies) {
          if (ally.hp > 0 && ally.uid !== m.uid && G.dist(m.x, m.y, ally.x, ally.y) <= 2.2) {
            ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(ally.maxHp * 0.12));
          }
        }
      }

      // Ranged monster shoots if within range
      if (m.role === 'ranged' && m.y >= ROWS - 1 - (m.range || 4)) {
        G.FX.beam(m.x + 0.5, m.y + 0.8, state.launchX, state.launchY, m.color, 0.14, 0.22, false);
        damagePlayer(Math.round(m.atk * 0.65));
        if (state.over) return;
      }

      // Advance 1 row down if not blocked
      const nextY = m.y + 1;
      if (nextY >= 7) {
        // Reached Defense Line! Strikes player once and dissipates
        G.FX.burst(m.x + 0.5, 7.8, '#f25c54', 14, 3.0);
        damagePlayer(m.atk, m.name);
        state.enemies.splice(i, 1);
        if (state.over) return;
      } else if (!cellOccupied(m.x, nextY)) {
        m.y = nextY;
      }
    }

    if (state.over) return;

    // 3. Wave progression & Victory check
    state.turn++;
    meta.stats.wavesCleared = (meta.stats.wavesCleared || 0) + 1;
    const prevBest = meta.bestWaves[state.chapterId] || 0;
    if (state.wave > prevBest) meta.bestWaves[state.chapterId] = state.wave;

    // If on final wave and all enemies (including Boss) are defeated -> VICTORY!
    if (state.wave >= state.maxWaves && state.enemies.length === 0) {
      finishBattle(true);
      return;
    }

    // Advance wave counter if below maxWaves, or if current enemies cleared early
    if (state.wave < state.maxWaves) {
      state.wave++;
      if (state.perks.aegis_shield) {
        state.shield = Math.min(state.maxHp, state.shield + Math.round(state.maxHp * 0.15));
      }
      spawnWave(state.wave);

      // Every 3rd wave triggers a Special Roguelike Encounter (Merchant / Blacksmith / Lucky Wheel)!
      if (!state.pendingEncounter && state.wave % 3 === 0 && state.wave < state.maxWaves) {
        const encTypes = ['wheel', 'blacksmith', 'merchant'];
        state.pendingEncounter = encTypes[(state.wave / 3 - 1) % encTypes.length];
      }
    } else if (state.enemies.length === 0) {
      finishBattle(true);
      return;
    }

    state.phase = 'AIM';
    while (state.xp >= state.xpNext) {
      state.xp -= state.xpNext;
      state.lv += 1;
      state.xpNext = Math.round(state.xpNext * 1.32 + 12);
      state.pendingDrafts += 1;
    }
    saveMeta();
    saveRun();

    // Open Level-Up 3-Choice Draft or Pending Encounter
    if (state.pendingDrafts > 0) {
      state.pendingDrafts--;
      emitUI({ type: 'openDraft', choices: rollDraftChoices() });
    } else if (state.pendingEncounter) {
      const enc = state.pendingEncounter;
      state.pendingEncounter = null;
      emitUI({ type: 'openEncounter', kind: enc });
    } else {
      emitUI();
    }
  }

  /* =========================================================
   *  8. 3-CHOICE SKILL DRAFT & ENCOUNTER RESOLUTION
   * ========================================================= */
  function rollDraftChoices() {
    const pool = [];
    const seenCats = new Set();

    // 1. Check if any ★3 Orb in rack can immediately awaken to ★EVO via its Catalyst!
    for (const slot of state.rack) {
      if (!slot || slot.isEvo) continue;
      const orbDef = G.ORBS[slot.id];
      if (
        orbDef &&
        orbDef.catalyst &&
        !state.catalysts.includes(orbDef.catalyst) &&
        !seenCats.has(orbDef.catalyst)
      ) {
        seenCats.add(orbDef.catalyst);
        const cat = G.CATALYSTS[orbDef.catalyst];
        const hasStar3 = state.rack.some((s) => s && !s.isEvo && s.id === slot.id && s.star >= 3);
        pool.push({
          kind: 'catalyst',
          id: cat.id,
          name: cat.name,
          badge: hasStar3 ? '★即座に神話覚醒！' : '✦覚醒触媒パッシブ',
          rarity: hasStar3 ? 'evo' : 'epic',
          color: cat.color,
          icon: cat.id,
          desc: cat.desc,
          weight: hasStar3 ? 25 : 4.5,
        });
      }
    }

    // 2. Orbs (prioritize matching orbs in rack for easy merging!)
    const rackIds = new Set(state.rack.filter((s) => s && !s.isEvo && s.star < 3).map((s) => s.id));
    for (const id of G.ORB_IDS) {
      const o = G.ORBS[id];
      const inRack = rackIds.has(id);
      pool.push({
        kind: 'orb',
        id: o.id,
        star: 1,
        name: `★1 ${o.name}`,
        badge: inRack ? '✦合成進化チャンス！' : '星霊弾追加',
        rarity: inRack ? 'epic' : 'rare',
        color: o.color,
        icon: o.icon,
        desc: o.desc(1),
        weight: inRack ? 5.5 : 2.2,
      });
    }

    // 3. Battle Perks
    for (const id of G.PERK_IDS) {
      const p = G.PERKS[id];
      pool.push({
        kind: 'perk',
        id: p.id,
        name: p.name,
        badge: '戦術特性',
        rarity: 'rare',
        color: p.color,
        icon: p.id,
        desc: p.desc,
        weight: 2.0,
      });
    }

    // Pick 3 unique weighted choices
    const picked = [];
    const avail = pool.slice();
    while (picked.length < 3 && avail.length > 0) {
      const choice = state.rng.weighted(avail, (x) => x.weight);
      picked.push(choice);
      const idx = avail.findIndex((x) => x.id === choice.id);
      if (idx !== -1) avail.splice(idx, 1);
    }
    return picked;
  }

  function applyDraftChoice(choice) {
    if (!state || !choice) return;
    if (choice.kind === 'orb') {
      addOrbToRack(choice.id, choice.star || 1);
      autoMergeRack();
    } else if (choice.kind === 'catalyst') {
      if (!state.catalysts.includes(choice.id)) {
        state.catalysts.push(choice.id);
      }
      if (choice.id === 'cat_blood') {
        const boost = Math.round(state.maxHp * 0.25);
        state.maxHp += boost;
        state.hp += boost;
      }
      checkAutoEvoInRack();
    } else if (choice.kind === 'perk') {
      state.perks[choice.id] = (state.perks[choice.id] || 0) + 1;
      if (choice.id === 'multiball') state.baseOrbs += 3;
      if (choice.id === 'crit_master') {
        state.critRate = Math.min(0.9, state.critRate + 0.15);
        state.critDmg += 0.35;
      }
      if (choice.id === 'aegis_shield') {
        state.hp = Math.min(state.maxHp, state.hp + Math.round(state.maxHp * 0.35));
        state.shield += Math.round(state.maxHp * 0.15);
      }
      if (choice.id === 'ult_overdrive') {
        state.ultCharge = Math.min(state.ultMax, state.ultCharge + Math.round(state.ultMax * 0.5));
      }
    }

    G.Audio.play('levelup');
    saveRun();

    // Check if more drafts or encounters are queued
    if (state.pendingDrafts > 0) {
      state.pendingDrafts--;
      emitUI({ type: 'openDraft', choices: rollDraftChoices() });
    } else if (state.pendingEncounter) {
      const enc = state.pendingEncounter;
      state.pendingEncounter = null;
      emitUI({ type: 'openEncounter', kind: enc });
    } else {
      emitUI();
    }
  }

  function finishBattle(isVictory) {
    state.over = true;
    state.victory = isVictory;
    state.phase = 'OVER';
    clearSavedRun();

    const ch = G.CHAPTERS.find((c) => c.id === state.chapterId) || G.CHAPTERS[0];
    let firstClearGems = 0;
    if (isVictory) {
      meta.bestWaves[state.chapterId] = state.maxWaves;
      if (!meta.chaptersCleared[state.chapterId]) {
        meta.chaptersCleared[state.chapterId] = true;
        firstClearGems = ch.firstGems;
      }
      meta.stats[`ch${state.chapterId}Clear`] = (meta.stats[`ch${state.chapterId}Clear`] || 0) + 1;
      state.runGold += ch.clearGold;
      state.runGems += firstClearGems + 80;
      G.Audio.play('victory');
    } else {
      state.runGems += Math.max(15, state.wave * 8);
      G.Audio.play('defeat');
    }

    meta.gold += state.runGold;
    meta.gems += state.runGems;
    saveMeta();
    emitUI({
      type: 'battleEnd',
      victory: isVictory,
      gold: state.runGold,
      gems: state.runGems,
      firstClearGems,
    });
  }

  return {
    COLS,
    ROWS,
    get meta() { return meta; },
    get state() { return state; },
    onUI,
    loadMeta,
    saveMeta,
    getGearItem,
    calcGearStat,
    calcTotalStats,
    unlockOrUpgradeHero,
    selectHero,
    getTalentCost,
    upgradeTalent,
    summonGacha,
    equipGear,
    upgradeGear,
    mergeAllGear,
    getPatrolRewardPreview,
    claimPatrol,
    claimMission,
    hasSavedRun,
    resumeRun,
    startBattle,
    findMergePairs,
    mergeRackSlots,
    autoMergeRack,
    addOrbToRack,
    checkAutoEvoInRack,
    computeTrajectory,
    fireVolley,
    recallOrbs,
    useUltimate,
    rollDraftChoices,
    applyDraftChoice,
    update,
    finishBattle,
  };
})();
