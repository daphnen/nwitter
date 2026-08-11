"use client";

import { useEffect, useState, useTransition } from "react";
import ScheduleCard from "@/components/cards/ScheduleCard";
import MealsCard from "@/components/cards/MealsCard";
import TimelineCard from "@/components/cards/TimelineCard";
import GoalsCard from "@/components/cards/GoalsCard";
import NewsCard from "@/components/cards/NewsCard";
import { updateCardLayout } from "@/app/actions/settings";
import type { CardKey } from "@/lib/database.types";
import { quiet } from "@/lib/save";
import type { DashboardData } from "@/lib/queries";

/**
 * 카드를 저장된 순서대로 두 열에 나눠 놓고, 접힘 상태를 관리합니다.
 * 홈에서는 드래그하지 않습니다 — 폰에서 스크롤과 충돌해서, 순서 바꾸기는
 * 설정 탭에만 있습니다.
 */
export default function DashboardGrid({
  date,
  data,
  cardOrder,
  hiddenCards,
  collapsedCards,
  readOnly = false,
}: {
  date: string;
  data: DashboardData;
  cardOrder: CardKey[];
  hiddenCards: CardKey[];
  collapsedCards: CardKey[];
  /** 친구 기록을 볼 때 — 카드 안의 입력·추가·삭제를 모두 감춥니다. */
  readOnly?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<CardKey[]>(collapsedCards);
  const [, startTransition] = useTransition();

  useEffect(() => setCollapsed(collapsedCards), [collapsedCards]);

  const toggle = (key: CardKey) => {
    const next = collapsed.includes(key)
      ? collapsed.filter((k) => k !== key)
      : [...collapsed, key];

    setCollapsed(next); // 먼저 접고
    startTransition(quiet(() => updateCardLayout({ collapsedCards: next }))); // 그 다음 저장
  };

  const visible = cardOrder.filter((key) => !hiddenCards.includes(key));

  const render = (key: CardKey) => {
    const chrome = {
      collapsed: collapsed.includes(key),
      onToggleCollapse: () => toggle(key),
      readOnly,
    };

    switch (key) {
      case "schedule":
        return (
          <ScheduleCard
            key={key}
            {...chrome}
            date={date}
            items={data.schedule}
            events={data.events}
            timetableItems={data.timetableItems}
          />
        );
      case "meals":
        return (
          <MealsCard key={key} {...chrome} date={date} dailyLog={data.dailyLog} />
        );
      case "timeline":
        return (
          <TimelineCard
            key={key}
            {...chrome}
            date={date}
            entries={data.timeline}
            tags={data.tags}
          />
        );
      case "goals":
        return <GoalsCard key={key} {...chrome} goals={data.goals} date={date} />;
      case "news":
        return <NewsCard key={key} {...chrome} keywords={data.keywords} />;
    }
  };

  // 넓은 화면에서는 두 열로 나눕니다. 순서를 유지한 채 번갈아 담아야
  // 설정에서 바꾼 순서가 화면에서도 그대로 읽힙니다.
  const left = visible.filter((_, i) => i % 2 === 0);
  const right = visible.filter((_, i) => i % 2 === 1);

  if (visible.length === 0) {
    return (
      <p className="rounded-card border-2 border-line bg-card p-card text-center text-label text-muted shadow-card">
        보이는 카드가 없어요. 설정 → 카드 순서에서 다시 켤 수 있어요.
      </p>
    );
  }

  return (
    <main className="grid items-start gap-stack wide:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-stack">{left.map(render)}</div>
      <div className="flex min-w-0 flex-col gap-stack">{right.map(render)}</div>
    </main>
  );
}
