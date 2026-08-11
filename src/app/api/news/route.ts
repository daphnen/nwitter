import { NextResponse, type NextRequest } from "next/server";
import { getSessionState } from "@/lib/auth";
import { fetchNews, googleNewsWebUrl } from "@/lib/news";

/**
 * GET /api/news?q=키워드
 *
 * 구글 뉴스 RSS 를 서버에서 받아 JSON 으로 돌려줍니다.
 * 브라우저가 직접 부르면 CORS 에 막히고, 서버에서 부르면 그럴 일이 없습니다.
 */
export async function GET(request: NextRequest) {
  // 로그인한 두 사람만. 아무나 부르는 공개 프록시가 되면 곤란합니다.
  const session = await getSessionState();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const keyword = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!keyword || keyword.length > 60) {
    return NextResponse.json(
      { error: "키워드를 확인해 주세요." },
      { status: 400 }
    );
  }

  try {
    const items = await fetchNews(keyword);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("뉴스를 가져오지 못했어요:", error);
    return NextResponse.json(
      {
        error: "지금은 기사를 가져올 수 없어요.",
        fallbackUrl: googleNewsWebUrl(keyword),
      },
      { status: 502 }
    );
  }
}
