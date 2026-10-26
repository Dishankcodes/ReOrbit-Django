import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HandHeart,
  Plus,
  History,
  Leaf,
  Scale,
  Wind,
  Star,
  ClipboardList,
  CalendarCheck,
  Warehouse,
  Award,
  ArrowRight,
  ChevronRight,
  Check,
  X as XIcon,
  Truck,
  CalendarDays,
  MapPin,
  Gift,
} from "lucide-react";

import {
  ACTIVE_STATUSES,
  DONATION_CATEGORIES,
  REWARD_RULES,
  WHAT_WE_ACCEPT,
  WHAT_WE_SKIP,
  summarize,
  useDonations,
} from "../../data/donationsStore";
import { formatDayMonth, kg, relativeDay } from "../../utils/format";
import DonationCard from "./components/DonationCard";
import SafeImage from "../../components/ui/SafeImage";
import ProgressTracker from "./components/ProgressTracker";
import { StatusBadge } from "./components/DonationBadges";
import { categoryIcon } from "./components/categoryIcons";

import "../../css/shared/ui-base.css";
import "../../css/donations/DonationCard.css";
import "../../css/donations/UserDonationsHome.css";

const STEPS = [
  { icon: ClipboardList, title: "Tell us what you're giving", text: "Add photos, condition and quantity in under two minutes." },
  { icon: CalendarCheck, title: "Pick a free pickup slot", text: "Choose a day and time. We collect from your doorstep, at no cost." },
  { icon: Warehouse, title: "We check and sort it", text: "Items are verified at our warehouse and matched with a partner NGO." },
  { icon: Award, title: "Get your certificate", text: "Receive a donation certificate and Orbit Points once it's delivered." },
];

export default function UserDonations() {
  const navigate = useNavigate();
  const donations = useDonations();
  const stats = useMemo(() => summarize(donations), [donations]);

  const active = useMemo(
    () => donations.filter((d) => ACTIVE_STATUSES.includes(d.status)),
    [donations],
  );

  /* the donation closest to its next milestone: scheduled pickups first */
  const featured = useMemo(() => {
    const rank = { Picked_Up: 0, Scheduled: 1, Received: 2, Pending: 3 };
    return [...active].sort((a, b) => rank[a.status] - rank[b.status])[0] || null;
  }, [active]);

  const recent = donations.slice(0, 3);

  return (
    <div className="dn dn-home">
      {/* ---------- hero ---------- */}
      <section className="dn-hero">
        <div className="dn-hero-copy">
          <span className="dn-eyebrow">Give items another orbit</span>
          <h1>Donate what you don't need. Change someone's day.</h1>
          <p>
            List an item, pick a time, and we'll collect it for free. Everything
            you donate is checked, cleaned and passed on to people who need it.
          </p>

          <div className="dn-hero-actions">
            <Link to="/user-donations/new" className="dn-btn">
              <Plus size={17} /> Donate an item
            </Link>
            <Link to="/user-donations/history" className="dn-btn dn-btn--ghost">
              <History size={16} /> Donation history
            </Link>
          </div>

          <ul className="dn-hero-points">
            <li><Check size={14} /> Free doorstep pickup</li>
            <li><Check size={14} /> Certificate for every donation</li>
            <li><Check size={14} /> Earn Orbit Points</li>
          </ul>
        </div>

        <div className="dn-hero-art" aria-hidden="true">
          <span className="dn-ring dn-ring--1" />
          <span className="dn-ring dn-ring--2" />
          <span className="dn-ring dn-ring--3" />
          <span className="dn-hero-core"><HandHeart size={44} /></span>
          <span className="dn-orbiter dn-orbiter--a"><Leaf size={16} /></span>
          <span className="dn-orbiter dn-orbiter--b"><Gift size={16} /></span>
          <span className="dn-orbiter dn-orbiter--c"><Star size={16} /></span>
        </div>
      </section>

      {/* ---------- impact stats ---------- */}
      <section className="dn-stats" aria-label="Your donation impact">
        <article className="dn-stat">
          <span className="dn-stat-icon"><Gift size={20} /></span>
          <div>
            <strong>{stats.items}</strong>
            <span>Items donated</span>
          </div>
        </article>
        <article className="dn-stat">
          <span className="dn-stat-icon"><Scale size={20} /></span>
          <div>
            <strong>{kg(stats.weight)}</strong>
            <span>Waste diverted</span>
          </div>
        </article>
        <article className="dn-stat">
          <span className="dn-stat-icon"><Wind size={20} /></span>
          <div>
            <strong>{stats.co2} kg</strong>
            <span>CO₂ saved</span>
          </div>
        </article>
        <article className="dn-stat">
          <span className="dn-stat-icon"><Star size={20} /></span>
          <div>
            <strong>{stats.points.toLocaleString("en-IN")}</strong>
            <span>
              Orbit Points earned
              {stats.pendingPoints > 0 && <em> · +{stats.pendingPoints} on the way</em>}
            </span>
          </div>
        </article>
      </section>

      {/* ---------- active donation ---------- */}
      <section className="dn-section">
        <div className="dn-section-head">
          <div>
            <h2>In progress</h2>
            <p>
              {active.length > 0
                ? `${active.length} active ${active.length === 1 ? "donation" : "donations"}`
                : "Nothing active right now"}
            </p>
          </div>
        </div>

        {featured ? (
          <article className="dn-card dn-featured">
            <div className="dn-featured-top">
              <SafeImage src={featured.images[0]} alt={featured.title} className="dn-featured-img" />
              <div className="dn-featured-info">
                <div className="dn-featured-row">
                  <span className="dn-dcard-id">{featured.id}</span>
                  <StatusBadge status={featured.status} />
                </div>
                <h3>{featured.title}</h3>
                <ul className="dn-featured-facts">
                  <li><Gift size={14} /> {featured.quantity} {featured.quantity === 1 ? "item" : "items"} · {featured.category}</li>
                  {featured.pickup.date && (
                    <li>
                      <CalendarDays size={14} />
                      {relativeDay(featured.pickup.date)}, {formatDayMonth(featured.pickup.date)} · {featured.pickup.slot}
                    </li>
                  )}
                  <li><MapPin size={14} /> {featured.pickup.address.line}, {featured.pickup.address.city}</li>
                  {featured.pickup.partner && (
                    <li><Truck size={14} /> {featured.pickup.partner.team} · {featured.pickup.partner.name}</li>
                  )}
                </ul>
              </div>
              <div className="dn-featured-cta">
                <Link to={`/user-donations/${featured.id}`} className="dn-btn dn-btn--sm">
                  View details <ArrowRight size={14} />
                </Link>
                {["Pending", "Scheduled"].includes(featured.status) && (
                  <Link to={`/user-donations/${featured.id}/pickup`} className="dn-btn dn-btn--ghost dn-btn--sm">
                    Manage pickup
                  </Link>
                )}
              </div>
            </div>
            <div className="dn-featured-track">
              <ProgressTracker donation={featured} />
            </div>
          </article>
        ) : (
          <div className="dn-card dn-quiet">
            <div className="dn-empty-icon"><HandHeart size={28} /></div>
            <div>
              <h3>No donations in progress</h3>
              <p>Got something collecting dust? Start a donation and we'll handle the rest.</p>
            </div>
            <Link to="/user-donations/new" className="dn-btn dn-btn--sm">Donate an item</Link>
          </div>
        )}

        {active.length > 1 && (
          <p className="dn-also">
            Also in progress:{" "}
            {active
              .filter((d) => d.id !== featured?.id)
              .map((d, index, arr) => (
                <React.Fragment key={d.id}>
                  <Link to={`/user-donations/${d.id}`}>{d.title}</Link>
                  {index < arr.length - 1 ? ", " : ""}
                </React.Fragment>
              ))}
          </p>
        )}
      </section>

      {/* ---------- start a donation ---------- */}
      <section className="dn-section">
        <div className="dn-section-head">
          <div>
            <h2>What would you like to donate?</h2>
            <p>Pick a category to start. You can add details on the next screen.</p>
          </div>
        </div>

        <div className="dn-cats">
          {DONATION_CATEGORIES.map((cat) => {
            const Icon = categoryIcon(cat.id);
            return (
              <button
                type="button"
                key={cat.id}
                className="dn-cat"
                onClick={() => navigate(`/user-donations/new?category=${encodeURIComponent(cat.id)}`)}
              >
                <span className="dn-cat-icon"><Icon size={22} /></span>
                <strong>{cat.label}</strong>
                <small>{cat.hint}</small>
                <ChevronRight size={16} className="dn-cat-go" />
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="dn-section">
        <div className="dn-section-head">
          <div>
            <h2>How donating works</h2>
            <p>Four simple steps, zero cost to you.</p>
          </div>
        </div>
        <div className="dn-steps">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="dn-step" key={step.title}>
                <span className="dn-step-num">{index + 1}</span>
                <span className="dn-step-icon"><Icon size={22} /></span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- recent ---------- */}
      <section className="dn-section">
        <div className="dn-section-head">
          <div>
            <h2>Recent donations</h2>
            <p>Your latest activity.</p>
          </div>
          <Link to="/user-donations/history" className="dn-link">
            See all <ChevronRight size={15} />
          </Link>
        </div>
        <div className="dn-list">
          {recent.map((donation) => (
            <DonationCard key={donation.id} donation={donation} />
          ))}
        </div>
      </section>

      {/* ---------- guidelines ---------- */}
      <section className="dn-guide">
        <article className="dn-card dn-card-pad">
          <div className="dn-guide-head ok"><Check size={18} /><h3>What we accept</h3></div>
          <ul>
            {WHAT_WE_ACCEPT.map((line) => (
              <li key={line}><Check size={15} /> {line}</li>
            ))}
          </ul>
        </article>
        <article className="dn-card dn-card-pad">
          <div className="dn-guide-head no"><XIcon size={18} /><h3>What we can't take</h3></div>
          <ul>
            {WHAT_WE_SKIP.map((line) => (
              <li key={line}><XIcon size={15} /> {line}</li>
            ))}
          </ul>
        </article>
        <article className="dn-card dn-card-pad dn-guide-reward">
          <Star size={26} />
          <h3>Earn {REWARD_RULES.base} Orbit Points</h3>
          <p>
            Plus {REWARD_RULES.perItem} for every item, credited when your donation is completed and
            your certificate is issued.
          </p>
          <Link to="/user-orbit-points" className="dn-link">
            View Orbit Points <ChevronRight size={15} />
          </Link>
        </article>
      </section>
    </div>
  );
}
