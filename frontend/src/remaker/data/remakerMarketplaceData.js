/* =========================================================
   Small helpers the ReMaker screens share.
   (The old sample marketplace that used to live here is gone: every listing, seller and
   review now comes from the server.)
   ========================================================= */

import { formatPrice } from "../../data/marketplaceData";

export { formatPrice };

/* reviews [{ rating }] -> { average, count, distribution: {1..5} } */
export function summarizeReviews(reviews = []) {
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution,
    };
  }

  let validRatingCount = 0;
  let totalRating = 0;

  reviews.forEach((review) => {
    const rating = Number(review?.rating);

    if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
      const roundedRating = Math.round(rating);

      distribution[roundedRating] += 1;

      totalRating += rating;
      validRatingCount += 1;
    }
  });

  const average =
    validRatingCount > 0
      ? Number((totalRating / validRatingCount).toFixed(1))
      : 0;

  return {
    average,
    count: validRatingCount,
    distribution,
  };
}
