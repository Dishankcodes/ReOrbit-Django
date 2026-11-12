import React, { useState } from "react";
import { Ticket, X } from "lucide-react";

import { useVouchers } from "../../../data/donationsStore";
import { formatPrice } from "../../../../data/marketplaceData";

/* Donation voucher at checkout. The server checks the code and prices the discount; this only
   asks for it. `applied` is quote.voucher, `error` is quote.voucher_error. */
export default function VoucherBox({
  code,
  applied,
  error,
  busy,
  onApply,
  onClear,
}) {
  const [text, setText] = useState("");
  const { vouchers } = useVouchers();
  const ready = vouchers.filter((v) => v.status === "Active");

  if (applied) {
    return (
      <div className="ushp-voucher" style={{ margin: "14px 0" }}>
        <p
          className="ushp-note"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          <span>
            <Ticket size={14} /> <b>{applied.code}</b> applied · you save{" "}
            {formatPrice(applied.amount)}
          </span>
          <button
            type="button"
            className="dn-link"
            onClick={onClear}
            aria-label="Remove voucher"
          >
            <X size={14} /> Remove
          </button>
        </p>
      </div>
    );
  }

  const apply = (value) => {
    const v = String(value || "").trim();
    if (v) onApply(v);
  };

  return (
    <div className="ushp-voucher" style={{ margin: "14px 0" }}>
      <label className="dn-label" htmlFor="voucher-code">
        Donation voucher
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="voucher-code"
          className="dn-input"
          placeholder="RO-XXXXXXXX"
          value={text}
          onChange={(e) => setText(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && apply(text)}
          autoComplete="off"
        />
        <button
          type="button"
          className="dn-btn dn-btn--soft dn-btn--sm"
          onClick={() => apply(text)}
          disabled={busy || !text.trim()}
        >
          Apply
        </button>
      </div>
      {error && code && (
        <p className="dn-error" role="alert">
          {error}
        </p>
      )}
      {ready.length > 0 && (
        <p className="ushp-note" style={{ marginTop: 8 }}>
          You have{" "}
          {ready.length === 1 ? "a voucher" : `${ready.length} vouchers`}:{" "}
          {ready.map((v) => (
            <button
              key={v.id}
              type="button"
              className="dn-link"
              style={{ marginRight: 10 }}
              onClick={() => apply(v.code)}
            >
              {v.code} (₹{v.amount} off ₹{v.min_order.toLocaleString("en-IN")}+)
            </button>
          ))}
        </p>
      )}
    </div>
  );
}
