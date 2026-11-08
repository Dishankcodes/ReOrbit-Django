import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Truck, Wallet, Package } from "lucide-react";

import { salesApi } from "../../../api/orders";
import SellerOrders from "../../../shared/components/SellerOrders";
import { formatPrice } from "../../../data/marketplaceData";
import Crumbs from "../../components/ui/Crumbs";
import useToast from "../../components/ui/useToast";

import "../../css/shared/ui-base.css";
import "../../css/sell/sell-base.css";
import "../../css/sell/UserSales.css";

export default function UserSales() {
  const { toast, show } = useToast();
  /* the headline numbers come from the server's own counts (one cheap request) */
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    salesApi.list("?page_size=100").then((d) => {
      if (!alive) return;
      const c = d.counts || {};
      const delivered = d.results.filter((o) => o.status === "Delivered");
      setStats({
        toShip: (c.Confirmed || 0) + (c.Packed || 0),
        transit: c.Shipped || 0,
        sold: c.Delivered || 0,
        value: delivered.reduce((n, o) => n + o.subtotal, 0),
        partial: d.total_pages > 1,
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const cards = [
    { icon: Truck, label: "Orders to ship", value: stats ? stats.toShip : "–" },
    { icon: Package, label: "On the way to buyers", value: stats ? stats.transit : "–" },
    { icon: CheckCircle2, label: "Delivered orders", value: stats ? stats.sold : "–" },
    { icon: Wallet, label: "Delivered sales value", value: stats ? `${formatPrice(stats.value)}${stats.partial ? "+" : ""}` : "–" },
  ];

  return (
    <div className="dn sl">
      <Crumbs items={[{ label: "Sell", to: "/user-sell" }, { label: "Sales & orders" }]} />

      <header className="usl-head">
        <div>
          <span className="dn-eyebrow">Your sales</span>
          <h1>Sales &amp; orders</h1>
          <p className="dn-muted">Pack each order, add the courier details, and mark it delivered.</p>
        </div>
        <Link to="/user-sell" className="dn-btn dn-btn--ghost">My listings</Link>
      </header>

      <section className="usl-stats">
        {cards.map((c) => { const Icon = c.icon; return <article key={c.label}><span><Icon size={18} /></span><div><strong>{c.value}</strong><small>{c.label}</small></div></article>; })}
      </section>

      <SellerOrders api={salesApi} role="user" accent="#2a4d3a" onToast={show} />
      {toast}
    </div>
  );
}
