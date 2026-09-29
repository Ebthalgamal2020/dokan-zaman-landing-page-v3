/*
 * Quote request form — PROTOTYPE HANDLER. Sends nothing, stores nothing.
 *
 * The form uses method="dialog", so the browser never submits it anywhere, even
 * without JavaScript. This file validates the fields and then tells the visitor, in
 * Arabic, that the request has NOT been sent or saved.
 *
 * To go live (only after the company confirms the destination): set QUOTE.mode to
 * 'live', give the form a real method/action or post to QUOTE.endpoint, and replace
 * MESSAGES.prototype and the note under the submit button. Never invent an endpoint.
 */
(function () {
  'use strict';

  var QUOTE = {
    mode: 'prototype', // 'prototype' | 'live'
    endpoint: null     // not provided yet
  };

  var MESSAGES = {
    required: 'هذا الحقل مطلوب.',
    choose: 'يُرجى اختيار نوع المنتجات المطلوبة.',
    phone: 'يُرجى إدخال رقم هاتف صحيح (أرقام فقط، ويمكن أن يبدأ بـ +).',
    email: 'يُرجى إدخال بريد إلكتروني صحيح، أو ترك الحقل فارغًا.',
    review: 'يُرجى مراجعة الحقول المعلّمة قبل المتابعة.',
    prototypeTitle: 'لم يتم إرسال طلبك.',
    prototype: 'البيانات مكتملة، لكن هذا النموذج ما زال في مرحلة تجريبية: لم يُرسَل الطلب ولم تُحفظ أي بيانات، لأن جهة استلام الطلبات لم تُحدَّد بعد.'
  };

  var form = document.getElementById('quote-form');
  if (!form) return;
  var status = document.getElementById('quote-status');
  var el = form.elements;
  var fields = [el.name, el.company, el.phone, el.email, el.category, el.details];
  var attempted = false;

  function setError(field, message) {
    var box = document.getElementById(field.id + '-error');
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    if (box) {
      box.textContent = message || '';
      box.hidden = !message;
    }
  }

  function validate(field) {
    var v = field.value.trim();
    switch (field.name) {
      case 'name':
      case 'company':
      case 'details':
        return v ? '' : MESSAGES.required;
      case 'phone':
        if (!v) return MESSAGES.required;
        // Western, Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits are all accepted.
        return /^\+?[0-9٠-٩۰-۹\s\-()]{7,20}$/.test(v) ? '' : MESSAGES.phone;
      case 'email':
        if (!v) return '';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : MESSAGES.email;
      case 'category':
        return v ? '' : MESSAGES.choose;
    }
    return '';
  }

  function showStatus(html) {
    status.innerHTML = html;
    status.hidden = !html;
  }

  function checkAll() {
    var invalid = [];
    fields.forEach(function (field) {
      var msg = validate(field);
      setError(field, msg);
      if (msg) invalid.push(field);
    });
    return invalid;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var invalid = checkAll();
    if (invalid.length) {
      showStatus('<strong>' + MESSAGES.review + '</strong>');
      invalid[0].focus();
      return;
    }
    if (QUOTE.mode === 'prototype') {
      showStatus('<strong>' + MESSAGES.prototypeTitle + '</strong>' + MESSAGES.prototype);
    }
  });

  // After a first attempt, re-check each field as the visitor corrects it.
  form.addEventListener('input', function (e) {
    var field = e.target;
    if (!attempted || fields.indexOf(field) === -1) return;
    setError(field, validate(field));
    if (!form.querySelector('[aria-invalid="true"]')) showStatus('');
  });
  form.addEventListener('change', function (e) {
    if (attempted && e.target === el.category) setError(el.category, validate(el.category));
  });

  /*
   * Preselection: every «اطلب عرض سعر» action on a category or contract service carries
   * data-quote-select="cat:…" / "svc:…", matching an <option data-key="…"> in the dropdown.
   * The action selects that option, scrolls to the form and focuses the dropdown so the choice
   * is announced. The dropdown stays fully usable by hand. Without JavaScript the link is a
   * plain jump to #quote.
   */
  var select = el.category;
  var selectField = select.closest('.field');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var highlightTimer = null;

  [].forEach.call(document.querySelectorAll('[data-quote-select]'), function (link) {
    link.addEventListener('click', function (e) {
      var option = select.querySelector('option[data-key="' + link.getAttribute('data-quote-select') + '"]');
      if (!option) return;
      e.preventDefault();
      e.stopPropagation(); // the generic in-page link handler would move focus to the section instead
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      // Show the section from its top when the dropdown then fits on screen (desktop);
      // otherwise (phones) centre the dropdown so the preselected choice is visible.
      var behavior = reduceMotion.matches ? 'auto' : 'smooth';
      var section = document.getElementById('quote');
      var header = document.querySelector('[data-header]');
      var headerH = header ? header.offsetHeight : 0;
      var fieldBottom = selectField.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
      if (fieldBottom + headerH + 32 <= window.innerHeight) {
        section.scrollIntoView({ behavior: behavior, block: 'start' });
      } else {
        selectField.scrollIntoView({ behavior: behavior, block: 'center' });
      }
      if (window.history && history.replaceState) history.replaceState(null, '', '#quote');

      selectField.classList.remove('is-preselected');
      void selectField.offsetWidth;
      selectField.classList.add('is-preselected');
      window.clearTimeout(highlightTimer);
      highlightTimer = window.setTimeout(function () { selectField.classList.remove('is-preselected'); }, 2400);
      window.setTimeout(function () { select.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 650);
    });
  });
})();
