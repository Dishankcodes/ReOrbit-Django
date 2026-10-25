import React from "react";
import AdminNavbar from "../../components/AdminNavbar";
import AdminFooter from "../../components/AdminFooter";
import { useUsers } from "../../data/usersStore";
import { useRemakers } from "../../data/remakersStore";
import { useProducts } from "../../data/productsStore";
import { useReport } from "../../data/reportsStore";
import "../../css/Home.css";

const managementItems = [
  {
    icon: "group",
    title: "Users & ReMakers",
    text: "Review accounts, verify ReMakers, and warn, suspend or block when something is wrong. Every action is recorded.",
  },
  {
    icon: "inventory_2",
    title: "Products & listings",
    text: "Approve or reject what members and ReMakers post, and keep the marketplace accurate and trustworthy.",
  },
  {
    icon: "receipt_long",
    title: "Orders & payments",
    text: "Follow every order from placed to delivered, confirm payments, handle cancellations, returns and refunds.",
  },
  {
    icon: "volunteer_activism",
    title: "Donations & pickups",
    text: "Accept or reject donations, schedule free pickups with a partner, and see which ones are running late.",
  },
  {
    icon: "warehouse",
    title: "Warehouse",
    text: "Receive stock, give it a rack and bin, send it for refurbishment and get alerted when a product stops selling.",
  },
  {
    icon: "storefront",
    title: "Buy & sell as the platform",
    text: "Buy from members and ReMakers, then list refurbished stock for sale with photos and track each selling order.",
  },
  {
    icon: "redeem",
    title: "Rewards & vouchers",
    text: "Set how many Orbit points members earn, create vouchers and coupons, and review every redemption.",
  },
  {
    icon: "account_balance_wallet",
    title: "Earnings & reports",
    text: "See what the platform fee and your own sales earn, where the money goes and how the marketplace is growing.",
  },
  {
    icon: "admin_panel_settings",
    title: "Team & permissions",
    text: "Add sub-admins such as warehouse staff or support and give each one view or edit access to only what they need.",
  },
];

const responsibilities = [
  {
    number: "01",
    icon: "verified_user",
    title: "Review & verify",
    text: "Check new donations, listings, ReMakers and reported accounts before they affect the marketplace.",
  },
  {
    number: "02",
    icon: "local_shipping",
    title: "Keep stock moving",
    text: "Schedule pickups, shelve what arrives, refurbish it and cut the price or donate it when it will not sell.",
  },
  {
    number: "03",
    icon: "payments",
    title: "Handle the money",
    text: "Confirm payments, ship and deliver orders, issue refunds and watch the platform fee and sales come in.",
  },
  {
    number: "04",
    icon: "lock_person",
    title: "Control access",
    text: "Decide who on the team can see or change each part of the admin, and preview it exactly as they would.",
  },
];

const flow = [
  { icon: "volunteer_activism", label: "Donate or list" },
  { icon: "local_shipping", label: "Pickup" },
  { icon: "warehouse", label: "Warehouse" },
  { icon: "handyman", label: "Refurbish" },
  { icon: "shopping_bag", label: "Sell" },
  { icon: "account_balance_wallet", label: "Earn" },
];

const compact = (n) =>
  n >= 1e7
    ? `₹${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5
      ? `₹${(n / 1e5).toFixed(1)}L`
      : n >= 1e3
        ? `₹${(n / 1e3).toFixed(1)}K`
        : `₹${Math.round(n)}`;

export default function AdminHome() {
  const users = useUsers();
  const remakers = useRemakers();
  const products = useProducts();
  const report = useReport("all");
  const memberCount = users.filter((u) => u.status !== "Deleted").length;
  const makerCount = remakers.filter((r) => r.status === "Active").length;
  const liveCount = products.filter((p) => p.state === "live").length;

  return (
    <div className="admin-home-container">
      <AdminNavbar />

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="hero-section">
          <div className="hero-text-container">
            <span className="hero-badge">REORBIT ADMIN CONSOLE</span>

            <h1 className="hero-title">
              Manage the <span className="font-bricolage">ReOrbit</span>{" "}
              ecosystem.
            </h1>

            <p className="hero-description">
              One console to review donations, move stock through the warehouse,
              handle orders and payments, reward members and see what ReOrbit
              earns, with access you control for every team member.
            </p>

            <div className="hero-actions">
              <a href="/admin-login" className="btn-primary">
                Admin Login
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>

              <a href="/admin-how-it-works" className="btn-secondary">
                How it works
                <span className="material-symbols-outlined">account_tree</span>
              </a>
            </div>
          </div>

          {/* HERO VISUAL */}

          <div className="hero-image-container">
            <div className="hero-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800"
                alt="ReOrbit administration workspace"
                className="hero-img"
              />

              {/* ITEMS */}

              <div className="overlay-badge top-right">
                <span className="material-symbols-outlined badge-icon">
                  inventory_2
                </span>

                <div>
                  <div className="badge-value">{liveCount}</div>

                  <div className="badge-label">LIVE LISTINGS</div>
                </div>
              </div>

              {/* REMAKERS */}

              <div className="overlay-badge bottom-left">
                <span className="material-symbols-outlined badge-icon">
                  handyman
                </span>

                <div>
                  <div className="badge-value">{makerCount}</div>

                  <div className="badge-label">ACTIVE REMAKERS</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PLATFORM FLOW
        ===================================================== */}

        <section className="process-section">
          <h3 className="process-title">
            Follow one item from a doorstep to a new home.
          </h3>

          <div className="process-steps">
            {flow.map((step, index) => (
              <React.Fragment key={step.label}>
                <span className="step-pill">
                  <span className="material-symbols-outlined">{step.icon}</span>
                  {step.label}
                </span>

                {index < flow.length - 1 && (
                  <span className="arrow material-symbols-outlined">
                    arrow_forward
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* =====================================================
            ADMIN CONTROL CENTER
        ===================================================== */}

        <section className="overview-section">
          <div className="section-heading">
            <span className="section-label">ADMIN CONTROL CENTER</span>

            <h2>Nine areas. One place to run them.</h2>

            <p>
              Each area below is a page in the admin panel. They share the same
              live data, so an order, a donation or a stock change shows up
              everywhere it matters.
            </p>
          </div>

          <div className="management-grid">
            {managementItems.map((item) => (
              <article className="management-card" key={item.title}>
                <div className="management-icon">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>

                <h3>{item.title}</h3>

                <p>{item.text}</p>

                <span className="management-arrow material-symbols-outlined">
                  arrow_forward
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* =====================================================
            PLATFORM OVERVIEW
        ===================================================== */}

        <section className="stats-section">
          <div className="stats-grid">
            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">group</span>

              <strong>{memberCount}</strong>

              <span>Registered members</span>
            </div>

            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">
                handyman
              </span>

              <strong>{makerCount}</strong>

              <span>Active ReMakers</span>
            </div>

            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">
                inventory_2
              </span>

              <strong>{liveCount}</strong>

              <span>Live listings</span>
            </div>

            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">
                payments
              </span>

              <strong>{compact(report.orders.kpi.revenue)}</strong>

              <span>Paid order value</span>
            </div>
          </div>
        </section>

        {/* =====================================================
            ADMIN RESPONSIBILITIES
        ===================================================== */}

        <section className="responsibility-section">
          <div className="responsibility-inner">
            <div className="section-heading">
              <span className="section-label">ADMIN RESPONSIBILITIES</span>

              <h2>What the admin team does every day.</h2>

              <p>
                Four jobs cover almost everything: check what comes in, keep
                stock moving, look after the money, and decide who can do what.
              </p>
            </div>

            <div className="responsibility-grid">
              {responsibilities.map((item) => (
                <article className="responsibility-card" key={item.number}>
                  <div className="responsibility-top">
                    <span className="responsibility-number">{item.number}</span>

                    <span className="material-symbols-outlined responsibility-icon">
                      {item.icon}
                    </span>
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="admin-cta-section">
          <div className="admin-cta">
            <div>
              <span className="section-label">REORBIT ADMINISTRATION</span>

              <h2>Sign in and pick up where the day left off.</h2>

              <p>
                Your dashboard shows what needs attention first: donations
                waiting for a decision, pickups running late, stock that has not
                sold and orders to ship.
              </p>
            </div>

            <a href="/admin-login" className="btn-primary">
              Enter Admin Panel
              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </section>
      </main>

      <AdminFooter />
    </div>
  );
}
