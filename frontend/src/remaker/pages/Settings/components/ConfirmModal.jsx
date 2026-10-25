import React, { useEffect, useRef } from "react";

/* One confirm dialog used for sign out, unblock, delete and so on */
export default function ConfirmModal({ title, children, confirmLabel, cancelLabel = "Go back", tone = "primary", disabled = false, onConfirm, onClose }) {
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
    <div
      className="set-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="set-modal" role="alertdialog" aria-modal="true" aria-labelledby="set-modal-title" tabIndex={-1} ref={ref}>
        <h2 id="set-modal-title">{title}</h2>
        <div className="set-modal-body">{children}</div>

        <div className="set-modal-actions">
          <button type="button" className={`set-btn ${tone === "danger" ? "danger" : "primary"}`} onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </button>
          <button type="button" className="set-btn ghost" onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
