import React, { useState } from "react";
import Card from "./Card";
import { EmptyNote } from "./Cat";
import useCollection from "../hooks/useCollection";
import { TABLES } from "../lib/db";

const EMOJIS = ["🎯", "📚", "🏃", "💧", "🧘", "💻", "🎨", "🌱"];

export default function GoalsCard() {
  const { items, loading, error, add, patch, remove } = useCollection(
    TABLES.goals,
    { order: [["created_at", "asc"]] }
  );
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(1);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await add({
      title: trimmed,
      emoji,
      target: Math.max(1, Number(target) || 1),
      progress: 0,
    });
    setTitle("");
    setTarget(1);
    setOpen(false);
  };

  const step = (goal, delta) => {
    const next = Math.min(goal.target, Math.max(0, (goal.progress || 0) + delta));
    if (next !== goal.progress) patch(goal.id, { progress: next });
  };

  return (
    <Card
      title="나의 목표"
      emoji="🎯"
      accent="mint"
      right={
        <button className="btn btn--ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "+ 목표"}
        </button>
      }
    >
      {open ? (
        <form className="goal-form" onSubmit={submit}>
          <div className="emoji-picker">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`emoji-chip ${emoji === e ? "is-on" : ""}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="row-form">
            <input
              className="input"
              placeholder="예: 물 8잔 마시기"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="목표 이름"
            />
            <input
              className="input input--num"
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="목표 횟수"
            />
            <button className="btn btn--round" type="submit" aria-label="목표 추가">
              +
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="error-note">목표를 불러오지 못했어요 🥲</p> : null}
      {loading ? <p className="loading-note">불러오는 중…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyNote>작은 목표부터 하나 적어볼까요?</EmptyNote>
      ) : null}

      <ul className="goals">
        {items.map((goal) => {
          const progress = goal.progress || 0;
          const ratio = Math.min(1, progress / (goal.target || 1));
          const done = ratio >= 1;
          return (
            <li key={goal.id} className={`goal ${done ? "is-done" : ""}`}>
              <div className="goal__top">
                <span className="goal__emoji">{goal.emoji || "🎯"}</span>
                <span className="goal__title">{goal.title}</span>
                <span className="goal__count">
                  {progress}/{goal.target}
                </span>
                <button
                  className="btn-x"
                  onClick={() => remove(goal.id)}
                  aria-label="삭제"
                >
                  ×
                </button>
              </div>
              <div className="goal__bottom">
                <div className="bar">
                  <div className="bar__fill" style={{ width: `${ratio * 100}%` }} />
                </div>
                <button
                  className="btn btn--tiny"
                  onClick={() => step(goal, -1)}
                  aria-label="하나 줄이기"
                >
                  −
                </button>
                <button
                  className="btn btn--tiny btn--fill"
                  onClick={() => step(goal, 1)}
                  aria-label="하나 늘리기"
                >
                  +
                </button>
              </div>
              {done ? <span className="goal__cheer">달성! 잘했어요 🐾</span> : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
