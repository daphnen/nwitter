/**
 * 날짜는 전부 KST(Asia/Seoul) 기준 'YYYY-MM-DD' 문자열로 다룹니다.
 * 서버와 브라우저가 서로 다른 시간대에 있어도 같은 값이 나오도록
 * Intl 의 timeZone 옵션으로 계산합니다.
 */

export const TIME_ZONE = "Asia/Seoul";

const KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date → 'YYYY-MM-DD' (KST) */
export function toKey(date: Date = new Date()): string {
  return KEY_FORMATTER.format(date);
}

/** KST 기준 오늘 */
export function todayKey(): string {
  return toKey(new Date());
}

/** 'YYYY-MM-DD' → 시간대에 흔들리지 않는 Date (정오로 고정) */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function shiftKey(key: string, days: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** KST 기준 현재 시각 'HH:MM' */
export function nowTimeKST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function formatKo(key: string): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function isToday(key: string): boolean {
  return key === todayKey();
}

/** 목표 반복 주기의 시작일. SQL 의 public.period_start() 와 같은 규칙입니다. */
export function periodStart(period: "daily" | "weekly", key: string): string {
  if (period !== "weekly") return key;
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7; // 월요일 시작
  return shiftKey(key, -offset);
}

// ------------------------------------------------------------------ 월간 뷰

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function shiftMonth(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthKo(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${y}년 ${m}월`;
}

export function monthRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(last).padStart(2, "0")}`,
  };
}

/**
 * 월간 격자에 깔 날짜들. 항상 월요일에서 시작하고 주 단위로 떨어지게
 * 앞뒤 달 날짜를 채웁니다.
 */
export function monthGridDays(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7; // 월요일 시작
  const start = new Date(y, m - 1, 1 - offset);

  const lastDay = new Date(y, m, 0).getDate();
  const totalCells = Math.ceil((offset + lastDay) / 7) * 7;

  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });
}

export function greeting(now: Date = new Date()): { text: string; emoji: string } {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );

  if (hour < 5) return { text: "늦은 밤이에요, 얼른 자야 해요", emoji: "🌙" };
  if (hour < 11) return { text: "좋은 아침이에요", emoji: "🌤" };
  if (hour < 14) return { text: "점심은 챙겨 드셨나요", emoji: "🍙" };
  if (hour < 18) return { text: "오후도 힘내요", emoji: "🌿" };
  if (hour < 22) return { text: "오늘 하루 수고했어요", emoji: "🌇" };
  return { text: "포근한 밤 되세요", emoji: "🌙" };
}
