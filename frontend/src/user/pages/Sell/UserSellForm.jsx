import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Image as ImageIcon, Loader2, MapPin, Package, ShieldAlert, Info } from "lucide-react";

import {
  PICKUP_OPTIONS,
  SELL_CATEGORIES,
  SELL_CONDITIONS,
  SELLER,
  saveListing,
  useListing,
} from "../../data/listingsStore";
import { formatPrice } from "../../../data/marketplaceData";
import { checkPincode } from "../../data/donationsStore";
import Crumbs from "../../components/ui/Crumbs";
import PhotoUploader from "../../components/ui/PhotoUploader";
import EmptyState from "../../components/ui/EmptyState";
import EarningsPreview, { earningsFor } from "./components/EarningsPreview";

import "../../css/shared/ui-base.css";
import "../../css/sell/sell-base.css";
import "../../css/sell/UserSellForm.css";

const STEPS = [
  { label: "Item details", icon: Package },
  { label: "Photos & pickup", icon: ImageIcon },
  { label: "Review", icon: ClipboardCheck },
];

const blank = {
  title: "", category: "", description: "", condition: "", quantity: 1, price: "",
  images: [], city: SELLER.city, pincode: SELLER.pincode, pickup: "self", agree: false,
};

const toForm = (l) => ({
  title: l.title, category: l.category, description: l.description, condition: l.condition,
  quantity: l.quantity, price: String(l.price),
  images: l.images.map((url, i) => ({ id: `img-${i}`, url, name: `Photo ${i + 1}` })),
  city: l.city, pincode: l.pincode, pickup: l.pickup, agree: false,
});

export default function UserSellForm() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const existing = useListing(listingId || "");
  const editing = Boolean(listingId);
  const topRef = useRef(null);

  const [form, setForm] = useState(() => (existing ? toForm(existing) : blank));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  /* if the listing arrives after the first render, fill the form once */
  const filled = useRef(Boolean(existing));
  useEffect(() => {
    if (existing && !filled.current) { setForm(toForm(existing)); filled.current = true; }
  }, [existing]);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [step]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const pin = checkPincode(form.pincode);
  const price = Number(form.price);
  const earn = useMemo(() => earningsFor(price, form.pickup, form.quantity), [price, form.pickup, form.quantity]);

  if (editing && !existing) {
    return (
      <div className="dn">
        <EmptyState icon={Package} title="We couldn't find that listing" text="It may have been deleted." actionLabel="Back to my listings" to="/user-sell" />
      </div>
    );
  }
  if (editing && ["Sold", "Reserved"].includes(existing.status)) {
    return (
      <div className="dn">
        <EmptyState icon={Package} title="This listing can't be edited" text="It has an order attached. Finish the sale first." actionLabel="Open listing" to={`/user-sell/${existing.id}`} />
      </div>
    );
  }

  const validate = (index) => {
    const e = {};
    if (index === 0) {
      if (!form.category) e.category = "Choose a category.";
      if (form.title.trim().length < 4) e.title = "Give your item a clear name (at least 4 characters).";
      if (form.description.trim().length < 20) e.description = "Describe the item in at least 20 characters. Mention size, age and any flaws.";
      if (!form.condition) e.condition = "Select the condition.";
      if (!(price >= 50)) e.price = "Enter a price of at least ₹50.";
      else if (price > 200000) e.price = "Prices above ₹2,00,000 need manual approval. Contact support.";
      if (form.quantity < 1) e.quantity = "Quantity must be at least 1.";
    }
    if (index === 1) {
      if (form.images.length < 1) e.images = "Add at least one photo.";
      if (!pin.valid) e.pincode = "Enter a valid 6-digit pincode.";
      else if (!pin.serviceable) e.pincode = "We don't serve this pincode yet.";
      if (form.city.trim().length < 2) e.city = "Enter your city.";
    }
    if (index === 2 && !form.agree) e.agree = "Please confirm before submitting.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(2, s + 1)); };

  const payload = () => ({ ...form, images: form.images.map((i) => i.url), price });

  const submit = (asDraft = false) => {
    if (!asDraft && !validate(2)) return;
    if (asDraft && form.title.trim().length < 3) { setErrors({ title: "Add a name before saving a draft." }); setStep(0); return; }
    setBusy(true);
    window.setTimeout(() => {
      const saved = saveListing(payload(), { submit: !asDraft, id: editing ? listingId : null });
      navigate(`/user-sell/${saved.id}`, { replace: true, state: { just: asDraft ? "draft" : editing ? "updated" : "submitted" } });
    }, 700);
  };

  const field = (key, label, el, hint) => (
    <label className="dn-field">
      <span className="dn-label">{label} <em>*</em></span>
      {el}
      {hint && !errors[key] && <span className="dn-hint">{hint}</span>}
      {errors[key] && <span className="dn-error">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="dn sl sl-form" ref={topRef}>
      <Crumbs items={[{ label: "Sell", to: "/user-sell" }, { label: editing ? `Edit ${existing.id}` : "Sell an item" }]} />

      <header className="sl-head">
        <div>
          <span className="dn-eyebrow">{editing ? "Edit listing" : "New listing"}</span>
          <h1>{editing ? "Update your listing" : "Sell an item"}</h1>
          <p className="dn-muted">
            {editing && existing.status === "Live"
              ? "Changes to a live listing show on the marketplace straight away."
              : "Good photos and an honest description sell faster."}
          </p>
        </div>
        <button type="button" className="dn-btn dn-btn--ghost" onClick={() => submit(true)} disabled={busy}>Save as draft</button>
      </header>

      <ol className="sl-stepper" aria-label="Listing steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className={i < step ? "done" : i === step ? "now" : ""}>
              <button type="button" disabled={i >= step} onClick={() => { setErrors({}); setStep(i); }}>
                <span>{i < step ? <Check size={16} /> : <Icon size={16} />}</span>
                <b><small>Step {i + 1}</small>{s.label}</b>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="sl-form-grid">
        <section className="dn-card sl-form-card">
          {step === 0 && (
            <div className="sl-fields">
              <div className="dn-field">
                <span className="dn-label">Category <em>*</em></span>
                <div className="sl-chips" role="radiogroup" aria-label="Category">
                  {SELL_CATEGORIES.map((c) => (
                    <button type="button" key={c} role="radio" aria-checked={form.category === c} className={form.category === c ? "on" : ""} onClick={() => set("category", c)}>{c}</button>
                  ))}
                </div>
                {errors.category && <span className="dn-error">{errors.category}</span>}
              </div>

              {field("title", "Item name", <input className={`dn-input ${errors.title ? "is-error" : ""}`} value={form.title} maxLength={70} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Solid teak writing desk" />)}
              {field("description", "Description", <textarea className={`dn-textarea ${errors.description ? "is-error" : ""}`} value={form.description} maxLength={600} onChange={(e) => set("description", e.target.value)} placeholder="Size, material, age, what's included, any flaws…" />, `${form.description.length}/600`)}

              <div className="dn-field">
                <span className="dn-label">Condition <em>*</em></span>
                <div className="sl-conds" role="radiogroup" aria-label="Condition">
                  {SELL_CONDITIONS.map((c) => (
                    <button type="button" key={c.id} role="radio" aria-checked={form.condition === c.id} className={form.condition === c.id ? "on" : ""} onClick={() => set("condition", c.id)}>
                      <strong>{c.id}</strong><small>{c.help}</small>
                    </button>
                  ))}
                </div>
                {errors.condition && <span className="dn-error">{errors.condition}</span>}
              </div>

              <div className="sl-two">
                {field("price", "Price (₹)", <input className={`dn-input ${errors.price ? "is-error" : ""}`} inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="e.g. 2500" />, "Set a fair price. Pre-loved items usually sell at 30–60% of the new price.")}
                {field("quantity", "Quantity", <input className="dn-input" type="number" min={1} max={20} value={form.quantity} onChange={(e) => set("quantity", Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="sl-fields">
              <PhotoUploader images={form.images} onChange={(v) => set("images", v)} error={errors.images} />

              <div className="sl-two">
                {field("city", "City", <input className={`dn-input ${errors.city ? "is-error" : ""}`} value={form.city} onChange={(e) => set("city", e.target.value)} />)}
                {field("pincode", "Pincode", <input className={`dn-input ${errors.pincode ? "is-error" : ""}`} inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />, pin.valid && pin.serviceable ? `We serve ${pin.city}.` : "Where the item will be collected from.")}
              </div>

              <div className="dn-field">
                <span className="dn-label">How will it reach the buyer? <em>*</em></span>
                <div className="sl-pickups" role="radiogroup" aria-label="Pickup preference">
                  {PICKUP_OPTIONS.map((o) => (
                    <button type="button" key={o.id} role="radio" aria-checked={form.pickup === o.id} className={form.pickup === o.id ? "on" : ""} onClick={() => set("pickup", o.id)}>
                      <span className="sl-radio" aria-hidden="true" />
                      <div><strong>{o.label}</strong><small>{o.help}</small></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="sl-fields">
              <div className="sl-review">
                <div className="sl-review-photos">
                  {form.images.slice(0, 4).map((i) => <img key={i.id} src={i.url} alt="" />)}
                </div>
                <div>
                  <span className="dn-chip">{form.category}</span>
                  <h3>{form.title}</h3>
                  <p>{form.description}</p>
                  <ul>
                    <li>Condition <b>{form.condition}</b></li>
                    <li>Quantity <b>{form.quantity}</b></li>
                    <li>Price <b>{formatPrice(price)}</b></li>
                    <li><MapPin size={13} /> <b>{form.city} {form.pincode}</b></li>
                    <li>Handover <b>{PICKUP_OPTIONS.find((o) => o.id === form.pickup).label}</b></li>
                  </ul>
                  <button type="button" className="dn-link" onClick={() => setStep(0)}>Edit details</button>
                </div>
              </div>

              <div className="dn-banner dn-banner--warn">
                <ShieldAlert size={18} />
                <div><strong>Verification takes about 24 hours</strong>Our team checks every listing. Items that don't match their photos or description are rejected.</div>
              </div>

              <label className={`sl-agree ${errors.agree ? "is-error" : ""}`}>
                <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} />
                <span>I confirm I own this item, the photos and details are accurate, and I agree to ReOrbit's selling terms.</span>
              </label>
              {errors.agree && <span className="dn-error">{errors.agree}</span>}
            </div>
          )}

          <footer className="sl-form-foot">
            {step > 0 ? (
              <button type="button" className="dn-btn dn-btn--ghost" onClick={() => { setErrors({}); setStep(step - 1); }} disabled={busy}><ArrowLeft size={16} /> Back</button>
            ) : (
              <button type="button" className="dn-btn dn-btn--ghost" onClick={() => navigate("/user-sell")}>Cancel</button>
            )}
            {step < 2 ? (
              <button type="button" className="dn-btn" onClick={next}>Continue <ArrowRight size={16} /></button>
            ) : (
              <button type="button" className="dn-btn" onClick={() => submit(false)} disabled={busy}>
                {busy ? <><Loader2 size={16} className="dn-spin" /> Submitting…</> : <>{editing ? "Save & resubmit" : "Submit for review"} <Check size={16} /></>}
              </button>
            )}
          </footer>
        </section>

        <aside className="sl-side">
          <div className="dn-card sl-preview">
            <div className="sl-preview-img">
              {form.images[0] ? <img src={form.images[0].url} alt="" /> : <span><ImageIcon size={26} />Your photo appears here</span>}
            </div>
            <div className="sl-preview-body">
              <span className="dn-eyebrow">Preview</span>
              <h3>{form.title.trim() || "Untitled item"}</h3>
              <p className="dn-muted">{form.category || "No category"}{form.condition ? ` · ${form.condition}` : ""}</p>
              <strong>{price ? formatPrice(price) : "₹ —"}</strong>
            </div>
          </div>
          <EarningsPreview price={price} pickup={form.pickup} qty={form.quantity} />
          <p className="sl-tip"><Info size={14} /> {earn.gross ? "Payout is released after the buyer receives the item." : "Add a price to see your payout."}</p>
        </aside>
      </div>
    </div>
  );
}
