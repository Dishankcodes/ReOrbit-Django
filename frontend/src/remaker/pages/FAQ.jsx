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
      /* =========================================================
   REMAKER FAQ
   SAME DESIGN SYSTEM AS REMAKER HOMEPAGE
========================================================= */

.rm-faq-page {
  min-height: 100vh;

  background: var(--rm-background);
  color: var(--rm-text);

  overflow-x: hidden;
}


/* =========================================================
   CONTAINER
========================================================= */

.rm-faq-page .container {
  width: min(1280px, calc(100% - 80px));

  margin: 0 auto;
}


/* =========================================================
   HERO
========================================================= */

.rm-faq-hero {
  padding: 155px 0 85px;

  background: var(--rm-background);

  text-align: center;
}


.rm-faq-hero-inner {
  max-width: 850px;

  margin: 0 auto;
}


/* =========================================================
   BADGE
========================================================= */

.rm-faq-badge {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  gap: 8px;

  padding: 9px 14px;

  border: 1px solid var(--rm-border);

  border-radius: 999px;

  background: rgba(193, 200, 196, 0.32);

  color: var(--rm-green);

  font-size: 0.68rem;

  font-weight: 800;

  letter-spacing: 0.12em;

  text-transform: uppercase;
}


.rm-faq-badge .material-symbols-outlined {
  font-size: 17px;
}


/* =========================================================
   HERO TITLE
========================================================= */

.rm-faq-hero h1 {
  margin: 28px 0 20px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: clamp(3.5rem, 6vw, 5.8rem);

  line-height: 0.96;

  letter-spacing: -0.055em;

  font-weight: 700;
}


.rm-faq-hero h1 em {
  color: var(--rm-green);

  font-style: italic;

  font-weight: 600;
}


.rm-faq-hero p {
  max-width: 650px;

  margin: 0 auto;

  color: var(--rm-secondary-dark);

  font-size: 0.9rem;

  line-height: 1.75;
}


/* =========================================================
   FAQ CONTENT
========================================================= */

.rm-faq-content {
  padding: 30px 0 110px;

  background: var(--rm-background);
}


.rm-faq-layout {
  display: grid;

  grid-template-columns: 240px minmax(0, 780px);

  justify-content: center;

  gap: 70px;

  align-items: start;
}


/* =========================================================
   SIDEBAR
========================================================= */

.rm-faq-sidebar {
  position: sticky;

  top: 105px;

  padding: 20px;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 18px;
}


.rm-faq-sidebar-label {
  display: block;

  margin-bottom: 14px;

  color: var(--rm-green);

  font-size: 0.65rem;

  font-weight: 800;

  letter-spacing: 0.12em;

  text-transform: uppercase;
}


.rm-faq-sidebar a {
  display: block;

  padding: 10px 12px;

  margin-bottom: 3px;

  border-radius: 9px;

  color: var(--rm-secondary-dark);

  font-size: 0.75rem;

  font-weight: 500;

  text-decoration: none;

  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}


.rm-faq-sidebar a:hover {
  background: var(--rm-light);

  color: var(--rm-maroon);

  transform: translateX(2px);
}


/* =========================================================
   FAQ GROUP
========================================================= */

.rm-faq-group {
  margin-bottom: 55px;
}


.rm-faq-group:last-child {
  margin-bottom: 0;
}


.rm-faq-group h2 {
  margin-bottom: 18px;

  color: var(--rm-maroon);

  font-family: var(--font-display);

  font-size: 1.8rem;

  line-height: 1;

  letter-spacing: -0.035em;
}


/* =========================================================
   FAQ LIST
========================================================= */

.rm-faq-list {
  overflow: hidden;

  background: var(--rm-white);

  border: 1px solid var(--rm-border);

  border-radius: 18px;
}


/* =========================================================
   FAQ ITEM
========================================================= */

.rm-faq-item {
  border-bottom: 1px solid var(--rm-border);
}


.rm-faq-item:last-child {
  border-bottom: 0;
}


/* =========================================================
   QUESTION
========================================================= */

.rm-faq-question {
  width: 100%;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 25px;

  padding: 21px 22px;

  border: 0;

  background: var(--rm-white);

  color: var(--rm-maroon);

  font-family: var(--font-sans);

  font-size: 0.86rem;

  font-weight: 600;

  text-align: left;

  cursor: pointer;

  transition:
    background 0.2s ease,
    color 0.2s ease;
}


.rm-faq-question:hover {
  background: rgba(8, 39, 31, 0.035);

  color: var(--rm-green);
}


/* =========================================================
   ICON
========================================================= */

.rm-faq-icon {
  width: 32px;
  height: 32px;

  flex-shrink: 0;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background: rgba(8, 39, 31, 0.08);

  color: var(--rm-green);

  transition:
    transform 0.25s ease,
    background 0.25s ease,
    color 0.25s ease;
}


.rm-faq-icon .material-symbols-outlined {
  font-size: 18px;
}


.rm-faq-item-open .rm-faq-icon {
  background: var(--rm-maroon);

  color: var(--rm-white);

  transform: rotate(180deg);
}


/* =========================================================
   ANSWER
========================================================= */

.rm-faq-answer {
  max-height: 0;

  overflow: hidden;

  background: var(--rm-white);

  transition:
    max-height 0.3s ease,
    padding 0.3s ease;
}


.rm-faq-item-open .rm-faq-answer {
  max-height: 300px;

  padding: 0 60px 22px 22px;
}


.rm-faq-answer p {
  color: var(--rm-muted);

  font-size: 0.8rem;

  line-height: 1.75;
}


/* =========================================================
   SUPPORT CTA
========================================================= */

.rm-faq-contact {
  margin-top: 65px;

  padding: 40px;

  border-radius: 24px;

  background: var(--rm-maroon);

  border: 1px solid rgba(193, 200, 196, 0.25);

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 30px;
}


.rm-faq-contact h3 {
  margin-bottom: 7px;

  color: var(--rm-white);

  font-family: var(--font-display);

  font-size: 1.7rem;

  letter-spacing: -0.03em;
}


.rm-faq-contact p {
  color: rgba(255, 255, 255, 0.67);

  font-size: 0.78rem;

  line-height: 1.6;
}


.rm-faq-contact-button {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  flex-shrink: 0;

  min-height: 44px;

  padding: 0 20px;

  border-radius: 999px;

  background: var(--rm-white);

  color: var(--rm-maroon);

  border: 1px solid var(--rm-white);

  font-size: 0.78rem;

  font-weight: 700;

  text-decoration: none;

  transition:
    transform 0.2s ease,
    background 0.2s ease;
}


.rm-faq-contact-button:hover {
  background: #f3f3f1;

  transform: translateY(-2px);
}


.rm-faq-contact-button .material-symbols-outlined {
  font-size: 16px;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1000px) {

  .rm-faq-layout {
    grid-template-columns: 210px minmax(0, 1fr);

    gap: 40px;
  }
}


@media (max-width: 900px) {

  .rm-faq-layout {
    grid-template-columns: 1fr;

    gap: 35px;
  }


  .rm-faq-sidebar {
    position: static;

    display: flex;

    flex-wrap: wrap;

    align-items: center;

    gap: 6px;

    padding: 14px;
  }


  .rm-faq-sidebar-label {
    width: 100%;

    margin-bottom: 4px;
  }


  .rm-faq-sidebar a {
    margin: 0;

    background: var(--rm-light);
  }
}


@media (max-width: 700px) {

  .rm-faq-page .container {
    width: calc(100% - 32px);
  }


  .rm-faq-hero {
    padding: 125px 0 65px;
  }


  .rm-faq-hero h1 {
    font-size: clamp(2.7rem, 12vw, 4rem);
  }


  .rm-faq-hero p {
    font-size: 0.84rem;
  }


  .rm-faq-content {
    padding-bottom: 75px;
  }


  .rm-faq-group {
    margin-bottom: 40px;
  }


  .rm-faq-group h2 {
    font-size: 1.5rem;
  }


  .rm-faq-question {
    padding: 18px;

    font-size: 0.8rem;

    gap: 15px;
  }


  .rm-faq-item-open .rm-faq-answer {
    padding: 0 45px 19px 18px;
  }


  .rm-faq-answer p {
    font-size: 0.76rem;
  }


  .rm-faq-contact {
    flex-direction: column;

    align-items: flex-start;

    padding: 30px 24px;

    border-radius: 20px;
  }


  .rm-faq-contact-button {
    width: 100%;
  }
}


@media (max-width: 480px) {

  .rm-faq-page .container {
    width: calc(100% - 24px);
  }


  .rm-faq-hero {
    padding-top: 110px;
  }


  .rm-faq-hero h1 {
    font-size: 2.65rem;
  }


  .rm-faq-sidebar {
    display: grid;

    grid-template-columns: 1fr 1fr;
  }


  .rm-faq-sidebar a {
    font-size: 0.68rem;
  }


  .rm-faq-question {
    font-size: 0.76rem;
  }


  .rm-faq-icon {
    width: 28px;
    height: 28px;
  }
}
      `}</style>

      <div className="remaker-page rm-page rm-about-page">
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
