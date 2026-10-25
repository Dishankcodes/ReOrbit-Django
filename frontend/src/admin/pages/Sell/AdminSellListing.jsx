import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, Pencil, PauseCircle, PlayCircle, ShoppingBag, Eye, Heart, PackageCheck, Wallet, ReceiptText, PackageX,
  CheckCircle2, ArrowRight, Trash2, RotateCcw,
} from "lucide-react";

import { useSellListing, setListingStatus, removeListing, simulateBuyerOrder } from "../../data/sellStore";
import { SELL_SOURCES } from "../../data/adminSell";
import { formatDate, formatINR } from "../../utils/format";
import SellNav from "./components/SellNav";
import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/shop/AdminShop.css";
import "../../css/sell/AdminSell.css";

const MSG = { published: "Your listing is live. Buyers can order it now.", updated: "Changes saved.", draft: "Saved as a draft. Publish it when you are ready." };

export default function AdminSellListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const l = useSellListing(id);
  const { toast, toastNode } = useToast();
  const [photo, setPhoto] = useState(0);
  const [pending, setPending] = useState(null);
  const [banner, setBanner] = useState(location.state?.saved ? MSG[location.state.saved] : "");

  useEffect(() => { window.scrollTo({ top: 0 }); setPhoto(0); }, [id]);

  if (!l) {
    return (
      <div className="au-page sh-page"><SellNav />
        <section className="au-panel"><EmptyState icon={PackageX} title="Listing not found" text="This listing does not exist or was deleted." action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-sell")}><ArrowLeft size={14} /> My listings</button>} /></section>
      </div>
    );
  }
  const live = l.status === "Active";
  const off = l.mrp > l.price ? Math.round((1 - l.price / l.mrp) * 100) : 0;
  const pct = l.quantity ? Math.round((l.available / l.quantity) * 100) : 0;

  const confirm = () => {
    if (pending === "pause") { setListingStatus(l.id, "Paused"); toast("Listing paused."); }
    if (pending === "resume") { setListingStatus(l.id, "Active"); toast("Listing is live again."); }
    if (pending === "delete") { removeListing(l.id); navigate("/admin-sell", { replace: true }); return; }
    setPending(null);
  };
  const action = {
    pause: { key: "pause", tone: "warning", icon: "pause", title: "Pause this listing?", body: "Buyers will not see it until you resume it. Existing orders are not affected.", confirmLabel: "Pause listing" },
    resume: { key: "resume", tone: "positive", icon: "restore", title: "Resume this listing?", body: "It goes back on the marketplace right away.", confirmLabel: "Resume listing" },
    delete: { key: "delete", tone: "danger", icon: "trash", title: "Delete this listing?", body: "The listing and its photos are removed. This cannot be undone.", confirmLabel: "Delete listing" },
  }[pending];

  return (
    <div className="au-page sh-page">
      <SellNav />
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-sell" className="aup-back"><ArrowLeft size={15} /> My listings</Link>
        <ChevronRight size={14} /><span aria-current="page">{l.id}</span>
      </nav>

      {banner && <div className="sl-banner" role="status"><CheckCircle2 size={18} /><span>{banner}</span><button type="button" onClick={() => setBanner("")} aria-label="Dismiss">×</button></div>}

      <div className="sh-detail">
        <div>
          <div className="sh-photo sl-main-photo"><img src={l.images[photo]} alt={`${l.title}, photo ${photo + 1}`} /></div>
          <div className="sl-thumbs" role="list">
            {l.images.map((src, i) => <button key={i} type="button" role="listitem" className={i === photo ? "on" : ""} onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`}><img src={src} alt="" /></button>)}
          </div>
        </div>

        <div className="sh-buy">
          <div className="sl-head-row"><span className="sh-cat">{l.category} · {l.condition}</span><StatusBadge status={l.status} /></div>
          <h1>{l.title}</h1>
          <div className="sh-price-row"><strong>{formatINR(l.price)}</strong>{off > 0 && <span className="sl-off"><s>{formatINR(l.mrp)}</s> {off}% off</span>}</div>
          <p className="sh-desc">{l.description}</p>

          <div className="sl-stockbox">
            <div className="sl-stock big"><div><i style={{ width: `${pct}%` }} className={pct <= 25 ? "low" : ""} /></div><span><strong>{l.available}</strong> of {l.quantity} units left · {l.sold} sold</span></div>
          </div>

          <dl className="sh-facts">
            <div><dt>Source</dt><dd>{SELL_SOURCES[l.source].label}{l.inventory_id ? ` · ${l.inventory_id}` : ""}</dd></div>
            <div><dt>Listed on</dt><dd>{formatDate(l.created_at)}</dd></div>
            <div><dt>Delivery</dt><dd>{l.delivery === "free" ? "Free" : "₹149, free above ₹5,000"}</dd></div>
            <div><dt>Returns</dt><dd>{l.returnable ? "7 days" : "Not accepted"}</dd></div>
            {l.specs?.material && <div><dt>Material</dt><dd>{l.specs.material}</dd></div>}
            {l.specs?.dimensions && <div><dt>Dimensions</dt><dd>{l.specs.dimensions}</dd></div>}
            {l.specs?.weight && <div><dt>Weight</dt><dd>{l.specs.weight} kg</dd></div>}
            <div><dt>Warranty</dt><dd>{l.specs?.warranty || "None"}</dd></div>
          </dl>

          <div className="sl-actions">
            <Link to={`/admin-sell/edit/${l.id}`} className="ad-btn ad-btn-primary"><Pencil size={15} /> Edit listing</Link>
            {l.rawStatus === "Active" && <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setPending("pause")}><PauseCircle size={15} /> Pause</button>}
            {l.rawStatus === "Paused" && <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setPending("resume")}><PlayCircle size={15} /> Resume</button>}
            {l.rawStatus === "Draft" && <Link to={`/admin-sell/edit/${l.id}`} className="ad-btn ad-btn-ghost"><RotateCcw size={15} /> Finish & publish</Link>}
            {l.orderCount === 0 && <button type="button" className="ad-btn ad-btn-ghost danger" onClick={() => setPending("delete")}><Trash2 size={15} /> Delete</button>}
          </div>
          {live && <button type="button" className="sl-demo" onClick={() => { const o = simulateBuyerOrder(l); toast(`New order ${o.order_id} from ${o.buyer.name}.`); }}><ShoppingBag size={15} /> Demo: pretend a buyer just ordered this</button>}
        </div>
      </div>

      <section className="ao-money" aria-label="Listing performance">
        <div className="ao-money-card"><span className="ao-money-icon info"><Eye size={18} /></span><div><small>Views</small><strong>{l.views.toLocaleString("en-IN")}</strong><em>{l.wishlisted} saved by buyers</em></div></div>
        <div className="ao-money-card"><span className="ao-money-icon good"><PackageCheck size={18} /></span><div><small>Units sold</small><strong>{l.sold}</strong><em>{l.available} left in stock</em></div></div>
        <div className="ao-money-card"><span className="ao-money-icon info"><ReceiptText size={18} /></span><div><small>Orders</small><strong>{l.orderCount}</strong><em>{l.toHandle ? `${l.toHandle} to handle` : "All handled"}</em></div></div>
        <div className="ao-money-card"><span className="ao-money-icon good"><Wallet size={18} /></span><div><small>Revenue</small><strong>{formatINR(l.revenue)}</strong><em>From delivered orders</em></div></div>
      </section>

      <section className="sh-block">
        <header className="sh-sec-head"><div><h3>Sales of this product</h3><p>Every order placed for it, newest first.</p></div><Link to="/admin-sell/sales" className="sh-link">All sales <ArrowRight size={13} /></Link></header>
        {l.sales.length === 0 ? <EmptyState icon={ReceiptText} title="No orders yet" text="When a buyer orders this product it shows up here." /> : (
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead><tr><th>Order</th><th>Buyer</th><th>Placed</th><th>Qty</th><th>Amount</th><th>Order</th><th>Payment</th><th /></tr></thead>
              <tbody>
                {l.sales.map((o) => (
                  <tr key={o.order_id}>
                    <td><Link to={`/admin-sell/sales/${o.order_id}`} className="aup-mono sl-id">{o.order_id}</Link></td>
                    <td><div className="sl-buyer"><UserAvatar name={o.buyer.name} src={o.buyer.image} size={30} rounded="50%" /><div><strong>{o.buyer.name}</strong><span>{o.buyer.type}</span></div></div></td>
                    <td>{formatDate(o.order_date)}</td><td>{o.listing.quantity}</td><td><strong>{formatINR(o.amount)}</strong></td>
                    <td><StatusBadge status={o.order_status} /></td><td><StatusBadge status={o.transaction.payment_status} /></td>
                    <td><Link to={`/admin-sell/sales/${o.order_id}`} className="sh-link">Open <ArrowRight size={13} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmActionModal action={action} targets={[l.title]} onConfirm={confirm} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
