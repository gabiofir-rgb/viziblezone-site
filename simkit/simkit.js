/*! VZ simkit 1.0. Shared Canvas 2D kit for the Vizible Zone simulations.
    No dependencies, no network, works from file://. See README.md for the visual rules. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ tokens */
  const C = {
    paper: '#FFFFFF', surface: '#F6F6F4', ink: '#000000', muted: '#4D4D4D', line: '#E3E3E0',
    asphalt: '#1B2024', lane: '#E9ECEE', zone: '#FFC400', alert: '#C8321F',
    // City neutrals. All are mixes of asphalt and lane: no new hue enters a scene.
    pave: '#252B30', kerb: '#434C53', roof: ['#2A3135', '#2E353A', '#272D32', '#32393E'],
    car: '#C9CFD3', bus: '#8F999F', glass: '#1A2025', off: '#6B767D', post: '#56616A'
  };
  const RGB = { zone: '255,196,0', lane: '233,236,238', alert: '200,50,31', dark: '5,8,10' };
  const FONT = 'Overpass, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const TAU = Math.PI * 2, STEP = 1 / 120, DWELL = 1.8, FADE = 0.45;
  const DIM = { car: [176, 74], bus: [480, 102], truck: [620, 100], tug: [120, 72], van: [250, 92], cart: [104, 62], straddle: [400, 196] };

  const rgba = (k, a) => 'rgba(' + RGB[k] + ',' + Math.max(0, a).toFixed(3) + ')';
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = {
    out: (t) => 1 - Math.pow(1 - clamp(t), 3),
    inOut: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    smooth: (t) => { t = clamp(t); return t * t * (3 - 2 * t); }
  };
  // Seeded random (mulberry32) and a stateless hash for per-index randomness.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(i, j) {
    let h = Math.imul((i | 0) ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul((j | 0) + 0x632BE5AB, 0xC2B2AE35);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; return (h >>> 0) / 4294967296;
  }
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));

  /* ---------------------------------------------------------------- geometry */
  // A box is an oriented rectangle: centre x,y, heading a (radians, 0 = +x), length l along a, width w.
  function corners(b) {
    const c = Math.cos(b.a || 0), s = Math.sin(b.a || 0), hl = b.l / 2, hw = b.w / 2;
    return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([u, v]) => [b.x + u * c - v * s, b.y + u * s + v * c]);
  }
  function rayBox(ox, oy, dx, dy, pts) {
    let best = Infinity;
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) & 3], ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - ox) * ey - (y1 - oy) * ex) / den, u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
    }
    return best;
  }
  function occluded(eye, p, occ) {
    const dx = p.x - eye.x, dy = p.y - eye.y, d = Math.hypot(dx, dy) || 1;
    for (const b of occ || []) if (rayBox(eye.x, eye.y, dx / d, dy / d, corners(b)) < d) return true;
    return false;
  }
  // True when p is inside the sight cone, within range and not behind an occluder.
  function sees(eye, a, half, range, p, occ) {
    const dx = p.x - eye.x, dy = p.y - eye.y;
    if (Math.hypot(dx, dy) > range || Math.abs(wrap(Math.atan2(dy, dx) - a)) > half) return false;
    return !occluded(eye, p, occ);
  }
  // Visibility polygon of a sight cone, cut by occluding boxes. Extra rays at each corner keep shadow edges exact.
  function sight(eye, a, half, range, occ, n = 72) {
    const boxes = (occ || []).map(corners), angs = [];
    for (let i = 0; i <= n; i++) angs.push(a - half + (2 * half * i) / n);
    for (const pts of boxes) for (const [x, y] of pts) {
      const rel = wrap(Math.atan2(y - eye.y, x - eye.x) - a);
      if (Math.abs(rel) < half) angs.push(a + rel - 1e-4, a + rel + 1e-4);
    }
    angs.sort((p, q) => p - q);
    const pts = [[eye.x, eye.y]];
    for (const g of angs) {
      const dx = Math.cos(g), dy = Math.sin(g); let t = range;
      for (const b of boxes) t = Math.min(t, rayBox(eye.x, eye.y, dx, dy, b));
      pts.push([eye.x + dx * t, eye.y + dy * t]);
    }
    return { eye, a, half, range, pts };
  }
  // A route: waypoints joined by straight runs and rounded corners, sampled by arc length.
  function route(wp, radius = 0) {
    const pts = [wp[0]];
    for (let i = 1; i < wp.length - 1; i++) {
      const [ax, ay] = wp[i - 1], [px, py] = wp[i], [bx, by] = wp[i + 1];
      const l1 = Math.hypot(px - ax, py - ay), l2 = Math.hypot(bx - px, by - py), r = Math.min(radius, l1 / 2, l2 / 2);
      const sx = px - ((px - ax) / l1) * r, sy = py - ((py - ay) / l1) * r, ex = px + ((bx - px) / l2) * r, ey = py + ((by - py) / l2) * r;
      for (let k = 0; k <= 10; k++) { const u = k / 10, v = 1 - u; pts.push([v * v * sx + 2 * v * u * px + u * u * ex, v * v * sy + 2 * v * u * py + u * u * ey]); }
    }
    pts.push(wp[wp.length - 1]);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    function at(s) {
      s = clamp(s, 0, total);
      let lo = 0, hi = len.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] <= s) lo = m; else hi = m; }
      const [x1, y1] = pts[lo], [x2, y2] = pts[hi], u = (s - len[lo]) / (len[hi] - len[lo] || 1);
      return { x: x1 + (x2 - x1) * u, y: y1 + (y2 - y1) * u, a: Math.atan2(y2 - y1, x2 - x1) };
    }
    // Arc length of the first point where test(point) is true (bisection; test must flip once).
    function find(test) { let lo = 0, hi = total; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (test(at(m))) hi = m; else lo = m; } return hi; }
    return { pts, total, at, find };
  }
  function arcPts(cx, cy, r, a0, a1, n = 10) { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; }

  /* --------------------------------------------------------------- bubbles */
  // Distance from a bubble's centre to its rim along world angle ang (exact for the superellipse).
  function bubbleR(b, ang) { const u = ang - (b.a || 0), n = b.n || 2; return Math.pow(Math.pow(Math.abs(Math.cos(u)) / b.rx, n) + Math.pow(Math.abs(Math.sin(u)) / b.ry, n), -1 / n); }
  // Points on a bubble's rim (k scales it), passed to fn(x, y, i).
  function rim(b, k, fn, N = 72) {
    const n = b.n || 2, ca = Math.cos(b.a || 0), sa = Math.sin(b.a || 0), pw = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
    for (let i = 0; i < N; i++) { const th = (i / N) * TAU, u = b.rx * k * pw(Math.cos(th)), v = b.ry * k * pw(Math.sin(th)); fn(b.x + u * ca - v * sa, b.y + u * sa + v * ca, i); }
  }
  // Gap between two bubbles: negative once they touch. Each rim is sampled against the other bubble, so long or offset
  // shapes (a runway, a vehicle's bubble stretched ahead) meet where they really meet.
  function bubbleGap(p, q) {
    let m = Infinity;
    for (const [a, b] of [[p, q], [q, p]]) rim(a, 1, (x, y) => { m = Math.min(m, Math.hypot(x - b.x, y - b.y) - bubbleR(b, Math.atan2(y - b.y, x - b.x))); }, 48);
    return m;
  }

  /* -------------------------------------------------------------- zone timing */
  // Rings leave the phone every `period` s, live period * rings s and slow as they grow (ease-out).
  const RING_K = 1.7, ringR = (p) => 1 - Math.pow(1 - p, RING_K);
  function zoneArrive(d, z) { return d > z.rmax ? null : (1 - Math.pow(1 - d / z.rmax, 1 / RING_K)) * z.period * (z.rings || 3); }
  // Did a ring front pass distance d between t0 and t1? z.start (optional): no ring leaves the phone before it.
  function zoneCrossed(t0, t1, d, z) {
    const a = zoneArrive(d, z); if (a == null) return false;
    const ph = z.phase || 0, e = Math.floor((t1 - a - ph) / z.period) * z.period + ph;
    return e + a > t0 && !(e < z.start - 1e-9);
  }
  // Seconds since a ring front last passed distance d (Infinity when out of reach or before the first ring arrives).
  function zoneSince(t, d, z) {
    const a = zoneArrive(d, z); if (a == null) return Infinity;
    const ph = z.phase || 0, e = Math.floor((t - a - ph) / z.period) * z.period + ph; return e < z.start - 1e-9 ? Infinity : t - (e + a);
  }

  /* ----------------------------------------------------------------- painter */
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function Painter(ctx, cam) { this.ctx = ctx; this.cam = cam; this.emit = []; this.t = 0; this.reduced = false; }
  const P = Painter.prototype;
  Object.defineProperty(P, 'px', { get() { return 1 / this.cam.scale; } }); // one screen pixel in world units
  // Label size follows the stage: 14.5 px on a phone, 20 px on a wide screen, as on the carousel.
  Object.defineProperty(P, 'fs', { get() { return clamp(9.6 + this.cam.w / 140, 14.5, 20) * (this.cam.ui || 1); } });
  Object.defineProperty(P, 'portrait', { get() { return this.cam.rot !== 0; } });
  P.world = function () { const c = this.cam, x = this.ctx; x.setTransform(c.dpr, 0, 0, c.dpr, 0, 0); x.translate(c.w / 2, c.h / 2); x.rotate(c.rot); x.scale(c.scale, c.scale); x.translate(-c.cx, -c.cy); return this; };
  P.screen = function () { const c = this.cam; this.ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0); return this; };
  P.toScreen = function (x, y) { const c = this.cam, dx = (x - c.cx) * c.scale, dy = (y - c.cy) * c.scale, cs = Math.cos(c.rot), sn = Math.sin(c.rot); return [c.w / 2 + dx * cs - dy * sn, c.h / 2 + dx * sn + dy * cs]; };
  // A screen-space offset (px) as a world vector, so cast shadows always fall to the lower right of the screen.
  P.shade = function (dx, dy) { const c = this.cam, cs = Math.cos(-c.rot), sn = Math.sin(-c.rot); return [(dx * cs - dy * sn) / c.scale, (dx * sn + dy * cs) / c.scale]; };
  P.path = function (pts, close = true) { const c = this.ctx; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (close) c.closePath(); return c; };
  P.sight = (eye, a, half, range, occ, n) => sight(eye, a, half, range, occ, n);

  /* ground ----------------------------------------------------------------- */
  P.pavement = function (pts, o = {}) {
    const c = this.ctx, grid = o.grid ?? 40;
    this.path(pts); c.fillStyle = o.fill || C.pave; c.fill();
    if (!grid) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    c.save(); this.path(pts); c.clip(); c.beginPath();
    for (let x = Math.ceil(x0 / grid) * grid; x < x1; x += grid) { c.moveTo(x, y0); c.lineTo(x, y1); }
    for (let y = Math.ceil(y0 / grid) * grid; y < y1; y += grid) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.strokeStyle = rgba('lane', 0.035); c.lineWidth = this.px; c.stroke(); c.restore();
  };
  P.kerb = function (pts) {
    const c = this.ctx; c.lineJoin = 'round'; c.lineCap = 'butt';
    this.path(pts, false); c.strokeStyle = C.kerb; c.lineWidth = 6; c.stroke();
    c.strokeStyle = rgba('lane', 0.12); c.lineWidth = this.px; c.stroke();
  };
  P.marking = function (pts, o = {}) {
    const c = this.ctx; c.save(); c.setLineDash(o.dash || []); c.lineCap = 'butt';
    this.path(pts, false); c.strokeStyle = rgba('lane', o.alpha ?? 0.66); c.lineWidth = o.w ?? 5; c.stroke(); c.restore();
  };
  // Zebra crossing over the box x0..x1, y0..y1. Traffic runs along x unless o.vertical.
  P.zebra = function (x0, y0, x1, y1, o = {}) {
    const c = this.ctx, st = o.stripe || 20, span = o.vertical ? x1 - x0 : y1 - y0, n = Math.floor((span - st) / (2 * st)) + 1, off = (span - (2 * n - 1) * st) / 2;
    c.fillStyle = rgba('lane', o.alpha ?? 0.74);
    for (let i = 0; i < n; i++) { const q = off + i * 2 * st; if (o.vertical) c.fillRect(x0 + q, y0, st, y1 - y0); else c.fillRect(x0, y0 + q, x1 - x0, st); }
  };
  P.tactile = function (x, y, w, h) { const c = this.ctx; c.fillStyle = rgba('lane', 0.16); for (let i = 5; i < w - 2; i += 9) for (let j = 5; j < h - 2; j += 9) c.fillRect(x + i - 1.6, y + j - 1.6, 3.2, 3.2); };
  P.building = function (x, y, w, h, o = {}) {
    const c = this.ctx, r = rng(o.seed ?? ((x * 31 + y * 17) | 0)), k = o.height ?? 0.6 + r() * 0.8, [sx, sy] = this.shade(10 * k, 12 * k);
    c.fillStyle = 'rgba(3,5,7,.42)'; c.fillRect(x + sx, y + sy, w, h);
    c.fillStyle = o.tone || C.roof[(r() * C.roof.length) | 0]; c.fillRect(x, y, w, h);
    c.strokeStyle = rgba('lane', 0.07); c.lineWidth = this.px; c.strokeRect(x + 7, y + 7, w - 14, h - 14);
    const n = 1 + ((r() * 3) | 0), [ux, uy] = this.shade(3, 4);
    for (let i = 0; i < n; i++) {
      const bw = 26 + r() * 48, bh = 22 + r() * 34, bx = x + 18 + r() * Math.max(1, w - bw - 36), by = y + 18 + r() * Math.max(1, h - bh - 36);
      c.fillStyle = 'rgba(3,5,7,.32)'; c.fillRect(bx + ux, by + uy, bw, bh);
      c.fillStyle = rgba('lane', 0.045); c.fillRect(bx, by, bw, bh);
    }
  };
  P.tree = function (x, y, r) {
    const c = this.ctx, q = rng((x * 13 + y * 7) | 0), [sx, sy] = this.shade(8, 10), lobes = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + q(); lobes.push([x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * (0.5 + q() * 0.16)]); }
    const blob = (dx, dy) => { c.beginPath(); for (const [lx, ly, lr] of lobes) { c.moveTo(lx + dx + lr, ly + dy); c.arc(lx + dx, ly + dy, lr, 0, TAU); } };
    blob(sx, sy); c.fillStyle = 'rgba(3,5,7,.34)'; c.fill();
    blob(0, 0); c.fillStyle = '#2B3236'; c.fill();
  };
  // Street lamp: post plus an arm over the road at angle a. Its light at night comes from atmosphere().
  P.lamp = function (x, y, a) {
    const c = this.ctx, hx = x + Math.cos(a) * 30, hy = y + Math.sin(a) * 30;
    c.strokeStyle = C.post; c.lineWidth = 1.5 * this.px; c.beginPath(); c.moveTo(x, y); c.lineTo(hx, hy); c.stroke();
    c.fillStyle = C.post; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
    c.fillStyle = rgba('lane', 0.42); c.beginPath(); c.ellipse(hx, hy, 5, 2.5, a + Math.PI / 2, 0, TAU); c.fill();
  };
  P.shelter = function (x, y, w, h) {
    const c = this.ctx, [sx, sy] = this.shade(5, 6);
    c.fillStyle = 'rgba(3,5,7,.35)'; c.fillRect(x + sx, y + sy, w, h);
    c.fillStyle = '#353D42'; c.fillRect(x, y, w, h);
    c.strokeStyle = rgba('lane', 0.16); c.lineWidth = this.px; c.strokeRect(x + 3, y + 3, w - 6, h - 6);
  };
  // Safety cone seen from above: a square base and its top. A tagged cone gets tag() in the VZ layer.
  P.pylon = function (x, y) {
    const c = this.ctx, [sx, sy] = this.shade(2, 3);
    c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(x - 9 + sx, y - 9 + sy, 18, 18);
    c.fillStyle = '#7C878E'; c.fillRect(x - 9, y - 9, 18, 18);
    c.fillStyle = '#D5DADD'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
  };
  // Shipping container seen from above (40 ft by default): corrugated roof, corner castings. o: {l, tone}
  const BOX = ['#3B4348', '#434B50', '#363E43', '#4A5257', '#3F474C'];
  P.container = function (x, y, a, o = {}) {
    const c = this.ctx, l = o.l || 488, w = 98, hl = l / 2, hw = w / 2;
    c.save(); c.translate(x, y); c.rotate(a || 0);
    c.fillStyle = o.tone || BOX[0]; c.fillRect(-hl, -hw, l, w);
    c.strokeStyle = 'rgba(8,11,14,.26)'; c.lineWidth = this.px; c.beginPath();
    for (let u = -hl + 14; u < hl - 10; u += 11) { c.moveTo(u, -hw + 4); c.lineTo(u, hw - 4); } c.stroke();
    c.strokeStyle = rgba('lane', 0.08); c.strokeRect(-hl + 2, -hw + 2, l - 4, w - 4);
    c.fillStyle = 'rgba(8,11,14,.45)'; for (const [u, v] of [[-hl, -hw], [hl - 8, -hw], [-hl, hw - 8], [hl - 8, hw - 8]]) c.fillRect(u, v, 8, 8);
    c.restore();
  };
  // A yard block: cols x rows of containers along x, stacked o.height high (it sets the shadow).
  P.stack = function (x, y, cols, rows, o = {}) {
    const c = this.ctx, l = o.l || 488, gx = 12, gy = 8, W = cols * (l + gx) - gx, H = rows * (98 + gy) - gy, h = o.height ?? 1, r = rng(o.seed ?? ((x * 7 + y * 3) | 0));
    const [sx, sy] = this.shade(12 * h, 15 * h); c.fillStyle = 'rgba(3,5,7,.45)'; c.fillRect(x + sx, y + sy, W, H);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) this.container(x + i * (l + gx) + l / 2, y + j * (98 + gy) + 49, 0, { l, tone: BOX[(r() * BOX.length) | 0] });
  };
  // A parked twin-jet seen from above, nose at +x like every vehicle. o: {l} length in world units (span ~0.94 l)
  P.aircraft = function (v, o = {}) {
    const c = this.ctx, L = o.l || 1000, cam = this.cam, dpr = cam.dpr * cam.scale;
    const hw = (x) => (x < -0.3 ? 0.012 + 0.043 * ease.smooth((x + 0.5) / 0.2) : x < 0.38 ? 0.055 : 0.055 * Math.sqrt(Math.max(0, 1 - ((x - 0.38) / 0.12) ** 2)));
    const body = [];
    for (let i = 0; i <= 40; i++) { const x = -0.5 + i / 40; body.push([x, -hw(x)]); }
    for (let i = 40; i >= 0; i--) { const x = -0.5 + i / 40; body.push([x, hw(x)]); }
    // every part is wound clockwise on screen, like rr(), so one nonzero fill gives the whole silhouette
    const side = (pts) => [pts, pts.map(([x, y]) => [x, -y]).reverse()];
    const wings = side([[-0.13, 0.47], [-0.205, 0.47], [-0.1, 0.05], [0.11, 0.05]]), tails = side([[-0.455, 0.17], [-0.49, 0.17], [-0.475, 0.03], [-0.34, 0.03]]);
    const add = (list) => { for (const p of list) { c.moveTo(p[0][0] * L, p[0][1] * L); for (const r of p.slice(1)) c.lineTo(r[0] * L, r[1] * L); c.closePath(); } };
    const engines = () => { for (const s of [-1, 1]) rr(c, 0.005 * L, (s * 0.165 - 0.03) * L, 0.135 * L, 0.06 * L, 0.03 * L); };
    c.save(); c.translate(v.x, v.y); c.rotate(v.a || 0);
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 26 * dpr; c.shadowOffsetX = 16 * dpr; c.shadowOffsetY = 22 * dpr;
    c.beginPath(); add([...wings, ...tails, body]); engines(); c.fillStyle = '#B9C0C5'; c.fill();
    c.shadowColor = 'transparent';
    c.beginPath(); add([body]); c.fillStyle = '#D3D8DB'; c.fill();
    c.beginPath(); engines(); c.fillStyle = '#A3ACB2'; c.fill();
    const shape = (list) => { c.beginPath(); add(list); };
    const g = c.createLinearGradient(0, -0.055 * L, 0, 0.055 * L); // the fuselage is round: darker on both sides
    g.addColorStop(0, 'rgba(8,11,14,.22)'); g.addColorStop(0.3, 'rgba(8,11,14,0)'); g.addColorStop(0.7, 'rgba(8,11,14,0)'); g.addColorStop(1, 'rgba(8,11,14,.22)');
    shape([body]); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(8,11,14,.16)'; c.lineWidth = this.px; c.beginPath(); // flap lines, the fin, the wing root
    for (const s of [-1, 1]) { c.moveTo(-0.085 * L, s * 0.075 * L); c.lineTo(-0.185 * L, s * 0.43 * L); c.moveTo(-0.33 * L, s * 0.05 * L); c.lineTo(-0.33 * L, s * 0.056 * L); }
    c.stroke();
    c.fillStyle = 'rgba(8,11,14,.2)'; c.fillRect(-0.49 * L, -0.006 * L, 0.17 * L, 0.012 * L);
    c.fillStyle = C.glass; c.beginPath(); c.moveTo(0.428 * L, -0.03 * L); c.lineTo(0.462 * L, -0.02 * L); c.lineTo(0.462 * L, 0.02 * L); c.lineTo(0.428 * L, 0.03 * L); c.closePath(); c.fill();
    for (const s of [-1, 1]) c.fillRect(0.13 * L, (s * 0.165 - 0.024) * L, 0.012 * L, 0.048 * L); // engine intakes
    c.restore();
  };

  /* vehicles --------------------------------------------------------------- */
  // pose {x, y, a}; o: {brake 0..1, lights 0..1, phone 'zone'|'off'|null, tone}
  P.vehicle = function (kind, v, o = {}) {
    const c = this.ctx, l = o.l || DIM[kind][0], w = o.w || DIM[kind][1], cam = this.cam, hl = l / 2, hw = w / 2, dpr = cam.dpr * cam.scale;
    c.save(); c.translate(v.x, v.y); c.rotate(v.a || 0);
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 16 * dpr; c.shadowOffsetX = 6 * dpr; c.shadowOffsetY = 8 * dpr;
    c.beginPath();
    if (kind === 'truck' || kind === 'van') { const k = kind === 'van' ? 0.27 : 0.17; rr(c, hl - l * k, -hw, l * k, w, 12); rr(c, -hl, -hw + 2, l * (1 - k) - 6, w - 4, 4); }
    else if (kind === 'straddle') { rr(c, -hl, -hw, l, 30, 6); rr(c, -hl, hw - 30, l, 30, 6); rr(c, hl - 34, -hw, 34, w, 6); }
    else rr(c, -hl, -hw, l, w, kind === 'car' ? w * 0.34 : kind === 'bus' ? 14 : kind === 'cart' ? 6 : 12);
    c.fillStyle = o.tone || (kind === 'car' ? C.car : kind === 'tug' ? '#A3ACB1' : kind === 'van' ? '#B4BCC1' : kind === 'cart' ? '#5E686F' : C.bus); c.fill();
    c.shadowColor = 'transparent';
    // body curvature: a faint darkening towards both sides
    const g = c.createLinearGradient(0, -hw, 0, hw);
    g.addColorStop(0, 'rgba(8,11,14,.20)'); g.addColorStop(0.2, 'rgba(8,11,14,0)'); g.addColorStop(0.8, 'rgba(8,11,14,0)'); g.addColorStop(1, 'rgba(8,11,14,.20)');
    c.fillStyle = g; c.fill();
    const fill = (col, ...shapes) => { c.fillStyle = col; c.beginPath(); for (const s of shapes) s.length === 5 ? rr(c, ...s) : this.path(s); c.fill(); };
    const poly = (pts) => { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); };
    c.lineWidth = this.px;
    if (kind === 'car') {
      c.fillStyle = C.glass; c.beginPath();
      poly([[l * 0.07, -w * 0.4], [l * 0.25, -w * 0.33], [l * 0.25, w * 0.33], [l * 0.07, w * 0.4]]);
      poly([[-l * 0.37, -w * 0.34], [-l * 0.26, -w * 0.4], [-l * 0.26, w * 0.4], [-l * 0.37, w * 0.34]]); c.fill();
      fill('#D6DBDE', [-l * 0.26, -w * 0.37, l * 0.33, w * 0.74, 7]);
      fill(o.tone || C.car, [l * 0.1, -hw - 6, 12, 7, 2], [l * 0.1, hw - 1, 12, 7, 2]);
    } else if (kind === 'bus') {
      fill(rgba('lane', 0.09), [-hl + 12, -hw + 9, l - 32, w - 18, 9]);
      c.strokeStyle = 'rgba(8,11,14,.13)'; c.beginPath();
      for (let x = -hl + 40; x < hl - 30; x += 46) { c.moveTo(x, -hw + 9); c.lineTo(x, hw - 9); } c.stroke();
      fill('#7F898F', [-l * 0.2, -w * 0.29, l * 0.27, w * 0.58, 8]);
      c.strokeStyle = 'rgba(8,11,14,.3)'; c.beginPath(); // roof unit grille and two hatches: straight lines only, rings belong to the zone
      for (let x = -l * 0.17; x < l * 0.05; x += 9) { c.moveTo(x, -w * 0.2); c.lineTo(x, w * 0.2); }
      c.rect(l * 0.16, -17, 34, 34); c.rect(-l * 0.4, -17, 34, 34); c.stroke();
      fill(C.glass, [hl - 15, -hw + 7, 11, w - 14, 4]);
      c.strokeStyle = 'rgba(8,11,14,.35)'; c.beginPath(); for (let y = -hw + 16; y < hw - 12; y += 9) { c.moveTo(-hl + 5, y); c.lineTo(-hl + 14, y); } c.stroke();
      c.strokeStyle = '#6F7A80'; c.lineWidth = 3; c.beginPath(); c.moveTo(hl - 8, -hw); c.lineTo(hl + 5, -hw - 9); c.moveTo(hl - 8, hw); c.lineTo(hl + 5, hw + 9); c.stroke();
    } else if (kind === 'truck') {
      fill(C.glass, [hl - 22, -hw + 8, 14, w - 16, 4]);
      c.strokeStyle = 'rgba(8,11,14,.16)'; c.beginPath(); for (let x = -hl + 30; x < hl - l * 0.2; x += 40) { c.moveTo(x, -hw + 4); c.lineTo(x, hw - 4); } c.stroke();
    } else if (kind === 'tug') {
      fill(C.glass, [-l * 0.1, -hw + 8, l * 0.26, w * 0.42, 5]);
      fill('#7F898F', [-hl - 14, -4, 16, 8, 3]);
    } else if (kind === 'van') {
      fill(C.glass, [hl - 22, -hw + 8, 12, w - 16, 4]);
      c.strokeStyle = 'rgba(8,11,14,.14)'; c.beginPath(); for (let x = -hl + 26; x < hl - l * 0.3; x += 30) { c.moveTo(x, -hw + 6); c.lineTo(x, hw - 6); } c.stroke();
      fill(rgba('lane', 0.1), [-hl + 8, -hw + 10, l * 0.6, w - 20, 4]);
    } else if (kind === 'cart') { // a baggage cart: an open bed, a load of bags, a tow bar
      fill('rgba(8,11,14,.22)', [-hl + 5, -hw + 5, l - 10, w - 10, 3]);
      [[-44, -22, 26, 19], [-16, -23, 21, 18], [7, -21, 29, 20], [-43, 2, 23, 20], [-18, 1, 30, 21], [14, 3, 22, 18]].forEach(([x, y, bw, bh], i) => fill(i % 3 === 1 ? '#7A848A' : '#929BA1', [x * l / 104, y * w / 62, bw * l / 104, bh * w / 62, 5]));
      fill('#7F898F', [hl - 2, -3, 14, 6, 3]);
    } else if (kind === 'straddle') { // straddle carrier: two side girders, an end frame, the cab high on the front corner
      if (o.load) fill(o.load, [-hl + 34, -hw + 34, l - 74, w - 68, 3]);
      fill('#7F898F', [-hl + 20, -hw + 6, l * 0.36, 18, 4]);
      fill(C.glass, [hl - 30, -hw + 6, 26, 34, 5]);
      c.strokeStyle = 'rgba(8,11,14,.3)'; c.beginPath(); c.moveTo(-hl + 6, -hw + 15); c.lineTo(hl - 34, -hw + 15); c.moveTo(-hl + 6, hw - 15); c.lineTo(hl - 34, hw - 15); c.stroke();
    }
    // lights: drawn small; their glow is added later by atmosphere()
    if (kind !== 'cart') {
      fill('#F1F3F4', [hl - (kind === 'car' ? 7 : 5), -hw + 6, 5, 14, 2], [hl - (kind === 'car' ? 7 : 5), hw - 20, 5, 14, 2]);
      fill(rgba('alert', 0.55 + 0.45 * (o.brake || 0)), [-hl + 1, -hw + 6, 4, 14, 2], [-hl + 1, hw - 20, 4, 14, 2]);
    }
    if (o.phone) fill(o.phone === 'zone' ? C.zone : C.off, [l * 0.02 - 3.5, -w * 0.18 - 3.5, 7, 7, 3.5]);
    c.restore();
    this.emit.push({ kind, x: v.x, y: v.y, a: v.a || 0, l, w, brake: o.brake || 0, lights: o.lights ?? 0 });
  };

  /* people ----------------------------------------------------------------- */
  // pose {x, y, a}; o: {r, alpha, ghost, phone 'zone'|'off'|null}
  P.person = function (p, o = {}) {
    const al = o.alpha ?? 1; if (al <= 0.01) return;
    const c = this.ctx, r = o.r || 11, px = this.px;
    c.save(); c.globalAlpha = al;
    if (!o.ghost) { const [sx, sy] = this.shade(2.5, 3.5); c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(p.x + sx, p.y + sy, r, 0, TAU); c.fill(); }
    c.translate(p.x, p.y); c.rotate(p.a || 0);
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    if (o.ghost) { c.setLineDash([2.5 * px, 2.5 * px]); c.strokeStyle = rgba('lane', 0.75); c.lineWidth = px; c.stroke(); c.setLineDash([]); }
    else { c.strokeStyle = rgba('dark', 0.85); c.lineWidth = 3 * px; c.stroke(); c.fillStyle = '#F7F8F8'; c.fill(); } // dark halo keeps people clear of white markings
    // heading tick: a short wedge just ahead of the body
    c.beginPath(); c.moveTo(r + r * 0.62, 0); c.lineTo(r + 1.2 * px, -r * 0.36); c.lineTo(r + 1.2 * px, r * 0.36); c.closePath();
    if (o.ghost) { c.strokeStyle = rgba('lane', 0.6); c.lineWidth = px; c.stroke(); } else { c.fillStyle = '#F7F8F8'; c.fill(); }
    if (o.phone) { c.fillStyle = o.phone === 'zone' ? C.zone : C.off; c.beginPath(); c.arc(0, 0, r * 0.36, 0, TAU); c.fill(); }
    c.restore();
  };
  // A phone running VZ: an amber dot with a soft halo, constant on screen. Drawn after atmosphere() so it never dims.
  P.device = function (x, y, o = {}) {
    const c = this.ctx, px = this.px, r = (o.r || 3.4) * px, g = c.createRadialGradient(x, y, 0, x, y, r * 4.5);
    g.addColorStop(0, rgba('zone', 0.42)); g.addColorStop(1, rgba('zone', 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4.5, 0, TAU); c.fill();
    c.fillStyle = C.zone; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };

  /* the zone --------------------------------------------------------------- */
  // z: {rmax, period, rings, phase, strength, fill, start}. Draw it above obstacles and weather: it passes through both.
  P.zone = function (x, y, z) {
    const c = this.ctx, px = this.px, s = z.strength ?? 1, life = z.period * (z.rings || 3), t = this.t, ph = z.phase || 0;
    if (z.fill !== false) {
      const R = z.rmax * 0.5, g = c.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, rgba('zone', 0.26 * s)); g.addColorStop(0.2, rgba('zone', 0.1 * s)); g.addColorStop(1, rgba('zone', 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
    }
    for (let k = Math.ceil((t - life - ph) / z.period); k * z.period + ph <= t; k++) {
      const p = (t - k * z.period - ph) / life; if (p <= 0 || p >= 1 || k * z.period + ph < z.start - 1e-9) continue;
      const a = s * Math.pow(1 - p, 1.1) * Math.min(1, p / 0.04);
      c.beginPath(); c.arc(x, y, z.rmax * ringR(p), 0, TAU);
      c.strokeStyle = rgba('zone', a * 0.1); c.lineWidth = 7 * px; c.stroke();
      c.strokeStyle = rgba('zone', a * 0.16); c.lineWidth = 3.5 * px; c.stroke();
      c.strokeStyle = rgba('zone', a); c.lineWidth = 1.6 * px; c.stroke();
    }
  };
  // A device reached by a ring: one fine ring that opens and fades (0.7 s).
  P.catchFx = function (x, y, age, o = {}) {
    if (!(age >= 0 && age < 0.7)) return;
    const c = this.ctx, px = this.px, p = age / 0.7;
    c.strokeStyle = rgba('zone', (o.strength ?? 1) * Math.pow(1 - p, 1.3)); c.lineWidth = (1.75 - p) * px;
    c.beginPath(); c.arc(x, y, (5 + 18 * ease.out(p)) * px, 0, TAU); c.stroke();
  };
  // The actor's zone flashing around its outline: three calm pulses over 1.2 s (one under reduced motion).
  P.flash = function (v, age, o = {}) {
    const dur = 1.2; if (!(age >= 0 && age < dur)) return;
    const c = this.ctx, px = this.px, l = o.l || 22, w = o.w || 22, n = this.reduced ? 1 : 3, ph = ((age / dur) * n) % 1;
    const grow = (3 + 12 * ease.out(ph)) * px, a = (1 - ph) * (0.35 + 0.65 * (1 - age / dur));
    c.save(); c.translate(v.x, v.y); c.rotate(v.a || 0); c.strokeStyle = rgba(o.tone === 'alert' ? 'alert' : 'zone', a); c.lineWidth = 1.5 * px;
    c.beginPath(); rr(c, -l / 2 - grow, -w / 2 - grow, l + 2 * grow, w + 2 * grow, Math.min(l, w) / 2 + grow); c.stroke(); c.restore();
  };
  // Prediction trail: dots every `gap` px along a route from s0, tapering 3 -> 1.1 px and fading over the horizon.
  P.trail = function (rt, s0, len, o = {}) {
    const c = this.ctx, px = this.px, gap = (o.gap || 12) * px; if (len < gap * 1.5) return;
    const n = Math.floor(len / gap); c.fillStyle = C.zone;
    for (let i = 1; i <= n; i++) {
      const s = s0 + i * gap; if (s > rt.total) break;
      const q = i / n, p = rt.at(s); c.globalAlpha = (o.alpha ?? 1) * Math.pow(1 - q, 1.2) * (i === 1 ? 0.6 : 1);
      c.beginPath(); c.arc(p.x, p.y, lerp(3.2, 1.4, q) * px, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  };
  // Protective bubble: a soft superellipse around a person, a vehicle or an asset. b: {x, y, a, rx, ry, n}.
  // It breathes slowly (not under reduced motion); its rim is a zone ring; o.alert 0..1 brightens it.
  P.bubblePath = function (b) {
    const c = this.ctx, k = this.reduced ? 1 : 1 + 0.012 * Math.sin(this.t * 1.85 + b.x * 0.013 + b.y * 0.007);
    c.beginPath(); rim(b, k, (x, y, i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); return c;
  };
  P.bubble = function (b, o = {}) {
    const c = this.ctx, px = this.px, s = o.strength ?? 1, al = clamp(o.alert || 0);
    this.bubblePath(b); c.fillStyle = rgba('zone', (0.035 + 0.05 * al) * s); c.fill();
    c.save(); c.clip(); c.lineJoin = 'round'; // a soft inner rim: the edge glows, the middle stays clear
    c.strokeStyle = rgba('zone', (0.045 + 0.09 * al) * s); c.lineWidth = 24 * px; c.stroke();
    c.strokeStyle = rgba('zone', (0.05 + 0.1 * al) * s); c.lineWidth = 8 * px; c.stroke();
    c.restore();
    c.strokeStyle = rgba('zone', (0.7 + 0.3 * al) * s); c.lineWidth = (1.6 + 0.6 * al) * px; c.stroke();
  };
  // Where two bubbles touch, the shared lens lights up: the moment both parties are alerted.
  P.overlap = function (p, q, k = 1) {
    if (!(k > 0)) return;
    const c = this.ctx, px = this.px;
    for (const [a, b] of [[p, q], [q, p]]) {
      c.save(); this.bubblePath(a); c.clip(); this.bubblePath(b);
      if (a === p) { c.fillStyle = rgba('zone', 0.2 * k); c.fill(); }
      c.strokeStyle = rgba('zone', 0.95 * k); c.lineWidth = 2.2 * px; c.stroke(); c.restore();
    }
  };
  // Asset tag: what gives an object without a phone (an aircraft, a cone, a crane) its bubble. Square, so it never reads as a phone.
  P.tag = function (x, y) {
    const c = this.ctx, px = this.px, g = c.createRadialGradient(x, y, 0, x, y, 12 * px);
    g.addColorStop(0, rgba('zone', 0.38)); g.addColorStop(1, rgba('zone', 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 12 * px, 0, TAU); c.fill();
    c.fillStyle = C.zone; c.beginPath(); rr(c, x - 3 * px, y - 3 * px, 6 * px, 6 * px, 1.5 * px); c.fill();
  };
  // Relay hop: a thin amber line from device to device, and a pulse travelling along it (p 0..1).
  P.hop = function (a, b, p, o = {}) {
    const c = this.ctx, px = this.px, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    if (o.line !== false) {
      const al = Math.min(1, (o.alpha ?? 0.4) * 1.9);
      c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
      c.strokeStyle = rgba('zone', 0.14 * al); c.lineWidth = 7 * px; c.stroke();
      c.strokeStyle = rgba('zone', al); c.lineWidth = 1.5 * px; c.stroke(); c.restore();
    }
    if (!(p > 0 && p < 1)) return;
    const e = ease.inOut(p), hx = a.x + dx * e, hy = a.y + dy * e, tl = Math.min(L * e, 70 * px), tx = hx - (dx / L) * tl, ty = hy - (dy / L) * tl;
    const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, rgba('zone', 0)); g.addColorStop(1, rgba('zone', 0.95));
    c.strokeStyle = g; c.lineWidth = 2.6 * px; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
    c.fillStyle = C.zone; c.beginPath(); c.arc(hx, hy, 3.6 * px, 0, TAU); c.fill();
  };
  // Alert chip in screen space: always upright, clamped inside the stage, with a small pointer to the actor.
  // o: {tone 'zone'|'alert', side 'up'|'down'|'left'|'right', gap px, k appear 0..1}
  P.chip = function (x, y, text, o = {}) {
    const k = clamp(o.k ?? 1); if (k <= 0) return;
    const c = this.ctx, cam = this.cam, [sx, sy] = this.toScreen(x, y), side = o.side || 'up', gap = o.gap ?? 22;
    const fs = this.fs, pad = Math.round(fs * 0.62), ar = Math.round(fs * 0.36);
    this.screen(); c.save(); c.font = '800 ' + fs + 'px ' + FONT;
    const h = Math.round(fs * 1.9), w = Math.round(c.measureText(text).width + 2 * pad);
    let bx = side === 'left' ? sx - gap - w : side === 'right' ? sx + gap : sx - w / 2;
    let by = side === 'up' ? sy - gap - h : side === 'down' ? sy + gap : sy - h / 2;
    bx = clamp(bx, 8, cam.w - w - 8); by = clamp(by, 8, cam.h - h - 8);
    const e = ease.out(k), mx = bx + w / 2, my = by + h / 2;
    c.globalAlpha = e; c.translate(mx, my); c.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e); c.translate(-mx, -my);
    c.shadowColor = 'rgba(0,0,0,.32)'; c.shadowBlur = 12 * cam.dpr; c.shadowOffsetY = 2 * cam.dpr;
    c.fillStyle = o.tone === 'alert' ? C.alert : C.zone; c.beginPath(); rr(c, bx, by, w, h, Math.round(fs * 0.3));
    const tx = clamp(sx, bx + pad, bx + w - pad), ty = clamp(sy, by + ar + 3, by + h - ar - 3);
    if (sy > by + h) { c.moveTo(tx - ar, by + h); c.lineTo(tx, by + h + ar); c.lineTo(tx + ar, by + h); }
    else if (sy < by) { c.moveTo(tx + ar, by); c.lineTo(tx, by - ar); c.lineTo(tx - ar, by); }
    else if (sx < bx) { c.moveTo(bx, ty - ar); c.lineTo(bx - ar, ty); c.lineTo(bx, ty + ar); }
    else { c.moveTo(bx + w, ty + ar); c.lineTo(bx + w + ar, ty); c.lineTo(bx + w, ty - ar); }
    c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = o.tone === 'alert' ? '#FFFFFF' : C.ink; c.textBaseline = 'middle'; c.fillText(text, bx + pad, my + fs * 0.06);
    c.restore(); this.world();
  };
  // Place label, set like cartography: quiet lane text on a dark plate, upright, clamped inside the stage.
  // It names a place ("Runway", "Field command post") or a path; o.status 'today' | 'dev' | 'vision' adds the status mark.
  // o: {k appear 0..1, dx, dy screen offset, align 'center' | 'left' | 'right'}
  P.label = function (x, y, text, o = {}) {
    const k = clamp(o.k ?? 1); if (k <= 0) return;
    const c = this.ctx, cam = this.cam, [sx, sy] = this.toScreen(x, y), st = o.status, fs = Math.round(this.fs * 0.86), gw = st ? Math.round(fs * 1.25) : 0, h = Math.round(fs * 1.95), pad = Math.round(fs * 0.7);
    this.screen(); c.save(); c.font = '600 ' + fs + 'px ' + FONT;
    const w = Math.round(c.measureText(text).width + 2 * pad + gw);
    let bx = sx + (o.dx || 0) - (o.align === 'left' ? 0 : o.align === 'right' ? w : w / 2), by = sy + (o.dy || 0) - h / 2;
    bx = clamp(bx, 8, cam.w - w - 8); by = clamp(by, 8, cam.h - h - 8);
    c.globalAlpha = ease.out(k); c.fillStyle = 'rgba(10,13,16,.84)'; c.beginPath(); rr(c, bx, by, w, h, Math.round(fs * 0.28)); c.fill();
    if (st) {
      const mr = fs * 0.36;
      c.beginPath(); c.arc(bx + pad + mr, by + h / 2, st === 'today' ? mr : mr - 1, 0, TAU);
      if (st === 'today') { c.fillStyle = C.zone; c.fill(); } else { c.strokeStyle = C.zone; c.lineWidth = 2; if (st === 'vision') c.setLineDash([2.6, 2.2]); c.stroke(); c.setLineDash([]); }
    }
    c.fillStyle = rgba('lane', 0.96); c.textBaseline = 'middle'; c.fillText(text, bx + pad + gw, by + h / 2 + fs * 0.06);
    c.restore(); this.world();
  };
  // A small screen-space panel for a second view (an ops view, a city view). Returns its box with the screen
  // transform left on: draw inside it with text(), then call world().
  P.inset = function (corner, w, h, o = {}) {
    const c = this.ctx, cam = this.cam, m = o.margin ?? 14, x = corner[1] === 'r' ? cam.w - w - m : m, y = corner[0] === 'b' ? cam.h - h - m : m;
    this.screen(); c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 18 * cam.dpr; c.shadowOffsetY = 4 * cam.dpr;
    c.fillStyle = 'rgba(14,18,21,.9)'; c.beginPath(); rr(c, x, y, w, h, 6); c.fill(); c.restore();
    c.strokeStyle = rgba('lane', 0.13); c.lineWidth = 1; c.beginPath(); rr(c, x + 0.5, y + 0.5, w - 1, h - 1, 6); c.stroke();
    return { x, y, w, h };
  };
  P.text = function (x, y, s, o = {}) {
    const c = this.ctx; c.font = (o.weight || 600) + ' ' + (o.size || 12) + 'px ' + FONT; c.fillStyle = o.color || rgba('lane', o.alpha ?? 0.92);
    c.textAlign = o.align || 'left'; c.textBaseline = 'alphabetic'; c.fillText(s, x, y); c.textAlign = 'left';
  };
  // The driver's sight: seven nested fans (soft sides, brighter centre) falling off with distance, cut by
  // occluders, with hairline sides and a dotted limit where sight ends. Returns the outer polygon.
  P.cone = function (eye, a, half, range, occ, o = {}) {
    const c = this.ctx, px = this.px, k = o.k ?? 1, e = eye, g = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, range);
    g.addColorStop(0, rgba('lane', 0.022 * k)); g.addColorStop(0.55, rgba('lane', 0.0095 * k)); g.addColorStop(1, rgba('lane', 0.0015 * k));
    let v;
    for (let i = 7; i > 0; i--) { const s = sight(eye, a, (half * i) / 7, range, occ, 40); if (!v) v = s; this.path(s.pts); c.fillStyle = g; c.fill(); }
    const n = v.pts.length - 1;
    for (const [x, y] of [v.pts[1], v.pts[n]]) {
      const lg = c.createLinearGradient(e.x, e.y, x, y); lg.addColorStop(0, rgba('lane', 0.3 * k)); lg.addColorStop(1, rgba('lane', 0));
      c.strokeStyle = lg; c.lineWidth = px; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(x, y); c.stroke();
    }
    c.save(); c.lineWidth = px; c.setLineDash([1.5 * px, 4.5 * px]); c.strokeStyle = rgba('lane', 0.4 * k); c.beginPath();
    let on = false;
    for (let i = 1; i < v.pts.length; i++) { const [x, y] = v.pts[i]; if (Math.hypot(x - e.x, y - e.y) > v.range - 0.5) { if (on) c.lineTo(x, y); else c.moveTo(x, y); on = true; } else on = false; }
    c.stroke(); c.restore(); return v;
  };

  /* weather ---------------------------------------------------------------- */
  // Call once after the physical world (ground, vehicles, people) and before the VZ layer.
  // o: {lamps: [[x, y, a]], beams: [{eye, a, half, range, occ}] from the headlamps}
  P.atmosphere = function (kind, o = {}) {
    const c = this.ctx, cam = this.cam, night = kind === 'Night';
    if (night || kind === 'Rain') { this.screen(); c.fillStyle = night ? 'rgba(2,5,8,.68)' : 'rgba(8,12,16,.30)'; c.fillRect(0, 0, cam.w, cam.h); this.world(); }
    const lampA = { Night: 0.11, Rain: 0.05, Fog: 0.05 }[kind] || 0, beamA = { Night: 0.3, Rain: 0.13, Fog: 0.1 }[kind] || 0;
    c.save(); c.globalCompositeOperation = 'lighter';
    if (lampA) for (const [x, y, a] of o.lamps || []) {
      const hx = x + Math.cos(a) * 30, hy = y + Math.sin(a) * 30, g = c.createRadialGradient(hx, hy, 0, hx, hy, 180);
      g.addColorStop(0, rgba('lane', lampA)); g.addColorStop(1, rgba('lane', 0)); c.fillStyle = g; c.beginPath(); c.arc(hx, hy, 180, 0, TAU); c.fill();
    }
    if (beamA) for (const b of o.beams || []) { // eight nested fans: soft sides, bright core, cut by occluders
      const e = b.eye, g = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, b.range);
      g.addColorStop(0, rgba('lane', beamA / 8)); g.addColorStop(0.45, rgba('lane', beamA / 18)); g.addColorStop(1, rgba('lane', 0));
      for (let i = 8; i > 0; i--) { this.path(sight(e, b.a || 0, (b.half * i) / 8, b.range, b.occ, 28).pts); c.fillStyle = g; c.fill(); }
    }
    c.restore();
    if (kind === 'Rain') this.rain();
    if (kind === 'Fog') this.fog();
    this.lights(kind);
  };
  // Light sources: brake glow always, head and tail glow when it is dark or wet.
  P.lights = function (kind) {
    const c = this.ctx, dim = kind !== 'Clear';
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const e of this.emit) {
      const hl = e.l / 2, hw = e.w / 2, ca = Math.cos(e.a), sa = Math.sin(e.a), at = (u, v) => [e.x + u * ca - v * sa, e.y + u * sa + v * ca];
      const glow = (u, v, r, col, a) => { const [x, y] = at(u, v), g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
      const tail = (dim ? 0.22 : 0) + 0.5 * e.brake;
      if (tail > 0.01) for (const v of [-hw + 13, hw - 13]) glow(-hl, v, 14 + 16 * e.brake, 'alert', tail);
      if (dim && e.lights) for (const v of [-hw + 13, hw - 13]) glow(hl - 3, v, 16, 'lane', 0.5 * e.lights);
    }
    c.restore();
  };
  P.rain = function () {
    const c = this.ctx, cam = this.cam, t = this.t, px = this.px, v = cam.view;
    c.lineWidth = px;
    for (let i = 0; i < 26; i++) { // drops landing on the ground
      const cyc = t * 1.3 + hash(i, 7), k = Math.floor(cyc), age = cyc - k;
      const x = lerp(v.x0, v.x1, hash(i, k)), y = lerp(v.y0, v.y1, hash(k + 7, i));
      c.strokeStyle = rgba('lane', 0.11 * (1 - age)); c.beginPath(); c.arc(x, y, (1 + 5 * ease.out(age)) * px, 0, TAU); c.stroke();
    }
    this.screen(); c.strokeStyle = rgba('lane', 0.16); c.lineWidth = 1; c.beginPath(); // light streaks, falling the same way on every layout
    const W = cam.w + 80, H = cam.h + 60, n = Math.round((cam.w * cam.h) / 6000);
    for (let i = 0; i < n; i++) {
      const sp = 650 + 450 * hash(i, 3), len = 9 + 12 * hash(i, 4), y = ((hash(i, 1) * H + t * sp) % H) - 30, x = ((((hash(i, 2) * W - t * sp * 0.22) % W) + W) % W) - 40;
      c.moveTo(x, y); c.lineTo(x - len * 0.22, y + len);
    }
    c.stroke(); this.world();
  };
  P.fog = function () {
    const c = this.ctx, cam = this.cam, t = this.t, m = Math.max(cam.w, cam.h);
    this.screen(); c.fillStyle = rgba('lane', 0.25); c.fillRect(0, 0, cam.w, cam.h);
    for (let i = 0; i < 5; i++) {
      const R = m * (0.3 + 0.2 * hash(i, 5)), x = cam.w * hash(i, 6) + Math.sin(t * 0.11 + i * 2) * cam.w * 0.06, y = cam.h * hash(i, 8) + Math.cos(t * 0.09 + i) * cam.h * 0.05;
      const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, rgba('lane', 0.14)); g.addColorStop(1, rgba('lane', 0));
      c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R);
    }
    this.world();
  };

  /* ------------------------------------------------------------------- mount */
  const ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 3h2.6v10H4.2zM9.2 3h2.6v10H9.2z" fill="currentColor"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.6A4.9 4.9 0 1 0 4.7 4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.4 1.6v3.1h3.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const parseBool = (v) => (v === true || v === 'true' || v === '1' || v === 1 || v === 'with' ? true : v === false || v === 'false' || v === '0' || v === 0 || v === 'without' ? false : null);
  let uid = 0;
  let noiseTile = null;
  function noise() { // fixed asphalt grain, generated once from a seed
    if (noiseTile) return noiseTile;
    const n = document.createElement('canvas'); n.width = n.height = 128;
    const x = n.getContext('2d'), img = x.createImageData(128, 128), r = rng(4242);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = (r() * 9) | 0; }
    x.putImageData(img, 0, 0); return (noiseTile = n);
  }

  function mount(cfg) {
    const el = typeof cfg.el === 'string' ? document.querySelector(cfg.el) : cfg.el, id = ++uid;
    const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
    if (new URLSearchParams(location.search).get('embed') === '1') document.documentElement.classList.add('vzs-embed');
    const choices = cfg.choices || [];
    const group = (name, label, vals, show) => `<div class="vzs-group" role="radiogroup" aria-label="${esc(label)}">${show ? `<span class="vzs-glabel" aria-hidden="true">${esc(label)}</span>` : ''}<span class="vzs-seg">${vals.map(([v, t]) => `<label><input type="radio" name="vzs${id}-${name}" value="${esc(v)}"><span>${esc(t)}</span></label>`).join('')}</span></div>`;
    el.classList.add('vzs');
    // Status rows stay in the bar, so an embedded scene still says what is Today, In development or Vision.
    const MARK = { today: 'today', dev: '', vision: 'vision' };
    const NAME = { today: 'Today', dev: 'In&nbsp;development', vision: 'Vision' };
    const levels = ['today', 'dev', 'vision'].filter((l) => (cfg.statuses || []).some(([lvl]) => lvl === l));
    const key = levels.map((l) => `<span><i class="${MARK[l]}"></i>${NAME[l]}</span>`).join('');
    const statuses = (cfg.statuses || []).map(([lvl, text]) => `<li><i class="${MARK[lvl] ?? ''}" aria-hidden="true"></i>${esc(text).replace(/In development/g, 'In&nbsp;development')}</li>`).join(''); // the label never splits
    el.innerHTML = `<div class="vzs-stage"><canvas role="img" aria-label="${esc(cfg.label || '')}"></canvas><span class="vzs-illus" aria-hidden="true">Illustration</span></div>`
      + '<div class="vzs-bar"><p class="vzs-caption" aria-live="polite" aria-atomic="true"></p><p class="vzs-note">Illustration. Not a recording.</p>'
      + (statuses ? `<ul class="vzs-statuses" aria-label="Status">${statuses}</ul><p class="vzs-key" aria-hidden="true">${key}</p>` : '') + '</div>'
      + '<div class="vzs-controls" role="group" aria-label="Simulation controls">'
      + '<span class="vzs-pair"><button type="button" class="vzs-btn" data-act="play"></button>'
      + `<button type="button" class="vzs-btn" data-act="replay">${ICON.replay}<span>Replay</span></button></span>`
      + group('vz', 'View', [['1', 'With VZ'], ['0', 'Without VZ']], false)
      + choices.map((ch) => group(ch.name, ch.label, ch.values.map((v) => [v, v]), true)).join('') + '</div>';
    const stage = el.querySelector('.vzs-stage'), canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const capEl = el.querySelector('.vzs-caption'), playBtn = el.querySelector('[data-act=play]');
    const cam = { w: 0, h: 0, dpr: 1, scale: 1, rot: 0, cx: 0, cy: 0, view: null };
    const g = new Painter(ctx, cam), bg = document.createElement('canvas'), bgP = new Painter(bg.getContext('2d'), cam);
    const opts = Object.assign({ vz: true, compare: !!cfg.compare }, cfg.options);
    let cur, s, phase = 'run', phaseT = 0, acc = 0, last = null, raf = 0, clock = 0, bgKey = '';
    let playing = !reducedMQ.matches, onScreen = true, capIdx = -1, capAt = -1e9;

    function startRun(vz) {
      cur = Object.assign({}, opts, { vz }); s = cfg.init(cur, rng(cfg.seed || 1)); s.t = 0; acc = 0; capIdx = -1;
      const t0 = cfg.start ? cfg.start(cur) : 0; while (s.t + STEP / 2 < t0) step(); // a repeat run may skip its set-up
      sync();
    }
    const firstVz = () => (opts.compare ? true : opts.vz); // compare: With VZ first, then Without
    const step = () => { cfg.update(s, STEP, cur); s.t += STEP; }; // update sees s.t at the start of the step
    function seekTo(t, vz) { startRun(vz); phase = 'run'; while (s.t + STEP / 2 < t) step(); caption(true); render(); }
    const stillVz = () => (opts.compare ? true : opts.vz);
    const toStill = () => seekTo(cfg.still ? cfg.still(stillVz()) : 0, stillVz());

    function caption(force) {
      const lines = cfg.lines(cur), want = Math.min(cfg.beat(s, cur), lines.length - 1);
      if (want === capIdx && !force) return;
      if (force) capIdx = want; else if (capIdx < 0) capIdx = 0; else if (clock - capAt >= DWELL) capIdx = Math.min(capIdx + 1, want); else return;
      capAt = clock; if (capEl.textContent !== lines[capIdx]) capEl.textContent = lines[capIdx];
    }
    function fit() {
      const r = stage.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)), dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w === cam.w && h === cam.h && dpr === cam.dpr) return false;
      canvas.width = bg.width = Math.round(w * dpr); canvas.height = bg.height = Math.round(h * dpr);
      const tall = h > w, portrait = cfg.rotate !== false && tall, f = (tall && cfg.portraitFocus) || cfg.focus; // rotate: false keeps the plan upright but still uses portraitFocus
      const scale = portrait ? Math.min(w / f.h, h / f.w) : Math.min(w / f.w, h / f.h);
      Object.assign(cam, { w, h, dpr, scale, rot: portrait ? -Math.PI / 2 : 0, cx: f.x + f.w / 2, cy: f.y + f.h / 2 });
      const hw = w / 2 / scale, hh = h / 2 / scale, ex = portrait ? hh : hw, ey = portrait ? hw : hh;
      cam.view = { x0: cam.cx - ex, x1: cam.cx + ex, y0: cam.cy - ey, y1: cam.cy + ey };
      bgKey = ''; return true;
    }
    function ground() {
      const key = choices.map((ch) => (ch.live ? '' : cur[ch.name])).join() + '|' + canvas.width + 'x' + canvas.height;
      if (key === bgKey) return; bgKey = key;
      const b = bgP.ctx; bgP.emit.length = 0; b.setTransform(1, 0, 0, 1, 0, 0); b.fillStyle = C.asphalt; b.fillRect(0, 0, bg.width, bg.height);
      bgP.world(); if (cfg.ground) cfg.ground(bgP, cur);
      b.setTransform(1, 0, 0, 1, 0, 0); b.fillStyle = b.createPattern(noise(), 'repeat'); b.fillRect(0, 0, bg.width, bg.height);
    }
    function render() {
      if (!cam.w) fit();
      ground();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0);
      g.t = s.t; g.reduced = reducedMQ.matches; g.emit.length = 0; g.world();
      cfg.draw(g, s, cur);
      const f = phase === 'out' ? phaseT / FADE : phase === 'in' ? 1 - phaseT / FADE : 0;
      if (f > 0) { g.screen(); ctx.fillStyle = 'rgba(27,32,36,' + ease.smooth(f).toFixed(3) + ')'; ctx.fillRect(0, 0, cam.w, cam.h); }
    }
    function frame(now) {
      raf = 0; if (!active()) return;
      const dt = last == null ? 0 : Math.min((now - last) / 1000, 0.1); last = now; clock += dt;
      if (phase !== 'in') { acc += dt; while (acc >= STEP) { step(); acc -= STEP; } }
      if (phase === 'run' && s.over) { phase = reducedMQ.matches ? 'swap' : 'out'; phaseT = 0; }
      else if (phase !== 'run') phaseT += dt;
      if ((phase === 'out' && phaseT >= FADE) || phase === 'swap') { startRun(opts.compare ? !cur.vz : cur.vz); phase = reducedMQ.matches ? 'run' : 'in'; phaseT = 0; }
      else if (phase === 'in' && phaseT >= FADE) phase = 'run';
      caption(false); render(); raf = requestAnimationFrame(frame);
    }
    const active = () => playing && onScreen && !document.hidden;
    function schedule() { if (active() && !raf) { last = null; raf = requestAnimationFrame(frame); } }
    function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; last = null; }
    function sync() {
      playBtn.innerHTML = (playing ? ICON.pause : ICON.play) + `<span>${playing ? 'Pause' : 'Play'}</span>`;
      el.querySelectorAll('input[type=radio]').forEach((inp) => {
        const name = inp.name.split('-')[1], val = name === 'vz' ? (cur ? cur.vz : opts.vz) ? '1' : '0' : (cur || opts)[name];
        inp.checked = inp.value === String(val);
      });
      el.dataset.vz = cur && cur.vz ? 'with' : 'without';
    }
    function restart() { phase = 'run'; phaseT = 0; if (reducedMQ.matches && !playing) toStill(); else { startRun(firstVz()); caption(true); render(); } }
    const api = {
      play() { playing = true; sync(); schedule(); },
      pause() { playing = false; halt(); sync(); },
      reset() { restart(); },
      setOption(name, value) {
        if (name === 'vz') {
          const v = parseBool(value); if (v == null) return false;
          if (opts.compare && phase === 'run' && cur.vz === v) { opts.compare = cur.compare = false; opts.vz = v; sync(); return true; }
          opts.compare = false; opts.vz = v;
        } else if (name === 'compare') {
          const v = parseBool(value); if (v == null) return false; opts.compare = v;
        } else {
          const ch = choices.find((c) => c.name === name); if (!ch) return false;
          let val = ch.values.find((x) => String(x).toLowerCase() === String(value).toLowerCase());
          if (val == null && ch.values.length === 2 && parseBool(value) != null) val = ch.values[parseBool(value) ? 0 : 1]; // e.g. Show / Hide
          if (val == null) return false; opts[name] = val;
          if (ch.live) { cur[name] = val; sync(); render(); return true; } // a view option: the run goes on
        }
        restart(); return true;
      },
      // Testing helpers, not part of the embedding contract.
      seek(t, vz = stillVz()) { seekTo(t, !!vz); },
      info() { return Object.assign({ t: s.t, vz: cur.vz, compare: opts.compare, playing, phase, caption: capEl.textContent }, cfg.debug ? cfg.debug(s, cur) : {}); }
    };
    playBtn.addEventListener('click', () => (playing ? api.pause() : api.play()));
    el.querySelector('[data-act=replay]').addEventListener('click', api.reset);
    el.querySelectorAll('input[type=radio]').forEach((inp) => {
      const name = inp.name.split('-')[1];
      inp.addEventListener(name === 'vz' ? 'click' : 'change', () => api.setOption(name, name === 'vz' ? inp.value === '1' : inp.value));
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? halt() : schedule()));
    new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; if (onScreen) schedule(); else halt(); }).observe(stage);
    new ResizeObserver(() => { if (fit() && s) render(); }).observe(stage);
    reducedMQ.addEventListener('change', () => { if (reducedMQ.matches) { api.pause(); toStill(); } });
    fit();
    if (playing) { startRun(firstVz()); caption(true); render(); } else toStill();
    sync(); schedule();
    if (!window.VZSim) window.VZSim = api;
    return api;
  }

  window.VZKit = { C, RGB, FONT, rgba, clamp, lerp, ease, rng, hash, corners, occluded, sees, sight, route, arcPts, zoneCrossed, zoneSince, bubbleR, bubbleGap, mount, Painter };
})();
