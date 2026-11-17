import React from "react";
import ReviewsPanel from "../../Reviews/components/ReviewsPanel";

/* Reviews this member wrote (product and seller reviews kept apart), and below them the ones
   they received as a seller. */
export default function ReviewsTab({ user }) {
  return (
    <>
      <ReviewsPanel reviewer={user.user_id} title="Reviews written by this member" />
      <ReviewsPanel seller={user.user_id} title="Reviews this member received as a seller" />
    </>
  );
}
