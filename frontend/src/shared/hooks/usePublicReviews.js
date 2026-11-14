import { useEffect, useState } from "react";

import { publicReviewsApi, reviewReportApi } from "../../api/reviews";

/* Real, visible reviews for the public pages (nothing is stored in the browser).
   useProductReviews("LST-1001")          reviews of one product
   useSellerReviews("remaker", "RMK-…")   everything a member or ReMaker has received
   Each returns { reviews, summary, ready }. summary = { average, count, distribution }. */

const EMPTY = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
const cache = new Map(); // key -> { at, data }
const TTL = 60000;

const shape = (r) => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  rating: r.rating,
  text:
    [r.title, r.body].filter(Boolean).join(". ") ||
    "Rated without a written review.",
  date: String(r.date || "").slice(0, 10),
  photos: (r.photos || []).map((p) => p.url),
  product: r.product,
  reply: r.reply ? { text: r.reply.text, at: r.reply.created_at } : null,
});

function useFeed(key, load) {
  const [state, setState] = useState(() => cache.get(key)?.data || null);

  useEffect(() => {
    if (!key) return undefined;
    const hit = cache.get(key);
    setState(hit?.data || null);
    if (hit && Date.now() - hit.at < TTL) return undefined;
    let live = true;
    load()
      .then((data) => {
        const next = {
          summary: data.summary || EMPTY,
          reviews: (data.results || []).map(shape),
        };
        cache.set(key, { at: Date.now(), data: next });
        if (live) setState(next);
      })
      .catch(() => {
        if (live) setState((s) => s || { summary: EMPTY, reviews: [] });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    reviews: state?.reviews || [],
    summary: state?.summary || EMPTY,
    ready: !!state,
  };
}

export const useProductReviews = (ref) =>
  useFeed(ref ? `p:${ref}` : "", () => publicReviewsApi.forProduct(ref));

export const useSellerReviews = (type, id) =>
  useFeed(id ? `s:${type}:${id}` : "", () => publicReviewsApi.forSeller(type, id));

/* For <ReportButton file={...}>: sends the report to ReOrbit about this review. */
export const reviewReportFiler =
  (reviewId) =>
  ({ reason, description }) =>
    reviewReportApi.report(reviewId, reason, description);
