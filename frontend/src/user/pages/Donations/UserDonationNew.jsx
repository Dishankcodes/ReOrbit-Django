import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HandHeart,
  Loader2,
  Package,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";

import {
  useDonationCategories,
  checkPincode,
  createDonation,
  useDonation,
} from "../../data/donationsStore";
import { useServerAddresses } from "../../data/checkoutStore";
import Crumbs from "../../components/ui/Crumbs";
import StepItem from "./components/wizard/StepItem";
import StepPickup from "./components/wizard/StepPickup";
import StepReview from "./components/wizard/StepReview";
import WizardSummary from "./components/wizard/WizardSummary";

import "../../css/shared/ui-base.css";
import "../../css/donations/UserDonationNew.css";

const STEPS = [
  { label: "Item details", icon: Package },
  { label: "Pickup", icon: CalendarDays },
  { label: "Review", icon: ClipboardCheck },
];

const emptyForm = {
  category: "",
  title: "",
  description: "",
  condition: "",
  quantity: 1,
  images: [],
  addressId: "",
  contactName: "",
  phone: "",
  date: "",
  slot: "",
  note: "",
  agree: false,
};

export default function UserDonationNew() {
  const categories = useDonationCategories();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topRef = useRef(null);

  /* ?category=Books pre-selects a category; ?repeat=DON-2036 re-uses an old one */
  const repeat = useDonation(params.get("repeat") || "");
  const initial = useMemo(() => {
    const category = params.get("category");
    const valid = categories.some((item) => item.id === category);
    return {
      ...emptyForm,
      category: repeat?.category || (valid ? category : ""),
      title: repeat?.title || "",
      description: repeat?.description || "",
      quantity: repeat?.quantity || 1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const contactEdited = useRef(false);

  const set = (key, value) => {
    if (key === "contactName" || key === "phone") contactEdited.current = true;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    );
  };

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  /* the saved address book: the chosen one, else the default, fills the pickup by itself */
  const book = useServerAddresses();
  const address = useMemo(
    () =>
      book.addresses.find((item) => item.id === (form.addressId || book.defaultId)) ||
      null,
    [book.addresses, book.defaultId, form.addressId],
  );

  /* the contact is the person at that address, until the donor types their own */
  useEffect(() => {
    if (!address || contactEdited.current) return;
    setForm((current) => ({ ...current, contactName: address.name || "", phone: address.phone || "" }));
  }, [address]);

  /* ---------- validation ---------- */

  const validate = (index) => {
    const next = {};

    if (index === 0) {
      if (!form.category) next.category = "Choose a category.";
      if (form.title.trim().length < 3)
        next.title = "Give the item a short name (at least 3 characters).";
      if (form.description.trim().length < 10)
        next.description = "Add a few more details (at least 10 characters).";
      if (!form.condition) next.condition = "Select the condition of the item.";
      if (form.quantity < 1) next.quantity = "Quantity must be at least 1.";
      if (form.images.length < 1) next.images = "Add at least one photo.";
    }

    if (index === 1) {
      if (!address) next.addressId = "Choose or add a pickup address.";
      else if (!checkPincode(address.pincode).serviceable)
        next.addressId = "We don't pick up from this address yet.";
      if (form.contactName.trim().length < 2)
        next.contactName = "Enter a contact name.";
      if (form.phone.replace(/\D/g, "").slice(-10).length < 10)
        next.phone = "Enter a valid 10-digit phone number.";
      if (!form.date || !form.slot)
        next.schedule = "Choose a pickup date and a time slot.";
    }

    if (index === 2 && !form.agree)
      next.agree = "Please confirm to submit your donation.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (validate(step)) setStep((current) => Math.min(2, current + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  };

  const jump = (index) => {
    if (index < step) {
      setErrors({});
      setStep(index);
    }
  };

  const submit = async () => {
    if (!validate(2)) return;
    setSubmitting(true);
    try {
      const donation = await createDonation({
        title: form.title,
        category: form.category,
        description: form.description,
        condition: form.condition,
        quantity: form.quantity,
        files: form.images.map((image) => image.file).filter(Boolean),
        addressId: address.id,
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        date: form.date,
        slot: form.slot,
        note: form.note.trim(),
      });
      navigate(`/user-donations/success/${donation.id}`, { replace: true });
    } catch (e) {
      /* send the donor back to the step that has the problem */
      const f = e.errors || {};
      const first = (k) => (Array.isArray(f[k]) ? f[k][0] : f[k]);
      const next = {};
      if (f.title || f.description || f.category || f.condition || f.quantity || f.images) {
        if (first("title")) next.title = first("title");
        if (first("description")) next.description = first("description");
        if (first("category")) next.category = first("category");
        if (first("condition")) next.condition = first("condition");
        if (first("quantity")) next.quantity = first("quantity");
        if (first("images")) next.images = first("images");
        setStep(0);
      } else if (f.address_id || f.date || f.slot || f.contact_name || f.phone) {
        if (first("address_id")) next.addressId = first("address_id");
        if (first("date") || first("slot")) next.schedule = first("date") || first("slot");
        if (first("contact_name")) next.contactName = first("contact_name");
        if (first("phone")) next.phone = first("phone");
        setStep(1);
      } else {
        next.addressId = e.message || "We couldn't submit your donation. Please try again.";
        setStep(1);
      }
      setErrors(next);
      setSubmitting(false);
    }
  };

  return (
    <div className="dn dn-new" ref={topRef}>
      <Crumbs
        items={[
          { label: "Donations", to: "/user-donations" },
          { label: "Donate an item" },
        ]}
      />

      <header className="dn-new-head">
        <div>
          <span className="dn-eyebrow">New donation</span>
          <h1>Donate an item</h1>
          <p className="dn-muted">
            {repeat
              ? `Starting from "${repeat.title}". Update the details and submit again.`
              : "Tell us about the item, choose a free pickup time, and you're done."}
          </p>
        </div>
        <span className="dn-chip">
          <HandHeart size={14} /> Free doorstep pickup
        </span>
      </header>

      {/* stepper */}
      <ol className="dn-stepper" aria-label="Donation steps">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const state =
            index < step ? "is-done" : index === step ? "is-current" : "";
          return (
            <li key={item.label} className={state}>
              <button
                type="button"
                onClick={() => jump(index)}
                disabled={index >= step}
              >
                <span className="dn-stepper-dot">
                  {index < step ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span className="dn-stepper-text">
                  <small>Step {index + 1}</small>
                  <strong>{item.label}</strong>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="dn-new-layout">
        <section className="dn-card dn-card-pad dn-new-main">
          <div className="dn-new-title">
            <h2>
              {
                [
                  "Tell us about the item",
                  "Schedule your free pickup",
                  "Review and submit",
                ][step]
              }
            </h2>
            <p className="dn-muted">
              {
                [
                  "Good details and photos help our team review your donation quickly.",
                  "Pick where and when we should collect it.",
                  "Check everything once more before you send it to us.",
                ][step]
              }
            </p>
          </div>

          {step === 0 && <StepItem form={form} set={set} errors={errors} />}
          {step === 1 && (
            <StepPickup
              form={form}
              set={set}
              errors={{ ...errors }}
              addresses={book.addresses}
              addressId={address?.id || ""}
              loading={book.loading}
              error={book.error}
            />
          )}
          {step === 2 && (
            <StepReview
              form={form}
              address={address}
              onEdit={setStep}
              errors={errors}
              set={set}
            />
          )}

          {errors.addressId && step === 1 && (
            <span className="dn-error" style={{ marginTop: 10 }}>
              {errors.addressId}
            </span>
          )}

          <footer className="dn-new-foot">
            {step > 0 ? (
              <button
                type="button"
                className="dn-btn dn-btn--ghost"
                onClick={goBack}
                disabled={submitting}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button
                type="button"
                className="dn-btn dn-btn--ghost"
                onClick={() => navigate("/user-donations")}
              >
                Cancel
              </button>
            )}

            {step < 2 ? (
              <button type="button" className="dn-btn" onClick={goNext}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="dn-btn"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="dn-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    Submit donation <Check size={16} />
                  </>
                )}
              </button>
            )}
          </footer>
        </section>

        <WizardSummary form={form} />
      </div>
    </div>
  );
}
