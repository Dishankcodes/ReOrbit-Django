import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const STEPS = ["Contacting your bank", "Verifying the payment", "Placing your order"];

/* Full-screen "processing / failed" layer while the fake payment runs. */
export default function PaymentOverlay({ state, error, amount, onRetry, onChangeMethod }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (state !== "processing") return undefined;
    setI(0);
    const timer = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 700);
    return () => clearInterval(timer);
  }, [state]);

  if (!state) return null;

  return (
    <div className="sp-overlay" role="alertdialog" aria-modal="true" aria-labelledby="sp-pay-title" aria-live="assertive">
      <div className="sp-overlay-card">
        {state === "processing" ? (
          <>
            <span className="sp-spinner" aria-hidden="true" />
            <h3 id="sp-pay-title">Processing payment</h3>
            <p className="sp-overlay-amt">₹{amount.toLocaleString("en-IN")}</p>
            <ol className="sp-pay-steps">
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
            <span className="sp-fail-ico"><XCircle size={34} /></span>
            <h3 id="sp-pay-title">Payment failed</h3>
            <p>{error}</p>
            <p className="sp-overlay-note">No money was taken and your cart is safe.</p>
            <div className="sp-overlay-actions">
              <button type="button" className="dn-btn dn-btn--ghost" onClick={onChangeMethod}>Change method</button>
              <button type="button" className="dn-btn" onClick={onRetry}>Try again</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
