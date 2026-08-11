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
- [ ] 6단계 — 친구 기록 토글 (테마 전환)
- [ ] 7단계 — 뉴스 RSS
- [ ] 8단계 — PWA

## 임시: /design-preview

Supabase 없이 카드 배치와 테마를 눈으로 확인하기 위한 목데이터 페이지입니다.
로그인 뒤에만 열립니다.

- `/design-preview?theme=aqua&mode=dark` — 홈 화면을 팔레트별로
- `/design-preview/settings?theme=aqua` — 설정 화면
- `/design-preview/timetable` — 시간표 (`?view=calendar` 로 캘린더)

5단계까지 쓰고 지울 예정입니다.

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
