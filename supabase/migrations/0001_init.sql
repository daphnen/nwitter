-- ============================================================================
--  2인용 공유 데일리 대시보드 — 초기 스키마
--
--  실행 방법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
--  ⚠️ 실행 전에 맨 아래 [11] allowed_emails 의 이메일 2개를 실제 값으로 바꾸세요.
--     그 다음에 Auth → Users 에서 사용자를 생성해야 합니다. (순서 중요)
--
--  날짜는 모두 KST(Asia/Seoul) 기준의 date 값으로 저장합니다.
-- ============================================================================


-- [1] 공통 헬퍼 ---------------------------------------------------------------

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 서울 기준 오늘 날짜
create or replace function public.kst_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- 목표 반복 주기의 시작일 (일간 = 그 날, 주간 = 그 주 월요일)
create or replace function public.period_start(p_period text, p_date date)
returns date
language sql
immutable
as $$
  select case
    when p_period = 'weekly' then (p_date - ((extract(isodow from p_date)::int - 1)))::date
    else p_date
  end;
$$;


-- [2] profiles ---------------------------------------------------------------
-- auth.users 와 1:1. theme 이 UI 스킨을 결정합니다.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  display_name  text not null default '',
  avatar_emoji  text not null default '🐱',
  theme         text not null default 'moonlight'
                  check (theme in ('moonlight', 'aqua')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 로그인한 사람이 이 앱의 구성원(=profiles 에 있는 2명)인지.
-- security definer 라 RLS 를 우회합니다. profiles 정책에서 자기 자신을
-- 다시 조회하는 무한 재귀를 막기 위해 반드시 definer 여야 합니다.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;


-- [3] daily_logs — 아침/점심/저녁 기록 ----------------------------------------
-- 하루 한 줄. 끼니별 텍스트 + 기분 이모지.

create table if not exists public.daily_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date            date not null,
  breakfast       text not null default '',
  breakfast_mood  text not null default '',
  lunch           text not null default '',
  lunch_mood      text not null default '',
  dinner          text not null default '',
  dinner_mood     text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, date desc);

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();


-- [4] schedule_items — 홈의 "오늘의 일정" ------------------------------------

create table if not exists public.schedule_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date not null,
  at_time     time,                      -- null 이면 시간 미정
  title       text not null check (length(btrim(title)) > 0),
  done        boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists schedule_items_user_date_idx
  on public.schedule_items (user_id, date, at_time nulls last, sort_order);

drop trigger if exists schedule_items_set_updated_at on public.schedule_items;
create trigger schedule_items_set_updated_at
  before update on public.schedule_items
  for each row execute function public.set_updated_at();


-- [5] tags — 일과 기록 태그 ---------------------------------------------------
-- user_id 가 null 이면 둘 다 쓰는 기본 태그.
-- color_key 는 테마 토큰 이름입니다. 컴포넌트에서 색을 하드코딩하지 않기 위해
-- 실제 색상값이 아니라 키만 저장합니다.

create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  name        text not null,
  emoji       text not null default '🏷️',
  color_key   text not null default 'blue'
                check (color_key in ('blue','orange','purple','green','yellow','pink','mint','gray')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create unique index if not exists tags_default_name_uniq
  on public.tags (name) where user_id is null;

create unique index if not exists tags_user_name_uniq
  on public.tags (user_id, name) where user_id is not null;

insert into public.tags (user_id, name, emoji, color_key, sort_order) values
  (null, '일',     '💼', 'blue',   1),
  (null, '공부',   '📖', 'purple', 2),
  (null, '운동',   '🏃', 'mint',   3),
  (null, '휴식',   '☕',  'orange', 4),
  (null, '집안일', '🧺', 'yellow', 5),
  (null, '사람',   '💬', 'pink',   6)
on conflict do nothing;


-- [6] timeline_entries — 하루 일과 타임라인 ----------------------------------

create table if not exists public.timeline_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date not null,
  at_time     time not null,
  content     text not null check (length(btrim(content)) > 0),
  tag_id      uuid references public.tags(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists timeline_entries_user_date_idx
  on public.timeline_entries (user_id, date, at_time);

drop trigger if exists timeline_entries_set_updated_at on public.timeline_entries;
create trigger timeline_entries_set_updated_at
  before update on public.timeline_entries
  for each row execute function public.set_updated_at();


-- [7] goals / goal_logs — 목표와 진행도 ---------------------------------------
-- 진행도는 goals 에 두지 않고 기간별 goal_logs 에 둡니다.
-- 이렇게 하면 자정/주초 리셋에 크론이 필요 없습니다.
-- "오늘의 진행도" = period_start(period, 오늘) 인 행을 읽으면 끝.

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (length(btrim(title)) > 0),
  emoji       text not null default '🎯',
  target      integer not null default 1 check (target > 0),
  period      text not null default 'daily' check (period in ('daily', 'weekly')),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id, active, sort_order);

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create table if not exists public.goal_logs (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  period_start  date not null,
  progress      integer not null default 0 check (progress >= 0),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (goal_id, period_start)
);

create index if not exists goal_logs_user_period_idx
  on public.goal_logs (user_id, period_start desc);

drop trigger if exists goal_logs_set_updated_at on public.goal_logs;
create trigger goal_logs_set_updated_at
  before update on public.goal_logs
  for each row execute function public.set_updated_at();


-- [8] events — 캘린더 일정 ----------------------------------------------------
-- owner_id 가 null 이면 "공동" 일정.
-- "나/친구" 라벨은 보는 사람 기준이라 DB 에 저장하지 않고 화면에서 계산합니다.

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (length(btrim(title)) > 0),
  description text not null default '',
  start_date  date not null,
  end_date    date,                       -- null 이면 하루짜리
  start_time  time,                       -- all_day = false 일 때만 사용
  end_time    time,
  all_day     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists events_start_date_idx on public.events (start_date);
create index if not exists events_owner_idx on public.events (owner_id);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();


-- [9] news_keywords — 관심 뉴스 키워드 ---------------------------------------

create table if not exists public.news_keywords (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  keyword     text not null check (length(btrim(keyword)) > 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, keyword)
);


-- [10] user_preferences — 카드 순서 / 접힘 / 숨김 -----------------------------
-- 카드 키: schedule | meals | timeline | goals | news

create table if not exists public.user_preferences (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  card_order       jsonb not null default '["schedule","meals","timeline","goals","news"]'::jsonb,
  collapsed_cards  jsonb not null default '[]'::jsonb,
  hidden_cards     jsonb not null default '[]'::jsonb,
  dark_mode        boolean not null default false,
  updated_at       timestamptz not null default now()
);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();


-- [11] 로그인 화이트리스트 ----------------------------------------------------
-- ⚠️ 아래 두 줄의 이메일을 실제 값으로 바꾸세요. 여기 없는 이메일은
--    Auth 에서 사용자를 만들어도 트리거가 막습니다.

create table if not exists public.allowed_emails (
  email         text primary key,
  display_name  text not null default '',
  theme         text not null default 'moonlight'
                  check (theme in ('moonlight', 'aqua'))
);

insert into public.allowed_emails (email, display_name, theme) values
  ('me@example.com',      '나',   'moonlight'),
  ('partner@example.com', '자기', 'aqua')
on conflict (email) do nothing;

-- 사용자가 만들어질 때 화이트리스트 확인 + profiles/user_preferences 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed public.allowed_emails%rowtype;
begin
  select * into allowed
  from public.allowed_emails
  where lower(email) = lower(new.email);

  if not found then
    raise exception '허용되지 않은 이메일입니다: %', new.email
      using errcode = '42501';
  end if;

  insert into public.profiles (id, email, display_name, theme)
  values (
    new.id,
    new.email,
    coalesce(nullif(allowed.display_name, ''), split_part(new.email, '@', 1)),
    allowed.theme
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- [12] RLS --------------------------------------------------------------------
--  읽기: 구성원 2명은 서로 다 볼 수 있음
--  쓰기: 본인 것만 (events 의 공동 일정은 예외 — 아래 주석 참고)

alter table public.profiles         enable row level security;
alter table public.daily_logs       enable row level security;
alter table public.schedule_items   enable row level security;
alter table public.tags             enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.goals            enable row level security;
alter table public.goal_logs        enable row level security;
alter table public.events           enable row level security;
alter table public.news_keywords    enable row level security;
alter table public.user_preferences enable row level security;
alter table public.allowed_emails   enable row level security;

-- profiles: 서로 읽기, 본인 행만 수정 (테마 변경 등)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_member());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_id 를 가진 개인 데이터 테이블들: 읽기 공유 / 쓰기 본인만
do $$
declare t text;
begin
  foreach t in array array[
    'daily_logs', 'schedule_items', 'timeline_entries',
    'goals', 'goal_logs', 'news_keywords'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (public.is_member())',
      t, t);

    execute format('drop policy if exists %I_write_own on public.%I', t, t);
    execute format(
      'create policy %I_write_own on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t);
  end loop;
end $$;

-- tags: 기본 태그(user_id is null)는 모두 읽기, 개인 태그는 본인만 쓰기
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select to authenticated using (public.is_member());

drop policy if exists tags_write_own on public.tags;
create policy tags_write_own on public.tags
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- events: 둘 다 읽기.
-- 쓰기는 (내 일정) 또는 (내가 만든 일정) 또는 (공동 일정 = owner_id is null).
-- 공동 일정을 한쪽만 고치게 하려면 아래 `or owner_id is null` 을 빼세요.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated using (public.is_member());

drop policy if exists events_write on public.events;
create policy events_write on public.events
  for all to authenticated
  using (
    public.is_member()
    and (owner_id = auth.uid() or created_by = auth.uid() or owner_id is null)
  )
  with check (
    public.is_member()
    and (owner_id = auth.uid() or created_by = auth.uid() or owner_id is null)
  );

-- user_preferences: 개인 설정이므로 본인 것만 읽고 씀
drop policy if exists user_preferences_own on public.user_preferences;
create policy user_preferences_own on public.user_preferences
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- allowed_emails: 읽기만. 수정은 SQL Editor 에서.
drop policy if exists allowed_emails_select on public.allowed_emails;
create policy allowed_emails_select on public.allowed_emails
  for select to authenticated using (public.is_member());


-- [13] Realtime ---------------------------------------------------------------
-- 상대방이 기록을 남기면 내 화면에도 바로 반영되도록.

do $$
declare t text;
begin
  foreach t in array array[
    'daily_logs', 'schedule_items', 'timeline_entries',
    'goals', 'goal_logs', 'events', 'news_keywords', 'profiles'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- Realtime 이 변경 전 행을 함께 보내도록 (삭제 이벤트 처리에 필요)
alter table public.daily_logs       replica identity full;
alter table public.schedule_items   replica identity full;
alter table public.timeline_entries replica identity full;
alter table public.goals            replica identity full;
alter table public.goal_logs        replica identity full;
alter table public.events           replica identity full;
alter table public.news_keywords    replica identity full;
