import { redirect } from "next/navigation";
import { CatMascot, Paw } from "@/components/Cat";
import { getSessionState } from "@/lib/auth";
import { formatKo, greeting, todayKey } from "@/lib/date";
import { signOut } from "./login/actions";

// 로그인 상태에 따라 내용이 달라지므로 절대 정적으로 굳으면 안 됩니다.
export const dynamic = "force-dynamic";

export default async function HomePage() {
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
  const hello = greeting();
  const today = todayKey();

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-7">
      <header className="flex flex-wrap items-center gap-5 rounded-[34px] border-2 border-line bg-card px-6 py-5 shadow-card">
        <CatMascot size={96} />

        <div className="min-w-60 flex-1">
          <p className="font-hand text-xl font-bold text-muted">
            {hello.emoji} {hello.text}
          </p>
          <h1 className="text-3xl">우리의 대시보드</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.display_name}
            {profile.avatar_emoji} 님, 오늘도 차근차근 🐾
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border-2 border-tone-green bg-tone-green-soft px-3 py-1 text-xs">
            ☁️ 동기화됨
          </span>
          <form action={signOut}>
            <button className="min-h-11 rounded-full border-2 border-line px-4 text-xs text-muted transition hover:text-ink">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="mt-6 flex items-center justify-center">
        <div className="rounded-full border-2 border-line bg-card px-6 py-2 text-xl shadow-card-soft">
          <strong>{formatKo(today)}</strong>
        </div>
      </div>

      <section className="relative mt-8 rounded-card border-2 border-line bg-card px-6 py-8 text-center shadow-card">
        <p className="text-lg">여기에 카드들이 들어옵니다</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          1단계(셋업 + 인증)까지 끝났어요.
          <br />
          2단계에서 프로토타입 화면을 그대로 옮겨옵니다.
        </p>
      </section>

      <footer className="mt-9 flex items-center justify-center gap-2 font-hand text-lg font-bold text-muted">
        <Paw size={14} /> 오늘도 수고했어요
      </footer>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
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
