import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Banknote, Check, CircleAlert, Copy, MapPin, Package, PackageCheck, ReceiptText,
  Store, Truck, UserRound, Undo2,
} from "lucide-react";

import { orderOptionsApi } from "../../api/orders";
import Spinner, { PageLoader } from "./Spinner";
import "./Spinner.css";
import "./SellerOrderDetails.css";

/* One order, full page, for the seller (member or ReMaker) and for admin.
     <SellerOrderDetails api={salesApi} role="remaker" accent="#421517" listPath="/remaker-sales" listLabel="Orders from customers" />
   Everything on it is real: it reads /orders/sales|admin/<id>/ and every button calls the same
   action endpoint the list used to, so the server decides what is allowed. */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const day = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");

const STATUS_TEXT = {
  Pending_Payment: "Waiting for payment", Confirmed: "To pack", Packed: "Packed, to ship", Shipped: "On the way",
  Delivered: "Delivered", Cancelled: "Cancelled", Delivery_Failed: "Not delivered", Returned_To_Origin: "Returned to seller",
};
const PAY_TEXT = {
  Pending: "Waiting for payment", COD_Due: "Pay on delivery", COD_Collected: "Cash with the courier",
  Refund_Pending: "Refund on its way", Refunded: "Refunded", Refund_Failed: "Refund needs attention", Void: "Not charged",
};
const RETURN_TEXT = {
  Requested: "Waiting for the seller", Approved: "Approved, item on its way back", Rejected: "Rejected by the seller",
  Escalated: "With ReOrbit", Refunded: "Refunded", Closed: "Closed, no refund",
};
const payLabel = (o) => {
  const p = o.payment;
  if (p.status === "Paid") return p.method === "COD" ? "Cash received by ReOrbit" : "Paid online";
  return PAY_TEXT[p.status] || p.status;
};
const STEPS = [
  { key: "Confirmed", label: "Order placed", icon: ReceiptText, at: (o) => o.confirmed_at || o.created_at },
  { key: "Packed", label: "Packed", icon: Package, at: () => null },
  { key: "Shipped", label: "Shipped", icon: Truck, at: (o) => o.shipped_at },
  { key: "Delivered", label: "Delivered", icon: PackageCheck, at: (o) => o.delivered_at },
];
const RANK = { Pending_Payment: -1, Confirmed: 0, Packed: 1, Shipped: 2, Delivered: 3 };
const fieldErr = (errs, k) => (errs[k] ? <small>{errs[k][0]}</small> : null);

function Progress({ o }) {
  const done = RANK[o.status];
  if (done === undefined) return null; /* cancelled / not delivered get their own notice */
  return (
    <ol className="sod-steps" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const Icon = i < done || (i === done && o.status === "Delivered") ? Check : s.icon;
        const state = i < done || o.status === "Delivered" ? "done" : i === done ? "now" : "todo";
        return (
          <li key={s.key} className={state}>
            <span><Icon size={16} /></span>
            <b>{s.label}</b>
            <small>{state === "todo" ? "" : day(s.at(o))}</small>
          </li>
        );
      })}
    </ol>
  );
}

function Copyable({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="sod-copy" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function SellerOrderDetails({ api, role = "user", accent = "#2a4d3a", listPath, listLabel = "Orders" }) {
  const { orderId } = useParams();
  const isAdmin = role === "admin";
  const [o, setO] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); /* null | ship | cancel | update | fail | cod | reject | decide */
  const [vals, setVals] = useState({ courier_name: "", other: "", tracking_no: "", reason: "", text: "", note: "", reference: "", approve: "true", fault: "" });
  const [busy, setBusy] = useState("");
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");
  const [opts, setOpts] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(() => {
    setError("");
    api.get(orderId).then(setO).catch((e) => setError(e.status === 404 ? "notfound" : e.message || "Could not load this order."));
  }, [api, orderId]);
  useEffect(() => { setO(null); setForm(null); load(); window.scrollTo({ top: 0 }); }, [load]);

  useEffect(() => {
    if (form === "ship" || form === "fail" || form === "decide") orderOptionsApi.get().then(setOpts).catch(() => {});
  }, [form]);

  const say = (m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 3500); };
  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }));
  const openForm = (name, extra = {}) => { setForm(name); setErrs({}); setMsg(""); setVals((v) => ({ ...v, ...extra })); };

  const act = async (action, body = {}, done = "") => {
    if (busy) return;
    setBusy(action); setErrs({}); setMsg("");
    try {
      setO(await api.act(orderId, action, body));
      setForm(null);
      say(done || "Order updated.");
    } catch (e) {
      setErrs(e.errors || {});
      setMsg(e.errors ? "" : e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const wrap = (children) => <div className="sod" style={{ "--so-accent": accent }}>{children}</div>;
  const crumbs = (last) => (
    <nav className="sod-crumbs" aria-label="Breadcrumb">
      <Link to={listPath}><ArrowLeft size={15} /> {listLabel}</Link><span>/</span><b>{last}</b>
    </nav>
  );

  if (error === "notfound") {
    return wrap(
      <div className="sod-empty">
        <h2>We couldn't find that order</h2>
        <p>The link may be out of date, or the order belongs to someone else.</p>
        <Link to={listPath} className="sod-btn">Back to orders</Link>
      </div>,
    );
  }
  if (error) {
    return wrap(<>{crumbs(orderId)}<p className="sod-error" role="alert">{error} <button type="button" onClick={load}>Try again</button></p></>);
  }
  if (!o) return wrap(<>{crumbs(orderId)}<PageLoader label="Loading order…" /></>);

  const a = o.address || {};
  const ret = o.return;
  const platform = o.seller.type === "platform";
  const next = { Confirmed: ["pack", "Mark as packed"], Packed: ["ship", "Mark as shipped"], Shipped: ["deliver", "Mark as delivered"] }[o.status];
  const courierValue = vals.courier_name === "Other" ? vals.other : vals.courier_name;
  const failFault = opts?.fail_reasons?.find((r) => r.code === vals.reason)?.fault;
  const codWaiting = isAdmin && o.payment.method === "COD" && o.status === "Delivered" && !o.cod_received_at && o.payment.status !== "Paid";
  const returnOpen = ret && ["Requested", "Approved", "Escalated"].includes(ret.status);
  const canDecide = isAdmin && ret && ["Requested", "Rejected", "Escalated", "Approved"].includes(ret.status);
  const mine = !isAdmin;
  const hasActions = next || o.can_cancel || o.status === "Shipped" || o.status === "Delivery_Failed" || codWaiting
    || (mine && ret?.status === "Requested") || (ret?.status === "Approved" && (mine || isAdmin)) || canDecide;

  const hint = {
    Pending_Payment: "The buyer hasn't finished paying yet. It moves to your orders as soon as the payment goes through.",
    Confirmed: "Pack the item safely, then mark it as packed.",
    Packed: "Hand the parcel to a courier and add the tracking number. You pay for shipping; the delivery fee the buyer paid is added to your earning.",
    Shipped: "Mark it delivered once the buyer has it. If the courier couldn't deliver, mark it as not delivered.",
    Delivered: o.seller_earning
      ? (o.payment.method === "COD" && !o.cod_received_at && o.payment.status !== "Paid"
        ? "Your earning starts clearing once ReOrbit receives the cash from the courier."
        : "Your earning is held for 7 days after delivery, then it's available to withdraw. An open return pauses it.")
      : "",
    Delivery_Failed: "The parcel couldn't be delivered. Try again, or mark it as back with the seller.",
  }[o.status];

  return wrap(
    <>
      {crumbs(o.id)}

      <header className="sod-head">
        <div>
          <span className="sod-eyebrow">Order</span>
          <h1>{o.id} <Copyable text={o.id} /></h1>
          <p>Placed {when(o.created_at)}</p>
        </div>
        <div className="sod-badges">
          <span className={`sod-badge s-${o.status}`}>{STATUS_TEXT[o.status] || o.status}</span>
          <span className="sod-badge pay">{payLabel(o)}</span>
          {ret && <span className="sod-badge ret">Return: {RETURN_TEXT[ret.status] || ret.status}</span>}
        </div>
      </header>

      {toast && <p className="sod-toast" role="status"><Check size={15} /> {toast}</p>}

      <div className="sod-grid">
        <div className="sod-main">
          <section className="sod-card sod-status">
            <Progress o={o} />
            {o.status === "Cancelled" && (
              <p className="sod-alert bad"><CircleAlert size={16} /> Cancelled{o.cancelled_by ? ` by ${o.cancelled_by}` : ""}{o.cancel_reason ? `: ${o.cancel_reason}` : ""}{o.cancelled_at ? ` · ${when(o.cancelled_at)}` : ""}</p>
            )}
            {o.failed && (
              <p className="sod-alert bad"><CircleAlert size={16} /> Not delivered: {o.failed.label}{o.failed.note ? ` · ${o.failed.note}` : ""} ({o.failed.fault === "seller" ? "seller or courier at fault" : "buyer at fault"})</p>
            )}
            {o.status === "Returned_To_Origin" && <p className="sod-alert"><Undo2 size={16} /> The parcel is back with the seller and the stock was put back.</p>}
            {o.payment.status === "Refund_Failed" && <p className="sod-alert bad"><CircleAlert size={16} /> The refund needs attention. ReOrbit has been told.</p>}
            {hint && <p className="sod-hint">{hint}</p>}
            {isAdmin && codWaiting && <p className="sod-hint">Cash of {inr(o.total)} is with the courier. Confirm it once it reaches ReOrbit.</p>}
            {msg && <p className="sod-error" role="alert">{msg}</p>}

            {form === "ship" && (
              <div className="sod-form">
                <label>Courier
                  <select value={vals.courier_name} onChange={set("courier_name")}>
                    <option value="">Choose a courier</option>
                    {(opts?.couriers || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {fieldErr(errs, "courier_name")}
                </label>
                {vals.courier_name === "Other" && <label>Courier name<input value={vals.other} onChange={set("other")} maxLength={40} placeholder="Courier name" /></label>}
                <label>Tracking number<input value={vals.tracking_no} onChange={set("tracking_no")} maxLength={40} placeholder="Exactly as the courier gave it" />{fieldErr(errs, "tracking_no")}</label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
                  <button type="button" className="sod-btn" onClick={() => act("ship", { courier_name: courierValue, tracking_no: vals.tracking_no }, "Marked as shipped. The buyer was told.")} disabled={!!busy}>{busy === "ship" ? <Spinner label="Saving…" /> : "Confirm shipped"}</button>
                </div>
              </div>
            )}
            {form === "cancel" && (
              <div className="sod-form">
                <label>Reason (the buyer is told)<input value={vals.reason} onChange={set("reason")} maxLength={200} placeholder="e.g. Item damaged, out of material" />{fieldErr(errs, "reason")}</label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Keep order</button>
                  <button type="button" className="sod-btn danger" onClick={() => act("cancel", { reason: vals.reason }, "Order cancelled.")} disabled={!!busy}>{busy === "cancel" ? <Spinner label="Cancelling…" /> : "Cancel order"}</button>
                </div>
              </div>
            )}
            {form === "update" && (
              <div className="sod-form">
                <label>Message to the buyer<input value={vals.text} onChange={set("text")} maxLength={120} placeholder="e.g. Out for delivery today" />{fieldErr(errs, "text")}</label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
                  <button type="button" className="sod-btn" onClick={() => act("update", { text: vals.text }, "The buyer was told.")} disabled={!!busy}>{busy === "update" ? <Spinner label="Sending…" /> : "Send update"}</button>
                </div>
              </div>
            )}
            {form === "fail" && (
              <div className="sod-form">
                <label>Why was it not delivered?
                  <select value={vals.reason} onChange={set("reason")}>
                    <option value="">Choose a reason</option>
                    {(opts?.fail_reasons || []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                  </select>
                  {fieldErr(errs, "reason")}
                </label>
                {failFault && <p className="sod-hint">{failFault === "seller" ? "The buyer will be refunded in full if the parcel comes back." : "If the parcel comes back the buyer is refunded without the delivery fee, and the seller earns nothing."}</p>}
                <label>Note (optional)<input value={vals.note} onChange={set("note")} maxLength={200} /></label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
                  <button type="button" className="sod-btn danger" onClick={() => act("fail", { reason: vals.reason, note: vals.note }, "Marked as not delivered.")} disabled={!!busy}>{busy === "fail" ? <Spinner label="Saving…" /> : "Mark not delivered"}</button>
                </div>
              </div>
            )}
            {form === "cod" && (
              <div className="sod-form">
                <label>Reference (optional)<input value={vals.reference} onChange={set("reference")} maxLength={60} placeholder="Courier remittance / UTR" /></label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
                  <button type="button" className="sod-btn" onClick={() => act("cod-received", { reference: vals.reference }, "Cash recorded. The seller's clearing days have started.")} disabled={!!busy}>{busy === "cod-received" ? <Spinner label="Saving…" /> : `Cash of ${inr(o.total)} received`}</button>
                </div>
              </div>
            )}
            {form === "reject" && (
              <div className="sod-form">
                <label>Why are you rejecting it? (the buyer sees this)<input value={vals.note} onChange={set("note")} maxLength={300} />{fieldErr(errs, "note")}</label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
                  <button type="button" className="sod-btn danger" onClick={() => act("return-reject", { note: vals.note }, "Return rejected.")} disabled={!!busy}>{busy === "return-reject" ? <Spinner label="Saving…" /> : "Reject return"}</button>
                </div>
              </div>
            )}
            {form === "decide" && (
              <div className="sod-form">
                <label>Decision
                  <select value={vals.approve} onChange={set("approve")}>
                    <option value="true">Approve the return</option>
                    <option value="false">Close it, no refund</option>
                  </select>
                </label>
                {vals.approve === "true" && (
                  <label>Who is at fault?
                    <select value={vals.fault} onChange={set("fault")}>
                      <option value="">As the buyer's reason says ({ret?.fault === "seller" ? "seller" : "buyer"})</option>
                      <option value="seller">Seller (delivery fee refunded, seller pays return shipping)</option>
                      <option value="buyer">Buyer (delivery fee kept, buyer pays return shipping)</option>
                    </select>
                  </label>
                )}
                <label>Reason for your decision (both sides see it)<input value={vals.note} onChange={set("note")} maxLength={300} />{fieldErr(errs, "note")}</label>
                <div className="sod-actions">
                  <button type="button" className="sod-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
                  <button type="button" className="sod-btn" onClick={() => act("return-decide", { approve: vals.approve === "true", fault: vals.fault, note: vals.note }, "Decision saved.")} disabled={!!busy}>{busy === "return-decide" ? <Spinner label="Saving…" /> : "Save decision"}</button>
                </div>
              </div>
            )}

            {!form && hasActions && (
              <div className="sod-actions">
                {o.can_cancel && <button type="button" className="sod-btn ghost danger" onClick={() => openForm("cancel")} disabled={!!busy}>Cancel order</button>}
                {o.status === "Shipped" && (
                  <>
                    <button type="button" className="sod-btn ghost" onClick={() => openForm("update", { text: "" })} disabled={!!busy}>Update buyer</button>
                    <button type="button" className="sod-btn ghost danger" onClick={() => openForm("fail", { reason: "", note: "" })} disabled={!!busy}>Not delivered</button>
                  </>
                )}
                {o.status === "Delivery_Failed" && (
                  <>
                    <button type="button" className="sod-btn ghost" onClick={() => act("retry", {}, "Back on its way.")} disabled={!!busy}>{busy === "retry" ? <Spinner label="Saving…" /> : "Try delivery again"}</button>
                    <button type="button" className="sod-btn" onClick={() => act("returned", {}, "Parcel marked as back with the seller.")} disabled={!!busy}>{busy === "returned" ? <Spinner label="Saving…" /> : "Parcel is back with the seller"}</button>
                  </>
                )}
                {codWaiting && <button type="button" className="sod-btn" onClick={() => openForm("cod", { reference: "" })} disabled={!!busy}>Cash received</button>}
                {mine && ret?.status === "Requested" && (
                  <>
                    <button type="button" className="sod-btn ghost danger" onClick={() => openForm("reject", { note: "" })} disabled={!!busy}>Reject return</button>
                    <button type="button" className="sod-btn" onClick={() => act("return-approve", {}, "Return approved. The buyer sends the item back.")} disabled={!!busy}>{busy === "return-approve" ? <Spinner label="Saving…" /> : "Approve return"}</button>
                  </>
                )}
                {ret?.status === "Approved" && (
                  <button type="button" className="sod-btn" onClick={() => act("return-received", {}, "Item received. The refund is being made.")} disabled={!!busy}>{busy === "return-received" ? <Spinner label="Saving…" /> : "Item received, refund buyer"}</button>
                )}
                {canDecide && <button type="button" className={`sod-btn${ret.status === "Escalated" ? "" : " ghost"}`} onClick={() => openForm("decide", { approve: ret.status === "Approved" ? "false" : "true", fault: "", note: "" })} disabled={!!busy}>{ret.status === "Approved" ? "Close return" : "Decide return"}</button>}
                {next && (
                  <button type="button" className="sod-btn" disabled={!!busy} onClick={() => (next[0] === "ship" ? openForm("ship") : act(next[0], {}, next[0] === "pack" ? "Marked as packed." : "Marked as delivered."))}>
                    {busy === next[0] ? <Spinner label="Saving…" /> : next[1]}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="sod-card">
            <h3>Items</h3>
            <ul className="sod-lines">
              {o.items.map((ln) => (
                <li key={ln.id}>
                  {ln.cover ? <img src={ln.cover} alt="" loading="lazy" /> : <span className="sod-noimg"><Package size={20} /></span>}
                  <div><b>{ln.title}</b><small>{ln.qty} × {inr(ln.unit_price)}</small></div>
                  <span>{inr(ln.line_total)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="sod-card">
            <h3>Delivery</h3>
            <div className="sod-two">
              <div>
                <h4><MapPin size={14} /> Deliver to</h4>
                <p>{a.name}<br />{[a.line1, a.line2].filter(Boolean).join(", ")}{a.landmark ? <><br />Landmark: {a.landmark}</> : null}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
                {o.note && <p className="sod-note">Buyer's note: {o.note}</p>}
              </div>
              <div>
                <h4><Truck size={14} /> Courier</h4>
                {o.courier ? (
                  <p>{o.courier.name}<br />Tracking: <b>{o.courier.tracking_no}</b> <Copyable text={o.courier.tracking_no} /></p>
                ) : (
                  <p className="sod-muted">{["Shipped", "Delivered"].includes(o.status) ? "No courier details were added." : "Added when you mark it as shipped. The seller arranges and pays for shipping."}</p>
                )}
              </div>
            </div>
          </section>

          {ret && (
            <section className="sod-card sod-return">
              <h3>Return request <span className="sod-badge ret">{RETURN_TEXT[ret.status] || ret.status}</span></h3>
              <p><b>{ret.reason.label}</b></p>
              {ret.details && <p>{ret.details}</p>}
              {ret.photos?.length > 0 && (
                <div className="sod-photos">{ret.photos.map((p) => <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt="Photo from the buyer" loading="lazy" /></a>)}</div>
              )}
              <p className="sod-muted">
                {ret.fault === "seller" ? "Seller pays return shipping and the delivery fee is refunded." : "Buyer pays return shipping. The delivery fee is not refunded."}
                {returnOpen ? ` The refund will be ${inr(ret.expected_refund)}.` : ret.status === "Refunded" ? ` Refunded ${inr(ret.refund_amount)}.` : ""}
              </p>
              {ret.seller_note && <p className="sod-muted">Seller: {ret.seller_note}</p>}
              {ret.admin_note && <p className="sod-muted">ReOrbit: {ret.admin_note}</p>}
            </section>
          )}

          <section className="sod-card">
            <h3>Activity</h3>
            {(o.events || []).length === 0 ? <p className="sod-muted">Nothing yet.</p> : (
              <ol className="sod-timeline">
                {[...o.events].reverse().map((e, i) => (
                  <li key={`${e.label}-${i}`}>
                    <span className="dot" />
                    <div><b>{e.label}</b>{e.detail ? <small>{e.detail}</small> : null}</div>
                    <time>{when(e.at)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="sod-side">
          <section className="sod-card">
            <h3><UserRound size={15} /> Buyer</h3>
            {o.buyer ? (
              <dl className="sod-facts">
                <div><dt>Name</dt><dd>{o.buyer.name}</dd></div>
                <div><dt>Account</dt><dd>{o.buyer.type === "remaker" ? "ReMaker" : o.buyer.type === "admin" ? "ReOrbit admin" : "Member"}</dd></div>
                {o.buyer.email && <div><dt>Email</dt><dd>{o.buyer.email}</dd></div>}
                {a.city && <div><dt>City</dt><dd>{a.city}</dd></div>}
              </dl>
            ) : <p className="sod-muted">Not available.</p>}
          </section>

          {isAdmin && (
            <section className="sod-card">
              <h3><Store size={15} /> Seller</h3>
              <dl className="sod-facts">
                <div><dt>Name</dt><dd>{platform ? "ReOrbit store" : o.seller.name}</dd></div>
                <div><dt>Type</dt><dd>{platform ? "Platform" : o.seller.type === "remaker" ? "ReMaker" : "Member"}</dd></div>
              </dl>
            </section>
          )}

          <section className="sod-card">
            <h3><Banknote size={15} /> Payment</h3>
            <dl className="sod-sum">
              <div><dt>Items</dt><dd>{inr(o.subtotal)}</dd></div>
              <div><dt>Delivery fee</dt><dd>{o.delivery_fee ? inr(o.delivery_fee) : "Free"}</dd></div>
              <div><dt>Platform fee</dt><dd>{inr(o.platform_fee)}</dd></div>
              {o.discount > 0 && <div><dt>Voucher</dt><dd>− {inr(o.discount)}</dd></div>}
              <div className="total"><dt>Buyer paid</dt><dd>{inr(o.total)}</dd></div>
            </dl>
            <p className="sod-muted">{payLabel(o)}{o.payment.method === "COD" && o.payment.status === "Paid" ? "" : o.payment.method === "COD" ? " (cash on delivery)" : ""}</p>
            {!platform && (
              <p className="sod-earn">
                {isAdmin ? "Seller earns" : "You earn"} <b>{inr(o.seller_earning)}</b>
                <small>Items plus the delivery fee. The platform fee is ReOrbit's.</small>
              </p>
            )}
            {o.payment.method === "COD" && o.status !== "Delivered" && o.status !== "Cancelled" && !isAdmin && !platform && (
              <p className="sod-muted">The courier collects {inr(o.total)} on delivery.</p>
            )}
            {(o.refunds || []).length > 0 && (
              <div className="sod-refunds">
                <h4>Refunds</h4>
                {o.refunds.map((r, i) => <p key={r.id || i}>{inr(r.amount)} · {r.status === "Done" ? "sent" : r.status === "Failed" ? "needs attention" : "on its way"}</p>)}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>,
  );
}
