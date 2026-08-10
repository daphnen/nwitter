"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";

export async function addKeyword(keyword: string) {
  const { supabase, userId } = await requireUser();
  const trimmed = keyword.trim();
  if (!trimmed) return;

  await supabase
    .from("news_keywords")
    .insert({ user_id: userId, keyword: trimmed });

  revalidatePath("/");
}

export async function removeKeyword(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("news_keywords").delete().eq("id", id);
  revalidatePath("/");
}
