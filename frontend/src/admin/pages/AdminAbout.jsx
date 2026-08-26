import React from "react";
import AdminNavbar from "../components/AdminNavbar";
import AdminFooter from "../components/AdminFooter";

export default function AdminAbout() {
  const management = [
    {
      icon: "group",
      title: "Users",
      text: "Manage user accounts, review activity and maintain organized account information across ReOrbit.",
    },
    {
      icon: "handyman",
      title: "ReMakers",
      text: "Review ReMaker profiles, verification status, activity and products created within the ecosystem.",
    },
    {
      icon: "inventory_2",
      title: "Products & Listings",
      text: "Oversee user listings and ReMaker products while keeping marketplace information accurate.",
    },
    {
      icon: "volunteer_activism",
      title: "Donations",
      text: "Keep track of donated items and their status throughout the platform's donation process.",
    },
    {
      icon: "payments",
      title: "Transactions",
      text: "Monitor purchases, payments and transaction records across the ReOrbit marketplace.",
    },
    {
      icon: "analytics",
      title: "Reports & Insights",
      text: "Understand platform performance through reports covering users, products, transactions and activity.",
    },
  ];

  const ecosystem = [
    {
      number: "01",
      icon: "person",
      title: "Users",
      label: "THE COMMUNITY",
      text: "Users can list or donate items they no longer need and discover products available through the ReOrbit marketplace.",
    },
    {
      number: "02",
      icon: "handyman",
      title: "ReMakers",
      label: "THE CREATORS",
      text: "ReMakers work with useful materials and create products that can be showcased and sold through ReOrbit.",
    },
    {
      number: "03",
      icon: "admin_panel_settings",
      title: "Administration",
      label: "THE CONTROL LAYER",
      text: "Administrators manage users, ReMakers, listings, products, donations, transactions and platform reports.",
    },
  ];

  const principles = [
    {
      icon: "verified_user",
      title: "Trust & Verification",
      text: "Keep users, ReMakers and marketplace activity organized and easier to review.",
    },
    {
      icon: "inventory",
      title: "Product Visibility",
      text: "Maintain visibility across listings and products available throughout the ecosystem.",
    },
    {
      icon: "receipt_long",
      title: "Transaction Records",
      text: "Keep purchases, payments and related activity accessible for administrative review.",
    },
    {
      icon: "monitoring",
      title: "Platform Insights",
      text: "Use activity and reporting information to understand how the platform is performing.",
    },
  ];

  return (
    <div className="admin-about-page">
      <AdminNavbar />

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="admin-about-hero">
          <div className="admin-about-grid-pattern" />

          <div className="admin-about-glow admin-about-glow-one" />
          <div className="admin-about-glow admin-about-glow-two" />

          <div className="admin-about-container admin-about-hero-grid">
            <div className="admin-about-copy">
              <div className="admin-about-badge">
                <span className="material-symbols-outlined">
                  admin_panel_settings
                </span>
                ABOUT REORBIT ADMINISTRATION
              </div>

              <h1>
                The system
                <br />
                behind <span>ReOrbit.</span>
              </h1>

              <p>
                ReOrbit connects users, ReMakers and marketplace activity around
                one simple idea: useful things deserve another opportunity. The
                administration layer keeps that ecosystem organized, visible and
                reliable.
              </p>

              <div className="admin-about-actions">
                <a href="/admin" className="admin-about-primary">
                  Open Admin Panel
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>

                <a href="/admin-how-it-works" className="admin-about-secondary">
                  How It Works
                  <span className="material-symbols-outlined">north_east</span>
                </a>
              </div>
            </div>

            {/* ECOSYSTEM VISUAL */}

            <div className="admin-about-visual">
              <div className="admin-about-visual-top">
                <div>
                  <span>REORBIT ECOSYSTEM</span>
                  <strong>Connected by design</strong>
                </div>

                <div className="admin-about-live">
                  <i />
                  ADMIN CORE
                </div>
              </div>

              <div className="admin-about-orbit">
                <div className="about-orbit-ring ring-one" />
                <div className="about-orbit-ring ring-two" />

                <div className="about-orbit-core">
                  <span className="material-symbols-outlined">hub</span>

                  <strong>ReOrbit</strong>
                  <small>ADMIN CORE</small>
                </div>

                <div className="about-orbit-node about-node-users">
                  <span className="material-symbols-outlined">group</span>
                  <small>USERS</small>
                </div>

                <div className="about-orbit-node about-node-remakers">
                  <span className="material-symbols-outlined">handyman</span>
                  <small>REMAKERS</small>
                </div>

                <div className="about-orbit-node about-node-market">
                  <span className="material-symbols-outlined">
                    shopping_bag
                  </span>
                  <small>MARKETPLACE</small>
                </div>
              </div>

              <div className="admin-about-visual-bottom">
                <div>
                  <span className="material-symbols-outlined">visibility</span>
                  <p>
                    <strong>Visibility</strong>
                    <small>Across the ecosystem</small>
                  </p>
                </div>

                <div>
                  <span className="material-symbols-outlined">
                    account_tree
                  </span>
                  <p>
                    <strong>Connection</strong>
                    <small>One management layer</small>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            INTRO
        ===================================================== */}

        <section className="admin-about-intro">
          <div className="admin-about-container">
            <div className="admin-about-intro-grid">
              <div>
                <span className="admin-about-eyebrow">THE IDEA</span>

                <h2>
                  One ecosystem.
                  <br />
                  <span>One place to manage it.</span>
                </h2>
              </div>

              <div className="admin-about-intro-copy">
                <p>
                  ReOrbit is designed to make it easier for people to keep
                  useful things in circulation. Users can list or donate items,
                  while ReMakers can work with useful materials and offer their
                  own creations through the marketplace.
                </p>

                <p>
                  The administration layer connects these activities. It gives
                  the platform a central place to manage accounts, review
                  ReMakers, oversee listings and products, monitor transactions
                  and understand overall platform activity.
                </p>

                <div className="admin-about-statement">
                  <span className="material-symbols-outlined">
                    format_quote
                  </span>

                  <div>
                    <strong>Administration is the connective layer.</strong>

                    <p>
                      Instead of treating every part of ReOrbit separately,
                      admins get a broader view of how the complete ecosystem is
                      operating.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MANAGEMENT
        ===================================================== */}

        <section className="admin-about-management">
          <div className="admin-about-container">
            <div className="admin-about-section-heading">
              <div>
                <span className="admin-about-eyebrow">ADMINISTRATION</span>

                <h2>
                  Everything that keeps
                  <br />
                  <span>ReOrbit organized.</span>
                </h2>
              </div>

              <p>
                The administration side provides visibility across the platform,
                helping the team manage the people, products and activity that
                make ReOrbit work.
              </p>
            </div>

            <div className="admin-about-management-grid">
              {management.map((item, index) => (
                <article
                  className="admin-about-management-card"
                  key={item.title}
                >
                  <div className="admin-about-card-top">
                    <span>0{index + 1}</span>

                    <div className="admin-about-card-icon">
                      <span className="material-symbols-outlined">
                        {item.icon}
                      </span>
                    </div>
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.text}</p>

                  <div className="admin-about-card-arrow">
                    <span className="material-symbols-outlined">
                      arrow_outward
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            ECOSYSTEM
        ===================================================== */}

        <section className="admin-about-ecosystem">
          <div className="admin-about-container">
            <div className="admin-about-ecosystem-heading">
              <span className="admin-about-eyebrow">REORBIT ECOSYSTEM</span>

              <h2>
                Three sides.
                <br />
                <span>One connected system.</span>
              </h2>

              <p>
                ReOrbit works because each side has a clear role. The admin
                system connects those roles and provides the oversight needed to
                keep the platform operating smoothly.
              </p>
            </div>

            <div className="admin-about-ecosystem-grid">
              {ecosystem.map((item, index) => (
                <React.Fragment key={item.title}>
                  <article className="admin-about-ecosystem-card">
                    <div className="admin-ecosystem-card-header">
                      <span>{item.number}</span>

                      <div>
                        <span className="material-symbols-outlined">
                          {item.icon}
                        </span>
                      </div>
                    </div>

                    <small>{item.label}</small>

                    <h3>{item.title}</h3>

                    <p>{item.text}</p>
                  </article>

                  {index < ecosystem.length - 1 && (
                    <div className="admin-about-ecosystem-connector">
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="admin-about-ecosystem-bar">
              <div>
                <span className="material-symbols-outlined">sync</span>

                <p>
                  <strong>Connected ecosystem</strong>
                  <small>Users → ReMakers → Marketplace → Administration</small>
                </p>
              </div>

              <span className="admin-about-ecosystem-status">
                SYSTEM CONNECTED
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            PRINCIPLES
        ===================================================== */}

        <section className="admin-about-principles">
          <div className="admin-about-container">
            <div className="admin-about-principles-heading">
              <div>
                <span className="admin-about-eyebrow">BUILT FOR CONTROL</span>

                <h2>
                  Visibility where
                  <br />
                  <span>it matters.</span>
                </h2>
              </div>

              <p>
                Good administration is not only about managing records. It is
                about having the right information available when decisions need
                to be made.
              </p>
            </div>

            <div className="admin-about-principles-grid">
              {principles.map((item, index) => (
                <article className="admin-about-principle" key={item.title}>
                  <div className="admin-about-principle-number">
                    0{index + 1}
                  </div>

                  <div className="admin-about-principle-icon">
                    <span className="material-symbols-outlined">
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
            MISSION
        ===================================================== */}

        <section className="admin-about-mission">
          <div className="admin-about-container">
            <div className="admin-about-mission-box">
              <div className="admin-about-mission-copy">
                <span className="admin-about-eyebrow">OUR DIRECTION</span>

                <h2>
                  Keep useful things
                  <br />
                  <span>moving forward.</span>
                </h2>

                <p>
                  ReOrbit aims to make reuse more accessible by connecting
                  people, creators and products through one circular
                  marketplace. The administration system provides the structure
                  that keeps these activities visible and organized.
                </p>

                <div className="admin-about-mission-points">
                  <div>
                    <span className="material-symbols-outlined">autorenew</span>
                    <p>
                      <strong>Second life</strong>
                      <small>Give useful things another opportunity.</small>
                    </p>
                  </div>

                  <div>
                    <span className="material-symbols-outlined">hub</span>
                    <p>
                      <strong>Connected platform</strong>
                      <small>
                        Bring people, products and activity together.
                      </small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-about-mission-visual">
                <div className="mission-ring mission-ring-one" />
                <div className="mission-ring mission-ring-two" />

                <div className="mission-core">
                  <span className="material-symbols-outlined">autorenew</span>

                  <strong>Second life.</strong>

                  <small>Another opportunity.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="admin-about-final">
          <div className="admin-about-container">
            <div className="admin-about-final-box">
              <div className="admin-about-final-icon">
                <span className="material-symbols-outlined">
                  admin_panel_settings
                </span>
              </div>

              <div className="admin-about-final-copy">
                <span>ADMINISTRATION AT THE CORE</span>

                <h2>
                  Keep ReOrbit
                  <br />
                  <span>moving.</span>
                </h2>

                <p>
                  Manage the platform, review its activity and help create a
                  reliable environment where users and ReMakers can participate
                  in the circular marketplace.
                </p>
              </div>

              <a href="/admin" className="admin-about-final-btn">
                Open Admin Panel
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <AdminFooter />

      <style>{`
        /* =====================================================
           ADMIN ABOUT
           DARK REORBIT ADMIN THEME
        ===================================================== */

        .admin-about-page {
          --about-bg: #061b16;
          --about-bg-deep: #04130f;
          --about-surface: #0a241d;
          --about-surface-2: #0d2d24;
          --about-surface-3: #12382e;

          --about-accent: #afcfc2;
          --about-accent-light: #c3ded3;
          --about-accent-dark: #7fa99a;

          --about-text: #f2f5f2;
          --about-soft: #c5cfca;
          --about-muted: #899992;

          --about-border: rgba(175, 207, 194, 0.15);
          --about-border-strong: rgba(175, 207, 194, 0.28);

          min-height: 100vh;

          background: var(--about-bg);

          color: var(--about-text);

          overflow-x: hidden;

          isolation: isolate;
        }

        .admin-about-page *,
        .admin-about-page *::before,
        .admin-about-page *::after {
          box-sizing: border-box;
        }

        .admin-about-page a {
          text-decoration: none;
        }

        .admin-about-container {
          width: min(1280px, calc(100% - 80px));
          margin: 0 auto;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .admin-about-hero {
          position: relative;

          min-height: calc(100vh - 76px);

          display: flex;
          align-items: center;

          padding: 100px 0 90px;

          background:
            linear-gradient(
              115deg,
              #061b16 0%,
              #071f19 52%,
              #09271f 100%
            );

          overflow: hidden;
        }

        .admin-about-grid-pattern {
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

        .admin-about-glow {
          position: absolute;

          border-radius: 50%;

          pointer-events: none;
        }

        .admin-about-glow-one {
          width: 600px;
          height: 600px;

          top: -260px;
          right: -150px;

          background: radial-gradient(
            circle,
            rgba(127, 169, 154, 0.14),
            transparent 68%
          );
        }

        .admin-about-glow-two {
          width: 500px;
          height: 500px;

          left: 20%;
          bottom: -420px;

          background: radial-gradient(
            circle,
            rgba(175,207,194,0.08),
            transparent 70%
          );
        }

        .admin-about-hero-grid {
          position: relative;
          z-index: 2;

          display: grid;

          grid-template-columns: 1fr 0.9fr;

          gap: 90px;

          align-items: center;
        }

        .admin-about-badge {
          display: inline-flex;
          align-items: center;

          gap: 8px;

          padding: 9px 14px;

          border: 1px solid var(--about-border-strong);

          border-radius: 999px;

          background: rgba(175,207,194,0.07);

          color: var(--about-accent);

          font-size: 0.66rem;
          font-weight: 850;

          letter-spacing: 0.13em;
        }

        .admin-about-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .admin-about-copy h1 {
          max-width: 700px;

          margin: 27px 0 23px;

          font-family: var(--font-display);

          font-size: clamp(3.7rem, 6.3vw, 6.2rem);

          line-height: 0.94;

          letter-spacing: -0.055em;

          color: var(--about-text);
        }

        .admin-about-copy h1 span {
          color: var(--about-accent);
        }

        .admin-about-copy > p {
          max-width: 625px;

          color: var(--about-muted);

          font-size: 0.92rem;

          line-height: 1.8;
        }

        .admin-about-actions {
          display: flex;
          flex-wrap: wrap;

          gap: 11px;

          margin-top: 31px;
        }

        .admin-about-primary,
        .admin-about-secondary,
        .admin-about-final-btn {
          min-height: 46px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          padding: 0 20px;

          border-radius: 999px;

          font-size: 0.76rem;
          font-weight: 750;

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-about-primary {
          background: var(--about-accent);

          border: 1px solid var(--about-accent);

          color: var(--about-bg-deep);
        }

        .admin-about-primary:hover {
          transform: translateY(-2px);

          background: var(--about-accent-light);
        }

        .admin-about-secondary {
          border: 1px solid var(--about-border-strong);

          background: rgba(255,255,255,0.025);

          color: var(--about-soft);
        }

        .admin-about-secondary:hover {
          transform: translateY(-2px);

          border-color: var(--about-accent-dark);

          background: rgba(175,207,194,0.07);
        }

        .admin-about-primary .material-symbols-outlined,
        .admin-about-secondary .material-symbols-outlined {
          font-size: 17px;
        }

        /* =====================================================
           HERO VISUAL
        ===================================================== */

        .admin-about-visual {
          position: relative;

          min-height: 490px;

          border: 1px solid var(--about-border-strong);

          border-radius: 24px;

          background:
            radial-gradient(
              circle at center,
              rgba(175,207,194,0.10),
              transparent 38%
            ),
            var(--about-surface);

          overflow: hidden;

          box-shadow: 0 35px 80px rgba(0,0,0,0.22);
        }

        .admin-about-visual::before {
          content: "";

          position: absolute;
          inset: 0;

          opacity: 0.35;

          background-image:
            linear-gradient(
              rgba(175,207,194,0.04) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(175,207,194,0.04) 1px,
              transparent 1px
            );

          background-size: 35px 35px;
        }

        .admin-about-visual-top {
          position: relative;
          z-index: 5;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 20px 22px;

          border-bottom: 1px solid var(--about-border);
        }

        .admin-about-visual-top > div:first-child {
          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .admin-about-visual-top span {
          color: var(--about-muted);

          font-size: 0.54rem;
          font-weight: 850;

          letter-spacing: 0.12em;
        }

        .admin-about-visual-top strong {
          color: var(--about-soft);

          font-size: 0.8rem;
        }

        .admin-about-live {
          display: flex;
          align-items: center;

          gap: 7px;

          color: var(--about-accent);

          font-size: 0.53rem;
          font-weight: 850;

          letter-spacing: 0.08em;
        }

        .admin-about-live i {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: var(--about-accent);

          box-shadow: 0 0 14px var(--about-accent);
        }

        .admin-about-orbit {
          position: relative;

          min-height: 385px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .about-orbit-ring {
          position: absolute;

          border: 1px solid rgba(175,207,194,0.14);

          border-radius: 50%;
        }

        .ring-one {
          width: 245px;
          height: 245px;
        }

        .ring-two {
          width: 350px;
          height: 350px;

          border-style: dashed;

          opacity: 0.55;
        }

        .about-orbit-core {
          position: relative;
          z-index: 5;

          width: 125px;
          height: 125px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--about-accent);

          color: var(--about-bg-deep);

          box-shadow:
            0 0 0 10px rgba(175,207,194,0.04),
            0 25px 60px rgba(0,0,0,0.28);
        }

        .about-orbit-core .material-symbols-outlined {
          margin-bottom: 5px;

          font-size: 28px;
        }

        .about-orbit-core strong {
          font-family: var(--font-display);

          font-size: 0.98rem;
        }

        .about-orbit-core small {
          margin-top: 3px;

          font-size: 0.46rem;
          font-weight: 900;

          letter-spacing: 0.14em;

          opacity: 0.7;
        }

        .about-orbit-node {
          position: absolute;
          z-index: 5;

          width: 76px;
          height: 76px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 5px;

          border: 1px solid var(--about-border-strong);

          border-radius: 18px;

          background: rgba(10,36,29,0.95);

          color: var(--about-accent);

          box-shadow: 0 18px 35px rgba(0,0,0,0.22);
        }

        .about-orbit-node .material-symbols-outlined {
          font-size: 21px;
        }

        .about-orbit-node small {
          color: var(--about-soft);

          font-size: 0.47rem;
          font-weight: 800;

          letter-spacing: 0.06em;
        }

        .about-node-users {
          left: 67px;
          top: 105px;
        }

        .about-node-remakers {
          right: 67px;
          top: 105px;
        }

        .about-node-market {
          left: 50%;
          bottom: 22px;

          transform: translateX(-50%);
        }

        .admin-about-visual-bottom {
          position: relative;
          z-index: 5;

          display: grid;
          grid-template-columns: 1fr 1fr;

          border-top: 1px solid var(--about-border);
        }

        .admin-about-visual-bottom > div {
          display: flex;
          align-items: center;

          gap: 10px;

          padding: 15px 18px;

          border-right: 1px solid var(--about-border);
        }

        .admin-about-visual-bottom > div:last-child {
          border-right: 0;
        }

        .admin-about-visual-bottom > div > .material-symbols-outlined {
          color: var(--about-accent);

          font-size: 19px;
        }

        .admin-about-visual-bottom p {
          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .admin-about-visual-bottom strong {
          color: var(--about-soft);

          font-size: 0.61rem;
        }

        .admin-about-visual-bottom small {
          color: var(--about-muted);

          font-size: 0.51rem;
        }

        /* =====================================================
           EYEBROW
        ===================================================== */

        .admin-about-eyebrow {
          display: inline-flex;
          align-items: center;

          gap: 8px;

          color: var(--about-accent);

          font-size: 0.62rem;
          font-weight: 850;

          letter-spacing: 0.14em;

          text-transform: uppercase;
        }

        .admin-about-eyebrow::before {
          content: "";

          width: 22px;
          height: 1px;

          background: currentColor;
        }

        /* =====================================================
           INTRO
        ===================================================== */

        .admin-about-intro {
          padding: 115px 0;

          background: var(--about-surface);
        }

        .admin-about-intro-grid {
          display: grid;

          grid-template-columns: 0.8fr 1.2fr;

          gap: 100px;

          align-items: start;
        }

        .admin-about-intro h2 {
          margin-top: 12px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: clamp(2.6rem, 4.3vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-intro h2 span {
          color: var(--about-accent);
        }

        .admin-about-intro-copy > p {
          margin-bottom: 18px;

          color: var(--about-muted);

          font-size: 0.83rem;

          line-height: 1.8;
        }

        .admin-about-statement {
          display: flex;

          gap: 15px;

          margin-top: 28px;

          padding: 20px;

          border: 1px solid var(--about-border);

          border-radius: 16px;

          background: rgba(175,207,194,0.035);
        }

        .admin-about-statement > .material-symbols-outlined {
          color: var(--about-accent);

          font-size: 24px;
        }

        .admin-about-statement strong {
          display: block;

          margin-bottom: 6px;

          color: var(--about-soft);

          font-size: 0.72rem;
        }

        .admin-about-statement p {
          color: var(--about-muted);

          font-size: 0.63rem;

          line-height: 1.65;
        }

        /* =====================================================
           MANAGEMENT
        ===================================================== */

        .admin-about-management {
          padding: 115px 0;

          background: var(--about-bg-deep);
        }

        .admin-about-section-heading {
          display: grid;

          grid-template-columns: 1fr 0.7fr;

          gap: 80px;

          align-items: end;

          margin-bottom: 52px;
        }

        .admin-about-section-heading h2 {
          margin-top: 12px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: clamp(2.6rem, 4.5vw, 4.1rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-section-heading h2 span {
          color: var(--about-accent);
        }

        .admin-about-section-heading > p {
          color: var(--about-muted);

          font-size: 0.8rem;

          line-height: 1.75;
        }

        .admin-about-management-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 15px;
        }

        .admin-about-management-card {
          position: relative;

          min-height: 315px;

          padding: 26px;

          border: 1px solid var(--about-border);

          border-radius: 19px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.035),
              rgba(255,255,255,0.008)
            ),
            var(--about-surface);

          overflow: hidden;

          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease;
        }

        .admin-about-management-card:hover {
          transform: translateY(-5px);

          border-color: var(--about-border-strong);

          background: var(--about-surface-2);
        }

        .admin-about-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 42px;
        }

        .admin-about-card-top > span {
          color: var(--about-muted);

          font-size: 0.58rem;
          font-weight: 850;

          letter-spacing: 0.12em;
        }

        .admin-about-card-icon {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--about-border);

          border-radius: 13px;

          background: rgba(175,207,194,0.07);

          color: var(--about-accent);
        }

        .admin-about-card-icon .material-symbols-outlined {
          font-size: 21px;
        }

        .admin-about-management-card h3 {
          margin-bottom: 10px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: 1.18rem;
        }

        .admin-about-management-card > p {
          max-width: 310px;

          color: var(--about-muted);

          font-size: 0.7rem;

          line-height: 1.75;
        }

        .admin-about-card-arrow {
          position: absolute;

          right: 23px;
          bottom: 21px;

          color: var(--about-accent-dark);

          opacity: 0.7;
        }

        .admin-about-card-arrow .material-symbols-outlined {
          font-size: 18px;
        }

        /* =====================================================
           ECOSYSTEM
        ===================================================== */

        .admin-about-ecosystem {
          padding: 115px 0;

          background: var(--about-surface-2);
        }

        .admin-about-ecosystem-heading {
          max-width: 680px;

          margin-bottom: 50px;
        }

        .admin-about-ecosystem-heading h2 {
          margin: 12px 0 15px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: clamp(2.7rem, 4.5vw, 4.2rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-ecosystem-heading h2 span {
          color: var(--about-accent);
        }

        .admin-about-ecosystem-heading p {
          max-width: 590px;

          color: var(--about-muted);

          font-size: 0.8rem;

          line-height: 1.75;
        }

        .admin-about-ecosystem-grid {
          display: grid;

          grid-template-columns: 1fr auto 1fr auto 1fr;

          align-items: stretch;

          gap: 10px;
        }

        .admin-about-ecosystem-card {
          min-height: 330px;

          padding: 25px;

          border: 1px solid var(--about-border);

          border-radius: 19px;

          background: var(--about-bg);

          transition:
            transform 0.25s ease,
            border-color 0.25s ease;
        }

        .admin-about-ecosystem-card:hover {
          transform: translateY(-5px);

          border-color: var(--about-border-strong);
        }

        .admin-ecosystem-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 58px;
        }

        .admin-ecosystem-card-header > span {
          color: var(--about-muted);

          font-size: 0.58rem;
          font-weight: 850;
        }

        .admin-ecosystem-card-header > div {
          width: 43px;
          height: 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: rgba(175,207,194,0.08);

          color: var(--about-accent);
        }

        .admin-ecosystem-card-header .material-symbols-outlined {
          font-size: 20px;
        }

        .admin-about-ecosystem-card > small {
          color: var(--about-accent-dark);

          font-size: 0.51rem;
          font-weight: 850;

          letter-spacing: 0.12em;
        }

        .admin-about-ecosystem-card h3 {
          margin: 8px 0 11px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: 1.3rem;
        }

        .admin-about-ecosystem-card p {
          color: var(--about-muted);

          font-size: 0.68rem;

          line-height: 1.75;
        }

        .admin-about-ecosystem-connector {
          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--about-accent-dark);
        }

        .admin-about-ecosystem-connector .material-symbols-outlined {
          font-size: 17px;
        }

        .admin-about-ecosystem-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 30px;

          margin-top: 15px;

          padding: 17px 20px;

          border: 1px solid var(--about-border);

          border-radius: 15px;

          background: rgba(0,0,0,0.1);
        }

        .admin-about-ecosystem-bar > div {
          display: flex;
          align-items: center;

          gap: 11px;
        }

        .admin-about-ecosystem-bar .material-symbols-outlined {
          color: var(--about-accent);

          font-size: 20px;
        }

        .admin-about-ecosystem-bar p {
          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .admin-about-ecosystem-bar strong {
          color: var(--about-soft);

          font-size: 0.63rem;
        }

        .admin-about-ecosystem-bar small {
          color: var(--about-muted);

          font-size: 0.54rem;
        }

        .admin-about-ecosystem-status {
          color: var(--about-accent);

          font-size: 0.52rem;
          font-weight: 850;

          letter-spacing: 0.1em;
        }

        /* =====================================================
           PRINCIPLES
        ===================================================== */

        .admin-about-principles {
          padding: 115px 0;

          background: var(--about-bg);
        }

        .admin-about-principles-heading {
          display: grid;

          grid-template-columns: 1fr 0.7fr;

          gap: 80px;

          align-items: end;

          margin-bottom: 50px;
        }

        .admin-about-principles-heading h2 {
          margin-top: 12px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: clamp(2.6rem, 4.4vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-principles-heading h2 span {
          color: var(--about-accent);
        }

        .admin-about-principles-heading > p {
          color: var(--about-muted);

          font-size: 0.8rem;

          line-height: 1.75;
        }

        .admin-about-principles-grid {
          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 14px;
        }

        .admin-about-principle {
          position: relative;

          min-height: 255px;

          padding: 24px;

          border: 1px solid var(--about-border);

          border-radius: 18px;

          background: var(--about-surface);
        }

        .admin-about-principle-number {
          position: absolute;

          top: 22px;
          right: 22px;

          color: var(--about-muted);

          font-size: 0.56rem;
          font-weight: 850;
        }

        .admin-about-principle-icon {
          width: 43px;
          height: 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 54px;

          border-radius: 12px;

          background: rgba(175,207,194,0.08);

          color: var(--about-accent);
        }

        .admin-about-principle-icon .material-symbols-outlined {
          font-size: 20px;
        }

        .admin-about-principle h3 {
          margin-bottom: 9px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: 1rem;
        }

        .admin-about-principle p {
          color: var(--about-muted);

          font-size: 0.65rem;

          line-height: 1.7;
        }

        /* =====================================================
           MISSION
        ===================================================== */

        .admin-about-mission {
          padding: 100px 0;

          background: var(--about-bg-deep);
        }

        .admin-about-mission-box {
          display: grid;

          grid-template-columns: 1fr 0.45fr;

          align-items: center;

          gap: 80px;

          padding: 55px;

          border: 1px solid var(--about-border-strong);

          border-radius: 24px;

          background:
            linear-gradient(
              110deg,
              var(--about-surface-3),
              var(--about-surface)
            );
        }

        .admin-about-mission-copy h2 {
          margin: 12px 0 16px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: clamp(2.7rem, 4.5vw, 4.2rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-mission-copy h2 span {
          color: var(--about-accent);
        }

        .admin-about-mission-copy > p {
          max-width: 630px;

          color: var(--about-muted);

          font-size: 0.8rem;

          line-height: 1.75;
        }

        .admin-about-mission-points {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 10px;

          margin-top: 28px;
        }

        .admin-about-mission-points > div {
          display: flex;

          gap: 10px;

          padding: 14px;

          border: 1px solid var(--about-border);

          border-radius: 14px;

          background: rgba(255,255,255,0.025);
        }

        .admin-about-mission-points > div > .material-symbols-outlined {
          color: var(--about-accent);

          font-size: 19px;
        }

        .admin-about-mission-points p {
          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .admin-about-mission-points strong {
          color: var(--about-soft);

          font-size: 0.62rem;
        }

        .admin-about-mission-points small {
          color: var(--about-muted);

          font-size: 0.52rem;

          line-height: 1.5;
        }

        .admin-about-mission-visual {
          position: relative;

          width: 260px;
          height: 260px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: auto;
        }

        .mission-ring {
          position: absolute;

          border: 1px solid rgba(175,207,194,0.17);

          border-radius: 50%;
        }

        .mission-ring-one {
          width: 220px;
          height: 220px;
        }

        .mission-ring-two {
          width: 260px;
          height: 260px;

          border-style: dashed;

          opacity: 0.55;
        }

        .mission-core {
          position: relative;
          z-index: 2;

          width: 135px;
          height: 135px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--about-accent);

          color: var(--about-bg-deep);

          text-align: center;

          box-shadow: 0 25px 55px rgba(0,0,0,0.28);
        }

        .mission-core .material-symbols-outlined {
          margin-bottom: 5px;

          font-size: 28px;
        }

        .mission-core strong {
          font-family: var(--font-display);

          font-size: 0.94rem;
        }

        .mission-core small {
          margin-top: 3px;

          color: rgba(6,27,22,0.62);

          font-size: 0.5rem;
        }

        /* =====================================================
           FINAL
        ===================================================== */

        .admin-about-final {
          padding: 85px 0 105px;

          background: var(--about-bg);
        }

        .admin-about-final-box {
          display: grid;

          grid-template-columns: auto 1fr auto;

          align-items: center;

          gap: 28px;

          padding: 40px;

          border: 1px solid var(--about-border-strong);

          border-radius: 22px;

          background:
            linear-gradient(
              110deg,
              var(--about-surface-3),
              var(--about-surface)
            );
        }

        .admin-about-final-icon {
          width: 60px;
          height: 60px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--about-border-strong);

          border-radius: 17px;

          background: rgba(175,207,194,0.08);

          color: var(--about-accent);
        }

        .admin-about-final-icon .material-symbols-outlined {
          font-size: 28px;
        }

        .admin-about-final-copy > span {
          color: var(--about-accent);

          font-size: 0.54rem;
          font-weight: 850;

          letter-spacing: 0.13em;
        }

        .admin-about-final-copy h2 {
          margin: 6px 0 8px;

          color: var(--about-text);

          font-family: var(--font-display);

          font-size: clamp(2rem, 3.3vw, 2.9rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-final-copy h2 span {
          color: var(--about-accent);
        }

        .admin-about-final-copy p {
          color: var(--about-muted);

          font-size: 0.68rem;

          line-height: 1.6;
        }

        .admin-about-final-btn {
          background: var(--about-accent);

          border: 1px solid var(--about-accent);

          color: var(--about-bg-deep);

          white-space: nowrap;
        }

        .admin-about-final-btn:hover {
          transform: translateY(-2px);

          background: var(--about-accent-light);
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1080px) {
          .admin-about-container {
            width: min(100%, calc(100% - 50px));
          }

          .admin-about-hero-grid {
            gap: 50px;
          }

          .admin-about-management-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .admin-about-principles-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .admin-about-ecosystem-grid {
            grid-template-columns: 1fr;
          }

          .admin-about-ecosystem-connector {
            display: none;
          }

          .admin-about-ecosystem-card {
            min-height: auto;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 800px) {
          .admin-about-container {
            width: calc(100% - 32px);
          }

          .admin-about-hero {
            min-height: auto;

            padding: 90px 0 75px;
          }

          .admin-about-hero-grid {
            grid-template-columns: 1fr;

            gap: 55px;
          }

          .admin-about-copy h1 {
            font-size: clamp(3rem, 13vw, 4.8rem);
          }

          .admin-about-visual {
            min-height: 450px;
          }

          .admin-about-intro,
          .admin-about-management,
          .admin-about-ecosystem,
          .admin-about-principles {
            padding: 80px 0;
          }

          .admin-about-intro-grid {
            grid-template-columns: 1fr;

            gap: 40px;
          }

          .admin-about-section-heading,
          .admin-about-principles-heading {
            grid-template-columns: 1fr;

            gap: 22px;
          }

          .admin-about-management-grid {
            grid-template-columns: 1fr;
          }

          .admin-about-principles-grid {
            grid-template-columns: 1fr;
          }

          .admin-about-mission-box {
            grid-template-columns: 1fr;

            padding: 35px 28px;

            gap: 50px;
          }

          .admin-about-mission-points {
            grid-template-columns: 1fr;
          }

          .admin-about-final-box {
            grid-template-columns: 1fr;

            align-items: flex-start;

            padding: 30px 24px;
          }

          .admin-about-final-btn {
            width: 100%;
          }
        }

        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 500px) {
          .admin-about-container {
            width: calc(100% - 24px);
          }

          .admin-about-copy h1 {
            font-size: 2.85rem;
          }

          .admin-about-actions {
            flex-direction: column;
          }

          .admin-about-primary,
          .admin-about-secondary {
            width: 100%;
          }

          .admin-about-visual {
            min-height: 400px;

            border-radius: 19px;
          }

          .admin-about-visual-top {
            padding: 17px;
          }

          .admin-about-orbit {
            min-height: 320px;
          }

          .ring-one {
            width: 210px;
            height: 210px;
          }

          .ring-two {
            width: 285px;
            height: 285px;
          }

          .about-orbit-core {
            width: 100px;
            height: 100px;
          }

          .about-orbit-node {
            width: 62px;
            height: 62px;
          }

          .about-node-users {
            left: 24px;
            top: 85px;
          }

          .about-node-remakers {
            right: 24px;
            top: 85px;
          }

          .about-node-market {
            bottom: 14px;
          }

          .admin-about-visual-bottom {
            grid-template-columns: 1fr;
          }

          .admin-about-visual-bottom > div {
            border-right: 0;

            border-bottom: 1px solid var(--about-border);
          }

          .admin-about-visual-bottom > div:last-child {
            border-bottom: 0;
          }

          .admin-about-intro h2,
          .admin-about-section-heading h2,
          .admin-about-ecosystem-heading h2,
          .admin-about-principles-heading h2,
          .admin-about-mission-copy h2 {
            font-size: 2.35rem;
          }

          .admin-about-management-card {
            min-height: 280px;
          }

          .admin-about-mission {
            padding: 70px 0;
          }

          .admin-about-mission-visual {
            width: 220px;
            height: 220px;
          }

          .mission-ring-one {
            width: 185px;
            height: 185px;
          }

          .mission-ring-two {
            width: 220px;
            height: 220px;
          }

          .mission-core {
            width: 115px;
            height: 115px;
          }

          .admin-about-final {
            padding: 65px 0 80px;
          }
        }

        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        .admin-about-page a:focus-visible,
        .admin-about-page button:focus-visible {
          outline: 2px solid var(--about-accent);

          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-about-page *,
          .admin-about-page *::before,
          .admin-about-page *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
