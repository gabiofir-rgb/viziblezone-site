/* Public safety, in the field and in the city (plan 3.2; advisors' fold 13.11.2026, item 4): three micro-demos for the
   Show me plates of the public-safety page. One mount; the option `demo` picks the demo. No line runs from phone to
   phone and no phone lights where nobody is: a message is a zone, a catch or a lit place. Synthetic only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, rgba, C } = K, { min, max, hypot, sqrt, sin, cos, PI } = Math, TAU = 2 * PI;
  const IDS = ['crews', 'app', 'fixed'], R_P = 11;
  const F = (x, y, w, h) => ({ x: x - w / 2, y: y - h / 2, w, h }); // a frame by its centre
  const since = (T, t, d) => (t == null ? 0 : clamp((T - t) / d));
  const fade = (T, a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
  const dist = (p, q) => hypot(p.x - q.x, p.y - q.y);
  const TURNED = { up: 'left', down: 'right', left: 'down', right: 'up' }; // the same side once the plan turns on a tall stage
  const say = (g, p, text, k, side = 'up') => g.chip(p.x, p.y, text, { k, side: g.portrait ? TURNED[side] : side, gap: 18 });
  const body = (g, p, vz) => g.person(p, { r: R_P, phone: vz ? null : 'off' }); // with VZ the lit dot comes after
  const line = (g, pts, w, col) => { const c = g.ctx; c.lineJoin = c.lineCap = 'round'; g.path(pts, false); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  function off(pts, x, y) { // distance from a point to a polyline
    let m = 1e9;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, u = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));
      m = min(m, hypot(ax + dx * u - x, ay + dy * u - y));
    }
    return m;
  }
  // A mobile mast from above, as in the public-safety scene; k strikes it through (the network is down).
  function mast(g, x, y) {
    const c = g.ctx, p = [0, 1, 2].map((i) => [x + cos(-PI / 2 + (i * TAU) / 3) * 30, y + sin(-PI / 2 + (i * TAU) / 3) * 30]);
    g.marking([[x - 70, y - 70], [x + 70, y - 70], [x + 70, y + 70], [x - 70, y + 70], [x - 70, y - 70]], { dash: [10, 10], w: 3, alpha: 0.25 });
    c.strokeStyle = '#7C878E'; c.lineWidth = 4; g.path(p).stroke();
    c.lineWidth = 1.5 * g.px; c.beginPath(); for (const [a, b] of p) { c.moveTo(x, y); c.lineTo(a, b); } c.stroke();
    c.fillStyle = '#8F999F'; for (let i = 0; i < 3; i++) { c.save(); c.translate(x, y); c.rotate(-PI / 2 + (i * TAU) / 3); c.fillRect(30, -11, 9, 22); c.restore(); }
  }
  function strike(g, x, y, k) {
    if (!(k > 0)) return;
    const c = g.ctx; c.save(); c.globalAlpha = k; c.strokeStyle = rgba('lane', 0.6); c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 62, y + 62); c.lineTo(x - 62 + 124 * min(1, k * 1.4), y + 62 - 124 * min(1, k * 1.4)); c.stroke(); c.restore();
  }
  const noSignal = (g, m, k) => g.label(m.x, m.y, 'No cellular network', { k, dy: 70 * g.cam.scale + 18 });
  function trees(seed, n, box, keep) { // seeded trees, clear of roads, lines and people
    const r = K.rng(seed), out = [], [x0, y0, x1, y1] = box;
    for (let i = 0; i < n * 20 && out.length < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), t = 26 + r() * 22;
      if (keep(x, y, t) || out.some(([a, b, c]) => hypot(a - x, b - y) < (c + t) * 0.85)) continue;
      out.push([x, y, t]);
    }
    return out;
  }

  /* 1. Utilities and field crews (Today): a valley line with no network */
  const CREWS = (() => {
    const ROAD = [[-700, 712], [100, 652], [560, 618], [900, 604], [1300, 616], [1700, 586], [2400, 556]];
    const PYL = [[-260, 470], [420, 440], [1110, 418], [1800, 400]], LINE = PYL.map(([x, y]) => [x, y]);
    const VAN = { x: 470, y: 618, a: -0.04 }, MATE = { x: 476, y: 506, a: -1.9 }, FAR = { x: 1074, y: 494, a: -1.95 }, MAST = { x: 790, y: 250 };
    const DRIVE = K.route([[VAN.x, VAN.y], [760, 606], [995, 601]], 160), BACK = K.route([[FAR.x, FAR.y], [1040, 592], [700, 607], [520, 614]], 60);
    const T0 = 1, Z = { rmax: 1300, period: 0.7, rings: 3, phase: T0, start: T0 };
    const TREES = trees(7, 150, [-900, -300, 2300, 1300], (x, y, t) => off(ROAD, x, y) < 66 + t || off(LINE, x, y) < 80 + t
      || [VAN, MATE, FAR].some((p) => hypot(p.x - x, p.y - y) < 110 + t) || hypot(MAST.x - x, MAST.y - y) < 120 + t || PYL.some(([a, b]) => hypot(a - x, b - y) < 70 + t));
    function pylon(g, x, y) { // a power-line pylon from above: its lattice footprint and its cross-arm
      const c = g.ctx, [sx, sy] = g.shade(6, 8);
      c.fillStyle = 'rgba(3,5,7,.38)'; c.fillRect(x - 22 + sx, y - 22 + sy, 44, 44); c.fillRect(x - 5 + sx, y - 66 + sy, 10, 132);
      c.strokeStyle = '#7C878E'; c.lineWidth = 4; c.strokeRect(x - 20, y - 20, 40, 40);
      c.lineWidth = 2; c.beginPath(); c.moveTo(x - 20, y - 20); c.lineTo(x + 20, y + 20); c.moveTo(x + 20, y - 20); c.lineTo(x - 20, y + 20); c.stroke();
      c.fillStyle = '#8F999F'; c.fillRect(x - 5, y - 64, 10, 128);
    }
    return {
      focus: F(790, 470, 1100, 619), portraitFocus: F(790, 480, 900, 1100),
      label: 'Plan of a valley road with a line of power pylons and no network. A utility crew works along it: one at the van, one at the next pylon, out of sight. With VZ, he talks to the crew and sends a message, phone to phone; the crew at the van hear him and drive up to him. Without VZ, he has to walk back to tell them.',
      lines: { with: ['A utility crew works along a valley line where there is no network.', 'One of them talks to the crew and sends a message, phone to phone.', 'The crew at the van hear it and drive up to him.'],
        without: ['A crew works where there is no network.', 'He has to walk back to tell them.'] },
      still: (vz) => (vz ? 3 : 2.6),
      ground(g) {
        const c = g.ctx;
        g.pavement([[-2400, -1800], [4200, -1800], [4200, 3000], [-2400, 3000]], { fill: '#20272B', grid: 0 }); // the valley floor
        c.strokeStyle = rgba('lane', 0.04); c.lineWidth = g.px; // the valley sides, as faint contours
        for (let i = -6; i < 9; i++) { if (!i) continue; c.beginPath(); for (let x = -1600; x <= 3200; x += 60) c.lineTo(x, 600 + i * 140 + 44 * sin(x / 260 + i * 1.7)); c.stroke(); }
        line(g, ROAD, 78, rgba('lane', 0.05)); line(g, ROAD, 70, '#2D3439'); // a service road along the valley
        for (const [x, y, t] of TREES) g.tree(x, y, t);
        mast(g, MAST.x, MAST.y);
        for (const [x, y] of PYL) pylon(g, x, y);
        c.strokeStyle = rgba('lane', 0.22); c.lineWidth = 1.3 * g.px; c.beginPath(); // the conductors, arm to arm
        for (let i = 1; i < PYL.length; i++) for (const d of [-58, 0, 58]) { c.moveTo(PYL[i - 1][0], PYL[i - 1][1] + d); c.lineTo(PYL[i][0], PYL[i][1] + d); }
        c.stroke();
      },
      init: () => ({ v: 0, d: 0, brake: 0, w: 0, vanC: null, mateC: null, go: null, end: null }),
      update(s, dt, o) {
        const T = s.t + dt;
        if (!o.vz) { if (T > 1.5) s.w = min(BACK.total, s.w + 70 * clamp((T - 1.5) / 0.5) * dt); if (T > 5) s.end = s.end ?? T; return; }
        if (s.vanC == null && K.zoneCrossed(s.t, T, dist(FAR, VAN), Z)) s.vanC = T;
        if (s.mateC == null && K.zoneCrossed(s.t, T, dist(FAR, MATE), Z)) s.mateC = T;
        if (s.vanC != null && s.go == null && T > s.vanC + 0.8) s.go = T;
        if (s.go == null) return;
        const left = DRIVE.total - s.d, v = min(s.v + 200 * dt, 260, sqrt(2 * 160 * max(0, left)));
        s.brake = v < s.v - 1e-6 ? 0.5 : 0; s.v = v; s.d = min(DRIVE.total, s.d + v * dt);
        if (left < 2) { s.brake = 0.3; s.end = s.end ?? T + 0.2; }
      },
      beat: (s, o) => (o.vz ? (s.go != null ? 2 : s.t > T0 ? 1 : 0) : s.t > 1.4 ? 1 : 0),
      draw(g, s, o) {
        const T = s.t, vz = o.vz, vp = DRIVE.at(s.d), van = { x: vp.x, y: vp.y, a: s.d > 0 ? vp.a : VAN.a };
        const far = vz || s.w <= 0 ? FAR : (() => { const p = BACK.at(s.w); return { x: p.x, y: p.y, a: p.a }; })();
        g.vehicle('van', van, { phone: vz ? null : 'off', brake: s.brake });
        body(g, MATE, vz); body(g, far, vz);
        strike(g, MAST.x, MAST.y, 1);
        if (vz) {
          g.zone(FAR.x, FAR.y, Object.assign({ strength: 1 - since(T, T0 + 2.4, 0.6) }, Z));
          for (const p of [van, MATE, FAR]) g.device(p.x, p.y);
          if (s.vanC != null) g.catchFx(van.x, van.y, T - s.vanC);
          if (s.mateC != null) g.catchFx(MATE.x, MATE.y, T - s.mateC);
          g.flash(FAR, T - T0, { l: 2 * R_P, w: 2 * R_P });
        }
        noSignal(g, MAST, 1);
        if (!vz) return;
        say(g, FAR, 'Talking', fade(T, T0, T0 + 2.4));
        say(g, MATE, 'Hears him', fade(T, s.mateC));
        say(g, van, 'Message: fault here', fade(T, s.vanC == null ? null : s.vanC + 0.5), 'down');
      }
    };
  })();

  /* 2. Inside the apps people already have (Today): a town square with an emergency app */
  const APP = (() => {
    const PLAZA = [420, 260, 1260, 760], MAST = { x: 1180, y: 340 }, BENCH = [[560, 560, 92, 20], [930, 700, 92, 20], [760, 300, 20, 80]];
    const PEOPLE = (() => { // a dozen people crossing the square; three of them do not have the app
      const r = K.rng(31), out = [];
      for (let i = 0; i < 400 && out.length < 12; i++) {
        const x = 500 + r() * 600, y = 370 + r() * 290, a = r() * TAU, v = 16 + r() * 18, ex = x + cos(a) * v * 7, ey = y + sin(a) * v * 7;
        if (ex < 480 || ex > 1200 || ey < 320 || ey > 690 || (ex < 600 && ey > 600)) continue; // stays on the square, clear of the inset
        if (out.some((p) => hypot(p.x - x, p.y - y) < 80 || hypot(p.x + cos(p.a) * p.v * 7 - ex, p.y + sin(p.a) * p.v * 7 - ey) < 70)
          || [[x, y], [ex, ey]].some(([u, w]) => hypot(MAST.x - u, MAST.y - w) < 130) || BENCH.some(([bx, by, w, h]) => x > bx - 40 && x < bx + w + 40 && y > by - 40 && y < by + h + 40)) continue;
        out.push({ x, y, a, v, app: out.length % 4 !== 3 });
      }
      return out;
    })();
    const at = (p, T) => ({ x: p.x + cos(p.a) * p.v * T, y: p.y + sin(p.a) * p.v * T, a: p.a });
    const TF = (o) => (o.vz ? 3.6 : 1); // the network fails
    function inset(g, mark) { // a second view: a phone with the emergency app, and VZ inside it (mark 0..1)
      const c = g.ctx, b = g.inset('bl', 176, 112), x = b.x + 12, y = b.y + 30;
      g.text(x, b.y + 22, 'An emergency app', { size: 13 });
      c.strokeStyle = rgba('lane', 0.5); c.lineWidth = 1.25; c.strokeRect(x + 0.5, y + 0.5, 46, 70);
      c.fillStyle = rgba('lane', 0.3); c.fillRect(x + 18, y + 4, 11, 2);
      for (let i = 0; i < 4; i++) { c.fillStyle = rgba('lane', i ? 0.1 : 0.28); c.fillRect(x + 5 + (i % 2) * 20, y + 12 + ((i / 2) | 0) * 20, 16, 16); }
      if (mark > 0) {
        c.strokeStyle = rgba('zone', mark); c.lineWidth = 1.5; c.beginPath(); c.arc(x + 13, y + 20, 6, 0, TAU); c.stroke();
        c.fillStyle = rgba('zone', mark); c.beginPath(); c.arc(x + 13, y + 20, 2.4, 0, TAU); c.fill();
        g.text(x + 60, y + 44, 'Already installed', { weight: 400, alpha: 0.9 * mark });
      }
      g.world();
    }
    return {
      focus: F(840, 500, 1100, 619), portraitFocus: F(840, 510, 900, 1100),
      label: 'Plan of a town square where people carry an emergency app they already use. With VZ, Vizible Zone is delivered inside that app; when the network fails, their phones are ready, and nobody installs anything that day. Without VZ, the network fails and nobody\'s phone can reach anyone.',
      lines: { with: ['People in a town square carry an emergency app they already use.', 'Vizible Zone is delivered inside that app, as an SDK.', 'When the network fails, their phones are ready. Nobody installs anything that day.'],
        without: ['The network fails.', 'Nobody\'s phone can reach anyone.'] },
      still: (vz) => (vz ? 4.4 : 2.6),
      ground(g) {
        const c = g.ctx, [x0, y0, x1, y1] = PLAZA, rnd = K.rng(3);
        const row = (x, x2, y, h) => { while (x < x2 - 40) { let w = 170 + rnd() * 190; if (x2 - x - w < 120) w = x2 - x; g.building(x, y, w - 12, h, { seed: (x * 7 + y) | 0 }); x += w; } };
        row(-700, 2300, -500, 648); row(-700, 2300, 872, 600); row(-700, 308, 160, 700); row(1372, 2300, 160, 700);
        g.pavement([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { fill: '#283035', grid: 80 });
        g.kerb([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]);
        for (const pts of [[[-700, 210], [2300, 210]], [[-700, 810], [2300, 810]], [[370, -100], [370, 1100]], [[1310, -100], [1310, 1100]]]) g.marking(pts, { dash: [110, 130] });
        for (const [x, y, w, h] of BENCH) { const [sx, sy] = g.shade(3, 4); c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(x + sx, y + sy, w, h); c.fillStyle = '#4F585E'; c.fillRect(x, y, w, h); }
        mast(g, MAST.x, MAST.y);
      },
      init: () => ({ end: null }),
      update(s, dt, o) { const T = s.t + dt; if (T > (o.vz ? 6.4 : 5)) s.end = s.end ?? T; },
      beat: (s, o) => (o.vz ? (s.t > TF(o) ? 2 : s.t > 1 ? 1 : 0) : s.t > 1.6 ? 1 : 0),
      draw(g, s, o) {
        const T = s.t, vz = o.vz, tf = TF(o), P = PEOPLE.map((p) => [at(p, T), p.app]);
        for (const [p, app] of P) body(g, p, vz && app);
        strike(g, MAST.x, MAST.y, since(T, tf, 0.35));
        if (vz) P.forEach(([p, app], i) => {
          if (!app) return;
          const t0 = tf + 0.15 + (i % 5) * 0.08; // ready: each phone opens its own quiet zone once
          if (T > t0 && T < t0 + 1.6) g.zone(p.x, p.y, { rmax: 240, period: 1.6, rings: 1, phase: t0, start: t0, strength: 0.45, fill: false });
          g.device(p.x, p.y);
        });
        noSignal(g, MAST, since(T, tf, 0.22));
        inset(g, vz ? since(T, 1.8, 0.4) : 0);
      }
    };
  })();

  /* 3. Shelters and places indoors (Vision): two streets at night, and a shelter with thick walls */
  const FIXED = (() => {
    const SH = [500, 730, 400, 240], WALL = 30, BLOCKS = [[-500, 40, 1160, 480, 0.8], [-500, 640, 980, 600, 1.15], [740, 40, 1200, 480, 1.5], [920, 640, 1020, 600, 1.85]];
    const TS = 2.5; // when the alert is in the shelter
    const STREET = [{ x: 40, y: 496, a: 0, v: 22 }, { x: 330, y: 664, a: PI, v: 18 }, { x: 880, y: 498, a: 0, v: 20 }, { x: 1150, y: 664, a: PI, v: 24 }, { x: 1340, y: 500, a: PI, v: 16 }];
    const INSIDE = [{ x: 574, y: 800, a: 0.4 }, { x: 630, y: 902, a: -0.5 }, { x: 760, y: 790, a: 2.2 }, { x: 836, y: 886, a: 2.9 }, { x: 700, y: 856, a: -1.2 }];
    const LAMPS = [[160, 506, PI / 2], [560, 506, PI / 2], [960, 506, PI / 2], [1360, 506, PI / 2], [360, 654, -PI / 2], [1160, 654, -PI / 2]];
    const walk = (p, T) => ({ x: p.x + cos(p.a) * p.v * T, y: p.y, a: p.a });
    const blockAt = (p) => BLOCKS.find(([x, y, w, h]) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h);
    const reached = (p) => (blockAt(p) || [0, 0, 0, 0, 1])[4] + 0.15;
    return {
      focus: F(700, 640, 1100, 619), portraitFocus: F(700, 640, 900, 1100),
      label: 'Plan of a street at night with the networks down; people shelter indoors behind thick walls. A concept illustration of a vision: fixed points could support city-wide awareness, and this could help people, in the street and indoors, receive alerts. Without VZ, no alert reaches the street or the shelter.',
      lines: { with: ['The networks are down. People shelter indoors, behind thick walls.', 'Vision: fixed points could support city-wide awareness.', 'Vision: this could help people receive alerts.'], // Yitro, decision 14: exact
        without: ['The networks are down. People shelter indoors, behind thick walls.', 'No alert reaches the street or the shelter.'] },
      still: (vz) => (vz ? 3.4 : 2.6),
      ground(g) {
        const c = g.ctx, rnd = K.rng(17), [x, y, w, h] = SH, [sx, sy] = g.shade(12, 14);
        const row = (x0, x1, y0, h0) => { let u = x0; while (u < x1 - 40) { let bw = 160 + rnd() * 180; if (x1 - u - bw < 110) bw = x1 - u; g.building(u, y0, bw - 12, h0, { seed: (u * 3 + y0) | 0 }); u += bw; } };
        g.pavement([[-700, 470], [2300, 470], [2300, 520], [-700, 520]]); g.pavement([[-700, 640], [2300, 640], [2300, 690], [-700, 690]]);
        g.pavement([[660, -300], [740, -300], [740, 470], [660, 470]]);
        g.kerb([[-700, 520], [2300, 520]]); g.kerb([[-700, 640], [2300, 640]]); g.marking([[-700, 580], [2300, 580]], { dash: [110, 130] });
        row(-700, 640, 100, 350); row(760, 2300, 100, 350); row(-700, 470, 720, 420); row(930, 2300, 720, 420);
        c.fillStyle = 'rgba(3,5,7,.42)'; c.fillRect(x + sx, y + sy, w, h); // the shelter, open to the eye: thick walls, a floor, benches
        c.fillStyle = '#4A5257'; c.fillRect(x, y, w, h); c.fillStyle = '#262C31'; c.fillRect(x + WALL, y + WALL, w - 2 * WALL, h - 2 * WALL);
        c.fillStyle = '#3A4247'; c.fillRect(x + WALL + 8, y + h - WALL - 26, w - 2 * WALL - 16, 18); c.fillRect(x + WALL + 8, y + WALL + 8, 18, h - 2 * WALL - 60);
        c.strokeStyle = rgba('lane', 0.1); c.lineWidth = g.px; c.strokeRect(x + 6, y + 6, w - 12, h - 12);
        c.fillStyle = '#5A646B'; c.fillRect(x + w / 2 - 34, y, 68, WALL); // the heavy door
        for (const [lx, ly, a] of LAMPS) g.lamp(lx, ly, a);
      },
      init: () => ({ end: null }),
      update(s, dt, o) { const T = s.t + dt; if (T > (o.vz ? 6.2 : 5)) s.end = s.end ?? T; },
      beat: (s, o) => (o.vz ? (s.t > TS + 0.3 ? 2 : s.t > 0.8 ? 1 : 0) : s.t > 1.4 ? 1 : 0),
      draw(g, s, o) {
        const T = s.t, vz = o.vz, st = STREET.map((p) => walk(p, T)), lit = (t) => vz && T >= t;
        st.forEach((p, i) => body(g, p, lit(reached(STREET[i]))));
        INSIDE.forEach((p, i) => body(g, p, lit(TS + 0.1 + i * 0.06)));
        g.atmosphere('Night', { lamps: LAMPS });
        g.label(SH[0] + SH[2], SH[1] + SH[3] / 2, 'Shelter', { dx: 12, align: 'left' });
        if (!vz) return;
        for (const [x, y, w, h, t] of BLOCKS) g.wash(x, y, w, h, since(T, t, 0.5));
        g.wash(SH[0], SH[1], SH[2], SH[3], since(T, TS, 0.6));
        st.forEach((p, i) => { const t = reached(STREET[i]); if (T >= t) { g.device(p.x, p.y); g.catchFx(p.x, p.y, T - t); } });
        INSIDE.forEach((p, i) => { const t = TS + 0.1 + i * 0.06; if (T >= t) { g.device(p.x, p.y); g.catchFx(p.x, p.y, T - t); } });
        say(g, st[1], 'Alert', fade(T, reached(STREET[1]), TS), 'down');
        say(g, INSIDE[2], 'Alert', fade(T, TS + 0.22), 'up');
      }
    };
  })();

  /* ---------------------------------------------------------------------- mount */
  const D = { crews: CREWS, app: APP, fixed: FIXED }, at = (o) => D[o.demo] || CREWS;
  K.mount({
    el: '#sim',
    label: (o) => at(o).label, // each demo's own canvas label
    focus: (o) => at(o).focus, portraitFocus: (o) => at(o).portraitFocus,
    compare: false, // no statuses: the row carries the status
    options: { demo: IDS[0] },
    choices: [{ name: 'demo', label: 'Feature', values: IDS }], // micro hides it; the pack's own page shows it
    still: (vz, o) => at(o).still(vz),
    lines: (o) => at(o).lines[o.vz ? 'with' : 'without'],
    beat: (s, o) => at(o).beat(s, o),
    ground: (g, o) => at(o).ground(g, o),
    init: (o) => at(o).init(o),
    update(s, dt, o) { at(o).update(s, dt, o); s.over = s.end != null && s.t + dt > s.end + 0.3; }, // each demo sets s.end
    draw: (g, s, o) => at(o).draw(g, s, o),
    debug: (s) => ({ end: s.end })
  });
})();
