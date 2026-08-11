import { Paw } from "@/components/Cat";

/**
 * 화면 맨 아래 서명 한 줄.
 *
 * 이 앱에서 손글씨체(개구)를 쓰는 곳은 여기 한 곳뿐입니다. 나머지는 전부
 * 본문 글꼴(주아)로 통일돼 있습니다. 네 화면에 같은 마크업이 흩어져 있던 걸
 * 하나로 모았습니다.
 */
export default function Signature({ text = "오늘도 수고했어요" }: { text?: string }) {
  return (
    <p className="mt-9 flex items-center justify-center gap-2 font-hand text-heading font-bold text-muted">
      <Paw size={14} /> {text}
    </p>
  );
}
