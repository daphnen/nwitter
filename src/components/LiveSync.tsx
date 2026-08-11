"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * 상대방(또는 다른 기기의 내가) 기록을 고치면 새로고침 없이 따라옵니다.
 *
 * 바뀐 행을 받아서 화면을 직접 고치지는 않습니다. "뭔가 바뀌었다"는 신호만
 * 받고 router.refresh() 로 서버 컴포넌트를 다시 그립니다. 카드마다 붙어 있는
 * 조회 로직을 클라이언트에 한 벌 더 만들 필요가 없어서 이 편이 훨씬 짧습니다.
 *
 * 화면에는 연결 상태를 알려주는 작은 알약 하나만 그립니다.
 */

/** user_id 로 주인을 가릴 수 있는 표. 나머지(events)는 둘이 같이 씁니다. */
const OWNED = new Set([
  "daily_logs",
  "schedule_items",
  "timeline_entries",
  "goals",
  "goal_logs",
  "news_keywords",
  "timetables",
  "timetable_items",
]);

type Status = "connecting" | "live" | "off";

export default function LiveSync({
  userId,
  tables,
}: {
  /**
   * 지금 화면에 떠 있는 기록의 주인. 이 사람의 변경만 듣습니다.
   * null 이면 둘의 변경을 다 듣습니다 (캘린더·시간표처럼 겹쳐 보는 화면).
   */
  userId: string | null;
  tables: string[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [flashing, setFlashing] = useState(false);

  // 배열을 그대로 의존성에 넣으면 렌더마다 새 배열이라 구독이 계속 끊깁니다.
  const key = tables.join(",");
  const flash = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus("off");
      return;
    }

    const supabase = createClient();
    const list = key.split(",");

    let alive = true;
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;

    /**
     * 입력 중에는 절대 새로고침하지 않습니다. 카드들이 서버에서 온 값으로
     * 입력칸을 되돌리기 때문에, 타이핑 도중에 갈아엎으면 쓰던 글자가 날아갑니다.
     */
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    };

    const run = () => {
      if (!alive) return;
      if (document.hidden || typing()) {
        pending = true; // 지금은 참았다가 나중에
        return;
      }
      pending = false;
      router.refresh();
      setFlashing(true);
      clearTimeout(flash.current);
      flash.current = setTimeout(() => setFlashing(false), 2000);
    };

    /** 한 번 저장에 여러 표가 동시에 바뀌기도 해서 잠깐 모았다 한 번만 돕니다. */
    const schedule = () => {
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(run, 400);
    };

    /** 미뤄둔 새로고침이 있으면 처리 (입력을 마쳤을 때 등) */
    const flushSoon = () => {
      if (pending) setTimeout(run, 0);
    };

    /*
     * 소켓이 끊겨 있던 동안의 변경은 이벤트로 오지 않습니다.
     * 화면으로 돌아오거나 인터넷이 붙으면 그냥 한 번 새로 받아옵니다.
     */
    const recheck = () => {
      if (document.hidden) return;
      pending = true;
      run();
    };

    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("online", recheck);
    window.addEventListener("focusout", flushSoon);

    (async () => {
      /*
       * 구독하기 전에 realtime 쪽에도 로그인 토큰을 쥐여줘야 합니다.
       * 안 그러면 RLS 에 걸려 이벤트가 하나도 오지 않는데, 에러도 안 납니다.
       */
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;

      channel = supabase.channel(`live:${userId ?? "all"}:${key}`);

      for (const table of list) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(userId && OWNED.has(table)
              ? { filter: `user_id=eq.${userId}` }
              : {}),
          },
          schedule
        );
      }

      channel.subscribe((state) => {
        if (!alive) return;
        if (state === "SUBSCRIBED") {
          setStatus("live");
          flushSoon();
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          setStatus("off");
        }
      });
    })();

    // 한 시간쯤 지나 토큰이 갱신되면 realtime 에도 새 토큰을 넘겨야 합니다.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("online", recheck);
      window.removeEventListener("focusout", flushSoon);
      sub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, userId, key]);

  useEffect(() => () => clearTimeout(flash.current), []);

  const look =
    status === "live"
      ? "border-tone-green bg-tone-green-soft"
      : "border-tone-gray bg-tone-gray-soft";

  const text =
    flashing && status === "live"
      ? "✨ 방금 반영됨"
      : status === "live"
        ? "☁️ 실시간 연결됨"
        : status === "connecting"
          ? "☁️ 연결 중…"
          : "🐾 연결이 끊겼어요";

  return (
    <span
      aria-live="polite"
      className={`rounded-full border-2 px-3 py-1 text-xs transition-colors duration-300 ${look}`}
    >
      {text}
    </span>
  );
}
