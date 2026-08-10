"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";

export type EventOwner = "mine" | "shared";

export async function addEvent(input: {
  title: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  owner: EventOwner;
}) {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title) return;

  await supabase.from("events").insert({
    // owner_id 가 null 이면 "함께" 일정입니다. 나/친구 라벨은 보는 사람 기준이라
    // DB 에 저장하지 않고 화면에서 계산합니다.
    owner_id: input.owner === "shared" ? null : userId,
    created_by: userId,
    title,
    start_date: input.startDate,
    end_date: input.endDate,
    all_day: input.allDay,
    start_time: input.allDay ? null : input.startTime,
  });

  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function removeEvent(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/calendar");
  revalidatePath("/");
}
