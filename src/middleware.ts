import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 파일과 이미지 최적화 경로를 제외한 모든 요청.
     *
     * sw.js / offline.html 은 PWA 용입니다. 로그인 검사에 걸리면
     * 서비스워커가 /login 의 HTML 을 받아 등록에 실패하므로 빼둡니다.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
