/**
 * supabase/migrations/0001_init.sql 과 짝을 이루는 타입 정의입니다.
 * 스키마를 바꾸면 이 파일도 같이 고쳐주세요.
 */

export type ThemeName = "moonlight" | "aqua";
export type GoalPeriod = "daily" | "weekly";
export type ColorKey =
  | "blue"
  | "orange"
  | "purple"
  | "green"
  | "yellow"
  | "pink"
  | "mint"
  | "gray";

/** 홈 카드 식별자. user_preferences 의 jsonb 배열에 이 값이 들어갑니다. */
export type CardKey = "schedule" | "meals" | "timeline" | "goals" | "news";

export const CARD_KEYS: readonly CardKey[] = [
  "schedule",
  "meals",
  "timeline",
  "goals",
  "news",
] as const;

// ---------------------------------------------------------------- Row 타입

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_emoji: string;
  theme: ThemeName;
  created_at: string;
  updated_at: string;
};

export type DailyLog = {
  id: string;
  user_id: string;
  date: string;
  breakfast: string;
  breakfast_mood: string;
  lunch: string;
  lunch_mood: string;
  dinner: string;
  dinner_mood: string;
  created_at: string;
  updated_at: string;
};

export type ScheduleItem = {
  id: string;
  user_id: string;
  date: string;
  at_time: string | null;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  user_id: string | null;
  name: string;
  emoji: string;
  color_key: ColorKey;
  sort_order: number;
  created_at: string;
};

export type TimelineEntry = {
  id: string;
  user_id: string;
  date: string;
  at_time: string;
  content: string;
  tag_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  target: number;
  period: GoalPeriod;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GoalLog = {
  id: string;
  goal_id: string;
  user_id: string;
  period_start: string;
  progress: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  /** null 이면 공동 일정 */
  owner_id: string | null;
  created_by: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  created_at: string;
  updated_at: string;
};

export type NewsKeyword = {
  id: string;
  user_id: string;
  keyword: string;
  sort_order: number;
  created_at: string;
};

export type UserPreferences = {
  user_id: string;
  card_order: CardKey[];
  collapsed_cards: CardKey[];
  hidden_cards: CardKey[];
  dark_mode: boolean;
  updated_at: string;
};

// -------------------------------------------------------- Database 제네릭

/**
 * 교집합(A & B)을 하나의 매핑 타입으로 펴줍니다.
 * supabase-js 는 Insert/Update 가 Record<string, unknown> 에 대입 가능하길
 * 요구하는데, 교집합 그대로면 암묵적 인덱스 시그니처가 붙지 않아
 * 스키마 전체가 never 로 떨어집니다.
 */
type Prettify<T> = { [K in keyof T]: T[K] };

/** 서버가 채워주는 컬럼은 빼고, R 에 나열한 것만 필수로 만듭니다. */
type Insertable<T, R extends keyof T> = Prettify<
  Pick<T, R> & Partial<Omit<T, R>>
>;

type Table<Row, RequiredOnInsert extends keyof Row> = {
  Row: Row;
  Insert: Insertable<Row, RequiredOnInsert>;
  Update: Partial<Row>;
  Relationships: [];
};

/** Supabase 가 생성하는 타입과 같은 형태의 "빈 레코드" */
type Empty = { [_ in never]: never };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id" | "email">;
      daily_logs: Table<DailyLog, "user_id" | "date">;
      schedule_items: Table<ScheduleItem, "user_id" | "date" | "title">;
      tags: Table<Tag, "name">;
      timeline_entries: Table<
        TimelineEntry,
        "user_id" | "date" | "at_time" | "content"
      >;
      goals: Table<Goal, "user_id" | "title">;
      goal_logs: Table<GoalLog, "goal_id" | "user_id" | "period_start">;
      events: Table<CalendarEvent, "created_by" | "title" | "start_date">;
      news_keywords: Table<NewsKeyword, "user_id" | "keyword">;
      user_preferences: Table<UserPreferences, "user_id">;
    };
    Views: Empty;
    Functions: {
      kst_today: { Args: Empty; Returns: string };
      period_start: {
        Args: { p_period: GoalPeriod; p_date: string };
        Returns: string;
      };
      is_member: { Args: Empty; Returns: boolean };
    };
    Enums: Empty;
    CompositeTypes: Empty;
  };
};
