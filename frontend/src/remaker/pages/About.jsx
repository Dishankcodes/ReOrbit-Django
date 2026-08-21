import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function About() {
  return (
    <>
      <style>{`
/* =========================================================
   REMAKER ABOUT PAGE
   SAME THEME AS REMAKER HOMEPAGE
========================================================= */

.rm-about-page {
  min-height: 100vh;

  background: var(--rm-background);
  color: var(--rm-text);

  overflow-x: hidden;
}


/* =========================================================
   COMMON CONTAINER
========================================================= */

.rm-about-page .container {
  width: min(1280px, calc(100% - 80px));

  margin: 0 auto;
}


/* =========================================================
   HERO
========================================================= */

.rm-about-hero {
  padding: 155px 0 95px;

  background: var(--rm-background);
}


.rm-about-hero-inner {
  max-width: 900px;

  margin: 0 auto;

  text-align: center;
}


/* =========================================================
   BADGE
========================================================= */

.rm-about-badge {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  gap: 8px;

  padding: 9px 14px;

  border: 1px solid var(--rm-border);

  border-radius: 999px;

  background: rgba(193, 200, 196, 0.32);

  color: var(--rm-green);

  font-size: 0.68rem;

  font-weight: 800;

  letter-spacing: 0.12em;

  text-transform: uppercase;
}


.rm-about-badge .material-symbols-outlined {
  font-size: 17px;
}


/* =========================================================
   HERO TITLE
========================================================= */

.rm-about-hero h1 {
  margin: 28px auto 22px;

  max-width: 850px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(3.5rem, 6vw, 5.8rem);

  line-height: 0.96;

  letter-spacing: -0.055em;

  font-weight: 700;
}


.rm-about-hero h1 em {
  color: var(--rm-green);

  font-style: italic;

  font-weight: 600;
}


/* =========================================================
   HERO DESCRIPTION
========================================================= */

.rm-about-hero p {
  max-width: 690px;

  margin: 0 auto;

  color: var(--rm-secondary-dark);

  font-size: 0.95rem;

  line-height: 1.75;
}


/* =========================================================
   INTRO
========================================================= */

.rm-about-intro {
  padding: 35px 0 110px;

  background: var(--rm-background);
}


.rm-about-intro-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 70px;

  align-items: center;
}


/* =========================================================
   INTRO TEXT
========================================================= */

.rm-about-intro-copy {
  max-width: 620px;
}


.rm-about-intro-copy h2 {
  margin-bottom: 22px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(2.3rem, 4vw, 3.7rem);

  line-height: 1;

  letter-spacing: -0.045em;
}


.rm-about-intro-copy h2 span {
  color: var(--rm-green);
}


.rm-about-intro-copy p {
  margin-bottom: 16px;

  color: var(--rm-muted);

  font-size: 0.85rem;

  line-height: 1.8;
}


/* =========================================================
   INTRO FEATURE CARD
========================================================= */

.rm-about-card {
  min-height: 390px;

  padding: 38px;

  display: flex;

  flex-direction: column;

  justify-content: flex-end;

  border-radius: 24px;

  background:
    radial-gradient(
      circle at 80% 20%,
      rgba(8, 39, 31, 0.16),
      transparent 35%
    ),
    linear-gradient(
      145deg,
      #e3e2e0,
      #d9e8de
    );

  border: 1px solid var(--rm-border);

  overflow: hidden;

  box-shadow: 0 20px 45px rgba(39, 8, 9, 0.06);
}


.rm-about-icon {
  width: 64px;
  height: 64px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: rgba(255, 255, 255, 0.75);

  color: var(--rm-green);

  margin-bottom: auto;
}


.rm-about-icon .material-symbols-outlined {
  font-size: 31px;
}


.rm-about-card h3 {
  margin-bottom: 8px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.7rem;
}


.rm-about-card p {
  max-width: 420px;

  color: var(--rm-secondary-dark);

  font-size: 0.82rem;

  line-height: 1.65;
}


/* =========================================================
   VALUES
========================================================= */

.rm-about-values {
  padding: 105px 0;

  background: var(--rm-light);

  border-top: 1px solid var(--rm-border);

  border-bottom: 1px solid var(--rm-border);
}


.rm-about-heading {
  max-width: 700px;

  margin-bottom: 48px;
}


.rm-about-heading .eyebrow {
  display: inline-flex;

  align-items: center;

  gap: 7px;

  margin-bottom: 10px;

  color: var(--rm-green);

  font-size: 0.68rem;

  font-weight: 800;

  letter-spacing: 0.13em;

  text-transform: uppercase;
}


.rm-about-heading .eyebrow::before {
  content: "";

  width: 22px;

  height: 1.5px;

  background: var(--rm-green);
}


.rm-about-heading h2 {
  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(2.2rem, 4vw, 3.7rem);

  line-height: 1;

  letter-spacing: -0.045em;
}


/* =========================================================
   VALUE CARDS
========================================================= */

.rm-about-values-grid {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 18px;
}


.rm-about-value {
  padding: 30px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 20px;

  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}


.rm-about-value:hover {
  transform: translateY(-5px);

  border-color: var(--rm-green);

  box-shadow: 0 18px 40px rgba(39, 8, 9, 0.08);
}


.rm-about-value-icon {
  width: 48px;
  height: 48px;

  display: flex;

  align-items: center;
  justify-content: center;

  margin-bottom: 24px;

  border-radius: 14px;

  background: rgba(8, 39, 31, 0.08);

  color: var(--rm-green);
}


.rm-about-value-icon .material-symbols-outlined {
  font-size: 23px;
}


.rm-about-value h3 {
  margin-bottom: 10px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.3rem;
}


.rm-about-value p {
  color: var(--rm-muted);

  font-size: 0.78rem;

  line-height: 1.7;
}


/* =========================================================
   PROCESS
========================================================= */

.rm-about-process {
  padding: 110px 0;

  background: var(--rm-background);
}


.rm-about-process-heading {
  max-width: 700px;

  margin: 0 auto 55px;

  text-align: center;
}


.rm-about-process-heading h2 {
  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(2.2rem, 4vw, 3.5rem);

  line-height: 1;

  letter-spacing: -0.045em;
}


.rm-about-process-heading p {
  margin-top: 15px;

  color: var(--rm-muted);

  font-size: 0.88rem;

  line-height: 1.7;
}


/* =========================================================
   PROCESS CARDS
========================================================= */

.rm-about-process-grid {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 18px;
}


.rm-about-process-card {
  padding: 30px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 20px;

  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}


.rm-about-process-card:hover {
  transform: translateY(-5px);

  box-shadow: 0 18px 40px rgba(39, 8, 9, 0.08);
}


.rm-about-step {
  color: var(--rm-green);

  font-size: 0.68rem;

  font-weight: 800;

  letter-spacing: 0.1em;
}


.rm-about-process-card h3 {
  margin: 30px 0 10px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.35rem;
}


.rm-about-process-card p {
  color: var(--rm-muted);

  font-size: 0.78rem;

  line-height: 1.7;
}


/* =========================================================
   CTA
   SAME FEEL AS REMAKER HOMEPAGE CTA
========================================================= */

.rm-about-cta {
  padding: 0 0 100px;

  background: var(--rm-background);
}


.rm-about-cta-box {
  padding: 55px;

  border-radius: 28px;

  background: var(--rm-maroon);

  border: 1px solid rgba(193, 200, 196, 0.25);

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 40px;
}


.rm-about-cta-box h2 {
  max-width: 720px;

  color: var(--rm-white);

  font-family: var(--font-display);

  font-size: clamp(2.2rem, 4vw, 4rem);

  line-height: 0.98;

  letter-spacing: -0.045em;
}


.rm-about-cta-box p {
  max-width: 600px;

  margin-top: 12px;

  color: rgba(255, 255, 255, 0.67);

  font-size: 0.84rem;

  line-height: 1.7;
}


.rm-about-cta-button {
  flex-shrink: 0;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  min-height: 46px;

  padding: 0 22px;

  border-radius: 999px;

  background: var(--rm-white);

  color: var(--rm-maroon);

  border: 1px solid var(--rm-white);

  font-size: 0.8rem;

  font-weight: 700;

  text-decoration: none;

  transition:
    transform 0.2s ease,
    background 0.2s ease;
}


.rm-about-cta-button:hover {
  transform: translateY(-2px);

  background: #f3f3f1;
}


.rm-about-cta-button
.material-symbols-outlined {
  font-size: 17px;
}


/* =========================================================
   RESPONSIVE
========================================================= */

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

  .rm-about-page .container {
    width: calc(100% - 32px);
  }


  .rm-about-hero {
    padding: 125px 0 70px;
  }


  .rm-about-hero h1 {
    font-size: clamp(2.7rem, 12vw, 4rem);
  }


  .rm-about-hero p {
    font-size: 0.86rem;
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

  .rm-about-page .container {
    width: calc(100% - 24px);
  }


  .rm-about-hero {
    padding-top: 110px;
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


  .rm-about-cta-box h2 {
    font-size: 2.3rem;
  }
}
      `}</style>

      <div className="remaker-page rm-page rm-about-page">
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
