import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { fileToDataUrl } from "../../../data/portfolioStore";
import {
  QUICK_REPLIES,
  clockLabel,
  dayLabel,
  markConversationUnread,
  sendMessage,
} from "../../../data/messagesStore";

const KIND_LABEL = {
  customer: "Customer",
  remaker: "ReMaker",
  reorbit: "ReOrbit",
};

/* One open conversation: header, order context, messages and the composer */
export default function ChatThread({ conversation, onBack }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  /* new conversation: clear the draft and jump to the latest message */
  useEffect(() => {
    setText("");
    setImage("");
    setError("");
    setShowQuick(false);
  }, [conversation.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.id, conversation.messages.length]);

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

  const send = () => {
    if (!canSend) return;

    sendMessage(conversation.id, { text, image });
    setText("");
    setImage("");
    setShowQuick(false);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
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
              markConversationUnread(conversation.id);
              onBack();
            }}
          >
            Mark unread
          </button>
        </div>
      </header>

      {conversation.context && (
        <Link to={conversation.context.to} className="msg-context">
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

      <div className="msg-body" role="log" aria-live="polite">
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

        {error && <p className="rk-error">{error}</p>}

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
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message. Press Enter to send."
          />

          <button
            type="button"
            className="rk-btn primary"
            onClick={send}
            disabled={!canSend}
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
