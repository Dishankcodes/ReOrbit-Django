import React from "react";

import MyReviews from "../../../shared/components/MyReviews";
import "../../css/shared/ui-base.css";

/* Reviews I wrote about what I bought, and the sellers who sent it. */
export default function UserReviews() {
  return (
    <div className="dn">
      <MyReviews accent="#2a4d3a" orderPath={(id) => `/user-orders/${id}`} />
    </div>
  );
}
