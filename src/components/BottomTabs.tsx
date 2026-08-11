"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/calendar", label: "캘린더", emoji: "🗓" },
  { href: "/timetable", label: "시간표", emoji: "📚" },
  { href: "/chat", label: "채팅", emoji: "💬" },
  { href: "/settings", label: "설정", emoji: "⚙️" },
] as const;

/** 로그인·콜백 화면에는 탭을 띄우지 않습니다. */
const HIDDEN_ON = ["/login", "/auth"];

export default function BottomTabs({ unreadChat = false }: { unreadChat?: boolean }) {
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="m-3 flex w-full max-w-md items-stretch gap-1 rounded-full border-2 border-line bg-card p-1.5 shadow-card">
        {TABS.map((tab) => {
          // 안 읽은 점은 채팅 탭에만, 그 탭을 보고 있지 않을 때만.
          const dot = tab.href === "/chat" && unreadChat && !pathname.startsWith("/chat");
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 text-badge transition ${
                  active
                    ? "bg-accent-soft text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span aria-hidden="true" className="relative text-body leading-none">
                  {tab.emoji}
                  {dot ? (
                    <span className="absolute -right-1.5 -top-0.5 size-2 rounded-full bg-accent-strong" />
                  ) : null}
                </span>
                {tab.label}
                {dot ? <span className="sr-only">안 읽은 메시지 있음</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
