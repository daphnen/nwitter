import { createClient } from "@/lib/supabase/server";
import { periodStart } from "@/lib/date";
import { isoWeekday } from "@/lib/timetable";
import type {
  Profile,
  Timetable,
  TimetableItem,
  CalendarEvent,
  DailyLog,
  Goal,
  GoalLog,
  Message,
  NewsKeyword,
  ScheduleItem,
  Tag,
  TimelineEntry,
} from "@/lib/database.types";

export type GoalWithProgress = Goal & {
  /** 이번 주기의 진행 기록. 아직 없으면 null (진행도 0으로 봅니다) */
  log: GoalLog | null;
  periodStart: string;
};

export type DashboardData = {
  schedule: ScheduleItem[];
  events: CalendarEvent[];
  dailyLog: DailyLog | null;
  timeline: TimelineEntry[];
  tags: Tag[];
  goals: GoalWithProgress[];
  keywords: NewsKeyword[];
  /** 이 날짜 요일에 해당하는, 유효기간 안의 시간표 항목 */
  timetableItems: TimetableItem[];
};

/** 이 앱을 쓰는 두 사람 중 내가 아닌 쪽 */
export async function getPartner(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", userId)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** 기준일에 유효한 시간표들 (유효기간이 그 날을 품는 것) */
export async function getActiveTimetables(
  userId: string,
  dateKey: string
): Promise<Timetable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timetables")
    .select("*")
    .eq("user_id", userId)
    .or(`start_date.is.null,start_date.lte.${dateKey}`)
    .or(`end_date.is.null,end_date.gte.${dateKey}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** 특정 날짜 요일에 걸리는 시간표 항목 */
async function getTimetableItemsForDate(
  userId: string,
  dateKey: string
): Promise<TimetableItem[]> {
  const active = await getActiveTimetables(userId, dateKey);
  if (active.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_items")
    .select("*")
    .in(
      "timetable_id",
      active.map((t) => t.id)
    )
    .eq("weekday", isoWeekday(dateKey))
    .order("start_time", { ascending: true });

  return data ?? [];
}

/**
 * 홈 화면 한 판에 필요한 데이터를 한 번에 가져옵니다.
 * 2명이 쓰는 앱이라 캐시 레이어 없이 요청마다 그대로 읽습니다.
 */
export async function getDashboardData(
  userId: string,
  date: string
): Promise<DashboardData> {
  const supabase = await createClient();

  const [
    scheduleRes,
    eventsRes,
    dailyLogRes,
    timelineRes,
    tagsRes,
    goalsRes,
    keywordsRes,
    timetableItems,
  ] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("at_time", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true }),

    // 내 일정 + 공동 일정 중 이 날짜에 걸치는 것
    supabase
      .from("events")
      .select("*")
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .lte("start_date", date)
      .or(`end_date.gte.${date},end_date.is.null`)
      .order("start_time", { ascending: true, nullsFirst: false }),

    supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle(),

    supabase
      .from("timeline_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("at_time", { ascending: true }),

    // 기본 태그(user_id is null) + 내 태그
    supabase
      .from("tags")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("sort_order", { ascending: true }),

    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),

    supabase
      .from("news_keywords")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),

    getTimetableItemsForDate(userId, date),
  ]);

  const goals = goalsRes.data ?? [];

  // 일간/주간 목표가 섞여 있으니 필요한 주기 시작일을 모아서 한 번에 조회합니다.
  const wantedStarts = Array.from(
    new Set(goals.map((g) => periodStart(g.period, date)))
  );

  let goalLogs: GoalLog[] = [];
  if (goals.length > 0) {
    const { data } = await supabase
      .from("goal_logs")
      .select("*")
      .eq("user_id", userId)
      .in("period_start", wantedStarts);
    goalLogs = data ?? [];
  }

  const endsBeforeDate = (e: CalendarEvent) =>
    e.end_date ? e.end_date < date : e.start_date !== date;

  return {
    schedule: scheduleRes.data ?? [],
    events: (eventsRes.data ?? []).filter((e) => !endsBeforeDate(e)),
    dailyLog: dailyLogRes.data ?? null,
    timeline: timelineRes.data ?? [],
    tags: tagsRes.data ?? [],
    goals: goals.map((goal) => {
      const start = periodStart(goal.period, date);
      return {
        ...goal,
        periodStart: start,
        log:
          goalLogs.find(
            (l) => l.goal_id === goal.id && l.period_start === start
          ) ?? null,
      };
    }),
    keywords: keywordsRes.data ?? [],
    timetableItems,
  };
}

/** 캘린더 월간 뷰: 이 달에 걸치는 모든 일정 (내 것 + 친구 것 + 공동) */
export async function getMonthEvents(
  monthStart: string,
  monthEnd: string
): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .lte("start_date", monthEnd)
    .or(`end_date.gte.${monthStart},end_date.is.null`)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  return (data ?? []).filter((e) =>
    e.end_date ? e.end_date >= monthStart : e.start_date >= monthStart
  );
}

/** 시간표 탭: 한 사람의 시간표 목록 전체 (지난 것 포함) */
export async function getTimetables(userId: string): Promise<Timetable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timetables")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getTimetableItems(
  timetableIds: string[]
): Promise<TimetableItem[]> {
  if (timetableIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_items")
    .select("*")
    .in("timetable_id", timetableIds)
    .order("start_time", { ascending: true });
  return data ?? [];
}

/** 채팅 최신 N개. 화면에 그릴 순서(오래된 것 → 최신)로 돌려줍니다. */
export async function getMessages(limit = 50): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("seq", { ascending: false })
    .limit(limit);

  return (data ?? []).slice().reverse();
}
