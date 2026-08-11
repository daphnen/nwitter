-- ============================================================================
--  채팅 + 웹 푸시
--
--  실행 방법: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--  0001 ~ 0004 를 먼저 실행한 상태여야 합니다.
--  몇 번을 돌려도 결과가 같습니다.
-- ============================================================================


-- [1] messages — 둘이 쓰는 방 하나 -------------------------------------------
--  방이 하나뿐이라 room_id 는 두지 않습니다. 나중에 방이 여러 개가 될 일이
--  없는 앱이고, 없는 편이 조회도 정책도 단순합니다.
--
--  seq 는 정렬·페이지네이션 전용 번호입니다. created_at 만으로 커서를 잡으면
--  같은 순간에 들어온 두 줄에서 순서가 흔들리고, 그걸 막으려면 (시각, id)
--  복합 커서를 써야 해서 조회문이 지저분해집니다. 8바이트로 그 문제를
--  통째로 없앱니다.
--
--  지우기는 실제 삭제가 아니라 deleted_at 을 채웁니다. 다만 content 는 같이
--  비웁니다. RLS 상 둘 다 모든 줄을 읽을 수 있어서, 글자를 남겨두면 상대방
--  화면에서는 "삭제된 메시지"로 보여도 실제로는 지워지지 않은 셈입니다.

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz,
  -- 살아 있는 메시지는 빈 문자열일 수 없습니다.
  constraint messages_content_not_blank
    check (deleted_at is not null or length(btrim(content)) > 0)
);

create unique index if not exists messages_seq_idx on public.messages (seq desc);
create index if not exists messages_created_idx on public.messages (created_at desc);


-- [2] 읽은 시각 ---------------------------------------------------------------
--  메시지별 읽음 표시는 하지 않습니다. 사람당 "여기까지 봤다" 한 칸이면
--  안 읽은 점(●)을 띄우는 데 충분해서 표를 따로 만들지 않았습니다.

alter table public.user_preferences
  add column if not exists chat_read_at timestamptz not null default now();


-- [3] push_subscriptions — 기기별 푸시 구독 ----------------------------------
--  같은 사람이 폰·노트북을 같이 쓸 수 있어 유저당 여러 줄을 허용합니다.
--  endpoint 는 브라우저+기기 하나를 가리키는 주소라 전체에서 유일합니다.
--  다시 구독하면 같은 endpoint 로 들어오므로 upsert 로 갱신합니다.

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  /* 어느 기기인지 사람이 알아볼 수 있게 (설정 화면에서 정리할 때 씀) */
  user_agent    text not null default '',
  created_at    timestamptz not null default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);


-- [4] RLS ---------------------------------------------------------------------

alter table public.messages           enable row level security;
alter table public.push_subscriptions enable row level security;

-- 메시지: 둘 다 읽기, 쓰기는 본인 명의로만
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.is_member());

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
  for insert to authenticated with check (sender_id = auth.uid());

-- 수정(=삭제 표시)도 본인 것만. with check 까지 걸어야 남의 명의로
-- 바꿔치기하는 걸 막습니다.
drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
  for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- 진짜 삭제는 아무도 못 합니다 (delete 정책을 안 만듭니다).

-- 푸시 구독: 남의 것은 보이지도 않습니다.
-- 상대에게 알림을 보낼 때는 서버가 service_role 로 읽습니다(RLS 우회).
-- 구독 키가 브라우저에서 닿는 경로에 아예 안 나오게 하려는 것입니다.
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- [5] Realtime ----------------------------------------------------------------

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.messages';
  exception when duplicate_object then
    null;
  end;
end $$;

alter table public.messages replica identity full;


-- 확인 ------------------------------------------------------------------------

select
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'messages')            as 메시지_정책수,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions')  as 구독_정책수,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'user_preferences'
      and column_name = 'chat_read_at')                                as 읽은시각_컬럼;
