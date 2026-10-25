import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, ArrowRight, PackageX, Package, ShieldCheck, MapPin, Mail, Truck, Warehouse,
  CalendarDays, ExternalLink, AlertTriangle, ShoppingBag, UserRound,
} from "lucide-react";

import { useOrder, runOrderAction } from "../../data/ordersStore";
import { getOrderActions } from "../../data/orderActions";
import { FLOW_LABELS } from "../../data/adminOrders";
import { formatDate, formatDateTime, formatINR, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";

const METHOD_LABEL = { UPI: "UPI", CARD: "Card", NET_BANKING: "Net banking", WALLET: "Wallet", COD: "Cash on delivery" };

function Party({ label, party }) {
  return (
    <div className="ao-party">
      <span className="ao-party-label">{label}</span>
      <div className="ao-party-main">
        {party.type === "Admin" ? (
          <span className="ao-platform-icon" style={{ width: 52, height: 52, borderRadius: 15 }}><ShieldCheck size={24} /></span>
        ) : (
          <UserAvatar name={party.name} src={party.image} size={52} rounded="15px" />
        )}
        <div>
          <strong>{party.name}</strong>
          <span className="sub">{party.sub}</span>
          <span><span className={`ap-role ${party.type === "ReMaker" ? "rm" : party.type === "Admin" ? "adm" : ""}`}>{party.type === "Admin" ? "Platform" : party.type}</span></span>
        </div>
      </div>
      <div className="ao-party-rows">
        <div><Mail size={14} /> {party.email}</div>
        <div><MapPin size={14} /> {party.city}</div>
        <div><StatusBadge status={party.status} /></div>
      </div>
      {party.path ? (
        <Link to={party.path} className="ad-btn ad-btn-ghost ad-btn-sm">
          <ExternalLink size={14} /> View {party.type === "User" ? "user" : "ReMaker"} profile
        </Link>
      ) : (
        <span className="ap-muted">The platform account has no profile page.</span>
      )}
    </div>
  );
}

function Address({ title, icon: Icon, address }) {
  return (
    <div>
      <h4><Icon size={14} /> {title}</h4>
      <p>
        <strong>{address.name}</strong><br />
        {address.address}<br />
        {address.city}, {address.state} {address.pincode}<br />
        {address.phone}
      </p>
    </div>
  );
}

export default function AdminOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const { toast, toastNode } = useToast();
  const [pending, setPending] = useState(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [orderId]);

  if (!order) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={PackageX}
            title="Order not found"
            text="This order does not exist or the link is wrong."
            action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-orders")}><ArrowLeft size={14} /> Back to orders</button>}
          />
        </section>
      </div>
    );
  }

  const o = order;
  const t = o.transaction;
  const actions = getOrderActions(o);
  const isItem = o.listing.kind === "item";
  const toWarehouse = o.buyer.type === "Admin";

  const confirmAction = (reason) => {
    runOrderAction(o.order_id, pending.key, reason);
    toast(`Order ${o.order_id} ${pending.toast}.`);
    setPending(null);
  };

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-orders" className="aup-back"><ArrowLeft size={15} /> Orders</Link>
        <ChevronRight size={14} />
        <span aria-current="page">{o.order_id}</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="aup-hero">
        <div className="aup-hero-main">
          <span className="ao-hero-icon"><ShoppingBag size={38} strokeWidth={1.4} /></span>
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{o.order_id}</h2>
              <StatusBadge status={o.order_status} />
              <span className="ao-paychip"><small>Payment</small><StatusBadge status={t.payment_status} /></span>
            </div>
            <ul className="aup-hero-meta">
              <li><CalendarDays size={14} /> Placed {formatDateTime(o.order_date)}</li>
              <li><Package size={14} /> {FLOW_LABELS[o.flow]}</li>
              <li><Truck size={14} /> {isItem ? "Item" : "Product"} order</li>
            </ul>
          </div>
        </div>
        <div className="ao-hero-side">
          <div className="ao-hero-total">
            <small>Order total</small>
            <strong>{formatINR(o.amount)}</strong>
          </div>
          {actions.length > 0 && (
            <div className="aup-hero-actions">
              {actions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return (
                  <button key={a.key} type="button" className={`aup-hero-btn tone-${a.tone}`} onClick={() => setPending(a)}>
                    <Icon size={15} /> {a.short}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- notices ---------- */}
      {o.refundDue && (
        <div className="aup-notice tone-blocked" role="status">
          <strong>A refund of {formatINR(o.amount)} is due to {o.buyer.name}.</strong>
          <span>The order is {o.order_status.toLowerCase()} but the payment was not refunded yet. Use “Refund” to return it to the buyer.</span>
        </div>
      )}
      {o.order_status === "Cancelled" && o.cancel_reason && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This order was cancelled.</strong>
          <span>Reason: “{o.cancel_reason}”</span>
        </div>
      )}
      {o.order_status === "Returned" && o.return_reason && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This order was returned.</strong>
          <span>Reason: “{o.return_reason}”</span>
        </div>
      )}
      {o.order_status === "Pending" && t.payment_status === "Failed" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>The payment for this order failed.</strong>
          <span>The order cannot be confirmed until the buyer pays. You can cancel it if the buyer does not retry.</span>
        </div>
      )}
      {o.order_status === "Pending" && t.payment_status === "Pending" && !o.isCod && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>Waiting for the buyer’s payment.</strong>
          <span>Once the money arrives, mark the payment as received so the order can be confirmed.</span>
        </div>
      )}

      <div className="aup-grid-2">
        {/* ---------- left ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>{isItem ? "Item ordered" : "Product ordered"}</h3><p>What this order is for.</p></div>
              <Link to={o.listing.path} className="aup-link">View listing <ArrowRight size={14} /></Link>
            </header>
            <div className="ao-item">
              <img src={o.listing.image} alt={o.listing.title} />
              <div>
                <span className={`ap-type ${isItem ? "item" : "product"}`}>{isItem ? "Community item" : "ReMaker product"}</span>
                <h3>{o.listing.title}</h3>
                <p><span className="aup-mono">{o.listing.id}</span> · {o.listing.category}</p>
                <div className="ao-item-price">
                  <strong>{formatINR(o.listing.unit_price)}</strong>
                  <span>× {o.listing.quantity}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>Seller and buyer</h3><p>Who sold it and who bought it.</p></div>
            </header>
            <div className="ao-parties">
              <Party label="Seller" party={o.seller} />
              <span className="ao-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
              <Party label="Buyer" party={o.buyer} />
            </div>
            {[o.seller, o.buyer].some((p) => p.path && p.status !== "Active") && (
              <p className="apd-warn" style={{ marginTop: 16 }}>
                <AlertTriangle size={15} /> One of these accounts is not active. Check the account before confirming or completing this order.
              </p>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>Pickup and delivery</h3><p>Where it is collected from and where it goes.</p></div>
            </header>
            <div className="ao-addr">
              <Address title="Pickup from" icon={o.seller.type === "Admin" ? Warehouse : MapPin} address={o.pickup_from} />
              <Address title={toWarehouse ? "Drop at warehouse" : "Deliver to"} icon={toWarehouse ? Warehouse : Truck} address={o.delivery} />
            </div>
          </section>
        </div>

        {/* ---------- right ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>Payment</h3><p>Amount and transaction details.</p></div>
              <StatusBadge status={t.payment_status} />
            </header>
            <dl className="ao-bill">
              <div><dt>{o.listing.kind === "item" ? "Item price" : "Product price"} × {o.listing.quantity}</dt><dd>{formatINR(o.subtotal)}</dd></div>
              <div><dt>Platform fee (3%)</dt><dd>{formatINR(o.platform_fee)}</dd></div>
              <div><dt>Delivery</dt><dd>{o.delivery_fee ? formatINR(o.delivery_fee) : "Free"}</dd></div>
              <div className="total"><dt>Total</dt><dd>{formatINR(o.amount)}</dd></div>
            </dl>
            <dl className="ao-txn">
              <div><dt>Transaction ID</dt><dd className="aup-mono">{t.transaction_id}</dd></div>
              <div><dt>Method</dt><dd>{METHOD_LABEL[t.payment_method]}</dd></div>
              <div><dt>Reference</dt><dd className="aup-mono">{t.reference || "—"}</dd></div>
              <div><dt>Transaction date</dt><dd>{t.transaction_date ? formatDateTime(t.transaction_date) : "—"}</dd></div>
            </dl>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>Order timeline</h3><p>From placing to today ({timeAgo(o.order_date)}).</p></div>
            </header>
            <ol className="apd-tl">
              {o.events.map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div>
                    <strong>{e.label}</strong>
                    <p>{e.detail}</p>
                    {!e.pending && <time>{formatDateTime(e.at)}</time>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmActionModal action={pending} targets={[o.order_id]} onConfirm={confirmAction} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
