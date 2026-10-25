import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  lastMessage,
  markConversationRead,
  useConversations,
} from "../../data/messagesStore";

import ChatThread from "./components/ChatThread";
import ConversationList from "./components/ConversationList";

import "../../css/ReMakerUi.css";
import "./MessagesPage.css";

export default function ReMakerMessages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const conversations = useConversations();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const active = conversations.find((item) => item.id === id) || null;
  const unknown = id && !active;

  /* opening a conversation reads it (once, when you open it) */
  useEffect(() => {
    if (id) markConversationRead(id);
  }, [id]);

  const counts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((item) => item.unread > 0).length,
      customer: conversations.filter((item) => item.kind === "customer").length,
      remaker: conversations.filter((item) => item.kind === "remaker").length,
      reorbit: conversations.filter((item) => item.kind === "reorbit").length,
    }),
    [conversations],
  );

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();

    return conversations.filter((item) => {
      if (filter === "unread" && item.unread === 0) return false;
      if (filter !== "all" && filter !== "unread" && item.kind !== filter)
        return false;
      if (!text) return true;

      return `${item.name} ${item.subtitle} ${lastMessage(item).text}`
        .toLowerCase()
        .includes(text);
    });
  }, [conversations, filter, query]);

  const open = (nextId) => navigate(`/remaker-messages/${nextId}`);

  /* On a wide screen the first conversation opens by default */
  const fallback = !id && conversations[0] ? conversations[0] : null;
  const shown = active || fallback;

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
      />

      {unknown ? (
        <div className="msg-empty">
          <h3>We could not find that conversation</h3>
          <p>It may have been removed, or the link is out of date.</p>
          <Link to="/remaker-messages" className="rk-btn primary">
            Back to messages
          </Link>
        </div>
      ) : shown ? (
        <ChatThread
          conversation={shown}
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
