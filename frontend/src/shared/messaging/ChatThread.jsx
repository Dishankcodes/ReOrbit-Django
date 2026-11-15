import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { fileToDataUrl } from "../../remaker/data/portfolioStore";
import {
  QUICK_REPLIES,
  ROLE_LABELS,
  clockLabel,
  dayLabel,
  deleteConversation,
  loadOlderMessages,
  markConversationUnread,
  sendMessage,
} from "../messagingStore";
import Avatar from "./Avatar";
import MessageImage from "./MessageImage";
import { profileLink, resolveContext } from "./sides";

const NEAR_BOTTOM = 120;

function ThreadSkeleton() {
  return (
    <div className="msgx-thread-skel" aria-hidden="true" aria-label="Loading messages">
      {[
        ["them", "46%"],
        ["me", "38%"],
        ["them", "58%"],
        ["me", "30%"],
      ].map(([from, width], index) => (
        <span key={index} className={`msgx-skel msgx-skel-bubble ${from}`} style={{ width }} />
      ))}
    </div>
  );
}

/* One open chat: header, "about" card, messages and the composer */
export default function ChatThread({
  conversation,
  side,
  sideName,
  loading = false,
  onBack,
  syncError = "",
  onRetrySync,
}) {
  const { p } = side;
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const scrollRestore = useRef(null);
  const stick = useRef(true);

  const messages = conversation?.messages || [];
  const id = conversation?.id;

  /* a different chat: fresh draft, and jump to the newest message */
  useEffect(() => {
    setText("");
    setImage("");
    setError("");
    setShowQuick(false);
    stick.current = true;
  }, [id]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (scrollRestore.current) {
      const { height, top } = scrollRestore.current;
      body.scrollTop = body.scrollHeight - height + top;
      scrollRestore.current = null;
    } else if (stick.current) {
      body.scrollTop = body.scrollHeight;
    }
  }, [messages.length, loading, id]);

  const days = useMemo(() => {
    const groups = [];
    messages.forEach((message) => {
      const label = dayLabel(message.at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.messages.push(message);
      else groups.push({ label, messages: [message] });
    });
    return groups;
  }, [messages]);

  const context = resolveContext(conversation, sideName);
  const profile = profileLink(conversation, sideName);
  const role = ROLE_LABELS[conversation?.kind] || "User";
  const quick = QUICK_REPLIES[conversation?.kind] || QUICK_REPLIES.reorbit;
  const canSend = text.trim().length > 0 || Boolean(image);

  const attach = async (file) => {
    if (!file) return;
    setError("");
    try {
      setImage(await fileToDataUrl(file, 1000, 0.75));
    } catch (problem) {
      setError(problem.message);
    }
  };

  /* The message appears at once and the box clears; if the server says no, the
     draft comes back so nothing is lost. The box is never disabled, so you can
     keep typing. */
  const send = () => {
    if (!canSend || !id) return;
    const draft = { text, image };
    setText("");
    setImage("");
    setShowQuick(false);
    setError("");
    stick.current = true;
    inputRef.current?.focus();
    sendMessage(id, draft).catch((problem) => {
      setText((current) => current || draft.text);
      setImage((current) => current || draft.image);
      setError(problem.message || "Message could not be sent. Your draft is back in the box.");
    });
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const onScroll = async (event) => {
    const body = event.currentTarget;
    stick.current = body.scrollHeight - body.scrollTop - body.clientHeight < NEAR_BOTTOM;
    if (body.scrollTop > 12 || !conversation?.has_more_messages || loadingOlder) return;
    setLoadingOlder(true);
    scrollRestore.current = { height: body.scrollHeight, top: body.scrollTop };
    try {
      await loadOlderMessages(id);
    } catch (problem) {
      scrollRestore.current = null;
      setError(problem.message || "Older messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  };

  if (!conversation) {
    return (
      <section className={`${p}-thread`} aria-busy="true">
        <header className={`${p}-thread-head`}>
          <button type="button" className={`${p}-back`} onClick={onBack}>← Back</button>
          <span className="msgx-skel msgx-skel-avatar" />
          <span className="msgx-skel" style={{ width: 140, height: 14 }} />
        </header>
        <ThreadSkeleton />
      </section>
    );
  }

  const showSkeleton = loading && messages.length === 0;

  return (
    <section className={`${p}-thread`} aria-label={`Conversation with ${conversation.name}`}>
      <header className={`${p}-thread-head`}>
        <button type="button" className={`${p}-back`} onClick={onBack}>
          ← Back
        </button>

        <span className={`${p}-avatar big`}>
          <Avatar src={conversation.image} name={conversation.name} />
        </span>

        <div>
          <h3>{conversation.name}</h3>
          <small>
            <em className={`${p}-kind ${conversation.kind}`}>{role}</em>
            {conversation.subtitle}
          </small>
        </div>

        <div className={`${p}-thread-actions`}>
          {profile && (
            <Link to={profile} className={`${side.btn} ghost small`}>
              View profile
            </Link>
          )}
          <button
            type="button"
            className={`${side.btn} ghost small`}
            onClick={() => {
              markConversationUnread(id)
                .then(onBack)
                .catch((problem) => setError(problem.message || "Could not update unread status."));
            }}
          >
            Mark unread
          </button>
          <button
            type="button"
            className={`${side.btn} ghost small`}
            onClick={() => {
              if (window.confirm("Delete this conversation?")) {
                deleteConversation(id)
                  .then(onBack)
                  .catch((problem) => setError(problem.message || "Could not archive this conversation."));
              }
            }}
          >
            Delete
          </button>
        </div>
      </header>

      {context &&
        (context.to ? (
          <Link to={context.to} className={`${p}-context`}>
            {context.image && <img src={context.image} alt="" />}
            <span>
              <small>About</small>
              <strong>{context.label}</strong>
            </span>
            <b>Open →</b>
          </Link>
        ) : (
          <div className={`${p}-context msgx-context-static`}>
            {context.image && <img src={context.image} alt="" />}
            <span>
              <small>About</small>
              <strong>{context.label}</strong>
            </span>
          </div>
        ))}

      <div ref={bodyRef} className={`${p}-body`} role="log" aria-live="polite" onScroll={onScroll}>
        {loadingOlder && <p className={`${p}-history-loading`}>Loading earlier messages…</p>}

        {showSkeleton && <ThreadSkeleton />}

        {!showSkeleton && messages.length === 0 && (
          <p className="msgx-no-messages">No messages yet. Say hello to start the chat.</p>
        )}

        {days.map((group) => (
          <div key={group.label}>
            <p className={`${p}-day`}>
              <span>{group.label}</span>
            </p>

            {group.messages.map((message) =>
              message.from === "system" ? (
                <p className={`${p}-system`} key={message.id}>
                  {message.text}
                </p>
              ) : (
                <div className={`${p}-row ${message.from}`} key={message.id}>
                  <div className={`${p}-bubble ${message.pending ? "msgx-pending" : ""}`}>
                    {(message.image || message.has_image) && (
                      <MessageImage conversationId={id} message={message} />
                    )}
                    {message.text && <p>{message.text}</p>}
                    <time dateTime={message.at}>
                      {message.pending ? "Sending…" : clockLabel(message.at)}
                    </time>
                  </div>
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      <div className={`${p}-composer`}>
        {showQuick && (
          <div className={`${p}-quick`} role="group" aria-label="Quick replies">
            {quick.map((reply) => (
              <button
                type="button"
                key={reply}
                onClick={() => {
                  setText(reply);
                  setShowQuick(false);
                  inputRef.current?.focus();
                }}
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {image && (
          <div className={`${p}-preview`}>
            <img src={image} alt="Photo to send" />
            <button type="button" onClick={() => setImage("")}>
              Remove
            </button>
          </div>
        )}

        {syncError && (
          <p className={side.err} role="alert">
            {syncError}{" "}
            <button type="button" onClick={() => onRetrySync?.().catch(() => {})}>
              Retry sync
            </button>
          </p>
        )}
        {error && (
          <p className={side.err} role="alert">
            {error}
          </p>
        )}

        <div className={`${p}-composer-row`}>
          <div className={`${p}-composer-tools`}>
            <button
              type="button"
              className={side.tool}
              onClick={() => fileRef.current?.click()}
              aria-label="Attach a photo"
            >
              <ImagePlus size={15} /> Photo
            </button>
            <button
              type="button"
              className={`${side.tool} ${showQuick ? "on" : ""}`}
              onClick={() => setShowQuick((value) => !value)}
              aria-expanded={showQuick}
            >
              <Zap size={15} /> Quick replies
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

          <label className="sr-only" htmlFor={`${p}-input`}>
            Write a message
          </label>
          <textarea
            id={`${p}-input`}
            ref={inputRef}
            rows={1}
            value={text}
            maxLength={1000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message. Press Enter to send."
          />

          <button
            type="button"
            className={`${side.btn} primary`}
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
