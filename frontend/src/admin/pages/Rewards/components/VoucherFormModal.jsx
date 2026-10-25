import React, { useEffect, useState } from "react";
import { X, Wand2, Coins, Ticket } from "lucide-react";
import { AUDIENCES } from "../../../data/rewardsData";
import { codeTaken } from "../../../data/rewardsStore";
import { DEMO_TODAY } from "../../../utils/format";

const todayISO = () => DEMO_TODAY.toISOString().slice(0, 10);
const addDays = (n) => new Date(DEMO_TODAY.getTime() + n * 86400000).toISOString().slice(0, 10);
const EMPTY = () => ({ kind: "code", title: "", description: "", code: "", discount_type: "percent", value: 10, min_order: 499, max_discount: 200, points_cost: 500, usage_limit: 500, per_user: 1, audience: "Everyone", valid_from: todayISO(), valid_to: addDays(30) });
const randomCode = () => `ORB${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(10 + Math.random() * 89)}`;

/* Create or edit a voucher / coupon. */
export default function VoucherFormModal({ open, voucher, onSave, onClose }) {
  const [f, setF] = useState(EMPTY());
  const [errors, setErrors] = useState({});
  const editing = !!voucher;

  useEffect(() => {
    if (!open) return undefined;
    setF(voucher ? { ...EMPTY(), ...voucher } : EMPTY());
    setErrors({});
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, voucher]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const set = (k, v) => { setF((cur) => ({ ...cur, [k]: v })); setErrors((cur) => (cur[k] ? { ...cur, [k]: undefined } : cur)); };
  const num = (k) => (e) => set(k, e.target.value === "" ? "" : Number(e.target.value));
  const isPoints = f.kind === "points";
  const isPercent = f.discount_type === "percent";

  const validate = () => {
    const e = {};
    if (f.title.trim().length < 3) e.title = "Give it a short name (3+ characters).";
    const code = f.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(code)) e.code = "4 to 16 letters or numbers, no spaces.";
    else if (codeTaken(code, voucher?.id)) e.code = "This code is already in use.";
    if (f.value === "" || Number.isNaN(Number(f.value)) || Number(f.value) < 0) e.value = "Enter a value.";
    if (isPercent && (f.value < 1 || f.value > 90)) e.value = "Percent must be between 1 and 90.";
    if (!isPercent && f.value === 0 && !isPoints) e.value = "Enter an amount above 0.";
    if (isPoints && !(f.points_cost > 0)) e.points_cost = "Set how many points it costs.";
    if (!(f.usage_limit >= 1)) e.usage_limit = "At least 1.";
    if (!(f.per_user >= 1)) e.per_user = "At least 1.";
    if (!f.valid_from || !f.valid_to) e.valid_to = "Choose both dates.";
    else if (f.valid_to < f.valid_from) e.valid_to = "End date is before the start date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (asDraft) => (ev) => {
    ev.preventDefault();
    if (!asDraft && !validate()) return;
    if (asDraft && f.title.trim().length < 3) { setErrors({ title: "Give it a name before saving a draft." }); return; }
    onSave({ ...f, code: f.code.trim().toUpperCase() || randomCode(), title: f.title.trim(), description: f.description.trim(), draft: asDraft, points_cost: isPoints ? f.points_cost : 0, max_discount: isPercent ? f.max_discount : f.value }, !!voucher);
  };

  const Err = ({ k }) => (errors[k] ? <small className="ad-modal-error">{errors[k]}</small> : null);

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal rw-modal" role="dialog" aria-modal="true" aria-labelledby="rw-form-title" onSubmit={submit(false)} noValidate>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <h3 id="rw-form-title">{editing ? "Edit voucher" : "Create voucher or coupon"}</h3>
        <p className="ad-modal-text">{editing ? `Changes apply right away to ${voucher.code}.` : "Set the offer, who can use it and for how long."}</p>

        <div className="rw-kind" role="radiogroup" aria-label="How users get it">
          <button type="button" role="radio" aria-checked={!isPoints} className={!isPoints ? "on" : ""} onClick={() => set("kind", "code")}>
            <Ticket size={18} /><span><strong>Public coupon code</strong><small>Anyone eligible can type the code at checkout.</small></span>
          </button>
          <button type="button" role="radio" aria-checked={isPoints} className={isPoints ? "on" : ""} onClick={() => set("kind", "points")}>
            <Coins size={18} /><span><strong>Spend Orbit Points</strong><small>Users redeem it from their points balance.</small></span>
          </button>
        </div>

        <div className="rw-grid">
          <label className="ad-modal-field rw-wide"><span>Name</span>
            <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Diwali Green Sale" maxLength={50} /><Err k="title" /></label>
          <label className="ad-modal-field rw-wide"><span>Description <em>(shown to users)</em></span>
            <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. 15% off all upcycled products" maxLength={90} /></label>

          <label className="ad-modal-field"><span>Code</span>
            <div className="rw-code-row">
              <input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="DIWALI15" maxLength={16} />
              <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => set("code", randomCode())} title="Generate a code"><Wand2 size={14} /></button>
            </div><Err k="code" /></label>
          <label className="ad-modal-field"><span>Who can use it</span>
            <select value={f.audience} onChange={(e) => set("audience", e.target.value)}>{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select></label>

          <label className="ad-modal-field"><span>Discount type</span>
            <select value={f.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
              <option value="percent">Percent off</option><option value="fixed">Fixed amount off (₹)</option></select></label>
          <label className="ad-modal-field"><span>{isPercent ? "Percent off" : "Amount off (₹)"}</span>
            <input type="number" min="0" value={f.value} onChange={num("value")} /><Err k="value" /></label>

          <label className="ad-modal-field"><span>Minimum order (₹)</span>
            <input type="number" min="0" value={f.min_order} onChange={num("min_order")} /></label>
          {isPercent ? (
            <label className="ad-modal-field"><span>Maximum discount (₹)</span>
              <input type="number" min="0" value={f.max_discount} onChange={num("max_discount")} /></label>
          ) : <div />}

          {isPoints && (
            <label className="ad-modal-field rw-wide"><span>Cost in Orbit Points</span>
              <input type="number" min="1" value={f.points_cost} onChange={num("points_cost")} /><Err k="points_cost" /></label>
          )}

          <label className="ad-modal-field"><span>Total uses allowed</span>
            <input type="number" min="1" value={f.usage_limit} onChange={num("usage_limit")} /><Err k="usage_limit" /></label>
          <label className="ad-modal-field"><span>Uses per user</span>
            <input type="number" min="1" value={f.per_user} onChange={num("per_user")} /><Err k="per_user" /></label>

          <label className="ad-modal-field"><span>Valid from</span>
            <input type="date" value={f.valid_from} onChange={(e) => set("valid_from", e.target.value)} /></label>
          <label className="ad-modal-field"><span>Valid until</span>
            <input type="date" value={f.valid_to} min={f.valid_from} onChange={(e) => set("valid_to", e.target.value)} /><Err k="valid_to" /></label>
        </div>

        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          {(!editing || voucher.draft) && <button type="button" className="ad-btn ad-btn-ghost" onClick={submit(true)}>Save as draft</button>}
          <button type="submit" className="ad-btn ad-btn-primary">{editing && !voucher.draft ? "Save changes" : "Publish voucher"}</button>
        </div>
      </form>
    </div>
  );
}
