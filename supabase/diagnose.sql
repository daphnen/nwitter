-- ============================================================================
--  "한쪽 계정에서만 저장이 안 돼요" 를 찾는 점검용 쿼리
--
--  실행 방법: Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run
--  아무것도 고치지 않습니다. 읽기만 합니다.
-- ============================================================================


-- [1] 두 사람이 제대로 만들어져 있나 -----------------------------------------
--  auth.users 의 id 와 profiles 의 id 가 반드시 같아야 합니다.
--  profiles 가 없으면(profile_ok = false) 그 사람은 아무것도 저장할 수 없습니다.
--  timetables.user_id 가 profiles 를 참조하기 때문입니다.

select
  u.email,
  u.id                       as auth_id,
  p.id                       as profile_id,
  (p.id is not null)         as profile_ok,
  p.display_name,
  p.theme,
  u.last_sign_in_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;


-- [2] 화이트리스트와 실제 계정이 맞물려 있나 ---------------------------------
--  in_auth 가 false 면 그 주소로는 아직 로그인한 적이 없다는 뜻입니다.

select
  a.email,
  a.display_name,
  a.theme,
  exists (select 1 from auth.users u where lower(u.email) = lower(a.email)) as in_auth
from public.allowed_emails a
order by a.email;


-- [3] 시간표가 사람별로 몇 개나 들어가 있나 -----------------------------------
--  한쪽만 0 이면 저장이 실제로 막혀 있는 것입니다.

select
  p.display_name,
  p.email,
  count(distinct t.id)  as 시간표수,
  count(i.id)           as 항목수
from public.profiles p
left join public.timetables      t on t.user_id = p.id
left join public.timetable_items i on i.user_id = p.id
group by p.id, p.display_name, p.email
order by p.email;


-- [4] 시간표 표에 RLS 정책이 다 붙어 있나 -------------------------------------
--  timetables / timetable_items 마다 _select 와 _write_own 두 줄이 나와야 합니다.
--  안 나오면 0002_timetable.sql 이 끝까지 실행되지 않은 것입니다.

select
  tablename,
  policyname,
  cmd,
  qual        as using_조건,
  with_check  as withcheck_조건
from pg_policies
where schemaname = 'public'
  and tablename in ('timetables', 'timetable_items')
order by tablename, policyname;


-- [5] RLS 자체가 켜져 있나 ----------------------------------------------------

select relname as 표, relrowsecurity as rls_켜짐
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('timetables', 'timetable_items', 'profiles');


-- [6] 상대방 입장에서 실제로 저장이 되는지 흉내내보기 -------------------------
--  아래 이메일을 "저장이 안 되는 쪽" 주소로 바꾸고 실행하세요.
--  성공하면 넣었다가 바로 지웁니다. 실패하면 진짜 이유가 에러로 뜹니다.
--
--  (한 줄씩이 아니라 do 블록 전체를 함께 실행해야 합니다)

do $$
declare
  target_email text := 'partner@example.com';   -- ← 여기를 바꾸세요
  uid uuid;
  new_id uuid;
begin
  select id into uid from auth.users where lower(email) = lower(target_email);

  if uid is null then
    raise notice '그 이메일로 만들어진 계정이 없습니다: %', target_email;
    return;
  end if;

  insert into public.timetables (user_id, name, days)
  values (uid, '__점검용__', 'mon_fri')
  returning id into new_id;

  insert into public.timetable_items
    (timetable_id, user_id, title, weekday, start_time, end_time)
  values (new_id, uid, '__점검용__', 1, '09:00', '10:00');

  raise notice '저장 자체는 됩니다. 표·제약조건 문제는 아닙니다.';

  delete from public.timetables where id = new_id;   -- 항목도 같이 지워집니다
  raise notice '점검용 데이터는 지웠습니다.';
exception when others then
  raise notice '여기서 막힙니다 → [%] %', sqlstate, sqlerrm;
end $$;


-- ============================================================================
--  [7] 푸시 알림이 안 올 때
-- ============================================================================

-- 누가 어느 기기에서 알림을 켰는지.
-- 알림을 "받을" 사람의 줄이 있어야 합니다. 보내는 사람 것만 있으면 안 옵니다.
select
  p.display_name,
  p.email,
  count(s.id)                       as 등록된_기기수,
  max(s.created_at)                 as 마지막_등록,
  max(s.last_success_at)            as 마지막_발송성공
from public.profiles p
left join public.push_subscriptions s on s.user_id = p.id
group by p.id, p.display_name, p.email
order by p.email;


-- 상대가 "채팅을 보고 있는 중"으로 판정되고 있는지.
-- 서버는 chat_read_at 이 75초 안쪽이면 알림을 건너뜁니다.
select
  p.display_name,
  w.chat_read_at,
  round(extract(epoch from (now() - w.chat_read_at)))  as 몇초전에_봤나,
  (now() - w.chat_read_at) < interval '75 seconds'     as 지금_보는중으로_판정
from public.profiles p
join public.user_preferences w on w.user_id = p.id
order by p.email;
