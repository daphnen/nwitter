"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardCard, { EmptyNote } from "@/components/DashboardCard";
import { AddButton, GhostButton, inputClass } from "@/components/ui";
import { addGoal, removeGoal, setGoalProgress } from "@/app/actions/goals";
import type { GoalPeriod } from "@/lib/database.types";
import { quiet } from "@/lib/save";
import type { CardChrome } from "@/lib/cards";
import type { GoalWithProgress } from "@/lib/queries";

const EMOJIS = ["🎯", "📚", "🏃", "💧", "🧘", "💻", "🎨", "🌱"];

/** 달성했을 때 튀어나오는 반짝임. 좌표는 고정이라 매번 같은 자리에서 반짝입니다. */
const SPARKLES = [
  { left: "6%", top: "10%", delay: "0s", size: "13px" },
  { left: "48%", top: "-6%", delay: "0.35s", size: "10px" },
  { left: "88%", top: "22%", delay: "0.7s", size: "12px" },
  { left: "72%", top: "72%", delay: "1s", size: "9px" },
];

export default function GoalsCard({
  collapsed,
  onToggleCollapse,
  readOnly,
  goals,
  date,
}: {
  goals: GoalWithProgress[];
  date: string;
} & CardChrome) {
  const [rows, setRows] = useState(goals);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [period, setPeriod] = useState<GoalPeriod>("daily");
  const [, startTransition] = useTransition();

  useEffect(() => setRows(goals), [goals]);

  const progressOf = (goal: GoalWithProgress) => goal.log?.progress ?? 0;

  const step = (goal: GoalWithProgress, delta: number) => {
    const next = Math.min(goal.target, Math.max(0, progressOf(goal) + delta));
    if (next === progressOf(goal)) return;

    setRows((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              log: {
                ...(g.log ?? {
                  id: `tmp-${g.id}`,
                  goal_id: g.id,
                  user_id: g.user_id,
                  period_start: g.periodStart,
                  completed_at: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }),
                progress: next,
              },
            }
          : g
      )
    );

    startTransition(quiet(() =>
      setGoalProgress({
        goalId: goal.id,
        periodStart: goal.periodStart,
        progress: next,
        target: goal.target,
      })
    ));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setTitle("");
    setTarget("1");
    setOpen(false);
    startTransition(quiet(() =>
      addGoal({
        title: trimmed,
        emoji,
        target: Number(target) || 1,
        period,
      })
    ));
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((g) => g.id !== id));
    startTransition(quiet(() => removeGoal(id)));
  };

  const achieved = rows.filter((g) => progressOf(g) >= g.target).length;

  return (
    <DashboardCard
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      /* 친구 기록을 볼 때 "나의 목표"는 어색해서 이 한 군데만 바꿉니다 */
      title={readOnly ? "목표" : "나의 목표"}
      emoji="🎯"
      tone="green"
      badge={rows.length ? `${achieved}/${rows.length} 달성` : undefined}
      headerAction={
        readOnly ? undefined : (
          <GhostButton onClick={() => setOpen((v) => !v)}>
            {open ? "닫기" : "+ 목표"}
          </GhostButton>
        )
      }
    >
      {open && !readOnly ? (
        <form onSubmit={submit} className="mb-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                aria-label={`아이콘 ${e}`}
                className={`grid size-11 place-items-center rounded-xl border-2 text-base transition ${
                  emoji === e ? "border-tone bg-tone-soft" : "border-line bg-card-subtle"
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="mb-2 flex gap-1.5">
            {(["daily", "weekly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`min-h-9 rounded-full border-2 px-3 text-[13px] transition ${
                  period === p ? "border-tone bg-tone-soft" : "border-line bg-card-subtle"
                }`}
              >
                {p === "daily" ? "매일" : "매주"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 물 8잔 마시기"
              aria-label="목표 이름"
              className={inputClass}
            />
            <input
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="목표 횟수"
              className={`${inputClass} max-w-[78px] flex-none text-center`}
            />
            <AddButton label="목표 추가" />
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <EmptyNote>작은 목표부터 하나 적어볼까요?</EmptyNote>
      ) : null}

      <ul className="flex flex-col gap-3">
        {rows.map((goal) => {
          const progress = progressOf(goal);
          const ratio = Math.min(1, progress / (goal.target || 1));
          const done = ratio >= 1;

          return (
            <li
              key={goal.id}
              className={`group relative rounded-inner border-2 bg-card-subtle px-3 py-2.5 transition ${
                done ? "border-tone" : "border-line"
              }`}
            >
              {done
                ? SPARKLES.map((s, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="sparkle"
                      style={{
                        left: s.left,
                        top: s.top,
                        fontSize: s.size,
                        animationDelay: s.delay,
                      }}
                    >
                      ✦
                    </span>
                  ))
                : null}

              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-[17px]">
                  {goal.emoji}
                </span>
                <span className="min-w-0 flex-1 break-words">{goal.title}</span>
                {goal.period === "weekly" ? (
                  <span className="shrink-0 rounded-full bg-tone-soft px-2 py-0.5 text-[11px] text-muted">
                    주간
                  </span>
                ) : null}
                <span className="shrink-0 text-[13px] text-muted">
                  {progress}/{goal.target}
                </span>
                {readOnly ? null : (
                <button
                  type="button"
                  onClick={() => remove(goal.id)}
                  aria-label={`${goal.title} 삭제`}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-lg leading-none text-muted opacity-0 transition hover:text-accent-strong focus-visible:opacity-100 group-hover:opacity-100 max-[900px]:opacity-60"
                >
                  ×
                </button>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="progress-fill h-full rounded-full"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                {readOnly ? null : (
                  <>
                <button
                  type="button"
                  onClick={() => step(goal, -1)}
                  aria-label="하나 줄이기"
                  className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-line bg-card text-lg leading-none transition active:translate-y-px"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => step(goal, 1)}
                  aria-label="하나 늘리기"
                  className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-tone bg-tone text-lg leading-none text-on-accent transition active:translate-y-px"
                >
                  +
                </button>
                  </>
                )}
              </div>

              {done ? (
                <span className="mt-1.5 inline-flex items-center gap-1.5 font-hand text-base font-bold text-accent-strong">
                  {/* 축하 연출은 테마가 고릅니다.
                      moonlight = 위쪽 반짝임 / aqua = 이 체크. CSS 가 하나만 보여줍니다. */}
                  <span
                    aria-hidden="true"
                    className="celebrate-check grid size-5 place-items-center rounded-full bg-tone text-on-accent"
                  >
                    ✓
                  </span>
                  달성! 잘했어요 🐾
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="sr-only">{date} 기준 진행도입니다.</p>
    </DashboardCard>
  );
}
