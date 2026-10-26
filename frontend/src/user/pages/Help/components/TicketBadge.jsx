import React from "react";

const TONE = { Open: "amber", "In progress": "blue", Resolved: "green" };
export default function TicketBadge({ status }) {
  return <span className={`dn-badge dn-badge--${TONE[status] || "grey"}`}>{status}</span>;
}
