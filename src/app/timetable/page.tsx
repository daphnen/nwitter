import { redirect } from "next/navigation";
import PageShell, { PageHeader } from "@/components/PageShell";
import TimetableView from "@/components/timetable/TimetableView";
import LiveSync from "@/components/LiveSync";
import { getSessionState } from "@/lib/auth";
import {
  getPartner,
  getTimetableItems,
  getTimetables,
} from "@/lib/queries";
import { todayKey } from "@/lib/date";
import { isActiveOn } from "@/lib/timetable";

export const dynamic = "force-dynamic";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ tt?: string }>;
}) {
  const session = await getSessionState();
  if (session.status !== "ok") redirect("/");

  const me = session.profile;
  const sp = await searchParams;
  const today = todayKey();

  const [timetables, partner] = await Promise.all([
    getTimetables(me.id),
    getPartner(me.id),
  ]);

  // 고른 게 있으면 그것, 없으면 오늘 유효한 것, 그것도 없으면 첫 번째.
  const selected =
    timetables.find((t) => t.id === sp.tt) ??
    timetables.find((t) => isActiveOn(t, today)) ??
    timetables[0] ??
    null;

  const [items, partnerItems] = await Promise.all([
    selected ? getTimetableItems([selected.id]) : Promise.resolve([]),
    // 상대방은 "지금 유효한" 시간표만 겹쳐 봅니다. 지난 학기까지 겹치면 어지러워요.
    partner
      ? getTimetables(partner.id)
          .then((list) => list.filter((t) => isActiveOn(t, today)))
          .then((list) => getTimetableItems(list.map((t) => t.id)))
      : Promise.resolve([]),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="시간표"
        emoji="📚"
        subtitle="매주 반복되는 고정 일정이에요. 오늘 요일 항목은 홈에도 떠요."
        // 상대방 시간표를 겹쳐 보고 있으므로 둘의 변경을 다 듣습니다.
        action={
          <LiveSync userId={null} tables={["timetables", "timetable_items"]} />
        }
      />
      <TimetableView
        timetables={timetables}
        selected={selected}
        items={items}
        partnerItems={partnerItems}
        partnerName={partner?.display_name ?? null}
      />
    </PageShell>
  );
}
