import React from "react";
import { Link } from "react-router-dom";

import { STATUS_TONE, timeLabel } from "../../../data/helpStore";

export default function TicketList({ tickets }) {
  return (
    <div className="hlp-tickets">
      {tickets.map((ticket) => {
        const last = ticket.messages[ticket.messages.length - 1];

        return (
          <Link
            to={`/remaker-help/tickets/${ticket.id}`}
            className="hlp-ticket"
            key={ticket.id}
          >
            <div className="hlp-ticket-main">
              <div className="hlp-ticket-top">
                <small>
                  {ticket.id} · {ticket.category}
                </small>
                {ticket.priority === "Urgent" && <em>Urgent</em>}
              </div>
              <strong>{ticket.subject}</strong>
              <p>
                <b>{last.from === "me" ? "You: " : "Support: "}</b>
                {last.text}
              </p>
            </div>

            <div className="hlp-ticket-side">
              <span className={`rk-badge ${STATUS_TONE[ticket.status]}`}>
                {ticket.status}
              </span>
              <small>{timeLabel(ticket.updatedAt)}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
