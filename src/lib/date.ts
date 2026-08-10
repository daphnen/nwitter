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
