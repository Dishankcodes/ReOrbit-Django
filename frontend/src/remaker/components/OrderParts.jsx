import React, { useEffect, useRef, useState } from "react";

import {
  buildTimeline,
  describeStatus,
  flowOf,
  formatDateTime,
  stageIndex,
} from "../data/ordersStore";

import "../css/ReMakerOrders.css";

export function StatusBadge({ order }) {
  const status = describeStatus(order);

  return <span className={`rod-badge ${status.tone}`}>{status.label}</span>;
}

/* Thin progress bar for lists and detail pages */
export function MiniProgress({ order }) {
  const flow = flowOf(order);
  const index = stageIndex(order);
  const status = describeStatus(order);

  let percent = (index / (flow.length - 1)) * 100;
  if (order.status === "Pending") percent = 6;
  if (order.status === "Cancelled" || order.status === "Returned") percent = 100;

  return (
    <div
      className={`rod-progress ${status.tone}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label={`Order progress: ${status.label}`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

/* Vertical timeline. `compact` shows only the latest few steps. */
export function Timeline({ order, compact = false }) {
  let steps = buildTimeline(order);

  if (compact) {
    const doneOrCurrent = steps.filter((step) => step.state !== "upcoming");
    steps = doneOrCurrent.slice(-3).reverse();
  }

  return (
    <ol className={`rod-timeline ${compact ? "compact" : ""}`}>
      {steps.map((step) => (
        <li className={step.state} key={step.key}>
          <span className="rod-dot" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            <small>
              {step.time
                ? formatDateTime(step.time)
                : step.state === "upcoming"
                  ? "Expected next"
                  : ""}
            </small>
            {!compact && <p>{step.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* Confirm cancel with a reason */
const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Seller is taking too long",
  "No longer need it",
  "Other",
];

export function CancelModal({ order, onConfirm, onClose }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
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

  const refundable = order.payment.method !== "COD";

  return (
    <div
      className="rod-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="rod-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rod-cancel-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="rod-modal-item">
          <img src={order.image} alt="" />
          <div>
            <small>{order.id}</small>
            <strong>{order.title}</strong>
          </div>
        </div>

        <h2 id="rod-cancel-title">Cancel this order?</h2>
        <p>
          {refundable
            ? "You will get a full refund to your original payment method within 3 to 5 days."
            : "You have not been charged, so there is nothing to refund."}
        </p>

        <fieldset className="rod-reasons">
          <legend>Why are you cancelling?</legend>
          {CANCEL_REASONS.map((item) => (
            <label className={reason === item ? "active" : ""} key={item}>
              <input
                type="radio"
                name="cancel-reason"
                checked={reason === item}
                onChange={() => setReason(item)}
              />
              <span className="rod-radio" aria-hidden="true" />
              {item}
            </label>
          ))}
        </fieldset>

        <div className="rod-modal-actions">
          <button type="button" className="rod-btn danger" onClick={() => onConfirm(reason)}>
            Cancel order
          </button>
          <button type="button" className="rod-btn ghost" onClick={onClose}>
            Keep my order
          </button>
        </div>
      </div>
    </div>
  );
}
