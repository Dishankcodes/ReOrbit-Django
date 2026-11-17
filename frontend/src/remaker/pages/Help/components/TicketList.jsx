import React from "react";
import { Link } from "react-router-dom";

import { STATUS_TONE, timeLabel } from "../../../data/helpStore";

export default function TicketList({ tickets }) {
  return (
    <div className="hlp-tickets">
      {tickets.map((ticket) => {
        /* The list sends a short `lastMessage`; a ticket opened in full also has its messages. */
        const loaded = (ticket.messages || []).filter((m) => m.from !== "event");
        const last = loaded[loaded.length - 1] || ticket.lastMessage || null;
        const mine = last && (last.from === "me" || last.from === "remaker");

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
              {last && (
                <p>
                  <b>{mine ? "You: " : "Support: "}</b>
                  {last.text || "Sent a photo"}
                </p>
              )}
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
