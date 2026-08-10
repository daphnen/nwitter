import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * createServerClient 의 cookies 옵션이 유니온 타입이라 setAll 의 인자가
 * 문맥 추론되지 않습니다. 그래서 명시적으로 붙여줍니다.
 */
type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/** 로그인 없이 열 수 있는 경로 */
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * 요청마다 세션 쿠키를 갱신하고, 미로그인 사용자를 /login 으로 보냅니다.
 * @supabase/ssr 규칙상 여기서 만든 response 를 그대로 반환해야
 * 갱신된 쿠키가 유실되지 않습니다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // 환경변수가 없으면 인증을 건너뜁니다. 페이지에서 안내 문구를 띄웁니다.
    return response;
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getSession() 이 아니라 getUser() 여야 합니다. 쿠키를 신뢰하지 않고
  // Auth 서버에 실제로 검증을 요청합니다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
