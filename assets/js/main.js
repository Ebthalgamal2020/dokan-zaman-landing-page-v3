/*
 * Dokan Zaman V3 — page behaviour.
 * Built into main.min.js together with motion.js and quote-form.js by `npm run build:js`.
 *
 *  1. Sticky header state
 *  2. Mobile navigation (Escape, link click and desktop resize close it)
 *  3. Reveal-on-scroll
 *  4. Ribbon: seamless, slow loop along the curve; static under reduced motion
 *
 * Also defines window.DZ.ticker: one shared requestAnimationFrame loop used by the ribbon
 * and by motion.js. A job returns true to keep running; the loop stops when no job is left.
 */
(function () {
  'use strict';

  var body = document.body;
  var header = document.querySelector('[data-header]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var DZ = window.DZ = window.DZ || {};
  DZ.reduceMotion = reduceMotion;
  DZ.ticker = (function () {
    var jobs = [];
    var frame = null;
    var loop = function (now) {
      var current = jobs.slice();
      jobs = [];
      current.forEach(function (job) { if (job(now) === true && jobs.indexOf(job) === -1) jobs.push(job); });
      frame = jobs.length ? window.requestAnimationFrame(loop) : null;
    };
    return {
      add: function (job) {
        if (jobs.indexOf(job) === -1) jobs.push(job);
        if (frame === null) frame = window.requestAnimationFrame(loop);
      },
      remove: function (job) { jobs = jobs.filter(function (j) { return j !== job; }); }
    };
  })();

  /* Header logo assembly (from V1): when every part has finished assembling, drop the
     animation entirely so the header shows the plain, untouched original SVG from then on. */
  var logo = document.querySelector('.logo-svg');
  if (logo) {
    var pending = logo.querySelectorAll('.lg').length;
    logo.addEventListener('animationend', function (event) {
      if (event.target.classList.contains('lg') && --pending === 0) {
        logo.classList.add('is-assembled');
      }
    });
  }

  /* 1. Header ------------------------------------------------------------ */
  if (header) {
    // "Scrolled" = the page has moved more than 8px. An 8px sentinel at the very top of the page is observed
    // instead of reading scrollY, so no script forces a layout during start-up or while scrolling.
    if ('IntersectionObserver' in window) {
      var sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;visibility:hidden';
      body.insertBefore(sentinel, body.firstChild);
      new IntersectionObserver(function (entries) {
        header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      }).observe(sentinel);
    } else {
      var ticking = false;
      var updateHeader = function () {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        ticking = false;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(updateHeader); }
      }, { passive: true });
      updateHeader();
    }
  }

  /* 2. Mobile navigation ---------------------------------------------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var sheet = document.getElementById('mobile-nav');
  var label = document.querySelector('[data-menu-label]');
  var main = document.getElementById('main');
  var footer = document.querySelector('.site-footer');

  if (toggle && sheet) {
    var setOpen = function (open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'إغلاق القائمة' : 'فتح القائمة';
      if (open && header) sheet.style.setProperty('--sheet-top', header.getBoundingClientRect().bottom + 'px');
      sheet.hidden = !open;
      body.classList.toggle('menu-open', open);
      [main, footer].forEach(function (el) { if (el) el.inert = open; });
      if (open) {
        var first = sheet.querySelector('a');
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true', true);
    });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    window.matchMedia('(min-width: 1200px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false, false);
    });
  }

  /* Skip link / in-page links: move focus to the target for keyboard users. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
      target.setAttribute('tabindex', '-1');
    }
    window.setTimeout(function () { target.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 450);
  });

  /* 3. Reveal on scroll ------------------------------------------------- */
  var revealItems = [].slice.call(document.querySelectorAll('[data-reveal]'));
  var showAll = function () { revealItems.forEach(function (el) { el.classList.add('is-in'); }); };

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach(function (el) { revealer.observe(el); });
    // Safety net: never leave content hidden (e.g. printing, unusual scrolling).
    window.addEventListener('beforeprint', showAll);
  }

  /* 4. Ribbon ----------------------------------------------------------- */
  var ribbon = document.querySelector('[data-ribbon]');
  if (ribbon) {
    var SPEED = 14; // SVG user units per second — slow and quiet
    var tracks = [].slice.call(ribbon.querySelectorAll('text[data-unit]')).map(function (text) {
      return { text: text, path: text.querySelector('textPath'), unit: 0 };
    });

    // One repetition of the message; moving by exactly this length loops without a jump.
    // The ribbon text starts with that message, so its width is measured on the existing text (no probe
    // element), and only once the browser has laid the page out (see laidOut below).
    var laidOut = false;
    var measure = function () {
      if (!laidOut) return;
      tracks.forEach(function (t) {
        var n = t.text.getAttribute('data-unit').length;
        var w = 0;
        try { w = t.text.getSubStringLength(0, n); } catch (err) { w = 0; }
        if (w > 0) t.unit = w;
      });
    };

    var visible = false;
    var running = false;
    var distance = 0; // accumulated, so pausing and resuming never jumps
    var last = null;

    var step = function (now) {
      if (!running) return false;
      if (last !== null) distance += Math.min(now - last, 100) / 1000 * SPEED;
      last = now;
      tracks.forEach(function (t) {
        if (!t.unit || !t.path) return;
        t.path.setAttribute('startOffset', (-(distance % t.unit)).toFixed(2));
      });
      return true;
    };

    var run = function () {
      var shouldRun = visible && !reduceMotion.matches && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        last = null;
        DZ.ticker.add(step);
      } else if (!shouldRun && running) {
        running = false;
        DZ.ticker.remove(step);
      }
      if (reduceMotion.matches) {
        distance = 0;
        tracks.forEach(function (t) { if (t.path) t.path.setAttribute('startOffset', '0'); });
      }
    };

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); run(); });

    if ('IntersectionObserver' in window) {
      // The first callback arrives after layout, so measuring there is cheap.
      new IntersectionObserver(function (entries) {
        if (!laidOut) { laidOut = true; measure(); }
        visible = entries[0].isIntersecting;
        run();
      }).observe(ribbon);
    } else {
      laidOut = true;
      measure();
      visible = true;
    }
    document.addEventListener('visibilitychange', run);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', run);
    run();
  }

  /* Footer year */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
