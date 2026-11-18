import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Inbox, Mail, MailCheck, Search, Send, X, Archive, RotateCcw, Ticket, Store, UserRound } from "lucide-react";

import { apiRequest } from "../../../../api/api";
import { useAccess } from "../../../data/teamStore";
import EmptyState from "../../../components/ui/EmptyState";
import useToast from "../../../components/ui/useToast";
import { formatDate, timeAgo } from "../../../utils/format";

const VIEWS = [
  { key: "New", label: "New" },
  { key: "Replied", label: "Replied" },
  { key: "Closed", label: "Closed" },
  { key: "", label: "All" },
];

/* Admin › Support › Website messages: the public contact form.
   Messages from people with an account also became tickets (linked); the rest are answered by
   email from here. */
export default function ContactInbox() {
  const access = useAccess();
  const canEdit = access.can("support", "edit");
  const { toast, toastNode } = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState("New");
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (view) qs.set("status", view);
    if (q.trim()) qs.set("q", q.trim());
    return apiRequest(`/support/admin/contact/?${qs}`)
      .then((r) => {
        setData(r.data);
        setError("");
        return r.data;
      })
      .catch((e) => setError(e.message || "Could not load messages."));
  }, [view, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  /* a notification link opens one message: ?view=messages&open=CNT-1001 */
  useEffect(() => {
    const id = params.get("open");
    if (!id) return;
    apiRequest(`/support/admin/contact/?q=${encodeURIComponent(id)}`)
      .then((r) => {
        const m = r.data.results.find((x) => x.id === id);
        if (m) setOpen(m);
      })
      .catch(() => {});
  }, [params]);

  const close = () => {
    setOpen(null);
    setReply("");
    if (params.get("open")) {
      const n = new URLSearchParams(params);
      n.delete("open");
      setParams(n, { replace: true });
    }
  };

  const act = async (action) => {
    if (!open) return;
    setBusy(true);
    try {
      const r = await apiRequest(`/support/admin/contact/${open.id}/`, {
        method: "POST",
        body: { action, message: reply },
      });
      toast(r.message);
      setOpen(r.data.message_item);
      setReply("");
      load();
    } catch (e) {
      toast(e.errors?.message?.[0] || e.message || "Not done.");
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.results || [];
  const counts = data?.counts || {};

  return (
    <section className="au-panel ci">
      <div className="ci-bar">
        <div className="arv-chips" role="tablist" aria-label="Which messages">
          {VIEWS.map((v) => (
            <button key={v.label} type="button" className={view === v.key ? "on" : ""} onClick={() => setView(v.key)}>
              {v.label}
              {v.key && counts[v.key] != null && <em>{counts[v.key]}</em>}
            </button>
          ))}
        </div>
        <label className="au-search">
          <Search size={16} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, subject or CNT- reference"
            aria-label="Search messages"
          />
        </label>
      </div>

      {error ? (
        <p className="ci-note">{error}</p>
      ) : !data ? (
        <p className="ci-note">Loading messages…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={view === "New" ? "No new messages" : "Nothing here"}
          text="Messages sent from the website's Contact us page appear here."
        />
      ) : (
        <ul className="ci-list">
          {rows.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setOpen(m)} className={m.status === "New" ? "is-new" : ""}>
                <span className={`ci-dot ${m.status.toLowerCase()}`} aria-hidden="true" />
                <div className="ci-main">
                  <strong>{m.subject}</strong>
                  <span>
                    {m.name} · {m.email}
                  </span>
                  <p>{m.message}</p>
                </div>
                <div className="ci-meta">
                  <small>{timeAgo(m.created_at)}</small>
                  <span className="ci-tag">{m.topic}</span>
                  {m.ticket ? (
                    <span className="ci-tag ticket">
                      <Ticket size={11} /> {m.ticket}
                    </span>
                  ) : (
                    <span className="ci-tag guest">No account</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="ci-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <aside className="ci-drawer" role="dialog" aria-modal="true" aria-label={open.subject}>
            <header>
              <div>
                <small>
                  {open.id} · {formatDate(open.created_at)}
                </small>
                <h3>{open.subject}</h3>
                <span className={`ci-status ${open.status.toLowerCase()}`}>{open.status}</span>
              </div>
              <button type="button" className="ci-x" onClick={close} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <dl className="ci-facts">
              <div>
                <dt>From</dt>
                <dd>
                  {open.name}
                  <a href={`mailto:${open.email}`}>{open.email}</a>
                </dd>
              </div>
              <div>
                <dt>Topic</dt>
                <dd>{open.topic}</dd>
              </div>
              <div>
                <dt>Site</dt>
                <dd>
                  {open.side === "remaker" ? <Store size={13} /> : <UserRound size={13} />}{" "}
                  {open.side === "remaker" ? "ReMaker site" : "Member site"}
                </dd>
              </div>
              {open.ticket && (
                <div>
                  <dt>Ticket</dt>
                  <dd>
                    <Link to={`/admin-support/${open.ticket}`}>{open.ticket}</Link>
                    <small>They have an account, so answer in the ticket.</small>
                  </dd>
                </div>
              )}
            </dl>
            <div className="ci-msg">{open.message}</div>
            {open.reply && (
              <div className="ci-reply-sent">
                <small>
                  <MailCheck size={13} /> Replied by {open.replied_by || "the team"} · {formatDate(open.replied_at)}
                </small>
                <p>{open.reply}</p>
              </div>
            )}
            {canEdit && !open.ticket && (
              <div className="ci-compose">
                <label htmlFor="ci-reply">
                  <Mail size={14} /> {open.reply ? "Send another reply" : "Reply by email"}
                </label>
                <textarea
                  id="ci-reply"
                  rows={5}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Hi ${open.name.split(" ")[0]}, thanks for writing to ReOrbit…`}
                />
                <small>Sent to {open.email} from ReOrbit, with their reference.</small>
              </div>
            )}
            {canEdit && (
              <footer>
                {open.status === "Closed" ? (
                  <button type="button" className="ad-btn ad-btn-ghost" onClick={() => act("reopen")} disabled={busy}>
                    <RotateCcw size={15} /> Reopen
                  </button>
                ) : (
                  <button type="button" className="ad-btn ad-btn-ghost" onClick={() => act("close")} disabled={busy}>
                    <Archive size={15} /> Close
                  </button>
                )}
                {!open.ticket && (
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary"
                    onClick={() => act("reply")}
                    disabled={busy || reply.trim().length < 5}
                  >
                    <Send size={15} /> {busy ? "Sending…" : "Send reply"}
                  </button>
                )}
              </footer>
            )}
          </aside>
        </div>
      )}
      {toastNode}
    </section>
  );
}
