import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/ReMakers.css";

const materials = [
  {
    icon: "chair",
    title: "Furniture",
    text: "Wood, frames, panels and overlooked pieces ready for a second life.",
  },
  {
    icon: "construction",
    title: "Building materials",
    text: "Salvaged fixtures, hardware and useful materials from local clear-outs.",
  },
  {
    icon: "devices",
    title: "Electronics",
    text: "Parts, components and devices that can be repaired, reused or reimagined.",
  },
];

const featuredProducts = [
  {
    title: "Restored Reading Chair",
    category: "Furniture",
    price: "₹2,800",
    location: "Pune",
    image:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=85",
    material: "Rescued wood",
  },
  {
    title: "Handmade Ceramic Lamp",
    category: "Home & Living",
    price: "₹1,650",
    location: "Ahmedabad",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    material: "Reclaimed materials",
  },
  {
    title: "Reclaimed Wood Console",
    category: "Furniture",
    price: "₹4,200",
    location: "Bengaluru",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85",
    material: "Rescued timber",
  },
  {
    title: "Upcycled Side Table",
    category: "Furniture",
    price: "₹2,200",
    location: "Mumbai",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=85",
    material: "Recovered wood",
  },
  {
    title: "Reclaimed Wall Art",
    category: "Decor",
    price: "₹1,200",
    location: "Delhi",
    image:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=85",
    material: "Repurposed materials",
  },
  {
    title: "Restored Lounge Chair",
    category: "Furniture",
    price: "₹3,600",
    location: "Jaipur",
    image:
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=85",
    material: "Rescued frame",
  },
];

const makers = [
  {
    name: "Aarav Studio",
    specialty: "Furniture & wood",
    location: "Ahmedabad",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85",
    quote: "I turn rescued timber into pieces people want to keep.",
  },
  {
    name: "Second Form",
    specialty: "Upcycled objects",
    location: "Bengaluru",
    image:
      "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1000&q=85",
    quote: "Every overlooked object has another version waiting to happen.",
  },
  {
    name: "Mitti Works",
    specialty: "Home & decor",
    location: "Mumbai",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
    quote: "The best material is often the material already around us.",
  },
];

const journey = [
  {
    number: "01",
    title: "Find material",
    text: "Browse verified rescued materials from households and local partners.",
  },
  {
    number: "02",
    title: "Claim what fits",
    text: "Choose material that matches your craft, process and next creation.",
  },
  {
    number: "03",
    title: "Make something new",
    text: "Repair, redesign, transform and document the journey.",
  },
  {
    number: "04",
    title: "Put it back in orbit",
    text: "Sell your finished work through ReOrbit and keep the story moving.",
  },
];

const testimonials = [
  {
    text: "ReOrbit makes sourcing feel less like searching for leftovers and more like discovering possibilities.",
    name: "Meera Shah",
    role: "Independent ReMaker",
  },
  {
    text: "The lifecycle story gives customers a reason to care about the finished piece, not just how it looks.",
    name: "Kabir Patel",
    role: "Furniture maker",
  },
  {
    text: "Having verified material and a place to sell the final work closes the loop beautifully.",
    name: "Riya Mehta",
    role: "Upcycling artist",
  },
];

export default function ReMakers() {
  return (
    <div className="rm-page">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="rm-hero">
          <div className="rm-container">
            <div className="rm-hero-grid">
              <div className="rm-hero-copy">
                <span className="rm-badge">
                  <span className="material-symbols-outlined">handyman</span>
                  Built for ReMakers
                </span>

                <h1>
                  Make more
                  <br />
                  from what&apos;s
                  <br />
                  <em>already here.</em>
                </h1>

                <p>
                  Source rescued materials, transform overlooked objects into
                  meaningful creations, and build your making business with
                  ReOrbit.
                </p>

                <div className="rm-hero-buttons">
                  <a className="rm-btn rm-btn-primary" href="/remakers/join">
                    Become a ReMaker
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>

                  <a className="rm-btn rm-btn-secondary" href="#featured">
                    Meet the ReMakers
                  </a>
                </div>

                <div className="rm-trust-row">
                  <span>
                    <span className="material-symbols-outlined">verified</span>
                    Verified material
                  </span>
                  <span>
                    <span className="material-symbols-outlined">
                      local_shipping
                    </span>
                    Pickup support
                  </span>
                  <span>
                    <span className="material-symbols-outlined">
                      storefront
                    </span>
                    Sell on ReOrbit
                  </span>
                </div>
              </div>

              <div className="rm-gallery" aria-label="ReMaker creations">
                <div className="rm-photo">
                  <img
                    src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85"
                    alt="Handcrafted furniture in a bright studio"
                  />
                </div>

                <div className="rm-photo rm-photo-raised">
                  <img
                    src="https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85"
                    alt="Colorful handmade artwork"
                  />
                </div>

                <div className="rm-photo">
                  <img
                    src="https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1000&q=85"
                    alt="Crafted interior objects"
                  />
                </div>

                <div className="rm-orbit-note">
                  <span className="material-symbols-outlined">recycling</span>
                  <div>
                    <strong>Keep materials moving</strong>
                    <small>One creation can start another orbit.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="rm-stats">
          <div className="rm-container">
            <div className="rm-stats-grid">
              <div className="rm-stat">
                <strong>1,200+</strong>
                <span>ReMakers discovering new material</span>
              </div>
              <div className="rm-stat">
                <strong>8.4k</strong>
                <span>Items given another purpose</span>
              </div>
              <div className="rm-stat">
                <strong>32k kg</strong>
                <span>Material kept in circulation</span>
              </div>
              <div className="rm-stat">
                <strong>4.9/5</strong>
                <span>Average ReMaker community rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* MATERIALS */}
        <section className="rm-section" id="materials">
          <div className="rm-container">
            <div className="rm-section-head">
              <div>
                <span className="rm-eyebrow">Source differently</span>
                <h2>Material with a story.</h2>
                <p>
                  Find useful, verified material without starting from scratch.
                  ReOrbit connects makers with things that still have plenty
                  left to give.
                </p>
              </div>

              <a className="rm-btn rm-btn-secondary" href="/marketplace">
                Browse materials
                <span className="material-symbols-outlined">arrow_outward</span>
              </a>
            </div>

            <div className="rm-material-grid">
              {materials.map((material) => (
                <article className="rm-material-card" key={material.title}>
                  <div className="rm-icon-box">
                    <span className="material-symbols-outlined">
                      {material.icon}
                    </span>
                  </div>
                  <h3>{material.title}</h3>
                  <p>{material.text}</p>
                  <a href="/marketplace">
                    Explore
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="rm-products-section">
          <div className="rm-container">
            <div className="rm-products-head">
              <div>
                <span className="rm-eyebrow">Fresh from the studio</span>

                <h2>Featured creations.</h2>

                <p>
                  Discover what ReMakers are creating from materials that were
                  ready for another life.
                </p>
              </div>

              <a className="rm-btn rm-btn-secondary" href="/marketplace">
                Explore marketplace
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>

          {/* Automatic Carousel */}
          <div className="rm-products-slider">
            <div className="rm-products-track">
              {/* First set */}
              {featuredProducts.map((product, index) => (
                <article
                  className="rm-product-card"
                  key={`${product.title}-${index}`}
                >
                  <div className="rm-product-image">
                    <img src={product.image} alt={product.title} />

                    <span className="rm-product-category">
                      {product.category}
                    </span>

                    <span className="rm-product-price">{product.price}</span>
                  </div>

                  <div className="rm-product-content">
                    <div className="rm-product-material">
                      <span className="material-symbols-outlined">
                        recycling
                      </span>

                      {product.material}
                    </div>

                    <h3>{product.title}</h3>

                    <div className="rm-product-location">
                      <span className="material-symbols-outlined">
                        location_on
                      </span>

                      {product.location}
                    </div>
                  </div>
                </article>
              ))}

              {/* Duplicate set for seamless infinite swipe */}
              {featuredProducts.map((product, index) => (
                <article
                  className="rm-product-card"
                  key={`duplicate-${product.title}-${index}`}
                  aria-hidden="true"
                >
                  <div className="rm-product-image">
                    <img src={product.image} alt="" />

                    <span className="rm-product-category">
                      {product.category}
                    </span>

                    <span className="rm-product-price">{product.price}</span>
                  </div>

                  <div className="rm-product-content">
                    <div className="rm-product-material">
                      <span className="material-symbols-outlined">
                        recycling
                      </span>

                      {product.material}
                    </div>

                    <h3>{product.title}</h3>

                    <div className="rm-product-location">
                      <span className="material-symbols-outlined">
                        location_on
                      </span>

                      {product.location}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        {/* FEATURED */}
        <section className="rm-section rm-featured" id="featured">
          <div className="rm-container">
            <div className="rm-section-head">
              <div>
                <span className="rm-eyebrow">People behind the making</span>
                <h2>Meet the ReMakers.</h2>
                <p>
                  Discover makers who turn rescued materials into useful,
                  beautiful and one-of-a-kind work.
                </p>
              </div>

              <a className="rm-btn rm-btn-secondary" href="/remakers">
                View all ReMakers
              </a>
            </div>

            <div className="rm-maker-grid">
              {makers.map((maker) => (
                <article className="rm-maker-card" key={maker.name}>
                  <div className="rm-maker-image">
                    <img src={maker.image} alt={maker.name} />
                    <span className="rm-maker-tag">
                      <span className="material-symbols-outlined">
                        verified
                      </span>
                      Verified
                    </span>
                  </div>

                  <div className="rm-maker-content">
                    <div className="rm-maker-meta">
                      <span>{maker.specialty}</span>
                      <span>{maker.location}</span>
                    </div>

                    <h3>{maker.name}</h3>
                    <p>&quot;{maker.quote}&quot;</p>

                    <a href="/remakers/studio">
                      Visit studio
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

        {/* JOURNEY */}
        <section className="rm-journey-section" id="how-it-works">
          <div className="rm-container">
            <div className="rm-section-head rm-light-head">
              <div>
                <span className="rm-eyebrow rm-eyebrow-light">
                  The ReMaker journey
                </span>
                <h2>From rescued to remarkable.</h2>
                <p>
                  A simple loop designed around sourcing, making and putting
                  your finished work back into circulation.
                </p>
              </div>
            </div>

            <div className="rm-journey-grid">
              {journey.map((step) => (
                <article className="rm-journey-card" key={step.number}>
                  <span className="rm-step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <span className="rm-step-arrow material-symbols-outlined">
                    arrow_forward
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="rm-section" id="stories">
          <div className="rm-container">
            <div className="rm-centered-heading">
              <span className="rm-eyebrow">From the community</span>
              <h2>Good making is better together.</h2>
            </div>

            <div className="rm-testimonial-grid">
              {testimonials.map((item) => (
                <article className="rm-testimonial-card" key={item.name}>
                  <div className="rm-quote-mark">“</div>
                  <p>{item.text}</p>
                  <div className="rm-testimonial-person">
                    <div className="rm-avatar">{item.name.charAt(0)}</div>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="rm-final-cta">
          <div className="rm-container">
            <div className="rm-cta-inner">
              <div>
                <span className="rm-eyebrow rm-eyebrow-light">
                  Your next creation starts here
                </span>
                <h2>Ready to make something worth keeping?</h2>
                <p>
                  Join the ReOrbit ReMaker community, source rescued material,
                  and put your work back into the world.
                </p>
              </div>

              <div className="rm-cta-actions">
                <a className="rm-btn rm-btn-white" href="/remakers/join">
                  Become a ReMaker
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </a>

                <a className="rm-text-link" href="/marketplace">
                  Explore materials
                  <span className="material-symbols-outlined">
                    arrow_outward
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
