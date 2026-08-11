import { CatMascot } from "@/components/Cat";
import LiveSync from "@/components/LiveSync";
import { greeting } from "@/lib/date";
import type { Profile } from "@/lib/database.types";

/** 홈 카드들이 보고 있는 표. 이 중 하나라도 바뀌면 화면을 새로 받아옵니다. */
const HOME_TABLES = [
  "daily_logs",
  "schedule_items",
  "timeline_entries",
  "goals",
  "goal_logs",
  "news_keywords",
  "timetable_items",
  "events",
];

export default function AppHeader({
  me,
  viewed,
  viewing,
}: {
  me: Profile;
  /** 지금 화면에 떠 있는 기록의 주인 */
  viewed: Profile;
  viewing: "me" | "partner";
}) {
  const hello = greeting();
  const lookingAtPartner = viewing === "partner";

  return (
    <header className="flex flex-wrap items-center gap-5 rounded-card border-2 border-line bg-card p-card shadow-card max-wide:justify-center max-wide:text-center">
      <div className="cat-bob shrink-0">
        <CatMascot size={96} mood={lookingAtPartner ? "sleepy" : "happy"} />
      </div>

      <div className="min-w-60 flex-1">
        <p className="font-hand text-xl font-bold text-muted">
          {hello.emoji} {hello.text}
        </p>
        <h1 className="text-3xl">우리의 대시보드</h1>
        <p className="mt-1 text-sm text-muted">
          {lookingAtPartner ? (
            <>
              <span aria-hidden="true">{viewed.avatar_emoji}</span>{" "}
              {viewed.display_name} 님의 기록을 보는 중이에요 👀
            </>
          ) : (
            <>
              {me.display_name}
              <span aria-hidden="true">{me.avatar_emoji}</span> 님, 오늘도 차근차근 🐾
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 max-wide:w-full max-wide:justify-center">
        <LiveSync userId={viewed.id} tables={HOME_TABLES} />
      </div>
    </header>
  );
}
