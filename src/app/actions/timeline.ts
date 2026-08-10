"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";
import type { ColorKey } from "@/lib/database.types";

export async function addTimelineEntry(input: {
  date: string;
  atTime: string;
  content: string;
  tagId: string | null;
}) {
  const { supabase, userId } = await requireUser();
  const content = input.content.trim();
  if (!content) return;

  await supabase.from("timeline_entries").insert({
    user_id: userId,
    date: input.date,
    at_time: input.atTime,
    content,
    tag_id: input.tagId,
  });

  revalidatePath("/");
}

export async function removeTimelineEntry(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("timeline_entries").delete().eq("id", id);
  revalidatePath("/");
}

export async function addTag(input: {
  name: string;
  emoji: string;
  colorKey: ColorKey;
}) {
  const { supabase, userId } = await requireUser();
  const name = input.name.trim();
  if (!name) return;

  await supabase.from("tags").insert({
    user_id: userId,
    name,
    emoji: input.emoji,
    color_key: input.colorKey,
  });

  revalidatePath("/");
}
