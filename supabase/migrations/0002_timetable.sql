-- ============================================================================
--  시간표 (에브리타임 스타일 주간 반복 고정 일정)
--
--  실행 방법: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--  0001_init.sql 을 먼저 실행한 상태여야 합니다.
-- ============================================================================


-- [1] timetables — 시간표 한 벌 -----------------------------------------------
--  "2026 2학기", "운동 루틴" 처럼 여러 개를 두고 골라 봅니다.
--
--  유효기간(start_date ~ end_date)이 오늘을 품고 있으면 "지금 유효한 시간표"로
--  보고, 홈 카드와 시간표 탭 기본값에 씁니다. 기간이 지나면 자동으로 빠집니다.
--  둘 다 null 이면 무기한(항상 유효).

create table if not exists public.timetables (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  start_date  date,
  end_date    date,
  /* 가로축에 주말을 포함할지 */
  days        text not null default 'mon_fri' check (days in ('mon_fri', 'mon_sun')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create index if not exists timetables_user_idx
  on public.timetables (user_id, start_date, end_date);

drop trigger if exists timetables_set_updated_at on public.timetables;
create trigger timetables_set_updated_at
  before update on public.timetables
  for each row execute function public.set_updated_at();


-- [2] timetable_items — 격자에 놓이는 칸 --------------------------------------
--  월/수 같이 여러 요일에 걸치는 수업은 요일마다 한 줄씩 만듭니다.
--  weekday 는 ISO 기준 1=월 … 7=일 이라 extract(isodow) 와 그대로 맞습니다.
--
--  user_id 는 timetables 를 거치지 않고 RLS 를 걸기 위해 같이 둡니다.

create table if not exists public.timetable_items (
  id            uuid primary key default gen_random_uuid(),
  timetable_id  uuid not null references public.timetables(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (length(btrim(title)) > 0),
  location      text not null default '',
  weekday       smallint not null check (weekday between 1 and 7),
  start_time    time not null,
  end_time      time not null,
  color_key     text not null default 'blue'
                  check (color_key in ('blue','orange','purple','green','yellow','pink','mint','gray')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists timetable_items_timetable_idx
  on public.timetable_items (timetable_id, weekday, start_time);

create index if not exists timetable_items_user_weekday_idx
  on public.timetable_items (user_id, weekday);

drop trigger if exists timetable_items_set_updated_at on public.timetable_items;
create trigger timetable_items_set_updated_at
  before update on public.timetable_items
  for each row execute function public.set_updated_at();


-- [3] RLS — 0001 과 같은 원칙: 둘 다 읽기, 쓰기는 본인 것만 -------------------
--  상대방 시간표를 겹쳐 보려면 읽기가 열려 있어야 합니다.

alter table public.timetables      enable row level security;
alter table public.timetable_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['timetables', 'timetable_items'] loop
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


-- [4] Realtime ---------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['timetables', 'timetable_items'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

alter table public.timetables      replica identity full;
alter table public.timetable_items replica identity full;
