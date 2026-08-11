import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { VIEWING_WINDOW_MS } from "@/lib/chat";
import { VAPID_PUBLIC_KEY } from "./env";

/** 알림 본문에 넣을 최대 길이. 길면 잘라서 뒤에 … 를 붙입니다. */
const BODY_LIMIT = 80;

/** 설정이 안 됐으면 사람이 읽을 수 있는 사유, 정상이면 null */
export function pushSetupProblem(): string | null {
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

  /*
   * 길이만 다룹니다. 값 자체는 로그에도 화면에도 절대 내보내지 않습니다.
   * "아예 안 실림"과 "실렸는데 빈 값"을 구분하려는 것입니다.
   * 정상값: 공개키 87자, 비밀키 43자, subject 는 mailto: 로 시작.
   */
  const lengths =
    `공개키 ${publicKey.length}자, 비밀키 ${privateKey.length}자, ` +
    `subject ${subject.length}자, service_role ${(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length}자`;

  if (missing.length) {
    const why = `환경변수가 없어요: ${missing.join(", ")} (${lengths})`;
    console.error("[푸시]", why);
    return why;
  }

  try {
    // setVapidDetails 는 형식이 틀리면 예외를 던집니다.
    // 특히 subject 는 mailto: 나 https:// 로 시작해야 합니다.
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return null;
  } catch (error) {
    const why = `VAPID 값이 잘못됐어요: ${(error as Error).message} (${lengths})`;
    console.error("[푸시]", why);
    return why;
  }
}

export type ChatNotice = {
  /** 받을 사람 */
  toUserId: string;
  /** 알림 제목에 들어갈 보낸 사람 이름 */
  fromName: string;
  body: string;
};

export type PushOutcome = {
  /** 보낸 기기 수 */
  sent: number;
  /** 그 사람이 등록해둔 기기 수 */
  devices: number;
  /** 사라져서 지운 기기 수 */
  removed: number;
  /** 못 보냈으면 사람이 읽을 수 있는 사유 */
  problem?: string;
};

/**
 * 한 사람의 모든 기기로 알림을 보냅니다.
 *
 * 실패해도 예외를 던지지 않습니다. 알림이 안 갔다고 메시지 전송이 실패한 것처럼
 * 보이면 안 됩니다. 결과는 돌려주고, 부르는 쪽이 로그로 남기거나 화면에 띄웁니다.
 */
export async function pushToUser(
  userId: string,
  payload: { title: string; body: string; tag: string }
): Promise<PushOutcome> {
  const setup = pushSetupProblem();
  if (setup) return { sent: 0, devices: 0, removed: 0, problem: setup };

  const admin = createAdminClient();
  if (!admin) {
    return {
      sent: 0,
      devices: 0,
      removed: 0,
      problem: "SUPABASE_SERVICE_ROLE_KEY 가 없어 구독을 읽지 못했어요.",
    };
  }

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return { sent: 0, devices: 0, removed: 0, problem: `구독을 읽지 못했어요: ${error.message}` };
  }
  if (!subs?.length) {
    return {
      sent: 0,
      devices: 0,
      removed: 0,
      problem: "이 계정으로 알림을 켠 기기가 없어요. 설정에서 스위치를 켜주세요.",
    };
  }

  const text = JSON.stringify({
    title: payload.title,
    body:
      payload.body.length > BODY_LIMIT
        ? `${payload.body.slice(0, BODY_LIMIT)}…`
        : payload.body,
    url: "/chat",
    tag: payload.tag,
  });

  const dead: string[] = [];
  const failures: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          text,
          { TTL: 60 * 60 * 12 }
        );
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 = 그 기기의 구독이 사라졌습니다. 다시 보낼 일이 없으니 지웁니다.
        if (status === 404 || status === 410) {
          dead.push(sub.endpoint);
        } else {
          failures.push(`${status ?? "?"} ${(error as Error).message}`);
        }
      }
    })
  );

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  if (sent) {
    // 마지막으로 성공한 시각. 설정 화면에서 기기를 정리할 때 참고합니다.
    const alive = subs.filter((s) => !dead.includes(s.endpoint)).map((s) => s.endpoint);
    await admin
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("endpoint", alive);
  }

  return {
    sent,
    devices: subs.length,
    removed: dead.length,
    problem: sent === 0 ? failures[0] ?? "모든 기기에서 발송에 실패했어요." : undefined,
  };
}

/** 채팅 알림. 상대가 지금 보고 있으면 보내지 않습니다. */
export async function notifyChat(notice: ChatNotice): Promise<void> {
  const admin = createAdminClient();
  if (admin) {
    const { data: prefs } = await admin
      .from("user_preferences")
      .select("chat_read_at")
      .eq("user_id", notice.toUserId)
      .maybeSingle();

    if (prefs?.chat_read_at) {
      const idle = Date.now() - new Date(prefs.chat_read_at).getTime();
      if (idle < VIEWING_WINDOW_MS) {
        console.log(`[푸시] 건너뜀 — 상대가 ${Math.round(idle / 1000)}초 전에 채팅을 봤습니다.`);
        return;
      }
    }
  }

  const result = await pushToUser(notice.toUserId, {
    title: notice.fromName,
    body: notice.body,
    tag: "chat",
  });

  console.log(
    `[푸시] 기기 ${result.devices}개 중 ${result.sent}개 성공` +
      (result.removed ? `, 사라진 구독 ${result.removed}개 삭제` : "") +
      (result.problem ? ` — ${result.problem}` : "")
  );
}
