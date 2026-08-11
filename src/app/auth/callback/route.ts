import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/auth";

/**
 * 매직링크가 최종적으로 도착하는 곳입니다.
 *
 * 두 가지 형태를 다 받습니다.
 *
 *  - token_hash : 메일 템플릿이 직접 만들어 보내는 링크. 브라우저에 미리
 *                 저장해둔 값이 필요 없어서, 메일 앱이나 카톡 인앱 브라우저로
 *                 열어도 됩니다. 이쪽을 씁니다.
 *  - code       : Supabase 기본 링크(PKCE). 링크를 요청한 그 브라우저에서
 *                 열어야만 됩니다. 예전 메일이 남아 있을 수 있어 같이 둡니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // 프록시 뒤(Vercel)에서는 nextUrl.origin 이 내부 주소일 수 있습니다.
  const origin = await siteOrigin();

  const failure = (raw: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(explain(raw))}`);

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return failure("링크가 올바르지 않아요. 메일에 온 링크를 다시 눌러 주세요.");
}

/**
 * Supabase 가 주는 영어 메시지는 원인을 짐작하기 어렵습니다.
 * 무엇을 하면 되는지까지 적어줍니다.
 */
function explain(raw: string): string {
  const reason = raw.toLowerCase();

  // PKCE. 링크를 요청한 브라우저와 링크를 연 브라우저가 다를 때 납니다.
  // 메일 앱·카톡에서 링크를 누르면 인앱 브라우저로 열려서 이 경우가 됩니다.
  if (reason.includes("code verifier") || reason.includes("code challenge")) {
    return "링크를 요청한 브라우저에서 열어야 해요. 메일에 온 링크를 길게 눌러 주소를 복사한 뒤, 로그인 메일을 요청했던 브라우저 주소창에 붙여넣어 주세요.";
  }

  if (reason.includes("expired")) {
    return "링크가 만료됐어요. 아래에서 새 링크를 받아 주세요.";
  }

  if (reason.includes("already been used") || reason.includes("invalid")) {
    return "이미 쓴 링크이거나 만료된 링크예요. 메일함에서 가장 최근에 온 링크를 눌러 주세요.";
  }

  return raw;
}
