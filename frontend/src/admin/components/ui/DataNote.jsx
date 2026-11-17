import React from "react";

/* A one-line status above numbers that come from the server: "Loading…" while they arrive,
   and a retry when they could not be loaded, so a failed request is never mistaken for zero. */
export default function DataNote({ loading, error, retry, what = "the numbers" }) {
  if (error) {
    return (
      <div className="rp-note error" role="alert">
        <span>
          We could not load {what}. {error}
        </span>
        {retry && (
          <button type="button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="rp-note" role="status">
        <span className="rp-note-dot" aria-hidden="true" />
        <span>Loading {what}…</span>
      </div>
    );
  }
  return null;
}
