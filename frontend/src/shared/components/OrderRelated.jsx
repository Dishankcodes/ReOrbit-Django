import React from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, RotateCcw, Wallet } from "lucide-react";
import "./OrderRelated.css";

/* Support tickets, the return and refunds that belong to one order, newest first.
   `items` comes straight from the order API (`related`). Renders nothing when empty. */
const ICON = { ticket: LifeBuoy, return: RotateCcw, refund: Wallet };
const KIND = { ticket: "Support ticket", return: "Return", refund: "Refund" };

const when = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export default function OrderRelated({ items, className = "" }) {
  if (!items || items.length === 0) return null;
  return (
    <section className={`orl ${className}`} aria-label="Tickets, returns and refunds">
      <h3>Tickets, returns &amp; refunds</h3>
      <ul>
        {items.map((r) => {
          const Icon = ICON[r.kind] || LifeBuoy;
          const body = (
            <>
              <span className={`orl-ic orl-${r.kind}`}>
                <Icon size={16} />
              </span>
              <span className="orl-main">
                <b>{r.title}</b>
                <small>
                  {KIND[r.kind]} · {r.id}
                  {r.detail ? ` · ${r.detail}` : ""}
                </small>
              </span>
              <span className="orl-side">
                <em>{r.status}</em>
                <time>{when(r.at)}</time>
              </span>
            </>
          );
          return (
            <li key={`${r.kind}-${r.id}`}>
              {r.url ? (
                <Link to={r.url} className="orl-row orl-link">
                  {body}
                </Link>
              ) : (
                <div className="orl-row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
