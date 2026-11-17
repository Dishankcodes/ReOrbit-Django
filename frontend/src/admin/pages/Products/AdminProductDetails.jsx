import React from "react";
import { useParams } from "react-router-dom";

import AdminProductDetailsLive from "./AdminProductDetailsLive";
import AdminListingDetailLive from "./AdminListingDetailLive";
import AdminNotFound from "../States/AdminNotFound";
import ReviewsPanel from "../Reviews/components/ReviewsPanel";

/* Every product on the marketplace is real data: ReMaker (RPR-…), ReOrbit store (ADI-…) and
   member listings (LST-…). Under each one: what buyers said about it. Anything else is not a product. */
export default function AdminProductDetails() {
  const { productId = "" } = useParams();
  const id = productId.toUpperCase();
  if (!/^(LST|RPR|ADI)-/.test(id)) return <AdminNotFound />;
  return (
    <>
      {id.startsWith("LST-") ? <AdminListingDetailLive /> : <AdminProductDetailsLive />}
      <div className="arv-under-product">
        <ReviewsPanel product={id} title="Reviews of this product" />
      </div>
    </>
  );
}
