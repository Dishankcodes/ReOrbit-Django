/* =========================================================
   Admin › Support
   One inbox for the help tickets raised in the User app and the
   ReMaker app. Replies and status changes made here show up in the
   member's ticket right away.
   ========================================================= */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Inbox,
  MessageSquareReply,
  Hourglass,
  CircleCheck,
  LifeBuoy,
  SearchX,
  UserRound,
  Palette,
} from "lucide-react";

import {
  loadMoreSupportTickets,
  useSupportStatus,
  useSupportTickets,
} from "../../../shared/supportTickets";

import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import useToast from "../../components/ui/useToast";
import ContactInbox from "./components/ContactInbox";
import { apiRequest } from "../../../api/api";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/support/AdminSupport.css";
import "../../css/reviews/AdminReviews.css";

/* statuses the team can set, per app (the User app has no "waiting" state) */
const STATUS_OPTIONS = {
  User: ["Open", "In progress", "Resolved"],
  ReMaker: ["Open", "In progress", "Waiting for you", "Resolved", "Closed"],
};
const STATUS_LABEL = { "Waiting for you": "Waiting for member" };
const label = (s) => STATUS_LABEL[s] || s;
const tone = (s) =>
  ({
    Open: "wait",
    "In progress": "info",
    "Waiting for you": "waiting",
    Resolved: "good",
    Closed: "neutral",
  })[s] || "neutral";
const bucket = (s) =>
  s === "Resolved" || s === "Closed"
    ? "Resolved"
    : s === "Waiting for you"
      ? "Waiting"
      : s;

const ago = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
};
const when = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

function SourceChip({ source }) {
  const remaker = source === "ReMaker";
  return (
    <span className={`sp-source ${remaker ? "remaker" : "user"}`}>
      {remaker ? <Palette size={11} /> : <UserRound size={11} />} {source}
    </span>
  );
}

const CARDS = [
  { key: "All", label: "All tickets", icon: LifeBuoy, tone: "all" },
  { key: "Open", label: "Needs a reply", icon: Inbox, tone: "wait" },
  {
    key: "In progress",
    label: "In progress",
    icon: MessageSquareReply,
    tone: "info",
  },
  {
    key: "Waiting",
    label: "Waiting for member",
    icon: Hourglass,
    tone: "wait",
  },
  { key: "Resolved", label: "Resolved", icon: CircleCheck, tone: "good" },
];

function TicketsView() {
  const navigate = useNavigate();
  const { toast, toastNode } = useToast();

  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("all");
  const [priority, setPriority] = useState("all");
  const [urlParams] = useSearchParams();
  const [query, setQuery] = useState(urlParams.get("q") || "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [assigned, setAssigned] = useState("all");
  const filters = { query, status, priority, source, assigned };
  const tickets = useSupportTickets("admin", filters);
  const ticketState = useSupportStatus("admin", null, filters);

  /* One server-backed inbox shape for User and ReMaker tickets. */
  const all = useMemo(() => {
    return tickets.map((t) => ({
      key: `${t.source}:${t.id}`,
      source: t.source,
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      order: t.orderId || "",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      from: {
        name: t.requester?.name || "Member",
        image: t.requester?.image || "",
        email: t.requester?.email || "",
      },
      messageCount: t.messageCount || t.messages.length,
      messages: (t.messages || []).map((m) => ({
        id: m.id,
        team: m.from === "team",
        text: m.text,
        at: m.at,
        name: m.name || (m.from === "team" ? "ReOrbit Support" : t.requester?.name || "Member"),
      })),
      photos: t.photos || [],
      lastMessage: t.lastMessage || null,
      assignedTo: t.assignedTo || null,
    }));
  }, [tickets]);

  const filtered = useMemo(() => [...all].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    ), [all]);

  const counts = useMemo(() => {
    const c = {
      All: ticketState.counts.All ?? all.length,
      Open: ticketState.counts.Open ?? 0,
      "In progress": ticketState.counts["In progress"] ?? 0,
      Waiting: ticketState.counts.Waiting ?? 0,
      Resolved: ticketState.counts.Resolved ?? 0,
    };
    return c;
  }, [ticketState.counts, all]);

  useEffect(() => {
    setPage(1);
  }, [status, source, priority, assigned, query, pageSize]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filtersActive =
    status !== "All" || source !== "all" || priority !== "all" || assigned !== "all" || query;

  const open = (t) => navigate(`/admin-support/${t.id}`);

  return (
    <div className="au-page">
      <section
        className="au-cards ao-cards sp-cards"
        aria-label="Filter by status"
      >
        {CARDS.map((card) => {
          const Icon = card.icon;
          const on = status === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={`au-card tone-${card.tone} ${on ? "active" : ""}`}
              onClick={() => setStatus(card.key)}
              aria-pressed={on}
            >
              <span className="au-card-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="au-card-text">
                <small>{card.label}</small>
                <strong>{counts[card.key]}</strong>
              </span>
            </button>
          );
        })}
      </section>

      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticket ID, subject, name or order"
              aria-label="Search tickets"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="au-toolbar-right ao-filters">
            <label className="au-select">
              <span>From</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="all">Users and ReMakers</option>
                <option value="User">Users</option>
                <option value="ReMaker">ReMakers</option>
              </select>
            </label>
            <label className="au-select">
              <span>Assigned</span>
              <select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
                <option value="all">Anyone</option>
                <option value="me">Me</option>
                <option value="none">Unassigned</option>
              </select>
            </label>
            <label className="au-select">
              <span>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="all">Any</option>
                <option>Urgent</option>
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </label>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table sp-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>From</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Last update</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.key}
                    onClick={() => open(t)}
                    onKeyDown={(e) => e.key === "Enter" && open(t)}
                    tabIndex={0}
                  >
                    <td>
                      <div className="sp-main">
                        <strong>{t.subject}</strong>
                        <span>
                          <span className="aup-mono">{t.id}</span>
                          {t.order ? ` · Order ${t.order}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="sp-from">
                        <UserAvatar
                          name={t.from.name}
                          src={t.from.image}
                          size={30}
                          rounded="9px"
                        />
                        <div>
                          <span className="ap-owner-name plain">
                            {t.from.name}
                          </span>
                          <SourceChip source={t.source} />
                        </div>
                      </div>
                    </td>
                    <td>{t.category}</td>
                    <td>
                      <span
                        className={`sp-pri ${String(t.priority).toLowerCase()}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      {t.assignedTo ? (
                        <span className="au-muted-strong">{t.assignedTo.name}</span>
                      ) : (
                        <span className="sp-sub">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className="au-muted-strong">
                        {ago(t.updatedAt)}
                      </span>
                      <small className="sp-sub">
                        {t.messages.length} message
                        {t.messages.length === 1 ? "" : "s"}
                      </small>
                    </td>
                    <td>
                      <span className={`sp-status ${tone(t.status)}`}>
                        {label(t.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={
              all.length === 0
                ? "No tickets yet"
                : "No tickets match your filters"
            }
            text={
              all.length === 0
                ? "Help tickets raised by users and ReMakers will show up here."
                : "Try a different search or clear the filters."
            }
            action={
              filtersActive && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  onClick={() => {
                    setStatus("All");
                    setAssigned("all");
                    setSource("all");
                    setPriority("all");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              )
            }
          />
        )}

        {ticketState.error && (
          <p className="ad-modal-error" role="alert">{ticketState.error}</p>
        )}

        {filtered.length > 0 && (
          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPage={setPage}
            onPageSize={setPageSize}
            sizes={[10, 20, 50]}
          />
        )}
        {ticketState.hasMore && (
          <div className="sp-load-more">
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              disabled={ticketState.loadingMore}
              onClick={() => loadMoreSupportTickets("admin", filters).catch((error) => toast(error.message || "More tickets could not be loaded."))}
            >
              {ticketState.loadingMore ? "Loading tickets…" : "Load more tickets"}
            </button>
          </div>
        )}
      </section>

      {toastNode}
    </div>
  );
}

/* Tickets (from members and ReMakers) and Website messages (the public Contact us form) */
export default function AdminSupport() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "messages" ? "messages" : "tickets";
  const [newMessages, setNewMessages] = useState(0);
  useEffect(() => {
    apiRequest("/support/admin/contact/?status=New")
      .then((r) => setNewMessages(r.data.counts?.New || 0))
      .catch(() => {});
  }, [view]);
  const go = (v) => {
    const n = new URLSearchParams(params);
    if (v === "messages") n.set("view", "messages");
    else n.delete("view");
    n.delete("open");
    setParams(n, { replace: true });
  };
  return (
    <>
      <nav className="sp-views" aria-label="Support inbox">
        <button type="button" className={view === "tickets" ? "on" : ""} onClick={() => go("tickets")}>
          <LifeBuoy size={15} /> Tickets
        </button>
        <button type="button" className={view === "messages" ? "on" : ""} onClick={() => go("messages")}>
          <Inbox size={15} /> Website messages
          {newMessages > 0 && <em>{newMessages}</em>}
        </button>
      </nav>
      {view === "messages" ? <ContactInbox /> : <TicketsView />}
    </>
  );
}
