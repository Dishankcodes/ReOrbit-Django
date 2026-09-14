import React from "react";
import {
  Users,
  Palette,
  ShoppingBag,
  Package,
  IndianRupee,
  Gift,
  Truck,
  Leaf,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock3,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  BadgeCheck,
  ShoppingCart,
  Recycle,
  Eye,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Boxes,
  ClipboardCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/Dashboard.css";

const stats = [
  {
    title: "Total Users",
    value: "12,458",
    change: "+8.4%",
    trend: "up",
    description: "vs. last month",
    icon: Users,
    path: "/admin-users",
  },
  {
    title: "ReMakers",
    value: "842",
    change: "+5.7%",
    trend: "up",
    description: "vs. last month",
    icon: Palette,
    path: "/admin-remakers",
  },
  {
    title: "Products",
    value: "3,216",
    change: "+12.2%",
    trend: "up",
    description: "active listings",
    icon: ShoppingBag,
    path: "/admin-products",
  },
  {
    title: "Orders",
    value: "1,984",
    change: "+6.8%",
    trend: "up",
    description: "this month",
    icon: Package,
    path: "/admin-orders",
  },
  {
    title: "Revenue",
    value: "₹8.7L",
    change: "+14.6%",
    trend: "up",
    description: "vs. last month",
    icon: IndianRupee,
    path: "/admin-orders",
  },
  {
    title: "Donations",
    value: "587",
    change: "+9.1%",
    trend: "up",
    description: "items received",
    icon: Gift,
    path: "/admin-donations",
  },
  {
    title: "Pickups",
    value: "129",
    change: "-3.2%",
    trend: "down",
    description: "pending requests",
    icon: Truck,
    path: "/admin-pickups",
  },
  {
    title: "CO₂ Saved",
    value: "2.4T",
    change: "+18.9%",
    trend: "up",
    description: "estimated impact",
    icon: Leaf,
    path: "/admin-reports",
  },
];

const monthlyData = [
  { month: "Apr", orders: 112, revenue: 420 },
  { month: "May", orders: 138, revenue: 510 },
  { month: "Jun", orders: 154, revenue: 580 },
  { month: "Jul", orders: 171, revenue: 640 },
  { month: "Aug", orders: 194, revenue: 730 },
  { month: "Sep", orders: 226, revenue: 870 },
];

const activities = [
  {
    id: 1,
    icon: UserPlus,
    title: "New user registered",
    description: "A new user joined ReOrbit.",
    time: "8 minutes ago",
    type: "user",
  },
  {
    id: 2,
    icon: BadgeCheck,
    title: "ReMaker approved",
    description: "EarthCraft Studio was approved.",
    time: "24 minutes ago",
    type: "remaker",
  },
  {
    id: 3,
    icon: ShoppingCart,
    title: "New order received",
    description: "Order #RO-10482 was placed.",
    time: "42 minutes ago",
    type: "order",
  },
  {
    id: 4,
    icon: Gift,
    title: "Donation completed",
    description: "Donation #DN-2084 was processed.",
    time: "1 hour ago",
    type: "donation",
  },
  {
    id: 5,
    icon: Truck,
    title: "Pickup scheduled",
    description: "Pickup #PK-1032 was assigned.",
    time: "2 hours ago",
    type: "pickup",
  },
];

const pendingApprovals = [
  {
    id: 1,
    type: "ReMaker Verification",
    title: "Green Threads Studio",
    description: "Profile verification pending",
    time: "18 min ago",
    action: "Review",
    path: "/admin-remakers",
    icon: Palette,
  },
  {
    id: 2,
    type: "Product Review",
    title: "Upcycled Denim Collection",
    description: "3 products waiting for approval",
    time: "34 min ago",
    action: "Review",
    path: "/admin-products",
    icon: ShoppingBag,
  },
  {
    id: 3,
    type: "Pickup Request",
    title: "Pickup #PK-1048",
    description: "Requires warehouse assignment",
    time: "51 min ago",
    action: "Assign",
    path: "/admin-pickups",
    icon: Truck,
  },
  {
    id: 4,
    type: "Donation Review",
    title: "Donation #DN-2091",
    description: "Item inspection required",
    time: "1 hr ago",
    action: "Inspect",
    path: "/admin-donations",
    icon: ClipboardCheck,
  },
];

const recentOrders = [
  {
    id: "#RO-10482",
    customer: "Aarav Shah",
    product: "Reclaimed Wood Lamp",
    amount: "₹1,249",
    status: "Delivered",
  },
  {
    id: "#RO-10479",
    customer: "Meera Patel",
    product: "Upcycled Denim Tote",
    amount: "₹749",
    status: "Processing",
  },
  {
    id: "#RO-10474",
    customer: "Riya Mehta",
    product: "Recycled Glass Vase",
    amount: "₹899",
    status: "In Transit",
  },
  {
    id: "#RO-10468",
    customer: "Dev Joshi",
    product: "Reclaimed Wood Organizer",
    amount: "₹699",
    status: "Delivered",
  },
];

const categories = [
  {
    name: "Home & Decor",
    value: 34,
    count: "1,094 products",
  },
  {
    name: "Fashion",
    value: 27,
    count: "868 products",
  },
  {
    name: "Lifestyle",
    value: 21,
    count: "675 products",
  },
  {
    name: "Furniture",
    value: 11,
    count: "354 products",
  },
  {
    name: "Other",
    value: 7,
    count: "225 products",
  },
];

function StatCard({ stat, onClick }) {
  const Icon = stat.icon;

  return (
    <button
      type="button"
      className="admin-dashboard-stat-card"
      onClick={onClick}
    >
      <div className="admin-dashboard-stat-top">
        <div className="admin-dashboard-stat-icon">
          <Icon size={18} strokeWidth={1.8} />
        </div>

        <ArrowUpRight size={15} className="admin-dashboard-stat-arrow" />
      </div>

      <div className="admin-dashboard-stat-body">
        <span>{stat.title}</span>

        <strong>{stat.value}</strong>

        <div className="admin-dashboard-stat-bottom">
          <span className={stat.trend === "down" ? "negative" : "positive"}>
            {stat.trend === "down" ? (
              <TrendingDown size={11} />
            ) : (
              <TrendingUp size={11} />
            )}

            {stat.change}
          </span>

          <small>{stat.description}</small>
        </div>
      </div>
    </button>
  );
}

function SimpleLineChart() {
  const values = monthlyData.map((item) => item.revenue);

  const width = 700;
  const height = 260;
  const paddingX = 30;
  const paddingY = 25;

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const points = values.map((value, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (values.length - 1);

    const y =
      height -
      paddingY -
      ((value - minValue) / (maxValue - minValue)) * (height - paddingY * 2);

    return `${x},${y}`;
  });

  const polygonPoints = [
    `${paddingX},${height - paddingY}`,
    ...points,
    `${width - paddingX},${height - paddingY}`,
  ].join(" ");

  return (
    <div className="admin-dashboard-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="adminChartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopOpacity="0.22" />
            <stop offset="100%" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((line) => {
          const y = paddingY + (line * (height - paddingY * 2)) / 3;

          return (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              className="admin-chart-grid-line"
            />
          );
        })}

        <polygon points={polygonPoints} className="admin-chart-area" />

        <polyline points={points.join(" ")} className="admin-chart-line" />

        {values.map((value, index) => {
          const [x, y] = points[index].split(",").map(Number);

          return (
            <g key={index}>
              <circle cx={x} cy={y} r="4" className="admin-chart-point" />

              <circle cx={x} cy={y} r="7" className="admin-chart-point-ring" />
            </g>
          );
        })}
      </svg>

      <div className="admin-dashboard-chart-labels">
        {monthlyData.map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const adminName = (() => {
    try {
      const storedAdmin = localStorage.getItem("reorbit_admin");

      if (!storedAdmin) {
        return "Admin";
      }

      const admin = JSON.parse(storedAdmin);

      return admin?.full_name || admin?.fullName || admin?.name || "Admin";
    } catch {
      return "Admin";
    }
  })();

  const firstName = adminName.trim().split(/\s+/)[0];

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-container">
        {/* HERO */}
        <section className="admin-dashboard-welcome">
          <div className="admin-dashboard-welcome-content">
            <div className="admin-dashboard-eyebrow">
              <span className="admin-dashboard-eyebrow-dot" />
              REORBIT ADMIN CONTROL CENTER
            </div>

            <h2>
              Good to see you, <span>{firstName}.</span>
            </h2>

            <p>
              Monitor users, ReMakers, products, orders and the sustainability
              impact of the ReOrbit ecosystem.
            </p>

            <div className="admin-dashboard-welcome-actions">
              <button
                type="button"
                className="admin-dashboard-primary-button"
                onClick={() => navigate("/admin-reports")}
              >
                View Reports
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                className="admin-dashboard-secondary-button"
                onClick={() => navigate("/admin-remakers")}
              >
                <BadgeCheck size={15} />
                Review ReMakers
              </button>
            </div>
          </div>

          <div className="admin-dashboard-welcome-art">
            <div className="admin-dashboard-art-orbit orbit-one" />
            <div className="admin-dashboard-art-orbit orbit-two" />
            <div className="admin-dashboard-art-orbit orbit-three" />

            <div className="admin-dashboard-art-center">
              <Leaf size={43} strokeWidth={1.2} />
            </div>

            <div className="admin-dashboard-art-card art-card-one">
              <Recycle size={14} />
              <div>
                <span>Impact</span>
                <strong>+18.9%</strong>
              </div>
            </div>

            <div className="admin-dashboard-art-card art-card-two">
              <Users size={14} />
              <div>
                <span>Users</span>
                <strong>12.4K</strong>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="admin-dashboard-stats">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              stat={stat}
              onClick={() => navigate(stat.path)}
            />
          ))}
        </section>

        {/* ANALYTICS */}
        <section className="admin-dashboard-analytics-grid">
          <div className="admin-dashboard-panel admin-dashboard-revenue-panel">
            <div className="admin-dashboard-panel-header">
              <div>
                <span className="admin-dashboard-panel-label">PERFORMANCE</span>

                <h3>Revenue overview</h3>

                <p>Monthly marketplace revenue performance.</p>
              </div>

              <div className="admin-dashboard-chart-value">
                <strong>₹8.7L</strong>

                <span>
                  <TrendingUp size={11} />
                  14.6%
                </span>
              </div>
            </div>

            <div className="admin-dashboard-chart-wrapper">
              <div className="admin-dashboard-chart-y-axis">
                <span>₹1L</span>
                <span>₹75K</span>
                <span>₹50K</span>
                <span>₹25K</span>
              </div>

              <SimpleLineChart />
            </div>
          </div>

          <div className="admin-dashboard-panel admin-dashboard-category-panel">
            <div className="admin-dashboard-panel-header">
              <div>
                <span className="admin-dashboard-panel-label">MARKETPLACE</span>

                <h3>Product categories</h3>

                <p>Current listing distribution.</p>
              </div>

              <button
                type="button"
                className="admin-dashboard-more-button"
                onClick={() => navigate("/admin-products")}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="admin-dashboard-category-list">
              {categories.map((category) => (
                <div className="admin-dashboard-category" key={category.name}>
                  <div className="admin-dashboard-category-top">
                    <span>{category.name}</span>

                    <strong>{category.value}%</strong>
                  </div>

                  <div className="admin-dashboard-category-track">
                    <div
                      style={{
                        width: `${category.value}%`,
                      }}
                    />
                  </div>

                  <small>{category.count}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* APPROVALS + ACTIVITY */}
        <section className="admin-dashboard-middle-grid">
          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-panel-label">
                  NEEDS ATTENTION
                </span>

                <h3>Pending approvals</h3>
              </div>

              <span className="admin-dashboard-count-badge">4 pending</span>
            </div>

            <div className="admin-dashboard-approval-list">
              {pendingApprovals.map((approval) => {
                const Icon = approval.icon;

                return (
                  <div
                    className="admin-dashboard-approval-item"
                    key={approval.id}
                  >
                    <div className="admin-dashboard-approval-icon">
                      <Icon size={16} strokeWidth={1.8} />
                    </div>

                    <div className="admin-dashboard-approval-content">
                      <span>{approval.type}</span>

                      <strong>{approval.title}</strong>

                      <p>{approval.description}</p>
                    </div>

                    <div className="admin-dashboard-approval-right">
                      <small>
                        <Clock3 size={10} />
                        {approval.time}
                      </small>

                      <button
                        type="button"
                        onClick={() => navigate(approval.path)}
                      >
                        {approval.action}
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="admin-dashboard-panel-footer"
              onClick={() => navigate("/admin-remakers")}
            >
              View all pending items
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-panel-label">LIVE FEED</span>

                <h3>Recent activity</h3>
              </div>

              <Sparkles size={17} className="admin-dashboard-heading-icon" />
            </div>

            <div className="admin-dashboard-activity-list">
              {activities.map((activity) => {
                const Icon = activity.icon;

                return (
                  <div
                    className="admin-dashboard-activity-item"
                    key={activity.id}
                  >
                    <div
                      className={`admin-dashboard-activity-icon ${activity.type}`}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                    </div>

                    <div className="admin-dashboard-activity-content">
                      <strong>{activity.title}</strong>

                      <p>{activity.description}</p>

                      <span>
                        <Clock3 size={10} />
                        {activity.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="admin-dashboard-panel-footer"
              onClick={() => navigate("/admin-notifications")}
            >
              View notification center
              <ArrowRight size={13} />
            </button>
          </div>
        </section>

        {/* ORDERS + IMPACT */}
        <section className="admin-dashboard-bottom-grid">
          <div className="admin-dashboard-panel admin-dashboard-orders-panel">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-panel-label">ORDERS</span>

                <h3>Recent orders</h3>
              </div>

              <button
                type="button"
                className="admin-dashboard-view-all"
                onClick={() => navigate("/admin-orders")}
              >
                View all
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="admin-dashboard-orders-table">
              <div className="admin-dashboard-orders-header">
                <span>ORDER</span>
                <span>CUSTOMER</span>
                <span>PRODUCT</span>
                <span>AMOUNT</span>
                <span>STATUS</span>
              </div>

              {recentOrders.map((order) => (
                <div className="admin-dashboard-order-row" key={order.id}>
                  <strong>{order.id}</strong>

                  <span>{order.customer}</span>

                  <div className="admin-dashboard-order-product">
                    <div>
                      <Package size={15} />
                    </div>

                    <span>{order.product}</span>
                  </div>

                  <strong>{order.amount}</strong>

                  <span
                    className={`admin-dashboard-order-status ${order.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-dashboard-panel admin-dashboard-impact-panel">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-panel-label">
                  SUSTAINABILITY
                </span>

                <h3>Platform impact</h3>
              </div>

              <Leaf size={19} className="admin-dashboard-heading-icon" />
            </div>

            <div className="admin-dashboard-impact-main">
              <div className="admin-dashboard-impact-circle">
                <div>
                  <strong>2.4</strong>

                  <span>tons</span>
                </div>
              </div>

              <div>
                <span>Estimated CO₂ saved</span>

                <strong>+18.9%</strong>

                <small>compared with last month</small>
              </div>
            </div>

            <div className="admin-dashboard-impact-stats">
              <div>
                <Recycle size={15} />

                <div>
                  <strong>4,892</strong>

                  <span>items reused</span>
                </div>
              </div>

              <div>
                <Boxes size={15} />

                <div>
                  <strong>1,284</strong>

                  <span>kg material saved</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="admin-dashboard-impact-button"
              onClick={() => navigate("/admin-reports")}
            >
              Explore impact report
              <ArrowUpRight size={14} />
            </button>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="admin-dashboard-quick-section">
          <div className="admin-dashboard-section-heading">
            <div>
              <span className="admin-dashboard-panel-label">QUICK ACTIONS</span>

              <h3>Manage ReOrbit</h3>
            </div>
          </div>

          <div className="admin-dashboard-quick-grid">
            <button type="button" onClick={() => navigate("/admin-users")}>
              <div>
                <Users size={17} />
              </div>

              <span>Manage Users</span>

              <ChevronRight size={15} />
            </button>

            <button type="button" onClick={() => navigate("/admin-remakers")}>
              <div>
                <Palette size={17} />
              </div>

              <span>Review ReMakers</span>

              <ChevronRight size={15} />
            </button>

            <button type="button" onClick={() => navigate("/admin-products")}>
              <div>
                <ShoppingBag size={17} />
              </div>

              <span>Manage Products</span>

              <ChevronRight size={15} />
            </button>

            <button type="button" onClick={() => navigate("/admin-warehouse")}>
              <div>
                <WarehouseIcon />
              </div>

              <span>Warehouse</span>

              <ChevronRight size={15} />
            </button>

            <button type="button" onClick={() => navigate("/admin-pickups")}>
              <div>
                <Truck size={17} />
              </div>

              <span>Manage Pickups</span>

              <ChevronRight size={15} />
            </button>

            <button type="button" onClick={() => navigate("/admin-reports")}>
              <div>
                <TrendingUp size={17} />
              </div>

              <span>View Reports</span>

              <ChevronRight size={15} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function WarehouseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  );
}
