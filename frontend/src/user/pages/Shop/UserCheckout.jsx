import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TicketPercent,
  X,
  Banknote,
  Check,
  ClipboardCheck,
  CreditCard,
  Info,
  Landmark,
  Leaf,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  COD_LIMIT,
  PAYMENT_METHODS,
  WALLET_BALANCE,
  payAndPlace,
  removeAddress,
  saveAddress,
  setDefaultAddress,
  useAddresses,
  useCheckoutLines,
} from "../../data/shopStore";
import { formatPrice } from "../../../data/marketplaceData";
import { checkCoupon, useRewards } from "../../data/rewardsStore";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import AddressForm from "./components/AddressForm";
import PaymentOverlay from "./components/PaymentOverlay";
import ShopNav from "./components/ShopNav";

import "../../css/shared/ui-base.css";
import "../../css/shop/shop-base.css";
import "../../css/shop/UserCheckout.css";

const STEPS = [
  { key: "address", label: "Delivery", icon: MapPin },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "review", label: "Review", icon: ClipboardCheck },
];
const ICON = { UPI: Smartphone, CARD: CreditCard, NET_BANKING: Landmark, WALLET: Wallet, COD: Banknote };
const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Bank of Baroda", "Punjab National Bank"];
const UPI_RE = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

function validateCard(c) {
  const e = {};
  const digits = c.number.replace(/\s/g, "");
  if (digits.length !== 16 || !/^\d+$/.test(digits)) e.number = "Enter the 16-digit card number.";
  if (c.name.trim().length < 3) e.name = "Enter the name on the card.";
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(c.expiry.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) < 26 || (Number(m[2]) === 26 && Number(m[1]) < 10)) e.expiry = "Enter a valid expiry (MM/YY).";
  if (!/^\d{3}$/.test(c.cvv)) e.cvv = "CVV is 3 digits.";
  return e;
}

const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const fmtExp = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function UserCheckout() {
  const navigate = useNavigate();
  const quote = useCheckoutLines();
  const { addresses, defaultId } = useAddresses();

  const [step, setStep] = useState("address");
  const [addrId, setAddrId] = useState(defaultId);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("UPI");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [bank, setBank] = useState("");
  const [touched, setTouched] = useState(false);
  const [pay, setPay] = useState({ state: null, error: "" });
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const { ctx } = useRewards();

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const address = addresses.find((a) => a.id === addrId) || addresses[0];

  /* the applied coupon is re-checked whenever the basket changes */
  const coupon = useMemo(() => {
    if (!couponCode) return null;
    const res = checkCoupon(couponCode, {
      subtotal: quote.subtotal,
      ctx: { ...ctx, hasRemaker: quote.lines.some((l) => l.item.sellerType === "remaker") },
    });
    return res.ok ? res : null;
  }, [couponCode, quote.subtotal, quote.lines, ctx]);
  const discount = coupon ? coupon.amount : 0;
  const finalTotal = quote.total - discount;

  const applyCoupon = () => {
    const res = checkCoupon(couponInput, {
      subtotal: quote.subtotal,
      ctx: { ...ctx, hasRemaker: quote.lines.some((l) => l.item.sellerType === "remaker") },
    });
    if (res.ok) { setCouponCode(res.code); setCouponError(""); setCouponInput(""); }
    else setCouponError(res.error);
  };
  const removeCoupon = () => { setCouponCode(""); setCouponError(""); };

  const walletShort = method === "WALLET" && finalTotal > WALLET_BALANCE;
  const codOk = finalTotal <= COD_LIMIT;

  const payErrors = useMemo(() => {
    if (method === "UPI") return UPI_RE.test(upi.trim()) ? {} : { upi: "Enter a valid UPI ID, like name@okbank." };
    if (method === "CARD") return validateCard(card);
    if (method === "NET_BANKING") return bank ? {} : { bank: "Choose your bank." };
    if (method === "WALLET") return walletShort ? { wallet: "Your wallet balance is too low." } : {};
    return {};
  }, [method, upi, card, bank, walletShort]);
  const payOk = Object.keys(payErrors).length === 0;

  if (quote.lines.length === 0 && !pay.state) {
    return (
      <div className="dn sp">
        <ShopNav />
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to check out"
          text="Your cart is empty, or the pieces in it are no longer available."
          actionLabel="Browse marketplace"
          to="/user-marketplace"
        />
      </div>
    );
  }

  const idx = STEPS.findIndex((s) => s.key === step);
  const continuePay = () => { setTouched(true); if (payOk) setStep("review"); };

  const place = async () => {
    setPay({ state: "processing", error: "" });
    const res = await payAndPlace({
      lines: quote.lines.map((l) => ({ id: l.id, item: l.item, qty: l.qty })),
      address,
      method,
      note,
      coupon,
      detail: { upi: upi.trim(), card: card.number },
    });
    if (res.ok) navigate(`/user-checkout/success/${res.orderIds.join(",")}`, { replace: true });
    else setPay({ state: "failed", error: res.error });
  };

  const methodLabel = PAYMENT_METHODS.find((m) => m.key === method)?.label;
  const methodDetail =
    method === "UPI" ? upi.trim()
    : method === "CARD" ? `Card ending ${card.number.replace(/\s/g, "").slice(-4)}`
    : method === "NET_BANKING" ? bank
    : method === "WALLET" ? "ReOrbit Wallet"
    : "Pay when it arrives";

  return (
    <div className="dn sp">
      <ShopNav />

      <header className="sp-head">
        <div>
          <span className="dn-eyebrow">Secure checkout</span>
          <h1>Checkout</h1>
          <p className="dn-muted">Three quick steps to place your order.</p>
        </div>
        <Link to="/user-cart" className="dn-link"><ArrowLeft size={14} /> Back to cart</Link>
      </header>

      <ol className="sp-steps" aria-label="Checkout progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < idx;
          return (
            <li key={s.key} className={`${i === idx ? "now" : ""} ${done ? "done" : ""}`} aria-current={i === idx ? "step" : undefined}>
              <button type="button" disabled={!done} onClick={() => setStep(s.key)}>
                <span>{done ? <Check size={15} /> : <Icon size={15} />}</span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="sp-grid">
        <div className="sp-main">
          {/* ---------- 1. delivery ---------- */}
          {step === "address" && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <div>
                  <h2>Where should it be delivered?</h2>
                  <small>Pick a saved address or add a new one.</small>
                </div>
                {!adding && (
                  <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={() => setAdding(true)}>
                    <Plus size={14} /> Add address
                  </button>
                )}
              </div>

              <div className="sp-addrs" role="radiogroup" aria-label="Delivery address">
                {addresses.map((a) => (
                  <label key={a.id} className={`sp-addr ${addrId === a.id ? "on" : ""}`}>
                    <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                    <span className="sp-radio" aria-hidden="true" />
                    <div>
                      <div className="sp-addr-top">
                        <strong>{a.name}</strong>
                        <span className="sp-label">{a.label}</span>
                        {defaultId === a.id && <span className="sp-label def">Default</span>}
                      </div>
                      <p>{a.line}, {a.city}, {a.state} {a.pincode}</p>
                      <small>{a.phone}</small>
                      <div className="sp-addr-actions">
                        {defaultId !== a.id && (
                          <button type="button" className="dn-link" onClick={(e) => { e.preventDefault(); setDefaultAddress(a.id); }}>Make default</button>
                        )}
                        {addresses.length > 1 && (
                          <button
                            type="button"
                            className="sp-textbtn danger"
                            onClick={(e) => {
                              e.preventDefault();
                              removeAddress(a.id);
                              if (addrId === a.id) setAddrId(addresses.find((x) => x.id !== a.id).id);
                            }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {adding && (
                <AddressForm
                  onCancel={() => setAdding(false)}
                  onSave={(a) => { const id = saveAddress(a); setAddrId(id); setAdding(false); }}
                />
              )}

              <label className="dn-field" style={{ marginTop: 18 }}>
                <span className="dn-label">Delivery note <span className="dn-hint">(optional)</span></span>
                <textarea
                  className="dn-textarea"
                  style={{ minHeight: 76 }}
                  maxLength={160}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Call before arriving, leave with the security desk"
                />
              </label>

              <div className="sp-actions">
                <button type="button" className="dn-btn" onClick={() => setStep("payment")} disabled={adding}>
                  Continue to payment
                </button>
              </div>
            </section>
          )}

          {/* ---------- 2. payment ---------- */}
          {step === "payment" && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <div>
                  <h2>How would you like to pay?</h2>
                  <small>Your payment is encrypted and secure.</small>
                </div>
                <span className="dn-chip"><Lock size={13} /> Secure</span>
              </div>

              <div className="sp-methods" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.filter((m) => m.key !== "COD" || codOk).map((m) => {
                  const Icon = ICON[m.key];
                  const on = method === m.key;
                  return (
                    <div key={m.key} className={`sp-method ${on ? "on" : ""}`}>
                      <label>
                        <input type="radio" name="pm" checked={on} onChange={() => { setMethod(m.key); setTouched(false); }} />
                        <span className="sp-radio" aria-hidden="true" />
                        <span className="sp-method-ico"><Icon size={18} /></span>
                        <div><strong>{m.label}</strong><small>{m.hint}</small></div>
                      </label>

                      {on && m.key === "UPI" && (
                        <div className="sp-method-body">
                          <label className="dn-field">
                            <span className="dn-label">UPI ID</span>
                            <input className={`dn-input ${touched && payErrors.upi ? "is-error" : ""}`} value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okbank" autoComplete="off" />
                            {touched && payErrors.upi && <span className="dn-error">{payErrors.upi}</span>}
                          </label>
                        </div>
                      )}

                      {on && m.key === "CARD" && (
                        <div className="sp-method-body sp-form-grid">
                          <label className="dn-field sp-wide">
                            <span className="dn-label">Card number</span>
                            <input className={`dn-input ${touched && payErrors.number ? "is-error" : ""}`} inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} placeholder="1234 5678 9012 3456" autoComplete="off" />
                            {touched && payErrors.number && <span className="dn-error">{payErrors.number}</span>}
                          </label>
                          <label className="dn-field sp-wide">
                            <span className="dn-label">Name on card</span>
                            <input className={`dn-input ${touched && payErrors.name ? "is-error" : ""}`} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="As printed on the card" />
                            {touched && payErrors.name && <span className="dn-error">{payErrors.name}</span>}
                          </label>
                          <label className="dn-field">
                            <span className="dn-label">Expiry</span>
                            <input className={`dn-input ${touched && payErrors.expiry ? "is-error" : ""}`} inputMode="numeric" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })} placeholder="MM/YY" />
                            {touched && payErrors.expiry && <span className="dn-error">{payErrors.expiry}</span>}
                          </label>
                          <label className="dn-field">
                            <span className="dn-label">CVV</span>
                            <input className={`dn-input ${touched && payErrors.cvv ? "is-error" : ""}`} inputMode="numeric" type="password" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} placeholder="•••" />
                            {touched && payErrors.cvv && <span className="dn-error">{payErrors.cvv}</span>}
                          </label>
                        </div>
                      )}

                      {on && m.key === "NET_BANKING" && (
                        <div className="sp-method-body">
                          <label className="dn-field">
                            <span className="dn-label">Select your bank</span>
                            <select className="dn-select" value={bank} onChange={(e) => setBank(e.target.value)}>
                              <option value="">Choose a bank</option>
                              {BANKS.map((b) => <option key={b}>{b}</option>)}
                            </select>
                            {touched && payErrors.bank && <span className="dn-error">{payErrors.bank}</span>}
                          </label>
                        </div>
                      )}

                      {on && m.key === "WALLET" && (
                        <div className="sp-method-body">
                          <p className={`sp-note ${walletShort ? "bad" : ""}`}>
                            Balance <b>{formatPrice(WALLET_BALANCE)}</b> · This order <b>{formatPrice(finalTotal)}</b>
                            {walletShort && <span> · Not enough balance</span>}
                          </p>
                        </div>
                      )}

                      {on && m.key === "COD" && (
                        <div className="sp-method-body">
                          <p className="sp-note">Pay {formatPrice(finalTotal)} to the delivery partner. The order stays “payment pending” until it arrives.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!codOk && (
                <p className="sp-note" style={{ marginTop: 12 }}>
                  Pay on delivery is available for orders up to {formatPrice(COD_LIMIT)}.
                </p>
              )}

              <p className="sp-demo">
                <Info size={14} />
                <span>Demo only. A card ending in <b>0000</b> or a UPI ID containing <b>fail</b> is declined, so you can try the failed-payment screen.</span>
              </p>

              <div className="sp-actions split">
                <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setStep("address")}>Back</button>
                <button type="button" className="dn-btn" onClick={continuePay} disabled={walletShort}>Review order</button>
              </div>
            </section>
          )}

          {/* ---------- 3. review ---------- */}
          {step === "review" && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <div>
                  <h2>Review your order</h2>
                  <small>Check everything, then place the order.</small>
                </div>
              </div>

              <div className="sp-review-grid">
                <div className="sp-review-box">
                  <header>
                    <h4><MapPin size={14} /> Deliver to</h4>
                    <button type="button" className="dn-link" onClick={() => setStep("address")}><Pencil size={12} /> Change</button>
                  </header>
                  <p>
                    <strong>{address.name}</strong><br />
                    {address.line}, {address.city}, {address.state} {address.pincode}<br />
                    {address.phone}
                  </p>
                  {note && <small>Note: {note}</small>}
                </div>
                <div className="sp-review-box">
                  <header>
                    <h4><CreditCard size={14} /> Payment</h4>
                    <button type="button" className="dn-link" onClick={() => setStep("payment")}><Pencil size={12} /> Change</button>
                  </header>
                  <p><strong>{methodLabel}</strong><br />{methodDetail}</p>
                </div>
              </div>

              <ul className="sp-review-items">
                {quote.lines.map((l) => (
                  <li key={l.id}>
                    <SafeImage src={l.item.image} alt={l.item.title} />
                    <div>
                      <strong>{l.item.title}</strong>
                      <span>{l.item.sellerType === "remaker" ? "Made by" : "Sold by"} {l.item.seller} · Qty {l.qty}</span>
                    </div>
                    <b>{formatPrice(l.lineSubtotal)}</b>
                  </li>
                ))}
              </ul>

              <p className="sp-terms"><ShieldCheck size={14} /> One order is created for each piece, so the sellers can ship separately.</p>

              <div className="sp-actions split">
                <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setStep("payment")}>Back</button>
                <button type="button" className="dn-btn sp-big" onClick={place}>
                  <Lock size={15} /> {method === "COD" ? "Place order" : `Pay ${formatPrice(finalTotal)}`}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="dn-card sp-summary" aria-label="Order summary">
          <h3>Order summary</h3>
          <ul className="sp-sum-items">
            {quote.lines.map((l) => (
              <li key={l.id}>
                <div className="sp-sum-img"><SafeImage src={l.item.image} alt="" /><i>{l.qty}</i></div>
                <div><strong>{l.item.title}</strong><span>{l.item.seller}</span></div>
                <b>{formatPrice(l.lineSubtotal)}</b>
              </li>
            ))}
          </ul>
          <dl>
            <div><dt>Subtotal</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{quote.delivery ? formatPrice(quote.delivery) : "Free"}</dd></div>
            {coupon && <div className="save"><dt>Coupon ({coupon.code})</dt><dd>− {formatPrice(discount)}</dd></div>}
            <div className="total"><dt>Total</dt><dd>{formatPrice(finalTotal)}</dd></div>
          </dl>

          <div className="sp-coupon">
            {coupon ? (
              <p className="sp-coupon-on">
                <TicketPercent size={15} /> <span><b>{coupon.title}</b> applied</span>
                <button type="button" onClick={removeCoupon} aria-label="Remove coupon"><X size={14} /></button>
              </p>
            ) : (
              <>
                <label className="sp-coupon-row">
                  <TicketPercent size={16} />
                  <input
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                  />
                  <button type="button" onClick={applyCoupon} disabled={!couponInput.trim()}>Apply</button>
                </label>
                {couponError && <span className="dn-error">{couponError}</span>}
              </>
            )}
          </div>

          {quote.co2 > 0 && (
            <p className="sp-impact"><Leaf size={15} /> Saves about <b>{quote.co2} kg</b> of CO₂.</p>
          )}
        </aside>
      </div>

      <PaymentOverlay
        state={pay.state}
        error={pay.error}
        amount={finalTotal}
        onRetry={place}
        onChangeMethod={() => { setPay({ state: null, error: "" }); setStep("payment"); }}
      />
    </div>
  );
}
