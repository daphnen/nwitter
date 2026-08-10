"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";
import type { ThemeName } from "@/lib/database.types";

/** 내 테마(스킨)를 바꿉니다. 상대방 화면에는 영향이 없습니다. */
export async function updateTheme(theme: ThemeName) {
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ theme }).eq("id", userId);

  // <html data-theme> 은 루트 레이아웃이 만들기 때문에 layout 까지 다시 그립니다.
  revalidatePath("/", "layout");
}

export async function updateDarkMode(darkMode: boolean) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, dark_mode: darkMode }, { onConflict: "user_id" });

  revalidatePath("/", "layout");
}

export async function updateDisplayName(name: string) {
  const { supabase, userId } = await requireUser();
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return;

  await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", userId);

  revalidatePath("/", "layout");
}
