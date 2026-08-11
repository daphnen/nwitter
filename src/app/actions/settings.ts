"use server";

import { revalidatePath } from "next/cache";
import {
  NOT_SIGNED_IN,
  currentUser,
  requireUser,
  saveError,
  type SaveResult,
} from "./common";
import type { CardKey, ThemeName } from "@/lib/database.types";

/**
 * 내 테마(스킨)를 바꿉니다. 상대방 화면에는 영향이 없습니다.
 *
 * 실패 사유를 돌려줍니다. theme 컬럼에는 허용값 check 제약이 걸려 있어서,
 * 새 테마를 추가하고 마이그레이션을 안 돌리면 여기서 조용히 막힙니다.
 */
export async function updateTheme(theme: ThemeName): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase
    .from("profiles")
    .update({ theme })
    .eq("id", auth.userId);

  if (error) {
    // 23514 = check 제약 위반
    if (error.code === "23514") {
      return {
        message: `"${theme}" 테마를 아직 데이터베이스가 몰라요. supabase/migrations/0004_theme_koi.sql 을 SQL Editor 에서 실행해 주세요.`,
      };
    }
    return saveError(error);
  }

  // <html data-theme> 은 루트 레이아웃이 만들기 때문에 layout 까지 다시 그립니다.
  revalidatePath("/", "layout");
  return {};
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
