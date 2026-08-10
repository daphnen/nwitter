import { createClient } from "@/lib/supabase/server";

/** 서버 액션 공통: 로그인한 사용자와 Supabase 클라이언트를 함께 돌려줍니다. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요해요.");
  return { supabase, userId: user.id };
}
