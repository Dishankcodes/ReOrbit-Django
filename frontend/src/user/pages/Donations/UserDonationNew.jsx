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
  DONATION_CATEGORIES,
  DONOR,
  SAVED_ADDRESSES,
  checkPincode,
  createDonation,
  estimateWeight,
  useDonation,
} from "../../data/donationsStore";
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
  addressId: SAVED_ADDRESSES[0].id,
  useNewAddress: false,
  line: "",
  pincode: "",
  contactName: DONOR.name,
  phone: DONOR.phone,
  date: "",
  slot: "",
  note: "",
  agree: false,
};

export default function UserDonationNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topRef = useRef(null);

  /* ?category=Books pre-selects a category; ?repeat=DON-2036 re-uses an old one */
  const repeat = useDonation(params.get("repeat") || "");
  const initial = useMemo(() => {
    const category = params.get("category");
    const valid = DONATION_CATEGORIES.some((item) => item.id === category);
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

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    );
  };

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const address = useMemo(() => {
    if (form.useNewAddress) {
      const pin = checkPincode(form.pincode);
      return {
        label: "New address",
        line: form.line.trim(),
        city: pin.city || "—",
        state: "Gujarat",
        pincode: form.pincode,
      };
    }
    return (
      SAVED_ADDRESSES.find((item) => item.id === form.addressId) ||
      SAVED_ADDRESSES[0]
    );
  }, [form.useNewAddress, form.line, form.pincode, form.addressId]);

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
      if (form.useNewAddress) {
        if (form.line.trim().length < 6)
          next.line = "Enter the full pickup address.";
        const pin = checkPincode(form.pincode);
        if (!pin.valid) next.pincode = "Enter a valid 6-digit pincode.";
        else if (!pin.serviceable)
          next.pincode = "We don't pick up from this pincode yet.";
      } else {
        const pin = checkPincode(address.pincode);
        if (!pin.serviceable)
          next.addressId = "We don't pick up from this address yet.";
      }
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

  const submit = () => {
    if (!validate(2)) return;
    setSubmitting(true);

    window.setTimeout(() => {
      const donation = createDonation({
        title: form.title,
        category: form.category,
        description: form.description,
        condition: form.condition,
        quantity: form.quantity,
        weightKg: estimateWeight(form.category, form.quantity),
        images: form.images.map((image) => image.url),
        address,
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        date: form.date,
        slot: form.slot,
        note: form.note.trim(),
      });
      navigate(`/user-donations/success/${donation.id}`, { replace: true });
    }, 900);
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
            <StepPickup form={form} set={set} errors={{ ...errors }} />
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
