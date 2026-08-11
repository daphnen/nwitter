# 🐱 우리의 대시보드

둘이서 함께 쓰는 하루 기록 대시보드.
일정 · 목표 · 아침/점심/저녁 · 하루 일과 · 관심 뉴스를 한 화면에서 관리합니다.

- **Next.js 15 (App Router) + TypeScript + Tailwind v4**
- **Supabase** (Postgres · Auth · Realtime)
- 디자인 기준: [`reference/prototype.html`](reference/prototype.html)

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값을 채워주세요
npm run dev
```

`.env.local` 이 비어 있으면 화면에 설정 안내가 뜹니다.

## Supabase 준비 (한 번만)

1. **SQL Editor** 에서 마이그레이션을 순서대로 실행
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
     — 실행 전 파일 `[11]` 구역의 이메일 2개를 실제 값으로 바꾸세요
   - [`supabase/migrations/0002_timetable.sql`](supabase/migrations/0002_timetable.sql)
2. **Authentication → Users → Add user** 로 그 두 이메일 생성 (Auto Confirm)
   - ⚠️ 반드시 1번 다음에. 화이트리스트에 없으면 트리거가 막습니다
3. **Authentication → Providers → Email** → `Allow new users to sign up` 끄기
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`, `https://<배포주소>.vercel.app/**`

## 환경변수

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API (anon public) |
| `NEXT_PUBLIC_SITE_URL` | 매직링크가 돌아올 주소 |

## 디자인 토큰

색은 **전부** `src/app/globals.css` 의 CSS 변수로만 정의합니다.
컴포넌트에는 `bg-pink-100` 같은 하드코딩 색을 쓰지 않고
`bg-card` · `text-ink` · `bg-tone-blue-soft` 같은 시맨틱 유틸만 씁니다.

```
<html data-theme="moonlight|aqua" data-mode="light|dark">
```

테마 2종 × 라이트/다크 2종 = 팔레트 4벌. `@theme inline` 으로 등록해서
`data-theme` 만 바꾸면 유틸리티가 런타임에 따라옵니다.

색뿐 아니라 **형태도 토큰**입니다. aqua 는 라운드를 덜 주고 여백을 더 씁니다.

| 토큰 | moonlight | aqua |
| --- | --- | --- |
| `rounded-card` | 26px | 20px |
| `rounded-inner` | 16px | 12px |
| `p-card` | 20px | 24px |
| `gap-stack` | 20px | 24px |
| `py-row` | 6px | 10px |

`data-theme` 는 **서버에서** 정해 `<html>` 에 내려보냅니다(루트 레이아웃).
클라이언트에서 붙이면 첫 프레임에 기본 테마가 번쩍입니다.

목표 달성 축하는 컴포넌트가 두 연출을 모두 렌더링하고 CSS 가 테마에 맞는
하나만 보여줍니다 — moonlight 는 반짝임, aqua 는 체크.

카드별 색 계열은 카드 루트의 `data-tone="blue|orange|..."` 이 `--tone` /
`--tone-soft` 를 갈아끼우는 방식입니다. 덕분에 카드 안에서는 `bg-tone`,
`border-tone`, `bg-tone-soft` 세 가지만 쓰면 됩니다.

주의할 점 두 가지:

- `@theme inline` 은 변수를 `:root` 에 내보내지 않습니다. 손으로 쓰는 CSS 에서
  쓰려면 `--stack-round` 처럼 토큰 레이어에 따로 정의해야 합니다.
- next/font 변수는 `<html>` 에 붙입니다. `<body>` 에 두면 `:root` 에서
  `var(--font-jua)` 를 찾지 못해 스택 전체가 무효가 됩니다.

## 폴더 구조

```
reference/prototype.html      디자인 기준 (정적 스냅샷)
supabase/migrations/          스키마 SQL
src/
├── app/
│   ├── globals.css           디자인 토큰 + base
│   ├── layout.tsx            data-theme / 폰트 변수
│   ├── page.tsx              홈
│   ├── login/                매직링크 로그인
│   └── auth/callback/        세션 교환
├── components/
│   ├── Cat.tsx               고양이 마스코트 · 발바닥
│   ├── DashboardCard.tsx     카드 공통 껍데기 (제목/배지/본문)
│   └── cards/                홈 카드 5종
├── lib/
│   ├── supabase/             브라우저 / 서버 / 미들웨어 클라이언트
│   ├── database.types.ts     스키마 타입
│   ├── date.ts               KST 날짜 유틸
│   └── auth.ts               세션 + 프로필 조회
└── middleware.ts             세션 갱신 · 접근 제어
```

## 진행 상황

- [x] 1단계 — Next.js 셋업 + 스키마 SQL + 인증
- [x] 2단계 — 디자인 토큰 + 프로토타입을 moonlight 로 이관
- [x] 3단계 — aqua 테마 + 설정에서 전환
- [x] 4단계 — 하단 탭 + 캘린더 + 시간표
- [x] 5단계 — 카드 접기 + 순서/숨김
- [x] 6단계 — 친구 기록 토글 (테마 전환)
- [x] 7단계 — 뉴스 RSS
- [ ] 8단계 — PWA
- [ ] 실시간 반영 (Realtime 구독) — 아직 안 붙였습니다

## 시간표

매주 반복되는 고정 일정을 격자로 봅니다.

- 시간표를 여러 개 두고 `?tt=<id>` 로 전환합니다. 유효기간(`start_date`~`end_date`)이
  오늘을 품는 것이 기본 선택이고, 기간이 지나면 홈과 기본 선택에서 자동으로 빠집니다.
- 월/수 같이 여러 요일에 걸치는 항목은 **요일마다 한 줄**로 저장합니다.
  `weekday` 는 ISO 기준 1=월 … 7=일 이라 `extract(isodow)` 와 그대로 맞습니다.
- 상대방 시간표는 **지금 유효한 것만** 점선으로 겹쳐 봅니다.
  둘 다 비는 30분 칸은 민트로 표시해 약속 잡을 시간을 찾습니다.
- 같은 요일에 시간이 겹치는 항목은 열을 나눠 나란히 놓습니다 (`layoutDay`).

## 카드 접기 · 순서 · 숨김

- 접기 애니메이션은 `grid-template-rows: 0fr ↔ 1fr` 입니다. 높이를 JS 로 재지
  않으므로 내용이 바뀌어도 알아서 맞습니다. 접혀도 요약 배지는 계속 보입니다.
- 헤더의 `+` 버튼은 토글 버튼 **안이 아니라 형제**로 둡니다. 버튼 안에 버튼을
  넣는 건 유효하지 않은 HTML 이고, 형제로 두면 `stopPropagation` 없이도
  눌러도 접히지 않습니다.
- 순서 바꾸기는 설정 탭에만 있습니다. 홈에서 직접 끌면 폰에서 스크롤과
  충돌합니다. 손잡이(⠿)에서만 드래그가 시작되고, 터치는 200ms 길게 눌러야
  잡히도록 해서 손가락 스크롤을 막지 않습니다.
- 순서·접힘·숨김은 `user_preferences` 에 저장되고, 화면에 먼저 반영한 뒤
  저장합니다.

## 배경 저장 실패

서버 액션이 실패하면 rejected promise 가 React 로 올라가 에러 경계가 화면을
통째로 갈아치웁니다. 낙관적 업데이트는 이미 반영된 뒤라 과한 반응이라,
배경 저장은 전부 `quiet()`(`src/lib/save.ts`)로 감싸 콘솔에만 남깁니다.

## 친구 기록 보기

`/?who=partner` 로 상대방 기록을 봅니다.

- 화면 테마는 로그인 계정이 아니라 **지금 보고 있는 사람**을 따라갑니다.
  moonlight 계정에서 친구 기록을 열면 aqua 로 넘어갑니다.
- 루트 레이아웃은 `searchParams` 를 볼 수 없어 로그인 유저 테마로 `<html>` 을
  그립니다. 친구 기록일 때는 페이지가 본문보다 먼저 실행되는 인라인 스크립트로
  바로잡아, 새로고침해도 깜빡이지 않습니다.
- 배경 그라데이션은 `ThemeBackdrop` 이 두 겹으로 깔고 opacity 를 교차시킵니다.
  `background-image` 는 CSS transition 이 안 먹어서 한 겹으로는 뚝 끊깁니다.
- 친구 기록은 읽기 전용입니다. 입력창·추가·삭제·증감 버튼이 모두 빠지고,
  발바닥 체크도 버튼이 아니라 표시로만 그립니다.
- 카드 순서·접힘·숨김은 **보는 사람(나)** 의 설정을 그대로 씁니다.

## 관심 뉴스

`GET /api/news?q=<키워드>` 가 구글 뉴스 RSS 를 **서버에서** 받아 JSON 으로
돌려줍니다. 브라우저가 직접 부르면 CORS 에 막히지만 서버 라우트는 그럴 일이
없어서, 프로토타입에서 쓰던 외부 변환 서비스가 필요 없어졌습니다. API 키도
없습니다.

- 같은 키워드는 10분 캐시(`next: { revalidate: 600 }`)라 여닫아도 매번
  구글을 때리지 않습니다.
- 파싱은 `src/lib/news.ts` 의 작은 파서가 합니다. CDATA, HTML 엔티티(`&amp;`,
  `&#48324;`), 제목 끝의 " - 언론사" 접미사, 링크 없는 항목을 처리합니다.
- 로그인한 두 사람만 부를 수 있습니다. 미들웨어가 `/api/*` 에는 로그인
  화면으로 보내는 대신 401 JSON 을 돌려줍니다.
- 실패하면 카드에 안내와 함께 구글 뉴스로 바로 가는 링크를 띄웁니다.

## 배포

`master` 에 푸시하면 Vercel 이 자동으로 다시 배포합니다.

| 환경변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 |
| `NEXT_PUBLIC_SITE_URL` | **선택**. 비워두면 요청 헤더에서 추론합니다 |

`NEXT_PUBLIC_SITE_URL` 은 매직링크가 돌아올 주소인데, 배포 주소는 배포를
해봐야 나옵니다. 그래서 `siteOrigin()`(`src/lib/auth.ts`)이 값이 없으면
`x-forwarded-host` / `x-forwarded-proto` 에서 추론하도록 해뒀습니다.
그냥 비워두는 쪽을 권합니다 — 프리뷰 배포에서도 알아서 맞습니다.
