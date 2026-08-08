// 날짜 유틸 — 모든 기록은 'YYYY-MM-DD' 문자열을 키로 씁니다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function toKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return toKey(new Date());
}

export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(key, days) {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function formatKo(key) {
  const d = fromKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function isToday(key) {
  return key === todayKey();
}

export function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// 이번 주 월요일 ~ 일요일 키 목록
export function weekKeys(key) {
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7; // 월요일 시작
  d.setDate(d.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(d);
    t.setDate(d.getDate() + i);
    return toKey(t);
  });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "늦은 밤이에요, 얼른 자야 해요", emoji: "🌙" };
  if (h < 11) return { text: "좋은 아침이에요", emoji: "🌤" };
  if (h < 14) return { text: "점심은 챙겨 드셨나요", emoji: "🍙" };
  if (h < 18) return { text: "오후도 힘내요", emoji: "🌿" };
  if (h < 22) return { text: "오늘 하루 수고했어요", emoji: "🌇" };
  return { text: "포근한 밤 되세요", emoji: "🌙" };
}
