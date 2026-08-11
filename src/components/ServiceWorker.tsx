"use client";

import { useEffect } from "react";

/**
 * /sw.js 등록. 화면에는 아무것도 그리지 않습니다.
 *
 * 개발 서버에서는 등록하지 않습니다. next dev 는 청크 파일 이름을 바꾸지 않고
 * 내용만 갈아끼우기 때문에, 캐시가 남으면 고친 코드가 반영되지 않습니다.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("서비스워커를 등록하지 못했어요:", error);
      });
    };

    // 첫 화면 그리기와 경쟁하지 않도록 load 이후로 미룹니다.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
