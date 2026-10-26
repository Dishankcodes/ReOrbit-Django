import React from "react";
import { STATUS_TONE } from "../../../data/ordersStore";

export function StatusBadge({ status }) {
  return <span className={`dn-badge dn-badge--${STATUS_TONE[status] || "grey"}`}>{status}</span>;
}

export function SellerTypeBadge({ remaker }) {
  return (
    <span className={`ob-type ${remaker ? "is-remaker" : ""}`}>
      {remaker ? "Verified ReMaker" : "Community seller"}
    </span>
  );
}
