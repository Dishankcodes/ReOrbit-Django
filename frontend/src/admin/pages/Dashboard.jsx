import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gift,
  HandCoins,
  IndianRupee,
  LayoutTemplate,
  Leaf,
  LifeBuoy,
  Package,
  PackageCheck,
  Palette,
  Recycle,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { apiRequest } from "../../api/api";
import { adminPayoutApi } from "../../api/payouts";
import { useDashboard } from "../data/adminopsStore";
import { useReport } from "../data/reportsStore";
import { useOrders } from "../data/ordersStore";
import { useAccess } from "../data/teamStore";
import { LineChart, compactInr, delta, inr, num } from "./Reports/charts";
import { timeAgo } from "../utils/format";

import "../css/reports/AdminReports.css";
import "../css/DashboardV2.css";

/* =========================================================
   Admin › Dashboard
   The top of the page (greeting, today's work, headline numbers) comes from one light request
   (GET /api/adminops/admin/dashboard/). Every section further down loads its own data only when
   it scrolls into view, so opening the dashboard is quick.
   Everything is real data, and each person only sees the areas their role can open.
   ========================================================= */

/* renders `children` once the placeholder is near the screen */
function LazySection({ minHeight = 260, children, label }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <div ref={ref} className="adb-lazy" style={shown ? undefined : { minHeight }} aria-busy={!shown}>
      {shown ? children : <Skeleton label={label} />}
    </div>
  );
}

function Skeleton({ label = "Loading…", rows = 3 }) {
  return (
    <div className="adb-card adb-skel" aria-label={label}>
      <i className="adb-skel-title" />
      {Array.from({ length: rows }).map((_, n) => (
        <i key={n} className="adb-skel-line" style={{ width: `${92 - n * 14}%` }} />
      ))}
    </div>
  );
}

function SectionHead({ eyebrow, title, action, onAction }) {
  return (
    <div className="adb-head">
      <div>
        <span className="adb-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {action && (
        <button type="button" className="adb-link" onClick={onAction}>
          {action} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

const trendOf = (cur, prev) => {
  const d = delta(cur, prev);
  if (d == null) return { text: "New", down: false };
  return { text: `${d >= 0 ? "+" : ""}${d}%`, down: d < 0 };
};

/* ---------- today's work, from the operations counts the server already scoped to this role ---------- */
function todayTiles(ops) {
  const t = [];
  const add = (cond, tile) => cond && t.push(tile);
  const o = ops.orders;
  add(o, { key: "pack", icon: PackageCheck, label: "Orders to pack", count: o?.to_pack || 0, path: "/admin-orders", tone: "open" });
  add(o, { key: "ship", icon: Truck, label: "Ready to ship", count: o?.to_ship || 0, path: "/admin-orders", tone: "open" });
  add(o, { key: "failed", icon: XCircle, label: "Failed deliveries", count: o?.delivery_failed || 0, path: "/admin-orders", tone: "urgent" });
  add(o, { key: "returns", icon: RotateCcw, label: "Open returns", count: o?.returns_open || 0, path: "/admin-orders", tone: "urgent" });
  add(o, { key: "refunds", icon: HandCoins, label: "Refunds due", count: o?.refunds_due || 0, path: "/admin-earnings?tab=refunds", tone: "urgent" });
  add(ops.donations, { key: "donations", icon: Gift, label: "Donations to review", count: ops.donations?.to_review || 0, path: "/admin-donations", tone: "open" });
  add(ops.pickups, {
    key: "pickups", icon: Truck, label: "Open pickups", count: ops.pickups?.open || 0, path: "/admin-pickups",
    tone: ops.pickups?.overdue ? "urgent" : "open", sub: ops.pickups?.overdue ? `${ops.pickups.overdue} overdue` : "",
  });
  add(ops.payouts, {
    key: "payouts", icon: Wallet, label: "Payouts to send", count: ops.payouts?.pending || 0, path: "/admin-earnings",
    tone: "open", sub: ops.payouts?.pending_amount ? inr(ops.payouts.pending_amount) : "",
  });
  add(ops.warehouse, {
    key: "warehouse", icon: Boxes, label: "At the dock", count: ops.warehouse?.at_dock || 0, path: "/admin-warehouse",
    tone: ops.warehouse?.alerts ? "urgent" : "open", sub: ops.warehouse?.alerts ? `${ops.warehouse.alerts} alerts` : "",
  });
  add(ops.complaints, { key: "complaints", icon: ShieldAlert, label: "Open complaints", count: ops.complaints?.open || 0, path: "/admin-complaints", tone: "urgent" });
  add(ops.support, { key: "support", icon: LifeBuoy, label: "Support tickets", count: ops.support?.open || 0, path: "/admin-support", tone: "open" });
  return t;
}

/* ---------- sections that load on scroll ---------- */
function Performance({ navigate }) {
  const report = useReport("6m");
  if (report.loading) return <Skeleton label="Loading performance" rows={5} />;
  const o = report.orders.kpi;
  const dn = report.donations.kpi;
  const cats = report.orders.categoryRows.slice(0, 6);
  const total = cats.reduce((n, c) => n + c.value, 0) || 1;
  const kpis = [
    { label: "Revenue", value: compactInr(o.revenue), t: trendOf(o.revenue, o.revenuePrev), icon: IndianRupee },
    { label: "Orders", value: num(o.orders), t: trendOf(o.orders, o.ordersPrev), icon: Package },
    { label: "Donations", value: num(dn.total), t: trendOf(dn.total, dn.totalPrev), icon: Gift },
    { label: "New members", value: num(report.community.kpi.newInRange), t: null, icon: UserPlus },
  ];
  return (
    <section className="adb-card">
      <SectionHead eyebrow="Last 6 months" title="Performance" action="Full reports" onAction={() => navigate("/admin-reports")} />
      <div className="adb-kpis">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="adb-kpi">
              <span className="adb-kpi-icon">
                <Icon size={16} />
              </span>
              <small>{k.label}</small>
              <strong>{k.value}</strong>
              {k.t && (
                <em className={k.t.down ? "down" : "up"}>
                  {k.t.down ? <TrendingDown size={12} /> : <TrendingUp size={12} />} {k.t.text} vs previous
                </em>
              )}
            </div>
          );
        })}
      </div>
      <div className="adb-perf">
        <div className="adb-perf-chart rp-scope">
          <h4>Paid order value</h4>
          <LineChart
            data={report.orders.trend}
            series={[{ key: "revenue", label: "Order value", color: "var(--rp-c1)" }]}
            format={inr}
            axisFormat={compactInr}
            area
          />
        </div>
        <div className="adb-perf-cats">
          <h4>Sales by category</h4>
          {cats.length === 0 && <p className="adb-empty">No paid orders in this period yet.</p>}
          {cats.map((c) => {
            const pct = Math.round((c.value / total) * 100);
            return (
              <div key={c.label} className="adb-bar">
                <div>
                  <span>{c.label}</span>
                  <b>{pct}%</b>
                </div>
                <i>
                  <span style={{ width: `${pct}%` }} />
                </i>
                <small>{compactInr(c.value)}</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Queue({ dashboard, navigate }) {
  const ICON = { Donations: Gift, Pickups: Truck, Orders: ShoppingCart, Products: ShoppingBag, Users: UserPlus, ReMakers: Palette, Complaints: ShieldAlert, Warehouse: Boxes, Sales: IndianRupee, Rewards: Gift };
  return (
    <div className="adb-two">
      <section className="adb-card">
        <SectionHead eyebrow="Needs a decision" title="Waiting on you" action="Notifications" onAction={() => navigate("/admin-notifications")} />
        {dashboard.approvals.length === 0 ? (
          <p className="adb-empty">
            <CheckCircle2 size={16} /> Nothing is waiting on you right now.
          </p>
        ) : (
          <ul className="adb-list">
            {dashboard.approvals.map((a) => {
              const Icon = ICON[a.module] || AlertTriangle;
              return (
                <li key={a.id}>
                  <span className="adb-li-icon">
                    <Icon size={15} />
                  </span>
                  <div>
                    <small>{a.module}</small>
                    <strong>{a.title}</strong>
                    <p>{a.message}</p>
                  </div>
                  <button type="button" className="adb-chip-btn" onClick={() => navigate(a.path)}>
                    {a.actionLabel || "Open"} <ArrowUpRight size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="adb-card">
        <SectionHead eyebrow="Live feed" title="Recent activity" />
        {dashboard.activities.length === 0 ? (
          <p className="adb-empty">No activity yet.</p>
        ) : (
          <ul className="adb-feed">
            {dashboard.activities.map((a) => {
              const Icon = ICON[a.module] || Sparkles;
              return (
                <li key={a.id}>
                  <span className="adb-feed-dot">
                    <Icon size={13} />
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.message}</p>
                    <small>
                      <Clock3 size={11} /> {timeAgo(a.at)}
                    </small>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const ORDER_TONE = { Delivered: "good", Cancelled: "bad", Returned: "bad", Shipped: "info", Packed: "info", Confirmed: "wait", Pending_Payment: "wait" };
function RecentOrders({ navigate }) {
  const orders = useOrders();
  const rows = orders.slice(0, 6);
  return (
    <section className="adb-card">
      <SectionHead eyebrow="Marketplace" title="Recent orders" action="All orders" onAction={() => navigate("/admin-orders")} />
      {rows.length === 0 ? (
        <p className="adb-empty">No orders yet.</p>
      ) : (
        <div className="adb-table" role="table">
          <div className="adb-tr adb-th" role="row">
            <span>Order</span>
            <span>Buyer</span>
            <span>Item</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {rows.map((o) => (
            <button type="button" key={o.order_id} className="adb-tr" role="row" onClick={() => navigate(`/admin-orders/${o.order_id}`)}>
              <b>{o.order_id}</b>
              <span>{o.buyer?.name || "—"}</span>
              <span className="adb-ellipsis">{o.listing?.title || "Order"}</span>
              <b>{inr(o.amount)}</b>
              <span className={`adb-pill ${ORDER_TONE[o.server_status] || "wait"}`}>
                {String(o.server_status || o.order_status || "").replace(/_/g, " ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function MoneyAndImpact({ dashboard, navigate, canMoney }) {
  const [money, setMoney] = useState(null);
  useEffect(() => {
    if (!canMoney) return;
    adminPayoutApi.summary().then(setMoney).catch(() => setMoney(false));
  }, [canMoney]);
  const { kg, reused, co2_tonnes: co2 } = dashboard.impact;
  return (
    <div className="adb-two">
      {canMoney && (
        <section className="adb-card">
          <SectionHead eyebrow="Seller money" title="Payouts & refunds" action="Open earnings" onAction={() => navigate("/admin-earnings")} />
          {money === null ? (
            <Skeleton rows={3} />
          ) : money === false ? (
            <p className="adb-empty">Couldn't load payouts.</p>
          ) : (
            <>
              {(money.due?.overdue || 0) > 0 && (
                <p className="adb-alert">
                  <AlertTriangle size={15} /> {money.due.overdue} payout(s) overdue · {inr(money.due.overdue_amount)}
                </p>
              )}
              <dl className="adb-money">
                <div>
                  <dt>Waiting to be paid</dt>
                  <dd>{inr(money.awaiting_payment)}</dd>
                </div>
                <div>
                  <dt>Available to sellers</dt>
                  <dd>{inr(money.available)}</dd>
                </div>
                <div>
                  <dt>Clearing</dt>
                  <dd>{inr(money.pending)}</dd>
                </div>
                <div>
                  <dt>COD cash to collect</dt>
                  <dd>
                    {inr(money.cod_to_collect)} <small>({money.cod_orders} orders)</small>
                  </dd>
                </div>
                <div>
                  <dt>Refunds open</dt>
                  <dd>{num(money.refunds_open)}</dd>
                </div>
                <div>
                  <dt>Paid out in total</dt>
                  <dd>{inr(money.paid_total)}</dd>
                </div>
              </dl>
            </>
          )}
        </section>
      )}
      <section className="adb-card adb-impact">
        <SectionHead eyebrow="Sustainability" title="Platform impact" action="Impact report" onAction={() => navigate("/admin-reports?tab=donations")} />
        <div className="adb-impact-main">
          <div className="adb-ring">
            <strong>{Number(co2 || 0).toFixed(1)}</strong>
            <span>tonnes CO₂</span>
          </div>
          <ul>
            <li>
              <Recycle size={16} />
              <div>
                <strong>{num(reused)}</strong>
                <span>items kept in use</span>
              </div>
            </li>
            <li>
              <Boxes size={16} />
              <div>
                <strong>{num(kg)} kg</strong>
                <span>donated and weighed</span>
              </div>
            </li>
            <li>
              <Leaf size={16} />
              <div>
                <strong>Estimated</strong>
                <span>from weight and items reused</span>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

const QUICK = [
  { key: "users", label: "Users", path: "/admin-users", icon: Users },
  { key: "remakers", label: "ReMakers", path: "/admin-remakers", icon: Palette },
  { key: "products", label: "Products", path: "/admin-products", icon: ShoppingBag },
  { key: "orders", label: "Orders", path: "/admin-orders", icon: ShoppingCart },
  { key: "donations", label: "Donations", path: "/admin-donations", icon: Gift },
  { key: "pickups", label: "Pickups", path: "/admin-pickups", icon: Truck },
  { key: "warehouse", label: "Warehouse", path: "/admin-warehouse", icon: Boxes },
  { key: "content", label: "Content", path: "/admin-content", icon: LayoutTemplate },
  { key: "complaints", label: "Complaints", path: "/admin-complaints", icon: ShieldAlert },
  { key: "earnings", label: "Earnings", path: "/admin-earnings", icon: Wallet },
  { key: "reports", label: "Reports", path: "/admin-reports", icon: TrendingUp },
  { key: null, label: "Settings", path: "/admin-settings", icon: Settings },
];

/* ---------- the page ---------- */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const access = useAccess();
  const dashboard = useDashboard();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiRequest("/adminops/admin/system-status/")
      .then((r) => setHealth(r.data))
      .catch(() => setHealth(null));
  }, []);

  const firstName = String(access.me?.name || "Admin").trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const tiles = todayTiles(dashboard.operations || {});
  const todo = tiles.reduce((n, t) => n + t.count, 0);
  const headline = [
    access.canSee("users") && { label: "Members", value: num(dashboard.users.total), sub: `${num(dashboard.users.active)} active`, icon: Users, path: "/admin-users" },
    access.canSee("remakers") && { label: "ReMakers", value: num(dashboard.remakers.total), sub: `${num(dashboard.remakers.active)} active`, icon: Palette, path: "/admin-remakers" },
    access.canSee("products") && { label: "Live products", value: num(dashboard.products.live), sub: `${num(dashboard.products.off_market)} off market`, icon: ShoppingBag, path: "/admin-products" },
    { label: "Items reused", value: num(dashboard.impact.reused), sub: `${Number(dashboard.impact.co2_tonnes || 0).toFixed(1)} t CO₂ saved`, icon: Recycle, path: access.canSee("reports") ? "/admin-reports" : null },
  ].filter(Boolean);

  return (
    <div className="adb">
      {/* hero */}
      <header className="adb-hero">
        <div>
          <span className="adb-hero-eyebrow">
            <Sparkles size={13} /> ReOrbit control centre
          </span>
          <h2>
            {greeting}, <em>{firstName}</em>.
          </h2>
          <p>
            {today} ·{" "}
            {!dashboard.loaded ? "getting today's numbers…" : todo > 0 ? `${num(todo)} things on today's list.` : "Everything is up to date."}
          </p>
        </div>
        <div className="adb-hero-side">
          {health && (
            <button type="button" className={`adb-health ${health.overall}`} onClick={() => navigate("/admin-help")}>
              {health.overall === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              {health.overall === "ok" ? "All systems working" : health.overall === "warn" ? "Some things to check" : "Something is down"}
            </button>
          )}
          <div className="adb-hero-actions">
            {access.canSee("reports") && (
              <button type="button" className="adb-btn light" onClick={() => navigate("/admin-reports")}>
                Reports <ArrowRight size={15} />
              </button>
            )}
            <button type="button" className="adb-btn ghost" onClick={() => navigate("/admin-notifications")}>
              <Bell size={15} /> Notifications
            </button>
          </div>
        </div>
      </header>

      {dashboard.error && (
        <p className="adb-alert">
          <AlertTriangle size={15} /> {dashboard.error}{" "}
          <button type="button" className="adb-link" onClick={dashboard.retry}>
            Try again
          </button>
        </p>
      )}

      {/* today's work */}
      {tiles.length > 0 && (
        <section className="adb-card">
          <SectionHead eyebrow="Today" title="What needs doing" />
          <div className="adb-tiles">
            {tiles.map((t) => {
              const Icon = t.icon;
              const state = t.count === 0 ? "clear" : t.tone;
              return (
                <button key={t.key} type="button" className={`adb-tile ${state}`} onClick={() => navigate(t.path)}>
                  <span className="adb-tile-icon">
                    <Icon size={17} />
                  </span>
                  <strong>{dashboard.loaded ? num(t.count) : "–"}</strong>
                  <span>{t.label}</span>
                  <small>{t.count === 0 ? "All clear" : t.sub || "Open"}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* headline numbers */}
      <section className="adb-stats">
        {headline.map((h) => {
          const Icon = h.icon;
          return (
            <button key={h.label} type="button" className="adb-stat" onClick={() => h.path && navigate(h.path)} disabled={!h.path}>
              <span className="adb-stat-icon">
                <Icon size={18} />
              </span>
              <div>
                <small>{h.label}</small>
                <strong>{dashboard.loaded ? h.value : "–"}</strong>
                <span>{h.sub}</span>
              </div>
              {h.path && <ChevronRight size={16} className="adb-stat-go" />}
            </button>
          );
        })}
      </section>

      {/* everything below loads as you scroll */}
      {access.canSee("reports") && (
        <LazySection minHeight={420} label="Loading performance">
          <Performance navigate={navigate} />
        </LazySection>
      )}

      <LazySection minHeight={300} label="Loading your queue">
        <Queue dashboard={dashboard} navigate={navigate} />
      </LazySection>

      {access.canSee("orders") && (
        <LazySection minHeight={320} label="Loading recent orders">
          <RecentOrders navigate={navigate} />
        </LazySection>
      )}

      <LazySection minHeight={300} label="Loading money and impact">
        <MoneyAndImpact dashboard={dashboard} navigate={navigate} canMoney={access.canSee("earnings")} />
      </LazySection>

      <LazySection minHeight={160} label="Loading shortcuts">
        <section className="adb-card">
          <SectionHead eyebrow="Shortcuts" title="Manage ReOrbit" />
          <div className="adb-quick">
            {QUICK.filter((q) => !q.key || access.canSee(q.key)).map((q) => {
              const Icon = q.icon;
              return (
                <button key={q.path} type="button" onClick={() => navigate(q.path)}>
                  <span>
                    <Icon size={17} />
                  </span>
                  {q.label}
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
        </section>
      </LazySection>
    </div>
  );
}
