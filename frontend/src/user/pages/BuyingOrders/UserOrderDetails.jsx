import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Ban,
  CalendarDays,
  CircleHelp,
  CreditCard,
  FileText,
  MapPin,
  MapPinned,
  Package,
  Phone,
  Receipt,
  RotateCcw,
  Star,
  Store,
  Truck,
  CheckCircle2,
  Info,
  Leaf,
} from "lucide-react";

import {
  PAYMENT_LABEL,
  ADDRESS,
  cancelOrder,
  canCancel,
  reviewOrder,
  useOrder,
} from "../../data/ordersStore";
import { formatDate, formatDateTime, relativeDay } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import CancelOrderModal from "./components/CancelOrderModal";
import ReviewModal from "./components/ReviewModal";
import SellerCard from "./components/SellerCard";
import OrderStepper from "./components/OrderStepper";
import { StatusBadge } from "./components/OrderBadges";
import { Stars } from "../../components/ui/Stars";
import { etaLine, inr } from "./components/OrderCard";

import "../../css/shared/ui-base.css";
import "../../css/orders/orders-base.css";
import "../../css/orders/UserOrderDetails.css";

export default function UserOrderDetails() {
  const { orderId } = useParams();
  const order = useOrder(orderId);
  const { toast, show } = useToast();

  const [cancelling, setCancelling] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  if (!order) {
    return (
      <div className="dn">
        <EmptyState
          icon={Package}
          title="We couldn't find that order"
          text="The link may be wrong or the order may have been removed."
          actionLabel="Back to my orders"
          to="/user-orders"
        />
      </div>
    );
  }

  const delivered = order.stage >= 5 && !order.cancelled;
  const shippedPhase = order.stage >= 3 && !order.cancelled && !delivered;
  const latest = order.events[order.events.length - 1];
  const co2 = Math.round((order.item.co2SavedKg || 0) * order.qty);

  return (
    <div className="dn ob ob-details">
      <Crumbs
        items={[
          { label: "My orders", to: "/user-orders" },
          { label: order.id },
        ]}
      />

      <header className="ob-head">
        <div>
          <div className="ob-head-meta">
            <span className="dn-dcard-id">ORDER {order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <h1>{order.item.title}</h1>
          <p className="dn-muted">
            Placed on {formatDateTime(order.placedAt)} · {order.qty}{" "}
            {order.qty === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="ob-head-actions">
          {!order.cancelled && !delivered && (
            <Link to={`/user-orders/${order.id}/track`} className="dn-btn">
              <MapPinned size={16} /> Track order
            </Link>
          )}
          {delivered && !order.review && (
            <button
              type="button"
              className="dn-btn"
              onClick={() => setReviewing(true)}
            >
              <Star size={16} /> Rate order
            </button>
          )}
          {delivered && (
            <Link
              to={`/user-marketplace/product/${order.itemId}`}
              className="dn-btn dn-btn--ghost"
            >
              <RotateCcw size={16} /> Buy again
            </Link>
          )}
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            onClick={() => show("Invoice downloaded (demo).")}
          >
            <FileText size={16} /> Invoice
          </button>
          {canCancel(order) && (
            <button
              type="button"
              className="dn-btn dn-btn--danger"
              onClick={() => setCancelling(true)}
            >
              <Ban size={16} /> Cancel
            </button>
          )}
        </div>
      </header>

      {/* ---------- state banner ---------- */}
      {order.cancelled && (
        <div className="dn-banner dn-banner--bad ob-banner">
          <Ban size={20} />
          <div>
            <strong>This order was cancelled</strong>
            Reason: {order.cancelReason}.{" "}
            {order.refund && (
              <>
                Refund of {inr(order.refund.amount)} is{" "}
                {order.refund.status === "Refunded"
                  ? `completed on ${formatDate(order.refund.at)}`
                  : "being processed to your original payment method"}
                .
              </>
            )}
          </div>
        </div>
      )}
      {shippedPhase && (
        <div className="dn-banner ob-banner">
          <Truck size={20} />
          <div>
            <strong>{etaLine(order)}</strong>
            {order.courier?.name} · AWB {order.courier?.awb}.{" "}
            <Link to={`/user-orders/${order.id}/track`} className="dn-link">
              See live tracking →
            </Link>
          </div>
        </div>
      )}
      {!order.cancelled && !shippedPhase && !delivered && (
        <div className="dn-banner dn-banner--warn ob-banner">
          <Info size={20} />
          <div>
            <strong>
              {order.status === "Processing"
                ? "The seller is packing your item"
                : "Order confirmed"}
            </strong>
            Expected delivery {relativeDay(order.eta).toLowerCase()} (
            {formatDate(order.eta)}). You can cancel for free until it ships.
          </div>
        </div>
      )}
      {delivered && (
        <div className="dn-banner ob-banner">
          <CheckCircle2 size={20} />
          <div>
            <strong>Delivered on {formatDate(latest.at)}</strong>
            This purchase saved about {co2} kg of CO₂. Thank you for choosing
            second-life products.
          </div>
        </div>
      )}

      <div className="ob-layout">
        {/* ================= main ================= */}
        <div className="ob-main">
          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h2>Item</h2>
              <Link
                to={`/user-marketplace/product/${order.itemId}`}
                className="dn-link"
              >
                View product →
              </Link>
            </div>
            <div className="ob-item">
              <SafeImage src={order.item.image} alt={order.item.title} />
              <div>
                <span className="dn-chip">{order.item.category}</span>
                <h3>{order.item.title}</h3>
                <p>{order.item.summary}</p>
                <ul>
                  <li>
                    Condition: <b>{order.item.condition}</b>
                  </li>
                  <li>
                    Qty: <b>{order.qty}</b>
                  </li>
                  <li>
                    <Leaf size={13} /> <b>{co2} kg</b> CO₂ saved
                  </li>
                </ul>
              </div>
              <strong className="ob-item-price">{inr(order.price)}</strong>
            </div>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <div>
                <h2>Order progress</h2>
                <small>
                  {order.cancelled
                    ? "Stopped when the order was cancelled."
                    : etaLine(order)}
                </small>
              </div>
              {!order.cancelled && !delivered && (
                <Link
                  to={`/user-orders/${order.id}/track`}
                  className="dn-btn dn-btn--soft dn-btn--sm"
                >
                  Full tracking
                </Link>
              )}
            </div>
            <OrderStepper order={order} />
            <ul className="ob-latest">
              {[...order.events]
                .reverse()
                .slice(0, 3)
                .map((event) => (
                  <li key={event.id}>
                    <b>{event.label}</b>
                    <span>{formatDateTime(event.at)}</span>
                  </li>
                ))}
            </ul>
          </section>

          {order.review && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <h2>Your review</h2>
                <Stars value={order.review.rating} size={18} />
              </div>
              <p className="ob-review-text">
                {order.review.text ||
                  "You rated this order without a written review."}
              </p>
              <Link
                to={order.sellerPath + "?tab=reviews"}
                className="dn-link"
                style={{ marginTop: 12 }}
              >
                See it on {order.seller?.name}'s profile →
              </Link>
            </section>
          )}
        </div>

        {/* ================= side ================= */}
        <aside className="ob-side">
          <SellerCard order={order} />

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h3>Price details</h3>
              <Receipt size={18} />
            </div>
            <dl className="ob-price">
              <div>
                <dt>
                  Item ({order.qty} × {inr(order.price)})
                </dt>
                <dd>{inr(order.price * order.qty)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{order.shipping ? inr(order.shipping) : "Free"}</dd>
              </div>
              {order.discount > 0 && (
                <div className="is-save">
                  <dt>Discount</dt>
                  <dd>− {inr(order.discount)}</dd>
                </div>
              )}
              <div className="is-total">
                <dt>{order.cancelled ? "Order total" : "Total paid"}</dt>
                <dd>{inr(order.total)}</dd>
              </div>
            </dl>
            <p className="ob-pay">
              <CreditCard size={15} /> Paid via {PAYMENT_LABEL[order.payment]}
            </p>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h3>Delivery address</h3>
              <MapPin size={18} />
            </div>
            <div className="ob-addr">
              <strong>{ADDRESS.name}</strong>
              <p>{ADDRESS.line}</p>
              <p>
                {ADDRESS.city}, {ADDRESS.state} – {ADDRESS.pincode}
              </p>
              <p className="dn-muted">
                <Phone size={13} /> {ADDRESS.phone}
              </p>
            </div>
          </section>

          {order.courier && !order.cancelled && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <h3>Courier</h3>
                <Truck size={18} />
              </div>
              <div className="ob-addr">
                <strong>{order.courier.name}</strong>
                <p className="dn-muted">AWB {order.courier.awb}</p>
              </div>
            </section>
          )}

          <section className="dn-card dn-card-pad ob-help">
            <CircleHelp size={22} />
            <div>
              <strong>Need help with this order?</strong>
              <p>Delivery, returns or refunds, we're here to help.</p>
              <Link to="/user-help" className="dn-link">
                Open Help & FAQ →
              </Link>
            </div>
          </section>

          <Link
            to="/user-orders"
            className="dn-btn dn-btn--ghost dn-btn--block"
          >
            <Store size={16} /> Back to all orders
          </Link>
        </aside>
      </div>

      {cancelling && (
        <CancelOrderModal
          order={order}
          onClose={() => setCancelling(false)}
          onConfirm={(reason) => {
            cancelOrder(order.id, reason);
            setCancelling(false);
            show("Order cancelled. Your refund has started.");
          }}
        />
      )}
      {reviewing && (
        <ReviewModal
          order={order}
          onClose={() => setReviewing(false)}
          onSubmit={(review) => {
            reviewOrder(order.id, review);
            setReviewing(false);
            show("Thanks! Your review has been posted.");
          }}
        />
      )}

      {toast}
    </div>
  );
}
