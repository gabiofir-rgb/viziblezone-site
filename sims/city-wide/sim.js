/* A city without a network: the city-wide scene, built on simkit. An illustration drawn after a computer simulation:
   it ships no simulator data and copies no numbers, only three behaviours (most phones are reached, not all; an
   obstacle delays the front and does not stop it; an addressed message wakes only a narrow strip of the city).
   An invented city; synthetic phones. */
(function () {
  'use strict';
  const K = VZKit, { clamp, lerp, rgba, C } = K, TAU = Math.PI * 2;

  // World units: this plan is drawn about 12 times smaller than the street scenes, so one block (about 100 m) is
  // 400 units. North is up. A river crosses the district from west to east, with two bridges; the avenue runs
  // west to east on the north bank, where the command post stands. People are phone dots at this scale.
  const SEED = 11, PITCH = 460, BW = 400, COLS = [-4, 12];
  const ROWS = [[-1020, -720], [-660, -360], [-300, 40], [170, 480], [540, 840], [1180, 1480], [1540, 1860], [1920, 2220], [2280, 2580], [2640, 2940]];
  const AVE = [40, 170], RIVER = [840, 1180], NEAR = 4;                        // rows 0..4 are the near (north) bank
  const BRIDGES = [1350, 3190], BRW = 104;                                       // on the streets between columns 2|3 and 6|7
  const DIAG = { x: 1350, y: 1180, dx: 0.661, dy: 0.751, w: 84 };                // the diagonal street, south-east from the west bridge
  const DARK = ['6,6', '7,0', '2,8'];                                            // behind thick walls: one deep in the dense quarter, two at the edge
  const DENSE = (r, c) => r >= 6 && r <= 7 && c >= 5 && c <= 8;
  const PARK = { r: 3, c: [4, 5] }, CPB = '2,0', YARDS = { '2,3': { x: 1580, y: -140 }, '5,5': { x: 2500, y: 1330 } }; // the masts stand in yards
  const CP = { x: 230, y: -60 };
  const VIEW = { x0: -1700, x1: 5900, y0: -900, y1: 2800 };                    // phones beyond this are never on any screen
  // The streets a call or a message follows: geometry only. The viewer sees its two ends and one light running between.
  const PATHS = {
    SOS: [[640, 1700], [890, 1510], [890, 1160], [1350, 1160], [1350, 860], [1350, 105], [430, 105], [CP.x, CP.y]],
    Message: [[640, 330], [890, 105], [2270, 105], [3190, 105], [3190, 860], [3190, 1160], [3190, 1510], [3650, 1510], [3880, 1700]]
  };
  const LEG = { SOS: 0.5, Message: 0.42, back: 0.26 }, T0 = { SOS: 1.1, Message: 0.9 };
  const DUR = (n, back) => (PATHS[n].length - 1) * LEG[back ? 'back' : n];        // the run's time, by its length in streets
  const STATUS = [['vision', 'An alert across a whole city: Vision'], ['vision', 'SOS to the nearest command post, across the city: Vision'],
    ['vision', 'A message to one person, across the city: Vision']]; // Yitro, decision 12: no Today line
  const L = {
    Alert: {
      with: ['The networks are down. The command post sends one alert.',
        'With VZ, it will pass from phone to phone, block by block, across the river and on.',
        'Vision: one alert will cross a whole city. A few phones behind thick walls may still be missed.'],
      without: ['The networks are down. The command post sends one alert.', 'Without VZ, the alert has no way out of the command post.', 'The city hears nothing.']
    },
    SOS: {
      with: ['The networks are down. Someone across the river calls for help.', 'With VZ, the call will reach the people nearby, with its position.',
        'Vision: it will also travel across the city to the nearest command post. Everyone else stays undisturbed.'],
      without: ['The networks are down. Someone across the river calls for help.', 'Without VZ, the call cannot leave the phone.', 'Nobody knows, and nobody knows where.']
    },
    Message: {
      with: ['The networks are down. One person writes to another, across the city.', 'With VZ, the message will travel towards that one person. The rest of the city stays quiet.',
        'Vision: it will arrive, and the sender will know it arrived.'],
      without: ['The networks are down. One person writes to another, across the city.', 'Without VZ, the message waits on the phone.', 'It leaves only when a network returns.']
    },
    again: 'Now without VZ. The networks are down, so nothing leaves the phone.'
  };
  // Under a Show me row (?micro=1) the second line is said as the Vision it is (advisors' fold, 13.11.2026, item 8).
  const MICRO = {
    Alert: 'Vision: it will pass from phone to phone, block by block, across the river and on.',
    SOS: 'Vision: the call will reach the people nearby, with its position.',
    Message: 'Vision: the message will travel towards that one person. The rest of the city will stay quiet.'
  };

  /* ------------------------------------------------------------------ the city */
  const rnd = K.rng(SEED), key = (r, c) => r + ',' + c;
  const dDiag = (x, y) => (x - DIAG.x) * DIAG.dy - (y - DIAG.y) * DIAG.dx;      // signed distance from the diagonal's centre line
  const cutByDiag = (x0, y0, x1, y1, m) => {
    if (y1 < DIAG.y) return false;
    const d = [dDiag(x0, y0), dDiag(x1, y0), dDiag(x0, y1), dDiag(x1, y1)];
    return Math.min(...d) < DIAG.w / 2 + m && Math.max(...d) > -DIAG.w / 2 - m;
  };
  const blocks = [], byKey = {};
  for (let r = 0; r < ROWS.length; r++) for (let c = COLS[0]; c <= COLS[1]; c++) {
    const k = key(r, c); if (r === PARK.r && c === PARK.c[1]) continue;         // the park takes two cells
    const park = r === PARK.r && c === PARK.c[0], x0 = c * PITCH, x1 = park ? (c + 1) * PITCH + BW : x0 + BW, [y0, y1] = ROWS[r];
    const b = { k, r, c, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, near: r <= NEAR, park, dark: DARK.includes(k), dense: DENSE(r, c), diag: cutByDiag(x0, y0, x1, y1, 0), T: null, phones: [] };
    blocks.push(b); byKey[k] = b; if (park) byKey[key(r, PARK.c[1])] = b;
  }
  // When the front reaches each block: a shortest path over the blocks. It runs faster along the avenue and the
  // diagonal, crosses the river only at the bridges and a moment later, and goes round the three dark blocks.
  (function lightTimes() {
    const near = (a, b) => {
      const gx = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), gy = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
      return a.near === b.near && gx < 140 && gy < 140;
    };
    const live = blocks.filter((b) => !b.dark), adj = new Map(live.map((b) => [b, []]));
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j]; if (!near(a, b)) continue;
      let d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      const along = Math.abs(a.cy - b.cy) < 1, onAve = (q) => q.y1 === AVE[0] || q.y0 === AVE[1];
      if (along && onAve(a) && onAve(b)) d /= 5; else if (a.diag && b.diag) d /= 1.5;
      adj.get(a).push([b, d]); adj.get(b).push([a, d]);
    }
    for (const x of BRIDGES) { // the two blocks beside each bridge end, on both banks
      const ends = (row) => live.filter((b) => b.r === row && (Math.abs(b.x1 - (x - 30)) < 1 || Math.abs(b.x0 - (x + 30)) < 1));
      for (const a of ends(NEAR)) for (const b of ends(NEAR + 1)) { const d = Math.hypot(a.cx - b.cx, a.cy - b.cy) + 200; adj.get(a).push([b, d]); adj.get(b).push([a, d]); }
    }
    const src = byKey[CPB], D = new Map([[src, 0]]), open = [src];
    while (open.length) {
      open.sort((p, q) => D.get(p) - D.get(q)); const a = open.shift();
      for (const [b, w] of adj.get(a)) { const v = D.get(a) + w; if (!D.has(b) || v < D.get(b) - 1e-6) { if (!D.has(b)) open.push(b); D.set(b, v); } }
    }
    const inFocus = (b) => b.cx > -100 && b.cx < 4100 && b.cy > -350 && b.cy < 2300, j = K.rng(SEED + 1);
    const far = Math.max(...live.filter(inFocus).map((b) => D.get(b)));
    for (const b of live) b.T = 0.6 + Math.pow(D.get(b) / far, 1.2) * 5.6 + j() * 0.3; // a little faster near the start
  })();
  // Phones: the two ends of each path first (the caller, the sender, the recipient; the SOS ends at the command
  // post), then two or three a block (three in the dense quarter and the park, fewer beyond the plan's frame).
  // They do not move.
  const phones = [], inView = (x, y) => x > VIEW.x0 && x < VIEW.x1 && y > VIEW.y0 && y < VIEW.y1;
  const nearestLit = (x, y) => { let m = null, md = Infinity; for (const b of blocks) { if (b.T == null) continue; const d = Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)); if (d < md) { md = d; m = b; } } return m; };
  const blockAt = (x, y) => blocks.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) || null, routes = {};
  const end = ([x, y]) => { const b = blockAt(x, y), q = { x, y, b, t: b.T + 0.25 }; b.phones.push(q); phones.push(q); return q; };
  for (const name of Object.keys(PATHS)) {
    const P = PATHS[name], rt = K.route(P, 60), cum = [0];
    for (let i = 1; i < rt.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(rt.pts[i][0] - rt.pts[i - 1][0], rt.pts[i][1] - rt.pts[i - 1][1]));
    routes[name] = { rt, cum, a: end(P[0]), z: name === 'SOS' ? CP : end(P[P.length - 1]) };
  }
  for (const b of blocks) {
    if (b.k === CPB || !inView(b.cx, b.cy)) continue;
    const outer = b.cx < -100 || b.cx > 4100 || b.cy < -350 || b.cy > 2300;
    const n = b.park ? 3 : b.dense ? 3 : outer ? 1 + (rnd() < 0.5) : 2 + (rnd() < 0.4);
    for (let i = 0; i < n; i++) {
      let x, y, tries = 0;
      do { x = lerp(b.x0 + 46, b.x1 - 46, rnd()); y = lerp(b.y0 + 46, b.y1 - 46, rnd()); }
      while (++tries < 12 && ((Math.abs(dDiag(x, y)) < DIAG.w && y > DIAG.y) || (YARDS[b.k] && Math.hypot(YARDS[b.k].x - x, YARDS[b.k].y - y) < 150) || b.phones.some((p) => Math.hypot(p.x - x, p.y - y) < 110)));
      const p = { x, y, b, t: b.T == null ? null : b.T + 0.05 + rnd() * 0.45 }; b.phones.push(p); phones.push(p);
    }
  }
  for (const x of BRIDGES) { // a phone on each bridge, beside the parapet: the front crosses there
    const t = (y) => nearestLit(x, y).T, q = { x: x + 34, y: (RIVER[0] + RIVER[1]) / 2, b: null }; q.t = (t(RIVER[0] - 30) + t(RIVER[1] + 30)) / 2; phones.push(q);
  }
  const pick = (x, y) => phones.reduce((m, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(m.x - x, m.y - y) ? p : m));
  const FAR = pick(3420, 2070), NEIGHBOUR = pick(1120, 1560), CALLER = routes.SOS.a, SENDER = routes.Message.a, TO = routes.Message.z;
  const ENDS = [CALLER, SENDER, TO];
  // The blocks the SOS reaches directly: the caller's own and the ring of neighbours on the same bank.
  const around = blocks.filter((b) => !b.dark && !b.near && Math.abs(b.cx - CALLER.b.cx) < PITCH * 1.6 && Math.abs(b.cy - CALLER.b.cy) < 520);
  const aroundT = new Map(around.map((b) => [b, 1.0 + Math.hypot(b.cx - CALLER.b.cx, b.cy - CALLER.b.cy) / 900 + 0.15 * K.hash(b.r, b.c)]));
  // The light runs at one speed along the streets, easing only at its start and its end (u, p: 0..1 of time and length).
  const RAMP = 0.1, VMAX = 1 / (1 - RAMP);
  const along = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < RAMP ? (VMAX * u * u) / (2 * RAMP) : u > 1 - RAMP ? 1 - (VMAX * (1 - u) * (1 - u)) / (2 * RAMP) : VMAX * (u - RAMP / 2));
  const when = (p) => (p < VMAX * RAMP / 2 ? Math.sqrt((2 * RAMP * p) / VMAX) : p > 1 - VMAX * RAMP / 2 ? 1 - Math.sqrt((2 * RAMP * (1 - p)) / VMAX) : p / VMAX + RAMP / 2);
  // The blocks each path passes, and when the light passes them: they glow faintly, then fade.
  for (const name of Object.keys(PATHS)) {
    const { rt } = routes[name], passed = new Map();
    for (let d = 0; d <= rt.total; d += 30) {
      const q = rt.at(d);
      for (const b of blocks) if (!b.dark && Math.hypot(Math.max(b.x0 - q.x, 0, q.x - b.x1), Math.max(b.y0 - q.y, 0, q.y - b.y1)) < 70 && !passed.has(b)) passed.set(b, T0[name] + when(d / rt.total) * DUR(name));
    }
    routes[name].passed = passed;
  }

  /* ---------------------------------------------------------------- ground */
  function tower(g, x, y) { // a mobile mast seen from above, struck through: the network is down (as in the public-safety scene)
    const c = g.ctx, u = g.px * 0.45, R = 30 * u;
    g.marking([[x - 70 * u, y - 70 * u], [x + 70 * u, y - 70 * u], [x + 70 * u, y + 70 * u], [x - 70 * u, y + 70 * u], [x - 70 * u, y - 70 * u]], { dash: [10 * u, 10 * u], w: 3 * u, alpha: 0.25 });
    const p = [0, 1, 2].map((i) => [x + Math.cos(-Math.PI / 2 + (i * TAU) / 3) * R, y + Math.sin(-Math.PI / 2 + (i * TAU) / 3) * R]);
    c.strokeStyle = '#7C878E'; c.lineWidth = 4 * u; g.path(p).stroke();
    c.lineWidth = 1.5 * g.px; c.beginPath(); for (const [a, b] of p) { c.moveTo(x, y); c.lineTo(a, b); } c.stroke();
    c.fillStyle = '#8F999F'; for (let i = 0; i < 3; i++) { c.save(); c.translate(x, y); c.rotate(-Math.PI / 2 + (i * TAU) / 3); c.fillRect(R, -11 * u, 9 * u, 22 * u); c.restore(); }
    c.strokeStyle = K.rgba('lane', 0.6); c.lineWidth = 5 * u; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 62 * u, y + 62 * u); c.lineTo(x + 62 * u, y - 62 * u); c.stroke(); c.lineCap = 'butt';
  }
  function roofs(g, b) { // two to four roofs a block, more and smaller in the dense quarter; none across the diagonal street
    const r = K.rng(b.r * 131 + b.c * 17 + 5), cols = b.dense ? 3 : 1 + (r() < 0.6), rows = b.dense ? 2 : 1 + (r() < 0.55), gap = 14;
    const xs = [b.x0], ys = [b.y0];
    for (let i = 1; i < cols; i++) xs.push(lerp(b.x0, b.x1, (i + (r() - 0.5) * 0.4) / cols)); xs.push(b.x1);
    for (let i = 1; i < rows; i++) ys.push(lerp(b.y0, b.y1, (i + (r() - 0.5) * 0.4) / rows)); ys.push(b.y1);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x0 = xs[i] + (i ? gap / 2 : 0), x1 = xs[i + 1] - (i < cols - 1 ? gap / 2 : 0), y0 = ys[j] + (j ? gap / 2 : 0), y1 = ys[j + 1] - (j < rows - 1 ? gap / 2 : 0);
      if (!cutByDiag(x0, y0, x1, y1, 14)) g.building(x0, y0, x1 - x0, y1 - y0, { seed: (x0 * 3 + y0 * 7) | 0, height: b.dense ? 1.2 : 0.5 + r() * 0.7 });
    }
  }
  function ground(g) {
    const c = g.ctx, X0 = -2200, X1 = 6400, Y0 = -1300, Y1 = 3200, px = g.px;
    g.pavement([[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], { grid: 0 });
    // The river: dark water between promenades, its banks drawn as a lane hairline.
    const top = [], bot = [];
    for (let x = X0; x <= X1; x += 40) { top.push([x, RIVER[0] + 46 + 16 * Math.sin(x / 520) + 9 * Math.sin(x / 190 + 1)]); bot.push([x, RIVER[1] - 50 + 14 * Math.sin(x / 610 + 2) + 8 * Math.sin(x / 240)]); }
    g.path([...top, ...bot.slice().reverse()]); c.fillStyle = C.asphalt; c.fill();
    c.strokeStyle = rgba('lane', 0.16); c.lineWidth = px; g.path(top, false).stroke(); g.path(bot, false).stroke();
    for (const b of blocks) {
      if (b.park) { // trees on darker paving, and its paths
        g.pavement([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], { fill: '#283035', grid: 0 });
        g.marking([[b.x0, b.y0 + 120], [b.cx, b.cy], [b.x1, b.y1 - 90]], { w: 10, alpha: 0.07 }); g.marking([[b.cx, b.y0], [b.cx, b.y1]], { w: 10, alpha: 0.07 });
        const r = K.rng(77); for (let i = 0; i < 16; i++) { const x = lerp(b.x0 + 50, b.x1 - 50, r()), y = lerp(b.y0 + 50, b.y1 - 50, r()); if (Math.abs(y - b.cy) > 30) g.tree(x, y, 46 + r() * 22); }
      } else if (b.k === CPB) {
        g.building(b.x0, b.y0, BW, 150, { seed: 3 }); g.building(b.x0 + 230, b.y0 + 170, 170, 170, { seed: 8 });
        g.building(CP.x - 110, CP.y - 70, 220, 130, { tone: '#3E464B', height: 0.7 }); // the command post
      } else if (YARDS[b.k]) {
        const m = YARDS[b.k]; g.building(b.x0, b.y0, BW, 110, { seed: b.r * 9 + b.c }); g.building(b.x0, b.y1 - 90, 150, 90, { seed: b.c * 5 }); tower(g, m.x, m.y);
      } else roofs(g, b);
    }
    for (const x of BRIDGES) { // the decks, with their parapets
      g.pavement([[x - BRW / 2, RIVER[0]], [x + BRW / 2, RIVER[0]], [x + BRW / 2, RIVER[1]], [x - BRW / 2, RIVER[1]]], { grid: 0 });
      for (const s of [-1, 1]) g.marking([[x + (s * BRW) / 2, RIVER[0] + 30], [x + (s * BRW) / 2, RIVER[1] - 30]], { w: 6, alpha: 0.28 });
    }
    g.marking([[X0, (AVE[0] + AVE[1]) / 2], [X1, (AVE[0] + AVE[1]) / 2]], { dash: [60, 70], w: 6, alpha: 0.32 }); // the avenue's centre line
    g.marking([[DIAG.x, DIAG.y], [DIAG.x + DIAG.dx * 2600, DIAG.y + DIAG.dy * 2600]], { dash: [60, 70], w: 5, alpha: 0.22 });
  }

  /* ---------------------------------------------------------------- motion */
  const pathEnd = (n, back) => T0[n] + DUR(n) + (back ? 0.6 + DUR(n, true) : 0);
  function init() { return { end: null, over: false }; }
  function update(s, dt, o) {
    const T = s.t + dt, n = o.send;
    if (s.end == null) {
      if (!o.vz) { if (T > (o.compare ? 6 : 7.5)) s.end = T; }
      else if (n === 'Alert') { if (T > (o.micro ? 7.6 : 9)) s.end = T; } // micro: a shorter rest once the city is lit
      else if (T > pathEnd(n, n === 'Message') + 2.4) s.end = T;
    }
    s.over = s.end != null && T > s.end + 0.3;
  }

  /* --------------------------------------------------------------- picture */
  const fade = (T, a, z) => (a == null ? 0 : clamp((T - a) / 0.22) * (z == null ? 1 : 1 - clamp((T - z) / 0.3)));
  function wash(g, b, k) { // a block that has the message; a block the diagonal crosses keeps the street itself dark
    if (!(k > 0)) return;
    if (!b.diag) { g.wash(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, k); return; }
    const c = g.ctx, h = DIAG.w / 2 + 10, ex = DIAG.dy * h, ey = -DIAG.dx * h, L = 4000;
    c.save(); c.beginPath(); c.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    [[ex - DIAG.dx * L, ey - DIAG.dy * L], [ex + DIAG.dx * L, ey + DIAG.dy * L], [-ex + DIAG.dx * L, -ey + DIAG.dy * L], [-ex - DIAG.dx * L, -ey - DIAG.dy * L]].forEach(([x, y], i) => (i ? c.lineTo : c.moveTo).call(c, DIAG.x + x, DIAG.y + y));
    c.clip('evenodd'); g.wash(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, k); c.restore();
  }
  function grey(g, p, r) { const c = g.ctx, q = (r || (g.portrait ? 2 : 2.7)) * g.px; c.fillStyle = C.off; c.beginPath(); c.arc(p.x, p.y, q, 0, TAU); c.fill(); g.obj(p.x, p.y, q, q, 0, 'a phone', 'd'); } // a phone without VZ (the tests' boxes see it)
  // The points of a route from its start up to length d.
  function part(R, d) {
    const out = [], P = R.rt.pts, at = R.rt.at(d);
    for (let i = 0; i < P.length && R.cum[i] < d; i++) out.push(P[i]);
    out.push([at.x, at.y]); return out;
  }
  // One light running along the streets at one speed: ONE faint line behind it (with VZ's line weight, round joins,
  // no mark at any corner), and a pulse head with a short fading tail. back: the same light, returning, with no line.
  function trace(g, R, T, t0, dur, back) {
    const u = (T - t0) / dur; if (u <= 0) return;
    const c = g.ctx, px = g.px, d = along(u) * R.rt.total, k = clamp(u * 4);
    if (!back) {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; g.path(part(R, d), false);
      c.strokeStyle = rgba('zone', 0.042 * k); c.lineWidth = 7 * px; c.stroke();
      c.strokeStyle = rgba('zone', 0.3 * k); c.lineWidth = 1.5 * px; c.stroke(); c.restore();
    }
    if (u >= 1) return;
    const pos = back ? R.rt.total - d : d, tl = 70 * px, h = R.rt.at(pos), t = R.rt.at(clamp(back ? pos + tl : pos - tl, 0, R.rt.total));
    const gr = c.createLinearGradient(t.x, t.y, h.x, h.y); gr.addColorStop(0, rgba('zone', 0)); gr.addColorStop(1, rgba('zone', 0.95));
    c.save(); c.lineCap = 'round'; g.path([[t.x, t.y], [h.x, h.y]], false);
    c.strokeStyle = gr; c.lineWidth = 2.6 * px; c.stroke(); c.restore();
    c.fillStyle = C.zone; c.beginPath(); c.arc(h.x, h.y, 3.6 * px, 0, TAU); c.fill();
  }
  function draw(g, s, o) {
    const T = s.t, n = o.send;
    if (!o.vz) {
      for (const p of phones) grey(g, p);
      grey(g, CP);
      places(g);
      const who = n === 'Alert' ? CP : n === 'SOS' ? CALLER : SENDER, at = 0.5;
      g.flash(who, T - at, { l: 18 * g.px, w: 18 * g.px, tone: 'alert' });
      g.chip(who.x, who.y, n === 'Message' ? 'Not sent' : 'No signal', { tone: 'alert', k: fade(T, at, null), side: n === 'Alert' || n === 'Message' ? 'down' : 'up', gap: 16 }); // a message's chip under the sender, clear of the post's label
      return;
    }
    // Which phone has it, and when: the alert reaches block by block; the SOS its neighbours and the command post;
    // the message only the one it is addressed to. Nothing lights along the way.
    const R = routes[n], got = (p) => {
      if (n === 'Alert') return p.t;
      if (p === R.a) return 0.4;
      if (p === R.z) return pathEnd(n);
      return n === 'SOS' && p.b && aroundT.has(p.b) ? aroundT.get(p.b) + 0.1 + 0.3 * K.hash(p.x | 0, p.y | 0) : null;
    };
    if (n === 'Alert') for (const b of blocks) wash(g, b, b.T == null ? 0 : K.ease.out((T - b.T) / 0.6));
    else { // the blocks around the caller light; the strip the light passes glows faintly, then fades
      if (n === 'SOS') for (const [b, t] of aroundT) wash(g, b, K.ease.out((T - t) / 0.6));
      for (const [b, t] of R.passed) if (!(n === 'SOS' && aroundT.has(b))) wash(g, b, 0.45 * clamp((T - t) / 0.3) * (1 - clamp((T - t - 0.7) / 0.9)));
    }
    for (const p of phones) { const t = got(p); if (t == null || T < t) grey(g, p, ENDS.includes(p) ? 2.7 : 0); }
    places(g);
    const small = g.portrait ? { r: 2.3 } : undefined; // on a phone the blocks carry the picture: lighter dots, fewer rings
    if (n === 'Alert') {
      g.zone(CP.x, CP.y, { rmax: 620, period: 0.7, rings: 3, start: 0, strength: 0.9 });
      phones.forEach((p, i) => { if (p.t != null && T > p.t && T < p.t + 1.6 && (!g.portrait || i % 2 === 0)) g.zone(p.x, p.y, { rmax: 260, period: 1.6, rings: 1, phase: p.t, start: p.t, strength: 0.45, fill: false }); });
    } else {
      if (n === 'SOS') g.zone(CALLER.x, CALLER.y, { rmax: 700, period: 0.7, rings: 3, phase: 0.4, start: 0.4 });
      trace(g, R, T, T0[n], DUR(n), false);
      if (n === 'Message' && T > pathEnd(n) + 0.6) trace(g, R, T, pathEnd(n) + 0.6, DUR(n, true), true);
    }
    g.device(CP.x, CP.y);
    for (const p of phones) { const t = got(p); if (t != null && T >= t) { g.device(p.x, p.y, ENDS.includes(p) ? undefined : small); g.catchFx(p.x, p.y, T - t); } }
    if (n === 'Alert') {
      g.flash(CP, T - 0.05, { l: 18 * g.px, w: 18 * g.px });
      g.label(3640, 1330, 'A whole city', { status: 'vision', k: clamp((T - 3.3) / 0.3) });
      g.chip(CP.x, CP.y, 'Alert sent', { k: fade(T, 0.1, 3.2), side: 'down', gap: 16 });
      g.chip(FAR.x, FAR.y, 'Alert', { k: fade(T, Math.max(FAR.t + 0.2, 5.6), null), side: g.cam.h < 190 ? 'left' : 'up', gap: 16 }); // a very short stage: beside, clear of the vision label
    } else if (n === 'SOS') {
      const at = pathEnd('SOS'), nb = got(NEIGHBOUR);
      g.flash(CALLER, T - 0.4, { l: 18 * g.px, w: 18 * g.px });
      if (T > at) g.flash(CP, T - at, { l: 18 * g.px, w: 18 * g.px });
      g.chip(CALLER.x, CALLER.y, 'SOS', { k: fade(T, 0.4, null), side: g.portrait ? 'down' : 'left', gap: 16 });
      g.chip(NEIGHBOUR.x, NEIGHBOUR.y, 'Help needed nearby', { k: fade(T, nb + 0.3, at - 0.4), side: 'up', gap: 16 });
      g.chip(CP.x, CP.y, 'SOS, with position', { k: fade(T, at, null), side: 'down', gap: 16 });
    } else {
      const at = pathEnd('Message'), back = pathEnd('Message', true);
      if (T > at) g.flash(TO, T - at, { l: 18 * g.px, w: 18 * g.px });
      const side = g.portrait ? 'right' : 'down'; // on a phone the command post sits just below the sender
      g.chip(SENDER.x, SENDER.y, 'Message sent', { k: fade(T, 0.4, at - 0.6), side, gap: 16 });
      g.chip(TO.x, TO.y, 'Message', { k: fade(T, at, null), side: 'up', gap: 16 });
      g.chip(SENDER.x, SENDER.y, 'Delivered', { k: fade(T, back, null), side, gap: 16 });
    }
  }
  // Place labels, in both modes: the command post, and the north mast (the second mast is drawn without a label).
  function places(g) {
    const m = YARDS['2,3'];
    g.label(CP.x, CP.y, 'Command post', { align: 'left', dx: 34 }); // to its right, clear of the ring a tap uses
    // Beside the mast on a phone, under it on a short wide stage (the post's label is level with it there), below it
    // elsewhere; none on a very short stage, where the caption says it.
    if (g.cam.h >= 190) g.label(m.x, m.y, 'No cellular network', g.cam.w < 600 ? { align: 'left', dx: 30 } : g.cam.h < 300 ? { align: 'left', dx: 30, dy: 34 } : { dy: 52 });
  }

  K.mount({
    el: '#sim',
    label: 'Plan of a city district at night with the mobile networks down. A river with two bridges crosses it. With VZ, an alert sent from the command post will pass from phone to phone and light the city block by block (Vision). A call for help will reach the people nearby and the command post, and a message will reach only the person it is addressed to. Without VZ nothing leaves the phone. Illustration drawn after a computer simulation, not a recording and not a measurement.',
    focus: { x: -40, y: -320, w: 4140, h: 2560 },
    portraitFocus: { x: 0, y: -330, w: 4100, h: 2560 },
    compare: false, // the scene stays With VZ; Without VZ is the toggle, as in every scene on the site
    seed: SEED,
    options: { send: 'Alert' },
    choices: [{ name: 'send', label: 'Send', values: ['Alert', 'SOS', 'Message'] }],
    statuses: STATUS,
    notes: ['Drawn after a computer simulation. Not measured in the field.'],
    actAt: (o) => ({ Alert: CP, SOS: CALLER, Message: SENDER })[o.send], // a tap on who sends it
    act: (o) => ({ Alert: 'Send the alert', SOS: 'Send an SOS', Message: 'Send the message' })[o.send], // the visitor's tap sends it
    still: (vz) => (vz ? 3.6 : 4),
    lines: (o) => (o.compare && !o.vz ? [L.again, L[o.send].without[2]] : !o.vz ? L[o.send].without
      : o.micro ? [L[o.send].with[0], MICRO[o.send], L[o.send].with[2]] : L[o.send].with),
    beat(s, o) {
      const T = s.t, n = o.send;
      if (!o.vz) return o.compare ? (T > 2.2 ? 1 : 0) : T > 3.6 ? 2 : T > 1.4 ? 1 : 0;
      if (n === 'Alert') return T > 5.2 ? 2 : T > 1.0 ? 1 : 0;
      if (n === 'SOS') return T > T0.SOS + 4 * LEG.SOS ? 2 : T > 1.4 ? 1 : 0;
      return T > pathEnd('Message') ? 2 : T > 1.4 ? 1 : 0;
    },
    debug: (s, o) => ({ end: s.end, send: o.send, lit: blocks.filter((b) => b.T != null && s.t >= b.T).length }),
    init, update, draw, ground
  });
})();
