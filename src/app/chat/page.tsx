import { redirect } from "next/navigation";
import ChatView from "@/components/chat/ChatView";
import { getMyPreferences, getSessionState } from "@/lib/auth";
import { getMessages, getPartner } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * 채팅은 홈처럼 카드로 감싸지 않고 화면을 통째로 씁니다.
 *
 * 테마는 언제나 로그인한 본인 것입니다. 친구 기록 보기(?who=partner)로
 * 테마를 바꾸는 스크립트는 홈 화면에만 있어서 여기까지 따라오지 않습니다.
 */
export default async function ChatPage() {
  const session = await getSessionState();
  if (session.status !== "ok") redirect("/");

  const me = session.profile;
  const [messages, partner, prefs] = await Promise.all([
    getMessages(50),
    getPartner(me.id),
    getMyPreferences(me.id),
  ]);

  return (
    <ChatView
      me={me}
      partner={partner}
      initial={messages}
      mode={prefs.darkMode ? "dark" : "light"}
    />
  );
}
