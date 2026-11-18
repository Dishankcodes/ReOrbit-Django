import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Gift,
  Heart,
  Leaf,
  Package,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

import { apiRequest } from "../../api/api";
import { formatDate, relativeDay } from "../utils/format";

import "../css/shared/ui-base.css";
import "../css/UserDashboardV2.css";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const TONE = {
  Delivered: "good",
  Completed: "good",
  Shipped: "info",
  Packed: "info",
  Confirmed: "info",
  Scheduled: "info",
  Picked_Up: "info",
  Received: "info",
  Pending: "wait",
  Pending_Payment: "wait",
  Cancelled: "bad",
  Rejected: "bad",
  Delivery_Failed: "bad",
  Failed_Pickup: "bad",
};

/* One dashboard section from the server. `when` false waits (lazy): it loads once visible. */
function useSection(name, when = true) {
  const [state, setState] = useState({ data: null, error: "" });
  useEffect(() => {
    if (!when) return undefined;
    let alive = true;
    apiRequest(`/users/me/dashboard/?section=${name}`)
      .then((r) => alive && setState({ data: r.data, error: "" }))
      .catch((e) => alive && setState({ data: null, error: e.message || "Could not load." }));
    return () => {
      alive = false;
    };
  }, [name, when]);
  return state;
}

/* Becomes true once the box is near the screen, so a section loads only when the member scrolls to it. */
function useNearScreen() {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return undefined;
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), {
      rootMargin: "200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}

function Lazy({ name, minHeight = 240, children }) {
  const [ref, near] = useNearScreen();
  const { data, error } = useSection(name, near);
  return (
    <div ref={ref} style={data ? undefined : { minHeight }}>
      {error ? (
        <p className="udb-note">{error}</p>
      ) : data ? (
        children(data)
      ) : (
        <div className="udb-card udb-skel" aria-busy="true" aria-label="Loading">
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  );
}

function Head({ eyebrow, title, to, action = "View all" }) {
  return (
    <div className="udb-head">
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {to && (
        <Link to={to} className="udb-more">
          {action} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function Chip({ status, label }) {
  return <em className={`udb-chip ${TONE[status] || ""}`}>{label || status}</em>;
}

function Thumb({ src, Icon = Package }) {
  return <span className="udb-thumb">{src ? <img src={src} alt="" loading="lazy" /> : <Icon size={18} />}</span>;
}

function Empty({ text, to, cta }) {
  return (
    <div className="udb-empty">
      <p>{text}</p>
      {to && (
        <Link to={to} className="dn-btn dn-btn--sm">
          {cta}
        </Link>
      )}
    </div>
  );
}

function Ring({ pct }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="udb-ring" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className="track" />
      <circle cx="40" cy="40" r={r} className="fill" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} />
    </svg>
  );
}

function Hero({ s }) {
  const since = s.member_since
    ? new Date(s.member_since).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "";
  return (
    <section className="udb-hero">
      <div className="udb-hero-main">
        <span className="udb-eyebrow">
          <Leaf size={13} /> Your ReOrbit
        </span>
        <h2>
          Hi {s.first_name}, <span>welcome back.</span>
        </h2>
        <p>
          {s.items_reused > 0
            ? `You've given ${s.items_reused} ${s.items_reused === 1 ? "thing" : "things"} a second life so far. Keep it going.`
            : "Buy pre-loved, sell what you don't use, or donate it. Every item you keep in orbit counts."}
        </p>
        <div className="udb-actions">
          <Link to="/user-marketplace" className="udb-act primary">
            <ShoppingBag size={16} /> Shop
          </Link>
          <Link to="/user-sell/new" className="udb-act">
            <Plus size={16} /> Sell an item
          </Link>
          <Link to="/user-donations/new" className="udb-act">
            <Gift size={16} /> Donate
          </Link>
        </div>
      </div>
      <Link to="/user-orbit-points" className="udb-level">
        <div className="udb-level-ring">
          <Ring pct={s.points.progress} />
          <strong>{s.points.balance.toLocaleString("en-IN")}</strong>
          <small>points</small>
        </div>
        <div>
          <b>{s.points.level}</b>
          <span>
            {s.points.next
              ? `${s.points.to_next.toLocaleString("en-IN")} to ${s.points.next}`
              : "Top level reached"}
          </span>
          {since && <small>Member since {since}</small>}
        </div>
      </Link>
    </section>
  );
}

function Tiles({ s }) {
  const tiles = [
    {
      to: "/user-orders",
      Icon: ShoppingBag,
      label: "Orders",
      value: s.orders.total,
      note: s.orders.active ? `${s.orders.active} on the way` : `${s.orders.this_month} this month`,
    },
    {
      to: "/user-sell",
      Icon: Store,
      label: "Live listings",
      value: s.selling.live,
      note: s.selling.to_ship ? `${s.selling.to_ship} to ship` : `${s.selling.sold} sold`,
      alert: s.selling.to_ship > 0,
    },
    {
      to: "/user-wallet",
      Icon: Wallet,
      label: "Wallet",
      value: inr(s.selling.available),
      note: s.selling.pending ? `${inr(s.selling.pending)} clearing` : "Ready to withdraw",
    },
    {
      to: "/user-donations",
      Icon: Gift,
      label: "Donations",
      value: s.donations.total,
      note: s.donations.open ? `${s.donations.open} in progress` : `${s.donations.kg} kg given`,
    },
    { to: "/user-wishlist", Icon: Heart, label: "Wishlist", value: s.wishlist, note: "Saved for later" },
  ];
  return (
    <section className="udb-tiles">
      {tiles.map(({ to, Icon, label, value, note, alert }) => (
        <Link to={to} key={label} className={`udb-tile ${alert ? "alert" : ""}`}>
          <span className="udb-tile-ic">
            <Icon size={18} />
          </span>
          <span className="udb-tile-l">{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </Link>
      ))}
    </section>
  );
}

function OrderRow({ o, to }) {
  return (
    <Link to={to} className="udb-row">
      <Thumb src={o.cover} />
      <span className="udb-row-main">
        <strong>
          {o.title}
          {o.more ? <small> +{o.more} more</small> : null}
        </strong>
        <small>
          {o.id} · {relativeDay(o.placed_at)}
        </small>
      </span>
      <Chip status={o.status} label={o.status_label} />
      <b>{inr(o.total)}</b>
    </Link>
  );
}

function Bars({ months, series }) {
  const keys = [
    ["bought", "Bought"],
    ["sold", "Sold"],
    ["donated", "Donated"],
  ];
  const max = Math.max(1, ...months.map((_, i) => keys.reduce((n, [k]) => n + series[k][i], 0)));
  return (
    <div className="udb-bars">
      <div className="udb-bars-plot">
        {months.map((m, i) => (
          <div className="udb-bar" key={m + i} title={keys.map(([k, l]) => `${l}: ${series[k][i]}`).join(" · ")}>
            <div className="udb-bar-stack">
              {keys.map(([k]) =>
                series[k][i] ? <i key={k} className={k} style={{ height: `${(series[k][i] / max) * 100}%` }} /> : null,
              )}
            </div>
            <small>{m}</small>
          </div>
        ))}
      </div>
      <div className="udb-legend">
        {keys.map(([k, l]) => (
          <span key={k}>
            <i className={k} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { data: s, error } = useSection("summary");

  if (error) {
    return (
      <div className="udb">
        <p className="udb-note">{error}</p>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="udb">
        <div className="udb-hero udb-skel-hero" aria-busy="true" />
        <div className="udb-tiles">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="udb-tile udb-skel-tile" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="udb">
      <Hero s={s} />
      <Tiles s={s} />

      <div className="udb-grid">
        <section className="udb-card">
          <Head eyebrow="Buying" title="Your recent orders" to="/user-orders" />
          <Lazy name="orders">
            {(d) =>
              d.recent.length ? (
                <>
                  {d.to_review > 0 && (
                    <Link to="/user-reviews" className="udb-nudge">
                      <Star size={15} /> {d.to_review} delivered {d.to_review === 1 ? "order is" : "orders are"} waiting
                      for your review
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {d.recent.map((o) => (
                    <OrderRow key={o.id} o={o} to={`/user-orders/${o.id}`} />
                  ))}
                </>
              ) : (
                <Empty text="No orders yet. Pre-loved finds are waiting." to="/user-marketplace" cta="Browse" />
              )
            }
          </Lazy>
        </section>

        <section className="udb-card">
          <Head eyebrow="Selling" title="Your shop" to="/user-sell" action="Manage" />
          <Lazy name="selling">
            {(d) =>
              d.listings.length || d.sales.length ? (
                <>
                  {d.sales.length > 0 && <h4 className="udb-sub">Latest sales</h4>}
                  {d.sales.map((o) => (
                    <OrderRow key={o.id} o={o} to={`/user-sell/sales/${o.id}`} />
                  ))}
                  {d.listings.length > 0 && <h4 className="udb-sub">Live now</h4>}
                  <div className="udb-mini-grid">
                    {d.listings.map((l) => (
                      <Link key={l.id} to={`/user-sell/${l.id}`} className="udb-mini">
                        <Thumb src={l.cover} />
                        <strong>{l.title}</strong>
                        <small>{inr(l.price)}</small>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Empty text="Nothing listed yet. Turn things you don't use into money." to="/user-sell/new" cta="List an item" />
              )
            }
          </Lazy>
        </section>

        <section className="udb-card">
          <Head eyebrow="Giving" title="Your donations" to="/user-donations" />
          <Lazy name="donations">
            {(d) =>
              d.recent.length ? (
                d.recent.map((x) => (
                  <Link key={x.id} to={`/user-donations/${x.id}`} className="udb-row">
                    <Thumb Icon={x.status === "Scheduled" ? Truck : Gift} />
                    <span className="udb-row-main">
                      <strong>{x.title}</strong>
                      <small>
                        {x.quantity} × {x.category}
                        {x.pickup_date ? ` · pickup ${formatDate(x.pickup_date)}` : ` · ${relativeDay(x.created_at)}`}
                      </small>
                    </span>
                    <Chip status={x.status} label={x.status_label} />
                  </Link>
                ))
              ) : (
                <Empty text="Donate things you no longer need. We pick them up." to="/user-donations/new" cta="Donate" />
              )
            }
          </Lazy>
        </section>

        <section className="udb-card">
          <Head eyebrow="Last 6 months" title="Your activity" to="/user-orbit-points" action="Points" />
          <Lazy name="activity">
            {(d) => (
              <>
                <Bars months={d.months} series={d.series} />
                {d.points.length > 0 && (
                  <ul className="udb-ledger">
                    {d.points.map((e) => (
                      <li key={e.id}>
                        <span className={e.points > 0 ? "plus" : "minus"}>
                          {e.points > 0 ? "+" : "−"}
                          {Math.abs(e.points)}
                        </span>
                        <span>
                          <strong>{e.title}</strong>
                          <small>{e.detail}</small>
                        </span>
                        <small>{relativeDay(e.at)}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Lazy>
        </section>
      </div>

      <section className="udb-card udb-picks">
        <Lazy name="picks" minHeight={300}>
          {(d) => (
            <>
              <Head
                eyebrow={d.personal ? "Based on your wishlist" : "Fresh on ReOrbit"}
                title="Picked for you"
                to="/user-marketplace"
                action="Explore"
              />
              {d.products.length ? (
                <div className="udb-products">
                  {d.products.map((p) => (
                    <Link key={p.id} to={`/user-marketplace/product/${p.id}`} className="udb-product">
                      <span className="udb-product-img">
                        <img src={p.cover} alt="" loading="lazy" />
                        {p.kind === "remaker" && (
                          <em>
                            <Sparkles size={11} /> ReMaker
                          </em>
                        )}
                      </span>
                      <strong>{p.title}</strong>
                      <small>
                        {p.category?.name}
                        {p.city ? ` · ${p.city}` : ""}
                      </small>
                      <b>{inr(p.price)}</b>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty text="New products will show up here." />
              )}
            </>
          )}
        </Lazy>
      </section>

      {s.orders.total + s.donations.total + s.selling.sold > 0 && (
        <p className="udb-foot">
          <PackageCheck size={15} /> {s.items_reused} {s.items_reused === 1 ? "item" : "items"} kept in orbit
          {s.donations.kg ? ` · ${s.donations.kg} kg donated` : ""}
          {s.orders.spent ? ` · ${inr(s.orders.spent)} spent on pre-loved` : ""}
        </p>
      )}
    </div>
  );
}
