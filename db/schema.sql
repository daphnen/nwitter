-- ============================================================
--  나만의 대시보드 — Supabase(무료 Postgres) 스키마
--  Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요.
-- ============================================================

-- 일정 -------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time       text default '',
  title      text not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (date);

-- 목표 -------------------------------------------------------
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  emoji      text default '🎯',
  target     integer not null default 1,
  progress   integer not null default 0,
  created_at timestamptz not null default now()
);

-- 아침·점심·저녁 기록 (하루 한 끼당 한 줄) --------------------
create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  slot       text not null check (slot in ('breakfast', 'lunch', 'dinner')),
  text       text default '',
  mood       text default '',
  created_at timestamptz not null default now(),
  unique (date, slot)
);
create index if not exists meals_date_idx on public.meals (date);

-- 하루 일과 기록 ---------------------------------------------
create table if not exists public.logs (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time       text default '',
  text       text not null,
  tag        text default '🐾',
  created_at timestamptz not null default now()
);
create index if not exists logs_date_idx on public.logs (date);

-- 관심 뉴스 키워드 -------------------------------------------
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
--  접근 정책 (RLS)
--
--  ⚠️ 아래는 "혼자 쓰는 개인 대시보드" 기준의 가장 간단한 설정입니다.
--     anon 키를 아는 사람은 누구나 읽고 쓸 수 있으니,
--     배포한 주소와 키를 공개하지 마세요.
--     여러 사람이 쓰거나 공개 배포할 계획이라면 README 의
--     "로그인 붙이기" 절을 참고해 user_id 기반 정책으로 바꾸세요.
-- ============================================================

alter table public.events enable row level security;
alter table public.goals  enable row level security;
alter table public.meals  enable row level security;
alter table public.logs   enable row level security;
alter table public.topics enable row level security;

do $$
declare t text;
begin
  foreach t in array array['events', 'goals', 'meals', 'logs', 'topics'] loop
    execute format('drop policy if exists "personal access" on public.%I', t);
    execute format(
      'create policy "personal access" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
