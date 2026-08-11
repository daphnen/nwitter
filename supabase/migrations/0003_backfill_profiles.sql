-- ============================================================================
--  profiles / user_preferences 빠진 행 채우기
--
--  실행 방법: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--  몇 번을 돌려도 결과가 같습니다 (이미 있는 행은 건드리지 않습니다).
--
--  왜 필요한가
--    handle_new_user() 트리거는 auth.users 에 행이 "새로 들어올 때"만 돕니다.
--    트리거를 만들기 전에 이미 만들어져 있던 계정은 profiles 행이 없습니다.
--    profiles 행이 없으면 그 사람은 아무것도 저장할 수 없습니다.
--    timetables.user_id 를 비롯한 모든 표가 profiles(id) 를 참조하기 때문에
--    저장할 때마다 외래키(23503)에서 막힙니다.
-- ============================================================================


-- [1] profiles 채우기 ---------------------------------------------------------
--  on conflict 에 대상을 적지 않은 이유: id 뿐 아니라 email 에도 unique 가
--  걸려 있습니다. 대상을 id 로 못박으면 email 이 겹칠 때 문 전체가 실패합니다.

insert into public.profiles (id, email, display_name, theme)
select
  u.id,
  u.email,
  coalesce(nullif(a.display_name, ''), split_part(u.email, '@', 1)),
  coalesce(a.theme, 'moonlight')
from auth.users u
left join public.allowed_emails a on lower(a.email) = lower(u.email)
where u.email is not null
on conflict do nothing;


-- [2] user_preferences 채우기 -------------------------------------------------
--  카드 순서·접힘·다크모드가 저장되는 곳입니다. 없으면 기본값으로 만듭니다.

insert into public.user_preferences (user_id)
select id from auth.users
on conflict do nothing;


-- [3] 결과 확인 ---------------------------------------------------------------
--  두 사람 다 profile_ok, prefs_ok 가 true 여야 합니다.
--  auth_id 와 profile_id 가 서로 달라도 안 됩니다.

select
  u.email,
  u.id                as auth_id,
  p.id                as profile_id,
  (p.id is not null)  as profile_ok,
  (w.user_id is not null) as prefs_ok,
  p.display_name,
  p.theme
from auth.users u
left join public.profiles p         on p.id = u.id
left join public.user_preferences w on w.user_id = u.id
order by u.created_at;
