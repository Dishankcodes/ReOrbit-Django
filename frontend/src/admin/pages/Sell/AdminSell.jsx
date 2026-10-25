import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Boxes, PackageCheck, Wallet, BellRing, Pencil, Eye, PauseCircle, PlayCircle, Trash2, ShoppingBag, Images, X, PackageSearch } from "lucide-react";

import { useSellListings, useSales, needsAction, setListingStatus, removeListing, simulateBuyerOrder } from "../../data/sellStore";
import { SELL_SOURCES } from "../../data/adminSell";
import { formatINR } from "../../utils/format";
import SellNav from "./components/SellNav";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import RowActionMenu from "../../components/ui/RowActionMenu";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/shop/AdminShop.css";
import "../../css/sell/AdminSell.css";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "Active", label: "Active", test: (l) => l.status === "Active" },
  { key: "Sold_Out", label: "Sold out", test: (l) => l.status === "Sold_Out" },
  { key: "Paused", label: "Paused", test: (l) => l.status === "Paused" },
  { key: "Draft", label: "Drafts", test: (l) => l.status === "Draft" },
];
const ACTIONS = {
  pause: { key: "pause", tone: "warning", icon: "pause", title: "Pause this listing?", body: "Buyers will not see it until you resume it. Existing orders are not affected.", confirmLabel: "Pause listing", toast: "paused" },
  resume: { key: "resume", tone: "positive", icon: "restore", title: "Resume this listing?", body: "It goes back on the marketplace right away.", confirmLabel: "Resume listing", toast: "is live again" },
  delete: { key: "delete", tone: "danger", icon: "trash", title: "Delete this listing?", body: "The listing and its photos are removed. This cannot be undone.", confirmLabel: "Delete listing", toast: "deleted" },
};

export default function AdminSell() {
  const navigate = useNavigate();
  const listings = useSellListings();
  const todoCount = useSales().filter(needsAction).length;
  const { toast, toastNode } = useToast();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(null);

  const stats = useMemo(() => ({
    active: listings.filter((l) => l.status === "Active").length,
    units: listings.reduce((n, l) => n + l.sold, 0),
    revenue: listings.reduce((n, l) => n + l.revenue, 0),
    todo: todoCount,
  }), [listings, todoCount]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = FILTERS.find((x) => x.key === filter);
    return listings.filter((l) => f.test(l) && (!t || `${l.title} ${l.id} ${l.category}`.toLowerCase().includes(t)));
  }, [listings, filter, q]);

  const confirm = () => {
    const { action, l } = pending;
    if (action.key === "pause") setListingStatus(l.id, "Paused");
    if (action.key === "resume") setListingStatus(l.id, "Active");
    if (action.key === "delete") removeListing(l.id);
    toast(`${l.title} ${action.toast}.`);
    setPending(null);
  };
  const menu = (l) => [
    { key: "view", label: "View details", icon: Eye, onClick: () => navigate(`/admin-sell/listing/${l.id}`) },
    { key: "edit", label: "Edit", icon: Pencil, onClick: () => navigate(`/admin-sell/edit/${l.id}`) },
    ...(l.status === "Active" || l.status === "Sold_Out" ? [{ key: "demo", label: "Demo: receive an order", icon: ShoppingBag, disabled: l.available === 0, onClick: () => { if (l.available === 0) { toast("This listing is sold out."); return; } const o = simulateBuyerOrder(l); toast(`New order ${o.order_id} from ${o.buyer.name}.`); } }] : []),
    "separator",
    ...(l.rawStatus === "Active" ? [{ key: "pause", label: "Pause", icon: PauseCircle, tone: "warning", onClick: () => setPending({ action: ACTIONS.pause, l }) }] : []),
    ...(l.rawStatus === "Paused" ? [{ key: "resume", label: "Resume", icon: PlayCircle, tone: "positive", onClick: () => setPending({ action: ACTIONS.resume, l }) }] : []),
    ...(l.orderCount === 0 ? [{ key: "del", label: "Delete", icon: Trash2, tone: "danger", onClick: () => setPending({ action: ACTIONS.delete, l }) }] : []),
  ];

  return (
    <div className="au-page sh-page">
      <SellNav />
      <section className="ao-money" aria-label="Selling summary">
        <div className="ao-money-card"><span className="ao-money-icon good"><Boxes size={18} /></span><div><small>Active listings</small><strong>{stats.active}</strong><em>{listings.length} in total</em></div></div>
        <div className="ao-money-card"><span className="ao-money-icon info"><PackageCheck size={18} /></span><div><small>Units sold</small><strong>{stats.units}</strong><em>Not counting cancelled</em></div></div>
        <div className="ao-money-card"><span className="ao-money-icon good"><Wallet size={18} /></span><div><small>Sales revenue</small><strong>{formatINR(stats.revenue)}</strong><em>From delivered orders</em></div></div>
        <button type="button" className="ao-money-card is-link" onClick={() => navigate("/admin-sell/sales")}><span className="ao-money-icon wait"><BellRing size={18} /></span><div><small>Orders to handle</small><strong>{stats.todo}</strong><em>{stats.todo ? "Accept, ship or refund" : "Nothing waiting"}</em></div></button>
      </section>

      <section className="au-panel">
        <div className="sh-orders-bar">
          <div className="rw-chips" role="tablist" aria-label="Listing status">
            {FILTERS.map((f) => <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() => setFilter(f.key)}>{f.label} <em>{listings.filter(f.test).length}</em></button>)}
          </div>
          <label className="au-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your listings" aria-label="Search listings" />{q && <button type="button" onClick={() => setQ("")} aria-label="Clear"><X size={14} /></button>}</label>
          <Link to="/admin-sell/new" className="ad-btn ad-btn-primary"><Plus size={15} /> Add product</Link>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={listings.length ? PackageSearch : Boxes} title={listings.length ? "No listings match" : "Nothing listed yet"} text={listings.length ? "Try another filter or search." : "Add your first product to start selling."} action={!listings.length && <Link to="/admin-sell/new" className="ad-btn ad-btn-primary ad-btn-sm"><Plus size={14} /> Add product</Link>} />
        ) : (
          <div className="sl-grid">
            {shown.map((l) => {
              const pct = l.quantity ? Math.round((l.available / l.quantity) * 100) : 0;
              return (
                <article key={l.id} className={`sl-card ${l.status === "Paused" || l.status === "Draft" ? "dim" : ""}`}>
                  <Link to={`/admin-sell/listing/${l.id}`} className="sl-card-img" aria-label={`Open ${l.title}`}>
                    <img src={l.images[0]} alt={l.title} />
                    <span className="sl-count"><Images size={12} /> {l.images.length}</span>
                    <span className="sl-card-status"><StatusBadge status={l.status} /></span>
                  </Link>
                  <div className="sl-card-body">
                    <div className="sl-card-top"><span className="sh-cat">{l.category} · {SELL_SOURCES[l.source].label}</span><RowActionMenu label={`Actions for ${l.title}`} items={menu(l)} /></div>
                    <h3><Link to={`/admin-sell/listing/${l.id}`}>{l.title}</Link></h3>
                    <div className="sl-price"><strong>{formatINR(l.price)}</strong>{l.mrp > l.price && <s>{formatINR(l.mrp)}</s>}<span className="aup-mono">{l.id}</span></div>
                    <div className="sl-stock" aria-label={`${l.available} of ${l.quantity} left`}>
                      <div><i style={{ width: `${pct}%` }} className={pct <= 25 ? "low" : ""} /></div>
                      <span>{l.available} of {l.quantity} left · {l.sold} sold</span>
                    </div>
                    <div className="sl-card-foot">
                      <span>{l.orderCount} order{l.orderCount === 1 ? "" : "s"}</span>
                      {l.toHandle > 0 ? <Link to="/admin-sell/sales" className="sl-todo">{l.toHandle} to handle</Link> : <span className="sh-muted">{formatINR(l.revenue)} earned</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <ConfirmActionModal action={pending?.action} targets={pending ? [pending.l.title] : []} onConfirm={confirm} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
