/* Vizible Zone site: the menu, the still scenes, the live simulation plates and the video facade. No dependencies. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js'); // only with script do zones start closed (vz.css): without it every picture is open
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu: a disclosure button below 1280 px ---------- */
  var toggle = doc.querySelector('.menu-toggle');
  var nav = doc.getElementById('site-nav');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    // The open menu covers the page: when focus moves anywhere outside it and its button (a link, the header
    // button, or a scene's frame), the menu closes, so keyboard focus never lands on covered content.
    // A click on the panel's empty space leaves focus on the body and keeps it open. Escape closes it and
    // returns focus to the button.
    var leave = function () {
      setTimeout(function () {
        var a = doc.activeElement;
        if (root.classList.contains('menu-open') && a && a !== doc.body && !nav.contains(a) && !toggle.contains(a)) setMenu(false);
      }, 0);
    };
    nav.addEventListener('focusout', leave);
    toggle.addEventListener('focusout', leave);
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    matchMedia('(min-width: 1280px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Still scenes (simkit/poster.js): drawn when they come near the window ---------- */
  // The road of milestones: the car stands at the last milestone, so its place follows the text.
  var road = doc.querySelector('.road[data-scene="road"]'), lastMile = doc.querySelector('.miles li:last-child');
  function placeCar() {
    if (!road || !lastMile || !window.VZStills) return;
    var f = JSON.parse(road.getAttribute('data-focus')), S = road.clientWidth / f[2];
    var y = lastMile.getBoundingClientRect().top - road.getBoundingClientRect().top + 24;
    var opt = JSON.stringify({ cy: Math.round(f[1] + y / S) });
    if (road.getAttribute('data-opt') === opt) return;
    road.setAttribute('data-opt', opt); road.parentNode.classList.add('has-car');
    if (road.dataset.drawn) { road.dataset.drawn = ''; window.VZStills.render(road); }
  }
  placeCar();
  if (road) { addEventListener('resize', function () { setTimeout(placeCar, 200); }); addEventListener('load', placeCar); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeCar); }
  if (window.VZStills) window.VZStills.start();

  /* ---------- Zone on: two-state pictures open as a zone from a phone ----------
     data-zone="load": the hero opens 350 ms after load. A [data-zone-group] (the three dangers) opens when its top
     passes 55% of the window, stays open once passed, and closes again if the reader scrolls back above it.
     With reduced motion every zone is open from the start and nothing moves. */
  // Commit the closed state first, then arm the transition, so a zone never animates shut on load.
  doc.querySelectorAll('.zone').forEach(function (z) { getComputedStyle(z).getPropertyValue('--zr'); z.classList.add('armed'); });
  doc.querySelectorAll('.zone[data-zone="load"]').forEach(function (z) { setTimeout(function () { z.classList.add('is-on'); }, calm ? 0 : 350); });
  // In one row (768 px and up) the strip opens as a whole once its top passes 35% of the window, so "it says
  // nothing" is read while the scenes are still dark; the CSS stagger opens them one, two, three. Stacked on a
  // phone, each scene opens on its own as it passes 55% of the window.
  var wide = matchMedia('(min-width: 768px)').matches, groups = [];
  doc.querySelectorAll('[data-zone-group]').forEach(function (g) { groups = groups.concat(wide ? [g] : [].slice.call(g.children)); });
  if ('IntersectionObserver' in window && !calm) {
    var zio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var on = e.isIntersecting || e.boundingClientRect.top < 0;
        e.target.querySelectorAll('.zone').forEach(function (z) { z.classList.toggle('is-on', on); });
      });
    }, { rootMargin: wide ? '0px 0px -65% 0px' : '0px 0px -45% 0px' });
    groups.forEach(function (g) { zio.observe(g); });
  } else doc.querySelectorAll('.zone').forEach(function (z) { z.classList.add('is-on'); });

  /* ---------- The four worlds: a stage on desktop, a deck to swipe below 1024 px ---------- */
  var stage = doc.querySelector('.stage'), list = doc.querySelector('.world-list');
  if (stage && list && 'IntersectionObserver' in window) {
    var name = stage.querySelector('.stage-name span'), current = 0, timers = {};
    var show = function (n) { // zone n opens over the one that was on, which stays underneath until it is covered
      if (n === current) return;
      var prev = stage.querySelector('.zone[data-w="' + current + '"]'), next = stage.querySelector('.zone[data-w="' + n + '"]');
      if (!next) return;
      if (prev) {
        prev.classList.add('was-on'); prev.classList.remove('is-on');
        clearTimeout(timers[current]);
        timers[current] = setTimeout(function (z) { return function () { if (!z.classList.contains('is-on')) z.classList.remove('was-on'); }; }(prev), calm ? 0 : 1150);
      }
      next.classList.remove('was-on'); next.classList.add('is-on');
      var art = list.querySelector('.world[data-w="' + n + '"] .world-name');
      if (name && art) name.textContent = art.textContent;
      stage.querySelectorAll('.stage-rail i').forEach(function (d, i) { d.classList.toggle('on', i === n - 1); });
      current = n;
    };
    show(1);
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) show(+e.target.getAttribute('data-w')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    // The deck's dots follow the card in view (phones and tablets).
    var dots = doc.querySelectorAll('.deck-dots i');
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = +e.target.getAttribute('data-w');
        dots.forEach(function (d, i) { d.classList.toggle('on', i === n - 1); });
      });
    }, { root: list, threshold: 0.6 });
    list.querySelectorAll('.world').forEach(function (w) { wio.observe(w); dio.observe(w); });
    // Once the reader is back above the worlds, the stage waits on the first world again.
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting && e.boundingClientRect.top > 0) show(1); });
    }).observe(stage.parentNode);
  }

  // Pulses and travelling messages move only while their picture is on screen.
  if ('IntersectionObserver' in window && !calm) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-seen', e.isIntersecting); });
    });
    doc.querySelectorAll('.still').forEach(function (el) { sio.observe(el); });
  }

  /* ---------- Live simulation plates ----------
     An element with data-sim="name" shows that scene from sims/<name>/ when sync-sims.sh has copied
     it (sims/available.js), and a quiet placeholder frame otherwise. The page owns the chrome:
     each scene's caption and controls are aligned to the page's text column, the frame takes
     the height of its content, and the stage is never taller than the window allows. */
  var available = window.VZ_SIMS || [];
  var GUTTER_BREAK = 768, MAX = 1200;

  function inset(plate) {
    var w = plate.clientWidth, gutter = innerWidth >= GUTTER_BREAK ? 24 : 16;
    return Math.max(gutter, Math.round((w - MAX) / 2));
  }
  // The stage's height, so that it, the switch and the caption share one window: on a phone 45% of the window; on a
  // window under 420 px high (a phone held sideways, where the header scrolls away and the caption sits beside the
  // controls and the note under them) the window less 110 px for that row; elsewhere room for the controls and the
  // caption under the header. A Show me plate in a short window measures that row instead (align).
  var SHORT = 420, ROW = 110, TITLE = 48;
  function head() { return parseFloat(getComputedStyle(root).getPropertyValue('--head')) || 0; }
  function stageMax() {
    if (innerHeight < SHORT) return innerHeight - ROW;
    return innerWidth <= 640 ? Math.round(innerHeight * 0.45) : Math.max(360, innerHeight - 212 - head());
  }
  function fit(frame) {
    try {
      var d = frame.contentDocument, body = d && d.body;
      if (!body) return;
      var h = Math.ceil(body.getBoundingClientRect().height), st = d.querySelector('.vzs-stage');
      if (h > 0) frame.style.height = h + 'px';
      // A plate in a short window whose caption grew past what align measured (a long line in a narrow window): measure
      // again, once per growth, so the plate keeps fitting. It never grows back during the run.
      if (st && innerHeight < SHORT && h - Math.ceil(st.getBoundingClientRect().height) > +(frame.dataset.rest || 1e9)) align(frame);
    } catch (e) { /* another origin (for example file://): keep the CSS estimate */ }
  }
  // A demonstration plate (.demo) has a fixed inset, and its stage leaves room in the window for the plate's title line
  // and the switch under the stage (120 px), or, in a short window, for the title line and what is under its stage, so
  // the whole plate, its one note "Illustration. Not a recording." included, fits the window (Fable, fourth review).
  function align(frame) {
    try {
      var demo = frame.parentNode.classList.contains('demo'), phone = innerWidth <= 640, short = innerHeight < SHORT;
      var px = (demo ? (phone ? 16 : 20) : inset(frame.parentNode)) + 'px', d = frame.contentDocument, all = d.querySelectorAll('.vzs');
      all.forEach(function (el) {
        el.style.setProperty('--vzs-inset', px);
        el.toggleAttribute('data-short', short); // the kit sets the caption beside the controls (a plate: the note under them)
      });
      var max = demo ? Math.min(stageMax(), innerHeight - head() - 120) : stageMax(), st = d.querySelector('.vzs-stage');
      // A plate in a short window: its title line, the stage, then what the scene draws under it (measured), 2 px spare.
      if (demo && short && st) { frame.dataset.rest = Math.ceil(d.body.getBoundingClientRect().height - st.getBoundingClientRect().height); max = innerHeight - TITLE - 2 - frame.dataset.rest; }
      else delete frame.dataset.rest;
      all.forEach(function (el) { el.style.setProperty('--vzs-stage-max', max + 'px'); });
    } catch (e) { /* another origin: the scene keeps its own inset */ }
    fit(frame);
  }
  function wire(frame) {
    frame.addEventListener('load', function () {
      try {
        var w = frame.contentWindow;
        new w.ResizeObserver(function () { fit(frame); }).observe(frame.contentDocument.body);
      } catch (e) { /* another origin */ }
      align(frame);
    });
  }

  // A plate gets its frame the first time it is displayed: at load, or after a resize shows it (the home page's one
  // street is hidden below 768 px, so a window widened past it mounts the scene then).
  var frames = [];
  function mountPlates() {
    doc.querySelectorAll('[data-sim]').forEach(mountPlate);
  }
  function mountPlate(plate) {
    var name = plate.getAttribute('data-sim');
    if (available.indexOf(name) === -1) { plate.classList.add('is-waiting'); return; }
    if (plate.offsetParent === null || plate.querySelector('iframe')) return; // not displayed at this width, or running
    var frame = doc.createElement('iframe');
    frame.src = 'sims/' + name + '/index.html?embed=1';
    frame.title = plate.getAttribute('data-title') || 'Simulation';
    frame.setAttribute('loading', plate.hasAttribute('data-eager') ? 'eager' : 'lazy');
    var ph = plate.querySelector('.sim-placeholder');
    if (ph) plate.removeChild(ph);
    plate.appendChild(frame);
    wire(frame);
    frames.push(frame);
  }
  mountPlates();
  // Words that point at a scene appear only when the scene is there.
  doc.querySelectorAll('[data-needs]').forEach(function (el) {
    if (available.indexOf(el.getAttribute('data-needs')) === -1) el.hidden = true;
  });
  var resizeTimer = 0, lastW = innerWidth;
  addEventListener('resize', function () {
    if (openBtn && openBtn.classList.contains('hero-try') && innerWidth >= 768) closeDemo(openBtn); // the hero's demo is a phone's
    if (innerWidth === lastW && innerWidth <= 640 && innerHeight >= SHORT) return; // a phone's address bar sliding away is not a resize
    lastW = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { mountPlates(); frames.forEach(align); doc.querySelectorAll('.demo iframe').forEach(align); }, 120);
  });

  /* ---------- Long capability lists on a phone: the lead rows (data-lead), then one button for the rest ----------
     Only below 768 px (vz.css): the rows stay in the page for every reader and for search, and desktop shows them all.
     Without script nothing is folded. */
  function fold(list, on) {
    var more = list.nextElementSibling;
    list.classList.toggle('folded', on);
    more.setAttribute('aria-expanded', String(!on));
    more.querySelector('span').textContent = on ? 'All ' + list.children.length + ' capabilities' : 'Fewer capabilities';
  }
  doc.querySelectorAll('.caps.has-demos').forEach(function (list, i) {
    var lead = list.querySelectorAll(':scope > .cap[data-lead]').length;
    if (!lead || list.children.length - lead < 3) return;
    var more = doc.createElement('button');
    more.type = 'button'; more.className = 'more';
    list.id = list.id || 'caps-' + (i + 1);
    more.setAttribute('aria-controls', list.id);
    more.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5"/></svg><span></span>';
    list.parentNode.insertBefore(more, list.nextSibling);
    fold(list, true);
    more.addEventListener('click', function () {
      var on = !list.classList.contains('folded');
      fold(list, on);
      if (on) more.scrollIntoView({ block: 'nearest' }); // the rows above it are gone: keep the button where the finger is
    });
  });

  /* ---------- Show me: one demonstration per capability row ----------
     A .show button names its scene (data-demo) and options (data-demo-opt, name=value pairs joined by &) and the
     plate it opens (aria-controls). It stays hidden unless the scene is in sims/available.js, so without script, or
     without the scene, the row reads as before. One plate is open per page; closing removes the frame, which stops
     the scene. A #demo-... address opens that plate on load and scrolls to its row. */
  var openBtn = null;
  function demoName(btn) { // the row's name, or the button's own screen-reader name
    var cap = btn.closest('.cap'), n = cap && cap.querySelector('.cap-name'), sr = btn.querySelector('.sr-only');
    return (n ? n.textContent : sr ? sr.textContent.replace(/^:\s*/, '') : '').trim();
  }
  // A press brings the whole plate into the window: when it fits under the header, its foot to the window's foot (or its
  // top to the header, if it was above); when it is taller, its top (the title line and the close button) under the
  // header. A #demo- address puts the plate's top under the header.
  function reveal(el, jump) {
    var r = el.getBoundingClientRect(), h = doc.querySelector('.site-header'), top = h && getComputedStyle(h).position === 'sticky' ? h.getBoundingClientRect().bottom : 0;
    if (!jump && r.top >= top && r.bottom <= innerHeight) return;
    var by = !jump && r.height <= innerHeight - top && r.top >= top ? r.bottom - innerHeight : r.top - top;
    scrollBy({ top: by, behavior: jump || calm ? 'auto' : 'smooth' });
  }
  function closeDemo(btn) {
    var plate = doc.getElementById(btn.getAttribute('aria-controls'));
    if (plate) { plate.textContent = ''; plate.hidden = true; } // removing the frame stops the scene
    btn.setAttribute('aria-expanded', 'false');
    if (openBtn === btn) openBtn = null;
  }
  function openDemo(btn, jump) {
    if (openBtn) closeDemo(openBtn);
    var plate = doc.getElementById(btn.getAttribute('aria-controls')), name = demoName(btn), frame = doc.createElement('iframe');
    var row = btn.closest('.cap'), list = row && row.parentNode;
    if (list && list.classList.contains('folded') && !row.hasAttribute('data-lead')) fold(list, false);
    // The plate's first line: the capability's name and a close button, so both stay in view with the scene.
    var title = doc.createElement('div'), label = doc.createElement('p'), close = doc.createElement('button');
    title.className = 'demo-head'; label.className = 'demo-name'; label.textContent = name;
    close.type = 'button'; close.className = 'demo-close'; close.setAttribute('aria-label', 'Close: ' + name);
    close.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
    close.addEventListener('click', function () { closeDemo(btn); btn.focus({ preventScroll: true }); btn.scrollIntoView({ block: 'nearest' }); });
    title.appendChild(label); title.appendChild(close);
    var opt = (btn.getAttribute('data-demo-opt') || '').split('&').filter(Boolean).map(function (p) {
      var i = p.indexOf('='); return encodeURIComponent(p.slice(0, i)) + '=' + encodeURIComponent(p.slice(i + 1));
    });
    frame.src = 'sims/' + btn.getAttribute('data-demo') + '/index.html?' + ['embed=1', 'micro=1'].concat(opt).join('&');
    frame.title = 'Demonstration: ' + name;
    frame.setAttribute('loading', 'eager');
    plate.setAttribute('aria-label', 'Demonstration: ' + name);
    plate.appendChild(title);
    plate.appendChild(frame);
    plate.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    openBtn = btn;
    wire(frame);
    reveal(plate, jump);
    frame.addEventListener('load', function () { reveal(plate, jump); }, { once: true }); // again once the frame has its height
  }
  doc.querySelectorAll('button[data-demo]').forEach(function (btn) {
    if (available.indexOf(btn.getAttribute('data-demo')) === -1 || !doc.getElementById(btn.getAttribute('aria-controls'))) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (btn.getAttribute('aria-expanded') === 'true') closeDemo(btn); else openDemo(btn, false);
    });
  });
  function fromHash() {
    var id = location.hash.slice(1), btn = null; // the ids are plain ASCII (plan section 2)
    if (id.indexOf('demo-') !== 0) return;
    doc.querySelectorAll('button[data-demo]').forEach(function (b) { if (b.getAttribute('aria-controls') === id && !b.hidden) btn = b; });
    if (btn && btn !== openBtn) openDemo(btn, true);
  }
  fromHash();
  addEventListener('hashchange', fromHash);

  /* ---------- Video facade: youtube-nocookie loads only on click ---------- */
  doc.querySelectorAll('.video-facade').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-yt');
      var frame = doc.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1';
      frame.title = btn.getAttribute('data-title') || 'Video';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('tabindex', '0');
      btn.parentNode.replaceChild(frame, btn);
      frame.focus();
    });
  });
})();
