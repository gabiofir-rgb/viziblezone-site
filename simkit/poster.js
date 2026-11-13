/* Poster renderer: draws a still scene from stills.js into every element with data-scene.
   The picture is a canvas; its labels are HTML, so they stay sharp and scale with the page.
   data-focus = [x, y, w, h] is the part of the scene that must be seen whole: it is always contained in the
   element, never cropped, and data-anchor = [ax, ay] (0..1) says where it sits when the element has room to spare.
   data-focus-m / data-anchor-m are used when the element is taller than wide (phones).
   A child with data-at = [x, y, r] is pinned to that place in the scene: the round insets of the home hero.
   A still inside a .zone with data-origin = [x, y] tells the zone where its phone is: the zone opens from there.
   L.pulse and L.run are HTML marks animated by CSS only (vz.css): a ring growing from a phone, a message
   travelling from the person to whoever is told. Each plays once when the still comes on screen (.is-seen) and
   ends within 5 s: a pulse (3.6 s) starts by 1.2 s, a message (2.4 s) by 2.4 s (WCAG 2.2.2). */
(function () {
  'use strict';
  const K = VZKit;
  let tile = null;
  function noise() {
    if (tile) return tile;
    const n = document.createElement('canvas'); n.width = n.height = 128;
    const x = n.getContext('2d'), img = x.createImageData(128, 128), r = K.rng(4242);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = (r() * 10) | 0; }
    x.putImageData(img, 0, 0); return (tile = n);
  }
  const mark = (st) => (st ? '<i class="m ' + st + '"></i>' : '');
  const num = (v, d) => (v == null || v === '' ? d : JSON.parse(v));
  function render(el) {
    const sc = window.SCENES[el.dataset.scene]; if (!sc) return;
    const W = el.clientWidth, H = el.clientHeight; if (W < 8 || H < 8) return;
    const tall = H > W * 1.02, d = el.dataset;
    const o = Object.assign({ vz: true }, sc.options || {}, num(d.opt, {}), tall ? num(d.optM, {}) : {});
    const fa = num(tall && d.focusM ? d.focusM : d.focus, null), f = fa ? { x: fa[0], y: fa[1], w: fa[2], h: fa[3] } : sc.focus;
    const [ax, ay] = num(tall && d.anchorM ? d.anchorM : d.anchor, [0.5, 0.5]);
    const SS = Math.min(window.devicePixelRatio || 1, 2), S = Math.min(W / f.w, H / f.h);
    const z = +(d.z || 0) || Math.max(1, Math.min(1.7, Math.min(W, H * 1.6) / 560)); // line weight follows the size of the plate
    let cv = el.querySelector(':scope > canvas'); if (!cv) { cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); el.prepend(cv); }
    cv.width = Math.round(W * SS); cv.height = Math.round(H * SS);
    const ctx = cv.getContext('2d');
    const cam = { w: W / z, h: H / z, dpr: SS * z, scale: S / z, rot: 0, cx: f.x + ax * f.w + (0.5 - ax) * (W / S), cy: f.y + ay * f.h + (0.5 - ay) * (H / S) };
    cam.view = { x0: cam.cx - W / 2 / S, x1: cam.cx + W / 2 / S, y0: cam.cy - H / 2 / S, y1: cam.cy + H / 2 / S };
    const g = new K.Painter(ctx, cam); g.t = 0; g.reduced = true;
    let lay = el.querySelector(':scope > .labels'); if (!lay) { lay = document.createElement('div'); lay.className = 'labels'; lay.setAttribute('aria-hidden', 'true'); el.appendChild(lay); }
    lay.textContent = '';
    el.style.setProperty('--u', (Math.max(0.72, Math.min(1.1, W / 1150)) * (tall ? 1 : +(d.u || 1)) * (W < 170 ? 0.82 : 1)).toFixed(3)); // label size follows the plate
    const at = (x, y) => { const [sx, sy] = g.toScreen(x, y); return [sx * z, sy * z]; };
    // Children pinned to the scene (round insets): data-at = [x, y, r] in scene units.
    el.querySelectorAll(':scope > [data-at]').forEach((ch) => {
      const [x, y, r] = JSON.parse(ch.dataset.at), [sx, sy] = at(x, y), q = r * S;
      ch.style.position = 'absolute'; ch.style.left = sx - q + 'px'; ch.style.top = sy - q + 'px'; ch.style.width = ch.style.height = 2 * q + 'px';
    });
    const L = {
      chip(x, y, text, p = {}) {
        if (o.nolabels) return; const [sx, sy] = at(x, y), e = document.createElement('div');
        e.className = 'chip ' + (p.side || 'up'); e.style.left = sx + 'px'; e.style.top = sy + 'px'; e.style.setProperty('--gap', Math.round((p.gap ?? 26) * S * 1.38 + 2) + 'px');
        e.innerHTML = '<span>' + text + '</span>'; lay.appendChild(e);
      },
      plate(x, y, text, p = {}) {
        if (o.nolabels) return; const [sx, sy] = at(x, y), e = document.createElement('div');
        e.className = 'plate ' + (p.align || 'center'); e.style.left = sx + (p.dx || 0) * S * 1.38 + 'px'; e.style.top = sy + (p.dy || 0) * S * 1.38 + 'px';
        e.innerHTML = mark(p.status) + '<span>' + text + '</span>'; lay.appendChild(e);
      },
      pulse(x, y, R, p = {}) {
        if (W < 170) return; const [sx, sy] = at(x, y), e = document.createElement('i');
        e.className = 'pulse'; e.style.left = sx + 'px'; e.style.top = sy + 'px';
        e.style.setProperty('--d', Math.round(2 * R * S) + 'px'); e.style.setProperty('--delay', Math.min(p.delay || 0, 1.2) + 's'); lay.appendChild(e);
      },
      run(a, b, p = {}) {
        if (W < 170) return; const [ax, ay] = at(a.x, a.y), [bx, by] = at(b.x, b.y), e = document.createElement('i');
        e.className = 'run'; e.style.left = ax + 'px'; e.style.top = ay + 'px';
        e.style.setProperty('--dx', Math.round(bx - ax) + 'px'); e.style.setProperty('--dy', Math.round(by - ay) + 'px');
        e.style.setProperty('--delay', Math.min(p.delay || 0, 2.4) + 's'); lay.appendChild(e);
      }
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = K.C.asphalt; ctx.fillRect(0, 0, cv.width, cv.height);
    g.world(); sc.ground(g, o);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ctx.createPattern(noise(), 'repeat'); ctx.fillRect(0, 0, cv.width, cv.height);
    g.emit.length = 0; g.world(); sc.draw(g, o, L);
    ctx.setTransform(SS, 0, 0, SS, 0, 0); // a soft vignette: depth, and calmer edges for type
    const v = +(d.vig ?? 0.3);
    if (v > 0) { const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62); gr.addColorStop(0, 'rgba(6,9,11,0)'); gr.addColorStop(1, 'rgba(6,9,11,' + v + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    // keep every label inside the plate
    lay.querySelectorAll('.chip, .plate').forEach((e) => {
      const r = e.getBoundingClientRect(), R = el.getBoundingClientRect(), m = 8;
      const dx = r.left < R.left + m ? R.left + m - r.left : r.right > R.right - m ? R.right - m - r.right : 0;
      const dy = r.top < R.top + m ? R.top + m - r.top : r.bottom > R.bottom - m ? R.bottom - m - r.bottom : 0;
      if (dx || dy) { e.style.marginLeft = dx + 'px'; e.style.marginTop = dy + 'px'; e.classList.add('nudged'); }
    });
    // The zone this still opens from (component 1 of the launch design): its centre and the radius that covers the plate.
    const z0 = d.origin ? el.closest('.zone') : null;
    if (z0) { // the still may sit inside the zone (a pair of stills side by side): measure from the zone's corner
      const zr = z0.getBoundingClientRect(), er = el.getBoundingClientRect(), [ox, oy] = JSON.parse(d.origin), [px, py] = at(ox, oy);
      const sx = px + er.left - zr.left, sy = py + er.top - zr.top, ZW = zr.width, ZH = zr.height;
      z0.style.setProperty('--zx', sx + 'px'); z0.style.setProperty('--zy', sy + 'px');
      z0.style.setProperty('--zmax', Math.ceil(Math.hypot(Math.max(sx, ZW - sx), Math.max(sy, ZH - sy))) + 24 + 'px');
    }
    el.dataset.drawn = W + 'x' + H;
  }
  function watch(el) {
    let timer = 0, seen = false;
    const draw = () => { if (seen && el.dataset.drawn !== el.clientWidth + 'x' + el.clientHeight) render(el); };
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(draw, el.dataset.drawn ? 140 : 0); }).observe(el);
    if (!('IntersectionObserver' in window) || el.hasAttribute('data-eager')) { seen = true; draw(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seen = true; io.disconnect(); draw(); } }, { rootMargin: '900px 0px' });
    io.observe(el);
  }
  window.VZStills = { render, start() { document.querySelectorAll('[data-scene]').forEach(watch); } };
})();
