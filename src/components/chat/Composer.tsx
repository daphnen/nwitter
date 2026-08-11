"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paw } from "@/components/Cat";

/** 입력창이 늘어나는 최대 줄 수 */
const MAX_ROWS = 5;

export default function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  /*
   * 물리 키보드가 있는 화면에서만 Enter 로 보냅니다.
   * 폰에서는 Enter 가 줄바꿈이어야 합니다 — 보내기 버튼이 따로 있고,
   * 여러 줄을 쓰는 도중에 자꾸 전송되면 못 씁니다.
   */
  const [enterSends, setEnterSends] = useState(false);
  useEffect(() => {
    setEnterSends(window.matchMedia("(pointer: fine)").matches);
  }, []);

  /** 내용에 맞춰 높이를 다시 잽니다. 최대 5줄까지만 늘어납니다. */
  const resize = useCallback(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 22;
    // scrollHeight 는 안쪽 여백을 포함합니다. 최대 높이도 같은 기준으로 재야
    // 정확히 5줄에서 멈춥니다. (테두리는 offset/client 차이로 따로 더합니다)
    const extra =
      el.offsetHeight -
      el.clientHeight +
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom);
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_ROWS + extra)}px`;
  }, []);

  useEffect(resize, [text, resize]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
    // 보낸 뒤에도 입력창에 커서를 남겨 키보드가 내려가지 않게 합니다.
    box.current?.focus();
  };

  return (
    <form
      className="chat-composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mx-auto flex w-full max-w-[720px] items-end gap-2">
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            if (!enterSends) return;
            e.preventDefault();
            submit();
          }}
          rows={1}
          placeholder="메시지를 적어주세요"
          aria-label="메시지 입력"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-inner border-2 border-line bg-card-subtle px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="보내기"
          className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-accent bg-accent text-on-accent transition disabled:opacity-40"
        >
          <Paw size={16} />
        </button>
      </div>
    </form>
  );
}
