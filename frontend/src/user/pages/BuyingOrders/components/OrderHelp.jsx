import React from "react";
import { CircleHelp, LifeBuoy, ShieldCheck, Ticket } from "lucide-react";

import { Link } from "../../../../shared/portalRouter";
import { portalOf } from "../../../../api/session";

/* "Need help with this order?" card, shared by the order details and tracking pages.
   Members and ReMakers raise a ticket from here (the router sends each to their own help
   pages). If a ticket about this order is already open it is shown instead, so nobody
   starts a second one by mistake. Admins have no help desk to raise tickets to. */
const CLOSED = ["Resolved", "Closed"];

export default function OrderHelp({
  order,
  title = "Need help with this order?",
  text = "Delivery, returns or refunds, we're here to help.",
  icon = "help",
}) {
  if (portalOf(window.location.pathname) === "admin") return null;
  const Icon = icon === "shield" ? ShieldCheck : CircleHelp;
  const open = (order.related || []).find(
    (r) => r.kind === "ticket" && !CLOSED.includes(r.status),
  );

  return (
    <section className="dn-card dn-card-pad ob-help">
      <Icon size={22} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>

        {open && (
          <p className="ob-help-open">
            <Ticket size={13} /> Ticket {open.id} is {open.status.toLowerCase()}.
          </p>
        )}

        <div className="ob-help-actions">
          {open?.url ? (
            <Link to={open.url} className="dn-btn dn-btn--sm">
              <LifeBuoy size={14} /> View your ticket
            </Link>
          ) : (
            <Link
              to={`/user-help/contact?order=${encodeURIComponent(order.id)}`}
              className="dn-btn dn-btn--sm"
            >
              <LifeBuoy size={14} /> Raise a ticket
            </Link>
          )}
          <Link to="/user-help" className="dn-btn dn-btn--ghost dn-btn--sm">
            Help &amp; FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
