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
        "Keep track of registered users and maintain a safe, organized marketplace.",
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
        "Review and manage creators who transform rescued materials into meaningful products.",
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
        "Control products listed across ReOrbit and maintain marketplace quality.",
      points: [
        "Review product listings",
        "Approve or reject products",
        "Manage categories",
        "Remove inappropriate listings",
      ],
    },
    {
      number: "04",
      icon: "receipt_long",
      title: "Manage Transactions",
      description:
        "Monitor purchases, sales and transaction activity across the marketplace.",
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
      title: "Generate Reports",
      description:
        "Turn marketplace activity into useful insights for better decisions.",
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
      description:
        "Keep an eye on the complete ReOrbit ecosystem and respond to important activity.",
      points: [
        "Monitor platform activity",
        "Identify unusual activity",
        "Review reported issues",
        "Maintain marketplace quality",
      ],
    },
  ];

  const workflow = [
    {
      number: "01",
      title: "Review",
      text: "Check new users, ReMakers, products and marketplace activity.",
    },
    {
      number: "02",
      title: "Verify",
      text: "Make sure profiles, products and important activity meet platform requirements.",
    },
    {
      number: "03",
      title: "Manage",
      text: "Approve, update, restrict or remove items when necessary.",
    },
    {
      number: "04",
      title: "Monitor",
      text: "Track transactions, reports and activity across the platform.",
    },
    {
      number: "05",
      title: "Analyze",
      text: "Use reports and insights to understand how ReOrbit is performing.",
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
          <div className="admin-how-container">
            <div className="admin-how-badge">
              <span className="material-symbols-outlined">
                admin_panel_settings
              </span>
              ADMIN MANAGEMENT
            </div>

            <h1>
              Everything behind
              <br />
              <span>ReOrbit.</span>
            </h1>

            <p>
              Manage users, ReMakers, products, transactions and reports from
              one central place. Keep the entire ReOrbit marketplace organized,
              monitored and moving.
            </p>

            <div className="admin-how-hero-actions">
              <a href="/admin" className="admin-how-primary-btn">
                Open Dashboard
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>

              <a href="#management" className="admin-how-secondary-btn">
                Explore management
              </a>
            </div>
          </div>
        </section>

        {/* =====================================================
            MANAGEMENT AREAS
        ===================================================== */}
        <section className="admin-management" id="management">
          <div className="admin-how-container">
            <div className="admin-section-heading">
              <div>
                <span className="admin-eyebrow">PLATFORM CONTROL</span>

                <h2>
                  One place to manage
                  <br />
                  <span>the whole ecosystem.</span>
                </h2>
              </div>

              <p>
                The admin panel brings the important parts of ReOrbit together,
                making it easier to review activity, manage marketplace
                operations and keep everything running smoothly.
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

                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>
                        <span className="material-symbols-outlined">check</span>
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
              <span className="admin-eyebrow admin-eyebrow-light">
                ADMIN WORKFLOW
              </span>

              <h2>
                From activity
                <br />
                <span>to action.</span>
              </h2>

              <p>
                A simple management flow helps administrators stay on top of
                everything happening across ReOrbit.
              </p>
            </div>

            <div className="admin-workflow-grid">
              {workflow.map((step, index) => (
                <article className="admin-workflow-card" key={step.number}>
                  <span className="admin-workflow-number">{step.number}</span>

                  <div className="admin-workflow-icon">
                    <span className="material-symbols-outlined">
                      {index === 0
                        ? "visibility"
                        : index === 1
                          ? "verified"
                          : index === 2
                            ? "tune"
                            : index === 3
                              ? "monitoring"
                              : "analytics"}
                    </span>
                  </div>

                  <h3>{step.title}</h3>

                  <p>{step.text}</p>

                  {index < workflow.length - 1 && (
                    <span className="admin-workflow-arrow material-symbols-outlined">
                      arrow_forward
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            DASHBOARD INSIGHT
        ===================================================== */}
        <section className="admin-insight">
          <div className="admin-how-container">
            <div className="admin-insight-box">
              <div className="admin-insight-content">
                <span className="admin-eyebrow">SEE THE BIGGER PICTURE</span>

                <h2>
                  Data that helps
                  <br />
                  <span>admins make decisions.</span>
                </h2>

                <p>
                  Reports and dashboard insights help administrators understand
                  marketplace activity, identify trends and make informed
                  decisions about users, ReMakers, products and transactions.
                </p>

                <a href="/admin" className="admin-how-primary-btn">
                  View Dashboard
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </div>

              <div className="admin-insight-visual">
                <div className="admin-mini-stat">
                  <span className="material-symbols-outlined">group</span>

                  <div>
                    <strong>Users</strong>
                    <small>Activity overview</small>
                  </div>

                  <b>+</b>
                </div>

                <div className="admin-mini-stat">
                  <span className="material-symbols-outlined">storefront</span>

                  <div>
                    <strong>ReMakers</strong>
                    <small>Creator activity</small>
                  </div>

                  <b>+</b>
                </div>

                <div className="admin-mini-stat">
                  <span className="material-symbols-outlined">payments</span>

                  <div>
                    <strong>Transactions</strong>
                    <small>Marketplace activity</small>
                  </div>

                  <b>+</b>
                </div>

                <div className="admin-mini-stat">
                  <span className="material-symbols-outlined">analytics</span>

                  <div>
                    <strong>Reports</strong>
                    <small>Platform insights</small>
                  </div>

                  <b>+</b>
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
              <div>
                <span className="admin-eyebrow admin-eyebrow-light">
                  ADMIN CONTROL
                </span>

                <h2>
                  Keep every part
                  <br />
                  of ReOrbit moving.
                </h2>

                <p>
                  From the first user registration to the final transaction,
                  admins help keep the ReOrbit ecosystem organized, trustworthy
                  and sustainable.
                </p>
              </div>

              <a href="/admin" className="admin-white-btn">
                Go to Admin Dashboard
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <AdminFooter />

      {/* =====================================================
          PAGE CSS — KEPT INSIDE THIS FILE
      ===================================================== */}

      <style>{`

        /* =====================================================
           PAGE ROOT / ISOLATION
        ===================================================== */

        .admin-how-page {
          --admin-dark: #08271F;
          --admin-green: #08271F;
          --admin-maroon: #270809;
          --admin-gray: #414845;
          --admin-border: #C1C8C4;
          --admin-soft: #DADAD8;
          --admin-light: #E3E2E0;
          --admin-bg: #FAF9F7;
          --admin-white: #FFFFFF;
          --admin-text: #1A1C1A;
          --admin-muted: #727975;

          width: 100%;
          min-height: 100vh;

          background: var(--admin-bg);
          color: var(--admin-text);

          isolation: isolate;

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
          min-height: calc(100vh - 76px);

          display: flex;
          align-items: center;

          padding: 110px 0 100px;

          background:
            radial-gradient(
              circle at 85% 30%,
              rgba(8, 39, 31, 0.055),
              transparent 32%
            ),
            var(--admin-bg);
        }

        .admin-how-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 9px 14px;

          border: 1px solid var(--admin-border);
          border-radius: 999px;

          background: rgba(193, 200, 196, 0.25);

          color: var(--admin-green);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.12em;
        }

        .admin-how-badge .material-symbols-outlined {
          font-size: 17px;
        }

        .admin-how-hero h1 {
          max-width: 850px;

          margin: 28px 0 24px;

          color: var(--admin-maroon);

          font-family: var(--font-display);

          font-size: clamp(3.7rem, 7vw, 6.6rem);

          line-height: 0.94;

          letter-spacing: -0.055em;
        }

        .admin-how-hero h1 span {
          color: var(--admin-green);
        }

        .admin-how-hero p {
          max-width: 680px;

          color: var(--admin-gray);

          font-size: 1rem;
          line-height: 1.75;
        }

        .admin-how-hero-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;

          margin-top: 32px;
        }

        .admin-how-primary-btn,
        .admin-how-secondary-btn,
        .admin-white-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          min-height: 46px;

          padding: 0 21px;

          border-radius: 999px;

          font-family: var(--font-sans);
          font-size: 0.8rem;
          font-weight: 700;

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-how-primary-btn {
          background: var(--admin-maroon);
          border: 1px solid var(--admin-maroon);

          color: var(--admin-white);
        }

        .admin-how-primary-btn:hover {
          background: #3b1011;
          transform: translateY(-2px);
        }

        .admin-how-secondary-btn {
          background: transparent;
          border: 1px solid var(--admin-border);

          color: var(--admin-maroon);
        }

        .admin-how-secondary-btn:hover {
          background: var(--admin-light);
          border-color: var(--admin-green);

          transform: translateY(-2px);
        }

        .admin-how-primary-btn .material-symbols-outlined {
          font-size: 17px;
        }


        /* =====================================================
           SECTION HEADING
        ===================================================== */

        .admin-section-heading {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;

          align-items: end;

          gap: 70px;

          margin-bottom: 50px;
        }

        .admin-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          color: var(--admin-green);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .admin-eyebrow::before {
          content: "";

          width: 22px;
          height: 1.5px;

          background: currentColor;
        }

        .admin-section-heading h2 {
          margin: 10px 0 0;

          color: var(--admin-maroon);

          font-family: var(--font-display);

          font-size: clamp(2.4rem, 4.5vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-section-heading h2 span {
          color: var(--admin-green);
        }

        .admin-section-heading > p {
          max-width: 520px;

          color: var(--admin-muted);

          font-size: 0.86rem;
          line-height: 1.75;
        }


        /* =====================================================
           MANAGEMENT
        ===================================================== */

        .admin-management {
          padding: 110px 0;

          background: var(--admin-white);

          border-top: 1px solid var(--admin-border);
        }

        .admin-management-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 18px;
        }

        .admin-management-card {
          min-height: 355px;

          padding: 28px;

          background: var(--admin-bg);

          border: 1px solid var(--admin-border);

          border-radius: 20px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .admin-management-card:hover {
          transform: translateY(-5px);

          border-color: var(--admin-green);

          box-shadow: 0 18px 40px rgba(8, 39, 31, 0.08);
        }

        .admin-card-top {
          display: flex;

          align-items: center;
          justify-content: space-between;

          margin-bottom: 28px;
        }

        .admin-card-number {
          color: var(--admin-muted);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.12em;
        }

        .admin-card-icon {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 14px;

          background: rgba(8, 39, 31, 0.08);

          color: var(--admin-green);
        }

        .admin-card-icon .material-symbols-outlined {
          font-size: 22px;
        }

        .admin-management-card h3 {
          margin-bottom: 10px;

          color: var(--admin-maroon);

          font-family: var(--font-display);

          font-size: 1.3rem;
        }

        .admin-card-description {
          min-height: 66px;

          margin-bottom: 18px;

          color: var(--admin-muted);

          font-size: 0.76rem;
          line-height: 1.65;
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
          gap: 7px;

          color: var(--admin-gray);

          font-size: 0.7rem;
        }

        .admin-management-card li .material-symbols-outlined {
          font-size: 15px;

          color: var(--admin-green);
        }


        /* =====================================================
           WORKFLOW
        ===================================================== */

        .admin-workflow {
          padding: 110px 0;

          background: var(--admin-green);

          color: var(--admin-white);
        }

        .admin-workflow-heading {
          max-width: 680px;

          margin-bottom: 50px;
        }

        .admin-eyebrow-light {
          color: var(--admin-border);
        }

        .admin-workflow-heading h2 {
          margin: 10px 0 15px;

          color: var(--admin-white);

          font-family: var(--font-display);

          font-size: clamp(2.5rem, 4.5vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-workflow-heading h2 span {
          color: var(--admin-soft);
        }

        .admin-workflow-heading p {
          max-width: 580px;

          color: rgba(255, 255, 255, 0.64);

          font-size: 0.85rem;
          line-height: 1.7;
        }

        .admin-workflow-grid {
          display: grid;

          grid-template-columns: repeat(5, 1fr);

          gap: 12px;
        }

        .admin-workflow-card {
          position: relative;

          min-height: 245px;

          padding: 24px;

          background: rgba(255, 255, 255, 0.055);

          border: 1px solid rgba(193, 200, 196, 0.25);

          border-radius: 18px;

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .admin-workflow-card:hover {
          transform: translateY(-4px);

          background: rgba(255, 255, 255, 0.1);
        }

        .admin-workflow-number {
          display: block;

          color: var(--admin-border);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.1em;
        }

        .admin-workflow-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: 35px 0 20px;

          border-radius: 12px;

          background: rgba(255, 255, 255, 0.1);

          color: var(--admin-white);
        }

        .admin-workflow-icon .material-symbols-outlined {
          font-size: 20px;
        }

        .admin-workflow-card h3 {
          margin-bottom: 8px;

          color: var(--admin-white);

          font-family: var(--font-display);

          font-size: 1.05rem;
        }

        .admin-workflow-card p {
          color: rgba(255, 255, 255, 0.58);

          font-size: 0.7rem;

          line-height: 1.6;
        }

        .admin-workflow-arrow {
          position: absolute;

          right: 18px;
          bottom: 18px;

          color: var(--admin-border);

          font-size: 16px;
        }


        /* =====================================================
           INSIGHT
        ===================================================== */

        .admin-insight {
          padding: 110px 0;

          background: var(--admin-bg);
        }

        .admin-insight-box {
          display: grid;

          grid-template-columns: 1fr 0.8fr;

          gap: 70px;

          align-items: center;

          padding: 55px;

          background: var(--admin-white);

          border: 1px solid var(--admin-border);

          border-radius: 25px;
        }

        .admin-insight-content h2 {
          margin: 10px 0 15px;

          color: var(--admin-maroon);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 3.6rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .admin-insight-content h2 span {
          color: var(--admin-green);
        }

        .admin-insight-content p {
          max-width: 580px;

          margin-bottom: 25px;

          color: var(--admin-muted);

          font-size: 0.82rem;
          line-height: 1.75;
        }

        .admin-insight-visual {
          display: flex;

          flex-direction: column;

          gap: 10px;

          padding: 18px;

          background: var(--admin-light);

          border: 1px solid var(--admin-border);

          border-radius: 20px;
        }

        .admin-mini-stat {
          display: flex;

          align-items: center;

          gap: 12px;

          padding: 15px;

          background: var(--admin-white);

          border: 1px solid var(--admin-border);

          border-radius: 13px;
        }

        .admin-mini-stat > .material-symbols-outlined {
          width: 36px;
          height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: rgba(8, 39, 31, 0.08);

          color: var(--admin-green);

          font-size: 18px;
        }

        .admin-mini-stat div {
          display: flex;
          flex-direction: column;
          gap: 2px;

          flex: 1;
        }

        .admin-mini-stat strong {
          color: var(--admin-maroon);

          font-size: 0.75rem;
        }

        .admin-mini-stat small {
          color: var(--admin-muted);

          font-size: 0.62rem;
        }

        .admin-mini-stat b {
          color: var(--admin-green);

          font-size: 0.8rem;
        }


        /* =====================================================
           FINAL CTA
        ===================================================== */

        .admin-final {
          padding: 90px 0;

          background: var(--admin-light);
        }

        .admin-final-box {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 50px;

          padding: 55px;

          background: var(--admin-maroon);

          border-radius: 25px;

          border: 1px solid rgba(193, 200, 196, 0.25);
        }

        .admin-final-box h2 {
          margin: 10px 0 14px;

          color: var(--admin-white);

          font-family: var(--font-display);

          font-size: clamp(2.4rem, 4vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-final-box p {
          max-width: 600px;

          color: rgba(255, 255, 255, 0.65);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        .admin-white-btn {
          flex-shrink: 0;

          background: var(--admin-white);

          border: 1px solid var(--admin-white);

          color: var(--admin-maroon);
        }

        .admin-white-btn:hover {
          transform: translateY(-2px);

          background: var(--admin-soft);
        }


        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1050px) {

          .admin-how-container {
            width: min(100%, calc(100% - 50px));
          }

          .admin-management-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .admin-workflow-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .admin-workflow-card:last-child {
            grid-column: 2;
          }

          .admin-section-heading {
            gap: 40px;
          }

          .admin-insight-box {
            gap: 40px;
            padding: 40px;
          }
        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 750px) {

          .admin-how-container {
            width: calc(100% - 32px);
          }

          .admin-how-hero {
            min-height: auto;

            padding: 90px 0 70px;
          }

          .admin-how-hero h1 {
            font-size: clamp(3rem, 13vw, 4.5rem);
          }

          .admin-how-hero p {
            font-size: 0.85rem;
          }

          .admin-how-hero-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .admin-how-primary-btn,
          .admin-how-secondary-btn {
            width: 100%;
          }

          .admin-management,
          .admin-workflow,
          .admin-insight {
            padding: 75px 0;
          }

          .admin-section-heading {
            grid-template-columns: 1fr;

            gap: 20px;

            margin-bottom: 35px;
          }

          .admin-section-heading h2 {
            font-size: 2.4rem;
          }

          .admin-management-grid {
            grid-template-columns: 1fr;
          }

          .admin-management-card {
            min-height: auto;
          }

          .admin-workflow-grid {
            grid-template-columns: 1fr;
          }

          .admin-workflow-card:last-child {
            grid-column: auto;
          }

          .admin-workflow-card {
            min-height: 210px;
          }

          .admin-insight-box {
            grid-template-columns: 1fr;

            padding: 28px;

            gap: 35px;
          }

          .admin-insight-content h2 {
            font-size: 2.4rem;
          }

          .admin-final {
            padding: 65px 0;
          }

          .admin-final-box {
            flex-direction: column;

            align-items: flex-start;

            padding: 30px 24px;

            gap: 30px;
          }

          .admin-final-box h2 {
            font-size: 2.4rem;
          }

          .admin-white-btn {
            width: 100%;
          }
        }


        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 450px) {

          .admin-how-container {
            width: calc(100% - 24px);
          }

          .admin-how-hero h1 {
            font-size: 2.75rem;
          }

          .admin-management-card {
            padding: 22px;
          }

          .admin-insight-box {
            padding: 22px;
          }

          .admin-final-box {
            padding: 27px 20px;
          }
        }


        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        .admin-how-page a:focus-visible {
          outline: 2px solid var(--admin-green);
          outline-offset: 3px;
        }


        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .admin-how-page *,
          .admin-how-page *::before,
          .admin-how-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }

      `}</style>
    </div>
  );
}
