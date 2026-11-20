/* =========================================================
   사주 계산 엔진 — saju.js
   · 일주(60갑자) : 율리우스일(JDN) 기준, 1900-01-01 갑술일 앵커
   · 년주/월주   : 24절기(입춘·경칩 …) 절입 시각으로 경계 판정
   · 시주        : 오서둔법, 일주 : 오호둔법
   · 음력 → 양력 : 한국천문연구원 음양력 표
   브라우저 전용 · 외부 라이브러리 없음
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- 기본 상수 ---------- */
  var STEM_HAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var STEM_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];             // 목 화 토 금 수
  var STEM_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];           // 1=양
  var STEM_IMG = ['큰 나무', '풀과 덩굴', '태양', '등불', '큰 산', '기름진 밭', '도끼와 무쇠', '보석과 칼날', '큰 바다', '시냇물과 비'];

  var BR_HAN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var BR_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var BR_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var BR_ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var BR_TIME = ['23:30~01:29', '01:30~03:29', '03:30~05:29', '05:30~07:29', '07:30~09:29', '09:30~11:29',
                 '11:30~13:29', '13:30~15:29', '15:30~17:29', '17:30~19:29', '19:30~21:29', '21:30~23:29'];
  var BR_MEAN = ['한겨울의 씨앗', '겨울 땅속의 뿌리', '이른 봄의 새싹', '봄의 꽃', '봄비 내리는 논', '한낮으로 가는 불',
                 '한여름의 태양', '늦여름의 곡식', '초가을의 서리', '가을의 열매', '가을의 빈 들', '겨울로 가는 물'];
  // 지장간(여기·중기·본기 순) — 마지막이 본기
  var JIJANGAN = [[8, 9], [9, 7, 5], [4, 2, 0], [0, 1], [1, 9, 4], [4, 6, 2],
                  [2, 5, 3], [3, 1, 5], [4, 8, 6], [6, 7], [7, 3, 4], [4, 0, 8]];

  var EL_KO = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
  var EL_SHORT = ['목', '화', '토', '금', '수'];
  var EL_HAN = ['木', '火', '土', '金', '水'];
  var EL_COLOR = ['#6f9c6a', '#b8574f', '#c9a15b', '#cfd3d6', '#5f8ea8'];

  var SIPSUNG = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var SIPSUNG_GROUP = ['비겁', '비겁', '식상', '식상', '재성', '재성', '관성', '관성', '인성', '인성'];
  var GROUP_KO = { '비겁': '비겁(比劫)', '식상': '식상(食傷)', '재성': '재성(財星)', '관성': '관성(官星)', '인성': '인성(印星)' };

  /* ---------- 지지 관계 ---------- */
  var YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  var PA = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10]];
  var HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
  var HYUNG_TRI = [[2, 5, 8], [1, 10, 7]];
  var HYUNG_SELF = [4, 6, 9, 11];
  var HYUNG_JAMYO = [0, 3];
  var SAMHAP = [[8, 0, 4, 4], [11, 3, 7, 0], [2, 6, 10, 1], [5, 9, 1, 3]]; // 신자진=수, 해묘미=목, 인오술=화, 사유축=금

  function pairIn(list, a, b) {
    for (var i = 0; i < list.length; i++) {
      if ((list[i][0] === a && list[i][1] === b) || (list[i][0] === b && list[i][1] === a)) return true;
    }
    return false;
  }

  /* ---------- 음력 ↔ 양력 ---------- */
  function daysInGregorianMonth(y, m) {
    var d = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    if (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) d = 29;
    return d;
  }

  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var y2 = y + 4800 - a;
    var m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  function fromJdn(j) {
    var a = j + 32044;
    var b = Math.floor((4 * a + 3) / 146097);
    var c = a - Math.floor(146097 * b / 4);
    var d = Math.floor((4 * c + 3) / 1461);
    var e = c - Math.floor(1461 * d / 4);
    var m = Math.floor((5 * e + 2) / 153);
    return {
      d: e - Math.floor((153 * m + 2) / 5) + 1,
      m: m + 3 - 12 * Math.floor(m / 10),
      y: 100 * b + d - 4800 + Math.floor(m / 10)
    };
  }

  function lunarSeq(leap) {
    var seq = [];
    for (var m = 1; m <= 12; m++) {
      seq.push({ m: m, leap: false });
      if (leap && m === leap) seq.push({ m: m, leap: true });
    }
    return seq;
  }

  function lunarYearRow(ly) {
    var cal = global.KR_CAL;
    var idx = ly - cal.lunarBase;
    if (idx < 0 || idx >= cal.lunar.length) return null;
    var row = cal.lunar[idx];
    return { leap: row[0], mask: row[1], jdn: row[2] };
  }

  function lunarToSolar(ly, lm, ld, isLeap) {
    var row = lunarYearRow(ly);
    if (!row) return null;
    var seq = lunarSeq(row.leap);
    var off = 0, found = null;
    for (var i = 0; i < seq.length; i++) {
      var len = (row.mask >> i) & 1 ? 30 : 29;
      if (seq[i].m === lm && seq[i].leap === !!isLeap) { found = { off: off, len: len }; break; }
      off += len;
    }
    if (!found || ld < 1 || ld > found.len) return null;
    return fromJdn(row.jdn + found.off + ld - 1);
  }

  function solarToLunar(sy, sm, sd) {
    var cal = global.KR_CAL;
    var j = jdn(sy, sm, sd);
    var idx = -1;
    for (var i = cal.lunar.length - 1; i >= 0; i--) {
      if (j >= cal.lunar[i][2]) { idx = i; break; }
    }
    if (idx < 0) return null;
    var row = cal.lunar[idx];
    var seq = lunarSeq(row[0]);
    var off = j - row[2];
    for (var k = 0; k < seq.length; k++) {
      var len = (row[1] >> k) & 1 ? 30 : 29;
      if (off < len) return { y: cal.lunarBase + idx, m: seq[k].m, d: off + 1, leap: seq[k].leap };
      off -= len;
    }
    return null;
  }

  /* ---------- 24절기 (KST 분) ---------- */
  var TERM_NAMES = ['소한', '입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설'];

  function termMinutes(y, i) {
    var cal = global.KR_CAL;
    var idx = y - cal.termBase;
    if (idx < 0 || idx >= cal.terms.length) return null;
    return cal.terms[idx][i];
  }

  // 절기 시각은 KST 벽시계 기준 분으로 저장되어 있으므로, 실제 순간(instant)으로 돌려준다.
  function termDate(y, i) {
    var t = termMinutes(y, i);
    if (t === null) return null;
    return new Date(Date.UTC(1900, 0, 1, 0, 0) + t * 60000 - 9 * 3600000);
  }

  function fmtKST(d) {
    if (!d) return '';
    var x = new Date(d.getTime() + 9 * 3600000);
    return x.toISOString().slice(0, 16).replace('T', ' ');
  }

  /* ---------- 출생 당시 시계 보정 ----------
     한국은 서머타임(1948~1951, 1955~1960, 1987~1988)과
     표준시 변경(1954-03-21 ~ 1961-08-09, UTC+8:30) 때문에
     당시 시계의 시각이 오늘의 KST(UTC+9)와 다릅니다.
     기록된 시각을 KST 기준으로 옮길 때 더할 분(分)을 돌려줍니다. */
  var DST_PERIODS = [
    // [시작 y,m,d,h] [종료 y,m,d,h]
    [[1948, 6, 1, 0], [1948, 9, 13, 0]],
    [[1949, 4, 3, 0], [1949, 9, 11, 0]],
    [[1950, 4, 1, 0], [1950, 9, 10, 0]],
    [[1951, 5, 6, 0], [1951, 9, 9, 0]],
    [[1955, 5, 5, 0], [1955, 9, 9, 0]],
    [[1956, 5, 20, 0], [1956, 9, 30, 0]],
    [[1957, 5, 5, 0], [1957, 9, 22, 0]],
    [[1958, 5, 4, 0], [1958, 9, 21, 0]],
    [[1959, 5, 3, 0], [1959, 9, 20, 0]],
    [[1960, 5, 1, 0], [1960, 9, 18, 0]],
    [[1987, 5, 10, 2], [1987, 10, 11, 3]],
    [[1988, 5, 8, 2], [1988, 10, 9, 3]]
  ];

  function clockAdjust(y, m, d, h, mi) {
    var t = (jdn(y, m, d) - 2415021) * 1440 + h * 60 + mi;
    var shift = 0;
    for (var i = 0; i < DST_PERIODS.length; i++) {
      var a = DST_PERIODS[i][0], b = DST_PERIODS[i][1];
      var st = (jdn(a[0], a[1], a[2]) - 2415021) * 1440 + a[3] * 60;
      var en = (jdn(b[0], b[1], b[2]) - 2415021) * 1440 + b[3] * 60;
      if (t >= st && t < en) { shift -= 60; break; }
    }
    var st54 = (jdn(1954, 3, 21) - 2415021) * 1440;
    var en61 = (jdn(1961, 8, 10) - 2415021) * 1440;
    if (t >= st54 && t < en61) shift += 30;
    return shift;
  }

  /* ---------- 사주 계산 ---------- */
  /**
   * input: { cal:'solar'|'lunar', y, m, d, leap:bool, hour:null|0..23, minute:0..59,
   *          timeKnown:bool, lateZi:bool(=23시 이후를 다음날로) }
   */
  function pillars(input) {
    var cal = input.cal || 'solar';
    var solar, lunar = null;
    if (cal === 'lunar') {
      solar = lunarToSolar(input.y, input.m, input.d, !!input.leap);
      if (!solar) return { error: '음력 날짜를 확인해 주세요. (1900~2050년 지원)' };
      lunar = { y: input.y, m: input.m, d: input.d, leap: !!input.leap };
    } else {
      solar = { y: input.y, m: input.m, d: input.d };
      if (jdn(solar.y, solar.m, solar.d) < 2415021 || jdn(solar.y, solar.m, solar.d) > jdn(2050, 12, 31)) {
        return { error: '1900년 ~ 2050년 사이 날짜만 계산할 수 있습니다.' };
      }
      lunar = solarToLunar(solar.y, solar.m, solar.d);
    }

    var timeKnown = input.timeKnown !== false && input.hour !== null && input.hour !== undefined;
    var hour = timeKnown ? Number(input.hour) : null;
    var minute = timeKnown ? Number(input.minute || 0) : 0;

    var base = jdn(solar.y, solar.m, solar.d);
    var clockShift = 0;
    if (timeKnown && input.clockFix !== false) {
      clockShift = clockAdjust(solar.y, solar.m, solar.d, hour, minute);
    }
    var abs = (base - 2415021) * 1440 + (timeKnown ? hour * 60 + minute : 0) + clockShift;
    var effDay = 2415021 + Math.floor(abs / 1440);
    var effMin = abs - Math.floor(abs / 1440) * 1440;
    var effHour = Math.floor(effMin / 60);
    var effMinute = effMin % 60;

    /* --- 년주·월주 (절기) --- */
    var latest = null;
    for (var g = solar.y - 1; g <= solar.y; g++) {
      for (var i = 0; i < 12; i++) {
        var t = termMinutes(g, i);
        if (t === null) continue;
        var label = (i === 0) ? { sy: g - 1, mi: 11 } : { sy: g, mi: i - 1 };
        if (t <= abs && (!latest || t > latest.t)) latest = { t: t, sy: label.sy, mi: label.mi, term: TERM_NAMES[i], gy: g };
      }
    }
    if (!latest) return { error: '절기 데이터 범위를 벗어났습니다.' };

    var sajuYear = latest.sy;
    var monthIdx = latest.mi;                        // 0=인월 … 11=축월
    var yearStem = ((sajuYear - 4) % 10 + 10) % 10;
    var yearBranch = ((sajuYear - 4) % 12 + 12) % 12;
    var monthStem = (yearStem * 2 + 2 + monthIdx) % 10;
    var monthBranch = (monthIdx + 2) % 12;

    /* --- 일주 --- */
    var dayJdn = effDay;
    if (timeKnown && input.lateZi !== false && effHour >= 23) dayJdn += 1;   // 야자시 → 다음날
    var dayIdx = (dayJdn + 49) % 60;                                          // 0 = 갑자
    var dayStem = dayIdx % 10;
    var dayBranch = dayIdx % 12;

    /* --- 시주 --- */
    var hourBranch = null, hourStem = null;
    if (timeKnown) {
      hourBranch = Math.floor(((effHour + 1) % 24) / 2);
      hourStem = (dayStem * 2 + hourBranch) % 10;
    }

    var p = {
      ok: true,
      solar: solar,
      lunar: lunar,
      timeKnown: timeKnown,
      hour: hour,
      minute: minute,
      clockShift: clockShift,
      effective: timeKnown ? { hour: effHour, minute: effMinute } : null,
      sajuYear: sajuYear,
      year: { stem: yearStem, branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day: { stem: dayStem, branch: dayBranch },
      hour2: timeKnown ? { stem: hourStem, branch: hourBranch } : null,
      dayIndex: dayIdx,
      monthIdx: monthIdx,
      monthTerm: latest.term,
      solarTermTime: new Date(Date.UTC(1900, 0, 1, 0, 0) + latest.t * 60000 - 9 * 3600000)
    };
    p.ganji = {
      year: STEM_HAN[yearStem] + BR_HAN[yearBranch],
      month: STEM_HAN[monthStem] + BR_HAN[monthBranch],
      day: STEM_HAN[dayStem] + BR_HAN[dayBranch],
      hour: timeKnown ? STEM_HAN[hourStem] + BR_HAN[hourBranch] : null
    };
    p.ganjiKo = {
      year: STEM_KO[yearStem] + BR_KO[yearBranch],
      month: STEM_KO[monthStem] + BR_KO[monthBranch],
      day: STEM_KO[dayStem] + BR_KO[dayBranch],
      hour: timeKnown ? STEM_KO[hourStem] + BR_KO[hourBranch] : null
    };
    return p;
  }

  /* ---------- 십성 ---------- */
  function tenGod(dayStem, otherStem) {
    var de = STEM_EL[dayStem], oe = STEM_EL[otherStem];
    var same = STEM_YANG[dayStem] === STEM_YANG[otherStem];
    if (oe === de) return same ? 0 : 1;
    if (oe === (de + 1) % 5) return same ? 2 : 3;
    if (oe === (de + 2) % 5) return same ? 4 : 5;
    if (oe === (de + 3) % 5) return same ? 6 : 7;
    return same ? 8 : 9;
  }

  /* ---------- 분석 ---------- */
  function analyze(p) {
    if (!p || !p.ok) return null;
    var dayStem = p.day.stem;
    var letters = [
      { pos: '년', stem: p.year.stem, branch: p.year.branch },
      { pos: '월', stem: p.month.stem, branch: p.month.branch },
      { pos: '일', stem: p.day.stem, branch: p.day.branch },
      { pos: '시', stem: p.hour2 ? p.hour2.stem : null, branch: p.hour2 ? p.hour2.branch : null }
    ];

    // 오행 세기 (글자 1개 = 1)
    var counts = [0, 0, 0, 0, 0];
    letters.forEach(function (L) {
      if (L.stem !== null) counts[STEM_EL[L.stem]]++;
      if (L.branch !== null) counts[BR_EL[L.branch]]++;
    });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    var percent = counts.map(function (c) { return Math.round(c / total * 100); });

    // 지장간 포함 세기 (본기 1.0, 중기 0.5, 여기 0.3)
    var hidden = [0, 0, 0, 0, 0];
    letters.forEach(function (L) {
      if (L.branch === null) return;
      var jj = JIJANGAN[L.branch];
      for (var i = 0; i < jj.length; i++) {
        var w = (i === jj.length - 1) ? 1 : (i === jj.length - 2 ? 0.5 : 0.3);
        hidden[STEM_EL[jj[i]]] += w;
      }
    });

    // 십성 배치
    var sipsung = {};
    letters.forEach(function (L) {
      var key = L.pos;
      sipsung[key] = {
        stem: (L.stem === null) ? null : (L.pos === '일' ? '일간' : SIPSUNG[tenGod(dayStem, L.stem)]),
        stemIdx: (L.stem === null) ? null : tenGod(dayStem, L.stem),
        branch: (L.branch === null) ? null : SIPSUNG[tenGod(dayStem, JIJANGAN[L.branch][JIJANGAN[L.branch].length - 1])]
      };
    });

    // 십성 개별 세기
    var sipsungCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    letters.forEach(function (L) {
      if (L.stem !== null && L.pos !== '일') sipsungCount[tenGod(dayStem, L.stem)] += 1;
      if (L.branch !== null) {
        var jj0 = JIJANGAN[L.branch];
        sipsungCount[tenGod(dayStem, jj0[jj0.length - 1])] += 1;
      }
    });
    var sipsungList = sipsungCount.map(function (c, i) { return { name: SIPSUNG[i], idx: i, count: c }; })
      .sort(function (a, b) { return b.count - a.count || a.idx - b.idx; });

    // 십성 그룹 세기
    var groups = { '비겁': 0, '식상': 0, '재성': 0, '관성': 0, '인성': 0 };
    letters.forEach(function (L) {
      if (L.stem !== null && L.pos !== '일') groups[SIPSUNG_GROUP[tenGod(dayStem, L.stem)]] += 1;
      if (L.branch !== null) {
        var jj = JIJANGAN[L.branch];
        groups[SIPSUNG_GROUP[tenGod(dayStem, jj[jj.length - 1])]] += 1;
      }
    });

    // 신강·신약 (월령 가중)
    var w = { '년': 1, '월': 1.3, '일': 1 };
    var support = 0, drain = 0;
    letters.forEach(function (L) {
      var bw = (L.pos === '년' ? 1 : L.pos === '월' ? 2.6 : L.pos === '일' ? 1.6 : 1);
      if (L.stem !== null && L.pos !== '일') {
        var g = SIPSUNG_GROUP[tenGod(dayStem, L.stem)];
        if (g === '비겁' || g === '인성') support += w[L.pos] || 1; else drain += w[L.pos] || 1;
      }
      if (L.branch !== null) {
        var jj = JIJANGAN[L.branch];
        var gb = SIPSUNG_GROUP[tenGod(dayStem, jj[jj.length - 1])];
        if (gb === '비겁' || gb === '인성') support += bw; else drain += bw;
      }
    });
    var ratio = support / (support + drain || 1);
    var strength = ratio >= 0.56 ? '신강' : (ratio <= 0.44 ? '신약' : '중화');

    // 용신(간이)
    var de = STEM_EL[dayStem];
    var saeng = (de + 1) % 5, geuk = (de + 2) % 5, geukMe = (de + 3) % 5, saengMe = (de + 4) % 5;
    var yongsin, huisin, yongsinWhy;
    if (strength === '신강') {
      var cand = [{ el: saeng, why: '식상' }, { el: geuk, why: '재성' }, { el: geukMe, why: '관성' }];
      cand.sort(function (a, b) { return counts[a.el] - counts[b.el]; });
      yongsin = cand[0].el; huisin = cand[1].el;
      yongsinWhy = '일간의 기운이 강해, 흘려보내고 다스리는 쪽(' + GROUP_KO[cand[0].why] + ')이 약점을 메워 줍니다.';
    } else if (strength === '신약') {
      yongsin = saengMe; huisin = de;
      yongsinWhy = '일간의 기운이 약해, 나를 살려주는 기운(인성)과 같은 편(비겁)이 힘이 되어 줍니다.';
    } else {
      var minEl = 0;
      for (var e = 1; e < 5; e++) if (counts[e] < counts[minEl]) minEl = e;
      yongsin = minEl; huisin = (minEl + 4) % 5;
      yongsinWhy = '오행이 비교적 고르게 섞여 있어, 가장 적은 기운(' + EL_KO[minEl] + ')을 채우는 것이 균형에 도움이 됩니다.';
    }

    // 신살
    var sinsal = [];
    var yearBranch = p.year.branch, dayBranch = p.day.branch;
    var brs = [p.year.branch, p.month.branch, p.day.branch];
    if (p.hour2) brs.push(p.hour2.branch);

    function samhapGroup(b) {
      for (var i = 0; i < SAMHAP.length; i++) if (SAMHAP[i].indexOf(b) >= 0) return SAMHAP[i];
      return null;
    }
    var g1 = samhapGroup(yearBranch), g2 = samhapGroup(dayBranch);
    function hasOf(group, idx) { return group && brs.indexOf(group[idx]) >= 0; }
    // 도화: 신자진→유, 인오술→묘, 사유축→오, 해묘미→자
    var DOHWA = { 4: 9, 0: 9, 8: 9, 2: 3, 6: 3, 10: 3, 5: 6, 9: 6, 1: 6, 11: 0, 3: 0, 7: 0 };
    var YEOKMA = { 8: 2, 0: 2, 4: 2, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 };
    var HWAGAE = { 8: 4, 0: 4, 4: 4, 2: 10, 6: 10, 10: 10, 5: 1, 9: 1, 1: 1, 11: 7, 3: 7, 7: 7 };
    if (brs.indexOf(DOHWA[yearBranch]) >= 0 || brs.indexOf(DOHWA[dayBranch]) >= 0) sinsal.push({ key: '도화', name: '도화살(桃花煞)' });
    if (brs.indexOf(YEOKMA[yearBranch]) >= 0 || brs.indexOf(YEOKMA[dayBranch]) >= 0) sinsal.push({ key: '역마', name: '역마살(驛馬煞)' });
    if (brs.indexOf(HWAGAE[yearBranch]) >= 0 || brs.indexOf(HWAGAE[dayBranch]) >= 0) sinsal.push({ key: '화개', name: '화개살(華蓋煞)' });
    var HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
    if (brs.indexOf(HONGYEOM[dayStem]) >= 0) sinsal.push({ key: '홍염', name: '홍염살(紅艶煞)' });
    if (p.day.branch === 0 || p.day.branch === 6) { /* 자오 */ }

    // 일지 관계 요약
    function rel(b1, b2) {
      var out = [];
      if (b1 === b2 && HYUNG_SELF.indexOf(b1) >= 0) out.push('자형');
      if (pairIn(YUKHAP, b1, b2)) out.push('육합');
      if (pairIn(CHUNG, b1, b2)) out.push('충');
      if (pairIn(PA, b1, b2)) out.push('파');
      if (pairIn(HAE, b1, b2)) out.push('해');
      for (var i = 0; i < HYUNG_TRI.length; i++) {
        if (b1 !== b2 && HYUNG_TRI[i].indexOf(b1) >= 0 && HYUNG_TRI[i].indexOf(b2) >= 0) out.push('형');
      }
      if (HYUNG_JAMYO.indexOf(b1) >= 0 && HYUNG_JAMYO.indexOf(b2) >= 0) out.push('형');
      return out;
    }

    return {
      counts: counts, percent: percent, hidden: hidden, total: total,
      sipsung: sipsung, sipsungList: sipsungList, groups: groups,
      strength: strength, strengthRatio: ratio,
      yongsin: yongsin, huisin: huisin, yongsinWhy: yongsinWhy,
      sinsal: sinsal,
      yongsinEl: EL_KO[yongsin],
      dayElement: EL_KO[de],
      rel: rel
    };
  }

  /* ---------- 세운 ---------- */
  function seun(year) {
    var stem = ((year - 4) % 10 + 10) % 10;
    var branch = ((year - 4) % 12 + 12) % 12;
    return { year: year, stem: stem, branch: branch, ganji: STEM_HAN[stem] + BR_HAN[branch], ganjiKo: STEM_KO[stem] + BR_KO[branch] };
  }

  /* ---------- 궁합 ---------- */
  function compat(a, b) {
    var pa = pillars(a), pb = pillars(b);
    if (!pa.ok) return { error: pa.error };
    if (!pb.ok) return { error: pb.error };
    var ra = analyze(pa), rb = analyze(pb);

    var yb1 = pa.year.branch, yb2 = pb.year.branch;
    var db1 = pa.day.branch, db2 = pb.day.branch;
    var rels = [];
    function addRel(label, list) { rels.push({ label: label, types: list }); }
    addRel('띠(년지)', ra.rel(yb1, yb2));
    addRel('일지', ra.rel(db1, db2));

    // 삼합 여부
    var samhapHit = null;
    for (var i = 0; i < SAMHAP.length; i++) {
      if (SAMHAP[i].indexOf(yb1) >= 0 && SAMHAP[i].indexOf(yb2) >= 0 && yb1 !== yb2) { samhapHit = SAMHAP[i]; break; }
    }

    // 오행 보완: 서로 부족한 오행을 채워주는가
    var cover = 0;
    for (var e = 0; e < 5; e++) {
      if (ra.counts[e] === 0 && rb.counts[e] >= 2) cover += 2;
      else if (ra.counts[e] === 0 && rb.counts[e] === 1) cover += 1;
      if (rb.counts[e] === 0 && ra.counts[e] >= 2) cover += 2;
      else if (rb.counts[e] === 0 && ra.counts[e] === 1) cover += 1;
    }
    // 일간 관계
    var e1 = STEM_EL[pa.day.stem], e2 = STEM_EL[pb.day.stem];
    var stemRel;
    if (e1 === e2) stemRel = '비화';
    else if ((e1 + 1) % 5 === e2 || (e2 + 1) % 5 === e1) stemRel = '상생';
    else stemRel = '상극';

    // 점수
    var score = 62;
    rels.forEach(function (r) {
      r.types.forEach(function (t) {
        if (t === '육합') score += 9;
        else if (t === '충') score -= 8;
        else if (t === '형') score -= 5;
        else if (t === '파') score -= 4;
        else if (t === '해') score -= 4;
        else if (t === '자형') score -= 2;
      });
    });
    if (samhapHit) score += 7;
    score += Math.min(cover, 6);
    if (stemRel === '상생') score += 5;
    if (stemRel === '상극') score -= 4;
    if (ra.strength !== rb.strength) score += 2;
    score = Math.max(38, Math.min(97, score));

    return {
      ok: true, a: pa, b: pb, ra: ra, rb: rb,
      rels: rels, samhap: samhapHit, cover: cover, stemRel: stemRel,
      score: score,
      elemPair: [STEM_EL[pa.day.stem], STEM_EL[pb.day.stem]]
    };
  }

  global.Saju = {
    STEM_HAN: STEM_HAN, STEM_KO: STEM_KO, STEM_EL: STEM_EL, STEM_YANG: STEM_YANG, STEM_IMG: STEM_IMG,
    BR_HAN: BR_HAN, BR_KO: BR_KO, BR_EL: BR_EL, BR_ANIMAL: BR_ANIMAL, BR_TIME: BR_TIME, BR_MEAN: BR_MEAN,
    JIJANGAN: JIJANGAN, EL_KO: EL_KO, EL_SHORT: EL_SHORT, EL_HAN: EL_HAN, EL_COLOR: EL_COLOR,
    SIPSUNG: SIPSUNG, SIPSUNG_GROUP: SIPSUNG_GROUP, GROUP_KO: GROUP_KO,
    TERM_NAMES: TERM_NAMES, YUKHAP: YUKHAP, CHUNG: CHUNG, PA: PA, HAE: HAE, SAMHAP: SAMHAP,
    pillars: pillars, analyze: analyze, clockAdjust: clockAdjust, tenGod: tenGod, seun: seun, compat: compat,
    lunarToSolar: lunarToSolar, solarToLunar: solarToLunar, termDate: termDate, fmtKST: fmtKST, jdn: jdn
  };
})(window);
