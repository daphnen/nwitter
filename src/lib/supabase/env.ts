// NEXT_PUBLIC_* 는 빌드 시점에 문자열로 치환됩니다.
// process.env[name] 처럼 동적으로 읽으면 치환이 안 되므로 반드시 리터럴로 씁니다.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 .env.local 에 없습니다."
    );
  }
}
