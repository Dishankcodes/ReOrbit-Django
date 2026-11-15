import React from "react";

import {
  ROLE_LABELS,
  lastMessage,
  listTime,
  prefetchConversation,
} from "../messagingStore";
import Avatar from "./Avatar";

function Skeleton({ p }) {
  return (
    <ul className={`${p}-items`} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <li key={index} className="msgx-skel-item">
          <span className="msgx-skel msgx-skel-avatar" />
          <span className="msgx-skel-lines">
            <span className="msgx-skel" style={{ width: "55%" }} />
            <span className="msgx-skel" style={{ width: "35%" }} />
            <span className="msgx-skel" style={{ width: "80%" }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* The sidebar: search, filter chips and one row per chat */
export default function ConversationList({
  side,
  conversations,
  activeId,
  onSelect,
  filter,
  onFilter,
  query,
  onQuery,
  counts = {},
  loadingList = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}) {
  const { p, chips, kinds } = side;
  const filtered = Boolean(query.trim()) || filter !== "all";

  return (
    <aside className={`${p}-list`}>
      <div className={`${p}-list-head`}>
        <h2 className="sr-only">Messages</h2>
        <label className={side.search}>
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search people or messages"
          />
        </label>

        <div className={chips} role="group" aria-label="Filter conversations">
          {kinds.map((item) => (
            <button
              type="button"
              key={item.key}
              className={filter === item.key ? "active" : ""}
              aria-pressed={filter === item.key}
              onClick={() => onFilter(item.key)}
            >
              {item.label} <span>{counts[item.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loadingList && conversations.length === 0 ? (
        <Skeleton p={p} />
      ) : (
        <ul className={`${p}-items`}>
          {conversations.length === 0 && (
            <li className={`${p}-none`}>
              {filtered
                ? "No conversations match this filter or search."
                : "No conversations yet. Start one from a product or a profile."}
            </li>
          )}

          {conversations.map((conversation) => {
            const last = lastMessage(conversation);
            const hasPhoto = Boolean(last.image || last.has_image);
            const hasMessage = Boolean(last.text || hasPhoto);
            const preview = !hasMessage
              ? "No messages yet"
              : hasPhoto && !last.text
                ? "Sent a photo"
                : last.text;
            const role = ROLE_LABELS[conversation.kind] || "User";
            const active = activeId === conversation.id;
            const warm = () => prefetchConversation(conversation.id);

            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`${active ? "active" : ""} ${conversation.unread ? "unread" : ""}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(conversation.id)}
                  onMouseEnter={warm}
                  onFocus={warm}
                  onTouchStart={warm}
                >
                  <span className={`${p}-avatar`}>
                    <Avatar src={conversation.image} name={conversation.name} />
                  </span>

                  <span className={`${p}-item-text`}>
                    <span className={`${p}-item-top`}>
                      <strong>{conversation.name}</strong>
                      {hasMessage && <time dateTime={last.at}>{listTime(last.at)}</time>}
                    </span>
                    <span className={`${p}-item-sub`}>
                      {role}
                      {conversation.subtitle ? ` · ${conversation.subtitle}` : ""}
                    </span>
                    <span className={`${p}-item-preview`}>
                      {hasMessage && last.from === "me" && <b>You: </b>}
                      {preview}
                    </span>
                  </span>

                  {conversation.unread > 0 && (
                    <i className={`${p}-badge`}>{conversation.unread}</i>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          className={`${p}-load-more`}
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Load more conversations"}
        </button>
      )}
    </aside>
  );
}
