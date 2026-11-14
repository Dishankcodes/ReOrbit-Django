import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  loadMoreConversations,
  markConversationRead,
  refreshMessages,
  useConversationCounts,
  useConversation,
  useConversations,
  useMessageStatus,
} from "../../data/messagesStore";

import ChatThread from "./components/ChatThread";
import ConversationList from "./components/ConversationList";

import "../../../remaker/css/ReMakerUi.css";
import "./UserMessages.css";

export default function UserMessages({
  adminMode = false,
  ChatThreadComponent = ChatThread,
  ConversationListComponent = ConversationList,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const conversations = useConversations(query, filter);
  const counts = useConversationCounts();
  const messageStatus = useMessageStatus(id || "");

  const loaded = useConversation(id || null);
  const active = conversations.find((item) => item.id === id) || loaded || null;
  const unknown = Boolean(id && !active && !messageStatus.loading);

  /* Only mark a conversation read when the user actually selects it. */
  useEffect(() => {
    if (id) markConversationRead(id).catch(() => {});
  }, [id]);
  const visible = conversations;

  const basePath = adminMode ? "/admin-messages" : "/user-messages";
  const open = (nextId) => navigate(`${basePath}/${nextId}`);

  /* Keep the right pane unselected until the user chooses a conversation. */
  const shown = active;
  const detailed = loaded?.id === shown?.id ? loaded : shown;

  return (
    <section
      className={`um-chat umsg ${adminMode ? "admin-messaging" : ""} ${id && active ? "chat-open" : ""}`}
    >
      <ConversationListComponent
        conversations={visible}
        activeId={shown?.id}
        onSelect={open}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        counts={counts}
        hasMore={messageStatus.hasMore}
        loading={messageStatus.loadingMore}
        onLoadMore={() => loadMoreConversations().catch(() => {})}
        kinds={
          adminMode
            ? [
                { key: "all", label: "All" },
                { key: "unread", label: "Unread" },
                { key: "customer", label: "Customers" },
                { key: "remaker", label: "ReMakers" },
                { key: "support", label: "Support" },
              ]
            : undefined
        }
      />

      {unknown ? (
        <div className="umsg-empty">
          <h3>We could not find that conversation</h3>
          <p>{messageStatus.error || "It may have been removed, or the link is out of date."}</p>
          <Link to={basePath} className="umsg-btn primary">
            Back to messages
          </Link>
        </div>
      ) : shown ? (
        <ChatThreadComponent
          conversation={detailed}
          adminMode={adminMode}
          syncError={messageStatus.error}
          onRetrySync={refreshMessages}
          onBack={() => navigate(basePath)}
        />
      ) : (
        <div className="umsg-empty">
          <h3>Select a chat</h3>
          <p>Choose a conversation from the list to view messages and continue chatting.</p>
        </div>
      )}
    </section>
  );
}
