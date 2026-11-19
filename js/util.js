'use strict';
/* =========================================================
 *  星詠みの迷宮 — ARCANA DEPTHS
 *  util.js : namespace, seeded RNG, helpers
 * ========================================================= */
const G = (window.G = window.G || {});
G.VERSION = '1.1.0';
G.TS = 64; // base tile resolution in HD canvas pixels

/* ---------- Seeded RNG (mulberry32, serialisable) ---------- */
class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  range(r) { return this.int(r[0], r[1]); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  weighted(list, wf) {
    let total = 0;
    for (const it of list) total += wf(it);
    let r = this.next() * total;
    for (const it of list) { r -= wf(it); if (r <= 0) return it; }
    return list[list.length - 1];
  }
}
G.RNG = RNG;

/* ---------- helpers ---------- */
G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.dist = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
G.edist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
G.rand = (a, b) => a + Math.random() * (b - a);
G.randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
G.easeOut = (t) => 1 - Math.pow(1 - t, 3);
G.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

G.DIRS8 = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];
G.DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Bresenham line from (x0,y0) to (x1,y1) excluding start. */
G.line = function (x0, y0, x1, y1) {
  const pts = [];
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    pts.push([x, y]);
    if (pts.length > 200) break;
  }
  return pts;
};

/** Extend a ray past the target until max length. */
G.ray = function (x0, y0, x1, y1, len) {
  const dx = x1 - x0, dy = y1 - y0;
  const m = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
  const k = len / m;
  return G.line(x0, y0, Math.round(x0 + dx * k), Math.round(y0 + dy * k));
};

G.hash2 = function (x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

G.fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] !== undefined ? o[k] : ''));

G.hexToRgb = function (hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
G.rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => G.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
G.shade = function (hex, f) {
  const [r, g, b] = G.hexToRgb(hex);
  if (f >= 0) return G.rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return G.rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
};
G.mix = function (a, b, t) {
  const A = G.hexToRgb(a), B = G.hexToRgb(b);
  return G.rgbToHex(G.lerp(A[0], B[0], t), G.lerp(A[1], B[1], t), G.lerp(A[2], B[2], t));
};

G.vibrate = function (ms) {
  try { if (G.settings && G.settings.vibration && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
};

G.uid = (() => { let n = 1; return () => n++; })();
