"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Profile, ThemeName } from "@/lib/database.types";

/**
 * "내 기록 / 친구 기록" 토글.
 *
 * 화면 테마는 로그인 계정이 아니라 **지금 보고 있는 사람**을 따라갑니다.
 * 서버 응답을 기다리면 색이 늦게 바뀌어 어색하므로, 누르는 즉시
 * <html data-theme> 을 바꿔 0.3초 전환을 시작하고 그 다음 이동합니다.
 * (ThemeBackdrop 이 이 변화를 지켜보다 배경을 교차 페이드합니다.)
 */
export default function ViewToggle({
  me,
  partner,
  viewing,
  date,
}: {
  me: Profile;
  partner: Profile | null;
  viewing: "me" | "partner";
  date: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (!partner) return null;

  const options = [
    { key: "me" as const, profile: me, label: "내 기록" },
    { key: "partner" as const, profile: partner, label: `${partner.display_name} 기록` },
  ];

  const go = (key: "me" | "partner", theme: ThemeName) => {
    if (key === viewing) return;
    document.documentElement.dataset.theme = theme;

    const query = new URLSearchParams({ date });
    if (key === "partner") query.set("who", "partner");
    startTransition(() => router.push(`/?${query.toString()}`));
  };

  return (
    <div className="flex justify-center">
      <div
        role="group"
        aria-label="누구의 기록을 볼지"
        className="flex items-center gap-1 rounded-full border-2 border-line bg-card p-1 shadow-card-soft"
      >
        {options.map(({ key, profile, label }) => {
          const active = key === viewing;
          return (
            <button
              key={key}
              type="button"
              onClick={() => go(key, profile.theme)}
              aria-pressed={active}
              className={`flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-label transition ${
                active ? "bg-accent-soft text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden="true">{profile.avatar_emoji}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
