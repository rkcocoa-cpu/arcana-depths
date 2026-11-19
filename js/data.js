'use strict';
/* =========================================================
 *  data.js : all game definitions (tiles, biomes, classes,
 *            spells, monsters, items, relics, boons, meta)
 * ========================================================= */

/* ---------- tiles ---------- */
G.TILE = { WALL: 0, FLOOR: 1, STAIRS: 2, WATER: 3, LAVA: 4, PILLAR: 5, CHASM: 6 };
G.TILE_WALK = [false, true, true, true, true, false, false];
G.TILE_OPAQUE = [true, false, false, false, false, true, false];

/* ---------- elements ---------- */
G.ELEM = {
  phys: { name: '物理', color: '#e8e2d0' },
  fire: { name: '炎', color: '#ff8a3a' },
  ice: { name: '氷', color: '#8fe6ff' },
  lightning: { name: '雷', color: '#ffe066' },
  arcane: { name: '星', color: '#ffd27a' },
  poison: { name: '毒', color: '#9be15d' },
  dark: { name: '闇', color: '#d0a0ff' },
  holy: { name: '聖', color: '#fff1b0' },
};

/* ---------- biomes ---------- */
G.BIOMES = [
  {
    id: 'crypt', name: '苔むす地下墓所', sub: 'Mossy Crypt', floors: [1, 3],
    floor: ['#3b3f3c', '#343835', '#444a45', '#2d312e'],
    wall: { top: '#17191c', face: '#4d535a', dark: '#363a40', light: '#646b73', mortar: '#25282c' },
    accent: '#6f9a4c', ambient: [40, 46, 54], memory: [26, 30, 40],
    liquid: 'water', torches: 0.9, crystals: false, cave: 0.1,
    deco: ['bones', 'moss', 'rubble', 'grave', 'moss', 'cobweb'],
    enemies: ['rat', 'slime', 'bat', 'skeleton', 'archer'], boss: 'boneking',
    music: { root: 57, mode: 'aeolian', bpm: 66, pad: 'sine' },
  },
  {
    id: 'crystal', name: '蒼晶の洞窟', sub: 'Crystal Caverns', floors: [4, 6],
    floor: ['#2b3341', '#262e3b', '#323c4c', '#222936'],
    wall: { top: '#10141f', face: '#3a4760', dark: '#2a3448', light: '#4f6182', mortar: '#1a2030' },
    accent: '#6fe3ff', ambient: [30, 40, 60], memory: [20, 26, 44],
    liquid: 'water', torches: 0.15, crystals: true, cave: 0.75,
    deco: ['crystal', 'rubble', 'shroom', 'crystal'],
    enemies: ['spider', 'frostwisp', 'golem', 'goblin', 'bat'], boss: 'colossus',
    music: { root: 62, mode: 'dorian', bpm: 72, pad: 'triangle' },
  },
  {
    id: 'molten', name: '灼熱の溶岩回廊', sub: 'Molten Halls', floors: [7, 9],
    floor: ['#3e2b25', '#36251f', '#4a332a', '#2f201b'],
    wall: { top: '#170d0b', face: '#5c3a2f', dark: '#432a22', light: '#74493a', mortar: '#2a1814' },
    accent: '#ff7a2a', ambient: [58, 36, 30], memory: [36, 22, 22],
    liquid: 'lava', torches: 0.6, crystals: false, cave: 0.45,
    deco: ['ember', 'rubble', 'bones', 'obsidian'],
    enemies: ['imp', 'hound', 'magmaslime', 'darkmage', 'goblin'], boss: 'ignis',
    music: { root: 52, mode: 'phrygian', bpm: 84, pad: 'sawtooth' },
  },
  {
    id: 'void', name: '星喰らいの虚空', sub: 'Astral Void', floors: [10, 12],
    floor: ['#1f2136', '#1b1c30', '#272a46', '#17182a'],
    wall: { top: '#0a0a14', face: '#2f3258', dark: '#22243f', light: '#43477a', mortar: '#151628' },
    accent: '#9fd8ff', ambient: [34, 34, 58], memory: [20, 20, 38],
    liquid: 'chasm', torches: 0.0, crystals: true, cave: 0.35,
    deco: ['star', 'rune', 'rubble', 'star'],
    enemies: ['voideye', 'shadowknight', 'wraith', 'darkmage'], boss: 'voidlord',
    music: { root: 55, mode: 'lydian', bpm: 60, pad: 'sine' },
  },
];
G.MAX_FLOOR = 12;
G.biomeFor = (floor) => G.BIOMES[Math.min(3, Math.floor((floor - 1) / 3))];
G.isBossFloor = (floor) => floor % 3 === 0;

/* ---------- classes ---------- */
G.CLASSES = {
  astro: {
    name: '星詠み', en: 'Astromancer', hp: 28, mp: 24, pow: 0, def: 0,
    spells: ['missile', 'blink'], robe: '#2f7f86', robeDark: '#1d555c', hat: '#2a6c73', trim: '#e8c170',
    passive: '星の加護：レベルアップ時にMPが全回復する。',
    desc: '星の魔力を操る魔導士。自動追尾の魔力の矢と瞬間移動で戦場を自在に駆ける。',
    cost: 0,
  },
  pyro: {
    name: '炎術士', en: 'Pyromancer', hp: 34, mp: 20, pow: 1, def: 0,
    spells: ['firebolt'], robe: '#a83a32', robeDark: '#6e231f', hat: '#8f2f2a', trim: '#ffb04a',
    passive: '業火の心得：炎魔法のダメージ+20%、燃焼ダメージ+1。',
    desc: '紅蓮の炎を宿す術士。高い体力と火力で敵をまとめて焼き尽くす。',
    cost: 20,
  },
  cryo: {
    name: '氷術士', en: 'Cryomancer', hp: 32, mp: 24, pow: 0, def: 1,
    spells: ['iceshard', 'shield'], robe: '#4f86b8', robeDark: '#2f5a85', hat: '#dfeaf2', trim: '#bff0ff',
    passive: '絶対零度：凍結・冷気状態の敵へのダメージ+35%。',
    desc: '永久凍土の秘術を継ぐ者。氷の刃で敵を鈍らせ、障壁で身を守りながら仕留める。',
    cost: 45,
  },
  hemo: {
    name: '血術士', en: 'Hemomancer', hp: 40, mp: 14, pow: 1, def: 0,
    spells: ['drain'], robe: '#3a2a3a', robeDark: '#241824', hat: '#2d1f2d', trim: '#e04b5a',
    passive: '血の契約と渇望：MP不足分をHPで代用でき、敵を倒すとHP+2回復。',
    desc: '禁じられた血の魔術を使う異端者。命を糧に魔術を放ち、敵の精気を吸い取る。',
    cost: 75,
  },
};
G.CLASS_ORDER = ['astro', 'pyro', 'cryo', 'hemo'];

/* ---------- spells ----------
 * target: 'auto' (nearest enemies), 'bolt' (projectile to target), 'tile', 'self'
 * powScale: multiplier on player.pow added to rolled spell effect
 */
G.SPELLS = {
  missile: {
    name: '魔力の矢', elem: 'arcane', cost: [2, 3, 3], target: 'auto', range: 7,
    n: [2, 3, 4], dmg: [[2, 4], [3, 4], [3, 5]], powScale: 0.25,
    desc: (l, s) => `視界内の敵へ自動追尾する星の矢を${s.n[l]}本放つ（各${s.dmg[l][0]}〜${s.dmg[l][1]}＋魔力補正）。`,
  },
  firebolt: {
    name: 'ファイアボルト', elem: 'fire', cost: [3, 3, 4], target: 'bolt', range: 7,
    dmg: [[6, 9], [8, 12], [11, 15]], burn: [3, 4, 4], powScale: 1.4,
    desc: (l, s) => `炎の矢で${s.dmg[l][0]}〜${s.dmg[l][1]}ダメージ、${s.burn[l]}ターン燃焼。` + (l >= 2 ? '着弾時に周囲へ爆発する。' : ''),
  },
  iceshard: {
    name: 'アイスシャード', elem: 'ice', cost: [2, 3, 3], target: 'bolt', range: 7,
    dmg: [[5, 8], [8, 11], [10, 14]], freeze: [1, 2, 2], chill: 3, powScale: 1.35,
    desc: (l, s) => `氷の刃で${s.dmg[l][0]}〜${s.dmg[l][1]}ダメージ、${s.freeze[l]}ターン凍結と冷気を付与。` + (l >= 2 ? '敵を貫通する。' : ''),
  },
  lightning: {
    name: '連鎖の雷', elem: 'lightning', cost: [5, 5, 5], target: 'bolt', range: 6,
    dmg: [[7, 11], [10, 14], [13, 19]], chain: [2, 3, 4], powScale: 1.4,
    desc: (l, s) => `雷撃で${s.dmg[l][0]}〜${s.dmg[l][1]}ダメージ。近くの敵へ最大${s.chain[l]}回連鎖する。`,
  },
  nova: {
    name: 'フロストノヴァ', elem: 'ice', cost: [5, 5, 6], target: 'self', range: 0,
    radius: [2, 2, 3], dmg: [[4, 7], [6, 10], [9, 14]], freeze: [2, 2, 3], chill: 4, powScale: 1.3,
    desc: (l, s) => `周囲${s.radius[l]}マスの敵に${s.dmg[l][0]}〜${s.dmg[l][1]}ダメージ、${s.freeze[l]}ターン凍結＋冷気。`,
  },
  blink: {
    name: 'ブリンク', elem: 'arcane', cost: [3, 2, 2], target: 'tile', range: [4, 5, 6],
    dmg: [[0, 0], [0, 0], [5, 9]], powScale: 1.2,
    desc: (l, s) => `視界内の${s.range[l]}マス以内へ瞬間移動する。` + (l >= 2 ? '到着地点の周囲に星の衝撃波。' : ''),
  },
  heal: {
    name: '癒しの光', elem: 'holy', cost: [6, 5, 5], target: 'self', range: 0,
    pct: [0.32, 0.45, 0.60],
    desc: (l, s) => `最大HPの${Math.round(s.pct[l] * 100)}%＋魔力×2を回復し、毒と燃焼を浄化する。`,
  },
  shield: {
    name: '魔力障壁', elem: 'arcane', cost: [5, 5, 4], target: 'self', range: 0,
    amt: [10, 16, 24], dur: 15,
    desc: (l, s) => `${s.amt[l]}（＋魔力×2）ダメージを吸収する障壁を${s.dur}ターン展開する。`,
  },
  meteor: {
    name: 'メテオ', elem: 'fire', cost: [9, 8, 8], target: 'tile', range: 7,
    radius: [1, 1, 1], dmg: [[14, 21], [19, 28], [25, 36]], powScale: 2.0,
    desc: (l, s) => `天より隕石を呼び、3×3範囲に${s.dmg[l][0]}〜${s.dmg[l][1]}ダメージ。炎上地帯を残す。`,
  },
  venom: {
    name: '毒霧', elem: 'poison', cost: [4, 4, 5], target: 'tile', range: 6,
    radius: [1, 1, 2], pdmg: [3, 4, 5], dur: [6, 7, 8], powScale: 0.4,
    desc: (l, s) => `${s.dur[l]}ターン残る毒の霧を生む。霧の中の敵は毎ターン${s.pdmg[l]}（＋魔力補正）の毒ダメージ。`,
  },
  drain: {
    name: '吸命の刻印', elem: 'dark', cost: [3, 3, 4], target: 'bolt', range: 6,
    dmg: [[5, 8], [7, 11], [10, 15]], heal: [0.6, 0.75, 0.9], powScale: 1.3,
    desc: (l, s) => `闇の刻印で${s.dmg[l][0]}〜${s.dmg[l][1]}ダメージ、与ダメージの${Math.round(s.heal[l] * 100)}%を吸収。`,
  },
  summon: {
    name: '星霊召喚', elem: 'arcane', cost: [8, 7, 7], target: 'self', range: 0,
    hp: [18, 28, 40], atk: [[4, 6], [5, 8], [7, 11]], dur: [25, 30, 40], powScale: 0.6,
    desc: (l, s) => `共に戦う星霊を${s.dur[l]}ターン召喚する（HP${s.hp[l]}、攻撃${s.atk[l][0]}〜${s.atk[l][1]}、魔力で強化）。`,
  },
  timestop: {
    name: '時の静止', elem: 'arcane', cost: [11, 10, 9], target: 'self', range: 0,
    turns: [3, 4, 5],
    desc: (l, s) => `時を止め、敵は${s.turns[l]}ターン行動できない（ボスは半減）。`,
  },
};
G.SPELL_POOL = ['missile', 'firebolt', 'iceshard', 'lightning', 'nova', 'blink', 'heal', 'shield', 'meteor', 'venom', 'drain', 'summon', 'timestop'];
G.SPELL_RARITY = { missile: 1, firebolt: 1, iceshard: 1, lightning: 0.9, nova: 0.9, blink: 0.85, heal: 0.95, shield: 0.9, meteor: 0.6, venom: 0.8, drain: 0.85, summon: 0.65, timestop: 0.4 };
G.MAX_SPELLS = 6;
G.spellCost = (id, lv) => G.SPELLS[id].cost[lv];
G.spellRange = (id, lv) => { const r = G.SPELLS[id].range; return Array.isArray(r) ? r[lv] : r; };

/* ---------- monsters ---------- */
G.MONSTERS = {
  rat: { name: '大ネズミ', sprite: 'rat', hp: 5, atk: [1, 2], def: 0, spd: 115, xp: 2, gold: [1, 3] },
  slime: { name: 'スライム', sprite: 'slime', hp: 8, atk: [1, 3], def: 0, spd: 80, xp: 3, gold: [1, 3] },
  bat: { name: '吸血コウモリ', sprite: 'bat', hp: 6, atk: [1, 3], def: 0, spd: 135, xp: 4, ai: 'erratic', fly: true },
  skeleton: { name: '骸骨兵', sprite: 'skeleton', hp: 12, atk: [2, 4], def: 1, spd: 100, xp: 5, resist: { poison: 0, holy: 1.5 }, gold: [2, 5], undead: true },
  archer: { name: '骸骨弓兵', sprite: 'archer', hp: 9, atk: [1, 2], def: 0, spd: 100, xp: 6, ai: 'ranged', minFloor: 2,
    ranged: { range: 6, dmg: [2, 4], elem: 'phys', proj: 'arrow', chance: 0.7 }, resist: { poison: 0, holy: 1.5 }, gold: [2, 5], undead: true },
  spider: { name: '晶蜘蛛', sprite: 'spider', hp: 14, atk: [3, 5], def: 1, spd: 115, xp: 8, onHit: { poison: 3, chance: 0.35 } },
  frostwisp: { name: '氷霊', sprite: 'frostwisp', hp: 12, atk: [2, 3], def: 0, spd: 100, xp: 9, ai: 'ranged', fly: true, light: '#7fdfff',
    ranged: { range: 5, dmg: [3, 5], elem: 'ice', proj: 'ice', chance: 0.65, chill: 0.4 }, resist: { ice: 0.25, fire: 1.6 } },
  golem: { name: '岩石ゴーレム', sprite: 'golem', hp: 29, atk: [4, 7], def: 2, spd: 70, xp: 13, resist: { poison: 0, lightning: 0.6 }, gold: [3, 8] },
  goblin: { name: 'ゴブリン戦士', sprite: 'goblin', hp: 17, atk: [3, 5], def: 1, spd: 100, xp: 8, gold: [5, 11] },
  mimic: { name: 'ミミック', sprite: 'mimic', hp: 28, atk: [5, 8], def: 2, spd: 100, xp: 18, mimic: true, gold: [18, 35] },
  imp: { name: '炎の小鬼', sprite: 'imp', hp: 16, atk: [3, 5], def: 0, spd: 115, xp: 13, ai: 'ranged', fly: true, light: '#ff9a4a',
    ranged: { range: 5, dmg: [4, 6], elem: 'fire', proj: 'fire', chance: 0.6, burn: 0.35 }, resist: { fire: 0.25, ice: 1.6 } },
  hound: { name: '地獄の猟犬', sprite: 'hound', hp: 23, atk: [4, 7], def: 1, spd: 128, xp: 14, resist: { fire: 0.5, ice: 1.3 } },
  magmaslime: { name: '溶岩スライム', sprite: 'magmaslime', hp: 27, atk: [4, 7], def: 1, spd: 80, xp: 15, light: '#ff7a2a',
    onHit: { burn: 2, chance: 0.45 }, resist: { fire: 0.25, ice: 1.6 }, lavaWalk: true },
  darkmage: { name: '闇の魔導士', sprite: 'darkmage', hp: 21, atk: [2, 4], def: 1, spd: 100, xp: 17, ai: 'caster', light: '#c79bff',
    ranged: { range: 6, dmg: [4, 7], elem: 'dark', proj: 'dark', chance: 0.65 }, blinker: true, gold: [8, 16] },
  voideye: { name: '虚無の眼', sprite: 'voideye', hp: 25, atk: [3, 5], def: 1, spd: 95, xp: 19, ai: 'ranged', fly: true,
    ranged: { range: 7, dmg: [5, 8], elem: 'dark', proj: 'beam', chance: 0.58 } },
  shadowknight: { name: '影の騎士', sprite: 'shadowknight', hp: 38, atk: [6, 10], def: 4, spd: 100, xp: 24, resist: { dark: 0.35, poison: 0.5, holy: 1.5 }, gold: [10, 20] },
  wraith: { name: '怨霊', sprite: 'wraith', hp: 26, atk: [4, 7], def: 0, spd: 115, xp: 21, fly: true, onHit: { drainMp: 3, chance: 0.5 },
    resist: { ice: 0.5, poison: 0, holy: 2 }, ghost: true },
  /* summons / minions */
  shard: { name: '晶片', sprite: 'shard', hp: 10, atk: [3, 5], def: 1, spd: 100, xp: 3, minion: true, light: '#6fe3ff' },
  wisp: { name: '星霊', sprite: 'wisp', hp: 18, atk: [4, 6], def: 1, spd: 120, xp: 0, ally: true, fly: true, light: '#ffe08a' },
  /* bosses */
  boneking: { name: '骸骨王グラヴォス', sprite: 'boneking', hp: 75, atk: [4, 7], def: 2, spd: 90, xp: 65, boss: true, scale: 1.5,
    resist: { poison: 0, holy: 1.5 }, gold: [65, 90], undead: true },
  colossus: { name: '晶核の巨像', sprite: 'colossus', hp: 155, atk: [6, 9], def: 3, spd: 75, xp: 130, boss: true, scale: 1.65, light: '#6fe3ff',
    resist: { poison: 0, ice: 0.5, lightning: 1.3 }, gold: [110, 145] },
  ignis: { name: '炎竜イグニス', sprite: 'ignis', hp: 235, atk: [7, 11], def: 3, spd: 100, xp: 210, boss: true, scale: 1.6, light: '#ff8a3a',
    resist: { fire: 0.35, ice: 1.4 }, gold: [160, 220] },
  voidlord: { name: '星喰らいの魔王ネザル', sprite: 'voidlord', hp: 360, atk: [8, 13], def: 4, spd: 100, xp: 0, boss: true, scale: 1.65, light: '#b9a8ff',
    resist: { dark: 0.4, poison: 0.5, holy: 1.3 } },
};

/* ---------- items ---------- */
G.ITEMS = {
  hpPotion: { name: '回復薬', icon: 'potion_red', desc: 'HPを最大値の50%（最低15）回復し、毒と燃焼を治す。', price: 28, weight: 30 },
  mpPotion: { name: '魔力薬', icon: 'potion_blue', desc: 'MPを最大値の60%（最低12）回復する。', price: 28, weight: 26 },
  elixir: { name: '万能の霊薬', icon: 'potion_gold', desc: 'HPとMPを完全に回復し、全ての状態異常を治す。', price: 85, weight: 5, minFloor: 3 },
  tpScroll: { name: '転移の巻物', icon: 'scroll_teal', desc: 'この階層のどこかへランダムに転移する。', price: 24, weight: 8 },
  mapScroll: { name: '千里眼の巻物', icon: 'scroll_gold', desc: 'この階層の地図と宝の位置を明らかにする。', price: 30, weight: 7 },
  fireScroll: { name: '業火の巻物', icon: 'scroll_red', desc: '視界内の全ての敵を業火で焼き払う。', price: 42, weight: 8, minFloor: 2 },
  frostScroll: { name: '氷結の巻物', icon: 'scroll_blue', desc: '視界内の全ての敵を3ターン凍結＋冷気状態にする。', price: 38, weight: 8, minFloor: 2 },
  tome: { name: '魔導書', icon: 'tome', desc: '呪文を習得する。既に知っている呪文なら強化する。', price: 75, weight: 8 },
  vitality: { name: '生命の霊薬', icon: 'potion_green', desc: '最大HPが永続的に8上昇する。', price: 65, weight: 4, minFloor: 2 },
  wisdom: { name: '叡智の霊薬', icon: 'potion_violet', desc: '魔力が永続的に1、最大MPが5上昇する。', price: 75, weight: 4, minFloor: 2 },
};
G.MAX_ITEMS = 10;

/* ---------- relics ---------- */
G.RELICS = {
  emberSigil: { name: '炎の紋章', icon: 'r_sigil_fire', desc: '炎魔法のダメージ+35%。' },
  frostHeart: { name: '氷晶の心臓', icon: 'r_heart_ice', desc: '氷魔法のダメージ+35%、凍結時間+1。' },
  stormRing: { name: '雷鳴の指輪', icon: 'r_ring_storm', desc: '雷魔法のダメージ+35%、連鎖+1。' },
  sageStone: { name: '賢者の石', icon: 'r_stone', desc: 'MPの自然回復速度が2倍になる。' },
  vampFang: { name: '吸血の牙', icon: 'r_fang', desc: '近接攻撃でHP2回復。敵を倒すとHP3回復。' },
  ironWard: { name: '鉄の護符', icon: 'r_amulet', desc: '防御+2。' },
  quill: { name: '魔導書の栞', icon: 'r_quill', desc: '全ての呪文の消費MP-1（最低1）。' },
  phoenix: { name: '不死鳥の羽', icon: 'r_feather', desc: '一度だけ、倒れた時にHP50%で蘇る。' },
  starEye: { name: '星見の瞳', icon: 'r_eye', desc: '視界+2。各階層で階段と近くの罠が見える。' },
  thornCloak: { name: '茨の外套', icon: 'r_cloak', desc: '近接攻撃を受けると攻撃者に5ダメージを返す。' },
  luckyCoin: { name: '幸運の金貨', icon: 'r_coin', desc: '入手する金貨+50%。アイテムのドロップ率上昇。' },
  berserk: { name: '狂戦士の血', icon: 'r_blood', desc: 'HPが35%以下の時、与えるダメージ+50%。' },
  manaWell: { name: '魔力の泉', icon: 'r_well', desc: '最大MP+12。' },
  lifeFruit: { name: '生命の果実', icon: 'r_fruit', desc: '最大HP+20。' },
  echoTome: { name: '残響の魔導書', icon: 'r_tome', desc: '攻撃呪文が22%の確率で無償で再詠唱される。' },
  swiftBoots: { name: '疾風の靴', icon: 'r_boots', desc: '移動にかかる時間が25%短くなる。' },
  arcaneLens: { name: '魔導レンズ', icon: 'r_lens', desc: '魔力+2。' },
  venomGland: { name: '毒蛇の牙', icon: 'r_venom', desc: '毒ダメージ2倍。近接攻撃に毒を付与。' },
};

/* ---------- level-up stat boons ---------- */
G.BOONS = {
  hp: { name: '頑強', icon: 'b_hp', desc: '最大HP+8（同量回復）。' },
  mp: { name: '魔力容量', icon: 'b_mp', desc: '最大MP+5（同量回復）。' },
  pow: { name: '魔力増幅', icon: 'b_pow', desc: '魔力+1。全ての呪文のダメージが上昇。' },
  def: { name: '鉄壁', icon: 'b_def', desc: '防御+1。物理と魔法ダメージを軽減。' },
  regen: { name: '瞑想', icon: 'b_regen', desc: 'MPの自然回復速度+40%。' },
  vigor: { name: '再生', icon: 'b_vigor', desc: 'HPの自然回復速度+60%。' },
};

/* ---------- shrine bargains ---------- */
G.SHRINES = [
  { id: 'pray', name: '祈りを捧げる', desc: 'HPとMPを完全に回復する。', w: 4 },
  { id: 'blood', name: '血の契約', desc: '最大HP-6 ／ 魔力+2', w: 3 },
  { id: 'gold', name: '黄金の献納', desc: '金貨{cost}を捧げ、最大HP+10', w: 3 },
  { id: 'relic', name: '魂の取引', desc: '最大HP-10 ／ ランダムな遺物を得る', w: 2 },
  { id: 'spell', name: '叡智の泉', desc: '金貨{cost}を捧げ、ランダムな呪文を強化', w: 3 },
];

/* ---------- meta progression ---------- */
G.META = {
  vitality: { name: '星の生命力', desc: '開始時の最大HP+4', max: 5, cost: (l) => 10 + l * 10 },
  wisdom: { name: '星の叡智', desc: '開始時の最大MP+3', max: 5, cost: (l) => 10 + l * 10 },
  potion: { name: '旅支度', desc: '回復薬を1つ追加で持って開始', max: 3, cost: (l) => 15 + l * 15 },
  fortune: { name: '黄金の導き', desc: '入手する金貨+15%', max: 3, cost: (l) => 20 + l * 20 },
  insight: { name: '天啓', desc: 'レベルアップ時の選択肢+1', max: 1, cost: () => 80 },
  heirloom: { name: '家宝', desc: 'ランダムな遺物を1つ持って開始', max: 1, cost: () => 110 },
};

/* ---------- xp curve ---------- */
G.xpFor = (lvl) => Math.floor(10 + 6.5 * Math.pow(lvl, 1.52));
