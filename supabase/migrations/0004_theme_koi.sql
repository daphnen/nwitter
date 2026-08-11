-- ============================================================================
--  세 번째 테마 "koi" 허용
--
--  실행 방법: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--  몇 번을 돌려도 결과가 같습니다.
--
--  profiles.theme 과 allowed_emails.theme 에 걸려 있는 check 제약이
--  'moonlight' 와 'aqua' 만 허용하고 있습니다. 이걸 풀어주지 않으면
--  설정에서 koi 를 골라도 저장이 조용히 막힙니다.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme in ('moonlight', 'aqua', 'koi'));

alter table public.allowed_emails
  drop constraint if exists allowed_emails_theme_check;

alter table public.allowed_emails
  add constraint allowed_emails_theme_check
  check (theme in ('moonlight', 'aqua', 'koi'));


-- 확인 --------------------------------------------------------------------
--  세 이름이 다 보이면 성공입니다.

select
  conrelid::regclass as 표,
  pg_get_constraintdef(oid) as 제약
from pg_constraint
where conname in ('profiles_theme_check', 'allowed_emails_theme_check');
