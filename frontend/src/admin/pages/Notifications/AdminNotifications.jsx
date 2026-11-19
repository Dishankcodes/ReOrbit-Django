import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  BellRing,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Megaphone,
  Search,
  CheckCheck,
  X,
  ArrowRight,
  Mail,
  MailOpen,
  Inbox,
  Clock,
  BellOff,
} from "lucide-react";

import {
  useNotifications,
  markRead,
  markUnread,
  dismiss,
  useAnnouncements,
  sendAnnouncement,
  updateAnnouncement,
  MODULES,
  AUDIENCE_LABEL,
  timeAgo,
  useAnnouncementReach,
} from "../../data/notificationsStore";
import useToast from "../../components/ui/useToast";
import EmptyState from "../../components/ui/EmptyState";
import AnnounceModal from "./AnnounceModal";
import AnnouncementsPanel from "./AnnouncementsPanel";
import { useAccess } from "../../data/teamStore";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/rewards/AdminRewards.css";
import "../../css/notifications/AdminNotifications.css";

export const SEVERITY = {
  critical: { label: "Urgent", icon: AlertOctagon },
  warning: { label: "Attention", icon: AlertTriangle },
  info: { label: "Info", icon: Info },
  success: { label: "Done", icon: CheckCircle2 },
};
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "action", label: "Needs action" },
  { key: "urgent", label: "Urgent" },
];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "announcements" ? "announcements" : "inbox";
  const { toast, toastNode } = useToast();

  const items = useNotifications();
  const announcements = useAnnouncements();

  const [filter, setFilter] = useState("all");
  const [module, setModule] = useState("all");
  const [q, setQ] = useState("");
  const [composer, setComposer] = useState({ open: false, prefill: null, editing: null });
  const canEdit = useAccess().can("notifications", "edit");

  /* "Announce to users" from the Rewards page lands here with a draft */
  useEffect(() => {
    const c = location.state?.compose;
    if (c) {
      setComposer({ open: true, prefill: c, editing: null });
      setParams({ tab: "announcements" }, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const reach = useAnnouncementReach();

  const stats = useMemo(
    () => ({
      unread: items.filter((n) => !n.read).length,
      action: items.filter((n) => n.needsAction).length,
      urgent: items.filter((n) => n.severity === "critical").length,
    }),
    [items],
  );

  const modules = useMemo(() => {
    const c = {};
    items.forEach((n) => {
      c[n.module] = (c[n.module] || 0) + 1;
    });
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (n) =>
        (filter === "all" ||
          (filter === "unread" && !n.read) ||
          (filter === "action" && n.needsAction) ||
          (filter === "urgent" && n.severity === "critical")) &&
        (module === "all" || n.module === module) &&
        (!t || `${n.title} ${n.message}`.toLowerCase().includes(t)),
    );
  }, [items, filter, module, q]);

  const counts = {
    all: items.length,
    unread: stats.unread,
    action: stats.action,
  };
  const open = (n) => {
    markRead([n.id]);
    if (n.path) navigate(n.path);
  };
  const markAll = () => {
    const ids = shown.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    markRead(ids);
    toast(
      `${ids.length} notification${ids.length === 1 ? "" : "s"} marked as read`,
    );
  };
  const closeComposer = useCallback(() => setComposer({ open: false, prefill: null, editing: null }), []);
  const send = async (data) => {
    try {
      if (composer.editing) {
        await updateAnnouncement(composer.editing.id, data);
        closeComposer();
        toast("Scheduled announcement updated");
        return;
      }
      const a = await sendAnnouncement(data);
      closeComposer();
      setParams({ tab: "announcements" }, { replace: true });
      toast(
        data.scheduleAt
          ? "Announcement scheduled"
          : `Announcement sent to ${a.recipients} ${a.recipients === 1 ? "person" : "people"} (${AUDIENCE_LABEL[data.audience].toLowerCase()})`,
      );
    } catch (e) {
      // say which field is wrong (for example a scheduled time that has already passed)
      const first = e.errors && Object.values(e.errors).flat()[0];
      toast(first ? `${e.message} ${first}` : e.message || "The announcement could not be sent.");
    }
  };
  const goTab = (k) =>
    setParams(k === "inbox" ? {} : { tab: k }, { replace: true });

  return (
    <div className="au-page">
      <section className="ao-money" aria-label="Notification summary">
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => {
            goTab("inbox");
            setFilter("unread");
          }}
        >
          <span className="ao-money-icon info">
            <BellRing size={18} />
          </span>
          <div>
            <small>Unread</small>
            <strong>{stats.unread}</strong>
            <em>
              {stats.unread
                ? "Since you last checked"
                : "You are all caught up"}
            </em>
          </div>
        </button>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => {
            goTab("inbox");
            setFilter("action");
          }}
        >
          <span className="ao-money-icon wait">
            <AlertTriangle size={18} />
          </span>
          <div>
            <small>Needs action</small>
            <strong>{stats.action}</strong>
            <em>Across all admin modules</em>
          </div>
        </button>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => {
            goTab("inbox");
            setFilter("urgent");
          }}
        >
          <span className="ao-money-icon bad">
            <AlertOctagon size={18} />
          </span>
          <div>
            <small>Urgent</small>
            <strong>{stats.urgent}</strong>
            <em>Refunds, overdue pickups, reports</em>
          </div>
        </button>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => goTab("announcements")}
        >
          <span className="ao-money-icon good">
            <Megaphone size={18} />
          </span>
          <div>
            <small>Announcements sent</small>
            <strong>{announcements.length}</strong>
            <em>To users and ReMakers</em>
          </div>
        </button>
      </section>

      <div className="nt-headrow">
        <div
          className="aup-tabs"
          role="tablist"
          aria-label="Notification sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "inbox"}
            className={tab === "inbox" ? "active" : ""}
            onClick={() => goTab("inbox")}
          >
            <Inbox size={15} /> Inbox{" "}
            {stats.unread > 0 && (
              <span className="aup-tab-count">{stats.unread}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "announcements"}
            className={tab === "announcements" ? "active" : ""}
            onClick={() => goTab("announcements")}
          >
            <Megaphone size={15} /> Announcements
          </button>
        </div>
        <button
          type="button"
          className="ad-btn ad-btn-primary"
          onClick={() => setComposer({ open: true, prefill: null, editing: null })}
        >
          <Megaphone size={15} /> Send announcement
        </button>
      </div>

      {tab === "inbox" && (
        <section className="au-panel">
          <div className="nt-toolbar">
            <div className="rw-chips" role="tablist" aria-label="Filter">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={filter === f.key ? "on" : ""}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <em>{counts[f.key]}</em>
                </button>
              ))}
            </div>
            <label className="au-search">
              <Search size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search notifications"
                aria-label="Search notifications"
              />
            </label>
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              onClick={markAll}
              disabled={!shown.some((n) => !n.read)}
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          </div>
          <div className="nt-modules" aria-label="Module">
            <button
              type="button"
              className={module === "all" ? "on" : ""}
              onClick={() => setModule("all")}
            >
              All modules
            </button>
            {Object.keys(MODULES)
              .filter((m) => modules[m])
              .map((m) => (
                <button
                  key={m}
                  type="button"
                  className={module === m ? "on" : ""}
                  onClick={() => setModule(m)}
                >
                  {MODULES[m].label} <em>{modules[m]}</em>
                </button>
              ))}
          </div>

          {shown.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title={
                filter === "all" && !q
                  ? "Nothing here"
                  : "No notifications match"
              }
              text={
                filter === "unread"
                  ? "You have read everything. Nice work."
                  : filter === "urgent"
                    ? "Nothing urgent right now."
                    : "Try another filter or search."
              }
            />
          ) : (
            <ul className="nt-list">
              {shown.map((n) => {
                const S = SEVERITY[n.severity];
                const Icon = S.icon;
                return (
                  <li
                    key={n.id}
                    className={`nt-item sev-${n.severity} ${n.read ? "" : "unread"}`}
                  >
                    <span className="nt-ico">
                      <Icon size={18} />
                    </span>
                    <div
                      className="nt-body"
                      onClick={() => open(n)}
                      role={n.path ? "button" : undefined}
                      tabIndex={n.path ? 0 : undefined}
                      onKeyDown={(e) => e.key === "Enter" && open(n)}
                    >
                      <div className="nt-line">
                        <strong>{n.title}</strong>
                        {!n.read && (
                          <i className="nt-dot" aria-label="Unread" />
                        )}
                      </div>
                      <p>{n.message}</p>
                      <div className="nt-meta">
                        <span className="nt-mod">
                          {MODULES[n.module].label}
                        </span>
                        <span className={`nt-sev sev-${n.severity}`}>
                          {S.label}
                        </span>
                        {n.needsAction && (
                          <span className="nt-need">Needs action</span>
                        )}
                        <span className="nt-time">
                          <Clock size={12} /> {timeAgo(n.at)}
                        </span>
                      </div>
                    </div>
                    <div className="nt-actions">
                      {n.path && n.actionLabel && (
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost nt-open"
                          onClick={() => open(n)}
                        >
                          {n.actionLabel} <ArrowRight size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="nt-icon-btn"
                        title={n.read ? "Mark as unread" : "Mark as read"}
                        aria-label={n.read ? "Mark as unread" : "Mark as read"}
                        onClick={() =>
                          n.read ? markUnread(n.id) : markRead([n.id])
                        }
                      >
                        {n.read ? <Mail size={15} /> : <MailOpen size={15} />}
                      </button>
                      <button
                        type="button"
                        className="nt-icon-btn"
                        title="Dismiss"
                        aria-label="Dismiss"
                        onClick={() => {
                          dismiss([n.id]);
                          toast("Notification dismissed");
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="nt-foot">
            These alerts update by themselves. Once an item is dealt with in its
            module, the alert goes away.
          </p>
        </section>
      )}

      {tab === "announcements" && (
        <AnnouncementsPanel
          announcements={announcements}
          canEdit={canEdit}
          toast={toast}
          onCompose={(from) =>
            setComposer({
              open: true,
              editing: null,
              prefill: from
                ? { title: from.title, message: from.message, audience: from.audience, type: from.type, link: from.link }
                : null,
            })
          }
          onEdit={(a) => setComposer({ open: true, editing: a, prefill: null })}
        />
      )}

      <AnnounceModal
        open={composer.open}
        prefill={composer.prefill}
        editing={composer.editing}
        reach={reach}
        onSend={send}
        onClose={closeComposer}
      />
      {toastNode}
    </div>
  );
}
