import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Privacy() {
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

            <div className="privacy-updated">Last updated: August 2026</div>
          </div>
        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="privacy-content">
          <div className="container privacy-layout">
            {/* SIDEBAR */}

            <aside className="privacy-sidebar">
              <span className="privacy-sidebar-label">On this page</span>

              <a href="#overview">Overview</a>
              <a href="#information">Information we collect</a>
              <a href="#usage">How we use information</a>
              <a href="#sharing">Information sharing</a>
              <a href="#listings">Listings & content</a>
              <a href="#security">Data security</a>
              <a href="#retention">Data retention</a>
              <a href="#choices">Your choices</a>
              <a href="#children">Children's privacy</a>
              <a href="#changes">Policy changes</a>
              <a href="#contact">Contact us</a>
            </aside>

            {/* POLICY */}

            <main>
              {/* OVERVIEW */}

              <section className="privacy-section" id="overview">
                <h2>1. Overview</h2>

                <p>
                  ReOrbit is a circular marketplace designed to help people
                  sell, donate and discover items while creating opportunities
                  for rescued materials to be reused by ReMakers.
                </p>

                <p>
                  This Privacy Policy explains how information may be collected
                  and used when you use the ReOrbit website, marketplace and
                  related services.
                </p>

                <div className="privacy-highlight">
                  <strong>Our approach</strong>

                  <p>
                    We aim to collect information that is relevant to providing
                    and improving ReOrbit, while treating your information
                    responsibly and transparently.
                  </p>
                </div>
              </section>

              {/* INFORMATION */}

              <section className="privacy-section" id="information">
                <h2>2. Information we collect</h2>

                <p>
                  Depending on how you use ReOrbit, we may collect information
                  needed to create your account, manage listings, support
                  transactions and provide platform services.
                </p>

                <h3>Account information</h3>

                <ul>
                  <li>Name or display name</li>
                  <li>Email address</li>
                  <li>Account credentials</li>
                  <li>Profile information you choose to provide</li>
                </ul>

                <h3>Listing information</h3>

                <ul>
                  <li>Item name and description</li>
                  <li>Category and condition</li>
                  <li>Images uploaded with a listing</li>
                  <li>Price or donation information</li>
                  <li>Relevant item details provided by you</li>
                </ul>

                <h3>Transaction and service information</h3>

                <ul>
                  <li>Purchase or listing activity</li>
                  <li>Donation activity</li>
                  <li>Pickup-related information</li>
                  <li>Order and transaction status</li>
                  <li>Information provided when contacting support</li>
                </ul>
              </section>

              {/* USAGE */}

              <section className="privacy-section" id="usage">
                <h2>3. How we use information</h2>

                <p>
                  Information collected through ReOrbit may be used to operate
                  the platform and provide the services you request.
                </p>

                <ul>
                  <li>Create and manage your ReOrbit account.</li>

                  <li>Publish and manage listings you submit.</li>

                  <li>Help buyers discover relevant products and items.</li>

                  <li>Support purchases, donations and related activities.</li>

                  <li>Coordinate supported pickup and delivery services.</li>

                  <li>Maintain ReMaker profiles and product information.</li>

                  <li>Respond to questions, requests and support issues.</li>

                  <li>
                    Improve the usability, reliability and functionality of
                    ReOrbit.
                  </li>

                  <li>
                    Detect misuse, suspicious activity or violations of platform
                    rules.
                  </li>
                </ul>
              </section>

              {/* SHARING */}

              <section className="privacy-section" id="sharing">
                <h2>4. Information sharing</h2>

                <p>
                  ReOrbit does not intend to make your private account
                  information publicly available simply because you use the
                  platform.
                </p>

                <p>
                  Some information is naturally required for marketplace
                  functionality. For example, information included in a public
                  listing may be visible to other users so they can understand
                  and evaluate the item.
                </p>

                <h3>Service providers</h3>

                <p>
                  Where necessary to operate ReOrbit, information may be
                  processed by service providers supporting functions such as
                  hosting, communication, payment processing or pickup services.
                </p>

                <h3>Legal and safety requirements</h3>

                <p>
                  Information may also be disclosed where reasonably necessary
                  to comply with applicable law, respond to lawful requests,
                  protect users, or investigate misuse of the platform.
                </p>
              </section>

              {/* LISTINGS */}

              <section className="privacy-section" id="listings">
                <h2>5. Listings and user content</h2>

                <p>
                  When you create a listing, information that you intentionally
                  provide as part of that listing may be displayed to other
                  ReOrbit users.
                </p>

                <p>
                  This can include item descriptions, photographs, category
                  information, condition details and other information necessary
                  to present the listing.
                </p>

                <div className="privacy-highlight">
                  <strong>Before publishing</strong>

                  <p>
                    Avoid including unnecessary personal information in item
                    descriptions, photographs or other public listing content.
                  </p>
                </div>
              </section>

              {/* SECURITY */}

              <section className="privacy-section" id="security">
                <h2>6. Data security</h2>

                <p>
                  We take reasonable steps to protect information handled
                  through ReOrbit against unauthorized access, misuse,
                  alteration or loss.
                </p>

                <p>
                  However, no internet-based service can guarantee that
                  information will always remain completely secure. Users should
                  also take reasonable precautions to protect their account
                  credentials.
                </p>
              </section>

              {/* RETENTION */}

              <section className="privacy-section" id="retention">
                <h2>7. Data retention</h2>

                <p>
                  We may retain information for as long as reasonably necessary
                  to provide ReOrbit services, maintain records, resolve
                  disputes, meet legal requirements and protect the platform.
                </p>

                <p>
                  When information is no longer reasonably required for these
                  purposes, it may be deleted, anonymized or otherwise handled
                  according to applicable requirements.
                </p>
              </section>

              {/* CHOICES */}

              <section className="privacy-section" id="choices">
                <h2>8. Your choices</h2>

                <p>
                  Depending on the features available to you, you may have
                  choices regarding your account information and content.
                </p>

                <ul>
                  <li>
                    Review or update information associated with your account.
                  </li>

                  <li>
                    Manage or remove listings you have created where supported.
                  </li>

                  <li>
                    Contact ReOrbit regarding questions about your information.
                  </li>

                  <li>
                    Request assistance regarding account-related information.
                  </li>
                </ul>

                <p>
                  Some information may need to be retained where required for
                  legitimate operational, security or legal purposes.
                </p>
              </section>

              {/* CHILDREN */}

              <section className="privacy-section" id="children">
                <h2>9. Children's privacy</h2>

                <p>
                  ReOrbit is not designed to knowingly collect personal
                  information from children without appropriate authorization.
                  If you believe a child has provided personal information
                  through the platform, please contact us so the situation can
                  be reviewed.
                </p>
              </section>

              {/* CHANGES */}

              <section className="privacy-section" id="changes">
                <h2>10. Changes to this policy</h2>

                <p>
                  ReOrbit may update this Privacy Policy when the platform, its
                  features or applicable requirements change.
                </p>

                <p>
                  When changes are made, the updated version will be published
                  on this page with a revised update date.
                </p>
              </section>

              {/* CONTACT */}

              <section className="privacy-section" id="contact">
                <h2>11. Contact us</h2>

                <p>
                  If you have questions about this Privacy Policy or how
                  information is handled on ReOrbit, you can contact our support
                  team.
                </p>

                <div className="privacy-contact">
                  <div>
                    <h3>Have a privacy question?</h3>

                    <p>
                      We're happy to help clarify how your information is
                      handled.
                    </p>
                  </div>

                  <a href="/contact" className="privacy-contact-button">
                    Contact us
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </section>
            </main>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
