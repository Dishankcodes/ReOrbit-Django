import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import PolicyContent, { policyDate } from "../../../shared/components/PolicyContent";
import { usePolicyText } from "../../../shared/content";

export default function Privacy() {
  const policy = usePolicyText("privacy");
  return (
    <>
      <style>{`
        /* =====================================================
           PRIVACY POLICY PAGE
        ===================================================== */

        .privacy-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .privacy-hero {
          padding: 145px 0 75px;
          text-align: center;
        }

        .privacy-hero-inner {
          max-width: 820px;
          margin: 0 auto;
        }

        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding: 8px 14px;

          border: 1px solid var(--border);
          border-radius: 999px;

          background: var(--secondary);
          color: var(--primary);

          font-size: 0.68rem;
          font-weight: 700;

          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .privacy-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .privacy-hero h1 {
          margin: 25px 0 18px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .privacy-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .privacy-hero p {
          max-width: 650px;
          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 0.95rem;
          line-height: 1.75;
        }

        .privacy-updated {
          margin-top: 18px;

          color: var(--muted-foreground);
          font-size: 0.7rem;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .privacy-content {
          padding: 20px 0 110px;
        }

        .privacy-layout {
          display: grid;

          grid-template-columns: 230px minmax(0, 780px);

          justify-content: center;

          gap: 70px;

          align-items: start;
        }

        /* =====================================================
           SIDEBAR
        ===================================================== */

        .privacy-sidebar {
          position: sticky;
          top: 105px;
        }

        .privacy-sidebar-label {
          display: block;

          margin-bottom: 15px;

          color: var(--muted-foreground);

          font-size: 0.65rem;
          font-weight: 800;

          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .privacy-sidebar a {
          display: block;

          padding: 9px 12px;
          margin-bottom: 3px;

          border-radius: 8px;

          color: var(--muted-foreground);

          font-size: 0.77rem;

          text-decoration: none;

          transition:
            color 0.15s ease,
            background 0.15s ease;
        }

        .privacy-sidebar a:hover {
          background: var(--secondary);
          color: var(--primary);
        }

        /* =====================================================
           POLICY SECTIONS
        ===================================================== */

        .privacy-section {
          padding-bottom: 42px;
          margin-bottom: 42px;

          border-bottom: 1px solid var(--border);
        }

        .privacy-section:last-child {
          border-bottom: 0;
          margin-bottom: 0;
        }

        .privacy-section h2 {
          margin-bottom: 15px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.65rem;

          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .privacy-section h3 {
          margin: 25px 0 9px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.05rem;
        }

        .privacy-section p {
          margin-bottom: 13px;

          color: var(--muted-foreground);

          font-size: 0.83rem;

          line-height: 1.8;
        }

        .privacy-section p:last-child {
          margin-bottom: 0;
        }

        .privacy-section ul {
          margin: 14px 0 0;
          padding-left: 20px;
        }

        .privacy-section li {
          margin-bottom: 9px;

          color: var(--muted-foreground);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        .privacy-section li::marker {
          color: var(--leaf);
        }

        /* =====================================================
           HIGHLIGHT BOX
        ===================================================== */

        .privacy-highlight {
          margin: 25px 0;

          padding: 22px 24px;

          background: var(--secondary);

          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .privacy-highlight strong {
          display: block;

          margin-bottom: 7px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 0.95rem;
        }

        .privacy-highlight p {
          margin: 0;

          font-size: 0.78rem;
        }

        /* =====================================================
           CONTACT CTA
        ===================================================== */

        .privacy-contact {
          margin-top: 15px;

          padding: 32px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 30px;

          background: var(--secondary);

          border: 1px solid var(--border);
          border-radius: 22px;
        }

        .privacy-contact h3 {
          margin-bottom: 6px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.4rem;
        }

        .privacy-contact p {
          margin: 0;

          color: var(--muted-foreground);

          font-size: 0.78rem;
          line-height: 1.6;
        }

        .privacy-contact-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          flex-shrink: 0;

          padding: 11px 18px;

          border-radius: 999px;

          background: var(--primary);
          color: var(--primary-foreground);

          font-size: 0.78rem;
          font-weight: 700;

          text-decoration: none;

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .privacy-contact-button:hover {
          background: #1e3d2f;
          transform: translateY(-1px);
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 900px) {

          .privacy-layout {
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .privacy-sidebar {
            position: static;

            display: flex;
            flex-wrap: wrap;

            gap: 6px;
          }

          .privacy-sidebar-label {
            width: 100%;
            margin-bottom: 5px;
          }

          .privacy-sidebar a {
            margin: 0;
            background: var(--secondary);
          }
        }

        @media (max-width: 700px) {

          .privacy-hero {
            padding: 120px 0 65px;
          }

          .privacy-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .privacy-hero p {
            font-size: 0.87rem;
          }

          .privacy-content {
            padding-bottom: 75px;
          }

          .privacy-section {
            padding-bottom: 35px;
            margin-bottom: 35px;
          }

          .privacy-section h2 {
            font-size: 1.45rem;
          }

          .privacy-section p,
          .privacy-section li {
            font-size: 0.78rem;
          }

          .privacy-contact {
            flex-direction: column;
            align-items: flex-start;

            padding: 27px 22px;
          }

          .privacy-contact-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {

          .privacy-hero {
            padding-top: 105px;
          }

          .privacy-hero h1 {
            font-size: 2.65rem;
          }

          .privacy-sidebar {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .privacy-sidebar a {
            font-size: 0.7rem;
          }

          .privacy-section h2 {
            font-size: 1.35rem;
          }

          .privacy-highlight {
            padding: 19px;
          }
        }
      `}</style>

      <div className="privacy-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="privacy-hero">
          <div className="container privacy-hero-inner">
            <span className="privacy-badge">
              <span className="material-symbols-outlined">lock</span>
              Privacy Policy
            </span>

            <h1>
              Your information deserves
              <em> a safe orbit.</em>
            </h1>

            <p>
              We want ReOrbit to be a place where people can give, discover, buy
              and create with confidence. This policy explains what information
              we collect, how we use it, and the choices available to you.
            </p>

            <div className="privacy-updated">
              Version {policy?.version} · Last updated: {policyDate(policy?.updatedAt)}
            </div>
          </div>
        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="privacy-content">
          <PolicyContent prefix="privacy" policy={policy} contactTitle="Questions about your data?" contactText="If you have questions about how your information is handled on ReOrbit, our support team can help." />
        </section>

        <Footer />
      </div>
    </>
  );
}
