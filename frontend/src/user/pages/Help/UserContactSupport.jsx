import { getRules } from "../../../shared/platformRules";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Mail, MessageSquare, Send } from "lucide-react";

import { TICKET_CATEGORIES, createTicket } from "../../data/supportStore";
import { useOrders } from "../../data/ordersStore";
import { useListings, useSales } from "../../data/listingsStore";
import TextSuggestions from "../../../shared/components/TextSuggestions";
import { LISTING_TOPIC, TOPIC_IDEAS, TOPIC_REFS } from "../../../shared/supportTopics";
import HelpNav from "./components/HelpNav";

import "../../css/shared/ui-base.css";
import "../../css/help/UserHelp.css";

const REF_GROUPS = {
  bought: "Orders you bought",
  sold: "Orders you sold",
  listings: "Your listings",
};

/* "Which order or listing?" Only the kinds that fit the topic: orders you bought, orders you sold,
   your own listings. Loads them only when this picker is on screen. */
function ReferencePicker({ kinds, value, onPick }) {
  const bought = useOrders();
  const sold = useSales();
  const listings = useListings();
  const rows = {
    bought: bought.map((o) => ({ id: o.id, title: o.item?.title || "Order" })),
    sold: sold.map((o) => ({ id: o.id, title: o.title })),
    listings: listings
      .filter((l) => l.status !== "Draft" || value === l.id)
      .map((l) => ({ id: l.id, title: l.title })),
  };
  const all = kinds.flatMap((k) => rows[k]);
  const missing = value && !all.some((r) => r.id === value);
  const isListing = kinds.length === 1 && kinds[0] === "listings";
  return (
    <label className="dn-field">
      <span className="dn-label">
        {isListing ? "Which listing?" : kinds.includes("listings") ? "Which order or listing?" : "Which order?"}{" "}
        <span className="dn-hint">(optional)</span>
      </span>
      <select
        className="dn-select"
        value={value}
        onChange={(e) => onPick(e.target.value, all.find((r) => r.id === e.target.value))}
      >
        <option value="">{isListing ? "Not about one listing" : "Not about a specific one"}</option>
        {missing && <option value={value}>{value}</option>}
        {kinds.map((k) =>
          rows[k].length ? (
            <optgroup key={k} label={REF_GROUPS[k]}>
              {rows[k].map((r) => (
                <option key={`${k}-${r.id}`} value={r.id}>
                  {r.id} · {r.title}
                </option>
              ))}
            </optgroup>
          ) : null,
        )}
      </select>
    </label>
  );
}

export default function UserContactSupport() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromOrder = params.get("order") || "";
  /* opened from a listing ("Contact support" on a turned-off or flagged listing) */
  const fromListing = params.get("listing") || "";
  /* a link can pre-fill the form (e.g. "Contact support" on the suspended banner) */
  const askedCategory = TICKET_CATEGORIES.includes(params.get("category")) ? params.get("category") : "";
  const [f, setF] = useState({
    category: askedCategory || (fromListing ? LISTING_TOPIC : fromOrder ? "Order or delivery" : ""),
    orderId: fromListing || fromOrder,
    subject: (params.get("subject") || "").slice(0, 90),
    message: (params.get("message") || "").slice(0, 800),
  });
  /* the subject was typed (or came with the link): picking an order no longer rewrites it */
  const [ownSubject, setOwnSubject] = useState(Boolean(params.get("subject")));
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const err = {
    category: !f.category,
    subject: f.subject.trim().length < 5,
    message: f.message.trim().length < 20,
  };
  const refKinds = TOPIC_REFS[f.category] || null;
  const ideas = TOPIC_IDEAS[f.category] || [];
  const pickRef = (id, row) => {
    setF((x) => ({
      ...x,
      orderId: id,
      subject: !ownSubject && row ? `${x.category}: ${row.title}`.slice(0, 90) : x.subject,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(err).some(Boolean)) return;
    setBusy(true);
    setError("");
    try {
      setDone(await createTicket({
          subject: f.subject,
          category: f.category,
          message: f.message,
          orderId: refKinds ? f.orderId : "",
      }));
    } catch (problem) {
      // Already asked about this order: carry on in that ticket instead of starting a second one.
      if (problem.code === "ticket_exists" && problem.errors?.ticket_id) {
        navigate(`/user-help/tickets/${problem.errors.ticket_id}`, { replace: true });
        return;
      }
      setError(problem.message || "Your request could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="dn hp">
        <HelpNav />
        <section className="dn-card uhp-done">
          <span className="uhp-done-ico">
            <CheckCircle2 size={44} />
          </span>
          <span className="dn-eyebrow">Request received</span>
          <h1>We're on it.</h1>
          <p>Your ticket number is</p>
          <strong className="uhp-ticket">{done}</strong>
          <p className="dn-muted">
            We'll reply within 24 hours and let you know by email.
          </p>
          <div className="uhp-done-actions">
            <Link to={`/user-help/tickets/${done}`} className="dn-btn">
              View ticket
            </Link>
            <Link to="/user-help" className="dn-btn dn-btn--ghost">
              Back to help center
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dn hp">
      <HelpNav />
      <header className="uhp-head">
        <span className="dn-eyebrow">Contact support</span>
        <h1>Tell us what's wrong</h1>
        <p className="dn-muted">
          The more detail you share, the faster we can fix it.
        </p>
      </header>

      <div className="uhp-contact">
        <form className="dn-card uhp-form" onSubmit={submit} noValidate>
          <label className="dn-field">
            <span className="dn-label">
              What is this about? <em>*</em>
            </span>
            <select
              className={`dn-select ${touched && err.category ? "is-error" : ""}`}
              value={f.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">Choose a topic</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            {touched && err.category && (
              <span className="dn-error">Choose a topic.</span>
            )}
          </label>

          {refKinds && (
            <ReferencePicker kinds={refKinds} value={f.orderId} onPick={pickRef} />
          )}

          <label className="dn-field">
            <span className="dn-label">
              Subject <em>*</em>
            </span>
            <input
              className={`dn-input ${touched && err.subject ? "is-error" : ""}`}
              value={f.subject}
              maxLength={90}
              onChange={(e) => {
                setOwnSubject(true);
                set("subject", e.target.value);
              }}
              placeholder="A short summary"
            />
            {touched && err.subject && (
              <span className="dn-error">
                Add a short subject (at least 5 characters).
              </span>
            )}
          </label>

          <label className="dn-field">
            <span className="dn-label">
              Message <em>*</em>
            </span>
            <textarea
              className={`dn-textarea ${touched && err.message ? "is-error" : ""}`}
              value={f.message}
              maxLength={800}
              onChange={(e) => set("message", e.target.value)}
              placeholder="What happened? When? What did you expect?"
            />
            <span className="dn-hint" style={{ textAlign: "right" }}>
              {f.message.length}/800
            </span>
            <TextSuggestions
              items={ideas}
              value={f.message}
              max={800}
              label="Tap to add:"
              onChange={(v) => set("message", v)}
            />
            {touched && err.message && (
              <span className="dn-error">
                Please describe the issue in at least 20 characters.
              </span>
            )}
          </label>

          <div className="uhp-form-foot">
            <Link to="/user-help" className="dn-link">
              Check the FAQ first
            </Link>
            <button type="submit" className="dn-btn" disabled={busy}>
              <Send size={15} /> {busy ? "Sending…" : "Send request"}
            </button>
          </div>
          {error && <p className="dn-error" role="alert">{error}</p>}
        </form>

        <aside className="uhp-side">
          <article className="dn-card dn-card-pad">
            <Clock size={20} />
            <h3>Reply time</h3>
            <p>Usually within 24 hours, every day of the week.</p>
          </article>
          <article className="dn-card dn-card-pad">
            <Mail size={20} />
            <h3>Email us</h3>
            <p>{getRules().supportEmail || "support@reorbit.in"}</p>
          </article>
          <article className="dn-card dn-card-pad">
            <MessageSquare size={20} />
            <h3>Track your request</h3>
            <p>
              Every request becomes a ticket you can follow under{" "}
              <Link to="/user-help/tickets" className="dn-link">
                My tickets
              </Link>
              .
            </p>
          </article>
        </aside>
      </div>
    </div>
  );
}
