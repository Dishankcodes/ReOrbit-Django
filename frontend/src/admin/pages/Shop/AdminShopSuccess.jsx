import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ReceiptText, Store, MapPin, CreditCard, PackageCheck, Truck, Home, Download, PackageX } from "lucide-react";

import { usePurchases } from "../../data/shopStore";
import { formatDate, formatINR, DEMO_TODAY } from "../../utils/format";
import ProductImg from "./components/ProductImg";
import ShopNav from "./components/ShopNav";
import EmptyState from "../../components/ui/EmptyState";
import { printInvoice } from "./invoice";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/shop/AdminShop.css";

const METHOD = { UPI: "UPI", CARD: "Card", NET_BANKING: "Net banking", WALLET: "ReOrbit Wallet", COD: "Pay on delivery" };

export default function AdminShopSuccess() {
  const { ids } = useParams();
  const navigate = useNavigate();
  const purchases = usePurchases();
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const wanted = ids.split(",");
  const orders = purchases.filter((o) => wanted.includes(o.order_id));

  if (!orders.length) {
    return (
      <div className="au-page sh-page"><ShopNav />
        <section className="au-panel"><EmptyState icon={PackageX} title="We could not find this order" text="Check your purchase history instead." action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-shop/orders")}>My purchases</button>} /></section>
      </div>
    );
  }

  const total = orders.reduce((n, o) => n + o.amount, 0);
  const first = orders[0];
  const cod = first.transaction.payment_method === "COD";
  const eta = new Date(DEMO_TODAY.getTime() + 5 * 86400000);

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <section className="sh-success">
        <span className="sh-check" aria-hidden="true"><Check size={38} strokeWidth={3} /></span>
        <h2>{orders.length > 1 ? `${orders.length} orders placed` : "Order placed"}</h2>
        <p>{cod ? "Your order is confirmed. Pay when it arrives." : `Payment of ${formatINR(total)} received. Your order is confirmed.`}</p>
        <div className="sh-success-ids">{orders.map((o) => <Link key={o.order_id} to={`/admin-shop/orders/${o.order_id}`} className="sh-idchip">{o.order_id}</Link>)}</div>
      </section>

      <div className="sh-cartgrid">
        <section className="sh-panel">
          <header className="sh-sec-head"><div><h3>What you ordered</h3><p>One order for each product.</p></div></header>
          <ul className="sh-review-items">
            {orders.map((o) => (
              <li key={o.order_id}>
                <ProductImg src={o.listing.image} alt={o.listing.title} />
                <div><strong>{o.listing.title}</strong><span>{o.order_id} · Sold by {o.seller.name} · Qty {o.listing.quantity}</span></div>
                <b>{formatINR(o.amount)}</b>
              </li>
            ))}
          </ul>

          <h4 className="sh-next-title">What happens next</h4>
          <ol className="sh-next">
            <li className="done"><span><Check size={14} /></span><div><strong>Order confirmed</strong><p>The seller has been told to get it ready.</p></div></li>
            <li><span><PackageCheck size={14} /></span><div><strong>Packed and handed over</strong><p>You will see this in your purchase history.</p></div></li>
            <li><span><Truck size={14} /></span><div><strong>Delivered by {formatDate(eta)}</strong><p>Mark it as received when it arrives.</p></div></li>
          </ol>
        </section>

        <aside className="sh-summary" aria-label="Payment and delivery">
          <h3>Summary</h3>
          <dl>
            <div><dt>Subtotal</dt><dd>{formatINR(orders.reduce((n, o) => n + o.subtotal, 0))}</dd></div>
            <div><dt>Delivery</dt><dd>{orders.reduce((n, o) => n + o.delivery_fee, 0) ? formatINR(orders.reduce((n, o) => n + o.delivery_fee, 0)) : "Free"}</dd></div>
            <div className="total"><dt>{cod ? "To pay on delivery" : "Paid"}</dt><dd>{formatINR(total)}</dd></div>
          </dl>
          <div className="sh-sum-block"><h4><CreditCard size={13} /> Payment</h4><p>{METHOD[first.transaction.payment_method]}{first.transaction.reference ? ` · ${first.transaction.reference}` : ""}</p></div>
          <div className="sh-sum-block"><h4><MapPin size={13} /> Delivering to</h4><p><strong>{first.delivery.name}</strong><br />{first.delivery.address}, {first.delivery.city} {first.delivery.pincode}</p></div>
          <div className="sh-success-actions">
            <button type="button" className="ad-btn ad-btn-primary" onClick={() => navigate(orders.length === 1 ? `/admin-shop/orders/${first.order_id}` : "/admin-shop/orders")}><ReceiptText size={15} /> {orders.length === 1 ? "View order" : "View my purchases"}</button>
            <Link to="/admin-shop" className="ad-btn ad-btn-ghost"><Store size={15} /> Continue shopping</Link>
            <button type="button" className="sh-link center" onClick={() => printInvoice(first)}><Download size={14} /> Download invoice</button>
            <Link to="/admin-dashboard" className="sh-link center"><Home size={14} /> Back to dashboard</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
