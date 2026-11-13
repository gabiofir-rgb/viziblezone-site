/* Help where there is no signal: the public-safety scene, built on simkit. Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, lerp } = K;

  // World units: about 40 to a metre; north is up. A collapsed building (RUB) on the north side of a street, a side
  // street east of it, and a plaza beyond with the field command post. The network is down in both modes.
  const RUB = [300, 260, 820, 760], STREET = [860, 1060], SIDE = [1000, 1200], TW = { x: 1440, y: 250 }, R_P = 12;
  const TRAP = { x: 560, y: 520, a: -0.6 }, R2 = { x: 1150, y: 700, a: -Math.PI / 2 }, CP = { x: 1620, y: 640, a: -Math.PI / 2 }, MATE = { x: 1548, y: 668, a: 0 };
  const OCC = [{ x: 570, y: 515, a: 0, l: 380, w: 370 }]; // the heap's core: sight reaches the edge of the pile, not into it
  const SEARCH = K.route([[1090, 822], [420, 822]]), EDGE = { x: 600, y: 796 };
  const ZONE = { rmax: 950, reach: 900, period: 0.7, rings: 3 }, SOS = 0.8, HOP = 0.8;
  const STATUS = [['today', 'Push-to-talk, SOS, position and messages, phone to phone: Today'], ['today', 'A trapped person’s phone opens a voice and data channel: Today'],
    ['today', 'One phone in between passes voice and data on: Today'], ['today', 'Data travels on from phone to phone: Today']];
  const L = {
    with: ['A building has collapsed and the network is down. Someone is trapped inside.',
      'Today: her phone opens a voice and data channel and shares where she is. Rescuers can hear and answer her.',
      'Rescuers\' phones nearby receive it. One phone in between passes voice and data on to the command post today.',
      'Voice and messages come back to her and to the rescuers, with no network.'],
    without: ['A building has collapsed and the network is down. Someone is trapped inside.',
      'Without VZ, her phone cannot reach anyone while the network is down.',
      'The rescuers search the rubble without knowing where she is.'],
    again: 'Now without VZ. The network is down, so her phone cannot reach anyone.'
  };

  /* ---------------------------------------------------------------- ground */
  function rubble(g) {
    const c = g.ctx, r = K.rng(29), [x0, y0, x1, y1] = RUB, tones = ['#30373C', '#3A4247', '#343B40', '#41494E', '#2C3337'];
    g.marking([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], { dash: [16, 14], w: 3, alpha: 0.22 }); // where the building stood
    c.fillStyle = '#3A4247'; for (const [x, y, w, h] of [[x0, y0, 210, 22], [x1 - 22, y0, 22, 150], [x0, y1 - 120, 22, 120], [x1 - 160, y1 - 22, 160, 22]]) c.fillRect(x, y, w, h); // wall stubs
    for (let i = 0; i < 70; i++) { // debris, some of it spilled onto the pavement
      const x = lerp(x0 - 60, x1 + 70, r()), y = lerp(y0 - 40, y1 + 70, r()), s = 6 + r() * 16;
      c.fillStyle = tones[(r() * 5) | 0]; c.fillRect(x, y, s, s * (0.5 + r()));
    }
    for (let i = 0; i < 30; i++) { // slabs, heaped towards the middle
      const w = 70 + r() * 170, h = 36 + r() * 80, cx = lerp(x0 + 50, x1 - 50, (r() + r()) / 2), cy = lerp(y0 + 50, y1 - 50, (r() + r()) / 2), a = (r() - 0.5) * 1.8, k = 0.4 + r() * 0.6, [sx, sy] = g.shade(6 * k, 8 * k);
      c.save(); c.translate(cx, cy); c.rotate(a);
      c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(-w / 2 + sx, -h / 2 + sy, w, h);
      c.fillStyle = tones[(r() * 5) | 0]; c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = K.rgba('lane', 0.06); c.lineWidth = g.px; c.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
      c.restore();
    }
  }
  // A mobile mast seen from above, struck through, quietly: the network is down.
  function tower(g) {
    const c = g.ctx, { x, y } = TW, px = g.px;
    g.marking([[x - 70, y - 70], [x + 70, y - 70], [x + 70, y + 70], [x - 70, y + 70], [x - 70, y - 70]], { dash: [10, 10], w: 3, alpha: 0.25 });
    const p = [0, 1, 2].map((i) => [x + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 3) * 30, y + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 3) * 30]);
    c.strokeStyle = '#7C878E'; c.lineWidth = 4; g.path(p).stroke();
    c.lineWidth = 1.5 * px; c.beginPath(); for (const [a, b] of p) { c.moveTo(x, y); c.lineTo(a, b); } c.stroke();
    c.fillStyle = '#8F999F'; for (let i = 0; i < 3; i++) { c.save(); c.translate(x, y); c.rotate(-Math.PI / 2 + (i * 2 * Math.PI) / 3); c.fillRect(30, -11, 9, 22); c.restore(); }
    c.strokeStyle = K.rgba('lane', 0.6); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 62, y + 62); c.lineTo(x + 62, y - 62); c.stroke();
  }
  function ground(g) {
    const X0 = -600, X1 = 2600, Y0 = -600, Y1 = 1700, P = (pts, o) => g.pavement(pts, o);
    P([[X0, Y0], [SIDE[0], Y0], [SIDE[0], STREET[0]], [X0, STREET[0]]]); P([[SIDE[1], Y0], [X1, Y0], [X1, STREET[0]], [SIDE[1], STREET[0]]]);
    P([[X0, STREET[1]], [X1, STREET[1]], [X1, Y1], [X0, Y1]]);
    g.kerb([[X0, STREET[0]], [SIDE[0], STREET[0]], [SIDE[0], Y0]]); g.kerb([[SIDE[1], Y0], [SIDE[1], STREET[0]], [X1, STREET[0]]]); g.kerb([[X0, STREET[1]], [X1, STREET[1]]]);
    g.marking([[X0, 960], [X1, 960]], { dash: [110, 130] }); g.marking([[1100, Y0], [1100, STREET[0] - 10]], { dash: [110, 130] });
    P([[1290, 380], [2200, 380], [2200, 800], [1290, 800]], { fill: '#283035', grid: 80 }); // the plaza
    const rnd = K.rng(5), row = (x, x1, y, h) => { while (x < x1 - 40) { let w = 170 + rnd() * 200; if (x1 - x - w < 120) w = x1 - x; g.building(x, y, w - 10, h, { seed: (x * 3) | 0 }); x += w; } };
    row(X0, SIDE[0] - 40, Y0, 160 - Y0); g.building(X0, 260, 600, 520, { seed: 2 }); g.building(860, 260, 100, 520, { seed: 4 });
    row(SIDE[1] + 40, X1, Y0, 120 - Y0); row(2240, X1, 380, 420); row(X0, X1, 1110, 600);
    rubble(g); tower(g);
    for (const [x, y] of [[1340, 430], [1340, 760], [2150, 430], [2150, 760], [1900, 760]]) g.tree(x, y, 38);
    const c = g.ctx, [sx, sy] = g.shade(6, 8); // the command post: a tent with its ridge, and the command vehicle
    c.fillStyle = 'rgba(3,5,7,.38)'; c.fillRect(1520 + sx, 470 + sy, 210, 130);
    c.fillStyle = '#3E464B'; c.fillRect(1520, 470, 210, 130); c.fillStyle = '#353C41'; c.fillRect(1520, 535, 210, 65);
    c.strokeStyle = K.rgba('lane', 0.18); c.lineWidth = g.px; c.strokeRect(1524, 474, 202, 122);
    g.vehicle('van', { x: 1830, y: 560, a: -Math.PI / 2 }); g.vehicle('truck', { x: 300, y: 915, a: 0 }, { l: 440 }); // the fire engine
  }

  /* ---------------------------------------------------------------- motion */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function init() {
    return { end: null, over: false, r1: { s: 0, v: 66, caught: null, goTo: null, gs: 0, arrived: null }, r2c: null, cpc: null, tc: null, back: null };
  }
  function r1pos(s) { return s.r1.goTo ? s.r1.goTo.at(s.r1.gs) : SEARCH.at(s.r1.s); }
  function update(s, dt, o) {
    const t0 = s.t, T = t0 + dt, r1 = s.r1, p1 = r1pos(s);
    if (o.vz && T > SOS) { // her phone's rings carry the call and her position; nearby phones receive it directly
      const z = Object.assign({}, ZONE, { phase: SOS, start: SOS });
      if (r1.caught == null && K.zoneCrossed(t0, T, dist(p1, TRAP), z) && dist(p1, TRAP) <= ZONE.reach) r1.caught = T;
      if (s.r2c == null && K.zoneCrossed(t0, T, dist(R2, TRAP), z)) s.r2c = T;
    }
    if (s.r2c != null && s.cpc == null && T >= s.r2c + 0.25 + HOP) s.cpc = T; // passed along to the command post
    if (s.cpc != null && s.back == null && T >= s.cpc + 0.9) s.back = T;    // voice and messages come back
    if (s.back != null && s.tc == null && T >= s.back + 2 * HOP) s.tc = T;
    // Rescuer one: searches along the rubble; warned, heads straight to where she is.
    if (r1.caught != null && !r1.goTo && T > r1.caught + 0.6) r1.goTo = K.route([[p1.x, p1.y], [p1.x - 40, p1.y - 6], [EDGE.x, EDGE.y]], 30);
    if (r1.goTo) { r1.gs = Math.min(r1.goTo.total, r1.gs + 80 * dt); if (r1.arrived == null && r1.gs >= r1.goTo.total - 1) r1.arrived = T; }
    else r1.s = Math.min(SEARCH.total, r1.s + r1.v * dt);
    if (s.end == null) {
      if (o.vz && s.tc != null && T > Math.max(s.tc + 2.2, (r1.arrived ?? 99) + 0.6)) s.end = T;
      else if (!o.vz && T > (o.compare ? 7.2 : 8.4)) s.end = T;
      else if (T > 13) s.end = T;
    }
    s.over = s.end != null && T > s.end + 0.3;
  }

  /* --------------------------------------------------------------- picture */
  function draw(g, s, o) {
    const T = s.t, r1 = s.r1, p1 = r1pos(s), show = o.relay === 'Show', ph = o.vz ? null : 'off';
    const a1 = r1.goTo ? p1.a : Math.PI, toHer = Math.atan2(TRAP.y - p1.y, TRAP.x - p1.x);
    const look = r1.caught != null ? toHer : toHer + 0.42 * Math.sin(T * 1.25), k = g.cam.scale; // searching: the gaze sweeps the pile
    // Labels sit in screen space: beside each object whatever the orientation, and across a path from its line.
    const across = (a, b, u, d) => { const [ax, ay] = g.toScreen(a.x, a.y), [bx, by] = g.toScreen(b.x, b.y), L = Math.hypot(bx - ax, by - ay) || 1; let nx = -(by - ay) / L, ny = (bx - ax) / L; if (ny > 0) { nx = -nx; ny = -ny; } return [lerp(a.x, b.x, u), lerp(a.y, b.y, u), { dx: nx * d, dy: ny * d }]; };
    const fade = (a, z) => (a == null ? 0 : clamp((T - a) / 0.22) * (z == null ? 1 : 1 - clamp((T - z) / 0.3)));
    for (const p of [R2, CP, MATE]) g.person(p, { r: R_P, phone: ph });
    g.person({ x: p1.x, y: p1.y, a: a1 }, { r: R_P, phone: ph });
    g.cone({ x: p1.x, y: p1.y }, look, 0.55, 620, OCC, { k: 1.1 });
    g.label(TW.x, TW.y, 'No cellular network', { dy: 70 * k + 18 });
    g.label(1625, 535, 'Field command post', { dy: -(g.portrait ? 105 : 65) * k - 18 });
    if (o.vz) {
      const on = T > SOS;
      if (on) g.zone(TRAP.x, TRAP.y, { rmax: ZONE.rmax, period: ZONE.period, rings: 3, phase: SOS, start: SOS });
      g.person(TRAP, { r: R_P, ghost: true, alpha: clamp((T - SOS) / 0.2) });
      if (r1.goTo && r1.arrived == null) g.trail(r1.goTo, r1.gs + R_P, r1.goTo.total - r1.gs - 6);
      if (show && s.r2c != null) { // the relay path: direct to the nearest rescuer, then passed along to the command post
        const kp = clamp((T - s.r2c) / 0.3);
        g.hop(TRAP, R2, 0, { alpha: 0.32 * kp }); g.hop(R2, CP, (T - s.r2c - 0.25) / HOP, { alpha: 0.4 * kp });
        if (s.back != null) for (let i = 0; i < 3; i++) { const u = T - s.back - i * 0.22; g.hop(CP, R2, u / HOP, { line: false }); g.hop(R2, TRAP, (u - HOP) / HOP, { line: false }); }
        const [ax, ay, ao] = across(TRAP, R2, 0.58, 22), [bx, by, bo] = across(R2, CP, 0.5, 22);
        g.label(ax, ay, 'Direct', Object.assign({ status: 'today', k: kp }, ao));
        g.label(bx, by, 'One phone in between', Object.assign({ status: 'today', k: kp }, bo));
      }
      for (const p of [R2, CP, MATE, p1]) g.device(p.x, p.y);
      if (on) g.device(TRAP.x, TRAP.y);
      if (r1.caught != null) { g.catchFx(p1.x, p1.y, T - r1.caught); g.flash({ x: p1.x, y: p1.y }, T - r1.caught, { l: R_P * 2, w: R_P * 2 }); }
      if (s.r2c != null) g.catchFx(R2.x, R2.y, T - s.r2c);
      if (s.cpc != null) { g.catchFx(CP.x, CP.y, T - s.cpc); g.flash(CP, T - s.cpc, { l: R_P * 2, w: R_P * 2 }); }
      if (s.tc != null) { g.catchFx(TRAP.x, TRAP.y, T - s.tc); g.flash(TRAP, T - s.tc, { l: R_P * 2, w: R_P * 2 }); }
      g.chip(p1.x, p1.y, 'Person trapped', { k: fade(r1.caught, r1.arrived), side: 'down', gap: 20 });
      g.chip(CP.x, CP.y, 'SOS and position', { k: fade(s.cpc, null), side: 'down', gap: 20 });
      g.chip(TRAP.x, TRAP.y, 'Help is coming', { k: fade(s.tc, null), side: 'up', gap: 22 });
    }
  }

  K.mount({
    el: '#sim',
    label: 'Plan view of a street after an earthquake. A building has collapsed, the mobile mast is down and someone is trapped in the rubble. With VZ, her phone opens a voice and data channel and shares where she is (Today). Rescuers can hear and answer her. Nearby rescuers\' phones receive it directly; one phone in between passes voice and data on to the field command post (Today); voice and messages come back. Data also travels on from phone to phone. Without VZ, the call reaches no one and the rescuers search without knowing where she is. The caption below describes each moment.',
    focus: { x: 130, y: 90, w: 1800, h: 1013 },
    portraitFocus: { x: 290, y: 200, w: 1440, h: 860 },
    compare: false, // the scene stays With VZ; Without VZ is the toggle
    options: { relay: 'Show' },
    choices: [{ name: 'relay', label: 'Relay path', values: ['Show', 'Hide'], live: true }],
    statuses: STATUS,
    start: (o) => (o.compare && !o.vz ? 0.8 : 0),
    still: (vz) => (vz ? 3.4 : 4),
    lines: (o) => (o.compare && !o.vz ? [L.again, L.without[2]] : o.vz ? L.with : L.without),
    beat(s, o) {
      if (o.vz) return s.back != null ? 3 : s.r2c != null && s.t > s.r2c + 0.3 ? 2 : s.t > SOS ? 1 : 0;
      return o.compare ? (s.t > 2.2 ? 1 : 0) : s.t > 3.6 ? 2 : s.t > 1.4 ? 1 : 0;
    },
    debug: (s) => ({ r1Caught: s.r1.caught, r2c: s.r2c, cpc: s.cpc, back: s.back, tc: s.tc, arrived: s.r1.arrived, end: s.end, r1x: r1pos(s).x }),
    init, update, draw, ground
  });
})();
