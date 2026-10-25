import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Ban,
  CalendarCheck,
  Copy,
  KeyRound,
  MapPin,
  MapPinned,
  Package,
  PartyPopper,
  Phone,
  ShieldCheck,
  Truck,
  Warehouse,
  Home,
} from "lucide-react";

import { ADDRESS, STAGES, useOrder } from "../../data/ordersStore";
import { formatDate, formatLongDate, relativeDay } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import OrderStepper from "./components/OrderStepper";
import SellerCard from "./components/SellerCard";
import TrackTimeline from "./components/TrackTimeline";
import { StatusBadge } from "./components/OrderBadges";
import { inr } from "./components/OrderCard";

import "../../css/shared/ui-base.css";
import "../../css/orders/orders-base.css";
import "../../css/orders/UserOrderTrack.css";

const ROUTE_PROGRESS = [0, 6, 18, 46, 88, 100];

/* a stable fake distance per seller city, just for the demo route card */
const distanceFor = (city = "") =>
  300 + (Array.from(city).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 1200);

export default function UserOrderTrack() {
  const { orderId } = useParams();
  const order = useOrder(orderId);
  const { toast, show } = useToast();

  if (!order) {
    return (
      <div className="dn">
        <EmptyState
          icon={Package}
          title="We couldn't find that order"
          text="Check the order ID or open it from your orders list."
          actionLabel="Back to my orders"
          to="/user-orders"
        />
      </div>
    );
  }

  const cancelled = order.cancelled;
  const delivered = order.stage >= 5 && !cancelled;
  const onTheWay = order.stage >= 3 && !cancelled && !delivered;
  const progress = cancelled ? ROUTE_PROGRESS[order.stage] : ROUTE_PROGRESS[order.stage];
  const origin = order.seller?.city || "Seller";
  const km = distanceFor(origin);
  const code = String((parseInt(order.id.replace(/\D/g, ""), 10) * 7) % 9000 + 1000);
  const next = !cancelled && !delivered ? STAGES[order.stage + 1] : null;
  const lastEvent = order.events[order.events.length - 1];

  const copyAwb = async () => {
    try {
      await navigator.clipboard.writeText(order.courier.awb);
      show("Tracking number copied.");
    } catch {
      show("Couldn't copy. Select the number and copy it.");
    }
  };

  /* headline for the big card */
  let title;
  let sub;
  if (cancelled) {
    title = "Order cancelled";
    sub = order.refund
      ? `Refund of ${inr(order.refund.amount)} is ${order.refund.status === "Refunded" ? "completed" : "on its way to you"}.`
      : "No further updates.";
  } else if (delivered) {
    title = `Delivered on ${formatDate(lastEvent.at)}`;
    sub = "Your order reached you. We hope you love it.";
  } else {
    const day = relativeDay(order.eta);
    title = day === "Today" ? "Arriving today" : `Arriving ${day.toLowerCase()}`;
    sub = `Expected by ${formatLongDate(order.eta)}`;
  }

  return (
    <div className="dn ob ob-track">
      <Crumbs
        items={[
          { label: "My orders", to: "/user-orders" },
          { label: order.id, to: `/user-orders/${order.id}` },
          { label: "Track" },
        ]}
      />

      {/* ---------- hero ---------- */}
      <section className={`ob-hero ${cancelled ? "is-cancelled" : delivered ? "is-delivered" : ""}`}>
        <div className="ob-hero-copy">
          <div className="ob-head-meta">
            <span className="ob-hero-id">ORDER {order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <h1>{title}</h1>
          <p>{sub}</p>

          <Link to={`/user-orders/${order.id}`} className="ob-hero-item">
            <SafeImage src={order.item.image} alt="" />
            <span>
              <strong>{order.item.title}</strong>
              <small>{order.qty} {order.qty === 1 ? "item" : "items"} · {inr(order.total)}</small>
            </span>
          </Link>
        </div>

        <div className="ob-hero-icon" aria-hidden="true">
          {cancelled ? <Ban size={54} /> : delivered ? <PartyPopper size={54} /> : onTheWay ? <Truck size={54} /> : <Warehouse size={54} />}
        </div>
      </section>

      {/* ---------- stepper ---------- */}
      <section className="dn-card dn-card-pad">
        <OrderStepper order={order} />
        {next && (
          <p className="ob-next">
            <CalendarCheck size={15} /> Next: <b>{next.label}</b>. {next.text}
          </p>
        )}
      </section>

      <div className="ob-layout">
        <div className="ob-main">
          {/* route */}
          {!cancelled && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <div>
                  <h2>Shipment route</h2>
                  <small>About {km} km from {origin} to {ADDRESS.city}</small>
                </div>
                <span className="dn-chip">{progress}% of the way</span>
              </div>

              <div className="ob-route">
                <div className="ob-route-end">
                  <span><Warehouse size={20} /></span>
                  <strong>{origin}</strong>
                  <small>Seller</small>
                </div>

                <div className="ob-route-line">
                  <i style={{ width: `${progress}%` }} />
                  <span className="ob-route-truck" style={{ left: `${progress}%` }}>
                    {delivered ? <Home size={16} /> : <Truck size={16} />}
                  </span>
                </div>

                <div className="ob-route-end">
                  <span className={delivered ? "is-done" : ""}><Home size={20} /></span>
                  <strong>{ADDRESS.city}</strong>
                  <small>You</small>
                </div>
              </div>
            </section>
          )}

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <div>
                <h2>Tracking history</h2>
                <small>Latest updates first</small>
              </div>
            </div>
            <TrackTimeline order={order} />
          </section>
        </div>

        <aside className="ob-side">
          {order.courier && !cancelled && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head"><h3>Courier</h3><Truck size={18} /></div>
              <div className="ob-courier">
                <span>{order.courier.name.charAt(0)}</span>
                <div>
                  <strong>{order.courier.name}</strong>
                  <small>Tracking no.</small>
                  <code>{order.courier.awb}</code>
                </div>
              </div>
              <div className="ob-courier-actions">
                <button type="button" className="dn-btn dn-btn--soft dn-btn--sm" onClick={copyAwb}>
                  <Copy size={14} /> Copy number
                </button>
                {onTheWay && (
                  <a href={`tel:${order.courier.phone.replace(/\s/g, "")}`} className="dn-btn dn-btn--ghost dn-btn--sm">
                    <Phone size={14} /> Call
                  </a>
                )}
              </div>
            </section>
          )}

          {order.stage >= 4 && !cancelled && !delivered && (
            <section className="dn-card ob-code">
              <KeyRound size={22} />
              <small>Delivery code</small>
              <strong>{code.split("").join(" ")}</strong>
              <p>Share this code with the courier only when you receive your parcel.</p>
            </section>
          )}

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><h3>Delivering to</h3><MapPin size={18} /></div>
            <div className="ob-addr">
              <strong>{ADDRESS.name}</strong>
              <p>{ADDRESS.line}</p>
              <p>{ADDRESS.city}, {ADDRESS.state} – {ADDRESS.pincode}</p>
            </div>
          </section>

          <SellerCard order={order} compact />

          <section className="dn-card dn-card-pad ob-help">
            <ShieldCheck size={22} />
            <div>
              <strong>Something wrong with delivery?</strong>
              <p>Tell us if the parcel is delayed or damaged.</p>
              <Link to="/user-help" className="dn-link">Get help →</Link>
            </div>
          </section>

          <Link to={`/user-orders/${order.id}`} className="dn-btn dn-btn--ghost dn-btn--block">
            <MapPinned size={16} /> View order details
          </Link>
        </aside>
      </div>

      {toast}
    </div>
  );
}
