import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, CheckCircle2, LifeBuoy, Send } from "lucide-react";

import { closeTicket, replyToTicket, useTicket } from "../../data/supportStore";
import { formatDateTime } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";
import TicketBadge from "./components/TicketBadge";

import "../../css/shared/ui-base.css";
import "../../css/help/UserHelp.css";

const STEPS = ["Open", "In progress", "Resolved"];

export default function UserTicketDetails() {
  const { ticketId } = useParams();
  const ticket = useTicket(ticketId);
  const { toast, show } = useToast();
  const [text, setText] = useState("");

  if (!ticket) return <div className="dn"><EmptyState icon={LifeBuoy} title="Ticket not found" text="Check your tickets list." actionLabel="My tickets" to="/user-help/tickets" /></div>;

  const idx = STEPS.indexOf(ticket.status);
  const send = (e) => {
    e.preventDefault();
    if (text.trim().length < 2) return;
    replyToTicket(ticket.id, text);
    setText("");
    show("Reply sent.");
  };

  return (
    <div className="dn hp">
      <Crumbs items={[{ label: "Help", to: "/user-help" }, { label: "My tickets", to: "/user-help/tickets" }, { label: ticket.id }]} />

      <header className="hp-head row">
        <div>
          <div className="hp-ticket-top"><b>{ticket.id}</b><TicketBadge status={ticket.status} />{ticket.orderId && <Link to={`/user-orders/${ticket.orderId}`} className="dn-chip">{ticket.orderId}</Link>}</div>
          <h1>{ticket.subject}</h1>
          <p className="dn-muted">{ticket.category} · opened {formatDateTime(ticket.createdAt)}</p>
        </div>
        {ticket.status !== "Resolved" && (
          <button type="button" className="dn-btn dn-btn--ghost" onClick={() => { closeTicket(ticket.id); show("Ticket marked as resolved."); }}><CheckCircle2 size={16} /> Mark as resolved</button>
        )}
      </header>

      <section className="dn-card dn-card-pad">
        <ol className="hp-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>
              <span>{i < idx || ticket.status === "Resolved" ? <Check size={14} /> : i + 1}</span><b>{s}</b>
            </li>
          ))}
        </ol>
      </section>

      <section className="dn-card hp-thread">
        {ticket.messages.map((m) => (
          <article key={m.id} className={`hp-msg ${m.from}`}>
            <span className="hp-msg-av">{m.from === "user" ? "You" : "RO"}</span>
            <div>
              <header><strong>{m.from === "user" ? "You" : "ReOrbit support"}</strong><time>{formatDateTime(m.at)}</time></header>
              <p>{m.text}</p>
            </div>
          </article>
        ))}

        <form className="hp-reply" onSubmit={send}>
          <textarea className="dn-textarea" style={{ minHeight: 84 }} value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder={ticket.status === "Resolved" ? "Reply to reopen this ticket…" : "Write a reply…"} aria-label="Your reply" />
          <button type="submit" className="dn-btn" disabled={text.trim().length < 2}><Send size={15} /> {ticket.status === "Resolved" ? "Reopen & send" : "Send reply"}</button>
        </form>
      </section>
      {toast}
    </div>
  );
}
