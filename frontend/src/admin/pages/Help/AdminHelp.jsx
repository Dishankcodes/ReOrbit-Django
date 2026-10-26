import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, X, ChevronDown, ArrowRight, Mail, Phone, Clock3, ShieldCheck, Rocket, Truck, Gift, ReceiptText,
  Users, Tags, Wallet, ShieldAlert, SearchX, CircleCheck, LifeBuoy,
} from "lucide-react";
import { useAccess } from "../../data/teamStore";
import EmptyState from "../../components/ui/EmptyState";
import "../../css/AdminUI.css";
import "../../css/help/AdminHelp.css";

/* Each guide points at the page where the job is done. `key` is the
   permission module, so people only see guides for what they can open. */
const GUIDES = [
  { key: "donations", icon: Gift, title: "Review a donation", text: "Accept or reject it, then schedule a free pickup.", path: "/admin-donations" },
  { key: "pickups", icon: Truck, title: "Schedule and track pickups", text: "Choose a date, a slot and a pickup team. Manage the teams themselves here too.", path: "/admin-pickups" },
  { key: "orders", icon: ReceiptText, title: "Handle an order", text: "Confirm payment, ship, deliver, cancel, return or refund.", path: "/admin-orders" },
  { key: "complaints", icon: ShieldAlert, title: "Decide on a complaint", text: "Warn, suspend, remove a listing or review, or dismiss.", path: "/admin-complaints" },
  { key: "content", icon: Tags, title: "Edit categories, banners, FAQs and policies", text: "Changes go live when you publish them.", path: "/admin-content" },
  { key: "earnings", icon: Wallet, title: "See what ReOrbit earns", text: "Platform fee, own sales, refunds and cash flow.", path: "/admin-earnings" },
  { key: "team", icon: Users, title: "Add a sub-admin", text: "Give a teammate view or edit access to only what they need.", path: "/admin-team" },
  { key: "dashboard", icon: Rocket, title: "How the whole system fits together", text: "A short tour from donation to earning.", path: "/admin-how-it-works" },
];

const TOPICS = ["All", "Daily work", "Money", "People and access", "Content", "Good to know"];

const ANSWERS = [
  { topic: "Daily work", q: "Where do I start each day?", a: "Open the Dashboard. It lists what needs you first: donations waiting for a decision, pickups running late, stock that has not sold, orders to ship and complaints past their response time. The bell in the header shows the same list." },
  { topic: "Daily work", q: "A donor wants their item collected. What do I do?", a: "Open the donation, choose Accept, then pick the date, time slot and pickup team. The donor is told straight away. Once the team collects it, mark it picked up, then received at the warehouse." },
  { topic: "Daily work", q: "How do I add a new pickup team or a person to a team?", a: "Go to Pickups, then Manage teams. Use Add team for a new crew, or Add member on a team card for one more person. Each team needs an active lead before it appears in the scheduling list." },
  { topic: "Daily work", q: "A pickup team is unavailable. Can I move its pickups?", a: "Yes. Pause the team from its card menu. If it has scheduled pickups you can move them to another team in the same step." },
  { topic: "Daily work", q: "What happens to stock that does not sell?", a: "The warehouse flags it after 7, 14 and 30 days. You can cut the price, send it for refurbishment or donate it on. The days are set in Settings." },
  { topic: "Money", q: "How does ReOrbit earn money?", a: "A small platform fee is added to every order placed by a member or ReMaker, and ReOrbit also earns from its own refurbished products. Refunds and the stock the platform buys are taken off. Earnings shows all of it." },
  { topic: "Money", q: "Where do I change the platform fee?", a: "In Settings, under Commerce. The new rate applies to new orders. Orders already placed keep the fee they were charged." },
  { topic: "Money", q: "How do refunds work?", a: "Open the order and choose Refund. The order moves to Refunded and the amount is taken off Earnings. A cancelled or returned order can also be refunded." },
  { topic: "Money", q: "How do Orbit points and vouchers work?", a: "Members earn Orbit points for donating, buying and reviewing. You set the amounts in Rewards. Vouchers and coupons are created there too, and every redemption is listed." },
  { topic: "People and access", q: "What is the difference between View and Edit?", a: "View lets a person open a page and read it. Edit also lets them change things. No access hides the page completely. The super admin always has full access." },
  { topic: "People and access", q: "How can I check what a sub-admin sees?", a: "In Team & Roles, open the menu on their row and choose View as this person. You use the whole panel exactly as they would. Choose Exit preview to come back." },
  { topic: "People and access", q: "Someone reported a user or a listing. What can I do?", a: "Open Complaints. Start a review, then warn, suspend or block the account, remove the listing or review, or dismiss it if no rule was broken. Every decision needs a reason and is kept in the history." },
  { topic: "Content", q: "When does a banner or policy go live?", a: "Banners start as drafts and go live when you publish them, or on their start date. A policy edit stays a draft until you publish it, and every earlier version is kept so you can restore it." },
  { topic: "Content", q: "Why can I not delete a category?", a: "A category with listings, donations or stock is protected so nothing is left without one. Hide it instead. Members can no longer choose it, and everything already in it stays as it is." },
  { topic: "Good to know", q: "Why did my changes disappear after I refreshed?", a: "This version keeps its data in the browser only, so a refresh resets it to the starting data. Once the backend is connected, everything is saved permanently." },
  { topic: "Good to know", q: "Why can I not see or change a page?", a: "Your role may not include it. Ask the super admin to change your access in Team & Roles." },
];

const STATUS = [
  { label: "Admin panel", ok: true },
  { label: "Payments", ok: true },
  { label: "Pickup scheduling", ok: true },
  { label: "Email and notifications", ok: true },
];

export default function AdminHelp() {
  const access = useAccess();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [open, setOpen] = useState(0);

  const guides = GUIDES.filter((g) => access.canSee(g.key));
  const list = useMemo(() => {
    const t = query.trim().toLowerCase();
    return ANSWERS.filter((x) => (topic === "All" || x.topic === topic) && (!t || `${x.q} ${x.a}`.toLowerCase().includes(t)));
  }, [query, topic]);

  return (
    <div className="au-page hp-page">
      <section className="hp-hero">
        <div>
          <span className="hp-eyebrow"><LifeBuoy size={14} /> HELP & SUPPORT</span>
          <h2>How can we help?</h2>
          <p>Quick guides for the daily jobs, answers to common questions, and who to contact when something is stuck.</p>
        </div>
        <label className="hp-search">
          <Search size={17} />
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(0); }} placeholder="Search for a task, e.g. refund, pickup team, banner" aria-label="Search help" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
      </section>

      {guides.length > 0 && !query && (
        <section aria-label="Guides">
          <h3 className="hp-h">Jump to a job</h3>
          <div className="hp-guides">
            {guides.map((g) => {
              const Icon = g.icon;
              return (
                <Link key={g.path} to={g.path} className="hp-guide">
                  <span className="hp-guide-icon"><Icon size={19} /></span>
                  <span><strong>{g.title}</strong><small>{g.text}</small></span>
                  <ArrowRight size={15} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="hp-cols">
        <section className="au-panel hp-faq" aria-label="Questions and answers">
          <header className="hp-faq-head">
            <h3>Common questions</h3>
            <div className="hp-pills" role="group" aria-label="Filter by topic">
              {TOPICS.map((t) => <button key={t} type="button" className={topic === t ? "on" : ""} aria-pressed={topic === t} onClick={() => { setTopic(t); setOpen(0); }}>{t}</button>)}
            </div>
          </header>
          {list.length === 0 ? (
            <EmptyState icon={SearchX} title="No answer matches" text="Try a shorter word, or contact the support team on the right." action={<button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { setQuery(""); setTopic("All"); }}>Clear search</button>} />
          ) : (
            <ul className="hp-list">
              {list.map((x, i) => (
                <li key={x.q} className={open === i ? "open" : ""}>
                  <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                    <span>{x.q}</span><ChevronDown size={17} />
                  </button>
                  {open === i && <div className="hp-answer"><p>{x.a}</p><em>{x.topic}</em></div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="hp-side">
          <section className="au-panel hp-card">
            <h3>Contact support</h3>
            <p>For something this guide does not cover, or a problem with the panel itself.</p>
            <ul className="hp-contact">
              <li><Mail size={16} /><div><strong>admin-support@reorbit.in</strong><small>We reply within one working day</small></div></li>
              <li><Phone size={16} /><div><strong>+91 79 4000 1200</strong><small>For urgent issues only</small></div></li>
              <li><Clock3 size={16} /><div><strong>Mon to Sat, 9 AM to 7 PM</strong><small>India Standard Time</small></div></li>
            </ul>
            <a className="ad-btn ad-btn-primary hp-mail" href="mailto:admin-support@reorbit.in?subject=ReOrbit%20admin%20panel%20help">Email support</a>
          </section>

          <section className="au-panel hp-card">
            <h3>System status</h3>
            <ul className="hp-status">
              {STATUS.map((s) => <li key={s.label}><CircleCheck size={15} /> <span>{s.label}</span><em>Working</em></li>)}
            </ul>
          </section>

          <section className="au-panel hp-card">
            <h3>Your access</h3>
            <p><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> You are signed in as <strong>{access.isSuper ? "Super admin" : access.me?.roleLabel}</strong>. {access.isSuper ? "You can see and change everything, and you manage the team." : "Pages outside your role are hidden. Ask the super admin if you need more."}</p>
            <Link to="/admin-how-it-works" className="hp-link">How ReOrbit works <ArrowRight size={14} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
