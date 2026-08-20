import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const faqGroups = [
  {
    title: "Getting started",
    questions: [
      {
        question: "What is ReOrbit?",
        answer:
          "ReOrbit is a circular marketplace where people can sell, donate,  and discover items that deserve another chance. It also connects rescued materials with ReMakers who can transform them into new creations.",
      },
      {
        question: "Who can use ReOrbit?",
        answer:
          "ReOrbit is designed for households looking to give away or sell things they no longer use, buyers looking for verified and refurbished products, and ReMakers who want to source materials and sell their creations.",
      },
      {
        question: "How do I get started?",
        answer:
          "Create an account and explore the marketplace, list an item, or discover the ReMaker community. You can choose the path that works best for you.",
      },
    ],
  },
  {
    title: "Listings & marketplace",
    questions: [
      {
        question: "How do I list an item?",
        answer:
          "Choose the listing option, add photos and item details, describe its condition and submit the listing. Clear and honest information helps buyers understand exactly what they are getting.",
      },
      {
        question: "Can I donate an item instead of selling it?",
        answer:
          "Yes. ReOrbit supports different ways of giving items another life, including donation and material recovery where available.",
      },
      {
        question: "Are marketplace items verified?",
        answer:
          "ReOrbit focuses on clear item information and verified listings. Condition details and relevant history are provided to help buyers make informed decisions.",
      },
      {
        question: "Can I  an item?",
        answer:
          "Yes.  is one of the ways ReOrbit encourages people to keep useful objects moving instead of leaving them unused.",
      },
    ],
  },
  {
    title: "Pickup & delivery",
    questions: [
      {
        question: "Is pickup available?",
        answer:
          "Pickup support is available in supported pincodes. Availability and applicable charges can depend on the item and location.",
      },
      {
        question: "How does pickup work?",
        answer:
          "Once a supported pickup is arranged, the item can be collected from the provided location according to the pickup details shown during the process.",
      },
      {
        question: "Are there pickup charges?",
        answer:
          "Pickup charges can apply depending on the location and item. Any applicable charge should be shown before you complete the relevant process.",
      },
    ],
  },
  {
    title: "ReMakers",
    questions: [
      {
        question: "What is a ReMaker?",
        answer:
          "A ReMaker is a creator who works with rescued, recovered or overlooked materials and transforms them into useful or meaningful new creations.",
      },
      {
        question: "How can I become a ReMaker?",
        answer:
          "You can start by joining the ReMaker community and building your profile. ReMakers can showcase their work, source materials and sell their finished creations.",
      },
      {
        question: "Can ReMakers sell their creations on ReOrbit?",
        answer:
          "Yes. ReMakers can showcase their work and offer finished creations through the ReOrbit ecosystem.",
      },
    ],
  },
];

export default function FAQ() {
  const [openItem, setOpenItem] = useState("0-0");

  const toggleItem = (id) => {
    setOpenItem((current) => (current === id ? null : id));
  };

  return (
    <>
      <style>{`
        /* =====================================================
           FAQ PAGE
        ===================================================== */

        .faq-page {
          min-height: 100vh;

          background: var(--background);

          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .faq-hero {
          padding: 145px 0 80px;

          text-align: center;
        }

        .faq-hero-inner {
          max-width: 820px;

          margin: 0 auto;
        }

        .faq-badge {
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

        .faq-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .faq-hero h1 {
          margin: 25px 0 18px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);

          line-height: 0.98;

          letter-spacing: -0.055em;
        }

        .faq-hero h1 em {
          color: var(--leaf);

          font-style: normal;
        }

        .faq-hero p {
          max-width: 620px;

          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 0.98rem;

          line-height: 1.75;
        }

        /* =====================================================
           FAQ CONTENT
        ===================================================== */

        .faq-content {
          padding: 20px 0 110px;
        }

        .faq-layout {
          display: grid;

          grid-template-columns: 260px minmax(0, 760px);

          justify-content: center;

          gap: 70px;

          align-items: start;
        }

        /* =====================================================
           SIDE NAV
        ===================================================== */

        .faq-sidebar {
          position: sticky;

          top: 105px;
        }

        .faq-sidebar-label {
          margin-bottom: 16px;

          color: var(--muted-foreground);

          font-size: 0.65rem;

          font-weight: 800;

          letter-spacing: 0.1em;

          text-transform: uppercase;
        }

        .faq-sidebar a {
          display: block;

          padding: 9px 12px;

          margin-bottom: 3px;

          border-radius: 8px;

          color: var(--muted-foreground);

          font-size: 0.78rem;

          text-decoration: none;

          transition:
            color 0.15s ease,
            background 0.15s ease;
        }

        .faq-sidebar a:hover {
          background: var(--secondary);

          color: var(--primary);
        }

        /* =====================================================
           GROUP
        ===================================================== */

        .faq-group {
          margin-bottom: 52px;
        }

        .faq-group:last-child {
          margin-bottom: 0;
        }

        .faq-group h2 {
          margin-bottom: 17px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.65rem;

          letter-spacing: -0.03em;
        }

        /* =====================================================
           ACCORDION
        ===================================================== */

        .faq-list {
          border-top: 1px solid var(--border);
        }

        .faq-item {
          border-bottom: 1px solid var(--border);
        }

        .faq-question {
          width: 100%;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 25px;

          padding: 21px 4px;

          border: 0;

          background: transparent;

          color: var(--primary);

          font-family: var(--font-sans);

          font-size: 0.9rem;

          font-weight: 600;

          text-align: left;

          cursor: pointer;
        }

        .faq-question:hover {
          color: var(--leaf);
        }

        .faq-icon {
          width: 30px;
          height: 30px;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          background: var(--secondary);

          color: var(--primary);

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .faq-icon .material-symbols-outlined {
          font-size: 18px;
        }

        .faq-item-open .faq-icon {
          background: var(--primary);

          color: var(--primary-foreground);

          transform: rotate(180deg);
        }

        .faq-answer {
          max-height: 0;

          overflow: hidden;

          transition:
            max-height 0.3s ease,
            padding 0.3s ease;
        }

        .faq-item-open .faq-answer {
          max-height: 300px;

          padding: 0 50px 22px 4px;
        }

        .faq-answer p {
          color: var(--muted-foreground);

          font-size: 0.82rem;

          line-height: 1.75;
        }

        /* =====================================================
           CONTACT CTA
        ===================================================== */

        .faq-contact {
          margin-top: 75px;

          padding: 34px;

          border-radius: 22px;

          background: var(--secondary);

          border: 1px solid var(--border);

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 30px;
        }

        .faq-contact h3 {
          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.45rem;

          margin-bottom: 6px;
        }

        .faq-contact p {
          color: var(--muted-foreground);

          font-size: 0.78rem;
        }

        .faq-contact-button {
          display: inline-flex;

          align-items: center;

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

        .faq-contact-button:hover {
          background: #1e3d2f;

          transform: translateY(-1px);
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 900px) {

          .faq-layout {
            grid-template-columns: 1fr;

            gap: 35px;
          }

          .faq-sidebar {
            position: static;

            display: flex;

            flex-wrap: wrap;

            gap: 6px;
          }

          .faq-sidebar-label {
            width: 100%;

            margin-bottom: 5px;
          }

          .faq-sidebar a {
            background: var(--secondary);

            margin: 0;
          }
        }

        @media (max-width: 700px) {

          .faq-hero {
            padding: 120px 0 65px;
          }

          .faq-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .faq-hero p {
            font-size: 0.88rem;
          }

          .faq-content {
            padding-bottom: 75px;
          }

          .faq-group {
            margin-bottom: 40px;
          }

          .faq-group h2 {
            font-size: 1.45rem;
          }

          .faq-question {
            padding: 18px 2px;

            font-size: 0.82rem;

            gap: 15px;
          }

          .faq-item-open .faq-answer {
            padding: 0 38px 19px 2px;
          }

          .faq-answer p {
            font-size: 0.78rem;
          }

          .faq-contact {
            flex-direction: column;

            align-items: flex-start;

            padding: 27px 22px;
          }

          .faq-contact-button {
            width: 100%;

            justify-content: center;
          }
        }

        @media (max-width: 480px) {

          .faq-hero {
            padding-top: 105px;
          }

          .faq-hero h1 {
            font-size: 2.65rem;
          }

          .faq-sidebar {
            display: grid;

            grid-template-columns: 1fr 1fr;
          }

          .faq-sidebar a {
            font-size: 0.7rem;
          }

          .faq-question {
            font-size: 0.78rem;
          }

          .faq-icon {
            width: 27px;
            height: 27px;
          }
        }
      `}</style>

      <div className="faq-page">
        <Navbar />

        {/* HERO */}
        <section className="faq-hero">
          <div className="container faq-hero-inner">
            <span className="faq-badge">
              <span className="material-symbols-outlined">help</span>
              Help & Support
            </span>

            <h1>
              Questions? We've got
              <em> answers.</em>
            </h1>

            <p>
              Everything you need to know about buying, listing, donating,
              exchanging and giving things another orbit.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-content">
          <div className="container faq-layout">
            {/* SIDEBAR */}
            <aside className="faq-sidebar">
              <span className="faq-sidebar-label">On this page</span>

              {faqGroups.map((group, index) => (
                <a key={group.title} href={`#faq-${index}`}>
                  {group.title}
                </a>
              ))}
            </aside>

            {/* QUESTIONS */}
            <div>
              {faqGroups.map((group, groupIndex) => (
                <section
                  className="faq-group"
                  id={`faq-${groupIndex}`}
                  key={group.title}
                >
                  <h2>{group.title}</h2>

                  <div className="faq-list">
                    {group.questions.map((item, questionIndex) => {
                      const id = `${groupIndex}-${questionIndex}`;

                      const isOpen = openItem === id;

                      return (
                        <div
                          className={`faq-item ${
                            isOpen ? "faq-item-open" : ""
                          }`}
                          key={item.question}
                        >
                          <button
                            className="faq-question"
                            onClick={() => toggleItem(id)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>

                            <span className="faq-icon">
                              <span className="material-symbols-outlined">
                                expand_more
                              </span>
                            </span>
                          </button>

                          <div className="faq-answer">
                            <p>{item.answer}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* CONTACT */}
              <div className="faq-contact">
                <div>
                  <h3>Still have a question?</h3>

                  <p>
                    Our support team is happy to help you find the right orbit.
                  </p>
                </div>

                <a href="/contact" className="faq-contact-button">
                  Contact us
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
