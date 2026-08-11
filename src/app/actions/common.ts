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

/** 실패해도 화면이 죽지 않아야 하는 곳에서 씁니다. 로그인 안 됐으면 null. */
export async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, userId: user.id } : null;
}

/** 저장 결과. message 가 있으면 화면에 그대로 띄웁니다. */
export type SaveResult = { message?: string };

type PostgrestErrorish = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

/**
 * Supabase 는 저장에 실패해도 예외를 던지지 않고 error 를 돌려줍니다.
 * 그걸 그냥 버리면 화면에는 아무 일도 안 일어나고, 왜 안 되는지 알 길이 없습니다.
 * 서버 로그에 원문을 남기고, 화면에는 사람이 읽을 문장을 돌려줍니다.
 */
export function saveError(error: PostgrestErrorish | null): SaveResult {
  if (!error) return {};

  console.error("[저장 실패]", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  // RLS 에 막힘. 대개 세션이 풀렸거나 남의 것을 고치려 한 경우입니다.
  if (error.code === "42501" || error.message.includes("row-level security")) {
    return {
      message:
        "저장 권한이 없다고 나와요. 로그아웃했다가 다시 로그인해 보시고, 그래도 같으면 알려주세요.",
    };
  }

  // 외래키 위반: 내 프로필 행이 없을 때 납니다.
  if (error.code === "23503") {
    return {
      message: "계정 정보가 아직 준비되지 않았어요. 로그아웃 후 다시 로그인해 주세요.",
    };
  }

  return { message: `저장하지 못했어요: ${error.message}` };
}

/** 로그인이 풀렸을 때 공통 문구 */
export const NOT_SIGNED_IN: SaveResult = {
  message: "로그인이 풀렸어요. 새로고침한 뒤 다시 로그인해 주세요.",
};
