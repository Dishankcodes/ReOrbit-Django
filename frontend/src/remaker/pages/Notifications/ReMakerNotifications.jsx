import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  CATEGORIES,
  groupByDay,
  markAllRead,
  markRead,
  markUnread,
  removeNotifications,
  restoreNotifications,
  useNotifications,
} from "../../data/notificationsStore";
import { useNotificationPrefs } from "../../data/settingsStore";

import NotificationFilters from "./components/NotificationFilters";
import NotificationItem from "./components/NotificationItem";
import NotificationSide from "./components/NotificationSide";

import "./NotificationsPage.css";

const PAGE_SIZE = 12;

export default function ReMakerNotifications() {
  const navigate = useNavigate();
  const all = useNotifications();
  const prefs = useNotificationPrefs();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState(null); /* { text, undo } */
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (text, undo = null) => {
    clearTimeout(timer.current);
    setToast({ text, undo });
    timer.current = setTimeout(() => setToast(null), 6000);
  };

  const unread = all.filter((item) => !item.read).length;

  const counts = useMemo(() => {
    const result = { all: all.length, unread };
    CATEGORIES.forEach((category) => {
      result[category.key] = all.filter(
        (item) => item.category === category.key,
      ).length;
    });
    return result;
  }, [all, unread]);

  const unreadByCategory = useMemo(() => {
    const result = {};
    all.forEach((item) => {
      if (!item.read) result[item.category] = (result[item.category] || 0) + 1;
    });
    return result;
  }, [all]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();

    return all.filter((item) => {
      if (filter === "unread" && item.read) return false;
      if (filter !== "all" && filter !== "unread" && item.category !== filter)
        return false;
      if (!text) return true;

      return `${item.title} ${item.text}`.toLowerCase().includes(text);
    });
  }, [all, filter, query]);

  const page = visible.slice(0, shown);
  const groups = useMemo(() => groupByDay(page), [page]);

  const pickFilter = (key) => {
    setFilter(key);
    setShown(PAGE_SIZE);
    setSelected([]);
  };

  /* ----- row actions ----- */

  const open = (item) => {
    markRead(item.id);
    if (item.link) navigate(item.link.to);
  };

  const toggleRead = (item) =>
    item.read ? markUnread(item.id) : markRead(item.id);

  const remove = (item) => {
    const removed = removeNotifications(item.id);
    flash("Notification deleted.", () => restoreNotifications(removed));
  };

  /* ----- selection ----- */

  const toggleSelecting = () => {
    setSelecting((value) => !value);
    setSelected([]);
  };

  const selectOne = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const allVisibleSelected =
    page.length > 0 && page.every((item) => selected.includes(item.id));

  const toggleAllVisible = () =>
    setSelected(allVisibleSelected ? [] : page.map((item) => item.id));

  const bulkRead = () => {
    markRead(selected);
    flash(`Marked ${selected.length} as read.`);
    setSelected([]);
  };

  const bulkUnread = () => {
    markUnread(selected);
    flash(`Marked ${selected.length} as unread.`);
    setSelected([]);
  };

  const bulkDelete = () => {
    const removed = removeNotifications(selected);
    flash(
      `Deleted ${removed.length} ${removed.length === 1 ? "notification" : "notifications"}.`,
      () => restoreNotifications(removed),
    );
    setSelected([]);
  };

  const readAll = () => {
    const category = filter === "all" || filter === "unread" ? "all" : filter;
    markAllRead(category);
    flash(
      category === "all"
        ? "All notifications marked as read."
        : "Marked this type as read.",
    );
  };

  const filtersOn = filter !== "all" || query;

  return (
    <section className="ntf">
      {/* ================= HEADER ================= */}
      <header className="ntf-top">
        <div>
          <h2>Notifications</h2>
          <p>
            {unread > 0
              ? `You have ${unread} unread ${unread === 1 ? "notification" : "notifications"}.`
              : "You are all caught up. Nothing new right now."}
          </p>
        </div>

        <div className="ntf-top-actions">
          <button
            type="button"
            className="ntf-btn ghost"
            onClick={toggleSelecting}
          >
            {selecting ? "Done" : "Select"}
          </button>
          <button
            type="button"
            className="ntf-btn ghost"
            onClick={readAll}
            disabled={unread === 0}
          >
            Mark all as read
          </button>
          <Link
            to="/remaker-settings?section=notifications"
            className="ntf-btn primary"
          >
            Notification settings
          </Link>
        </div>
      </header>

      <div className="ntf-layout">
        <div className="ntf-main-col">
          <NotificationFilters
            filter={filter}
            onFilter={pickFilter}
            counts={counts}
          />

          <label className="ntf-search">
            <span className="sr-only">Search notifications</span>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder="Search your notifications"
            />
          </label>

          {/* bulk bar */}
          {selecting && (
            <div className="ntf-bulk" role="toolbar" aria-label="Bulk actions">
              <label className="ntf-bulk-all">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                />
                <span>
                  {selected.length
                    ? `${selected.length} selected`
                    : "Select all shown"}
                </span>
              </label>

              <div>
                <button
                  type="button"
                  onClick={bulkRead}
                  disabled={!selected.length}
                >
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={bulkUnread}
                  disabled={!selected.length}
                >
                  Mark unread
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={bulkDelete}
                  disabled={!selected.length}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* list */}
          {visible.length === 0 ? (
            <div className="ntf-empty">
              <div className="ntf-empty-art" aria-hidden="true">
                <img src="/images/portfolio/tara-console.jpg" alt="" />
                <img src="/images/portfolio/arjun-lamp.jpg" alt="" />
              </div>
              <h3>
                {all.length === 0
                  ? "No notifications yet"
                  : filter === "unread" && !query
                    ? "You are all caught up"
                    : filtersOn
                      ? "Nothing matches"
                      : "All clear"}
              </h3>
              <p>
                {all.length === 0
                  ? "Orders, reviews, followers and payouts will show up here."
                  : filter === "unread" && !query
                    ? "You have read everything. New alerts will appear here."
                    : filtersOn
                      ? "Try another type, or clear your search."
                      : "Nothing new to read."}
              </p>
              {filtersOn && (
                <button
                  type="button"
                  className="ntf-btn ghost"
                  onClick={() => {
                    pickFilter("all");
                    setQuery("");
                  }}
                >
                  Show everything
                </button>
              )}
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <section
                  className="ntf-group"
                  key={group.key}
                  aria-label={group.label}
                >
                  <h3>{group.label}</h3>

                  <div className="ntf-list">
                    {group.items.map((item) => (
                      <NotificationItem
                        key={item.id}
                        item={item}
                        selecting={selecting}
                        selected={selected.includes(item.id)}
                        onSelect={selectOne}
                        onOpen={open}
                        onToggleRead={toggleRead}
                        onDelete={remove}
                      />
                    ))}
                  </div>
                </section>
              ))}

              <div className="ntf-more">
                <span>
                  Showing {Math.min(shown, visible.length)} of {visible.length}
                </span>
                {shown < visible.length && (
                  <button
                    type="button"
                    className="ntf-btn ghost"
                    onClick={() => setShown((value) => value + PAGE_SIZE)}
                  >
                    Show older notifications
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <NotificationSide
          unreadByCategory={unreadByCategory}
          prefs={prefs}
          onPick={pickFilter}
        />
      </div>

      {toast && (
        <div className="ntf-toast" role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
