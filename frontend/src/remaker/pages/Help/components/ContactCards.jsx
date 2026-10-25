import React from "react";
import { Link } from "react-router-dom";

import { SUPPORT } from "../../../data/helpStore";

export default function ContactCards() {
  return (
    <div className="hlp-contact">
      <article>
        <small>Chat with us</small>
        <h4>Message ReOrbit Support</h4>
        <p>Quick questions are best asked in chat. {SUPPORT.replyTime}.</p>
        <Link to="/remaker-messages/cv-7" className="rk-btn ghost small">
          Open chat
        </Link>
      </article>

      <article>
        <small>Email</small>
        <h4>{SUPPORT.email}</h4>
        <p>Best for longer questions or when you want to attach files.</p>
        <a href={`mailto:${SUPPORT.email}`} className="rk-btn ghost small">
          Send an email
        </a>
      </article>

      <article>
        <small>Call</small>
        <h4>{SUPPORT.phone}</h4>
        <p>{SUPPORT.hours}. Free from any phone in India.</p>
        <a
          href={`tel:${SUPPORT.phone.replace(/\s/g, "")}`}
          className="rk-btn ghost small"
        >
          Call support
        </a>
      </article>

      <article className="strong">
        <small>Need a record?</small>
        <h4>Create a support ticket</h4>
        <p>
          Tickets keep the whole conversation in one place, with photos and
          order details.
        </p>
        <Link to="/remaker-help/new" className="rk-btn light small">
          New ticket
        </Link>
      </article>
    </div>
  );
}
