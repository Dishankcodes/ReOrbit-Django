import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { fileToDataUrl } from "../../../data/portfolioStore";
import {
  QUICK_REPLIES,
  clockLabel,
  dayLabel,
  loadOlderMessages,
  markConversationUnread,
  sendMessage,
} from "../../../data/messagesStore";

const KIND_LABEL = {
  customer: "Customer",
  remaker: "ReMaker",
  reorbit: "ReOrbit",
};

/* One open conversation: header, order context, messages and the composer */
export default function ChatThread({ conversation, onBack, syncError = "", onRetrySync }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const scrollRestore = useRef(null);

  /* new conversation: clear the draft and jump to the latest message */
  useEffect(() => {
    setText("");
    setImage("");
    setError("");
    setShowQuick(false);
  }, [conversation.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.id]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (scrollRestore.current) {
      const { height, top } = scrollRestore.current;
      body.scrollTop = body.scrollHeight - height + top;
      scrollRestore.current = null;
    } else {
      body.scrollTop = body.scrollHeight;
    }
  }, [conversation.messages.length]);

  /* group messages by day */
  const days = useMemo(() => {
    const groups = [];

    conversation.messages.forEach((message) => {
      const label = dayLabel(message.at);
      const last = groups[groups.length - 1];

      if (last && last.label === label) last.messages.push(message);
      else groups.push({ label, messages: [message] });
    });

    return groups;
  }, [conversation.messages]);

  const attach = async (file) => {
    if (!file) return;

    setError("");

    try {
      setImage(await fileToDataUrl(file, 1000, 0.75));
    } catch (problem) {
      setError(problem.message);
    }
  };

  const canSend = text.trim().length > 0 || image;

  const send = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(conversation.id, { text, image });
      setText("");
      setImage("");
      setShowQuick(false);
    } catch (problem) {
      setError(problem.message || "Message could not be sent. Your draft is still here.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !sending) {
      event.preventDefault();
      void send();
    }
  };

  const loadOlder = async (event) => {
    const body = event.currentTarget;
    if (body.scrollTop > 12 || !conversation.has_more_messages || loadingOlder) return;
    setLoadingOlder(true);
    scrollRestore.current = { height: body.scrollHeight, top: body.scrollTop };
    try {
      await loadOlderMessages(conversation.id);
    } catch (problem) {
      scrollRestore.current = null;
      setError(problem.message || "Older messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const quick = QUICK_REPLIES[conversation.kind] || [];

  return (
    <section
      className="msg-thread"
      aria-label={`Conversation with ${conversation.name}`}
    >
      <header className="msg-thread-head">
        <button type="button" className="msg-back" onClick={onBack}>
          ← Back
        </button>

        <span className="msg-avatar big">
          <Avatar src={conversation.image} name={conversation.name} />
        </span>

        <div>
          <h3>{conversation.name}</h3>
          <small>
            <em className={`msg-kind ${conversation.kind}`}>
              {KIND_LABEL[conversation.kind]}
            </em>
            {conversation.subtitle}
          </small>
        </div>

        <div className="msg-thread-actions">
          {conversation.customerId && (
            <Link
              to={`/remaker-customers/${conversation.customerId}`}
              className="rk-btn ghost small"
            >
              View profile
            </Link>
          )}
          <button
            type="button"
            className="rk-btn ghost small"
            onClick={() => {
              markConversationUnread(conversation.id)
                .then(onBack)
                .catch((problem) => setError(problem.message || "Could not update unread status."));
            }}
          >
            Mark unread
          </button>
        </div>
      </header>

      {conversation.context && (
        <Link
          to={(conversation.context.to || "")
            .replace(/^\/user-marketplace/, "/remaker-marketplace")
            .replace(/^\/user-orders/, "/remaker-orders")}
          className="msg-context"
        >
          {conversation.context.image && (
            <img src={conversation.context.image} alt="" />
          )}
          <span>
            <small>About</small>
            <strong>{conversation.context.label}</strong>
          </span>
          <b>Open →</b>
        </Link>
      )}

      <div ref={bodyRef} className="msg-body" role="log" aria-live="polite" onScroll={loadOlder}>
        {loadingOlder && <p className="msg-history-loading">Loading earlier messages…</p>}
        {days.map((group) => (
          <div key={group.label}>
            <p className="msg-day">
              <span>{group.label}</span>
            </p>

            {group.messages.map((message) =>
              message.from === "system" ? (
                <p className="msg-system" key={message.id}>
                  {message.text}
                </p>
              ) : (
                <div className={`msg-row ${message.from}`} key={message.id}>
                  <div className="msg-bubble">
                    {message.image && (
                      <img src={message.image} alt="Shared in chat" />
                    )}
                    {message.text && <p>{message.text}</p>}
                    <time dateTime={message.at}>{clockLabel(message.at)}</time>
                  </div>
                </div>
              ),
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="msg-composer">
        {showQuick && (
          <div className="msg-quick" role="group" aria-label="Quick replies">
            {quick.map((reply) => (
              <button
                type="button"
                key={reply}
                onClick={() => {
                  setText(reply);
                  setShowQuick(false);
                }}
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {image && (
          <div className="msg-preview">
            <img src={image} alt="Photo to send" />
            <button type="button" onClick={() => setImage("")}>
              Remove
            </button>
          </div>
        )}

        {syncError && (
          <p className="rk-error" role="alert">
            {syncError}{" "}
            <button type="button" onClick={() => onRetrySync?.().catch(() => {})}>Retry sync</button>
          </p>
        )}
        {error && <p className="rk-error" role="alert">{error}</p>}

        <div className="msg-composer-row">
          <div className="msg-composer-tools">
            <button
              type="button"
              className="rk-textbtn"
              onClick={() => fileRef.current?.click()}
            >
              Photo
            </button>
            <button
              type="button"
              className="rk-textbtn"
              onClick={() => setShowQuick((value) => !value)}
              aria-expanded={showQuick}
            >
              Quick replies
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              attach(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <label className="sr-only" htmlFor="msg-input">
            Write a message
          </label>
          <textarea
            id="msg-input"
            rows={1}
            value={text}
            maxLength={1000}
            disabled={sending}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message. Press Enter to send."
          />

          <button
            type="button"
            className="rk-btn primary"
            onClick={send}
            disabled={!canSend || sending}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
