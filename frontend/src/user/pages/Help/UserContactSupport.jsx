import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Mail, MessageSquare, Send } from "lucide-react";

import { TICKET_CATEGORIES, createTicket } from "../../data/supportStore";
import { useOrders } from "../../data/ordersStore";
import HelpNav from "./components/HelpNav";

import "../../css/shared/ui-base.css";
import "../../css/help/UserHelp.css";

export default function UserContactSupport() {
  const orders = useOrders();
  const [f, setF] = useState({ category: "", orderId: "", subject: "", message: "" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const err = {
    category: !f.category,
    subject: f.subject.trim().length < 5,
    message: f.message.trim().length < 20,
  };
  const aboutOrder = ["Order or delivery", "Payment or refund"].includes(f.category);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(err).some(Boolean)) return;
    setBusy(true);
    window.setTimeout(() => {
      setDone(createTicket({ subject: f.subject, category: f.category, message: f.message, orderId: aboutOrder ? f.orderId : "" }));
      setBusy(false);
    }, 700);
  };

  if (done) {
    return (
      <div className="dn hp">
        <HelpNav />
        <section className="dn-card hp-done">
          <span className="hp-done-ico"><CheckCircle2 size={44} /></span>
          <span className="dn-eyebrow">Request received</span>
          <h1>We're on it.</h1>
          <p>Your ticket number is</p>
          <strong className="hp-ticket">{done}</strong>
          <p className="dn-muted">We'll reply within 24 hours and let you know by email.</p>
          <div className="hp-done-actions">
            <Link to={`/user-help/tickets/${done}`} className="dn-btn">View ticket</Link>
            <Link to="/user-help" className="dn-btn dn-btn--ghost">Back to help center</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dn hp">
      <HelpNav />
      <header className="hp-head">
        <span className="dn-eyebrow">Contact support</span>
        <h1>Tell us what's wrong</h1>
        <p className="dn-muted">The more detail you share, the faster we can fix it.</p>
      </header>

      <div className="hp-contact">
        <form className="dn-card hp-form" onSubmit={submit} noValidate>
          <label className="dn-field">
            <span className="dn-label">What is this about? <em>*</em></span>
            <select className={`dn-select ${touched && err.category ? "is-error" : ""}`} value={f.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Choose a topic</option>
              {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {touched && err.category && <span className="dn-error">Choose a topic.</span>}
          </label>

          {aboutOrder && (
            <label className="dn-field">
              <span className="dn-label">Which order? <span className="dn-hint">(optional)</span></span>
              <select className="dn-select" value={f.orderId} onChange={(e) => set("orderId", e.target.value)}>
                <option value="">Not about a specific order</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.item.title}</option>)}
              </select>
            </label>
          )}

          <label className="dn-field">
            <span className="dn-label">Subject <em>*</em></span>
            <input className={`dn-input ${touched && err.subject ? "is-error" : ""}`} value={f.subject} maxLength={90} onChange={(e) => set("subject", e.target.value)} placeholder="A short summary" />
            {touched && err.subject && <span className="dn-error">Add a short subject (at least 5 characters).</span>}
          </label>

          <label className="dn-field">
            <span className="dn-label">Message <em>*</em></span>
            <textarea className={`dn-textarea ${touched && err.message ? "is-error" : ""}`} value={f.message} maxLength={800} onChange={(e) => set("message", e.target.value)} placeholder="What happened? When? What did you expect?" />
            <span className="dn-hint" style={{ textAlign: "right" }}>{f.message.length}/800</span>
            {touched && err.message && <span className="dn-error">Please describe the issue in at least 20 characters.</span>}
          </label>

          <div className="hp-form-foot">
            <Link to="/user-help" className="dn-link">Check the FAQ first</Link>
            <button type="submit" className="dn-btn" disabled={busy}><Send size={15} /> {busy ? "Sending…" : "Send request"}</button>
          </div>
        </form>

        <aside className="hp-side">
          <article className="dn-card dn-card-pad"><Clock size={20} /><h3>Reply time</h3><p>Usually within 24 hours, every day of the week.</p></article>
          <article className="dn-card dn-card-pad"><Mail size={20} /><h3>Email us</h3><p>support@reorbit.example</p></article>
          <article className="dn-card dn-card-pad"><MessageSquare size={20} /><h3>Track your request</h3><p>Every request becomes a ticket you can follow under <Link to="/user-help/tickets" className="dn-link">My tickets</Link>.</p></article>
        </aside>
      </div>
    </div>
  );
}
