import type { ReactNode } from "react";
import type { ColorKey } from "@/lib/database.types";

/**
 * 모든 홈 카드가 공유하는 껍데기.
 * 제목 / 아이콘 / 우측 요약 배지 / 본문 슬롯을 제공합니다.
 * 접기(chevron)는 5단계에서 여기에 붙습니다.
 */
export default function DashboardCard({
  title,
  emoji,
  tone,
  badge,
  headerAction,
  children,
}: {
  title: string;
  emoji: string;
  tone: ColorKey;
  /** 접었을 때도 보여야 하는 요약. 예: "1/3 완료", "3개" */
  badge?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-tone={tone}
      className="cat-card rounded-card border-2 border-line bg-card px-5 pb-5 pt-5 shadow-card"
    >
      <header className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl">
          <span aria-hidden="true" className="text-[22px]">
            {emoji}
          </span>
          {title}
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="rounded-full bg-tone-soft px-3 py-1 text-xs whitespace-nowrap">
              {badge}
            </span>
          ) : null}
          {headerAction}
        </div>
      </header>

      {children}
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
