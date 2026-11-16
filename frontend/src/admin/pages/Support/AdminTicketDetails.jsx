/* =========================================================
   Admin › Support › one ticket (/admin-support/:ticketId)
   The whole conversation, who owns it, its status and the order it
   is about, on one page that can be bookmarked or shared with a
   teammate. Replies show up in the member's ticket right away.
   ========================================================= */

import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, LifeBuoy, Mail, Package, Palette, Paperclip, Search, Send, UserCheck, UserRound } from "lucide-react";

import {
  assignSupportTicketToMe,
  replyToSupportTicket,
  setSupportTicketAssignee,
  setSupportTicketStatus,
  setSupportTicketPriority,
  useSupportStatus,
  useSupportTicketDetail,
  useSupportTickets,
} from "../../../shared/supportTickets";
import TicketOrderCard from "../../../shared/components/TicketOrderCard";
import { useAccess } from "../../data/teamStore";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/support/AdminSupport.css";

const STATUS_OPTIONS = {
  User: ["Open", "In progress", "Resolved"],
  ReMaker: ["Open", "In progress", "Waiting for you", "Resolved", "Closed"],
};
const LABEL = { "Waiting for you": "Waiting for member" };
const label = (s) => LABEL[s] || s;
const tone = (s) =>
  ({ Open: "wait", "In progress": "info", "Waiting for you": "waiting", Resolved: "good", Closed: "neutral" })[s] ||
  "neutral";
const when = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const access = useAccess();
  const canEdit = access.can("support", "edit");
  const myId = access.me?.id;
  const { toast, toastNode } = useToast();

  // The inbox list also carries the team members who can take a ticket.
  useSupportTickets("admin", {});
  const { supportAgents } = useSupportStatus("admin", null, {});
  const ticket = useSupportTicketDetail("admin", ticketId);
  const { loading, error: loadError } = useSupportStatus("admin", ticketId);

  const [text, setText] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const count = ticket?.messages?.length || 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  const run = async (job, done) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await job();
      if (done) toast(done);
    } catch (e) {
      setError(e?.message || "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!ticket || !ticket.messagesLoaded) {
    return (
      <div className="au-page">
        {loading ? (
          <p className="sp-sub">Loading ticket…</p>
        ) : (
          <EmptyState
            icon={LifeBuoy}
            title="Ticket not found"
            text={loadError || "It may have been removed, or the link is out of date."}
            action={<Link className="ad-btn ad-btn-ghost ad-btn-sm" to="/admin-support">Back to support</Link>}
          />
        )}
      </div>
    );
  }

  const t = ticket;
  const options = STATUS_OPTIONS[t.source] || STATUS_OPTIONS.User;
  const requester = t.requester || {};
  const closed = t.status === "Closed";
  const done = t.status === "Resolved" || closed;
  const mine = t.assignedTo?.id && t.assignedTo.id === myId;

  const send = (e) => {
    e.preventDefault();
    if (text.trim().length < 2) return setError("Write a reply first.");
    run(async () => {
      await replyToSupportTicket("admin", t.id, text, next || (t.status === "Open" ? "In progress" : t.status));
      setText("");
      setNext("");
    }, `Reply sent to ${requester.name || "the member"}.`);
  };

  return (
    <div className="au-page sp-page">
      <nav className="sp-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/admin-support"))}>
          <ArrowLeft size={14} /> All tickets
        </button>
        <span className="aup-mono">{t.id}</span>
        {t.orderId && (
          <Link className="sp-orderchip" to={t.order && !t.order.missing ? `/admin-orders/${t.orderId}` : `/admin-support?q=${t.orderId}`}>
            <Package size={12} /> Order {t.orderId}
          </Link>
        )}
      </nav>

      <header className="au-panel sp-top">
        <div>
          <h2>{t.subject}</h2>
          <div className="sp-head-meta">
            <span className={`sp-source ${t.source === "ReMaker" ? "remaker" : "user"}`}>
              {t.source === "ReMaker" ? <Palette size={11} /> : <UserRound size={11} />} {t.source}
            </span>
            {requester.id ? (
              <Link className="sp-reqlink" to={requester.type === "remaker" ? `/admin-remakers/${requester.id}` : `/admin-users/${requester.id}`}>
                {requester.name}
              </Link>
            ) : (
              <span>{requester.name}</span>
            )}
            <span>· {t.category}</span>
            <span>· Opened {when(t.createdAt)}</span>
          </div>
        </div>
        <div className="sp-top-badges">
          <span className={`sp-pri ${String(t.priority).toLowerCase()}`}>{t.priority}</span>
          <span className={`sp-status ${tone(t.status)}`}>{label(t.status)}</span>
        </div>
      </header>

      <div className="sp-grid">
        <section className="au-panel sp-conv">
          <ol className="sp-thread sp-thread-page" aria-label="Conversation">
            {t.messages.map((m) => {
              const team = m.from === "team";
              if (m.from === "event") {
                return (
                  <li key={m.id} className="event">
                    <span>{m.text}</span>
                    <time dateTime={m.at}>{when(m.at)}</time>
                  </li>
                );
              }
              return (
                <li key={m.id} className={team ? "team" : "member"}>
                  <div className="sp-bubble">
                    <header>
                      <strong>{team ? m.name || "ReOrbit Support" : m.name}</strong>
                      <time dateTime={m.at}>{when(m.at)}</time>
                    </header>
                    <p>{m.text}</p>
                    {(m.photos || []).length > 0 && (
                      <div className="sp-photos">
                        {m.photos.map((src, i) => (
                          <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                            <img src={src} alt={`Photo ${i + 1}`} />
                          </a>
                        ))}
                      </div>
                    )}
                    {m.attachmentUrl && (
                      <a className="sp-attach" href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <Paperclip size={12} /> Attachment
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
            <li ref={endRef} aria-hidden="true" />
          </ol>

          {error && <p className="ad-modal-error" role="alert">{error}</p>}
          {loadError && <p className="ad-modal-error" role="alert">{loadError}</p>}

          {canEdit ? (
            <form className="sp-reply" onSubmit={send}>
              <label className="ad-modal-field">
                <span>Your reply</span>
                <textarea
                  rows={4}
                  value={text}
                  disabled={closed}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={closed ? "Reopen this ticket to reply" : `Write to ${requester.name || "the member"}`}
                />
              </label>
              <div className="sp-reply-row">
                <label className="au-select">
                  <span>Then set to</span>
                  <select value={next} onChange={(e) => setNext(e.target.value)} disabled={closed}>
                    <option value="">{t.status === "Open" ? "In progress" : `Keep as ${label(t.status).toLowerCase()}`}</option>
                    {options
                      .filter((o) => o !== t.status && !(o === "In progress" && t.status === "Open"))
                      .map((o) => (
                        <option key={o} value={o}>{label(o)}</option>
                      ))}
                  </select>
                </label>
                <div className="sp-reply-actions">
                  <button type="submit" className="ad-btn ad-btn-primary" disabled={busy || closed}>
                    <Send size={14} /> {busy ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <p className="sp-sub">You can read this ticket, but replying needs Support edit access.</p>
          )}
        </section>

        <aside className="sp-side">
          <section className="au-panel sp-card">
            <h3>Assigned to</h3>
            <p className="sp-assignee">
              {t.assignedTo ? <><UserCheck size={15} /> {mine ? "You" : t.assignedTo.name}</> : "Nobody yet"}
            </p>
            {canEdit && (
              <div className="sp-assign">
                <label className="au-select">
                  <span>Team member</span>
                  <select
                    value={t.assignedTo?.id || ""}
                    disabled={busy}
                    onChange={(e) =>
                      run(
                        () => setSupportTicketAssignee(t.id, e.target.value),
                        e.target.value ? "Ticket assignment updated." : "Ticket is now unassigned.",
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {(supportAgents || []).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                {!mine && (
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost ad-btn-sm"
                    disabled={busy}
                    onClick={() => run(() => assignSupportTicketToMe(t.id), "This ticket is yours now.")}
                  >
                    Assign to me
                  </button>
                )}
              </div>
            )}
          </section>

          {canEdit && (
            <section className="au-panel sp-card">
              <h3>Priority</h3>
              <div className="sp-status-btns">
                {["Low", "Normal", "High", "Urgent"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`sp-chip ${t.priority === p ? "on" : ""}`}
                    disabled={busy || t.priority === p}
                    onClick={() => run(() => setSupportTicketPriority(t.id, p), `Priority is now ${p.toLowerCase()}.`)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>
          )}

          {canEdit && (
            <section className="au-panel sp-card">
              <h3>Status</h3>
              <div className="sp-status-btns">
                {options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`sp-chip ${t.status === o ? "on" : ""}`}
                    disabled={busy || t.status === o}
                    onClick={() => run(() => setSupportTicketStatus("admin", t.id, o), `${t.id} is now ${label(o).toLowerCase()}.`)}
                  >
                    {label(o)}
                  </button>
                ))}
              </div>
              {done && <p className="sp-sub">Resolved tickets reopen when the member replies.</p>}
            </section>
          )}

          <section className="au-panel sp-card">
            <h3>{t.source === "ReMaker" ? "ReMaker" : "Member"}</h3>
            <p className="sp-person"><strong>{requester.name}</strong></p>
            {requester.email && (
              <a className="sp-mail" href={`mailto:${requester.email}`}><Mail size={13} /> {requester.email}</a>
            )}
            <small className="sp-sub">{requester.id}</small>
          </section>

          {t.order ? (
            <>
              <TicketOrderCard order={t.order} scope="admin" />
              <Link className="sp-related" to={`/admin-support?q=${t.orderId}`}>
                <Search size={13} /> All tickets about {t.orderId}
              </Link>
            </>
          ) : (
            <section className="au-panel sp-card">
              <h3>Order</h3>
              <p className="sp-sub">This ticket is not linked to an order.</p>
            </section>
          )}
        </aside>
      </div>
      {toastNode}
    </div>
  );
}
