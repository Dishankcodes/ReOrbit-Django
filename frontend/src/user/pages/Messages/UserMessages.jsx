import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  lastMessage,
  markConversationRead,
  useConversation,
  useConversations,
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
  const conversations = useConversations();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const fallback = !id
    ? conversations.find((item) =>
        adminMode ? item.kind === "support" : item.kind === "reorbit",
      ) || conversations[0]
    : null;
  const loaded = useConversation(id || fallback?.id);
  const active = conversations.find((item) => item.id === id) || null;
  const unknown = id && !active && conversations.length > 0;

  /* opening a conversation reads it (once, when you open it) */
  useEffect(() => {
    const activeId = id || fallback?.id;
    if (activeId) markConversationRead(activeId);
  }, [id, fallback?.id]);

  const counts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((item) => item.unread > 0).length,
      customer: conversations.filter((item) => item.kind === "customer").length,
      support: conversations.filter((item) => item.kind === "support").length,
      seller: conversations.filter((item) => item.kind === "seller").length,
      buyer: conversations.filter((item) => item.kind === "buyer").length,
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

  const basePath = adminMode ? "/admin-messages" : "/user-messages";
  const open = (nextId) => navigate(`${basePath}/${nextId}`);

  /* On a wide screen the first conversation opens by default */
  const shown = active || fallback;
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
          <p>It may have been removed, or the link is out of date.</p>
          <Link to={basePath} className="umsg-btn primary">
            Back to messages
          </Link>
        </div>
      ) : shown ? (
        <ChatThreadComponent
          conversation={detailed}
          adminMode={adminMode}
          onBack={() => navigate(basePath)}
        />
      ) : (
        <div className="umsg-empty">
          <h3>No messages yet</h3>
          <p>
            Ask a seller about an item, talk to a ReMaker about a custom piece,
            or write to ReOrbit. Your chats show up here.
          </p>
          <Link to="/user-marketplace" className="umsg-btn primary">
            Browse the marketplace
          </Link>
        </div>
      )}
    </section>
  );
}
