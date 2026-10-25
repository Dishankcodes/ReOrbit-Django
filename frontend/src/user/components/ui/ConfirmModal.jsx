import React, { useEffect } from "react";

/* Generic confirmation dialog. `children` is the body (reasons, fields…). */
export default function ConfirmModal({
  icon: Icon,
  title,
  confirmLabel,
  cancelLabel = "Keep it",
  tone = "danger",
  disabled = false,
  onConfirm,
  onClose,
  children,
}) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dn-modal-wrap" onMouseDown={onClose} role="presentation">
      <div
        className="dn-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {Icon && (
          <span className="dn-modal-icon">
            <Icon size={24} />
          </span>
        )}
        <h3>{title}</h3>
        <div className="dn-modal-body">{children}</div>
        <div className="dn-modal-actions">
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`dn-btn ${tone === "danger" ? "dn-btn--danger-solid" : ""}`}
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
