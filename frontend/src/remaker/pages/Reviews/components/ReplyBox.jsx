import React, { useState } from "react";

import {
  REPLY_TEMPLATES,
  deleteReply,
  relativeAgo,
  saveReply,
} from "../../../data/reviewsStore";

const MIN = 10;
const MAX = 400;

/* Show the reply, or let the ReMaker write / edit / delete one */
export default function ReplyBox({ review }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply?.text || "");
  const [attempted, setAttempted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tone =
    review.rating >= 4 ? "high" : review.rating === 3 ? "mid" : "low";
  const tooShort = text.trim().length < MIN;

  const open = () => {
    setText(review.reply?.text || "");
    setAttempted(false);
    setEditing(true);
  };

  const submit = () => {
    setAttempted(true);
    if (tooShort) return;

    saveReply(review.id, text);
    setEditing(false);
  };

  /* ----- writing / editing ----- */
  if (editing) {
    return (
      <div className="rvp-reply editing">
        <label htmlFor={`reply-${review.id}`}>
          {review.reply
            ? "Edit your reply"
            : "Reply to " + review.reviewer.name.split(" ")[0]}
        </label>

        <textarea
          id={`reply-${review.id}`}
          rows={4}
          maxLength={MAX}
          value={text}
          autoFocus
          placeholder="Be kind and specific. Everyone can read your reply."
          onChange={(event) => setText(event.target.value)}
          aria-invalid={attempted && tooShort ? "true" : undefined}
        />

        <div className="rvp-reply-meta">
          <span className="rvp-error">
            {attempted && tooShort ? `Write at least ${MIN} characters.` : ""}
          </span>
          <small>
            {text.length}/{MAX}
          </small>
        </div>

        {!review.reply && (
          <div className="rvp-templates">
            <small>Quick start</small>
            {REPLY_TEMPLATES[tone].map((template) => (
              <button
                type="button"
                key={template}
                onClick={() => setText(template)}
              >
                {template}
              </button>
            ))}
          </div>
        )}

        <div className="rvp-reply-actions">
          <button
            type="button"
            className="rvp-btn primary small"
            onClick={submit}
          >
            {review.reply ? "Save reply" : "Post reply"}
          </button>
          <button
            type="button"
            className="rvp-btn ghost small"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ----- an existing reply ----- */
  if (review.reply) {
    return (
      <div className="rvp-reply">
        <div className="rvp-reply-head">
          <strong>Your reply</strong>
          <small>
            {relativeAgo(review.reply.createdAt)}
            {review.reply.edited ? " · edited" : ""}
          </small>
        </div>

        <p>{review.reply.text}</p>

        <div className="rvp-reply-links">
          <button type="button" onClick={open}>
            Edit
          </button>

          {confirmDelete ? (
            <span className="rvp-confirm">
              Delete this reply?
              <button
                type="button"
                className="danger"
                onClick={() => deleteReply(review.id)}
              >
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ----- no reply yet ----- */
  return (
    <button type="button" className="rvp-reply-cta" onClick={open}>
      Reply to this review
    </button>
  );
}
