import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import PolicyContent, { policyDate } from "../../../shared/components/PolicyContent";
import { usePolicyText } from "../../../shared/content";

export default function Terms() {
  const policy = usePolicyText("terms");
  return (
    <>
      <style>{`
        /* =====================================================
           TERMS & CONDITIONS PAGE
        ===================================================== */

        .terms-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .terms-hero {
          padding: 145px 0 75px;
          text-align: center;
        }

        .terms-hero-inner {
          max-width: 820px;
          margin: 0 auto;
        }

        .terms-badge {
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

        .terms-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .terms-hero h1 {
          margin: 25px 0 18px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);

          line-height: 0.98;

          letter-spacing: -0.055em;
        }

        .terms-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .terms-hero p {
          max-width: 650px;
          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 0.95rem;
          line-height: 1.75;
        }

        .terms-updated {
          margin-top: 18px;

          color: var(--muted-foreground);

          font-size: 0.7rem;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .terms-content {
          padding: 20px 0 110px;
        }

        .terms-layout {
          display: grid;

          grid-template-columns: 230px minmax(0, 780px);

          justify-content: center;

          gap: 70px;

          align-items: start;
        }

        /* =====================================================
           SIDEBAR
        ===================================================== */

        .terms-sidebar {
          position: sticky;
          top: 105px;
        }

        .terms-sidebar-label {
          display: block;

          margin-bottom: 15px;

          color: var(--muted-foreground);

          font-size: 0.65rem;
          font-weight: 800;

          letter-spacing: 0.1em;

          text-transform: uppercase;
        }

        .terms-sidebar a {
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

        .terms-sidebar a:hover {
          background: var(--secondary);

          color: var(--primary);
        }

        /* =====================================================
           TERMS SECTIONS
        ===================================================== */

        .terms-section {
          padding-bottom: 42px;

          margin-bottom: 42px;

          border-bottom: 1px solid var(--border);
        }

        .terms-section:last-child {
          border-bottom: 0;

          margin-bottom: 0;
        }

        .terms-section h2 {
          margin-bottom: 15px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.65rem;

          line-height: 1.15;

          letter-spacing: -0.03em;
        }

        .terms-section h3 {
          margin: 25px 0 9px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.05rem;
        }

        .terms-section p {
          margin-bottom: 13px;

          color: var(--muted-foreground);

          font-size: 0.83rem;

          line-height: 1.8;
        }

        .terms-section p:last-child {
          margin-bottom: 0;
        }

        .terms-section ul {
          margin: 14px 0 0;

          padding-left: 20px;
        }

        .terms-section li {
          margin-bottom: 9px;

          color: var(--muted-foreground);

          font-size: 0.82rem;

          line-height: 1.7;
        }

        .terms-section li::marker {
          color: var(--leaf);
        }

        /* =====================================================
           HIGHLIGHT BOX
        ===================================================== */

        .terms-highlight {
          margin: 25px 0;

          padding: 22px 24px;

          background: var(--secondary);

          border: 1px solid var(--border);

          border-radius: 16px;
        }

        .terms-highlight strong {
          display: block;

          margin-bottom: 7px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 0.95rem;
        }

        .terms-highlight p {
          margin: 0;

          font-size: 0.78rem;
        }

        /* =====================================================
           IMPORTANT BOX
        ===================================================== */

        .terms-important {
          margin: 25px 0;

          padding: 22px 24px;

          background: #f4ecec;

          border: 1px solid rgba(42, 77, 58, 0.16);

          border-radius: 16px;
        }

        .terms-important strong {
          display: block;

          margin-bottom: 7px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 0.95rem;
        }

        .terms-important p {
          margin: 0;

          color: var(--muted-foreground);

          font-size: 0.78rem;

          line-height: 1.7;
        }

        /* =====================================================
           CONTACT CTA
        ===================================================== */

        .terms-contact {
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

        .terms-contact h3 {
          margin-bottom: 6px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.4rem;
        }

        .terms-contact p {
          margin: 0;

          color: var(--muted-foreground);

          font-size: 0.78rem;

          line-height: 1.6;
        }

        .terms-contact-button {
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

        .terms-contact-button:hover {
          background: #1e3d2f;

          transform: translateY(-1px);
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 900px) {

          .terms-layout {
            grid-template-columns: 1fr;

            gap: 35px;
          }

          .terms-sidebar {
            position: static;

            display: flex;

            flex-wrap: wrap;

            gap: 6px;
          }

          .terms-sidebar-label {
            width: 100%;

            margin-bottom: 5px;
          }

          .terms-sidebar a {
            margin: 0;

            background: var(--secondary);
          }
        }

        @media (max-width: 700px) {

          .terms-hero {
            padding: 120px 0 65px;
          }

          .terms-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .terms-hero p {
            font-size: 0.87rem;
          }

          .terms-content {
            padding-bottom: 75px;
          }

          .terms-section {
            padding-bottom: 35px;

            margin-bottom: 35px;
          }

          .terms-section h2 {
            font-size: 1.45rem;
          }

          .terms-section p,
          .terms-section li {
            font-size: 0.78rem;
          }

          .terms-contact {
            flex-direction: column;

            align-items: flex-start;

            padding: 27px 22px;
          }

          .terms-contact-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {

          .terms-hero {
            padding-top: 105px;
          }

          .terms-hero h1 {
            font-size: 2.65rem;
          }

          .terms-sidebar {
            display: grid;

            grid-template-columns: 1fr 1fr;
          }

          .terms-sidebar a {
            font-size: 0.7rem;
          }

          .terms-section h2 {
            font-size: 1.35rem;
          }

          .terms-highlight,
          .terms-important {
            padding: 19px;
          }
        }
      `}</style>

      <div className="terms-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="terms-hero">
          <div className="container terms-hero-inner">
            <span className="terms-badge">
              <span className="material-symbols-outlined">description</span>
              Terms & Conditions
            </span>

            <h1>
              A better marketplace
              <em> starts with trust.</em>
            </h1>

            <p>
              These terms explain the rules for using ReOrbit, creating
              listings, buying products, donating items, working as a ReMaker
              and using the services provided through the platform.
            </p>

            <div className="terms-updated">
              Version {policy?.version} · Last updated: {policyDate(policy?.updatedAt)}
            </div>
          </div>
        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="terms-content">
          <PolicyContent prefix="terms" policy={policy} contactTitle="Need clarification?" contactText="If you have questions about these terms, marketplace rules or your use of ReOrbit, our support team can help." />
        </section>

        <Footer />
      </div>
    </>
  );
}
