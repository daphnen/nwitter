import type { MetadataRoute } from "next";

/**
 * 홈 화면에 추가했을 때 쓰이는 정보. /manifest.webmanifest 로 나갑니다.
 *
 * 이 파일은 로그인 여부와 상관없이 열려야 해서 middleware matcher 에서
 * 빼두었습니다. (안 빼면 브라우저가 /login 의 HTML 을 받아 무시합니다.)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우리의 대시보드",
    short_name: "우리집",
    description: "둘이서 함께 쓰는 하루 기록 대시보드",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // moonlight 라이트 모드의 --bg-base. 앱을 켤 때 잠깐 보이는 바탕색입니다.
    background_color: "#fdf3f8",
    theme_color: "#fdf3f8",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // 안드로이드는 아이콘을 원형/사각형으로 깎습니다.
      // 이 그림은 고양이가 가운데 60% 안에 들어와 있어 안 잘립니다.
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "시간표",
        url: "/timetable",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "달력",
        url: "/calendar",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
