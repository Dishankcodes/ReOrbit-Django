import React from "react";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { KINDS, lastMessage, listTime } from "../../../data/messagesStore";

export default function ConversationList({ conversations, activeId, onSelect, filter, onFilter, query, onQuery, counts }) {
  return (
    <aside className="msg-list">
      <div className="msg-list-head">
        <h2>Messages</h2>
        <label className="msg-search">
          <span className="sr-only">Search conversations</span>
          <input type="text" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search people or messages" />
        </label>

        <div className="rk-chips" role="group" aria-label="Filter conversations">
          {KINDS.map((item) => (
            <button type="button" key={item.key} className={filter === item.key ? "active" : ""} aria-pressed={filter === item.key} onClick={() => onFilter(item.key)}>
              {item.label} <span>{counts[item.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="msg-items">
        {conversations.length === 0 && <li className="msg-none">No conversations match.</li>}

        {conversations.map((conversation) => {
          const last = lastMessage(conversation);
          const preview = last.image && !last.text ? "Sent a photo" : last.text;

          return (
            <li key={conversation.id}>
              <button type="button" className={`${activeId === conversation.id ? "active" : ""} ${conversation.unread ? "unread" : ""}`} onClick={() => onSelect(conversation.id)}>
                <span className="msg-avatar">
                  <Avatar src={conversation.image} name={conversation.name} />
                </span>

                <span className="msg-item-text">
                  <span className="msg-item-top">
                    <strong>{conversation.name}</strong>
                    <time dateTime={last.at}>{listTime(last.at)}</time>
                  </span>
                  <span className="msg-item-sub">{conversation.subtitle}</span>
                  <span className="msg-item-preview">
                    {last.from === "me" && <b>You: </b>}
                    {preview}
                  </span>
                </span>

                {conversation.unread > 0 && <i className="msg-badge">{conversation.unread}</i>}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
