import React from "react";
import { LISTING_STATUS } from "../../../data/listingsStore";

export function ListingBadge({ status }) {
  const meta = LISTING_STATUS[status] || LISTING_STATUS.Draft;
  return <span className={`dn-badge dn-badge--${meta.tone}`}>{meta.label}</span>;
}

const SALE_TONE = { Confirmed: "blue", Packed: "amber", Shipped: "violet", Delivered: "green" };
export function SaleBadge({ status }) {
  return <span className={`dn-badge dn-badge--${SALE_TONE[status] || "grey"}`}>{status}</span>;
}

const PAYOUT_TONE = { Pending: "amber", Processing: "blue", Paid: "green" };
export function PayoutBadge({ status }) {
  return <span className={`dn-badge dn-badge--${PAYOUT_TONE[status] || "grey"}`}>Payout {status.toLowerCase()}</span>;
}
