import React from "react";
import { Star, MessageSquareText } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { formatDate } from "../../../utils/format";

function Stars({ value }) {
  return (
    <span className="aup-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? "on" : ""}
          fill={n <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function RemakerReviewsTab({ remaker }) {
  const { reviews } = remaker;
  if (reviews.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={MessageSquareText}
          title="No reviews yet"
          text="Customer reviews for this ReMaker will appear here."
        />
      </section>
    );
  }
  const counts = [5, 4, 3, 2, 1].map((n) => ({
    n,
    c: reviews.filter((r) => r.rating === n).length,
  }));

  return (
    <section className="aup-card">
      <header className="aup-card-head">
        <div>
          <h3>Customer reviews</h3>
          <p>What buyers have said about this ReMaker.</p>
        </div>
      </header>
      <div className="rm-rating-summary">
        <div className="rm-rating-big">
          <strong>{remaker.rating.toFixed(1)}</strong>
          <Stars value={Math.round(remaker.rating)} />
          <small>
            {reviews.length} review{reviews.length > 1 ? "s" : ""}
          </small>
        </div>
        <div className="rm-bars">
          {counts.map(({ n, c }) => (
            <div key={n} className="rm-bar">
              <span>{n}★</span>
              <i>
                <b style={{ width: `${(c / reviews.length) * 100}%` }} />
              </i>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="aup-reviews">
        {reviews.map((r) => (
          <li key={r.review_id}>
            <div className="aup-review-head">
              <div>
                <strong>{r.reviewer}</strong>
                <span>
                  on “{r.product}” · {formatDate(r.created_at)}
                </span>
              </div>
              <Stars value={r.rating} />
            </div>
            <p>{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
