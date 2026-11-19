'use strict';
/* =========================================================
 *  星霊弾のアルカナ — STELLA BREAKER
 *  util.js : Core namespace, seeded RNG, 2D physics math,
 *            color helpers, storage helpers
 * ========================================================= */
const G = (window.G = window.G || {});
G.VERSION = '2.0.0';
G.SAVE_KEY = 'stella_breaker_meta_v2';
G.RUN_KEY = 'stella_breaker_run_v2';

/* ---------- Seeded RNG (mulberry32) ---------- */
class RNG {
  constructor(seed) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a, b) {
    return a + Math.floor(this.next() * (b - a + 1));
  }
  range(r) {
    return Array.isArray(r) ? this.int(r[0], r[1]) : r;
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p) {
    return this.next() < p;
  }
  shuffle(a) {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  weighted(list, wf) {
    let total = 0;
    for (const it of list) total += wf(it);
    if (total <= 0) return list[0];
    let r = this.next() * total;
    for (const it of list) {
      r -= wf(it);
      if (r <= 0) return it;
    }
    return list[list.length - 1];
  }
}
G.RNG = RNG;

/* ---------- Math & Physics Helpers ---------- */
G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
G.rand = (a, b) => a + Math.random() * (b - a);
G.randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
G.easeOut = (t) => 1 - Math.pow(1 - t, 3);
G.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Circle vs Axis-Aligned Bounding Box (AABB) collision check & normal extraction.
 * Box is defined by [rx, ry, rw, rh].
 * Returns null if no collision, or { nx, ny, overlap, px, py }.
 */
G.circleAABB = function (cx, cy, r, rx, ry, rw, rh) {
  const closestX = G.clamp(cx, rx, rx + rw);
  const closestY = G.clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 > r * r) return null;

  const d = Math.sqrt(d2);
  if (d > 1e-5) {
    return {
      nx: dx / d,
      ny: dy / d,
      overlap: r - d,
      px: closestX,
      py: closestY,
    };
  }
  // Center is inside box: push out along nearest face
  const left = cx - rx;
  const right = rx + rw - cx;
  const top = cy - ry;
  const bottom = ry + rh - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { nx: -1, ny: 0, overlap: r + left, px: rx, py: cy };
  if (m === right) return { nx: 1, ny: 0, overlap: r + right, px: rx + rw, py: cy };
  if (m === top) return { nx: 0, ny: -1, overlap: r + top, px: cx, py: ry };
  return { nx: 0, ny: 1, overlap: r + bottom, px: cx, py: ry + rh };
};

/** Reflect velocity vector (vx, vy) across unit normal (nx, ny) */
G.reflect = function (vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny;
  if (dot >= 0) return [vx, vy];
  return [vx - 2 * dot * nx, vy - 2 * dot * ny];
};

G.hash2 = function (x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/* ---------- Color Helpers ---------- */
G.hexToRgb = function (hex) {
  const h = String(hex || '#ffffff').replace('#', '').slice(0, 6);
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
G.rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => G.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
G.shade = function (hex, f) {
  const [r, g, b] = G.hexToRgb(hex);
  if (f >= 0) return G.rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return G.rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
};
G.withAlpha = function (col, aa) {
  if (!col) return '#ffffff';
  if (col.startsWith('rgb')) return col;
  if (col[0] === '#') {
    if (col.length === 4) {
      const r = col[1], g = col[2], b = col[3];
      return `#${r}${r}${g}${g}${b}${b}${aa}`;
    }
    return col.slice(0, 7) + aa;
  }
  return col;
};

G.fmtNum = function (n) {
  n = Math.round(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('ja-JP');
};

G.vibrate = function (ms) {
  try {
    if (G.settings && G.settings.vibration && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* ignore */ }
};

G.uid = (() => {
  let n = 1;
  return () => n++;
})();
