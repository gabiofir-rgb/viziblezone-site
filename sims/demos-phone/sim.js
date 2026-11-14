/* Phone makers: three micro-demos for the Show me plates (?demo=fall|itself|builtin), each played once under a row.
   All three are Vision. Each demo is a function of time: fixed moments, no randomness. Synthetic trajectories only. */
(function () {
  'use strict';
  const K = VZKit, { clamp, ease, lerp, rgba, C } = K, { sin, cos, atan2, hypot, min, PI } = Math, TAU = 2 * PI;
  const fade = (T, a, b) => (a == null ? 0 : clamp((T - a) / 0.22) * (b == null ? 1 : 1 - clamp((T - b) / 0.3)));
  const since = (T, t, d) => (t == null ? 0 : clamp((T - t) / d));
  const dist = (p, q) => hypot(p.x - q.x, p.y - q.y);
  // A zone whose first ring leaves at t0, and the moment that ring reaches distance d (the kit's ring law).
  const zoneFrom = (t0, z) => Object.assign({ period: 0.7, rings: 3 }, z, { phase: t0 % 0.7, start: t0 });
  const reach = (t0, d, z) => t0 + (1 - Math.pow(1 - min(d, z.rmax - 1) / z.rmax, 1 / 1.7)) * 2.1;
  const grey = (c, x, y) => { c.fillStyle = C.off; c.beginPath(); c.arc(x, y, 3.96, 0, TAU); c.fill(); }; // a phone without VZ
  function table(g, x, y, w, h) { // a table or a bench top: a soft shadow, a flat top, a fine inset line
    const c = g.ctx, [sx, sy] = g.shade(4, 5);
    c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(x + sx, y + sy, w, h);
    c.fillStyle = '#3A4247'; c.fillRect(x, y, w, h);
    c.strokeStyle = rgba('lane', 0.08); c.lineWidth = g.px; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }

  /* 1. A fall (Vision): a park path, a person walking alone, two people on a bench beyond the trees. */
  const FALL = (() => {
    const PATH = K.route([[-500, 560], [300, 520], [760, 520], [1150, 470], [2200, 470]], 260);
    const S0 = 700, V = 72, T_FALL = 1.9, T_DOWN = 2.25, T_NOTE = 2.9, T_CALL = 3.3, END = [5.4, 7.2];
    const SEAT = [{ x: 950, y: 300, a: PI / 2 }, { x: 1010, y: 300, a: PI / 2 }];
    const ZF = zoneFrom(T_CALL, { rmax: 1000 });
    const fallAt = PATH.at(S0 + V * T_FALL), BODY = { x: fallAt.x + 16 * cos(fallAt.a), y: fallAt.y + 16 * sin(fallAt.a), a: fallAt.a + 0.35 };
    const TOLD = SEAT.map((p) => reach(T_CALL, dist(BODY, p), ZF)), T_UP = TOLD[1] + 0.5;
    const GOAL = [{ x: 850, y: 410 }, { x: 905, y: 440 }];
    function lying(g, p, k, vz) { // a person lying on the ground, seen from above: body and head, no heading wedge
      const c = g.ctx, px = g.px, [sx, sy] = g.shade(2.5, 3.5);
      const shape = () => { c.beginPath(); c.arc(-14, 0, 9, PI / 2, 1.5 * PI); c.lineTo(6, -9); c.arc(6, 0, 9, -PI / 2, PI / 2); c.closePath(); c.moveTo(24.5, 0); c.arc(17, 0, 7.5, 0, TAU); };
      c.save(); c.globalAlpha = k; c.translate(p.x + sx, p.y + sy); c.rotate(p.a); shape(); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); c.restore();
      c.save(); c.globalAlpha = k; c.translate(p.x, p.y); c.rotate(p.a); shape();
      c.strokeStyle = rgba('dark', 0.85); c.lineWidth = 3 * px; c.stroke(); c.fillStyle = '#F7F8F8'; c.fill(); c.restore();
      if (!vz) { c.save(); c.globalAlpha = k; grey(c, p.x, p.y); c.restore(); }
    }
    const walker = (T) => {
      const s = S0 + V * min(T, T_FALL), p = PATH.at(s), lurch = 14 * ease.out(since(T, T_FALL, 0.3));
      return { pose: { x: p.x + lurch * cos(p.a), y: p.y + lurch * sin(p.a), a: p.a }, k: ease.smooth((T - T_FALL - 0.15) / 0.2) };
    };
    const sitter = (T, i, vz) => { // on the bench; with VZ, once told, they get up and head towards the fall
      const p = SEAT[i], q = GOAL[i], k = vz ? ease.smooth((T - T_UP - 0.1 * i) / 2) : 0, turn = vz ? since(T, TOLD[i] + 0.2, 0.4) : 0;
      return { x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), a: p.a + (atan2(BODY.y - p.y, BODY.x - p.x) - p.a) * ease.smooth(turn) };
    };
    return {
      label: 'Plan of a park path. A person walking alone falls and does not get up; two people sit on a bench further on, out of sight behind the trees. With VZ, a vision, the phone will notice the fall and call for help, and the two on the bench will know and come over. Without VZ nobody nearby notices.',
      lines: { with: ['A person walking alone in a park falls and does not get up.', 'Vision: the phone will notice the fall.', 'Vision: it will call for help, and the people nearby will know.'],
        without: ['A person walking alone falls.', 'Nobody nearby notices.'] },
      focus: { x: 240, y: 210, w: 840, h: 420 }, still: [3.8, 5.0], end: END,
      beat: (T, o) => (o.vz ? (T >= TOLD[0] ? 2 : T >= T_NOTE ? 1 : 0) : T >= 3.2 ? 1 : 0),
      ground(g) {
        const c = g.ctx, pts = [];
        g.pavement([[-800, -600], [2400, -600], [2400, 1400], [-800, 1400]], { fill: '#343C41', grid: 0 }); // the lawn, lighter than the tree canopies
        c.strokeStyle = rgba('lane', 0.014); c.lineWidth = 46; c.beginPath(); // mown stripes
        for (let x = -800; x < 2400; x += 92) { c.moveTo(x, -600); c.lineTo(x + 500, 1400); } c.stroke();
        for (let s = 0; s <= PATH.total; s += 20) { const p = PATH.at(s); pts.push([p.x, p.y]); }
        c.lineJoin = 'round'; c.lineCap = 'round';
        g.path(pts, false); c.strokeStyle = '#3F474C'; c.lineWidth = 64; c.stroke();
        g.path(pts, false); c.strokeStyle = '#464E53'; c.lineWidth = 56; c.stroke();
        table(g, 918, 262, 124, 16); // the bench, its back to the lawn
        for (const [x, y, r] of [[620, 330, 46], [700, 392, 44], [585, 412, 36], [705, 296, 40], [770, 350, 42], [655, 250, 34],
          [300, 300, 40], [420, 700, 44], [1150, 640, 40], [880, 680, 36], [1250, 260, 44], [140, 680, 38]]) g.tree(x, y, r);
        g.lamp(1060, 520, -PI / 2); g.lamp(260, 470, -PI / 2);
      },
      draw(g, T, o) {
        const c = g.ctx, w = walker(T), bench = [0, 1].map((i) => sitter(T, i, o.vz)), ph = w.k > 0.5 ? BODY : w.pose;
        if (w.k < 1) g.person(w.pose, { alpha: 1 - w.k, phone: o.vz ? null : 'off' });
        if (w.k > 0) lying(g, BODY, w.k, o.vz);
        for (const p of bench) g.person(p, { phone: o.vz ? null : 'off' });
        g.atmosphere('Clear', {});
        if (!o.vz) return;
        if (T >= T_CALL) g.zone(ph.x, ph.y, ZF);
        g.device(ph.x, ph.y); for (const p of bench) g.device(p.x, p.y);
        g.catchFx(ph.x, ph.y, T - T_NOTE); g.flash(BODY, T - T_NOTE, { l: 46, w: 24 });
        bench.forEach((p, i) => { g.catchFx(p.x, p.y, T - TOLD[i]); g.flash(p, T - TOLD[i]); });
        g.chip(ph.x, ph.y, 'Fall noticed', { k: fade(T, T_NOTE, 5.4), side: 'down', gap: 18 });
        g.chip(bench[0].x, bench[0].y, 'Someone needs help', { k: fade(T, TOLD[0]), side: 'up', gap: 18 });
      }
    };
  })();

  /* 2. A phone that knows itself (Vision): a café terrace, a phone on a table beside its person. */
  const ITSELF = (() => {
    const P = { x: 700, y: 476 }, Q = { x: 700, y: 364, a: PI / 2 }, PH = { x: 719, y: 437, a: -PI / 2 + 0.35 };
    const T_ODD = 1.3, T_NOTE = 2.3, T_TELL = 4.1, END = [5.2, 6.8];
    const ZP = zoneFrom(T_NOTE, { rmax: 150, strength: 0.7 });
    const OTHERS = [{ x: 460, y: 246, a: PI / 2 }, { x: 460, y: 354, a: -PI / 2 }, { x: 1000, y: 300, a: PI }, { x: 340, y: 560, a: 0 }];
    const TABLES = [[700, 420], [460, 300], [940, 300], [1010, 560], [400, 560]];
    const look = atan2(PH.y - P.y, PH.x - P.x);
    const odd = (T) => { const q = (T - T_ODD) / 0.4; return q > 0 && q < 1 ? sin(q * PI) : 0; }; // one flicker, by itself
    return {
      label: 'Plan of a café terrace. A phone lies on a table beside its person, and something in it starts to behave abnormally. With VZ, a vision, the phone will notice its own abnormal behaviour, and it could flag a possible anomaly to its person: an indication, not proof. Nobody else is told. Without VZ its person has no sign of it.',
      lines: { with: ['A phone lies on a café table. Something in it starts to behave abnormally.', 'Vision: the phone will notice its own abnormal behaviour.', 'Vision: it could flag a possible anomaly. An indication, not proof.'], // Yitro, decision 16: exact
        without: ['Something in the phone behaves abnormally.', 'Its person has no sign of it.'] },
      focus: { x: 400, y: 220, w: 640, h: 360 }, still: [3.4, 4.9], end: END,
      beat: (T, o) => (o.vz ? (T >= T_TELL ? 2 : T >= T_NOTE ? 1 : 0) : T >= 2.9 ? 1 : 0),
      ground(g) {
        const c = g.ctx;
        g.pavement([[-600, -600], [2200, -600], [2200, 1400], [-600, 1400]], { fill: '#2A3035', grid: 40 }); // the terrace
        g.building(-600, -600, 2800, 500, { height: 1.2, tone: '#2E353A', seed: 3 });                         // the café
        c.fillStyle = 'rgba(3,5,7,.28)'; c.fillRect(-600, -100, 2800, 90);                                       // the awning's shade
        g.pavement([[-600, 720], [2200, 720], [2200, 1400], [-600, 1400]]); g.kerb([[-600, 720], [2200, 720]]); // the street pavement
        for (let x = -560; x < 2200; x += 180) g.tree(x, 690, 22);                                               // planters
        for (const [x, y] of TABLES) table(g, x - 32, y - 32, 64, 64);
      },
      draw(g, T, o) {
        const c = g.ctx, f = odd(T), tell = o.vz ? since(T, T_TELL, 0.5) : 0, chat = 0.12 * sin(T * 1.7);
        const pose = { x: P.x, y: P.y, a: lerp(-PI / 2 + chat, look, ease.smooth(tell)) };
        for (const p of OTHERS) g.person(p, {});
        g.person({ x: Q.x, y: Q.y, a: Q.a - chat * 0.6 }, {}); g.person(pose, {});
        const walker = { x: 160 + 55 * T, y: 790, a: 0 }; g.person(walker, {}); // a passer-by on the pavement
        // The phone on the table: its screen lights by itself once, and again when it tells its person.
        c.save(); c.translate(PH.x, PH.y); c.rotate(PH.a); c.fillStyle = C.glass; c.fillRect(-6, -10, 12, 20);
        const lit = Math.max(0.6 * f, 0.7 * tell); if (lit > 0.02) { c.fillStyle = rgba('lane', lit); c.fillRect(-4, -8, 8, 16); }
        c.restore();
        g.atmosphere('Clear', {});
        if (!o.vz) { c.globalAlpha = 1 - 0.85 * f; grey(c, PH.x, PH.y); c.globalAlpha = 1; return; }
        if (T >= T_NOTE) g.zone(PH.x, PH.y, ZP);
        c.globalAlpha = 1 - 0.85 * f; g.device(PH.x, PH.y); c.globalAlpha = 1;
        g.catchFx(PH.x, PH.y, T - T_NOTE); g.flash(pose, T - T_TELL);
        g.chip(P.x, P.y, 'Possible anomaly', { k: fade(T, T_TELL), side: 'down', gap: 18 });
      }
    };
  })();

  /* 3. Built into the phone (Vision): a street full of people. Today only those with an app; then every one of them. */
  const BUILTIN = (() => {
    const T_BUILT = 2.4, END = [5.0, 6.9];
    // x at the start, y, speed (+ east, - west), and whether the person has an app with it today
    const WALK = [[300, 300, 45, 1], [480, 362, -40], [650, 284, 50], [830, 346, -55, 1], [1010, 300, 38], [1200, 362, -45],
      [360, 690, -50], [560, 752, 42], [760, 680, -38, 1], [980, 760, 52], [1150, 700, -44], [1330, 742, 40]];
    const ORDER = [5, 0, 9, 3, 7, 1, 8, 2, 6], LIGHT = WALK.map((w, i) => (w[3] ? 0 : T_BUILT + 0.25 + 0.07 * ORDER[i - (i > 0) - (i > 3) - (i > 8)]));
    return {
      label: 'Plan of a street full of people and phones. Today it arrives inside an app, so only the few people who have that app are lit. With VZ, a vision, it will be part of the phone itself, and all the phones in the street light up, with no app to install. Without VZ none of the phones knows about the others.',
      lines: { with: ['Today it arrives inside an app, so only the people who have that app are covered.', 'Vision: it will be part of the phone itself.', 'Vision: every user will have it, with no app to install.'],
        without: ['A street full of people and phones.', 'None of the phones knows about the others.'] },
      focus: { x: 250, y: 200, w: 1100, h: 620 }, still: [3.4, 4.8], end: END,
      beat: (T, o) => (o.vz ? (T >= 4.4 ? 2 : T >= T_BUILT ? 1 : 0) : T >= 2.6 ? 1 : 0),
      ground(g) {
        const r = K.rng(7);
        g.pavement([[-600, -600], [2400, -600], [2400, 420], [-600, 420]]); g.pavement([[-600, 620], [2400, 620], [2400, 1400], [-600, 1400]]);
        g.kerb([[-600, 420], [2400, 420]]); g.kerb([[-600, 620], [2400, 620]]);
        g.marking([[-600, 520], [2400, 520]], { dash: [110, 130] }); g.zebra(1440, 423, 1560, 617); g.tactile(1440, 386, 120, 30); g.tactile(1440, 626, 120, 30);
        for (let x = -600; x < 2400;) { const w = 180 + r() * 200; g.building(x, -600, w - 12, 800, { seed: x | 0 }); g.building(x + 60, 860, w - 12, 540, { seed: (x * 3) | 0 }); x += w; }
        for (const x of [-100, 400, 900, 1300, 1800]) { g.lamp(x, 412, PI / 2); g.tree(x + 200, 214, 32); g.tree(x + 50, 820, 30); }
      },
      draw(g, T, o) {
        const c = g.ctx, at = WALK.map(([x, y, v]) => ({ x: x + v * T, y, a: v > 0 ? 0 : PI }));
        at.forEach((p) => g.person(p, {}));
        g.atmosphere('Clear', {});
        at.forEach((p, i) => { const k = o.vz ? ease.smooth((T - LIGHT[i]) / 0.3) : 0; if (k < 1) { c.globalAlpha = 1 - k; grey(c, p.x, p.y); c.globalAlpha = 1; } });
        if (!o.vz) return;
        at.forEach((p, i) => { const k = ease.smooth((T - LIGHT[i]) / 0.3); if (k > 0) { c.globalAlpha = k; g.device(p.x, p.y); c.globalAlpha = 1; } });
        g.label(800, 520, 'Part of the phone: Vision', { status: 'vision', k: fade(T, T_BUILT) });
      }
    };
  })();

  /* mount ---------------------------------------------------------------------------------------------------------- */
  const D = { fall: FALL, itself: ITSELF, builtin: BUILTIN }, IDS = Object.keys(D), at = (o) => D[o.demo];
  K.mount({
    el: '#sim',
    label: (o) => at(o).label,                                  // each demo's own canvas label
    focus: (o) => at(o).focus, portraitFocus: (o) => at(o).focus,
    compare: false,                                             // no statuses: the row above carries the status
    options: { demo: IDS[0] },
    choices: [{ name: 'demo', label: 'Feature', values: IDS }], // micro hides it; the pack's own page shows it
    still: (vz, o) => at(o).still[+vz],                         // the warning fully shown (Without VZ: the moment)
    lines: (o) => at(o).lines[o.vz ? 'with' : 'without'],
    beat: (s, o) => at(o).beat(s.t, o),
    ground: (g, o) => at(o).ground(g),
    init: () => ({}),
    update(s, dt, o) { s.over = s.t + dt >= at(o).end[+o.vz]; },
    draw: (g, s, o) => at(o).draw(g, s.t, o)
  });
})();
