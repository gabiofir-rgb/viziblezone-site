/* Proactive bubbles: the closed-compounds scene (an airport apron or a container yard), built on simkit.
   Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp } = K;

  // World units: about 40 to a metre; north is up. Both sites share one plan: a one-way service lane (x 1600..1820)
  // behind the stand or yard block, parked units along its east edge with a gap a worker walks through, and a road
  // (x 2220..2440) that leads north to a protected area: the runway or the crane's work zone.
  // The tug or carrier drives south down the lane; the van or truck drives north up the road.
  const LANE = [1600, 1820], ROAD = [2220, 2440], HOLD = 168, CY = 952, R_W = 13, W_BUB = 160, HALF = 0.5, FM0 = 1290;
  const box = (x, y, w, h) => ({ x: x + w / 2, y: y + h / 2, a: 0, l: w, w: h });
  // Routes start well off the plan so a towed cart has road behind it; s0 puts the front where the run starts (fb).
  const big = (kind, x, fb, v, hl, hw, o) => Object.assign({ kind, x, v, hl, hw, off: 0, half: hl, s0: fb + 1200 - hl, R: K.route([[x, -1200], [x, 2600]]) }, o);
  const small = (kind, v, hl, hw) => ({ kind, v, hl, hw, s0: 2600 - hl - FM0, R: K.route([[2385, 2600], [2385, -1200]]) });
  const bFront = (k, s) => s - 1200 + k.hl, mFront = (k, s) => 2600 - s - k.hl; // y of each front
  // The worker walks west from x0 through the gap at ox (the parked units' west face) to xe, and is past the vehicle
  // once clear of its path. Nothing warns her: today only the driver is warned.
  function walker(S, x0, xe) {
    const R = K.route([[x0, CY], [xe, CY]]), k = S.big;
    S.walk = R; S.sEdge = R.find((p) => p.x <= S.ox - 8); S.sPast = R.find((p) => p.x <= k.x - k.hw - 36);
    S.occ = [box(S.ox, 385, S.ol, 530), box(S.ox, 990, S.ol, 530)];
    return S;
  }
  // chips[1] stays empty: today the driver is warned, not the worker (coherence A25).
  const STATUS = [['today', 'Drivers warned about workers on foot: Today'], ['today', 'Bubbles around tagged assets and areas: Today']];

  const SITE = {
    Airport: {
      big: big('tug', 1670, -40, 210, 60, 36, { off: -63, half: 123, tow: true }), small: small('van', 200, 125, 46), ox: 1735, ol: 90,
      assets: [{ x: 930, y: 560, a: 0, rx: 510, ry: 470, n: 2.2 }],
      zone: { x: 2900, y: -410, a: 0, rx: 1000, ry: 560, n: 4 },
      tags: [[1080, 118], [1080, 1002], [1402, 560], [758, 418], [758, 702], [2205, HOLD + 22], [2455, HOLD + 22]],
      chips: ['Worker ahead', null, 'Hold line ahead'],
      place: ['Runway', 2780, -120],
      L: {
        with: ['A proactive bubble surrounds each worker and vehicle. Tagged bubbles around the aircraft and the runway work today.',
          'Parked carts hide a worker from a tug. Their bubbles touch, and the driver is warned.',
          'The tug stops and the worker crosses. Today: the runway\'s tagged bubble reminds the van driver that the hold line is ahead.',
          'Only the driver is warned. Everyone else stays quiet.'],
        without: ['A tug heads behind a parked aircraft. Parked carts hide a worker about to cross.',
          'Without VZ, the worker steps out. The driver sees the worker late and brakes hard.',
          'Nothing extra reminds the driver.'],
        again: 'Now without VZ. Parked carts hide the worker from the tug driver.'
      }
    },
    Seaport: {
      big: big('straddle', 1700, 150, 175, 200, 98, { load: '#434B50' }), small: small('truck', 190, 310, 50), ox: 1810, ol: 244,
      assets: [],
      zone: { x: 2470, y: 12, a: 0, rx: 420, ry: 150, n: 3 },
      tags: [[2180, -115], [2760, -115], [2180, 145], [2760, 145]],
      chips: ['Worker ahead'],
      place: ['Crane work zone', 2470, -170],
      L: {
        // In development (SPEC 15): future tense; the carrier and the worker only.
        with: ['A straddle carrier heads down a yard lane. Containers hide a worker about to cross.',
          'In development: the same bubbles will work in a container yard.',
          'In development: the driver will be warned before seeing him. Each site will start with a pilot.'],
        without: ['A straddle carrier heads down a yard lane. Containers hide a worker about to cross.',
          'The driver sees the worker late and stops hard.']
      }
    }
  };

  walker(SITE.Airport, 1968, 1540); walker(SITE.Seaport, 2027, 1520);

  /* ------------------------------------------------- windows for the plates */
  // Hidden options for the Show me plates (plan 3.5): show=Worker, Aircraft or Runway plays one moment with its own
  // actors, start, frame and lines; site=Seaport plays the yard's carrier and worker. show=All is the hero, unchanged.
  const SHOWS = ['All', 'Worker', 'Aircraft', 'Runway'], SITES = ['Airport', 'Seaport'];
  const win = (o) => (o.site === 'Seaport' ? 'Seaport' : o.show || 'All');
  const HERO_LABEL = 'Plan view of an airport apron. A proactive bubble surrounds each worker and each vehicle. A tug and a worker hidden from each other approach; when their bubbles touch, the driver is warned and the tug stops. Tagged bubbles around the parked aircraft and the runway work today; the van driver is reminded that the hold line is ahead. Without VZ the driver sees the worker late, and nothing extra reminds the van driver of the hold line. The caption below describes each moment.';
  const ACT = { All: 'bwm', Worker: 'bw', Seaport: 'bw', Runway: 'm', Aircraft: 'k' }; // tug or carrier, worker, van, catering truck
  const has = (o, a) => ACT[win(o)].includes(a);
  const WIN = {
    All: { focus: { x: 120, y: -260, w: 2560, h: 1440 }, portrait: { x: 400, y: -250, w: 2160, h: 1420 }, still: [2.6, 3.4] },
    Worker: { focus: { x: 1250, y: 170, w: 1000, h: 1040 }, start: [0.8, 0.6], still: [3.2, 4.6],
      L: { with: ['A tug heads behind a parked aircraft. Parked carts hide a worker about to cross.',
        'Their bubbles touch before the driver can see him.',
        'The tug driver is warned and slows. Nobody else is disturbed.'],
      without: ['A tug heads behind a parked aircraft.', 'The driver sees the worker late and stops hard.'] } },
    Seaport: { focus: { x: 1200, y: 200, w: 1150, h: 1200 }, start: [0.8, 0.3], still: [3.4, 4.8] },
    Aircraft: { focus: { x: 380, y: 260, w: 1400, h: 1360 }, start: [0, 0], still: [3.2, 4.3],
      L: { with: ['A truck backs towards the wing of a parked aircraft.',
        'The aircraft carries small tags, so it has its own bubble.',
        'The driver is warned as the truck reaches it, and stops short.'],
      without: ['A truck backs towards the wing.', 'Nothing tells the driver how close it is.'] } },
    // The hold line as a tagged danger area (advisors, 13.11): a reminder, never clearance; no red chip.
    Runway: { focus: { x: 1950, y: -560, w: 1500, h: 1500 }, start: [0, 0], still: [2.6, 3.9], fm: 890,
      L: { with: ['A vehicle drives towards the runway hold line.', 'The hold line is tagged as a danger area.',
        'The driver receives a warning about the tagged danger area.'], // Yitro, decision 13: exact
      without: ['A vehicle drives towards the runway hold line.', 'Nothing extra reminds the driver.'] } }
  };
  WIN.Seaport.L = SITE.Seaport.L;
  const LABEL = {
    Worker: 'Plan view of an apron. Carts hide a worker from a tug. With VZ the driver is warned when their bubbles touch. Without VZ the driver stops hard.',
    Seaport: 'Plan view of a container yard. In development: a straddle carrier driver will be warned about a worker hidden by containers. Without VZ the driver stops hard.',
    Aircraft: 'Plan view of a parked aircraft with its own bubble. With VZ a truck backing towards the wing is warned and stops short. Without VZ nothing tells the driver.',
    Runway: 'Plan view of a road to a runway hold line, tagged as a danger area. With VZ the driver receives a warning about the tagged danger area. Without VZ nothing extra reminds the driver.'
  };
  // The kit frames each run by its options; an older kit reads x, y, w and h (the last run's).
  let last = { show: 'All', site: 'Airport' };
  const pick = (o, key) => { const w = WIN[win(o || last)]; return w[key] || (key === 'portrait' ? w.focus : WIN.All[key]); };
  function framed(key) { const f = (o) => pick(o, key); for (const k of 'xywh') Object.defineProperty(f, k, { get: () => pick(last, key)[k] }); return f; }

  /* ---------------------------------------------------------------- ground */
  function roads(g, apron) {
    const P = (pts) => g.pavement(pts, { grid: apron ? 200 : 160 }), top = apron ? 60 : -140;
    P([[260, -900], [LANE[0], -900], [LANE[0], 1900], [260, 1900]]);
    P([[LANE[1], top], [ROAD[0], top], [ROAD[0], 1900], [LANE[1], 1900]]);
    for (const x of [...LANE, ...ROAD]) g.marking([[x, x === ROAD[1] ? -900 : -900], [x, 1900]], { w: 4, alpha: 0.5 });
    g.marking([[2330, -900], [2330, 1900]], { dash: [50, 50], w: 4, alpha: 0.55 }); // the service lane is one way
  }
  function airport(g) {
    const grass = (pts) => g.pavement(pts, { fill: '#20272B', grid: 0 });
    grass([[LANE[1], -900], [ROAD[0], -900], [ROAD[0], 60], [LANE[1], 60]]); grass([[ROAD[1], -900], [4000, -900], [4000, 1900], [ROAD[1], 1900]]);
    roads(g, true);
    g.pavement([[1880, -500], [4000, -500], [4000, 60], [1880, 60]], { fill: '#23292D', grid: 0 }); // the runway
    g.marking([[1880, 50], [4000, 50]], { w: 6, alpha: 0.7 }); g.marking([[1880, -490], [4000, -490]], { w: 6, alpha: 0.7 });
    g.marking([[2160, -220], [4000, -220]], { dash: [240, 160], w: 8, alpha: 0.75 });
    g.marking([[1886, -490], [1886, 50]], { w: 10, alpha: 0.6 }); // the runway's end
    g.marking([[ROAD[0], 210], [ROAD[1], 210]], { w: 5, alpha: 0.75 }); g.marking([[ROAD[0], 196], [ROAD[1], 196]], { w: 5, alpha: 0.75 }); // hold line: solid on the holding side
    g.marking([[ROAD[0], 182], [ROAD[1], 182]], { dash: [30, 22], w: 5, alpha: 0.75 }); g.marking([[ROAD[0], HOLD], [ROAD[1], HOLD]], { dash: [30, 22], w: 5, alpha: 0.75 });
    g.building(-800, -900, 1060, 2800, { height: 1.4, seed: 11 });
    g.building(250, 446, 70, 84, { height: 0.6, tone: '#353D42' }); g.building(320, 470, 250, 38, { height: 0.5, tone: '#353D42' }); // jet bridge
    g.marking([[280, 560], [1440, 560]], { w: 5, alpha: 0.38 }); g.marking([[472, 520], [472, 600]], { w: 9, alpha: 0.5 });
    g.marking([[300, 40], [1470, 40], [1470, 1080], [300, 1080], [300, 40]], { dash: [28, 22], w: 4, alpha: 0.3 });
    for (const [x, y] of SITE.Airport.tags.slice(0, 5)) g.pylon(x, y);
    for (const x of [ROAD[0] - 16, ROAD[1] + 16]) { g.ctx.fillStyle = '#56616A'; g.ctx.fillRect(x - 7, HOLD + 14, 14, 16); } // hold-line signs
    for (const y of [1012, 1138, 1264]) g.vehicle('cart', { x: 1525, y, a: Math.PI / 2 });
    g.stack(1735, 385, 1, 5, { l: 90, height: 0.7, seed: 3 }); g.stack(1735, 990, 1, 5, { l: 90, height: 0.7, seed: 4 });
    g.aircraft({ x: 930, y: 560, a: Math.PI }, { l: 860 });
  }
  function seaport(g) {
    const c = g.ctx;
    roads(g, false);
    for (const y of [-330, 100, 520, 1060]) for (const x of [80, 600, 1100]) if (y < 1060 || x > 80) g.stack(x, y, 1, 3, { height: 1.1 });
    g.stack(2500, -340, 1, 3, { l: 244, height: 1.1, seed: 9 }); g.stack(2500, 420, 1, 4, { l: 244, height: 1.1, seed: 8 });
    g.marking([[ROAD[0], 210], [ROAD[1], 210]], { w: 9, alpha: 0.72 }); g.marking([[ROAD[0], 186], [ROAD[1], 186]], { dash: [30, 22], w: 5, alpha: 0.6 });
    g.stack(1810, 385, 1, 5, { l: 244, height: 1.1, seed: 5 }); g.stack(1810, 990, 1, 5, { l: 244, height: 1.1, seed: 6 });
    g.stack(2500, -96, 1, 2, { l: 244, height: 1, seed: 7 });
    // a yard gantry crane: legs either side of the truck road and the block it works, a trolley lifting a box
    const [sx, sy] = g.shade(26, 32); c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(2160 + sx, -130 + sy, 620, 290);
    c.fillStyle = '#8F999F'; c.fillRect(2160, -130, 40, 290); c.fillRect(2740, -130, 40, 290); c.fillRect(2160, -130, 620, 30); c.fillRect(2160, 130, 620, 30);
    const [tx, ty] = g.shade(14, 18); c.fillStyle = 'rgba(3,5,7,.35)'; c.fillRect(2208 + tx, -48 + ty, 244, 98);
    g.container(2330, 1, 0, { l: 244, tone: '#4A5257' }); c.fillStyle = '#A3ACB1'; c.fillRect(2290, -100, 80, 230);
  }

  /* ---------------------------------------------------------------- motion */
  // Bubbles. A moving vehicle's bubble reaches ahead of it with speed; a person's is round.
  function bigB(S, b) { const k = S.big, e = b.v * 1.2, p = k.R.at(b.s + k.off + e / 2); return { x: p.x, y: p.y, a: p.a, rx: k.half + 120 + e / 2, ry: k.hw + 120, n: 2.6 }; }
  function smallB(S, m) { const k = S.small, e = m.v * 1.2, p = k.R.at(m.s + e / 2); return { x: p.x, y: p.y, a: p.a, rx: k.hl + 120 + e / 2, ry: k.hw + 110, n: 2.6 }; }
  const walkB = (S, w) => { const p = S.walk.at(w.s); return { x: p.x, y: p.y, a: 0, rx: W_BUB, ry: W_BUB }; };

  function init(o) {
    last = o;
    const fm = WIN[win(o)].fm, ms = fm ? 2600 - SITE[o.site].small.hl - fm : SITE[o.site].small.s0;
    return {
      end: null, over: false, ev: [], site: o.site, win: win(o),
      k: { s: o.vz ? 0 : 60, v: 120, mode: 'go', brake: 0, hard: false, stop: 0, caught: null, brakeAt: null, stopAt: null, skid: null },
      b: { s: SITE[o.site].big.s0, v: SITE[o.site].big.v, mode: 'go', brake: 0, hard: false, stop: 0, caught: null, seen: null, seenFor: 0, brakeAt: null, stopAt: null, skid: null },
      w: { s: 0, v: 62, go: null, vis: 0 },
      m: { s: ms, v: SITE[o.site].small.v, mode: 'go', brake: 0, hard: false, stop: 0, caught: null, brakeAt: null, stopAt: null, skid: null }
    };
  }
  // Brake towards an arc length: calm (a smooth ramp) or hard (full at once). Returns the new speed.
  function brakeTo(u, T, dt, hard) {
    const rem = u.stop - u.s;
    if (rem <= 0.5 || u.v < 4) { u.v = 0; u.mode = 'stopped'; u.stopAt = T; return; }
    const need = (u.v * u.v) / (2 * rem), ramp = hard ? Math.max(1, 230 / need) : 0.35 + 0.65 * K.ease.smooth((T - u.brakeAt) / 0.5); // a hard stop is never gentler than ~5.7 m/s2
    u.v = Math.max(0, u.v - need * ramp * dt); u.brake = hard ? 1 : 0.5;
  }
  // The catering truck reverses north to the wing tip; its rear is at y = 1560 - k.s.
  const TR = K.route([[1000, 2600], [1000, -600]]), kPose = (k) => ({ x: 1000, y: 1760 - k.s, a: Math.PI / 2 });
  const truckB = (k) => { const e = k.v * 1.2; return { x: 1000, y: 1760 - k.s - e / 2, a: Math.PI / 2, rx: 320 + e / 2, ry: 160, n: 2.6 }; };
  function truck(s, T, dt, o) { // warned, it stops short; unwarned, it stops hard late
    const k = s.k;
    if (o.vz && k.caught == null && K.bubbleGap(truckB(k), SITE.Airport.assets[0]) <= 0) k.caught = T;
    if (k.mode === 'go' && (o.vz ? k.caught != null && T >= k.caught + 0.45 : k.s >= 520)) { k.mode = 'brake'; k.brakeAt = T; k.hard = !o.vz; k.stop = o.vz ? 455 : 556; if (k.hard) k.skid = k.s; }
    if (k.mode === 'brake') brakeTo(k, T, dt, k.hard);
    k.s += k.v * dt;
    if (s.end == null && k.stopAt != null && T > k.stopAt + (o.vz ? 2.4 : 1.4)) s.end = T;
  }
  function update(s, dt, o) {
    const S = SITE[o.site], T = s.t + dt, b = s.b, w = s.w, m = s.m, kb = S.big, km = S.small;
    if (s.win === 'Aircraft') { truck(s, T, dt, o); s.over = s.end != null && T > s.end + 0.3; return; }
    const hasM = has(o, 'm'), hasB = has(o, 'b');
    const bp = kb.R.at(b.s), wp = S.walk.at(w.s), eye = kb.R.at(b.s + kb.hl - 14);
    // The driver's sight: the cone, cut by the parked units.
    w.seenFor = K.sees(eye, eye.a, HALF, 1500, wp, S.occ) ? w.seenFor + dt : 0;
    if (b.seen == null && w.seenFor >= 0.1) b.seen = T;
    w.vis = clamp(w.vis + (K.occluded(eye, wp, S.occ) ? -dt : dt) / 0.2);
    if (o.vz) {
      if (hasB && b.caught == null && K.bubbleGap(bigB(S, b), walkB(S, w)) <= 0) { b.caught = T; s.ev.push({ i: 0, t: T }); } // the driver only
      if (hasM && m.caught == null && K.bubbleGap(smallB(S, m), S.zone) <= 0) { m.caught = T; s.ev.push({ i: 1, t: T }); }
    }
    // The tug or carrier: warned, it stops short of the crossing; unwarned, it stops hard once the worker is seen.
    const cue = Math.min(b.caught ?? Infinity, b.seen ?? Infinity);
    if (hasB && b.mode === 'go' && b.brakeAt == null && w.s < S.sPast && T >= cue + (b.caught != null ? 0.45 : 0.35)) {
      b.mode = 'brake'; b.brakeAt = T; b.hard = b.caught == null;
      b.stop = CY - R_W - (b.hard ? 24 : 110) + 1200 - kb.hl; if (b.hard) b.skid = b.s;
    }
    if (b.mode === 'brake') brakeTo(b, T, dt, b.hard);
    else if (b.mode === 'stopped') { if (w.s >= S.sPast && T > b.stopAt + 0.4) b.mode = 'go'; }
    else { b.brake = 0; b.v = Math.min(kb.v, b.v + 120 * dt); }
    if (hasB) b.s += b.v * dt;
    // The worker, in both runs (nobody warns her): she freezes when she steps out beside a moving vehicle or as it
    // brakes hard, and goes once it has stopped or passed.
    let target = 62, stopAt = null, dec = 240;
    if (w.go != null) target = 75;
    else {
      const bf = bFront(kb, b.s), near = w.s >= S.sEdge - 40 && b.mode !== 'stopped' && bf > CY - 30 && bf < CY + 2 * kb.hl + 60; // its body is alongside her line
      if (b.mode === 'stopped' ? T > b.stopAt + 0.7 : bf >= CY + 2 * kb.hl + 60) { if (w.s >= S.sEdge - 40) { w.go = T; target = 75; } }
      else if (near || (b.hard && b.brakeAt != null)) { stopAt = w.s; dec = 900; }
    }
    if (stopAt != null) target = Math.min(target, Math.sqrt(2 * dec * Math.max(0, stopAt - w.s)));
    if (hasB) { w.v += clamp(target - w.v, -dec * dt, 300 * dt); w.s = Math.min(S.walk.total, w.s + Math.max(0, w.v) * dt); }
    // The van or truck: warned, it holds short; unwarned, it crosses the line and only then stops hard.
    const front = mFront(km, m.s);
    // Without VZ the driver stops at the hold line unaided: nothing extra, no crossing (advisors, 13.11).
    if (hasM && !o.vz && m.seen == null && front < HOLD + 330) m.seen = T;
    const mcue = o.vz ? m.caught : m.seen;
    if (m.mode === 'go' && mcue != null && T >= mcue + (o.vz ? 0.45 : 0.35)) {
      m.mode = 'brake'; m.brakeAt = T; m.hard = false; m.stop = 2600 - km.hl - (o.vz ? 240 : HOLD + 50); if (m.hard) m.skid = m.s;
    }
    if (m.mode === 'brake') brakeTo(m, T, dt, m.hard);
    if (hasM) m.s += m.v * dt;
    if (s.end == null && s.win !== 'All') { // a plate's window ends once its own moment has settled
      if (!hasM) { if (b.stopAt != null && (o.vz ? w.s >= S.sPast && T > b.stopAt + 2.2 : T > b.stopAt + 1.5)) s.end = T; } // with VZ: once she is clear of its path
      else if (m.stopAt != null && T > m.stopAt + (o.vz ? 2.6 : 1.6)) s.end = T;
      if (T > 12) s.end = T;
    }
    if (s.end == null) {
      if (o.vz && m.stopAt != null && w.go != null && T > Math.max(m.stopAt + 2.6, w.go + 2.8)) s.end = T;
      else if (!o.vz && b.stopAt != null && m.stopAt != null && T > Math.max(b.stopAt + 2.6, m.stopAt + 1.8)) s.end = T;
      else if (T > 13) s.end = T;
    }
    s.over = s.end != null && T > s.end + 0.3;
  }

  /* --------------------------------------------------------------- picture */
  function skid(c, R, s0, s1, hw) {
    if (s0 == null || s1 - s0 < 2) return;
    const a = R.at(s0), z = R.at(s1 + 30), gr = c.createLinearGradient(a.x, a.y, z.x, z.y);
    gr.addColorStop(0, 'rgba(4,6,8,0)'); gr.addColorStop(0.35, 'rgba(4,6,8,.5)'); gr.addColorStop(1, 'rgba(4,6,8,.6)');
    c.strokeStyle = gr; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
    for (const d of [-hw + 10, hw - 10]) { c.moveTo(a.x + d, a.y); c.lineTo(z.x + d, z.y); }
    c.stroke();
  }
  function drawTruck(g, s, o, T, fade) {
    const k = s.k, A = SITE.Airport.assets[0], p = kPose(k), z = k.stopAt != null ? k.stopAt + 2 : null;
    if (k.skid != null) skid(g.ctx, TR, 680 + k.skid, 980 + k.s, 50);
    g.vehicle('truck', p, { l: 400, w: 100, brake: k.brake, lights: 1, phone: o.vz ? null : 'off' });
    if (o.vz) {
      const KB = truckB(k), al = k.caught == null ? 0 : clamp((T - k.caught) / 0.25);
      g.bubble(A, { strength: 0.7, alert: al * (z == null || T < z - 0.5 ? 1 : 0.4) }); g.bubble(KB, { alert: al }); g.overlap(KB, A, al);
      if (k.mode !== 'stopped') g.trail(TR, 1046 + k.s, k.mode === 'brake' ? k.stop - k.s : k.v * 1.6, { gap: 15 });
      for (const [x, y] of SITE.Airport.tags.slice(0, 5)) g.tag(x, y);
      g.device(1000, p.y + 40);
      if (k.caught != null) { g.catchFx(1000, p.y + 40, T - k.caught); g.flash(p, T - k.caught, { l: 400, w: 100 }); }
    } else if (k.brakeAt != null) g.flash(p, T - k.brakeAt, { l: 400, w: 100, tone: 'alert' });
    g.chip(1000, p.y - 200, o.vz ? 'Aircraft behind' : 'Hard stop', { tone: o.vz ? null : 'alert', k: fade(o.vz ? k.caught : k.brakeAt, z && (o.vz ? z - 0.2 : z)), side: 'right', gap: 70 });
  }
  function draw(g, s, o) {
    const S = SITE[o.site], T = s.t, c = g.ctx, b = s.b, w = s.w, m = s.m, kb = S.big, km = S.small;
    const fade = (a, z) => (a == null ? 0 : clamp((T - a) / 0.22) * (z == null ? 1 : 1 - clamp((T - z) / 0.3)));
    if (s.win === 'Aircraft') return drawTruck(g, s, o, T, fade);
    const hasM = has(o, 'm'), hasB = has(o, 'b');
    const bp = kb.R.at(b.s), mp = km.R.at(m.s), wp = S.walk.at(w.s), wpose = { x: wp.x, y: wp.y, a: Math.PI }, eye = kb.R.at(b.s + kb.hl - 14);
    if (hasM) { skid(c, km.R, m.skid, m.s, km.hw); g.vehicle(km.kind, mp, { brake: m.brake, lights: 1, phone: o.vz ? null : 'off' }); }
    if (hasB) {
      skid(c, kb.R, b.skid, b.s, kb.hw); if (kb.tow) g.vehicle('cart', kb.R.at(b.s - 134));
      g.vehicle(kb.kind, bp, { brake: b.brake, lights: 1, phone: o.vz ? null : 'off', load: kb.load });
      g.person(wpose, { r: R_W, alpha: w.vis, phone: o.vz ? null : 'off' }); g.cone(eye, eye.a, HALF, 1500, S.occ, { k: 0.9 });
    }
    if (hasM) g.label(S.place[1], S.place[2], S.place[0]);
    if (o.vz) {
      const BB = bigB(S, b), MB = smallB(S, m), WB = walkB(S, w), al = (t0) => (t0 == null ? 0 : clamp((T - t0) / 0.25));
      for (const a of S.assets) g.bubble(a, { strength: 0.7 });
      g.bubble(S.zone, { strength: 0.75, alert: al(m.caught) * (m.stopAt == null || T < m.stopAt + 1.5 ? 1 : 0.4) });
      const len = (u, k) => (u.mode === 'brake' ? u.stop - u.s : u.mode === 'stopped' ? 0 : u.v * 1.6);
      if (hasM) { g.bubble(MB, { alert: al(m.caught) }); g.overlap(MB, S.zone, al(m.caught)); }
      if (hasB) {
        g.bubble(BB, { alert: al(b.caught) }); g.bubble(WB); g.overlap(BB, WB, al(b.caught)); // her bubble stays calm: she is not warned
        if (w.vis < 1) g.person(wpose, { r: R_W, ghost: true, alpha: 1 - w.vis });
        g.trail(kb.R, b.s + kb.hl + 6, len(b), { gap: 15 });
        g.trail(S.walk, w.s + R_W, w.s >= S.walk.total - 2 ? 0 : 150);
      }
      if (hasM) g.trail(km.R, m.s + km.hl + 6, len(m), { gap: 15 });
      for (const [x, y] of S.tags) g.tag(x, y);
      if (hasB) { g.device(bp.x, bp.y); g.device(wp.x, wp.y); }
      if (hasM) g.device(mp.x, mp.y);
      if (hasB && b.caught != null) { g.catchFx(bp.x, bp.y, T - b.caught); g.flash(bp, T - b.caught, { l: kb.hl * 2, w: kb.hw * 2 }); } // the driver only
      if (hasM && m.caught != null) { g.catchFx(mp.x, mp.y, T - m.caught); g.flash(mp, T - m.caught, { l: km.hl * 2, w: km.hw * 2 }); }
      if (hasB) g.chip(bp.x, bp.y, S.chips[0], { k: fade(b.caught, b.stopAt != null ? b.stopAt + 1.4 : null), side: s.win === 'All' && g.cam.h < 260 ? 'down' : 'left', gap: 40 }); // a short stage: behind the tug, clear of the phone view
      if (hasM) g.chip(mp.x, mp.y, S.chips[2], { k: fade(m.caught, m.stopAt != null ? m.stopAt + 2 : null), side: 'right', gap: 40 });
      if (s.win === 'All' && b.caught != null) g.phone('tl', 'Tug driver’s phone', [S.chips[0], 'On foot'], { k: fade(b.caught, b.stopAt != null ? b.stopAt + 1.4 : null), note: true, map: true, margin: 8, beat: T - b.caught }); // the warning, as he gets it; last, over the chips
    } else {
      if (hasB && b.brakeAt != null) { g.flash(bp, T - b.brakeAt, { l: kb.hl * 2, w: kb.hw * 2, tone: 'alert' }); g.chip(bp.x, bp.y, 'Hard stop', { tone: 'alert', k: fade(b.brakeAt, b.stopAt != null ? b.stopAt + 2 : null), side: 'left', gap: 40 }); }
    }
  }

  K.mount({
    el: '#sim',
    label: Object.assign((o) => LABEL[win(o)] || HERO_LABEL, { toString: () => HERO_LABEL }),
    focus: framed('focus'), // the hero keeps its frame; each plate frames its moment
    portraitFocus: framed('portrait'), // on a phone the plan turns, so the whole aircraft, the tug and the hold line stay in the frame
    compare: false, // the scene stays With VZ; Without VZ is the toggle
    options: { site: 'Airport', show: 'All' },
    // Hidden: the hero offers neither (seaports are In development, SPEC 15); the plates set them.
    choices: [{ name: 'show', label: 'Show', values: SHOWS, hidden: true }, { name: 'site', label: 'Site', values: SITES, hidden: true }],
    statuses: STATUS,
    start: (o) => { const w = win(o); return w === 'All' ? (o.compare && !o.vz ? 1 : 0) : WIN[w].start[o.vz ? 0 : 1]; },
    actAt: (o, s) => SITE[o.site].big.R.at(s.b.s), // a tap on the tug drives it
    act: 'Drive the tug', // the stage's own button: the visitor's tap plays the event
    still: (vz, o) => WIN[win(o || last)].still[vz ? 0 : 1],
    lines: (o) => {
      const w = win(o); if (w !== 'All') return o.vz ? WIN[w].L.with : WIN[w].L.without;
      const L = SITE[o.site].L; return o.compare && !o.vz ? [L.again, L.without[1], L.without[2]] : o.vz ? L.with : L.without;
    },
    beat(s, o) {
      const b = s.b, m = s.m, k = s.k;
      switch (s.win) {
        case 'Worker': case 'Seaport': return o.vz ? (b.brakeAt != null ? 2 : b.caught != null ? 1 : 0) : b.brakeAt != null ? 1 : 0;
        case 'Aircraft': return o.vz ? (k.caught != null ? 2 : s.t > 1.9 ? 1 : 0) : k.brakeAt != null ? 1 : 0;
        case 'Runway': return o.vz ? (m.brakeAt != null ? 2 : m.caught != null ? 1 : 0) : s.t > 1.9 ? 1 : 0;
      }
      if (o.vz) return m.stopAt != null && s.t > m.stopAt + 0.3 ? 3 : b.mode === 'stopped' || s.w.go != null ? 2 : b.caught != null ? 1 : 0;
      return m.brakeAt != null ? 2 : b.brakeAt != null ? 1 : 0;
    },
    debug: (s) => ({ win: s.win, bCaught: s.b.caught, mCaught: s.m.caught, kCaught: s.k.caught, end: s.end, over: s.over }),
    init, update, draw, ground: (g, o) => (o.site === 'Seaport' ? seaport(g) : airport(g))
  });
})();
