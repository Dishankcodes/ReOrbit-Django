import NumberInput from "../../../shared/components/NumberInput";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Image as ImageIcon, Loader2, MapPin, Package, Info } from "lucide-react";

import {
  PICKUP_OPTIONS,
  SELL_CONDITIONS,
  saveListing,
  listingLimitStatus,
  useSellCategories,
  useListing,
} from "../../data/listingsStore";
import { getAccount } from "../../../api/session";
import { pincodeProblem } from "../../../api/profile";
import CitySelect from "../../../shared/components/CitySelect";
import "../../../shared/components/CitySelect.css";
import { formatPrice } from "../../../data/marketplaceData";
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

const makeBlank = () => {
  const savedProfile = getAccount("user")?.profile || {};
  return {
  title: "", category: "", description: "", condition: "", quantity: 1, price: "",
  images: [], city: savedProfile.city || "", pincode: savedProfile.pincode || "", pickup: "self", agree: false,
  };
};

const toForm = (l) => ({
  title: l.title, category: l.category, description: l.description, condition: l.condition,
  quantity: l.quantity, price: String(l.price),
  images: (l.imageRows || []).map((r, i) => ({ id: `img-${r.id}`, serverId: r.id, url: r.url, name: `Photo ${i + 1}` })),
  city: l.city, pincode: l.pincode, pickup: l.pickup, agree: false,
});

export default function UserSellForm() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  /* id of a draft this form already created, so a retry after a failed upload/publish reuses it */
  const createdId = useRef(null);
  const existing = useListing(listingId || "");
  const sellCategories = useSellCategories();
  const categoryNames = useMemo(() => sellCategories.map((c) => c.name), [sellCategories]);
  const categoryOptions = useMemo(
    () => (existing?.category && !categoryNames.includes(existing.category) ? [existing.category, ...categoryNames] : categoryNames),
    [categoryNames, existing],
  );
  const editing = Boolean(listingId);
  const topRef = useRef(null);

  const [form, setForm] = useState(() => (existing ? toForm(existing) : makeBlank()));
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
      if (form.description.trim().length < 10) e.description = "Describe the item in at least 10 characters. Mention size, age and any flaws.";
      if (!form.condition) e.condition = "Select the condition.";
      if (!(price >= 50)) e.price = "Enter a price of at least ₹50.";
      else if (price > 200000) e.price = "The maximum listing price is ₹2,00,000.";
      if (form.quantity < 1) e.quantity = "Quantity must be at least 1.";
    }
    if (index === 1) {
      if (form.images.length < 1) e.images = "Add at least one photo.";
      const pinProblem = pincodeProblem(form.pincode);
      if (pinProblem) e.pincode = pinProblem;
      if (form.city.trim().length < 2) e.city = "Enter your city.";
    }
    if (index === 2 && !form.agree) e.agree = "Please confirm before submitting.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(2, s + 1)); };

  const payload = () => ({ ...form, price });

  const [limitMsg, setLimitMsg] = useState("");

  const submit = (asDraft = false) => {
    if (!asDraft && !validate(2)) return;
    if (asDraft) {
      /* same rule as the server: a draft needs a name and a category */
      const e = {};
      if (form.title.trim().length < 3) e.title = "Add a name before saving a draft.";
      if (!form.category) e.category = "Choose a category before saving a draft.";
      if (Object.keys(e).length) { setErrors(e); setStep(0); return; }
    }
    const publishesNow = !asDraft && (!editing || ["Draft", "Withdrawn"].includes(existing?.status));
    if (publishesNow) {
      const lim = listingLimitStatus();
      if (lim.reached) {
        setLimitMsg(`You have reached today's limit of ${lim.cap} new listings. You can save this one as a draft and publish it tomorrow.`);
        topRef.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    setLimitMsg("");
    setBusy(true);
    saveListing(payload(), { submit: !asDraft, id: editing ? listingId : createdId.current, onCreated: (newId) => { createdId.current = newId; } })
      .then((saved) => {
        navigate(`/user-sell/${saved.id}`, { replace: true, state: { just: asDraft ? "draft" : editing ? "updated" : "submitted" } });
      })
      .catch((err) => {
        setBusy(false);
        if (err.code === "DAILY_LIMIT") {
          setLimitMsg(err.message);
        } else {
          const f = err.errors || {};
          const map = { listing_price: "price" };
          const next = {};
          Object.entries(f).forEach(([k, v]) => { next[map[k] || k] = Array.isArray(v) ? v[0] : v; });
          if (Object.keys(next).length) {
            setErrors(next);
            setStep(next.images || next.pincode || next.city || next.pickup_preference ? 1 : 0);
          } else setLimitMsg(err.message || "Could not save the listing. Try again.");
        }
        topRef.current?.scrollIntoView({ behavior: "smooth" });
      });
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
    <div className="dn sl usl-form" ref={topRef}>
      <Crumbs items={[{ label: "Sell", to: "/user-sell" }, { label: editing ? `Edit ${existing.id}` : "Sell an item" }]} />

      {limitMsg && <div className="dn-error" role="alert" style={{ margin: "0 0 14px", padding: "12px 14px", border: "1px solid currentColor", borderRadius: 12 }}>{limitMsg}</div>}

      <header className="usl-head">
        <div>
          <span className="dn-eyebrow">{editing ? "Edit listing" : "New listing"}</span>
          <h1>{editing ? "Update your listing" : "Sell an item"}</h1>
          <p className="dn-muted">
            {editing && existing.status === "Live"
              ? "Changes to your listing show on the marketplace straight away."
              : "Add clear photos and an honest description, then publish your item to the marketplace."}
          </p>
        </div>
        <button type="button" className="dn-btn dn-btn--ghost" onClick={() => submit(true)} disabled={busy}>Save as draft</button>
      </header>

      <ol className="usl-stepper" aria-label="Listing steps">
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

      <div className="usl-form-grid">
        <section className="dn-card usl-form-card">
          {step === 0 && (
            <div className="usl-fields">
              <div className="dn-field">
                <span className="dn-label">Category <em>*</em></span>
                <div className="usl-chips" role="radiogroup" aria-label="Category">
                  {categoryOptions.map((c) => (
                    <button type="button" key={c} role="radio" aria-checked={form.category === c} className={form.category === c ? "on" : ""} onClick={() => set("category", c)}>{c}</button>
                  ))}
                </div>
                {errors.category && <span className="dn-error">{errors.category}</span>}
              </div>

              {field("title", "Item name", <input className={`dn-input ${errors.title ? "is-error" : ""}`} value={form.title} maxLength={70} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Solid teak writing desk" />)}
              {field("description", "Description", <textarea className={`dn-textarea ${errors.description ? "is-error" : ""}`} value={form.description} maxLength={600} onChange={(e) => set("description", e.target.value)} placeholder="Size, material, age, what's included, any flaws…" />, `${form.description.length}/600`)}

              <div className="dn-field">
                <span className="dn-label">Condition <em>*</em></span>
                <div className="usl-conds" role="radiogroup" aria-label="Condition">
                  {SELL_CONDITIONS.map((c) => (
                    <button type="button" key={c.id} role="radio" aria-checked={form.condition === c.id} className={form.condition === c.id ? "on" : ""} onClick={() => set("condition", c.id)}>
                      <strong>{c.id}</strong><small>{c.help}</small>
                    </button>
                  ))}
                </div>
                {errors.condition && <span className="dn-error">{errors.condition}</span>}
              </div>

              <div className="usl-two">
                {field("price", "Price (₹)", <input className={`dn-input ${errors.price ? "is-error" : ""}`} inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="e.g. 2500" />, "Set a fair price. Pre-loved items usually sell at 30–60% of the new price.")}
                {field("quantity", "Quantity", <NumberInput className="dn-input" min={1} max={20} value={form.quantity} onChange={(n) => set("quantity", n)} />)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="usl-fields">
              <PhotoUploader images={form.images} onChange={(v) => set("images", v)} error={errors.images} />

              <div className="usl-two">
                <div className="dn-field">
                  <span className="dn-label">City <em>*</em></span>
                  <CitySelect id="city" value={form.city} onChange={(v) => set("city", v)} invalid={!!errors.city} placeholder="Choose your city" />
                  {errors.city && <span className="dn-error">{errors.city}</span>}
                </div>
                {field("pincode", "Pincode", <input className={`dn-input ${errors.pincode ? "is-error" : ""}`} inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />, "Where the item will be collected from. Gujarat only.")}
              </div>

              <div className="dn-field">
                <span className="dn-label">How will it reach the buyer? <em>*</em></span>
                <div className="usl-pickups" role="radiogroup" aria-label="Pickup preference">
                  {PICKUP_OPTIONS.map((o) => (
                    <button type="button" key={o.id} role="radio" aria-checked={form.pickup === o.id} className={form.pickup === o.id ? "on" : ""} onClick={() => set("pickup", o.id)}>
                      <span className="usl-radio" aria-hidden="true" />
                      <div><strong>{o.label}</strong><small>{o.help}</small></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="usl-fields">
              <div className="usl-review">
                <div className="usl-review-photos">
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

              <label className={`usl-agree ${errors.agree ? "is-error" : ""}`}>
                <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} />
                <span>I confirm I own this item, the photos and details are accurate, and I agree to ReOrbit's selling terms.</span>
              </label>
              {errors.agree && <span className="dn-error">{errors.agree}</span>}
            </div>
          )}

          <footer className="usl-form-foot">
            {step > 0 ? (
              <button type="button" className="dn-btn dn-btn--ghost" onClick={() => { setErrors({}); setStep(step - 1); }} disabled={busy}><ArrowLeft size={16} /> Back</button>
            ) : (
              <button type="button" className="dn-btn dn-btn--ghost" onClick={() => navigate("/user-sell")}>Cancel</button>
            )}
            {step < 2 ? (
              <button type="button" className="dn-btn" onClick={next}>Continue <ArrowRight size={16} /></button>
            ) : (
              <button type="button" className="dn-btn" onClick={() => submit(false)} disabled={busy}>
                {busy ? <><Loader2 size={16} className="dn-spin" /> Submitting…</> : <>{editing ? (["Draft", "Withdrawn"].includes(existing.status) ? "Publish listing" : "Save changes") : "Publish listing"} <Check size={16} /></>}
              </button>
            )}
          </footer>
        </section>

        <aside className="usl-side">
          <div className="dn-card usl-preview">
            <div className="usl-preview-img">
              {form.images[0] ? <img src={form.images[0].url} alt="" /> : <span><ImageIcon size={26} />Your photo appears here</span>}
            </div>
            <div className="usl-preview-body">
              <span className="dn-eyebrow">Preview</span>
              <h3>{form.title.trim() || "Untitled item"}</h3>
              <p className="dn-muted">{form.category || "No category"}{form.condition ? ` · ${form.condition}` : ""}</p>
              <strong>{price ? formatPrice(price) : "₹ —"}</strong>
            </div>
          </div>
          <EarningsPreview price={price} pickup={form.pickup} qty={form.quantity} />
          <p className="usl-tip"><Info size={14} /> {earn.gross ? "Payout is released after the buyer receives the item." : "Add a price to see your payout."}</p>
        </aside>
      </div>
    </div>
  );
}
