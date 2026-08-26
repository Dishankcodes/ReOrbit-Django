import React from "react";
import AdminNavbar from "../components/AdminNavbar";
import AdminFooter from "../components/AdminFooter";
import "../css/Home.css";

const managementItems = [
  {
    icon: "group",
    title: "Manage Users",
    text: "Review user accounts, listings, donations, activity and account status from one place.",
  },
  {
    icon: "handyman",
    title: "Manage ReMakers",
    text: "Review ReMaker profiles, verify creators, monitor their activity and manage their marketplace presence.",
  },
  {
    icon: "inventory_2",
    title: "Manage Products",
    text: "Review user listings and ReMaker creations while keeping marketplace information accurate and organized.",
  },
  {
    icon: "payments",
    title: "Transactions",
    text: "Monitor purchases, payments, order activity and transaction records across the platform.",
  },
  {
    icon: "volunteer_activism",
    title: "Donations",
    text: "Oversee donated items and manage their status throughout the ReOrbit donation process.",
  },
  {
    icon: "analytics",
    title: "Reports & Insights",
    text: "Review platform activity, users, products, transactions and other operational insights.",
  },
];

const responsibilities = [
  {
    number: "01",
    icon: "verified_user",
    title: "Verify & moderate",
    text: "Review users, ReMakers, listings and submitted products to help maintain a trusted ReOrbit ecosystem.",
  },
  {
    number: "02",
    icon: "inventory",
    title: "Manage listings",
    text: "Monitor items submitted by users and products created by ReMakers before and after they appear in the marketplace.",
  },
  {
    number: "03",
    icon: "receipt_long",
    title: "Track transactions",
    text: "Keep purchases, payments and order-related activity organized and visible to the administration team.",
  },
  {
    number: "04",
    icon: "monitoring",
    title: "Measure activity",
    text: "Use reports and platform insights to understand users, listings, ReMakers, transactions and overall activity.",
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
              Manage the <span className="font-bricolage">ReOrbit</span>{" "}
              ecosystem.
            </h1>

            <p className="hero-description">
              A central administration system for managing users, ReMakers,
              marketplace listings, products, donations, transactions and
              platform activity.
            </p>

            <div className="hero-actions">
              <a href="/admin-login" className="btn-primary">
                Admin Login
              </a>

              <a href="/admin-how-it-works" className="btn-secondary">
                How it works
              </a>
            </div>
          </div>

          <div className="hero-image-container">
            <div className="hero-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800"
                alt="ReOrbit administration workspace"
                className="hero-img"
              />

              <div className="overlay-badge top-right">
                <span className="material-symbols-outlined badge-icon">
                  inventory_2
                </span>

                <div>
                  <div className="badge-value">8,921</div>

                  <div className="badge-label">ITEMS LISTED</div>
                </div>
              </div>

              <div className="overlay-badge bottom-left">
                <span className="material-symbols-outlined badge-icon">
                  handyman
                </span>

                <div>
                  <div className="badge-value">48</div>

                  <div className="badge-label">ACTIVE REMAKERS</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            PLATFORM FLOW
        ================================================= */}

        <section className="process-section">
          <h3 className="process-title">
            One platform. Multiple sides of the ecosystem.
          </h3>

          <div className="process-steps">
            <span className="step-pill">
              <span className="material-symbols-outlined">group</span>
              Users
            </span>

            <span className="arrow material-symbols-outlined">
              arrow_forward
            </span>

            <span className="step-pill">
              <span className="material-symbols-outlined">inventory_2</span>
              Listings
            </span>

            <span className="arrow material-symbols-outlined">
              arrow_forward
            </span>

            <span className="step-pill">
              <span className="material-symbols-outlined">handyman</span>
              ReMakers
            </span>

            <span className="arrow material-symbols-outlined">
              arrow_forward
            </span>

            <span className="step-pill">
              <span className="material-symbols-outlined">shopping_bag</span>
              Marketplace
            </span>

            <span className="arrow material-symbols-outlined">
              arrow_forward
            </span>

            <span className="step-pill">
              <span className="material-symbols-outlined">payments</span>
              Transactions
            </span>
          </div>
        </section>

        {/* =================================================
            ADMIN CONTROL CENTER
        ================================================= */}

        <section className="overview-section">
          <div className="section-heading">
            <span className="section-label">ADMIN CONTROL CENTER</span>

            <h2>Everything the administration team needs to manage.</h2>

            <p>
              ReOrbit brings the major parts of the platform together so
              administrators can monitor activity, review records and keep the
              marketplace organized.
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

        {/* =================================================
            PLATFORM OVERVIEW
        ================================================= */}

        <section className="stats-section">
          <div className="stats-grid">
            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">group</span>

              <strong>1,284</strong>

              <span>Registered users</span>
            </div>

            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">
                handyman
              </span>

              <strong>48</strong>

              <span>Verified ReMakers</span>
            </div>

            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">
                inventory_2
              </span>

              <strong>8.9K</strong>

              <span>Marketplace items</span>
            </div>

            <div className="admin-stat">
              <span className="material-symbols-outlined stat-icon">
                payments
              </span>

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

              <h2>From verification to platform insights.</h2>

              <p>
                Administrators help keep every important part of ReOrbit
                organized, visible and operating as intended.
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

        {/* =================================================
            ADMIN CTA
        ================================================= */}

        <section className="admin-cta-section">
          <div className="admin-cta">
            <div>
              <span className="section-label">REORBIT ADMINISTRATION</span>

              <h2>One place to manage the entire ecosystem.</h2>

              <p>
                Review users, support ReMakers, manage marketplace activity,
                monitor transactions and understand how ReOrbit is growing.
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
