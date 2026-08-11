"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CatMascot } from "@/components/Cat";
import Composer from "./Composer";
import MessageList from "./MessageList";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  deleteMessage,
  loadOlderMessages,
  markChatRead,
  sendMessage,
} from "@/app/actions/chat";
import { PAGE_SIZE, toBubbles, upsertMessage, type Pending } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import type { Message, Profile } from "@/lib/database.types";

/** 이 정도 아래에 있으면 "맨 아래를 보고 있다"고 봅니다. */
const NEAR_BOTTOM = 60;
/** 위쪽 이만큼 남으면 이전 것을 더 불러옵니다. */
const LOAD_MARGIN = 240;

export default function ChatView({
  me,
  partner,
  initial,
  mode,
}: {
  me: Profile;
  partner: Profile | null;
  initial: Message[];
  /** 상대 말풍선에 상대 테마를 입힐 때 같이 걸어야 하는 밤/낮 값 */
  mode: "light" | "dark";
}) {
  const [messages, setMessages] = useState(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  /** 위를 보고 있는 동안 새 메시지가 왔는지 */
  const [newBelow, setNewBelow] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  /*
   * 스크롤 위치는 렌더와 상관없이 계속 바뀌므로 ref 로 들고 있습니다.
   * state 로 두면 스크롤할 때마다 목록 전체가 다시 그려집니다.
   */
  const atBottom = useRef(true);
  /** 이전 메시지를 앞에 끼워 넣기 직전의 문서 높이 */
  const anchorHeight = useRef<number | null>(null);

  /*
   * initial 을 state 에 다시 밀어 넣지 않습니다.
   * 서버 액션들이 revalidate 를 하지 않으므로 이 값은 실제로 화면을 옮겨
   * 다시 들어왔을 때만 바뀌고, 그때는 컴포넌트가 새로 만들어집니다.
   * 여기서 동기화하면 위로 불러온 이전 메시지가 통째로 날아갑니다.
   */

  /** 열자마자 "여기까지 봤다"를 갱신해서 하단 탭의 점을 끕니다. */
  useEffect(() => {
    markChatRead().catch((error) => console.error("읽음 표시 실패:", error));
  }, []);


  const stickToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  /*
   * 맨 아래를 보고 있었다면 목록이 바뀔 때마다 다시 아래로 붙입니다.
   *
   * 받는 쪽에서 곧바로 스크롤하면 안 됩니다. setMessages 는 비동기라
   * requestAnimationFrame 이 React 가 새 말풍선을 그리기 전에 돌고, 결국
   * 옛 높이로 스크롤해서 제자리에 머뭅니다. 이펙트는 커밋 뒤에 돌아서
   * 새 높이를 봅니다. 처음 열 때도 이 이펙트가 한 번 돌아 맨 아래에서
   * 시작합니다.
   */
  useEffect(() => {
    if (atBottom.current) stickToBottom();
  }, [messages, pending, stickToBottom]);

  /*
   * 이전 메시지를 앞에 끼워 넣으면 문서가 그만큼 길어져서, 보고 있던 줄이
   * 아래로 밀려납니다. 늘어난 만큼 scrollTop 을 더해 제자리에 붙들어 둡니다.
   *
   * requestAnimationFrame 으로는 안 됩니다. React 가 새 줄을 그리기 전에
   * 돌아서 늘어난 높이가 0 으로 잡힙니다. useLayoutEffect 는 DOM 이 바뀐
   * 뒤 화면에 칠하기 전에 돌아서, 값도 맞고 눈에 튀지도 않습니다.
   */
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || anchorHeight.current === null) return;
    el.scrollTop += el.scrollHeight - anchorHeight.current;
    anchorHeight.current = null;
  }, [messages]);

  /** 위로 스크롤해서 이전 메시지를 더 받아옵니다. */
  const loadOlder = useCallback(async () => {
    const el = scroller.current;
    if (!el || loadingOlder || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;

    setLoadingOlder(true);
    try {
      const result = await loadOlderMessages(oldest.seq);
      if (result.message) {
        // 한 번 실패했다고 hasMore 를 끄면 새로고침 전까지 영영 못 불러옵니다.
        setProblem(result.message);
      } else {
        if (result.items.length) {
          // 위 useLayoutEffect 가 이 높이를 기준으로 위치를 되돌립니다.
          anchorHeight.current = el.scrollHeight;
          setMessages((prev) => [...result.items, ...prev]);
        }
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error(error);
      setProblem("이전 메시지를 불러오지 못했어요.");
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, messages]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;

    const bottomGap = el.scrollHeight - el.clientHeight - el.scrollTop;
    atBottom.current = bottomGap < NEAR_BOTTOM;
    if (atBottom.current) setNewBelow(false);

    if (el.scrollTop < LOAD_MARGIN) void loadOlder();
  }, [loadOlder]);

  /*
   * 실시간 수신.
   *
   * 여기서는 LiveSync 처럼 router.refresh() 를 부르면 안 됩니다. 화면을 다시
   * 그리면 스크롤 위치도, 보내는 중인 말풍선도 사라집니다. 바뀐 줄만 받아
   * 목록에 끼워 넣습니다.
   */
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    const supabase = createClient();
    let alive = true;
    let channel: RealtimeChannel | null = null;

    const apply = (row: Message) => {
      setMessages((prev) => upsertMessage(prev, row));

      if (row.sender_id === me.id) return;

      if (atBottom.current) {
        // 실제 스크롤은 위 이펙트가 커밋 뒤에 합니다.
        markChatRead().catch(() => {});
      } else {
        setNewBelow(true);
      }
    };

    (async () => {
      // 토큰을 realtime 에 넘기지 않으면 RLS 에 걸려 조용히 아무것도 안 옵니다.
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (!alive) return;

      channel = supabase
        .channel("chat:messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => apply(payload.new as Message)
        )
        // 삭제는 지우는 게 아니라 deleted_at 을 채우는 것이라 UPDATE 로 옵니다.
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => setMessages((prev) => upsertMessage(prev, payload.new as Message))
        )
        .subscribe();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [me.id]);

  /*
   * 모바일 키보드가 올라와도 입력창이 가려지지 않게 합니다.
   *
   * iOS 사파리는 키보드가 떠도 창 높이(innerHeight)를 줄이지 않습니다.
   * 그래서 100dvh 나 position:fixed 만으로는 입력창이 키보드 밑에 깔립니다.
   * 실제로 보이는 영역은 visualViewport 가 알려주므로, 그 차이만큼
   * --kb 로 내려두고 화면 껍데기를 그만큼 띄웁니다.
   *
   * 안드로이드 크롬은 viewport 메타의 interactive-widget 으로 알아서
   * 줄어들지만, 같은 계산이 들어가도 값이 0 이라 문제되지 않습니다.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // 화면이 줄기 전에 "맨 아래를 보고 있었는지" 먼저 기억해둡니다.
      const el = scroller.current;
      const wasAtBottom =
        !el || el.scrollHeight - el.clientHeight - el.scrollTop < 40;

      root.style.setProperty("--kb", `${Math.round(inset)}px`);
      // 키보드가 떠 있는 동안에는 하단 탭을 감춥니다. 어차피 가려집니다.
      root.dataset.kb = inset > 80 ? "open" : "closed";

      // 목록이 짧아진 만큼 다시 아래로 붙입니다. 안 그러면 방금 보던 줄이
      // 키보드 뒤로 밀려 올라갑니다.
      if (wasAtBottom) requestAnimationFrame(() => stickToBottom());
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      delete root.dataset.kb;
    };
  }, [stickToBottom]);


  const send = useCallback(
    async (text: string) => {
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const draft: Pending = {
        localId,
        content: text,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      setPending((prev) => [...prev, draft]);
      atBottom.current = true;
      setNewBelow(false);

      const fail = (why: string) => {
        setProblem(why);
        setPending((prev) =>
          prev.map((p) => (p.localId === localId ? { ...p, status: "failed" } : p))
        );
      };

      try {
        const result = await sendMessage(text);
        if (result.sent) {
          setProblem(null);
          // 임시 말풍선을 진짜 줄로 바꿔치기합니다.
          setMessages((prev) =>
            prev.some((m) => m.id === result.sent!.id) ? prev : [...prev, result.sent!]
          );
          setPending((prev) => prev.filter((p) => p.localId !== localId));
        } else {
          fail(result.message ?? "보내지 못했어요.");
        }
      } catch (error) {
        console.error(error);
        fail("연결이 끊겼어요. 다시 시도해 주세요.");
      }
    },
    [stickToBottom]
  );

  /** 실패한 말풍선의 재시도 버튼 */
  const retry = useCallback(
    (localId: string) => {
      const target = pending.find((p) => p.localId === localId);
      if (!target) return;
      setPending((prev) => prev.filter((p) => p.localId !== localId));
      void send(target.content);
    },
    [pending, send]
  );

  const drop = useCallback((localId: string) => {
    setPending((prev) => prev.filter((p) => p.localId !== localId));
  }, []);

  const remove = useCallback(async (id: string) => {
    const before = new Date().toISOString();
    // 먼저 지운 것처럼 보여주고, 실패하면 되돌립니다.
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, deleted_at: before, content: "" } : m))
    );
    try {
      const result = await deleteMessage(id);
      if (result.message) {
        setProblem(result.message);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, deleted_at: null } : m))
        );
      }
    } catch (error) {
      console.error(error);
      setProblem("지우지 못했어요. 다시 시도해 주세요.");
    }
  }, []);

  const bubbles = toBubbles(messages, pending, me.id);

  return (
    <div className="chat-shell">
      <header className="chat-bar flex items-center gap-2.5 px-4">
        <CatMascot size={34} mood={partner ? "happy" : "sleepy"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-heading leading-tight">
            {partner ? (
              <>
                <span aria-hidden="true">{partner.avatar_emoji}</span>{" "}
                {partner.display_name}
              </>
            ) : (
              "둘만의 대화"
            )}
          </p>
          <p className="text-badge text-muted">둘만 볼 수 있어요</p>
        </div>
      </header>

      {problem ? (
        <p
          role="alert"
          data-tone="orange"
          className="mx-3 mt-2 flex items-start gap-2 rounded-inner border-2 border-tone bg-tone-soft px-3 py-2 text-label"
        >
          <span aria-hidden="true">🙀</span>
          <span className="flex-1">{problem}</span>
          <button
            type="button"
            onClick={() => setProblem(null)}
            aria-label="알림 닫기"
            className="grid size-6 shrink-0 place-items-center text-muted"
          >
            ×
          </button>
        </p>
      ) : null}

      {loadingOlder ? (
        /*
         * 목록 안이 아니라 위에 떠 있게 둡니다. 목록 안에 넣으면 이 표시가
         * 뜨고 지는 것만으로 문서 높이가 바뀌어서, 아래 앵커 계산이 그만큼
         * 어긋납니다.
         */
        <p className="pointer-events-none absolute inset-x-0 top-[68px] z-10 mx-auto w-fit rounded-full bg-card-subtle px-3 py-1 text-badge text-muted shadow-card-soft">
          이전 메시지를 불러오는 중…
        </p>
      ) : null}

      <MessageList
        ref={scroller}
        onScroll={onScroll}
        bubbles={bubbles}
        me={me}
        partner={partner}
        mode={mode}
        onRetry={retry}
        onDiscard={drop}
        onDelete={remove}
      />

      {newBelow ? (
        <div className="pointer-events-none relative">
          <button
            type="button"
            onClick={() => {
              setNewBelow(false);
              atBottom.current = true;
              stickToBottom(true);
            }}
            className="pointer-events-auto absolute inset-x-0 -top-12 mx-auto flex w-fit items-center gap-1.5 rounded-full border-2 border-accent bg-accent px-4 py-2 text-label text-on-accent shadow-card"
          >
            ↓ 새 메시지
          </button>
        </div>
      ) : null}

      <Composer onSend={send} />
    </div>
  );
}
