import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { Avatar } from "../../pages-components/ReviewBlocks";
import {
  ActionModal,
  EarningBadge,
  SaleBadge,
  SaleProgress,
  SaleTimeline,
} from "../Sales/SalesParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { PAYMENT_LABEL, formatDate, formatDateTime } from "../../data/ordersStore";
import {
  CANCEL_REASONS,
  FEE_RATE,
  SHIP_FROM,
  acceptSale,
  advanceSale,
  canCancelSale,
  cancelSale,
  clearsOn,
  describeSale,
  earningStatus,
  feeOf,
  getCustomer,
  grossOf,
  moveSale,
  netOf,
  nextAction,
  useSale,
} from "../../data/salesStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

export function SaleNotFound() {
  return (
    <section className="rod rsl">
      <div className="rod-empty">
        <div className="rod-empty-art single" aria-hidden="true">
          <img className="a" src="/images/portfolio/before-tara-chair.jpg" alt="" />
        </div>
        <h2>We couldn&apos;t find that order</h2>
        <p>The link may be out of date, or the order belongs to another seller.</p>
        <Link to="/remaker-sales" className="rod-btn primary">
          Back to sales
        </Link>
      </div>
    </section>
  );
}

export default function ReMakerSaleDetails() {
  const { saleId } = useParams();
  const order = useSale(saleId);

  if (!order) return <SaleNotFound />;

  return <Details key={order.id} order={order} />;
}

const ACTION_TEXT = {
  ready: {
    title: "Mark this order ready for pickup?",
    text: "The customer is told it is ready and can come and collect it.",
    confirm: "Yes, it is ready",
  },
  packed: {
    title: "Mark this order as packed?",
    text: "ReOrbit will schedule a rider to collect the parcel from your address.",
    confirm: "Yes, it is packed",
  },
  handed_over: {
    title: "Confirm you handed it to ReOrbit?",
    text: "Only confirm once the rider has the parcel. From here ReOrbit delivers it.",
    confirm: "Yes, I handed it over",
  },
  collected: {
    title: "Confirm the customer collected it?",
    text: "Only confirm once the customer has the item in hand. This completes the order.",
    confirm: "Yes, it was collected",
  },
};

function Details({ order }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const demo = params.get("demo") === "1";

  const customer = getCustomer(order.customerId);
  const status = describeSale(order);
  const action = nextAction(order);
  const earning = earningStatus(order);

  const [modal, setModal] = useState(null); /* "decline" | "cancel" | "action" */
  const [notice, setNotice] = useState(location.state?.notice || "");
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return undefined;

    timer.current = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer.current);
  }, [notice]);

  const isPickup = order.fulfilment === "pickup";
  const gross = grossOf(order);
  const fee = feeOf(order);
  const net = netOf(order);
  const earnsMoney = ["Completed"].includes(order.status);

  const runAction = () => {
    if (!action) return;

    if (action.key === "accept") {
      acceptSale(order.id);
      setNotice("Order accepted. Pack it next.");
      return;
    }

    setModal("action");
  };

  const confirmAction = () => {
    moveSale(order.id, action.key);
    setModal(null);
    setNotice(
      action.key === "collected"
        ? "Order completed. Your earnings will clear soon."
        : "Order updated.",
    );
  };

  const confirmCancel = (reason) => {
    cancelSale(order.id, reason);
    setModal(null);
    setNotice("Order cancelled. The customer was refunded.");
  };

  const copy = ACTION_TEXT[action?.key];

  return (
    <section className="rod rsl rod-details">
      <nav className="rod-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-sales">Sales</Link>
        <span aria-hidden="true">/</span>
        <strong>{order.id}</strong>
      </nav>

      <div className="rod-grid">
        <div className="rod-main">
          {/* STATUS + ACTIONS */}
          <section className="rod-panel rod-status">
            <div className="rod-status-top">
              <div>
                <small>Order {order.id}</small>
                <h2>{status.label}</h2>
              </div>
              <SaleBadge order={order} />
            </div>

            <p>{status.message}</p>
            <SaleProgress order={order} />

            <div className="rod-actions">
              {action && (
                <button type="button" className="rod-btn primary" onClick={runAction}>
                  {action.label}
                </button>
              )}

              {order.status === "Pending" && (
                <button type="button" className="rod-btn danger-ghost" onClick={() => setModal("decline")}>
                  Decline order
                </button>
              )}

              {order.status === "Confirmed" && canCancelSale(order) && (
                <button type="button" className="rod-btn danger-ghost" onClick={() => setModal("cancel")}>
                  Cancel order
                </button>
              )}

              <Link to={`/remaker-customers/${order.customerId}`} className="rod-btn ghost">
                Customer info
              </Link>

              {earnsMoney && (
                <Link to="/remaker-earnings/transactions" className="rod-btn ghost">
                  See in earnings
                </Link>
              )}
            </div>
          </section>

          {/* ITEM */}
          <section className="rod-panel">
            <h3>Item sold</h3>

            <div className="rod-item">
              <Link to={`/remaker-products/${order.productId}/edit`} className="rod-item-img">
                <img src={order.image} alt="" />
              </Link>

              <div className="rod-item-info">
                <Link to={`/remaker-products/${order.productId}/edit`} className="rod-item-title">
                  {order.title}
                </Link>
                <p>{order.category}</p>
                <p>
                  Product ID {order.productId} ·{" "}
                  <Link to={`/remaker-products/${order.productId}/edit`}>Edit product</Link>
                </p>
              </div>

              <div className="rod-item-price">
                <strong>{formatPrice(order.unitPrice)}</strong>
                <small>Qty {order.quantity}</small>
              </div>
            </div>
          </section>

          {/* FULFILMENT */}
          <section className="rod-panel">
            <h3>{isPickup ? "Pickup from you" : "Ship to the customer"}</h3>

            <div className="sls-route">
              <div>
                <small>{isPickup ? "Customer collects from" : "Pick up from"}</small>
                <strong>{SHIP_FROM.name}</strong>
                <p>
                  {SHIP_FROM.line}
                  <br />
                  {SHIP_FROM.city}, {SHIP_FROM.state} {SHIP_FROM.pincode}
                </p>
              </div>

              {!isPickup && customer && (
                <div>
                  <small>Deliver to</small>
                  <strong>{customer.name}</strong>
                  <p>
                    {customer.address}
                    <br />
                    {customer.city}, {customer.state} {customer.pincode}
                  </p>
                </div>
              )}

              {isPickup && customer && (
                <div>
                  <small>Collected by</small>
                  <strong>{customer.name}</strong>
                  <p>Ask for their pickup code before you hand it over.</p>
                </div>
              )}
            </div>

            <p className="rod-note">
              {isPickup
                ? "Free for the customer. You hand the item over in person."
                : "ReOrbit collects from you and delivers. The delivery fee is paid by the customer, not taken from your earnings."}
            </p>
          </section>

          {/* TIMELINE */}
          <section className="rod-panel">
            <h3>Order timeline</h3>
            <SaleTimeline order={order} />
          </section>
        </div>

        {/* SIDE */}
        <aside className="rod-side">
          {/* CUSTOMER */}
          {customer && (
            <section className="rod-panel sls-customer">
              <div className="rod-panel-head">
                <h3>Customer</h3>
                <Link to={`/remaker-customers/${customer.id}`}>View profile</Link>
              </div>

              <div className="sls-customer-top">
                <span className="sls-avatar big">
                  <Avatar src={customer.image} name={customer.name} />
                </span>
                <div>
                  <strong>{customer.name}</strong>
                  <span className={`rod-chip ${customer.type === "ReMaker" ? "remaker" : ""}`}>
                    {customer.type === "ReMaker" ? "ReMaker" : "Customer"}
                  </span>
                  <small>Member since {customer.joined}</small>
                </div>
              </div>

              <dl className="rod-facts compact">
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>{customer.phone}</a>
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${customer.email}`}>{customer.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {customer.city}, {customer.state}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* EARNINGS */}
          <section className="rod-panel">
            <div className="rod-panel-head">
              <h3>Your earnings</h3>
              <EarningBadge order={order} />
            </div>

            <dl className="rod-sum">
              <div>
                <dt>
                  Item price ({order.quantity} × {formatPrice(order.unitPrice)})
                </dt>
                <dd>{formatPrice(gross)}</dd>
              </div>
              <div>
                <dt>ReOrbit fee ({Math.round(FEE_RATE * 100)}%)</dt>
                <dd>− {formatPrice(fee)}</dd>
              </div>
              <div className="total">
                <dt>You receive</dt>
                <dd>{formatPrice(net)}</dd>
              </div>
            </dl>

            {earning === "Clearing" && (
              <p className="rod-note">Clears for withdrawal on {formatDate(clearsOn(order))}.</p>
            )}
            {earning === "Available" && (
              <p className="rod-note good">This money is ready to withdraw from your earnings page.</p>
            )}
            {earning === "In progress" && (
              <p className="rod-note">You get paid {`a few days after delivery`}. Complete the order to start the clock.</p>
            )}
            {(earning === "Cancelled" || earning === "Reversed") && (
              <p className="rod-note">This order will not add to your earnings.</p>
            )}
          </section>

          {/* ORDER INFO */}
          <section className="rod-panel">
            <h3>Order info</h3>

            <dl className="rod-facts compact">
              <div>
                <dt>Order ID</dt>
                <dd>{order.id}</dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  {PAYMENT_LABEL[order.payment.method]}, {order.payment.status.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt>Handled by</dt>
                <dd>{isPickup ? "You (pickup)" : "ReOrbit delivery"}</dd>
              </div>
            </dl>

            {order.payment.method === "COD" && order.status !== "Completed" && (
              <p className="rod-note">
                Cash on delivery. ReOrbit collects the cash and adds your share to your earnings after delivery.
              </p>
            )}
          </section>

          {demo && ["handed_over", "in_transit"].includes(order.stage) && order.status === "Confirmed" && (
            <section className="rod-demo">
              <small>Demo only</small>
              <p>ReOrbit controls these steps. Move this order forward to preview them.</p>
              <button type="button" className="rod-btn primary small" onClick={() => advanceSale(order.id)}>
                Advance to next step
              </button>
            </section>
          )}
        </aside>
      </div>

      {modal === "decline" && (
        <ActionModal
          title="Decline this order?"
          text="The customer will be refunded in full. Declining too often can lower your seller rating."
          confirmLabel="Decline order"
          cancelLabel="Keep the order"
          tone="danger"
          reasons={CANCEL_REASONS}
          thumb={order.image}
          thumbLabel={order.id}
          thumbTitle={order.title}
          onConfirm={confirmCancel}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "cancel" && (
        <ActionModal
          title="Cancel this order?"
          text="The customer will be refunded in full. Cancelling after accepting can lower your seller rating."
          confirmLabel="Cancel order"
          cancelLabel="Keep the order"
          tone="danger"
          reasons={CANCEL_REASONS}
          thumb={order.image}
          thumbLabel={order.id}
          thumbTitle={order.title}
          onConfirm={confirmCancel}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "action" && copy && (
        <ActionModal
          title={copy.title}
          text={copy.text}
          confirmLabel={copy.confirm}
          thumb={order.image}
          thumbLabel={order.id}
          thumbTitle={order.title}
          onConfirm={confirmAction}
          onClose={() => setModal(null)}
        />
      )}

      {notice && (
        <div className="rod-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
