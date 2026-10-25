import React from "react";
import { Star, MessageSquareText } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { formatDate } from "../../../utils/format";

function Stars({ value }) {
  return (
    <span className="aup-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= value ? "on" : ""} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export default function ReviewsTab({ user }) {
  if (user.reviews.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState icon={MessageSquareText} title="No reviews written" text="Reviews this user leaves for products and ReMakers will show here." />
      </section>
    );
  }

  return (
    <section className="aup-card">
      <header className="aup-card-head">
        <div>
          <h3>Reviews written</h3>
          <p>What this user has said about products and ReMakers.</p>
        </div>
      </header>
      <ul className="aup-reviews">
        {user.reviews.map((review) => (
          <li key={review.review_id}>
            <div className="aup-review-head">
              <div>
                <strong>{review.target}</strong>
                <span>{review.kind} review · {formatDate(review.created_at)}</span>
              </div>
              <Stars value={review.rating} />
            </div>
            <p>{review.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
