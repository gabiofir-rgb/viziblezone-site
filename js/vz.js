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
  function stageMax() { // room for the caption and the controls under the stage, inside one window below the sticky header
    var head = parseFloat(getComputedStyle(root).getPropertyValue('--head')) || 0;
    return innerWidth <= 640 ? Math.round(innerHeight * 0.6) : Math.max(360, innerHeight - 212 - head);
  }
  function fit(frame) {
    try {
      var body = frame.contentDocument && frame.contentDocument.body;
      if (!body) return;
      var h = Math.ceil(body.getBoundingClientRect().height);
      if (h > 0) frame.style.height = h + 'px';
    } catch (e) { /* another origin (for example file://): keep the CSS estimate */ }
  }
  function align(frame) {
    try {
      var px = inset(frame.parentNode) + 'px', max = stageMax() + 'px';
      frame.contentDocument.querySelectorAll('.vzs').forEach(function (el) {
        el.style.setProperty('--vzs-inset', px); el.style.setProperty('--vzs-stage-max', max);
      });
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

  var frames = [];
  doc.querySelectorAll('[data-sim]').forEach(function (plate) {
    var name = plate.getAttribute('data-sim');
    if (available.indexOf(name) === -1) { plate.classList.add('is-waiting'); return; }
    if (plate.offsetParent === null) return; // not displayed at this width (the home page's one street on phones)
    var frame = doc.createElement('iframe');
    frame.src = 'sims/' + name + '/index.html?embed=1';
    frame.title = plate.getAttribute('data-title') || 'Simulation';
    frame.setAttribute('loading', plate.hasAttribute('data-eager') ? 'eager' : 'lazy');
    var ph = plate.querySelector('.sim-placeholder');
    if (ph) plate.removeChild(ph);
    plate.appendChild(frame);
    wire(frame);
    frames.push(frame);
  });
  // Words that point at a scene appear only when the scene is there.
  doc.querySelectorAll('[data-needs]').forEach(function (el) {
    if (available.indexOf(el.getAttribute('data-needs')) === -1) el.hidden = true;
  });
  var resizeTimer = 0, lastW = innerWidth;
  addEventListener('resize', function () {
    if (innerWidth === lastW && innerWidth <= 640) return; // a phone's address bar sliding away is not a resize
    lastW = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { frames.forEach(align); }, 120);
  });

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
