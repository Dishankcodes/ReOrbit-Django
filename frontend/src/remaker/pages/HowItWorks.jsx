import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ReMakerHowItWorks() {
  return (
    <>
      <style>{`
/* =========================================================
   REMAKER HOW IT WORKS
   SAME THEME AS REMAKER ABOUT + HOMEPAGE
========================================================= */

.rm-how-page {
  min-height: 100vh;
  background: var(--rm-background);
  color: var(--rm-text);
  overflow-x: hidden;
}

/* =========================================================
   CONTAINER
========================================================= */

.rm-how-page .container {
  width: min(1280px, calc(100% - 80px));
  margin: 0 auto;
}

/* =========================================================
   HERO
========================================================= */

.rm-how-hero {
  padding: 155px 0 95px;
  background: var(--rm-background);
}

.rm-how-hero-inner {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

/* =========================================================
   BADGE
========================================================= */

.rm-how-badge {
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

.rm-how-badge .material-symbols-outlined {
  font-size: 17px;
}

/* =========================================================
   HERO TITLE
========================================================= */

.rm-how-hero h1 {
  margin: 28px auto 22px;

  max-width: 850px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(3.5rem, 6vw, 5.8rem);

  line-height: 0.96;

  letter-spacing: -0.055em;

  font-weight: 700;
}

.rm-how-hero h1 em {
  color: var(--rm-green);

  font-style: italic;

  font-weight: 600;
}

/* =========================================================
   HERO DESCRIPTION
========================================================= */

.rm-how-hero p {
  max-width: 700px;

  margin: 0 auto;

  color: var(--rm-secondary-dark);

  font-size: 0.95rem;

  line-height: 1.75;
}

/* =========================================================
   MAIN FLOW
========================================================= */

.rm-how-flow {
  padding: 35px 0 110px;

  background: var(--rm-background);
}

.rm-how-flow-grid {
  display: grid;

  grid-template-columns: repeat(4, 1fr);

  gap: 18px;
}

/* =========================================================
   FLOW CARD
========================================================= */

.rm-how-flow-card {
  position: relative;

  min-height: 250px;

  padding: 28px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 20px;

  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.rm-how-flow-card:hover {
  transform: translateY(-5px);

  border-color: var(--rm-green);

  box-shadow: 0 18px 40px rgba(39, 8, 9, 0.08);
}

.rm-how-step {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  width: 42px;
  height: 42px;

  margin-bottom: 25px;

  border-radius: 50%;

  background: rgba(8, 39, 31, 0.08);

  color: var(--rm-green);

  font-size: 0.72rem;

  font-weight: 800;
}

.rm-how-flow-card h3 {
  margin-bottom: 10px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.25rem;
}

.rm-how-flow-card p {
  color: var(--rm-muted);

  font-size: 0.76rem;

  line-height: 1.7;
}

.rm-how-flow-icon {
  position: absolute;

  right: 22px;

  bottom: 20px;

  color: var(--rm-border);

  font-size: 20px;
}

/* =========================================================
   SECTION
========================================================= */

.rm-how-section {
  padding: 105px 0;

  background: var(--rm-light);

  border-top: 1px solid var(--rm-border);

  border-bottom: 1px solid var(--rm-border);
}

.rm-how-section-heading {
  max-width: 720px;

  margin-bottom: 48px;
}

.rm-how-eyebrow {
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

.rm-how-eyebrow::before {
  content: "";

  width: 22px;

  height: 1.5px;

  background: var(--rm-green);
}

.rm-how-section-heading h2 {
  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(2.2rem, 4vw, 3.7rem);

  line-height: 1;

  letter-spacing: -0.045em;
}

.rm-how-section-heading p {
  max-width: 650px;

  margin-top: 15px;

  color: var(--rm-muted);

  font-size: 0.86rem;

  line-height: 1.75;
}

/* =========================================================
   DETAILED STEPS
========================================================= */

.rm-how-detail-grid {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 18px;
}

.rm-how-detail-card {
  padding: 30px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 20px;

  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.rm-how-detail-card:hover {
  transform: translateY(-5px);

  box-shadow: 0 18px 40px rgba(39, 8, 9, 0.08);
}

.rm-how-detail-icon {
  width: 48px;
  height: 48px;

  display: flex;

  align-items: center;
  justify-content: center;

  margin-bottom: 22px;

  border-radius: 14px;

  background: rgba(8, 39, 31, 0.08);

  color: var(--rm-green);
}

.rm-how-detail-icon .material-symbols-outlined {
  font-size: 23px;
}

.rm-how-detail-card h3 {
  margin-bottom: 10px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.25rem;
}

.rm-how-detail-card p {
  color: var(--rm-muted);

  font-size: 0.78rem;

  line-height: 1.7;
}

/* =========================================================
   MAKER JOURNEY
========================================================= */

.rm-how-journey {
  padding: 110px 0;

  background: var(--rm-background);
}

.rm-how-journey-heading {
  max-width: 700px;

  margin: 0 auto 55px;

  text-align: center;
}

.rm-how-journey-heading h2 {
  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(2.2rem, 4vw, 3.6rem);

  line-height: 1;

  letter-spacing: -0.045em;
}

.rm-how-journey-heading p {
  margin-top: 15px;

  color: var(--rm-muted);

  font-size: 0.86rem;

  line-height: 1.7;
}

/* =========================================================
   JOURNEY TIMELINE
========================================================= */

.rm-how-timeline {
  position: relative;

  max-width: 950px;

  margin: 0 auto;
}

.rm-how-timeline::before {
  content: "";

  position: absolute;

  top: 0;
  bottom: 0;

  left: 27px;

  width: 1px;

  background: var(--rm-border);
}

.rm-how-timeline-item {
  position: relative;

  display: grid;

  grid-template-columns: 56px 1fr;

  gap: 25px;

  margin-bottom: 28px;
}

.rm-how-timeline-item:last-child {
  margin-bottom: 0;
}

.rm-how-timeline-number {
  position: relative;

  z-index: 2;

  width: 56px;
  height: 56px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: var(--rm-green);

  color: var(--rm-white);

  font-size: 0.72rem;

  font-weight: 800;
}

.rm-how-timeline-content {
  padding: 25px 28px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 18px;
}

.rm-how-timeline-content h3 {
  margin-bottom: 8px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.25rem;
}

.rm-how-timeline-content p {
  color: var(--rm-muted);

  font-size: 0.78rem;

  line-height: 1.7;
}

/* =========================================================
   WHAT YOU CAN DO
========================================================= */

.rm-how-features {
  padding: 105px 0;

  background: var(--rm-light);

  border-top: 1px solid var(--rm-border);

  border-bottom: 1px solid var(--rm-border);
}

.rm-how-features-grid {
  display: grid;

  grid-template-columns: repeat(2, 1fr);

  gap: 18px;
}

.rm-how-feature {
  padding: 30px;

  display: flex;

  gap: 18px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 20px;
}

.rm-how-feature-icon {
  width: 46px;
  height: 46px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 13px;

  background: rgba(8, 39, 31, 0.08);

  color: var(--rm-green);
}

.rm-how-feature-icon .material-symbols-outlined {
  font-size: 21px;
}

.rm-how-feature h3 {
  margin-bottom: 7px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.1rem;
}

.rm-how-feature p {
  color: var(--rm-muted);

  font-size: 0.75rem;

  line-height: 1.65;
}

/* =========================================================
   CTA
========================================================= */

.rm-how-cta {
  padding: 0 0 100px;

  background: var(--rm-light);
}

.rm-how-cta-box {
  padding: 55px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 40px;

  border-radius: 28px;

  background: var(--rm-maroon);

  border: 1px solid rgba(193, 200, 196, 0.25);
}

.rm-how-cta-box h2 {
  max-width: 720px;

  color: var(--rm-white);

  font-family: var(--font-display);

  font-size: clamp(2.2rem, 4vw, 4rem);

  line-height: 0.98;

  letter-spacing: -0.045em;
}

.rm-how-cta-box p {
  max-width: 600px;

  margin-top: 12px;

  color: rgba(255, 255, 255, 0.67);

  font-size: 0.84rem;

  line-height: 1.7;
}

.rm-how-cta-button {
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

.rm-how-cta-button:hover {
  transform: translateY(-2px);

  background: #f3f3f1;
}

.rm-how-cta-button .material-symbols-outlined {
  font-size: 17px;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1000px) {
  .rm-how-flow-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .rm-how-detail-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 800px) {
  .rm-how-page .container {
    width: calc(100% - 32px);
  }

  .rm-how-hero {
    padding: 125px 0 70px;
  }

  .rm-how-features-grid {
    grid-template-columns: 1fr;
  }

  .rm-how-cta-box {
    flex-direction: column;

    align-items: flex-start;

    padding: 35px 25px;

    border-radius: 22px;
  }

  .rm-how-cta-button {
    width: 100%;
  }
}

@media (max-width: 650px) {
  .rm-how-flow {
    padding: 30px 0 75px;
  }

  .rm-how-flow-grid,
  .rm-how-detail-grid {
    grid-template-columns: 1fr;
  }

  .rm-how-section,
  .rm-how-journey,
  .rm-how-features {
    padding: 75px 0;
  }

  .rm-how-timeline::before {
    left: 22px;
  }

  .rm-how-timeline-item {
    grid-template-columns: 45px 1fr;

    gap: 15px;
  }

  .rm-how-timeline-number {
    width: 45px;
    height: 45px;
  }

  .rm-how-timeline-content {
    padding: 22px;
  }

  .rm-how-cta {
    padding-bottom: 70px;
  }
}

@media (max-width: 480px) {
  .rm-how-page .container {
    width: calc(100% - 24px);
  }

  .rm-how-hero {
    padding-top: 110px;
  }

  .rm-how-hero h1 {
    font-size: 2.65rem;
  }

  .rm-how-flow-card,
  .rm-how-detail-card {
    padding: 24px;
  }

  .rm-how-cta-box h2 {
    font-size: 2.3rem;
  }
}
      `}</style>

      <div className="remaker-page rm-page rm-how-page">
        <Navbar />

        <main>
          {/* =====================================================
              HERO
          ===================================================== */}

          <section className="rm-how-hero">
            <div className="container rm-how-hero-inner">
              <span className="rm-how-badge">
                <span className="material-symbols-outlined">sync</span>
                How ReOrbit Works
              </span>

              <h1>
                From reusable material to
                <em> something remarkable.</em>
              </h1>

              <p>
                ReOrbit gives ReMakers a complete journey — from finding
                reusable materials and transforming them into new products to
                showcasing, selling and growing their creative work.
              </p>
            </div>
          </section>

          {/* =====================================================
              QUICK FLOW
          ===================================================== */}

          <section className="rm-how-flow">
            <div className="container">
              <div className="rm-how-flow-grid">
                <div className="rm-how-flow-card">
                  <span className="rm-how-step">01</span>

                  <h3>Join ReOrbit</h3>

                  <p>
                    Register as a ReMaker and create your profile with your
                    skills, interests, experience and creative information.
                  </p>

                  <span className="material-symbols-outlined rm-how-flow-icon">
                    arrow_forward
                  </span>
                </div>

                <div className="rm-how-flow-card">
                  <span className="rm-how-step">02</span>

                  <h3>Find materials</h3>

                  <p>
                    Browse reusable materials, explore categories, search
                    available items and select what you need for your next
                    creation.
                  </p>

                  <span className="material-symbols-outlined rm-how-flow-icon">
                    arrow_forward
                  </span>
                </div>

                <div className="rm-how-flow-card">
                  <span className="rm-how-step">03</span>

                  <h3>Make & transform</h3>

                  <p>
                    Purchase the material and use your own creativity, skills
                    and techniques to turn it into a new purposeful product.
                  </p>

                  <span className="material-symbols-outlined rm-how-flow-icon">
                    arrow_forward
                  </span>
                </div>

                <div className="rm-how-flow-card">
                  <span className="rm-how-step">04</span>

                  <h3>Showcase & sell</h3>

                  <p>
                    Add your finished product, share its transformation story
                    and make it available for customers through your ReMaker
                    profile.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              DETAILED PROCESS
          ===================================================== */}

          <section className="rm-how-section">
            <div className="container">
              <div className="rm-how-section-heading">
                <span className="rm-how-eyebrow">Your ReMaker journey</span>

                <h2>Everything you need to turn ideas into creations.</h2>

                <p>
                  ReOrbit brings sourcing, making, showcasing and selling
                  together so your creative process does not have to stop at the
                  workshop.
                </p>
              </div>

              <div className="rm-how-detail-grid">
                {/* PROFILE */}

                <div className="rm-how-detail-card">
                  <div className="rm-how-detail-icon">
                    <span className="material-symbols-outlined">person</span>
                  </div>

                  <h3>Build your ReMaker profile</h3>

                  <p>
                    Create your profile, add your skills and introduce customers
                    to the kind of work you create. Your profile becomes the
                    starting point for your ReMaker identity on ReOrbit.
                  </p>
                </div>

                {/* MATERIAL */}

                <div className="rm-how-detail-card">
                  <div className="rm-how-detail-icon">
                    <span className="material-symbols-outlined">
                      inventory_2
                    </span>
                  </div>

                  <h3>Discover reusable materials</h3>

                  <p>
                    Search available materials, browse categories, view details
                    and find items that can become part of your next project.
                  </p>
                </div>

                {/* PURCHASE */}

                <div className="rm-how-detail-card">
                  <div className="rm-how-detail-icon">
                    <span className="material-symbols-outlined">
                      shopping_cart
                    </span>
                  </div>

                  <h3>Purchase what you need</h3>

                  <p>
                    Select suitable materials and complete the purchase.
                    Purchased materials become the starting point for your
                    transformation journey.
                  </p>
                </div>

                {/* TRANSFORM */}

                <div className="rm-how-detail-card">
                  <div className="rm-how-detail-icon">
                    <span className="material-symbols-outlined">handyman</span>
                  </div>

                  <h3>Transform the material</h3>

                  <p>
                    Repair, redesign, refurbish or creatively transform the
                    material using your own techniques and skills.
                  </p>
                </div>

                {/* PORTFOLIO */}

                <div className="rm-how-detail-card">
                  <div className="rm-how-detail-icon">
                    <span className="material-symbols-outlined">
                      photo_library
                    </span>
                  </div>

                  <h3>Build your portfolio</h3>

                  <p>
                    Add your finished work to your portfolio and use
                    before-and-after images to show customers how the original
                    material became something new.
                  </p>
                </div>

                {/* PRODUCT */}

                <div className="rm-how-detail-card">
                  <div className="rm-how-detail-icon">
                    <span className="material-symbols-outlined">
                      storefront
                    </span>
                  </div>

                  <h3>List your creation</h3>

                  <p>
                    Add your finished product, select its category, provide
                    details, set a price and make the creation available to
                    customers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              TIMELINE
          ===================================================== */}

          <section className="rm-how-journey">
            <div className="container">
              <div className="rm-how-journey-heading">
                <span className="rm-how-eyebrow">The complete orbit</span>

                <h2>One material. Many possibilities.</h2>

                <p>
                  The ReMaker journey does not end when the product is created.
                  ReOrbit keeps the story moving.
                </p>
              </div>

              <div className="rm-how-timeline">
                {/* 01 */}

                <div className="rm-how-timeline-item">
                  <div className="rm-how-timeline-number">01</div>

                  <div className="rm-how-timeline-content">
                    <h3>Material enters the marketplace</h3>

                    <p>
                      Users can upload reusable items or make them available
                      through ReOrbit. ReMakers can discover these materials
                      when looking for their next project.
                    </p>
                  </div>
                </div>

                {/* 02 */}

                <div className="rm-how-timeline-item">
                  <div className="rm-how-timeline-number">02</div>

                  <div className="rm-how-timeline-content">
                    <h3>A ReMaker finds the right piece</h3>

                    <p>
                      Search, filter and explore material details before
                      selecting an item that fits your creative process.
                    </p>
                  </div>
                </div>

                {/* 03 */}

                <div className="rm-how-timeline-item">
                  <div className="rm-how-timeline-number">03</div>

                  <div className="rm-how-timeline-content">
                    <h3>The transformation begins</h3>

                    <p>
                      The selected material is transformed through repair,
                      refurbishment, redesign or another creative process.
                    </p>
                  </div>
                </div>

                {/* 04 */}

                <div className="rm-how-timeline-item">
                  <div className="rm-how-timeline-number">04</div>

                  <div className="rm-how-timeline-content">
                    <h3>The work becomes part of your portfolio</h3>

                    <p>
                      Document the transformation with product information,
                      images and before-and-after details that show the value of
                      your work.
                    </p>
                  </div>
                </div>

                {/* 05 */}

                <div className="rm-how-timeline-item">
                  <div className="rm-how-timeline-number">05</div>

                  <div className="rm-how-timeline-content">
                    <h3>The finished creation goes back into circulation</h3>

                    <p>
                      List the completed product on ReOrbit, set its price and
                      make it available for someone who wants to give it a new
                      home.
                    </p>
                  </div>
                </div>

                {/* 06 */}

                <div className="rm-how-timeline-item">
                  <div className="rm-how-timeline-number">06</div>

                  <div className="rm-how-timeline-content">
                    <h3>Customers purchase and review</h3>

                    <p>
                      Customers can purchase finished creations, track their
                      orders and provide ratings or reviews after receiving
                      their products.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              WHAT REMAKERS CAN DO
          ===================================================== */}

          <section className="rm-how-features">
            <div className="container">
              <div className="rm-how-section-heading">
                <span className="rm-how-eyebrow">Your creative workspace</span>

                <h2>More control over your creative journey.</h2>

                <p>
                  ReOrbit gives ReMakers tools to manage their materials,
                  products, customers and creative presence from one place.
                </p>
              </div>

              <div className="rm-how-features-grid">
                <div className="rm-how-feature">
                  <div className="rm-how-feature-icon">
                    <span className="material-symbols-outlined">dashboard</span>
                  </div>

                  <div>
                    <h3>Manage your profile</h3>

                    <p>
                      Keep your ReMaker information, skills and creative
                      identity up to date.
                    </p>
                  </div>
                </div>

                <div className="rm-how-feature">
                  <div className="rm-how-feature-icon">
                    <span className="material-symbols-outlined">
                      collections
                    </span>
                  </div>

                  <div>
                    <h3>Manage your portfolio</h3>

                    <p>
                      Showcase your previous creations and demonstrate your
                      transformation work.
                    </p>
                  </div>
                </div>

                <div className="rm-how-feature">
                  <div className="rm-how-feature-icon">
                    <span className="material-symbols-outlined">inventory</span>
                  </div>

                  <div>
                    <h3>Manage your products</h3>

                    <p>
                      Add, edit, pause or remove product listings and keep your
                      shop organized.
                    </p>
                  </div>
                </div>

                <div className="rm-how-feature">
                  <div className="rm-how-feature-icon">
                    <span className="material-symbols-outlined">payments</span>
                  </div>

                  <div>
                    <h3>Track earnings</h3>

                    <p>
                      Keep track of your sales and earnings generated through
                      your finished creations.
                    </p>
                  </div>
                </div>

                <div className="rm-how-feature">
                  <div className="rm-how-feature-icon">
                    <span className="material-symbols-outlined">
                      shopping_bag
                    </span>
                  </div>

                  <div>
                    <h3>Manage orders</h3>

                    <p>
                      View customer orders, payment information and order
                      details throughout the selling process.
                    </p>
                  </div>
                </div>

                <div className="rm-how-feature">
                  <div className="rm-how-feature-icon">
                    <span className="material-symbols-outlined">star</span>
                  </div>

                  <div>
                    <h3>Build your reputation</h3>

                    <p>
                      Customer ratings and reviews help demonstrate the quality
                      and reliability of your work.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              CTA
          ===================================================== */}

          <section className="rm-how-cta">
            <div className="container">
              <div className="rm-how-cta-box">
                <div>
                  <h2>
                    Your next creation starts with something already here.
                  </h2>

                  <p>
                    Join ReOrbit as a ReMaker, discover reusable materials,
                    transform them through your craft and give your work another
                    orbit.
                  </p>
                </div>

                <a href="/remakers/join" className="rm-how-cta-button">
                  Become a ReMaker
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
