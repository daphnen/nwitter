import { CatMascot } from "@/components/Cat";

/**
 * 탭을 옮길 때 바로 뜨는 화면.
 *
 * 모든 페이지가 force-dynamic 이라 이동할 때마다 서버를 다녀옵니다.
 * 이 파일이 없으면 그동안 이전 화면이 그대로 멈춰 있어서, 탭이 안 눌린
 * 것처럼 느껴집니다. Suspense 경계가 생기면 즉시 이 화면으로 바뀝니다.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 pb-32">
      <div className="cat-bob">
        <CatMascot size={72} />
      </div>
      <p className="font-hand text-lg font-bold text-muted">불러오는 중…</p>
    </div>
  );
}
