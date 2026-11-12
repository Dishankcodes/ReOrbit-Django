import React from "react";

import MyReviews from "../../../shared/components/MyReviews";
import "../../css/ReMakerOrders.css";

/* Reviews this ReMaker wrote about what they bought. (Reviews customers left for them are on "Reviews".) */
export default function ReMakerMyReviews() {
  return (
    <section className="rod rsl">
      <MyReviews accent="#421517" orderPath={(id) => `/remaker-orders/${id}`} />
    </section>
  );
}
