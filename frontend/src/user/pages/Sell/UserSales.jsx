import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CheckCircle2, Hourglass, PackageCheck, ReceiptText, Truck, Wallet, Package } from "lucide-react";

import { advanceSale, summarizeSelling, useListings, useSales } from "../../data/listingsStore";
import { formatPrice } from "../../../data/marketplaceData";
import { formatDate } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import { PayoutBadge, SaleBadge } from "./components/SellBadges";

import "../../css/shared/ui-base.css";
import "../../css/sell/sell-base.css";
import "../../css/sell/UserSales.css";

const TABS = [
  { id: "all", label: "All sales" },
  { id: "ship", label: "To ship", match: (s) => ["Confirmed", "Packed"].includes(s.status) },
  { id: "transit", label: "In transit", match: (s) => s.status === "Shipped" },
  { id: "done", label: "Delivered", match: (s) => s.status === "Delivered" },
];

export const NEXT_LABEL = { Confirmed: "Mark as packed", Packed: "Mark as shipped", Shipped: "Mark as delivered (demo)" };

export default function UserSales() {
  const sales = useSales();
  const listings = useListings();
  const stats = useMemo(() => summarizeSelling(listings, sales), [listings, sales]);
  const [tab, setTab] = useState("all");
  const { toast, show } = useToast();

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.id === tab);
    return sales.filter((s) => (t?.match ? t.match(s) : true)).sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  }, [sales, tab]);

  const cards = [
    { icon: Wallet, label: "Paid out", value: formatPrice(stats.earned) },
    { icon: Hourglass, label: "On the way to you", value: formatPrice(stats.pending) },
    { icon: Truck, label: "Orders to ship", value: stats.toShip },
    { icon: CheckCircle2, label: "Items sold", value: stats.sold },
  ];

  return (
    <div className="dn sl">
      <Crumbs items={[{ label: "Sell", to: "/user-sell" }, { label: "Sales & payouts" }]} />

      <header className="sl-head">
        <div>
          <span className="dn-eyebrow">Your earnings</span>
          <h1>Sales &amp; payouts</h1>
          <p className="dn-muted">Pack the orders, track every payout, and see what you earn after fees.</p>
        </div>
        <Link to="/user-sell" className="dn-btn dn-btn--ghost">My listings</Link>
      </header>

      <section className="sl-stats">
        {cards.map((c) => { const Icon = c.icon; return <article key={c.label}><span><Icon size={18} /></span><div><strong>{c.value}</strong><small>{c.label}</small></div></article>; })}
      </section>

      <section className="dn-card sl-tools">
        <div className="sl-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
              {t.label} <em>{t.match ? sales.filter(t.match).length : sales.length}</em>
            </button>
          ))}
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={Package} title="No sales here yet" text="When a buyer orders one of your items, it shows up here to pack and ship." actionLabel="My listings" to="/user-sell" />
      ) : (
        <div className="sl-sales">
          {rows.map((s) => (
            <article key={s.id} className="dn-card sl-sale">
              <SafeImage src={s.image} alt={s.title} className="sl-sale-img" />
              <div className="sl-sale-main">
                <div className="sl-sale-top"><b>{s.id}</b><SaleBadge status={s.status} /><PayoutBadge status={s.payout.status} /></div>
                <h3>{s.title}</h3>
                <p className="dn-muted">Sold to {s.buyer.name}, {s.buyer.city} · {formatDate(s.placedAt)}</p>
              </div>
              <div className="sl-sale-money">
                <strong>{formatPrice(s.net)}</strong>
                <span>You receive</span>
                <small>{formatPrice(s.gross)} − {formatPrice(s.commission + s.pickupFee)} fees</small>
              </div>
              <div className="sl-sale-actions">
                {NEXT_LABEL[s.status] && (
                  <button type="button" className="dn-btn dn-btn--sm" onClick={() => { advanceSale(s.id); show(`${s.id} updated.`); }}>
                    <PackageCheck size={14} /> {NEXT_LABEL[s.status]}
                  </button>
                )}
                <Link to={`/user-sell/sales/${s.id}`} className="dn-btn dn-btn--ghost dn-btn--sm"><ReceiptText size={14} /> Details <ChevronRight size={13} /></Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {toast}
    </div>
  );
}
