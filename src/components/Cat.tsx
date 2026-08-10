/**
 * 고양이 마스코트와 발바닥 아이콘.
 * 색은 CSS 변수(--cat-fur / --cat-line / --cat-blush)를 따라가므로
 * 테마가 바뀌어도 같은 그림이 그대로 쓰입니다.
 */

type CatMood = "happy" | "sleepy";

export function CatMascot({
  size = 96,
  mood = "happy",
  className = "",
}: {
  size?: number;
  mood?: CatMood;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 0.92}
      viewBox="0 0 120 110"
      role="img"
      aria-label="흰 고양이"
    >
      {/* 귀 */}
      <path
        d="M22 44 L26 10 L54 30 Z"
        fill="var(--cat-fur)"
        stroke="var(--cat-line)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M98 44 L94 10 L66 30 Z"
        fill="var(--cat-fur)"
        stroke="var(--cat-line)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M30 38 L32 20 L46 31 Z" fill="var(--tone-pink-soft)" />
      <path d="M90 38 L88 20 L74 31 Z" fill="var(--tone-pink-soft)" />

      {/* 얼굴 */}
      <ellipse
        cx="60"
        cy="64"
        rx="43"
        ry="37"
        fill="var(--cat-fur)"
        stroke="var(--cat-line)"
        strokeWidth="3"
      />

      {/* 눈 */}
      {mood === "sleepy" ? (
        <>
          <path
            d="M40 62 q7 7 14 0"
            fill="none"
            stroke="var(--cat-line)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M66 62 q7 7 14 0"
            fill="none"
            stroke="var(--cat-line)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <ellipse cx="46" cy="60" rx="4.6" ry="5.6" fill="var(--cat-line)" />
          <ellipse cx="74" cy="60" rx="4.6" ry="5.6" fill="var(--cat-line)" />
          <circle cx="47.6" cy="58" r="1.7" fill="#fff" />
          <circle cx="75.6" cy="58" r="1.7" fill="#fff" />
        </>
      )}

      {/* 볼터치 */}
      <ellipse cx="34" cy="72" rx="7.5" ry="5" fill="var(--cat-blush)" opacity="0.55" />
      <ellipse cx="86" cy="72" rx="7.5" ry="5" fill="var(--cat-blush)" opacity="0.55" />

      {/* 코 & 입 */}
      <path d="M56.5 70 L63.5 70 L60 74 Z" fill="var(--cat-blush)" />
      <path
        d="M60 74 q-5 6 -9.5 1 M60 74 q5 6 9.5 1"
        fill="none"
        stroke="var(--cat-line)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* 수염 */}
      <g stroke="var(--cat-line)" strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
        <path d="M20 62 L34 65" />
        <path d="M19 72 L34 72" />
        <path d="M100 62 L86 65" />
        <path d="M101 72 L86 72" />
      </g>
    </svg>
  );
}

export function Paw({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="16" rx="6.5" ry="5.5" fill="currentColor" />
      <ellipse cx="4.8" cy="9.5" rx="2.6" ry="3.2" fill="currentColor" />
      <ellipse cx="9.6" cy="6.2" rx="2.6" ry="3.4" fill="currentColor" />
      <ellipse cx="14.8" cy="6.2" rx="2.6" ry="3.4" fill="currentColor" />
      <ellipse cx="19.4" cy="9.5" rx="2.6" ry="3.2" fill="currentColor" />
    </svg>
  );
}
