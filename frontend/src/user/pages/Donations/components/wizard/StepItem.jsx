import NumberInput from "../../../../../shared/components/NumberInput";
import React, { useEffect } from "react";
import { Minus, Plus, ShieldAlert } from "lucide-react";
import {
  CONDITIONS,
  useDonationCategories,
} from "../../../../data/donationsStore";
import PhotoUploader from "../../../../components/ui/PhotoUploader";
import { useRules } from "../../../../../shared/platformRules";

export default function StepItem({ form, set, errors }) {
  const categories = useDonationCategories();
  /* the smallest donation ReOrbit accepts (Admin › Settings › Platform) */
  const minItems = Math.max(1, Number(useRules().minDonationItems) || 1);

  useEffect(() => {
    if (form.quantity < minItems) set("quantity", minItems);
  }, [form.quantity, minItems, set]);

  return (
    <div className="dn-form">
      {/* category */}
      <div className="dn-field">
        <span className="dn-label">
          Category <em>*</em>
        </span>
        <div className="dn-category-select">
          <select
            id="dn-category"
            value={form.category}
            onChange={(event) => set("category", event.target.value)}
            aria-label="Select a donation category"
            aria-invalid={errors.category ? "true" : undefined}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        {errors.category && <span className="dn-error">{errors.category}</span>}
      </div>

      {/* title */}
      <label className="dn-field">
        <span className="dn-label">
          Item name <em>*</em>
        </span>
        <input
          className={`dn-input ${errors.title ? "is-error" : ""}`}
          value={form.title}
          maxLength={60}
          placeholder="e.g. Wooden study chair set"
          onChange={(event) => set("title", event.target.value)}
        />
        {errors.title && <span className="dn-error">{errors.title}</span>}
      </label>

      {/* description */}
      <label className="dn-field">
        <span className="dn-label">
          Description <em>*</em>
        </span>
        <textarea
          className={`dn-textarea ${errors.description ? "is-error" : ""}`}
          value={form.description}
          maxLength={400}
          placeholder="Size, material, age, what's included, any flaws we should know about…"
          onChange={(event) => set("description", event.target.value)}
        />
        <span className="dn-hint" style={{ textAlign: "right" }}>
          {form.description.length}/400
        </span>
        {errors.description && (
          <span className="dn-error">{errors.description}</span>
        )}
      </label>

      {/* condition + quantity */}
      <div className="dn-two">
        <div className="dn-field" style={{ gridColumn: "1 / -1" }}>
          <span className="dn-label">
            Condition <em>*</em>
          </span>
          <div className="dn-conds" role="radiogroup" aria-label="Condition">
            {CONDITIONS.map((condition) => (
              <button
                type="button"
                key={condition.id}
                role="radio"
                aria-checked={form.condition === condition.id}
                className={`dn-cond ${form.condition === condition.id ? "is-active" : ""}`}
                onClick={() => set("condition", condition.id)}
              >
                <strong>{condition.label}</strong>
                <small>{condition.help}</small>
              </button>
            ))}
          </div>
          {errors.condition && (
            <span className="dn-error">{errors.condition}</span>
          )}
        </div>

        <div className="dn-field">
          <span className="dn-label">
            Quantity <em>*</em>
          </span>
          <div className="dn-qty">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => set("quantity", Math.max(minItems, form.quantity - 1))}
              disabled={form.quantity <= minItems}
            >
              <Minus size={16} />
            </button>
            <NumberInput
              min={minItems}
              max={99}
              value={form.quantity}
              aria-label="Quantity"
              onChange={(n) => set("quantity", n)}
            />
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => set("quantity", Math.min(99, form.quantity + 1))}
            >
              <Plus size={16} />
            </button>
          </div>
          {minItems > 1 && (
            <span className="dn-hint">
              Please donate at least {minItems} items at a time.
            </span>
          )}
          {errors.quantity && (
            <span className="dn-error">{errors.quantity}</span>
          )}
        </div>
      </div>

      <PhotoUploader
        images={form.images}
        onChange={(next) => set("images", next)}
        error={errors.images}
      />

      <div className="dn-banner dn-banner--warn">
        <ShieldAlert size={18} />
        <div>
          <strong>Be honest about the condition</strong>
          If the condition or photos don't match the item, the donation may be
          rejected and removed by our team.
        </div>
      </div>
    </div>
  );
}
