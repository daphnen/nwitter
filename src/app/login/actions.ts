"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { siteOrigin } from "@/lib/auth";

export type LoginState = {
  ok: boolean;
  message: string;
} | null;

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "/");

  if (!email) {
    return { ok: false, message: "이메일을 입력해 주세요." };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      message: ".env.local 에 Supabase 주소와 키를 넣어야 로그인할 수 있어요.",
    };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // 회원가입은 없습니다. 미리 만들어둔 계정만 로그인됩니다.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const reason = error.message.toLowerCase();

    // 화이트리스트 밖 이메일이면 Supabase 가 "Signups not allowed" 를 돌려줍니다.
    if (reason.includes("signups not allowed") || error.status === 422) {
      return {
        ok: false,
        message: "등록되지 않은 이메일이에요. 둘 중 하나의 주소로 로그인해 주세요 🐾",
      };
    }

    // Supabase 내장 메일 발송기는 시간당 몇 통으로 묶여 있습니다.
    // 원문("email rate limit exceeded")만 보면 원인을 알기 어려워 풀어씁니다.
    if (reason.includes("rate limit") || error.status === 429) {
      return {
        ok: false,
        message:
          "메일을 너무 자주 보냈어요. 잠시 뒤 다시 시도해 주세요. (계속 이러면 Supabase 에 SMTP 를 연결해야 해요)",
      };
    }

    return {
      ok: false,
      message: `로그인 메일을 보내지 못했어요: ${error.message}`,
    };
  }

  return {
    ok: true,
    message: "메일함을 확인해 주세요. 링크를 누르면 바로 들어와요 🐾",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
