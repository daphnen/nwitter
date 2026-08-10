"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";

export type MealSlot = "breakfast" | "lunch" | "dinner";

/**
 * 하루 한 줄(daily_logs)에 끼니 칸만 갱신합니다.
 * (user_id, date) 유니크라 upsert 한 번이면 생성·수정이 모두 해결됩니다.
 */
export async function saveMeal(input: {
  date: string;
  slot: MealSlot;
  text?: string;
  mood?: string;
}) {
  const { supabase, userId } = await requireUser();

  const patch: Record<string, string> = {};
  if (input.text !== undefined) patch[input.slot] = input.text.trim();
  if (input.mood !== undefined) patch[`${input.slot}_mood`] = input.mood;
  if (Object.keys(patch).length === 0) return;

  await supabase
    .from("daily_logs")
    .upsert(
      { user_id: userId, date: input.date, ...patch },
      { onConflict: "user_id,date" }
    );

  revalidatePath("/");
}
