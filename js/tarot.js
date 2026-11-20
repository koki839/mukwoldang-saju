/* =========================================================
   묵월당 사주 — 이별·재회 타로 (js/tarot.js)
   3장 스프레드 · 카드 뽑기 보드 · 해석 렌더링 · 공유 · GA4
   data/tarot_data.js (window.MUKWO_TAROT) 를 읽어 동작합니다.
   ========================================================= */
(function () {
  'use strict';

  var T = window.MUKWO_TAROT;
  if (!T) return;

  var MOOD = { toward: 'T', static: 'S', away: 'A' };
  var TOPICS = {};
  T.topics.forEach(function (t) { TOPICS[t.id] = t; });

  var BOARD_SIZE = 15;

  var state = { topic: 'mind', cards: [], restored: false };

  var el = {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg) {
    if (window.MUKWO && window.MUKWO.toast) { window.MUKWO.toast(msg); return; }
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    setTimeout(function () { t.classList.remove('is-on'); }, 2400);
  }
  function track(name, params) {
    if (window.MUKWO && window.MUKWO.trackEvent) { window.MUKWO.trackEvent(name, params || {}); return; }
    if (typeof window.gtag === 'function') {
      try { window.gtag('event', name, params || {}); } catch (e) { /* 측정 실패는 화면에 영향 없음 */ }
    }
  }

  /* =====================================================
     1. 카드 아트 (SVG)
     ===================================================== */

  /* 아르카나 상징 — 100×150 좌표계, 메달리온(50,72) 안에 그려집니다. */
  var SIGILS = {
    0: '<path d="M62 60a6 6 0 1 1-6-6"/><path d="M64 52v-4M64 68v4M56 60h-4M74 60h-2"/><path d="M38 86l14-13 8 7"/><path d="M33 92h32"/>',
    1: '<path d="M50 70c-6-8-16-8-16 0s10 8 16 0 16-8 16 0-10 8-16 0z"/><path d="M50 50v44"/><circle cx="50" cy="50" r="2.5"/>',
    2: '<path d="M40 56v36M60 56v36"/><path d="M43 52c4-5 10-5 14 0"/><path d="M45 76h10v10H45z"/><path d="M48 76v10"/>',
    3: '<path d="M38 64l4-14 4 9 4-12 4 12 4-9 4 14z"/><path d="M50 64v26"/><path d="M44 90c4-4 8-4 12 0"/>',
    4: '<path d="M42 62h16v28H42z"/><path d="M38 58c-7-4-7-12 0-14"/><path d="M62 44c7 2 7 10 0 14"/><path d="M50 62v28"/>',
    5: '<path d="M50 50v40"/><path d="M41 58h18"/><path d="M43 67h14"/><path d="M46 76h8"/><circle cx="50" cy="48" r="2.5"/>',
    6: '<circle cx="42" cy="74" r="8"/><circle cx="58" cy="74" r="8"/><path d="M50 58v-6"/><path d="M41 52c3-4 6-4 9 0s6 4 9 0"/>',
    7: '<path d="M37 66h26v16H37z"/><circle cx="43" cy="88" r="4"/><circle cx="57" cy="88" r="4"/><path d="M50 56v10"/><path d="M40 56h20"/>',
    8: '<path d="M50 74c-6-8-16-8-16 0s10 8 16 0 16-8 16 0-10 8-16 0z"/><circle cx="50" cy="74" r="4.5"/>',
    9: '<path d="M57 54l7 9v10l-7 9"/><path d="M43 54v38"/><path d="M60 68v4M58 70h4"/>',
    10: '<circle cx="50" cy="72" r="18"/><circle cx="50" cy="72" r="5"/><path d="M50 54v36M32 72h36M37 59l26 26M63 59L37 85"/>',
    11: '<path d="M50 50v40"/><path d="M34 60h32"/><path d="M34 60l-6 12h12z"/><path d="M66 60l-6 12h12z"/>',
    12: '<path d="M50 48v46"/><path d="M38 58h24l-12 18z"/><path d="M38 58l-6-6M62 58l6-6"/>',
    13: '<path d="M34 88h32"/><path d="M38 88c6-16 16-24 24-26"/><path d="M62 62a8 8 0 0 0 0 14"/><path d="M44 94h12"/>',
    14: '<path d="M38 62h12l-6 11z"/><path d="M50 82h12l-6-11z"/><path d="M44 73c4 5 8 5 12 0"/><path d="M50 52v6M50 86v6"/>',
    15: '<path d="M50 88l10-32-20 13h20l-20-13z"/><circle cx="34" cy="90" r="3"/><circle cx="41" cy="94" r="3"/>',
    16: '<path d="M40 92V62h16v30"/><path d="M44 62v-7h8v7"/><path d="M65 54l-6 11h7l-7 12"/><path d="M35 92h24"/><circle cx="48" cy="73" r="2"/>',
    17: '<path d="M50 52v40M34 72h32M39 61l22 22M61 61L39 83"/><circle cx="34" cy="56" r="2"/><circle cx="66" cy="56" r="2"/><circle cx="34" cy="90" r="2"/>',
    18: '<path d="M57 60a12 12 0 1 0 0 25 15 15 0 0 1 0-25z"/><path d="M35 80v11M65 80v11"/><circle cx="50" cy="96" r="1.6"/>',
    19: '<circle cx="50" cy="72" r="10"/><path d="M50 52v-6M50 92v6M30 72h-6M70 72h6M36 58l-4-4M64 58l4-4M36 86l-4 4M64 86l4 4"/>',
    20: '<path d="M38 62h16v9H38z"/><path d="M54 66l16-7v18l-16-7z"/><circle cx="42" cy="86" r="4"/><circle cx="54" cy="88" r="4"/>',
    21: '<ellipse cx="50" cy="72" rx="16" ry="21"/><circle cx="50" cy="72" r="5"/><path d="M50 48v-4M50 96v4M32 72h-4M68 72h4"/>'
  };

  function cardFront(card, rev) {
    return '<span class="tface-front' + (rev ? ' is-rev' : '') + '">' +
      '<svg class="tart" viewBox="0 0 100 150" aria-hidden="true" focusable="false">' +
        '<circle class="tart-ring" cx="50" cy="72" r="37"/>' +
        '<circle class="tart-ring2" cx="50" cy="72" r="31"/>' +
        '<path class="tart-tick" d="M50 26v9M26 72h6M74 72h-6"/>' +
        '<g class="tart-sigil">' + (SIGILS[card.no] || '') + '</g>' +
      '</svg>' +
      '<span class="tcard-num">' + esc(card.roman) + '</span>' +
      '<span class="tcard-name">' + esc(card.name) + '</span>' +
      '<span class="tcard-dir">' + (rev ? '역방향' : '정방향') + '</span>' +
    '</span>';
  }

  function cardBack() {
    return '<span class="tface-back" aria-hidden="true">' +
      '<svg class="tart" viewBox="0 0 100 150" focusable="false">' +
        '<rect class="tart-frame" x="6" y="6" width="88" height="138" rx="7"/>' +
        '<rect class="tart-frame2" x="11" y="11" width="78" height="128" rx="5"/>' +
        '<path class="tart-moon" d="M60 52a16 16 0 1 0 0 33 19 19 0 0 1 0-33z"/>' +
        '<g class="tart-stars">' +
          '<path d="M38 46l1.6 4.4L44 52l-4.4 1.6L38 58l-1.6-4.4L32 52l4.4-1.6z"/>' +
          '<path d="M34 96l1.3 3.6 3.6 1.3-3.6 1.3L34 106l-1.3-3.5-3.6-1.3 3.6-1.3z"/>' +
          '<circle cx="66" cy="100" r="1.6"/><circle cx="44" cy="74" r="1.3"/>' +
        '</g>' +
        '<path class="tart-seal" d="M42 116h16v11H42z"/>' +
        '<path class="tart-seal-t" d="M46 120h8M46 124h8"/>' +
      '</svg>' +
    '</span>';
  }

  /* =====================================================
     2. 보드 · 슬롯 만들기
     ===================================================== */

  function buildBoard() {
    if (!el.board) return;
    var html = '';
    for (var i = 0; i < BOARD_SIZE; i++) {
      html += '<button type="button" class="tcard" data-i="' + i + '" aria-label="' + (i + 1) + '번째 카드 뽑기">' +
        '<span class="tcard-inner">' + cardBack() + '<span class="tface-slot"></span></span>' +
        '</button>';
    }
    el.board.innerHTML = html;
    el.board.addEventListener('click', onBoardClick);
  }

  function buildSlots() {
    if (!el.slots) return;
    var html = '';
    T.positions.forEach(function (p, i) {
      html += '<div class="tslot" data-pos="' + i + '">' +
        '<div class="tslot-frame">' +
          '<div class="tslot-inner">' + cardBack() + '<span class="tface-slot"></span></div>' +
        '</div>' +
        '<p class="tslot-cap"><span class="tslot-no">' + p.no + '</span>' + esc(p.label) + '</p>' +
      '</div>';
    });
    el.slots.innerHTML = html;
  }

  function onBoardClick(e) {
    var btn = e.target.closest ? e.target.closest('.tcard') : null;
    if (!btn || btn.classList.contains('is-used')) return;
    if (state.cards.length >= 3) { toast('세 장을 모두 뽑았어요. 다시 뽑기를 눌러 주세요.'); return; }
    drawOne(btn);
  }

  function drawOne(btn) {
    var card = randomCard();
    if (!card) return;
    var pos = state.cards.length;
    state.cards.push(card);

    var front = cardFront(T.cards[card.no], card.rev);
    var faceSlot = btn.querySelector('.tface-slot');
    if (faceSlot) faceSlot.innerHTML = front;
    btn.classList.add('is-flipping');
    btn.disabled = true;

    var slot = el.slots ? el.slots.querySelector('.tslot[data-pos="' + pos + '"]') : null;
    if (slot) {
      var sf = slot.querySelector('.tface-slot');
      if (sf) sf.innerHTML = front;
      setTimeout(function () { slot.classList.add('is-filled'); }, 260);
    }
    setTimeout(function () { btn.classList.add('is-used'); }, 620);

    updateCount();
    track('tarot_draw', { slot: pos + 1, card: card.no + (card.rev ? 'r' : 'u'), topic: state.topic });

    if (state.cards.length === 3) {
      setTimeout(function () { renderResult(false); }, 900);
    } else {
      setHint(pos + 1);
    }
  }

  function randomCard() {
    var pool = [];
    for (var i = 0; i < T.cards.length; i++) {
      var taken = state.cards.some(function (c) { return c.no === i; });
      if (!taken) pool.push(i);
    }
    if (!pool.length) return null;
    var no = pool[Math.floor(Math.random() * pool.length)];
    return { no: no, rev: Math.random() < 0.5 };
  }

  function setHint(drawn) {
    if (!el.hint) return;
    if (drawn >= 3) { el.hint.textContent = '세 장이 모두 놓였습니다. 아래에서 해석을 읽어 보세요.'; return; }
    var next = T.positions[drawn] ? T.positions[drawn].label : '';
    el.hint.textContent = '카드 ' + drawn + '장을 뽑았어요. 이제 “' + next + '” 자리에 놓을 한 장을 골라 주세요.';
  }

  function updateCount() {
    if (el.count) el.count.textContent = state.cards.length + ' / 3';
    if (el.reset) el.reset.disabled = state.cards.length === 0 && !state.restored;
  }

  /* =====================================================
     3. 결과 렌더링
     ===================================================== */

  function moodOf(card) { return MOOD[T.cards[card.no][card.rev ? 'rev' : 'up'].mood] || 'S'; }

  function comboKey() { return state.cards.map(moodOf).join(''); }

  function comboText(key) {
    var raw = T.combo[key] || T.combo.SSS;
    return raw
      .replace(/\{t1\}/g, T.cards[state.cards[0].no][state.cards[0].rev ? 'rev' : 'up'].tag)
      .replace(/\{t2\}/g, T.cards[state.cards[1].no][state.cards[1].rev ? 'rev' : 'up'].tag)
      .replace(/\{t3\}/g, T.cards[state.cards[2].no][state.cards[2].rev ? 'rev' : 'up'].tag);
  }

  function tokens() {
    return state.cards.map(function (c) { return c.no + (c.rev ? 'r' : 'u'); }).join(',');
  }

  function shareUrl() {
    return location.origin + location.pathname + '?tab=tarot&topic=' + encodeURIComponent(state.topic) + '&cards=' + tokens();
  }

  function renderResult(isRestore) {
    if (!el.result || state.cards.length !== 3) return;
    var topic = TOPICS[state.topic] || T.topics[0];
    var lastMood = moodOf(state.cards[2]);
    var closeText = (T.closing[state.topic] || T.closing.mind)[lastMood];
    var actList = (T.actions[state.topic] || T.actions.mind)[lastMood];

    var html = '';
    html += '<div class="tres">';

    html += '<div class="res-head tres-head">' +
      '<p class="eyebrow">✦ 이별·재회 타로 · 3장 스프레드</p>' +
      '<h2 class="res-title">' + esc(topic.label) + '</h2>' +
      '<p class="tres-sub">' + esc(topic.lead) + '</p>' +
      '<div class="tres-tags">' + state.cards.map(function (c, i) {
        var d = T.cards[c.no][c.rev ? 'rev' : 'up'];
        return '<span class="tres-tag"><b>' + T.positions[i].no + '</b>' + esc(T.cards[c.no].name) +
          ' <em>' + (c.rev ? '역' : '정') + '</em> · ' + esc(d.tag) + '</span>';
      }).join('') + '</div>' +
    '</div>';

    html += '<div class="card tres-visual">';
    html += '<div class="tres-deck">';
    state.cards.forEach(function (c, i) {
      var card = T.cards[c.no];
      var d = card[c.rev ? 'rev' : 'up'];
      html += '<figure class="tres-card">' +
        '<div class="tmini">' + cardFront(card, c.rev) + '</div>' +
        '<figcaption><span class="tmini-pos">' + T.positions[i].no + ' ' + esc(T.positions[i].label) + '</span>' +
        '<b>' + esc(card.roman) + ' · ' + esc(card.name) + '</b>' +
        '<span class="tmini-dir">' + (c.rev ? '역방향' : '정방향') + '</span></figcaption>' +
      '</figure>';
    });
    html += '</div>';
    if (state.topic === 'contact') {
      html += '<div class="ttiming">카드가 말하는 시기 — ' +
        state.cards.map(function (c, i) {
          var d = T.cards[c.no][c.rev ? 'rev' : 'up'];
          return T.positions[i].no + ' ' + esc(d.timing);
        }).join(' <span class="tdot">·</span> ') + '</div>';
    }
    html += '</div>';

    state.cards.forEach(function (c, i) {
      var card = T.cards[c.no];
      var d = card[c.rev ? 'rev' : 'up'];
      var p = T.positions[i];
      html += '<article class="card tsec">' +
        '<div class="tsec-head">' +
          '<span class="tsec-no">' + p.no + '</span>' +
          '<div class="tsec-t">' +
            '<b>' + esc(p.label) + '</b>' +
            '<span>' + esc(card.roman) + ' · ' + esc(card.name) + ' · ' + (c.rev ? '역방향' : '정방향') + '</span>' +
          '</div>' +
        '</div>' +
        '<h3 class="tsec-title">' + esc(d.head) + '</h3>' +
        d.body.map(function (par) { return '<p class="para">' + esc(par) + '</p>'; }).join('') +
        (i === 0 ? '<div class="tquote"><b>상대의 속마음</b><p>' + esc(d.them) + '</p></div>' : '') +
        '<div class="tfor"><b>이 카드가 말하는 ' + esc(topic.short) + '</b>' +
          '<p>' + esc(d.t[topic.id] || d.t.mind) + '</p></div>' +
        (i === 2 ? '<div class="tadvice"><b>현실 조언</b><p>' + esc(d.advice) + '</p></div>' +
          '<ul class="tdo">' + d.do.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '</article>';
    });

    html += '<div class="card tsynth">' +
      '<p class="eyebrow">세 장이 함께 말하는 것</p>' +
      '<h3>지금 이 관계의 방향</h3>' +
      '<p class="para">' + esc(comboText(comboKey())) + '</p>' +
      '<p class="tsynth-close">' + esc(closeText) + '</p>' +
      '<div class="tnext"><b>지금 할 수 있는 한 걸음</b><ul>' +
        actList.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
      '</ul></div>' +
    '</div>';

    html += '<div class="card tfoot">' +
      '<h3>이 결과를 남겨 두기</h3>' +
      '<div class="share-row" data-tshare="1">' +
        '<span class="share-label">공유</span>' +
        '<button type="button" class="share-btn x" data-share="x">X</button>' +
        '<button type="button" class="share-btn" data-share="copy">링크 복사</button>' +
      '</div>' +
      '<p class="tiny">링크를 복사해 두면 뽑은 세 장이 그대로 다시 열립니다.</p>' +
      (window.MUKWO && window.MUKWO.upsellHtml
        ? window.MUKWO.upsellHtml({
            from: 'tarot',
            title: '카드가 짚은 자리에서, 한 가지만 더',
            sub: '3장 타로는 지금의 흐름까지입니다. 뽑으신 세 장을 그대로 두고 궁금한 것 한 가지만 더 짚어 드리거나, 생년월일까지 놓고 이별·재회를 정밀하게 읽어 드립니다.'
          })
        : '') +
    '</div>';

    html += '</div>';

    el.result.innerHTML = html;
    var ad = el.ad;
    if (ad) ad.hidden = false;

    /* 공유 이벤트(실제 동작은 app.js의 공유 핸들러가 처리) + CTA */
    var shareBox = el.result.querySelector('[data-tshare]');
    if (shareBox) {
      shareBox.addEventListener('click', function () {
        track('tarot_share', { topic: state.topic, cards: tokens() });
      });
    }
    $$('[data-topen]', el.result).forEach(function (b) {
      b.addEventListener('click', function () {
        track('tarot_cta', { type: 'pay_modal' });
        if (window.MUKWO && window.MUKWO.openPayModal) window.MUKWO.openPayModal();
      });
    });
    $$('[data-ttab]', el.result).forEach(function (b) {
      b.addEventListener('click', function () {
        track('tarot_cta', { type: 'premium_tab' });
        if (window.MUKWO && window.MUKWO.activateTab) window.MUKWO.activateTab(b.getAttribute('data-ttab'));
      });
    });

    track('tarot_view', { topic: state.topic, cards: tokens(), restored: isRestore ? 'yes' : 'no' });

    if (!isRestore) {
      setTimeout(function () {
        var top = el.result.getBoundingClientRect().top + window.pageYOffset - 74;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 60);
    }
  }

  /* =====================================================
     4. 토픽 · 다시 뽑기 · URL 복원
     ===================================================== */

  function syncChips() {
    $$('.tchip', el.panel).forEach(function (c) {
      var on = c.getAttribute('data-topic') === state.topic;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var t = TOPICS[state.topic] || T.topics[0];
    if (el.lead) el.lead.textContent = t.lead;
  }

  function resetSpread(keepBoard) {
    state.cards = [];
    state.restored = false;
    $$('.tslot', el.slots).forEach(function (s) {
      s.classList.remove('is-filled');
      var f = s.querySelector('.tface-slot');
      if (f) f.innerHTML = '';
    });
    $$('.tcard', el.board).forEach(function (b) {
      b.classList.remove('is-flipping', 'is-used');
      b.disabled = false;
      var f = b.querySelector('.tface-slot');
      if (f) f.innerHTML = '';
    });
    if (el.result) el.result.innerHTML = '';
    if (el.ad) el.ad.hidden = true;
    if (el.boardWrap) el.boardWrap.classList.remove('is-restored');
    if (el.hint) el.hint.textContent = '마음을 가라앉히고, 카드 세 장을 직접 골라 주세요.';
    updateCount();
    if (!keepBoard) {
      var y = el.boardWrap.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  function parseToken(tok) {
    var m = /^(\d{1,2})([ur])$/i.exec(String(tok).trim());
    if (!m) return null;
    var no = Number(m[1]);
    if (isNaN(no) || no < 0 || no >= T.cards.length) return null;
    return { no: no, rev: m[2].toLowerCase() === 'r' };
  }

  function restoreFromUrl() {
    var q = new URLSearchParams(location.search);
    if (q.get('tab') !== 'tarot') return false;
    var raw = q.get('cards');
    var topic = (q.get('topic') || '').toLowerCase();
    if (TOPICS[topic]) state.topic = topic;
    syncChips();
    if (!raw) return false;

    var list = raw.split(',').map(parseToken).filter(Boolean).slice(0, 3);
    if (!list.length) return false;

    state.cards = list;
    list.forEach(function (c, i) {
      var slot = el.slots.querySelector('.tslot[data-pos="' + i + '"]');
      if (slot) {
        var f = slot.querySelector('.tface-slot');
        if (f) f.innerHTML = cardFront(T.cards[c.no], c.rev);
        slot.classList.add('is-filled');
      }
    });
    updateCount();

    if (list.length === 3) {
      state.restored = true;
      if (el.boardWrap) el.boardWrap.classList.add('is-restored');
      if (el.hint) el.hint.textContent = '공유된 결과를 보고 있습니다. 직접 뽑으려면 ‘다시 뽑기’를 눌러 주세요.';
      if (el.reset) el.reset.disabled = false;
      renderResult(true);
    }
    return true;
  }

  /* =====================================================
     5. 시작
     ===================================================== */

  function boot() {
    el.panel = document.getElementById('panel-tarot');
    if (!el.panel) return;
    el.board = document.getElementById('tarot-board');
    el.slots = document.getElementById('tarot-slots');
    el.result = document.getElementById('tarot-result');
    el.hint = document.getElementById('tarot-hint');
    el.count = document.getElementById('tarot-count');
    el.reset = document.getElementById('tarot-reset');
    el.lead = document.getElementById('tarot-topic-lead');
    el.boardWrap = document.getElementById('tarot-board-wrap');
    el.ad = document.getElementById('tarot-ad');

    buildBoard();
    buildSlots();
    syncChips();
    updateCount();

    $$('.tchip', el.panel).forEach(function (c) {
      c.addEventListener('click', function () {
        state.topic = c.getAttribute('data-topic');
        syncChips();
        if (state.cards.length === 3) renderResult(false);
      });
    });

    if (el.reset) {
      el.reset.addEventListener('click', function () {
        track('tarot_reset', { topic: state.topic });
        resetSpread(false);
      });
    }

    if (!restoreFromUrl()) {
      /* 해시로 탭이 열린 경우에도 보드는 그대로 준비된 상태 */
    }
  }

  window.MUKWO_TAROT_UI = {
    shareUrl: function () {
      if (state.cards.length === 3) return shareUrl();
      return location.origin + location.pathname + '?tab=tarot';
    },
    /* 추가 질문 모달이 "지금 보고 있는 결과"로 채워 넣는 한 줄 요약 */
    summary: function () {
      if (state.cards.length !== 3) return '';
      var t = TOPICS[state.topic] || T.topics[0];
      var names = state.cards.map(function (c) {
        var card = T.cards[c.no];
        return card.name + '(' + (c.rev ? '역' : '정') + ')';
      }).join(' · ');
      return '이별 타로 · ' + t.label + ' · ' + names;
    },
    restore: restoreFromUrl,
    hasSpread: function () { return state.cards.length === 3; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
