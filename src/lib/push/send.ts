import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { VAPID_PUBLIC_KEY } from "./env";

/** 알림 본문에 넣을 최대 길이. 길면 잘라서 뒤에 … 를 붙입니다. */
const BODY_LIMIT = 80;

/**
 * 이 시간 안에 상대가 채팅을 읽었으면 지금 보고 있는 중으로 봅니다.
 * 채팅 화면이 열려 있는 동안 chat_read_at 을 주기적으로 갱신하므로,
 * 이 창보다 최근이면 화면을 보고 있다는 뜻입니다.
 */
const VIEWING_WINDOW_MS = 75_000;

function configure(): boolean {
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "";
  if (!VAPID_PUBLIC_KEY || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);
  return true;
}

export type ChatNotice = {
  /** 받을 사람 */
  toUserId: string;
  /** 알림 제목에 들어갈 보낸 사람 이름 */
  fromName: string;
  body: string;
};

/**
 * 상대방의 모든 기기에 채팅 알림을 보냅니다.
 *
 * 실패해도 예외를 던지지 않습니다. 알림이 안 갔다고 메시지 전송이 실패한 것처럼
 * 보이면 안 됩니다. 문제는 서버 로그에만 남깁니다.
 */
export async function notifyChat(notice: ChatNotice): Promise<void> {
  if (!configure()) return; // VAPID 키가 아직 없는 상태

  const admin = createAdminClient();
  if (!admin) {
    console.error("[푸시] SUPABASE_SERVICE_ROLE_KEY 가 없어 구독을 읽지 못했습니다.");
    return;
  }

  // 상대가 지금 채팅을 보고 있으면 보내지 않습니다.
  const { data: prefs } = await admin
    .from("user_preferences")
    .select("chat_read_at")
    .eq("user_id", notice.toUserId)
    .maybeSingle();

  if (prefs?.chat_read_at) {
    const idle = Date.now() - new Date(prefs.chat_read_at).getTime();
    if (idle < VIEWING_WINDOW_MS) return;
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", notice.toUserId);

  if (!subs?.length) return;

  const body =
    notice.body.length > BODY_LIMIT
      ? `${notice.body.slice(0, BODY_LIMIT)}…`
      : notice.body;

  const payload = JSON.stringify({
    title: notice.fromName,
    body,
    url: "/chat",
    // 같은 대화의 알림은 하나로 덮어씁니다. 여러 개가 쌓이지 않게.
    tag: "chat",
  });

  const dead: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 60 * 60 * 12 }
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 = 그 기기의 구독이 사라졌습니다. 다시 보낼 일이 없으니 지웁니다.
        if (status === 404 || status === 410) {
          dead.push(sub.endpoint);
        } else {
          console.error("[푸시] 발송 실패", status, (error as Error).message);
        }
      }
    })
  );

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  // 마지막으로 성공한 시각. 설정 화면에서 기기를 정리할 때 참고합니다.
  const alive = subs.filter((s) => !dead.includes(s.endpoint)).map((s) => s.endpoint);
  if (alive.length) {
    await admin
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("endpoint", alive);
  }
}
