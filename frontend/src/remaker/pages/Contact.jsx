import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <style>{`
        /* =========================================================
           REMAKER CONTACT PAGE
           ISOLATED THEME
        ========================================================= */

        .remaker-contact-page {
          --rc-maroon: #270809;
          --rc-green: #08271f;
          --rc-secondary-dark: #414845;

          --rc-text: #1a1c1a;
          --rc-muted: #727975;
          --rc-soft-muted: #9ca3af;

          --rc-border: #c1c8c4;
          --rc-light: #e3e2e0;
          --rc-background: #faf9f7;
          --rc-white: #ffffff;

          min-height: 100vh;
          background: var(--rc-background);
          color: var(--rc-text);

          isolation: isolate;
          overflow-x: hidden;
        }

        /* =========================================================
           CONTAINER
        ========================================================= */

        .remaker-contact-page .rc-container {
          width: min(1280px, calc(100% - 80px));
          margin: 0 auto;
        }

        /* =========================================================
           HERO
        ========================================================= */

        .remaker-contact-page .rc-hero {
          padding: 155px 0 90px;
          background: var(--rc-background);
        }

        .remaker-contact-page .rc-hero-grid {
          display: grid;
          grid-template-columns: 1fr 0.85fr;
          align-items: center;
          gap: 80px;
        }

        .remaker-contact-page .rc-hero-copy {
          max-width: 690px;
        }

        /* =========================================================
           BADGE
        ========================================================= */

        .remaker-contact-page .rc-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 9px 14px;

          border-radius: 999px;

          background: rgba(193, 200, 196, 0.32);
          border: 1px solid var(--rc-border);

          color: var(--rc-green);

          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .remaker-contact-page .rc-badge .material-symbols-outlined {
          font-size: 17px;
        }

        /* =========================================================
           HERO TITLE
        ========================================================= */

        .remaker-contact-page .rc-hero h1 {
          margin: 28px 0 20px;

          color: var(--rc-maroon);

          font-family: var(--font-display);

          font-size: clamp(3.5rem, 6vw, 5.8rem);

          line-height: 0.95;

          letter-spacing: -0.055em;

          font-weight: 700;
        }

        .remaker-contact-page .rc-hero h1 em {
          color: var(--rc-green);
          font-style: italic;
          font-weight: 600;
        }

        .remaker-contact-page .rc-hero-copy > p {
          max-width: 610px;

          color: var(--rc-secondary-dark);

          font-size: 0.95rem;
          line-height: 1.75;
        }

        /* =========================================================
           CONTACT INFO
        ========================================================= */

        .remaker-contact-page .rc-contact-info {
          display: grid;

          grid-template-columns: repeat(2, 1fr);

          gap: 12px;

          margin-top: 30px;
        }

        .remaker-contact-page .rc-info-card {
          padding: 17px;

          background: var(--rc-white);

          border: 1px solid var(--rc-border);

          border-radius: 16px;
        }

        .remaker-contact-page .rc-info-icon {
          width: 36px;
          height: 36px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin-bottom: 12px;

          border-radius: 11px;

          background: rgba(8, 39, 31, 0.08);

          color: var(--rc-green);
        }

        .remaker-contact-page .rc-info-icon .material-symbols-outlined {
          font-size: 18px;
        }

        .remaker-contact-page .rc-info-card h3 {
          margin-bottom: 5px;

          color: var(--rc-maroon);

          font-family: var(--font-display);

          font-size: 0.92rem;
        }

        .remaker-contact-page .rc-info-card p {
          color: var(--rc-muted);

          font-size: 0.68rem;

          line-height: 1.55;
        }

        /* =========================================================
           CONTACT FORM WRAPPER
        ========================================================= */

        .remaker-contact-page .rc-form-card {
          padding: 32px;

          background: var(--rc-white);

          border: 1px solid var(--rc-border);

          border-radius: 24px;

          box-shadow: 0 20px 50px rgba(39, 8, 9, 0.07);
        }

        .remaker-contact-page .rc-form-header {
          margin-bottom: 25px;
        }

        .remaker-contact-page .rc-form-header h2 {
          margin-bottom: 8px;

          color: var(--rc-maroon);

          font-family: var(--font-display);

          font-size: 1.75rem;

          line-height: 1.05;

          letter-spacing: -0.035em;
        }

        .remaker-contact-page .rc-form-header p {
          color: var(--rc-muted);

          font-size: 0.74rem;

          line-height: 1.6;
        }

        /* =========================================================
           FORM
        ========================================================= */

        .remaker-contact-page .rc-form {
          display: flex;
          flex-direction: column;

          gap: 17px;
        }

        .remaker-contact-page .rc-form-row {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 14px;
        }

        .remaker-contact-page .rc-field {
          display: flex;
          flex-direction: column;

          gap: 7px;
        }

        .remaker-contact-page .rc-field label {
          color: var(--rc-maroon);

          font-size: 0.67rem;

          font-weight: 700;
        }

        .remaker-contact-page .rc-field input,
        .remaker-contact-page .rc-field select,
        .remaker-contact-page .rc-field textarea {
          width: 100%;

          padding: 12px 13px;

          border: 1px solid var(--rc-border);

          border-radius: 11px;

          outline: none;

          background: var(--rc-background);

          color: var(--rc-text);

          font-family: var(--font-sans);

          font-size: 0.74rem;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .remaker-contact-page .rc-field textarea {
          min-height: 120px;

          resize: vertical;
        }

        .remaker-contact-page .rc-field input::placeholder,
        .remaker-contact-page .rc-field textarea::placeholder {
          color: var(--rc-soft-muted);
        }

        .remaker-contact-page .rc-field input:focus,
        .remaker-contact-page .rc-field select:focus,
        .remaker-contact-page .rc-field textarea:focus {
          border-color: var(--rc-green);

          background: var(--rc-white);

          box-shadow: 0 0 0 3px rgba(8, 39, 31, 0.08);
        }

        /* =========================================================
           SUBMIT BUTTON
        ========================================================= */

        .remaker-contact-page .rc-submit {
          min-height: 46px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          padding: 0 20px;

          border: 1px solid var(--rc-maroon);

          border-radius: 999px;

          background: var(--rc-maroon);

          color: var(--rc-white);

          font-family: var(--font-sans);

          font-size: 0.78rem;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .remaker-contact-page .rc-submit:hover {
          background: #3b1011;

          transform: translateY(-2px);
        }

        .remaker-contact-page .rc-submit .material-symbols-outlined {
          font-size: 16px;
        }

        /* =========================================================
           SUCCESS MESSAGE
        ========================================================= */

        .remaker-contact-page .rc-success {
          padding: 16px;

          margin-bottom: 18px;

          border-radius: 13px;

          background: rgba(8, 39, 31, 0.08);

          border: 1px solid rgba(8, 39, 31, 0.2);

          color: var(--rc-green);

          font-size: 0.74rem;

          line-height: 1.5;
        }

        .remaker-contact-page .rc-success strong {
          display: block;

          margin-bottom: 3px;

          font-size: 0.78rem;
        }

        /* =========================================================
           SUPPORT SECTION
        ========================================================= */

        .remaker-contact-page .rc-support {
          padding: 95px 0;

          background: var(--rc-light);
        }

        .remaker-contact-page .rc-support-head {
          max-width: 650px;

          margin-bottom: 40px;
        }

        .remaker-contact-page .rc-eyebrow {
          display: inline-flex;

          align-items: center;

          gap: 7px;

          color: var(--rc-green);

          font-size: 0.68rem;

          font-weight: 800;

          letter-spacing: 0.13em;

          text-transform: uppercase;
        }

        .remaker-contact-page .rc-eyebrow::before {
          content: "";

          width: 22px;
          height: 1.5px;

          background: var(--rc-green);
        }

        .remaker-contact-page .rc-support-head h2 {
          margin: 10px 0 12px;

          color: var(--rc-maroon);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .remaker-contact-page .rc-support-head p {
          color: var(--rc-muted);

          font-size: 0.84rem;

          line-height: 1.7;
        }

        /* =========================================================
           SUPPORT CARDS
        ========================================================= */

        .remaker-contact-page .rc-support-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 18px;
        }

        .remaker-contact-page .rc-support-card {
          padding: 28px;

          background: var(--rc-white);

          border: 1px solid var(--rc-border);

          border-radius: 20px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .remaker-contact-page .rc-support-card:hover {
          transform: translateY(-5px);

          border-color: var(--rc-green);

          box-shadow: 0 18px 40px rgba(39, 8, 9, 0.08);
        }

        .remaker-contact-page .rc-support-icon {
          width: 46px;
          height: 46px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin-bottom: 20px;

          border-radius: 14px;

          background: rgba(8, 39, 31, 0.08);

          color: var(--rc-green);
        }

        .remaker-contact-page .rc-support-icon .material-symbols-outlined {
          font-size: 22px;
        }

        .remaker-contact-page .rc-support-card h3 {
          margin-bottom: 8px;

          color: var(--rc-maroon);

          font-family: var(--font-display);

          font-size: 1.1rem;
        }

        .remaker-contact-page .rc-support-card p {
          color: var(--rc-muted);

          font-size: 0.75rem;

          line-height: 1.65;
        }

       /* =========================================================
           BOTTOM CTA (THEME MATCHED)
        ========================================================= */

        .remaker-contact-page .rc-bottom-cta {
          padding: 90px 0;

          /* Matched to page background */
          background: var(--rc-background);
        }

        .remaker-contact-page .rc-bottom-card {
          padding: 50px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 40px;

          /* Matched to white card style */
          background: var(--rc-white);

          border: 1px solid var(--rc-border);

          border-radius: 26px;

          box-shadow: 0 20px 50px rgba(39, 8, 9, 0.05);
        }

        .remaker-contact-page .rc-bottom-card h2 {
          margin: 10px 0 10px;

          /* Matched to dark maroon display text */
          color: var(--rc-maroon);

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3.5rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .remaker-contact-page .rc-bottom-card p {
          max-width: 600px;

          /* Matched to muted text color */
          color: var(--rc-muted);

          font-size: 0.8rem;

          line-height: 1.7;
        }

        .remaker-contact-page .rc-bottom-button {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 46px;
          padding: 0 21px;
          border-radius: 999px;
          /* Matched to primary maroon button theme */
          background: var(--rc-maroon);
          border: 1px solid var(--rc-maroon);
          color: var(--rc-white);
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .remaker-contact-page .rc-bottom-button:hover {
          transform: translateY(-2px);
          background: #3b1011;
        }

        .remaker-contact-page .rc-bottom-button .material-symbols-outlined {
          font-size: 17px;
        }
        /* =========================================================
           TABLET
        ========================================================= */

        @media (max-width: 1000px) {

          .remaker-contact-page .rc-container {
            width: min(100%, calc(100% - 50px));
          }

          .remaker-contact-page .rc-hero-grid {
            grid-template-columns: 1fr;

            gap: 45px;
          }

          .remaker-contact-page .rc-hero-copy {
            max-width: 760px;
          }

          .remaker-contact-page .rc-form-card {
            max-width: 760px;
          }

        }

        /* =========================================================
           MOBILE
        ========================================================= */

        @media (max-width: 700px) {

          .remaker-contact-page .rc-container {
            width: calc(100% - 32px);
          }

          .remaker-contact-page .rc-hero {
            padding: 125px 0 65px;
          }

          .remaker-contact-page .rc-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .remaker-contact-page .rc-hero-copy > p {
            font-size: 0.84rem;
          }

          .remaker-contact-page .rc-contact-info {
            grid-template-columns: 1fr;
          }

          .remaker-contact-page .rc-form-card {
            padding: 24px 20px;

            border-radius: 20px;
          }

          .remaker-contact-page .rc-form-row {
            grid-template-columns: 1fr;
          }

          .remaker-contact-page .rc-submit {
            width: 100%;
          }

          .remaker-contact-page .rc-support {
            padding: 70px 0;
          }

          .remaker-contact-page .rc-support-grid {
            grid-template-columns: 1fr;
          }

          .remaker-contact-page .rc-support-card {
            padding: 24px;
          }

          .remaker-contact-page .rc-bottom-cta {
            padding: 65px 0;
          }

          .remaker-contact-page .rc-bottom-card {
            flex-direction: column;

            align-items: flex-start;

            padding: 30px 24px;

            border-radius: 20px;
          }

          .remaker-contact-page .rc-bottom-button {
            width: 100%;
          }

        }

        /* =========================================================
           SMALL MOBILE
        ========================================================= */

        @media (max-width: 450px) {

          .remaker-contact-page .rc-container {
            width: calc(100% - 24px);
          }

          .remaker-contact-page .rc-hero {
            padding-top: 110px;
          }

          .remaker-contact-page .rc-hero h1 {
            font-size: 2.65rem;
          }

          .remaker-contact-page .rc-form-header h2 {
            font-size: 1.5rem;
          }

        }

        /* =========================================================
           ACCESSIBILITY
        ========================================================= */

        .remaker-contact-page a:focus-visible,
        .remaker-contact-page button:focus-visible,
        .remaker-contact-page input:focus-visible,
        .remaker-contact-page select:focus-visible,
        .remaker-contact-page textarea:focus-visible {
          outline: 2px solid var(--rc-green);

          outline-offset: 3px;
        }

        /* =========================================================
           REDUCED MOTION
        ========================================================= */

        @media (prefers-reduced-motion: reduce) {

          .remaker-contact-page *,
          .remaker-contact-page *::before,
          .remaker-contact-page *::after {
            animation-duration: 0.01ms !important;

            animation-iteration-count: 1 !important;

            scroll-behavior: auto !important;

            transition-duration: 0.01ms !important;
          }

        }

      `}</style>

      <div className="remaker-page rm-page remaker-contact-page">
        <Navbar />

        <main>
          {/* =====================================================
              HERO + CONTACT FORM
          ===================================================== */}

          <section className="rc-hero">
            <div className="rc-container">
              <div className="rc-hero-grid">
                {/* LEFT */}

                <div className="rc-hero-copy">
                  <span className="rc-badge">
                    <span className="material-symbols-outlined">
                      support_agent
                    </span>
                    ReMaker Support
                  </span>

                  <h1>
                    Let&apos;s keep your
                    <em> orbit moving.</em>
                  </h1>

                  <p>
                    Have a question about sourcing materials, showcasing your
                    work, managing creations or becoming part of the ReMaker
                    community? Reach out to the ReOrbit team.
                  </p>

                  <div className="rc-contact-info">
                    <div className="rc-info-card">
                      <div className="rc-info-icon">
                        <span className="material-symbols-outlined">
                          handyman
                        </span>
                      </div>

                      <h3>ReMaker Support</h3>

                      <p>
                        Help with your profile, Studio, products and ReMaker
                        journey.
                      </p>
                    </div>

                    <div className="rc-info-card">
                      <div className="rc-info-icon">
                        <span className="material-symbols-outlined">
                          inventory_2
                        </span>
                      </div>

                      <h3>Material Queries</h3>

                      <p>
                        Questions about available materials, sourcing and
                        listings.
                      </p>
                    </div>

                    <div className="rc-info-card">
                      <div className="rc-info-icon">
                        <span className="material-symbols-outlined">
                          handshake
                        </span>
                      </div>

                      <h3>Partnerships</h3>

                      <p>
                        Interested in collaborating with the ReOrbit ecosystem?
                      </p>
                    </div>

                    <div className="rc-info-card">
                      <div className="rc-info-icon">
                        <span className="material-symbols-outlined">help</span>
                      </div>

                      <h3>General Help</h3>

                      <p>
                        Something else on your mind? We&apos;re happy to help.
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT — FORM */}

                <div className="rc-form-card">
                  <div className="rc-form-header">
                    <h2>Start a conversation.</h2>

                    <p>
                      Tell us what you need and our team will help point you in
                      the right direction.
                    </p>
                  </div>

                  {submitted && (
                    <div className="rc-success">
                      <strong>Message received.</strong>
                      Thanks for reaching out to ReOrbit. We&apos;ll get back to
                      you with the next step.
                    </div>
                  )}

                  <form className="rc-form" onSubmit={handleSubmit}>
                    <div className="rc-form-row">
                      <div className="rc-field">
                        <label htmlFor="name">Name</label>

                        <input
                          id="name"
                          type="text"
                          placeholder="Your name"
                          required
                        />
                      </div>

                      <div className="rc-field">
                        <label htmlFor="email">Email</label>

                        <input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="rc-field">
                      <label htmlFor="subject">What can we help with?</label>

                      <select id="subject" defaultValue="" required>
                        <option value="" disabled>
                          Select a topic
                        </option>

                        <option value="remaker-account">ReMaker account</option>

                        <option value="materials">Materials & sourcing</option>

                        <option value="studio">ReMaker Studio</option>

                        <option value="products">Products & selling</option>

                        <option value="orders">Orders & earnings</option>

                        <option value="partnership">Partnership</option>

                        <option value="other">Something else</option>
                      </select>
                    </div>

                    <div className="rc-field">
                      <label htmlFor="message">Message</label>

                      <textarea
                        id="message"
                        placeholder="Tell us a little about what you need..."
                        required
                      />
                    </div>

                    <button type="submit" className="rc-submit">
                      Send message
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              SUPPORT AREAS
          ===================================================== */}

          <section className="rc-support">
            <div className="rc-container">
              <div className="rc-support-head">
                <span className="rc-eyebrow">What can we help with?</span>

                <h2>Built around your making journey.</h2>

                <p>
                  Whether you&apos;re just getting started or already creating
                  through ReOrbit, our support is organized around the things
                  that matter to ReMakers.
                </p>
              </div>

              <div className="rc-support-grid">
                <article className="rc-support-card">
                  <div className="rc-support-icon">
                    <span className="material-symbols-outlined">person</span>
                  </div>

                  <h3>Your ReMaker profile</h3>

                  <p>
                    Need help setting up your profile, updating your information
                    or presenting your creative identity? We can help.
                  </p>
                </article>

                <article className="rc-support-card">
                  <div className="rc-support-icon">
                    <span className="material-symbols-outlined">recycling</span>
                  </div>

                  <h3>Materials & sourcing</h3>

                  <p>
                    Ask us about available materials, sourcing information,
                    material listings or finding something suitable for your
                    next creation.
                  </p>
                </article>

                <article className="rc-support-card">
                  <div className="rc-support-icon">
                    <span className="material-symbols-outlined">
                      storefront
                    </span>
                  </div>

                  <h3>Your creations</h3>

                  <p>
                    Get support with showcasing creations, product listings,
                    your portfolio and putting your finished work back into
                    circulation.
                  </p>
                </article>
              </div>
            </div>
          </section>

          {/* =====================================================
              CTA
          ===================================================== */}

          <section className="rc-bottom-cta">
            <div className="rc-container">
              <div className="rc-bottom-card">
                <div>
                  <span
                    className="rc-eyebrow"
                    style={{
                      color: "#c1c8c4",
                    }}
                  >
                    Still have questions?
                  </span>

                  <h2>Your next creation can start with a conversation.</h2>

                  <p>
                    Explore the ReMaker FAQ or start your journey with ReOrbit
                    and discover what you can create from what is already here.
                  </p>
                </div>

                <a href="/remakers-faq" className="rc-bottom-button">
                  Visit FAQ
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
