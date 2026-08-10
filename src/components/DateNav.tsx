import Link from "next/link";
import { formatKo, isToday, shiftKey, todayKey } from "@/lib/date";

/**
 * 상단 날짜 선택기. 링크로 ?date= 를 바꾸므로 주소를 그대로 공유할 수 있고,
 * 서버가 해당 날짜의 데이터를 다시 내려줍니다.
 */
export default function DateNav({ date }: { date: string }) {
  const arrow =
    "grid size-11 place-items-center rounded-full border-2 border-line bg-card text-xl shadow-card-soft transition active:translate-y-px";

  return (
    <nav className="my-5 flex items-center justify-center gap-2.5">
      <Link href={`/?date=${shiftKey(date, -1)}`} aria-label="이전 날" className={arrow}>
        ‹
      </Link>

      <div className="flex items-center gap-2 rounded-full border-2 border-line bg-card px-5 py-2 text-xl shadow-card-soft">
        <strong>{formatKo(date)}</strong>
        {isToday(date) ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs">
            오늘
          </span>
        ) : null}
      </div>

      <Link href={`/?date=${shiftKey(date, 1)}`} aria-label="다음 날" className={arrow}>
        ›
      </Link>

      {!isToday(date) ? (
        <Link
          href="/"
          className="min-h-11 rounded-full border-2 border-line px-4 text-xs leading-[2.4rem] text-muted transition hover:text-ink"
        >
          오늘로
        </Link>
      ) : null}
    </nav>
  );
}
