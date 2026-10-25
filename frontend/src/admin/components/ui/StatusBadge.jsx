import React from "react";
import { humanize } from "../../utils/format";

/* One badge for every status in the admin panel.
   The colour comes from the tone map. */
const TONES = {
  /* good */
  Active: "good",
  Verified: "good",
  Completed: "good",
  Success: "good",
  Listed: "good",
  Resolved: "good",
  Passed: "good",
  Stored: "good",

  /* waiting */
  Pending: "wait",
  Scheduled: "wait",
  Reserved: "wait",
  Requested: "wait",
  Assigned: "wait",
  Suspended: "wait",
  Draft: "wait",
  Paused: "wait",

  /* in progress */
  Confirmed: "info",
  Earned: "good",
  Spent: "neutral",
  Invited: "info",
  Picked_Up: "info",
  Received: "info",
  Warehouse: "info",
  Refurbishment: "info",
  Reviewed: "info",
  In_Progress: "info",
  Sold: "info",
  Donated: "info",
  Shipped: "info",

  /* bad */
  Blocked: "bad",
  Disabled: "bad",
 
  Failed: "bad",
  Cancelled: "bad",
  Sold_Out: "bad",

  /* neutral */
  Deleted: "neutral",
  Returned: "neutral",
  Refunded: "neutral",
  Inactive: "neutral",
  Released: "neutral",
};

export default function StatusBadge({ status, dot = true, className = "" }) {
  const tone = TONES[status] || "neutral";

  return (
    <span className={`ad-badge ad-badge-${tone} ${className}`}>
      {dot && <i className="ad-badge-dot" />}
      {humanize(status)}
    </span>
  );
}
