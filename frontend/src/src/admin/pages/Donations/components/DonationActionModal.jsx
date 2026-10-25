import React, { useEffect, useState } from "react";
import { X, AlertTriangle, CalendarClock, HeartHandshake } from "lucide-react";
import { ACTION_ICONS } from "../../../components/ui/actionIcons";
import { SLOTS, PARTNERS, NGOS, REJECT_CHIPS } from "../../../data/donationActions";
import { DEMO_TODAY } from "../../../utils/format";

const isoDay = (offset) => new Date(DEMO_TODAY.getTime() + offset * 86400000).toISOString().slice(0, 10);

/* Confirm modal that also asks for what the action needs:
   a pickup date + slot (accept / reschedule), a reason (reject) or an NGO (complete). */
export default function DonationActionModal({ action, targets = [], onConfirm, onClose }) {
  const [date, setDate] = useState(isoDay(2));
  const [slot, setSlot] = useState(SLOTS[0]);
  const [partner, setPartner] = useState(PARTNERS[0]);
  const [reason, setReason] = useState("");
  const [ngo, setNgo] = useState(NGOS[0]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!action) return undefined;
    setDate(isoDay(2)); setSlot(SLOTS[0]); setPartner(PARTNERS[0]); setReason(""); setNgo(NGOS[0]); setTouched(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [action, onClose]);

  if (!action) return null;
  const Icon = ACTION_ICONS[action.icon] || AlertTriangle;
  const many = targets.length > 1;
  const reasonMissing = action.fields === "reason" && reason.trim().length < 5;
  const dateMissing = action.fields === "schedule" && !date;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (reasonMissing || dateMissing) return;
    onConfirm({ date, slot, partner, reason: reason.trim(), ngo });
  };

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="dn-modal-title" onSubmit={submit}>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className={`ad-modal-icon tone-${action.tone}`}><Icon size={22} strokeWidth={1.7} /></div>
        <h3 id="dn-modal-title">{many ? action.title.replace(/this donation/, `${targets.length} donations`) : action.title}</h3>
        <p className="ad-modal-text">{action.body}</p>

        <div className="ad-modal-targets">
          {targets.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
          {targets.length > 3 && <span>+{targets.length - 3} more</span>}
        </div>

        {action.fields === "schedule" && (
          <div className="dn-fields">
            <label className="ad-modal-field">
              <span><CalendarClock size={13} /> Pickup date</span>
              <input type="date" value={date} min={isoDay(1)} onChange={(e) => setDate(e.target.value)} />
              {touched && dateMissing && <small className="ad-modal-error">Please choose a pickup date.</small>}
            </label>
            <label className="ad-modal-field">
              <span>Time slot</span>
              <select value={slot} onChange={(e) => setSlot(e.target.value)}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="ad-modal-field dn-wide">
              <span>Pickup team <em>(free for the donor)</em></span>
              <select value={partner} onChange={(e) => setPartner(e.target.value)}>{PARTNERS.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
          </div>
        )}

        {action.fields === "reason" && (
          <div className="ad-modal-field">
            <span>Reason <em>(shown to the donor)</em></span>
            <div className="dn-chips">
              {REJECT_CHIPS.map((c) => (
                <button key={c} type="button" className={reason === c ? "on" : ""} onClick={() => setReason(c)}>{c}</button>
              ))}
            </div>
            <textarea aria-label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item is too damaged to be reused" autoFocus />
            {touched && reasonMissing && <small className="ad-modal-error">Please add a short reason (at least 5 characters).</small>}
          </div>
        )}

        {action.fields === "ngo" && (
          <label className="ad-modal-field">
            <span><HeartHandshake size={13} /> Given to</span>
            <select value={ngo} onChange={(e) => setNgo(e.target.value)}>{NGOS.map((n) => <option key={n}>{n}</option>)}</select>
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
