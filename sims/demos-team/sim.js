/* Public safety, the team (plan 3.1): six micro-demos on one wooded hillside with a track and no network. One mount;
   the option `demo` picks the demo. No line runs from phone to phone: a message is a zone and a catch. Synthetic only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, ease, lerp, rgba, C } = K, { sin, cos, atan2, min, max, hypot, pow, sqrt, PI } = Math, TAU = 2 * PI, rt = K.route;
  const IDS = ['ptt', 'sos', 'map', 'media', 'groups', 'asleep'];
  const Q = new URLSearchParams(location.search), EMBED = Q.get('embed') === '1' || Q.get('micro') === '1';
  const R_P = 11, Z = { rmax: 1000, period: 0.7, rings: 3 }, LIFE = 2.1;
  const dist = (p, q) => hypot(p.x - q.x, p.y - q.y), toward = (p, q) => atan2(q.y - p.y, q.x - p.x);
  const turn = (a, b, k) => a + atan2(sin(b - a), cos(b - a)) * clamp(k);
  const since = (T, t, d) => (t == null ? 0 : clamp((T - t) / d));
  const fade = (T, a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
  const all = (a, n) => a.filter((h) => h != null).length === n;
  const zFrom = (t0) => Object.assign({}, Z, { phase: t0, start: t0 });
  // The first ring of a call begun at t0 reaches a phone d away between s0 and s1 (each phone is marked once).
  const hears = (s0, s1, d, t0) => d <= Z.rmax * 0.95 && K.zoneCrossed(s0, s1, d, zFrom(t0));
  const TURNED = { up: 'left', down: 'right', left: 'down', right: 'up' }; // the same side once the plan turns on a portrait stage
  const say = (g, p, text, k, side = 'up', tone) => g.chip(p.x, p.y, text, { k, tone, side: g.portrait ? TURNED[side] : side, gap: 16 });
  const F = (x, y, w, h) => ({ x: x - w / 2, y: y - h / 2, w, h }); // a frame by its centre

  /* ------------------------------------------------------------------ the hillside */
  const TRACK = rt([[-700, 1010], [-200, 930], [200, 830], [520, 730], [760, 590], [900, 420], [1150, 320], [1460, 250], [1760, 110], [2300, -150]], 180);
  const on = (s) => TRACK.at(s), FORK = 1760, F0 = on(FORK), BRIDGE = on(1870);
  const SIDE = rt([[F0.x, F0.y], [830, 280], [770, 100], [800, -150], [900, -520]], 140); // the other path
  const STREAM = rt([[930, -700], [990, -100], [1010, 200], [1050, 400], [1100, 580], [1170, 780], [1180, 1020], [1120, 1400], [1160, 2000]], 140);
  const HEAD = { x: 40, y: 1010, r: 200 }, REST = { x: 440, y: 865, r: 120 }; // the trailhead clearing; the rest stop
  const SOS_AT = { x: 1188, y: 628 }, OFF_AT = { x: 1010, y: 800 }; // two places off the track, kept clear of trees
  function off(r, x, y) { // distance from a point to a route
    let m = 1e9; const P = r.pts;
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, u = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));
      m = min(m, hypot(ax + dx * u - x, ay + dy * u - y));
    }
    return m;
  }
  const TREES = (() => {
    const r = K.rng(11), out = [], clear = [[HEAD, HEAD.r], [REST, REST.r], [SOS_AT, 60], [OFF_AT, 60]];
    for (let i = 0; i < 2600 && out.length < 460; i++) {
      const x = -1100 + r() * 4000, y = -800 + r() * 2700, t = 24 + r() * 22;
      if (off(TRACK, x, y) < 50 + t || off(SIDE, x, y) < 36 + t || off(STREAM, x, y) < 34 + t) continue;
      if (clear.some(([p, d]) => hypot(p.x - x, p.y - y) < d + t) || out.some(([a, b, c]) => hypot(a - x, b - y) < (c + t) * 0.8)) continue;
      out.push([x, y, t]);
    }
    return out;
  })();
  const OCC = TREES.map(([x, y, t]) => ({ x, y, a: 0, l: t * 1.3, w: t * 1.3 })); // the trees hide people from each other
  function ground(g, o) {
    const c = g.ctx, px = g.px, line = (r, w, col) => { c.lineJoin = c.lineCap = 'round'; g.path(r.pts, false); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    const plank = (x, y, a, l, w, col) => { const [sx, sy] = g.shade(5, 6); c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(-l / 2 + sx, -w / 2 + sy, l, w); c.fillStyle = col; c.fillRect(-l / 2, -w / 2, l, w); c.strokeStyle = rgba('lane', 0.11); c.lineWidth = px; c.strokeRect(-l / 2 + 4, -w / 2 + 4, l - 8, w - 8); c.restore(); };
    const blob = (p, r) => { const q = K.rng(p.x * 7 + p.y); g.path(K.arcPts(p.x, p.y, r, 0, TAU, 18).map(([x, y]) => { const k = 0.9 + q() * 0.16; return [p.x + (x - p.x) * k, p.y + (y - p.y) * k]; })); c.fillStyle = '#283035'; c.fill(); };
    g.pavement([[-2400, -1800], [4200, -1800], [4200, 3000], [-2400, 3000]], { fill: '#20272B', grid: 0 }); // forest floor
    c.strokeStyle = rgba('lane', 0.045); c.lineWidth = px; // the slope, as faint contours
    for (let i = -9; i < 11; i++) { c.beginPath(); for (let x = -1800; x <= 3600; x += 60) c.lineTo(x, 1.1 * x + i * 290 - 900 + 46 * sin(x / 250 + i * 1.3)); c.stroke(); }
    blob(HEAD, HEAD.r); blob(REST, REST.r);
    line(STREAM, 56, '#1A2024'); line(STREAM, 30, '#12171A'); line(STREAM, 2, rgba('lane', 0.06));
    line(SIDE, 46, '#2A3136'); line(SIDE, 24, '#30373C');
    line(TRACK, 64, '#2C3338'); line(TRACK, 38, '#333A3F');
    plank(BRIDGE.x - 3, BRIDGE.y - 3, BRIDGE.a, 96, 72, '#4A5257'); // a plank bridge over the stream
    if (o.demo === 'sos') { c.globalAlpha = 0.6; line(rt([[1112, 362], [1150, 480], [SOS_AT.x - 4, SOS_AT.y - 22]], 60), 26, '#2E363B'); c.globalAlpha = 1; } // where she slid
    for (const [x, y, t] of TREES) g.tree(x, y, t);
    g.shelter(HEAD.x - 70, HEAD.y + 160, 120, 22); // the trailhead board
    plank(REST.x + 10, REST.y + 12, 0.25, 130, 24, '#4F585E'); // a log to sit on
    if (o.demo === 'media') { // the fallen tree across the track: root plate uphill, crown down the slope
      const b = on(2250), a = b.a + 1.3, u = cos(a), v = sin(a), P = (d, w) => [b.x + u * d - v * w, b.y + v * d + u * w];
      plank(...P(-20, 0), a, 300, 26, '#454D53'); plank(...P(-172, 0), a, 22, 78, '#3A4247');
      c.fillStyle = '#353D42'; for (const [d, w, r] of [[150, 0, 44], [196, 32, 38], [194, -34, 36], [236, 2, 32], [128, 40, 24], [128, -40, 24]]) { c.beginPath(); c.arc(...P(d, w), r, 0, TAU); c.fill(); }
      c.strokeStyle = rgba('lane', 0.13); c.lineWidth = 2 * px; c.beginPath(); for (const [d, w] of [[200, 40], [200, -40], [250, 6]]) { c.moveTo(...P(110, 0)); c.lineTo(...P(d, w)); } c.stroke();
    }
  }

  /* -------------------------------------------------------------- shared actors */
  const W = (route, s, v, a) => ({ rt: route, s, v, a }); // someone on a route: arc length, speed, a fixed heading if standing
  const go = (m, dt) => { if (m.v) m.s = clamp(m.s + m.v * dt, 0, m.rt.total); };
  const pose = (m) => { const p = m.rt.at(m.s); return { x: p.x, y: p.y, a: m.a != null ? m.a : m.v < 0 ? p.a + PI : p.a }; };
  const at = (x, y, a) => ({ x, y, a }), pt = (s, a) => { const p = on(s); return at(p.x, p.y, a ?? p.a); };
  const body = (g, p, vz) => g.person(p, { r: R_P, phone: vz ? null : 'off' });
  // A phone's zone while it sends, t0 to t1 (the kit's ring law); st < 1 is a quieter phone.
  function talk(g, p, T, t0, t1, st = 1) {
    if (T < t0) return;
    const c = g.ctx, px = g.px, f = since(T, t0, 0.3) * (1 - since(T, t1, 0.7));
    if (f > 0 && st === 1) { const R = Z.rmax / 2, gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); gr.addColorStop(0, rgba('zone', 0.26 * f)); gr.addColorStop(0.2, rgba('zone', 0.1 * f)); gr.addColorStop(1, rgba('zone', 0)); c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, R, 0, TAU); c.fill(); }
    for (let e = t0; e <= min(T, t1) + 1e-6; e += Z.period) {
      const q = (T - e) / LIFE; if (q <= 0 || q >= 1) continue;
      const a = st * pow(1 - q, 1.1) * min(1, q / 0.04);
      c.beginPath(); c.arc(p.x, p.y, Z.rmax * (1 - pow(1 - q, 1.7)), 0, TAU);
      for (const [k, w] of [[0.1, 7], [0.16, 3.5], [1, 1.6]]) { c.strokeStyle = rgba('zone', a * k); c.lineWidth = w * px; c.stroke(); }
    }
  }
  const press = (g, p, T, t0, vz) => g.flash(p, T - t0, { l: 2 * R_P, w: 2 * R_P, tone: vz ? null : 'alert' }); // the outline pulses
  const nowhere = (g, p, T, t0, side) => { press(g, p, T, t0, false); say(g, p, 'No network', fade(T, t0), side, 'alert'); }; // Without VZ
  const PLAN = 'Plan of a wooded hillside with a track and no network. ';

  /* 1. group push-to-talk */
  const PTT = (() => {
  const T0 = 1.0, T1 = 9; // she talks to the end of the run
  return {
    focus: F(900, 480, 1180, 664), portraitFocus: F(900, 480, 1000, 860),
    label: PLAN + 'A team is spread along it, out of sight of each other; a walker passes. With VZ, one of them talks and the whole group hears her, phone to phone; the walker hears nothing. Without VZ, nobody hears her.',
    lines: { with: ['A team is spread out on a hillside. There is no network here.', 'One of them presses and talks.', 'The whole group hears her, phone to phone. Nobody else does.'],
      without: ['The same hillside, with no network.', 'She talks, and nobody hears.'] },
    still: (vz) => (vz ? 3.3 : 2.2),
    init: () => ({ L: W(TRACK, 1650, 0, 2.5), team: [W(TRACK, 1170, 16), W(TRACK, 1400, 20), W(TRACK, 2000, -14), W(TRACK, 2260, 12)], walker: W(TRACK, 2330, -40), heard: [] }),
    update(s, dt, o) {
      const T = s.t + dt, L = pose(s.L);
      for (const m of s.team.concat(s.walker)) go(m, dt);
      if (o.vz) s.team.forEach((m, i) => { if (s.heard[i] == null && hears(s.t, T, dist(L, pose(m)), T0)) s.heard[i] = T; });
      s.end = o.vz ? 6.4 : 4.7;
    },
    beat: (s, o) => (o.vz && all(s.heard, 4) ? 2 : s.t > T0 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, L = pose(s.L), P = s.team.map(pose);
      for (const p of P.concat(L)) body(g, p, o.vz);
      body(g, pose(s.walker), false); // not in the group: his phone stays grey
      if (!o.vz) return nowhere(g, L, T, T0);
      talk(g, L, T, T0, T1);
      for (const p of P.concat(L)) g.device(p.x, p.y);
      s.heard.forEach((h, i) => g.catchFx(P[i].x, P[i].y, T - h));
      press(g, L, T, T0, true);
      say(g, L, 'Talking', fade(T, T0, T1 + 0.4));
      say(g, P[0], 'Hears her', fade(T, s.heard[0]), 'down'); say(g, P[3], 'Hears her', fade(T, s.heard[3]), 'down');
    }
  };
  })();

  /* 2. SOS with position */
  const SOS = (() => {
  const T0 = 1.0, ME = at(SOS_AT.x, SOS_AT.y, -2.2), BACK = [2, 3], STOP = [[-40, -18], [8, -42]]; // the two nearest turn back
  return {
    focus: F(980, 470, 1180, 664), portraitFocus: F(980, 470, 1000, 860),
    label: PLAN + 'One of a team has slipped off it by a stream, out of sight. With VZ, one press sends a call for help with her available position; teammates on supported phones in coverage see who is calling and where, and two turn back. Without VZ, nobody knows.',
    lines: { with: ['One of the team has slipped off the track, out of sight.', 'One press sends a call for help, with the available position.', 'Teammates on supported phones in coverage see who and where. Two turn back.'],
      without: ['She is off the track, out of sight.', 'Nobody knows she needs help, or where she is.'] },
    still: (vz) => (vz ? 3.4 : 2.4),
    init: () => ({ team: [W(TRACK, 1180, 20), W(TRACK, 1420, 22), W(TRACK, 1640, 18), W(TRACK, 2000, 16), W(TRACK, 2290, 14)], got: [], turned: null }),
    update(s, dt, o) {
      const T = s.t + dt;
      s.team.forEach((m, i) => {
        const p = pose(m);
        if (o.vz && s.got[i] == null && hears(s.t, T, dist(ME, p), T0)) { s.got[i] = T; m.v = 0; m.a = p.a; }
        if (s.got[i] != null && m.rt === TRACK) {
          m.a = turn(m.a, toward(p, ME), (T - s.got[i]) / 0.6); // everyone turns towards her
          if (BACK.includes(i) && T > s.got[i] + 0.7) { Object.assign(m, { rt: rt([[p.x, p.y], [lerp(p.x, ME.x, 0.5) - 30, lerp(p.y, ME.y, 0.5)], [ME.x + STOP[BACK.indexOf(i)][0], ME.y + STOP[BACK.indexOf(i)][1]]], 90), s: 0, v: 0, a: null }); s.turned = s.turned ?? T; }
        }
        if (m.rt !== TRACK) m.v = min(55, m.v + 110 * dt);
        go(m, dt);
      });
      s.end = o.vz ? 6.8 : 4.9;
    },
    beat: (s, o) => (o.vz ? (s.turned != null ? 2 : s.t > T0 ? 1 : 0) : s.t > T0 + 0.4 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, P = s.team.map(pose);
      for (const p of P.concat(ME)) body(g, p, o.vz);
      if (!o.vz) return nowhere(g, ME, T, T0, 'down');
      if (T > T0) g.zone(ME.x, ME.y, zFrom(T0));
      s.team.forEach((m) => { if (m.rt !== TRACK) g.trail(m.rt, m.s + R_P, m.rt.total - m.s - 8); });
      for (const p of P.concat(ME)) g.device(p.x, p.y);
      s.got.forEach((h, i) => g.catchFx(P[i].x, P[i].y, T - h));
      press(g, ME, T, T0, true);
      say(g, ME, 'SOS', fade(T, T0), 'down');
      for (const i of BACK) say(g, P[i], 'SOS with position', fade(T, s.got[i], s.got[i] + 3.4)); // then the trails say where they go
    }
  };
  })();

  /* 3. team map */
  const MAP = (() => {
  const MATES = [pt(1640, -2.4), at(OFF_AT.x, OFF_AT.y, -2.6), pt(970, -0.3), pt(2150, 2.8)], SEND = [0.4, 1.0, 0.7, 1.3], FAR = 3, GO = 3.0;
  return {
    focus: F(780, 520, 1180, 664), portraitFocus: F(800, 520, 1160, 860),
    label: PLAN + 'A team is hidden from each other by the trees. With VZ, a team map in the corner shows the available positions of teammates in coverage and who is closest; the leader walks straight to the one furthest out. Without VZ, she does not know where anyone is.',
    lines: { with: ['A team is spread across the hillside, out of sight of each other.', 'Each supported phone shows the available positions of teammates in coverage, and who is closest.', 'The leader walks straight to the one furthest out.'],
      without: ['The team is out of sight of each other.', 'The leader does not know where anyone is.'] },
    still: (vz) => (vz ? 3.6 : 2.4),
    init: () => ({ L: W(TRACK, 1350, 0, -0.6), seen: [], walk: null }),
    update(s, dt, o) {
      const T = s.t + dt, L = pose(s.L);
      if (o.vz) MATES.forEach((p, i) => { if (s.seen[i] == null && hears(s.t, T, dist(L, p), SEND[i])) s.seen[i] = T; });
      if (o.vz && s.walk == null && T > GO) { s.walk = T; s.L.a = null; }
      if (s.walk != null) { s.L.v = min(95, s.L.v + 160 * dt); go(s.L, dt); }
      s.end = o.vz ? 7.2 : 4.8;
    },
    beat: (s, o) => (o.vz ? (s.walk != null ? 2 : s.t > SEND[0] + 0.3 ? 1 : 0) : s.t > 1.4 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, L = pose(s.L), w = s.walk != null, look = w ? L.a : L.a + 1.1 * sin(T * 1.1);
      for (const p of MATES) body(g, p, o.vz);
      body(g, at(L.x, L.y, look), o.vz);
      g.cone(L, look, 0.55, 520, OCC.filter((b) => dist(b, L) < 560), { k: 1.1 * (1 - since(T, s.walk, 0.5)) }); // she sees only the trees around her
      if (!o.vz) return;
      MATES.forEach((p, i) => talk(g, p, T, SEND[i], SEND[i] + 0.7, 0.6));
      if (w) g.trail(TRACK, s.L.s + R_P, 260);
      for (const p of MATES.concat(L)) g.device(p.x, p.y);
      s.seen.forEach((h) => g.catchFx(L.x, L.y, T - h));
      if (w) g.flash(MATES[FAR], T - s.walk, { l: 2 * R_P, w: 2 * R_P });
      const bw = Math.round(min(186, g.cam.w * 0.34)), b = g.inset('tl', bw, Math.round(bw * 0.76), { margin: g.cam.w < 500 ? 10 : 14 }); // the team map: marks only
      const c = g.ctx, hh = (b.h - 24) / 2, cx = b.x + b.w / 2, cy = b.y + 24 + hh, k = min(b.w / 2 - 8, hh - 4) / 900, r = g.cam.rot, near = MATES.reduce((n, p, i) => (dist(p, L) < dist(MATES[n], L) ? i : n), 0);
      g.text(b.x + 12, b.y + 20, 'Team map', { size: 12 });
      c.fillStyle = C.zone; c.beginPath(); c.arc(cx, cy, 4.5, 0, TAU); c.fill();
      MATES.forEach((p, i) => {
        const dx = (p.x - L.x) * k, dy = (p.y - L.y) * k, al = since(T, s.seen[i], 0.3); if (al <= 0) return;
        c.fillStyle = rgba('lane', 0.94 * al); c.beginPath(); c.arc(cx + dx * cos(r) - dy * sin(r), cy + dx * sin(r) + dy * cos(r), i === near ? 6 : 3.6, 0, TAU); c.fill();
      });
      g.world();
    }
  };
  })();

  /* 4. messages, photos and short clips */
  const MEDIA = (() => {
  const T0 = 1.0, T1 = 2.4, M1 = pt(2190), M2 = at(on(2150).x - 6, on(2150).y + 34, M1.a - 0.3);
  const detour = (s) => { const pts = []; for (let q = s; q < FORK; q += 20) { const p = on(q); pts.push([p.x, p.y]); } return rt(pts.concat(SIDE.pts), 0); };
  function photo(g, p, k) { // the photo, arrived beside a phone: a plain frame
    if (k <= 0) return; const [x, y] = g.toScreen(p.x, p.y), c = g.ctx; g.screen(); c.globalAlpha = ease.out(k);
    c.fillStyle = 'rgba(10,13,16,.85)'; c.fillRect(x + 9, y - 22, 17, 13); c.strokeStyle = C.zone; c.lineWidth = 1.25; c.strokeRect(x + 9.5, y - 21.5, 16, 12);
    c.fillStyle = rgba('lane', 0.5); c.beginPath(); c.moveTo(x + 12, y - 12); c.lineTo(x + 17, y - 18); c.lineTo(x + 23, y - 12); c.fill(); c.globalAlpha = 1; g.world();
  }
  return {
    focus: F(1000, 400, 1180, 664), portraitFocus: F(1000, 400, 1000, 860),
    label: PLAN + 'A fallen tree blocks it. With VZ, one of the two who found it sends a photo and a message; the rest of the team see it and take the other path. Without VZ, they walk on towards it.',
    lines: { with: ['Two of the team find the track blocked by a fallen tree.', 'One sends a photo and a short message over the same direct link.', 'The rest of the group see it and take the other path.'],
      without: ['The track is blocked.', 'The others walk on towards it. Nothing reached them.'] },
    still: (vz) => (vz ? 3.4 : 3.6),
    init: () => ({ rest: [W(TRACK, 1560, 78), W(TRACK, 1420, 80), W(TRACK, 1280, 82)], got: [] }),
    update(s, dt, o) {
      const T = s.t + dt;
      if (o.vz && s.m2 == null && hears(s.t, T, dist(M1, M2), T0)) s.m2 = T;
      s.rest.forEach((m, i) => {
        if (o.vz && s.got[i] == null && hears(s.t, T, dist(M1, pose(m)), T0)) s.got[i] = T;
        if (s.got[i] != null && m.rt === TRACK && m.s < FORK) Object.assign(m, { rt: detour(m.s), s: 0 });
        go(m, dt);
      });
      s.end = o.vz ? 6.9 : 5.0;
    },
    beat: (s, o) => (o.vz ? (s.t > 3.2 && all(s.got, 3) ? 2 : s.t > T0 ? 1 : 0) : s.t > 1.5 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, P = s.rest.map(pose), A = P.concat(M1, M2);
      for (const p of A) body(g, p, o.vz);
      if (!o.vz) return;
      talk(g, M1, T, T0, T1);
      s.rest.forEach((m) => { if (m.rt !== TRACK) g.trail(m.rt, m.s + R_P, 240); });
      for (const p of A) g.device(p.x, p.y);
      s.got.forEach((h, i) => g.catchFx(P[i].x, P[i].y, T - h)); if (s.m2 != null) g.catchFx(M2.x, M2.y, T - s.m2);
      press(g, M1, T, T0, true);
      s.got.forEach((h, i) => photo(g, P[i], since(T, h, 0.25))); photo(g, M2, since(T, s.m2, 0.25));
      say(g, M1, 'Photo sent', fade(T, T0));
      say(g, P[0], 'Track blocked', fade(T, s.got[0]), 'left'); say(g, P[2], 'Track blocked', fade(T, s.got[2]), 'down');
    }
  };
  })();

  /* 5. private groups, joined by a touch */
  const GROUPS = (() => {
  const LEAD = at(110, 985, 2.6), MATES = [at(-10, 1045, 2.9), at(60, 1100, -2.2), at(150, 1060, -2.8)], OTHERS = [at(250, 840, 1.6), at(305, 875, 2.4), at(232, 905, -0.9)];
  const IN = rt([[on(480).x, on(480).y], [-130, 950], [-36, 1036]], 70);
  return {
    focus: F(30, 950, 1100, 620), portraitFocus: F(50, 950, 860, 680),
    label: PLAN + 'At its start, a team, a second group close by, and a new teammate. With VZ, her phone touches a teammate’s and she is in; she hears the leader talk, and the other group hears nothing. Without VZ, she cannot hear the team.',
    lines: { with: ['A new teammate arrives. Another group is standing close by.', 'Two phones touch, and she is in the group.', 'She hears the team. The other group hears nothing of it.'],
      without: ['A new teammate arrives.', 'She has no way to hear the team out here.'] },
    still: (vz) => (vz ? 3.4 : 3.0),
    init: () => ({ n: W(IN, 0, 130), joined: null, heard: [], t0: null }),
    update(s, dt, o) {
      const T = s.t + dt, n = s.n;
      if (n.v) { n.v = min(130, sqrt(520 * max(0, IN.total - n.s)) + 8); go(n, dt); if (IN.total - n.s < 1) { n.v = 0; n.a = pose(n).a; s.joined = T; } } // a calm stop beside her teammate
      if (o.vz && s.joined != null && s.t0 == null) s.t0 = s.joined + 0.8;
      if (s.t0 != null) MATES.concat(pose(n)).forEach((p, i) => { if (s.heard[i] == null && hears(s.t, T, dist(LEAD, p), s.t0)) s.heard[i] = T; });
      s.end = o.vz ? 6.2 : 4.8;
    },
    beat: (s, o) => (o.vz ? (s.t0 != null && s.t > s.t0 ? 2 : s.joined != null ? 1 : 0) : s.t > 1.6 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, N = pose(s.n), j = o.vz && s.joined != null, M = MATES[0];
      for (const p of MATES.concat(LEAD)) body(g, p, o.vz);
      for (const p of OTHERS) body(g, p, false); // another group: their phones stay grey
      body(g, N, j);
      if (!o.vz) return s.joined != null && nowhere(g, N, T, s.joined + 0.4);
      if (s.t0 != null) { talk(g, LEAD, T, s.t0, 9); press(g, LEAD, T, s.t0, true); }
      for (const p of MATES.concat(LEAD)) g.device(p.x, p.y);
      if (j) { g.device(N.x, N.y); g.catchFx((N.x + M.x) / 2, (N.y + M.y) / 2, T - s.joined); g.flash(N, T - s.joined, { l: 2 * R_P, w: 2 * R_P }); }
      s.heard.forEach((h, i) => { const p = i < 3 ? MATES[i] : N; g.catchFx(p.x, p.y, T - h); });
      say(g, N, 'Joined', fade(T, s.joined, s.heard[3] != null ? s.heard[3] - 0.3 : null));
      say(g, N, 'Hears her', fade(T, s.heard[3]));
    }
  };
  })();

  /* 6. ready while asleep */
  const ASLEEP = (() => {
  const T0 = 1.2, T1 = 9, V = pt(1500, on(1500).a + PI);
  const REST3 = [[at(392, 838, 0.9), at(368, 862, 0.5)], [at(462, 905, -2.0), at(488, 924, -1.1)], [at(512, 848, 2.9), at(520, 822, 1.9)]]; // a person and the phone beside them
  function handset(g, p, lit) { // a phone lying on the ground; lit > 0 draws only its waking screen
    const c = g.ctx; c.save(); c.translate(p.x, p.y); c.rotate(p.a);
    if (!lit) { c.fillStyle = C.glass; c.fillRect(-9, -5, 18, 10); c.fillStyle = rgba('lane', 0.05); } else c.fillStyle = rgba('lane', 0.7 * lit);
    c.fillRect(-7, -3.5, 14, 7); c.restore();
  }
  return {
    focus: F(560, 770, 900, 506), portraitFocus: F(560, 760, 700, 620),
    label: PLAN + 'At night three teammates rest, their phones asleep with screens off. With VZ, a teammate further up talks and the sleeping phones wake to her voice. Without VZ, nobody hears her.',
    lines: { with: ['A team rests at night. Their phones are asleep, screens off.', 'A teammate further up the track presses and talks.', 'The sleeping phones wake to her voice, and the team hears her.'],
      without: ['The team rests, phones asleep.', 'She talks, and nobody hears.'] },
    still: (vz) => (vz ? 3.2 : 2.4),
    init: () => ({ wake: [] }),
    update(s, dt, o) {
      const T = s.t + dt;
      if (o.vz) REST3.forEach(([, ph], i) => { if (s.wake[i] == null && hears(s.t, T, dist(V, ph), T0)) s.wake[i] = T; });
      s.end = o.vz ? 6.0 : 4.7;
    },
    beat: (s, o) => (o.vz && all(s.wake, 3) && s.t > 2.6 ? 2 : s.t > T0 ? 1 : 0),
    draw(g, s, o) {
      const T = s.t, c = g.ctx;
      REST3.forEach(([p, ph], i) => { g.person(at(p.x, p.y, turn(p.a, toward(p, V), since(T, s.wake[i] != null ? s.wake[i] + 0.3 : null, 0.7))), { r: R_P }); handset(g, ph, 0); });
      body(g, V, o.vz);
      g.atmosphere('Night', {});
      if (!o.vz) { for (const [, ph] of REST3) { c.fillStyle = C.off; c.beginPath(); c.arc(ph.x, ph.y, 3.4, 0, TAU); c.fill(); } return nowhere(g, V, T, T0); }
      talk(g, V, T, T0, T1);
      REST3.forEach(([, ph], i) => { if (s.wake[i] != null) talk(g, ph, T, s.wake[i], s.wake[i], 0.4); }); // one quiet ring each: awake
      g.device(V.x, V.y);
      REST3.forEach(([, ph], i) => { // asleep: a dimmed phone; awake: its screen lights
        const w = since(T, s.wake[i], 0.35); if (w > 0) handset(g, ph, w);
        c.globalAlpha = 0.3 + 0.7 * w; g.device(ph.x, ph.y); c.globalAlpha = 1; g.catchFx(ph.x, ph.y, T - s.wake[i]);
      });
      press(g, V, T, T0, true);
      const first = REST3[0][1];
      say(g, first, 'Screen off', fade(T, 0.2, s.wake[0] ?? null), 'down');
      say(g, first, 'Wakes: voice', fade(T, s.wake[0]), 'down');
    }
  };
  })();

  /* ---------------------------------------------------------------------- mount */
  const D = { ptt: PTT, sos: SOS, map: MAP, media: MEDIA, groups: GROUPS, asleep: ASLEEP };
  const pick = (v) => IDS.find((n) => n === String(v ?? '').toLowerCase());
  let cur = pick(Q.get('demo')) || IDS[0];
  const now = (o) => D[(o && pick(o.demo)) || cur];
  // Frame and canvas label follow the demo: functions of the options (kit contract) that also read as plain values.
  const frame = (key) => { const f = (o) => now(o)[key]; for (const p of 'xywh') Object.defineProperty(f, p, { get: () => now()[key][p] }); return f; };
  const label = (o) => now(o).label; label.toString = () => now().label;
  const api = K.mount({
    el: '#sim', label, focus: frame('focus'), portraitFocus: frame('portraitFocus'), compare: false,
    options: { demo: cur },
    choices: [{ name: 'demo', label: 'Feature', values: IDS, hidden: EMBED }], // in the site's plate the row above names the feature
    still: (vz) => now().still(vz),
    lines: (o) => now(o).lines[o.vz ? 'with' : 'without'],
    beat: (s, o) => now(o).beat(s, o),
    ground,
    init(o) {
      cur = pick(o.demo) || cur;
      const host = document.querySelector('#sim'), cv = host && host.querySelector && host.querySelector('canvas');
      if (cv && cv.setAttribute) cv.setAttribute('aria-label', now().label);
      return now(o).init(o);
    },
    update(s, dt, o) { now(o).update(s, dt, o); s.over = s.end != null && s.t + dt > s.end + 0.3; },
    draw: (g, s, o) => now(o).draw(g, s, o),
    debug: (s, o) => ({ demo: cur, end: s.end, still: now(o).still(o.vz) })
  });
  const set = api.setOption; // note the demo first, so its frame and its still are the ones used
  api.setOption = (name, value) => { if (name === 'demo' && pick(value)) cur = pick(value); return set(name, value); };
})();
