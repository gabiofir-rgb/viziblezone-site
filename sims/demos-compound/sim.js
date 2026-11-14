/* Closed compounds: six short moments on one ground, a quiet corner of an apron and a service road (plan 3.6), as
   one simkit demo pack. The option demo picks the moment. Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp } = K, { PI, max, min, sqrt, cos, sin } = Math;
  const IDS = ['pit', 'rules', 'coming', 'told', 'moving', 'record'];
  // The ground: the apron (y < 590), the service road (600..800, its centre line at 700), grass below. Each moment
  // frames its own part of it (FOCUS, aspect ~1.7, so a wide plate and a square phone plate both hold the action).
  const FOCUS = { pit: [200, 420, 1100, 640], rules: [270, 60, 1100, 620], coming: [300, 220, 1000, 620], told: [700, 110, 1050, 560], moving: [180, -80, 1450, 980], record: [0, 330, 1300, 700] };
  const fade = (T, a, z) => (a == null ? 0 : clamp((T - a) / 0.22) * (z == null ? 1 : 1 - clamp((T - z) / 0.3)));
  const lit = (T, a) => (a == null ? 0 : clamp((T - a) / 0.25));
  // A moving vehicle's bubble reaches ahead along its travel (h: the direction of travel, its back when reversing).
  const vb = (x, y, a, hl, hw, v, h = a) => { const e = v * 1.2; return { x: x + cos(h) * e / 2, y: y + sin(h) * e / 2, a, rx: hl + 120 + e / 2, ry: hw + 110, n: 2.6 }; };
  const pb = (x, y) => ({ x, y, a: 0, rx: 160, ry: 160 });
  const touch = (p, q) => K.bubbleGap(p, q) <= 0;
  // Speed towards a target with bounded acceleration, never past a stop `rem` ahead (dec sets how hard it brakes).
  function mv(u, dt, target, rem, dec = 140, acc = 150) {
    if (rem != null) target = min(target, sqrt(2 * dec * max(0, rem)));
    u.v = max(0, u.v + clamp(target - u.v, -dec * 1.7 * dt, acc * dt)); u.p += u.v * dt;
    if (u.stopAt == null && u.brakeAt != null && u.v < 1) u.stopAt = u.t;
  }
  const brake = (u, T, hard) => { if (u.brakeAt == null) { u.brakeAt = T; u.hard = hard; u.skid = u.p; } };
  function skid(c, x0, y0, x1, y1, hw) { // tyre streaks of a hard stop, along the travel from (x0, y0)
    const L = Math.hypot(x1 - x0, y1 - y0); if (L < 4) return;
    const nx = -(y1 - y0) / L * (hw - 10), ny = (x1 - x0) / L * (hw - 10), gr = c.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(4,6,8,0)'); gr.addColorStop(0.35, 'rgba(4,6,8,.5)'); gr.addColorStop(1, 'rgba(4,6,8,.6)');
    c.strokeStyle = gr; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
    for (const k of [-1, 1]) { c.moveTo(x0 + nx * k, y0 + ny * k); c.lineTo(x1 + nx * k, y1 + ny * k); } c.stroke();
  }
  const V = (p, v, o) => Object.assign({ p, v, t: 0, brakeAt: null, stopAt: null, caught: null, skid: null, hard: false }, o);
  // The VZ marks of an actor: its device, and when warned a catch and a flash.
  function mark(g, T, pose, at, l, w) { g.device(pose.x, pose.y); if (at != null) { g.catchFx(pose.x, pose.y, T - at); g.flash(pose, T - at, { l, w }); } }
  function red(g, T, pose, at, l, w, x, y, side) {
    if (at == null) return; g.flash(pose, T - at, { l, w, tone: 'alert' });
    g.chip(x, y, 'Hard stop', { tone: 'alert', k: fade(T, at, at + 2.6), side, gap: 30 });
  }
  const tug = (g, p, o, brakeK) => g.vehicle('tug', p, { brake: brakeK, lights: 1, phone: o.vz ? null : 'off' });
  const walker = (g, p, o, alpha = 1) => g.person(p, { r: 13, alpha, phone: o.vz ? null : 'off' });

  /* ------------------------------------------------------------------ the ground */
  function base(g) {
    g.pavement([[-900, -700], [2700, -700], [2700, 590], [-900, 590]], { grid: 200 });
    g.pavement([[-900, 590], [2700, 590], [2700, 806], [-900, 806]], { fill: '#22282C', grid: 0 });
    g.pavement([[-900, 806], [2700, 806], [2700, 1800], [-900, 1800]], { fill: '#20272B', grid: 0 });
    g.kerb([[-900, 806], [2700, 806]]);
    g.marking([[-900, 598], [2700, 598]], { w: 5, alpha: 0.6 }); g.marking([[-900, 700], [2700, 700]], { dash: [50, 50], w: 4, alpha: 0.5 });
    g.marking([[-900, -60], [2700, -60]], { dash: [80, 60], w: 5, alpha: 0.35 }); // the apron's taxi lane
    g.building(-760, 930, 860, 560, { height: 1.2, seed: 5 }); g.building(1560, 950, 1000, 520, { height: 1.1, seed: 9 });
  }

  /* 1. pit (Today): an open pit in the service road, tagged; a van steers clear ----------------------------- */
  const PIT = { x: 1000, y: 752 }, PITB = { x: 1000, y: 752, a: 0, rx: 160, ry: 92, n: 3 };
  const PYL = [[905, 712], [1000, 706], [1095, 712], [905, 792], [1095, 792]];
  const pit = {
    status: 'today', still: [3.4, 4.5],
    label: 'Plan of a service road with an open pit, tagged and with its own bubble. With VZ the van driver is warned on reaching it and steers clear. Without VZ the driver stops hard.',
    lines: { with: ['A van drives along a service road. There is an open pit ahead.', 'The pit is marked with a small tag and has its own bubble.', 'The driver is warned on reaching it, and steers clear.'],
      without: ['A van drives towards an open pit.', 'The driver sees it late and stops hard.'] },
    ground(g) {
      const c = g.ctx; c.fillStyle = '#0E1215'; c.fillRect(930, 722, 140, 62); c.fillStyle = 'rgba(233,236,238,.05)'; c.fillRect(930, 722, 140, 8);
      for (const [x, y] of PYL) g.pylon(x, y);
    },
    init: () => ({ u: V(-100, 200), off: 0, dy: 0 }),
    update(s, T, dt, o) {
      const u = s.u, front = u.p + 125;
      if (o.vz) {
        if (u.caught == null && touch(vb(u.p, PIT.y - s.off, 0, 125, 46, u.v), PITB)) u.caught = T;
        const go = u.caught != null && T > u.caught + 0.45, tgt = go && u.p < PIT.x + 210 ? 100 : 0, was = s.off;
        s.off += clamp(tgt - s.off, -70 * dt, 70 * dt); s.dy = (s.off - was) / dt;
        mv(u, dt, go ? 150 : 200);
      } else {
        if (front >= 790) brake(u, T, true);
        mv(u, dt, 200, u.brakeAt != null ? 925 - front : null, 240);
      }
      u.t = T; if (u.p > 1120 || (u.stopAt != null && T > u.stopAt + 1.4) || T > 8) s.end = s.end ?? T;
    },
    draw(g, s, o, T) {
      const u = s.u, a = Math.atan2(-s.dy, max(40, u.v)), pose = { x: u.p, y: PIT.y - s.off, a };
      if (u.skid != null) skid(g.ctx, u.skid + 60, PIT.y, u.p + 100, PIT.y, 46);
      g.vehicle('van', pose, { brake: u.brakeAt != null ? 1 : u.caught != null && T < u.caught + 1.5 ? 0.5 : 0, lights: 1, phone: o.vz ? null : 'off' });
      if (o.vz) {
        const B = vb(u.p, pose.y, a, 125, 46, u.v), k = lit(T, u.caught);
        g.bubble(PITB, { strength: 0.7, alert: k }); g.bubble(B, { alert: k }); g.overlap(B, PITB, k);
        g.trail(K.route([[u.p, pose.y], [u.p + 2000, pose.y]]), 131, u.v * 1.5, { gap: 15 });
        g.tag(1000, 706); mark(g, T, pose, u.caught, 250, 92);
        g.chip(pose.x, pose.y, 'Danger area', { k: fade(T, u.caught, u.caught + 3.4), side: 'up', gap: 54 });
      } else red(g, T, pose, u.brakeAt, 250, 92, pose.x, pose.y, 'up');
    },
    beat: (s, o) => (o.vz ? (s.u.caught != null ? 2 : s.t > 1.9 ? 1 : 0) : s.u.brakeAt != null ? 1 : 0)
  };

  /* 2. rules (In development): who may enter the fuelling area ------------------------------------------- */
  const AREA = { x: 760, y: 320, a: 0, rx: 250, ry: 190, n: 3.4 }, TAGS = [[560, 180], [960, 180], [560, 460], [960, 460]];
  const rules = {
    status: 'dev', still: [4.6, 4.6],
    label: 'Plan of a fuelling area with its own bubble. In development: a fuel truck will pass quietly and a baggage tug driver will be warned at its edge. Without VZ both drive in.',
    lines: { with: ['A fuel truck and a baggage tug both head for the fuelling area.', 'In development: the site will decide who may enter each area.', 'In development: the fuel truck will pass quietly. The tug driver will be warned.'],
      without: ['Two vehicles head for the fuelling area.', 'Both drive in. Nothing tells them apart.'] },
    ground(g) {
      g.marking([[560, 180], [960, 180], [960, 460], [560, 460], [560, 180]], { dash: [26, 20], w: 5, alpha: 0.45 });
      g.marking([[700, 300], [820, 300]], { w: 4, alpha: 0.3 }); g.marking([[700, 340], [820, 340]], { w: 4, alpha: 0.3 });
      for (const [x, y] of TAGS) g.pylon(x, y);
    },
    init: (o) => ({ f: V(-120, 170), u: V(o.vz ? 0 : 160, 150) }),
    update(s, T, dt, o) {
      const f = s.f, u = s.u, ux = 1720 - u.p;
      mv(f, dt, 170, 760 - f.p, 90); f.t = T;
      if (o.vz && u.caught == null && touch(vb(ux, 420, PI, 60, 36, u.v), AREA)) u.caught = T;
      const stop = o.vz ? (u.caught != null ? 1060 : null) : 880;
      if (stop != null && u.brakeAt == null && (!o.vz || T > u.caught + 0.45)) brake(u, T, false);
      mv(u, dt, 150, u.brakeAt != null ? ux - stop : null, 110); u.t = T;
      if (u.stopAt != null && f.v < 1 && T > u.stopAt + (o.vz ? 2 : 1.2)) s.end = s.end ?? T;
    },
    draw(g, s, o, T) {
      const f = s.f, u = s.u, fp = { x: f.p, y: 290, a: 0 }, up = { x: 1720 - u.p, y: 420, a: PI };
      g.vehicle('truck', fp, { l: 380, w: 96, lights: 1, brake: f.v < 60 ? 0.5 : 0, phone: o.vz ? null : 'off' });
      g.vehicle('cart', { x: up.x + 134, y: 420, a: PI }); tug(g, up, o, u.brakeAt != null && u.v > 1 ? 0.5 : 0);
      g.label(760, 180, 'Fuelling area', { dy: -26 });
      if (!o.vz) return;
      const k = lit(T, u.caught), UB = vb(up.x, 420, PI, 60, 36, u.v);
      g.bubble(AREA, { strength: 0.72, alert: k }); g.bubble(vb(f.p, 290, 0, 190, 48, f.v)); g.bubble(UB, { alert: k }); g.overlap(UB, AREA, k);
      for (const [x, y] of TAGS) g.tag(x, y);
      g.device(fp.x, fp.y); mark(g, T, up, u.caught, 120, 72);
      g.chip(up.x, up.y, 'Not your area', { k: fade(T, u.caught), side: 'down', gap: 44 });
    },
    beat: (s, o) => (o.vz ? (s.u.caught != null && s.t > s.u.caught + 0.3 ? 2 : s.t > 1.9 ? 1 : 0) : 1720 - s.u.p < 1000 ? 1 : 0)
  };

  /* 3. coming (In development): two paths about to meet behind a stack of carts ----------------------------- */
  const CARTS = { x: 815, y: 465, a: 0, l: 250, w: 190 }, MEET = { x: 1000, y: 650 }, H = 3.4; // H: how far ahead the paths are seen
  const coming = {
    status: 'dev', still: [3.4, 4.9],
    label: 'Plan of an apron corner. A tug and a worker, hidden by carts, head for the same spot. In development: the driver will be warned before the bubbles touch. Without VZ the driver stops hard.',
    lines: { with: ['A tug and a worker are heading for the same spot, hidden from each other.', 'In development: it will see that their paths are about to meet.', 'In development: the driver will be warned before the bubbles touch, with more time to slow.'],
      without: ['A tug and a worker head for the same spot.', 'They meet at the corner. The driver stops hard.'] },
    ground(g) { for (const y of [400, 470, 540]) for (const x of [720, 830]) g.vehicle('cart', { x, y, a: 0 }); },
    init: (o) => ({ u: V(o.vz ? -120 : -20, 190), w: V(280, 75), vis: 0, seenFor: 0, seen: null }),
    update(s, T, dt, o) {
      const u = s.u, w = s.w, eye = { x: u.p + 50, y: 650 }, hid = K.occluded(eye, { x: MEET.x, y: w.p }, [CARTS]);
      s.vis = clamp(s.vis + (hid ? -dt : dt) / 0.2);
      s.seenFor = hid ? 0 : s.seenFor + dt; if (s.seen == null && s.seenFor > 0.1 && w.p < 760) s.seen = T;
      if (o.vz && u.caught == null && u.p + 60 + u.v * H >= MEET.x - 40 && w.p + w.v * H >= MEET.y - 40) { u.caught = T; s.gap = K.bubbleGap(vb(u.p, 650, 0, 60, 36, u.v), pb(MEET.x, w.p)); }
      if (u.brakeAt == null && (o.vz ? u.caught != null && T > u.caught + 0.4 : s.seen != null && T > s.seen + 0.35)) brake(u, T, !o.vz);
      mv(u, dt, 190, u.brakeAt != null ? (o.vz ? 625 : 945) - (u.p + 60) : null, o.vz ? 110 : 250); u.t = T;
      mv(w, dt, !o.vz && u.brakeAt != null && w.p < 760 && u.v > 1 ? 0 : 75, null, 400);
      if (w.p > 840 && u.stopAt != null && T > u.stopAt + 1) s.end = s.end ?? T;
      if (!o.vz && u.stopAt != null && T > u.stopAt + 1.2) s.end = s.end ?? T;
    },
    draw(g, s, o, T) {
      const u = s.u, w = s.w, up = { x: u.p, y: 650, a: 0 }, wp = { x: MEET.x, y: w.p, a: PI / 2 };
      if (u.skid != null) skid(g.ctx, u.skid, 650, u.p, 650, 36);
      tug(g, up, o, u.brakeAt != null && u.v > 1 ? (u.hard ? 1 : 0.5) : 0); walker(g, wp, o, s.vis);
      if (o.vz) {
        const k = lit(T, u.caught), UB = vb(u.p, 650, 0, 60, 36, u.v), WB = pb(wp.x, wp.y);
        g.bubble(UB, { alert: k }); g.bubble(WB);
        if (s.vis < 1) g.person(wp, { r: 13, ghost: true, alpha: 1 - s.vis });
        g.trail(K.route([[u.p, 650], [3000, 650]]), 66, u.brakeAt != null ? max(0, 625 - u.p - 60) : u.v * H, { gap: 15 });
        g.trail(K.route([[MEET.x, w.p], [MEET.x, 3000]]), 14, w.v * H);
        mark(g, T, up, u.caught, 120, 72); g.device(wp.x, wp.y);
        g.chip(up.x, up.y, 'Worker ahead', { k: fade(T, u.caught, u.stopAt != null ? u.stopAt + 2 : null), side: 'down', gap: 44 });
      } else red(g, T, up, u.brakeAt, 120, 72, up.x, up.y, 'down');
    },
    beat: (s, o) => (o.vz ? (s.u.brakeAt != null && s.t > s.u.caught + 1 ? 2 : s.u.caught != null ? 1 : 0) : s.u.brakeAt != null ? 1 : 0)
  };

  /* 4. told (Vision): a worker with a headset, his back to a reversing tug ------------------------------------- */
  const LY = 380;
  const told = {
    status: 'vision', still: [3.4, 4.6],
    label: 'Plan of an apron. A worker in a headset walks with his back to a reversing tug. Today the driver is warned. Vision: the worker will be warned too, on his own phone.',
    lines: { with: ['A worker walks with his back to a reversing tug.', 'Today the tug driver is warned.', 'Vision: the worker on foot will be warned too, on his own phone.'],
      without: ['A worker walks with his back to a reversing tug.', 'Neither knows about the other.'] },
    // Both move west: the tug reverses (its front faces east), the worker walks ahead of it. x = start - p.
    init: (o) => ({ u: V(0, 140, { x0: o.vz ? 1840 : 1700 }), w: V(0, 40, { x0: 1130 }), turnAt: null }),
    update(s, T, dt, o) {
      const u = s.u, w = s.w, ux = u.x0 - u.p, wx = w.x0 - w.p, gap = ux - 60 - (wx + 13);
      if (o.vz && u.caught == null && touch(vb(ux, LY, 0, 60, 36, u.v, PI), pb(wx, LY))) u.caught = w.caught = T;
      if (u.brakeAt == null && (o.vz ? u.caught != null && T > u.caught + 0.45 : gap < 125)) brake(u, T, !o.vz);
      if (s.turnAt == null && (o.vz ? u.caught != null && T > u.caught + 0.35 : u.brakeAt != null)) s.turnAt = T;
      mv(u, dt, 140, u.brakeAt != null ? gap - (o.vz ? 120 : 45) : null, o.vz ? 110 : 260); u.t = T;
      mv(w, dt, s.turnAt != null ? 0 : 40, null, 200);
      if (u.stopAt != null && T > u.stopAt + (o.vz ? 2.4 : 1.5)) s.end = s.end ?? T;
    },
    draw(g, s, o, T) {
      const u = s.u, w = s.w, up = { x: u.x0 - u.p, y: LY, a: 0 }, wp = { x: w.x0 - w.p, y: LY, a: PI + PI * K.ease.smooth(clamp((T - (s.turnAt ?? 1e9)) / 0.6)) };
      if (u.skid != null) skid(g.ctx, u.x0 - u.skid - 40, LY, up.x - 40, LY, 36);
      tug(g, up, o, u.brakeAt != null && u.v > 1 ? (u.hard ? 1 : 0.5) : 0); walker(g, wp, o);
      const c = g.ctx; c.fillStyle = '#2E353A'; // the headset: a pad over each ear
      for (const k of [-1, 1]) { c.save(); c.translate(wp.x - sin(wp.a) * 14 * k, wp.y + cos(wp.a) * 14 * k); c.rotate(wp.a); c.fillRect(-4, -2.5, 8, 5); c.restore(); }
      if (o.vz) {
        const k = lit(T, u.caught), UB = vb(up.x, LY, 0, 60, 36, u.v, PI), WB = pb(wp.x, LY);
        g.bubble(UB, { alert: k }); g.bubble(WB, { alert: k }); g.overlap(UB, WB, k);
        mark(g, T, up, u.caught, 120, 72); mark(g, T, wp, w.caught, 26, 26);
        const z = u.stopAt != null ? u.stopAt + 2 : null;
        g.chip(up.x, up.y, 'Worker behind', { k: fade(T, u.caught, z), side: 'up', gap: 40 });
        g.chip(wp.x, wp.y, 'Vehicle behind you', { k: fade(T, w.caught, z), side: 'down', gap: 30 });
      } else red(g, T, up, u.brakeAt, 120, 72, up.x, up.y, 'up');
    },
    beat: (s, o) => (o.vz ? (s.u.caught != null && s.t > s.u.caught + 0.4 ? 2 : s.u.caught != null ? 1 : 0) : s.t > 1.9 ? 1 : 0)
  };

  /* 5. moving (Vision): an aircraft under tow, then an engine starting at its stand ------------------------ */
  const AL = 560, AY = 290, STAND = 700, AX0 = 1620, VX = 900, WK = { x: 450, y: 520, a: -PI / 4 };
  const ENG = { x: 590, y: 410, a: 0, rx: 200, ry: 140, n: 2 }; // the south engine at start-up, reaching ahead of its intake
  const moving = {
    status: 'vision', still: [6.2, 4],
    label: 'Plan of an apron. Vision: the bubble will move with an aircraft under tow, so a waiting van is warned, and a bubble will appear around an engine at start-up for the worker near it.',
    lines: { with: ['An aircraft is towed to its stand. A van waits to cross behind it.', 'Vision: the bubble will move with the aircraft.', 'Vision: a bubble will appear around an engine at start-up, and the people near it will be warned.'],
      without: ['An aircraft is towed to its stand.', 'Nothing marks where it is safe to cross.'] },
    init: () => ({ a: V(0, 220), van: V(0, 0), u: V(0, 0), eng: null }),
    update(s, T, dt, o) {
      const a = s.a, van = s.van, ax = AX0 - a.p;
      if (a.brakeAt == null && ax - STAND < 300) a.brakeAt = T;
      mv(a, dt, 220, ax - STAND, 120); a.t = T;
      const AB = { x: AX0 - a.p, y: AY, a: 0, rx: AL / 2 + 60, ry: 0.47 * AL + 50, n: 2.2 };
      if (o.vz) {
        if (van.caught == null && touch(AB, vb(VX, 735, -PI / 2, 125, 46, 0))) van.caught = T;
        if (s.eng == null && a.stopAt != null && T > a.stopAt + 0.4) s.eng = T;
        if (s.eng != null && T > s.eng + 2) s.end = s.end ?? T;
      } else {
        if (van.v === 0 && van.brakeAt == null && ax < 990) van.v = 1;
        if (van.v > 0 && 610 - van.p < 592) brake(van, T, true);
        if (van.v > 0) mv(van, dt, 140, van.brakeAt != null ? 0 : null, 260); van.t = T;
        if (van.stopAt != null && T > van.stopAt + 2.2) s.end = s.end ?? T;
      }
    },
    draw(g, s, o, T) {
      const a = s.a, van = s.van, ax = AX0 - a.p, vp = { x: VX, y: 735 - van.p, a: -PI / 2 };
      if (van.skid != null) skid(g.ctx, VX, 735 - van.skid - 100, VX, vp.y - 110, 46);
      g.vehicle('van', vp, { brake: van.brakeAt != null ? 1 : 0, lights: 1, phone: o.vz ? null : 'off' });
      walker(g, WK, o);
      g.aircraft({ x: ax, y: AY, a: PI }, { l: AL }); g.vehicle('tug', { x: ax - AL / 2 - 64, y: AY, a: PI }, { lights: 1, phone: o.vz ? null : 'off' });
      if (o.vz) {
        const AB = { x: ax, y: AY, a: 0, rx: AL / 2 + 60, ry: 0.47 * AL + 50, n: 2.2 }, VB = vb(VX, 735, -PI / 2, 125, 46, 0), WB = pb(WK.x, WK.y);
        const kv = lit(T, s.van.caught) * (a.stopAt == null ? 1 : 1 - clamp((T - a.stopAt) / 0.6)), ke = lit(T, s.eng);
        g.bubble(AB, { strength: 0.72, alert: kv }); if (s.eng != null) g.bubble(ENG, { strength: ke, alert: ke });
        g.bubble(VB, { alert: kv }); g.bubble(WB, { alert: ke }); g.overlap(AB, VB, kv); if (s.eng != null) g.overlap(ENG, WB, ke);
        if (a.stopAt == null) g.trail(K.route([[ax - AL / 2 - 124, AY], [-2000, AY]]), 0, max(0, ax - STAND), { gap: 15 });
        for (const [dx, dy] of [[-0.42, 0], [0.47, 0], [-0.17, -0.47], [-0.17, 0.47]]) g.tag(ax - dx * AL, AY + dy * AL);
        g.device(ax - AL / 2 - 64, AY); mark(g, T, vp, van.caught, 250, 92); mark(g, T, WK, s.eng, 26, 26);
        g.chip(vp.x, vp.y, 'Aircraft moving', { k: fade(T, van.caught, a.stopAt), side: 'right', gap: 40 });
        g.chip(WK.x, WK.y, 'Engine starting', { k: fade(T, s.eng), side: 'down', gap: 30 });
      } else red(g, T, vp, van.brakeAt, 250, 92, vp.x, vp.y, 'right');
    },
    beat: (s, o) => (o.vz ? (s.eng != null ? 2 : s.van.caught != null ? 1 : 0) : s.t > 1.9 ? 1 : 0)
  };

  /* 6. record (Vision): two close calls, each kept on the driver's own phone ------------------------------- */
  const WA = { x: 640, y0: 470, dir: 1, go: 0 }, WB2 = { x: 1180, y0: 900, dir: -1, go: 2.4 };
  const record = {
    status: 'vision', still: [6.2, 4.4],
    label: 'Plan of a service road. Vision: each of a tug driver\'s two close calls will be kept as a private record on the driver\'s own phone, shown as marks in a corner view.',
    lines: { with: ['A tug driver has two close calls during a shift.', 'Vision: each one will be kept as a private record.', 'Vision: it will stay on the driver\'s own phone.'],
      without: ['A tug driver has two close calls.', 'Nothing is kept. Nobody learns from them.'] },
    init: () => ({ u: V(0, 210), ws: [V(0, 85), V(0, 85)], ev: [], hold: null }),
    update(s, T, dt, o) {
      const u = s.u, x = -250 + u.p;
      [WA, WB2].forEach((W, i) => {
        const w = s.ws[i]; if (T > W.go) mv(w, dt, 85, null, 200);
        const wy = W.y0 + W.dir * w.p;
        if (!s.ev[i] && touch(vb(x, 650, 0, 60, 36, u.v), pb(W.x, wy))) s.ev[i] = { t: T, x: (x + W.x) / 2, y: (650 + wy) / 2 };
      });
      const e = s.ev.filter(Boolean).pop(), slow = e && T > e.t + (o.vz ? 0.45 : 0.8) && T < e.t + 1.9;
      mv(u, dt, slow ? (o.vz ? 60 : 0) : 210, null, o.vz ? 150 : 280); u.t = T;
      if (s.ev[1] && T > s.ev[1].t + (o.vz ? 2.4 : 1)) s.end = s.end ?? T;
    },
    draw(g, s, o, T) {
      const u = s.u, up = { x: -250 + u.p, y: 650, a: 0 }, wps = [WA, WB2].map((W, i) => ({ x: W.x, y: W.y0 + W.dir * s.ws[i].p, a: W.dir * PI / 2 }));
      tug(g, up, o, s.ev.some((e) => e && T > e.t + (o.vz ? 0.45 : 0.8) && T < e.t + 1.9) ? (o.vz ? 0.5 : 1) : 0); wps.forEach((p) => walker(g, p, o));
      const on = (e) => e && T > e.t && T < e.t + 2.2;
      if (o.vz) {
        const UB = vb(up.x, 650, 0, 60, 36, u.v), k = max(...s.ev.map((e) => (on(e) ? lit(T, e.t) : 0)), 0);
        g.bubble(UB, { alert: k });
        wps.forEach((p, i) => { const kk = on(s.ev[i]) ? lit(T, s.ev[i].t) : 0, WB = pb(p.x, p.y); g.bubble(WB, { alert: kk }); g.overlap(UB, WB, kk); });
        mark(g, T, up, null); wps.forEach((p) => g.device(p.x, p.y));
        const c = g.ctx, kept = [];
        s.ev.forEach((e, i) => {
          if (!e) return; g.catchFx(up.x, up.y, T - e.t); g.flash(up, T - e.t, { l: 120, w: 72 });
          const q = K.ease.out(clamp((T - e.t - 0.3) / 0.7)), mx = K.lerp(e.x, up.x, q), my = K.lerp(e.y, up.y, q);
          if (q < 1 && T > e.t + 0.3) { c.save(); c.translate(mx, my); c.rotate(PI / 4); c.fillStyle = K.C.zone; c.fillRect(-4 * g.px, -4 * g.px, 8 * g.px, 8 * g.px); c.restore(); }
          if (q >= 1) kept.push(i);
          g.chip(up.x, up.y, 'Worker ahead', { k: fade(T, e.t, e.t + 1.9), side: 'up', gap: 34 });
        });
        const box = g.inset('tr', 196, 62); g.text(box.x + 14, box.y + 24, 'The driver’s own record', { size: 12 });
        kept.forEach((i) => { c.save(); c.translate(box.x + 22 + i * 22, box.y + 42); c.rotate(PI / 4); c.fillStyle = K.C.zone; c.fillRect(-4.5, -4.5, 9, 9); c.restore(); });
        g.world();
      } else s.ev.forEach((e) => e && red(g, T, up, e.t + 0.8, 120, 72, up.x, up.y, 'up'));
    },
    beat: (s, o) => (o.vz ? (s.ev[0] && s.t > s.ev[0].t + 1 ? (s.ev[1] ? 2 : 1) : 0) : s.ev[0] ? 1 : 0)
  };

  /* ------------------------------------------------------------------ the pack */
  const DEMOS = { pit, rules, coming, told, moving, record };
  const Q = typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search) : null;
  const pickId = (v) => IDS.find((x) => x === String(v).toLowerCase());
  let cur = (Q && pickId(Q.get('demo'))) || IDS[0];
  for (const id of IDS) { const [x, y, w, h] = FOCUS[id]; DEMOS[id].focus = DEMOS[id].portraitFocus = { x, y, w, h }; }
  // focus(o) for a kit that frames by option; x, y, w and h (the current moment) for one that reads an object.
  const framed = (o) => DEMOS[(o && o.demo) || cur].focus;
  for (const k of 'xywh') Object.defineProperty(framed, k, { get: () => DEMOS[cur].focus[k] });
  K.mount({
    el: '#sim',
    label: Object.assign((o) => DEMOS[o.demo].label, { toString: () => DEMOS[cur].label }), // each moment's own; text for an older kit
    focus: framed, portraitFocus: framed,
    compare: false,
    options: { demo: cur },
    choices: [{ name: 'demo', label: 'Feature', values: IDS }], // shown on the pack's own page; micro hides it
    still: (vz, o) => DEMOS[(o && o.demo) || cur].still[vz ? 0 : 1],
    lines: (o) => DEMOS[o.demo].lines[o.vz ? 'with' : 'without'],
    beat: (s, o) => DEMOS[o.demo].beat(s, o),
    ground(g, o) { base(g); if (DEMOS[o.demo].ground) DEMOS[o.demo].ground(g); },
    init(o) { cur = o.demo; return Object.assign({ end: null, over: false }, DEMOS[cur].init(o)); },
    update(s, dt, o) { const T = s.t + dt; DEMOS[o.demo].update(s, T, dt, o); s.over = s.end != null && T > s.end + 0.3; },
    draw: (g, s, o) => DEMOS[o.demo].draw(g, s, o, s.t),
    debug: (s) => ({ end: s.end, over: s.over, uc: s.u && s.u.caught, ub: s.u && s.u.brakeAt, us: s.u && s.u.stopAt })
  });
})();
