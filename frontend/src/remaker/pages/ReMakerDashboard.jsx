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

import "../css/ReMakerDashboard.css";

export default function ReMakerDashboard() {
  const navigate = useNavigate();

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

  const stats = [
    {
      title: "Total Sales",
      value: "₹84,650",
      change: "+18.6%",
      label: "vs last month",
      icon: CircleDollarSign,
      type: "sales",
    },
    {
      title: "Orders",
      value: "126",
      change: "+12.4%",
      label: "this month",
      icon: ShoppingBag,
      type: "orders",
    },
    {
      title: "Products",
      value: "38",
      change: "+4",
      label: "active listings",
      icon: Package,
      type: "products",
    },
    {
      title: "Followers",
      value: "2,846",
      change: "+8.2%",
      label: "this month",
      icon: Users,
      type: "followers",
    },
  ];

  const recentOrders = [
    {
      id: "#RO-10482",
      product: "Reclaimed Wooden Lamp",
      customer: "Aarav Shah",
      amount: "₹2,450",
      status: "Processing",
      date: "Today",
    },
    {
      id: "#RO-10477",
      product: "Upcycled Denim Tote",
      customer: "Meera Patel",
      amount: "₹1,850",
      status: "Shipped",
      date: "Yesterday",
    },
    {
      id: "#RO-10471",
      product: "Bottle Glass Planter",
      customer: "Riya Mehta",
      amount: "₹950",
      status: "Delivered",
      date: "12 Sep",
    },
    {
      id: "#RO-10465",
      product: "Vintage Fabric Cushion",
      customer: "Kabir Joshi",
      amount: "₹1,250",
      status: "Delivered",
      date: "11 Sep",
    },
  ];

  const topProducts = [
    {
      name: "Reclaimed Wooden Lamp",
      category: "Home Decor",
      sales: 42,
      revenue: "₹18,900",
      rating: "4.9",
    },
    {
      name: "Upcycled Denim Tote",
      category: "Accessories",
      sales: 36,
      revenue: "₹14,800",
      rating: "4.8",
    },
    {
      name: "Bottle Glass Planter",
      category: "Garden",
      sales: 29,
      revenue: "₹9,570",
      rating: "4.9",
    },
  ];

  const activities = [
    {
      icon: ShoppingBag,
      title: "New order received",
      description: "Order #RO-10482 has been placed.",
      time: "18 min ago",
    },
    {
      icon: Star,
      title: "New 5-star review",
      description: "A customer reviewed your wooden lamp.",
      time: "2 hrs ago",
    },
    {
      icon: Users,
      title: "New followers",
      description: "You gained 18 new followers today.",
      time: "5 hrs ago",
    },
    {
      icon: CheckCircle2,
      title: "Product approved",
      description: "Your recycled glass planter is live.",
      time: "Yesterday",
    },
  ];

  const chartData = [38, 48, 42, 61, 56, 72, 68, 84, 76, 91, 87, 96];

  const maxChartValue = Math.max(...chartData);

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
              <strong>₹84,650</strong>
            </div>

            <div className="remaker-sales-growth">
              <TrendingUp size={15} />
              <span>18.6%</span>
              <small>growth</small>
            </div>
          </div>

          <div className="remaker-chart">
            <div className="remaker-chart-y">
              <span>₹10k</span>
              <span>₹7.5k</span>
              <span>₹5k</span>
              <span>₹2.5k</span>
              <span>₹0</span>
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
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
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
            <div className="remaker-pipeline-item">
              <div className="remaker-pipeline-icon pending">
                <Clock3 size={19} />
              </div>

              <div>
                <strong>12</strong>
                <span>Pending</span>
              </div>

              <div className="remaker-pipeline-bar">
                <span style={{ width: "48%" }} />
              </div>
            </div>

            <div className="remaker-pipeline-item">
              <div className="remaker-pipeline-icon processing">
                <Package size={19} />
              </div>

              <div>
                <strong>18</strong>
                <span>Processing</span>
              </div>

              <div className="remaker-pipeline-bar">
                <span style={{ width: "68%" }} />
              </div>
            </div>

            <div className="remaker-pipeline-item">
              <div className="remaker-pipeline-icon shipped">
                <ShoppingBag size={19} />
              </div>

              <div>
                <strong>9</strong>
                <span>Shipped</span>
              </div>

              <div className="remaker-pipeline-bar">
                <span style={{ width: "38%" }} />
              </div>
            </div>

            <div className="remaker-pipeline-item">
              <div className="remaker-pipeline-icon delivered">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <strong>87</strong>
                <span>Delivered</span>
              </div>

              <div className="remaker-pipeline-bar">
                <span style={{ width: "88%" }} />
              </div>
            </div>
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
            {topProducts.map((product, index) => (
              <div className="remaker-product-row" key={product.name}>
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
                <strong>92</strong>
                <span>/100</span>
              </div>
            </div>

            <div>
              <strong>Excellent</strong>
              <p>Your studio is performing better than 86% of ReMakers.</p>
            </div>
          </div>

          <div className="remaker-performance-items">
            <div>
              <span>
                <Eye size={15} />
                Product Views
              </span>
              <strong>18.4K</strong>
            </div>

            <div>
              <span>
                <Heart size={15} />
                Wishlist Adds
              </span>
              <strong>486</strong>
            </div>

            <div>
              <span>
                <Star size={15} />
                Average Rating
              </span>
              <strong>4.9</strong>
            </div>

            <div>
              <span>
                <Wallet size={15} />
                Avg. Order Value
              </span>
              <strong>₹1,980</strong>
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
              You&apos;ve given <b>386 kg</b> of materials a second life.
            </strong>
          </div>
        </div>

        <div className="remaker-impact-stats">
          <div>
            <strong>386 kg</strong>
            <span>Materials reused</span>
          </div>

          <div>
            <strong>1,248 kg</strong>
            <span>CO₂ avoided</span>
          </div>

          <div>
            <strong>94</strong>
            <span>Items transformed</span>
          </div>
        </div>
      </section>
    </section>
  );
}
