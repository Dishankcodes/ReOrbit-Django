import React from "react";
import ReviewsPanel from "../../Reviews/components/ReviewsPanel";

/* What buyers said about this ReMaker: product reviews and seller reviews kept apart. */
export default function RemakerReviewsTab({ remaker }) {
  return <ReviewsPanel seller={remaker.remaker_id} title="Reviews this ReMaker received" />;
}
