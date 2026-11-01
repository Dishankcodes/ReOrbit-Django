/* =========================================================
   Shared › ReportButton
   A small "Report" button that opens a form. The report goes to
   Admin › Complaints. Used on listings, seller and ReMaker pages and reviews.
   Props:
     type     "User" | "ReMaker" | "Product" | "Review"
     target   what is reported: { name, sub, image, ownerName, ... }
     file     the filer from useUserComplaintFiler / useRemakerComplaintFiler
   ========================================================= */

import { useEffect, useRef, useState } from "react";
import { Flag, X, CheckCircle2 } from "lucide-react";
import { CATEGORIES } from "../../admin/data/complaintsStore";
import "./ReportButton.css";

const NOUN = { User: "this seller", ReMaker: "this ReMaker", Product: "this listing", Review: "this review" };

export default function ReportButton({ type, target, file, label = "Report", className = "", iconOnly = false }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CATEGORIES[type][0]);
  const [details, setDetails] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  const start = () => { setReason(CATEGORIES[type][0]); setDetails(""); setTouched(false); setSent(false); setOpen(true); };
  const tooShort = details.trim().length < 10;
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (tooShort) return;
    file({ type, reason, description: `${reason}. ${details.trim()}`, ...target });
    setSent(true);
  };

  return (
    <>
      <button type="button" className={`rb-trigger ${className}`} onClick={start} aria-label={iconOnly ? `${label} ${NOUN[type]}` : undefined}>
        <Flag size={14} /> {!iconOnly && label}
      </button>
      {open && (
        <div className="rb-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="rb-modal" role="dialog" aria-modal="true" aria-labelledby="rb-title" tabIndex={-1} ref={ref}>
            <button type="button" data-safe className="rb-close" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
            {sent ? (
              <div className="rb-done">
                <CheckCircle2 size={34} />
                <h3>Thanks, we got your report</h3>
                <p>Our team will look into {NOUN[type]} and take action if it breaks our rules. You won’t be named to them.</p>
                <button type="button" data-safe className="rb-btn primary" onClick={() => setOpen(false)}>Done</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 id="rb-title">Report {NOUN[type]}</h3>
                <p className="rb-sub">{target.name}</p>
                <label className="rb-field"><span>What’s wrong?</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {CATEGORIES[type].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="rb-field"><span>Tell us what happened</span>
                  <textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Share what you saw. Facts help us act faster." maxLength={600} />
                  {touched && tooShort && <small className="rb-error">Please write at least 10 characters.</small>}
                </label>
                <div className="rb-actions">
                  <button type="button" data-safe className="rb-btn" onClick={() => setOpen(false)}>Cancel</button>
                  <button type="submit" data-safe className="rb-btn primary">Send report</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
