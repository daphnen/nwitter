"use client";

import type { Timetable, TimetableItem } from "@/lib/database.types";
import {
  SLOT_MINUTES,
  WEEKDAY_LABELS,
  freeSlots,
  gridRange,
  hhmm,
  layoutDay,
  toMinutes,
  toTimeLabel,
  weekdaysOf,
} from "@/lib/timetable";

const HOUR_HEIGHT = 56; // px

export default function TimetableGrid({
  timetable,
  items,
  partnerItems,
  partnerName,
  showPartner,
  onRemove,
}: {
  timetable: Timetable;
  items: TimetableItem[];
  partnerItems: TimetableItem[];
  partnerName: string;
  showPartner: boolean;
  /** 읽기 전용으로 쓰고 싶으면 넘기지 않으면 됩니다. */
  onRemove?: (id: string) => void;
}) {
  const weekdays = weekdaysOf(timetable);
  const visiblePartner = showPartner ? partnerItems : [];
  const range = gridRange([...items, ...visiblePartner]);
  const totalMinutes = range.to - range.from;
  const pxPerMinute = HOUR_HEIGHT / 60;
  const bodyHeight = totalMinutes * pxPerMinute;

  const free = showPartner
    ? freeSlots(items, partnerItems, weekdays, range)
    : new Set<string>();

  const hourMarks: number[] = [];
  for (let t = range.from; t <= range.to; t += 60) hourMarks.push(t);

  const top = (time: string) => (toMinutes(time) - range.from) * pxPerMinute;
  const height = (item: TimetableItem) =>
    (toMinutes(item.end_time) - toMinutes(item.start_time)) * pxPerMinute;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px] pb-4">
        {/* 요일 머리 */}
        <div
          className="grid gap-1 pl-11"
          style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0,1fr))` }}
        >
          {weekdays.map((w) => (
            <div key={w} className="pb-1.5 text-center text-label">
              {WEEKDAY_LABELS[w - 1]}
            </div>
          ))}
        </div>

        <div className="relative flex gap-1">
          {/* 시각 눈금 */}
          <div className="relative w-10 shrink-0" style={{ height: bodyHeight }}>
            {hourMarks.map((t) => (
              <span
                key={t}
                className="absolute right-1 -translate-y-1/2 text-badge text-muted"
                style={{ top: (t - range.from) * pxPerMinute }}
              >
                {toTimeLabel(t)}
              </span>
            ))}
          </div>

          {/* 요일 칸 */}
          <div
            className="grid flex-1 gap-1"
            style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0,1fr))` }}
          >
            {weekdays.map((weekday) => {
              const dayItems = items.filter((i) => i.weekday === weekday);
              const dayPartner = visiblePartner.filter(
                (i) => i.weekday === weekday
              );

              return (
                <div
                  key={weekday}
                  className="relative rounded-inner border-2 border-line bg-card-subtle"
                  style={{ height: bodyHeight }}
                >
                  {/* 시간 줄 */}
                  {hourMarks.slice(1, -1).map((t) => (
                    <span
                      key={t}
                      aria-hidden="true"
                      className="absolute inset-x-0 border-t border-line/70"
                      style={{ top: (t - range.from) * pxPerMinute }}
                    />
                  ))}

                  {/* 둘 다 비는 시간 */}
                  {showPartner
                    ? Array.from(free)
                        .filter((k) => k.startsWith(`${weekday}-`))
                        .map((k) => {
                          const slot = Number(k.split("-")[1]);
                          return (
                            <span
                              key={k}
                              aria-hidden="true"
                              data-tone="mint"
                              className="absolute inset-x-0 bg-tone-soft opacity-55"
                              style={{
                                top: (slot - range.from) * pxPerMinute,
                                height: SLOT_MINUTES * pxPerMinute,
                              }}
                            />
                          );
                        })
                    : null}

                  {/* 상대방 항목 — 테두리만 있는 얇은 카드로 겹쳐 놓습니다 */}
                  {layoutDay(dayPartner).map(({ item, column, columns }) => (
                    <div
                      key={item.id}
                      data-tone={item.color_key}
                      title={`${partnerName} · ${item.title} (${hhmm(
                        item.start_time
                      )}~${hhmm(item.end_time)})`}
                      className="absolute overflow-hidden rounded-md border-2 border-dashed border-tone bg-card/60 px-1 py-0.5 text-badge leading-tight text-muted"
                      style={{
                        top: top(item.start_time),
                        height: height(item),
                        left: `${(column / columns) * 100}%`,
                        width: `${(1 / columns) * 100}%`,
                      }}
                    >
                      {item.title}
                    </div>
                  ))}

                  {/* 내 항목 */}
                  {layoutDay(dayItems).map(({ item, column, columns }) => (
                    <div
                      key={item.id}
                      data-tone={item.color_key}
                      className="group absolute overflow-hidden rounded-md bg-tone px-1.5 py-1 text-badge leading-tight text-on-accent"
                      style={{
                        top: top(item.start_time),
                        height: height(item),
                        left: `${(column / columns) * 100}%`,
                        width: `${(1 / columns) * 100}%`,
                      }}
                    >
                      <span className="block truncate">{item.title}</span>
                      {item.location ? (
                        <span className="block truncate opacity-80">
                          {item.location}
                        </span>
                      ) : null}
                      <span className="block truncate opacity-70">
                        {hhmm(item.start_time)}~{hhmm(item.end_time)}
                      </span>

                      {onRemove ? (
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          aria-label={`${item.title} 삭제`}
                          className="absolute right-0 top-0 grid size-5 place-items-center rounded-bl-md bg-card/80 text-badge leading-none text-ink opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 max-[900px]:opacity-70"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
