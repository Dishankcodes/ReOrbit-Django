import React from "react";

import { categoryLabel, timeLabel } from "../../../data/notificationsStore";

/* One notification. Click the row (or its button) to open what it is about. */
export default function NotificationItem({
  item,
  selecting,
  selected,
  onSelect,
  onOpen,
  onToggleRead,
  onDelete,
}) {
  return (
    <article
      className={`ntf-item ${item.read ? "read" : "unread"} ${selected ? "selected" : ""}`}
    >
      {selecting && (
        <label className="ntf-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(item.id)}
          />
          <span aria-hidden="true" />
          <em className="sr-only">Select {item.title}</em>
        </label>
      )}

      <button
        type="button"
        className="ntf-main"
        onClick={() => (selecting ? onSelect(item.id) : onOpen(item))}
      >
        <span className={`ntf-media ${item.category}`}>
          {item.image ? (
            <img src={item.image} alt="" loading="lazy" />
          ) : (
            <b>{categoryLabel(item.category).charAt(0)}</b>
          )}
          {!item.read && <i className="ntf-dot" aria-label="Unread" />}
        </span>

        <span className="ntf-body">
          <strong>{item.title}</strong>
          <span className="ntf-text">{item.text}</span>

          <span className="ntf-meta">
            <em className={`ntf-chip ${item.category}`}>
              {categoryLabel(item.category)}
            </em>
            <time dateTime={item.createdAt}>{timeLabel(item.createdAt)}</time>
          </span>
        </span>
      </button>

      <div className="ntf-actions">
        {item.link && !selecting && (
          <button
            type="button"
            className="ntf-cta"
            onClick={() => onOpen(item)}
          >
            {item.link.label}
          </button>
        )}

        {!selecting && (
          <div className="ntf-tools">
            <button type="button" onClick={() => onToggleRead(item)}>
              {item.read ? "Mark unread" : "Mark read"}
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => onDelete(item)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
