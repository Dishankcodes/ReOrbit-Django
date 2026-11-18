import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock,
  Copy,
  Eye,
  Globe,
  Link2,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Store,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import {
  ANNOUNCE_TYPES,
  AUDIENCE_LABEL,
  announcementAction,
  cancelAnnouncement,
  realAgo,
  refreshAnnouncements,
} from "../../data/notificationsStore";
import "../../css/reviews/AdminReviews.css";

const AUD_ICON = { users: Users, remakers: Store, everyone: Globe };
const VIEWS = [
  ["all", "All"],
  ["scheduled", "Scheduled"],
  ["sent", "Sent"],
  ["recalled", "Taken back"],
];
const when = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const CONFIRM = {
  recall: {
    key: "recall",
    tone: "danger",
    icon: "ban",
    needsReason: false,
    title: "Take this announcement back?",
    body: "It is removed from every inbox it reached, read or not. It stays here as a record. You can't undo this.",
    confirmLabel: "Take it back",
  },
  cancel: {
    key: "cancel",
    tone: "danger",
    icon: "ban",
    needsReason: false,
    title: "Cancel this scheduled announcement?",
    body: "It won't be sent. Nobody has seen it yet.",
    confirmLabel: "Cancel announcement",
  },
  send_now: {
    key: "send_now",
    tone: "positive",
    icon: "restore",
    needsReason: false,
    title: "Send it now?",
    body: "It goes to everyone in the audience right away instead of at the scheduled time.",
    confirmLabel: "Send now",
  },
};

/* Admin › Notifications › Announcements: everything sent or scheduled, with the full flow:
   new, edit / send now / cancel a scheduled one, see how many opened a sent one, duplicate it,
   or take a mistake back out of every inbox. */
export default function AnnouncementsPanel({ announcements, canEdit, onCompose, onEdit, toast }) {
  const [view, setView] = useState("all");
  const [pending, setPending] = useState(null); // { action, a }

  const counts = useMemo(() => {
    const c = { all: announcements.length, scheduled: 0, sent: 0, recalled: 0 };
    announcements.forEach((a) => {
      c[a.status || (a.scheduled ? "scheduled" : "sent")] += 1;
    });
    return c;
  }, [announcements]);
  const sent = announcements.filter((a) => (a.status || "sent") === "sent");
  const reached = sent.reduce((n, a) => n + (a.recipients || 0), 0);
  const opened = sent.reduce((n, a) => n + (a.read || 0), 0);
  const rows = announcements.filter((a) => view === "all" || (a.status || (a.scheduled ? "scheduled" : "sent")) === view);
  const next = announcements
    .filter((a) => a.status === "scheduled")
    .sort((x, y) => new Date(x.at) - new Date(y.at))[0];

  const run = async () => {
    const { action, a } = pending;
    setPending(null);
    try {
      if (action === "cancel") {
        await cancelAnnouncement(a.id);
        toast("Scheduled announcement cancelled");
      } else {
        toast(await announcementAction(a.id, action));
      }
    } catch (e) {
      toast(e.message || "That didn't work. Try again.");
      refreshAnnouncements();
    }
  };

  return (
    <section className="nt-ann-wrap">
      <div className="nt-ann-summary">
        <div>
          <Megaphone size={18} />
          <span>
            <strong>{counts.sent}</strong> sent
          </span>
        </div>
        <div>
          <Users size={18} />
          <span>
            <strong>{reached.toLocaleString("en-IN")}</strong> inboxes reached
          </span>
        </div>
        <div>
          <Eye size={18} />
          <span>
            <strong>{reached ? Math.round((opened * 100) / reached) : 0}%</strong> opened
          </span>
        </div>
        <div>
          <CalendarClock size={18} />
          <span>{next ? <>Next: <strong>{when(next.at)}</strong></> : "Nothing scheduled"}</span>
        </div>
      </div>

      <div className="arv-chips nt-ann-views" role="tablist" aria-label="Which announcements">
        {VIEWS.map(([k, l]) => (
          <button key={k} type="button" className={view === k ? "on" : ""} onClick={() => setView(k)}>
            {l}
            <em>{counts[k]}</em>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={view === "scheduled" ? "Nothing scheduled" : "No announcements yet"}
          text="Send offers, updates and reminders to members and ReMakers. They land in their notification bell."
          action={
            canEdit ? (
              <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => onCompose(null)}>
                <Plus size={14} /> New announcement
              </button>
            ) : null
          }
        />
      ) : (
        <div className="nt-ann-grid">
          {rows.map((a) => {
            const AI = AUD_ICON[a.audience] || Globe;
            const status = a.status || (a.scheduled ? "scheduled" : "sent");
            return (
              <article key={a.id} className={`nt-ann is-${status}`}>
                <header>
                  <span className={`nt-ann-type t-${a.type}`}>{ANNOUNCE_TYPES[a.type]}</span>
                  <span className={`nt-ann-status ${status === "scheduled" ? "sched" : status}`}>
                    {status === "scheduled" ? "Scheduled" : status === "recalled" ? "Taken back" : "Sent"}
                  </span>
                </header>
                <h4>{a.title}</h4>
                <p>{a.message}</p>
                {a.link && (
                  <small className="nt-ann-link">
                    <Link2 size={12} /> Opens {a.link}
                  </small>
                )}
                {status === "sent" && a.recipients > 0 && (
                  <div className="nt-ann-meter" title={`${a.read} of ${a.recipients} opened it`}>
                    <i style={{ width: `${a.read_pct || 0}%` }} />
                    <span>
                      {a.read || 0} of {a.recipients} opened ({a.read_pct || 0}%)
                    </span>
                  </div>
                )}
                <footer>
                  <span>
                    <AI size={13} /> {AUDIENCE_LABEL[a.audience]}
                  </span>
                  <span>
                    <Clock size={13} /> {status === "scheduled" ? when(a.at) : realAgo(a.at)}
                    {status === "recalled" && a.recalled_at ? ` · taken back ${realAgo(a.recalled_at)}` : ""}
                  </span>
                  <span className="nt-by">{a.by}</span>
                </footer>
                {canEdit && (
                  <div className="nt-ann-actions">
                    {status === "scheduled" && (
                      <>
                        <button type="button" onClick={() => onEdit(a)}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" onClick={() => setPending({ action: "send_now", a })}>
                          <Send size={13} /> Send now
                        </button>
                        <button type="button" className="bad" onClick={() => setPending({ action: "cancel", a })}>
                          <Trash2 size={13} /> Cancel
                        </button>
                      </>
                    )}
                    {status !== "scheduled" && (
                      <button type="button" onClick={() => onCompose(a)}>
                        {status === "recalled" ? <RotateCcw size={13} /> : <Copy size={13} />}{" "}
                        {status === "recalled" ? "Fix and send again" : "Duplicate"}
                      </button>
                    )}
                    {status === "sent" && (
                      <button type="button" className="bad" onClick={() => setPending({ action: "recall", a })}>
                        <Undo2 size={13} /> Take back
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ConfirmActionModal
        action={pending ? CONFIRM[pending.action] : null}
        targets={pending ? [pending.a.title] : []}
        onClose={() => setPending(null)}
        onConfirm={run}
      />
    </section>
  );
}
