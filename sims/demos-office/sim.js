/* Contact tracing: four micro-demos on one small office floor for the Show me plates (?demo=distance|rules|console|
   records), each played once under a row. All four are Today. Each demo is a function of time: fixed moments, no
   randomness. Synthetic trajectories only; no health advice. */
(function () {
  'use strict';
  const K = VZKit, { clamp, ease, lerp, rgba, C } = K, { sin, hypot, min, PI } = Math;
  const fade = (T, a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
  const since = (T, t, d) => (t == null ? 0 : clamp((T - t) / d));
  const dist = (p, q) => hypot(p.x - q.x, p.y - q.y);
  const ENC = { rmax: 150, period: 0.7, rings: 3 }, CLOSE = 100; // an encounter's quiet zone; what counts as close here

  // World units: about 40 to a metre. The floor is 1100 x 760: a glass meeting room in the north-west, two rows of
  // desks to the east, a corridor across the middle, and the coffee point on the south wall.
  const FW = 1100, FH = 760, COLS = [520, 680, 840, 1000], ROWS = [110, 320];
  const SEAT = { n1: { x: 140, y: 84, a: PI / 2 }, n2: { x: 220, y: 84, a: PI / 2 }, s1: { x: 140, y: 186, a: -PI / 2 }, s2: { x: 220, y: 186, a: -PI / 2 } };
  const desk = (col, row) => ({ x: COLS[col], y: ROWS[row] + 44, a: -PI / 2 });
  const still = (p) => () => p;
  const walk = (pts, t0, v) => { const r = K.route(pts, 24); return (T) => r.at(clamp((T - t0) * v, 0, r.total)); };

  function furniture(g, x, y, w, h, tone) { // a desk, a table or a counter: a soft shadow, a flat top, a fine inset line
    const c = g.ctx, [sx, sy] = g.shade(4, 5);
    c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(x + sx, y + sy, w, h);
    c.fillStyle = tone || '#363E44'; c.fillRect(x, y, w, h);
    c.strokeStyle = rgba('lane', 0.08); c.lineWidth = g.px; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }
  function chair(g, p) { const c = g.ctx; c.fillStyle = '#2C3338'; c.fillRect(p.x - 12, p.y - 12, 24, 24); c.strokeStyle = rgba('lane', 0.1); c.lineWidth = g.px; c.strokeRect(p.x - 12, p.y - 12, 24, 24); }
  function ground(g) {
    const c = g.ctx;
    c.fillStyle = '#1F2529'; c.fillRect(-600, -400, FW + 1200, FH + 800); // beyond the floor: quiet
    g.pavement([[0, 0], [FW, 0], [FW, FH], [0, FH]], { fill: '#262C31' });
    c.strokeStyle = C.kerb; c.lineWidth = 10; c.strokeRect(0, 0, FW, FH);
    for (const [x0, x1] of [[30, 330], [420, 1070]]) g.marking([[x0, 0], [x1, 0]], { w: 4, alpha: 0.32 }); // windows
    const glass = (pts) => g.marking(pts, { w: 3, alpha: 0.2 });
    glass([[360, 0], [360, 170]]); glass([[360, 240], [360, 280], [0, 280]]);                                // the meeting room
    furniture(g, 100, 108, 160, 54); for (const k in SEAT) chair(g, SEAT[k]);
    for (let r = 0; r < 2; r++) for (let col = 0; col < 4; col++) {
      const x = COLS[col], y = ROWS[r]; furniture(g, x - 38, y - 18, 76, 36); chair(g, desk(col, r));
      c.fillStyle = rgba('lane', 0.42); c.fillRect(x - 15, y - 9, 30, 3.5);                                    // a lit screen
    }
    furniture(g, 40, 708, 300, 36, '#30373C'); furniture(g, 150, 712, 34, 24, '#454E54');                    // counter, machine
    furniture(g, 1000, 700, 70, 40, '#30373C');                                                                // printer
    for (const [x, y, r] of [[1066, 480], [410, 724], [26, 340], [700, 726], [1066, 250]].map(([x, y]) => [x, y, 20])) g.tree(x, y, r);
  }

  const person = (g, p, vz, alpha = 1) => g.person(p, { phone: vz ? null : 'off', alpha });
  function enc(g, p, k, i) { if (k > 0.02) g.zone(p.x, p.y, Object.assign({ strength: 0.6 * k, phase: (i * 0.29) % 0.7 }, ENC)); }
  function diamond(c, x, y, r, a) { // one encounter mark: a small diamond kept beside the phone
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath();
    c.fillStyle = rgba('zone', a); c.fill(); c.strokeStyle = rgba('dark', 0.7 * a); c.lineWidth = 1; c.stroke();
  }
  function marks(g, p, list) { // [alpha] per mark, beside the phone, in screen space
    const [x, y] = g.toScreen(p.x, p.y); g.screen(); list.forEach((a, n) => { if (a > 0.01) diamond(g.ctx, x + 15 + n * 10, y - 14, 4, a); }); g.world();
  }
  const told = (g, p, T, t) => { g.catchFx(p.x, p.y, T - t); g.flash(p, T - t); };
  const insetW = (g, w) => Math.round(min(w, g.cam.w * 0.48));

  /* 1. Distancing alerts: two colleagues stay close at the coffee point; a third only walks past. */
  const DISTANCE = (() => {
    const T_WARN = 2.5, T_APART = 3.1, A = { x: 150, y: 646, a: 0 }, B = { x: 200, y: 646, a: PI }, A2 = { x: 105, y: 630 }, B2 = { x: 252, y: 650 };
    const pass = walk([[80, 585], [900, 585]], 0, 90);
    const pair = (T, vz) => { const k = vz ? ease.smooth((T - T_APART) / 1) : 0; return [{ x: lerp(A.x, A2.x, k), y: lerp(A.y, A2.y, k), a: A.a }, { x: lerp(B.x, B2.x, k), y: lerp(B.y, B2.y, k), a: B.a }]; };
    return {
      label: 'Plan of an office floor at the coffee point. Two colleagues stand close together for a long time while a third walks past. With VZ the two who stay close too long are each warned and step apart, and the one who only walked past is not warned. Without VZ nothing tells them.',
      lines: { with: ['Two colleagues stand close together at the coffee point. A third walks past.', 'The two who stay close for too long are warned.', 'The one who only walked past is not.'],
        without: ['Two colleagues stand close together.', 'Nothing tells them.'] },
      focus: { x: -30, y: 470, w: 640, h: 300 }, still: [3.4, 3.1], end: [5.0, 6.9],
      beat: (T, o) => (o.vz ? (T >= 4.4 ? 2 : T >= T_WARN ? 1 : 0) : T >= 2.8 ? 1 : 0),
      draw(g, T, o) {
        const [a, b] = pair(T, o.vz), c = pass(T);
        person(g, a, o.vz); person(g, b, o.vz); person(g, c, o.vz);
        g.atmosphere('Clear', {});
        g.label(190, 726, 'Coffee point'); // the place the caption names
        if (!o.vz) return;
        const k = min(since(T, 0.1, 0.6), 1 - since(T, T_APART + 0.4, 0.6));
        enc(g, a, k, 0); enc(g, b, k, 1);
        for (const p of [a, b, c]) g.device(p.x, p.y);
        told(g, a, T, T_WARN); told(g, b, T, T_WARN);
        g.chip(a.x, a.y, 'Too close', { k: fade(T, T_WARN, 5.6), side: 'up', gap: 18 });
        g.chip(b.x, b.y, 'Too close', { k: fade(T, T_WARN, 5.6), side: 'down', gap: 18 });
      }
    };
  })();

  /* 2. Rules the organisation sets: a short pass leaves no mark, a long meeting does, and the marks go after the kept days. */
  const RULES = (() => {
    const T_MARK = 2.3, T_KEEP = 4.3, T_GONE = 5.0, ROOM = [SEAT.n1, SEAT.n2, SEAT.s1, SEAT.s2];
    const D1 = walk([[470, 452], [900, 452]], 0, 90), D2 = walk([[680, 470], [250, 470]], 0, 90);
    const SET = [['How close', 0.42, T_MARK], ['How long', 0.64, T_MARK], ['How many days', 0.52, T_KEEP]];
    function rules(g, T) { // the organisation's settings: plain sliders, no figures
      const c = g.ctx, w = insetW(g, 200), b = g.inset('tr', w, 126), x = b.x + 14, bw = w - 28;
      g.text(x, b.y + 22, 'The organisation’s rules', { size: 13 });
      SET.forEach(([name, at, on], i) => {
        const y = b.y + 44 + i * 28, k = since(T, on, 0.3), kx = x + bw * at;
        g.text(x, y, name, { weight: 400, alpha: 0.82 });
        c.fillStyle = rgba('lane', 0.16); c.fillRect(x, y + 7, bw, 3);
        if (i === 2 && T > T_KEEP) { c.fillStyle = rgba('zone', 0.7); c.fillRect(x, y + 7, (kx - x) * since(T, T_KEEP, T_GONE - T_KEEP), 3); } // the kept days run out
        c.fillStyle = k > 0 ? rgba('zone', 0.35 + 0.65 * k) : rgba('lane', 0.6); c.fillRect(kx - 3, y + 2, 6, 13);
      });
      g.world();
    }
    return {
      label: 'Plan of an office floor. Two colleagues pass briefly in the corridor; four others sit in a long meeting. An inset shows the organisation’s rules as plain sliders: how close, how long and how many days. With VZ the meeting leaves a mark on each phone in the room and the short pass leaves none; when the kept days run out, the marks are gone. Without VZ nothing is noted.',
      lines: { with: ['A short pass in the corridor. Then a long meeting in one room.', 'The organisation sets how close and how long counts as an encounter.', 'It also sets how many days a record is kept. After that the marks are gone.'],
        without: ['A short pass, then a long meeting.', 'Nothing is noted, and nobody could be told later.'] },
      focus: { x: -30, y: -30, w: 820, h: 540 }, still: [3.4, 3.4], end: [5.0, 7.0],
      beat: (T, o) => (o.vz ? (T >= T_KEEP ? 2 : T >= T_MARK ? 1 : 0) : T >= 2.6 ? 1 : 0),
      draw(g, T, o) {
        const walkers = [D1(T), D2(T)], gone = 1 - since(T, T_GONE, 0.6);
        for (const p of ROOM.concat(walkers)) person(g, p, o.vz);
        g.atmosphere('Clear', {});
        if (!o.vz) return;
        ROOM.forEach((p, i) => enc(g, p, since(T, 0.3, 0.8) * gone, i));
        for (const p of ROOM.concat(walkers)) g.device(p.x, p.y);
        ROOM.forEach((p, i) => { g.catchFx(p.x, p.y, T - T_MARK - 0.06 * i); marks(g, p, [0, 1, 2].map((n) => since(T, T_MARK + 0.06 * i + 0.1 * n, 0.3) * gone)); });
        rules(g, T);
      }
    };
  })();

  /* 3. A console for the organisation: an office day, and a console with activity and reports. */
  const CONSOLE = (() => {
    const PEOPLE = [still(desk(0, 0)), still(desk(3, 1)), still(SEAT.s1), still({ x: 180, y: 650, a: 0 }), still(desk(2, 0)),
      walk([[680, 154], [680, 236], [430, 236], [400, 205], [300, 205], [220, 186]], 0.2, 140),
      walk([[520, 364], [520, 460], [230, 460], [230, 630]], 0, 125),
      walk([[120, 650], [120, 470], [640, 470], [680, 364]], 0.5, 120),
      walk([[1000, 154], [1000, 236], [880, 236], [880, 190]], 1.2, 100)];
    const EVENTS = []; // when two people come close: computed once from the walks above
    { const was = {}; for (let t = 0; t <= 7.5; t += 0.05) { const at = PEOPLE.map((f) => f(t)); for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) { const k = i + ',' + j, near = dist(at[i], at[j]) < CLOSE; if (near && was[k] === false) EVENTS.push([t, i, j]); was[k] = near; } } }
    const BARS = [0.35, 0.55, 0.8, 0.6, 0.9, 0.7, 0.45], REPORTS = [4.2, 4.8];
    function board(g, T) { // the organisation's console: activity as bars that grow, and a row of marks for reports
      const c = g.ctx, w = insetW(g, 210), b = g.inset('br', w, 132), x = b.x + 14, n = BARS.length, bw = (w - 28) / n;
      g.text(x, b.y + 22, 'The organisation’s console', { size: 13 });
      g.text(x, b.y + 42, 'Activity', { weight: 400, alpha: 0.7 });
      BARS.forEach((h, i) => { const k = ease.smooth((T - 0.3 - i * 0.7) / 0.9); if (k > 0) { c.fillStyle = rgba('zone', 0.8); c.fillRect(x + i * bw + 2, b.y + 92 - 40 * h * k, bw - 4, 40 * h * k); } });
      c.fillStyle = rgba('lane', 0.16); c.fillRect(x, b.y + 92, w - 28, 1);
      g.text(x, b.y + 118, 'Reports', { weight: 400, alpha: 0.7 });
      REPORTS.forEach((t, i) => { const k = since(T, t, 0.3); if (k > 0) { c.fillStyle = rgba('zone', k); c.fillRect(x + 66 + i * 16, b.y + 106, 10, 10); } });
      g.world();
    }
    return {
      label: 'Plan of an office floor through a day, with an inset of the organisation’s console. People move between desks, the meeting room and the coffee point. With VZ the console shows activity as bars that grow, and a row of marks for reports, with no names. Without VZ the organisation has no picture of it.',
      lines: { with: ['An office day: people move between desks and meeting rooms.', 'The organisation has a console that shows activity.', 'It also holds the reports.'],
        without: ['An office day.', 'The organisation has no picture of it.'] },
      focus: { x: 0, y: 0, w: FW, h: FH }, still: [3.4, 5.0], end: [5.0, 6.8],
      beat: (T, o) => (o.vz ? (T >= REPORTS[0] ? 2 : T >= 2.0 ? 1 : 0) : T >= 2.4 ? 1 : 0),
      draw(g, T, o) {
        const at = PEOPLE.map((f) => f(T));
        for (const p of at) person(g, p, o.vz);
        g.atmosphere('Clear', {});
        if (!o.vz) return;
        for (const [t, i, j] of EVENTS) if (T >= t && dist(at[i], at[j]) < CLOSE) { enc(g, at[i], since(T, t, 0.4), i); enc(g, at[j], since(T, t, 0.4), j); }
        for (const p of at) g.device(p.x, p.y);
        for (const [t, i, j] of EVENTS) { g.catchFx(at[i].x, at[i].y, T - t); g.catchFx(at[j].x, at[j].y, T - t); }
        board(g, T);
      }
    };
  })();

  /* 4. Encounter records on each phone: one case confirmed; only the two who were close are told. */
  const RECORDS = (() => {
    const R = SEAT.n1, ROOM = [SEAT.n1, SEAT.n2, SEAT.s1], FAR = desk(1, 0), MARK = [0.8, 1.4];
    const T_CASE = 2.4, T_SHARE = 2.9, T_ARRIVE = 3.8, T_TELL = 4.2, OUT = [2.9, 5.0];
    function org(g, T, from) { // the organisation's inset, and the case's two marks travelling to it
      const c = g.ctx, w = insetW(g, 150), b = g.inset('tr', w, 66), x = b.x + 14;
      g.text(x, b.y + 22, 'The organisation', { size: 13 });
      const [sx, sy] = from, k = ease.inOut((T - T_SHARE) / (T_ARRIVE - T_SHARE));
      if (T >= T_SHARE) for (let n = 0; n < 2; n++) diamond(c, lerp(sx + 15 + n * 10, x + 4 + n * 12, k), lerp(sy - 14, b.y + 44, k), 4 + 1.5 * sin(PI * k), 1);
      g.world();
    }
    const dim = () => 0; // Yitro, decision 18: without VZ the floor stays as it is; nobody knows who was close
    return {
      label: 'Plan of an office floor: three people in a meeting and one more at a desk across the floor. With VZ each phone keeps its own encounter marks. One case is confirmed, that person’s record goes to the organisation, and only the two who were close are told; the one across the floor keeps working. Without VZ nobody knows who was close.',
      lines: { with: ['Encounter records stay on each person’s own phone.', 'One case is confirmed. That person’s record is shared with the organisation.', 'Only the people who were close are told. Everyone else keeps working.'],
        without: ['One case is confirmed.', 'Nobody knows who was close.'] }, // Yitro, decision 18: exact
      focus: { x: -20, y: -10, w: 760, h: 320 }, still: [3.6, 4.6], end: [5.0, 6.8],
      beat: (T, o) => (o.vz ? (T >= T_TELL ? 2 : T >= T_CASE ? 1 : 0) : T >= 2.6 ? 1 : 0),
      draw(g, T, o) {
        const c = g.ctx, d = dim(T, o.vz), tCase = o.vz ? T_CASE : 1.0;
        for (const p of ROOM.concat([FAR])) person(g, p, o.vz, 1 - 0.62 * d);
        if (d > 0) { g.screen(); c.fillStyle = rgba('dark', 0.25 * d); c.fillRect(0, 0, g.cam.w, g.cam.h); g.world(); }
        g.atmosphere('Clear', {});
        if (o.vz) {
          ROOM.forEach((p, i) => enc(g, p, since(T, 0.2, 0.6), i));
          for (const p of ROOM.concat([FAR])) g.device(p.x, p.y);
          ROOM.forEach((p, i) => {
            MARK.forEach((t) => g.catchFx(p.x, p.y, T - t - 0.05 * i));
            if (i || T < T_SHARE) marks(g, p, MARK.map((t) => since(T, t + 0.05 * i, 0.3)));
          });
          org(g, T, g.toScreen(R.x, R.y));
          for (const p of ROOM.slice(1)) { told(g, p, T, T_TELL); }
          g.chip(ROOM[1].x, ROOM[1].y, 'You were close', { k: fade(T, T_TELL), side: 'up', gap: 18 });
          g.chip(ROOM[2].x, ROOM[2].y, 'You were close', { k: fade(T, T_TELL), side: 'down', gap: 18 });
        }
        g.flash(R, T - tCase, { tone: 'alert' });
        g.chip(R.x, R.y, 'Positive', { tone: 'alert', k: fade(T, tCase, o.vz ? T_TELL - 0.3 : null), side: o.vz ? 'left' : 'up', gap: 18 });
      }
    };
  })();

  /* mount ---------------------------------------------------------------------------------------------------------- */
  const D = { distance: DISTANCE, rules: RULES, console: CONSOLE, records: RECORDS }, IDS = Object.keys(D), at = (o) => D[o.demo];
  K.mount({
    el: '#sim',
    label: (o) => at(o).label,                                  // each demo's own canvas label
    focus: (o) => at(o).focus, portraitFocus: (o) => at(o).focus,
    compare: false,                                             // no statuses: the row above carries the status
    options: { demo: IDS[0] },
    choices: [{ name: 'demo', label: 'Feature', values: IDS }], // micro hides it; the pack's own page shows it
    still: (vz, o) => at(o).still[+vz],                         // the warning fully shown (Without VZ: the moment)
    lines: (o) => at(o).lines[o.vz ? 'with' : 'without'],
    beat: (s, o) => at(o).beat(s.t, o),
    ground,
    init: () => ({}),
    update(s, dt, o) { s.over = s.t + dt >= at(o).end[+o.vz]; },
    draw: (g, s, o) => at(o).draw(g, s.t, o)
  });
})();
