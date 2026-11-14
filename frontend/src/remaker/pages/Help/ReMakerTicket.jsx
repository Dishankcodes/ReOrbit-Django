import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import {
  STATUS_TONE,
  dateLabel,
  replyToTicket,
  setTicketStatus,
  timeLabel,
  useTicket,
} from "../../data/helpStore";
import { useSupportStatus } from "../../../shared/supportTickets";

import "../../css/ReMakerUi.css";
import "./HelpPage.css";

export default function ReMakerTicket() {
  const { ticketId } = useParams();
  const ticket = useTicket(ticketId);
  const ticketStatus = useSupportStatus("remaker", ticketId);

  if ((!ticket || !ticket.messagesLoaded) && ticketStatus.loading) {
    return <section className="rk hlp"><p className="hlp-note">Loading your support ticket…</p></section>;
  }

  if (!ticket) {
    return (
      <section className="rk hlp">
        <div className="rk-empty">
          <div className="rk-empty-art" aria-hidden="true">
            <img
              src="https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt=""
            />
            <img
              src="https://images.pexels.com/photos/3664343/pexels-photo-3664343.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt=""
            />
          </div>
          <h3>We could not find that ticket</h3>
          <p>It may have been removed, or the link is out of date.</p>
          <Link to="/remaker-help?tab=tickets" className="rk-btn primary">
            Back to my tickets
          </Link>
        </div>
      </section>
    );
  }

  return <Thread key={ticket.id} ticket={ticket} ticketStatus={ticketStatus} />;
}

function Thread({ ticket, ticketStatus }) {
  const location = useLocation();
  const [text, setText] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return undefined;

    timer.current = setTimeout(() => setNotice(""), 3600);
    return () => clearTimeout(timer.current);
  }, [notice]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [ticket.messages.length]);

  const closed = ticket.status === "Closed";
  const resolved = ticket.status === "Resolved";

  const send = async (event) => {
    event.preventDefault();
    setAttempted(true);

    if (text.trim().length < 2 || busy) return;
    setBusy(true);
    setError("");
    try {
      await replyToTicket(ticket.id, text);
      setText("");
      setAttempted(false);
      setNotice("Reply sent.");
    } catch (problem) {
      setError(problem.message || "Your reply could not be sent. Your draft is still here.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rk hlp">
      <nav className="rk-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-help">Help and support</Link>
        <span aria-hidden="true">/</span>
        <Link to="/remaker-help?tab=tickets">My tickets</Link>
        <span aria-hidden="true">/</span>
        <strong>{ticket.id}</strong>
      </nav>

      <header className="hlp-thread-head">
        <div>
          <small>
            {ticket.id} · {ticket.category}
          </small>
          <h2>{ticket.subject}</h2>
        </div>
        <span className={`rk-badge ${STATUS_TONE[ticket.status]}`}>
          {ticket.status}
        </span>
      </header>

      <div className="hlp-layout">
        <div className="hlp-thread">
          <ol className="hlp-messages" aria-label="Conversation">
            {ticket.messages.map((message) => (
              <li
                className={message.from === "me" ? "me" : "them"}
                key={message.id}
              >
                <div className="hlp-bubble">
                  <header>
                    <strong>{message.name}</strong>
                    <time dateTime={message.at}>{timeLabel(message.at)}</time>
                  </header>
                  <p>{message.text}</p>
                </div>
              </li>
            ))}
            <li ref={endRef} aria-hidden="true" />
          </ol>

          {closed ? (
            <div className="hlp-closed">
              <strong>This ticket is closed.</strong>
              <span>
                Need more help?{" "}
                <Link to="/remaker-help/new">Create a new ticket</Link>.
              </span>
            </div>
          ) : (
            <form className="hlp-reply" onSubmit={send} noValidate>
              <label htmlFor="tk-reply" className="sr-only">
                Your reply
              </label>
              <textarea
                id="tk-reply"
                rows={3}
                maxLength={1000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={
                  resolved ? "Reply to reopen this ticket" : "Write your reply"
                }
                aria-invalid={
                  attempted && text.trim().length < 2 ? "true" : undefined
                }
              />
              <div>
                {resolved ? (
                  <small>Replying will reopen this ticket.</small>
                ) : (
                  <button
                    type="button"
                    className="rk-textbtn"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await setTicketStatus(ticket.id, "Resolved");
                        setNotice("Ticket marked as resolved.");
                      } catch (problem) {
                        setError(problem.message || "Ticket status could not be updated.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Mark as resolved
                  </button>
                )}
                <button type="submit" className="rk-btn primary" disabled={busy || text.trim().length < 2}>
                  {busy ? "Sending…" : "Send reply"}
                </button>
              </div>
            </form>
          )}
        </div>

        {error && <p className="rk-error" role="alert">{error}</p>}
        {ticketStatus.error && <p className="rk-error" role="alert">{ticketStatus.error}</p>}

        <aside className="hlp-side">
          <section className="rk-card">
            <h3>Ticket details</h3>

            <dl className="hlp-facts">
              <div>
                <dt>Status</dt>
                <dd>{ticket.status}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{ticket.priority}</dd>
              </div>
              <div>
                <dt>Opened</dt>
                <dd>{dateLabel(ticket.createdAt)}</dd>
              </div>
              <div>
                <dt>Last update</dt>
                <dd>{timeLabel(ticket.updatedAt)}</dd>
              </div>
              {ticket.relatedOrder && (
                <div>
                  <dt>Order</dt>
                  <dd>
                    <Link
                      to={
                        ticket.relatedOrder.startsWith("SO-")
                          ? `/remaker-sales/${ticket.relatedOrder}`
                          : `/remaker-orders/${ticket.relatedOrder}`
                      }
                    >
                      {ticket.relatedOrder}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>

            {ticket.photos.length > 0 && (
              <div className="hlp-attached">
                {ticket.photos.map((src, index) => (
                  <img src={src} alt={`Attachment ${index + 1}`} key={index} />
                ))}
              </div>
            )}
          </section>

          {resolved && (
            <section className="rk-card hlp-done">
              <h3>Is this sorted?</h3>
              <p>
                Close the ticket if you are happy, or reply to keep talking with
                us.
              </p>
              <button
                type="button"
                className="rk-btn primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await setTicketStatus(ticket.id, "Closed");
                    setNotice("Ticket closed. Thank you!");
                  } catch (problem) {
                    setError(problem.message || "Ticket could not be closed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Yes, close this ticket
              </button>
            </section>
          )}

          <section className="rk-card hlp-tip">
            <h3>Faster help</h3>
            <p>
              Add order numbers, amounts and photos in your replies. It saves a
              round of questions.
            </p>
          </section>
        </aside>
      </div>

      {notice && (
        <div className="rk-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
