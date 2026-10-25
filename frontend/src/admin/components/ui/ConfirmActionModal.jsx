import React, { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ACTION_ICONS } from "./actionIcons";

/* Asks the admin to confirm an account action.
   - `targets` is a list of names so the same modal works for one
     person or a bulk selection.
   - Suspend / Block / Delete require a short reason. */
export default function ConfirmActionModal({
  action,
  targets = [],
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!action) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [action, onClose]);

  if (!action) return null;

  const Icon = ACTION_ICONS[action.icon] || AlertTriangle;
  const reasonMissing = action.needsReason && reason.trim().length < 5;
  const many = targets.length > 1;

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (reasonMissing) return;
    onConfirm(reason.trim());
  };

  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-modal-title"
        onSubmit={submit}
      >
        <button
          type="button"
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className={`ad-modal-icon tone-${action.tone}`}>
          <Icon size={22} strokeWidth={1.7} />
        </div>

        <h3 id="ad-modal-title">
          {many
            ? action.title.replace(
                /this (deleted account|account|order|item|product)/,
                `${targets.length} $1s`,
              )
            : action.title}
        </h3>
        <p className="ad-modal-text">{action.body}</p>

        <div className="ad-modal-targets">
          {targets.slice(0, 3).map((name) => (
            <span key={name}>{name}</span>
          ))}
          {targets.length > 3 && <span>+{targets.length - 3} more</span>}
        </div>

        {action.needsReason && (
          <label className="ad-modal-field">
            <span>
              Reason{" "}
              <em>({action.reasonHint || "shown in the account history"})</em>
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                action.placeholder ||
                "e.g. Repeated complaints about misleading item condition"
              }
              autoFocus
            />
            {touched && reasonMissing && (
              <small className="ad-modal-error">
                Please add a short reason (at least 5 characters).
              </small>
            )}
          </label>
        )}

        <div className="ad-modal-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`ad-btn ad-btn-${action.tone === "positive" ? "primary" : action.tone}`}
          >
            {action.tone === "positive" && <CheckCircle2 size={15} />}
            {action.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
