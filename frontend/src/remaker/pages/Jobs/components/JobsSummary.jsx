import React from "react";

import { formatPrice } from "../../../data/remakerMarketplaceData";

export default function JobsSummary({ totals }) {
  return (
    <div className="job-summary">
      <article className="strong">
        <small>Paid from jobs</small>
        <strong>{formatPrice(totals.paid)}</strong>
        <span>{totals.done} completed {totals.done === 1 ? "job" : "jobs"}</span>
      </article>
      <article>
        <small>In quality review</small>
        <strong>{formatPrice(totals.review)}</strong>
        <span>Paid when the check passes</span>
      </article>
      <article>
        <small>Jobs you are working on</small>
        <strong>{totals.active}</strong>
        <span>Assigned or in progress</span>
      </article>
    </div>
  );
}
