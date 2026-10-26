import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, MapPinned, Package, RotateCcw, Star } from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { formatDate, relativeDay } from "../../../utils/format";
import { StatusBadge } from "./OrderBadges";
import OrderStepper from "./OrderStepper";
import { SellerChip } from "./SellerCard";

export const inr = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export function etaLine(order) {
  if (order.cancelled) return "Cancelled · refund " + (order.refund?.status === "Refunded" ? "completed" : "in progress");
  if (order.stage >= 5) return `Delivered on ${formatDate(order.events[order.events.length - 1].at)}`;
  const day = relativeDay(order.eta);
  return day === "Today" ? "Arriving today" : `Arriving ${day.toLowerCase()} · ${formatDate(order.eta)}`;
}

export default function OrderCard({ order }) {
  const navigate = useNavigate();
  const open = () => navigate(`/user-orders/${order.id}`);
  const track = (event) => {
    event.stopPropagation();
    navigate(`/user-orders/${order.id}/track`);
  };

  return (
    <article
      className="ob-card"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => event.key === "Enter" && open()}
    >
      <header className="ob-card-head">
        <div>
          <b>{order.id}</b>
          <span><CalendarDays size={13} /> Placed {formatDate(order.placedAt)}</span>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <div className="ob-card-body">
        <SafeImage src={order.item.image} alt={order.item.title} className="ob-card-img" />

        <div className="ob-card-info">
          <small>{order.item.category}{order.qty > 1 ? ` · Qty ${order.qty}` : ""}</small>
          <h3>{order.item.title}</h3>
          <p className="ob-eta">
            {order.cancelled ? <RotateCcw size={14} /> : order.stage >= 5 ? <Package size={14} /> : <MapPinned size={14} />}
            {etaLine(order)}
          </p>
          <SellerChip order={order} />
        </div>

        <div className="ob-card-side">
          <strong>{inr(order.total)}</strong>
          <span>{order.qty} {order.qty === 1 ? "item" : "items"}</span>
        </div>
      </div>

      <footer className="ob-card-foot">
        <OrderStepper order={order} compact />
        <div className="ob-card-actions">
          {order.stage >= 5 && !order.cancelled && !order.review && (
            <span className="ob-rate-hint"><Star size={13} /> Rate this order</span>
          )}
          {!order.cancelled && order.stage < 5 && (
            <button type="button" className="dn-btn dn-btn--sm" onClick={track}>
              <MapPinned size={14} /> Track order
            </button>
          )}
          <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={open}>
            Details <ChevronRight size={14} />
          </button>
        </div>
      </footer>
    </article>
  );
}
