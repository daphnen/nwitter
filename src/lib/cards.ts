import { CARD_KEYS, type CardKey, type ColorKey } from "@/lib/database.types";

/** 홈 카드의 제목·아이콘·색 계열. 홈과 설정이 같은 표를 봅니다. */
export const CARD_META: Record<
  CardKey,
  { title: string; emoji: string; tone: ColorKey }
> = {
  schedule: { title: "오늘의 일정", emoji: "🗓", tone: "blue" },
  meals: { title: "오늘 뭐 먹었나요", emoji: "🍚", tone: "orange" },
  timeline: { title: "하루 일과 기록", emoji: "🐾", tone: "purple" },
  goals: { title: "나의 목표", emoji: "🎯", tone: "green" },
  news: { title: "관심 뉴스", emoji: "📰", tone: "yellow" },
};

function isCardKey(value: unknown): value is CardKey {
  return typeof value === "string" && (CARD_KEYS as readonly string[]).includes(value);
}

/**
 * 저장된 순서를 믿되 고칩니다.
 * 모르는 키는 버리고, 빠진 카드는 뒤에 붙입니다.
 * (카드를 새로 추가해도 기존 사용자 설정이 깨지지 않게)
 */
export function normalizeCardOrder(saved: unknown): CardKey[] {
  const list = Array.isArray(saved) ? saved.filter(isCardKey) : [];
  const seen = new Set(list);
  return [...list, ...CARD_KEYS.filter((k) => !seen.has(k))];
}

export function normalizeCardKeys(saved: unknown): CardKey[] {
  return Array.isArray(saved) ? saved.filter(isCardKey) : [];
}

/** 홈 카드가 공통으로 받는 접기 관련 props */
export type CardChrome = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};
