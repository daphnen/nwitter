import Link from "next/link";
import { CatMascot } from "@/components/Cat";
import { greeting } from "@/lib/date";
import type { Profile } from "@/lib/database.types";

export default function AppHeader({ profile }: { profile: Profile }) {
  const hello = greeting();

  return (
    <header className="flex flex-wrap items-center gap-5 rounded-card border-2 border-line bg-card p-card shadow-card max-wide:justify-center max-wide:text-center">
      <div className="cat-bob shrink-0">
        <CatMascot size={96} />
      </div>

      <div className="min-w-60 flex-1">
        <p className="font-hand text-xl font-bold text-muted">
          {hello.emoji} {hello.text}
        </p>
        <h1 className="text-3xl">우리의 대시보드</h1>
        <p className="mt-1 text-sm text-muted">
          {profile.display_name}
          <span aria-hidden="true">{profile.avatar_emoji}</span> 님, 오늘도 차근차근 🐾
        </p>
      </div>

      <div className="flex items-center gap-2 max-wide:w-full max-wide:justify-center">
        <span className="rounded-full border-2 border-tone-green bg-tone-green-soft px-3 py-1 text-xs">
          ☁️ 동기화됨
        </span>
        {/* 4단계에서 하단 탭이 생기면 그쪽으로 옮깁니다. */}
        <Link
          href="/settings"
          className="min-h-11 rounded-full border-2 border-line px-4 text-xs leading-[2.4rem] text-muted transition hover:text-ink"
        >
          ⚙️ 설정
        </Link>
      </div>
    </header>
  );
}
