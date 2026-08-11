/**
 * 구글 뉴스 RSS 를 서버에서 받아 파싱합니다.
 *
 * 브라우저에서 직접 부르면 CORS 에 막혀 프로토타입에서는 외부 변환 서비스를
 * 거쳤지만, 서버 라우트에서 부르면 그럴 필요가 없습니다. API 키도 없습니다.
 */

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string | null;
};

export function googleNewsRssUrl(keyword: string): string {
  const q = encodeURIComponent(keyword);
  return `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

/** 기사를 못 가져왔을 때 안내에 쓸 사람이 볼 수 있는 주소 */
export function googleNewsWebUrl(keyword: string): string {
  const q = encodeURIComponent(keyword);
  return `https://news.google.com/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

// ------------------------------------------------------------------ 파싱

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function unwrapCdata(text: string): string {
  const match = text.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : text;
}

/** <tag ...>내용</tag> 에서 내용만. 없으면 빈 문자열. */
function tagContent(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i")
  );
  if (!match) return "";
  return decodeEntities(unwrapCdata(match[1])).trim();
}

/**
 * 구글 뉴스는 제목 끝에 " - 언론사" 를 붙입니다.
 * <source> 로 언론사를 알 수 있으면 제목에서 떼어냅니다.
 */
function stripSourceSuffix(title: string, source: string): string {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

export function parseRss(xml: string, limit = 8): NewsItem[] {
  const items: NewsItem[] = [];

  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];

    const link = tagContent(block, "link");
    const rawTitle = tagContent(block, "title");
    if (!rawTitle || !link) continue;

    const source = tagContent(block, "source");
    const pubDate = tagContent(block, "pubDate");
    const parsed = pubDate ? new Date(pubDate) : null;

    items.push({
      id: tagContent(block, "guid") || link,
      title: stripSourceSuffix(rawTitle, source),
      source,
      link,
      publishedAt:
        parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    });

    if (items.length >= limit) break;
  }

  return items;
}

export async function fetchNews(keyword: string, limit = 8): Promise<NewsItem[]> {
  const response = await fetch(googleNewsRssUrl(keyword), {
    headers: {
      // 기본 UA 로는 가끔 빈 응답이 옵니다.
      "user-agent":
        "Mozilla/5.0 (compatible; DailyDashboard/1.0; +https://github.com/daphnen/nwitter)",
      accept: "application/rss+xml, application/xml, text/xml",
    },
    // 같은 키워드를 여러 번 열어도 10분에 한 번만 실제로 받아옵니다.
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`구글 뉴스가 ${response.status} 를 돌려줬어요`);
  }

  return parseRss(await response.text(), limit);
}

// ------------------------------------------------------------------ 표시용

export function timeAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}
