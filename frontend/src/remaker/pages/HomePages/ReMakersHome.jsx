import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SoldOutTag from "../../../shared/components/SoldOutTag";
import BannerSlot from "../../../shared/components/BannerSlot";
import Testimonials from "../../../shared/components/Testimonials";
import { isSignedIn } from "../../../api/session";
import { usePublic, inr, initialsImage } from "../../../api/publicData";
import "../../css/ReMakers.css";

/* The three hero photos. Products the team boosts in Admin > Content replace these by position. */
const HERO_PHOTOS = [
  {
    src: "https://images.pexels.com/photos/16390583/pexels-photo-16390583.jpeg?auto=compress&cs=tinysrgb&w=1000",
    alt: "Handcrafted furniture in a bright studio",
  },
  {
    src: "https://images.pexels.com/photos/15602670/pexels-photo-15602670.jpeg?auto=compress&cs=tinysrgb&w=1000",
    alt: "Colorful handmade artwork",
  },
  {
    src: "https://images.pexels.com/photos/8762879/pexels-photo-8762879.jpeg?auto=compress&cs=tinysrgb&w=1000",
    alt: "Crafted interior objects",
  },
];

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
      "https://images.pexels.com/photos/1643280/pexels-photo-1643280.jpeg?auto=compress&cs=tinysrgb&w=1000",
    material: "Rescued wood",
  },
  {
    title: "Handmade Ceramic Lamp",
    category: "Home & Living",
    price: "₹1,650",
    location: "Ahmedabad",
    image:
      "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000",
    material: "Reclaimed materials",
  },
  {
    title: "Reclaimed Wood Console",
    category: "Furniture",
    price: "₹4,200",
    location: "Bengaluru",
    image:
      "https://images.pexels.com/photos/34658646/pexels-photo-34658646.jpeg?auto=compress&cs=tinysrgb&w=1000",
    material: "Rescued timber",
  },
  {
    title: "Upcycled Side Table",
    category: "Furniture",
    price: "₹2,200",
    location: "Mumbai",
    image:
      "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
    material: "Recovered wood",
  },
  {
    title: "Reclaimed Wall Art",
    category: "Decor",
    price: "₹1,200",
    location: "Delhi",
    image:
      "https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000",
    material: "Repurposed materials",
  },
  {
    title: "Restored Lounge Chair",
    category: "Furniture",
    price: "₹3,600",
    location: "Jaipur",
    image:
      "https://images.pexels.com/photos/2168227/pexels-photo-2168227.jpeg?auto=compress&cs=tinysrgb&w=1000",
    material: "Rescued frame",
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


export default function ReMakers() {
  const { data } = usePublic("/home/");
  const viewer = isSignedIn("remaker") ? "ReMakers" : "ReMaker visitors";
  const picks = (data?.remaker_hero || []).filter((p) => p.cover);
  const photos = HERO_PHOTOS.map((d, i) =>
    picks[i]
      ? { src: picks[i].cover, alt: picks[i].title, id: picks[i].id, soldOut: picks[i].sold_out }
      : d,
  );
  /* Real products, ReMakers and numbers from the backend; the sample content stays only until there is data. */
  const liveProducts = (data?.featured || []).map((f) => ({
    id: f.id,
    title: f.title,
    category: f.category,
    price: inr(f.price),
    location: f.city || "Gujarat",
    image: f.cover,
    material: f.seller,
    soldOut: f.sold_out,
  }));
  const shownProducts = liveProducts.length ? liveProducts : featuredProducts;
  const liveMakers = (data?.remakers || []).map((r) => ({
    name: r.name,
    specialty: r.specialty || "ReMaker",
    location: r.city || "Gujarat",
    image: r.image || initialsImage(r.name),
    quote: r.bio || `${r.creations} creation${r.creations === 1 ? "" : "s"} on ReOrbit.`,
  }));
  const st = data?.stats;
  const n = (v) => Number(v || 0).toLocaleString("en-IN");
  const statRows = st
    ? [
        [n(st.remakers), "ReMakers on ReOrbit"],
        [n(st.items_rescued), "Items given another purpose"],
        [n(st.live_products), "Products available right now"],
        [n(st.members), "Members shopping on ReOrbit"],
      ]
    : [
        ["1,200+", "ReMakers discovering new material"],
        ["8.4k", "Items given another purpose"],
        ["32k kg", "Material kept in circulation"],
        ["4.9/5", "Average ReMaker community rating"],
      ];
  return (
    <div className="remaker-page rm-page">
      <Navbar />

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="rm-hero">
          <div className="rm-container">
            <div className="rm-hero-grid">
              <div className="rm-hero-copy">
                <span className="rm-badge">
                  <span className="material-symbols-outlined">handyman</span>
                  Built for ReMakers
                </span>

                <h2>
                  Make more
                  <br />
                  from what&apos;s
                  <br />
                  <em className="red">already here.</em>
                </h2>

                <p>
                  Source rescued materials, transform overlooked objects into
                  meaningful creations, and build your making business with
                  ReOrbit.
                </p>

                <div className="rm-hero-buttons">
                  <a className="rm-btn rm-btn-primary" href="/remakers-auth">
                    Become a ReMaker
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>

                  <a
                    className="rm-btn rm-btn-secondary"
                    href="/remakers-before-marketplace"
                  >
                    Discover Marketplace
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

              {/* HERO GALLERY */}

              <div className="rm-gallery" aria-label="ReMaker creations">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className={`rm-photo ${i === 1 ? "rm-photo-raised" : ""}`}
                  >
                    <img src={p.src} alt={p.alt} />
                    <SoldOutTag show={p.soldOut} size="sm" />
                    {p.id && !p.soldOut && (
                      <a className="rm-photo-buy" href={`/buy/${p.id}?as=remaker`}>
                        Buy now
                      </a>
                    )}
                  </div>
                ))}

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

        {/* BANNERS from Admin > Content */}
        <div className="rm-container rm-banners">
          <BannerSlot placement="Home hero" viewer={viewer} />
          <BannerSlot placement="Home strip" viewer={viewer} />
        </div>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="rm-stats">
          <div className="rm-container">
            <div className="rm-stats-grid">
              {statRows.map(([value, label]) => (
                <div className="rm-stat" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            MATERIALS
        ===================================================== */}

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

              <a
                className="rm-btn rm-btn-secondary"
                href="/remakers-before-marketplace"
              >
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

                  <a href="/remakers-before-marketplace">
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

              <a
                className="rm-btn rm-btn-secondary"
                href="/remakers-before-marketplace"
              >
                Explore marketplace
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>

          {/* AUTOMATIC CAROUSEL */}

          <div className="rm-products-slider">
            <div className="rm-products-track">
              {/* FIRST SET */}

              {shownProducts.map((product, index) => (
                <article
                  className="rm-product-card"
                  key={`${product.id || product.title}-${index}`}
                >
                  <div className="rm-product-image">
                    <img src={product.image} alt={product.title} />

                    <span className="rm-product-category">
                      {product.category}
                    </span>

                    <span className="rm-product-price">{product.price}</span>

                    {product.soldOut && (
                      <span className="rm-soldout">Sold out</span>
                    )}

                    {product.id && (
                      <a
                        className="rm-product-link"
                        href={`/buy/${encodeURIComponent(product.id)}?as=remaker`}
                        aria-label={`View ${product.title}`}
                        tabIndex={product.id ? 0 : -1}
                      />
                    )}
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

              {/* DUPLICATE SET FOR INFINITE LOOP */}

              {shownProducts.map((product, index) => (
                <article
                  className="rm-product-card"
                  key={`duplicate-${product.id || product.title}-${index}`}
                  aria-hidden="true"
                >
                  <div className="rm-product-image">
                    <img src={product.image} alt="" />

                    <span className="rm-product-category">
                      {product.category}
                    </span>

                    <span className="rm-product-price">{product.price}</span>

                    {product.soldOut && (
                      <span className="rm-soldout">Sold out</span>
                    )}

                    {product.id && (
                      <a
                        className="rm-product-link"
                        href={`/buy/${encodeURIComponent(product.id)}?as=remaker`}
                        aria-label={`View ${product.title}`}
                        tabIndex={-1}
                      />
                    )}
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

        {/* =====================================================
            FEATURED REMAKERS
        ===================================================== */}

        {liveMakers.length > 0 && (
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

              <a className="rm-btn rm-btn-secondary" href="/discover-remakers">
                View all ReMakers
              </a>
            </div>

            <div className="rm-maker-grid">
              {liveMakers.map((maker) => (
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
        )}

        {/* =====================================================
            JOURNEY
        ===================================================== */}

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

        {/* TESTIMONIALS: ratings the team chose (Admin › Testimonials) */}
        <Testimonials side="remaker" eyebrow="From the community" title="Good making is better together." />
      </main>

      <Footer />
    </div>
  );
}
