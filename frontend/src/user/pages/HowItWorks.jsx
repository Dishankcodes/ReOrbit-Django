import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function HowItWorks() {
  return (
    <>
      <style>{`
        /* =====================================================
           HOW IT WORKS
        ===================================================== */

        .how-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .how-hero {
          padding: 145px 0 90px;
          text-align: center;
        }

        .how-hero-inner {
          max-width: 850px;
          margin: 0 auto;
        }

        .how-badge {
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

        .how-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .how-hero h1 {
          margin: 25px auto 20px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .how-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .how-hero p {
          max-width: 650px;
          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 1rem;
          line-height: 1.75;
        }

        /* =====================================================
           PATHS
        ===================================================== */

        .how-paths {
          padding: 25px 0 100px;
        }

        .how-section-heading {
          max-width: 700px;
          margin: 0 auto 50px;
          text-align: center;
        }

        .how-eyebrow {
          display: inline-block;

          margin-bottom: 12px;

          color: var(--leaf);

          font-size: 0.7rem;
          font-weight: 800;

          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .how-section-heading h2 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1.05;
          letter-spacing: -0.045em;
        }

        .how-section-heading p {
          margin-top: 14px;

          color: var(--muted-foreground);

          font-size: 0.9rem;
          line-height: 1.7;
        }

        .how-path-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 20px;
        }

        .how-path-card {
          padding: 30px;

          background: var(--card);

          border: 1.5px solid var(--border);
          border-radius: 24px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .how-path-card:hover {
          transform: translateY(-5px);

          box-shadow:
            0 14px 35px rgba(42, 77, 58, 0.1);
        }

        .how-path-icon {
          width: 52px;
          height: 52px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 25px;

          border-radius: 50%;

          background: var(--secondary);
          color: var(--primary);
        }

        .how-path-icon .material-symbols-outlined {
          font-size: 25px;
        }

        .how-path-card h3 {
          margin-bottom: 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.35rem;
        }

        .how-path-card p {
          color: var(--muted-foreground);

          font-size: 0.82rem;
          line-height: 1.7;
        }

        /* =====================================================
           STEPS
        ===================================================== */

        .how-steps {
          padding: 100px 0;

          background: var(--secondary);
        }

        .how-steps-heading {
          max-width: 700px;

          margin-bottom: 50px;
        }

        .how-steps-heading h2 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.4rem);

          line-height: 1.05;
          letter-spacing: -0.045em;
        }

        .how-steps-heading p {
          margin-top: 14px;

          color: var(--muted-foreground);

          font-size: 0.9rem;
          line-height: 1.7;
        }

        .how-step-list {
          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 18px;
        }

        .how-step-card {
          padding: 28px;

          background: var(--card);

          border: 1.5px solid var(--border);
          border-radius: 22px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .how-step-card:hover {
          transform: translateY(-4px);

          box-shadow:
            0 12px 30px rgba(42, 77, 58, 0.08);
        }

        .how-step-number {
          display: flex;

          align-items: center;
          justify-content: center;

          width: 38px;
          height: 38px;

          margin-bottom: 28px;

          border-radius: 50%;

          background: var(--primary);
          color: var(--primary-foreground);

          font-size: 0.7rem;
          font-weight: 800;
        }

        .how-step-card h3 {
          margin-bottom: 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.15rem;
        }

        .how-step-card p {
          color: var(--muted-foreground);

          font-size: 0.78rem;
          line-height: 1.7;
        }

        /* =====================================================
           SIMPLE FLOW
        ===================================================== */

        .how-flow {
          padding: 105px 0;
        }

        .how-flow-box {
          padding: 50px;

          border: 1px solid var(--border);
          border-radius: 28px;

          background: var(--card);
        }

        .how-flow-heading {
          text-align: center;

          max-width: 650px;

          margin: 0 auto 45px;
        }

        .how-flow-heading h2 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          letter-spacing: -0.04em;
        }

        .how-flow-heading p {
          margin-top: 12px;

          color: var(--muted-foreground);

          font-size: 0.85rem;
        }

        .how-flow-line {
          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 15px;
        }

        .how-flow-item {
          text-align: center;
        }

        .how-flow-icon {
          width: 58px;
          height: 58px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin: 0 auto 15px;

          border-radius: 50%;

          background: var(--secondary);
          color: var(--primary);
        }

        .how-flow-icon .material-symbols-outlined {
          font-size: 25px;
        }

        .how-flow-item strong {
          display: block;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1rem;
        }

        .how-flow-item span {
          display: block;

          margin-top: 5px;

          color: var(--muted-foreground);

          font-size: 0.7rem;
        }

        /* =====================================================
           USER SUPPORT
        ===================================================== */

        .how-support {
          padding: 0 0 105px;
        }

        .how-support-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 20px;
        }

        .how-support-card {
          padding: 28px;

          border: 1px solid var(--border);
          border-radius: 22px;

          background: var(--secondary);
        }

        .how-support-icon {
          width: 45px;
          height: 45px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 20px;

          border-radius: 50%;

          background: var(--card);
          color: var(--primary);
        }

        .how-support-icon .material-symbols-outlined {
          font-size: 21px;
        }

        .how-support-card h3 {
          margin-bottom: 9px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.15rem;
        }

        .how-support-card p {
          color: var(--muted-foreground);

          font-size: 0.78rem;
          line-height: 1.7;
        }

        /* =====================================================
           CTA
        ===================================================== */

        .how-cta {
          padding: 0 0 100px;
        }

        .how-cta-box {
          padding: 55px;

          border-radius: 28px;

          background:
            linear-gradient(
              135deg,
              #2a4d3a,
              #1e3d2f
            );

          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 40px;
        }

        .how-cta-box h2 {
          color: white;

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          line-height: 1.05;
        }

        .how-cta-box p {
          margin-top: 10px;

          color: rgba(255,255,255,0.7);

          font-size: 0.85rem;
        }

        .how-cta-button {
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

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .how-cta-button:hover {
          transform: translateY(-2px);
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1000px) {

          .how-step-list {
            grid-template-columns: repeat(2, 1fr);
          }

          .how-flow-line {
            grid-template-columns: repeat(2, 1fr);

            gap: 30px;
          }

          .how-support-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 850px) {

          .how-path-grid {
            grid-template-columns: 1fr;
          }

          .how-support-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {

          .how-hero {
            padding: 120px 0 65px;
          }

          .how-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .how-hero p {
            font-size: 0.88rem;
          }

          .how-paths,
          .how-steps,
          .how-flow {
            padding: 75px 0;
          }

          .how-support {
            padding-bottom: 75px;
          }

          .how-section-heading,
          .how-steps-heading {
            margin-bottom: 35px;
          }

          .how-step-list {
            grid-template-columns: 1fr;
          }

          .how-flow-box {
            padding: 30px 20px;
          }

          .how-flow-line {
            grid-template-columns: 1fr 1fr;
          }

          .how-cta {
            padding-bottom: 70px;
          }

          .how-cta-box {
            flex-direction: column;

            align-items: flex-start;

            padding: 35px 25px;

            border-radius: 22px;
          }

          .how-cta-button {
            width: 100%;

            justify-content: center;
          }
        }

        @media (max-width: 480px) {

          .how-hero {
            padding-top: 105px;
          }

          .how-hero h1 {
            font-size: 2.65rem;
          }

          .how-flow-line {
            grid-template-columns: 1fr;
          }

          .how-path-card,
          .how-step-card,
          .how-support-card {
            padding: 24px;
          }
        }
      `}</style>

      <div className="how-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="how-hero">
          <div className="container how-hero-inner">
            <span className="how-badge">
              <span className="material-symbols-outlined">autorenew</span>
              How ReOrbit Works
            </span>

            <h1>
              One item.
              <em> More possibilities.</em>
            </h1>

            <p>
              ReOrbit makes it simple to give useful things another chance —
              whether you're selling, donating, exchanging, or discovering
              something that deserves a place in your life.
            </p>
          </div>
        </section>

        {/* =====================================================
            PATHS
        ===================================================== */}

        <section className="how-paths">
          <div className="container">
            <div className="how-section-heading">
              <span className="how-eyebrow">Pick your orbit</span>

              <h2>There is more than one way forward.</h2>

              <p>
                Choose the path that makes the most sense for you and the things
                you already have.
              </p>
            </div>

            <div className="how-path-grid">
              {/* SELL */}

              <div className="how-path-card">
                <div className="how-path-icon">
                  <span className="material-symbols-outlined">sell</span>
                </div>

                <h3>Sell</h3>

                <p>
                  List things you no longer use, add clear photos, condition and
                  details, and connect with someone who wants them.
                </p>
              </div>

              {/* DONATE */}

              <div className="how-path-card">
                <div className="how-path-icon">
                  <span className="material-symbols-outlined">
                    volunteer_activism
                  </span>
                </div>

                <h3>Donate</h3>

                <p>
                  Give useful items another purpose by donating them through
                  ReOrbit. Eligible items can enter the collection and inventory
                  process for further reuse.
                </p>
              </div>

              {/* EXCHANGE */}

              <div className="how-path-card">
                <div className="how-path-icon">
                  <span className="material-symbols-outlined">sync_alt</span>
                </div>

                <h3>Exchange</h3>

                <p>
                  Exchange something you no longer need for something more
                  useful to you, keeping both items in circulation for longer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            STEPS
        ===================================================== */}

        <section className="how-steps">
          <div className="container">
            <div className="how-steps-heading">
              <span className="how-eyebrow">Simple by design</span>

              <h2>From your hands to its next story.</h2>

              <p>
                ReOrbit keeps the process simple while making sure useful items
                can continue moving through the ecosystem.
              </p>
            </div>

            <div className="how-step-list">
              {/* STEP 01 */}

              <div className="how-step-card">
                <div className="how-step-number">01</div>

                <h3>Create a listing</h3>

                <p>
                  Add photos, category, condition and important details about
                  the item you're ready to pass on.
                </p>
              </div>

              {/* STEP 02 */}

              <div className="how-step-card">
                <div className="how-step-number">02</div>

                <h3>Choose its next path</h3>

                <p>
                  Decide whether you want to sell, donate or exchange the item
                  based on what works best for you.
                </p>
              </div>

              {/* STEP 03 */}

              <div className="how-step-card">
                <div className="how-step-number">03</div>

                <h3>Arrange the handover</h3>

                <p>
                  Use the available pickup or handover options to move the item
                  safely toward its next destination.
                </p>
              </div>

              {/* STEP 04 */}

              <div className="how-step-card">
                <div className="how-step-number">04</div>

                <h3>Give it another orbit</h3>

                <p>
                  Your item reaches another user, enters further reuse, or can
                  become useful material for a ReMaker.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CIRCULAR FLOW
        ===================================================== */}

        <section className="how-flow">
          <div className="container">
            <div className="how-flow-box">
              <div className="how-flow-heading">
                <h2>A simple circular journey.</h2>

                <p>
                  Every step helps extend the useful life of things already
                  around us.
                </p>
              </div>

              <div className="how-flow-line">
                {/* HOME */}

                <div className="how-flow-item">
                  <div className="how-flow-icon">
                    <span className="material-symbols-outlined">home</span>
                  </div>

                  <strong>Your home</strong>

                  <span>Something you no longer need</span>
                </div>

                {/* REORBIT */}

                <div className="how-flow-item">
                  <div className="how-flow-icon">
                    <span className="material-symbols-outlined">
                      inventory_2
                    </span>
                  </div>

                  <strong>ReOrbit</strong>

                  <span>List, donate or exchange</span>
                </div>

                {/* NEXT USER */}

                <div className="how-flow-item">
                  <div className="how-flow-icon">
                    <span className="material-symbols-outlined">person</span>
                  </div>

                  <strong>New owner</strong>

                  <span>Someone who needs it</span>
                </div>

                {/* NEW STORY */}

                <div className="how-flow-item">
                  <div className="how-flow-icon">
                    <span className="material-symbols-outlined">autorenew</span>
                  </div>

                  <strong>New purpose</strong>

                  <span>Ready for another orbit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            WHAT HAPPENS NEXT
        ===================================================== */}

        <section className="how-support">
          <div className="container">
            <div className="how-section-heading">
              <span className="how-eyebrow">Beyond the listing</span>

              <h2>ReOrbit keeps the journey connected.</h2>

              <p>
                The platform brings together users, items and ReMakers so useful
                things can continue moving instead of stopping after one
                transaction.
              </p>
            </div>

            <div className="how-support-grid">
              <div className="how-support-card">
                <div className="how-support-icon">
                  <span className="material-symbols-outlined">
                    local_shipping
                  </span>
                </div>

                <h3>Pickup support</h3>

                <p>
                  Where pickup is supported, your item can be collected from the
                  provided location. Applicable pickup charges and availability
                  depend on the item and location.
                </p>
              </div>

              <div className="how-support-card">
                <div className="how-support-icon">
                  <span className="material-symbols-outlined">handshake</span>
                </div>

                <h3>A smoother handover</h3>

                <p>
                  ReOrbit helps connect the person giving an item with the
                  person receiving it, making the transition clearer and easier
                  to follow.
                </p>
              </div>

              <div className="how-support-card">
                <div className="how-support-icon">
                  <span className="material-symbols-outlined">
                    construction
                  </span>
                </div>

                <h3>A second route through ReMakers</h3>

                <p>
                  Items and materials that still have potential can also find
                  their way to ReMakers who can repair, transform or reimagine
                  them into something new.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
        ===================================================== */}

        <section className="how-cta">
          <div className="container">
            <div className="how-cta-box">
              <div>
                <h2>Ready to give something another orbit?</h2>

                <p>Start with something you already have.</p>
              </div>

              <a href="/login" className="how-cta-button">
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
