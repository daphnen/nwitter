import Link from "next/link";
import { redirect } from "next/navigation";
import BackgroundDecor from "@/components/BackgroundDecor";
import { CatMascot, Paw } from "@/components/Cat";
import { getMyPreferences, getSessionState } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionState();
  if (session.status !== "ok") redirect("/");

  const { profile } = session;
  const prefs = await getMyPreferences(profile.id);

  return (
    <>
      <BackgroundDecor />

      <div className="relative z-[1] mx-auto max-w-[640px] px-5 pb-16 pt-7">
        <header className="mb-stack flex items-center gap-4 rounded-card border-2 border-line bg-card p-card shadow-card">
          <CatMascot size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl">설정</h1>
            <p className="mt-0.5 truncate text-sm text-muted">{profile.email}</p>
          </div>
          <Link
            href="/"
            className="min-h-11 shrink-0 rounded-full border-2 border-line px-4 text-xs leading-[2.4rem] text-muted transition hover:text-ink"
          >
            ← 홈
          </Link>
        </header>

        <SettingsForm
          initialTheme={profile.theme}
          initialDarkMode={prefs.dark_mode}
          initialName={profile.display_name}
        />

        <form action={signOut} className="mt-stack flex justify-center">
          <button className="min-h-11 rounded-full border-2 border-line px-5 text-sm text-muted transition hover:text-ink">
            로그아웃
          </button>
        </form>

        <footer className="mt-9 flex items-center justify-center gap-2 font-hand text-lg font-bold text-muted">
          <Paw size={14} /> 오늘도 수고했어요
        </footer>
      </div>
    </>
  );
}
