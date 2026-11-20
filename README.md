# 묵월당 사주 — 한국 사주 사이트

- **라이브**: https://koki839.github.io/mukwoldang-saju/
- **저장소**: https://github.com/koki839/mukwoldang-saju (public, GitHub Pages · `gh-pages` 브랜치 루트)

흑요석 다크 + 한국 전통 무드의 정통 사주 사이트입니다. 프레임워크 없이 HTML / CSS / JS 만으로 만들어져 정적 호스팅에 그대로 올릴 수 있습니다(서버 비용 0원).

## 파일 구성

```
(저장소 루트)
├── index.html              # 한 페이지 — 사주팔자 / 이별·치유 / 궁합 / 1:1 감정 4개 탭 + FAQ
├── css/style.css           # 디자인 (모바일 우선, 흑요석·단청와인·금박·창살 패턴)
├── js/saju.js              # 만세력 계산 엔진 (절기·음양력·사주 여덟 글자·십성·용신·궁합)
├── js/app.js               # 화면 로직 (폼·결과 렌더링·공유·신청 모달·GA4 이벤트)
├── data/calendar_data.js   # 24절기 절입시각(1890~2110) + 한국 음양력 표(1900~2050)
├── data/saju_data.js       # 일간 10종·오행·십성·60갑자 일주·신살 본문
├── data/content_more.js    # 세운(2026·2027)·이별 치유·궁합 본문
├── assets/banner_obsidian.jpg|webp   # 히어로 배너 (webp 136KB → jpg 236KB)
├── sitemap.xml · robots.txt
└── .nojekyll                # GitHub Pages 가 Jekyll 없이 그대로 올리도록
```

데이터 재생성·계산 검증 스크립트와 배너 원본 PNG(`_build/`)는 이 공개 저장소에 넣지 않았습니다. 원본 작업 폴더에만 있습니다. 배포에 필요한 파일은 위 목록이 전부입니다.

## 로컬에서 확인

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

`index.html` 을 브라우저로 직접 열어도 대부분 동작합니다(데이터가 JS라 file:// 에서도 로드됨).

## 만세력 계산 방식 (정확도)

| 항목 | 방식 |
|---|---|
| 일주(60갑자) | 율리우스일(JDN) 기반. 1900-01-01 갑술일 앵커. 1901~2050년 54,787일 전수 대조에서 오차 0 |
| 년주 | 입춘(황경 315°) 절입 **시각** 기준 |
| 월주 | 입춘·경칩·청명… 12절의 절입 시각으로 경계 판정 + 오호둔법 |
| 시주 | 오서둔법. 23시 이후는 다음 날 일주(조자시)로 계산 (설명 문구 있음) |
| 시계 보정 | 서머타임(1948~1951·1955~1960·1987~1988) −60분, 1954-03-21~1961-08-09 표준시(UTC+8:30) +30분 자동 적용 (체크박스로 끌 수 있음) |
| 음력·윤달 | 한국천문연구원 음양력 데이터(1900~2050)를 표로 내장, 3,000건 랜덤 대조 검증 |
| 절기 시각 | NASA JPL DE440s + skyfield 로 계산, KASI 공표값과 분 단위 일치 (예: 2024 입춘 17:27, 2026 입춘 05:02) |
| 오행·십성 | 천간·지지 8글자 집계 + 지장간 표시. 십성은 일간 기준 대비 |
| 신강·신약·용신 | 월령 가중 억부 방식의 **간이** 판정 (화면에 ‘간이’ 명시) |

검증 스크립트(`_build/harness.py` — 85개 계산 검증 전부 통과)와 데이터 재생성 스크립트(`_build/gen_terms.py` 절기 / `_build/gen_lunar.py` 음양력)는 원본 작업 폴더에 있으며, 이 저장소에는 포함하지 않았습니다.
※ 지원 범위: 양력 1900~2050년. 그 밖은 화면에서 안내합니다.

## 1:1 유료 신청 (계좌이체)

`js/app.js` 상단의 `BANK_CONFIG` 하나만 고치면 화면·모달·복사 버튼이 모두 반영됩니다.

```js
var BANK_CONFIG = {
  bank: '',        // 예: '카카오뱅크'
  account: '',     // 예: '3333-00-0000000'
  holder: '',      // 예금주
  amount: 19900,
  product: '1:1 정밀 사주 & 이별·재회 감정서',
  turnaround: '48시간',
  contactEmail: 'dfkgj3147@gmail.com',
  contactKakao: ''
};
```

- `bank`·`account`·`holder` 중 하나라도 비어 있으면 **“계좌 오픈 준비 중”** 안내와 이메일 문의 버튼이 나옵니다. 세 값을 채우면 입금 계좌 박스 + **계좌번호 복사 버튼** + 단계별 안내로 자동 전환됩니다.
- `contactKakao` 에 오픈채팅 주소를 넣으면 접수처 표기가 ‘오픈채팅’으로 바뀝니다(비워 두면 이메일).
- 모달은 ‘1:1 심층 사주 신청하기’ 버튼(`#kr-pay-btn`)을 누른 사람에게만 열립니다. 초기 화면에는 계좌 정보가 노출되지 않습니다. ESC·배경 클릭·닫기 버튼으로 닫힙니다.
- 신청서 양식(입금자명·생년월일·질문 3개)은 `#copy-form-btn` 으로 복사됩니다.

## 광고 슬롯

`index.html` 안에 3곳(`.ad-slot`)이 주석 `<!-- 광고 슬롯 n -->` 으로 표시되어 있습니다.

| 위치 | 클래스 |
|---|---|
| 사주 결과 아래 | `.ad-slot` (첫 결과가 나오면 표시) |
| 이별 사주 결과 아래 | `.ad-slot` |
| 궁합 결과 아래 | `.ad-slot` |

결과가 없는 처음 화면에서는 슬롯이 보이지 않습니다(`hidden` 처리). `.ad-slot-wide` 클래스를 쓰면 더 높은 슬롯이 됩니다.

애드센스는 해당 `<div class="ad-slot">…</div>` 를 `<ins class="adsbygoogle">` 블록으로 교체하고 `<head>` 에 스크립트를 추가하면 됩니다. 카카오 애드핏은 애드핏 스크립트를 같은 자리에 넣습니다. 슬롯 높이는 `.ad-slot{min-height}` 로 조정합니다.

## 유입 측정 (GA4)

`index.html` `<head>` 에 측정 ID 자리만 비워 두었습니다.

```html
<script>
  window.GA_MEASUREMENT_ID = "";   // ← "G-XXXXXXXXXX" 입력
</script>
```

ID를 넣으면 `js/app.js` 가 gtag.js 를 로드하고 아래 이벤트를 자동으로 보냅니다(비어 있으면 아무 것도 전송하지 않음).

| 이벤트 | 시점 | 파라미터 |
|---|---|---|
| `page_view` | 첫 진입 | page |
| `tab_view` | 탭 클릭 | tab |
| `saju_view` | 사주 조회 | calendar, time_known, day_ganji |
| `breakup_view` | 이별 메뉴 조회 | when |
| `compat_view` | 궁합 조회 | score |
| `apply_click` / `pay_open` | 1:1 신청 버튼 클릭 / 모달 열림 | product, amount |
| `bank_copy`, `template_copy` | 계좌·양식 복사 | — |
| `share_click` | 공유 버튼 | method, screen |

## 공유·URL 복원

- 결과마다 카카오톡(모바일 공유 시트) / X / 링크 복사 버튼이 있습니다.
- 주소에 입력값이 담겨 같은 결과를 다시 열 수 있습니다.
  - 사주: `?tab=saju&cal=solar&birth=1990-05-09&time=10:00&gender=f`
  - 이별: `?tab=breakup&birth=...&when=months`
  - 궁합: `?tab=compat&birth=...&pbirth=1992-08-14&ptime=10:00&pgender=m`
- 서버·DB에 저장하지 않습니다. 계산은 전부 브라우저 안에서 이루어집니다.

## 배포

1. **GitHub Pages (현재 적용됨)** — 이 폴더 내용을 `main` 브랜치에 push 하고, 같은 커밋을 `gh-pages` 브랜치로도 push 합니다. Pages 소스는 `gh-pages` / `/` 이고 빌드 후 위 주소로 서비스됩니다.
   ```bash
   git push origin main
   git push origin main:refs/heads/gh-pages
   ```
2. **Cloudflare Pages** — Workers & Pages → Create → Pages → Upload assets → 이 폴더를 드래그.

주소가 바뀌면 함께 고칠 곳(현재 `https://koki839.github.io/mukwoldang-saju/` 기준으로 이미 반영됨):

- `index.html` 의 `og:url`, `og:image`, `twitter:image`, `canonical`
- `sitemap.xml`, `robots.txt` 의 주소
- (애드센스 사용 시) 도메인 루트의 `ads.txt`

## 참고

- 폰트: Noto Serif KR(제목), Pretendard(본문) — 구글 폰트/CDN, 실패 시 시스템 폰트로 대체.
- 사주 해석 문구는 전통 명리학을 바탕으로 새로 쓴 참고 자료이며, 의료·법률·재무 판단을 대신하지 않습니다(화면·푸터에 명시).
