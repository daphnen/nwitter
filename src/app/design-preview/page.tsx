/**
 * 디자인 확인용 임시 페이지. Supabase 없이 카드 배치를 눈으로 보기 위한 것이고,
 * 확인이 끝나면 지웁니다.
 */
import BackgroundDecor from "@/components/BackgroundDecor";
import DateNav from "@/components/DateNav";
import AppHeader from "@/components/AppHeader";
import { Paw } from "@/components/Cat";
import ScheduleCard from "@/components/cards/ScheduleCard";
import MealsCard from "@/components/cards/MealsCard";
import TimelineCard from "@/components/cards/TimelineCard";
import GoalsCard from "@/components/cards/GoalsCard";
import NewsCard from "@/components/cards/NewsCard";
import { todayKey } from "@/lib/date";
import type {
  CalendarEvent,
  DailyLog,
  NewsKeyword,
  Profile,
  ScheduleItem,
  Tag,
  TimelineEntry,
} from "@/lib/database.types";
import type { GoalWithProgress } from "@/lib/queries";

export const dynamic = "force-dynamic";

const now = new Date().toISOString();
const date = todayKey();

const profile: Profile = {
  id: "u1",
  email: "me@example.com",
  display_name: "다프네",
  avatar_emoji: "🌙",
  theme: "moonlight",
  created_at: now,
  updated_at: now,
};

const schedule: ScheduleItem[] = [
  { id: "s1", user_id: "u1", date, at_time: "09:30:00", title: "팀 스탠드업 회의", done: true, sort_order: 0, created_at: now, updated_at: now },
  { id: "s2", user_id: "u1", date, at_time: "14:00:00", title: "치과 예약 🦷", done: false, sort_order: 1, created_at: now, updated_at: now },
  { id: "s3", user_id: "u1", date, at_time: "20:00:00", title: "요가 클래스", done: false, sort_order: 2, created_at: now, updated_at: now },
];

const events: CalendarEvent[] = [
  { id: "e1", owner_id: null, created_by: "u1", title: "저녁 같이 먹기", description: "", start_date: date, end_date: null, start_time: "19:00:00", end_time: null, all_day: false, created_at: now, updated_at: now },
];

const dailyLog: DailyLog = {
  id: "d1", user_id: "u1", date,
  breakfast: "토스트랑 라떼", breakfast_mood: "😋",
  lunch: "김치볶음밥", lunch_mood: "🙂",
  dinner: "", dinner_mood: "",
  created_at: now, updated_at: now,
};

const tags: Tag[] = [
  { id: "t1", user_id: null, name: "일", emoji: "💼", color_key: "blue", sort_order: 1, created_at: now },
  { id: "t2", user_id: null, name: "공부", emoji: "📖", color_key: "purple", sort_order: 2, created_at: now },
  { id: "t3", user_id: null, name: "운동", emoji: "🏃", color_key: "mint", sort_order: 3, created_at: now },
  { id: "t4", user_id: null, name: "휴식", emoji: "☕", color_key: "orange", sort_order: 4, created_at: now },
  { id: "t5", user_id: null, name: "집안일", emoji: "🧺", color_key: "yellow", sort_order: 5, created_at: now },
  { id: "t6", user_id: null, name: "사람", emoji: "💬", color_key: "pink", sort_order: 6, created_at: now },
];

const timeline: TimelineEntry[] = [
  { id: "l1", user_id: "u1", date, at_time: "08:20:00", content: "아침 스트레칭하고 산책", tag_id: "t3", created_at: now, updated_at: now },
  { id: "l2", user_id: "u1", date, at_time: "10:00:00", content: "대시보드 UI 다듬기", tag_id: "t1", created_at: now, updated_at: now },
  { id: "l3", user_id: "u1", date, at_time: "13:10:00", content: "카페에서 책 30쪽 읽음", tag_id: "t2", created_at: now, updated_at: now },
];

const goals: GoalWithProgress[] = [
  { id: "g1", user_id: "u1", title: "물 8잔 마시기", emoji: "💧", target: 8, period: "daily", active: true, sort_order: 0, created_at: now, updated_at: now, periodStart: date, log: { id: "gl1", goal_id: "g1", user_id: "u1", period_start: date, progress: 5, completed_at: null, created_at: now, updated_at: now } },
  { id: "g2", user_id: "u1", title: "책 30분 읽기", emoji: "📚", target: 1, period: "daily", active: true, sort_order: 1, created_at: now, updated_at: now, periodStart: date, log: { id: "gl2", goal_id: "g2", user_id: "u1", period_start: date, progress: 1, completed_at: now, created_at: now, updated_at: now } },
  { id: "g3", user_id: "u1", title: "주 3회 운동", emoji: "🏃", target: 3, period: "weekly", active: true, sort_order: 2, created_at: now, updated_at: now, periodStart: date, log: { id: "gl3", goal_id: "g3", user_id: "u1", period_start: date, progress: 1, completed_at: null, created_at: now, updated_at: now } },
];

const keywords: NewsKeyword[] = [
  { id: "k1", user_id: "u1", keyword: "프론트엔드", sort_order: 0, created_at: now },
  { id: "k2", user_id: "u1", keyword: "UI 디자인", sort_order: 1, created_at: now },
  { id: "k3", user_id: "u1", keyword: "고양이", sort_order: 2, created_at: now },
];

/**
 * ?theme=aqua&mode=dark 로 팔레트를 바꿔볼 수 있습니다.
 * 루트 레이아웃의 <html> 값을 이 페이지에서 덮어씁니다.
 */
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const theme = sp.theme === "aqua" ? "aqua" : "moonlight";
  const mode = sp.mode === "dark" ? "dark" : "light";

  return (
    <>
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.theme=${JSON.stringify(
            theme
          )};document.documentElement.dataset.mode=${JSON.stringify(mode)};`,
        }}
      />
      <BackgroundDecor />
      <div className="relative z-[1] mx-auto max-w-[1180px] px-5 pb-16 pt-7">
        <AppHeader profile={profile} />
        <DateNav date={date} />

        <main className="grid items-start gap-stack wide:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-stack">
            <ScheduleCard date={date} items={schedule} events={events} />
            <MealsCard date={date} dailyLog={dailyLog} />
            <TimelineCard date={date} entries={timeline} tags={tags} />
          </div>
          <div className="flex min-w-0 flex-col gap-stack">
            <GoalsCard goals={goals} date={date} />
            <NewsCard keywords={keywords} />
          </div>
        </main>

        <footer className="mt-9 flex items-center justify-center gap-2 font-hand text-lg font-bold text-muted">
          <Paw size={14} /> 오늘도 수고했어요
        </footer>
      </div>
    </>
  );
}
