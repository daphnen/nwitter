# 🐱 나만의 대시보드

일정 · 목표 · 아침/점심/저녁 기록 · 하루 일과 · 관심 뉴스를 한 화면에서 관리하는
흰 고양이 테마 개인 대시보드입니다.

## 바로 시작하기

```bash
npm install
npm start
```

끝입니다. **DB 가입 없이도 바로 동작해요.** 기본은 브라우저 `localStorage` 에
저장되고, 나중에 Supabase 정보를 `.env` 에 넣으면 화면 코드는 그대로 둔 채
무료 클라우드 DB 로 옮겨갑니다.

## 담긴 기능

| 카드 | 하는 일 |
| --- | --- |
| 🗓 오늘의 일정 | 시간 + 할 일 추가, 발바닥 체크로 완료 표시 |
| 🍚 오늘 뭐 먹었나요 | 아침·점심·저녁 각각 메모 + 기분 이모지 |
| 🐾 하루 일과 기록 | 시간순 타임라인, 일/공부/운동 같은 태그 |
| 🎯 나의 목표 | 목표 횟수와 진행 막대 (예: 물 8잔 마시기) |
| 📰 관심 뉴스 | 관심 키워드별 최신 기사 목록 |

날짜 이동 버튼(`‹ ›`)으로 어제·내일 기록도 볼 수 있고,
🌙 밤 모드로 배색을 바꿀 수 있습니다.

## 무료 DB(Supabase) 연결하기

1. [supabase.com](https://supabase.com) 에서 가입하고 새 프로젝트를 만듭니다.
   (무료 플랜: Postgres 500MB, 카드 등록 불필요)
2. 왼쪽 메뉴 **SQL Editor** 에서 [`db/schema.sql`](db/schema.sql) 내용을
   붙여넣고 **Run** 합니다. 표 5개가 만들어집니다.
3. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사합니다.
4. 프로젝트 루트에 `.env` 파일을 만들고 채웁니다.

   ```bash
   cp .env.example .env
   ```

   ```
   REACT_APP_SUPABASE_URL=https://xxxxxxxx.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

5. `npm start` 를 다시 실행합니다. 헤더 배지가 **☁️ Supabase 연결됨** 으로 바뀌면 성공입니다.

> 기존에 브라우저에 쌓아둔 기록은 자동으로 옮겨가지 않습니다.
> 옮기고 싶다면 개발자 도구 콘솔에서 `localStorage` 의
> `cat-dashboard:*` 값을 확인해 Supabase 에 직접 넣어주세요.

### ⚠️ 보안에 대해

`db/schema.sql` 의 기본 정책은 **혼자 쓰는 개인 대시보드** 기준이라,
anon 키를 아는 사람이면 읽고 쓸 수 있습니다. 로컬에서 쓰거나
주소를 공개하지 않는다면 충분하지만, 인터넷에 배포한다면 로그인을 붙이세요.

### 로그인 붙이기 (나중에)

Supabase Auth 를 켜고 각 표에 `user_id uuid default auth.uid()` 컬럼을 추가한 뒤,
정책을 `using (auth.uid() = user_id)` 로 바꾸면 계정별로 데이터가 분리됩니다.
`src/lib/supabaseAdapter.js` 의 `Authorization` 헤더에 anon 키 대신
로그인 세션의 `access_token` 을 넣어주면 됩니다.

## 뉴스는 어디서 오나요

API 키 없이 **Google 뉴스 RSS** 를 키워드로 검색해서 가져옵니다.
브라우저에서 RSS 를 직접 부르면 CORS 에 막히기 때문에
무료 공개 변환 서비스(`api.rss2json.com`)를 거칩니다.

요청량이 많아 제한에 걸리거나 직접 프록시를 운영하고 싶다면
`.env` 의 `REACT_APP_RSS_PROXY` 를 바꿔 끼우면 됩니다.
(Supabase Edge Function 으로 직접 만드는 것도 좋은 방법이에요.)

## 폴더 구조

```
src/
├── App.js                  화면 골격 · 날짜 이동 · 테마 토글
├── index.css               흰 고양이 테마 색·글꼴 토큰 (낮/밤 모드)
├── App.css                 레이아웃과 컴포넌트 스타일
├── components/
│   ├── Cat.jsx             고양이 마스코트 · 발바닥 아이콘 (SVG)
│   ├── Card.jsx            고양이 귀가 달린 카드 껍데기
│   ├── ScheduleCard.jsx    🗓 일정
│   ├── MealsCard.jsx       🍚 아침·점심·저녁
│   ├── RoutineCard.jsx     🐾 하루 일과 타임라인
│   ├── GoalsCard.jsx       🎯 목표
│   └── NewsCard.jsx        📰 관심 뉴스
├── hooks/
│   └── useCollection.js    표 하나를 다루는 공통 훅 (조회·추가·수정·삭제)
└── lib/
    ├── db.js               .env 유무로 어댑터 선택
    ├── localAdapter.js     localStorage 저장소
    ├── supabaseAdapter.js  Supabase REST 저장소 (의존성 없음)
    ├── news.js             Google 뉴스 RSS
    └── date.js             날짜 유틸
```

두 저장소는 **같은 인터페이스**(`list / insert / update / remove`)를 가지므로
컴포넌트는 어느 쪽이 붙어 있는지 몰라도 됩니다.

## 배포

```bash
npm run build
```

`build/` 폴더를 Vercel · Netlify · Cloudflare Pages 같은 무료 호스팅에 올리면 됩니다.
환경변수(`REACT_APP_*`)는 호스팅 대시보드에도 똑같이 넣어주세요.

## 다음에 더해보면 좋은 것

- 주간/월간 달력 뷰와 기록 되돌아보기 통계
- 목표 달성률 그래프 (연속 며칠 성공했는지)
- 날씨 카드, 오늘의 한 줄 일기
- PWA 로 만들어 휴대폰 홈 화면에 추가하기
