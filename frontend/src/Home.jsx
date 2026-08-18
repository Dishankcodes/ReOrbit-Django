import React, { useEffect, useState } from "react";
import "./Home.css";

const items = [
  {
    title: "Teak drawer chest, 1970s",
    description:
      "Solid teak four-drawer chest with original brass pulls. Sun-faded top panel, structurally sound.",
    price: "₹4,200",
    location: "Bengaluru",
    impact: "62 kg CO₂e",
    category: "Furniture",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYkmp1RxtipFncf82ttZPoo5AMeUWQXZ4x0d2qyVgIeytNXEc7dUDHHlFi2zPjMUXntoI8gmfQ_JB0-Umo1xYN9iQbyAzeY71ZSk6lgx1Qu7bjNHTCaMDdb_EOsaaEsG1STtFSlxwXQRqyJcuptatzT7imrfrmC_5BReQI6Fjutm--WFqedKKR6mowGjKqK_aS4Ug1LS5NVtfkmg5Nr3dr2kIdCDkhK2So0FMu31ZFkzveSwKo7RogOQ",
  },
  {
    title: "Vintage reading chair",
    description:
      "A classic wooden reading chair with a restored frame and freshly finished seat.",
    price: "₹2,800",
    location: "Pune",
    impact: "38 kg CO₂e",
    category: "Furniture",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD8fsEWMuDS6tP3H8YHowI8FXZi5ipEgQwoPBzzWvj__K_wdHNiTJ20KtKkR00kVzVlHmmyweiwTyzO9dhTAle81e_cnY8dsdB_h_qCd5_wh_5xhOXyTCZEhTC6frgmFAzEDIGHLyq1u5UqJieIK00SGnu8dpIW70YCJXSXZ6mCvF20YQVS5gQo-D48xDCd0eH3Bsu8_q_wD8LAIz3dqPi2CoHlkkpJAts4SrA11s-aEkUa3Z8i2LjwQg",
  },
  {
    title: "Handmade ceramic table lamp",
    description: "Warm ceramic table lamp with carefully restored wiring.",
    price: "₹1,650",
    location: "Ahmedabad",
    impact: "12 kg CO₂e",
    category: "Home & Living",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDKJuCnBWzoLkZZmurTZHo67Oi3tHOzLCimM74JvTF3kXI7O_Gmlc8EuoARQAj_ahgGA0UaysFOc2XnymQUO5b6gKKPviIO_tRXwO-uj1L-FBQbMzKnNd7D5J899qhIyOaIAjubZzSxuSdWwM1EfXNCDDCTaBpP6ccQChhHrrQbU9LkhO1idIKTXkxxn_lZ9SgIErKjpo6SPXFz6ar6-tkQ152sUhYPsbJYHtYFK4WEbTt9pRqF_2sKcQ",
  },
];

const categories = [
  ["chair", "Furniture", "3 live", "/category/furniture"],
  ["styler", "Textiles", "1 live", "/category/textiles"],
  ["cable", "Electronics", "1 live", "/category/electronics"],
  ["local_cafe", "Glass & Ceramics", "1 live", "/category/glass-ceramics"],
  ["carpenter", "Wood & Metal", "1 live", "/category/wood-metal"],
  ["menu_book", "Books & Paper", "1 live", "/category/books-paper"],
];

const remakers = [
  {
    name: "Sana Qureshi",
    specialty: "Furniture revival & marquetry",
    description:
      "Works only with rescued hardwood. Every piece keeps a visible seam where the break was.",
    rescued: "142 items rescued",
    location: "Bengaluru",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJCDIX6X_halhLLL9pkwFMebb4lP-Z_HOhCjzK__ywInzsnbgndfzJ8R6HccEJa_eZsq2SWkumAh48lm0LD93bxorK4CIz6S5obTdPDMTQrWoTJ7WwNIplBn0CpV68Rs4tG909fOy1zATck7Vy8jyfoFAz6bf1r5fP5XQ7lLXEPCGXiC-9PF5GzNJctCM9SKHVm5Zy3Hskn4WkjjlF-b4obRzge3H5IY8Ig9PIcx7ZUpAOhHSOO_5pVA",
  },
  {
    name: "Arjun Pillai",
    specialty: "Metal & lighting",
    description:
      "Rewires and reshapes discarded brass and copper into task lighting with honest joinery.",
    rescued: "87 items rescued",
    location: "Kochi",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD7LsSiRtiZL9r8Yx22SeED3xQGraV841GlsLxZrQ9W2nYSXTZqwLvpypEhOg-OegetkpwO-F_5GDVDNXpIQAIzWHjVuo7HNhMtcpsRQ-zd1mKPjSXn3vPIdkrPpGU0-HG6RAfq5L1S9S5FrxVIEZ7dRrLCBkrntHHMJcE38VKzDMdEzCQ-0i0fsEH23LpxIHk-ZklWG7BBYyieBKt9hZmtYa8Y93Kz8xpdsUbOoey5OwCvGP0Y3S3KeQ",
  },
  {
    name: "Tara Bose",
    specialty: "Textile patchwork",
    description:
      "Turns mill-end handloom into quilts and bags, documenting each fabric's first life.",
    rescued: "210 items rescued",
    location: "Kolkata",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAHwbz1PnwE_6JW1W0uKU224ArcZOjwSzdOnsZNj3z5R_BixH5tMt4acIcd2zHK9_bhGyh98g-rMKSAKwTARrz8mnWiiyrrPQnSd_mZB2ZTQI_Q3BJdVwmp5iMoB2Ruh6UdMTHX2wPVVXOq6Lm-_cpGv5WKaZbM3A3B88WXE39AyX23UAL7y0XErgaxrezTWCNcuylDsZ9E0DOJsPQWwXL_CpxPVX61fgTbAlyQWM_0KMzzGZQtnl0Npg",
  },
];

function Icon({ children, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{children}</span>
  );
}

function ProductCard({ item, variant }) {
  return (
    <article className={`product-card ${variant || ""}`}>
      <div className="product-image">
        <img src={item.image} alt={item.title} />
        <span className="price-pill">{item.price}</span>
        <span className="category-pill">{item.category}</span>
      </div>
      <div className="product-content">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="product-meta">
          <span>
            <Icon>location_on</Icon>
            {item.location}
          </span>
          <span className="impact">
            <Icon>eco</Icon>
            {item.impact}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      document.body.classList.toggle("nav-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="reorbit-page">
      <div className="blob-bg" />

      <nav className="main-nav">
        <div className="nav-inner">
          <a className="brand" href="/">
            <Icon className="brand-icon">eco</Icon>
            <span>ReOrbit</span>
          </a>

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="/marketplace">Marketplace</a>
            <a href="/remakers">ReMakers</a>
            <a href="/about">About</a>
            <a href="/faq">FAQ</a>
          </div>

          <div className="nav-actions">
            <a className="btn btn-outline nav-remaker" href="/remakers">
              Become a ReMaker
            </a>
            <a className="btn btn-primary nav-start" href="/login">
              Get started
            </a>
          </div>

          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
          >
            <Icon>{menuOpen ? "close" : "menu"}</Icon>
          </button>
        </div>
      </nav>

      <main>
        <section className="hero section-container">
          <div className="hero-copy">
            <div className="eyebrow">
              <Icon>sync</Icon> Circular by design
            </div>
            <h1>
              Give the things you own a <em>second orbit.</em>
            </h1>
            <p className="hero-text">
              List what you no longer use. We verify it, arrange a pincode
              pickup, restore what needs work, and connect it with someone who
              can give it a meaningful new life.
            </p>

            <div className="hero-buttons">
              <a className="btn btn-primary btn-large" href="/login">
                Get started — it's free <Icon>arrow_forward</Icon>
              </a>
              <a className="btn btn-outline btn-large" href="/marketplace">
                Explore marketplace
              </a>
              <a className="btn btn-soft btn-large" href="/remakers">
                Become a ReMaker <Icon>build</Icon>
              </a>
            </div>

            <p className="micro-copy">
              No listing fees • Pickup available in 25 pincodes • Earn Orbit
              Points on eligible rescues
            </p>

            <div className="stats">
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
            <ProductCard item={items[0]} variant="card-one" />
            <ProductCard item={items[1]} variant="card-two" />
            <ProductCard item={items[2]} variant="card-three" />
          </div>
        </section>

        <section className="trust-bar">
          <div className="trust-inner section-container">
            {[
              ["verified", "Verified listings"],
              ["local_shipping", "Pincode pickup"],
              ["handyman", "Professional refurbishment"],
              ["park", "Tracked environmental impact"],
            ].map(([icon, text], i) => (
              <React.Fragment key={text}>
                {i > 0 && <div className="trust-divider" />}
                <div className="trust-item">
                  <div className="trust-icon">
                    <Icon>{icon}</Icon>
                  </div>
                  <span>{text}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="section-container material-section">
          <div className="section-heading">
            <div>
              <h2>Start with a material</h2>
              <p>
                Everything is grouped by material so buyers and ReMakers can
                find what they need fast.
              </p>
            </div>
            <a className="text-link desktop-only" href="/marketplace">
              See all listings <Icon>arrow_forward</Icon>
            </a>
          </div>

          <div className="category-grid">
            {categories.map(([icon, title, count, href]) => (
              <a className="category-card" href={href} key={title}>
                <div className="category-icon">
                  <Icon>{icon}</Icon>
                </div>
                <span>{title}</span>
                <small>{count}</small>
              </a>
            ))}
          </div>
          <a className="text-link mobile-only" href="/marketplace">
            See all listings <Icon>arrow_forward</Icon>
          </a>
        </section>

        <section className="lifecycle-section">
          <div className="section-container">
            <div className="lifecycle-heading">
              <h2>One item, four hands</h2>
              <p>
                Every listing moves through a tracked lifecycle, so buyers know
                exactly what they are getting and sellers know where their item
                ended up.
              </p>
            </div>

            <div className="steps">
              {[
                [
                  "01",
                  "You list it",
                  "Photos, condition notes, and whether you want to sell, donate, or offer it as raw material.",
                ],
                [
                  "02",
                  "We verify it",
                  "An admin reviews condition and category, then confirms pickup against your pincode.",
                ],
                [
                  "03",
                  "Warehouse work",
                  "Repairs, cleaning, and testing are logged against the item so its history stays intact.",
                ],
                [
                  "04",
                  "Second orbit",
                  "It sells, goes to a donation partner, or a ReMaker claims it as material for new work.",
                ],
              ].map(([number, title, text]) => (
                <div className="step-card" key={number}>
                  <div className="step-number">{number}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-container orbit-section">
          <h2 className="center-heading">Pick your orbit</h2>
          <div className="orbit-grid">
            {[
              [
                "home",
                "For households",
                "Clear out what you no longer use. Sell it, donate it, or hand it over as material — pickup included.",
                "Start listing",
                "/list",
                "primary",
              ],
              [
                "shopping_cart",
                "For buyers",
                "Shop verified, refurbished pieces with condition notes, seller ratings, and full lifecycle history.",
                "Browse marketplace",
                "/marketplace",
                "outline",
              ],
              [
                "handyman",
                "For ReMakers",
                "Claim rescued material, publish before-and-after showcases, and sell finished work back in.",
                "Visit the ReMaker studio",
                "/remakers",
                "soft",
              ],
            ].map(([icon, title, text, button, href, type]) => (
              <div className="orbit-card" key={title}>
                <div className="orbit-top" />
                <div className="orbit-content">
                  <h3>
                    <Icon>{icon}</Icon>
                    {title}
                  </h3>
                  <p>{text}</p>
                  <a className={`btn btn-${type}`} href={href}>
                    {button}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="remaker-section">
          <div className="section-container">
            <div className="remaker-heading">
              <div>
                <h2>The people who finish the story</h2>
                <p>
                  ReMakers buy verified material directly, publish
                  before-and-after showcases, and sell the finished piece back
                  into the same marketplace.
                </p>
              </div>
              <a className="btn btn-light desktop-only" href="/remakers">
                Meet all ReMakers
              </a>
            </div>

            <div className="remaker-grid">
              {remakers.map((r) => (
                <article className="remaker-card" key={r.name}>
                  <div className="remaker-image">
                    <img src={r.image} alt={r.name} />
                    <div className="image-overlay">
                      View showcase <Icon>arrow_forward</Icon>
                    </div>
                  </div>
                  <h3>{r.name}</h3>
                  <div className="specialty">{r.specialty}</div>
                  <p>{r.description}</p>
                  <div className="remaker-meta">
                    <span>
                      <Icon>eco</Icon>
                      {r.rescued}
                    </span>
                    <span>
                      <Icon>location_on</Icon>
                      {r.location}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <a
              className="btn btn-light mobile-only full-mobile"
              href="/remakers"
            >
              Meet all ReMakers
            </a>
          </div>
        </section>

        <section className="cta section-container">
          <div className="cta-box">
            <div className="cta-glow glow-one" />
            <div className="cta-glow glow-two" />
            <div className="cta-content">
              <h2>You have something at home that deserves a second orbit.</h2>
              <p>
                Join thousands of others in creating a circular economy for the
                things we love.
              </p>
              <div className="cta-buttons">
                <a className="btn btn-primary btn-large" href="/login">
                  Get started
                </a>
                <a className="btn btn-white btn-large" href="/remakers">
                  Become a ReMaker
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-grid section-container">
          <div className="footer-brand">
            <a className="brand" href="/">
              <Icon className="brand-icon">eco</Icon>
              <span>ReOrbit</span>
            </a>
            <p>
              Creating a sustainable marketplace where every item deserves a
              second story.
            </p>
            <div className="socials">
              <a href="#">
                <Icon>photo_camera</Icon>
              </a>
              <a href="#">
                <Icon>share</Icon>
              </a>
            </div>
          </div>

          <FooterColumn
            title="Platform"
            links={[
              ["Marketplace", "/marketplace"],
              ["Impact", "/impact"],
              ["Sustainability", "/sustainability"],
            ]}
          />
          <FooterColumn
            title="Community"
            links={[
              ["ReMakers", "/remakers"],
              ["About Us", "/about"],
              ["Stories", "/stories"],
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              ["Support Center", "/support"],
              ["FAQ", "/faq"],
              ["Contact Us", "/contact"],
            ]}
          />
        </div>

        <div className="footer-bottom section-container">
          <p>© 2024 ReOrbit. Circular by design. All rights reserved.</p>
          <div>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="footer-column">
      <h4>{title}</h4>
      <ul>
        {links.map(([text, href]) => (
          <li key={text}>
            <a href={href}>{text}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
