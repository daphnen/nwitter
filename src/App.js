import React, { useEffect, useState } from "react";
import "./App.css";
import { CatMascot, Paw } from "./components/Cat";
import ScheduleCard from "./components/ScheduleCard";
import GoalsCard from "./components/GoalsCard";
import MealsCard from "./components/MealsCard";
import RoutineCard from "./components/RoutineCard";
import NewsCard from "./components/NewsCard";
import { db } from "./lib/db";
import { formatKo, greeting, isToday, shiftKey, todayKey } from "./lib/date";

const THEME_KEY = "cat-dashboard:theme";

function useTheme() {
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem(THEME_KEY) || "day"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return [theme, setTheme];
}

export default function App() {
  const [dateKey, setDateKey] = useState(todayKey());
  const [theme, setTheme] = useTheme();
  const hello = greeting();
  const night = theme === "night";

  return (
    <div className="app">
      <div className="app__bg" aria-hidden="true">
        <Paw size={120} className="deco deco--1" />
        <Paw size={80} className="deco deco--2" />
        <Paw size={150} className="deco deco--3" />
        <Paw size={64} className="deco deco--4" />
      </div>

      <header className="hero">
        <div className="hero__cat">
          <CatMascot size={104} mood={night ? "sleepy" : "happy"} />
        </div>
        <div className="hero__text">
          <p className="hero__greeting">
            {hello.emoji} {hello.text}
          </p>
          <h1 className="hero__title">나만의 대시보드</h1>
          <p className="hero__sub">
            오늘도 차근차근, 냥이가 옆에서 지켜볼게요 🐾
          </p>
        </div>
        <div className="hero__actions">
          <button
            className="btn btn--ghost"
            onClick={() => setTheme(night ? "day" : "night")}
          >
            {night ? "☀️ 낮 모드" : "🌙 밤 모드"}
          </button>
          <span className={`db-badge db-badge--${db.name}`}>
            {db.name === "supabase" ? "☁️ Supabase 연결됨" : "💾 이 브라우저에 저장 중"}
          </span>
        </div>
      </header>

      <nav className="datenav">
        <button
          className="btn btn--round btn--soft"
          onClick={() => setDateKey((k) => shiftKey(k, -1))}
          aria-label="이전 날"
        >
          ‹
        </button>
        <div className="datenav__label">
          <strong>{formatKo(dateKey)}</strong>
          {isToday(dateKey) ? <span className="pill pill--today">오늘</span> : null}
        </div>
        <button
          className="btn btn--round btn--soft"
          onClick={() => setDateKey((k) => shiftKey(k, 1))}
          aria-label="다음 날"
        >
          ›
        </button>
        {!isToday(dateKey) ? (
          <button className="btn btn--ghost" onClick={() => setDateKey(todayKey())}>
            오늘로
          </button>
        ) : null}
      </nav>

      <main className="grid">
        <div className="grid__col grid__col--main">
          <ScheduleCard dateKey={dateKey} />
          <MealsCard dateKey={dateKey} />
          <RoutineCard dateKey={dateKey} />
        </div>
        <div className="grid__col grid__col--side">
          <GoalsCard />
          <NewsCard />
        </div>
      </main>

      <footer className="footer">
        <Paw size={14} /> 오늘도 수고했어요
      </footer>
    </div>
  );
}
