"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardCard, { EmptyNote } from "@/components/DashboardCard";
import { AddButton, GhostButton, inputClass } from "@/components/ui";
import { addKeyword, removeKeyword } from "@/app/actions/news";
import type { NewsKeyword } from "@/lib/database.types";

export default function NewsCard({ keywords }: { keywords: NewsKeyword[] }) {
  const [rows, setRows] = useState(keywords);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => setRows(keywords), [keywords]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (rows.some((r) => r.keyword === trimmed)) {
      setDraft("");
      return;
    }

    setRows((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        user_id: "",
        keyword: trimmed,
        sort_order: 0,
        created_at: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setOpen(false);
    startTransition(() => addKeyword(trimmed));
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => removeKeyword(id));
  };

  return (
    <DashboardCard
      title="관심 뉴스"
      emoji="📰"
      tone="yellow"
      badge={rows.length ? `${rows.length}개` : undefined}
      headerAction={
        <GhostButton onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "+ 키워드"}
        </GhostButton>
      }
    >
      {open ? (
        <form onSubmit={submit} className="mb-3 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="예: 고양이, 스타트업, 여행"
            aria-label="키워드"
            className={inputClass}
          />
          <AddButton label="키워드 추가" />
        </form>
      ) : null}

      {rows.length === 0 ? (
        <EmptyNote>관심 키워드를 추가하면 기사를 모아 드릴게요.</EmptyNote>
      ) : (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {rows.map((row) => (
            <span
              key={row.id}
              className="flex items-center overflow-hidden rounded-full border-2 border-line bg-card-subtle"
            >
              <span className="py-1 pl-3 pr-1 text-[13px]">#{row.keyword}</span>
              <button
                type="button"
                onClick={() => remove(row.id)}
                aria-label={`${row.keyword} 키워드 삭제`}
                className="grid h-11 w-8 place-items-center text-base leading-none text-muted transition hover:text-accent-strong"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {rows.length > 0 ? (
        <p className="rounded-inner bg-tone-soft px-4 py-3 text-center text-sm text-muted">
          기사 목록은 7단계에서 연결됩니다 🐈
        </p>
      ) : null}
    </DashboardCard>
  );
}
