import React, { useState } from "react";
import MessageButton from "../../components/ui/MessageButton";
import { sellerChat } from "../../data/messageTargets";
import { Link, useParams } from "../../../shared/portalRouter";
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

import ReturnPanel from "../../../shared/components/ReturnPanel";
import {
  PAYMENT_LABEL,
  cancelOrder,
  canCancel,
  useOrder,
  useOrdersStatus,
} from "../../data/ordersStore";
import { PageLoader } from "../../../shared/components/Spinner";
import "../../../shared/components/Spinner.css";
import { formatDate, formatDateTime, relativeDay } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import CancelOrderModal from "./components/CancelOrderModal";
import SellerCard from "./components/SellerCard";
import OrderStepper from "./components/OrderStepper";
import { StatusBadge } from "./components/OrderBadges";
import { Stars } from "../../components/ui/Stars";
import { etaLine, inr } from "./components/OrderCard";
import { printInvoice } from "../Shop/invoice";

import "../../css/shared/ui-base.css";
import "../../css/orders/orders-base.css";
import "../../css/orders/UserOrderDetails.css";

export default function UserOrderDetails() {
  const { orderId } = useParams();
  const order = useOrder(orderId);
  const { toast, show } = useToast();

  const [cancelling, setCancelling] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const st = useOrdersStatus();

  if (!order && (st.loading || !st.loaded)) {
    return (
      <div className="dn">
        <PageLoader label="Loading your order…" />
      </div>
    );
  }

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
  const shippedPhase =
    order.stage >= 3 &&
    !order.cancelled &&
    !delivered &&
    order.apiStatus === "Shipped";
  const latest = order.events[order.events.length - 1] || {
    at: order.placedAt,
    label: order.status,
    detail: "",
  };

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
            <Link
              to={`/user-reviews?q=${encodeURIComponent(order.id)}`}
              className="dn-btn"
            >
              <Star size={16} /> Rate order
            </Link>
          )}
          {delivered && (
            <Link
              to={`/user-marketplace/product/${order.itemId}`}
              className="dn-btn dn-btn--ghost"
            >
              <RotateCcw size={16} /> Buy again
            </Link>
          )}
          <MessageButton
            target={{
              ...sellerChat(order.item),
              context: {
                label: `Order ${order.id} · ${order.item.title}`,
                to: `/user-orders/${order.id}`,
                image: order.item.image,
              },
            }}
            label={
              order.sellerIsRemaker
                ? "Message the ReMaker"
                : "Message the seller"
            }
          />
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            onClick={() => {
              if (!printInvoice(order))
                show("Allow pop-ups to open the invoice.");
            }}
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
      <ReturnPanel order={order} />
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
            {order.eta
              ? `Expected delivery ${relativeDay(order.eta).toLowerCase()} (${formatDate(order.eta)}). `
              : ""}
            You can cancel for free until it ships.
          </div>
        </div>
      )}
      {delivered && (
        <div className="dn-banner ob-banner">
          <CheckCircle2 size={20} />
          <div>
            <strong>Delivered on {formatDate(latest.at)}</strong>
            Thank you for choosing second-life products.
          </div>
        </div>
      )}

      <div className="ob-layout">
        {/* ================= main ================= */}
        <div className="ob-main">
          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h2>{order.lines.length > 1 ? "Items" : "Item"}</h2>
              <Link
                to={`/user-marketplace/product/${order.itemId}`}
                className="dn-link"
              >
                View product →
              </Link>
            </div>
            {order.lines.map((ln) => (
              <div className="ob-item" key={ln.id}>
                <SafeImage src={ln.cover} alt={ln.title} />
                <div>
                  <h3>{ln.title}</h3>
                  <ul>
                    <li>
                      Qty: <b>{ln.qty}</b>
                    </li>
                    <li>{inr(ln.unit_price)} each</li>
                  </ul>
                </div>
                <strong className="ob-item-price">{inr(ln.line_total)}</strong>
              </div>
            ))}
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
              <Link
                to={`/user-reviews?q=${encodeURIComponent(order.id)}`}
                className="dn-link"
                style={{ marginTop: 12 }}
              >
                See or edit it in My Reviews →
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
                  {order.lines.length > 1
                    ? `Items (${order.qty})`
                    : `Item (${order.qty} × ${inr(order.price)})`}
                </dt>
                <dd>{inr(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{order.shipping ? inr(order.shipping) : "Free"}</dd>
              </div>
              {order.platformFee > 0 && (
                <div>
                  <dt>Platform fee</dt>
                  <dd>{inr(order.platformFee)}</dd>
                </div>
              )}
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
              <CreditCard size={15} />{" "}
              {order.payment === "COD" && order.stage < 5 && !order.cancelled
                ? `Pay ${inr(order.total)} on delivery`
                : `Paid via ${PAYMENT_LABEL[order.payment]}`}
              {order.reference ? ` · ${order.reference}` : ""}
            </p>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h3>Delivery address</h3>
              <MapPin size={18} />
            </div>
            <div className="ob-addr">
              <strong>{order.address.name}</strong>
              <p>{order.address.line}</p>
              <p>
                {order.address.city}, {order.address.state} –{" "}
                {order.address.pincode}
              </p>
              <p className="dn-muted">
                <Phone size={13} /> {order.address.phone}
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
          busy={cancelBusy}
          onConfirm={async (reason) => {
            if (cancelBusy) return;
            setCancelBusy(true);
            try {
              await cancelOrder(order.id, reason);
              show(
                order.payment === "COD"
                  ? "Order cancelled."
                  : "Order cancelled. Your refund has started.",
              );
            } catch (e) {
              show(e.message || "Could not cancel this order.");
            } finally {
              setCancelBusy(false);
              setCancelling(false);
            }
          }}
        />
      )}
      {toast}
    </div>
  );
}
