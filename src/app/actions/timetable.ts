"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./common";
import type { ColorKey, TimetableDays } from "@/lib/database.types";

export async function addTimetable(input: {
  name: string;
  startDate: string | null;
  endDate: string | null;
  days: TimetableDays;
}) {
  const { supabase, userId } = await requireUser();
  const name = input.name.trim();
  if (!name) return;

  await supabase.from("timetables").insert({
    user_id: userId,
    name,
    start_date: input.startDate,
    end_date: input.endDate,
    days: input.days,
  });

  revalidatePath("/timetable");
  revalidatePath("/");
}

export async function updateTimetable(
  id: string,
  patch: {
    name?: string;
    startDate?: string | null;
    endDate?: string | null;
    days?: TimetableDays;
  }
) {
  const { supabase } = await requireUser();

  await supabase
    .from("timetables")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
      ...(patch.endDate !== undefined ? { end_date: patch.endDate } : {}),
      ...(patch.days !== undefined ? { days: patch.days } : {}),
    })
    .eq("id", id);

  revalidatePath("/timetable");
  revalidatePath("/");
}

export async function removeTimetable(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("timetables").delete().eq("id", id);
  revalidatePath("/timetable");
  revalidatePath("/");
}

export async function addTimetableItem(input: {
  timetableId: string;
  title: string;
  location: string;
  /** 여러 요일에 걸치는 수업은 요일마다 한 줄씩 만듭니다. */
  weekdays: number[];
  startTime: string;
  endTime: string;
  colorKey: ColorKey;
}) {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title || input.weekdays.length === 0) return;
  if (input.endTime <= input.startTime) return;

  await supabase.from("timetable_items").insert(
    input.weekdays.map((weekday) => ({
      timetable_id: input.timetableId,
      user_id: userId,
      title,
      location: input.location.trim(),
      weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      color_key: input.colorKey,
    }))
  );

  revalidatePath("/timetable");
  revalidatePath("/");
}

export async function removeTimetableItem(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("timetable_items").delete().eq("id", id);
  revalidatePath("/timetable");
  revalidatePath("/");
}
