import React, { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";

import { formatPrice } from "../data/remakerMarketplaceData";

/* Payment_method ENUM from the Transactions table */
const PAYMENTS = [
  { key: "UPI", label: "UPI", note: "Pay with any UPI app", icon: Smartphone },
  {
    key: "CARD",
    label: "Card",
    note: "Credit or debit card",
    icon: CreditCard,
  },
  {
    key: "NET_BANKING",
    label: "Net banking",
    note: "Pay from your bank",
    icon: Landmark,
  },
  {
    key: "WALLET",
    label: "Wallet",
    note: "ReOrbit or partner wallet",
    icon: Wallet,
  },
  {
    key: "COD",
    label: "Cash on delivery",
    note: "Pay when it arrives",
    icon: Banknote,
  },
];

export default function MarketOrderModal({
  listing,
  quantity,
  delivery,
  charge,
  pincode,
  onClose,
  onBrowse,
}) {
  const [payment, setPayment] = useState("UPI");
  const [placed, setPlaced] = useState(null);

  const dialogRef = useRef(null);

  const subtotal = listing.price * quantity;
  const deliveryFee = delivery === "platform" ? charge : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  const placeOrder = () => {
    const number = String(Math.floor(10000 + Math.random() * 89999));
    setPlaced({ id: `RO-${number}`, payment });
  };

  const paymentLabel = PAYMENTS.find(
    (item) => item.key === placed?.payment,
  )?.label;

  return (
    <div
      className="rmd-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="rmd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rmd-modal-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button
          type="button"
          className="rmd-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {placed ? (
          <div className="rmd-done">
            <span className="rmd-done-icon">
              <Check size={30} strokeWidth={2.5} />
            </span>
            <h2 id="rmd-modal-title">Order placed</h2>
            <p>
              Your order for <strong>{listing.title}</strong> is with{" "}
              {listing.seller}. They will confirm it shortly.
            </p>

            <dl className="rmd-done-list">
              <div>
                <dt>Order number</dt>
                <dd>{placed.id}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{paymentLabel}</dd>
              </div>
              <div>
                <dt>{delivery === "platform" ? "Delivery" : "Pickup"}</dt>
                <dd>
                  {delivery === "platform"
                    ? `ReOrbit delivery to ${pincode}`
                    : `From ${listing.city}`}
                </dd>
              </div>
            </dl>

            <div className="rmd-modal-actions">
              <button
                type="button"
                className="rmd-btn primary"
                onClick={onBrowse}
              >
                Keep browsing
              </button>
              <button type="button" className="rmd-btn ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="rmd-modal-title">Review your order</h2>

            <div className="rmd-order-item">
              <img src={listing.gallery[0]} alt="" />
              <div>
                <strong>{listing.title}</strong>
                <small>
                  {listing.seller}, {listing.city}
                </small>
                <span>
                  Qty {quantity} × {formatPrice(listing.price)}
                </span>
              </div>
            </div>

            <fieldset className="rmd-pay">
              <legend>Payment method</legend>

              {PAYMENTS.map((item) => {
                const Icon = item.icon;

                return (
                  <label
                    className={payment === item.key ? "active" : ""}
                    key={item.key}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={item.key}
                      checked={payment === item.key}
                      onChange={() => setPayment(item.key)}
                    />
                    <span className="rmd-pay-icon">
                      <Icon size={18} />
                    </span>
                    <span className="rmd-pay-text">
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </span>
                    <span className="rmd-radio" aria-hidden="true" />
                  </label>
                );
              })}
            </fieldset>

            <dl className="rmd-totals">
              <div>
                <dt>Items ({quantity})</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>
                  {delivery === "platform"
                    ? `ReOrbit delivery to ${pincode}`
                    : "Self pickup"}
                </dt>
                <dd>{deliveryFee ? formatPrice(deliveryFee) : "Free"}</dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            <div className="rmd-modal-actions">
              <button
                type="button"
                className="rmd-btn primary"
                onClick={placeOrder}
              >
                Place order, {formatPrice(total)}
              </button>
              <button type="button" className="rmd-btn ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
