"use server";

import { after } from "next/server";
import { NOT_SIGNED_IN, currentUser, saveError, type SaveResult } from "./common";
import { notifyChat } from "@/lib/push/send";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHAT_ACTIVE_TTL_MS, PAGE_SIZE } from "@/lib/chat";
import type { Database, Message } from "@/lib/database.types";

/** 한 통에 담을 수 있는 글자 수. 실수로 붙여넣은 장문을 막는 정도의 상한입니다. */
const MAX_LENGTH = 2000;

export type SendResult = SaveResult & { sent?: Message };

/**
 * 메시지 보내기.
 *
 * 화면은 이미 말풍선을 그려놓고 기다립니다. 그래서 실패하면 반드시 사유를
 * 돌려줘야 합니다 — 조용히 삼키면 "보낸 것처럼 보이는데 안 간" 상태가 됩니다.
 * 성공하면 저장된 줄을 그대로 돌려줘서 화면의 임시 말풍선과 바꿔치기합니다.
 */
export async function sendMessage(content: string): Promise<SendResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const text = content.trim();
  if (!text) return { message: "빈 메시지는 보낼 수 없어요." };
  if (text.length > MAX_LENGTH) {
    return { message: `한 번에 ${MAX_LENGTH}자까지 보낼 수 있어요.` };
  }

  const { data, error } = await auth.supabase
    .from("messages")
    .insert({ sender_id: auth.userId, content: text })
    .select("*")
    .single();

  if (error) return saveError(error);

  // 보낸 사람은 방금 것까지 읽은 것으로 둡니다. 내 글에 안 읽은 점이 뜨면 이상해요.
  await auth.supabase
    .from("user_preferences")
    .update({ chat_read_at: new Date().toISOString() })
    .eq("user_id", auth.userId);

  /*
   * 상대에게 알림 보내기.
   *
   * after() 는 응답을 보낸 뒤에 돌므로, 푸시 서버 왕복(수백 ms)이 메시지
   * 전송 속도에 얹히지 않습니다. 그냥 await 하면 말풍선이 그만큼 늦게
   * 확정되고, 안 기다리면 서버리스에서 함수가 먼저 종료돼 발송이 끊깁니다.
   */
  after(async () => {
    try {
      const partnerId = await findPartnerId(auth.supabase, auth.userId);
      if (!partnerId) {
        console.error("[푸시] 상대방 프로필을 찾지 못했습니다.");
        return;
      }

      const { data: me } = await auth.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", auth.userId)
        .maybeSingle();

      await notifyChat({
        toUserId: partnerId,
        fromName: me?.display_name || "메시지",
        body: text,
      });
    } catch (error) {
      // after() 안에서 터진 예외는 아무 데도 안 남습니다. 직접 남깁니다.
      console.error("[푸시] 알림 처리 중 오류:", error);
    }
  });

  /*
   * 일부러 revalidatePath 를 부르지 않습니다.
   * 채팅 화면을 다시 그리면 서버가 준 "최신 50개"로 목록이 초기화되면서,
   * 위로 스크롤해 불러온 이전 메시지와 스크롤 위치가 통째로 날아갑니다.
   * 화면 갱신은 낙관적 업데이트와 실시간 수신이 맡습니다.
   */
  return { sent: data };
}

/**
 * 삭제 표시.
 *
 * 줄을 지우지 않고 deleted_at 을 채웁니다. 다만 content 도 함께 비웁니다.
 * 둘 다 모든 줄을 읽을 수 있어서, 글자를 남겨두면 화면에만 "삭제된 메시지"이고
 * 상대 브라우저로는 원문이 그대로 내려갑니다.
 */
export async function deleteMessage(id: string): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: "" })
    .eq("id", id)
    .eq("sender_id", auth.userId); // RLS 도 막지만 의도를 코드에 남깁니다

  if (error) return saveError(error);
  return {};
}

/**
 * 채팅 화면을 보고 있는지 알립니다.
 *
 * 시각 계산은 서버에서 합니다. 브라우저 시계가 틀어져 있으면 "언제까지
 * 보는 중"이 엉뚱한 값이 되어, 알림이 영영 안 오거나 항상 오게 됩니다.
 *
 * 켤 때는 읽은 시각도 같이 찍습니다. 보고 있다는 건 읽었다는 뜻이고,
 * 요청도 한 번으로 끝납니다.
 *
 * revalidate 는 하지 않습니다. 채팅 화면에 있는 동안에는 하단 탭의 점이
 * 어차피 숨겨져 있고, 다른 탭으로 옮기면 그때 레이아웃이 다시 그려집니다.
 */
export async function markChatActive(active: boolean): Promise<void> {
  const auth = await currentUser();
  if (!auth) return;

  const now = Date.now();

  await auth.supabase
    .from("user_preferences")
    .update(
      active
        ? {
            chat_read_at: new Date(now).toISOString(),
            chat_active_until: new Date(now + CHAT_ACTIVE_TTL_MS).toISOString(),
          }
        : // 떠날 때 읽은 시각은 건드리지 않습니다. 그건 별개입니다.
          { chat_active_until: null }
    )
    .eq("user_id", auth.userId);
}

export type OlderResult = {
  items: Message[];
  /** 더 위로 남은 게 있는지 */
  hasMore: boolean;
  message?: string;
};

/**
 * beforeSeq 보다 앞선 메시지들.
 *
 * 커서를 seq 로 잡습니다. created_at 이었다면 같은 순간에 들어온 두 줄에서
 * 한 통이 건너뛰거나 두 번 실릴 수 있습니다.
 */
export async function loadOlderMessages(beforeSeq: number): Promise<OlderResult> {
  const auth = await currentUser();
  if (!auth) return { items: [], hasMore: false, message: NOT_SIGNED_IN.message };

  const { data, error } = await auth.supabase
    .from("messages")
    .select("*")
    .lt("seq", beforeSeq)
    .order("seq", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    return { items: [], hasMore: true, message: saveError(error).message };
  }

  const rows = data ?? [];
  return { items: rows.slice().reverse(), hasMore: rows.length === PAGE_SIZE };
}

/** 이 앱을 쓰는 두 사람 중 내가 아닌 쪽의 id */
async function findPartnerId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
