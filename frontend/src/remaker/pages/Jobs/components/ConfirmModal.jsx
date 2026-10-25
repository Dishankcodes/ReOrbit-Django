import React, { useEffect, useRef } from "react";

export default function ConfirmModal({ title, children, confirmLabel, cancelLabel = "Go back", tone = "primary", onConfirm, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    ref.current?.focus();

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
    <div className="rk-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="rk-modal" role="alertdialog" aria-modal="true" aria-labelledby="job-modal-title" tabIndex={-1} ref={ref}>
        <h2 id="job-modal-title">{title}</h2>
        <div className="rk-modal-body">{children}</div>

        <div className="rk-modal-actions">
          <button type="button" className={`rk-btn ${tone === "danger" ? "danger" : "primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="rk-btn ghost" onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
