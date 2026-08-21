import React from "react";
import AdminNavbar from "../components/AdminNavbar";
import AdminFooter from "../components/AdminFooter";
import "../css/Home.css";

const managementItems = [
  {
    icon: "👥",
    title: "Manage Users",
    text: "Review user activity, listings, donations, exchanges and account status from one place.",
  },
  {
    icon: "🛠",
    title: "Manage ReMakers",
    text: "Verify ReMakers, monitor their work, manage profiles and oversee their activity.",
  },
  {
    icon: "📦",
    title: "Manage Products",
    text: "Track submitted items, refurbished products, marketplace listings and inventory.",
  },
  {
    icon: "💳",
    title: "Transactions",
    text: "Monitor purchases, exchanges, donations, payments and other platform transactions.",
  },
  {
    icon: "🏭",
    title: "Warehouse",
    text: "Keep track of rescued items, storage, refurbishment status and items ready for circulation.",
  },
  {
    icon: "📊",
    title: "Reports & Insights",
    text: "Review platform performance, environmental impact, transactions and user activity.",
  },
];

const responsibilities = [
  {
    number: "01",
    title: "Verify & moderate",
    text: "Review users, ReMakers, listings and submitted products to keep the ReOrbit ecosystem trusted.",
  },
  {
    number: "02",
    title: "Track every item",
    text: "Follow an item's journey from submission and pickup through refurbishment, listing and its next owner.",
  },
  {
    number: "03",
    title: "Coordinate operations",
    text: "Manage warehouse inventory, pickups, refurbishment workflows and movement of materials.",
  },
  {
    number: "04",
    title: "Measure impact",
    text: "Use reports and analytics to understand platform activity, transactions and circular impact.",
  },
];

export default function AdminHome() {
  return (
    <div className="admin-home-container">
      <AdminNavbar />

      <main>
        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero-section">
          <div className="hero-text-container">
            <span className="hero-badge">REORBIT MANAGEMENT</span>

            <h1 className="hero-title">
              Keeping the <span className="font-bricolage">ReOrbit</span>{" "}
              moving.
            </h1>

            <p className="hero-description">
              The central management system for coordinating users, ReMakers,
              products, transactions and the journey of every rescued object.
            </p>

            <div className="hero-actions">
              <a href="/admin-login" className="btn-primary">
                Admin Login
              </a>

              <a href="/admin/how-it-works" className="btn-secondary">
                How it works
              </a>
            </div>
          </div>

          <div className="hero-image-container">
            <div className="hero-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800"
                alt="ReOrbit management workspace"
                className="hero-img"
              />

              <div className="overlay-badge top-right">
                <span className="badge-icon">♻</span>

                <div>
                  <div className="badge-value">8,921</div>

                  <div className="badge-label">ITEMS REUSED</div>
                </div>
              </div>

              <div className="overlay-badge bottom-left">
                <span className="badge-icon">👥</span>

                <div>
                  <div className="badge-value">48</div>

                  <div className="badge-label">ACTIVE REMAKERS</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            PROCESS
        ================================================= */}

        <section className="process-section">
          <h3 className="process-title">
            One platform. Every stage of the journey.
          </h3>

          <div className="process-steps">
            <span className="step-pill">Users</span>

            <span className="arrow">➔</span>

            <span className="step-pill">Items</span>

            <span className="arrow">➔</span>

            <span className="step-pill">ReMakers</span>

            <span className="arrow">➔</span>

            <span className="step-pill">Refurbishment</span>

            <span className="arrow">➔</span>

            <span className="step-pill">Warehouse</span>

            <span className="arrow">➔</span>

            <span className="step-pill">New Owners</span>
          </div>
        </section>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        <section className="overview-section">
          <div className="section-heading">
            <span className="section-label">ADMIN CONTROL CENTER</span>

            <h2>Everything that keeps ReOrbit running.</h2>

            <p>
              Admins coordinate the people, products and processes that keep
              items moving through their second orbit.
            </p>
          </div>

          <div className="management-grid">
            {managementItems.map((item) => (
              <article className="management-card" key={item.title}>
                <div className="management-icon">{item.icon}</div>

                <h3>{item.title}</h3>

                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="stats-section">
          <div className="stats-grid">
            <div className="admin-stat">
              <strong>1,284</strong>
              <span>Registered users</span>
            </div>

            <div className="admin-stat">
              <strong>48</strong>
              <span>Verified ReMakers</span>
            </div>

            <div className="admin-stat">
              <strong>8.9K</strong>
              <span>Items in circulation</span>
            </div>

            <div className="admin-stat">
              <strong>₹18L+</strong>
              <span>Platform transactions</span>
            </div>
          </div>
        </section>

        {/* =================================================
            RESPONSIBILITIES
        ================================================= */}

        <section className="responsibility-section">
          <div className="responsibility-inner">
            <div className="section-heading">
              <span className="section-label">ADMIN RESPONSIBILITIES</span>

              <h2>From verification to impact.</h2>

              <p>
                The admin team oversees the complete lifecycle of activity
                across ReOrbit.
              </p>
            </div>

            <div className="responsibility-grid">
              {responsibilities.map((item) => (
                <article className="responsibility-card" key={item.number}>
                  <span className="responsibility-number">{item.number}</span>

                  <h3>{item.title}</h3>

                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================
            CTA
        ================================================= */}

        <section className="admin-cta-section">
          <div className="admin-cta">
            <div>
              <h2>One dashboard. One circular system.</h2>

              <p>
                Manage the ReOrbit ecosystem, keep every operation visible and
                help more objects find their next purpose.
              </p>
            </div>

            <a href="/admin-login" className="btn-primary">
              Enter Admin Panel
            </a>
          </div>
        </section>
      </main>

      <AdminFooter />
    </div>
  );
}
