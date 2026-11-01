/* =========================================================
   Admin › Support
   One inbox for the help tickets raised in the User app and the
   ReMaker app. Replies and status changes made here show up in the
   member's ticket right away.
   ========================================================= */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, X, Inbox, MessageSquareReply, Hourglass, CircleCheck, LifeBuoy, SearchX, Send, Paperclip, UserRound, Palette,
} from "lucide-react";

import { useTickets as useUserTickets, teamReply as userReply, teamSetStatus as userStatus } from "../../../user/data/supportStore";
import { useTickets as useRemakerTickets, teamReply as remakerReply, setTicketStatus as remakerStatus } from "../../../remaker/data/helpStore";
import { useMyUserAccount, useMyRemakerAccount } from "../../../shared/identity";
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
const tone = (s) => ({ Open: "wait", "In progress": "info", "Waiting for you": "waiting", Resolved: "good", Closed: "neutral" }[s] || "neutral");
const bucket = (s) => (s === "Resolved" || s === "Closed" ? "Resolved" : s === "Waiting for you" ? "Waiting" : s);

const ago = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
};
const when = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

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
  { key: "In progress", label: "In progress", icon: MessageSquareReply, tone: "info" },
  { key: "Waiting", label: "Waiting for member", icon: Hourglass, tone: "wait" },
  { key: "Resolved", label: "Resolved", icon: CircleCheck, tone: "good" },
];

export default function AdminSupport() {
  const userTickets = useUserTickets();
  const remakerTickets = useRemakerTickets();
  const me = useAccess().me;
  const userAcc = useMyUserAccount();
  const remakerAcc = useMyRemakerAccount();
  const { toast, toastNode } = useToast();

  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("all");
  const [priority, setPriority] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openKey, setOpenKey] = useState(null);

  /* one shape for both apps */
  const all = useMemo(() => {
    const u = userTickets.map((t) => ({
      key: `User:${t.id}`, source: "User", id: t.id, subject: t.subject, category: t.category, status: t.status,
      priority: t.priority, order: t.orderId || "", createdAt: t.createdAt, updatedAt: t.updatedAt,
      from: { name: userAcc?.full_name || "Member", image: userAcc?.profile?.profile_image, email: userAcc?.email || "" },
      messages: t.messages.map((m) => ({ id: m.id, team: m.from !== "user", text: m.text, at: m.at, name: m.from === "user" ? (userAcc?.full_name || "Member") : "ReOrbit Support" })),
    }));
    const r = remakerTickets.map((t) => ({
      key: `ReMaker:${t.id}`, source: "ReMaker", id: t.id, subject: t.subject, category: t.category, status: t.status,
      priority: t.priority, order: t.relatedOrder || "", createdAt: t.createdAt, updatedAt: t.updatedAt,
      from: { name: remakerAcc?.full_name || "ReMaker", image: remakerAcc?.profile?.profile_image, email: remakerAcc?.email || "" },
      messages: t.messages.map((m) => ({ id: m.id, team: m.from !== "me", text: m.text, at: m.at, name: m.from === "me" ? (remakerAcc?.full_name || "ReMaker") : m.name || "ReOrbit Support" })),
      photos: t.photos || [],
    }));
    return [...u, ...r].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [userTickets, remakerTickets, userAcc, remakerAcc]);

  const counts = useMemo(() => {
    const c = { All: all.length, Open: 0, "In progress": 0, Waiting: 0, Resolved: 0 };
    all.forEach((t) => { c[bucket(t.status)] += 1; });
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) =>
      (status === "All" || bucket(t.status) === status) &&
      (source === "all" || t.source === source) &&
      (priority === "all" || t.priority === priority) &&
      (!q || [t.id, t.subject, t.category, t.from.name, t.order].some((v) => String(v).toLowerCase().includes(q))));
  }, [all, status, source, priority, query]);

  useEffect(() => { setPage(1); }, [status, source, priority, query, pageSize]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const current = all.find((t) => t.key === openKey) || null;
  const filtersActive = status !== "All" || source !== "all" || priority !== "all" || query;

  const send = (t, text, nextStatus) => {
    (t.source === "User" ? userReply : remakerReply)(t.id, text, nextStatus);
    toast(`Reply sent to ${t.from.name}.`);
  };
  const setTo = (t, next) => {
    (t.source === "User" ? userStatus : remakerStatus)(t.id, next);
    toast(`${t.id} is now ${label(next).toLowerCase()}.`);
  };

  return (
    <div className="au-page">
      <section className="au-cards ao-cards sp-cards" aria-label="Filter by status">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const on = status === card.key;
          return (
            <button key={card.key} type="button" className={`au-card tone-${card.tone} ${on ? "active" : ""}`} onClick={() => setStatus(card.key)} aria-pressed={on}>
              <span className="au-card-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="au-card-text"><small>{card.label}</small><strong>{counts[card.key]}</strong></span>
            </button>
          );
        })}
      </section>

      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticket ID, subject, name or order" aria-label="Search tickets" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="au-toolbar-right ao-filters">
            <label className="au-select"><span>From</span>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="all">Users and ReMakers</option><option value="User">Users</option><option value="ReMaker">ReMakers</option>
              </select>
            </label>
            <label className="au-select"><span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="all">Any</option><option>High</option><option>Normal</option><option>Low</option>
              </select>
            </label>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table sp-table">
              <thead>
                <tr><th>Ticket</th><th>From</th><th>Category</th><th>Priority</th><th>Last update</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.key} onClick={() => setOpenKey(t.key)} onKeyDown={(e) => e.key === "Enter" && setOpenKey(t.key)} tabIndex={0}>
                    <td>
                      <div className="sp-main"><strong>{t.subject}</strong><span><span className="aup-mono">{t.id}</span>{t.order ? ` · Order ${t.order}` : ""}</span></div>
                    </td>
                    <td>
                      <div className="sp-from"><UserAvatar name={t.from.name} src={t.from.image} size={30} rounded="9px" /><div><span className="ap-owner-name plain">{t.from.name}</span><SourceChip source={t.source} /></div></div>
                    </td>
                    <td>{t.category}</td>
                    <td><span className={`sp-pri ${String(t.priority).toLowerCase()}`}>{t.priority}</span></td>
                    <td><span className="au-muted-strong">{ago(t.updatedAt)}</span><small className="sp-sub">{t.messages.length} message{t.messages.length === 1 ? "" : "s"}</small></td>
                    <td><span className={`sp-status ${tone(t.status)}`}>{label(t.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={all.length === 0 ? "No tickets yet" : "No tickets match your filters"}
            text={all.length === 0 ? "Help tickets raised by users and ReMakers will show up here." : "Try a different search or clear the filters."}
            action={filtersActive && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { setStatus("All"); setSource("all"); setPriority("all"); setQuery(""); }}>Clear filters</button>}
          />
        )}

        {filtered.length > 0 && (
          <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} sizes={[10, 20, 50]} />
        )}
      </section>

      {current && <TicketModal ticket={current} adminName={me?.name || "ReOrbit Support"} onClose={() => setOpenKey(null)} onSend={send} onStatus={setTo} />}
      {toastNode}
    </div>
  );
}

function TicketModal({ ticket: t, onClose, onSend, onStatus }) {
  const [text, setText] = useState("");
  const [next, setNext] = useState("");
  const [touched, setTouched] = useState(false);
  const endRef = useRef(null);
  const options = STATUS_OPTIONS[t.source];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [t.messages.length]);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (text.trim().length < 2) return;
    onSend(t, text, next || (t.status === "Open" ? "In progress" : t.status));
    setText(""); setNext(""); setTouched(false);
  };

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-title">
        <button type="button" data-safe className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <header className="sp-head">
          <span className="aup-mono">{t.id}</span>
          <h3 id="sp-title">{t.subject}</h3>
          <div className="sp-head-meta">
            <SourceChip source={t.source} />
            <span>{t.from.name}</span>
            <span>· {t.category}</span>
            {t.order && <span>· Order {t.order}</span>}
            <span className={`sp-pri ${String(t.priority).toLowerCase()}`}>{t.priority}</span>
            <span className={`sp-status ${tone(t.status)}`}>{label(t.status)}</span>
          </div>
        </header>

        <ol className="sp-thread" aria-label="Conversation">
          {t.messages.map((m) => (
            <li key={m.id} className={m.team ? "team" : "member"}>
              <div className="sp-bubble">
                <header><strong>{m.team ? "ReOrbit Support" : m.name}</strong><time>{when(m.at)}</time></header>
                <p>{m.text}</p>
              </div>
            </li>
          ))}
          {t.photos?.length > 0 && (
            <li className="member"><div className="sp-bubble"><header><strong>Photos attached</strong></header><div className="sp-photos">{t.photos.map((p, i) => <img key={i} src={p} alt={`Attachment ${i + 1}`} />)}</div></div></li>
          )}
          <li ref={endRef} aria-hidden="true" />
        </ol>

        <form className="sp-reply" onSubmit={submit}>
          <label className="ad-modal-field"><span>Your reply</span>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write to ${t.from.name}`} />
            {touched && text.trim().length < 2 && <small className="ad-modal-error">Write a reply first.</small>}
          </label>
          <div className="sp-reply-row">
            <label className="au-select"><span>Then set to</span>
              <select value={next} onChange={(e) => setNext(e.target.value)}>
                <option value="">{t.status === "Open" ? "In progress" : "Keep as " + label(t.status).toLowerCase()}</option>
                {options.filter((o) => o !== t.status && !(o === "In progress" && t.status === "Open")).map((o) => <option key={o} value={o}>{label(o)}</option>)}
              </select>
            </label>
            <div className="sp-reply-actions">
              {t.status !== "Resolved" && t.status !== "Closed" && (
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => onStatus(t, "Resolved")}>Mark resolved</button>
              )}
              {(t.status === "Resolved" || t.status === "Closed") && (
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => onStatus(t, "Open")}>Reopen</button>
              )}
              <button type="submit" className="ad-btn ad-btn-primary"><Send size={14} /> Send reply</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
