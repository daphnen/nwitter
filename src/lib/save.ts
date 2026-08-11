/**
 * 배경 저장을 감쌉니다.
 *
 * 서버 액션이 실패하면 rejected promise 가 그대로 React 로 올라가서
 * 에러 경계가 화면을 통째로 갈아치웁니다. 낙관적 업데이트는 이미 화면에
 * 반영된 뒤라, 저장 실패로 페이지가 날아가는 건 과한 반응입니다.
 * 여기서 삼키고 콘솔에만 남깁니다.
 */
export function quiet(run: () => Promise<unknown>) {
  return async () => {
    try {
      await run();
    } catch (error) {
      console.error("저장하지 못했어요:", error);
    }
  };
}
