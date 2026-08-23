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
          "ReOrbit is a circular platform that helps people give reusable items another purpose. Users can sell, donate or purchase items, while ReMakers can source useful materials and transform them into new creations.",
      },
      {
        question: "Who can use ReOrbit?",
        answer:
          "ReOrbit brings together users who want to sell, donate or purchase reusable items, ReMakers who source materials and create new products, and administrators who manage the platform, inventory, logistics and overall activity.",
      },
      {
        question: "How do I get started?",
        answer:
          "Create your ReOrbit account and choose what you want to do. You can explore the marketplace, list something you no longer need, donate an item or discover products created by ReMakers.",
      },
      {
        question: "Do I need an account to use ReOrbit?",
        answer:
          "An account is required for actions such as listing items, purchasing, donating and managing your activity. You can explore available content before deciding to get started.",
      },
    ],
  },

  {
    title: "Listings & marketplace",
    questions: [
      {
        question: "How do I list an item?",
        answer:
          "Create a listing by adding the item's relevant details, category, condition, images and other required information. Once submitted, the item can enter the appropriate ReOrbit flow based on whether you are selling or donating it.",
      },
      {
        question: "What can I do with an item I no longer need?",
        answer:
          "You can choose the option that best fits your situation. You can sell the item to another user or donate it through ReOrbit so it can continue toward another useful purpose.",
      },
      {
        question: "Can I buy items on ReOrbit?",
        answer:
          "Yes. Users can browse available marketplace items, explore their details and purchase items that match their needs.",
      },
      {
        question: "Can I buy products created by ReMakers?",
        answer:
          "Yes. ReMakers can showcase their finished creations through ReOrbit, allowing users to discover and purchase unique products made from rescued or recovered materials.",
      },
      {
        question: "What happens after I list an item?",
        answer:
          "The item becomes part of the appropriate ReOrbit flow. Depending on whether it is being sold or donated, the next steps may involve another user, pickup logistics, inventory management or a ReMaker.",
      },
    ],
  },

  {
    title: "Donations & reuse",
    questions: [
      {
        question: "Can I donate an item?",
        answer:
          "Yes. ReOrbit allows users to donate reusable items instead of selling them. Donated items can enter the platform's managed inventory and may later be reused, refurbished or directed toward another suitable purpose.",
      },
      {
        question: "Where do donated items go?",
        answer:
          "Depending on the item's condition and intended use, donated items can be managed through ReOrbit's inventory and warehouse process. Suitable materials may also be made available to ReMakers.",
      },
      {
        question: "What happens if an item needs refurbishment?",
        answer:
          "Items that can benefit from repair or refurbishment can move through the appropriate ReOrbit management process. ReMakers may also transform suitable materials into new products.",
      },
      {
        question: "Can a donated item become a new product?",
        answer:
          "Yes. Suitable materials can become part of a ReMaker's creative process. A ReMaker can source the material, transform it and eventually offer the finished creation through the ReOrbit ecosystem.",
      },
    ],
  },

  {
    title: "Pickup & delivery",
    questions: [
      {
        question: "Is pickup available?",
        answer:
          "Pickup support is available for supported locations and applicable ReOrbit activities. Availability can depend on the item's type, location and the specific transaction or donation process.",
      },
      {
        question: "How does pickup work?",
        answer:
          "When pickup is available, the required pickup information is collected during the relevant process. The item can then be scheduled for collection according to the available logistics options.",
      },
      {
        question: "Are there pickup charges?",
        answer:
          "Pickup charges may apply depending on the location, item and type of activity. Any applicable pickup cost should be communicated as part of the relevant process.",
      },
      {
        question: "What happens after an item is picked up?",
        answer:
          "The next step depends on the item's journey. It may move to another user, enter ReOrbit inventory, reach a ReMaker or continue through refurbishment and reuse processes.",
      },
    ],
  },

  {
    title: "ReMakers",
    questions: [
      {
        question: "What is a ReMaker?",
        answer:
          "A ReMaker is a creator who works with rescued, recovered or overlooked materials and transforms them into useful, creative or meaningful products.",
      },
      {
        question: "How can I become a ReMaker?",
        answer:
          "You can join the ReMaker community and create your ReMaker profile. ReMakers can showcase their work, discover suitable materials, create products and participate in the ReOrbit ecosystem.",
      },
      {
        question: "Can ReMakers source materials from ReOrbit?",
        answer:
          "Yes. ReMakers can discover suitable reusable materials made available through ReOrbit and use them as inputs for their creative work.",
      },
      {
        question: "Can ReMakers sell their finished products?",
        answer:
          "Yes. ReMakers can showcase their creations and offer finished products through the ReOrbit marketplace.",
      },
      {
        question: "Can I see how a ReMaker transformed an item?",
        answer:
          "The ReMaker ecosystem is designed to showcase the transformation journey, including the original material and the resulting creation where the relevant information has been provided.",
      },
    ],
  },

  {
    title: "Rewards & impact",
    questions: [
      {
        question: "What are Orbit Points?",
        answer:
          "Orbit Points are part of ReOrbit's reward system. Eligible activities can contribute points that users may be able to use toward available rewards, vouchers or other platform benefits.",
      },
      {
        question: "Can I earn rewards on ReOrbit?",
        answer:
          "ReOrbit can reward eligible reuse activities through features such as Orbit Points, vouchers, badges and other recognition. The exact reward can depend on the activity and applicable platform rules.",
      },
      {
        question: "What are ReOrbit badges?",
        answer:
          "Badges are recognition for meaningful activity within the ReOrbit ecosystem. They can represent achievements or participation in reuse and circular activities.",
      },
      {
        question: "Can I receive a sustainability certificate?",
        answer:
          "ReOrbit can provide sustainability or impact certificates for eligible activities where the feature is applicable. These can help users understand and showcase their contribution to keeping items in circulation.",
      },
      {
        question: "Can I see my environmental impact?",
        answer:
          "The ReOrbit dashboard is designed to help users understand their activity and its impact, including information such as items given another purpose and other relevant sustainability metrics.",
      },
    ],
  },

  {
    title: "Account & support",
    questions: [
      {
        question: "Where can I see my ReOrbit activity?",
        answer:
          "Your dashboard is intended to provide a central view of your activity, including relevant listings, transactions, rewards and impact information.",
      },
      {
        question: "What happens if I have a problem with a transaction?",
        answer:
          "If you experience an issue with a transaction, pickup or another platform activity, you can contact ReOrbit support with the relevant details so the issue can be reviewed.",
      },
      {
        question: "How can I contact ReOrbit?",
        answer:
          "You can use the Contact Us page to reach the ReOrbit support team. Include the relevant item, transaction or account information so your request can be handled more efficiently.",
      },
      {
        question: "How does ReOrbit protect my information?",
        answer:
          "ReOrbit is designed to handle account and transaction information responsibly. You can review the Privacy Policy to understand how information is collected, used and managed.",
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
          display: block;

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
          max-height: 400px;

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

        {/* =====================================================
            HERO
        ===================================================== */}

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
              Everything you need to know about buying, selling, donating,
              ReMakers, pickups, rewards and giving things another orbit.
            </p>
          </div>
        </section>

        {/* =====================================================
            FAQ CONTENT
        ===================================================== */}

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
                    Our support team is here to help with your ReOrbit journey.
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
