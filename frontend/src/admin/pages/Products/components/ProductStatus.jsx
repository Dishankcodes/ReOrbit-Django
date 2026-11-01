import React from "react";
import StatusBadge from "../../../components/ui/StatusBadge";

/* Where the listing is in its journey (Listed, Reserved, Sold, ...). */
export default function ProductStatus({ product }) {
  return <StatusBadge status={product.rawStatus} />;
}
