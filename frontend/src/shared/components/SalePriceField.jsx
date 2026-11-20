import React from "react";
import { BadgePercent, Info } from "lucide-react";

import "./SalePriceField.css";

/* "Original price (optional)": the seller marks a product down. Shows the "% off" buyers will see and
   the rule that comes with it: discounted products don't take coupons or points vouchers (donation
   vouchers still work). The server checks the same limits (more than the price, at most 90% off). */
export const MAX_OFF = 90;

export function saleOf(price, mrp) {
  const p = Number(price);
  const m = Number(mrp);
  if (!p || !m || m <= p) return null;
  return { mrp: m, off: Math.round(((m - p) * 100) / m), save: m - p };
}

export function salePriceProblem(price, mrp) {
  if (mrp === "" || mrp == null || Number(mrp) === 0) return "";
  const p = Number(price);
  const m = Number(mrp);
  if (!p) return "";
  if (m <= p) return "The original price must be more than your price (or leave it empty).";
  if (m > (p * 100) / (100 - MAX_OFF)) return `That would be more than ${MAX_OFF}% off. Enter the real original price.`;
  return "";
}

/* class names follow the form it sits in: the member sell form ("dn") or the ReMaker product form ("rpf") */
const LOOK = {
  dn: { wrap: "dn-field", label: "dn-label", input: "dn-input", hint: "dn-hint", error: "dn-error" },
  rpf: { wrap: "rpf-field", label: "", input: "spf-input", hint: "rpf-hint", error: "rpf-error-inline" },
};

export default function SalePriceField({ price, value, onChange, error, look = "dn", label = "Original price (₹)" }) {
  const sale = saleOf(price, value);
  const c = LOOK[look] || LOOK.dn;
  return (
    <div className={`${c.wrap} spf spf--${look}`}>
      <label className={c.label} htmlFor="spf-mrp">
        {label} <small className="spf-opt">optional</small>
      </label>
      <input
        id="spf-mrp"
        className={`${c.input} ${error ? "is-error" : ""}`}
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 7))}
        placeholder="Only if you are selling it for less"
        aria-invalid={error ? "true" : undefined}
      />
      {error ? (
        <span className={c.error}>{error}</span>
      ) : sale ? (
        <span className="spf-preview">
          <BadgePercent size={14} /> Buyers see <s>₹{sale.mrp.toLocaleString("en-IN")}</s>{" "}
          <b>₹{Number(price).toLocaleString("en-IN")}</b> · <em>{sale.off}% off</em>
        </span>
      ) : (
        <span className={c.hint}>Put the price it used to sell for to show a “% off” discount.</span>
      )}
      <span className="spf-rule">
        <Info size={13} /> Products already discounted aren’t eligible for coupons or points vouchers. Donation
        vouchers still apply.
      </span>
    </div>
  );
}
