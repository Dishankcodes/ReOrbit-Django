import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, LifeBuoy, MessageSquarePlus } from "lucide-react";

import { useTickets } from "../../data/supportStore";
import { formatDate, relativeDay } from "../../utils/format";
import EmptyState from "../../components/ui/EmptyState";
import HelpNav from "./components/HelpNav";
import TicketBadge from "./components/TicketBadge";

import "../../css/shared/ui-base.css";
import "../../css/help/UserHelp.css";

const TABS = [["all", "All"], ["open", "Open"], ["progress", "In progress"], ["resolved", "Resolved"]];
const MATCH = { open: (t) => t.status === "Open", progress: (t) => t.status === "In progress", resolved: (t) => t.status === "Resolved" };

export default function UserTickets() {
  const tickets = useTickets();
  const [tab, setTab] = useState("all");
  const rows = useMemo(() => tickets.filter((t) => (tab === "all" ? true : MATCH[tab](t))), [tickets, tab]);

  return (
    <div className="dn hp">
      <HelpNav />
      <header className="hp-head row">
        <div>
          <span className="dn-eyebrow">Support</span>
          <h1>My tickets</h1>
          <p className="dn-muted">Follow every request you've sent to our team.</p>
        </div>
        <Link to="/user-help/contact" className="dn-btn"><MessageSquarePlus size={16} /> New request</Link>
      </header>

      <div className="rw-chips solo hp-tabs" role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`hp-chip ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label} <em>{id === "all" ? tickets.length : tickets.filter(MATCH[id]).length}</em>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets here" text="When you contact support, your request shows up here with live status." actionLabel="Contact support" to="/user-help/contact" />
      ) : (
        <div className="hp-tickets">
          {rows.map((t) => (
            <Link key={t.id} to={`/user-help/tickets/${t.id}`} className="dn-card hp-ticket-row">
              <div>
                <div className="hp-ticket-top"><b>{t.id}</b><TicketBadge status={t.status} />{t.orderId && <span className="dn-chip">{t.orderId}</span>}</div>
                <h3>{t.subject}</h3>
                <p>{t.category} · opened {formatDate(t.createdAt)}</p>
              </div>
              <div className="hp-ticket-side"><small>Updated {relativeDay(t.updatedAt).toLowerCase()}</small><ChevronRight size={18} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
