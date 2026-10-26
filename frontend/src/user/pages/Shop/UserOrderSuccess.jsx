import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  CreditCard,
  Download,
  Leaf,
  MapPin,
  MapPinned,
  PackageCheck,
  PackageX,
  ReceiptText,
  Store,
  Truck,
} from "lucide-react";

import { PAYMENT_LABEL, useOrders } from "../../data/ordersStore";
import { formatPrice } from "../../../data/marketplaceData";
import { formatDate } from "../../utils/format";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import ShopNav from "./components/ShopNav";
import { printInvoice } from "./invoice";

import "../../css/shared/ui-base.css";
import "../../css/shop/shop-base.css";
import "../../css/shop/UserOrderSuccess.css";

export default function UserOrderSuccess() {
  const { ids } = useParams();
  const navigate = useNavigate();
  const all = useOrders();

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const wanted = ids.split(",");
  const orders = all.filter((o) => wanted.includes(o.id));

  if (!orders.length) {
    return (
      <div className="dn sp">
        <ShopNav />
        <EmptyState
          icon={PackageX}
          title="We couldn't find this order"
          text="Check your orders list instead."
          actionLabel="My orders"
          to="/user-orders"
        />
      </div>
    );
  }

  const first = orders[0];
  const total = orders.reduce((n, o) => n + o.total, 0);
  const subtotal = orders.reduce((n, o) => n + o.price * o.qty, 0);
  const delivery = orders.reduce((n, o) => n + o.shipping, 0);
  const discount = orders.reduce((n, o) => n + (o.discount || 0), 0);
  const cod = first.payment === "COD";
  const co2 = orders.reduce((n, o) => n + (o.item.co2SavedKg || 0) * o.qty, 0);

  return (
    <div className="dn sp">
      <ShopNav />

      <section className="dn-card sp-success">
        <span className="sp-check" aria-hidden="true"><Check size={40} strokeWidth={3} /></span>
        <span className="dn-eyebrow">Thank you</span>
        <h1>{orders.length > 1 ? `${orders.length} orders placed` : "Order placed"}</h1>
        <p>
          {cod
            ? "Your order is confirmed. Pay when it arrives."
            : `Payment of ${formatPrice(total)} received. Your order is confirmed.`}
        </p>
        <div className="sp-ids">
          {orders.map((o) => (
            <Link key={o.id} to={`/user-orders/${o.id}`} className="sp-idchip">{o.id}</Link>
          ))}
        </div>
      </section>

      <div className="sp-grid">
        <section className="dn-card dn-card-pad">
          <div className="dn-card-head">
            <div>
              <h2>What you ordered</h2>
              <small>One order for each piece.</small>
            </div>
          </div>

          <ul className="sp-review-items">
            {orders.map((o) => (
              <li key={o.id}>
                <SafeImage src={o.item.image} alt={o.item.title} />
                <div>
                  <strong>{o.item.title}</strong>
                  <span>{o.id} · {o.sellerIsRemaker ? "Made by" : "Sold by"} {o.seller?.name} · Qty {o.qty}</span>
                </div>
                <b>{formatPrice(o.total)}</b>
              </li>
            ))}
          </ul>

          <h3 className="sp-next-title">What happens next</h3>
          <ol className="sp-next">
            <li className="done"><span><Check size={14} /></span><div><strong>Order confirmed</strong><p>The seller has been told to get it ready.</p></div></li>
            <li><span><PackageCheck size={14} /></span><div><strong>Packed and handed over</strong><p>Follow every step from the tracking page.</p></div></li>
            <li><span><Truck size={14} /></span><div><strong>Delivered by {formatDate(first.eta)}</strong><p>Rate the seller once it arrives.</p></div></li>
          </ol>

          {co2 > 0 && (
            <p className="sp-impact" style={{ marginTop: 20 }}>
              <Leaf size={15} /> Your purchase keeps about <b>{co2} kg</b> of CO₂ out of new production.
            </p>
          )}
        </section>

        <aside className="dn-card sp-summary" aria-label="Payment and delivery">
          <h3>Summary</h3>
          <dl>
            <div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{delivery ? formatPrice(delivery) : "Free"}</dd></div>
            {discount > 0 && <div className="save"><dt>Coupon</dt><dd>− {formatPrice(discount)}</dd></div>}
            <div className="total"><dt>{cod ? "To pay on delivery" : "Paid"}</dt><dd>{formatPrice(total)}</dd></div>
          </dl>

          <div className="sp-block">
            <h4><CreditCard size={13} /> Payment</h4>
            <p>{PAYMENT_LABEL[first.payment]}{first.reference ? ` · ${first.reference}` : ""}</p>
          </div>
          <div className="sp-block">
            <h4><MapPin size={13} /> Delivering to</h4>
            <p>
              <strong>{first.address.name}</strong><br />
              {first.address.line}, {first.address.city} {first.address.pincode}
            </p>
          </div>

          <div className="sp-success-actions">
            <button
              type="button"
              className="dn-btn dn-btn--block"
              onClick={() => navigate(orders.length === 1 ? `/user-orders/${first.id}` : "/user-orders")}
            >
              <ReceiptText size={15} /> {orders.length === 1 ? "View order" : "View my orders"}
            </button>
            {orders.length === 1 && (
              <Link to={`/user-orders/${first.id}/track`} className="dn-btn dn-btn--soft dn-btn--block">
                <MapPinned size={15} /> Track order
              </Link>
            )}
            <Link to="/user-marketplace" className="dn-btn dn-btn--ghost dn-btn--block">
              <Store size={15} /> Continue shopping
            </Link>
            <button type="button" className="dn-link sp-center" onClick={() => printInvoice(first)}>
              <Download size={14} /> Download invoice
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
