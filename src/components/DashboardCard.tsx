"use client";

import { useId, type ReactNode } from "react";
import type { ColorKey } from "@/lib/database.types";

/**
 * 모든 홈 카드가 공유하는 껍데기.
 * 제목 / 아이콘 / 우측 요약 배지 / 접기를 여기서 담당합니다.
 *
 * 접기 애니메이션은 grid-template-rows 0fr↔1fr 입니다.
 * 높이를 JS 로 재지 않아도 되고, 내용이 바뀌어도 알아서 맞습니다.
 */
export default function DashboardCard({
  title,
  emoji,
  tone,
  badge,
  headerAction,
  collapsed = false,
  onToggleCollapse,
  children,
}: {
  title: string;
  emoji: string;
  tone: ColorKey;
  /** 접었을 때도 계속 보이는 요약. 예: "1/3 완료", "3개" */
  badge?: ReactNode;
  headerAction?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: ReactNode;
}) {
  const bodyId = useId();
  const collapsible = Boolean(onToggleCollapse);

  const headerInner = (
    <>
      <h2 className="flex min-w-0 items-center gap-2 text-xl">
        <span aria-hidden="true" className="text-[22px]">
          {emoji}
        </span>
        <span className="truncate">{title}</span>
      </h2>

      <span className="ml-auto flex shrink-0 items-center gap-2">
        {badge ? (
          <span className="rounded-full bg-tone-soft px-3 py-1 text-xs whitespace-nowrap">
            {badge}
          </span>
        ) : null}

        {collapsible ? (
          <span
            aria-hidden="true"
            className={`text-muted transition-transform duration-300 ${
              collapsed ? "" : "rotate-180"
            }`}
          >
            ⌄
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <section
      data-tone={tone}
      className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card"
    >
      {/*
        헤더 액션(+ 버튼 등)은 토글 버튼 "안"이 아니라 형제로 둡니다.
        버튼 안에 버튼을 넣는 건 유효하지 않은 HTML 이고,
        형제로 두면 stopPropagation 없이도 눌러도 접히지 않습니다.
      */}
      {/* 접히면 본문이 0 높이가 되므로 헤더 아래 여백도 같이 접습니다 */}
      <header
        className={`flex items-center gap-2 transition-[margin] duration-300 ${
          collapsed ? "mb-0" : "mb-3.5"
        }`}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            className="-m-1 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-inner p-1 text-left transition hover:bg-tone-soft"
          >
            {headerInner}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">{headerInner}</div>
        )}

        {headerAction}
      </header>

      <div
        id={bodyId}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
      >
        {/* 접혀 있을 때는 탭 이동으로도 안 들어가게 막습니다. */}
        <div className="min-h-0 overflow-hidden" inert={collapsed || undefined}>
          {children}
        </div>
      </div>
    </section>
  );
}

/** 기록이 없을 때 카드가 비어 보이지 않도록 넣는 안내 문구 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="my-1.5 flex items-center gap-2 px-0.5 font-hand text-[17px] font-bold text-muted">
      <span aria-hidden="true">🐾</span>
      {children}
    </p>
  );
}
