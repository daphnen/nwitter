"use server";

import { NOT_SIGNED_IN, currentUser, saveError, type SaveResult } from "./common";
import { pushToUser } from "@/lib/push/send";

/** 브라우저가 만들어준 구독 정보 중 우리가 저장하는 부분 */
export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
};

/**
 * 이 기기의 구독을 저장합니다.
 *
 * 한 사람이 폰과 노트북을 같이 쓸 수 있어 기기마다 한 줄입니다.
 * 브라우저가 구독을 새로 만들어도 endpoint 는 같은 값으로 돌아오므로,
 * endpoint 를 기준으로 덮어씁니다.
 */
export async function savePushSubscription(
  input: SubscriptionInput
): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );

  if (error) return saveError(error);
  return {};
}

/** 이 기기의 구독을 지웁니다. 다른 기기는 그대로 둡니다. */
export async function removePushSubscription(
  endpoint: string
): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", auth.userId);

  if (error) return saveError(error);
  return {};
}

/**
 * 내 기기로 시험 알림 보내기.
 *
 * 알림이 왜 안 오는지 서버 로그를 뒤지지 않고 화면에서 바로 알 수 있게
 * 하려는 것입니다. 상대가 아니라 "나"에게 보냅니다 — 혼자서도 확인됩니다.
 */
export async function sendTestNotification(): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", auth.userId)
    .maybeSingle();

  const result = await pushToUser(auth.userId, {
    title: me?.display_name ? `${me.display_name} (시험)` : "시험 알림",
    body: "알림이 잘 오고 있어요 🐾",
    // 채팅 알림과 겹쳐 덮어쓰지 않도록 다른 tag 를 씁니다.
    tag: "test",
  });

  if (result.problem) {
    return { message: result.problem };
  }
  return {
    message: `이 계정의 기기 ${result.devices}개 중 ${result.sent}개로 보냈어요. 잠시 뒤 알림이 뜨는지 봐주세요.`,
  };
}
