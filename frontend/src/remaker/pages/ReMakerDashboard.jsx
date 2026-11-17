import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Clock3,
  Eye,
  Heart,
  Package,
  Plus,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  Wallet,
  CheckCircle2,
  CircleDollarSign,
  Sparkles,
} from "lucide-react";

import { followerStats, useFollowers } from "../data/followersStore";

import { formatPrice } from "../data/remakerMarketplaceData";
import {
  changeLabel,
  niceCeil,
  shortMoney,
  useDashboard,
  whenLabel,
} from "../data/dashboardData";

import "../css/ReMakerDashboard.css";

export default function ReMakerDashboard() {
  const navigate = useNavigate();
  const followers = useFollowers();
  const followerNumbers = followerStats(followers);

  const storedRemaker = JSON.parse(
    localStorage.getItem("reorbit_remaker") || "null",
  );

  const remakerName =
    storedRemaker?.full_name ||
    storedRemaker?.fullName ||
    storedRemaker?.name ||
    storedRemaker?.business_name ||
    storedRemaker?.businessName ||
    "ReMaker";

  const { data, loaded, loading, error, reload } = useDashboard();
  const { stats: figures, revenue, pipeline, performance, impact } = data;

  const stats = [
    {
      title: "Total Sales",
      value: formatPrice(figures.sales.value),
      change: changeLabel(figures.sales.change),
      label: "vs last month",
      icon: CircleDollarSign,
      type: "sales",
    },
    {
      title: "Orders",
      value: figures.orders.value.toLocaleString("en-IN"),
      change: changeLabel(figures.orders.change),
      label: "vs last month",
      icon: ShoppingBag,
      type: "orders",
    },
    {
      title: "Products",
      value: figures.products.value.toLocaleString("en-IN"),
      change: `+${figures.products.new}`,
      label: "new in 30 days",
      icon: Package,
      type: "products",
    },
    {
      title: "Followers",
      value: followerNumbers.total.toLocaleString("en-IN"),
      change: `+${followerNumbers.last30}`,
      label: "in the last 30 days",
      icon: Users,
      type: "followers",
    },
  ];

  const recentOrders = data.recentOrders.map((order) => ({
    ...order,
    amount: formatPrice(order.amount),
    date: whenLabel(order.at),
  }));

  const topProducts = data.topProducts.map((product) => ({
    ...product,
    revenue: formatPrice(product.revenue),
    rating: product.rating ? product.rating.toFixed(1) : "–",
  }));

  const ACTIVITY_ICON = {
    order: ShoppingBag,
    review: Star,
    follow: Users,
    return: Package,
  };
  const activities = data.activity.map((item) => ({
    icon: ACTIVITY_ICON[item.kind] || CheckCircle2,
    title: item.title,
    description: item.text,
    time: whenLabel(item.at),
  }));

  const chartData = revenue.series.map((point) => point.value);
  const chartTop = niceCeil(Math.max(...chartData, 0));
  const maxChartValue = chartTop;
  const pipelineMax = Math.max(...pipeline.map((step) => step.value), 1);
  const PIPE_ICON = {
    pending: Clock3,
    processing: Package,
    shipped: ShoppingBag,
    delivered: CheckCircle2,
  };

  return (
    <section className="remaker-dashboard">
      {/* PAGE HEADER */}
      <div className="remaker-dashboard-top">
        <div>
          <div className="remaker-dashboard-eyebrow">
            <Sparkles size={15} />
            Creator Studio
          </div>

          <h1>Welcome back, {remakerName}</h1>

          <p>
            Here&apos;s what&apos;s happening with your studio, products and
            sales.
          </p>
        </div>

        <button
          type="button"
          className="remaker-dashboard-add-btn"
          onClick={() => navigate("/remaker-products/new")}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {error && (
        <div className="remaker-dash-note" role="alert">
          <span>We could not load your numbers. {error}</span>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}
      {loading && !loaded && (
        <div className="remaker-dash-note" role="status">
          <span className="remaker-dash-spin" aria-hidden="true" />
          <span>Loading your studio numbers…</span>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="remaker-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="remaker-stat-card" key={stat.title}>
              <div className={`remaker-stat-icon ${stat.type}`}>
                <Icon size={21} />
              </div>

              <div className="remaker-stat-content">
                <span className="remaker-stat-title">{stat.title}</span>
                <strong>{stat.value}</strong>

                <div className="remaker-stat-change">
                  <span>
                    <TrendingUp size={13} />
                    {stat.change}
                  </span>
                  <small>{stat.label}</small>
                </div>
              </div>

              <button
                type="button"
                className="remaker-stat-arrow"
                onClick={() => navigate("/remaker-analytics")}
                aria-label={`View ${stat.title}`}
              >
                <ArrowUpRight size={17} />
              </button>
            </article>
          );
        })}
      </div>

      {/* MAIN DASHBOARD GRID */}
      <div className="remaker-dashboard-main-grid">
        {/* SALES CHART */}
        <section className="remaker-panel remaker-sales-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Sales Overview</h2>
              <p>Your revenue performance over the last 12 months.</p>
            </div>

            <button
              type="button"
              className="remaker-view-link"
              onClick={() => navigate("/remaker-analytics")}
            >
              View Analytics
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="remaker-sales-summary">
            <div>
              <span>Total Revenue</span>
              <strong>{formatPrice(revenue.total)}</strong>
            </div>

            <div className="remaker-sales-growth">
              <TrendingUp size={15} />
              <span>
                {revenue.change === null
                  ? "New"
                  : `${revenue.change >= 0 ? "+" : ""}${revenue.change}%`}
              </span>
              <small>vs the 12 months before</small>
            </div>
          </div>

          <div className="remaker-chart">
            <div className="remaker-chart-y">
              {[1, 0.75, 0.5, 0.25, 0].map((part) => (
                <span key={part}>{shortMoney(chartTop * part)}</span>
              ))}
            </div>

            <div className="remaker-chart-area">
              <div className="remaker-chart-grid">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <svg
                className="remaker-sales-svg"
                viewBox="0 0 900 260"
                preserveAspectRatio="none"
                aria-label="Sales chart"
              >
                <defs>
                  <linearGradient
                    id="remakerSalesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopOpacity="0.28" />
                    <stop offset="100%" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <path
                  d={`M 0 ${
                    260 - (chartData[0] / maxChartValue) * 220
                  } ${chartData
                    .map((value, index) => {
                      const x = (index / (chartData.length - 1)) * 900;

                      const y = 260 - (value / maxChartValue) * 220;

                      return `L ${x} ${y}`;
                    })
                    .join(" ")}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d={`M 0 ${
                    260 - (chartData[0] / maxChartValue) * 220
                  } ${chartData
                    .map((value, index) => {
                      const x = (index / (chartData.length - 1)) * 900;

                      const y = 260 - (value / maxChartValue) * 220;

                      return `L ${x} ${y}`;
                    })
                    .join(" ")} L 900 260 L 0 260 Z`}
                  fill="url(#remakerSalesGradient)"
                  stroke="none"
                />
              </svg>

              <div className="remaker-chart-points">
                {chartData.map((value, index) => {
                  const left = (index / (chartData.length - 1)) * 100;

                  const bottom = (value / maxChartValue) * 84;

                  return (
                    <span
                      key={`${value}-${index}`}
                      className="remaker-chart-point"
                      style={{
                        left: `${left}%`,
                        bottom: `${bottom}%`,
                      }}
                    />
                  );
                })}
              </div>

              <div className="remaker-chart-months">
                {revenue.series.map((point, index) => (
                  <span key={`${point.label}-${index}`}>{point.label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ORDER PIPELINE */}
        <section className="remaker-panel remaker-pipeline-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Order Pipeline</h2>
              <p>Current order status.</p>
            </div>

            <button
              type="button"
              className="remaker-icon-button"
              onClick={() => navigate("/remaker-orders")}
              aria-label="View orders"
            >
              <ArrowUpRight size={17} />
            </button>
          </div>

          <div className="remaker-pipeline">
            {pipeline.map((step) => {
              const Icon = PIPE_ICON[step.key] || Package;

              return (
                <div className="remaker-pipeline-item" key={step.key}>
                  <div className={`remaker-pipeline-icon ${step.key}`}>
                    <Icon size={19} />
                  </div>

                  <div>
                    <strong>{step.value.toLocaleString("en-IN")}</strong>
                    <span>{step.label}</span>
                  </div>

                  <div className="remaker-pipeline-bar">
                    <span
                      style={{ width: `${(step.value / pipelineMax) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="remaker-full-link"
            onClick={() => navigate("/remaker-orders")}
          >
            Manage all orders
            <ChevronRight size={16} />
          </button>
        </section>
      </div>

      {/* LOWER DASHBOARD GRID */}
      <div className="remaker-dashboard-lower-grid">
        {/* TOP PRODUCTS */}
        <section className="remaker-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Top Products</h2>
              <p>Your best performing products.</p>
            </div>

            <button
              type="button"
              className="remaker-view-link"
              onClick={() => navigate("/remaker-products")}
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="remaker-products-list">
            {!topProducts.length && (
              <p className="remaker-dash-empty">
                Your best sellers show up here after your first delivered order.
              </p>
            )}
            {topProducts.map((product, index) => (
              <div className="remaker-product-row" key={product.id}>
                <div className="remaker-product-number">0{index + 1}</div>

                <div className="remaker-product-placeholder">
                  <Package size={21} />
                </div>

                <div className="remaker-product-info">
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                </div>

                <div className="remaker-product-sales">
                  <strong>{product.sales}</strong>
                  <span>sales</span>
                </div>

                <div className="remaker-product-revenue">
                  <strong>{product.revenue}</strong>

                  <span>
                    <Star size={12} fill="currentColor" />
                    {product.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT ORDERS */}
        <section className="remaker-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Recent Orders</h2>
              <p>Your latest customer orders.</p>
            </div>

            <button
              type="button"
              className="remaker-view-link"
              onClick={() => navigate("/remaker-orders")}
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="remaker-orders-list">
            {!recentOrders.length && (
              <p className="remaker-dash-empty">
                New orders from customers will appear here.
              </p>
            )}
            {recentOrders.map((order) => (
              <div className="remaker-order-row" key={order.id}>
                <div className="remaker-order-icon">
                  <ShoppingBag size={18} />
                </div>

                <div className="remaker-order-info">
                  <strong>{order.product}</strong>
                  <span>
                    {order.id} · {order.customer}
                  </span>
                </div>

                <div className="remaker-order-right">
                  <strong>{order.amount}</strong>

                  <span
                    className={`remaker-order-status ${order.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {order.status}
                  </span>

                  <small>{order.date}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* BOTTOM GRID */}
      <div className="remaker-dashboard-bottom-grid">
        {/* ACTIVITY */}
        <section className="remaker-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest updates from your studio.</p>
            </div>

            <button
              type="button"
              className="remaker-icon-button"
              onClick={() => navigate("/remaker-notifications")}
              aria-label="View notifications"
            >
              <Eye size={17} />
            </button>
          </div>

          <div className="remaker-activity-list">
            {!activities.length && (
              <p className="remaker-dash-empty">
                Orders, reviews and new followers will appear here.
              </p>
            )}
            {activities.map((activity, index) => {
              const Icon = activity.icon;

              return (
                <div className="remaker-activity-item" key={index}>
                  <div className="remaker-activity-icon">
                    <Icon size={17} />
                  </div>

                  <div className="remaker-activity-content">
                    <strong>{activity.title}</strong>
                    <span>{activity.description}</span>
                  </div>

                  <small>{activity.time}</small>
                </div>
              );
            })}
          </div>
        </section>

        {/* STUDIO PERFORMANCE */}
        <section className="remaker-panel remaker-performance-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Studio Performance</h2>
              <p>Your overall marketplace performance.</p>
            </div>

            <BarChart3 size={20} />
          </div>

          <div className="remaker-performance-score">
            <div className="remaker-score-circle">
              <div>
                <strong>{performance.score ?? "–"}</strong>
                <span>/100</span>
              </div>
            </div>

            <div>
              <strong>{performance.grade || "Not scored yet"}</strong>
              <p>
                {performance.score === null
                  ? "Your score appears after your first review or delivered order."
                  : "Based on your buyer ratings and how many deliveries arrived."}
              </p>
            </div>
          </div>

          <div className="remaker-performance-items">
            <div>
              <span>
                <Eye size={15} />
                Product Views
              </span>
              <strong>{performance.views.toLocaleString("en-IN")}</strong>
            </div>

            <div>
              <span>
                <Heart size={15} />
                Wishlist Adds
              </span>
              <strong>{performance.saves.toLocaleString("en-IN")}</strong>
            </div>

            <div>
              <span>
                <Star size={15} />
                Average Rating
              </span>
              <strong>
                {performance.ratingCount ? performance.rating.toFixed(1) : "–"}
              </strong>
            </div>

            <div>
              <span>
                <Wallet size={15} />
                Avg. Order Value
              </span>
              <strong>{performance.aov ? formatPrice(performance.aov) : "–"}</strong>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="remaker-panel remaker-actions-panel">
          <div className="remaker-panel-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Manage your studio faster.</p>
            </div>
          </div>

          <div className="remaker-actions">
            <button
              type="button"
              onClick={() => navigate("/remaker-products/new")}
            >
              <span className="remaker-action-icon">
                <Plus size={19} />
              </span>
              <span>
                <strong>Add Product</strong>
                <small>Create a new listing</small>
              </span>
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/remaker-portfolio")}
            >
              <span className="remaker-action-icon">
                <Eye size={19} />
              </span>
              <span>
                <strong>Update Portfolio</strong>
                <small>Showcase your work</small>
              </span>
              <ChevronRight size={17} />
            </button>

            <button type="button" onClick={() => navigate("/remaker-orders")}>
              <span className="remaker-action-icon">
                <ShoppingBag size={19} />
              </span>
              <span>
                <strong>Manage Orders</strong>
                <small>Review customer orders</small>
              </span>
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/remaker-analytics")}
            >
              <span className="remaker-action-icon">
                <BarChart3 size={19} />
              </span>
              <span>
                <strong>View Analytics</strong>
                <small>Track your growth</small>
              </span>
              <ChevronRight size={17} />
            </button>
          </div>
        </section>
      </div>

      {/* IMPACT BANNER */}
      <section className="remaker-impact-banner">
        <div className="remaker-impact-left">
          <div className="remaker-impact-icon">
            <Sparkles size={23} />
          </div>

          <div>
            <span>Your sustainability impact</span>
            <strong>
              {impact.items
                ? <>You&apos;ve given <b>{impact.items.toLocaleString("en-IN")}</b> {impact.items === 1 ? "item" : "items"} a second life.</>
                : <>Every item you sell gives something a second life.</>}
            </strong>
          </div>
        </div>

        <div className="remaker-impact-stats">
          <div>
            <strong>{impact.items.toLocaleString("en-IN")}</strong>
            <span>Items transformed</span>
          </div>

          <div>
            <strong>{impact.co2.toLocaleString("en-IN")} kg</strong>
            <span>CO₂ avoided</span>
          </div>
        </div>
      </section>
    </section>
  );
}
