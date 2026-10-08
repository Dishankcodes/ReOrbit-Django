import React, { useMemo, useState } from "react";
import {
  MapPin,
  CreditCard,
  Smartphone,
  WalletCards,
  Check,
  ShieldCheck,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/marketplace-css/UserCheckout.css";

const addresses = [
  {
    id: 1,
    label: "Home",
    name: "Dishank Prajapati",
    address: "82, Sunrise Apartment, Ahmedabad",
    pincode: "380015",
    default: true,
  },
  {
    id: 2,
    label: "Office",
    name: "Dishank Prajapati",
    address: "InfoCity, Gandhinagar",
    pincode: "382007",
    default: false,
  },
  {
    id: 3,
    label: "Other",
    name: "Dishank Prajapati",
    address: "Vastrapur, Ahmedabad",
    pincode: "380015",
    default: false,
  },
];

const paymentOptions = [
  {
    id: "upi",
    title: "UPI",
    description: "Google Pay, PhonePe, Paytm",
    icon: Smartphone,
  },
  {
    id: "card",
    title: "Credit / Debit Card",
    description: "Visa, Mastercard, RuPay",
    icon: CreditCard,
  },
  {
    id: "wallet",
    title: "Wallet",
    description: "ReOrbit Wallet (Mock)",
    icon: WalletCards,
  },
];

export default function UserCheckout() {
  const navigate = useNavigate();

  const [selectedAddress, setSelectedAddress] = useState(1);

  const [payment, setPayment] = useState("upi");

  const product = {
    name: "Reclaimed Wooden Chair",
    price: 2800,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=700&q=80",
  };

  const subtotal = useMemo(
    () => product.price * product.quantity,
    [product.price, product.quantity],
  );

  const delivery = 50;
  const total = subtotal + delivery;

  const placeOrder = () => {
    navigate("/user-orders");
  };

  return (
    <section className="user-checkout-page">
      <div className="checkout-header">
        <small>Secure checkout</small>

        <h1>Complete your order</h1>

        <p>Confirm your delivery details and choose how you'd like to pay.</p>
      </div>

      <div className="checkout-steps">
        <div className="checkout-step completed">
          <span className="checkout-step-number">
            <Check size={13} />
          </span>

          <span>Cart</span>
        </div>

        <div className="checkout-step-line" />

        <div className="checkout-step active">
          <span className="checkout-step-number">2</span>

          <span>Address</span>
        </div>

        <div className="checkout-step-line" />

        <div className="checkout-step">
          <span className="checkout-step-number">3</span>

          <span>Payment</span>
        </div>

        <div className="checkout-step-line" />

        <div className="checkout-step">
          <span className="checkout-step-number">4</span>

          <span>Review</span>
        </div>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <article className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-card-icon">
                <MapPin size={17} />
              </div>

              <h2>Delivery address</h2>
            </div>

            <div className="checkout-address-list">
              {addresses.map((address) => (
                <button
                  type="button"
                  key={address.id}
                  className={`checkout-address ${
                    selectedAddress === address.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedAddress(address.id)}
                >
                  <div className="checkout-address-icon">
                    <MapPin size={15} />
                  </div>

                  <div>
                    <strong>
                      {address.label}
                      {address.default ? " · Default" : ""}
                    </strong>

                    <span>{address.name}</span>

                    <small>
                      {address.address} · {address.pincode}
                    </small>
                  </div>

                  <span className="checkout-address-check">
                    {selectedAddress === address.id && <Check size={11} />}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="checkout-address"
                onClick={() =>
                  window.alert(
                    "Add address UI is ready for the next form step.",
                  )
                }
              >
                <div className="checkout-address-icon">
                  <Plus size={15} />
                </div>

                <div>
                  <strong>Add new address</strong>

                  <span>Save another delivery location.</span>
                </div>
              </button>
            </div>
          </article>

          <article className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-card-icon">
                <CreditCard size={17} />
              </div>

              <h2>Payment method</h2>
            </div>

            <div className="checkout-payment-list">
              {paymentOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`checkout-payment-option ${
                      payment === option.id ? "active" : ""
                    }`}
                    onClick={() => setPayment(option.id)}
                  >
                    <div className="checkout-payment-icon">
                      <Icon size={17} />
                    </div>

                    <div>
                      <strong>{option.title}</strong>

                      <small>{option.description}</small>
                    </div>

                    <span className="checkout-radio" />
                  </button>
                );
              })}
            </div>
          </article>

          <article className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-card-icon">
                <Check size={17} />
              </div>

              <h2>Review item</h2>
            </div>

            <div className="checkout-product">
              <div className="checkout-product-image">
                <img src={product.image} alt={product.name} />
              </div>

              <div>
                <h3>{product.name}</h3>

                <p>Quantity {product.quantity} · Sustainable marketplace</p>
              </div>

              <strong className="checkout-product-price">
                ₹{product.price.toLocaleString("en-IN")}
              </strong>
            </div>
          </article>

          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              minHeight: 38,
              padding: "0 12px",
              border: "1px solid #dce5de",
              borderRadius: 9,
              background: "#fff",
              color: "#2a4d3a",
              fontSize: 8,
              fontWeight: 800,
            }}
          >
            <ArrowLeft
              size={13}
              style={{
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            Back
          </button>
        </div>

        <aside className="checkout-summary">
          <small>Order summary</small>

          <h2>₹{total.toLocaleString("en-IN")}</h2>

          <div className="checkout-summary-row">
            <span>Item</span>

            <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
          </div>

          <div className="checkout-summary-row">
            <span>Delivery</span>

            <strong>₹{delivery}</strong>
          </div>

          <div className="checkout-total">
            <span>Total</span>

            <strong>₹{total.toLocaleString("en-IN")}</strong>
          </div>

          <button
            type="button"
            className="checkout-place-order"
            onClick={placeOrder}
          >
            Place order · ₹{total.toLocaleString("en-IN")}
          </button>

          <div className="checkout-secure">
            <ShieldCheck size={11} />
            Secure mock payment experience
          </div>
        </aside>
      </div>
    </section>
  );
}
