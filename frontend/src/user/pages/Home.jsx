import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/Home.css";

const products = [
  {
    title: "Teak drawer chest, 1970s",
    description: "Solid teak four-drawer chest with original brass pulls. Sun-faded top panel, structurally sound.",
    price: "₹4,200",
    location: "Bengaluru",
    impact: "62 kg CO₂e",
    category: "Furniture",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYkmp1RxtipFncf82ttZPoo5AMeUWQXZ4x0d2qyVgIeytNXEc7dUDHHlFi2zPjMUXntoI8gmfQ_JB0-Umo1xYN9iQbyAzeY71ZSk6lgx1Qu7bjNHTCaMDdb_EOsaaEsG1STtFSlxwXQRqyJcuptatzT7imrfrmC_5BReQI6Fjutm--WFqedKKR6mowGjKqK_aS4Ug1LS5NVtfkmg5Nr3dr2kIdCDkhK2So0FMu31ZFkzveSwKo7RogOQ"
  },
  {
    title: "Vintage reading chair",
    description: "A classic wooden reading chair with a restored frame and freshly finished seat.",
    price: "₹2,800",
    location: "Pune",
    impact: "38 kg CO₂e",
    category: "Furniture",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8fsEWMuDS6tP3H8YHowI8FXZi5ipEgQwoPBzzWvj__K_wdHNiTJ20KtKkR00kVzVlHmmyweiwTyzO9dhTAle81e_cnY8dsdB_h_qCd5_wh_5xhOXyTCZEhTC6frgmFAzEDIGHLyq1u5UqJieIK00SGnu8dpIW70YCJXSXZ6mCvF20YQVS5gQo-D48xDCd0e3H3Bsu8_q_wD8LAIz3dqPi2CoHlkkpJAts4SrA11s-aEkUa3Z8i2LjwQg"
  },
  {
    title: "Handmade ceramic table lamp",
    description: "Warm ceramic table lamp with carefully restored wiring.",
    price: "₹1,650",
    location: "Ahmedabad",
    impact: "12 kg CO₂e",
    category: "Home & Living",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKJuCnBWzoLkZZmurTZHo67Oi3tHOzLCimM74JvTF3kXI7O_Gmlc8EuoARQAj_ahgGA0UaysFOc2XnymQUO5b6gKKPviIO_tRXwO-uj1L-FBQbMzKnNd7D5J899qhIyOaIAjubZzSxuSdWwM1EfXNCDDCTaBpP6ccQChhHrrQbU9LkhO1idIKTXkxxn_lZ9SgIErKjpo6SPXFz6ar6-tkQ152sUhYPsbJYHtYFK4WEbTt9pRqF_2sKcQ"
  }
];

const categories = [
  ["chair", "Furniture", "3 live"],
  ["styler", "Textiles", "1 live"],
  ["cable", "Electronics", "1 live"],
  ["local_cafe", "Glass & Ceramics", "1 live"],
  ["carpenter", "Wood & Metal", "1 live"],
  ["menu_book", "Books & Paper", "1 live"]
];

const remakers = [
  {
    name: "Tara Bose",
    specialty: "Textile Patchwork",
    text: "Turns mill-end handloom into quilts and bags, documenting each fabric's first life.",
    rescued: "210 items rescued",
    location: "Kolkata",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHwbz1PnwE_6JW1W0uKU224ArcZOjwSzdOnsZNj3z5R_BixH5tMt4acIcd2zHK9_bhGyh98g-rMKSAKwTARrz8mnWiiyrrPQnSd_mZB2ZTQI_Q3BJdVwmp5iMoB2Ruh6UdMTHX2wPVVXOq6Lm-_cpGv5WKaZbM3A3B88WXE39AyX23UAL7y0XErgaxrezTWCNcuylDsZ9E0DOJsPQWwXL_CpxPVX61fgTbAlyQWM_0KMzzGZQtnl0Npg"
  },
  {
    name: "Arjun Mehta",
    specialty: "Upcycled Home Decor",
    text: "Brings overlooked objects to purpose with careful restoration and thoughtful design.",
    rescued: "84 items rescued",
    location: "Ahmedabad",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD7LsSiRtiZL9r8Yx22SeED3xQGraV841GlsLxZrQ9W2nYSXTZqwLvpypEhOg-OegetkpwO-F_5GDVDNXpIQAIzWHjVuo7HNhMtcpsRQ-zd1mKPjSXn3vPIdkrPpGU0-HG6RAfq5L1S9S5FrxVIEZ7dRrLCBkrntHHMJcE38VKzDMdEzCQ-0i0fsEH23LpxIHk-ZklWG7BBYyieBKt9hZmtYa8Y93Kz8xpdsUbOoey5OwCvGP0Y3S3KeQ"
  },
  {
    name: "Priya Shah",
    specialty: "Textile & Repair",
    text: "Transforms forgotten cushions, bags and garments into useful objects with new character.",
    rescued: "96 items rescued",
    location: "Mumbai",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJCDIX6X_halhLLL9pkwFMebb4lP-Z_HOhCjzK__ywInzsnbgndfzJ8R6HccEJa_eZsq2SWkumAh48lm0LD93bxorK4CIz6S5obTdPDMTQrWoTJ7WwNIplBn0CpV68Rs4tG909fOy1zATck7Vy8jyfoFAz6bf1r5fP5XQ7lLXEPCGXiC-9PF5GzNJctCM9SKHVm5Zy3Hskn4WkjjlF-b4obRzge3H5IY8Ig9PIcx7ZUpAOhHSOO_5pVA"
  }
];

const testimonials = [
  {
    text: "I listed a chair on a Sunday. It was picked up Tuesday, and I could follow its journey through ReOrbit.",
    name: "Meera Iyer",
    role: "Seller · Bengaluru"
  },
  {
    text: "The condition notes are genuinely useful. What arrived was exactly what the listing described — no surprises, no disappointment.",
    name: "Kavya Deshpande",
    role: "Buyer · Pune"
  },
  {
    text: "Finding good material used to be difficult. ReOrbit makes sourcing much more organised and reliable for my work.",
    name: "Tara Bose",
    role: "ReMaker · Kolkata"
  }
];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function ProductCard({ product, className }) {
  return (
    <article className={`hero-product ${className}`}>
      <div className="hero-product-image">
        <img src={product.image} alt={product.title} />
        <span className="price-chip">{product.price}</span>
        <span className="category-chip">{product.category}</span>
      </div>
      <div className="hero-product-content">
        <h3>{product.title}</h3>
        <p>{product.description}</p>
        <div className="product-meta">
          <span><Icon>location_on</Icon>{product.location}</span>
          <span className="co2"><Icon>eco</Icon>{product.impact}</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="home">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="hero container">
          <div className="hero-copy">
            <div className="section-badge">
              <Icon>sync</Icon>
              Circular by design
            </div>

            <h1>
              Give the things you own a <em>second orbit.</em>
            </h1>

            <p className="hero-description">
              List what you no longer use. We verify it, arrange a pincode
              pickup, restore what needs work, and connect it with someone
              who can give it a meaningful new life.
            </p>

            <div className="hero-actions">
              <a className="btn-primary btn-large" href="/auth">
                Get started — it's free
                <Icon>arrow_forward</Icon>
              </a>
              <a className="btn-secondary btn-large" href="/discover-marketplace">
                Explore marketplace
              </a>
              <a className="btn-secondary btn-large" href="/remakers-home">
                Become a ReMaker
                <Icon>build</Icon>
              </a>
            </div>

            <p className="hero-note">
              No listing fees • Pickup available in 25 pincodes • Earn Orbit
              Points on eligible rescues
            </p>

            <div className="hero-stats">
              <div>
                <span>Items Rescued</span>
                <strong>1,284</strong>
              </div>
              <div>
                <span>Tonnes CO₂e Saved</span>
                <strong>47.6</strong>
              </div>
              <div>
                <span>ReMakers Onboarded</span>
                <strong>36</strong>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <ProductCard product={products[0]} className="hero-card-one" />
            <ProductCard product={products[1]} className="hero-card-two" />
            <ProductCard product={products[2]} className="hero-card-three" />
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="trust-bar">
          <div className="container trust-grid">
            {[
              ["verified", "Verified listings"],
              ["local_shipping", "Pincode pickup"],
              ["handyman", "Professional refurbishment"],
              ["park", "Tracked environmental impact"]
            ].map(([icon, text]) => (
              <div className="trust-item" key={text}>
                <span className="trust-icon"><Icon>{icon}</Icon></span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* MATERIALS */}
        <section className="materials container">
          <div className="section-header">
            <div>
              <span className="section-badge">Browse materials</span>
              <h2>Start with a material</h2>
              <p>
                Everything is grouped by material so buyers and ReMakers can
                find what they need fast.
              </p>
            </div>
            <a className="section-link" href="/discover-marketplace">
              See all listings <Icon>arrow_forward</Icon>
            </a>
          </div>

          <div className="category-grid">
            {categories.map(([icon, name, count]) => (
              <a className="category-card" href="/discover-marketplace" key={name}>
                <div className="category-icon">
                  <Icon>{icon}</Icon>
                </div>
                <h3>{name}</h3>
                <span>{count}</span>
                <Icon className="category-arrow">arrow_outward</Icon>
              </a>
            ))}
          </div>
        </section>

        {/* LIFECYCLE */}
        <section className="lifecycle">
          <div className="container">
            <div className="lifecycle-heading">
              <span className="section-badge">How it works</span>
              <h2>One item, four hands</h2>
              <p>
                Every listing moves through a tracked lifecycle, so buyers know
                exactly what they are getting and sellers know where their
                item ended up.
              </p>
            </div>

            <div className="steps-grid">
              {[
                ["01", "You list it", "Photos, condition notes, and whether you want to sell, donate, or offer it as raw material."],
                ["02", "We verify it", "An admin reviews condition and category, then confirms pickup against your pincode."],
                ["03", "Warehouse work", "Repairs, cleaning, and testing are logged against the item so its history stays intact."],
                ["04", "Second orbit", "It sells, goes to a donation partner, or a ReMaker claims it as material for new work."]
              ].map(([number, title, text]) => (
                <article className="step-card" key={number}>
                  <div className="step-number">{number}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PICK YOUR ORBIT - NEW SCREENSHOT STYLE */}
        <section className="orbit-section container">
          <div className="orbit-heading">
            <span className="section-badge">
              <Icon>group</Icon>
              Who it's for
            </span>
            <h2>There is a place for everyone</h2>
          </div>

          <div className="orbit-cards">
            <article className="orbit-role-card household">
              <div className="role-icon">
                <Icon>home</Icon>
              </div>
              <h3>For households</h3>
              <p>
                Clear out things you no longer use. Sell them, donate them,
                or give them a chance at a better second life.
              </p>
              <a href="/list" className="role-button">
                Start listing <Icon>arrow_forward</Icon>
              </a>
            </article>

            <article className="orbit-role-card buyers">
              <div className="role-icon">
                <Icon>shopping_bag</Icon>
              </div>
              <h3>For buyers</h3>
              <p>
                Discover verified and refurbished products with honest
                condition details and their complete item history.
              </p>
              <a href="/discover-marketplace" className="role-button">
                Browse marketplace <Icon>arrow_forward</Icon>
              </a>
            </article>

            <article className="orbit-role-card remaker">
              <div className="role-icon">
                <Icon>construction</Icon>
              </div>
              <h3>For ReMakers</h3>
              <p>
                Source rescued materials, showcase your work, and turn
                overlooked items into meaningful creations.
              </p>
              <a href="/remakers-home" className="role-button">
                Join as a ReMaker <Icon>arrow_forward</Icon>
              </a>
            </article>
          </div>
        </section>

        {/* REMAKER STUDIO */}
        <section className="remaker-studio">
          <div className="container">
            <div className="studio-heading">
              <div>
                <span className="studio-badge">The ReMaker studio</span>
                <h2>The people who give items a new story</h2>
                <p>
                  ReMakers source rescued materials, transform overlooked
                  objects into useful creations, and share the story behind
                  their work.
                </p>
              </div>
              <a className="studio-button" href="/discover-remakers">
                Meet the ReMakers <Icon>arrow_forward</Icon>
              </a>
            </div>

            <div className="remaker-grid">
              {remakers.map((person) => (
                <article className="remaker-card" key={person.name}>
                  <div className="remaker-image">
                    <img src={person.image} alt={person.name} />
                    <span className="showcase">
                      View showcase <Icon>arrow_forward</Icon>
                    </span>
                  </div>

                  <div className="remaker-info">
                    <h3>{person.name}</h3>
                    <span className="remaker-specialty">{person.specialty}</span>
                    <p>{person.text}</p>

                    <div className="remaker-meta">
                      <span><Icon>eco</Icon>{person.rescued}</span>
                      <span><Icon>location_on</Icon>{person.location}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="stories container">
          <div className="stories-heading">
            <span className="section-badge">
              <Icon>format_quote</Icon>
              Read stories
            </span>
            <h2>What the orbit sounds like</h2>
          </div>

          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article className="testimonial-card" key={item.name}>
                <div className="stars">★★★★★</div>
                <p>"{item.text}"</p>
                <div className="testimonial-person">
                  <span>{item.name.charAt(0)}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.role}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta container">
          <div className="final-cta-box">
            <div className="cta-glow cta-glow-one" />
            <div className="cta-glow cta-glow-two" />

            <div className="final-cta-content">
              <h2>You have something at home that deserves a second life.</h2>
              <p>
                Join thousands of others in creating a circular economy for
                the things we love.
              </p>

              <div className="final-buttons">
                <a className="btn-primary" href="/auth">
                  Get started <Icon>arrow_forward</Icon>
                </a>
                <a className="cta-outline" href="/remakers-home">
                  Become a ReMaker <Icon>arrow_forward</Icon>
                </a>
              </div>

              <div className="final-stats">
                <strong>12,000+</strong>
                <i />
                <strong>3,500+</strong>
                <i />
                <strong>98%</strong>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
