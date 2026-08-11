import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "./env";

/**
 * RLS 를 우회하는 서버 전용 클라이언트.
 *
 * 상대방에게 알림을 보내려면 상대방의 구독 키를 읽어야 합니다. 그런데
 * push_subscriptions 의 정책은 "본인 것만"이라 로그인 세션으로는 못 읽습니다.
 * 정책을 열어 서로 읽게 할 수도 있지만, 그러면 한쪽이 상대 기기로 아무 알림이나
 * 쏠 수 있습니다. 구독 키가 브라우저에 닿는 경로를 아예 만들지 않는 쪽을
 * 택했습니다.
 *
 * 이 파일은 절대 클라이언트 컴포넌트에서 import 하면 안 됩니다.
 * service_role 키는 무엇이든 할 수 있습니다.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!SUPABASE_URL || !key) return null;

  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
