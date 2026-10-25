import React, { useEffect, useState } from "react";
import { X, FilePlus2 } from "lucide-react";
import { CATEGORIES, TARGET_TYPES, useComplaintTargets } from "../../../data/complaintsStore";

const ROLES = ["User", "ReMaker", "Staff", "Guest"];

/* For complaints that arrive by email, phone or from the pickup team. */
export default function LogComplaintModal({ open, onSave, onClose }) {
  const targets = useComplaintTargets();
  const [type, setType] = useState("User");
  const [targetId, setTargetId] = useState("");
  const [category, setCategory] = useState(CATEGORIES.User[0]);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterRole, setReporterRole] = useState("User");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setType("User"); setCategory(CATEGORIES.User[0]); setDescription(""); setReporterName(""); setReporterRole("User"); setTouched(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setTargetId(targets[type]?.[0]?.id || ""); setCategory(CATEGORIES[type][0]); }, [type, targets]);

  if (!open) return null;
  const descMissing = description.trim().length < 10;
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (descMissing || !targetId) return;
    onSave({ type, targetId, category, description: description.trim(), reporterName: reporterName.trim(), reporterRole });
  };

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal cp-log-modal" role="dialog" aria-modal="true" aria-labelledby="cp-log-title" onSubmit={submit}>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="ad-modal-icon tone-positive"><FilePlus2 size={22} strokeWidth={1.7} /></div>
        <h3 id="cp-log-title">Log a complaint</h3>
        <p className="ad-modal-text">Use this for complaints that came by email, phone or from your own team. Members can also report from the app.</p>

        <div className="cp-form">
          <label className="ad-modal-field"><span>What is being reported?</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>{TARGET_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <label className="ad-modal-field"><span>Reason</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES[type].map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="ad-modal-field cp-wide"><span>Which {type === "Product" ? "listing" : type === "Review" ? "review" : type.toLowerCase()}?</span>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>{(targets[type] || []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          </label>
          <label className="ad-modal-field cp-wide"><span>What happened?</span>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the problem in the reporter’s words" />
            {touched && descMissing && <small className="ad-modal-error">Please describe the problem (at least 10 characters).</small>}
          </label>
          <label className="ad-modal-field"><span>Reported by <em>(optional)</em></span>
            <input type="text" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Name of the reporter" />
          </label>
          <label className="ad-modal-field"><span>They are a</span>
            <select value={reporterRole} onChange={(e) => setReporterRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </label>
        </div>

        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn-primary">Log complaint</button>
        </div>
      </form>
    </div>
  );
}
