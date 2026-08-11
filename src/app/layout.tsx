import type { Metadata, Viewport } from "next";
import { Gaegu, Jua } from "next/font/google";
import BottomTabs from "@/components/BottomTabs";
import ServiceWorker from "@/components/ServiceWorker";
import ThemeBackdrop from "@/components/ThemeBackdrop";
import { getViewContext } from "@/lib/auth";
import "./globals.css";

// next/font 는 이 두 폰트의 서브셋을 `latin` 하나로만 알고 있습니다.
// latin 만 요청하면 한글 글리프가 빠지므로, subsets 를 지정하지 않고
// (= preload 를 끄고) 전체 unicode-range 를 받아옵니다.
const jua = Jua({
  weight: "400",
  preload: false,
  variable: "--font-jua",
  display: "swap",
});

const gaegu = Gaegu({
  weight: ["400", "700"],
  preload: false,
  variable: "--font-gaegu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "🐱 우리의 대시보드",
  description: "둘이서 함께 쓰는 하루 기록 대시보드",
  applicationName: "우리의 대시보드",
  manifest: "/manifest.webmanifest",
  // iOS 는 manifest 를 거의 안 봅니다. 홈 화면에 추가했을 때 주소창 없이
  // 앱처럼 뜨게 하려면 이 메타태그들이 따로 있어야 합니다.
  appleWebApp: {
    capable: true,
    title: "우리의 대시보드",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  // 날짜/시간 문자열을 사파리가 전화번호 링크로 바꾸는 걸 막습니다.
  formatDetection: { telephone: false },
  other: {
    // Next 는 표준 이름인 mobile-web-app-capable 만 내보냅니다.
    // 구형 iOS 는 apple- 접두사 붙은 쪽만 보고 주소창을 숨깁니다.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // 홈 화면에서 켰을 때 상단 상태바 색. moonlight 라이트 모드의 --bg-base 입니다.
  // 테마를 바꾸면 ThemeBackdrop 이 이 값을 실제 배경색으로 맞춰줍니다.
  themeColor: "#fdf3f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /*
   * data-theme 은 "화면에 보이는 대상 유저"의 테마입니다.
   * 서버에서 정해 내려보내야 첫 프레임에 기본 테마가 번쩍이지 않습니다.
   * 6단계(친구 기록 토글)에서 조회 대상 기준으로 바뀝니다.
   */
  const { theme, mode } = await getViewContext();

  return (
    // 폰트 변수는 반드시 <html> 에 둡니다. <body> 에 두면 :root 에서 정의한
    // --stack-round 가 --font-jua 를 찾지 못해 통째로 무효가 됩니다.
    <html
      lang="ko"
      data-theme={theme}
      data-mode={mode}
      className={`${jua.variable} ${gaegu.variable}`}
    >
      <body>
        <ThemeBackdrop theme={theme} mode={mode} />
        {children}
        <BottomTabs />
        <ServiceWorker />
      </body>
    </html>
  );
}
