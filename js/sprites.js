'use strict';
/* =========================================================
 *  sprites.js : HD 96x96 / 144x144 illustrated canvas art
 *  Luminous dark-fantasy ink linework + painterly shading
 *  Generates crisp sprites, frozen variants, terrain & icons
 * ========================================================= */
G.Spr = {};
const INK = '#0c0b14';

(function () {
  /* ---------- Canvas & Painting Helpers ---------- */
  function cvs(w = 96, h = w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  }

  function lin(x, x0, y0, x1, y1, stops) {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }

  function rad(x, cx, cy, r, stops) {
    const g = x.createRadialGradient(cx, cy, r * 0.04, cx, cy, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }

  function paint(x, fill, stroke = INK, lw = 2.6) {
    if (fill) { x.fillStyle = fill; x.fill(); }
    if (stroke && lw > 0) {
      x.strokeStyle = stroke;
      x.lineWidth = lw;
      x.lineJoin = 'round';
      x.lineCap = 'round';
      x.stroke();
    }
  }

  function oval(x, cx, cy, rx, ry, fill, stroke = INK, lw = 2.4) {
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    paint(x, fill, stroke, lw);
  }

  function rrect(x, px, py, w, h, r, fill, stroke = INK, lw = 2.4) {
    x.beginPath();
    x.roundRect(px, py, w, h, r);
    paint(x, fill, stroke, lw);
  }

  function poly(x, pts, fill, stroke = INK, lw = 2.4) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    paint(x, fill, stroke, lw);
  }

  function starPath(x, cx, cy, ro, ri, pts = 4, rot = 0) {
    x.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? ro : ri;
      const a = rot + (i * Math.PI) / pts - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.closePath();
  }

  function withAlpha(col, aa) {
    if (typeof col !== 'string' || !col.startsWith('#')) return col;
    if (col.length === 4) {
      return '#' + col[1] + col[1] + col[2] + col[2] + col[3] + col[3] + aa;
    }
    if (col.length >= 7) return col.slice(0, 7) + aa;
    return col;
  }

  function glowOrb(x, cx, cy, r, col, core = '#ffffff') {
    const g = rad(x, cx, cy, r, [
      [0, core],
      [0.32, col],
      [0.7, withAlpha(col, '55')],
      [1, 'rgba(0,0,0,0)'],
    ]);
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
  }

  function glowEye(x, cx, cy, r, col, pupil = null) {
    glowOrb(x, cx, cy, r * 2.2, col, col);
    x.beginPath();
    x.ellipse(cx, cy, r, r * 0.78, 0, 0, Math.PI * 2);
    paint(x, col, INK, 1.4);
    if (pupil) {
      x.beginPath();
      x.ellipse(cx, cy, r * 0.42, r * 0.55, 0, 0, Math.PI * 2);
      x.fillStyle = pupil;
      x.fill();
    }
    x.beginPath();
    x.arc(cx - r * 0.25, cy - r * 0.22, Math.max(0.8, r * 0.26), 0, Math.PI * 2);
    x.fillStyle = '#ffffff';
    x.fill();
  }

  function crystalSpire(x, bx, by, w, h, tilt, cMain, cHi, cDark) {
    x.save();
    x.translate(bx, by);
    x.rotate(tilt);
    const tipY = -h;
    const shY = -h * 0.72;
    const hw = w * 0.5;
    poly(x, [[-hw, 0], [-hw * 0.85, shY], [0, tipY], [hw * 0.85, shY], [hw, 0]], lin(x, -hw, tipY, hw, 0, [[0, cHi], [0.55, cMain], [1, cDark]]), INK, 2.2);
    poly(x, [[-hw * 0.85, shY], [0, tipY], [0, 0], [-hw, 0]], withAlpha(cHi, '70'), null, 0);
    x.beginPath();
    x.moveTo(0, tipY); x.lineTo(0, 0);
    x.strokeStyle = withAlpha(cHi, 'aa'); x.lineWidth = 1.2; x.stroke();
    x.restore();
  }

  function silhouette(src, color) {
    const [c, x] = cvs(src.width, src.height);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function makeFrozen(src) {
    const [c, x] = cvs(src.width, src.height);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    const g = lin(x, 0, 0, c.width, c.height, [
      [0, 'rgba(185, 245, 255, 0.72)'],
      [0.5, 'rgba(95, 200, 245, 0.55)'],
      [1, 'rgba(40, 120, 210, 0.68)'],
    ]);
    x.fillStyle = g;
    x.fillRect(0, 0, c.width, c.height);
    // Crystalline frost veins inside silhouette
    x.strokeStyle = 'rgba(235, 252, 255, 0.75)';
    x.lineWidth = Math.max(1.4, c.width * 0.018);
    x.beginPath();
    x.moveTo(c.width * 0.25, c.height * 0.22);
    x.lineTo(c.width * 0.52, c.height * 0.45);
    x.lineTo(c.width * 0.35, c.height * 0.74);
    x.moveTo(c.width * 0.72, c.height * 0.30);
    x.lineTo(c.width * 0.50, c.height * 0.56);
    x.lineTo(c.width * 0.75, c.height * 0.80);
    x.stroke();
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  function buildArt(sz, drawFn) {
    const [img, x] = cvs(sz, sz);
    x.save();
    x.scale(sz / 96, sz / 96);
    drawFn(x);
    x.restore();
    return {
      img,
      flash: silhouette(img, '#ffffff'),
      frozenImg: makeFrozen(img),
      w: sz,
      h: sz,
    };
  }

  /* ---------- Player Classes (96x96) ---------- */
  function drawMage(x, clsId) {
    const C = G.CLASSES[clsId] || G.CLASSES.astro;
    const isPyro = clsId === 'pyro';
    const isCryo = clsId === 'cryo';
    const isHemo = clsId === 'hemo';
    const orbCol = isCryo ? '#7fe3ff' : isPyro ? '#ff8a3a' : isHemo ? '#ff405a' : '#ffd870';
    const orbCore = isCryo ? '#ffffff' : isPyro ? '#fff3a0' : isHemo ? '#ffd0d8' : '#ffffff';

    // Aura shimmer behind mage
    glowOrb(x, 76, 22, 18, orbCol, orbCore);

    // Boots
    oval(x, 38, 86, 6.5, 4, '#3a2a24', INK, 2.2);
    oval(x, 54, 86, 6.5, 4, '#3a2a24', INK, 2.2);

    // Back cape silhouette
    x.beginPath();
    x.moveTo(31, 46);
    x.quadraticCurveTo(18, 66, 21, 83);
    x.quadraticCurveTo(46, 88, 69, 83);
    x.quadraticCurveTo(72, 65, 59, 46);
    x.closePath();
    paint(x, lin(x, 22, 46, 68, 86, [[0, C.robeDark], [1, G.shade(C.robeDark, -0.35)]]), INK, 2.5);

    // Main Robe
    x.beginPath();
    x.moveTo(32, 45);
    x.quadraticCurveTo(25, 65, 26, 84);
    x.quadraticCurveTo(46, 89, 64, 84);
    x.quadraticCurveTo(64, 65, 58, 45);
    x.closePath();
    paint(x, lin(x, 26, 46, 64, 85, [[0, G.shade(C.robe, 0.14)], [0.6, C.robe], [1, C.robeDark]]), INK, 2.5);

    // Gold / silver central stole & belt
    poly(x, [[42, 47], [49, 47], [51, 84], [40, 84]], lin(x, 42, 47, 50, 84, [[0, C.trim], [1, G.shade(C.trim, -0.3)]]), INK, 1.8);
    rrect(x, 31, 60, 29, 5, 2, '#5a3a26', INK, 1.8);
    rrect(x, 42, 59.5, 7, 6, 1.5, C.trim, INK, 1.5);

    // Shoulder mantle / collar
    if (isPyro) {
      poly(x, [[26, 48], [32, 34], [45, 45], [58, 34], [64, 48], [46, 54]], lin(x, 26, 36, 64, 52, [[0, C.robe], [1, C.robeDark]]), INK, 2.3);
    } else if (isCryo) {
      oval(x, 45, 47, 17, 7, lin(x, 28, 42, 62, 52, [[0, '#f4f8ff'], [1, '#b8cde2']]), INK, 2.2);
    } else {
      poly(x, [[25, 51], [34, 42], [56, 42], [65, 51], [45, 56]], C.robeDark, INK, 2.2);
    }

    // Head & Hair
    const skin = isHemo ? '#ecd8de' : '#f4cfb4';
    const hair = isCryo ? '#e6eef8' : isPyro ? '#2a1d1c' : isHemo ? '#1a1522' : '#d8e2ee';
    // Hair back
    oval(x, 45, 34, 14, 13, hair, INK, 2.2);
    // Face
    oval(x, 45, 34, 10.5, 10, rad(x, 43, 32, 12, [[0, '#fff2e8'], [0.6, skin], [1, G.shade(skin, -0.18)]]), INK, 2.2);
    // Expressive eyes
    const eyeC = isPyro ? '#ff9a2a' : isCryo ? '#48b8ff' : isHemo ? '#ff2a48' : '#3ee0ff';
    x.fillStyle = INK;
    x.fillRect(39, 32.5, 3.2, 3.8);
    x.fillRect(48, 32.5, 3.2, 3.8);
    x.fillStyle = eyeC;
    x.fillRect(39.4, 33.4, 2.4, 2.2);
    x.fillRect(48.4, 33.4, 2.4, 2.2);
    x.fillStyle = '#ffffff';
    x.fillRect(39.6, 33.2, 1.1, 1.1);
    x.fillRect(48.6, 33.2, 1.1, 1.1);

    // Front bangs
    poly(x, [[34, 30], [39, 25], [46, 25], [55, 30], [50, 32], [45, 29], [41, 32]], hair, INK, 1.8);

    // Headgear
    if (clsId === 'astro') {
      // Pointy wide-brim astromancer hat
      oval(x, 45, 26, 22, 6, lin(x, 23, 22, 67, 30, [[0, C.hat], [1, C.robeDark]]), INK, 2.5);
      x.beginPath();
      x.moveTo(31, 25);
      x.quadraticCurveTo(36, 6, 56, 6);
      x.quadraticCurveTo(51, 16, 58, 25);
      x.closePath();
      paint(x, lin(x, 31, 6, 58, 26, [[0, G.shade(C.hat, 0.2)], [1, C.robeDark]]), INK, 2.5);
      // Hat gold band & crescent
      poly(x, [[33, 22], [57, 22], [58, 25], [32, 25]], C.trim, INK, 1.6);
      starPath(x, 45, 18, 4.5, 1.8, 4, 0);
      paint(x, '#fff3b0', INK, 1.2);
    } else if (isCryo) {
      // Ice tiara crown
      poly(x, [[34, 25], [38, 17], [42, 22], [45, 12], [48, 22], [52, 17], [56, 25]], lin(x, 34, 12, 56, 25, [[0, '#ffffff'], [0.6, '#8fe6ff'], [1, '#4890d0']]), INK, 2.0);
    } else if (isHemo) {
      // Deep occult hood
      x.beginPath();
      x.moveTo(27, 44);
      x.quadraticCurveTo(26, 16, 45, 11);
      x.quadraticCurveTo(64, 16, 63, 44);
      x.quadraticCurveTo(56, 25, 45, 24);
      x.quadraticCurveTo(34, 25, 27, 44);
      x.closePath();
      paint(x, lin(x, 26, 12, 63, 44, [[0, C.robe], [1, '#1a101b']]), INK, 2.5);
    } else if (isPyro) {
      // Spiky dark-flame hair & circlet
      poly(x, [[31, 29], [35, 15], [42, 22], [47, 13], [52, 21], [59, 17], [58, 29], [50, 26], [41, 26]], '#261817', INK, 2.0);
      rrect(x, 35, 24.5, 20, 3.2, 1, C.trim, INK, 1.4);
    }

    // Staff & Hand
    x.beginPath();
    x.moveTo(71, 86);
    x.lineTo(76, 26);
    x.strokeStyle = INK; x.lineWidth = 6.2; x.lineCap = 'round'; x.stroke();
    x.strokeStyle = isCryo ? '#78b8e0' : isHemo ? '#362434' : '#7a5230';
    x.lineWidth = 3.2; x.stroke();

    // Hand clasping staff
    oval(x, 73, 56, 4.2, 3.8, skin, INK, 1.8);

    // Staff crystal/emblem crown
    if (isCryo) {
      crystalSpire(x, 76, 27, 11, 18, 0, '#7fe3ff', '#ffffff', '#2e78b8');
    } else if (isPyro) {
      glowOrb(x, 76, 18, 12, '#ff7a2a', '#fff6a8');
      poly(x, [[70, 27], [68, 16], [76, 22], [84, 16], [82, 27]], '#4a2824', INK, 1.8);
      oval(x, 76, 17, 5, 6.5, rad(x, 75, 15, 7, [[0, '#ffffe0'], [0.45, '#ff8a3a'], [1, '#b82018']]), INK, 1.8);
    } else if (isHemo) {
      oval(x, 76, 19, 7, 8, rad(x, 74, 17, 8, [[0, '#ffc0cb'], [0.45, '#e02848'], [1, '#680818']]), INK, 2.0);
    } else {
      x.beginPath(); x.arc(76, 21, 9, 0, Math.PI * 2); paint(x, null, C.trim, 2.2);
      starPath(x, 76, 21, 11, 3.8, 4, 0);
      paint(x, rad(x, 76, 21, 11, [[0, '#ffffff'], [0.5, '#ffe896'], [1, '#7fe3ff']]), INK, 1.8);
    }
  }

  /* ---------- Creatures & NPCs (96x96, Bosses 144x144 scaled) ---------- */
  const DRAW = {
    rat(x) {
      // Tail
      x.beginPath();
      x.moveTo(64, 71);
      x.bezierCurveTo(84, 72, 86, 54, 76, 48);
      x.strokeStyle = INK; x.lineWidth = 5.5; x.lineCap = 'round'; x.stroke();
      x.strokeStyle = '#d48d94'; x.lineWidth = 3; x.stroke();
      // Back & front legs
      oval(x, 54, 78, 8, 5, '#594c46', INK, 2.2);
      oval(x, 28, 78, 6, 4.5, '#594c46', INK, 2.2);
      // Body
      oval(x, 48, 64, 21, 15, lin(x, 32, 50, 65, 78, [[0, '#9c8b80'], [0.6, '#75665d'], [1, '#4a3f39']]), INK, 2.6);
      // Ears
      oval(x, 38, 43, 6.5, 8.5, '#7a6a60', INK, 2.2);
      oval(x, 38, 44, 3.8, 5.2, '#e2a2aa', null, 0);
      // Head/snout
      poly(x, [[12, 66], [26, 50], [42, 52], [44, 70], [22, 74]], lin(x, 12, 52, 42, 72, [[0, '#9a8a80'], [1, '#5d5049']]), INK, 2.5);
      oval(x, 13, 65, 3, 2.5, '#e89ca5', INK, 1.5);
      glowEye(x, 27, 58, 3, '#ff4545', '#300');
      // Whiskers
      x.strokeStyle = '#d8d0c8'; x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(16, 67); x.lineTo(6, 63);
      x.moveTo(16, 70); x.lineTo(7, 73);
      x.stroke();
    },

    slime(x, kind = 'emerald') {
      const cols = kind === 'magma'
        ? ['#fff099', '#ff8028', '#8a1e10']
        : ['#d4ffdc', '#45c768', '#1a6830'];
      glowOrb(x, 48, 58, 34, cols[1], 'rgba(0,0,0,0)');
      x.beginPath();
      x.moveTo(14, 74);
      x.bezierCurveTo(10, 48, 26, 26, 48, 25);
      x.bezierCurveTo(70, 26, 86, 48, 82, 74);
      x.quadraticCurveTo(48, 86, 14, 74);
      x.closePath();
      paint(x, rad(x, 42, 45, 36, [[0, cols[0]], [0.45, cols[1]], [1, cols[2]]]), INK, 2.8);
      // Inner core
      oval(x, 48, 58, 12, 9, kind === 'magma' ? '#ffdd55' : '#96ffab', null, 0);
      // Specular gleam
      x.beginPath();
      x.ellipse(34, 42, 8, 4.5, -0.5, 0, Math.PI * 2);
      x.fillStyle = 'rgba(255,255,255,0.65)';
      x.fill();
      // Bubbles / crust
      oval(x, 62, 50, 4, 3, cols[0] + '88', null, 0);
      if (kind === 'magma') {
        poly(x, [[20, 68], [28, 60], [34, 69]], '#2e1a18', INK, 1.5);
        poly(x, [[62, 72], [72, 62], [78, 71]], '#2e1a18', INK, 1.5);
      }
      // Eyes
      glowEye(x, 38, 60, 4.2, kind === 'magma' ? '#ffe055' : '#183820', kind === 'magma' ? '#ff4400' : null);
      glowEye(x, 58, 60, 4.2, kind === 'magma' ? '#ffe055' : '#183820', kind === 'magma' ? '#ff4400' : null);
    },
    magmaslime(x) { DRAW.slime(x, 'magma'); },

    bat(x) {
      // Leathery wings
      const wg = lin(x, 10, 22, 86, 56, [[0, '#6a4888'], [1, '#261836']]);
      poly(x, [[42, 46], [26, 22], [8, 30], [16, 46], [10, 62], [26, 56], [36, 62]], wg, INK, 2.5);
      poly(x, [[54, 46], [70, 22], [88, 30], [80, 46], [86, 62], [70, 56], [60, 62]], wg, INK, 2.5);
      // Wing ribs
      x.strokeStyle = '#9a78bc'; x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(40, 46); x.lineTo(16, 46);
      x.moveTo(40, 46); x.lineTo(26, 56);
      x.moveTo(56, 46); x.lineTo(80, 46);
      x.moveTo(56, 46); x.lineTo(70, 56);
      x.stroke();
      // Fuzzy body & ears
      poly(x, [[38, 34], [36, 18], [44, 28], [52, 28], [60, 18], [58, 34]], '#4d3766', INK, 2.2);
      oval(x, 48, 48, 13, 15, rad(x, 46, 44, 15, [[0, '#725690'], [1, '#2d1e3d']]), INK, 2.5);
      glowEye(x, 43, 44, 3.2, '#ff4848');
      glowEye(x, 53, 44, 3.2, '#ff4848');
      // White fangs
      poly(x, [[42, 52], [44, 57], [46, 52]], '#ffffff', INK, 1.1);
      poly(x, [[50, 52], [52, 57], [54, 52]], '#ffffff', INK, 1.1);
    },

    skeleton(x) {
      const bone = lin(x, 30, 14, 62, 82, [[0, '#f4efe0'], [0.6, '#d6cfb8'], [1, '#8c8672']]);
      // Legs & pelvic bones
      rrect(x, 38, 62, 6, 22, 2, bone, INK, 2.0);
      rrect(x, 52, 62, 6, 22, 2, bone, INK, 2.0);
      oval(x, 48, 62, 12, 5, bone, INK, 2.2);
      // Spine & ribs
      rrect(x, 45, 38, 6, 24, 2, bone, INK, 1.8);
      for (const ry of [43, 49, 55]) rrect(x, 35, ry, 26, 4, 2, bone, INK, 1.8);
      // Shield on left arm
      poly(x, [[18, 40], [32, 42], [32, 64], [25, 72], [18, 64]], lin(x, 18, 40, 32, 72, [[0, '#8d96a4'], [1, '#454a54']]), INK, 2.3);
      // Sword in right hand
      poly(x, [[68, 56], [73, 16], [77, 12], [79, 18], [73, 56]], lin(x, 68, 12, 79, 56, [[0, '#e8eef5'], [1, '#7a8392']]), INK, 2.2);
      rrect(x, 64, 54, 14, 4, 1.5, '#8a6838', INK, 1.8);
      // Skull
      oval(x, 48, 25, 13, 12, bone, INK, 2.5);
      rrect(x, 40, 31, 16, 8, 2, bone, INK, 2.2);
      // Jaw teeth slits
      x.strokeStyle = INK; x.lineWidth = 1.4;
      for (const tx of [44, 48, 52]) { x.beginPath(); x.moveTo(tx, 34); x.lineTo(tx, 39); x.stroke(); }
      // Hollow sockets with ember glow
      oval(x, 43, 25, 3.6, 3.4, '#1a151c', INK, 1.2);
      oval(x, 53, 25, 3.6, 3.4, '#1a151c', INK, 1.2);
      glowOrb(x, 43, 25, 4, '#ff6838', '#fff4a0');
      glowOrb(x, 53, 25, 4, '#ff6838', '#fff4a0');
    },

    archer(x) {
      const bone = '#dfd8c2';
      // Pelvis & legs
      rrect(x, 38, 62, 6, 22, 2, bone, INK, 2.0);
      rrect(x, 52, 62, 6, 22, 2, bone, INK, 2.0);
      // Cloak & Ribs
      poly(x, [[26, 40], [32, 68], [58, 68], [62, 40]], '#3b4a36', INK, 2.3);
      for (const ry of [43, 49, 55]) rrect(x, 37, ry, 20, 3.6, 1.5, bone, INK, 1.6);
      // Hood & Skull
      poly(x, [[30, 36], [34, 12], [48, 9], [62, 16], [64, 38]], '#2e3c2b', INK, 2.4);
      oval(x, 47, 25, 10, 10, bone, INK, 2.2);
      glowEye(x, 43, 25, 2.5, '#ffd048');
      glowEye(x, 51, 25, 2.5, '#ffd048');
      // Bowed longbow
      x.beginPath();
      x.moveTo(64, 18);
      x.quadraticCurveTo(86, 46, 64, 74);
      x.strokeStyle = INK; x.lineWidth = 6; x.stroke();
      x.strokeStyle = '#9a6838'; x.lineWidth = 3.2; x.stroke();
      x.beginPath(); x.moveTo(64, 19); x.lineTo(64, 73); x.strokeStyle = '#e8e0cc'; x.lineWidth = 1.2; x.stroke();
      // Nocked arrow
      x.beginPath(); x.moveTo(46, 46); x.lineTo(82, 46); x.strokeStyle = '#e8c47a'; x.lineWidth = 2.4; x.stroke();
      poly(x, [[78, 42], [86, 46], [78, 50]], '#dce4ec', INK, 1.2);
    },

    spider(x) {
      // Multi-segmented spider legs
      const leg = (pts) => {
        x.beginPath();
        x.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) x.lineTo(p[0], p[1]);
        x.strokeStyle = INK; x.lineWidth = 5.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke();
        x.strokeStyle = '#2d3958'; x.lineWidth = 2.8; x.stroke();
      };
      leg([[38, 52], [22, 34], [10, 56]]);
      leg([[36, 56], [16, 48], [8, 72]]);
      leg([[38, 62], [20, 66], [14, 84]]);
      leg([[58, 52], [74, 34], [86, 56]]);
      leg([[60, 56], [80, 48], [88, 72]]);
      leg([[58, 62], [76, 66], [82, 84]]);
      // Abdomen + crystal growth
      oval(x, 48, 44, 18, 16, rad(x, 45, 40, 20, [[0, '#3e4d75'], [1, '#151a2e']]), INK, 2.6);
      crystalSpire(x, 42, 36, 9, 18, -0.35, '#4cc8ff', '#e8fdff', '#226090');
      crystalSpire(x, 54, 36, 10, 20, 0.3, '#6fe3ff', '#ffffff', '#226090');
      crystalSpire(x, 48, 34, 8, 22, 0.02, '#6fe3ff', '#ffffff', '#226090');
      // Thorax & Eyes
      oval(x, 48, 62, 13, 10, '#222b45', INK, 2.4);
      for (const [ex, ey, er] of [[42, 65, 2.6], [54, 65, 2.6], [46, 68, 2], [50, 68, 2]]) {
        glowEye(x, ex, ey, er, '#ff4068');
      }
    },

    frostwisp(x) {
      glowOrb(x, 48, 46, 36, '#7fe3ff', '#ffffff');
      // Swirling ice shards
      crystalSpire(x, 22, 54, 8, 20, -0.6, '#7fe3ff', '#ffffff', '#2a70a8');
      crystalSpire(x, 74, 54, 8, 20, 0.6, '#7fe3ff', '#ffffff', '#2a70a8');
      // Floating frost ghost cloak
      x.beginPath();
      x.moveTo(48, 16);
      x.bezierCurveTo(68, 22, 72, 52, 62, 74);
      x.lineTo(54, 64); x.lineTo(48, 82); x.lineTo(40, 64); x.lineTo(32, 74);
      x.bezierCurveTo(24, 52, 28, 22, 48, 16);
      x.closePath();
      paint(x, rad(x, 48, 40, 32, [[0, '#ffffff'], [0.45, '#8ee8ff'], [1, '#2d7ab8']]), INK, 2.4);
      glowEye(x, 42, 44, 3.2, '#0a3a6a');
      glowEye(x, 54, 44, 3.2, '#0a3a6a');
    },

    golem(x) {
      const rock = lin(x, 20, 14, 78, 86, [[0, '#9e9b90'], [0.5, '#726f66'], [1, '#3e3c36']]);
      // Heavy stone shoulders & arms
      rrect(x, 12, 42, 16, 32, 6, rock, INK, 2.6);
      rrect(x, 68, 42, 16, 32, 6, rock, INK, 2.6);
      // Legs
      rrect(x, 28, 66, 15, 20, 4, rock, INK, 2.5);
      rrect(x, 53, 66, 15, 20, 4, rock, INK, 2.5);
      // Hulking torso
      poly(x, [[24, 30], [72, 30], [66, 68], [30, 68]], rock, INK, 2.8);
      // Moss patches
      oval(x, 30, 34, 8, 4, '#5a8842', INK, 1.4);
      oval(x, 64, 52, 6, 4, '#5a8842', INK, 1.4);
      // Stone head
      rrect(x, 36, 14, 24, 20, 5, rock, INK, 2.6);
      // Glowing carved core rune & visor eye
      glowOrb(x, 48, 48, 12, '#ffcf4a', '#ffffff');
      poly(x, [[48, 41], [54, 48], [48, 55], [42, 48]], '#ffe878', INK, 1.6);
      rrect(x, 40, 22, 16, 4, 1.5, '#1e1b18', INK, 1.4);
      glowEye(x, 48, 24, 3.2, '#ffcf4a');
    },

    goblin(x) {
      const skin = lin(x, 32, 18, 62, 54, [[0, '#8ec050'], [1, '#4c7828']]);
      // Pointy ears
      poly(x, [[34, 30], [14, 24], [30, 40]], skin, INK, 2.2);
      poly(x, [[62, 30], [82, 24], [66, 40]], skin, INK, 2.2);
      // Legs & Tunic
      rrect(x, 37, 68, 7, 16, 2, '#5a7f34', INK, 2.0);
      rrect(x, 52, 68, 7, 16, 2, '#5a7f34', INK, 2.0);
      rrect(x, 32, 46, 32, 26, 5, lin(x, 32, 46, 64, 72, [[0, '#7c5330'], [1, '#482d18']]), INK, 2.4);
      rrect(x, 32, 59, 32, 5, 1, '#322014', INK, 1.6);
      // Curved cleaver dagger
      poly(x, [[67, 56], [76, 26], [82, 32], [75, 58]], lin(x, 68, 26, 82, 58, [[0, '#e0e6f0'], [1, '#7a8090']]), INK, 2.2);
      // Head
      oval(x, 48, 34, 14, 12, skin, INK, 2.5);
      glowEye(x, 42, 33, 3.4, '#ffe84a', '#281800');
      glowEye(x, 54, 33, 3.4, '#ffe84a', '#281800');
      // Grin & Tusks
      poly(x, [[40, 41], [43, 38], [45, 41]], '#ffffff', INK, 1);
      poly(x, [[51, 41], [53, 38], [56, 41]], '#ffffff', INK, 1);
    },

    mimic(x) {
      // Lower wooden chest box
      rrect(x, 16, 48, 64, 34, 5, lin(x, 16, 48, 80, 82, [[0, '#9a6432'], [1, '#4a2a12']]), INK, 2.6);
      // Metal bands
      rrect(x, 22, 48, 8, 34, 1, '#e8c170', INK, 1.8);
      rrect(x, 66, 48, 8, 34, 1, '#e8c170', INK, 1.8);
      // Upper jaw lid angled open
      poly(x, [[14, 42], [22, 16], [74, 16], [82, 42]], lin(x, 14, 16, 82, 42, [[0, '#a86e38'], [1, '#583318']]), INK, 2.6);
      // Dark maw & jagged teeth
      rrect(x, 20, 38, 56, 18, 4, '#4a0b16', INK, 2.2);
      for (let i = 0; i < 6; i++) {
        const tx = 23 + i * 9;
        poly(x, [[tx, 38], [tx + 3.5, 47], [tx + 7, 38]], '#f8f2dc', INK, 1.3);
        poly(x, [[tx + 1, 56], [tx + 4.5, 48], [tx + 8, 56]], '#f8f2dc', INK, 1.3);
      }
      // Rolling violet tongue
      x.beginPath();
      x.moveTo(42, 52);
      x.bezierCurveTo(36, 76, 62, 82, 58, 66);
      x.lineTo(50, 52);
      paint(x, lin(x, 40, 52, 60, 78, [[0, '#e84a7a'], [1, '#8a1640']]), INK, 2.0);
      // Glowing ambush eye
      glowEye(x, 48, 28, 4.5, '#ffda48', '#220000');
    },

    chest(x, opened = false) {
      if (!opened) {
        rrect(x, 18, 32, 60, 48, 7, lin(x, 18, 32, 78, 80, [[0, '#a86e3a'], [0.55, '#7c4b22'], [1, '#442610']]), INK, 2.8);
        x.beginPath(); x.moveTo(18, 50); x.lineTo(78, 50); x.strokeStyle = INK; x.lineWidth = 2.6; x.stroke();
        // Gold trims
        rrect(x, 24, 32, 8, 48, 2, lin(x, 24, 32, 32, 80, [[0, '#ffe896'], [1, '#9e701e']]), INK, 1.8);
        rrect(x, 64, 32, 8, 48, 2, lin(x, 64, 32, 72, 80, [[0, '#ffe896'], [1, '#9e701e']]), INK, 1.8);
        rrect(x, 42, 43, 12, 14, 3, '#ffe280', INK, 2.0);
        oval(x, 48, 50, 2.4, 3.2, '#1a120a', null, 0);
      } else {
        // Lid behind
        rrect(x, 18, 22, 60, 26, 6, '#5e3618', INK, 2.6);
        // Gold spill inside
        rrect(x, 22, 38, 52, 16, 4, '#24140a', INK, 2.0);
        for (const [cx, cy] of [[34, 46], [42, 43], [52, 44], [60, 47], [47, 48]]) {
          oval(x, cx, cy, 5.5, 4, '#ffda50', INK, 1.4);
        }
        // Front box
        rrect(x, 18, 50, 60, 30, 5, lin(x, 18, 50, 78, 80, [[0, '#966030'], [1, '#482810']]), INK, 2.6);
        rrect(x, 24, 50, 8, 30, 1, '#e8c170', INK, 1.8);
        rrect(x, 64, 50, 8, 30, 1, '#e8c170', INK, 1.8);
      }
    },
    chestOpen(x) { DRAW.chest(x, true); },

    imp(x) {
      // Wing membrane
      poly(x, [[36, 48], [16, 26], [12, 52], [28, 56]], '#7a2020', INK, 2.2);
      poly(x, [[60, 48], [80, 26], [84, 52], [68, 56]], '#7a2020', INK, 2.2);
      // Barbed tail
      x.beginPath(); x.moveTo(58, 66); x.bezierCurveTo(78, 72, 82, 56, 76, 44);
      x.strokeStyle = INK; x.lineWidth = 4.6; x.stroke();
      x.strokeStyle = '#d4422a'; x.lineWidth = 2.4; x.stroke();
      poly(x, [[72, 44], [80, 38], [82, 48]], '#d4422a', INK, 1.6);
      // Body & legs
      rrect(x, 38, 62, 6, 18, 2, '#9a281c', INK, 2.0);
      rrect(x, 52, 62, 6, 18, 2, '#9a281c', INK, 2.0);
      oval(x, 48, 54, 13, 15, rad(x, 46, 50, 16, [[0, '#f0784a'], [1, '#8c2016']]), INK, 2.5);
      // Head & curved horns
      poly(x, [[37, 27], [28, 12], [39, 19]], '#2e1c1a', INK, 2.0);
      poly(x, [[59, 27], [68, 12], [57, 19]], '#2e1c1a', INK, 2.0);
      oval(x, 48, 32, 13, 11, rad(x, 46, 29, 13, [[0, '#f48050'], [1, '#a02a1e']]), INK, 2.4);
      glowEye(x, 43, 31, 3, '#ffe850');
      glowEye(x, 53, 31, 3, '#ffe850');
      // Fireball in hand
      glowOrb(x, 22, 56, 12, '#ff7a2a', '#ffffb8');
    },

    hound(x) {
      // Fiery mane & tail
      glowOrb(x, 32, 34, 18, '#ff7a2a', '#ffe066');
      poly(x, [[64, 52], [80, 38], [86, 46], [72, 58]], '#ff7a2a', INK, 2.0);
      // Legs
      rrect(x, 26, 62, 7, 20, 2, '#241818', INK, 2.2);
      rrect(x, 38, 62, 7, 20, 2, '#241818', INK, 2.2);
      rrect(x, 54, 62, 7, 20, 2, '#241818', INK, 2.2);
      rrect(x, 64, 62, 7, 20, 2, '#241818', INK, 2.2);
      // Sleek torso
      oval(x, 49, 54, 21, 13, lin(x, 28, 42, 70, 68, [[0, '#4c3432'], [1, '#1a1010']]), INK, 2.5);
      // Mane spikes
      poly(x, [[26, 46], [28, 22], [38, 32], [46, 20], [50, 38]], lin(x, 28, 20, 48, 44, [[0, '#ffe066'], [1, '#ff5820']]), INK, 2.0);
      // Wolfish head
      poly(x, [[12, 48], [26, 30], [42, 34], [42, 50], [20, 54]], '#322020', INK, 2.5);
      glowEye(x, 27, 40, 3.2, '#ffe040');
      poly(x, [[14, 49], [16, 54], [19, 49]], '#ffffff', INK, 1);
    },

    darkmage(x) {
      glowOrb(x, 76, 34, 15, '#c79bff', '#ffffff');
      // Flowing dark-violet cloak
      poly(x, [[22, 84], [30, 42], [62, 42], [70, 84]], lin(x, 24, 42, 68, 84, [[0, '#44325e'], [1, '#1a1228']]), INK, 2.6);
      poly(x, [[42, 44], [50, 44], [52, 84], [40, 84]], '#8c5ad6', INK, 1.6);
      // Hood & shadow face
      poly(x, [[28, 44], [34, 14], [46, 10], [58, 14], [64, 44]], '#2d2042', INK, 2.6);
      oval(x, 46, 32, 9.5, 10, '#0e0814', INK, 2.0);
      glowEye(x, 42, 31, 2.6, '#ff4aa0');
      glowEye(x, 50, 31, 2.6, '#ff4aa0');
      // Staff + Void orb
      x.beginPath(); x.moveTo(74, 84); x.lineTo(76, 36);
      x.strokeStyle = INK; x.lineWidth = 5.4; x.stroke();
      x.strokeStyle = '#5a446e'; x.lineWidth = 2.8; x.stroke();
      oval(x, 76, 32, 7.5, 7.5, rad(x, 74, 30, 8, [[0, '#ffffff'], [0.45, '#c79bff'], [1, '#5828a8']]), INK, 2.0);
    },

    voideye(x) {
      glowOrb(x, 48, 44, 34, '#9a68ff', 'rgba(0,0,0,0)');
      // Writhing tentacles
      for (const [tx, ctrl, ex] of [[34, 24, 30], [44, 40, 44], [52, 56, 52], [62, 72, 66]]) {
        x.beginPath();
        x.moveTo(tx, 60);
        x.quadraticCurveTo(ctrl, 74, ex, 86);
        x.strokeStyle = INK; x.lineWidth = 6; x.lineCap = 'round'; x.stroke();
        x.strokeStyle = '#6a449a'; x.lineWidth = 3.2; x.stroke();
      }
      // Chitin eyelid casing
      oval(x, 48, 42, 26, 23, rad(x, 44, 36, 26, [[0, '#6a48a0'], [1, '#26183e']]), INK, 2.8);
      // Sclera & crimson-violet iris
      oval(x, 48, 42, 18, 15, '#f2ecff', INK, 2.2);
      oval(x, 48, 42, 10, 10, rad(x, 46, 40, 11, [[0, '#ff6896'], [0.7, '#b02858'], [1, '#4a0c28']]), INK, 1.8);
      oval(x, 48, 42, 4, 6.5, '#0c0612', null, 0);
      x.beginPath(); x.arc(43, 37, 3, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill();
    },

    shadowknight(x) {
      const steel = lin(x, 22, 12, 74, 86, [[0, '#5a5e78'], [0.5, '#34364a'], [1, '#14141e']]);
      // Plume
      poly(x, [[42, 18], [52, 6], [64, 16], [54, 24]], '#b82838', INK, 2.0);
      // Greatsword held upright
      poly(x, [[72, 60], [74, 10], [78, 6], [82, 12], [80, 60]], lin(x, 72, 8, 82, 60, [[0, '#d8e0f4'], [1, '#68708a']]), INK, 2.2);
      rrect(x, 66, 58, 20, 4.5, 1.5, '#7a5c32', INK, 1.8);
      // Pauldrons & Plate body
      rrect(x, 30, 62, 14, 22, 3, steel, INK, 2.3);
      rrect(x, 52, 62, 14, 22, 3, steel, INK, 2.3);
      poly(x, [[26, 38], [70, 38], [64, 66], [32, 66]], steel, INK, 2.6);
      oval(x, 25, 42, 11, 8, steel, INK, 2.4);
      oval(x, 71, 42, 11, 8, steel, INK, 2.4);
      // Horned Greathelm
      poly(x, [[34, 26], [24, 10], [38, 20]], '#3c3e52', INK, 2.0);
      poly(x, [[62, 26], [72, 10], [58, 20]], '#3c3e52', INK, 2.0);
      rrect(x, 34, 18, 28, 24, 6, steel, INK, 2.6);
      rrect(x, 38, 27, 20, 4, 1.5, '#0c080c', INK, 1.4);
      glowEye(x, 43, 29, 2.4, '#ff3a3a');
      glowEye(x, 53, 29, 2.4, '#ff3a3a');
    },

    wraith(x) {
      glowOrb(x, 48, 44, 34, '#7affd8', 'rgba(0,0,0,0)');
      x.beginPath();
      x.moveTo(48, 12);
      x.bezierCurveTo(72, 18, 76, 52, 72, 84);
      x.lineTo(60, 74); x.lineTo(50, 86); x.lineTo(42, 74); x.lineTo(30, 84);
      x.bezierCurveTo(22, 54, 24, 18, 48, 12);
      x.closePath();
      paint(x, lin(x, 28, 14, 72, 86, [[0, '#d8e8ff'], [0.55, '#7288b0'], [1, 'rgba(55,68,95,0.4)']]), INK, 2.4);
      oval(x, 48, 32, 11, 11, '#1a2030', INK, 2.0);
      glowEye(x, 44, 31, 2.8, '#7affd8');
      glowEye(x, 52, 31, 2.8, '#7affd8');
      // Reaching skeletal claws
      poly(x, [[26, 50], [12, 44], [14, 54], [28, 56]], '#b8d0e8', INK, 1.8);
      poly(x, [[70, 50], [84, 44], [82, 54], [68, 56]], '#b8d0e8', INK, 1.8);
    },

    shard(x) {
      glowOrb(x, 48, 48, 28, '#6fe3ff', '#ffffff');
      crystalSpire(x, 48, 78, 26, 60, 0, '#4bb4e0', '#e8fdff', '#1e507a');
      crystalSpire(x, 26, 60, 10, 26, -0.3, '#6fe3ff', '#ffffff', '#226090');
      crystalSpire(x, 70, 60, 10, 26, 0.3, '#6fe3ff', '#ffffff', '#226090');
      glowEye(x, 48, 48, 4.2, '#ffffff');
    },

    wisp(x) {
      glowOrb(x, 48, 48, 34, '#ffe066', '#ffffff');
      x.beginPath(); x.ellipse(48, 48, 26, 10, -0.35, 0, Math.PI * 2);
      x.strokeStyle = 'rgba(255,240,170,0.85)'; x.lineWidth = 2.6; x.stroke();
      oval(x, 48, 48, 16, 16, rad(x, 44, 43, 18, [[0, '#ffffff'], [0.5, '#ffe888'], [1, '#e8a22a']]), INK, 2.2);
      starPath(x, 48, 24, 7, 2.4, 4, 0);
      paint(x, '#fff8c8', INK, 1.3);
      glowEye(x, 43, 47, 2.6, '#5a3a10');
      glowEye(x, 53, 47, 2.6, '#5a3a10');
    },

    merchant(x) {
      // Backpack behind
      rrect(x, 58, 38, 20, 32, 6, '#7a522c', INK, 2.4);
      // Warm cloak
      poly(x, [[22, 84], [28, 40], [64, 40], [70, 84]], lin(x, 22, 40, 70, 84, [[0, '#4c7858'], [1, '#26422e']]), INK, 2.5);
      // Gold trim & belt
      poly(x, [[42, 44], [52, 44], [54, 84], [40, 84]], '#e8c170', INK, 1.6);
      // Hood & warm bearded face
      poly(x, [[26, 42], [32, 12], [48, 8], [62, 14], [66, 42]], lin(x, 28, 10, 64, 42, [[0, '#5a8e68'], [1, '#2d4c36']]), INK, 2.5);
      oval(x, 46, 30, 10.5, 10, '#eac2a0', INK, 2.0);
      poly(x, [[37, 33], [55, 33], [52, 45], [40, 45]], '#d6cfc2', INK, 1.6);
      x.fillStyle = INK; x.fillRect(42, 27, 2.4, 2.8); x.fillRect(50, 27, 2.4, 2.8);
      // Warm glowing lantern
      glowOrb(x, 22, 56, 20, '#ffcf48', '#ffffff');
      rrect(x, 16, 48, 12, 16, 3, rad(x, 22, 56, 8, [[0, '#ffffff'], [0.6, '#ffd248'], [1, '#c87018']]), INK, 2.2);
      x.beginPath(); x.arc(22, 45, 4, Math.PI, 0); x.strokeStyle = INK; x.lineWidth = 2; x.stroke();
    },

    /* ---- BOSSES (drawn in 0..96 coords onto 144x144 canvas) ---- */
    boneking(x) {
      const bone = lin(x, 28, 12, 68, 86, [[0, '#faf4e2'], [0.6, '#d6ccb4'], [1, '#8c8470']]);
      const ruby = lin(x, 18, 42, 78, 88, [[0, '#9a2034'], [1, '#480c18']]);
      glowOrb(x, 48, 36, 34, '#4affd8', 'rgba(0,0,0,0)');
      // Crimson royal cape
      poly(x, [[12, 86], [20, 44], [76, 44], [84, 86]], ruby, INK, 2.8);
      // Ornate ribcage & gold chain
      rrect(x, 34, 48, 28, 34, 4, bone, INK, 2.4);
      for (const ry of [54, 62, 70]) rrect(x, 38, ry, 20, 4.2, 2, '#1c1218', null, 0);
      // Skull pauldrons
      oval(x, 22, 46, 10, 9, bone, INK, 2.4);
      oval(x, 74, 46, 10, 9, bone, INK, 2.4);
      // Necromantic skeletal scepter
      x.beginPath(); x.moveTo(78, 88); x.lineTo(82, 26);
      x.strokeStyle = INK; x.lineWidth = 6.2; x.stroke();
      x.strokeStyle = '#d4aa46'; x.lineWidth = 3.2; x.stroke();
      oval(x, 82, 20, 8, 8, bone, INK, 2.2);
      glowOrb(x, 82, 20, 10, '#4affd8', '#ffffff');
      // King skull & jagged golden crown
      oval(x, 48, 34, 15, 14, bone, INK, 2.8);
      rrect(x, 39, 40, 18, 9, 2, bone, INK, 2.2);
      x.strokeStyle = INK; x.lineWidth = 1.6;
      for (const tx of [43, 48, 53]) { x.beginPath(); x.moveTo(tx, 43); x.lineTo(tx, 49); x.stroke(); }
      poly(x, [[33, 25], [31, 10], [40, 18], [48, 4], [56, 18], [65, 10], [63, 25]], lin(x, 31, 4, 65, 25, [[0, '#fff098'], [0.6, '#e8b43c'], [1, '#8c6018']]), INK, 2.4);
      oval(x, 48, 17, 3, 4.5, '#e83050', INK, 1.4);
      // Blazing cyan eyes
      oval(x, 42, 33, 4.5, 4, '#0c1218', INK, 1.4);
      oval(x, 54, 33, 4.5, 4, '#0c1218', INK, 1.4);
      glowEye(x, 42, 33, 3.6, '#4affd8');
      glowEye(x, 54, 33, 3.6, '#4affd8');
    },

    colossus(x) {
      const armor = lin(x, 16, 12, 82, 86, [[0, '#7290b0'], [0.55, '#425670'], [1, '#1c2436']]);
      glowOrb(x, 48, 50, 32, '#8fe6ff', 'rgba(0,0,0,0)');
      // Crystal shoulder spikes
      crystalSpire(x, 18, 42, 16, 32, -0.45, '#5ec8ff', '#ffffff', '#1e5080');
      crystalSpire(x, 78, 42, 16, 32, 0.45, '#5ec8ff', '#ffffff', '#1e5080');
      // Heavy arms & legs
      rrect(x, 8, 44, 18, 34, 6, armor, INK, 2.8);
      rrect(x, 70, 44, 18, 34, 6, armor, INK, 2.8);
      rrect(x, 26, 68, 18, 22, 4, armor, INK, 2.6);
      rrect(x, 52, 68, 18, 22, 4, armor, INK, 2.6);
      // Armored chest
      poly(x, [[20, 32], [76, 32], [68, 70], [28, 70]], armor, INK, 3.0);
      // Astral magenta-cyan prism core
      glowOrb(x, 48, 50, 18, '#ff68e8', '#ffffff');
      poly(x, [[48, 37], [59, 50], [48, 63], [37, 50]], rad(x, 48, 50, 14, [[0, '#ffffff'], [0.5, '#7fe3ff'], [1, '#e848d8']]), INK, 2.2);
      // Horned golem helm
      poly(x, [[36, 20], [28, 8], [40, 15]], '#68d0ff', INK, 2.0);
      poly(x, [[60, 20], [68, 8], [56, 15]], '#68d0ff', INK, 2.0);
      rrect(x, 34, 12, 28, 22, 6, armor, INK, 2.8);
      glowEye(x, 42, 23, 3.2, '#6fe3ff');
      glowEye(x, 54, 23, 3.2, '#6fe3ff');
    },

    ignis(x) {
      glowOrb(x, 48, 48, 38, '#ff7828', 'rgba(0,0,0,0)');
      // Magma-veined dragon wings
      const wing = lin(x, 6, 10, 90, 56, [[0, '#8a221c'], [0.6, '#d84a22'], [1, '#3a100c']]);
      poly(x, [[42, 46], [16, 12], [4, 34], [14, 52], [6, 68], [26, 60]], wing, INK, 2.6);
      poly(x, [[54, 46], [80, 12], [92, 34], [82, 52], [90, 68], [70, 60]], wing, INK, 2.6);
      // Wings glowing magma veins
      x.strokeStyle = '#ff9838'; x.lineWidth = 1.8;
      x.beginPath();
      x.moveTo(38, 46); x.lineTo(14, 48);
      x.moveTo(58, 46); x.lineTo(82, 48);
      x.stroke();
      // Tail & legs
      poly(x, [[42, 72], [28, 88], [68, 88], [54, 72]], '#581612', INK, 2.4);
      // Volcanic obsidian scale chest with molten crack glow
      oval(x, 48, 58, 20, 22, rad(x, 48, 56, 22, [[0, '#ffc048'], [0.45, '#b82e1e'], [1, '#34100e']]), INK, 2.8);
      // Chest molten cracks
      x.strokeStyle = '#ffe878'; x.lineWidth = 2.0;
      x.beginPath(); x.moveTo(42, 48); x.lineTo(48, 58); x.lineTo(54, 48); x.moveTo(48, 58); x.lineTo(48, 68); x.stroke();
      // Horned Dragon head & roaring fiery jaws
      poly(x, [[36, 24], [26, 6], [42, 16]], '#4a3228', INK, 2.2);
      poly(x, [[60, 24], [70, 6], [54, 16]], '#4a3228', INK, 2.2);
      poly(x, [[32, 22], [48, 12], [64, 22], [60, 42], [48, 46], [36, 42]], lin(x, 32, 12, 64, 46, [[0, '#c83424'], [1, '#581410']]), INK, 2.8);
      glowOrb(x, 48, 38, 8, '#ffe066', '#ffffff');
      glowEye(x, 41, 27, 3.4, '#ffee48', '#800');
      glowEye(x, 55, 27, 3.4, '#ffee48', '#800');
    },

    voidlord(x) {
      glowOrb(x, 48, 44, 42, '#9a68ff', 'rgba(0,0,0,0)');
      // Abyssal starfield billowing cloak
      poly(x, [[8, 82], [22, 38], [74, 38], [88, 82], [64, 88], [48, 82], [32, 88]], lin(x, 12, 38, 84, 86, [[0, '#3a2a68'], [0.6, '#1a1230'], [1, '#080614']]), INK, 2.8);
      // Spiral galaxies / stars on cloak
      glowOrb(x, 24, 68, 8, '#d088ff', '#ffffff');
      glowOrb(x, 72, 66, 8, '#7fd8ff', '#ffffff');
      // Armored void chest & pauldrons
      poly(x, [[22, 36], [74, 36], [62, 74], [34, 74]], '#261e44', INK, 2.6);
      poly(x, [[26, 40], [10, 26], [32, 48]], '#463870', INK, 2.2);
      poly(x, [[70, 40], [86, 26], [64, 48]], '#463870', INK, 2.2);
      // Crescent Void Crown
      poly(x, [[34, 22], [26, 4], [40, 14], [48, 6], [56, 14], [70, 4], [62, 22]], lin(x, 26, 4, 70, 22, [[0, '#e0d0ff'], [0.6, '#8a72c8'], [1, '#2c2050']]), INK, 2.4);
      // Deep Void Hood & blazing rose-violet eyes
      poly(x, [[32, 42], [34, 16], [48, 12], [62, 16], [64, 42]], '#1e1634', INK, 2.6);
      oval(x, 48, 29, 10, 11, '#06030c', INK, 2.0);
      glowEye(x, 43, 28, 3.2, '#ff4aa0');
      glowEye(x, 53, 28, 3.2, '#ff4aa0');
      // Orbiting golden-violet astrolabe sphere in hand
      glowOrb(x, 78, 52, 15, '#ffd870', '#ffffff');
      x.beginPath(); x.arc(78, 52, 10, 0, Math.PI * 2); x.strokeStyle = '#ffe896'; x.lineWidth = 2; x.stroke();
    },

    /* ---- Objects & Decorations ---- */
    shrine(x) {
      glowOrb(x, 48, 28, 26, '#7fe3ff', '#ffffff');
      // Pedestal base
      rrect(x, 20, 72, 56, 14, 3, lin(x, 20, 72, 76, 86, [[0, '#9094a4'], [1, '#3a3d4a']]), INK, 2.6);
      rrect(x, 30, 46, 36, 28, 3, lin(x, 30, 46, 66, 74, [[0, '#a0a4b4'], [1, '#444858']]), INK, 2.5);
      rrect(x, 24, 42, 48, 8, 2, '#e8c170', INK, 2.0);
      // Carved rune on pedestal
      poly(x, [[48, 53], [54, 61], [48, 69], [42, 61]], '#7fe3ff', INK, 1.4);
      // Levitating celestial crystal orb
      poly(x, [[48, 10], [60, 26], [48, 40], [36, 26]], rad(x, 46, 22, 16, [[0, '#ffffff'], [0.45, '#7fe3ff'], [1, '#2678b8']]), INK, 2.4);
    },

    gold(x) {
      const coin = (cx, cy) => {
        oval(x, cx, cy, 12, 8.5, lin(x, cx - 12, cy - 8, cx + 12, cy + 8, [[0, '#fff6b0'], [0.45, '#f0c040'], [1, '#8c5e12']]), INK, 2.2);
        oval(x, cx, cy - 1, 7.5, 4.8, null, '#a87818', 1.2);
      };
      coin(36, 66); coin(60, 66); coin(48, 70);
      coin(40, 56); coin(55, 57); coin(48, 48);
      starPath(x, 36, 40, 6, 2, 4, 0); paint(x, '#ffffff', null, 0);
    },

    grave(x) {
      x.beginPath();
      x.moveTo(26, 82); x.lineTo(26, 34);
      x.arc(48, 34, 22, Math.PI, 0);
      x.lineTo(70, 82); x.closePath();
      paint(x, lin(x, 26, 12, 70, 82, [[0, '#828690'], [1, '#3e424c']]), INK, 2.6);
      rrect(x, 20, 74, 56, 10, 2, '#4c505a', INK, 2.4);
      x.strokeStyle = '#2a2d34'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(48, 28); x.lineTo(48, 54); x.moveTo(38, 38); x.lineTo(58, 38); x.stroke();
      oval(x, 32, 70, 9, 5, '#527f3a', INK, 1.5);
    },

    bones(x) {
      // Crossed femur bones & weathered skull
      x.save(); x.translate(48, 60); x.rotate(0.45);
      rrect(x, -26, -4, 52, 8, 4, '#dad2ba', INK, 2.0);
      x.restore();
      x.save(); x.translate(48, 60); x.rotate(-0.45);
      rrect(x, -26, -4, 52, 8, 4, '#dad2ba', INK, 2.0);
      x.restore();
      oval(x, 48, 42, 13, 12, '#efe8d0', INK, 2.4);
      oval(x, 43, 42, 3.2, 3.2, '#221c18', null, 0);
      oval(x, 53, 42, 3.2, 3.2, '#221c18', null, 0);
    },

    rubble(x) {
      poly(x, [[20, 74], [30, 56], [48, 58], [52, 76]], '#6c7078', INK, 2.2);
      poly(x, [[46, 78], [56, 52], [74, 56], [78, 78]], '#545860', INK, 2.2);
      poly(x, [[34, 62], [44, 46], [62, 50], [56, 66]], '#848892', INK, 2.2);
    },

    crystal(x, violet = false) {
      const cMain = violet ? '#8f7aff' : '#4cc8ff';
      const cHi = violet ? '#f4f0ff' : '#ffffff';
      const cDark = violet ? '#3c2c7a' : '#1c5c88';
      glowOrb(x, 48, 52, 30, cMain, 'rgba(0,0,0,0)');
      crystalSpire(x, 32, 78, 16, 40, -0.25, cMain, cHi, cDark);
      crystalSpire(x, 64, 78, 16, 36, 0.28, cMain, cHi, cDark);
      crystalSpire(x, 48, 80, 22, 58, 0.02, cMain, cHi, cDark);
    },
    crystalViolet(x) { DRAW.crystal(x, true); },

    shroom(x) {
      glowOrb(x, 48, 52, 26, '#50e8c8', 'rgba(0,0,0,0)');
      rrect(x, 42, 50, 12, 28, 4, '#d8e4dc', INK, 2.2);
      x.beginPath(); x.moveTo(22, 54); x.bezierCurveTo(22, 26, 74, 26, 74, 54); x.closePath();
      paint(x, rad(x, 46, 36, 26, [[0, '#a8fff0'], [0.6, '#3cc0a8'], [1, '#1a685c']]), INK, 2.4);
      oval(x, 38, 40, 4, 3, '#e8fff8', null, 0);
      oval(x, 56, 44, 3.5, 2.5, '#e8fff8', null, 0);
    },

    cobweb(x) {
      x.strokeStyle = 'rgba(225, 232, 245, 0.58)';
      x.lineWidth = 1.6;
      for (const [tx, ty] of [[0, 86], [42, 86], [76, 76], [86, 42], [86, 0]]) {
        x.beginPath(); x.moveTo(0, 0); x.lineTo(tx, ty); x.stroke();
      }
      for (const r of [22, 44, 68]) {
        x.beginPath();
        x.arc(0, 0, r, 0, Math.PI / 2);
        x.stroke();
      }
    },

    pillar(x) {
      rrect(x, 22, 74, 52, 14, 3, '#4c505a', INK, 2.6);
      rrect(x, 28, 18, 40, 58, 3, lin(x, 28, 18, 68, 76, [[0, '#9296a2'], [0.55, '#686c78'], [1, '#3a3d46']]), INK, 2.6);
      x.strokeStyle = '#383a44'; x.lineWidth = 2;
      for (const fx of [38, 48, 58]) { x.beginPath(); x.moveTo(fx, 24); x.lineTo(fx, 70); x.stroke(); }
      rrect(x, 20, 10, 56, 14, 3, lin(x, 20, 10, 76, 24, [[0, '#a8acb8'], [1, '#585c66']]), INK, 2.6);
    },

    sconce(x) {
      poly(x, [[42, 54], [54, 54], [58, 68], [38, 68]], '#525662', INK, 2.2);
      rrect(x, 44, 34, 8, 32, 2, '#785032', INK, 2.2);
      oval(x, 48, 34, 6, 4, '#2a1c14', INK, 1.8);
    },

    obsidian(x) {
      glowOrb(x, 48, 54, 24, '#8a4ad8', 'rgba(0,0,0,0)');
      crystalSpire(x, 34, 78, 16, 44, -0.2, '#3a2852', '#8a6ad0', '#120b1c');
      crystalSpire(x, 60, 78, 16, 38, 0.25, '#3a2852', '#8a6ad0', '#120b1c');
      crystalSpire(x, 48, 80, 20, 58, 0, '#463264', '#b08ef8', '#140c20');
    },
  };

  /* ---------- Icons (96x96) ---------- */
  function drawPotionIcon(x, liquid, hi, dark) {
    glowOrb(x, 48, 56, 30, liquid, 'rgba(0,0,0,0)');
    // Cork stopper & glass neck
    rrect(x, 40, 12, 16, 12, 2, '#9a6838', INK, 2.2);
    rrect(x, 38, 22, 20, 14, 3, lin(x, 38, 22, 58, 36, [[0, '#dce8f6'], [1, '#98aac0']]), INK, 2.4);
    // Flask sphere
    oval(x, 48, 58, 26, 25, rad(x, 42, 48, 28, [[0, '#ffffff'], [0.25, hi], [0.65, liquid], [1, dark]]), INK, 2.8);
    // Meniscus highlight
    x.beginPath(); x.ellipse(36, 48, 7, 11, -0.35, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,0.48)'; x.fill();
  }

  function drawScrollIcon(x, sealCol, hiCol) {
    glowOrb(x, 48, 48, 30, sealCol, 'rgba(0,0,0,0)');
    poly(x, [[26, 20], [72, 16], [70, 76], [24, 80]], lin(x, 24, 16, 72, 80, [[0, '#f6ebd0'], [1, '#ccb890']]), INK, 2.6);
    oval(x, 26, 20, 12, 6, '#e6d6b0', INK, 2.2);
    oval(x, 70, 76, 12, 6, '#bda880', INK, 2.2);
    // Ribbon & Wax seal
    rrect(x, 24, 44, 47, 7, 2, sealCol, INK, 1.8);
    oval(x, 48, 48, 10, 10, rad(x, 46, 45, 10, [[0, hiCol], [0.6, sealCol], [1, G.shade(sealCol, -0.3)]]), INK, 2.2);
  }

  function drawTomeIcon(x, col, hi, dark) {
    glowOrb(x, 48, 48, 30, '#e8c170', 'rgba(0,0,0,0)');
    poly(x, [[22, 16], [70, 16], [74, 80], [22, 80]], lin(x, 22, 16, 74, 80, [[0, hi], [0.6, col], [1, dark]]), INK, 2.8);
    rrect(x, 20, 16, 10, 64, 3, dark, INK, 2.4);
    // Brass corner & star medallion
    rrect(x, 58, 16, 14, 10, 2, '#e8c170', INK, 1.6);
    rrect(x, 58, 70, 16, 10, 2, '#e8c170', INK, 1.6);
    oval(x, 50, 48, 12, 14, '#241820', '#e8c170', 2.4);
    starPath(x, 50, 48, 9, 3.5, 4, 0); paint(x, '#fff3b0', INK, 1.2);
  }

  const DRAW_ICON = {
    potion_red: (x) => drawPotionIcon(x, '#e0384a', '#ff8090', '#801020'),
    potion_blue: (x) => drawPotionIcon(x, '#3a72e8', '#80b8ff', '#163080'),
    potion_gold: (x) => drawPotionIcon(x, '#e8b030', '#fff090', '#8a5a10'),
    potion_green: (x) => drawPotionIcon(x, '#38b85a', '#80f898', '#146828'),
    potion_violet: (x) => drawPotionIcon(x, '#9a5ae0', '#d0a8ff', '#4c1e88'),
    scroll_teal: (x) => drawScrollIcon(x, '#2fa8a0', '#8ff8f0'),
    scroll_gold: (x) => drawScrollIcon(x, '#e0a830', '#fff6a0'),
    scroll_red: (x) => drawScrollIcon(x, '#d8382a', '#ff9070'),
    scroll_blue: (x) => drawScrollIcon(x, '#3a7ae0', '#a8d8ff'),
    tome: (x) => drawTomeIcon(x, '#7a2a3a', '#a84a5a', '#4a1420'),
    gold: (x) => DRAW.gold(x),

    /* Spells */
    missile(x) {
      glowOrb(x, 48, 48, 32, '#ffd27a', 'rgba(0,0,0,0)');
      for (const [cx, cy, ang] of [[32, 34, -0.7], [48, 48, -0.7], [62, 62, -0.7]]) {
        x.save(); x.translate(cx, cy); x.rotate(ang);
        poly(x, [[-18, 0], [-4, -5], [18, 0], [-4, 5]], lin(x, -18, 0, 18, 0, [[0, '#ffffff'], [0.5, '#ffe08a'], [1, '#7fe3ff']]), INK, 2.0);
        x.restore();
      }
    },
    firebolt(x) {
      glowOrb(x, 48, 48, 34, '#ff7a2a', '#fff6a8');
      x.beginPath();
      x.moveTo(48, 10);
      x.bezierCurveTo(72, 30, 78, 66, 48, 84);
      x.bezierCurveTo(18, 66, 24, 30, 48, 10);
      paint(x, rad(x, 48, 56, 30, [[0, '#ffffff'], [0.4, '#ffd04a'], [0.8, '#ff6820'], [1, '#a81810']]), INK, 2.6);
    },
    iceshard(x) {
      glowOrb(x, 48, 48, 32, '#7fe3ff', 'rgba(0,0,0,0)');
      crystalSpire(x, 34, 72, 16, 48, -0.35, '#4bb8f0', '#ffffff', '#1a4c80');
      crystalSpire(x, 58, 72, 18, 54, 0.25, '#6fe3ff', '#ffffff', '#1a4c80');
    },
    lightning(x) {
      glowOrb(x, 48, 48, 32, '#ffe04a', 'rgba(0,0,0,0)');
      poly(x, [[56, 8], [26, 50], [44, 50], [36, 86], [70, 42], [50, 42]], lin(x, 26, 8, 70, 86, [[0, '#ffffff'], [0.5, '#ffe04a'], [1, '#d88810']]), INK, 2.6);
    },
    nova(x) {
      glowOrb(x, 48, 48, 34, '#7fe3ff', '#ffffff');
      starPath(x, 48, 48, 32, 10, 6, 0);
      paint(x, rad(x, 48, 48, 30, [[0, '#ffffff'], [0.55, '#9fe8ff'], [1, '#3a8ac8']]), INK, 2.4);
    },
    blink(x) {
      glowOrb(x, 48, 48, 32, '#7fe3ff', 'rgba(0,0,0,0)');
      x.beginPath(); x.ellipse(48, 48, 30, 14, -0.5, 0, Math.PI * 2);
      x.strokeStyle = '#ffd27a'; x.lineWidth = 4; x.stroke();
      starPath(x, 48, 48, 20, 6, 4, 0);
      paint(x, rad(x, 48, 48, 18, [[0, '#ffffff'], [0.6, '#7ff0ff'], [1, '#ffd27a']]), INK, 2.2);
    },
    heal(x) {
      glowOrb(x, 48, 48, 32, '#8ff0a8', '#ffffff');
      poly(x, [[40, 16], [56, 16], [56, 40], [80, 40], [80, 56], [56, 56], [56, 80], [40, 80], [40, 56], [16, 56], [16, 40], [40, 40]],
        rad(x, 48, 48, 32, [[0, '#ffffff'], [0.45, '#8ff0a8'], [1, '#2a8a4a']]), INK, 2.6);
    },
    shield(x) {
      glowOrb(x, 48, 48, 32, '#7fb8ff', 'rgba(0,0,0,0)');
      poly(x, [[20, 18], [76, 18], [74, 54], [48, 82], [22, 54]], lin(x, 20, 18, 76, 82, [[0, '#9fd0ff'], [0.6, '#4878c8'], [1, '#1e3468']]), INK, 2.8);
      poly(x, [[28, 26], [68, 26], [66, 50], [48, 72], [30, 50]], null, '#e8c170', 2.2);
    },
    meteor(x) {
      glowOrb(x, 44, 54, 34, '#ff7a2a', '#ffffb8');
      poly(x, [[28, 34], [74, 12], [58, 56]], '#ff7a2a', INK, 2.0);
      oval(x, 38, 58, 22, 20, rad(x, 34, 54, 22, [[0, '#fff0a0'], [0.5, '#ff7828'], [1, '#5a2214']]), INK, 2.6);
    },
    venom(x) {
      glowOrb(x, 48, 48, 32, '#9be15d', 'rgba(0,0,0,0)');
      for (const [cx, cy, r] of [[36, 52, 16], [60, 52, 16], [48, 38, 18]]) {
        oval(x, cx, cy, r, r, rad(x, cx - 4, cy - 4, r, [[0, '#e8ffc8'], [0.55, '#8ad448'], [1, '#2c5a18']]), INK, 2.4);
      }
    },
    drain(x) {
      glowOrb(x, 48, 50, 32, '#d83a4a', 'rgba(0,0,0,0)');
      x.beginPath(); x.moveTo(48, 14); x.bezierCurveTo(68, 42, 74, 72, 48, 82); x.bezierCurveTo(22, 72, 28, 42, 48, 14);
      paint(x, rad(x, 42, 52, 26, [[0, '#ffb0b8'], [0.45, '#d8283e'], [1, '#500814']]), INK, 2.6);
    },
    summon(x) { DRAW.wisp(x); },
    timestop(x) {
      glowOrb(x, 48, 48, 32, '#ffe08a', 'rgba(0,0,0,0)');
      rrect(x, 22, 14, 52, 7, 2, '#d8b464', INK, 2.2);
      rrect(x, 22, 75, 52, 7, 2, '#d8b464', INK, 2.2);
      poly(x, [[28, 21], [68, 21], [52, 48], [68, 75], [28, 75], [44, 48]], lin(x, 28, 21, 68, 75, [[0, '#dff4ff'], [0.5, '#ffe08a'], [1, '#c89228']]), INK, 2.4);
    },

    /* Relics & Boons */
    r_sigil_fire(x) {
      oval(x, 48, 48, 30, 30, rad(x, 48, 48, 30, [[0, '#ffe070'], [0.5, '#c87022'], [1, '#5a2810']]), INK, 2.6);
      starPath(x, 48, 48, 20, 8, 6, 0); paint(x, '#ff8a3a', INK, 1.8);
    },
    r_heart_ice(x) {
      glowOrb(x, 48, 48, 30, '#7fe3ff', '#ffffff');
      poly(x, [[48, 78], [18, 48], [22, 26], [38, 22], [48, 34], [58, 22], [74, 26], [78, 48]],
        rad(x, 44, 40, 28, [[0, '#ffffff'], [0.45, '#7fe3ff'], [1, '#205888']]), INK, 2.6);
    },
    r_ring_storm(x) {
      glowOrb(x, 48, 26, 18, '#ffe04a', '#ffffff');
      oval(x, 48, 54, 24, 24, null, '#e8b838', 9);
      oval(x, 48, 54, 24, 24, null, INK, 2.2);
      poly(x, [[48, 12], [58, 26], [48, 36], [38, 26]], '#ffe04a', INK, 2.0);
    },
    r_stone(x) {
      glowOrb(x, 48, 48, 32, '#e03a4a', '#ffffff');
      poly(x, [[34, 18], [62, 18], [78, 42], [48, 80], [18, 42]], rad(x, 44, 38, 30, [[0, '#ffd0d8'], [0.45, '#e03248'], [1, '#580a14']]), INK, 2.8);
    },
    r_fang(x, venom = false) {
      const c1 = venom ? '#9be15d' : '#ffffff';
      const c2 = venom ? '#2a6a18' : '#b8b0a0';
      poly(x, [[30, 16], [66, 16], [56, 56], [48, 82], [38, 56]], lin(x, 30, 16, 66, 82, [[0, c1], [1, c2]]), INK, 2.6);
    },
    r_amulet(x) {
      x.beginPath(); x.moveTo(22, 16); x.lineTo(48, 38); x.lineTo(74, 16); x.strokeStyle = '#c8a850'; x.lineWidth = 3; x.stroke();
      oval(x, 48, 56, 22, 24, lin(x, 26, 32, 70, 80, [[0, '#d0d8e4'], [1, '#5a6070']]), INK, 2.6);
      oval(x, 48, 56, 11, 13, '#4aa0e0', INK, 2.0);
    },
    r_quill(x, flame = false) {
      x.save(); x.translate(48, 48); x.rotate(-0.65);
      poly(x, [[-34, 0], [-10, -12], [28, -8], [36, 0], [28, 8], [-10, 12]],
        lin(x, -34, 0, 36, 0, flame ? [[0, '#a82810'], [0.5, '#ff8a28'], [1, '#ffe878']] : [[0, '#465064'], [0.5, '#b8d0e8'], [1, '#ffffff']]), INK, 2.4);
      x.restore();
    },
    r_feather: (x) => DRAW_ICON.r_quill(x, true),
    r_eye(x) {
      glowOrb(x, 48, 48, 30, '#7fe3ff', 'rgba(0,0,0,0)');
      x.beginPath(); x.moveTo(14, 48); x.quadraticCurveTo(48, 16, 82, 48); x.quadraticCurveTo(48, 80, 14, 48);
      paint(x, '#f0ecff', INK, 2.6);
      oval(x, 48, 48, 15, 15, rad(x, 48, 48, 15, [[0, '#9fe8ff'], [0.6, '#2a8aa8'], [1, '#182442']]), INK, 2.0);
      oval(x, 48, 48, 6, 6, '#0a0e18', null, 0);
    },
    r_cloak(x) {
      poly(x, [[26, 22], [48, 16], [70, 22], [80, 78], [48, 82], [16, 78]], lin(x, 16, 16, 80, 82, [[0, '#5a8a42'], [1, '#1e321c']]), INK, 2.6);
      rrect(x, 38, 18, 20, 14, 3, '#c8d070', INK, 2.0);
    },
    r_coin: (x) => DRAW.gold(x),
    r_blood: (x) => DRAW_ICON.drain(x),
    r_well(x) {
      poly(x, [[22, 18], [74, 18], [62, 50], [34, 50]], lin(x, 22, 18, 74, 50, [[0, '#d0d6e4'], [1, '#687082']]), INK, 2.6);
      oval(x, 48, 22, 22, 6, '#3a8ae8', INK, 1.8);
      rrect(x, 42, 50, 12, 20, 2, '#9aa2b4', INK, 2.2);
      rrect(x, 30, 70, 36, 10, 3, '#c8cedc', INK, 2.4);
    },
    r_fruit(x) {
      glowOrb(x, 48, 52, 28, '#ffd24a', 'rgba(0,0,0,0)');
      oval(x, 48, 54, 24, 22, rad(x, 42, 46, 24, [[0, '#fff8c0'], [0.45, '#f0c040'], [1, '#8a5a10']]), INK, 2.6);
      poly(x, [[48, 32], [58, 16], [68, 22], [52, 34]], '#5ac042', INK, 2.0);
    },
    r_tome: (x) => drawTomeIcon(x, '#1d555c', '#2f8f96', '#0e3036'),
    r_boots(x) {
      poly(x, [[34, 16], [56, 16], [56, 56], [76, 60], [76, 78], [28, 78], [34, 56]], lin(x, 28, 16, 76, 78, [[0, '#a87c4a'], [1, '#4a321a']]), INK, 2.6);
      rrect(x, 32, 16, 26, 8, 2, '#d8b46a', INK, 2.0);
    },
    r_lens(x) {
      x.beginPath(); x.moveTo(56, 56); x.lineTo(78, 78); x.strokeStyle = INK; x.lineWidth = 9; x.lineCap = 'round'; x.stroke();
      x.strokeStyle = '#9a6838'; x.lineWidth = 5; x.stroke();
      oval(x, 42, 42, 22, 22, rad(x, 36, 36, 22, [[0, '#ffffff'], [0.55, '#8ad8ff'], [1, '#2a6898']]), '#e8c170', 5);
    },
    r_venom: (x) => DRAW_ICON.r_fang(x, true),

    /* Boons */
    b_hp: (x) => {
      glowOrb(x, 48, 48, 30, '#e84a5a', '#ffffff');
      poly(x, [[48, 78], [18, 48], [22, 26], [38, 22], [48, 34], [58, 22], [74, 26], [78, 48]],
        rad(x, 44, 40, 28, [[0, '#ffc0c8'], [0.45, '#e84a5a'], [1, '#68101c']]), INK, 2.6);
    },
    b_mp: (x) => {
      glowOrb(x, 48, 50, 32, '#4a8ae8', 'rgba(0,0,0,0)');
      x.beginPath(); x.moveTo(48, 14); x.bezierCurveTo(68, 42, 74, 72, 48, 82); x.bezierCurveTo(22, 72, 28, 42, 48, 14);
      paint(x, rad(x, 42, 52, 26, [[0, '#c0e0ff'], [0.45, '#4a8ae8'], [1, '#102c68']]), INK, 2.6);
    },
    b_pow(x) {
      glowOrb(x, 48, 48, 32, '#ffd27a', '#ffffff');
      starPath(x, 48, 48, 32, 12, 4, 0);
      paint(x, rad(x, 48, 48, 30, [[0, '#ffffff'], [0.55, '#ffd27a'], [1, '#c8821c']]), INK, 2.6);
    },
    b_def: (x) => DRAW_ICON.shield(x),
    b_regen: (x) => DRAW_ICON.blink(x),
    b_vigor: (x) => DRAW_ICON.heal(x),
  };

  /* ---------- Biome Procedural HD Tiles (96x96) ---------- */
  function makeFloorHD(b, variant, seed) {
    const [c, x] = cvs(96, 96);
    const f = b.floor;
    x.fillStyle = f[0];
    x.fillRect(0, 0, 96, 96);
    const rnd = (n) => G.hash2(n, variant, seed);

    // Subtle tonal patches for rich painted texture (inset by r so tile edges blend seamlessly)
    for (let i = 0; i < 20; i++) {
      const r = 8 + rnd(i * 3 + 2) * 14;
      const px = r + rnd(i * 3) * (96 - r * 2);
      const py = r + rnd(i * 3 + 1) * (96 - r * 2);
      x.fillStyle = rnd(i + 50) > 0.5 ? withAlpha(f[1], '44') : withAlpha(f[2], '38');
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }

    if (b.cave < 0.5) {
      // Clean running-bond flagstone masonry + soft beveled stone highlights
      const topSplit = variant % 2 === 0 ? 46 : 64;
      const botSplit = variant % 2 === 0 ? 64 : 34;
      const stones = [
        [2, 2, topSplit - 4, 42],
        [topSplit + 2, 2, 94 - topSplit - 2, 42],
        [2, 48, botSplit - 4, 44],
        [botSplit + 2, 48, 94 - botSplit - 2, 44],
      ];
      x.strokeStyle = f[3]; x.lineWidth = 2.8;
      x.beginPath();
      x.moveTo(0, 46); x.lineTo(96, 46);
      x.moveTo(topSplit, 0); x.lineTo(topSplit, 46);
      x.moveTo(botSplit, 46); x.lineTo(botSplit, 96);
      x.stroke();
      x.strokeStyle = G.shade(f[0], 0.14); x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(0, 48); x.lineTo(96, 48);
      x.stroke();
      for (const [rx, ry, rw, rh] of stones) {
        if (rw > 10) {
          x.strokeStyle = G.shade(f[0], 0.08); x.lineWidth = 1.1;
          x.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
        }
      }
      if (variant === 3) {
        x.strokeStyle = f[3]; x.lineWidth = 1.8; x.lineCap = 'round';
        x.beginPath(); x.moveTo(16, 18); x.lineTo(26, 26); x.lineTo(24, 34); x.stroke();
      }
    } else {
      // Natural cavern stone ripples & pebbles
      for (let i = 0; i < 10; i++) {
        const px = 8 + rnd(i + 200) * 80, py = 8 + rnd(i + 300) * 80;
        const rw = 4 + rnd(i + 400) * 8;
        oval(x, px, py, rw, rw * 0.65, f[2], f[3], 1.4);
      }
      if (variant === 3) {
        x.strokeStyle = f[3]; x.lineWidth = 1.6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(30, 56); x.lineTo(42, 62); x.lineTo(48, 70); x.stroke();
      }
    }
    return c;
  }

  function makeWallFaceHD(b, variant) {
    const [c, x] = cvs(96, 96);
    const W = b.wall;
    // Top cap overhang
    x.fillStyle = W.top;
    x.fillRect(0, 0, 96, 22);
    x.fillStyle = W.light;
    x.fillRect(0, 22, 96, 5);
    // Brick face body
    x.fillStyle = lin(x, 0, 26, 0, 96, [[0, W.face], [1, W.dark]]);
    x.fillRect(0, 26, 96, 70);
    // Mortar lines + chiseled courses
    x.strokeStyle = W.mortar; x.lineWidth = 3;
    const o = variant % 2 ? 24 : 0;
    x.beginPath();
    x.moveTo(0, 50); x.lineTo(96, 50);
    x.moveTo(0, 74); x.lineTo(96, 74);
    x.moveTo((24 + o) % 96, 26); x.lineTo((24 + o) % 96, 50);
    x.moveTo((72 + o) % 96, 26); x.lineTo((72 + o) % 96, 50);
    x.moveTo((48 + o) % 96, 50); x.lineTo((48 + o) % 96, 74);
    x.moveTo((24 + o) % 96, 74); x.lineTo((24 + o) % 96, 96);
    x.moveTo((72 + o) % 96, 74); x.lineTo((72 + o) % 96, 96);
    x.stroke();
    // Top bevel on bricks
    x.strokeStyle = G.shade(W.light, 0.08); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(0, 52.5); x.lineTo(96, 52.5); x.moveTo(0, 76.5); x.lineTo(96, 76.5); x.stroke();

    if (b.id === 'crypt' && variant >= 2) {
      x.fillStyle = b.accent + 'aa';
      x.beginPath(); x.ellipse(22, 26, 14, 6, 0.1, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(72, 54, 10, 4, -0.2, 0, Math.PI * 2); x.fill();
    } else if (b.id === 'crystal' && variant >= 2) {
      crystalSpire(x, 68, 72, 8, 16, 0.2, b.accent, '#ffffff', '#1c4a70');
    } else if (b.id === 'molten' && variant >= 2) {
      x.strokeStyle = '#ff7a2a'; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(32, 46); x.lineTo(44, 62); x.lineTo(40, 78); x.stroke();
    } else if (b.id === 'void' && variant >= 2) {
      glowOrb(x, 48, 60, 8, '#b9a8ff', '#ffffff');
    }
    return c;
  }

  function makeWallTopHD(b, variant) {
    const [c, x] = cvs(96, 96);
    const W = b.wall;
    x.fillStyle = W.top;
    x.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 16; i++) {
      const px = G.hash2(i, variant, 17) * 96, py = G.hash2(i, variant, 18) * 96;
      x.fillStyle = G.shade(W.top, 0.14) + '55';
      x.beginPath(); x.arc(px, py, 6 + (i % 5) * 2, 0, Math.PI * 2); x.fill();
    }
    return c;
  }

  function makeStairsHD(b) {
    const [c, x] = cvs(96, 96);
    x.drawImage(makeFloorHD(b, 0, 11), 0, 0);
    rrect(x, 12, 12, 72, 72, 6, '#090a12', b.wall.light, 3.0);
    const steps = ['#8a8f9a', '#6f7480', '#565a66', '#3d404a', '#262830'];
    for (let k = 0; k < 5; k++) {
      const pad = 16 + k * 7;
      rrect(x, pad, 16 + k * 13, 80 - pad, 13, 1, steps[k], INK, 1.5);
      x.fillStyle = G.shade(steps[k], 0.25);
      x.fillRect(pad + 1, 17 + k * 13, 78 - pad, 2.5);
    }
    return c;
  }

  function makeLiquidHD(kind, frame) {
    const [c, x] = cvs(96, 96);
    if (kind === 'water') {
      x.fillStyle = lin(x, 0, 0, 96, 96, [[0, '#183654'], [1, '#265078']]);
      x.fillRect(0, 0, 96, 96);
      x.strokeStyle = 'rgba(130, 210, 255, 0.42)'; x.lineWidth = 2.6; x.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const y = 14 + i * 22;
        const shift = ((frame * 24 + i * 19) % 96) - 24;
        x.beginPath();
        x.moveTo(shift, y);
        x.quadraticCurveTo(shift + 16, y - 5, shift + 32, y);
        x.stroke();
      }
    } else if (kind === 'lava') {
      x.fillStyle = lin(x, 0, 0, 96, 96, [[0, '#b83214'], [0.5, '#e8581c'], [1, '#9c240c']]);
      x.fillRect(0, 0, 96, 96);
      for (let i = 0; i < 5; i++) {
        const cx = (18 + i * 19 + frame * 11) % 96;
        const cy = (16 + i * 23 + frame * 7) % 96;
        glowOrb(x, cx, cy, 18, '#ff9830', '#fff080');
      }
      for (let i = 0; i < 3; i++) {
        const rx = (20 + i * 28 - frame * 6 + 96) % 82;
        const ry = 20 + i * 26;
        oval(x, rx, ry, 11, 6, '#5c1810', '#2e0a06', 1.4);
      }
    } else {
      x.fillStyle = '#05050c';
      x.fillRect(0, 0, 96, 96);
      for (let i = 0; i < 7; i++) {
        const sx = G.hash2(i, frame, 11) * 86 + 5;
        const sy = G.hash2(i, frame, 12) * 86 + 5;
        glowOrb(x, sx, sy, i % 2 ? 4 : 7, i % 2 ? '#b9a8ff' : '#6f78d8', '#ffffff');
      }
    }
    return c;
  }

  /* ---------- Public API ---------- */
  const urlCache = {};
  G.Spr.iconURL = function (key) {
    if (urlCache[key]) return urlCache[key];
    const icon = G.Spr.icons[key];
    if (!icon) return '';
    urlCache[key] = icon.toDataURL();
    return urlCache[key];
  };

  G.Spr.spriteURL = function (sprite) {
    if (!sprite || !sprite.img) return '';
    if (!sprite._url) sprite._url = sprite.img.toDataURL();
    return sprite._url;
  };

  const playerCache = {};
  G.Spr.playerSprite = function (clsId) {
    if (playerCache[clsId]) return playerCache[clsId];
    playerCache[clsId] = buildArt(96, (x) => drawMage(x, clsId));
    return playerCache[clsId];
  };

  G.Spr.init = function () {
    const BOSS_KEYS = new Set(['boneking', 'colossus', 'ignis', 'voidlord']);
    const S = (G.Spr.s = {});
    for (const k of Object.keys(DRAW)) {
      S[k] = buildArt(BOSS_KEYS.has(k) ? 144 : 96, DRAW[k]);
    }

    const I = (G.Spr.icons = {});
    for (const k of Object.keys(DRAW_ICON)) {
      const [c, x] = cvs(96, 96);
      DRAW_ICON[k](x);
      I[k] = c;
    }

    G.Spr.tiles = {};
    G.BIOMES.forEach((b, bi) => {
      const T = (G.Spr.tiles[b.id] = {});
      T.floor = [0, 1, 2, 3].map((v) => makeFloorHD(b, v, bi * 31 + 3));
      T.face = [0, 1, 2, 3].map((v) => makeWallFaceHD(b, v));
      T.top = [0, 1].map((v) => makeWallTopHD(b, v));
      T.stairs = makeStairsHD(b);
    });

    G.Spr.liquid = {
      water: [0, 1, 2, 3].map((f) => makeLiquidHD('water', f)),
      lava: [0, 1, 2, 3].map((f) => makeLiquidHD('lava', f)),
      chasm: [0, 1, 2, 3].map((f) => makeLiquidHD('chasm', f)),
    };
  };

  // Expose keys metadata cleanly for automated audits
  G.Spr.ART = DRAW;
  G.Spr.ICON = DRAW_ICON;
})();
