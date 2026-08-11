-- ============================================================================
--  채팅 화면을 "지금 보고 있는지" 기록할 자리
--
--  실행 방법: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--  몇 번을 돌려도 결과가 같습니다.
--
--  왜 필요한가
--    지금까지는 chat_read_at(마지막으로 읽은 시각)이 최근이면 "보는 중"으로
--    짐작했습니다. 그래서 채팅을 떠나도 그 시각이 낡을 때까지 알림이 안
--    왔습니다. 떠났다는 사실을 직접 적어두면 그 즉시 알림이 살아납니다.
--
--    한 칸에 두 가지 뜻(읽은 지점 / 보고 있는 중)을 담고 있던 걸 나눕니다.
--    - chat_read_at     : 여기까지 읽음. 하단 탭의 안 읽은 점에 씁니다
--    - chat_active_until : 이 시각까지는 보고 있는 중. 지나면 자동으로 풀립니다
--
--    "언제까지"로 적는 이유: 앱이 갑자기 꺼져 아무 신호도 못 보내도 저절로
--    풀립니다. "언제부터"로 적으면 영원히 보고 있는 상태로 남습니다.
-- ============================================================================

alter table public.user_preferences
  add column if not exists chat_active_until timestamptz;


-- 확인 --------------------------------------------------------------------
select
  p.display_name,
  w.chat_read_at,
  w.chat_active_until,
  coalesce(w.chat_active_until > now(), false) as 지금_보는중
from public.profiles p
join public.user_preferences w on w.user_id = p.id
order by p.email;
