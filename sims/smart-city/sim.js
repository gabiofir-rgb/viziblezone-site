/* Smart cities: a school block. Adaptive crossing, a two-way warning and an anonymous city view. Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, C, rgba } = K, PI = Math.PI, TAU = PI * 2;

  // World units: about 40 to a metre. The street runs along x and traffic keeps right; a bike lane runs along the south kerb.
  const NK = 300, SK = 600, WL = 360, EL = 480, BL = 570, BIKE = 540, CL = 420, X0 = -900, X1 = 2900;
  const ZEB = [700, 820], CX = 760, STOP_E = 672, STOP_W = 848, SIDE = [1380, 1600], TX = 1436, STD = 2, CH = 88;
  const SENIOR = K.route([[CX, 455], [CX, 214], [420, 214]], 34), S_KERB = SENIOR.find((p) => p.y <= NK - 8);
  const TURN = K.route([[X0, EL], [TX, EL], [TX, 1900]], 120), BIKE_RT = K.route([[X0, BL], [X1, BL]]);
  const EAST = K.route([[X0, EL], [X1, EL]]), WEST = K.route([[X1, WL], [X0, WL]]);
  const U_TS = TX - 120 - X0, U_WAIT = TURN.find((p) => p.y + CH * Math.sin(p.a) + 37 * Math.cos(p.a) >= BIKE - 10), CONF = 1395;
  const U_STOPW = X1 - STOP_W - CH - 4, U_STOPE = STOP_E - CH - 4 - X0, U_STOPB = STOP_E - 34 - X0;
  const ZS = { rmax: 760, period: 0.7, rings: 3 };                                   // the senior's phone
  const ZB = { rmax: 700, period: 0.7, rings: 3 };                                   // the rider's phone
  const ZC = { rmax: 700, period: 0.7, rings: 3, phase: 0.35, strength: 0.45, fill: false }; // the driver's phone, quieter
  const SIG = [{ x: 676, y: 614, d: 1 }, { x: 848, y: 286, d: -1 }];               // signal heads on the kerb, facing the traffic
  const EARLY = [[1462, 568, 1, -3], [300, 470, 0.7, -8], [1150, 362, 0.6, -11], [760, 664, 0.6, -5], [1490, 820, 0.5, -13]]; // city view: earlier spots, fading
  const WALK = [[260, 252, 1, 52, 0], [1250, 664, -1, 50, 0], [-80, 248, 1, 58, 1], [590, 246, 1, 46, 1], [960, 652, -1, 55, 1], [1330, 648, -1, 47, 1], [1180, 256, 1, 60, 1]];
  const KIDS = [[736, 694, 0], [784, 704, 0], [712, 712, 1], [812, 700, 1], [760, 720, 1]];
  const YARD = [[330, 790, 50, 22, 0.9, 0], [520, 812, 40, 30, 1.3, 2], [960, 790, 70, 20, 0.8, 4], [1150, 830, 30, 40, 1.1, 1], [700, 800, 50, 18, 1.2, 3]]; // kids at play: centre, radii, pace, phase
  const LAMPS = [[140, 276, PI / 2], [980, 276, PI / 2], [1560, 276, PI / 2], [420, 624, -PI / 2], [1240, 624, -PI / 2], [1760, 624, -PI / 2]];
  const STATUS = [['today', 'The driver is warned on a screen in the car: Today'], ['vision', 'The person outside will be warned on the phone: Vision'], ['vision', 'A crossing light that will give more time: Vision'], ['vision', 'The city view of anonymous near misses: Vision']];
  const L = {
    with: ['A senior is crossing slowly at the school. The light is about to change.',
      'Vision: with VZ, the light will give her more time. The traffic will wait until she is across.',
      'She is safely across. The light changes and the traffic moves off.',
      'A car turns right across the bike lane. Today: the driver is warned on a screen in the car.',
      'The driver waits for the scooter to pass, then turns. Nobody brakes hard.'],
    without: ['A senior is crossing slowly at the school. The light is about to change.',
      'Without VZ, the light changes while she is still crossing. A driver brakes hard in front of her.',
      'A car turns right across the bike lane. Neither the driver nor the scooter rider is warned.',
      'They see each other late. Both brake hard.'],
    again: 'Now without VZ. The light keeps to its usual timing.',
    cityWith: 'Vision: a city view will show where near misses happen, as anonymous spots that fade. No names, no tracks.',
    cityWithout: 'Without VZ, these near misses would leave no trace for the city.'
  };

  function rr(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const off = (p, u, v) => ({ x: p.x + u * Math.cos(p.a) - v * Math.sin(p.a), y: p.y + u * Math.sin(p.a) + v * Math.cos(p.a) });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function bandMinX(p) { // the westmost point of a car body inside the rider's line in the bike lane
    const q = K.corners({ x: p.x, y: p.y, a: p.a, l: 176, w: 74 }); let m = Infinity;
    for (let i = 0; i < 4; i++) for (let k = 0; k <= 10; k++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) & 3], x = x1 + ((x2 - x1) * k) / 10, y = y1 + ((y2 - y1) * k) / 10; if (y > BL - 16 && y < BL + 16 && x < m) m = x; }
    return m;
  }

  function ground(g) {
    const c = g.ctx, r = 46, B = 1500, T0 = -500;
    const sw = [[X0, SK], [SIDE[0] - r, SK], ...K.arcPts(SIDE[0] - r, SK + r, r, -PI / 2, 0), [SIDE[0], B], [X0, B]];
    const se = [[SIDE[1], B], [SIDE[1], SK + r], ...K.arcPts(SIDE[1] + r, SK + r, r, PI, PI * 1.5), [X1, SK], [X1, B]];
    g.pavement([[X0, T0], [X1, T0], [X1, NK], [X0, NK]]); g.pavement(sw); g.pavement(se);
    g.kerb([[X0, NK], [X1, NK]]); g.kerb(sw.slice(0, -1)); g.kerb(se.slice(0, -1));
    c.fillStyle = rgba('lane', 0.028); c.fillRect(X0, BIKE, X1 - X0, SK - BIKE); // the bike lane reads as its own surface
    const rnd = K.rng(11);
    const row = (x, x1, y, h) => { while (x < x1 - 40) { let w = 160 + rnd() * 220; if (x1 - x - w < 130) w = x1 - x; g.building(x, y, w - 8, h, { seed: (x * 7) | 0 }); x += w; } };
    row(X0, X1, T0, 170 - T0); row(X0, 120, 736, B - 736); row(1640, X1, 680, B - 680);
    // The school: a yard behind a fence with a gate at the crossing, the building beyond.
    c.fillStyle = '#22292D'; c.fillRect(140, 736, 1200, 760);
    c.strokeStyle = rgba('lane', 0.12); c.lineWidth = 2; c.strokeRect(380, 760, 520, 96); c.beginPath(); c.moveTo(640, 760); c.lineTo(640, 856); c.stroke();
    g.marking([[140, 1500], [140, 736], [ZEB[0] - 4, 736]], { w: 3, alpha: 0.2 }); g.marking([[ZEB[1] + 4, 736], [1340, 736], [1340, 1500]], { w: 3, alpha: 0.2 });
    g.building(170, 890, 1140, 560, { height: 1.3, seed: 5 });
    for (const [x, y] of [[230, 800], [1240, 800], [300, 194], [1120, 194], [1720, 194]]) g.tree(x, y, 36);
    // Markings: centre line, bike lane edge, stop lines, the school crossing.
    g.marking([[X0, CL], [560, CL]], { dash: [110, 130] }); g.marking([[560, CL], [ZEB[0] - 12, CL]]); g.marking([[ZEB[1] + 12, CL], [960, CL]]); g.marking([[960, CL], [X1, CL]], { dash: [110, 130] });
    g.marking([[X0, BIKE], [ZEB[0] - 12, BIKE]]); g.marking([[ZEB[1] + 12, BIKE], [SIDE[0] - 8, BIKE]]); g.marking([[SIDE[1] + 8, BIKE], [X1, BIKE]]);
    for (const y of [BIKE, SK]) g.marking([[SIDE[0], y], [SIDE[1], y]], { dash: [22, 18], w: 4, alpha: 0.5 });
    g.marking([[1490, SK + 60], [1490, B]], { dash: [80, 100] });
    g.marking([[STOP_E, CL + 4], [STOP_E, SK - 4]], { w: 8, alpha: 0.7 }); g.marking([[STOP_W, NK + 4], [STOP_W, CL - 4]], { w: 8, alpha: 0.7 });
    g.zebra(ZEB[0], NK + 3, ZEB[1], SK - 3);
    g.tactile(ZEB[0], NK - 34, ZEB[1] - ZEB[0], 30); g.tactile(ZEB[0], SK + 4, ZEB[1] - ZEB[0], 30);
    for (const [x, y, a] of LAMPS) g.lamp(x, y, a);
    g.label(1090, 872, 'School');
  }

  // Signal head on an arm: red only while it tells cars to stop.
  function signal(g, h, stop) {
    const c = g.ctx, px = g.px, [sx, sy] = g.shade(2, 3);
    c.fillStyle = C.post; c.beginPath(); c.arc(h.x, h.y + h.d * 12, 3.5, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); rr(c, h.x - 17 + sx, h.y - 8 + sy, 34, 16, 4); c.fill();
    c.fillStyle = '#121619'; c.beginPath(); rr(c, h.x - 17, h.y - 8, 34, 16, 4); c.fill();
    c.strokeStyle = rgba('lane', 0.2); c.lineWidth = px; c.stroke();
    for (const [on, x, red] of [[stop, h.x - 8, true], [!stop, h.x + 8, false]]) {
      if (on) { const gr = c.createRadialGradient(x, h.y, 0, x, h.y, 26); gr.addColorStop(0, red ? rgba('alert', 0.5) : rgba('lane', 0.3)); gr.addColorStop(1, red ? rgba('alert', 0) : rgba('lane', 0)); c.fillStyle = gr; c.beginPath(); c.arc(x, h.y, 26, 0, TAU); c.fill(); }
      c.fillStyle = on ? (red ? C.alert : C.lane) : '#2A3136'; c.beginPath(); rr(c, x - 4.5, h.y - 4.5, 9, 9, 2.5); c.fill();
    }
  }
  // A rider standing on an e-scooter: a narrow deck and a handlebar, the rider on top.
  function scooter(g, p, phone) {
    const c = g.ctx, [sx, sy] = g.shade(3, 4);
    for (const [dx, dy, col] of [[sx, sy, 'rgba(0,0,0,.45)'], [0, 0, '#9AA4AA']]) { c.save(); c.translate(p.x + dx, p.y + dy); c.rotate(p.a); c.beginPath(); rr(c, -30, -8, 58, 16, 7); c.fillStyle = col; c.fill(); c.restore(); }
    c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.strokeStyle = '#C9CFD3'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(22, -14); c.lineTo(22, 14); c.stroke(); c.restore();
    g.person(off(p, -3, 0), { r: 11, phone });
  }
  // A city-view spot: a place, never a person or a path. Soft, and it fades.
  function spot(g, x, y, k) {
    if (!(k > 0.01)) return;
    const c = g.ctx, px = g.px, gr = c.createRadialGradient(x, y, 0, x, y, 150);
    gr.addColorStop(0, rgba('zone', 0.42 * k)); gr.addColorStop(0.35, rgba('zone', 0.14 * k)); gr.addColorStop(1, rgba('zone', 0));
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, 150, 0, TAU); c.fill();
    diamond(c, x, y, 6.5 * px, k, px);
  }
  function diamond(c, x, y, d, k, px) { c.beginPath(); c.moveTo(x, y - d); c.lineTo(x + d, y); c.lineTo(x, y + d); c.lineTo(x - d, y); c.closePath(); c.fillStyle = rgba('zone', k); c.fill(); c.strokeStyle = rgba('dark', 0.6 * k); c.lineWidth = px; c.stroke(); }
  const spotK = (age) => (age < 0 ? 0 : K.ease.out(age / 0.5) * clamp(1 - (age - 5) / 16));
  // City view: the plan steps back, the spots come forward, and a small key says what they are.
  function cityView(g, s, o) {
    const c = g.ctx, T = s.t; g.screen(); c.fillStyle = 'rgba(10,13,16,.34)'; c.fillRect(0, 0, g.cam.w, g.cam.h); g.world();
    if (o.vz) {
      for (const [x, y, k, b] of EARLY) spot(g, x, y, k * spotK(T - b));
      if (s.hold != null) spot(g, CX, 392, spotK(T - s.hold));
      if (s.warnC != null) spot(g, 1462, 568, spotK(T - s.warnC));
    }
    const b = g.inset('tl', 196, 54);
    g.text(b.x + 14, b.y + 22, 'City view', { size: 13 });
    if (o.vz) diamond(c, b.x + 19, b.y + 37, 5, 1, 1);
    g.text(b.x + (o.vz ? 31 : 14), b.y + 41, o.vz ? 'Anonymous near misses' : 'Nothing reaches it', { weight: 400, alpha: 0.72 });
    g.world();
  }

  function init(o) {
    const rush = o.rushHour === 'On', car = (u, v) => ({ u, v, brake: 0 });
    return {
      go: null, hold: null, kerb: null, warnC: null, warnB: null, passed: null, end: null, over: false, sr: { u: 0 },
      W: Object.assign(car(X1 - 1760, 260), { mode: 'drive', notice: null, brakeAt: null, stopAt: null, skid: null, stopU: 0 }),
      G: Array.from({ length: rush ? 4 : 1 }, (_, i) => car(X1 - 2004 - 250 * i, 260)),
      A: Object.assign(car(U_STOPE, 0), { mode: 'wait', notice: null, brakeAt: null, stopAt: null, resume: null }),
      F: Array.from({ length: rush ? 2 : 0 }, (_, i) => car(U_STOPE - 214 * (i + 1), 0)),
      B: Object.assign(car(U_STOPB, 0), { mode: 'wait', notice: null, brakeAt: null, stopAt: null, stopU: 0 })
    };
  }

  // Follow the road ahead: the speed that still stops before `lim` at a calm deceleration.
  function drive(c, dt, lim, cruise, acc = 120) {
    const v0 = c.v, tgt = Math.min(cruise, Math.sqrt(2 * 150 * Math.max(0, lim - c.u)));
    c.v = Math.max(0, c.v + clamp(tgt - c.v, -900 * dt, acc * dt)); c.u += c.v * dt;
    c.brake = c.v < 2 || v0 - c.v > 40 * dt ? 0.5 : 0;
  }
  function hardStop(c, dt, T) { // brake as hard as it takes to stop at c.stopU
    const rem = c.stopU - c.u;
    if (rem <= 0.5 || c.v < 4) { c.v = 0; c.mode = 'stopped'; c.stopAt = T; } else { c.v = Math.max(0, c.v - ((c.v * c.v) / (2 * rem)) * dt); c.u += c.v * dt; }
    c.brake = 1;
  }

  function update(s, dt, o) {
    const t0 = s.t, T = t0 + dt, { A, B, W } = s, sp = SENIOR.at(s.sr.u);
    s.sr.u = Math.min(SENIOR.total, s.sr.u + (s.sr.u < S_KERB ? 35 : 46) * dt);
    if (s.kerb == null && s.sr.u >= S_KERB) s.kerb = T;
    // The light. Its usual walk time ends at STD. With VZ, her phone tells it she is still crossing, and it holds until she is across.
    if (s.go == null) {
      if (o.vz) {
        if (s.hold == null && s.kerb == null && T >= STD - 0.8 && K.zoneCrossed(t0, T, dist(SIG[0], sp), ZS)) s.hold = T;
        if (s.hold == null ? T >= STD : s.kerb != null && T >= s.kerb + 0.5) s.go = T;
      } else if (T >= STD) s.go = T;
    }
    const red = s.go == null;
    // Westbound: stops at a red light; without VZ, a green light meets her still in the lane.
    const wx = X1 - W.u;
    if (W.mode === 'drive') {
      if (!o.vz && !red && W.notice == null && sp.y > NK - 6 && sp.y < CL + 14 && wx - CH > sp.x && wx - CH - sp.x < 300) W.notice = T;
      if (W.notice != null && W.brakeAt == null && T >= W.notice + 0.35) { W.mode = 'hard'; W.brakeAt = T; W.skid = wx; W.stopU = X1 - (sp.x + 37 + CH); }
      else drive(W, dt, red && W.u <= U_STOPW + 1 ? U_STOPW : Infinity, 260);
    }
    if (W.mode === 'hard') { hardStop(W, dt, T); if (W.stopAt != null) W.skidEnd = X1 - W.u; }
    else if (W.mode === 'stopped' && s.kerb != null && T > s.kerb + 0.6) W.mode = 'drive';
    s.G.forEach((c, i) => drive(c, dt, Math.min((i ? s.G[i - 1] : W).u - 236, red && c.u <= U_STOPW + 1 ? U_STOPW : Infinity), 260));
    // Eastbound: a car turning right across the bike lane, and a rider going straight on.
    const ap = TURN.at(A.u), front = off(ap, CH, 0), bp = BIKE_RT.at(B.u), dA = off(ap, 3.5, -13);
    if (o.vz && !red) {
      const near = A.u > U_TS - 420 && bp.x < TX + 20, d = dist(dA, bp);
      if (near && s.warnC == null && K.zoneCrossed(t0, T, d, ZB)) s.warnC = T; // the rider's zone reaches the driver
      if (near && s.warnB == null && K.zoneCrossed(t0, T, d, ZC)) s.warnB = T; // the driver's zone reaches the rider
    }
    if (s.passed == null && bp.x > TX + 70) s.passed = T;
    const minX = bandMinX(ap), fr = off(ap, CH, 37); // where the car's body meets the rider's line; its front right corner
    if (A.mode === 'wait' && !red && T >= s.go + 0.5) A.mode = 'drive';
    if (A.mode === 'drive') {
      const cruise = A.u < U_TS ? Math.min(300, Math.sqrt(140 * 140 + 240 * (U_TS - A.u))) : A.u < U_TS + 200 ? 140 : 250;
      const held = o.vz && s.warnC != null && T >= s.warnC + 0.45 && s.passed == null;
      if (o.vz && s.warnC != null && s.passed != null && A.resume == null) A.resume = T;
      if (!o.vz && A.notice == null && fr.y >= BIKE && bp.x < fr.x && fr.x - bp.x < 320) A.notice = T;
      if (A.notice != null && A.brakeAt == null && T >= A.notice + 0.25) { A.mode = 'hard'; A.brakeAt = T; A.stopU = A.u + (A.v * A.v) / 720; }
      else drive(A, dt, held ? U_WAIT : Infinity, cruise, 110);
    }
    if (A.mode === 'hard') hardStop(A, dt, T);
    else if (A.mode === 'stopped' && B.stopAt != null && T > Math.max(A.stopAt, B.stopAt) + 1) { A.mode = 'drive'; A.resume = T; }
    if (B.mode === 'wait' && !red && T >= s.go + 0.9) B.mode = 'ride';
    if (B.mode === 'ride') {
      if (!o.vz && B.notice == null && A.u > U_TS + 10 && bp.x < CONF && CONF - bp.x < 330) B.notice = T;
      if (B.notice != null && B.brakeAt == null && T >= B.notice + 0.3) { B.mode = 'hard'; B.brakeAt = T; }
      else drive(B, dt, Infinity, o.vz && s.warnB != null && T >= s.warnB + 0.4 && s.passed == null ? 170 : 210, 90);
    }
    if (B.mode === 'hard') { B.stopU = B.u + Math.min(CONF, minX) - 52 - bp.x; hardStop(B, dt, T); }
    else if (B.mode === 'stopped' && A.resume != null && minX > bp.x + 240) B.mode = 'ride';
    const rear = off(ap, -CH, 0), leadA = rear.y < BIKE - 6 ? rear.x - X0 + CH : Infinity; // the turning car blocks the lane until its rear is out
    s.F.forEach((c, i) => drive(c, dt, Math.min((i ? s.F[i - 1].u : leadA) - 214, red ? U_STOPE : Infinity), 280, 110));
    // End of run: each run stops once its point is made.
    if (s.end == null) {
      const hold = o.cityView === 'On' ? 2.2 : 0;
      if (o.vz && A.resume != null && T > A.resume + 1.4 + hold) s.end = T;
      else if (!o.vz && A.stopAt != null && B.stopAt != null && T > Math.max(A.stopAt, B.stopAt) + 2.4 + hold) s.end = T;
      else if (T > 22) s.end = T;
    }
    s.over = s.end != null && T > s.end + 0.3;
  }

  function draw(g, s, o) {
    const c = g.ctx, T = s.t, { A, B, W } = s, red = s.go == null, sp = SENIOR.at(s.sr.u), P = g.portrait;
    const ap = TURN.at(A.u), bp = BIKE_RT.at(B.u), wp = WEST.at(W.u), dA = off(ap, 3.5, -13);
    const fade = (a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
    // World decals: the city view and skid marks.
    if (W.skid != null && W.skid - (X1 - W.u) > 2) {
      c.strokeStyle = 'rgba(4,6,8,.5)'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
      const xe = W.skidEnd ?? X1 - W.u; for (const dy of [-26, 26]) for (const dx of [-54, 52]) { c.moveTo(W.skid + dx, WL + dy); c.lineTo(xe + dx, WL + dy); }
      c.stroke();
    }
    // Physical world.
    for (const v of s.G) g.vehicle('car', WEST.at(v.u), { brake: v.brake, lights: 1 });
    g.vehicle('car', wp, { brake: W.brake, lights: 1 });
    for (const v of s.F) g.vehicle('car', EAST.at(v.u), { brake: v.brake, lights: 1 });
    g.vehicle('car', ap, { brake: A.brake, lights: 1, phone: o.vz ? null : 'off' });
    scooter(g, bp, o.vz ? null : 'off');
    const rush = o.rushHour === 'On';
    for (const [x0, y, d, v, r] of WALK) if (!r || rush) g.person({ x: x0 + d * v * T, y, a: d > 0 ? 0 : PI }, {});
    for (const [x, y, r] of KIDS) if (!r || rush) g.person({ x, y, a: -PI / 2 }, { r: 8.5 });
    for (const [x, y, rx, ry, w, ph] of YARD) { const q = T * w * 0.5 + ph; g.person({ x: x + rx * Math.sin(q), y: y + ry * Math.sin(2 * q), a: Math.atan2(2 * ry * Math.cos(2 * q), rx * Math.cos(q)) }, { r: 8.5 }); }
    g.person(sp, { r: 11, phone: o.vz ? null : 'off' });
    c.strokeStyle = rgba('lane', 0.85); c.lineWidth = 2 * g.px; c.lineCap = 'round'; c.beginPath(); // her walking stick
    const k0 = off(sp, 4, 13), k1 = off(sp, 19, 16); c.moveTo(k0.x, k0.y); c.lineTo(k1.x, k1.y); c.stroke();
    for (const h of SIG) signal(g, h, red);
    g.atmosphere('Clear', {});
    if (o.cityView === 'On') cityView(g, s, o);
    if (o.vz) {
      // Zones only for the people in the current event: first the senior, then the driver and the rider.
      const e1 = 1 - clamp((T - (s.kerb ?? 1e9) - 0.6) / 0.6), e2 = red ? 0 : clamp((T - s.go - 0.3) / 0.5) * (1 - clamp((T - (A.resume ?? 1e9) - 0.9) / 0.6));
      if (e1 > 0) { g.zone(sp.x, sp.y, Object.assign({}, ZS, { strength: e1 })); g.trail(SENIOR, s.sr.u + 12, Math.min(240, S_KERB + 24 - s.sr.u), { alpha: e1 }); }
      if (e2 > 0) {
        g.zone(dA.x, dA.y, Object.assign({}, ZC, { strength: 0.45 * e2 })); g.zone(bp.x, bp.y, Object.assign({}, ZB, { strength: e2 }));
        const tl = A.mode === 'wait' ? 0 : s.warnC != null && s.passed == null ? Math.max(0, U_WAIT - A.u) : Math.max(110, A.v * 1.8);
        g.trail(TURN, A.u + CH + 6, tl, { gap: 15, alpha: e2 }); g.trail(BIKE_RT, B.u + 32, B.v * 1.5, { alpha: e2 });
      }
      g.device(sp.x, sp.y); g.device(dA.x, dA.y); g.device(bp.x, bp.y);
      if (s.hold != null) for (const h of SIG) { g.catchFx(h.x, h.y, T - s.hold); g.flash({ x: h.x, y: h.y, a: PI / 2 }, T - s.hold, { l: 34, w: 16 }); }
      if (s.warnC != null) { g.catchFx(dA.x, dA.y, T - s.warnC); g.flash(ap, T - s.warnC, { l: 176, w: 74 }); }
      if (s.warnB != null) { g.catchFx(bp.x, bp.y, T - s.warnB); g.flash(bp, T - s.warnB, { l: 60, w: 30 }); }
      g.label(sp.x, sp.y, 'More time to cross: Vision', { status: 'vision', k: fade(s.hold, (s.kerb ?? 1e9) + 0.8), align: 'right', dx: -22 });
      g.chip(ap.x, ap.y, 'Scooter on the right', { k: fade(s.warnC, A.resume != null ? A.resume + 0.6 : null), side: P ? 'left' : 'up', gap: 50 });
    } else {
      if (W.brakeAt != null) { g.flash(wp, T - W.brakeAt, { l: 176, w: 74, tone: 'alert' }); g.chip(wp.x, wp.y, 'Hard stop', { tone: 'alert', k: fade(W.brakeAt, W.stopAt != null ? W.stopAt + 1.8 : null), side: P ? 'left' : 'up', gap: 50 }); }
      if (A.brakeAt != null) g.flash(ap, T - A.brakeAt, { l: 176, w: 74, tone: 'alert' });
      if (B.brakeAt != null) { g.flash(bp, T - B.brakeAt, { l: 60, w: 30, tone: 'alert' }); g.chip(bp.x, bp.y, 'Hard stop', { tone: 'alert', k: fade(B.brakeAt, B.stopAt != null ? B.stopAt + 1.8 : null), side: P ? 'right' : 'down', gap: 22 }); }
    }
  }

  // The scene opens on what works today: the first run starts as the light turns green, at the turning car and the
  // rider. Every later run plays the whole block, the Vision light included.
  let first = true, skipped = false;
  const OPEN = ['The light is green. A car is about to turn right across the bike lane, and a scooter rider is coming up beside it.', L.with[3], L.with[4]];
  K.mount({
    el: '#sim',
    label: 'Top-down plan of a school block with a crossing, a traffic light and a bike lane. The illustration shows, with VZ, a light that will give a slow senior more time to cross (Vision), a turning driver warned on a screen in the car (Today); the rider will be warned on her phone (Vision), and a city view of anonymous spots where near misses happen, fading over time (Vision). Without VZ, the light changes while she is still crossing and both conflicts end in hard braking. The caption below describes each moment.',
    statuses: STATUS,
    focus: { x: 200, y: 40, w: 1640, h: 860 },
    portraitFocus: { x: 410, y: 90, w: 1230, h: 760 },
    compare: false, // the scene stays With VZ; Without VZ is the toggle
    options: { rushHour: 'Off', cityView: 'Off' },
    choices: [{ name: 'rushHour', label: 'Rush hour', values: ['On', 'Off'] }, { name: 'cityView', label: 'City view', values: ['On', 'Off'], live: true }],
    start: (o) => { skipped = o.vz && first; first = false; return skipped ? 6.4 : o.compare && !o.vz ? 0.6 : 0; },
    still: (vz) => (vz ? 9.6 : 3.6),
    lines(o) {
      const city = o.cityView === 'On';
      if (o.vz && skipped) return OPEN.concat(city ? [L.cityWith] : []);
      if (o.vz) return o.compare ? [L.with[0], L.with[1], L.with[3], L.with[4]].concat(city ? [L.cityWith] : []) : L.with.concat(city ? [L.cityWith] : []);
      return (o.compare ? [L.again].concat(L.without.slice(1)) : L.without).concat(city ? [L.cityWithout] : []);
    },
    beat(s, o) {
      const { A, B, W } = s;
      if (o.vz) {
        const b = A.resume != null && s.t > A.resume + (o.cityView === 'On' ? 0.9 : 0) ? (o.cityView === 'On' ? 5 : 4) : s.warnC != null ? 3 : s.go != null && s.t > s.go + 0.4 ? 2 : s.hold != null ? 1 : 0;
        if (skipped) return Math.max(0, b - 2);
        return o.compare ? (b >= 2 ? b - 1 : b) : b;
      }
      const b = B.brakeAt != null ? 3 : A.u > U_TS - 300 ? 2 : W.brakeAt != null ? 1 : 0;
      return b === 3 && o.cityView === 'On' && s.t > Math.max(A.stopAt ?? 1e9, B.stopAt ?? 1e9) + 1 ? 4 : b;
    },
    debug: (s) => ({ go: s.go, hold: s.hold, kerb: s.kerb, warnC: s.warnC, warnB: s.warnB, passed: s.passed, aMode: s.A.mode, aResume: s.A.resume, aStop: s.A.stopAt, bStop: s.B.stopAt, wBrake: s.W.brakeAt, wStop: s.W.stopAt, wFront: X1 - s.W.u - CH, gapB: Math.round(bandMinX(TURN.at(s.A.u)) - BIKE_RT.at(s.B.u).x - 30), gapW: Math.round(X1 - s.W.u - CH - SENIOR.at(s.sr.u).x - 11), end: s.end }),
    ground, init, update, draw
  });
})();
