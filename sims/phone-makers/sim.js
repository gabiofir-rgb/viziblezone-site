/* Phone makers (SPEC S5) on simkit: four moments from the person's own point of view; the alert reaches the person.
   Logic and captions ported from the Codex prototype. Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, ease, lerp, rgba, C } = K, { sin, cos, atan2, max, min, sqrt, pow, PI } = Math, TAU = 2 * PI, rt = K.route;
  const NAMES = ['Ski slope', 'Crossing', 'Escalator']; // the scene opens on what works today
  // SPEC 14: push-to-talk with family and friends where there is no network Today, the crossing In development, the escalator Vision.
  const STATUS = [['today', 'Push-to-talk with family and friends where there is no network: Today'], ['dev', 'A warning at a crossing: In development'], ['vision', 'A warning at the top of an escalator: Vision']];
  const ZONE = { rmax: 1000, period: 0.7, rings: 3, phase: 0 }, QZ = Object.assign({}, ZONE, { phase: 0.35, strength: 0.45, fill: false, rmax: 1300 });
  const DASH = { dash: [110, 130] };
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y), since = (T, t, d) => (t == null ? 0 : clamp((T - t) / d));
  const fade = (T, a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
  const say = (g, p, text, k, side, gap, tone) => g.chip(p.x, p.y, text, { k, tone, side: side || (g.portrait ? 'left' : 'up'), gap: gap || 22 });
  function walk(a, dt, target, stop, acc, dec) {
    if (stop != null) target = min(target, sqrt(2 * dec * max(0, stop - a.s)));
    a.v += clamp(target - a.v, -dec * dt, acc * dt); a.s = min(a.rt.total, a.s + max(0, a.v) * dt);
  }
  function brake(a, dt, T) {
    const rem = a.stop - a.s;
    if (rem <= 0.5 || a.v < 4) { a.v = 0; a.stopAt = a.stopAt ?? T; } else a.v = max(0, a.v - (a.v * a.v) / (2 * rem) * (a.hard ? 1 : 0.35 + 0.65 * ease.smooth((T - a.brakeAt) / 0.5)) * dt);
  }
  const V = (x) => Object.assign({ s: 0, v: 0, stop: 0, brake: 0 }, x); // a vehicle or rider; event times start undefined

  /* the person's own kit */
  // The phone: held up in front while its person reads (k = 1), at the body once they look up (k = 0).
  const phoneAt = (p, k, r) => ({ x: p.x + cos(p.a) * (r + 7) * k, y: p.y + sin(p.a) * (r + 7) * k });
  function body(g, p, o) { // a person, with headphones and a phone in hand when the scene has them
    const c = g.ctx, r = o.r || 11, u = cos(p.a), v = sin(p.a), k = o.hold || 0;
    g.person(p, { r });
    if (o.hp) { // headphones: a band over the head and a pad at each ear
      c.strokeStyle = 'rgba(5,8,10,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - v * r, p.y + u * r); c.lineTo(p.x + v * r, p.y - u * r); c.stroke();
      c.fillStyle = '#2E353A'; for (const sd of [-1, 1]) { c.save(); c.translate(p.x - v * (r + 1) * sd, p.y + u * (r + 1) * sd); c.rotate(p.a); c.fillRect(-4, -2.5, 8, 5); c.restore(); }
    }
    if (k > 0.02) { // the phone in hand, screen lit
      const q = phoneAt(p, 1, r); c.save(); c.globalAlpha = k; c.translate(q.x, q.y); c.rotate(p.a);
      c.fillStyle = C.glass; c.fillRect(-4, -7, 8, 14); c.fillStyle = rgba('lane', 0.7); c.fillRect(-2.5, -5.5, 5, 11); c.restore();
    }
    if (!o.vz) { const q = phoneAt(p, k, r); c.fillStyle = C.off; c.beginPath(); c.arc(q.x, q.y, 3.4, 0, TAU); c.fill(); }
  }
  function eyes(g, p, look, toward, range) { // what the person looks at: the screen in hand or, once they look up, the street
    const e = ease.out(look), a = p.a + atan2(sin(toward - p.a), cos(toward - p.a)) * e;
    g.cone({ x: p.x + cos(p.a) * 4, y: p.y + sin(p.a) * 4 }, a, lerp(0.3, 0.62, e), lerp(26, range, e), [], { k: 0.5 + 0.5 * e });
  }
  function vzLayer(g, me, other, oz, T, warn, o) { // the person's zone, a vehicle's quieter one, devices, catch and flash
    if (other) g.zone(other.x, other.y, oz);
    g.zone(me.x, me.y, ZONE);
    if (other) g.device(other.x, other.y);
    g.device(me.x, me.y);
    if (warn != null) { g.catchFx(me.x, me.y, T - warn); g.flash(o.pose, T - warn, { l: o.l || 22, w: o.w || 22 }); }
  }
  function skid(c, a, b, half, wheel, w) { // dark tyre streaks from where a hard stop began
    const gr = c.createLinearGradient(a.x, a.y, b.x, b.y), n = [-sin(b.a), cos(b.a)], u = [cos(b.a), sin(b.a)];
    gr.addColorStop(0, 'rgba(4,6,8,0)'); gr.addColorStop(0.3, 'rgba(4,6,8,.5)'); gr.addColorStop(1, 'rgba(4,6,8,.6)');
    c.strokeStyle = gr; c.lineWidth = w || 8; c.lineCap = 'round'; c.beginPath();
    for (const d of [-half, half]) for (const e of wheel) { c.moveTo(a.x + n[0] * d + u[0] * e, a.y + n[1] * d + u[1] * e); c.lineTo(b.x + n[0] * d + u[0] * e, b.y + n[1] * d + u[1] * e); }
    c.stroke();
  }
  function rowX(g, x0, x1, y, h, seed) { const r = K.rng(seed); while (x0 < x1 - 40) { let w = 160 + r() * 220; if (x1 - x0 - w < 120) w = x1 - x0; g.building(x0, y, w - 10, h, { seed: (x0 * 3) | 0 }); x0 += w; } }

  /* 1. crossing, headphones on */
  const CR = (() => {
  const WALK = rt([[606, 330], [820, 330], [820, 1000]], 50), CAR = rt([[2380, 495], [-900, 495]]);
  const S_WAIT = WALK.find((p) => p.y >= 404), S_FREEZE = WALK.find((p) => p.y >= 468), S_CLEAR = WALK.find((p) => p.y >= 590);
  return {
    lines: ['Music on, eyes on the phone, a person walks towards a crossing. A car is coming.', 'In development: the phone will see its person about to step into the road and say “Look up”.', 'In development: the warning will prompt the person to look up at the kerb.',
      'Without VZ, nothing tells the person to look up.', 'The person steps into the road. The driver brakes hard.'],
    ground(g) {
      g.pavement([[-500, -500], [2100, -500], [2100, 420], [-500, 420]]); g.pavement([[-500, 720], [2100, 720], [2100, 1400], [-500, 1400]]);
      g.kerb([[-500, 420], [2100, 420]]); g.kerb([[-500, 720], [2100, 720]]);
      rowX(g, -500, 2100, -500, 640, 5); rowX(g, -500, 2100, 900, 500, 9);
      g.marking([[-500, 570], [720, 570]], DASH); g.marking([[920, 570], [2100, 570]], DASH);
      g.zebra(760, 423, 880, 717); g.tactile(760, 386, 120, 30); g.tactile(760, 726, 120, 30);
      for (const [x, y] of [[360, 250], [1180, 250], [1600, 790], [420, 790]]) g.tree(x, y, 40);
      for (const x of [160, 1000, 1500]) g.lamp(x, 412, PI / 2);
    },
    init: () => ({ p: { rt: WALK, s: 0, v: 75 }, car: V({ v: 300 }) }),
    update(s, dt, o) {
      const T = s.t + dt, p = s.p, car = s.car, pp = WALK.at(p.s), cp = CAR.at(car.s);
      if (o.vz && p.warn == null && p.s < S_WAIT && K.zoneCrossed(s.t, T, dist(pp, cp), QZ)) { p.warn = T; p.lookAt = T + 0.25; }
      if (car.brakeAt == null && pp.y > 420 && cp.x - 88 > pp.x) {
        car.seen = car.seen ?? T;
        if (T > car.seen + 0.35) { Object.assign(car, { brakeAt: T, hard: true, stop: 2380 - pp.x - 125, skid: car.s }); p.lookAt = T; }
      }
      if (car.brakeAt != null && car.stopAt == null) { brake(car, dt, T); car.brake = 1; }
      else if (car.stopAt != null && p.clear != null) { car.brake = 0; car.v = min(300, car.v + 140 * dt); }
      car.s += car.v * dt;
      let stop = null, dec = 220;
      if (p.go == null) {
        if (p.warn != null) { if (cp.x + 88 < 740) p.go = T; else stop = S_WAIT; }
        else if (car.hard && p.s >= S_FREEZE - 30) { if (car.stopAt != null && T > car.stopAt + 0.7) p.go = T; else { stop = S_FREEZE; dec = 900; } }
      }
      walk(p, dt, p.go != null ? 90 : 75, stop, 260, dec);
      if (p.clear == null && p.s >= S_CLEAR) p.clear = T;
      if (s.end == null && ((p.warn != null && p.clear != null && T > p.clear + 0.6) || (car.stopAt != null && T > car.stopAt + 2.4) || T > 12)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.p.go != null ? 2 : s.p.warn != null ? 1 : 0) : s.car.brakeAt != null ? 2 : s.t > 1.6 ? 1 : 0),
    still: (vz) => (vz ? 3.6 : 4.7), skip: 1.2,
    draw(g, s, o) {
      const T = s.t, p = s.p, car = s.car, pp = WALK.at(p.s), cp = CAR.at(car.s), look = since(T, p.lookAt, 0.5);
      const pose = { x: pp.x, y: pp.y, a: pp.a }, cpose = { x: cp.x, y: cp.y, a: PI }, hold = 1 - ease.smooth(look);
      if (car.skid != null && car.s - car.skid > 2) skid(g.ctx, CAR.at(car.skid), cpose, 26, [54, -52]);
      g.vehicle('car', cpose, { brake: car.brake, lights: 1, phone: o.vz ? null : 'off' });
      body(g, pose, { hp: true, hold, vz: o.vz });
      g.atmosphere('Clear', {});
      eyes(g, pose, look, atan2(cp.y - pp.y, cp.x - pp.x), 900);
      if (o.vz) {
        vzLayer(g, phoneAt(pose, hold, 11), { x: cp.x + 4, y: cp.y - 13 }, QZ, T, p.warn, { pose });
        g.trail(WALK, p.s + 11, p.warn != null ? (p.go != null ? 200 : max(0, S_WAIT - p.s - 11)) : 240);
        say(g, pp, 'Look up', fade(T, p.warn, p.go != null ? p.go + 0.8 : null));
      } else if (car.brakeAt != null) {
        g.flash(cpose, T - car.brakeAt, { l: 176, w: 74, tone: 'alert' });
        say(g, cp, 'Hard stop', fade(T, car.brakeAt, car.stopAt != null ? car.stopAt + 1.8 : null), g.portrait ? 'right' : 'down', 50, 'alert');
      }
    }
  };
  })();

  /* 2. the top of an escalator */
  const ES = (() => {
  const WALK = rt([[690, 450], [1900, 450]]), COMB = 1000, S_STOP = 975 - 690, ESC = 22;
  return {
    lines: ['A person walks towards the top of an escalator, eyes on the phone.', 'Vision: the phone will say “Mind the step” before the person reaches it.', 'Vision: the warning will prompt the person to look up before stepping on.',
      'Without VZ, the person reaches the escalator still reading.', 'The step moves away underfoot. The person stumbles and grabs the rail.'],
    ground(g) {
      const c = g.ctx, fill = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      g.pavement([[-500, -500], [2200, -500], [2200, 1400], [-500, 1400]], { fill: '#262C31', grid: 60 });
      g.pavement([[1000, 330], [2200, 330], [2200, 660], [1000, 660]], { fill: '#15191C', grid: 60 }); // the opening to the floor below
      for (const yc of [450, 542]) { // two escalators: treads, handrails, landing and comb plates
        fill('#3A4247', 940, yc - 40, 1300, 80); fill('#20262A', 1004, yc - 27, 1300, 54); fill('#4A535A', 944, yc - 27, 60, 54);
        c.strokeStyle = rgba('lane', 0.12); c.lineWidth = 1.5; c.beginPath(); for (let y = yc - 24; y < yc + 26; y += 6) { c.moveTo(948, y); c.lineTo(1003, y); } c.stroke();
        fill('#0D1012', 950, yc - 38, 1300, 7); fill('#0D1012', 950, yc + 31, 1300, 7);
      }
      c.strokeStyle = rgba('lane', 0.3); c.lineWidth = g.px * 1.5; c.beginPath(); c.moveTo(940, 410); c.lineTo(940, 330); c.lineTo(2200, 330); c.moveTo(940, 582); c.lineTo(940, 660); c.lineTo(2200, 660); c.stroke();
      for (const [x, y] of [[760, 150], [760, 760], [1400, 150], [1400, 760]]) g.building(x - 40, y - 40, 80, 80, { height: 1.4, tone: '#32393E' });
      g.shelter(420, 170, 200, 30); g.shelter(420, 720, 200, 30);
    },
    init: () => ({ p: { rt: WALK, s: 0, v: 62 } }),
    update(s, dt, o) {
      const T = s.t + dt, p = s.p, x = WALK.at(p.s).x;
      if (o.vz && p.warn == null && COMB - x < 200) { p.warn = T; p.lookAt = T + 0.3; }
      if (x >= COMB - 4) { // on the moving steps; unwarned, they stumble
        if (p.onAt == null) p.onAt = T;
        if (!o.vz && p.trip == null) p.trip = p.lookAt = T;
        p.v = ESC + (p.trip != null ? 30 * max(0, 1 - (T - p.trip) / 0.4) : 0); p.s += p.v * dt;
      } else if (o.vz && p.warn != null) {
        if (p.stopAt == null) { walk(p, dt, 46, S_STOP, 200, 140); if (p.s >= S_STOP - 0.5) p.stopAt = T; }
        else if (T > p.stopAt + 0.8) walk(p, dt, ESC, null, 60, 60);
      } else walk(p, dt, 62, null, 200, 200);
      if (s.end == null && ((p.onAt != null && o.vz && T > p.onAt + 2) || (p.trip != null && T > p.trip + 2.6) || T > 12)) s.end = T;
    },
    beat: (s, o) => (o.vz ? (s.p.onAt != null ? 2 : s.p.warn != null ? 1 : 0) : s.p.trip != null ? 2 : s.t > 1.8 ? 1 : 0),
    still: (vz) => (vz ? 2.6 : 5.6), skip: 1.4,
    draw(g, s, o) {
      const c = g.ctx, T = s.t, p = s.p, w = WALK.at(p.s), look = since(T, p.lookAt, 0.5), lurch = p.trip == null ? 0 : sin(since(T, p.trip, 0.9) * PI) * 15;
      const pose = { x: w.x, y: w.y - lurch, a: -lurch * 0.03 }, hold = 1 - ease.smooth(look);
      c.strokeStyle = 'rgba(8,11,14,.75)'; c.lineWidth = 2.5; c.beginPath(); // treads: one stair down, one up
      for (const [yc, dir] of [[450, 1], [542, -1]]) for (let x = 1004 + (((T * ESC * dir) % 16) + 16) % 16; x < 2000; x += 16) { c.moveTo(x, yc - 26); c.lineTo(x, yc + 26); }
      c.stroke();
      const dg = c.createLinearGradient(1050, 0, 1700, 0); dg.addColorStop(0, 'rgba(3,5,7,0)'); dg.addColorStop(1, 'rgba(3,5,7,.62)');
      c.fillStyle = dg; c.fillRect(1004, 330, 1200, 330);
      body(g, pose, { hold, vz: o.vz });
      g.atmosphere('Clear', {});
      eyes(g, pose, look, 0, 700);
      if (o.vz) {
        vzLayer(g, phoneAt(pose, hold, 11), null, null, T, p.warn, { pose });
        g.trail(WALK, p.s + 11, p.warn != null ? (p.stopAt == null ? max(0, S_STOP - p.s - 11) : 0) : 260);
        say(g, w, 'Mind the step', fade(T, p.warn, p.onAt != null ? p.onAt + 0.8 : null));
      } else if (p.trip != null) {
        g.flash(pose, T - p.trip, { l: 22, w: 22, tone: 'alert' });
        say(g, w, 'Missed step', fade(T, p.trip, p.trip + 2.2), 0, 0, 'alert');
      }
    }
  };
  })();

  /* 3. a family on a ski slope */
  const SK = (() => {
  const B = { x: 1290, y: 236, a: 2.4 }, SPK = [[1.0, 2.5], [3.3, 4.6]]; // the child by the trees; who speaks when
  const W = { // shared lines, then to her (with VZ) or on down, apart (without); speed; size
    A: [[[600, 560], [760, 480], [920, 560]], [[1100, 420], [1222, 290]], [[1120, 640], [1500, 740]], 130, 11],
    D: [[[700, 380], [840, 310], [990, 380]], [[1150, 280], [1240, 236]], [[1160, 480], [1520, 560]], 120, 9.5],
    C: [[[560, 700], [740, 640], [900, 700]], [[1080, 560], [1190, 330]], [[1100, 760], [1530, 800]], 140, 11]
  };
  const R = [{}, {}];
  for (const k in W) for (const i of [0, 1]) R[i][k] = rt(W[k][0].concat(W[k][2 - i]), 130);
  const size = (k) => (W[k] ? W[k][4] : 9.5);
  function skis(g, p, r) {
    const c = g.ctx, u = cos(p.a), v = sin(p.a); c.strokeStyle = rgba('lane', 0.55); c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
    for (const d of [-5, 5]) { c.moveTo(p.x - u * r * 2.6 - v * d, p.y - v * r * 2.6 + u * d); c.lineTo(p.x + u * r * 2.9 - v * d, p.y + v * r * 2.9 + u * d); } c.stroke();
  }
  function tracks(g, route, s) {
    const c = g.ctx; c.strokeStyle = rgba('lane', 0.1); c.lineWidth = 1.5; c.beginPath();
    for (const d of [-5, 5]) for (let q = 0; q <= s; q += 12) { const p = route.at(q), x = p.x - sin(p.a) * d, y = p.y + cos(p.a) * d; if (q) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
  }
  function voice(g, from, to, T, t0, t1) { // a voice passing phone to phone: a fine line with a pulse travelling along it
    const k = since(T, t0, 0.3) * (1 - since(T, t1, 0.5)); if (k <= 0) return;
    const c = g.ctx, px = g.px, d = dist(from, to), ux = (to.x - from.x) / d, uy = (to.y - from.y) / d, s0 = 12 * px, s1 = d - 12 * px, q = ((T - t0) / 0.9) % 1, m = s0 + (s1 - s0) * q;
    c.strokeStyle = rgba('zone', 0.42 * k); c.lineWidth = 1.25 * px; c.beginPath(); c.moveTo(from.x + ux * s0, from.y + uy * s0); c.lineTo(from.x + ux * s1, from.y + uy * s1); c.stroke();
    c.fillStyle = rgba('zone', k * sin(PI * q)); c.beginPath(); c.arc(from.x + ux * m, from.y + uy * m, 2.6 * px, 0, TAU); c.fill();
  }
  function talk(g, p, T, t0, t1) { // the speaker's zone, emitted only while they speak (the kit's ring law)
    const c = g.ctx, f = since(T, t0, 0.3) * (1 - since(T, t1, 0.7)), R = ZONE.rmax;
    if (f > 0) { const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R / 2); gr.addColorStop(0, rgba('zone', 0.2 * f)); gr.addColorStop(0.18, rgba('zone', 0.085 * f)); gr.addColorStop(1, rgba('zone', 0)); c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, R / 2, 0, TAU); c.fill(); }
    c.lineWidth = 1.25 * g.px;
    for (let e = t0; e <= min(T, t1); e += 0.7) {
      const q = (T - e) / 2.1; if (q <= 0 || q >= 1) continue;
      c.strokeStyle = rgba('zone', 0.9 * pow(1 - q, 1.25) * min(1, q / 0.04)); c.beginPath(); c.arc(p.x, p.y, R * (1 - pow(1 - q, 1.7)), 0, TAU); c.stroke();
    }
  }
  return {
    lines: ['A family is spread out on a ski slope where there is no network.', 'One of them says “I’m by the trees.” The others hear it, phone to phone.', '“We see you.” They keep talking as they come back together.',
      'Without VZ, there is no network. The call does not go through.', 'The family skis on, apart, each looking for the others.'],
    ground(g) {
      const c = g.ctx, edge = (y0, amp, ph) => Array.from({ length: 23 }, (_, i) => [-500 + i * 130, y0 + sin(i * 0.7 + ph) * amp]), r = K.rng(21);
      const top = edge(196, 34, 0), bot = edge(748, 40, 2), piste = top.concat(bot.slice().reverse());
      g.pavement([[-500, -500], [2400, -500], [2400, 1400], [-500, 1400]], { fill: '#343C41', grid: 0 });
      g.pavement(piste, { fill: '#41494F', grid: 0 });
      c.save(); g.path(piste); c.clip(); c.strokeStyle = rgba('lane', 0.05); c.lineWidth = g.px; c.beginPath();
      for (let y = 0; y < 1000; y += 9) { c.moveTo(-500, y); c.lineTo(2400, y + 40); } c.stroke(); c.restore();
      for (let i = 0; i < 90; i++) { const x = -480 + r() * 2860, up = r() < 0.5, d = 40 + r() * 300; g.tree(x, up ? 196 + sin(x / 130 * 0.7) * 34 - d : 748 + sin(x / 130 * 0.7 + 2) * 40 + d, 22 + r() * 20); }
      for (const [x, y] of [[1380, 190], [1340, 140], [1440, 230], [1300, 170], [1420, 150]]) g.tree(x, y, 30);
      c.fillStyle = C.post; for (const [p, k] of [[top, 1], [bot, -1]]) for (let i = 1; i < 22; i += 3) c.fillRect(p[i][0] - 3, p[i][1] + k * 24 - 3, 6, 6);
    },
    init: () => ({ f: { A: { s: 0, v: 150 }, D: { s: 0, v: 140 }, C: { s: 0, v: 160 } }, heard: {} }),
    update(s, dt, o) {
      const T = s.t + dt, rs = R[+o.vz], at = (k) => (k === 'B' ? B : rs[k].at(s.f[k].s));
      for (const k in s.f) { s.f[k].rt = rs[k]; walk(s.f[k], dt, W[k][3], rs[k].total, 200, 120); }
      if (o.vz) SPK.forEach(([t0], i) => { // each listener hears when the speaker's first ring reaches their phone
        for (const k of i ? 'BDC' : 'ADC') { const d = dist(at(i ? 'A' : 'B'), at(k)) / ZONE.rmax; if (s.heard[k + i] == null && d < 1 && T - t0 >= (1 - pow(1 - d, 1 / 1.7)) * 2.1) s.heard[k + i] = T; }
      });
      const done = Object.keys(s.f).every((k) => s.f[k].s >= rs[k].total - 1);
      if (s.end == null && ((o.vz && done && T > 7) || (!o.vz && T > 6.6) || T > 12)) s.end = T + (o.vz ? 1.2 : 0);
    },
    beat: (s, o) => (s.t > SPK[1][0] + (o.vz ? 0 : 0.2) ? 2 : s.t > SPK[0][0] ? 1 : 0),
    still: (vz) => (vz ? 1.9 : 2.2), skip: 0.8,
    draw(g, s, o) {
      const T = s.t, rs = R[+o.vz], P = { B };
      for (const k in s.f) { P[k] = rs[k].at(s.f[k].s); tracks(g, rs[k], s.f[k].s); }
      for (const k of 'ADCB') { skis(g, P[k], size(k)); body(g, P[k], { r: size(k), vz: o.vz }); }
      g.atmosphere('Clear', {});
      if (o.vz) {
        talk(g, B, T, ...SPK[0]); talk(g, P.A, T, ...SPK[1]);
        for (const k of 'ADC') voice(g, B, P[k], T, ...SPK[0]);
        for (const k of 'BDC') voice(g, P.A, P[k], T, ...SPK[1]);
        for (const k of 'ADCB') g.device(P[k].x, P[k].y);
        for (const key in s.heard) g.catchFx(P[key[0]].x, P[key[0]].y, T - s.heard[key]);
        say(g, B, 'I’m by the trees', fade(T, SPK[0][0], SPK[0][1] + 0.6), g.portrait ? 'left' : 'down', 20);
        say(g, P.A, 'We see you', fade(T, SPK[1][0], SPK[1][1] + 0.6), g.portrait ? 'right' : 'up', 20);
      } else {
        g.flash(B, T - SPK[0][0], { l: 19, w: 19, tone: 'alert' });
        say(g, B, 'No network', fade(T, SPK[0][0], SPK[0][1] + 1.8), g.portrait ? 'left' : 'down', 20, 'alert');
      }
    }
  };
  })();

  /* mount */
  const SCENE = { 'Ski slope': SK, Crossing: CR, Escalator: ES };
  let scene = NAMES[0];
  const api = K.mount({
    el: '#sim',
    label: 'Three everyday moments in plan view: a family on a ski slope with no network; a person with headphones on, eyes on the phone, at a crossing; a person reading at the top of an escalator. With VZ, the phone will warn its own person in time (in development; vision at the escalator), and the family keeps talking phone to phone, which works today. The caption below describes each moment.',
    focus: { x: 360, y: 120, w: 1200, h: 675 },
    portraitFocus: { x: 560, y: 137, w: 800, h: 640 },
    compare: false,
    statuses: STATUS,
    options: { scene: NAMES[0] },
    choices: [{ name: 'scene', label: 'Moment', values: NAMES }],
    start: (o) => (o.compare && !o.vz ? SCENE[o.scene].skip : 0),
    still: (vz) => SCENE[scene].still(vz),
    lines(o) { const L = SCENE[o.scene].lines; return o.vz ? L.slice(0, 3) : [o.compare ? 'Now the same moment without VZ.' : L[0], L[3], L[4]]; },
    beat: (s, o) => SCENE[o.scene].beat(s, o),
    ground: (g, o) => SCENE[o.scene].ground(g),
    init(o) { scene = o.scene; return SCENE[o.scene].init(o); },
    update(s, dt, o) { SCENE[o.scene].update(s, dt, o); s.over = s.end != null && s.t + dt > s.end + 0.3; },
    draw: (g, s, o) => SCENE[o.scene].draw(g, s, o),
    debug: (s) => ({ end: s.end, warn: s.warn ?? (s.p && s.p.warn), r: s.r && [s.r.brakeAt, s.r.stopAt] })
  });
  const set = api.setOption; // note the moment first, so a reduced-motion still shows it
  api.setOption = (name, value) => { const m = name === 'scene' && NAMES.find((n) => n.toLowerCase() === String(value).toLowerCase()); if (m) scene = m; return set(name, value); };
})();
