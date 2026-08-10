import type { Timetable, TimetableItem } from "@/lib/database.types";
import { fromKey } from "@/lib/date";

/** ISO 요일: 1=월 … 7=일 */
export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function isoWeekday(dateKey: string): number {
  const day = fromKey(dateKey).getDay(); // 0=일
  return day === 0 ? 7 : day;
}

export function weekdaysOf(timetable: Pick<Timetable, "days">): number[] {
  return timetable.days === "mon_sun"
    ? [1, 2, 3, 4, 5, 6, 7]
    : [1, 2, 3, 4, 5];
}

/** 'HH:MM[:SS]' → 자정부터의 분 */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** 유효기간이 오늘(기준일)을 품고 있는 시간표만 */
export function isActiveOn(timetable: Timetable, dateKey: string): boolean {
  return statusOn(timetable, dateKey) === "active";
}

export type TimetableStatus = "upcoming" | "active" | "past";

export function statusOn(timetable: Timetable, dateKey: string): TimetableStatus {
  if (timetable.start_date && dateKey < timetable.start_date) return "upcoming";
  if (timetable.end_date && dateKey > timetable.end_date) return "past";
  return "active";
}

export const STATUS_LABEL: Record<TimetableStatus, string | null> = {
  upcoming: "예정",
  active: null,
  past: "지남",
};

export function periodLabel(timetable: Timetable): string {
  const { start_date: s, end_date: e } = timetable;
  if (!s && !e) return "기간 제한 없음";
  if (s && e) return `${s} ~ ${e}`;
  if (s) return `${s} 부터`;
  return `${e} 까지`;
}

/**
 * 격자의 세로 범위를 항목에 맞춰 정합니다.
 * 항목이 없거나 좁으면 09:00~18:00 은 최소한 보여줍니다.
 */
export function gridRange(items: TimetableItem[]): { from: number; to: number } {
  const DEFAULT_FROM = 9 * 60;
  const DEFAULT_TO = 18 * 60;
  if (items.length === 0) return { from: DEFAULT_FROM, to: DEFAULT_TO };

  const starts = items.map((i) => toMinutes(i.start_time));
  const ends = items.map((i) => toMinutes(i.end_time));

  // 시간 단위로 내림/올림해서 눈금이 딱 떨어지게
  const from = Math.min(DEFAULT_FROM, Math.floor(Math.min(...starts) / 60) * 60);
  const to = Math.max(DEFAULT_TO, Math.ceil(Math.max(...ends) / 60) * 60);
  return { from, to };
}

export const SLOT_MINUTES = 30;

/**
 * 둘 다 비어 있는 30분 칸을 찾습니다.
 * 반환값은 "요일-슬롯시작분" 키의 집합입니다.
 */
export function freeSlots(
  mine: TimetableItem[],
  theirs: TimetableItem[],
  weekdays: number[],
  range: { from: number; to: number }
): Set<string> {
  const busy = new Set<string>();

  for (const item of [...mine, ...theirs]) {
    const start = toMinutes(item.start_time);
    const end = toMinutes(item.end_time);
    const first = Math.floor(start / SLOT_MINUTES) * SLOT_MINUTES;
    for (let t = first; t < end; t += SLOT_MINUTES) {
      busy.add(`${item.weekday}-${t}`);
    }
  }

  const free = new Set<string>();
  for (const weekday of weekdays) {
    for (let t = range.from; t < range.to; t += SLOT_MINUTES) {
      const key = `${weekday}-${t}`;
      if (!busy.has(key)) free.add(key);
    }
  }
  return free;
}

/**
 * 같은 요일에 시간이 겹치는 항목들을 나란히 놓기 위해 열을 배정합니다.
 * 에브리타임처럼 겹치는 수업이 있어도 서로 가리지 않게 합니다.
 */
export function layoutDay(items: TimetableItem[]): {
  item: TimetableItem;
  column: number;
  columns: number;
}[] {
  const sorted = [...items].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)
  );

  const placed: { item: TimetableItem; column: number; end: number }[] = [];
  const result: { item: TimetableItem; column: number; columns: number }[] = [];

  // 서로 겹치는 덩어리 단위로 끊어서 열 수를 계산합니다.
  let cluster: typeof result = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = cluster.reduce((max, c) => Math.max(max, c.column + 1), 1);
    cluster.forEach((c) => (c.columns = columns));
    cluster = [];
  };

  for (const item of sorted) {
    const start = toMinutes(item.start_time);
    const end = toMinutes(item.end_time);

    if (start >= clusterEnd && cluster.length > 0) {
      flush();
      placed.length = 0;
    }

    let column = 0;
    while (placed.some((p) => p.column === column && p.end > start)) column += 1;

    placed.push({ item, column, end });
    const entry = { item, column, columns: 1 };
    cluster.push(entry);
    result.push(entry);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();

  return result;
}
