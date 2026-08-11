/**
 * 카드들이 같이 쓰는 작은 조각들.
 * 프로토타입의 .input / .btn / .btn-x 를 Tailwind 로 옮긴 것입니다.
 */

export const inputClass =
  "min-h-11 min-w-0 flex-1 rounded-full border-2 border-line bg-card-subtle px-4 text-body outline-none transition placeholder:text-muted focus:border-tone focus:ring-4 focus:ring-tone-soft";

export const softInputClass = inputClass.replace("rounded-full", "rounded-inner");

/** 카드 안의 동그란 + 버튼 */
export function AddButton({ label = "추가" }: { label?: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-tone bg-tone text-title leading-none text-on-accent transition active:translate-y-px"
    >
      +
    </button>
  );
}

/** 헤더 우측의 옅은 텍스트 버튼 */
export function GhostButton({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="min-h-9 rounded-full border-2 border-line px-3 text-label text-muted transition hover:border-tone hover:text-ink"
    >
      {children}
    </button>
  );
}

/** 목록 항목의 × 삭제 버튼 */
export function DeleteButton({
  onClick,
  label = "삭제",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full text-heading leading-none text-muted opacity-0 transition hover:text-accent-strong focus-visible:opacity-100 group-hover:opacity-100 max-[900px]:opacity-60"
    >
      ×
    </button>
  );
}
