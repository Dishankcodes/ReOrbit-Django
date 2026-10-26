import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, CircleHelp, Gift, Package, Search, Star, Store, Tag, User, X, MessageSquarePlus, SearchX } from "lucide-react";

import { FAQS, HELP_CATEGORIES } from "../../data/supportStore";
import EmptyState from "../../components/ui/EmptyState";
import HelpNav from "./components/HelpNav";

import "../../css/shared/ui-base.css";
import "../../css/help/UserHelp.css";

const ICON = { user: User, store: Store, package: Package, tag: Tag, gift: Gift, star: Star };

export default function UserHelp() {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);

  const results = useMemo(() => {
    const t = query.trim().toLowerCase();
    return FAQS.filter((f) => (cat === "all" ? true : f.cat === cat)).filter((f) => (t ? `${f.q} ${f.a}`.toLowerCase().includes(t) : true));
  }, [cat, query]);

  const grouped = cat === "all" && !query.trim();

  return (
    <div className="dn hp">
      <HelpNav />

      <section className="hp-hero">
        <div>
          <span className="dn-eyebrow">Help center</span>
          <h1>How can we help you today?</h1>
          <label className="hp-search">
            <Search size={18} />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(null); }} placeholder="Search for orders, donations, payouts…" aria-label="Search help" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
          </label>
        </div>
      </section>

      <section className="hp-cats" aria-label="Help topics">
        {HELP_CATEGORIES.map((c) => {
          const Icon = ICON[c.icon] || CircleHelp;
          return (
            <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(cat === c.id ? "all" : c.id)} aria-pressed={cat === c.id}>
              <span><Icon size={20} /></span>
              <strong>{c.label}</strong>
              <small>{c.text}</small>
            </button>
          );
        })}
      </section>

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="No answers found" text="Try different words, or ask our team directly." actionLabel="Contact support" to="/user-help/contact" />
      ) : (
        <section className="hp-faq">
          <div className="hp-faq-head">
            <h2>{grouped ? "Frequently asked questions" : `${results.length} ${results.length === 1 ? "answer" : "answers"}`}</h2>
            {cat !== "all" && <button type="button" className="dn-link" onClick={() => setCat("all")}>Show all topics</button>}
          </div>

          {(grouped ? HELP_CATEGORIES : [{ id: "_", label: "" }]).map((g) => {
            const list = grouped ? results.filter((f) => f.cat === g.id) : results;
            if (!list.length) return null;
            return (
              <div key={g.id} className="hp-group">
                {grouped && <h3>{g.label}</h3>}
                <div className="dn-card hp-list">
                  {list.map((f) => {
                    const id = `${f.cat}-${f.q}`;
                    const on = open === id;
                    return (
                      <div key={id} className={`hp-item ${on ? "on" : ""}`}>
                        <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : id)}>
                          <span>{f.q}</span><ChevronDown size={18} />
                        </button>
                        {on && <p>{f.a}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="hp-cta">
        <div><MessageSquarePlus size={26} /><h3>Still need help?</h3><p>Our support team usually replies within 24 hours.</p></div>
        <div className="hp-cta-actions">
          <Link to="/user-help/contact" className="dn-btn">Contact support</Link>
          <Link to="/user-help/tickets" className="dn-btn dn-btn--ghost">My tickets</Link>
        </div>
      </section>
    </div>
  );
}
