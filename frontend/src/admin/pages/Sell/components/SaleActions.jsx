import React, { useState } from "react";
import { X, Truck } from "lucide-react";
import { ORDER_ACTION_LIST } from "../../../data/orderActions";
import { runOrderAction } from "../../../data/ordersStore";
import { shipSale } from "../../../data/sellStore";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../../components/ui/actionIcons";

const COURIERS = ["Delhivery", "Blue Dart", "Ecom Express", "India Post Speed", "DTDC", "Self delivery (ReOrbit van)"];

/* The wording for the seller's side of each order action. */
const A = ORDER_ACTION_LIST;
const SELLER = {
  confirm: { ...A.confirm, label: "Accept order", short: "Accept order", title: "Accept this order?", body: "The buyer is told you are preparing the order. Stock stays reserved for them.", confirmLabel: "Accept order", toast: "accepted" },
  markPaid: { ...A.markPaid, body: "Use this when the money has reached ReOrbit but the gateway has not updated yet.", toast: "marked as paid" },
  complete: { ...A.complete, label: "Mark as delivered", short: "Mark delivered", title: "Mark this order as delivered?", body: "Confirm that the buyer received the product. For pay-on-delivery orders the cash is recorded as collected.", confirmLabel: "Mark delivered", toast: "marked as delivered" },
  cancel: { ...A.cancel, label: "Cancel order", short: "Cancel", title: "Cancel this order?", body: "The buyer is told the order was cancelled. Paid orders are refunded and the stock goes back on sale.", reasonHint: "the buyer sees this", placeholder: "e.g. Item damaged in the warehouse", toast: "cancelled" },
  decline: { ...A.cancel, key: "cancel", label: "Decline order", short: "Decline", title: "Decline this order?", body: "The buyer is told you cannot fulfil it. Paid orders are refunded and the stock goes back on sale.", confirmLabel: "Decline order", reasonHint: "the buyer sees this", placeholder: "e.g. Item no longer available", toast: "declined" },
  return: { ...A.return, toast: "marked as returned" },
  refund: { ...A.refund, toast: "refunded" },
};
const SHIP = { key: "ship", label: "Ship order", short: "Ship order", tone: "positive", icon: "truck" };

/* what the seller can do next, in the order they will want to do it */
export function sellerActions(o) {
  const s = o.order_status; const t = o.transaction;
  const list = [];
  if (s === "Pending") {
    if (t.payment_status === "Pending" && t.payment_method !== "COD") list.push({ ...SELLER.markPaid, primary: false });
    if (t.payment_status !== "Failed") list.push({ ...SELLER.confirm, primary: true });
    list.push({ ...SELLER.decline, primary: false });
  } else if (s === "Confirmed") {
    if (!o.shipment) { list.push({ ...SHIP, primary: true }); list.push({ ...SELLER.cancel, primary: false }); }
    else list.push({ ...SELLER.complete, primary: true });
    if (t.payment_status === "Pending" && t.payment_method !== "COD") list.unshift({ ...SELLER.markPaid, primary: false });
  } else if (s === "Completed") {
    list.push({ ...SELLER.return, primary: false });
  }
  if (o.refundDue) list.push({ ...SELLER.refund, primary: true });
  return list;
}

/* Action buttons + their modals. `size` is "sm" in lists. */
export default function SaleActions({ order, size = "md", only = null, onDone }) {
  const [pending, setPending] = useState(null);
  const [ship, setShip] = useState(false);
  const all = sellerActions(order);
  const actions = only === "primary" ? all.filter((a) => a.primary).slice(0, 1) : all;
  if (!actions.length) return null;

  const click = (a) => (a.key === "ship" ? setShip(true) : setPending(a));
  const confirm = (reason) => {
    runOrderAction(order.order_id, pending.key, reason);
    onDone?.(`Order ${order.order_id} ${pending.toast}.`);
    setPending(null);
  };

  return (
    <>
      {actions.map((a) => {
        const Icon = ACTION_ICONS[a.icon] || Truck;
        return size === "hero" ? (
          <button key={a.label} type="button" className={`aup-hero-btn tone-${a.tone}`} onClick={() => click(a)}><Icon size={15} /> {a.short}</button>
        ) : (
          <button key={a.label} type="button" className={`ad-btn ${a.primary ? "ad-btn-primary" : "ad-btn-ghost"} ad-btn-sm`} onClick={() => click(a)}><Icon size={13} /> {a.short}</button>
        );
      })}
      <ConfirmActionModal action={pending} targets={[order.order_id]} onConfirm={confirm} onClose={() => setPending(null)} />
      <ShipModal open={ship} order={order} onClose={() => setShip(false)} onShip={(d) => { shipSale(order.order_id, d); onDone?.(`Order ${order.order_id} shipped with ${d.courier}.`); setShip(false); }} />
    </>
  );
}

function ShipModal({ open, order, onShip, onClose }) {
  const [courier, setCourier] = useState(COURIERS[0]);
  const [tracking, setTracking] = useState("");
  const [touched, setTouched] = useState(false);
  React.useEffect(() => {
    if (!open) return undefined;
    setCourier(COURIERS[0]); setTracking(""); setTouched(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const bad = tracking.trim().length < 6;
  const submit = (e) => { e.preventDefault(); setTouched(true); if (!bad) onShip({ courier, tracking: tracking.trim().toUpperCase() }); };
  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="sl-ship-title" onSubmit={submit}>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="ad-modal-icon tone-positive"><Truck size={22} strokeWidth={1.7} /></div>
        <h3 id="sl-ship-title">Ship this order</h3>
        <p className="ad-modal-text">Hand {order.listing.title} to the courier and add the tracking number. The buyer is notified.</p>
        <label className="ad-modal-field"><span>Courier</span>
          <select value={courier} onChange={(e) => setCourier(e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="ad-modal-field"><span>Tracking number</span>
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. DL1234567890" autoFocus />
          {touched && bad && <small className="ad-modal-error">Enter the tracking number (at least 6 characters).</small>}
        </label>
        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn-primary"><Truck size={14} /> Mark as shipped</button>
        </div>
      </form>
    </div>
  );
}
