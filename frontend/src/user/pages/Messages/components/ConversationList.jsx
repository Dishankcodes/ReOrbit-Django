import React from "react";

import { KINDS, lastMessage, listTime } from "../../../data/messagesStore";
import Avatar from "./Avatar";

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  filter,
  onFilter,
  query,
  onQuery,
  counts,
  kinds = KINDS,
  hasMore = false,
  loading = false,
  onLoadMore,
}) {
  return (
    <aside className="umsg-list">
      <div className="umsg-list-head">
        <h2 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>Messages</h2>
        <label className="umsg-search">
          <span className="sr-only">Search conversations</span>
          <input
            type="text"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search people or messages"
          />
        </label>

        <div
          className="umsg-chips"
          role="group"
          aria-label="Filter conversations"
        >
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

      <ul className="umsg-items">
        {conversations.length === 0 && (
          <li className="umsg-none">No conversations match your search.</li>
        )}

        {conversations.map((conversation) => {
          const last = lastMessage(conversation);
          const preview = last.image && !last.text ? "Sent a photo" : last.text;
          const roleLabel = ({
            seller: "Seller", buyer: "Buyer", customer: "Customer",
            remaker: "ReMaker", reorbit: "ReOrbit Support", support: "Admin / Support",
          })[conversation.kind] || "Customer";

          return (
            <li key={conversation.id}>
              <button
                type="button"
                className={`${activeId === conversation.id ? "active" : ""} ${conversation.unread ? "unread" : ""}`}
                onClick={() => onSelect(conversation.id)}
              >
                <span className="umsg-avatar">
                  <Avatar src={conversation.image} name={conversation.name} />
                </span>

                <span className="umsg-item-text">
                  <span className="umsg-item-top">
                    <strong>{conversation.name}</strong>
                    <time dateTime={last.at}>{listTime(last.at)}</time>
                  </span>
                  <span className="umsg-item-sub">
                    {roleLabel}{conversation.subtitle ? ` · ${conversation.subtitle}` : ""}
                  </span>
                  <span className="umsg-item-preview">
                    {last.from === "me" && <b>You: </b>}
                    {preview}
                  </span>
                </span>

                {conversation.unread > 0 && (
                  <i className="umsg-badge">{conversation.unread}</i>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="umsg-load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? "Loading…" : "Load more conversations"}
        </button>
      )}
    </aside>
  );
}
