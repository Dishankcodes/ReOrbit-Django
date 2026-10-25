import React, { useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { relativeAgo, withdrawReport } from "../../../data/reviewsStore";
import PhotoViewer from "./PhotoViewer";
import ReplyBox from "./ReplyBox";
import Stars from "./Stars";

export default function ReviewCard({ review, onReport }) {
  const [viewer, setViewer] = useState(-1);
  const { reviewer } = review;

  return (
    <article
      className={`rvp-card ${!review.reply ? "needs" : ""} ${review.report ? "reported" : ""}`}
    >
      <header className="rvp-card-head">
        <span className="rvp-avatar">
          <Avatar src={reviewer.image} name={reviewer.name} />
        </span>

        <div className="rvp-who">
          <strong>
            {reviewer.customerId ? (
              <Link to={`/remaker-customers/${reviewer.customerId}`}>
                {reviewer.name}
              </Link>
            ) : (
              reviewer.name
            )}
          </strong>
          <small>
            {reviewer.city} · {relativeAgo(review.createdAt)}
          </small>
        </div>

        <div className="rvp-rate">
          <Stars value={review.rating} />
          <small>{review.verified ? "Verified purchase" : ""}</small>
        </div>
      </header>

      <Link
        to={`/remaker-products/${review.productId}/edit`}
        className="rvp-product"
      >
        <img src={review.productImage} alt="" />
        <span>
          <small>Review of</small>
          <strong>{review.productTitle}</strong>
        </span>
      </Link>

      <p className="rvp-text">{review.text}</p>

      {review.tags.length > 0 && (
        <div className="rvp-tags">
          {review.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      {review.photos.length > 0 && (
        <div className="rvp-photos">
          {review.photos.map((src, index) => (
            <button
              type="button"
              key={src}
              onClick={() => setViewer(index)}
              aria-label={`Open customer photo ${index + 1}`}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {review.report ? (
        <div className="rvp-reported">
          <div>
            <strong>You reported this review</strong>
            <small>
              {review.report.reason} · {review.report.status}
            </small>
          </div>
          <button type="button" onClick={() => withdrawReport(review.id)}>
            Withdraw report
          </button>
        </div>
      ) : null}

      <ReplyBox review={review} />

      <footer className="rvp-card-foot">
        <span>
          {review.helpful} {review.helpful === 1 ? "person" : "people"} found
          this helpful
        </span>

        {!review.report && (
          <button type="button" onClick={() => onReport(review)}>
            Report review
          </button>
        )}
      </footer>

      {viewer >= 0 && (
        <PhotoViewer
          photos={review.photos}
          index={viewer}
          onChange={setViewer}
          onClose={() => setViewer(-1)}
        />
      )}
    </article>
  );
}
