/*
 * 서비스워커 — 하는 일은 딱 두 가지입니다.
 *
 *  1. 해시가 붙은 정적 파일(/_next/static, /icons)만 캐시해서 재방문을 빠르게
 *  2. 오프라인에서 화면을 열면 /offline.html 을 대신 보여주기
 *
 * 화면(HTML)과 RSC 응답은 절대 캐시하지 않습니다.
 * 둘이서 쓰는 앱이라 같은 주소라도 로그인한 사람마다, 보고 있는 날짜마다
 * 내용이 다릅니다. 캐시했다가는 상대방 기록이 남아 보일 수 있습니다.
 */

const VERSION = "v1";
const STATIC_CACHE = `nwitter-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/**
 * 배포할 때마다 /_next/static 의 파일 이름이 바뀌므로, 그냥 두면 지난 배포의
 * 파일이 캐시에 계속 쌓입니다. 오래 담긴 것부터 잘라냅니다.
 * (Cache API 의 keys() 는 넣은 순서대로 돌려줍니다.)
 */
const MAX_ENTRIES = 120;

async function trim() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  if (excess <= 0) return;

  for (const request of keys.slice(0, excess)) {
    if (PRECACHE.includes(new URL(request.url).pathname)) continue;
    await cache.delete(request);
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))
        )
      )
      .then(trim)
      .then(() => self.clients.claim())
  );
});

/** 내용이 바뀌면 파일 이름도 바뀌는 경로들. 이것만 캐시합니다. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 주소창/링크로 화면을 여는 요청. 항상 네트워크로 가고,
  // 연결이 끊겼을 때만 오프라인 안내 화면을 돌려줍니다.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match(OFFLINE_URL);
        return (
          fallback ??
          new Response("오프라인이에요", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // 나머지(RSC, /api, 서버 액션)는 손대지 않고 브라우저에 맡깁니다.
  if (!isImmutableAsset(url)) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;

      return fetch(request).then((response) => {
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(request, copy))
            .then(trim);
        }
        return response;
      });
    })
  );
});
