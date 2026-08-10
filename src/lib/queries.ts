import { createClient } from "@/lib/supabase/server";
import { periodStart } from "@/lib/date";
import type {
  CalendarEvent,
  DailyLog,
  Goal,
  GoalLog,
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
};

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
  };
}
