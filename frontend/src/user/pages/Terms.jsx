import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Terms() {
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

            <div className="terms-updated">Last updated: August 2026</div>
          </div>
        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="terms-content">
          <div className="container terms-layout">
            {/* SIDEBAR */}

            <aside className="terms-sidebar">
              <span className="terms-sidebar-label">On this page</span>

              <a href="#acceptance">Acceptance</a>

              <a href="#platform">ReOrbit platform</a>

              <a href="#accounts">Accounts</a>

              <a href="#listings">Listings</a>

              <a href="#buying">Buying</a>

              <a href="#selling">Selling</a>

              <a href="#donations">Donations</a>

              <a href="#remakers">ReMakers</a>

              <a href="#pickup">Pickup & delivery</a>

              <a href="#payments">Payments</a>

              <a href="#prohibited">Prohibited use</a>

              <a href="#content">User content</a>

              <a href="#suspension">Account suspension</a>

              <a href="#responsibility">Platform responsibility</a>

              <a href="#changes">Changes</a>

              <a href="#contact">Contact</a>
            </aside>

            {/* TERMS */}

            <main>
              {/* 1 */}

              <section className="terms-section" id="acceptance">
                <h2>1. Acceptance of these terms</h2>

                <p>
                  By accessing or using ReOrbit, you agree to follow these Terms
                  & Conditions and any applicable rules, policies or guidelines
                  presented through the platform.
                </p>

                <p>
                  If you do not agree with these terms, you should not use
                  ReOrbit or its related services.
                </p>
              </section>

              {/* 2 */}

              <section className="terms-section" id="platform">
                <h2>2. About the ReOrbit platform</h2>

                <p>
                  ReOrbit is a circular marketplace that connects people who
                  have items they no longer need with people who may want to
                  buy, receive or reuse them.
                </p>

                <p>
                  The platform also supports ReMakers who source suitable
                  materials and create new products from rescued or recovered
                  items.
                </p>

                <div className="terms-highlight">
                  <strong>ReOrbit's role</strong>

                  <p>
                    ReOrbit provides the platform and supporting infrastructure
                    for these activities. Individual users and ReMakers remain
                    responsible for the information, products and content they
                    submit.
                  </p>
                </div>
              </section>

              {/* 3 */}

              <section className="terms-section" id="accounts">
                <h2>3. User accounts</h2>

                <p>
                  Certain ReOrbit features may require you to create an account
                  and provide accurate information.
                </p>

                <ul>
                  <li>
                    You should provide truthful and reasonably accurate account
                    information.
                  </li>

                  <li>
                    You are responsible for keeping your login credentials
                    secure.
                  </li>

                  <li>
                    You should not knowingly allow another person to misuse your
                    account.
                  </li>

                  <li>
                    You should notify ReOrbit if you believe your account has
                    been accessed without authorization.
                  </li>
                </ul>
              </section>

              {/* 4 */}

              <section className="terms-section" id="listings">
                <h2>4. Creating listings</h2>

                <p>
                  Users may create listings for eligible items according to the
                  functionality and rules provided by ReOrbit.
                </p>

                <h3>Listing information</h3>

                <p>
                  When creating a listing, you are responsible for providing
                  clear and honest information about the item.
                </p>

                <ul>
                  <li>Item name and category</li>

                  <li>Condition and relevant defects</li>

                  <li>Accurate photographs</li>

                  <li>Appropriate pricing information</li>

                  <li>Other details reasonably required by the platform</li>
                </ul>

                <p>
                  Misleading descriptions, false claims or intentionally hiding
                  important defects are not permitted.
                </p>
              </section>

              {/* 5 */}

              <section className="terms-section" id="buying">
                <h2>5. Buying products</h2>

                <p>
                  Users may browse eligible listings and purchase available
                  products through the marketplace.
                </p>

                <p>
                  Product availability, pricing, condition and applicable
                  service information should be reviewed before completing a
                  purchase.
                </p>

                <p>
                  ReOrbit may provide marketplace infrastructure, while the
                  actual condition and description of an item remain the
                  responsibility of the relevant seller or ReMaker.
                </p>
              </section>

              {/* 6 */}

              <section className="terms-section" id="selling">
                <h2>6. Selling items</h2>

                <p>
                  Users who list items for sale must have the right to offer
                  those items through ReOrbit.
                </p>

                <ul>
                  <li>
                    Do not list items that you do not have the right to sell.
                  </li>

                  <li>
                    Do not intentionally misrepresent an item's condition or
                    ownership.
                  </li>

                  <li>Do not use misleading photographs or descriptions.</li>

                  <li>
                    Do not attempt to manipulate marketplace transactions or
                    ratings.
                  </li>
                </ul>
              </section>

              {/* 7 */}

              <section className="terms-section" id="donations">
                <h2>7. Donations</h2>

                <p>
                  ReOrbit may provide donation-related functionality for
                  eligible items and supported locations.
                </p>

                <p>
                  Donated items may be routed through the appropriate ReOrbit
                  process, including recovery, storage, refurbishment or other
                  approved reuse pathways.
                </p>

                <p>
                  Submission of an item for donation does not guarantee that the
                  item will be refurbished, resold or used in a particular way.
                </p>
              </section>

              {/* 8 */}

              <section className="terms-section" id="remakers">
                <h2>8. ReMakers and their creations</h2>

                <p>
                  ReMakers are creators who work with rescued, recovered or
                  overlooked materials and transform them into new products.
                </p>

                <p>
                  ReMakers may create profiles, showcase their work, source
                  materials and offer eligible finished creations through
                  ReOrbit.
                </p>

                <h3>ReMaker responsibilities</h3>

                <ul>
                  <li>Provide accurate information about creations.</li>

                  <li>
                    Clearly represent the materials and condition of products
                    where relevant.
                  </li>

                  <li>Maintain appropriate product and listing information.</li>

                  <li>Follow applicable marketplace rules.</li>
                </ul>
              </section>

              {/* 9 */}

              <section className="terms-section" id="pickup">
                <h2>9. Pickup and delivery</h2>

                <p>
                  ReOrbit may support pickup and delivery for eligible items and
                  supported locations.
                </p>

                <p>
                  Availability, timing and applicable charges may depend on the
                  item, location and service selected.
                </p>

                <p>
                  Users are responsible for providing accurate information
                  required to complete a supported pickup or delivery.
                </p>
              </section>

              {/* 10 */}

              <section className="terms-section" id="payments">
                <h2>10. Payments and transactions</h2>

                <p>
                  Where payment functionality is available, users must provide
                  accurate information and complete transactions through the
                  supported payment process.
                </p>

                <p>
                  Prices, applicable charges and relevant transaction
                  information should be reviewed before confirmation.
                </p>

                <div className="terms-highlight">
                  <strong>Transaction information</strong>

                  <p>
                    ReOrbit may maintain transaction records to support order
                    management, customer support, dispute handling, security and
                    applicable operational requirements.
                  </p>
                </div>
              </section>

              {/* 11 */}

              <section className="terms-section" id="prohibited">
                <h2>11. Prohibited activities</h2>

                <p>
                  Users must not use ReOrbit to engage in unlawful, fraudulent,
                  abusive or misleading activity.
                </p>

                <ul>
                  <li>Fraudulent or deceptive listings</li>

                  <li>Selling items without the right to sell them</li>

                  <li>Uploading stolen or unlawfully obtained property</li>

                  <li>Providing intentionally false information</li>

                  <li>Attempting to bypass platform safeguards</li>

                  <li>Harassing, threatening or abusing other users</li>

                  <li>Uploading harmful or malicious content</li>

                  <li>
                    Using the platform for activities prohibited by applicable
                    law
                  </li>
                </ul>
              </section>

              {/* 12 */}

              <section className="terms-section" id="content">
                <h2>12. User content</h2>

                <p>
                  Users may submit photographs, descriptions, profile
                  information, reviews and other content through ReOrbit.
                </p>

                <p>
                  You remain responsible for the content you submit and should
                  ensure that you have the necessary rights to use photographs,
                  text and other material.
                </p>

                <p>
                  By submitting content to the platform, you allow ReOrbit to
                  use that content as reasonably necessary to operate, display
                  and promote the relevant marketplace functionality.
                </p>
              </section>

              {/* 13 */}

              <section className="terms-section" id="suspension">
                <h2>13. Account suspension or removal</h2>

                <p>
                  ReOrbit may restrict, suspend or remove accounts, listings or
                  content where reasonably necessary to protect users, maintain
                  platform integrity or enforce these terms.
                </p>

                <p>
                  This may include situations involving fraudulent activity,
                  repeated violations, prohibited content, misuse of the
                  platform or security concerns.
                </p>
              </section>

              {/* 14 */}

              <section className="terms-section" id="responsibility">
                <h2>14. Platform responsibility</h2>

                <p>
                  ReOrbit aims to provide a reliable marketplace and useful
                  tools for users and ReMakers. However, the platform cannot
                  guarantee that every listing, product, user or transaction
                  will always meet a particular expectation.
                </p>

                <p>
                  Users should review relevant item information, transaction
                  details and seller or ReMaker information before proceeding.
                </p>

                <div className="terms-important">
                  <strong>Use reasonable judgment</strong>

                  <p>
                    ReOrbit encourages transparent listings and responsible
                    transactions, but users should make informed decisions based
                    on the information available to them.
                  </p>
                </div>
              </section>

              {/* 15 */}

              <section className="terms-section" id="changes">
                <h2>15. Changes to these terms</h2>

                <p>
                  ReOrbit may update these Terms & Conditions when the platform,
                  its features, services or applicable requirements change.
                </p>

                <p>
                  Updated terms will be published on this page with a revised
                  update date. Continued use of ReOrbit after applicable changes
                  may constitute acceptance of the updated terms.
                </p>
              </section>

              {/* 16 */}

              <section className="terms-section" id="contact">
                <h2>16. Contact us</h2>

                <p>
                  If you have questions about these Terms & Conditions,
                  marketplace rules or your use of ReOrbit, our support team can
                  help.
                </p>

                <div className="terms-contact">
                  <div>
                    <h3>Need clarification?</h3>

                    <p>
                      Contact the ReOrbit team if you have questions about using
                      the platform.
                    </p>
                  </div>

                  <a href="/contact" className="terms-contact-button">
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
