"use server";

import { revalidatePath } from "next/cache";
import { NOT_SIGNED_IN, currentUser, saveError, type SaveResult } from "./common";
import type { Message } from "@/lib/database.types";

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

  revalidatePath("/chat");
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

  revalidatePath("/chat");
  return {};
}

/** 채팅을 열었을 때 "여기까지 봤다"를 갱신합니다. */
export async function markChatRead(): Promise<void> {
  const auth = await currentUser();
  if (!auth) return;

  await auth.supabase
    .from("user_preferences")
    .update({ chat_read_at: new Date().toISOString() })
    .eq("user_id", auth.userId);

  // 하단 탭의 안 읽은 점은 루트 레이아웃이 그리므로 layout 까지 다시 그립니다.
  revalidatePath("/", "layout");
}
