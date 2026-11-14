/* =========================================================
   Admin › Support
   One inbox for the help tickets raised in the User app and the
   ReMaker app. Replies and status changes made here show up in the
   member's ticket right away.
   ========================================================= */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Inbox,
  MessageSquareReply,
  Hourglass,
  CircleCheck,
  LifeBuoy,
  SearchX,
  Send,
  Paperclip,
  UserRound,
  Palette,
} from "lucide-react";

import {
  loadMoreSupportTickets,
  replyToSupportTicket,
  setSupportTicketAssignee,
  setSupportTicketStatus,
  useSupportStatus,
  useSupportTicketDetail,
  useSupportTickets,
} from "../../../shared/supportTickets";
import { useAccess } from "../../data/teamStore";

import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/support/AdminSupport.css";

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

export default function AdminSupport() {
  const me = useAccess().me;
  const { toast, toastNode } = useToast();

  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("all");
  const [priority, setPriority] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openKey, setOpenKey] = useState(null);
  const filters = { query, status, priority, source };
  const tickets = useSupportTickets("admin", filters);
  const ticketState = useSupportStatus("admin", null, filters);
  const openId = openKey ? openKey.slice(openKey.indexOf(":") + 1) : null;
  const ticketDetail = useSupportTicketDetail("admin", openId);
  const detailState = useSupportStatus("admin", openId);

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
  }, [status, source, priority, query, pageSize]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const baseCurrent = all.find((t) => t.key === openKey) || null;
  const current = baseCurrent && ticketDetail
    ? { ...baseCurrent, assignedTo: ticketDetail.assignedTo || baseCurrent.assignedTo, messages: (ticketDetail.messages || []).map((m) => ({
        id: m.id, team: m.from === "team", text: m.text, at: m.at, name: m.name,
      })), photos: ticketDetail.photos || [] }
    : baseCurrent;
  const filtersActive =
    status !== "All" || source !== "all" || priority !== "all" || query;

  const send = async (t, text, nextStatus) => {
    await replyToSupportTicket("admin", t.id, text, nextStatus);
    toast(`Reply sent to ${t.from.name}.`);
  };
  const setTo = async (t, next) => {
    await setSupportTicketStatus("admin", t.id, next);
    toast(`${t.id} is now ${label(next).toLowerCase()}.`);
  };
  const assign = async (t, assigneeId) => {
    await setSupportTicketAssignee(t.id, assigneeId);
    toast(assigneeId ? "Ticket assignment updated." : "Ticket is now unassigned.");
  };

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
              <span>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="all">Any</option>
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
                  <th>Last update</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.key}
                    onClick={() => setOpenKey(t.key)}
                    onKeyDown={(e) => e.key === "Enter" && setOpenKey(t.key)}
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

      {current && (
        <TicketModal
          ticket={current}
          adminName={me?.name || "ReOrbit Support"}
          onClose={() => setOpenKey(null)}
          onSend={send}
          onStatus={setTo}
          onAssign={assign}
          supportAgents={ticketState.supportAgents}
          loading={detailState.loading}
          detailError={detailState.error}
        />
      )}
      {toastNode}
    </div>
  );
}

function TicketModal({ ticket: t, onClose, onSend, onStatus, onAssign, supportAgents, loading, detailError }) {
  const [text, setText] = useState("");
  const [next, setNext] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const options = STATUS_OPTIONS[t.source];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [t.messages.length]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (text.trim().length < 2 || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend(t, text, next || (t.status === "Open" ? "In progress" : t.status));
      setText("");
      setNext("");
      setTouched(false);
    } catch (requestError) {
      setError(requestError.message || "Your reply could not be sent.");
    } finally {
      setBusy(false);
    }
  };
  const changeAssignee = async (event) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onAssign(t, event.target.value);
    } catch (requestError) {
      setError(requestError.message || "The ticket assignment could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="ad-modal sp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-title"
      >
        <button
          type="button"
          data-safe
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <header className="sp-head">
          <span className="aup-mono">{t.id}</span>
          <h3 id="sp-title">{t.subject}</h3>
          <div className="sp-head-meta">
            <SourceChip source={t.source} />
            <span>{t.from.name}</span>
            <span>· {t.category}</span>
            {t.order && <span>· Order {t.order}</span>}
            <span className={`sp-pri ${String(t.priority).toLowerCase()}`}>
              {t.priority}
            </span>
            <span className={`sp-status ${tone(t.status)}`}>
              {label(t.status)}
            </span>
            {t.assignedTo && <span>· Assigned to {t.assignedTo.name}</span>}
          </div>
        </header>

        <ol className="sp-thread" aria-label="Conversation">
          {loading && t.messages.length === 0 && <li className="sp-sub">Loading conversation…</li>}
          {t.messages.map((m) => (
            <li key={m.id} className={m.team ? "team" : "member"}>
              <div className="sp-bubble">
                <header>
                  <strong>{m.team ? "ReOrbit Support" : m.name}</strong>
                  <time>{when(m.at)}</time>
                </header>
                <p>{m.text}</p>
              </div>
            </li>
          ))}
          {t.photos?.length > 0 && (
            <li className="member">
              <div className="sp-bubble">
                <header>
                  <strong>Photos attached</strong>
                </header>
                <div className="sp-photos">
                  {t.photos.map((p, i) => (
                    <img key={i} src={p} alt={`Attachment ${i + 1}`} />
                  ))}
                </div>
              </div>
            </li>
          )}
          <li ref={endRef} aria-hidden="true" />
        </ol>

        {detailError && <p className="ad-modal-error" role="alert">{detailError}</p>}
        {error && <p className="ad-modal-error" role="alert">{error}</p>}

        <form className="sp-reply" onSubmit={submit}>
          <label className="ad-modal-field">
            <span>Your reply</span>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Write to ${t.from.name}`}
            />
            {touched && text.trim().length < 2 && (
              <small className="ad-modal-error">Write a reply first.</small>
            )}
          </label>
          <div className="sp-reply-row">
            <label className="au-select">
              <span>Assigned to</span>
              <select value={t.assignedTo?.id || ""} onChange={changeAssignee} disabled={busy}>
                <option value="">Unassigned</option>
                {(supportAgents || []).map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </label>
            <label className="au-select">
              <span>Then set to</span>
              <select value={next} onChange={(e) => setNext(e.target.value)}>
                <option value="">
                  {t.status === "Open"
                    ? "In progress"
                    : "Keep as " + label(t.status).toLowerCase()}
                </option>
                {options
                  .filter(
                    (o) =>
                      o !== t.status &&
                      !(o === "In progress" && t.status === "Open"),
                  )
                  .map((o) => (
                    <option key={o} value={o}>
                      {label(o)}
                    </option>
                  ))}
              </select>
            </label>
            <div className="sp-reply-actions">
              {t.status !== "Resolved" && t.status !== "Closed" && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try { await onStatus(t, "Resolved"); }
                    catch (requestError) { setError(requestError.message || "Status could not be changed."); }
                    finally { setBusy(false); }
                  }}
                >
                  Mark resolved
                </button>
              )}
              {(t.status === "Resolved" || t.status === "Closed") && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try { await onStatus(t, "Open"); }
                    catch (requestError) { setError(requestError.message || "Ticket could not be reopened."); }
                    finally { setBusy(false); }
                  }}
                >
                  Reopen
                </button>
              )}
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy || t.status === "Closed"}>
                <Send size={14} /> {busy ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
