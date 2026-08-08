import { localAdapter } from "./localAdapter";
import { createSupabaseAdapter } from "./supabaseAdapter";

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// .env 에 Supabase 정보가 있으면 무료 Postgres 를,
// 없으면 브라우저 localStorage 를 씁니다. 화면 코드는 둘을 구분하지 않습니다.
export const db = url && anonKey ? createSupabaseAdapter(url, anonKey) : localAdapter;

export const TABLES = {
  events: "events", // 일정
  goals: "goals", // 목표
  meals: "meals", // 아침·점심·저녁 기록
  logs: "logs", // 하루 일과 기록
  topics: "topics", // 관심 뉴스 키워드
};
