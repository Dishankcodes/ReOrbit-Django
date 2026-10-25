import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const STEPS = [
  "Contacting your bank",
  "Verifying the payment",
  "Placing your order",
];

/* Full-screen "processing / failed" layer while the fake payment runs. */
export default function PaymentOverlay({
  state,
  error,
  amount,
  onRetry,
  onChangeMethod,
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (state !== "processing") return undefined;
    setI(0);
    const t = setInterval(
      () => setI((n) => Math.min(n + 1, STEPS.length - 1)),
      700,
    );
    return () => clearInterval(t);
  }, [state]);
  if (!state) return null;
  return (
    <div
      className="sh-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sh-pay-title"
      aria-live="assertive"
    >
      <div className="sh-overlay-card">
        {state === "processing" ? (
          <>
            <span className="sh-spinner" aria-hidden="true" />
            <h3 id="sh-pay-title">Processing payment</h3>
            <p className="sh-overlay-amt">₹{amount.toLocaleString("en-IN")}</p>
            <ol className="sh-pay-steps">
              {STEPS.map((s, n) => (
                <li key={s} className={n < i ? "done" : n === i ? "now" : ""}>
                  {n < i ? <CheckCircle2 size={15} /> : <i />} {s}
                </li>
              ))}
            </ol>
            <small>
              <ShieldCheck size={13} /> Please do not close or refresh this
              page.
            </small>
          </>
        ) : (
          <>
            <span className="sh-fail-ico">
              <XCircle size={34} />
            </span>
            <h3 id="sh-pay-title">Payment failed</h3>
            <p>{error}</p>
            <p className="sh-overlay-note">
              No money was taken and your cart is safe.
            </p>
            <div className="sh-overlay-actions">
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                onClick={onChangeMethod}
              >
                Change method
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={onRetry}
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
