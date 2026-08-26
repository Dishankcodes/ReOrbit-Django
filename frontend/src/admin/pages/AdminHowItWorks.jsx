import React from "react";
import AdminNavbar from "../components/AdminNavbar";
import AdminFooter from "../components/AdminFooter";

export default function HowItWorks() {
  const managementAreas = [
    {
      number: "01",
      icon: "group",
      title: "Manage Users",
      description:
        "Keep registered users organized and maintain a trusted marketplace.",
      points: [
        "View registered users",
        "Review account activity",
        "Manage user access",
        "Handle reported accounts",
      ],
    },
    {
      number: "02",
      icon: "construction",
      title: "Manage ReMakers",
      description:
        "Review creators who transform recovered materials into new products.",
      points: [
        "Review ReMaker profiles",
        "Verify applications",
        "Monitor creator activity",
        "Manage ReMaker status",
      ],
    },
    {
      number: "03",
      icon: "inventory_2",
      title: "Manage Products",
      description:
        "Oversee products and listings moving through the ReOrbit marketplace.",
      points: [
        "Review product listings",
        "Approve or reject products",
        "Manage categories",
        "Maintain listing quality",
      ],
    },
    {
      number: "04",
      icon: "receipt_long",
      title: "Transactions",
      description:
        "Monitor marketplace purchases, sales and transaction activity.",
      points: [
        "View transaction history",
        "Track pending transactions",
        "Monitor completed orders",
        "Review cancelled transactions",
      ],
    },
    {
      number: "05",
      icon: "bar_chart",
      title: "Reports & Insights",
      description:
        "Turn platform activity into useful information for better decisions.",
      points: [
        "User activity reports",
        "ReMaker performance",
        "Product statistics",
        "Transaction reports",
      ],
    },
    {
      number: "06",
      icon: "monitoring",
      title: "Monitor Platform",
      description: "Maintain visibility across the complete ReOrbit ecosystem.",
      points: [
        "Monitor platform activity",
        "Identify unusual activity",
        "Review reported issues",
        "Maintain platform quality",
      ],
    },
  ];

  const workflow = [
    {
      number: "01",
      icon: "visibility",
      title: "Review",
      text: "New users, ReMakers, products and important marketplace activity enter the admin system.",
    },
    {
      number: "02",
      icon: "verified",
      title: "Verify",
      text: "Profiles, listings and important activity are checked against platform requirements.",
    },
    {
      number: "03",
      icon: "tune",
      title: "Manage",
      text: "Admins approve, update, restrict or remove platform records whenever necessary.",
    },
    {
      number: "04",
      icon: "monitoring",
      title: "Monitor",
      text: "Transactions, listings, accounts and platform activity remain visible from one place.",
    },
    {
      number: "05",
      icon: "analytics",
      title: "Analyze",
      text: "Reports turn ReOrbit activity into information that supports better decisions.",
    },
  ];

  const lifecycle = [
    {
      icon: "person_add",
      label: "People",
      title: "Users & ReMakers",
      text: "Accounts enter the ecosystem and become part of the platform.",
    },
    {
      icon: "inventory_2",
      label: "Objects",
      title: "Items & Products",
      text: "Listings and products are created, reviewed and managed.",
    },
    {
      icon: "payments",
      label: "Marketplace",
      title: "Transactions",
      text: "Purchases and marketplace activity move through the system.",
    },
    {
      icon: "query_stats",
      label: "Intelligence",
      title: "Reports",
      text: "Activity becomes measurable information for administrators.",
    },
  ];

  return (
    <div className="admin-how-page">
      <AdminNavbar />

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="admin-how-hero">
          <div className="admin-how-glow admin-how-glow-one" />
          <div className="admin-how-glow admin-how-glow-two" />

          <div className="admin-how-grid-pattern" />

          <div className="admin-how-container admin-how-hero-grid">
            <div className="admin-how-hero-copy">
              <div className="admin-how-badge">
                <span className="material-symbols-outlined">
                  admin_panel_settings
                </span>
                ADMIN OPERATIONS
              </div>

              <h1>
                Everything behind
                <span> ReOrbit.</span>
              </h1>

              <p>
                The admin system brings users, ReMakers, products, transactions
                and platform activity together so every important part of
                ReOrbit can be reviewed, managed and monitored from one place.
              </p>

              <div className="admin-how-actions">
                <a href="/admin-login" className="admin-how-primary-btn">
                  Admin Login
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>

                <a href="#management" className="admin-how-secondary-btn">
                  Explore the system
                  <span className="material-symbols-outlined">south</span>
                </a>
              </div>
            </div>

            {/* HERO CONTROL VISUAL */}

            <div className="admin-control-visual">
              <div className="admin-control-header">
                <div>
                  <span className="admin-control-label">PLATFORM OVERVIEW</span>
                  <h3>ReOrbit Control</h3>
                </div>

                <div className="admin-live-status">
                  <span />
                  SYSTEM ACTIVE
                </div>
              </div>

              <div className="admin-control-center">
                <div className="admin-control-orbit orbit-a" />
                <div className="admin-control-orbit orbit-b" />

                <div className="admin-control-core">
                  <span className="material-symbols-outlined">hub</span>
                  <strong>ReOrbit</strong>
                  <small>ADMIN</small>
                </div>

                <div className="control-node node-users">
                  <span className="material-symbols-outlined">group</span>
                  <small>Users</small>
                </div>

                <div className="control-node node-remakers">
                  <span className="material-symbols-outlined">
                    construction
                  </span>
                  <small>ReMakers</small>
                </div>

                <div className="control-node node-products">
                  <span className="material-symbols-outlined">inventory_2</span>
                  <small>Products</small>
                </div>

                <div className="control-node node-transactions">
                  <span className="material-symbols-outlined">payments</span>
                  <small>Transactions</small>
                </div>
              </div>

              <div className="admin-control-footer">
                <div>
                  <span className="material-symbols-outlined">visibility</span>
                  <p>
                    <strong>Monitor</strong>
                    <small>Platform activity</small>
                  </p>
                </div>

                <div>
                  <span className="material-symbols-outlined">verified</span>
                  <p>
                    <strong>Verify</strong>
                    <small>Important records</small>
                  </p>
                </div>

                <div>
                  <span className="material-symbols-outlined">analytics</span>
                  <p>
                    <strong>Analyze</strong>
                    <small>Platform data</small>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SYSTEM STRIP
        ===================================================== */}

        <section className="admin-system-strip">
          <div className="admin-how-container admin-system-strip-inner">
            <span>ONE MANAGEMENT SYSTEM</span>

            <div className="admin-system-flow">
              <span>Users</span>
              <i className="material-symbols-outlined">arrow_forward</i>

              <span>Products</span>
              <i className="material-symbols-outlined">arrow_forward</i>

              <span>Transactions</span>
              <i className="material-symbols-outlined">arrow_forward</i>

              <span>Reports</span>
            </div>
          </div>
        </section>

        {/* =====================================================
            MANAGEMENT
        ===================================================== */}

        <section className="admin-management" id="management">
          <div className="admin-how-container">
            <div className="admin-section-heading">
              <div>
                <span className="admin-eyebrow">PLATFORM CONTROL</span>

                <h2>
                  Six areas.
                  <br />
                  <span>One control center.</span>
                </h2>
              </div>

              <p>
                Instead of managing different parts of ReOrbit separately, the
                admin system brings the platform's main operations into one
                structured environment.
              </p>
            </div>

            <div className="admin-management-grid">
              {managementAreas.map((item) => (
                <article className="admin-management-card" key={item.number}>
                  <div className="admin-card-top">
                    <span className="admin-card-number">{item.number}</span>

                    <div className="admin-card-icon">
                      <span className="material-symbols-outlined">
                        {item.icon}
                      </span>
                    </div>
                  </div>

                  <h3>{item.title}</h3>

                  <p className="admin-card-description">{item.description}</p>

                  <div className="admin-card-divider" />

                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>
                        <span className="material-symbols-outlined">
                          check_circle
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            WORKFLOW
        ===================================================== */}

        <section className="admin-workflow">
          <div className="admin-how-container">
            <div className="admin-workflow-heading">
              <span className="admin-eyebrow">ADMIN WORKFLOW</span>

              <h2>
                From activity
                <br />
                <span>to action.</span>
              </h2>

              <p>
                Administration is not just about viewing information. Activity
                moves through a clear management process from the moment it
                enters the system.
              </p>
            </div>

            <div className="admin-workflow-line">
              {workflow.map((step, index) => (
                <React.Fragment key={step.number}>
                  <article className="admin-workflow-step">
                    <div className="admin-workflow-step-top">
                      <span>{step.number}</span>

                      <div className="admin-workflow-icon">
                        <span className="material-symbols-outlined">
                          {step.icon}
                        </span>
                      </div>
                    </div>

                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </article>

                  {index < workflow.length - 1 && (
                    <div className="admin-workflow-connector">
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            LIFECYCLE
        ===================================================== */}

        <section className="admin-lifecycle">
          <div className="admin-how-container">
            <div className="admin-lifecycle-layout">
              <div className="admin-lifecycle-copy">
                <span className="admin-eyebrow">COMPLETE VISIBILITY</span>

                <h2>
                  See how the
                  <span> system connects.</span>
                </h2>

                <p>
                  ReOrbit involves different people, products and marketplace
                  activity. The admin layer connects those parts so operations
                  stay visible instead of becoming isolated processes.
                </p>

                <div className="admin-lifecycle-note">
                  <span className="material-symbols-outlined">
                    account_tree
                  </span>

                  <div>
                    <strong>Connected administration</strong>
                    <p>
                      Changes in one part of the platform can be understood in
                      the context of the complete ReOrbit ecosystem.
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-lifecycle-list">
                {lifecycle.map((item, index) => (
                  <article className="admin-lifecycle-item" key={item.title}>
                    <span className="admin-lifecycle-index">0{index + 1}</span>

                    <div className="admin-lifecycle-icon">
                      <span className="material-symbols-outlined">
                        {item.icon}
                      </span>
                    </div>

                    <div>
                      <small>{item.label}</small>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>

                    <span className="material-symbols-outlined admin-lifecycle-arrow">
                      arrow_outward
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            INSIGHT
        ===================================================== */}

        <section className="admin-insight">
          <div className="admin-how-container">
            <div className="admin-insight-box">
              <div className="admin-insight-copy">
                <span className="admin-eyebrow">REPORTING & INSIGHT</span>

                <h2>
                  Management needs
                  <span> visibility.</span>
                </h2>

                <p>
                  Reports help administrators understand what is happening
                  across ReOrbit. User activity, ReMaker performance, product
                  statistics and transaction information can be reviewed to
                  support platform decisions.
                </p>

                <a href="/admin-login" className="admin-how-primary-btn">
                  Enter Admin Panel
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </div>

              <div className="admin-report-panel">
                <div className="admin-report-top">
                  <div>
                    <small>PLATFORM INSIGHT</small>
                    <strong>Activity overview</strong>
                  </div>

                  <span className="material-symbols-outlined">monitoring</span>
                </div>

                <div className="admin-report-bars">
                  <div className="report-row">
                    <div>
                      <span>Users</span>
                      <b>Account activity</b>
                    </div>

                    <div className="report-track">
                      <span style={{ width: "82%" }} />
                    </div>

                    <strong>82%</strong>
                  </div>

                  <div className="report-row">
                    <div>
                      <span>ReMakers</span>
                      <b>Creator activity</b>
                    </div>

                    <div className="report-track">
                      <span style={{ width: "64%" }} />
                    </div>

                    <strong>64%</strong>
                  </div>

                  <div className="report-row">
                    <div>
                      <span>Products</span>
                      <b>Marketplace listings</b>
                    </div>

                    <div className="report-track">
                      <span style={{ width: "76%" }} />
                    </div>

                    <strong>76%</strong>
                  </div>

                  <div className="report-row">
                    <div>
                      <span>Transactions</span>
                      <b>Marketplace activity</b>
                    </div>

                    <div className="report-track">
                      <span style={{ width: "70%" }} />
                    </div>

                    <strong>70%</strong>
                  </div>
                </div>

                <div className="admin-report-bottom">
                  <span>
                    <i />
                    Platform monitoring active
                  </span>

                  <span className="material-symbols-outlined">analytics</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="admin-final">
          <div className="admin-how-container">
            <div className="admin-final-box">
              <div className="admin-final-icon">
                <span className="material-symbols-outlined">
                  admin_panel_settings
                </span>
              </div>

              <div className="admin-final-copy">
                <span>REORBIT ADMINISTRATION</span>

                <h2>
                  Keep every part of
                  <br />
                  ReOrbit moving.
                </h2>

                <p>
                  Review. Verify. Manage. Monitor. Analyze. One administrative
                  layer for the complete ReOrbit ecosystem.
                </p>
              </div>

              <a href="/admin-login" className="admin-final-btn">
                Admin Login
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <AdminFooter />

      <style>{`
        /* =====================================================
           ROOT
        ===================================================== */

        .admin-how-page {
          --ah-bg: #061b16;
          --ah-bg-deep: #04130f;
          --ah-surface: #0a241d;
          --ah-surface-2: #0e3027;
          --ah-surface-3: #12392f;

          --ah-accent: #afcfc2;
          --ah-accent-2: #7fa99a;

          --ah-text: #f3f5f2;
          --ah-soft: #c6d0cb;
          --ah-muted: #8b9a94;

          --ah-border: rgba(175, 207, 194, 0.15);
          --ah-border-strong: rgba(175, 207, 194, 0.28);

          width: 100%;
          min-height: 100vh;

          background: var(--ah-bg);
          color: var(--ah-text);

          overflow-x: hidden;
        }

        .admin-how-page *,
        .admin-how-page *::before,
        .admin-how-page *::after {
          box-sizing: border-box;
        }

        .admin-how-page a {
          text-decoration: none;
        }

        .admin-how-container {
          width: min(1280px, calc(100% - 80px));
          margin: 0 auto;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .admin-how-hero {
          position: relative;

          min-height: calc(100vh - 76px);

          display: flex;
          align-items: center;

          padding: 100px 0 90px;

          background:
            linear-gradient(
              115deg,
              #061b16 0%,
              #071f19 50%,
              #09271f 100%
            );

          overflow: hidden;
        }

        .admin-how-grid-pattern {
          position: absolute;
          inset: 0;

          opacity: 0.045;

          background-image:
            linear-gradient(
              rgba(255,255,255,0.5) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.5) 1px,
              transparent 1px
            );

          background-size: 55px 55px;

          pointer-events: none;
        }

        .admin-how-glow {
          position: absolute;

          border-radius: 50%;

          filter: blur(2px);

          pointer-events: none;
        }

        .admin-how-glow-one {
          width: 520px;
          height: 520px;

          right: -150px;
          top: -180px;

          background: radial-gradient(
            circle,
            rgba(127, 169, 154, 0.13),
            transparent 68%
          );
        }

        .admin-how-glow-two {
          width: 500px;
          height: 500px;

          left: 30%;
          bottom: -400px;

          background: radial-gradient(
            circle,
            rgba(175, 207, 194, 0.08),
            transparent 70%
          );
        }

        .admin-how-hero-grid {
          position: relative;
          z-index: 2;

          display: grid;
          grid-template-columns: 1fr 0.88fr;

          gap: 90px;

          align-items: center;
        }

        .admin-how-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 9px 14px;

          border: 1px solid var(--ah-border-strong);
          border-radius: 999px;

          background: rgba(175, 207, 194, 0.07);

          color: var(--ah-accent);

          font-size: 0.67rem;
          font-weight: 800;

          letter-spacing: 0.13em;
        }

        .admin-how-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .admin-how-hero h1 {
          max-width: 720px;

          margin: 27px 0 23px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: clamp(3.7rem, 6.3vw, 6.2rem);

          line-height: 0.94;

          letter-spacing: -0.055em;
        }

        .admin-how-hero h1 span {
          color: var(--ah-accent);
        }

        .admin-how-hero-copy > p {
          max-width: 630px;

          color: var(--ah-muted);

          font-size: 0.93rem;
          line-height: 1.8;
        }

        .admin-how-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;

          margin-top: 31px;
        }

        .admin-how-primary-btn,
        .admin-how-secondary-btn,
        .admin-final-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          min-height: 46px;

          padding: 0 20px;

          border-radius: 999px;

          font-family: var(--font-sans);
          font-size: 0.77rem;
          font-weight: 750;

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-how-primary-btn {
          background: var(--ah-accent);
          border: 1px solid var(--ah-accent);

          color: var(--ah-bg-deep);
        }

        .admin-how-primary-btn:hover {
          transform: translateY(-2px);

          background: #c3ded3;
        }

        .admin-how-secondary-btn {
          border: 1px solid var(--ah-border-strong);

          color: var(--ah-soft);

          background: rgba(255,255,255,0.025);
        }

        .admin-how-secondary-btn:hover {
          transform: translateY(-2px);

          background: rgba(175,207,194,0.08);

          border-color: var(--ah-accent-2);
        }

        .admin-how-primary-btn .material-symbols-outlined,
        .admin-how-secondary-btn .material-symbols-outlined {
          font-size: 17px;
        }

        /* =====================================================
           HERO CONTROL VISUAL
        ===================================================== */

        .admin-control-visual {
          border: 1px solid var(--ah-border-strong);

          border-radius: 24px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.045),
              rgba(255,255,255,0.012)
            );

          box-shadow:
            0 35px 80px rgba(0,0,0,0.25);

          overflow: hidden;
        }

        .admin-control-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          padding: 20px 22px;

          border-bottom: 1px solid var(--ah-border);
        }

        .admin-control-label {
          display: block;

          margin-bottom: 4px;

          color: var(--ah-muted);

          font-size: 0.56rem;
          font-weight: 800;

          letter-spacing: 0.13em;
        }

        .admin-control-header h3 {
          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: 1.08rem;
        }

        .admin-live-status {
          display: flex;
          align-items: center;
          gap: 7px;

          color: var(--ah-accent);

          font-size: 0.55rem;
          font-weight: 800;

          letter-spacing: 0.08em;
        }

        .admin-live-status span {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: var(--ah-accent);

          box-shadow: 0 0 13px var(--ah-accent);
        }

        .admin-control-center {
          position: relative;

          min-height: 400px;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;
        }

        .admin-control-center::before {
          content: "";

          position: absolute;
          inset: 0;

          background-image:
            linear-gradient(
              rgba(175,207,194,0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(175,207,194,0.035) 1px,
              transparent 1px
            );

          background-size: 34px 34px;
        }

        .admin-control-orbit {
          position: absolute;

          border: 1px solid rgba(175,207,194,0.13);

          border-radius: 50%;
        }

        .orbit-a {
          width: 255px;
          height: 255px;
        }

        .orbit-b {
          width: 350px;
          height: 350px;

          border-style: dashed;

          opacity: 0.55;
        }

        .admin-control-core {
          position: relative;
          z-index: 3;

          width: 120px;
          height: 120px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--ah-accent);

          color: var(--ah-bg-deep);

          box-shadow:
            0 0 0 10px rgba(175,207,194,0.04),
            0 20px 50px rgba(0,0,0,0.25);
        }

        .admin-control-core .material-symbols-outlined {
          margin-bottom: 5px;

          font-size: 27px;
        }

        .admin-control-core strong {
          font-family: var(--font-display);

          font-size: 0.95rem;
        }

        .admin-control-core small {
          margin-top: 2px;

          font-size: 0.48rem;
          font-weight: 900;

          letter-spacing: 0.16em;

          opacity: 0.7;
        }

        .control-node {
          position: absolute;
          z-index: 4;

          width: 72px;
          height: 72px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 4px;

          border: 1px solid var(--ah-border-strong);
          border-radius: 17px;

          background: #0c2b23;

          color: var(--ah-accent);

          box-shadow: 0 15px 35px rgba(0,0,0,0.22);
        }

        .control-node .material-symbols-outlined {
          font-size: 20px;
        }

        .control-node small {
          color: var(--ah-soft);

          font-size: 0.52rem;
          font-weight: 700;
        }

        .node-users {
          top: 53px;
          left: 75px;
        }

        .node-remakers {
          top: 53px;
          right: 75px;
        }

        .node-products {
          bottom: 48px;
          left: 75px;
        }

        .node-transactions {
          bottom: 48px;
          right: 75px;
        }

        .admin-control-footer {
          display: grid;
          grid-template-columns: repeat(3, 1fr);

          border-top: 1px solid var(--ah-border);
        }

        .admin-control-footer > div {
          display: flex;
          align-items: center;

          gap: 10px;

          padding: 16px;

          border-right: 1px solid var(--ah-border);
        }

        .admin-control-footer > div:last-child {
          border-right: 0;
        }

        .admin-control-footer .material-symbols-outlined {
          color: var(--ah-accent);

          font-size: 19px;
        }

        .admin-control-footer p {
          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .admin-control-footer strong {
          color: var(--ah-soft);

          font-size: 0.64rem;
        }

        .admin-control-footer small {
          color: var(--ah-muted);

          font-size: 0.52rem;
        }

        /* =====================================================
           SYSTEM STRIP
        ===================================================== */

        .admin-system-strip {
          border-top: 1px solid var(--ah-border);
          border-bottom: 1px solid var(--ah-border);

          background: var(--ah-bg-deep);
        }

        .admin-system-strip-inner {
          min-height: 74px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 35px;
        }

        .admin-system-strip-inner > span {
          color: var(--ah-accent);

          font-size: 0.59rem;
          font-weight: 850;

          letter-spacing: 0.14em;
        }

        .admin-system-flow {
          display: flex;
          align-items: center;

          gap: 18px;

          color: var(--ah-muted);

          font-size: 0.68rem;
          font-weight: 650;
        }

        .admin-system-flow i {
          color: var(--ah-accent-2);

          font-size: 15px;
          font-style: normal;
        }

        /* =====================================================
           COMMON HEADING
        ===================================================== */

        .admin-eyebrow {
          display: inline-flex;
          align-items: center;

          gap: 8px;

          color: var(--ah-accent);

          font-size: 0.64rem;
          font-weight: 850;

          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .admin-eyebrow::before {
          content: "";

          width: 22px;
          height: 1px;

          background: currentColor;
        }

        .admin-section-heading {
          display: grid;
          grid-template-columns: 1.05fr 0.75fr;

          align-items: end;

          gap: 80px;

          margin-bottom: 50px;
        }

        .admin-section-heading h2 {
          margin-top: 11px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: clamp(2.5rem, 4.3vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-section-heading h2 span {
          color: var(--ah-accent);
        }

        .admin-section-heading > p {
          color: var(--ah-muted);

          font-size: 0.82rem;
          line-height: 1.75;
        }

        /* =====================================================
           MANAGEMENT
        ===================================================== */

        .admin-management {
          padding: 115px 0;

          background: var(--ah-surface);
        }

        .admin-management-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);

          gap: 16px;
        }

        .admin-management-card {
          min-height: 350px;

          padding: 27px;

          border: 1px solid var(--ah-border);

          border-radius: 19px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.032),
              rgba(255,255,255,0.008)
            ),
            var(--ah-bg);

          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease;
        }

        .admin-management-card:hover {
          transform: translateY(-5px);

          border-color: var(--ah-border-strong);

          background: var(--ah-surface-2);
        }

        .admin-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 27px;
        }

        .admin-card-number {
          color: var(--ah-muted);

          font-size: 0.61rem;
          font-weight: 850;

          letter-spacing: 0.13em;
        }

        .admin-card-icon {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--ah-border);

          border-radius: 13px;

          background: rgba(175,207,194,0.07);

          color: var(--ah-accent);
        }

        .admin-card-icon .material-symbols-outlined {
          font-size: 21px;
        }

        .admin-management-card h3 {
          margin-bottom: 10px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: 1.25rem;
        }

        .admin-card-description {
          min-height: 60px;

          color: var(--ah-muted);

          font-size: 0.74rem;
          line-height: 1.7;
        }

        .admin-card-divider {
          width: 100%;
          height: 1px;

          margin: 20px 0;

          background: var(--ah-border);
        }

        .admin-management-card ul {
          display: flex;
          flex-direction: column;

          gap: 9px;

          margin: 0;
          padding: 0;

          list-style: none;
        }

        .admin-management-card li {
          display: flex;
          align-items: center;

          gap: 8px;

          color: var(--ah-soft);

          font-size: 0.68rem;
        }

        .admin-management-card li .material-symbols-outlined {
          color: var(--ah-accent-2);

          font-size: 15px;
        }

        /* =====================================================
           WORKFLOW
        ===================================================== */

        .admin-workflow {
          padding: 115px 0;

          background: var(--ah-bg-deep);
        }

        .admin-workflow-heading {
          max-width: 680px;

          margin-bottom: 52px;
        }

        .admin-workflow-heading h2 {
          margin: 11px 0 15px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: clamp(2.6rem, 4.5vw, 4.1rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-workflow-heading h2 span {
          color: var(--ah-accent);
        }

        .admin-workflow-heading p {
          max-width: 590px;

          color: var(--ah-muted);

          font-size: 0.82rem;
          line-height: 1.75;
        }

        .admin-workflow-line {
          display: grid;

          grid-template-columns:
            1fr auto
            1fr auto
            1fr auto
            1fr auto
            1fr;

          align-items: stretch;

          gap: 8px;
        }

        .admin-workflow-step {
          min-height: 265px;

          padding: 22px;

          border: 1px solid var(--ah-border);

          border-radius: 17px;

          background: var(--ah-surface);

          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-workflow-step:hover {
          transform: translateY(-4px);

          border-color: var(--ah-border-strong);
        }

        .admin-workflow-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 48px;
        }

        .admin-workflow-step-top > span {
          color: var(--ah-muted);

          font-size: 0.59rem;
          font-weight: 850;

          letter-spacing: 0.1em;
        }

        .admin-workflow-icon {
          width: 39px;
          height: 39px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background: rgba(175,207,194,0.08);

          color: var(--ah-accent);
        }

        .admin-workflow-icon .material-symbols-outlined {
          font-size: 19px;
        }

        .admin-workflow-step h3 {
          margin-bottom: 9px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: 1.05rem;
        }

        .admin-workflow-step p {
          color: var(--ah-muted);

          font-size: 0.67rem;
          line-height: 1.65;
        }

        .admin-workflow-connector {
          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--ah-accent-2);
        }

        .admin-workflow-connector .material-symbols-outlined {
          font-size: 17px;
        }

        /* =====================================================
           LIFECYCLE
        ===================================================== */

        .admin-lifecycle {
          padding: 115px 0;

          background: var(--ah-surface-2);
        }

        .admin-lifecycle-layout {
          display: grid;
          grid-template-columns: 0.8fr 1fr;

          gap: 100px;

          align-items: center;
        }

        .admin-lifecycle-copy h2 {
          margin: 12px 0 18px;

          max-width: 500px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: clamp(2.5rem, 4.2vw, 3.9rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-lifecycle-copy h2 span {
          color: var(--ah-accent);
        }

        .admin-lifecycle-copy > p {
          max-width: 520px;

          color: var(--ah-muted);

          font-size: 0.8rem;
          line-height: 1.75;
        }

        .admin-lifecycle-note {
          display: flex;

          gap: 13px;

          margin-top: 28px;

          padding: 18px;

          border: 1px solid var(--ah-border);

          border-radius: 15px;

          background: rgba(0,0,0,0.1);
        }

        .admin-lifecycle-note > .material-symbols-outlined {
          color: var(--ah-accent);

          font-size: 22px;
        }

        .admin-lifecycle-note strong {
          display: block;

          margin-bottom: 5px;

          color: var(--ah-soft);

          font-size: 0.74rem;
        }

        .admin-lifecycle-note p {
          color: var(--ah-muted);

          font-size: 0.65rem;
          line-height: 1.6;
        }

        .admin-lifecycle-list {
          border-top: 1px solid var(--ah-border);
        }

        .admin-lifecycle-item {
          position: relative;

          display: grid;
          grid-template-columns: 40px 50px 1fr 30px;

          gap: 16px;

          align-items: center;

          min-height: 115px;

          padding: 18px 5px;

          border-bottom: 1px solid var(--ah-border);

          transition: padding 0.2s ease;
        }

        .admin-lifecycle-item:hover {
          padding-left: 12px;
        }

        .admin-lifecycle-index {
          color: var(--ah-muted);

          font-size: 0.58rem;
          font-weight: 800;
        }

        .admin-lifecycle-icon {
          width: 44px;
          height: 44px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background: rgba(175,207,194,0.08);

          color: var(--ah-accent);
        }

        .admin-lifecycle-icon .material-symbols-outlined {
          font-size: 20px;
        }

        .admin-lifecycle-item small {
          display: block;

          margin-bottom: 3px;

          color: var(--ah-accent-2);

          font-size: 0.55rem;
          font-weight: 800;

          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-lifecycle-item h3 {
          margin-bottom: 4px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: 1rem;
        }

        .admin-lifecycle-item p {
          color: var(--ah-muted);

          font-size: 0.64rem;
        }

        .admin-lifecycle-arrow {
          color: var(--ah-muted);

          font-size: 18px;
        }

        /* =====================================================
           INSIGHT
        ===================================================== */

        .admin-insight {
          padding: 115px 0;

          background: var(--ah-bg);
        }

        .admin-insight-box {
          display: grid;
          grid-template-columns: 0.9fr 1fr;

          gap: 90px;

          align-items: center;
        }

        .admin-insight-copy h2 {
          max-width: 520px;

          margin: 12px 0 16px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: clamp(2.5rem, 4.2vw, 3.9rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-insight-copy h2 span {
          color: var(--ah-accent);
        }

        .admin-insight-copy > p {
          max-width: 520px;

          margin-bottom: 26px;

          color: var(--ah-muted);

          font-size: 0.8rem;
          line-height: 1.75;
        }

        .admin-report-panel {
          border: 1px solid var(--ah-border-strong);

          border-radius: 21px;

          background: var(--ah-surface);

          box-shadow: 0 30px 70px rgba(0,0,0,0.2);

          overflow: hidden;
        }

        .admin-report-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 21px 23px;

          border-bottom: 1px solid var(--ah-border);
        }

        .admin-report-top div {
          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .admin-report-top small {
          color: var(--ah-muted);

          font-size: 0.54rem;
          font-weight: 800;

          letter-spacing: 0.1em;
        }

        .admin-report-top strong {
          color: var(--ah-soft);

          font-size: 0.82rem;
        }

        .admin-report-top > .material-symbols-outlined {
          color: var(--ah-accent);

          font-size: 25px;
        }

        .admin-report-bars {
          display: flex;
          flex-direction: column;

          gap: 23px;

          padding: 27px 23px;
        }

        .report-row {
          display: grid;
          grid-template-columns: 120px 1fr 35px;

          align-items: center;

          gap: 15px;
        }

        .report-row > div:first-child {
          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .report-row span {
          color: var(--ah-soft);

          font-size: 0.67rem;
          font-weight: 700;
        }

        .report-row b {
          color: var(--ah-muted);

          font-size: 0.52rem;
          font-weight: 500;
        }

        .report-track {
          height: 5px;

          border-radius: 999px;

          background: rgba(175,207,194,0.08);

          overflow: hidden;
        }

        .report-track span {
          display: block;

          height: 100%;

          border-radius: inherit;

          background: var(--ah-accent-2);
        }

        .report-row > strong {
          color: var(--ah-accent);

          font-size: 0.62rem;
          text-align: right;
        }

        .admin-report-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 17px 23px;

          border-top: 1px solid var(--ah-border);

          color: var(--ah-muted);
        }

        .admin-report-bottom > span:first-child {
          display: flex;
          align-items: center;

          gap: 7px;

          font-size: 0.57rem;
        }

        .admin-report-bottom i {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: var(--ah-accent);
        }

        .admin-report-bottom .material-symbols-outlined {
          color: var(--ah-accent);

          font-size: 18px;
        }

        /* =====================================================
           FINAL
        ===================================================== */

        .admin-final {
          padding: 80px 0 100px;

          background: var(--ah-bg);
        }

        .admin-final-box {
          display: grid;
          grid-template-columns: auto 1fr auto;

          align-items: center;

          gap: 30px;

          padding: 40px;

          border: 1px solid var(--ah-border-strong);

          border-radius: 22px;

          background:
            linear-gradient(
              110deg,
              var(--ah-surface-3),
              var(--ah-surface)
            );
        }

        .admin-final-icon {
          width: 60px;
          height: 60px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--ah-border-strong);

          border-radius: 17px;

          background: rgba(175,207,194,0.08);

          color: var(--ah-accent);
        }

        .admin-final-icon .material-symbols-outlined {
          font-size: 28px;
        }

        .admin-final-copy > span {
          color: var(--ah-accent);

          font-size: 0.55rem;
          font-weight: 850;

          letter-spacing: 0.13em;
        }

        .admin-final-copy h2 {
          margin: 6px 0 8px;

          color: var(--ah-text);

          font-family: var(--font-display);

          font-size: clamp(1.8rem, 3vw, 2.8rem);

          line-height: 1;

          letter-spacing: -0.04em;
        }

        .admin-final-copy p {
          color: var(--ah-muted);

          font-size: 0.7rem;
        }

        .admin-final-btn {
          background: var(--ah-accent);

          color: var(--ah-bg-deep);

          border: 1px solid var(--ah-accent);
        }

        .admin-final-btn:hover {
          transform: translateY(-2px);

          background: #c3ded3;
        }

        .admin-final-btn .material-symbols-outlined {
          font-size: 17px;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1080px) {
          .admin-how-container {
            width: min(100%, calc(100% - 50px));
          }

          .admin-how-hero-grid {
            gap: 45px;
          }

          .admin-management-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .admin-workflow-line {
            grid-template-columns: repeat(2, 1fr);

            gap: 14px;
          }

          .admin-workflow-connector {
            display: none;
          }

          .admin-workflow-step:last-child {
            grid-column: 1 / -1;
          }

          .admin-lifecycle-layout,
          .admin-insight-box {
            gap: 55px;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 800px) {
          .admin-how-container {
            width: calc(100% - 32px);
          }

          .admin-how-hero {
            min-height: auto;

            padding: 90px 0 75px;
          }

          .admin-how-hero-grid {
            grid-template-columns: 1fr;

            gap: 55px;
          }

          .admin-how-hero h1 {
            font-size: clamp(3rem, 13vw, 4.7rem);
          }

          .admin-control-center {
            min-height: 370px;
          }

          .admin-system-strip-inner {
            flex-direction: column;
            align-items: flex-start;

            padding: 20px 0;
          }

          .admin-system-flow {
            flex-wrap: wrap;
          }

          .admin-section-heading {
            grid-template-columns: 1fr;

            gap: 20px;

            margin-bottom: 38px;
          }

          .admin-management,
          .admin-workflow,
          .admin-lifecycle,
          .admin-insight {
            padding: 80px 0;
          }

          .admin-management-grid {
            grid-template-columns: 1fr;
          }

          .admin-management-card {
            min-height: auto;
          }

          .admin-workflow-line {
            grid-template-columns: 1fr;
          }

          .admin-workflow-step:last-child {
            grid-column: auto;
          }

          .admin-lifecycle-layout,
          .admin-insight-box {
            grid-template-columns: 1fr;

            gap: 50px;
          }

          .admin-final-box {
            grid-template-columns: 1fr;

            align-items: flex-start;

            padding: 30px;
          }

          .admin-final-btn {
            width: 100%;
          }
        }

        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 500px) {
          .admin-how-container {
            width: calc(100% - 24px);
          }

          .admin-how-hero h1 {
            font-size: 2.8rem;
          }

          .admin-how-actions {
            flex-direction: column;
          }

          .admin-how-primary-btn,
          .admin-how-secondary-btn {
            width: 100%;
          }

          .admin-control-center {
            min-height: 330px;
          }

          .orbit-a {
            width: 210px;
            height: 210px;
          }

          .orbit-b {
            width: 285px;
            height: 285px;
          }

          .admin-control-core {
            width: 100px;
            height: 100px;
          }

          .control-node {
            width: 61px;
            height: 61px;
          }

          .node-users,
          .node-products {
            left: 25px;
          }

          .node-remakers,
          .node-transactions {
            right: 25px;
          }

          .admin-control-footer {
            grid-template-columns: 1fr;
          }

          .admin-control-footer > div {
            border-right: 0;
            border-bottom: 1px solid var(--ah-border);
          }

          .admin-control-footer > div:last-child {
            border-bottom: 0;
          }

          .admin-section-heading h2,
          .admin-workflow-heading h2,
          .admin-lifecycle-copy h2,
          .admin-insight-copy h2 {
            font-size: 2.35rem;
          }

          .admin-management-card {
            padding: 23px;
          }

          .admin-lifecycle-item {
            grid-template-columns: 32px 45px 1fr;
          }

          .admin-lifecycle-arrow {
            display: none;
          }

          .report-row {
            grid-template-columns: 95px 1fr 30px;

            gap: 10px;
          }

          .admin-final {
            padding: 60px 0 75px;
          }

          .admin-final-box {
            padding: 25px 21px;
          }
        }

        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        .admin-how-page a:focus-visible {
          outline: 2px solid var(--ah-accent);
          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-how-page *,
          .admin-how-page *::before,
          .admin-how-page *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
