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
          "Artists, designers, craftspeople, furniture makers and other creators can join the ReMaker community. Your creativity, skills and the work you create are what matter most.",
      },
      {
        question: "How do I become a ReMaker?",
        answer:
          "Register through the ReMaker onboarding flow, create your profile and start building your portfolio. Once your profile is ready, you can explore materials and showcase your creations.",
      },
      {
        question: "Do I need professional experience to become a ReMaker?",
        answer:
          "Not necessarily. ReOrbit is designed for people who enjoy creating, repairing, redesigning or transforming materials. Your skills and creative work can grow as you participate.",
      },
    ],
  },

  {
    title: "Materials",
    questions: [
      {
        question: "Where do ReMakers get their materials?",
        answer:
          "ReMakers can source rescued materials made available through ReOrbit. These materials can come from households and other sources where useful items are ready for another purpose.",
      },
      {
        question: "Can I choose which materials I want?",
        answer:
          "Yes. You can browse available material listings, search by requirements and explore item details before deciding what fits your project.",
      },
      {
        question: "Can I claim or purchase material for a project?",
        answer:
          "You can select available material through the material sourcing flow. Depending on the listing, the material may be available for purchase or another supported sourcing method.",
      },
      {
        question: "Can I use materials I already have?",
        answer:
          "Yes. Your ReMaker profile and portfolio can showcase creations made from materials sourced through ReOrbit as well as your broader creative work.",
      },
      {
        question: "Can I see material details before choosing it?",
        answer:
          "Yes. Material listings are designed to provide information that helps you understand what is available and decide whether it is suitable for your project.",
      },
    ],
  },

  {
    title: "ReMaker Studio",
    questions: [
      {
        question: "What is the ReMaker Studio?",
        answer:
          "The ReMaker Studio is your creative workspace within ReOrbit. It helps you manage your profile, showcase your work, organize products and build your presence as a ReMaker.",
      },
      {
        question: "Can I create a portfolio?",
        answer:
          "Yes. Your portfolio allows you to showcase your projects, creations, creative style and transformation stories to people visiting your ReMaker profile.",
      },
      {
        question: "Can I show before-and-after images?",
        answer:
          "Yes. Before-and-after content helps communicate the transformation journey and shows how a rescued or overlooked material became a finished creation.",
      },
      {
        question: "Can I update my ReMaker profile?",
        answer:
          "Yes. You can manage your profile information and keep your creative identity, skills and other details up to date.",
      },
    ],
  },

  {
    title: "Products & selling",
    questions: [
      {
        question: "Can I sell my finished creations?",
        answer:
          "Yes. ReMakers can showcase and sell finished creations through the ReOrbit ecosystem.",
      },
      {
        question: "How do I add a product?",
        answer:
          "You can create a product listing by providing the relevant product information, selecting a category, adding images and setting the appropriate price.",
      },
      {
        question: "Can I edit my product listing?",
        answer:
          "Yes. Product information can be managed through your ReMaker workspace so your listings remain accurate and up to date.",
      },
      {
        question: "Can I remove or pause a product?",
        answer:
          "Product management allows ReMakers to control the availability of their listings when a creation is no longer available or needs to be temporarily paused.",
      },
      {
        question: "Can buyers understand how my product was created?",
        answer:
          "Yes. Transformation details, project information and before-and-after content can help buyers understand the story and creative process behind your finished work.",
      },
      {
        question: "Can I take custom orders?",
        answer:
          "Custom work can be part of a ReMaker's offering. Your profile and portfolio can communicate the type of work you create and the projects you are open to.",
      },
    ],
  },

  {
    title: "Orders & earnings",
    questions: [
      {
        question: "How do I know when someone purchases my product?",
        answer:
          "Your ReMaker workspace can be used to view order information and follow the status of your customer purchases.",
      },
      {
        question: "Can I track my orders?",
        answer:
          "Yes. Order-related information can be accessed through your ReMaker workspace so you can keep track of your sales activity.",
      },
      {
        question: "Can I see my earnings?",
        answer:
          "Yes. Your ReMaker dashboard can provide visibility into your earnings and selling activity.",
      },
      {
        question: "Can customers review my creations?",
        answer:
          "Yes. Customer ratings and reviews help build your reputation and give future customers more confidence in your work.",
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
          "ReOrbit helps ReMakers with material discovery, portfolio visibility, product showcasing and connecting their work with people looking for meaningful creations.",
      },
      {
        question: "What happens if I need help?",
        answer:
          "You can contact the ReOrbit team through the support or contact channel for assistance with your ReMaker experience.",
      },
    ],
  },
];

export default function ReMakerFAQ() {
  const [openItem, setOpenItem] = useState("0-0");

  const toggleItem = (id) => {
    setOpenItem((current) => (current === id ? null : id));
  };

  return (
    <>
      <style>{`

/* =========================================================
   REMAKER FAQ
   SAME THEME AS REMAKER HOMEPAGE / ABOUT / HOW IT WORKS
========================================================= */

.remaker-faq-page {
  --faq-maroon: #270809;
  --faq-green: #08271F;
  --faq-secondary: #414845;

  --faq-text: #1A1C1A;
  --faq-muted: #727975;
  --faq-border: #C1C8C4;
  --faq-light: #E3E2E0;

  --faq-background: #FAF9F7;
  --faq-white: #FFFFFF;

  min-height: 100vh;

  background: var(--faq-background);

  color: var(--faq-text);

  overflow-x: hidden;
}


/* =========================================================
   CONTAINER
========================================================= */

.remaker-faq-page .faq-container {
  width: min(1280px, calc(100% - 80px));

  margin: 0 auto;
}


/* =========================================================
   HERO
========================================================= */

.remaker-faq-page .faq-hero {
  padding: 155px 0 85px;

  background: var(--faq-background);

  text-align: center;
}

.remaker-faq-page .faq-hero-inner {
  max-width: 850px;

  margin: 0 auto;
}


/* =========================================================
   BADGE
========================================================= */

.remaker-faq-page .faq-badge {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  gap: 8px;

  padding: 9px 14px;

  border: 1px solid var(--faq-border);

  border-radius: 999px;

  background: rgba(193, 200, 196, 0.32);

  color: var(--faq-green);

  font-size: 0.68rem;

  font-weight: 800;

  letter-spacing: 0.12em;

  text-transform: uppercase;
}

.remaker-faq-page .faq-badge .material-symbols-outlined {
  font-size: 17px;
}


/* =========================================================
   HERO TITLE
========================================================= */

.remaker-faq-page .faq-hero h1 {
  margin: 28px 0 20px;

  color: var(--faq-maroon);

  font-family: var(--font-display);

  font-size: clamp(3.5rem, 6vw, 5.8rem);

  line-height: 0.96;

  letter-spacing: -0.055em;

  font-weight: 700;
}

.remaker-faq-page .faq-hero h1 em {
  color: var(--faq-green);

  font-style: italic;

  font-weight: 600;
}

.remaker-faq-page .faq-hero p {
  max-width: 650px;

  margin: 0 auto;

  color: var(--faq-secondary);

  font-size: 0.9rem;

  line-height: 1.75;
}


/* =========================================================
   FAQ CONTENT
========================================================= */

.remaker-faq-page .faq-content {
  padding: 30px 0 110px;

  background: var(--faq-background);
}

.remaker-faq-page .faq-layout {
  display: grid;

  grid-template-columns: 240px minmax(0, 780px);

  justify-content: center;

  gap: 70px;

  align-items: start;
}


/* =========================================================
   SIDEBAR
========================================================= */

.remaker-faq-page .faq-sidebar {
  position: sticky;

  top: 105px;

  padding: 20px;

  background: var(--faq-white);

  border: 1px solid var(--faq-border);

  border-radius: 18px;
}

.remaker-faq-page .faq-sidebar-label {
  display: block;

  margin-bottom: 14px;

  color: var(--faq-green);

  font-size: 0.65rem;

  font-weight: 800;

  letter-spacing: 0.12em;

  text-transform: uppercase;
}

.remaker-faq-page .faq-sidebar a {
  display: block;

  padding: 10px 12px;

  margin-bottom: 3px;

  border-radius: 9px;

  color: var(--faq-secondary);

  font-size: 0.75rem;

  font-weight: 500;

  text-decoration: none;

  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.remaker-faq-page .faq-sidebar a:hover {
  background: var(--faq-light);

  color: var(--faq-maroon);

  transform: translateX(2px);
}


/* =========================================================
   FAQ GROUP
========================================================= */

.remaker-faq-page .faq-group {
  margin-bottom: 55px;
}

.remaker-faq-page .faq-group:last-child {
  margin-bottom: 0;
}

.remaker-faq-page .faq-group h2 {
  margin-bottom: 18px;

  color: var(--faq-maroon);

  font-family: var(--font-display);

  font-size: 1.8rem;

  line-height: 1;

  letter-spacing: -0.035em;
}


/* =========================================================
   FAQ LIST
========================================================= */

.remaker-faq-page .faq-list {
  overflow: hidden;

  background: var(--faq-white);

  border: 1px solid var(--faq-border);

  border-radius: 18px;
}


/* =========================================================
   FAQ ITEM
========================================================= */

.remaker-faq-page .faq-item {
  border-bottom: 1px solid var(--faq-border);
}

.remaker-faq-page .faq-item:last-child {
  border-bottom: 0;
}


/* =========================================================
   QUESTION
========================================================= */

.remaker-faq-page .faq-question {
  width: 100%;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 25px;

  padding: 21px 22px;

  border: 0;

  background: var(--faq-white);

  color: var(--faq-maroon);

  font-family: var(--font-sans);

  font-size: 0.86rem;

  font-weight: 600;

  text-align: left;

  cursor: pointer;

  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.remaker-faq-page .faq-question:hover {
  background: rgba(8, 39, 31, 0.035);

  color: var(--faq-green);
}


/* =========================================================
   PLUS / ARROW ICON
========================================================= */

.remaker-faq-page .faq-icon {
  width: 32px;
  height: 32px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: rgba(8, 39, 31, 0.08);

  color: var(--faq-green);

  transition:
    transform 0.25s ease,
    background 0.25s ease,
    color 0.25s ease;
}

.remaker-faq-page .faq-icon .material-symbols-outlined {
  font-size: 18px;
}

.remaker-faq-page .faq-item-open .faq-icon {
  background: var(--faq-maroon);

  color: var(--faq-white);

  transform: rotate(180deg);
}


/* =========================================================
   ANSWER
========================================================= */

.remaker-faq-page .faq-answer {
  max-height: 0;

  overflow: hidden;

  background: var(--faq-white);

  transition:
    max-height 0.3s ease,
    padding 0.3s ease;
}

.remaker-faq-page .faq-item-open .faq-answer {
  max-height: 300px;

  padding: 0 60px 22px 22px;
}

.remaker-faq-page .faq-answer p {
  color: var(--faq-muted);

  font-size: 0.8rem;

  line-height: 1.75;
}


/* =========================================================
   SUPPORT CTA
========================================================= */

.remaker-faq-page .faq-contact {
  margin-top: 65px;

  padding: 40px;

  border-radius: 24px;

  background: var(--faq-maroon);

  border: 1px solid rgba(193, 200, 196, 0.25);

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 30px;
}

.remaker-faq-page .faq-contact h3 {
  margin-bottom: 7px;

  color: var(--faq-white);

  font-family: var(--font-display);

  font-size: 1.7rem;

  letter-spacing: -0.03em;
}

.remaker-faq-page .faq-contact p {
  color: rgba(255, 255, 255, 0.67);

  font-size: 0.78rem;

  line-height: 1.6;
}

.remaker-faq-page .faq-contact-button {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  gap: 7px;

  flex-shrink: 0;

  min-height: 44px;

  padding: 0 20px;

  border-radius: 999px;

  background: var(--faq-white);

  color: var(--faq-maroon);

  border: 1px solid var(--faq-white);

  font-size: 0.78rem;

  font-weight: 700;

  text-decoration: none;

  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.remaker-faq-page .faq-contact-button:hover {
  background: #F3F3F1;

  transform: translateY(-2px);
}

.remaker-faq-page .faq-contact-button .material-symbols-outlined {
  font-size: 16px;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1000px) {

  .remaker-faq-page .faq-layout {
    grid-template-columns: 210px minmax(0, 1fr);

    gap: 40px;
  }

}


@media (max-width: 900px) {

  .remaker-faq-page .faq-layout {
    grid-template-columns: 1fr;

    gap: 35px;
  }

  .remaker-faq-page .faq-sidebar {
    position: static;

    display: flex;

    flex-wrap: wrap;

    align-items: center;

    gap: 6px;

    padding: 14px;
  }

  .remaker-faq-page .faq-sidebar-label {
    width: 100%;

    margin-bottom: 4px;
  }

  .remaker-faq-page .faq-sidebar a {
    margin: 0;

    background: var(--faq-light);
  }

}


@media (max-width: 700px) {

  .remaker-faq-page .faq-container {
    width: calc(100% - 32px);
  }

  .remaker-faq-page .faq-hero {
    padding: 125px 0 65px;
  }

  .remaker-faq-page .faq-hero h1 {
    font-size: clamp(2.7rem, 12vw, 4rem);
  }

  .remaker-faq-page .faq-hero p {
    font-size: 0.84rem;
  }

  .remaker-faq-page .faq-content {
    padding-bottom: 75px;
  }

  .remaker-faq-page .faq-group {
    margin-bottom: 40px;
  }

  .remaker-faq-page .faq-group h2 {
    font-size: 1.5rem;
  }

  .remaker-faq-page .faq-question {
    padding: 18px;

    font-size: 0.8rem;

    gap: 15px;
  }

  .remaker-faq-page .faq-item-open .faq-answer {
    padding: 0 45px 19px 18px;
  }

  .remaker-faq-page .faq-answer p {
    font-size: 0.76rem;
  }

  .remaker-faq-page .faq-contact {
    flex-direction: column;

    align-items: flex-start;

    padding: 30px 24px;

    border-radius: 20px;
  }

  .remaker-faq-page .faq-contact-button {
    width: 100%;
  }

}


@media (max-width: 480px) {

  .remaker-faq-page .faq-container {
    width: calc(100% - 24px);
  }

  .remaker-faq-page .faq-hero {
    padding-top: 110px;
  }

  .remaker-faq-page .faq-hero h1 {
    font-size: 2.65rem;
  }

  .remaker-faq-page .faq-sidebar {
    display: grid;

    grid-template-columns: 1fr 1fr;
  }

  .remaker-faq-page .faq-sidebar a {
    font-size: 0.68rem;
  }

  .remaker-faq-page .faq-question {
    font-size: 0.76rem;
  }

  .remaker-faq-page .faq-icon {
    width: 28px;
    height: 28px;
  }

}

      `}</style>

      <div className="remaker-page rm-page remaker-faq-page">
        <Navbar />

        <main>
          <section className="faq-hero">
            <div className="faq-container faq-hero-inner">
              <span className="faq-badge">
                <span className="material-symbols-outlined">handyman</span>
                ReMaker Support
              </span>

              <h1>
                Questions about your
                <em> creative orbit?</em>
              </h1>

              <p>
                Find answers about becoming a ReMaker, sourcing materials, using
                the Studio, showcasing your work and selling your creations
                through ReOrbit.
              </p>
            </div>
          </section>

          {/* =====================================================
              FAQ CONTENT
          ===================================================== */}

          <section className="faq-content">
            <div className="faq-container faq-layout">
              {/* SIDEBAR */}

              <aside className="faq-sidebar">
                <span className="faq-sidebar-label">On this page</span>

                {faqGroups.map((group, index) => (
                  <a key={group.title} href={`#faq-group-${index}`}>
                    {group.title}
                  </a>
                ))}
              </aside>

              {/* QUESTIONS */}

              <div>
                {faqGroups.map((group, groupIndex) => (
                  <section
                    className="faq-group"
                    id={`faq-group-${groupIndex}`}
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

                <div className="faq-contact">
                  <div>
                    <h3>Need help with your orbit?</h3>

                    <p>
                      Can't find what you're looking for? Get in touch with the
                      ReOrbit team and we'll help you find the right next step.
                    </p>
                  </div>

                  <a href="/remakers-contact" className="faq-contact-button">
                    Contact us
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
