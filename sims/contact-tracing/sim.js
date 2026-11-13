/* Contact tracing: an office floor through a working day. Synthetic trajectories only; no health advice. */
(function () {
  'use strict';
  const K = VZKit, { clamp, C, rgba, ease } = K, PI = Math.PI, TAU = PI * 2;

  // World units: about 40 to a metre. The floor is 1100 x 760; desks face the north windows.
  const W = 1100, D = 760, ROWS = [56, 300, 520], COLS = [400, 560, 720, 880, 1040];
  const H = [[180, 320, 800], [430, 320, 960], [650, 270, 960]];                         // aisles along x: y, x0, x1
  const V = [[320, 100, 650], [480, 100, 650], [640, 100, 650], [800, 180, 650], [960, 250, 650]]; // aisles along y: x, y0, y1
  const WALK = 90, CLOSE = 90, DWELL = 1.8, LIFE = 13, D_REP = 11.5, SPEED = { Normal: 1, Fast: 2 };
  const ENC = { rmax: 150, period: 0.7, rings: 3 }, RM = 1500;                              // an encounter's zone; the report's reach
  const L = {
    start: 'Morning on the office floor. People move between desks and meeting rooms.',
    mark: 'Time spent close together leaves a short-lived mark. Each phone keeps its own.',
    pass: 'A quick hello in passing leaves no mark. Only time spent close does.',
    report: 'A colleague reports positive. Only the people who were really close are notified.',
    pause: 'They pause. Everyone else keeps working.',
    expire: 'By evening, the marks have expired.',
    none: 'Nobody reports a case today. Everyone keeps working.',
    noMarks: 'Without VZ, nobody keeps track of who was close.',
    reportOff: 'A colleague reports positive. Nobody knows who was really close.',
    all: 'The whole floor pauses, including people who were never near.',
    again: 'Now without VZ. The same day, the same meetings.'
  };

  const onV = (x, y) => V.some(([vx, y0, y1]) => vx === x && y >= y0 && y <= y1);
  const seat = (col, row) => { const x = COLS[col], y = ROWS[row] + 44; return { p: [x, y], a: -PI / 2, stubs: [x - 80, x + 80].filter((vx) => onV(vx, y)).map((vx) => [[x, y], [vx, y]]) }; };
  const spot = (p, a, ...stubs) => ({ p, a, stubs: stubs.map((s) => [p].concat(s)) });
  const PLACE = {
    A1: spot([95, 198], -PI / 2, [[95, 232], [262, 232], [320, 204]]),        // meeting room: south side, west seat
    A2: spot([165, 198], -PI / 2, [[175, 224], [262, 224], [320, 200]]),       // south side, middle seat
    AE: spot([224, 136], PI, [[262, 150], [268, 196], [320, 196]]),            // east end of the table
    B1: spot([905, 110], 0, [[880, 140], [880, 250], [800, 250]]),             // small meeting room
    B2: spot([965, 168], -PI / 2, [[965, 202], [880, 206], [880, 250], [800, 250]]),
    K1: spot([150, 592], PI / 2, [[232, 594], [270, 650]]),                    // kitchen table
    K2: spot([204, 640], PI, [[270, 650]]),
    PR: spot([150, 420], -PI / 2, [[320, 430]]),                               // printer
    WA: spot([880, 700], PI / 2, [[880, 650]]),                                // water
    S1: spot([560, 208], PI / 2, [[560, 180]]), S2: spot([720, 208], PI / 2, [[720, 180]]) // shelves
  };
  // Each colleague: a desk [col, row] and the day's trips [depart, place]. The first one is the colleague who reports.
  const CREW = [
    [[0, 0], [[-4, 'A2'], [6.3, 'home']]], [[0, 1], [[-3.6, 'AE'], [5.5, 'home']]], [[1, 0], [[-6.6, 'A1'], [5.9, 'home']]],
    [[2, 0], [[13, 'S2'], [16, 'home']]], [[2, 1], []], [[3, 1], [[-2.0, 'B1'], [6.2, 'home']]], [[4, 1], []],
    [[0, 2], [[-3.6, 'K1'], [5.4, 'home'], [12.3, 'K2'], [15.4, 'home']]], [[1, 2], [[-3.2, 'K2'], [7.2, 'home']]], [[2, 2], [[4.8, 'PR'], [8.6, 'home']]],
    [[3, 2], [[-6.0, 'B2'], [8.0, 'home']]], [[4, 2], [[6.2, 'WA'], [8.8, 'home'], [12, 'WA'], [14.8, 'home']]], [[1, 1], [[12.6, 'S1'], [15.8, 'home']]]
  ];

  // Shortest walk along the aisles between two aisle points (Dijkstra over the aisle crossings).
  function plan(a, b) {
    const pts = [a, b];
    for (const [y, x0, x1] of H) for (const [x, y0, y1] of V) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) pts.push([x, y]);
    const lines = H.map(([y, x0, x1]) => (p) => (p[1] === y && p[0] >= x0 && p[0] <= x1 ? p[0] : null)).concat(V.map(([x, y0, y1]) => (p) => (p[0] === x && p[1] >= y0 && p[1] <= y1 ? p[1] : null)));
    const adj = pts.map(() => []), dist = pts.map(() => Infinity), prev = pts.map(() => -1), done = [];
    for (const on of lines) {
      const q = pts.map((p, i) => [on(p), i]).filter((e) => e[0] != null).sort((e, f) => e[0] - f[0]);
      for (let k = 1; k < q.length; k++) { const d = q[k][0] - q[k - 1][0]; adj[q[k][1]].push([q[k - 1][1], d]); adj[q[k - 1][1]].push([q[k][1], d]); }
    }
    dist[0] = 0;
    for (;;) {
      let u = -1; for (let i = 0; i < pts.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === 1) break; done[u] = 1;
      for (const [v, d] of adj[u]) if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
    }
    const out = []; for (let i = 1; i >= 0; i = prev[i]) out.unshift(pts[i]); return out;
  }
  const plen = (w) => w.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - w[i - 1][0], p[1] - w[i - 1][1]) : 0), 0);
  function leg(from, to) {
    let best = null;
    for (const s1 of from.stubs) for (const s2 of to.stubs) {
      const w = s1.concat(plan(s1[s1.length - 1], s2[s2.length - 1]), s2.slice().reverse()).filter((p, i, a) => !i || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
      const n = plen(w); if (!best || n < best.n) best = { w, n };
    }
    return K.route(best.w, 14);
  }
  const PEOPLE = CREW.map(([[c, r], trips]) => {
    const home = seat(c, r); let at = home;
    const legs = trips.map(([t0, name]) => { const to = name === 'home' ? home : PLACE[name], rt = leg(at, to); at = to; return { t0, t1: t0 + rt.total / WALK, rt, to }; });
    return { home, legs, from: home };
  });
  const N = PEOPLE.length;
  // Where a colleague is at day time d. Walkers keep to the right, so two people never share one line.
  function where(P, d) {
    let at = P.home;
    for (const g of P.legs) {
      if (d < g.t0) break;
      if (d < g.t1) { const s = (d - g.t0) * WALK, p = g.rt.at(s), k = 16 * Math.min(1, s / 30, (g.rt.total - s) / 30); return { x: p.x - Math.sin(p.a) * k, y: p.y + Math.cos(p.a) * k, a: p.a }; }
      at = g.to;
    }
    return { x: at.p[0], y: at.p[1], a: at.a };
  }

  function rr(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function furniture(g, x, y, w, h, o = {}) { // a desk or a table: a soft shadow, a flat top, a fine inset line
    const c = g.ctx, [sx, sy] = g.shade(4, 5);
    c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(x + sx, y + sy, w, h);
    c.fillStyle = o.tone || '#363E44'; c.fillRect(x, y, w, h);
    c.strokeStyle = rgba('lane', 0.08); c.lineWidth = g.px; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }
  function chair(g, x, y) { const c = g.ctx; c.fillStyle = '#2C3338'; c.beginPath(); rr(c, x - 12, y - 12, 24, 24, 6); c.fill(); c.strokeStyle = rgba('lane', 0.1); c.lineWidth = g.px; c.stroke(); }
  function glass(g, pts) { g.marking(pts, { w: 3, alpha: 0.2 }); }

  function ground(g) {
    const c = g.ctx;
    // Beyond the floor: a stair core to the west, lifts to the east. Quiet, so the floor stays the subject.
    c.fillStyle = '#1F2529'; c.fillRect(-420, -60, 420, D + 120); c.fillRect(W, -60, 420, D + 120);
    c.strokeStyle = rgba('lane', 0.09); c.lineWidth = g.px; c.beginPath();
    for (let y = 130; y <= 370; y += 20) { c.moveTo(-290, y); c.lineTo(-170, y); c.moveTo(-150, y); c.lineTo(-30, y); }
    c.rect(-290, 130, 260, 240); c.rect(-290, 460, 260, 220);
    for (let y = 140; y < 560; y += 140) { c.rect(1150, y, 110, 110); c.moveTo(1150, y); c.lineTo(1260, y + 110); c.moveTo(1260, y); c.lineTo(1150, y + 110); }
    c.stroke();
    g.pavement([[0, 0], [W, 0], [W, D], [0, D]], { fill: '#262C31' });
    c.fillStyle = 'rgba(3,5,7,.35)'; c.fillRect(1000, 660, 100, 100); // the building core
    c.strokeStyle = C.kerb; c.lineWidth = 10; c.strokeRect(0, 0, W, D);
    c.strokeStyle = rgba('lane', 0.12); c.lineWidth = g.px; c.strokeRect(5, 5, W - 10, D - 10);
    for (const [x0, x1] of [[30, 270], [340, 800], [850, 1070]]) { // windows in the north wall
      g.marking([[x0, 0], [x1, 0]], { w: 4, alpha: 0.32 });
      for (let x = x0; x <= x1; x += 80) g.marking([[x, -5], [x, 5]], { w: 2, alpha: 0.4 });
    }
    glass(g, [[290, 0], [290, 168]]); glass(g, [[290, 236], [290, 252], [0, 252]]);                   // meeting room
    glass(g, [[830, 0], [830, 232], [848, 232]]); glass(g, [[912, 232], [W, 232]]);                 // small meeting room
    furniture(g, 70, 96, 130, 70); furniture(g, 930, 82, 70, 56);
    for (const k of ['A1', 'A2', 'AE', 'B1', 'B2']) chair(g, ...PLACE[k].p);
    for (let r = 0; r < 3; r++) for (let col = 0; col < 5; col++) if (r || col < 3) { furniture(g, COLS[col] - 38, ROWS[r] - 18, 76, 36); chair(g, COLS[col], ROWS[r] + 44); }
    furniture(g, 30, 718, 220, 34, { tone: '#30373C' }); furniture(g, 122, 612, 56, 56);           // kitchen counter and table
    furniture(g, 115, 360, 70, 40, { tone: '#30373C' }); furniture(g, 860, 718, 40, 30, { tone: '#30373C' }); // printer, water
    furniture(g, 530, 228, 60, 18, { tone: '#30373C' }); furniture(g, 690, 228, 60, 18, { tone: '#30373C' }); // shelves
    g.marking([[0, 520], [200, 520]], { w: 3, alpha: 0.14 });
    for (const [x, y, r] of [[40, 300, 22], [250, 470, 20], [1062, 262, 22], [300, 724, 20], [960, 724, 18]]) g.tree(x, y, r);
    if (!g.portrait) { g.label(145, 30, 'Meeting room'); g.label(965, 30, 'Meeting room'); g.label(70, 690, 'Kitchen'); } // too large for the plan on a phone
  }

  function init(o) {
    return {
      d: 0, rep: null, repD: null, clearAt: null, end: null, over: false, firstMark: null,
      pos: PEOPLE.map((P) => where(P, 0)), dw: new Array(N * N).fill(0), zk: new Array(N).fill(0),
      marks: PEOPLE.map(() => []), seen: new Array(N).fill(null), note: new Array(N).fill(null), arrive: new Array(N).fill(null),
      pause: new Array(N).fill(null)
    };
  }

  function update(s, dt, o) {
    const sp = SPEED[o.daySpeed] || 1, T = s.t + dt, d = s.d + dt * sp; s.d = d;
    PEOPLE.forEach((P, i) => { const q = s.pause[i]; s.pos[i] = where(P, q ? q.d + 0.25 * (1 - Math.exp(-(d - q.d) / 0.25)) : d); });
    // The report: with VZ it reaches every phone, and only phones that keep a mark of the case react.
    if (o.reportCase === 'On' && s.rep == null && d >= D_REP) {
      s.rep = T; s.repD = d; s.pause[0] = { d: d + 0.9 * sp, t: T + 0.9 };
      for (let i = 1; i < N; i++) {
        if (!o.vz) { s.pause[i] = { d: d + (0.8 + 0.05 * i) * sp, t: T + 0.8 + 0.05 * i }; continue; }
        if (s.marks[i].some((m) => m.j === 0)) { const r = Math.hypot(s.pos[i].x - s.pos[0].x, s.pos[i].y - s.pos[0].y); s.arrive[i] = T + (1 - Math.pow(1 - Math.min(r, RM - 1) / RM, 1 / 1.7)) * 2.1; }
      }
    }
    for (let i = 1; i < N; i++) if (s.arrive[i] != null && s.note[i] == null && T >= s.arrive[i]) { s.note[i] = T; s.pause[i] = { d: d + 0.9 * sp, t: T + 0.9 }; }
    if (o.vz) {
      // Close encounters, phone by phone: each keeps its own short-lived mark of the other.
      for (let i = 0; i < N; i++) {
        let near = false;
        for (let j = i + 1; j < N; j++) {
          const k = i * N + j, a = s.pos[i], b = s.pos[j];
          if (s.pause[i] || s.pause[j] || Math.hypot(a.x - b.x, a.y - b.y) > CLOSE) { s.dw[k] = 0; continue; }
          s.dw[k] += dt * sp;
          if (s.dw[k] >= DWELL && s.dw[k] - dt * sp < DWELL) {
            for (const [x, y] of [[i, j], [j, i]]) { s.marks[x] = s.marks[x].filter((m) => m.j !== y); s.marks[x].push({ j: y, d, t: T }); s.seen[x] = T; }
            if (s.firstMark == null) s.firstMark = T;
          }
        }
        for (let j = 0; j < N; j++) if (j !== i && s.dw[Math.min(i, j) * N + Math.max(i, j)] > 0.4) near = true;
        s.zk[i] = clamp(s.zk[i] + (near ? dt : -dt) / 0.4);
        s.marks[i] = s.marks[i].length && d - s.marks[i][0].d > LIFE ? s.marks[i].filter((m) => d - m.d <= LIFE) : s.marks[i];
      }
      if (s.clearAt == null && d > D_REP + 1 && s.marks.every((m) => !m.length)) s.clearAt = T;
    }
    if (s.end == null) {
      if (o.vz ? s.clearAt != null && T > s.clearAt + 2.4 && (s.rep == null || T > s.rep + 6.2) : s.rep != null ? T > s.rep + 4.4 : d > D_REP + 3.5 && T > 6) s.end = T;
      else if (d > 30) s.end = T;
    }
    s.over = s.end != null && T > s.end + 0.3;
  }

  // The report's reach: three rings that leave the phone once, timed and drawn like the kit's zone.
  function burst(g, x, y, age) {
    const c = g.ctx; c.lineWidth = 1.25 * g.px;
    for (let k = 0; k < 3; k++) {
      const p = (age - k * 0.7) / 2.1; if (p <= 0 || p >= 1) continue;
      c.strokeStyle = rgba('zone', 0.9 * Math.pow(1 - p, 1.25) * Math.min(1, p / 0.04)); c.beginPath(); c.arc(x, y, RM * (1 - Math.pow(1 - p, 1.7)), 0, TAU); c.stroke();
    }
  }
  function diamond(c, x, y, r, a) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fillStyle = rgba('zone', a); c.fill(); c.strokeStyle = rgba('dark', 0.7 * a); c.lineWidth = 1; c.stroke(); }

  function draw(g, s, o) {
    const c = g.ctx, T = s.t, sp = SPEED[o.daySpeed] || 1, day = clamp(s.d / 20), P = g.portrait;
    const fade = (a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
    const dim = (i) => (s.pause[i] ? ease.smooth((T - s.pause[i].t) / 0.6) : 0);
    // Daylight through the north windows: it swings across the floor as the day goes on.
    const sk = 200 - 400 * day, lg = c.createLinearGradient(0, 6, 0, 250);
    lg.addColorStop(0, rgba('lane', 0.05 * (1 - 0.7 * day))); lg.addColorStop(1, rgba('lane', 0)); c.fillStyle = lg;
    for (const [x0, x1] of [[30, 270], [340, 800], [850, 1070]]) { g.path([[x0, 6], [x1, 6], [x1 + sk, 250], [x0 + sk, 250]]); c.fill(); }
    // Each desk's screen is lit while its owner is working: at a glance, the lit floor is the working floor.
    PEOPLE.forEach((Pp, i) => {
      const k = 1 - dim(i), x = Pp.home.p[0], y = Pp.home.p[1] - 57;
      if (k > 0.02) { const gl = c.createRadialGradient(x, y, 0, x, y, 62); gl.addColorStop(0, rgba('lane', 0.1 * k)); gl.addColorStop(1, rgba('lane', 0)); c.fillStyle = gl; c.fillRect(x - 62, y - 62, 124, 124); }
      c.fillStyle = rgba('lane', 0.14 + 0.5 * k); c.fillRect(x - 15, y - 1.75, 30, 3.5);
    });
    PEOPLE.forEach((_, i) => g.person(s.pos[i], { r: 11, alpha: 1 - 0.62 * dim(i), phone: o.vz ? null : 'off' }));
    if (!o.vz && s.rep != null) { g.screen(); c.fillStyle = 'rgba(10,13,16,' + (0.3 * ease.smooth((T - s.rep - 0.8) / 0.8)).toFixed(3) + ')'; c.fillRect(0, 0, g.cam.w, g.cam.h); g.world(); }
    if (day > 0.75) { g.screen(); c.fillStyle = 'rgba(2,5,8,' + (0.2 * ease.smooth((day - 0.75) / 0.25)).toFixed(3) + ')'; c.fillRect(0, 0, g.cam.w, g.cam.h); g.world(); }
    const r0 = s.pos[0];
    if (o.vz) {
      PEOPLE.forEach((_, i) => { if (s.zk[i] > 0.02 && !s.pause[i]) g.zone(s.pos[i].x, s.pos[i].y, Object.assign({ strength: 0.6 * s.zk[i], phase: (i * 0.29) % 0.7 }, ENC)); });
      if (s.rep != null) burst(g, r0.x, r0.y, T - s.rep);
      PEOPLE.forEach((_, i) => { c.globalAlpha = 1 - 0.55 * dim(i); g.device(s.pos[i].x, s.pos[i].y); c.globalAlpha = 1; });
      PEOPLE.forEach((_, i) => {
        const p = s.pos[i];
        for (const m of s.marks[i]) g.catchFx(p.x, p.y, T - m.t);
        if (s.note[i] != null) { g.catchFx(p.x, p.y, T - s.note[i]); g.flash(p, T - s.note[i], { l: 22, w: 22 }); }
      });
      // Each phone's own marks, kept beside it: one diamond per close encounter, fading as it ages.
      g.screen();
      PEOPLE.forEach((_, i) => {
        const [x, y] = g.toScreen(s.pos[i].x, s.pos[i].y);
        s.marks[i].forEach((m, n) => {
          const age = s.d - m.d, a = clamp((LIFE - age) / (0.45 * LIFE)) * clamp((T - m.t) / 0.3) * (1 - 0.5 * dim(i));
          const hot = m.j === 0 && s.note[i] != null ? clamp(1 - (T - s.note[i]) / 1.2) : 0;
          diamond(c, x + 15 + n * 10, y - 14, 4 + 2 * hot, Math.min(1, a + hot));
        });
      });
      g.world();
    }
    if (s.rep != null) { g.flash(r0, T - s.rep, { l: 22, w: 22, tone: 'alert' }); g.chip(r0.x, r0.y, 'Positive', { tone: 'alert', k: fade(s.rep, s.rep + 3.4), side: 'down', gap: 18 }); }
    if (o.vz) for (let i = 1; i < N; i++) if (s.note[i] != null) g.chip(s.pos[i].x, s.pos[i].y, 'Close contact', { k: fade(s.note[i], s.note[i] + 3.4), side: P ? 'down' : 'up', gap: 18 });
  }

  let speedNow = 1;
  const api = K.mount({
    el: '#sim',
    label: 'Top-down plan of an office floor through a working day. People move between desks, meeting rooms and the kitchen. With VZ, time spent close together leaves a short-lived mark on each phone. When one colleague reports positive, only the people who were really close are notified and pause; everyone else keeps working, and the marks expire by evening. Without VZ, nobody knows who was close and the whole floor pauses. The caption below describes each moment.',
    focus: { x: -40, y: -40, w: 1180, h: 840 },
    portraitFocus: { x: -30, y: -20, w: 1160, h: 800 },
    statuses: [['today', 'Contact tracing between colleagues: Today, the 2020–21 product']],
    compare: false, // the scene stays With VZ; Without VZ is the toggle
    options: { daySpeed: 'Normal', reportCase: 'On' },
    choices: [{ name: 'daySpeed', label: 'Day speed', values: ['Normal', 'Fast'] }, { name: 'reportCase', label: 'Report a case', values: ['On', 'Off'] }],
    start: (o) => (o.compare && !o.vz ? 6.5 / (SPEED[o.daySpeed] || 1) : 0),
    still: () => D_REP / speedNow + 1.4,
    lines(o) {
      const on = o.reportCase === 'On';
      if (o.vz) return [L.start, L.mark, L.pass].concat(on ? [L.report, L.pause, L.expire] : [L.none, L.expire]);
      if (!on) return [o.compare ? L.again : L.start, L.noMarks, L.none];
      return o.compare ? [L.again, L.reportOff, L.all] : [L.start, L.noMarks, L.reportOff, L.all];
    },
    beat(s, o) {
      const on = o.reportCase === 'On';
      if (o.vz) {
        if (s.clearAt != null) return on ? 5 : 4;
        if (on && s.rep != null) return s.t > s.rep + 2.4 ? 4 : 3;
        if (!on && s.d >= D_REP) return 3;
        return s.d >= 7 ? 2 : s.firstMark != null ? 1 : 0;
      }
      if (o.compare) return on ? (s.rep == null ? 0 : s.t > s.rep + 1.8 ? 2 : 1) : s.d >= D_REP ? 2 : 1;
      return s.rep != null ? (s.t > s.rep + 1.8 ? 3 : 2) : !on && s.d >= D_REP ? 2 : s.d >= 3 ? 1 : 0;
    },
    debug: (s) => ({ d: s.d, rep: s.rep, clearAt: s.clearAt, notified: s.note.map((n, i) => (n != null ? i : -1)).filter((i) => i >= 0), paused: s.pause.filter(Boolean).length, marks: s.marks.map((m) => m.map((q) => q.j).join('')).join('|'), end: s.end }),
    ground, init, update, draw
  });
  // The reduced-motion still depends on the day speed, so remember it before the kit restarts the run.
  const set = api.setOption;
  api.setOption = (name, value) => { const prev = speedNow; if (name === 'daySpeed') speedNow = String(value).toLowerCase() === 'fast' ? 2 : 1; const ok = set(name, value); if (!ok) speedNow = prev; return ok; };
})();
