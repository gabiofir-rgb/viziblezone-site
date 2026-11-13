/* The hidden pedestrian: the reference VZ scene, built on simkit. Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, ease } = K;

  // World units: about 40 to a metre. The street runs along x; traffic keeps right.
  const NK = 290, SK = 590, LANE = 515, CAR_L = 176, CAR_W = 74, HALF = 0.62;
  const BUS = { x: 850, y: 641, a: 0, l: 480, w: 102 }, OCC = [BUS];
  const ZEBRA = [1130, 1260], CROSS_X = 1168, KID_R = 10.5, SIDE = [1390, 1570];
  const KID = K.route([[1092, 762], [CROSS_X, 762], [CROSS_X, 226]], 36);
  const ROAD = K.route([[-1000, LANE], [3000, LANE]]);
  const S_WAIT = KID.find((p) => p.y <= 622), S_FREEZE = KID.find((p) => p.y <= 522), S_CLEAR = KID.find((p) => p.y <= LANE - CAR_W / 2 - 14), S_TURN = KID.find((p) => p.y < 760);
  const ZONE = { rmax: 1100, reach: 900, period: 0.7, rings: 3, phase: 0 };
  const CAR_ZONE = Object.assign({}, ZONE, { phase: 0.35, strength: 0.45, fill: false });
  // Weather changes the driver, never the zone: how far they see, how fast they drive, how close a late stop ends.
  const WX = {
    Clear: { range: 1700, cruise: 300, gap: 30, cone: 1 },
    Night: { range: 430, cruise: 285, gap: 24, cone: 0.4 },
    Rain: { range: 540, cruise: 280, gap: 22, cone: 0.9 },
    Fog: { range: 300, cruise: 250, gap: 18, cone: 1.1 }
  };
  const LAMPS = [[140, 266, Math.PI / 2], [740, 266, Math.PI / 2], [1300, 266, Math.PI / 2], [1900, 266, Math.PI / 2], [260, 614, -Math.PI / 2], [1300, 614, -Math.PI / 2]];
  const L = {
    with: ['A child is hidden behind a parked bus. A car approaches.',
      'The child is still hidden. Today: the driver is warned on a screen in the car.',
      'The car slows early. The child waits, then crosses in front of the stopped car.',
      'The child crosses with room to spare. The car knew she was there before the driver could see her.'],
    without: ['A child is hidden behind a parked bus. A car approaches.',
      'Without VZ, the bus hides the child. The driver has no early warning.',
      'The child steps into view. The driver sees her late and brakes hard.',
      'The car stops abruptly, close to the child. The driver saw her at the last moment.'],
    again: 'Now without VZ. The bus hides the child, and the driver has no early warning.'
  };

  function ground(g) {
    const X0 = -1000, X1 = 2800, r = 46, N = 150, S = 830, B = -700;
    const west = [[X0, N], [SIDE[0] - 110, N], [SIDE[0] - 110, B], [SIDE[0], B], [SIDE[0], NK - r], ...K.arcPts(SIDE[0] - r, NK - r, r, 0, Math.PI / 2), [X0, NK]];
    const east = [[SIDE[1], B], [SIDE[1] + 110, B], [SIDE[1] + 110, N], [X1, N], [X1, NK], ...K.arcPts(SIDE[1] + r, NK - r, r, Math.PI / 2, Math.PI), [SIDE[1], B]];
    const south = [[X0, SK], [520, SK], [600, 700], [1092, 700], [1124, SK], [X1, SK], [X1, S], [X0, S]];
    g.pavement(west); g.pavement(east); g.pavement(south);
    g.kerb(west.slice(3)); g.kerb(east.slice(4)); g.kerb(south.slice(0, 6));
    const rnd = K.rng(7);
    const row = (x, x1, y, h) => { while (x < x1 - 40) { let w = 150 + rnd() * 210; if (x1 - x - w < 120) w = x1 - x; g.building(x, y, w - 8, h, { seed: (x * 3) | 0 }); x += w; } };
    row(X0, SIDE[0] - 110, B, N - B); row(SIDE[1] + 110, X1, B, N - B); row(X0, X1, S, 700);
    g.marking([[X0, 440], [860, 440]], { dash: [110, 130] }); g.marking([[860, 440], [1120, 440]]); g.marking([[1270, 440], [1520, 440]]); g.marking([[1520, 440], [X1, 440]], { dash: [110, 130] });
    g.marking([[536, SK + 2], [1118, SK + 2]], { dash: [26, 22], w: 4, alpha: 0.42 });
    g.marking([[SIDE[0] + 6, NK - 9], [SIDE[1] - 6, NK - 9]], { dash: [20, 16], w: 5, alpha: 0.5 });
    g.zebra(ZEBRA[0], NK + 3, ZEBRA[1], SK - 3);
    g.tactile(ZEBRA[0], NK - 34, ZEBRA[1] - ZEBRA[0], 30); g.tactile(ZEBRA[0], SK + 4, ZEBRA[1] - ZEBRA[0], 30);
    g.shelter(700, 724, 200, 36);
    for (const [x, y] of [[440, 214], [1040, 214], [1760, 214], [400, 790], [1460, 790]]) g.tree(x, y, 40);
    for (const [x, y, a] of LAMPS) g.lamp(x, y, a);
  }

  function init(o) {
    return {
      end: null, over: false,
      car: { x: -40, v: WX[o.weather].cruise, mode: 'cruise', brake: 0, hard: false, stop: 0, caught: null, seen: null, brakeAt: null, stopAt: null, skid: null },
      kid: { s: 0, v: 70, caught: null, go: null, clear: null, vis: 0, seenFor: 0 }
    };
  }

  function update(s, dt, o) {
    const w = WX[o.weather], car = s.car, kid = s.kid, t0 = s.t, T = t0 + dt, p = KID.at(kid.s);
    const eye = { x: car.x + 22, y: LANE - 10 }, dev = { x: car.x + 3.5, y: LANE - 13 };
    // What the driver can see: the cone, cut by the bus, shortened by the weather.
    kid.seenFor = K.sees(eye, 0, HALF, w.range, p, OCC) ? kid.seenFor + dt : 0;
    if (car.seen == null && kid.seenFor >= 0.1) car.seen = T;
    kid.vis = clamp(kid.vis + (K.occluded(eye, p, OCC) ? -dt : dt) / 0.2);
    // With VZ each phone's rings carry its presence through the bus; the first ring within reach warns.
    if (o.vz) {
      const d = Math.hypot(dev.x - p.x, dev.y - p.y);
      if (car.caught == null && d <= ZONE.reach && K.zoneCrossed(t0, T, d, ZONE)) car.caught = T;
      if (kid.caught == null && d <= ZONE.reach && K.zoneCrossed(t0, T, d, CAR_ZONE)) kid.caught = T;
    }
    // Driver: reacts to the warning (with VZ) or to sight (without), after a reaction time.
    const cue = Math.min(car.caught ?? Infinity, car.seen ?? Infinity);
    if (car.mode === 'cruise' && kid.clear == null && T >= cue + (car.caught != null ? 0.45 : 0.35)) {
      car.mode = 'brake'; car.brakeAt = T; car.hard = car.caught == null;
      car.stop = car.hard ? CROSS_X - KID_R - w.gap : ZEBRA[0] - 70;
      if (car.hard) car.skid = car.x;
    }
    if (car.mode === 'brake') {
      const rem = car.stop - (car.x + CAR_L / 2);
      if (rem <= 0.5 || car.v < 4) { car.v = 0; car.mode = 'stopped'; car.stopAt = T; }
      else {
        const need = (car.v * car.v) / (2 * rem), ramp = car.hard ? 1 : 0.35 + 0.65 * ease.smooth((T - car.brakeAt) / 0.5);
        car.v = Math.max(0, car.v - need * ramp * dt); car.brake = car.hard ? 1 : 0.5;
      }
    } else if (car.mode === 'stopped') {
      car.brake = car.hard ? 1 : 0.5;
      if (kid.clear != null && T > kid.clear + 0.5) car.mode = 'go';
    } else if (car.mode === 'go') { car.brake = 0; car.v = Math.min(w.cruise, car.v + 130 * dt); }
    car.x += car.v * dt;
    // Child: walks to the crossing. Warned, she waits at the kerb; unwarned, she steps out and freezes in the lane.
    let target = kid.s < S_TURN ? 70 : 100, stopAt = null, dec = 260;
    // Warned, she goes as the car settles to a stop; unwarned, only once the shock has passed.
    const carStill = o.vz ? car.mode === 'stopped' || (car.mode === 'brake' && car.v < 45) : car.mode === 'stopped' && T > car.stopAt + 0.7;
    if (kid.go != null) target = o.vz ? 88 : 115;
    else if (o.vz && kid.caught != null) { if (carStill) { kid.go = T; target = 88; } else stopAt = S_WAIT; }
    else if (!o.vz && kid.s >= S_FREEZE - 30) { if (carStill) { kid.go = T; target = 115; } else { stopAt = S_FREEZE; dec = 900; } }
    if (stopAt != null) target = Math.min(target, Math.sqrt(2 * dec * Math.max(0, stopAt - kid.s)));
    kid.v += clamp(target - kid.v, -dec * dt, 320 * dt);
    kid.s = Math.min(KID.total, kid.s + Math.max(0, kid.v) * dt);
    if (kid.clear == null && kid.s >= S_CLEAR) kid.clear = T;
    // End of run: in compare mode each run stops once its point is made.
    if (s.end == null) {
      if (o.compare && o.vz && kid.go != null && T > kid.go + 1.6) s.end = T;
      else if (o.compare && !o.vz && car.stopAt != null && T > car.stopAt + 2.6) s.end = T;
      else if ((car.x > 1800 && kid.s >= KID.total - 1) || T > 18) s.end = T;
    }
    s.over = s.end != null && T > s.end + 0.3;
  }

  function draw(g, s, o) {
    const w = WX[o.weather], car = s.car, kid = s.kid, T = s.t, c = g.ctx, p = KID.at(kid.s);
    const cp = { x: car.x, y: LANE, a: 0 }, eye = { x: car.x + 22, y: LANE - 10 }, dev = { x: car.x + 3.5, y: LANE - 13 };
    // Physical world: skid marks, bus, car, child.
    if (car.skid != null && car.x - car.skid > 2) {
      const gr = c.createLinearGradient(car.skid, 0, car.x + 60, 0); gr.addColorStop(0, 'rgba(4,6,8,0)'); gr.addColorStop(0.3, 'rgba(4,6,8,.5)'); gr.addColorStop(1, 'rgba(4,6,8,.6)');
      c.strokeStyle = gr; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
      for (const dy of [-26, 26]) for (const dx of [54, -52]) { c.moveTo(car.skid + dx, LANE + dy); c.lineTo(car.x + dx, LANE + dy); }
      c.stroke();
    }
    g.vehicle('bus', BUS, { brake: 0 });
    g.vehicle('car', cp, { brake: car.brake, lights: 1, phone: o.vz ? null : 'off' });
    g.person(p, { r: KID_R, alpha: kid.vis, phone: o.vz ? null : 'off' });
    const beams = [{ eye: { x: car.x + CAR_L / 2, y: LANE }, a: 0, half: 0.5, range: w.range * 1.05, occ: OCC }];
    g.atmosphere(o.weather, { lamps: LAMPS, beams });
    g.cone(eye, 0, HALF, w.range, OCC, { k: w.cone });
    const fade = (a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
    if (o.vz) {
      // The VZ layer sits above the bus and the weather: the zone passes through both.
      const trailLen = car.mode === 'brake' ? car.stop - car.x - CAR_L / 2 : car.mode === 'stopped' ? 0 : car.v * 1.6;
      g.zone(dev.x, dev.y, CAR_ZONE);
      g.zone(p.x, p.y, ZONE);
      if (kid.vis < 1) g.person(p, { r: KID_R, ghost: true, alpha: 1 - kid.vis });
      g.trail(KID, kid.s + KID_R, kid.s >= KID.total - 2 ? 0 : 270);
      g.trail(ROAD, car.x + CAR_L / 2 + 1000 + 6, trailLen, { gap: 15 });
      g.device(dev.x, dev.y); g.device(p.x, p.y);
      if (car.caught != null) { g.catchFx(dev.x, dev.y, T - car.caught); g.flash(cp, T - car.caught, { l: CAR_L, w: CAR_W }); }
      if (kid.caught != null) { g.catchFx(p.x, p.y, T - kid.caught); g.flash(p, T - kid.caught, { l: KID_R * 2, w: KID_R * 2 }); }
      g.chip(car.x, LANE, 'Child ahead', { k: fade(car.caught, car.stopAt != null ? car.stopAt + 1.2 : null), side: g.portrait ? 'left' : 'up', gap: 50 });
    } else if (car.brakeAt != null) {
      g.flash(cp, T - car.brakeAt, { l: CAR_L, w: CAR_W, tone: 'alert' });
      g.chip(car.x, LANE, 'Hard stop', { tone: 'alert', k: fade(car.brakeAt, car.stopAt != null ? car.stopAt + 1.8 : null), side: g.portrait ? 'left' : 'up', gap: 50 });
    }
  }

  K.mount({
    el: '#sim',
    label: 'Top-down street plan. A parked bus hides a child from a car approaching the crossing. With VZ, the car knows the child is there even behind the bus. The driver is warned on a screen in the car (Today). Without VZ, the driver sees her late and brakes hard. The caption below describes each moment.',
    focus: { x: -150, y: 150, w: 1630, h: 680 },
    portraitFocus: { x: 240, y: 228, w: 1200, h: 600 },
    compare: false, // the scene stays With VZ; Without VZ is the toggle
    statuses: [['today', 'The car knows she is there, out of sight: Today'], ['today', 'The driver is warned on a screen in the car: Today'], ['dev', 'Prediction will make the warning earlier: In development']],
    options: { weather: 'Clear' },
    choices: [{ name: 'weather', label: 'Weather', values: ['Clear', 'Night', 'Rain', 'Fog'] }],
    start: (o) => (o.compare && !o.vz ? 1.2 : 0), // the repeat run skips the set-up the viewer has just seen
    still: (vz) => (vz ? 1.9 : 4.6),
    // Compare mode keeps each run short so the contrast lands within ten seconds; single mode tells it in full.
    lines: (o) => (o.compare ? (o.vz ? [L.with[0], L.with[1], L.with[3]] : [L.again, L.without[2], L.without[3]]) : o.vz ? L.with : L.without),
    beat(s, o) {
      const c = s.car, k = s.kid;
      if (o.vz) { const b = k.go != null ? 3 : c.brakeAt != null && s.t > c.brakeAt + 0.5 ? 2 : c.caught != null ? 1 : 0; return o.compare ? (b === 3 ? 2 : Math.min(b, 1)) : b; }
      const b = c.stopAt != null && s.t > c.stopAt + 0.3 ? 3 : c.brakeAt != null ? 2 : s.t > 1.3 ? 1 : 0;
      return o.compare ? Math.max(0, b - 1) : b;
    },
    debug: (s) => ({ caught: s.car.caught, kidCaught: s.kid.caught, seen: s.car.seen, brakeAt: s.car.brakeAt, stopAt: s.car.stopAt, kidGo: s.kid.go, end: s.end, carFront: s.car.x + CAR_L / 2, kidY: KID.at(s.kid.s).y, mode: s.car.mode }),
    ground, init, update, draw
  });
})();
