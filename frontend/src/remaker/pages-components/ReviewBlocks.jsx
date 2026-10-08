import React, { useState } from "react";
import { Star, BadgeCheck } from "lucide-react";

import { summarizeReviews } from "../data/remakerMarketplaceData";

import "../css/ReMakerReviews.css";

export function Stars({ value, size = 14 }) {
  return (
    <span className="rvw-stars" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= Math.round(value) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function initialsOf(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "RO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/* Photo with initials fallback. The parent decides the size. */
export function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="rvw-avatar">
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <b>{initialsOf(name)}</b>
      )}
    </span>
  );
}

/* Average, star count bars. `average` and `total` can come from the
   seller record when more reviews exist than are listed. */
export function RatingSummary({ reviews, average, total }) {
  const summary = summarizeReviews(reviews);
  const shownAverage = average ?? summary.average;
  const count = total ?? summary.count;

  return (
    <div className="rvw-summary">
      <div className="rvw-score">
        <strong>{shownAverage ? shownAverage.toFixed(1) : "-"}</strong>
        <Stars value={shownAverage} size={16} />
        <span>
          {count} {count === 1 ? "review" : "reviews"}
        </span>
      </div>

      <ul className="rvw-bars" aria-label="Rating breakdown">
        {[5, 4, 3, 2, 1].map((star) => {
          const share = summary.count ? (summary.distribution[star] / summary.count) * 100 : 0;

          return (
            <li key={star}>
              <span>{star}</span>
              <Star size={12} fill="currentColor" />
              <i>
                <b style={{ width: `${share}%` }} />
              </i>
              <em>{summary.distribution[star]}</em>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReviewList({ reviews, verified = false }) {
  return (
    <div className="rvw-list">
      {reviews.map((review) => (
        <article key={review.id}>
          <header>
            <span className="rvw-who">
              <span className="rvw-initial">{initialsOf(review.name)}</span>
              <strong>{review.name}</strong>
            </span>
            <time>{review.date}</time>
          </header>

          <div className="rvw-meta">
            <Stars value={review.rating} />
            {verified && (
              <span className="rvw-verified">
                <BadgeCheck size={13} />
                Verified purchase
              </span>
            )}
          </div>

          <p>{review.text}</p>
        </article>
      ))}
    </div>
  );
}
