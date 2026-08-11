import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { normalizeCardKeys, normalizeCardOrder } from "@/lib/cards";
import type { CardKey, Profile, ThemeName } from "@/lib/database.types";

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

export type ViewContext = {
  /** 화면에 적용할 스킨. "지금 보고 있는 대상 유저"의 테마입니다. */
  theme: ThemeName;
  mode: "light" | "dark";
  /** 하단 탭 채팅 아이콘에 점(●)을 띄울지. 개수는 세지 않습니다. */
  unreadChat: boolean;
};

/**
 * <html> 에 심을 테마를 서버에서 정합니다.
 * 클라이언트에서 정하면 첫 프레임에 기본 테마가 번쩍이므로 반드시 서버에서.
 *
 * 지금은 로그인 유저 = 조회 대상이라 본인 테마입니다.
 * 6단계에서 친구 기록을 볼 때 "조회 대상"의 테마로 바뀝니다.
 */
export async function getViewContext(): Promise<ViewContext> {
  const fallback: ViewContext = {
    theme: "moonlight",
    mode: "light",
    unreadChat: false,
  };

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return fallback;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallback;

  /*
   * 안 읽은 점은 "가장 최근 메시지 한 줄"만 보면 판정됩니다.
   * 그게 상대 것이고 내 chat_read_at 보다 나중이면 안 읽은 것이고,
   * 마지막이 내 것이면 안 읽은 게 있을 수 없습니다.
   * 세 질의를 나란히 보내므로 왕복 횟수는 늘지 않습니다.
   */
  const [{ data: profile }, { data: prefs }, { data: latest }] = await Promise.all([
    supabase.from("profiles").select("theme").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_preferences")
      .select("dark_mode, chat_read_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("sender_id, created_at")
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const readAt = prefs?.chat_read_at ?? "";

  return {
    theme: profile?.theme ?? fallback.theme,
    mode: prefs?.dark_mode ? "dark" : "light",
    unreadChat:
      !!latest && latest.sender_id !== user.id && latest.created_at > readAt,
  };
}

export type MyPreferences = {
  darkMode: boolean;
  cardOrder: CardKey[];
  collapsedCards: CardKey[];
  hiddenCards: CardKey[];
};

/** 내 환경설정 (행이 없거나 값이 이상해도 항상 쓸 수 있는 형태로) */
export async function getMyPreferences(userId: string): Promise<MyPreferences> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    darkMode: data?.dark_mode ?? false,
    cardOrder: normalizeCardOrder(data?.card_order),
    collapsedCards: normalizeCardKeys(data?.collapsed_cards),
    hiddenCards: normalizeCardKeys(data?.hidden_cards),
  };
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
