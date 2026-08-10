import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BackgroundDecor from "@/components/BackgroundDecor";
import DateNav from "@/components/DateNav";
import { CatMascot, Paw } from "@/components/Cat";
import ScheduleCard from "@/components/cards/ScheduleCard";
import MealsCard from "@/components/cards/MealsCard";
import TimelineCard from "@/components/cards/TimelineCard";
import GoalsCard from "@/components/cards/GoalsCard";
import NewsCard from "@/components/cards/NewsCard";
import { getSessionState } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { todayKey } from "@/lib/date";
import { signOut } from "./login/actions";

// 로그인 상태와 선택 날짜에 따라 내용이 달라지므로 정적으로 굳으면 안 됩니다.
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSessionState();

  if (session.status === "no-env") return <SetupNotice />;
  if (session.status === "signed-out") redirect("/login");

  if (session.status === "no-profile") {
    return (
      <Centered>
        <CatMascot size={88} mood="sleepy" />
        <h1 className="mt-3 text-xl">들어올 수 없는 계정이에요</h1>
        <p className="mt-2 text-sm text-muted">
          {session.email} 은(는) 이 대시보드에 등록되어 있지 않아요.
        </p>
        <form action={signOut} className="mt-5">
          <button className="min-h-11 rounded-full border-2 border-line bg-card-subtle px-5 text-sm">
            로그아웃
          </button>
        </form>
      </Centered>
    );
  }

  const { profile } = session;
  const { date: raw } = await searchParams;
  const date = raw && DATE_PATTERN.test(raw) ? raw : todayKey();

  const data = await getDashboardData(profile.id, date);

  return (
    <>
      <BackgroundDecor />

      <div className="relative z-[1] mx-auto max-w-[1180px] px-5 pb-16 pt-7">
        <AppHeader profile={profile} />
        <DateNav date={date} />

        <main className="grid items-start gap-stack wide:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-stack">
            <ScheduleCard
              date={date}
              items={data.schedule}
              events={data.events}
            />
            <MealsCard date={date} dailyLog={data.dailyLog} />
            <TimelineCard
              date={date}
              entries={data.timeline}
              tags={data.tags}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-stack">
            <GoalsCard goals={data.goals} date={date} />
            <NewsCard keywords={data.keywords} />
          </div>
        </main>

        <footer className="mt-9 flex items-center justify-center gap-2 font-hand text-lg font-bold text-muted">
          <Paw size={14} /> 오늘도 수고했어요
        </footer>
      </div>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-[1] mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="w-full rounded-card border-2 border-line bg-card px-7 py-9 shadow-card">
        <div className="flex flex-col items-center">{children}</div>
      </div>
    </main>
  );
}

function SetupNotice() {
  return (
    <Centered>
      <CatMascot size={88} mood="sleepy" />
      <h1 className="mt-3 text-xl">환경변수가 아직 없어요</h1>
      <p className="mt-3 text-left text-sm leading-relaxed text-muted">
        프로젝트 루트에 <code className="text-ink">.env.local</code> 을 만들고
        아래 값을 채워주세요.
      </p>
      <pre className="mt-3 w-full overflow-x-auto rounded-inner bg-card-subtle px-4 py-3 text-left text-xs text-ink">
        {`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
      </pre>
    </Centered>
  );
}
