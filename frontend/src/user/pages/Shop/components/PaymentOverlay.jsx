import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const STEPS = ["Holding your items", "Opening secure payment", "Confirming your order"];

/* Full-screen "processing / failed" layer while the fake payment runs. */
export default function PaymentOverlay({ state, error, amount, onRetry, onChangeMethod }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (state !== "processing") return undefined;
    setI(0);
    const timer = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 700);
    return () => clearInterval(timer);
  }, [state]);

  if (!state || state === "paying") return null; /* Razorpay's own window is on screen */

  return (
    <div className="ushp-overlay" role="alertdialog" aria-modal="true" aria-labelledby="ushp-pay-title" aria-live="assertive">
      <div className="ushp-overlay-card">
        {state === "processing" ? (
          <>
            <span className="ushp-spinner" aria-hidden="true" />
            <h3 id="ushp-pay-title">Placing your order</h3>
            <p className="ushp-overlay-amt">₹{amount.toLocaleString("en-IN")}</p>
            <ol className="ushp-pay-steps">
              {STEPS.map((step, n) => (
                <li key={step} className={n < i ? "done" : n === i ? "now" : ""}>
                  {n < i ? <CheckCircle2 size={15} /> : <i />} {step}
                </li>
              ))}
            </ol>
            <small><ShieldCheck size={13} /> Please do not close or refresh this page.</small>
          </>
        ) : (
          <>
            <span className="ushp-fail-ico"><XCircle size={34} /></span>
            <h3 id="ushp-pay-title">We couldn't complete this</h3>
            <p>{error}</p>
            <p className="ushp-overlay-note">Your cart is safe. Money is only taken after a successful payment, and any wrongly taken payment is refunded automatically.</p>
            <div className="ushp-overlay-actions">
              <button type="button" className="dn-btn dn-btn--ghost" onClick={onChangeMethod}>Change method</button>
              <button type="button" className="dn-btn" onClick={onRetry}>Try again</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
