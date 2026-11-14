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

import "../../css/ReMakerUi.css";
import "./MessagesPage.css";

export default function ReMakerMessages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const conversations = useConversations(query, filter);
  const counts = useConversationCounts();
  const messageStatus = useMessageStatus(id || "");

  const fallback = !id && conversations[0] ? conversations[0] : null;
  const loaded = useConversation(id || fallback?.id);
  const active = conversations.find((item) => item.id === id) || loaded || null;
  const unknown = id && !active && !messageStatus.loading;

  /* opening a conversation reads it (once, when you open it) */
  useEffect(() => {
    const activeId = id || fallback?.id;
    if (activeId) markConversationRead(activeId).catch(() => {});
  }, [id, fallback?.id]);
  const visible = conversations;

  const open = (nextId) => navigate(`/remaker-messages/${nextId}`);

  /* On a wide screen the first conversation opens by default */
  const shown = active || fallback;
  const detailed = loaded?.id === shown?.id ? loaded : shown;

  return (
    <section className={`rk msg ${id && active ? "chat-open" : ""}`}>
      <ConversationList
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
      />

      {unknown ? (
        <div className="msg-empty">
          <h3>We could not find that conversation</h3>
          <p>{messageStatus.error || "It may have been removed, or the link is out of date."}</p>
          <Link to="/remaker-messages" className="rk-btn primary">
            Back to messages
          </Link>
        </div>
      ) : shown ? (
        <ChatThread
          conversation={detailed}
          syncError={messageStatus.error}
          onRetrySync={refreshMessages}
          onBack={() => navigate("/remaker-messages")}
        />
      ) : (
        <div className="msg-empty">
          <div className="rk-empty-art" aria-hidden="true">
            <img src="/images/users/meera-iyer.jpg" alt="" />
            <img src="/images/users/kabir-verma.jpg" alt="" />
          </div>
          <h3>No messages yet</h3>
          <p>
            When customers or other ReMakers write to you, the chat shows up
            here.
          </p>
        </div>
      )}
    </section>
  );
}
