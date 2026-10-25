import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  PackageX,
  MapPin,
  Truck,
  PackageCheck,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  CalendarDays,
  User,
  Mail,
  Wallet,
  Boxes,
  Hourglass,
} from "lucide-react";

import { useSale, useSellListing, saleStage } from "../../data/sellStore";
import {
  formatDate,
  formatDateTime,
  formatINR,
  timeAgo,
} from "../../utils/format";
import SellNav from "./components/SellNav";
import SaleActions, { sellerActions } from "./components/SaleActions";
import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/shop/AdminShop.css";
import "../../css/sell/AdminSell.css";

const METHOD = {
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Pay on delivery",
};

export default function AdminSaleDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const o = useSale(orderId);
  const listing = useSellListing(o?.listing.id);
  const { toast, toastNode } = useToast();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [orderId]);

  if (!o) {
    return (
      <div className="au-page sh-page">
        <SellNav />
        <section className="au-panel">
          <EmptyState
            icon={PackageX}
            title="Sale not found"
            text="This order is not one of your sales, or the link is wrong."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-sell/sales")}
              >
                <ArrowLeft size={14} /> All sales
              </button>
            }
          />
        </section>
      </div>
    );
  }

  const t = o.transaction;
  const stage = saleStage(o);
  const isCod = t.payment_method === "COD";
  const shipped = o.events.find((e) => e.id === "shipped");
  const steps = [
    { label: "Order placed", icon: ClipboardCheck, at: o.order_date },
    {
      label: "Accepted",
      icon: Check,
      at: o.events.find((e) => e.label === "Order confirmed")?.at,
    },
    { label: "Shipped", icon: Truck, at: o.shipment?.shipped_at },
    {
      label: "Delivered",
      icon: PackageCheck,
      at: o.events.find((e) => e.label === "Delivered & completed")?.at,
    },
  ];
  const next = sellerActions(o).find((a) => a.primary);
  const NEXT = {
    confirm: "Accept the order so the buyer knows you are preparing it.",
    ship: "Hand it to a courier and add the tracking number.",
    complete: "Mark it delivered once the buyer has received it.",
    refund: "Return the buyer's money to finish this order.",
  };

  return (
    <div className="au-page sh-page">
      <SellNav />
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-sell/sales" className="aup-back">
          <ArrowLeft size={15} /> Sales
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">{o.order_id}</span>
      </nav>

      <section className="aup-hero">
        <div className="aup-hero-main">
          <span className="ao-hero-icon sh-hero-img">
            <img src={o.listing.image} alt="" />
          </span>
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{o.order_id}</h2>
              <StatusBadge
                status={
                  o.order_status === "Confirmed" && o.shipment
                    ? "Shipped"
                    : o.order_status
                }
              />
              <span className="ao-paychip">
                <small>Payment</small>
                <StatusBadge status={t.payment_status} />
              </span>
            </div>
            <ul className="aup-hero-meta">
              <li>
                <CalendarDays size={14} /> Placed {formatDateTime(o.order_date)}
              </li>
              <li>
                <User size={14} /> {o.buyer.name}
              </li>
              <li>
                <CreditCard size={14} /> {METHOD[t.payment_method]}
              </li>
            </ul>
          </div>
        </div>
        <div className="ao-hero-side">
          <div className="ao-hero-total">
            <small>You earn</small>
            <strong>{formatINR(o.amount)}</strong>
          </div>
          <div className="aup-hero-actions">
            <SaleActions order={o} size="hero" onDone={toast} />
          </div>
        </div>
      </section>

      {/* ---------- tracker ---------- */}
      {stage >= 0 ? (
        <section className="sh-track" aria-label="Order progress">
          <ol>
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.label}
                  className={i < stage ? "done" : i === stage ? "now" : ""}
                >
                  <span>
                    {i < stage || (i === stage && stage === 3) ? (
                      <Check size={16} />
                    ) : (
                      <Icon size={16} />
                    )}
                  </span>
                  <strong>{s.label}</strong>
                  <small>{i <= stage && s.at ? formatDate(s.at) : "—"}</small>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <div
          className={`aup-notice ${o.order_status === "Cancelled" ? "tone-deleted" : "tone-suspended"}`}
          role="status"
        >
          <strong>This order was {o.order_status.toLowerCase()}.</strong>
          <span>
            {o.order_status === "Cancelled"
              ? o.cancel_reason && `Reason: “${o.cancel_reason}”. `
              : o.return_reason && `Reason: “${o.return_reason}”. `}
            The units went back into stock.
            {t.payment_status === "Refunded" ? " The buyer was refunded." : ""}
          </span>
        </div>
      )}
      {next && stage >= 0 && (
        <div className="sl-next" role="status">
          <Hourglass size={16} />
          <div>
            <strong>Next step</strong>
            <span>{NEXT[next.key] || NEXT.confirm}</span>
          </div>
        </div>
      )}
      {o.order_status === "Pending" && t.payment_status === "Failed" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>The buyer's payment failed.</strong>
          <span>
            You cannot accept the order until they pay. Decline it if they do
            not retry.
          </span>
        </div>
      )}
      {o.order_status === "Pending" &&
        t.payment_status === "Pending" &&
        !isCod && (
          <div className="aup-notice tone-suspended" role="status">
            <strong>Waiting for the buyer's payment.</strong>
            <span>
              Mark the payment received once the money arrives, or accept
              anyway.
            </span>
          </div>
        )}
      {o.refundDue && (
        <div className="aup-notice tone-blocked" role="status">
          <strong>
            A refund of {formatINR(o.amount)} is due to {o.buyer.name}.
          </strong>
          <span>Issue the refund to finish this order.</span>
        </div>
      )}

      <div className="aup-grid-2">
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Product sold</h3>
                <p>What this order is for.</p>
              </div>
              <Link
                to={`/admin-sell/listing/${o.listing.id}`}
                className="aup-link"
              >
                View listing <ArrowRight size={14} />
              </Link>
            </header>
            <div className="ao-item">
              <img src={o.listing.image} alt={o.listing.title} />
              <div>
                <span className="ap-type product">Your listing</span>
                <h3>{o.listing.title}</h3>
                <p>
                  <span className="aup-mono">{o.listing.id}</span> ·{" "}
                  {o.listing.category}
                </p>
                <div className="ao-item-price">
                  <strong>{formatINR(o.listing.unit_price)}</strong>
                  <span>× {o.listing.quantity}</span>
                </div>
              </div>
            </div>
            {listing && (
              <p className="sl-stocknote">
                <Boxes size={14} /> {listing.available} of {listing.quantity}{" "}
                units left in stock.
              </p>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Buyer</h3>
                <p>Who ordered it.</p>
              </div>
            </header>
            <div className="sh-order-seller">
              <UserAvatar
                name={o.buyer.name}
                src={o.buyer.image}
                size={52}
                rounded="15px"
              />
              <div>
                <strong>{o.buyer.name}</strong>
                <span>
                  <Mail size={12} /> {o.buyer.email}
                </span>
                <span>
                  <span
                    className={`ap-role ${o.buyer.type === "ReMaker" ? "rm" : ""}`}
                  >
                    {o.buyer.type}
                  </span>{" "}
                  · {o.buyer.city} · <StatusBadge status={o.buyer.status} />
                </span>
              </div>
              {o.buyer.path && (
                <div className="sh-order-seller-actions">
                  <Link
                    to={o.buyer.path}
                    className="ad-btn ad-btn-ghost ad-btn-sm"
                  >
                    <ExternalLink size={14} /> View{" "}
                    {o.buyer.type === "User" ? "user" : "ReMaker"}
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Shipping</h3>
                <p>Where it ships from and to.</p>
              </div>
            </header>
            <div className="ao-addr">
              <div>
                <h4>
                  <MapPin size={14} /> Ship from
                </h4>
                <p>
                  <strong>{o.pickup_from.name}</strong>
                  <br />
                  {o.pickup_from.address}
                  <br />
                  {o.pickup_from.city}, {o.pickup_from.state}{" "}
                  {o.pickup_from.pincode}
                </p>
              </div>
              <div>
                <h4>
                  <Truck size={14} /> Deliver to
                </h4>
                <p>
                  <strong>{o.delivery.name}</strong>
                  <br />
                  {o.delivery.address}
                  <br />
                  {o.delivery.city}, {o.delivery.state} {o.delivery.pincode}
                  <br />
                  {o.delivery.phone}
                </p>
              </div>
            </div>
            <div className={`sl-shipbox ${o.shipment ? "on" : ""}`}>
              {o.shipment ? (
                <>
                  <Truck size={18} />
                  <div>
                    <strong>{o.shipment.courier}</strong>
                    <span>
                      Tracking <b className="aup-mono">{o.shipment.tracking}</b>{" "}
                      · shipped {formatDateTime(o.shipment.shipped_at)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Truck size={18} />
                  <div>
                    <strong>Not shipped yet</strong>
                    <span>
                      {o.order_status === "Confirmed"
                        ? "Use “Ship order” to add the courier and tracking number."
                        : "Shipping starts after you accept the order."}
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Payment</h3>
                <p>What the buyer pays you.</p>
              </div>
              <StatusBadge status={t.payment_status} />
            </header>
            <dl className="ao-bill">
              <div>
                <dt>Price × {o.listing.quantity}</dt>
                <dd>{formatINR(o.subtotal)}</dd>
              </div>
              <div>
                <dt>Delivery charged</dt>
                <dd>{o.delivery_fee ? formatINR(o.delivery_fee) : "Free"}</dd>
              </div>
              <div>
                <dt>Platform fee</dt>
                <dd>None (your own sale)</dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>{formatINR(o.amount)}</dd>
              </div>
            </dl>
            <dl className="ao-txn">
              <div>
                <dt>Transaction ID</dt>
                <dd className="aup-mono">{t.transaction_id}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{METHOD[t.payment_method]}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd className="aup-mono">{t.reference || "—"}</dd>
              </div>
              <div>
                <dt>Paid on</dt>
                <dd>
                  {t.transaction_date
                    ? formatDateTime(t.transaction_date)
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Order timeline</h3>
                <p>From placing to today ({timeAgo(o.order_date)}).</p>
              </div>
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
            <Link
              to={`/admin-orders/${o.order_id}`}
              className="sh-link center sh-inadmin"
            >
              <ExternalLink size={13} /> Open in Admin Orders
            </Link>
          </section>
        </div>
      </div>
      {toastNode}
    </div>
  );
}
