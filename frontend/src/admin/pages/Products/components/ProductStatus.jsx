import React from "react";
import StatusBadge from "../../../components/ui/StatusBadge";

/* Items show review status (Pending / Rejected) first, otherwise where
   they are in their journey. ReMaker products show their listing status. */
export default function ProductStatus({ product }) {
  if (product.type === "item" && ["Pending", "Rejected"].includes(product.verification)) {
    return <StatusBadge status={product.verification} />;
  }
  return <StatusBadge status={product.rawStatus} />;
}
