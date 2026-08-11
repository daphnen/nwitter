import { TIME_ZONE, formatKo, shiftKey, toKey, todayKey } from "@/lib/date";
import type { Message } from "@/lib/database.types";

/** 처음에 받는 개수이자, 위로 스크롤할 때 한 번에 더 받아오는 개수 */
export const PAGE_SIZE = 50;

/*
 * "지금 채팅을 보고 있는지" 판정에 쓰는 두 값.
 *
 * 채팅 화면이 켜져 있는 동안 CHAT_HEARTBEAT_MS 간격으로 "봤음"을 찍고,
 * 서버는 그 시각이 VIEWING_WINDOW_MS 안쪽이면 보는 중으로 보고 알림을
 * 건너뜁니다.
 *
 * 둘은 같이 움직여야 합니다. 창만 줄이면 심박 사이에 낀 메시지가 알림으로
 * 나가서, 화면을 보고 있는데도 알림이 옵니다. 그래서 창을 심박의 두 배로
 * 묶어뒀습니다.
 *
 * 창 길이는 "채팅을 떠난 뒤 알림이 다시 오기까지의 지연"이기도 합니다.
 * 짧을수록 반응이 빠르고, 대신 화면을 켜둔 채 요청을 더 자주 보냅니다.
 */
export const CHAT_HEARTBEAT_MS = 15_000;
export const VIEWING_WINDOW_MS = CHAT_HEARTBEAT_MS * 2;

/**
 * 같은 id 가 있으면 갈아끼우고, 없으면 넣고 seq 순으로 정렬합니다.
 *
 * 내가 보낸 메시지는 서버 액션 응답과 실시간 수신으로 두 번 들어옵니다.
 * id 로 걸러내지 않으면 말풍선이 두 개가 됩니다.
 */
export function upsertMessage(list: Message[], row: Message): Message[] {
  const at = list.findIndex((m) => m.id === row.id);
  if (at >= 0) {
    const next = list.slice();
    next[at] = row;
    return next;
  }
  return [...list, row].sort((a, b) => a.seq - b.seq);
}

/** 화면에 그릴 때 붙는 정보. 서버에서 온 줄은 건드리지 않습니다. */
export type Bubble = {
  message: Message;
  mine: boolean;
  /** 앞에 날짜 구분선을 넣을지 */
  daySeparator: string | null;
  /** 시각을 표시할지. 연속으로 온 묶음의 마지막 것에만 붙입니다. */
  showTime: boolean;
  /** 보낸 중 / 실패. 서버에 있는 줄은 undefined */
  status?: "sending" | "failed";
};

/** 로컬에서 먼저 그려두는 말풍선. 서버 응답이 오면 진짜 줄로 바꿔치기합니다. */
export type Pending = {
  localId: string;
  content: string;
  createdAt: string;
  status: "sending" | "failed";
};

/*
 * 시각은 Intl 로 "숫자만" 뽑고 오전/오후는 손으로 붙입니다.
 *
 * ko-KR 로 한 번에 포매팅하면 안 됩니다. 서버 Node 에 한국어 로케일 데이터가
 * 없는 환경에서는 영어("PM 7:12")로 떨어지고, 브라우저는 한국어로 그려서
 * 하이드레이션이 깨집니다. 이 저장소가 요일 이름도 배열로 직접 들고 있는
 * 것과 같은 이유입니다. 시간대 계산만 Intl 에 맡깁니다.
 */
const HOUR_MINUTE = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function timeLabel(iso: string): string {
  const [h, m] = HOUR_MINUTE.format(new Date(iso)).split(":").map(Number);
  const half = h < 12 ? "오전" : "오후";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${hour}:${String(m).padStart(2, "0")}`;
}

/** 같은 묶음인지 판정할 때 쓰는 "분" 단위 열쇠 */
function minuteKey(iso: string): string {
  return timeLabel(iso);
}

export function dayKey(iso: string): string {
  return toKey(new Date(iso));
}

export function dayLabel(key: string): string {
  if (key === todayKey()) return "오늘";
  if (key === shiftKey(todayKey(), -1)) return "어제";
  return formatKo(key);
}

/**
 * 메시지 줄들을 말풍선으로 바꿉니다.
 *
 * 시각은 "같은 사람이 같은 분에 연달아 보낸 묶음"의 마지막에만 붙입니다.
 * 그래서 한 통씩 판단할 수 없고, 뒤 메시지를 봐야 정해집니다.
 */
export function toBubbles(
  messages: Message[],
  pending: Pending[],
  myId: string
): Bubble[] {
  const rows: Bubble[] = messages.map((message) => ({
    message,
    mine: message.sender_id === myId,
    daySeparator: null,
    showTime: false,
  }));

  // 아직 안 간 것들은 항상 맨 끝에 붙습니다.
  for (const p of pending) {
    rows.push({
      message: {
        id: p.localId,
        seq: Number.MAX_SAFE_INTEGER,
        sender_id: myId,
        content: p.content,
        created_at: p.createdAt,
        edited_at: null,
        deleted_at: null,
      },
      mine: true,
      daySeparator: null,
      showTime: false,
      status: p.status,
    });
  }

  let lastDay: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const day = dayKey(row.message.created_at);
    if (day !== lastDay) {
      row.daySeparator = day;
      lastDay = day;
    }

    const next = rows[i + 1];
    row.showTime =
      !next ||
      next.message.sender_id !== row.message.sender_id ||
      dayKey(next.message.created_at) !== day ||
      minuteKey(next.message.created_at) !== minuteKey(row.message.created_at);
  }

  return rows;
}
