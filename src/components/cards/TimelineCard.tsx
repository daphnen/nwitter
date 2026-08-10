"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardCard, { EmptyNote } from "@/components/DashboardCard";
import { AddButton, DeleteButton, inputClass } from "@/components/ui";
import {
  addTimelineEntry,
  removeTimelineEntry,
} from "@/app/actions/timeline";
import { nowTimeKST } from "@/lib/date";
import type { Tag, TimelineEntry } from "@/lib/database.types";

function hhmm(time: string) {
  return time.slice(0, 5);
}

export default function TimelineCard({
  date,
  entries,
  tags,
}: {
  date: string;
  entries: TimelineEntry[];
  tags: Tag[];
}) {
  const [rows, setRows] = useState(entries);
  const [content, setContent] = useState("");
  const [atTime, setAtTime] = useState(() => nowTimeKST());
  const [tagId, setTagId] = useState<string | null>(tags[0]?.id ?? null);
  const [, startTransition] = useTransition();

  useEffect(() => setRows(entries), [entries]);
  useEffect(() => {
    if (!tagId && tags[0]) setTagId(tags[0].id);
  }, [tags, tagId]);

  const tagOf = (id: string | null) => tags.find((t) => t.id === id) ?? null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const time = atTime || nowTimeKST();
    const optimistic: TimelineEntry = {
      id: `tmp-${Date.now()}`,
      user_id: "",
      date,
      at_time: time,
      content: trimmed,
      tag_id: tagId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRows((prev) =>
      [...prev, optimistic].sort((a, b) => a.at_time.localeCompare(b.at_time))
    );
    setContent("");
    setAtTime(nowTimeKST());

    startTransition(() =>
      addTimelineEntry({ date, atTime: time, content: trimmed, tagId })
    );
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => removeTimelineEntry(id));
  };

  return (
    <DashboardCard
      title="하루 일과 기록"
      emoji="🐾"
      tone="purple"
      badge={rows.length ? `${rows.length}개` : undefined}
    >
      <form onSubmit={submit} className="mb-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              data-tone={tag.color_key}
              onClick={() => setTagId(tag.id)}
              aria-pressed={tagId === tag.id}
              className={`min-h-9 rounded-full border-2 px-3 text-[13px] transition ${
                tagId === tag.id
                  ? "border-tone bg-tone-soft"
                  : "border-line bg-card-subtle"
              }`}
            >
              <span aria-hidden="true">{tag.emoji}</span> {tag.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="time"
            value={atTime}
            onChange={(e) => setAtTime(e.target.value)}
            aria-label="시간"
            className={`${inputClass} max-w-[108px] flex-none`}
          />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="방금 무엇을 했나요?"
            aria-label="일과 내용"
            className={inputClass}
          />
          <AddButton label="기록 추가" />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyNote>아직 기록이 없어요. 지금 한 일을 적어볼까요?</EmptyNote>
      ) : null}

      <ol className="relative pl-1.5">
        {rows.map((entry, i) => {
          const tag = tagOf(entry.tag_id);
          return (
            <li
              key={entry.id}
              data-tone={tag?.color_key ?? "gray"}
              className="group relative flex items-center gap-2.5 rounded-inner py-1.5 pl-1 pr-2 transition hover:bg-tone-soft"
            >
              {i < rows.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[20px] top-[34px] bottom-[-6px] w-0.5 rounded bg-line"
                />
              ) : null}

              <span
                aria-hidden="true"
                className="z-[1] grid size-8 shrink-0 place-items-center rounded-full border-2 border-line bg-card text-[15px]"
              >
                {tag?.emoji ?? "🐾"}
              </span>

              <span className="shrink-0 text-[13px] text-muted">
                {hhmm(entry.at_time)}
              </span>

              <span className="min-w-0 flex-1 break-words">{entry.content}</span>

              <DeleteButton onClick={() => remove(entry.id)} />
            </li>
          );
        })}
      </ol>
    </DashboardCard>
  );
}
