"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatMascot } from "@/components/Cat";
import Composer from "./Composer";
import MessageList from "./MessageList";
import { deleteMessage, markChatRead, sendMessage } from "@/app/actions/chat";
import { toBubbles, type Pending } from "@/lib/chat";
import type { Message, Profile } from "@/lib/database.types";

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

  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages(initial), [initial]);

  /** 열자마자 "여기까지 봤다"를 갱신해서 하단 탭의 점을 끕니다. */
  useEffect(() => {
    markChatRead().catch((error) => console.error("읽음 표시 실패:", error));
  }, []);


  const stickToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // 처음 열면 맨 아래(=최신)에서 시작합니다.
  useEffect(() => stickToBottom(), [stickToBottom]);

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
      requestAnimationFrame(() => stickToBottom());

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
          requestAnimationFrame(() => stickToBottom());
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

      <MessageList
        ref={scroller}
        bubbles={bubbles}
        me={me}
        partner={partner}
        mode={mode}
        onRetry={retry}
        onDiscard={drop}
        onDelete={remove}
      />

      <Composer onSend={send} />
    </div>
  );
}
