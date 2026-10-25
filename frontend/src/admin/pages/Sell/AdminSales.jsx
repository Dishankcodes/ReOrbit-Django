import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Wallet, ReceiptText, BellRing, Truck, ArrowRight, PackageSearch, Clock } from "lucide-react";

import { useSales, needsAction, saleStage } from "../../data/sellStore";
import { formatDate, formatINR, timeAgo } from "../../utils/format";
import SellNav from "./components/SellNav";
import SaleActions from "./components/SaleActions";
import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/shop/AdminShop.css";
import "../../css/sell/AdminSell.css";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "new", label: "New", test: (o) => o.order_status === "Pending" },
  { key: "ship", label: "To ship", test: (o) => o.order_status === "Confirmed" && !o.shipment },
  { key: "shipped", label: "Shipped", test: (o) => o.order_status === "Confirmed" && !!o.shipment },
  { key: "done", label: "Delivered", test: (o) => o.order_status === "Completed" },
  { key: "stopped", label: "Cancelled / returned", test: (o) => ["Cancelled", "Returned"].includes(o.order_status) },
];
const PAGE = 8;
const STAGE_LABEL = { "-1": "", 0: "Waiting for you to accept", 1: "Ready to ship", 2: "On its way to the buyer", 3: "Delivered" };

export default function AdminSales() {
  const navigate = useNavigate();
  const sales = useSales();
  const { toast, toastNode } = useToast();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [limit, setLimit] = useState(PAGE);

  const stats = useMemo(() => ({
    revenue: sales.filter((o) => o.order_status === "Completed").reduce((n, o) => n + o.amount, 0),
    count: sales.length,
    todo: sales.filter(needsAction).length,
    transit: sales.filter(FILTERS[3].test).length,
  }), [sales]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = FILTERS.find((x) => x.key === filter);
    const list = sales.filter((o) => f.test(o) && (!t || `${o.order_id} ${o.listing.title} ${o.buyer.name} ${o.listing.id}`.toLowerCase().includes(t)));
    const by = { new: (a, b) => new Date(b.order_date) - new Date(a.order_date), old: (a, b) => new Date(a.order_date) - new Date(b.order_date), amount: (a, b) => b.amount - a.amount };
    /* orders that need the seller come first when sorting by newest */
    return list.sort((a, b) => (sort === "new" ? (Number(needsAction(b)) - Number(needsAction(a))) || by.new(a, b) : by[sort](a, b)));
  }, [sales, filter, q, sort]);

  return (
    <div className="au-page sh-page">
      <SellNav />
      <section className="ao-money" aria-label="Sales summary">
        <div className="ao-money-card"><span className="ao-money-icon good"><Wallet size={18} /></span><div><small>Sales revenue</small><strong>{formatINR(stats.revenue)}</strong><em>From delivered orders</em></div></div>
        <div className="ao-money-card"><span className="ao-money-icon info"><ReceiptText size={18} /></span><div><small>Selling orders</small><strong>{stats.count}</strong><em>All time</em></div></div>
        <button type="button" className="ao-money-card is-link" onClick={() => { setFilter("all"); setSort("new"); }}><span className="ao-money-icon wait"><BellRing size={18} /></span><div><small>Need your action</small><strong>{stats.todo}</strong><em>Accept, ship or refund</em></div></button>
        <button type="button" className="ao-money-card is-link" onClick={() => setFilter("shipped")}><span className="ao-money-icon info"><Truck size={18} /></span><div><small>On the way</small><strong>{stats.transit}</strong><em>Shipped, not delivered yet</em></div></button>
      </section>

      <section className="au-panel">
        <div className="sh-orders-bar">
          <div className="rw-chips" role="tablist" aria-label="Order status">
            {FILTERS.map((f) => <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() => { setFilter(f.key); setLimit(PAGE); }}>{f.label} <em>{sales.filter(f.test).length}</em></button>)}
          </div>
          <label className="au-search"><Search size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search by order, product or buyer" aria-label="Search sales" />{q && <button type="button" onClick={() => setQ("")} aria-label="Clear"><X size={14} /></button>}</label>
          <select className="sh-sortsel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort sales"><option value="new">Needs action first</option><option value="old">Oldest first</option><option value="amount">Highest amount</option></select>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={PackageSearch} title={sales.length ? "No orders match" : "No sales yet"} text={sales.length ? "Try another filter or search." : "Orders for your listings will appear here."} action={!sales.length && <Link to="/admin-sell" className="ad-btn ad-btn-primary ad-btn-sm">My listings</Link>} />
        ) : (
          <ul className="sh-orders">
            {shown.slice(0, limit).map((o) => {
              const stage = saleStage(o);
              return (
                <li key={o.order_id} className={`sh-order ${needsAction(o) ? "sl-urgent" : ""}`}>
                  <Link to={`/admin-sell/sales/${o.order_id}`} className="sh-order-img"><img src={o.listing.image} alt={o.listing.title} /></Link>
                  <div className="sh-order-main">
                    <div className="sh-order-top"><strong className="aup-mono">{o.order_id}</strong><StatusBadge status={o.order_status === "Confirmed" && o.shipment ? "Shipped" : o.order_status} /><span className="sh-paychip">Payment <StatusBadge status={o.transaction.payment_status} /></span></div>
                    <h3><Link to={`/admin-sell/sales/${o.order_id}`}>{o.listing.title}</Link>{o.listing.quantity > 1 && <em> × {o.listing.quantity}</em>}</h3>
                    <p className="sl-line"><UserAvatar name={o.buyer.name} src={o.buyer.image} size={20} rounded="50%" /> {o.buyer.name} <span className="sl-sep">·</span> {o.buyer.type} <span className="sl-sep">·</span> <Clock size={12} /> {timeAgo(o.order_date)}</p>
                    {STAGE_LABEL[stage] && <p className={`sl-stage s${stage}`}>{STAGE_LABEL[stage]}</p>}
                  </div>
                  <div className="sh-order-side">
                    <strong>{formatINR(o.amount)}</strong>
                    <div className="sh-order-actions">
                      <SaleActions order={o} size="sm" only="primary" onDone={toast} />
                      <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => navigate(`/admin-sell/sales/${o.order_id}`)}>Details <ArrowRight size={13} /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {limit < shown.length && <div className="sh-more pad"><button type="button" className="ad-btn ad-btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>Show more ({shown.length - limit} left)</button></div>}
      </section>
      {toastNode}
    </div>
  );
}
