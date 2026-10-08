import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { CancelModal, MiniProgress, StatusBadge, Timeline } from "../../pages-components/OrderParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import {
  DEFAULT_ADDRESS,
  PAYMENT_LABEL,
  canCancel,
  canReport,
  cancelOrder,
  describeStatus,
  formatDate,
  formatDateTime,
  useOrder,
} from "../../data/ordersStore";

import "../../css/ReMakerOrders.css";

export function OrderNotFound() {
  return (
    <section className="rod">
      <div className="rod-empty">
        <div className="rod-empty-art single" aria-hidden="true">
          <img className="a" src="/images/products/vintage-chair.jpg" alt="" />
        </div>
        <h2>We couldn&apos;t find that order</h2>
        <p>The link may be out of date, or the order belongs to another account.</p>
        <Link to="/remaker-orders" className="rod-btn primary">
          Back to my orders
        </Link>
      </div>
    </section>
  );
}

export default function ReMakerOrderDetails() {
  const { orderId } = useParams();
  const order = useOrder(orderId);

  if (!order) return <OrderNotFound />;

  return <Details key={order.id} order={order} />;
}

function Details({ order }) {
  const navigate = useNavigate();
  const location = useLocation();
  const status = describeStatus(order);

  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return undefined;

    timer.current = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer.current);
  }, [notice]);

  const active = order.status === "Pending" || order.status === "Confirmed";
  const subtotal = order.unitPrice * order.quantity;
  const isPickup = order.fulfilment === "pickup";
  const sellerPath = `/remaker-marketplace/seller/${order.sellerId}`;

  const confirmCancel = (reason) => {
    cancelOrder(order.id, reason);
    setCancelling(false);
    setNotice("Order cancelled.");
  };

  return (
    <section className="rod rod-details">
      <nav className="rod-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-orders">My orders</Link>
        <span aria-hidden="true">/</span>
        <strong>{order.id}</strong>
      </nav>

      <div className="rod-grid">
        <div className="rod-main">
          {/* STATUS */}
          <section className="rod-panel rod-status">
            <div className="rod-status-top">
              <div>
                <small>Order {order.id}</small>
                <h2>{status.label}</h2>
              </div>
              <StatusBadge order={order} />
            </div>

            <p>{status.message}</p>
            <MiniProgress order={order} />

            {active && order.eta && (
              <p className="rod-eta">
                {order.stage === "out_for_delivery"
                  ? "Arriving today"
                  : `${isPickup ? "Ready by" : "Expected by"} ${formatDate(order.eta)}`}
              </p>
            )}

            <div className="rod-actions">
              {active && (
                <Link to={`/remaker-orders/${order.id}/track`} className="rod-btn primary">
                  Track order
                </Link>
              )}

              {!active && order.status !== "Cancelled" && (
                <Link to={`/remaker-marketplace/product/${order.listingId}`} className="rod-btn primary">
                  Buy again
                </Link>
              )}

              {order.status !== "Pending" && (
                <Link to={`/remaker-orders/${order.id}/track`} className="rod-btn ghost">
                  View tracking history
                </Link>
              )}

              {canReport(order) && (
                <Link to={`/remaker-orders/${order.id}/report`} className="rod-btn ghost">
                  Report an issue
                </Link>
              )}

              {canCancel(order) && (
                <button type="button" className="rod-btn danger-ghost" onClick={() => setCancelling(true)}>
                  Cancel order
                </button>
              )}
            </div>
          </section>

          {/* ITEM */}
          <section className="rod-panel">
            <h3>Item</h3>

            <div className="rod-item">
              <Link to={`/remaker-marketplace/product/${order.listingId}`} className="rod-item-img">
                <img src={order.image} alt="" />
              </Link>

              <div className="rod-item-info">
                <Link to={`/remaker-marketplace/product/${order.listingId}`} className="rod-item-title">
                  {order.title}
                </Link>
                <p>
                  {order.category} · {order.condition} condition
                </p>
                <p>
                  Sold by <Link to={sellerPath}>{order.sellerName}</Link>
                  <span className={`rod-chip ${order.sellerType}`}>
                    {order.sellerType === "remaker" ? "ReMaker" : "Community"}
                  </span>
                </p>
              </div>

              <div className="rod-item-price">
                <strong>{formatPrice(order.unitPrice)}</strong>
                <small>Qty {order.quantity}</small>
              </div>
            </div>
          </section>

          {/* DELIVERY OR PICKUP */}
          <section className="rod-panel">
            <h3>{isPickup ? "Pickup" : "Delivery"}</h3>

            <dl className="rod-facts">
              <div>
                <dt>Method</dt>
                <dd>{isPickup ? "Self pickup, free" : "Delivered by ReOrbit"}</dd>
              </div>

              {isPickup ? (
                <>
                  <div>
                    <dt>Collect from</dt>
                    <dd>
                      {order.sellerName}, {order.sellerCity}
                    </dd>
                  </div>
                  {order.pickupCode && (
                    <div>
                      <dt>Pickup code</dt>
                      <dd className="rod-code">{order.pickupCode}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt>Deliver to</dt>
                    <dd>
                      {DEFAULT_ADDRESS.name}
                      <br />
                      {DEFAULT_ADDRESS.line}, {DEFAULT_ADDRESS.city}, {DEFAULT_ADDRESS.state} {order.pincode}
                      <br />
                      {DEFAULT_ADDRESS.phone}
                    </dd>
                  </div>
                  {order.trackingId && (
                    <div>
                      <dt>Tracking ID</dt>
                      <dd>{order.trackingId}</dd>
                    </div>
                  )}
                </>
              )}

              {order.eta && active && (
                <div>
                  <dt>{isPickup ? "Ready by" : "Expected by"}</dt>
                  <dd>{formatDate(order.eta)}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* REPORTS */}
          {order.reports.length > 0 && (
            <section className="rod-panel">
              <h3>Reports for this order</h3>

              <div className="rod-reports">
                {order.reports.map((report) => (
                  <Link
                    to={`/remaker-orders/${order.id}/report`}
                    className="rod-report"
                    key={report.id}
                  >
                    <div>
                      <strong>{report.reason}</strong>
                      <small>
                        {report.id} · {formatDate(report.createdAt)}
                      </small>
                    </div>
                    <span className={`rod-badge report-${report.status.toLowerCase()}`}>{report.status}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* SIDE */}
        <aside className="rod-side">
          <section className="rod-panel">
            <h3>Payment</h3>

            <dl className="rod-sum">
              <div>
                <dt>
                  Items ({order.quantity})
                </dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>{isPickup ? "Self pickup" : "ReOrbit delivery"}</dt>
                <dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}</dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>

            <dl className="rod-facts compact">
              <div>
                <dt>Method</dt>
                <dd>{PAYMENT_LABEL[order.payment.method]}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`rod-pay ${order.payment.status.toLowerCase()}`}>{order.payment.status}</span>
                </dd>
              </div>
              {order.payment.txnId && (
                <div>
                  <dt>Transaction</dt>
                  <dd>{order.payment.txnId}</dd>
                </div>
              )}
            </dl>

            {order.payment.status === "Refunded" && (
              <p className="rod-note">
                Refunded to your original payment method. It can take 3 to 5 days to show up.
              </p>
            )}
          </section>

          <section className="rod-panel">
            <h3>Order info</h3>

            <dl className="rod-facts compact">
              <div>
                <dt>Order ID</dt>
                <dd>{order.id}</dd>
              </div>
              <div>
                <dt>Placed on</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
              {order.cancelledAt && (
                <div>
                  <dt>Cancelled on</dt>
                  <dd>{formatDateTime(order.cancelledAt)}</dd>
                </div>
              )}
              {order.returnedAt && (
                <div>
                  <dt>Returned on</dt>
                  <dd>{formatDateTime(order.returnedAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rod-panel">
            <div className="rod-panel-head">
              <h3>Latest updates</h3>
              <Link to={`/remaker-orders/${order.id}/track`}>See all</Link>
            </div>
            <Timeline order={order} compact />
          </section>

          {canReport(order) && (
            <section className="rod-help">
              <strong>Something not right?</strong>
              <p>Tell us what went wrong and our team will look into it within 24 hours.</p>
              <Link to={`/remaker-orders/${order.id}/report`} className="rod-btn ghost small">
                Report an issue
              </Link>
            </section>
          )}
        </aside>
      </div>

      {cancelling && <CancelModal order={order} onConfirm={confirmCancel} onClose={() => setCancelling(false)} />}

      {notice && (
        <div className="rod-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
