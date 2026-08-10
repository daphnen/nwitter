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

1. **SQL Editor** 에서 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 실행
   - 실행 전 파일 `[11]` 구역의 이메일 2개를 실제 값으로 바꾸세요
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
`data-theme` 만 바꾸면 유틸리티 색이 런타임에 따라옵니다.

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
├── components/Cat.tsx        고양이 마스코트 · 발바닥
├── lib/
│   ├── supabase/             브라우저 / 서버 / 미들웨어 클라이언트
│   ├── database.types.ts     스키마 타입
│   ├── date.ts               KST 날짜 유틸
│   └── auth.ts               세션 + 프로필 조회
└── middleware.ts             세션 갱신 · 접근 제어
```

## 진행 상황

- [x] 1단계 — Next.js 셋업 + 스키마 SQL + 인증
- [ ] 2단계 — 디자인 토큰 + 프로토타입을 moonlight 로 이관
- [ ] 3단계 — aqua 테마 + 설정에서 전환
- [ ] 4단계 — 하단 탭 + 캘린더
- [ ] 5단계 — 카드 접기 + 순서/숨김
- [ ] 6단계 — 친구 기록 토글 (테마 전환)
- [ ] 7단계 — 뉴스 RSS
- [ ] 8단계 — PWA
