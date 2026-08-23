import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ReMakerDiscover() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    "Furniture",
    "Home & Decor",
    "Art & Craft",
    "Electronics",
  ];

  const remakers = [
    {
      name: "Aarav Studio",
      specialty: "Furniture & Wood",
      location: "Ahmedabad",
      category: "Furniture",
      image:
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85",
      creations: 24,
      description:
        "Transforms rescued timber and overlooked furniture into functional pieces designed to last.",
      quote:
        "The best material is often the one someone else has already stopped noticing.",
    },
    {
      name: "Second Form",
      specialty: "Upcycled Objects",
      location: "Bengaluru",
      category: "Home & Decor",
      image:
        "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1000&q=85",
      creations: 18,
      description:
        "Reimagines everyday objects and materials into distinctive pieces for modern spaces.",
      quote: "I don't see old objects. I see unfinished ideas.",
    },
    {
      name: "Mitti Works",
      specialty: "Home & Decor",
      location: "Mumbai",
      category: "Home & Decor",
      image:
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
      creations: 31,
      description:
        "Creates expressive home pieces by combining recovered materials with traditional craft.",
      quote: "Every material carries a story. My job is to continue it.",
    },
    {
      name: "ReForm Studio",
      specialty: "Furniture Restoration",
      location: "Pune",
      category: "Furniture",
      image:
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85",
      creations: 16,
      description:
        "Gives old furniture a refreshed identity through careful restoration and redesign.",
      quote:
        "Restoration isn't about making something new. It's about revealing what was already there.",
    },
    {
      name: "Clay & Cycle",
      specialty: "Art & Ceramics",
      location: "Jaipur",
      category: "Art & Craft",
      image:
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85",
      creations: 21,
      description:
        "Combines handmade ceramics with recovered materials to create characterful decor.",
      quote: "Imperfection is where the personality begins.",
    },
    {
      name: "Circuit Again",
      specialty: "Electronics & Components",
      location: "Delhi",
      category: "Electronics",
      image:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85",
      creations: 13,
      description:
        "Repairs, repurposes and redesigns usable electronic components into practical creations.",
      quote: "A broken device can still contain a lot of useful life.",
    },
  ];

  const filteredRemakers =
    activeCategory === "All"
      ? remakers
      : remakers.filter((maker) => maker.category === activeCategory);

  return (
    <>
      <style>{`

        /* =====================================================
           REMAKERS PAGE
        ===================================================== */

        .remakers-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
          overflow-x: hidden;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .remakers-hero {
          padding: 145px 0 105px;
        }

        .remakers-hero-grid {
          display: grid;
          grid-template-columns: 1fr 0.9fr;
          align-items: center;
          gap: 80px;
        }

        .remakers-hero-copy {
          max-width: 690px;
        }

        .remakers-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 8px 14px;

          border: 1px solid var(--border);
          border-radius: 999px;

          background: var(--secondary);
          color: var(--primary);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .remakers-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .remakers-hero h1 {
          margin: 25px 0 22px;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: clamp(3.3rem, 6vw, 5.6rem);
          line-height: 0.96;

          letter-spacing: -0.06em;
        }

        .remakers-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .remakers-hero-copy > p {
          max-width: 620px;

          color: var(--muted-foreground);

          font-size: 0.98rem;
          line-height: 1.8;
        }

        .remakers-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;

          margin-top: 30px;
        }

        .remakers-primary-btn,
        .remakers-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          padding: 13px 21px;

          border-radius: 999px;

          font-size: 0.8rem;
          font-weight: 700;

          text-decoration: none;

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .remakers-primary-btn {
          background: var(--primary);
          color: var(--primary-foreground);
        }

        .remakers-secondary-btn {
          border: 1px solid var(--border);
          color: var(--primary);
          background: transparent;
        }

        .remakers-primary-btn:hover,
        .remakers-secondary-btn:hover {
          transform: translateY(-2px);
        }

        .remakers-secondary-btn:hover {
          background: var(--secondary);
        }

        .remakers-hero-stats {
          display: flex;
          gap: 30px;

          margin-top: 35px;
          padding-top: 24px;

          border-top: 1px solid var(--border);
        }

        .remaker-stat strong {
          display: block;

          color: var(--primary);
          font-family: var(--font-display);

          font-size: 1.4rem;
        }

        .remaker-stat span {
          display: block;

          margin-top: 4px;

          color: var(--muted-foreground);

          font-size: 0.68rem;
        }

        /* =====================================================
           HERO VISUAL
        ===================================================== */

        .remakers-hero-visual {
          position: relative;

          min-height: 500px;
        }

        .remakers-main-image {
          position: absolute;

          width: 68%;
          height: 440px;

          top: 0;
          right: 8%;

          overflow: hidden;

          border-radius: 28px;

          border: 1px solid var(--border);

          box-shadow:
            0 25px 60px rgba(42, 77, 58, 0.12);
        }

        .remakers-main-image img {
          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .remakers-small-image {
          position: absolute;

          width: 42%;
          height: 220px;

          bottom: 0;
          left: 0;

          overflow: hidden;

          border-radius: 22px;

          border: 7px solid var(--background);

          box-shadow:
            0 18px 40px rgba(42, 77, 58, 0.15);
        }

        .remakers-small-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remakers-floating-card {
          position: absolute;

          right: 0;
          bottom: 35px;

          max-width: 220px;

          padding: 17px;

          background: rgba(255,255,255,0.94);

          border: 1px solid var(--border);
          border-radius: 17px;

          box-shadow:
            0 15px 40px rgba(42, 77, 58, 0.12);

          backdrop-filter: blur(10px);
        }

        .remakers-floating-card-top {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-bottom: 8px;
        }

        .remakers-floating-icon {
          width: 31px;
          height: 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--secondary);
          color: var(--primary);
        }

        .remakers-floating-icon .material-symbols-outlined {
          font-size: 16px;
        }

        .remakers-floating-card strong {
          color: var(--primary);
          font-size: 0.74rem;
        }

        .remakers-floating-card p {
          color: var(--muted-foreground);

          font-size: 0.67rem;
          line-height: 1.55;
        }

        /* =====================================================
           FEATURED MAKER
        ===================================================== */

        .featured-remaker {
          padding: 100px 0;

          background: var(--secondary);
        }

        .featured-remaker-grid {
          display: grid;

          grid-template-columns: 0.9fr 1fr;

          align-items: center;

          gap: 75px;
        }

        .featured-remaker-image {
          height: 510px;

          overflow: hidden;

          border-radius: 28px;

          border: 1px solid var(--border);
        }

        .featured-remaker-image img {
          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .featured-remaker-copy {
          max-width: 600px;
        }

        .section-eyebrow {
          display: inline-block;

          color: var(--leaf);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.12em;

          text-transform: uppercase;
        }

        .featured-remaker-copy h2 {
          margin: 12px 0 16px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.5rem, 4vw, 4rem);

          line-height: 1;

          letter-spacing: -0.05em;
        }

        .featured-remaker-copy > p {
          color: var(--muted-foreground);

          font-size: 0.9rem;

          line-height: 1.8;
        }

        .featured-quote {
          margin: 28px 0;

          padding: 20px 22px;

          border-left: 3px solid var(--leaf);

          background: rgba(255,255,255,0.5);

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.05rem;

          line-height: 1.5;
        }

        .featured-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;

          margin-bottom: 25px;
        }

        .featured-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 7px 10px;

          border-radius: 999px;

          background: var(--card);

          border: 1px solid var(--border);

          color: var(--muted-foreground);

          font-size: 0.68rem;
        }

        .featured-meta .material-symbols-outlined {
          color: var(--leaf);
          font-size: 15px;
        }

        /* =====================================================
           DIRECTORY
        ===================================================== */

        .remaker-directory {
          padding: 110px 0;
        }

        .directory-heading {
          display: flex;

          align-items: flex-end;
          justify-content: space-between;

          gap: 40px;

          margin-bottom: 40px;
        }

        .directory-heading h2 {
          margin-top: 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 3.7rem);

          line-height: 1;

          letter-spacing: -0.05em;
        }

        .directory-heading p {
          max-width: 500px;

          color: var(--muted-foreground);

          font-size: 0.86rem;

          line-height: 1.7;
        }

        /* FILTERS */

        .remaker-filters {
          display: flex;

          flex-wrap: wrap;

          gap: 8px;

          margin-bottom: 35px;
        }

        .remaker-filter {
          padding: 9px 15px;

          border: 1px solid var(--border);

          border-radius: 999px;

          background: transparent;

          color: var(--muted-foreground);

          font-family: var(--font-sans);

          font-size: 0.72rem;
          font-weight: 600;

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease;
        }

        .remaker-filter:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .remaker-filter.active {
          background: var(--primary);

          border-color: var(--primary);

          color: var(--primary-foreground);
        }

        /* GRID */

        .remaker-directory-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 20px;
        }

        .remaker-card {
          overflow: hidden;

          background: var(--card);

          border: 1px solid var(--border);

          border-radius: 22px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .remaker-card:hover {
          transform: translateY(-6px);

          box-shadow:
            0 18px 45px rgba(42, 77, 58, 0.1);
        }

        .remaker-card-image {
          position: relative;

          height: 275px;

          overflow: hidden;
        }

        .remaker-card-image img {
          width: 100%;
          height: 100%;

          object-fit: cover;

          transition: transform 0.5s ease;
        }

        .remaker-card:hover img {
          transform: scale(1.04);
        }

        .verified-badge {
          position: absolute;

          top: 14px;
          left: 14px;

          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 7px 10px;

          border-radius: 999px;

          background: rgba(255,255,255,0.94);

          color: var(--primary);

          font-size: 0.62rem;
          font-weight: 700;
        }

        .verified-badge .material-symbols-outlined {
          font-size: 14px;
          color: var(--leaf);
        }

        .creation-count {
          position: absolute;

          right: 14px;
          bottom: 14px;

          padding: 7px 10px;

          border-radius: 999px;

          background: var(--primary);

          color: var(--primary-foreground);

          font-size: 0.62rem;
          font-weight: 700;
        }

        .remaker-card-content {
          padding: 22px;
        }

        .remaker-card-meta {
          display: flex;

          justify-content: space-between;

          gap: 10px;

          color: var(--muted-foreground);

          font-size: 0.64rem;
        }

        .remaker-card h3 {
          margin: 9px 0 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.35rem;
        }

        .remaker-card-description {
          min-height: 55px;

          color: var(--muted-foreground);

          font-size: 0.76rem;

          line-height: 1.65;
        }

        .remaker-card-link {
          display: inline-flex;

          align-items: center;

          gap: 5px;

          margin-top: 17px;

          color: var(--primary);

          font-size: 0.72rem;
          font-weight: 700;

          text-decoration: none;
        }

        .remaker-card-link .material-symbols-outlined {
          font-size: 15px;
        }

        /* =====================================================
           WHY REMAKERS
        ===================================================== */

        .why-remakers {
          padding: 100px 0;

          background: var(--secondary);
        }

        .why-remakers-heading {
          max-width: 650px;

          margin-bottom: 45px;
        }

        .why-remakers-heading h2 {
          margin-top: 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.3rem, 4vw, 3.5rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .why-remakers-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 18px;
        }

        .why-remaker-card {
          padding: 28px;

          background: var(--card);

          border: 1px solid var(--border);

          border-radius: 20px;
        }

        .why-remaker-number {
          color: var(--leaf);

          font-size: 0.7rem;
          font-weight: 800;

          letter-spacing: 0.1em;
        }

        .why-remaker-icon {
          width: 45px;
          height: 45px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin: 30px 0 20px;

          border-radius: 50%;

          background: var(--secondary);

          color: var(--primary);
        }

        .why-remaker-icon .material-symbols-outlined {
          font-size: 21px;
        }

        .why-remaker-card h3 {
          margin-bottom: 9px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.2rem;
        }

        .why-remaker-card p {
          color: var(--muted-foreground);

          font-size: 0.78rem;

          line-height: 1.7;
        }

        /* =====================================================
           CTA
        ===================================================== */

        .remakers-cta {
          padding: 0 0 105px;
        }

        .remakers-cta-box {
          padding: 55px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 40px;

          border-radius: 28px;

          background:
            linear-gradient(
              135deg,
              #2a4d3a,
              #1e3d2f
            );
        }

        .remakers-cta-box h2 {
          max-width: 650px;

          color: white;

          font-family: var(--font-display);

          font-size: clamp(2.1rem, 4vw, 3.4rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .remakers-cta-box p {
          margin-top: 11px;

          color: rgba(255,255,255,0.7);

          font-size: 0.82rem;
        }

        .remakers-cta-button {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          flex-shrink: 0;

          padding: 13px 22px;

          border-radius: 999px;

          background: white;

          color: var(--primary);

          font-size: 0.8rem;
          font-weight: 700;

          text-decoration: none;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1000px) {

          .remakers-hero-grid,
          .featured-remaker-grid {
            grid-template-columns: 1fr;

            gap: 55px;
          }

          .remakers-hero-copy {
            max-width: 760px;
          }

          .remakers-hero-visual {
            max-width: 680px;

            width: 100%;

            margin: 0 auto;
          }

          .remaker-directory-grid {
            grid-template-columns: 1fr 1fr;
          }

          .why-remakers-grid {
            grid-template-columns: 1fr 1fr;
          }

          .why-remaker-card:last-child {
            grid-column: 1 / -1;

            max-width: calc(50% - 9px);

            margin: 0 auto;
          }
        }

        @media (max-width: 700px) {

          .remakers-hero {
            padding: 120px 0 75px;
          }

          .remakers-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4.2rem);
          }

          .remakers-hero-copy > p {
            font-size: 0.88rem;
          }

          .remakers-hero-actions {
            flex-direction: column;
          }

          .remakers-primary-btn,
          .remakers-secondary-btn {
            width: 100%;
          }

          .remakers-hero-stats {
            gap: 18px;
          }

          .remaker-stat strong {
            font-size: 1.2rem;
          }

          .remaker-stat span {
            font-size: 0.61rem;
          }

          .remakers-hero-visual {
            min-height: 390px;
          }

          .remakers-main-image {
            width: 72%;
            height: 340px;
            right: 4%;
          }

          .remakers-small-image {
            width: 45%;
            height: 170px;
          }

          .remakers-floating-card {
            right: 0;
            bottom: 20px;

            max-width: 190px;
          }

          .featured-remaker,
          .remaker-directory,
          .why-remakers {
            padding: 75px 0;
          }

          .featured-remaker-image {
            height: 350px;
          }

          .directory-heading {
            flex-direction: column;
            align-items: flex-start;

            gap: 18px;
          }

          .remaker-directory-grid,
          .why-remakers-grid {
            grid-template-columns: 1fr;
          }

          .why-remaker-card:last-child {
            grid-column: auto;

            max-width: none;
          }

          .remakers-cta {
            padding-bottom: 75px;
          }

          .remakers-cta-box {
            flex-direction: column;

            align-items: flex-start;

            padding: 35px 25px;

            border-radius: 22px;
          }

          .remakers-cta-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {

          .remakers-hero {
            padding-top: 105px;
          }

          .remakers-hero h1 {
            font-size: 2.7rem;
          }

          .remakers-hero-visual {
            min-height: 330px;
          }

          .remakers-main-image {
            height: 285px;
          }

          .remakers-small-image {
            height: 140px;
          }

          .remakers-floating-card {
            max-width: 165px;

            padding: 13px;
          }

          .remakers-floating-card p {
            font-size: 0.6rem;
          }

          .featured-remaker-copy h2,
          .directory-heading h2,
          .why-remakers-heading h2 {
            font-size: 2.25rem;
          }

          .featured-remaker-image {
            height: 300px;
          }
        }

      `}</style>

      <div className="remakers-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="remakers-hero">
          <div className="container remakers-hero-grid">
            <div className="remakers-hero-copy">
              <span className="remakers-badge">
                <span className="material-symbols-outlined">handyman</span>
                The people behind the making
              </span>

              <h1>
                Meet the people
                <br />
                giving things
                <br />
                <em>another life.</em>
              </h1>

              <p>
                ReMakers are creators, restorers and problem-solvers who
                transform rescued materials and overlooked objects into
                something worth keeping.
              </p>

              <div className="remakers-hero-actions">
                <a href="#discover" className="remakers-primary-btn">
                  Discover ReMakers
                  <span className="material-symbols-outlined">
                    arrow_downward
                  </span>
                </a>

                <a href="/marketplace" className="remakers-secondary-btn">
                  Shop their creations
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </div>

              <div className="remakers-hero-stats">
                <div className="remaker-stat">
                  <strong>1,200+</strong>
                  <span>ReMakers</span>
                </div>

                <div className="remaker-stat">
                  <strong>8.4k</strong>
                  <span>Creations made</span>
                </div>

                <div className="remaker-stat">
                  <strong>32k kg</strong>
                  <span>Material kept moving</span>
                </div>
              </div>
            </div>

            <div className="remakers-hero-visual">
              <div className="remakers-main-image">
                <img
                  src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1100&q=85"
                  alt="ReMaker working in a creative studio"
                />
              </div>

              <div className="remakers-small-image">
                <img
                  src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=85"
                  alt="Handcrafted objects in a studio"
                />
              </div>

              <div className="remakers-floating-card">
                <div className="remakers-floating-card-top">
                  <div className="remakers-floating-icon">
                    <span className="material-symbols-outlined">verified</span>
                  </div>

                  <strong>Verified ReMakers</strong>
                </div>

                <p>
                  Discover creators whose work is part of the ReOrbit circular
                  journey.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FEATURED
        ===================================================== */}

        <section className="featured-remaker">
          <div className="container featured-remaker-grid">
            <div className="featured-remaker-image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=85"
                alt="Aarav Studio workspace"
              />
            </div>

            <div className="featured-remaker-copy">
              <span className="section-eyebrow">ReMaker spotlight</span>

              <h2>Aarav Studio</h2>

              <div className="featured-meta">
                <span>
                  <span className="material-symbols-outlined">location_on</span>
                  Ahmedabad
                </span>

                <span>
                  <span className="material-symbols-outlined">chair</span>
                  Furniture & Wood
                </span>

                <span>
                  <span className="material-symbols-outlined">verified</span>
                  Verified
                </span>
              </div>

              <p>
                Aarav works primarily with rescued timber, old furniture frames
                and recovered wood. Instead of replacing what is already
                available, his studio focuses on restoring its usefulness and
                character.
              </p>

              <div className="featured-quote">
                “The best material is often the one someone else has already
                stopped noticing.”
              </div>

              <a href="/remakers/aarav-studio" className="remakers-primary-btn">
                Visit studio
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>

        {/* =====================================================
            DIRECTORY
        ===================================================== */}

        <section className="remaker-directory" id="discover">
          <div className="container">
            <div className="directory-heading">
              <div>
                <span className="section-eyebrow">Explore the community</span>

                <h2>Find your kind of maker.</h2>
              </div>

              <p>
                Browse creators by what they make and discover the people behind
                the products you can find across ReOrbit.
              </p>
            </div>

            <div className="remaker-filters">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`remaker-filter ${
                    activeCategory === category ? "active" : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="remaker-directory-grid">
              {filteredRemakers.map((maker) => (
                <article className="remaker-card" key={maker.name}>
                  <div className="remaker-card-image">
                    <img src={maker.image} alt={maker.name} />

                    <span className="verified-badge">
                      <span className="material-symbols-outlined">
                        verified
                      </span>
                      Verified ReMaker
                    </span>

                    <span className="creation-count">
                      {maker.creations} creations
                    </span>
                  </div>

                  <div className="remaker-card-content">
                    <div className="remaker-card-meta">
                      <span>{maker.specialty}</span>

                      <span>{maker.location}</span>
                    </div>

                    <h3>{maker.name}</h3>

                    <p className="remaker-card-description">
                      {maker.description}
                    </p>

                    <a
                      href={`/remakers/${maker.name
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                      className="remaker-card-link"
                    >
                      View studio
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            WHY REMAKERS
        ===================================================== */}

        <section className="why-remakers">
          <div className="container">
            <div className="why-remakers-heading">
              <span className="section-eyebrow">More than a marketplace</span>

              <h2>Every ReMaker adds another path for an object.</h2>
            </div>

            <div className="why-remakers-grid">
              <article className="why-remaker-card">
                <span className="why-remaker-number">01</span>

                <div className="why-remaker-icon">
                  <span className="material-symbols-outlined">search</span>
                </div>

                <h3>Discover the story</h3>

                <p>
                  Learn who made a creation, what materials they work with and
                  how an overlooked object became something new.
                </p>
              </article>

              <article className="why-remaker-card">
                <span className="why-remaker-number">02</span>

                <div className="why-remaker-icon">
                  <span className="material-symbols-outlined">
                    shopping_bag
                  </span>
                </div>

                <h3>Shop with meaning</h3>

                <p>
                  Buy finished creations made by ReMakers and give yourself
                  something with a story behind it.
                </p>
              </article>

              <article className="why-remaker-card">
                <span className="why-remaker-number">03</span>

                <div className="why-remaker-icon">
                  <span className="material-symbols-outlined">recycling</span>
                </div>

                <h3>Keep materials moving</h3>

                <p>
                  When ReMakers source rescued materials, useful objects get
                  another opportunity instead of being left unused.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
        ===================================================== */}

        <section className="remakers-cta">
          <div className="container">
            <div className="remakers-cta-box">
              <div>
                <h2>Found someone whose work belongs in your space?</h2>

                <p>
                  Explore their creations and discover something made with a
                  second story.
                </p>
              </div>

              <a href="/marketplace" className="remakers-cta-button">
                Explore creations
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
