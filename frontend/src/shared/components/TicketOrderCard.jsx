import React from "react";
import { Link } from "react-router-dom";
import { Package, ExternalLink } from "lucide-react";
import "./TicketOrderCard.css";

/* The order a support ticket is about: status, money, items and who sold it, with a link to the
   full order page for whichever side is looking. Used on the admin, member and ReMaker ticket pages. */
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const day = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const METHOD = { COD: "Cash on delivery", RAZORPAY: "Paid online" };

export function orderLink(scope, order) {
  if (!order?.id) return "";
  if (scope === "admin") return `/admin-orders/${order.id}`;
  if (scope === "remaker") {
    return order.role === "seller" ? `/remaker-sales/${order.id}` : `/remaker-orders/${order.id}`;
  }
  return order.role === "seller" ? `/user-sell/sales/${order.id}` : `/user-orders/${order.id}`;
}

export default function TicketOrderCard({ order, scope }) {
  if (!order) return null;
  if (order.missing) {
    return (
      <section className="toc">
        <h3><Package size={15} /> Order {order.id}</h3>
        <p className="toc-muted">This order is no longer available.</p>
      </section>
    );
  }
  const to = orderLink(scope, order);
  const method = METHOD[order.paymentMethod] || order.paymentMethod;
  return (
    <section className="toc" aria-label={`Order ${order.id}`}>
      <header>
        <h3><Package size={15} /> Order {order.id}</h3>
        <span className={`toc-status s-${String(order.status).toLowerCase()}`}>{order.statusLabel}</span>
      </header>

      <ul className="toc-items">
        {order.items.map((it, i) => (
          <li key={i}>
            {it.image ? <img src={it.image} alt="" /> : <span className="toc-ph" aria-hidden="true" />}
            <div>
              <strong>{it.title}</strong>
              <small>{it.qty} × {money(it.price)}</small>
            </div>
          </li>
        ))}
        {order.itemCount > order.items.reduce((n, i) => n + i.qty, 0) && (
          <li className="toc-more">and more items in this order</li>
        )}
      </ul>

      <dl className="toc-facts">
        <div><dt>Total</dt><dd>{money(order.total)}</dd></div>
        {method && <div><dt>Payment</dt><dd>{method}</dd></div>}
        <div><dt>Placed</dt><dd>{day(order.placedAt)}</dd></div>
        {order.deliveredAt && <div><dt>Delivered</dt><dd>{day(order.deliveredAt)}</dd></div>}
        {order.tracking && <div><dt>Tracking</dt><dd>{order.courier ? `${order.courier} · ` : ""}{order.tracking}</dd></div>}
        {scope === "admin" && <div><dt>Buyer</dt><dd>{order.buyer?.name}</dd></div>}
        {(scope === "admin" || order.role === "buyer") && <div><dt>Sold by</dt><dd>{order.seller?.name}</dd></div>}
        {scope !== "admin" && order.role === "seller" && <div><dt>Bought by</dt><dd>{order.buyer?.name}</dd></div>}
        {order.return && <div><dt>Return</dt><dd>{order.return.id} · {order.return.status}</dd></div>}
      </dl>

      {to && (
        <Link className="toc-open" to={to}>
          Open order <ExternalLink size={13} />
        </Link>
      )}
    </section>
  );
}
