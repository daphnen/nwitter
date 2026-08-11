"use client";

import { useCallback, useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "@/app/actions/push";
import { VAPID_PUBLIC_KEY, pushConfigured } from "@/lib/push/env";

/**
 * base64url 로 온 공개키를 구독 API 가 받는 바이트 배열로 바꿉니다.
 *
 * ArrayBuffer 를 먼저 만들고 채웁니다. Uint8Array.from 이 돌려주는 타입은
 * SharedArrayBuffer 도 품을 수 있어서 applicationServerKey 가 받지 않습니다.
 */
function toBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.padEnd(
    base64url.length + ((4 - (base64url.length % 4)) % 4),
    "="
  );
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type State =
  /** 브라우저가 웹 푸시를 못 함 */
  | "unsupported"
  /** VAPID 키가 아직 서버에 없음 */
  | "no-keys"
  /** iOS 인데 홈 화면에 추가하지 않음 — 사파리 탭에서는 안 됩니다 */
  | "needs-install"
  | "off"
  | "on"
  /** 브라우저 설정에서 차단해둠. 앱에서는 되돌릴 수 없습니다 */
  | "blocked"
  | "working";

export default function PushToggle() {
  const [state, setState] = useState<State>("working");
  const [problem, setProblem] = useState<string | null>(null);

  /** iOS 인지 (아이패드는 데스크톱 사파리처럼 보고하므로 터치 여부로도 봅니다) */
  const isIOS = useCallback(() => {
    if (typeof navigator === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);

  const standalone = useCallback(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS 사파리는 표준 미디어쿼리 대신 이 값을 씁니다.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    []
  );

  const refresh = useCallback(async () => {
    if (!pushConfigured) return setState("no-keys");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS 는 홈 화면에 추가하기 전에는 PushManager 자체가 없습니다.
      return setState(isIOS() && !standalone() ? "needs-install" : "unsupported");
    }
    if (isIOS() && !standalone()) return setState("needs-install");
    if (Notification.permission === "denied") return setState("blocked");

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setState(sub ? "on" : "off");
  }, [isIOS, standalone]);

  useEffect(() => {
    refresh().catch((error) => {
      console.error(error);
      setState("unsupported");
    });
  }, [refresh]);

  const turnOn = async () => {
    setProblem(null);
    setState("working");
    try {
      // 권한은 스위치를 켤 때만 물어봅니다. 앱 열자마자 물으면 대개 거절당하고,
      // 한 번 거절당하면 앱에서는 되돌릴 방법이 없습니다.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBytes(VAPID_PUBLIC_KEY),
        }));

      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });

      if (result.message) {
        setProblem(result.message);
        await sub.unsubscribe().catch(() => {});
        setState("off");
        return;
      }
      setState("on");
    } catch (error) {
      console.error(error);
      setProblem("알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      setState("off");
    }
  };

  const turnOff = async () => {
    setProblem(null);
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
    } catch (error) {
      console.error(error);
      setProblem("알림을 끄지 못했어요.");
      setState("on");
    }
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestNotification();
      setTestResult(result.message ?? "보냈어요.");
    } catch (error) {
      console.error(error);
      setTestResult("시험 알림을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setTesting(false);
    }
  };

  const on = state === "on";
  const togglable = state === "on" || state === "off";

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-body">
          {on ? "알림 받는 중" : "알림 받기"}
          <span className="mt-0.5 block text-label text-muted">
            상대가 메시지를 보내면 알려줘요
          </span>
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="알림 받기"
          disabled={!togglable}
          onClick={() => (on ? turnOff() : turnOn())}
          className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition disabled:opacity-40 ${
            on ? "border-accent bg-accent" : "border-line bg-card-subtle"
          }`}
        >
          <span
            className={`absolute top-0.5 size-6 rounded-full bg-card shadow-card-soft transition-all ${
              on ? "left-[calc(100%-1.625rem)]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {problem ? (
        <p role="alert" className="mt-2 text-label text-accent-strong">
          🙀 {problem}
        </p>
      ) : null}

      {on ? (
        <>
          <button
            type="button"
            onClick={test}
            disabled={testing}
            className="mt-3 min-h-11 w-full rounded-inner border-2 border-line bg-card-subtle px-4 text-label text-muted transition disabled:opacity-50"
          >
            {testing ? "보내는 중…" : "🔔 시험 알림 보내기"}
          </button>
          {testResult ? (
            <p role="status" className="mt-2 rounded-inner bg-card-subtle px-3 py-2 text-label leading-relaxed">
              {testResult}
            </p>
          ) : null}
        </>
      ) : null}

      {state === "no-keys" ? (
        <Note>
          알림 키가 아직 서버에 없어요. <code>npx web-push generate-vapid-keys</code>
          로 만든 값을 환경변수에 넣으면 켤 수 있어요.
        </Note>
      ) : null}

      {state === "blocked" ? (
        <Note>
          브라우저에서 이 사이트의 알림을 차단해두셨어요. 주소창 왼쪽 자물쇠(또는
          ⓘ) → 알림 → 허용으로 바꾸시면 여기서 켤 수 있어요.
        </Note>
      ) : null}

      {state === "unsupported" ? (
        <Note>이 브라우저는 알림을 지원하지 않아요.</Note>
      ) : null}

      {state === "needs-install" ? (
        <Note>
          아이폰은 <strong>홈 화면에 추가한 뒤</strong>에만 알림을 받을 수 있어요.
          사파리 탭에서는 안 돼요.
          <span className="mt-1.5 block">
            사파리 아래쪽 <strong>공유 버튼</strong> → <strong>홈 화면에 추가</strong>
            {" "}→ 추가된 아이콘으로 다시 열기
          </span>
        </Note>
      ) : null}
    </>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2.5 rounded-inner bg-card-subtle px-3 py-2 text-label leading-relaxed text-muted">
      {children}
    </p>
  );
}
