import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import type { Profile } from "@/lib/database.types";

export type SessionState =
  | { status: "no-env" }
  | { status: "signed-out" }
  /** 로그인은 됐지만 profiles 에 행이 없음 = 화이트리스트 밖 */
  | { status: "no-profile"; email: string }
  | { status: "ok"; profile: Profile };

export async function getSessionState(): Promise<SessionState> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { status: "no-env" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "signed-out" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { status: "no-profile", email: user.email ?? "" };

  return { status: "ok", profile };
}

/**
 * 매직링크 리다이렉트에 쓸 사이트 주소.
 * NEXT_PUBLIC_SITE_URL 이 있으면 그걸 쓰고, 없으면 요청 헤더에서 추론합니다.
 * (Vercel 프리뷰 배포에서도 알아서 맞습니다.)
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
