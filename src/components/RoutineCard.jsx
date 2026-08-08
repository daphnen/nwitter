import React, { useState } from "react";
import Card from "./Card";
import { EmptyNote } from "./Cat";
import useCollection from "../hooks/useCollection";
import { TABLES } from "../lib/db";
import { nowTime } from "../lib/date";

const TAGS = [
  { emoji: "💼", label: "일" },
  { emoji: "📖", label: "공부" },
  { emoji: "🏃", label: "운동" },
  { emoji: "☕️", label: "휴식" },
  { emoji: "🧺", label: "집안일" },
  { emoji: "💬", label: "사람" },
];

export default function RoutineCard({ dateKey }) {
  const { items, loading, error, add, remove } = useCollection(TABLES.logs, {
    where: { date: dateKey },
    order: [["time", "asc"]],
  });
  const [text, setText] = useState("");
  const [time, setTime] = useState(nowTime());
  const [tag, setTag] = useState(TAGS[0].emoji);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    await add({ date: dateKey, time: time || nowTime(), text: trimmed, tag });
    setText("");
    setTime(nowTime());
  };

  return (
    <Card
      title="하루 일과 기록"
      emoji="🐾"
      accent="lilac"
      right={items.length ? <span className="pill">{items.length}개</span> : null}
    >
      <form className="routine-form" onSubmit={submit}>
        <div className="tag-picker">
          {TAGS.map((t) => (
            <button
              key={t.emoji}
              type="button"
              className={`tag-chip ${tag === t.emoji ? "is-on" : ""}`}
              onClick={() => setTag(t.emoji)}
            >
              <span aria-hidden="true">{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
        <div className="row-form">
          <input
            className="input input--time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="시간"
          />
          <input
            className="input"
            placeholder="방금 무엇을 했나요?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="일과 내용"
          />
          <button className="btn btn--round" type="submit" aria-label="기록 추가">
            +
          </button>
        </div>
      </form>

      {error ? <p className="error-note">기록을 불러오지 못했어요 🥲</p> : null}
      {loading ? <p className="loading-note">불러오는 중…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyNote>아직 기록이 없어요. 지금 한 일을 적어볼까요?</EmptyNote>
      ) : null}

      <ol className="timeline">
        {items.map((log) => (
          <li key={log.id} className="timeline__item">
            <span className="timeline__dot" aria-hidden="true">
              {log.tag || "🐾"}
            </span>
            <span className="timeline__time">{log.time}</span>
            <span className="timeline__text">{log.text}</span>
            <button
              className="btn-x"
              onClick={() => remove(log.id)}
              aria-label="삭제"
            >
              ×
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
