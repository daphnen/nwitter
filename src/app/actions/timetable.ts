"use server";

import { revalidatePath } from "next/cache";
import {
  NOT_SIGNED_IN,
  currentUser,
  saveError,
  type SaveResult,
} from "./common";
import type { ColorKey, TimetableDays } from "@/lib/database.types";

/*
 * 시간표 쓰기는 전부 실패 사유를 돌려줍니다.
 * 예전에는 Supabase 가 준 error 를 버려서, 저장이 막혀도 화면에는 아무 일도
 * 일어나지 않았습니다. 무엇이 잘못됐는지 알 수가 없었습니다.
 */

function done(): void {
  revalidatePath("/timetable");
  revalidatePath("/");
}

export async function addTimetable(input: {
  name: string;
  startDate: string | null;
  endDate: string | null;
  days: TimetableDays;
}): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const name = input.name.trim();
  if (!name) return { message: "시간표 이름을 적어 주세요." };

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    return { message: "종료일이 시작일보다 빨라요." };
  }

  const { error } = await auth.supabase.from("timetables").insert({
    user_id: auth.userId,
    name,
    start_date: input.startDate,
    end_date: input.endDate,
    days: input.days,
  });

  if (error) return saveError(error);
  done();
  return {};
}

export async function updateTimetable(
  id: string,
  patch: {
    name?: string;
    startDate?: string | null;
    endDate?: string | null;
    days?: TimetableDays;
  }
): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase
    .from("timetables")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
      ...(patch.endDate !== undefined ? { end_date: patch.endDate } : {}),
      ...(patch.days !== undefined ? { days: patch.days } : {}),
    })
    .eq("id", id);

  if (error) return saveError(error);
  done();
  return {};
}

export async function removeTimetable(id: string): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase.from("timetables").delete().eq("id", id);
  if (error) return saveError(error);
  done();
  return {};
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
}): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const title = input.title.trim();
  if (!title) return { message: "항목 이름을 적어 주세요." };
  if (input.weekdays.length === 0) return { message: "요일을 하나 이상 골라 주세요." };
  if (input.endTime <= input.startTime) {
    return { message: "끝나는 시간이 시작 시간보다 빨라요." };
  }

  const { error } = await auth.supabase.from("timetable_items").insert(
    input.weekdays.map((weekday) => ({
      timetable_id: input.timetableId,
      user_id: auth.userId,
      title,
      location: input.location.trim(),
      weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      color_key: input.colorKey,
    }))
  );

  if (error) return saveError(error);
  done();
  return {};
}

export async function removeTimetableItem(id: string): Promise<SaveResult> {
  const auth = await currentUser();
  if (!auth) return NOT_SIGNED_IN;

  const { error } = await auth.supabase
    .from("timetable_items")
    .delete()
    .eq("id", id);

  if (error) return saveError(error);
  done();
  return {};
}
