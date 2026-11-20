/* =========================================================
   묵월당 사주 — app.js
   탭·입력폼·결과 렌더링·공유·결제 안내 모달·GA4 이벤트
   ========================================================= */
(function () {
  'use strict';

  /* =====================================================
     0. 설정값
     ===================================================== */

  // 계좌이체 신청 설정 — 값만 채우면 화면이 바로 바뀝니다.
  var BANK_CONFIG = {
    bank: '',            // 예: '카카오뱅크'
    account: '',         // 예: '3333-00-0000000'
    holder: '',          // 예금주
    amount: 19900,
    product: '1:1 정밀 사주 & 이별·재회 감정서',
    turnaround: '48시간',
    contactEmail: 'dfkgj3147@gmail.com',
    contactKakao: ''     // 예: 'https://open.kakao.com/o/xxxxxxx'
  };

  var S = window.Saju;
  var D = window.KR_DATA;

  var YEAR_MIN = 1900;
  var YEAR_MAX = 2026;

  /* =====================================================
     1. 유틸
     ===================================================== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(okMsg || '복사했어요.'); }
      catch (e) { toast('복사에 실패했어요. 길게 눌러 직접 복사해 주세요.'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || '복사했어요.'); }, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- GA4 ---------- */
  (function initGA() {
    var id = window.GA_MEASUREMENT_ID;
    if (!id) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  })();

  function trackEvent(name, params) {
    if (typeof window.gtag !== 'function') return;
    try { window.gtag('event', name, params || {}); } catch (e) { /* 측정 실패는 화면에 영향 없음 */ }
  }

  /* =====================================================
     2. 입력 폼
     ===================================================== */
  var STEM_EL = S.STEM_EL, BR_EL = S.BR_EL;

  var TIME_OPTIONS = [
    { v: 'unknown', label: '모름 (시주 없이 계산)' },
    { v: 'b0', label: '자시 子時 · 23:30~01:29', hour: 0 },
    { v: 'b1', label: '축시 丑時 · 01:30~03:29', hour: 2 },
    { v: 'b2', label: '인시 寅時 · 03:30~05:29', hour: 4 },
    { v: 'b3', label: '묘시 卯時 · 05:30~07:29', hour: 6 },
    { v: 'b4', label: '진시 辰時 · 07:30~09:29', hour: 8 },
    { v: 'b5', label: '사시 巳時 · 09:30~11:29', hour: 10 },
    { v: 'b6', label: '오시 午時 · 11:30~13:29', hour: 12 },
    { v: 'b7', label: '미시 未時 · 13:30~15:29', hour: 14 },
    { v: 'b8', label: '신시 申時 · 15:30~17:29', hour: 16 },
    { v: 'b9', label: '유시 酉時 · 17:30~19:29', hour: 18 },
    { v: 'b10', label: '술시 戌時 · 19:30~21:29', hour: 20 },
    { v: 'b11', label: '해시 亥時 · 21:30~23:29', hour: 22 },
    { v: 'exact', label: '직접 입력 (시·분)' }
  ];

  function initBirthForm(root, defaults) {
    var state = {
      cal: 'solar', leap: false, gender: (defaults && defaults.gender) || 'f',
      timeMode: 'unknown', hour: 12, minute: 0
    };
    var ySel = $('[data-role="year"]', root);
    var mSel = $('[data-role="month"]', root);
    var dSel = $('[data-role="day"]', root);
    var tSel = $('[data-role="time"]', root);
    var hSel = $('[data-role="hour"]', root);
    var miSel = $('[data-role="minute"]', root);
    var exact = $('.exact-time', root);
    var leapChk = $('.leap-chk', root);
    var leapInput = $('[data-role="leap"]', root);
    var clockInput = $('[data-role="clockfix"]', root);

    // 연도
    var yOpt = '';
    for (var y = YEAR_MAX; y >= YEAR_MIN; y--) yOpt += '<option value="' + y + '">' + y + '년</option>';
    ySel.innerHTML = yOpt;
    ySel.value = String((defaults && defaults.y) || 1990);

    var mOpt = '';
    for (var m = 1; m <= 12; m++) mOpt += '<option value="' + m + '">' + m + '월</option>';
    mSel.innerHTML = mOpt;
    mSel.value = String((defaults && defaults.m) || 5);

    function fillDays() {
      var yv = Number(ySel.value), mv = Number(mSel.value);
      var maxD = 31;
      if (state.cal === 'lunar') {
        maxD = 30;
      } else {
        maxD = new Date(yv, mv, 0).getDate();
      }
      var prev = Number(dSel.value) || 0;
      var opt = '';
      for (var d = 1; d <= maxD; d++) opt += '<option value="' + d + '">' + d + '일</option>';
      dSel.innerHTML = opt;
      dSel.value = String(Math.min(prev || (defaults && defaults.d) || 9, maxD));
    }
    fillDays();

    var tOpt = '';
    TIME_OPTIONS.forEach(function (o) { tOpt += '<option value="' + o.v + '">' + esc(o.label) + '</option>'; });
    tSel.innerHTML = tOpt;
    tSel.value = 'unknown';

    if (hSel) {
      var hOpt = '';
      for (var h = 0; h < 24; h++) hOpt += '<option value="' + h + '">' + pad(h) + '시</option>';
      hSel.innerHTML = hOpt;
      hSel.value = '12';
    }
    if (miSel) {
      var miOpt = '';
      for (var mi = 0; mi < 60; mi++) miOpt += '<option value="' + mi + '">' + pad(mi) + '분</option>';
      miSel.innerHTML = miOpt;
      miSel.value = '0';
    }

    // 이벤트
    $$('.seg[data-cal]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.seg[data-cal]', root).forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        state.cal = btn.dataset.cal;
        if (leapChk) leapChk.hidden = (state.cal !== 'lunar');
        fillDays();
      });
    });
    if (leapInput) {
      leapInput.addEventListener('change', function () { state.leap = leapInput.checked; });
    }
    ySel.addEventListener('change', fillDays);
    mSel.addEventListener('change', fillDays);
    tSel.addEventListener('change', function () {
      state.timeMode = tSel.value;
      if (exact) exact.hidden = (tSel.value !== 'exact');
    });
    if (hSel) hSel.addEventListener('change', function () { state.hour = Number(hSel.value); });
    if (miSel) miSel.addEventListener('change', function () { state.minute = Number(miSel.value); });
    $$('.seg[data-gender]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.seg[data-gender]', root).forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        state.gender = btn.dataset.gender;
      });
    });

    function read() {
      var timeKnown = state.timeMode !== 'unknown';
      var hour = 12, minute = 0;
      if (state.timeMode === 'exact') {
        hour = Number(hSel ? hSel.value : 12);
        minute = Number(miSel ? miSel.value : 0);
      } else if (state.timeMode !== 'unknown') {
        var idx = Number(state.timeMode.replace('b', ''));
        hour = TIME_OPTIONS[idx + 1].hour;
        minute = 0;
      }
      return {
        cal: state.cal, y: Number(ySel.value), m: Number(mSel.value), d: Number(dSel.value),
        leap: !!leapInput && leapInput.checked,
        timeKnown: timeKnown, hour: timeKnown ? hour : null, minute: minute,
        gender: state.gender, lateZi: true,
        clockFix: clockInput ? clockInput.checked : true
      };
    }

    function set(input) {
      if (!input) return;
      if (input.cal === 'lunar') {
        var btn = $('.seg[data-cal="lunar"]', root);
        if (btn) btn.click();
      }
      if (input.y) ySel.value = String(input.y);
      if (input.m) mSel.value = String(input.m);
      fillDays();
      if (input.d) dSel.value = String(input.d);
      if (input.leap && leapInput) { leapInput.checked = true; state.leap = true; }
      if (input.gender) {
        var gb = $('.seg[data-gender="' + input.gender + '"]', root);
        if (gb) gb.click();
      }
      if (clockInput && input.clockFix === false) clockInput.checked = false;
      if (input.timeKnown) {
        if (input.exact) {
          tSel.value = 'exact';
          if (hSel) hSel.value = String(input.hour || 0);
          if (miSel) miSel.value = String(input.minute || 0);
          if (exact) exact.hidden = false;
        } else {
          var matched = null;
          for (var br = 0; br < 12; br++) {
            var opt = TIME_OPTIONS[br + 1];
            if (opt.hour === (input.hour || 0) && (input.minute || 0) === 0) { matched = opt.v; break; }
          }
          if (matched) {
            tSel.value = matched;
          } else {
            tSel.value = 'exact';
            if (hSel) hSel.value = String(input.hour || 0);
            if (miSel) miSel.value = String(input.minute || 0);
            if (exact) exact.hidden = false;
          }
        }
        state.timeMode = tSel.value;
      }
    }

    return { read: read, set: set, root: root };
  }

  var forms = {};
  function initAllForms() {
    $$('.birth-form').forEach(function (root) {
      var key = root.getAttribute('data-form');
      var def = { gender: (key === 'you') ? 'm' : 'f' };
      forms[key] = initBirthForm(root, def);
    });
  }

  /* =====================================================
     3. 공통 렌더 도우미
     ===================================================== */
  function elBadge(el) {
    return S.EL_KO[el].replace('(', ' ').replace(')', '') ;
  }
  function elClass(el) { return 'el-' + el; }

  function yinYang(stem) { return S.STEM_YANG[stem] ? '양' : '음'; }

  function pillarColumn(label, stem, branch, opts) {
    opts = opts || {};
    if (stem === null) {
      return '<div class="wcol wcol-empty">' +
        '<div class="wcol-label">' + label + '</div>' +
        '<span class="wchar">—</span>' +
        '<span class="wchar-ko">시간 모름</span>' +
        '<span class="wbadge">시주 없이 계산</span>' +
        '</div>';
    }
    var sEl = S.STEM_EL[stem], bEl = S.BR_EL[branch];
    var jj = S.JIJANGAN[branch].map(function (i) { return S.STEM_HAN[i]; }).join(' ');
    return '<div class="wcol' + (opts.day ? ' is-day' : '') + '">' +
      '<div class="wcol-label">' + label + '</div>' +
      '<span class="wchar ' + elClass(sEl) + '">' + S.STEM_HAN[stem] + '</span>' +
      '<span class="wchar-ko">' + S.STEM_KO[stem] + '</span>' +
      '<span class="wbadge">' + S.EL_SHORT[sEl] + '·' + yinYang(stem) + '</span>' +
      '<span class="wss">' + (opts.day ? '일간' : (opts.ssStem || '')) + '</span>' +
      '<div class="wdiv"></div>' +
      '<span class="wchar ' + elClass(bEl) + '">' + S.BR_HAN[branch] + '</span>' +
      '<span class="wchar-ko">' + S.BR_KO[branch] + '</span>' +
      '<span class="wbadge">' + S.EL_SHORT[bEl] + '·' + (branch % 2 === 0 ? '양' : '음') + '</span>' +
      '<span class="wss">' + (opts.ssBranch || '') + '</span>' +
      '<div class="wjj">' + jj + '</div>' +
      '</div>';
  }

  function elPercents(counts, total) {
    if (!total) return [0, 0, 0, 0, 0];
    var raw = counts.map(function (c) { return c / total * 100; });
    var base = raw.map(function (v) { return Math.floor(v); });
    var rest = 100 - base.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (v, i) { return { i: i, frac: v - Math.floor(v) }; })
      .sort(function (a, b) { return b.frac - a.frac; });
    for (var k = 0; k < rest && k < order.length; k++) base[order[k].i] += 1;
    return base;
  }

  function elBars(counts, total) {
    var pct = elPercents(counts, total);
    var html = '<div class="el-bars">';
    for (var e = 0; e < 5; e++) {
      html += '<div class="el-bar-row">' +
        '<div class="el-bar-name">' + S.EL_SHORT[e] + '<span>' + S.EL_HAN[e] + '</span></div>' +
        '<div class="el-bar-track"><div class="el-bar-fill el-fill-' + e + '" data-w="' + pct[e] + '"></div></div>' +
        '<div class="el-bar-val">' + counts[e] + '개 · ' + pct[e] + '%</div>' +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  function animateBars(scope) {
    setTimeout(function () {
      $$('.el-bar-fill', scope).forEach(function (b) {
        b.style.width = (b.getAttribute('data-w') || 0) + '%';
      });
    }, 60);
  }

  function shareRow(params) {
    return '<div class="share-row">' +
      '<span class="share-label">공유</span>' +
      '<button type="button" class="share-btn kakao" data-share="kakao">카카오톡</button>' +
      '<button type="button" class="share-btn x" data-share="x">X</button>' +
      '<button type="button" class="share-btn" data-share="copy">링크 복사</button>' +
      '</div>';
  }

  function fmtInputLine(input) {
    var calTxt = input.cal === 'lunar' ? ('음력' + (input.leap ? ' 윤달' : '')) : '양력';
    var genTxt = input.gender === 'm' ? '남성' : '여성';
    var timeTxt = input.timeKnown ? (pad(input.hour) + ':' + pad(input.minute)) : '시간 모름';
    return calTxt + ' ' + input.y + '.' + pad(input.m) + '.' + pad(input.d) + ' · ' + genTxt + ' · ' + timeTxt;
  }

  /* =====================================================
     4. 사주 결과
     ===================================================== */
  function genderLabel(g) { return g === 'm' ? '남성' : '여성'; }

  function renderSaju(p, an, input) {
    var dayStem = p.day.stem;
    var stem = D.stems[dayStem];
    var ilju = D.ilju[p.ganji.day] || { kw: '', text: '' };

    var lunarLine = '';
    if (p.lunar) {
      lunarLine = (input.cal === 'lunar')
        ? '양력 ' + p.solar.y + '.' + pad(p.solar.m) + '.' + pad(p.solar.d) + ' 로 계산'
        : '음력 ' + p.lunar.y + '.' + pad(p.lunar.m) + '.' + pad(p.lunar.d) + (p.lunar.leap ? ' (윤달)' : '');
    }

    var html = '';

    /* 헤드 */
    html += '<header class="res-head">' +
      '<p class="eyebrow">사주팔자 원국</p>' +
      '<h2 class="res-title">' + p.ganji.year + '년 · ' + p.ganji.month + '월 · ' + p.ganji.day + '일' +
      (p.ganji.hour ? ' · ' + p.ganji.hour + '시' : '') + '</h2>' +
      '<p class="res-sub">' + esc(fmtInputLine(input)) + ' · ' + esc(lunarLine) + '</p>' +
      '<p class="res-sub" style="margin-top:4px">입춘 기준 ' + p.sajuYear + '년생 · ' + esc(p.monthTerm) + ' 이후 출생으로 ' +
      S.BR_KO[p.month.branch] + '월에 놓였습니다 · 절입 ' + esc(S.fmtKST(p.solarTermTime)) + ' KST</p>' +
      (p.clockShift ? '<p class="res-sub" style="margin-top:4px">출생 당시 시계를 지금의 표준시(KST)로 보정했습니다 — ' +
        (p.clockShift > 0 ? '+' : '') + p.clockShift + '분 (' + pad(p.effective.hour) + ':' + pad(p.effective.minute) + ' 기준)</p>' : '') +
      '<p class="res-lead">' + esc(stem.short) + '의 기운을 타고난 <b>' + S.STEM_KO[dayStem] + '</b> 일간입니다. ' +
      (p.ganji.hour ? '여덟 글자가 모두 모였습니다.' : '태어난 시간을 몰라 여덟 글자 중 여섯 글자로 읽었습니다. 시간을 넣으면 시주까지 세울 수 있습니다.') +
      '</p>' +
      '</header>';

    /* 원국표 */
    html += '<section class="card">' +
      '<h3 class="sec-title">원국표 <small>四柱八字 · 년·월·일·시</small></h3>' +
      '<div class="wonguk">' +
      pillarColumn('시주 時', p.hour2 ? p.hour2.stem : null, p.hour2 ? p.hour2.branch : null, { ssStem: an.sipsung['시'].stem, ssBranch: an.sipsung['시'].branch }) +
      pillarColumn('일주 日', p.day.stem, p.day.branch, { day: true, ssBranch: an.sipsung['일'].branch }) +
      pillarColumn('월주 月', p.month.stem, p.month.branch, { ssStem: an.sipsung['월'].stem, ssBranch: an.sipsung['월'].branch }) +
      pillarColumn('년주 年', p.year.stem, p.year.branch, { ssStem: an.sipsung['년'].stem, ssBranch: an.sipsung['년'].branch }) +
      '</div>' +
      '<div class="wonguk-meta">' +
      '<span>일간 <b>' + S.STEM_HAN[dayStem] + ' ' + S.STEM_KO[dayStem] + '</b> · ' + S.EL_KO[S.STEM_EL[dayStem]] + '</span>' +
      '<span>60갑자 <b>' + p.ganji.day + '</b> (' + (p.dayIndex + 1) + '번째)</span>' +
      '<span>띠 <b>' + S.BR_ANIMAL[p.year.branch] + '</b></span>' +
      (p.hour2 ? '<span>시지 <b>' + S.BR_KO[p.hour2.branch] + '</b> (' + S.BR_TIME[p.hour2.branch] + ')</span>' : '') +
      '</div>' +
      '</section>';

    /* 오행 */
    var lackIdx = [], manyIdx = [];
    for (var e = 0; e < 5; e++) {
      if (an.counts[e] === 0) lackIdx.push(e);
      else if (an.counts[e] >= 3) manyIdx.push(e);
    }
    var elText = '';
    if (manyIdx.length) {
      manyIdx.forEach(function (i) { elText += '<p class="para">' + esc(D.elements[i].plenty) + '</p>'; });
    }
    if (lackIdx.length) {
      lackIdx.forEach(function (i) {
        elText += '<p class="para">' + esc(D.elements[i].none) + '</p>';
      });
    }
    if (!manyIdx.length && !lackIdx.length) {
      elText = '<p class="para">다섯 기운이 비교적 고르게 섞여 있습니다. 큰 치우침이 없다는 것은 흔들림이 적다는 뜻이고, 그만큼 결정의 동력도 크지 않다는 뜻입니다. 가장 적은 기운을 의식적으로 채워 주세요.</p>';
    }

    html += '<section class="card">' +
      '<h3 class="sec-title">오행 밸런스 <small>木 · 火 · 土 · 金 · 水</small></h3>' +
      elBars(an.counts, an.total) +
      '<div class="el-summary">' +
      '<div class="el-chip"><b>가장 강한 기운</b><span>' + S.EL_KO[strongest(an.counts)] + ' · ' + esc(D.elements[strongest(an.counts)].kw) + '</span></div>' +
      '<div class="el-chip"><b>가장 약한 기운</b><span>' + S.EL_KO[weakest(an.counts)] + ' · ' + esc(D.elements[weakest(an.counts)].kw) + '</span></div>' +
      '<div class="el-chip"><b>용신(간이)</b><span>' + S.EL_KO[an.yongsin] + '</span></div>' +
      '</div>' +
      '<div style="margin-top:16px">' + elText + '</div>' +
      '</section>';

    /* 일간 */
    html += '<section class="card">' +
      '<h3 class="sec-title">일간 ' + S.STEM_HAN[dayStem] + ' ' + S.STEM_KO[dayStem] + ' <small>' + esc(stem.img) + '</small></h3>' +
      '<div class="tag-row">' + stem.kw.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div>' +
      '<div style="margin-top:14px">' + stem.personality.map(function (t) { return '<p class="para">' + esc(t) + '</p>'; }).join('') + '</div>' +
      '</section>';

    /* 일주 */
    if (ilju.text) {
      html += '<section class="card">' +
        '<h3 class="sec-title">일주 ' + p.ganji.day + ' <small>' + esc(ilju.kw) + '</small></h3>' +
        '<p class="para">' + esc(ilju.text) + '</p>' +
        '</section>';
    }

    /* 신강·신약 */
    var dotPos = Math.max(6, Math.min(94, Math.round(an.strengthRatio * 100)));
    html += '<section class="card">' +
      '<h3 class="sec-title">신강 · 신약과 용신 <small>억부(抑扶) 관점의 간이 해석</small></h3>' +
      '<div class="stat-row">' +
      '<div class="stat"><b>' + an.strength + '</b><span>일간의 힘</span></div>' +
      '<div class="stat"><b>' + Math.round(an.strengthRatio * 100) + '%</b><span>비겁·인성 비중</span></div>' +
      '<div class="stat"><b>' + S.EL_KO[an.yongsin] + '</b><span>용신(簡)</span></div>' +
      '<div class="stat"><b>' + S.EL_KO[an.huisin] + '</b><span>희신(簡)</span></div>' +
      '</div>' +
      '<div class="gauge"><span class="gauge-dot" style="left:' + dotPos + '%"></span></div>' +
      '<div class="gauge-labels"><span>신약</span><span>중화</span><span>신강</span></div>' +
      '<p class="para" style="margin-top:14px">' + esc(an.yongsinWhy) + '</p>' +
      '<p class="para">이 사주의 용신은 <b>' + S.EL_KO[an.yongsin] + '</b>, 희신은 <b>' + S.EL_KO[an.huisin] + '</b>입니다. ' +
      '용신은 부족한 것을 채우는 기운이므로, 생활에서 그 기운을 가까이 두면 마음이 덜 흔들립니다. ' + elLife(an.yongsin) + '</p>' +
      '<p class="tiny">용신은 유파에 따라 해석이 갈립니다. 여기서는 월령과 오행 분포를 바탕으로 한 간이 판단을 보여 드립니다.</p>' +
      '</section>';

    /* 십성 */
    var groupRows = ['비겁', '식상', '재성', '관성', '인성'].map(function (g) {
      return '<div class="stat"><b>' + Math.round(an.groups[g] * 10) / 10 + '</b><span>' + g + '</span></div>';
    }).join('');

    var topGroup = ['비겁', '식상', '재성', '관성', '인성'].sort(function (a, b) { return an.groups[b] - an.groups[a]; })[0];
    var topGodName = { '비겁': '비견·겁재', '식상': '식신·상관', '재성': '편재·정재', '관성': '편관·정관', '인성': '편인·정인' }[topGroup];

    html += '<section class="card">' +
      '<h3 class="sec-title">십성의 분포 <small>十星 · 나와 세상이 만나는 방식</small></h3>' +
      '<div class="stat-row">' + groupRows + '</div>' +
      '<p class="para">가장 강한 자리는 <b>' + topGroup + '(' + topGodName + ')</b>입니다. ' +
      '이 기운이 당신의 삶에서 가장 자주 쓰이는 도구이고, 동시에 가장 쉽게 지치는 지점이기도 합니다.</p>' +
      '<ul class="bullet">' +
      an.sipsungList.filter(function (x) { return x.count > 0; }).slice(0, 3).map(function (x) {
        var g = D.tenGods[x.idx];
        return '<li><b>' + g.name + '</b> — ' + esc(g.kw) + '. ' + esc(g.work) + '</li>';
      }).join('') +
      '</ul>' +
      '</section>';

    /* 재물·직업·대인 */
    var moneyTier = Math.min(3, Math.round(an.groups['재성']));
    var jobKey = pickJobKey(an.groups);
    var socialTier = an.groups['비겁'] >= 2.6 ? 2 : (an.groups['비겁'] >= 1.2 ? 1 : 0);

    html += '<section class="card">' +
      '<h3 class="sec-title">타고난 재물 · 직업 · 대인운</h3>' +
      '<p class="para"><b>재물</b> — ' + esc(D.fortune.money[moneyTier]) + '</p>' +
      '<p class="para"><b>직업</b> — ' + esc(D.fortune.job[jobKey]) + '</p>' +
      '<p class="para"><b>대인</b> — ' + esc(D.fortune.social[socialTier]) + '</p>' +
      (an.sinsal.length ? '<div class="tag-row">' + an.sinsal.map(function (s) { return '<span class="tag">' + esc(s.name) + '</span>'; }).join('') + '</div>' : '') +
      an.sinsal.map(function (s) {
        var t = D.sinsal[s.key];
        return '<p class="para" style="margin-top:10px"><b>' + esc(t.name) + '</b> — ' + esc(t.good) + ' ' + esc(t.warn) + '</p>';
      }).join('') +
      '</section>';

    /* 2026 · 2027 */
    html += renderSeun(dayStem, p.day.branch, an);

    /* 공유 */
    html += '<div class="card"><h3 class="sec-title">이 사주를 남겨 두기</h3>' +
      '<p class="para">링크를 저장하면 같은 사주를 다시 열 수 있습니다. 생년월일이 주소에 담기므로, 공유는 원하는 사람에게만 하세요.</p>' +
      shareRow() + '</div>';

    return html;
  }

  function elLife(el) {
    return [
      '목의 기운은 배움과 성장, 초록빛과 아침 시간입니다.',
      '화의 기운은 표현과 사람, 따뜻한 빛과 한낮입니다.',
      '토의 기운은 안정과 신뢰, 흙빛과 규칙적인 생활입니다.',
      '금의 기운은 정리와 결단, 흰빛과 정돈된 공간입니다.',
      '수의 기운은 사유와 휴식, 푸른빛과 밤의 시간입니다.'
    ][el];
  }

  function strongest(c) { var m = 0; for (var i = 1; i < 5; i++) if (c[i] > c[m]) m = i; return m; }
  function weakest(c) { var m = 0; for (var i = 1; i < 5; i++) if (c[i] < c[m]) m = i; return m; }

  function pickJobKey(g) {
    var cands = [
      { k: '관강', v: g['관성'] },
      { k: '식강', v: g['식상'] },
      { k: '인강', v: g['인성'] },
      { k: '비강', v: g['비겁'] }
    ].sort(function (a, b) { return b.v - a.v; });
    if (g['관성'] < 1.2) return '관약';
    return cands[0].k;
  }

  function renderSeun(dayStem, dayBranch, an) {
    var out = '<section class="card"><h3 class="sec-title">2026 · 2027년의 흐름 <small>세운(歲運)</small></h3>';
    [2026, 2027].forEach(function (year) {
      var su = S.seun(year);
      var data = D.seun[year];
      var godIdx = S.tenGod(dayStem, su.stem);
      var god = S.SIPSUNG[godIdx];
      var rel = an.rel(dayBranch, su.branch);
      var relTxt = '';
      if (rel.indexOf('육합') >= 0) relTxt = '일지와 육합을 이루는 해라 마음의 자리가 열립니다.';
      else if (rel.indexOf('충') >= 0) relTxt = '일지와 충을 이루는 해라 흔들림이 큽니다. 미뤄 둔 결말이 정리되는 시기입니다.';
      else if (rel.indexOf('형') >= 0) relTxt = '일지와 형이 드는 해라 관계의 매듭이 꼬일 수 있습니다.';
      else if (rel.indexOf('파') >= 0 || rel.indexOf('해') >= 0) relTxt = '일지와 파·해가 드는 해라 작은 오해가 커지기 쉽습니다.';

      out += '<div style="margin-bottom:20px">' +
        '<h4 style="font-size:15.5px;color:var(--gold-soft);margin:0 0 8px">' + year + '년 ' + data.ganji + ' · ' + esc(data.head) + '</h4>' +
        '<p class="para">' + esc(data.body[0]) + '</p>' +
        '<p class="para"><b>' + god + '의 해</b> — ' + esc(data.bySipsung[god]) + '</p>' +
        (relTxt ? '<p class="para">' + esc(relTxt) + '</p>' : '') +
        '</div>';
    });
    out += '<p class="para"><b>관계</b> — ' + esc(D.seun[2026].love) + ' ' + esc(D.seun[2027].love) + '</p>' +
      '<p class="para"><b>재물</b> — ' + esc(D.seun[2026].money) + ' ' + esc(D.seun[2027].money) + '</p>' +
      '<p class="para"><b>건강</b> — ' + esc(D.seun[2026].health) + ' ' + esc(D.seun[2027].health) + '</p>' +
      '</section>';
    return out;
  }

  /* =====================================================
     5. 이별·치유 결과
     ===================================================== */
  function renderBreakup(p, an, input, when) {
    var dayStem = p.day.stem;
    var stem = D.stems[dayStem];
    var B = D.breakup;
    var html = '';

    var whenKey = when && B.when[when] ? when : null;

    html += '<header class="res-head">' +
      '<p class="eyebrow">이별 · 상처 치유 사주</p>' +
      '<h2 class="res-title">' + p.ganji.day + '일 · ' + S.STEM_KO[dayStem] + ' 일간의 마음</h2>' +
      '<p class="res-sub">' + esc(fmtInputLine(input)) + (whenKey ? ' · 이별 후 ' + esc(B.when[whenKey].label) : '') + '</p>' +
      '<p class="res-lead">' + esc(B.intro) + '</p>' +
      '</header>';

    if (whenKey) {
      html += '<section class="card"><h3 class="sec-title">지금, 이 시기의 마음</h3>' +
        '<p class="para">' + esc(B.when[whenKey].text) + '</p></section>';
    }

    /* 1. 이별을 견디는 방식 */
    html += '<section class="card"><h3 class="sec-title">당신이 이별을 견디는 방식 <small>' + S.STEM_HAN[dayStem] + ' 일간</small></h3>' +
      stem.breakup.map(function (t) { return '<p class="para">' + esc(t) + '</p>'; }).join('') +
      '<p class="para">연애할 때의 모습도 함께 보면 이해가 깊어집니다. ' + esc(stem.love[0]) + '</p>' +
      '</section>';

    /* 2. 매달리는 패턴 */
    var topGroup = ['비겁', '식상', '재성', '관성', '인성'].sort(function (a, b) { return an.groups[b] - an.groups[a]; })[0];
    html += '<section class="card"><h3 class="sec-title">내가 매달리게 되는 사주적 이유 <small>' + topGroup + '의 기운</small></h3>' +
      B.patterns[topGroup].map(function (t) { return '<p class="para">' + esc(t) + '</p>'; }).join('') +
      '<p class="para">원국을 보면 ' +
      ['비겁', '식상', '재성', '관성', '인성'].map(function (g) {
        return g + ' ' + Math.round(an.groups[g] * 10) / 10 + '개';
      }).join(', ') + '입니다. 가장 강한 기운이 ' + topGroup + '이라는 것은, 관계에서도 그 방식으로 확인을 받으려 한다는 뜻입니다.</p>' +
      '</section>';

    /* 3. 신살 */
    var sinsalKeys = an.sinsal.map(function (s) { return s.key; }).filter(function (k) { return B.sinsalLove[k]; });
    if (sinsalKeys.length) {
      html += '<section class="card"><h3 class="sec-title">사랑의 신살 <small>인연의 결</small></h3>' +
        sinsalKeys.map(function (k) {
          return '<p class="para"><b>' + esc(D.sinsal[k].name) + '</b> — ' + esc(B.sinsalLove[k]) + '</p>';
        }).join('') +
        '</section>';
    }

    /* 4. 일지 · 배우자궁 */
    var db = p.day.branch;
    var dbEl = S.BR_EL[db];
    var dbGod = S.SIPSUNG[S.tenGod(dayStem, S.JIJANGAN[db][S.JIJANGAN[db].length - 1])];
    var relMonth = an.rel(db, p.month.branch);
    var relYear = an.rel(db, p.year.branch);
    var relNote = '';
    if (relMonth.indexOf('충') >= 0) relNote += '일지가 월지와 충을 이루고 있습니다. 마음의 자리와 생활의 자리가 자주 부딪히는 구조라, 관계에서 현실적인 조건 때문에 흔들린 경험이 있을 것입니다. ';
    if (relMonth.indexOf('육합') >= 0) relNote += '일지가 월지와 합을 이루고 있어, 마음이 가는 사람과 생활이 자연스럽게 이어지는 편입니다. ';
    if (relYear.indexOf('충') >= 0) relNote += '일지가 년지와 충을 이루고 있어, 가족이나 오래된 환경의 영향이 관계에 개입하기 쉽습니다. ';
    if (!relNote) relNote = '일지가 주변 지지와 크게 부딪히지 않아, 관계에서 큰 외부 변수보다 두 사람의 내면이 더 중요하게 작용합니다. ';

    html += '<section class="card"><h3 class="sec-title">인연의 결 — 배우자궁 <small>일지 ' + S.BR_HAN[db] + ' · ' + S.EL_KO[dbEl] + '</small></h3>' +
      '<p class="para">일지 ' + S.BR_HAN[db] + '(' + S.BR_KO[db] + ') — ‘' + esc(S.BR_MEAN[db]) + '’을 닮은 자리이고, 십성으로는 <b>' + dbGod + '</b>에 해당합니다. ' +
      '배우자궁에 ' + dbGod + '이 놓였다는 것은, 인연이 그 성질을 통해 들어온다는 뜻입니다. ' + esc(D.tenGods[S.tenGod(dayStem, S.JIJANGAN[db][S.JIJANGAN[db].length - 1])].love) + '</p>' +
      '<p class="para">' + esc(relNote) + '</p>' +
      '</section>';

    /* 5. 재회운 */
    var s26 = S.seun(2026), s27 = S.seun(2027);
    var r26 = an.rel(db, s26.branch), r27 = an.rel(db, s27.branch);
    var t26 = relKey(r26, s26.branch, db), t27 = relKey(r27, s27.branch, db);

    html += '<section class="card"><h3 class="sec-title">재회운 — 2026 · 2027 <small>세운이 일지를 건드리는 해</small></h3>' +
      '<p class="para"><b>2026년 병오년</b> — ' + esc(B.timing[t26]) + '</p>' +
      '<p class="para"><b>2027년 정미년</b> — ' + esc(B.timing[t27]) + '</p>' +
      '<p class="para">재회는 상대의 마음과 타이밍이 함께 맞아야 성립합니다. 사주가 알려 주는 것은 "그 해에 마음의 문이 열리기 쉽다"는 정도이고, 그 문을 두드릴지는 당신의 몫입니다. ' +
      '먼저 연락하고 싶은 마음이 든다면, 그 마음이 그리움인지 확인 욕구인지 스스로에게 먼저 물어보세요.</p>' +
      '<p class="tiny">※ 상대의 생년월일을 넣으면 궁합 메뉴에서 두 사람의 일지 관계까지 함께 볼 수 있습니다.</p>' +
      '</section>';

    /* 6. 다음 인연 */
    var next = nextLoveWindow(db, dayStem);
    html += '<section class="card"><h3 class="sec-title">다음 인연이 들어오는 시기 <small>일지와 세운의 합 · 도화</small></h3>' +
      '<p class="para">' + esc(next.text) + '</p>' +
      '<p class="para">시기는 사주가 정해 주는 것이 아니라, 준비된 사람에게 문이 열리는 때입니다. 그때까지 해야 할 일은 딱 하나, 이별 이전의 나로 돌아가는 것이 아니라 이별을 지나온 나로 서는 것입니다.</p>' +
      '</section>';

    /* 7. 처방전 */
    var lackEl = weakest(an.counts);
    var pres = B.prescribe.slice(0, 4);
    html += '<section class="card"><h3 class="sec-title">마음 처방전 <small>당신의 사주에 맞춘 다섯 가지</small></h3>' +
      '<ul class="bullet">' +
      '<li><b>' + S.EL_KO[lackEl] + ' 보충</b> — ' + esc(B.lackLove[S.EL_SHORT[lackEl]]) + '</li>' +
      pres.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      '</ul>' +
      '<div class="quote">지금 당신에게 필요한 것은 더 잘 견디는 방법이 아니라, 아파도 괜찮다는 허락입니다.</div>' +
      '</section>';

    html += '<div class="card"><h3 class="sec-title">이 사주를 남겨 두기</h3>' + shareRow() + '</div>';

    html += '<div class="card" style="text-align:center">' +
      '<h3 class="sec-title" style="justify-content:center">더 깊이 읽고 싶다면</h3>' +
      '<p class="para">지금의 이별과 다음 인연을 한 사람이 직접 읽어 드리는 1:1 정밀 감정서가 있습니다.</p>' +
      '<p><button type="button" class="btn btn-primary" data-goto="premium">1:1 정밀 감정 보기 · ₩19,900</button></p>' +
      '</div>';

    return html;
  }

  function relKey(relArr, seunBranch, dayBranch) {
    if (relArr.indexOf('육합') >= 0) return '합';
    for (var i = 0; i < S.SAMHAP.length; i++) {
      var g = S.SAMHAP[i];
      if (dayBranch !== undefined && g.indexOf(dayBranch) >= 0 && g.indexOf(seunBranch) >= 0 && dayBranch !== seunBranch) return '합';
    }
    var DOHWA = { 4: 9, 0: 9, 8: 9, 2: 3, 6: 3, 10: 3, 5: 6, 9: 6, 1: 6, 11: 0, 3: 0, 7: 0 };
    if (seunBranch !== undefined && DOHWA[dayBranch] === seunBranch) return '도화';
    if (relArr.indexOf('충') >= 0) return '충';
    if (relArr.indexOf('형') >= 0) return '형';
    if (relArr.indexOf('파') >= 0) return '파';
    if (relArr.indexOf('해') >= 0) return '해';
    return '무';
  }

  function nextLoveWindow(dayBranch, dayStem) {
    var best = null;
    for (var y = 2026; y <= 2031; y++) {
      var su = S.seun(y);
      var score = 0;
      var rel = [];
      // 일지와 세운 지지
      if (pairIn(S.YUKHAP, dayBranch, su.branch)) { score += 3; rel.push('육합'); }
      if (pairIn(S.CHUNG, dayBranch, su.branch)) { score += 1; rel.push('충'); }
      // 도화
      var DOHWA = { 4: 9, 0: 9, 8: 9, 2: 3, 6: 3, 10: 3, 5: 6, 9: 6, 1: 6, 11: 0, 3: 0, 7: 0 };
      if (su.branch === DOHWA[dayBranch]) { score += 2; rel.push('도화'); }
      // 삼합
      for (var i = 0; i < S.SAMHAP.length; i++) {
        var g = S.SAMHAP[i];
        if (g.indexOf(dayBranch) >= 0 && g.indexOf(su.branch) >= 0 && dayBranch !== su.branch) { score += 2; rel.push('삼합'); }
      }
      if (!best || score > best.score) best = { y: y, score: score, rel: rel, branch: su.branch };
    }
    if (best.score < 2) {
      return { text: '가까운 몇 해 안에 일지를 강하게 건드리는 세운이 보이지 않습니다. 이 사주는 시간을 두고 천천히 인연이 쌓이는 구조입니다. 서두르지 않아도 괜찮습니다.' };
    }
    var monthNum = ((best.branch - 2 + 12) % 12) + 2;
    if (monthNum > 12) monthNum -= 12;
    var season = monthNum <= 2 ? '겨울 끝' : monthNum <= 5 ? '봄' : monthNum <= 8 ? '여름' : monthNum <= 11 ? '가을' : '겨울';
    var relTxt = best.rel.length ? best.rel.join('·') : '합';
    return {
      text: best.y + '년(' + S.seun(best.y).ganji + ')이 ' + relTxt + '의 기운으로 일지를 건드립니다. 그해 ' + season + ', ' + monthNum + '월 무렵에 새로운 인연이 문을 두드리기 쉬운 창입니다. ' +
        '다만 그 사람이 들어오는 것보다 중요한 것은, 그때의 당신이 누군가를 받아들일 수 있는 상태인가입니다.'
    };
  }

  function pairIn(list, a, b) {
    for (var i = 0; i < list.length; i++) {
      if ((list[i][0] === a && list[i][1] === b) || (list[i][0] === b && list[i][1] === a)) return true;
    }
    return false;
  }

  /* =====================================================
     6. 궁합 결과
     ===================================================== */
  var REL_TEXT = {
    육합: { title: '육합(六合)', good: '서로를 편안하게 만드는 결합입니다. 말하지 않아도 통하는 부분이 있고, 함께 있으면 마음이 놓입니다.' },
    삼합: { title: '삼합(三合)', good: '같은 방향을 향하는 인연입니다. 목표나 취향이 자연스럽게 겹칩니다.' },
    충: { title: '충(沖)', good: '부딪히는 힘이 큰 자리입니다. 끌림도 강하지만, 서로의 방식이 정반대라 마찰이 잦습니다.' },
    형: { title: '형(刑)', good: '서로를 예민하게 자극하는 자리입니다. 가까울수록 말이 날카로워집니다.' },
    파: { title: '파(破)', good: '작은 틈이 쌓여 관계를 흔드는 자리입니다. 사소한 오해를 오래 두면 금이 갑니다.' },
    해: { title: '해(害)', good: '은근한 서운함이 쌓이는 자리입니다. 겉으로는 괜찮아도 속에서 감정이 삭습니다.' },
    자형: { title: '자형(自刑)', good: '스스로를 옥죄는 자리입니다. 상대보다 자기 안에서 결론을 내리고 혼자 아파합니다.' }
  };

  function renderCompat(cp, inA, inB) {
    var A = cp.a, B = cp.b, ra = cp.ra, rb = cp.rb;
    var stemA = D.stems[A.day.stem], stemB = D.stems[B.day.stem];
    var scoreDesc = cp.score >= 85 ? '아주 좋은 결입니다. 서로의 부족함을 채우는 구조가 뚜렷합니다.'
      : cp.score >= 72 ? '좋은 결입니다. 큰 틀에서 방향이 맞고, 갈등도 조율할 수 있는 범위입니다.'
      : cp.score >= 60 ? '무난한 결입니다. 노력에 따라 깊어지고, 방치하면 서운함이 쌓이는 구조입니다.'
      : cp.score >= 48 ? '어긋남이 있는 결입니다. 끌림은 있지만 같은 자리에서 반복해서 부딪힙니다.'
      : '많이 다른 결입니다. 감정만으로 오래 가기 어렵고, 서로의 다름을 규칙으로 정리해야 합니다.';

    var html = '';
    html += '<header class="res-head">' +
      '<p class="eyebrow">연애 · 궁합</p>' +
      '<h2 class="res-title">' + A.ganji.day + '일 × ' + B.ganji.day + '일</h2>' +
      '<p class="res-sub">나 ' + esc(fmtInputLine(inA)) + ' · 상대 ' + esc(fmtInputLine(inB)) + '</p>' +
      '<p class="res-lead">' + esc(D.compat.intro) + '</p>' +
      '</header>';

    /* 점수 + 요약 */
    html += '<section class="card">' +
      '<div class="compat-top">' +
      '<div class="score-box"><div class="score-num">' + cp.score + '<small>점</small></div>' +
      '<div class="score-cap">궁합 지수</div>' +
      '<p class="score-desc">' + esc(scoreDesc) + '</p></div>' +
      '<div class="duo">' +
      '<div class="duo-card"><div class="who">나</div><div class="gz">' + A.ganji.day + '</div><div class="sub">' + S.STEM_KO[A.day.stem] + ' 일간 · ' + esc(stemA.img) + '</div></div>' +
      '<div class="duo-heart">♥</div>' +
      '<div class="duo-card"><div class="who">상대</div><div class="gz">' + B.ganji.day + '</div><div class="sub">' + S.STEM_KO[B.day.stem] + ' 일간 · ' + esc(stemB.img) + '</div></div>' +
      '</div>' +
      '</div>' +
      '<div class="tag-row">' +
      cp.rels.map(function (r) {
        return r.types.map(function (t) {
          return '<span class="tag' + (['충', '형', '파', '해', '자형'].indexOf(t) >= 0 ? ' warn' : '') + '">' + esc(r.label) + ' ' + t + '</span>';
        }).join('');
      }).join('') +
      (cp.samhap ? '<span class="tag">삼합 ' + S.EL_SHORT[cp.samhap[3]] + '</span>' : '') +
      '</div>' +
      '</section>';

    /* 겉궁합 */
    var outer = cp.rels.map(function (r) {
      if (!r.types.length) {
        return '<p class="para"><b>' + esc(r.label) + '</b> — 특별한 합이나 충이 없습니다. 무던한 자리이고, 그만큼 두 사람이 만드는 노력이 결과를 좌우합니다.</p>';
      }
      return r.types.map(function (t) {
        var info = REL_TEXT[t];
        if (!info) return '';
        return '<p class="para"><b>' + esc(r.label) + ' ' + info.title + '</b> — ' + esc(info.good) + '</p>';
      }).join('');
    }).join('');

    html += '<section class="card"><h3 class="sec-title">겉궁합 <small>띠와 일지의 합 · 충 · 형 · 파 · 해</small></h3>' +
      '<div class="stat-row">' +
      '<div class="stat"><b>' + S.BR_ANIMAL[A.year.branch] + '띠</b><span>나</span></div>' +
      '<div class="stat"><b>' + S.BR_ANIMAL[B.year.branch] + '띠</b><span>상대</span></div>' +
      '<div class="stat"><b>' + A.ganji.day + ' · ' + B.ganji.day + '</b><span>일주</span></div>' +
      '</div>' +
      outer +
      '<p class="para">띠로 보는 궁합은 두 사람이 세상과 부딪히는 방식의 차이이고, 일지로 보는 궁합은 두 사람이 한집에 살 때의 결입니다. ' +
      '일지가 편한 사이라면 오래 함께 있어도 피로가 적고, 일지가 부딪히는 사이라면 애정과 별개로 생활의 규칙을 정해 두어야 합니다.</p>' +
      '</section>';

    /* 속궁합 */
    var pairKey = cp.elemPair[0] + '-' + cp.elemPair[1];
    if (!D.compat.elementPair[pairKey]) pairKey = D.compat.elementPairRev[pairKey] || '0-0';
    var ep = D.compat.elementPair[pairKey];
    var stemRelTxt = cp.stemRel === '상생' ? '두 일간이 서로를 살리는 상생의 관계입니다. 한쪽이 다른 쪽의 부족함을 자연스럽게 채워 줍니다.'
      : cp.stemRel === '상극' ? '두 일간이 서로를 누르는 상극의 관계입니다. 끌림이 강한 대신, 같은 자리에서 반복해서 부딪힙니다.'
      : '두 일간이 같은 오행입니다. 이해가 빠르지만, 서로의 부족함도 똑같아서 같이 흔들리는 순간이 있습니다.';

    html += '<section class="card"><h3 class="sec-title">속궁합 <small>오행의 보완과 일간의 관계</small></h3>' +
      '<p class="para"><b>' + esc(ep.t) + '</b> — ' + esc(ep.good) + '</p>' +
      '<p class="para">' + esc(stemRelTxt) + '</p>' +
      '<p class="para">' + esc(ep.bad) + '</p>' +
      '<p class="para">오행을 견주어 보면, 서로가 비어 있는 기운을 채워 주는 지점이 ' + cp.cover + '곳입니다. ' +
      (cp.cover >= 3 ? '상대에게서 내게 없는 것을 얻는 구조라, 함께할수록 삶이 채워지는 느낌이 듭니다.'
        : cp.cover >= 1 ? '한두 곳에서 서로를 보완합니다. 그 지점을 의식적으로 활용하면 관계가 안정됩니다.'
        : '서로의 빈 곳이 겹칩니다. 같은 부분에서 함께 흔들릴 수 있으니, 그 기운을 생활 속에서 따로 채워 주세요.') + '</p>' +
      '</section>';

    /* 연락 패턴 */
    html += '<section class="card"><h3 class="sec-title">연락과 표현의 온도 <small>일간이 말하는 방식</small></h3>' +
      '<p class="para"><b>나</b> — ' + esc(D.compat.contact[S.STEM_EL[A.day.stem]]) + '</p>' +
      '<p class="para"><b>상대</b> — ' + esc(D.compat.contact[S.STEM_EL[B.day.stem]]) + '</p>' +
      '</section>';

    /* 갈등 포인트 */
    var conflicts = [];
    if (cp.rels.some(function (r) { return r.types.indexOf('충') >= 0; })) conflicts.push('합과 충이 함께 있는 자리라, 가까워질수록 서로의 방식 차이가 크게 드러납니다. 특히 생활 습관과 시간 약속에서 부딪히기 쉽습니다.');
    if (cp.rels.some(function (r) { return r.types.indexOf('형') >= 0; })) conflicts.push('형이 드는 자리는 말의 온도가 문제입니다. 옳은 말도 상대에게는 상처로 남을 수 있습니다.');
    if (cp.rels.some(function (r) { return r.types.indexOf('파') >= 0 || r.types.indexOf('해') >= 0; })) conflicts.push('파·해는 사소한 서운함이 쌓이는 자리입니다. 그때그때 말하지 않으면 어느 날 한꺼번에 터집니다.');
    if (cp.stemRel === '상극') conflicts.push('일간이 상극이라 판단의 기준이 다릅니다. 같은 상황을 다르게 읽는다는 것을 먼저 인정해야 합니다.');
    if (!conflicts.length) conflicts.push('큰 충돌 없이 흘러가는 사주입니다. 다만 무던함이 무관심으로 보이지 않도록, 고마움을 말로 표현하는 것이 중요합니다.');

    html += '<section class="card"><h3 class="sec-title">갈등 포인트 <small>어디서 부딪히는가</small></h3>' +
      '<ul class="bullet">' + conflicts.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
      '</section>';

    /* 공략법 */
    html += '<section class="card"><h3 class="sec-title">관계 공략법 <small>이 사주 조합에 맞춘 다섯 가지</small></h3>' +
      '<ul class="bullet">' +
      D.compat.strategy.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '<li><b>나(' + S.STEM_KO[A.day.stem] + ' 일간)</b> — ' + esc(stemA.social) + '</li>' +
      '<li><b>상대(' + S.STEM_KO[B.day.stem] + ' 일간)</b> — ' + esc(stemB.social) + '</li>' +
      '</ul>' +
      '</section>';

    html += '<div class="card"><h3 class="sec-title">이 궁합을 남겨 두기</h3>' + shareRow() + '</div>';

    return html;
  }

  /* =====================================================
     7. 실행
     ===================================================== */
  var lastInput = { saju: null, breakup: null, me: null, you: null };

  function computeAndRender(mode) {
    var area, html;
    try {
      if (mode === 'saju') {
        var f = forms.saju.read();
        lastInput.saju = f;
        var p = S.pillars(f);
        if (p.error) { toast(p.error); return; }
        var an = S.analyze(p);
        html = renderSaju(p, an, f);
        area = $('#saju-result');
        trackEvent('saju_view', { calendar: f.cal, time_known: f.timeKnown ? 'yes' : 'no', day_ganji: p.ganji.day });
      } else if (mode === 'breakup') {
        var fb = forms.breakup.read();
        lastInput.breakup = fb;
        var pb = S.pillars(fb);
        if (pb.error) { toast(pb.error); return; }
        var anb = S.analyze(pb);
        var when = $('#panel-breakup .chip.is-on');
        html = renderBreakup(pb, anb, fb, when ? when.getAttribute('data-when') : null);
        area = $('#breakup-result');
        trackEvent('breakup_view', { when: when ? when.getAttribute('data-when') : 'none' });
      } else if (mode === 'compat') {
        var fa = forms.me.read(), fbb = forms.you.read();
        lastInput.me = fa; lastInput.you = fbb;
        var cp = S.compat(fa, fbb);
        if (cp.error) { toast(cp.error); return; }
        html = renderCompat(cp, fa, fbb);
        area = $('#compat-result');
        trackEvent('compat_view', { score: cp.score });
      }
    } catch (err) {
      toast('계산 중 문제가 생겼어요. 입력값을 확인해 주세요.');
      if (window.console) console.error(err);
      return;
    }
    area.innerHTML = html;
    var ad = area.parentNode.querySelector('.ad-slot');
    if (ad) ad.hidden = false;
    animateBars(area);
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =====================================================
     8. 탭
     ===================================================== */
  var TABS = ['saju', 'breakup', 'compat', 'premium'];
  function activateTab(name, opts) {
    if (TABS.indexOf(name) < 0) name = 'saju';
    $$('.tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.panel').forEach(function (p) {
      var on = p.id === 'panel-' + name;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
    if (!opts || !opts.silent) trackEvent('tab_view', { tab: name });
    if (!opts || !opts.noScroll) {
      var tabs = $('#tabs');
      if (tabs) {
        var y = tabs.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }

  function initTabs() {
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () { activateTab(t.getAttribute('data-tab')); });
    });
    $$('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        activateTab(a.getAttribute('data-jump'));
        if (window.innerWidth < 720) $('#tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { activateTab(b.getAttribute('data-goto')); });
    });
  }

  /* =====================================================
     9. 공유
     ===================================================== */
  function buildShareUrl(mode) {
    var base = location.origin + location.pathname;
    var q = ['tab=' + mode];
    function add(prefix, f) {
      if (!f) return;
      var key = prefix ? 'p' : '';
      q.push((key ? 'p' : '') + 'cal=' + f.cal);
      q.push((key ? 'p' : '') + 'birth=' + f.y + '-' + f.m + '-' + f.d);
      if (f.leap) q.push((key ? 'p' : '') + 'leap=1');
      if (f.timeKnown) q.push((key ? 'p' : '') + 'time=' + pad(f.hour) + ':' + pad(f.minute));
      if (f.clockFix === false) q.push((key ? 'p' : '') + 'clockfix=0');
      q.push((key ? 'p' : '') + 'gender=' + f.gender);
    }
    if (mode === 'breakup') {
      var wc = $('#panel-breakup .chip.is-on');
      if (wc) q.push('when=' + wc.getAttribute('data-when'));
    }
    if (mode === 'compat') {
      add('', lastInput.me);
      // 두 번째 사람은 p 접두어
      var f2 = lastInput.you;
      if (f2) {
        q.push('pcal=' + f2.cal);
        q.push('pbirth=' + f2.y + '-' + f2.m + '-' + f2.d);
        if (f2.leap) q.push('pleap=1');
        if (f2.timeKnown) q.push('ptime=' + pad(f2.hour) + ':' + pad(f2.minute));
        if (f2.clockFix === false) q.push('pclockfix=0');
        q.push('pgender=' + f2.gender);
      }
    } else {
      add('', lastInput[mode]);
    }
    return base + '?' + q.join('&');
  }

  function shareTitle(mode) {
    if (mode === 'breakup') return '이별·상처 치유 사주 · 묵월당';
    if (mode === 'compat') return '연애 궁합 · 묵월당 사주';
    return '내 사주팔자 · 묵월당';
  }

  function initShare() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-share]');
      if (!btn) return;
      var mode = $('.panel.is-active') ? $('.panel.is-active').id.replace('panel-', '') : 'saju';
      if (mode === 'premium') mode = 'saju';
      var url = buildShareUrl(mode);
      var type = btn.getAttribute('data-share');
      trackEvent('share_click', { method: type, screen: mode });

      if (type === 'copy') {
        copyText(url, '링크를 복사했어요.');
      } else if (type === 'x') {
        var text = shareTitle(mode) + ' — 여덟 글자로 읽는 나';
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
      } else if (type === 'kakao') {
        if (navigator.share) {
          navigator.share({ title: shareTitle(mode), text: '묵월당 · 여덟 글자로 읽는 나', url: url }).catch(function () { });
        } else {
          copyText(url, '링크를 복사했어요. 카카오톡에 붙여넣어 보세요.');
        }
      }
    });
  }

  /* URL 파라미터 복원 */
  function parseParams() {
    var q = new URLSearchParams(location.search);
    function readOne(prefix) {
      var birth = q.get(prefix + 'birth');
      if (!birth) return null;
      var parts = birth.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      var t = q.get(prefix + 'time');
      var timeKnown = !!t;
      var hour = 12, minute = 0;
      if (timeKnown) {
        var tp = t.split(':').map(Number);
        hour = tp[0] || 0; minute = tp[1] || 0;
      }
      return {
        cal: q.get(prefix + 'cal') === 'lunar' ? 'lunar' : 'solar',
        y: parts[0], m: parts[1], d: parts[2],
        leap: q.get(prefix + 'leap') === '1',
        timeKnown: timeKnown, hour: hour, minute: minute,
        gender: q.get(prefix + 'gender') === 'm' ? 'm' : 'f',
        clockFix: q.get(prefix + 'clockfix') !== '0'
      };
    }
    return {
      tab: q.get('tab'),
      main: readOne(''),
      partner: readOne('p')
    };
  }

  function restoreFromParams() {
    var pr = parseParams();
    if (!pr.main) return false;
    var tab = TABS.indexOf(pr.tab) >= 0 ? pr.tab : 'saju';
    if (tab === 'premium') tab = 'saju';
    forms.saju.set(pr.main);
    forms.breakup.set(pr.main);
    forms.me.set(pr.main);
    if (pr.partner) forms.you.set(pr.partner);
    activateTab(tab, { silent: true, noScroll: true });
    setTimeout(function () { computeAndRender(tab === 'premium' ? 'saju' : tab); }, 120);
    return true;
  }

  /* =====================================================
     10. 결제 안내 모달
     ===================================================== */
  function contactLabel() {
    if (BANK_CONFIG.contactKakao) return '오픈채팅';
    return '이메일(' + BANK_CONFIG.contactEmail + ')';
  }

  function renderBankBox() {
    var box = $('#bank-box');
    if (!box) return;
    var hasAccount = !!(BANK_CONFIG.bank && BANK_CONFIG.account && BANK_CONFIG.holder);
    var step1 = $('#step1-text');
    if (step1) {
      step1.innerHTML = hasAccount
        ? '위 계좌로 <b>₩' + Number(BANK_CONFIG.amount).toLocaleString('ko-KR') + '</b>을 입금해 주세요. 입금자명은 신청서에 적는 이름과 같게 해 주세요.'
        : '먼저 아래 이메일로 문의해 주시면 <b>입금 계좌와 금액</b>을 안내해 드립니다. 계좌가 열리는 대로 이 페이지에서도 바로 확인하실 수 있습니다.';
    }
    if (!hasAccount) {
      box.innerHTML = '<p class="bank-pending">현재 1:1 정밀 감정 <b>계좌 오픈 준비 중</b>입니다.<br>' +
        '신청을 원하시면 아래 이메일(<b>' + esc(BANK_CONFIG.contactEmail) + '</b>)로 먼저 문의해 주세요. ' +
        '입금 계좌와 안내를 순서대로 보내 드립니다.</p>' +
        '<a class="copy-btn" href="mailto:' + esc(BANK_CONFIG.contactEmail) + '?subject=' + encodeURIComponent('[묵월당] 1:1 정밀 감정 문의') + '">메일로 문의하기</a>';
      return;
    }
    var acct = BANK_CONFIG.bank + ' ' + BANK_CONFIG.account;
    box.innerHTML =
      '<div class="bank-row"><span class="k">입금 계좌</span><span class="v big">' + esc(acct) + '</span></div>' +
      '<div class="bank-row"><span class="k">예금주</span><span class="v">' + esc(BANK_CONFIG.holder) + '</span></div>' +
      '<div class="bank-row"><span class="k">입금 금액</span><span class="v">₩' + Number(BANK_CONFIG.amount).toLocaleString('ko-KR') + '</span></div>' +
      '<button type="button" class="copy-btn" id="copy-bank-btn">계좌번호 복사</button>';
    var cb = $('#copy-bank-btn');
    if (cb) {
      cb.addEventListener('click', function () {
        copyText(BANK_CONFIG.account.replace(/[^0-9]/g, ''), '계좌번호를 복사했어요.');
        trackEvent('bank_copy', {});
      });
    }
  }

  function applyTemplate() {
    return '[묵월당 1:1 정밀 감정 신청]\n' +
      '· 상품: ' + BANK_CONFIG.product + ' (₩' + Number(BANK_CONFIG.amount).toLocaleString('ko-KR') + ')\n' +
      '· 입금자명: \n' +
      '· 생년월일: (양력/음력) ____년 __월 __일\n' +
      '· 태어난 시간: (모르면 "모름")\n' +
      '· 성별: \n' +
      '· 상대 생년월일(궁합 희망 시): \n' +
      '\n· 질문 1. \n· 질문 2. \n· 질문 3. \n\n' +
      '※ 입금 후 위 내용을 ' + BANK_CONFIG.contactEmail + ' 로 보내 주세요.';
  }

  function openModal() {
    var m = $('#pay-modal');
    if (!m) return;
    renderBankBox();
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeBtn = $('.modal-close', m);
    if (closeBtn) closeBtn.focus();
    trackEvent('pay_open', {});
    trackEvent('apply_click', { product: BANK_CONFIG.product, amount: BANK_CONFIG.amount });
  }

  function closeModal() {
    var m = $('#pay-modal');
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = '';
    var btn = $('#kr-pay-btn');
    if (btn) btn.focus();
  }

  function initModal() {
    var payBtn = $('#kr-pay-btn');
    if (payBtn) payBtn.addEventListener('click', openModal);

    var modal = $('#pay-modal');
    if (!modal) return;
    $$('[data-close]', modal).forEach(function (b) {
      b.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    var copyForm = $('#copy-form-btn');
    if (copyForm) {
      copyForm.addEventListener('click', function () {
        copyText(applyTemplate(), '신청서 양식을 복사했어요. 메일에 붙여넣어 주세요.');
        trackEvent('template_copy', {});
      });
    }
    var tpl = $('#apply-template');
    if (tpl) tpl.value = applyTemplate();

    var lbl = $('#contact-label');
    if (lbl) lbl.textContent = contactLabel();
    renderBankBox();
  }

  /* =====================================================
     11. 시작
     ===================================================== */
  function initChips() {
    $$('#panel-breakup .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var on = chip.classList.contains('is-on');
        $$('#panel-breakup .chip').forEach(function (c) { c.classList.remove('is-on'); });
        if (!on) chip.classList.add('is-on');
      });
    });
  }

  function initButtons() {
    var b1 = $('#btn-saju');
    if (b1) b1.addEventListener('click', function () { computeAndRender('saju'); });
    var b2 = $('#btn-breakup');
    if (b2) b2.addEventListener('click', function () { computeAndRender('breakup'); });
    var b3 = $('#btn-compat');
    if (b3) b3.addEventListener('click', function () { computeAndRender('compat'); });
  }

  function initHash() {
    var h = (location.hash || '').replace('#', '');
    if (TABS.indexOf(h) >= 0) activateTab(h, { silent: true, noScroll: true });
  }

  function boot() {
    if (!window.KR_CAL || !S || !D) {
      // 데이터 로딩 실패 시 안내
      var area = $('#saju-result');
      if (area) area.innerHTML = '<div class="card"><p class="para">계산 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p></div>';
      return;
    }
    initAllForms();
    initTabs();
    initChips();
    initButtons();
    initShare();
    initModal();
    initHash();
    $$('.panel .ad-slot').forEach(function (ad) { ad.hidden = true; });
    if (!restoreFromParams()) {
      trackEvent('page_view', { page: 'home' });
    }
    // 탭 최초 노출 이벤트
    trackEvent('tab_view', { tab: 'saju' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
