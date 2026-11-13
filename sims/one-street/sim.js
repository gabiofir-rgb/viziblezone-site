/* The warning (SPEC S7), built on simkit. One city, three events at once. Each event's phone tells its
   situation only to those it concerns; everyone else stays quiet and dark; each message fades when its event ends.
   Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, ease, lerp, rgba, C } = K, TAU = Math.PI * 2, rt = K.route;

  // World units: about 40 to a metre. A street (traffic along y), a plaza, the airport fence, then an apron.
  const NB = 325, ZEB = [342, 452], FENCE = 860, NX = 1120, CY = 560, WX = NX + 430;
  const QUIET = 0.5, ZR = [780, 640, 760]; // the alpha of everyone an event does not concern; each broadcast's reach
  const TAG = { x: NX + 34, y: CY };      // the aircraft's small tag, in its nose
  // The aircraft's protective bubble: a soft outline about three metres around fuselage and wings (corner-cut spline).
  const BUB = (() => {
    const top = [[-130, 0], [-110, -150], [40, -180], [250, -180], [310, -260], [310, -560], [330, -690], [560, -690], [660, -600], [660, -260], [720, -180], [1100, -180], [1230, 0]];
    let p = top.concat(top.slice(1, -1).reverse().map(([u, v]) => [u, -v])).map(([u, v]) => [NX + u, CY + v]);
    for (let k = 0; k < 4; k++) p = p.flatMap((a, i) => { const b = p[(i + 1) % p.length]; return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]]; });
    return p;
  })();
  const RT = {
    child: rt([[525, 575], [458, 448], [414, 397], [20, 397]], 40), car: rt([[NB, 1660], [NB, -900]]),
    man: rt([[540, 120], [700, 420]]), r1: rt([[900, 770], [380, 770]]), r2: rt([[830, -160], [830, 1300]]),
    tug: rt([[905, 2230], [905, CY], [1054, CY]], 110), worker: rt([[1040, -70], [1060, 380], [1080, 540]], 60)
  };
  // Everyone else, walking or driving through: [route, speed, kind]. They stay quiet throughout.
  const EXTRA = [[[[78, 1150], [78, -300]], 64], [[[20, -300], [20, 1500]], 56], [[[46, -330], [46, 1470]], 56], [[[448, -120], [448, 1500]], 52],
    [[[790, 1250], [700, -250]], 64], [[[175, 560], [175, 1900]], 240, 'car'], [[[1290, 1400], [1330, 870]], 50]].map(([w, v, k]) => [rt(w), v, k]);
  const SEATED = [[706, 334, -Math.PI / 2], [1372, 905, Math.PI]];
  const S_WAIT = RT.child.find((p) => p.x <= 425), S_FREEZE = RT.child.find((p) => p.x <= 348), S_CLEAR = RT.child.find((p) => p.x <= 240);
  const S_KERB = RT.child.find((p) => p.x <= 400), S_HOME = RT.child.find((p) => p.x <= 96), S_FALL = 187, W_SAFE = RT.worker.find((p) => p.y >= 446);
  const L = {
    with: ['One street. Things that can happen at once. Only those it concerns are told.',
      'A child is near the road. Today: the driver is warned on a screen in the car. Nobody else.',
      'A man falls and does not get up. Vision: people nearby will be warned, not the passers-by.',
      'A worker walks into the bubble around a parked aircraft. Today: the tug driver is warned.',
      'Each message fades when its event ends. Only those it concerns were told.'],
    without: ['One street. Things that can happen at once.',
      'Without VZ, nothing tells the driver the child is about to cross. He sees her late and brakes hard.',
      'A man falls and does not get up. The responders a short walk away never know.',
      'A worker walks in front of a parked aircraft. The tug driver sees him late and stops hard.',
      'Without VZ, nobody who needed to know was told in time.']
  };

  const arrive = (d, r) => (d > r ? Infinity : (1 - Math.pow(1 - d / r, 1 / 1.7)) * 2.1); // first ring to reach d (kit law)
  const pos = (a) => a.p || a.rt.at(a.s), dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const lev = (a, T) => (a.lit == null ? 0 : ease.out((T - a.lit) / 0.25) * (a.off == null ? 1 : 1 - ease.smooth((T - a.off) / 0.7)));
  function walk(a, dt, target, stop, acc, dec) { // bounded acceleration along a route, with an optional stop (arc length)
    if (stop != null) target = Math.min(target, Math.sqrt(2 * dec * Math.max(0, stop - a.s)));
    a.v += clamp(target - a.v, -dec * dt, acc * dt); a.s = Math.min(a.rt.total, a.s + Math.max(0, a.v) * dt);
  }
  function seek(a, dt, q, v) { // off the route: head for a point, turning smoothly, and stop beside it
    const p = pos(a), want = Math.atan2(q.y - p.y, q.x - p.x), h = p.a + clamp(Math.atan2(Math.sin(want - p.a), Math.cos(want - p.a)), -5 * dt, 5 * dt);
    a.v += clamp((dist(p, q) > 4 ? v : 0) - a.v, -400 * dt, 300 * dt);
    a.p = { x: p.x + Math.cos(h) * a.v * dt, y: p.y + Math.sin(h) * a.v * dt, a: h };
  }
  function brake(a, dt, T) { // a vehicle braking to arc length a.stop: a calm stop ramps in, a hard one does not
    const rem = a.stop - a.s;
    if (rem <= 0.5 || a.v < 4) { a.v = 0; a.stopAt = T; } else a.v = Math.max(0, a.v - (a.v * a.v) / (2 * rem) * (a.hard ? 1 : 0.35 + 0.65 * ease.smooth((T - a.brakeAt) / 0.5)) * dt);
  }
  function inBubble(p) { let k = false; for (let i = 0, j = BUB.length - 1; i < BUB.length; j = i++) { const [x1, y1] = BUB[i], [x2, y2] = BUB[j]; if ((y1 > p.y) !== (y2 > p.y) && p.x < ((x2 - x1) * (p.y - y1)) / (y2 - y1) + x1) k = !k; } return k; }

  /* ------------------------------------------------------------------ ground */
  function aircraft(g) { // a parked regional airliner, nose to the fence
    const c = g.ctx, W = 52, [sx, sy] = g.shade(18, 22), fill = (pts, col) => { g.path(pts); c.fillStyle = col; c.fill(); };
    const nose = (a0, a1) => K.arcPts(NX + 96, CY, 96, a0, a1, 12).map(([x, y]) => [x, CY + (y - CY) * (W / 96)]);
    const hull = [...nose(Math.PI, Math.PI * 1.5), [NX + 800, CY - W], [NX + 1080, CY - 12], [NX + 1080, CY + 12], [NX + 800, CY + W], ...nose(Math.PI / 2, Math.PI)];
    const wings = [-1, 1].map((s) => [[WX, CY + s * 48], [WX + 24, CY + s * 540], [WX + 82, CY + s * 540], [WX + 100, CY + s * 48]]).concat([-1, 1].map((s) => [[NX + 950, CY + s * 8], [NX + 995, CY + s * 170], [NX + 1040, CY + s * 170], [NX + 1045, CY + s * 8]]));
    const pods = [CY - 180, CY + 180].map((y) => [[WX - 70, y - 21], [WX + 126, y - 18], [WX + 126, y + 18], [WX - 70, y + 21], [WX - 84, y + 12], [WX - 88, y], [WX - 84, y - 12]]);
    c.beginPath(); for (const pts of [hull, ...wings, ...pods]) { c.moveTo(pts[0][0] + sx, pts[0][1] + sy); for (const [x, y] of pts) c.lineTo(x + sx, y + sy); c.closePath(); }
    c.fillStyle = 'rgba(3,5,7,.42)'; c.fill('nonzero');
    for (const w of wings) fill(w, '#7F898F');
    for (const p of pods) fill(p, '#97A1A7');
    fill(hull, '#A3ACB1');
    const sh = c.createLinearGradient(0, CY - W, 0, CY + W); // body curvature, as on the vehicles
    sh.addColorStop(0, 'rgba(8,11,14,.24)'); sh.addColorStop(0.3, 'rgba(8,11,14,0)'); sh.addColorStop(0.7, 'rgba(8,11,14,0)'); sh.addColorStop(1, 'rgba(8,11,14,.24)');
    fill(hull, sh);
    c.lineWidth = g.px; c.strokeStyle = 'rgba(8,11,14,.22)'; c.beginPath();
    for (const s of [-1, 1]) { c.moveTo(WX + 70, CY + s * 70); c.lineTo(WX + 62, CY + s * 520); } // flaps, doors
    c.rect(NX + 150, CY - W + 3, 20, 10); c.rect(NX + 700, CY + W - 13, 18, 10); c.stroke();
    c.strokeStyle = rgba('lane', 0.1); c.beginPath(); c.moveTo(NX + 70, CY); c.lineTo(NX + 900, CY); c.stroke();
    fill([[NX + 30, CY - 34], [NX + 52, CY - 44], [NX + 52, CY + 44], [NX + 30, CY + 34]], C.glass);
    c.strokeStyle = rgba('lane', 0.3); c.lineWidth = 2.5; c.beginPath();
    for (const y of [CY - 180, CY + 180]) { c.moveTo(WX - 92, y - 76); c.lineTo(WX - 92, y + 76); } c.stroke(); // propellers, stopped
    c.fillStyle = C.off; c.beginPath(); c.arc(TAG.x, TAG.y, 4, 0, TAU); c.fill();
  }
  function ground(g) {
    const c = g.ctx, X0 = -900, X1 = 2600, Y0 = -900, Y1 = 2000, r = K.rng(11), dash = { dash: [110, 130] };
    g.pavement([[X0, Y0], [100, Y0], [100, Y1], [X0, Y1]]);
    g.pavement([[400, Y0], [FENCE, Y0], [FENCE, Y1], [400, Y1]]);
    g.pavement([[FENCE, Y0], [X1, Y0], [X1, Y1], [FENCE, Y1]], { fill: '#2A3035', grid: 200 });
    g.kerb([[100, Y0], [100, Y1]]); g.kerb([[400, Y0], [400, Y1]]);
    for (let y = Y0; y < Y1;) { const h = 230 + r() * 280; g.building(X0, y, -40 - X0, h - 12, { seed: y | 0 }); y += h; }
    g.marking([[250, Y0], [250, ZEB[0] - 40]], dash); g.marking([[250, ZEB[1] + 40], [250, Y1]], dash);
    g.zebra(104, ZEB[0], 396, ZEB[1], { vertical: true });
    g.tactile(404, ZEB[0], 30, ZEB[1] - ZEB[0]); g.tactile(66, ZEB[0], 30, ZEB[1] - ZEB[0]);
    for (const [x, y, s] of [[560, 960, 46], [760, 1010, 40], [520, -60, 40], [740, 560, 36], [600, 640, 30], [790, 180, 34]]) g.tree(x, y, s);
    g.shelter(668, 352, 76, 18); g.shelter(482, 640, 18, 70);
    for (const y of [-200, 250, 700, 1150]) g.lamp(424, y, Math.PI);
    g.marking([[968, Y0], [968, Y1]], { dash: [60, 60], w: 4, alpha: 0.3 }); // the apron: service road, lead-in line
    g.marking([[990, CY], [X1, CY]], { w: 4, alpha: 0.5 });
    aircraft(g);
    c.globalAlpha = QUIET; g.vehicle('tug', { x: 935, y: 170, a: -Math.PI / 2 }, { phone: 'off' }); c.globalAlpha = 1; // a parked tug
    c.strokeStyle = C.post; c.lineWidth = 3; c.beginPath(); c.moveTo(FENCE, Y0); c.lineTo(FENCE, Y1); c.stroke();
    c.fillStyle = C.post; for (let y = Y0; y < Y1; y += 90) c.fillRect(FENCE - 4, y - 4, 8, 8);
  }

  /* ------------------------------------------------------------------- state */
  function init() {
    const A = (k, v) => ({ rt: RT[k], s: 0, v, p: null, lit: null, off: null, at: null, brakeAt: null, stopAt: null, hard: false, skid: null, brake: 0 });
    return {
      end: null, over: false, fell: null, ev: [0, 1, 2].map(() => ({ t0: null, t1: null })), tag: { lit: null, off: null },
      child: A('child', 70), car: A('car', 280), man: A('man', 52), r1: A('r1', 62), r2: A('r2', 60), tug: A('tug', 180), worker: A('worker', 64),
      ex: EXTRA.map(([w, v]) => ({ rt: w, s: 0, v }))
    };
  }

  function update(s, dt, o) {
    const T = s.t + dt, { child, car, man, tug, worker, ev } = s, vz = o.vz, cp = pos(child), kp = pos(car), tp = pos(tug), wp = pos(worker);
    const reach = (i, src, a, p) => { if (ev[i].t0 != null && a.lit == null && T - ev[i].t0 >= arrive(dist(src, p), ZR[i])) a.lit = T; };
    // 1. The child heads for the kerb with a car coming. Her phone predicts the step and tells the car, and her.
    if (vz && ev[0].t0 == null && S_KERB - child.s < 190) ev[0].t0 = child.lit = T;
    reach(0, cp, car, kp);
    if (car.brakeAt == null && child.s < S_CLEAR) {
      if (car.lit != null && T >= car.lit + 0.4) { car.brakeAt = T; car.stop = 1660 - ZEB[1] - 118; }
      else if (!vz && cp.x < 400 && kp.y - 88 > cp.y) { // without VZ the driver reacts only once she is in the road
        car.seen = car.seen ?? T;
        if (T >= car.seen + 0.35) Object.assign(car, { brakeAt: T, hard: true, stop: 1660 - cp.y - 124.5, skid: car.s, lit: (child.lit = T) });
      }
    }
    if (car.brakeAt != null && car.stopAt == null) { brake(car, dt, T); car.brake = car.hard ? 1 : 0.5; }
    else if (car.stopAt != null && child.clear != null && T > child.clear + 0.4) { car.brake = 0; car.v = Math.min(280, car.v + 140 * dt); }
    car.s += car.v * dt;
    // Warned, she waits at the kerb until the car has stopped; unwarned, she steps out and freezes in the lane.
    let stop = null, dec = 240;
    if (child.go == null) {
      if (vz && child.lit != null) { if (car.stopAt != null || (car.brakeAt != null && car.v < 40)) child.go = T; else stop = S_WAIT; }
      else if (car.hard && child.s >= S_FREEZE - 40) { if (car.stopAt != null && T > car.stopAt + 0.6) child.go = T; else { stop = S_FREEZE; dec = 900; } }
    }
    walk(child, dt, child.go != null ? 84 : 70, stop, 300, dec);
    if (child.clear == null && child.s >= S_CLEAR) child.clear = T;
    if (ev[0].t0 != null && ev[0].t1 == null && child.s >= S_HOME) ev[0].t1 = child.off = car.off = T;
    if (car.hard && car.stopAt != null && car.off == null && T > car.stopAt + 1.6) car.off = child.off = T;

    // 2. A man falls and does not get up. After a moment his phone tells the responders nearby; they turn to him.
    if (s.fell == null) { walk(man, dt, 52, null, 200, 200); if (man.s >= S_FALL) { s.fell = T; man.v = 0; if (!vz) man.lit = T; } }
    if (vz && s.fell != null && ev[1].t0 == null && T >= s.fell + 0.9) ev[1].t0 = man.lit = T;
    const mp = pos(man);
    for (const r of [s.r1, s.r2]) {
      reach(1, mp, r, pos(r));
      if (r.lit != null && T > r.lit + 0.5) {
        const p = pos(r), a = Math.atan2(p.y - mp.y, p.x - mp.x);
        seek(r, dt, { x: mp.x + Math.cos(a) * 40, y: mp.y + Math.sin(a) * 40 }, 118);
        if (r.at == null && dist(pos(r), mp) < 48) r.at = T;
      } else walk(r, dt, r.v || 60, null, 200, 200);
    }
    if (ev[1].t0 != null && ev[1].t1 == null && s.r1.at != null && s.r2.at != null) ev[1].t1 = man.off = s.r1.off = s.r2.off = T;

    // 3. A worker on foot enters the aircraft's protective bubble as a tug comes in. The aircraft's tag tells both.
    if (vz && ev[2].t0 == null && inBubble(wp) && dist(tp, wp) < 1000 && tug.s < tug.rt.total - 40) ev[2].t0 = s.tag.lit = T;
    reach(2, TAG, tug, tp); reach(2, TAG, worker, wp);
    if (tug.stopAt == null) {
      if (tug.hard) { brake(tug, dt, T); tug.s += tug.v * dt; }
      else { // warned, it creeps in to the nose; unwarned, the driver notices the worker only when he is close and ahead
        walk(tug, dt, tug.lit != null && T > tug.lit + 0.45 ? 60 : tug.s > tug.rt.total - 330 ? 150 : 180, tug.rt.total, 160, tug.lit != null ? 120 : 200);
        if (tug.s >= tug.rt.total - 0.5) { tug.stopAt = T; if (ev[2].t0 != null) ev[2].t1 = tug.off = worker.off = s.tag.off = T; }
        const d = dist(tp, wp), b = Math.atan2(wp.y - tp.y, wp.x - tp.x) - tp.a;
        if (!vz && d < 200 && Math.abs(Math.atan2(Math.sin(b), Math.cos(b))) < 1) {
          tug.seen = tug.seen ?? T;
          if (T >= tug.seen + 0.35) Object.assign(tug, { hard: true, brakeAt: T, stop: tug.s + d - 93, skid: tug.s, lit: (worker.lit = T) });
        }
      }
    }
    tug.brake = tug.hard ? 1 : tug.lit != null && tug.stopAt == null && tug.v > 62 ? 0.5 : 0;
    if (tug.hard && tug.stopAt != null && tug.off == null && T > tug.stopAt + 1.6) tug.off = worker.off = T;
    walk(worker, dt, 64, worker.lit != null && vz ? W_SAFE : null, 200, 300); // told, he stops short of the tug's path

    for (const a of s.ex) walk(a, dt, a.v, null, 100, 100);
    if (s.end == null && ((vz && ev[2].t1 != null && ev[0].t1 != null && ev[1].t1 != null && T > ev[2].t1 + 3) || (!vz && tug.stopAt != null && T > tug.stopAt + 3) || T > 17)) s.end = T;
    s.over = s.end != null && T > s.end + 0.3;
  }

  /* -------------------------------------------------------------------- draw */
  // The kit's zone, emitted only while the event lasts, and quieter once everyone it concerns has been told.
  function rings(g, p, rmax, t0, t1, told, T) {
    const c = g.ctx, f = clamp((T - t0) / 0.3) * (t1 == null ? 1 : 1 - clamp((T - t1) / 0.7)), st = told == null ? 1 : 1 - 0.55 * ease.smooth((T - told - 1.2) / 0.8);
    if (f > 0) {
      const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rmax / 2);
      gr.addColorStop(0, rgba('zone', 0.2 * f)); gr.addColorStop(0.18, rgba('zone', 0.085 * f)); gr.addColorStop(1, rgba('zone', 0));
      c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, rmax / 2, 0, TAU); c.fill();
    }
    c.lineWidth = 1.25 * g.px;
    for (let k = Math.max(0, Math.ceil((T - 2.1 - t0) / 0.7)); ; k++) {
      const e = t0 + k * 0.7, q = (T - e) / 2.1; if (e > T || (t1 != null && e > t1)) break;
      if (q <= 0 || q >= 1) continue;
      c.strokeStyle = rgba('zone', 0.9 * st * Math.pow(1 - q, 1.25) * Math.min(1, q / 0.04));
      c.beginPath(); c.arc(p.x, p.y, rmax * (1 - Math.pow(1 - q, 1.7)), 0, TAU); c.stroke();
    }
  }
  function bubble(g, k) { // the protective bubble: a faint fill, a soft inner glow at its edge, one fine rim
    const c = g.ctx; g.path(BUB);
    c.fillStyle = rgba('zone', 0.018 + 0.022 * k); c.fill();
    c.save(); c.clip(); c.strokeStyle = rgba('zone', 0.028 + 0.04 * k); for (const w of [40, 16]) { c.lineWidth = w * g.px; c.stroke(); } c.restore();
    c.strokeStyle = rgba('zone', 0.38 + 0.52 * k); c.lineWidth = 1.25 * g.px; c.stroke();
  }
  // Who receives what: a fine line from the event's phone to a recipient, an arrowhead, and a pulse travelling along it.
  function link(g, a, b, k, T) {
    const c = g.ctx, px = g.px, d = dist(a, b), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, s0 = 12 * px, s1 = d - 15 * px;
    if (k <= 0.01 || s1 - s0 < 12 * px) return;
    const hx = a.x + ux * s1, hy = a.y + uy * s1, w = 4 * px, l = 7 * px, q = (T / 1.1) % 1, m = s0 + (s1 - s0) * q;
    c.strokeStyle = rgba('zone', 0.7 * k); c.lineWidth = 1.25 * px; c.lineCap = c.lineJoin = 'round'; c.beginPath();
    c.moveTo(a.x + ux * s0, a.y + uy * s0); c.lineTo(hx, hy);
    c.moveTo(hx - ux * l + uy * w, hy - uy * l - ux * w); c.lineTo(hx, hy); c.lineTo(hx - ux * l - uy * w, hy - uy * l + ux * w); c.stroke();
    c.fillStyle = rgba('zone', k * Math.sin(Math.PI * q)); c.beginPath(); c.arc(a.x + ux * m, a.y + uy * m, 2.4 * px, 0, TAU); c.fill();
  }
  function lit(g, p, k, T, a) { // lighting up: a warm glow, the phone turns mustard, one catch
    if (k <= 0.01) return;
    const c = g.ctx, R = 34 * g.px, gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    gr.addColorStop(0, rgba('zone', 0.26 * k)); gr.addColorStop(1, rgba('zone', 0));
    c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, R, 0, TAU); c.fill();
    c.globalAlpha = k; g.device(p.x, p.y); c.globalAlpha = 1;
    g.catchFx(p.x, p.y, T - a.lit);
  }
  function skid(c, a, b, half, wheel) { // two dark tyre streaks per side from where the hard stop began
    const gr = c.createLinearGradient(a.x, a.y, b.x, b.y), n = [-Math.sin(b.a), Math.cos(b.a)], u = [Math.cos(b.a), Math.sin(b.a)];
    gr.addColorStop(0, 'rgba(4,6,8,0)'); gr.addColorStop(0.3, 'rgba(4,6,8,.5)'); gr.addColorStop(1, 'rgba(4,6,8,.6)');
    c.strokeStyle = gr; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
    for (const d of [-half, half]) for (const e of wheel) { c.moveTo(a.x + n[0] * d + u[0] * e, a.y + n[1] * d + u[1] * e); c.lineTo(b.x + n[0] * d + u[0] * e, b.y + n[1] * d + u[1] * e); }
    c.stroke();
  }
  function lying(g, p, k, al) { // a person on the ground: the body stretches out from the head as he falls
    const c = g.ctx, e = ease.out(k), u = Math.cos(p.a), v = Math.sin(p.a), len = lerp(4, 46, e), [sx, sy] = g.shade(2.5, 3.5);
    const shape = (dx, dy) => { c.beginPath(); c.ellipse(p.x + dx + u * len / 2, p.y + dy + v * len / 2, 8 + len / 2, 10, p.a, 0, TAU); c.moveTo(p.x + dx + 9, p.y + dy); c.arc(p.x + dx, p.y + dy, 9, 0, TAU); };
    c.save(); c.globalAlpha = al; shape(sx, sy); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill();
    shape(0, 0); c.strokeStyle = rgba('dark', 0.85); c.lineWidth = 3 * g.px; c.stroke(); c.fillStyle = '#F7F8F8'; c.fill(); c.restore();
  }

  function draw(g, s, o) {
    const c = g.ctx, T = s.t, vz = o.vz, Q = (a) => lerp(QUIET, 1, lev(a, T)), on = (a) => (vz && lev(a, T) > 0.5 ? null : 'off');
    const P = {}; for (const k of ['child', 'car', 'man', 'r1', 'r2', 'tug', 'worker']) P[k] = pos(s[k]);
    for (const k of ['car', 'tug']) if (s[k].skid != null && s[k].s - s[k].skid > 2) skid(c, s[k].rt.at(s[k].skid), P[k], k === 'car' ? 26 : 24, k === 'car' ? [54, -52] : [36, -36]);
    // Physical world. Everyone the moment does not concern stays quiet.
    s.ex.forEach((a, i) => { c.globalAlpha = QUIET; const p = pos(a); if (EXTRA[i][2]) g.vehicle(EXTRA[i][2], p, { lights: 1, phone: 'off' }); else g.person(p, { alpha: QUIET, phone: 'off' }); });
    for (const [x, y, a] of SEATED) g.person({ x, y, a }, { alpha: QUIET, phone: 'off' });
    c.globalAlpha = Q(s.car); g.vehicle('car', P.car, { brake: s.car.brake, lights: 1, phone: on(s.car) });
    c.globalAlpha = Q(s.tug); g.vehicle('tug', P.tug, { brake: s.tug.brake, lights: 1, phone: on(s.tug) }); c.globalAlpha = 1;
    for (const k of ['r1', 'r2', 'worker', 'child']) g.person(P[k], { r: k === 'child' ? 10.5 : 11, alpha: Q(s[k]), phone: on(s[k]) });
    if (s.fell == null) g.person(P.man, { alpha: Q(s.man), phone: 'off' });
    else lying(g, { x: P.man.x, y: P.man.y, a: P.man.a + 0.9 }, (T - s.fell) / 0.35, Q(s.man));
    g.atmosphere('Clear', {});
    const fade = (a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
    const chip = (k, text, l, p, gap) => g.chip(P[k].x, P[k].y, text, { k: fade(s[k].lit, Math.min(s[k].lit + 2.8, s[k].off ?? Infinity)), side: g.portrait ? p : l, gap });
    if (vz) {
      // The VZ layer: the aircraft's bubble, each event's broadcast, who receives it, and the recipients lighting up.
      bubble(g, lev(s.tag, T));
      const both = (a, b) => (a == null || b == null ? null : Math.max(a, b)), told = [s.car.lit, both(s.r1.lit, s.r2.lit), both(s.tug.lit, s.worker.lit)], src = [P.child, P.man, TAG];
      s.ev.forEach((e, i) => { if (e.t0 != null) rings(g, src[i], ZR[i], e.t0, e.t1, told[i], T); });
      if (o.receivers === 'On') { link(g, P.child, P.car, lev(s.car, T), T); for (const k of ['r1', 'r2']) link(g, P.man, P[k], lev(s[k], T), T); for (const k of ['tug', 'worker']) link(g, TAG, P[k], lev(s[k], T), T); }
      for (const k of ['child', 'car', 'man', 'r1', 'r2', 'tug', 'worker']) lit(g, P[k], lev(s[k], T), T, s[k]);
      lit(g, TAG, lev(s.tag, T), T, s.tag);
      for (const [k, l, w] of [['car', 176, 74], ['tug', 120, 72], ['child', 21, 21], ['r1', 22, 22], ['r2', 22, 22], ['worker', 22, 22]]) if (s[k].lit != null) g.flash(P[k], T - s[k].lit, { l, w });
      chip('car', 'Pedestrian ahead', 'right', 'down', 50);
      chip('r1', 'Man down', 'down', 'right', 18); chip('r2', 'Man down', 'right', 'up', 18);
      chip('tug', 'Worker ahead', 'left', 'down', 44);
    } else {
      for (const [k, l, w] of [['car', 176, 74], ['tug', 120, 72]]) {
        const a = s[k]; if (a.brakeAt == null) continue;
        g.flash(P[k], T - a.brakeAt, { l, w, tone: 'alert' });
        g.chip(P[k].x, P[k].y, 'Hard stop', { tone: 'alert', k: fade(a.brakeAt, a.stopAt != null ? a.stopAt + 1.8 : null), side: g.portrait ? 'down' : k === 'car' ? 'right' : 'left', gap: k === 'car' ? 50 : 44 });
      }
    }
  }

  K.mount({
    el: '#sim',
    label: 'Plan of a city street, a plaza and an airport apron. Three things happen at once: a child is about to cross in front of a car, a man falls in the plaza, and a worker walks into the proactive bubble around a parked aircraft as a tug comes in. With VZ, a driver is warned about the child, and the tug driver is warned (Today). Vision: people nearby will be warned about the fall. Everyone else stays quiet. The caption below describes each moment.',
    focus: { x: -60, y: 0, w: 1800, h: 1012 },
    portraitFocus: { x: 60, y: 80, w: 1200, h: 960 },
    statuses: [['today', 'A driver warned about a child: Today'], ['today', 'The bubble around a tagged aircraft: Today'], ['vision', 'People nearby will be warned about a fall: Vision']],
    options: { receivers: 'Off' },
    choices: [{ name: 'receivers', label: 'Show who receives what', values: ['Off', 'On'] }],
    still: (vz) => (vz ? 8.5 : 9.2),
    lines: (o) => (o.vz ? L.with : L.without),
    beat(s, o) {
      if (o.vz) return s.ev[2].t1 != null && s.t > s.ev[2].t1 + 0.2 ? 4 : s.worker.lit != null ? 3 : s.r1.lit != null || s.r2.lit != null ? 2 : s.car.lit != null ? 1 : 0;
      return s.tug.stopAt != null && s.t > s.tug.stopAt + 0.8 ? 4 : s.tug.brakeAt != null ? 3 : s.fell != null && s.t > s.fell + 1 ? 2 : s.car.brakeAt != null ? 1 : 0;
    },
    debug: (s) => ({ ev: s.ev.map((e) => [e.t0, e.t1]), carLit: s.car.lit, carBrake: s.car.brakeAt, carStop: s.car.stopAt, childGo: s.child.go, fell: s.fell, r1: s.r1.lit, r2: s.r2.lit, r1at: s.r1.at, r2at: s.r2.at, tugLit: s.tug.lit, wLit: s.worker.lit, tugBrake: s.tug.brakeAt, tugStop: s.tug.stopAt, end: s.end }),
    ground, init, update, draw
  });
})();
