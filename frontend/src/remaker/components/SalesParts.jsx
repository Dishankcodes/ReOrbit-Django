import React, { useEffect, useRef, useState } from "react";

import {
  EARNING_TONE,
  buildSaleTimeline,
  describeSale,
  earningStatus,
  stepIndex,
  stepsOf,
} from "../data/salesStore";
import { formatDateTime } from "../data/ordersStore";

import "../css/ReMakerOrders.css";
import "../css/ReMakerSales.css";

export function SaleBadge({ order }) {
  const status = describeSale(order);

  return <span className={`rod-badge ${status.tone}`}>{status.label}</span>;
}

export function EarningBadge({ order, payouts }) {
  const status = earningStatus(order, payouts);

  return <span className={`sls-earn ${EARNING_TONE[status]}`}>{status}</span>;
}

export function SaleProgress({ order }) {
  const steps = stepsOf(order);
  const status = describeSale(order);
  let percent = (stepIndex(order) / (steps.length - 1)) * 100;

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

export function SaleTimeline({ order }) {
  const steps = buildSaleTimeline(order);

  return (
    <ol className="rod-timeline">
      {steps.map((step) => (
        <li className={step.state} key={step.key}>
          <span className="rod-dot" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            <small>
              {step.time ? formatDateTime(step.time) : step.state === "upcoming" ? "Expected next" : ""}
            </small>
            {step.note && <p>{step.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* One confirm dialog for every seller action. Pass `reasons` to ask why. */
export function ActionModal({
  title,
  text,
  confirmLabel,
  cancelLabel = "Go back",
  tone = "primary",
  reasons = null,
  thumb = "",
  thumbLabel = "",
  thumbTitle = "",
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState(reasons ? reasons[0] : "");
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
      className="rod-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="rod-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sls-modal-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        {thumb && (
          <div className="rod-modal-item">
            <img src={thumb} alt="" />
            <div>
              <small>{thumbLabel}</small>
              <strong>{thumbTitle}</strong>
            </div>
          </div>
        )}

        <h2 id="sls-modal-title">{title}</h2>
        {text && <p>{text}</p>}

        {reasons && (
          <fieldset className="rod-reasons">
            <legend>Reason</legend>
            {reasons.map((item) => (
              <label className={reason === item ? "active" : ""} key={item}>
                <input
                  type="radio"
                  name="sls-reason"
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                <span className="rod-radio" aria-hidden="true" />
                {item}
              </label>
            ))}
          </fieldset>
        )}

        <div className="rod-modal-actions">
          <button
            type="button"
            className={`rod-btn ${tone === "danger" ? "danger" : "primary"}`}
            onClick={() => onConfirm(reason)}
          >
            {confirmLabel}
          </button>
          <button type="button" className="rod-btn ghost" onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
