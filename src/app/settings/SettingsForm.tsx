"use client";

import { useState, useTransition } from "react";
import { CatMascot, Paw } from "@/components/Cat";
import {
  updateDarkMode,
  updateDisplayName,
  updateTheme,
} from "@/app/actions/settings";
import type { ThemeName } from "@/lib/database.types";

const THEMES: { key: ThemeName; label: string; blurb: string }[] = [
  { key: "moonlight", label: "moonlight", blurb: "몽환적인 로즈핑크와 별가루" },
  { key: "aqua", label: "aqua", blurb: "차분한 스카이블루와 민트" },
];

/**
 * 테마 미리보기.
 * 팔레트가 data-theme 로 스코프되어 있어서, 이 div 에 속성만 붙이면
 * 진짜 색이 그대로 나옵니다. 미리보기용 색을 따로 만들 필요가 없습니다.
 */
function ThemeSwatch({
  theme,
  mode,
}: {
  theme: ThemeName;
  mode: "light" | "dark";
}) {
  return (
    <div
      data-theme={theme}
      data-mode={mode}
      className="flex items-center gap-2 rounded-inner border-2 border-line bg-card p-3"
      style={{ backgroundImage: "var(--bg-gradient)" }}
    >
      <CatMascot size={34} />
      <span className="h-6 w-6 rounded-full bg-accent" />
      <span className="h-6 w-6 rounded-full bg-accent-alt" />
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-line">
        <span className="progress-fill block h-full w-2/3 rounded-full" />
      </span>
    </div>
  );
}

export default function SettingsForm({
  initialTheme,
  initialDarkMode,
  initialName,
}: {
  initialTheme: ThemeName;
  initialDarkMode: boolean;
  initialName: string;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [darkMode, setDarkMode] = useState(initialDarkMode);
  const [name, setName] = useState(initialName);
  const [, startTransition] = useTransition();

  /** 서버 응답을 기다리지 않고 먼저 바꿔서 즉시 반영되게 합니다. */
  const applyTheme = (next: ThemeName) => {
    if (next === theme) return;
    setTheme(next);
    document.documentElement.dataset.theme = next;
    startTransition(() => updateTheme(next));
  };

  const applyDarkMode = (next: boolean) => {
    setDarkMode(next);
    document.documentElement.dataset.mode = next ? "dark" : "light";
    startTransition(() => updateDarkMode(next));
  };

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    startTransition(() => updateDisplayName(trimmed));
  };

  return (
    <div className="flex flex-col gap-stack">
      {/* 테마 ------------------------------------------------------------ */}
      <section className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card" data-tone="pink">
        <h2 className="mb-1 flex items-center gap-2 text-xl">
          <span aria-hidden="true">🎨</span> 테마
        </h2>
        <p className="mb-3.5 text-sm text-muted">
          내 화면 색감이에요. 상대방 화면은 그대로예요.
        </p>

        <div className="flex flex-col gap-3">
          {THEMES.map((t) => {
            const selected = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTheme(t.key)}
                aria-pressed={selected}
                className={`rounded-inner border-2 p-3 text-left transition ${
                  selected
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-card-subtle"
                }`}
              >
                <span className="mb-2 flex items-center gap-2">
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                      selected
                        ? "border-accent bg-accent text-on-accent"
                        : "border-line"
                    }`}
                  >
                    {selected ? <Paw size={11} /> : null}
                  </span>
                  <strong>{t.label}</strong>
                  <span className="text-sm text-muted">{t.blurb}</span>
                </span>
                <ThemeSwatch theme={t.key} mode={darkMode ? "dark" : "light"} />
              </button>
            );
          })}
        </div>
      </section>

      {/* 밤 모드 --------------------------------------------------------- */}
      <section className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card" data-tone="purple">
        <h2 className="mb-1 flex items-center gap-2 text-xl">
          <span aria-hidden="true">🌙</span> 밤 모드
        </h2>
        <p className="mb-3.5 text-sm text-muted">
          테마는 그대로 두고 어두운 팔레트로 바꿔요.
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          onClick={() => applyDarkMode(!darkMode)}
          className="flex min-h-11 w-full items-center justify-between rounded-inner border-2 border-line bg-card-subtle px-4"
        >
          <span>{darkMode ? "밤 모드 켜짐" : "밤 모드 꺼짐"}</span>
          <span
            aria-hidden="true"
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              darkMode ? "bg-accent" : "bg-tone-gray"
            }`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-card transition-all ${
                darkMode ? "left-6" : "left-1"
              }`}
            />
          </span>
        </button>
      </section>

      {/* 이름 ------------------------------------------------------------ */}
      <section className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card" data-tone="mint">
        <h2 className="mb-1 flex items-center gap-2 text-xl">
          <span aria-hidden="true">🐱</span> 표시 이름
        </h2>
        <p className="mb-3.5 text-sm text-muted">헤더 인사말에 쓰여요.</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={20}
          aria-label="표시 이름"
          className="min-h-11 w-full rounded-full border-2 border-line bg-card-subtle px-4 text-[15px] outline-none transition focus:border-tone focus:ring-4 focus:ring-tone-soft"
        />
      </section>
    </div>
  );
}
