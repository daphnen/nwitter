"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addEvent, removeEvent, type EventOwner } from "@/app/actions/events";
import { AddButton, inputClass } from "@/components/ui";
import { EmptyNote } from "@/components/DashboardCard";
import {
  formatKo,
  formatMonthKo,
  monthGridDays,
  shiftMonth,
  todayKey,
  toMonthKey,
} from "@/lib/date";
import type { CalendarEvent, ColorKey, Profile } from "@/lib/database.types";
import { quiet } from "@/lib/save";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

type Ownership = "mine" | "partner" | "shared";

function ownershipOf(event: CalendarEvent, myId: string): Ownership {
  if (event.owner_id === null) return "shared";
  return event.owner_id === myId ? "mine" : "partner";
}

const OWNER_TONE: Record<Ownership, ColorKey> = {
  mine: "blue",
  partner: "purple",
  shared: "mint",
};

const OWNER_LABEL: Record<Ownership, string> = {
  mine: "내 일정",
  partner: "친구 일정",
  shared: "함께",
};

export default function CalendarView({
  month,
  selectedDate,
  events,
  me,
  partner,
}: {
  month: string;
  selectedDate: string;
  events: CalendarEvent[];
  me: Profile;
  partner: Profile | null;
}) {
  const [rows, setRows] = useState(events);
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [owner, setOwner] = useState<EventOwner>("mine");
  const [, startTransition] = useTransition();

  useEffect(() => setRows(events), [events]);

  const days = monthGridDays(month);
  const today = todayKey();

  const eventsOn = (day: string) =>
    rows.filter((e) =>
      e.end_date
        ? day >= e.start_date && day <= e.end_date
        : day === e.start_date
    );

  const selectedEvents = eventsOn(selectedDate);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setRows((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        owner_id: owner === "shared" ? null : me.id,
        created_by: me.id,
        title: trimmed,
        description: "",
        start_date: selectedDate,
        end_date: null,
        start_time: allDay ? null : `${startTime}:00`,
        end_time: null,
        all_day: allDay,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setTitle("");

    startTransition(quiet(() =>
      addEvent({
        title: trimmed,
        startDate: selectedDate,
        endDate: null,
        allDay,
        startTime: allDay ? null : `${startTime}:00`,
        owner,
      })
    ));
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(quiet(() => removeEvent(id)));
  };

  return (
    <div className="flex flex-col gap-stack">
      {/* 월 이동 -------------------------------------------------------- */}
      <nav className="flex items-center justify-center gap-2.5">
        <Link
          href={`/calendar?month=${shiftMonth(month, -1)}`}
          aria-label="이전 달"
          className="grid size-11 place-items-center rounded-full border-2 border-line bg-card text-xl shadow-card-soft"
        >
          ‹
        </Link>
        <div className="rounded-full border-2 border-line bg-card px-5 py-2 text-xl shadow-card-soft">
          <strong>{formatMonthKo(month)}</strong>
        </div>
        <Link
          href={`/calendar?month=${shiftMonth(month, 1)}`}
          aria-label="다음 달"
          className="grid size-11 place-items-center rounded-full border-2 border-line bg-card text-xl shadow-card-soft"
        >
          ›
        </Link>
      </nav>

      {/* 월간 격자 ------------------------------------------------------ */}
      <section
        data-tone="blue"
        className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card"
      >
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`pb-1 text-center text-xs ${
                i >= 5 ? "text-accent-strong" : "text-muted"
              }`}
            >
              {w}
            </div>
          ))}

          {days.map((day) => {
            const inMonth = toMonthKey(day) === month;
            const dayEvents = eventsOn(day);
            const isSelected = day === selectedDate;

            return (
              <Link
                key={day}
                href={`/calendar?month=${month}&date=${day}`}
                aria-current={isSelected ? "date" : undefined}
                className={`flex min-h-16 flex-col gap-0.5 rounded-inner border-2 p-1 transition ${
                  isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-transparent hover:bg-tone-soft"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`text-center text-xs ${
                    day === today ? "font-bold text-accent-strong" : ""
                  }`}
                >
                  {Number(day.slice(8))}
                </span>

                <span className="flex flex-wrap justify-center gap-0.5">
                  {dayEvents.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      data-tone={OWNER_TONE[ownershipOf(e, me.id)]}
                      className="size-1.5 rounded-full bg-tone"
                    />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>

        {/* 색 범례 */}
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-muted">
          {(["mine", "partner", "shared"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                data-tone={OWNER_TONE[k]}
                className="size-2.5 rounded-full bg-tone"
              />
              {k === "partner" && partner ? partner.display_name : OWNER_LABEL[k]}
            </span>
          ))}
        </div>
      </section>

      {/* 선택한 날 ------------------------------------------------------ */}
      <section
        data-tone="mint"
        className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card"
      >
        <h2 className="mb-3.5 flex items-center gap-2 text-xl">
          <span aria-hidden="true">📌</span>
          {formatKo(selectedDate)}
        </h2>

        <form onSubmit={submit} className="mb-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["mine", "내 일정"],
                ["shared", "함께"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOwner(value)}
                aria-pressed={owner === value}
                data-tone={value === "shared" ? "mint" : "blue"}
                className={`min-h-9 rounded-full border-2 px-3 text-[13px] transition ${
                  owner === value
                    ? "border-tone bg-tone-soft"
                    : "border-line bg-card-subtle"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              aria-pressed={allDay}
              className={`min-h-9 rounded-full border-2 px-3 text-[13px] transition ${
                allDay ? "border-tone bg-tone-soft" : "border-line bg-card-subtle"
              }`}
            >
              종일
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!allDay ? (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="시작 시각"
                className={`${inputClass} max-w-[108px] flex-none`}
              />
            ) : null}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="무슨 약속인가요?"
              aria-label="일정 제목"
              className={inputClass}
            />
            <AddButton label="일정 추가" />
          </div>
        </form>

        {selectedEvents.length === 0 ? (
          <EmptyNote>이 날은 아직 약속이 없어요.</EmptyNote>
        ) : null}

        <ul className="flex flex-col gap-1.5">
          {selectedEvents.map((event) => {
            const own = ownershipOf(event, me.id);
            // 친구 개인 일정은 읽기 전용입니다. 공동 일정은 둘 다 고칠 수 있어요.
            const editable = own !== "partner";

            return (
              <li
                key={event.id}
                data-tone={OWNER_TONE[own]}
                className="group flex items-center gap-2.5 rounded-inner bg-tone-soft px-3 py-row"
              >
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-tone" />
                <span className="shrink-0 text-[13px] text-muted">
                  {event.all_day || !event.start_time
                    ? "종일"
                    : event.start_time.slice(0, 5)}
                </span>
                <span className="min-w-0 flex-1 break-words">{event.title}</span>
                <span className="shrink-0 text-[11px] text-muted">
                  {own === "partner" && partner
                    ? partner.display_name
                    : OWNER_LABEL[own]}
                </span>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => remove(event.id)}
                    aria-label={`${event.title} 삭제`}
                    className="grid size-11 shrink-0 place-items-center rounded-full text-lg leading-none text-muted opacity-0 transition hover:text-accent-strong focus-visible:opacity-100 group-hover:opacity-100 max-[900px]:opacity-60"
                  >
                    ×
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
