'use strict';
/* =========================================================
 *  map.js : field of view (recursive shadowcasting),
 *           line of sight, A* pathing, dijkstra maps
 * ========================================================= */
G.FOV = {};
(function () {
  const MULT = [
    [1, 0, 0, -1, -1, 0, 0, 1],
    [0, 1, -1, 0, 0, -1, 1, 0],
    [0, 1, 1, 0, 0, -1, -1, 0],
    [1, 0, 0, 1, -1, 0, 0, -1],
  ];

  G.FOV.compute = function (map, cx, cy, radius, vis) {
    vis.fill(0);
    const W = map.w, H = map.h;
    const opaque = (x, y) => x < 0 || y < 0 || x >= W || y >= H || G.TILE_OPAQUE[map.tiles[y * W + x]];
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) vis[y * W + x] = 1; };
    mark(cx, cy);
    const r2 = radius * radius + radius;
    function cast(row, start, end, xx, xy, yx, yy) {
      if (start < end) return;
      let newStart = 0;
      for (let j = row; j <= radius; j++) {
        let dx = -j - 1;
        const dy = -j;
        let blocked = false;
        while (dx <= 0) {
          dx++;
          const X = cx + dx * xx + dy * xy, Y = cy + dx * yx + dy * yy;
          const l = (dx - 0.5) / (dy + 0.5), r = (dx + 0.5) / (dy - 0.5);
          if (start < r) continue;
          else if (end > l) break;
          if (dx * dx + dy * dy <= r2) mark(X, Y);
          if (blocked) {
            if (opaque(X, Y)) { newStart = r; continue; }
            blocked = false; start = newStart;
          } else if (opaque(X, Y) && j < radius) {
            blocked = true;
            cast(j + 1, start, l, xx, xy, yx, yy);
            newStart = r;
          }
        }
        if (blocked) break;
      }
    }
    for (let o = 0; o < 8; o++) cast(1, 1.0, 0.0, MULT[0][o], MULT[1][o], MULT[2][o], MULT[3][o]);
  };

  /** true if nothing opaque between a and b (exclusive). */
  G.FOV.los = function (map, ax, ay, bx, by) {
    const pts = G.line(ax, ay, bx, by);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      if (G.TILE_OPAQUE[map.tiles[y * map.w + x]]) return false;
    }
    return true;
  };

  /** A* on 8-neighbour grid. passFn(x,y) -> cost (Infinity = blocked). */
  G.FOV.astar = function (map, sx, sy, tx, ty, passFn, maxNodes = 4000) {
    const W = map.w;
    const start = sy * W + sx, goal = ty * W + tx;
    const g = new Map([[start, 0]]);
    const came = new Map();
    const open = [[G.dist(sx, sy, tx, ty), start]];
    const closed = new Set();
    let n = 0;
    while (open.length && n++ < maxNodes) {
      // pop lowest f (small lists → linear scan is fine)
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, cur] = open.splice(bi, 1)[0];
      if (cur === goal) {
        const path = [];
        let c = cur;
        while (c !== start) { path.push([c % W, (c / W) | 0]); c = came.get(c); }
        return path.reverse();
      }
      if (closed.has(cur)) continue;
      closed.add(cur);
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of G.DIRS8) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= map.h) continue;
        const k = y * W + x;
        if (closed.has(k)) continue;
        const c = k === goal ? 1 : passFn(x, y);
        if (c === Infinity) continue;
        const ng = g.get(cur) + c + (dx && dy ? 0.01 : 0);
        if (ng < (g.has(k) ? g.get(k) : Infinity)) {
          g.set(k, ng); came.set(k, cur);
          open.push([ng + G.dist(x, y, tx, ty), k]);
        }
      }
    }
    return null;
  };

  /** Breadth-first distance field from a set of sources. */
  G.FOV.dijkstra = function (map, sources, passFn, maxD = 60) {
    const W = map.w, H = map.h;
    const d = new Int16Array(W * H).fill(32767);
    const q = [];
    for (const [x, y] of sources) { const k = y * W + x; d[k] = 0; q.push(k); }
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      const dc = d[c];
      if (dc >= maxD) continue;
      const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of G.DIRS8) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const k = y * W + x;
        if (d[k] <= dc + 1) continue;
        if (!passFn(map.tiles[k])) continue;
        d[k] = dc + 1; q.push(k);
      }
    }
    return d;
  };
})();
