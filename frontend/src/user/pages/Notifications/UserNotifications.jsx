import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Gift,
  HandHeart,
  LifeBuoy,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Megaphone,
  MessageCircle,
} from "lucide-react";

import {
  NOTIFICATION_TYPES,
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
  support: LifeBuoy,
  message: MessageCircle,
  reward: Star,
  announcement: Megaphone,
};

export default function UserNotifications() {
  const navigate = useNavigate();
  const { items, unread } = useNotifications();
  const [type, setType] = useState("all");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const rows = useMemo(
    () =>
      items
        .filter((n) => (type === "all" ? true : n.type === type))
        .filter((n) => (onlyUnread ? !n.read : true)),
    [items, type, onlyUnread],
  );

  const open = (n) => {
    markRead(n.id);
    navigate(n.to);
  };

  return (
    <div className="dn nt">
      <header className="unt-head">
        <div>
          <p className="dn-muted">
            {unread > 0 ? `${unread} unread · ` : "You're all caught up · "}last
            14 days
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
            className="dn-btn"
            disabled={unread === 0}
            onClick={() => markAllRead(items.map((n) => n.id))}
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        </div>
      </header>

      <div className="unt-tools">
        <div className="unt-chips" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={type === "all"}
            className={type === "all" ? "on" : ""}
            onClick={() => setType("all")}
          >
            All <em>{items.length}</em>
          </button>
          {Object.entries(NOTIFICATION_TYPES).map(([id, t]) => (
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

      {rows.length === 0 ? (
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
        <div className="dn-card unt-list">
          {rows.map((n) => {
            const Icon = ICON[n.type] || Gift;
            return (
              <button
                key={n.id}
                type="button"
                className={`unt-item ${n.read ? "" : "unread"}`}
                onClick={() => open(n)}
              >
                <span className="unt-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                </div>
                <time title={formatDateTime(n.at)}>{relativeDay(n.at)}</time>
                {!n.read && <i className="unt-dot" aria-label="Unread" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
