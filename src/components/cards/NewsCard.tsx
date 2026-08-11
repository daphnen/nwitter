"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardCard, { EmptyNote } from "@/components/DashboardCard";
import { AddButton, GhostButton, inputClass } from "@/components/ui";
import { addKeyword, removeKeyword } from "@/app/actions/news";
import { timeAgo, type NewsItem } from "@/lib/news";
import type { NewsKeyword } from "@/lib/database.types";
import { quiet } from "@/lib/save";
import type { CardChrome } from "@/lib/cards";

type Feed =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; items: NewsItem[] }
  | { status: "error"; message: string; fallbackUrl?: string };

export default function NewsCard({
  keywords,
  collapsed,
  onToggleCollapse,
  readOnly,
}: { keywords: NewsKeyword[] } & CardChrome) {
  const [rows, setRows] = useState(keywords);
  const [activeId, setActiveId] = useState<string | null>(keywords[0]?.id ?? null);
  const [feed, setFeed] = useState<Feed>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => setRows(keywords), [keywords]);

  // 고른 키워드가 사라졌거나 아직 없으면 첫 번째로 되돌립니다.
  useEffect(() => {
    if (rows.length === 0) {
      setActiveId(null);
      return;
    }
    if (!rows.some((r) => r.id === activeId)) setActiveId(rows[0].id);
  }, [rows, activeId]);

  const active = rows.find((r) => r.id === activeId) ?? null;
  const activeKeyword = active?.keyword ?? null;
  const activeIsPending = active?.id.startsWith("tmp-") ?? false;

  useEffect(() => {
    // 임시 id 는 아직 서버에 없는 키워드입니다. 저장이 끝나면 다시 부릅니다.
    if (!activeKeyword || activeIsPending) {
      setFeed({ status: "idle" });
      return;
    }

    let alive = true;
    setFeed({ status: "loading" });

    fetch(`/api/news?q=${encodeURIComponent(activeKeyword)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!alive) return;

        if (!response.ok) {
          setFeed({
            status: "error",
            message: body.error ?? "기사를 가져오지 못했어요.",
            fallbackUrl: body.fallbackUrl,
          });
          return;
        }
        setFeed({ status: "ready", items: body.items ?? [] });
      })
      .catch(() => {
        if (alive) {
          setFeed({ status: "error", message: "기사를 가져오지 못했어요." });
        }
      });

    return () => {
      alive = false;
    };
  }, [activeKeyword, activeIsPending]);

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
    startTransition(quiet(() => addKeyword(trimmed)));
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(quiet(() => removeKeyword(id)));
  };

  return (
    <DashboardCard
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      title="관심 뉴스"
      emoji="📰"
      tone="yellow"
      badge={rows.length ? `${rows.length}개` : undefined}
      headerAction={
        readOnly ? undefined : (
          <GhostButton onClick={() => setOpen((v) => !v)}>
            {open ? "닫기" : "+ 키워드"}
          </GhostButton>
        )
      }
    >
      {open && !readOnly ? (
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
          {rows.map((row) => {
            const isActive = row.id === activeId;
            return (
              <span
                key={row.id}
                className={`flex items-center overflow-hidden rounded-full border-2 transition ${
                  isActive
                    ? "border-tone bg-tone-soft"
                    : "border-line bg-card-subtle"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(row.id)}
                  aria-pressed={isActive}
                  className="min-h-11 py-1 pl-3 pr-1 text-label"
                >
                  #{row.keyword}
                </button>
                {readOnly ? (
                  <span className="pr-3" />
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    aria-label={`${row.keyword} 키워드 삭제`}
                    className="grid h-11 w-8 place-items-center text-body leading-none text-muted transition hover:text-accent-strong"
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {feed.status === "loading" ? (
        <p className="px-1 py-2 text-label text-muted">기사를 물어오는 중… 🐈</p>
      ) : null}

      {feed.status === "error" ? (
        <div className="rounded-inner bg-tone-soft px-4 py-3 text-label">
          <p>{feed.message}</p>
          {feed.fallbackUrl ? (
            <a
              href={feed.fallbackUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-accent-strong underline"
            >
              구글 뉴스에서 바로 보기 →
            </a>
          ) : null}
        </div>
      ) : null}

      {feed.status === "ready" && feed.items.length === 0 ? (
        <EmptyNote>이 키워드로는 아직 기사가 없네요.</EmptyNote>
      ) : null}

      {feed.status === "ready" && feed.items.length > 0 ? (
        <ul className="flex flex-col">
          {feed.items.map((item, i) => (
            <li
              key={item.id}
              className={i > 0 ? "border-t-2 border-dashed border-line" : ""}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-inner px-2.5 py-2.5 transition hover:bg-tone-soft"
              >
                <span className="block break-words text-body leading-snug">
                  {item.title}
                </span>
                <span className="mt-1 flex gap-2 text-badge text-muted">
                  {item.source ? <span>{item.source}</span> : null}
                  {item.publishedAt ? (
                    <span>{timeAgo(item.publishedAt)}</span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </DashboardCard>
  );
}
