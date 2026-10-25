import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getAnalytics } from "../../data/analyticsData";

import BarList from "./components/BarList";
import DonutCard from "./components/DonutCard";
import FunnelCard from "./components/FunnelCard";
import Heatmap from "./components/Heatmap";
import Insights from "./components/Insights";
import KpiCard from "./components/KpiCard";
import ProductsTable from "./components/ProductsTable";
import RangeTabs from "./components/RangeTabs";
import TrendChart from "./components/TrendChart";
import { fmtNumber, fmtPercent, formatPrice } from "./components/format";

import "./ReMakerAnalytics.css";

export default function ReMakerAnalytics() {
  const [range, setRange] = useState("30");

  const data = useMemo(() => getAnalytics(range), [range]);
  const { current, deltas, series } = data;

  const spark = (key) => series.map((point) => point[key]);

  const downloadCsv = () => {
    const header = ["Period", "Earnings", "Orders", "Views", "Wishlist saves"];
    const lines = series.map((point) => [
      point.label,
      point.revenue,
      point.orders,
      point.views,
      point.saves,
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");

    link.href = url;
    link.download = `reorbit-analytics-${range}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="ana">
      {/* ================= HEADER ================= */}
      <header className="ana-top">
        <div>
          <h2>Studio analytics</h2>
          <p>
            {data.range.long}, compared with the{" "}
            {data.range.days === 365 ? "year" : `${data.range.days} days`}{" "}
            before. These are sample numbers until your real data is connected.
          </p>
        </div>

        <div className="ana-top-actions">
          <RangeTabs value={range} onChange={setRange} />
          <button type="button" className="ana-btn ghost" onClick={downloadCsv}>
            Download CSV
          </button>
        </div>
      </header>

      {/* ================= KPIs ================= */}
      <div className="ana-kpis">
        <KpiCard
          tone="featured"
          label="Net earnings"
          value={formatPrice(current.revenue)}
          hint="After the ReOrbit fee"
          delta={deltas.revenue}
          series={spark("revenue")}
        />
        <KpiCard
          label="Orders"
          value={fmtNumber(current.orders)}
          hint="Placed by customers"
          delta={deltas.orders}
          series={spark("orders")}
        />
        <KpiCard
          label="Product views"
          value={fmtNumber(current.views)}
          hint={`${fmtNumber(current.visits)} profile visits`}
          delta={deltas.views}
          series={spark("views")}
        />
        <KpiCard
          label="Conversion rate"
          value={fmtPercent(current.conv, 2)}
          hint="Views that became orders"
          delta={deltas.conv}
          series={series.map((point) =>
            point.views ? (point.orders / point.views) * 100 : 0,
          )}
        />
        <KpiCard
          label="Average order"
          value={formatPrice(current.aov)}
          hint="Earnings per order"
          delta={deltas.aov}
          series={series.map((point) =>
            point.orders ? point.revenue / point.orders : 0,
          )}
        />
        <KpiCard
          label="New followers"
          value={fmtNumber(current.followers)}
          hint="People who followed you"
          delta={deltas.followers}
          series={spark("followers")}
        />
      </div>

      {/* ================= TREND ================= */}
      <TrendChart series={series} rangeLabel={data.range.long} />

      {/* ================= FUNNEL + CATEGORIES ================= */}
      <div className="ana-two">
        <FunnelCard funnel={data.funnel} />
        <DonutCard categories={data.categories} />
      </div>

      {/* ================= PRODUCTS ================= */}
      <ProductsTable products={data.products} />

      {/* ================= SOURCES + CITIES ================= */}
      <div className="ana-two">
        <BarList
          title="Where shoppers find you"
          subtitle="Traffic sources for your product views"
          items={data.sources}
          valueLabel={(item) => `${fmtPercent(item.percent, 0)}`}
          sideLabel={(item) => `${fmtNumber(item.value)} views`}
        />
        <BarList
          title="Where your buyers live"
          subtitle="Orders by city"
          items={data.cities}
          valueLabel={(item) => `${fmtNumber(item.orders)} orders`}
          sideLabel={(item) => `${formatPrice(item.revenue)} earned`}
        />
      </div>

      {/* ================= HEATMAP ================= */}
      <Heatmap heatmap={data.heatmap} />

      {/* ================= INSIGHTS ================= */}
      <Insights data={data} />

      {/* ================= RELATED PAGES ================= */}
      <nav className="ana-related" aria-label="Related pages">
        <Link to="/remaker-earnings">
          <strong>Earnings</strong>
          <span>See what you can withdraw</span>
        </Link>
        <Link to="/remaker-reviews">
          <strong>Reviews</strong>
          <span>Read and reply to customers</span>
        </Link>
        <Link to="/remaker-followers">
          <strong>Followers</strong>
          <span>See who follows your work</span>
        </Link>
      </nav>
    </section>
  );
}
