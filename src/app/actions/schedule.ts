"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";

export async function addScheduleItem(input: {
  date: string;
  title: string;
  atTime: string | null;
}) {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title) return;

  await supabase.from("schedule_items").insert({
    user_id: userId,
    date: input.date,
    title,
    at_time: input.atTime || null,
    done: false,
  });

  revalidatePath("/");
}

export async function toggleScheduleItem(id: string, done: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("schedule_items").update({ done }).eq("id", id);
  revalidatePath("/");
}

export async function removeScheduleItem(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("schedule_items").delete().eq("id", id);
  revalidatePath("/");
}
