"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardCard, { EmptyNote } from "@/components/DashboardCard";
import { Paw } from "@/components/Cat";
import { AddButton, DeleteButton, inputClass } from "@/components/ui";
import {
  addScheduleItem,
  removeScheduleItem,
  toggleScheduleItem,
} from "@/app/actions/schedule";
import type { CalendarEvent, ScheduleItem } from "@/lib/database.types";

function hhmm(time: string | null) {
  return time ? time.slice(0, 5) : "";
}

export default function ScheduleCard({
  date,
  items,
  events,
}: {
  date: string;
  items: ScheduleItem[];
  events: CalendarEvent[];
}) {
  const [rows, setRows] = useState(items);
  const [title, setTitle] = useState("");
  const [atTime, setAtTime] = useState("");
  const [, startTransition] = useTransition();

  // 날짜를 옮기면 서버가 새 목록을 내려줍니다.
  useEffect(() => setRows(items), [items]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const optimistic: ScheduleItem = {
      id: `tmp-${Date.now()}`,
      user_id: "",
      date,
      at_time: atTime || null,
      title: trimmed,
      done: false,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRows((prev) => [...prev, optimistic]);
    setTitle("");
    setAtTime("");

    startTransition(() =>
      addScheduleItem({ date, title: trimmed, atTime: atTime || null })
    );
  };

  const toggle = (item: ScheduleItem) => {
    setRows((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, done: !r.done } : r))
    );
    startTransition(() => toggleScheduleItem(item.id, !item.done));
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => removeScheduleItem(id));
  };

  const doneCount = rows.filter((r) => r.done).length;
  const isEmpty = rows.length === 0 && events.length === 0;

  return (
    <DashboardCard
      title="오늘의 일정"
      emoji="🗓"
      tone="blue"
      badge={rows.length ? `${doneCount}/${rows.length} 완료` : undefined}
    >
      <form onSubmit={submit} className="mb-3 flex items-center gap-2">
        <input
          type="time"
          value={atTime}
          onChange={(e) => setAtTime(e.target.value)}
          aria-label="시간"
          className={`${inputClass} max-w-[108px] flex-none`}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="무엇을 할까요?"
          aria-label="일정 내용"
          className={inputClass}
        />
        <AddButton label="일정 추가" />
      </form>

      {isEmpty ? (
        <EmptyNote>오늘은 일정이 없어요. 푹 쉬어도 좋아요!</EmptyNote>
      ) : null}

      <ul>
        {rows.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2.5 rounded-inner px-2 py-1.5 transition hover:bg-tone-soft"
          >
            <button
              type="button"
              onClick={() => toggle(item)}
              aria-label={item.done ? "완료 취소" : "완료 표시"}
              aria-pressed={item.done}
              className={`paw-check grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                item.done
                  ? "border-tone bg-tone text-on-accent"
                  : "border-line bg-card-subtle text-transparent"
              }`}
            >
              <Paw size={13} />
            </button>

            {item.at_time ? (
              <span className="shrink-0 rounded-full bg-tone-soft px-2.5 py-0.5 text-[13px] text-muted">
                {hhmm(item.at_time)}
              </span>
            ) : null}

            <span
              className={`min-w-0 flex-1 break-words ${
                item.done ? "text-muted line-through" : ""
              }`}
            >
              {item.title}
            </span>

            <DeleteButton onClick={() => remove(item.id)} />
          </li>
        ))}

        {/* 캘린더에 등록한 약속. 할 일이 아니라 약속이라 체크는 없습니다. */}
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-center gap-2.5 rounded-inner px-2 py-1.5"
          >
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center text-sm"
              title="캘린더 일정"
            >
              📅
            </span>

            {!event.all_day && event.start_time ? (
              <span className="shrink-0 rounded-full bg-tone-soft px-2.5 py-0.5 text-[13px] text-muted">
                {hhmm(event.start_time)}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-tone-soft px-2.5 py-0.5 text-[13px] text-muted">
                종일
              </span>
            )}

            <span className="min-w-0 flex-1 break-words">{event.title}</span>

            {event.owner_id === null ? (
              <span className="shrink-0 rounded-full bg-tone-soft px-2 py-0.5 text-[11px] text-muted">
                함께
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
