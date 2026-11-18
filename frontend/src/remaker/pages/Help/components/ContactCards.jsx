import React from "react";
import { Link } from "react-router-dom";

import { SUPPORT } from "../../../data/helpStore";
import MessageButton from "../../../../user/components/ui/MessageButton";
import { getRules } from "../../../../shared/platformRules";

const SUPPORT_CHAT = {
  key: "reorbit:support",
  kind: "reorbit",
  name: "ReOrbit Support",
  subtitle: "Help for ReMakers",
  image: "",
  context: { label: "ReOrbit Support", to: "/remaker-help", image: "" },
};

export default function ContactCards() {
  const email = getRules().supportEmail || SUPPORT.email;
  return (
    <div className="hlp-contact">
      <article>
        <small>Chat with us</small>
        <h4>Message ReOrbit Support</h4>
        <p>Quick questions are best asked in chat. {SUPPORT.replyTime}.</p>
        <MessageButton target={SUPPORT_CHAT} label="Open chat" className="rk-btn ghost small" iconSize={0} />
      </article>

      <article>
        <small>Email</small>
        <h4>{email}</h4>
        <p>Best for longer questions or when you want to attach files.</p>
        <a href={`mailto:${email}`} className="rk-btn ghost small">
          Send an email
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
