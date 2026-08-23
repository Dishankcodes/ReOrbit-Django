import React from "react";
import AdminNavbar from "../components/AdminNavbar";
import AdminFooter from "../components/AdminFooter";

export default function About() {
  return (
    <div className="admin-about-page">
      <AdminNavbar />

      <style>{`

        /* =====================================================
           ADMIN ABOUT — ISOLATED THEME
        ===================================================== */

        .admin-about-page {
          --admin-green: #08271F;
          --admin-green-soft: #0D3329;
          --admin-maroon: #270809;

          --admin-text: #1A1C1A;
          --admin-muted: #727975;
          --admin-border: #C1C8C4;

          --admin-light: #EEEEEC;
          --admin-background: #FAF9F7;
          --admin-white: #FFFFFF;

          min-height: 100vh;
          background: var(--admin-background);
          color: var(--admin-text);

          isolation: isolate;
          overflow-x: hidden;
        }


        /* =====================================================
           CONTAINER
        ===================================================== */

        .admin-about-page .admin-about-container {
          width: min(1280px, calc(100% - 80px));
          margin: 0 auto;
        }


        /* =====================================================
           HERO
        ===================================================== */

        .admin-about-page .admin-about-hero {
          min-height: calc(100vh - 76px);

          display: flex;
          align-items: center;

          padding: 110px 0 90px;

          background: var(--admin-background);
        }

        .admin-about-page .admin-about-hero-grid {
          display: grid;

          grid-template-columns: 1.05fr 0.95fr;

          align-items: center;

          gap: 80px;
        }


        /* HERO TEXT */

        .admin-about-page .admin-about-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          color: var(--admin-green);

          font-size: 0.66rem;
          font-weight: 800;

          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .admin-about-page .admin-about-eyebrow::before {
          content: "";

          width: 22px;
          height: 1.5px;

          background: var(--admin-green);
        }

        .admin-about-page .admin-about-hero h1 {
          margin: 25px 0 22px;

          color: var(--admin-green);

          font-family: var(--font-display);

          font-size: clamp(3.5rem, 6vw, 6rem);

          line-height: 0.94;

          letter-spacing: -0.055em;

          font-weight: 700;
        }

        .admin-about-page .admin-about-hero h1 em {
          color: var(--admin-maroon);

          font-style: italic;
          font-weight: 600;
        }

        .admin-about-page .admin-about-hero-description {
          max-width: 620px;

          margin-bottom: 30px;

          color: var(--admin-muted);

          font-size: 0.92rem;

          line-height: 1.75;
        }


        /* BUTTONS */

        .admin-about-page .admin-about-actions {
          display: flex;
          flex-wrap: wrap;

          gap: 12px;
        }

        .admin-about-page .admin-about-btn {
          min-height: 46px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          padding: 0 21px;

          border-radius: 999px;

          font-family: var(--font-sans);

          font-size: 0.8rem;
          font-weight: 700;

          text-decoration: none;

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-about-page .admin-about-btn:hover {
          transform: translateY(-2px);
        }

        .admin-about-page .admin-about-btn .material-symbols-outlined {
          font-size: 17px;
        }

        .admin-about-page .admin-about-btn-primary {
          background: var(--admin-green);

          border: 1px solid var(--admin-green);

          color: var(--admin-white);
        }

        .admin-about-page .admin-about-btn-primary:hover {
          background: var(--admin-green-soft);
        }

        .admin-about-page .admin-about-btn-secondary {
          background: transparent;

          border: 1px solid var(--admin-border);

          color: var(--admin-green);
        }

        .admin-about-page .admin-about-btn-secondary:hover {
          background: var(--admin-light);

          border-color: var(--admin-green);
        }


        /* =====================================================
           HERO VISUAL
        ===================================================== */

        .admin-about-page .admin-about-visual {
          min-height: 500px;

          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          background: var(--admin-green);

          border-radius: 28px;

          overflow: hidden;
        }

        .admin-about-page .admin-about-visual::before {
          content: "";

          position: absolute;

          width: 370px;
          height: 370px;

          border: 1px solid rgba(193, 200, 196, 0.25);

          border-radius: 50%;
        }

        .admin-about-page .admin-about-visual::after {
          content: "";

          position: absolute;

          width: 250px;
          height: 250px;

          border: 1px solid rgba(193, 200, 196, 0.2);

          border-radius: 50%;
        }


        /* CENTER */

        .admin-about-page .admin-orbit-center {
          position: absolute;

          left: 50%;
          top: 50%;

          transform: translate(-50%, -50%);

          width: 135px;
          height: 135px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          background: var(--admin-white);

          color: var(--admin-green);

          border-radius: 50%;

          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);

          z-index: 3;
        }

        .admin-about-page .admin-orbit-center .material-symbols-outlined {
          font-size: 28px;

          margin-bottom: 5px;
        }

        .admin-about-page .admin-orbit-center strong {
          font-family: var(--font-display);

          font-size: 1rem;
        }

        .admin-about-page .admin-orbit-center small {
          margin-top: 3px;

          color: var(--admin-muted);

          font-size: 0.58rem;
        }


        /* ORBIT ITEMS */

        .admin-about-page .admin-orbit-item {
          position: absolute;

          width: 105px;
          height: 105px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 6px;

          background: rgba(255, 255, 255, 0.08);

          border: 1px solid rgba(193, 200, 196, 0.3);

          border-radius: 50%;

          color: var(--admin-white);

          font-size: 0.65rem;
          font-weight: 700;

          z-index: 2;
        }

        .admin-about-page .admin-orbit-item .material-symbols-outlined {
          color: var(--admin-border);

          font-size: 22px;
        }

        .admin-about-page .admin-orbit-user {
          left: 0;
          top: 50%;

          transform: translateY(-50%);
        }

        .admin-about-page .admin-orbit-remaker {
          right: 0;
          top: 50%;

          transform: translateY(-50%);
        }

        .admin-about-page .admin-orbit-admin {
          left: 50%;
          bottom: 0;

          transform: translateX(-50%);
        }


        /* =====================================================
           INTRO
        ===================================================== */

        .admin-about-page .admin-about-intro {
          padding: 110px 0;

          background: var(--admin-white);

          border-top: 1px solid var(--admin-border);
          border-bottom: 1px solid var(--admin-border);
        }

        .admin-about-page .admin-about-intro-grid {
          display: grid;

          grid-template-columns: 0.9fr 1.1fr;

          gap: 100px;
        }

        .admin-about-page .admin-about-intro h2 {
          margin: 10px 0 0;

          color: var(--admin-green);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-page .admin-about-intro-text p {
          max-width: 650px;

          margin: 0 0 18px;

          color: var(--admin-muted);

          font-size: 0.88rem;

          line-height: 1.8;
        }


        /* =====================================================
           ROLES
        ===================================================== */

        .admin-about-page .admin-about-roles {
          padding: 110px 0;

          background: var(--admin-background);
        }

        .admin-about-page .admin-about-heading {
          display: flex;

          align-items: flex-end;
          justify-content: space-between;

          gap: 50px;

          margin-bottom: 45px;
        }

        .admin-about-page .admin-about-heading h2 {
          margin: 10px 0 0;

          color: var(--admin-green);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 3.7rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .admin-about-page .admin-about-heading > p {
          max-width: 500px;

          color: var(--admin-muted);

          font-size: 0.85rem;

          line-height: 1.7;
        }


        /* ROLE CARDS */

        .admin-about-page .admin-role-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 18px;
        }

        .admin-about-page .admin-role-card {
          min-height: 300px;

          padding: 28px;

          position: relative;

          background: var(--admin-white);

          border: 1px solid var(--admin-border);

          border-radius: 20px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .admin-about-page .admin-role-card:hover {
          transform: translateY(-5px);

          border-color: var(--admin-green);

          box-shadow: 0 18px 40px rgba(8, 39, 31, 0.08);
        }

        .admin-about-page .admin-role-number {
          position: absolute;

          top: 25px;
          right: 27px;

          color: var(--admin-border);

          font-size: 0.7rem;
          font-weight: 800;
        }

        .admin-about-page .admin-role-icon {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 55px;

          background: rgba(8, 39, 31, 0.07);

          color: var(--admin-green);

          border-radius: 14px;
        }

        .admin-about-page .admin-role-icon .material-symbols-outlined {
          font-size: 22px;
        }

        .admin-about-page .admin-role-card h3 {
          margin-bottom: 9px;

          color: var(--admin-green);

          font-family: var(--font-display);

          font-size: 1.25rem;
        }

        .admin-about-page .admin-role-card p {
          color: var(--admin-muted);

          font-size: 0.75rem;

          line-height: 1.7;
        }


        /* =====================================================
           ADMIN FEATURES
        ===================================================== */

        .admin-about-page .admin-features {
          padding: 110px 0;

          background: var(--admin-light);
        }

        .admin-about-page .admin-feature-grid {
          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 15px;
        }

        .admin-about-page .admin-feature-card {
          padding: 25px;

          background: var(--admin-white);

          border: 1px solid var(--admin-border);

          border-radius: 18px;
        }

        .admin-about-page .admin-feature-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 25px;

          background: var(--admin-green);

          color: var(--admin-white);

          border-radius: 12px;
        }

        .admin-about-page .admin-feature-icon .material-symbols-outlined {
          font-size: 20px;
        }

        .admin-about-page .admin-feature-card h3 {
          margin-bottom: 8px;

          color: var(--admin-green);

          font-family: var(--font-display);

          font-size: 1rem;
        }

        .admin-about-page .admin-feature-card p {
          color: var(--admin-muted);

          font-size: 0.7rem;

          line-height: 1.65;
        }


        /* =====================================================
           MISSION
        ===================================================== */

        .admin-about-page .admin-mission {
          padding: 100px 0;

          background: var(--admin-green);
        }

        .admin-about-page .admin-mission-card {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 60px;

          padding: 55px;

          background: var(--admin-green-soft);

          border: 1px solid rgba(193, 200, 196, 0.2);

          border-radius: 26px;
        }

        .admin-about-page .admin-mission .admin-about-eyebrow {
          color: var(--admin-border);
        }

        .admin-about-page .admin-mission .admin-about-eyebrow::before {
          background: var(--admin-border);
        }

        .admin-about-page .admin-mission h2 {
          margin: 12px 0 15px;

          color: var(--admin-white);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-page .admin-mission p {
          max-width: 600px;

          color: rgba(255, 255, 255, 0.62);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        .admin-about-page .admin-mission-circle {
          width: 180px;
          height: 180px;

          display: flex;

          flex-direction: column;

          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          background: var(--admin-white);

          color: var(--admin-green);

          border-radius: 50%;

          text-align: center;
        }

        .admin-about-page .admin-mission-circle .material-symbols-outlined {
          font-size: 27px;

          margin-bottom: 8px;
        }

        .admin-about-page .admin-mission-circle strong {
          font-family: var(--font-display);

          font-size: 1rem;
        }

        .admin-about-page .admin-mission-circle span:last-child {
          margin-top: 3px;

          color: var(--admin-muted);

          font-size: 0.62rem;
        }


        /* =====================================================
           FINAL CTA
        ===================================================== */

        .admin-about-page .admin-final {
          padding: 100px 0;

          background: var(--admin-background);
        }

        .admin-about-page .admin-final-inner {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 50px;

          padding: 55px;

          background: var(--admin-maroon);

          border-radius: 26px;
        }

        .admin-about-page .admin-final h2 {
          margin: 10px 0 13px;

          color: var(--admin-white);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 4rem);

          line-height: 0.98;

          letter-spacing: -0.045em;
        }

        .admin-about-page .admin-final p {
          max-width: 550px;

          color: rgba(255, 255, 255, 0.62);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        .admin-about-page .admin-final-btn {
          flex-shrink: 0;

          min-height: 46px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 8px;

          padding: 0 21px;

          background: var(--admin-white);

          border: 1px solid var(--admin-white);

          border-radius: 999px;

          color: var(--admin-green);

          font-size: 0.8rem;

          font-weight: 700;

          text-decoration: none;
        }


        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1050px) {

          .admin-about-page .admin-about-container {
            width: min(100%, calc(100% - 50px));
          }

          .admin-about-page .admin-about-hero-grid {
            gap: 45px;
          }

          .admin-about-page .admin-feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }


        /* =====================================================
           SMALL TABLET
        ===================================================== */

        @media (max-width: 850px) {

          .admin-about-page .admin-about-hero {
            padding: 100px 0 70px;
          }

          .admin-about-page .admin-about-hero-grid {
            grid-template-columns: 1fr;
          }

          .admin-about-page .admin-about-visual {
            max-width: 650px;

            width: 100%;

            margin: auto;
          }

          .admin-about-page .admin-about-intro-grid {
            grid-template-columns: 1fr;

            gap: 35px;
          }

          .admin-about-page .admin-role-grid {
            grid-template-columns: 1fr 1fr;
          }

          .admin-about-page .admin-role-card:last-child {
            grid-column: 1 / -1;

            max-width: 50%;

            width: 100%;

            margin: auto;
          }

          .admin-about-page .admin-mission-card,
          .admin-about-page .admin-final-inner {
            flex-direction: column;

            align-items: flex-start;
          }
        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 650px) {

          .admin-about-page .admin-about-container {
            width: calc(100% - 32px);
          }

          .admin-about-page .admin-about-hero {
            min-height: auto;

            padding: 95px 0 60px;
          }

          .admin-about-page .admin-about-hero h1 {
            font-size: clamp(2.8rem, 13vw, 4rem);
          }

          .admin-about-page .admin-about-hero-description {
            font-size: 0.82rem;
          }

          .admin-about-page .admin-about-actions {
            flex-direction: column;
          }

          .admin-about-page .admin-about-actions .admin-about-btn {
            width: 100%;
          }

          .admin-about-page .admin-about-visual {
            min-height: 380px;

            border-radius: 20px;
          }

          .admin-about-page .admin-about-visual::before {
            width: 290px;
            height: 290px;
          }

          .admin-about-page .admin-about-visual::after {
            width: 200px;
            height: 200px;
          }

          .admin-about-page .admin-orbit-center {
            width: 115px;
            height: 115px;
          }

          .admin-about-page .admin-orbit-item {
            width: 85px;
            height: 85px;
          }

          .admin-about-page .admin-about-intro,
          .admin-about-page .admin-about-roles,
          .admin-about-page .admin-features {
            padding: 70px 0;
          }

          .admin-about-page .admin-about-intro h2,
          .admin-about-page .admin-about-heading h2 {
            font-size: 2.35rem;
          }

          .admin-about-page .admin-about-heading {
            flex-direction: column;

            align-items: flex-start;

            gap: 18px;

            margin-bottom: 30px;
          }

          .admin-about-page .admin-role-grid,
          .admin-about-page .admin-feature-grid {
            grid-template-columns: 1fr;
          }

          .admin-about-page .admin-role-card:last-child {
            grid-column: auto;

            max-width: none;

            margin: 0;
          }

          .admin-about-page .admin-role-card {
            min-height: auto;
          }

          .admin-about-page .admin-mission {
            padding: 70px 0;
          }

          .admin-about-page .admin-mission-card,
          .admin-about-page .admin-final-inner {
            padding: 32px 24px;

            border-radius: 20px;
          }

          .admin-about-page .admin-mission h2,
          .admin-about-page .admin-final h2 {
            font-size: 2.35rem;
          }

          .admin-about-page .admin-mission-circle {
            width: 150px;
            height: 150px;
          }

          .admin-about-page .admin-final {
            padding: 70px 0;
          }

          .admin-about-page .admin-final-btn {
            width: 100%;
          }
        }


        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        .admin-about-page a:focus-visible,
        .admin-about-page button:focus-visible {
          outline: 2px solid var(--admin-border);

          outline-offset: 3px;
        }


        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .admin-about-page *,
          .admin-about-page *::before,
          .admin-about-page *::after {
            animation-duration: 0.01ms !important;

            animation-iteration-count: 1 !important;

            transition-duration: 0.01ms !important;
          }
        }

      `}</style>


      {/* =====================================================
          PAGE CONTENT
      ===================================================== */}

      <main>

        {/* HERO */}
        <section className="admin-about-hero">
          <div className="admin-about-container">

            <div className="admin-about-hero-grid">

              <div>

                <span className="admin-about-eyebrow">
                  About ReOrbit
                </span>

                <h1>
                  Managing a better
                  <br />
                  <em>second orbit.</em>
                </h1>

                <p className="admin-about-hero-description">
                  ReOrbit connects users, ReMakers and administration to give
                  reusable items a more meaningful second life. The admin
                  platform keeps this entire journey organized, trusted and
                  measurable.
                </p>

                <div className="admin-about-actions">

                  <a
                    href="/admin"
                    className="admin-about-btn admin-about-btn-primary"
                  >
                    Go to Dashboard

                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>

                  <a
                    href="/admin/users"
                    className="admin-about-btn admin-about-btn-secondary"
                  >
                    View Users
                  </a>

                </div>

              </div>


              {/* ORBIT VISUAL */}
              <div className="admin-about-visual">

                <div className="admin-orbit-center">

                  <span className="material-symbols-outlined">
                    eco
                  </span>

                  <strong>ReOrbit</strong>

                  <small>
                    Circular by design
                  </small>

                </div>


                <div className="admin-orbit-item admin-orbit-user">

                  <span className="material-symbols-outlined">
                    person
                  </span>

                  <span>
                    Users
                  </span>

                </div>


                <div className="admin-orbit-item admin-orbit-remaker">

                  <span className="material-symbols-outlined">
                    handyman
                  </span>

                  <span>
                    ReMakers
                  </span>

                </div>


                <div className="admin-orbit-item admin-orbit-admin">

                  <span className="material-symbols-outlined">
                    admin_panel_settings
                  </span>

                  <span>
                    Admin
                  </span>

                </div>

              </div>

            </div>

          </div>
        </section>


        {/* INTRO */}
        <section className="admin-about-intro">

          <div className="admin-about-container">

            <div className="admin-about-intro-grid">

              <div>

                <span className="admin-about-eyebrow">
                  What we do
                </span>

                <h2>
                  One platform.
                  <br />
                  Three connected roles.
                </h2>

              </div>


              <div className="admin-about-intro-text">

                <p>
                  ReOrbit is built around a simple idea: things that still
                  have value should have another opportunity before being
                  forgotten.
                </p>

                <p>
                  Users provide the items, ReMakers give them new purpose,
                  and administration keeps the entire ecosystem connected.
                  Together, these roles create a circular marketplace built
                  around reuse and creativity.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ROLES */}
        <section className="admin-about-roles">

          <div className="admin-about-container">

            <div className="admin-about-heading">

              <div>

                <span className="admin-about-eyebrow">
                  ReOrbit ecosystem
                </span>

                <h2>
                  Everyone has a role
                  <br />
                  in the orbit.
                </h2>

              </div>

              <p>
                Each role contributes to a different part of the ReOrbit
                journey, creating a connected circular ecosystem.
              </p>

            </div>


            <div className="admin-role-grid">

              {/* USER */}
              <article className="admin-role-card">

                <span className="admin-role-number">
                  01
                </span>

                <div className="admin-role-icon">

                  <span className="material-symbols-outlined">
                    person
                  </span>

                </div>

                <h3>
                  Users
                </h3>

                <p>
                  Users can list reusable items, donate materials and discover new ways to give their belongings a
                  second purpose.
                </p>

              </article>


              {/* REMAKER */}
              <article className="admin-role-card">

                <span className="admin-role-number">
                  02
                </span>

                <div className="admin-role-icon">

                  <span className="material-symbols-outlined">
                    handyman
                  </span>

                </div>

                <h3>
                  ReMakers
                </h3>

                <p>
                  ReMakers discover useful materials, transform them into
                  creative products and sell their finished creations through
                  the ReOrbit ecosystem.
                </p>

              </article>


              {/* ADMIN */}
              <article className="admin-role-card">

                <span className="admin-role-number">
                  03
                </span>

                <div className="admin-role-icon">

                  <span className="material-symbols-outlined">
                    admin_panel_settings
                  </span>

                </div>

                <h3>
                  Admin
                </h3>

                <p>
                  Administration manages users, ReMakers, materials,
                  inventory, listings, logistics and platform activity to
                  keep the ecosystem reliable.
                </p>

              </article>

            </div>

          </div>

        </section>


        {/* ADMIN FEATURES */}
        <section className="admin-features">

          <div className="admin-about-container">

            <div className="admin-about-heading">

              <div>

                <span className="admin-about-eyebrow">
                  Built for management
                </span>

                <h2>
                  Keeping the system
                  <br />
                  moving.
                </h2>

              </div>

              <p>
                The administrative side provides the tools and visibility
                needed to manage ReOrbit effectively.
              </p>

            </div>


            <div className="admin-feature-grid">

              <article className="admin-feature-card">

                <div className="admin-feature-icon">

                  <span className="material-symbols-outlined">
                    inventory_2
                  </span>

                </div>

                <h3>
                  Material Management
                </h3>

                <p>
                  Manage donated, rescued and available materials throughout
                  the platform.
                </p>

              </article>


              <article className="admin-feature-card">

                <div className="admin-feature-icon">

                  <span className="material-symbols-outlined">
                    verified
                  </span>

                </div>

                <h3>
                  Community Verification
                </h3>

                <p>
                  Maintain a trusted environment for users and ReMakers.
                </p>

              </article>


              <article className="admin-feature-card">

                <div className="admin-feature-icon">

                  <span className="material-symbols-outlined">
                    local_shipping
                  </span>

                </div>

                <h3>
                  Pickup & Logistics
                </h3>

                <p>
                  Coordinate pickups and help keep reusable materials moving.
                </p>

              </article>


              <article className="admin-feature-card">

                <div className="admin-feature-icon">

                  <span className="material-symbols-outlined">
                    monitoring
                  </span>

                </div>

                <h3>
                  Platform Insights
                </h3>

                <p>
                  Understand platform activity through useful administrative
                  information and analytics.
                </p>

              </article>

            </div>

          </div>

        </section>


        {/* MISSION */}
        <section className="admin-mission">

          <div className="admin-about-container">

            <div className="admin-mission-card">

              <div>

                <span className="admin-about-eyebrow">
                  Our direction
                </span>

                <h2>
                  Keep useful things
                  <br />
                  moving forward.
                </h2>

                <p>
                  ReOrbit makes circular participation easier by connecting
                  every stage of an item's journey — from the person giving
                  it away to the maker transforming it and the person giving
                  it a new home.
                </p>

              </div>


              <div className="admin-mission-circle">

                <span className="material-symbols-outlined">
                  autorenew
                </span>

                <strong>
                  Second life.
                </strong>

                <span>
                  Second opportunity.
                </span>

              </div>

            </div>

          </div>

        </section>


        {/* FINAL CTA */}
        <section className="admin-final">

          <div className="admin-about-container">

            <div className="admin-final-inner">

              <div>

                <span className="admin-about-eyebrow">
                  Administration at the core
                </span>

                <h2>
                  Ready to keep
                  <br />
                  ReOrbit moving?
                </h2>

                <p>
                  Manage the platform, understand its activity and help more
                  items find their next orbit.
                </p>

              </div>


              <a
                href="/admin"
                className="admin-final-btn"
              >
                Open Dashboard

                <span className="material-symbols-outlined">
                  arrow_forward
                </span>
              </a>

            </div>

          </div>

        </section>

      </main>

      <AdminFooter />
    </div>
  );
}