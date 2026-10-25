import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ratingsByProduct,
  reportReview,
  summarize,
  useReviews,
} from "../../data/reviewsStore";

import ProductRatings from "./components/ProductRatings";
import ReportReviewModal from "./components/ReportReviewModal";
import ReviewCard from "./components/ReviewCard";
import ReviewToolbar from "./components/ReviewToolbar";
import ReviewsHero from "./components/ReviewsHero";

import "./ReviewsPage.css";

const PAGE_SIZE = 6;

export default function ReMakerReviews() {
  const reviews = useReviews();

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState("all");
  const [sort, setSort] = useState("newest");
  const [rating, setRating] = useState(0);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [reporting, setReporting] = useState(null);
  const [notice, setNotice] = useState("");

  const summary = useMemo(() => summarize(reviews), [reviews]);
  const byProduct = useMemo(() => ratingsByProduct(reviews), [reviews]);

  const counts = useMemo(
    () => ({
      all: reviews.length,
      needs: reviews.filter((review) => !review.reply).length,
      replied: reviews.filter((review) => review.reply).length,
      photos: reviews.filter((review) => review.photos.length > 0).length,
      reported: reviews.filter((review) => review.report).length,
    }),
    [reviews],
  );

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();

    const filtered = reviews.filter((review) => {
      if (tab === "needs" && review.reply) return false;
      if (tab === "replied" && !review.reply) return false;
      if (tab === "photos" && review.photos.length === 0) return false;
      if (tab === "reported" && !review.report) return false;
      if (product !== "all" && review.productId !== product) return false;
      if (rating && review.rating !== rating) return false;
      if (!text) return true;

      return [
        review.reviewer.name,
        review.text,
        review.productTitle,
        review.reviewer.city,
      ]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });

    const sorters = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      highest: (a, b) =>
        b.rating - a.rating || b.createdAt.localeCompare(a.createdAt),
      lowest: (a, b) =>
        a.rating - b.rating || b.createdAt.localeCompare(a.createdAt),
      helpful: (a, b) => b.helpful - a.helpful,
    };

    return [...filtered].sort(sorters[sort]);
  }, [reviews, tab, query, product, rating, sort]);

  const filtersOn = tab !== "all" || query || product !== "all" || rating;

  const resetFilters = () => {
    setTab("all");
    setQuery("");
    setProduct("all");
    setRating(0);
    setShown(PAGE_SIZE);
  };

  const change = (setter) => (value) => {
    setter(value);
    setShown(PAGE_SIZE);
  };

  const submitReport = (reason) => {
    reportReview(reporting.id, reason);
    setReporting(null);
    setNotice("Report sent. Our team will review it within 48 hours.");
    setTimeout(() => setNotice(""), 3600);
  };

  return (
    <section className="rvp">
      {/* ================= HEADER ================= */}
      <header className="rvp-top">
        <div>
          <h2>What customers say</h2>
          <p>
            Read every review of your products, reply to your customers and keep
            your rating strong. Replying to reviews builds trust with the next
            buyer.
          </p>
        </div>

        <Link to="/remaker-analytics" className="rvp-btn ghost">
          See analytics
        </Link>
      </header>

      {/* ================= SUMMARY ================= */}
      <ReviewsHero
        summary={summary}
        ratingFilter={rating}
        onRatingFilter={change(setRating)}
      />

      {/* ================= LIST + SIDE ================= */}
      <div className="rvp-layout">
        <div className="rvp-main">
          <ReviewToolbar
            tab={tab}
            onTab={change(setTab)}
            counts={counts}
            query={query}
            onQuery={change(setQuery)}
            product={product}
            onProduct={change(setProduct)}
            products={byProduct}
            sort={sort}
            onSort={setSort}
          />

          {rating > 0 && (
            <p className="rvp-filter-note">
              Showing {rating}-star reviews only.
              <button type="button" onClick={() => setRating(0)}>
                Clear
              </button>
            </p>
          )}

          {visible.length === 0 ? (
            <div className="rvp-empty">
              <div className="rvp-empty-art" aria-hidden="true">
                <img src="/images/portfolio/priya-bag.jpg" alt="" />
                <img src="/images/portfolio/arjun-lamp.jpg" alt="" />
              </div>
              <h3>{filtersOn ? "No reviews match" : "No reviews yet"}</h3>
              <p>
                {filtersOn
                  ? "Try a different filter, or clear your search."
                  : "When customers review your products, they appear here."}
              </p>
              {filtersOn && (
                <button
                  type="button"
                  className="rvp-btn ghost"
                  onClick={resetFilters}
                >
                  Show all reviews
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="rvp-list">
                {visible.slice(0, shown).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onReport={setReporting}
                  />
                ))}
              </div>

              <div className="rvp-more">
                <span>
                  Showing {Math.min(shown, visible.length)} of {visible.length}
                </span>
                {shown < visible.length && (
                  <button
                    type="button"
                    className="rvp-btn ghost"
                    onClick={() => setShown((value) => value + PAGE_SIZE)}
                  >
                    Show more reviews
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="rvp-side">
          <ProductRatings
            items={byProduct}
            active={product}
            onSelect={change(setProduct)}
          />

          <section className="rvp-side-card tips">
            <h3>Replying well</h3>
            <ol>
              <li>
                <strong>Thank first</strong>
                <small>
                  Even for a short review, a thank you goes a long way.
                </small>
              </li>
              <li>
                <strong>Stay calm on low ratings</strong>
                <small>
                  Offer to fix it. Future buyers read how you handle problems.
                </small>
              </li>
              <li>
                <strong>Be specific</strong>
                <small>
                  Mention the product or detail they liked, not a copy and
                  paste.
                </small>
              </li>
            </ol>
          </section>

          <section className="rvp-side-card cta">
            <h3>Want more reviews?</h3>
            <p>
              Add clear photos and a short story to each product. Customers who
              understand a piece write better reviews.
            </p>
            <Link to="/remaker-products" className="rvp-btn light">
              Improve my products
            </Link>
          </section>
        </aside>
      </div>

      {reporting && (
        <ReportReviewModal
          review={reporting}
          onSubmit={submitReport}
          onClose={() => setReporting(null)}
        />
      )}

      {notice && (
        <div className="rvp-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
