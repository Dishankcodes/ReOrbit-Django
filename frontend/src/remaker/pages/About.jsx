import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function About() {
  return (
    <>
      <style>{`
        /* =====================================================
           REMAKER ABOUT PAGE
        ===================================================== */

        .rm-about-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .rm-about-hero {
          padding: 145px 0 95px;
        }

        .rm-about-hero-inner {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .rm-about-badge {
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

        .rm-about-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .rm-about-hero h1 {
          margin: 25px auto 22px;

          max-width: 850px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .rm-about-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .rm-about-hero p {
          max-width: 690px;
          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 1rem;
          line-height: 1.75;
        }

        /* =====================================================
           INTRO
        ===================================================== */

        .rm-about-intro {
          padding: 35px 0 100px;
        }

        .rm-about-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .rm-about-intro-copy h2 {
          margin-bottom: 20px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);
          line-height: 1.03;
          letter-spacing: -0.045em;
        }

        .rm-about-intro-copy h2 span {
          color: var(--leaf);
        }

        .rm-about-intro-copy p {
          margin-bottom: 16px;

          color: var(--muted-foreground);

          font-size: 0.95rem;
          line-height: 1.8;
        }

        .rm-about-card {
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

          overflow: hidden;
        }

        .rm-about-icon {
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

        .rm-about-icon .material-symbols-outlined {
          font-size: 31px;
        }

        .rm-about-card h3 {
          margin-bottom: 8px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: 1.7rem;
        }

        .rm-about-card p {
          max-width: 420px;

          color: var(--muted-foreground);

          font-size: 0.85rem;
          line-height: 1.65;
        }

        /* =====================================================
           VALUES
        ===================================================== */

        .rm-about-values {
          padding: 100px 0;
          background: var(--secondary);
        }

        .rm-about-heading {
          max-width: 700px;
          margin-bottom: 48px;
        }

        .rm-about-heading .eyebrow {
          display: inline-block;

          margin-bottom: 12px;

          color: var(--leaf);

          font-size: 0.7rem;
          font-weight: 800;

          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .rm-about-heading h2 {
          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1.05;
          letter-spacing: -0.045em;
        }

        .rm-about-values-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .rm-about-value {
          padding: 30px;

          background: var(--card);

          border: 1.5px solid var(--border);
          border-radius: 22px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .rm-about-value:hover {
          transform: translateY(-5px);

          box-shadow:
            0 14px 35px rgba(42, 77, 58, 0.1);
        }

        .rm-about-value-icon {
          width: 48px;
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 25px;

          border-radius: 50%;

          background: var(--secondary);
          color: var(--primary);
        }

        .rm-about-value-icon .material-symbols-outlined {
          font-size: 23px;
        }

        .rm-about-value h3 {
          margin-bottom: 10px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: 1.3rem;
        }

        .rm-about-value p {
          color: var(--muted-foreground);

          font-size: 0.82rem;
          line-height: 1.7;
        }

        /* =====================================================
           HOW REMAKING WORKS
        ===================================================== */

        .rm-about-process {
          padding: 105px 0;
        }

        .rm-about-process-heading {
          max-width: 700px;
          margin: 0 auto 55px;
          text-align: center;
        }

        .rm-about-process-heading h2 {
          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.4rem);

          line-height: 1.05;
          letter-spacing: -0.045em;
        }

        .rm-about-process-heading p {
          margin-top: 15px;

          color: var(--muted-foreground);

          font-size: 0.92rem;
          line-height: 1.7;
        }

        .rm-about-process-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .rm-about-process-card {
          padding: 30px;

          background: var(--card);

          border: 1.5px solid var(--border);
          border-radius: 22px;
        }

        .rm-about-step {
          color: var(--leaf);

          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .rm-about-process-card h3 {
          margin: 30px 0 10px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: 1.35rem;
        }

        .rm-about-process-card p {
          color: var(--muted-foreground);

          font-size: 0.82rem;
          line-height: 1.7;
        }

        /* =====================================================
           CTA
        ===================================================== */

        .rm-about-cta {
          padding: 0 0 100px;
        }

        .rm-about-cta-box {
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

        .rm-about-cta-box h2 {
          color: white;
          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          line-height: 1.05;
        }

        .rm-about-cta-box p {
          margin-top: 10px;

          color: rgba(255, 255, 255, 0.7);

          font-size: 0.85rem;
        }

        .rm-about-cta-button {
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

          .rm-about-intro-grid {
            grid-template-columns: 1fr;
            gap: 45px;
          }

          .rm-about-values-grid,
          .rm-about-process-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 700px) {

          .rm-about-hero {
            padding: 120px 0 70px;
          }

          .rm-about-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .rm-about-hero p {
            font-size: 0.9rem;
          }

          .rm-about-intro {
            padding: 30px 0 75px;
          }

          .rm-about-card {
            min-height: 300px;
            padding: 26px;
          }

          .rm-about-values,
          .rm-about-process {
            padding: 75px 0;
          }

          .rm-about-values-grid,
          .rm-about-process-grid {
            grid-template-columns: 1fr;
          }

          .rm-about-heading {
            margin-bottom: 35px;
          }

          .rm-about-cta {
            padding-bottom: 70px;
          }

          .rm-about-cta-box {
            flex-direction: column;
            align-items: flex-start;

            padding: 35px 25px;

            border-radius: 22px;
          }

          .rm-about-cta-button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {

          .rm-about-hero {
            padding-top: 105px;
          }

          .rm-about-hero h1 {
            font-size: 2.65rem;
          }

          .rm-about-intro-copy h2,
          .rm-about-heading h2,
          .rm-about-process-heading h2 {
            font-size: 2.2rem;
          }

          .rm-about-value,
          .rm-about-process-card {
            padding: 24px;
          }
        }
      `}</style>

      <div className="rm-about-page">
        <Navbar />

        {/* HERO */}
        <section className="rm-about-hero">
          <div className="container rm-about-hero-inner">
            <span className="rm-about-badge">
              <span className="material-symbols-outlined">handyman</span>
              About ReMakers
            </span>

            <h1>
              Make more from
              <em> what's already here.</em>
            </h1>

            <p>
              ReOrbit gives makers a place to discover rescued materials,
              transform overlooked objects and turn their craft into meaningful
              creations.
            </p>
          </div>
        </section>

        {/* INTRO */}
        <section className="rm-about-intro">
          <div className="container rm-about-intro-grid">
            <div className="rm-about-intro-copy">
              <h2>
                Your next creation starts with <span>what already exists.</span>
              </h2>

              <p>
                ReMakers are designers, artists and craftspeople who see
                possibilities where others might see leftovers.
              </p>

              <p>
                Through ReOrbit, makers can discover rescued materials from
                households and source the pieces they need for their next
                project.
              </p>

              <p>
                They can then document the transformation, showcase the finished
                work and sell it back through the ReOrbit ecosystem.
              </p>
            </div>

            <div className="rm-about-card">
              <div className="rm-about-icon">
                <span className="material-symbols-outlined">construction</span>
              </div>

              <div>
                <h3>Material becomes possibility.</h3>

                <p>
                  From old furniture and recovered timber to overlooked objects,
                  every material can become the starting point for something
                  new.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="rm-about-values">
          <div className="container">
            <div className="rm-about-heading">
              <span className="eyebrow">The ReMaker approach</span>

              <h2>Built around making, not just selling.</h2>
            </div>

            <div className="rm-about-values-grid">
              <div className="rm-about-value">
                <div className="rm-about-value-icon">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>

                <h3>Source smarter</h3>

                <p>
                  Find rescued materials through a dedicated marketplace instead
                  of starting every project with new materials.
                </p>
              </div>

              <div className="rm-about-value">
                <div className="rm-about-value-icon">
                  <span className="material-symbols-outlined">
                    auto_awesome
                  </span>
                </div>

                <h3>Show the transformation</h3>

                <p>
                  Share before-and-after stories so people can see how an
                  overlooked object became something worth keeping.
                </p>
              </div>

              <div className="rm-about-value">
                <div className="rm-about-value-icon">
                  <span className="material-symbols-outlined">storefront</span>
                </div>

                <h3>Sell your work</h3>

                <p>
                  Build your profile, showcase your creations and sell finished
                  pieces to people who value thoughtful making.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="rm-about-process">
          <div className="container">
            <div className="rm-about-process-heading">
              <h2>From rescued material to finished piece.</h2>

              <p>A simple orbit for every creation.</p>
            </div>

            <div className="rm-about-process-grid">
              <div className="rm-about-process-card">
                <span className="rm-about-step">01 — SOURCE</span>

                <h3>Claim rescued material.</h3>

                <p>
                  Discover available materials and select the pieces that fit
                  your next idea.
                </p>
              </div>

              <div className="rm-about-process-card">
                <span className="rm-about-step">02 — MAKE</span>

                <h3>Build something meaningful.</h3>

                <p>
                  Transform the material using your own creative process, skill
                  and point of view.
                </p>
              </div>

              <div className="rm-about-process-card">
                <span className="rm-about-step">03 — SHARE</span>

                <h3>Put the story back in orbit.</h3>

                <p>
                  Showcase the transformation and offer the finished creation to
                  someone new.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rm-about-cta">
          <div className="container">
            <div className="rm-about-cta-box">
              <div>
                <h2>Ready to make something worth keeping?</h2>

                <p>
                  Join the ReMaker community and start building from what
                  already exists.
                </p>
              </div>

              <a href="/remakers/join" className="rm-about-cta-button">
                Become a ReMaker
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
