import React, { useEffect, useRef, useState } from "react";

import { REPORT_REASONS } from "../../../data/reviewsStore";

export default function ReportReviewModal({ review, onSubmit, onClose }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="rvp-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="rvp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rvp-report-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <h2 id="rvp-report-title">Report this review</h2>
        <p>
          Reviews are not removed just because they are negative. We only take down reviews that break our rules.
          Our team will look at it within 48 hours.
        </p>

        <blockquote>
          <strong>{review.reviewer.name}</strong>
          <span>{review.text}</span>
        </blockquote>

        <fieldset className="rvp-reasons">
          <legend>What is wrong with it?</legend>
          {REPORT_REASONS.map((item) => (
            <label className={reason === item ? "active" : ""} key={item}>
              <input type="radio" name="report-reason" checked={reason === item} onChange={() => setReason(item)} />
              <span className="rvp-radio" aria-hidden="true" />
              {item}
            </label>
          ))}
        </fieldset>

        <div className="rvp-modal-actions">
          <button type="button" className="rvp-btn primary" onClick={() => onSubmit(reason)}>
            Send report
          </button>
          <button type="button" className="rvp-btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
