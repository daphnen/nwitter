/*
 * 웹 푸시(VAPID) 환경변수.
 *
 * 공개키만 브라우저로 나갑니다. 비밀키는 서버에서만 읽히므로 NEXT_PUBLIC_ 을
 * 붙이면 안 됩니다 — 붙이는 순간 누구나 이 앱 이름으로 알림을 보낼 수 있습니다.
 *
 * 키 만들기:  npx web-push generate-vapid-keys
 *
 * 넣을 곳: Vercel → Settings → Environment Variables, 그리고 로컬 .env.local
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT           예) mailto:me@example.com
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 키가 없어도 앱은 정상 동작합니다. 설정 화면의 알림 스위치만 잠깁니다.
 */

// NEXT_PUBLIC_* 는 빌드 시점에 치환되므로 반드시 리터럴로 읽습니다.
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** 브라우저에서 "알림을 켤 수 있는 상태인지" 판단할 때 씁니다. */
export const pushConfigured = VAPID_PUBLIC_KEY.length > 0;
