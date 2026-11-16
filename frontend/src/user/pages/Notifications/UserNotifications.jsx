import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Gift,
  HandHeart,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import {
  NOTIFICATION_TYPES,
  clearRead,
  dismiss,
  loadMoreNotifications,
  loadNotifications,
  markAllRead,
  markRead,
  useNotifications,
} from "../../data/notificationsStore";
import { formatDateTime, relativeDay } from "../../utils/format";
import EmptyState from "../../components/ui/EmptyState";

import "../../css/shared/ui-base.css";
import "../../css/notifications/UserNotifications.css";

const ICON = {
  order: ShoppingBag,
  donation: HandHeart,
  sell: Tag,
  earning: Wallet,
  support: LifeBuoy,
  message: MessageCircle,
  reward: Star,
  announcement: Megaphone,
};

/* Today, Yesterday, then older: the list reads like a timeline */
const dayGroup = (iso) => {
  const d = new Date(iso);
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : diff < 7 ? "This week" : "Earlier";
};

export default function UserNotifications() {
  const navigate = useNavigate();
  const { items, unread, loading, error, hasMore } = useNotifications();
  const [type, setType] = useState("all");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const rows = useMemo(
    () =>
      items
        .filter((n) => (type === "all" ? true : n.type === type))
        .filter((n) => (onlyUnread ? !n.read : true)),
    [items, type, onlyUnread],
  );
  const groups = useMemo(() => {
    const out = [];
    rows.forEach((n) => {
      const g = dayGroup(n.at);
      const last = out[out.length - 1];
      if (last && last.name === g) last.rows.push(n);
      else out.push({ name: g, rows: [n] });
    });
    return out;
  }, [rows]);
  const types = Object.entries(NOTIFICATION_TYPES).filter(([id]) =>
    items.some((n) => n.type === id),
  );
  const anyRead = items.some((n) => n.read);

  const open = (n) => {
    markRead(n.id);
    navigate(n.to);
  };

  return (
    <div className="dn nt">
      <header className="unt-head">
        <div>
          <p className="dn-muted">
            {unread > 0
              ? `${unread} unread`
              : "You're all caught up"}
          </p>
        </div>
        <div className="unt-head-actions">
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            onClick={() => navigate("/user-settings?section=notifications")}
          >
            <Settings size={15} /> Preferences
          </button>
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            disabled={!anyRead}
            onClick={clearRead}
          >
            <Trash2 size={15} /> Clear read
          </button>
          <button
            type="button"
            className="dn-btn"
            disabled={unread === 0}
            onClick={() =>
              markAllRead(items.filter((n) => !n.read).map((n) => n.id))
            }
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        </div>
      </header>

      <div className="unt-tools">
        <div className="unt-chips" role="tablist" aria-label="Notification type">
          <button
            type="button"
            role="tab"
            aria-selected={type === "all"}
            className={type === "all" ? "on" : ""}
            onClick={() => setType("all")}
          >
            All <em>{items.length}</em>
          </button>
          {types.map(([id, t]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={type === id}
              className={type === id ? "on" : ""}
              onClick={() => setType(id)}
            >
              {t.label} <em>{items.filter((n) => n.type === id).length}</em>
            </button>
          ))}
        </div>
        <label className="unt-check">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => setOnlyUnread(e.target.checked)}
          />{" "}
          Unread only
        </label>
      </div>

      {error && (
        <p className="unt-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => loadNotifications({ force: true })}>
            Try again
          </button>
        </p>
      )}

      {loading ? (
        <div className="dn-card unt-list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div className="unt-skel" key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          text={
            items.length
              ? "Nothing matches these filters."
              : "When something happens with your orders, donations or listings, you'll see it here."
          }
        />
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.name} className="unt-group">
              <h2>{g.name}</h2>
              <div className="dn-card unt-list">
                {g.rows.map((n) => {
                  const Icon = ICON[n.type] || Gift;
                  return (
                    <div
                      key={n.id}
                      className={`unt-row ${n.read ? "" : "unread"} sev-${n.severity || "info"}`}
                    >
                      <button
                        type="button"
                        className="unt-item"
                        onClick={() => open(n)}
                        aria-label={`${n.title}. Open`}
                      >
                        <span className="unt-icon">
                          <Icon size={18} />
                        </span>
                        <div>
                          <strong>{n.title}</strong>
                          <p>{n.message}</p>
                          <small>
                            {NOTIFICATION_TYPES[n.type].label} ·{" "}
                            <time title={formatDateTime(n.at)}>
                              {relativeDay(n.at)}
                            </time>
                          </small>
                        </div>
                        {!n.read && <i className="unt-dot" aria-label="Unread" />}
                        <ChevronRight size={16} className="unt-go" />
                      </button>
                      <button
                        type="button"
                        className="unt-x"
                        aria-label={`Dismiss: ${n.title}`}
                        title="Dismiss"
                        onClick={() => dismiss(n.id)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {hasMore && (
            <button
              type="button"
              className="dn-btn dn-btn--ghost unt-more"
              onClick={loadMoreNotifications}
            >
              Load older
            </button>
          )}
        </>
      )}
    </div>
  );
}
