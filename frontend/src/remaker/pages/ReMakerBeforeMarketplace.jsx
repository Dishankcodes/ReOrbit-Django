import React, { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/ReMakerMarketplace.css";

const materials = [
  {
    id: 1,
    name: "Reclaimed Wooden Panels",
    category: "Wood",
    location: "Ahmedabad",
    condition: "Good",
    quantity: "24 pieces",
    material: "Recovered timber",
    description:
      "Clean reclaimed wooden panels suitable for furniture, shelves, decor and small restoration projects.",
    image:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Salvaged Chair Frames",
    category: "Furniture",
    location: "Pune",
    condition: "Repairable",
    quantity: "12 frames",
    material: "Wood & metal",
    description:
      "Old chair frames available for repair, redesign and creative furniture projects.",
    image:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Glass Containers",
    category: "Glass",
    location: "Mumbai",
    condition: "Good",
    quantity: "60 pieces",
    material: "Glass",
    description:
      "Reusable glass containers that can be transformed into lighting, storage and decorative pieces.",
    image:
      "https://images.unsplash.com/photo-1606913419161-1e3f3b0b8c84?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "Metal Hardware Collection",
    category: "Metal",
    location: "Bengaluru",
    condition: "Good",
    quantity: "150+ pieces",
    material: "Mixed metal",
    description:
      "Recovered handles, brackets, hinges and other hardware for restoration and new creations.",
    image:
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Fabric Offcuts",
    category: "Textile",
    location: "Jaipur",
    condition: "Good",
    quantity: "18 kg",
    material: "Mixed fabric",
    description:
      "Fabric remnants suitable for cushions, bags, patchwork, soft furnishings and creative projects.",
    image:
      "https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Old Wooden Drawers",
    category: "Wood",
    location: "Delhi",
    condition: "Repairable",
    quantity: "18 drawers",
    material: "Solid wood",
    description:
      "Recovered drawers that can become shelves, planters, storage units or decorative installations.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 7,
    name: "Electronic Components",
    category: "Electronics",
    location: "Hyderabad",
    condition: "Mixed",
    quantity: "Various parts",
    material: "Electronic components",
    description:
      "Recovered components and parts intended for repair, experimentation and creative reuse.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 8,
    name: "Ceramic Pieces",
    category: "Ceramic",
    location: "Ahmedabad",
    condition: "Mixed",
    quantity: "35 pieces",
    material: "Ceramic",
    description:
      "Recovered ceramic pieces that can be incorporated into mosaics, decor and artistic projects.",
    image:
      "https://images.unsplash.com/photo-1493106819501-66d381c466f1?auto=format&fit=crop&w=900&q=85",
  },
];

const categories = [
  "All",
  "Wood",
  "Furniture",
  "Glass",
  "Metal",
  "Textile",
  "Electronics",
  "Ceramic",
];

export default function ReMakerBeforeMarketplace() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [location, setLocation] = useState("All locations");
  const [condition, setCondition] = useState("All conditions");

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        item.name.toLowerCase().includes(searchText) ||
        item.category.toLowerCase().includes(searchText) ||
        item.material.toLowerCase().includes(searchText) ||
        item.location.toLowerCase().includes(searchText);

      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const matchesLocation =
        location === "All locations" || item.location === location;

      const matchesCondition =
        condition === "All conditions" || item.condition === condition;

      return (
        matchesSearch && matchesCategory && matchesLocation && matchesCondition
      );
    });
  }, [search, activeCategory, location, condition]);

  const resetFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setLocation("All locations");
    setCondition("All conditions");
  };

  return (
    <div className="remaker-page rm-page remaker-marketplace-page">
      <Navbar />

      <main>
      
        <section className="rm-market-hero">
          <div className="rm-market-container">
            <div className="rm-market-hero-grid">
              <div className="rm-market-hero-copy">
                <span className="rm-market-eyebrow">
                  <span className="material-symbols-outlined">inventory_2</span>
                  ReMaker Material Library
                </span>

                <h1>
                  Find material.
                  <br />
                  <em>Start making.</em>
                </h1>

                <p>
                  Browse rescued, reusable and overlooked materials available
                  through the ReOrbit network. Find something useful for your
                  next creation and give it another orbit.
                </p>

                <div className="rm-market-hero-actions">
                  <a
                    href="#materials"
                    className="rm-market-btn rm-market-btn-primary"
                  >
                    Browse materials
                    <span className="material-symbols-outlined">
                      arrow_downward
                    </span>
                  </a>

                  <a
                    href="/remakers/join"
                    className="rm-market-btn rm-market-btn-secondary"
                  >
                    Become a ReMaker
                  </a>
                </div>
              </div>

              <div className="rm-market-hero-visual">
                <div className="rm-market-hero-image">
                  <img
                    src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85"
                    alt="Materials and objects ready for creative reuse"
                  />

                  <div className="rm-market-floating-card">
                    <span className="material-symbols-outlined">recycling</span>

                    <div>
                      <strong>Materials in motion</strong>
                      <small>Find something ready for another purpose.</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            QUICK STATS
        ===================================================== */}
        <section className="rm-market-stats">
          <div className="rm-market-container">
            <div className="rm-market-stat-grid">
              <div className="rm-market-stat">
                <strong>250+</strong>
                <span>Materials available</span>
              </div>

              <div className="rm-market-stat">
                <strong>18</strong>
                <span>Material categories</span>
              </div>

              <div className="rm-market-stat">
                <strong>25+</strong>
                <span>Pickup locations</span>
              </div>

              <div className="rm-market-stat">
                <strong>100%</strong>
                <span>Built for circular making</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MATERIAL BROWSER
        ===================================================== */}
        <section className="rm-market-browser" id="materials">
          <div className="rm-market-container">
            <div className="rm-market-section-heading">
              <div>
                <span className="rm-market-eyebrow">
                  Explore the collection
                </span>

                <h2>Materials waiting for a new idea.</h2>

                <p>
                  Search through available materials and discover what could
                  become your next creation.
                </p>
              </div>
            </div>

            {/* SEARCH */}
            <div className="rm-market-search-area">
              <div className="rm-market-search">
                <span className="material-symbols-outlined">search</span>

                <input
                  type="text"
                  placeholder="Search materials, categories or locations..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>

              <div className="rm-market-selects">
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option>All locations</option>
                  <option>Ahmedabad</option>
                  <option>Pune</option>
                  <option>Mumbai</option>
                  <option>Bengaluru</option>
                  <option>Jaipur</option>
                  <option>Delhi</option>
                  <option>Hyderabad</option>
                </select>

                <select
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                >
                  <option>All conditions</option>
                  <option>Good</option>
                  <option>Repairable</option>
                  <option>Mixed</option>
                </select>
              </div>
            </div>

            {/* CATEGORY FILTERS */}
            <div className="rm-market-categories">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={
                    activeCategory === category ? "rm-category-active" : ""
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* RESULTS HEADER */}
            <div className="rm-market-results-head">
              <div>
                <strong>{filteredMaterials.length}</strong> materials available
              </div>

              {(search ||
                activeCategory !== "All" ||
                location !== "All locations" ||
                condition !== "All conditions") && (
                <button type="button" onClick={resetFilters}>
                  Clear filters
                  <span className="material-symbols-outlined">restart_alt</span>
                </button>
              )}
            </div>

            {/* MATERIAL GRID */}
            {filteredMaterials.length > 0 ? (
              <div className="rm-material-market-grid">
                {filteredMaterials.map((item) => (
                  <article className="rm-material-market-card" key={item.id}>
                    <div className="rm-material-market-image">
                      <img src={item.image} alt={item.name} />

                      <span className="rm-material-market-category">
                        {item.category}
                      </span>

                      <span className="rm-material-market-condition">
                        {item.condition}
                      </span>
                    </div>

                    <div className="rm-material-market-content">
                      <div className="rm-material-market-meta">
                        <span>
                          <span className="material-symbols-outlined">
                            location_on
                          </span>
                          {item.location}
                        </span>

                        <span>
                          <span className="material-symbols-outlined">
                            inventory_2
                          </span>
                          {item.quantity}
                        </span>
                      </div>

                      <h3>{item.name}</h3>

                      <p>{item.description}</p>

                      <div className="rm-material-market-footer">
                        <div className="rm-material-type">
                          <span className="material-symbols-outlined">
                            recycling
                          </span>
                          {item.material}
                        </div>

                        <a href="/remakers/join">
                          View
                          <span className="material-symbols-outlined">
                            arrow_forward
                          </span>
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rm-market-empty">
                <span className="material-symbols-outlined">search_off</span>

                <h3>No materials found</h3>

                <p>
                  Try another search term or remove some filters to explore more
                  available materials.
                </p>

                <button type="button" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}
        <section className="rm-market-how">
          <div className="rm-market-container">
            <div className="rm-market-how-heading">
              <span className="rm-market-eyebrow rm-market-eyebrow-light">
                From material to making
              </span>

              <h2>Simple sourcing. More meaningful making.</h2>
            </div>

            <div className="rm-market-how-grid">
              <article>
                <span>01</span>
                <div className="rm-market-how-icon">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <h3>Discover</h3>
                <p>
                  Browse available materials and find something that fits your
                  next idea.
                </p>
              </article>

              <article>
                <span>02</span>
                <div className="rm-market-how-icon">
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>
                </div>
                <h3>Choose</h3>
                <p>
                  Check the material details, condition, quantity and location
                  before requesting it.
                </p>
              </article>

              <article>
                <span>03</span>
                <div className="rm-market-how-icon">
                  <span className="material-symbols-outlined">handyman</span>
                </div>
                <h3>Transform</h3>
                <p>
                  Give the material a new purpose through your own craft, repair
                  or creative process.
                </p>
              </article>

              <article>
                <span>04</span>
                <div className="rm-market-how-icon">
                  <span className="material-symbols-outlined">public</span>
                </div>
                <h3>Return to orbit</h3>
                <p>
                  Put your finished creation back into circulation through the
                  ReOrbit marketplace.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="rm-market-cta">
          <div className="rm-market-container">
            <div className="rm-market-cta-inner">
              <div>
                <span className="rm-market-eyebrow">Ready to make?</span>
                <h2>The next great material might already be here.</h2>
                <p>
                  Join ReOrbit as a ReMaker to request materials, create
                  meaningful products and put your work back into circulation.
                </p>
              </div>

              <div className="rm-market-cta-actions">
                <a
                  href="/become-remaker"
                  className="rm-market-btn rm-market-btn-primary"
                >
                  Become a ReMaker
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
  );
}
