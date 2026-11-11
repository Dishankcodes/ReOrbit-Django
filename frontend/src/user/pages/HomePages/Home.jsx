import { isSignedIn } from "../../../api/session";
import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import BannerSlot from "../../../shared/components/BannerSlot";
import { inr, initialsImage, usePublic } from "../../../api/publicData";
import "../../css/Home.css";

/* The three cards on the right of the hero. Real listings replace them as they appear. */
const HERO_DEFAULT = [
  {
    title: "Teak drawer chest, 1970s",
    description:
      "Solid teak four-drawer chest with original brass pulls. Sun-faded top panel, structurally sound.",
    price: "₹4,200",
    location: "Ahmedabad",
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
    location: "Ahmedabad",
    impact: "38 kg CO₂e",
    category: "Furniture",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD8fsEWMuDS6tP3H8YHowI8FXZi5ipEgQwoPBzzWvj__K_wdHNiTJ20KtKkR00kVzVlHmmyweiwTyzO9dhTAle81e_cnY8dsdB_h_qCd5_wh_5xhOXyTCZEhTC6frgmFAzEDIGHLyq1u5UqJieIK00SGnu8dpIW70YCJXSXZ6mCvF20YQVS5gQo-D48xDCd0e3H3Bsu8_q_wD8LAIz3dqPi2CoHlkkpJAts4SrA11s-aEkUa3Z8i2LjwQg",
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

const testimonials = [
  {
    text: "I listed a chair on a Sunday. It was picked up Tuesday, and I could follow its journey through ReOrbit.",
    name: "Meera Iyer",
    role: "Seller · Ahmedabad",
  },
  {
    text: "The condition notes are genuinely useful. What arrived was exactly what the listing described — no surprises, no disappointment.",
    name: "Kavya Deshpande",
    role: "Buyer · Ahmedabad",
  },
  {
    text: "Finding good material used to be difficult. ReOrbit makes sourcing much more organised and reliable for my work.",
    name: "Tara Bose",
    role: "ReMaker · Ahmedabad",
  },
];

const CATEGORY_ICON = [
  [/furnit|chair|table/i, "chair"],
  [/textile|cloth|fabric/i, "styler"],
  [/electron|appliance/i, "cable"],
  [/glass|ceramic|pottery/i, "local_cafe"],
  [/wood|metal|tool/i, "carpenter"],
  [/book|paper|stationer/i, "menu_book"],
  [/decor|home|living|lamp|light/i, "home"],
  [/art|craft/i, "palette"],
  [/toy|kid/i, "toys"],
];
const iconFor = (name) =>
  (CATEGORY_ICON.find(([re]) => re.test(name)) || [0, "category"])[1];

/* Real data only. Nothing invented is shown: with no products or ReMakers yet, those
   blocks are simply left out, and the counts read zero. */
function useHomeData() {
  const { data } = usePublic("/home/");
  const real = data || null;
  const cards = (real?.products || []).filter((p) => p.cover);
  const live = cards.slice(0, 3).map((p) => ({
    title: p.title,
    description: p.summary || "",
    price: inr(p.price),
    location: p.city || "Gujarat",
    impact: "",
    category: p.category.name,
    image: p.cover,
  }));
  const products = [...live, ...HERO_DEFAULT.slice(live.length)];
  const categories = real?.categories?.length
    ? real.categories.map((c) => [iconFor(c.name), c.name, `${c.live} live`])
    : [];
  const remakers = real?.remakers?.length
    ? real.remakers.map((r) => ({
        name: r.name,
        specialty: r.specialty || "ReMaker",
        text: r.bio || "Gives reclaimed material a second life.",
        rescued: `${r.creations} ${r.creations === 1 ? "piece" : "pieces"} live`,
        location: r.city || "Gujarat",
        image: r.image || initialsImage(r.name),
      }))
    : [];
  const st = real?.stats || {
    items_rescued: 0,
    co2_tonnes: 0,
    remakers: 0,
    members: 0,
    live_products: 0,
  };
  const hero = [
    ["Items Rescued", String(st.items_rescued)],
    ["Tonnes CO₂e Saved", String(st.co2_tonnes)],
    ["ReMakers Onboarded", String(st.remakers)],
  ];
  const final = [
    st.members.toLocaleString("en-IN"),
    st.live_products.toLocaleString("en-IN"),
    st.remakers.toLocaleString("en-IN"),
  ];
  return { products, categories, remakers, hero, final };
}

function Icon({ children, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{children}</span>
  );
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
          <span>
            <Icon>location_on</Icon>
            {product.location}
          </span>
          {product.impact && (
            <span className="co2">
              <Icon>eco</Icon>
              {product.impact}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

const viewerKind = () => {
  try {
    return isSignedIn("user") ? "Signed-in members" : "Visitors only";
  } catch {
    return "Visitors only";
  }
};

export default function Home() {
  const viewer = viewerKind();
  const { products, categories, remakers, hero, final } = useHomeData();
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
              List what you no longer use. We arrange a pincode pickup, restore
              what needs work, and connect it with someone who can give it a
              meaningful new life.
            </p>

            <div className="hero-actions">
              <a className="btn-primary btn-large" href="/auth">
                Get started — it's free
                <Icon>arrow_forward</Icon>
              </a>
              <a
                className="btn-secondary btn-large"
                href="/discover-marketplace"
              >
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
              {hero.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          {products.length > 0 && (
            <div className="hero-visual">
              {products.map((product, i) => (
                <ProductCard
                  key={product.title + i}
                  product={product}
                  className={
                    ["hero-card-one", "hero-card-two", "hero-card-three"][i]
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* BANNERS from Admin > Content */}
        <div className="container">
          <BannerSlot placement="Home hero" viewer={viewer} />
          <BannerSlot placement="Home strip" viewer={viewer} />
        </div>

        {/* TRUST BAR */}
        <section className="trust-bar">
          <div className="container trust-grid">
            {[
              ["fact_check", "Honest condition notes"],
              ["local_shipping", "Pincode pickup"],
              ["handyman", "Professional refurbishment"],
              ["park", "Tracked environmental impact"],
            ].map(([icon, text]) => (
              <div className="trust-item" key={text}>
                <span className="trust-icon">
                  <Icon>{icon}</Icon>
                </span>
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
              <a
                className="category-card"
                href="/discover-marketplace"
                key={name}
              >
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
                exactly what they are getting and sellers know where their item
                ended up.
              </p>
            </div>

            <div className="steps-grid">
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
                Clear out things you no longer use. Sell them, donate them, or
                give them a chance at a better second life.
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
                Discover pre-loved and refurbished products with honest
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

        {/* REMAKER STUDIO (real ReMakers only) */}
        {remakers.length > 0 && (
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
                      <span className="remaker-specialty">
                        {person.specialty}
                      </span>
                      <p>{person.text}</p>

                      <div className="remaker-meta">
                        <span>
                          <Icon>eco</Icon>
                          {person.rescued}
                        </span>
                        <span>
                          <Icon>location_on</Icon>
                          {person.location}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

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
                Join thousands of others in creating a circular economy for the
                things we love.
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
                <strong>{final[0]}</strong>
                <i />
                <strong>{final[1]}</strong>
                <i />
                <strong>{final[2]}</strong>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
