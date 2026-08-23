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
        /* =====================================================
           CONTACT PAGE
        ===================================================== */

        .contact-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .contact-hero {
          padding: 145px 0 80px;
        }

        .contact-hero-inner {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          gap: 80px;
        }

        .contact-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding: 8px 14px;

          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: 999px;

          color: var(--primary);

          font-size: 0.68rem;
          font-weight: 700;

          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .contact-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .contact-hero h1 {
          max-width: 720px;

          margin: 25px 0 20px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3.3rem, 6vw, 5.3rem);

          line-height: 0.96;

          letter-spacing: -0.055em;
        }

        .contact-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .contact-hero-description {
          max-width: 600px;

          color: var(--muted-foreground);

          font-size: 0.95rem;

          line-height: 1.8;
        }

        /* =====================================================
           HERO INFO
        ===================================================== */

        .contact-info-card {
          padding: 32px;

          background: var(--secondary);

          border: 1px solid var(--border);

          border-radius: 25px;
        }

        .contact-info-card h2 {
          margin-bottom: 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.6rem;

          letter-spacing: -0.03em;
        }

        .contact-info-card > p {
          margin-bottom: 25px;

          color: var(--muted-foreground);

          font-size: 0.78rem;

          line-height: 1.7;
        }

        .contact-info-item {
          display: flex;
          align-items: flex-start;

          gap: 13px;

          padding: 16px 0;

          border-top: 1px solid var(--border);
        }

        .contact-info-icon {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 50%;

          background: var(--background);

          color: var(--primary);
        }

        .contact-info-icon .material-symbols-outlined {
          font-size: 19px;
        }

        .contact-info-item strong {
          display: block;

          margin-bottom: 3px;

          color: var(--primary);

          font-size: 0.78rem;
        }

        .contact-info-item span {
          color: var(--muted-foreground);

          font-size: 0.72rem;

          line-height: 1.5;
        }

        /* =====================================================
           SUPPORT OPTIONS
        ===================================================== */

        .contact-support {
          padding: 90px 0;

          background: var(--secondary);
        }

        .contact-section-heading {
          max-width: 700px;

          margin-bottom: 45px;
        }

        .contact-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          color: var(--leaf);

          font-size: 0.68rem;

          font-weight: 800;

          letter-spacing: 0.13em;

          text-transform: uppercase;
        }

        .contact-eyebrow::before {
          content: "";

          width: 22px;
          height: 1.5px;

          background: var(--leaf);
        }

        .contact-section-heading h2 {
          margin-top: 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 3.5rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .contact-section-heading p {
          margin-top: 14px;

          color: var(--muted-foreground);

          font-size: 0.88rem;

          line-height: 1.7;
        }

        .contact-support-grid {
          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 16px;
        }

        .contact-support-card {
          padding: 25px;

          background: var(--card);

          border: 1px solid var(--border);

          border-radius: 20px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .contact-support-card:hover {
          transform: translateY(-5px);

          border-color: var(--leaf);

          box-shadow:
            0 15px 35px rgba(42, 77, 58, 0.08);
        }

        .contact-support-icon {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 22px;

          border-radius: 14px;

          background: var(--secondary);

          color: var(--primary);
        }

        .contact-support-icon .material-symbols-outlined {
          font-size: 22px;
        }

        .contact-support-card h3 {
          margin-bottom: 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.1rem;
        }

        .contact-support-card p {
          color: var(--muted-foreground);

          font-size: 0.75rem;

          line-height: 1.65;
        }

        .contact-support-card a {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          margin-top: 16px;

          color: var(--primary);

          font-size: 0.7rem;
          font-weight: 700;

          text-decoration: none;
        }

        .contact-support-card a .material-symbols-outlined {
          font-size: 14px;
        }

        /* =====================================================
           CONTACT FORM
        ===================================================== */

        .contact-form-section {
          padding: 105px 0;
        }

        .contact-form-layout {
          display: grid;

          grid-template-columns: 0.8fr 1.2fr;

          gap: 80px;

          align-items: start;
        }

        .contact-form-intro {
          position: sticky;
          top: 110px;
        }

        .contact-form-intro h2 {
          margin: 10px 0 15px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 3.4rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .contact-form-intro > p {
          color: var(--muted-foreground);

          font-size: 0.85rem;

          line-height: 1.75;
        }

        .contact-response-note {
          display: flex;

          align-items: flex-start;

          gap: 10px;

          margin-top: 28px;

          padding: 16px;

          background: var(--secondary);

          border: 1px solid var(--border);

          border-radius: 15px;
        }

        .contact-response-note .material-symbols-outlined {
          color: var(--leaf);

          font-size: 20px;
        }

        .contact-response-note p {
          color: var(--muted-foreground);

          font-size: 0.7rem;

          line-height: 1.6;
        }

        /* =====================================================
           FORM CARD
        ===================================================== */

        .contact-form-card {
          padding: 35px;

          background: var(--card);

          border: 1px solid var(--border);

          border-radius: 25px;

          box-shadow:
            0 15px 45px rgba(42, 77, 58, 0.06);
        }

        .contact-form {
          display: flex;
          flex-direction: column;

          gap: 20px;
        }

        .contact-form-row {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 16px;
        }

        .contact-field {
          display: flex;
          flex-direction: column;

          gap: 7px;
        }

        .contact-field label {
          color: var(--primary);

          font-size: 0.7rem;

          font-weight: 700;
        }

        .contact-field input,
        .contact-field select,
        .contact-field textarea {
          width: 100%;

          box-sizing: border-box;

          padding: 13px 14px;

          border: 1px solid var(--border);

          border-radius: 11px;

          background: var(--background);

          color: var(--foreground);

          font-family: var(--font-sans);

          font-size: 0.78rem;

          outline: none;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .contact-field input:focus,
        .contact-field select:focus,
        .contact-field textarea:focus {
          border-color: var(--leaf);

          box-shadow:
            0 0 0 3px rgba(107, 175, 133, 0.12);
        }

        .contact-field textarea {
          min-height: 145px;

          resize: vertical;

          line-height: 1.6;
        }

        .contact-submit {
          width: 100%;

          min-height: 48px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          border: 0;

          border-radius: 999px;

          background: var(--primary);

          color: var(--primary-foreground);

          font-family: var(--font-sans);

          font-size: 0.8rem;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .contact-submit:hover {
          background: #1e3d2f;

          transform: translateY(-1px);
        }

        .contact-submit .material-symbols-outlined {
          font-size: 17px;
        }

        /* =====================================================
           SUCCESS MESSAGE
        ===================================================== */

        .contact-success {
          padding: 35px;

          text-align: center;

          background: var(--secondary);

          border: 1px solid var(--border);

          border-radius: 20px;
        }

        .contact-success-icon {
          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: 0 auto 18px;

          border-radius: 50%;

          background: var(--primary);

          color: var(--primary-foreground);
        }

        .contact-success-icon .material-symbols-outlined {
          font-size: 27px;
        }

        .contact-success h3 {
          margin-bottom: 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.5rem;
        }

        .contact-success p {
          color: var(--muted-foreground);

          font-size: 0.8rem;

          line-height: 1.7;
        }

        /* =====================================================
           FAQ CTA
        ===================================================== */

        .contact-faq {
          padding: 0 0 100px;
        }

        .contact-faq-box {
          padding: 48px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 35px;

          border-radius: 25px;

          background:
            linear-gradient(
              135deg,
              #2a4d3a,
              #1e3d2f
            );

          color: white;
        }

        .contact-faq-box h2 {
          color: white;

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          line-height: 1.03;
        }

        .contact-faq-box p {
          margin-top: 9px;

          color: rgba(255,255,255,0.68);

          font-size: 0.8rem;
        }

        .contact-faq-button {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          flex-shrink: 0;

          padding: 13px 21px;

          border-radius: 999px;

          background: white;

          color: var(--primary);

          font-size: 0.78rem;

          font-weight: 700;

          text-decoration: none;

          transition: transform 0.2s ease;
        }

        .contact-faq-button:hover {
          transform: translateY(-2px);
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1050px) {

          .contact-hero-inner {
            gap: 45px;
          }

          .contact-support-grid {
            grid-template-columns: 1fr 1fr;
          }

          .contact-form-layout {
            gap: 45px;
          }
        }

        @media (max-width: 850px) {

          .contact-hero {
            padding: 120px 0 70px;
          }

          .contact-hero-inner {
            grid-template-columns: 1fr;
          }

          .contact-info-card {
            max-width: 650px;
          }

          .contact-form-layout {
            grid-template-columns: 1fr;
          }

          .contact-form-intro {
            position: static;
          }
        }

        @media (max-width: 700px) {

          .contact-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .contact-hero-description {
            font-size: 0.87rem;
          }

          .contact-support {
            padding: 75px 0;
          }

          .contact-support-grid {
            grid-template-columns: 1fr;
          }

          .contact-form-section {
            padding: 75px 0;
          }

          .contact-form-row {
            grid-template-columns: 1fr;
          }

          .contact-form-card {
            padding: 25px 20px;
          }

          .contact-faq {
            padding-bottom: 70px;
          }

          .contact-faq-box {
            flex-direction: column;

            align-items: flex-start;

            padding: 35px 25px;

            border-radius: 22px;
          }

          .contact-faq-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {

          .contact-hero {
            padding-top: 105px;
          }

          .contact-hero h1 {
            font-size: 2.65rem;
          }

          .contact-info-card {
            padding: 24px;
          }

          .contact-form-intro h2 {
            font-size: 2.2rem;
          }

          .contact-section-heading h2 {
            font-size: 2.2rem;
          }
        }
      `}</style>

      <div className="contact-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="contact-hero">
          <div className="container contact-hero-inner">
            <div>
              <span className="contact-badge">
                <span className="material-symbols-outlined">chat</span>
                Contact ReOrbit
              </span>

              <h1>
                Let&apos;s keep your
                <em> orbit moving.</em>
              </h1>

              <p className="contact-hero-description">
                Need help with a listing, purchase, donation, pickup, ReMaker or
                something else? Tell us what&apos;s going on and we&apos;ll help
                you find the right next step.
              </p>
            </div>

            <div className="contact-info-card">
              <h2>How can we help?</h2>

              <p>
                Choose the option that best matches what you need. For account
                or transaction questions, include as much relevant information
                as possible.
              </p>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <span className="material-symbols-outlined">schedule</span>
                </div>

                <div>
                  <strong>Support</strong>

                  <span>
                    Send us a message anytime through the contact form.
                  </span>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <span className="material-symbols-outlined">
                    shopping_bag
                  </span>
                </div>

                <div>
                  <strong>Marketplace help</strong>

                  <span>
                    Questions about buying, selling or listing an item?
                  </span>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <span className="material-symbols-outlined">handyman</span>
                </div>

                <div>
                  <strong>ReMaker support</strong>

                  <span>Need help with your ReMaker profile or creations?</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SUPPORT OPTIONS
        ===================================================== */}

        <section className="contact-support">
          <div className="container">
            <div className="contact-section-heading">
              <span className="contact-eyebrow">Find the right support</span>

              <h2>Whatever your orbit, we&apos;re here.</h2>

              <p>
                ReOrbit connects users, products and ReMakers. Here are some of
                the most common reasons people reach out to us.
              </p>
            </div>

            <div className="contact-support-grid">
              <article className="contact-support-card">
                <div className="contact-support-icon">
                  <span className="material-symbols-outlined">storefront</span>
                </div>

                <h3>Marketplace</h3>

                <p>
                  Questions about finding products, viewing listings, buying or
                  understanding item details.
                </p>

                <a href="/marketplace">
                  Visit marketplace
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </article>

              <article className="contact-support-card">
                <div className="contact-support-icon">
                  <span className="material-symbols-outlined">sell</span>
                </div>

                <h3>List an item</h3>

                <p>
                  Need help selling or donating something you no longer need? We
                  can help you understand the process.
                </p>

                <a href="/marketplace">
                  Start here
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </article>

              <article className="contact-support-card">
                <div className="contact-support-icon">
                  <span className="material-symbols-outlined">handyman</span>
                </div>

                <h3>ReMakers</h3>

                <p>
                  Learn about ReMakers, their work and the creations available
                  through the ReOrbit ecosystem.
                </p>

                <a href="/remakers">
                  Meet ReMakers
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </article>

              <article className="contact-support-card">
                <div className="contact-support-icon">
                  <span className="material-symbols-outlined">help</span>
                </div>

                <h3>General help</h3>

                <p>
                  Can&apos;t find what you&apos;re looking for? Check our
                  frequently asked questions.
                </p>

                <a href="/faq">
                  Browse FAQ
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================
            FORM
        ===================================================== */}

        <section className="contact-form-section">
          <div className="container contact-form-layout">
            <div className="contact-form-intro">
              <span className="contact-eyebrow">Send a message</span>

              <h2>Tell us what&apos;s happening.</h2>

              <p>
                Whether something went wrong or you simply need guidance, send
                us the details and our team can help you work through it.
              </p>

              <div className="contact-response-note">
                <span className="material-symbols-outlined">info</span>

                <p>
                  For questions about a specific listing or transaction, include
                  the item name or relevant details so we can understand the
                  situation faster.
                </p>
              </div>
            </div>

            <div className="contact-form-card">
              {!submitted ? (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="contact-form-row">
                    <div className="contact-field">
                      <label htmlFor="name">Your name</label>

                      <input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        required
                      />
                    </div>

                    <div className="contact-field">
                      <label htmlFor="email">Email address</label>

                      <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="topic">What can we help with?</label>

                    <select id="topic" required defaultValue="">
                      <option value="" disabled>
                        Select a topic
                      </option>

                      <option value="marketplace">Marketplace</option>

                      <option value="purchase">Purchase / order</option>

                      <option value="listing">Listing an item</option>

                      <option value="donation">Donation</option>

                      <option value="pickup">Pickup / delivery</option>

                      <option value="remaker">ReMaker</option>

                      <option value="account">Account</option>

                      <option value="technical">Technical issue</option>

                      <option value="other">Something else</option>
                    </select>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="subject">Subject</label>

                    <input
                      id="subject"
                      type="text"
                      placeholder="What is this about?"
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="message">Message</label>

                    <textarea
                      id="message"
                      placeholder="Tell us a little more..."
                      required
                    />
                  </div>

                  <button type="submit" className="contact-submit">
                    Send message
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </button>
                </form>
              ) : (
                <div className="contact-success">
                  <div className="contact-success-icon">
                    <span className="material-symbols-outlined">check</span>
                  </div>

                  <h3>Message received.</h3>

                  <p>
                    Thanks for reaching out to ReOrbit. Your message has been
                    submitted successfully. We&apos;ll help you find the next
                    step.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            FAQ CTA
        ===================================================== */}

        <section className="contact-faq">
          <div className="container">
            <div className="contact-faq-box">
              <div>
                <h2>Maybe your answer is already here.</h2>

                <p>
                  Browse common questions about ReOrbit, marketplace listings,
                  purchases and ReMakers.
                </p>
              </div>

              <a href="/faq" className="contact-faq-button">
                Explore FAQ
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
