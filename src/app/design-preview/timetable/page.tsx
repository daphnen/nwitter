/** 디자인 확인용. 시간표/캘린더를 Supabase 없이 그려봅니다. 확인 후 지웁니다. */
import PageShell, { PageHeader } from "@/components/PageShell";
import TimetableView from "@/components/timetable/TimetableView";
import CalendarView from "@/components/calendar/CalendarView";
import { todayKey, toMonthKey } from "@/lib/date";
import type {
  CalendarEvent,
  Profile,
  Timetable,
  TimetableItem,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const now = new Date().toISOString();
const date = todayKey();

const me: Profile = {
  id: "u1", email: "me@example.com", display_name: "다프네",
  avatar_emoji: "🌙", theme: "moonlight", created_at: now, updated_at: now,
};
const partner: Profile = {
  id: "u2", email: "you@example.com", display_name: "자기",
  avatar_emoji: "💙", theme: "aqua", created_at: now, updated_at: now,
};

const timetables: Timetable[] = [
  { id: "tt1", user_id: "u1", name: "2026 2학기", start_date: "2026-09-01", end_date: "2026-12-20", days: "mon_fri", sort_order: 0, created_at: now, updated_at: now },
  { id: "tt2", user_id: "u1", name: "운동 루틴", start_date: null, end_date: null, days: "mon_sun", sort_order: 1, created_at: now, updated_at: now },
];

const item = (
  id: string, title: string, location: string, weekday: number,
  start: string, end: string, color: TimetableItem["color_key"], user = "u1", tt = "tt1"
): TimetableItem => ({
  id, timetable_id: tt, user_id: user, title, location, weekday,
  start_time: `${start}:00`, end_time: `${end}:00`, color_key: color,
  created_at: now, updated_at: now,
});

const myItems: TimetableItem[] = [
  item("a1", "자료구조", "공학관 302", 1, "11:00", "12:30", "blue"),
  item("a2", "자료구조", "공학관 302", 3, "11:00", "12:30", "blue"),
  item("a3", "영어회화", "인문관 105", 2, "09:00", "10:30", "mint"),
  item("a4", "알고리즘", "공학관 401", 4, "13:00", "15:00", "purple"),
  item("a5", "교양세미나", "학생회관", 5, "10:00", "11:30", "yellow"),
  item("a6", "실험", "실험동 B1", 2, "13:00", "17:00", "orange"),
];

const partnerItems: TimetableItem[] = [
  item("b1", "회의", "본사", 1, "10:00", "12:00", "gray", "u2", "tt9"),
  item("b2", "헬스", "짐", 3, "19:00", "20:30", "gray", "u2", "tt9"),
  item("b3", "외근", "", 4, "09:00", "13:00", "gray", "u2", "tt9"),
];

const events: CalendarEvent[] = [
  { id: "e1", owner_id: null, created_by: "u1", title: "저녁 같이 먹기", description: "", start_date: date, end_date: null, start_time: "19:00:00", end_time: null, all_day: false, created_at: now, updated_at: now },
  { id: "e2", owner_id: "u1", created_by: "u1", title: "치과", description: "", start_date: date, end_date: null, start_time: null, end_time: null, all_day: true, created_at: now, updated_at: now },
  { id: "e3", owner_id: "u2", created_by: "u2", title: "출장", description: "", start_date: date, end_date: null, start_time: null, end_time: null, all_day: true, created_at: now, updated_at: now },
];

export default async function PreviewTimetable({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; mode?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const theme = sp.theme === "aqua" ? "aqua" : "moonlight";
  const mode = sp.mode === "dark" ? "dark" : "light";
  const view = sp.view === "calendar" ? "calendar" : "timetable";

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.theme=${JSON.stringify(
            theme
          )};document.documentElement.dataset.mode=${JSON.stringify(mode)};`,
        }}
      />
      {view === "calendar" ? (
        <PageShell width="narrow">
          <PageHeader title="캘린더" emoji="🗓" subtitle="여기 넣은 약속은 홈의 오늘의 일정에도 함께 떠요." />
          <CalendarView
            month={toMonthKey(date)}
            selectedDate={date}
            events={events}
            me={me}
            partner={partner}
          />
        </PageShell>
      ) : (
        <PageShell>
          <PageHeader title="시간표" emoji="📚" subtitle="매주 반복되는 고정 일정이에요. 오늘 요일 항목은 홈에도 떠요." />
          <TimetableView
            timetables={timetables}
            selected={timetables[0]}
            items={myItems}
            partnerItems={partnerItems}
            partnerName={partner.display_name}
          />
        </PageShell>
      )}
    </>
  );
}
