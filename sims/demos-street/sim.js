/* Smart cities: one street, six moments, each played once under a row of the page (?demo=). Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, rgba } = K, PI = Math.PI;

  // World units: about 40 to a metre. A two-lane street along x, traffic keeping right, parking along both kerbs, and a
  // side street joining from the north. Its corner block hides the side street from the main street.
  const NK = 260, SK = 660, EB = 520, CL = 460, PN = 300, PS = 620, SX0 = 1500, SX1 = 1740, SW = 1560;
  const X0 = -900, X1 = 3300, TOP = -900, BOT = 1500, GIVE = NK - 24;
  const CORNER = { x: 1230, y: -360, a: 0, l: 420, w: 1080 };
  const ZP = { rmax: 1100, period: 0.7, rings: 3 };                                          // a person's phone
  const ZV = { rmax: 1000, period: 0.7, rings: 3, phase: 0.35, strength: 0.45, fill: false }; // a vehicle's phone, quieter
  const LAMPS = [[-100, 672, -PI / 2], [300, 672, -PI / 2], [700, 672, -PI / 2], [1100, 672, -PI / 2], [1500, 672, -PI / 2], [1900, 672, -PI / 2],
    [100, 248, PI / 2], [500, 248, PI / 2], [900, 248, PI / 2], [2000, 248, PI / 2]];
  const TREES = [[-200, 214], [700, 214], [2200, 214], [500, 724], [1300, 724], [2100, 724]];
  const SIDE = K.route([[SW, -900], [SW, EB], [X1, EB]], 150);  // out of the side street, left into the eastbound lane
  const EAST = K.route([[X0, EB], [X1, EB]]);
  const MOUTH = SIDE.find((p) => p.y >= GIVE - 88);              // the car's front at the give-way line

  const fade = (T, a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const off = (p, u, v) => ({ x: p.x + u * Math.cos(p.a) - v * Math.sin(p.a), y: p.y + u * Math.sin(p.a) + v * Math.cos(p.a), a: p.a });
  const stopV = (rem, d = 150) => Math.sqrt(2 * d * Math.max(0, rem));   // the speed that still stops in rem
  // Speed towards v1 with bounded acceleration, then along the route.
  function go(a, dt, v1, up = 160, down = 260) { const v0 = a.v; a.v = Math.max(0, a.v + clamp(v1 - a.v, -down * dt, up * dt)); a.s += a.v * dt; a.brake = a.v < 2 || v0 - a.v > 40 * dt ? 0.5 : 0; }
  // A hard stop, as late as the eyes allow: brake as hard as it takes to stop at `at`.
  function hard(a, dt, at, T) { const rem = at - a.s; if (rem <= 0.5 || a.v < 4) { a.v = 0; if (a.stopAt == null) a.stopAt = T; } else { a.v = Math.max(0, a.v - ((a.v * a.v) / (2 * rem)) * dt); a.s += a.v * dt; } a.brake = 1; }
  const caught = (t0, T, a, b, z) => K.zoneCrossed(t0, T, dist(a, b), z);
  const mover = (s, v, more) => Object.assign({ s, v, brake: 0, brakeAt: null, stopAt: null }, more);

  // A rider from above: a bicycle frame or a scooter deck, the handlebar, the rider on it.
  function ride(g, p, vz, scooter) {
    const c = g.ctx, [sx, sy] = g.shade(3, 4), l = scooter ? 58 : 74, w = scooter ? 16 : 8;
    for (const [dx, dy, col] of [[sx, sy, 'rgba(0,0,0,.45)'], [0, 0, '#9AA4AA']]) { c.save(); c.translate(p.x + dx, p.y + dy); c.rotate(p.a); c.fillStyle = col; c.fillRect(-l / 2, -w / 2, l, w); c.restore(); }
    c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.strokeStyle = '#C9CFD3'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(l / 2 - 8, -14); c.lineTo(l / 2 - 8, 14); c.stroke(); c.restore();
    g.person(off(p, scooter ? -3 : 0, 0), { r: 11, phone: vz ? null : 'off' });
  }
  function vehicle(g, kind, p, a, vz) { g.vehicle(kind, p, { brake: a.brake, lights: 1, phone: vz ? null : 'off' }); }
  // Told with VZ: the ring caught, the actor flashes, and its chip. Without VZ, a late stop: a red flash and "Hard stop".
  // Vehicles run along the street, so a chip clears an actor by half its width on either side, upright or turned.
  function told(g, p, T, at, l, w, text, side, until, dev = p) {
    if (at == null) return;
    g.catchFx(dev.x, dev.y, T - at); g.flash(p, T - at, { l, w });
    if (text) g.chip(p.x, p.y, text, { k: fade(T, at, until), side, gap: (w / 2) * g.cam.scale + 14 });
  }
  function late(g, p, T, a, l, w, side) {
    if (a.brakeAt == null) return;
    g.flash(p, T - a.brakeAt, { l, w, tone: 'alert' });
    g.chip(p.x, p.y, 'Hard stop', { tone: 'alert', k: fade(T, a.brakeAt, a.stopAt != null ? a.stopAt + 1.8 : null), side, gap: (w / 2) * g.cam.scale + 14 });
  }
  // Second views in a corner: plain panels, bars and marks only.
  function carScreen(g, k) {
    const c = g.ctx, b = g.inset('tl', 212, 98), x = b.x + 14, y = b.y + 32;
    g.text(x, b.y + 22, 'The car’s screen', { size: 13 });
    c.fillStyle = '#0A0D0F'; c.fillRect(x, y, 184, 34); c.fillStyle = rgba('lane', 0.42); c.fillRect(x + 86, y + 8, 12, 19);
    if (k > 0) { c.fillStyle = rgba('zone', k); c.fillRect(x + 172, y + 5, 7, 24); g.text(x, b.y + 86, 'Cyclist on the right', { weight: 400, alpha: 0.9 * k }); }
    g.world();
  }
  function cityApp(g) {
    const c = g.ctx, b = g.inset('tl', 150, 112), x = b.x + 14, cx = b.x + 75, cy = b.y + 66;
    g.text(x, b.y + 22, 'The city’s app', { size: 13 });
    c.strokeStyle = rgba('lane', 0.5); c.lineWidth = 1.5; c.strokeRect(cx - 17, b.y + 34, 34, 64);
    c.strokeStyle = rgba('zone', 0.85); c.lineWidth = 1.25; c.beginPath(); c.arc(cx, cy, 11, 0, PI * 2); c.stroke();
    c.fillStyle = rgba('zone', 1); c.beginPath(); c.arc(cx, cy, 3.5, 0, PI * 2); c.fill();
    g.world();
  }

  /* The six moments ----------------------------------------------------------------------------------------------- */
  const D = {};

  // On the car's own screen (Today): a car noses out of the side street; a parked van hides a cyclist on its right.
  const VAN = { x: 1330, y: PN, a: 0, l: 250, w: 92 }, BIKE = K.route([[X0, 578], [X1, 578]]);
  D.screen = {
    label: 'Plan of a street and a side street. A car noses out of the side street, and a parked van hides a cyclist coming along the street on its right. With VZ the warning appears on the car’s own screen and the driver waits. Without VZ the driver sees the cyclist late and stops hard.',
    lines: { with: ['A car pulls out past a parked van. A cyclist is coming up behind it.', 'The warning appears on the car’s own screen.', 'It says who is coming, and from which side. The driver waits.'],
      without: ['A car pulls out past a parked van.', 'The driver sees the cyclist late and stops hard.'] },
    focus: { x: 520, y: -110, w: 1400, h: 800 }, still: [4.7, 2.9],
    park: [['van', VAN.x, VAN.y, PI], ['car', 980, PN, PI], ['car', 2000, PN, PI], ['car', 2400, PS, 0]],
    init: () => ({ c: mover(380, 210), b: mover(1180, 260), warn: null, seen: null, go: null, end: null }),
    update(s, dt, o) {
      const T = s.t + dt, { c, b } = s, cp = SIDE.at(c.s), bp = BIKE.at(b.s), dev = off(cp, 3.5, -13), eye = off(cp, 30, -14);
      b.s += b.v * dt; // the cyclist rides on: nobody tells him anything
      if (o.vz && s.warn == null && T > 1.4 && caught(s.t, T, dev, bp, ZP)) s.warn = T;
      if (!o.vz && s.seen == null && T > 2.2 && bp.x < SW && !K.occluded(eye, bp, [VAN])) s.seen = T;
      if (c.brakeAt == null && s.seen != null && T > s.seen + 0.35) { c.brakeAt = T; c.at = c.s + (c.v * c.v) / 900; }
      if (c.brakeAt != null) hard(c, dt, c.at, T);
      else if (o.vz ? s.go == null : T < 2) go(c, dt, Math.min(210, stopV(MOUTH - c.s, 200)));
      else go(c, dt, o.vz ? 280 : 120, o.vz ? 150 : 110);
      if (o.vz && s.go == null && s.warn != null && bp.x > SX1 + 30) s.go = T;
      if (s.end == null && (o.vz ? s.go != null && T > s.go + 1.3 : c.stopAt != null && T > c.stopAt + 1.5)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.go != null || (s.warn != null && s.t > s.warn + 1.6) ? 2 : s.warn != null ? 1 : 0) : s.c.brakeAt != null ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, { c, b } = s, cp = SIDE.at(c.s), bp = BIKE.at(b.s), dev = off(cp, 3.5, -13);
      vehicle(g, 'car', cp, c, o.vz); ride(g, bp, o.vz);
      g.atmosphere('Clear', {});
      if (c.s > MOUTH - 80) g.cone(off(cp, 30, -14), PI * 0.84, 0.4, 1300, [VAN], { k: 0.8 }); // the driver looks right along the street
      if (o.vz) {
        g.zone(dev.x, dev.y, ZV); g.zone(bp.x, bp.y, ZP); g.trail(BIKE, b.s + 40, 300);
        g.device(dev.x, dev.y); g.device(bp.x, bp.y);
        told(g, cp, T, s.warn, 176, 74, null, null, null, dev);
      } else late(g, cp, T, c, 176, 74, 'right');
      carScreen(g, o.vz ? fade(T, s.warn, s.go != null ? s.go + 0.6 : null) : 0);
    }
  };

  // Inside the city's own app (Today): residents carry the city's app; one steps out between parked cars.
  const GX = 1100, STEP = K.route([[GX, 728], [GX, 250]]), PARKA = [{ x: 900, y: PS, a: 0, l: 250, w: 92 }, { x: 1270, y: PS, a: 0, l: 176, w: 74 }];
  const RES = [[180, 716, 1, 52], [760, 708, -1, 46], [1560, 714, 1, 50], [420, 212, -1, 54], [1240, 220, 1, 48]];
  D.app = {
    label: 'Plan of a street with parked cars. Residents on the pavements carry the city’s own app. One of them steps out between two parked cars as a car approaches. With VZ the driver is warned and waits. Without VZ the driver sees him late and stops hard.',
    lines: { with: ['Residents carry the city app they already use.', 'Vizible Zone is delivered inside it, as an SDK, so the cars around them know they are there.', 'One steps out between parked cars. The driver is warned.'],
      without: ['A resident steps out between parked cars.', 'The driver sees him late and stops hard.'] },
    focus: { x: 40, y: 110, w: 1480, h: 760 }, still: [4.4, 4.2],
    park: [['van', PARKA[0].x, PS, 0], ['car', PARKA[1].x, PS, 0], ['car', 560, PS, 0], ['car', 1700, PN, PI], ['car', 2050, PS, 0]],
    init: () => ({ e: mover(620, 300), r: mover(0, 0), warn: null, seen: null, clear: null, end: null }),
    update(s, dt, o) {
      const T = s.t + dt, { e, r } = s, ep = EAST.at(e.s), rp = STEP.at(r.s), dev = off(ep, 3.5, -13), eye = off(ep, 40, -14);
      if (T > 1.9) go(r, dt, 85, 200);
      if (s.clear == null && rp.y < CL - 18) s.clear = T;
      if (o.vz && s.warn == null && T > 1.2 && caught(s.t, T, dev, rp, ZP)) s.warn = T;
      if (!o.vz && s.seen == null && rp.y < SK && !K.occluded(eye, rp, PARKA)) s.seen = T;
      if (e.brakeAt == null && s.seen != null && T > s.seen + 0.35) { e.brakeAt = T; e.at = GX - 52 - 88 + 900; }
      if (e.brakeAt != null) hard(e, dt, e.at, T);
      else go(e, dt, s.warn != null && T > s.warn + 0.45 && s.clear == null ? Math.min(300, stopV(GX - 150 - 88 + 900 - e.s, 160)) : 300, 140);
      if (s.end == null && (o.vz ? s.clear != null && T > s.clear + 1.4 : e.stopAt != null && T > e.stopAt + 1.7)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.warn != null && STEP.at(s.r.s).y < SK + 10 ? 2 : s.t > 1.6 ? 1 : 0) : s.e.brakeAt != null ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, { e, r } = s, ep = EAST.at(e.s), rp = STEP.at(r.s), dev = off(ep, 3.5, -13);
      vehicle(g, 'car', ep, e, o.vz);
      const people = RES.map(([x, y, d, v]) => ({ x: x + d * v * T, y, a: d > 0 ? 0 : PI }));
      for (const p of people) g.person(p, { phone: o.vz ? null : 'off' });
      g.person(rp, { phone: o.vz ? null : 'off' });
      g.atmosphere('Clear', {});
      if (o.vz) {
        g.zone(dev.x, dev.y, ZV); g.zone(rp.x, rp.y, ZP);
        for (const p of people.concat([rp, dev])) g.device(p.x, p.y);
        told(g, ep, T, s.warn, 176, 74, 'Pedestrian ahead', g.portrait ? 'left' : 'up', s.clear != null ? s.clear + 0.6 : null, dev);
        cityApp(g);
      } else late(g, ep, T, e, 176, 74, g.portrait ? 'left' : 'up');
    }
  };

  // The person outside warned too (Vision): a rider nears a blind junction; the corner block hides a car on the side street.
  const RIDE = K.route([[X0, 592], [X1, 592]]);
  D.outside = {
    label: 'Plan of a blind junction. A building hides a car on the side street from a scooter rider on the main street. With VZ the rider will be warned on the phone and slow early, a vision. Without VZ the rider sees the car late and brakes hard.',
    lines: { with: ['A rider nears a blind junction. A building hides a car on the side street.', 'Vision: the person outside will be warned on the phone.', 'Vision: the rider will slow early and let the car pass.'],
      without: ['A rider nears a blind junction.', 'The rider sees the car late and brakes hard.'] },
    focus: { x: 480, y: -110, w: 1440, h: 860 }, still: [3.4, 2.6],
    park: [['car', 760, PN, PI], ['car', 2050, PN, PI], ['car', 2500, PS, 0]],
    init: () => ({ c: mover(560, 230), r: mover(1460, 250), warn: null, seen: null, end: null }),
    update(s, dt, o) {
      const T = s.t + dt, { c, r } = s, cp = SIDE.at(c.s), rp = RIDE.at(r.s), dev = off(cp, 3.5, -13);
      go(c, dt, c.s < MOUTH ? Math.max(150, Math.min(230, stopV(MOUTH - c.s, 120))) : 300, 150); // the car rolls out: its driver cannot see her either
      if (o.vz && s.warn == null && T > 1 && caught(s.t, T, dev, rp, ZP)) s.warn = T;
      if (!o.vz && s.seen == null && off(cp, 88, 0).y > NK - 10 && !K.occluded(off(rp, 8, 0), off(cp, 88, 0), [CORNER])) s.seen = T;
      const rear = SIDE.at(c.s - 88), clear = rear.y > EB - 30 && rear.x > rp.x + 120; // the car has turned in ahead of her
      if (r.brakeAt == null && s.seen != null && T > s.seen + 0.35) { r.brakeAt = T; r.at = r.s + (r.v * r.v) / 560; }
      if (r.brakeAt != null) hard(r, dt, r.at, T);
      else go(r, dt, s.warn != null && T > s.warn + 0.4 && !clear ? Math.min(250, stopV(SW - 150 + 900 - r.s, 120)) : 250, 120, 300);
      if (o.vz && s.clear == null && clear) s.clear = T;
      if (s.end == null && (o.vz ? s.clear != null && T > s.clear + 2 : r.stopAt != null && T > r.stopAt + 2.5)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.warn != null && s.t > s.warn + 1.6 ? 2 : s.warn != null ? 1 : 0) : s.r.brakeAt != null ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, { c, r } = s, cp = SIDE.at(c.s), rp = RIDE.at(r.s), dev = off(cp, 3.5, -13);
      vehicle(g, 'car', cp, c, o.vz); ride(g, rp, o.vz, true);
      g.atmosphere('Clear', {});
      if (o.vz) {
        g.zone(dev.x, dev.y, ZP); g.trail(SIDE, c.s + 100, 320, { gap: 15 });
        g.device(dev.x, dev.y); g.device(rp.x, rp.y);
        told(g, rp, T, s.warn, 60, 30, 'Car pulling out', g.portrait ? 'right' : 'up', s.clear != null ? s.clear + 0.6 : null);
      } else late(g, rp, T, r, 60, 30, g.portrait ? 'right' : 'up');
    }
  };

  // Earlier, with prediction (Vision): a child walks towards a gap between parked cars; the warning comes before she turns.
  const GE = 1000, KID = K.route([[760, 716], [GE, 716], [GE, 250]], 40), PARKE = [{ x: 800, y: PS, a: 0, l: 250, w: 92 }, { x: 1170, y: PS, a: 0, l: 176, w: 74 }];
  D.earlier = {
    label: 'Plan of a street with parked cars. A child walks along the pavement towards a gap between them as a car approaches. With VZ her path will be foreseen and the driver warned before she steps out, a vision. Without VZ she steps out and the driver stops hard.',
    lines: { with: ['A child walks towards a gap between parked cars. A car is coming.', 'Vision: with prediction, the warning will come before she steps out.', 'Vision: the driver will have more time to slow.'],
      without: ['A child walks towards a gap between parked cars.', 'She steps out. The driver stops hard.'] },
    focus: { x: -60, y: 150, w: 1460, h: 720 }, still: [4.4, 1.8],
    park: [['van', PARKE[0].x, PS, 0], ['car', PARKE[1].x, PS, 0], ['car', 420, PS, 0], ['car', 1600, PN, PI]],
    init: () => ({ e: mover(560, 300), k: mover(0, 95), warn: null, seen: null, clear: null, end: null }),
    update(s, dt, o) {
      const T = s.t + dt, { e, k } = s, ep = EAST.at(e.s), kp = KID.at(k.s), dev = off(ep, 3.5, -13);
      k.s += k.v * dt;
      if (s.clear == null && kp.y < CL - 18) s.clear = T;
      if (o.vz && s.warn == null && T > 1.1 && caught(s.t, T, dev, kp, ZP)) s.warn = T;
      if (!o.vz && s.seen == null && kp.y < 600 && !K.occluded(off(ep, 40, -14), kp, PARKE)) s.seen = T;
      if (e.brakeAt == null && s.seen != null && T > s.seen + 0.35) { e.brakeAt = T; e.at = GE - 44 - 88 + 900; }
      if (e.brakeAt != null) hard(e, dt, e.at, T);
      else go(e, dt, s.warn != null && T > s.warn + 0.45 && s.clear == null ? Math.min(300, stopV(e.stop = GE - 170 - 88 + 900 - e.s, 150)) : 300, 140);
      if (s.end == null && (o.vz ? s.clear != null && T > s.clear + 1.2 : e.stopAt != null && T > e.stopAt + 1.9)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.warn != null && s.t > s.warn + 1.5 ? 2 : s.warn != null ? 1 : 0) : s.e.brakeAt != null ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, { e, k } = s, ep = EAST.at(e.s), kp = KID.at(k.s), dev = off(ep, 3.5, -13);
      vehicle(g, 'car', ep, e, o.vz); g.person(kp, { r: 9, phone: o.vz ? null : 'off' });
      g.atmosphere('Clear', {});
      if (o.vz) {
        g.zone(dev.x, dev.y, ZV); g.zone(kp.x, kp.y, ZP);
        g.trail(KID, k.s + 12, 300); // her path ahead bends into the road before she turns
        g.trail(EAST, e.s + 100, s.warn != null && s.clear == null ? Math.max(0, GE - 170 + 900 - e.s - 100) : 360, { gap: 15 }); // the car's ends short of the gap
        g.device(dev.x, dev.y); g.device(kp.x, kp.y);
        told(g, ep, T, s.warn, 176, 74, 'Child ahead', g.portrait ? 'left' : 'up', s.clear != null ? s.clear + 0.6 : null, dev);
      } else late(g, ep, T, e, 176, 74, g.portrait ? 'left' : 'up');
    }
  };

  // Into fleets and driver assistance (Vision): a bus and a van pass a parked truck; someone is about to cross from behind it.
  const TRUCK = { x: 1400, y: PS, a: 0, l: 620, w: 100 }, PED = K.route([[1748, 640], [1748, 250]]);
  D.fleet = {
    label: 'Plan of a street with a parked truck. A bus and a delivery van pass it while someone is about to cross from behind it. With VZ the same warning will reach both vehicles at once and both drivers ease off, a vision. Without VZ the first driver sees him late and stops hard.',
    lines: { with: ['A bus and a delivery van pass a parked truck. Someone is about to cross from behind it.', 'Vision: the same warning will reach fleet systems.', 'Vision: it will reach driver-assistance features too.'],
      without: ['A bus and a van pass a parked truck.', 'The first driver sees him late and stops hard.'] },
    focus: { x: 60, y: 130, w: 1860, h: 760 }, still: [4.2, 2.8],
    park: [['truck', TRUCK.x, PS, 0], ['car', 600, PS, 0], ['car', 2050, PS, 0], ['car', 1200, PN, PI]],
    init: () => ({ b: mover(1255, 260), v: mover(730, 260), p: mover(0, 0), warn: null, seen: null, clear: null, end: null }),
    update(s, dt, o) {
      const T = s.t + dt, { b, v, p } = s, bp = EAST.at(b.s), pp = PED.at(p.s), dev = off(bp, 200, -30);
      if (T > 2.5) go(p, dt, 90, 220);
      if (s.clear == null && pp.y < CL - 18) s.clear = T;
      if (o.vz && s.warn == null && T > 1 && caught(s.t, T, dev, pp, ZP)) s.warn = T; // one warning, both vehicles at once
      if (!o.vz && s.seen == null && pp.y < 600 && !K.occluded(off(bp, 210, -30), pp, [TRUCK])) s.seen = T;
      if (b.brakeAt == null && s.seen != null && T > s.seen + 0.35) { b.brakeAt = T; b.at = 1748 - 50 - 240 + 900; }
      const ease = s.warn != null && T > s.warn + 0.45 && s.clear == null;
      if (b.brakeAt != null) hard(b, dt, b.at, T); else go(b, dt, ease ? Math.min(260, stopV(1748 - 230 - 240 + 900 - b.s, 120)) : 260, 120);
      go(v, dt, Math.min(ease ? 120 : 260, stopV(b.s - 240 - 125 - 150 - v.s, 260)), 120, 400);
      if (s.end == null && (o.vz ? s.clear != null && T > s.clear + 1.2 : b.stopAt != null && T > b.stopAt + 1.3)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.warn != null && s.t > s.warn + 1.8 ? 2 : s.warn != null ? 1 : 0) : s.b.brakeAt != null ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, { b, v, p } = s, bp = EAST.at(b.s), vp = EAST.at(v.s), pp = PED.at(p.s), db = off(bp, 200, -30), dv = off(vp, 70, -24);
      vehicle(g, 'bus', bp, b, o.vz); vehicle(g, 'van', vp, v, o.vz); g.person(pp, { phone: o.vz ? null : 'off' });
      g.atmosphere('Clear', {});
      if (o.vz) {
        g.zone(db.x, db.y, ZV); g.zone(pp.x, pp.y, ZP);
        g.device(db.x, db.y); g.device(dv.x, dv.y); g.device(pp.x, pp.y);
        const until = s.clear != null ? s.clear + 0.6 : null, side = g.portrait ? 'left' : 'up';
        told(g, bp, T, s.warn, 480, 102, 'Pedestrian ahead', side, until, db); told(g, vp, T, s.warn, 250, 92, 'Pedestrian ahead', side, until, dv);
      } else late(g, bp, T, b, 480, 102, g.portrait ? 'left' : 'up');
    }
  };

  // Smart lighting (Vision): Gabi's sentence and no more. The street lights keep one brightness in both views (Yitro,
  // decision 15): nothing is shown about what the lighting will do. No chip; the still is the moment the label is in.
  const WALKERS = [[470, 712, 1, 60], [1290, 716, -1, 52], [640, 214, 1, 56], [1130, 222, -1, 50]];
  const ZL = { rmax: 340, period: 0.7, rings: 3, strength: 0.5, fill: false }; // quiet: the light is the subject
  D.lighting = {
    label: 'Plan of a street at night with street lamps and a few people walking. With VZ, each person has a zone around them, and the same awareness will serve smart lighting, a vision. The street lights stay as they are. Without VZ the street lights stay as they are.',
    lines: { with: ['People walk along a street at night.', 'Vision: the same awareness will serve smart lighting.'],
      without: ['People walk along a street at night.', 'The street lights stay as they are.'] },
    focus: { x: 140, y: 110, w: 1300, h: 740 }, still: [3.4, 3.4],
    park: [['car', 260, PS, 0], ['car', 1460, PS, 0], ['car', 820, PN, PI]],
    init: () => ({ end: null }),
    update(s, dt, o) { if (s.end == null && s.t + dt > (o.vz ? 6.3 : 6.1)) s.end = s.t + dt; },
    beat: (s) => (s.t > 1.2 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, c = g.ctx, people = WALKERS.map(([x, y, d, v]) => ({ x: x + d * v * T, y, a: d > 0 ? 0 : PI }));
      for (const p of people) g.person(p, { phone: o.vz ? null : 'off' });
      g.atmosphere('Night', { lamps: LAMPS });
      if (o.vz) { // the lamps are not touched: the same street lights as without VZ
        people.forEach((p, i) => { g.zone(p.x, p.y, Object.assign({ phase: i * 0.17 }, ZL)); });
        for (const p of people) g.device(p.x, p.y);
        g.label(900, 560, 'Smart lighting: Vision', { status: 'vision', k: fade(T, 1) });
      }
    }
  };

  /* mount ------------------------------------------------------------------------------------------------------------ */
  const IDS = Object.keys(D), find = (v) => IDS.find((n) => n === String(v).toLowerCase());
  let demo = find(new URLSearchParams(location.search).get('demo')) || IDS[0];
  for (const n of IDS) D[n].park = D[n].park || [];
  const ALL = { x: 0, y: -160, w: 1900, h: 1040 }, LABEL = 'Six moments on one street with parked vehicles and a side street. The caption below describes each one.';
  // label and focus follow the demo for a kit that calls them; a kit that reads a string or a rectangle gets the whole street.
  const label = Object.assign((o) => D[o.demo].label, { toString: () => LABEL });
  const focus = Object.assign((o) => D[o.demo].focus, ALL);
  const api = K.mount({
    el: '#sim', label, focus, portraitFocus: focus,
    compare: false,
    options: { demo },
    choices: [{ name: 'demo', label: 'Feature', values: IDS, hidden: true }],
    still: (vz, o) => D[(o && o.demo) || demo].still[+vz],
    lines: (o) => D[o.demo].lines[o.vz ? 'with' : 'without'],
    beat: (s, o) => D[o.demo].beat(s, o),
    ground(g, o) {
      const r = 46, rnd = K.rng(5), d = D[o.demo];
      const nw = [[X0, TOP], [SX0, TOP], [SX0, NK - r], ...K.arcPts(SX0 - r, NK - r, r, 0, PI / 2), [X0, NK]];
      const ne = [[X1, TOP], [X1, NK], ...K.arcPts(SX1 + r, NK - r, r, PI / 2, PI), [SX1, TOP]];
      const so = [[X0, SK], [X1, SK], [X1, BOT], [X0, BOT]];
      g.pavement(nw); g.pavement(ne); g.pavement(so); g.kerb(nw.slice(1)); g.kerb(ne.slice(1)); g.kerb(so.slice(0, 2));
      const row = (x, x1, y, h) => { while (x < x1 - 40) { let w = 170 + rnd() * 200; if (x1 - x - w < 130) w = x1 - x; g.building(x, y, w - 8, h, { seed: (x * 5) | 0 }); x += w; } };
      row(X0, CORNER.x - CORNER.l / 2, TOP, 180 - TOP); g.building(CORNER.x - CORNER.l / 2, TOP, CORNER.l, 180 - TOP, { seed: 3 });
      row(SX1 + 60, X1, TOP, 180 - TOP); row(X0, X1, 770, BOT - 770);
      g.marking([[X0, CL], [X1, CL]], { dash: [110, 130] });
      for (const [a, b, y] of [[X0, SX0 - 20, 340], [SX1 + 20, X1, 340], [X0, X1, 580]]) g.marking([[a, y], [b, y]], { w: 3, alpha: 0.3 });
      g.marking([[1620, TOP], [1620, NK - 50]], { dash: [80, 100] }); g.marking([[SX0 + 8, GIVE], [1614, GIVE]], { dash: [22, 16], w: 6, alpha: 0.6 });
      for (const [x, y] of TREES) g.tree(x, y, 32);
      for (const [x, y, a] of LAMPS) g.lamp(x, y, a);
      for (const [k, x, y, a] of d.park) g.vehicle(k, { x, y, a }, {});
    },
    init(o) { demo = o.demo; return D[o.demo].init(o); },
    update(s, dt, o) { D[o.demo].update(s, dt, o); s.over = s.end != null && s.t + dt > s.end + 0.3; },
    draw: (g, s, o) => D[o.demo].draw(g, s, o),
    debug: (s) => ({ end: s.end, warn: s.warn, seen: s.seen, clear: s.clear, go: s.go })
  });
  const set = api.setOption; // note the demo first, so a reduced-motion still shows it
  api.setOption = (name, value) => { const m = name === 'demo' && find(value); if (m) demo = m; return set(name, value); };
})();
