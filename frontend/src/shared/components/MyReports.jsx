import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Flag, MessageSquareText } from "lucide-react";
import { apiRequest } from "../../api/api";
import "./MyReports.css";

const TONE = { Open: "wait", Under_Review: "info", Resolved: "good", Dismissed: "muted" };
const LABEL = { Open: "Waiting for review", Under_Review: "Being reviewed", Resolved: "Handled", Dismissed: "Closed" };
const when = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/* Help › My reports: what this member or ReMaker reported (a seller, ReMaker, listing or review)
   and the team's answer once it is closed. `side` only changes the colours.
   `hideWhenEmpty` leaves the whole block out when there is nothing to show. */
export default function MyReports({ side = "user", hideWhenEmpty = false, title = "My reports" }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState("");
  useEffect(() => {
    let alive = true;
    apiRequest("/complaints/me/")
      .then((r) => alive && setRows(r.data.results || []))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) return null;
  if (!rows.length && hideWhenEmpty) return null;

  return (
    <section className={`mrp mrp--${side}`} aria-label={title}>
      <header>
        <Flag size={16} />
        <h3>{title}</h3>
        <span>{rows.length}</span>
      </header>
      {!rows.length ? (
        <p className="mrp-empty">
          You haven't reported anything. Use the Report button on a seller, listing or review if something is wrong.
        </p>
      ) : (
        <ul>
          {rows.map((r) => {
            const isOpen = open === r.id;
            return (
              <li key={r.id} className={r.answer ? "has-answer" : ""}>
                <button type="button" className="mrp-row" onClick={() => setOpen(isOpen ? "" : r.id)} aria-expanded={isOpen}>
                  <span className="mrp-main">
                    <small>
                      {r.id} · {r.target.type === "Product" ? "Listing" : r.target.type} · {when(r.created_at)}
                    </small>
                    <strong>{r.category}</strong>
                    <em>{r.target.name}</em>
                  </span>
                  <span className={`mrp-chip ${TONE[r.status] || ""}`}>{LABEL[r.status] || r.status}</span>
                  <ChevronDown size={16} className={isOpen ? "up" : ""} />
                </button>
                {isOpen && (
                  <div className="mrp-body">
                    <p className="mrp-you">
                      <b>You wrote:</b> {r.description}
                    </p>
                    {r.answer ? (
                      <div className="mrp-answer">
                        <CheckCircle2 size={16} />
                        <div>
                          <strong>{r.answer.title}</strong>
                          {r.answer.note && (
                            <p>
                              <MessageSquareText size={13} /> {r.answer.note}
                            </p>
                          )}
                          <small>ReOrbit team · {when(r.answer.at)}</small>
                        </div>
                      </div>
                    ) : (
                      <p className="mrp-wait">
                        <Clock size={14} /> Our team is looking into it. You'll get a notification with the answer.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
