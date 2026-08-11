"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateCardLayout } from "@/app/actions/settings";
import { CARD_META } from "@/lib/cards";
import { quiet } from "@/lib/save";
import type { CardKey } from "@/lib/database.types";

function SortableRow({
  cardKey,
  hidden,
  onToggleHidden,
}: {
  cardKey: CardKey;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const meta = CARD_META[cardKey];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cardKey });

  return (
    <li
      ref={setNodeRef}
      data-tone={meta.tone}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-inner border-2 bg-card-subtle p-2 ${
        isDragging ? "z-10 border-tone shadow-card" : "border-line"
      }`}
    >
      {/* 손잡이에서만 드래그가 시작되게 해서 스위치 조작과 섞이지 않게 합니다. */}
      <button
        type="button"
        aria-label={`${meta.title} 순서 바꾸기`}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-inner text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <span aria-hidden="true" className="text-heading">
        {meta.emoji}
      </span>
      <span className={`min-w-0 flex-1 truncate ${hidden ? "text-muted" : ""}`}>
        {meta.title}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={!hidden}
        aria-label={`${meta.title} ${hidden ? "보이기" : "숨기기"}`}
        onClick={onToggleHidden}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-2"
      >
        <span className="text-badge text-muted">{hidden ? "숨김" : "표시"}</span>
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            hidden ? "bg-tone-gray" : "bg-tone"
          }`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-card transition-all ${
              hidden ? "left-1" : "left-6"
            }`}
          />
        </span>
      </button>
    </li>
  );
}

export default function CardOrderEditor({
  initialOrder,
  initialHidden,
}: {
  initialOrder: CardKey[];
  initialHidden: CardKey[];
}) {
  const [order, setOrder] = useState(initialOrder);
  const [hidden, setHidden] = useState(initialHidden);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // 마우스: 살짝 움직여야 드래그로 인식 (탭이 드래그로 오인되지 않게)
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // 터치: 길게 눌러야 시작 — 그래야 손가락으로 스크롤할 수 있습니다
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = order.indexOf(active.id as CardKey);
    const to = order.indexOf(over.id as CardKey);
    const next = arrayMove(order, from, to);

    setOrder(next);
    startTransition(quiet(() => updateCardLayout({ cardOrder: next })));
  };

  const toggleHidden = (key: CardKey) => {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];

    setHidden(next);
    startTransition(quiet(() => updateCardLayout({ hiddenCards: next })));
  };

  return (
    <section
      data-tone="blue"
      className="cat-card rounded-card border-2 border-line bg-card p-card shadow-card"
    >
      <h2 className="mb-1 flex items-center gap-2 text-heading">
        <span aria-hidden="true">🔀</span> 카드 순서
      </h2>
      <p className="mb-3.5 text-label text-muted">
        손잡이(⠿)를 끌어 순서를 바꿔요. 폰에서는 잠깐 누르고 있으면 잡힙니다.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {order.map((key) => (
              <SortableRow
                key={key}
                cardKey={key}
                hidden={hidden.includes(key)}
                onToggleHidden={() => toggleHidden(key)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
