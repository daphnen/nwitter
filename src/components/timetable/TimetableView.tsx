"use client";

import Link from "next/link";
import { quiet } from "@/lib/save";
import { useEffect, useState, useTransition } from "react";
import TimetableGrid from "./TimetableGrid";
import { EmptyNote } from "@/components/DashboardCard";
import { AddButton, GhostButton, inputClass } from "@/components/ui";
import {
  addTimetable,
  addTimetableItem,
  removeTimetable,
  removeTimetableItem,
} from "@/app/actions/timetable";
import {
  STATUS_LABEL,
  WEEKDAY_LABELS,
  periodLabel,
  statusOn,
  weekdaysOf,
} from "@/lib/timetable";
import { todayKey } from "@/lib/date";
import type {
  ColorKey,
  Timetable,
  TimetableDays,
  TimetableItem,
} from "@/lib/database.types";

const COLORS: ColorKey[] = [
  "blue",
  "purple",
  "mint",
  "orange",
  "yellow",
  "pink",
  "green",
  "gray",
];

export default function TimetableView({
  timetables,
  selected,
  items,
  partnerItems,
  partnerName,
}: {
  timetables: Timetable[];
  selected: Timetable | null;
  items: TimetableItem[];
  partnerItems: TimetableItem[];
  partnerName: string | null;
}) {
  const [rows, setRows] = useState(items);
  const [showPartner, setShowPartner] = useState(false);
  const [openItem, setOpenItem] = useState(false);
  const [openTable, setOpenTable] = useState(false);
  const [, startTransition] = useTransition();

  // 새 항목 입력
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [color, setColor] = useState<ColorKey>("blue");

  // 새 시간표 입력
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState<TimetableDays>("mon_fri");

  useEffect(() => setRows(items), [items]);

  const submitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const trimmed = title.trim();
    if (!trimmed || weekdays.length === 0 || endTime <= startTime) return;

    setRows((prev) => [
      ...prev,
      ...weekdays.map((weekday) => ({
        id: `tmp-${weekday}-${Date.now()}`,
        timetable_id: selected.id,
        user_id: selected.user_id,
        title: trimmed,
        location: location.trim(),
        weekday,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        color_key: color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    ]);
    setTitle("");
    setLocation("");
    setOpenItem(false);

    startTransition(quiet(() =>
      addTimetableItem({
        timetableId: selected.id,
        title: trimmed,
        location,
        weekdays,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        colorKey: color,
      })
    ));
  };

  const submitTable = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    setFrom("");
    setTo("");
    setOpenTable(false);
    startTransition(quiet(() =>
      addTimetable({
        name: trimmed,
        startDate: from || null,
        endDate: to || null,
        days,
      })
    ));
  };

  const removeItem = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(quiet(() => removeTimetableItem(id)));
  };

  const toggleWeekday = (w: number) =>
    setWeekdays((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w].sort()
    );

  const today = todayKey();

  return (
    <div className="flex flex-col gap-stack">
      {/* 시간표 고르기 --------------------------------------------------- */}
      <section
        data-tone="purple"
        className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card"
      >
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl">
            <span aria-hidden="true">📚</span> 시간표 목록
          </h2>
          <GhostButton onClick={() => setOpenTable((v) => !v)}>
            {openTable ? "닫기" : "+ 새 시간표"}
          </GhostButton>
        </header>

        {openTable ? (
          <form onSubmit={submitTable} className="mb-3 flex flex-col gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2026 2학기, 운동 루틴"
              aria-label="시간표 이름"
              className={inputClass}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted">기간</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="시작일"
                className={`${inputClass} max-w-[160px] flex-none`}
              />
              <span className="text-muted">~</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="종료일"
                className={`${inputClass} max-w-[160px] flex-none`}
              />
            </div>
            <div className="flex items-center gap-2">
              {(
                [
                  ["mon_fri", "월~금"],
                  ["mon_sun", "월~일"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  aria-pressed={days === value}
                  className={`min-h-9 rounded-full border-2 px-3 text-[13px] transition ${
                    days === value
                      ? "border-tone bg-tone-soft"
                      : "border-line bg-card-subtle"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="flex-1" />
              <AddButton label="시간표 추가" />
            </div>
            <p className="text-xs text-muted">
              기간을 비워두면 계속 유효해요. 기간이 지나면 홈과 기본 선택에서 자동으로 빠집니다.
            </p>
          </form>
        ) : null}

        {timetables.length === 0 ? (
          <EmptyNote>시간표를 하나 만들어 볼까요?</EmptyNote>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {timetables.map((t) => {
              const status = STATUS_LABEL[statusOn(t, today)];
              const current = selected?.id === t.id;
              return (
                <span
                  key={t.id}
                  className={`flex items-center overflow-hidden rounded-full border-2 transition ${
                    current ? "border-tone bg-tone-soft" : "border-line bg-card-subtle"
                  }`}
                >
                  <Link
                    href={`/timetable?tt=${t.id}`}
                    className="py-1.5 pl-3 pr-1 text-[13px]"
                  >
                    {t.name}
                    {status ? (
                      <span className="ml-1 text-[11px] text-muted">({status})</span>
                    ) : null}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`"${t.name}" 시간표를 지울까요? 안의 항목도 함께 사라져요.`))
                        startTransition(quiet(() => removeTimetable(t.id)));
                    }}
                    aria-label={`${t.name} 삭제`}
                    className="grid h-11 w-8 place-items-center text-base leading-none text-muted transition hover:text-accent-strong"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {selected ? (
          <p className="mt-2 text-xs text-muted">
            {periodLabel(selected)} ·{" "}
            {selected.days === "mon_sun" ? "월~일" : "월~금"}
          </p>
        ) : null}
      </section>

      {/* 격자 ------------------------------------------------------------ */}
      {selected ? (
        <section
          data-tone="blue"
          className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card"
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl">{selected.name}</h2>
            <div className="flex items-center gap-2">
              {partnerName ? (
                <button
                  type="button"
                  onClick={() => setShowPartner((v) => !v)}
                  aria-pressed={showPartner}
                  className={`min-h-9 rounded-full border-2 px-3 text-xs transition ${
                    showPartner
                      ? "border-tone bg-tone-soft text-ink"
                      : "border-line text-muted"
                  }`}
                >
                  {showPartner ? "겹쳐 보는 중" : `${partnerName} 겹쳐 보기`}
                </button>
              ) : null}
              <GhostButton onClick={() => setOpenItem((v) => !v)}>
                {openItem ? "닫기" : "+ 항목"}
              </GhostButton>
            </div>
          </header>

          {openItem ? (
            <form onSubmit={submitItem} className="mb-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {weekdaysOf(selected).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWeekday(w)}
                    aria-pressed={weekdays.includes(w)}
                    className={`grid size-11 place-items-center rounded-full border-2 text-[13px] transition ${
                      weekdays.includes(w)
                        ? "border-tone bg-tone-soft"
                        : "border-line bg-card-subtle"
                    }`}
                  >
                    {WEEKDAY_LABELS[w - 1]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-tone={c}
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                    aria-label={`색 ${c}`}
                    className={`size-11 rounded-full border-2 bg-tone transition ${
                      color === c ? "border-ink" : "border-transparent"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-label="시작 시각"
                  className={`${inputClass} max-w-[108px] flex-none`}
                />
                <span className="text-muted">~</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  aria-label="종료 시각"
                  className={`${inputClass} max-w-[108px] flex-none`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목 (예: 자료구조)"
                  aria-label="제목"
                  className={inputClass}
                />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="장소"
                  aria-label="장소"
                  className={`${inputClass} max-w-[130px]`}
                />
                <AddButton label="항목 추가" />
              </div>
            </form>
          ) : null}

          {showPartner ? (
            <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-tone" /> 내 일정
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border-2 border-dashed border-muted" />{" "}
                {partnerName}
              </span>
              <span className="flex items-center gap-1.5">
                <span data-tone="mint" className="size-2.5 rounded-sm bg-tone-soft" />{" "}
                둘 다 비는 시간
              </span>
            </p>
          ) : null}

          <TimetableGrid
            timetable={selected}
            items={rows}
            partnerItems={partnerItems}
            partnerName={partnerName ?? "친구"}
            showPartner={showPartner}
            onRemove={removeItem}
          />

          {rows.length === 0 ? (
            <EmptyNote>아직 칸이 비어 있어요. + 항목으로 채워보세요.</EmptyNote>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
