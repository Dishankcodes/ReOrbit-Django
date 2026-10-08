import React, { useEffect, useRef } from "react";

import BeforeAfter from "./BeforeAfter";

export default function PortfolioDeleteModal({ work, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onCancel]);

  return (
    <div
      className="rpt-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="rpt-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rpt-del-title"
        aria-describedby="rpt-del-text"
        tabIndex={-1}
        ref={dialogRef}
      >
        <BeforeAfter before={work.before} after={work.after} className="rpt-modal-ba" />

        <h2 id="rpt-del-title">Delete &ldquo;{work.title}&rdquo;?</h2>
        <p id="rpt-del-text">
          This removes the work and both photos from your portfolio, and buyers will no longer see
          it on your profile. A product linked to it is not affected. You can undo right after.
        </p>

        <div className="rpt-modal-actions">
          <button type="button" className="rpt-btn danger" onClick={onConfirm}>
            Delete work
          </button>
          <button type="button" className="rpt-btn ghost" onClick={onCancel}>
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}
