import React from "react";
import { humanize } from "../../utils/format";

/* One badge for every status in the admin panel.
   The colour comes from the tone map, so Active / Verified /
   Completed all look "good", Blocked / Rejected / Failed all
   look "bad", and so on. */
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
  Stored: "good",
  /* waiting */
  Pending: "wait",
  Scheduled: "wait",
  Reserved: "wait",
  Requested: "wait",
  Assigned: "wait",
  Assigned: "wait",
  Suspended: "wait",
  Draft: "wait",
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
  In_Progress: "info",
  Sold: "info",
  Donated: "info",
  /* bad */
  Blocked: "bad",
  Rejected: "bad",
  Failed: "bad",
  Cancelled: "bad",
  /* neutral */
  Deleted: "neutral",
  Returned: "neutral",
  Refunded: "neutral",
  Inactive: "neutral",
  Released: "neutral",
  Released: "neutral",
  Paused: "wait",
  Open: "wait",
  Published: "good",
  Hidden: "neutral",
  Ended: "neutral",
  "On leave": "wait",
  Under_Review: "info",
  Dismissed: "neutral",
  Visible: "good",
  Removed: "bad",
  Live: "good",
  "Not live": "neutral",
  "Pending review": "wait",
  Sold_Out: "bad",
  Shipped: "info",
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
