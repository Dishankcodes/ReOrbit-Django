import React, { useEffect, useMemo, useRef, useState } from "react";
import { BackLink } from "../../../shared/backNav";
import { useNavigate } from "../../../shared/portalRouter";
import {
  ArrowLeft,
  Banknote,
  Check,
  ClipboardCheck,
  CreditCard,
  Info,
  Leaf,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { removeFromCart, useCheckoutLines } from "../../data/shopStore";
import {
  createAddress,
  deleteAddress,
  isLiveId,
  makeDefaultAddress,
  useServerAddresses,
  useServerQuote,
} from "../../data/checkoutStore";
import { addPlacedOrders, loadOrders } from "../../data/ordersStore";
import { loadLiveMarketplace, useLiveMarketplace } from "../../data/liveMarketplace";
import { checkoutApi, payOnline } from "../../../api/orders";
import { getAccount } from "../../../api/session";
import { feeLabel } from "../../../shared/commerce";
import { formatPrice } from "../../../data/marketplaceData";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import Spinner, { PageLoader } from "../../../shared/components/Spinner";
import "../../../shared/components/Spinner.css";
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

const newAttemptId = () =>
  (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`).slice(0, 60);

export default function UserCheckout() {
  const navigate = useNavigate();
  const { ready } = useLiveMarketplace();
  const all = useCheckoutLines();
  const buyable = useMemo(() => all.lines.filter((l) => isLiveId(l.id)), [all.lines]);
  const skipped = all.lines.length - buyable.length;
  const { addresses, defaultId, loading: addrLoading, error: addrError, reload: reloadAddr } = useServerAddresses();
  const q = useServerQuote(buyable);
  const quote = q.quote;

  const [step, setStep] = useState("address");
  const [addrId, setAddrId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrErrors, setAddrErrors] = useState({});
  const [addrMsg, setAddrMsg] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("");
  const [cfg, setCfg] = useState(null); /* { enabled } : is online payment set up? */
  const [pay, setPay] = useState({ state: null, error: "" });
  const attempt = useRef(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);
  useEffect(() => {
    let alive = true;
    checkoutApi.config().then((c) => alive && setCfg(c)).catch(() => alive && setCfg({ enabled: false }));
    return () => { alive = false; };
  }, []);

  const address = addresses.find((a) => a.id === addrId) || addresses.find((a) => a.id === defaultId) || addresses[0];
  useEffect(() => { if (!addrId && defaultId) setAddrId(defaultId); }, [defaultId, addrId]);

  const codOk = !!quote && quote.cod_allowed;
  const onlineOk = !!cfg && cfg.enabled;
  /* pick a sensible default once we know what is available */
  useEffect(() => {
    if (method || !cfg || !quote) return;
    setMethod(onlineOk ? "RAZORPAY" : codOk ? "COD" : "");
  }, [method, cfg, quote, onlineOk, codOk]);
  /* the chosen method can stop being allowed when the basket changes */
  useEffect(() => {
    if (method === "COD" && quote && !quote.cod_allowed) setMethod(onlineOk ? "RAZORPAY" : "");
  }, [method, quote, onlineOk]);

  const problems = quote?.problems || {};
  const hasProblems = Object.keys(problems).length > 0;

  if (!ready && all.lines.length === 0) {
    return (
      <div className="dn sp">
        <ShopNav />
        <PageLoader label="Getting your checkout ready…" />
      </div>
    );
  }

  if (buyable.length === 0 && !pay.state) {
    return (
      <div className="dn sp">
        <ShopNav />
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to check out"
          text={skipped ? "The pieces in your cart are samples and can't be bought yet." : "Your cart is empty, or the pieces in it are no longer available."}
          actionLabel="Browse marketplace"
          to="/user-marketplace"
        />
      </div>
    );
  }

  const idx = STEPS.findIndex((s) => s.key === step);
  const methodLabel = method === "COD" ? "Pay on delivery" : "Pay online";
  const methodDetail = method === "COD" ? "Pay when it arrives" : "UPI, cards and net banking, secured by Razorpay";

  const saveNewAddress = async (values) => {
    setSavingAddr(true);
    setAddrErrors({});
    setAddrMsg("");
    try {
      const id = await createAddress(values);
      setAddrId(id);
      setAdding(false);
    } catch (e) {
      setAddrErrors(e.errors || {});
      if (!e.errors) setAddrMsg(e.message || "Could not save the address.");
    } finally {
      setSavingAddr(false);
    }
  };

  const guard = async (task) => {
    setAddrMsg("");
    try { await task(); } catch (e) { setAddrMsg(e.message || "Something went wrong. Please try again."); }
  };

  const fail = (message) => setPay({ state: "failed", error: message });

  const finish = async (orders, paidOnline) => {
    if (paidOnline) await loadOrders(true);
    else addPlacedOrders(orders);
    buyable.forEach((l) => removeFromCart(l.id));
    loadLiveMarketplace(true); /* stock changed */
    navigate(`/user-checkout/success/${orders.map((o) => o.id).join(",")}`, { replace: true });
  };

  const place = async () => {
    if (pay.state === "processing" || pay.state === "paying") return; /* no double submit */
    if (!address || !method || !quote || hasProblems) return;
    setPay({ state: "processing", error: "" });
    attempt.current = attempt.current || newAttemptId(); /* same id on a repeat tap = same order */

    let res;
    try {
      res = await checkoutApi.place(
        { items: buyable.map((l) => ({ id: l.id, qty: l.qty })), address_id: address.id, method, note: note.trim() },
        attempt.current,
      );
    } catch (e) {
      attempt.current = null;
      if (e.code === "UNAVAILABLE") { loadLiveMarketplace(true); q.retry(); }
      return fail(e.message || "We could not place your order. Please try again.");
    }

    if (res.payment.method === "COD") {
      attempt.current = null;
      return finish(res.orders, false);
    }

    setPay({ state: "paying", error: "" });
    try {
      const done = await payOnline(res.payment, { name: address.name, email: getAccount()?.email, phone: address.phone });
      attempt.current = null;
      if (done.payment.status !== "Paid") return fail("The payment could not be completed. If money was deducted it will be refunded automatically.");
      return finish(res.orders, true);
    } catch (e) {
      attempt.current = null;
      if (e.dismissed) {
        checkoutApi.cancelPayment(res.payment.id).catch(() => {});
        return fail("You closed the payment window, so nothing was charged. Your items are released.");
      }
      return fail(e.message || "We could not confirm your payment. If money was deducted your order will show in My orders shortly, otherwise it is refunded automatically.");
    }
  };

  return (
    <div className="dn sp">
      <ShopNav />

      <header className="ushp-head">
        <div>
          <span className="dn-eyebrow">Secure checkout</span>
          <h1>Checkout</h1>
          <p className="dn-muted">Three quick steps to place your order.</p>
        </div>
        <BackLink to="/user-cart" className="dn-link" icon={<ArrowLeft size={14} />} label="Back to cart" />
      </header>

      <ol className="ushp-steps" aria-label="Checkout progress">
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

      <div className="ushp-grid">
        <div className="ushp-main">
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

              {addrLoading && addresses.length === 0 && <PageLoader label="Loading your addresses…" minHeight={120} />}
              {addrError && addresses.length === 0 && (
                <p className="dn-error" role="alert">{addrError} <button type="button" className="dn-link" onClick={reloadAddr}>Try again</button></p>
              )}
              {!addrLoading && !addrError && addresses.length === 0 && !adding && (
                <p className="ushp-note">You have no saved address yet. Add one to continue.</p>
              )}
              {addrMsg && <p className="dn-error" role="alert">{addrMsg}</p>}

              <div className="ushp-addrs" role="radiogroup" aria-label="Delivery address">
                {addresses.map((a) => (
                  <label key={a.id} className={`ushp-addr ${address?.id === a.id ? "on" : ""}`}>
                    <input type="radio" name="addr" checked={address?.id === a.id} onChange={() => setAddrId(a.id)} />
                    <span className="ushp-radio" aria-hidden="true" />
                    <div>
                      <div className="ushp-addr-top">
                        <strong>{a.name}</strong>
                        <span className="ushp-label">{a.label}</span>
                        {defaultId === a.id && <span className="ushp-label def">Default</span>}
                      </div>
                      <p>{a.line}, {a.city}, {a.state} {a.pincode}</p>
                      <small>{a.phone}</small>
                      <div className="ushp-addr-actions">
                        {defaultId !== a.id && (
                          <button type="button" className="dn-link" onClick={(e) => { e.preventDefault(); guard(() => makeDefaultAddress(a.id)); }}>Make default</button>
                        )}
                        {addresses.length > 1 && (
                          <button
                            type="button"
                            className="ushp-textbtn danger"
                            onClick={(e) => {
                              e.preventDefault();
                              guard(async () => {
                                await deleteAddress(a.id);
                                if (addrId === a.id) setAddrId(null);
                              });
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
                  saving={savingAddr}
                  serverErrors={addrErrors}
                  onCancel={() => { setAdding(false); setAddrErrors({}); }}
                  onSave={saveNewAddress}
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

              <div className="ushp-actions">
                <button type="button" className="dn-btn" onClick={() => setStep("payment")} disabled={adding || !address}>
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

              {(!cfg || !quote) && <PageLoader label="Checking payment options…" minHeight={120} />}

              {cfg && quote && (
                <div className="ushp-methods" role="radiogroup" aria-label="Payment method">
                  <div className={`ushp-method ${method === "RAZORPAY" ? "on" : ""}`}>
                    <label>
                      <input type="radio" name="pm" checked={method === "RAZORPAY"} disabled={!onlineOk} onChange={() => setMethod("RAZORPAY")} />
                      <span className="ushp-radio" aria-hidden="true" />
                      <span className="ushp-method-ico"><CreditCard size={18} /></span>
                      <div>
                        <strong>Pay online</strong>
                        <small>{onlineOk ? "UPI, cards, net banking and wallets" : "Not available right now"}</small>
                      </div>
                    </label>
                    {method === "RAZORPAY" && (
                      <div className="ushp-method-body">
                        <p className="ushp-note">A secure Razorpay window opens to take the payment. Your items are held for 30 minutes while you pay.</p>
                      </div>
                    )}
                  </div>

                  {codOk && (
                    <div className={`ushp-method ${method === "COD" ? "on" : ""}`}>
                      <label>
                        <input type="radio" name="pm" checked={method === "COD"} onChange={() => setMethod("COD")} />
                        <span className="ushp-radio" aria-hidden="true" />
                        <span className="ushp-method-ico"><Banknote size={18} /></span>
                        <div><strong>Pay on delivery</strong><small>Cash or UPI to the delivery partner</small></div>
                      </label>
                      {method === "COD" && (
                        <div className="ushp-method-body">
                          <p className="ushp-note">Pay {formatPrice(quote.total)} to the delivery partner. The order stays “payment pending” until it arrives.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {cfg && quote && !codOk && quote.cod_reason && (
                <p className="ushp-note" style={{ marginTop: 12 }}>{quote.cod_reason}</p>
              )}
              {cfg && quote && !onlineOk && !codOk && (
                <p className="dn-error" role="alert">No payment method is available right now. Please try again later.</p>
              )}

              <div className="ushp-actions split">
                <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setStep("address")}>Back</button>
                <button type="button" className="dn-btn" onClick={() => setStep("review")} disabled={!method || !quote}>Review order</button>
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

              <div className="ushp-review-grid">
                <div className="ushp-review-box">
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
                <div className="ushp-review-box">
                  <header>
                    <h4><CreditCard size={14} /> Payment</h4>
                    <button type="button" className="dn-link" onClick={() => setStep("payment")}><Pencil size={12} /> Change</button>
                  </header>
                  <p><strong>{methodLabel}</strong><br />{methodDetail}</p>
                </div>
              </div>

              {skipped > 0 && (
                <p className="ushp-note">{skipped} sample {skipped === 1 ? "piece" : "pieces"} in your cart can't be bought yet and {skipped === 1 ? "is" : "are"} left out.</p>
              )}
              {hasProblems && (
                <p className="dn-error" role="alert">Some pieces are no longer available: {Object.values(problems)[0]} Go back to your cart to remove them.</p>
              )}
              <ul className="ushp-review-items">
                {buyable.map((l) => (
                  <li key={l.id}>
                    <SafeImage src={l.item.image} alt={l.item.title} />
                    <div>
                      <strong>{l.item.title}</strong>
                      <span>{l.item.sellerType === "remaker" ? "Made by" : "Sold by"} {l.item.seller} · Qty {l.qty}</span>
                    </div>
                    <b>{formatPrice(l.item.price * l.qty)}</b>
                  </li>
                ))}
              </ul>

              <p className="ushp-terms"><ShieldCheck size={14} /> One order is created for each seller, so they can ship separately.</p>

              <div className="ushp-actions split">
                <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setStep("payment")}>Back</button>
                <button type="button" className="dn-btn ushp-big" onClick={place} disabled={!quote || hasProblems || !address || pay.state === "processing" || pay.state === "paying"}>
                  {pay.state === "processing" ? <Spinner label="Placing…" /> : <><Lock size={15} /> {method === "COD" ? "Place order" : `Pay ${formatPrice(quote?.total || 0)}`}</>}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="dn-card ushp-summary" aria-label="Order summary" aria-busy={q.loading}>
          <h3>Order summary</h3>
          <ul className="ushp-sum-items">
            {buyable.map((l) => (
              <li key={l.id}>
                <div className="ushp-sum-img"><SafeImage src={l.item.image} alt="" /><i>{l.qty}</i></div>
                <div><strong>{l.item.title}</strong><span>{l.item.seller}</span></div>
                <b>{formatPrice(l.item.price * l.qty)}</b>
              </li>
            ))}
          </ul>
          {q.error && <p className="dn-error" role="alert">{q.error} <button type="button" className="dn-link" onClick={q.retry}>Try again</button></p>}
          <dl>
            <div><dt>Subtotal</dt><dd>{quote ? formatPrice(quote.subtotal) : <Spinner />}</dd></div>
            <div><dt>Delivery</dt><dd>{quote ? (quote.delivery_fee ? formatPrice(quote.delivery_fee) : "Free") : <Spinner />}</dd></div>
            {quote && quote.platform_fee > 0 && <div><dt>{feeLabel()}</dt><dd>{formatPrice(quote.platform_fee)}</dd></div>}
            <div className="total"><dt>Total</dt><dd>{quote ? formatPrice(quote.total) : <Spinner />}</dd></div>
          </dl>
          {quote && quote.groups.length > 1 && (
            <p className="ushp-note">{quote.groups.length} sellers, so {quote.groups.length} separate orders. Delivery and fees are worked out for each.</p>
          )}
        </aside>
      </div>

      <PaymentOverlay
        state={pay.state}
        error={pay.error}
        amount={quote?.total || 0}
        onRetry={place}
        onChangeMethod={() => { setPay({ state: null, error: "" }); setStep("payment"); }}
      />
    </div>
  );
}
