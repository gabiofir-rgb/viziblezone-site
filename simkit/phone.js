/* The phone a person holds, as a second view where that person receives something (README: phone()). It needs
   simkit.js first: a scene that draws one loads this file after the kit, before its sim.js. */
(function () {
  'use strict';
  const K = VZKit, { C, FONT, rgba, clamp, lerp, ease, rr, LAG, BEAT } = K, TAU = Math.PI * 2, P = K.Painter.prototype;
  const shape = (c, x, y, w, h, r) => { c.beginPath(); rr(c, x, y, w, h, r); };

  // Its screen at (x, y, w, h), top to bottom: o.note a notice (the first line, in words when big), o.map her dot, the
  // other's and the line between, the other lines in words (when big), o.talk a voice coming in. big: the phone at its
  // beat; its words are wrapped to the screen's width, as large as it allows and never under 10 px (round 5, Codex
  // P2: no line is left out), each row recorded in big.words for the tests (with the notice's box for its rows). The
  // small view's words sit beside it.
  // A screen of words only (no notice, no map: a call) starts at 16 px, its words in the middle, o.who (who talks,
  // muted) above them (Fable, sixth review).
  function screen(g, x, y, w, h, o, lines, big) {
    const c = g.ctx, pad = Math.max(3, w * 0.07), inner = w - 2 * pad;
    const inset = Math.max(4, inner * 0.06), room = inner - 2 * inset, wide = (t, z, wt = 800) => { c.font = wt + ' ' + z + 'px ' + FONT; return c.measureText(t).width; };
    let top = y + pad, ts = 0, rows = [], bh = 0, bars = 0;
    if (big) { // the largest size at which every word fits the width and every row the height; 10 px at least
      const t0 = clamp(w / 8, o.note || o.map ? 11 : 16, 22), most = (a) => Math.max(...a.map((t) => wide(t, t0)));
      ts = Math.min(t0, (t0 * room) / most(lines)); // each line on one row, if that keeps it large; else rows of whole words
      if (ts < Math.max(10, t0 * 0.75)) ts = Math.max(10, Math.min(t0, (t0 * room) / most(lines.join(' ').split(' '))));
      for (; ; ts = Math.max(10, ts * 0.92)) {
        rows = lines.map((t) => t.split(' ').reduce((r, v) => { const l = r.length - 1; if (l >= 0 && wide(r[l] + ' ' + v, ts) <= room) r[l] += ' ' + v; else r.push(v); return r; }, []));
        bh = o.note ? ts * (0.85 + 1.25 * rows[0].length) : 0; bars = o.talk ? ts * 2.4 : 0;
        const said = (o.note ? rows.slice(1) : rows).reduce((n, r) => n + r.length, 0);
        if (bh + said * ts * 1.35 + bars + 3 * pad <= h || ts <= 10) break;
      }
    }
    const say = (t, u, v, wt, col, a, box) => { big.words.push([u, v - ts * 0.8, u + wide(t, ts, wt), v + ts * 0.25, t, ts, box]); g.text(u, v, t, { size: ts, weight: wt, color: col, alpha: a }); };
    c.fillStyle = '#0A0D0F'; c.fillRect(x, y, w, h);
    const rest = ts ? (o.note ? rows.slice(1) : rows).flatMap((r, i) => r.map((t) => [t, o.who && !o.note && !i])) : []; // [words, muted]
    if (o.note) {
      if (!ts) bh = Math.max(8, h * 0.14);
      c.fillStyle = C.zone; shape(c, x + pad, top, inner, bh, Math.min(6, bh / 3)); c.fill();
      if (ts) rows[0].forEach((t, i) => say(t, x + pad + inset, top + ts * (1.3 + 1.25 * i), 800, C.ink, 1, [x + pad, top, x + pad + inner, top + bh]));
      top += bh + pad;
    }
    if (!ts) bars = o.talk ? h * 0.24 : 0;
    const words = rest.length ? rest.length * ts * 1.35 + pad : 0, mh = y + h - pad - bars - words - top;
    if (o.map && mh > 10) {
      const mx = x + pad, r = Math.max(2.5, inner * 0.045), at = (u, v) => [mx + inner * u, top + mh * v];
      if (ts) { // a plan behind the dots: a few faint streets
        c.fillStyle = '#141A1E'; c.fillRect(mx, top, inner, mh);
        c.strokeStyle = rgba('lane', 0.1); c.lineWidth = 1; c.beginPath();
        for (const u of [0.22, 0.58]) { c.moveTo(mx + inner * u, top); c.lineTo(mx + inner * u, top + mh); }
        for (const v of [0.3, 0.74]) { c.moveTo(mx, top + mh * v); c.lineTo(mx + inner, top + mh * v); }
        c.stroke();
      }
      const [ax, ay] = at(0.3, 0.68), [bx, by] = at(0.72, 0.3);
      c.strokeStyle = c.fillStyle = C.zone; c.lineWidth = Math.max(1, r * 0.4); c.setLineDash([r, r * 1.3]);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
      if (ts) { c.globalAlpha *= 0.5; c.beginPath(); c.arc(bx, by, r * 2.4, 0, TAU); c.stroke(); c.globalAlpha /= 0.5; }
      c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ax, ay, r * 0.85, 0, TAU); c.fill();
    }
    if (mh > 0) top += o.map ? mh + pad : mh / 2; // under the map; without one, in the middle
    rest.forEach(([t, m], i) => say(t, x + pad + inset, top + ts * (1.05 + 1.35 * i), 600, null, m ? 0.6 : undefined));
    if (o.talk) { // the voice: bars that move (still under reduced motion)
      const n = 4, bw = inner / n, base = y + h - pad, tt = g.t + Math.max(0, g.hold);
      c.fillStyle = C.zone;
      for (let i = 0; i < n; i++) { const v = bars * (0.3 + 0.62 * (g.reduced ? 0.6 : Math.abs(Math.sin(tt * 7 + i)))); c.fillRect(x + pad + i * bw, base - v, bw - Math.max(2, bw * 0.18), v); }
    }
  }

  // corner: tl, tr, bl or br (o.margin from the edge; br sits 34 px in, clear of the stage's mark), or beside the world
  // point o.at (left of it, right with o.side 'r'). o.k fades it. o.moment: its event (s.t, null before it); LAG after it the kit holds
  // the scene still for its beat (BEAT s): the phone grows from its corner to a phone as high as the stage, its screen
  // in words, then goes back. Before the beat it is not drawn; on a short stage it ends with the beat. The tests' box:
  // kind 'p', or 'z' during the beat; the phone's 'z' box carries { lines, screen, words } once its words are inside.
  P.phone = function (corner, title, lines, o = {}) {
    const c = this.ctx, cam = this.cam, short = cam.h < 260 || (cam.h < 300 && cam.w > 1.9 * cam.h);
    const B = this.hold >= 0 ? this.hold : this.done || o.moment === undefined ? 99 : o.moment === null ? -1 : this.t - o.moment - LAG;
    if (B < 0) return;
    const after = short ? 0 : clamp(o.k ?? 1), k = B < BEAT ? clamp(B / 0.15) * lerp(1, after, clamp((B - BEAT + 0.3) / 0.3)) : after; // fades to what follows its beat
    if (k <= 0) return;
    const f = B < BEAT ? clamp(B / 0.3) * (1 - clamp((B - BEAT + 0.3) / 0.3)) : 0, e = this.reduced ? +(f > 0.5) : ease.smooth(f);
    const h = Math.round(clamp(cam.h * 0.3, 104, 170)), p = (h - 24) >> 1, m = o.margin ?? (corner === 'br' ? 34 : 14), T = (s, x, y, w) => this.text(x, y, s, { size: 16, weight: w });
    this.screen(); c.save(); c.font = '600 16px ' + FONT;
    const W = p + 40 + Math.max(...[title, ...lines].map((t) => c.measureText(t).width)), [u, v] = o.at ? this.toScreen(o.at.x, o.at.y) : [];
    const X = o.at ? clamp(o.side === 'r' ? u + 40 : u - 40 - W, 8, cam.w - W - 8) : corner[1] === 'r' ? cam.w - W - m : m;
    const Y = o.at ? clamp(v - h / 2, 8, cam.h - h - 8) : corner[0] === 'b' ? cam.h - h - m : m;
    // The phone at its beat: as high as most of the stage, its name and the Illustration mark beside it.
    const fs = clamp(cam.h / 17, 16, 26); c.font = '700 ' + fs + 'px ' + FONT;
    let PH = cam.h * 0.86, PW = PH * 0.52, gap = fs, TW = c.measureText(title).width;
    const fit = Math.min(1, (cam.w * 0.94) / (PW + gap + TW)); PH *= fit; PW *= fit;
    const GW = PW + gap + TW, BX = (cam.w - GW) / 2, BY = (cam.h - PH) / 2;
    if (e) { c.fillStyle = `rgba(10,13,16,${(0.62 * e * k).toFixed(3)})`; c.fillRect(0, 0, cam.w, cam.h); }
    c.globalAlpha = k * (1 - e);
    if (e < 1) { // the small view: a panel with the phone, its name and its words
      c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 18 * cam.dpr; c.shadowOffsetY = 4 * cam.dpr;
      c.fillStyle = 'rgba(14,18,21,.94)'; shape(c, X, Y, W, h, 6); c.fill(); c.shadowColor = 'transparent';
      T(title, X + p + 26, Y + 30, 600); lines.forEach((t, i) => T(t, X + p + 26, Y + 54 + 22 * i, 400));
      this.text(X + W - 10, Y + h - 9, 'Illustration', { size: 11, alpha: 0.6, align: 'right' });
    }
    c.globalAlpha = k * e;
    if (e) { this.text(BX + PW + gap, BY + PH / 2 - fs * 0.2, title, { size: fs, weight: 700, color: '#fff' }); }
    // The phone itself, from the panel's to the beat's: its body, then its screen.
    const px = lerp(X + 12, BX, e), py = lerp(Y + 12, BY, e), pw = lerp(p, PW, e), ph = lerp(h - 24, PH, e), b = Math.max(4, pw * 0.06);
    const said = o.who ? [o.who, ...lines] : lines, sx = px + b, sy = py + b * 1.8, sw = pw - 2 * b, sh = ph - b * 3.6;
    const big = e > 0.75 ? { lines: said, screen: [sx, sy, sx + sw, sy + sh], words: [] } : null;
    if (k > 0.5) { // the tests' boxes: the panel, or at the beat the phone (with its screen and words when big) and its name
      if (e) this.box.push([px, py, px + pw, py + ph, title, 'z', big], [BX + PW + gap, BY + PH / 2 - fs * 1.2, BX + GW, BY + PH / 2 + fs * 1.6, title, 'z']);
      else this.box.push([X, Y, X + W, Y + h, title, 'p']);
    }
    c.globalAlpha = k;
    shape(c, px, py, pw, ph, Math.max(7, pw * 0.14)); c.fillStyle = e ? '#1B2024' : 'rgba(14,18,21,.94)'; c.fill();
    c.strokeStyle = rgba('lane', 0.55); c.lineWidth = 1.5; c.stroke();
    screen(this, sx, sy, sw, sh, o, said, big); // its words inside the screen when big (e > 0.75), beside it otherwise
    c.globalAlpha = k * e;
    if (e) this.text(BX + PW + gap, BY + PH / 2 + fs * 1.1, 'Illustration', { size: Math.max(11, fs * 0.5), alpha: 0.6 });
    c.restore(); this.world();
  };
})();
