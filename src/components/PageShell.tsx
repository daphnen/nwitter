import type { ReactNode } from "react";
import BackgroundDecor from "@/components/BackgroundDecor";
import Signature from "@/components/Signature";

/**
 * 탭 화면들이 공유하는 바깥 껍데기.
 * pb-32 는 고정된 하단 탭에 내용이 가리지 않게 하는 여백입니다.
 */
export default function PageShell({
  width = "wide",
  children,
}: {
  width?: "wide" | "narrow";
  children: ReactNode;
}) {
  return (
    <>
      <BackgroundDecor />
      <div
        className={`relative z-[1] mx-auto px-5 pb-32 pt-7 ${
          width === "narrow" ? "max-w-[640px]" : "max-w-[1180px]"
        }`}
      >
        {children}

        <Signature />
      </div>
    </>
  );
}

/** 탭 화면 상단의 작은 제목줄 */
export function PageHeader({
  title,
  emoji,
  subtitle,
  action,
}: {
  title: string;
  emoji: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-stack flex flex-wrap items-center gap-3 rounded-card border-2 border-line bg-card p-card shadow-card">
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 text-title">
          <span aria-hidden="true">{emoji}</span>
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-label text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
