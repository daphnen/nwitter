/** 디자인 확인용. 설정 화면을 Supabase 없이 그려봅니다. 확인 후 지웁니다. */
import Link from "next/link";
import BackgroundDecor from "@/components/BackgroundDecor";
import { CatMascot, Paw } from "@/components/Cat";
import SettingsForm from "@/app/settings/SettingsForm";

export const dynamic = "force-dynamic";

export default async function PreviewSettings({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const theme = sp.theme === "aqua" ? "aqua" : "moonlight";
  const mode = sp.mode === "dark" ? "dark" : "light";

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.theme=${JSON.stringify(
            theme
          )};document.documentElement.dataset.mode=${JSON.stringify(mode)};`,
        }}
      />
      <BackgroundDecor />

      <div className="relative z-[1] mx-auto max-w-[640px] px-5 pb-32 pt-7">
        <header className="mb-stack flex items-center gap-4 rounded-card border-2 border-line bg-card p-card shadow-card">
          <CatMascot size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl">설정</h1>
            <p className="mt-0.5 truncate text-sm text-muted">me@example.com</p>
          </div>
          <Link
            href="/design-preview"
            className="min-h-11 shrink-0 rounded-full border-2 border-line px-4 text-xs leading-[2.4rem] text-muted transition hover:text-ink"
          >
            ← 홈
          </Link>
        </header>

        <SettingsForm
          initialTheme={theme}
          initialDarkMode={mode === "dark"}
          initialName="다프네"
        />

        <footer className="mt-9 flex items-center justify-center gap-2 font-hand text-lg font-bold text-muted">
          <Paw size={14} /> 오늘도 수고했어요
        </footer>
      </div>
    </>
  );
}
