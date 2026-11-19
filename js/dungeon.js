'use strict';
/* =========================================================
 *  dungeon.js : procedural floor generation
 *  rooms & corridors / caverns / boss arenas, liquids,
 *  decoration, torches, loot, traps, shrines, merchants
 * ========================================================= */
G.Dungeon = {};
(function () {
  const T = G.TILE;

  function makeMap(w, h, fill) {
    return { w, h, tiles: new Array(w * h).fill(fill), deco: new Array(w * h).fill(0) };
  }
  const idx = (m, x, y) => y * m.w + x;
  const inb = (m, x, y) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1;
  const get = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? T.WALL : m.tiles[y * m.w + x]);
  const set = (m, x, y, v) => { if (inb(m, x, y)) m.tiles[y * m.w + x] = v; };

  /* ---------- rooms ---------- */
  function carveRoom(m, r, rng) {
    const shape = r.shape;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        let ok = true;
        if (shape === 'circle') {
          const cx = r.x + (r.w - 1) / 2, cy = r.y + (r.h - 1) / 2;
          const dx = (x - cx) / (r.w / 2), dy = (y - cy) / (r.h / 2);
          ok = dx * dx + dy * dy <= 1.05;
        } else if (shape === 'cross') {
          const qx = Math.floor(r.w / 3), qy = Math.floor(r.h / 3);
          const inX = x >= r.x + qx && x < r.x + r.w - qx;
          const inY = y >= r.y + qy && y < r.y + r.h - qy;
          ok = inX || inY;
        }
        if (ok) set(m, x, y, T.FLOOR);
      }
    }
    if (shape === 'rect' && r.w >= 7 && r.h >= 7 && rng.chance(0.5)) {
      // pillars
      for (let y = r.y + 1; y < r.y + r.h - 1; y += 2) {
        for (let x = r.x + 1; x < r.x + r.w - 1; x += 2) {
          if ((x === r.x + 1 || x === r.x + r.w - 2 || y === r.y + 1 || y === r.y + r.h - 2) && rng.chance(0.8)) {
            if ((x - r.x) % 2 === 1 && (y - r.y) % 2 === 1) set(m, x, y, T.PILLAR);
          }
        }
      }
    }
  }

  function carveCorridor(m, a, b, rng) {
    let x = a.cx, y = a.cy;
    const horizFirst = rng.chance(0.5);
    const wide = rng.chance(0.15);
    const step = (tx, ty) => {
      while (x !== tx || y !== ty) {
        if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
        if (get(m, x, y) === T.WALL || get(m, x, y) === T.PILLAR) set(m, x, y, T.FLOOR);
        if (wide) { if (get(m, x + 1, y) === T.WALL) set(m, x + 1, y, T.FLOOR); }
      }
    };
    if (horizFirst) { step(b.cx, y); step(b.cx, b.cy); } else { step(x, b.cy); step(b.cx, b.cy); }
  }

  function roomsLevel(m, rng, opts) {
    const rooms = [];
    const tries = 120;
    for (let t = 0; t < tries && rooms.length < (opts.maxRooms || 12); t++) {
      const w = rng.int(4, 9), h = rng.int(4, 8);
      const x = rng.int(2, m.w - w - 2), y = rng.int(2, m.h - h - 2);
      const overl = rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y);
      if (overl) continue;
      const roll = rng.next();
      const shape = roll < 0.62 ? 'rect' : roll < 0.82 ? 'circle' : 'cross';
      const r = { x, y, w, h, shape, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
      rooms.push(r);
    }
    rooms.forEach((r) => carveRoom(m, r, rng));
    // MST connect
    const connected = [rooms[0]];
    const rest = rooms.slice(1);
    while (rest.length) {
      let best = null, bd = 1e9, bi = -1;
      for (const a of connected) {
        rest.forEach((b, i) => {
          const d = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
          if (d < bd) { bd = d; best = [a, b]; bi = i; }
        });
      }
      carveCorridor(m, best[0], best[1], rng);
      connected.push(best[1]);
      rest.splice(bi, 1);
    }
    // loops
    for (let k = 0; k < Math.floor(rooms.length / 3); k++) {
      const a = rng.pick(rooms), b = rng.pick(rooms);
      if (a !== b) carveCorridor(m, a, b, rng);
    }
    return rooms;
  }

  /* ---------- caves ---------- */
  function caveLevel(m, rng) {
    const w = m.w, h = m.h;
    let g = new Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      g[y * w + x] = !inb(m, x, y) || rng.chance(0.46) ? 1 : 0;
    }
    const count = (gg, x, y) => {
      let n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue;
        const xx = x + i, yy = y + j;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) n++; else n += gg[yy * w + xx];
      }
      return n;
    };
    for (let it = 0; it < 5; it++) {
      const ng = g.slice();
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const n = count(g, x, y);
        if (n >= 5) ng[y * w + x] = 1;
        else if (n <= 3) ng[y * w + x] = 0;
        // n === 4 keeps its current state
        if (it < 2 && n === 0) ng[y * w + x] = 1; // seed pillars in wide open areas
      }
      g = ng;
    }
    for (let i = 0; i < w * h; i++) m.tiles[i] = g[i] ? T.WALL : T.FLOOR;
    // carve a few cave "rooms" as anchors for spawning
    const rooms = [];
    for (let t = 0; t < 60 && rooms.length < 9; t++) {
      const rw = rng.int(4, 7), rh = rng.int(4, 6);
      const x = rng.int(2, w - rw - 2), y = rng.int(2, h - rh - 2);
      if (rooms.some((r) => x < r.x + r.w + 2 && x + rw + 2 > r.x && y < r.y + r.h + 2 && y + rh + 2 > r.y)) continue;
      const r = { x, y, w: rw, h: rh, shape: 'circle', cx: x + (rw >> 1), cy: y + (rh >> 1) };
      carveRoom(m, r, rng);
      rooms.push(r);
    }
    for (let i = 1; i < rooms.length; i++) carveCorridor(m, rooms[i - 1], rooms[i], rng);
    return rooms;
  }

  /* ---------- connectivity ---------- */
  function flood(m, sx, sy, passFn) {
    const seen = new Uint8Array(m.w * m.h);
    const q = [sy * m.w + sx];
    seen[q[0]] = 1;
    let n = 0;
    while (q.length) {
      const c = q.pop(); n++;
      const x = c % m.w, y = (c / m.w) | 0;
      for (const [dx, dy] of G.DIRS4) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
        const k = yy * m.w + xx;
        if (seen[k] || !passFn(m.tiles[k])) continue;
        seen[k] = 1; q.push(k);
      }
    }
    return { seen, n };
  }
  const safePass = (t) => t === T.FLOOR || t === T.STAIRS || t === T.WATER;

  function pruneUnreachable(m, sx, sy) {
    const { seen } = flood(m, sx, sy, safePass);
    for (let i = 0; i < m.w * m.h; i++) {
      if (!seen[i] && (m.tiles[i] === T.FLOOR || m.tiles[i] === T.WATER)) m.tiles[i] = T.WALL;
    }
  }

  function placeLiquid(m, rng, kind, start, blobs) {
    const tile = kind === 'lava' ? T.LAVA : kind === 'chasm' ? T.CHASM : T.WATER;
    for (let b = 0; b < blobs; b++) {
      const before = m.tiles.slice();
      let x = rng.int(3, m.w - 4), y = rng.int(3, m.h - 4);
      if (get(m, x, y) !== T.FLOOR || G.dist(x, y, start.x, start.y) < 4) continue;
      const size = rng.int(6, 22);
      const placed = [];
      for (let s = 0; s < size; s++) {
        if (get(m, x, y) === T.FLOOR && G.dist(x, y, start.x, start.y) > 2) { set(m, x, y, tile); placed.push([x, y]); }
        const d = rng.pick(G.DIRS4); x = G.clamp(x + d[0], 1, m.w - 2); y = G.clamp(y + d[1], 1, m.h - 2);
      }
      if (tile !== T.WATER) {
        const beforeCount = flood({ ...m, tiles: before }, start.x, start.y, safePass).n;
        const after = flood(m, start.x, start.y, safePass).n;
        if (after < beforeCount - placed.length - 1) m.tiles = before; // broke connectivity
      }
    }
  }

  function bfsDist(m, sx, sy) {
    const d = new Int32Array(m.w * m.h).fill(-1);
    const q = [sy * m.w + sx]; d[q[0]] = 0;
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      const x = c % m.w, y = (c / m.w) | 0;
      for (const [dx, dy] of G.DIRS8) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
        const k = yy * m.w + xx;
        if (d[k] >= 0 || !safePass(m.tiles[k])) continue;
        d[k] = d[c] + 1; q.push(k);
      }
    }
    return d;
  }
  G.Dungeon.bfsDist = bfsDist;

  /* ---------- population helpers ---------- */
  function freeFloor(m, rng, occupied, pred, tries = 400) {
    for (let t = 0; t < tries; t++) {
      const x = rng.int(1, m.w - 2), y = rng.int(1, m.h - 2);
      const k = y * m.w + x;
      if (m.tiles[k] !== T.FLOOR || occupied.has(k)) continue;
      if (pred && !pred(x, y)) continue;
      return { x, y };
    }
    return null;
  }
  function wallsAround(m, x, y) {
    let n = 0;
    for (const [dx, dy] of G.DIRS8) if (G.TILE_OPAQUE[get(m, x + dx, y + dy)]) n++;
    return n;
  }

  G.Dungeon.randomItem = function (rng, floor, opts = {}) {
    const pool = Object.keys(G.ITEMS).filter((k) => (G.ITEMS[k].minFloor || 1) <= floor && !(opts.exclude || []).includes(k));
    const id = rng.weighted(pool, (k) => G.ITEMS[k].weight);
    const it = { id };
    if (id === 'tome') it.spell = rng.weighted(G.SPELL_POOL, (s) => G.SPELL_RARITY[s]);
    return it;
  };
  G.Dungeon.randomRelic = function (rng, owned) {
    const pool = Object.keys(G.RELICS).filter((k) => !owned.includes(k));
    return pool.length ? rng.pick(pool) : null;
  };

  function pickMonster(rng, biome, floor) {
    const pool = biome.enemies.filter((k) => (G.MONSTERS[k].minFloor || 1) <= floor);
    return rng.pick(pool);
  }

  /* ---------- main entry ---------- */
  G.Dungeon.generate = function (floor, rng, ctx) {
    const biome = G.biomeFor(floor);
    const boss = G.isBossFloor(floor);
    const out = boss ? bossArena(floor, rng, biome) : normalLevel(floor, rng, biome, ctx);
    out.biome = biome.id;
    out.floor = floor;
    decorate(out, rng, biome);
    return out;
  };

  function normalLevel(floor, rng, biome, ctx) {
    const size = floor < 4 ? [38, 38] : floor < 7 ? [42, 42] : [44, 44];
    let m, rooms;
    for (let attempt = 0; attempt < 10; attempt++) {
      m = makeMap(size[0], size[1], T.WALL);
      rooms = rng.chance(biome.cave) ? caveLevel(m, rng) : roomsLevel(m, rng, {});
      if (rooms.length >= 4) break;
    }
    const startRoom = rooms[0];
    const start = { x: startRoom.cx, y: startRoom.cy };
    set(m, start.x, start.y, T.FLOOR);
    pruneUnreachable(m, start.x, start.y);
    // liquids
    const blobs = biome.liquid === 'water' ? rng.int(1, 4) : rng.int(2, 5);
    placeLiquid(m, rng, biome.liquid, start, blobs);
    pruneUnreachable(m, start.x, start.y);
    // stairs: farthest reachable floor
    const d = bfsDist(m, start.x, start.y);
    let best = -1, stairs = null;
    for (let i = 0; i < d.length; i++) {
      if (d[i] > best && m.tiles[i] === T.FLOOR) {
        const x = i % m.w, y = (i / m.w) | 0;
        if (wallsAround(m, x, y) <= 3) { best = d[i]; stairs = { x, y }; }
      }
    }
    if (!stairs) { for (let i = 0; i < d.length; i++) if (d[i] > best && m.tiles[i] === T.FLOOR) { best = d[i]; stairs = { x: i % m.w, y: (i / m.w) | 0 }; } }
    set(m, stairs.x, stairs.y, T.STAIRS);

    const occ = new Set([start.y * m.w + start.x, stairs.y * m.w + stairs.x]);
    const objects = [], items = [], spawns = [];
    const reach = (x, y) => d[y * m.w + x] > 0;

    // chests
    const nChests = rng.int(1, 3);
    for (let i = 0; i < nChests; i++) {
      const p = freeFloor(m, rng, occ, (x, y) => reach(x, y) && wallsAround(m, x, y) >= 3 && G.dist(x, y, start.x, start.y) > 3);
      if (!p) continue;
      occ.add(p.y * m.w + p.x);
      if (floor >= 4 && rng.chance(0.2)) spawns.push({ type: 'mimic', x: p.x, y: p.y, asleep: true });
      else objects.push({ type: 'chest', x: p.x, y: p.y, open: false, rich: rng.chance(0.18) });
    }
    // shrine
    if (rng.chance(0.4)) {
      const p = freeFloor(m, rng, occ, (x, y) => reach(x, y) && wallsAround(m, x, y) === 0);
      if (p) { occ.add(p.y * m.w + p.x); objects.push(makeShrine(rng, floor, p)); }
    }
    // merchant
    if (floor % 3 === 2) {
      const p = freeFloor(m, rng, occ, (x, y) => reach(x, y) && wallsAround(m, x, y) === 0 && G.dist(x, y, start.x, start.y) > 4);
      if (p) { occ.add(p.y * m.w + p.x); objects.push(makeMerchant(rng, floor, p, ctx)); }
    }
    // traps
    if (floor >= 2) {
      const nT = rng.int(1, 2 + Math.floor(floor / 3));
      for (let i = 0; i < nT; i++) {
        const p = freeFloor(m, rng, occ, (x, y) =>
          reach(x, y) && G.dist(x, y, start.x, start.y) > 4 && G.dist(x, y, stairs.x, stairs.y) > 2
        );
        if (!p) continue;
        occ.add(p.y * m.w + p.x);
        objects.push({ type: 'trap', x: p.x, y: p.y, kind: rng.pick(['spike', 'spike', 'fire', 'alarm', 'teleport', 'poison']), hidden: true });
      }
    }
    // floor items & gold
    const nItems = rng.int(2, 4);
    for (let i = 0; i < nItems; i++) {
      const p = freeFloor(m, rng, occ, reach);
      if (p) { occ.add(p.y * m.w + p.x); items.push({ x: p.x, y: p.y, item: G.Dungeon.randomItem(rng, floor) }); }
    }
    const nGold = rng.int(3, 6);
    for (let i = 0; i < nGold; i++) {
      const p = freeFloor(m, rng, occ, reach);
      if (p) { occ.add(p.y * m.w + p.x); items.push({ x: p.x, y: p.y, gold: rng.int(5, 11) + floor * 3 }); }
    }
    // monsters
    const nMon = Math.round(6 + floor * 0.85 + rng.int(0, 3));
    for (let i = 0; i < nMon; i++) {
      const p = freeFloor(m, rng, occ, (x, y) => reach(x, y) && G.dist(x, y, start.x, start.y) > 7);
      if (!p) continue;
      occ.add(p.y * m.w + p.x);
      const type = pickMonster(rng, biome, floor);
      spawns.push({ type, x: p.x, y: p.y, asleep: rng.chance(0.55), elite: rng.chance(0.06 + floor * 0.01) });
      // packs
      if ((type === 'rat' || type === 'bat' || type === 'hound' || type === 'slime') && rng.chance(0.45)) {
        for (const [dx, dy] of rng.shuffle(G.DIRS8.slice()).slice(0, rng.int(1, 2))) {
          const x = p.x + dx, y = p.y + dy, k = y * m.w + x;
          if (get(m, x, y) === T.FLOOR && !occ.has(k)) { occ.add(k); spawns.push({ type, x, y, asleep: true }); }
        }
      }
    }
    return { ...m, start, stairs, rooms, objects, items, spawns, d };
  }

  function makeShrine(rng, floor, p) {
    const offers = [];
    const pool = G.SHRINES.slice();
    while (offers.length < 2 && pool.length) {
      const s = rng.weighted(pool, (o) => o.w);
      pool.splice(pool.indexOf(s), 1);
      offers.push({ id: s.id, cost: 24 + floor * 8 });
    }
    return { type: 'shrine', x: p.x, y: p.y, used: false, offers };
  }
  G.Dungeon.makeShrine = makeShrine;

  function makeMerchant(rng, floor, p, ctx) {
    const stock = [];
    const scale = 1 + floor * 0.06;
    stock.push({ item: { id: 'hpPotion' }, price: Math.round(G.ITEMS.hpPotion.price * scale) });
    stock.push({ item: { id: 'mpPotion' }, price: Math.round(G.ITEMS.mpPotion.price * scale) });
    for (let i = 0; i < 2; i++) {
      const it = G.Dungeon.randomItem(rng, floor + 1, { exclude: ['hpPotion', 'mpPotion'] });
      stock.push({ item: it, price: Math.round(G.ITEMS[it.id].price * scale) });
    }
    const t = { id: 'tome', spell: rng.weighted(G.SPELL_POOL, (s) => G.SPELL_RARITY[s]) };
    stock.push({ item: t, price: Math.round(G.ITEMS.tome.price * scale) });
    const relic = G.Dungeon.randomRelic(rng, (ctx && ctx.relics) || []);
    if (relic) stock.push({ relic, price: Math.round(100 * scale) });
    return { type: 'merchant', x: p.x, y: p.y, stock };
  }

  function bossArena(floor, rng, biome) {
    const W = 33, H = 42;
    const m = makeMap(W, H, T.WALL);
    // start room (south)
    const sr = { x: 12, y: 33, w: 9, h: 6, shape: 'rect', cx: 16, cy: 35 };
    carveRoom(m, sr, rng);
    // corridor
    for (let y = 22; y < 34; y++) { set(m, 16, y, T.FLOOR); if (y > 25 && y < 31) { set(m, 15, y, T.FLOOR); set(m, 17, y, T.FLOOR); } }
    // arena
    const ar = { x: 5, y: 3, w: 23, h: 20, shape: 'circle', cx: 16, cy: 12 };
    carveRoom(m, ar, rng);
    // symmetric pillars
    const pillars = [[10, 8], [22, 8], [10, 17], [22, 17], [16, 6]];
    for (const [x, y] of pillars) if (!(x === 16 && y === 6)) set(m, x, y, T.PILLAR);
    // liquid accents on sides
    const liq = biome.liquid === 'lava' ? T.LAVA : biome.liquid === 'chasm' ? T.CHASM : T.WATER;
    for (const [x, y] of [[7, 12], [8, 12], [7, 13], [25, 12], [24, 12], [25, 13], [7, 11], [25, 11]]) if (get(m, x, y) === T.FLOOR) set(m, x, y, liq);
    const start = { x: 16, y: 36 };
    const objects = [];
    objects.push({ type: 'shrine', x: 13, y: 34, used: false, offers: [{ id: 'pray', cost: 0 }], bossShrine: true });
    const items = [];
    items.push({ x: 19, y: 34, item: { id: rng.chance(0.5) ? 'hpPotion' : 'mpPotion' } });
    const spawns = [{ type: biome.boss, x: 16, y: 9, asleep: true, boss: true }];
    const d = bfsDist(m, start.x, start.y);
    return { ...m, start, stairs: null, bossStairs: { x: 16, y: 12 }, rooms: [sr, ar], objects, items, spawns, d, arena: ar };
  }

  /* ---------- decoration & lighting ---------- */
  function decorate(lv, rng, biome) {
    const m = lv;
    lv.lights = [];
    const occupied = new Set();
    for (const o of lv.objects) occupied.add(o.y * m.w + o.x);
    for (const it of lv.items) occupied.add(it.y * m.w + it.x);
    // torches on wall faces
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (get(m, x, y) !== T.WALL) continue;
      const below = get(m, x, y + 1);
      if (below !== T.FLOOR) continue;
      if (rng.chance(biome.torches * 0.09)) {
        // avoid adjacent torches
        if (lv.lights.some((l) => l.torch && G.dist(l.x, l.y, x, y) < 4)) continue;
        m.deco[y * m.w + x] = 'torch';
        lv.lights.push({ x, y: y + 0.6, r: 5.5, c: [255, 170, 90], torch: true, flick: true });
      }
    }
    // floor deco
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const k = y * m.w + x;
      if (m.tiles[k] !== T.FLOOR || occupied.has(k)) continue;
      if (lv.start && x === lv.start.x && y === lv.start.y) continue;
      const wa = wallsAround(m, x, y);
      if (rng.chance(wa >= 3 ? 0.14 : 0.04)) {
        let dk = rng.pick(biome.deco);
        if (dk === 'cobweb' && !(G.TILE_OPAQUE[get(m, x - 1, y)] && G.TILE_OPAQUE[get(m, x, y - 1)])) dk = 'moss';
        if (dk === 'grave' && wa < 3) dk = 'bones';
        m.deco[k] = dk;
        if (dk === 'crystal') lv.lights.push({ x, y, r: 3.5, c: biome.id === 'void' ? [170, 150, 255] : [90, 200, 255], flick: false });
        if (dk === 'shroom') lv.lights.push({ x, y, r: 2.5, c: [80, 230, 190], flick: false });
        if (dk === 'ember') lv.lights.push({ x, y, r: 2.2, c: [255, 120, 50], flick: true });
        if (dk === 'rune') lv.lights.push({ x, y, r: 2.5, c: [150, 200, 255], flick: false });
      }
    }
    // lava glow sources (sampled)
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (m.tiles[y * m.w + x] === T.LAVA && (x + y * 3) % 3 === 0) lv.lights.push({ x, y, r: 3.2, c: [255, 110, 40], flick: true, lava: true });
    }
  }
})();
