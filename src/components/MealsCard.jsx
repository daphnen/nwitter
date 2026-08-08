import React, { useEffect, useState } from "react";
import Card from "./Card";
import useCollection from "../hooks/useCollection";
import { TABLES } from "../lib/db";

const SLOTS = [
  { key: "breakfast", label: "아침", emoji: "🌅", placeholder: "오늘 아침은?" },
  { key: "lunch", label: "점심", emoji: "🍱", placeholder: "점심은 뭐 드셨나요?" },
  { key: "dinner", label: "저녁", emoji: "🌙", placeholder: "저녁은 뭐 드셨나요?" },
];

const MOODS = ["😋", "🙂", "😐", "🥲"];

function MealSlot({ slot, row, onSave }) {
  const [text, setText] = useState(row?.text || "");

  useEffect(() => {
    setText(row?.text || "");
  }, [row?.text]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === (row?.text || "")) return;
    onSave(slot.key, { text: trimmed });
  };

  return (
    <div className={`meal ${row?.text ? "is-filled" : ""}`}>
      <div className="meal__label">
        <span className="meal__emoji">{slot.emoji}</span>
        {slot.label}
      </div>
      <input
        className="input input--soft"
        value={text}
        placeholder={slot.placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label={`${slot.label} 기록`}
      />
      <div className="meal__moods">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            className={`emoji-chip emoji-chip--sm ${row?.mood === m ? "is-on" : ""}`}
            onClick={() => onSave(slot.key, { mood: row?.mood === m ? "" : m })}
            aria-label={`기분 ${m}`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MealsCard({ dateKey }) {
  const { items, loading, error, add, patch } = useCollection(TABLES.meals, {
    where: { date: dateKey },
  });

  const bySlot = Object.fromEntries(items.map((r) => [r.slot, r]));

  const save = async (slotKey, changes) => {
    const existing = bySlot[slotKey];
    if (existing) {
      await patch(existing.id, changes);
    } else {
      await add({ date: dateKey, slot: slotKey, text: "", mood: "", ...changes });
    }
  };

  const filled = SLOTS.filter((s) => bySlot[s.key]?.text).length;

  return (
    <Card
      title="오늘 뭐 먹었나요"
      emoji="🍚"
      accent="peach"
      right={<span className="pill">{filled}/3 기록</span>}
    >
      {error ? <p className="error-note">식사 기록을 불러오지 못했어요 🥲</p> : null}
      {loading ? <p className="loading-note">불러오는 중…</p> : null}

      <div className="meals">
        {SLOTS.map((slot) => (
          <MealSlot
            key={slot.key}
            slot={slot}
            row={bySlot[slot.key]}
            onSave={save}
          />
        ))}
      </div>
    </Card>
  );
}
