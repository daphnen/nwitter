"use client";

import { useEffect, useState } from "react";
import type { ThemeName } from "@/lib/database.types";

/**
 * 배경 그라데이션을 두 겹으로 깔고 투명도를 교차시킵니다.
 *
 * background-image 는 CSS transition 이 안 먹습니다. 테마가 바뀔 때
 * 그라데이션이 뚝 끊기지 않게 하려면 이렇게 두 장을 겹쳐 놓고
 * opacity 로 넘기는 수밖에 없습니다.
 *
 * 테마를 바꾸는 주체(친구 기록 토글, 설정)가 <html> 의 data-theme 을 고치면
 * 여기서 그걸 지켜보다 따라갑니다. 누가 바꾸든 상관없이 동작합니다.
 */
export default function ThemeBackdrop({
  theme: initialTheme,
  mode: initialMode,
}: {
  theme: ThemeName;
  mode: "light" | "dark";
}) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      setTheme(root.dataset.theme === "aqua" ? "aqua" : "moonlight");
      setMode(root.dataset.mode === "dark" ? "dark" : "light");
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      {(["moonlight", "aqua"] as const).map((t) => (
        <div
          key={t}
          data-theme={t}
          data-mode={mode}
          className="absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none"
          style={{
            backgroundColor: "var(--bg-base)",
            backgroundImage: "var(--bg-gradient)",
            opacity: t === theme ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
