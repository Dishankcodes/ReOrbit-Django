import React from "react";

import MyReviews from "../../../shared/components/MyReviews";
import "../../../user/css/shared/ui-base.css";

/* Reviews the signed-in admin wrote about what they bought as the platform. */
export default function AdminMyReviews() {
  return (
    <div className="dn">
      <MyReviews
        accent="#0e3a2d"
        orderPath={(id) => `/admin-shop/orders/${id}`}
      />
    </div>
  );
}
