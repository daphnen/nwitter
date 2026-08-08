// 별도 API 키 없이 Google 뉴스 RSS 를 가져옵니다.
// 브라우저에서 RSS 를 바로 부르면 CORS 에 막히기 때문에 JSON 변환 프록시를 거칩니다.
// 자체 프록시가 있다면 REACT_APP_RSS_PROXY 로 바꿔 끼울 수 있습니다.

const PROXY =
  process.env.REACT_APP_RSS_PROXY ||
  "https://api.rss2json.com/v1/api.json?rss_url=";

export function googleNewsUrl(topic) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(
    topic
  )}&hl=ko&gl=KR&ceid=KR:ko`;
}

export function googleNewsWebUrl(topic) {
  return `https://news.google.com/search?q=${encodeURIComponent(
    topic
  )}&hl=ko&gl=KR&ceid=KR:ko`;
}

function splitSource(title) {
  const idx = title.lastIndexOf(" - ");
  if (idx === -1) return { title, source: "" };
  return { title: title.slice(0, idx), source: title.slice(idx + 3) };
}

export async function fetchNews(topic, limit = 6) {
  const res = await fetch(PROXY + encodeURIComponent(googleNewsUrl(topic)));
  if (!res.ok) throw new Error(`뉴스를 불러오지 못했어요 (${res.status})`);

  const data = await res.json();
  if (data.status && data.status !== "ok") {
    throw new Error(data.message || "뉴스를 불러오지 못했어요");
  }

  const items = data.items || [];
  return items.slice(0, limit).map((item, i) => {
    const { title, source } = splitSource(item.title || "");
    return {
      id: item.guid || item.link || `${topic}-${i}`,
      title,
      source: source || item.author || "",
      link: item.link,
      pubDate: item.pubDate,
    };
  });
}

export function timeAgo(pubDate) {
  if (!pubDate) return "";
  const then = new Date(pubDate.replace(" ", "T"));
  if (Number.isNaN(then.getTime())) return "";
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
