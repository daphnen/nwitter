"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { CatMascot } from "@/components/Cat";
import { dayLabel, timeLabel, type Bubble } from "@/lib/chat";
import type { Profile } from "@/lib/database.types";

/** 길게 눌러 메뉴가 뜨기까지 */
const LONG_PRESS_MS = 450;

const MessageList = forwardRef<
  HTMLDivElement,
  {
    bubbles: Bubble[];
    me: Profile;
    partner: Profile | null;
    mode: "light" | "dark";
    onRetry: (localId: string) => void;
    onDiscard: (localId: string) => void;
    onDelete: (id: string) => void;
  }
>(function MessageList({ bubbles, me, partner, mode, onRetry, onDiscard, onDelete }, ref) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (bubbles.length === 0) {
    return (
      <div ref={ref} className="chat-scroll grid place-items-center px-8 text-center">
        <div>
          <div className="cat-bob mx-auto w-fit">
            <CatMascot size={76} mood="sleepy" />
          </div>
          <p className="mt-3 text-heading">아직 아무 말도 없어요</p>
          <p className="mt-1 text-label text-muted">
            먼저 말을 걸어볼까요? 🐾
          </p>
        </div>
      </div>
    );
  }

  const openMenu = (id: string) => setMenuFor(id);
  const holdStart = (id: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => openMenu(id), LONG_PRESS_MS);
  };
  const holdEnd = () => clearTimeout(timer.current);

  return (
    <div ref={ref} className="chat-scroll px-3 py-3">
      <ul className="mx-auto mt-auto flex w-full max-w-[720px] flex-col gap-0.5">
        {bubbles.map((b) => {
          const sender = b.mine ? me : partner;
          const deleted = !!b.message.deleted_at;

          return (
            <li key={b.message.id}>
              {b.daySeparator ? (
                <div className="my-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="rounded-full bg-card-subtle px-3 py-1 text-badge text-muted">
                    {dayLabel(b.daySeparator)}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              ) : null}

              <div
                className={`flex items-end gap-1.5 ${
                  b.mine ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/*
                 * 말풍선 색은 "보낸 사람의 테마"를 따릅니다. 팔레트가
                 * data-theme 으로 스코프돼 있어서 속성만 붙이면 그 테마 색이
                 * 그대로 나옵니다. data-mode 를 같이 붙여야 하는 게 함정입니다 —
                 * 다크 팔레트 선택자가 [data-theme][data-mode] 복합이라
                 * 한 요소에 둘 다 있어야 걸립니다.
                 */}
                <div
                  data-theme={sender?.theme ?? me.theme}
                  data-mode={mode}
                  onContextMenu={(e) => {
                    if (!b.mine || deleted || b.status) return;
                    e.preventDefault();
                    openMenu(b.message.id);
                  }}
                  onPointerDown={() => {
                    if (!b.mine || deleted || b.status) return;
                    holdStart(b.message.id);
                  }}
                  onPointerUp={holdEnd}
                  onPointerLeave={holdEnd}
                  onPointerCancel={holdEnd}
                  className={`chat-bubble max-w-[76%] px-3.5 py-2 text-body ${
                    b.mine ? "chat-bubble-mine" : "chat-bubble-theirs"
                  } ${b.status === "failed" ? "opacity-60" : ""}`}
                >
                  {deleted ? (
                    <span className="italic text-muted">삭제된 메시지예요</span>
                  ) : (
                    b.message.content
                  )}
                </div>

                {b.showTime && !b.status ? (
                  <time
                    dateTime={b.message.created_at}
                    className="shrink-0 pb-0.5 text-badge text-muted"
                  >
                    {timeLabel(b.message.created_at)}
                  </time>
                ) : null}

                {b.status === "sending" ? (
                  <span className="shrink-0 pb-0.5 text-badge text-muted">보내는 중</span>
                ) : null}
              </div>

              {b.status === "failed" ? (
                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onRetry(b.message.id)}
                    className="min-h-9 rounded-full border-2 border-accent px-3 text-label text-accent-strong"
                  >
                    다시 보내기
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscard(b.message.id)}
                    className="min-h-9 rounded-full border-2 border-line px-3 text-label text-muted"
                  >
                    지우기
                  </button>
                </div>
              ) : null}

              {menuFor === b.message.id ? (
                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuFor(null);
                      onDelete(b.message.id);
                    }}
                    className="min-h-9 rounded-full border-2 border-accent bg-accent px-4 text-label text-on-accent"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuFor(null)}
                    className="min-h-9 rounded-full border-2 border-line px-4 text-label text-muted"
                  >
                    취소
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export default MessageList;
