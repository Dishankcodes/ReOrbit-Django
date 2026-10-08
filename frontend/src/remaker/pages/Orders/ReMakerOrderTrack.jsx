import React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { OrderNotFound } from "./ReMakerOrderDetails";
import { StatusBadge, Timeline } from "../../pages-components/OrderParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import {
  DEFAULT_ADDRESS,
  advanceOrder,
  buildTimeline,
  canReport,
  describeStatus,
  flowOf,
  formatDate,
  stageIndex,
  useOrder,
} from "../../data/ordersStore";

import "../../css/ReMakerOrders.css";

export default function ReMakerOrderTrack() {
  const { orderId } = useParams();
  const order = useOrder(orderId);

  if (!order) return <OrderNotFound />;

  return <Track key={order.id} order={order} />;
}

function Track({ order }) {
  const [params] = useSearchParams();
  const demo = params.get("demo") === "1";

  const status = describeStatus(order);
  const isPickup = order.fulfilment === "pickup";
  const flow = flowOf(order);
  const index = stageIndex(order);
  const steps = buildTimeline(order);
  const ended = order.status === "Cancelled" || order.status === "Returned";
  const finished = order.status === "Completed";

  let headline = "";
  if (order.status === "Cancelled") headline = "This order was cancelled";
  else if (order.status === "Returned") headline = "This order was returned";
  else if (finished) headline = isPickup ? "You collected your order" : "Your order was delivered";
  else if (order.stage === "out_for_delivery") headline = "Arriving today";
  else if (order.stage === "ready") headline = "Ready for you to collect";
  else if (order.eta) headline = `${isPickup ? "Ready by" : "Arriving by"} ${formatDate(order.eta)}`;

  return (
    <section className="rod rod-track">
      <nav className="rod-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-orders">My orders</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/remaker-orders/${order.id}`}>{order.id}</Link>
        <span aria-hidden="true">/</span>
        <strong>Track</strong>
      </nav>

      {/* HEADER */}
      <header className="rod-track-head">
        <div className="rod-track-item">
          <img src={order.image} alt="" />
          <div>
            <small>Order {order.id}</small>
            <strong>{order.title}</strong>
            <span>
              {order.sellerName} · {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <div className="rod-track-eta">
          <small>{ended || finished ? "Final status" : "Current status"}</small>
          <h2>{headline}</h2>
          <StatusBadge order={order} />
        </div>
      </header>

      {/* STEPPER */}
      {!ended && (
        <ol className="rod-stepper" aria-label="Order progress">
          {flow.map((step, i) => {
            const state = i < index || (finished && i === index) ? "done" : i === index ? "current" : "upcoming";

            return (
              <li className={state} key={step.key}>
                <span className="rod-step-dot" aria-hidden="true" />
                <strong>{step.label}</strong>
                <small>{order.times[step.key] ? formatDate(order.times[step.key]) : "Pending"}</small>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rod-grid">
        {/* TIMELINE */}
        <section className="rod-panel">
          <h3>{ended ? "What happened" : "Tracking history"}</h3>
          <Timeline order={order} />
        </section>

        {/* SIDE */}
        <aside className="rod-side">
          {isPickup ? (
            <section className="rod-panel rod-pickup">
              <h3>Pickup details</h3>

              {order.pickupCode ? (
                <>
                  <p className="rod-pickup-lead">Show this code to the seller when you collect your order.</p>
                  <div className="rod-code-box" aria-label={`Pickup code ${order.pickupCode}`}>
                    {order.pickupCode.split("").map((digit, i) => (
                      <span key={i}>{digit}</span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rod-pickup-lead">
                  Your pickup code appears here once the seller marks the order as ready.
                </p>
              )}

              <dl className="rod-facts compact">
                <div>
                  <dt>Collect from</dt>
                  <dd>
                    {order.sellerName}, {order.sellerCity}
                  </dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>Free</dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className="rod-panel">
              <h3>Shipment</h3>

              <dl className="rod-facts compact">
                <div>
                  <dt>Carrier</dt>
                  <dd>ReOrbit Logistics</dd>
                </div>
                <div>
                  <dt>Tracking ID</dt>
                  <dd>{order.trackingId || "Assigned after pickup"}</dd>
                </div>
                <div>
                  <dt>From</dt>
                  <dd>{order.sellerCity}</dd>
                </div>
                <div>
                  <dt>To</dt>
                  <dd>
                    {DEFAULT_ADDRESS.city} {order.pincode}
                  </dd>
                </div>
                {order.eta && !ended && !finished && (
                  <div>
                    <dt>Expected by</dt>
                    <dd>{formatDate(order.eta)}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <section className="rod-panel">
            <h3>Status</h3>
            <p className="rod-status-text">{status.message}</p>
            <Link to={`/remaker-orders/${order.id}`} className="rod-btn ghost small">
              View order details
            </Link>
          </section>

          {canReport(order) && (
            <section className="rod-help">
              <strong>Problem with this order?</strong>
              <p>Late, damaged or not what you expected? Let us know.</p>
              <Link to={`/remaker-orders/${order.id}/report`} className="rod-btn ghost small">
                Report an issue
              </Link>
            </section>
          )}

          {demo && !ended && !finished && (
            <section className="rod-demo">
              <small>Demo only</small>
              <p>Move this order to its next step to preview each stage.</p>
              <button type="button" className="rod-btn primary small" onClick={() => advanceOrder(order.id)}>
                Advance to next step
              </button>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
