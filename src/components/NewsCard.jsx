import React, { useEffect, useRef, useState } from "react";
import Card from "./Card";
import { EmptyNote } from "./Cat";
import useCollection from "../hooks/useCollection";
import { TABLES } from "../lib/db";
import { fetchNews, googleNewsWebUrl, timeAgo } from "../lib/news";

const DEFAULT_TOPICS = ["프론트엔드", "UI 디자인", "AI"];
const SEED_FLAG = "cat-dashboard:topics-seeded";

export default function NewsCard() {
  const { items: topics, loading: topicsLoading, add, remove } = useCollection(
    TABLES.topics,
    { order: [["created_at", "asc"]] }
  );

  const [active, setActive] = useState(null);
  const [news, setNews] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const seeding = useRef(false);

  // 처음 쓰는 사람에게는 기본 키워드를 한 번만 넣어줍니다.
  useEffect(() => {
    if (topicsLoading || seeding.current) return;
    if (topics.length > 0) return;
    if (window.localStorage.getItem(SEED_FLAG)) return;
    seeding.current = true;
    window.localStorage.setItem(SEED_FLAG, "1");
    (async () => {
      for (const name of DEFAULT_TOPICS) await add({ name });
    })();
  }, [topics.length, topicsLoading, add]);

  // 활성 키워드 보정
  useEffect(() => {
    if (topics.length === 0) {
      setActive(null);
      return;
    }
    if (!topics.some((t) => t.id === active)) setActive(topics[0].id);
  }, [topics, active]);

  const activeTopic = topics.find((t) => t.id === active);

  useEffect(() => {
    if (!activeTopic) {
      setNews([]);
      setState("idle");
      return;
    }
    let alive = true;
    setState("loading");
    fetchNews(activeTopic.name)
      .then((rows) => {
        if (!alive) return;
        setNews(rows);
        setState("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setMessage(e.message);
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [activeTopic]);

  const submitTopic = async (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    const created = await add({ name });
    setDraft("");
    setAdding(false);
    if (created) setActive(created.id);
  };

  return (
    <Card
      title="관심 뉴스"
      emoji="📰"
      accent="yellow"
      right={
        <button className="btn btn--ghost" onClick={() => setAdding((v) => !v)}>
          {adding ? "닫기" : "+ 키워드"}
        </button>
      }
    >
      {adding ? (
        <form className="row-form" onSubmit={submitTopic}>
          <input
            className="input"
            placeholder="예: 고양이, 스타트업, 여행"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="키워드"
          />
          <button className="btn btn--round" type="submit" aria-label="키워드 추가">
            +
          </button>
        </form>
      ) : null}

      <div className="topics">
        {topics.map((t) => (
          <span
            key={t.id}
            className={`topic ${t.id === active ? "is-on" : ""}`}
          >
            <button className="topic__btn" onClick={() => setActive(t.id)}>
              #{t.name}
            </button>
            <button
              className="topic__x"
              onClick={() => remove(t.id)}
              aria-label={`${t.name} 키워드 삭제`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {topics.length === 0 && !topicsLoading ? (
        <EmptyNote>관심 키워드를 추가하면 최신 기사를 모아 드려요.</EmptyNote>
      ) : null}

      {state === "loading" ? <p className="loading-note">기사를 물어오는 중… 🐈</p> : null}

      {state === "error" ? (
        <div className="error-box">
          <p>기사를 가져오지 못했어요 🥲</p>
          <p className="error-box__detail">{message}</p>
          {activeTopic ? (
            <a
              className="btn btn--ghost"
              href={googleNewsWebUrl(activeTopic.name)}
              target="_blank"
              rel="noreferrer"
            >
              구글 뉴스에서 바로 보기 →
            </a>
          ) : null}
        </div>
      ) : null}

      {state === "ready" && news.length === 0 ? (
        <EmptyNote>이 키워드로는 아직 기사가 없네요.</EmptyNote>
      ) : null}

      <ul className="news">
        {news.map((item) => (
          <li key={item.id} className="news__item">
            <a href={item.link} target="_blank" rel="noreferrer" className="news__link">
              <span className="news__title">{item.title}</span>
              <span className="news__meta">
                {item.source ? <em>{item.source}</em> : null}
                {item.pubDate ? <span>{timeAgo(item.pubDate)}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
