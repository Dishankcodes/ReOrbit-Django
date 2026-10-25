import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, ArrowRight, Check, PackageX, MapPin, Truck, PackageCheck, ClipboardCheck, CreditCard, Download,
  RotateCw, ExternalLink, XCircle, Store, CalendarDays,
} from "lucide-react";

import { usePurchases, useShopProduct, addToCart, cancelPurchase, receivePurchase } from "../../data/shopStore";
import { formatDate, formatDateTime, formatINR, timeAgo, DEMO_TODAY } from "../../utils/format";
import ProductImg from "./components/ProductImg";
import ShopNav from "./components/ShopNav";
import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";
import { printInvoice } from "./invoice";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/shop/AdminShop.css";

const METHOD = { UPI: "UPI", CARD: "Card", NET_BANKING: "Net banking", WALLET: "ReOrbit Wallet", COD: "Pay on delivery" };
const CANCEL = { key: "cancel", tone: "danger", icon: "ban", needsReason: true, title: "Cancel this order?", body: "The seller is told the order was cancelled. If you already paid, the money is refunded and the stock goes back on sale.", confirmLabel: "Cancel order", reasonHint: "kept in the order timeline", placeholder: "e.g. Ordered by mistake" };
const RECEIVE = { key: "complete", tone: "positive", icon: "done", needsReason: false, title: "Mark this order as received?", body: "Confirm that the item reached you in good condition. The order will be completed.", confirmLabel: "Yes, I received it" };

function stageOf(o) {
  if (["Cancelled", "Returned"].includes(o.order_status)) return -1;
  if (o.order_status === "Completed") return 3;
  if (o.order_status === "Confirmed") return 1;
  return 0;
}

export default function AdminShopOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = usePurchases().find((o) => o.order_id === orderId) || null;
  const product = useShopProduct(order?.listing.id);
  const { toast, toastNode } = useToast();
  const [pending, setPending] = useState(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [orderId]);

  if (!order) {
    return (
      <div className="au-page sh-page"><ShopNav />
        <section className="au-panel"><EmptyState icon={PackageX} title="Purchase not found" text="This order is not one of your purchases, or the link is wrong." action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-shop/orders")}><ArrowLeft size={14} /> My purchases</button>} /></section>
      </div>
    );
  }

  const o = order; const t = o.transaction;
  const stage = stageOf(o);
  const open = ["Pending", "Confirmed"].includes(o.order_status);
  const eta = new Date(new Date(o.order_date).getTime() + 5 * 86400000);
  const lateEta = eta < DEMO_TODAY;
  const steps = [
    { label: "Order placed", icon: ClipboardCheck, at: o.order_date },
    { label: "Confirmed", icon: Check, at: o.events.find((e) => e.label === "Order confirmed")?.at },
    { label: "On the way", icon: Truck, at: null },
    { label: "Delivered", icon: PackageCheck, at: o.events.find((e) => e.label === "Delivered & completed")?.at },
  ];

  const confirm = (reason) => {
    if (pending.key === "cancel") { cancelPurchase(o, reason); toast(`Order ${o.order_id} cancelled`); }
    else { receivePurchase(o); toast(`Order ${o.order_id} marked as received`); }
    setPending(null);
  };

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-shop/orders" className="aup-back"><ArrowLeft size={15} /> My purchases</Link>
        <ChevronRight size={14} /><span aria-current="page">{o.order_id}</span>
      </nav>

      <section className="aup-hero">
        <div className="aup-hero-main">
          <span className="ao-hero-icon sh-hero-img"><ProductImg src={o.listing.image} alt="" /></span>
          <div className="aup-hero-info">
            <div className="aup-hero-name"><h2>{o.order_id}</h2><StatusBadge status={o.order_status} /><span className="ao-paychip"><small>Payment</small><StatusBadge status={t.payment_status} /></span></div>
            <ul className="aup-hero-meta">
              <li><CalendarDays size={14} /> Placed {formatDateTime(o.order_date)}</li>
              <li><CreditCard size={14} /> {METHOD[t.payment_method]}</li>
              <li><Store size={14} /> {o.seller.name}</li>
            </ul>
          </div>
        </div>
        <div className="ao-hero-side">
          <div className="ao-hero-total"><small>Order total</small><strong>{formatINR(o.amount)}</strong></div>
          <div className="aup-hero-actions">
            {o.order_status === "Confirmed" && <button type="button" className="aup-hero-btn tone-positive" onClick={() => setPending(RECEIVE)}><PackageCheck size={15} /> Mark received</button>}
            {open && <button type="button" className="aup-hero-btn tone-danger" onClick={() => setPending(CANCEL)}><XCircle size={15} /> Cancel</button>}
            <button type="button" className="aup-hero-btn" onClick={() => { if (!printInvoice(o)) toast("Allow pop-ups to download the invoice"); }}><Download size={15} /> Invoice</button>
          </div>
        </div>
      </section>

      {/* ---------- tracker ---------- */}
      {stage >= 0 ? (
        <section className="sh-track" aria-label="Order progress">
          <ol>
            {steps.map((s, i) => { const Icon = s.icon; return (
              <li key={s.label} className={i < stage ? "done" : i === stage ? "now" : ""}>
                <span>{i < stage || (i === stage && stage === 3) ? <Check size={16} /> : <Icon size={16} />}</span>
                <strong>{s.label}</strong>
                <small>{i <= stage && s.at ? formatDate(s.at) : i === 2 && stage < 3 ? (lateEta ? "Arriving soon" : `By ${formatDate(eta)}`) : "—"}</small>
              </li>); })}
          </ol>
        </section>
      ) : (
        <div className={`aup-notice ${o.order_status === "Cancelled" ? "tone-deleted" : "tone-suspended"}`} role="status">
          <strong>This order was {o.order_status.toLowerCase()}.</strong>
          <span>{o.order_status === "Cancelled" ? (o.cancel_reason ? `Reason: “${o.cancel_reason}”.` : "") : (o.return_reason ? `Reason: “${o.return_reason}”.` : "")} {t.payment_status === "Refunded" ? `${formatINR(o.amount)} was refunded.` : t.payment_status === "Success" ? "A refund is on its way." : ""}</span>
        </div>
      )}

      <div className="aup-grid-2">
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Item</h3><p>What you bought.</p></div>
              {product ? <Link to={`/admin-shop/product/${o.listing.id}`} className="aup-link">View product <ArrowRight size={14} /></Link> : null}</header>
            <div className="ao-item">
              <ProductImg src={o.listing.image} alt={o.listing.title} />
              <div>
                <span className={`ap-type ${o.listing.kind === "item" ? "item" : "product"}`}>{o.listing.kind === "item" ? "Community item" : "ReMaker product"}</span>
                <h3>{o.listing.title}</h3>
                <p><span className="aup-mono">{o.listing.id}</span> · {o.listing.category}</p>
                <div className="ao-item-price"><strong>{formatINR(o.listing.unit_price)}</strong><span>× {o.listing.quantity}</span></div>
              </div>
            </div>
            <div className="sh-item-cta">
              {product?.purchasable ? <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { addToCart(product.id, 1, product.available); toast("Added to cart"); }}><RotateCw size={13} /> Buy again</button> : <span className="sh-muted">This listing is no longer available.</span>}
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Seller</h3><p>Who you bought from.</p></div></header>
            <div className="sh-order-seller">
              <UserAvatar name={o.seller.name} src={o.seller.image} size={52} rounded="15px" />
              <div><strong>{o.seller.name}</strong><span>{o.seller.sub}</span><span><span className={`ap-role ${o.seller.type === "ReMaker" ? "rm" : ""}`}>{o.seller.type === "Admin" ? "Platform" : o.seller.type}</span> · {o.seller.city}</span></div>
              <div className="sh-order-seller-actions">
                {o.seller.type !== "Admin" && <Link to={`/admin-shop/seller/${o.seller.id}`} className="ad-btn ad-btn-ghost ad-btn-sm"><Store size={14} /> Visit shop</Link>}
                {o.seller.path && <Link to={o.seller.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> Profile</Link>}
              </div>
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Delivery</h3><p>Where it is going.</p></div></header>
            <div className="ao-addr">
              <div><h4><MapPin size={14} /> Deliver to</h4><p><strong>{o.delivery.name}</strong><br />{o.delivery.address}<br />{o.delivery.city}, {o.delivery.state} {o.delivery.pincode}<br />{o.delivery.phone}</p>{o.note && <p className="sh-note">Note: {o.note}</p>}</div>
              <div><h4><Truck size={14} /> Expected</h4><p><strong>{formatDate(eta)}</strong><br />{o.delivery_fee ? `Delivery charge ${formatINR(o.delivery_fee)}` : "Free delivery"}</p></div>
            </div>
          </section>
        </div>

        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Payment</h3><p>What you paid.</p></div><StatusBadge status={t.payment_status} /></header>
            <dl className="ao-bill">
              <div><dt>Price × {o.listing.quantity}</dt><dd>{formatINR(o.subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{o.delivery_fee ? formatINR(o.delivery_fee) : "Free"}</dd></div>
              <div><dt>Platform fee</dt><dd>{o.platform_fee ? formatINR(o.platform_fee) : "Waived"}</dd></div>
              <div className="total"><dt>Total</dt><dd>{formatINR(o.amount)}</dd></div>
            </dl>
            <dl className="ao-txn">
              <div><dt>Transaction ID</dt><dd className="aup-mono">{t.transaction_id}</dd></div>
              <div><dt>Method</dt><dd>{METHOD[t.payment_method]}</dd></div>
              <div><dt>Reference</dt><dd className="aup-mono">{t.reference || "—"}</dd></div>
              <div><dt>Paid on</dt><dd>{t.transaction_date ? formatDateTime(t.transaction_date) : "—"}</dd></div>
            </dl>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Order timeline</h3><p>From placing to today ({timeAgo(o.order_date)}).</p></div></header>
            <ol className="apd-tl">
              {o.events.map((e) => (
                <li key={e.id}><i className={`apd-dot ${e.tone}`} /><div><strong>{e.label}</strong><p>{e.detail}</p>{!e.pending && <time>{formatDateTime(e.at)}</time>}</div></li>
              ))}
            </ol>
            <Link to={`/admin-orders/${o.order_id}`} className="sh-link center sh-inadmin"><ExternalLink size={13} /> Open in Admin Orders</Link>
          </section>
        </div>
      </div>

      <ConfirmActionModal action={pending} targets={[o.order_id]} onConfirm={confirm} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
