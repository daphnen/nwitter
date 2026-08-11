"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";
import type { CardKey, ThemeName } from "@/lib/database.types";

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

/**
 * 카드 순서 / 접힘 / 숨김 저장.
 * 화면은 이미 낙관적으로 바뀐 뒤라 여기서는 조용히 저장만 합니다.
 */
export async function updateCardLayout(patch: {
  cardOrder?: CardKey[];
  collapsedCards?: CardKey[];
  hiddenCards?: CardKey[];
}) {
  const { supabase, userId } = await requireUser();

  await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      ...(patch.cardOrder ? { card_order: patch.cardOrder } : {}),
      ...(patch.collapsedCards ? { collapsed_cards: patch.collapsedCards } : {}),
      ...(patch.hiddenCards ? { hidden_cards: patch.hiddenCards } : {}),
    },
    { onConflict: "user_id" }
  );

  // 홈만 다시 그리면 됩니다. 레이아웃(테마)까지 건드릴 필요는 없어요.
  revalidatePath("/");
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
