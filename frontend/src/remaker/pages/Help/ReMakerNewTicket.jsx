import React, { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FAQS, TICKET_CATEGORIES, createTicket } from "../../data/helpStore";
import { fileToDataUrl } from "../../data/portfolioStore";
import { useOrders } from "../../data/ordersStore";
import { useSales } from "../../data/salesStore";

import FaqList from "./components/FaqList";

import "../../css/ReMakerUi.css";
import "./HelpPage.css";

const DESC_MIN = 20;
const MAX_PHOTOS = 3;

export default function ReMakerNewTicket() {
  const navigate = useNavigate();
  const purchases = useOrders();
  const sales = useSales();

  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [related, setRelated] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const fileRef = useRef(null);

  const errors = {
    category: category ? "" : "Choose what this is about.",
    subject: subject.trim().length >= 5 ? "" : "Give your ticket a short title of at least 5 characters.",
    description: description.trim().length >= DESC_MIN ? "" : `Tell us more, at least ${DESC_MIN} characters.`,
  };

  const show = (key) => (attempted ? errors[key] : "");

  /* Suggest articles that match what the ReMaker is typing */
  const suggestions = useMemo(() => {
    const words = `${subject} ${description}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
    if (words.length === 0) return [];

    return FAQS.map((item) => ({
      item,
      score: words.filter((word) => `${item.q} ${item.a}`.toLowerCase().includes(word)).length,
    }))
      .filter((entry) => entry.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.item);
  }, [subject, description]);

  const addPhotos = async (files) => {
    setPhotoError("");

    for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const url = await fileToDataUrl(file, 900, 0.7);
        setPhotos((current) => (current.length < MAX_PHOTOS ? [...current, url] : current));
      } catch (error) {
        setPhotoError(error.message);
      }
    }
  };

  const submit = (event) => {
    event.preventDefault();
    setAttempted(true);

    if (Object.values(errors).some(Boolean)) {
      requestAnimationFrame(() =>
        document.querySelector('.hlp-form [aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    const ticket = createTicket({
      subject: subject.trim(),
      category,
      priority,
      relatedOrder: related,
      description: description.trim(),
      photos,
    });

    navigate(`/remaker-help/tickets/${ticket.id}`, { state: { notice: `Ticket ${ticket.id} created. We will reply soon.` } });
  };

  return (
    <section className="rk hlp">
      <nav className="rk-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-help">Help and support</Link>
        <span aria-hidden="true">/</span>
        <strong>New ticket</strong>
      </nav>

      <header className="rk-top">
        <div>
          <h2>Create a support ticket</h2>
          <p>Tell us what happened and we will get back to you. The more detail you give, the faster we can help.</p>
        </div>
      </header>

      <div className="hlp-layout">
        <form className="rk-card hlp-form" onSubmit={submit} noValidate>
          <div className="rk-field">
            <label htmlFor="tk-category">What is this about?</label>
            <div className="rk-select">
              <select id="tk-category" value={category} onChange={(event) => setCategory(event.target.value)} aria-invalid={show("category") ? "true" : undefined}>
                <option value="">Choose a topic</option>
                {TICKET_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            {show("category") && <span className="rk-error">{show("category")}</span>}
          </div>

          <div className="rk-field">
            <label htmlFor="tk-subject">Title</label>
            <input id="tk-subject" type="text" maxLength={90} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A short summary, like “Payout not received”" aria-invalid={show("subject") ? "true" : undefined} />
            {show("subject") && <span className="rk-error">{show("subject")}</span>}
          </div>

          <div className="hlp-two">
            <div className="rk-field">
              <label htmlFor="tk-order">
                Related order <em>optional</em>
              </label>
              <div className="rk-select">
                <select id="tk-order" value={related} onChange={(event) => setRelated(event.target.value)}>
                  <option value="">Not about one order</option>
                  <optgroup label="Orders you bought">
                    {purchases.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id}, {order.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Orders you sold">
                    {sales.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id}, {order.title}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="rk-field">
              <span className="rk-label">How urgent is it?</span>
              <div className="hlp-priority" role="radiogroup" aria-label="Priority">
                {["Normal", "Urgent"].map((item) => (
                  <button type="button" role="radio" aria-checked={priority === item} className={priority === item ? "active" : ""} key={item} onClick={() => setPriority(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <small>Urgent is for money or order problems that cannot wait.</small>
            </div>
          </div>

          <div className="rk-field">
            <label htmlFor="tk-desc">What happened?</label>
            <textarea id="tk-desc" rows={7} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the problem. Include dates, amounts, order numbers and what you expected." aria-invalid={show("description") ? "true" : undefined} />
            <div className="hlp-meta">
              <span className="rk-error">{show("description")}</span>
              <small>{description.length}/1000</small>
            </div>
          </div>

          <div className="rk-field">
            <span className="rk-label">
              Photos or screenshots <em>optional, up to {MAX_PHOTOS}</em>
            </span>

            <div className="hlp-photos">
              {photos.map((src, index) => (
                <div className="hlp-photo" key={index}>
                  <img src={src} alt={`Attachment ${index + 1}`} />
                  <button type="button" onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))} aria-label={`Remove attachment ${index + 1}`}>
                    Remove
                  </button>
                </div>
              ))}

              {photos.length < MAX_PHOTOS && (
                <button type="button" className="hlp-photo-add" onClick={() => fileRef.current?.click()}>
                  <img src="/images/products/default-item.jpg" alt="" />
                  <b>Add photo</b>
                </button>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
            {photoError && <span className="rk-error">{photoError}</span>}
          </div>

          <div className="hlp-form-actions">
            <button type="submit" className="rk-btn primary">
              Send ticket
            </button>
            <Link to="/remaker-help?tab=tickets" className="rk-btn ghost">
              Cancel
            </Link>
          </div>
        </form>

        <aside className="hlp-side">
          {suggestions.length > 0 ? (
            <section className="rk-card">
              <h3>These might help right now</h3>
              <FaqList items={suggestions} />
            </section>
          ) : (
            <section className="rk-card">
              <h3>What happens next</h3>
              <ol className="hlp-steps">
                <li>
                  <strong>We get your ticket</strong>
                  <small>You see it straight away under My tickets.</small>
                </li>
                <li>
                  <strong>A person replies</strong>
                  <small>Usually within 24 hours, every day of the week.</small>
                </li>
                <li>
                  <strong>We sort it out together</strong>
                  <small>Reply in the ticket. Mark it resolved when you are happy.</small>
                </li>
              </ol>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
