/*
 * Dokan Zaman V3 — box motif interactions.
 * Bundled into main.min.js after main.js (which provides window.DZ.ticker and DZ.reduceMotion).
 *
 *  1. Hero box: follows the pointer by at most ±8px (fine pointers only; static on touch / reduced motion)
 *  2. Categories: active row ↔ sticky photo crossfade ↔ box marker
 *  3. Procurement: box travels through the six stages as the strip scrolls through the viewport
 *  4. About: the three principles light up the three faces of the box
 *  5. Sectors: stage shows the hovered / focused / tapped sector
 *  6. Contract services: navigator (>=1024px) / accordion (smaller screens)
 *
 * Only transforms and classes are changed; no scroll hijacking, nothing moves text or buttons.
 */
(function () {
  'use strict';

  var DZ = window.DZ || {};
  var ticker = DZ.ticker;
  var reduce = DZ.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;
  if (!ticker) return;

  var clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };
  var onChange = function (mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  };

  /* 1. Hero box ---------------------------------------------------------- */
  (function () {
    var hero = document.querySelector('.hero');
    var box = document.querySelector('[data-hero-box]');
    if (!hero || !box) return;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var RANGE = 8;
    var x = 0, y = 0, gx = 0, gy = 0;

    var tick = function () {
      x += (gx - x) * 0.09;
      y += (gy - y) * 0.09;
      var settled = Math.abs(gx - x) < 0.05 && Math.abs(gy - y) < 0.05;
      if (settled) { x = gx; y = gy; }
      box.style.transform = (x || y) ? 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)' : '';
      return !settled;
    };
    var enabled = function () { return fine.matches && !reduce.matches; };

    hero.addEventListener('pointermove', function (e) {
      if (!enabled() || e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      gx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1) * RANGE;
      gy = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1) * RANGE;
      ticker.add(tick);
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      gx = 0; gy = 0;
      if (enabled()) ticker.add(tick);
    });
    var reset = function () {
      if (enabled()) return;
      ticker.remove(tick);
      x = y = gx = gy = 0;
      box.style.transform = '';
    };
    onChange(reduce, reset);
    onChange(fine, reset);
  })();

  /* 2. Categories -------------------------------------------------------- */
  (function () {
    var index = document.querySelector('[data-cat-index]');
    if (!index) return;
    var rows = [].slice.call(index.querySelectorAll('.cat-row'));
    var images = [].slice.call(index.querySelectorAll('[data-cat-img]'));
    var marker = index.querySelector('[data-cat-marker]');
    var wrap = index.querySelector('.cat-rows-wrap');
    var active = null;

    var placeMarker = function () {
      if (!marker || !active || !marker.offsetWidth) return;
      var title = active.querySelector('.cat-row__title');
      var y = title.getBoundingClientRect().top - wrap.getBoundingClientRect().top +
        (title.offsetHeight - marker.offsetHeight) / 2;
      marker.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    };

    // Same media query as the CSS that turns the sticky stage on.
    var stageMode = window.matchMedia('(min-width: 1024px) and (min-height: 560px)');
    var inBand = []; // rows currently crossing the middle band of the viewport

    var setActive = function (row) {
      if (!row) return;
      active = row;
      var key = row.getAttribute('data-cat');
      rows.forEach(function (r) { r.classList.toggle('is-active', r === row); });
      images.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-cat-img') === key); });
      placeMarker();
    };

    // Sticky stage: exactly one active row (it drives the photo).
    // Stacked layout: rows can sit side by side, so every row in the band gets its own marker.
    var apply = function () {
      if (stageMode.matches) {
        var row = inBand.length ? inBand[inBand.length - 1] : (active || rows[0]);
        if (row !== active || !row.classList.contains('is-active')) setActive(row);
      } else {
        rows.forEach(function (r) { r.classList.toggle('is-active', inBand.indexOf(r) !== -1); });
      }
    };

    setActive(rows[0]);
    if (hasIO) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var i = inBand.indexOf(entry.target);
          if (entry.isIntersecting && i === -1) inBand.push(entry.target);
          if (!entry.isIntersecting && i !== -1) inBand.splice(i, 1);
        });
        inBand.sort(function (a, b) { return rows.indexOf(a) - rows.indexOf(b); });
        apply();
      }, { rootMargin: '-46% 0px -46% 0px', threshold: 0 });
      rows.forEach(function (row) { io.observe(row); });
    }
    onChange(stageMode, function () { active = null; apply(); if (!active && stageMode.matches) setActive(rows[0]); });
    window.addEventListener('resize', function () { ticker.add(function () { placeMarker(); return false; }); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeMarker);
  })();

  /* 3. Procurement progress ---------------------------------------------- */
  (function () {
    var wrap = document.querySelector('[data-cycle]');
    if (!wrap) return;
    var steps = [].slice.call(wrap.querySelectorAll('.cycle li'));
    var labels = steps.map(function (li) { return li.querySelector('.cycle__label'); });
    var track = wrap.querySelector('.cycle__track');
    var fill = wrap.querySelector('[data-cycle-fill]');
    var box = wrap.querySelector('[data-cycle-box]');
    var last = steps.length - 1;
    var inView = false;

    var progress = function () {
      if (reduce.matches) return 1;
      var r = wrap.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 when the strip's centre is at 85% of the viewport height, 1 when it reaches 35%.
      return clamp((vh * 0.85 - (r.top + r.height / 2)) / (vh * 0.5), 0, 1);
    };

    var update = function () {
      var pos = progress() * last;
      var current = Math.min(last, Math.floor(pos + 0.02));
      steps.forEach(function (li, i) {
        li.classList.toggle('is-reached', i <= current);
        li.classList.toggle('is-current', i === current);
      });
      if (track && track.offsetWidth && box) {
        var t = track.getBoundingClientRect();
        var centres = labels.map(function (l) { var b = l.getBoundingClientRect(); return b.left + b.width / 2 - t.left; });
        var i = Math.min(last - 1, Math.floor(pos));
        var x = centres[i] + (centres[i + 1] - centres[i]) * (pos - i);
        box.style.transform = 'translate3d(' + (x - box.offsetWidth / 2).toFixed(1) + 'px,0,0)';
        var a = Math.min(centres[0], x), b = Math.max(centres[0], x);
        fill.style.left = a.toFixed(1) + 'px';
        fill.style.width = (b - a).toFixed(1) + 'px';
      }
      return false;
    };

    // One measurement per animation frame at most; always runs, so jumps (anchors, fast scrolls) never leave a stale stage.
    var schedule = function () { ticker.add(update); };
    if (hasIO) {
      // Also update once when the strip leaves the viewport, so a fast scroll past it never leaves a stale stage.
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; ticker.add(update); }).observe(wrap);
    } else {
      inView = true;
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', function () { ticker.add(update); }, { passive: true });
    onChange(reduce, function () { ticker.add(update); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ticker.add(update); });
    ticker.add(update);
  })();

  /* 4. About: principles ↔ faces ----------------------------------------- */
  (function () {
    var svg = document.querySelector('[data-about-box]');
    if (!svg) return;
    var faces = [].slice.call(svg.querySelectorAll('[data-face]'));
    var points = [].slice.call(document.querySelectorAll('[data-principle]'));
    var light = function (i) { if (faces[i]) faces[i].classList.add('is-on'); };
    var lightAll = function () { faces.forEach(function (f, i) { light(i); }); };

    // Narrow screens stack the box above the list, so the principles scroll in after the box has
    // left the screen. There the box assembles itself (face by face) as soon as it is in view.
    var besideList = window.matchMedia('(min-width: 640px)');

    if (reduce.matches || !hasIO) {
      lightAll();
    } else if (!besideList.matches) {
      var boxIO = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting || entries[0].boundingClientRect.bottom < 0) {
          faces.forEach(function (f, i) { window.setTimeout(function () { light(i); }, 150 + i * 220); });
          boxIO.disconnect();
        }
      }, { rootMargin: '0px 0px -15% 0px', threshold: 1 });
      boxIO.observe(svg);
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var i = +entry.target.getAttribute('data-principle');
          // Scrolled into view, or already above the viewport (fast scroll / jump links)
          if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
            window.setTimeout(function () { light(i); }, i * 140);
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.6 });
      points.forEach(function (p) { io.observe(p); });
    }
    onChange(reduce, function () { if (reduce.matches) lightAll(); });

    // Pointer highlight: the hovered principle and its face
    points.forEach(function (p) {
      var i = +p.getAttribute('data-principle');
      p.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        light(i);
        svg.classList.add('has-focus');
        faces.forEach(function (f, j) { f.classList.toggle('is-focus', j === i); });
        points.forEach(function (q) { q.classList.toggle('is-focus', q === p); });
      });
      p.addEventListener('pointerleave', function () {
        svg.classList.remove('has-focus');
        faces.forEach(function (f) { f.classList.remove('is-focus'); });
        p.classList.remove('is-focus');
      });
    });
  })();

  /* 5. Sectors: the stage shows the sector under the pointer / keyboard focus / tap -------- */
  (function () {
    var root = document.querySelector('[data-sectors]');
    if (!root) return;
    var items = [].slice.call(root.querySelectorAll('.sx-item'));
    var stage = root.querySelector('.sx-stage');
    var nameEl = root.querySelector('[data-sx-name]');
    var numEl = root.querySelector('[data-sx-num]');
    var digits = '٠١٢٣٤٥٦٧٨٩';
    var current = 0;

    var show = function (i) {
      if (i === current) return;
      current = i;
      items.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      nameEl.textContent = items[i].querySelector('.sx-item__name').textContent;
      numEl.textContent = ('0' + (i + 1)).slice(-2).replace(/\d/g, function (d) { return digits[+d]; });
      if (!reduce.matches) {
        stage.classList.remove('is-changing');
        void stage.offsetWidth; // restart the short entrance animation
        stage.classList.add('is-changing');
      }
    };

    items.forEach(function (b, i) {
      b.addEventListener('click', function () { show(i); });
      b.addEventListener('focus', function () { show(i); });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(i); });
      b.addEventListener('keydown', function (e) {
        var to = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') to = (i + 1) % items.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') to = (i - 1 + items.length) % items.length;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = items.length - 1;
        if (to !== null) { e.preventDefault(); items[to].focus(); }
      });
    });
  })();

  /* 6. Contract services: navigator (>=1024px) / accordion (smaller) ----------------------- */
  (function () {
    var root = document.querySelector('[data-services]');
    if (!root) return;
    var btns = [].slice.call(root.querySelectorAll('.sv-item__btn'));
    var panels = btns.map(function (b) { return document.getElementById(b.getAttribute('aria-controls')); });
    var wide = window.matchMedia('(min-width: 1024px)');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var hoverTimer = null;

    // open(i): exactly one panel open; open(-1): all closed (accordion only)
    var open = function (i) {
      btns.forEach(function (b, j) {
        b.setAttribute('aria-expanded', String(j === i));
        panels[j].hidden = j !== i;
      });
    };
    var openIndex = function () {
      for (var j = 0; j < btns.length; j++) if (btns[j].getAttribute('aria-expanded') === 'true') return j;
      return -1;
    };

    open(0);
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        // The navigator always shows one service; the accordion can be closed again.
        open(!wide.matches && openIndex() === i ? -1 : i);
      });
      b.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || !wide.matches || !fine.matches) return;
        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(function () { open(i); }, 120);
      });
      b.addEventListener('pointerleave', function () { window.clearTimeout(hoverTimer); });
      b.addEventListener('keydown', function (e) {
        var to = null;
        if (e.key === 'ArrowDown') to = (i + 1) % btns.length;
        else if (e.key === 'ArrowUp') to = (i - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = btns.length - 1;
        if (to !== null) { e.preventDefault(); btns[to].focus(); }
      });
    });
    // A quote action inside a closed panel (e.g. preselection from elsewhere) never needs this,
    // but when switching to the navigator there must always be one open service.
    var ensureOne = function () { if (wide.matches && openIndex() === -1) open(0); };
    if (wide.addEventListener) wide.addEventListener('change', ensureOne); else if (wide.addListener) wide.addListener(ensureOne);
  })();
})();
