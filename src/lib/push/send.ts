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
  /*
   * trim 합니다. 붙여넣을 때 줄바꿈이나 공백이 딸려오면 값이 있어도
   * web-push 가 거부합니다.
   */
  const publicKey = VAPID_PUBLIC_KEY.trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const subject = (process.env.VAPID_SUBJECT ?? "").trim();

  const missing = [
    !publicKey && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    !privateKey && "VAPID_PRIVATE_KEY",
    !subject && "VAPID_SUBJECT",
  ].filter(Boolean);

  if (missing.length) {
    /*
     * 길이만 찍습니다. 값 자체는 절대 로그에 남기지 않습니다.
     * "아예 안 실림"과 "실렸는데 빈 값"을 구분하려는 것입니다.
     * 정상값 길이: 공개키 87, 비밀키 43, subject 는 mailto: 로 시작.
     */
    console.error(
      "[푸시] 환경변수가 없습니다:",
      missing.join(", "),
      `| 길이 확인 → 공개키 ${publicKey.length}자, 비밀키 ${privateKey.length}자,` +
        ` subject ${subject.length}자, service_role ${(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length}자`
    );
    return false;
  }

  try {
    // setVapidDetails 는 형식이 틀리면 예외를 던집니다.
    // 특히 subject 는 mailto: 나 https:// 로 시작해야 합니다.
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (error) {
    console.error("[푸시] VAPID 설정이 잘못됐습니다:", (error as Error).message);
    return false;
  }
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
    if (idle < VIEWING_WINDOW_MS) {
      console.log(
        `[푸시] 건너뜀 — 상대가 ${Math.round(idle / 1000)}초 전에 채팅을 봤습니다.`
      );
      return;
    }
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", notice.toUserId);

  if (!subs?.length) {
    console.log(`[푸시] 건너뜀 — ${notice.toUserId} 의 구독이 없습니다. 상대가 설정에서 알림을 켰는지 확인해 주세요.`);
    return;
  }

  console.log(`[푸시] ${subs.length}개 기기로 발송 시작`);

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
    console.log(`[푸시] 사라진 구독 ${dead.length}개 삭제`);
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  // 마지막으로 성공한 시각. 설정 화면에서 기기를 정리할 때 참고합니다.
  const alive = subs.filter((s) => !dead.includes(s.endpoint)).map((s) => s.endpoint);
  console.log(`[푸시] 발송 성공 ${alive.length} / ${subs.length}`);
  if (alive.length) {
    await admin
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("endpoint", alive);
  }
}
