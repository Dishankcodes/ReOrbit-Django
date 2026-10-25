import React, { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { ACTION_ICONS } from "../../../components/ui/actionIcons";
import { DISMISS_CHIPS, REMOVE_CHIPS, warningTemplate } from "../../../data/complaintActions";
import { isActive } from "../../../data/complaintsStore";

/* Asks for what each decision needs: a reason, a warning message or an assignee.
   `complaints` is the list the action will be applied to (one, or a bulk selection). */
export default function ComplaintActionModal({ action, complaints = [], members = [], onConfirm, onClose }) {
  const first = complaints[0];
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [also, setAlso] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!action) return undefined;
    setReason(""); setAssigneeId(first?.assigneeId || members[0]?.id || ""); setAlso(true); setTouched(false);
    setMessage(action.fields === "warn" && first ? warningTemplate(first) : "");
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [action]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!action || !first) return null;
  const Icon = ACTION_ICONS[action.icon] || AlertTriangle;
  const many = complaints.length > 1;
  const reasonNeeded = action.fields === "dismiss" || action.fields === "reason";
  const reasonMissing = reasonNeeded && reason.trim().length < 5;
  const messageMissing = action.fields === "warn" && message.trim().length < 15;
  const others = !many ? first.others.filter(isActive) : [];
  const canAlso = others.length > 0 && ["dismiss", "warn", "reason"].includes(action.fields);
  const thing = first.type === "Review" ? "review" : first.type === "Product" ? "listing" : "account";
  const who = first.type === "Product" ? first.target.owner.name : first.type === "Review" ? first.target.reviewer : first.target.name;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (reasonMissing || messageMissing) return;
    const member = members.find((m) => m.id === assigneeId);
    onConfirm({ reason, message, assigneeId: assigneeId || null, assigneeName: member?.name, alsoResolve: canAlso && also });
  };

  const chips = action.fields === "dismiss" ? DISMISS_CHIPS : REMOVE_CHIPS;

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="cp-modal-title" onSubmit={submit}>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className={`ad-modal-icon tone-${action.tone}`}><Icon size={22} strokeWidth={1.7} /></div>
        <h3 id="cp-modal-title">{many ? action.title.replace(/this (complaint|account|listing|review)/, `${complaints.length} complaints`) : action.title}</h3>
        <p className="ad-modal-text">{action.body}</p>

        <div className="ad-modal-targets">
          {complaints.slice(0, 3).map((c) => <span key={c.id}>{c.id} · {c.target.name}</span>)}
          {complaints.length > 3 && <span>+{complaints.length - 3} more</span>}
        </div>

        {action.fields === "assign" && (
          <label className="ad-modal-field">
            <span>Assign to</span>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.roleLabel}</option>)}
              <option value="">Nobody (unassigned)</option>
            </select>
          </label>
        )}

        {action.fields === "warn" && (
          <label className="ad-modal-field">
            <span>Message to {who} <em>(they will see this)</em></span>
            <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />
            {touched && messageMissing && <small className="ad-modal-error">Please write a clear warning (at least 15 characters).</small>}
          </label>
        )}

        {reasonNeeded && (
          <div className="ad-modal-field">
            <span>{action.fields === "dismiss" ? "Why is this being dismissed?" : "Reason"} <em>({action.fields === "dismiss" ? "the reporter is told" : action.reasonHint})</em></span>
            <div className="dn-chips">
              {chips.map((c) => <button key={c} type="button" className={reason === c ? "on" : ""} onClick={() => setReason(c)}>{c}</button>)}
            </div>
            <textarea aria-label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a short note" autoFocus />
            {touched && reasonMissing && <small className="ad-modal-error">Please add a short reason (at least 5 characters).</small>}
          </div>
        )}

        {canAlso && (
          <label className="cp-also">
            <input type="checkbox" checked={also} onChange={(e) => setAlso(e.target.checked)} />
            <span>Also resolve the {others.length} other open complaint{others.length === 1 ? "" : "s"} about this {thing === "account" ? first.type.toLowerCase() : thing}</span>
          </label>
        )}

        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className={`ad-btn ad-btn-${action.tone === "positive" ? "primary" : action.tone}`}>{action.confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
