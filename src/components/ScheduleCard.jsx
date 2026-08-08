import React, { useState } from "react";
import Card from "./Card";
import { EmptyNote, Paw } from "./Cat";
import useCollection from "../hooks/useCollection";
import { TABLES } from "../lib/db";

export default function ScheduleCard({ dateKey }) {
  const { items, loading, error, add, patch, remove } = useCollection(
    TABLES.events,
    { where: { date: dateKey }, order: [["time", "asc"]] }
  );
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await add({ date: dateKey, time: time || "", title: trimmed, done: false });
    setTitle("");
    setTime("");
  };

  const doneCount = items.filter((i) => i.done).length;

  return (
    <Card
      title="오늘의 일정"
      emoji="🗓"
      accent="sky"
      right={
        items.length ? (
          <span className="pill">
            {doneCount}/{items.length} 완료
          </span>
        ) : null
      }
    >
      <form className="row-form" onSubmit={submit}>
        <input
          className="input input--time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="시간"
        />
        <input
          className="input"
          type="text"
          placeholder="무엇을 할까요?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="일정 내용"
        />
        <button className="btn btn--round" type="submit" aria-label="일정 추가">
          +
        </button>
      </form>

      {error ? <p className="error-note">일정을 불러오지 못했어요 🥲</p> : null}
      {loading ? <p className="loading-note">불러오는 중…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyNote>오늘은 일정이 없어요. 푹 쉬어도 좋아요!</EmptyNote>
      ) : null}

      <ul className="list">
        {items.map((item) => (
          <li key={item.id} className={`list__item ${item.done ? "is-done" : ""}`}>
            <button
              className="check"
              onClick={() => patch(item.id, { done: !item.done })}
              aria-label={item.done ? "완료 취소" : "완료 표시"}
            >
              {item.done ? <Paw size={13} /> : null}
            </button>
            {item.time ? <span className="list__time">{item.time}</span> : null}
            <span className="list__text">{item.title}</span>
            <button
              className="btn-x"
              onClick={() => remove(item.id)}
              aria-label="삭제"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
