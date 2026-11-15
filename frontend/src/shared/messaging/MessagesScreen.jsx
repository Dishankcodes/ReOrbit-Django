import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  loadMoreConversations,
  markConversationRead,
  refreshMessages,
  useConversationCounts,
  useConversationState,
  useConversations,
  useMessageStatus,
} from "../messagingStore";
import ChatThread from "./ChatThread";
import ConversationList from "./ConversationList";
import { SIDES } from "./sides";
import "./messaging.css";

/* The whole messages page. User, ReMaker and Admin all render this, so they
   behave the same: the same store, the same filters, the same empty states. */
export default function MessagesScreen({ sideName }) {
  const side = SIDES[sideName];
  const { p } = side;
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const conversations = useConversations(query, filter);
  const counts = useConversationCounts();
  const status = useMessageStatus(id || "");
  const { conversation, status: threadStatus, error: threadError, retry } = useConversationState(id || null);

  /* Mark it read once its messages are on screen, and only while the tab is visible. */
  const unread = Number(conversation?.unread || 0);
  const ready = threadStatus === "ready";
  useEffect(() => {
    if (id && ready && unread > 0 && document.visibilityState === "visible") {
      markConversationRead(id).catch(() => {});
    }
  }, [id, ready, unread]);

  const open = (nextId) => navigate(`${side.basePath}/${nextId}`);
  const back = () => navigate(side.basePath);

  let pane;
  if (!id) {
    pane = (
      <div className={`${p}-empty msgx-empty`}>
        <h3>Select a chat</h3>
        <p>{side.empty}</p>
      </div>
    );
  } else if (threadStatus === "missing") {
    pane = (
      <div className={`${p}-empty msgx-empty`}>
        <h3>We could not find that conversation</h3>
        <p>It may have been removed, or the link is out of date.</p>
        <Link to={side.basePath} className={`${side.btn} primary`}>
          Back to messages
        </Link>
      </div>
    );
  } else if (threadStatus === "error") {
    pane = (
      <div className={`${p}-empty msgx-empty`}>
        <h3>This chat could not be loaded</h3>
        <p>{threadError || "Check your connection and try again."}</p>
        <button type="button" className={`${side.btn} primary`} onClick={retry}>
          Try again
        </button>
      </div>
    );
  } else {
    pane = (
      <ChatThread
        key={id}
        conversation={conversation}
        side={side}
        sideName={sideName}
        loading={threadStatus === "loading"}
        syncError={threadStatus === "ready" ? status.error : ""}
        onRetrySync={refreshMessages}
        onBack={back}
      />
    );
  }

  return (
    <section className={`${side.sectionClass} ${id ? "chat-open" : ""}`}>
      <ConversationList
        side={side}
        conversations={conversations}
        activeId={id}
        onSelect={open}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        counts={counts}
        loadingList={status.listLoading}
        hasMore={status.hasMore}
        loadingMore={status.loadingMore}
        onLoadMore={() => loadMoreConversations().catch(() => {})}
      />
      {pane}
    </section>
  );
}
