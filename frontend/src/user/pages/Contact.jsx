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
          padding: 145px 0 75px;

          text-align: center;
        }

        .contact-hero-inner {
          max-width: 800px;

          margin: 0 auto;
        }

        .contact-badge {
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

        .contact-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .contact-hero h1 {
          margin: 25px auto 18px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);

          line-height: 0.98;

          letter-spacing: -0.055em;
        }

        .contact-hero h1 em {
          color: var(--leaf);

          font-style: normal;
        }

        .contact-hero p {
          max-width: 620px;

          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 0.98rem;

          line-height: 1.75;
        }

        /* =====================================================
           CONTACT CONTENT
        ===================================================== */

        .contact-content {
          padding: 25px 0 110px;
        }

        .contact-grid {
          display: grid;

          grid-template-columns: 0.8fr 1.2fr;

          gap: 55px;

          max-width: 1100px;

          margin: 0 auto;

          align-items: start;
        }

        /* =====================================================
           LEFT INFO
        ===================================================== */

        .contact-info {
          padding: 15px 0;
        }

        .contact-info h2 {
          margin-bottom: 15px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          line-height: 1.05;

          letter-spacing: -0.04em;
        }

        .contact-info > p {
          margin-bottom: 30px;

          color: var(--muted-foreground);

          font-size: 0.85rem;

          line-height: 1.75;
        }

        .contact-methods {
          display: flex;

          flex-direction: column;

          gap: 15px;
        }

        .contact-method {
          display: flex;

          align-items: center;

          gap: 13px;

          padding: 14px;

          border: 1px solid var(--border);

          border-radius: 15px;

          background: var(--card);
        }

        .contact-method-icon {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--secondary);

          color: var(--primary);
        }

        .contact-method-icon .material-symbols-outlined {
          font-size: 20px;
        }

        .contact-method strong {
          display: block;

          margin-bottom: 3px;

          color: var(--primary);

          font-size: 0.75rem;
        }

        .contact-method span {
          color: var(--muted-foreground);

          font-size: 0.7rem;
        }

        /* =====================================================
           FORM
        ===================================================== */

        .contact-form-card {
          padding: 35px;

          background: var(--card);

          border: 1.5px solid var(--border);

          border-radius: 24px;

          box-shadow:
            0 8px 30px rgba(42, 77, 58, 0.06);
        }

        .contact-form-card h3 {
          margin-bottom: 7px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.6rem;
        }

        .contact-form-card > p {
          margin-bottom: 25px;

          color: var(--muted-foreground);

          font-size: 0.75rem;

          line-height: 1.6;
        }

        .contact-form {
          display: flex;

          flex-direction: column;

          gap: 16px;
        }

        .contact-field-row {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 14px;
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

          padding: 12px 13px;

          border: 1px solid var(--border);

          border-radius: 10px;

          outline: none;

          background: var(--background);

          color: var(--foreground);

          font-family: var(--font-sans);

          font-size: 0.78rem;

          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .contact-field textarea {
          min-height: 125px;

          resize: vertical;
        }

        .contact-field input:focus,
        .contact-field select:focus,
        .contact-field textarea:focus {
          border-color: var(--primary);

          box-shadow:
            0 0 0 3px rgba(42, 77, 58, 0.08);
        }

        .contact-submit {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          margin-top: 4px;

          padding: 12px 20px;

          border: 0;

          border-radius: 999px;

          background: var(--primary);

          color: var(--primary-foreground);

          font-family: var(--font-sans);

          font-size: 0.78rem;

          font-weight: 700;

          cursor: pointer;

          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .contact-submit:hover {
          background: #1e3d2f;

          transform: translateY(-1px);
        }

        /* =====================================================
           SUCCESS
        ===================================================== */

        .contact-success {
          padding: 40px 25px;

          text-align: center;
        }

        .contact-success-icon {
          width: 60px;
          height: 60px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin: 0 auto 20px;

          border-radius: 50%;

          background: var(--secondary);

          color: var(--primary);
        }

        .contact-success-icon .material-symbols-outlined {
          font-size: 28px;
        }

        .contact-success h3 {
          margin-bottom: 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.7rem;
        }

        .contact-success p {
          color: var(--muted-foreground);

          font-size: 0.8rem;

          line-height: 1.7;
        }

        /* =====================================================
           BOTTOM NOTE
        ===================================================== */

        .contact-note {
          max-width: 1100px;

          margin: 45px auto 0;

          padding: 20px;

          border-radius: 15px;

          background: var(--secondary);

          border: 1px solid var(--border);

          display: flex;

          align-items: center;

          gap: 12px;
        }

        .contact-note .material-symbols-outlined {
          color: var(--primary);

          font-size: 21px;
        }

        .contact-note p {
          color: var(--muted-foreground);

          font-size: 0.72rem;

          line-height: 1.6;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 850px) {

          .contact-grid {
            grid-template-columns: 1fr;

            gap: 40px;
          }

          .contact-info {
            max-width: 650px;
          }
        }

        @media (max-width: 700px) {

          .contact-hero {
            padding: 120px 0 65px;
          }

          .contact-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .contact-hero p {
            font-size: 0.88rem;
          }

          .contact-content {
            padding-bottom: 75px;
          }

          .contact-form-card {
            padding: 25px 20px;
          }

          .contact-field-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {

          .contact-hero {
            padding-top: 105px;
          }

          .contact-hero h1 {
            font-size: 2.65rem;
          }

          .contact-info h2 {
            font-size: 2.2rem;
          }

          .contact-method {
            padding: 12px;
          }

          .contact-note {
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="contact-page">
        <Navbar />

        {/* HERO */}
        <section className="contact-hero">
          <div className="container contact-hero-inner">
            <span className="contact-badge">
              <span className="material-symbols-outlined">mail</span>
              Contact ReOrbit
            </span>

            <h1>
              Let's keep the
              <em> conversation moving.</em>
            </h1>

            <p>
              Have a question, suggestion or need help with something? We're
              here to help.
            </p>
          </div>
        </section>

        {/* CONTENT */}
        <section className="contact-content">
          <div className="container">
            <div className="contact-grid">
              {/* INFO */}
              <div className="contact-info">
                <h2>How can we help?</h2>

                <p>
                  Whether you're listing an item, looking for something special,
                  joining the ReMaker community or simply have a question about
                  ReOrbit, send us a message.
                </p>

                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="contact-method-icon">
                      <span className="material-symbols-outlined">mail</span>
                    </div>

                    <div>
                      <strong>Email</strong>

                      <span>hello@reorbit.in</span>
                    </div>
                  </div>

                  <div className="contact-method">
                    <div className="contact-method-icon">
                      <span className="material-symbols-outlined">
                        schedule
                      </span>
                    </div>

                    <div>
                      <strong>Support hours</strong>

                      <span>Monday – Friday · 10 AM – 6 PM</span>
                    </div>
                  </div>

                  <div className="contact-method">
                    <div className="contact-method-icon">
                      <span className="material-symbols-outlined">help</span>
                    </div>

                    <div>
                      <strong>Quick answers</strong>

                      <span>Check our FAQ for common questions</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM */}
              <div className="contact-form-card">
                {submitted ? (
                  <div className="contact-success">
                    <div className="contact-success-icon">
                      <span className="material-symbols-outlined">check</span>
                    </div>

                    <h3>Message received.</h3>

                    <p>
                      Thanks for reaching out. Our team will review your message
                      and get back to you.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3>Send us a message</h3>

                    <p>
                      Fill in the details below and tell us what you need help
                      with.
                    </p>

                    <form className="contact-form" onSubmit={handleSubmit}>
                      <div className="contact-field-row">
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

                        <select id="topic" defaultValue="" required>
                          <option value="" disabled>
                            Select a topic
                          </option>

                          <option value="listing">Listing an item</option>

                          <option value="marketplace">Marketplace</option>

                          <option value="pickup">Pickup</option>

                          <option value="remaker">ReMaker</option>

                          <option value="account">Account</option>

                          <option value="other">Something else</option>
                        </select>
                      </div>

                      <div className="contact-field">
                        <label htmlFor="message">Message</label>

                        <textarea
                          id="message"
                          placeholder="Tell us what's on your mind..."
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
                  </>
                )}
              </div>
            </div>

            <div className="contact-note">
              <span className="material-symbols-outlined">lock</span>

              <p>
                Your information is only used to respond to your request and
                provide support.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
