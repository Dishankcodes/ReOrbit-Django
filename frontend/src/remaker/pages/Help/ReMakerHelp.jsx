import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  FAQ_CATEGORIES,
  FAQS,
  STATUS_TONE,
  useTickets,
} from "../../data/helpStore";
import { useOrders } from "../../data/ordersStore";

import ContactCards from "./components/ContactCards";
import FaqList from "./components/FaqList";
import ReportsList from "./components/ReportsList";
import TicketList from "./components/TicketList";

import "../../css/ReMakerUi.css";
import "./HelpPage.css";

const TABS = ["help", "tickets", "reports"];

export default function ReMakerHelp() {
  const [params, setParams] = useSearchParams();
  const tickets = useTickets();
  const orders = useOrders();

  const requested = params.get("tab");
  const tab = TABS.includes(requested) ? requested : "help";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const reports = useMemo(
    () =>
      orders
        .flatMap((order) => order.reports.map((report) => ({ report, order })))
        .sort((a, b) => b.report.createdAt.localeCompare(a.report.createdAt)),
    [orders],
  );

  const switchTab = (key) => {
    const next = new URLSearchParams(params);
    if (key === "help") next.delete("tab");
    else next.set("tab", key);
    setParams(next, { replace: true });
  };

  const text = query.trim().toLowerCase();

  const faqs = useMemo(
    () =>
      FAQS.filter((item) => {
        if (category !== "all" && item.category !== category) return false;
        if (!text) return true;
        return `${item.q} ${item.a}`.toLowerCase().includes(text);
      }),
    [category, text],
  );

  /* the full list is long: start with the first eight */
  const limitList = category === "all" && !text && !showAll && faqs.length > 8;

  const openCount = tickets.filter(
    (ticket) => !["Resolved", "Closed"].includes(ticket.status),
  ).length;
  const waiting = tickets.filter(
    (ticket) => ticket.status === "Waiting for you",
  ).length;

  const shownTickets = tickets.filter(
    (ticket) => ticketFilter === "all" || ticket.status === ticketFilter,
  );

  return (
    <section className="rk hlp">
      {/* ================= HERO ================= */}
      <header className="hlp-hero">
        <div>
          <h2>How can we help?</h2>
          <p>
            Search our help articles, chat with the team, or open a ticket. Most
            questions are answered in minutes.
          </p>
        </div>

        <label className="hlp-search">
          <span className="sr-only">Search help articles</span>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (tab !== "help") switchTab("help");
            }}
            placeholder="Search, for example “withdraw money” or “accept order”"
          />
        </label>
      </header>

      {waiting > 0 && (
        <Link to="/remaker-help?tab=tickets" className="hlp-alert">
          <strong>
            {waiting} {waiting === 1 ? "ticket is" : "tickets are"} waiting for
            your reply
          </strong>
          <span>Open tickets →</span>
        </Link>
      )}

      {/* ================= TABS ================= */}
      <div className="rk-tabs" role="tablist" aria-label="Help sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "help"}
          className={tab === "help" ? "active" : ""}
          onClick={() => switchTab("help")}
        >
          Help center
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tickets"}
          className={tab === "tickets" ? "active" : ""}
          onClick={() => switchTab("tickets")}
        >
          My tickets <span>{tickets.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reports"}
          className={tab === "reports" ? "active" : ""}
          onClick={() => switchTab("reports")}
        >
          My reports <span>{reports.length}</span>
        </button>
      </div>

      {/* ================= HELP CENTER ================= */}
      {tab === "help" && (
        <>
          <div className="hlp-cats" role="group" aria-label="Topics">
            <button
              type="button"
              className={category === "all" ? "active" : ""}
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              <strong>All topics</strong>
              <small>{FAQS.length} articles</small>
            </button>
            {FAQ_CATEGORIES.map((item) => (
              <button
                type="button"
                key={item.key}
                className={category === item.key ? "active" : ""}
                aria-pressed={category === item.key}
                onClick={() => setCategory(item.key)}
              >
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </button>
            ))}
          </div>

          <section className="rk-card hlp-articles">
            <div className="rk-card-head">
              <h3>
                {text
                  ? `Results for “${query.trim()}”`
                  : category === "all"
                    ? "Popular questions"
                    : FAQ_CATEGORIES.find((item) => item.key === category)
                        ?.label}
              </h3>
              <span className="hlp-count">
                {faqs.length} {faqs.length === 1 ? "article" : "articles"}
              </span>
            </div>

            {faqs.length === 0 ? (
              <div className="hlp-noresult">
                <h4>We could not find that</h4>
                <p>
                  Try different words, or ask us directly. A ticket is the
                  fastest way to get a real person.
                </p>
                <Link to="/remaker-help/new" className="rk-btn primary">
                  Create a ticket
                </Link>
              </div>
            ) : (
              <>
                <FaqList
                  items={limitList ? faqs.slice(0, 8) : faqs}
                  showCategory={category === "all"}
                />

                {limitList && (
                  <button
                    type="button"
                    className="rk-btn ghost hlp-showall"
                    onClick={() => setShowAll(true)}
                  >
                    Show all {faqs.length} articles
                  </button>
                )}
              </>
            )}
          </section>

          <section>
            <div className="hlp-section-head">
              <h3>Still need help?</h3>
              <p>Talk to a person. {`We are around every day.`}</p>
            </div>
            <ContactCards />
          </section>
        </>
      )}

      {/* ================= TICKETS ================= */}
      {tab === "tickets" && (
        <>
          <div className="hlp-bar">
            <div className="rk-chips" role="group" aria-label="Ticket status">
              {["all", ...Object.keys(STATUS_TONE)].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={ticketFilter === item ? "active" : ""}
                  aria-pressed={ticketFilter === item}
                  onClick={() => setTicketFilter(item)}
                >
                  {item === "all" ? "All tickets" : item}
                </button>
              ))}
            </div>
            <Link to="/remaker-help/new" className="rk-btn primary">
              New ticket
            </Link>
          </div>

          {shownTickets.length === 0 ? (
            <div className="rk-empty">
              <div className="rk-empty-art" aria-hidden="true">
                <img src="/images/portfolio/priya-bag.jpg" alt="" />
                <img src="/images/portfolio/arjun-lamp.jpg" alt="" />
              </div>
              <h3>
                {tickets.length === 0
                  ? "No tickets yet"
                  : "No tickets with this status"}
              </h3>
              <p>
                {tickets.length === 0
                  ? "When you need help from our team, your tickets will be listed here."
                  : "Try another status."}
              </p>
              <Link to="/remaker-help/new" className="rk-btn primary">
                Create a ticket
              </Link>
            </div>
          ) : (
            <TicketList tickets={shownTickets} />
          )}

          {openCount > 0 && (
            <p className="hlp-note">
              {openCount} open {openCount === 1 ? "ticket" : "tickets"}.{" "}
              {`We usually reply within 24 hours.`}
            </p>
          )}
        </>
      )}

      {/* ================= REPORTS ================= */}
      {tab === "reports" && (
        <>
          <p className="hlp-note">
            These are problems you reported about orders you bought. To report
            an order, open it from Purchases.
          </p>

          {reports.length === 0 ? (
            <div className="rk-empty">
              <div className="rk-empty-art" aria-hidden="true">
                <img src="/images/products/vintage-chair.jpg" alt="" />
                <img src="/images/products/ceramic-lamp.jpg" alt="" />
              </div>
              <h3>You have not reported anything</h3>
              <p>
                If something goes wrong with an order you bought, you can report
                it from the order page.
              </p>
              <Link to="/remaker-orders" className="rk-btn ghost">
                Go to purchases
              </Link>
            </div>
          ) : (
            <ReportsList reports={reports} />
          )}
        </>
      )}
    </section>
  );
}
