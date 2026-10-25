import React, { useEffect, useMemo, useState } from "react";
import { useSettings } from "../../data/settingsStore";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, MapPin, CreditCard, ClipboardCheck, Plus, Trash2, ShieldCheck, Smartphone, Landmark, Wallet, Banknote,
  Lock, ShoppingCart, Pencil, Info,
} from "lucide-react";

import {
  useCheckoutLines, useAddresses, saveAddress, removeAddress, setDefaultAddress, payAndPlace, PAYMENT_METHODS, WALLET_BALANCE,
} from "../../data/shopStore";
import { formatINR } from "../../utils/format";
import ProductImg from "./components/ProductImg";
import AddressForm from "./components/AddressForm";
import PaymentOverlay from "./components/PaymentOverlay";
import ShopNav from "./components/ShopNav";
import EmptyState from "../../components/ui/EmptyState";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/shop/AdminShop.css";

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
  if (c.number.replace(/\s/g, "").length !== 16 || !/^\d+$/.test(c.number.replace(/\s/g, ""))) e.number = "Enter the 16-digit card number.";
  if (c.name.trim().length < 3) e.name = "Enter the name on the card.";
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(c.expiry.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || (Number(m[2]) < 26 || (Number(m[2]) === 26 && Number(m[1]) < 10))) e.expiry = "Enter a valid expiry (MM/YY).";
  if (!/^\d{3}$/.test(c.cvv)) e.cvv = "CVV is 3 digits.";
  return e;
}

export default function AdminShopCheckout() {

  const { commerce } = useSettings();  const navigate = useNavigate();
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

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const address = addresses.find((a) => a.id === addrId) || addresses[0];
  const walletShort = method === "WALLET" && quote.total > WALLET_BALANCE;

  const payErrors = useMemo(() => {
    if (method === "UPI") return UPI_RE.test(upi.trim()) ? {} : { upi: "Enter a valid UPI ID, like name@okbank." };
    if (method === "CARD") return validateCard(card);
    if (method === "NET_BANKING") return bank ? {} : { bank: "Choose your bank." };
    if (method === "WALLET") return walletShort ? { wallet: "Your wallet balance is too low for this order." } : {};
    return {};
  }, [method, upi, card, bank, walletShort]);
  const payOk = Object.keys(payErrors).length === 0;

  if (quote.lines.length === 0 && !pay.state) {
    return (
      <div className="au-page sh-page">
        <ShopNav />
        <section className="au-panel"><EmptyState icon={ShoppingCart} title="Nothing to check out" text="Your cart is empty or the items are no longer available." action={<Link to="/admin-shop" className="ad-btn ad-btn-primary ad-btn-sm">Browse products</Link>} /></section>
      </div>
    );
  }

  const idx = STEPS.findIndex((s) => s.key === step);
  const continuePay = () => { setTouched(true); if (payOk) setStep("review"); };

  const place = async () => {
    setPay({ state: "processing", error: "" });
    const res = await payAndPlace({
      lines: quote.lines.map((l) => ({ id: l.id, product: l.product, qty: l.qty })),
      address, method, note,
      detail: { upi: upi.trim(), card: card.number },
    });
    if (res.ok) navigate(`/admin-shop/success/${res.orderIds.join(",")}`, { replace: true });
    else setPay({ state: "failed", error: res.error });
  };

  const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
  const methodLabel = PAYMENT_METHODS.find((m) => m.key === method)?.label;
  const methodDetail = method === "UPI" ? upi.trim() : method === "CARD" ? `Card ending ${card.number.replace(/\s/g, "").slice(-4)}` : method === "NET_BANKING" ? bank : method === "WALLET" ? "ReOrbit Wallet" : "Pay when it arrives";

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <header className="sh-pagehead"><div><h2>Checkout</h2><p>Three quick steps to place your order.</p></div>
        <Link to="/admin-shop/cart" className="sh-link"><ArrowLeft size={14} /> Back to cart</Link></header>

      <ol className="sh-steps" aria-label="Checkout progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon; const done = i < idx;
          return (
            <li key={s.key} className={`${i === idx ? "now" : ""} ${done ? "done" : ""}`} aria-current={i === idx ? "step" : undefined}>
              <button type="button" disabled={!done} onClick={() => setStep(s.key)}><span>{done ? <Check size={15} /> : <Icon size={15} />}</span>{s.label}</button>
            </li>
          );
        })}
      </ol>

      <div className="sh-cartgrid">
        <div className="sh-checkout-main">
          {/* ---------- 1. delivery ---------- */}
          {step === "address" && (
            <section className="sh-panel">
              <header className="sh-sec-head"><div><h3>Where should it be delivered?</h3><p>Pick a saved address or add a new one.</p></div>
                {!adding && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Add address</button>}</header>
              <div className="sh-addrs" role="radiogroup" aria-label="Delivery address">
                {addresses.map((a) => (
                  <label key={a.id} className={`sh-addr ${addrId === a.id ? "on" : ""}`}>
                    <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                    <span className="sh-radio" aria-hidden="true" />
                    <div>
                      <div className="sh-addr-top"><strong>{a.name}</strong><span className="sh-label">{a.label}</span>{defaultId === a.id && <span className="sh-label def">Default</span>}</div>
                      <p>{a.address}, {a.city}, {a.state} {a.pincode}</p>
                      <small>{a.phone}</small>
                      <div className="sh-addr-actions">
                        {defaultId !== a.id && <button type="button" className="sh-link" onClick={(e) => { e.preventDefault(); setDefaultAddress(a.id); }}>Make default</button>}
                        {addresses.length > 1 && <button type="button" className="sh-link danger" onClick={(e) => { e.preventDefault(); removeAddress(a.id); if (addrId === a.id) setAddrId(addresses.find((x) => x.id !== a.id).id); }}><Trash2 size={13} /> Remove</button>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {adding && <AddressForm onCancel={() => setAdding(false)} onSave={(a) => { const id = saveAddress(a); setAddrId(id); setAdding(false); }} />}
              <label className="sh-field wide"><span>Delivery note <em>(optional)</em></span>
                <textarea rows={2} maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Deliver to the receiving dock, call before arriving" />
              </label>
              <div className="sh-step-actions"><button type="button" className="ad-btn ad-btn-primary" onClick={() => setStep("payment")} disabled={adding}>Continue to payment</button></div>
            </section>
          )}

          {/* ---------- 2. payment ---------- */}
          {step === "payment" && (
            <section className="sh-panel">
              <header className="sh-sec-head"><div><h3>How would you like to pay?</h3><p>Your payment is encrypted and secure.</p></div><span className="sh-secure"><Lock size={13} /> Secure</span></header>
              <div className="sh-methods" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.filter((m) => m.key !== "COD" || (commerce.codEnabled && quote.total <= commerce.codLimit)).map((m) => {
                  const Icon = ICON[m.key];
                  return (
                    <div key={m.key} className={`sh-method ${method === m.key ? "on" : ""}`}>
                      <label>
                        <input type="radio" name="pm" checked={method === m.key} onChange={() => { setMethod(m.key); setTouched(false); }} />
                        <span className="sh-radio" aria-hidden="true" />
                        <span className="sh-method-ico"><Icon size={18} /></span>
                        <div><strong>{m.label}</strong><small>{m.hint}</small></div>
                      </label>
                      {method === m.key && m.key === "UPI" && (
                        <div className="sh-method-body">
                          <label className="sh-field"><span>UPI ID</span><input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okbank" autoComplete="off" aria-invalid={touched && !!payErrors.upi} />{touched && payErrors.upi && <small>{payErrors.upi}</small>}</label>
                        </div>
                      )}
                      {method === m.key && m.key === "CARD" && (
                        <div className="sh-method-body sh-form-grid">
                          <label className="sh-field wide"><span>Card number</span><input inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} placeholder="1234 5678 9012 3456" autoComplete="off" aria-invalid={touched && !!payErrors.number} />{touched && payErrors.number && <small>{payErrors.number}</small>}</label>
                          <label className="sh-field wide"><span>Name on card</span><input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="As printed on the card" aria-invalid={touched && !!payErrors.name} />{touched && payErrors.name && <small>{payErrors.name}</small>}</label>
                          <label className="sh-field"><span>Expiry</span><input inputMode="numeric" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })} placeholder="MM/YY" aria-invalid={touched && !!payErrors.expiry} />{touched && payErrors.expiry && <small>{payErrors.expiry}</small>}</label>
                          <label className="sh-field"><span>CVV</span><input inputMode="numeric" type="password" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} placeholder="•••" aria-invalid={touched && !!payErrors.cvv} />{touched && payErrors.cvv && <small>{payErrors.cvv}</small>}</label>
                        </div>
                      )}
                      {method === m.key && m.key === "NET_BANKING" && (
                        <div className="sh-method-body">
                          <label className="sh-field"><span>Select your bank</span><select value={bank} onChange={(e) => setBank(e.target.value)} aria-invalid={touched && !!payErrors.bank}><option value="">Choose a bank</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</select>{touched && payErrors.bank && <small>{payErrors.bank}</small>}</label>
                        </div>
                      )}
                      {method === m.key && m.key === "WALLET" && (
                        <div className="sh-method-body"><p className={`sh-wallet ${walletShort ? "bad" : ""}`}>Balance <strong>{formatINR(WALLET_BALANCE)}</strong> · This order <strong>{formatINR(quote.total)}</strong>{walletShort && <span> · Not enough balance</span>}</p></div>
                      )}
                      {method === m.key && m.key === "COD" && (
                        <div className="sh-method-body"><p className="sh-wallet">Pay {formatINR(quote.total)} to the delivery partner. The order stays “payment pending” until it arrives.</p></div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="sh-demo"><Info size={14} /><span>Demo only. A card ending in <b>0000</b> or a UPI ID containing <b>fail</b> is declined, so you can try the failed-payment screen.</span></p>
              <div className="sh-step-actions split">
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setStep("address")}>Back</button>
                <button type="button" className="ad-btn ad-btn-primary" onClick={continuePay} disabled={method === "WALLET" && walletShort}>Review order</button>
              </div>
            </section>
          )}

          {/* ---------- 3. review ---------- */}
          {step === "review" && (
            <section className="sh-panel">
              <header className="sh-sec-head"><div><h3>Review your order</h3><p>Check everything, then place the order.</p></div></header>
              <div className="sh-review-grid">
                <div className="sh-review-box"><header><h4><MapPin size={14} /> Deliver to</h4><button type="button" className="sh-link" onClick={() => setStep("address")}><Pencil size={12} /> Change</button></header>
                  <p><strong>{address.name}</strong><br />{address.address}, {address.city}, {address.state} {address.pincode}<br />{address.phone}</p>{note && <small>Note: {note}</small>}</div>
                <div className="sh-review-box"><header><h4><CreditCard size={14} /> Payment</h4><button type="button" className="sh-link" onClick={() => setStep("payment")}><Pencil size={12} /> Change</button></header>
                  <p><strong>{methodLabel}</strong><br />{methodDetail}</p></div>
              </div>
              <ul className="sh-review-items">
                {quote.lines.map((l) => (
                  <li key={l.id}><ProductImg src={l.product.image} alt={l.product.title} /><div><strong>{l.product.title}</strong><span>Sold by {l.product.owner.name} · Qty {l.qty}</span></div><b>{formatINR(l.lineSubtotal)}</b></li>
                ))}
              </ul>
              <p className="sh-terms"><ShieldCheck size={14} /> One order is created for each product, so the sellers can ship separately.</p>
              <div className="sh-step-actions split">
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setStep("payment")}>Back</button>
                <button type="button" className="ad-btn ad-btn-primary sh-big" onClick={place}><Lock size={15} /> {method === "COD" ? "Place order" : `Pay ${formatINR(quote.total)}`}</button>
              </div>
            </section>
          )}
        </div>

        <aside className="sh-summary" aria-label="Order summary">
          <h3>Order summary</h3>
          <ul className="sh-sum-items">
            {quote.lines.map((l) => (
              <li key={l.id}><div className="sh-sum-img"><ProductImg src={l.product.image} alt="" /><i>{l.qty}</i></div><div><strong>{l.product.title}</strong><span>{l.product.owner.name}</span></div><b>{formatINR(l.lineSubtotal)}</b></li>
            ))}
          </ul>
          <dl>
            <div><dt>Subtotal</dt><dd>{formatINR(quote.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{quote.delivery ? formatINR(quote.delivery) : "Free"}</dd></div>
            <div><dt>Platform fee</dt><dd className="good">Waived</dd></div>
            <div className="total"><dt>Total</dt><dd>{formatINR(quote.total)}</dd></div>
          </dl>
        </aside>
      </div>

      <PaymentOverlay state={pay.state} error={pay.error} amount={quote.total} onRetry={place} onChangeMethod={() => { setPay({ state: null, error: "" }); setStep("payment"); }} />
    </div>
  );
}
