"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardCard from "@/components/DashboardCard";
import { softInputClass } from "@/components/ui";
import { saveMeal, type MealSlot } from "@/app/actions/meals";
import type { DailyLog } from "@/lib/database.types";
import { quiet } from "@/lib/save";
import type { CardChrome } from "@/lib/cards";

const SLOTS: {
  key: MealSlot;
  label: string;
  emoji: string;
  placeholder: string;
}[] = [
  { key: "breakfast", label: "아침", emoji: "🌅", placeholder: "오늘 아침은?" },
  { key: "lunch", label: "점심", emoji: "🍱", placeholder: "점심은 뭐 드셨나요?" },
  { key: "dinner", label: "저녁", emoji: "🌙", placeholder: "저녁은 뭐 드셨나요?" },
];

const MOODS = ["😋", "🙂", "😐", "🥲"];

type Meals = Record<MealSlot, { text: string; mood: string }>;

function toMeals(log: DailyLog | null): Meals {
  return {
    breakfast: { text: log?.breakfast ?? "", mood: log?.breakfast_mood ?? "" },
    lunch: { text: log?.lunch ?? "", mood: log?.lunch_mood ?? "" },
    dinner: { text: log?.dinner ?? "", mood: log?.dinner_mood ?? "" },
  };
}

export default function MealsCard({
  collapsed,
  onToggleCollapse,
  readOnly,
  date,
  dailyLog,
}: {
  date: string;
  dailyLog: DailyLog | null;
} & CardChrome) {
  const [meals, setMeals] = useState<Meals>(() => toMeals(dailyLog));
  const [, startTransition] = useTransition();

  useEffect(() => setMeals(toMeals(dailyLog)), [dailyLog]);

  const commitText = (slot: MealSlot, text: string) => {
    if (text.trim() === (dailyLog?.[slot] ?? "")) return;
    startTransition(quiet(() => saveMeal({ date, slot, text })));
  };

  const pickMood = (slot: MealSlot, mood: string) => {
    const next = meals[slot].mood === mood ? "" : mood;
    setMeals((prev) => ({ ...prev, [slot]: { ...prev[slot], mood: next } }));
    startTransition(quiet(() => saveMeal({ date, slot, mood: next })));
  };

  const filled = SLOTS.filter((s) => meals[s.key].text.trim()).length;

  return (
    <DashboardCard
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      title="오늘 뭐 먹었나요"
      emoji="🍚"
      tone="orange"
      badge={`${filled}/3 기록`}
    >
      <div className="flex flex-col gap-2.5">
        {SLOTS.map((slot) => {
          const meal = meals[slot.key];
          return (
            <div
              key={slot.key}
              className={`meal-row grid items-center gap-2.5 rounded-inner p-2 transition ${
                meal.text.trim() ? "bg-tone-soft" : ""
              }`}
            >
              <div className="flex items-center gap-1.5 whitespace-nowrap text-[15px]">
                <span aria-hidden="true" className="text-[17px]">
                  {slot.emoji}
                </span>
                {slot.label}
              </div>

              {readOnly ? (
                <p className="min-h-11 px-1 py-2.5 text-[15px]">
                  {meal.text || (
                    <span className="text-muted">기록이 없어요</span>
                  )}
                </p>
              ) : (
                <input
                  value={meal.text}
                  placeholder={slot.placeholder}
                  aria-label={`${slot.label} 기록`}
                  className={softInputClass}
                  onChange={(e) =>
                    setMeals((prev) => ({
                      ...prev,
                      [slot.key]: { ...prev[slot.key], text: e.target.value },
                    }))
                  }
                  onBlur={(e) => commitText(slot.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              )}

              <div className="flex gap-1 justify-self-end">
                {/* 친구 기록에서는 고른 기분만 보여줍니다. */}
                {(readOnly ? MOODS.filter((m) => m === meal.mood) : MOODS).map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    disabled={readOnly}
                    onClick={() => pickMood(slot.key, mood)}
                    aria-label={`${slot.label} 기분 ${mood}`}
                    aria-pressed={meal.mood === mood}
                    className={`grid size-11 place-items-center rounded-xl border-2 text-sm transition ${
                      meal.mood === mood
                        ? "border-tone bg-card"
                        : "border-transparent"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
