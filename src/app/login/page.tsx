import { CatMascot, Paw } from "@/components/Cat";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-10">
      <div className="w-full rounded-card border-2 border-line bg-card px-7 py-9 shadow-card">
        <div className="flex flex-col items-center text-center">
          <CatMascot size={96} />
          <h1 className="mt-3 text-2xl">우리의 대시보드</h1>
          <p className="mt-1 font-hand text-lg font-bold text-muted">
            둘만 들어올 수 있어요 🐾
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-inner bg-tone-orange-soft px-4 py-3 text-center text-sm"
          >
            {error}
          </p>
        ) : null}

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          비밀번호는 없어요. 메일로 온 링크를 누르면 로그인됩니다.
        </p>
      </div>

      <p className="mt-7 flex items-center gap-2 font-hand text-lg font-bold text-muted">
        <Paw size={14} /> 오늘도 수고했어요
      </p>
    </main>
  );
}
