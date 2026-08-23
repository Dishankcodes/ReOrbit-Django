import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const products = [
    {
      title: "Restored Wooden Chair",
      category: "ReOrbit Refurbished",
      type: "refurbished",
      price: "₹2,800",
      location: "Ahmedabad",
      condition: "Refurbished",
      material: "Rescued wood",
      image:
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=85",
    },
    {
      title: "Handmade Ceramic Lamp",
      category: "ReMaker Creation",
      type: "remaker",
      price: "₹1,650",
      location: "Ahmedabad",
      condition: "Handmade",
      material: "Reclaimed materials",
      image:
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    },
    {
      title: "Reclaimed Wood Console",
      category: "ReMaker Creation",
      type: "remaker",
      price: "₹4,200",
      location: "Bengaluru",
      condition: "Upcycled",
      material: "Rescued timber",
      image:
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85",
    },
    {
      title: "Vintage Study Table",
      category: "Community Listing",
      type: "user",
      price: "₹2,200",
      location: "Mumbai",
      condition: "Good",
      material: "Wood",
      image:
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85",
    },
    {
      title: "Upcycled Side Table",
      category: "ReMaker Creation",
      type: "remaker",
      price: "₹2,200",
      location: "Mumbai",
      condition: "Upcycled",
      material: "Recovered wood",
      image:
        "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=85",
    },
    {
      title: "Refurbished Lounge Chair",
      category: "ReOrbit Refurbished",
      type: "refurbished",
      price: "₹3,600",
      location: "Jaipur",
      condition: "Refurbished",
      material: "Recovered frame",
      image:
        "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=85",
    },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesTab = activeTab === "all" || product.type === activeTab;

    const matchesSearch =
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase()) ||
      product.material.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <>
      <style>{`
        /* =====================================================
           MARKETPLACE PAGE
        ===================================================== */

        .marketplace-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* =====================================================
           HERO
        ===================================================== */

        .marketplace-hero {
          padding: 145px 0 75px;
        }

        .marketplace-hero-inner {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 70px;
        }

        .marketplace-badge {
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

        .marketplace-badge .material-symbols-outlined {
          font-size: 16px;
        }

        .marketplace-hero h1 {
          max-width: 700px;

          margin: 24px 0 20px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(3rem, 6vw, 5.3rem);

          line-height: 0.96;

          letter-spacing: -0.055em;
        }

        .marketplace-hero h1 em {
          color: var(--leaf);
          font-style: normal;
        }

        .marketplace-hero-description {
          max-width: 620px;

          color: var(--muted-foreground);

          font-size: 0.98rem;
          line-height: 1.75;
        }

        /* =====================================================
           HERO IMAGE
        ===================================================== */

        .marketplace-hero-visual {
          position: relative;
          min-height: 410px;

          border-radius: 28px;

          overflow: hidden;

          border: 1px solid var(--border);

          background: var(--secondary);
        }

        .marketplace-hero-visual img {
          width: 100%;
          height: 410px;

          display: block;

          object-fit: cover;
        }

        .marketplace-visual-card {
          position: absolute;

          left: 20px;
          bottom: 20px;

          display: flex;
          align-items: center;
          gap: 12px;

          padding: 13px 16px;

          background: rgba(250, 249, 247, 0.94);

          border: 1px solid var(--border);

          border-radius: 15px;

          backdrop-filter: blur(8px);
        }

        .marketplace-visual-icon {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: var(--secondary);

          color: var(--primary);
        }

        .marketplace-visual-card strong {
          display: block;

          color: var(--primary);

          font-size: 0.78rem;
        }

        .marketplace-visual-card span {
          display: block;

          margin-top: 3px;

          color: var(--muted-foreground);

          font-size: 0.65rem;
        }

        /* =====================================================
           ACTION SECTION
        ===================================================== */

        .marketplace-actions {
          padding: 0 0 85px;
        }

        .marketplace-action-grid {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 20px;
        }

        .marketplace-action-card {
          position: relative;

          padding: 30px;

          border: 1px solid var(--border);

          border-radius: 22px;

          background: var(--card);

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .marketplace-action-card:hover {
          transform: translateY(-4px);

          box-shadow: 0 14px 35px rgba(42, 77, 58, 0.09);
        }

        .marketplace-action-card.sell {
          background: var(--secondary);
        }

        .marketplace-action-icon {
          width: 48px;
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 20px;

          border-radius: 50%;

          background: var(--card);

          color: var(--primary);
        }

        .marketplace-action-card h3 {
          margin-bottom: 8px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.4rem;
        }

        .marketplace-action-card p {
          max-width: 520px;

          color: var(--muted-foreground);

          font-size: 0.8rem;
          line-height: 1.7;
        }

        .marketplace-action-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          margin-top: 20px;

          padding: 10px 17px;

          border-radius: 999px;

          background: var(--primary);

          color: var(--primary-foreground);

          font-size: 0.75rem;
          font-weight: 700;

          text-decoration: none;
        }

        .marketplace-action-button.light {
          background: transparent;

          color: var(--primary);

          border: 1px solid var(--border);
        }

        /* =====================================================
           MARKETPLACE INTRO
        ===================================================== */

        .marketplace-products {
          padding: 95px 0 110px;

          background: var(--secondary);
        }

        .marketplace-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 40px;

          margin-bottom: 40px;
        }

        .marketplace-eyebrow {
          display: inline-block;

          margin-bottom: 10px;

          color: var(--leaf);

          font-size: 0.68rem;
          font-weight: 800;

          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .marketplace-heading h2 {
          margin: 0;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .marketplace-heading p {
          max-width: 500px;

          color: var(--muted-foreground);

          font-size: 0.85rem;

          line-height: 1.7;
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        .marketplace-tools {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          margin-bottom: 35px;
        }

        .marketplace-search {
          position: relative;

          width: min(420px, 100%);
        }

        .marketplace-search .material-symbols-outlined {
          position: absolute;

          left: 14px;
          top: 50%;

          transform: translateY(-50%);

          color: var(--muted-foreground);

          font-size: 19px;
        }

        .marketplace-search input {
          width: 100%;

          height: 46px;

          padding: 0 16px 0 44px;

          border: 1px solid var(--border);

          border-radius: 999px;

          outline: none;

          background: var(--card);

          color: var(--foreground);

          font-family: var(--font-sans);

          font-size: 0.8rem;
        }

        .marketplace-search input:focus {
          border-color: var(--primary);
        }

        /* =====================================================
           TABS
        ===================================================== */

        .marketplace-tabs {
          display: flex;

          align-items: center;

          gap: 7px;

          flex-wrap: wrap;
        }

        .marketplace-tab {
          padding: 9px 15px;

          border: 1px solid var(--border);

          border-radius: 999px;

          background: var(--card);

          color: var(--muted-foreground);

          font-family: var(--font-sans);

          font-size: 0.7rem;
          font-weight: 600;

          cursor: pointer;
        }

        .marketplace-tab.active {
          background: var(--primary);

          border-color: var(--primary);

          color: var(--primary-foreground);
        }

        /* =====================================================
           PRODUCT GRID
        ===================================================== */

        .marketplace-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 20px;
        }

        .marketplace-product-card {
          overflow: hidden;

          background: var(--card);

          border: 1px solid var(--border);

          border-radius: 20px;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .marketplace-product-card:hover {
          transform: translateY(-5px);

          box-shadow: 0 16px 38px rgba(42, 77, 58, 0.1);
        }

        .marketplace-product-image {
          position: relative;

          height: 250px;

          overflow: hidden;
        }

        .marketplace-product-image img {
          width: 100%;
          height: 100%;

          object-fit: cover;

          display: block;

          transition: transform 0.45s ease;
        }

        .marketplace-product-card:hover img {
          transform: scale(1.04);
        }

        .marketplace-product-tag {
          position: absolute;

          top: 13px;
          left: 13px;

          padding: 6px 10px;

          border-radius: 999px;

          background: rgba(250, 249, 247, 0.94);

          color: var(--primary);

          font-size: 0.6rem;
          font-weight: 700;
        }

        .marketplace-product-price {
          position: absolute;

          top: 13px;
          right: 13px;

          padding: 7px 10px;

          border-radius: 999px;

          background: var(--primary);

          color: var(--primary-foreground);

          font-size: 0.65rem;
          font-weight: 700;
        }

        .marketplace-product-content {
          padding: 20px;
        }

        .marketplace-product-material {
          display: flex;
          align-items: center;
          gap: 5px;

          margin-bottom: 8px;

          color: var(--leaf);

          font-size: 0.62rem;
          font-weight: 700;
        }

        .marketplace-product-material .material-symbols-outlined {
          font-size: 14px;
        }

        .marketplace-product-content h3 {
          margin-bottom: 10px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.05rem;
        }

        .marketplace-product-meta {
          display: flex;
          justify-content: space-between;

          gap: 10px;

          color: var(--muted-foreground);

          font-size: 0.65rem;
        }

        /* =====================================================
           BUY FLOW INFO
        ===================================================== */

        .marketplace-paths {
          padding: 105px 0;
        }

        .marketplace-path-heading {
          max-width: 680px;

          margin-bottom: 45px;
        }

        .marketplace-path-heading h2 {
          margin-bottom: 12px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: clamp(2.2rem, 4vw, 3.5rem);

          line-height: 1;

          letter-spacing: -0.045em;
        }

        .marketplace-path-heading p {
          color: var(--muted-foreground);

          font-size: 0.88rem;

          line-height: 1.7;
        }

        .marketplace-path-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 18px;
        }

        .marketplace-path-card {
          padding: 28px;

          border: 1px solid var(--border);

          border-radius: 20px;

          background: var(--card);
        }

        .marketplace-path-number {
          color: var(--leaf);

          font-size: 0.68rem;

          font-weight: 800;

          letter-spacing: 0.1em;
        }

        .marketplace-path-card h3 {
          margin: 30px 0 9px;

          color: var(--primary);

          font-family: var(--font-display);

          font-size: 1.25rem;
        }

        .marketplace-path-card p {
          color: var(--muted-foreground);

          font-size: 0.78rem;

          line-height: 1.7;
        }

        /* =====================================================
           FINAL CTA
        ===================================================== */

        .marketplace-cta {
          padding: 0 0 100px;
        }

        .marketplace-cta-box {
          padding: 50px;

          border-radius: 27px;

          background: linear-gradient(
            135deg,
            #2a4d3a,
            #1e3d2f
          );

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 35px;
        }

        .marketplace-cta-box h2 {
          color: white;

          font-family: var(--font-display);

          font-size: clamp(2rem, 4vw, 3rem);

          line-height: 1.05;
        }

        .marketplace-cta-box p {
          margin-top: 10px;

          color: rgba(255,255,255,0.7);

          font-size: 0.82rem;
        }

        .marketplace-cta-button {
          flex-shrink: 0;

          display: inline-flex;
          align-items: center;
          gap: 7px;

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

        @media (max-width: 950px) {

          .marketplace-hero-inner {
            grid-template-columns: 1fr;

            gap: 45px;
          }

          .marketplace-hero-visual {
            max-width: 650px;
          }

          .marketplace-grid {
            grid-template-columns: 1fr 1fr;
          }

          .marketplace-path-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 700px) {

          .marketplace-hero {
            padding: 120px 0 65px;
          }

          .marketplace-hero h1 {
            font-size: clamp(2.7rem, 12vw, 4rem);
          }

          .marketplace-hero-description {
            font-size: 0.88rem;
          }

          .marketplace-action-grid {
            grid-template-columns: 1fr;
          }

          .marketplace-products,
          .marketplace-paths {
            padding: 75px 0;
          }

          .marketplace-heading,
          .marketplace-tools {
            flex-direction: column;

            align-items: flex-start;
          }

          .marketplace-search {
            width: 100%;
          }

          .marketplace-grid,
          .marketplace-path-grid {
            grid-template-columns: 1fr;
          }

          .marketplace-cta-box {
            flex-direction: column;

            align-items: flex-start;

            padding: 35px 25px;

            border-radius: 22px;
          }

          .marketplace-cta-button {
            width: 100%;

            justify-content: center;
          }
        }

        @media (max-width: 480px) {

          .marketplace-hero {
            padding-top: 105px;
          }

          .marketplace-hero h1 {
            font-size: 2.65rem;
          }

          .marketplace-action-card,
          .marketplace-path-card {
            padding: 24px;
          }

          .marketplace-product-image {
            height: 230px;
          }
        }
      `}</style>

      <div className="marketplace-page">
        <Navbar />

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="marketplace-hero">
          <div className="container marketplace-hero-inner">
            <div>
              <span className="marketplace-badge">
                <span className="material-symbols-outlined">store</span>
                ReOrbit Marketplace
              </span>

              <h1>
                Give something.
                <br />
                Find something.
                <br />
                <em>Keep it in orbit.</em>
              </h1>

              <p className="marketplace-hero-description">
                Sell or donate things you no longer need, or discover products
                created, restored and rescued through the ReOrbit community.
              </p>
            </div>

            <div className="marketplace-hero-visual">
              <img
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85"
                alt="Beautiful restored furniture and home objects"
              />

              <div className="marketplace-visual-card">
                <div className="marketplace-visual-icon">
                  <span className="material-symbols-outlined">autorenew</span>
                </div>

                <div>
                  <strong>More than a marketplace.</strong>
                  <span>Every item gets another possibility.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            USER ACTIONS
        ===================================================== */}

        <section className="marketplace-actions">
          <div className="container">
            <div className="marketplace-action-grid">
              {/* SELL */}
              <article className="marketplace-action-card sell">
                <div className="marketplace-action-icon">
                  <span className="material-symbols-outlined">sell</span>
                </div>

                <h3>Have something to give?</h3>

                <p>
                  List an item you no longer need. Add its photos, condition and
                  details, then let someone else give it a useful second
                  chapter.
                </p>

                <a href="/login" className="marketplace-action-button">
                  Sell an item
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </article>

              {/* DONATE */}
              <article className="marketplace-action-card">
                <div className="marketplace-action-icon">
                  <span className="material-symbols-outlined">
                    volunteer_activism
                  </span>
                </div>

                <h3>Want to give it away?</h3>

                <p>
                  Donate useful items to ReOrbit and let them enter the
                  refurbishment, recovery or redistribution journey where
                  applicable.
                </p>

                <a href="/login" className="marketplace-action-button light">
                  Donate an item
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================
            MARKETPLACE
        ===================================================== */}

        <section className="marketplace-products">
          <div className="container">
            <div className="marketplace-heading">
              <div>
                <span className="marketplace-eyebrow">
                  Discover what is in orbit
                </span>

                <h2>Find something worth keeping.</h2>
              </div>

              <p>
                Browse items from the ReOrbit community, creations from
                ReMakers, and products that have been restored through ReOrbit.
              </p>
            </div>

            {/* SEARCH + FILTERS */}

            <div className="marketplace-tools">
              <div className="marketplace-search">
                <span className="material-symbols-outlined">search</span>

                <input
                  type="text"
                  placeholder="Search products, materials or categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="marketplace-tabs">
                <button
                  className={`marketplace-tab ${
                    activeTab === "all" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("all")}
                >
                  All
                </button>

                <button
                  className={`marketplace-tab ${
                    activeTab === "user" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("user")}
                >
                  Community Listings
                </button>

                <button
                  className={`marketplace-tab ${
                    activeTab === "remaker" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("remaker")}
                >
                  ReMaker Creations
                </button>

                <button
                  className={`marketplace-tab ${
                    activeTab === "refurbished" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("refurbished")}
                >
                  ReOrbit Refurbished
                </button>
              </div>
            </div>

            {/* PRODUCT GRID */}

            <div className="marketplace-grid">
              {filteredProducts.map((product) => (
                <article
                  className="marketplace-product-card"
                  key={product.title}
                >
                  <div className="marketplace-product-image">
                    <img src={product.image} alt={product.title} />

                    <span className="marketplace-product-tag">
                      {product.category}
                    </span>

                    <span className="marketplace-product-price">
                      {product.price}
                    </span>
                  </div>

                  <div className="marketplace-product-content">
                    <div className="marketplace-product-material">
                      <span className="material-symbols-outlined">
                        recycling
                      </span>

                      {product.material}
                    </div>

                    <h3>{product.title}</h3>

                    <div className="marketplace-product-meta">
                      <span>{product.condition}</span>

                      <span>
                        <span className="material-symbols-outlined">
                          location_on
                        </span>{" "}
                        {product.location}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            THREE MARKETPLACE SOURCES
        ===================================================== */}

        <section className="marketplace-paths">
          <div className="container">
            <div className="marketplace-path-heading">
              <span className="marketplace-eyebrow">
                Three ways products reach you
              </span>

              <h2>
                Different journeys.
                <br />
                One marketplace.
              </h2>

              <p>
                ReOrbit brings together products that come from different parts
                of the ecosystem, while keeping their journey clear.
              </p>
            </div>

            <div className="marketplace-path-grid">
              <article className="marketplace-path-card">
                <span className="marketplace-path-number">01 — COMMUNITY</span>

                <h3>User Listings</h3>

                <p>
                  Buy useful items directly from people who no longer need them
                  and give those objects another home.
                </p>
              </article>

              <article className="marketplace-path-card">
                <span className="marketplace-path-number">02 — REMAKERS</span>

                <h3>ReMaker Creations</h3>

                <p>
                  Discover unique products created by ReMakers using rescued,
                  recovered and overlooked materials.
                </p>
              </article>

              <article className="marketplace-path-card">
                <span className="marketplace-path-number">03 — REORBIT</span>

                <h3>Refurbished Products</h3>

                <p>
                  Explore products that have been recovered, refurbished or
                  prepared through the ReOrbit management process.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
        ===================================================== */}

        <section className="marketplace-cta">
          <div className="container">
            <div className="marketplace-cta-box">
              <div>
                <h2>Have something sitting unused?</h2>

                <p>
                  Sell it, donate it, or let ReOrbit help it find another
                  purpose.
                </p>
              </div>

              <a href="/login" className="marketplace-cta-button">
                Start with ReOrbit
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
