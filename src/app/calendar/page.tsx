import { redirect } from "next/navigation";
import PageShell, { PageHeader } from "@/components/PageShell";
import CalendarView from "@/components/calendar/CalendarView";
import LiveSync from "@/components/LiveSync";
import { getSessionState } from "@/lib/auth";
import { getMonthEvents, getPartner } from "@/lib/queries";
import { monthRange, todayKey, toMonthKey } from "@/lib/date";

export const dynamic = "force-dynamic";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const session = await getSessionState();
  if (session.status !== "ok") redirect("/");

  const sp = await searchParams;
  const today = todayKey();

  const date = sp.date && DATE_PATTERN.test(sp.date) ? sp.date : today;
  const month =
    sp.month && MONTH_PATTERN.test(sp.month) ? sp.month : toMonthKey(date);

  const { start, end } = monthRange(month);
  const [events, partner] = await Promise.all([
    getMonthEvents(start, end),
    getPartner(session.profile.id),
  ]);

  return (
    <PageShell width="narrow">
      <PageHeader
        title="캘린더"
        emoji="🗓"
        subtitle="여기 넣은 약속은 홈의 오늘의 일정에도 함께 떠요."
        // 약속은 둘이 같이 보는 것이라 누가 고치든 다 듣습니다.
        action={<LiveSync userId={null} tables={["events"]} />}
      />
      <CalendarView
        month={month}
        selectedDate={date}
        events={events}
        me={session.profile}
        partner={partner}
      />
    </PageShell>
  );
}
