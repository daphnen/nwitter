import React from "react";

export default function Card({ title, emoji, accent = "peach", right, children }) {
  return (
    <section className={`card card--${accent}`}>
      <header className="card__head">
        <h2 className="card__title">
          <span className="card__emoji" aria-hidden="true">
            {emoji}
          </span>
          {title}
        </h2>
        {right ? <div className="card__right">{right}</div> : null}
      </header>
      <div className="card__body">{children}</div>
    </section>
  );
}
