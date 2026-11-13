/* Still scenes: the plates on the pages (the home hero, the three dangers, the four steps, the worlds, the
   road of milestones). They are the scenes of the company's printed slides, drawn with the simkit painter, so
   the stills, the live simulations and the slides share one grammar. poster.js renders them.
   Same world units as the kit; y points down. Synthetic scenes only. */
(function () {
  'use strict';
  const K = VZKit, { rgba, lerp, rng } = K, TAU = Math.PI * 2, HP = Math.PI / 2;
  const S = (window.SCENES = {});
  const PR = 15; // people are drawn a little larger than on the site, to read at feed size

  /* ------------------------------------------------------------ helpers */
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // A still zone: soft core, and rings that thin out as they travel.
  function rings(g, x, y, R, o = {}) {
    const c = g.ctx, px = g.px, s = o.s ?? 1, n = o.n || 4;
    if (o.fill !== false) {
      const F = R * (o.core ?? 0.55), gr = c.createRadialGradient(x, y, 0, x, y, F);
      gr.addColorStop(0, rgba('zone', 0.26 * s)); gr.addColorStop(0.2, rgba('zone', 0.1 * s)); gr.addColorStop(1, rgba('zone', 0));
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, F, 0, TAU); c.fill();
    }
    for (let i = 1; i <= n; i++) {
      const q = i / n, r = R * Math.pow(q, 1.12), a = (1 - 0.68 * q) * s;
      c.beginPath(); c.arc(x, y, r, 0, TAU);
      c.strokeStyle = rgba('zone', a * 0.08); c.lineWidth = 8 * px; c.stroke();
      c.strokeStyle = rgba('zone', a * 0.14); c.lineWidth = 4 * px; c.stroke();
      c.strokeStyle = rgba('zone', a); c.lineWidth = (o.w || 1.5) * px; c.stroke();
    }
  }
  function beam(g, eye, a, half, range, occ, al = 0.5) {
    const c = g.ctx; c.save(); c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, range);
    gr.addColorStop(0, rgba('lane', al / 7)); gr.addColorStop(0.45, rgba('lane', al / 18)); gr.addColorStop(1, rgba('lane', 0));
    for (let i = 8; i > 0; i--) { g.path(K.sight(eye, a, (half * i) / 8, range, occ || [], 28).pts); c.fillStyle = gr; c.fill(); }
    c.restore();
  }
  function headlamps(g, v, occ, al = 0.5, range = 560) {
    const ca = Math.cos(v.a || 0), sa = Math.sin(v.a || 0), l = v.l || 176;
    beam(g, { x: v.x + ca * (l / 2 - 2), y: v.y + sa * (l / 2 - 2) }, v.a || 0, 0.4, range, occ, al);
  }
  function pool(g, x, y, r, a = 0.09) {
    const c = g.ctx; c.save(); c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba('lane', a)); gr.addColorStop(1, rgba('lane', 0));
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  }
  function lampAt(g, x, y, a) { g.lamp(x, y, a); pool(g, x + Math.cos(a) * 30, y + Math.sin(a) * 30, 210, 0.075); }
  // A row of roofs between x0 and x1.
  function row(g, x0, x1, y, h, seed) {
    const r = rng(seed); let x = x0;
    while (x < x1 - 80) { const w = Math.min(x1 - x, 190 + r() * 260); g.building(x, y, w - 12, h, { seed: (seed * 97 + x) | 0 }); x += w; }
  }
  // A direct link between two phones: a hairline, a soft glow, and one pulse on its way.
  function link(g, a, b, o = {}) {
    const c = g.ctx, px = g.px;
    c.save(); c.lineCap = 'round'; if (o.dash) c.setLineDash([7 * px, 7 * px]);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
    c.strokeStyle = rgba('zone', 0.12 * (o.s ?? 1)); c.lineWidth = 7 * px; c.stroke();
    c.strokeStyle = rgba('zone', (o.alpha ?? 0.8) * (o.s ?? 1)); c.lineWidth = (o.w || 1.4) * px; c.stroke(); c.restore();
    if (o.p != null) g.hop(a, b, o.p, { line: false });
  }
  // A mobile mast seen from above, struck through: no network here.
  function tower(g, x, y, k = 1) {
    const c = g.ctx, px = g.px;
    g.marking([[x - 70 * k, y - 70 * k], [x + 70 * k, y - 70 * k], [x + 70 * k, y + 70 * k], [x - 70 * k, y + 70 * k], [x - 70 * k, y - 70 * k]], { dash: [10, 10], w: 3, alpha: 0.25 });
    const p = [0, 1, 2].map((i) => [x + Math.cos(-HP + (i * TAU) / 3) * 30 * k, y + Math.sin(-HP + (i * TAU) / 3) * 30 * k]);
    c.strokeStyle = '#7C878E'; c.lineWidth = 4 * k; g.path(p).stroke();
    c.lineWidth = 1.5 * px; c.beginPath(); for (const [a, b] of p) { c.moveTo(x, y); c.lineTo(a, b); } c.stroke();
    c.fillStyle = '#8F999F'; for (let i = 0; i < 3; i++) { c.save(); c.translate(x, y); c.rotate(-HP + (i * TAU) / 3); c.fillRect(30 * k, -11 * k, 9 * k, 22 * k); c.restore(); }
    c.strokeStyle = rgba('lane', 0.7); c.lineWidth = 6 * k; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 62 * k, y + 62 * k); c.lineTo(x + 62 * k, y - 62 * k); c.stroke();
  }
  function rubble(g, x0, y0, x1, y1, seed) {
    const c = g.ctx, r = rng(seed), tones = ['#30373C', '#3A4247', '#343B40', '#41494E', '#2C3337'];
    g.marking([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], { dash: [16, 14], w: 3, alpha: 0.22 });
    c.fillStyle = '#3A4247'; for (const [x, y, w, h] of [[x0, y0, 210, 22], [x1 - 22, y0, 22, 150], [x0, y1 - 120, 22, 120], [x1 - 160, y1 - 22, 160, 22]]) c.fillRect(x, y, w, h);
    for (let i = 0; i < 80; i++) { const x = lerp(x0 - 60, x1 + 70, r()), y = lerp(y0 - 40, y1 + 70, r()), s = 6 + r() * 16; c.fillStyle = tones[(r() * 5) | 0]; c.fillRect(x, y, s, s * (0.5 + r())); }
    for (let i = 0; i < 32; i++) {
      const w = 70 + r() * 170, h = 36 + r() * 80, cx = lerp(x0 + 50, x1 - 50, (r() + r()) / 2), cy = lerp(y0 + 50, y1 - 50, (r() + r()) / 2), a = (r() - 0.5) * 1.8, k = 0.4 + r() * 0.6, [sx, sy] = g.shade(6 * k, 8 * k);
      c.save(); c.translate(cx, cy); c.rotate(a);
      c.fillStyle = 'rgba(3,5,7,.4)'; c.fillRect(-w / 2 + sx, -h / 2 + sy, w, h);
      c.fillStyle = tones[(r() * 5) | 0]; c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = rgba('lane', 0.06); c.lineWidth = g.px; c.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
      c.restore();
    }
  }
  function scooter(g, p, phone) {
    const c = g.ctx, [sx, sy] = g.shade(3, 4);
    for (const [dx, dy, col] of [[sx, sy, 'rgba(0,0,0,.45)'], [0, 0, '#9AA4AA']]) { c.save(); c.translate(p.x + dx, p.y + dy); c.rotate(p.a); c.beginPath(); rr(c, -36, -9, 68, 18, 8); c.fillStyle = col; c.fill(); c.restore(); }
    c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.strokeStyle = '#C9CFD3'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(27, -17); c.lineTo(27, 17); c.stroke(); c.restore();
    g.person({ x: p.x - 3 * Math.cos(p.a), y: p.y - 3 * Math.sin(p.a), a: p.a }, { r: PR - 1, phone });
  }
  const person = (g, p, o = {}) => g.person(p, Object.assign({ r: PR }, o));
  const dev = (g, x, y) => g.device(x, y, { r: 3.4 });

  /* ============================================================ 1. the street: a child behind a bus */
  const H = { car: { x: -170, y: 272, a: 0 }, bus: { x: 270, y: 418, a: 0 }, kid: { x: 646, y: 400, a: -HP } };
  const BUSBOX = { x: 270, y: 418, a: 0, l: 480, w: 102 };
  function streetGround(g) {
    const X0 = -1700, X1 = 2100;
    g.pavement([[X0, -900], [X1, -900], [X1, 0], [X0, 0]]); g.kerb([[X0, 0], [X1, 0]]);
    const sp = [[X0, 360], [-10, 360], [36, 474], [516, 474], [562, 360], [X1, 360], [X1, 1100], [X0, 1100]];
    g.pavement(sp); g.kerb(sp.slice(0, 6));
    row(g, X0, X1, -340, 210, 11); row(g, X0 + 90, X1, -820, 260, 23); row(g, X0, X1, 640, 300, 37);
    for (const [x, y, r] of [[-640, -460, 44], [-300, -450, 52], [-120, -500, 36], [250, -455, 48], [620, -470, 40], [900, -450, 50], [1250, -470, 44]]) g.tree(x, y, r);
    g.marking([[X0, 180], [540, 180]], { dash: [110, 130] }); g.marking([[760, 180], [X1, 180]], { dash: [110, 130] });
    g.marking([[566, 190], [566, 352]], { w: 9, alpha: 0.62 }); g.marking([[724, 8], [724, 170]], { w: 9, alpha: 0.62 });
    g.zebra(596, 10, 694, 350);
    g.tactile(596, -46, 98, 40); g.tactile(596, 366, 98, 40);
    g.shelter(140, 502, 250, 36);
    for (const [x, y, r] of [[-560, -64, 36], [-150, -66, 40], [330, -64, 34], [860, -66, 38], [1280, -64, 36], [-520, 548, 40], [820, 540, 38], [1180, 552, 34]]) g.tree(x, y, r);
    for (const x of [-420, 120, 500, 960]) lampAt(g, x, -12, HP);
    for (const x of [-260, 760, 1220]) lampAt(g, x, 372, -HP);
  }
  S.street = {
    focus: { x: -420, y: -700, w: 1200, h: 1500 },
    ground: streetGround,
    draw(g, o, L) {
      const { car, bus, kid } = H, st = o.stage || 9;
      g.vehicle('bus', bus, {});
      g.vehicle('van', { x: 1010, y: 92, a: Math.PI }, { lights: 1 });
      g.vehicle('car', car, { lights: 1, phone: o.vz ? null : 'off' });
      person(g, kid, { phone: o.vz ? null : 'off' });
      headlamps(g, car, [BUSBOX], 0.55, 600); headlamps(g, { x: 1010, y: 92, a: Math.PI, l: 250 }, [], 0.3, 420);
      g.cone({ x: car.x + 26, y: car.y }, 0, 0.6, 1150, [BUSBOX], { k: o.vz ? 1 : 1.5 });
      g.lights('Night');
      if (!o.vz) return;
      rings(g, kid.x, kid.y, o.R || 900, { n: o.n || 5 });
      if (st >= 3) {
        g.trail(K.route([[kid.x, kid.y], [kid.x, -30]]), 20, 330, { gap: 13 });
        g.trail(K.route([[car.x, car.y], [760, car.y]]), o.meet ? 440 : 104, 360, { gap: 13 });
      }
      if (o.meet) rings(g, kid.x, car.y, 46, { n: 1, fill: false, w: 2 });
      dev(g, car.x + 4, car.y); dev(g, kid.x, kid.y);
      L.pulse(kid.x, kid.y, o.R || 300); if (st >= 4) L.run(kid, { x: car.x + 4, y: car.y });
      if (st === 2) L.plate(kid.x, kid.y, 'About to cross', { dy: 46 });
      if (st >= 4) {
        g.flash(car, 0.5, { l: 176, w: 74 }); g.flash(kid, 0.5, { l: 34, w: 34 });
        L.chip(car.x, car.y, 'Child ahead', { side: o.carSide || 'up', gap: 52 });
      }
    }
  };

  /* ============================================================ 2. the apron: bubbles */
  const AP = { ac: { x: 0, y: 0, a: 0 }, L: 760, tug: { x: -700, y: -70, a: HP }, wk: { x: -545, y: 128, a: Math.PI }, LANE: [-780, -620] };
  const B_AC = { x: 0, y: 0, a: 0, rx: 414, ry: 406, n: 2.6 }, B_TUG = { x: -700, y: -40, a: HP, rx: 200, ry: 112, n: 2.4 }, B_WK = { x: -545, y: 128, a: 0, rx: 104, ry: 104, n: 2 };
  const CARTS = [-250, -140, -30].map((y) => ({ x: -584, y, a: HP }));
  function apronGround(g, o) {
    const X0 = -2200, X1 = 2200, Y0 = -1400, Y1 = 1400, [l0, l1] = AP.LANE, c = g.ctx;
    g.pavement([[l1, Y0], [X1, Y0], [X1, Y1], [l1, Y1]], { grid: 200 }); g.pavement([[X0, Y0], [l0, Y0], [l0, Y1], [X0, Y1]], { grid: 200 });
    g.marking([[l0, Y0], [l0, Y1]], { w: 5, alpha: 0.6 }); g.marking([[l1, Y0], [l1, Y1]], { w: 5, alpha: 0.6 });
    g.marking([[(l0 + l1) / 2, Y0], [(l0 + l1) / 2, Y1]], { dash: [60, 70], w: 4, alpha: 0.4 });
    // the stand: its box, the lead-in line, the stop bar
    if (!o.noac) g.marking([[-470, -450], [470, -450], [470, 450], [-470, 450], [-470, -450]], { dash: [26, 22], w: 4, alpha: 0.34 });
    if (!o.noac) g.marking([[-520, 0], [560, 0]], { w: 4, alpha: 0.3 }); g.marking([[396, -40], [396, 40]], { w: 7, alpha: 0.5 });
    // terminal and jet bridge at the nose
    g.building(640, -900, 420, 1800, { height: 1.6, seed: 5 });
    if (!o.noac) g.aircraft(AP.ac, { l: AP.L });
    if (!o.noac) for (const [x, y] of [[404, 0], [-404, 0], [-90, -386], [-90, 386], [250, -230], [250, 230], [-330, -200], [-330, 200]]) g.pylon(x, y);
    // a second stand to the south, and equipment
    g.aircraft({ x: 40, y: 1010, a: 0 }, { l: AP.L }); g.aircraft({ x: 40, y: -1010, a: 0 }, { l: AP.L });
    g.vehicle('cart', { x: -584, y: 330, a: HP }, {});
    
    g.vehicle('truck', { x: 120, y: 330, a: 0.0 }, { l: 300, w: 86 });
  }
  S.apron = {
    focus: { x: -1000, y: -458, w: 1500, h: 917 },
    ground: apronGround,
    draw(g, o, L) {
      const { tug, wk } = AP;
      for (const p of CARTS) g.vehicle('cart', p, {});
      g.vehicle('tug', tug, { lights: 1, phone: o.vz ? null : 'off' });
      person(g, wk, { phone: o.vz ? null : 'off' });
      person(g, { x: 150, y: -210, a: 0.4 }, { phone: o.vz ? null : 'off' }); if (o.vz && !o.noac) person(g, { x: -900, y: 300, a: -1 }, {});
      headlamps(g, Object.assign({ l: 120 }, tug), CARTS.map((p) => ({ x: p.x, y: p.y, a: p.a, l: 104, w: 62 })), 0.4, 420);
      g.lights('Night');
      if (!o.vz) { g.cone({ x: tug.x, y: tug.y + 30 }, HP, 0.6, 700, CARTS.map((p) => ({ x: p.x, y: p.y, a: p.a, l: 104, w: 62 })), { k: 1.5 }); return; }
      if (!o.noac) { g.bubble(B_AC, { alert: 0.5 }); for (const [x, y] of [[404, 0], [-404, 0], [-90, -386], [-90, 386]]) g.tag(x, y); }
      g.bubble({ x: 150, y: -210, a: 0, rx: 84, ry: 84, n: 2 }, { strength: 0.8 }); if (!o.noac) g.bubble({ x: -900, y: 300, a: 0, rx: 84, ry: 84, n: 2 }, { strength: 0.8 });
      g.bubble(B_TUG, { alert: 1 }); g.bubble(B_WK, { alert: 1 }); g.overlap(B_TUG, B_WK, 1);
      dev(g, tug.x, tug.y); dev(g, wk.x, wk.y); dev(g, 150, -210); if (!o.noac) dev(g, -900, 300);
      L.pulse(wk.x, wk.y, 84); L.run(wk, tug);
      L.chip(tug.x, tug.y, 'Worker ahead', { side: 'up', gap: 44 });
      if (o.plates !== false) {
        L.plate(-700, -330, 'People and vehicles: Today', { status: 'today' });
        L.plate(60, -452, 'Tagged aircraft: Today', { status: 'today' });
      }
    }
  };

  /* ============================================================ 3. the collapse: no network */
  const R = { trap: { x: -250, y: -10, a: -0.6 }, r1: { x: -40, y: 300, a: -2.2 }, r2: { x: 290, y: 190, a: Math.PI }, cp: { x: 640, y: 205, a: -HP }, r3: { x: -420, y: 285, a: -1.2 }, tw: { x: 500, y: -250 } };
  function collapseGround(g, o) {
    const tw = o.twp ? { x: o.twp[0], y: o.twp[1] } : o.tw ? { x: o.tw[0], y: o.tw[1] } : o.hero && !o.solo ? { x: 113, y: -225 } : R.tw;
    const X0 = -1600, X1 = 2000, Y0 = -1300, Y1 = 1500;
    g.pavement([[X0, Y0], [180, Y0], [180, 340], [X0, 340]]); g.pavement([[380, Y0], [X1, Y0], [X1, 340], [380, 340]]); g.pavement([[X0, 560], [X1, 560], [X1, Y1], [X0, Y1]]);
    g.kerb([[X0, 340], [180, 340], [180, Y0]]); g.kerb([[380, Y0], [380, 340], [X1, 340]]); g.kerb([[X0, 560], [X1, 560]]);
    g.marking([[X0, 450], [X1, 450]], { dash: [110, 130] }); g.marking([[280, Y0], [280, 330]], { dash: [110, 130] });
    row(g, X0, -560, -300, 560, 41); row(g, X0, 170, -640, 300, 43); row(g, 390, X1, -700, 360, 47); row(g, 980, X1, -300, 600, 53); row(g, X0, X1, 620, 320, 59);
    rubble(g, -520, -260, 20, 250, 29);
    tower(g, tw.x, tw.y);
    if (!o.hero) g.building(520, -40, 250, 170, { height: 0.5, tone: '#3A4247', seed: 7 }); // the field command post
    for (const [x, y, r] of o.tw || o.hero ? [] : [[430, 90, 36]]) g.tree(x, y, r);
    for (const x of [-620, 80, 700, 1200]) lampAt(g, x, 572, -HP);
  }
  S.collapse = {
    focus: { x: -660, y: -420, w: 1500, h: 917 },
    ground: collapseGround,
    draw(g, o, L) {
      const { trap, r2, cp, r3 } = R, r1 = o.hero ? { x: -150, y: 300, a: -2.2 } : R.r1, ph = o.vz ? null : 'off', mate = { x: 600, y: 165, a: 0.3 };
      const crew = o.tw ? [{ x: 300, y: 150, a: Math.PI }, { x: 640, y: 200, a: -HP }] : o.solo ? [r1] : o.hero ? [r1, r3] : [r1, r2, cp, r3, mate];
      person(g, trap, o.vz ? { ghost: true } : { alpha: 0.55, phone: 'off' });
      for (const p of crew) person(g, p, { phone: ph });
      g.lights('Night');
      const tw = o.twp ? { x: o.twp[0], y: o.twp[1] } : o.tw ? { x: o.tw[0], y: o.tw[1] } : o.hero && !o.solo ? { x: 113, y: -225 } : R.tw;
      if (!o.vz) { L.plate(tw.x, tw.y, 'No cellular network', { dy: 78 }); return; }
      rings(g, trap.x, trap.y, o.R || 330, { n: 3 });
      for (const p of crew) rings(g, p.x, p.y, 120, { n: 2, s: 0.75, core: 0.9 });
      link(g, trap, r1, { p: 0.6 }); if (!o.solo) link(g, trap, r3, { p: 0.7, alpha: 0.6 });
      if (o.solo) {} else if (o.hero) link(g, r1, r3, { p: 0.5, alpha: 0.6 }); else { link(g, r1, r2, { p: 0.5 }); link(g, r2, cp, { p: 0.55 }); }
      for (const p of [trap, ...crew]) dev(g, p.x, p.y);
      // the zone breathes, and each message runs from the trapped person to whoever is told
      L.pulse(trap.x, trap.y, o.R || 330); crew.forEach((p, i) => L.pulse(p.x, p.y, 120, { delay: 0.6 + i * 0.15 }));
      if (!o.tw) { L.run(trap, r1); if (!o.solo) L.run(r1, o.hero ? r3 : r2, { delay: 1.2 }); if (!o.hero && !o.solo) L.run(r2, cp, { delay: 2.4 }); }
      L.plate(tw.x, tw.y, 'No cellular network', { dy: 78 });
      L.chip(trap.x, trap.y, 'Person trapped', { side: 'up', gap: 30 });
      if (o.hero) { if (!o.solo) L.plate(r3.x, r3.y, 'Push-to-talk', { dy: 46 }); return; }
      L.chip(cp.x, cp.y, 'SOS and position', { side: 'down', gap: 32 });
      L.plate(645, -4, 'Field command post', {});
      if (o.plates !== false) {
        L.plate(-500, -255, 'Voice and data: Today', { status: 'today', align: 'left' });
        L.plate(470, 196, 'One phone in between: Today', { status: 'today', dy: -70 });
      }
    }
  };

  /* ============================================================ 4. the junction: a scooter in the blind spot */
  const J = { car: { x: 372, y: 262, a: 0.2 }, sc: { x: 206, y: 330, a: 0 }, sen: { x: 1006, y: 150, a: -HP } };
  const CAR_RT = K.route([[-600, 250], [470, 250], [640, 420], [640, 1200]], 150), SC_RT = K.route([[-600, 330], [1700, 330]]);
  function junctionGround(g) {
    const X0 = -1600, X1 = 2200, Y0 = -1200, Y1 = 1500, c = g.ctx;
    g.pavement([[X0, Y0], [X1, Y0], [X1, 0], [X0, 0]]); g.kerb([[X0, 0], [X1, 0]]);
    g.pavement([[X0, 360], [500, 360], [500, Y1], [X0, Y1]]); g.pavement([[780, 360], [X1, 360], [X1, Y1], [780, Y1]]);
    g.kerb([[X0, 360], [470, 360], [500, 390], [500, Y1]]); g.kerb([[780, Y1], [780, 390], [810, 360], [X1, 360]]);
    c.fillStyle = rgba('lane', 0.03); c.fillRect(X0, 300, X1 - X0, 60);
    g.marking([[X0, 300], [X1, 300]], { w: 4, alpha: 0.5, dash: [40, 26] });
    g.marking([[X0, 150], [900, 150]], { dash: [110, 130] }); g.marking([[1110, 150], [X1, 150]], { dash: [110, 130] });
    g.marking([[640, 420], [640, Y1]], { dash: [110, 130] });
    g.zebra(956, 10, 1056, 350); g.tactile(956, -46, 100, 40); g.tactile(956, 366, 100, 40);
    g.marking([[926, 160], [926, 292]], { w: 9, alpha: 0.62 });
    g.zebra(510, 420, 770, 500, { vertical: true });
    row(g, X0, X1, -420, 300, 71); row(g, X0, 480, 470, 360, 73); row(g, 800, X1, 470, 360, 79); row(g, X0, X1, -900, 380, 83);
    for (const [x, y, r] of [[-250, -60, 36], [120, -62, 40], [560, -60, 34], [1250, -62, 38], [-150, 420, 36], [900, 418, 34], [1320, 420, 38]]) g.tree(x, y, r);
    for (const x of [-100, 760, 1180]) lampAt(g, x, -12, HP);
    lampAt(g, 430, 372, -HP);
    // the traffic light at the crossing
    c.fillStyle = '#56616A'; c.fillRect(1066, -22, 14, 14); c.fillRect(934, 366, 14, 14);
  }
  S.junction = {
    focus: { x: -330, y: -330, w: 1500, h: 917 },
    ground: junctionGround,
    draw(g, o, L) {
      const { car, sc, sen } = J, ph = o.vz ? null : 'off';
      if (!o.novan) g.vehicle('van', { x: -60, y: 250, a: 0 }, { lights: 1 }); g.vehicle('car', { x: 760, y: 86, a: Math.PI }, { lights: 1, brake: 0.6 });
      g.vehicle('car', car, { lights: 1, phone: ph });
      scooter(g, sc, ph); person(g, sen, { phone: ph }); person(g, { x: -120, y: -70, a: 0 }, { phone: 'off' });
      headlamps(g, car, [], 0.5, 520); headlamps(g, { x: 760, y: 86, a: Math.PI }, [], 0.35, 420); if (!o.novan) headlamps(g, { x: -60, y: 250, a: 0, l: 250 }, [], 0.25, 300);
      g.lights('Night');
      if (!o.vz) return;
      rings(g, sc.x, sc.y, 250 * (o.k || 1), { n: 3 }); rings(g, car.x, car.y, 300 * (o.k || 1), { n: 2, s: 0.75 });
      link(g, { x: sc.x - 3, y: sc.y }, { x: car.x + 4, y: car.y }, { p: 0.6 });
      rings(g, sen.x, sen.y, 110, { n: 2, s: 0.8, core: 0.9 });
      dev(g, car.x + 4, car.y); dev(g, sc.x - 3, sc.y); dev(g, sen.x, sen.y);
      L.pulse(sc.x, sc.y, 250 * (o.k || 1)); L.run(sc, { x: car.x + 4, y: car.y });
      g.flash(car, 0.5, { l: 176, w: 74 });
      L.chip(car.x, car.y, 'Scooter on the right', { side: 'up', gap: 54 });
      if (o.plates !== false) L.plate(1100, -62, 'More time to cross: Vision', { status: 'vision', align: 'right' });
    }
  };

  /* ============================================================ 5. the kerb: music on, eyes on the screen */
  const KB = { p: { x: 0, y: -34, a: HP }, car: { x: 300, y: 78, a: Math.PI } };
  S.kerb = {
    focus: { x: -230, y: -400, w: 760, h: 850 },
    ground(g) {
      const X0 = -1400, X1 = 1600;
      g.pavement([[X0, -900], [X1, -900], [X1, 0], [X0, 0]]); g.kerb([[X0, 0], [X1, 0]]);
      g.pavement([[X0, 300], [X1, 300], [X1, 1000], [X0, 1000]]); g.kerb([[X0, 300], [X1, 300]]);
      g.marking([[X0, 150], [-90, 150]], { dash: [110, 130] }); g.marking([[90, 150], [X1, 150]], { dash: [110, 130] });
      g.zebra(-54, 10, 54, 290); g.tactile(-54, -46, 108, 40); g.tactile(-54, 306, 108, 40);
      g.marking([[84, 8], [84, 142]], { w: 9, alpha: 0.62 });
      row(g, X0, X1, -520, 340, 91); row(g, X0, X1, 400, 400, 97);
      for (const [x, y, r] of [[-170, -80, 38], [260, -84, 42], [-160, 372, 34], [330, 366, 38]]) g.tree(x, y, r);
      lampAt(g, 150, -12, HP); lampAt(g, -120, 312, -HP);
      g.shelter(-200, -150, 120, 30);
    },
    draw(g, o, L) {
      const { p, car } = KB, c = g.ctx;
      g.vehicle('car', car, { lights: 1, phone: o.vz ? null : 'off' });
      person(g, p, { r: PR + 1 });
      // headphones: a band over the head and a pad at each ear
      c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.strokeStyle = '#3A4247'; c.lineWidth = 4.5; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, PR + 1, HP - 0.15, HP * 3 + 0.15); c.stroke(); c.fillStyle = '#2A3135'; c.beginPath(); rr(c, -6, -PR - 6, 12, 8, 3); rr(c, -6, PR - 2, 12, 8, 3); c.fill(); c.restore();
      headlamps(g, car, [], 0.5, 520);
      g.lights('Night');
      if (!o.vz) return;
      rings(g, p.x, p.y, 290 * (o.k || 1), { n: 3 });
      g.trail(K.route([[p.x, p.y], [p.x, 330]]), 22, 250, { gap: 13 }); g.trail(K.route([[car.x, car.y], [-600, car.y]]), 100, 180, { gap: 13 });
      dev(g, p.x, p.y); dev(g, car.x - 4, car.y);
      L.pulse(p.x, p.y, 290 * (o.k || 1));
      g.flash(p, 0.5, { l: 36, w: 36 });
      L.chip(p.x, p.y, 'Look up', { side: 'up', gap: 34 });
      if (o.plates !== false) L.plate(45, 340, 'At a crossing: In development', { status: 'dev' });
    }
  };

  /* ============================================================ 6. the trail: a family where there is no signal */
  const TR = { a: { x: -170, y: -250, a: 0.9 }, b: { x: 40, y: -10, a: 2.4 }, c: { x: -90, y: 270, a: -1.1 } };
  S.trail = {
    focus: { x: -330, y: -420, w: 620, h: 850 },
    ground(g) {
      const c = g.ctx, r = rng(77);
      c.fillStyle = '#20262A'; c.fillRect(-2000, -2000, 4000, 4000);
      // the path: a paler ribbon winding through the wood
      const pts = [[-420, -520], [-250, -330], [-130, -200], [40, -90], [150, 40], [60, 190], [-80, 300], [-140, 470], [-60, 700]];
      c.lineCap = 'round'; c.lineJoin = 'round'; g.path(pts, false); c.strokeStyle = '#2B3236'; c.lineWidth = 86; c.stroke(); c.strokeStyle = rgba('lane', 0.035); c.lineWidth = 60; c.stroke();
      const near = (x, y) => pts.some(([px, py]) => Math.hypot(px - x, py - y) < 92);
      for (let i = 0; i < 260; i++) { const x = lerp(-700, 700, r()), y = lerp(-800, 800, r()), s = 26 + r() * 34; if (!near(x, y)) g.tree(x, y, s); }
      for (let i = 0; i < 40; i++) { const x = lerp(-700, 700, r()), y = lerp(-800, 800, r()); c.fillStyle = '#3A4247'; c.beginPath(); c.arc(x, y, 4 + r() * 7, 0, TAU); c.fill(); }
    },
    draw(g, o, L) {
      const { a, b, c } = TR;
      for (const p of [a, b, c]) person(g, p, { phone: o.vz ? null : 'off', r: p === c ? PR - 2.5 : PR });
      if (!o.vz) return;
      rings(g, b.x, b.y, 200, { n: 2 });
      rings(g, a.x, a.y, 110, { n: 2, s: 0.8, core: 0.9 }); rings(g, c.x, c.y, 110, { n: 2, s: 0.8, core: 0.9 });
      link(g, b, a, { p: 0.62 }); link(g, b, c, { p: 0.58 });
      for (const p of [a, b, c]) dev(g, p.x, p.y);
      L.pulse(b.x, b.y, 200); L.run(b, a); L.run(b, c, { delay: 1.2 });
      L.chip(b.x, b.y, '“We’re by the trees”', { side: 'down', gap: 30 });
      if (o.plates !== false) L.plate(-28, 372, 'No network: Today', { status: 'today' });
    }
  };

  /* ============================================================ 7. the idea: aware, and telling whoever it concerns */
  const ID = { p: { x: 0, y: 0, a: HP }, car: { x: 300, y: 222, a: Math.PI }, sc: { x: -300, y: 262, a: 0 }, q: { x: -300, y: -150, a: 0.5 }, tw: { x: 360, y: -150 } };
  S.idea = {
    focus: { x: -540, y: -640, w: 1080, h: 1350 },
    ground(g) {
      const X0 = -1500, X1 = 1500;
      g.pavement([[X0, -1200], [X1, -1200], [X1, 140], [X0, 140]]); g.kerb([[X0, 140], [X1, 140]]);
      g.pavement([[X0, 450], [X1, 450], [X1, 1300], [X0, 1300]]); g.kerb([[X0, 450], [X1, 450]]);
      g.marking([[X0, 295], [X1, 295]], { dash: [110, 130] });
      g.ctx.fillStyle = rgba('lane', 0.03); g.ctx.fillRect(X0, 392, X1 - X0, 58); g.marking([[X0, 392], [X1, 392]], { w: 4, alpha: 0.5, dash: [40, 26] });
      row(g, X0, X1, -640, 330, 101); row(g, X0, X1, 540, 420, 103);
      tower(g, ID.tw.x, ID.tw.y);
      for (const [x, y, r] of [[-470, 60, 38], [-130, -250, 44], [130, -230, 36], [470, 70, 40], [-60, 500, 30], [400, 505, 34]]) g.tree(x, y, r);
      lampAt(g, -180, 128, HP); lampAt(g, 220, 128, HP); lampAt(g, 20, 462, -HP);
      g.shelter(-470, -260, 150, 34);
    },
    draw(g, o, L) {
      const { p, car, sc, q } = ID;
      g.vehicle('car', car, { lights: 1 }); scooter(g, sc, null); person(g, p, { r: PR + 2 }); person(g, q); person(g, { x: 440, y: 40, a: 2.2 }, { phone: 'off' });
      headlamps(g, car, [], 0.5, 520); g.lights('Night');
      rings(g, p.x, p.y, 300, { n: 4 });
      link(g, p, { x: car.x + 4, y: car.y }, { p: 0.6 }); link(g, p, sc, { p: 0.55 }); link(g, p, q, { p: 0.6 });
      dev(g, p.x, p.y); dev(g, car.x + 4, car.y); dev(g, sc.x - 3, sc.y); dev(g, q.x, q.y);
      L.pulse(p.x, p.y, 300); L.run(p, { x: car.x + 4, y: car.y }); L.run(p, sc, { delay: 0.8 }); L.run(p, q, { delay: 1.6 });
      L.plate(ID.tw.x, ID.tw.y, 'No cellular network', { dy: 80 });
      L.plate(-165, 186, 'Direct, phone to phone (D2D)', { dy: -44 });
    }
  };

  /* ============================================================ 8. one street: things that can happen at once */
  const AD = {
    kid: { x: -100, y: 22, a: 0 }, car: { x: 270, y: 410, a: -HP }, van: { x: -2, y: 236, a: -HP },
    fall: { x: 650, y: 330, a: 0.7 }, m1: { x: 830, y: 455, a: -2.4 }, m2: { x: 540, y: 140, a: 1.1 },
    trk: { x: 720, y: -420, a: 0 }, wk: { x: 478, y: -372, a: -HP }
  };
  const B_TRK = { x: 690, y: -420, a: 0, rx: 280, ry: 116, n: 2.4 }, B_W2 = { x: 478, y: -372, a: 0, rx: 100, ry: 100, n: 2 };
  S.ads = {
    focus: { x: -420, y: -1143, w: 1500, h: 1875 },
    ground(g) {
      const Y0 = -2400, Y1 = 1700, X0 = -1500, X1 = 2100, c = g.ctx;
      g.pavement([[X0, Y0], [-56, Y0], [-56, Y1], [X0, Y1]]); g.kerb([[-56, Y0], [-56, Y1]]);
      g.pavement([[416, Y0], [X1, Y0], [X1, Y1], [416, Y1]]); g.kerb([[416, Y0], [416, Y1]]);
      g.marking([[180, Y0], [180, -60]], { dash: [110, 130] }); g.marking([[180, 110], [180, Y1]], { dash: [110, 130] });
      g.zebra(-46, -24, 406, 68, { vertical: true }); g.tactile(-100, -24, 40, 92); g.tactile(420, -24, 40, 92);
      g.marking([[190, 104], [406, 104]], { w: 9, alpha: 0.62 }); g.marking([[-46, -60], [170, -60]], { w: 9, alpha: 0.62 });
      // west side: a row of roofs behind a narrow pavement
      for (const [y, h, s] of [[-2300, 420, 3], [-1840, 400, 5], [-1400, 380, 7], [-980, 420, 9], [-520, 360, 13], [-120, 330, 15], [250, 400, 17], [690, 420, 19], [1150, 400, 21]]) g.building(-900, y, 700, h, { seed: s });
      for (const [x, y, r] of [[-128, -250, 30], [-126, -640, 34], [-128, -1000, 30], [-128, 420, 32], [-126, 800, 30]]) g.tree(x, y, r);
      // east side: roofs, a fenced yard with a gate, then an open square
      for (const [y, h, s] of [[-2300, 430, 51], [-1830, 400, 53], [-1390, 420, 57], [-930, 300, 59]]) g.building(520, y, 760, h, { seed: s });
      c.fillStyle = '#1F2529'; c.fillRect(440, -580, 1400, 350);
      g.marking([[440, -580], [1840, -580]], { w: 5, alpha: 0.42 }); g.marking([[440, -230], [1840, -230]], { w: 5, alpha: 0.42 }); g.marking([[440, -580], [440, -500]], { w: 5, alpha: 0.42 }); g.marking([[440, -270], [440, -230]], { w: 5, alpha: 0.42 });
      for (const [x, y, r] of [[500, -130, 30], [900, 120, 40], [1020, 380, 36], [470, 250, 30], [700, 560, 38], [480, 640, 30], [960, -100, 34]]) g.tree(x, y, r);
      g.shelter(600, 20, 150, 34);
      for (const [y, h, s] of [[700, 420, 61], [1160, 400, 67]]) g.building(520, y, 760, h, { seed: s });
      for (const y of [-900, -200, 420]) { lampAt(g, -68, y, 0); lampAt(g, 428, y + 330, Math.PI); }
    },
    draw(g, o, L) {
      const { kid, car, van, fall, m1, m2, trk, wk } = AD;
      g.vehicle('van', van, {}); g.vehicle('car', car, { lights: 1 });
      g.vehicle('car', { x: 90, y: -500, a: HP }, { lights: 1, phone: 'off' });
      g.vehicle('truck', trk, { l: 440, lights: 1 });
      person(g, kid); person(g, wk); person(g, m1); person(g, m2);
      // the person who fell: lying, drawn as a longer body
      const c = g.ctx; c.save(); c.translate(fall.x, fall.y); c.rotate(fall.a); c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); rr(c, -24, -11, 60, 28, 13); c.fill(); c.strokeStyle = 'rgba(5,8,10,.85)'; c.lineWidth = 3 * g.px; c.fillStyle = '#F7F8F8'; c.beginPath(); rr(c, -27, -14, 60, 28, 13); c.stroke(); c.fill(); c.restore();
      for (const [x, y, a] of [[-130, -330, 1.4], [900, -60, 2.6], [1000, 250, -2], [-125, 250, -1.5]]) person(g, { x, y, a }, { phone: 'off', r: PR - 2 });
      const VB = { x: van.x, y: van.y, a: van.a, l: 250, w: 92 };
      headlamps(g, car, [VB], 0.5, 520); headlamps(g, { x: 90, y: -500, a: HP }, [], 0.3, 420);
      g.cone({ x: car.x, y: car.y - 26 }, -HP, 0.62, 900, [VB]);
      g.lights('Night');
      rings(g, kid.x, kid.y, 230, { n: 3 }); link(g, kid, { x: car.x, y: car.y - 4 }, { p: 0.6 });
      rings(g, fall.x, fall.y, 280, { n: 3, s: 0.9 });
      link(g, fall, m1, { p: 0.6, dash: true }); link(g, fall, m2, { p: 0.6, dash: true });
      g.bubble(B_TRK, { alert: 1 }); g.bubble(B_W2, { alert: 1 }); g.overlap(B_TRK, B_W2, 1);
      for (const p of [kid, { x: car.x, y: car.y - 4 }, fall, m1, m2, { x: trk.x + 172, y: trk.y }, wk]) dev(g, p.x, p.y);
      L.pulse(kid.x, kid.y, 230); L.run(kid, { x: car.x, y: car.y - 4 }); L.pulse(fall.x, fall.y, 280, { delay: 1.2 }); L.run(wk, { x: trk.x + 172, y: trk.y }, { delay: 0.6 });
      L.plate(trk.x - 20, trk.y - 30, 'Driver warned: Today', { status: 'today' });
      L.chip(car.x, car.y, 'Pedestrian ahead', { side: 'down', gap: 50 });
      L.plate(m2.x, m2.y, 'People nearby will be warned', {});
    }
  };

  /* ============================================================ 9. the road of milestones */
  S.road = {
    focus: { x: -60, y: -675, w: 420, h: 1350 },
    ground(g) {
      const Y0 = -3000, Y1 = 9000; // long: on a phone the road runs the whole height of the milestones
      g.pavement([[-400, Y0], [0, Y0], [0, Y1], [-400, Y1]]); g.kerb([[0, Y0], [0, Y1]]);
      g.pavement([[300, Y0], [800, Y0], [800, Y1], [300, Y1]]); g.kerb([[300, Y0], [300, Y1]]);
      g.marking([[150, Y0], [150, Y1]], { dash: [110, 130] });
      for (let y = -640; y < 8800; y += 700) lampAt(g, -10, y, 0);
    },
    draw(g, o) {
      const car = { x: 75, y: o.cy || 458, a: HP };
      g.vehicle('car', car, { lights: 1 });
      headlamps(g, car, [], 0.55, 480); g.lights('Night');
      g.trail(K.route([[75, car.y], [75, car.y + 1000]]), 100, 200, { gap: 15 });
      rings(g, car.x, car.y, 112, { n: 2, core: 0.9 });
      dev(g, car.x, car.y + 4);
    }
  };

  /* ============================================================ small tiles for the foundations */
  S.blank = { focus: { x: -200, y: -200, w: 400, h: 400 }, ground() {}, draw() {} };
})();
