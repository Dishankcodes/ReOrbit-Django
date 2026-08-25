import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function About() {
  return (
    <>
      <style>
        {`
        /* =====================================================
           ABOUT PAGE
        ===================================================== */

        .about-page {
          background: var(--background);
          color: var(--foreground);
          min-height: 100vh;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .about-hero {
          padding: 145px 0 95px;
        }

        .about-hero-inner {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .about-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 8px 14px;

          border: 1px solid var(--border);
          border-radius: 999px;

          background: var(--secondary);
          color: var(--primary);

          font-size: 0.7rem;
          font-weight: 700;

          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .about-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .about-hero h1 {
          margin: 25px auto 22px;

          max-width: 850px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);
          line-height: 0.98;

          letter-spacing: -0.055em;
        }

        .about-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .about-hero p {
          max-width: 690px;
          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 1rem;
          line-height: 1.75;
        }

        /* =====================================================
           INTRO
        ===================================================== */

        .about-intro {
          padding: 35px 0 100px;
        }

        .about-intro-grid {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 80px;

          align-items: center;
        }

        .about-intro h2 {
          margin-bottom: 20px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1.03;

          letter-spacing: -0.045em;
        }

        .about-intro h2 span {
          color: var(--leaf);
        }

        .about-intro-copy p {
          color: var(--muted-foreground);

          font-size: 0.95rem;
          line-height: 1.8;

          margin-bottom: 16px;
        }

        .about-intro-card {
          min-height: 380px;

          padding: 38px;

          display: flex;
          flex-direction: column;
          justify-content: flex-end;

          border-radius: 28px;

          background:
            radial-gradient(
              circle at 80% 20%,
              rgba(107, 175, 133, 0.25),
              transparent 35%
            ),
            linear-gradient(
              145deg,
              #e4ede7,
              #d9e8de
            );

          border: 1px solid var(--border);

          position: relative;
          overflow: hidden;
        }

        .about-orbit-icon {
          width: 64px;
          height: 64px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: rgba(255, 255, 255, 0.72);

          color: var(--primary);

          margin-bottom: auto;
        }

        .about-orbit-icon .material-symbols-outlined {
          font-size: 31px;
        }

        .about-intro-card h3 {
          margin-bottom: 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.7rem;
        }

        .about-intro-card p {
          max-width: 420px;

          color: var(--muted-foreground);

          font-size: 0.85rem;
          line-height: 1.65;
        }

        /* =====================================================
           VALUES
        ===================================================== */

        .about-values {
          padding: 100px 0;

          background: var(--secondary);
        }

        .about-section-heading {
          max-width: 700px;

          margin-bottom: 48px;
        }

        .about-section-heading .eyebrow {
          display: inline-block;

          color: var(--leaf);

          font-size: 0.7rem;
          font-weight: 800;

          letter-spacing: 0.12em;
          text-transform: uppercase;

          margin-bottom: 12px;
        }

        .about-section-heading h2 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1.05;

          letter-spacing: -0.045em;
        }

        .about-values-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 20px;
        }

        .about-value-card {
          background: var(--card);

          border: 1.5px solid var(--border);

          border-radius: 22px;

          padding: 30px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .about-value-card:hover {
          transform: translateY(-5px);

          box-shadow:
            0 14px 35px rgba(42, 77, 58, 0.1);
        }

        .about-value-icon {
          width: 48px;
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--secondary);

          color: var(--primary);

          margin-bottom: 25px;
        }

        .about-value-icon .material-symbols-outlined {
          font-size: 23px;
        }

        .about-value-card h3 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.3rem;

          margin-bottom: 10px;
        }

        .about-value-card p {
          color: var(--muted-foreground);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        /* =====================================================
           HOW IT WORKS
        ===================================================== */

        .about-process {
          padding: 105px 0;
        }

        .about-process-heading {
          text-align: center;

          max-width: 700px;

          margin: 0 auto 55px;
        }

        .about-process-heading h2 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.4rem);

          line-height: 1.05;

          letter-spacing: -0.045em;
        }

        .about-process-heading p {
          margin-top: 15px;

          color: var(--muted-foreground);

          font-size: 0.92rem;
          line-height: 1.7;
        }

        .about-process-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 20px;
        }

        .about-process-card {
          padding: 30px;

          border: 1.5px solid var(--border);

          border-radius: 22px;

          background: var(--card);
        }

        .about-step {
          color: var(--leaf);

          font-size: 0.7rem;
          font-weight: 800;

          letter-spacing: 0.1em;
        }

        .about-process-card h3 {
          margin: 30px 0 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.35rem;
        }

        .about-process-card p {
          color: var(--muted-foreground);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        /* =====================================================
           FINAL CTA
        ===================================================== */

        .about-cta {
          padding: 0 0 100px;
        }

        .about-cta-box {
          padding: 55px;

          border-radius: 28px;

          background:
            linear-gradient(
              135deg,
              #2a4d3a,
              #1e3d2f
            );

          color: white;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 40px;
        }

        .about-cta-box h2 {
          color: white;

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          line-height: 1.05;
        }

        .about-cta-box p {
          margin-top: 10px;

          color: rgba(255, 255, 255, 0.7);

          font-size: 0.85rem;
        }

        .about-cta-button {
          flex-shrink: 0;

          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding: 13px 22px;

          border-radius: 999px;

          background: white;

          color: var(--primary);

          font-size: 0.82rem;
          font-weight: 700;

          text-decoration: none;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 900px) {

          .about-intro-grid {
            grid-template-columns: 1fr;

            gap: 45px;
          }

          .about-values-grid,
          .about-process-grid {
            grid-template-columns: 1fr 1fr;
          }

          .about-cta-box {
            padding: 40px;
          }
        }

        @media (max-width: 700px) {

          .about-hero {
            padding: 120px 0 70px;
          }

          .about-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .about-hero p {
            font-size: 0.9rem;
          }

          .about-intro {
            padding: 30px 0 75px;
          }

          .about-intro-card {
            min-height: 300px;

            padding: 26px;
          }

          .about-values,
          .about-process {
            padding: 75px 0;
          }

          .about-values-grid,
          .about-process-grid {
            grid-template-columns: 1fr;
          }

          .about-section-heading {
            margin-bottom: 35px;
          }

          .about-cta {
            padding-bottom: 70px;
          }

          .about-cta-box {
            flex-direction: column;

            align-items: flex-start;

            padding: 35px 25px;

            border-radius: 22px;
          }

          .about-cta-button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {

          .about-hero {
            padding-top: 105px;
          }

          .about-hero h1 {
            font-size: 2.65rem;
          }

          .about-intro h2,
          .about-section-heading h2,
          .about-process-heading h2 {
            font-size: 2.2rem;
          }

          .about-value-card,
          .about-process-card {
            padding: 24px;
          }
        }
      `}
      </style>

      <div className="about-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="about-hero">
          <div className="container about-hero-inner">
            <span className="about-badge">
              <span className="material-symbols-outlined">eco</span>
              About ReOrbit
            </span>

            <h1>
              Give what you have
              <br />
              <em>another orbit.</em>
            </h1>

            <p>
              ReOrbit is a circular platform that helps people sell, donate and
              discover reusable items while connecting suitable materials with
              ReMakers who can give them a new purpose.
            </p>
          </div>
        </section>

        {/* =====================================================
            INTRO
        ===================================================== */}

        <section className="about-intro">
          <div className="container about-intro-grid">
            <div className="about-intro-copy">
              <h2>
                One item can have
                <span> more than one future.</span>
              </h2>

              <p>
                Things we no longer use do not necessarily lose their value. A
                piece of furniture, electronic item, household object or other
                reusable material may still be useful to someone else.
              </p>

              <p>
                ReOrbit creates a connected space where users can list items
                they no longer need, discover things they want to buy, or donate
                useful items instead of leaving them unused.
              </p>

              <p>
                When an item needs more than a new owner, suitable items and
                materials can move through ReOrbit's inventory and refurbishment
                process or reach ReMakers who can transform them into something
                new.
              </p>
            </div>

            <div className="about-intro-card">
              <div className="about-orbit-icon">
                <span className="material-symbols-outlined">autorenew</span>
              </div>

              <div>
                <h3>Keep the orbit moving.</h3>

                <p>
                  Sell something you no longer need. Donate it. Find something
                  useful. Or let a ReMaker transform suitable materials into
                  something new.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            VALUES
        ===================================================== */}

        <section className="about-values">
          <div className="container">
            <div className="about-section-heading">
              <span className="eyebrow">What ReOrbit brings together</span>

              <h2>More than a marketplace. A connected reuse ecosystem.</h2>
            </div>

            <div className="about-values-grid">
              {/* VALUE 1 */}

              <div className="about-value-card">
                <div className="about-value-icon">
                  <span className="material-symbols-outlined">sell</span>
                </div>

                <h3>Give items a new owner</h3>

                <p>
                  Users can list reusable items for sale, allowing someone else
                  to discover and purchase things that still have value.
                </p>
              </div>

              {/* VALUE 2 */}

              <div className="about-value-card">
                <div className="about-value-icon">
                  <span className="material-symbols-outlined">handyman</span>
                </div>

                <h3>Enable creative reuse</h3>

                <p>
                  ReMakers can discover suitable materials, transform them into
                  new creations and offer those finished products through the
                  ReOrbit marketplace.
                </p>
              </div>

              {/* VALUE 3 */}

              <div className="about-value-card">
                <div className="about-value-icon">
                  <span className="material-symbols-outlined">analytics</span>
                </div>

                <h3>Make impact visible</h3>

                <p>
                  ReOrbit connects meaningful activity with Orbit Points,
                  vouchers, badges, certificates and impact information through
                  the user dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PROCESS
        ===================================================== */}

        <section className="about-process">
          <div className="container">
            <div className="about-process-heading">
              <h2>One platform. Multiple paths forward.</h2>

              <p>
                ReOrbit connects users, ReMakers and platform management around
                the lifecycle of reusable items.
              </p>
            </div>

            <div className="about-process-grid">
              {/* STEP 1 */}

              <div className="about-process-card">
                <span className="about-step">01 — LIST & BUY</span>

                <h3>Put useful things back into circulation.</h3>

                <p>
                  Users can list reusable items with their details, condition
                  and images. Other users can discover available products and
                  purchase items that match their needs.
                </p>
              </div>

              {/* STEP 2 */}

              <div className="about-process-card">
                <span className="about-step">02 — DONATE & MANAGE</span>

                <h3>Give an item another route.</h3>

                <p>
                  Items can also be donated through ReOrbit. Suitable donations
                  can move through pickup, warehouse and inventory management
                  before continuing toward reuse or refurbishment.
                </p>
              </div>

              {/* STEP 3 */}

              <div className="about-process-card">
                <span className="about-step">03 — REMAKE & REORBIT</span>

                <h3>Turn materials into something new.</h3>

                <p>
                  Suitable materials can reach ReMakers, who can repair,
                  redesign or transform them into new products that can return
                  to the marketplace.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
        ===================================================== */}

        <section className="about-cta">
          <div className="container">
            <div className="about-cta-box">
              <div>
                <h2>Have something that deserves another chance?</h2>

                <p>
                  Sell it, donate it, or help give it a new purpose through
                  ReOrbit.
                </p>
              </div>

              <a href="/auth" className="about-cta-button">
                Get started
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
