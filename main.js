/* Храм святителя Спиридона Тримифунтского — main.js
   1. Мобильное меню (бургер, aria-expanded, Escape, закрытие по клику на ссылку).
   2. Кнопка «Скопировать реквизиты».
   3. Загрузка расписания и новостей из data/*.json (при неудаче остаются заглушки из HTML).
*/
(function () {
  'use strict';

  /* ---------- 1. Мобильное меню ---------- */
  var header = document.querySelector('.site-header');
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!burger || !nav) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });
    var mq = window.matchMedia('(min-width: 768px)');
    var onChange = function (ev) { if (ev.matches) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
  }

  /* ---------- 2. Копирование реквизитов ---------- */
  var copyBtn = document.querySelector('.js-copy-requisites');
  var requisites = document.querySelector('.requisites');
  var copyStatus = document.querySelector('.js-copy-status');

  function requisitesText() {
    var lines = [];
    if (requisites) {
      requisites.querySelectorAll('.requisites__row').forEach(function (row) {
        var k = row.querySelector('dt'), v = row.querySelector('dd');
        if (k && v) lines.push(k.textContent.trim() + ': ' + v.textContent.trim());
      });
    }
    var purpose = document.querySelector('.js-payment-purpose');
    if (purpose) lines.push('Назначение платежа: ' + purpose.textContent.trim());
    return lines.join('\n');
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  if (copyBtn) {
    var label = copyBtn.querySelector('.btn__label');
    var original = label ? label.textContent : copyBtn.textContent;
    var timer;

    function showDone(ok) {
      var msg = ok ? 'Скопировано' : 'Не удалось скопировать';
      if (label) label.textContent = msg; else copyBtn.textContent = msg;
      copyBtn.classList.toggle('is-done', ok);
      if (copyStatus) copyStatus.textContent = ok ? 'Реквизиты скопированы в буфер обмена' : 'Скопировать не удалось, выделите реквизиты вручную';
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (label) label.textContent = original; else copyBtn.textContent = original;
        copyBtn.classList.remove('is-done');
      }, 2200);
    }

    copyBtn.addEventListener('click', function () {
      var text = requisitesText();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { showDone(true); }, function () { showDone(fallbackCopy(text)); });
      } else {
        showDone(fallbackCopy(text));
      }
    });
  }

  /* ---------- 3. Данные из JSON ---------- */
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function formatDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    if (!m) return str || '';
    return parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function loadJSON(url) {
    if (!window.fetch || window.location.protocol === 'file:') return Promise.reject(new Error('no fetch'));
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  /* Расписание */
  var scheduleBody = document.querySelector('.js-schedule-body');
  if (scheduleBody) {
    loadJSON('data/schedule.json').then(function (data) {
      if (!data || !Array.isArray(data.items) || !data.items.length) return;
      var frag = document.createDocumentFragment();
      data.items.forEach(function (it) {
        var tr = el('tr', 'schedule__row' + (it.holiday ? ' schedule__row--holiday' : ''));
        tr.appendChild(el('th', 'schedule__day', it.day || ''));
        tr.querySelector('th').setAttribute('scope', 'row');
        tr.appendChild(el('td', 'schedule__time', it.time || ''));
        tr.appendChild(el('td', 'schedule__title', it.title || ''));
        frag.appendChild(tr);
      });
      scheduleBody.innerHTML = '';
      scheduleBody.appendChild(frag);
      var note = document.querySelector('.js-schedule-note');
      if (note && data.note) note.textContent = data.note;
      var upd = document.querySelector('.js-schedule-updated');
      if (upd) {
        if (data.updated) { upd.textContent = 'Обновлено: ' + formatDate(data.updated); upd.hidden = false; }
        else upd.hidden = true;
      }
    }).catch(function () { /* оставляем заглушки из HTML */ });
  }

  /* Новости */
  var newsGrid = document.querySelector('.js-news-grid');
  if (newsGrid) {
    loadJSON('data/news.json').then(function (data) {
      if (!data || !Array.isArray(data.items) || !data.items.length) return;
      var frag = document.createDocumentFragment();
      data.items.slice(0, 3).forEach(function (it) {
        var card = el('article', 'news-card');
        var media = el('div', 'news-card__media');
        if (it.image) {
          var img = el('img', 'news-card__img');
          img.src = it.image;
          img.alt = it.title || '';
          img.loading = 'lazy';
          media.appendChild(img);
        }
        media.appendChild(el('span', 'news-card__date', formatDate(it.date)));
        card.appendChild(media);
        var body = el('div', 'news-card__body');
        body.appendChild(el('h3', 'news-card__title', it.title || ''));
        if (it.text) body.appendChild(el('p', 'news-card__text', it.text));
        var a = el('a', 'news-card__link', 'Читать далее');
        a.href = it.url || 'https://vk.ru/hramspiridonapnz';
        a.target = '_blank';
        a.rel = 'noopener';
        body.appendChild(a);
        card.appendChild(body);
        frag.appendChild(card);
      });
      newsGrid.innerHTML = '';
      newsGrid.appendChild(frag);
    }).catch(function () { /* оставляем заглушки из HTML */ });
  }
})();
