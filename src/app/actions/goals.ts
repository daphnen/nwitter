"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";
import type { GoalPeriod } from "@/lib/database.types";

export async function addGoal(input: {
  title: string;
  emoji: string;
  target: number;
  period: GoalPeriod;
}) {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title) return;

  await supabase.from("goals").insert({
    user_id: userId,
    title,
    emoji: input.emoji,
    target: Math.max(1, Math.floor(input.target) || 1),
    period: input.period,
  });

  revalidatePath("/");
}

export async function removeGoal(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("goals").delete().eq("id", id);
  revalidatePath("/");
}

/**
 * 진행도를 특정 값으로 맞춥니다.
 * 진행도는 goals 가 아니라 주기별 goal_logs 에 쌓이므로,
 * 자정이 지나면 새 행이 생기며 자연스럽게 0부터 다시 시작합니다.
 */
export async function setGoalProgress(input: {
  goalId: string;
  periodStart: string;
  progress: number;
  target: number;
}) {
  const { supabase, userId } = await requireUser();
  const progress = Math.min(input.target, Math.max(0, input.progress));

  await supabase.from("goal_logs").upsert(
    {
      goal_id: input.goalId,
      user_id: userId,
      period_start: input.periodStart,
      progress,
      completed_at: progress >= input.target ? new Date().toISOString() : null,
    },
    { onConflict: "goal_id,period_start" }
  );

  revalidatePath("/");
}
