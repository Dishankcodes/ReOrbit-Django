import React, { useEffect, useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";

/* Give or take away Orbit Points from one user, with a reason. */
export default function AdjustPointsModal({ row, onSave, onClose }) {
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!row) return undefined;
    setMode("add"); setAmount(""); setReason(""); setTouched(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [row, onClose]);

  if (!row) return null;
  const n = Number(amount);
  const tooMuch = mode === "deduct" && n > row.balance;
  const invalid = !(n > 0) || reason.trim().length < 5 || tooMuch;
  const after = mode === "add" ? row.balance + (n || 0) : row.balance - (n || 0);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    onSave(row.user.user_id, mode === "add" ? n : -n, reason.trim());
  };

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="rw-adj-title" onSubmit={submit}>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <h3 id="rw-adj-title">Adjust Orbit Points</h3>
        <div className="rw-adj-user">
          <UserAvatar name={row.user.full_name} src={row.user.profile.profile_image} size={40} rounded="12px" />
          <div><strong>{row.user.full_name}</strong><span>Balance {row.balance.toLocaleString("en-IN")} pts</span></div>
        </div>
        <div className="rw-seg" role="radiogroup" aria-label="Add or deduct">
          <button type="button" role="radio" aria-checked={mode === "add"} className={mode === "add" ? "on" : ""} onClick={() => setMode("add")}><Plus size={14} /> Add points</button>
          <button type="button" role="radio" aria-checked={mode === "deduct"} className={mode === "deduct" ? "on" : ""} onClick={() => setMode("deduct")}><Minus size={14} /> Deduct points</button>
        </div>
        <label className="ad-modal-field"><span>Points</span>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" autoFocus />
          {touched && !(n > 0) && <small className="ad-modal-error">Enter a number above 0.</small>}
          {tooMuch && <small className="ad-modal-error">The user only has {row.balance} points.</small>}
        </label>
        <label className="ad-modal-field"><span>Reason <em>(kept in the history)</em></span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goodwill for a delayed pickup" />
          {touched && reason.trim().length < 5 && <small className="ad-modal-error">Please add a short reason (at least 5 characters).</small>}
        </label>
        {n > 0 && !tooMuch && <p className="rw-adj-after">New balance: <strong>{after.toLocaleString("en-IN")} pts</strong></p>}
        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className={`ad-btn ${mode === "add" ? "ad-btn-primary" : "ad-btn-danger"}`}>{mode === "add" ? "Add points" : "Deduct points"}</button>
        </div>
      </form>
    </div>
  );
}
