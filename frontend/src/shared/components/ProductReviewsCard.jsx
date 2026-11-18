import React from "react";
import { MessageSquareText, Star, CornerDownRight } from "lucide-react";
import { useProductReviews } from "../hooks/usePublicReviews";
import "./ProductReviewsCard.css";

const Stars = ({ value, size = 14 }) => (
  <span className="prc-stars" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} className={n <= Math.round(value) ? "on" : ""} />
    ))}
  </span>
);

/* What buyers said about one product (LST-…, RPR-…, ADI-…). For the seller's own pages:
   average, the 5→1 star breakdown, and each review with its photos and the seller's reply. */
export default function ProductReviewsCard({ productId, title = "Product reviews", className = "dn-card dn-card-pad" }) {
  const { reviews, summary, ready } = useProductReviews(productId);
  const max = Math.max(1, ...Object.values(summary.distribution || {}));
  return (
    <section className={`prc ${className}`}>
      <div className="prc-head">
        <div>
          <h2>{title}</h2>
          <small>What buyers said about this product</small>
        </div>
        {summary.count > 0 && (
          <div className="prc-avg">
            <strong>{summary.average.toFixed(1)}</strong>
            <Stars value={summary.average} />
            <small>
              {summary.count} review{summary.count === 1 ? "" : "s"}
            </small>
          </div>
        )}
      </div>

      {!ready ? (
        <p className="prc-muted">Loading reviews…</p>
      ) : summary.count === 0 ? (
        <div className="prc-empty">
          <MessageSquareText size={22} />
          <span>No reviews yet. Buyers can review it after their order is delivered.</span>
        </div>
      ) : (
        <>
          <div className="prc-dist">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = summary.distribution?.[n] || 0;
              return (
                <div key={n}>
                  <span>{n}★</span>
                  <i>
                    <b style={{ width: `${(c / max) * 100}%` }} />
                  </i>
                  <em>{c}</em>
                </div>
              );
            })}
          </div>
          <ul className="prc-list">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="prc-who">
                  <span className="prc-avatar">{(r.name || "?").slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <span>
                      <Stars value={r.rating} size={12} /> · {r.date}
                    </span>
                  </div>
                </div>
                <p>{r.text}</p>
                {r.photos.length > 0 && (
                  <div className="prc-photos">
                    {r.photos.slice(0, 4).map((src) => (
                      <a key={src} href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt="Buyer's photo" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
                {r.reply && (
                  <div className="prc-reply">
                    <CornerDownRight size={13} /> <b>Your reply:</b> {r.reply.text}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
