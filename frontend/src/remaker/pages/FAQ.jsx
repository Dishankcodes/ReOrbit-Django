import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const faqGroups = [
  {
    title: "Getting started",
    questions: [
      {
        question: "What is a ReMaker?",
        answer:
          "A ReMaker is a creator who transforms rescued, recovered or overlooked materials into useful, artistic or meaningful new creations.",
      },
      {
        question: "Who can become a ReMaker?",
        answer:
          "Artists, designers, craftspeople, furniture makers and other creators can join the ReMaker community. Your work and creative process are what matter most.",
      },
      {
        question: "How do I become a ReMaker?",
        answer:
          "You can join through the ReMaker onboarding flow, create your profile and start building your portfolio. Once your profile is ready, you can discover materials and showcase your creations.",
      },
    ],
  },

  {
    title: "Materials",
    questions: [
      {
        question: "Where do ReMakers get their materials?",
        answer:
          "ReMakers can source rescued materials made available through ReOrbit. These can come from households and other material sources that have useful items ready for another purpose.",
      },
      {
        question: "Can I choose which materials I want?",
        answer:
          "Yes. You can browse available material listings and look for pieces that match the requirements of your project.",
      },
      {
        question: "Can I claim material for a project?",
        answer:
          "ReMakers can claim available rescued material through the material sourcing flow. Availability depends on the current listings.",
      },
      {
        question: "Can I use materials I already have?",
        answer:
          "Yes. Your ReMaker profile and portfolio can showcase creations made from rescued materials sourced through ReOrbit as well as your broader creative work.",
      },
    ],
  },

  {
    title: "Studio & portfolio",
    questions: [
      {
        question: "What is the ReMaker Studio?",
        answer:
          "The ReMaker Studio is the creative space for ReMakers to manage their work, showcase transformations and build their presence within the ReOrbit ecosystem.",
      },
      {
        question: "Can I show before-and-after images?",
        answer:
          "Yes. Before-and-after showcases are an important part of showing the journey from rescued material to finished creation.",
      },
      {
        question: "Can I create a portfolio?",
        answer:
          "Yes. Your ReMaker profile can be used to showcase your projects, creations, creative style and transformation stories.",
      },
    ],
  },

  {
    title: "Selling creations",
    questions: [
      {
        question: "Can I sell my finished creations?",
        answer:
          "Yes. ReMakers can showcase and sell finished work through the ReOrbit ecosystem.",
      },
      {
        question: "Can buyers see how a creation was made?",
        answer:
          "The ReMaker experience is designed around transparency and storytelling. Transformation details and before-and-after content can help buyers understand the journey behind a creation.",
      },
      {
        question: "Can I take custom orders?",
        answer:
          "Custom work can be part of a ReMaker's offering. You can use your profile and portfolio to communicate the type of work you create and the projects you are open to.",
      },
    ],
  },

  {
    title: "Community & support",
    questions: [
      {
        question: "Can I connect with other ReMakers?",
        answer:
          "ReOrbit is designed to build a community around creative reuse, allowing makers to discover materials, share their work and participate in a broader circular ecosystem.",
      },
      {
        question: "How does ReOrbit support ReMakers?",
        answer:
          "ReOrbit helps ReMakers with material discovery, portfolio visibility, showcasing finished creations and connecting their work with people looking for meaningful products.",
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
           REMAKER FAQ PAGE
        ===================================================== */

        .rm-faq-page {
          min-height: 100vh;

          background: var(--background);

          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .rm-faq-hero {
          padding: 145px 0 80px;

          text-align: center;
        }

        .rm-faq-hero-inner {
          max-width: 820px;

          margin: 0 auto;
        }

        .rm-faq-badge {
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

        .rm-faq-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .rm-faq-hero h1 {
          margin: 25px 0 18px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5rem);

          line-height: 0.98;

          letter-spacing: -0.055em;
        }

        .rm-faq-hero h1 em {
          color: var(--leaf);

          font-style: normal;
        }

        .rm-faq-hero p {
          max-width: 620px;

          margin: 0 auto;

          color: var(--muted-foreground);

          font-size: 0.98rem;

          line-height: 1.75;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .rm-faq-content {
          padding: 20px 0 110px;
        }

        .rm-faq-layout {
          display: grid;

          grid-template-columns: 260px minmax(0, 760px);

          justify-content: center;

          gap: 70px;

          align-items: start;
        }

        /* =====================================================
           SIDEBAR
        ===================================================== */

        .rm-faq-sidebar {
          position: sticky;

          top: 105px;
        }

        .rm-faq-sidebar-label {
          display: block;

          margin-bottom: 16px;

          color: var(--muted-foreground);

          font-size: 0.65rem;

          font-weight: 800;

          letter-spacing: 0.1em;

          text-transform: uppercase;
        }

        .rm-faq-sidebar a {
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

        .rm-faq-sidebar a:hover {
          background: var(--secondary);

          color: var(--primary);
        }

        /* =====================================================
           GROUP
        ===================================================== */

        .rm-faq-group {
          margin-bottom: 52px;
        }

        .rm-faq-group:last-child {
          margin-bottom: 0;
        }

        .rm-faq-group h2 {
          margin-bottom: 17px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.65rem;

          letter-spacing: -0.03em;
        }

        /* =====================================================
           ACCORDION
        ===================================================== */

        .rm-faq-list {
          border-top: 1px solid var(--border);
        }

        .rm-faq-item {
          border-bottom: 1px solid var(--border);
        }

        .rm-faq-question {
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

        .rm-faq-question:hover {
          color: var(--leaf);
        }

        .rm-faq-icon {
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

        .rm-faq-icon .material-symbols-outlined {
          font-size: 18px;
        }

        .rm-faq-item-open .rm-faq-icon {
          background: var(--primary);

          color: var(--primary-foreground);

          transform: rotate(180deg);
        }

        .rm-faq-answer {
          max-height: 0;

          overflow: hidden;

          transition:
            max-height 0.3s ease,
            padding 0.3s ease;
        }

        .rm-faq-item-open .rm-faq-answer {
          max-height: 300px;

          padding: 0 50px 22px 4px;
        }

        .rm-faq-answer p {
          color: var(--muted-foreground);

          font-size: 0.82rem;

          line-height: 1.75;
        }

        /* =====================================================
           SUPPORT CTA
        ===================================================== */

        .rm-faq-contact {
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

        .rm-faq-contact h3 {
          margin-bottom: 6px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.45rem;
        }

        .rm-faq-contact p {
          color: var(--muted-foreground);

          font-size: 0.78rem;
        }

        .rm-faq-contact-button {
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

        .rm-faq-contact-button:hover {
          background: #1e3d2f;

          transform: translateY(-1px);
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 900px) {

          .rm-faq-layout {
            grid-template-columns: 1fr;

            gap: 35px;
          }

          .rm-faq-sidebar {
            position: static;

            display: flex;

            flex-wrap: wrap;

            gap: 6px;
          }

          .rm-faq-sidebar-label {
            width: 100%;

            margin-bottom: 5px;
          }

          .rm-faq-sidebar a {
            margin: 0;

            background: var(--secondary);
          }
        }

        @media (max-width: 700px) {

          .rm-faq-hero {
            padding: 120px 0 65px;
          }

          .rm-faq-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .rm-faq-hero p {
            font-size: 0.88rem;
          }

          .rm-faq-content {
            padding-bottom: 75px;
          }

          .rm-faq-group {
            margin-bottom: 40px;
          }

          .rm-faq-group h2 {
            font-size: 1.45rem;
          }

          .rm-faq-question {
            padding: 18px 2px;

            font-size: 0.82rem;

            gap: 15px;
          }

          .rm-faq-item-open .rm-faq-answer {
            padding: 0 38px 19px 2px;
          }

          .rm-faq-answer p {
            font-size: 0.78rem;
          }

          .rm-faq-contact {
            flex-direction: column;

            align-items: flex-start;

            padding: 27px 22px;
          }

          .rm-faq-contact-button {
            width: 100%;

            justify-content: center;
          }
        }

        @media (max-width: 480px) {

          .rm-faq-hero {
            padding-top: 105px;
          }

          .rm-faq-hero h1 {
            font-size: 2.65rem;
          }

          .rm-faq-sidebar {
            display: grid;

            grid-template-columns: 1fr 1fr;
          }

          .rm-faq-sidebar a {
            font-size: 0.7rem;
          }

          .rm-faq-question {
            font-size: 0.78rem;
          }

          .rm-faq-icon {
            width: 27px;
            height: 27px;
          }
        }
      `}</style>

      <div className="rm-faq-page">
        <Navbar />

        {/* HERO */}
        <section className="rm-faq-hero">
          <div className="container rm-faq-hero-inner">
            <span className="rm-faq-badge">
              <span className="material-symbols-outlined">handyman</span>
              ReMaker Support
            </span>

            <h1>
              Questions about your
              <em> creative orbit?</em>
            </h1>

            <p>
              Find answers about becoming a ReMaker, sourcing materials, using
              the Studio, showcasing your work and selling your creations.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="rm-faq-content">
          <div className="container rm-faq-layout">
            {/* SIDEBAR */}
            <aside className="rm-faq-sidebar">
              <span className="rm-faq-sidebar-label">On this page</span>

              {faqGroups.map((group, index) => (
                <a key={group.title} href={`#rm-faq-${index}`}>
                  {group.title}
                </a>
              ))}
            </aside>

            {/* QUESTIONS */}
            <div>
              {faqGroups.map((group, groupIndex) => (
                <section
                  className="rm-faq-group"
                  id={`rm-faq-${groupIndex}`}
                  key={group.title}
                >
                  <h2>{group.title}</h2>

                  <div className="rm-faq-list">
                    {group.questions.map((item, questionIndex) => {
                      const id = `${groupIndex}-${questionIndex}`;

                      const isOpen = openItem === id;

                      return (
                        <div
                          className={`rm-faq-item ${
                            isOpen ? "rm-faq-item-open" : ""
                          }`}
                          key={item.question}
                        >
                          <button
                            className="rm-faq-question"
                            onClick={() => toggleItem(id)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>

                            <span className="rm-faq-icon">
                              <span className="material-symbols-outlined">
                                expand_more
                              </span>
                            </span>
                          </button>

                          <div className="rm-faq-answer">
                            <p>{item.answer}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* SUPPORT */}
              <div className="rm-faq-contact">
                <div>
                  <h3>Need help with your orbit?</h3>

                  <p>
                    Get in touch with the ReOrbit team and we'll help you find
                    the right next step.
                  </p>
                </div>

                <a href="/contact" className="rm-faq-contact-button">
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
