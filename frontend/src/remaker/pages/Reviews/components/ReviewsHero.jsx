import React from "react";

import Stars from "./Stars";

/* Average, rating bars (click to filter), response rate, what people mention */
export default function ReviewsHero({ summary, ratingFilter, onRatingFilter }) {
  return (
    <section className="rvp-hero">
      <div className="rvp-score">
        <strong>{summary.average ? summary.average.toFixed(1) : "-"}</strong>
        <Stars value={summary.average} size={22} />
        <span>
          Based on {summary.count} {summary.count === 1 ? "review" : "reviews"}
        </span>
      </div>

      <ul className="rvp-bars" aria-label="Filter by rating">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.distribution[star];
          const share = summary.count ? (count / summary.count) * 100 : 0;

          return (
            <li key={star}>
              <button
                type="button"
                className={ratingFilter === star ? "active" : ""}
                aria-pressed={ratingFilter === star}
                onClick={() => onRatingFilter(ratingFilter === star ? 0 : star)}
              >
                <span>{star} star</span>
                <i>
                  <b style={{ width: `${share}%` }} />
                </i>
                <em>{count}</em>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rvp-hero-side">
        <div className="rvp-response">
          <div className="rvp-response-top">
            <small>Reply rate</small>
            <strong>{Math.round(summary.responseRate)}%</strong>
          </div>
          <div
            className="rvp-meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(summary.responseRate)}
          >
            <i style={{ width: `${summary.responseRate}%` }} />
          </div>
          <p>
            {summary.needsReply > 0
              ? `${summary.needsReply} ${summary.needsReply === 1 ? "review is" : "reviews are"} waiting for your reply.`
              : "You have replied to every review. Well done."}
          </p>
        </div>

        {summary.praised.length > 0 && (
          <div className="rvp-mentions">
            <small>Customers praise</small>
            <div>
              {summary.praised.map((item) => (
                <span className="good" key={item.tag}>
                  {item.tag} <b>{item.count}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {summary.attention.length > 0 && (
          <div className="rvp-mentions">
            <small>Could be better</small>
            <div>
              {summary.attention.map((item) => (
                <span className="warn" key={item.tag}>
                  {item.tag} <b>{item.count}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
