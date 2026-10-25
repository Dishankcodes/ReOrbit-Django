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
  Settings,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useReport } from "../data/reportsStore";
import { useUsers } from "../data/usersStore";
import { useRemakers } from "../data/remakersStore";
import { useProducts } from "../data/productsStore";
import { useOrders } from "../data/ordersStore";
import { useDonations } from "../data/donationsStore";
import { usePickups } from "../data/pickupsStore";
import { useNotifications } from "../data/notificationsStore";
import { useSettings } from "../data/settingsStore";
import { useAccess } from "../data/teamStore";
import { LineChart, delta, compactInr, inr, num } from "./Reports/charts";
import { timeAgo } from "../utils/format";

import "../css/Dashboard.css";
import "../css/reports/AdminReports.css";

const QUICK = [
  { key: "users", label: "Manage Users", path: "/admin-users", icon: <Users size={17} /> },
  { key: "remakers", label: "Review ReMakers", path: "/admin-remakers", icon: <Palette size={17} /> },
  { key: "products", label: "Manage Products", path: "/admin-products", icon: <ShoppingBag size={17} /> },
  { key: "warehouse", label: "Warehouse", path: "/admin-warehouse", icon: <WarehouseIcon /> },
  { key: "pickups", label: "Manage Pickups", path: "/admin-pickups", icon: <Truck size={17} /> },
  { key: "complaints", label: "Complaints", path: "/admin-complaints", icon: <ShieldAlert size={17} /> },
  { key: "reports", label: "View Reports", path: "/admin-reports", icon: <TrendingUp size={17} /> },
  { key: "shop", label: "Buy Products", path: "/admin-shop", icon: <ShoppingCart size={17} /> },
  { key: "sell", label: "Sell Products", path: "/admin-sell", icon: <IndianRupee size={17} /> },
  { key: "rewards", label: "Rewards", path: "/admin-rewards", icon: <Gift size={17} /> },
  { key: "team", label: "Team & Roles", path: "/admin-team", icon: <Users size={17} /> },
  { key: null, label: "Settings", path: "/admin-settings", icon: <Settings size={17} /> },
];

const MODULE_ICON = {
  Warehouse: Boxes, Donations: Gift, Pickups: Truck, Orders: ShoppingCart, Products: ShoppingBag,
  Rewards: Gift, Sales: IndianRupee, Users: UserPlus, ReMakers: BadgeCheck, Complaints: ShieldAlert, System: Sparkles,
};
const MODULE_TYPE = {
  Users: "user", ReMakers: "remaker", Orders: "order", Sales: "order", Donations: "donation", Pickups: "pickup", Warehouse: "pickup", Products: "order", Complaints: "user",
};
const ORDER_STATUS = {
  Completed: ["Delivered", "delivered"], Confirmed: ["Processing", "processing"], Pending: ["Pending", "pending"],
  Cancelled: ["Cancelled", "cancelled"], Returned: ["Returned", "cancelled"],
};
const pctChange = (cur, prev) => delta(cur, prev);
const changeLabel = (cur, prev) => {
  const d = pctChange(cur, prev);
  if (d == null) return { change: "New", trend: "up" };
  return { change: `${d >= 0 ? "+" : ""}${d}%`, trend: d < 0 ? "down" : "up" };
};

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

  const access = useAccess();
  const settings = useSettings();
  const firstName = (settings.profile?.name || adminName).trim().split(/\s+/)[0];

  const report = useReport("6m");
  const users = useUsers();
  const remakers = useRemakers();
  const products = useProducts();
  const orders = useOrders();
  const donations = useDonations();
  const pickups = usePickups();
  const notifications = useNotifications();

  const live = React.useMemo(() => {
    const o = report.orders.kpi;
    const dn = report.donations.kpi;
    const activeUsers = users.filter((u) => u.status !== "Deleted").length;
    const activeMakers = remakers.filter((r) => r.status !== "Deleted").length;
    const liveProducts = products.filter((p) => p.state === "live").length;
    const pendingPickups = pickups.filter((p) => ["Requested", "Scheduled"].includes(p.status)).length;
    const items = donations.filter((d) => ["Picked_Up", "Received", "Completed"].includes(d.status));
    const kg = Math.round(items.reduce((n, d) => n + (d.weight_kg || 0), 0));
    const reused = orders.filter((x) => x.order_status === "Completed").reduce((n, x) => n + (x.listing?.quantity || 1), 0) + items.reduce((n, d) => n + d.quantity, 0);
    const co2 = Math.round((kg * 1.9 + reused * 4.2)) / 1000;
    const newUsers = report.community.kpi.newInRange;
    const monthAgo = report.orders.trend;
    const cats = report.orders.categoryRows.slice(0, 5);
    const catTotal = cats.reduce((n, c) => n + c.value, 0) || 1;
    const listed = {};
    products.filter((p) => p.state === "live").forEach((p) => { listed[p.category] = (listed[p.category] || 0) + 1; });
    return {
      stats: [
        { title: "Total Users", value: num(activeUsers), change: `+${newUsers} new`, trend: "up", description: "joined in 6 months", icon: Users, path: "/admin-users" },
        { title: "ReMakers", value: num(activeMakers), change: `${remakers.filter((r) => r.status === "Active").length} active`, trend: "up", description: "verified makers", icon: Palette, path: "/admin-remakers" },
        { title: "Products", value: num(liveProducts), change: `${products.filter((p) => p.state === "pending").length} pending`, trend: "down", description: "live listings", icon: ShoppingBag, path: "/admin-products" },
        { title: "Orders", value: num(o.orders), ...changeLabel(o.orders, o.ordersPrev), description: "last 6 months", icon: Package, path: "/admin-orders" },
        { title: "Revenue", value: compactInr(o.revenue), ...changeLabel(o.revenue, o.revenuePrev), description: "paid order value", icon: IndianRupee, path: "/admin-reports?tab=sales" },
        { title: "Donations", value: num(dn.total), ...changeLabel(dn.total, dn.totalPrev), description: `${dn.pending} awaiting review`, icon: Gift, path: "/admin-donations" },
        { title: "Pickups", value: num(pendingPickups), change: `${report.donations.pk.kpi.overdue} overdue`, trend: report.donations.pk.kpi.overdue ? "down" : "up", description: "open requests", icon: Truck, path: "/admin-pickups" },
        { title: "CO₂ Saved", value: `${co2.toFixed(1)}T`, change: `${num(reused)} items`, trend: "up", description: "estimated impact", icon: Leaf, path: "/admin-reports?tab=donations" },
      ],
      revenue: o.revenue, revenueChange: changeLabel(o.revenue, o.revenuePrev),
      categories: cats.map((c) => ({ name: c.label, value: Math.round((c.value / catTotal) * 100), count: `${listed[c.label] || 0} live products · ${compactInr(c.value)}` })),
      approvals: notifications.filter((n) => n.needsAction).slice(0, 4),
      pendingCount: notifications.filter((n) => n.needsAction).length,
      activities: notifications.slice(0, 5),
      recentOrders: orders.slice(0, 5),
      kg, reused, co2, activeUsers, trend: monthAgo,
    };
  }, [report, users, remakers, products, orders, donations, pickups, notifications]);
  const PATH_KEY = { "/admin-users": "users", "/admin-remakers": "remakers", "/admin-products": "products", "/admin-orders": "orders", "/admin-reports?tab=sales": "reports", "/admin-donations": "donations", "/admin-pickups": "pickups", "/admin-reports?tab=donations": "reports" };
  const stats = live.stats.filter((x) => access.canSee(PATH_KEY[x.path] || "dashboard"));
  const { categories, approvals: pendingApprovals, activities, recentOrders } = live;

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
              {access.canSee("reports") && <button
                type="button"
                className="admin-dashboard-primary-button"
                onClick={() => navigate("/admin-reports")}
              >
                View Reports
                <ArrowRight size={15} />
              </button>}

              {access.canSee("remakers") && <button
                type="button"
                className="admin-dashboard-secondary-button"
                onClick={() => navigate("/admin-remakers")}
              >
                <BadgeCheck size={15} />
                Review ReMakers
              </button>}
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
                <strong>{live.co2.toFixed(1)}T</strong>
              </div>
            </div>

            <div className="admin-dashboard-art-card art-card-two">
              <Users size={14} />
              <div>
                <span>Users</span>
                <strong>{num(live.activeUsers)}</strong>
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

                <p>Paid order value, last 6 months. Hover for details.</p>
              </div>

              <div className="admin-dashboard-chart-value">
                <strong>{compactInr(live.revenue)}</strong>

                <span>
                  {live.revenueChange.trend === "down" ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {live.revenueChange.change}
                </span>
              </div>
            </div>

            <div className="rp-scope">
              <LineChart
                data={report.orders.trend}
                series={[{ key: "revenue", label: "Order value", color: "var(--rp-c1)" }]}
                format={inr}
                axisFormat={compactInr}
                area
              />
            </div>
          </div>

          <div className="admin-dashboard-panel admin-dashboard-category-panel">
            <div className="admin-dashboard-panel-header">
              <div>
                <span className="admin-dashboard-panel-label">MARKETPLACE</span>

                <h3>Sales by category</h3>

                <p>Share of paid order value.</p>
              </div>

              <button
                type="button"
                className="admin-dashboard-more-button"
                onClick={() => navigate("/admin-reports?tab=sales")}
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

              <span className="admin-dashboard-count-badge">{live.pendingCount} to do</span>
            </div>

            <div className="admin-dashboard-approval-list">
              {pendingApprovals.length === 0 && <p className="dash-empty">Nothing needs your attention right now.</p>}
              {pendingApprovals.map((approval) => {
                const Icon = MODULE_ICON[approval.module] || AlertCircle;

                return (
                  <div
                    className="admin-dashboard-approval-item"
                    key={approval.id}
                  >
                    <div className="admin-dashboard-approval-icon">
                      <Icon size={16} strokeWidth={1.8} />
                    </div>

                    <div className="admin-dashboard-approval-content">
                      <span>{approval.module}</span>

                      <strong>{approval.title}</strong>

                      <p>{approval.message.length > 70 ? `${approval.message.slice(0, 68)}…` : approval.message}</p>
                    </div>

                    <div className="admin-dashboard-approval-right">
                      <small>
                        <Clock3 size={10} />
                        {timeAgo(approval.at)}
                      </small>

                      <button
                        type="button"
                        onClick={() => navigate(approval.path)}
                      >
                        {approval.actionLabel}
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
              onClick={() => navigate("/admin-notifications")}
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
                const Icon = MODULE_ICON[activity.module] || Sparkles;

                return (
                  <div
                    className="admin-dashboard-activity-item"
                    key={activity.id}
                  >
                    <div
                      className={`admin-dashboard-activity-icon ${MODULE_TYPE[activity.module] || "order"}`}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                    </div>

                    <div className="admin-dashboard-activity-content">
                      <strong>{activity.title}</strong>

                      <p>{activity.message.length > 64 ? `${activity.message.slice(0, 62)}…` : activity.message}</p>

                      <span>
                        <Clock3 size={10} />
                        {timeAgo(activity.at)}
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

              {recentOrders.map((order) => {
                const [label, cls] = ORDER_STATUS[order.order_status] || [order.order_status, "pending"];
                return (
                  <div className="admin-dashboard-order-row dash-order-link" key={order.order_id} role="link" tabIndex={0} onClick={() => navigate(`/admin-orders/${order.order_id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/admin-orders/${order.order_id}`)}>
                    <strong>{order.order_id}</strong>

                    <span>{order.buyer?.name || "—"}</span>

                    <div className="admin-dashboard-order-product">
                      <div>
                        <Package size={15} />
                      </div>

                      <span>{order.listing?.title || "Order"}</span>
                    </div>

                    <strong>{inr(order.amount)}</strong>

                    <span className={`admin-dashboard-order-status ${cls}`}>{label}</span>
                  </div>
                );
              })}
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
                  <strong>{live.co2.toFixed(1)}</strong>

                  <span>tons</span>
                </div>
              </div>

              <div>
                <span>Estimated CO₂ saved</span>

                <strong>{num(live.reused)} items</strong>

                <small>kept in use, not landfill</small>
              </div>
            </div>

            <div className="admin-dashboard-impact-stats">
              <div>
                <Recycle size={15} />

                <div>
                  <strong>{num(live.reused)}</strong>

                  <span>items reused</span>
                </div>
              </div>

              <div>
                <Boxes size={15} />

                <div>
                  <strong>{num(live.kg)}</strong>

                  <span>kg donated</span>
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
            {QUICK.filter((q) => !q.key || access.canSee(q.key)).map((q) => (
              <button type="button" key={q.path} onClick={() => navigate(q.path)}>
                <div>{q.icon}</div>

                <span>{q.label}</span>

                <ChevronRight size={15} />
              </button>
            ))}
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
